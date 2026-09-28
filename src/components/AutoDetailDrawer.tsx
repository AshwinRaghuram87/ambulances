import React, { useState } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  AlertTriangle,
  Battery,
  Gauge,
  Compass,
  Phone,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  Activity,
  HeartPulse,
  Flame,
  Volume2,
  Stethoscope,
  Building2,
} from 'lucide-react';
import type { Ambulance, AmbulanceStatus } from '../types.ts';
import { ambulanceSiren } from '../utils/sirenAudio.ts';

interface AutoDetailDrawerProps {
  auto: Ambulance | null;
  onClose: () => void;
  onOpenMobileView: (autoId: string) => void;
  onOpenQRModal: (auto: Ambulance) => void;
  onUpdateStatus: (autoId: string, status: AmbulanceStatus, sosActive?: boolean, sirenActive?: boolean) => void;
}

export const AutoDetailDrawer: React.FC<AutoDetailDrawerProps> = ({
  auto,
  onClose,
  onOpenMobileView,
  onOpenQRModal,
  onUpdateStatus,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!auto) return null;

  const getStatusBadge = (status: AmbulanceStatus, sosActive?: boolean) => {
    if (sosActive) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          AMBULANCE SOS
        </span>
      );
    }
    switch (status) {
      case 'RESPONDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            🚨 Code 3 Responding
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            🩺 On Scene Stabilizing
          </span>
        );
      case 'EN_ROUTE_HOSPITAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            🏥 En Route to Hospital
          </span>
        );
      case 'AT_HOSPITAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            🏥 At Hospital ER Handover
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            🟢 Available for Dispatch
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Depot Maintenance
          </span>
        );
    }
  };

  const timeAgo = () => {
    const sec = Math.floor((Date.now() - auto.lastPingAt) / 1000);
    if (sec < 5) return 'Just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ago`;
  };

  const handleStatusChange = async (newStatus: AmbulanceStatus) => {
    setIsUpdatingStatus(true);
    try {
      const isEmergency = newStatus === 'RESPONDING' || newStatus === 'EN_ROUTE_HOSPITAL';
      await onUpdateStatus(auto.id, newStatus, false, isEmergency);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleSOS = async () => {
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(auto.id, auto.sosActive ? 'AVAILABLE' : 'MAINTENANCE', !auto.sosActive);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleSiren = async () => {
    const nextSiren = !auto.sirenActive;
    await onUpdateStatus(auto.id, auto.status, auto.sosActive, nextSiren);
    if (nextSiren) {
      ambulanceSiren.play('wail');
    } else {
      ambulanceSiren.stop();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 md:w-[430px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-y-auto animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-md">
            <span className="text-2xl">🚑</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white font-mono tracking-tight">{auto.id}</h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {auto.regNumber}
              </span>
            </div>
            <p className="text-xs text-red-400 font-semibold">{auto.vehicleType}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close ambulance inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card & Paramedic Live Connection Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Dispatch Status</span>
            {getStatusBadge(auto.status, auto.sosActive)}
          </div>

          {/* Paramedic phone live badge */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              auto.isPhoneConnected
                ? 'bg-teal-950/60 border-teal-700/60 text-teal-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-400" />
              <div>
                <div className="font-semibold text-white">
                  {auto.isPhoneConnected ? '📱 Paramedic Mobile Terminal Live' : '🛰️ Satellite Telemetry Active'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Last ping: {timeAgo()} • GPS Accuracy: ±{auto.currentLocation.accuracy || 3}m
                </div>
              </div>
            </div>
            {auto.isPhoneConnected && (
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            )}
          </div>

          {/* Siren Control & Status Changer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleToggleSiren}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                auto.sirenActive
                  ? 'bg-red-600 text-white border-red-500 shadow-md animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{auto.sirenActive ? 'Code 3 Siren ON 🔊' : 'Activate Siren'}</span>
            </button>

            <select
              value={auto.status}
              onChange={(e) => handleStatusChange(e.target.value as AmbulanceStatus)}
              disabled={isUpdatingStatus}
              aria-label="Change ambulance status"
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden font-semibold cursor-pointer"
            >
              <option value="RESPONDING">🚨 Code 3 Responding</option>
              <option value="ON_SCENE">🩺 On Scene</option>
              <option value="EN_ROUTE_HOSPITAL">🏥 En Route Hospital</option>
              <option value="AT_HOSPITAL">🏥 At Hospital ER</option>
              <option value="AVAILABLE">🟢 Available for Dispatch</option>
              <option value="MAINTENANCE">⚠️ Maintenance</option>
            </select>
          </div>
        </div>

        {/* Emergency Medical Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Speed */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Current Speed</div>
              <div className="text-sm font-bold text-white font-mono">
                {auto.currentLocation.speed || 0} <span className="text-xs font-normal text-slate-400">km/h</span>
              </div>
            </div>
          </div>

          {/* Medical Oxygen */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Medical O2 Tank</div>
              <div className="text-sm font-bold text-emerald-300 font-mono">
                {auto.oxygenLevel}% <span className="text-[10px] text-slate-400">Pressure OK</span>
              </div>
            </div>
          </div>

          {/* Battery / Vehicle Fuel */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Battery className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Battery & Power</div>
              <div className="text-sm font-bold text-white font-mono">
                {auto.batteryLevel}%
              </div>
            </div>
          </div>

          {/* Patient Triage Level */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Patient Triage</div>
              <div className={`text-xs font-extrabold font-mono ${
                auto.patientTriage === 'CRITICAL' ? 'text-red-400' : auto.patientTriage === 'URGENT' ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {auto.patientTriage || 'STANDBY'}
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Destination Hospital */}
        <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-rose-400" />
              <span>Target Hospital ER</span>
            </span>
            <span className="text-rose-400 font-bold">Priority Route</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">{auto.targetHospital}</div>
              <div className="text-[11px] text-slate-400">Estimated Ambulance Arrival: <strong>4 mins</strong></div>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 text-xs font-mono font-bold border border-emerald-800">
              ER Ready
            </span>
          </div>
        </div>

        {/* Paramedic & Driver Crew Profile */}
        <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paramedic Crew Onboard</div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center font-bold text-red-300 text-xs">
                  🩺
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{auto.paramedicName}</h4>
                  <p className="text-[11px] text-teal-400 font-medium">{auto.paramedicRank}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-750 border border-slate-600 flex items-center justify-center font-bold text-slate-300 text-xs">
                  🚐
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Driver: {auto.driverName}</h4>
                  <a
                    href={`tel:${auto.driverPhone}`}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                  >
                    <Phone className="w-3 h-3 text-teal-400" />
                    <span>{auto.driverPhone}</span>
                  </a>
                </div>
              </div>
              <a
                href={`tel:${auto.driverPhone}`}
                className="p-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 transition"
                title="Call Driver"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Sector & Dispatch Call Info */}
        <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-2 text-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sector & Call Assignment</div>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500 block">Sector / Zone:</span>
              <span className="font-semibold text-white">{auto.ward}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Dispatch Call ID:</span>
              <span className="font-semibold text-red-400 font-mono">{auto.routeId}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Dispatch Notes:</span>
              <span className="font-normal text-slate-300 italic">{auto.notes || 'Emergency ambulance dispatched'}</span>
            </div>
          </div>
        </div>

        {/* Paramedic App Terminal Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => onOpenMobileView(auto.id)}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Paramedic Terminal for {auto.id}</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          <button
            onClick={() => onOpenQRModal(auto)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4 text-red-400" />
            <span>Generate Paramedic Phone QR Code</span>
          </button>

          <button
            onClick={handleToggleSOS}
            className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              auto.sosActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{auto.sosActive ? 'Clear Ambulance SOS Alert' : 'Trigger Ambulance SOS Test'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
