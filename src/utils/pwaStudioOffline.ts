import { ALL_STUDIO_3D_ASSET_URLS } from './studio3dMotionCatalog';

export const STUDIO_OFFLINE_3D_CACHE_NAME = 'flow-atelier-studio3d-v1';

export interface Studio3dOfflineStatus {
  readonly totalAssets: number;
  readonly cachedAssets: number;
  readonly cacheSupported: boolean;
  readonly isComplete: boolean;
}

export async function inspectStudio3dOfflineCache(): Promise<Studio3dOfflineStatus> {
  const totalAssets = ALL_STUDIO_3D_ASSET_URLS.length;
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
    for (const url of ALL_STUDIO_3D_ASSET_URLS) {
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
  const totalAssets = ALL_STUDIO_3D_ASSET_URLS.length;
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      totalAssets,
      cachedAssets: 0,
      cacheSupported: false,
      isComplete: false,
    };
  }

  const cache = await window.caches.open(STUDIO_OFFLINE_3D_CACHE_NAME);
  let cachedAssets = 0;

  for (const url of ALL_STUDIO_3D_ASSET_URLS) {
    try {
      const existing = await cache.match(url);
      if (existing) {
        cachedAssets += 1;
      } else {
        const res = await fetcher(url, { cache: 'force-cache' });
        if (res && res.ok) {
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
