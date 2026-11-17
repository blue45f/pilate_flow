import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ExternalLink, ImageOff, Play, X } from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import {
  exerciseVideoGalleryKey,
  getExerciseVideoReferences,
  type ExerciseVideoReference,
} from '../utils/exerciseVideoReferences';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { isStrictNoAutoplayEmbedUrl } from '../features/referenceLinkPolicyCandidate/urlPolicyEngine';
import '../styles/exercise-video-gallery.css';

export interface ExerciseVideoGalleryProps {
  exercise: PilatesExercise;
  active?: boolean;
  compact?: boolean;
  initialVisible?: number;
  onSelect?: (video: ExerciseVideoReference) => void;
  onUseForNoteDraft?: (video: ExerciseVideoReference) => void;
}

export function ExerciseVideoThumbnail({
  video,
  className,
}: {
  video: Pick<ExerciseVideoReference, 'hqThumbnailUrl' | 'thumbnailUrl'>;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return attempt < 2 ? (
    <img
      src={attempt === 0 ? video.hqThumbnailUrl : video.thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      width={480}
      height={270}
      className={className}
      onError={() => setAttempt((value) => value + 1)}
    />
  ) : (
    <span className="evg-thumbnail-fallback">
      <ImageOff size={26} aria-hidden="true" />
      <span>미리보기 이미지 없음</span>
    </span>
  );
}

function GalleryContent({
  exercise,
  compact = false,
  initialVisible = 6,
  onSelect,
  onUseForNoteDraft,
}: ExerciseVideoGalleryProps) {
  const videos = useMemo(() => getExerciseVideoReferences(exercise), [exercise]);
  const [region, setRegion] = useState<'all' | 'kr' | 'global'>('all');
  const [selectedId, setSelectedId] = useState(videos[0]?.videoId ?? '');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const firstPageSize = Number.isFinite(initialVisible)
    ? Math.max(3, Math.floor(initialVisible))
    : 6;
  const [visibleCount, setVisibleCount] = useState(firstPageSize);
  const id = useId();
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const restoreFocus = useRef(false);
  const newCardFocusIndex = useRef<number | null>(null);
  const filtered = region === 'all' ? videos : videos.filter((video) => video.region === region);
  const visible = filtered.slice(0, visibleCount);
  const selected = filtered.find((video) => video.videoId === selectedId) ?? filtered[0];
  const playing = Boolean(
    selected && selected.videoId === playingId && isStrictNoAutoplayEmbedUrl(selected.embedUrl),
  );

  useEffect(() => {
    if (playing) playerRef.current?.focus({ preventScroll: true });
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      playButtonRef.current?.focus({ preventScroll: true });
    }
  }, [playing]);

  useEffect(() => {
    if (newCardFocusIndex.current !== null) {
      cardRefs.current[newCardFocusIndex.current]?.focus();
      newCardFocusIndex.current = null;
    }
  }, [visibleCount]);

  useEffect(() => {
    const stop = () => {
      restoreFocus.current = false;
      setPlayingId(null);
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  const select = (video: ExerciseVideoReference) => {
    restoreFocus.current = false;
    setPlayingId(null);
    setSelectedId(video.videoId);
    onSelect?.(video);
  };
  const selectRegion = (next: typeof region) => {
    restoreFocus.current = false;
    newCardFocusIndex.current = null;
    setPlayingId(null);
    setRegion(next);
    setVisibleCount(firstPageSize);
    setSelectedId(
      (next === 'all' ? videos : videos.filter((video) => video.region === next))[0]?.videoId ?? '',
    );
  };
  const close = () => {
    restoreFocus.current = true;
    setPlayingId(null);
  };
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % visible.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + visible.length) % visible.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? visible.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    cardRefs.current[next]?.focus();
  };

  return (
    <section
      className={`evg-gallery ${compact ? 'is-compact' : ''}`}
      aria-label={`${exercise.nameKo} 참고 영상`}
      data-testid="exercise-video-gallery"
    >
      <div className="evg-heading">
        <div>
          <h3>
            참고 영상 <span>{videos.length}</span>
          </h3>
          {videos.length > 0 && <p>썸네일을 골라 여러 시범을 비교해 보세요.</p>}
        </div>
        {videos.some((video) => video.region === 'kr') &&
          videos.some((video) => video.region === 'global') && (
            <div className="evg-filters" role="group" aria-label="영상 국가 구분 필터">
              {(['all', 'kr', 'global'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={region === value}
                  onClick={() => selectRegion(value)}
                >
                  {value === 'all' ? '전체' : value === 'kr' ? '국내 (KR)' : '해외 (Global)'}{' '}
                  {value === 'all'
                    ? videos.length
                    : videos.filter((video) => video.region === value).length}
                </button>
              ))}
            </div>
          )}
      </div>
      {!videos.length ? (
        <p
          className="evg-empty"
          role="status"
          data-testid={
            exercise.youtube.url.trim() &&
            !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(exercise.youtube.url.trim())
              ? 'evg-invalid-url-fallback'
              : 'evg-empty-state'
          }
        >
          {exercise.youtube.url.trim() &&
          !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(exercise.youtube.url.trim())
            ? '등록된 영상 URL 형식을 확인하지 못해 재생할 수 없습니다. 영상 없이도 시퀀스 작성과 수업 진행은 계속할 수 있습니다.'
            : '이 동작에 연결된 참고 영상이 아직 없어요. (출처 미확인 · 정적/3D 참조 도해만 제공)'}
        </p>
      ) : (
        <>
          <div className="evg-grid" id={`${id}-choices`} role="group" aria-label="동작별 영상 선택">
            {visible.map((video, index) => (
              <button
                key={video.videoId}
                type="button"
                className={`evg-card ${video.videoId === selected?.videoId ? 'is-selected' : ''}`}
                aria-label={`${video.title} (${video.authorName}) 영상 선택`}
                aria-pressed={video.videoId === selected?.videoId}
                aria-controls={`${id}-selected`}
                onClick={() => select(video)}
                onKeyDown={(event) => moveFocus(event, index)}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                data-video-id={video.videoId}
                data-video-relation={video.relation}
              >
                <span className="evg-card-image">
                  <ExerciseVideoThumbnail video={video} />
                  <span className="evg-region">{video.region === 'kr' ? '국내' : '해외'}</span>
                  {video.videoId === selected?.videoId && (
                    <span className="evg-selected-mark">
                      <Check size={14} aria-hidden="true" />
                      선택됨
                    </span>
                  )}
                </span>
                <span className="evg-card-copy">
                  <span className="evg-relation">
                    {video.isPrimary ? '저장한 영상 · ' : ''}
                    {video.relationLabelKo}
                  </span>
                  <strong>{video.title}</strong>
                  <span className="evg-channel">{video.authorName}</span>
                </span>
              </button>
            ))}
          </div>
          {visibleCount < filtered.length && (
            <button
              type="button"
              className="evg-more"
              aria-controls={`${id}-choices`}
              onClick={() => {
                newCardFocusIndex.current = visible.length;
                setVisibleCount((value) => value + 3);
              }}
            >
              관련 영상 {Math.min(3, filtered.length - visibleCount)}개 더 보기{' '}
              <span>
                ({visible.length}/{filtered.length})
              </span>
            </button>
          )}
          {selected && (
            <div className="evg-selected" id={`${id}-selected`}>
              <div className="evg-selected-copy">
                <span className="evg-relation">
                  {selected.isPrimary ? '저장한 영상 · ' : ''}
                  {selected.relationLabelKo}
                </span>
                <h4>{selected.title}</h4>
                <p>{selected.authorName}</p>
                <p className="evg-reason">{selected.matchReasonKo}</p>
                {(() => {
                  const reviewState = getExerciseReviewState(exercise);
                  const sourceRef = exercise.sourceReference;
                  const exactMatchChecked = selected.isPrimary && reviewState === 'approved';
                  const playbackChecked =
                    !exactMatchChecked &&
                    sourceRef?.verificationStatus === 'partial-playback-checked' &&
                    sourceRef.url === selected.watchUrl;
                  const verificationTierLabel = exactMatchChecked
                    ? '해당 동작 일치 확인 (내 계획 검토 기록)'
                    : playbackChecked
                      ? '재생 확인 (원본 일부 재생 확인 · 전구간 일치 별도)'
                      : 'URL 존재 (공개 링크·메타데이터 확인 · 재생/동작 일치 미검증)';
                  const startSec = selected.startSec ?? 0;
                  const segmentLabel =
                    startSec > 0 || selected.endSec !== undefined
                      ? `${formatSecondsToMMSS(startSec)} ~ ${
                          selected.endSec !== undefined
                            ? formatSecondsToMMSS(selected.endSec)
                            : '끝'
                        }`
                      : '00:00 ~ 전체 (구간 미지정)';
                  const checkedDate =
                    selected.verifiedAt ??
                    (selected.isPrimary ? sourceRef?.verifiedAt : undefined) ??
                    (exactMatchChecked ? exercise.review?.reviewedAt?.slice(0, 10) : undefined) ??
                    '확인일 미기록';
                  return (
                    <dl className="evg-provenance-meta" data-testid="evg-provenance-meta">
                      <div>
                        <dt>검증 수준</dt>
                        <dd data-testid="evg-verification-tier">{verificationTierLabel}</dd>
                      </div>
                      <div>
                        <dt>구간</dt>
                        <dd>{segmentLabel}</dd>
                      </div>
                      <div>
                        <dt>출처 · URL</dt>
                        <dd>
                          {selected.authorName} · <code>{selected.watchUrl}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>확인일</dt>
                        <dd>{checkedDate}</dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>
              {playing && (
                <div
                  ref={playerRef}
                  tabIndex={-1}
                  className="evg-player"
                  role="region"
                  aria-label={`${selected.title} 인베드 플레이어`}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      event.stopPropagation();
                      close();
                    }
                  }}
                >
                  <div className="evg-player-bar">
                    <span>선택한 영상</span>
                    <button type="button" onClick={close} aria-label="인베드 플레이어 닫기">
                      <X size={16} aria-hidden="true" />
                      영상 닫기
                    </button>
                  </div>
                  <div className="evg-player-frame">
                    <iframe
                      key={`${selected.videoId}:${selected.startSec}:${selected.endSec ?? ''}`}
                      src={selected.embedUrl}
                      title={`${selected.title} - ${selected.authorName}`}
                      allow="encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              )}
              <div className="evg-actions">
                {!playing && (
                  <button
                    type="button"
                    className="evg-play"
                    ref={playButtonRef}
                    aria-label={`${selected.title} (${selected.authorName}) 인베드 영상 불러오기`}
                    onClick={() => {
                      if (!document.hidden) setPlayingId(selected.videoId);
                    }}
                  >
                    <Play size={16} aria-hidden="true" />
                    선택 영상 재생
                  </button>
                )}
                <a href={selected.watchUrl} target="_blank" rel="noopener noreferrer">
                  YouTube 원본 <ExternalLink size={14} aria-hidden="true" />
                </a>
                {onUseForNoteDraft && (
                  <button type="button" onClick={() => onUseForNoteDraft(selected)}>
                    내 노트 참조 URL로 반영
                  </button>
                )}
              </div>
              <p className="evg-review-note">
                제목·기구를 기준으로 연결한 참고 자료입니다. 전체 시범과 구간의 일치는 직접 확인해
                주세요.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Hidden, changed or edited subjects discard playback. Selection never edits the saved clip. */
export function ExerciseVideoGallery({ active = true, ...props }: ExerciseVideoGalleryProps) {
  return active ? (
    <GalleryContent key={exerciseVideoGalleryKey(props.exercise)} {...props} />
  ) : null;
}
