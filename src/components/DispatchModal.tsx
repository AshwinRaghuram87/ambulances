import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  MapPin,
  Building2,
  Clock,
  User,
  Activity,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Ambulance, EmergencyHospital } from '../types.ts';

interface DispatchModalProps {
  ambulance: Ambulance | null;
  hospitals: EmergencyHospital[];
  onClose: () => void;
  onDispatch: (ambulanceId: string, dispatchData: {
    incidentType: string;
    priority: 'CODE_RED' | 'CODE_YELLOW' | 'CODE_GREEN';
    patientName: string;
    pickupLocation: string;
    pickupLat: number;
    pickupLng: number;
    targetHospital: string;
    etaMinutes: number;
  }) => Promise<void>;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  ambulance,
  hospitals,
  onClose,
  onDispatch,
}) => {
  if (!ambulance) return null;

  const [incidentType, setIncidentType] = useState('Severe Multi-Vehicle Collision (Trauma)');
  const [priority, setPriority] = useState<'CODE_RED' | 'CODE_YELLOW' | 'CODE_GREEN'>('CODE_RED');
  const [patientName, setPatientName] = useState('John Doe (Approx 35M)');
  const [pickupLocation, setPickupLocation] = useState('Outer Ring Road near Silk Board Flyover');
  const [targetHospital, setTargetHospital] = useState(
    hospitals[0]?.name || 'Victoria Hospital & Trauma Emergency Centre'
  );
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      // Find hospital coordinates
      const selectedHosp = hospitals.find((h) => h.name === targetHospital) || hospitals[0];
      const pickupLat = (selectedHosp ? selectedHosp.lat : 12.9716) + (Math.random() * 0.02 - 0.01);
      const pickupLng = (selectedHosp ? selectedHosp.lng : 77.5946) + (Math.random() * 0.02 - 0.01);

      await onDispatch(ambulance.id, {
        incidentType,
        priority,
        patientName,
        pickupLocation,
        pickupLat,
        pickupLng,
        targetHospital,
        etaMinutes,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch ambulance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-rose-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Emergency Dispatch Order</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {ambulance.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {ambulance.ambulanceType} • Driver: {ambulance.driverName}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Triage Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Triage Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CODE_RED', label: 'Code Red (Critical)', color: 'border-rose-500 bg-rose-950/40 text-rose-300 ring-rose-500' },
                { id: 'CODE_YELLOW', label: 'Code Yellow (Urgent)', color: 'border-amber-500 bg-amber-950/40 text-amber-300 ring-amber-500' },
                { id: 'CODE_GREEN', label: 'Code Green (Standard)', color: 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-emerald-500' },
              ].map((lvl) => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setPriority(lvl.id as any)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-center ${
                    priority === lvl.id
                      ? `${lvl.color} ring-2 ring-offset-1 ring-offset-slate-900 shadow-md`
                      : 'border-slate-700/80 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Incident Nature / Chief Complaint
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-rose-500"
            >
              <option value="Severe Multi-Vehicle Collision (Trauma)">Severe Multi-Vehicle Collision (Trauma)</option>
              <option value="Acute ST-Elevation Myocardial Infarction (Cardiac)">Acute ST-Elevation Myocardial Infarction (Cardiac)</option>
              <option value="Acute Stroke / Neurological Emergency">Acute Stroke / Neurological Emergency</option>
              <option value="Pediatric Respiratory Arrest / Choking">Pediatric Respiratory Arrest / Choking</option>
              <option value="Fall from Height / Structural Collapse">Fall from Height / Structural Collapse</option>
              <option value="Maternal & Obstetric Crisis (Active Labor)">Maternal & Obstetric Crisis (Active Labor)</option>
              <option value="Industrial Burn / Hazardous Chemical Exposure">Industrial Burn / Hazardous Chemical Exposure</option>
            </select>
          </div>

          {/* Patient Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Patient Identification / Details
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Ramesh K. (42M) / Unknown Male"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-rose-500"
                required
              />
            </div>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Emergency Pickup Location / Landmark
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Street address, junction or GPS landmark"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-rose-500"
                required
              />
            </div>
          </div>

          {/* Destination Hospital */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Designated Emergency Trauma Hospital
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={targetHospital}
                onChange={(e) => setTargetHospital(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-rose-500"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name} ({h.availableEmergencyBeds} ER Beds Available)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial ETA */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Estimated Response ETA (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="1"
                max="60"
                value={etaMinutes}
                onChange={(e) => setEtaMinutes(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden focus:border-rose-500"
                required
              />
            </div>
          </div>

          {/* GPS Notice */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">AIS-140 GPS Dispatch Broadcast</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dispatching will activate the vehicle siren beacon, stream real-time GPS telemetry to the central hospital trauma dashboard, and send turn-by-turn routing to the in-vehicle terminal.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm Emergency Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
