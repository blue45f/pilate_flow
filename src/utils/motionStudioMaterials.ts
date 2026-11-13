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
  clothHighlight: '#789785',
  clothLight: '#557b67',
  cloth: '#3c6552',
  clothShade: '#234b39',
  clothFarLight: '#8ca394',
  clothFar: '#6a8775',
  skinHighlight: '#f9e9d9',
  skinLight: '#efd7bf',
  skin: '#dfb99a',
  skinShade: '#be9476',
  skinFar: '#d6bea5',
  hairLight: '#796e5a',
  hair: '#433e33',
  hairShade: '#2c3028',
  oakLight: '#ead8b8',
  oak: '#cfae82',
  oakShade: '#ac875b',
  upholsteryLight: '#8b9f8c',
  upholstery: '#637e68',
  upholsteryShade: '#405c48',
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
