import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Globe, Plus, Search, Sparkles, Tv, X } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { PfBadge, PfButton } from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, PilatesExercise } from '../types/pilates';
import { resolveStudio3DMotionForExercise } from '../utils/studio3dMotionCatalog';
import { SpringVisualPills } from './SpringVisualPills';

export interface GlobalRepertoirePackExplorerProps {
  readonly onOpenExerciseDetail: (exercise: PilatesExercise) => void;
}

export const GlobalRepertoirePackExplorer: React.FC<GlobalRepertoirePackExplorerProps> = ({
  onOpenExerciseDetail,
}) => {
  const exercises = usePilatesStore((s) => s.exercises);
  const addCustomExercise = usePilatesStore((s) => s.addCustomExercise);
  const appendExerciseToSequence = usePilatesStore((s) => s.appendExerciseToSequence);

  const [apparatusFilter, setApparatusFilter] = useState<'all' | ApparatusType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const existingIds = useMemo(() => new Set(exercises.map((e) => e.id)), [exercises]);

  const unaddedPackItems = useMemo(
    () => GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((item) => !existingIds.has(item.id)),
    [existingIds],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((item) => {
      if (apparatusFilter !== 'all' && item.apparatus !== apparatusFilter) return false;
      if (!q) return true;
      const hay = [
        item.nameKo,
        item.nameEn,
        item.youtube.channelName,
        item.youtube.videoTitle,
        ...item.targetMuscles,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [apparatusFilter, searchQuery]);

  const handleImportAll = () => {
    if (unaddedPackItems.length === 0) {
      setStatusMessage('이미 모든 글로벌 확장 레퍼토리 동작이 내 라이브러리에 추가되어 있습니다.');
      return;
    }
    usePilatesStore.setState((state) => ({
      exercises: [...state.exercises, ...unaddedPackItems.map((it) => structuredClone(it))],
    }));
    setStatusMessage(
      `글로벌·국내 필라테스 확장 동작 ${unaddedPackItems.length}종과 참조 영상을 내 동작 노트에 일괄 추가했습니다.`,
    );
  };

  const handleAddSingleToLibrary = (item: PilatesExercise, alsoAddToSequence: boolean) => {
    if (!existingIds.has(item.id)) {
      addCustomExercise(structuredClone(item));
    }
    if (alsoAddToSequence) {
      appendExerciseToSequence(item.id, item.blockCategory);
      setStatusMessage(`‘${item.nameKo}’ 동작을 라이브러리에 보관하고 현재 수업 시퀀스에 담았습니다.`);
    } else {
      setStatusMessage(`‘${item.nameKo}’ 동작을 내 동작 라이브러리에 추가했습니다.`);
    }
  };

  return (
    <section
      className="pf-crawled-pack-section"
      data-testid="global-crawled-repertoire-explorer"
      aria-label="글로벌 확장 동작 레퍼토리 및 크롤링 영상 모음"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '12px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #173d34 0%, #245345 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.16)',
              fontSize: '0.74rem',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            <Globe size={13} aria-hidden="true" /> GLOBAL &amp; KR REPERTOIRE PACK ·{' '}
            {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length} MOVEMENTS ·{' '}
            {CRAWLED_YOUTUBE_DISCOVERY_POOL.length} VIDEOS
          </span>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: '#ffffff' }}>
            클래식·컨템포러리 확장 동작 도감 &amp; 국내외 공식 시범 영상
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#d7ebe2', lineHeight: 1.5 }}>
            클래식 매트 34, 리포머(스터먹 마사지·숏스파인·세미서클·니스트레치·롱박스·스플릿), 캐딜락(몽키·티저·타워·행잉),
            체어(고잉업·마운틴클라이머·풀업), 래더 바렐(트리·사이드싯업·그래스하퍼) 등{' '}
            <strong>{GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종 동작과 연결된 공식 YouTube 참조 영상</strong>을
            한 번에 추가하거나 바로 수업에 담으세요. (미검토 참조 자료 · 강사 현장 확인 필수)
          </p>
        </div>

        <button
          type="button"
          data-testid="import-all-crawled-repertoire-btn"
          onClick={handleImportAll}
          disabled={unaddedPackItems.length === 0}
          style={{
            minHeight: '46px',
            padding: '10px 18px',
            borderRadius: '14px',
            border: 'none',
            background: unaddedPackItems.length === 0 ? 'rgba(255,255,255,0.22)' : '#fffef9',
            color: unaddedPackItems.length === 0 ? '#d8e6df' : '#173d34',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: unaddedPackItems.length === 0 ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {unaddedPackItems.length === 0 ? (
            <>
              <Check size={16} aria-hidden="true" /> 전체 {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종 추가 완료
            </>
          ) : (
            <>
              <Sparkles size={16} aria-hidden="true" /> 원클릭 전체 확장 동작 추가 (+{unaddedPackItems.length}종)
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#eaf3ee',
            border: '1px solid #bdd3c6',
            color: '#173d34',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          {statusMessage}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fffef9',
          padding: '12px 14px',
          borderRadius: '16px',
          border: '1px solid #d5ddd0',
        }}
      >
        <div role="group" aria-label="확장 도감 기구 필터" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(
            [
              { id: 'all', label: `전체 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length})` },
              {
                id: 'mat',
                label: `매트 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((x) => x.apparatus === 'mat').length})`,
              },
              {
                id: 'reformer',
                label: `리포머 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((x) => x.apparatus === 'reformer').length})`,
              },
              {
                id: 'cadillac',
                label: `캐딜락 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((x) => x.apparatus === 'cadillac').length})`,
              },
              {
                id: 'chair',
                label: `체어 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((x) => x.apparatus === 'chair').length})`,
              },
              {
                id: 'barrel',
                label: `바렐 (${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.filter((x) => x.apparatus === 'barrel').length})`,
              },
            ] as const
          ).map((tab) => {
            const active = apparatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setApparatusFilter(tab.id)}
                style={{
                  minHeight: '38px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: active ? '1px solid #173d34' : '1px solid #d5ddd0',
                  background: active ? '#173d34' : '#f7f5ee',
                  color: active ? '#ffffff' : '#1e3129',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f7f5ee',
            border: '1px solid #d5ddd0',
            borderRadius: '999px',
            padding: '6px 12px',
            minWidth: '240px',
            flex: '1 1 240px',
            maxWidth: '360px',
          }}
        >
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            aria-label="확장 레퍼토리 동작 및 영상 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="동작명·영문명·채널·근육 검색"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.84rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="확장 검색어 지우기"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
          gap: '14px',
        }}
      >
        {filteredItems.map((item) => {
          const motionSpec = resolveStudio3DMotionForExercise(item);
          const inLibrary = existingIds.has(item.id);
          const isEmbedOpen = activeEmbedId === item.id;
          return (
            <article
              key={item.id}
              style={{
                background: '#fffef9',
                border: '1px solid #d6dfd3',
                borderRadius: '18px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(23, 61, 52, 0.04)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  aspectRatio: '16 / 10',
                  background: '#efeae0',
                }}
              >
                {isEmbedOpen ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${item.youtube.videoId}?rel=0&autoplay=0`}
                    title={`${item.nameKo} 참조 YouTube 영상`}
                    allow="encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ width: '100%', height: '100%', border: 0 }}
                  />
                ) : (
                  <>
                    <img
                      src={motionSpec.peakImg}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: 'rgba(23,61,52,0.88)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {APPARATUS_LABELS[item.apparatus]?.ko} · Lv {item.level}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveEmbedId(item.id)}
                      aria-label={`${item.nameKo} 연결 영상 미리보기`}
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        minHeight: '32px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: 'none',
                        background: 'rgba(255,254,249,0.95)',
                        color: '#173d34',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Tv size={12} aria-hidden="true" />
                      영상 열기 ({item.youtube.region === 'kr' ? '국내' : '해외'})
                    </button>
                  </>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                  <PfBadge tone="neutral">{POSITION_LABELS[item.bodyPosition]?.ko}</PfBadge>
                  <PfBadge tone="neutral">{item.defaultDurationMin}분</PfBadge>
                  <SpringVisualPills springs={item.springs} />
                </div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#173d34' }}>
                  {item.nameKo}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#56685f' }}>{item.nameEn}</span>
              </div>

              <p style={{ margin: 0, fontSize: '0.8rem', color: '#2b3e35', lineHeight: 1.45 }}>
                • {item.cues[0]}
              </p>

              <div
                style={{
                  padding: '7px 10px',
                  borderRadius: '10px',
                  background: '#f6f4ed',
                  fontSize: '0.74rem',
                  color: '#4c5d53',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🎬 {item.youtube.channelName} · {item.youtube.videoTitle}
                </span>
                <a
                  href={item.youtube.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flexShrink: 0, color: '#173d34', fontWeight: 700 }}
                >
                  원본 <ExternalLink size={11} />
                </a>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
                <PfButton
                  variant="secondary"
                  onClick={() => {
                    if (!inLibrary) addCustomExercise(structuredClone(item));
                    onOpenExerciseDetail(item);
                  }}
                >
                  3초 상세 열기
                </PfButton>
                <PfButton
                  variant="secondary"
                  disabled={inLibrary}
                  onClick={() => handleAddSingleToLibrary(item, false)}
                >
                  {inLibrary ? '보관됨 ✓' : '+ 노트에 보관'}
                </PfButton>
                <PfButton
                  variant="primary"
                  onClick={() => handleAddSingleToLibrary(item, true)}
                >
                  <Plus size={14} aria-hidden="true" /> 수업에 담기
                </PfButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
