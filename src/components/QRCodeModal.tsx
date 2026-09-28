import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, ExternalLink, Copy, Check, QrCode } from 'lucide-react';
import type { Ambulance } from '../types.ts';

interface QRCodeModalProps {
  auto: Ambulance | null;
  onClose: () => void;
  onOpenMobileView?: (autoId: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ auto, onClose, onOpenMobileView }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const url = `${window.location.origin}/?mode=driver&autoId=${encodeURIComponent(auto.id)}`;
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl: string) => setQrDataUrl(dataUrl))
      .catch((err: Error) => console.error('QR code generation error:', err));
  }, [auto]);

  if (!auto) return null;

  const mobileUrl = `${window.location.origin}/?mode=driver&autoId=${encodeURIComponent(auto.id)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl font-bold">
            🚑
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{auto.id}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800 font-mono">
                {auto.regNumber}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Paramedic: {auto.paramedicName} • Driver: {auto.driverName}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center my-4">
          <p className="text-xs text-slate-300 font-medium mb-3 text-center">
            Scan with smartphone camera to connect ambulance live GPS terminal
          </p>
          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-red-500/30">
              <img src={qrDataUrl} alt={`QR Code for ${auto.id}`} className="w-48 h-48 rounded" />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-800 rounded-lg text-slate-400 text-sm">
              Generating QR Code...
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 font-semibold">
            <QrCode className="w-4 h-4" />
            <span>Instant Mobile Paramedic Terminal Link</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Paramedic Web App Direct Link</label>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 break-all">
            <span className="truncate flex-1">{mobileUrl}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 flex items-center gap-1"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => {
              onClose();
              if (onOpenMobileView) onOpenMobileView(auto.id);
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Paramedic App in this Browser</span>
          </button>
          <a
            href={mobileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
