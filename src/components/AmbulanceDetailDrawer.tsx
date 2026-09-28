import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  MapPin,
  Clock,
  Phone,
  User,
  HeartPulse,
  Battery,
  Flame,
  Activity,
  Navigation,
  Compass,
  Building2,
  Send,
  Zap,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import type { Ambulance, EmergencyStatus, EmergencyHospital } from '../types.ts';

interface AmbulanceDetailDrawerProps {
  ambulance: Ambulance | null;
  hospitals?: EmergencyHospital[];
  onClose: () => void;
  onToggleSiren: (ambulanceId: string) => Promise<any>;
  onUpdateStatus: (
    ambulanceId: string,
    status: EmergencyStatus,
    sirenActive?: boolean,
    oxygenLevelPercent?: number
  ) => Promise<any>;
  onOpenDispatch?: (ambulance: Ambulance) => void;
  onOpenGpsTerminal?: (ambulanceId: string) => void;
  onSendGpsPacket?: (payload: any) => Promise<any>;
}

export const AmbulanceDetailDrawer: React.FC<AmbulanceDetailDrawerProps> = ({
  ambulance,
  hospitals = [],
  onClose,
  onToggleSiren,
  onUpdateStatus,
  onOpenDispatch,
  onOpenGpsTerminal,
  onSendGpsPacket,
}) => {
  const [isTogglingSiren, setIsTogglingSiren] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showHardwarePingSim, setShowHardwarePingSim] = useState(false);

  // Simulation controls
  const [simSpeed, setSimSpeed] = useState<number>(ambulance?.currentLocation.speed || 55);
  const [simSatellites, setSimSatellites] = useState<number>(ambulance?.gpsDevice.satellitesLocked || 14);
  const [simIgnition, setSimIgnition] = useState<boolean>(ambulance?.gpsDevice.ignitionOn ?? true);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingSuccessMsg, setPingSuccessMsg] = useState<string | null>(null);

  if (!ambulance) return null;

  const handleSirenClick = async () => {
    try {
      setIsTogglingSiren(true);
      await onToggleSiren(ambulance.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTogglingSiren(false);
    }
  };

  const handleStatusChange = async (newStatus: EmergencyStatus) => {
    try {
      setIsUpdatingStatus(true);
      const isSiren = newStatus === 'DISPATCHED' || newStatus === 'PATIENT_ONBOARD';
      await onUpdateStatus(ambulance.id, newStatus, isSiren);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendSimulatedPacket = async () => {
    if (!onSendGpsPacket) return;
    try {
      setIsSendingPing(true);
      setPingSuccessMsg(null);
      // Small coordinate advance in heading direction
      const rad = ((ambulance.currentLocation.heading || 0) * Math.PI) / 180;
      const nextLat = ambulance.currentLocation.lat + Math.cos(rad) * 0.0003;
      const nextLng = ambulance.currentLocation.lng + Math.sin(rad) * 0.0003;

      await onSendGpsPacket({
        imei: ambulance.gpsDevice.imei,
        ambulanceId: ambulance.id,
        lat: nextLat,
        lng: nextLng,
        speed: simSpeed,
        heading: ambulance.currentLocation.heading,
        satellites: simSatellites,
        ignition: simIgnition,
        siren: ambulance.sirenActive,
        emergencyStatus: ambulance.emergencyStatus,
        batteryBackup: ambulance.gpsDevice.internalBatteryBackup,
        hdop: ambulance.gpsDevice.hdop,
      });

      setPingSuccessMsg('AIS-140 GPS packet transmitted! Server responded with ACK.');
      setTimeout(() => setPingSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingPing(false);
    }
  };

  const getStatusBadge = (status: EmergencyStatus) => {
    switch (status) {
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Dispatched to Scene
          </span>
        );
      case 'EN_ROUTE_PATIENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            En Route to Patient
          </span>
        );
      case 'PATIENT_ONBOARD':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Patient Onboard (Emergency)
          </span>
        );
      case 'ARRIVED_HOSPITAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            At Hospital Casualty Bay
          </span>
        );
      case 'RETURNING_TO_BASE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Returning to Base
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Maintenance / Out of Service
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Standby / Available
          </span>
        );
    }
  };

  return (
    <div className="absolute top-3 right-3 z-40 w-full sm:w-96 max-w-[calc(100vw-24px)] max-h-[calc(100vh-130px)] rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-slide-left">
      {/* Top Banner with Siren Status */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between transition-colors ${
          ambulance.sirenActive
            ? 'bg-rose-950/60 border-rose-600/50'
            : 'bg-slate-800/80 border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border shadow-lg ${
              ambulance.sirenActive
                ? 'bg-rose-600 text-white border-rose-400 animate-bounce'
                : 'bg-red-950 text-red-400 border-red-800'
            }`}
          >
            🚑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">{ambulance.id}</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {ambulance.regNumber}
              </span>
            </div>
            <p className="text-xs text-rose-300/90 font-medium">
              {ambulance.ambulanceType}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-none text-xs">
        {/* Siren Alert Strip */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            ambulance.sirenActive
              ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {ambulance.sirenActive ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            )}
            <div>
              <p className="font-bold text-white text-xs">
                {ambulance.sirenActive ? 'EMERGENCY SIREN ACTIVE' : 'Siren Inactive (Silent)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {ambulance.sirenActive
                  ? 'Priority green corridor beacon requested'
                  : 'Normal traffic compliance'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSirenClick}
            disabled={isTogglingSiren}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition ${
              ambulance.sirenActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {ambulance.sirenActive ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Mute Siren</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound Siren</span>
              </>
            )}
          </button>
        </div>

        {/* Current Status & Action */}
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Mission Status
            </span>
            {getStatusBadge(ambulance.emergencyStatus)}
          </div>

          {/* Quick status control buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => handleStatusChange('STANDBY')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition border ${
                ambulance.emergencyStatus === 'STANDBY'
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Standby / Available
            </button>
            <button
              onClick={() => handleStatusChange('PATIENT_ONBOARD')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition border ${
                ambulance.emergencyStatus === 'PATIENT_ONBOARD'
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Patient Onboard
            </button>
            <button
              onClick={() => handleStatusChange('ARRIVED_HOSPITAL')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition border ${
                ambulance.emergencyStatus === 'ARRIVED_HOSPITAL'
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Arrived at ER
            </button>
            <button
              onClick={() => handleStatusChange('RETURNING_TO_BASE')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition border ${
                ambulance.emergencyStatus === 'RETURNING_TO_BASE'
                  ? 'bg-sky-600/30 text-sky-300 border-sky-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Returning to Base
            </button>
          </div>

          {ambulance.emergencyStatus === 'STANDBY' && onOpenDispatch && (
            <button
              onClick={() => onOpenDispatch?.(ambulance)}
              className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch to Emergency Incident</span>
            </button>
          )}
        </div>

        {/* Assigned Incident (if any) */}
        {ambulance.assignedIncident && (
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {ambulance.assignedIncident.priority}
              </span>
              <span className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA: ~{ambulance.assignedIncident.etaMinutes} mins
              </span>
            </div>
            <p className="font-bold text-white text-xs">
              {ambulance.assignedIncident.incidentType}
            </p>
            <div className="space-y-1 text-[11px] text-slate-300">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{ambulance.assignedIncident.pickupLocation}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>Dest: {ambulance.assignedIncident.targetHospital}</span>
              </p>
              {ambulance.assignedIncident.patientName && (
                <p className="flex items-start gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Patient: {ambulance.assignedIncident.patientName}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hardware GPS Device Telemetry Box */}
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-white text-xs">Hardware GPS Device</span>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Model & Spec:</span>
              <span className="font-medium text-slate-200">{ambulance.gpsDevice.model}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Protocol:</span>
              <span className="font-medium text-teal-300 font-mono">{ambulance.gpsDevice.protocol}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Hardware IMEI:</span>
              <span className="font-mono text-slate-200 font-semibold">{ambulance.gpsDevice.imei}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">M2M SIM:</span>
              <span className="font-mono text-slate-300">{ambulance.gpsDevice.simNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Satellites Locked:</span>
              <span className="font-semibold text-emerald-400">
                {ambulance.gpsDevice.satellitesLocked} Sats (HDOP {ambulance.gpsDevice.hdop})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">GSM Signal:</span>
              <span className="font-semibold text-slate-200">
                {ambulance.gpsDevice.signalDbm} dBm (4G LTE)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Ignition State:</span>
              <span className={`font-bold ${ambulance.gpsDevice.ignitionOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                {ambulance.gpsDevice.ignitionOn ? 'ENGINE ON' : 'IGNITION OFF'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Device Battery:</span>
              <span className="font-semibold text-slate-200">
                {ambulance.gpsDevice.internalBatteryBackup}% Backup
              </span>
            </div>
          </div>

          {/* Real-time coordinates */}
          <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-400">Live Speed:</span>{' '}
              <span className="font-mono font-bold text-white text-xs">
                {ambulance.currentLocation.speed || 0} km/h
              </span>
            </div>
            <div className="font-mono text-slate-300">
              {ambulance.currentLocation.lat.toFixed(5)}, {ambulance.currentLocation.lng.toFixed(5)}
            </div>
          </div>

          {/* Toggle Simulator */}
          <button
            onClick={() => setShowHardwarePingSim(!showHardwarePingSim)}
            className="w-full mt-1 py-1.5 px-2 rounded-lg bg-slate-750 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-600/80 flex items-center justify-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>{showHardwarePingSim ? 'Hide Hardware Simulator' : 'Test Hardware GPS Telemetry Ping'}</span>
          </button>

          {/* Hardware Ping Simulator Drawer */}
          {showHardwarePingSim && (
            <div className="p-3 mt-2 rounded-xl bg-slate-900 border border-teal-500/30 space-y-2.5">
              <p className="font-bold text-teal-300 text-[11px] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Simulate IoT Telemetry Feed</span>
              </p>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Speed: {simSpeed} km/h</span>
                  <span>Satellites: {simSatellites}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="110"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIgnition}
                    onChange={(e) => setSimIgnition(e.target.checked)}
                    className="accent-teal-500"
                  />
                  <span>Engine Ignition ON</span>
                </label>
              </div>

              {pingSuccessMsg && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{pingSuccessMsg}</span>
                </div>
              )}

              <button
                onClick={handleSendSimulatedPacket}
                disabled={isSendingPing}
                className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSendingPing ? 'Transmitting...' : 'Transmit AIS-140 Packet'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Medical & Crew Details */}
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Medical & Crew Details</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Base: {ambulance.baseHospital}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Driver:</span>
              <span className="font-semibold text-slate-200">
                {ambulance.driverName} ({ambulance.driverPhone})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Paramedic / EMT:</span>
              <span className="font-semibold text-slate-200">
                {ambulance.paramedicName} ({ambulance.paramedicPhone})
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Oxygen Cylinder:</span>
              <span className="font-bold text-emerald-400">
                {ambulance.oxygenLevelPercent}% Pressure (Active)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vehicle Fuel / Charge:</span>
              <span className="font-semibold text-slate-200">
                {ambulance.fuelOrCharge}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
