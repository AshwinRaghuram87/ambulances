import { useState, useEffect, useCallback, useRef } from 'react';
import type { Ambulance, FleetStats, FleetAlert, HospitalFacility, RegisterAmbulancePayload, LocationPoint } from '../types.ts';

export function useFleetData() {
  const [autos, setAutos] = useState<Map<string, Ambulance>>(new Map());
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [facilities, setFacilities] = useState<HospitalFacility[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const autosRef = useRef<Map<string, Ambulance>>(new Map());
  autosRef.current = autos;

  // Initial fetch
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [autosRes, statsRes, alertsRes, facRes] = await Promise.all([
        fetch('/api/autos'),
        fetch('/api/stats'),
        fetch('/api/alerts'),
        fetch('/api/facilities'),
      ]);

      if (!autosRes.ok) throw new Error('Failed to load ambulance fleet data');
      const autosData = await autosRes.json();
      const statsData = await statsRes.json();
      const alertsData = await alertsRes.json();
      const facData = await facRes.json();

      const map = new Map<string, Ambulance>();
      if (autosData.autos) {
        autosData.autos.forEach((a: Ambulance) => map.set(a.id, a));
      }
      setAutos(map);
      if (statsData.stats) setStats(statsData.stats);
      if (alertsData.alerts) setAlerts(alertsData.alerts);
      if (facData.facilities) setFacilities(facData.facilities);
      setError(null);
    } catch (err) {
      console.error('Error fetching ambulance fleet data:', err);
      setError(err instanceof Error ? err.message : 'Error loading ambulance fleet');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    loadInitialData();

    const connectSSE = () => {
      try {
        const es = new EventSource('/api/stream');
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastUpdateAt(Date.now());

            if (data.type === 'FLEET_TICK' && Array.isArray(data.updates)) {
              setAutos((prev) => {
                const next = new Map(prev);
                data.updates.forEach((u: {
                  id: string;
                  location: LocationPoint;
                  status: Ambulance['status'];
                  siren?: boolean;
                  oxygen?: number;
                  triage?: Ambulance['patientTriage'];
                }) => {
                  const existing = next.get(u.id);
                  if (existing) {
                    const newHist = [...(existing.locationHistory || []), u.location];
                    if (newHist.length > 30) newHist.shift();
                    next.set(u.id, {
                      ...existing,
                      currentLocation: u.location,
                      status: u.status,
                      sirenActive: typeof u.siren === 'boolean' ? u.siren : existing.sirenActive,
                      code3Active: typeof u.siren === 'boolean' ? u.siren : existing.code3Active,
                      oxygenLevel: typeof u.oxygen === 'number' ? u.oxygen : existing.oxygenLevel,
                      patientTriage: u.triage || existing.patientTriage,
                      locationHistory: newHist,
                      lastPingAt: u.location.timestamp,
                    });
                  }
                });
                return next;
              });
            } else if (data.type === 'LIVE_LOCATION_PING') {
              setAutos((prev) => {
                const next = new Map(prev);
                const existing = next.get(data.autoId);
                if (existing) {
                  const newHist = [...(existing.locationHistory || []), data.location];
                  if (newHist.length > 40) newHist.shift();
                  next.set(data.autoId, {
                    ...existing,
                    currentLocation: data.location,
                    status: data.status,
                    batteryLevel: data.battery ?? existing.batteryLevel,
                    oxygenLevel: data.oxygen ?? existing.oxygenLevel,
                    sirenActive: data.siren ?? existing.sirenActive,
                    code3Active: data.siren ?? existing.code3Active,
                    isPhoneConnected: true,
                    lastPingAt: data.location.timestamp,
                    locationHistory: newHist,
                    sosActive: data.sos ?? existing.sosActive,
                  });
                }
                return next;
              });
            } else if (data.type === 'AUTO_REGISTERED' && data.auto) {
              setAutos((prev) => {
                const next = new Map(prev);
                next.set(data.auto.id, data.auto);
                return next;
              });
            } else if (data.type === 'STATUS_CHANGED') {
              setAutos((prev) => {
                const next = new Map(prev);
                const existing = next.get(data.autoId);
                if (existing) {
                  next.set(data.autoId, {
                    ...existing,
                    status: data.status,
                    sosActive: data.sosActive ?? existing.sosActive,
                    sirenActive: data.sirenActive ?? existing.sirenActive,
                    code3Active: data.sirenActive ?? existing.code3Active,
                  });
                }
                return next;
              });
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        };

        es.onerror = () => {
          setIsConnected(false);
          es.close();
          setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    };

    connectSSE();

    // Regular interval to refresh stats & alerts
    const statsInterval = setInterval(async () => {
      try {
        const [sRes, aRes] = await Promise.all([fetch('/api/stats'), fetch('/api/alerts')]);
        if (sRes.ok) {
          const sData = await sRes.json();
          setStats(sData.stats);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          setAlerts(aData.alerts);
        }
      } catch {
        // Silently handle
      }
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [loadInitialData]);

  // Register an ambulance
  const registerAuto = async (payload: RegisterAmbulancePayload) => {
    const res = await fetch('/api/autos/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to register ambulance');
    }
    setAutos((prev) => {
      const next = new Map(prev);
      next.set(data.auto.id, data.auto);
      return next;
    });
    return data.auto as Ambulance;
  };

  // Send GPS location ping from mobile paramedic phone
  const sendLocationPing = async (
    autoId: string,
    coords: {
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      batteryLevel?: number;
      oxygenLevel?: number;
      siren?: boolean;
      sos?: boolean;
      triage?: Ambulance['patientTriage'];
    }
  ) => {
    const res = await fetch(`/api/autos/${autoId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to stream ambulance location');
    }
    return data;
  };

  // Update ambulance status & siren
  const updateStatus = async (
    autoId: string,
    status: Ambulance['status'],
    sosActive?: boolean,
    sirenActive?: boolean
  ) => {
    const res = await fetch(`/api/autos/${autoId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, sosActive, sirenActive }),
    });
    const data = await res.json();
    return data.auto;
  };

  return {
    autos: Array.from(autos.values()),
    autosMap: autos,
    stats,
    alerts,
    facilities,
    isConnected,
    lastUpdateAt,
    loading,
    error,
    refreshFleet: loadInitialData,
    registerAuto,
    sendLocationPing,
    updateStatus,
  };
}
