import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  LocateFixed,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import { matchesLibraryEquipment } from '../data/libraryEquipmentFilters';
import { EquipmentDiscoveryScope } from './EquipmentDiscoveryScope';
import type { EquipmentId } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { useSequenceInsertionPlacement } from '../hooks/useSequenceInsertionPlacement';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  addMovementIdeaToCurrentClass,
  isMovementIdeaExercise,
  readMovementIdeaDraft,
} from '../utils/movementIdeaDraft';
import { PfAiStatusBadge, PfBadge, PfMovementCard } from '../design-system';
import { isRestStep } from '../utils/sequenceEngine';
import {
  resolveSequenceInsertion,
  type SequenceInsertionPlacement,
} from '../utils/sequenceInsertion';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import { resolvePatternReferencesForRenderer } from '../features/motionCoverage';
import { MotionPatternPreview } from './MotionPatternPreview';
import { SpringVisualPills } from './SpringVisualPills';
import { normalizeCanonicalSpringKey } from '../utils/brandSpringConverter';
import '../styles/design-tokens.css';
import '../styles/inline-exercise-finder.css';
import '../styles/finder-class-context.css';

interface InlineExerciseFinderProps {
  onOpenExercise: (exercise: PilatesExercise) => void;
  classEquipment?: readonly EquipmentId[];
  autoNarrowToClassEquipment?: boolean;
  active?: boolean;
  onArrangeSequence?: () => void;
  insertionPlacement?: SequenceInsertionPlacement;
  onInsertionPlacementChange?: (placement: SequenceInsertionPlacement) => void;
}

type FilterTab = 'equipment' | 'spring' | 'body' | 'duration';
type DurationFilter = 'all' | 'short' | 'medium' | 'long';
type SectionFilter = 'all' | 'warmup' | 'main' | 'cooldown';
interface FinderFilters {
  query: string;
  equipment: EquipmentId[];
  springKey: string;
  bodyTag: string;
  duration: DurationFilter;
  section: SectionFilter;
  unilateralOnly: boolean;
  motionOnly: boolean;
}
export const INLINE_FINDER_QUERY_STORAGE_KEY = 'pf_inline_finder_query_v1';

const SPRING_QUICK_OPTIONS: readonly { key: string; label: string }[] = [
  { key: '', label: '전체 스프링' },
  { key: '2R 1B', label: '2R 1B (풋워크)' },
  { key: '2R', label: '2R (브릿지·하체)' },
  { key: '1R 1B', label: '1R 1B (코어·스트랩)' },
  { key: '1R', label: '1R (상체·런지)' },
  { key: '1B', label: '1B (경량·머메이드)' },
  { key: 'Bodyweight', label: '맨몸·무스프링' },
];

function findLastActiveStepSpring(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
) {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i]!;
    if (isRestStep(step)) continue;
    const exercise = exercisesById.get(step.exerciseId);
    const raw = (step.customSpringOverride || exercise?.springs || '').trim();
    const key = normalizeCanonicalSpringKey(raw);
    if (key && key !== 'Bodyweight' && !/\bor\b|또는/i.test(raw)) {
      return { raw, key };
    }
  }
  return null;
}

function exerciseMatchesSpringFilter(exercise: PilatesExercise, springKey: string): boolean {
  if (!springKey) return true;
  const raw = (exercise.springs ?? '').trim();
  if (!raw) return springKey === 'Bodyweight';
  if (/\bor\b|또는/i.test(raw)) {
    return raw
      .split(/\bor\b|또는/i)
      .some((part) => normalizeCanonicalSpringKey(part) === springKey);
  }
  return normalizeCanonicalSpringKey(raw) === springKey;
}

function readSavedFinderQuery(): string {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(INLINE_FINDER_QUERY_STORAGE_KEY)
        : null;
    return raw && raw.trim() ? raw : '';
  } catch {
    return '';
  }
}

function writeSavedFinderQuery(query: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (query.trim()) {
      window.sessionStorage[INLINE_FINDER_QUERY_STORAGE_KEY] = query;
    } else {
      delete window.sessionStorage[INLINE_FINDER_QUERY_STORAGE_KEY];
    }
  } catch {
    // ignore storage quota or sandbox errors
  }
}

usePilatesStore.subscribe((state, prev) => {
  if (
    state.activeSequenceId !== prev.activeSequenceId ||
    state.exercises !== prev.exercises ||
    state.savedSequences !== prev.savedSequences ||
    (state.draftCriteria === null && prev.draftCriteria !== null)
  ) {
    writeSavedFinderQuery('');
  }
});

const emptyFilters = (initialQuery = '', initialEquipment: EquipmentId[] = []): FinderFilters => ({
  query: initialQuery,
  equipment: initialEquipment,
  springKey: '',
  bodyTag: '',
  duration: 'all',
  section: 'all',
  unilateralOnly: false,
  motionOnly: false,
});
const SECTION_QUICK_OPTIONS: readonly { id: SectionFilter; label: string }[] = [
  { id: 'warmup', label: '준비' },
  { id: 'main', label: '본운동' },
  { id: 'cooldown', label: '마무리' },
];
function matchesFinderSection(exercise: PilatesExercise, section: SectionFilter): boolean {
  if (section === 'all') return true;
  if (section === 'warmup') return exercise.blockCategory === 'warmup';
  if (section === 'cooldown') return exercise.blockCategory === 'cooldown';
  return exercise.blockCategory !== 'warmup' && exercise.blockCategory !== 'cooldown';
}
const durationOptions: readonly { id: DurationFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'short', label: '3분 이하' },
  { id: 'medium', label: '3분 초과–5분' },
  { id: 'long', label: '5분 초과' },
];
const tabs: readonly { id: FilterTab; label: string }[] = [
  { id: 'equipment', label: '기구' },
  { id: 'spring', label: '스프링' },
  { id: 'body', label: '부위' },
  { id: 'duration', label: '시간' },
];

function compactSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, '');
}

function handleChipBarKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  );
  if (!buttons.length) return;
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0) return;
  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
  buttons[nextIndex]?.focus();
}

export function InlineExerciseFinder({
  onOpenExercise,
  classEquipment = [],
  autoNarrowToClassEquipment = false,
  active = true,
  onArrangeSequence,
  insertionPlacement: controlledInsertionPlacement,
  onInsertionPlacementChange,
}: InlineExerciseFinderProps) {
  const exercises = usePilatesStore((state) => state.exercises);
  const ownedEquipment = usePilatesStore((state) => state.ownedEquipment);
  const ownedProps = usePilatesStore((state) => state.ownedProps);
  const exerciseBrowseScope = usePilatesStore((state) => state.exerciseBrowseScope);
  const setExerciseBrowseScope = usePilatesStore((state) => state.setExerciseBrowseScope);
  const activeSteps = usePilatesStore((state) => state.activeSteps);
  const activeSequenceId = usePilatesStore((state) => state.activeSequenceId);
  const activeClassLevel = usePilatesStore(
    (state) => state.draftCriteria?.level ?? state.activeLevel,
  );
  const insertExerciseIntoSequence = usePilatesStore((state) => state.insertExerciseIntoSequence);
  const [localInsertionPlacement, setLocalInsertionPlacement] =
    useSequenceInsertionPlacement(activeSequenceId);
  const insertionPlacement = controlledInsertionPlacement ?? localInsertionPlacement;
  const setInsertionPlacement = (placement: SequenceInsertionPlacement) => {
    setLocalInsertionPlacement(placement);
    onInsertionPlacementChange?.(placement);
  };
  const setActiveTab = usePilatesStore((state) => state.setActiveTab);
  const classEquipmentKey = `${autoNarrowToClassEquipment ? 'auto' : 'manual'}:${classEquipment.join(',')}`;
  const [prevClassEquipmentKey, setPrevClassEquipmentKey] = useState(classEquipmentKey);
  const [filters, setFilters] = useState<FinderFilters>(() =>
    emptyFilters(
      readSavedFinderQuery(),
      autoNarrowToClassEquipment && classEquipment.length > 0 ? [...classEquipment] : [],
    ),
  );
  if (prevClassEquipmentKey !== classEquipmentKey) {
    setPrevClassEquipmentKey(classEquipmentKey);
    if (autoNarrowToClassEquipment) {
      setFilters((previous) => ({
        ...previous,
        equipment: classEquipment.length > 0 ? [...classEquipment] : [],
      }));
    }
  }
  const [tab, setTab] = useState<FilterTab>('equipment');
  const [page, setPage] = useState({ signature: '', count: 6 });
  const signature = JSON.stringify({ filters, exerciseBrowseScope, ownedEquipment, ownedProps });
  const visibleCount = page.signature === signature ? page.count : 6;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preview, setPreview] = useState<MotionPatternReference | null>(null);
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null);
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const id = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const previewCloseBtnRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const nextPageFocusRef = useRef<number | null>(null);
  useEffect(() => {
    const index = nextPageFocusRef.current;
    if (index === null) return;
    nextPageFocusRef.current = null;
    resultsRef.current?.children[index]?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [visibleCount]);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (preview) previewRef.current?.focus();
  }, [preview]);

  const exercisesById = useMemo(
    () => new Map(exercises.map((item) => [item.id, item])),
    [exercises],
  );

  const insertionResolution = resolveSequenceInsertion(activeSteps, insertionPlacement);
  const insertionValue =
    insertionPlacement.kind === 'step'
      ? `step:${insertionPlacement.stepId}`
      : insertionPlacement.kind;
  const insertionOptions: {
    value: string;
    label: string;
    placement: SequenceInsertionPlacement;
  }[] = [
    { value: 'end', label: '맨 뒤', placement: { kind: 'end' } },
    { value: 'start', label: '맨 앞', placement: { kind: 'start' } },
    ...activeSteps.map((step, index) => {
      const name = isRestStep(step)
        ? '휴식'
        : (exercisesById.get(step.exerciseId)?.nameKo ?? '동작 정보 없음');
      return {
        value: `step:${step.stepId}`,
        label: `${index + 1}번 ${name} 뒤`,
        placement: { kind: 'step' as const, stepId: step.stepId },
      };
    }),
  ];
  const insertionAnchorMissing = !insertionOptions.some(
    (option) => option.value === insertionValue,
  );
  const hasLockedSteps = activeSteps.some((step) => step.locked);

  const lastActiveStepSpring = insertionResolution.success
    ? findLastActiveStepSpring(activeSteps.slice(0, insertionResolution.index), exercisesById)
    : null;

  const update = <K extends keyof FinderFilters>(key: K, value: FinderFilters[K]) => {
    if (key === 'query' && typeof value === 'string') {
      writeSavedFinderQuery(value);
    }
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage({ signature: '', count: 6 });
  };
  const clearQueryOnly = () => {
    update('query', '');
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };
  const reset = () => {
    writeSavedFinderQuery('');
    setFilters(emptyFilters(''));
    setPage({ signature: '', count: 6 });
    setFeedback(null);
  };

  const bodyTags = useMemo(
    () =>
      [...new Set(exercises.flatMap((exercise) => exercise.targetMuscles).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, 'ko'),
      ),
    [exercises],
  );
  const results = useMemo(() => {
    const terms = filters.query
      .normalize('NFKC')
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .map(compactSearchText);
    return exercises.filter((exercise) => {
      const equipment = getExerciseEquipment(exercise);
      const motionReferences = resolvePatternReferencesForRenderer(exercise);
      if (filters.motionOnly && !motionReferences.length) return false;
      if (!matchesFinderSection(exercise, filters.section)) return false;
      if (filters.unilateralOnly && !exercise.isUnilateral) return false;
      if (
        !matchesLibraryEquipment(equipment, {
          equipment: filters.equipment,
          props: [],
          ownedOnly: exerciseBrowseScope === 'owned',
          ownedEquipment,
          ownedProps,
        })
      )
        return false;
      if (filters.springKey && !exerciseMatchesSpringFilter(exercise, filters.springKey)) {
        return false;
      }
      if (filters.bodyTag && !exercise.targetMuscles.includes(filters.bodyTag)) return false;
      if (filters.duration === 'short' && exercise.defaultDurationMin > 3) return false;
      if (
        filters.duration === 'medium' &&
        (exercise.defaultDurationMin <= 3 || exercise.defaultDurationMin > 5)
      )
        return false;
      if (filters.duration === 'long' && exercise.defaultDurationMin <= 5) return false;
      const fields = [
        exercise.nameKo,
        exercise.nameEn,
        exercise.springs,
        ...exercise.targetMuscles,
        ...equipment.requiredEquipment.map(
          (eqId) => EQUIPMENT_OPTIONS.find((item) => item.id === eqId)?.labelKo ?? eqId,
        ),
        ...equipment.requiredProps.map(
          (propId) => PROP_OPTIONS.find((item) => item.id === propId)?.labelKo ?? propId,
        ),
        ...motionReferences.flatMap((reference) => [
          reference.title,
          reference.variant,
          ...reference.equipment,
        ]),
      ].map(compactSearchText);
      return terms.every((term) => fields.some((field) => field.includes(term)));
    });
  }, [exercises, filters, exerciseBrowseScope, ownedEquipment, ownedProps]);
  const orderedResults = useMemo(() => {
    if (!autoNarrowToClassEquipment) return results;
    const rank = { '1.0': 1, '1.5': 2, '2.0': 3 } as const;
    const maxRank = rank[activeClassLevel] ?? 3;
    return [...results].sort((left, right) => {
      const leftFits = (rank[left.level] ?? 1) <= maxRank ? 0 : 1;
      const rightFits = (rank[right.level] ?? 1) <= maxRank ? 0 : 1;
      return leftFits - rightFits;
    });
  }, [results, autoNarrowToClassEquipment, activeClassLevel]);

  const activeFilterCount =
    filters.equipment.length +
    Number(Boolean(filters.springKey)) +
    Number(Boolean(filters.bodyTag)) +
    Number(filters.duration !== 'all') +
    Number(filters.section !== 'all') +
    Number(filters.unilateralOnly);
  const selectedCount = activeSteps.filter((step) => !isRestStep(step)).length;
  const hasFilters = Boolean(filters.query.trim() || activeFilterCount || filters.motionOnly);

  const activeFilterChips: {
    key: string;
    label: string;
    ariaLabel: string;
    remove: () => void;
  }[] = [
    ...filters.equipment.map((eqId) => {
      const labelKo = EQUIPMENT_OPTIONS.find((item) => item.id === eqId)?.labelKo ?? eqId;
      return {
        key: `equipment-${eqId}`,
        label: labelKo,
        ariaLabel: `${labelKo} 필터 해제`,
        remove: () =>
          update(
            'equipment',
            filters.equipment.filter((item) => item !== eqId),
          ),
      };
    }),
    ...(filters.section !== 'all'
      ? [
          {
            key: `section-${filters.section}`,
            label: `구간: ${SECTION_QUICK_OPTIONS.find((opt) => opt.id === filters.section)?.label ?? filters.section}`,
            ariaLabel: `구간 ${SECTION_QUICK_OPTIONS.find((opt) => opt.id === filters.section)?.label ?? filters.section} 필터 해제`,
            remove: () => update('section', 'all'),
          },
        ]
      : []),
    ...(filters.unilateralOnly
      ? [
          {
            key: 'unilateralOnly',
            label: '편측(좌·우) 동작',
            ariaLabel: '편측 동작 필터 해제',
            remove: () => update('unilateralOnly', false),
          },
        ]
      : []),
    ...(filters.springKey
      ? [
          {
            key: `spring-${filters.springKey}`,
            label: `스프링: ${filters.springKey === 'Bodyweight' ? '맨몸' : filters.springKey}`,
            ariaLabel: `스프링 ${filters.springKey} 필터 해제`,
            remove: () => update('springKey', ''),
          },
        ]
      : []),
    ...(filters.bodyTag
      ? [
          {
            key: `body-${filters.bodyTag}`,
            label: `부위: ${filters.bodyTag}`,
            ariaLabel: `부위 ${filters.bodyTag} 필터 해제`,
            remove: () => update('bodyTag', ''),
          },
        ]
      : []),
    ...(filters.duration !== 'all'
      ? [
          {
            key: `duration-${filters.duration}`,
            label: `시간: ${
              durationOptions.find((item) => item.id === filters.duration)?.label ??
              filters.duration
            }`,
            ariaLabel: `시간 ${
              durationOptions.find((item) => item.id === filters.duration)?.label ??
              filters.duration
            } 필터 해제`,
            remove: () => update('duration', 'all'),
          },
        ]
      : []),
    ...(filters.motionOnly
      ? [
          {
            key: 'motionOnly',
            label: '초안 있는 동작',
            ariaLabel: '초안 있는 동작 필터 해제',
            remove: () => update('motionOnly', false),
          },
        ]
      : []),
  ];

  const handleRemoveChip = (index: number, removeAction: () => void) => {
    const remainingCount = activeFilterChips.length - 1;
    removeAction();
    requestAnimationFrame(() => {
      if (remainingCount <= 0) {
        searchInputRef.current?.focus();
        return;
      }
      const nextButtons =
        chipBarRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [];
      const targetIndex = Math.min(index, nextButtons.length - 1);
      nextButtons[targetIndex]?.focus();
    });
  };

  const previewExercise = useMemo(() => {
    if (!preview) return undefined;
    return (
      exercises.find((item) => item.id === previewExerciseId) ??
      exercises.find((item) => preview.intendedExerciseIds.includes(item.id))
    );
  }, [exercises, preview, previewExerciseId]);
  const previewApproved = previewExercise ? isExerciseAutoEligible(previewExercise) : false;
  const previewStale = previewExercise
    ? getExerciseReviewState(previewExercise) === 'stale'
    : false;
  const previewAlreadyAdded = previewExercise
    ? activeSteps.some((step) => !isRestStep(step) && step.exerciseId === previewExercise.id)
    : false;

  const lastVisitedIndex = lastVisitedId
    ? results.findIndex((item) => item.id === lastVisitedId)
    : -1;
  const lastVisitedExercise = lastVisitedIndex >= 0 ? results[lastVisitedIndex] : undefined;

  const jumpToExerciseCard = (exerciseId: string) => {
    const targetIndex = results.findIndex((item) => item.id === exerciseId);
    if (targetIndex < 0) return;
    if (targetIndex >= visibleCount) {
      setPage({ signature, count: Math.ceil((targetIndex + 1) / 6) * 6 });
    }
    requestAnimationFrame(() => {
      const targetBtn = resultsRef.current?.querySelector<HTMLButtonElement>(
        `[data-ief-exercise-title="${exerciseId}"]`,
      );
      if (!targetBtn?.isConnected) return;
      targetBtn.focus({ preventScroll: true });
      targetBtn.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
    });
  };

  const closePreview = () => {
    const targetExerciseId = previewExercise?.id ?? previewExerciseId;
    const trigger = previewTriggerRef.current;
    setPreview(null);
    setPreviewExerciseId(null);
    if (trigger?.isConnected) {
      trigger.focus();
      return;
    }
    if (targetExerciseId && results.some((item) => item.id === targetExerciseId)) {
      jumpToExerciseCard(targetExerciseId);
      return;
    }
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const openExerciseDetail = (exercise: PilatesExercise) => {
    setLastVisitedId(exercise.id);
    onOpenExercise(exercise);
  };

  const addExercise = (exercise: PilatesExercise, source: 'card' | 'preview' = 'card') => {
    setLastVisitedId(exercise.id);
    const result = isMovementIdeaExercise(exercise)
      ? addMovementIdeaToCurrentClass(exercise.id, insertionPlacement)
      : insertExerciseIntoSequence(exercise.id, insertionPlacement);
    setFeedback({ success: result.success, message: result.message });
    if (result.success) {
      if (result.stepId) setInsertionPlacement({ kind: 'step', stepId: result.stepId });
      requestAnimationFrame(() => {
        if (source === 'preview') {
          previewCloseBtnRef.current?.focus();
          return;
        }
        resultsRef.current
          ?.querySelector<HTMLButtonElement>(`[data-ief-exercise-title="${exercise.id}"]`)
          ?.focus({ preventScroll: true });
      });
    }
  };

  return (
    <aside className="inline-exercise-finder" aria-label="작업대 동작 찾기">
      <div className="ief-heading">
        <div>
          <p>바로 골라 수업에 담기</p>
          <h2>동작 찾기</h2>
        </div>
        <span>{exercises.length}개 노트</span>
      </div>
      <div className="ief-insertion-control">
        <label htmlFor={`${id}-insertion-position`}>동작 추가 위치</label>
        <select
          id={`${id}-insertion-position`}
          value={insertionValue}
          aria-invalid={!insertionResolution.success || undefined}
          aria-describedby={`${id}-insertion-help`}
          onChange={(event) => {
            const option = insertionOptions.find((item) => item.value === event.target.value);
            if (!option) return;
            setInsertionPlacement(option.placement);
            setFeedback(null);
          }}
        >
          {insertionAnchorMissing && (
            <option value={insertionValue} disabled>
              기준 항목이 삭제됨 · 위치를 다시 선택해 주세요
            </option>
          )}
          {insertionOptions.map((option) => {
            const available = resolveSequenceInsertion(activeSteps, option.placement).success;
            return (
              <option key={option.value} value={option.value} disabled={!available}>
                {option.label}
                {available ? '' : ' · 잠금 위치 유지로 선택 불가'}
              </option>
            );
          })}
        </select>
        <p
          id={`${id}-insertion-help`}
          className={insertionResolution.success ? 'ief-insertion-help' : 'ief-insertion-error'}
          role={insertionResolution.success ? undefined : 'alert'}
        >
          {!insertionResolution.success
            ? insertionResolution.message
            : hasLockedSteps
              ? '잠긴 항목의 위치를 바꾸는 곳에는 추가할 수 없어요. 고른 동작은 선택한 위치부터 차례로 들어갑니다.'
              : '고른 동작은 선택한 위치부터 차례로 들어갑니다.'}
        </p>
      </div>
      <details className="pf-detail-progressive-drawer" style={{ marginBottom: '8px' }}>
        <summary><span>보유 장비 범위 필터 설정 ({ownedEquipment.length}종)</span></summary>
        <EquipmentDiscoveryScope />
      </details>
      {classEquipment.length > 0 && (
        <section className="ief-class-context" aria-label="이번 수업 기구">
          <p>
            이번 수업 기구:{' '}
            {classEquipment
              .map(
                (item) => EQUIPMENT_OPTIONS.find((option) => option.id === item)?.labelKo ?? item,
              )
              .join(' · ')}
          </p>
          <div>
            <button
              type="button"
              aria-pressed={
                filters.equipment.length === classEquipment.length &&
                classEquipment.every((item) => filters.equipment.includes(item))
              }
              onClick={() => update('equipment', [...classEquipment])}
            >
              수업 기구로 좁히기
            </button>
            <button
              type="button"
              aria-pressed={filters.equipment.length === 0}
              onClick={() => update('equipment', [])}
            >
              수업 기구 조건 해제
            </button>
          </div>
        </section>
      )}
      <div className="ief-search-row">
        <label className="ief-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="동작 이름 또는 등록된 부위 태그 검색"
            placeholder="동작 이름 또는 부위 검색"
            value={filters.query}
            onChange={(event) => update('query', event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && filters.query.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                clearQueryOnly();
              }
            }}
          />
        </label>
        {filters.query.length > 0 && (
          <button
            type="button"
            className="ief-search-clear"
            aria-label="검색어 지우기"
            onClick={clearQueryOnly}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className="ief-quick-filters"
        role="group"
        aria-label="빠른 구간·편측·상세 필터"
        onKeyDown={handleChipBarKeyDown}
      >
        {SECTION_QUICK_OPTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            data-testid={`ief-quick-section-${sec.id}`}
            aria-pressed={filters.section === sec.id}
            onClick={() => update('section', filters.section === sec.id ? 'all' : sec.id)}
          >
            {sec.label}
          </button>
        ))}
        <button
          type="button"
          data-testid="ief-quick-unilateral-chip"
          aria-pressed={filters.unilateralOnly}
          onClick={() => update('unilateralOnly', !filters.unilateralOnly)}
        >
          편측 동작
        </button>
        {lastActiveStepSpring && (
          <button
            type="button"
            data-testid="ief-same-spring-chip"
            aria-pressed={filters.springKey === lastActiveStepSpring.key}
            onClick={() =>
              update(
                'springKey',
                filters.springKey === lastActiveStepSpring.key ? '' : lastActiveStepSpring.key,
              )
            }
          >
            <Sparkles size={14} aria-hidden="true" /> 직전 스프링 유지 ({lastActiveStepSpring.key})
          </button>
        )}
        <button
          type="button"
          aria-pressed={filters.motionOnly}
          onClick={() => update('motionOnly', !filters.motionOnly)}
        >
          초안 있는 동작
        </button>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> 필터
          {activeFilterCount ? ` ${activeFilterCount}` : ''}
        </button>
      </div>
      {activeFilterChips.length > 0 && (
        <div
          ref={chipBarRef}
          className="ief-active-chips"
          role="group"
          aria-label="적용된 찾기 조건"
          onKeyDown={handleChipBarKeyDown}
        >
          {activeFilterChips.map((chip, index) => (
            <button
              key={chip.key}
              type="button"
              className="ief-active-chip"
              aria-label={chip.ariaLabel}
              onClick={() => handleRemoveChip(index, chip.remove)}
            >
              <span>{chip.label}</span>
              <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div id={`${id}-filters`} className="ief-filter-drawer" hidden={!filtersOpen}>
        <div className="ief-filter-tabs" role="tablist" aria-label="동작 찾기 필터">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${id}-${item.id}-tab`}
              aria-controls={`${id}-${item.id}-panel`}
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                const current = tabs.findIndex((option) => option.id === tab);
                const next =
                  event.key === 'ArrowRight'
                    ? (current + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (current + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : undefined;
                if (next === undefined) return;
                event.preventDefault();
                setTab(tabs[next].id);
                document.getElementById(`${id}-${tabs[next].id}-tab`)?.focus();
              }}
            >
              {item.label}
              {item.id === 'equipment' && filters.equipment.length > 0 && (
                <span>{filters.equipment.length}</span>
              )}
              {item.id === 'spring' && filters.springKey && <span>1</span>}
            </button>
          ))}
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-equipment-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-equipment-tab`}
          hidden={tab !== 'equipment'}
        >
          <div className="ief-equipment-options" aria-label="찾을 기구 · 다중 선택">
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <button
                key={equipment.id}
                type="button"
                aria-pressed={filters.equipment.includes(equipment.id)}
                onClick={() =>
                  update(
                    'equipment',
                    filters.equipment.includes(equipment.id)
                      ? filters.equipment.filter((item) => item !== equipment.id)
                      : [...filters.equipment, equipment.id],
                  )
                }
              >
                {equipment.labelKo}
              </button>
            ))}
          </div>
          <p>여러 기구를 고르면 하나라도 일치하는 동작을 찾습니다.</p>
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-spring-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-spring-tab`}
          hidden={tab !== 'spring'}
        >
          <div
            className="ief-duration-options"
            aria-label="찾을 스프링 세팅"
            data-testid="ief-spring-filter-options"
          >
            {SPRING_QUICK_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.key || 'all'}
                aria-pressed={filters.springKey === option.key}
                onClick={() => update('springKey', option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p>스프링 전환 없이 이어갈 동작을 빠르게 좁힙니다. 실제 장력은 기구별로 확인하세요.</p>
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-body-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-body-tab`}
          hidden={tab !== 'body'}
        >
          <label className="ief-select-field">
            <span>등록된 부위 태그</span>
            <select
              value={filters.bodyTag}
              onChange={(event) => update('bodyTag', event.target.value)}
            >
              <option value="">전체 태그</option>
              {bodyTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <p>직접 입력된 태그 기준입니다. 미검토 분류도 포함합니다.</p>
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-duration-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-duration-tab`}
          hidden={tab !== 'duration'}
        >
          <div className="ief-duration-options" aria-label="찾을 동작의 계획 시간">
            {durationOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-pressed={filters.duration === option.id}
                onClick={() => update('duration', option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p>등록한 기본 계획 시간 · 편측 동작은 양쪽 포함</p>
        </div>
      </div>
      <div className="ief-results-heading">
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>{results.length}개</strong> 결과
          {activeFilterCount > 0 && <span> · 필터 {activeFilterCount}</span>}
        </p>
        <div className="ief-results-actions">
          {lastVisitedExercise && (
            <button
              type="button"
              className="ief-return-card-btn"
              aria-label={`방금 본 ${lastVisitedExercise.nameKo} 카드 위치로 이동`}
              onClick={() => jumpToExerciseCard(lastVisitedExercise.id)}
            >
              <LocateFixed size={13} aria-hidden="true" />
              <span>
                {lastVisitedIndex >= visibleCount ? '방금 본 위치 펼치기' : '방금 본 위치로'}
              </span>
            </button>
          )}
          {hasFilters && (
            <button type="button" onClick={reset} aria-label="동작 찾기 검색·필터 초기화">
              <X size={14} /> 초기화
            </button>
          )}
        </div>
      </div>
      <p className="ief-review-hint">동작을 골라 수업에 추가하세요.</p>
      {preview && (
        <section
          ref={previewRef}
          tabIndex={-1}
          className="ief-preview"
          aria-label="선택한 모션 초안"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closePreview();
            }
          }}
        >
          <div className="ief-preview-heading">
            <p>관련 패턴 참고 · 전문가 미검수</p>
            <button
              ref={previewCloseBtnRef}
              type="button"
              aria-label="모션 초안 닫기"
              onClick={closePreview}
            >
              <X size={18} />
            </button>
          </div>
          <MotionPatternPreview key={preview.variantId} reference={preview} active={active} />
          {previewExercise && (
            <section
              className="ief-preview-exercise-summary"
              aria-label="연결 동작 설명·주의점 및 시퀀스 삽입"
            >
              <div className="ief-preview-exercise-header">
                <div>
                  <strong>{previewExercise.nameKo}</strong>
                  <span>{previewExercise.nameEn}</span>
                </div>
                <span className={previewApproved ? 'is-reviewed' : 'is-pending'}>
                  {previewApproved
                    ? '내 검토 기록 · 전문가 검토 아님'
                    : previewStale
                      ? '정보 변경 · 다시 검토 필요'
                      : '검토 전 원자료 메모'}
                </span>
              </div>
              <p className="ief-preview-exercise-meta">
                부위: {previewExercise.targetMuscles.join(', ') || '미지정'} · 계획 기본{' '}
                {previewExercise.defaultDurationMin}분 · 위 도식 초안은 정확 모션(0/98)이나 전문가
                검토(0건)가 아닙니다.
              </p>
              <dl className="ief-preview-exercise-notes">
                <div>
                  <dt>동작 설명·티칭 큐 (원자료 참고)</dt>
                  <dd>
                    {previewExercise.cues.length
                      ? previewExercise.cues.slice(0, 2).join(' · ')
                      : '등록된 큐 메모 없음 · 노트 상세에서 확인'}
                  </dd>
                </div>
                <div>
                  <dt>주의점·금기 사항 (원자료 참고)</dt>
                  <dd>
                    {previewExercise.precautions?.trim()
                      ? previewExercise.precautions
                      : '등록된 주의점 메모 없음 · 노트 상세에서 출처 대조 필요'}
                  </dd>
                </div>
              </dl>
              <div className="ief-preview-exercise-actions">
                <button
                  type="button"
                  className="ief-preview-open-note"
                  aria-label={`${previewExercise.nameKo} 설명·주의점 상세 및 검토 열기`}
                  onClick={() => openExerciseDetail(previewExercise)}
                >
                  노트 상세·검토 열기
                </button>
                <button
                  type="button"
                  className="ief-preview-insert-step"
                  disabled={previewAlreadyAdded || !insertionResolution.success}
                  aria-label={
                    previewAlreadyAdded
                      ? `${previewExercise.nameKo} 초안 창에서 이미 시퀀스에 있음`
                      : `${previewExercise.nameKo} 초안 확인 후 시퀀스 삽입`
                  }
                  onClick={() => addExercise(previewExercise, 'preview')}
                >
                  {previewAlreadyAdded ? (
                    <>
                      <Check size={16} aria-hidden="true" /> 시퀀스에 추가됨
                    </>
                  ) : (
                    <>
                      <Plus size={16} aria-hidden="true" /> 시퀀스에 바로 삽입
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </section>
      )}
      {feedback && (
        <p
          className={`ief-feedback ${feedback.success ? 'success' : 'error'}`}
          role={feedback.success ? 'status' : 'alert'}
        >
          {feedback.message}
        </p>
      )}
      {results.length ? (
        <div className="ief-results" ref={resultsRef}>
          {orderedResults.slice(0, visibleCount).map((exercise) => {
            const equipment = getExerciseEquipment(exercise);
            const approved = isExerciseAutoEligible(exercise);
            const stale = getExerciseReviewState(exercise) === 'stale';
            const isIdea = isMovementIdeaExercise(exercise);
            const ideaMeta = isIdea ? readMovementIdeaDraft(exercise) : null;
            const references = resolvePatternReferencesForRenderer(exercise);
            const firstReference = references[0];
            const alreadyAdded = activeSteps.some(
              (step) => !isRestStep(step) && step.exerciseId === exercise.id,
            );
            const isLastVisited = lastVisitedId === exercise.id;
            const equipmentLabel = equipment.requirementsKnown
              ? equipment.requiredEquipment
                  .map((key) => EQUIPMENT_OPTIONS.find((item) => item.id === key)?.labelKo)
                  .filter(Boolean)
                  .join(' · ')
              : '기구 요구 조건 미확인';
            return (
              <PfMovementCard
                key={exercise.id}
                variant={isIdea ? 'idea' : 'catalog'}
                className={`ief-card ${isLastVisited ? 'is-last-visited' : ''}`.trim()}
                data-last-visited={isLastVisited ? 'true' : undefined}
                aria-label={`${exercise.nameKo} 동작 노트`}
              >
                <button
                  className={`ief-card-image ief-art-${exercise.apparatus} pf-p03-3d-media`}
                  type="button"
                  aria-label={`${exercise.nameKo} 상세 보기`}
                  onClick={() => openExerciseDetail(exercise)}
                >
                  <ExerciseMotionArtwork
                    exercise={exercise}
                    className="ief-studio3d-thumb"
                    data-testid="ief-card-3d-thumb" />
                  <span className="pf-b05-card-overlay-top" aria-hidden="true">
                    <span className="pf-b05-pill is-dark">{equipmentLabel || '3D 기구'}</span>
                    {exercise.springs && (
                      <span className="pf-b05-pill is-light">{exercise.springs}</span>
                    )}
                  </span>
                  <span className="pf-b05-card-overlay-bottom" aria-hidden="true">
                    <span className="pf-b05-pill is-coral">
                      ● {exercise.targetMuscles[0] || '코어·정렬'}
                    </span>
                  </span>
                  <span className="ief-motion-caption sr-only" aria-hidden="true">
                    {firstReference ? '3D 스튜디오 · 패턴 참고' : '3D 스튜디오 · 기구 참조'}
                  </span>
                </button>
                <div className="ief-card-body">
                  <h3>
                    <button
                      type="button"
                      data-ief-exercise-title={exercise.id}
                      onClick={() => openExerciseDetail(exercise)}
                    >
                      {exercise.nameKo}
                    </button>
                  </h3>
                  <div
                    className="pf-class-badges-strip ief-card-badges"
                    data-testid="ief-card-spring-level-strip"
                  >
                    <PfBadge
                      tone={
                        exercise.level === '2.0'
                          ? 'warning'
                          : exercise.level === '1.5'
                            ? 'brand'
                            : 'sage'
                      }
                    >
                      Lv {exercise.level}
                    </PfBadge>
                    {exercise.springs && <SpringVisualPills springs={exercise.springs} />}
                  </div>
                  <p>
                    {equipmentLabel} · {exercise.defaultDurationMin}분
                    {exercise.targetMuscles.length > 0 && (
                      <span> · {exercise.targetMuscles.slice(0, 2).join('·')}</span>
                    )}
                  </p>
                  {references.length > 0 && (
                    <div
                      className="ief-draft-actions"
                      aria-label={`${exercise.nameKo} 관련 모션 초안`}
                    >
                      {references.map((reference) => (
                        <button
                          type="button"
                          key={reference.variantId}
                          aria-label={`${reference.title} 초안 보기`}
                          onClick={(event) => {
                            previewTriggerRef.current = event.currentTarget;
                            setLastVisitedId(exercise.id);
                            setPreviewExerciseId(exercise.id);
                            setPreview(reference);
                          }}
                        >
                          <span>{reference.title}</span>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ief-card-actions">
                    <PfAiStatusBadge
                      kind={
                        isIdea
                          ? ideaMeta?.triedByInstructor
                            ? 'tried-memo'
                            : 'creative-memo'
                          : approved
                            ? 'instructor-reviewed'
                            : 'review-pending'
                      }
                      className={approved ? 'is-reviewed' : 'is-pending'}
                    >
                      {isIdea
                        ? ideaMeta?.triedByInstructor
                          ? '직접 해봄 · 주관적 메모'
                          : '내 창작 메모'
                        : approved
                          ? '내 검토 기록'
                          : stale
                            ? '다시 검토'
                            : '검토 전'}
                    </PfAiStatusBadge>
                    <button
                      type="button"
                      disabled={alreadyAdded || !insertionResolution.success}
                      aria-label={
                        alreadyAdded
                          ? `${exercise.nameKo} 이미 수업안에 있음`
                          : `${exercise.nameKo} 수업안에 추가`
                      }
                      onClick={() => addExercise(exercise, 'card')}
                      title="수업안에 추가 · 검토 상태는 변경되지 않습니다"
                    >
                      {alreadyAdded ? <Check size={18} /> : <Plus size={18} />}
                      <span>{alreadyAdded ? '추가됨' : '추가'}</span>
                    </button>
                  </div>
                </div>
              </PfMovementCard>
            );
          })}
        </div>
      ) : (
        <div className="ief-empty">
          <Search size={24} aria-hidden="true" />
          <h3>조건에 맞는 동작이 없어요</h3>
          <p>
            {exerciseBrowseScope === 'owned'
              ? '내 보유 장비 범위에서 결과가 없습니다. 설정의 기구·소도구 또는 검색 조건을 확인해 주세요.'
              : '검색어와 기구·태그·시간을 조정해 보세요.'}
          </p>
          {Boolean(filters.query.trim()) &&
            (activeFilterChips.length > 0 || exerciseBrowseScope === 'owned') && (
              <button type="button" className="ief-empty-query-btn" onClick={clearQueryOnly}>
                검색어만 지우기
              </button>
            )}
          {filters.equipment.length > 0 && (
            <button
              type="button"
              className="ief-empty-unscope-btn"
              data-testid="ief-empty-unscope-equipment-btn"
              style={{ minHeight: 44 }}
              onClick={() => update('equipment', [])}
            >
              수업 기구 조건 해제하고 전체에서 찾기
            </button>
          )}
          {exerciseBrowseScope === 'owned' && (
            <button
              type="button"
              className="ief-empty-owned-btn"
              style={{ minHeight: 44 }}
              onClick={() => setExerciseBrowseScope('all')}
            >
              보유 장비 조건만 해제
            </button>
          )}
          <button
            type="button"
            data-testid="ief-empty-reset-btn"
            style={{ minHeight: 44 }}
            onClick={reset}
          >
            검색·필터 초기화
          </button>
        </div>
      )}
      {results.length > visibleCount && (
        <button
          className="ief-more"
          type="button"
          onClick={() => {
            nextPageFocusRef.current = visibleCount;
            setPage({ signature, count: visibleCount + 6 });
          }}
        >
          동작 더 보기{' '}
          <span>
            {Math.min(visibleCount, results.length)} / {results.length}
          </span>
          <ChevronDown size={15} />
        </button>
      )}
      <p className="ief-image-note">
        3D 도해와 패턴 초안은 기구 세팅 참고용이며, 수행 전 강사가 직접 확인합니다.
      </p>
      <button className="ief-open-atlas" type="button" onClick={() => setActiveTab('atlas')}>
        동작 라이브러리 전체 보기 <ArrowUpRight size={17} />
      </button>
      <div className="ief-selection-bar">
        <span>
          수업안에 <strong>{selectedCount}개</strong> 선택
        </span>
        <button
          type="button"
          data-testid="ief-go-arrange-btn"
          disabled={Boolean(onArrangeSequence) && selectedCount === 0}
          onClick={() => {
            if (onArrangeSequence) onArrangeSequence();
            else setActiveTab('workbench');
          }}
        >
          <ArrowLeft size={15} aria-hidden="true" />{' '}
          {onArrangeSequence ? `순서·시간 다듬기 (${selectedCount})` : '수업안으로'}
        </button>
      </div>
    </aside>
  );
}
