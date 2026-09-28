import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Search,
  Filter,
  Send,
  PlusCircle,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  HeartPulse,
  Flame,
  Activity,
  Download,
  Terminal,
  FileText,
} from 'lucide-react';
import type {
  Ambulance,
  EmergencyHospital,
  EmergencyStatus,
  AmbulanceType,
  GPSProtocol,
  RegisterAmbulancePayload,
  GPSPacketPayload,
} from '../types.ts';

interface AmbulanceGPSManagerProps {
  ambulances: Ambulance[];
  hospitals: EmergencyHospital[];
  onSelectAmbulanceOnMap: (ambulance: Ambulance) => void;
  onToggleSiren: (ambulanceId: string) => Promise<void>;
  onOpenDispatch: (ambulance: Ambulance) => void;
  onRegisterAmbulance: (payload: RegisterAmbulancePayload) => Promise<Ambulance>;
  onSendGpsPacket: (payload: GPSPacketPayload) => Promise<any>;
}

export const AmbulanceGPSManager: React.FC<AmbulanceGPSManagerProps> = ({
  ambulances,
  hospitals,
  onSelectAmbulanceOnMap,
  onToggleSiren,
  onOpenDispatch,
  onRegisterAmbulance,
  onSendGpsPacket,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'terminal' | 'register'>('fleet');

  // Search & filter for fleet table
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sirenOnly, setSirenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Simulator state
  const [selectedSimAmbulanceId, setSelectedSimAmbulanceId] = useState<string>(
    ambulances[0]?.id || 'AMB-101'
  );
  const [simSpeed, setSimSpeed] = useState<number>(65);
  const [simSatellites, setSimSatellites] = useState<number>(14);
  const [simHeading, setSimHeading] = useState<number>(180);
  const [simIgnition, setSimIgnition] = useState<boolean>(true);
  const [simSiren, setSimSiren] = useState<boolean>(true);
  const [simStatus, setSimStatus] = useState<EmergencyStatus>('EN_ROUTE_PATIENT');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' }>>([
    {
      time: new Date().toLocaleTimeString(),
      text: 'AIS-140 GPS Telemetry Gateway initialized. Listening on TCP/UDP 8088 and HTTP /api/gps/packet',
      type: 'info',
    },
    {
      time: new Date().toLocaleTimeString(),
      text: 'Connected to State Emergency Medical Response (108) Telematics Server',
      type: 'success',
    },
  ]);

  // Registration Form State
  const [regNumber, setRegNumber] = useState('');
  const [customId, setCustomId] = useState(`AMB-${String(100 + ambulances.length + 1)}`);
  const [ambulanceType, setAmbulanceType] = useState<AmbulanceType>('Advanced Life Support (ALS)');
  const [baseHospital, setBaseHospital] = useState(hospitals[0]?.name || '');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [paramedicName, setParamedicName] = useState('');
  const [paramedicPhone, setParamedicPhone] = useState('');
  const [gpsModel, setGpsModel] = useState('Teltonika FMB920 AIS-140');
  const [gpsImei, setGpsImei] = useState('');
  const [gpsProtocol, setGpsProtocol] = useState<GPSProtocol>('AIS-140');
  const [simNumber, setSimNumber] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<Ambulance | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Filtered ambulances
  const filteredAmbulances = useMemo(() => {
    return ambulances.filter((a) => {
      if (sirenOnly && !a.sirenActive) return false;
      if (statusFilter !== 'ALL' && a.emergencyStatus !== statusFilter) return false;
      if (typeFilter !== 'ALL' && a.ambulanceType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          a.id.toLowerCase().includes(q) ||
          a.regNumber.toLowerCase().includes(q) ||
          a.driverName.toLowerCase().includes(q) ||
          a.paramedicName.toLowerCase().includes(q) ||
          a.baseHospital.toLowerCase().includes(q) ||
          a.gpsDevice.imei.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [ambulances, search, statusFilter, typeFilter, sirenOnly]);

  const totalPages = Math.ceil(filteredAmbulances.length / pageSize) || 1;
  const paginatedAmbulances = filteredAmbulances.slice((page - 1) * pageSize, page * pageSize);

  // Metrics
  const activeSirenCount = ambulances.filter((a) => a.sirenActive).length;
  const dispatchedCount = ambulances.filter(
    (a) => a.emergencyStatus === 'DISPATCHED' || a.emergencyStatus === 'PATIENT_ONBOARD'
  ).length;
  const standbyCount = ambulances.filter((a) => a.emergencyStatus === 'STANDBY').length;
  const codeRedCount = ambulances.filter(
    (a) => a.assignedIncident?.priority === 'CODE_RED'
  ).length;

  const handleTransmitSimPacket = async () => {
    const amb = ambulances.find((a) => a.id === selectedSimAmbulanceId);
    if (!amb) return;

    try {
      setIsTransmitting(true);
      const rad = ((simHeading || 0) * Math.PI) / 180;
      const nextLat = amb.currentLocation.lat + Math.cos(rad) * 0.0004;
      const nextLng = amb.currentLocation.lng + Math.sin(rad) * 0.0004;

      const payload: GPSPacketPayload = {
        imei: amb.gpsDevice.imei,
        ambulanceId: amb.id,
        lat: nextLat,
        lng: nextLng,
        speed: simSpeed,
        heading: simHeading,
        satellites: simSatellites,
        ignition: simIgnition,
        siren: simSiren,
        emergencyStatus: simStatus,
        batteryBackup: 96,
        hdop: 0.8,
      };

      await onSendGpsPacket(payload);

      const packetLog = `$AIS140,${amb.gpsDevice.imei},${amb.regNumber},A,${nextLat.toFixed(5)},N,${nextLng.toFixed(5)},E,${simSpeed}KMH,${simHeading}DEG,SATS:${simSatellites},IGN:${simIgnition ? 1 : 0},SIREN:${simSiren ? 1 : 0},STAT:${simStatus}`;

      setTerminalLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `[ACK RECV] Packet processed for ${amb.id} -> ${packetLog}`,
          type: 'success',
        },
        ...prev.slice(0, 40),
      ]);
    } catch (e) {
      setTerminalLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `[ERROR] Telemetry packet drop: ${e instanceof Error ? e.message : 'Transmission failure'}`,
          type: 'warn',
        },
        ...prev,
      ]);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsRegistering(true);
      setRegError(null);
      setRegSuccess(null);

      const payload: RegisterAmbulancePayload = {
        customId,
        regNumber,
        ambulanceType,
        baseHospital: baseHospital || hospitals[0]?.name || 'Central General Hospital',
        driverName,
        driverPhone,
        paramedicName,
        paramedicPhone,
        gpsModel,
        gpsImei,
        gpsProtocol,
        simNumber,
        reportingIntervalSec: 5,
      };

      const newAmb = await onRegisterAmbulance(payload);
      setRegSuccess(newAmb);

      // Reset form
      setRegNumber('');
      setDriverName('');
      setDriverPhone('');
      setParamedicName('');
      setParamedicPhone('');
      setGpsImei('');
      setSimNumber('');
      setCustomId(`AMB-${String(100 + ambulances.length + 2)}`);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  // CSV Export for Ambulances
  const handleExportCSV = () => {
    const headers = [
      'Ambulance ID',
      'Plate Number',
      'Type',
      'Base Hospital',
      'Status',
      'Siren Active',
      'Driver Name',
      'Driver Phone',
      'Paramedic Name',
      'GPS Device Model',
      'Hardware IMEI',
      'M2M SIM',
      'Satellites Locked',
      'Live Speed (km/h)',
      'Latitude',
      'Longitude',
      'O2 Level (%)',
    ];

    const rows = filteredAmbulances.map((a) => [
      a.id,
      a.regNumber,
      `"${a.ambulanceType}"`,
      `"${a.baseHospital}"`,
      a.emergencyStatus,
      a.sirenActive ? 'YES' : 'NO',
      `"${a.driverName}"`,
      a.driverPhone,
      `"${a.paramedicName}"`,
      `"${a.gpsDevice.model}"`,
      a.gpsDevice.imei,
      a.gpsDevice.simNumber,
      a.gpsDevice.satellitesLocked,
      a.currentLocation.speed || 0,
      a.currentLocation.lat.toFixed(6),
      a.currentLocation.lng.toFixed(6),
      a.oxygenLevelPercent,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ambulance_GPS_Fleet_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Ambulances</span>
            <div className="text-2xl font-black text-white mt-1">{ambulances.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400 font-bold text-lg">
            🚑
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-400">Sirens Blazing</span>
            <div className="text-2xl font-black text-rose-300 mt-1 flex items-center gap-2">
              <span>{activeSirenCount}</span>
              {activeSirenCount > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-400">Active Dispatches</span>
            <div className="text-2xl font-black text-amber-300 mt-1">{dispatchedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-400">GPS Devices Online</span>
            <div className="text-2xl font-black text-teal-300 mt-1">
              {ambulances.filter((a) => a.gpsDevice.isOnline).length} / {ambulances.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-600/50 flex items-center justify-center text-teal-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <span className="text-xs font-semibold text-emerald-400">Hospital ER Bays</span>
            <div className="text-2xl font-black text-emerald-300 mt-1">{hospitals.length} Bases</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 font-bold text-lg">
            🏥
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'fleet'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Ambulance Fleet & Dispatcher ({ambulances.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('terminal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'terminal'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Hardware GPS Terminal & Telemetry Simulator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'register'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Ambulance & Onboard GPS</span>
          </button>
        </div>

        {activeSubTab === 'fleet' && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fleet CSV</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: Fleet Registry & Dispatcher */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ambulance, plate, IMEI, hospital..."
                className="bg-transparent text-white focus:outline-hidden w-full font-medium"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-hidden"
            >
              <option value="ALL">All Mission Statuses</option>
              <option value="STANDBY">Standby / Available</option>
              <option value="DISPATCHED">Dispatched to Incident</option>
              <option value="EN_ROUTE_PATIENT">En Route to Patient</option>
              <option value="PATIENT_ONBOARD">Patient Onboard (Emergency)</option>
              <option value="ARRIVED_HOSPITAL">At Hospital Casualty</option>
              <option value="RETURNING_TO_BASE">Returning to Base</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-hidden"
            >
              <option value="ALL">All Ambulance Types</option>
              <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
              <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
              <option value="Cardiac Mobile ICU">Cardiac Mobile ICU</option>
              <option value="Patient Transport (PTS)">Patient Transport (PTS)</option>
              <option value="Neonatal Emergency Care">Neonatal Emergency Care</option>
            </select>

            {/* Siren Toggle Filter */}
            <button
              onClick={() => {
                setSirenOnly(!sirenOnly);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                sirenOnly
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Sirens Active Only</span>
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ambulance</th>
                    <th className="py-3 px-4">Type & Base</th>
                    <th className="py-3 px-4">Mission Status</th>
                    <th className="py-3 px-4">Siren Beacon</th>
                    <th className="py-3 px-4">GPS Hardware Device</th>
                    <th className="py-3 px-4">Telemetry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paginatedAmbulances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                        No ambulances found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedAmbulances.map((amb) => (
                      <tr key={amb.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800 flex items-center justify-center font-bold text-sm">
                              🚑
                            </div>
                            <div>
                              <div className="font-extrabold text-white">{amb.id}</div>
                              <div className="text-[11px] font-mono text-slate-400">{amb.regNumber}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{amb.ambulanceType}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{amb.baseHospital}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {amb.emergencyStatus === 'DISPATCHED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              DISPATCHED
                            </span>
                          )}
                          {amb.emergencyStatus === 'PATIENT_ONBOARD' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse">
                              PATIENT ONBOARD
                            </span>
                          )}
                          {amb.emergencyStatus === 'STANDBY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              STANDBY / AVAIL
                            </span>
                          )}
                          {amb.emergencyStatus === 'ARRIVED_HOSPITAL' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              AT ER CASUALTY
                            </span>
                          )}
                          {amb.emergencyStatus === 'RETURNING_TO_BASE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              RETURNING
                            </span>
                          )}
                          {amb.emergencyStatus === 'MAINTENANCE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                              MAINTENANCE
                            </span>
                          )}

                          {amb.assignedIncident && (
                            <div className="text-[10px] text-rose-300 font-semibold mt-1">
                              {amb.assignedIncident.priority} • ETA {amb.assignedIncident.etaMinutes}m
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => onToggleSiren(amb.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                              amb.sirenActive
                                ? 'bg-rose-600 text-white shadow-md animate-pulse'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                            }`}
                          >
                            {amb.sirenActive ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>SIREN ON</span>
                              </>
                            ) : (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Muted</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-200 font-semibold">{amb.gpsDevice.imei}</div>
                          <div className="text-[10px] text-teal-400 font-medium">
                            {amb.gpsDevice.model} ({amb.gpsDevice.protocol})
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white">
                            {amb.currentLocation.speed || 0} km/h
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {amb.gpsDevice.satellitesLocked} Sats • {amb.oxygenLevelPercent}% O2
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {amb.emergencyStatus === 'STANDBY' && (
                              <button
                                onClick={() => onOpenDispatch(amb)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 text-[11px] font-bold transition flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>Dispatch</span>
                              </button>
                            )}

                            <button
                              onClick={() => onSelectAmbulanceOnMap(amb)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Track</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredAmbulances.length)} of {filteredAmbulances.length}{' '}
                ambulances
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono font-bold text-white">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Hardware GPS Device Terminal & Protocol Simulator */}
      {activeSubTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Terminal Console Log */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">
                  AIS-140 GPS Telemetry Hardware Stream & Packet Inspector
                </h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                PORT 8088 LISTENING
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Live AIS-140 standard raw telemetry packet intake from vehicle tracking units (VTUs), panic buttons, and GPS OBD-II gateways.
            </p>

            {/* Terminal Window */}
            <div className="h-80 rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 text-slate-300">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-rose-400'
                        : 'text-sky-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
            </div>

            {/* AIS-140 Protocol Reference */}
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">AIS-140 Standard Packet Schema:</span>
              <p className="font-mono text-teal-400 text-[10px] break-all">
                $$&lt;VendorID&gt;,&lt;FirmwareVer&gt;,&lt;PacketType&gt;,&lt;AlertID&gt;,&lt;IMEI&gt;,&lt;RegNo&gt;,&lt;GPSFix&gt;,&lt;Date&gt;,&lt;Time&gt;,&lt;Lat&gt;,&lt;Lng&gt;,&lt;Speed&gt;,&lt;Heading&gt;,&lt;Sats&gt;,&lt;Ignition&gt;,&lt;EmergencyState&gt;*&lt;Checksum&gt;
              </p>
            </div>
          </div>

          {/* Right: Interactive Hardware GPS Device Simulator */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Hardware GPS Device Transmitter</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">TESTBENCH</span>
            </div>

            <p className="text-xs text-slate-400">
              Simulate real-time GPS telemetry packets directly from on-board hardware to verify open source map and dispatch response.
            </p>

            <div className="space-y-3.5">
              {/* Select Target Ambulance */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Emergency Ambulance
                </label>
                <select
                  value={selectedSimAmbulanceId}
                  onChange={(e) => setSelectedSimAmbulanceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                >
                  {ambulances.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} - {a.regNumber} ({a.ambulanceType}) [IMEI: {a.gpsDevice.imei}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Simulated Speed:</span>
                  <span className="font-mono font-bold text-rose-400">{simSpeed} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              {/* Heading Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>GPS Bearing / Heading:</span>
                  <span className="font-mono font-bold text-teal-400">{simHeading}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={simHeading}
                  onChange={(e) => setSimHeading(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              {/* Satellites Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>GNSS Satellites Locked:</span>
                  <span className="font-mono font-bold text-emerald-400">{simSatellites} Satellites</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={simSatellites}
                  onChange={(e) => setSimSatellites(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Checkboxes: Siren & Ignition */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simSiren}
                    onChange={(e) => setSimSiren(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span className="font-semibold text-rose-300">Siren Sensor ON</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIgnition}
                    onChange={(e) => setSimIgnition(e.target.checked)}
                    className="accent-teal-500"
                  />
                  <span className="font-semibold text-teal-300">Vehicle Ignition ON</span>
                </label>
              </div>

              {/* Mission State Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Device Emergency State
                </label>
                <select
                  value={simStatus}
                  onChange={(e) => setSimStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                >
                  <option value="STANDBY">Standby / Available</option>
                  <option value="DISPATCHED">Dispatched to Incident</option>
                  <option value="EN_ROUTE_PATIENT">En Route to Patient</option>
                  <option value="PATIENT_ONBOARD">Patient Onboard</option>
                  <option value="ARRIVED_HOSPITAL">Arrived at Hospital ER</option>
                  <option value="RETURNING_TO_BASE">Returning to Base</option>
                </select>
              </div>

              {/* Transmit Button */}
              <button
                onClick={handleTransmitSimPacket}
                disabled={isTransmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isTransmitting ? 'Transmitting Over Cellular...' : 'Transmit AIS-140 Packet to Server'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Register Ambulance & Onboard GPS Device */}
      {activeSubTab === 'register' && (
        <div className="max-w-2xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span>Register Emergency Ambulance & Onboard Hardware GPS Tracker</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a new vehicle to the municipal emergency fleet and pair it with an AIS-140 / Teltonika / GT06 telematics tracker.
            </p>
          </div>

          {regSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs space-y-1">
              <div className="font-bold text-white flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ambulance Registered Successfully!</span>
              </div>
              <p>
                Vehicle ID <strong>{regSuccess.id}</strong> ({regSuccess.regNumber}) with GPS IMEI{' '}
                <strong>{regSuccess.gpsDevice.imei}</strong> is now live on the OpenStreetMap command center.
              </p>
            </div>
          )}

          {regError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Row 1: Reg Number & Custom ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle Plate / Reg Number *
                </label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KA-01-EA-1025"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ambulance ID
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Row 2: Ambulance Type & Base Hospital */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ambulance Category
                </label>
                <select
                  value={ambulanceType}
                  onChange={(e) => setAmbulanceType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                >
                  <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                  <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                  <option value="Cardiac Mobile ICU">Cardiac Mobile ICU</option>
                  <option value="Patient Transport (PTS)">Patient Transport (PTS)</option>
                  <option value="Neonatal Emergency Care">Neonatal Emergency Care</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Base Emergency Hospital
                </label>
                <select
                  value={baseHospital}
                  onChange={(e) => setBaseHospital(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Driver & Paramedic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Anand Gowda"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Driver Phone Number *
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 9845012345"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned EMT / Paramedic Name *
                </label>
                <input
                  type="text"
                  value={paramedicName}
                  onChange={(e) => setParamedicName(e.target.value)}
                  placeholder="e.g. Paramedic Karthik M."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paramedic Phone *
                </label>
                <input
                  type="text"
                  value={paramedicPhone}
                  onChange={(e) => setParamedicPhone(e.target.value)}
                  placeholder="+91 9900012345"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Row 4: Hardware GPS Tracker Specifications */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                <span>On-Board Hardware GPS Tracker Configuration</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Device Model
                  </label>
                  <select
                    value={gpsModel}
                    onChange={(e) => setGpsModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  >
                    <option value="Teltonika FMB920 AIS-140">Teltonika FMB920 (AIS-140)</option>
                    <option value="Concox GT06N Emergency Tracker">Concox GT06N</option>
                    <option value="Queclink GV300 CAN/OBD">Queclink GV300 CAN/OBD</option>
                    <option value="MapmyIndia Navic AIS-140 VTU">MapmyIndia Navic AIS-140 VTU</option>
                    <option value="Mobile Phone MDT Gateway">Mobile Phone MDT Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Telemetry Protocol
                  </label>
                  <select
                    value={gpsProtocol}
                    onChange={(e) => setGpsProtocol(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                  >
                    <option value="AIS-140">AIS-140 (Standard Government Mandated)</option>
                    <option value="GT06 / JT808">GT06 / JT808 Binary</option>
                    <option value="HTTP JSON Telematics">HTTP JSON Telematics</option>
                    <option value="NMEA 0183">NMEA 0183 Sentences</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Hardware IMEI Number (15 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gpsImei}
                    onChange={(e) => setGpsImei(e.target.value)}
                    placeholder="864920048123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-medium focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    M2M eSIM / SIM Card Number
                  </label>
                  <input
                    type="text"
                    value={simNumber}
                    onChange={(e) => setSimNumber(e.target.value)}
                    placeholder="+91 9900088888"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-medium focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRegistering ? 'Registering Vehicle & Device...' : 'Complete Ambulance & GPS Registration'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
