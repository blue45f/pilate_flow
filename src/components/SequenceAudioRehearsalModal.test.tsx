import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { movementMediaSessionCoordinator } from '../utils/koreanVoiceNarration';
import { createNaturalVoiceAudioCache } from '../utils/naturalVoiceEngine';
import { NaturalVoiceSpeakButton } from './NaturalVoiceSpeakButton';
import { SequenceAudioRehearsalModal } from './SequenceAudioRehearsalModal';

class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onerror:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown)
    | null = null;

  constructor(text = '') {
    this.text = text;
  }
}

function createMockVoiceEnv(withVoice = true) {
  const voice: SpeechSynthesisVoice = {
    name: 'Yuna (Enhanced)',
    lang: 'ko-KR',
    localService: true,
    default: true,
    voiceURI: 'Yuna (Enhanced)',
  };
  const spoken: MockUtterance[] = [];
  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    spoken,
    getVoices: vi.fn(() => (withVoice ? [voice] : [])),
    speak: vi.fn((u: SpeechSynthesisUtterance) => {
      synth.speaking = true;
      spoken.push(u as unknown as MockUtterance);
    }),
    cancel: vi.fn(() => {
      synth.speaking = false;
    }),
  };

  return {
    synth,
    env: {
      speechSynthesis: synth as unknown as SpeechSynthesis,
      SpeechSynthesisUtterance: MockUtterance as unknown as typeof SpeechSynthesisUtterance,
      AudioContextCtor: null,
      enableCloud: false,
      audioCache: createNaturalVoiceAudioCache(null),
    },
  };
}

const sampleExercises = INITIAL_EXERCISES.slice(0, 6);
const sampleExercisesById = new Map<string, PilatesExercise>(
  sampleExercises.map((ex) => [ex.id, ex]),
);
const sampleSteps: SequenceStep[] = sampleExercises.map((ex, idx) => ({
  stepId: `step-${idx + 1}`,
  order: idx + 1,
  blockCategory: ex.blockCategory,
  exerciseId: ex.id,
  durationMin: ex.defaultDurationMin,
  selectedLayer: 'standard',
}));

describe('SequenceAudioRehearsalModal & NaturalVoiceSpeakButton', () => {
  beforeEach(() => {
    movementMediaSessionCoordinator.resetForTests();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('never auto-plays on open, uses friendly Korean copy (zero TTS jargon), and switches across all 4 modes', async () => {
    const { synth, env } = createMockVoiceEnv(true);
    const onClose = vi.fn();

    render(
      <SequenceAudioRehearsalModal
        open={true}
        onClose={onClose}
        sequenceTitle="오전 리포머 베이직"
        steps={sampleSteps}
        exercisesById={sampleExercisesById}
        preferCloud={false}
        engineOptions={env}
      />,
    );

    // Zero auto-play on mount
    expect(synth.speak).not.toHaveBeenCalled();

    // Friendly Korean copy — never leaks 'TTS' jargon
    expect(screen.queryByText(/\bTTS\b/i)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /이어듣기/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /3분 고속/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /빈칸 퀴즈/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /호흡 템포/ })).toBeInTheDocument();

    // ① 3~4막 덩어리 청킹 지도 rendered
    expect(screen.getByLabelText('체위·스프링 덩어리 청킹 지도')).toBeInTheDocument();
    expect(screen.getByText(/1막 ·/)).toBeInTheDocument();

    // Play -> Pause in podcast mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /음성으로 듣기/ }));
    });
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /일시정지/ })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /일시정지/ }));
    });
    expect(screen.getByRole('button', { name: /이어듣기/ })).toBeInTheDocument();
    expect(synth.cancel).toHaveBeenCalled();

    // Switch to 3-min fast walkthrough (15s/exercise)
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /3분 고속/ }));
    });
    expect(screen.getByText(/3분 고속 워크스루 시작할게요/)).toBeInTheDocument();

    // Switch to Quiz mode -> masks unrevealed step names to prevent spoilers
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /빈칸 퀴즈/ }));
    });
    expect(screen.getByRole('tab', { name: /빈칸 퀴즈/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/1번 동작 \(암기 전/)).toBeInTheDocument();

    // Jump into step 1 quiz prompt and click '정답 바로 보기'
    await act(async () => {
      fireEvent.click(screen.getByText(/1번 동작 \(암기 전/));
    });
    expect(screen.getByText(/1번 동작, 기억나시나요\?/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /정답 바로 보기/ }));
    });
    expect(
      screen.getByText(new RegExp(`1번 정답.*${sampleExercises[0].nameKo}`)),
    ).toBeInTheDocument();

    // Self-check memorization toggle
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /익혔어요 체크/ }));
    });
    expect(screen.getByText(/암기 완료 1 \/ 6/)).toBeInTheDocument();

    // Switch to Breath Tempo mode
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /호흡 템포/ }));
    });
    expect(
      screen.getByText(/호흡 리듬 대기 중|코로 천천히 들숨|입으로 부드럽게 날숨/),
    ).toBeInTheDocument();
    expect(screen.getByText(/템포 3:0:5/)).toBeInTheDocument();

    // Toggle breath chimes and full script disclosure
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /호흡 알림음 켜짐/ }));
    });
    expect(screen.getByRole('button', { name: /호흡 알림음 꺼짐/ })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /전체 대본 보기/ }));
    });
    expect(screen.getByRole('region', { name: '전체 음성 대본' })).toBeInTheDocument();
  });

  it('supports 3-stage blind hiding, tap-to-peek, confused check, and confused-only focused drill', async () => {
    const { env } = createMockVoiceEnv(true);

    render(
      <SequenceAudioRehearsalModal
        open={true}
        onClose={vi.fn()}
        sequenceTitle="블라인드 암기 테스트"
        steps={sampleSteps}
        exercisesById={sampleExercisesById}
        preferCloud={false}
        engineOptions={env}
      />,
    );

    // Stage 1 (full): shows exercise name and spring
    expect(screen.getByText(sampleExercises[0].nameKo)).toBeInTheDocument();

    // Stage 2 (hide-details): keeps exercise name, hides spring & cue
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /2단계 · 스프링·큐 숨김/ }));
    });
    expect(screen.getByText(sampleExercises[0].nameKo)).toBeInTheDocument();
    expect(screen.getAllByText(/스프링·큐 숨김/).length).toBeGreaterThanOrEqual(1);

    // Stage 3 (hide-names): hides exercise name too
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /3단계 · 동작명 숨김/ }));
    });
    expect(screen.getByText(/1번 동작 \(암기 전/)).toBeInTheDocument();

    // Tap peek button to reveal step 1 temporarily
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '1번 살짝 보기' }));
    });
    expect(screen.getByText(sampleExercises[0].nameKo)).toBeInTheDocument();

    // Mark step 2 as confused -> enables confused-only focused filter
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '2번 헷갈림 체크' }));
    });
    expect(screen.getByText('헷갈림 체크 1개 동작')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /헷갈린 1개만 집중 듣기/ }));
    });
    expect(screen.getByRole('button', { name: /전체 동작으로 돌아가기/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('stops active voice playback cleanly when modal closes and handles empty sequences', async () => {
    const { synth, env } = createMockVoiceEnv(true);
    const { rerender } = render(
      <SequenceAudioRehearsalModal
        open={true}
        onClose={vi.fn()}
        sequenceTitle="빈 시퀀스 테스트"
        steps={[]}
        exercisesById={sampleExercisesById}
        preferCloud={false}
        engineOptions={env}
      />,
    );

    expect(screen.getByText(/먼저 시퀀스에 동작을 하나 이상 담아 주세요/)).toBeInTheDocument();

    rerender(
      <SequenceAudioRehearsalModal
        open={true}
        onClose={vi.fn()}
        sequenceTitle="닫기 정지 테스트"
        steps={sampleSteps}
        exercisesById={sampleExercisesById}
        preferCloud={false}
        engineOptions={env}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /음성으로 듣기/ }));
    });
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalled());

    rerender(
      <SequenceAudioRehearsalModal
        open={false}
        onClose={vi.fn()}
        sequenceTitle="닫기 정지 테스트"
        steps={sampleSteps}
        exercisesById={sampleExercisesById}
        preferCloud={false}
        engineOptions={env}
      />,
    );
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('renders NaturalVoiceSpeakButton with play/pause/stop, progress bar, quality badge, and text fallback', async () => {
    const { synth, env } = createMockVoiceEnv(true);

    render(
      <NaturalVoiceSpeakButton
        exercise={sampleExercises[0]}
        variant="card"
        preferCloud={false}
        engineOptions={env}
      />,
    );

    expect(screen.queryByText(/\bTTS\b/i)).not.toBeInTheDocument();
    expect(screen.getByText('자연스러운 강사 음성')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /음성으로 듣기/ }));
    });
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /일시정지/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '음성 정지' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '음성 정지' }));
    });
    expect(synth.cancel).toHaveBeenCalled();

    cleanup();

    // Unsupported environment offers warm Korean script disclosure without crashing
    const unsupported = createMockVoiceEnv(false);
    render(
      <NaturalVoiceSpeakButton
        exercise={sampleExercises[0]}
        variant="card"
        preferCloud={false}
        engineOptions={unsupported.env}
      />,
    );

    expect(screen.getByText('화면 대본 모드')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /대본 보기/ }));
    });
    expect(screen.getByRole('region', { name: '강사 음성 대본' })).toBeInTheDocument();
  });
});
