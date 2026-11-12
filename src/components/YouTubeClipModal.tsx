import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Info,
  ListPlus,
  Plus,
  Youtube,
} from 'lucide-react';
import { CANONICAL_BLOCKS, POSITION_LABELS } from '../data/pilatesCatalog';
import {
  EQUIPMENT_OPTIONS,
  PROP_OPTIONS,
  getEquipmentFamily,
} from '../data/equipmentCatalog';
import {
  parseManualChapters,
  parseReferenceTime,
  parseYouTubeReference,
  YouTubeClipImportSchema,
} from '../schemas/pilatesSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  BodyPosition,
  ClassBlockCategory,
  DifficultyLevel,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import { getApparatusPrimary3DThumb } from '../utils/studio3dMotionCatalog';
import { LightDismissDialog } from './LightDismissDialog';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/library.css';
import '../styles/review-usability.css';
import './YouTubeClipModal.css';

export {
  YouTubePreviewModal,
  YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY,
} from './YouTubePreviewModal';
export type {
  YouTubePreviewModalProps,
  YtPreviewEditDraftEntry,
} from './YouTubePreviewModal';

interface YouTubeClipperModalProps {
  open: boolean;
  onClose: () => void;
}
const REVIEW_TEXT = '미검토 자료 · 원본 영상에서 자세와 기구 설정을 확인하세요.';
const SAMPLE_CHAPTERS = '00:00 호흡과 준비\n03:00 첫 번째 동작\n06:00 두 번째 동작';

interface ClipperWorkingDraft {
  mode: 'batch' | 'single';
  step: 1 | 2 | 3;
  youtubeUrl: string;
  channelName: string;
  title: string;
  nameEn: string;
  chaptersText: string;
  startTimeText: string;
  selectedEquipment: string[];
  blockCategory: ClassBlockCategory;
  chapterBlocks: Record<number, ClassBlockCategory>;
  level: DifficultyLevel;
  bodyPosition: BodyPosition;
  selectedProps: PropType[];
  duration: number;
  unilateral: boolean;
  springs: string;
  breathPattern: string;
  cueText: string;
}

const CLIPPER_DRAFT_STORAGE_KEY = 'pf_youtube_clipper_draft_v1';

function readClipperDraft(): ClipperWorkingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CLIPPER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClipperWorkingDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      mode: parsed.mode === 'single' ? 'single' : 'batch',
      step: parsed.step === 2 || parsed.step === 3 ? parsed.step : 1,
      youtubeUrl: typeof parsed.youtubeUrl === 'string' ? parsed.youtubeUrl : '',
      channelName: typeof parsed.channelName === 'string' ? parsed.channelName : '',
      title: typeof parsed.title === 'string' ? parsed.title : '',
      nameEn: typeof parsed.nameEn === 'string' ? parsed.nameEn : '',
      chaptersText: typeof parsed.chaptersText === 'string' ? parsed.chaptersText : '',
      startTimeText: typeof parsed.startTimeText === 'string' ? parsed.startTimeText : '00:00',
      selectedEquipment: Array.isArray(parsed.selectedEquipment) ? parsed.selectedEquipment : [],
      blockCategory: (parsed.blockCategory as ClassBlockCategory) || 'core',
      chapterBlocks:
        parsed.chapterBlocks && typeof parsed.chapterBlocks === 'object'
          ? parsed.chapterBlocks
          : {},
      level: (parsed.level as DifficultyLevel) || '1.0',
      bodyPosition: (parsed.bodyPosition as BodyPosition) || 'supine',
      selectedProps: Array.isArray(parsed.selectedProps) ? (parsed.selectedProps as PropType[]) : [],
      duration: typeof parsed.duration === 'number' ? parsed.duration : 3,
      unilateral: Boolean(parsed.unilateral),
      springs: typeof parsed.springs === 'string' ? parsed.springs : '',
      breathPattern: typeof parsed.breathPattern === 'string' ? parsed.breathPattern : '',
      cueText: typeof parsed.cueText === 'string' ? parsed.cueText : '',
    };
  } catch {
    return null;
  }
}

export const YouTubeClipperModal: React.FC<YouTubeClipperModalProps> = ({ open, onClose }) => {
  const addCustomExercise = usePilatesStore((state) => state.addCustomExercise);
  const addBatchExercisesFromClips = usePilatesStore((state) => state.addBatchExercisesFromClips);
  const [initialDraft] = useState(() => readClipperDraft());
  const [mode, setMode] = useState<'batch' | 'single'>(() => initialDraft?.mode ?? 'batch');
  const [clipperStep, setClipperStep] = useState<1 | 2 | 3>(() => initialDraft?.step ?? 1);
  const [youtubeUrl, setYoutubeUrl] = useState(() => initialDraft?.youtubeUrl ?? '');
  const [channelName, setChannelName] = useState(() => initialDraft?.channelName ?? '');
  const [title, setTitle] = useState(() => initialDraft?.title ?? '');
  const [nameEn, setNameEn] = useState(() => initialDraft?.nameEn ?? '');
  const [chaptersText, setChaptersText] = useState(() => initialDraft?.chaptersText ?? '');
  const [startTimeText, setStartTimeText] = useState(() => initialDraft?.startTimeText ?? '00:00');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
    () => initialDraft?.selectedEquipment ?? [],
  );
  const apparatus = getEquipmentFamily(selectedEquipment[0] || '') || 'mat';
  const [blockCategory, setBlockCategory] = useState<ClassBlockCategory>(
    () => initialDraft?.blockCategory ?? 'core',
  );
  const [chapterBlocks, setChapterBlocks] = useState<Record<number, ClassBlockCategory>>(
    () => initialDraft?.chapterBlocks ?? {},
  );
  const [level, setLevel] = useState<DifficultyLevel>(() => initialDraft?.level ?? '1.0');
  const [bodyPosition, setBodyPosition] = useState<BodyPosition>(
    () => initialDraft?.bodyPosition ?? 'supine',
  );
  const [selectedProps, setSelectedProps] = useState<PropType[]>(
    () => initialDraft?.selectedProps ?? [],
  );
  const [duration, setDuration] = useState(() => initialDraft?.duration ?? 3);
  const [unilateral, setUnilateral] = useState(() => initialDraft?.unilateral ?? false);
  const [springs, setSprings] = useState(() => initialDraft?.springs ?? '');
  const [breathPattern, setBreathPattern] = useState(() => initialDraft?.breathPattern ?? '');
  const [cueText, setCueText] = useState(() => initialDraft?.cueText ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDetailsElement>(null);
  const parsed = useMemo(() => parseManualChapters(chaptersText), [chaptersText]);
  const validReference = parseYouTubeReference(youtubeUrl);

  useEffect(() => {
    if (saved) return;
    const hasInput = Boolean(
      youtubeUrl.trim() ||
        channelName.trim() ||
        title.trim() ||
        nameEn.trim() ||
        chaptersText.trim() ||
        selectedEquipment.length ||
        selectedProps.length ||
        springs.trim() ||
        breathPattern.trim() ||
        cueText.trim(),
    );
    try {
      if (!hasInput && clipperStep === 1) {
        window.sessionStorage.removeItem(CLIPPER_DRAFT_STORAGE_KEY);
        return;
      }
      const draft: ClipperWorkingDraft = {
        mode,
        step: clipperStep,
        youtubeUrl,
        channelName,
        title,
        nameEn,
        chaptersText,
        startTimeText,
        selectedEquipment,
        blockCategory,
        chapterBlocks,
        level,
        bodyPosition,
        selectedProps,
        duration,
        unilateral,
        springs,
        breathPattern,
        cueText,
      };
      window.sessionStorage.setItem(CLIPPER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    saved,
    mode,
    clipperStep,
    youtubeUrl,
    channelName,
    title,
    nameEn,
    chaptersText,
    startTimeText,
    selectedEquipment,
    blockCategory,
    chapterBlocks,
    level,
    bodyPosition,
    selectedProps,
    duration,
    unilateral,
    springs,
    breathPattern,
    cueText,
  ]);

  const clearClipperDraft = () => {
    try {
      window.sessionStorage.removeItem(CLIPPER_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const navigateClipperStep = (nextStep: 1 | 2 | 3) => {
    setClipperStep(nextStep);
    requestAnimationFrame(() => {
      if (nextStep === 1) {
        step1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } else if (nextStep === 2) {
        step2Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } else {
        if (step3Ref.current) step3Ref.current.open = true;
        step3Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };

  const clipperNextActionText =
    !youtubeUrl.trim() || !validReference || !channelName.trim()
      ? '지금 할 일 (1/3): 공식 YouTube 영상 링크와 채널명, 동작/수업 이름을 먼저 입력하세요.'
      : !selectedEquipment.length || !selectedProps.length
        ? '다음 행동 (2/3): 원본 영상에서 직접 확인한 기구와 소도구를 선택하세요.'
        : '다음 행동 (3/3): 필요한 큐 메모를 확인한 뒤 아래 보관 버튼을 눌러 마무리하세요.';

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
      clearClipperDraft();
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
      clearClipperDraft();
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
            <nav
              className="pf-step-guide-bar"
              aria-label="참조 등록 단계 안내"
              data-testid="clipper-step-guide"
            >
              <ol className="pf-step-guide-list">
                <li>
                  <button
                    type="button"
                    aria-current={clipperStep === 1 ? 'step' : undefined}
                    onClick={() => navigateClipperStep(1)}
                  >
                    <span>1</span> 영상·시간 입력
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    aria-current={clipperStep === 2 ? 'step' : undefined}
                    onClick={() => navigateClipperStep(2)}
                  >
                    <span>2</span> 기구·분류 선택
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    aria-current={clipperStep === 3 ? 'step' : undefined}
                    onClick={() => navigateClipperStep(3)}
                  >
                    <span>3</span> 큐 메모·보관
                  </button>
                </li>
              </ol>
              <div className="pf-step-guide-Subrow">
                <p className="pf-step-guide-focus" data-testid="clipper-next-action">
                  {clipperNextActionText}
                </p>
                <div className="pf-step-guide-nav">
                  <button
                    type="button"
                    className="btn-secondary pf-step-nav-btn"
                    disabled={clipperStep === 1}
                    onClick={() => navigateClipperStep(clipperStep === 3 ? 2 : 1)}
                  >
                    이전 단계
                  </button>
                  <button
                    type="button"
                    className="btn-secondary pf-step-nav-btn"
                    disabled={clipperStep === 3}
                    onClick={() => navigateClipperStep(clipperStep === 1 ? 2 : 3)}
                  >
                    다음 단계
                  </button>
                </div>
              </div>
            </nav>
            <div ref={step1Ref} className="clipper-mode-tabs" role="group" aria-label="참조 입력 방식">
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
            <div ref={step2Ref} className="clipper-section-heading">
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
            <div
              className="pf-clipper-spring-chips"
              data-testid="clipper-spring-preset-chips"
              role="group"
              aria-label="자주 쓰는 스프링 설정 빠른 입력"
            >
              <span className="pf-class-spring-source">빠른 스프링 입력:</span>
              {(
                ['2R 1B', '1R 1B', '1R', '1R 1Y (페달)', '1B (푸쉬스루)', '스프링 사용 없음'] as const
              ).map((presetSpring) => (
                <button
                  key={presetSpring}
                  type="button"
                  className={`log-quick-note-chip ${springs === presetSpring ? 'is-selected' : ''}`.trim()}
                  aria-pressed={springs === presetSpring}
                  onClick={() => setSprings(springs === presetSpring ? '' : presetSpring)}
                >
                  {presetSpring}
                </button>
              ))}
              {springs.trim() && <SpringVisualPills springs={springs} />}
            </div>
            <details ref={step3Ref} className="clipper-optional">
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
                <div
                  className="pf-spot-dialog-3d-banner"
                  data-testid="clipper-3d-setup-preview"
                  style={{ marginBottom: '10px' }}
                >
                  <img
                    src={getApparatusPrimary3DThumb(apparatus)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="pf-spot-dialog-3d-banner__img"
                  />
                  <div className="pf-spot-dialog-3d-banner__info">
                    <strong>선택 기구 3D 프리뷰 · Lv {level} · 구간당 {duration}분</strong>
                    {springs.trim() && <SpringVisualPills springs={springs} />}
                  </div>
                </div>
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
