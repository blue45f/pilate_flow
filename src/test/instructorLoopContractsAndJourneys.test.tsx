import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../components/ClassBinderView';
import { ExerciseVideoGallery } from '../components/ExerciseVideoGallery';
import { LiveStageView } from '../components/LiveStageView';
import { LogSessionModal } from '../components/LogSessionModal';
import { SequencePlanPreview } from '../components/SequencePlanPreview';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { StudioCommandPalette } from '../components/StudioCommandPalette';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { YouTubePreviewModal } from '../components/YouTubePreviewModal';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { getActiveSequenceSaveState, usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import { formatBrandSpringEquivalent } from '../utils/brandSpringConverter';
import {
  formatActualDurationDetailText,
  formatActualDurationSummaryPill,
  formatWholeSecondsToMMSS,
} from '../utils/durationFormat';
import { isImeComposing } from '../utils/imeGuard';
import { addScheduleDays, localScheduleDate } from '../utils/instructorSchedule';
import { getSequenceDurations, getStepTiming } from '../utils/sequenceEngine';
import {
  addSharedSequenceComment,
  applySharedSequenceEdit,
  forkSharedSequenceToLocal,
  readSharedSequence,
  revokeSharedAccess,
  validateMinimalSharedScheduleContext,
  type SharedSequenceRecord,
} from '../utils/teamSharingPolicy';
import {
  buildSafeTransitionOptimization,
  describeStepTransitionFromPrevious,
  isUnknownSpringSetup,
} from '../utils/transitionSummary';
import { syntheticPlanningExercise } from './planningFixtures';

// Fast deterministic rendering in jsdom; real browser artwork/3D verified via Chromium E2E.
vi.mock('../components/ExerciseMotionArtwork', () => ({
  ExerciseMotionArtwork: ({
    exercise,
    decorative,
  }: {
    exercise: PilatesExercise;
    decorative?: boolean;
  }) => (
    <span
      data-testid={`artwork-${exercise.id}`}
      aria-label={decorative ? undefined : `${exercise.nameKo} 정적 참조 도해`}
    />
  ),
}));

const baselineStore = usePilatesStore.getState();

// --- PII-Free Synthetic Verification Fixture ---
// Locations A & B with distinct apparatus profiles, 45-min plan, 2 instances of same exercise,
// unilateral step, locked step, rest/transition, video valid / broken / unverified.
const reformerWarmupVideoUnverified: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'warmup'),
  id: 'syn-ref-warmup-breath',
  nameKo: '합성 리포머 호흡 예열',
  nameEn: 'Synthetic Reformer Breath Prep',
  defaultDurationMin: 5,
  springs: '2R 1B',
  box: 'none',
  footbar: 'high',
  headrest: 'flat',
  props: ['mini-ball'],
  youtube: {
    videoId: '',
    channelName: '출처 미확인',
    videoTitle: '',
    startSec: 0,
    url: '',
  },
};

const reformerFootworkValidVideo: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'footwork'),
  id: 'syn-ref-footwork-locked',
  nameKo: '합성 리포머 패럴렐 풋워크',
  nameEn: 'Synthetic Reformer Parallel Footwork',
  defaultDurationMin: 8,
  springs: '2R 1B',
  box: 'none',
  footbar: 'high',
  headrest: 'up',
  props: ['none'],
  youtube: {
    videoId: 'QDBzjlhKsco',
    channelName: 'Pilates Anytime',
    videoTitle: 'PA Archives | Reformer Footwork',
    startSec: 15,
    endSec: 90,
    url: 'https://www.youtube.com/watch?v=QDBzjlhKsco',
  },
};

const reformerShortBoxBrokenVideo: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'core'),
  id: 'syn-ref-shortbox-core',
  nameKo: '합성 리포머 숏박스 라운드백',
  nameEn: 'Synthetic Reformer Short Box Round Back',
  bodyPosition: 'seated',
  defaultDurationMin: 10,
  springs: '2R',
  box: 'short-box',
  footbar: 'down',
  headrest: 'flat',
  props: ['magic-circle'],
  youtube: {
    videoId: '',
    channelName: '깨진 링크 테스트',
    videoTitle: 'Broken URL',
    startSec: 0,
    url: 'not-a-valid-url://broken',
  },
};

const reformerUnilateralScooter: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'lower-body'),
  id: 'syn-ref-standing-scooter',
  nameKo: '합성 리포머 스탠딩 스쿠터',
  nameEn: 'Synthetic Reformer Standing Scooter',
  bodyPosition: 'standing',
  isUnilateral: true,
  defaultDurationMin: 12,
  springs: '1R',
  box: 'none',
  footbar: 'high',
  headrest: 'flat',
  props: ['none'],
};

const matReplacementCore: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'core'),
  id: 'syn-mat-core-replace',
  nameKo: '합성 매트 헌드레드 코어',
  nameEn: 'Synthetic Mat Hundred Core',
  bodyPosition: 'supine',
  defaultDurationMin: 8,
  springs: 'Bodyweight',
  props: ['magic-circle'],
};

const chairReplacementLower: PilatesExercise = {
  ...syntheticPlanningExercise('chair', 'lower-body'),
  id: 'syn-chair-pump-replace',
  nameKo: '합성 체어 시티드 펌프',
  nameEn: 'Synthetic Chair Seated Pump',
  bodyPosition: 'seated',
  defaultDurationMin: 8,
  springs: '2R',
  props: ['none'],
};

const matReplacementWarmup: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'warmup'),
  id: 'syn-mat-breath-replace',
  nameKo: '합성 매트 폼롤러 호흡',
  nameEn: 'Synthetic Mat Foam Roller Breath',
  bodyPosition: 'supine',
  defaultDurationMin: 5,
  springs: 'Bodyweight',
  props: ['foam-roller'],
};

const fixtureExercises: PilatesExercise[] = [
  reformerWarmupVideoUnverified,
  reformerFootworkValidVideo,
  reformerShortBoxBrokenVideo,
  reformerUnilateralScooter,
  matReplacementCore,
  chairReplacementLower,
  matReplacementWarmup,
];

const locationACriteria: AutoGenerateCriteria = {
  apparatus: 'reformer',
  ownedApparatus: ['reformer'],
  availableEquipment: ['reformer'],
  preferredProps: ['mini-ball', 'magic-circle'],
  level: '1.5',
  targetMinutes: 45,
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};

function create45MinFixtureSteps(): SequenceStep[] {
  return [
    {
      stepId: 'fix-step-1-breath-open',
      order: 1,
      blockCategory: 'warmup',
      classSection: 'preparation',
      exerciseId: reformerWarmupVideoUnverified.id,
      durationMin: 5,
      selectedLayer: 'standard',
      explanationSec: 20,
      transitionSec: 0,
      instructorNote: '오프닝 호흡 점검',
    },
    {
      stepId: 'fix-step-2-footwork-locked',
      order: 2,
      blockCategory: 'footwork',
      classSection: 'main',
      exerciseId: reformerFootworkValidVideo.id,
      durationMin: 8,
      selectedLayer: 'standard',
      locked: true,
      explanationSec: 20,
      transitionSec: 15,
    },
    {
      stepId: 'fix-step-3-shortbox',
      order: 3,
      blockCategory: 'core',
      classSection: 'main',
      exerciseId: reformerShortBoxBrokenVideo.id,
      durationMin: 10,
      selectedLayer: 'standard',
      explanationSec: 25,
      transitionSec: 30,
    },
    {
      kind: 'rest',
      stepId: 'fix-step-4-rest',
      order: 4,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
    },
    {
      stepId: 'fix-step-5-scooter-lr',
      order: 5,
      blockCategory: 'lower-body',
      classSection: 'main',
      exerciseId: reformerUnilateralScooter.id,
      durationMin: 12,
      selectedLayer: 'standard',
      sideMode: 'left-then-right',
      repetitions: 10,
      explanationSec: 20,
      transitionSec: 20,
    },
    {
      stepId: 'fix-step-6-breath-close',
      order: 6,
      blockCategory: 'cooldown',
      classSection: 'cooldown',
      exerciseId: reformerWarmupVideoUnverified.id,
      durationMin: 8,
      selectedLayer: 'easy',
      customSpringOverride: '강사가 기구별 설정',
      explanationSec: 15,
      transitionSec: 15,
      instructorNote: '마무리 호흡 이완 (동일 동작 독립 인스턴스)',
    },
  ];
}

function seedFixtureWorkspace() {
  const today = localScheduleDate();
  usePilatesStore.setState(
    {
      ...baselineStore,
      activeTab: 'workbench',
      exercises: structuredClone(fixtureExercises),
      ownedApparatus: ['reformer', 'mat', 'chair'],
      ownedEquipment: ['reformer', 'mat', 'chair'],
      ownedProps: ['mini-ball', 'magic-circle', 'foam-roller'],
      reformerBrand: 'intopilates',
      activeSequenceId: 'seq-loc-a-45',
      activeTitle: '장소 A 45분 리포머 정규 수업',
      activeSubtitle: '개인정보 없는 가상 장소 A 검증용',
      activeApparatus: 'reformer',
      activeLevel: '1.5',
      activeTargetMinutes: 45,
      activeTargetGroupId: 'grp-virtual-a',
      activeSteps: create45MinFixtureSteps(),
      draftCriteria: structuredClone(locationACriteria),
      lastCriteria: structuredClone(locationACriteria),
      savedSequences: [],
      historyLogs: [],
      classGroups: [
        {
          id: 'grp-virtual-a',
          name: '가상 그룹 A반',
          type: 'group',
          defaultLevel: '1.5',
          scheduleLabel: '화·목 저녁',
          notes: '개인정보 없음',
        },
      ],
      instructorSchedule: {
        locations: [
          {
            id: 'loc-virtual-a',
            alias: '장소 A · 본관 리포머실',
            equipmentIds: ['reformer'],
            propIds: ['mini-ball', 'magic-circle'],
            notes: '리포머 전용',
          },
          {
            id: 'loc-virtual-b',
            alias: '장소 B · 별관 매트·체어실',
            equipmentIds: ['mat', 'chair'],
            propIds: ['foam-roller', 'magic-circle'],
            notes: '리포머 없음 · 매트/체어 전용',
          },
        ],
        classes: [
          {
            id: 'cls-virtual-next',
            title: '저녁 리포머 A반',
            locationId: 'loc-virtual-a',
            participantAlias: '가상 그룹 A반',
            recurrence: 'once',
            weekdays: [],
            startDate: addScheduleDays(today, 1),
            startTime: '23:00',
            endTime: '23:45',
            notes: '다음 수업 준비 연결 확인',
          },
        ],
        exceptions: [],
      },
      datedSequencePlanning: undefined,
      undoStack: [],
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
      externalTabConflict: null,
    },
    true,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  seedFixtureWorkspace();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  usePilatesStore.setState(baselineStore, true);
  localStorage.clear();
  sessionStorage.clear();
});

describe('Instructor loop contracts & 6 mandatory journeys (PF-01 ~ PF-08, P2, P3)', () => {
  it('Unit contracts: prevents time double-counting, formats 0s honestly without 1-min inflation, marks unknown spring setup as 미확인, and preserves sections/locks/L-R pairs in optimizer', () => {
    const steps = create45MinFixtureSteps();
    const durations = getSequenceDurations(steps);
    expect(durations.totalSec).toBe(45 * 60);
    expect(durations.restSec).toBe(2 * 60);
    expect(durations.exerciseSec).toBe(43 * 60);

    // Unilateral step (12 min = 720s, 20s explanation + 20s transition -> 680s movement = 340s per side, NOT 1440s)
    const unilateralTiming = getStepTiming(steps[4]!, reformerUnilateralScooter);
    expect(unilateralTiming.totalSec).toBe(720);
    expect(unilateralTiming.sides).toBe(2);
    expect(unilateralTiming.perSideSec).toBe(340);

    // PF-04: 0s is NEVER exaggerated as 1 minute; 59.6s rounds consistently across summary/detail/MM:SS
    expect(formatActualDurationSummaryPill(0)).toBe('0초 진행');
    expect(formatActualDurationDetailText(0)).toBe('0분 0초');
    expect(formatWholeSecondsToMMSS(0)).toBe('00:00');
    expect(formatActualDurationSummaryPill(18)).toBe('18초 진행');
    expect(formatActualDurationSummaryPill(59.6)).toBe('1분 진행');
    expect(formatActualDurationDetailText(59.6)).toBe('1분 0초');
    expect(formatWholeSecondsToMMSS(59.6)).toBe('01:00');

    // PF-06: Unknown spring string is marked '미확인', never converted to arbitrary kg/lb or '빨강 1 · 파랑 1'
    expect(isUnknownSpringSetup('강사가 기구별 설정', 'reformer')).toBe(true);
    const unknownFormatted = formatBrandSpringEquivalent(
      '강사가 기구별 설정',
      'intopilates',
      'reformer',
    );
    expect(unknownFormatted.equivalentLabelKo).toBe('미확인');
    expect(unknownFormatted.isUnknownSetup).toBe(true);

    // PF-06: Inter-step transition captures box, footbar, headrest, posture, props, and spring changes
    const byId = new Map(fixtureExercises.map((ex) => [ex.id, ex]));
    const step3Cue = describeStepTransitionFromPrevious(steps, 2, byId, 'intopilates');
    expect(step3Cue?.changes.join(' | ')).toContain('박스 없음 → 숏박스');
    expect(step3Cue?.changes.join(' | ')).toContain('풋바 높음 → 풋바 내림');
    expect(step3Cue?.changes.join(' | ')).toContain('자세 수파인 → 시티드');

    // PF-06: Safe transition optimizer keeps warmup/cooldown sections, locked step, rest, and adjacent L/R pair intact
    const pairedSteps: SequenceStep[] = [
      steps[0]!, // preparation
      {
        ...steps[2]!,
        stepId: 'main-seated-box-a',
        locked: false,
      },
      {
        ...steps[4]!,
        stepId: 'pair-left',
        sideMode: 'left',
        durationMin: 4,
      },
      {
        ...steps[4]!,
        stepId: 'pair-right',
        sideMode: 'right',
        durationMin: 4,
      },
      {
        ...steps[2]!,
        stepId: 'main-seated-box-b',
        locked: false,
      },
      steps[5]!, // cooldown
    ];
    const optPlan = buildSafeTransitionOptimization(pairedSteps, byId);
    expect(optPlan.preservedPairCount).toBe(1);
    expect(optPlan.afterSteps[0]!.stepId).toBe(steps[0]!.stepId);
    expect(optPlan.afterSteps.at(-1)!.stepId).toBe(steps[5]!.stepId);
    const leftIdx = optPlan.afterSteps.findIndex((s) => s.stepId === 'pair-left');
    const rightIdx = optPlan.afterSteps.findIndex((s) => s.stepId === 'pair-right');
    expect(rightIdx).toBe(leftIdx + 1);
    expect(optPlan.disclaimerKo).not.toContain('안전한 수업을 보장');
    expect(optPlan.disclaimerKo).toContain('보장하지 않습니다');
  });

  it('Journey 1 (PF-01, PF-02, PF-07): author -> duplicate instance -> reorder -> target-fit cancel/apply -> draft/cancel/apply setup -> save dedup -> reload round-trip -> cross-tab conflict', async () => {
    const handlers = {
      onOpenYouTubePreview: vi.fn(),
      onOpenIdeaSheet: vi.fn(),
      onOpenClipper: vi.fn(),
      onOpenLogModal: vi.fn(),
      onOpenInventory: vi.fn(),
      onStartClass: vi.fn(),
    };
    const view = render(<SequenceStudioWorkbench {...handlers} />);

    // Next scheduled class card (PF-05) is visible and connected
    expect(screen.getByTestId('flow-next-scheduled-class-card')).toHaveTextContent(
      '저녁 리포머 A반',
    );

    // Duplicate instance IDs are already distinct for the 2 instances of syn-ref-warmup-breath, and +1 adds a 3rd unique stepId
    const initialIds = usePilatesStore.getState().activeSteps.map((s) => s.stepId);
    expect(new Set(initialIds).size).toBe(initialIds.length);
    fireEvent.click(
      screen.getByRole('button', { name: `${reformerWarmupVideoUnverified.nameKo} 한 번 더 추가` }),
    );
    const afterDupSteps = usePilatesStore.getState().activeSteps;
    expect(afterDupSteps).toHaveLength(7);
    expect(new Set(afterDupSteps.map((s) => s.stepId)).size).toBe(7);

    // Reorder step 3 down
    fireEvent.click(
      screen.getByRole('button', { name: `3번 ${reformerShortBoxBrokenVideo.nameKo} 아래로` }),
    );

    // Target-fit preview cancel leaves steps untouched; apply fits unlocked steps while preserving locked & rest
    const stepsBeforeFit = usePilatesStore.getState().activeSteps;
    fireEvent.click(screen.getByRole('button', { name: '시간 맞추기' }));
    expect(screen.getByTestId('flow-fit-preserved-summary')).toHaveTextContent(
      '잠금 1개 · 휴식 1개 고정 유지',
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(usePilatesStore.getState().activeSteps).toBe(stepsBeforeFit);

    fireEvent.click(screen.getByRole('button', { name: '시간 맞추기' }));
    fireEvent.click(screen.getByRole('button', { name: '이 시간으로 적용' }));
    expect(getSequenceDurations(usePilatesStore.getState().activeSteps).totalSec).toBe(45 * 60);
    expect(
      usePilatesStore.getState().activeSteps.find((s) => s.stepId === 'fix-step-2-footwork-locked')
        ?.durationMin,
    ).toBe(8);

    // PF-02: StepEditor dirty-close guard on X / Escape, honest draft label, and per-step setup override persistence
    fireEvent.click(
      screen.getByRole('button', {
        name: `${reformerShortBoxBrokenVideo.nameKo} 시간과 메모 편집`,
      }),
    );
    const editorDialog = screen.getByRole('dialog', { name: reformerShortBoxBrokenVideo.nameKo });
    const springInput = within(editorDialog).getByPlaceholderText(/기본/);
    fireEvent.change(springInput, { target: { value: '1R 1Y' } });
    // Summary never mislabels unapplied draft as '현재 적용:'
    expect(within(editorDialog).getByTestId('step-editor-3d-disclosure')).toHaveTextContent(
      '초안 미적용: 1R 1Y',
    );
    expect(within(editorDialog).getByTestId('step-editor-3d-disclosure')).not.toHaveTextContent(
      '현재 적용:',
    );

    // Clicking header X while dirty triggers discard confirmation instead of silent loss
    fireEvent.click(within(editorDialog).getByRole('button', { name: '닫기' }));
    expect(within(editorDialog).getByTestId('step-editor-discard-guard')).toBeInTheDocument();
    fireEvent.click(within(editorDialog).getByRole('button', { name: '계속 편집' }));

    // Set per-step footbarOverride too, then explicitly click '변경 적용'
    fireEvent.change(within(editorDialog).getByLabelText('단계별 풋바 높이'), {
      target: { value: 'mid' },
    });
    fireEvent.click(within(editorDialog).getByRole('button', { name: '변경 적용' }));
    expect(
      screen.queryByRole('dialog', { name: reformerShortBoxBrokenVideo.nameKo }),
    ).not.toBeInTheDocument();

    // PF-01: Double-clicking Save creates only ONE saved sequence, and editing afterwards flips saveStatus to 'dirty'
    const saveBtn = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('저장한 수업에 보관했습니다.'),
    );
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    expect(getActiveSequenceSaveState(usePilatesStore.getState())).toBe('saved-local');

    // Reload round-trip preserves stepId, order, duration, sideMode, cue/note, customSpringOverride, and footbarOverride
    const savedId = usePilatesStore.getState().activeSequenceId;
    const savedBeforeReload = structuredClone(usePilatesStore.getState().activeSteps);
    const persistedJson = localStorage.getItem(RECOVERY_STORAGE_KEY)!;
    act(() => {
      usePilatesStore.setState({ activeSteps: [], savedSequences: [] });
    });
    localStorage.setItem(RECOVERY_STORAGE_KEY, persistedJson);
    await act(async () => {
      await usePilatesStore.persist.rehydrate();
    });
    const afterReload = usePilatesStore.getState();
    expect(afterReload.activeSequenceId).toBe(savedId);
    expect(afterReload.activeSteps).toEqual(savedBeforeReload);
    expect(
      afterReload.activeSteps.find((s) => s.stepId === 'fix-step-3-shortbox')?.footbarOverride,
    ).toBe('mid');

    // Subsequent edit marks sequence as 'dirty' instead of falsely keeping '저장했습니다'
    fireEvent.click(
      screen.getByRole('button', { name: `${reformerShortBoxBrokenVideo.nameKo} 30초 늘리기` }),
    );
    expect(getActiveSequenceSaveState(usePilatesStore.getState())).toBe('dirty');
    expect(screen.getByTestId('flow-actionbar-save-hint')).toHaveTextContent('미저장 초안');

    // Cross-tab storage event surfaces explicit conflict banner without overwriting external tab data
    const externalState = JSON.parse(persistedJson);
    externalState.state.activeTitle = '다른 탭에서 수정한 제목';
    const externalRaw = JSON.stringify(externalState);
    localStorage.setItem(RECOVERY_STORAGE_KEY, externalRaw);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: RECOVERY_STORAGE_KEY,
          oldValue: persistedJson,
          newValue: externalRaw,
        }),
      );
    });
    expect(screen.getByTestId('flow-cross-tab-conflict-banner')).toBeInTheDocument();
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(externalRaw);
    view.unmount();
  });

  it('Journey 2 (PF-05, P2): copies Location A plan for Location B, swaps incompatible apparatus steps, and keeps Location A source & scheduled occurrence untouched', () => {
    // Save Location A plan & assign it to upcoming scheduled class at Location A
    const sourceId = usePilatesStore.getState().saveCurrentSequenceToBinder();
    const sourceSnapshot = structuredClone(
      usePilatesStore.getState().savedSequences.find((s) => s.id === sourceId)!,
    );
    const assignRes = usePilatesStore.getState().assignSequenceToOccurrence({
      sequenceId: sourceId,
      classId: 'cls-virtual-next',
      originalDate: usePilatesStore.getState().instructorSchedule.classes[0]!.startDate,
      state: 'prepared',
    });
    expect(assignRes.success).toBe(true);

    render(
      <SequenceStudioWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );

    // Copy for Location B (Mat + Chair only)
    fireEvent.change(screen.getByTestId('flow-location-copy-select'), {
      target: { value: 'loc-virtual-b' },
    });
    fireEvent.click(screen.getByTestId('flow-location-copy-btn'));

    const stateAfterCopy = usePilatesStore.getState();
    expect(stateAfterCopy.activeSequenceId).not.toBe(sourceId);
    expect(stateAfterCopy.activeTitle).toContain('장소 B');

    // Unlock step 2 in the Location B copy and replace an incompatible Reformer step with a Mat/Chair exercise
    const unlockedStep = stateAfterCopy.activeSteps.find((s) => !s.locked && s.kind !== 'rest')!;
    fireEvent.click(screen.getByTestId(`flow-replace-step-${unlockedStep.stepId}`));
    const picker = screen.getByTestId('flow-replace-picker-dialog');
    const firstConfirm = within(picker).getAllByRole('button', { name: '이 동작으로 교체' })[0]!;
    fireEvent.click(firstConfirm);

    // Verify Location A saved sequence and Location A dated scheduled plan remain 100% immutable!
    const preservedSource = usePilatesStore
      .getState()
      .savedSequences.find((s) => s.id === sourceId)!;
    expect(preservedSource).toEqual(sourceSnapshot);
    const preservedDatedPlan =
      usePilatesStore.getState().datedSequencePlanning?.assignments[0]?.sequenceSnapshot;
    expect(preservedDatedPlan?.steps).toEqual(sourceSnapshot.steps);
  });

  it('Journey 3 (PF-04, PF-08, P2): LiveStage wall-clock pause -> +15s -> undo -> background & reload recovery -> honest 0s history -> selective reflection apply to next draft', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T10:00:00.000Z'));

    const sourceBeforeStage = structuredClone(usePilatesStore.getState().activeSteps);
    const stageView = render(<LiveStageView onOpenLogModal={vi.fn()} />);

    // Start class, advance 25s on wall clock (including simulated background tab visibilitychange)
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    act(() => {
      vi.setSystemTime(new Date('2026-11-17T10:00:25.000Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Pause, add +15s, then undo ('직전 복구')
    fireEvent.click(screen.getByTestId('live-thumb-play-toggle'));
    fireEvent.click(screen.getByTestId('live-thumb-plus-15s'));
    expect(screen.getByTestId('live-thumb-undo-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('live-thumb-undo-btn'));

    // Advance to step 2 (index 1) and simulate browser page reload (beforeunload -> remount)
    fireEvent.click(screen.getByTestId('live-thumb-next-step'));
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    stageView.unmount();

    const reloadedStage = render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByTestId('live-stage-reload-recovery-banner')).toHaveTextContent('2번');
    expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('일시정지');
    // Source sequence remained completely untouched
    expect(usePilatesStore.getState().activeSteps).toEqual(sourceBeforeStage);
    reloadedStage.unmount();
    vi.useRealTimers();

    // Record a 0-second session in LogSessionModal and verify ClassBinderView renders '0초 진행' (NEVER '1분 진행')
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder();
    const modalView = render(
      <LogSessionModal
        sequenceId={savedId}
        context={{
          actualDurationSec: 0,
          stepsSnapshot: create45MinFixtureSteps().map((s, idx) =>
            idx === 0 ? { ...s, durationMin: 6, instructorNote: '실수업 시간 1분 연장' } : s,
          ),
        }}
        onClose={vi.fn()}
      />,
    );
    // Navigate to Step 3, toggle selective apply to next draft, and submit
    fireEvent.click(screen.getByRole('button', { name: '3 강도·피드백 메모' }));
    fireEvent.change(screen.getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: '숏박스 세팅 전환 여유 확보 필요' },
    });
    fireEvent.click(screen.getByTestId('log-apply-to-next-draft-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /수업 기록 저장/ }));
    modalView.unmount();

    // Next draft adopted the adjusted 6-min opening step while original saved template kept 5 min!
    const nextDraft = usePilatesStore.getState();
    expect(nextDraft.activeTitle).toContain('다음 수업 계획');
    expect(nextDraft.activeSteps[0]?.durationMin).toBe(6);
    expect(
      nextDraft.savedSequences.find((s) => s.id === savedId)?.steps[0]?.durationMin,
    ).toBe(5);

    // Render history view and confirm 0s log shows '0초 진행', never '1분 진행'
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(screen.getByText('0초 진행')).toBeInTheDocument();
    expect(screen.queryByText('1분 진행')).not.toBeInTheDocument();
  });

  it('Journey 4 (PF-08, P2): media URL states stay distinct, broken video & 3D failure fall back gracefully, and opening 3D in LiveStage never alters timer or step', () => {
    // 1) Valid video shows 'URL 존재' provenance tier + segment + publisher + date
    const validGallery = render(<ExerciseVideoGallery exercise={reformerFootworkValidVideo} />);
    expect(screen.getByTestId('evg-verification-tier')).toHaveTextContent('URL 존재');
    expect(screen.getByTestId('evg-provenance-meta')).toHaveTextContent('00:15 ~ 01:30');
    validGallery.unmount();

    // 2) Broken URL shows explicit fallback without blocking authoring
    const brokenGallery = render(<ExerciseVideoGallery exercise={reformerShortBoxBrokenVideo} />);
    expect(screen.getByTestId('evg-invalid-url-fallback')).toHaveTextContent(
      '시퀀스 작성과 수업 진행은 계속할 수 있습니다',
    );
    brokenGallery.unmount();

    // 3) 3D render failure falls back to static ExerciseMotionArtwork via ErrorBoundary
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fallback3d = render(
      <StudioInteractive3DViewport
        exercise={reformerFootworkValidVideo}
        simulateRenderFailure
      />,
    );
    expect(screen.getByTestId('studio-3d-static-fallback')).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${reformerFootworkValidVideo.nameKo} 정적 참조 도해`),
    ).toBeInTheDocument();
    fallback3d.unmount();
    consoleSpy.mockRestore();

    // 4) Opening/closing 3D reference in LiveStage never changes current step or resets timer
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'));
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    act(() => {
      vi.setSystemTime(new Date('2026-11-17T12:00:10.000Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const orbitSummary = screen.getByText('동작 확대 · 자세와 중간 구간 살펴보기');
    fireEvent.click(orbitSummary);
    expect(screen.getByText(/현재 동작 1 \/ 전체 6/)).toBeInTheDocument();
    expect(screen.getByText('04:50')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('Journey 5 (PF-03): Hangul IME composing Enter/Escape never fires commands prematurely, and rehearsal close/reopen preserves last position vs explicit 처음으로 reset', () => {
    expect(isImeComposing({ isComposing: true })).toBe(true);
    expect(isImeComposing({ keyCode: 229 })).toBe(true);
    expect(isImeComposing({ isComposing: false, keyCode: 13 })).toBe(false);

    const onNavigateTab = vi.fn();
    const palette = render(
      <StudioCommandPalette
        open
        onClose={vi.fn()}
        onNavigateTab={onNavigateTab}
        onLoadSequence={vi.fn()}
        onSwitchPortalRole={vi.fn()}
        onOpenNewIdea={vi.fn()}
        canStartLiveStage={true}
        onInspectExercise3D={vi.fn()}
      />,
    );
    const input = screen.getByTestId('studio-command-palette-input');
    fireEvent.change(input, { target: { value: '풋워크' } });
    // Composing Enter (Hangul syllable commit) must NOT trigger command selection
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(onNavigateTab).not.toHaveBeenCalled();
    palette.unmount();

    // Rehearsal normal close -> reopen preserves position; '처음으로' explicitly resets to step 1 (00:00)
    const firstOpen = render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /다음 항목/ }));
    expect(screen.getByText('02 / 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '계획 미리보기 닫기' }));
    firstOpen.unmount();

    const secondOpen = render(<SequencePlanPreview onClose={vi.fn()} />);
    expect(screen.getByTestId('rehearsal-resume-notice')).toBeInTheDocument();
    expect(screen.getByText('02 / 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시간표 처음으로' }));
    expect(screen.queryByTestId('rehearsal-resume-notice')).not.toBeInTheDocument();
    expect(screen.getByText('01 / 6')).toBeInTheDocument();
    secondOpen.unmount();
  });

  it('Journey 6 (P3 conditional team sharing contract): enforces reader/commenter/editor permissions, immediate revocation, optimistic version conflict, clone independence, and PII rejection', () => {
    const baseSequence: SavedSequence = {
      id: 'shared-seq-1',
      title: '팀 공유 리포머 45분',
      subtitle: '공유 원본',
      apparatus: 'reformer',
      level: '1.5',
      focusTags: ['팀'],
      targetMinutes: 45,
      steps: create45MinFixtureSteps(),
      createdAt: '2026-11-17T00:00:00.000Z',
      updatedAt: '2026-11-17T00:00:00.000Z',
      taughtCount: 0,
    };
    let shared: SharedSequenceRecord = {
      shareId: 'share-001',
      ownerUid: 'uid-owner',
      revision: 1,
      revoked: false,
      sequence: baseSequence,
      grants: [
        { granteeUid: 'uid-reader', role: 'reader', grantedAt: '2026-11-17T01:00:00.000Z' },
        { granteeUid: 'uid-commenter', role: 'commenter', grantedAt: '2026-11-17T01:00:00.000Z' },
        { granteeUid: 'uid-editor-a', role: 'editor', grantedAt: '2026-11-17T01:00:00.000Z' },
        { granteeUid: 'uid-editor-b', role: 'editor', grantedAt: '2026-11-17T01:00:00.000Z' },
      ],
      comments: [],
    };

    // Reader can read and fork an independent local copy, but cannot comment or edit
    expect(readSharedSequence(shared, 'uid-reader').ok).toBe(true);
    expect(
      addSharedSequenceComment(shared, {
        actorUid: 'uid-reader',
        stepId: 'fix-step-1-breath-open',
        body: '코멘트 시도',
        now: '2026-11-17T02:00:00.000Z',
        commentId: 'c-1',
      }).ok,
    ).toBe(false);

    const forked = forkSharedSequenceToLocal(shared, {
      actorUid: 'uid-reader',
      newSequenceId: 'local-fork-seq-1',
      stepIdPrefix: 'forked-step',
      now: '2026-11-17T02:05:00.000Z',
    });
    expect(forked.ok).toBe(true);
    if (!forked.ok) throw new Error('expected fork ok');
    expect(forked.localClone.id).toBe('local-fork-seq-1');
    expect(
      forked.localClone.steps.every(
        (st, idx) => st.stepId !== shared.sequence.steps[idx]?.stepId,
      ),
    ).toBe(true);

    // Commenter can comment, cannot edit
    const commented = addSharedSequenceComment(shared, {
      actorUid: 'uid-commenter',
      stepId: 'fix-step-1-breath-open',
      body: '스프링 안내 메모 보강 제안',
      now: '2026-11-17T02:10:00.000Z',
      commentId: 'c-2',
    });
    expect(commented.ok).toBe(true);
    if (commented.ok) shared = commented.record;

    // Editor A edits revision 1 -> revision becomes 2; Editor B submitting stale expectedRevision=1 gets version_conflict!
    const editA = applySharedSequenceEdit(shared, {
      actorUid: 'uid-editor-a',
      expectedRevision: 1,
      nextSequence: { ...shared.sequence, title: '팀 공유 리포머 45분 (개정 v2)' },
      now: '2026-11-17T02:20:00.000Z',
    });
    expect(editA.ok).toBe(true);
    if (editA.ok) shared = editA.record;
    expect(shared.revision).toBe(2);

    const staleEditB = applySharedSequenceEdit(shared, {
      actorUid: 'uid-editor-b',
      expectedRevision: 1,
      nextSequence: { ...shared.sequence, title: '오래된 버전 덮어쓰기 시도' },
      now: '2026-11-17T02:21:00.000Z',
    });
    expect(staleEditB).toMatchObject({ ok: false, code: 'version_conflict', serverRevision: 2 });

    // Owner revokes access -> Reader & Editors immediately lose access, while Reader's earlier local fork remains 100% independent!
    const revokedRes = revokeSharedAccess(shared, {
      actorUid: 'uid-owner',
      now: '2026-11-17T03:00:00.000Z',
    });
    expect(revokedRes.ok).toBe(true);
    if (revokedRes.ok) shared = revokedRes.record;
    expect(readSharedSequence(shared, 'uid-reader')).toMatchObject({
      ok: false,
      code: 'share_revoked',
    });
    expect(forked.localClone.title).toBe('팀 공유 리포머 45분 (내 작업실 사본)');

    // Minimal schedule context rejects member PII / health / payment fields
    expect(
      validateMinimalSharedScheduleContext({
        slotDate: '2026-11-18',
        startTime: '19:00',
        endTime: '19:45',
        locationAlias: '장소 A',
        equipmentIds: ['reformer'],
        propIds: ['mini-ball'],
        targetMinutes: 45,
        medicalHistory: '금지된 건강정보',
      }),
    ).toMatchObject({ ok: false, code: 'pii_or_health_rejected' });
  });

  it('Video reference segment review handoff (P2): transfers selected gallery video & segment into Step 2 draft and upgrades tier to 해당 동작 일치 확인 upon instructor approval', () => {
    // Seed an unreviewed version of reformerFootworkValidVideo so we can promote it end-to-end
    const unreviewedFootwork: PilatesExercise = {
      ...structuredClone(reformerFootworkValidVideo),
      id: 'ex-footwork-review-handoff',
      review: undefined,
    };
    usePilatesStore.setState((prev) => ({
      exercises: [...prev.exercises, unreviewedFootwork],
    }));

    render(<YouTubePreviewModal exercise={unreviewedFootwork} onClose={vi.fn()} />);
    expect(screen.getByTestId('evg-verification-tier')).toHaveTextContent('URL 존재');
    expect(screen.getByTestId('evg-provenance-meta')).toHaveTextContent('00:15 ~ 01:30');

    // Click '내 노트 참조 URL로 반영' -> opens Step 2 review editor with startSec/endSec preserved
    fireEvent.click(screen.getByRole('button', { name: '내 노트 참조 URL로 반영' }));
    expect(screen.getByTestId('yt-preview-step-guidance')).toHaveTextContent('2/2');

    // Enter instructor alias (non-PII), check full review confirmation, and approve
    fireEvent.change(screen.getByLabelText('검토한 강사 별칭'), {
      target: { value: '스튜디오A 수석강사' },
    });
    fireEvent.click(
      screen.getByLabelText(
        /이 동작의 위 모든 조건을 실제로 전체 검토했고, 수업에 쓸 동작 정보를 직접 확인했습니다/,
      ),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /수정 내용을 저장하고 내 강사 검토로 승인/ }),
    );

    expect(screen.getByTestId('evg-verification-tier')).toHaveTextContent('해당 동작 일치 확인');
  });
});
