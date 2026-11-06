import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, PilatesExercise } from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { InlineExerciseFinder } from './InlineExerciseFinder';

const original = usePilatesStore.getState();
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  targetMinutes: 50,
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      exercises: INITIAL_EXERCISES,
      activeSteps: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      ownedEquipment: ['mat'],
      ownedProps: [],
      draftCriteria: criteria,
      lastCriteria: null,
      generationError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('inline exercise finder', () => {
  it('shows six genuine pending notes, opens detail, paginates, and opens the full library without editing the draft', () => {
    const onOpenExercise = vi.fn();
    const before = usePilatesStore.getState();
    render(<InlineExerciseFinder onOpenExercise={onOpenExercise} />);
    const finder = within(screen.getByRole('complementary', { name: '작업대 동작 찾기' }));
    expect(finder.getAllByRole('article')).toHaveLength(6);
    expect(finder.getByRole('status')).toHaveTextContent('98개 결과');
    expect(finder.getAllByRole('button', { name: /수업안에 추가/ })).toHaveLength(6);
    finder.getAllByRole('button', { name: /수업안에 추가/ }).forEach((button) => {
      expect(button).toBeEnabled();
    });
    fireEvent.click(
      finder.getByRole('button', { name: `${INITIAL_EXERCISES[0].nameKo} 상세 보기` }),
    );
    expect(onOpenExercise).toHaveBeenCalledWith(INITIAL_EXERCISES[0]);
    fireEvent.click(finder.getByRole('button', { name: /동작 더 보기/ }));
    expect(finder.getAllByRole('article')).toHaveLength(12);
    fireEvent.click(finder.getByRole('button', { name: '동작 라이브러리 전체 보기' }));
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('atlas');
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.ownedEquipment).toBe(before.ownedEquipment);
    expect(after.ownedProps).toBe(before.ownedProps);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('combines local OR equipment with exact recorded body tags, search and time, preserving class conditions', () => {
    const mat = {
      ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
      nameKo: '합성 매트',
      targetMuscles: ['복부'],
      defaultDurationMin: 2,
    };
    const reformer = {
      ...syntheticPlanningExercise('reformer', 'core', 'alpha', false),
      nameKo: '합성 리포머',
      targetMuscles: ['둔근'],
      defaultDurationMin: 4,
    };
    const tower = {
      ...syntheticPlanningExercise('cadillac', 'core', 'alpha', false),
      nameKo: '합성 타워',
      requiredEquipment: ['tower'],
      targetMuscles: ['둔근'],
      defaultDurationMin: 4,
    };
    const cadillac = {
      ...syntheticPlanningExercise('cadillac', 'core', 'beta', false),
      nameKo: '합성 캐딜락',
      targetMuscles: ['둔근과 별개의 입력 태그'],
      defaultDurationMin: 6,
    };
    usePilatesStore.setState({ exercises: [mat, reformer, tower, cadillac] });
    const before = usePilatesStore.getState();
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '리포머' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '타워' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(
      screen.queryByRole('article', { name: '합성 캐딜락 동작 노트' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '시간' }));
    fireEvent.click(screen.getByRole('button', { name: '3분 초과–5분' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: '부위' }));
    fireEvent.change(screen.getByLabelText('등록된 부위 태그'), { target: { value: '둔근' } });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '리포머 둔근' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '존재하지 않는 합성 검색' },
    });
    expect(screen.getByText('조건에 맞는 동작이 없어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '검색·필터 초기화' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    const after = usePilatesStore.getState();
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.ownedEquipment).toBe(before.ownedEquipment);
    expect(after.ownedProps).toBe(before.ownedProps);
  });

  it('uses the store add action and reports actual duplicate and equipment rejection without false success', () => {
    const first = syntheticPlanningExercise('mat', 'warmup');
    const duplicate: PilatesExercise = {
      ...first,
      id: 'qa-synthetic-finder-duplicate',
      nameKo: '합성 중복 별칭',
      review: undefined,
    };
    duplicate.review = { ...first.review!, revision: exerciseRevision(duplicate) };
    const unavailable = syntheticPlanningExercise('chair', 'core');
    usePilatesStore.setState({ exercises: [first, duplicate, unavailable] });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: `${first.nameKo} 수업안에 추가` }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(screen.getByText(`${first.nameKo} 동작을 수업안에 추가했어요.`)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${first.nameKo} 이미 수업안에 있음` }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `${duplicate.nameKo} 수업안에 추가` }));
    expect(screen.getByRole('alert')).toHaveTextContent('같은 동작의 중복');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(screen.queryByText(/동작을 수업안에 추가했어요/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${unavailable.nameKo} 수업안에 추가` }));
    expect(screen.getByRole('alert')).toHaveTextContent('기구·소도구와 최대 난이도');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().draftCriteria).toBe(criteria);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('opens authored pattern references before note approval without granting review or adding a step', () => {
    const mapped = INITIAL_EXERCISES.find(
      (exercise) => getMotionPatternReferences(exercise.id).length > 1,
    )!;
    const references = getMotionPatternReferences(mapped.id);
    usePilatesStore.setState({ exercises: [mapped] });
    const before = usePilatesStore.getState();
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    const card = screen.getByRole('article', { name: `${mapped.nameKo} 동작 노트` });
    expect(card.querySelector('svg')).toBeTruthy();
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByText('패턴 참고 · 미검수')).toBeInTheDocument();
    references.forEach((reference) => {
      expect(
        within(card).getByRole('button', { name: `${reference.title} 초안 보기` }),
      ).toBeEnabled();
    });
    fireEvent.click(within(card).getByRole('button', { name: `${references[1].title} 초안 보기` }));
    const preview = screen.getByRole('region', { name: '선택한 모션 초안' });
    expect(preview).toHaveFocus();
    expect(within(preview).getByRole('heading', { name: references[1].title })).toBeInTheDocument();
    expect(within(preview).getByText('관련 패턴 참고 · 전문가 미검수')).toBeInTheDocument();
    const exerciseSummary = within(preview).getByRole('region', {
      name: '연결 동작 설명·주의점 및 시퀀스 삽입',
    });
    expect(within(exerciseSummary).getByText(mapped.nameKo)).toBeInTheDocument();
    expect(within(exerciseSummary).getByText('검토 전 원자료 메모')).toBeInTheDocument();
    expect(
      within(exerciseSummary).getByRole('button', {
        name: `${mapped.nameKo} 초안 확인 후 시퀀스 삽입`,
      }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: `${mapped.nameKo} 수업안에 추가` })).toBeEnabled();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    fireEvent.click(within(preview).getByRole('button', { name: '모션 초안 닫기' }));
    expect(screen.queryByRole('region', { name: '선택한 모션 초안' })).not.toBeInTheDocument();
  });

  it('leaves unmapped notes empty and filters to actual draft relationships', () => {
    const mapped = INITIAL_EXERCISES.find(
      (exercise) => getMotionPatternReferences(exercise.id).length,
    )!;
    const unmapped = INITIAL_EXERCISES.find(
      (exercise) => !getMotionPatternReferences(exercise.id).length,
    )!;
    usePilatesStore.setState({ exercises: [unmapped, mapped] });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    const emptyCard = screen.getByRole('article', { name: `${unmapped.nameKo} 동작 노트` });
    expect(within(emptyCard).getByText('모션 도해 준비 중')).toBeInTheDocument();
    expect(
      within(emptyCard)
        .getByRole('button', { name: `${unmapped.nameKo} 상세 보기` })
        .querySelector('svg, img'),
    ).toBeNull();
    expect(within(emptyCard).queryByRole('button', { name: /초안 보기/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '초안 있는 동작' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: `${mapped.nameKo} 동작 노트` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '초안 있는 동작' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '동작 찾기 검색·필터 초기화' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('keeps the selected count visible and returns to the current workbench', () => {
    usePilatesStore.setState({ activeTab: 'atlas' });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    expect(screen.getByRole('button', { name: '수업안으로' }).parentElement).toHaveTextContent(
      '수업안에 0개 선택',
    );
    fireEvent.click(screen.getByRole('button', { name: '수업안으로' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
  });
});

it('pauses a retained preview while the finder is inactive and never resumes it automatically', () => {
  const mapped = INITIAL_EXERCISES.find(
    (exercise) => getMotionPatternReferences(exercise.id).length > 0,
  )!;
  usePilatesStore.setState({ exercises: [mapped] });
  const before = usePilatesStore.getState();
  const onOpenExercise = vi.fn();
  const { rerender } = render(<InlineExerciseFinder onOpenExercise={onOpenExercise} active />);
  fireEvent.click(screen.getAllByRole('button', { name: /초안 보기$/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
  expect(screen.getByRole('button', { name: '일시정지' })).toBeEnabled();
  rerender(<InlineExerciseFinder onOpenExercise={onOpenExercise} active={false} />);
  expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
  rerender(<InlineExerciseFinder onOpenExercise={onOpenExercise} active />);
  expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
  expect(usePilatesStore.getState()).toBe(before);
});
