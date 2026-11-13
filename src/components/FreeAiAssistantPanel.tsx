import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyUserEditsToClassDraft,
  applyUserEditsToMovementIdea,
  applyUserEditsToSequenceCompose,
  editableStepsToSequenceSteps,
  inspectSensitiveHealthText,
  movementIdeaToUnreviewedExercise,
  UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
} from '../utils/freeAiAssistantEngine';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  createDefaultFreeAiStatus,
  defaultFreeAiClient,
  FreeAiClientError,
} from '../lib/freeAiClient';
import type { FreeAiClient } from '../lib/freeAiClient';
import type {
  ClassDraftConditionsInput,
  EditableClassDraftResult,
  EditableDraftStepItem,
  EditableMovementIdeaResult,
  EditableMovementSearchResult,
  EditableSequenceComposeResult,
  FreeAiQuotaStatus,
  FreeAiStudioContextContract,
  FreeAiTaskKind,
  MovementIdeaInput,
  MovementSearchAssistInput,
  StrengthenArea,
} from '../types/freeAiAssistant';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
} from '../types/pilates';
import { PfAiStatusBadge } from '../design-system';
import { SpringVisualPills } from './SpringVisualPills';
import { VisualSequenceFilmstrip } from './VisualFlowComponents';
import '../styles/free-ai-assistant.css';
import './FreeAiAssistantPanel.css';

export const FREE_AI_DRAFT_STORAGE_KEY = 'pf_free_ai_draft_v1';

interface FreeAiDraftSnapshot {
  activeTab: FreeAiTaskKind;
  draftMinutes: number;
  draftTheme: string;
  draftAreas: StrengthenArea[];
  draftLevel: DifficultyLevel;
  draftApparatus: ApparatusType | 'mixed';
  selectedTemplateId: string;
  newPresetName: string;
  rawIdeaText: string;
  baseExerciseName: string;
  ideaApparatus: ApparatusType;
  ideaCategory: ClassBlockCategory;
  ideaArea: StrengthenArea;
  ideaLevel: DifficultyLevel;
  composeMinutes: number;
  composeLevel: DifficultyLevel;
  composeApparatus: ApparatusType | 'mixed';
  composeTheme: string;
  composeAreas: StrengthenArea[];
  searchQuery: string;
  searchApparatus: ApparatusType | 'mixed';
  searchLevel: DifficultyLevel;
  searchArea: StrengthenArea;
}

function readFreeAiDraft(): Partial<FreeAiDraftSnapshot> | null {
  try {
    const raw = sessionStorage.getItem(FREE_AI_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FreeAiDraftSnapshot>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface FreeAiAssistantPanelProps extends FreeAiStudioContextContract {
  client?: FreeAiClient;
  initialTab?: FreeAiTaskKind;
  onFillStarterSequence?: () => void;
  onOpenExerciseFinder?: () => void;
}

const STRENGTHEN_AREA_OPTIONS: ReadonlyArray<{ value: StrengthenArea; label: string }> = [
  { value: 'core', label: '코어·복부' },
  { value: 'glute-lower', label: '둔근·하체' },
  { value: 'posture-upper', label: '상체·자세 정렬' },
  { value: 'mobility-rehab', label: '가동성·유연성' },
  { value: 'full-body', label: '전신 균형' },
];

const APPARATUS_OPTIONS: ReadonlyArray<{ value: ApparatusType | 'mixed'; label: string }> = [
  { value: 'reformer', label: '리포머 (Reformer)' },
  { value: 'cadillac', label: '캐딜락 (Cadillac)' },
  { value: 'chair', label: '체어 (Chair)' },
  { value: 'barrel', label: '바렐 (Barrel)' },
  { value: 'mat', label: '매트 (Mat)' },
  { value: 'mixed', label: '혼합 기구 (Mixed)' },
];

const SINGLE_APPARATUS_OPTIONS: ReadonlyArray<{ value: ApparatusType; label: string }> = [
  { value: 'reformer', label: '리포머 (Reformer)' },
  { value: 'cadillac', label: '캐딜락 (Cadillac)' },
  { value: 'chair', label: '체어 (Chair)' },
  { value: 'barrel', label: '바렐 (Barrel)' },
  { value: 'mat', label: '매트 (Mat)' },
];

const BLOCK_CATEGORY_OPTIONS: ReadonlyArray<{ value: ClassBlockCategory; label: string }> = [
  { value: 'warmup', label: '워밍업 (Warm-up)' },
  { value: 'footwork', label: '풋워크 (Footwork)' },
  { value: 'bridging', label: '브릿징 (Bridging)' },
  { value: 'core', label: '코어 (Core)' },
  { value: 'upper-body', label: '상체 (Upper Body)' },
  { value: 'lower-body', label: '하체 (Lower Body)' },
  { value: 'plank', label: '플랭크 (Plank)' },
  { value: 'extension', label: '신전 (Extension)' },
  { value: 'feet-in-straps', label: '핏 인 스트랩 (Feet in Straps)' },
  { value: 'cooldown', label: '쿨다운 (Cool-down)' },
];

const LEVEL_OPTIONS: ReadonlyArray<{ value: DifficultyLevel; label: string }> = [
  { value: '1.0', label: 'Lv.1.0 초급' },
  { value: '1.5', label: 'Lv.1.5 중급' },
  { value: '2.0', label: 'Lv.2.0 상급' },
];

function areaToFocusPreset(area: StrengthenArea): AutoGenerateCriteria['focusPreset'] {
  switch (area) {
    case 'core':
      return 'core-sculpt';
    case 'glute-lower':
      return 'glute-lower';
    case 'posture-upper':
      return 'posture-upper';
    case 'mobility-rehab':
      return 'mobility-rehab';
    case 'full-body':
      return 'full-body';
  }
}

export function FreeAiAssistantPanel({
  exercises,
  reusableBlocks = [],
  conditionTemplates,
  activeTargetMinutes = 50,
  activeApparatus = 'reformer',
  activeLevel = '1.5',
  onApplyDraftSequence,
  onSaveUnreviewedMovementIdea,
  onAddExerciseToSequence,
  onApplyConditionTemplate,
  onSaveConditionTemplate,
  uiContract,
  client = defaultFreeAiClient,
  initialTab,
  onFillStarterSequence,
  onOpenExerciseFinder,
}: FreeAiAssistantPanelProps) {
  const [savedDraft] = useState<Partial<FreeAiDraftSnapshot> | null>(() => readFreeAiDraft());
  const [activeTab, setActiveTab] = useState<FreeAiTaskKind>(() => {
    if (initialTab) return initialTab;
    const savedTab = savedDraft?.activeTab;
    if (
      savedTab === 'class-draft' ||
      savedTab === 'movement-idea' ||
      savedTab === 'sequence-compose' ||
      savedTab === 'exercise-search'
    ) {
      return savedTab;
    }
    return 'class-draft';
  });
  const [quotaStatus, setQuotaStatus] = useState<FreeAiQuotaStatus>(
    () => client.getQuotaStatus() ?? createDefaultFreeAiStatus(),
  );
  const [aiModePreference, setAiModePreference] = useState<'local-only' | 'server-free-assist'>(
    () => {
      try {
        const stored = localStorage.getItem('pf_free_ai_mode_pref_v1');
        if (stored === 'local-only' || stored === 'server-free-assist') return stored;
      } catch {
        // Ignore storage read failure
      }
      return 'server-free-assist';
    },
  );
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState<boolean>(true);
  const updateAiModePreference = (nextMode: 'local-only' | 'server-free-assist') => {
    setAiModePreference(nextMode);
    try {
      localStorage.setItem('pf_free_ai_mode_pref_v1', nextMode);
    } catch {
      // Ignore storage write failure
    }
  };
  const handleRecheckQuotaStatus = async () => {
    setErrorBanner(null);
    try {
      const maybeRefresh = (
        client as FreeAiClient & { refreshQuotaStatus?: () => Promise<FreeAiQuotaStatus> }
      ).refreshQuotaStatus;
      const nextStatus =
        typeof maybeRefresh === 'function'
          ? await maybeRefresh.call(client)
          : (client.getQuotaStatus() ?? createDefaultFreeAiStatus());
      setQuotaStatus(nextStatus);
      setActionFeedback(
        nextStatus.enabled && !nextStatus.exhausted
          ? `서버 무료 조건 연결 상태를 확인했습니다 (분당 ${nextStatus.minuteRemaining}/${nextStatus.minuteLimit}회 남음).`
          : '현재 서버 외부 AI가 비활성화되었거나 한도에 도달해 기기 내 규칙 모드로 안전하게 동작합니다.',
      );
    } catch {
      const fallback = client.getQuotaStatus() ?? createDefaultFreeAiStatus();
      setQuotaStatus(fallback);
      setActionFeedback('연결 확인 중 응답이 없어 기기 내 규칙 모드를 유지합니다.');
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const tabRevision = useRef(0);
  const requestSeqRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const [appliedToPlan, setAppliedToPlan] = useState(false);

  // Tab 1: Class Draft state
  const [draftMinutes, setDraftMinutes] = useState<number>(() =>
    typeof savedDraft?.draftMinutes === 'number' && savedDraft.draftMinutes >= 10
      ? savedDraft.draftMinutes
      : activeTargetMinutes || 50,
  );
  const [draftTheme, setDraftTheme] = useState<string>(() =>
    typeof savedDraft?.draftTheme === 'string'
      ? savedDraft.draftTheme
      : '호흡·골반 정렬 중심 리포머 플로우',
  );
  const [draftAreas, setDraftAreas] = useState<StrengthenArea[]>(() =>
    Array.isArray(savedDraft?.draftAreas) && savedDraft.draftAreas.length > 0
      ? savedDraft.draftAreas
      : ['core'],
  );
  const [draftLevel, setDraftLevel] = useState<DifficultyLevel>(() =>
    savedDraft?.draftLevel === '1.0' ||
    savedDraft?.draftLevel === '1.5' ||
    savedDraft?.draftLevel === '2.0'
      ? savedDraft.draftLevel
      : activeLevel || '1.5',
  );
  const [draftApparatus, setDraftApparatus] = useState<ApparatusType | 'mixed'>(() =>
    typeof savedDraft?.draftApparatus === 'string'
      ? savedDraft.draftApparatus
      : activeApparatus || 'reformer',
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() =>
    typeof savedDraft?.selectedTemplateId === 'string' ? savedDraft.selectedTemplateId : '',
  );
  const [newPresetName, setNewPresetName] = useState<string>(() =>
    typeof savedDraft?.newPresetName === 'string' ? savedDraft.newPresetName : '',
  );
  const [classDraftResult, setClassDraftResult] = useState<EditableClassDraftResult | null>(null);
  const [excludedStepIds, setExcludedStepIds] = useState<Set<string>>(() => new Set());
  const toggleStepIncluded = (stepId: string) => {
    setExcludedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  // Tab 2: Movement Idea state
  const [rawIdeaText, setRawIdeaText] = useState<string>(() =>
    typeof savedDraft?.rawIdeaText === 'string' ? savedDraft.rawIdeaText : '',
  );
  const [baseExerciseName, setBaseExerciseName] = useState<string>(() =>
    typeof savedDraft?.baseExerciseName === 'string' ? savedDraft.baseExerciseName : '',
  );
  const [ideaApparatus, setIdeaApparatus] = useState<ApparatusType>(() =>
    typeof savedDraft?.ideaApparatus === 'string'
      ? savedDraft.ideaApparatus
      : activeApparatus === 'mixed'
        ? 'reformer'
        : activeApparatus,
  );
  const [ideaCategory, setIdeaCategory] = useState<ClassBlockCategory>(() =>
    typeof savedDraft?.ideaCategory === 'string' ? savedDraft.ideaCategory : 'core',
  );
  const [ideaArea, setIdeaArea] = useState<StrengthenArea>(() =>
    typeof savedDraft?.ideaArea === 'string' ? savedDraft.ideaArea : 'core',
  );
  const [ideaLevel, setIdeaLevel] = useState<DifficultyLevel>(() =>
    savedDraft?.ideaLevel === '1.0' ||
    savedDraft?.ideaLevel === '1.5' ||
    savedDraft?.ideaLevel === '2.0'
      ? savedDraft.ideaLevel
      : activeLevel || '1.5',
  );
  const [movementIdeaResult, setMovementIdeaResult] = useState<EditableMovementIdeaResult | null>(
    null,
  );

  // Tab 3: Sequence Compose from Reviewed items state
  const reviewedExercises = useMemo(
    () => exercises.filter((ex) => isExerciseAutoEligible(ex)),
    [exercises],
  );
  const unreviewedExerciseCount = exercises.length - reviewedExercises.length;
  const reviewedBlocks = useMemo(
    () => reusableBlocks.filter((block) => block.isReviewed === true),
    [reusableBlocks],
  );
  const unreviewedBlockCount = reusableBlocks.length - reviewedBlocks.length;

  const [composeMinutes, setComposeMinutes] = useState<number>(() =>
    typeof savedDraft?.composeMinutes === 'number' && savedDraft.composeMinutes >= 10
      ? savedDraft.composeMinutes
      : activeTargetMinutes || 50,
  );
  const [composeLevel, setComposeLevel] = useState<DifficultyLevel>(() =>
    savedDraft?.composeLevel === '1.0' ||
    savedDraft?.composeLevel === '1.5' ||
    savedDraft?.composeLevel === '2.0'
      ? savedDraft.composeLevel
      : activeLevel || '1.5',
  );
  const [composeApparatus, setComposeApparatus] = useState<ApparatusType | 'mixed'>(() =>
    typeof savedDraft?.composeApparatus === 'string'
      ? savedDraft.composeApparatus
      : activeApparatus || 'reformer',
  );
  const [composeTheme, setComposeTheme] = useState<string>(() =>
    typeof savedDraft?.composeTheme === 'string'
      ? savedDraft.composeTheme
      : '검토 완료 동작·블록 시퀀스',
  );
  const [composeAreas, setComposeAreas] = useState<StrengthenArea[]>(() =>
    Array.isArray(savedDraft?.composeAreas) && savedDraft.composeAreas.length > 0
      ? savedDraft.composeAreas
      : ['core', 'glute-lower'],
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(() =>
    reviewedExercises.slice(0, 4).map((ex) => ex.id),
  );
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>(() =>
    reviewedBlocks.slice(0, 2).map((b) => b.id),
  );
  const [composeResult, setComposeResult] = useState<EditableSequenceComposeResult | null>(null);

  // Tab 4: Movement Search Assist state
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    typeof savedDraft?.searchQuery === 'string'
      ? savedDraft.searchQuery
      : '어깨 과긴장 없이 코어와 골반 중립을 깨우는 동작',
  );
  const [searchApparatus, setSearchApparatus] = useState<ApparatusType | 'mixed'>(() =>
    typeof savedDraft?.searchApparatus === 'string'
      ? savedDraft.searchApparatus
      : activeApparatus || 'reformer',
  );
  const [searchLevel, setSearchLevel] = useState<DifficultyLevel>(() =>
    savedDraft?.searchLevel === '1.0' ||
    savedDraft?.searchLevel === '1.5' ||
    savedDraft?.searchLevel === '2.0'
      ? savedDraft.searchLevel
      : activeLevel || '1.5',
  );
  const [searchArea, setSearchArea] = useState<StrengthenArea>(() =>
    typeof savedDraft?.searchArea === 'string' ? savedDraft.searchArea : 'core',
  );
  const [searchResult, setSearchResult] = useState<EditableMovementSearchResult | null>(null);

  useEffect(() => {
    const snapshot: FreeAiDraftSnapshot = {
      activeTab,
      draftMinutes,
      draftTheme,
      draftAreas,
      draftLevel,
      draftApparatus,
      selectedTemplateId,
      newPresetName,
      rawIdeaText,
      baseExerciseName,
      ideaApparatus,
      ideaCategory,
      ideaArea,
      ideaLevel,
      composeMinutes,
      composeLevel,
      composeApparatus,
      composeTheme,
      composeAreas,
      searchQuery,
      searchApparatus,
      searchLevel,
      searchArea,
    };
    try {
      sessionStorage.setItem(FREE_AI_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage errors
    }
  }, [
    activeTab,
    draftMinutes,
    draftTheme,
    draftAreas,
    draftLevel,
    draftApparatus,
    selectedTemplateId,
    newPresetName,
    rawIdeaText,
    baseExerciseName,
    ideaApparatus,
    ideaCategory,
    ideaArea,
    ideaLevel,
    composeMinutes,
    composeLevel,
    composeApparatus,
    composeTheme,
    composeAreas,
    searchQuery,
    searchApparatus,
    searchLevel,
    searchArea,
  ]);

  useEffect(() => {
    let active = true;
    client
      .refreshQuotaStatus()
      .then((nextStatus) => {
        if (active) setQuotaStatus(nextStatus);
      })
      .catch(() => {
        if (active) setQuotaStatus(client.getQuotaStatus());
      });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(
    () => () => {
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
    },
    [],
  );

  const cancelActiveRequest = (showFeedback = false) => {
    tabRevision.current += 1;
    requestSeqRef.current += 1;
    activeAbortRef.current?.abort();
    activeAbortRef.current = null;
    setIsLoading(false);
    setQuotaStatus(client.getQuotaStatus());
    if (showFeedback) {
      setActionFeedback('진행 중인 요청을 취소했습니다. 조건을 조정한 뒤 바로 다시 시도할 수 있어요.');
    }
  };

  const draftHealthInspection = useMemo(() => inspectSensitiveHealthText(draftTheme), [draftTheme]);
  const ideaHealthInspection = useMemo(
    () => inspectSensitiveHealthText(`${rawIdeaText} ${baseExerciseName}`),
    [rawIdeaText, baseExerciseName],
  );
  const composeHealthInspection = useMemo(
    () => inspectSensitiveHealthText(composeTheme),
    [composeTheme],
  );
  const searchHealthInspection = useMemo(
    () => inspectSensitiveHealthText(searchQuery),
    [searchQuery],
  );

  const toggleArea = (
    current: StrengthenArea[],
    setter: (next: StrengthenArea[]) => void,
    area: StrengthenArea,
  ) => {
    if (current.includes(area)) {
      if (current.length > 1) {
        setter(current.filter((item) => item !== area));
      }
      return;
    }
    setter([...current, area]);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const matched = conditionTemplates.find((item) => item.id === templateId);
    if (!matched) return;
    setDraftMinutes(matched.criteria.targetMinutes);
    setDraftLevel(matched.criteria.level);
    setDraftApparatus(matched.criteria.apparatus);
    setDraftTheme(matched.name);
    onApplyConditionTemplate?.(templateId);
    setActionFeedback(`저장 프리셋 '${matched.name}' 조건을 불러왔습니다.`);
  };

  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      setErrorBanner('저장할 프리셋 이름을 입력해 주세요.');
      return;
    }
    const criteria: AutoGenerateCriteria = {
      apparatus: draftApparatus,
      level: draftLevel,
      focusPreset: areaToFocusPreset(draftAreas[0] ?? 'full-body'),
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: draftMinutes,
      defaultLayer: draftLevel === '1.0' ? 'easy' : draftLevel === '2.0' ? 'hard' : 'standard',
    };
    onSaveConditionTemplate?.(trimmed, criteria);
    setNewPresetName('');
    setErrorBanner(null);
    setActionFeedback(`'${trimmed}' 프리셋을 저장했습니다.`);
  };

  const beginTrackedRequest = () => {
    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    const reqSeq = ++requestSeqRef.current;
    const requestTabRevision = tabRevision.current;
    return { controller, reqSeq, requestTabRevision };
  };

  const runClassDraft = async (preferLocalOnly: boolean) => {
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (!preferLocalOnly && draftHealthInspection.hasSensitiveData) {
      setErrorBanner(draftHealthInspection.warningMessageKo);
      return;
    }
    const { controller, reqSeq, requestTabRevision } = beginTrackedRequest();
    setIsLoading(true);
    try {
      const input: ClassDraftConditionsInput = {
        durationMinutes: draftMinutes,
        theme: draftTheme,
        strengthenAreas: draftAreas,
        level: draftLevel,
        apparatus: draftApparatus,
        templateId: selectedTemplateId || undefined,
      };
      const response = await client.requestClassDraft(input, exercises, conditionTemplates, {
        preferLocalOnly,
        signal: controller.signal,
      });
      setQuotaStatus(response.status);
      if (reqSeq !== requestSeqRef.current || requestTabRevision !== tabRevision.current) return;
      setClassDraftResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '조건에 맞춰 수업 초안을 만들었어요. 순서와 시간을 자유롭게 다듬어 보세요.'
          : response.result.cached
            ? '이전에 만든 수업 초안을 바로 불러왔어요 (사용량 차감 없음).'
            : response.result.provider === 'openai'
              ? '서버 보조로 수업 초안을 만들었어요. 순서와 시간을 자유롭게 다듬어 보세요.'
              : '조건에 맞춰 편집 가능한 수업 초안을 만들었어요.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (
        controller.signal.aborted ||
        (error instanceof FreeAiClientError && error.code === 'request_cancelled') ||
        reqSeq !== requestSeqRef.current ||
        requestTabRevision !== tabRevision.current
      ) {
        return;
      }
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '수업 초안을 만들지 못했습니다. 조건 추천을 이용해 주세요.',
        );
      }
    } finally {
      if (reqSeq === requestSeqRef.current) {
        activeAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const runMovementIdea = async (preferLocalOnly: boolean) => {
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (rawIdeaText.trim().length < 2) {
      setErrorBanner('새 동작 아이디어를 2자 이상 입력해 주세요.');
      return;
    }
    if (!preferLocalOnly && ideaHealthInspection.hasSensitiveData) {
      setErrorBanner(ideaHealthInspection.warningMessageKo);
      return;
    }
    const { controller, reqSeq, requestTabRevision } = beginTrackedRequest();
    setIsLoading(true);
    try {
      const input: MovementIdeaInput = {
        rawIdeaText,
        baseExerciseName: baseExerciseName.trim() || undefined,
        apparatus: ideaApparatus,
        blockCategory: ideaCategory,
        strengthenArea: ideaArea,
        level: ideaLevel,
      };
      const response = await client.requestMovementIdea(input, {
        preferLocalOnly,
        signal: controller.signal,
      });
      setQuotaStatus(response.status);
      if (reqSeq !== requestSeqRef.current || requestTabRevision !== tabRevision.current) return;
      setMovementIdeaResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '동작 아이디어와 3단계 변형을 정리했습니다.'
          : response.result.cached
            ? '이전에 정리한 동작 아이디어·변형 초안을 불러왔습니다.'
            : '새 동작 아이디어와 3단계 변형을 정리했습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (
        controller.signal.aborted ||
        (error instanceof FreeAiClientError && error.code === 'request_cancelled') ||
        reqSeq !== requestSeqRef.current ||
        requestTabRevision !== tabRevision.current
      ) {
        return;
      }
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '동작 아이디어를 정리하지 못했습니다.',
        );
      }
    } finally {
      if (reqSeq === requestSeqRef.current) {
        activeAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const runSequenceCompose = async (preferLocalOnly: boolean) => {
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (!preferLocalOnly && composeHealthInspection.hasSensitiveData) {
      setErrorBanner(composeHealthInspection.warningMessageKo);
      return;
    }
    const { controller, reqSeq, requestTabRevision } = beginTrackedRequest();
    setIsLoading(true);
    try {
      const response = await client.requestSequenceCompose(
        {
          targetMinutes: composeMinutes,
          level: composeLevel,
          apparatus: composeApparatus,
          theme: composeTheme,
          strengthenAreas: composeAreas,
          selectedExerciseIds,
          selectedBlockIds,
        },
        exercises,
        reusableBlocks,
        { preferLocalOnly, signal: controller.signal },
      );
      setQuotaStatus(response.status);
      if (reqSeq !== requestSeqRef.current || requestTabRevision !== tabRevision.current) return;
      setComposeResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '검토 완료 동작·블록으로 시퀀스를 구성했습니다.'
          : response.result.cached
            ? '이전에 구성한 시퀀스 초안을 다시 불러왔습니다.'
            : '검토 완료 동작·블록으로 시퀀스를 구성했습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (
        controller.signal.aborted ||
        (error instanceof FreeAiClientError && error.code === 'request_cancelled') ||
        reqSeq !== requestSeqRef.current ||
        requestTabRevision !== tabRevision.current
      ) {
        return;
      }
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '시퀀스를 구성하지 못했습니다.',
        );
      }
    } finally {
      if (reqSeq === requestSeqRef.current) {
        activeAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const runMovementSearch = async (preferLocalOnly: boolean) => {
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (searchQuery.trim().length < 2) {
      setErrorBanner('찾고 싶은 동작 조건을 2자 이상 입력해 주세요.');
      return;
    }
    if (!preferLocalOnly && searchHealthInspection.hasSensitiveData) {
      setErrorBanner(searchHealthInspection.warningMessageKo);
      return;
    }
    const { controller, reqSeq, requestTabRevision } = beginTrackedRequest();
    setIsLoading(true);
    try {
      const input: MovementSearchAssistInput = {
        queryText: searchQuery,
        apparatus: searchApparatus,
        level: searchLevel,
        strengthenArea: searchArea,
        maxResults: 6,
      };
      const response = await client.requestMovementSearch(input, exercises, {
        preferLocalOnly,
        signal: controller.signal,
      });
      setQuotaStatus(response.status);
      if (reqSeq !== requestSeqRef.current || requestTabRevision !== tabRevision.current) return;
      setSearchResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '입력한 조건에 맞는 동작 후보를 추렸습니다.'
          : response.result.provider === 'openai'
            ? 'OpenAI 서버 보조로 조건에 맞는 동작과 큐잉 포인트를 추렸습니다.'
            : '조건에 맞는 동작과 큐잉 포인트를 추렸습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (
        controller.signal.aborted ||
        (error instanceof FreeAiClientError && error.code === 'request_cancelled') ||
        reqSeq !== requestSeqRef.current ||
        requestTabRevision !== tabRevision.current
      ) {
        return;
      }
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '동작 탐색 추천을 불러오지 못했습니다.',
        );
      }
    } finally {
      if (reqSeq === requestSeqRef.current) {
        activeAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const updateStepInClassDraft = (
    stepId: string,
    patch: { durationMin?: number; selectedLayer?: LayerMode; instructorNote?: string },
  ) => {
    if (!classDraftResult) return;
    setClassDraftResult(
      applyUserEditsToClassDraft(classDraftResult, {
        stepUpdates: [{ stepId, ...patch }],
      }),
    );
  };

  const moveStepInClassDraft = (index: number, direction: 'up' | 'down') => {
    if (!classDraftResult) return;
    const ids = classDraftResult.steps.map((s) => s.stepId);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    const swapped = [...ids];
    [swapped[index], swapped[targetIdx]] = [swapped[targetIdx], swapped[index]];
    setClassDraftResult(applyUserEditsToClassDraft(classDraftResult, { reorderStepIds: swapped }));
  };

  const removeStepInClassDraft = (stepId: string) => {
    if (!classDraftResult) return;
    setClassDraftResult(applyUserEditsToClassDraft(classDraftResult, { removeStepIds: [stepId] }));
  };

  const updateStepInCompose = (
    stepId: string,
    patch: { durationMin?: number; selectedLayer?: LayerMode; instructorNote?: string },
  ) => {
    if (!composeResult) return;
    setComposeResult(
      applyUserEditsToSequenceCompose(composeResult, {
        stepUpdates: [{ stepId, ...patch }],
      }),
    );
  };

  const moveStepInCompose = (index: number, direction: 'up' | 'down') => {
    if (!composeResult) return;
    const ids = composeResult.steps.map((s) => s.stepId);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    const swapped = [...ids];
    [swapped[index], swapped[targetIdx]] = [swapped[targetIdx], swapped[index]];
    setComposeResult(applyUserEditsToSequenceCompose(composeResult, { reorderStepIds: swapped }));
  };

  const removeStepInCompose = (stepId: string) => {
    if (!composeResult) return;
    setComposeResult(applyUserEditsToSequenceCompose(composeResult, { removeStepIds: [stepId] }));
  };

  const renderStepsEditor = (
    steps: EditableDraftStepItem[],
    onUpdateStep: (
      stepId: string,
      patch: { durationMin?: number; selectedLayer?: LayerMode; instructorNote?: string },
    ) => void,
    onRemoveStep: (stepId: string) => void,
    onMoveStep?: (index: number, direction: 'up' | 'down') => void,
  ) => {
    if (steps.length === 0) {
      return (
        <div className="free-ai-empty-recovery" data-testid="free-ai-empty-recovery">
          <p className="free-ai-subtitle">
            선택한 기구·난이도에 맞는 검토 완료 동작이 아직 없어요. 동작 라이브러리에서 검토를 마친 뒤
            다시 시도해 주세요.
          </p>
          {(onFillStarterSequence || onOpenExerciseFinder) && (
            <div className="free-ai-actions" style={{ marginTop: '8px' }}>
              {onFillStarterSequence && (
                <button
                  type="button"
                  className="free-ai-btn-primary"
                  data-testid="free-ai-fill-starter-btn"
                  onClick={onFillStarterSequence}
                >
                  기본 준비 동작으로 초안 바로 채우기
                </button>
              )}
              {onOpenExerciseFinder && (
                <button
                  type="button"
                  className="free-ai-btn-secondary"
                  data-testid="free-ai-open-finder-btn"
                  onClick={onOpenExerciseFinder}
                >
                  직접 동작 찾아 담기
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
    return (
      <ol className="free-ai-step-list" aria-label="편집 가능한 시퀀스 단계">
        {steps.map((step, index) => {
          const isIncluded = !excludedStepIds.has(step.stepId);
          const matchedEx = exercises.find((item) => item.id === step.exerciseId);

          return (
          <li
            key={step.stepId}
            className={`free-ai-step-row ${isIncluded ? '' : 'is-excluded'}`.trim()}
          >
            <div>
              <div className="pf-ai-step-3d-lead">
                {matchedEx && (
                  <ExerciseMotionArtwork
                    exercise={matchedEx}
                    className="pf-workbench-3d-mini-thumb"
                    data-testid="free-ai-step-3d-thumb" />
                )}
                <div>
                  <label className="free-ai-step-check-label">
                    <input
                      type="checkbox"
                      className="free-ai-step-check"
                      data-testid="free-ai-step-include-checkbox"
                      checked={isIncluded}
                      aria-label={`${step.nameKo} 수업 반영 포함`}
                      onChange={() => toggleStepIncluded(step.stepId)}
                    />
                    <strong>
                      {index + 1}. {step.nameKo}
                    </strong>
                  </label>{' '}
                  <small>({step.blockCategory})</small>
                  {matchedEx?.springs && (
                    <div className="pf-class-badges-strip pf-class-badges-strip--compact">
                      <SpringVisualPills springs={matchedEx.springs} />
                    </div>
                  )}
                </div>
              </div>
              <div className="free-ai-field" style={{ marginTop: '0.35rem' }}>
                <label htmlFor={`note-${step.stepId}`} className="free-ai-field-label">
                  단계 큐잉·스프링 메모
                </label>
                <input
                  id={`note-${step.stepId}`}
                  aria-label={`${step.nameKo} 메모 편집`}
                  value={step.instructorNote}
                  onChange={(e) => onUpdateStep(step.stepId, { instructorNote: e.target.value })}
                />
              </div>
            </div>
            <div className="free-ai-field">
              <label htmlFor={`dur-${step.stepId}`}>시간(분)</label>
              <div className="free-ai-duration-inline">
                <button
                  type="button"
                  className="free-ai-duration-chip"
                  aria-label={`${step.nameKo} 30초 줄이기`}
                  disabled={step.durationMin <= 0.5}
                  onClick={() =>
                    onUpdateStep(step.stepId, {
                      durationMin: Math.max(0.5, Number((step.durationMin - 0.5).toFixed(1))),
                    })
                  }
                >
                  -0.5분
                </button>
                <input
                  id={`dur-${step.stepId}`}
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  aria-label={`${step.nameKo} 시간(분)`}
                  value={step.durationMin}
                  onChange={(e) =>
                    onUpdateStep(step.stepId, { durationMin: Number(e.target.value) || 1 })
                  }
                />
                <button
                  type="button"
                  className="free-ai-duration-chip"
                  aria-label={`${step.nameKo} 30초 늘리기`}
                  disabled={step.durationMin >= 60}
                  onClick={() =>
                    onUpdateStep(step.stepId, {
                      durationMin: Math.min(60, Number((step.durationMin + 0.5).toFixed(1))),
                    })
                  }
                >
                  +0.5분
                </button>
              </div>
            </div>
            <div className="free-ai-field">
              <label htmlFor={`layer-${step.stepId}`}>난이도 레이어</label>
              <select
                id={`layer-${step.stepId}`}
                aria-label={`${step.nameKo} 레이어`}
                value={step.selectedLayer}
                onChange={(e) =>
                  onUpdateStep(step.stepId, { selectedLayer: e.target.value as LayerMode })
                }
              >
                <option value="easy">쉬운 단계 (Easy)</option>
                <option value="standard">기본 (Standard)</option>
                <option value="hard">심화 (Hard)</option>
              </select>
            </div>
            <div className="free-ai-actions">
              {onMoveStep && (
                <>
                  <button
                    type="button"
                    className="free-ai-btn-secondary"
                    onClick={() => onMoveStep(index, 'up')}
                    disabled={index === 0}
                    aria-label={`${step.nameKo} 위로 이동`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="free-ai-btn-secondary"
                    onClick={() => onMoveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    aria-label={`${step.nameKo} 아래로 이동`}
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="free-ai-btn-secondary"
                onClick={() => onRemoveStep(step.stepId)}
                aria-label={`${step.nameKo} 단계 삭제`}
              >
                삭제
              </button>
            </div>
          </li>
          );
        })}
      </ol>
    );
  };

  const isLocalOnlyPreferred = aiModePreference === 'local-only';
  const externalAiDisabledOrExhausted =
    isLocalOnlyPreferred || !quotaStatus.enabled || quotaStatus.exhausted;
  const recommendationModeLabel = isLocalOnlyPreferred
    ? '기기 내 규칙 모드'
    : !quotaStatus.enabled || quotaStatus.exhausted
      ? '조건 기반 추천'
      : errorBanner
        ? 'AI 응답 확인 필요'
        : 'AI 초안';
  const hasCurrentTabResult =
    (activeTab === 'class-draft' && Boolean(classDraftResult)) ||
    (activeTab === 'movement-idea' && Boolean(movementIdeaResult)) ||
    (activeTab === 'sequence-compose' && Boolean(composeResult)) ||
    (activeTab === 'exercise-search' && Boolean(searchResult));

  return (
    <section className="free-ai-panel" aria-label="수업·동작 초안">
      <header className="free-ai-header">
        <div className="free-ai-title-group">
          <h2 className="free-ai-title">수업·동작 초안</h2>
        </div>
        <div className="free-ai-badges">
          {uiContract?.renderBadge ? (
            uiContract.renderBadge({
              tone: 'default',
              children: recommendationModeLabel,
            })
          ) : (
            <>
              <PfAiStatusBadge
                kind={externalAiDisabledOrExhausted ? 'auto-draft' : 'ai-draft'}
                className="free-ai-badge"
              >
                {recommendationModeLabel}
              </PfAiStatusBadge>
              {!externalAiDisabledOrExhausted && quotaStatus.provider === 'openai' && (
                <PfAiStatusBadge kind="ai-draft" className="free-ai-badge">
                  {quotaStatus.keySource === 'user-registered'
                    ? '사용자 등록 키 우선 연결됨'
                    : 'OpenAI 서버 보조'}
                </PfAiStatusBadge>
              )}
            </>
          )}
        </div>
      </header>

      <section
        className="free-ai-settings-card"
        data-testid="free-ai-settings-card"
        aria-label="초안 추천 및 AI 보조 설정"
      >
        <div className="free-ai-settings-top">
          <div className="free-ai-settings-status">
            <strong>
              현재 실행 모드:{' '}
              {isLocalOnlyPreferred
                ? '기기 내 규칙 기본 (외부 호출 없음)'
                : quotaStatus.exhausted
                  ? '한도 도달 · 기기 내 규칙 자동 전환됨'
                  : quotaStatus.enabled
                    ? `서버 무료 조건 AI 보조 (분당 ${quotaStatus.minuteRemaining}/${quotaStatus.minuteLimit} · 오늘 ${quotaStatus.dailyRemaining}/${quotaStatus.dailyLimit})`
                    : '서버 키 미설정 · 기기 내 규칙 활성'}
            </strong>
            <span>
              {autoFallbackEnabled
                ? '한도 도달·지연·오류 시 기기 내 규칙 추천으로 자동 이어집니다.'
                : '수동 전환 상태 · 오류 시 안내 배너를 먼저 표시합니다.'}
            </span>
          </div>
          <div className="free-ai-settings-quick-actions">
            {!isLocalOnlyPreferred ? (
              <button
                type="button"
                className="free-ai-btn-secondary"
                data-testid="free-ai-switch-local-btn"
                onClick={() => {
                  updateAiModePreference('local-only');
                  setActionFeedback('기기 내 규칙 모드로 전환했습니다. 외부 호출 없이 동작합니다.');
                }}
              >
                기기 내 규칙 모드로 전환
              </button>
            ) : (
              <button
                type="button"
                className="free-ai-btn-secondary"
                data-testid="free-ai-switch-server-btn"
                disabled={!quotaStatus.enabled || quotaStatus.exhausted}
                onClick={() => {
                  updateAiModePreference('server-free-assist');
                  setActionFeedback('서버 무료 조건 AI 보조 모드를 선택했습니다.');
                }}
              >
                서버 무료 조건 AI 켜기
              </button>
            )}
            <button
              type="button"
              className="free-ai-btn-secondary"
              data-testid="free-ai-recheck-status-btn"
              onClick={() => void handleRecheckQuotaStatus()}
            >
              연결 다시 확인
            </button>
          </div>
        </div>

        <div
          className="free-ai-mode-options"
          role="radiogroup"
          aria-label="추천 엔진 모드 선택"
        >
          <label className={`free-ai-mode-option ${isLocalOnlyPreferred ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="pf-free-ai-mode"
              data-testid="free-ai-mode-local"
              checked={isLocalOnlyPreferred}
              onChange={() => updateAiModePreference('local-only')}
            />
            <div>
              <strong>기기 내 규칙 기본 (0원 확인됨)</strong>
              <small>기구·시간·난이도·수업 이력으로 이 브라우저 안에서 즉시 조합</small>
            </div>
          </label>
          <label
            className={`free-ai-mode-option ${
              !isLocalOnlyPreferred && quotaStatus.enabled && !quotaStatus.exhausted
                ? 'is-selected'
                : ''
            } ${!quotaStatus.enabled || quotaStatus.exhausted ? 'is-disabled' : ''}`}
          >
            <input
              type="radio"
              name="pf-free-ai-mode"
              data-testid="free-ai-mode-server"
              checked={!isLocalOnlyPreferred && quotaStatus.enabled && !quotaStatus.exhausted}
              disabled={!quotaStatus.enabled || quotaStatus.exhausted}
              onChange={() => updateAiModePreference('server-free-assist')}
            />
            <div>
              <strong>서버 무료 조건 AI 보조</strong>
              <small>
                {quotaStatus.exhausted
                  ? '현재 무료 한도 소진됨 · 갱신 전까지 기기 내 규칙으로 대체'
                  : quotaStatus.enabled
                    ? `확인된 서버 한도 내 동작 (오늘 ${quotaStatus.dailyRemaining}/${quotaStatus.dailyLimit}회 남음)`
                    : '서버 무료 키 미연결 상태'}
              </small>
            </div>
          </label>
          <label className="free-ai-mode-option is-disabled">
            <input
              type="radio"
              name="pf-free-ai-mode"
              data-testid="free-ai-mode-locked-paid"
              checked={false}
              disabled
              readOnly
            />
            <div>
              <strong>외부 유료 키 · 구독 크레딧 연동 (미확인 잠금)</strong>
              <small>구독·도구 크레딧과 API 과금 크레딧 동일 가정 금지 · 브라우저 키 입력 차단</small>
            </div>
          </label>
        </div>

        <div className="free-ai-settings-footer">
          <label className="free-ai-fallback-toggle">
            <input
              type="checkbox"
              data-testid="free-ai-auto-fallback-checkbox"
              checked={autoFallbackEnabled}
              onChange={(e) => setAutoFallbackEnabled(e.target.checked)}
            />
            <span>한도 도달·응답 지연 시 기기 내 규칙 추천으로 자동 전환</span>
          </label>
          <details
            className="free-ai-governance-details"
            data-testid="free-ai-verified-vs-unverified"
          >
            <summary>확인된 무료·보안 조건과 미확인 항목 보기</summary>
            <div className="free-ai-governance-grid">
              <div>
                <strong>확인된 조건 (코드·서버 가드 검증)</strong>
                <ul>
                  <li>기기 내 규칙 추천(local-rule-engine)은 외부 호출 0회·추가 비용 0원으로 동작합니다.</li>
                  <li>브라우저 비밀키 저장·전송 차단(byok_forbidden) 및 서버 무료 조건 가드(max_price=0)가 적용되어 있습니다.</li>
                  <li>오류·한도 도달 시 작성 중인 시퀀스와 저장 자료는 손상되지 않습니다.</li>
                </ul>
              </div>
              <div>
                <strong>미확인 항목 (단정하지 않음)</strong>
                <ul>
                  <li>외부 AI 제공사의 실시간 계정 잔여 한도·정책 변경은 서버 실연결 응답 전까지 가정하지 않습니다.</li>
                  <li>개인 구독·개발도구 크레딧과 종량제 API 크레딧은 동일 크레딧으로 취급하지 않습니다.</li>
                  <li>추천 결과와 도해의 개인별 의학·임상 적합성은 보장하지 않으며 강사 직접 검토가 필요합니다.</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </section>

      <ol
        className="free-ai-step-guide"
        data-testid="ai-assistant-step-guide"
        aria-label="초안 작성 단계 안내"
      >
        <li
          className={`free-ai-step-guide-item ${!hasCurrentTabResult ? 'is-active' : 'is-complete'}`}
          aria-current={!hasCurrentTabResult ? 'step' : undefined}
        >
          1 수업 조건·요청 입력
        </li>
        <li className="free-ai-step-guide-arrow" aria-hidden="true">
          →
        </li>
        <li
          className={`free-ai-step-guide-item ${
            hasCurrentTabResult && !appliedToPlan
              ? 'is-active'
              : appliedToPlan
                ? 'is-complete'
                : ''
          }`}
          aria-current={hasCurrentTabResult && !appliedToPlan ? 'step' : undefined}
        >
          2 추천 초안 검토
        </li>
        <li className="free-ai-step-guide-arrow" aria-hidden="true">
          →
        </li>
        <li
          className={`free-ai-step-guide-item ${appliedToPlan ? 'is-active' : ''}`}
          aria-current={appliedToPlan ? 'step' : undefined}
        >
          3 수업안에 반영
        </li>
      </ol>

      {quotaStatus.exhausted ? (
        <div
          className="free-ai-status-banner is-exhausted"
          role="alert"
          aria-label="무료 사용량 소진 안내"
        >
          <strong>AI 사용량을 모두 사용했어요.</strong>
          <span>조건 기반 추천과 직접 편집은 계속 사용할 수 있어요.</span>
          {quotaStatus.renewal && (
            <span data-testid="free-ai-renewal-info">
              다음 이용: {quotaStatus.renewal.formattedResetKo}
            </span>
          )}
        </div>
      ) : quotaStatus.enabled ? (
        <details className="free-ai-status-banner">
          <summary>AI 사용량</summary>
          <p>
            분당 {quotaStatus.minuteRemaining}/{quotaStatus.minuteLimit}회 · 오늘{' '}
            {quotaStatus.dailyRemaining}/{quotaStatus.dailyLimit}회 남음
            {quotaStatus.renewal ? ` · 갱신: ${quotaStatus.renewal.formattedResetKo}` : ''}
          </p>
        </details>
      ) : quotaStatus.reason === 'unconfigured' ? (
        <p
          className="free-ai-status-banner is-disabled"
          data-testid="free-ai-unconfigured-note"
        >
          서버 AI 키 미설정 · 기기 내 조건 추천과 직접 편집은 그대로 사용할 수 있어요.
        </p>
      ) : null}

      <div
        className="free-ai-disclaimer"
        role="note"
        aria-label="미검토 동작 및 개인정보 보호 안내"
      >
        {uiContract?.renderNotice ? (
          uiContract.renderNotice({
            tone: 'warning',
            title: '안전·운동 효과 미보장 및 민감 건강정보 전송 금지 안내',
            description: `${UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER} 또한 회원의 실명, 연락처, 디스크·수술·임신·통증 등 민감 건강정보는 외부 AI로 전송하지 마세요.`,
            children: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
          })
        ) : (
          <>
            <strong>안전·운동 효과 미보장 및 민감 건강정보 전송 금지 안내:</strong>{' '}
            {UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER} 또한 회원의 실명, 연락처, 디스크·수술·임신·통증
            등 민감 건강정보는 외부 AI로 전송하지 마세요.
          </>
        )}
      </div>

      <div className="free-ai-tabs" role="tablist" aria-label="AI 보조 기능 선택">
        <button
          type="button"
          role="tab"
          className="free-ai-tab-btn"
          aria-selected={activeTab === 'class-draft'}
          onClick={() => {
            cancelActiveRequest(false);
            setActiveTab('class-draft');
            setErrorBanner(null);
            setActionFeedback(null);
            setAppliedToPlan(false);
          }}
        >
          1. 수업 초안 만들기
        </button>
        <button
          type="button"
          role="tab"
          className="free-ai-tab-btn"
          aria-selected={activeTab === 'movement-idea'}
          onClick={() => {
            cancelActiveRequest(false);
            setActiveTab('movement-idea');
            setErrorBanner(null);
            setActionFeedback(null);
            setAppliedToPlan(false);
          }}
        >
          2. 새 동작 아이디어·변형
        </button>
        <button
          type="button"
          role="tab"
          className="free-ai-tab-btn"
          aria-selected={activeTab === 'sequence-compose'}
          onClick={() => {
            cancelActiveRequest(false);
            setActiveTab('sequence-compose');
            setErrorBanner(null);
            setActionFeedback(null);
            setAppliedToPlan(false);
          }}
        >
          3. 검토 동작·블록 시퀀스 구성
        </button>
        <button
          type="button"
          role="tab"
          className="free-ai-tab-btn"
          aria-selected={activeTab === 'exercise-search'}
          onClick={() => {
            cancelActiveRequest(false);
            setActiveTab('exercise-search');
            setErrorBanner(null);
            setActionFeedback(null);
            setAppliedToPlan(false);
          }}
        >
          4. 동작 탐색 추천
        </button>
      </div>

      {isLoading && (
        <div
          className="free-ai-status-banner is-loading"
          data-testid="free-ai-loading-banner"
          aria-live="polite"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
        >
          <span>
            {activeTab === 'class-draft'
              ? '수업 초안을 준비하고 있어요…'
              : activeTab === 'movement-idea'
                ? '새 동작 아이디어·변형 초안을 준비하고 있어요…'
                : activeTab === 'sequence-compose'
                  ? '검토 동작 시퀀스 초안을 준비하고 있어요…'
                  : '조건에 맞는 추천 동작을 찾고 있어요…'}
          </span>
          <button
            type="button"
            className="free-ai-btn-secondary"
            data-testid="free-ai-cancel-request-btn"
            onClick={() => cancelActiveRequest(true)}
          >
            요청 취소
          </button>
        </div>
      )}
      {errorBanner && (
        <div className="free-ai-status-banner is-exhausted" role="alert">
          {errorBanner}
        </div>
      )}
      {actionFeedback && (
        <div className="free-ai-status-banner" role="status">
          {actionFeedback}
        </div>
      )}

      {activeTab === 'class-draft' && (
        <div role="tabpanel" aria-label="수업 초안 만들기 패널" className="free-ai-result-card">
          <div className="pf-ai-quick-recipes" data-testid="free-ai-quick-recipe-cards" role="group" aria-label="원탭 3D 수업 초안 레시피">
            {([
              { id: 'r1', title: '리포머 코어·골반 정렬', min: 50, app: 'reformer' as const, area: 'core' as const, lv: '1.5' as const, img: '/motion-studio3d/footwork-peak.png', sp: '2R 1B' },
              { id: 'r2', title: '흉추 신전·어깨 열기', min: 50, app: 'cadillac' as const, area: 'posture-upper' as const, lv: '1.5' as const, img: '/motion-studio3d/cadillac-cat-start.png', sp: '2Y' },
              { id: 'r3', title: '운다 체어 하지 밸런스', min: 50, app: 'chair' as const, area: 'glute-lower' as const, lv: '1.5' as const, img: '/motion-studio3d/chair-goingup-peak.png', sp: '1R 1B' },
              { id: 'r4', title: '매트 호흡·기초 분절', min: 30, app: 'mat' as const, area: 'mobility-rehab' as const, lv: '1.0' as const, img: '/motion-studio3d/mat-hundred-peak.png', sp: '맨몸' },
            ]).map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="pf-ai-quick-recipe-card"
                onClick={() => {
                  setDraftMinutes(recipe.min);
                  setDraftTheme(recipe.title);
                  setDraftApparatus(recipe.app);
                  setDraftAreas([recipe.area]);
                  setDraftLevel(recipe.lv);
                }}
              >
                <img src={recipe.img} alt="" aria-hidden="true" loading="lazy" />
                <div>
                  <strong>{recipe.title}</strong>
                  <small>{recipe.min}분 · Lv.{recipe.lv} · {recipe.sp}</small>
                </div>
              </button>
            ))}
          </div>
          <div className="free-ai-form-grid">
            <div className="free-ai-field">
              <label htmlFor="free-ai-draft-minutes">수업 시간 (분)</label>
              <input
                id="free-ai-draft-minutes"
                type="number"
                min={10}
                max={120}
                step={5}
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(Number(e.target.value) || 50)}
              />
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-draft-theme">수업 주제</label>
              <input
                id="free-ai-draft-theme"
                type="text"
                value={draftTheme}
                onChange={(e) => setDraftTheme(e.target.value)}
                placeholder="예: 골반 안정화와 코어 연결"
              />
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-draft-level">난이도</label>
              <select
                id="free-ai-draft-level"
                value={draftLevel}
                onChange={(e) => setDraftLevel(e.target.value as DifficultyLevel)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-draft-apparatus">기구 조건</label>
              <select
                id="free-ai-draft-apparatus"
                value={draftApparatus}
                onChange={(e) => setDraftApparatus(e.target.value as ApparatusType | 'mixed')}
              >
                {APPARATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="free-ai-field">
            <span className="free-ai-field-label">강화 부위 (복수 선택 가능)</span>
            <div className="free-ai-chip-row" role="group" aria-label="초안 강화 부위 선택">
              {STRENGTHEN_AREA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="free-ai-chip"
                  aria-pressed={draftAreas.includes(opt.value)}
                  onClick={() => toggleArea(draftAreas, setDraftAreas, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="free-ai-form-grid">
            <div className="free-ai-field">
              <label htmlFor="free-ai-preset-select">저장된 조건 프리셋</label>
              <select
                id="free-ai-preset-select"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">프리셋 선택 안 함</option>
                {conditionTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.criteria.targetMinutes}분 · Lv.{tpl.criteria.level})
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-preset-name">현재 조건을 새 프리셋으로 저장</label>
              <div className="free-ai-actions">
                <input
                  id="free-ai-preset-name"
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="프리셋 이름 (예: 오전 코어 50분)"
                />
                <button type="button" className="free-ai-btn-secondary" onClick={handleSavePreset}>
                  프리셋 저장
                </button>
              </div>
            </div>
          </div>

          {draftHealthInspection.hasSensitiveData && (
            <div className="free-ai-status-banner is-exhausted" role="alert">
              {draftHealthInspection.warningMessageKo}
            </div>
          )}

          <div className="free-ai-actions">
            {!externalAiDisabledOrExhausted && (
              <button
                type="button"
                className="free-ai-btn-primary"
                disabled={
                  isLoading ||
                  externalAiDisabledOrExhausted ||
                  draftHealthInspection.hasSensitiveData
                }
                onClick={() => runClassDraft(false)}
              >
                {quotaStatus.exhausted
                  ? '무료 사용량 소진 (호출 차단됨)'
                  : !quotaStatus.enabled
                    ? '외부 AI 비활성화됨'
                    : '무료 AI 초안 만들기'}
              </button>
            )}
            <button
              type="button"
              className={
                externalAiDisabledOrExhausted ? 'free-ai-btn-primary' : 'free-ai-btn-secondary'
              }
              disabled={isLoading}
              onClick={() => runClassDraft(true)}
            >
              조건으로 초안 만들기
            </button>
          </div>

          {classDraftResult && (
            <div className="free-ai-result-card" aria-label="생성된 수업 초안 편집">
              <div className="free-ai-badges">
                <PfAiStatusBadge kind="auto-draft" />
              </div>
              <div className="free-ai-form-grid">
                <div className="free-ai-field">
                  <label htmlFor="edit-draft-title">초안 제목 편집</label>
                  <input
                    id="edit-draft-title"
                    value={classDraftResult.title}
                    onChange={(e) =>
                      setClassDraftResult(
                        applyUserEditsToClassDraft(classDraftResult, { title: e.target.value }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-draft-subtitle">초안 부제 편집</label>
                  <input
                    id="edit-draft-subtitle"
                    value={classDraftResult.subtitle}
                    onChange={(e) =>
                      setClassDraftResult(
                        applyUserEditsToClassDraft(classDraftResult, { subtitle: e.target.value }),
                      )
                    }
                  />
                </div>
              </div>
              <div className="free-ai-field">
                <label htmlFor="edit-draft-summary">수업 구성 메모 편집</label>
                <textarea
                  id="edit-draft-summary"
                  value={classDraftResult.coachingSummary}
                  onChange={(e) =>
                    setClassDraftResult(
                      applyUserEditsToClassDraft(classDraftResult, {
                        coachingSummary: e.target.value,
                      }),
                    )
                  }
                />
              </div>

              <VisualSequenceFilmstrip
                steps={editableStepsToSequenceSteps(classDraftResult.steps)}
                exercises={exercises}
                compact
              />
              {renderStepsEditor(
                classDraftResult.steps,
                updateStepInClassDraft,
                removeStepInClassDraft,
                moveStepInClassDraft,
              )}

              <div className="free-ai-disclaimer">{classDraftResult.safetyDisclaimer}</div>

              {(() => {
                const selectedDraftSteps = classDraftResult.steps.filter(
                  (st) => !excludedStepIds.has(st.stepId),
                );
                const selectedTotalMin = Number(
                  selectedDraftSteps.reduce((sum, st) => sum + st.durationMin, 0).toFixed(1),
                );
                return (
                  <div className="free-ai-actions free-ai-apply-bar">
                    <span
                      className="free-ai-selected-summary"
                      data-testid="free-ai-selected-summary"
                    >
                      선택 {selectedDraftSteps.length} / {classDraftResult.steps.length}개 단계 · 총{' '}
                      {selectedTotalMin}분 반영 예정
                    </span>
                    <button
                      type="button"
                      className="free-ai-btn-primary"
                      disabled={selectedDraftSteps.length === 0}
                      onClick={() => {
                        onApplyDraftSequence?.({
                          title: classDraftResult.title,
                          subtitle: classDraftResult.subtitle,
                          targetMinutes: classDraftResult.targetMinutes,
                          level: classDraftResult.level,
                          apparatus: classDraftResult.apparatus,
                          steps: editableStepsToSequenceSteps(selectedDraftSteps),
                        });
                        setAppliedToPlan(true);
                        setActionFeedback('편집한 수업 초안을 현재 워크벤치에 반영했습니다.');
                      }}
                    >
                      워크벤치 수업안에 반영
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'movement-idea' && (
        <div
          role="tabpanel"
          aria-label="새 동작 아이디어 및 변형 제안 패널"
          className="free-ai-result-card"
        >
          <div className="free-ai-field">
            <label htmlFor="free-ai-raw-idea">새 동작 아이디어 설명</label>
            <textarea
              id="free-ai-raw-idea"
              value={rawIdeaText}
              onChange={(e) => setRawIdeaText(e.target.value)}
              placeholder="예: 풋바를 발바닥 아치로 지지하며 골반을 천천히 분절해 올리는 브릿지 변형"
            />
          </div>
          <div className="free-ai-form-grid">
            <div className="free-ai-field">
              <label htmlFor="free-ai-base-exercise">기반 동작명 (선택)</label>
              <input
                id="free-ai-base-exercise"
                value={baseExerciseName}
                onChange={(e) => setBaseExerciseName(e.target.value)}
                placeholder="예: Pelvic Curl"
              />
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-idea-apparatus">기구</label>
              <select
                id="free-ai-idea-apparatus"
                value={ideaApparatus}
                onChange={(e) => setIdeaApparatus(e.target.value as ApparatusType)}
              >
                {SINGLE_APPARATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-idea-category">블록 분류</label>
              <select
                id="free-ai-idea-category"
                value={ideaCategory}
                onChange={(e) => setIdeaCategory(e.target.value as ClassBlockCategory)}
              >
                {BLOCK_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-idea-area">강화 부위</label>
              <select
                id="free-ai-idea-area"
                value={ideaArea}
                onChange={(e) => setIdeaArea(e.target.value as StrengthenArea)}
              >
                {STRENGTHEN_AREA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-idea-level">난이도</label>
              <select
                id="free-ai-idea-level"
                value={ideaLevel}
                onChange={(e) => setIdeaLevel(e.target.value as DifficultyLevel)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ideaHealthInspection.hasSensitiveData && (
            <div className="free-ai-status-banner is-exhausted" role="alert">
              {ideaHealthInspection.warningMessageKo}
            </div>
          )}

          <div className="free-ai-actions">
            {!externalAiDisabledOrExhausted && (
              <button
                type="button"
                className="free-ai-btn-primary"
                disabled={
                  isLoading ||
                  externalAiDisabledOrExhausted ||
                  ideaHealthInspection.hasSensitiveData
                }
                onClick={() => runMovementIdea(false)}
              >
                {quotaStatus.exhausted
                  ? '무료 사용량 소진 (호출 차단됨)'
                  : !quotaStatus.enabled
                    ? '외부 AI 비활성화됨'
                    : '무료 AI로 아이디어·변형 정리'}
              </button>
            )}
            <button
              type="button"
              className={
                externalAiDisabledOrExhausted ? 'free-ai-btn-primary' : 'free-ai-btn-secondary'
              }
              disabled={isLoading}
              onClick={() => runMovementIdea(true)}
            >
              아이디어 정리하기
            </button>
          </div>

          {movementIdeaResult && (
            <div className="free-ai-result-card" aria-label="정리된 새 동작 아이디어 및 변형 편집">
              <div className="free-ai-badges">
                <PfAiStatusBadge kind="creative-memo" className="free-ai-badge is-warning">
                  미검토 창작 동작 · 안전 및 운동 효과 보장 안 함
                </PfAiStatusBadge>
              </div>
              <div className="free-ai-form-grid">
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-name-ko">동작 이름 (국문) 편집</label>
                  <input
                    id="edit-idea-name-ko"
                    value={movementIdeaResult.nameKo}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          nameKo: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-name-en">동작 이름 (영문) 편집</label>
                  <input
                    id="edit-idea-name-en"
                    value={movementIdeaResult.nameEn}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          nameEn: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-springs">스프링·저항 세팅 편집</label>
                  <input
                    id="edit-idea-springs"
                    value={movementIdeaResult.springs}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          springs: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-duration">기본 시간(분) 편집</label>
                  <input
                    id="edit-idea-duration"
                    type="number"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={movementIdeaResult.defaultDurationMin}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          defaultDurationMin: Number(e.target.value) || 4,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <div className="free-ai-field">
                <label htmlFor="edit-idea-breath">호흡 패턴 편집</label>
                <input
                  id="edit-idea-breath"
                  value={movementIdeaResult.breathPattern}
                  onChange={(e) =>
                    setMovementIdeaResult(
                      applyUserEditsToMovementIdea(movementIdeaResult, {
                        breathPattern: e.target.value,
                      }),
                    )
                  }
                />
              </div>

              <div className="free-ai-field">
                <label htmlFor="edit-idea-cues">티칭 큐잉 편집 (줄바꿈으로 구분)</label>
                <textarea
                  id="edit-idea-cues"
                  value={movementIdeaResult.cues.join('\n')}
                  onChange={(e) =>
                    setMovementIdeaResult(
                      applyUserEditsToMovementIdea(movementIdeaResult, {
                        cues: e.target.value.split('\n'),
                      }),
                    )
                  }
                />
              </div>

              <div className="free-ai-form-grid">
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-easy">쉬운 변형 (Easy) 편집</label>
                  <textarea
                    id="edit-idea-easy"
                    value={movementIdeaResult.layers.easy}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          layers: { easy: e.target.value },
                        }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-standard">기본 변형 (Standard) 편집</label>
                  <textarea
                    id="edit-idea-standard"
                    value={movementIdeaResult.layers.standard}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          layers: { standard: e.target.value },
                        }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-idea-hard">심화 변형 (Hard) 편집</label>
                  <textarea
                    id="edit-idea-hard"
                    value={movementIdeaResult.layers.hard}
                    onChange={(e) =>
                      setMovementIdeaResult(
                        applyUserEditsToMovementIdea(movementIdeaResult, {
                          layers: { hard: e.target.value },
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <div className="free-ai-field">
                <label htmlFor="edit-idea-precautions">주의사항 편집</label>
                <textarea
                  id="edit-idea-precautions"
                  value={movementIdeaResult.precautions}
                  onChange={(e) =>
                    setMovementIdeaResult(
                      applyUserEditsToMovementIdea(movementIdeaResult, {
                        precautions: e.target.value,
                      }),
                    )
                  }
                />
              </div>

              <div className="free-ai-disclaimer">{movementIdeaResult.safetyDisclaimer}</div>

              <div className="free-ai-actions">
                <button
                  type="button"
                  className="free-ai-btn-primary"
                  onClick={() => {
                    const { exercise, ideaContract } = movementIdeaToUnreviewedExercise(
                      movementIdeaResult,
                      rawIdeaText,
                    );
                    onSaveUnreviewedMovementIdea?.(exercise, ideaContract);
                    setAppliedToPlan(true);
                    setActionFeedback(
                      `미검토 창작 동작 '${exercise.nameKo}'을(를) 보관함에 저장했습니다. (강사 검토 전까지 자동 추천·실시간 수업에서 제외됩니다)`,
                    );
                  }}
                >
                  미검토 창작 동작으로 보관함에 저장
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sequence-compose' && (
        <div
          role="tabpanel"
          aria-label="검토 동작·블록 시퀀스 구성 패널"
          className="free-ai-result-card"
        >
          <p className="free-ai-subtitle">
            검토 완료 동작 {reviewedExercises.length}개 · 검토 완료 블록 {reviewedBlocks.length}개
            사용 가능 (미검토 동작 {unreviewedExerciseCount}개 · 미검토 블록 {unreviewedBlockCount}
            개는 시퀀스 구성에서 자동 제외됩니다)
          </p>

          <div className="free-ai-form-grid">
            <div className="free-ai-field">
              <label htmlFor="free-ai-compose-minutes">목표 수업 시간 (분)</label>
              <input
                id="free-ai-compose-minutes"
                type="number"
                min={10}
                max={120}
                step={5}
                value={composeMinutes}
                onChange={(e) => setComposeMinutes(Number(e.target.value) || 50)}
              />
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-compose-theme">시퀀스 주제</label>
              <input
                id="free-ai-compose-theme"
                value={composeTheme}
                onChange={(e) => setComposeTheme(e.target.value)}
              />
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-compose-level">난이도</label>
              <select
                id="free-ai-compose-level"
                value={composeLevel}
                onChange={(e) => setComposeLevel(e.target.value as DifficultyLevel)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-compose-apparatus">기구</label>
              <select
                id="free-ai-compose-apparatus"
                value={composeApparatus}
                onChange={(e) => setComposeApparatus(e.target.value as ApparatusType | 'mixed')}
              >
                {APPARATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {reviewedBlocks.length > 0 && (
            <div className="free-ai-field">
              <span className="free-ai-field-label">검토 완료 블록 선택</span>
              <div className="free-ai-chip-row" role="group" aria-label="검토 완료 블록 선택">
                {reviewedBlocks.map((block) => {
                  const pressed = selectedBlockIds.includes(block.id);
                  const blockSteps = block.steps ?? block.items ?? [];
                  const resolvedBlockDuration =
                    block.durationMin ??
                    (blockSteps.reduce((sum, item) => sum + (item.durationMin ?? 4), 0) || 10);
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className="free-ai-chip"
                      aria-pressed={pressed}
                      onClick={() =>
                        setSelectedBlockIds((prev) =>
                          prev.includes(block.id)
                            ? prev.filter((id) => id !== block.id)
                            : [...prev, block.id],
                        )
                      }
                    >
                      [블록] {block.title} ({resolvedBlockDuration}분)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="free-ai-field">
            <span className="free-ai-field-label">검토 완료 동작 선택</span>
            <div className="free-ai-chip-row" role="group" aria-label="검토 완료 동작 선택">
              {reviewedExercises.map((ex) => {
                const pressed = selectedExerciseIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className="free-ai-chip"
                    aria-pressed={pressed}
                    onClick={() =>
                      setSelectedExerciseIds((prev) =>
                        prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id],
                      )
                    }
                  >
                    {ex.nameKo} ({ex.defaultDurationMin}분)
                  </button>
                );
              })}
            </div>
          </div>

          <div className="free-ai-field">
            <span className="free-ai-field-label">강화 부위</span>
            <div className="free-ai-chip-row" role="group" aria-label="시퀀스 강화 부위 선택">
              {STRENGTHEN_AREA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="free-ai-chip"
                  aria-pressed={composeAreas.includes(opt.value)}
                  onClick={() => toggleArea(composeAreas, setComposeAreas, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="free-ai-actions">
            {!externalAiDisabledOrExhausted && (
              <button
                type="button"
                className="free-ai-btn-primary"
                disabled={
                  isLoading ||
                  externalAiDisabledOrExhausted ||
                  composeHealthInspection.hasSensitiveData
                }
                onClick={() => runSequenceCompose(false)}
              >
                {quotaStatus.exhausted
                  ? '무료 사용량 소진 (호출 차단됨)'
                  : !quotaStatus.enabled
                    ? '외부 AI 비활성화됨'
                    : '무료 AI로 시퀀스 구성'}
              </button>
            )}
            <button
              type="button"
              className={
                externalAiDisabledOrExhausted ? 'free-ai-btn-primary' : 'free-ai-btn-secondary'
              }
              disabled={isLoading}
              onClick={() => runSequenceCompose(true)}
            >
              시퀀스 구성하기
            </button>
          </div>

          {composeResult && (
            <div className="free-ai-result-card" aria-label="구성된 시퀀스 편집">
              <div className="free-ai-badges">
                <PfAiStatusBadge kind="auto-draft" />
              </div>
              <div className="free-ai-form-grid">
                <div className="free-ai-field">
                  <label htmlFor="edit-compose-title">시퀀스 제목 편집</label>
                  <input
                    id="edit-compose-title"
                    value={composeResult.title}
                    onChange={(e) =>
                      setComposeResult(
                        applyUserEditsToSequenceCompose(composeResult, { title: e.target.value }),
                      )
                    }
                  />
                </div>
                <div className="free-ai-field">
                  <label htmlFor="edit-compose-subtitle">시퀀스 부제 편집</label>
                  <input
                    id="edit-compose-subtitle"
                    value={composeResult.subtitle}
                    onChange={(e) =>
                      setComposeResult(
                        applyUserEditsToSequenceCompose(composeResult, {
                          subtitle: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              {composeResult.excludedUnreviewedIds.length > 0 && (
                <div className="free-ai-status-banner is-disabled" role="status">
                  미검토·미확인 제외 항목 ({composeResult.excludedUnreviewedIds.length}건):{' '}
                  {composeResult.excludedUnreviewedIds.join(', ')}
                </div>
              )}

              {renderStepsEditor(
                composeResult.steps,
                updateStepInCompose,
                removeStepInCompose,
                moveStepInCompose,
              )}

              <div className="free-ai-disclaimer">{composeResult.safetyDisclaimer}</div>

              {(() => {
                const selectedComposeSteps = composeResult.steps.filter(
                  (st) => !excludedStepIds.has(st.stepId),
                );
                const selectedTotalMin = Number(
                  selectedComposeSteps.reduce((sum, st) => sum + st.durationMin, 0).toFixed(1),
                );
                return (
                  <div className="free-ai-actions free-ai-apply-bar">
                    <span
                      className="free-ai-selected-summary"
                      data-testid="free-ai-selected-summary"
                    >
                      선택 {selectedComposeSteps.length} / {composeResult.steps.length}개 단계 · 총{' '}
                      {selectedTotalMin}분 반영 예정
                    </span>
                    <button
                      type="button"
                      className="free-ai-btn-primary"
                      disabled={selectedComposeSteps.length === 0}
                      onClick={() => {
                        onApplyDraftSequence?.({
                          title: composeResult.title,
                          subtitle: composeResult.subtitle,
                          targetMinutes: composeResult.targetMinutes,
                          level: composeResult.level,
                          apparatus: composeResult.apparatus,
                          steps: editableStepsToSequenceSteps(selectedComposeSteps),
                        });
                        setAppliedToPlan(true);
                        setActionFeedback('구성한 시퀀스를 현재 워크벤치에 반영했습니다.');
                      }}
                    >
                      워크벤치 수업안에 반영
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exercise-search' && (
        <div
          role="tabpanel"
          aria-label="동작 탐색 추천 패널"
          className="free-ai-result-card"
        >
          <div className="free-ai-field">
            <label htmlFor="free-ai-search-query">찾고 싶은 동작·움직임 설명</label>
            <input
              id="free-ai-search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="예: 어깨 긴장을 낮추면서 코어와 골반 중립을 깨우는 동작"
            />
          </div>

          <div className="free-ai-form-grid">
            <div className="free-ai-field">
              <label htmlFor="free-ai-search-apparatus">기구 조건</label>
              <select
                id="free-ai-search-apparatus"
                value={searchApparatus}
                onChange={(e) => setSearchApparatus(e.target.value as ApparatusType | 'mixed')}
              >
                {APPARATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-search-level">최대 난이도</label>
              <select
                id="free-ai-search-level"
                value={searchLevel}
                onChange={(e) => setSearchLevel(e.target.value as DifficultyLevel)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="free-ai-field">
              <label htmlFor="free-ai-search-area">중점 부위</label>
              <select
                id="free-ai-search-area"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value as StrengthenArea)}
              >
                {STRENGTHEN_AREA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {searchHealthInspection.hasSensitiveData && (
            <div className="free-ai-status-banner is-exhausted" role="alert">
              {searchHealthInspection.warningMessageKo}
            </div>
          )}

          <div className="free-ai-actions">
            {!externalAiDisabledOrExhausted && (
              <button
                type="button"
                className="free-ai-btn-primary"
                disabled={
                  isLoading ||
                  externalAiDisabledOrExhausted ||
                  searchHealthInspection.hasSensitiveData
                }
                onClick={() => runMovementSearch(false)}
              >
                AI로 동작 추천 받기
              </button>
            )}
            <button
              type="button"
              className={
                externalAiDisabledOrExhausted ? 'free-ai-btn-primary' : 'free-ai-btn-secondary'
              }
              disabled={isLoading}
              onClick={() => runMovementSearch(true)}
            >
              동작 추천 받기
            </button>
          </div>

          {searchResult && (
            <div
              className="free-ai-result-card"
              aria-label="추천 동작 결과"
              data-testid="movement-search-results"
            >
              <p className="free-ai-subtitle" style={{ margin: 0 }}>
                {searchResult.querySummaryKo}
              </p>

              {searchResult.recommendations.length > 0 && (
                <ol className="free-ai-step-list" aria-label="추천 동작 목록">
                  {searchResult.recommendations.map((rec, idx) => {
                    const recEx = exercises.find((item) => item.id === rec.exerciseId);
                    return (
                    <li key={rec.exerciseId} className="free-ai-step-row">
                      <div>
                        <div className="pf-ai-step-3d-lead">
                          {recEx && (<ExerciseMotionArtwork
                            exercise={recEx}
                            className="pf-workbench-3d-mini-thumb"
                            data-testid="free-ai-rec-3d-thumb" />)}
                          <div>
                            <strong>
                              {idx + 1}. {rec.nameKo}
                            </strong>{' '}
                            <small>
                              ({rec.nameEn} · Lv.{rec.level} · {rec.springs})
                            </small>
                            {rec.springs && (
                              <div className="pf-class-badges-strip pf-class-badges-strip--compact">
                                <SpringVisualPills springs={rec.springs} />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="free-ai-subtitle" style={{ margin: '4px 0 2px' }}>
                          {rec.matchReasonKo}
                        </p>
                        <p className="free-ai-subtitle" style={{ margin: '2px 0' }}>
                          큐잉 포인트: {rec.cueHighlightKo}
                        </p>
                        <p className="free-ai-subtitle" style={{ margin: '2px 0 0' }}>
                          세팅 점검: {rec.setupCheckKo}
                        </p>
                      </div>
                      <div className="free-ai-actions">
                        <button
                          type="button"
                          className="free-ai-btn-primary"
                          aria-label={`${rec.nameKo} 수업안에 추가`}
                          onClick={() => {
                            const outcome = onAddExerciseToSequence?.(
                              rec.exerciseId,
                              rec.blockCategory,
                            );
                            if (
                              outcome === false ||
                              (outcome && typeof outcome === 'object' && !outcome.ok)
                            ) {
                              setAppliedToPlan(false);
                              setActionFeedback(null);
                              setErrorBanner(
                                (typeof outcome === 'object' && outcome.message) ||
                                  `'${rec.nameKo}' 동작을 현재 수업 조건에 추가하지 못했습니다. 기구·난이도·중복 여부를 확인해 주세요.`,
                              );
                              return;
                            }
                            setErrorBanner(null);
                            setAppliedToPlan(true);
                            setActionFeedback(
                              `'${rec.nameKo}' 동작을 현재 수업 시퀀스에 추가했습니다.`,
                            );
                          }}
                        >
                          수업안에 추가
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ol>
              )}

              <div className="free-ai-disclaimer">{searchResult.safetyDisclaimer}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
