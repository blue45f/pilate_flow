import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_LOSSLESS_MOTION_FRAME_URLS } from './motionFrameAssets';
import { inspectStudio3dOfflineCache, prewarmStudio3dOfflineCache } from './pwaStudioOffline';

afterEach(() => vi.unstubAllGlobals());
describe('complete motion frame offline preparation', () => {
  it('counts the missing intermediate frame and resumes only that frame before declaring readiness', async () => {
    const urls = ALL_LOSSLESS_MOTION_FRAME_URLS;
    const missing = urls.find((url) => url.endsWith('-mid.webp'))!;
    const stored = new Map(urls.filter((url) => url !== missing).map((url) => [url, new Response('image', { headers: { 'content-type': 'image/webp' } })]));
    const cache = {
      match: vi.fn(async (url: string) => stored.get(url)),
      put: vi.fn(async (url: string, value: Response) => { stored.set(url, value); }),
    };
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) });
    expect(await inspectStudio3dOfflineCache()).toMatchObject({ totalAssets: 72, cachedAssets: 71, isComplete: false });
    const fetcher = vi.fn(async () => new Response('image', { headers: { 'content-type': 'image/webp' } }));
    const progress = vi.fn();
    const result = await prewarmStudio3dOfflineCache(progress, fetcher);
    expect(result).toMatchObject({ totalAssets: 72, cachedAssets: 72, isComplete: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(missing, { cache: 'force-cache' });
    expect(progress).toHaveBeenLastCalledWith(72, 72);
  });
  it('does not count an HTML fallback as a saved frame and handles denied cache access', async () => {
    const cache = { match: vi.fn(async () => undefined), put: vi.fn() };
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) });
    const fetcher = vi.fn(async () => new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } }));
    expect(await prewarmStudio3dOfflineCache(undefined, fetcher)).toMatchObject({ cachedAssets: 0, isComplete: false });
    expect(cache.put).not.toHaveBeenCalled();
    vi.stubGlobal('caches', { open: vi.fn(async () => { throw new Error('blocked'); }) });
    expect(await prewarmStudio3dOfflineCache(undefined, fetcher)).toMatchObject({ cacheSupported: false, isComplete: false });
  });
});
