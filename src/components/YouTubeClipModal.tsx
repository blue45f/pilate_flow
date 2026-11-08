import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import { MovementDiagramReference } from './MovementDiagramReference';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ChevronDown,
  ExternalLink,
  FileText,
  Info,
  ListPlus,
  Play,
  Plus,
  Youtube,
} from 'lucide-react';
import { APPARATUS_LABELS, CANONICAL_BLOCKS, POSITION_LABELS } from '../data/pilatesCatalog';
import { getMovementProvenance, getMovementVideoLink } from '../data/movementProvenance';
import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate';
import {
  EQUIPMENT_OPTIONS,
  PROP_OPTIONS,
  getEquipmentFamily,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import {
  parseManualChapters,
  parseReferenceTime,
  parseYouTubeReference,
  YouTubeClipImportSchema,
} from '../schemas/pilatesSchema';
import { sourceReferenceSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  BodyPosition,
  ClassBlockCategory,
  DifficultyLevel,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import {
  exerciseRevision,
  getExerciseReviewState,
  isExerciseAutoEligible,
} from '../utils/exerciseReview';
import { LightDismissDialog } from './LightDismissDialog';
import type { DialogCloseRequest } from './LightDismissDialog';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
import { ExerciseYouTubeGallery } from './ExerciseYouTubeGallery';
import { MovementArt } from './MovementArt';
import { MotionReferencePlayer } from './MotionReferencePlayer';
import { MovementMediaGuidancePanel } from './MovementMediaGuidancePanel';
import '../styles/library.css';
import '../styles/review-usability.css';

interface YouTubePreviewModalProps {
  exercise: PilatesExercise | null;
  onClose: () => void;
  onAddToSequence?: (exerciseId: string) => { success: boolean; message?: string } | void;
}

interface ReviewDraftStatus {
  baseRevision: string;
  dirty: boolean;
}

const ExercisePlanningNotes: React.FC<{ exercise: PilatesExercise; pending: boolean }> = ({
  exercise,
  pending,
}) => (
  <div className="movement-detail-grid">
    <section>
      <div className="movement-detail-section-title">
        <FileText size={16} />
        <h3>{pending ? '기존 계획 메모 · 근거 미확인' : '내 강사 검토 계획 메모'}</h3>
      </div>
      <p className="movement-detail-disclaimer">
        {pending
          ? '보존된 미검토 메모입니다. 실제 수행 전 출처·기구·몸 상태를 확인하세요.'
          : '내가 확인한 계획 메타데이터입니다. 자격 인증과 개인별 적합성에 대한 외부 검증은 별개입니다.'}
      </p>
      <dl className="movement-notes">
        <div>
          <dt>자세</dt>
          <dd>{POSITION_LABELS[exercise.bodyPosition].ko}</dd>
        </div>
        <div>
          <dt>기존 부위 태그</dt>
          <dd>{exercise.targetMuscles.join(' · ') || '강사 확인 필요'}</dd>
        </div>
        <div>
          <dt>호흡 메모</dt>
          <dd>{exercise.breathPattern || '직접 확인 후 입력'}</dd>
        </div>
        <div>
          <dt>기구 설정 메모</dt>
          <dd>
            {exercise.springs || '입력되지 않음'}
            <small>제조사·모델·사용자에 맞는 설정과 안전 장치를 직접 확인하세요.</small>
          </dd>
        </div>
      </dl>
      <ul className="movement-cue-list">
        {exercise.cues.map((cue, index) => (
          <li key={index}>{cue}</li>
        ))}
      </ul>
      <p className="movement-review-note">
        <strong>기존 주의 메모</strong>
        {exercise.precautions}
      </p>
    </section>
    <section>
      <div className="movement-detail-section-title">
        <ListPlus size={16} />
        <h3>기존 변형 메모</h3>
      </div>
      <div className="movement-layer">
        <span>부담 줄이기 · 검토할 입력값</span>
        <p>{exercise.layers.easy}</p>
      </div>
      <div className="movement-layer">
        <span>기본 계획 · 검토할 입력값</span>
        <p>{exercise.layers.standard}</p>
      </div>
      <div className="movement-layer">
        <span>확장 · 검토할 입력값</span>
        <p>{exercise.layers.hard}</p>
      </div>
      <p className="muted movement-layer-note">개인별 적용과 난이도는 실제 강사가 결정합니다.</p>
    </section>
  </div>
);

const ExerciseReviewEditor: React.FC<{
  draft: PilatesExercise;
  onChange: (draft: PilatesExercise) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorRef: React.Ref<HTMLDetailsElement>;
}> = ({ draft, onChange, open, onOpenChange, editorRef }) => {
  const update = <K extends keyof PilatesExercise>(key: K, value: PilatesExercise[K]) =>
    onChange({ ...draft, [key]: value });
  const equipment = draft.requiredEquipment ?? [draft.apparatus];
  const updateEquipment = (id: string) => {
    const next = equipment.includes(id)
      ? equipment.filter((item) => item !== id)
      : [...equipment, id];
    onChange({
      ...draft,
      requiredEquipment: next,
      apparatus: getEquipmentFamily(next[0] || '') || draft.apparatus,
    });
  };
  const updateProps = (id: PropType) =>
    update(
      'props',
      draft.props.includes(id)
        ? draft.props.filter((item) => item !== id)
        : id === 'none'
          ? ['none']
          : [...draft.props.filter((item) => item !== 'none'), id],
    );
  return (
    <details
      className="review-metadata-editor"
      ref={editorRef}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>
        <span>
          <FileText size={15} />
          검토 전 메모 수정 · 근거 미확인 입력값
        </span>
        <ChevronDown size={14} />
      </summary>
      <div>
        <p>
          기존 값은 확인된 설정이 아닙니다. 실제 동작과 기구를 확인하고 필요한 내용을 수정하세요.
          수정하면 전체 검토 확인란이 해제됩니다.
        </p>
        <div className="library-form-grid">
          <label className="form-field">
            <span>동작 이름</span>
            <input
              value={draft.nameKo}
              onChange={(event) => update('nameKo', event.target.value)}
              maxLength={160}
            />
          </label>
          <label className="form-field">
            <span>영문 이름</span>
            <input
              value={draft.nameEn}
              onChange={(event) => update('nameEn', event.target.value)}
              maxLength={160}
            />
          </label>
        </div>
        <fieldset>
          <legend>필요한 기구 · 모두 선택</legend>
          <div className="library-multi-chips">
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={equipment.includes(item.id)}
                className={equipment.includes(item.id) ? 'selected' : ''}
                onClick={() => updateEquipment(item.id)}
              >
                {item.labelKo}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>필요한 소도구 · 모두 선택</legend>
          <div className="library-multi-chips">
            {PROP_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={draft.props.includes(item.id)}
                className={draft.props.includes(item.id) ? 'selected' : ''}
                onClick={() => updateProps(item.id)}
              >
                {item.labelKo}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="library-form-grid">
          <label className="form-field">
            <span>강사가 확인한 난이도</span>
            <select
              value={draft.level}
              onChange={(event) => update('level', event.target.value as PilatesExercise['level'])}
            >
              <option value="1.0">기초 · 1.0</option>
              <option value="1.5">중급 · 1.5</option>
              <option value="2.0">심화 · 2.0</option>
            </select>
          </label>
          <label className="form-field">
            <span>기본 계획 시간 · 분 · 양쪽 포함</span>
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={draft.defaultDurationMin}
              onChange={(event) => update('defaultDurationMin', Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>구간 분류</span>
            <select
              value={draft.blockCategory}
              onChange={(event) =>
                update('blockCategory', event.target.value as ClassBlockCategory)
              }
            >
              {CANONICAL_BLOCKS.map((block) => (
                <option key={block.category} value={block.category}>
                  {block.nameKo}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>시작 자세</span>
            <select
              value={draft.bodyPosition}
              onChange={(event) => update('bodyPosition', event.target.value as BodyPosition)}
            >
              {Object.entries(POSITION_LABELS).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.ko}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>스프링·기구 설정 메모 · 직접 확인</span>
            <input
              value={draft.springs}
              onChange={(event) => update('springs', event.target.value)}
              maxLength={240}
            />
          </label>
          <label className="form-field">
            <span>박스 설정 · 직접 확인</span>
            <select
              value={draft.box}
              onChange={(event) => update('box', event.target.value as PilatesExercise['box'])}
            >
              <option value="none">사용 안 함</option>
              <option value="long-box">롱박스</option>
              <option value="short-box">숏박스</option>
            </select>
          </label>
          <label className="form-field">
            <span>풋바 설정 · 직접 확인</span>
            <select
              value={draft.footbar}
              onChange={(event) =>
                update('footbar', event.target.value as PilatesExercise['footbar'])
              }
            >
              <option value="none">해당 없음</option>
              <option value="down">내림</option>
              <option value="low">낮음</option>
              <option value="mid">중간</option>
              <option value="high">높음</option>
            </select>
          </label>
          <label className="form-field">
            <span>헤드레스트 설정 · 직접 확인</span>
            <select
              value={draft.headrest}
              onChange={(event) =>
                update('headrest', event.target.value as PilatesExercise['headrest'])
              }
            >
              <option value="flat">평평하게</option>
              <option value="up">올림</option>
              <option value="down">내림</option>
            </select>
          </label>
          <label className="form-field">
            <span>부위 태그 · 쉼표 구분 · 직접 확인</span>
            <input
              value={draft.targetMuscles.join(', ')}
              onChange={(event) =>
                update(
                  'targetMuscles',
                  event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label className="form-field">
            <span>템포 · 직접 확인</span>
            <select
              value={draft.tempo || ''}
              onChange={(event) =>
                update(
                  'tempo',
                  event.target.value ? (event.target.value as PilatesExercise['tempo']) : undefined,
                )
              }
            >
              <option value="">미지정</option>
              <option value="slow-precise">천천히</option>
              <option value="moderate-flow">보통 흐름</option>
              <option value="athletic-burn">빠른 흐름</option>
            </select>
          </label>
        </div>
        <label className="local-review-consent">
          <input
            type="checkbox"
            checked={draft.isUnilateral}
            onChange={(event) => update('isUnilateral', event.target.checked)}
          />
          좌우를 나누어 진행 · 기본 계획 시간에 양쪽 포함
        </label>
        <div className="library-form-grid">
          <label className="form-field clipper-full-field">
            <span>호흡 메모 · 직접 작성</span>
            <textarea
              value={draft.breathPattern}
              onChange={(event) => update('breathPattern', event.target.value)}
              rows={2}
            />
          </label>
          <label className="form-field clipper-full-field">
            <span>티칭 큐 · 줄마다 하나 · 직접 작성</span>
            <textarea
              data-review-field="cues"
              value={draft.cues.join('\n')}
              onChange={(event) => update('cues', event.target.value.split('\n'))}
              rows={4}
            />
          </label>
          <label className="form-field clipper-full-field">
            <span>주의·제외·개인별 적용 메모 · 직접 작성</span>
            <textarea
              data-review-field="precautions"
              value={draft.precautions}
              onChange={(event) => update('precautions', event.target.value)}
              rows={3}
            />
          </label>
          {(['easy', 'standard', 'hard'] as const).map((layer) => (
            <label className="form-field clipper-full-field" key={layer}>
              <span>
                {layer === 'easy' ? '부담 줄이기' : layer === 'standard' ? '기본 계획' : '확장'}{' '}
                메모 · 직접 검토
              </span>
              <textarea
                value={draft.layers[layer]}
                onChange={(event) =>
                  update('layers', { ...draft.layers, [layer]: event.target.value })
                }
                rows={2}
              />
            </label>
          ))}
          <label className="form-field clipper-full-field">
            <span>원본 영상 URL · 없으면 비워 두기</span>
            <input
              type="url"
              value={draft.youtube.url}
              onChange={(event) => update('youtube', { ...draft.youtube, url: event.target.value })}
            />
          </label>
          <label className="form-field">
            <span>원본 채널명 · 직접 확인</span>
            <input
              value={draft.youtube.channelName}
              onChange={(event) =>
                update('youtube', { ...draft.youtube, channelName: event.target.value })
              }
            />
          </label>
          <label className="form-field">
            <span>입력된 원본 시작 시점 · 초 · 직접 확인</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.youtube.startSec}
              onChange={(event) =>
                update('youtube', { ...draft.youtube, startSec: Number(event.target.value) })
              }
            />
          </label>
        </div>
      </div>
    </details>
  );
};

const LocalInstructorReview: React.FC<{
  exercise: PilatesExercise;
  reviewerAlias: string;
  onReviewerAliasChange: (alias: string) => void;
  editorOpen: boolean;
  onEditorOpenChange: (open: boolean) => void;
  canAddToSequence: boolean;
  onDraftStatusChange: (status: ReviewDraftStatus) => void;
}> = ({
  exercise,
  reviewerAlias,
  onReviewerAliasChange,
  editorOpen,
  onEditorOpenChange,
  canAddToSequence,
  onDraftStatusChange,
}) => {
  const state = getExerciseReviewState(exercise);
  const [allConditionsReviewed, setAllConditionsReviewed] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState<PilatesExercise>(() => ({
    ...exercise,
    requiredEquipment: [...(exercise.requiredEquipment ?? [exercise.apparatus])],
    props: [...exercise.props],
    cues: [...exercise.cues],
    targetMuscles: [...exercise.targetMuscles],
    spinalPlanes: [...exercise.spinalPlanes],
    layers: { ...exercise.layers },
    youtube: { ...exercise.youtube },
  }));
  const baseRevision = exerciseRevision(exercise);
  const [initialDraftRevision] = useState(() => exerciseRevision(draft));
  const draftChanged = exerciseRevision(draft) !== initialDraftRevision;
  const updateDraft = (next: PilatesExercise) => {
    setDraft(next);
    onDraftStatusChange({
      baseRevision,
      dirty: exerciseRevision(next) !== initialDraftRevision,
    });
    setAllConditionsReviewed(false);
    setError('');
  };
  const saveReview = (approve: boolean) => {
    setError('');
    const current = usePilatesStore.getState().exercises.find((item) => item.id === exercise.id);
    if (!current || exerciseRevision(current) !== exerciseRevision(exercise)) {
      setError('동작 정보가 바뀌었습니다. 변경된 전체 내용을 다시 확인해 주세요.');
      return;
    }
    if (
      draft.nameKo.trim().length < 2 ||
      !Number.isFinite(draft.defaultDurationMin) ||
      draft.defaultDurationMin < 0.5 ||
      draft.defaultDurationMin > 20
    ) {
      setError('동작 이름과 기본 계획 시간(0.5–20분)을 확인해 주세요.');
      return;
    }
    if (!draft.requiredEquipment?.length || !draft.props.length) {
      setError(
        '실제로 확인한 기구와 소도구를 모두 선택해 주세요. 소도구가 없으면 ‘소도구 없음’을 선택하세요.',
      );
      return;
    }
    const reference = draft.youtube.url.trim() ? parseYouTubeReference(draft.youtube.url) : null;
    if (draft.youtube.url.trim() && !reference) {
      setError('원본 링크는 유효한 YouTube 영상 주소를 입력하거나 비워 주세요.');
      return;
    }
    if (!Number.isFinite(draft.youtube.startSec) || draft.youtube.startSec < 0) {
      setError('직접 확인한 원본 시작 시점을 확인해 주세요.');
      return;
    }
    const edited: PilatesExercise = {
      ...current,
      ...draft,
      nameKo: draft.nameKo.trim(),
      cues: draft.cues.map((cue) => cue.trim()).filter(Boolean),
      youtube: {
        ...draft.youtube,
        videoId: reference?.videoId || '',
        url: draft.youtube.url.trim(),
      },
    };
    if (approve) {
      const alias = reviewerAlias.trim();
      if (!alias || alias.length > 80) {
        setError('검토한 강사 별칭을 1–80자로 입력해 주세요.');
        return;
      }
      if (!allConditionsReviewed) {
        setError('실제 전체 검토를 마친 경우 확인란을 선택해 주세요.');
        return;
      }
      if (!edited.cues.length || !edited.precautions.trim()) {
        setError('직접 확인한 티칭 큐와 주의·적용 메모를 작성해 주세요.');
        return;
      }
      edited.review = {
        status: 'approved',
        reviewerAlias: alias,
        reviewedAt: new Date().toISOString(),
        revision: exerciseRevision(edited),
        scope: 'planning-metadata',
        credentialVerified: false,
      };
    }
    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) => (item.id === current.id ? edited : item)),
    }));
    setDraft(edited);
    onDraftStatusChange({ baseRevision, dirty: false });
    setAllConditionsReviewed(false);
  };
  const missingNote = !draft.cues.some((cue) => cue.trim())
    ? {
        field: 'cues',
        message: '검토를 기록하려면 티칭 큐를 먼저 작성해 주세요.',
        action: '티칭 큐 작성',
      }
    : !draft.precautions.trim()
      ? {
          field: 'precautions',
          message: '검토를 기록하려면 주의·적용 메모를 먼저 작성해 주세요.',
          action: '주의·적용 메모 작성',
        }
      : null;
  const reviewRecorded = state === 'approved' && !draftChanged;
  const nextStep = reviewRecorded
    ? canAddToSequence
      ? '검토 기록이 있습니다. 위의 ‘수업안에 추가’로 이어가세요.'
      : '검토 기록이 있습니다. 확인을 마쳤다면 창을 닫아도 됩니다.'
    : (missingNote?.message ??
      (!reviewerAlias.trim()
        ? '다음은 검토한 강사 별칭을 입력하세요. 실명은 필요하지 않습니다.'
        : !allConditionsReviewed
          ? '내용을 모두 확인했다면 아래 전체 확인란을 선택해 주세요.'
          : '다음은 아래 승인 버튼을 눌러 검토를 기록하세요.'));
  const focusMissingNote = () => {
    if (!missingNote) return;
    onEditorOpenChange(true);
    requestAnimationFrame(() =>
      editorRef.current
        ?.querySelector<HTMLTextAreaElement>(`[data-review-field="${missingNote.field}"]`)
        ?.focus(),
    );
  };
  return (
    <section className={`local-instructor-review review-${state}`} aria-label="내 강사 검토">
      <h3>
        {state === 'approved'
          ? '내 강사 검토 기록'
          : state === 'stale'
            ? '동작 정보 변경 · 다시 검토 필요'
            : '검토 기록 남기기 (선택)'}
      </h3>
      {state === 'approved' && (
        <>
          <p className="local-review-approved-label">
            <CheckCircle2 size={16} />내 강사 검토 · 자격 인증 미확인
          </p>
          <dl>
            <div>
              <dt>강사 별칭</dt>
              <dd>{exercise.review?.reviewerAlias}</dd>
            </div>
            <div>
              <dt>기록 시각</dt>
              <dd>
                {exercise.review?.reviewedAt
                  ? new Date(exercise.review.reviewedAt).toLocaleString('ko-KR')
                  : ''}
              </dd>
            </div>
            <div>
              <dt>검토 범위</dt>
              <dd>이 동작의 수업 계획 정보 · 직접 확인</dd>
            </div>
          </dl>
          <p>
            동작 정보가 변경되면 다시 검토해야 합니다. 즐겨찾기 변경은 검토 기록에 영향을 주지
            않습니다. 이 기록은 외부 기관의 자격 인증이나 의학적 승인 기록이 아닙니다.
          </p>
        </>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveReview(true);
        }}
      >
        <p>
          원본·시연과 비교해 출처, 동작, 기구·소도구·설정, 난이도·시간, 큐·변형·주의 사항을
          확인하세요.
        </p>
        <div className="local-review-progress" role="status" aria-live="polite">
          <p>{nextStep}</p>
          {!reviewRecorded && missingNote && (
            <button type="button" className="local-review-next-action" onClick={focusMissingNote}>
              {missingNote.action}
            </button>
          )}
        </div>
        <ExerciseReviewEditor
          draft={draft}
          onChange={updateDraft}
          open={editorOpen}
          onOpenChange={onEditorOpenChange}
          editorRef={editorRef}
        />
        <label className="form-field">
          <span>검토한 강사 별칭</span>
          <input
            value={reviewerAlias}
            onChange={(event) => onReviewerAliasChange(event.target.value)}
            maxLength={80}
            autoComplete="off"
            placeholder="실명 대신 별칭을 사용할 수 있어요"
            required
          />
        </label>
        <label className="local-review-consent">
          <input
            type="checkbox"
            checked={allConditionsReviewed}
            onChange={(event) => setAllConditionsReviewed(event.target.checked)}
          />
          이 동작의 위 모든 조건을 실제로 전체 검토했고, 수업에 쓸 동작 정보를 직접 확인했습니다.
        </label>
        <p className="local-review-scope">
          입력한 동작 정보에 대한 내 검토 기록입니다. 자격 인증·전문가 검수와는 다르며, 정보를
          바꾸면 다시 검토해야 합니다.
        </p>
        {error && (
          <p className="library-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="local-review-actions">
          <button
            type="button"
            className="btn-secondary"
            data-review-action="save-memo"
            onClick={() => saveReview(false)}
          >
            수정 메모만 저장
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!reviewerAlias.trim() || !allConditionsReviewed}
          >
            <CheckCircle2 size={16} />
            수정 내용을 저장하고 내 강사 검토로 승인
          </button>
        </div>
      </form>
    </section>
  );
};

const MovementDetails: React.FC<{
  exercise: PilatesExercise;
  onClose: () => void;
  onAddToSequence?: (exerciseId: string) => { success: boolean; message?: string } | void;
  reviewDraftStatus: ReviewDraftStatus | null;
  onDraftStatusChange: (status: ReviewDraftStatus) => void;
}> = ({
  exercise: selectedExercise,
  onClose,
  onAddToSequence,
  reviewDraftStatus,
  onDraftStatusChange,
}) => {
  const exercise = usePilatesStore(
    (store) => store.exercises.find((item) => item.id === selectedExercise.id) || selectedExercise,
  );
  const approved = isExerciseAutoEligible(exercise);
  const alreadyInSequence = usePilatesStore((store) =>
    store.activeSteps.some((step) => step.exerciseId === exercise.id),
  );
  const [loadVideo, setLoadVideo] = useState(false);
  useEffect(() => {
    const stopVideo = () => setLoadVideo(false);
    const onVisibility = () => {
      if (document.hidden) stopVideo();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stopVideo);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stopVideo);
    };
  }, []);

  const [motionLabOpen, setMotionLabOpen] = useState(false);
  const [reviewerAlias, setReviewerAlias] = useState('');
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);
  const [additionError, setAdditionError] = useState('');
  const unsavedDescriptionId = React.useId();
  const currentRevision = exerciseRevision(exercise);
  const hasUnsavedReview =
    reviewDraftStatus?.baseRevision === currentRevision && reviewDraftStatus.dirty;
  const source = getMovementProvenance(exercise);
  const primarySourceResult = sourceReferenceSchema.safeParse(exercise.sourceReference);
  const primarySource = primarySourceResult.success ? primarySourceResult.data : null;
  const hasOptionalVideo = Boolean(exercise.youtube.url.trim());
  const showVideoSource =
    hasOptionalVideo || (!primarySource && !exercise.id.startsWith('ex-custom-own-'));
  const rawLink = getMovementVideoLink(exercise);
  const { videoId, startSec, endSec } = exercise.youtube;
  const safeStart = Math.max(0, Math.floor(startSec || 0));
  const safeEnd = endSec && endSec > safeStart ? Math.floor(endSec) : null;
  const linkPolicy = rawLink
    ? normalizeReferenceUrlPolicy(rawLink, {
        startSec: safeStart,
        endSec: safeEnd,
      })
    : null;
  const link = linkPolicy?.canonicalExternalUrl ?? rawLink;
  const embedUrl = link
    ? (linkPolicy?.embedUrl ??
      `https://www.youtube-nocookie.com/embed/${videoId}?start=${safeStart}${safeEnd ? `&end=${safeEnd}` : ''}&rel=0&autoplay=0`)
    : '';
  return (
    <div className="movement-detail">
      <div className={`movement-detail-media movement-${exercise.apparatus}`}>
        {loadVideo && link ? (
          <iframe
            src={embedUrl}
            title={`${exercise.nameKo} YouTube 원본 참조`}
            allow="encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <MovementArt apparatus={exercise.apparatus} />
            <div className="movement-detail-media-caption">
              <span>직접 그린 기구 도식 · 동작 시범 아님</span>
              {link && (
                <button type="button" className="btn-primary" onClick={() => setLoadVideo(true)}>
                  <Play size={16} /> YouTube 영상 불러오기
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="movement-detail-topline">
        <span className="library-badge">
          {getExerciseEquipment(exercise)
            .requiredEquipment.map(
              (id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo || id,
            )
            .join(' · ') || APPARATUS_LABELS[exercise.apparatus].ko}
        </span>
        <span className="library-badge">Lv {exercise.level}</span>
        <span className="library-badge">
          <Clock3 size={12} /> 계획 {exercise.defaultDurationMin}분
          {exercise.isUnilateral ? ' · 양쪽 포함' : ''}
        </span>
        <span className={`library-badge provenance-${source.kind}`}>
          {primarySource ? '공개 자료를 참고한 내 계획 노트 · 원출처 보존' : source.label}
        </span>
      </div>
      {onAddToSequence && (
        <div className="library-modal-footer">
          {hasUnsavedReview && (
            <p id={unsavedDescriptionId} className="movement-add-feedback" role="status">
              저장하지 않은 수정 내용이 있어요. ‘수정 메모만 저장’ 또는 전체 검토·승인을 마친 뒤
              추가해 주세요.
            </p>
          )}
          {alreadyInSequence && !hasUnsavedReview && (
            <p className="movement-add-feedback muted" role="status">
              {approved
                ? '이미 현재 수업안에 담은 동작입니다. 창을 닫고 수업 구성을 이어가세요.'
                : '현재 수업안에 담긴 미검토 자료입니다. 검토 기록은 선택 사항입니다.'}
            </p>
          )}
          {additionError && (
            <p className="movement-add-feedback status error" role="alert">
              {additionError}
            </p>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={alreadyInSequence || hasUnsavedReview}
            aria-describedby={hasUnsavedReview ? unsavedDescriptionId : undefined}
            onClick={() => {
              if (alreadyInSequence || hasUnsavedReview) return;
              setAdditionError('');
              const result = onAddToSequence(exercise.id);
              if (result && !result.success) {
                setAdditionError(
                  result.message || '동작을 추가하지 못했습니다. 현재 수업 조건을 확인해 주세요.',
                );
                return;
              }
              onClose();
            }}
          >
            <Plus size={16} />{' '}
            {hasUnsavedReview
              ? '수정 내용 저장 후 추가 가능'
              : alreadyInSequence
                ? '수업안에 추가됨'
                : '수업안에 추가'}
          </button>
        </div>
      )}
      <MovementDiagramReference exercise={exercise} />
      <MotionReferencePlayer exerciseId={exercise.id} exerciseName={exercise.nameKo} />
      <ExerciseYouTubeGallery exercise={exercise} maxPerRegion={3} />
      <MovementMediaGuidancePanel key={exercise.id} exercise={exercise} />
      <details
        className="pending-instruction-notes"
        onToggle={(event) => setMotionLabOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <Info size={15} />
            미검토 모션 설계 예시 · 운동 시범 아님
          </span>
          <ChevronDown size={15} />
        </summary>
        <MotionReferencePlayer mode="prototype-lab" active={motionLabOpen} />
      </details>
      <details className="optional-source-details">
        <summary>출처·검토 상태 자세히 보기</summary>
        <ExerciseEvidencePanel exercise={exercise} />
        <section className="movement-source-panel">
          <div className="movement-detail-section-title">
            <Info size={16} />
            <h3>자료의 출처와 검토 상태</h3>
          </div>
          {primarySource ? (
            <div className="movement-primary-source">
              <p>
                공개 자료를 참고해 직접 작성한 별도 계획 노트입니다. 원출처의 확인 상태와 내 강사
                검토 기록은 서로 다릅니다.
              </p>
              <p className="muted">
                노트에 보관한 기록이며 현재 출처 대조는 위 근거 패널에서 확인하세요.
              </p>
              <dl className="movement-source-fields">
                <div>
                  <dt>원출처 제목</dt>
                  <dd>{primarySource.title}</dd>
                </div>
                <div>
                  <dt>발행처</dt>
                  <dd>{primarySource.publisher}</dd>
                </div>
                <div>
                  <dt>자료 구분</dt>
                  <dd>{primarySource.region === 'kr' ? '국내 후보' : '해외 공식 출처'}</dd>
                </div>
                <div>
                  <dt>보관된 출처 확인 상태</dt>
                  <dd>
                    {primarySource.verificationStatus === 'partial-playback-checked'
                      ? '영상 부분 확인 · 동작 구간 미확인'
                      : primarySource.verificationStatus === 'official-source-checked'
                        ? '공식 출처 확인 · 운동 검수와 별개'
                        : '국내 후보 · 영상 품질 미확인'}
                  </dd>
                </div>
                <div>
                  <dt>출처 기록</dt>
                  <dd>
                    {primarySource.referenceId} · {primarySource.verifiedAt}
                  </dd>
                </div>
              </dl>
              <a
                href={primarySource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <ExternalLink size={14} /> 보존된 원출처 열기
              </a>
              <p className="source-note-url">{primarySource.url}</p>
              <p className="muted">
                원본 링크 전용 · 영상·이미지 복제권과 외부 임베드 허용 미확인. 원본 공개 자료는
                전문가 미검수·자동 추천 제외 상태를 유지합니다. 관찰 시점을 동작 시작·종료 구간으로
                옮기지 않았습니다.
              </p>
            </div>
          ) : (
            <>
              <p>{source.description}</p>
              <p className="muted">{source.rights}</p>
              {exercise.sourceReference && (
                <p className="library-inline-warning">
                  원출처 기록의 형식을 확인해 주세요. 유효하지 않은 주소는 열지 않습니다.
                </p>
              )}
            </>
          )}
          {source.kind !== 'original' && showVideoSource && (
            <dl className="movement-source-fields">
              <div>
                <dt>입력된 채널명</dt>
                <dd>{exercise.youtube.channelName || '등록되지 않음'}</dd>
              </div>
              <div>
                <dt>입력된 영상 제목</dt>
                <dd>{exercise.youtube.videoTitle || '등록되지 않음'}</dd>
              </div>
              <div>
                <dt>참조 구간</dt>
                <dd>
                  {formatSecondsToMMSS(safeStart)}
                  {safeEnd ? `–${formatSecondsToMMSS(safeEnd)}` : '부터 · 종료 미지정'}
                </dd>
              </div>
            </dl>
          )}
          {link ? (
            <div className="movement-source-actions">
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <ExternalLink size={14} /> 원본에서 이 구간 열기
              </a>
              <span className="muted">재생을 누르면 YouTube에 연결됩니다.</span>
            </div>
          ) : (
            source.kind !== 'original' &&
            showVideoSource && (
              <p className="library-inline-warning">
                유효한 영상 링크가 없어 원본을 열 수 없습니다.
              </p>
            )
          )}
        </section>
      </details>
      <div className={`movement-use-warning ${approved ? 'reviewed' : ''}`}>
        <Info size={17} />
        <p>
          {approved
            ? '내 강사 검토 기록이 있는 계획 메타데이터입니다. 수업별 기구·회원 조건은 다시 확인하세요.'
            : '미검토 자료입니다. 수업안에 바로 추가할 수 있으며, 실제 수행 전 기구와 몸 상태를 확인하세요. 안전성·효과를 보장하지 않습니다.'}
        </p>
      </div>
      <PostureAnatomyGuide exercise={exercise} />
      {approved ? (
        <ExercisePlanningNotes exercise={exercise} pending={false} />
      ) : (
        <details className="pending-instruction-notes">
          <summary>
            <span>
              <FileText size={15} />
              검토 전 기존 메모 · 근거 미확인
            </span>
            <span>강사 검토용</span>
          </summary>
          <ExercisePlanningNotes exercise={exercise} pending />
        </details>
      )}
      <details className="optional-review-details">
        <summary>내 검토 기록 (선택)</summary>
        <LocalInstructorReview
          key={currentRevision}
          exercise={exercise}
          reviewerAlias={reviewerAlias}
          onReviewerAliasChange={setReviewerAlias}
          editorOpen={reviewEditorOpen}
          onEditorOpenChange={setReviewEditorOpen}
          canAddToSequence={
            Boolean(onAddToSequence) && !alreadyInSequence && !additionError && !hasUnsavedReview
          }
          onDraftStatusChange={onDraftStatusChange}
        />
      </details>
    </div>
  );
};

const MovementDetailDialog: React.FC<
  Omit<YouTubePreviewModalProps, 'exercise'> & { exercise: PilatesExercise }
> = ({ exercise, onClose, onAddToSequence }) => {
  const currentExercise = usePilatesStore(
    (store) => store.exercises.find((item) => item.id === exercise.id) || exercise,
  );
  const [reviewDraftStatus, setReviewDraftStatus] = useState<ReviewDraftStatus | null>(null);
  const [dismissalRevision, setDismissalRevision] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const lastReviewInput = useRef<HTMLElement | null>(null);
  const deferredClose = useRef<DialogCloseRequest['close'] | null>(null);
  const decisionTitleId = React.useId();
  const decisionDescriptionId = React.useId();
  const currentRevision = exerciseRevision(currentExercise);
  const hasUnsavedReview =
    reviewDraftStatus?.baseRevision === currentRevision && reviewDraftStatus.dirty;
  const showDismissalDecision = dismissalRevision === currentRevision && hasUnsavedReview;
  const focusReview = (save: boolean) => {
    setDismissalRevision(null);
    deferredClose.current = null;
    requestAnimationFrame(() => {
      const saveButton = contentRef.current?.querySelector<HTMLElement>(
        '[data-review-action="save-memo"]',
      );
      const previousInput = lastReviewInput.current;
      const canReturnToInput =
        previousInput?.isConnected &&
        !previousInput.closest('details:not([open]),[hidden],[inert]');
      const target = !save && canReturnToInput ? previousInput : saveButton;
      target?.focus();
    });
  };
  const beforeClose = (request: DialogCloseRequest) => {
    if (!hasUnsavedReview) return true;
    deferredClose.current = request.close;
    setDismissalRevision(currentRevision);
    requestAnimationFrame(() => decisionRef.current?.focus());
    return false;
  };
  return (
    <LightDismissDialog
      open
      onClose={onClose}
      onBeforeClose={beforeClose}
      title={exercise.nameKo}
      subtitle={exercise.nameEn || '내가 등록한 참고 동작'}
      maxWidth="900px"
    >
      <div
        ref={contentRef}
        onFocusCapture={(event) => {
          const target = event.target;
          if (
            target instanceof HTMLElement &&
            target.matches('input,textarea,select') &&
            target.closest('.local-instructor-review')
          )
            lastReviewInput.current = target;
        }}
      >
        {showDismissalDecision && (
          <div
            ref={decisionRef}
            className="movement-dismissal-decision"
            role="group"
            aria-labelledby={decisionTitleId}
            aria-describedby={decisionDescriptionId}
            tabIndex={-1}
          >
            <h3 id={decisionTitleId}>수정 내용을 어떻게 할까요?</h3>
            <p id={decisionDescriptionId}>
              저장하지 않은 동작 정보가 있어요. 계속 편집하거나 기존 메모 저장·전체 검토로
              이동하세요. 버리고 닫으면 이번 수정 내용은 남지 않습니다.
            </p>
            <div className="movement-dismissal-actions">
              <button type="button" className="btn-primary" onClick={() => focusReview(false)}>
                계속 편집
              </button>
              <button type="button" className="btn-secondary" onClick={() => focusReview(true)}>
                저장·검토로 이동
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => deferredClose.current?.()}
              >
                수정 내용 버리고 닫기
              </button>
            </div>
          </div>
        )}
        <MovementDetails
          key={exercise.id}
          exercise={exercise}
          onClose={onClose}
          onAddToSequence={onAddToSequence}
          reviewDraftStatus={reviewDraftStatus}
          onDraftStatusChange={(status) => {
            setReviewDraftStatus(status);
            if (!status.dirty) {
              setDismissalRevision(null);
              deferredClose.current = null;
            }
          }}
        />
      </div>
    </LightDismissDialog>
  );
};

export const YouTubePreviewModal: React.FC<YouTubePreviewModalProps> = (props) =>
  props.exercise ? (
    <MovementDetailDialog key={props.exercise.id} {...props} exercise={props.exercise} />
  ) : null;

interface YouTubeClipperModalProps {
  open: boolean;
  onClose: () => void;
}
const REVIEW_TEXT = '미검토 자료 · 원본 영상에서 자세와 기구 설정을 확인하세요.';
const SAMPLE_CHAPTERS = '00:00 호흡과 준비\n03:00 첫 번째 동작\n06:00 두 번째 동작';

export const YouTubeClipperModal: React.FC<YouTubeClipperModalProps> = ({ open, onClose }) => {
  const addCustomExercise = usePilatesStore((state) => state.addCustomExercise);
  const addBatchExercisesFromClips = usePilatesStore((state) => state.addBatchExercisesFromClips);
  const [mode, setMode] = useState<'batch' | 'single'>('batch');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [title, setTitle] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [chaptersText, setChaptersText] = useState('');
  const [startTimeText, setStartTimeText] = useState('00:00');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const apparatus = getEquipmentFamily(selectedEquipment[0] || '') || 'mat';
  const [blockCategory, setBlockCategory] = useState<ClassBlockCategory>('core');
  const [chapterBlocks, setChapterBlocks] = useState<Record<number, ClassBlockCategory>>({});
  const [level, setLevel] = useState<DifficultyLevel>('1.0');
  const [bodyPosition, setBodyPosition] = useState<BodyPosition>('supine');
  const [selectedProps, setSelectedProps] = useState<PropType[]>([]);
  const [duration, setDuration] = useState(3);
  const [unilateral, setUnilateral] = useState(false);
  const [springs, setSprings] = useState('');
  const [breathPattern, setBreathPattern] = useState('');
  const [cueText, setCueText] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const parsed = useMemo(() => parseManualChapters(chaptersText), [chaptersText]);
  const validReference = parseYouTubeReference(youtubeUrl);

  const makeExercise = (
    name: string,
    start: number,
    index: number,
    block: ClassBlockCategory,
    end?: number,
  ): PilatesExercise => ({
    id: `ex-custom-${crypto.randomUUID()}`,
    nameKo: name,
    nameEn: mode === 'single' ? nameEn.trim() : '',
    apparatus,
    requiredEquipment: [...selectedEquipment],
    props: [...selectedProps],
    blockCategory: block,
    spinalPlanes: [],
    bodyPosition,
    level,
    defaultDurationMin: duration,
    isUnilateral: unilateral,
    springs: springs.trim() || '강사가 기구별 설정',
    box: 'none',
    footbar: 'none',
    headrest: 'flat',
    targetMuscles: [],
    breathPattern: breathPattern.trim() || '원본 확인 후 강사가 입력',
    cues: cueText.trim()
      ? cueText
          .split('\n')
          .map((cue) => cue.trim())
          .filter(Boolean)
      : ['직접 입력한 참조 구간입니다. 티칭 큐는 원본 확인 후 작성하세요.'],
    precautions: REVIEW_TEXT,
    layers: {
      easy: '적용할 변형을 직접 검토해 주세요.',
      standard: '원본 확인 후 기본 계획을 작성해 주세요.',
      hard: '확장 동작은 강사가 별도로 검토해 주세요.',
    },
    youtube: {
      videoId: validReference!.videoId,
      url: youtubeUrl.trim(),
      channelName: channelName.trim(),
      videoTitle: title.trim() || name,
      startSec: start,
      ...(end !== undefined ? { endSec: end } : {}),
      note: `사용자가 직접 입력한 ${mode === 'batch' ? `${index + 1}번째 타임스탬프` : '영상 구간'}. ${REVIEW_TEXT}`,
    },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: new Date().toISOString(),
  });

  const save = (loadAsSequence: boolean) => {
    setError('');
    if (!selectedEquipment.length) {
      setError('원본에서 확인한 기구를 하나 이상 선택해 주세요.');
      return;
    }
    if (!selectedProps.length) {
      setError('원본에서 확인한 소도구를 선택해 주세요. 없으면 ‘소도구 없음’을 선택하세요.');
      return;
    }
    const checked = YouTubeClipImportSchema.safeParse({
      nameKo: title.trim() || (mode === 'batch' ? '유튜브 참조 수업' : ''),
      nameEn,
      youtubeUrl,
      channelName,
      startTimeText: mode === 'batch' ? '00:00' : startTimeText,
      apparatus,
      blockCategory,
      level,
      defaultDurationMin: duration,
      springs,
      breathPattern,
      cueText,
    });
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || '입력값을 확인해 주세요.');
      return;
    }
    if (mode === 'batch') {
      if (parsed.error || !parsed.chapters.length) {
        setError(parsed.error || '시간과 동작 이름이 있는 구간을 한 개 이상 입력해 주세요.');
        return;
      }
      const exercises = parsed.chapters.map((chapter, index) =>
        makeExercise(
          chapter.title,
          chapter.startSec,
          index,
          chapterBlocks[index] || blockCategory,
          parsed.chapters[index + 1]?.startSec,
        ),
      );
      addBatchExercisesFromClips(
        exercises,
        loadAsSequence,
        title.trim() || '직접 등록한 유튜브 참조 수업',
      );
      if (loadAsSequence) {
        onClose();
        return;
      }
      setSaved(
        `${exercises.length}개 참조를 라이브러리에 보관했어요. 모든 동작은 검토 전 상태입니다.`,
      );
    } else {
      addCustomExercise(
        makeExercise(title.trim(), parseReferenceTime(startTimeText)!, 0, blockCategory),
      );
      setSaved('참조 동작을 라이브러리에 보관했어요. 수업 전에 내용을 검토해 주세요.');
    }
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="내 유튜브 레퍼런스"
      subtitle="좋은 움직임을 발견한 순간, 원본 링크와 시간을 함께 보관하세요."
      maxWidth="850px"
    >
      <div className="clipper-layout">
        <div className="clipper-honest-note">
          <Youtube size={20} />
          <p>
            <strong>링크와 메모를 직접 등록합니다.</strong>
            <span>
              영상을 가져오거나 분석하지 않아요. 공개된 영상도 재사용 허가와 동작 정확성을 따로
              확인해야 합니다.
            </span>
          </p>
        </div>
        {saved ? (
          <div className="clipper-saved" role="status">
            <CheckCircle2 size={35} />
            <h3>참고 자료를 보관했어요.</h3>
            <p>{saved}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setSaved('');
                onClose();
              }}
            >
              완료
            </button>
          </div>
        ) : (
          <>
            <div className="clipper-mode-tabs" role="group" aria-label="참조 입력 방식">
              <button
                type="button"
                aria-pressed={mode === 'batch'}
                className={mode === 'batch' ? 'selected' : ''}
                onClick={() => {
                  setMode('batch');
                  setError('');
                }}
              >
                <ListPlus size={16} /> 여러 타임스탬프
              </button>
              <button
                type="button"
                aria-pressed={mode === 'single'}
                className={mode === 'single' ? 'selected' : ''}
                onClick={() => {
                  setMode('single');
                  setError('');
                }}
              >
                <FileText size={16} /> 한 동작
              </button>
            </div>
            <div className="library-form-grid">
              <label className="form-field clipper-url-field">
                <span>
                  YouTube 영상 링크 <span aria-hidden="true">*</span>
                </span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  required
                  aria-invalid={Boolean(youtubeUrl && !validReference)}
                />
                {youtubeUrl && !validReference && (
                  <small className="library-field-error">
                    공식 YouTube 영상 링크와 11자리 영상 ID를 확인해 주세요.
                  </small>
                )}
              </label>
              <label className="form-field">
                <span>직접 확인한 채널명 *</span>
                <input
                  value={channelName}
                  onChange={(event) => setChannelName(event.target.value)}
                  placeholder="영상에 표시된 채널명"
                  maxLength={160}
                  required
                />
              </label>
              <label className="form-field">
                <span>{mode === 'batch' ? '참조 수업 제목' : '동작 이름 *'}</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    mode === 'batch' ? '예: 다음 수업을 위한 리포머 메모' : '예: 시티드 암워크'
                  }
                  maxLength={160}
                  required={mode === 'single'}
                />
              </label>
              {mode === 'single' ? (
                <>
                  <label className="form-field">
                    <span>영문 이름 · 선택</span>
                    <input
                      value={nameEn}
                      onChange={(event) => setNameEn(event.target.value)}
                      maxLength={160}
                      placeholder="예: Seated Arm Work"
                    />
                  </label>
                  <label className="form-field">
                    <span>시작 시간 *</span>
                    <input
                      value={startTimeText}
                      onChange={(event) => setStartTimeText(event.target.value)}
                      placeholder="MM:SS 또는 HH:MM:SS"
                      required
                    />
                  </label>
                </>
              ) : null}
            </div>
            {mode === 'batch' && (
              <div className="clipper-chapter-input">
                <label className="form-field">
                  <span>직접 붙여넣는 타임스탬프 *</span>
                  <textarea
                    rows={5}
                    value={chaptersText}
                    onChange={(event) => {
                      setChaptersText(event.target.value);
                      setChapterBlocks({});
                    }}
                    placeholder={'00:00 호흡과 준비\n03:20 풋워크\n08:40 다음 동작'}
                  />
                  <small>한 줄에 ‘시간 동작 이름’. 시간은 앞에서 뒤 순서로 입력하세요.</small>
                </label>
                <button
                  type="button"
                  className="btn-ghost clipper-example"
                  onClick={() => {
                    setChaptersText(SAMPLE_CHAPTERS);
                    setChapterBlocks({});
                  }}
                >
                  입력 형식 예시 넣기
                </button>
                {parsed.error && (
                  <p className="library-field-error" role="status">
                    {parsed.error}
                  </p>
                )}
              </div>
            )}
            <div className="clipper-section-heading">
              <h3>내가 정하는 계획 정보</h3>
              <p>아래 설정은 영상에서 추출하지 않습니다. 여러 구간에 같은 기본값을 적용합니다.</p>
            </div>
            <fieldset className="clipper-required-equipment">
              <legend>원본에서 확인한 기구 · 필요한 장비 모두 선택 *</legend>
              <div className="library-multi-chips">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={selectedEquipment.includes(item.id)}
                    className={selectedEquipment.includes(item.id) ? 'selected' : ''}
                    onClick={() =>
                      setSelectedEquipment((previous) =>
                        previous.includes(item.id)
                          ? previous.filter((id) => id !== item.id)
                          : [...previous, item.id],
                      )
                    }
                  >
                    {item.labelKo}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="clipper-required-equipment">
              <legend>원본에서 확인한 소도구 · 필요한 도구 모두 선택 *</legend>
              <div className="library-multi-chips">
                {PROP_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={selectedProps.includes(item.id)}
                    className={selectedProps.includes(item.id) ? 'selected' : ''}
                    onClick={() =>
                      setSelectedProps((previous) =>
                        previous.includes(item.id)
                          ? previous.filter((id) => id !== item.id)
                          : item.id === 'none'
                            ? ['none']
                            : [...previous.filter((id) => id !== 'none'), item.id],
                      )
                    }
                  >
                    {item.labelKo}
                  </button>
                ))}
              </div>
              <p>기구·소도구는 이름으로 추정하지 않고, 영상을 직접 확인한 설정만 기록합니다.</p>
            </fieldset>
            <div className="library-form-grid clipper-metadata-grid">
              <label className="form-field">
                <span>기본 구간 분류</span>
                <select
                  value={blockCategory}
                  onChange={(event) => setBlockCategory(event.target.value as ClassBlockCategory)}
                >
                  {CANONICAL_BLOCKS.map((block) => (
                    <option key={block.category} value={block.category}>
                      {block.nameKo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>난이도</span>
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value as DifficultyLevel)}
                >
                  <option value="1.0">기초 · Lv 1.0</option>
                  <option value="1.5">중급 · Lv 1.5</option>
                  <option value="2.0">심화 · Lv 2.0</option>
                </select>
              </label>
              <label className="form-field">
                <span>계획 시간 · 구간당 분</span>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                />
              </label>
              <label className="form-field">
                <span>몸의 자세</span>
                <select
                  value={bodyPosition}
                  onChange={(event) => setBodyPosition(event.target.value as BodyPosition)}
                >
                  {Object.entries(POSITION_LABELS).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.ko}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="clipper-unilateral">
              <input
                type="checkbox"
                checked={unilateral}
                onChange={(event) => setUnilateral(event.target.checked)}
              />
              좌우를 나누어 진행 · 입력한 계획 시간에 양쪽 포함
            </label>
            <details className="clipper-optional">
              <summary>직접 작성한 큐와 기구 설정 · 선택</summary>
              <div className="library-form-grid">
                <label className="form-field">
                  <span>기구 설정 메모</span>
                  <input
                    value={springs}
                    onChange={(event) => setSprings(event.target.value)}
                    placeholder="내가 확인한 설정만 입력"
                    maxLength={240}
                  />
                </label>
                <label className="form-field">
                  <span>호흡 메모</span>
                  <input
                    value={breathPattern}
                    onChange={(event) => setBreathPattern(event.target.value)}
                    placeholder="직접 확인 후 작성"
                    maxLength={500}
                  />
                </label>
                <label className="form-field clipper-full-field">
                  <span>수업 큐 · 줄마다 하나</span>
                  <textarea
                    rows={3}
                    value={cueText}
                    onChange={(event) => setCueText(event.target.value)}
                    maxLength={3000}
                    placeholder="적용할 큐를 직접 작성해 주세요."
                  />
                </label>
              </div>
            </details>
            {mode === 'batch' && parsed.chapters.length > 0 && (
              <section className="clipper-chapter-preview" aria-label="등록 전 구간 확인">
                <div className="clipper-preview-title">
                  <strong>{parsed.chapters.length}개 참조 구간</strong>
                  <span>수업 계획 {Math.round(parsed.chapters.length * duration * 10) / 10}분</span>
                </div>
                <p>영상 시간과 수업 계획 시간은 별개입니다. 구간 분류를 직접 확인해 주세요.</p>
                <ol>
                  {parsed.chapters.map((chapter, index) => (
                    <li key={`${index}-${chapter.startSec}`}>
                      <time>{formatSecondsToMMSS(chapter.startSec)}</time>
                      <span>{chapter.title}</span>
                      <select
                        aria-label={`${chapter.title} 구간 분류`}
                        value={chapterBlocks[index] || blockCategory}
                        onChange={(event) =>
                          setChapterBlocks((previous) => ({
                            ...previous,
                            [index]: event.target.value as ClassBlockCategory,
                          }))
                        }
                      >
                        {CANONICAL_BLOCKS.map((block) => (
                          <option key={block.category} value={block.category}>
                            {block.nameKo}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {error && (
              <p className="library-form-error" role="alert">
                <Info size={16} />
                {error}
              </p>
            )}
            <div className="clipper-review-note">
              <Info size={15} />
              <p>
                새 등록 자료는 <strong>미검토 자료</strong>로 표시합니다.
                {mode === 'batch' &&
                  ' ‘수업안으로 열기’는 현재 편집 중인 수업안을 새 참조 수업으로 바꿉니다.'}
              </p>
            </div>
            <div className="library-modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                취소
              </button>
              {mode === 'batch' ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => save(false)}>
                    <ListPlus size={16} /> 라이브러리에 보관
                  </button>
                  <button type="button" className="btn-primary" onClick={() => save(true)}>
                    <Plus size={16} /> 보관하고 수업안으로 열기
                  </button>
                </>
              ) : (
                <button type="button" className="btn-primary" onClick={() => save(false)}>
                  <Plus size={16} /> 참조 동작 보관
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </LightDismissDialog>
  );
};
