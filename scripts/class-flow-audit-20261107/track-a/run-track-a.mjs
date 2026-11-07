#!/usr/bin/env node
/**
 * Track A — Nested Repetitions, Unilateral/Bilateral, Rest, and Transition Time Boundary Audit
 * Scope: Small Movement (HumanMovementDraft / MovementIdea) -> Intermediate Block (ReusableBlock) -> Sequence (SequenceStep[] / Simulation / Snapshot)
 * Strictly READ-ONLY against application source files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  launchChromiumBrowser,
  sleep,
  startViteTestServer,
} from '../shared/cdp-harness.mjs';
import {
  AUDIT_DATE_ISO,
  SYNTHETIC_BOUNDARY_CASES,
  SYNTHETIC_MOVEMENT_IDEAS,
} from '../shared/synthetic-fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DOCS_TRACK_A_DIR = path.join(PROJECT_ROOT, 'docs/class-flow-audit-20261107/track-a');
const SCREENSHOT_DIR = path.join(DOCS_TRACK_A_DIR, 'screenshots');

function installMemoryBrowserEnv() {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => {
      store.set(key, String(val));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.localStorage = storage;
  globalThis.sessionStorage = storage;
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
  globalThis.window.localStorage = storage;
  globalThis.window.sessionStorage = storage;
  if (typeof globalThis.window.dispatchEvent !== 'function') {
    globalThis.window.dispatchEvent = () => true;
  }
  if (typeof globalThis.window.addEventListener !== 'function') {
    globalThis.window.addEventListener = () => {};
    globalThis.window.removeEventListener = () => {};
  }
  return storage;
}

export async function runTrackA({ baseUrl } = {}) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const storage = installMemoryBrowserEnv();

  const assertions = [];
  const defects = [];
  const recordAssertion = (id, category, title, passed, details) => {
    assertions.push({ id, category, title, passed, details });
  };
  const recordDefect = (defect) => {
    defects.push(defect);
  };

  // 1. Load exact TS modules via Vite SSR loader (zero source modifications)
  const viteSsr = await createViteServer({
    root: PROJECT_ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const movementIdeaMod = await viteSsr.ssrLoadModule('/src/utils/movementIdeaDraft.ts');
    const hierarchyMod = await viteSsr.ssrLoadModule('/src/utils/hierarchyModel.ts');
    const sequenceEngineMod = await viteSsr.ssrLoadModule('/src/utils/sequenceEngine.ts');
    const sequenceSimMod = await viteSsr.ssrLoadModule('/src/utils/sequenceSimulation.ts');
    const stepEstimateMod = await viteSsr.ssrLoadModule('/src/utils/stepTimeEstimate.ts');
    const cloudSchemaMod = await viteSsr.ssrLoadModule('/src/schemas/cloudBackupSchema.ts');
    const storeMod = await viteSsr.ssrLoadModule('/src/store/usePilatesStore.ts');

    const {
      calculateIdeaStepTimeBreakdown,
      saveMovementIdeaDraft,
      addMovementIdeaToCurrentClass,
      saveIdeaToReusableBlock,
      insertIdeaReusableBlockToCurrentClass,
      getMovementIdeaMeta,
      clearMovementIdeaWorkingBuffer,
    } = movementIdeaMod;

    const {
      createHumanMovementDraft,
      createReusableBlock,
      adjustReusableBlockItemDuration,
      updateReusableBlockItemOptions,
      summarizeReusableBlockTiming,
      scaleReusableBlockDuration,
      insertReusableBlockIntoSequence,
      editSequenceStepWithIsolation,
      duplicateSequenceBlockInstance,
      removeSequenceBlockInstance,
      adjustSequenceBlockInstanceDuration,
      createClassSequenceSnapshot,
      cloneClassSnapshotToDraft,
    } = hierarchyMod;

    const {
      getStepTiming,
      getSequenceDurations,
    } = sequenceEngineMod;

    const insertRestStep = (steps, afterIndex, durationMin) => {
      const rest = {
        kind: 'rest',
        stepId: `step-rest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order: 1,
        blockCategory: 'warmup',
        exerciseId: '',
        durationMin,
        selectedLayer: 'standard',
      };
      const insertAt = Math.max(0, Math.min(steps.length, afterIndex + 1));
      const combined = [...steps.slice(0, insertAt), rest, ...steps.slice(insertAt)];
      return combined.map((s, idx) => ({ ...s, order: idx + 1 }));
    };

    const { buildSequenceSimulation, seekSequenceSimulation } = sequenceSimMod;
    const { calculateStepTimeEstimate } = stepEstimateMod;
    const {
      stepSchema,
      sequenceSchema,
      stepRepetitionsSchema,
    } = cloudSchemaMod;
    const { usePilatesStore } = storeMod;

    let scopeCounter = 1;
    const resetStudioScope = () => {
      storage.clear();
      storage.setItem('pilates-flow-idea-owner-scope-v1', `audit-track-a-scope-${scopeCounter++}`);
      clearMovementIdeaWorkingBuffer();
      usePilatesStore.getState().resetDemoData();
    };
    resetStudioScope();

    // =========================================================================
    // A1. Small Movement (작은 동작) — Timing, Unilateral, Repetitions & Sets Boundaries
    // =========================================================================
    const breakdownNormal = calculateIdeaStepTimeBreakdown({
      durationMin: 3,
      explanationSec: 25,
      transitionSec: 15,
    });
    recordAssertion(
      'A1-01',
      'small-movement-timing',
      'calculateIdeaStepTimeBreakdown computes totalSec=180, movementSec=140, explanationSec=25, transitionSec=15 for 3m movement',
      breakdownNormal.totalSec === 180 &&
        breakdownNormal.movementSec === 140 &&
        breakdownNormal.explanationSec === 25 &&
        breakdownNormal.transitionSec === 15,
      breakdownNormal,
    );

    const breakdownMinClamp = calculateIdeaStepTimeBreakdown({
      durationMin: 0.5, // 30s
      explanationSec: 25,
      transitionSec: 20,
    });
    recordAssertion(
      'A1-02',
      'small-movement-timing',
      'calculateIdeaStepTimeBreakdown clamps explanationSec+transitionSec to totalSec-10 (guarantees movementSec >= 10s)',
      breakdownMinClamp.totalSec === 30 &&
        breakdownMinClamp.explanationSec === 20 &&
        breakdownMinClamp.transitionSec === 0 &&
        breakdownMinClamp.movementSec === 10,
      breakdownMinClamp,
    );

    // Check sideMode='left' vs isUnilateral in saveMovementIdeaDraft vs getStepTiming
    const savedSingleSide = saveMovementIdeaDraft({
      ideaLine: '리포머 좌측 단일 편측 스트레치',
      workingTitle: '좌측 단일 스트레치',
      apparatus: 'reformer',
      durationMin: 2,
      sideMode: 'left',
      explanationSec: 20,
      transitionSec: 10,
    });
    const singleSideEx = savedSingleSide.exercise;
    const stepExplicitLeftTiming = getStepTiming(
      {
        stepId: 'step-left-explicit',
        order: 1,
        blockCategory: 'core',
        exerciseId: singleSideEx.id,
        durationMin: 2,
        selectedLayer: 'standard',
        sideMode: 'left',
        explanationSec: 20,
        transitionSec: 10,
      },
      singleSideEx,
    );
    const stepDefaultSideTiming = getStepTiming(
      {
        stepId: 'step-left-default-side',
        order: 1,
        blockCategory: 'core',
        exerciseId: singleSideEx.id,
        durationMin: 2,
        selectedLayer: 'standard',
        explanationSec: 20,
        transitionSec: 10,
      },
      singleSideEx,
    );
    const singleSideMismatch =
      singleSideEx.isUnilateral === true &&
      stepExplicitLeftTiming.sides === 1 &&
      stepDefaultSideTiming.sides === 2;

    recordAssertion(
      'A1-03',
      'unilateral-boundary',
      'Single-side unilateral (sideMode="left") consistency between exercise.isUnilateral and SequenceEngine getStepTiming when step.sideMode is explicit vs default',
      !singleSideMismatch,
      {
        authoredSideMode: 'left',
        exerciseIsUnilateral: singleSideEx.isUnilateral,
        explicitLeftSides: stepExplicitLeftTiming.sides,
        explicitLeftPerSideSec: stepExplicitLeftTiming.perSideSec,
        defaultFallbackSides: stepDefaultSideTiming.sides,
        defaultFallbackPerSideSec: stepDefaultSideTiming.perSideSec,
      },
    );

    if (singleSideMismatch) {
      recordDefect({
        id: 'DEF-A01',
        track: 'A',
        severity: 'medium',
        title:
          '단일 방향 편측(sideMode="left"|"right") 동작 저장 시 isUnilateral=true로 기록되어 기본 좌우 모드(동작 기본)에서 2방향(양쪽 교대)으로 오계산됨',
        files: [
          'src/utils/movementIdeaDraft.ts:875',
          'src/utils/sequenceEngine.ts:393-400',
          'src/utils/sequenceEngine.ts:412-428',
        ],
        reproduction:
          'MovementIdeaSheet에서 좌우 수행 방식을 "왼쪽만(left)" 또는 "오른쪽만(right)"으로 선택해 저장하면 saveMovementIdeaDraft(875행)는 isUnilateral: sideMode !== "together"로 true를 저장합니다. 이후 해당 동작을 보관함에서 추가하거나 인스펙터에서 수행할 쪽을 "동작 기본"(undefined)으로 두면 getStepTiming(398행)과 getStepSideLabels(426행)가 exercise.isUnilateral === true만 보고 sides=2(첫 번째 쪽 45초 + 반대쪽 45초)로 2분할 계산합니다.',
        minimalFix:
          'saveMovementIdeaDraft(875행)에서 isUnilateral은 양방향 교대 수행(sideMode === "left-then-right" || sideMode === "right-then-left")일 때만 true로 설정하거나, 동작 기본 sideMode 메타데이터를 보존해 단일 방향(sides=1)과 양방향 교대(sides=2)를 구분합니다.',
      });
    }

    // Repetitions & Sets upper-bound schema divergence across layers
    const baseExerciseForBlock = usePilatesStore.getState().exercises[0];
    const probeBlock = createReusableBlock(
      {
        title: '경계 테스트 블록',
        sectionRole: 'main',
        items: [{ exerciseId: baseExerciseForBlock.id, durationMin: 3 }],
        now: AUDIT_DATE_ISO,
      },
      usePilatesStore.getState().exercises,
    );
    const repBoundaryResults = SYNTHETIC_BOUNDARY_CASES.repetitions.map((tc) => {
      let inHumanDraftSchema = false;
      try {
        const d = createHumanMovementDraft({
          ideaLine: '경계 테스트',
          defaultRepetitions: tc.value,
          now: AUDIT_DATE_ISO,
        });
        inHumanDraftSchema = d.defaultRepetitions === tc.value;
      } catch {
        inHumanDraftSchema = false;
      }
      let inReusableBlockSchema = false;
      try {
        const b = updateReusableBlockItemOptions(
          probeBlock,
          0,
          { repetitions: tc.value },
          AUDIT_DATE_ISO,
        );
        inReusableBlockSchema = b.items[0].repetitions === tc.value;
      } catch {
        inReusableBlockSchema = false;
      }
      const inStepSchema = stepRepetitionsSchema.safeParse(tc.value).success;
      return {
        ...tc,
        inHumanDraftSchema,
        inReusableBlockSchema,
        inStepSchema,
      };
    });

    // Test 1: saveMovementIdeaDraft with repetitions=1500, sets=150 throws uncaught ZodError instead of returning { success: false, error }
    let uncaughtOverMaxError = null;
    try {
      saveMovementIdeaDraft({
        ideaLine: '반복 횟수 1500 상한 초과 테스트',
        workingTitle: '반복 1500 테스트',
        apparatus: 'mat',
        durationMin: 3,
        repetitions: 1500,
        sets: 150,
      });
    } catch (err) {
      uncaughtOverMaxError = err.message;
    }

    // Test 2: saveMovementIdeaDraft with repetitions=600, sets=60 succeeds in humanMovementCreation (max 1000/100)
    // but fails saveIdeaToReusableBlock / reusableBlockSchema (max 500/50)!
    const saved600 = saveMovementIdeaDraft({
      ideaLine: '반복 횟수 600 스키마 불일치 테스트',
      workingTitle: '반복 600 테스트',
      apparatus: 'mat',
      durationMin: 3,
      repetitions: 600,
      sets: 60,
    });
    const block600Attempt = saveIdeaToReusableBlock({
      exerciseId: saved600.exercise.id,
      blockTitle: '600회 블록 충돌 테스트',
      repetitions: saved600.exercise.defaultRepetitions,
      sets: saved600.exercise.defaultSets,
    });

    // Test 3: clearing repetitions/sets on an existing movement idea
    const clearedAttempt = saveMovementIdeaDraft({
      existingExerciseId: saved600.exercise.id,
      ideaLine: '반복 횟수 600 스키마 불일치 테스트',
      workingTitle: '반복 600 테스트',
      apparatus: 'mat',
      durationMin: 3,
      repetitions: undefined,
      sets: undefined,
      explanationSec: undefined,
      transitionSec: undefined,
    });
    const metaAfterClear = getMovementIdeaMeta(clearedAttempt.exercise);
    const clearFailedToRemoveReps =
      clearedAttempt.exercise.defaultRepetitions !== undefined ||
      metaAfterClear?.repetitions !== undefined;

    recordAssertion(
      'A1-04',
      'repetitions-sets-boundary',
      'saveMovementIdeaDraft handles out-of-range repetitions gracefully without uncaught ZodError, aligns max bounds across MovementIdea/ReusableBlock/Step schemas, and allows clearing optional repetitions/sets on edit',
      !uncaughtOverMaxError && block600Attempt.success && !clearFailedToRemoveReps,
      {
        repBoundaryResults,
        uncaughtOverMaxError: uncaughtOverMaxError ? 'ZodError thrown uncaught' : null,
        saved600Reps: saved600.exercise?.defaultRepetitions,
        saved600Sets: saved600.exercise?.defaultSets,
        block600Success: block600Attempt.success,
        block600Message: block600Attempt.message,
        clearedExerciseReps: clearedAttempt.exercise?.defaultRepetitions,
        clearedMetaReps: metaAfterClear?.repetitions,
      },
    );

    if (uncaughtOverMaxError || !block600Attempt.success || clearFailedToRemoveReps) {
      recordDefect({
        id: 'DEF-A02',
        track: 'A',
        severity: 'high',
        title:
          '반복·세트 경계값 불일치(블록 500/50 vs 동작·스텝 1000/100)로 인한 미처리 ZodError 예외 발생, 블록 생성 거부 및 기존 반복·세트 값 초기화 불가',
        files: [
          'src/components/MovementIdeaSheet.tsx:314-340',
          'src/utils/movementIdeaDraft.ts:802-849',
          'src/utils/humanMovementCreation.ts:96',
          'src/utils/hierarchyModel.ts:127-128',
          'src/utils/hierarchyModel.ts:185-186',
        ],
        reproduction:
          '1) MovementIdeaSheet는 <form noValidate>를 사용하므로 횟수 1000 초과(예: 1500) 또는 세트 100 초과(예: 150) 입력 후 저장 시, saveMovementIdeaDraft(830행) 내부 syncHumanDraftOnSave가 try/catch 없이 ZodError를 던져 UI 에러 배너 표시 없이 클릭 핸들러가 중단됩니다.\n2) 횟수 501~1000(예: 600) 또는 세트 51~100(예: 60)은 새 동작 저장에서는 통과(humanMovementCreation.ts 상한 1000/100)하지만, 해당 동작으로 중간 블록 생성(saveIdeaToReusableBlock) 시 reusableBlockItemSchema(hierarchyModel.ts:185행, 상한 500/50)에서 ZodError로 실패합니다.\n3) 이미 저장한 동작을 다시 열어 횟수·세트·설명·전환 입력칸을 비우거나 0을 입력해도 saveMovementIdeaDraft(807, 811, 817, 821행)가 existingMeta 값을 재사용해 값을 지울 수 없습니다.',
        minimalFix:
          'saveMovementIdeaDraft에서 repetitions/sets 상한을 전 계층 공통 범위(예: 1..500 / 1..50)로 클램프하거나 검증 실패 시 { success: false, error }를 반환하도록 try/catch로 감싸고, 수정 시 빈 값(undefined)이 전달되면 existingMeta 폴백 대신 undefined로 초기화합니다.',
      });
    }

    // Reset clean store state before A2/A3
    resetStudioScope();

    // =========================================================================
    // A2. Intermediate Block (중간 재사용 블록) — Creation, Summary, Scaling & Overhead Clamp
    // =========================================================================
    const idea1 = saveMovementIdeaDraft(SYNTHETIC_MOVEMENT_IDEAS[0]).exercise;
    const idea2 = saveMovementIdeaDraft(SYNTHETIC_MOVEMENT_IDEAS[1]).exercise;
    const ideaShort = saveMovementIdeaDraft(SYNTHETIC_MOVEMENT_IDEAS[2]).exercise;

    const blockStep1Res = saveIdeaToReusableBlock({
      exerciseId: idea1.id,
      blockTitle: '리포머 코어·스트랩 세트 블록',
      sectionRole: 'main',
      durationMin: 3,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      explanationSec: 25,
      transitionSec: 0,
    });
    const blockStep2Res = saveIdeaToReusableBlock({
      exerciseId: idea2.id,
      blockId: blockStep1Res.block.id,
      durationMin: 4,
      repetitions: 6,
      sets: 2,
      sideMode: 'left-then-right',
      explanationSec: 20,
      transitionSec: 20,
    });
    const blockNormal = blockStep2Res.block;

    const blockSummary = summarizeReusableBlockTiming(
      blockNormal,
      usePilatesStore.getState().exercises,
    );
    recordAssertion(
      'A2-01',
      'reusable-block-timing',
      'summarizeReusableBlockTiming accurately sums nested item durations, explanationSec, transitionSec, movementSec, and unilateralItemCount',
      blockSummary.itemCount === 2 &&
        blockSummary.unilateralItemCount === 1 &&
        blockSummary.totalSec === 420 &&
        blockSummary.explanationSec === 45 &&
        blockSummary.transitionSec === 20 &&
        blockSummary.movementSec === 355,
      blockSummary,
    );

    // Test scaling ReusableBlock duration to targetTotalMin (10m) and below minimum threshold (1.5m)
    const scaledBlock10m = scaleReusableBlockDuration(blockNormal, 10, AUDIT_DATE_ISO);
    const scaledSummary10m = summarizeReusableBlockTiming(scaledBlock10m);
    let scaleBelowMinError = null;
    try {
      scaleReusableBlockDuration(blockNormal, 1.5, AUDIT_DATE_ISO);
    } catch (err) {
      scaleBelowMinError = err.message;
    }

    recordAssertion(
      'A2-02',
      'reusable-block-scaling',
      'scaleReusableBlockDuration scales totalSec to 600s (10m) and rejects targetTotalMin below minimum (explanation+transition+30s)',
      scaledSummary10m.totalSec === 600 && Boolean(scaleBelowMinError),
      {
        scaledTotalSec: scaledSummary10m.totalSec,
        scaledItemDurationsMin: scaledBlock10m.items.map((i) => i.durationMin),
        scaleBelowMinError,
      },
    );

    // Boundary test:
    // 1) adjustReusableBlockItemDuration to 0.5m (30s) when item has explanationSec=20, transitionSec=20 (40s > 30s) -> rejected by reusableBlockSchema
    // 2) createReusableBlock without selectedLayer -> insertReusableBlockIntoSequence leaves step.selectedLayer === undefined, which FAILS stepSchema on reload!
    let shrunkBlockRejectedError = null;
    try {
      adjustReusableBlockItemDuration(blockNormal, 1, 0.5, AUDIT_DATE_ISO);
    } catch (err) {
      shrunkBlockRejectedError = err.message;
    }

    const rawCreatedBlock = createReusableBlock(
      {
        title: '레이어 미지정 블록',
        sectionRole: 'main',
        items: [{ exerciseId: idea1.id, durationMin: 3 }],
        now: AUDIT_DATE_ISO,
      },
      usePilatesStore.getState().exercises,
    );
    const rawInsertedStep = insertReusableBlockIntoSequence([], rawCreatedBlock).steps[0];
    const rawInsertedStepParse = stepSchema.safeParse(rawInsertedStep);

    recordAssertion(
      'A2-03',
      'reusable-block-persistence-safety',
      'reusableBlockSchema rejects overhead > durationMin*60, and steps instantiated from ReusableBlock always pass stepSchema (including default selectedLayer)',
      Boolean(shrunkBlockRejectedError) && rawInsertedStepParse.success,
      {
        shrunkBlockRejectedBySchema: Boolean(shrunkBlockRejectedError),
        rawInsertedStepSelectedLayer: rawInsertedStep.selectedLayer,
        rawInsertedStepParseSuccess: rawInsertedStepParse.success,
        rawInsertedStepError: rawInsertedStepParse.error?.issues?.[0]?.message,
      },
    );

    if (!rawInsertedStepParse.success) {
      recordDefect({
        id: 'DEF-A03',
        track: 'A',
        severity: 'high',
        title:
          'createReusableBlock / insertReusableBlockIntoSequence에서 selectedLayer 미지정 시 SequenceStep.selectedLayer가 undefined가 되어 새로고침 시 stepSchema 검증 실패 및 저장 수업 전체 초기화 위험',
        files: [
          'src/utils/hierarchyModel.ts:178-195',
          'src/utils/hierarchyModel.ts:832-852',
          'src/utils/hierarchyModel.ts:1477-1501',
          'src/schemas/cloudBackupSchema.ts:299',
          'src/store/usePilatesStore.ts:2464',
          'src/store/usePilatesStore.ts:2481-2482',
        ],
        reproduction:
          '1) createReusableBlock(832행)에서 item.selectedLayer는 선택(optional) 필드이며, insertReusableBlockIntoSequence(1489행) 역시 기본값("standard") 없이 selectedLayer: item.selectedLayer(undefined)를 SequenceStep에 그대로 복사합니다.\n2) 반면 영속화 스키마인 stepSchema(cloudBackupSchema.ts:299행)는 selectedLayer: layerSchema를 필수(non-optional)로 요구합니다.\n3) 더 나아가 usePilatesStore.ts(2481행)는 z.array(sequenceSchema).safeParse(raw.savedSequences)로 전체 배열을 한 번에 검증하므로, 단 1개의 스텝이라도 스키마에 어긋나면 사용자가 저장한 전체 savedSequences 배열이 통째로 폐기되고 초기 샘플로 리셋됩니다.',
        minimalFix:
          '1) createReusableBlock(845행) 및 insertReusableBlockIntoSequence(1489행)에서 selectedLayer: item.selectedLayer ?? "standard" 기본값을 보장합니다.\n2) usePilatesStore.ts(2481행)에서 savedSequences 복원 시 개별 항목 단위 safeParse 필터링으로 단일 스키마 오류가 전체 저장 수업을 초기화하지 않도록 보호합니다.',
      });
    }

    // =========================================================================
    // A3. Sequence Composition & Block Instance Operations (시퀀스 편입 및 중첩 블록 제어)
    // =========================================================================
    usePilatesStore.setState({
      activeSteps: [],
      undoStack: [],
    });

    // Add first movement idea to an empty sequence
    const addFirstResult = addMovementIdeaToCurrentClass(idea1.id);
    const stateAfterFirstIdea = usePilatesStore.getState();
    const firstStep = stateAfterFirstIdea.activeSteps[0];

    recordAssertion(
      'A3-01',
      'first-step-transition',
      'First movement added to an empty class should have transitionSec === 0',
      addFirstResult.success && firstStep?.transitionSec === 0,
      {
        addFirstResult,
        firstStepTransitionSec: firstStep?.transitionSec,
        firstStepExplanationSec: firstStep?.explanationSec,
        firstStepDurationMin: firstStep?.durationMin,
      },
    );

    if (firstStep?.transitionSec !== 0) {
      recordDefect({
        id: 'DEF-A04',
        track: 'A',
        severity: 'medium',
        title:
          '빈 수업에 첫 새 동작 추가 시 addMovementIdeaToCurrentClass 기본 경로에서 첫 동작 전환시간(transitionSec: 15초)이 0초로 초기화되지 않고 잔류함',
        files: [
          'src/utils/movementIdeaDraft.ts:1666-1684',
          'src/utils/movementIdeaDraft.ts:1702',
          'src/store/usePilatesStore.ts:1772-1776',
        ],
        reproduction:
          'activeSteps가 비어 있는 상태에서 새 동작을 만들고 "저장하고 수업에 넣기"를 실행하면, appendExerciseToSequence(usePilatesStore.ts:1772행)는 첫 동작의 transitionSec를 0으로 설정하지만 직후 addMovementIdeaToCurrentClass(1673행)가 transitionSec: timing.transitionSec(기본 15초)로 덮어씁니다. (반면 1702행 폴백 경로에만 afterAppend.activeSteps.length === 0 ? 0 : timing.transitionSec 분기가 존재함)',
        minimalFix:
          'src/utils/movementIdeaDraft.ts:1673에서 transitionSec: lastIdx === 0 ? 0 : timing.transitionSec으로 수정합니다.',
      });
    }

    // Now insert a ReusableBlock into the current class and test undoStack & inter-block transitionSec
    const undoDepthBeforeBlock = usePilatesStore.getState().undoStack.length;
    const insertBlockRes = insertIdeaReusableBlockToCurrentClass(blockNormal.id);
    const stateAfterBlock = usePilatesStore.getState();
    const undoDepthAfterBlock = stateAfterBlock.undoStack.length;
    const blockFirstInsertedStep = stateAfterBlock.activeSteps[1];

    recordAssertion(
      'A3-02',
      'block-insert-undo-and-transition',
      'insertIdeaReusableBlockToCurrentClass records undo snapshot in undoStack and sets non-zero transitionSec when appended after existing steps',
      insertBlockRes.success &&
        undoDepthAfterBlock === undoDepthBeforeBlock + 1 &&
        (blockFirstInsertedStep?.transitionSec ?? 0) > 0,
      {
        insertBlockRes,
        undoDepthBeforeBlock,
        undoDepthAfterBlock,
        blockFirstInsertedStepOrder: blockFirstInsertedStep?.order,
        blockFirstInsertedStepTransitionSec: blockFirstInsertedStep?.transitionSec,
      },
    );

    if (
      undoDepthAfterBlock !== undoDepthBeforeBlock + 1 ||
      (blockFirstInsertedStep?.transitionSec ?? 0) === 0
    ) {
      recordDefect({
        id: 'DEF-A05',
        track: 'A',
        severity: 'medium',
        title:
          '재사용 블록을 현재 수업에 삽입할 때 실행 취소 스택(undoStack) 및 수업 기구(activeApparatus) 동기화가 누락됨',
        files: [
          'src/utils/movementIdeaDraft.ts:1503-1514',
          'src/utils/hierarchyModel.ts:1462-1521',
        ],
        reproduction:
          'insertIdeaReusableBlockToCurrentClass(1508행)가 edit(state, ...) 헬퍼를 거치지 않고 usePilatesStore.setState({ activeSteps: inserted.steps, ... })를 직접 호출하여 undoStack에 이전 스냅샷이 저장되지 않습니다. 그 결과 블록 삽입 직후 "되돌리기(undoSequence)"를 누르면 블록 삽입만 취소되는 대신 그 이전 단계로 되돌아가거나 되돌리기 버튼이 비활성화되며, 빈 수업에 리포머 블록을 넣어도 activeApparatus가 기본값("mat")으로 남습니다.',
        minimalFix:
          'insertIdeaReusableBlockToCurrentClass에서 undoStack에 현재 스냅샷을 추가하고, 기존 activeSteps가 비어 있었을 경우 activeApparatus를 block.apparatus로 동기화합니다.',
      });
    }

    // Verify block instance isolation (edit / scale / duplicate / remove instance does NOT mutate template)
    const blockInstanceId = blockFirstInsertedStep.blockInstanceId;
    const isolatedEditedSteps = editSequenceStepWithIsolation(stateAfterBlock.activeSteps, 1, {
      durationMin: 5,
      repetitions: 12,
    });
    const scaledInstanceSteps = adjustSequenceBlockInstanceDuration(
      isolatedEditedSteps,
      blockInstanceId,
      11,
    );
    const duplicatedInstance = duplicateSequenceBlockInstance(scaledInstanceSteps, blockInstanceId);
    const afterRemoveCopy = removeSequenceBlockInstance(
      duplicatedInstance.steps,
      duplicatedInstance.duplicatedInstanceId,
    );

    recordAssertion(
      'A3-03',
      'block-instance-isolation',
      'Editing, scaling, duplicating, and removing a sequence block instance marks detached=true and never mutates the ReusableBlock template',
      isolatedEditedSteps[1].blockInstanceDetached === true &&
        isolatedEditedSteps[2].blockInstanceDetached === true &&
        blockNormal.items[0].durationMin === 3 &&
        blockNormal.items[0].repetitions === 8 &&
        duplicatedInstance.steps.length === 5 &&
        afterRemoveCopy.length === 3,
      {
        templateItem0Duration: blockNormal.items[0].durationMin,
        detachedFlags: isolatedEditedSteps.slice(1, 3).map((s) => s.blockInstanceDetached),
        scaledInstanceDurations: scaledInstanceSteps.slice(1, 3).map((s) => s.durationMin),
        duplicatedStepCount: duplicatedInstance.steps.length,
        afterRemoveCopyStepCount: afterRemoveCopy.length,
      },
    );

    // =========================================================================
    // A4. Rest Steps (휴식) & StepTimeEstimate (반복·세트·휴식 자동 시간 계산) Boundaries
    // =========================================================================
    const stepsWithRest = insertRestStep(afterRemoveCopy, 1, 2); // 2 min rest after step 2
    const durationsWithRest = getSequenceDurations(stepsWithRest);
    const restStep = stepsWithRest[2];
    const restStepSchemaValid = stepSchema.safeParse(restStep).success;

    // Sequence where rest >= targetMinutes must fail sequenceSchema
    const excessiveRestSteps = insertRestStep(afterRemoveCopy, 2, 50);
    const excessiveRestSeqValid = sequenceSchema.safeParse({
      id: 'seq-rest-overflow',
      title: '휴식 초과 테스트',
      subtitle: '테스트',
      apparatus: 'reformer',
      level: '1.0',
      focusTags: ['테스트'],
      targetMinutes: 50,
      steps: excessiveRestSteps,
      createdAt: AUDIT_DATE_ISO,
      updatedAt: AUDIT_DATE_ISO,
      taughtCount: 0,
    }).success;

    recordAssertion(
      'A4-01',
      'rest-step-boundaries',
      'Rest steps carry 0 explanation/transition/movementSec, count toward restSec+totalSec, and sequenceSchema rejects restSec >= targetMinutes',
      restStepSchemaValid &&
        durationsWithRest.restSec === 120 &&
        durationsWithRest.totalSec === durationsWithRest.exerciseSec + 120 &&
        !excessiveRestSeqValid,
      {
        restStep,
        durationsWithRest,
        excessiveRestSeqValid,
      },
    );

    // StepTimeEstimate boundary tests
    const estUnilateral2Sets = calculateStepTimeEstimate({
      version: 1,
      repetitions: 8,
      sets: 3,
      sides: 2,
      secondsPerRep: 6,
      holdSecPerRep: 0,
      breathsPerSet: 0,
      secondsPerBreath: 0,
      restBetweenSetsSec: 15,
      sideSwitchSec: 10,
      explanationSec: 20,
      transitionSec: 15,
    });

    const estBelowMinRejected = calculateStepTimeEstimate({
      version: 1,
      repetitions: 1,
      sets: 1,
      sides: 1,
      secondsPerRep: 5,
      holdSecPerRep: 0,
      breathsPerSet: 0,
      secondsPerBreath: 0,
      restBetweenSetsSec: 0,
      sideSwitchSec: 0,
      explanationSec: 0,
      transitionSec: 0,
    });

    const estAboveMaxRejected = calculateStepTimeEstimate({
      version: 1,
      repetitions: 20,
      sets: 3,
      sides: 2,
      secondsPerRep: 30,
      holdSecPerRep: 0,
      breathsPerSet: 0,
      secondsPerBreath: 0,
      restBetweenSetsSec: 60,
      sideSwitchSec: 15,
      explanationSec: 60,
      transitionSec: 45,
    });

    const estRepeatingFloat = calculateStepTimeEstimate({
      version: 1,
      repetitions: 8,
      sets: 2,
      sides: 1,
      secondsPerRep: 6,
      holdSecPerRep: 0,
      breathsPerSet: 0,
      secondsPerBreath: 0,
      restBetweenSetsSec: 13,
      sideSwitchSec: 0,
      explanationSec: 25,
      transitionSec: 15,
    });
    const durationMinStringLen = String(estRepeatingFloat.durationMin).length;

    recordAssertion(
      'A4-02',
      'step-time-estimate-boundaries',
      'calculateStepTimeEstimate computes movingSec + holdingSec + breathingSec + restingSec + switchingSec + explanationSec + transitionSec and enforces 30..1200s bounds',
      estUnilateral2Sets.success === true &&
        estUnilateral2Sets.movingSec === 288 &&
        estUnilateral2Sets.restingSec === 60 &&
        estUnilateral2Sets.switchingSec === 10 &&
        estUnilateral2Sets.totalSec === 393 &&
        estBelowMinRejected.success === false &&
        estAboveMaxRejected.success === false &&
        estRepeatingFloat.success === true &&
        estRepeatingFloat.totalSec === 149,
      {
        estUnilateral2Sets,
        estBelowMinRejected,
        estAboveMaxRejected,
        estRepeatingFloat,
        durationMinString: String(estRepeatingFloat.durationMin),
      },
    );

    if (durationMinStringLen > 8) {
      recordDefect({
        id: 'DEF-A06',
        track: 'A',
        severity: 'low',
        title:
          '반복·세트 자동 시간 계산(calculateStepTimeEstimate) 시 60으로 나누어떨어지지 않는 초(totalSec)가 무한소수 분(예: 2.4833333333333334)으로 블록 총시간 입력칸에 그대로 노출됨',
        files: [
          'src/utils/stepTimeEstimate.ts:42',
          'src/components/StepBlockInspector.tsx:232',
          'src/components/StepBlockInspector.tsx:351',
        ],
        reproduction:
          'StepBlockInspector의 "반복·유지·호흡으로 시간 계산"에서 60으로 나누어떨어지지 않는 합계(예: 149초 또는 179초)를 계산한 뒤 "계산값을 편집란에 넣기"를 누르면 totalSec / 60이 반올림 없이 그대로 String(durationMin)에 대입되어, 블록 총시간(분) 입력칸에 "2.4833333333333334" 같은 17자리 부동소수점 문자열이 표시됩니다.',
        minimalFix:
          'calculateStepTimeEstimate(stepTimeEstimate.ts:42행) 또는 StepBlockInspector(351행)에서 Number((totalSec / 60).toFixed(2))로 소수 둘째 자리 반올림 처리합니다.',
      });
    }

    // =========================================================================
    // A5. Sequence Simulation, Apparatus/Box/Spring/Pose Transitions & Class Snapshot
    // =========================================================================
    const allExercises = usePilatesStore.getState().exercises;
    const exReformerSupine = allExercises.find(
      (e) => e.apparatus === 'reformer' && e.bodyPosition === 'supine' && e.box === 'none',
    );
    const exReformerLongBoxProne = allExercises.find(
      (e) => e.apparatus === 'reformer' && e.box === 'long-box',
    );
    const exCadillac = allExercises.find((e) => e.apparatus === 'cadillac');

    const simSteps = [
      {
        stepId: 'sim-1',
        order: 1,
        blockCategory: exReformerSupine.blockCategory,
        exerciseId: exReformerSupine.id,
        durationMin: 4,
        selectedLayer: 'standard',
        explanationSec: 20,
        transitionSec: 0,
      },
      {
        stepId: 'sim-2',
        order: 2,
        blockCategory: exReformerLongBoxProne.blockCategory,
        exerciseId: exReformerLongBoxProne.id,
        durationMin: 4,
        selectedLayer: 'standard',
        explanationSec: 20,
        transitionSec: 15,
      },
      insertRestStep([], 0, 1)[0],
      {
        stepId: 'sim-4',
        order: 4,
        blockCategory: idea2.blockCategory,
        exerciseId: idea2.id,
        durationMin: 1.5, // 90s total; explanation 20 + transition 19 = 39 -> movementSec = 51s (odd!) -> perSideSec = 25.5s
        selectedLayer: 'standard',
        sideMode: 'left-then-right',
        explanationSec: 20,
        transitionSec: 19,
      },
      {
        stepId: 'sim-5',
        order: 5,
        blockCategory: exCadillac.blockCategory,
        exerciseId: exCadillac.id,
        durationMin: 4,
        selectedLayer: 'standard',
        explanationSec: 20,
        transitionSec: 15,
      },
    ].map((s, idx) => ({ ...s, order: idx + 1 }));

    const simReport = buildSequenceSimulation(simSteps, allExercises, 15);
    const oddUnilateralMovementSegments = simReport.segments.filter(
      (seg) => seg.stepId === 'sim-4' && seg.kind === 'movement',
    );
    const oddUnilateralPerSideSec = oddUnilateralMovementSegments[0]?.durationSec;
    const seekMidRest = seekSequenceSimulation(simReport, simReport.steps[2].startSec + 10);

    const classSnapshot = createClassSequenceSnapshot(
      {
        id: 'seq-audit-snapshot',
        title: '트랙 A 경계값 검증 시퀀스',
        subtitle: '초보 강사용 시간 시뮬레이션',
        apparatus: 'mixed',
        level: '1.0',
        targetMinutes: 15,
        steps: stepsWithRest,
        version: 1,
        updatedAt: AUDIT_DATE_ISO,
      },
      allExercises,
      AUDIT_DATE_ISO,
    );
    const clonedFromSnapshot = cloneClassSnapshotToDraft(classSnapshot, allExercises, {
      sourceKind: 'history-snapshot',
      now: AUDIT_DATE_ISO,
    });

    recordAssertion(
      'A5-01',
      'sequence-simulation-and-snapshot',
      'buildSequenceSimulation & createClassSequenceSnapshot preserve movementSec + teachingSec + transitionSec + restSec === totalSec, seek cleanly into rest/side segments, and clone snapshots without mutating originals',
      simReport.totals.totalSec ===
        simReport.totals.movementSec +
          simReport.totals.teachingSec +
          simReport.totals.transitionSec +
          simReport.totals.restSec &&
        oddUnilateralMovementSegments.length === 2 &&
        seekMidRest.segment?.kind === 'rest' &&
        classSnapshot.timeBreakdown.totalSec === durationsWithRest.totalSec &&
        clonedFromSnapshot.steps.length === stepsWithRest.length,
      {
        simTotals: simReport.totals,
        simGate: simReport.gate,
        seekMidRestKind: seekMidRest.segment?.kind,
        oddUnilateralPerSideSec,
        snapshotTimeBreakdown: classSnapshot.timeBreakdown,
      },
    );

    if (
      oddUnilateralPerSideSec !== undefined &&
      !Number.isInteger(oddUnilateralPerSideSec)
    ) {
      recordDefect({
        id: 'DEF-A07',
        track: 'A',
        severity: 'low',
        title:
          '홀수 실제 동작 시간(movementSec)의 양방향 편측 동작에서 시퀀스 엔진(getStepTiming/buildSequenceSimulation)은 소수점 초(.5초)를 반환하고 인스펙터/초안 시트는 내림(Math.floor) 초를 표시함',
        files: [
          'src/utils/sequenceEngine.ts:404',
          'src/utils/sequenceSimulation.ts:220',
          'src/utils/movementIdeaDraft.ts:501',
          'src/components/StepBlockInspector.tsx:266',
        ],
        reproduction:
          '양방향 편측 동작(left-then-right)의 실제 동작 시간(movementSec)이 51초(예: 전체 90초 - 설명 20초 - 전환 19초)일 때 getStepTiming과 buildSequenceSimulation은 perSideSec = 25.5초를 반환하는 반면, StepBlockInspector(266행)와 calculateIdeaStepTimeBreakdown(501행)은 Math.floor(51 / 2) = 25초로 표시합니다.',
        minimalFix:
          'getStepTiming 및 buildSequenceSimulation의 편측 시간 표시/계산을 계약서(MOVEMENT_CREATION_HIERARCHY_CONTRACT.md)에 맞춰 Math.floor(movementSec / 2)로 통일하거나 나머지 1초 배분 규칙을 명시합니다.',
      });
    }
  } finally {
    await viteSsr.close();
  }

  // =========================================================================
  // Part 2 — Real Browser Verification of Track A Timing Simulation UI
  // =========================================================================
  let ownServer = null;
  const targetUrl =
    baseUrl ||
    (ownServer = await startViteTestServer(PROJECT_ROOT)).url;
  const browser = await launchChromiumBrowser('track-a');

  try {
    const { session, targetId } = await browser.openPage(targetUrl);
    await session.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(900);

    await session.eval(`(() => {
      localStorage.clear();
      sessionStorage.clear();
      location.reload();
    })()`);
    await sleep(1100);

    // Click "한 줄 아이디어 메모" button on empty Workbench
    const openedIdeaSheet = await session.eval(`(() => {
      const btn =
        document.querySelector('.workbench-idea-action') ||
        Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('한 줄 아이디어 메모') || b.textContent?.includes('한 줄 동작 메모')
        );
      if (!btn) return false;
      btn.click();
      return true;
    })()`);
    await sleep(350);

    // Populate MovementIdeaSheet with unilateral left-then-right, 4 min, 6 reps, 2 sets, 20s expl, 20s trans
    const ideaUiState = await session.eval(`(() => {
      const setNativeValue = (el, value) => {
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : el.tagName === 'SELECT'
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype,
          'value'
        )?.set;
        setter?.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setNativeValue(document.querySelector('textarea[aria-label="한 줄 아이디어"]'), '리포머 싱글 레그 스트랩 원형 서클');

      // Open progressive disclosure details inside MovementIdeaSheet
      Array.from(document.querySelectorAll('.pf-idea-sheet details')).forEach((d) => {
        d.open = true;
      });

      setNativeValue(document.querySelector('input[aria-label="임시 이름"]'), '싱글 레그 스트랩 서클');
      setNativeValue(document.querySelector('input[aria-label="예상 시간 (분)"]'), '4');
      setNativeValue(document.querySelector('input[aria-label="반복 횟수"]'), '6');
      setNativeValue(document.querySelector('input[aria-label="세트 수"]'), '2');
      setNativeValue(document.querySelector('select[aria-label="좌우 수행 방식"]'), 'left-then-right');
      setNativeValue(document.querySelector('input[aria-label="설명 시간 (초)"]'), '20');
      setNativeValue(document.querySelector('input[aria-label="전환 시간 (초)"]'), '20');

      const previewEl = document.querySelector('[data-testid="idea-time-breakdown"]');
      return {
        previewText: previewEl?.textContent?.trim() || '',
      };
    })()`);

    await session.screenshot(path.join(SCREENSHOT_DIR, 'track-a-01-idea-sheet-timing-preview.png'));

    // Click "수업에 넣기" ([data-testid="idea-save-and-add"])
    await session.eval(`(() => {
      const addBtn = document.querySelector('[data-testid="idea-save-and-add"]');
      addBtn?.click();
    })()`);
    await sleep(450);

    // Open StepBlockInspector on step 1
    const inspectorOpened = await session.eval(`(() => {
      const editBtn =
        document.querySelector('button[aria-label="1번 동작 블록 편집"]') ||
        document.querySelector('.flow-step .step-title');
      editBtn?.click();
      return Boolean(editBtn);
    })()`);
    await sleep(350);

    await session.eval(`(() => {
      const setNativeValue = (el, value) => {
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const details = document.querySelector('.step-block-inspector details.step-time-estimate');
      if (details) details.open = true;

      const setFieldByLabel = (labelSubstring, val) => {
        const label = Array.from(
          document.querySelectorAll('.step-time-estimate .form-field')
        ).find((el) => el.textContent?.includes(labelSubstring));
        const input = label?.querySelector('input');
        setNativeValue(input, val);
        return Boolean(input);
      };

      setFieldByLabel('한 회 움직임 · 초', '5');
      setFieldByLabel('세트 사이 쉼 · 초', '6');
      setFieldByLabel('좌우 바꾸기 · 초', '5');
    })()`);
    await sleep(150);

    const afterEnableEstimate = await session.eval(`(() => {
      const details = document.querySelector('.step-block-inspector details.step-time-estimate');
      const applyEstimateBtn = Array.from(
        document.querySelectorAll('.step-time-estimate button')
      ).find((b) => b.textContent?.includes('계산값을 편집란에 넣기'));
      applyEstimateBtn?.click();

      const liveRegionText =
        document.querySelector('.step-time-estimate [aria-live="polite"]')?.textContent?.trim() ||
        '';
      return {
        detailsFound: Boolean(details),
        liveRegionText,
      };
    })()`);
    await sleep(150);

    const durationAfterApply = await session.eval(`(() => {
      const durationInput = document.querySelector(
        '.step-block-inspector .step-inspector-time-fields input[type="number"]'
      );
      return durationInput?.value || '';
    })()`);

    await session.screenshot(path.join(SCREENSHOT_DIR, 'track-a-02-step-inspector-time-estimate.png'));

    await session.eval(`(() => {
      const submitBtn = document.querySelector('.step-block-inspector button[type="submit"]');
      submitBtn?.click();
    })()`);
    await sleep(300);

    await session.eval(`(() => {
      const editBtn =
        document.querySelector('button[aria-label="1번 동작 블록 편집"]') ||
        document.querySelector('.flow-step .step-title');
      editBtn?.click();
    })()`);
    await sleep(200);

    const reopenedDurationInput = await session.eval(`(() => {
      const durationInput = document.querySelector(
        '.step-block-inspector .step-inspector-time-fields input[type="number"]'
      );
      return {
        durationInputValue: durationInput?.value || '',
      };
    })()`);

    recordAssertion(
      'A6-01',
      'browser-timing-ui',
      'Browser UI renders live timing breakdown in MovementIdeaSheet and StepTimeEstimateEditor inside StepBlockInspector',
      openedIdeaSheet &&
        ideaUiState.previewText.includes('240초') &&
        inspectorOpened &&
        afterEnableEstimate.detailsFound &&
        afterEnableEstimate.liveRegionText.includes('가정 총시간 02:37') &&
        durationAfterApply.startsWith('2.616666'),
      {
        ideaUiState,
        afterEnableEstimate,
        durationAfterApply,
        reopenedDurationInput,
      },
    );

    await browser.closeTarget(targetId);
  } finally {
    await browser.close();
    if (ownServer) {
      await ownServer.stop();
    }
  }

  const passedCount = assertions.filter((a) => a.passed).length;
  const failedCount = assertions.length - passedCount;
  const summary = {
    track: 'A',
    title: '작은 동작 → 중간 블록 → 시퀀스 중첩 반복·편측·휴식·전환시간 경계값 테스트',
    executedAt: new Date().toISOString(),
    totalAssertions: assertions.length,
    passedCount,
    failedCount,
    defectCount: defects.length,
    assertions,
    defects,
  };

  fs.writeFileSync(
    path.join(DOCS_TRACK_A_DIR, 'results.json'),
    JSON.stringify(summary, null, 2),
  );
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrlArg = process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1];
  runTrackA({ baseUrl: baseUrlArg })
    .then((res) => {
      console.log(
        `[Track A] Done: ${res.passedCount}/${res.totalAssertions} assertions passed, ${res.defectCount} reproduced defects.`,
      );
    })
    .catch((err) => {
      console.error('[Track A] Error:', err);
      process.exitCode = 1;
    });
}
