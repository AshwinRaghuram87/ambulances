import React, { useState } from 'react';
import {
  MapPin,
  ListFilter,
  PlusCircle,
  Smartphone,
  Bell,
  Radio,
  Download,
  Volume2,
  VolumeX,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import type { FleetStats, FleetAlert } from '../types.ts';
import { ambulanceSiren } from '../utils/sirenAudio.ts';

interface HeaderProps {
  activeTab: 'map' | 'fleet' | 'register' | 'driver';
  setActiveTab: (tab: 'map' | 'fleet' | 'register' | 'driver') => void;
  stats: FleetStats | null;
  alerts: FleetAlert[];
  isConnected: boolean;
  onOpenAlerts: () => void;
  selectedAutoId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  alerts,
  isConnected,
  onOpenAlerts,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);

  const highSeverityAlerts = alerts.filter((a) => a.severity === 'high');

  const handleToggleSiren = () => {
    const playing = ambulanceSiren.toggle();
    setIsSirenActive(playing);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Authority */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 p-0.5 shadow-lg shadow-red-900/40 shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-red-500 font-extrabold text-xl">
              🚑
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>EMS Ambulance Fleet Command</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  🗺️ OpenStreetMap • No API Key
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {isConnected ? 'Live Telemetry Active' : 'Connecting to Server...'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="hidden md:inline font-mono text-slate-300">20 Emergency Ambulances Tracked</span>
            </div>
          </div>
        </div>

        {/* Fleet Live Quick Metrics */}
        {stats && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
              <span className="text-slate-400">Fleet:</span>
              <span className="font-bold text-white font-mono">{stats.totalAmbulances || 20}</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-red-950/70 border border-red-800/60 text-red-300 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Code 3 Responding:</span>
              <span className="font-bold font-mono">{stats.activeResponding || stats.activeCollecting || 0}</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>En Route Hospital:</span>
              <span className="font-bold font-mono">{stats.enRouteHospital || stats.inTransit || 0}</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Available:</span>
              <span className="font-bold font-mono">{stats.availableForDispatch || stats.idleOrOffDuty || 0}</span>
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Siren Toggle */}
          <button
            onClick={handleToggleSiren}
            className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isSirenActive
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-900/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Code 3 Emergency Siren Audio"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isSirenActive ? 'Siren ON 🔊' : 'Siren Audio'}</span>
          </button>

          {/* Alerts Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition"
            title="View Live Emergency Dispatch Alerts"
          >
            <Bell className="w-4 h-4" />
            {highSeverityAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                {highSeverityAlerts.length}
              </span>
            )}
          </button>

          {/* PWA Install */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-xs shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install on iOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center overflow-x-auto scrollbar-none border-t border-slate-800/80">
        <nav className="flex space-x-1 py-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition whitespace-nowrap font-bold ${
              activeTab === 'map'
                ? 'bg-red-600/25 text-red-300 border border-red-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MapPin className="w-4 h-4 text-red-400" />
            <span>🚑 Live Command Center (20 Ambulances)</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'fleet'
                ? 'bg-red-600/25 text-red-300 border border-red-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Ambulance Registry & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-red-600/25 text-red-300 border border-red-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Commission New Ambulance</span>
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'driver'
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Paramedic Mobile Terminal</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
              LIVE GPS
            </span>
          </button>
        </nav>
      </div>

      {/* iOS Install Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-850 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-red-400" />
              <span>Install Ambulance Dispatch App on iOS</span>
            </h3>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-750 border border-slate-600 flex items-center justify-center shrink-0 font-bold">
                  1
                </span>
                <span>Tap <strong>Share</strong> (box with arrow) in Safari.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-750 border border-slate-600 flex items-center justify-center shrink-0 font-bold">
                  2
                </span>
                <span>Select <strong>Add to Home Screen</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-750 border border-slate-600 flex items-center justify-center shrink-0 font-bold">
                  3
                </span>
                <span>Launch directly as a full-screen mobile dispatch terminal.</span>
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2 rounded-xl bg-slate-750 hover:bg-slate-700 border border-slate-600 text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
