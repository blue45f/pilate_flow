import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { CatalogMotionInteractivePlayer } from '../components/CatalogMotionInteractivePlayer';
import { InlineExerciseFinder } from '../components/InlineExerciseFinder';
import { LiveStageKinematicDiagram } from '../components/LiveStageKinematicDiagram';
import { OfflinePresetPicker } from '../components/OfflinePresetPicker';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { StepBlockInspector } from '../components/StepBlockInspector';
import { Studio3DMotionHeroCard } from '../components/Studio3DMotionHeroCard';
import {
  CATALOG_CONTINUOUS_MOTION_ASSETS,
  getCatalogContinuousMotionAsset,
} from '../data/catalogMotionAssets';
import type { RigJointMap } from '../data/movementVisualRigCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLog, SavedSequence, SequenceStep } from '../types/pilates';
import { saveSequenceStepsAsReusableBlock } from '../utils/movementIdeaDraft';
import { openAdvancedWorkbench } from './workbenchControls';

const originalState = usePilatesStore.getState();

describe('Fast Instructor Sequence Authoring, Mobile/A11y Controls & Start-to-End Diagram Continuity', () => {
  beforeEach(() => {
    localStorage.clear();
    window.sessionStorage.clear();
    usePilatesStore.setState(originalState, true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    usePilatesStore.setState(originalState, true);
    localStorage.clear();
    window.sessionStorage.clear();
  });

  it('completes fast 6-step instructor authoring (기구·시간→검색/필터→순서·양측·반복·세트→묶음 저장/재사용→진행→기록) without mount storage writes or user data loss', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T09:00:00.000Z'));

    const base = usePilatesStore.getState();
    const exWarm =
      base.exercises.find((ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'warmup') ??
      base.exercises[0];
    const preservedSeq: SavedSequence = {
      id: 'preserve-seq-fast-flow-01',
      title: '기존 캐딜락 개인레슨 보관본',
      subtitle: '기존 사용자 데이터 보존 확인',
      apparatus: 'cadillac',
      level: '1.0',
      focusTags: ['흉추 가동성'],
      targetMinutes: 50,
      createdAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-01T08:00:00.000Z',
      taughtCount: 3,
      steps: [
        {
          kind: 'exercise',
          stepId: 'preserve-step-01',
          order: 1,
          exerciseId: exWarm.id,
          blockCategory: exWarm.blockCategory,
          durationMin: 10,
          selectedLayer: 'standard',
        },
      ],
    };
    const preservedLog: ClassHistoryLog = {
      id: 'preserve-log-fast-flow-01',
      sequenceId: preservedSeq.id,
      sequenceTitle: preservedSeq.title,
      groupId: base.classGroups[0].id,
      groupName: base.classGroups[0].name,
      taughtAt: '2026-11-03T08:00:00.000Z',
      apparatus: 'cadillac',
      level: '1.0',
      exerciseIds: [exWarm.id],
      rating: 5,
      intensity: 'moderate',
      instructorReflection: '기존 수업 이력 보존 검증용 메모',
      actualDurationSec: 2950,
    };

    usePilatesStore.setState({
      activeTab: 'workbench',
      activeSequenceId: undefined,
      activeTitle: '금요일 빠른 리포머 시퀀스',
      activeSubtitle: '편측 밸런스 집중',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeSteps: [],
      savedSequences: [preservedSeq],
      historyLogs: [preservedLog],
    });

    // Verify empty SequenceWorkbench mount performs zero storage writes and hides save button
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    storageSpy.mockRestore();
    cleanup();

    render(<App />);
    await openAdvancedWorkbench();

    // 1. 기구·수업시간 선택 → 1탭 바로 동작 담기
    const reformerHomeChips = screen.getAllByRole('button', { name: /리포머/ });
    fireEvent.click(reformerHomeChips[0]);
    const thirtyMinChips = screen.getAllByRole('button', { name: '30분' });
    fireEvent.click(thirtyMinChips[0]);

    fireEvent.click(screen.getByTestId('wizard-fast-step2-btn'));
    const step2Page = screen.getByTestId('wizard-step2-page');
    expect(step2Page).toBeInTheDocument();

    // 2. 동작 검색/필터 (편측 동작 1탭 필터 + 구간 필터) → 담기 → 바로 순서 다듬기 이동
    const unilateralChip = within(step2Page).getByTestId('ief-quick-unilateral-chip');
    expect(unilateralChip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(unilateralChip);
    expect(unilateralChip).toHaveAttribute('aria-pressed', 'true');

    let addButtons = within(step2Page).getAllByRole('button', { name: /수업안에 추가/ });
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);

    fireEvent.click(unilateralChip);
    expect(unilateralChip).toHaveAttribute('aria-pressed', 'false');

    const warmupChip = within(step2Page).getByTestId('ief-quick-section-warmup');
    fireEvent.click(warmupChip);
    addButtons = within(step2Page).getAllByRole('button', { name: /수업안에 추가/ });
    fireEvent.click(addButtons[0]);

    const cooldownChip = within(step2Page).getByTestId('ief-quick-section-cooldown');
    fireEvent.click(cooldownChip);
    addButtons = within(step2Page).getAllByRole('button', { name: /수업안에 추가/ });
    fireEvent.click(addButtons[0]);

    expect(usePilatesStore.getState().activeSteps).toHaveLength(3);
    fireEvent.click(within(step2Page).getByTestId('ief-go-arrange-btn'));

    // 3. 순서·양측·반복·세트 1탭 인라인 편집
    const tenRepBtn = screen.getByRole('button', { name: '1번 동작 10회 반복' });
    fireEvent.click(tenRepBtn);
    expect(tenRepBtn).toHaveAttribute('aria-pressed', 'true');

    const twoSetBtn = screen.getByRole('button', { name: '1번 동작 2세트' });
    fireEvent.click(twoSetBtn);
    expect(twoSetBtn).toHaveAttribute('aria-pressed', 'true');

    const leftToRightBtn = screen.getByRole('button', { name: '1번 동작 좌→우 편측 수행' });
    fireEvent.click(leftToRightBtn);
    expect(leftToRightBtn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      usePilatesStore.getState().moveStep(1, 'up');
    });

    const configuredStep = usePilatesStore
      .getState()
      .activeSteps.find((st) => st.repetitions === 10);
    expect(configuredStep).toMatchObject({
      repetitions: 10,
      sets: 2,
      sideMode: 'left-then-right',
    });

    // 4. 그룹(동작 묶음) 전체 선택 저장 → 새 빈 수업에서 1탭 재사용 + 후속 동작 추가 검증
    fireEvent.click(screen.getByTestId('toggle-select-all-bundle-btn'));
    const bundleBar = screen.getByTestId('step3-bundle-selection-bar');
    fireEvent.change(within(bundleBar).getByRole('textbox', { name: '선택 동작 묶음 이름' }), {
      target: { value: '리포머 편측·코어 3종 묶음' },
    });
    fireEvent.click(within(bundleBar).getByTestId('save-selected-steps-bundle-btn'));

    // Reset to a brand-new blank sequence on default Mat/1.0 to test empty-sequence block reuse sync
    act(() => {
      usePilatesStore.setState({
        activeSequenceId: undefined,
        activeTitle: '오후 리포머 재사용 수업',
        activeSubtitle: '저장 묶음 재사용 테스트',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 30,
        activeSteps: [],
        draftCriteria: null,
        lastCriteria: null,
      });
    });

    const wizardHomeTab = screen
      .getAllByRole('button', { name: /시작하기/ })
      .find((b) => b.classList.contains('pf-step-wizard-tab'));
    if (wizardHomeTab) fireEvent.click(wizardHomeTab);

    const quickReusableStrip = await screen.findByTestId('quick-reusable-blocks-strip');
    const reusablePill = within(quickReusableStrip).getByRole('button', {
      name: /리포머 편측·코어 3종 묶음/,
    });
    fireEvent.click(reusablePill);

    const afterReuse = usePilatesStore.getState();
    expect(afterReuse.activeSteps).toHaveLength(3);
    expect(afterReuse.activeApparatus).toBe('reformer');
    expect(
      afterReuse.activeSteps.some(
        (st) => st.repetitions === 10 && st.sets === 2 && st.sideMode === 'left-then-right',
      ),
    ).toBe(true);

    // Verify appending another Reformer exercise works immediately without stale 'mat' block!
    const extraReformerEx = afterReuse.exercises.find(
      (ex) =>
        ex.apparatus === 'reformer' &&
        ex.id.startsWith('original-') &&
        !afterReuse.activeSteps.some((st) => st.exerciseId === ex.id),
    );
    if (extraReformerEx) {
      act(() => {
        usePilatesStore
          .getState()
          .appendExerciseToSequence(extraReformerEx.id, extraReformerEx.blockCategory);
      });
      expect(usePilatesStore.getState().activeSteps.length).toBe(4);
    }

    // 5. 모바일 고정 하단 바 빠른 저장 → 수업 진행 → 종료 → 기록 남기기
    const stickySaveBtn = screen.getByTestId('p04-mobile-sticky-save-btn');
    fireEvent.click(stickySaveBtn);
    const savedSeqId = usePilatesStore.getState().activeSequenceId;
    expect(savedSeqId).toBeTruthy();

    const stickyCta = screen.getByTestId('p04-mobile-sticky-live-cta');
    fireEvent.click(within(stickyCta).getByRole('button', { name: /라이브 진행 열기/ }));

    await waitFor(
      () => {
        expect(usePilatesStore.getState().activeTab).toBe('stage');
      },
      { timeout: 10000 },
    );

    fireEvent.click(await screen.findByRole('button', { name: '수업 시작' }, { timeout: 10000 }));
    act(() => {
      vi.setSystemTime(Date.now() + 12_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const totalStepCount = usePilatesStore.getState().activeSteps.length;
    for (let i = 1; i < totalStepCount; i += 1) {
      fireEvent.keyDown(window, { key: 'PageDown', code: 'PageDown' });
    }

    fireEvent.click(screen.getByTestId('live-stage-finish-cta-btn'));
    const finishDialog = await screen.findByRole(
      'dialog',
      { name: '수업 진행을 마칠까요?' },
      { timeout: 10000 },
    );
    fireEvent.click(within(finishDialog).getByRole('button', { name: /검토하고 기록하기/ }));

    const logDialog = await screen.findByRole(
      'dialog',
      { name: '수업 기록 남기기' },
      { timeout: 15000 },
    );
    fireEvent.change(
      within(logDialog).getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' }),
      {
        target: { value: '좌→우 편측 10회·2세트 수행 시 골반 정렬 안정적 유지 확인' },
      },
    );
    fireEvent.click(within(logDialog).getByRole('button', { name: /수업 기록 저장/ }));

    await waitFor(
      () => {
        expect(usePilatesStore.getState().activeTab).toBe('history');
      },
      { timeout: 10000 },
    );

    const finalState = usePilatesStore.getState();
    expect(finalState.historyLogs).toHaveLength(2);
    expect(finalState.historyLogs[0]).toMatchObject({
      sequenceId: savedSeqId,
      sequenceTitle: '오후 리포머 재사용 수업',
      actualDurationSec: 12,
    });
    expect(finalState.historyLogs.some((l) => l.id === 'preserve-log-fast-flow-01')).toBe(true);
    expect(finalState.savedSequences.some((s) => s.id === 'preserve-seq-fast-flow-01')).toBe(true);
  }, 30000);

  it('re-syncs InlineExerciseFinder equipment filter when classEquipment changes and surfaces unilateral/reps counts in OfflinePresetPicker', () => {
    const onOpenEx = vi.fn();
    const { rerender } = render(
      <InlineExerciseFinder
        active
        autoNarrowToClassEquipment
        onOpenExercise={onOpenEx}
        classEquipment={['reformer']}
      />,
    );
    expect(screen.getByRole('button', { name: '리포머 필터 해제' })).toBeInTheDocument();

    rerender(
      <InlineExerciseFinder
        active
        autoNarrowToClassEquipment
        onOpenExercise={onOpenEx}
        classEquipment={['chair']}
      />,
    );
    expect(screen.getByRole('button', { name: '체어 필터 해제' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '리포머 필터 해제' })).toBeNull();
    cleanup();

    const state = usePilatesStore.getState();
    const reformerEx =
      state.exercises.find((e) => e.apparatus === 'reformer' && e.id.startsWith('original-')) ??
      state.exercises[0];
    const blockSteps: SequenceStep[] = [
      {
        kind: 'exercise',
        stepId: 'picker-meta-step-1',
        order: 1,
        exerciseId: reformerEx.id,
        blockCategory: reformerEx.blockCategory,
        durationMin: 4,
        repetitions: 12,
        sets: 2,
        sideMode: 'left-then-right',
        selectedLayer: 'standard',
      },
    ];
    saveSequenceStepsAsReusableBlock({
      steps: blockSteps,
      title: '편측·반복 메타 검증 블록',
    });

    render(<OfflinePresetPicker onApplied={vi.fn()} />);
    const reusableTab = screen.getByRole('button', { name: /내 재사용 블록/ });
    fireEvent.click(reusableTab);
    expect(screen.getByText('편측·반복 메타 검증 블록')).toBeInTheDocument();
    expect(screen.getByText(/편측 1 · 반복 설정 1/)).toBeInTheDocument();
  });

  it('supports arrow-key roving across toolbars and top-level quick side/reps/sets controls in StepBlockInspector', () => {
    const state = usePilatesStore.getState();
    const ex =
      state.exercises.find((e) => e.apparatus === 'reformer' && e.id.startsWith('original-')) ??
      state.exercises[0];
    const step: SequenceStep = {
      kind: 'exercise',
      stepId: 'insp-quick-1',
      order: 1,
      exerciseId: ex.id,
      blockCategory: ex.blockCategory,
      durationMin: 4,
      selectedLayer: 'standard',
    };
    usePilatesStore.setState({ activeSteps: [step], activeApparatus: 'reformer' });

    render(
      <StepBlockInspector
        index={0}
        step={usePilatesStore.getState().activeSteps[0]}
        onClose={vi.fn()}
        onOpenExercise={vi.fn()}
        onReplace={vi.fn()}
      />,
    );

    const quickSideGroup = screen.getByTestId('step-inspector-quick-side-group');
    const quickRepsGroup = screen.getByTestId('step-inspector-quick-reps-sets-group');
    expect(quickSideGroup).toBeInTheDocument();
    expect(quickRepsGroup).toBeInTheDocument();

    const sideBtn = within(quickSideGroup).getByRole('button', { name: /^좌→우/ });
    fireEvent.click(sideBtn);
    expect(within(quickSideGroup).getByRole('button', { name: /^좌→우/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const rep12Btn = within(quickRepsGroup).getByRole('button', { name: /^12회/ });
    const set3Btn = within(quickRepsGroup).getByRole('button', { name: /^3세트/ });
    fireEvent.click(rep12Btn);
    fireEvent.click(set3Btn);
    expect(within(quickRepsGroup).getByRole('button', { name: /^12회/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(quickRepsGroup).getByRole('button', { name: /^3세트/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(usePilatesStore.getState().activeSteps[0].sideMode).toBe('left-then-right');
    expect(usePilatesStore.getState().activeSteps[0].repetitions).toBe(12);
    expect(usePilatesStore.getState().activeSteps[0].sets).toBe(3);
    cleanup();

    // Verify ArrowRight / ArrowLeft roving on InlineExerciseFinder quick filters
    render(<InlineExerciseFinder active onOpenExercise={vi.fn()} classEquipment={['reformer']} />);
    const quickWarm = screen.getByTestId('ief-quick-section-warmup');
    const quickMain = screen.getByTestId('ief-quick-section-main');
    quickWarm.focus();
    expect(document.activeElement).toBe(quickWarm);
    fireEvent.keyDown(quickWarm, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(quickMain);
    fireEvent.keyDown(quickMain, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(quickWarm);
  });

  it('guarantees seamless start↔end pose closure across all 98 catalog movements and renders 3-phase/eccentric-return diagrams', () => {
    expect(CATALOG_CONTINUOUS_MOTION_ASSETS.length).toBeGreaterThanOrEqual(98);

    for (const asset of CATALOG_CONTINUOUS_MOTION_ASSETS) {
      const p0 = asset.samplePose(0);
      const peakProgress = asset.keyframes.find(
        (frame) => frame.provenance === 'catalog-pose' && frame.visualPhaseId === 'middle',
      )!.progress;
      const pPeak = asset.samplePose(peakProgress);
      const pFinishHold = asset.samplePose(asset.authoredEndProgress);
      const p1 = asset.samplePose(1);

      expect(Math.abs(p0.carriageOffsetPx - p1.carriageOffsetPx)).toBeLessThan(1e-6);
      expect(Math.abs(p0.pedalAngleDeg - p1.pedalAngleDeg)).toBeLessThan(1e-6);

      const joints0 = p0.interpolatedPhaseSpec.joints;
      const joints1 = p1.interpolatedPhaseSpec.joints;
      const jointsPeak = pPeak.interpolatedPhaseSpec.joints;

      let peakMaxDisplacement = 0;
      for (const jointKey of Object.keys(joints0) as Array<keyof RigJointMap>) {
        const j0 = joints0[jointKey];
        const j1 = joints1[jointKey];
        const jPeak = jointsPeak[jointKey];
        expect(Boolean(j0)).toBe(Boolean(j1));
        if (j0 && j1) {
          expect(Math.abs(j0.x - j1.x)).toBeLessThan(1e-6);
          expect(Math.abs(j0.y - j1.y)).toBeLessThan(1e-6);
        }
        if (j0 && jPeak) {
          peakMaxDisplacement = Math.max(
            peakMaxDisplacement,
            Math.hypot(jPeak.x - j0.x, jPeak.y - j0.y),
          );
        }
      }
      expect(
        peakMaxDisplacement + Math.abs(pPeak.carriageOffsetPx - p0.carriageOffsetPx),
      ).toBeGreaterThan(0.5);
      expect(pFinishHold.interpolatedPhaseSpec.joints.pelvis).toEqual(
        asset.visualAsset.phases.end.joints.pelvis,
      );
    }

    const state = usePilatesStore.getState();
    const reformerEx =
      state.exercises.find((e) => e.apparatus === 'reformer' && e.id.startsWith('original-')) ??
      state.exercises[0];
    const motionAsset = getCatalogContinuousMotionAsset(reformerEx.id)!;
    expect(motionAsset).toBeTruthy();

    // The authored return phase is sought by its actual per-exercise label.
    render(<Studio3DMotionHeroCard exercise={reformerEx} />);
    const returnKeyframeBtn = screen.getByRole('button', { name: motionAsset.phases[3].labelKo });
    expect(returnKeyframeBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(returnKeyframeBtn);
    expect(returnKeyframeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: /도해 위치/ })).toHaveValue(
      String(Math.round(motionAsset.phases[3].sample * 1000)),
    );
    cleanup();

    // CatalogMotionInteractivePlayer: explicit cycle continuity readout & 3-stage connected cards
    render(<CatalogMotionInteractivePlayer asset={motionAsset} />);
    expect(screen.getByTestId('catalog-motion-cycle-continuity')).toHaveTextContent(
      '수업 시간과 별도로 재생됩니다',
    );
    const endStageBtn = screen.getByRole('button', {
      name: new RegExp(`${motionAsset.endPoseLabelKo} 보기`),
    });
    fireEvent.click(endStageBtn);
    expect(endStageBtn).toHaveAttribute('aria-pressed', 'true');
    cleanup();

    // LiveStageKinematicDiagram under prefers-reduced-motion: 3 connected phase figures (시작, 정점, 끝 복귀)
    const origMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    try {
      render(<LiveStageKinematicDiagram exercise={reformerEx} running={false} />);
      const grid = screen.getByTestId('live-stage-diagram-dual-grid');
      expect(within(grid).getByText('● 1. 시작 자세')).toBeInTheDocument();
      expect(within(grid).getByText('◆ 2. 정점(끝 가동) 자세')).toBeInTheDocument();
      expect(within(grid).getByText('↺ 3. 끝 복귀 자세 (시작 연결)')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: origMatchMedia,
      });
    }
  });
});
