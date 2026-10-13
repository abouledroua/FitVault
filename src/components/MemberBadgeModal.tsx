"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Printer, User, Tag, Sparkles, Sliders, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { BadgeCanvasContainer } from '@/components/BadgeCanvasContainer';
import { BadgeOrientation, BADGE_CONSTANTS, getBadgeDimensions } from '@/lib/badge-specs';

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

  // Orientation du badge : Paysage (85.6 × 53.98 mm) ou Portrait (53.98 × 85.6 mm)
  const [orientation, setOrientation] = useState<BadgeOrientation>('landscape');
  // Affichage des guides de découpe et de sécurité
  const [showGuides, setShowGuides] = useState(false);
  // Support du fond perdu (+2mm autour)
  const [withBleed, setWithBleed] = useState(false);

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

  // Chargement des paramètres de la salle
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

  // Génération du code-barres selon l'orientation et le modèle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('jsbarcode').then((JsBarcode) => {
      const isLandscape = orientation === 'landscape';

      // Barcode Modèle Standard
      if (canvasStandardRef.current && member.barcode) {
        try {
          JsBarcode.default(canvasStandardRef.current, member.barcode, {
            format: "CODE128",
            width: isLandscape ? 1.9 : 1.35,
            height: isLandscape ? 40 : 34,
            displayValue: true,
            fontSize: isLandscape ? 12 : 11,
            margin: 2,
            background: "#ffffff",
            lineColor: "#0f172a",
          });
        } catch (e) {
          console.error('Error rendering standard barcode:', e);
        }
      }

      // Barcode Modèle Chokri
      if (canvasChokriRef.current && member.barcode) {
        try {
          JsBarcode.default(canvasChokriRef.current, member.barcode, {
            format: "CODE128",
            width: isLandscape ? 1.7 : 1.3,
            height: isLandscape ? 36 : 32,
            displayValue: false,
            margin: 1,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (e) {
          console.error('Error rendering chokri barcode:', e);
        }
      }
    });
  }, [member.barcode, activeTemplate, orientation, settingsLoaded]);

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

  const isLandscape = orientation === 'landscape';
  const badgeDims = getBadgeDimensions(orientation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 relative animate-in fade-in zoom-in-95 max-h-[94vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 no-print border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              Badge Membre Officiel
            </h3>
            <p className="text-xs text-slate-500">
              Format CR80 ISO/IEC 7810 ID-1 ({badgeDims.widthMm} × {badgeDims.heightMm} mm • 300 DPI: {badgeDims.widthPx300Dpi} × {badgeDims.heightPx300Dpi} px)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contrôles Techniques : Modèle, Orientation & Guides */}
        <div className="space-y-3 mb-5 no-print">
          {/* Sélecteur de Modèle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTemplate('standard')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTemplate === 'chokri'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Modèle Chokri
            </button>
          </div>

          {/* Sélecteur d'Orientation & Options Techniques */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
            {/* Boutons d'orientation */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  isLandscape
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paysage (85.6 × 54 mm)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  !isLandscape
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portrait (54 × 85.6 mm)
              </button>
            </div>

            {/* Toggles Guides & Fond Perdu */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGuides(!showGuides)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  showGuides
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Affiche la ligne de découpe et la marge de sécurité de 3 mm"
              >
                {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Guides techniques</span>
              </button>

              <button
                type="button"
                onClick={() => setWithBleed(!withBleed)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  withBleed
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Ajoute un fond perdu technique de 2 mm autour du badge"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Fond perdu (+2mm)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTENEUR NORMALISÉ DE CANEVAS DU BADGE (CR80) */}
        {/* ========================================================================= */}
        <div className="py-2 flex items-center justify-center">
          <BadgeCanvasContainer
            ref={badgeRef}
            orientation={orientation}
            showGuides={showGuides}
            withBleed={withBleed}
            className="shadow-2xl border border-slate-300/80"
          >
            {/* ========================================================================= */}
            {/* TEMPLATE 1 : MODÈLE STANDARD */}
            {/* ========================================================================= */}
            {activeTemplate === 'standard' && (
              <div
                className="w-full h-full bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between"
                style={{
                  // Zone de sécurité : padding de 3mm garanti
                  padding: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                }}
              >
                {/* Effets d'arrière-plan décoratifs */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-blue-100/70 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-100/70 rounded-full blur-xl pointer-events-none -ml-8 -mb-8"></div>

                {isLandscape ? (
                  /* ============= STANDARD EN PAYSAGE ============= */
                  <>
                    {/* En-tête de la carte */}
                    <div className="flex justify-between items-center relative z-10 border-b border-slate-200 pb-2">
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
                          <span className="font-black tracking-wider text-xs text-slate-900">
                            {gymSettings.gym_name || 'FITVAULT'}
                          </span>
                          <span className="text-[7.5px] block text-slate-500 uppercase tracking-widest font-semibold">
                            CLUB & FITNESS
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">CARTE MEMBRE</span>
                        <span className="text-[9px] font-mono text-slate-500">ID #{member.id}</span>
                      </div>
                    </div>

                    {/* Milieu : Photo & Détails */}
                    <div className="flex items-center gap-3 my-auto relative z-10 py-1">
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                        {member.photo_url && !photoError ? (
                          <img
                            src={member.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setPhotoError(true)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full bg-slate-100">
                            <User className="w-6 h-6 text-slate-400" />
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide truncate">
                          {member.first_name} {member.last_name}
                        </h4>
                        {member.phone && member.phone.trim() ? (
                          <p className="text-[11px] text-slate-500 font-medium truncate">{member.phone}</p>
                        ) : null}
                        {activeInscription && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-[9px] text-emerald-600 font-bold uppercase truncate">
                              {activeInscription.offer_title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bas : Code-barres */}
                    <div className="relative z-10 bg-white rounded-lg p-0.5 flex flex-col items-center justify-center">
                      <canvas ref={canvasStandardRef} className="max-w-full h-auto"></canvas>
                    </div>
                  </>
                ) : (
                  /* ============= STANDARD EN PORTRAIT ============= */
                  <div className="flex flex-col justify-between h-full relative z-10 text-center">
                    {/* Header Portrait */}
                    <div className="border-b border-slate-200 pb-1.5 flex flex-col items-center">
                      {gymSettings.logo_url ? (
                        <img
                          src={gymSettings.logo_url}
                          alt="Logo"
                          className="w-7 h-7 object-contain rounded mb-0.5"
                        />
                      ) : (
                        <BrandLogo className="w-7 h-7 text-blue-600 mb-0.5" />
                      )}
                      <span className="font-black text-xs text-slate-900 tracking-wider">
                        {gymSettings.gym_name || 'FITVAULT'}
                      </span>
                      <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">
                        CARTE MEMBRE #{member.id}
                      </span>
                    </div>

                    {/* Centre Photo & Nom */}
                    <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
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
                            <span className="text-[7px] font-bold text-slate-400 uppercase">Photo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                          {member.first_name} {member.last_name}
                        </h4>
                        {member.phone && (
                          <p className="text-[10px] text-slate-500 font-medium">{member.phone}</p>
                        )}
                        {activeInscription && (
                          <span className="inline-block mt-1 text-[8.5px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                            • {activeInscription.offer_title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bas : Code-barres Portrait */}
                    <div className="bg-white rounded p-0.5 flex flex-col items-center justify-center">
                      <canvas ref={canvasStandardRef} className="max-w-full h-auto"></canvas>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TEMPLATE 2 : MODÈLE CHOKRI */}
            {/* ========================================================================= */}
            {activeTemplate === 'chokri' && (
              <div className="w-full h-full bg-white text-black flex flex-col justify-between overflow-hidden relative">
                {isLandscape ? (
                  /* ============= CHOKRI EN PAYSAGE ============= */
                  <>
                    {/* 1. Bande En-tête : Logos & Titre */}
                    <div
                      className="h-11 bg-white flex items-center justify-between"
                      style={{
                        paddingLeft: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingRight: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingTop: '1mm',
                      }}
                    >
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden">
                        {gymSettings.logo_url ? (
                          <img src={gymSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : gymSettings.badge_image_url ? (
                          <img src={gymSettings.badge_image_url} alt="Badge" className="w-full h-full object-contain" />
                        ) : (
                          <BrandLogo className="w-6 h-6 text-blue-600" />
                        )}
                      </div>

                      <div className="text-center flex-1 px-1">
                        <h2 className="font-serif font-black text-black tracking-wide text-sm leading-tight uppercase">
                          CARTE D'ADHERENT
                        </h2>
                      </div>

                      <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden">
                        {gymSettings.badge_image_url ? (
                          <img src={gymSettings.badge_image_url} alt="Badge" className="w-full h-full object-contain" />
                        ) : gymSettings.logo_url ? (
                          <img src={gymSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <BrandLogo className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* 2. Bandes Rouge & Verte */}
                    <div className="w-full flex flex-col shrink-0">
                      <div className="h-[6px] bg-[#dc2626] w-full"></div>
                      <div className="h-[6px] bg-[#16a34a] w-full"></div>
                    </div>

                    {/* 3. Corps de carte (Zone sûre 3mm) */}
                    <div
                      className="flex-1 bg-white flex items-center justify-between gap-2 relative"
                      style={{
                        paddingLeft: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingRight: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingBottom: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingTop: '2mm',
                      }}
                    >
                      {/* Photo */}
                      <div className="w-[78px] h-[78px] rounded-xl border-2 border-black bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
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
                            <span className="text-[7.5px] font-bold text-slate-500 uppercase">Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Mentions Nom, DN, ADR */}
                      <div className="flex-1 flex flex-col justify-center space-y-1 pl-1 text-black">
                        <div className="text-[12px] font-black leading-tight flex items-baseline gap-1">
                          <span className="font-extrabold uppercase shrink-0">Nom :</span>
                          <span className="font-black uppercase truncate max-w-[130px]">
                            {member.last_name} {member.first_name}
                          </span>
                        </div>

                        <div className="text-[12px] font-black leading-tight flex items-baseline gap-1">
                          <span className="font-extrabold uppercase shrink-0">DN :</span>
                          <span className="font-black">
                            {formatDateStr(member.date_of_birth)}
                          </span>
                        </div>

                        <div className="text-[12px] font-black leading-tight flex items-baseline gap-1">
                          <span className="font-extrabold uppercase shrink-0">ADR :</span>
                          <span className="font-black truncate max-w-[130px]">
                            {member.address || member.phone || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Code-barres Chokri */}
                      <div className="absolute right-[3mm] bottom-[3mm] flex flex-col items-center justify-center">
                        <canvas ref={canvasChokriRef} className="max-w-[100px] h-[36px]"></canvas>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ============= CHOKRI EN PORTRAIT ============= */
                  <div className="flex flex-col justify-between h-full">
                    {/* Header Portrait */}
                    <div
                      className="bg-white flex flex-col items-center pt-2 pb-1"
                      style={{
                        paddingLeft: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingRight: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                      }}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="w-7 h-7 overflow-hidden">
                          {gymSettings.logo_url ? (
                            <img src={gymSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <BrandLogo className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <h2 className="font-serif font-black text-black tracking-wide text-xs uppercase">
                          CARTE D'ADHERENT
                        </h2>
                        <div className="w-7 h-7 overflow-hidden">
                          {gymSettings.badge_image_url ? (
                            <img src={gymSettings.badge_image_url} alt="Badge" className="w-full h-full object-contain" />
                          ) : (
                            <BrandLogo className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bandes Rouge & Verte */}
                    <div className="w-full flex flex-col shrink-0">
                      <div className="h-[5px] bg-[#dc2626] w-full"></div>
                      <div className="h-[5px] bg-[#16a34a] w-full"></div>
                    </div>

                    {/* Centre Photo & Détails */}
                    <div
                      className="flex-1 flex flex-col items-center justify-center py-2"
                      style={{
                        paddingLeft: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                        paddingRight: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                      }}
                    >
                      <div className="w-16 h-16 rounded-xl border-2 border-black bg-slate-50 flex items-center justify-center overflow-hidden mb-2">
                        {member.photo_url && !photoError ? (
                          <img
                            src={member.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setPhotoError(true)}
                          />
                        ) : (
                          <User className="w-8 h-8 text-slate-400" />
                        )}
                      </div>

                      <div className="text-center w-full space-y-0.5 text-black">
                        <p className="text-xs font-black uppercase truncate">
                          {member.last_name} {member.first_name}
                        </p>
                        <p className="text-[10px] font-bold">
                          DN: {formatDateStr(member.date_of_birth)}
                        </p>
                        <p className="text-[10px] font-medium text-slate-700 truncate">
                          {member.address || member.phone || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Bas Barcode */}
                    <div
                      className="flex flex-col items-center justify-center pb-2"
                      style={{
                        paddingBottom: `${BADGE_CONSTANTS.SAFETY_MARGIN_MM}mm`,
                      }}
                    >
                      <canvas ref={canvasChokriRef} className="max-w-[110px] h-[34px]"></canvas>
                    </div>
                  </div>
                )}
              </div>
            )}
          </BadgeCanvasContainer>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 mt-6 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm cursor-pointer"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimer le Badge ({badgeDims.widthMm} × {badgeDims.heightMm} mm)
          </button>
        </div>
      </div>
    </div>
  );
}
