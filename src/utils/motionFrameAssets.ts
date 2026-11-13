import { ALL_STUDIO_3D_EXTENDED_ASSET_URLS } from './studio3dMotionCatalog';

const frameSources = new Set(ALL_STUDIO_3D_EXTENDED_ASSET_URLS);
export const MOTION_FRAME_WIDTH = 900;
export const MOTION_FRAME_HEIGHT = 585;
export const STUDIO_MOTION_FRAME_CACHE = 'flow-atelier-studio3d-lossless-v3';

/** Only known, pixel-verified studio frames have an optimized source. */
export function getLosslessMotionFrame(src: string | undefined): string | undefined {
  return src && frameSources.has(src) ? src.replace(/\.png$/, '.webp') : undefined;
}

export const ALL_LOSSLESS_MOTION_FRAME_URLS = ALL_STUDIO_3D_EXTENDED_ASSET_URLS.map(
  (src) => getLosslessMotionFrame(src)!,
);
