import React from 'react';
import { X, ShieldAlert, AlertTriangle, Clock, MapPin, Gauge, Battery, Activity, HeartPulse } from 'lucide-react';
import type { FleetAlert } from '../types.ts';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: FleetAlert[];
  onSelectAutoById: (autoId: string) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onSelectAutoById,
}) => {
  if (!isOpen) return null;

  const getAlertIcon = (type: FleetAlert['type']) => {
    switch (type) {
      case 'SOS':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'CODE_3_DISPATCH':
        return <HeartPulse className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'PATIENT_CRITICAL':
        return <Activity className="w-5 h-5 text-red-400" />;
      case 'OVERSPEED':
        return <Gauge className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const timeAgo = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-left text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Emergency Dispatch Alerts</h3>
            <p className="text-xs text-slate-400">{alerts.length} Active ambulance incidents recorded</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active emergency alerts. All 20 ambulances operating on normal dispatch protocols.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => {
                onSelectAutoById(alert.autoId);
                onClose();
              }}
              className={`p-3.5 rounded-xl border transition cursor-pointer hover:scale-[1.01] ${
                alert.severity === 'high'
                  ? 'bg-rose-950/40 border-rose-800/80 hover:bg-rose-950/60'
                  : 'bg-slate-850 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs text-white">
                      🚑 {alert.autoId} • {alert.regNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium leading-snug">
                    {alert.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/40 pt-1.5">
                    <span>Crew: {alert.driverName}</span>
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Locate on Map
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
