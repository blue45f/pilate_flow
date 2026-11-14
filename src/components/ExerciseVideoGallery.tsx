import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ExternalLink, ImageOff, Play, X } from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import {
  exerciseVideoGalleryKey,
  getExerciseVideoReferences,
  type ExerciseVideoReference,
} from '../utils/exerciseVideoReferences';
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
        <p className="evg-empty" role="status">
          이 동작에 연결된 참고 영상이 아직 없어요.
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
