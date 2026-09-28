import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Radio,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Phone,
  AlertTriangle,
  Battery,
  ShieldAlert,
  Volume2,
  VolumeX,
  Satellite,
  Power,
  Cpu,
  Hospital,
} from 'lucide-react';
import type { Ambulance, EmergencyStatus } from '../types.ts';

interface AmbulanceFleetTableProps {
  ambulances: Ambulance[];
  onSelectAmbulanceOnMap: (ambulance: Ambulance) => void;
  onOpenAmbulanceDrawer: (ambulance: Ambulance) => void;
  onOpenGpsTerminal: (ambulanceId: string) => void;
}

export const AmbulanceFleetTable: React.FC<AmbulanceFleetTableProps> = ({
  ambulances,
  onSelectAmbulanceOnMap,
  onOpenAmbulanceDrawer,
  onOpenGpsTerminal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredAmbulances = useMemo(() => {
    return ambulances.filter((a) => {
      if (statusFilter !== 'ALL' && a.emergencyStatus !== statusFilter) return false;
      if (typeFilter !== 'ALL' && a.ambulanceType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          a.id.toLowerCase().includes(q) ||
          a.regNumber.toLowerCase().includes(q) ||
          a.baseHospital.toLowerCase().includes(q) ||
          a.driverName.toLowerCase().includes(q) ||
          a.paramedicName.toLowerCase().includes(q) ||
          a.gpsDevice.imei.includes(q) ||
          a.gpsDevice.model.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [ambulances, search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredAmbulances.length / pageSize) || 1;
  const paginatedAmbulances = filteredAmbulances.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCSV = () => {
    const headers = [
      'Ambulance ID',
      'Plate Number',
      'Ambulance Type',
      'Base Hospital',
      'Emergency Status',
      'Siren Active',
      'GPS Model',
      'GPS IMEI',
      'GPS Protocol',
      'Satellites Locked',
      'Ignition On',
      'Latitude',
      'Longitude',
      'Speed km/h',
      'Oxygen Level %',
      'Paramedic Name',
      'Driver Name',
    ];

    const rows = filteredAmbulances.map((a) => [
      a.id,
      a.regNumber,
      `"${a.ambulanceType}"`,
      `"${a.baseHospital}"`,
      a.emergencyStatus,
      a.sirenActive ? 'YES' : 'NO',
      `"${a.gpsDevice.model}"`,
      a.gpsDevice.imei,
      a.gpsDevice.protocol,
      a.gpsDevice.satellitesLocked,
      a.gpsDevice.ignitionOn ? 'ON' : 'OFF',
      a.currentLocation.lat.toFixed(6),
      a.currentLocation.lng.toFixed(6),
      a.currentLocation.speed || 0,
      a.oxygenLevelPercent,
      `"${a.paramedicName}"`,
      `"${a.driverName}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ambulance_fleet_gps_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: EmergencyStatus, siren: boolean) => {
    if (siren) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse flex items-center gap-1">
          <Volume2 className="w-3 h-3" />
          SIREN ON
        </span>
      );
    }
    switch (status) {
      case 'DISPATCHED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Dispatched
          </span>
        );
      case 'EN_ROUTE_PATIENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            En Route
          </span>
        );
      case 'PATIENT_ONBOARD':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-600/50">
            Patient Onboard
          </span>
        );
      case 'ARRIVED_HOSPITAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            At Trauma Hospital
          </span>
        );
      case 'RETURNING_TO_BASE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
            Returning
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Available / Standby
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search ID, IMEI, plate, hospital..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white placeholder:text-slate-500 focus:outline-hidden w-full font-medium"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter ambulances by status"
            className="px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Mission Statuses ({ambulances.length})</option>
            <option value="STANDBY">Standby / Available</option>
            <option value="DISPATCHED">Dispatched to Scene</option>
            <option value="EN_ROUTE_PATIENT">En Route to Patient</option>
            <option value="PATIENT_ONBOARD">Patient Onboard</option>
            <option value="ARRIVED_HOSPITAL">At Trauma Center</option>
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
            aria-label="Filter by ambulance type"
            className="px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Ambulance Types</option>
            <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
            <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
            <option value="Cardiac Mobile ICU">Cardiac Mobile ICU</option>
            <option value="Patient Transport (PTS)">Patient Transport (PTS)</option>
            <option value="Neonatal Emergency Care">Neonatal Emergency Care</option>
          </select>
        </div>

        {/* Right Actions: Counter & Export CSV */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredAmbulances.length}</strong> of{' '}
            <strong className="text-white">{ambulances.length}</strong> Ambulances
          </span>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Ambulance Table Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Ambulance & Plate</th>
                <th className="px-4 py-3">Base Hospital & Type</th>
                <th className="px-4 py-3">Hardware GPS Tracker (IMEI)</th>
                <th className="px-4 py-3">Telemetry Sensors</th>
                <th className="px-4 py-3">Mission Status & Speed</th>
                <th className="px-4 py-3">Crew Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedAmbulances.map((amb) => (
                <tr key={amb.id} className="hover:bg-slate-850/50 transition">
                  {/* Ambulance & Plate */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs">
                        🚑
                      </div>
                      <div>
                        <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{amb.id}</span>
                          {amb.sirenActive && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{amb.regNumber}</span>
                      </div>
                    </div>
                  </td>

                  {/* Base Hospital & Type */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Hospital className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{amb.baseHospital}</span>
                    </div>
                    <div className="text-[11px] text-rose-300 mt-0.5">{amb.ambulanceType}</div>
                  </td>

                  {/* Hardware GPS Tracker (IMEI) */}
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-teal-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      <span>{amb.gpsDevice.imei}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {amb.gpsDevice.model} • {amb.gpsDevice.protocol}
                    </div>
                  </td>

                  {/* Telemetry Sensors */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-sky-300">
                        <Satellite className="w-3 h-3" />
                        <span>{amb.gpsDevice.satellitesLocked} Sats</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span
                        className={`font-mono font-bold ${
                          amb.gpsDevice.ignitionOn ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {amb.gpsDevice.ignitionOn ? 'IGN ON' : 'IGN OFF'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      O₂: <strong>{amb.oxygenLevelPercent}%</strong> • Bat:{' '}
                      {amb.gpsDevice.internalBatteryBackup}%
                    </div>
                  </td>

                  {/* Mission Status & Speed */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(amb.emergencyStatus, amb.sirenActive)}
                      <span className="font-mono text-slate-300 text-xs">
                        {amb.currentLocation.speed || 0} km/h
                      </span>
                    </div>
                    {amb.assignedIncident && (
                      <div className="text-[10px] text-amber-300 font-semibold truncate max-w-[180px] mt-0.5">
                        ETA: ~{amb.assignedIncident.etaMinutes}m ({amb.assignedIncident.incidentType})
                      </div>
                    )}
                  </td>

                  {/* Crew Details */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{amb.paramedicName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>Pilot: {amb.driverName}</span>
                      <a
                        href={`tel:${amb.driverPhone}`}
                        className="text-teal-400 hover:text-white"
                        title="Call Driver"
                      >
                        <Phone className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectAmbulanceOnMap(amb)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700 transition"
                        title="Track Ambulance on Open Source Map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenAmbulanceDrawer(amb)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-rose-400 border border-slate-700 transition"
                        title="Open Hardware GPS Device Telemetry Inspector"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenGpsTerminal(amb.id)}
                        className="p-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 transition"
                        title="Launch GPS Telemetry Terminal & Packet Streamer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong> ({filteredAmbulances.length} total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
