import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  Compass,
  HeartHandshake,
  MessageCircleHeart,
  Plus,
  Wind,
} from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import {
  buildIntuitiveAnatomyInsight,
  formatDifficultyMeta,
  PILATES_FUNDAMENTAL_CARDS,
  type PilatesFundamentalCard,
} from '../utils/instructorUxHelpers';
import { getStudioTrackAdapters, type AnatomyVisualZone } from '../utils/studioTrackSlots';
import { SpringVisualPills } from './SpringVisualPills';

export interface IntuitiveAnatomyGuideCardProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
  readonly showFundamentalsDrawer?: boolean;
  readonly onInsertCue?: (cueText: string) => void;
  readonly voiceSlot?: React.ReactNode;
}

function AnatomyZoneFallbackSvg({ zone }: { readonly zone: AnatomyVisualZone }) {
  const highlightMap: Record<AnatomyVisualZone, { cx: number; cy: number; rx: number; ry: number; secondary?: { cx: number; cy: number; r: number } }> = {
    core: { cx: 60, cy: 56, rx: 14, ry: 17, secondary: { cx: 60, cy: 72, r: 9 } },
    glutes: { cx: 60, cy: 74, rx: 17, ry: 12, secondary: { cx: 60, cy: 95, r: 10 } },
    spine: { cx: 60, cy: 48, rx: 8, ry: 25, secondary: { cx: 60, cy: 36, r: 12 } },
    shoulder: { cx: 60, cy: 34, rx: 22, ry: 9, secondary: { cx: 60, cy: 46, r: 10 } },
    lateral: { cx: 71, cy: 58, rx: 8, ry: 18, secondary: { cx: 49, cy: 58, r: 7 } },
    hip: { cx: 60, cy: 76, rx: 18, ry: 11, secondary: { cx: 60, cy: 62, r: 9 } },
  };
  const h = highlightMap[zone];

  return (
    <svg
      viewBox="0 0 120 132"
      className="pf-anatomy-fallback-svg"
      role="img"
      aria-label="활성 근육 부위 도식"
    >
      <rect width="120" height="132" rx="10" fill="#F3F5EE" />
      {/* Subtle vertical centerline */}
      <line x1="60" y1="14" x2="60" y2="118" stroke="rgba(53,84,65,0.16)" strokeWidth="1" strokeDasharray="3 3" />
      {/* Minimal calm anatomical torso silhouette */}
      <circle cx="60" cy="20" r="8" fill="rgba(31,27,22,0.12)" />
      <path
        d="M42 36 C42 30 78 30 78 36 L74 74 L72 116 L63 116 L60 86 L57 116 L48 116 L46 74 Z"
        fill="rgba(31,27,22,0.09)"
        stroke="rgba(31,27,22,0.22)"
        strokeWidth="1.25"
      />
      {/* Stabilizer support halo */}
      {h.secondary && (
        <circle
          cx={h.secondary.cx}
          cy={h.secondary.cy}
          r={h.secondary.r}
          fill="rgba(53,84,65,0.18)"
        />
      )}
      {/* Agonist primary focus zone */}
      <ellipse cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry} fill="rgba(53,84,65,0.42)" />
      <ellipse
        cx={h.cx}
        cy={h.cy}
        rx={Math.max(4, h.rx * 0.52)}
        ry={Math.max(4, h.ry * 0.52)}
        fill="#355441"
      />
    </svg>
  );
}

function AnatomyIllustration({
  zone,
  webpSrc,
  pngSrc,
  alt,
}: {
  readonly zone: AnatomyVisualZone;
  readonly webpSrc: string;
  readonly pngSrc: string;
  readonly alt: string;
}) {
  const [stage, setStage] = useState<'webp' | 'png' | 'svg'>('webp');

  if (stage === 'svg') {
    return <AnatomyZoneFallbackSvg zone={zone} />;
  }

  return (
    <img
      src={stage === 'webp' ? webpSrc : pngSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="pf-anatomy-guide__img"
      onError={() => {
        setStage((prev) => (prev === 'webp' ? 'png' : 'svg'));
      }}
    />
  );
}

function FundamentalImage({ card }: { readonly card: PilatesFundamentalCard }) {
  const [stage, setStage] = useState<'webp' | 'png' | 'hidden'>('webp');
  if (stage === 'hidden') return null;

  return (
    <img
      src={stage === 'webp' ? card.webpSrc : card.pngSrc}
      alt={card.titleKo}
      loading="lazy"
      decoding="async"
      className="pf-fundamental-card__img"
      onError={() => setStage((prev) => (prev === 'webp' ? 'png' : 'hidden'))}
    />
  );
}

export const PilatesFundamentalsDrawer: React.FC<{
  readonly defaultOpen?: boolean;
}> = ({ defaultOpen = false }) => {
  return (
    <details
      className="pf-fundamentals-drawer"
      data-testid="pilates-fundamentals-drawer"
      open={defaultOpen || undefined}
    >
      <summary className="pf-fundamentals-drawer__summary">
        <span className="pf-fundamentals-drawer__summary-left">
          <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>필라테스 기초 지식 한눈에</span>
          <small>호흡 · 골반 · 스프링 · 등 움직임</small>
        </span>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
      </summary>
      <div className="pf-fundamentals-grid">
        {PILATES_FUNDAMENTAL_CARDS.map((card) => (
          <div key={card.id} className="pf-fundamental-card">
            <div className="pf-fundamental-card__media">
              <FundamentalImage card={card} />
            </div>
            <div className="pf-fundamental-card__body">
              <h4>{card.titleKo}</h4>
              <p className="pf-fundamental-card__rule">{card.shortRuleKo}</p>
              <p className="pf-fundamental-card__detail">{card.detailKo}</p>
              <p className="pf-fundamental-card__cue">{card.cueTipKo}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
};

export const IntuitiveAnatomyGuideCard: React.FC<IntuitiveAnatomyGuideCardProps> = ({
  exercise,
  compact = false,
  showFundamentalsDrawer = true,
  onInsertCue,
  voiceSlot,
}) => {
  const insight = useMemo(() => buildIntuitiveAnatomyInsight(exercise), [exercise]);
  const difficulty = useMemo(() => formatDifficultyMeta(exercise.level), [exercise.level]);
  const slotVoiceButton =
    voiceSlot ??
    getStudioTrackAdapters().renderNaturalVoiceSpeakButton?.({ exercise, compact }) ??
    null;

  return (
    <section
      className={`pf-anatomy-guide ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="intuitive-anatomy-guide-card"
      aria-label={`${exercise.nameKo} 직관 해부학 및 기초 원리 안내`}
    >
      <header className="pf-anatomy-guide__header">
        <div className="pf-anatomy-guide__title-row">
          <div>
            <h3>몸의 어디를 쓰나요?</h3>
            <p className="pf-anatomy-guide__subtitle">
              힘이 들어가는 곳과 자세를 편하게 잡는 방법을 살펴보세요.
            </p>
          </div>
          <div className="pf-anatomy-guide__header-meta">
            <span
              className={`pf-difficulty-badge is-${difficulty.tone}`}
              aria-label={difficulty.ariaLabel}
              data-testid="anatomy-difficulty-badge"
            >
              {difficulty.fullLabel}
            </span>
            {slotVoiceButton}
          </div>
        </div>
      </header>

      <div className="pf-anatomy-guide__grid">
        {/* 1. 이 동작으로 좋아지는 점 */}
        <article className="pf-anatomy-tile" data-testid="anatomy-tile-benefits">
          <div className="pf-anatomy-tile__head">
            <HeartHandshake size={16} strokeWidth={1.5} aria-hidden="true" />
            <h4>이 동작으로 좋아지는 점</h4>
          </div>
          <ul className="pf-anatomy-benefit-list">
            {insight.benefitsKo.slice(0, 3).map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </article>

        {/* 2. 힘 들어가는 근육 지도 */}
        <article className="pf-anatomy-tile" data-testid="anatomy-tile-muscles">
          <div className="pf-anatomy-tile__head">
            <Activity size={16} strokeWidth={1.5} aria-hidden="true" />
            <h4>힘 들어가는 근육 지도</h4>
          </div>
          <div className="pf-anatomy-muscle-layout">
            <figure className="pf-anatomy-muscle-figure">
              <AnatomyIllustration
                key={insight.anatomyVisualZone}
                zone={insight.anatomyVisualZone}
                webpSrc={insight.visualAsset.webpSrc}
                pngSrc={insight.visualAsset.pngSrc}
                alt={`${insight.visualAsset.labelKo} 근육 지도`}
              />
              <figcaption>{insight.visualAsset.labelKo}</figcaption>
            </figure>
            <div className="pf-anatomy-muscle-groups">
              <div className="pf-anatomy-muscle-group">
                <span className="pf-anatomy-muscle-label is-agonist">움직일 때 힘을 내는 근육</span>
                <div className="pf-anatomy-chip-list">
                  {insight.agonistsKo.map((muscle) => (
                    <span key={muscle} className="pf-anatomy-chip is-agonist">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pf-anatomy-muscle-group">
                <span className="pf-anatomy-muscle-label is-stabilizer">자세를 받쳐 주는 근육</span>
                <div className="pf-anatomy-chip-list">
                  {insight.stabilizersKo.map((muscle) => (
                    <span key={muscle} className="pf-anatomy-chip is-stabilizer">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* 3. 기초 원리 & 스프링 역학 */}
        <article className="pf-anatomy-tile" data-testid="anatomy-tile-mechanics">
          <div className="pf-anatomy-tile__head">
            <Compass size={16} strokeWidth={1.5} aria-hidden="true" />
            <h4>몸을 받쳐 주는 곳</h4>
          </div>
          <div className="pf-anatomy-mechanics-body">
            {exercise.springs && exercise.springs !== 'Bodyweight' && (
              <div className="pf-anatomy-spring-row">
                <SpringVisualPills springs={exercise.springs} />
              </div>
            )}
            <p className="pf-anatomy-mechanics-line">{insight.springMechanicsKo}</p>
            <p className="pf-anatomy-sub-line">
              <Wind size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{insight.breathBasicsKo}</span>
            </p>
            <p className="pf-anatomy-sub-line pf-anatomy-setup-tip">
              <span>시작 자세: {insight.setupBasicsKo}</span>
            </p>
          </div>
        </article>

        {/* 4. 회원님 단골 실수 & 바로 고치는 한 마디 큐 */}
        <article className="pf-anatomy-tile" data-testid="anatomy-tile-faults">
          <div className="pf-anatomy-tile__head">
            <MessageCircleHeart size={16} strokeWidth={1.5} aria-hidden="true" />
            <h4>이럴 땐 이렇게 해 보세요</h4>
          </div>
          <div className="pf-anatomy-fault-list">
            {insight.commonFaultsKo.slice(0, 2).map((item, idx) => (
              <div key={idx} className="pf-anatomy-fault-item">
                <p className="pf-anatomy-fault-text">
                  <span>이럴 때</span> {item.fault}
                </p>
                <p className="pf-anatomy-fix-text">
                  <span>이렇게 해 보세요</span> “{item.fixCue}”
                </p>
                {onInsertCue && (
                  <button
                    type="button"
                    className="pf-anatomy-insert-cue-btn"
                    onClick={() => onInsertCue(item.fixCue)}
                  >
                    <Plus size={14} strokeWidth={1.5} aria-hidden="true" /> 수업 메모에 넣기
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>
      </div>

      {showFundamentalsDrawer && !compact && <PilatesFundamentalsDrawer />}
    </section>
  );
};
