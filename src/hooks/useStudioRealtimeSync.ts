import { useEffect, useState } from 'react';
import {
  LOCAL_PHOTO_URI_PREFIX,
  loadLocalPhotoAsset,
  subscribeStudioSyncEvents,
} from '../utils/localMediaStorage';

/**
 * Subscribes to cross-tab BroadcastChannel studio sync events
 * (`human-draft-updated`, `reusable-block-updated`, `sequence-updated`)
 * and invokes `onSync` whenever another tab updates studio state.
 */
export function useStudioRealtimeSync(
  onSync?: (payload: {
    kind: string;
    entityId: string;
    revision?: number;
    updatedAt: string;
  }) => void,
): number {
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    return subscribeStudioSyncEvents((payload) => {
      setSyncTick((prev) => prev + 1);
      onSync?.(payload);
    });
  }, [onSync]);

  return syncTick;
}

/**
 * Resolves `local-photo://<id>` URIs or missing DataURLs from IndexedDB
 * (`pilates-flow-local-media-v1`) while keeping inline `data:image/` URLs immediate.
 */
export function useHydratedLocalPhoto(
  exerciseId: string | null | undefined,
  photoDataUrl: string,
): string {
  const inlineUrl = photoDataUrl && !photoDataUrl.startsWith(LOCAL_PHOTO_URI_PREFIX)
    ? photoDataUrl
    : '';
  const lookupTarget = inlineUrl ? '' : photoDataUrl || exerciseId || '';
  const [resolved, setResolved] = useState<{ target: string; url: string } | null>(null);

  useEffect(() => {
    if (!lookupTarget) return;
    let active = true;
    void loadLocalPhotoAsset(lookupTarget).then(
      (loaded) => {
        if (active) setResolved({ target: lookupTarget, url: loaded ?? '' });
      },
      () => {
        if (active) setResolved({ target: lookupTarget, url: '' });
      },
    );
    return () => {
      active = false;
    };
  }, [lookupTarget]);

  // Derive immediate URLs; never show a previous exercise's asynchronously loaded image.
  return inlineUrl || (lookupTarget && resolved?.target === lookupTarget ? resolved.url : '');
}
