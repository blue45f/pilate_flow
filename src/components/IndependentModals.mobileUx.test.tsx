import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LiveStageView } from './LiveStageView';
import {
  OfflinePresetPicker,
  PRESET_PICKER_DRAFT_STORAGE_KEY,
} from './OfflinePresetPicker';
import {
  FreeAiAssistantPanel,
  FREE_AI_DRAFT_STORAGE_KEY,
} from './FreeAiAssistantPanel';
import { RecoveryPreview } from './RecoveryPreview';
import { createFreeAiClient } from '../lib/freeAiClient';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { OFFLINE_BLOCK_PRESETS, OFFLINE_CLASS_PRESETS } from '../data/classBlockPresets';
import { usePilatesStore } from '../store/usePilatesStore';
import { exerciseRevision } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { ConditionTemplate, PilatesExercise, SequenceStep } from '../types/pilates';

const originalStoreState = usePilatesStore.getState();

function makeApprovedExercise(
  overrides: Partial<PilatesExercise> & { id: string; nameKo: string },
): PilatesExercise {
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
    cues: overrides.cues ?? [
      '갈비뼈를 부드럽게 닫아 골반 중립과 코어 연결을 끝까지 유지하세요.',
    ],
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
    review: {
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
  makeApprovedExercise({
    id: 'ex-mobile-warmup',
    nameKo: '리포머 호흡과 골반 중립 정렬 워밍업',
    blockCategory: 'warmup',
    defaultDurationMin: 10,
  }),
  makeApprovedExercise({
    id: 'ex-mobile-core',
    nameKo: '헌드레드 딥코어 호흡 연결 프렙',
    blockCategory: 'core',
    defaultDurationMin: 15,
  }),
  makeApprovedExercise({
    id: 'ex-mobile-cooldown',
    nameKo: '머메이드 흉곽 확장 쿨다운 스트레치',
    blockCategory: 'cooldown',
    defaultDurationMin: 10,
  }),
];

const SAMPLE_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'tpl-mobile-50',
    name: '오전 리포머 코어 정렬 50분',
    createdAt: '2026-11-01T00:00:00.000Z',
    criteria: {
      apparatus: 'reformer',
      level: '1.5',
      focusPreset: 'core-sculpt',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 50,
      defaultLayer: 'standard',
    },
  },
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...originalStoreState,
      activeSequenceId: 'mobile-ux-draft',
      activeTitle: '모바일 스테이지 검증 수업',
      activeSteps: [],
      undoStack: [],
      historyLogs: [],
      exercises: [...INITIAL_EXERCISES, ...SAMPLE_EXERCISES],
      classGroups: INITIAL_CLASS_GROUPS,
      activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  usePilatesStore.setState(originalStoreState, true);
});

describe('Wave 1-4 Independent Modals & Stage Mobile UX', () => {
  describe('OfflinePresetPicker step guide & sessionStorage recovery', () => {
    it('renders the 2-step guided header and preserves filtered/selected preset in sessionStorage (pf_preset_picker_draft_v1) across close/reopen', () => {
      const onApplied = vi.fn();
      const { unmount } = render(<OfflinePresetPicker onApplied={onApplied} />);

      const stepGuide = screen.getByTestId('preset-picker-step-guide');
      expect(stepGuide).toHaveTextContent('1 프리셋 조건·목록에서 선택');
      expect(stepGuide).toHaveTextContent('2 구성 확인 후 수업안에 불러오기');

      const stepItems = within(stepGuide).getAllByRole('listitem');
      expect(stepItems).toHaveLength(2);
      expect(stepItems[0]).toHaveAttribute('aria-current', 'step');
      expect(stepItems[1]).not.toHaveAttribute('aria-current');

      // Filter by block tab & apparatus and select a preset
      fireEvent.click(screen.getByRole('button', { name: /연계 동작 묶음/ }));
      fireEvent.change(screen.getByLabelText('프리셋 기구'), {
        target: { value: 'reformer' },
      });

      const targetBlockPreset = OFFLINE_BLOCK_PRESETS.find(
        (item) => item.apparatus === 'reformer',
      )!;
      fireEvent.click(
        screen.getByRole('button', { name: new RegExp(targetBlockPreset.title) }),
      );

      // Step 2 becomes current once a preset is selected
      expect(stepItems[0]).not.toHaveAttribute('aria-current');
      expect(stepItems[1]).toHaveAttribute('aria-current', 'step');
      expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
        targetBlockPreset.title,
      );

      // Verify sessionStorage (pf_preset_picker_draft_v1) saved the draft
      const savedRaw = sessionStorage.getItem(PRESET_PICKER_DRAFT_STORAGE_KEY);
      expect(savedRaw).toBeTruthy();
      const savedParsed = JSON.parse(savedRaw!);
      expect(savedParsed).toMatchObject({
        kind: 'block',
        apparatus: 'reformer',
        selectedPreset: {
          kind: 'block',
          id: targetBlockPreset.id,
        },
      });

      // Simulate modal close and reopen
      unmount();
      render(<OfflinePresetPicker onApplied={onApplied} />);

      expect(screen.getByLabelText('프리셋 기구')).toHaveValue('reformer');
      expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
        targetBlockPreset.title,
      );
      const reopenedSteps = within(
        screen.getByTestId('preset-picker-step-guide'),
      ).getAllByRole('listitem');
      expect(reopenedSteps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('renders empty filter state cleanly when no preset matches narrow criteria', () => {
      render(<OfflinePresetPicker onApplied={vi.fn()} />);
      const matPreset = OFFLINE_CLASS_PRESETS.find((item) => item.apparatus === 'mat');
      const unusedMinutes = [15, 20, 30, 45, 50, 60].find(
        (min) =>
          !OFFLINE_CLASS_PRESETS.some(
            (item) => item.apparatus === 'barrel' && item.durationMinutes === min,
          ),
      );
      expect(matPreset).toBeDefined();
      if (unusedMinutes) {
        fireEvent.change(screen.getByLabelText('프리셋 기구'), {
          target: { value: 'barrel' },
        });
        fireEvent.change(screen.getByLabelText('프리셋 계획 시간'), {
          target: { value: String(unusedMinutes) },
        });
        expect(
          screen.getByText(/조건에 맞는 프리셋이 없어요\. 기구·주제·시간을 넓혀 보세요/),
        ).toBeInTheDocument();
      }
    });
  });

  describe('FreeAiAssistantPanel step guide, sessionStorage draft preservation, and mobile states', () => {
    it('renders the 3-step guide (ai-assistant-step-guide) and preserves unsaved prompt/input state in sessionStorage (pf_free_ai_draft_v1) across close/reopen', async () => {
      const onApplyDraftSequence = vi.fn();
      const { unmount } = render(
        <FreeAiAssistantPanel
          exercises={SAMPLE_EXERCISES}
          conditionTemplates={SAMPLE_TEMPLATES}
          onApplyDraftSequence={onApplyDraftSequence}
        />,
      );

      const stepGuide = screen.getByTestId('ai-assistant-step-guide');
      expect(stepGuide).toHaveTextContent('1 수업 조건·요청 입력');
      expect(stepGuide).toHaveTextContent('2 추천 초안 검토');
      expect(stepGuide).toHaveTextContent('3 수업안에 반영');

      // Enter custom unsaved inputs in Tab 1 and Tab 2
      fireEvent.change(screen.getByLabelText('수업 시간 (분)'), {
        target: { value: '45' },
      });
      fireEvent.change(screen.getByLabelText('수업 주제'), {
        target: { value: '320px 모바일 견갑골 안정화 및 흉추 분절 리포머 플로우' },
      });

      fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
      fireEvent.change(screen.getByLabelText('새 동작 아이디어 설명'), {
        target: {
          value: '롱박스 위에서 스트랩을 당기며 흉추 신전과 코어 호흡을 연결하는 변형 동작',
        },
      });
      fireEvent.change(screen.getByLabelText('기반 동작명 (선택)'), {
        target: { value: 'Pulling Straps' },
      });

      const savedRaw = sessionStorage.getItem(FREE_AI_DRAFT_STORAGE_KEY);
      expect(savedRaw).toBeTruthy();
      expect(JSON.parse(savedRaw!)).toMatchObject({
        activeTab: 'movement-idea',
        draftMinutes: 45,
        draftTheme: '320px 모바일 견갑골 안정화 및 흉추 분절 리포머 플로우',
        rawIdeaText: '롱박스 위에서 스트랩을 당기며 흉추 신전과 코어 호흡을 연결하는 변형 동작',
        baseExerciseName: 'Pulling Straps',
      });

      // Close and reopen without saving
      unmount();
      render(
        <FreeAiAssistantPanel
          exercises={SAMPLE_EXERCISES}
          conditionTemplates={SAMPLE_TEMPLATES}
          onApplyDraftSequence={onApplyDraftSequence}
        />,
      );

      // Restores activeTab ('movement-idea') and unsaved prompt inputs
      expect(
        screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }),
      ).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByLabelText('새 동작 아이디어 설명')).toHaveValue(
        '롱박스 위에서 스트랩을 당기며 흉추 신전과 코어 호흡을 연결하는 변형 동작',
      );
      expect(screen.getByLabelText('기반 동작명 (선택)')).toHaveValue('Pulling Straps');

      // Switch back to Tab 1 and verify Tab 1 unsaved inputs were also preserved
      fireEvent.click(screen.getByRole('tab', { name: '1. 수업 초안 만들기' }));
      expect(screen.getByLabelText('수업 시간 (분)')).toHaveValue(45);
      expect(screen.getByLabelText('수업 주제')).toHaveValue(
        '320px 모바일 견갑골 안정화 및 흉추 분절 리포머 플로우',
      );

      // Step 1 -> Step 2 (generate draft) -> Step 3 (apply to plan)
      fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
      await waitFor(() => {
        expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
      });

      const stepsAfterGenerate = within(
        screen.getByTestId('ai-assistant-step-guide'),
      ).getAllByRole('listitem');
      expect(stepsAfterGenerate).toHaveLength(3);
      expect(stepsAfterGenerate[1]).toHaveAttribute('aria-current', 'step');

      fireEvent.click(screen.getByRole('button', { name: '워크벤치 수업안에 반영' }));
      expect(onApplyDraftSequence).toHaveBeenCalledTimes(1);
      expect(stepsAfterGenerate[2]).toHaveAttribute('aria-current', 'step');
    });

    it('renders loading, validation error, and empty states cleanly', async () => {
      let rejectAssist!: (err: Error) => void;
      const slowClient = createFreeAiClient({
        transport: {
          getStatus: async () => ({
            provider: 'openrouter-free',
            model: 'openrouter/free',
            enabled: true,
            exhausted: false,
            reason: 'ready',
            minuteLimit: 20,
            minuteUsed: 0,
            minuteRemaining: 20,
            dailyLimit: 50,
            dailyUsed: 0,
            dailyRemaining: 50,
            activeRequests: 0,
            maxConcurrentRequests: 1,
            cacheEntries: 0,
            statusMessageKo: '정상',
            renewal: null,
          }),
          postAssist: () =>
            new Promise((_, reject) => {
              rejectAssist = reject;
            }),
        },
      });

      render(
        <FreeAiAssistantPanel
          exercises={[]}
          conditionTemplates={SAMPLE_TEMPLATES}
          client={slowClient}
          initialTab="movement-idea"
        />,
      );

      // Validation error when idea text is too short
      fireEvent.click(screen.getByRole('button', { name: '아이디어 정리하기' }));
      expect(screen.getByRole('alert')).toHaveTextContent(
        '새 동작 아이디어를 2자 이상 입력해 주세요.',
      );

      // Trigger loading banner on external request
      fireEvent.change(screen.getByLabelText('새 동작 아이디어 설명'), {
        target: { value: '캐딜락 롤다운 바를 활용한 분절 움직임' },
      });
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: '무료 AI로 아이디어·변형 정리' }),
        ).toBeEnabled();
      });
      fireEvent.click(screen.getByRole('button', { name: '무료 AI로 아이디어·변형 정리' }));
      const loadingBanner = screen.getByTestId('free-ai-loading-banner');
      expect(loadingBanner).toHaveTextContent(
        '새 동작 아이디어·변형 초안을 준비하고 있어요…',
      );
      expect(
        within(loadingBanner).getByRole('button', { name: '요청 취소' }),
      ).toBeEnabled();

      await act(async () => {
        rejectAssist(new Error('일시적 네트워크 지연'));
      });
    });
  });

  describe('RecoveryPreview & LiveStageView mobile states', () => {
    it('renders RecoveryPreview unchanged empty state and format error state cleanly', async () => {
      const ex = syntheticPlanningExercise('mat', 'core', 'alpha', false);
      usePilatesStore.setState({
        ...originalStoreState,
        exercises: [structuredClone(ex)],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        activeSteps: [],
      });

      render(<RecoveryPreview />);

      // 1. Format error state
      const badFile = new File(['{ "invalid": true }'], 'bad.json', {
        type: 'application/json',
      });
      Object.defineProperty(badFile, 'text', {
        value: vi.fn().mockResolvedValue('{ "invalid": true }'),
      });
      fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), {
        target: { files: [badFile] },
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '백업의 필수 자료·조건·블록 형식이 올바르지 않습니다.',
      );
      fireEvent.click(screen.getByRole('button', { name: '닫기' }));

      // 2. Unchanged backup empty state
      const unchangedRaw = JSON.stringify({
        format: 'pilates-flow-atelier',
        version: 3,
        exportedAt: '2026-11-08T10:00:00.000Z',
        data: {
          exercises: [ex],
          savedSequences: [],
          classGroups: [],
          historyLogs: [],
        },
      });
      const unchangedFile = new File([unchangedRaw], 'unchanged.json', {
        type: 'application/json',
      });
      Object.defineProperty(unchangedFile, 'text', {
        value: vi.fn().mockResolvedValue(unchangedRaw),
      });
      fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), {
        target: { files: [unchangedFile] },
      });

      expect(await screen.findByRole('region', { name: '복구 전 확인' })).toBeInTheDocument();
      expect(
        screen.getByText('추가하거나 바꿀 자료가 없습니다. 현재 자료를 그대로 유지합니다.'),
      ).toHaveClass('recovery-empty-state');
    });

    it('renders LiveStageView step progress indicator (현재 동작 N / 전체 M · 다음 할 일) and updates across steps', () => {
      const stageSteps: SequenceStep[] = [
        {
          stepId: 'stage-step-1',
          order: 1,
          exerciseId: SAMPLE_EXERCISES[0].id,
          blockCategory: 'warmup',
          durationMin: 2,
          selectedLayer: 'standard',
        },
        {
          stepId: 'stage-step-2',
          order: 2,
          exerciseId: SAMPLE_EXERCISES[1].id,
          blockCategory: 'core',
          durationMin: 3,
          selectedLayer: 'standard',
        },
      ];
      usePilatesStore.setState({
        activeSteps: stageSteps,
        exercises: [...INITIAL_EXERCISES, ...SAMPLE_EXERCISES],
      });

      render(<LiveStageView onOpenLogModal={vi.fn()} />);

      const progressBanner = screen.getByTestId('live-stage-step-progress');
      expect(progressBanner).toHaveTextContent('현재 동작 1 / 전체 2');
      expect(progressBanner).toHaveTextContent(
        `다음 할 일: ${SAMPLE_EXERCISES[1].nameKo} 준비`,
      );

      // Advance to step 2
      fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
      expect(progressBanner).toHaveTextContent('현재 동작 2 / 전체 2');
      expect(progressBanner).toHaveTextContent('다음 할 일: 마무리 후 종료 · 기록');

      // Toggle cue sheet
      const cueSheetBtn = screen.getByRole('button', { name: '큐시트 보기' });
      fireEvent.click(cueSheetBtn);
      expect(screen.getByRole('region', { name: '수업 진행 큐시트' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '큐시트 닫기' })).toBeInTheDocument();
    });

    it('enforces >= 44px touch targets, static header utility layout, and word-break/overflow-wrap rules in component CSS files', () => {
      const stageCss = readFileSync(
        resolve(__dirname, './LiveStageView.css'),
        'utf8',
      );
      const presetCss = readFileSync(
        resolve(__dirname, './OfflinePresetPicker.css'),
        'utf8',
      );
      const aiCss = readFileSync(
        resolve(__dirname, './FreeAiAssistantPanel.css'),
        'utf8',
      );
      const recoveryCss = readFileSync(
        resolve(__dirname, './RecoveryPreview.css'),
        'utf8',
      );

      expect(stageCss).toContain('position: static !important');
      expect(stageCss).toContain('min-height: 44px');
      expect(stageCss).toContain('word-break: keep-all');
      expect(stageCss).toContain('overflow-wrap: anywhere');

      expect(presetCss).toContain('min-height: 44px');
      expect(presetCss).toContain('word-break: keep-all');
      expect(presetCss).toContain('overflow-wrap: anywhere');

      expect(aiCss).toContain('min-height: 44px');
      expect(aiCss).toContain('word-break: keep-all');
      expect(aiCss).toContain('overflow-wrap: anywhere');

      expect(recoveryCss).toContain('min-height: 44px');
      expect(recoveryCss).toContain('overflow-wrap: anywhere');
    });
  });
});
