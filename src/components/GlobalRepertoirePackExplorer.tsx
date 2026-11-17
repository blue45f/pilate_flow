import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Globe, Plus, Search, Tv, X } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { getExerciseSourcePageReferences } from '../data/exerciseVideoBindings';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { PfBadge, PfButton } from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, PilatesExercise } from '../types/pilates';
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
        className="pf-crawled-pack-hero"
        style={{
          background: '#ffffff',
          color: '#1f1b16',
          border: '1px solid rgba(31, 27, 22, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: '#faf8f4',
              border: '1px solid rgba(31, 27, 22, 0.14)',
              color: '#5e554a',
              fontSize: '0.75rem',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              marginBottom: '8px',
            }}
          >
            <Globe size={14} strokeWidth={1.5} aria-hidden="true" /> 국내외 확장 동작 도감 ·{' '}
            {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종 동작 ·{' '}
            {CRAWLED_YOUTUBE_DISCOVERY_POOL.length}편 참조 영상
          </span>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600, color: '#1f1b16' }}>
            클래식·컨템포러리 확장 동작 도감 &amp; 국내외 공식 시범 영상
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#5e554a', lineHeight: 1.55 }}>
            클래식 매트 34, 리포머(스터먹 마사지·숏스파인·세미서클·니스트레치·롱박스·스플릿), 캐딜락(몽키·티저·타워·행잉),
            체어(고잉업·마운틴클라이머·풀업), 래더 바렐(트리·사이드싯업·그래스하퍼) 등{' '}
            <strong style={{ color: '#1f1b16', fontWeight: 600 }}>
              {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종 동작과 연결된 공식 YouTube 참조 영상
            </strong>
            을 한 번에 추가하거나 바로 수업에 담으세요. (미검토 참조 자료 · 강사 현장 확인 필수)
          </p>
        </div>

        <button
          type="button"
          data-testid="import-all-crawled-repertoire-btn"
          onClick={handleImportAll}
          disabled={unaddedPackItems.length === 0}
          style={{
            minHeight: '44px',
            padding: '10px 16px',
            borderRadius: '10px',
            border:
              unaddedPackItems.length === 0
                ? '1px solid rgba(31, 27, 22, 0.14)'
                : '1px solid #1f4435',
            background: unaddedPackItems.length === 0 ? '#faf8f4' : '#1f4435',
            color: unaddedPackItems.length === 0 ? '#5e554a' : '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            fontVariantNumeric: 'tabular-nums',
            cursor: unaddedPackItems.length === 0 ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {unaddedPackItems.length === 0 ? (
            <>
              <Check size={16} strokeWidth={1.5} aria-hidden="true" /> 전체 {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종 추가 완료
            </>
          ) : (
            <>
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" /> 원클릭 전체 확장 동작 추가 (+{unaddedPackItems.length}종)
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
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#faf8f4',
            border: '1px solid rgba(31, 68, 53, 0.24)',
            color: '#1f4435',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </p>
      )}

      <div
        className="pf-crawled-pack-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '16px',
          border: '1px solid rgba(31, 27, 22, 0.08)',
        }}
      >
        <div role="group" aria-label="확장 도감 기구 필터" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                  minHeight: '40px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: active ? '1px solid #1f4435' : '1px solid rgba(31, 27, 22, 0.14)',
                  background: active ? '#1f4435' : '#faf8f4',
                  color: active ? '#ffffff' : '#1f1b16',
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                  fontVariantNumeric: 'tabular-nums',
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
            background: '#faf8f4',
            border: '1px solid rgba(31, 27, 22, 0.14)',
            borderRadius: '10px',
            padding: '8px 12px',
            minHeight: '40px',
            minWidth: 0,
            flex: '1 1 220px',
            maxWidth: '360px',
          }}
        >
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
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
              minWidth: 0,
              fontSize: '0.875rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="확장 검색어 지우기"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          )}
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
          gap: '16px',
        }}
      >
        {filteredItems.map((item) => {
          const inLibrary = existingIds.has(item.id);
          const hasVideo = /^[A-Za-z0-9_-]{11}$/.test(item.youtube.videoId);
          const sourcePage = getExerciseSourcePageReferences(item)[0];
          const referenceUrl = hasVideo ? item.youtube.url : sourcePage?.url;
          const isEmbedOpen = hasVideo && activeEmbedId === item.id;
          return (
            <article
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(31, 27, 22, 0.08)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  aspectRatio: '16 / 10',
                  background: '#efe9df',
                  outline: '1px solid rgba(31, 27, 22, 0.08)',
                  outlineOffset: '-1px',
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
                    <ExerciseMotionArtwork
                      exercise={item}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(31, 27, 22, 0.84)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {APPARATUS_LABELS[item.apparatus]?.ko} · Lv {item.level}
                    </span>
                    {hasVideo && <button
                      type="button"
                      onClick={() => setActiveEmbedId(item.id)}
                      aria-label={`${item.nameKo} 연결 영상 미리보기`}
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        minHeight: '32px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(31, 27, 22, 0.14)',
                        background: 'rgba(255, 255, 255, 0.96)',
                        color: '#1f1b16',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Tv size={14} strokeWidth={1.5} aria-hidden="true" />
                      영상 열기 ({item.youtube.region === 'kr' ? '국내' : '해외'})
                    </button>}
                  </>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  <PfBadge tone="neutral">{POSITION_LABELS[item.bodyPosition]?.ko}</PfBadge>
                  <PfBadge tone="neutral">{item.defaultDurationMin}분</PfBadge>
                  <SpringVisualPills springs={item.springs} />
                </div>
                <strong style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#1f1b16' }}>
                  {item.nameKo}
                </strong>
                <span style={{ fontSize: '0.8125rem', color: '#5e554a' }}>{item.nameEn}</span>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#5e554a', lineHeight: 1.5 }}>
                {item.cues[0]}
              </p>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#faf8f4',
                  border: '1px solid rgba(31, 27, 22, 0.08)',
                  fontSize: '0.75rem',
                  color: '#5e554a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hasVideo
                    ? `${item.youtube.channelName} · ${item.youtube.videoTitle}`
                    : sourcePage ? `${sourcePage.publisher} · 동작 설명 원문` : '개별 영상 연결 확인 중'}
                </span>
                {referenceUrl && <a
                  href={referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flexShrink: 0, color: '#1f4435', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {hasVideo ? '영상 원본' : '설명 원문'} <ExternalLink size={12} strokeWidth={1.5} aria-hidden="true" />
                </a>}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto' }}>
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
                  <Plus size={15} strokeWidth={1.5} aria-hidden="true" /> 수업에 담기
                </PfButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
