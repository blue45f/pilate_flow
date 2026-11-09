import { useEffect, useMemo, useState } from 'react';
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

export const ATLAS_DISCOVERY_RECOVERY_KEY = 'pf_atlas_discovery_recovery_v1';

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

export function readRecoveredAtlasFilters(): AtlasDiscoveryFilters {
  if (typeof window === 'undefined') return { ...INITIAL_ATLAS_FILTERS };
  try {
    const raw = window.sessionStorage.getItem(ATLAS_DISCOVERY_RECOVERY_KEY);
    if (!raw) return { ...INITIAL_ATLAS_FILTERS };
    const parsed = JSON.parse(raw) as Partial<AtlasDiscoveryFilters> & {
      focus?: string;
      pattern?: string;
    };
    if (!parsed || typeof parsed !== 'object') return { ...INITIAL_ATLAS_FILTERS };
    return {
      search:
        typeof parsed.search === 'string'
          ? parsed.search
          : typeof parsed.focus === 'string'
            ? parsed.focus
            : INITIAL_ATLAS_FILTERS.search,
      equipment: Array.isArray(parsed.equipment)
        ? parsed.equipment.filter((item): item is string => typeof item === 'string')
        : INITIAL_ATLAS_FILTERS.equipment,
      block: typeof parsed.block === 'string' ? parsed.block : INITIAL_ATLAS_FILTERS.block,
      position: typeof parsed.position === 'string' ? parsed.position : INITIAL_ATLAS_FILTERS.position,
      level: typeof parsed.level === 'string' ? parsed.level : INITIAL_ATLAS_FILTERS.level,
      duration: typeof parsed.duration === 'string' ? parsed.duration : INITIAL_ATLAS_FILTERS.duration,
      favorite: typeof parsed.favorite === 'string' ? parsed.favorite : INITIAL_ATLAS_FILTERS.favorite,
      review: typeof parsed.review === 'string' ? parsed.review : INITIAL_ATLAS_FILTERS.review,
      motionDraft:
        typeof parsed.motionDraft === 'string'
          ? parsed.motionDraft
          : typeof parsed.pattern === 'string'
            ? parsed.pattern
            : INITIAL_ATLAS_FILTERS.motionDraft,
      props: Array.isArray(parsed.props)
        ? (parsed.props.filter((item): item is PropType => typeof item === 'string') as PropType[])
        : INITIAL_ATLAS_FILTERS.props,
      hideRecent:
        typeof parsed.hideRecent === 'boolean' ? parsed.hideRecent : INITIAL_ATLAS_FILTERS.hideRecent,
    };
  } catch {
    return { ...INITIAL_ATLAS_FILTERS };
  }
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
  const [filters, setFilters] = useState<AtlasDiscoveryFilters>(() => readRecoveredAtlasFilters());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!hasActiveDiscoveryState(filters)) {
        window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
      } else {
        window.sessionStorage.setItem(ATLAS_DISCOVERY_RECOVERY_KEY, JSON.stringify(filters));
      }
    } catch {
      // Ignore storage quota or security errors
    }
  }, [filters]);

  const recent = useMemo(
    () => getRecentlyTaughtExerciseIds(historyLogs as ClassHistoryLog[], 10, activeTargetGroupId),
    [historyLogs, activeTargetGroupId],
  );

  const update = <K extends keyof AtlasDiscoveryFilters>(
    key: K,
    value: AtlasDiscoveryFilters[K],
  ) => setFilters((previous) => ({ ...previous, [key]: value }));

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
  }, [filters]);

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
