import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Send,
  Satellite,
  Power,
  Volume2,
  VolumeX,
  Gauge,
  Compass,
  Cpu,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Terminal,
  MapPin,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type { Ambulance, GPSPacketPayload, EmergencyStatus } from '../types.ts';

interface GpsDeviceSimulatorProps {
  ambulances: Ambulance[];
  selectedAmbulanceId?: string;
  onSendGpsPacket: (payload: GPSPacketPayload) => Promise<any>;
  onNavigateToMap: (ambulanceId: string) => void;
}

export const GpsDeviceSimulator: React.FC<GpsDeviceSimulatorProps> = ({
  ambulances,
  selectedAmbulanceId,
  onSendGpsPacket,
  onNavigateToMap,
}) => {
  const [activeAmbulanceId, setActiveAmbulanceId] = useState<string>(
    selectedAmbulanceId || (ambulances[0]?.id ?? 'AMB-101')
  );

  const currentAmbulance = ambulances.find((a) => a.id === activeAmbulanceId) || ambulances[0];

  // Simulator controls state
  const [lat, setLat] = useState<number>(currentAmbulance?.currentLocation.lat || 12.9716);
  const [lng, setLng] = useState<number>(currentAmbulance?.currentLocation.lng || 77.5946);
  const [speed, setSpeed] = useState<number>(currentAmbulance?.currentLocation.speed || 45);
  const [heading, setHeading] = useState<number>(currentAmbulance?.currentLocation.heading || 90);
  const [ignition, setIgnition] = useState<boolean>(currentAmbulance?.gpsDevice.ignitionOn ?? true);
  const [siren, setSiren] = useState<boolean>(currentAmbulance?.sirenActive ?? true);
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>(
    currentAmbulance?.emergencyStatus || 'EN_ROUTE_PATIENT'
  );
  const [satellites, setSatellites] = useState<number>(currentAmbulance?.gpsDevice.satellitesLocked || 14);
  const [batteryBackup, setBatteryBackup] = useState<number>(
    currentAmbulance?.gpsDevice.internalBatteryBackup || 96
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamIntervalMs, setStreamIntervalMs] = useState(3000);
  const [terminalLogs, setTerminalLogs] = useState<
    Array<{ id: string; time: string; direction: 'TX' | 'RX'; text: string; success?: boolean }>
  >([]);

  // Update simulator fields when selected ambulance changes
  useEffect(() => {
    if (currentAmbulance) {
      setLat(currentAmbulance.currentLocation.lat);
      setLng(currentAmbulance.currentLocation.lng);
      setSpeed(currentAmbulance.currentLocation.speed || 40);
      setHeading(currentAmbulance.currentLocation.heading || 90);
      setIgnition(currentAmbulance.gpsDevice.ignitionOn);
      setSiren(currentAmbulance.sirenActive);
      setEmergencyStatus(currentAmbulance.emergencyStatus);
      setSatellites(currentAmbulance.gpsDevice.satellitesLocked);
    }
  }, [activeAmbulanceId]);

  // Construct raw simulated NMEA / AIS-140 string
  const rawPacketString = currentAmbulance
    ? `$AIS140,${currentAmbulance.id},IMEI:${currentAmbulance.gpsDevice.imei},LAT:${lat.toFixed(
        6
      )},LNG:${lng.toFixed(6)},SPD:${speed.toFixed(1)},HDG:${heading},IGN:${ignition ? 1 : 0},SRN:${
        siren ? 1 : 0
      },SAT:${satellites},STS:${emergencyStatus}*7F`
    : '';

  const transmitPacket = async (stepCoords = false) => {
    if (!currentAmbulance) return;
    setIsSending(true);

    let nextLat = lat;
    let nextLng = lng;
    if (stepCoords && speed > 0) {
      // Step vehicle in heading direction
      const rad = (heading * Math.PI) / 180;
      const step = 0.0003;
      nextLat = lat + Math.cos(rad) * step;
      nextLng = lng + Math.sin(rad) * step;
      setLat(nextLat);
      setLng(nextLng);
    }

    const payload: GPSPacketPayload = {
      imei: currentAmbulance.gpsDevice.imei,
      ambulanceId: currentAmbulance.id,
      lat: nextLat,
      lng: nextLng,
      speed,
      heading,
      satellites,
      hdop: 0.8,
      ignition,
      siren,
      emergencyStatus,
      batteryBackup,
      rawNmeaOrString: rawPacketString,
    };

    const txTime = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      {
        id: `tx-${Date.now()}`,
        time: txTime,
        direction: 'TX',
        text: `[AIS-140] IMEI:${currentAmbulance.gpsDevice.imei} Lat:${nextLat.toFixed(5)} Lng:${nextLng.toFixed(
          5
        )} Spd:${speed}km/h Siren:${siren ? 'ON' : 'OFF'}`,
      },
      ...prev.slice(0, 40),
    ]);

    try {
      const start = performance.now();
      const res = await onSendGpsPacket(payload);
      const latency = Math.round(performance.now() - start);

      setTerminalLogs((prev) => [
        {
          id: `rx-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          direction: 'RX',
          text: `[ACK 200] Server acknowledged packet for ${currentAmbulance.id} (${latency}ms)`,
          success: true,
        },
        ...prev.slice(0, 40),
      ]);
    } catch (err: any) {
      setTerminalLogs((prev) => [
        {
          id: `err-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          direction: 'RX',
          text: `[ERROR] Telemetry stream error: ${err.message || 'Transmission failed'}`,
          success: false,
        },
        ...prev.slice(0, 40),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Continuous background telemetry streaming interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isStreaming) {
      timer = setInterval(() => {
        transmitPacket(true);
      }, streamIntervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStreaming, streamIntervalMs, lat, lng, speed, heading, ignition, siren, emergencyStatus, satellites]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/40">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Ambulance GPS Device Telemetry Streamer & Terminal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                AIS-140 / IoT Gateway
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate live hardware GPS device packets, satellite locks, vehicle ignition, siren beacons, and emergency priority telemetry.
            </p>
          </div>
        </div>

        {/* Selected Ambulance Selector */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400">Target Ambulance:</div>
            <div className="font-bold text-white text-xs">{currentAmbulance?.regNumber}</div>
          </div>
          <select
            value={activeAmbulanceId}
            onChange={(e) => setActiveAmbulanceId(e.target.value)}
            aria-label="Select target ambulance to stream GPS data"
            className="px-3 py-2 rounded-xl bg-slate-850 text-white border border-slate-700 font-bold text-xs focus:outline-hidden cursor-pointer"
          >
            {ambulances.map((amb) => (
              <option key={amb.id} value={amb.id}>
                {amb.id} - {amb.regNumber} ({amb.ambulanceType})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Device Info & Telemetry Tuning Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hardware Device Specifications Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Hardware Tracker Profile</h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700">
                {currentAmbulance?.gpsDevice.protocol} Protocol
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Device Model:</span>
                <span className="font-semibold text-slate-200 block truncate">
                  {currentAmbulance?.gpsDevice.model}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Hardware IMEI:</span>
                <span className="font-mono font-bold text-teal-400 block truncate">
                  {currentAmbulance?.gpsDevice.imei}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SIM Card Phone:</span>
                <span className="font-mono text-slate-300 block truncate">
                  {currentAmbulance?.gpsDevice.simNumber}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Base Hospital:</span>
                <span className="font-semibold text-slate-200 block truncate">
                  {currentAmbulance?.baseHospital}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Telemetry Tuning Dashboard */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-rose-400" />
              <span>Real-Time Sensor & Vehicle Controls</span>
            </h3>

            {/* Toggle Buttons: Ignition & Siren */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Ignition Switch */}
              <button
                type="button"
                onClick={() => setIgnition(!ignition)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between font-bold text-xs transition cursor-pointer ${
                  ignition
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 shadow-md'
                    : 'bg-slate-850 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Power className="w-4 h-4" />
                  <span>Engine Ignition Sensor</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-black/40">
                  {ignition ? 'IGN ON' : 'IGN OFF'}
                </span>
              </button>

              {/* Siren Switch */}
              <button
                type="button"
                onClick={() => setSiren(!siren)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between font-bold text-xs transition cursor-pointer ${
                  siren
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-md shadow-rose-950/50'
                    : 'bg-slate-850 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {siren ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
                  <span>Emergency Siren Beacon</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-black/40">
                  {siren ? 'SIREN ACTIVE' : 'MUTED'}
                </span>
              </button>
            </div>

            {/* Emergency Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Ambulance Mission / Dispatch Status:
              </label>
              <select
                value={emergencyStatus}
                onChange={(e) => setEmergencyStatus(e.target.value as EmergencyStatus)}
                aria-label="Ambulance mission dispatch status"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-850 text-white border border-slate-700 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="STANDBY">Standby at Base Hospital</option>
                <option value="DISPATCHED">Dispatched to Emergency Incident Scene</option>
                <option value="EN_ROUTE_PATIENT">En Route to Patient Location</option>
                <option value="PATIENT_ONBOARD">Patient Onboard en route Hospital</option>
                <option value="ARRIVED_HOSPITAL">Arrived at Trauma Center</option>
                <option value="RETURNING_TO_BASE">Returning to Base Hospital</option>
                <option value="MAINTENANCE">Depot Maintenance</option>
              </select>
            </div>

            {/* Sliders: Speed, Heading, Satellites */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Speed Slider */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">GPS Speed:</span>
                  <span className="font-mono font-bold text-sky-400">{speed} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="GPS speed slider"
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Heading Slider */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Heading / Angle:</span>
                  <span className="font-mono font-bold text-amber-400">{heading}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={heading}
                  onChange={(e) => setHeading(Number(e.target.value))}
                  aria-label="Heading angle slider"
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Satellites Locked Slider */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Satellites:</span>
                  <span className="font-mono font-bold text-emerald-400">{satellites} Locked</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="22"
                  value={satellites}
                  onChange={(e) => setSatellites(Number(e.target.value))}
                  aria-label="Satellites locked slider"
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Coordinates Lat & Lng Input */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  GPS Latitude (°N):
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  GPS Longitude (°E):
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => transmitPacket(false)}
                disabled={isSending}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Transmitting...' : 'Transmit Single GPS Telemetry Packet'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStreaming(!isStreaming)}
                className={`py-3 px-4 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border ${
                  isStreaming
                    ? 'bg-rose-950 text-rose-300 border-rose-700 hover:bg-rose-900'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750'
                }`}
              >
                {isStreaming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                <span>{isStreaming ? 'Stop Auto-Stream' : 'Auto-Stream (Every 3s)'}</span>
              </button>

              {currentAmbulance && (
                <button
                  type="button"
                  onClick={() => onNavigateToMap(currentAmbulance.id)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5"
                  title="Track on Open Source Map"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Locate on Map</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Raw AIS-140 Packet Preview & Live Terminal (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Raw Packet String Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-teal-400" />
                <span>Raw AIS-140 / NMEA Telemetry Packet String</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">ASCII UTF-8</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-teal-300 break-all leading-relaxed select-all">
              {rawPacketString}
            </div>
            <p className="text-[10px] text-slate-500">
              Complies with Ministry of Road Transport & Highways (MoRTH) AIS-140 standard for public emergency service vehicles.
            </p>
          </div>

          {/* Live Terminal Log */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[420px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Live Telemetry Gateway Feed</h3>
              </div>
              <button
                onClick={() => setTerminalLogs([])}
                className="text-[10px] text-slate-400 hover:text-white transition"
              >
                Clear Feed
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] pr-1 scrollbar-thin">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-16">
                  Terminal ready. Click <strong>"Transmit Single GPS Telemetry Packet"</strong> or{' '}
                  <strong>"Auto-Stream"</strong> to begin sending live device updates.
                </div>
              ) : (
                terminalLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border text-xs ${
                      log.direction === 'TX'
                        ? 'bg-slate-950/80 border-slate-800 text-sky-300'
                        : log.success
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="font-bold">{log.direction === 'TX' ? '▲ OUTBOUND PACKET' : '▼ SERVER ACK'}</span>
                      <span>{log.time}</span>
                    </div>
                    <div className="break-all">{log.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
