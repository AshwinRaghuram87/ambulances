import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Smartphone,
  QrCode,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Phone,
  AlertTriangle,
  Battery,
  Building2,
  Volume2,
  Activity,
  HeartPulse,
} from 'lucide-react';
import type { Ambulance, AmbulanceStatus } from '../types.ts';

interface FleetTableProps {
  autos: Ambulance[];
  onSelectAutoOnMap: (auto: Ambulance) => void;
  onOpenQRModal: (auto: Ambulance) => void;
  onOpenMobileView: (autoId: string) => void;
}

export const FleetTable: React.FC<FleetTableProps> = ({
  autos,
  onSelectAutoOnMap,
  onOpenQRModal,
  onOpenMobileView,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filteredAmbulances = useMemo(() => {
    return autos.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && !a.vehicleType.toLowerCase().includes(typeFilter.toLowerCase())) return false;
      if (zoneFilter !== 'ALL' && a.zone !== zoneFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          a.id.toLowerCase().includes(q) ||
          a.regNumber.toLowerCase().includes(q) ||
          a.driverName.toLowerCase().includes(q) ||
          a.paramedicName.toLowerCase().includes(q) ||
          a.ward.toLowerCase().includes(q) ||
          a.targetHospital.toLowerCase().includes(q) ||
          a.vehicleType.toLowerCase().includes(q) ||
          a.driverPhone.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [autos, search, statusFilter, typeFilter, zoneFilter]);

  const totalPages = Math.ceil(filteredAmbulances.length / pageSize) || 1;
  const paginatedAmbulances = filteredAmbulances.slice((page - 1) * pageSize, page * pageSize);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Ambulance ID',
      'Reg Number',
      'Unit Type',
      'Lead Paramedic',
      'Driver Name',
      'Driver Phone',
      'Sector / Ward',
      'Zone',
      'Target Hospital',
      'Status',
      'Patient Triage',
      'Latitude',
      'Longitude',
      'Speed km/h',
      'Medical O2 %',
      'Battery %',
      'Code 3 Siren Active',
      'Mobile Phone Connected',
    ];

    const rows = filteredAmbulances.map((a) => [
      a.id,
      a.regNumber,
      `"${a.vehicleType}"`,
      `"${a.paramedicName}"`,
      `"${a.driverName}"`,
      `"${a.driverPhone}"`,
      `"${a.ward}"`,
      a.zone,
      `"${a.targetHospital}"`,
      a.status,
      a.patientTriage,
      a.currentLocation.lat.toFixed(6),
      a.currentLocation.lng.toFixed(6),
      a.currentLocation.speed || 0,
      a.oxygenLevel,
      a.batteryLevel,
      a.sirenActive ? 'YES' : 'NO',
      a.isPhoneConnected ? 'YES' : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ambulance_fleet_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusPill = (status: AmbulanceStatus, sosActive?: boolean, code3?: boolean) => {
    if (sosActive) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          🚨 SOS Alert
        </span>
      );
    }
    switch (status) {
      case 'RESPONDING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
            🚨 Code 3 Responding
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            🩺 On Scene
          </span>
        );
      case 'EN_ROUTE_HOSPITAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            🏥 En Route Hospital
          </span>
        );
      case 'AT_HOSPITAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            🏥 At Hospital ER
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            🟢 Available
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            Depot Maintenance
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs w-full sm:w-64">
            <Search className="w-4 h-4 text-red-400 shrink-0" />
            <input
              type="text"
              placeholder="Search ID, Paramedic, Hospital..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white placeholder:text-slate-500 focus:outline-hidden w-full"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Statuses ({autos.length})</option>
            <option value="RESPONDING">🚨 Code 3 Responding</option>
            <option value="ON_SCENE">🩺 On Scene</option>
            <option value="EN_ROUTE_HOSPITAL">🏥 En Route Hospital</option>
            <option value="AT_HOSPITAL">🏥 At Hospital ER</option>
            <option value="AVAILABLE">🟢 Available</option>
            <option value="MAINTENANCE">⚠️ Maintenance / SOS</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by unit type"
            className="px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Unit Types</option>
            <option value="ALS">ALS (Advanced Life Support)</option>
            <option value="BLS">BLS (Basic Life Support)</option>
            <option value="Cardiac">Cardiac ICU</option>
            <option value="Neonatal">Neonatal Intensive Care</option>
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by zone"
            className="px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Sectors & Zones</option>
            <option value="Central">Central Zone</option>
            <option value="North">North Zone</option>
            <option value="South">South Zone</option>
            <option value="East">East Zone</option>
            <option value="West">West Zone</option>
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredAmbulances.length}</strong> of{' '}
            <strong className="text-white">{autos.length}</strong> Ambulances
          </span>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-red-400" />
            <span>Export Fleet CSV</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Ambulance ID & Plate</th>
                <th className="px-4 py-3">Paramedic & Driver</th>
                <th className="px-4 py-3">Destination Hospital</th>
                <th className="px-4 py-3">Status & Speed</th>
                <th className="px-4 py-3">O2 & Vitals</th>
                <th className="px-4 py-3">Paramedic GPS</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedAmbulances.map((amb) => (
                <tr key={amb.id} className="hover:bg-slate-850/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-mono font-extrabold text-white text-sm flex items-center gap-1">
                        <span>🚑</span>
                        <span>{amb.id}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                        {amb.regNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-red-400 font-medium mt-0.5">
                      {amb.vehicleType}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span className="text-teal-400">🩺</span>
                      <span>{amb.paramedicName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <span>Driver: {amb.driverName}</span>
                      <span>•</span>
                      <a href={`tel:${amb.driverPhone}`} className="text-teal-400 hover:underline">{amb.driverPhone}</a>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{amb.targetHospital}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {amb.ward} ({amb.zone})
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusPill(amb.status, amb.sosActive, amb.code3Active || amb.sirenActive)}
                      <span className="font-mono text-slate-300 font-bold text-[11px]">
                        {amb.currentLocation.speed || 0} km/h
                      </span>
                    </div>
                    {amb.sirenActive && (
                      <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-0.5">
                        <Volume2 className="w-3 h-3 animate-pulse" />
                        <span>Siren & Strobe Active</span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${amb.oxygenLevel}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-300">
                        {amb.oxygenLevel}% O2
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Triage: <strong className={amb.patientTriage === 'CRITICAL' ? 'text-red-400' : 'text-slate-300'}>{amb.patientTriage}</strong> • Bat: {amb.batteryLevel}%
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {amb.isPhoneConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-950 text-teal-300 border border-teal-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                        Live GPS
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Auto Sim</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectAutoOnMap(amb)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-red-400 border border-slate-700 transition"
                        title="Locate Ambulance on Map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenQRModal(amb)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Crew Phone Pairing QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenMobileView(amb.id)}
                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition"
                        title="Open Paramedic Mobile Terminal"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
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
            <strong className="text-white">{totalPages}</strong> ({filteredAmbulances.length} ambulances)
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
