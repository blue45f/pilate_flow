import React, { useId, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Play, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { LightDismissDialog } from './LightDismissDialog';
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
import type { ApparatusType, DifficultyLevel, PilatesExercise } from '../types/pilates';
import {
  addMovementIdeaToCurrentClass,
  clearMovementIdeaWorkingBuffer,
  getMovementIdeaMeta,
  isMovementIdeaExercise,
  loadMovementIdeaWorkingBuffer,
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
  const [reflectionOpen, setReflectionOpen] = useState<boolean>(
    Boolean(
      targetExercise ||
        subjectiveFeeling ||
        adjustmentNote ||
        photoDataUrl ||
        triedByInstructor,
    ),
  );
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
  const submitLockRef = useRef(false);

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
    });
  };

  const handleSaveDraft = (andAddToClass = false) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError('');
    setStatusMessage('');

    try {
      const parsedDuration = Number(durationMin);
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
          ? `‘${result.exercise.nameKo}’ 수정 내용을 저장했습니다. 바로 수업에 넣거나 창을 닫아도 보존됩니다.`
          : `‘${result.exercise.nameKo}’ 한 줄 초안을 저장했습니다! 직접 해본 뒤 느낀 점·수정점을 언제든 덧붙여 보세요.`,
      );
      setReflectionOpen(true);
    } finally {
      submitLockRef.current = false;
    }
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
      title={editingId ? '내 동작 메모 수정 · 수업에 넣기' : '새 동작 메모 (한 줄 초안)'}
      subtitle="분류·해부학 용어·완성된 이름 없이 한 줄 아이디어만 적으면 바로 저장됩니다."
      maxWidth="640px"
      className="pf-movement-idea-dialog pf-idea-sheet-dialog"
    >
      <div className="pf-idea-sheet" data-testid="movement-idea-sheet">
        <div className="pf-idea-trust-banner" role="note" aria-label="창작 메모 안내">
          <PfAiStatusBadge kind="creative-memo">
            내 창작 초안 · 주관적 메모
          </PfAiStatusBadge>
          <span>
            강사 본인의 구상과 주관적 체감을 기록하는 공간입니다. 객관적 운동 효과 판정, 안전성
            보장, 또는 전문가 검증을 뜻하지 않습니다.
          </span>
        </div>

        {statusMessage && (
          <PfStatusBanner tone="success" role="status">
            {statusMessage}
          </PfStatusBanner>
        )}

        {error && (
          <PfFormError id={ideaErrorId}>
            {error}
          </PfFormError>
        )}

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
              <span className="pf-idea-step-badge">1단계 · 필수 1개</span>
              {editingId && (
                <PfBadge tone="success">
                  저장된 초안 편집 중
                </PfBadge>
              )}
            </div>
            <PfField
              label="떠오른 동작 아이디어 한 줄"
              htmlFor={ideaInputId}
              required
              hint="완성된 동작 이름이나 구간 분류 없이 떠오른 움직임만 편하게 적어보세요."
            >
              <PfTextarea
                ref={ideaInputRef}
                id={ideaInputId}
                aria-label="한 줄 아이디어"
                hasError={Boolean(error)}
                aria-describedby={error ? ideaErrorId : undefined}
                rows={2}
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

            <div className="pf-idea-primary-actions">
              <PfButton
                type="submit"
                variant="primary"
                data-testid="idea-save-draft"
              >
                <Check size={16} />
                {editingId ? '수정 저장' : '초안 바로 저장'}
              </PfButton>
              <PfButton
                type="button"
                variant="secondary"
                data-testid="idea-save-and-add"
                onClick={() => handleSaveDraft(true)}
              >
                <Plus size={16} />
                {isAlreadyInClass ? '수정 후 수업에 반영' : '수업에 넣기'}
              </PfButton>
            </div>
          </PfCard>

          <details
            className="pf-idea-progressive-section"
            open={reflectionOpen}
            onToggle={(event) => setReflectionOpen(event.currentTarget.open)}
          >
            <summary className="pf-idea-progressive-summary">
              <span>
                <Sparkles size={16} aria-hidden="true" />
                직접 해본 뒤 느낀 점 · 수정할 점 · 사진 추가 (선택)
              </span>
              <PfBadge tone={triedByInstructor || subjectiveFeeling || adjustmentNote ? 'sage' : 'neutral'}>
                {triedByInstructor || subjectiveFeeling || adjustmentNote ? '작성됨' : '나중에 써도 됨'}
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
                <span>내가 직접 움직여 보고 확인했어요 (전문가 검증·안전성 보장이 아닌 내 연습 기록)</span>
              </label>

              <PfField
                label="직접 해본 느낌 (주관적 체감 · 선택)"
                htmlFor={feelingInputId}
                hint="주관적 느낌은 객관적 운동 효과 판정과 구분되어 내 참고 메모로만 기록됩니다."
              >
                <div className="pf-idea-quick-chips" role="group" aria-label="자주 쓰는 느낌 빠른 입력">
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
                  rows={2}
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
                  rows={2}
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
                    <Camera size={15} aria-hidden="true" /> 참고 사진 · 자세 스케치 (선택 · 이 기기에만 저장)
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
                      hidden
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

          <details className="pf-idea-progressive-section">
            <summary className="pf-idea-progressive-summary">
              <span>고급 옵션 (임시 이름 · 기구 · 시간 — 안 골라도 자동 설정됨)</span>
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
              <PfButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                나중에 이어서 쓰기 (초안 유지)
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
              <PfButton
                type="submit"
                variant="secondary"
              >
                {editingId ? '수정 내용 저장' : '초안 저장'}
              </PfButton>
              <PfButton
                type="button"
                variant="primary"
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
                      <strong>{item.nameKo}</strong>
                      <div className="pf-idea-saved-badges">
                        <PfAiStatusBadge kind={meta.triedByInstructor ? 'tried-memo' : 'creative-memo'}>
                          {meta.triedByInstructor ? '직접 해봄 · 주관적 메모' : '아이디어 초안'}
                        </PfAiStatusBadge>
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
