import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ExternalLink, Film, Play, Search, X } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { VERIFIED_YOUTUBE_VIDEO_POOL } from '../data/exerciseYouTubeCatalog';
import { filterPilatesVideos } from '../utils/pilatesVideoSearch';
import type { ApparatusType } from '../types/pilates';
import '../styles/pilates-video-library.css';

const PAGE_SIZE = 12;
const APPARATUS: ApparatusType[] = ['mat', 'reformer', 'cadillac', 'chair', 'barrel'];
function sourceHref(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function VideoThumbnail({ videoId }: { videoId: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <Film size={34} aria-hidden="true" />
  ) : (
    <img
      src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
      alt=""
      width={480}
      height={360}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function PilatesVideoLibrary() {
  const id = useId();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [apparatus, setApparatus] = useState<ApparatusType | 'all'>('all');
  const [region, setRegion] = useState<'all' | 'kr' | 'global'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const playerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const videos = useMemo(
    () => filterPilatesVideos(VERIFIED_YOUTUBE_VIDEO_POOL, deferredQuery, apparatus, region),
    [deferredQuery, apparatus, region],
  );
  const active = videos.find((video) => video.videoId === activeId);
  const source = sourceHref(active?.sourceUrl);

  useEffect(() => {
    if (activeId) playerRef.current?.focus({ preventScroll: true });
  }, [activeId]);
  useEffect(() => {
    const stop = () => setActiveId(null);
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const resetResults = () => {
    setVisibleCount(PAGE_SIZE);
    setActiveId(null);
  };
  const closePlayer = () => {
    setActiveId(null);
    triggerRef.current?.focus({ preventScroll: true });
  };
  const resetFilters = () => {
    setQuery('');
    setApparatus('all');
    setRegion('all');
    resetResults();
  };

  return (
    <section className="pilates-video-library" aria-labelledby={`${id}-heading`}>
      <header className="pvl-heading">
        <div>
          <span className="pvl-eyebrow">MOVEMENT FILMS</span>
          <h2 id={`${id}-heading`}>동작을 영상으로 살펴보세요</h2>
          <p>동작 이름·기구·제작자로 검색하고, 필요한 영상을 골라 비교하세요.</p>
        </div>
        <span className="pvl-total">
          <Film size={18} aria-hidden="true" />
          {VERIFIED_YOUTUBE_VIDEO_POOL.length}편
        </span>
      </header>
      <div className="pvl-filters">
        <label className="pvl-search" htmlFor={`${id}-search`}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">전체 동작 영상 검색</span>
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            autoComplete="off"
            placeholder="예: 롤업, footwork, Lesley Logan"
            onChange={(event) => {
              setQuery(event.target.value);
              resetResults();
            }}
          />
        </label>
        <label className="pvl-region">
          <span>영상 분류</span>
          <select
            aria-label="전체 동작 영상 지역"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value as typeof region);
              resetResults();
            }}
          >
            <option value="all">국내·해외 전체</option>
            <option value="kr">국내</option>
            <option value="global">해외</option>
          </select>
        </label>
      </div>
      <div className="pvl-apparatus" role="group" aria-label="전체 동작 영상 기구">
        {(['all', ...APPARATUS] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={apparatus === item}
            onClick={() => {
              setApparatus(item);
              resetResults();
            }}
          >
            {item === 'all' ? '전체 기구' : APPARATUS_LABELS[item].ko}
          </button>
        ))}
      </div>
      <div className="pvl-result-bar">
        <p role="status" aria-live="polite">
          검색 결과 <strong>{videos.length}</strong>편
        </p>
        {(query || apparatus !== 'all' || region !== 'all') && (
          <button type="button" onClick={resetFilters}>
            조건 초기화 <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {active && (
        <section
          ref={playerRef}
          className="pvl-player"
          tabIndex={-1}
          aria-label={`${active.title} 영상 플레이어`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closePlayer();
            }
          }}
        >
          <div className="pvl-player-top">
            <div>
              <strong>{active.title}</strong>
              <span>{active.authorName}</span>
            </div>
            <button type="button" aria-label="동작 영상 플레이어 닫기" onClick={closePlayer}>
              <X size={18} aria-hidden="true" />
              닫기
            </button>
          </div>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${active.videoId}?rel=0&autoplay=0`}
            title={`${active.title} · ${active.authorName}`}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="pvl-player-links">
            <a
              href={`https://www.youtube.com/watch?v=${active.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube에서 보기 <ExternalLink size={14} aria-hidden="true" />
            </a>
            {source && (
              <a href={source} target="_blank" rel="noopener noreferrer">
                제작자 동작 설명 <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            <small>재생이 제한되면 YouTube 원본에서 확인하세요.</small>
          </div>
        </section>
      )}
      {videos.length ? (
        <div className="pvl-grid">
          {videos.slice(0, visibleCount).map((video) => (
            <article
              key={video.videoId}
              className={`pvl-card ${activeId === video.videoId ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="pvl-card-preview"
                aria-label={`${video.title} 영상 열기`}
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setActiveId(video.videoId);
                }}
              >
                <VideoThumbnail videoId={video.videoId} />
                <span className="pvl-play">
                  <Play size={20} fill="currentColor" aria-hidden="true" />
                </span>
                <span className="pvl-region-badge">{video.region === 'kr' ? '국내' : '해외'}</span>
              </button>
              <div className="pvl-card-copy">
                <p className="pvl-card-equipment">
                  {video.apparatus.map((item) => APPARATUS_LABELS[item].ko).join(' · ')}
                </p>
                <h3>{video.title}</h3>
                <p className="pvl-author">{video.authorName}</p>
                <div className="pvl-card-links">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    원본 보기 <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  {sourceHref(video.sourceUrl) && (
                    <a
                      href={sourceHref(video.sourceUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      동작 설명 <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>
                {video.verificationMethod && (
                  <small className="pvl-check">
                    제작자 원문·제목 확인
                    {video.verifiedAt ? ` · ${video.verifiedAt.slice(0, 10)}` : ''}
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pvl-empty">
          <Search size={26} aria-hidden="true" />
          <h3>조건에 맞는 영상이 없습니다</h3>
          <p>다른 동작 이름이나 영문 이름으로 검색해 보세요.</p>
          <button type="button" onClick={resetFilters}>
            전체 영상 보기
          </button>
        </div>
      )}
      {videos.length > visibleCount && (
        <div className="pvl-more">
          <p>
            {visibleCount} / {videos.length}편 표시
          </p>
          <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            영상 {Math.min(PAGE_SIZE, videos.length - visibleCount)}편 더 보기
          </button>
        </div>
      )}
      <p className="pvl-source-note">
        영상과 설명의 권리는 제작자에게 있습니다. 출처·제목 확인과 동작 전체 재생 검수는 구분하며,
        수업 활용 전 원본을 확인해 주세요.
      </p>
    </section>
  );
}
