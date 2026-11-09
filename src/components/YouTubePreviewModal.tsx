import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import { MovementDiagramReference } from './MovementDiagramReference';
import { StudioClinicalBriefCard } from './StudioClinicalBriefCard';
import React, { useEffect, useRef, useState } from 'react';
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
import { parseYouTubeReference } from '../schemas/pilatesSchema';
import { sourceReferenceSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  BodyPosition,
  ClassBlockCategory,
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
import './YouTubeClipModal.css';

export interface YouTubePreviewModalProps {
  exercise: PilatesExercise | null;
  onClose: () => void;
  onAddToSequence?: (exerciseId: string) => { success: boolean; message?: string } | void;
}

interface ReviewDraftStatus {
  baseRevision: string;
  dirty: boolean;
}

export const YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY = 'pf_yt_preview_edit_draft_v1';

export interface YtPreviewEditDraftEntry {
  exerciseId: string;
  baseRevision: string;
  draft: PilatesExercise;
}

let hasStoredPreviewDraftInSession = false;

const makeInitialDraft = (exercise: PilatesExercise): PilatesExercise => ({
  ...exercise,
  requiredEquipment: [...(exercise.requiredEquipment ?? [exercise.apparatus])],
  props: [...exercise.props],
  cues: [...exercise.cues],
  targetMuscles: [...exercise.targetMuscles],
  spinalPlanes: [...exercise.spinalPlanes],
  layers: { ...exercise.layers },
  youtube: { ...exercise.youtube },
});

function readAllPreviewEditDrafts(): Record<string, YtPreviewEditDraftEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, YtPreviewEditDraftEntry>;
  } catch {
    return {};
  }
}

function readPreviewEditDraft(exercise: PilatesExercise): PilatesExercise | null {
  const map = readAllPreviewEditDrafts();
  const entry = map[exercise.id];
  if (!entry || typeof entry !== 'object' || !entry.draft) return null;
  const baseRev = exerciseRevision(exercise);
  if (entry.baseRevision !== baseRev) return null;
  const normalizedDraft = makeInitialDraft(entry.draft);
  const initialRev = exerciseRevision(makeInitialDraft(exercise));
  if (exerciseRevision(normalizedDraft) === initialRev) return null;
  return normalizedDraft;
}

function writePreviewEditDraft(
  exerciseId: string,
  baseRevision: string,
  draft: PilatesExercise,
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readAllPreviewEditDrafts();
    map[exerciseId] = {
      exerciseId,
      baseRevision,
      draft: makeInitialDraft(draft),
    };
    hasStoredPreviewDraftInSession = true;
    window.sessionStorage.setItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota / security errors
  }
}

function clearPreviewEditDraft(exerciseId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readAllPreviewEditDrafts();
    if (!(exerciseId in map)) return;
    delete map[exerciseId];
    if (Object.keys(map).length === 0) {
      hasStoredPreviewDraftInSession = false;
      window.sessionStorage.removeItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore storage errors
  }
}

usePilatesStore.subscribe((nextState, prevState) => {
  if (!hasStoredPreviewDraftInSession || nextState.exercises === prevState.exercises) return;
  const map = readAllPreviewEditDrafts();
  const ids = Object.keys(map);
  if (ids.length === 0) {
    hasStoredPreviewDraftInSession = false;
    return;
  }
  for (const id of ids) {
    const wasPresent = prevState.exercises.some((item) => item.id === id);
    const isPresent = nextState.exercises.some((item) => item.id === id);
    if (wasPresent && !isPresent) {
      clearPreviewEditDraft(id);
    }
  }
});

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
          <label className="form-field">
            <span>입력된 원본 종료 시점 · 초 · 선택</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.youtube.endSec ?? ''}
              placeholder="미지정"
              onChange={(event) => {
                const raw = event.target.value.trim();
                const nextYoutube = { ...draft.youtube };
                if (raw === '') {
                  delete nextYoutube.endSec;
                } else {
                  nextYoutube.endSec = Number(raw);
                }
                update('youtube', nextYoutube);
              }}
            />
          </label>
        </div>
      </div>
    </details>
  );
};

const LocalInstructorReview: React.FC<{
  exercise: PilatesExercise;
  initialRestoredDraft: PilatesExercise | null;
  reviewerAlias: string;
  onReviewerAliasChange: (alias: string) => void;
  editorOpen: boolean;
  onEditorOpenChange: (open: boolean) => void;
  canAddToSequence: boolean;
  onDraftStatusChange: (status: ReviewDraftStatus) => void;
  onDraftSaved: () => void;
}> = ({
  exercise,
  initialRestoredDraft,
  reviewerAlias,
  onReviewerAliasChange,
  editorOpen,
  onEditorOpenChange,
  canAddToSequence,
  onDraftStatusChange,
  onDraftSaved,
}) => {
  const state = getExerciseReviewState(exercise);
  const [allConditionsReviewed, setAllConditionsReviewed] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDetailsElement>(null);
  const [initialDraftRevision] = useState(() => exerciseRevision(makeInitialDraft(exercise)));
  const [draft, setDraft] = useState<PilatesExercise>(
    () => initialRestoredDraft ?? makeInitialDraft(exercise),
  );
  const baseRevision = exerciseRevision(exercise);
  const draftChanged = exerciseRevision(draft) !== initialDraftRevision;
  const updateDraft = (next: PilatesExercise) => {
    setDraft(next);
    const isDirty = exerciseRevision(next) !== initialDraftRevision;
    if (isDirty) {
      writePreviewEditDraft(exercise.id, baseRevision, next);
    } else {
      clearPreviewEditDraft(exercise.id);
    }
    onDraftStatusChange({
      baseRevision,
      dirty: isDirty,
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
    if (
      draft.youtube.endSec !== undefined &&
      (!Number.isFinite(draft.youtube.endSec) || draft.youtube.endSec < 0)
    ) {
      setError('직접 확인한 원본 종료 시점을 확인해 주세요.');
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
    clearPreviewEditDraft(exercise.id);
    setDraft(edited);
    onDraftSaved();
    onDraftStatusChange({ baseRevision: exerciseRevision(edited), dirty: false });
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
  const [restoredDraft, setRestoredDraft] = useState<PilatesExercise | null>(() =>
    readPreviewEditDraft(exercise),
  );
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<boolean>(
    () => restoredDraft !== null,
  );
  const [draftResetVersion, setDraftResetVersion] = useState(0);
  const [previewStep, setPreviewStep] = useState<1 | 2>(() => (restoredDraft ? 2 : 1));
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
  const [reviewEditorOpen, setReviewEditorOpen] = useState<boolean>(() => restoredDraft !== null);
  const [additionError, setAdditionError] = useState('');
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDetailsElement>(null);
  const unsavedDescriptionId = React.useId();
  const currentRevision = exerciseRevision(exercise);
  const hasUnsavedReview =
    reviewDraftStatus?.baseRevision === currentRevision && reviewDraftStatus.dirty;
  const navigatePreviewStep = (nextStep: 1 | 2) => {
    setPreviewStep(nextStep);
    if (nextStep === 2) {
      if (step2Ref.current) {
        step2Ref.current.open = true;
      }
      setReviewEditorOpen(true);
    }
    requestAnimationFrame(() => {
      if (nextStep === 1) {
        step1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } else {
        step2Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };
  const handleResetRestoredDraft = () => {
    clearPreviewEditDraft(exercise.id);
    setRestoredDraft(null);
    setDraftRestoredNotice(false);
    setDraftResetVersion((version) => version + 1);
    onDraftStatusChange({ baseRevision: currentRevision, dirty: false });
  };
  const previewStepGuidance =
    previewStep === 1
      ? '지금 할 일 (1/2): 원본 영상 구간과 기본 자세·티칭 큐를 먼저 확인하세요.'
      : hasUnsavedReview || draftRestoredNotice
        ? '지금 할 일 (2/2): 수정한 시작·종료 시각과 큐 메모를 확인한 뒤 저장하거나 초기화하세요.'
        : '지금 할 일 (2/2): 실제 영상과 비교해 시작·종료 시각 및 큐 메모를 수정·저장하세요.';
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
      <nav
        className="pf-step-guide-bar yt-preview-step-guide"
        aria-label="영상 구간 확인 및 메모 수정 단계 안내"
        data-testid="yt-preview-step-guide"
      >
        <ol className="pf-step-guide-list">
          <li>
            <button
              type="button"
              aria-current={previewStep === 1 ? 'step' : undefined}
              className={`pf-step-guide-chip ${previewStep === 1 ? 'is-active' : ''}`}
              onClick={() => navigatePreviewStep(1)}
            >
              <span>1</span> 구간 재생·큐 확인
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-current={previewStep === 2 ? 'step' : undefined}
              className={`pf-step-guide-chip ${previewStep === 2 ? 'is-active' : ''}`}
              onClick={() => navigatePreviewStep(2)}
            >
              <span>2</span> 시작·종료 시각 및 큐 메모 수정
            </button>
          </li>
        </ol>
        <div className="pf-step-guide-Subrow">
          <p className="pf-step-guide-focus" data-testid="yt-preview-step-guidance">
            {previewStepGuidance}
          </p>
          <div className="pf-step-guide-nav">
            <button
              type="button"
              className="btn-secondary pf-step-nav-btn"
              disabled={previewStep === 1}
              onClick={() => navigatePreviewStep(1)}
            >
              이전 단계
            </button>
            <button
              type="button"
              className="btn-secondary pf-step-nav-btn"
              disabled={previewStep === 2}
              onClick={() => navigatePreviewStep(2)}
            >
              다음 단계
            </button>
          </div>
        </div>
      </nav>
      {(draftRestoredNotice || hasUnsavedReview) && (
        <div
          className="yt-preview-draft-recovery-banner"
          data-testid="yt-preview-draft-restored"
        >
          <p className="yt-preview-draft-recovery-copy">
            <span className="yt-preview-draft-recovery-badge">
              {draftRestoredNotice ? '수정 초안 복원됨' : '저장 전 수정 초안'}
            </span>
            <span>
              {draftRestoredNotice
                ? '저장하지 않고 닫았던 시작·종료 시각 및 큐 메모 수정 초안을 복원했습니다.'
                : '수정한 내용은 이 세션에 임시 보존됩니다. 원래 값으로 되돌리려면 초안 초기화를 누르세요.'}
            </span>
          </p>
          <button
            type="button"
            className="btn-secondary"
            data-testid="yt-preview-draft-reset"
            onClick={handleResetRestoredDraft}
          >
            초안 초기화
          </button>
        </div>
      )}
      <div
        ref={step1Ref}
        className={`movement-detail-media movement-${exercise.apparatus}`}
      >
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
                : '현재 수업안에 담긴 교차 검증 자료입니다. 검토 기록은 선택 사항입니다.'}
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
      <StudioClinicalBriefCard exercise={exercise} />
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
            교차 검증 모션 설계 예시 · 패턴 참고용
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
            : '교차 검증 완료 자료입니다. 수업안에 바로 추가할 수 있으며, 실제 수행 전 기구와 몸 상태를 확인하세요.'}
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
      <details
        ref={step2Ref}
        className="optional-review-details"
        open={restoredDraft !== null ? true : undefined}
      >
        <summary>내 검토 기록 (선택)</summary>
        <LocalInstructorReview
          key={`${currentRevision}-${draftResetVersion}`}
          exercise={exercise}
          initialRestoredDraft={restoredDraft}
          reviewerAlias={reviewerAlias}
          onReviewerAliasChange={setReviewerAlias}
          editorOpen={reviewEditorOpen}
          onEditorOpenChange={(open) => {
            setReviewEditorOpen(open);
            if (open) {
              setPreviewStep(2);
            }
          }}
          canAddToSequence={
            Boolean(onAddToSequence) && !alreadyInSequence && !additionError && !hasUnsavedReview
          }
          onDraftStatusChange={onDraftStatusChange}
          onDraftSaved={() => {
            setRestoredDraft(null);
            setDraftRestoredNotice(false);
          }}
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
  const [reviewDraftStatus, setReviewDraftStatus] = useState<ReviewDraftStatus | null>(() => {
    const restored = readPreviewEditDraft(currentExercise);
    return restored ? { baseRevision: exerciseRevision(currentExercise), dirty: true } : null;
  });
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
