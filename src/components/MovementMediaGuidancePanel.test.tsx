import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import {
  buildKoreanVoiceScript,
  movementMediaSessionCoordinator,
} from '../utils/koreanVoiceNarration';
import { resolveMovementMediaBundle } from '../utils/movementMediaMatcher';
import { MovementMediaGuidancePanel } from './MovementMediaGuidancePanel';
import { YouTubePreviewModal } from './YouTubeClipModal';

class MockSpeechSynthesisUtterance {
  text: string;
  lang = 'ko-KR';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown) | null =
    null;
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;

  constructor(text = '') {
    this.text = text;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

interface MockSpeechEnv {
  speakCalls: MockSpeechSynthesisUtterance[];
  cancelSpy: ReturnType<typeof vi.fn>;
  pauseSpy: ReturnType<typeof vi.fn>;
  resumeSpy: ReturnType<typeof vi.fn>;
  restore: () => void;
}

function installMockSpeechSynthesis(
  voices: Partial<SpeechSynthesisVoice>[] = [
    {
      name: 'Yuna',
      lang: 'ko-KR',
      localService: true,
      default: true,
      voiceURI: 'com.apple.ttsbundle.Yuna-compact',
    },
  ],
): MockSpeechEnv {
  const originalSynth = window.speechSynthesis;
  const originalUtterance = window.SpeechSynthesisUtterance;
  const speakCalls: MockSpeechSynthesisUtterance[] = [];

  const cancelSpy = vi.fn(() => {
    mockSynth.speaking = false;
    mockSynth.paused = false;
  });
  const pauseSpy = vi.fn(() => {
    mockSynth.paused = true;
  });
  const resumeSpy = vi.fn(() => {
    mockSynth.paused = false;
  });

  const mockSynth = {
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null as (() => void) | null,
    getVoices: vi.fn(() => voices as SpeechSynthesisVoice[]),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      const mockUtterance = utterance as unknown as MockSpeechSynthesisUtterance;
      speakCalls.push(mockUtterance);
      mockSynth.speaking = true;
      mockSynth.paused = false;
      mockUtterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
    }),
    cancel: cancelSpy,
    pause: pauseSpy,
    resume: resumeSpy,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    writable: true,
    value: mockSynth,
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: MockSpeechSynthesisUtterance,
  });

  return {
    speakCalls,
    cancelSpy,
    pauseSpy,
    resumeSpy,
    restore: () => {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: originalSynth,
      });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: originalUtterance,
      });
    },
  };
}

const originalStoreState = usePilatesStore.getState();

beforeEach(() => {
  movementMediaSessionCoordinator.resetForTests();
  usePilatesStore.setState(originalStoreState, true);
});

afterEach(() => {
  cleanup();
  movementMediaSessionCoordinator.resetForTests();
  usePilatesStore.setState(originalStoreState, true);
  vi.restoreAllMocks();
});

describe('MovementMediaGuidancePanel — reference video/materials & Korean voice explanation', () => {
  it('retains narration in voice-only mode and discards a loaded video when modes change', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-footwork-01')!;
      const view = render(<MovementMediaGuidancePanel exercise={exercise} />);
      fireEvent.click(screen.getByTestId('manual-load-video-btn'));
      const previousFrame = screen.getByTestId('permitted-youtube-iframe');
      fireEvent.click(screen.getByTestId('voice-play-btn'));
      expect(speechEnv.speakCalls).toHaveLength(1);
      const cancellationCount = speechEnv.cancelSpy.mock.calls.length;

      view.rerender(<MovementMediaGuidancePanel exercise={exercise} voiceOnly />);
      expect(previousFrame).not.toBeInTheDocument();
      expect(document.querySelector('iframe')).toBeNull();
      expect(
        screen.queryByRole('group', { name: '매칭된 공개 참고 출처 선택' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '참고 영상·자료' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('media-embed-box')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manual-load-video-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('external-original-source-link')).not.toBeInTheDocument();
      expect(
        screen.queryByText('외부 참고 링크 보안·자동재생 차단 정책 점검'),
      ).not.toBeInTheDocument();
      expect(speechEnv.cancelSpy.mock.calls.length).toBeGreaterThan(cancellationCount);
      expect(speechEnv.speakCalls).toHaveLength(1);

      expect(
        screen.getByRole('region', { name: `${exercise.nameKo} 한국어 음성 안내` }),
      ).toBeVisible();
      expect(screen.getByRole('group', { name: '한국어 음성 설명 제어' })).toBeVisible();
      expect(screen.getByRole('combobox', { name: '낭독 속도 · 한국어 음성 설명' })).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: '대본 보기' }));
      expect(screen.getByTestId('voice-script-text')).toHaveTextContent(exercise.nameKo);
      fireEvent.click(screen.getByTestId('voice-play-btn'));
      expect(speechEnv.speakCalls).toHaveLength(2);

      view.rerender(<MovementMediaGuidancePanel exercise={exercise} />);
      expect(screen.getByTestId('manual-load-video-btn')).toBeEnabled();
      expect(screen.getByTestId('media-embed-box')).toHaveAttribute('data-embed-state', 'idle');
      expect(document.querySelector('iframe')).toBeNull();
      expect(speechEnv.speakCalls).toHaveLength(2);
    } finally {
      speechEnv.restore();
    }
  });

  it('never auto-plays video or voice on initial entry and always provides external original links', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-warmup-01')!;
      render(<MovementMediaGuidancePanel exercise={exercise} />);

      const panel = screen.getByTestId('movement-media-guidance-panel');
      expect(panel).toHaveAttribute('data-exercise-id', exercise.id);

      const embedBox = screen.getByTestId('media-embed-box');
      expect(embedBox).toHaveAttribute('data-embed-state', 'idle');
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(speechEnv.speakCalls).toHaveLength(0);

      // External original link is visible even before loading the embed
      const externalLink = screen.getByTestId('external-original-source-link');
      expect(externalLink).toBeVisible();
      expect(externalLink).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');

      // Keep the entry compact, but preserve safety and an accessible script toggle.
      expect(screen.queryByTestId('voice-script-text')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/유료 음성 API|한눈에 보기|Web Speech API|검증된 기관/),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('full-script-copy-view')).not.toBeInTheDocument();
      expect(screen.getByText(buildKoreanVoiceScript(exercise).disclaimerKo)).toBeVisible();
      expect(
        screen.getByText(
          resolveMovementMediaBundle(exercise).primaryMatch.source.safetyDisclaimerKo,
        ),
      ).toBeVisible();
      const sourceDetails = screen.getByText('자료 정보').closest('details');
      expect(sourceDetails).not.toHaveAttribute('open');
      const scriptToggle = screen.getByRole('button', { name: '대본 보기' });
      expect(scriptToggle).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(scriptToggle);
      expect(scriptToggle).toHaveAttribute('aria-expanded', 'true');
      const scriptPanel = screen.getByTestId('voice-script-text');
      expect(scriptPanel).toBeVisible();
      expect(scriptPanel).toHaveTextContent(exercise.nameKo);
      expect(scriptToggle).toHaveAttribute('aria-controls', scriptPanel.id);
      fireEvent.click(scriptToggle);
      expect(screen.queryByTestId('voice-script-text')).not.toBeInTheDocument();
      expect(screen.getByText(buildKoreanVoiceScript(exercise).disclaimerKo)).toBeVisible();
    } finally {
      speechEnv.restore();
    }
  });

  it('starts the permitted youtube-nocookie embed only when manually clicked and falls back cleanly on embed block or playback failure', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-footwork-01')!;
      render(<MovementMediaGuidancePanel exercise={exercise} />);

      const loadBtn = screen.getByTestId('manual-load-video-btn');
      fireEvent.click(loadBtn);

      const embedBox = screen.getByTestId('media-embed-box');
      expect(embedBox).toHaveAttribute('data-embed-state', 'loaded');

      const iframe = screen.getByTestId('permitted-youtube-iframe');
      expect(iframe).toBeVisible();
      const src = iframe.getAttribute('src') ?? '';
      expect(src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
      expect(src).toContain('autoplay=0');
      expect(src).toContain('rel=0');
      expect(src).not.toContain('autoplay=1');

      // External original link remains available while embed is loaded
      expect(screen.getByTestId('external-original-source-link')).toBeVisible();

      // Simulate iframe error / playback failure -> unmounts iframe and shows external fallback
      fireEvent.error(iframe);
      expect(embedBox).toHaveAttribute('data-embed-state', 'playback-failed');
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(screen.getByTestId('embed-fallback-notice')).toBeVisible();
      expect(screen.getByTestId('external-original-source-link')).toBeVisible();

      // Reset to idle and test explicit embed-blocked button
      fireEvent.click(screen.getByTestId('reset-embed-state-btn'));
      expect(embedBox).toHaveAttribute('data-embed-state', 'idle');
      fireEvent.click(screen.getByTestId('manual-load-video-btn'));
      expect(screen.getByTestId('permitted-youtube-iframe')).toBeVisible();

      fireEvent.click(screen.getByTestId('report-embed-failure-btn'));
      expect(embedBox).toHaveAttribute('data-embed-state', 'embed-blocked');
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(screen.getByTestId('embed-fallback-notice')).toBeVisible();
      expect(screen.getByTestId('external-original-source-link')).toBeVisible();
    } finally {
      speechEnv.restore();
    }
  });

  it('enforces external-link-only policy (no iframe) for non-embeddable official/clinical sources while always providing the external link', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
      render(<MovementMediaGuidancePanel exercise={exercise} />);

      // Find a match tab with '원본에서 보기'
      const tabs = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('data-testid')?.startsWith('media-match-tab-'));
      const externalOnlyTab = tabs.find((tab) => tab.textContent?.includes('원본에서 보기'));
      expect(externalOnlyTab).toBeDefined();

      fireEvent.click(externalOnlyTab!);

      const embedBox = screen.getByTestId('media-embed-box');
      expect(embedBox).toHaveAttribute('data-embed-allowed', 'false');
      expect(screen.queryByTestId('manual-load-video-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(screen.getByTestId('embed-fallback-notice')).toBeVisible();

      const externalLink = screen.getByTestId('external-original-source-link');
      expect(externalLink).toBeVisible();
      expect(externalLink).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
    } finally {
      speechEnv.restore();
    }
  });

  it('stops previous video and voice immediately when moving to another exercise and never auto-plays on revisit (A -> B -> A)', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exerciseA = INITIAL_EXERCISES.find((item) => item.id === 'ex-footwork-01')!;
      const exerciseB = INITIAL_EXERCISES.find((item) => item.id === 'ex-bridging-01')!;
      const matchA = resolveMovementMediaBundle(exerciseA).primaryMatch;
      const matchB = resolveMovementMediaBundle(exerciseB).primaryMatch;

      // Lifecycle fixtures have distinct direct references; this is not playback review.
      expect(matchA.matchTier).toBe('curated-youtube-reference');
      expect(matchB.matchTier).toBe('curated-youtube-reference');
      expect(matchA.embedResolution.allowed).toBe(true);
      expect(matchB.embedResolution.allowed).toBe(true);
      expect(matchA.source.youtubeVideoId).toBe(exerciseA.youtube.videoId);
      expect(matchB.source.youtubeVideoId).toBe(exerciseB.youtube.videoId);
      expect(matchA.source.youtubeVideoId).not.toBe(matchB.source.youtubeVideoId);

      const { rerender } = render(<MovementMediaGuidancePanel exercise={exerciseA} />);

      // Start both video and Korean voice on Exercise A
      fireEvent.click(screen.getByTestId('manual-load-video-btn'));
      const iframeA = screen.getByTestId('permitted-youtube-iframe');
      expect(iframeA).toBeVisible();
      expect(iframeA).toHaveAttribute(
        'src',
        expect.stringContaining(`/embed/${matchA.source.youtubeVideoId}`),
      );

      fireEvent.click(screen.getByTestId('voice-play-btn'));
      expect(speechEnv.speakCalls).toHaveLength(1);
      expect(speechEnv.speakCalls[0].text).toContain(exerciseA.nameKo);

      const cancelCountBeforeSwitch = speechEnv.cancelSpy.mock.calls.length;

      // Switch to Exercise B
      rerender(<MovementMediaGuidancePanel exercise={exerciseB} />);
      expect(screen.getByTestId('movement-media-guidance-panel')).toHaveAttribute(
        'data-exercise-id',
        exerciseB.id,
      );
      expect(screen.getByTestId('media-embed-box')).toHaveAttribute('data-embed-state', 'idle');
      expect(iframeA).not.toBeInTheDocument();
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(screen.getByTestId('manual-load-video-btn')).toBeEnabled();
      expect(speechEnv.cancelSpy.mock.calls.length).toBeGreaterThan(cancelCountBeforeSwitch);
      // No new speak call was triggered automatically on Exercise B
      expect(speechEnv.speakCalls).toHaveLength(1);

      // Revisit Exercise A (B -> A): must NOT auto-play video or voice!
      rerender(<MovementMediaGuidancePanel exercise={exerciseA} />);
      expect(screen.getByTestId('movement-media-guidance-panel')).toHaveAttribute(
        'data-exercise-id',
        exerciseA.id,
      );
      expect(screen.getByTestId('media-embed-box')).toHaveAttribute('data-embed-state', 'idle');
      expect(screen.queryByTestId('permitted-youtube-iframe')).not.toBeInTheDocument();
      expect(screen.getByTestId('manual-load-video-btn')).toBeEnabled();
      expect(speechEnv.speakCalls).toHaveLength(1);
    } finally {
      speechEnv.restore();
    }
  });

  it('supports manual Korean voice playback, pause, resume, stop, speed adjustment, and segment selection', () => {
    const speechEnv = installMockSpeechSynthesis();
    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-core-01')!;
      render(<MovementMediaGuidancePanel exercise={exercise} />);

      const playBtn = screen.getByTestId('voice-play-btn');
      const pauseBtn = screen.getByTestId('voice-pause-btn');
      const stopBtn = screen.getByTestId('voice-stop-btn');
      const speedSelect = screen.getByTestId('voice-speed-select');

      expect(pauseBtn).toBeDisabled();
      expect(stopBtn).toBeDisabled();

      // Manual play
      fireEvent.click(playBtn);
      expect(speechEnv.speakCalls).toHaveLength(1);
      expect(speechEnv.speakCalls[0].lang).toBe('ko-KR');
      expect(speechEnv.speakCalls[0].rate).toBe(1);
      expect(pauseBtn).toBeEnabled();
      expect(stopBtn).toBeEnabled();

      // Change speed while playing -> restarts current segment at new speed (1.25x)
      fireEvent.change(speedSelect, { target: { value: '1.25' } });
      expect(speechEnv.speakCalls).toHaveLength(2);
      expect(speechEnv.speakCalls[1].rate).toBe(1.25);

      // Pause
      fireEvent.click(pauseBtn);
      expect(speechEnv.pauseSpy).toHaveBeenCalled();
      expect(playBtn).toHaveTextContent('음성 이어 듣기');

      // Resume
      fireEvent.click(playBtn);
      expect(speechEnv.resumeSpy).toHaveBeenCalled();

      // Speak specific segment (e.g., segment 3: 티칭 큐)
      fireEvent.click(screen.getByRole('button', { name: '대본 보기' }));
      fireEvent.click(screen.getByTestId('speak-segment-btn-3'));
      expect(speechEnv.speakCalls.at(-1)?.text).toContain('첫째');

      // Stop
      fireEvent.click(stopBtn);
      expect(speechEnv.cancelSpy).toHaveBeenCalled();
      expect(pauseBtn).toBeDisabled();
    } finally {
      speechEnv.restore();
    }
  });

  it('handles unsupported TTS environments gracefully by keeping full Korean script text accessible', () => {
    const originalSynth = window.speechSynthesis;
    const originalUtterance = window.SpeechSynthesisUtterance;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-rib-breath')!;
      render(<MovementMediaGuidancePanel exercise={exercise} />);

      expect(screen.getByTestId('mobile-tts-capability-badge')).toHaveTextContent(
        /한국어 음성을 사용할 수 없어요/,
      );
      const scriptText = screen.getByTestId('voice-script-text');
      expect(scriptText).toBeVisible();
      expect(scriptText).toHaveTextContent(exercise.nameKo);
      expect(scriptText).toHaveTextContent(exercise.cues[0]);
    } finally {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: originalSynth,
      });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: originalUtterance,
      });
    }
  });

  it('integrates one video gallery with an on-demand voice-only drawer and resets media on exercise change', async () => {
    const speechEnv = installMockSpeechSynthesis();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const storeSetStateSpy = vi.spyOn(usePilatesStore, 'setState');

    try {
      const exercise1: PilatesExercise = INITIAL_EXERCISES.find(
        (item) => item.id === 'original-mat-swan-prep',
      )!;
      const exercise2: PilatesExercise = {
        ...INITIAL_EXERCISES[0],
        id: 'ex-custom-own-media-modal-test',
        nameKo: '직접 만든 미디어 확인 동작',
        sourceReference: {
          referenceId: VERIFIED_REFERENCES[0].id,
          url: VERIFIED_REFERENCES[0].url,
          title: VERIFIED_REFERENCES[0].title,
          publisher: VERIFIED_REFERENCES[0].sourceName,
          region: VERIFIED_REFERENCES[0].region,
          verificationStatus: VERIFIED_REFERENCES[0].verificationStatus,
          verifiedAt: VERIFIED_REFERENCES[0].verifiedAt,
          rights: VERIFIED_REFERENCES[0].rights,
          rawLedgerFile: VERIFIED_REFERENCES[0].rawLedgerFile,
          rawItemId: VERIFIED_REFERENCES[0].rawItemId,
        },
      };

      const { rerender } = render(<YouTubePreviewModal exercise={exercise1} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog', { name: exercise1.nameKo });
      const gallery = within(dialog).getByTestId('exercise-video-gallery');
      expect(gallery).toBeVisible();
      expect(gallery.querySelectorAll('img').length).toBeGreaterThanOrEqual(2);
      expect(within(gallery).getByRole('link', { name: /YouTube 원본/ })).toBeVisible();
      expect(dialog.querySelector('iframe')).toBeNull();
      const voiceDrawer = within(dialog).getByTestId('detail-voice-media-drawer');
      expect(voiceDrawer).not.toHaveAttribute('open');
      expect(within(dialog).queryByTestId('movement-media-guidance-panel')).not.toBeInTheDocument();
      expect(speechEnv.speakCalls).toHaveLength(0);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(storeSetStateSpy).not.toHaveBeenCalled();

      // Explicit video loading stays in the primary gallery when narration opens.
      fireEvent.click(within(gallery).getByRole('button', { name: /인베드 영상 불러오기/ }));
      const videoFrame = gallery.querySelector('iframe')!;
      expect(videoFrame).toHaveAttribute('src', expect.stringContaining('autoplay=0'));
      fireEvent.click(voiceDrawer.querySelector('summary')!);
      const mediaPanel = await within(dialog).findByTestId('movement-media-guidance-panel');
      expect(mediaPanel).toHaveAttribute('data-exercise-id', exercise1.id);
      expect(
        within(mediaPanel).getByRole('group', { name: '한국어 음성 설명 제어' }),
      ).toBeVisible();
      expect(
        within(mediaPanel).queryByTestId('external-original-source-link'),
      ).not.toBeInTheDocument();
      expect(within(mediaPanel).queryByTestId('manual-load-video-btn')).not.toBeInTheDocument();
      expect(
        within(mediaPanel).queryByRole('group', { name: '매칭된 공개 참고 출처 선택' }),
      ).not.toBeInTheDocument();
      expect(within(mediaPanel).queryByTestId('voice-script-text')).not.toBeInTheDocument();
      expect(mediaPanel.querySelector('iframe')).toBeNull();
      expect(gallery.querySelector('iframe')).toBe(videoFrame);
      expect(dialog.querySelectorAll('iframe')).toHaveLength(1);
      expect(speechEnv.speakCalls).toHaveLength(0);

      // Start narration, then switch subjects: both active media sessions end.
      fireEvent.click(within(mediaPanel).getByTestId('voice-play-btn'));
      expect(speechEnv.speakCalls).toHaveLength(1);
      const cancellationCount = speechEnv.cancelSpy.mock.calls.length;

      rerender(<YouTubePreviewModal exercise={exercise2} onClose={vi.fn()} />);
      const nextDialog = screen.getByRole('dialog', { name: exercise2.nameKo });
      const nextDrawer = within(nextDialog).getByTestId('detail-voice-media-drawer');
      expect(nextDrawer).not.toHaveAttribute('open');
      expect(
        within(nextDialog).queryByTestId('movement-media-guidance-panel'),
      ).not.toBeInTheDocument();
      expect(within(nextDialog).getByTestId('exercise-video-gallery')).toBeVisible();
      expect(videoFrame).not.toBeInTheDocument();
      expect(mediaPanel).not.toBeInTheDocument();
      expect(nextDialog.querySelector('iframe')).toBeNull();
      expect(speechEnv.cancelSpy.mock.calls.length).toBeGreaterThan(cancellationCount);
      expect(speechEnv.speakCalls).toHaveLength(1);

      fireEvent.click(nextDrawer.querySelector('summary')!);
      const nextPanel = await within(nextDialog).findByTestId('movement-media-guidance-panel');
      expect(nextPanel).toHaveAttribute('data-exercise-id', exercise2.id);
      expect(within(nextPanel).getByRole('group', { name: '한국어 음성 설명 제어' })).toBeVisible();
      expect(within(nextPanel).queryByTestId('manual-load-video-btn')).not.toBeInTheDocument();
      expect(nextDialog.querySelector('iframe')).toBeNull();
      expect(speechEnv.speakCalls).toHaveLength(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(storeSetStateSpy).not.toHaveBeenCalled();
    } finally {
      speechEnv.restore();
    }
  });
});
