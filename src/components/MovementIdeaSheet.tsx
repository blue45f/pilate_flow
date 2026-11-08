import React, { useId, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  GitBranch,
  History,
  ImagePlus,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/movement-idea-sheet.css';
import {
  PfAiStatusBadge,
  PfBadge,
  PfButton,
  PfCard,
  PfField,
  PfFormError,
  PfInput,
  PfSelect,
  PfStatusBanner,
  PfTextarea,
} from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  StepSideMode,
} from '../types/pilates';
import {
  addMovementIdeaToCurrentClass,
  calculateIdeaStepTimeBreakdown,
  clearMovementIdeaWorkingBuffer,
  forkMovementIdeaVariant,
  getMovementIdeaMeta,
  getReusableBlockTimingSummary,
  getSavedReusableBlocks,
  insertIdeaReusableBlockToCurrentClass,
  isMovementIdeaExercise,
  loadMovementIdeaWorkingBuffer,
  moveIdeaReusableBlockItem,
  restoreMovementIdeaRevision,
  saveIdeaToReusableBlock,
  saveMovementIdeaDraft,
  saveMovementIdeaWorkingBuffer,
} from '../utils/movementIdeaDraft';

export interface MovementIdeaSheetProps {
  open: boolean;
  initialExercise?: PilatesExercise | null;
  onClose: () => void;
  onAddedToClass?: (exercise: PilatesExercise) => void;
}

const SAMPLE_SKETCH_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140"><rect width="240" height="140" rx="14" fill="#F4F1E8"/><path d="M36 104 H204" stroke="#8C9A8E" stroke-width="3" stroke-linecap="round"/><circle cx="78" cy="54" r="12" fill="#173D34"/><path d="M78 66 C92 78, 118 78, 146 62 L178 88" fill="none" stroke="#173D34" stroke-width="5" stroke-linecap="round"/><text x="16" y="26" fill="#3D4F45" font-family="sans-serif" font-size="11">예시 동작 스케치 (로컬 보관)</text></svg>',
  );

const QUICK_FEELING_CHIPS = [
  '호흡 연결이 자연스러움',
  '가동 범위를 줄여야 편함',
  '골반 수평 유지 큐가 먼저 필요함',
] as const;

export const MovementIdeaSheet: React.FC<MovementIdeaSheetProps> = ({
  open,
  initialExercise = null,
  onClose,
  onAddedToClass,
}) => {
  const exercises = usePilatesStore((state) => state.exercises);
  const activeSteps = usePilatesStore((state) => state.activeSteps);
  const savedIdeaExercises = exercises.filter(isMovementIdeaExercise);

  const initialBuffer = loadMovementIdeaWorkingBuffer();
  const targetExercise =
    initialExercise ??
    (initialBuffer.editingExerciseId
      ? exercises.find((item) => item.id === initialBuffer.editingExerciseId) ?? null
      : null);
  const targetMeta = targetExercise ? getMovementIdeaMeta(targetExercise) : null;
  const shouldRestoreBuffer =
    !initialExercise || initialBuffer.editingExerciseId === initialExercise.id;

  const [editingId, setEditingId] = useState<string | null>(targetExercise?.id ?? null);
  const [ideaLine, setIdeaLine] = useState<string>(
    shouldRestoreBuffer && initialBuffer.ideaLine
      ? initialBuffer.ideaLine
      : targetMeta?.ideaLine ?? '',
  );
  const [workingTitle, setWorkingTitle] = useState<string>(
    shouldRestoreBuffer && initialBuffer.workingTitle
      ? initialBuffer.workingTitle
      : targetMeta?.workingTitle ?? '',
  );
  const [subjectiveFeeling, setSubjectiveFeeling] = useState<string>(
    shouldRestoreBuffer && initialBuffer.subjectiveFeeling
      ? initialBuffer.subjectiveFeeling
      : targetMeta?.subjectiveFeeling ?? '',
  );
  const [adjustmentNote, setAdjustmentNote] = useState<string>(
    shouldRestoreBuffer && initialBuffer.adjustmentNote
      ? initialBuffer.adjustmentNote
      : targetMeta?.adjustmentNote ?? '',
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(
    shouldRestoreBuffer && initialBuffer.photoDataUrl
      ? initialBuffer.photoDataUrl
      : targetMeta?.photoDataUrl ?? '',
  );
  const [triedByInstructor, setTriedByInstructor] = useState<boolean>(
    shouldRestoreBuffer && initialBuffer.triedByInstructor
      ? initialBuffer.triedByInstructor
      : targetMeta?.triedByInstructor ?? false,
  );
  const [apparatus, setApparatus] = useState<ApparatusType | ''>(
    shouldRestoreBuffer && initialBuffer.apparatus
      ? initialBuffer.apparatus
      : targetExercise?.apparatus ?? '',
  );
  const [durationMin, setDurationMin] = useState<string>(
    shouldRestoreBuffer && initialBuffer.durationMin
      ? initialBuffer.durationMin
      : String(targetExercise?.defaultDurationMin ?? 3),
  );
  const [level, setLevel] = useState<DifficultyLevel | ''>(
    shouldRestoreBuffer && initialBuffer.level
      ? initialBuffer.level
      : targetExercise?.level ?? '',
  );
  const [easyVariation, setEasyVariation] = useState<string>(
    shouldRestoreBuffer && initialBuffer.easyVariation
      ? initialBuffer.easyVariation
      : targetMeta?.easyVariation ?? '',
  );
  const [hardVariation, setHardVariation] = useState<string>(
    shouldRestoreBuffer && initialBuffer.hardVariation
      ? initialBuffer.hardVariation
      : targetMeta?.hardVariation ?? '',
  );
  const [variantLabelKo, setVariantLabelKo] = useState<string>(
    shouldRestoreBuffer && initialBuffer.variantLabelKo
      ? initialBuffer.variantLabelKo
      : targetMeta?.variantLabelKo ?? '',
  );
  const [repetitions, setRepetitions] = useState<string>(
    shouldRestoreBuffer && initialBuffer.repetitions
      ? initialBuffer.repetitions
      : targetMeta?.repetitions !== undefined
        ? String(targetMeta.repetitions)
        : '',
  );
  const [sets, setSets] = useState<string>(
    shouldRestoreBuffer && initialBuffer.sets
      ? initialBuffer.sets
      : targetMeta?.sets !== undefined
        ? String(targetMeta.sets)
        : '',
  );
  const [sideMode, setSideMode] = useState<StepSideMode | ''>(
    shouldRestoreBuffer && initialBuffer.sideMode
      ? initialBuffer.sideMode
      : targetMeta?.sideMode ?? '',
  );
  const [explanationSec, setExplanationSec] = useState<string>(
    shouldRestoreBuffer && initialBuffer.explanationSec
      ? initialBuffer.explanationSec
      : String(targetMeta?.explanationSec ?? 20),
  );
  const [transitionSec, setTransitionSec] = useState<string>(
    shouldRestoreBuffer && initialBuffer.transitionSec
      ? initialBuffer.transitionSec
      : String(targetMeta?.transitionSec ?? 15),
  );
  const [reusableBlockTitle, setReusableBlockTitle] = useState<string>('');
  const [reusableBlocks, setReusableBlocks] = useState(() => getSavedReusableBlocks());

  const [reflectionOpen, setReflectionOpen] = useState<boolean>(
    Boolean(
      targetExercise ||
        subjectiveFeeling ||
        adjustmentNote ||
        photoDataUrl ||
        triedByInstructor,
    ),
  );
  const [variantOpen, setVariantOpen] = useState<boolean>(
    Boolean(easyVariation || hardVariation || variantLabelKo),
  );
  const [hierarchyOpen, setHierarchyOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>(
    shouldRestoreBuffer && initialBuffer.ideaLine && !initialExercise
      ? '이전에 작성하던 초안을 복원했습니다. 이어서 작성하거나 바로 저장하세요.'
      : '',
  );

  const ideaInputId = useId();
  const ideaErrorId = useId();
  const feelingInputId = useId();
  const adjustmentInputId = useId();
  const ideaInputRef = useRef<HTMLTextAreaElement | null>(null);
  const reflectionDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const submitLockRef = useRef(false);

  const activeEditingExercise = editingId
    ? exercises.find((item) => item.id === editingId) ?? null
    : null;
  const activeEditingMeta = activeEditingExercise
    ? getMovementIdeaMeta(activeEditingExercise)
    : null;
  const currentRevision = activeEditingMeta?.revision ?? 1;
  const revisionHistory = activeEditingMeta?.revisionHistory ?? [];

  const parsedDurationNum = Number(durationMin);
  const parsedExplanationNum = Number(explanationSec);
  const parsedTransitionNum = Number(transitionSec);
  const stepTiming = calculateIdeaStepTimeBreakdown({
    durationMin: Number.isFinite(parsedDurationNum) ? parsedDurationNum : 3,
    explanationSec: Number.isFinite(parsedExplanationNum) ? parsedExplanationNum : 20,
    transitionSec: Number.isFinite(parsedTransitionNum) ? parsedTransitionNum : 15,
  });

  const syncBuffer = (next: Partial<Parameters<typeof saveMovementIdeaWorkingBuffer>[0]>) => {
    saveMovementIdeaWorkingBuffer({
      editingExerciseId: editingId,
      ideaLine,
      workingTitle,
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      triedByInstructor,
      apparatus,
      durationMin,
      level,
      easyVariation,
      hardVariation,
      variantLabelKo,
      repetitions,
      sets,
      sideMode,
      explanationSec,
      transitionSec,
      ...next,
    });
  };

  const loadExistingIdeaIntoForm = (exercise: PilatesExercise) => {
    const meta = getMovementIdeaMeta(exercise);
    setEditingId(exercise.id);
    setIdeaLine(meta.ideaLine);
    setWorkingTitle(meta.workingTitle);
    setSubjectiveFeeling(meta.subjectiveFeeling);
    setAdjustmentNote(meta.adjustmentNote);
    setPhotoDataUrl(meta.photoDataUrl);
    setTriedByInstructor(meta.triedByInstructor);
    setApparatus(exercise.apparatus);
    setDurationMin(String(exercise.defaultDurationMin || 3));
    setLevel(exercise.level);
    setEasyVariation(meta.easyVariation ?? '');
    setHardVariation(meta.hardVariation ?? '');
    setVariantLabelKo(meta.variantLabelKo ?? '');
    setRepetitions(meta.repetitions !== undefined ? String(meta.repetitions) : '');
    setSets(meta.sets !== undefined ? String(meta.sets) : '');
    setSideMode(meta.sideMode ?? '');
    setExplanationSec(String(meta.explanationSec ?? 20));
    setTransitionSec(String(meta.transitionSec ?? 15));
    setReflectionOpen(true);
    setError('');
    setStatusMessage(`‘${exercise.nameKo}’ 초안을 다시 열었습니다. 직접 해본 느낌이나 수정점을 적어보세요.`);
    saveMovementIdeaWorkingBuffer({
      editingExerciseId: exercise.id,
      ideaLine: meta.ideaLine,
      workingTitle: meta.workingTitle,
      subjectiveFeeling: meta.subjectiveFeeling,
      adjustmentNote: meta.adjustmentNote,
      photoDataUrl: meta.photoDataUrl,
      triedByInstructor: meta.triedByInstructor,
      apparatus: exercise.apparatus,
      durationMin: String(exercise.defaultDurationMin || 3),
      level: exercise.level,
      easyVariation: meta.easyVariation ?? '',
      hardVariation: meta.hardVariation ?? '',
      variantLabelKo: meta.variantLabelKo ?? '',
      repetitions: meta.repetitions !== undefined ? String(meta.repetitions) : '',
      sets: meta.sets !== undefined ? String(meta.sets) : '',
      sideMode: meta.sideMode ?? '',
      explanationSec: String(meta.explanationSec ?? 20),
      transitionSec: String(meta.transitionSec ?? 15),
    });
  };

  const handleSaveDraft = (andAddToClass = false) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError('');
    setStatusMessage('');

    try {
      const parsedDuration = Number(durationMin);
      const parsedReps = repetitions.trim() ? Number(repetitions) : undefined;
      const parsedSets = sets.trim() ? Number(sets) : undefined;
      const parsedExpl = explanationSec.trim() ? Number(explanationSec) : undefined;
      const parsedTrans = transitionSec.trim() ? Number(transitionSec) : undefined;

      const result = saveMovementIdeaDraft({
        existingExerciseId: editingId,
        ideaLine,
        workingTitle,
        subjectiveFeeling,
        adjustmentNote,
        photoDataUrl,
        triedByInstructor,
        apparatus,
        durationMin: Number.isFinite(parsedDuration) ? parsedDuration : 3,
        level,
        easyVariation,
        standardVariation: adjustmentNote,
        hardVariation,
        variantLabelKo,
        repetitions: parsedReps && Number.isFinite(parsedReps) ? parsedReps : undefined,
        sets: parsedSets && Number.isFinite(parsedSets) ? parsedSets : undefined,
        sideMode,
        explanationSec: parsedExpl !== undefined && Number.isFinite(parsedExpl) ? parsedExpl : undefined,
        transitionSec: parsedTrans !== undefined && Number.isFinite(parsedTrans) ? parsedTrans : undefined,
      });

      if (!result.success || !result.exercise) {
        setError(result.error || '초안을 저장하지 못했습니다. 입력 내용은 그대로 유지됩니다.');
        requestAnimationFrame(() => ideaInputRef.current?.focus());
        return;
      }

      setEditingId(result.exercise.id);

      if (andAddToClass) {
        const added = addMovementIdeaToCurrentClass(result.exercise.id);
        if (!added.success) {
          setError(added.message);
          return;
        }
        setStatusMessage(added.message);
        onAddedToClass?.(result.exercise);
        onClose();
        return;
      }

      setStatusMessage(
        editingId
          ? `‘${result.exercise.nameKo}’ 수정 내용을 저장했습니다 (v${result.meta?.revision ?? 1}). 바로 수업에 넣거나 창을 닫아도 보존됩니다.`
          : `‘${result.exercise.nameKo}’ 한 줄 초안을 저장했습니다! 직접 해본 뒤 느낀 점·수정점을 언제든 덧붙여 보세요.`,
      );
      setReflectionOpen(true);
      reflectionDetailsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleForkVariant = () => {
    setError('');
    setStatusMessage('');

    let sourceId = editingId;
    if (!sourceId) {
      const saved = saveMovementIdeaDraft({
        ideaLine,
        workingTitle,
        subjectiveFeeling,
        adjustmentNote,
        photoDataUrl,
        triedByInstructor,
        apparatus,
        durationMin: Number.isFinite(parsedDurationNum) ? parsedDurationNum : 3,
        level,
        easyVariation,
        hardVariation,
        variantLabelKo,
      });
      if (!saved.ok || !saved.exercise) {
        setError(saved.error || '변형을 파생하기 전에 한 줄 아이디어를 먼저 적어 주세요.');
        return;
      }
      sourceId = saved.exercise.id;
    }

    const label = variantLabelKo.trim() || '응용 변형';
    const forked = forkMovementIdeaVariant(sourceId, {
      variantLabelKo: label,
      ideaLine,
      workingTitle,
      easyVariation,
      standardVariation: adjustmentNote,
      hardVariation,
      apparatus,
      durationMin: Number.isFinite(parsedDurationNum) ? parsedDurationNum : 3,
      level,
    });

    if (!forked.ok || !forked.exercise) {
      setError(forked.message);
      return;
    }

    loadExistingIdeaIntoForm(forked.exercise);
    setVariantOpen(true);
    setStatusMessage(forked.message);
  };

  const handleRestoreRevision = (targetRevision: number) => {
    if (!editingId) return;
    setError('');
    const restored = restoreMovementIdeaRevision(editingId, targetRevision);
    if (!restored.ok || !restored.exercise) {
      setError(restored.message);
      return;
    }
    loadExistingIdeaIntoForm(restored.exercise);
    setVariantOpen(true);
    setStatusMessage(restored.message);
  };

  const ensureSavedBeforeBlockLink = (): string | null => {
    if (editingId && exercises.some((item) => item.id === editingId)) {
      return editingId;
    }
    const saved = saveMovementIdeaDraft({
      existingExerciseId: editingId,
      ideaLine,
      workingTitle,
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      triedByInstructor,
      apparatus,
      durationMin: Number.isFinite(parsedDurationNum) ? parsedDurationNum : 3,
      level,
      easyVariation,
      hardVariation,
      variantLabelKo,
      repetitions: repetitions.trim() ? Number(repetitions) : undefined,
      sets: sets.trim() ? Number(sets) : undefined,
      sideMode,
      explanationSec: stepTiming.explanationSec,
      transitionSec: stepTiming.transitionSec,
    });
    if (!saved.ok || !saved.exercise) {
      setError(saved.error || '재사용 블록으로 묶으려면 먼저 한 줄 아이디어를 적어 주세요.');
      return null;
    }
    setEditingId(saved.exercise.id);
    return saved.exercise.id;
  };

  const handleCreateReusableBlock = () => {
    setError('');
    const targetId = ensureSavedBeforeBlockLink();
    if (!targetId) return;

    const result = saveIdeaToReusableBlock({
      exerciseId: targetId,
      blockTitle: reusableBlockTitle.trim() || undefined,
      durationMin: stepTiming.durationMin,
      explanationSec: stepTiming.explanationSec,
      transitionSec: stepTiming.transitionSec,
      repetitions: repetitions.trim() ? Number(repetitions) : undefined,
      sets: sets.trim() ? Number(sets) : undefined,
      sideMode: sideMode || undefined,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReusableBlocks([...result.blocks]);
    setReusableBlockTitle('');
    setStatusMessage(result.message);
  };

  const handleAddToExistingReusableBlock = (blockId: string) => {
    setError('');
    const targetId = ensureSavedBeforeBlockLink();
    if (!targetId) return;

    const result = saveIdeaToReusableBlock({
      exerciseId: targetId,
      blockId,
      durationMin: stepTiming.durationMin,
      explanationSec: stepTiming.explanationSec,
      transitionSec: stepTiming.transitionSec,
      repetitions: repetitions.trim() ? Number(repetitions) : undefined,
      sets: sets.trim() ? Number(sets) : undefined,
      sideMode: sideMode || undefined,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReusableBlocks([...result.blocks]);
    setStatusMessage(result.message);
  };

  const handleMoveBlockItem = (blockId: string, itemIndex: number, direction: 'up' | 'down') => {
    const result = moveIdeaReusableBlockItem(blockId, itemIndex, direction);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReusableBlocks([...result.blocks]);
    setStatusMessage(result.message);
  };

  const handleInsertBlockToClass = (blockId: string) => {
    const result = insertIdeaReusableBlockToCurrentClass(blockId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatusMessage(result.message);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setPhotoDataUrl(dataUrl);
      setTriedByInstructor(true);
      syncBuffer({ photoDataUrl: dataUrl, triedByInstructor: true });
    };
    reader.readAsDataURL(file);
  };

  const handleResetFormForNewIdea = () => {
    clearMovementIdeaWorkingBuffer();
    setEditingId(null);
    setIdeaLine('');
    setWorkingTitle('');
    setSubjectiveFeeling('');
    setAdjustmentNote('');
    setPhotoDataUrl('');
    setTriedByInstructor(false);
    setApparatus('');
    setDurationMin('3');
    setLevel('');
    setEasyVariation('');
    setHardVariation('');
    setVariantLabelKo('');
    setRepetitions('');
    setSets('');
    setSideMode('');
    setExplanationSec('20');
    setTransitionSec('15');
    setError('');
    setStatusMessage('새 한 줄 아이디어를 적을 수 있도록 입력창을 비웠습니다.');
    requestAnimationFrame(() => ideaInputRef.current?.focus());
  };

  const isAlreadyInClass = Boolean(
    editingId && activeSteps.some((step) => step.exerciseId === editingId),
  );

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      onBeforeClose={({ close }) => {
        close();
        onClose();
        return false;
      }}
      variant="sheet"
      title={editingId ? '내 동작 메모 수정 · 수업에 넣기' : '새 동작 메모'}
      subtitle="한 줄부터 시작하세요. 추가 정보는 나중에 적어도 돼요."
      maxWidth="640px"
      className="pf-movement-idea-dialog pf-idea-sheet-dialog"
    >
      <div className="pf-idea-sheet" data-testid="movement-idea-sheet">
        {statusMessage && (
          <PfStatusBanner tone="success" role="status">
            {statusMessage}
          </PfStatusBanner>
        )}

        {error && <PfFormError id={ideaErrorId}>{error}</PfFormError>}

        <form
          className="pf-idea-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveDraft(false);
          }}
        >
          <PfCard className="pf-idea-step-card">
            <div className="pf-idea-step-header">
              {editingId && (
                <PfBadge tone="success">저장된 초안 편집 중 (v{currentRevision})</PfBadge>
              )}
            </div>
            <PfField label="떠오른 동작 아이디어 한 줄" htmlFor={ideaInputId} required>
              <PfTextarea
                ref={ideaInputRef}
                id={ideaInputId}
                aria-label="한 줄 아이디어"
                hasError={Boolean(error)}
                aria-describedby={error ? ideaErrorId : undefined}
                rows={3}
                value={ideaLine}
                onChange={(event) => {
                  const next = event.target.value;
                  setIdeaLine(next);
                  if (error) setError('');
                  syncBuffer({ ideaLine: next });
                }}
                placeholder="예: 리포머 롱박스 위에서 한 팔 당기며 흉추 회전해보기"
              />
            </PfField>

            <details className="pf-idea-note-guidance">
              <summary>개인 아이디어 메모 · 안전성 검증 아님</summary>
              <div className="pf-idea-trust-banner" role="note" aria-label="창작 메모 안내">
                <PfAiStatusBadge kind="creative-memo">내 창작 초안 · 주관적 메모</PfAiStatusBadge>
                <span>
                  강사 본인의 구상과 주관적 체감을 기록하는 공간입니다. 객관적 운동 효과 판정,
                  안전성 보장, 또는 전문가 검증을 뜻하지 않습니다.
                </span>
              </div>
            </details>
          </PfCard>

          <details
            ref={reflectionDetailsRef}
            className="pf-idea-progressive-section"
            open={reflectionOpen}
            onToggle={(event) => setReflectionOpen(event.currentTarget.open)}
          >
            <summary className="pf-idea-progressive-summary">
              <span>
                <Sparkles size={16} aria-hidden="true" />
                직접 해본 느낌 · 수정할 점 · 사진
              </span>
              <PfBadge
                tone={triedByInstructor || subjectiveFeeling || adjustmentNote ? 'sage' : 'neutral'}
              >
                {triedByInstructor || subjectiveFeeling || adjustmentNote
                  ? '작성됨'
                  : '나중에 써도 됨'}
              </PfBadge>
            </summary>

            <div className="pf-idea-progressive-body">
              <label className="pf-idea-checkbox-row">
                <input
                  type="checkbox"
                  checked={triedByInstructor}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setTriedByInstructor(checked);
                    syncBuffer({ triedByInstructor: checked });
                  }}
                />
                <span>
                  내가 직접 움직여 보고 확인했어요 (전문가 검증·안전성 보장이 아닌 내 연습 기록)
                </span>
              </label>

              <PfField
                as="div"
                label="직접 해본 느낌 (주관적 체감 · 선택)"
                htmlFor={feelingInputId}
                hint="주관적 느낌은 객관적 운동 효과 판정과 구분되어 내 참고 메모로만 기록됩니다."
              >
                <div
                  className="pf-idea-quick-chips"
                  role="group"
                  aria-label="자주 쓰는 느낌 빠른 입력"
                >
                  {QUICK_FEELING_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="pf-idea-chip"
                      onClick={() => {
                        const next = subjectiveFeeling.trim()
                          ? `${subjectiveFeeling.trim()} · ${chip}`
                          : chip;
                        setSubjectiveFeeling(next);
                        setTriedByInstructor(true);
                        syncBuffer({ subjectiveFeeling: next, triedByInstructor: true });
                      }}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <PfTextarea
                  id={feelingInputId}
                  aria-label="직접 해본 느낌"
                  rows={3}
                  value={subjectiveFeeling}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSubjectiveFeeling(next);
                    if (next.trim()) setTriedByInstructor(true);
                    syncBuffer({
                      subjectiveFeeling: next,
                      triedByInstructor: Boolean(next.trim() || triedByInstructor),
                    });
                  }}
                  placeholder="예: 왼쪽 갈비뼈가 먼저 들리는 느낌이 들어서 날숨 큐를 먼저 줘야 편했음"
                />
              </PfField>

              <PfField
                label="수정할 점 · 수업 적용 메모 (선택)"
                htmlFor={adjustmentInputId}
                hint="다음에 다시 해볼 때 바꿀 세팅이나 수업할 때 주의할 점을 적어두세요."
              >
                <PfTextarea
                  id={adjustmentInputId}
                  aria-label="수정할 점"
                  rows={3}
                  value={adjustmentNote}
                  onChange={(event) => {
                    const next = event.target.value;
                    setAdjustmentNote(next);
                    if (next.trim()) setTriedByInstructor(true);
                    syncBuffer({
                      adjustmentNote: next,
                      triedByInstructor: Boolean(next.trim() || triedByInstructor),
                    });
                  }}
                  placeholder="예: 스프링을 1B로 낮추고 가동 범위를 절반으로 줄여서 안내하기"
                />
              </PfField>

              <div className="pf-idea-photo-box">
                <div className="pf-idea-photo-header">
                  <strong>
                    <Camera size={15} aria-hidden="true" /> 참고 사진 · 자세 스케치 (선택 · 이
                    기기에만 저장)
                  </strong>
                  <span className="muted">외부 AI나 서버로 전송되지 않습니다.</span>
                </div>
                <div className="pf-idea-photo-actions">
                  <label className="pf-btn pf-btn--secondary pf-btn--sm pf-idea-file-label">
                    <ImagePlus size={15} aria-hidden="true" />
                    <span>사진 파일 선택</span>
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="참고 사진 선택"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  <PfButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhotoDataUrl(SAMPLE_SKETCH_DATA_URL);
                      setTriedByInstructor(true);
                      syncBuffer({ photoDataUrl: SAMPLE_SKETCH_DATA_URL, triedByInstructor: true });
                    }}
                  >
                    예시 자세 스케치 넣기
                  </PfButton>
                  {photoDataUrl && (
                    <PfButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPhotoDataUrl('');
                        syncBuffer({ photoDataUrl: '' });
                      }}
                    >
                      <Trash2 size={14} /> 사진 지우기
                    </PfButton>
                  )}
                </div>
                {photoDataUrl && (
                  <div className="pf-idea-photo-preview">
                    <img src={photoDataUrl} alt="내 동작 참고 스케치 미리보기" />
                  </div>
                )}
              </div>
            </div>
          </details>

          <details
            className="pf-idea-progressive-section"
            open={variantOpen}
            onToggle={(event) => setVariantOpen(event.currentTarget.open)}
          >
            <summary className="pf-idea-progressive-summary">
              <span>
                <GitBranch size={16} aria-hidden="true" />
                변형 · 이전 버전
              </span>
              <PfBadge
                tone={
                  easyVariation || hardVariation || variantLabelKo || currentRevision > 1
                    ? 'sage'
                    : 'neutral'
                }
              >
                v{currentRevision}
              </PfBadge>
            </summary>
            <div className="pf-idea-progressive-body">
              <p className="muted">
                원본 동작을 유지한 채 쉬운·심화 변형을 적거나 새 변형 초안으로 파생(복제)할 수
                있습니다. 버전을 되돌려도 이미 기록된 과거 수업 스냅샷은 바뀌지 않습니다.
              </p>
              <div className="teaching-form-grid">
                <PfField
                  label="변형 구분 이름 (선택)"
                  hint="파생 변형으로 복제할 때 이름 뒤에 붙는 구분 라벨입니다."
                >
                  <PfInput
                    aria-label="변형 구분 이름"
                    value={variantLabelKo}
                    onChange={(event) => {
                      const next = event.target.value;
                      setVariantLabelKo(next);
                      syncBuffer({ variantLabelKo: next });
                    }}
                    placeholder="예: 초보자 가동범위 축소 변형"
                  />
                </PfField>
                <PfField label="쉬운 변형 메모 (Easy · 선택)">
                  <PfInput
                    aria-label="쉬운 변형 메모"
                    value={easyVariation}
                    onChange={(event) => {
                      const next = event.target.value;
                      setEasyVariation(next);
                      syncBuffer({ easyVariation: next });
                    }}
                    placeholder="예: 무릎을 굽히고 지지면을 넓혀 진행"
                  />
                </PfField>
                <PfField label="심화 변형 메모 (Hard · 선택)">
                  <PfInput
                    aria-label="심화 변형 메모"
                    value={hardVariation}
                    onChange={(event) => {
                      const next = event.target.value;
                      setHardVariation(next);
                      syncBuffer({ hardVariation: next });
                    }}
                    placeholder="예: 정점에서 3초 버티기 및 한 팔 지지"
                  />
                </PfField>
              </div>

              <div className="pf-idea-photo-actions">
                <PfButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  data-testid="idea-fork-variant"
                  onClick={handleForkVariant}
                >
                  <GitBranch size={14} /> 새 변형 초안으로 복제
                </PfButton>
                {activeEditingMeta?.parentDraftId && (
                  <PfBadge tone="sage">
                    파생 변형 (원본 v{activeEditingMeta.parentDraftRevision ?? 1} 기반)
                  </PfBadge>
                )}
              </div>

              {revisionHistory.length > 0 && (
                <div className="pf-idea-revision-box" aria-label="초안 버전 이력">
                  <strong>
                    <History size={14} aria-hidden="true" /> 버전 이력 ({revisionHistory.length}개 ·
                    현재 v{currentRevision})
                  </strong>
                  <ul className="pf-idea-revision-list">
                    {revisionHistory.map((entry) => (
                      <li key={entry.revision} className="pf-idea-revision-item">
                        <span>
                          <strong>v{entry.revision}</strong> · {entry.summaryKo}
                        </span>
                        {entry.revision !== currentRevision && (
                          <PfButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`v${entry.revision} 버전으로 복원`}
                            onClick={() => handleRestoreRevision(entry.revision)}
                          >
                            v{entry.revision} 복원
                          </PfButton>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>

          <details
            className="pf-idea-progressive-section"
            open={hierarchyOpen}
            onToggle={(event) => setHierarchyOpen(event.currentTarget.open)}
          >
            <summary className="pf-idea-progressive-summary">
              <span>
                <Layers size={16} aria-hidden="true" />
                순서 · 반복 · 좌우 · 동작 묶음
              </span>
              <PfBadge tone="neutral">선택</PfBadge>
            </summary>
            <div className="pf-idea-progressive-body">
              <p className="muted">
                처음부터 계층을 배울 필요 없이 필요할 때만 펼쳐서 하위 시간 합산과 재사용 블록
                묶음을 설정하세요. 블록을 수업에 넣으면 독립 복사본으로 들어가며 과거 수업은 절대
                바뀌지 않습니다.
              </p>

              <div
                className="pf-idea-time-summary"
                data-testid="idea-time-breakdown"
                role="region"
                aria-label="하위 시간 자동 합산"
              >
                <strong>
                  하위 시간 합산: 총 {stepTiming.totalSec}초 ({stepTiming.durationMin}분)
                </strong>
                <span>
                  순수 동작 {stepTiming.movementSec}초 + 설명 {stepTiming.explanationSec}초 + 전환{' '}
                  {stepTiming.transitionSec}초
                </span>
              </div>

              <div className="teaching-form-grid">
                <PfField label="반복 횟수 (회 · 선택)">
                  <PfInput
                    type="number"
                    min={1}
                    max={1000}
                    aria-label="반복 횟수"
                    value={repetitions}
                    onChange={(event) => {
                      const next = event.target.value;
                      setRepetitions(next);
                      syncBuffer({ repetitions: next });
                    }}
                    placeholder="예: 8"
                  />
                </PfField>
                <PfField label="세트 수 (선택)">
                  <PfInput
                    type="number"
                    min={1}
                    max={100}
                    aria-label="세트 수"
                    value={sets}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSets(next);
                      syncBuffer({ sets: next });
                    }}
                    placeholder="예: 2"
                  />
                </PfField>
                <PfField label="좌우 수행 방식 (선택)">
                  <PfSelect
                    aria-label="좌우 수행 방식"
                    value={sideMode}
                    onChange={(event) => {
                      const next = event.target.value as StepSideMode | '';
                      setSideMode(next);
                      syncBuffer({ sideMode: next });
                    }}
                  >
                    <option value="">동작 기본 (양쪽 함께)</option>
                    <option value="together">양쪽 함께 (together)</option>
                    <option value="left-then-right">왼쪽 먼저 → 오른쪽 (left-then-right)</option>
                    <option value="right-then-left">오른쪽 먼저 → 왼쪽 (right-then-left)</option>
                    <option value="left">왼쪽만 (left)</option>
                    <option value="right">오른쪽만 (right)</option>
                  </PfSelect>
                </PfField>
                <PfField label="설명 시간 · 초 (선택)">
                  <PfInput
                    type="number"
                    min={0}
                    max={600}
                    aria-label="설명 시간 (초)"
                    value={explanationSec}
                    onChange={(event) => {
                      const next = event.target.value;
                      setExplanationSec(next);
                      syncBuffer({ explanationSec: next });
                    }}
                  />
                </PfField>
                <PfField label="전환 시간 · 초 (선택)">
                  <PfInput
                    type="number"
                    min={0}
                    max={600}
                    aria-label="전환 시간 (초)"
                    value={transitionSec}
                    onChange={(event) => {
                      const next = event.target.value;
                      setTransitionSec(next);
                      syncBuffer({ transitionSec: next });
                    }}
                  />
                </PfField>
              </div>

              <div className="pf-idea-reusable-block-box" aria-label="재사용 블록 관리">
                <div className="pf-idea-photo-header">
                  <strong>재사용 블록으로 묶기 (동작 → 재사용 블록 → 시퀀스 → 수업)</strong>
                  <span className="muted">
                    블록 템플릿을 수정해도 이미 수업에 복사된 단계나 과거 수업 기록은 바뀌지
                    않습니다.
                  </span>
                </div>
                <div className="teaching-form-grid">
                  <PfField label="새 재사용 블록 이름 (선택)">
                    <PfInput
                      aria-label="재사용 블록 이름"
                      value={reusableBlockTitle}
                      onChange={(event) => setReusableBlockTitle(event.target.value)}
                      placeholder="예: 리포머 흉추 회전 워밍업 묶음"
                    />
                  </PfField>
                </div>
                <div className="pf-idea-photo-actions">
                  <PfButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    data-testid="create-reusable-block-btn"
                    onClick={handleCreateReusableBlock}
                  >
                    <Layers size={14} /> 현재 동작으로 재사용 블록 만들기
                  </PfButton>
                </div>

                {reusableBlocks.length > 0 && (
                  <div className="pf-idea-block-list" data-testid="saved-reusable-blocks">
                    {reusableBlocks.map((block) => {
                      const summary = getReusableBlockTimingSummary(block);
                      return (
                        <PfCard key={block.id} variant="subtle" className="pf-idea-block-card">
                          <div className="pf-idea-saved-card__top">
                            <strong>
                              {block.title} (v{block.version})
                            </strong>
                            <PfBadge tone="sage">
                              총 {summary.totalDurationMin}분 ({summary.totalSec}초) · 동작{' '}
                              {summary.movementSec}초 + 설명 {summary.explanationSec}초 + 전환{' '}
                              {summary.transitionSec}초
                            </PfBadge>
                          </div>
                          <ul className="pf-idea-block-items">
                            {summary.itemBreakdowns.map((item, idx) => (
                              <li key={item.itemId} className="pf-idea-block-item">
                                <span>
                                  {idx + 1}. {item.nameKo} ({item.durationMin}분 ·{' '}
                                  {item.sideMode === 'together' ? '양쪽' : item.sideMode}
                                  {item.repetitions ? ` · ${item.repetitions}회` : ''}
                                  {item.sets ? `×${item.sets}세트` : ''})
                                </span>
                                {summary.itemBreakdowns.length > 1 && (
                                  <span className="pf-idea-block-item-actions">
                                    <PfButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={idx === 0}
                                      aria-label={`${block.title} ${idx + 1}번 동작 위로`}
                                      onClick={() => handleMoveBlockItem(block.id, idx, 'up')}
                                    >
                                      <ArrowUp size={13} />
                                    </PfButton>
                                    <PfButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={idx === summary.itemBreakdowns.length - 1}
                                      aria-label={`${block.title} ${idx + 1}번 동작 아래로`}
                                      onClick={() => handleMoveBlockItem(block.id, idx, 'down')}
                                    >
                                      <ArrowDown size={13} />
                                    </PfButton>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div className="pf-idea-saved-actions">
                            <PfButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              aria-label={`${block.title} 블록에 현재 동작 추가`}
                              onClick={() => handleAddToExistingReusableBlock(block.id)}
                            >
                              <Plus size={14} /> 이 블록에 현재 동작 추가
                            </PfButton>
                            <PfButton
                              type="button"
                              variant="primary"
                              size="sm"
                              aria-label={`${block.title} 수업 시퀀스에 블록 복사해 넣기`}
                              onClick={() => handleInsertBlockToClass(block.id)}
                            >
                              <Play size={14} /> 수업 시퀀스에 블록 복사해 넣기
                            </PfButton>
                          </div>
                        </PfCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </details>

          <details className="pf-idea-progressive-section">
            <summary className="pf-idea-progressive-summary">
              <span>이름 · 기구 · 시간</span>
              <PfBadge tone="neutral">선택</PfBadge>
            </summary>
            <div className="pf-idea-progressive-body teaching-form-grid">
              <PfField
                label="부르기 쉬운 임시 이름 (선택)"
                hint="비워두면 한 줄 아이디어가 그대로 제목이 됩니다."
              >
                <PfInput
                  aria-label="임시 이름"
                  value={workingTitle}
                  onChange={(event) => {
                    const next = event.target.value;
                    setWorkingTitle(next);
                    syncBuffer({ workingTitle: next });
                  }}
                  placeholder="예: 롱박스 한 팔 회전"
                />
              </PfField>
              <PfField label="사용 기구 (선택)">
                <PfSelect
                  aria-label="사용 기구 (선택)"
                  value={apparatus}
                  onChange={(event) => {
                    const next = event.target.value as ApparatusType | '';
                    setApparatus(next);
                    syncBuffer({ apparatus: next });
                  }}
                >
                  <option value="">현재 수업 기구에 자동 맞춤</option>
                  <option value="mat">매트 (Mat)</option>
                  <option value="reformer">리포머 (Reformer)</option>
                  <option value="cadillac">캐딜락 (Cadillac)</option>
                  <option value="chair">체어 (Chair)</option>
                  <option value="barrel">바렐 (Barrel)</option>
                </PfSelect>
              </PfField>
              <PfField label="예상 시간 · 분 (선택)">
                <PfInput
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  aria-label="예상 시간 (분)"
                  value={durationMin}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDurationMin(next);
                    syncBuffer({ durationMin: next });
                  }}
                />
              </PfField>
            </div>
          </details>

          <div className="pf-idea-footer-bar">
            <div className="pf-idea-footer-secondary">
              <PfButton type="button" variant="ghost" size="sm" onClick={onClose}>
                나중에 이어서 쓰기
              </PfButton>
              {(ideaLine || subjectiveFeeling || adjustmentNote || editingId) && (
                <PfButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFormForNewIdea}
                >
                  <RotateCcw size={14} /> 새 초안 쓰기
                </PfButton>
              )}
            </div>
            <div className="pf-idea-footer-primary">
              <PfButton type="submit" variant="secondary" data-testid="idea-save-draft">
                {editingId ? '수정 내용 저장' : '초안 저장'}
              </PfButton>
              <PfButton
                type="button"
                variant="primary"
                data-testid="idea-save-and-add"
                onClick={() => handleSaveDraft(true)}
              >
                <Play size={15} />
                {isAlreadyInClass ? '수정 후 수업에 반영' : '저장하고 수업에 넣기'}
              </PfButton>
            </div>
          </div>
        </form>

        {savedIdeaExercises.length > 0 && (
          <section className="pf-idea-saved-list" aria-label="내가 저장한 새 동작 메모">
            <div className="pf-idea-saved-header">
              <h3>내가 저장한 새 동작 메모 ({savedIdeaExercises.length})</h3>
              <span className="muted">눌러서 다시 열거나 바로 수업에 넣을 수 있어요</span>
            </div>
            <div className="pf-idea-saved-items">
              {savedIdeaExercises.map((item) => {
                const meta = getMovementIdeaMeta(item);
                const inClass = activeSteps.some((step) => step.exerciseId === item.id);
                const isSelected = editingId === item.id;
                return (
                  <PfCard
                    key={item.id}
                    variant={isSelected ? 'muted' : 'subtle'}
                    className="pf-idea-saved-card pf-movement-card pf-movement-card--idea"
                  >
                    <div className="pf-idea-saved-card__top">
                      <strong>
                        {item.nameKo} (v{meta.revision ?? 1})
                      </strong>
                      <div className="pf-idea-saved-badges">
                        <PfAiStatusBadge kind={meta.triedByInstructor ? 'tried-memo' : 'creative-memo'}>
                          {meta.triedByInstructor ? '직접 해봄 · 주관적 메모' : '아이디어 초안'}
                        </PfAiStatusBadge>
                        {meta.parentDraftId && (
                          <PfBadge tone="sage">
                            변형 파생
                          </PfBadge>
                        )}
                        {inClass && <PfBadge tone="success">수업에 담김</PfBadge>}
                      </div>
                    </div>
                    <p className="pf-idea-saved-line">{meta.ideaLine}</p>
                    {meta.subjectiveFeeling && (
                      <p className="pf-idea-saved-sub">
                        <strong>내 느낌:</strong> {meta.subjectiveFeeling}
                      </p>
                    )}
                    {meta.adjustmentNote && (
                      <p className="pf-idea-saved-sub">
                        <strong>수정할 점:</strong> {meta.adjustmentNote}
                      </p>
                    )}
                    <div className="pf-idea-saved-actions">
                      <PfButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => loadExistingIdeaIntoForm(item)}
                      >
                        다시 열기 · 느낌/수정 추가
                      </PfButton>
                      <PfButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const res = addMovementIdeaToCurrentClass(item.id);
                          if (res.success) {
                            setStatusMessage(res.message);
                            onAddedToClass?.(item);
                            onClose();
                          }
                        }}
                      >
                        <Plus size={14} /> {inClass ? '수업에 반영됨' : '수업에 넣기'}
                      </PfButton>
                    </div>
                  </PfCard>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </LightDismissDialog>
  );
};
