import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog, PilatesExercise, SequenceStep } from '../types/pilates';
import { ClassInsightsDialog, type ClassInsightsDialogProps } from './ClassInsightsDialog';

const exercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'insight-exercise',
  nameKo: '구성 검토 동작',
  targetMuscles: ['코어', '둔근'],
  isUnilateral: true,
};
const steps: SequenceStep[] = [
  {
    stepId: 'insight-step',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'core',
    selectedLayer: 'standard',
    durationMin: 2,
    explanationSec: 20,
    transitionSec: 10,
  },
  {
    stepId: 'insight-rest',
    order: 2,
    exerciseId: '',
    kind: 'rest',
    blockCategory: 'core',
    selectedLayer: 'standard',
    durationMin: 0.5,
  },
];
const history: ClassHistoryLog = {
  ...INITIAL_HISTORY_LOGS[0],
  id: 'my-history',
  sequenceTitle: '내가 기록한 수업',
  groupName: '내 그룹',
  intensity: 'relaxed',
  rating: 5,
  actualDurationSec: 0,
  actualRestDurationSec: 0,
  stepsSnapshot: steps,
};

function props(overrides: Partial<ClassInsightsDialogProps> = {}): ClassInsightsDialogProps {
  return {
    onClose: vi.fn(),
    title: '현재 검토 계획',
    steps,
    exercises: [exercise],
    historyLogs: [history, ...INITIAL_HISTORY_LOGS],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('read-only class insights dialog', () => {
  it('opens one native dialog with accessible tabs and visible composition caveats', () => {
    const { container } = render(<ClassInsightsDialog {...props()} />);
    expect(container.querySelectorAll('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: '수업 구성 살펴보기' })).toHaveAttribute('open');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: '구성' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: '구성' });
    expect(within(panel).getAllByText('2분 30초', { exact: true })[0]).toBeVisible();
    expect(within(panel).getByText(/실제 근육 부하가 아닙니다/)).toBeVisible();
    expect(within(panel).getByText(/비율 합계는 100%를 넘을 수 있습니다/)).toBeVisible();
    expect(within(panel).getByText(/태그 미지정: 0개/)).toBeVisible();
    expect(within(panel).getByText(/동작 정보 없음: 0개/)).toBeVisible();
  });

  it('supports keyboard tab navigation and makes all panels accessible by name', () => {
    render(<ClassInsightsDialog {...props()} />);
    const composition = screen.getByRole('tab', { name: '구성' });
    composition.focus();
    fireEvent.keyDown(composition, { key: 'ArrowRight' });
    const sides = screen.getByRole('tab', { name: '좌우' });
    expect(sides).toHaveFocus();
    expect(sides).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: '좌우' })).toBeVisible();
    fireEvent.keyDown(sides, { key: 'End' });
    const records = screen.getByRole('tab', { name: '기록' });
    expect(records).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: '기록' })).toBeVisible();
    fireEvent.keyDown(records, { key: 'ArrowRight' });
    expect(composition).toHaveFocus();
    fireEvent.keyDown(composition, { key: 'ArrowLeft' });
    expect(records).toHaveFocus();
    fireEvent.keyDown(records, { key: 'Home' });
    expect(composition).toHaveFocus();
  });

  it('limits tag bars to six then twelve while preserving the complete HTML table', () => {
    const tags = Array.from(
      { length: 15 },
      (_, index) => `부위 태그 ${String(index + 1).padStart(2, '0')}`,
    );
    render(
      <ClassInsightsDialog {...props({ exercises: [{ ...exercise, targetMuscles: tags }] })} />,
    );
    const panel = screen.getByRole('tabpanel', { name: '구성' });
    expect(panel.querySelectorAll('.class-insights-bar-row')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: '태그 더 보기' }));
    expect(panel.querySelectorAll('.class-insights-bar-row')).toHaveLength(16);
    expect(screen.getByRole('button', { name: '상위 6개만 보기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(panel).getByText(/나머지 3개는 아래 전체 표/)).toBeVisible();
    fireEvent.click(within(panel).getByText('모든 태그 표 보기 (15개)'));
    const table = within(panel).getByRole('table', { name: /부위 태그별 계획 범위/ });
    expect(within(table).getAllByRole('row')).toHaveLength(16);
    expect(within(table).getByRole('rowheader', { name: '부위 태그 15' })).toBeVisible();
  });

  it('keeps default anatomical sides unknown and exposes a per-step table without hover', () => {
    render(<ClassInsightsDialog {...props()} />);
    fireEvent.click(screen.getByRole('tab', { name: '좌우' }));
    const panel = screen.getByRole('tabpanel', { name: '좌우' });
    expect(within(panel).getByText(/실제 신체 부하를 뜻하지 않습니다/)).toBeVisible();
    expect(within(panel).getByText(/첫 번째 쪽·반대쪽/)).toBeVisible();
    const table = within(panel).getByRole('table', { name: /동작별 명시한 좌우 계획/ });
    const row = within(table).getAllByRole('row')[1];
    expect(within(row).getByText('첫 번째 쪽 → 반대쪽 · 해부학적 좌우 미지정')).toBeVisible();
    expect(within(row).getByText('1분 30초')).toBeVisible();
  });

  it('distinguishes recorded zero from missing values and separates intensity from satisfaction', () => {
    const missing: ClassHistoryLog = {
      ...history,
      id: 'missing',
      sequenceTitle: '이전 수업',
      stepsSnapshot: undefined,
      actualDurationSec: undefined,
      actualRestDurationSec: undefined,
      intensity: 'intense',
      rating: 1,
    };
    render(<ClassInsightsDialog {...props({ historyLogs: [history, missing] })} />);
    fireEvent.click(screen.getByRole('tab', { name: '기록' }));
    const panel = screen.getByRole('tabpanel', { name: '기록' });
    expect(within(panel).getByText(/미기록은 0과 구분합니다/)).toBeVisible();
    expect(within(panel).getByText(/RPE로 바꾸거나 평균 강도를 계산하지 않습니다/)).toBeVisible();
    const table = within(panel).getByRole('table', { name: /수업별 계획 사본/ });
    const zeroRow = within(table).getByRole('row', { name: /내가 기록한 수업/ });
    expect(within(zeroRow).getAllByText('실제 0분 0초')).toHaveLength(2);
    expect(within(zeroRow).getByText('가볍게')).toBeVisible();
    expect(within(zeroRow).getByText('5 / 5')).toBeVisible();
    const missingRow = within(table).getByRole('row', { name: /이전 수업/ });
    expect(within(missingRow).getAllByText('계획 사본 없음')).toHaveLength(2);
    expect(within(missingRow).getAllByText('실제 미기록')).toHaveLength(2);
    expect(within(missingRow).getByText('높게')).toBeVisible();
    expect(within(missingRow).getByText('1 / 5')).toBeVisible();
  });

  it('excludes samples by default and explicitly labels them when the user includes them', () => {
    render(<ClassInsightsDialog {...props({ historyLogs: INITIAL_HISTORY_LOGS })} />);
    fireEvent.click(screen.getByRole('tab', { name: '기록' }));
    const panel = screen.getByRole('tabpanel', { name: '기록' });
    expect(within(panel).getByText('기본 예시 3건 제외 · 내 기록 0건')).toBeVisible();
    expect(within(panel).getByText(/표시할 내 수업 기록이 없습니다/)).toBeVisible();
    expect(within(panel).queryByText('예시', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('checkbox', { name: '예시 기록 포함' }));
    expect(within(panel).getAllByText('예시', { exact: true })).toHaveLength(3);
    expect(within(panel).getByText(/예시 기록을 함께 표시합니다/)).toBeVisible();
  });

  it('carries rounded fractional recorded seconds into the next minute', () => {
    render(
      <ClassInsightsDialog
        {...props({ historyLogs: [{ ...history, actualDurationSec: 59.999 }] })}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: '기록' }));
    expect(screen.getByText('실제 1분 0초')).toBeVisible();
    expect(screen.queryByText('실제 0분 60초')).not.toBeInTheDocument();
  });

  it('retains the opened snapshot when the live plan props change', () => {
    const initial = props();
    const { rerender } = render(<ClassInsightsDialog {...initial} />);
    rerender(
      <ClassInsightsDialog
        {...initial}
        title="나중에 바꾼 제목"
        steps={[]}
        exercises={[]}
        historyLogs={[]}
      />,
    );
    expect(screen.getByText(/현재 검토 계획 · 열 때의 계획/)).toBeVisible();
    expect(screen.queryByText(/나중에 바꾼 제목/)).not.toBeInTheDocument();
    expect(screen.getAllByText('2분 30초', { exact: true })[0]).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: '기록' }));
    expect(screen.getByRole('row', { name: /내가 기록한 수업/ })).toBeVisible();
  });

  it('provides empty-plan states and dismisses through the native close event', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ClassInsightsDialog {...props({ onClose, steps: [], exercises: [], historyLogs: [] })} />,
    );
    expect(screen.getByText('표시할 부위 태그가 없습니다.')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: '좌우' }));
    expect(screen.getByText('분석할 동작이 없습니다.')).toBeVisible();
    fireEvent(container.querySelector('dialog')!, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps tab, disclosure, and sample controls local without persistence or URL writes', () => {
    const save = vi.spyOn(Storage.prototype, 'setItem');
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(<ClassInsightsDialog {...props()} />);
    fireEvent.click(screen.getByRole('tab', { name: '좌우' }));
    fireEvent.click(screen.getByRole('tab', { name: '기록' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '예시 기록 포함' }));
    expect(save).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
