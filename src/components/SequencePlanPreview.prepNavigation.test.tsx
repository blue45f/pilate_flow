import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { SequencePlanPreview } from './SequencePlanPreview';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ exerciseId, active }: { exerciseId?: string; active?: boolean }) => (
    <div data-testid="prep-nav-motion" data-exercise-id={exerciseId} data-active={String(active)} />
  ),
}));

const originalState = usePilatesStore.getState();
const initialCatalogSnapshot = structuredClone(INITIAL_EXERCISES);

function createPrepNavSyntheticExercise(
  blockCategory: 'warmup' | 'footwork' | 'core' | 'cooldown',
  variant: 'alpha' | 'beta',
  explicitId: string,
  nameKo: string,
): PilatesExercise {
  const base = syntheticPlanningExercise('reformer', blockCategory, variant, false);
  const record: PilatesExercise = {
    ...base,
    id: explicitId,
    nameKo,
    movementFamily: explicitId,
  };
  return {
    ...record,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Synthetic QA reviewer · test only',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(record),
    },
  };
}

const warmupEx = createPrepNavSyntheticExercise(
  'warmup',
  'alpha',
  'qa-prep-nav-warmup',
  '합성 미리보기 준비운동 호흡',
);
const footworkEx = createPrepNavSyntheticExercise(
  'footwork',
  'alpha',
  'qa-prep-nav-footwork',
  '합성 미리보기 본운동 풋워크',
);
const coreEx = createPrepNavSyntheticExercise(
  'core',
  'beta',
  'qa-prep-nav-core',
  '합성 미리보기 본운동 코어',
);
const cooldownEx = createPrepNavSyntheticExercise(
  'cooldown',
  'beta',
  'qa-prep-nav-cooldown',
  '합성 미리보기 마무리 이완',
);

const frames: FrameRequestCallback[] = [];
function flushNavigationFrames() {
  act(() => {
    frames.splice(0).forEach((callback) => callback(0));
  });
}

describe('SequencePlanPreview readiness jump, section shortcuts, and cursor-safe return navigation', () => {
  let storeListener: ReturnType<typeof vi.fn>;
  let unsubscribeStore: () => void;
  let storageSpy: MockInstance<typeof Storage.prototype.setItem>;

  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    usePilatesStore.setState(
      {
        ...originalState,
        activeTitle: '합성 수업 시작 전 미리보기 검증',
        activeTargetMinutes: 25,
        exercises: [warmupEx, footworkEx, coreEx, cooldownEx],
        activeSteps: [],
        savedSequences: [],
        historyLogs: [],
        generationError: null,
        saveFeedback: null,
        persistenceError: null,
      },
      true,
    );
    storeListener = vi.fn();
    unsubscribeStore = usePilatesStore.subscribe(storeListener);
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    cleanup();
    unsubscribeStore();
    usePilatesStore.setState(originalState, true);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    expect(INITIAL_EXERCISES).toEqual(initialCatalogSnapshot);
  });

  it('auto-expands readiness when blocked, jumps directly to the failing item from readiness or footer, and closes cleanly to edit without mutating store', () => {
    const brokenSteps: SequenceStep[] = [
      {
        stepId: 'prep-valid-1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: warmupEx.id,
        durationMin: 6,
        selectedLayer: 'standard',
      },
      {
        stepId: 'prep-valid-2',
        order: 2,
        blockCategory: 'footwork',
        exerciseId: footworkEx.id,
        durationMin: 8,
        selectedLayer: 'standard',
      },
      {
        stepId: 'prep-missing-3',
        order: 3,
        blockCategory: 'core',
        exerciseId: 'qa-missing-exercise-ref',
        durationMin: 6,
        selectedLayer: 'standard',
      },
      {
        stepId: 'prep-valid-4',
        order: 4,
        blockCategory: 'cooldown',
        exerciseId: cooldownEx.id,
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];
    usePilatesStore.setState({ activeSteps: brokenSteps });
    storeListener.mockClear();
    storageSpy.mockClear();
    const before = usePilatesStore.getState();

    const onClose = vi.fn();
    const onSave = vi.fn();
    const onStart = vi.fn();

    const { container } = render(
      <SequencePlanPreview
        onClose={onClose}
        onSave={onSave}
        onStart={onStart}
        canStartClass={false}
        startReadiness="동작 정보와 항목 시간을 확인해 주세요. (3번 항목)"
      />,
    );

    // Readiness disclosure automatically opens on blocking gate failure
    const readinessDetails = container.querySelector<HTMLDetailsElement>('.simulation-readiness')!;
    expect(readinessDetails.open).toBe(true);
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeDisabled();

    // Order row 3 carries visual blocking badge while keeping exact aria-label contract
    const orderRegion = within(screen.getByRole('region', { name: '전체 수업 순서' }));
    const orderButtons = orderRegion.getAllByRole('button');
    expect(orderButtons).toHaveLength(4);
    expect(orderButtons[2]).toHaveAttribute('aria-label', '3번 동작 정보 없음 계획 보기');
    expect(orderButtons[2]).toHaveTextContent('점검 필요');

    // Footer shortcut jumps straight to item 3 and focuses selected item heading
    const footer = within(screen.getByRole('contentinfo', { name: '수업안 확인 후 다음 단계' }));
    fireEvent.click(footer.getByRole('button', { name: '3번 점검 항목 확인' }));
    flushNavigationFrames();

    const selectedRegion = within(screen.getByRole('region', { name: '선택한 계획 항목' }));
    expect(selectedRegion.getByRole('heading', { name: '동작 정보 없음' })).toHaveFocus();
    expect(orderButtons[2]).toHaveAttribute('aria-current', 'step');

    // Navigate back to item 1, then jump to item 3 via readiness reason chip
    fireEvent.click(orderButtons[0]!);
    flushNavigationFrames();
    expect(selectedRegion.getByRole('heading', { name: warmupEx.nameKo })).toHaveFocus();

    const readinessJumpGroup = within(readinessDetails).getByRole('group', {
      name: '점검 항목 바로 이동',
    });
    fireEvent.click(within(readinessJumpGroup).getByRole('button', { name: '3번 항목 보기' }));
    flushNavigationFrames();
    expect(selectedRegion.getByRole('heading', { name: '동작 정보 없음' })).toHaveFocus();

    // Closing to edit invokes only onClose; no save, class start, or store/storage write occurs
    fireEvent.click(footer.getByRole('button', { name: '편집으로 돌아가기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(onStart).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(before);
    expect(storeListener).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('jumps between class sections and returns from long order lists to the current item without resetting paused mid-step cursor or active segment loop', () => {
    const clamOriginal = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-clam')!;
    const multiSectionSteps: SequenceStep[] = [
      {
        stepId: 'nav-step-1-warmup',
        order: 1,
        classSection: 'preparation',
        blockCategory: 'warmup',
        exerciseId: warmupEx.id,
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 'nav-step-2-main-clam',
        order: 2,
        classSection: 'main',
        blockCategory: clamOriginal.blockCategory,
        exerciseId: clamOriginal.id,
        durationMin: 2,
        explanationSec: 10,
        transitionSec: 10,
        sideMode: 'left-then-right',
        selectedLayer: 'standard',
        motionStudy: createSequenceMotionStudyBinding(
          clamOriginal.id,
          'existing-proposal',
          'side-lying-clam',
        ),
      },
      {
        stepId: 'nav-step-3-main-core',
        order: 3,
        classSection: 'main',
        blockCategory: 'core',
        exerciseId: coreEx.id,
        durationMin: 6,
        selectedLayer: 'standard',
      },
      {
        stepId: 'nav-step-4-rest',
        order: 4,
        kind: 'rest',
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 1,
        selectedLayer: 'standard',
      },
      {
        stepId: 'nav-step-5-cooldown',
        order: 5,
        classSection: 'cooldown',
        blockCategory: 'cooldown',
        exerciseId: cooldownEx.id,
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];

    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, warmupEx, footworkEx, coreEx, cooldownEx],
      activeSteps: multiSectionSteps,
      activeTargetMinutes: 18,
    });
    storeListener.mockClear();
    storageSpy.mockClear();
    const before = usePilatesStore.getState();
    const onSave = vi.fn();
    const onStart = vi.fn();

    const { container } = render(
      <SequencePlanPreview
        onClose={vi.fn()}
        onSave={onSave}
        onStart={onStart}
        canStartClass
        startReadiness="동작·스프링·대상자 상태를 확인한 뒤 시작하세요."
      />,
    );

    // Valid plan keeps readiness disclosure collapsed by default for low visual density
    const readinessDetails = container.querySelector<HTMLDetailsElement>('.simulation-readiness')!;
    expect(readinessDetails.open).toBe(false);

    // Section shortcuts jump directly to 본운동 (item 2) and 마무리 (item 5)
    const sectionGroup = screen.getByRole('group', { name: '수업 구간 바로 이동' });
    const mainShortcut = within(sectionGroup).getByRole('button', {
      name: '본운동 첫 항목(2번)으로 이동',
    });
    const cooldownShortcut = within(sectionGroup).getByRole('button', {
      name: '마무리 첫 항목(5번)으로 이동',
    });

    fireEvent.click(cooldownShortcut);
    flushNavigationFrames();
    expect(cooldownShortcut).toHaveAttribute('aria-current', 'true');
    expect(
      within(screen.getByRole('region', { name: '선택한 계획 항목' })).getByRole('heading', {
        name: cooldownEx.nameKo,
      }),
    ).toHaveFocus();

    fireEvent.click(mainShortcut);
    flushNavigationFrames();
    expect(mainShortcut).toHaveAttribute('aria-current', 'true');

    // Scrub slider to a mid-step right-side offset inside item 2 (startSec = 240s, right side = 305s)
    const parentSlider = screen.getByRole('slider', { name: '수업 시간표 위치' });
    fireEvent.change(parentSlider, { target: { value: '305' } });
    expect(parentSlider).toHaveValue('305');
    expect(screen.getByLabelText('현재 시간표 구간')).toHaveTextContent('수행 · 오른쪽');

    // Jump down to 전체 순서 to inspect later items, then return via 현재 항목(2번)으로 돌아가기
    fireEvent.click(screen.getByRole('button', { name: '전체 순서에서 고르기' }));
    flushNavigationFrames();
    expect(screen.getByRole('heading', { name: '전체 순서' })).toHaveFocus();

    const returnBtn = screen.getByRole('button', { name: '현재 항목(2번)으로 돌아가기' });
    fireEvent.click(returnBtn);
    flushNavigationFrames();

    // Focus returns to item 2 heading WITHOUT resetting the 305s mid-step right-side cursor!
    const currentHeading = within(
      screen.getByRole('region', { name: '선택한 계획 항목' }),
    ).getByText(clamOriginal.nameKo, { selector: 'h3.simulation-navigation-heading' });
    expect(currentHeading).toHaveRole('heading');
    expect(currentHeading).toHaveAccessibleName(clamOriginal.nameKo);
    expect(currentHeading).toHaveFocus();
    expect(parentSlider).toHaveValue('305');
    expect(screen.getByLabelText('현재 시간표 구간')).toHaveTextContent('수행 · 오른쪽');

    // Also preserves an open SequenceSegmentRehearsal loop when returning from 전체 순서
    fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
    const segmentLoop = screen.getByRole('region', { name: '선택 구간 반복 연습' });
    fireEvent.change(within(segmentLoop).getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: '전체 순서에서 고르기' }));
    flushNavigationFrames();
    expect(screen.getByRole('heading', { name: '전체 순서' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: '현재 항목(2번)으로 돌아가기' }));
    flushNavigationFrames();
    expect(screen.getByRole('region', { name: '선택 구간 반복 연습' })).toBe(segmentLoop);
    expect(within(segmentLoop).getByRole('combobox', { name: '구간 연습 반복 횟수' })).toHaveValue(
      '2',
    );

    // None of the navigation or rehearsal actions triggered save, start, or store writes
    expect(onSave).not.toHaveBeenCalled();
    expect(onStart).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(before);
    expect(storeListener).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    // Explicit footer actions work only when explicitly clicked
    fireEvent.click(screen.getByRole('button', { name: '사본 저장' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('enforces >=44px touch targets, :focus-visible outline, narrow-screen responsiveness, and prefers-reduced-motion in sequence-simulation.css', () => {
    const cssPath = resolve(process.cwd(), 'src/styles/sequence-simulation.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('.simulation-jump-chip');
    expect(css).toContain('.simulation-return-current-btn');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 599px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important;');
  });
});
