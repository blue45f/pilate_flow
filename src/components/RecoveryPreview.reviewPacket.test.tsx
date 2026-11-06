import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOTION_DRAFTS } from '../data/motionDrafts';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  encodeMotionReviewPacket,
  getMotionDraftReviewWorksheet,
} from '../utils/motionReviewWorksheet';
import { RecoveryPreview } from './RecoveryPreview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('review document and studio backup have separate recovery purposes', () => {
  it('identifies a real exported v2 review document and offers the right next action without any store or storage write', async () => {
    const draft = MOTION_DRAFTS.find((item) => item.id === 'supported-heel-raise')!;
    const encoded = encodeMotionReviewPacket(getMotionDraftReviewWorksheet(draft));
    if (!encoded.ok) throw Error(encoded.error);
    const state = usePilatesStore.getState();
    const before = JSON.stringify(state);
    const stored = localStorage.getItem('pilates-flow-atelier-storage-v3');
    const storeChange = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(storeChange);
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    render(<RecoveryPreview />);
    const file = new File([encoded.json], encoded.filename, { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => encoded.json });
    fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), { target: { files: [file] } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('동작 대조 자료이며 수업 백업이 아닙니다');
    expect(alert).toHaveTextContent('전체 백업에서 내보낸 JSON 파일을 선택');
    expect(alert).toHaveTextContent('현재 자료와 초안은 바꾸지 않았습니다');
    expect(screen.queryByRole('button', { name: '이 내용으로 복원 적용' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(state);
    expect(JSON.stringify(usePilatesStore.getState())).toBe(before);
    expect(storeChange).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
    expect(localStorage.getItem('pilates-flow-atelier-storage-v3')).toBe(stored);
    unsubscribe();
  });
});
