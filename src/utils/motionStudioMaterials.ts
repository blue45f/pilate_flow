/** Shared art direction for the authored SVG study and optional orbit illustration.
 * These are display materials only: they never affect joints, contacts or timing.
 */
export const MOTION_STUDIO_MATERIALS = {
  surface: '#faf9f5',
  horizon: '#f0f1eb',
  floor: '#e5e9e1',
  border: '#d0d9ce',
  guide: '#c4d0c3',
  ink: '#244b3d',
  clothHighlight: '#a0a58b',
  clothLight: '#8c9277',
  cloth: '#72785e',
  clothShade: '#525b44',
  clothFarLight: '#adb19a',
  clothFar: '#929982',
  skinHighlight: '#f9e9d9',
  skinLight: '#efd7bf',
  skin: '#dfb99a',
  skinShade: '#be9476',
  skinFar: '#d6bea5',
  hairLight: '#866245',
  hair: '#59412f',
  hairShade: '#382b23',
  oakLight: '#ead8b8',
  oak: '#cfae82',
  oakShade: '#ac875b',
  upholsteryLight: '#a0a58b',
  upholstery: '#7d8467',
  upholsteryShade: '#5b654a',
  primaryMuscle: '#c47760',
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
