import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ClassBinderView } from '../components/ClassBinderView';
import { ClassPlanSummary } from '../components/ClassPlanSummary';
import { ExerciseEvidencePanel } from '../components/ExerciseEvidencePanel';
import { LiveStageView } from '../components/LiveStageView';
import { MovementDiagramReference } from '../components/MovementDiagramReference';
import { MovementMediaGuidancePanel } from '../components/MovementMediaGuidancePanel';
import { OfflinePresetPicker } from '../components/OfflinePresetPicker';
import { SequencePlanPreview } from '../components/SequencePlanPreview';
import { StepBlockInspector } from '../components/StepBlockInspector';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  resolvePatternReferencesForRenderer,
  resolveRenderableMotionDescriptor,
} from '../features/motionCoverage/adapters';
import { ALL_MOTION_EVIDENCE_REVIEW_RECORDS } from '../features/motionEvidenceReview';
import {
  ACCOUNT_STORAGE_PREFIX,
  ACTIVE_OWNER_KEY,
  syncAccountWorkspace,
} from '../lib/accountStorage';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  addMovementIdeaToCurrentClass,
  getMovementIdeaMeta,
  inferApparatusFromIdeaLine,
  inferBodyPositionFromIdeaLine,
  resetMovementIdeaStateForTests,
  saveMovementIdeaDraft,
  syncMovementIdeaAccountScope,
} from '../utils/movementIdeaDraft';
import {
  attachProgramSnapshotToHistoryLog,
  buildTeachingProgramSnapshot,
  formatTeachingHistorySnapshotText,
  resolveTeachingHistoryView,
} from '../utils/teachingHistorySnapshot';

describe('Dynamic Workflow Full Completion (Tracks 1–4 E2E Integration)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetMovementIdeaStateForTests();
    usePilatesStore.setState({
      ...usePilatesStore.getInitialState(),
      exercises: structuredClone(INITIAL_EXERCISES),
      activeSteps: [
        {
          stepId: 'step-test-01',
          order: 1,
          exerciseId: 'ex-footwork-01',
          blockCategory: 'footwork',
          durationMin: 4,
          explanationSec: 20,
          transitionSec: 15,
          selectedLayer: 'standard',
          repetitions: 8,
          sets: 2,
          sideMode: 'together',
        },
        {
          stepId: 'step-test-02',
          order: 2,
          exerciseId: 'ex-bridging-01',
          blockCategory: 'bridging',
          durationMin: 5,
          explanationSec: 20,
          transitionSec: 15,
          selectedLayer: 'standard',
          repetitions: 10,
          sets: 2,
          sideMode: 'together',
        },
      ],
      activeTargetMinutes: 50,
      activeTitle: '트랙 1-4 통합 검수 시퀀스',
    });
  });

  afterEach(() => {
    resetMovementIdeaStateForTests();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Track 1: Movement Idea Creation, Sub-equipment/Posture Inference, Active Step Sync & Multi-Tab Account Scope', () => {
    it('infers apparatus and bodyPosition from natural Korean sub-equipment and posture terms via saveMovementIdeaDraft', () => {
      expect(inferApparatusFromIdeaLine('롱박스 위에서 엎드려 한 팔 당기기')).toBe('reformer');
      expect(inferBodyPositionFromIdeaLine('롱박스 위에서 엎드려 한 팔 당기기')).toBe('prone');

      expect(inferApparatusFromIdeaLine('푸시스루바 잡고 앉아서 흉추 신전')).toBe('cadillac');
      expect(inferBodyPositionFromIdeaLine('푸시스루바 잡고 앉아서 흉추 신전')).toBe('seated');

      expect(inferApparatusFromIdeaLine('페달 누르며 서서 균형 잡기')).toBe('chair');
      expect(inferBodyPositionFromIdeaLine('페달 누르며 서서 균형 잡기')).toBe('standing');

      const savedReformer = saveMovementIdeaDraft({
        ideaLine: '롱박스 위에서 엎드려 한 팔 당기기',
        workingTitle: '롱박스 풀링 스트랩 변형',
      });
      expect(savedReformer.ok).toBe(true);
      expect(savedReformer.exercise?.apparatus).toBe('reformer');
      expect(savedReformer.exercise?.bodyPosition).toBe('prone');

      const savedCadillac = saveMovementIdeaDraft({
        ideaLine: '푸시스루바 잡고 앉아서 흉추 신전',
      });
      expect(savedCadillac.ok).toBe(true);
      expect(savedCadillac.exercise?.apparatus).toBe('cadillac');
      expect(savedCadillac.exercise?.bodyPosition).toBe('seated');

      const savedChair = saveMovementIdeaDraft({
        ideaLine: '페달 누르며 서서 균형 잡기',
      });
      expect(savedChair.ok).toBe(true);
      expect(savedChair.exercise?.apparatus).toBe('chair');
      expect(savedChair.exercise?.bodyPosition).toBe('standing');
    });

    it('synchronizes activeSteps in-place when an idea already in activeSteps is updated via saveMovementIdeaDraft', () => {
      const initial = saveMovementIdeaDraft({
        ideaLine: '풋바 밀며 브릿지 연결',
        workingTitle: '풋바 브릿지 v1',
        durationMin: 3,
        repetitions: 6,
        sets: 2,
        subjectiveFeeling: '햄스트링 자극이 강함',
      });
      expect(initial.ok).toBe(true);
      const ideaId = initial.exercise!.id;

      const added = addMovementIdeaToCurrentClass(ideaId);
      expect(added.ok).toBe(true);

      const beforeStep = usePilatesStore
        .getState()
        .activeSteps.find((s) => s.exerciseId === ideaId);
      expect(beforeStep).toBeDefined();
      expect(beforeStep?.durationMin).toBe(3);

      // Update the existing idea without re-adding to class (simulating "수정 내용 저장")
      const updated = saveMovementIdeaDraft({
        existingExerciseId: ideaId,
        ideaLine: '풋바 밀며 브릿지 후 한 다리 들기',
        workingTitle: '풋바 브릿지 v2',
        durationMin: 5,
        explanationSec: 30,
        transitionSec: 20,
        repetitions: 8,
        sets: 3,
        sideMode: 'left-then-right',
        subjectiveFeeling: '골반 수평 유지에 집중 필요',
        adjustmentNote: '풋바와 엉덩이 간격 반 뼘 좁힘',
        variantLabelKo: '편측 심화',
      });

      expect(updated.ok).toBe(true);
      const afterSteps = usePilatesStore
        .getState()
        .activeSteps.filter((s) => s.exerciseId === ideaId);
      expect(afterSteps).toHaveLength(1);
      const syncedStep = afterSteps[0];
      expect(syncedStep.durationMin).toBe(5);
      expect(syncedStep.explanationSec).toBe(30);
      expect(syncedStep.transitionSec).toBe(20);
      expect(syncedStep.repetitions).toBe(8);
      expect(syncedStep.sets).toBe(3);
      expect(syncedStep.sideMode).toBe('left-then-right');
      expect(syncedStep.instructorNote).toContain('[느낌] 골반 수평 유지에 집중 필요');
      expect(syncedStep.instructorNote).toContain('[수정] 풋바와 엉덩이 간격 반 뼘 좁힘');
      expect(syncedStep.instructorNote).toContain('[변형] 편측 심화');
      expect(syncedStep.humanDraftRevision).toBeGreaterThanOrEqual(2);
    });

    it('preserves snapshot metadata on PilatesExercise and recovers it via getMovementIdeaMeta after clearing localStorage meta keys', () => {
      const saved = saveMovementIdeaDraft({
        ideaLine: '스파인 코렉터에 옆으로 누워 복사근 연결',
        workingTitle: '아크 사이드 리프트',
        subjectiveFeeling: '갈비뼈 아래쪽 지지감이 좋음',
        adjustmentNote: '골반이 뒤로 빠지지 않게 벽 앞에서 진행',
        photoDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        variantLabelKo: '벽 지지 변형',
        repetitions: 10,
        sets: 2,
      });

      expect(saved.ok).toBe(true);
      const exercise = saved.exercise!;
      expect(exercise.ideaLineSnapshot).toBe('스파인 코렉터에 옆으로 누워 복사근 연결');
      expect(exercise.feelLogsSnapshot?.at(-1)?.feelNoteKo).toBe('갈비뼈 아래쪽 지지감이 좋음');
      expect(exercise.modificationLogsSnapshot?.at(-1)?.modificationPointKo).toBe(
        '골반이 뒤로 빠지지 않게 벽 앞에서 진행',
      );
      expect(exercise.photoReferencesSnapshot?.at(-1)?.localRefUri).toContain('data:image/svg+xml');
      expect(exercise.variantLabelKo).toBe('벽 지지 변형');

      // Simulate JSON backup restore on a new device where idea meta localStorage keys are absent
      resetMovementIdeaStateForTests();

      const recovered = getMovementIdeaMeta(exercise);
      expect(recovered.ideaLine).toBe('스파인 코렉터에 옆으로 누워 복사근 연결');
      expect(recovered.subjectiveFeeling).toBe('갈비뼈 아래쪽 지지감이 좋음');
      expect(recovered.adjustmentNote).toBe('골반이 뒤로 빠지지 않게 벽 앞에서 진행');
      expect(recovered.photoDataUrl).toContain('data:image/svg+xml');
      expect(recovered.variantLabelKo).toBe('벽 지지 변형');
      expect(recovered.triedByInstructor).toBe(true);
    });

    it('protects multi-tab cross-account scope and prevents stale tab from overwriting ACTIVE_OWNER_KEY', () => {
      // Guest creates an idea draft
      const guestSaved = saveMovementIdeaDraft({
        ideaLine: '매트 위에서 네발 기기 버드독 변형',
        workingTitle: '게스트 창작 동작',
      });
      expect(guestSaved.ok).toBe(true);

      // Sign in as user-alpha (adopts guest data on first login)
      syncAccountWorkspace('user-alpha');
      expect(window.localStorage.getItem(ACTIVE_OWNER_KEY)).toBe('user-alpha');
      expect(window.localStorage.getItem(`${ACCOUNT_STORAGE_PREFIX}user-alpha`)).toBeTruthy();

      // Switch to user-beta in another tab by updating ACTIVE_OWNER_KEY directly
      window.localStorage.setItem(ACTIVE_OWNER_KEY, 'user-beta');

      // Mutate store in current tab before storage event fires: ACTIVE_OWNER_KEY must NOT be overwritten back to user-alpha
      usePilatesStore.setState({ activeTitle: '알파 탭 로컬 수정' });
      expect(window.localStorage.getItem(ACTIVE_OWNER_KEY)).toBe('user-beta');

      // Sync scope helper cleans up buffer on sign-out
      syncMovementIdeaAccountScope('user-alpha', '__anonymous__');
      syncAccountWorkspace(null);
      expect(window.localStorage.getItem(ACTIVE_OWNER_KEY)).toBeNull();
      expect(window.localStorage.getItem(RECOVERY_STORAGE_KEY)).toBeTruthy();
    });
  });

  describe('Track 2: History Snapshot Precautions, ClassPlanSummary Deep Review Disclosure, SequencePlanPreview Target Sync & StepBlockInspector Ordering', () => {
    it('renders history-snapshot-step-precautions in reopened ClassBinderView modal and includes precautions in formatTeachingHistorySnapshotText', () => {
      const customEx: PilatesExercise = {
        ...INITIAL_EXERCISES[0],
        id: 'ex-custom-idea-precaution-test',
        nameKo: '주의사항 스냅샷 테스트 동작',
        precautions: '강사 주관적 느낌 메모: 손목 과신전 주의 및 견갑 안정화 필수',
      };
      const steps: SequenceStep[] = [
        {
          stepId: 'step-hist-precaution-1',
          order: 1,
          exerciseId: customEx.id,
          blockCategory: 'warmup',
          durationMin: 4,
          explanationSec: 20,
          transitionSec: 15,
          selectedLayer: 'standard',
          instructorNote: '첫 세트 스프링 약하게',
        },
      ];

      const programSnapshot = buildTeachingProgramSnapshot({
        sourceKind: 'active-draft',
        sequenceId: 'seq-precaution-test',
        sequenceTitle: '주의사항 보존 수업',
        apparatus: 'reformer',
        level: '1.0',
        taughtAt: '2026-04-01T10:00:00.000Z',
        groupId: 'group-1',
        steps,
        exercises: [customEx, ...INITIAL_EXERCISES],
      });

      const logEntry = {
        id: 'log-precaution-test-1',
        sequenceId: 'seq-precaution-test',
        sequenceTitle: '주의사항 보존 수업',
        groupId: 'group-1',
        groupName: '오전 A반',
        apparatus: 'reformer' as const,
        level: '1.0' as const,
        taughtAt: '2026-04-01T10:00:00.000Z',
        exerciseIds: [customEx.id],
        stepsSnapshot: steps,
        instructorReflection: '회원분들 어깨 긴장도가 낮아짐',
        intensity: 'moderate' as const,
        rating: 5 as const,
      };

      usePilatesStore.setState((state) => ({
        exercises: [customEx, ...state.exercises],
        historyLogs: [logEntry],
      }));
      attachProgramSnapshotToHistoryLog(
        logEntry.id,
        programSnapshot,
        usePilatesStore.setState,
      );

      const storedLog = usePilatesStore.getState().historyLogs[0];
      const exercisesMap = new Map(
        usePilatesStore.getState().exercises.map((ex) => [ex.id, ex]),
      );
      const resolvedView = resolveTeachingHistoryView(storedLog, exercisesMap, []);
      const exportedText = formatTeachingHistorySnapshotText(resolvedView);
      expect(exportedText).toContain(
        '당시 주의·느낌 메모: 강사 주관적 느낌 메모: 손목 과신전 주의 및 견갑 안정화 필수',
      );

      render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

      const reopenBtn = screen.getByRole('button', { name: /이력 다시 열기/ });
      fireEvent.click(reopenBtn);

      const precautionNode = screen.getByTestId('history-snapshot-step-precautions');
      expect(precautionNode).toHaveTextContent(
        '당시 주의·느낌 메모: 강사 주관적 느낌 메모: 손목 과신전 주의 및 견갑 안정화 필수',
      );
    });

    it('renders ClassPlanReviewPreview inside ClassPlanSummary deep review disclosure and wires OfflinePresetPicker suggestion tab', () => {
      const state = usePilatesStore.getState();
      const { container, unmount } = render(
        <ClassPlanSummary
          title={state.activeTitle}
          steps={state.activeSteps}
          exercises={state.exercises}
          targetMinutes={state.activeTargetMinutes}
        />,
      );

      const outerDetails = container.querySelector('details.class-plan-summary') as HTMLDetailsElement;
      expect(outerDetails).toBeTruthy();
      outerDetails.open = true;
      fireEvent(outerDetails, new Event('toggle'));

      const deepDisclosure = container.querySelector(
        'details.class-plan-deep-review-disclosure',
      ) as HTMLDetailsElement;
      expect(deepDisclosure).toBeTruthy();
      const deepSummary = within(deepDisclosure).getByText(
        '상세 좌우 균형 · 기구 전환 · 흐름 점검표 보기',
      );
      fireEvent.click(deepSummary);

      expect(container.querySelector('.cpr-root')).toBeTruthy();
      unmount();

      // Verify OfflinePresetPicker suggested tab renders PresetSuggestionCandidatePreview
      const { container: pickerContainer } = render(<OfflinePresetPicker onApplied={vi.fn()} />);
      const suggestedTab = screen.getByRole('button', { name: '시간·휴식 맞춤 후보' });
      fireEvent.click(suggestedTab);
      expect(pickerContainer.querySelector('[class*="psc-"], section')).toBeTruthy();
    });

    it('renders one-tap target minutes alignment button in SequencePlanPreview when delta !== 0 and aligns activeTargetMinutes', () => {
      // Total duration of activeSteps is 4 + 5 = 9 minutes, while activeTargetMinutes is 50
      render(<SequencePlanPreview onClose={vi.fn()} />);

      const alignBtn = screen.getByRole('button', {
        name: '현재 계획 시간으로 목표 맞추기',
      });
      expect(alignBtn).toBeInTheDocument();

      fireEvent.click(alignBtn);

      expect(usePilatesStore.getState().activeTargetMinutes).toBe(9);
      expect(
        screen.queryByRole('button', { name: '현재 계획 시간으로 목표 맞추기' }),
      ).not.toBeInTheDocument();
    });

    it('places core teaching fields above StepMotionStudyPicker in StepBlockInspector', () => {
      const step = usePilatesStore.getState().activeSteps[0];
      const { container } = render(
        <StepBlockInspector
          index={0}
          step={step}
          onClose={vi.fn()}
          onOpenExercise={vi.fn()}
          onReplace={vi.fn()}
        />,
      );

      const roleLabel = screen.getByText('수업에서의 역할');
      const durationLabel = screen.getByText('블록 총시간 · 분');
      const noteLabel = screen.getByText('이번 수업 티칭 메모');
      const motionStudyPicker = container.querySelector('.step-motion-study');

      expect(roleLabel).toBeInTheDocument();
      expect(durationLabel).toBeInTheDocument();
      expect(noteLabel).toBeInTheDocument();
      expect(motionStudyPicker).toBeTruthy();

      // Verify DOM order: roleLabel, durationLabel, and noteLabel all precede motionStudyPicker
      expect(
        roleLabel.compareDocumentPosition(motionStudyPicker!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        durationLabel.compareDocumentPosition(motionStudyPicker!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        noteLabel.compareDocumentPosition(motionStudyPicker!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('Track 3: ExerciseEvidencePanel Biomechanical Records, MovementMediaGuidancePanel Link Policy & MovementDiagramReference Disclosures', () => {
    it('renders motion-evidence-review-section in ExerciseEvidencePanel for covered exercises with zero interactive controls inside and resolves motionCoverage renderer adapters', () => {
      expect(ALL_MOTION_EVIDENCE_REVIEW_RECORDS.length).toBeGreaterThanOrEqual(20);
      const targetRecordId = ALL_MOTION_EVIDENCE_REVIEW_RECORDS[0].exerciseId;
      const coveredEx = INITIAL_EXERCISES.find((ex) => ex.id === targetRecordId)!;
      expect(coveredEx).toBeDefined();

      const patternRefs = resolvePatternReferencesForRenderer(coveredEx);
      expect(Array.isArray(patternRefs)).toBe(true);
      const descriptor = resolveRenderableMotionDescriptor(coveredEx);
      expect(descriptor.exerciseId).toBe(coveredEx.id);
      expect(descriptor.true3dSupported).toBe(false);

      const { container } = render(<ExerciseEvidencePanel exercise={coveredEx} />);
      const details = container.querySelector('details') as HTMLDetailsElement;
      details.open = true;
      fireEvent(details, new Event('toggle'));

      const biomechSection = screen.getByTestId('motion-evidence-review-section');
      expect(biomechSection).toBeInTheDocument();
      expect(biomechSection).toHaveTextContent('생체역학·해부학 근거 조사 트랙');
      expect(
        biomechSection.querySelector('button,input,textarea,select,iframe,img,video'),
      ).toBeNull();
    });

    it('renders ReferenceLinkPolicyPreview disclosure inside MovementMediaGuidancePanel', () => {
      const exercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
      const { container } = render(<MovementMediaGuidancePanel exercise={exercise} />);

      const policyDetails = container.querySelector(
        'details.mmg-link-policy-disclosure',
      ) as HTMLDetailsElement;
      expect(policyDetails).toBeTruthy();
      expect(policyDetails).toHaveTextContent('외부 참고 링크 보안·자동재생 차단 정책 점검');

      policyDetails.open = true;
      fireEvent(policyDetails, new Event('toggle'));

      expect(screen.getByTestId('reference-link-policy-preview')).toBeInTheDocument();
    });

    it('renders lazy disclosures for MovementVisualGuideCard and RotationPhaseTriptych in MovementDiagramReference', () => {
      const rotationExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-cooldown-01')!;
      expect(rotationExercise).toBeDefined();

      const { container } = render(<MovementDiagramReference exercise={rotationExercise} />);

      const mainDetails = container.querySelector(
        'details.movement-diagram-reference',
      ) as HTMLDetailsElement;
      mainDetails.open = true;
      fireEvent(mainDetails, new Event('toggle'));

      const visualGuideDetails = container.querySelector(
        'details.movement-diagram-visual-guide-disclosure',
      ) as HTMLDetailsElement;
      expect(visualGuideDetails).toBeTruthy();
      expect(visualGuideDetails).toHaveTextContent('3단계 연속 도해 및 유사 동작 비교 보기');

      visualGuideDetails.open = true;
      fireEvent(visualGuideDetails, new Event('toggle'));
      expect(screen.getByTestId('movement-visual-guide-card')).toBeInTheDocument();

      const rotationDetails = container.querySelector(
        'details.movement-diagram-rotation-disclosure',
      ) as HTMLDetailsElement;
      expect(rotationDetails).toBeTruthy();
      expect(rotationDetails).toHaveTextContent('흉추 회전·골반 고정 3단계 상세 도해 보기');

      rotationDetails.open = true;
      fireEvent(rotationDetails, new Event('toggle'));
      expect(container.querySelector('.rotation-draft-figure')).toBeTruthy();
    });
  });

  describe('Track 4: LiveStageView Hands-Free Voice Command & App Settings MotionCoveragePreviewHarness Entry', () => {
    it('shows honest fallback when SpeechRecognition is absent and executes Korean voice commands when SpeechRecognition mock is provided', () => {
      const win = window as unknown as Record<string, unknown>;
      delete win.SpeechRecognition;
      delete win.webkitSpeechRecognition;

      const { unmount } = render(<LiveStageView onOpenLogModal={vi.fn()} />);

      const toggleBtn = screen.getByTestId('live-voice-command-toggle');
      fireEvent.click(toggleBtn);

      expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
        '이 브라우저는 음성 명령 인식(SpeechRecognition)을 지원하지 않습니다',
      );
      unmount();

      // Now install a mock SpeechRecognition on window
      let activeInstance: {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult:
          | ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void)
          | null;
        onerror: ((event: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      } | null = null;

      class MockSpeechRecognition {
        lang = '';
        continuous = false;
        interimResults = false;
        onresult:
          | ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void)
          | null = null;
        onerror: ((event: { error?: string }) => void) | null = null;
        onend: (() => void) | null = null;
        start = vi.fn();
        stop = vi.fn();
        constructor() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          activeInstance = this;
        }
      }

      win.SpeechRecognition = MockSpeechRecognition;

      try {
        render(<LiveStageView onOpenLogModal={vi.fn()} />);

        const voiceBtn = screen.getByTestId('live-voice-command-toggle');
        fireEvent.click(voiceBtn);

        expect(activeInstance).not.toBeNull();
        expect(activeInstance!.start).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '핸즈프리 음성 명령 대기 중',
        );

        const emitCommand = (transcript: string) => {
          act(() => {
            activeInstance?.onresult?.({
              results: [[{ transcript }]],
            });
          });
        };

        emitCommand('시작');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 타이머 시작 (“시작”)',
        );

        emitCommand('일시정지');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 일시정지 (“일시정지”)',
        );

        emitCommand('다음');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 다음 동작 (“다음”)',
        );

        emitCommand('이전');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 이전 동작 (“이전”)',
        );

        emitCommand('1분 추가');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 1분 추가 (“1분 추가”)',
        );

        emitCommand('큐시트');
        expect(screen.getByTestId('live-voice-command-status')).toHaveTextContent(
          '음성 명령 실행: 큐시트 전환 (“큐시트”)',
        );
        expect(screen.getByLabelText('수업 진행 큐시트')).toBeInTheDocument();
      } finally {
        delete win.SpeechRecognition;
      }
    });

    it('exposes open-motion-coverage-preview-btn in App Settings modal and opens MotionCoveragePreviewHarness while preserving PilatesSettingsPage', async () => {
      render(<App />);

      const settingsBtns = screen.getAllByRole('button', {
        name: /데이터 백업과 사용 안내|나의 스튜디오/,
      });
      fireEvent.click(settingsBtns[0]);

      const openPreviewBtn = await screen.findByTestId('open-motion-coverage-preview-btn');
      expect(openPreviewBtn).toHaveTextContent('모션 도해 검수 프리뷰 열기');

      fireEvent.click(openPreviewBtn);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: '모션 도해 지원 수준 로컬 검수 프리뷰' }),
        ).toBeInTheDocument();
      });
    });
  });
});
