import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Search,
  Filter,
  Navigation,
  Layers,
  Smartphone,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Cross,
  Activity,
  HeartPulse,
  Flame,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import type { Ambulance, HospitalFacility, AmbulanceStatus, ZoneName } from '../types.ts';
import { ambulanceSiren } from '../utils/sirenAudio.ts';

interface MapTrackerProps {
  autos: Ambulance[];
  facilities: HospitalFacility[];
  selectedAuto: Ambulance | null;
  onSelectAuto: (auto: Ambulance) => void;
  onOpenMobileView: (autoId: string) => void;
  onOpenQRModal: (auto: Ambulance) => void;
}

export const MapTracker: React.FC<MapTrackerProps> = ({
  autos,
  facilities,
  selectedAuto,
  onSelectAuto,
  onOpenMobileView,
  onOpenQRModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const hospitalMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [onlyCode3, setOnlyCode3] = useState(false);
  const [isSirenMuted, setIsSirenMuted] = useState(false);

  // Filtered ambulances
  const filteredAmbulances = useMemo(() => {
    return autos.filter((amb) => {
      if (onlyCode3 && !(amb.status === 'RESPONDING' || amb.status === 'EN_ROUTE_HOSPITAL' || amb.code3Active)) {
        return false;
      }
      if (statusFilter !== 'ALL' && amb.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && !amb.vehicleType.toLowerCase().includes(typeFilter.toLowerCase())) return false;
      if (zoneFilter !== 'ALL' && amb.zone !== zoneFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          amb.id.toLowerCase().includes(q) ||
          amb.regNumber.toLowerCase().includes(q) ||
          amb.driverName.toLowerCase().includes(q) ||
          amb.paramedicName.toLowerCase().includes(q) ||
          amb.ward.toLowerCase().includes(q) ||
          amb.targetHospital.toLowerCase().includes(q) ||
          amb.vehicleType.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [autos, searchTerm, statusFilter, typeFilter, zoneFilter, onlyCode3]);

  // Color & Badge for Ambulance Status
  const getAmbulanceTheme = (status: AmbulanceStatus, sosActive?: boolean, code3?: boolean) => {
    if (sosActive) return { bg: '#e11d48', label: 'SOS Alert', border: '#fda4af' };
    if (status === 'RESPONDING' || code3) return { bg: '#dc2626', label: 'Code 3 Responding', border: '#fca5a5' };
    if (status === 'EN_ROUTE_HOSPITAL') return { bg: '#7c3aed', label: 'En Route Hospital', border: '#d8b4fe' };
    if (status === 'ON_SCENE') return { bg: '#d97706', label: 'On Scene', border: '#fde68a' };
    if (status === 'AT_HOSPITAL') return { bg: '#0284c7', label: 'At Hospital ER', border: '#bae6fd' };
    if (status === 'AVAILABLE') return { bg: '#059669', label: 'Available', border: '#a7f3d0' };
    return { bg: '#475569', label: 'Depot / Standby', border: '#cbd5e1' };
  };

  // High-Visibility Ambulance Custom SVG Marker
  const createAmbulanceIcon = (amb: Ambulance, isSelected: boolean) => {
    const theme = getAmbulanceTheme(amb.status, amb.sosActive, amb.code3Active || amb.sirenActive);
    const heading = amb.currentLocation.heading || 0;
    const isEmergency = amb.status === 'RESPONDING' || amb.status === 'EN_ROUTE_HOSPITAL' || amb.code3Active;

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-125 ${
        isSelected ? 'scale-130 z-50' : 'z-20'
      }">
        ${
          isEmergency
            ? `
            <!-- Dual Red/Blue Flashing Strobe Beacon -->
            <span class="absolute -top-3 flex items-center justify-center gap-1 z-30">
              <span class="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping opacity-90"></span>
              <span class="w-3.5 h-3.5 rounded-full bg-blue-600 animate-ping opacity-90" style="animation-delay: 200ms;"></span>
            </span>
            <span class="absolute -inset-3 rounded-full bg-red-500/30 animate-pulse pointer-events-none"></span>
            `
            : ''
        }
        ${
          amb.isPhoneConnected
            ? '<span class="absolute -top-3.5 -right-2 z-30 flex h-4 w-4"><span class="relative inline-flex rounded-full h-4 w-4 bg-teal-500 border border-white text-[8px] font-bold text-white items-center justify-center shadow">📱</span></span>'
            : ''
        }

        <!-- Ambulance Body Container -->
        <div style="background-color: ${theme.bg}; border-color: ${isSelected ? '#facc15' : theme.border}; transform: rotate(${heading}deg); transition: transform 0.4s ease;"
             class="w-10 h-10 rounded-xl shadow-2xl flex flex-col items-center justify-center border-2 text-white relative">
          
          <!-- Emergency Roof Lights Graphic -->
          <div class="absolute -top-1 w-6 h-1.5 rounded-full flex overflow-hidden border border-slate-900">
            <div class="w-1/2 h-full bg-red-500 ${isEmergency ? 'animate-pulse' : ''}"></div>
            <div class="w-1/2 h-full bg-blue-500 ${isEmergency ? 'animate-pulse' : ''}"></div>
          </div>

          <!-- Ambulance Side Profile / Medical Cross SVG -->
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-sm">
            <!-- Van outline -->
            <path d="M10 17h4V5H2v12h3m9 0h2l3-3V9h-5v8z" stroke="white" fill="rgba(255,255,255,0.15)"/>
            <!-- Wheels -->
            <circle cx="7.5" cy="17.5" r="2.5" fill="#0f172a" stroke="white" stroke-width="1.5"/>
            <circle cx="17.5" cy="17.5" r="2.5" fill="#0f172a" stroke="white" stroke-width="1.5"/>
            <!-- Red/White Medical Cross inside ambulance body -->
            <path d="M6 9h4m-2-2v4" stroke="#ffffff" stroke-width="2.2"/>
          </svg>
        </div>

        <!-- Ambulance Call Tag (ID & Speed) -->
        <div class="absolute -bottom-4.5 px-1.5 py-0.2 rounded-md text-[9px] font-mono font-extrabold bg-slate-950/95 text-white border border-slate-700 whitespace-nowrap shadow-lg flex items-center gap-1">
          <span class="${isEmergency ? 'text-red-400 font-bold' : 'text-teal-400'}">🚑 ${amb.id}</span>
          ${amb.currentLocation.speed ? `<span class="text-slate-400 text-[8px]">${amb.currentLocation.speed}k</span>` : ''}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'ambulance-map-marker',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  };

  // Hospital Facility Custom Icon
  const createHospitalIcon = (facility: HospitalFacility) => {
    const html = `
      <div class="flex flex-col items-center cursor-pointer group z-10">
        <div class="w-9 h-9 rounded-2xl bg-rose-600 text-white border-2 border-white shadow-2xl flex items-center justify-center font-extrabold text-sm hover:scale-115 transition-transform">
          🏥
        </div>
        <div class="mt-1 px-2 py-0.5 rounded-md bg-slate-900/95 text-rose-300 text-[10px] font-bold whitespace-nowrap shadow-xl border border-rose-900/80 flex items-center gap-1">
          <span>${facility.name.split(' ')[0]} ER</span>
          <span class="px-1 rounded bg-rose-950 text-white text-[9px] font-mono">${facility.availableBeds} beds</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'hospital-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  };

  // Initialize Leaflet Map (100% Open Source - OpenStreetMap & CARTO Tiles)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Bangalore / Metro coordinates
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    });

    // Free Open-Source OpenStreetMap & CARTO Tiles (No API key needed!)
    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    });

    const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    });

    // Default to CARTO Voyager, add to map
    cartoVoyager.addTo(map);

    // Layer switcher control for open source maps
    L.control.layers({
      'OpenStreetMap Standard': osmStandard,
      'OpenStreetMap Clean (CARTO)': cartoVoyager,
      'OpenStreetMap Dark Mode': cartoDark,
    }, undefined, { position: 'topright' }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Hospital Facilities
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old hospital markers
    hospitalMarkersRef.current.forEach((m) => m.remove());
    hospitalMarkersRef.current = [];

    facilities.forEach((facility) => {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: createHospitalIcon(facility),
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-slate-900 p-2 font-sans min-w-[200px]">
          <div class="flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase">
            <span>🏥</span>
            <span>${facility.type}</span>
          </div>
          <div class="text-sm font-bold text-slate-900 mt-0.5">${facility.name}</div>
          <div class="mt-2 text-xs space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div class="flex justify-between">
              <span class="text-slate-500">Trauma Level:</span>
              <span class="font-bold text-slate-800">${facility.traumaLevel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Available ER Beds:</span>
              <span class="font-bold text-emerald-600">${facility.availableBeds} Ready</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Emergency Hot line:</span>
              <a href="tel:${facility.emergencyPhone}" class="font-mono font-bold text-rose-600 underline">${facility.emergencyPhone}</a>
            </div>
          </div>
        </div>
      `);

      hospitalMarkersRef.current.push(marker);
    });
  }, [facilities]);

  // Update or render Ambulance markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const visibleIds = new Set<string>();

    filteredAmbulances.forEach((amb) => {
      visibleIds.add(amb.id);
      const isSelected = selectedAuto?.id === amb.id;
      const { lat, lng } = amb.currentLocation;

      const existingMarker = markersRef.current.get(amb.id);
      if (existingMarker) {
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(createAmbulanceIcon(amb, isSelected));
      } else {
        const marker = L.marker([lat, lng], {
          icon: createAmbulanceIcon(amb, isSelected),
        }).addTo(map);

        marker.on('click', () => {
          onSelectAuto(amb);
        });

        markersRef.current.set(amb.id, marker);
      }
    });

    // Remove markers that are filtered out
    markersRef.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [filteredAmbulances, selectedAuto, onSelectAuto]);

  // Handle selected ambulance path polyline & centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (selectedAuto) {
      const latLngs = selectedAuto.locationHistory.map((p) => [p.lat, p.lng] as [number, number]);
      if (latLngs.length > 1) {
        polylineRef.current = L.polyline(latLngs, {
          color: selectedAuto.status === 'RESPONDING' ? '#ef4444' : '#0284c7',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 8',
        }).addTo(map);
      }

      // Pan to ambulance smoothly
      map.panTo([selectedAuto.currentLocation.lat, selectedAuto.currentLocation.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedAuto]);

  // Focus on Nearest Available Ambulance
  const handleFocusNearestAmbulance = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    
    // Find closest ambulance
    let closest: Ambulance | null = null;
    let minDist = Infinity;

    for (const amb of autos) {
      const dLat = amb.currentLocation.lat - center.lat;
      const dLng = amb.currentLocation.lng - center.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDist) {
        minDist = dist;
        closest = amb;
      }
    }

    if (closest) {
      const foundAmb: Ambulance = closest;
      onSelectAuto(foundAmb);
      mapInstanceRef.current.setView([foundAmb.currentLocation.lat, foundAmb.currentLocation.lng], 14, { animate: true });
    }
  };

  // Reset view to Metro Overview
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([12.9716, 77.5946], 12, { animate: true });
  };

  // Toggle Siren Audio
  const handleToggleSirenAudio = () => {
    const playing = ambulanceSiren.toggle();
    setIsSirenMuted(!playing);
  };

  return (
    <div className="relative w-full h-[calc(100vh-105px)] bg-slate-950 overflow-hidden flex flex-col">
      {/* Open Source Map Notice Banner (Ensures user knows NO API KEY is required) */}
      <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-4 py-1.5 flex items-center justify-between text-xs text-emerald-300 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold">🗺️ Open-Source Map Active (OpenStreetMap & Leaflet)</span>
          <span className="text-emerald-500 hidden sm:inline">•</span>
          <span className="hidden sm:inline font-mono bg-emerald-900/60 px-2 py-0.5 rounded text-[11px] border border-emerald-800">
            No API Key Required • 100% Free
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-white font-bold">{filteredAmbulances.length} Ambulances on Map</span>
          <button
            onClick={handleToggleSirenAudio}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition ${
              !isSirenMuted && ambulanceSiren.getIsPlaying()
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Code 3 Siren Audio Simulation"
          >
            <Volume2 className="w-3 h-3" />
            <span>{!isSirenMuted && ambulanceSiren.getIsPlaying() ? 'Siren Playing 🔊' : 'Test Siren 🔊'}</span>
          </button>
        </div>
      </div>

      {/* Floating Control Panel */}
      <div className="absolute top-12 left-3 right-3 z-30 flex flex-wrap items-center gap-2 pointer-events-none">
        {/* Search Bar */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs w-full sm:w-72">
          <Search className="w-4 h-4 text-rose-400 shrink-0" />
          <input
            type="text"
            placeholder="Search Ambulance ID (e.g. AMB-001), Paramedic, Hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-slate-100 placeholder:text-slate-400 focus:outline-hidden w-full font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Emergency Status Filter Chips */}
        <div className="pointer-events-auto hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs">
          {[
            { id: 'ALL', label: `All (${autos.length})` },
            { id: 'RESPONDING', label: '🚨 Code 3 Responding', color: 'bg-red-500' },
            { id: 'ON_SCENE', label: '🩺 On Scene', color: 'bg-amber-500' },
            { id: 'EN_ROUTE_HOSPITAL', label: '🏥 En Route Hospital', color: 'bg-purple-500' },
            { id: 'AT_HOSPITAL', label: '🏥 At Hospital ER', color: 'bg-sky-500' },
            { id: 'AVAILABLE', label: '🟢 Available', color: 'bg-emerald-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-rose-600 text-white font-bold shadow-md'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              {tab.color && <span className={`w-2 h-2 rounded-full ${tab.color}`} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Ambulance Type Filter */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by ambulance type"
            className="bg-slate-900 text-slate-200 py-1 px-2 rounded-lg focus:outline-hidden font-medium border-0 cursor-pointer"
          >
            <option value="ALL">All Units (ALS, BLS, ICU)</option>
            <option value="ALS">ALS (Advanced Life Support)</option>
            <option value="BLS">BLS (Basic Life Support)</option>
            <option value="Cardiac">Cardiac ICU Units</option>
            <option value="Neonatal">Neonatal Intensive Care</option>
          </select>
        </div>

        {/* Quick Focus Nearest Ambulance */}
        <button
          onClick={handleFocusNearestAmbulance}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl text-xs font-bold transition"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Locate Nearest Ambulance</span>
        </button>

        {/* Reset View Button */}
        <button
          onClick={handleResetView}
          className="pointer-events-auto ml-auto p-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white shadow-xl transition"
          title="Reset Map to Metro City Overview"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" />

      {/* Map Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs text-slate-300 max-w-sm">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1 text-white">
            <span className="text-red-500 font-extrabold text-sm">🚑</span>
            <span>Emergency Ambulance Legend</span>
          </span>
          <span className="text-teal-400 font-mono font-bold">{filteredAmbulances.length} Active</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-red-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              🚨
            </span>
            <span>Code 3 Responding</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              🩺
            </span>
            <span>On Scene / Stabilizing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              🏥
            </span>
            <span>En Route Hospital</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              ✓
            </span>
            <span>Available / Standby</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-rose-500 text-sm">🏥</span>
            <span>Hospital ER Facility</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-teal-400 text-xs font-bold">📱</span>
            <span>Paramedic Live GPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
