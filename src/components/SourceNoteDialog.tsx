import { useId, useRef, useState } from 'react';
import { ExternalLink, FileText, Info } from 'lucide-react';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import { CANONICAL_BLOCKS, POSITION_LABELS } from '../data/pilatesCatalog';
import type { VerifiedPublicReference } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, PropType } from '../types/pilates';
import { createOwnPlanningNote, createSourcePlanningNote } from '../utils/sourceNote';
import { LightDismissDialog } from './LightDismissDialog';
import type { DialogCloseRequest } from './LightDismissDialog';
import '../styles/library.css';
import '../styles/source-note-recovery.css';
import '../styles/source-note-layout.css';

interface SourceNoteDialogProps {
  reference?: VerifiedPublicReference;
  onClose: () => void;
  onSaved: (exercise: PilatesExercise) => void;
}

const fieldOrder = [
  'nameKo',
  'equipment',
  'props',
  'durationMin',
  'isUnilateral',
  'level',
  'blockCategory',
  'bodyPosition',
  'cues',
  'precautions',
] as const;
type NoteField = (typeof fieldOrder)[number];

const focusNoteControl = (control: HTMLElement | null | undefined) => {
  control?.focus({ preventScroll: true });
  control?.scrollIntoView?.({ behavior: 'instant', block: 'center' });
};

/** A source handoff creates a separate, unreviewed note. Source verification never approves it. */
export function SourceNoteDialog({ reference, onClose, onSaved }: SourceNoteDialogProps) {
  const closing = useRef(false);
  const closeOnce = () => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  };
  const addCustomExercise = usePilatesStore((state) => state.addCustomExercise);
  const [name, setName] = useState(reference?.title ?? '');
  const [duration, setDuration] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [props, setProps] = useState<PropType[]>([]);
  const [level, setLevel] = useState('');
  const [blockCategory, setBlockCategory] = useState('');
  const [bodyPosition, setBodyPosition] = useState('');
  const [sides, setSides] = useState('');
  const [cues, setCues] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<NoteField | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<NoteField, string>>>({});
  const [dismissalRequested, setDismissalRequested] = useState(false);
  const [initialName] = useState(reference?.title ?? '');
  const formRef = useRef<HTMLFormElement>(null);
  const lastInput = useRef<HTMLElement | null>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const deferredClose = useRef<DialogCloseRequest['close'] | null>(null);
  const errorId = useId();
  const decisionTitleId = useId();
  const decisionDescriptionId = useId();
  const precautionsHelpId = useId();
  const hasChanges =
    name !== initialName ||
    duration !== '' ||
    equipment.length > 0 ||
    props.length > 0 ||
    level !== '' ||
    blockCategory !== '' ||
    bodyPosition !== '' ||
    sides !== '' ||
    cues !== '' ||
    precautions !== '';

  const focusField = (field: NoteField) => {
    requestAnimationFrame(() =>
      focusNoteControl(
        formRef.current?.querySelector<HTMLElement>(
          `input[data-note-field="${field}"],select[data-note-field="${field}"],textarea[data-note-field="${field}"],button[data-note-field="${field}"]`,
        ),
      ),
    );
  };
  const clearDismissal = () => {
    setDismissalRequested(false);
    deferredClose.current = null;
  };
  const beforeClose = (request: DialogCloseRequest) => {
    if (!hasChanges) return true;
    deferredClose.current = request.close;
    setDismissalRequested(true);
    requestAnimationFrame(() => decisionRef.current?.focus());
    return false;
  };
  const clearFieldError = (field: NoteField) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const remaining = { ...previous };
      delete remaining[field];
      return remaining;
    });
    if (errorField === field) {
      setError('');
      setErrorField(null);
    }
  };
  const fieldAccessibility = (field: NoteField) => ({
    'data-note-field': field,
    'aria-invalid': fieldErrors[field] ? (true as const) : undefined,
    'aria-describedby': fieldErrors[field] ? `${errorId}-${field}` : undefined,
    'aria-labelledby':
      field === 'equipment' || field === 'props' ? undefined : `${errorId}-${field}-label`,
  });
  const fieldError = (field: NoteField) =>
    fieldErrors[field] ? (
      <span id={`${errorId}-${field}`} className="source-note-field-error">
        {fieldErrors[field]}
      </span>
    ) : null;

  const save = () => {
    clearDismissal();
    setError('');
    setErrorField(null);
    setFieldErrors({});
    try {
      const input = {
        nameKo: name,
        durationMin: duration.trim() ? Number(duration) : undefined,
        equipment,
        props,
        level,
        blockCategory,
        bodyPosition,
        isUnilateral: sides ? sides === 'separate' : undefined,
        cues: cues
          .split('\n')
          .map((cue) => cue.trim())
          .filter(Boolean),
        precautions,
      };
      const note = reference
        ? createSourcePlanningNote(reference, input)
        : createOwnPlanningNote(input);
      addCustomExercise(note);
      onSaved(note);
    } catch (reason) {
      const issues = (reason as { issues?: { message: string; path: (string | number)[] }[] })
        ?.issues;
      const messages: Partial<Record<NoteField, string>> = {
        durationMin: '직접 정한 계획 시간을 0.5–20분 사이로 입력해 주세요.',
        level: '직접 확인한 난이도를 선택해 주세요.',
        blockCategory: '내 계획의 구간 분류를 선택해 주세요.',
        bodyPosition: '직접 확인한 시작 자세를 선택해 주세요.',
        isUnilateral: '양쪽을 함께 진행할지 좌우를 나눌지 직접 선택해 주세요.',
      };
      const errors: Partial<Record<NoteField, string>> = {};
      for (const issue of issues ?? []) {
        const field = fieldOrder.find((key) => key === issue.path[0]);
        if (field && !errors[field]) errors[field] = messages[field] || issue.message;
      }
      const firstField = fieldOrder.find((field) => errors[field]);
      setFieldErrors(errors);
      if (firstField) {
        setError(errors[firstField]!);
        setErrorField(firstField);
        focusField(firstField);
      } else {
        setError(
          issues?.[0]?.message ||
            '노트 등록·검토 화면 연결을 마치지 못했습니다. 입력 내용은 유지됩니다. 동작 목록을 확인한 뒤 다시 시도해 주세요.',
        );
      }
    }
  };

  return (
    <LightDismissDialog
      open
      onClose={closeOnce}
      onBeforeClose={beforeClose}
      className="source-note-recovery-dialog source-note-layout-dialog"
      title={reference ? '공개 자료로 내 계획 노트 작성' : '내 동작 직접 등록'}
      subtitle={
        reference
          ? '원출처를 보존하고, 내가 확인한 동작의 계획 정보를 직접 기록합니다.'
          : '동작과 계획 정보를 직접 입력해 검토 전 노트로 보관하세요.'
      }
      maxWidth="760px"
    >
      {dismissalRequested && hasChanges && (
        <div
          ref={decisionRef}
          className="source-note-dismissal-decision"
          role="group"
          aria-labelledby={decisionTitleId}
          aria-describedby={decisionDescriptionId}
          tabIndex={-1}
        >
          <h3 id={decisionTitleId}>입력 내용을 어떻게 할까요?</h3>
          <p id={decisionDescriptionId}>
            저장하지 않은 노트 내용이 있어요. 계속 편집하면 입력한 내용이 유지됩니다. 버리고 닫으면
            이번 입력 내용은 남지 않습니다.
          </p>
          <div className="source-note-dismissal-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                clearDismissal();
                requestAnimationFrame(() => {
                  const previous = lastInput.current;
                  const fallback = formRef.current?.querySelector<HTMLElement>(
                    'input[data-note-field="nameKo"]',
                  );
                  focusNoteControl(previous?.isConnected ? previous : fallback);
                });
              }}
            >
              계속 편집
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const close = deferredClose.current;
                deferredClose.current = null;
                close?.();
                closeOnce();
              }}
            >
              입력 내용 버리고 닫기
            </button>
          </div>
        </div>
      )}
      <form
        ref={formRef}
        className="source-note-form"
        noValidate
        onChangeCapture={(event) => {
          clearDismissal();
          const target = event.target;
          if (target instanceof HTMLElement) {
            const field = fieldOrder.find((key) => key === target.dataset.noteField);
            if (field) clearFieldError(field);
          }
        }}
        onFocusCapture={(event) => {
          const target = event.target;
          if (target instanceof HTMLElement && target.matches('input,textarea,select'))
            lastInput.current = target;
        }}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="source-note-form-status">
          <strong>검토 전 초안 · 전문가 검증 아님</strong>
          <span>* 표시는 필수 입력</span>
        </div>
        {reference && (
          <section className="source-note-origin" aria-label="보존할 원출처">
            <span className="eyebrow">원출처 보존 · 링크 전용</span>
            <h3>{reference.title}</h3>
            <p>
              {reference.sourceName} · {reference.region === 'kr' ? '국내 후보' : '해외 공식 출처'}
            </p>
            <a href={reference.url} target="_blank" rel="noopener noreferrer">
              원본 자료 확인 <ExternalLink size={13} />
            </a>
            <p className="muted">원본 자료는 전문가 미검수이며 자동 추천에서 계속 제외됩니다.</p>
          </section>
        )}
        <details className="source-note-input-guide">
          <summary>{reference ? '원출처 범위와 입력 기준' : '작성·검토 기준'}</summary>
          {!reference && (
            <section className="source-note-origin" aria-label="직접 작성한 동작">
              <span className="eyebrow">내가 작성하는 계획 노트</span>
              <h3>오래 쓸 나만의 동작 노트</h3>
              <p>동작·기구·소도구·수행 시간을 직접 입력하세요. 원본 링크는 필수 항목이 아닙니다.</p>
              <p className="muted">
                작성한 내용은 검토 전 초안으로 보관하며, 외부 출처나 강사 자격이 인증된 자료로
                표시하지 않습니다.
              </p>
            </section>
          )}
          <p className="source-note-boundary">
            <Info size={17} />
            <span>
              {reference
                ? '원출처와 제목만 이어받습니다. 관찰 시점·영상 길이·기구 설정은 동작 구간이나 계획 시간으로 가져오지 않습니다. 아래 정보는 강사가 직접 확인해 입력하세요.'
                : '아래 계획 정보는 모두 직접 확인한 내용으로 입력하세요. 앱이 동작 설명이나 개인별 적용 방법을 생성하지 않습니다.'}
              {reference &&
                reference.scope !== 'exercise' &&
                ' 전체 수업·시리즈를 개별 동작으로 자동 분해하지 않습니다.'}
            </span>
          </p>
        </details>
        <nav className="source-note-section-nav" aria-label="노트 입력 영역 이동">
          <button type="button" aria-label="동작·장비로 이동" onClick={() => focusField('nameKo')}>
            동작·장비
          </button>
          <button
            type="button"
            aria-label="수업 설정으로 이동"
            onClick={() => focusField('durationMin')}
          >
            수업 설정
          </button>
          <button type="button" aria-label="설명·메모로 이동" onClick={() => focusField('cues')}>
            설명·메모
          </button>
        </nav>
        <section className="source-note-section" aria-labelledby={`${errorId}-basics-title`}>
          <header>
            <span aria-hidden="true">1</span>
            <div>
              <h3 id={`${errorId}-basics-title`}>동작과 장비</h3>
              <p>이름을 정하고 필요한 장비를 모두 선택하세요.</p>
            </div>
          </header>
          <label className="form-field">
            <span id={`${errorId}-nameKo-label`}>내가 계획할 동작 이름 *</span>
            <input
              {...fieldAccessibility('nameKo')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              required
            />
            {fieldError('nameKo')}
          </label>
          <fieldset {...fieldAccessibility('equipment')}>
            <legend>직접 확인한 필수 기구 · 모두 선택 *</legend>
            <div className="library-multi-chips">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  {...fieldAccessibility('equipment')}
                  type="button"
                  aria-pressed={equipment.includes(item.id)}
                  className={equipment.includes(item.id) ? 'selected' : ''}
                  onClick={() => {
                    clearDismissal();
                    clearFieldError('equipment');
                    setEquipment((previous) =>
                      previous.includes(item.id)
                        ? previous.filter((id) => id !== item.id)
                        : [...previous, item.id],
                    );
                  }}
                >
                  {item.labelKo}
                </button>
              ))}
            </div>
            {fieldError('equipment')}
          </fieldset>
          <fieldset {...fieldAccessibility('props')}>
            <legend>직접 확인한 필수 소도구 · 없으면 없음 선택 *</legend>
            <div className="library-multi-chips">
              {PROP_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  {...fieldAccessibility('props')}
                  type="button"
                  aria-pressed={props.includes(item.id)}
                  className={props.includes(item.id) ? 'selected' : ''}
                  onClick={() => {
                    clearDismissal();
                    clearFieldError('props');
                    setProps((previous) =>
                      previous.includes(item.id)
                        ? previous.filter((id) => id !== item.id)
                        : item.id === 'none'
                          ? ['none']
                          : [...previous.filter((id) => id !== 'none'), item.id],
                    );
                  }}
                >
                  {item.labelKo}
                </button>
              ))}
            </div>
            {fieldError('props')}
          </fieldset>
        </section>
        <section className="source-note-section" aria-labelledby={`${errorId}-settings-title`}>
          <header>
            <span aria-hidden="true">2</span>
            <div>
              <h3 id={`${errorId}-settings-title`}>수업 설정</h3>
              <p>시간·좌우 진행·난이도는 직접 확인해 입력하세요.</p>
            </div>
          </header>
          <div className="library-form-grid">
            <label className="form-field">
              <span id={`${errorId}-durationMin-label`}>직접 정한 계획 시간 · 분 *</span>
              <input
                {...fieldAccessibility('durationMin')}
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="0.5–20분 · 양쪽·설명·전환 포함"
                required
              />
              {fieldError('durationMin')}
            </label>
            <label className="form-field">
              <span id={`${errorId}-isUnilateral-label`}>직접 확인한 좌우 진행 방식 *</span>
              <select
                {...fieldAccessibility('isUnilateral')}
                value={sides}
                onChange={(event) => setSides(event.target.value)}
                required
              >
                <option value="">선택해 주세요</option>
                <option value="together">양쪽 함께 · 편측 아님</option>
                <option value="separate">좌우 나누어 진행 · 계획 시간에 양쪽 포함</option>
              </select>
              {fieldError('isUnilateral')}
            </label>
            <label className="form-field">
              <span id={`${errorId}-level-label`}>직접 확인한 난이도 *</span>
              <select
                {...fieldAccessibility('level')}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                required
              >
                <option value="">선택해 주세요</option>
                <option value="1.0">기초 · Lv 1.0</option>
                <option value="1.5">중급 · Lv 1.5</option>
                <option value="2.0">심화 · Lv 2.0</option>
              </select>
              {fieldError('level')}
            </label>
            <label className="form-field">
              <span id={`${errorId}-blockCategory-label`}>내 계획의 구간 분류 *</span>
              <select
                {...fieldAccessibility('blockCategory')}
                value={blockCategory}
                onChange={(event) => setBlockCategory(event.target.value)}
                required
              >
                <option value="">선택해 주세요</option>
                {CANONICAL_BLOCKS.map((block) => (
                  <option key={block.category} value={block.category}>
                    {block.nameKo}
                  </option>
                ))}
              </select>
              {fieldError('blockCategory')}
            </label>
            <label className="form-field">
              <span id={`${errorId}-bodyPosition-label`}>직접 확인한 시작 자세 *</span>
              <select
                {...fieldAccessibility('bodyPosition')}
                value={bodyPosition}
                onChange={(event) => setBodyPosition(event.target.value)}
                required
              >
                <option value="">선택해 주세요</option>
                {Object.entries(POSITION_LABELS).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.ko}
                  </option>
                ))}
              </select>
              {fieldError('bodyPosition')}
            </label>
          </div>
        </section>
        <section className="source-note-section" aria-labelledby={`${errorId}-notes-title`}>
          <header>
            <span aria-hidden="true">3</span>
            <div>
              <h3 id={`${errorId}-notes-title`}>설명과 메모</h3>
              <p>티칭 큐를 적고 필요한 주의사항을 남기세요.</p>
            </div>
          </header>
          <label className="form-field">
            <span id={`${errorId}-cues-label`}>직접 작성한 티칭 큐 · 줄마다 하나 *</span>
            <textarea
              {...fieldAccessibility('cues')}
              value={cues}
              onChange={(event) => setCues(event.target.value)}
              rows={4}
              maxLength={6000}
              required
            />
            {fieldError('cues')}
          </label>
          <label className="form-field">
            <span id={`${errorId}-precautions-label`}>
              직접 작성한 주의·제외·개인별 적용 메모 · 선택
            </span>
            <textarea
              {...fieldAccessibility('precautions')}
              aria-describedby={[
                precautionsHelpId,
                fieldAccessibility('precautions')['aria-describedby'],
              ]
                .filter(Boolean)
                .join(' ')}
              value={precautions}
              onChange={(event) => setPrecautions(event.target.value)}
              rows={3}
              maxLength={3000}
            />
            {fieldError('precautions')}
          </label>
          <p id={precautionsHelpId} className="source-note-precautions-help">
            검토 전 노트에서는 선택 항목입니다. 다음 화면에서 내 강사 검토를 완료하려면
            주의·제외·개인별 적용 메모가 필요합니다.
          </p>
        </section>
        <p className="source-note-pending">
          검토 전 노트로 저장합니다. 다음 화면에서 내용을 확인하고 검토 기록을 남길 수 있습니다. 내
          강사 검토는 외부 자격 인증과 다릅니다.
        </p>
        {error && (
          <p className="library-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="source-note-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={(event) => {
              const dialog = event.currentTarget.closest('dialog');
              const close = () => {
                if (dialog?.open) dialog.close();
                closeOnce();
              };
              if (beforeClose({ reason: 'close-button', close })) close();
            }}
          >
            취소
          </button>
          <button type="submit" className="btn-primary" aria-label="검토 전 노트 저장하고 검토하기">
            <FileText size={16} />
            초안 저장하고 검토
          </button>
        </div>
      </form>
    </LightDismissDialog>
  );
}
