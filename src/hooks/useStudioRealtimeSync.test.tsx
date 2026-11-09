import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadLocalPhotoAsset } from '../utils/localMediaStorage';
import { useHydratedLocalPhoto } from './useStudioRealtimeSync';

vi.mock('../utils/localMediaStorage', () => ({
  LOCAL_PHOTO_URI_PREFIX: 'local-photo://',
  loadLocalPhotoAsset: vi.fn(),
  subscribeStudioSyncEvents: vi.fn(() => () => {}),
}));
beforeEach(() => {
  vi.mocked(loadLocalPhotoAsset).mockReset();
});
afterEach(cleanup);

it('returns inline images immediately and clears missing input without loading', () => {
  const { result, rerender } = renderHook(
    ({ id, photo }) => useHydratedLocalPhoto(id, photo),
    { initialProps: { id: '', photo: 'data:image/png;base64,synthetic-a' } },
  );
  expect(result.current).toBe('data:image/png;base64,synthetic-a');
  rerender({ id: '', photo: 'data:image/png;base64,synthetic-b' });
  expect(result.current).toBe('data:image/png;base64,synthetic-b');
  rerender({ id: '', photo: '' });
  expect(result.current).toBe('');
  expect(loadLocalPhotoAsset).not.toHaveBeenCalled();
});

it('hides the prior image during a new lookup and ignores an obsolete async response', async () => {
  const pending = new Map<string, (value: string | null) => void>();
  vi.mocked(loadLocalPhotoAsset).mockImplementation(
    (target) => new Promise((resolve) => pending.set(target, resolve)),
  );
  const { result, rerender } = renderHook(
    ({ photo }) => useHydratedLocalPhoto('exercise', photo),
    { initialProps: { photo: 'local-photo://first' } },
  );
  expect(result.current).toBe('');
  await act(async () => pending.get('local-photo://first')?.('first-image'));
  expect(result.current).toBe('first-image');
  rerender({ photo: 'local-photo://second' });
  expect(result.current).toBe('');
  rerender({ photo: 'local-photo://third' });
  await act(async () => pending.get('local-photo://second')?.('obsolete-image'));
  expect(result.current).toBe('');
  await act(async () => pending.get('local-photo://third')?.('third-image'));
  expect(result.current).toBe('third-image');
});

it('falls back to the exercise identifier and safely handles absent or rejected assets', async () => {
  vi.mocked(loadLocalPhotoAsset).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'));
  const { result, rerender } = renderHook(
    ({ id }) => useHydratedLocalPhoto(id, ''),
    { initialProps: { id: 'missing-exercise' } },
  );
  await waitFor(() => expect(loadLocalPhotoAsset).toHaveBeenCalledWith('missing-exercise'));
  expect(result.current).toBe('');
  rerender({ id: 'failed-exercise' });
  await waitFor(() => expect(loadLocalPhotoAsset).toHaveBeenCalledWith('failed-exercise'));
  expect(result.current).toBe('');
});
