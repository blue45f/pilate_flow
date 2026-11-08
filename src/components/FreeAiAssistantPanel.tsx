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
  EditableSequenceComposeResult,
  FreeAiQuotaStatus,
  FreeAiStudioContextContract,
  FreeAiTaskKind,
  MovementIdeaInput,
  StrengthenArea,
} from '../types/freeAiAssistant';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
} from '../types/pilates';
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
  onApplyConditionTemplate,
  onSaveConditionTemplate,
  uiContract,
  client = defaultFreeAiClient,
  initialTab,
}: FreeAiAssistantPanelProps) {
  const [savedDraft] = useState<Partial<FreeAiDraftSnapshot> | null>(() => readFreeAiDraft());
  const [activeTab, setActiveTab] = useState<FreeAiTaskKind>(() => {
    if (initialTab) return initialTab;
    const savedTab = savedDraft?.activeTab;
    if (
      savedTab === 'class-draft' ||
      savedTab === 'movement-idea' ||
      savedTab === 'sequence-compose'
    ) {
      return savedTab;
    }
    return 'class-draft';
  });
  const [quotaStatus, setQuotaStatus] = useState<FreeAiQuotaStatus>(
    () => client.getQuotaStatus() ?? createDefaultFreeAiStatus(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  // Invalidate tab-scoped feedback when navigation interrupts an async request.
  const tabRevision = useRef(0);
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

  const draftHealthInspection = useMemo(() => inspectSensitiveHealthText(draftTheme), [draftTheme]);
  const ideaHealthInspection = useMemo(
    () => inspectSensitiveHealthText(`${rawIdeaText} ${baseExerciseName}`),
    [rawIdeaText, baseExerciseName],
  );
  const composeHealthInspection = useMemo(
    () => inspectSensitiveHealthText(composeTheme),
    [composeTheme],
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

  const runClassDraft = async (preferLocalOnly: boolean) => {
    const requestTabRevision = tabRevision.current;
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (!preferLocalOnly && draftHealthInspection.hasSensitiveData) {
      setErrorBanner(draftHealthInspection.warningMessageKo);
      return;
    }
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
      });
      setQuotaStatus(response.status);
      if (requestTabRevision !== tabRevision.current) return;
      setClassDraftResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '수업 초안을 만들었습니다. 수업에 맞게 편집해 주세요.'
          : response.result.cached
            ? '캐시된 무료 AI 수업 초안을 불러왔습니다 (무료 한도 차감 없음).'
            : '무료 AI로 편집 가능한 수업 초안을 만들었습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (requestTabRevision !== tabRevision.current) return;
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '수업 초안 요청 중 오류가 발생했습니다.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runMovementIdea = async (preferLocalOnly: boolean) => {
    const requestTabRevision = tabRevision.current;
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
      const response = await client.requestMovementIdea(input, { preferLocalOnly });
      setQuotaStatus(response.status);
      if (requestTabRevision !== tabRevision.current) return;
      setMovementIdeaResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '동작 아이디어와 3단계 변형을 정리했습니다.'
          : response.result.cached
            ? '캐시된 무료 AI 동작 아이디어·변형 제안을 불러왔습니다.'
            : '무료 AI로 새 동작 아이디어와 3단계 변형을 정리했습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (requestTabRevision !== tabRevision.current) return;
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '동작 아이디어 정리 중 오류가 발생했습니다.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runSequenceCompose = async (preferLocalOnly: boolean) => {
    const requestTabRevision = tabRevision.current;
    setErrorBanner(null);
    setActionFeedback(null);
    setAppliedToPlan(false);
    if (!preferLocalOnly && composeHealthInspection.hasSensitiveData) {
      setErrorBanner(composeHealthInspection.warningMessageKo);
      return;
    }
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
        { preferLocalOnly },
      );
      setQuotaStatus(response.status);
      if (requestTabRevision !== tabRevision.current) return;
      setComposeResult(response.result);
      setActionFeedback(
        response.usedLocalFallback
          ? '검토 완료 동작·블록으로 시퀀스를 구성했습니다.'
          : response.result.cached
            ? '캐시된 무료 AI 시퀀스 구성을 불러왔습니다.'
            : '무료 AI로 검토 완료 동작·블록 시퀀스를 구성했습니다.',
      );
    } catch (error) {
      setQuotaStatus(client.getQuotaStatus());
      if (requestTabRevision !== tabRevision.current) return;
      if (error instanceof FreeAiClientError) {
        setErrorBanner(error.message);
      } else {
        setErrorBanner(
          error instanceof Error ? error.message : '시퀀스 구성 중 오류가 발생했습니다.',
        );
      }
    } finally {
      setIsLoading(false);
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
        <p className="free-ai-subtitle">
          현재 조건에 해당하는 검토 완료(Approved) 동작이 없습니다. 동작 라이브러리에서 검토를
          완료한 뒤 다시 구성해 주세요.
        </p>
      );
    }
    return (
      <ol className="free-ai-step-list" aria-label="편집 가능한 시퀀스 단계">
        {steps.map((step, index) => (
          <li key={step.stepId} className="free-ai-step-row">
            <div>
              <strong>
                {index + 1}. {step.nameKo}
              </strong>{' '}
              <small>({step.blockCategory})</small>
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
        ))}
      </ol>
    );
  };

  const externalAiDisabledOrExhausted = !quotaStatus.enabled || quotaStatus.exhausted;
  const recommendationModeLabel = externalAiDisabledOrExhausted
    ? '조건 기반 추천'
    : errorBanner
      ? 'AI 응답 확인 필요'
      : 'AI 초안';
  const hasCurrentTabResult =
    (activeTab === 'class-draft' && Boolean(classDraftResult)) ||
    (activeTab === 'movement-idea' && Boolean(movementIdeaResult)) ||
    (activeTab === 'sequence-compose' && Boolean(composeResult));

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
            <span className="free-ai-badge">{recommendationModeLabel}</span>
          )}
        </div>
      </header>

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
            description: `${UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER} 또한 회원의 실명, 연락처, 디스크·수술·임신·통증 등 민감 건강정보는 무료 외부 AI로 전송하지 마세요.`,
            children: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
          })
        ) : (
          <>
            <strong>안전·운동 효과 미보장 및 민감 건강정보 전송 금지 안내:</strong>{' '}
            {UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER} 또한 회원의 실명, 연락처, 디스크·수술·임신·통증
            등 민감 건강정보는 무료 외부 AI로 전송하지 마세요.
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
            tabRevision.current += 1;
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
            tabRevision.current += 1;
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
            tabRevision.current += 1;
            setActiveTab('sequence-compose');
            setErrorBanner(null);
            setActionFeedback(null);
            setAppliedToPlan(false);
          }}
        >
          3. 검토 동작·블록 시퀀스 구성
        </button>
      </div>

      {isLoading && (
        <div
          className="free-ai-status-banner is-loading"
          data-testid="free-ai-loading-banner"
          aria-live="polite"
        >
          초안을 준비하고 있습니다. 잠시만 기다려 주세요…
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

              {renderStepsEditor(
                classDraftResult.steps,
                updateStepInClassDraft,
                removeStepInClassDraft,
                moveStepInClassDraft,
              )}

              <div className="free-ai-disclaimer">{classDraftResult.safetyDisclaimer}</div>

              <div className="free-ai-actions">
                <button
                  type="button"
                  className="free-ai-btn-primary"
                  disabled={classDraftResult.steps.length === 0}
                  onClick={() => {
                    onApplyDraftSequence?.({
                      title: classDraftResult.title,
                      subtitle: classDraftResult.subtitle,
                      targetMinutes: classDraftResult.targetMinutes,
                      level: classDraftResult.level,
                      apparatus: classDraftResult.apparatus,
                      steps: editableStepsToSequenceSteps(classDraftResult.steps),
                    });
                    setAppliedToPlan(true);
                    setActionFeedback('편집한 수업 초안을 현재 워크벤치에 반영했습니다.');
                  }}
                >
                  워크벤치 수업안에 반영
                </button>
              </div>
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
                <span className="free-ai-badge is-warning">
                  미검토 창작 동작 · 안전 및 운동 효과 보장 안 함
                </span>
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

              <div className="free-ai-actions">
                <button
                  type="button"
                  className="free-ai-btn-primary"
                  disabled={composeResult.steps.length === 0}
                  onClick={() => {
                    onApplyDraftSequence?.({
                      title: composeResult.title,
                      subtitle: composeResult.subtitle,
                      targetMinutes: composeResult.targetMinutes,
                      level: composeResult.level,
                      apparatus: composeResult.apparatus,
                      steps: editableStepsToSequenceSteps(composeResult.steps),
                    });
                    setAppliedToPlan(true);
                    setActionFeedback('구성한 시퀀스를 현재 워크벤치에 반영했습니다.');
                  }}
                >
                  워크벤치 수업안에 반영
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
