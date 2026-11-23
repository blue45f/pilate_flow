import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import {
  FEEDBACK_CARD_DIMENSIONS,
  INSTRUCTOR_NOTE_PRESETS,
  MEMBER_FEEDBACK_PRIVACY_NOTICE_KO,
  buildMemberFeedbackDraft,
  exportMemberFeedbackCardPng,
  formatMemberFeedbackKakaoText,
  renderMemberFeedbackCardToCanvas,
  wrapKoreanTextLines,
} from '../utils/memberFeedbackCardGenerator';
import { MemberFeedbackCardModal } from './MemberFeedbackCardModal';

const originalStore = usePilatesStore.getState();

function pickCatalogWithArtwork(
  predicate: (ex: PilatesExercise) => boolean,
  label: string,
): PilatesExercise {
  const found = INITIAL_EXERCISES.find(
    (ex) => predicate(ex) && Boolean(getExerciseArtworkFrame(ex, 'middle')?.src),
  );
  if (!found) {
    throw new Error(`Expected artwork-backed exercise for: ${label}`);
  }
  return found;
}

const warmupEx = pickCatalogWithArtwork(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'warmup',
  'reformer warmup with artwork',
);

const coreEx = pickCatalogWithArtwork(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'core',
  'reformer core with artwork',
);

const lowerEx = pickCatalogWithArtwork(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'lower-body',
  'reformer lower-body with artwork',
);

const cooldownEx = pickCatalogWithArtwork(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'cooldown',
  'reformer cooldown with artwork',
);

function buildSampleClassSteps(): SequenceStep[] {
  return [
    {
      stepId: 'fb-1',
      order: 1,
      blockCategory: warmupEx.blockCategory,
      exerciseId: warmupEx.id,
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 'fb-2',
      order: 2,
      blockCategory: coreEx.blockCategory,
      exerciseId: coreEx.id,
      durationMin: 12,
      selectedLayer: 'standard',
    },
    {
      stepId: 'fb-3',
      order: 3,
      blockCategory: lowerEx.blockCategory,
      exerciseId: lowerEx.id,
      durationMin: 14,
      selectedLayer: 'standard',
    },
    {
      stepId: 'fb-4',
      order: 4,
      blockCategory: cooldownEx.blockCategory,
      exerciseId: cooldownEx.id,
      durationMin: 8,
      selectedLayer: 'standard',
    },
  ];
}

function createMockCanvasContext() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 14 })),
  } as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  if (!URL.createObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:mock-feedback-card'),
    });
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-feedback-card');
  }
  if (!URL.revokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }

  usePilatesStore.setState(
    {
      ...originalStore,
      exercises: INITIAL_EXERCISES,
      activeTitle: '화요일 오전 리포머 밸런스 50분',
      activeApparatus: 'reformer',
      activeSteps: buildSampleClassSteps(),
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalStore, true);
});

describe('memberFeedbackCardGenerator', () => {
  it('extracts balanced core 3 movements with real 3D WebP artwork, safe 3-min mat home practice, and KakaoTalk text', () => {
    const draft = buildMemberFeedbackDraft({
      sequenceTitle: '화요일 오전 리포머 밸런스 50분',
      steps: buildSampleClassSteps(),
      exercisesById: WORLD_PILATES_BY_ID,
      apparatus: 'reformer',
      dateLabel: '2026.11.24 (화)',
      unifiedPool: WORLD_PILATES_EXERCISES,
    });

    expect(draft.highlights).toHaveLength(3);
    expect(draft.highlights[0]!.exerciseId).toBe(warmupEx.id);
    expect(draft.highlights[0]!.phaseTagKo).toBe('도입 · 워밍업');
    expect(draft.highlights[2]!.exerciseId).toBe(cooldownEx.id);
    expect(draft.highlights[2]!.phaseTagKo).toBe('정리 · 마무리');

    for (const move of draft.highlights) {
      expect(move.artworkSrc).toBeTruthy();
      expect(move.artworkSrc).toContain('/motion-artwork-v2/');
      expect(move.cueLineKo.length).toBeGreaterThan(5);
      expect(move.breathPatternKo.length).toBeGreaterThan(3);
    }

    // Safe 3-min home practice auto-picked from beginner prop-free mat catalog
    const homeEx = WORLD_PILATES_BY_ID.get(draft.homePractice.exerciseId)!;
    expect(homeEx.apparatus).toBe('mat');
    expect(homeEx.level).toBe('1.0');
    expect(draft.homePractice.durationLabelKo).toContain('3분');

    // KakaoTalk text includes all core sections
    const kakao = formatMemberFeedbackKakaoText(draft);
    expect(kakao).toContain('화요일 오전 리포머 밸런스 50분');
    expect(kakao).toContain(warmupEx.nameKo);
    expect(kakao).toContain(cooldownEx.nameKo);
    expect(kakao).toContain(draft.homePractice.nameKo);
    expect(kakao).toContain(INSTRUCTOR_NOTE_PRESETS[0]!.textKo);
  });

  it('wraps Korean text with keep-all word boundaries and respects maxLines', () => {
    const lines = wrapKoreanTextLines(
      (txt) => txt.length * 10,
      '어깨 힘을 빼고 갈비뼈를 부드럽게 닫으며 호흡을 길게 내쉬어 주세요',
      140,
      2,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).not.toMatch(/\s$/);
    expect(lines[1]!.endsWith('…')).toBe(true);
  });

  it('renders both 4:5 (1080x1350) and 9:16 (1080x1920) on Canvas with real images and graceful fallback badges', async () => {
    const draft45 = buildMemberFeedbackDraft({
      sequenceTitle: '화요일 오전 리포머 밸런스',
      steps: buildSampleClassSteps(),
      exercisesById: WORLD_PILATES_BY_ID,
      apparatus: 'reformer',
      dateLabel: '2026.11.24 (화)',
      ratio: '4:5',
    });

    const mockCtx = createMockCanvasContext();
    const fakeCanvas = document.createElement('canvas');
    vi.spyOn(fakeCanvas, 'getContext').mockReturnValue(mockCtx);
    vi.spyOn(fakeCanvas, 'toBlob').mockImplementation((cb) =>
      cb(new Blob(['fake-png'], { type: 'image/png' })),
    );

    const fakeImage = { naturalWidth: 640, naturalHeight: 400 } as unknown as CanvasImageSource;
    const result45 = await renderMemberFeedbackCardToCanvas(fakeCanvas, draft45, {
      imageLoader: async () => fakeImage,
    });

    expect(result45.width).toBe(FEEDBACK_CARD_DIMENSIONS['4:5'].width);
    expect(result45.height).toBe(FEEDBACK_CARD_DIMENSIONS['4:5'].height);
    expect(result45.renderedWithFallback).toBe(false);
    expect(result45.drawnImageCount).toBe(4); // 3 highlights + 1 home practice
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(4);

    // 9:16 story ratio with failing images -> graceful botanical badge fallback without error
    const draft916 = { ...draft45, ratio: '9:16' as const };
    const export916 = await exportMemberFeedbackCardPng(draft916, {
      canvas: fakeCanvas,
      imageLoader: async () => null,
    });

    expect(export916.width).toBe(1080);
    expect(export916.height).toBe(1920);
    expect(export916.mimeType).toBe('image/png');
    expect(export916.fileName).toContain('story-9x16.png');
    expect(export916.renderResult.fallbackBadgeCount).toBe(4);
    expect(export916.blob.size).toBeGreaterThan(0);

    // Headless environment (getContext -> null) still returns a valid fallback PNG Blob cleanly
    const headlessCanvas = document.createElement('canvas');
    vi.spyOn(headlessCanvas, 'getContext').mockReturnValue(null);
    const headlessExport = await exportMemberFeedbackCardPng(draft45, {
      canvas: headlessCanvas,
    });
    expect(headlessExport.renderResult.renderedWithFallback).toBe(true);
    expect(headlessExport.mimeType).toBe('image/png');
    expect(headlessExport.blob.size).toBeGreaterThan(0);
  });
});

describe('MemberFeedbackCardModal', () => {
  it('renders live Calm Atelier preview, toggles 4:5 and 9:16, updates instructor note, and flags sensitive PII/health input', () => {
    render(
      <MemberFeedbackCardModal
        open
        onClose={vi.fn()}
        sequenceTitle="화요일 오전 리포머 밸런스 50분"
        steps={buildSampleClassSteps()}
        exercisesById={WORLD_PILATES_BY_ID}
        apparatus="reformer"
        dateLabel="2026.11.24 (화)"
      />,
    );

    const preview = screen.getByTestId('member-feedback-preview-card');
    expect(preview).toHaveAttribute('data-ratio', '4:5');
    expect(screen.getByTestId('feedback-dimension-label')).toHaveTextContent('1080×1350');
    expect(screen.getByTestId('feedback-privacy-notice')).toHaveTextContent(
      MEMBER_FEEDBACK_PRIVACY_NOTICE_KO,
    );

    // Switch to 9:16 story ratio
    fireEvent.click(screen.getByTestId('feedback-ratio-9-16'));
    expect(preview).toHaveAttribute('data-ratio', '9:16');
    expect(screen.getByTestId('feedback-dimension-label')).toHaveTextContent('1080×1920');

    // Switch instructor note preset
    fireEvent.click(screen.getByTestId('feedback-note-preset-energetic-progress'));
    expect(screen.getByTestId('feedback-preview-note')).toHaveTextContent(
      INSTRUCTOR_NOTE_PRESETS[2]!.textKo,
    );

    // Edit note directly and trigger privacy guard when typing phone number
    const textarea = screen.getByTestId('feedback-note-textarea');
    fireEvent.change(textarea, { target: { value: '김지민 회원님 010-1234-5678 화이팅!' } });
    expect(screen.getByTestId('feedback-privacy-notice')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('feedback-privacy-notice')).toHaveTextContent(
      MEMBER_FEEDBACK_PRIVACY_NOTICE_KO,
    );
  });

  it('executes 1-tap PNG save, Web Share (and download fallback), and KakaoTalk text copy with toast feedback', async () => {
    const mockCtx = createMockCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
      cb(new Blob(['rendered-png-bytes'], { type: 'image/png' })),
    );

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const canShareSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: shareSpy,
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      writable: true,
      value: canShareSpy,
    });

    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(
      <MemberFeedbackCardModal
        embedded
        sequenceTitle="화요일 오전 리포머 밸런스 50분"
        steps={buildSampleClassSteps()}
        exercisesById={WORLD_PILATES_BY_ID}
        apparatus="reformer"
        dateLabel="2026.11.24 (화)"
      />,
    );

    // 1) Copy KakaoTalk text
    fireEvent.click(screen.getByTestId('feedback-copy-kakao-btn'));
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });
    expect(writeTextSpy.mock.calls[0]![0]).toContain('화요일 오전 리포머 밸런스 50분');
    expect(screen.getByTestId('feedback-action-toast')).toHaveTextContent('복사했어요');

    // 2) Save PNG image
    fireEvent.click(screen.getByTestId('feedback-save-png-btn'));
    await waitFor(() => {
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('feedback-action-toast')).toHaveTextContent('1080×1350');

    // 3) Share via Web Share API
    fireEvent.click(screen.getByTestId('feedback-share-btn'));
    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('feedback-action-toast')).toHaveTextContent('공유했어요');

    // 4) Share fallback to download when navigator.share is unavailable
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    fireEvent.click(screen.getByTestId('feedback-share-btn'));
    await waitFor(() => {
      expect(anchorClickSpy).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('feedback-action-toast')).toHaveTextContent('저장했어요');
  });
});
