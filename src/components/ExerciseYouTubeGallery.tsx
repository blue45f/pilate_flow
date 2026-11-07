import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Globe, Play, Tv, X } from 'lucide-react';
import {
  getRelatedYouTubeVideosForExercise,
  getRelatedYouTubeVideosForMotion,
} from '../data/exerciseYouTubeCatalog';
import type { CuratedYouTubeVideoItem } from '../data/exerciseYouTubeCatalog';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import {
  isStrictNoAutoplayEmbedUrl,
  normalizeReferenceUrlPolicy,
} from '../features/referenceLinkPolicyCandidate';
import type { PilatesExercise } from '../types/pilates';
import '../styles/exercise-youtube-gallery.css';

interface ExerciseYouTubeGalleryProps {
  exercise?: PilatesExercise;
  motionReference?: MotionPatternReference;
  maxPerRegion?: number;
  compact?: boolean;
  onSelectForNoteDraft?: (video: CuratedYouTubeVideoItem) => void;
}

const ExerciseYouTubeGalleryContent: React.FC<ExerciseYouTubeGalleryProps> = ({
  exercise,
  motionReference,
  maxPerRegion = 4,
  compact = false,
  onSelectForNoteDraft,
}) => {
  const [regionFilter, setRegionFilter] = useState<'all' | 'kr' | 'global'>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const contentId = React.useId();
  const playerRef = useRef<HTMLDivElement>(null);
  const playerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const closePlayer = () => {
    setActiveVideoId(null);
    playerTriggerRef.current?.focus({ preventScroll: true });
    playerTriggerRef.current?.scrollIntoView?.({ block: 'nearest' });
  };
  const toggleVideo = (videoId: string, trigger: HTMLButtonElement) => {
    if (activeVideoId === videoId) {
      closePlayer();
      return;
    }
    playerTriggerRef.current = trigger;
    setActiveVideoId(videoId);
  };
  useEffect(() => {
    if (!activeVideoId) return;
    playerRef.current?.focus({ preventScroll: true });
    playerRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeVideoId]);

  useEffect(() => {
    const stop = () => setActiveVideoId(null);
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  const selectRegion = (region: 'all' | 'kr' | 'global') => {
    setActiveVideoId(null);
    setRegionFilter(region);
  };

  const videos = useMemo(() => {
    if (exercise) {
      return getRelatedYouTubeVideosForExercise(exercise, maxPerRegion);
    }
    if (motionReference) {
      return getRelatedYouTubeVideosForMotion(motionReference, maxPerRegion);
    }
    return [];
  }, [exercise, motionReference, maxPerRegion]);

  const filtered = useMemo(() => {
    if (regionFilter === 'all') return videos;
    return videos.filter((v) => v.region === regionFilter);
  }, [videos, regionFilter]);

  const activeVideo = useMemo(
    () => videos.find((v) => v.videoId === activeVideoId) ?? null,
    [videos, activeVideoId],
  );
  const activeVideoPolicy = useMemo(
    () =>
      activeVideo
        ? normalizeReferenceUrlPolicy(activeVideo.watchUrl, {
            startSec: activeVideo.startSec,
          })
        : null,
    [activeVideo],
  );

  const krCount = videos.filter((v) => v.region === 'kr').length;
  const globalCount = videos.filter((v) => v.region === 'global').length;
  const subjectTitle = exercise?.nameKo ?? motionReference?.title ?? '동작';

  if (!videos.length) {
    if (!exercise && !motionReference) return null;
    return (
      <section className="eyg-section" aria-label={`${subjectTitle} 연관 국내·해외 YouTube 영상`}>
        <div className="eyg-header">
          <h4>참고 영상 확인이 필요합니다</h4>
        </div>
        <p className="eyg-disclaimer" role="status">
          기구와 동작 조건에 맞는 연관 영상을 아직 찾지 못했습니다. 다른 동작이나 다른 기구의
          영상으로 빈자리를 채우지 않습니다. 직접 연결한 원출처가 있다면 강사가 시작 자세와 동작
          일치를 확인해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`eyg-section ${compact ? 'is-compact' : ''}`}
      aria-label={`${subjectTitle} 연관 국내·해외 YouTube 영상`}
    >
      <button
        type="button"
        className="eyg-disclosure"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-describedby={`${contentId}-review-status`}
        aria-label={`참고 영상 ${videos.length}개 ${expanded ? '접기' : '펼치기'}`}
        onClick={() => {
          setActiveVideoId(null);
          setExpanded((value) => !value);
        }}
      >
        <span className="eyg-disclosure-icon">
          <Tv size={20} aria-hidden="true" />
        </span>
        <span className="eyg-disclosure-copy">
          <strong>
            참고 영상 <span>{videos.length}</span>
          </strong>
          <small id={`${contentId}-review-status`}>연관 자료 · 동일 동작 시범은 미검수</small>
        </span>
        <ChevronDown size={18} className="eyg-disclosure-chevron" aria-hidden="true" />
      </button>
      {expanded && (
        <div id={contentId} className="eyg-disclosure-content">
          <div className="eyg-header">
            <div className="eyg-filter-pills" role="group" aria-label="영상 국가 구분 필터">
              <button
                type="button"
                aria-pressed={regionFilter === 'all'}
                className={regionFilter === 'all' ? 'is-active' : ''}
                onClick={() => selectRegion('all')}
              >
                전체 {videos.length}
              </button>
              <button
                type="button"
                aria-pressed={regionFilter === 'kr'}
                className={regionFilter === 'kr' ? 'is-active' : ''}
                onClick={() => selectRegion('kr')}
              >
                국내 (KR) {krCount}
              </button>
              <button
                type="button"
                aria-pressed={regionFilter === 'global'}
                className={regionFilter === 'global' ? 'is-active' : ''}
                onClick={() => selectRegion('global')}
              >
                해외 (Global) {globalCount}
              </button>
            </div>
          </div>

          {activeVideo && (
            <div
              ref={playerRef}
              tabIndex={-1}
              className="eyg-embed-stage"
              role="region"
              aria-label={`${activeVideo.title} 인베드 플레이어`}
            >
              <div className="eyg-embed-topbar">
                <div className="eyg-embed-meta">
                  <span className={`eyg-region-tag is-${activeVideo.region}`}>
                    {activeVideo.region === 'kr' ? '국내 KR' : '해외 GLOBAL'}
                  </span>
                  <strong>{activeVideo.title}</strong>
                  <small>{activeVideo.authorName}</small>
                </div>
                <div className="eyg-embed-actions">
                  {onSelectForNoteDraft && (
                    <button
                      type="button"
                      className="btn-secondary eyg-use-btn"
                      onClick={() => onSelectForNoteDraft(activeVideo)}
                    >
                      내 노트 참조 URL로 반영
                    </button>
                  )}
                  <a
                    href={activeVideoPolicy?.canonicalExternalUrl ?? activeVideo.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyg-ext-link"
                  >
                    YouTube 원본 <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    className="eyg-close-embed"
                    aria-label="인베드 플레이어 닫기"
                    onClick={closePlayer}
                  >
                    <X size={16} /> 닫기
                  </button>
                </div>
              </div>
              <div className="eyg-iframe-wrap">
                {(() => {
                  const candidateEmbedUrl =
                    activeVideoPolicy?.embedUrl ?? `${activeVideo.embedUrl}&autoplay=0`;
                  if (!isStrictNoAutoplayEmbedUrl(candidateEmbedUrl)) return null;
                  return (
                    <iframe
                      src={candidateEmbedUrl}
                      title={`${activeVideo.title} - ${activeVideo.authorName}`}
                      allow="encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  );
                })()}
              </div>
            </div>
          )}

          <div className="eyg-grid">
            {filtered.map((video) => {
              const isPlaying = activeVideo?.videoId === video.videoId;
              return (
                <article
                  key={video.videoId}
                  className={`eyg-card ${isPlaying ? 'is-playing' : ''}`}
                >
                  <button
                    type="button"
                    className="eyg-thumb-button"
                    onClick={(event) => toggleVideo(video.videoId, event.currentTarget)}
                    aria-label={`${video.title} (${video.authorName}) 인베드 영상 ${isPlaying ? '닫기' : '불러오기'}`}
                  >
                    <img src={video.thumbnailUrl} alt="" loading="lazy" className="eyg-thumb-img" />
                    <span className={`eyg-thumb-badge is-${video.region}`}>
                      <Globe size={11} aria-hidden="true" />
                      {video.region === 'kr' ? '국내' : '해외'}
                    </span>
                    <span className="eyg-play-overlay">
                      <Play size={18} fill="currentColor" aria-hidden="true" />
                      <span>{isPlaying ? '플레이어 열림' : '영상 불러오기'}</span>
                    </span>
                  </button>
                  <div className="eyg-card-body">
                    <strong className="eyg-card-title" title={video.title}>
                      {video.title}
                    </strong>
                    <span className="eyg-card-channel">{video.authorName}</span>
                    <span className="eyg-card-reason">{video.matchReasonKo}</span>
                    <div className="eyg-card-footer">
                      <button
                        type="button"
                        className="eyg-inline-play-btn"
                        onClick={(event) => toggleVideo(video.videoId, event.currentTarget)}
                      >
                        <Play size={12} /> {isPlaying ? '플레이어 닫기' : '영상 불러오기'}
                      </button>
                      <a
                        href={video.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="eyg-inline-ext"
                      >
                        원본 ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="eyg-disclaimer">
            영상은 자동 재생하지 않습니다. oEmbed는 영상 정보 확인이며 동작 시범 검증이 아닙니다.
            직접 연결한 출처는 별도 확인이 필요합니다. 실제 수업 전 기구·시작 자세·동작 일치를
            확인하세요.
          </p>
        </div>
      )}
    </section>
  );
};

export const ExerciseYouTubeGallery: React.FC<ExerciseYouTubeGalleryProps> = (props) => (
  <ExerciseYouTubeGalleryContent
    key={`${props.exercise?.id ?? ''}:${props.motionReference?.variantId ?? ''}`}
    {...props}
  />
);
