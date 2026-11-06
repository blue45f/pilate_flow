import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FreeAiAssistantPanel } from './FreeAiAssistantPanel';
import { createFreeAiClient } from '../lib/freeAiClient';
import type {
  ConditionTemplate,
  PilatesExercise,
} from '../types/pilates';
import type {
  FreeAiQuotaStatus,
  P1ReusableBlockContract,
} from '../types/freeAiAssistant';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';

function makeReviewedExercise(overrides: Partial<PilatesExercise> & { id: string; nameKo: string }): PilatesExercise {
  const base: PilatesExercise = {
    id: overrides.id,
    nameKo: overrides.nameKo,
    nameEn: overrides.nameEn ?? 'Pilates Movement',
    apparatus: overrides.apparatus ?? 'reformer',
    requiredEquipment: overrides.requiredEquipment ?? [overrides.apparatus ?? 'reformer'],
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['flexion', 'neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 10,
    isUnilateral: false,
    springs: overrides.springs ?? '1R 1B',
    box: 'none',
    footbar: 'mid',
    headrest: 'up',
    targetMuscles: overrides.targetMuscles ?? ['복횡근', '골반기저근'],
    breathPattern: overrides.breathPattern ?? '내쉬는 숨에 복부를 납작하게 연결',
    cues: overrides.cues ?? ['갈비뼈를 부드럽게 닫아 코어를 유지하세요.'],
    precautions: overrides.precautions ?? '목과 어깨 과긴장 주의',
    layers: overrides.layers ?? {
      easy: '가동 범위 축소',
      standard: '정석 템포 유지',
      hard: '엔드레인지 3초 유지',
    },
    youtube: {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Pilates Studio',
      videoTitle: overrides.nameKo,
      startSec: 0,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      region: 'kr',
    },
    favoriteTag: 'none',
  };
  return {
    ...base,
    review:
      'review' in overrides
        ? overrides.review
        : {
            status: 'approved',
            reviewerAlias: '수석강사',
            reviewedAt: '2026-11-01T00:00:00.000Z',
            revision: exerciseRevision(base),
            scope: 'planning-metadata',
            credentialVerified: false,
          },
  };
}

const SAMPLE_EXERCISES: PilatesExercise[] = [
  makeReviewedExercise({
    id: 'ex-warmup-1',
    nameKo: '리포머 호흡 워밍업',
    blockCategory: 'warmup',
    defaultDurationMin: 10,
  }),
  makeReviewedExercise({
    id: 'ex-core-1',
    nameKo: '헌드레드 코어 프렙',
    blockCategory: 'core',
    defaultDurationMin: 15,
  }),
  makeReviewedExercise({
    id: 'ex-glute-1',
    nameKo: '펠빅 컬 브릿징',
    blockCategory: 'bridging',
    defaultDurationMin: 15,
  }),
  makeReviewedExercise({
    id: 'ex-cool-1',
    nameKo: '머메이드 쿨다운 스트레치',
    blockCategory: 'cooldown',
    defaultDurationMin: 10,
  }),
  {
    ...makeReviewedExercise({
      id: 'ex-unreviewed-99',
      nameKo: '미검토 실험 동작',
      blockCategory: 'core',
    }),
    review: undefined,
  },
];

const SAMPLE_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'tpl-morning-40',
    name: '오전 코어 집중 40분',
    createdAt: '2026-11-01T00:00:00.000Z',
    criteria: {
      apparatus: 'reformer',
      level: '1.0',
      focusPreset: 'core-sculpt',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 40,
      defaultLayer: 'easy',
    },
  },
];

const SAMPLE_BLOCKS: P1ReusableBlockContract[] = [
  {
    id: 'blk-reviewed-1',
    title: '코어·브릿지 기본 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'bridging',
    durationMin: 15,
    isReviewed: true,
    steps: [
      {
        exerciseId: 'ex-glute-1',
        blockCategory: 'bridging',
        durationMin: 15,
        selectedLayer: 'standard',
      },
    ],
  },
  {
    id: 'blk-unreviewed-2',
    title: '미검토 실험 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'core',
    durationMin: 10,
    isReviewed: false,
    steps: [
      {
        exerciseId: 'ex-unreviewed-99',
        blockCategory: 'core',
        durationMin: 10,
        selectedLayer: 'standard',
      },
    ],
  },
];

describe('FreeAiAssistantPanel UI journeys', () => {
  it('renders without any BYOK API key input and supports local recommendation, preset loading, and editable class drafts when server AI is unconfigured', async () => {
    const unconfiguredClient = createFreeAiClient({
      transport: {
        getStatus: async () => ({
          provider: 'none',
          model: null,
          enabled: false,
          exhausted: false,
          reason: 'unconfigured',
          minuteLimit: 0,
          minuteUsed: 0,
          minuteRemaining: 0,
          dailyLimit: 0,
          dailyUsed: 0,
          dailyRemaining: 0,
          activeRequests: 0,
          maxConcurrentRequests: 1,
          cacheEntries: 0,
          statusMessageKo:
            '무료 서버/API 구성이 없어 외부 AI는 비활성화되었습니다. 로컬 추천·수동 편집·저장 프리셋을 사용하세요.',
          renewal: null,
        }),
        postAssist: vi.fn().mockRejectedValue(new Error('unconfigured')),
      },
    });

    const onApplyDraftSequence = vi.fn();
    const onApplyConditionTemplate = vi.fn();

    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={unconfiguredClient}
        onApplyDraftSequence={onApplyDraftSequence}
        onApplyConditionTemplate={onApplyConditionTemplate}
      />,
    );

    // Verify no BYOK / password / API key input exists anywhere in the panel
    expect(screen.queryByPlaceholderText(/api key|sk-|AIza/i)).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.getByText('키 설정 불필요 · 무료 전용')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: '외부 AI 비활성화 및 로컬 모드 안내' }),
      ).toBeInTheDocument();
    });

    // External AI button should be disabled when server AI is unconfigured, while local button is active
    expect(screen.getByRole('button', { name: '외부 AI 비활성화됨' })).toBeDisabled();

    // Load saved preset
    fireEvent.change(screen.getByLabelText('저장된 조건 프리셋'), {
      target: { value: 'tpl-morning-40' },
    });
    expect(onApplyConditionTemplate).toHaveBeenCalledWith('tpl-morning-40');

    // Generate class draft using local rule engine
    fireEvent.click(screen.getByRole('button', { name: '로컬 조건 추천으로 초안 만들기' }));

    await waitFor(() => {
      expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
    });

    // Edit the generated draft title and step note
    const titleInput = screen.getByLabelText('초안 제목 편집') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '내가 직접 수정한 40분 코어 수업' } });
    expect(titleInput.value).toBe('내가 직접 수정한 40분 코어 수업');

    // Apply edited draft to workbench
    fireEvent.click(screen.getByRole('button', { name: '워크벤치 수업안에 반영' }));
    expect(onApplyDraftSequence).toHaveBeenCalledTimes(1);
    expect(onApplyDraftSequence.mock.calls[0][0].title).toBe('내가 직접 수정한 40분 코어 수업');
    expect(onApplyDraftSequence.mock.calls[0][0].targetMinutes).toBe(40);
  });

  it('organizes new movement ideas and 3-layer variations, allows user editing, and never guarantees safety or auto-approves unreviewed creative movements', async () => {
    const onSaveUnreviewedMovementIdea = vi.fn();
    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        conditionTemplates={SAMPLE_TEMPLATES}
        onSaveUnreviewedMovementIdea={onSaveUnreviewedMovementIdea}
        initialTab="movement-idea"
      />,
    );

    // Enter sensitive health text first -> verify immediate warning and external AI button block
    const ideaTextarea = screen.getByLabelText('새 동작 아이디어 설명');
    fireEvent.change(ideaTextarea, {
      target: { value: '허리 디스크 수술 환자를 위한 브릿지 변형' },
    });
    expect(screen.getByText(/무료 외부 AI로 전송할 수 없습니다/)).toBeInTheDocument();

    // Replace with safe movement idea description
    fireEvent.change(ideaTextarea, {
      target: { value: '발바닥 아치로 풋바를 밀며 골반을 분절해 올리는 아티큘레이션 변형' },
    });

    fireEvent.click(screen.getByRole('button', { name: '로컬 규칙으로 아이디어·변형 정리' }));

    await waitFor(() => {
      expect(screen.getByLabelText('동작 이름 (국문) 편집')).toBeInTheDocument();
    });

    // Explicit unreviewed creative disclaimer is shown
    expect(
      screen.getByText('미검토 창작 동작 · 안전 및 운동 효과 보장 안 함'),
    ).toBeInTheDocument();

    // User edits the movement name and easy variation
    fireEvent.change(screen.getByLabelText('동작 이름 (국문) 편집'), {
      target: { value: '리포머 아치 서포트 브릿지 변형' },
    });
    fireEvent.change(screen.getByLabelText('쉬운 변형 (Easy) 편집'), {
      target: { value: '가동 범위를 절반으로 줄이고 호흡에 집중합니다.' },
    });

    // Save as unreviewed creative movement
    fireEvent.click(
      screen.getByRole('button', { name: '미검토 창작 동작으로 보관함에 저장' }),
    );

    expect(onSaveUnreviewedMovementIdea).toHaveBeenCalledTimes(1);
    const [savedExercise, savedContract] = onSaveUnreviewedMovementIdea.mock.calls[0];
    expect(savedExercise.nameKo).toBe('리포머 아치 서포트 브릿지 변형');
    expect(savedExercise.layers.easy).toBe('가동 범위를 절반으로 줄이고 호흡에 집중합니다.');
    expect(savedExercise.review).toBeUndefined();
    expect(isExerciseAutoEligible(savedExercise)).toBe(false);
    expect(savedContract.reviewStatus).toBe('unreviewed-creative');
    expect(savedContract.guaranteesSafetyOrEffect).toBe(false);
  });

  it('composes a sequence strictly from reviewed movements/blocks, excludes unreviewed items, and blocks AI calls when free quota is exhausted with renewal info', async () => {
    const exhaustedStatus: FreeAiQuotaStatus = {
      provider: 'openrouter-free',
      model: 'openrouter/free',
      enabled: true,
      exhausted: true,
      reason: 'free_quota_exhausted',
      minuteLimit: 20,
      minuteUsed: 20,
      minuteRemaining: 0,
      dailyLimit: 50,
      dailyUsed: 50,
      dailyRemaining: 0,
      activeRequests: 0,
      maxConcurrentRequests: 1,
      cacheEntries: 2,
      statusMessageKo:
        '무료 사용량 소진: 일일 무료 호출 한도(50회)를 모두 사용했습니다. 외부 AI 호출이 차단되었습니다.',
      renewal: {
        resetAt: '2026-11-07T00:00:00.000Z',
        resetWindow: 'daily',
        resetTimezone: 'UTC',
        remainingSeconds: 3600,
        formattedResetKo: 'UTC 자정(00:00 UTC) 일일 무료 한도 갱신 · 약 1시간 0분 후',
        policyNoteKo: '유료 자동 전환 및 결제 비활성화',
      },
    };

    const postAssistSpy = vi.fn();
    const exhaustedClient = createFreeAiClient({
      now: () => Date.parse('2026-11-06T23:00:00.000Z'),
      transport: {
        getStatus: async () => exhaustedStatus,
        postAssist: postAssistSpy,
      },
    });

    const onApplyDraftSequence = vi.fn();

    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={exhaustedClient}
        onApplyDraftSequence={onApplyDraftSequence}
        initialTab="sequence-compose"
      />,
    );

    // Wait for exhausted status banner and verifiable renewal info
    await waitFor(() => {
      expect(screen.getByRole('alert', { name: '무료 사용량 소진 안내' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('free-ai-renewal-info')).toHaveTextContent(
      '2026-11-07T00:00:00.000Z',
    );
    expect(screen.getByTestId('free-ai-renewal-info')).toHaveTextContent('UTC');

    // External AI button is disabled and shows "무료 사용량 소진 (호출 차단됨)"
    const externalBtn = screen.getByRole('button', { name: '무료 사용량 소진 (호출 차단됨)' });
    expect(externalBtn).toBeDisabled();
    expect(postAssistSpy).not.toHaveBeenCalled();

    // Local composition from reviewed movements/blocks still works while exhausted
    fireEvent.click(screen.getByRole('button', { name: '로컬 규칙으로 시퀀스 구성' }));

    await waitFor(() => {
      expect(screen.getByLabelText('시퀀스 제목 편집')).toBeInTheDocument();
    });

    // Ensure postAssist was NEVER called
    expect(postAssistSpy).not.toHaveBeenCalled();

    // Edit title and apply to workbench
    fireEvent.change(screen.getByLabelText('시퀀스 제목 편집'), {
      target: { value: '검토 완료 블록·동작 50분 시퀀스' },
    });
    fireEvent.click(screen.getByRole('button', { name: '워크벤치 수업안에 반영' }));

    expect(onApplyDraftSequence).toHaveBeenCalledTimes(1);
    const applied = onApplyDraftSequence.mock.calls[0][0];
    expect(applied.title).toBe('검토 완료 블록·동작 50분 시퀀스');
    // Unreviewed exercise ex-unreviewed-99 must never be in applied steps
    expect(applied.steps.some((s: { exerciseId: string }) => s.exerciseId === 'ex-unreviewed-99')).toBe(
      false,
    );
  });
});
