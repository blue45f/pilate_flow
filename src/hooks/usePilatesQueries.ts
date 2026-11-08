import { getExerciseEquipment } from '../data/equipmentCatalog';
import { matchesLibraryEquipment } from '../data/libraryEquipmentFilters';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  FavoriteTag,
  PropType,
} from '../types/pilates';
import {
  analyzeSequence,
  getExerciseLastTaughtInfo,
  getRecentlyTaughtExerciseIds,
  proposeBlockAlternatives,
} from '../utils/sequenceEngine';

export interface AtlasFilterState {
  searchQuery: string;
  apparatus: ApparatusType | 'all';
  blockCategory: ClassBlockCategory | 'all';
  prop: PropType | 'all';
  level: DifficultyLevel | 'all';
  favoriteTag: FavoriteTag | 'all';
  region: 'all' | 'kr' | 'global';
  durationFilter: 'all' | 'short-1-3' | 'medium-4-5' | 'long-6-plus';
  onlyOwnedEquipment: boolean;
  hideRecentlyTaught: boolean;
}

export function useSequenceAnalyticsQuery() {
  const activeSteps = usePilatesStore((s) => s.activeSteps);
  const exercises = usePilatesStore((s) => s.exercises);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const activeTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);
  const activeTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);

  const exercisesMap = useMemo(() => new Map(exercises.map((ex) => [ex.id, ex])), [exercises]);

  return useQuery({
    queryKey: [
      'sequence-analytics',
      activeSteps,
      exercises.length,
      historyLogs.length,
      activeTargetGroupId,
      activeTargetMinutes,
    ],
    queryFn: () =>
      analyzeSequence(
        activeSteps,
        exercisesMap,
        historyLogs,
        activeTargetGroupId,
        activeTargetMinutes,
      ),
    staleTime: 0,
    initialData: () =>
      analyzeSequence(
        activeSteps,
        exercisesMap,
        historyLogs,
        activeTargetGroupId,
        activeTargetMinutes,
      ),
  });
}

export function useFilteredAtlasQuery(filters: AtlasFilterState) {
  const exercises = usePilatesStore((s) => s.exercises);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const activeTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);
  const ownedEquipment = usePilatesStore((s) => s.ownedEquipment);
  const ownedProps = usePilatesStore((s) => s.ownedProps);

  return useQuery({
    queryKey: [
      'filtered-atlas',
      filters,
      exercises,
      historyLogs,
      activeTargetGroupId,
      ownedEquipment,
      ownedProps,
    ],
    queryFn: () => {
      const recentSet = getRecentlyTaughtExerciseIds(historyLogs, 10, activeTargetGroupId);
      const q = filters.searchQuery.trim().toLowerCase();

      return exercises
        .filter((ex) => {
          if (
            !matchesLibraryEquipment(getExerciseEquipment(ex), {
              equipment: [],
              props: [],
              ownedOnly: filters.onlyOwnedEquipment,
              ownedEquipment,
              ownedProps,
            })
          ) {
            return false;
          }
          if (filters.apparatus !== 'all' && ex.apparatus !== filters.apparatus) {
            return false;
          }
          if (filters.region !== 'all') {
            const exRegion =
              ex.youtube.region ?? (/[가-힣]/.test(ex.youtube.channelName) ? 'kr' : 'global');
            if (exRegion !== filters.region) return false;
          }
          if (filters.durationFilter !== 'all') {
            if (filters.durationFilter === 'short-1-3' && ex.defaultDurationMin > 3) {
              return false;
            }
            if (
              filters.durationFilter === 'medium-4-5' &&
              (ex.defaultDurationMin < 4 || ex.defaultDurationMin > 5)
            ) {
              return false;
            }
            if (filters.durationFilter === 'long-6-plus' && ex.defaultDurationMin < 6) {
              return false;
            }
          }
          if (filters.blockCategory !== 'all' && ex.blockCategory !== filters.blockCategory) {
            return false;
          }
          if (filters.prop !== 'all' && !ex.props.includes(filters.prop)) {
            return false;
          }
          if (filters.level !== 'all' && ex.level !== filters.level) {
            return false;
          }
          if (filters.favoriteTag !== 'all' && ex.favoriteTag !== filters.favoriteTag) {
            return false;
          }
          if (filters.hideRecentlyTaught && recentSet.has(ex.id)) {
            return false;
          }
          if (q) {
            const haystack = [
              ex.nameKo,
              ex.nameEn,
              ex.youtube.channelName,
              ex.youtube.videoTitle,
              ...ex.targetMuscles,
              ...ex.cues,
            ]
              .join(' ')
              .toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        })
        .map((ex) => ({
          exercise: ex,
          isRecentlyTaught: recentSet.has(ex.id),
          usageInfo: getExerciseLastTaughtInfo(ex.id, historyLogs, activeTargetGroupId),
        }));
    },
    staleTime: 0,
  });
}

export function useBlockProposals(blockCategory: ClassBlockCategory, stepIndex: number) {
  const activeSteps = usePilatesStore((s) => s.activeSteps);
  const exercises = usePilatesStore((s) => s.exercises);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const activeTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);

  return useMemo(
    () =>
      proposeBlockAlternatives(
        blockCategory,
        stepIndex,
        activeSteps,
        exercises,
        historyLogs,
        activeTargetGroupId,
      ),
    [blockCategory, stepIndex, activeSteps, exercises, historyLogs, activeTargetGroupId],
  );
}
