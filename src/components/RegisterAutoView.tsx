import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  PlusCircle,
  CheckCircle2,
  Smartphone,
  QrCode,
  Copy,
  Check,
  User,
  Phone,
  MapPin,
  Building2,
  ArrowRight,
  Activity,
  HeartPulse,
} from 'lucide-react';
import type { Ambulance, RegisterAmbulancePayload, AmbulanceType, ZoneName } from '../types.ts';

interface RegisterAutoViewProps {
  totalAutosCount: number;
  onRegisterSuccess: (auto: Ambulance) => void;
  onOpenMobileView: (autoId: string) => void;
  onNavigateToMap: () => void;
  registerAuto: (payload: RegisterAmbulancePayload) => Promise<Ambulance>;
}

const SECTORS_LIST = [
  { num: 1, name: 'Kempegowda Metro Sector', zone: 'North' as ZoneName },
  { num: 2, name: 'Chowdeshwari Medical Hub', zone: 'North' as ZoneName },
  { num: 3, name: 'Atturu Emergency Ring', zone: 'North' as ZoneName },
  { num: 4, name: 'Yelahanka Trauma Sector', zone: 'North' as ZoneName },
  { num: 5, name: 'Malleshwaram Central ER', zone: 'Central' as ZoneName },
  { num: 6, name: 'Rajajinagar Hospital Belt', zone: 'West' as ZoneName },
  { num: 7, name: 'Shivajinagar Acute Sector', zone: 'Central' as ZoneName },
  { num: 8, name: 'Shanthi Nagar Station', zone: 'Central' as ZoneName },
  { num: 9, name: 'Jayanagar Emergency Zone', zone: 'South' as ZoneName },
  { num: 10, name: 'Basavanagudi Medical Ring', zone: 'South' as ZoneName },
  { num: 11, name: 'JP Nagar Cardiac Sector', zone: 'South' as ZoneName },
  { num: 12, name: 'BTM Layout Trauma Unit', zone: 'South' as ZoneName },
  { num: 13, name: 'Indiranagar 100ft Medical', zone: 'East' as ZoneName },
  { num: 14, name: 'Halasuru Lake EMS Station', zone: 'East' as ZoneName },
  { num: 15, name: 'Domlur Tech Park ER', zone: 'East' as ZoneName },
  { num: 16, name: 'Koramangala 5th Block Station', zone: 'South' as ZoneName },
  { num: 17, name: 'Vijayanagar Trauma Zone', zone: 'West' as ZoneName },
  { num: 18, name: 'Mahalakshmi Rapid Base', zone: 'West' as ZoneName },
  { num: 19, name: 'Yeshwanthpur Express Hub', zone: 'North' as ZoneName },
  { num: 20, name: 'Hebbal Emergency Highway', zone: 'North' as ZoneName },
];

const HOSPITALS_LIST = [
  'Apollo Emergency Trauma & Cardiac Center',
  'Manipal Hospital 24/7 Acute Care & ER',
  'Fortis Emergency & Heart Care Unit',
  'Victoria Govt. General & Trauma Emergency',
  'Narayana Institute of Cardiac Sciences ER',
  'Bowring & Lady Curzon Emergency Hospital',
];

export const RegisterAutoView: React.FC<RegisterAutoViewProps> = ({
  totalAutosCount,
  onRegisterSuccess,
  onOpenMobileView,
  onNavigateToMap,
  registerAuto,
}) => {
  const nextNumber = totalAutosCount + 1;
  const suggestedId = `AMB-${String(nextNumber).padStart(3, '0')}`;

  const [form, setForm] = useState<RegisterAmbulancePayload>({
    regNumber: `KA-01-AMB-${String(1000 + nextNumber)}`,
    customId: suggestedId,
    vehicleType: 'ALS (Advanced Life Support)',
    driverName: '',
    driverPhone: '',
    paramedicName: '',
    paramedicRank: 'EMT-P Critical Care',
    ward: 'Sector 08 - Shanthi Nagar Station',
    wardNumber: 8,
    zone: 'Central',
    targetHospital: HOSPITALS_LIST[0],
    routeId: `CALL-EMG-${String(900 + nextNumber)}`,
    notes: 'Emergency medical unit commissioned for 24/7 dispatch',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredAuto, setRegisteredAuto] = useState<Ambulance | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleSectorChange = (sectorStr: string) => {
    const found = SECTORS_LIST.find((s) => `Sector ${String(s.num).padStart(2, '0')} - ${s.name}` === sectorStr);
    if (found) {
      setForm((prev) => ({
        ...prev,
        ward: sectorStr,
        wardNumber: found.num,
        zone: found.zone,
        routeId: `CALL-EMG-${String(found.num * 10 + 5)}`,
      }));
    } else {
      setForm((prev) => ({ ...prev, ward: sectorStr }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.regNumber.trim()) {
      setError('Registration plate number is required');
      return;
    }
    if (!form.driverName.trim()) {
      setError('Driver full name is required');
      return;
    }
    if (!form.driverPhone.trim()) {
      setError('Driver mobile phone is required');
      return;
    }
    if (!form.paramedicName.trim()) {
      setError('Lead paramedic name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await registerAuto(form);
      setRegisteredAuto(created);
      onRegisterSuccess(created);

      const mobileUrl = `${window.location.origin}/?mode=driver&autoId=${encodeURIComponent(created.id)}`;
      const qr = await QRCode.toDataURL(mobileUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrUrl(qr);
    } catch (err: any) {
      setError(err.message || 'Error commissioning ambulance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!registeredAuto) return;
    const url = `${window.location.origin}/?mode=driver&autoId=${encodeURIComponent(registeredAuto.id)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 my-4">
      {/* Commission Success Card */}
      {registeredAuto ? (
        <div className="rounded-3xl bg-slate-900 border border-red-500/40 p-6 sm:p-8 shadow-2xl animate-fade-in text-slate-100">
          <div className="flex items-center gap-3 text-emerald-400 mb-4">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-black text-white">Ambulance Commissioned Successfully!</h2>
              <p className="text-xs text-slate-400">
                Ambulance is now active on the OpenStreetMap live command grid. Have crew scan QR code to connect mobile terminal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="p-5 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-2xl border border-red-500/40">
                  🚑
                </div>
                <div>
                  <div className="text-xl font-mono font-extrabold text-white">{registeredAuto.id}</div>
                  <div className="text-xs font-mono text-red-300 font-bold">{registeredAuto.regNumber}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-700/60 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ambulance Unit:</span>
                  <span className="font-semibold text-white">{registeredAuto.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lead Paramedic:</span>
                  <span className="font-semibold text-teal-300">{registeredAuto.paramedicName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver & Phone:</span>
                  <span className="font-mono text-slate-200">{registeredAuto.driverName} ({registeredAuto.driverPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Hospital:</span>
                  <span className="font-semibold text-rose-400">{registeredAuto.targetHospital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sector Base:</span>
                  <span className="font-semibold text-white">{registeredAuto.ward}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Medical O2 Status:</span>
                  <span className="font-bold text-emerald-400">100% Full</span>
                </div>
              </div>
            </div>

            {/* QR Code & Mobile Terminal Link */}
            <div className="p-5 rounded-2xl bg-slate-850 border border-slate-700/80 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                Crew Phone Pairing QR Code
              </span>
              <p className="text-xs text-slate-400 mb-3">
                Scan with paramedic mobile phone camera to pair live GPS terminal:
              </p>

              {qrUrl && (
                <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-red-500/40 mb-3">
                  <img src={qrUrl} alt="Paramedic Pairing QR" className="w-40 h-40" />
                </div>
              )}

              <div className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 mb-3">
                <span className="truncate flex-1">
                  {window.location.origin}/?mode=driver&autoId={registeredAuto.id}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                onClick={() => onOpenMobileView(registeredAuto.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
              >
                <Smartphone className="w-4 h-4" />
                <span>Launch Paramedic Terminal Now</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setRegisteredAuto(null);
                setForm({
                  regNumber: `KA-01-AMB-${String(1000 + nextNumber + 1)}`,
                  customId: `AMB-${String(nextNumber + 1).padStart(3, '0')}`,
                  vehicleType: 'ALS (Advanced Life Support)',
                  driverName: '',
                  driverPhone: '',
                  paramedicName: '',
                  paramedicRank: 'EMT-P Critical Care',
                  ward: 'Sector 08 - Shanthi Nagar Station',
                  wardNumber: 8,
                  zone: 'Central',
                  targetHospital: HOSPITALS_LIST[0],
                  routeId: `CALL-EMG-${String(900 + nextNumber + 1)}`,
                  notes: 'Emergency medical unit commissioned for 24/7 dispatch',
                });
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Commission Another Ambulance
            </button>
            <button
              onClick={onNavigateToMap}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-900/40"
            >
              <span>View On Live Ambulance Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Commission Form */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-2xl border border-red-500/40">
              🚑
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Commission New Emergency Ambulance</h2>
              <p className="text-xs text-slate-400">
                Register an ambulance unit into the emergency response fleet with live GPS tracking.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 mb-6 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Ambulance Unit Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <span>1. Ambulance Unit Identification</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Registration Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA-01-AMB-1201"
                    value={form.regNumber}
                    onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-sm uppercase focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Ambulance Unit ID
                  </label>
                  <input
                    type="text"
                    value={form.customId}
                    onChange={(e) => setForm({ ...form, customId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-sm uppercase focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Ambulance Unit Type
                  </label>
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value as AmbulanceType })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-sm focus:border-red-500 focus:outline-hidden"
                  >
                    <option value="ALS (Advanced Life Support)">ALS (Advanced Life Support)</option>
                    <option value="BLS (Basic Life Support)">BLS (Basic Life Support)</option>
                    <option value="Cardiac ICU Mobile Unit">Cardiac ICU Mobile Unit</option>
                    <option value="Neonatal Intensive Care">Neonatal Intensive Care</option>
                    <option value="Rapid Emergency Response Unit">Rapid Emergency Response Unit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Base / Primary Hospital ER
                  </label>
                  <select
                    value={form.targetHospital}
                    onChange={(e) => setForm({ ...form, targetHospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-sm focus:border-red-500 focus:outline-hidden"
                  >
                    {HOSPITALS_LIST.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Dispatch Sector Station
                  </label>
                  <select
                    value={form.ward}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-sm focus:border-red-500 focus:outline-hidden cursor-pointer"
                  >
                    {SECTORS_LIST.map((s) => {
                      const str = `Sector ${String(s.num).padStart(2, '0')} - ${s.name}`;
                      return (
                        <option key={s.num} value={str}>
                          {str}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Zone (Auto-mapped)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${form.zone} Zone`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Paramedic & Crew Details */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>2. Paramedic Crew & Driver Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Lead Paramedic Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ananya Sen, EMT-P"
                    value={form.paramedicName}
                    onChange={(e) => setForm({ ...form, paramedicName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-sm focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Ambulance Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-sm focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Crew Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-sm focus:border-red-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-red-950/40 disabled:opacity-50"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{isSubmitting ? 'Commissioning...' : 'Commission Ambulance & Generate QR'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
