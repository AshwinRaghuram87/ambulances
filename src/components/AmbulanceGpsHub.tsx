import React, { useState } from 'react';
import {
  Activity,
  Radio,
  Navigation,
  Phone,
  ShieldAlert,
  Volume2,
  VolumeX,
  Hospital,
  Cpu,
  Send,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Battery,
  Gauge,
  Compass,
  FileText,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type {
  Ambulance,
  EmergencyHospital,
  RegisterAmbulancePayload,
  GPSPacketPayload,
  AmbulanceType,
  EmergencyStatus,
  GPSProtocol,
} from '../types.ts';

interface AmbulanceGpsHubProps {
  ambulances: Ambulance[];
  hospitals: EmergencyHospital[];
  onSelectAmbulanceOnMap: (ambulance: Ambulance) => void;
  onToggleSiren: (ambulanceId: string) => Promise<any>;
  onUpdateStatus: (ambulanceId: string, status: EmergencyStatus, sirenActive?: boolean) => Promise<any>;
  onRegisterAmbulance: (payload: RegisterAmbulancePayload) => Promise<Ambulance>;
  onSendGpsPacket: (payload: GPSPacketPayload) => Promise<any>;
}

export const AmbulanceGpsHub: React.FC<AmbulanceGpsHubProps> = ({
  ambulances,
  hospitals,
  onSelectAmbulanceOnMap,
  onToggleSiren,
  onUpdateStatus,
  onRegisterAmbulance,
  onSendGpsPacket,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'gps-terminal' | 'register' | 'hospitals'>('fleet');

  // Search & Filter in Fleet view
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');

  // GPS Simulator Form State
  const [simAmbulanceId, setSimAmbulanceId] = useState<string>(ambulances[0]?.id || 'AMB-101');
  const [simLat, setSimLat] = useState<number>(ambulances[0]?.currentLocation.lat || 12.9632);
  const [simLng, setSimLng] = useState<number>(ambulances[0]?.currentLocation.lng || 77.5752);
  const [simSpeed, setSimSpeed] = useState<number>(55);
  const [simHeading, setSimHeading] = useState<number>(140);
  const [simSatellites, setSimSatellites] = useState<number>(15);
  const [simSiren, setSimSiren] = useState<boolean>(true);
  const [simIgnition, setSimIgnition] = useState<boolean>(true);
  const [simStatus, setSimStatus] = useState<EmergencyStatus>('DISPATCHED');
  const [simPacketLog, setSimPacketLog] = useState<string[]>([]);
  const [isSendingPacket, setIsSendingPacket] = useState(false);
  const [packetFeedback, setPacketFeedback] = useState<string | null>(null);

  // Registration Form State
  const nextAmbulanceNum = ambulances.length + 1;
  const [regForm, setRegForm] = useState<RegisterAmbulancePayload>({
    customId: `AMB-${String(100 + nextAmbulanceNum)}`,
    regNumber: `KA-01-EA-${String(1000 + nextAmbulanceNum)}`,
    ambulanceType: 'Advanced Life Support (ALS)',
    baseHospital: hospitals[0]?.name || 'Victoria Hospital Level-1 Trauma & Emergency Care',
    driverName: '',
    driverPhone: '',
    paramedicName: '',
    paramedicPhone: '',
    gpsModel: 'Teltonika FMB920 AIS-140 Certified',
    gpsImei: `864920048${String(100000 + nextAmbulanceNum * 311).padStart(6, '0')}`,
    gpsProtocol: 'AIS-140',
    simNumber: `+91 99000${String(10000 + nextAmbulanceNum * 23)}`,
    reportingIntervalSec: 3,
    notes: '',
  });

  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regSuccess, setRegSuccess] = useState<Ambulance | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [copiedImei, setCopiedImei] = useState<string | null>(null);

  // Sync simulator fields when chosen ambulance changes
  const handleSelectSimAmbulance = (ambId: string) => {
    setSimAmbulanceId(ambId);
    const amb = ambulances.find((a) => a.id === ambId);
    if (amb) {
      setSimLat(amb.currentLocation.lat);
      setSimLng(amb.currentLocation.lng);
      setSimSpeed(amb.currentLocation.speed || 45);
      setSimHeading(amb.currentLocation.heading || 90);
      setSimSiren(amb.sirenActive);
      setSimStatus(amb.emergencyStatus);
    }
  };

  // Filtered ambulances
  const filteredAmbulances = ambulances.filter((a) => {
    if (typeFilter !== 'ALL' && a.ambulanceType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && a.emergencyStatus !== statusFilter) return false;
    if (hospitalFilter !== 'ALL' && a.baseHospital !== hospitalFilter) return false;
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

  // Transmit simulated GPS packet
  const handleSendSimulatorPacket = async () => {
    try {
      setIsSendingPacket(true);
      const chosenAmb = ambulances.find((a) => a.id === simAmbulanceId);
      const imei = chosenAmb?.gpsDevice.imei || '864920048100101';

      const payload: GPSPacketPayload = {
        imei,
        ambulanceId: simAmbulanceId,
        lat: Number(simLat),
        lng: Number(simLng),
        speed: Number(simSpeed),
        heading: Number(simHeading),
        satellites: Number(simSatellites),
        hdop: 0.7,
        ignition: simIgnition,
        siren: simSiren,
        emergencyStatus: simStatus,
        batteryBackup: 98,
      };

      const result = await onSendGpsPacket(payload);
      const timestampStr = new Date().toLocaleTimeString();
      const logEntry = `[${timestampStr}] ACK: Sent GPS Packet for ${simAmbulanceId} (IMEI ${imei}) -> Lat: ${simLat.toFixed(5)}, Lng: ${simLng.toFixed(5)}, Speed: ${simSpeed}km/h, Siren: ${simSiren ? 'ON' : 'OFF'}`;
      
      setSimPacketLog((prev) => [logEntry, ...prev.slice(0, 15)]);
      setPacketFeedback('GPS packet acknowledged by telemetry server!');
      setTimeout(() => setPacketFeedback(null), 3000);
    } catch (err: any) {
      setPacketFeedback(`Error: ${err.message}`);
    } finally {
      setIsSendingPacket(false);
    }
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    try {
      setIsSubmittingReg(true);
      const newAmb = await onRegisterAmbulance(regForm);
      setRegSuccess(newAmb);
    } catch (err: any) {
      setRegError(err.message || 'Failed to register ambulance');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedImei(id);
    setTimeout(() => setCopiedImei(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* Top Banner & Quick Metric Badges */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-800/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-3xl shadow-xl shadow-rose-900/50 shrink-0">
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Emergency Ambulance Fleet & Hardware GPS Hub
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  AIS-140 Telematics
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Real-time tracking of municipal and hospital emergency ambulances with dedicated hardware GPS tracker devices, emergency siren management, and hospital trauma center integration.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-850/90 border border-slate-700/80 shadow-md flex items-center gap-2.5">
              <span className="text-rose-400 font-bold text-lg font-mono">{ambulances.length}</span>
              <span className="text-xs text-slate-400">Total Ambulances</span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-rose-950/60 border border-rose-800/60 shadow-md flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-rose-300 font-bold text-lg font-mono">
                {ambulances.filter((a) => a.sirenActive).length}
              </span>
              <span className="text-xs text-rose-300 font-semibold">Sirens Active</span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-teal-950/60 border border-teal-800/60 shadow-md flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span className="text-teal-300 font-bold text-lg font-mono">{ambulances.length}</span>
              <span className="text-xs text-teal-300">GPS Devices Online</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'fleet'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Ambulances ({ambulances.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('gps-terminal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'gps-terminal'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-teal-300" />
            <span>Hardware GPS Terminal & Simulator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'register'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Ambulance & GPS Device</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hospitals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'hospitals'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Hospital className="w-4 h-4 text-rose-300" />
            <span>Emergency Hospitals ({hospitals.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE AMBULANCE FLEET GRID */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-2 rounded-xl bg-slate-850 border border-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, plate, IMEI, paramedic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-white text-xs placeholder:text-slate-500 focus:outline-hidden w-full font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by emergency status"
                className="bg-slate-850 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-hidden font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="PATIENT_ONBOARD">Patient Onboard</option>
                <option value="STANDBY">Standby at Base</option>
                <option value="ARRIVED_HOSPITAL">At Hospital</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by ambulance type"
                className="bg-slate-850 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-hidden font-medium"
              >
                <option value="ALL">All Ambulance Types</option>
                <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                <option value="Cardiac Mobile ICU">Cardiac Mobile ICU</option>
                <option value="Patient Transport (PTS)">Patient Transport (PTS)</option>
                <option value="Neonatal Emergency Care">Neonatal Emergency Care</option>
              </select>
            </div>
          </div>

          {/* Ambulance Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAmbulances.map((amb) => {
              const isSiren = amb.sirenActive;
              return (
                <div
                  key={amb.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isSiren
                      ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-500 shadow-xl shadow-rose-950/40 ring-1 ring-rose-500/50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md ${
                        isSiren ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-rose-400'
                      }`}>
                        🚑
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">{amb.id}</span>
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {amb.regNumber}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-rose-400 mt-0.5">
                          {amb.ambulanceType}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleSiren(amb.id)}
                      className={`p-2 rounded-xl text-xs transition flex items-center gap-1 font-bold ${
                        isSiren
                          ? 'bg-rose-600 text-white shadow-lg animate-pulse'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                      }`}
                      title={isSiren ? 'Turn Siren Off' : 'Activate Emergency Siren'}
                    >
                      {isSiren ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="py-3 space-y-2.5 text-xs">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        isSiren
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : amb.emergencyStatus === 'DISPATCHED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : amb.emergencyStatus === 'PATIENT_ONBOARD'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {amb.emergencyStatus}
                      </span>
                    </div>

                    {/* Live GPS Telemetry */}
                    <div className="p-2.5 rounded-xl bg-slate-850/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-teal-400" />
                          <span>GPS Tracker:</span>
                        </span>
                        <div className="flex items-center gap-1 font-mono text-teal-300 font-bold">
                          <span>{amb.gpsDevice.imei.slice(0, 10)}...</span>
                          <button
                            onClick={() => copyToClipboard(amb.gpsDevice.imei, amb.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedImei === amb.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono">
                        <div className="p-1 rounded bg-slate-900 text-[10px]">
                          <div className="text-slate-400">Speed</div>
                          <div className="font-bold text-white text-xs">{amb.currentLocation.speed || 0} km/h</div>
                        </div>
                        <div className="p-1 rounded bg-slate-900 text-[10px]">
                          <div className="text-slate-400">Satellites</div>
                          <div className="font-bold text-amber-400 text-xs">{amb.gpsDevice.satellitesLocked}</div>
                        </div>
                        <div className="p-1 rounded bg-slate-900 text-[10px]">
                          <div className="text-slate-400">O2 Oxygen</div>
                          <div className="font-bold text-emerald-400 text-xs">{amb.oxygenLevelPercent}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Hospital & Crew */}
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Base:</span>
                        <span className="font-semibold text-white truncate max-w-[190px]">{amb.baseHospital}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Paramedic:</span>
                        <span className="font-medium text-slate-200">{amb.paramedicName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectAmbulanceOnMap(amb)}
                      className="w-full py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Track on Open Source Map</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: HARDWARE GPS TERMINAL & PACKET SIMULATOR */}
      {activeSubTab === 'gps-terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulator Form */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Hardware GPS Device Telemetry Injector</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800">
                AIS-140 / GT06 Gateway
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Directly simulate incoming hardware telemetry packets from onboard OBD-II / AIS-140 GPS trackers installed in emergency ambulances.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Ambulance</label>
                <select
                  value={simAmbulanceId}
                  onChange={(e) => handleSelectSimAmbulance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-medium focus:outline-hidden focus:border-teal-500 cursor-pointer"
                >
                  {ambulances.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} ({a.regNumber}) • {a.ambulanceType} • IMEI: {a.gpsDevice.imei}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Latitude (WGS84)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={simLat}
                    onChange={(e) => setSimLat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Longitude (WGS84)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={simLng}
                    onChange={(e) => setSimLng(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Speed (km/h)</label>
                  <input
                    type="number"
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Heading (0-360°)</label>
                  <input
                    type="number"
                    value={simHeading}
                    onChange={(e) => setSimHeading(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">GNSS Satellites</label>
                  <input
                    type="number"
                    value={simSatellites}
                    onChange={(e) => setSimSatellites(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Emergency Dispatch Status</label>
                  <select
                    value={simStatus}
                    onChange={(e) => setSimStatus(e.target.value as EmergencyStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-medium focus:outline-hidden"
                  >
                    <option value="STANDBY">Standby at Base</option>
                    <option value="DISPATCHED">Dispatched (En Route Scene)</option>
                    <option value="PATIENT_ONBOARD">Patient Onboard</option>
                    <option value="ARRIVED_HOSPITAL">Arrived Hospital</option>
                    <option value="RETURNING_TO_BASE">Returning to Base</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setSimSiren(!simSiren)}
                    className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      simSiren
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {simSiren ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Siren: {simSiren ? 'ACTIVE (Code Red)' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSendSimulatorPacket}
                  disabled={isSendingPacket}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-teal-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingPacket ? 'Transmitting Packet...' : 'Transmit Hardware GPS Packet to Server'}</span>
                </button>

                {packetFeedback && (
                  <div className={`mt-2 text-center font-medium ${
                    packetFeedback.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {packetFeedback}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Packet Log Console */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Live Telemetry Packet Stream (AIS-140 / JSON)</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Port 3000 • /api/gps/packet</span>
            </div>

            <div className="flex-1 bg-slate-950 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-[380px] space-y-2 border border-slate-850">
              {simPacketLog.length === 0 ? (
                <div className="text-slate-500 italic py-8 text-center">
                  Waiting for transmitted telemetry packets... Send a packet from the simulator to inspect live telemetry payload.
                </div>
              ) : (
                simPacketLog.map((log, index) => (
                  <div key={index} className="text-emerald-400 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>AIS-140 Standard Compliant Telematics</span>
              <span>Supported Protocols: AIS-140, GT06, JT808, NMEA 0183</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: REGISTER NEW AMBULANCE & GPS TRACKER */}
      {activeSubTab === 'register' && (
        <div className="max-w-3xl mx-auto p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Register Emergency Ambulance & Pair Hardware GPS</h2>
              <p className="text-xs text-slate-400">
                Enroll a new emergency medical vehicle, assign hospital affiliation, and pair its onboard AIS-140 GPS tracker.
              </p>
            </div>
          </div>

          {regSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-black text-white">Ambulance {regSuccess.id} Registered Successfully!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Vehicle registration <strong>{regSuccess.regNumber}</strong> with Hardware GPS IMEI <strong>{regSuccess.gpsDevice.imei}</strong> is now live in the municipal command center.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setRegSuccess(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Register Another Ambulance
                </button>
                <button
                  onClick={() => onSelectAmbulanceOnMap(regSuccess)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
                >
                  View on Open Source Map
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-300 font-medium">
                  {regError}
                </div>
              )}

              {/* Section 1: Vehicle Details */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-rose-400 tracking-wider">
                  1. Ambulance Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Ambulance ID *</label>
                    <input
                      type="text"
                      required
                      value={regForm.customId}
                      onChange={(e) => setRegForm({ ...regForm, customId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Plate / Reg Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="KA-04-EM-1109"
                      value={regForm.regNumber}
                      onChange={(e) => setRegForm({ ...regForm, regNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Ambulance Type *</label>
                    <select
                      value={regForm.ambulanceType}
                      onChange={(e) => setRegForm({ ...regForm, ambulanceType: e.target.value as AmbulanceType })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white"
                    >
                      <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                      <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                      <option value="Cardiac Mobile ICU">Cardiac Mobile ICU</option>
                      <option value="Patient Transport (PTS)">Patient Transport (PTS)</option>
                      <option value="Neonatal Emergency Care">Neonatal Emergency Care</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Hospital & Crew */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-black uppercase text-rose-400 tracking-wider">
                  2. Hospital Base & Medical Personnel
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Affiliated Emergency Hospital *</label>
                  <select
                    value={regForm.baseHospital}
                    onChange={(e) => setRegForm({ ...regForm, baseHospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-medium"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({h.availableEmergencyBeds} ER Beds Available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Emergency Driver Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Kishan Lal"
                      value={regForm.driverName}
                      onChange={(e) => setRegForm({ ...regForm, driverName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Driver Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9845012345"
                      value={regForm.driverPhone}
                      onChange={(e) => setRegForm({ ...regForm, driverPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Lead Paramedic / EMT Officer</label>
                    <input
                      type="text"
                      placeholder="Dr. EMT Lead Officer"
                      value={regForm.paramedicName}
                      onChange={(e) => setRegForm({ ...regForm, paramedicName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Paramedic Mobile Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 9844012345"
                      value={regForm.paramedicPhone}
                      onChange={(e) => setRegForm({ ...regForm, paramedicPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Hardware GPS Tracker Pairing */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-black uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>3. Hardware GPS Tracker Device Pairing (AIS-140)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">15-Digit Hardware IMEI Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="864920048123456"
                      value={regForm.gpsImei}
                      onChange={(e) => setRegForm({ ...regForm, gpsImei: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-teal-300 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Tracker Hardware Model</label>
                    <input
                      type="text"
                      value={regForm.gpsModel}
                      onChange={(e) => setRegForm({ ...regForm, gpsModel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">SIM Card Number (M2M Cellular)</label>
                    <input
                      type="text"
                      placeholder="+91 9900012345"
                      value={regForm.simNumber}
                      onChange={(e) => setRegForm({ ...regForm, simNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Telematics Protocol</label>
                    <select
                      value={regForm.gpsProtocol}
                      onChange={(e) => setRegForm({ ...regForm, gpsProtocol: e.target.value as GPSProtocol })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono"
                    >
                      <option value="AIS-140">AIS-140 Standard (National Transport Spec)</option>
                      <option value="GT06 / JT808">GT06 / JT808 Protocol</option>
                      <option value="HTTP JSON Telematics">HTTP JSON Telematics Gateway</option>
                      <option value="NMEA 0183">NMEA 0183 GPS Standard</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-xl shadow-rose-950/50 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isSubmittingReg ? 'Enrolling...' : 'Register Ambulance & Activate GPS Device'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* VIEW 4: EMERGENCY HOSPITALS & TRAUMA CENTRES */}
      {activeSubTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((hosp) => {
            const incomingAmbs = ambulances.filter(
              (a) =>
                a.assignedIncident?.targetHospital === hosp.name ||
                (a.emergencyStatus === 'PATIENT_ONBOARD' && a.baseHospital === hosp.name)
            );

            return (
              <div
                key={hosp.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl shrink-0">
                      🏥
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-snug">{hosp.name}</h3>
                      <span className="text-[11px] text-rose-400 font-semibold">{hosp.type}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400">{hosp.address}</p>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
                  <div className="p-2 rounded-xl bg-slate-850 border border-slate-750">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">ER Beds</div>
                    <div className="text-base font-black text-emerald-400 mt-0.5">{hosp.availableEmergencyBeds}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-850 border border-slate-750">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">ICU Beds</div>
                    <div className="text-base font-black text-rose-400 mt-0.5">{hosp.icuBedsAvailable}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-850 border border-slate-750">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Ambulance Bays</div>
                    <div className="text-base font-black text-sky-400 mt-0.5">{hosp.ambulanceBays}</div>
                  </div>
                </div>

                {/* Incoming Ambulances */}
                {incomingAmbs.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs space-y-1">
                    <div className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{incomingAmbs.length} Incoming Emergency Runs</span>
                    </div>
                    {incomingAmbs.map((amb) => (
                      <div key={amb.id} className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>{amb.id} ({amb.ambulanceType})</span>
                        <span className="text-amber-400 font-mono font-bold">
                          ETA ~{amb.assignedIncident?.etaMinutes || 4} mins
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Emergency Desk:</span>
                  <a href={`tel:${hosp.phone}`} className="font-mono text-teal-400 font-bold hover:underline">
                    {hosp.phone}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
