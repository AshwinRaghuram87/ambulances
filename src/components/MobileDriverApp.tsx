import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Radio,
  MapPin,
  Compass,
  Gauge,
  Battery,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  QrCode,
  ShieldAlert,
  Send,
  Navigation,
  Download,
  Info,
  ChevronDown,
  Phone,
  Volume2,
  VolumeX,
  HeartPulse,
  Activity,
  Building2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import type { Ambulance, TriageLevel, AmbulanceStatus } from '../types.ts';
import { ambulanceSiren } from '../utils/sirenAudio.ts';

interface MobileDriverAppProps {
  autos: Ambulance[];
  selectedAutoId?: string;
  onOpenQRModal: (auto: Ambulance) => void;
  onSendLocationPing: (
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
      deviceModel?: string;
      triage?: TriageLevel;
    }
  ) => Promise<any>;
}

export const MobileDriverApp: React.FC<MobileDriverAppProps> = ({
  autos,
  selectedAutoId,
  onOpenQRModal,
  onSendLocationPing,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Find currently selected ambulance or default to AMB-001
  const [currentAutoId, setCurrentAutoId] = useState<string>(
    selectedAutoId || autos[0]?.id || 'AMB-001'
  );

  useEffect(() => {
    if (selectedAutoId) {
      setCurrentAutoId(selectedAutoId);
    }
  }, [selectedAutoId]);

  const currentAuto = autos.find((a) => a.id === currentAutoId) || autos[0];

  // Tracking state
  const [isStreaming, setIsStreaming] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    accuracy: number;
  }>({
    lat: currentAuto?.currentLocation.lat || 12.9716,
    lng: currentAuto?.currentLocation.lng || 77.5946,
    speed: 0,
    heading: 0,
    accuracy: 3,
  });

  const [batteryLevel, setBatteryLevel] = useState<number>(94);
  const [oxygenLevel, setOxygenLevel] = useState<number>(currentAuto?.oxygenLevel || 95);
  const [patientTriage, setPatientTriage] = useState<TriageLevel>(currentAuto?.patientTriage || 'STANDBY');
  const [sirenOn, setSirenOn] = useState(!!currentAuto?.sirenActive);
  const [pingsSent, setPingsSent] = useState(0);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [lastPingStatus, setLastPingStatus] = useState<string>('Ready for dispatch link');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<any>(null);

  // Sync ambulance change
  useEffect(() => {
    if (currentAuto) {
      setOxygenLevel(currentAuto.oxygenLevel);
      setPatientTriage(currentAuto.patientTriage);
      setSirenOn(!!currentAuto.sirenActive);
      setCurrentCoords({
        lat: currentAuto.currentLocation.lat,
        lng: currentAuto.currentLocation.lng,
        speed: currentAuto.currentLocation.speed || 0,
        heading: currentAuto.currentLocation.heading || 0,
        accuracy: currentAuto.currentLocation.accuracy || 3,
      });
      setSosActive(!!currentAuto.sosActive);
    }
  }, [currentAutoId]);

  // Read actual battery if supported
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Send Ping Helper
  const sendPingToServer = async (coords: typeof currentCoords, sos = false, siren = sirenOn, triage = patientTriage) => {
    const startTime = performance.now();
    try {
      await onSendLocationPing(currentAutoId, {
        lat: coords.lat,
        lng: coords.lng,
        speed: coords.speed,
        heading: coords.heading,
        accuracy: coords.accuracy,
        batteryLevel,
        oxygenLevel,
        siren,
        sos,
        triage,
        deviceModel: navigator.userAgent.includes('Mobile') ? 'Paramedic Toughpad' : 'Mobile Dispatch Terminal',
      });
      const latency = Math.round(performance.now() - startTime);
      setPingLatency(latency);
      setPingsSent((c) => c + 1);
      setLastPingStatus(`Ping #${pingsSent + 1} synced (${latency}ms)`);
    } catch {
      setLastPingStatus('Sync error - retrying...');
    }
  };

  // Toggle Siren
  const handleToggleSiren = () => {
    const nextSiren = !sirenOn;
    setSirenOn(nextSiren);
    if (nextSiren) {
      ambulanceSiren.play('wail');
    } else {
      ambulanceSiren.stop();
    }
    sendPingToServer(currentCoords, sosActive, nextSiren, patientTriage);
    setStatusMessage(nextSiren ? '🚨 Code 3 Siren ACTIVE' : 'Siren muted');
  };

  // Change Patient Triage
  const handleSelectTriage = (triage: TriageLevel) => {
    setPatientTriage(triage);
    sendPingToServer(currentCoords, sosActive, sirenOn, triage);
    setStatusMessage(`Patient Triage set to ${triage}`);
  };

  // Start / Stop Real Geolocation or Simulation
  const toggleStreaming = () => {
    if (isStreaming) {
      // STOP
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsStreaming(false);
      setLastPingStatus('Tracking paused by paramedic');
    } else {
      // START
      setIsStreaming(true);
      setLastPingStatus('Connecting to Emergency Command Server...');

      if (simulationMode) {
        let heading = currentCoords.heading || 90;
        let lat = currentCoords.lat;
        let lng = currentCoords.lng;

        simIntervalRef.current = setInterval(() => {
          heading = (heading + (Math.random() * 20 - 10) + 360) % 360;
          const rad = (heading * Math.PI) / 180;
          const step = 0.0003; // ~45 km/h emergency response speed
          lat += Math.cos(rad) * step;
          lng += Math.sin(rad) * step;

          const updated = {
            lat,
            lng,
            speed: Math.floor(45 + Math.random() * 20),
            heading: Math.round(heading),
            accuracy: 3,
          };

          setCurrentCoords(updated);
          sendPingToServer(updated, sosActive, sirenOn, patientTriage);
        }, 2500);
      } else {
        if ('geolocation' in navigator) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const updated = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 38,
                heading: pos.coords.heading ? Math.round(pos.coords.heading) : currentCoords.heading,
                accuracy: Math.round(pos.coords.accuracy) || 3,
              };
              setCurrentCoords(updated);
              sendPingToServer(updated, sosActive, sirenOn, patientTriage);
            },
            (err) => {
              console.warn('Geolocation notice:', err.message);
              setStatusMessage(`Device GPS notice: ${err.message}. Switched to test driving.`);
              setSimulationMode(true);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 1000,
              timeout: 10000,
            }
          );
        } else {
          setStatusMessage('Geolocation not supported on this browser. Switched to test mode.');
          setSimulationMode(true);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Emergency SOS Trigger
  const handleTriggerSOS = () => {
    const nextSos = !sosActive;
    setSosActive(nextSos);
    sendPingToServer(currentCoords, nextSos, sirenOn, patientTriage);
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 600]);
    }
    setStatusMessage(nextSos ? '🚨 EMERGENCY SOS TRANSMITTED TO AMBULANCE DISPATCH!' : 'Ambulance SOS Cleared.');
  };

  if (!currentAuto) {
    return (
      <div className="p-8 text-center text-slate-400">
        No ambulance selected. Please select an ambulance from the fleet.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-105px)] p-3 sm:p-4 flex flex-col justify-between">
      {/* Mobile Paramedic Screen Frame */}
      <div className="rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Status Bar */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStreaming ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isStreaming ? 'STREAMING GPS TO DISPATCH' : 'STANDBY AT STATION'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300">
              {pingLatency !== null ? `${pingLatency} ms` : '-- ms'}
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{batteryLevel}%</span>
            </span>
          </div>
        </div>

        {/* Ambulance / Paramedic Selector Header */}
        <div className="p-4 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-lg border border-red-500/40">
                🚑
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                  Active Ambulance Unit
                </label>
                <div className="relative inline-block">
                  <select
                    value={currentAutoId}
                    onChange={(e) => setCurrentAutoId(e.target.value)}
                    aria-label="Select ambulance to track"
                    className="appearance-none bg-transparent font-extrabold text-white text-base pr-6 focus:outline-hidden cursor-pointer"
                  >
                    {autos.slice(0, 100).map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                        {a.id} • {a.regNumber} ({a.vehicleType})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenQRModal(currentAuto)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-300 border border-slate-700 transition"
              title="Show QR Code for crew phone pairing"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[11px]">Lead Paramedic:</span>
              <span className="font-semibold text-slate-200">{currentAuto.paramedicName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Destination ER:</span>
              <span className="font-semibold text-rose-400 truncate block">{currentAuto.targetHospital}</span>
            </div>
          </div>
        </div>

        {/* Live Tracking Controls Display */}
        <div className="p-4 space-y-4">
          {/* Main Connect & Stream Button */}
          <button
            onClick={toggleStreaming}
            className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base transition flex items-center justify-center gap-3 shadow-xl ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black shadow-red-950/40'
            }`}
          >
            {isStreaming ? (
              <>
                <Radio className="w-6 h-6 animate-spin" />
                <span>STOP GPS TELEMETRY</span>
              </>
            ) : (
              <>
                <Radio className="w-6 h-6" />
                <span>START LIVE PARAMEDIC GPS</span>
              </>
            )}
          </button>

          {/* Quick Siren & Code 3 Beacon Button */}
          <button
            onClick={handleToggleSiren}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 border shadow-lg ${
              sirenOn
                ? 'bg-red-600 text-white border-red-400 shadow-red-900/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
            }`}
          >
            <Volume2 className="w-5 h-5" />
            <span>{sirenOn ? '🚨 CODE 3 SIREN & LIGHTS ACTIVE 🔊' : 'ACTIVATE CODE 3 SIREN & LIGHTS'}</span>
          </button>

          {/* Telemetry Metrics Readout */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium mb-0.5">Speed</div>
              <div className="text-lg font-bold text-white font-mono">
                {currentCoords.speed}{' '}
                <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium mb-0.5">Medical O2</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {oxygenLevel}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium mb-0.5">GPS Precision</div>
              <div className="text-lg font-bold text-teal-400 font-mono">
                ±{currentCoords.accuracy}m
              </div>
            </div>
          </div>

          {/* Patient Triage Selection Box */}
          <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-red-400" />
                <span>Patient Triage Classification</span>
              </span>
              <span className="font-mono text-red-400 font-bold">{patientTriage}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'CRITICAL', label: '🔴 CRITICAL', desc: 'Life threat' },
                { id: 'URGENT', label: '🟡 URGENT', desc: 'Serious' },
                { id: 'STABLE', label: '🟢 STABLE', desc: 'Minor' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTriage(t.id as TriageLevel)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border ${
                    patientTriage === t.id
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="text-[9px] text-slate-400 font-normal">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Coordinates Box */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="text-slate-400">Lat: </span>
                <span>{currentCoords.lat.toFixed(6)}</span>,{' '}
                <span className="text-slate-400">Lng: </span>
                <span>{currentCoords.lng.toFixed(6)}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-red-300 font-bold">
              Pings: {pingsSent}
            </span>
          </div>

          {/* Test Drive Simulation Toggle */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200">Test Driving Simulation</div>
              <div className="text-[11px] text-slate-400">
                {simulationMode ? 'Simulating Code 3 emergency route' : 'Using phone device hardware GPS'}
              </div>
            </div>
            <button
              onClick={() => {
                const next = !simulationMode;
                setSimulationMode(next);
                if (isStreaming) {
                  toggleStreaming();
                  setTimeout(toggleStreaming, 300);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                simulationMode
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {simulationMode ? 'Sim Active' : 'Enable Sim'}
            </button>
          </div>

          {/* Status feedback bar */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
            <span className="truncate">{statusMessage || lastPingStatus}</span>
            <Send className="w-3.5 h-3.5 text-red-400 shrink-0 ml-2" />
          </div>

          {/* Emergency SOS Button */}
          <button
            onClick={handleTriggerSOS}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              sosActive
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{sosActive ? 'CANCEL EMERGENCY SOS' : '🚨 CREW EMERGENCY SOS (ALERT DISPATCH)'}</span>
          </button>
        </div>

        {/* Footer Install Prompt */}
        {!isInstalled && isInstallable && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <span className="font-bold">Install Paramedic App</span>
              <p className="text-[11px] text-slate-500">Run standalone full screen on phone</p>
            </div>
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
