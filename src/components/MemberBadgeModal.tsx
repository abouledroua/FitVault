"use client";

import { useEffect, useRef } from 'react';
import { X, Printer, User, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface MemberBadgeModalProps {
  member: {
    id: number;
    barcode: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    phone: string;
  };
  activeInscription?: {
    offer_title: string;
    end_date: string;
  } | null;
  onClose: () => void;
}

export function MemberBadgeModal({ member, activeInscription, onClose }: MemberBadgeModalProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate barcode on canvas
    if (typeof window !== 'undefined' && canvasRef.current) {
      import('jsbarcode').then((JsBarcode) => {
        try {
          JsBarcode.default(canvasRef.current, member.barcode, {
            format: "CODE128",
            width: 2,
            height: 45,
            displayValue: true,
            fontSize: 14,
            margin: 4,
            background: "#ffffff",
            lineColor: "#0f172a"
          });
        } catch (e) {
          console.error('Error rendering barcode:', e);
        }
      });
    }
  }, [member.barcode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      {/* Print-only CSS injected */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-member-badge, #printable-member-badge * {
            visibility: visible;
          }
          #printable-member-badge {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        {/* Modal Controls */}
        <div className="flex justify-between items-center mb-6 no-print">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            Badge Membre Officiel
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Badge Card */}
        <div
          id="printable-member-badge"
          ref={badgeRef}
          className="w-80 mx-auto aspect-[1.586/1] bg-white text-slate-900 rounded-2xl p-5 shadow-xl border-2 border-slate-200 relative overflow-hidden flex flex-col justify-between"
          style={{ width: '340px', minHeight: '215px' }}
        >
          {/* Background Decorative Rings */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-100 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-100 rounded-full blur-xl pointer-events-none -ml-8 -mb-8"></div>

          {/* Top Header of the Card */}
          <div className="flex justify-between items-center relative z-10 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <BrandLogo className="w-7 h-7 text-blue-600" />
              <div>
                <span className="font-black tracking-wider text-sm text-slate-900">
                  FIT<span className="text-blue-600">VAULT</span>
                </span>
                <span className="text-[9px] block text-slate-500 uppercase tracking-widest font-semibold">CLUB & FITNESS</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">CARTE MEMBRE</span>
              <span className="text-[10px] font-mono text-slate-500">ID #{member.id}</span>
            </div>
          </div>

          {/* Middle: Photo & Details */}
          <div className="flex items-center gap-3.5 my-auto relative z-10 py-1">
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
              {member.photo_url ? (
                <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-slate-900 text-base uppercase tracking-wide truncate">
                {member.first_name} {member.last_name}
              </h4>
              <p className="text-xs text-slate-500 font-medium truncate">{member.phone || 'Non renseigné'}</p>
              {activeInscription && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase truncate">
                    {activeInscription.offer_title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Barcode on white container */}
          <div className="relative z-10 bg-white rounded-xl p-1 flex flex-col items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto"></canvas>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-5 h-5" /> Imprimer le Badge
          </button>
        </div>
      </div>
    </div>
  );
}
