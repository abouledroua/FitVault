"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Printer, User, ShieldCheck, Tag, Check, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface MemberBadgeModalProps {
  member: {
    id: number;
    barcode: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    phone: string;
    date_of_birth?: string | null;
    address?: string | null;
  };
  activeInscription?: {
    offer_title: string;
    end_date: string;
  } | null;
  onClose: () => void;
}

export function MemberBadgeModal({ member, activeInscription, onClose }: MemberBadgeModalProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const canvasStandardRef = useRef<HTMLCanvasElement>(null);
  const canvasChokriRef = useRef<HTMLCanvasElement>(null);
  const [photoError, setPhotoError] = useState(false);

  const [gymSettings, setGymSettings] = useState<{
    gym_name: string;
    logo_url: string | null;
    badge_image_url: string | null;
    badge_template: 'standard' | 'chokri';
  }>({
    gym_name: 'FitVault Gym',
    logo_url: null,
    badge_image_url: null,
    badge_template: 'standard',
  });

  const [activeTemplate, setActiveTemplate] = useState<'standard' | 'chokri'>('standard');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [member.photo_url]);

  // Load gym settings to use configured template and logos
  useEffect(() => {
    fetch('/api/settings/general')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          const t = data.badge_template === 'chokri' ? 'chokri' : 'standard';
          setGymSettings({
            gym_name: data.gym_name || 'FitVault Gym',
            logo_url: data.logo_url || null,
            badge_image_url: data.badge_image_url || null,
            badge_template: t,
          });
          setActiveTemplate(t);
        }
      })
      .catch((e) => console.error('Error fetching settings for badge:', e))
      .finally(() => setSettingsLoaded(true));
  }, []);

  // Generate barcodes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('jsbarcode').then((JsBarcode) => {
      // Barcode for Standard template
      if (canvasStandardRef.current && member.barcode) {
        try {
          JsBarcode.default(canvasStandardRef.current, member.barcode, {
            format: "CODE128",
            width: 2,
            height: 42,
            displayValue: true,
            fontSize: 13,
            margin: 4,
            background: "#ffffff",
            lineColor: "#0f172a"
          });
        } catch (e) {
          console.error('Error rendering standard barcode:', e);
        }
      }

      // Barcode for Chokri template
      if (canvasChokriRef.current && member.barcode) {
        try {
          JsBarcode.default(canvasChokriRef.current, member.barcode, {
            format: "CODE128",
            width: 1.8,
            height: 38,
            displayValue: false,
            margin: 2,
            background: "#ffffff",
            lineColor: "#000000"
          });
        } catch (e) {
          console.error('Error rendering chokri barcode:', e);
        }
      }
    });
  }, [member.barcode, activeTemplate, settingsLoaded]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateStr = (d?: string | null) => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4">
      {/* Print-only CSS injected */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-member-badge, #printable-member-badge * {
            visibility: visible !important;
          }
          #printable-member-badge {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 relative animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 no-print">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              Badge Membre Officiel
            </h3>
            <p className="text-xs text-slate-500">
              Format d'impression carte d'adhérent (CR80)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Pills (In Modal) */}
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-2xl mb-5 no-print">
          <button
            type="button"
            onClick={() => setActiveTemplate('standard')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTemplate === 'standard'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Modèle Standard
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('chokri')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTemplate === 'chokri'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Modèle Chokri
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE BADGE CARD */}
        {/* ========================================================================= */}

        {/* TEMPLATE 1: MODELE STANDARD */}
        {activeTemplate === 'standard' && (
          <div
            id="printable-member-badge"
            ref={badgeRef}
            className="w-[340px] mx-auto aspect-[1.586/1] bg-white text-slate-900 rounded-2xl p-4 shadow-xl border-2 border-slate-200 relative overflow-hidden flex flex-col justify-between"
            style={{ width: '340px', minHeight: '215px' }}
          >
            {/* Background Decorative Rings */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-blue-100 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-100 rounded-full blur-xl pointer-events-none -ml-8 -mb-8"></div>

            {/* Top Header of the Card */}
            <div className="flex justify-between items-center relative z-10 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                {gymSettings.logo_url ? (
                  <img
                    src={gymSettings.logo_url}
                    alt="Logo"
                    className="w-7 h-7 object-contain rounded"
                  />
                ) : (
                  <BrandLogo className="w-7 h-7 text-blue-600" />
                )}
                <div>
                  <span className="font-black tracking-wider text-sm text-slate-900">
                    {gymSettings.gym_name || 'FITVAULT'}
                  </span>
                  <span className="text-[8px] block text-slate-500 uppercase tracking-widest font-semibold">
                    CLUB & FITNESS
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">CARTE MEMBRE</span>
                <span className="text-[10px] font-mono text-slate-500">ID #{member.id}</span>
              </div>
            </div>

            {/* Middle: Photo & Details */}
            <div className="flex items-center gap-3.5 my-auto relative z-10 py-1">
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {member.photo_url && !photoError ? (
                  <img 
                    src={member.photo_url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full bg-slate-100">
                    <User className="w-7 h-7 text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Photo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide truncate">
                  {member.first_name} {member.last_name}
                </h4>
                {member.phone && member.phone.trim() ? (
                  <p className="text-xs text-slate-500 font-medium truncate">{member.phone}</p>
                ) : null}
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
            <div className="relative z-10 bg-white rounded-xl p-0.5 flex flex-col items-center justify-center">
              <canvas ref={canvasStandardRef} className="max-w-full h-auto"></canvas>
            </div>
          </div>
        )}

        {/* TEMPLATE 2: MODELE CHOKRI (Conforme à l'image) */}
        {activeTemplate === 'chokri' && (
          <div
            id="printable-member-badge"
            ref={badgeRef}
            className="w-[340px] mx-auto bg-white text-black border-2 border-slate-800 rounded-xl shadow-xl flex flex-col justify-between overflow-hidden"
            style={{ width: '340px', height: '215px' }}
          >
            {/* 1. Top Header Area: Logos & CARTE D'ADHERENT */}
            <div className="h-12 bg-white px-3 flex items-center justify-between">
              {/* Logo Gauche */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
                {gymSettings.logo_url ? (
                  <img
                    src={gymSettings.logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : gymSettings.badge_image_url ? (
                  <img
                    src={gymSettings.badge_image_url}
                    alt="Badge"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-100 to-sky-100 border border-slate-200 flex items-center justify-center">
                    <BrandLogo className="w-5 h-5 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Titre Centré */}
              <div className="text-center flex-1 px-1">
                <h2 className="font-serif font-black text-black tracking-wide text-base leading-tight uppercase">
                  CARTE D'ADHERENT
                </h2>
              </div>

              {/* Logo Droit */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
                {gymSettings.badge_image_url ? (
                  <img
                    src={gymSettings.badge_image_url}
                    alt="Badge"
                    className="w-full h-full object-contain"
                  />
                ) : gymSettings.logo_url ? (
                  <img
                    src={gymSettings.logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-100 to-sky-100 border border-slate-200 flex items-center justify-center">
                    <BrandLogo className="w-5 h-5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Bandes Horizontales Rouge & Verte */}
            <div className="w-full flex flex-col shrink-0">
              <div className="h-[7px] bg-[#dc2626] w-full"></div>
              <div className="h-[7px] bg-[#16a34a] w-full"></div>
            </div>

            {/* 3. Card Body: Photo à gauche, Infos au milieu, Code-barres en bas à droite */}
            <div className="flex-1 bg-white p-3 flex items-center justify-between gap-2.5 relative">
              {/* Photo Adhérent avec bordure noire arrondie */}
              <div className="w-[88px] h-[88px] rounded-2xl border-2 border-black bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
                {member.photo_url && !photoError ? (
                  <img
                    src={member.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full bg-slate-100">
                    <User className="w-8 h-8 text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Photo</span>
                  </div>
                )}
              </div>

              {/* Mentions Nom, DN, ADR */}
              <div className="flex-1 flex flex-col justify-center space-y-1.5 pl-1.5 text-black">
                <div className="text-[13px] font-black leading-tight flex items-baseline gap-1.5">
                  <span className="font-extrabold uppercase shrink-0">Nom :</span>
                  <span className="font-black uppercase truncate max-w-[125px]">
                    {member.last_name} {member.first_name}
                  </span>
                </div>

                <div className="text-[13px] font-black leading-tight flex items-baseline gap-1.5">
                  <span className="font-extrabold uppercase shrink-0">DN :</span>
                  <span className="font-black">
                    {formatDateStr(member.date_of_birth)}
                  </span>
                </div>

                <div className="text-[13px] font-black leading-tight flex items-baseline gap-1.5">
                  <span className="font-extrabold uppercase shrink-0">ADR :</span>
                  <span className="font-black truncate max-w-[125px]">
                    {member.address || member.phone || '-'}
                  </span>
                </div>
              </div>

              {/* Code-barres en bas à droite */}
              <div className="absolute right-3 bottom-2 flex flex-col items-center justify-center">
                <canvas ref={canvasChokriRef} className="max-w-[105px] h-[40px]"></canvas>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimer le Badge
          </button>
        </div>
      </div>
    </div>
  );
}
