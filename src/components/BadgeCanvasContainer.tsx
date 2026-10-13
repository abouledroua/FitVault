"use client";

import React, { forwardRef } from 'react';
import { BADGE_CONSTANTS, getBadgeDimensions, BadgeOrientation } from '@/lib/badge-specs';

export interface BadgeCanvasContainerProps {
  children: React.ReactNode;
  orientation?: BadgeOrientation;
  withBleed?: boolean;
  showGuides?: boolean;
  className?: string;
  id?: string;
}

/**
 * Conteneur de badge respectant rigoureusement les normes ISO/IEC 7810 ID-1 (CR80)
 * - Dimensions physiques : 85.6 mm × 53.98 mm (ou 53.98 mm × 85.6 mm en portrait)
 * - Coins arrondis (border-radius) : 3.18 mm
 * - Ratio d'aspect : ~1.586
 * - Fond perdu (Bleed) : 2 mm autour
 * - Zone de sécurité (Safety margin) : 3 mm à l'intérieur des bords
 */
export const BadgeCanvasContainer = forwardRef<HTMLDivElement, BadgeCanvasContainerProps>(
  function BadgeCanvasContainer(
    {
      children,
      orientation = 'landscape',
      withBleed = false,
      showGuides = false,
      className = '',
      id = 'printable-member-badge',
    },
    ref
  ) {
    const isLandscape = orientation === 'landscape';
    const dims = getBadgeDimensions(orientation);

    // Dimensions CSS mm
    const cardWidthMm = dims.widthMm;
    const cardHeightMm = dims.heightMm;
    const bleedWidthMm = dims.bleedWidthMm;
    const bleedHeightMm = dims.bleedHeightMm;
    const borderRadiusMm = BADGE_CONSTANTS.BORDER_RADIUS_MM;
    const safetyMarginMm = BADGE_CONSTANTS.SAFETY_MARGIN_MM;

    return (
      <div className="flex flex-col items-center justify-center w-full">
        {/* Print Stylesheet injection pour format physique exact */}
        <style jsx global>{`
          @page {
            size: ${isLandscape ? `${cardWidthMm}mm ${cardHeightMm}mm` : `${cardWidthMm}mm ${cardHeightMm}mm`};
            margin: 0;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }
            #${id}, #${id} * {
              visibility: visible !important;
            }
            #${id} {
              position: fixed !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: ${withBleed ? `${bleedWidthMm}mm` : `${cardWidthMm}mm`} !important;
              height: ${withBleed ? `${bleedHeightMm}mm` : `${cardHeightMm}mm`} !important;
              border-radius: ${withBleed ? '0mm' : `${borderRadiusMm}mm`} !important;
              margin: 0 !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .badge-guide-overlay {
              display: none !important;
            }
          }
        `}</style>

        {/* Outer Container (gère le fond perdu si activé) */}
        <div
          ref={ref}
          id={id}
          className={`relative overflow-hidden transition-all duration-300 ${className}`}
          style={{
            // Ratio exact selon les dimensions physiques
            aspectRatio: withBleed
              ? `${bleedWidthMm} / ${bleedHeightMm}`
              : `${cardWidthMm} / ${cardHeightMm}`,
            // Largeur de prévisualisation à l'écran
            width: isLandscape ? '100%' : 'auto',
            maxWidth: isLandscape
              ? withBleed ? '380px' : '360px'
              : withBleed ? '260px' : '240px',
            borderRadius: withBleed ? '0mm' : `${borderRadiusMm}mm`,
            padding: withBleed ? `${BADGE_CONSTANTS.BLEED_MM}mm` : '0',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Cadre de coupe (si fond perdu actif) ou carte directe */}
          <div
            className="relative w-full h-full flex flex-col justify-between overflow-hidden"
            style={{
              borderRadius: `${borderRadiusMm}mm`,
            }}
          >
            {/* Zone de contenu principale */}
            {children}

            {/* Repères techniques visuels (guides à l'écran uniquement) */}
            {showGuides && (
              <div
                className="badge-guide-overlay absolute inset-0 pointer-events-none z-50 rounded-[3.18mm] select-none"
                aria-hidden="true"
              >
                {/* Ligne de coupe (Trim line) */}
                <div
                  className="absolute inset-0 border-2 border-dashed border-red-500/70"
                  style={{ borderRadius: `${borderRadiusMm}mm` }}
                >
                  <span className="absolute top-1 left-2 text-[8px] font-mono font-bold bg-red-600 text-white px-1 py-0.2 rounded shadow-xs">
                    Découpe: {cardWidthMm} × {cardHeightMm} mm
                  </span>
                </div>

                {/* Zone de sécurité (Safety margin : 3 mm à l'intérieur) */}
                <div
                  className="absolute border border-dashed border-emerald-500/80 rounded"
                  style={{
                    top: `${safetyMarginMm}mm`,
                    bottom: `${safetyMarginMm}mm`,
                    left: `${safetyMarginMm}mm`,
                    right: `${safetyMarginMm}mm`,
                  }}
                >
                  <span className="absolute bottom-1 right-2 text-[8px] font-mono font-bold bg-emerald-600 text-white px-1 py-0.2 rounded shadow-xs">
                    Zone sûre (-3 mm)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Légende technique informative à l'écran */}
        {showGuides && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-500 font-mono no-print">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Découpe : {cardWidthMm} × {cardHeightMm} mm (R: {borderRadiusMm} mm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Sécurité : -{safetyMarginMm} mm
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
              300 DPI : {dims.widthPx300Dpi} × {dims.heightPx300Dpi} px
            </span>
          </div>
        )}
      </div>
    );
  }
);
