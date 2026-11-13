import { ALL_LOSSLESS_MOTION_FRAME_URLS, STUDIO_MOTION_FRAME_CACHE } from './motionFrameAssets';

export const STUDIO_OFFLINE_3D_CACHE_NAME = STUDIO_MOTION_FRAME_CACHE;

export interface Studio3dOfflineStatus {
  readonly totalAssets: number;
  readonly cachedAssets: number;
  readonly cacheSupported: boolean;
  readonly isComplete: boolean;
}

export async function inspectStudio3dOfflineCache(): Promise<Studio3dOfflineStatus> {
  const totalAssets = ALL_LOSSLESS_MOTION_FRAME_URLS.length;
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      totalAssets,
      cachedAssets: 0,
      cacheSupported: false,
      isComplete: false,
    };
  }

  try {
    const cache = await window.caches.open(STUDIO_OFFLINE_3D_CACHE_NAME);
    let cachedAssets = 0;
    for (const url of ALL_LOSSLESS_MOTION_FRAME_URLS) {
      const hit = await cache.match(url);
      if (hit) cachedAssets += 1;
    }
    return {
      totalAssets,
      cachedAssets,
      cacheSupported: true,
      isComplete: cachedAssets === totalAssets,
    };
  } catch {
    return {
      totalAssets,
      cachedAssets: 0,
      cacheSupported: false,
      isComplete: false,
    };
  }
}

export async function prewarmStudio3dOfflineCache(
  onProgress?: (cachedCount: number, totalCount: number) => void,
  fetcher: typeof fetch = typeof fetch === 'function' ? fetch.bind(globalThis) : (async () => new Response()) as typeof fetch,
): Promise<Studio3dOfflineStatus> {
  const totalAssets = ALL_LOSSLESS_MOTION_FRAME_URLS.length;
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      totalAssets,
      cachedAssets: 0,
      cacheSupported: false,
      isComplete: false,
    };
  }

  let cache: Cache;
  try {
    cache = await window.caches.open(STUDIO_OFFLINE_3D_CACHE_NAME);
  } catch {
    return { totalAssets, cachedAssets: 0, cacheSupported: false, isComplete: false };
  }
  let cachedAssets = 0;

  for (const url of ALL_LOSSLESS_MOTION_FRAME_URLS) {
    try {
      const existing = await cache.match(url);
      if (existing) {
        cachedAssets += 1;
      } else {
        const res = await fetcher(url, { cache: 'force-cache' });
        if (res && res.ok && res.headers?.get('content-type')?.split(';')[0].trim() === 'image/webp') {
          await cache.put(url, typeof res.clone === 'function' ? res.clone() : res);
          cachedAssets += 1;
        }
      }
    } catch {
      // Skip individual failed asset cleanly while offline
    }
    onProgress?.(cachedAssets, totalAssets);
  }


  return {
    totalAssets,
    cachedAssets,
    cacheSupported: true,
    isComplete: cachedAssets === totalAssets,
  };
}
