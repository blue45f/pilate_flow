import { useCallback, useMemo } from 'react';
import { useWorkspaceBrowseState, workspaceBrowseStorageKey } from './useWorkspaceBrowseState';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  FAVORITE_TAG_META,
  POSITION_LABELS,
} from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import { matchesLibraryEquipment } from '../data/libraryEquipmentFilters';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import type {
  BodyPosition,
  ClassHistoryLog,
  DifficultyLevel,
  FavoriteTag,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { isMovementIdeaExercise, readMovementIdeaDraft } from '../utils/movementIdeaDraft';
import { getRecentlyTaughtExerciseIds } from '../utils/sequenceEngine';

/** Guest key retained for callers that inspect browsing recovery in this tab. */
export const ATLAS_DISCOVERY_RECOVERY_KEY = workspaceBrowseStorageKey('atlas', null);

export interface AtlasDiscoveryFilters {
  search: string;
  equipment: string[];
  block: string;
  position: string;
  level: string;
  duration: string;
  favorite: string;
  review: string;
  motionDraft: string;
  props: PropType[];
  hideRecent: boolean;
}

export const INITIAL_ATLAS_FILTERS: AtlasDiscoveryFilters = {
  search: '',
  equipment: [],
  block: 'all',
  position: 'all',
  level: 'all',
  duration: 'all',
  favorite: 'all',
  review: 'all',
  motionDraft: 'all',
  props: [],
  hideRecent: false,
};

const LEVEL_NAMES: Record<DifficultyLevel, string> = {
  '1.0': '기초',
  '1.5': '중급',
  '2.0': '심화',
};

const equipmentLabel = (id: string) =>
  EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo || id;
const propLabel = (id: PropType) => PROP_OPTIONS.find((item) => item.id === id)?.labelKo || id;
const toggleSelection = <T extends string>(items: T[], value: T): T[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export function hasActiveDiscoveryState(filters: AtlasDiscoveryFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    filters.equipment.length > 0 ||
    filters.props.length > 0 ||
    filters.block !== 'all' ||
    filters.position !== 'all' ||
    filters.level !== 'all' ||
    filters.duration !== 'all' ||
    filters.favorite !== 'all' ||
    filters.review !== 'all' ||
    filters.motionDraft !== 'all' ||
    filters.hideRecent
  );
}

export function parseAtlasFilters(
  value: unknown,
  defaults: AtlasDiscoveryFilters = INITIAL_ATLAS_FILTERS,
): AtlasDiscoveryFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const parsed = value as Record<string, unknown>;
  const choice = (raw: unknown, allowed: readonly string[], fallback: string) =>
    typeof raw === 'string' && allowed.includes(raw) ? raw : fallback;
  const selections = <T extends string>(raw: unknown, allowed: readonly T[]): T[] =>
    Array.isArray(raw)
      ? [
          ...new Set(
            raw.filter(
              (item): item is T => typeof item === 'string' && allowed.includes(item as T),
            ),
          ),
        ]
      : [];
  return {
    search: typeof parsed.search === 'string' ? parsed.search.slice(0, 1000) : defaults.search,
    equipment: selections(
      parsed.equipment,
      EQUIPMENT_OPTIONS.map((item) => item.id),
    ),
    block: choice(
      parsed.block,
      ['all', ...CANONICAL_BLOCKS.map((item) => item.category)],
      defaults.block,
    ),
    position: choice(parsed.position, ['all', ...Object.keys(POSITION_LABELS)], defaults.position),
    level: choice(parsed.level, ['all', ...Object.keys(LEVEL_NAMES)], defaults.level),
    duration: choice(parsed.duration, ['all', 'short', 'medium', 'long'], defaults.duration),
    favorite: choice(
      parsed.favorite,
      ['all', 'saved', ...Object.keys(FAVORITE_TAG_META)],
      defaults.favorite,
    ),
    review: choice(parsed.review, ['all', 'pending', 'approved', 'stale'], defaults.review),
    motionDraft: choice(parsed.motionDraft, ['all', 'proposal', 'none'], defaults.motionDraft),
    props: selections(
      parsed.props,
      PROP_OPTIONS.map((item) => item.id),
    ),
    hideRecent: typeof parsed.hideRecent === 'boolean' ? parsed.hideRecent : defaults.hideRecent,
  };
}

export interface UseAtlasFilterEngineParams {
  exercises: readonly PilatesExercise[];
  historyLogs: readonly ClassHistoryLog[];
  activeTargetGroupId: string;
  exerciseBrowseScope: 'all' | 'owned';
  ownedEquipment: readonly string[];
  ownedProps: readonly PropType[];
}

export function useAtlasFilterEngine({
  exercises,
  historyLogs,
  activeTargetGroupId,
  exerciseBrowseScope,
  ownedEquipment,
  ownedProps,
}: UseAtlasFilterEngineParams) {
  // The old ownerless key is deliberately not migrated: its author is unknown.
  const [filters, setFilters] = useWorkspaceBrowseState(
    'atlas',
    INITIAL_ATLAS_FILTERS,
    parseAtlasFilters,
    hasActiveDiscoveryState,
  );

  const recent = useMemo(
    () => getRecentlyTaughtExerciseIds(historyLogs as ClassHistoryLog[], 10, activeTargetGroupId),
    [historyLogs, activeTargetGroupId],
  );

  const update = useCallback(
    <K extends keyof AtlasDiscoveryFilters>(key: K, value: AtlasDiscoveryFilters[K]) =>
      setFilters((previous) => ({ ...previous, [key]: value })),
    [setFilters],
  );

  const filtered = useMemo(() => {
    return exercises.filter((exercise) => {
      const equipmentMeta = getExerciseEquipment(exercise);
      if (
        !matchesLibraryEquipment(equipmentMeta, {
          equipment: filters.equipment,
          props: filters.props,
          ownedOnly: exerciseBrowseScope === 'owned',
          ownedEquipment: [...ownedEquipment],
          ownedProps: [...ownedProps],
        })
      )
        return false;
      const patterns = getMotionPatternReferences(exercise.id);
      const hasProposal = patterns.length > 0;
      if (filters.motionDraft === 'proposal' && !hasProposal) return false;
      if (filters.motionDraft === 'none' && hasProposal) return false;
      if (filters.block !== 'all' && exercise.blockCategory !== filters.block) return false;
      if (filters.position !== 'all' && exercise.bodyPosition !== filters.position) return false;
      if (filters.level !== 'all' && exercise.level !== filters.level) return false;
      if (filters.review !== 'all' && getExerciseReviewState(exercise) !== filters.review)
        return false;
      if (filters.favorite === 'saved' && exercise.favoriteTag === 'none') return false;
      if (!['all', 'saved'].includes(filters.favorite) && exercise.favoriteTag !== filters.favorite)
        return false;
      if (filters.hideRecent && recent.has(exercise.id)) return false;
      if (filters.duration === 'short' && exercise.defaultDurationMin > 3) return false;
      if (
        filters.duration === 'medium' &&
        (exercise.defaultDurationMin <= 3 || exercise.defaultDurationMin > 5)
      )
        return false;
      if (filters.duration === 'long' && exercise.defaultDurationMin <= 5) return false;
      const blockMeta = CANONICAL_BLOCKS.find((item) => item.category === exercise.blockCategory);
      const ideaDraft = isMovementIdeaExercise(exercise) ? readMovementIdeaDraft(exercise) : null;
      const fields = [
        exercise.id,
        exercise.nameKo,
        exercise.nameEn,
        APPARATUS_LABELS[exercise.apparatus].ko,
        APPARATUS_LABELS[exercise.apparatus].short,
        POSITION_LABELS[exercise.bodyPosition].ko,
        LEVEL_NAMES[exercise.level],
        `Lv ${exercise.level}`,
        blockMeta?.nameKo ?? '',
        blockMeta?.nameEn ?? '',
        exercise.favoriteTag !== 'none' ? FAVORITE_TAG_META[exercise.favoriteTag].label : '',
        ...equipmentMeta.requiredEquipment.map(equipmentLabel),
        ...equipmentMeta.requiredProps.map(propLabel),
        ...exercise.targetMuscles,
        ...exercise.cues,
        exercise.precautions ?? '',
        ideaDraft?.ideaLine ?? '',
        ideaDraft?.subjectiveFeeling ?? '',
        ideaDraft?.adjustmentNote ?? '',
        exercise.youtube.channelName,
        exercise.sourceReference?.title ?? '',
        exercise.sourceReference?.publisher ?? '',
        ...patterns.flatMap((pattern) => [pattern.title, pattern.variant, pattern.context]),
      ];
      return matchesDiscoverySearch(fields, filters.search);
    });
  }, [exercises, filters, exerciseBrowseScope, ownedEquipment, ownedProps, recent]);

  const activeFilterCount = Object.entries(filters).reduce(
    (total, [key, value]) =>
      total +
      (key === 'search'
        ? 0
        : Array.isArray(value)
          ? value.length
          : value !== 'all' && value !== false
            ? 1
            : 0),
    0,
  );

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `검색: ${filters.search.trim()}`,
        onClear: () => update('search', ''),
      });
    }
    filters.equipment.forEach((eqId) => {
      chips.push({
        key: `eq-${eqId}`,
        label: `기구: ${equipmentLabel(eqId)}`,
        onClear: () => update('equipment', toggleSelection(filters.equipment, eqId)),
      });
    });
    filters.props.forEach((propId) => {
      chips.push({
        key: `prop-${propId}`,
        label: `소도구: ${propLabel(propId)}`,
        onClear: () => update('props', toggleSelection(filters.props, propId)),
      });
    });
    if (filters.block !== 'all') {
      const blockName =
        CANONICAL_BLOCKS.find((item) => item.category === filters.block)?.nameKo ?? filters.block;
      chips.push({
        key: 'block',
        label: `구간: ${blockName}`,
        onClear: () => update('block', 'all'),
      });
    }
    if (filters.position !== 'all') {
      chips.push({
        key: 'position',
        label: `자세: ${POSITION_LABELS[filters.position as BodyPosition].ko}`,
        onClear: () => update('position', 'all'),
      });
    }
    if (filters.level !== 'all') {
      chips.push({
        key: 'level',
        label: `난이도: ${LEVEL_NAMES[filters.level as DifficultyLevel]}`,
        onClear: () => update('level', 'all'),
      });
    }
    if (filters.duration !== 'all') {
      const durationLabel =
        filters.duration === 'short'
          ? '3분 이하'
          : filters.duration === 'medium'
            ? '3~5분'
            : '5분 초과';
      chips.push({
        key: 'duration',
        label: `시간: ${durationLabel}`,
        onClear: () => update('duration', 'all'),
      });
    }
    if (filters.review !== 'all') {
      const reviewLabel =
        filters.review === 'approved'
          ? '검토 완료'
          : filters.review === 'pending'
            ? '검토 전'
            : '재검토 필요';
      chips.push({
        key: 'review',
        label: `검토: ${reviewLabel}`,
        onClear: () => update('review', 'all'),
      });
    }
    if (filters.motionDraft !== 'all') {
      chips.push({
        key: 'motionDraft',
        label: filters.motionDraft === 'proposal' ? '도해 초안 있음' : '도해 초안 없음',
        onClear: () => update('motionDraft', 'all'),
      });
    }
    if (filters.favorite !== 'all') {
      const favLabel =
        filters.favorite === 'saved'
          ? '저장됨'
          : (FAVORITE_TAG_META[filters.favorite as FavoriteTag]?.label ?? filters.favorite);
      chips.push({
        key: 'favorite',
        label: `즐겨찾기: ${favLabel}`,
        onClear: () => update('favorite', 'all'),
      });
    }
    if (filters.hideRecent) {
      chips.push({
        key: 'hideRecent',
        label: '최근 10일 제외',
        onClear: () => update('hideRecent', false),
      });
    }
    return chips;
  }, [filters, update]);

  return {
    filters,
    setFilters,
    update,
    recent,
    filtered,
    activeFilterCount,
    activeFilterChips,
  };
}
