/** Shared art direction for the authored SVG study and optional orbit illustration.
 * Harmonized with the Unslop warm morning atelier linen & Korean webtoon studio palette.
 * These are display materials only: they never affect joints, contacts or timing.
 */
export const MOTION_STUDIO_MATERIALS = {
  surface: '#f7f4ee',
  horizon: '#f0ece3',
  floor: '#e8e2d6',
  border: '#d6cfc2',
  guide: '#c9c1b3',
  ink: '#1f4435',
  clothHighlight: '#9ba28c',
  clothLight: '#828b75',
  cloth: '#67725c',
  clothShade: '#4a5542',
  clothFarLight: '#aab09c',
  clothFar: '#8e9682',
  skinHighlight: '#fbf0e7',
  skinLight: '#f4dccb',
  skin: '#eac4ae',
  skinShade: '#cca088',
  skinFar: '#e0bda7',
  hairLight: '#6b4e3d',
  hair: '#3b2921',
  hairShade: '#231814',
  oakLight: '#ebd9bb',
  oak: '#d1b084',
  oakShade: '#ad895d',
  upholsteryLight: '#97a18a',
  upholstery: '#727d65',
  upholsteryShade: '#525e47',
  primaryMuscle: '#c4725c',
} as const;

function rgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** The canvas uses the exact same base materials as the SVG renderer. */
export const MOTION_STUDIO_RGB = {
  cloth: rgb(MOTION_STUDIO_MATERIALS.cloth),
  skin: rgb(MOTION_STUDIO_MATERIALS.skinLight),
  hair: rgb(MOTION_STUDIO_MATERIALS.hair),
  oak: rgb(MOTION_STUDIO_MATERIALS.oak),
  upholstery: rgb(MOTION_STUDIO_MATERIALS.upholstery),
  primaryMuscle: rgb(MOTION_STUDIO_MATERIALS.primaryMuscle),
} as const;
