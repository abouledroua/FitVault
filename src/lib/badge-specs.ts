/**
 * Spécifications techniques officielles pour les badges adhérents (Format CR80 / ISO/IEC 7810 ID-1)
 */

export type BadgeOrientation = 'landscape' | 'portrait';

export interface BadgeDimensionSpec {
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  // 300 DPI Standard (sans fond perdu)
  widthPx300Dpi: number;
  heightPx300Dpi: number;
  // 300 DPI avec fond perdu (+2mm de chaque côté)
  bleedWidthMm: number;
  bleedHeightMm: number;
  bleedWidthPx300Dpi: number;
  bleedHeightPx300Dpi: number;
}

export const BADGE_CONSTANTS = {
  // Dimensions physiques réelles en mm
  CR80_WIDTH_MM: 85.6,
  CR80_HEIGHT_MM: 53.98,
  BORDER_RADIUS_MM: 3.18,
  BLEED_MM: 2.0,
  SAFETY_MARGIN_MM: 3.0,

  // 300 DPI exacts (1 mm = 300 / 25.4 ≈ 11.81102 px)
  DPI: 300,
  MM_TO_PX_300_DPI: 300 / 25.4, // ~11.811

  // Dimensions en pixels à 300 DPI selon les spécifications
  PIXELS_300_DPI: {
    landscape: {
      width: 1011,
      height: 638,
      bleedWidth: 1058, // 89.6 mm * 11.811 ≈ 1058 px
      bleedHeight: 685, // 58.0 mm * 11.811 ≈ 685 px
    },
    portrait: {
      width: 638,
      height: 1011,
      bleedWidth: 685,
      bleedHeight: 1058,
    },
  },
} as const;

/**
 * Retourne les dimensions calculées selon l'orientation
 */
export function getBadgeDimensions(orientation: BadgeOrientation): BadgeDimensionSpec {
  const isLandscape = orientation === 'landscape';

  const widthMm = isLandscape ? BADGE_CONSTANTS.CR80_WIDTH_MM : BADGE_CONSTANTS.CR80_HEIGHT_MM;
  const heightMm = isLandscape ? BADGE_CONSTANTS.CR80_HEIGHT_MM : BADGE_CONSTANTS.CR80_WIDTH_MM;
  const bleedWidthMm = widthMm + BADGE_CONSTANTS.BLEED_MM * 2;
  const bleedHeightMm = heightMm + BADGE_CONSTANTS.BLEED_MM * 2;

  const px = isLandscape ? BADGE_CONSTANTS.PIXELS_300_DPI.landscape : BADGE_CONSTANTS.PIXELS_300_DPI.portrait;

  return {
    widthMm,
    heightMm,
    aspectRatio: widthMm / heightMm,
    widthPx300Dpi: px.width,
    heightPx300Dpi: px.height,
    bleedWidthMm,
    bleedHeightMm,
    bleedWidthPx300Dpi: px.bleedWidth,
    bleedHeightPx300Dpi: px.bleedHeight,
  };
}
