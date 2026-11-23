import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLog, SequenceStep } from '../types/pilates';
import { analyzeSmartClassPrep } from '../utils/smartClassPrepEngine';
import { SmartClassPrepCoachPanel } from './SmartClassPrepCoachPanel';
import { StudioSmartToolsRail } from './StudioSmartToolsRail';

const originalStore = usePilatesStore.getState();

const reformerSupineFlexion = WORLD_PILATES_EXERCISES.find(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.bodyPosition === 'supine' &&
    ex.springs === '1R 1B' &&
    ex.spinalPlanes.includes('flexion') &&
    !ex.spinalPlanes.includes('lateral') &&
    !ex.spinalPlanes.includes('rotation'),
)!;

const reformerSupineSameSpringPool = WORLD_PILATES_EXERCISES.filter(
  (ex) =>
    ex.id !== reformerSupineFlexion.id &&
    ex.apparatus === 'reformer' &&
    ex.bodyPosition === 'supine' &&
    ex.springs === '1R 1B',
);

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  usePilatesStore.setState(
    {
      ...originalStore,
      exercises: INITIAL_EXERCISES,
      activeSteps: [
        {
          stepId: 'coach-step-1',
          order: 1,
          blockCategory: reformerSupineFlexion.blockCategory,
          exerciseId: reformerSupineFlexion.id,
          durationMin: 4,
          selectedLayer: 'standard',
        },
      ],
      activeApparatus: 'reformer',
      activeLevel: '2.0',
      draftCriteria: null,
      lastCriteria: null,
      ownedApparatus: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedProps: [
        'none',
        'mini-ball',
        'magic-circle',
        'foam-roller',
        'loop-band',
        'theraband',
        'toning-ball',
        'bosu',
      ],
      historyLogs: [],
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalStore, true);
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('smartClassPrepEngine & SmartClassPrepCoachPanel', () => {
  it('computes honest 4-plane spinal balance and selects top-4 zero-spring, same-position, non-recent movements', () => {
    const recentExcludedIds = reformerSupineSameSpringPool.slice(0, 3).map((ex) => ex.id);
    const historyLogs: ClassHistoryLog[] = [
      {
        id: 'log-1',
        sequenceId: 'seq-1',
        sequenceTitle: '지난 화요일 리포머',
        groupId: 'grp-a',
        groupName: '오전 중급반',
        taughtAt: '2026-11-20T09:00:00Z',
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: [recentExcludedIds[0]!],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '좋음',
      },
      {
        id: 'log-2',
        sequenceId: 'seq-2',
        sequenceTitle: '지난 목요일 리포머',
        groupId: 'grp-a',
        groupName: '오전 중급반',
        taughtAt: '2026-11-21T09:00:00Z',
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: [recentExcludedIds[1]!],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '좋음',
      },
      {
        id: 'log-3',
        sequenceId: 'seq-3',
        sequenceTitle: '어제 리포머',
        groupId: 'grp-a',
        groupName: '오전 중급반',
        taughtAt: '2026-11-22T09:00:00Z',
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: [recentExcludedIds[2]!],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '좋음',
      },
    ];

    const steps: SequenceStep[] = [
      {
        stepId: 's-1',
        order: 1,
        blockCategory: reformerSupineFlexion.blockCategory,
        exerciseId: reformerSupineFlexion.id,
        durationMin: 4,
        selectedLayer: 'standard',
      },
    ];

    const result = analyzeSmartClassPrep({
      activeSteps: steps,
      historyLogs,
      activeApparatus: 'reformer',
      activeLevel: '2.0',
      targetGroupId: 'grp-a',
      ownedEquipment: ['reformer'],
      ownedProps: ['none', 'mini-ball', 'magic-circle', 'foam-roller', 'loop-band', 'theraband'],
    });

    expect(result.analyzedStepCount).toBe(1);
    expect(result.recentClassesAnalyzed).toBe(3);
    expect(result.catalogSize).toBe(1752);

    // Real 4-plane calculation: flexion covered, lateral & rotation missing
    const flexion = result.spinalBalance.find((p) => p.plane === 'flexion')!;
    const lateral = result.spinalBalance.find((p) => p.plane === 'lateral')!;
    const rotation = result.spinalBalance.find((p) => p.plane === 'rotation')!;
    expect(flexion.covered).toBe(true);
    expect(flexion.count).toBe(1);
    expect(lateral.covered).toBe(false);
    expect(rotation.covered).toBe(false);
    expect(result.missingPlanes).toContain('lateral');
    expect(result.missingPlanes).toContain('rotation');

    // Top 4 distinct recommendations, none from recent 3 classes, prioritizing zero spring + same position
    expect(result.recommendations).toHaveLength(4);
    for (const rec of result.recommendations) {
      expect(recentExcludedIds).not.toContain(rec.exercise.id);
      expect(rec.unusedInRecent3).toBe(true);
      expect(rec.sameApparatus).toBe(true);
    }
    expect(result.recommendations[0]!.zeroSpringChange).toBe(true);
    expect(result.recommendations[0]!.sameBodyPosition).toBe(true);
    expect(result.recommendations[0]!.badgesKo).toContain('스프링 변경 0회');
    expect(result.recommendations[0]!.badgesKo).toContain('같은 자세 연결');
    expect(result.recommendations[0]!.badgesKo).toContain('최근 3회 미사용');
  });

  it('renders 4-plane diagnosis, AI voice preview, and appends recommended movement via 1-tap add', () => {
    render(<SmartClassPrepCoachPanel />);

    expect(screen.getByTestId('smart-class-prep-coach-panel')).toBeVisible();
    expect(screen.getByTestId('smart-coach-plane-flexion')).toHaveTextContent('굴곡');
    expect(screen.getByTestId('smart-coach-plane-extension')).toHaveTextContent('신전');
    expect(screen.getByTestId('smart-coach-plane-lateral')).toHaveTextContent('측굴');
    expect(screen.getByTestId('smart-coach-plane-rotation')).toHaveTextContent('회전');

    const recGrid = screen.getByTestId('smart-coach-recommendations');
    const cards = within(recGrid).getAllByRole('article');
    expect(cards).toHaveLength(4);

    // Each card has AI voice preview button and 1-tap add button
    const firstCard = cards[0]!;
    expect(within(firstCard).getByText('AI 음성 미리듣기')).toBeInTheDocument();
    const addBtn = within(firstCard).getByRole('button', { name: /수업에 바로 담기/ });
    const beforeSteps = usePilatesStore.getState().activeSteps.length;

    fireEvent.click(addBtn);

    const afterState = usePilatesStore.getState();
    expect(afterState.activeSteps).toHaveLength(beforeSteps + 1);
    expect(screen.getByTestId('smart-coach-feedback')).toHaveTextContent('현재 수업에 담았습니다.');
  });

  it('exposes 스마트 추천 코치 as the first accent pill in StudioSmartToolsRail and opens the coach modal', () => {
    render(<StudioSmartToolsRail />);

    const rail = screen.getByTestId('studio-smart-tools-rail');
    const pills = within(rail).getAllByRole('button');
    expect(pills[0]).toHaveAttribute('data-testid', 'rail-btn-smart-coach');
    expect(pills[0]).toHaveClass('is-accent');
    expect(pills[0]).toHaveTextContent('스마트 추천 코치');

    fireEvent.click(pills[0]!);
    expect(screen.getByTestId('smart-class-prep-coach-panel')).toBeVisible();
  });
});
