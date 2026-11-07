import React, { useMemo, useState } from 'react';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  SPINAL_PLANE_LABELS,
} from '../data/pilatesCatalog';
import {
  buildMovementVisualAssetForExercise,
  calculatePhaseJointDelta,
  getMovementVisualAsset,
} from '../data/movementVisualRigCatalog';
import type {
  JointAlignmentGuide,
  MovementDirectionVector,
  MuscleActivationRole,
  PhasePoseSpec,
  RigJointMap,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import {
  resolveMotionCoverage,
  resolveVisualAssetForRenderer,
} from '../features/motionCoverage';
import {
  compareCatalogMovements,
  evaluateVisualAssetIntegrity,
  getRecommendedComparisonPeers,
  getVisualSourceComparison,
} from '../data/movementVisualSourceAudit';
import type { VisualProductionMethod } from '../data/movementVisualSourceAudit';
import { PfAiStatusBadge } from '../design-system/PfDomainPrimitives';
import type { PilatesExercise } from '../types/pilates';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from './MovementPhaseDiagramSvg';

export type VisualGuideViewMode =
  | 'three-phase-strip'
  | 'single-phase-focus'
  | 'difference-compare';

export interface MovementVisualGuideCardProps {
  exercise: PilatesExercise;
  comparisonPeerExercise?: PilatesExercise | null;
  availablePeers?: readonly PilatesExercise[];
  initialViewMode?: VisualGuideViewMode;
  initialPhase?: VisualPhaseId;
  overrideAssetSource?: {
    productionMethod: VisualProductionMethod;
    anatomicalAccuracyAssumed?: boolean;
    hasReliableSourceComparison?: boolean;
  };
  className?: string;
}

export interface MovementDifferenceCompareViewProps {
  leftExercise: PilatesExercise;
  rightExercise: PilatesExercise;
  availablePeers?: readonly PilatesExercise[];
  onSelectRightExercise?: (peer: PilatesExercise) => void;
  selectedPhase?: VisualPhaseId;
  onSelectPhase?: (phase: VisualPhaseId) => void;
  activeSide?: 'left' | 'right';
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showMuscles?: boolean;
  showGhostStartPose?: boolean;
  className?: string;
}

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_SHORT_LABELS_KO: Record<VisualPhaseId, string> = {
  start: '시작 자세',
  middle: '중간 자세',
  end: '끝 자세',
};

const JOINT_LABELS_KO: Record<keyof RigJointMap, string> = {
  head: '머리(후두부)',
  neck: '경추(목)',
  shoulder: '어깨(견관절)',
  elbow: '팔꿈치(주관절)',
  wrist: '손목(요골수근)',
  hand: '손끝(핸드)',
  thoracic: '흉추(등 상부)',
  lumbar: '요추(허리)',
  pelvis: '골반(천골)',
  hip: '고관절',
  knee: '무릎(슬관절)',
  ankle: '발목(거퇴관절)',
  heel: '발뒤꿈치(종골)',
  toe: '발끝(족지)',
  farShoulder: '반대측 어깨',
  farElbow: '반대측 팔꿈치',
  farWrist: '반대측 손목',
  farHip: '반대측 고관절',
  farKnee: '반대측 무릎',
  farAnkle: '반대측 발목',
  farToe: '반대측 발끝',
};

const ALIGNMENT_KIND_LABELS_KO: Record<JointAlignmentGuide['kind'], string> = {
  'plumb-line': '수직 기준선',
  'axis-line': '관절 정렬축',
  'angle-arc': '목표 각도 호',
  'anchor-lock': '고정 지지점',
  'neutral-zone': '중립 유지 구간',
};

const DIRECTION_KIND_LABELS_KO: Record<MovementDirectionVector['kind'], string> = {
  'limb-excursion': '사지 가동 궤적',
  'spine-articulation': '척추 분절 방향',
  'carriage-travel': '캐리지·기구 이동',
  'spring-resistance': '스프링 저항 벡터',
  'axial-lengthening': '축성 신장(엘롱게이션)',
  'return-control': '원심성 복귀 제어',
};

const PHASE_SCOPE_LABELS_KO: Record<MovementDirectionVector['phaseScope'], string> = {
  start: '시작 준비 구간',
  middle: '중간 정점 구간',
  end: '끝 복귀 구간',
  'start-to-middle': '시작 → 중간 가동',
  'middle-to-end': '중간 → 끝 복귀',
};

const SPRING_TENSION_LABELS_KO: Record<
  PhasePoseSpec['apparatusState']['springTensionLevel'],
  string
> = {
  none: '스프링 저항 없음 (체중·소도구 제어)',
  low: '낮음 (가벼운 코어·정밀 제어)',
  medium: '중간 (표준 지지·저항 균형)',
  high: '높음 (고중량 지지·하체/견갑 강화)',
};

const MUSCLE_ROLE_STYLES: Record<
  MuscleActivationRole,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
  }
> = {
  primary: {
    bg: '#FDF4F0',
    border: '#DFB19E',
    text: '#7C2D12',
    badgeBg: '#F9E2D8',
  },
  stabilizer: {
    bg: '#EFF6F2',
    border: '#A9C8B6',
    text: '#173D34',
    badgeBg: '#DCECE2',
  },
  lengthening: {
    bg: '#F3F4F9',
    border: '#B8C2DC',
    text: '#28385E',
    badgeBg: '#E2E7F4',
  },
};

const TOUCH_BUTTON_BASE_STYLE: React.CSSProperties = {
  minHeight: '44px',
  padding: '8px 12px',
  borderRadius: 'var(--pf-radius-sm, 8px)',
  fontSize: 'var(--pf-text-xs, 0.75rem)',
  fontWeight: 600,
  lineHeight: 1.35,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  textAlign: 'left',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
};

const PANEL_CARD_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
  border: '1px solid var(--pf-color-border-default, #D5DDD0)',
  borderRadius: 'var(--pf-radius-md, 12px)',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

export function MovementDifferenceCompareView({
  leftExercise,
  rightExercise,
  availablePeers,
  onSelectRightExercise,
  selectedPhase,
  onSelectPhase,
  activeSide = 'left',
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showMuscles = true,
  showGhostStartPose = true,
  className = '',
}: MovementDifferenceCompareViewProps): React.JSX.Element {
  const [internalPhase, setInternalPhase] = useState<VisualPhaseId>(
    selectedPhase ?? 'middle',
  );
  const [selectedPeerOverride, setSelectedPeerOverride] = useState<{
    baseRightId: string;
    peer: PilatesExercise;
  } | null>(null);

  const currentPhase: VisualPhaseId = selectedPhase ?? internalPhase;

  const handleSelectPhase = (phase: VisualPhaseId) => {
    setInternalPhase(phase);
    onSelectPhase?.(phase);
  };

  const peerOptions = useMemo(() => {
    const base =
      availablePeers && availablePeers.length > 0
        ? [...availablePeers]
        : [...getRecommendedComparisonPeers(leftExercise.id)];
    if (
      rightExercise.id !== leftExercise.id &&
      !base.some((peer) => peer.id === rightExercise.id)
    ) {
      base.unshift(rightExercise);
    }
    return base;
  }, [availablePeers, leftExercise.id, rightExercise]);

  const effectiveRightExercise =
    selectedPeerOverride && selectedPeerOverride.baseRightId === rightExercise.id
      ? selectedPeerOverride.peer
      : rightExercise;

  const handlePeerChange = (peer: PilatesExercise) => {
    setSelectedPeerOverride({
      baseRightId: rightExercise.id,
      peer,
    });
    onSelectRightExercise?.(peer);
  };

  const leftAsset = useMemo(
    () =>
      getMovementVisualAsset(leftExercise) ??
      buildMovementVisualAssetForExercise(leftExercise),
    [leftExercise],
  );

  const rightAsset = useMemo(
    () =>
      getMovementVisualAsset(effectiveRightExercise) ??
      buildMovementVisualAssetForExercise(effectiveRightExercise),
    [effectiveRightExercise],
  );

  const comparison = useMemo(
    () => compareCatalogMovements(leftExercise, effectiveRightExercise),
    [leftExercise, effectiveRightExercise],
  );

  const leftApparatusLabel =
    APPARATUS_LABELS[leftExercise.apparatus]?.ko ?? leftExercise.apparatus;
  const rightApparatusLabel =
    APPARATUS_LABELS[effectiveRightExercise.apparatus]?.ko ??
    effectiveRightExercise.apparatus;

  return (
    <div
      className={['pf-movement-difference-compare-view', className]
        .filter(Boolean)
        .join(' ')}
      data-testid="movement-difference-compare-view"
      data-pair-id={comparison.pairId}
      data-left-exercise-id={leftExercise.id}
      data-right-exercise-id={effectiveRightExercise.id}
      data-selected-phase={currentPhase}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
        border: '1px solid var(--pf-color-border-default, #D5DDD0)',
        borderRadius: 'var(--pf-radius-md, 12px)',
        padding: '14px',
      }}
    >
      {/* Header & Comparison Rationale */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              fontWeight: 700,
              color: 'var(--pf-color-action-primary, #173D34)',
              backgroundColor: 'var(--pf-color-bg-surface-muted, #E4EADF)',
              padding: '4px 8px',
              borderRadius: 'var(--pf-radius-xs, 6px)',
            }}
          >
            동작 간 핵심 차이 비교 (7대 역학·기구 기준)
          </span>
          <span
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              color: 'var(--pf-color-text-muted, #526358)',
            }}
          >
            기준 동작: {leftExercise.nameKo} vs 비교 동작: {effectiveRightExercise.nameKo}
          </span>
        </div>

        <h4
          style={{
            margin: 0,
            fontSize: 'var(--pf-text-base, 1rem)',
            fontWeight: 700,
            color: 'var(--pf-color-text-primary, #1E3129)',
          }}
        >
          {comparison.titleKo}
        </h4>

        <p
          style={{
            margin: 0,
            fontSize: 'var(--pf-text-sm, 0.8125rem)',
            color: 'var(--pf-color-text-secondary, #3D4F45)',
            lineHeight: 1.55,
          }}
        >
          {comparison.reasonForComparisonKo}
        </p>
      </div>

      {/* Peer Switcher Controls (>= 44px touch targets) */}
      {peerOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 'var(--pf-radius-sm, 8px)',
            padding: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <label
              htmlFor={`compare-peer-select-${leftExercise.id}`}
              style={{
                fontSize: 'var(--pf-text-xs, 0.75rem)',
                fontWeight: 700,
                color: 'var(--pf-color-text-primary, #1E3129)',
              }}
            >
              비교할 유사·대조 동작 선택 ({peerOptions.length}종 추천)
            </label>
            <select
              id={`compare-peer-select-${leftExercise.id}`}
              aria-label="비교 대상 동작 선택"
              data-testid="difference-peer-select"
              value={effectiveRightExercise.id}
              onChange={(e) => {
                const found = peerOptions.find((item) => item.id === e.target.value);
                if (found) {
                  handlePeerChange(found);
                }
              }}
              style={{
                minHeight: '44px',
                padding: '6px 10px',
                borderRadius: 'var(--pf-radius-sm, 8px)',
                border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                color: 'var(--pf-color-text-primary, #1E3129)',
                fontSize: 'var(--pf-text-sm, 0.8125rem)',
                fontWeight: 600,
              }}
            >
              {peerOptions.map((peer) => (
                <option key={peer.id} value={peer.id}>
                  {peer.nameKo} ({APPARATUS_LABELS[peer.apparatus]?.short ?? peer.apparatus} ·{' '}
                  {POSITION_LABELS[peer.bodyPosition]?.ko ?? peer.bodyPosition})
                </option>
              ))}
            </select>
          </div>

          <div
            role="group"
            aria-label="추천 비교 동작 빠른 전환"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            {peerOptions.map((peer) => {
              const isSelected = peer.id === effectiveRightExercise.id;
              return (
                <button
                  key={peer.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`difference-peer-btn-${peer.id}`}
                  onClick={() => handlePeerChange(peer)}
                  style={{
                    ...TOUCH_BUTTON_BASE_STYLE,
                    backgroundColor: isSelected
                      ? 'var(--pf-color-action-primary, #173D34)'
                      : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                    color: isSelected
                      ? '#FFFEF9'
                      : 'var(--pf-color-text-primary, #1E3129)',
                    border: isSelected
                      ? '1px solid var(--pf-color-action-primary, #173D34)'
                      : '1px solid var(--pf-color-border-default, #D5DDD0)',
                  }}
                >
                  <span>{peer.nameKo}</span>
                  <span
                    style={{
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      opacity: isSelected ? 0.9 : 0.75,
                    }}
                  >
                    ({APPARATUS_LABELS[peer.apparatus]?.short ?? peer.apparatus})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase Synchronized Selector for Side-by-Side Comparison */}
      <div
        role="group"
        aria-label="동작 비교 단계 선택"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 'var(--pf-text-xs, 0.75rem)',
            fontWeight: 700,
            color: 'var(--pf-color-text-secondary, #3D4F45)',
          }}
        >
          동시 비교 단계:
        </span>
        {PHASE_ORDER.map((phaseId) => {
          const isCurrent = currentPhase === phaseId;
          return (
            <button
              key={phaseId}
              type="button"
              aria-pressed={isCurrent}
              data-testid={`compare-phase-btn-${phaseId}`}
              onClick={() => handleSelectPhase(phaseId)}
              style={{
                ...TOUCH_BUTTON_BASE_STYLE,
                backgroundColor: isCurrent
                  ? 'var(--pf-color-action-primary, #173D34)'
                  : 'var(--pf-color-bg-surface, #FFFEF9)',
                color: isCurrent
                  ? '#FFFEF9'
                  : 'var(--pf-color-text-primary, #1E3129)',
                border: isCurrent
                  ? '1px solid var(--pf-color-action-primary, #173D34)'
                  : '1px solid var(--pf-color-border-default, #D5DDD0)',
              }}
            >
              {PHASE_SHORT_LABELS_KO[phaseId]} ({leftAsset.phases[phaseId].badgeKo.split(' ')[0]})
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Phase Diagrams */}
      <div
        data-testid="difference-compare-diagrams-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          data-testid="difference-left-diagram-card"
          style={{
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 'var(--pf-radius-sm, 8px)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <strong
              style={{
                fontSize: 'var(--pf-text-sm, 0.8125rem)',
                color: 'var(--pf-color-text-primary, #1E3129)',
              }}
            >
              [기준] {leftExercise.nameKo}
            </strong>
            <span
              style={{
                fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                color: 'var(--pf-color-text-muted, #526358)',
              }}
            >
              {leftApparatusLabel} · {leftAsset.phases[currentPhase].shortTitleKo}
            </span>
          </div>
          <MovementPhaseDiagramSvg
            asset={leftAsset}
            phase={currentPhase}
            activeSide={activeSide}
            mirrored={mirrored}
            showAlignment={showAlignment}
            showDirection={showDirection}
            showMuscles={showMuscles}
            showGhostStartPose={showGhostStartPose}
            compact={false}
            label={`${leftExercise.nameKo} ${leftAsset.phases[currentPhase].badgeKo}`}
          />
          <p
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              lineHeight: 1.5,
            }}
          >
            {leftAsset.phases[currentPhase].summaryKo}
          </p>
        </div>

        <div
          data-testid="difference-right-diagram-card"
          style={{
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 'var(--pf-radius-sm, 8px)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <strong
              style={{
                fontSize: 'var(--pf-text-sm, 0.8125rem)',
                color: 'var(--pf-color-text-primary, #1E3129)',
              }}
            >
              [비교] {effectiveRightExercise.nameKo}
            </strong>
            <span
              style={{
                fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                color: 'var(--pf-color-text-muted, #526358)',
              }}
            >
              {rightApparatusLabel} · {rightAsset.phases[currentPhase].shortTitleKo}
            </span>
          </div>
          <MovementPhaseDiagramSvg
            asset={rightAsset}
            phase={currentPhase}
            activeSide={activeSide}
            mirrored={mirrored}
            showAlignment={showAlignment}
            showDirection={showDirection}
            showMuscles={showMuscles}
            showGhostStartPose={showGhostStartPose}
            compact={false}
            label={`${effectiveRightExercise.nameKo} ${rightAsset.phases[currentPhase].badgeKo}`}
          />
          <p
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              lineHeight: 1.5,
            }}
          >
            {rightAsset.phases[currentPhase].summaryKo}
          </p>
        </div>
      </div>

      {/* Teaching Distinction Tip */}
      <div
        data-testid="teaching-distinction-tip"
        style={{
          backgroundColor: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
          border: '1px solid #DFD6B8',
          borderRadius: 'var(--pf-radius-sm, 8px)',
          padding: '10px 12px',
          fontSize: 'var(--pf-text-xs, 0.75rem)',
          color: 'var(--pf-color-text-primary, #1E3129)',
          lineHeight: 1.55,
        }}
      >
        <strong>강사 큐잉·지도 구분 팁: </strong>
        <span>{comparison.teachingDistinctionTipKo}</span>
      </div>

      {/* 7 Comparison Dimensions */}
      <div
        data-testid="comparison-dimensions-list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '10px',
        }}
      >
        {comparison.dimensions.map((dim) => (
          <article
            key={dim.dimensionKey}
            data-testid={`comparison-dimension-${dim.dimensionKey}`}
            data-dimension-key={dim.dimensionKey}
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <strong
              style={{
                fontSize: 'var(--pf-text-xs, 0.75rem)',
                color: 'var(--pf-color-action-primary, #173D34)',
              }}
            >
              {dim.labelKo}
            </strong>
            <div
              style={{
                fontSize: 'var(--pf-text-xs, 0.75rem)',
                color: 'var(--pf-color-text-secondary, #3D4F45)',
                lineHeight: 1.45,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>
                <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                  • {leftExercise.nameKo}:{' '}
                </strong>
                <span>{dim.leftSummaryKo}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                  • {effectiveRightExercise.nameKo}:{' '}
                </strong>
                <span>{dim.rightSummaryKo}</span>
              </div>
            </div>
            <div
              style={{
                marginTop: '2px',
                paddingTop: '6px',
                borderTop: '1px dashed var(--pf-color-border-default, #D5DDD0)',
                fontSize: 'var(--pf-text-xs, 0.75rem)',
                color: 'var(--pf-color-text-primary, #1E3129)',
                lineHeight: 1.5,
              }}
            >
              <strong>핵심 차이: </strong>
              <span>{dim.keyDifferenceKo}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function MovementVisualGuideCard({
  exercise,
  comparisonPeerExercise,
  availablePeers,
  initialViewMode = 'three-phase-strip',
  initialPhase = 'middle',
  overrideAssetSource,
  className = '',
}: MovementVisualGuideCardProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<VisualGuideViewMode>(initialViewMode);
  const [selectedPhase, setSelectedPhase] = useState<VisualPhaseId>(initialPhase);
  const [showAlignment, setShowAlignment] = useState<boolean>(true);
  const [showDirection, setShowDirection] = useState<boolean>(true);
  const [showMuscles, setShowMuscles] = useState<boolean>(true);
  const [showGhostStartPose, setShowGhostStartPose] = useState<boolean>(true);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [peerOverrideByExercise, setPeerOverrideByExercise] = useState<{
    exerciseId: string;
    peer: PilatesExercise;
  } | null>(null);

  const motionCoverage = useMemo(
    () => resolveMotionCoverage(exercise),
    [exercise],
  );

  const asset = useMemo(
    () =>
      resolveVisualAssetForRenderer(exercise) ??
      getMovementVisualAsset(exercise) ??
      buildMovementVisualAssetForExercise(exercise),
    [exercise],
  );

  const sourceAudit = useMemo(
    () => getVisualSourceComparison(exercise),
    [exercise],
  );

  const integrity = useMemo(
    () =>
      evaluateVisualAssetIntegrity(
        overrideAssetSource
          ? {
              ...overrideAssetSource,
              hasReliableSourceComparison:
                overrideAssetSource.hasReliableSourceComparison ?? true,
              exercise,
            }
          : {
              productionMethod: asset.productionMethod,
              anatomicalAccuracyAssumed: asset.anatomicalAccuracyAssumed,
              hasReliableSourceComparison:
                sourceAudit.matchedReliableSources.length > 0,
              exercise,
            },
      ),
    [asset, exercise, overrideAssetSource, sourceAudit],
  );

  const jointDelta = useMemo(() => calculatePhaseJointDelta(asset), [asset]);

  const peerOptions = useMemo(() => {
    const base =
      availablePeers && availablePeers.length > 0
        ? [...availablePeers]
        : [...getRecommendedComparisonPeers(exercise.id)];
    if (
      comparisonPeerExercise &&
      comparisonPeerExercise.id !== exercise.id &&
      !base.some((peer) => peer.id === comparisonPeerExercise.id)
    ) {
      base.unshift(comparisonPeerExercise);
    }
    return base;
  }, [availablePeers, comparisonPeerExercise, exercise.id]);

  const effectivePeerExercise = useMemo(() => {
    if (
      peerOverrideByExercise &&
      peerOverrideByExercise.exerciseId === exercise.id
    ) {
      return peerOverrideByExercise.peer;
    }
    if (comparisonPeerExercise && comparisonPeerExercise.id !== exercise.id) {
      return comparisonPeerExercise;
    }
    return peerOptions[0] ?? exercise;
  }, [comparisonPeerExercise, exercise, peerOptions, peerOverrideByExercise]);

  const activePhaseSpec = asset.phases[selectedPhase];
  const apparatusLabelKo =
    APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const positionLabelKo =
    POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const blockMeta = CANONICAL_BLOCKS.find(
    (item) => item.category === exercise.blockCategory,
  );
  const planesLabelKo = exercise.spinalPlanes
    .map((plane) => SPINAL_PLANE_LABELS[plane]?.ko ?? plane)
    .join(' · ');

  const allAlignmentsWithPhase = useMemo(
    () =>
      PHASE_ORDER.flatMap((phaseId) =>
        asset.phases[phaseId].alignments.map((guide) => ({
          phaseId,
          phaseBadgeKo: asset.phases[phaseId].badgeKo,
          guide,
        })),
      ),
    [asset],
  );

  const allVectorsWithPhase = useMemo(
    () =>
      PHASE_ORDER.flatMap((phaseId) =>
        asset.phases[phaseId].directionVectors.map((vector) => ({
          phaseId,
          phaseBadgeKo: asset.phases[phaseId].badgeKo,
          vector,
        })),
      ),
    [asset],
  );

  return (
    <section
      className={['pf-movement-visual-guide-card', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${exercise.nameKo} 동작 시각 가이드`}
      data-testid="movement-visual-guide-card"
      data-exercise-id={exercise.id}
      data-review-stage={sourceAudit.reviewStage}
      data-is-post-review={String(sourceAudit.isPostReview)}
      data-integrity-passed={String(integrity.integrityPassed)}
      data-anatomical-accuracy-assumed="false"
      style={{
        backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
        border: '1px solid var(--pf-color-border-default, #D5DDD0)',
        borderRadius: 'var(--pf-radius-lg, 16px)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--pf-color-text-primary, #1E3129)',
        boxShadow: 'var(--pf-shadow-sm, 0 3px 12px rgba(23, 61, 52, 0.06))',
      }}
    >
      {/* 1. Integrity & Pre/Post Review Header */}
      <header
        data-testid="visual-guide-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderBottom: '1px solid var(--pf-color-border-default, #D5DDD0)',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Pre-Review vs Post-Review Badge */}
          <PfAiStatusBadge
            kind={
              sourceAudit.isPostReview ? 'instructor-reviewed' : 'review-pending'
            }
            data-testid="visual-review-stage-badge"
            data-review-stage={sourceAudit.reviewStage}
            data-is-post-review={String(sourceAudit.isPostReview)}
            style={{
              fontWeight: 700,
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              padding: '4px 10px',
              borderRadius: 'var(--pf-radius-pill, 9999px)',
              backgroundColor: sourceAudit.isPostReview
                ? '#E4EADF'
                : 'var(--pf-color-ai-memo-bg, #F4F1E3)',
              color: sourceAudit.isPostReview
                ? 'var(--pf-color-status-success-text, #254B29)'
                : 'var(--pf-color-status-warning-text, #6B4010)',
              border: sourceAudit.isPostReview
                ? '1px solid #B7C9B9'
                : '1px solid #DFC59A',
            }}
          >
            {sourceAudit.isPostReview ? '[검토 후]' : '[검토 전]'}{' '}
            {sourceAudit.reviewBadgeKo}
          </PfAiStatusBadge>

          {/* Rights & Free Production Method Badge */}
          <span
            data-testid="visual-license-badge"
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--pf-radius-pill, 9999px)',
              backgroundColor: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            {asset.licenseLabelKo}
          </span>

          {/* Anatomical Non-Assumption Notice */}
          <span
            data-testid="anatomical-non-assumption-badge"
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 'var(--pf-radius-pill, 9999px)',
              backgroundColor: '#FDF4F0',
              color: 'var(--pf-color-status-danger-text, #8A341E)',
              border: '1px solid #E5BBAE',
            }}
          >
            해부학적 정확성 자동 추정 안 함 · 신뢰 출처 대조 기반
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '8px',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 'var(--pf-text-lg, 1.1875rem)',
                fontWeight: 700,
                color: 'var(--pf-color-text-primary, #1E3129)',
              }}
            >
              {exercise.nameKo}{' '}
              <span
                style={{
                  fontSize: 'var(--pf-text-sm, 0.8125rem)',
                  fontWeight: 500,
                  color: 'var(--pf-color-text-secondary, #3D4F45)',
                }}
              >
                ({exercise.nameEn})
              </span>
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 'var(--pf-text-xs, 0.75rem)',
                color: 'var(--pf-color-text-secondary, #3D4F45)',
              }}
            >
              아키타입: <strong>{asset.archetypeTitleKo}</strong> · {apparatusLabelKo} ·{' '}
              {positionLabelKo} · {blockMeta?.nameKo ?? exercise.blockCategory} ·{' '}
              {planesLabelKo} · {exercise.isUnilateral ? '편측(Unilateral)' : '양측(Bilateral)'}
            </p>
          </div>
          <span
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              color: 'var(--pf-color-text-muted, #526358)',
            }}
          >
            신뢰 출처 대조 {sourceAudit.matchedReliableSources.length}건 · 전문가 모션 검수{' '}
            {sourceAudit.professionalMotionReviewCount}건
          </span>
        </div>
      </header>

      {/* Quarantine Alert Banner when integrity fails */}
      {!integrity.integrityPassed && (
        <div
          role="alert"
          data-testid="visual-integrity-quarantine-banner"
          data-production-method={integrity.productionMethod}
          style={{
            backgroundColor: '#FDF2EF',
            border: '2px solid var(--pf-color-status-danger-text, #8A341E)',
            borderRadius: 'var(--pf-radius-md, 12px)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: 'var(--pf-color-status-danger-text, #8A341E)',
          }}
        >
          <strong style={{ fontSize: 'var(--pf-text-sm, 0.8125rem)' }}>
            시각 자산 무결성 격리 경고 · 동작 도해 표시 차단됨
          </strong>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              lineHeight: 1.55,
              fontWeight: 600,
            }}
          >
            {integrity.quarantineReasonKo}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              lineHeight: 1.5,
            }}
          >
            {integrity.anatomicalDisclaimerKo}
          </p>
        </div>
      )}

      {/* 2. Mobile-First View Mode & Layer Controls (>= 44px touch targets) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
          borderRadius: 'var(--pf-radius-md, 12px)',
          padding: '12px',
        }}
      >
        {/* View mode tabs */}
        <div
          role="tablist"
          aria-label="동작 시각 자료 보기 방식"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '8px',
          }}
        >
          {(
            [
              {
                id: 'three-phase-strip',
                label: '3단계 연속 비교 (시작·중간·끝)',
              },
              {
                id: 'single-phase-focus',
                label: '단계별 확대 보기',
              },
              {
                id: 'difference-compare',
                label: '유사 동작과 차이 비교',
              },
            ] as const
          ).map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`view-mode-tab-${tab.id}`}
                onClick={() => setViewMode(tab.id)}
                style={{
                  ...TOUCH_BUTTON_BASE_STYLE,
                  justifyContent: 'center',
                  textAlign: 'center',
                  backgroundColor: isActive
                    ? 'var(--pf-color-action-primary, #173D34)'
                    : 'var(--pf-color-bg-surface, #FFFEF9)',
                  color: isActive
                    ? '#FFFEF9'
                    : 'var(--pf-color-text-primary, #1E3129)',
                  border: isActive
                    ? '1px solid var(--pf-color-action-primary, #173D34)'
                    : '1px solid var(--pf-color-border-default, #D5DDD0)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Layer toggles */}
        <div
          role="group"
          aria-label="시각 도해 표시 레이어"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <button
            type="button"
            aria-pressed={showAlignment}
            data-testid="layer-toggle-alignment"
            onClick={() => setShowAlignment((prev) => !prev)}
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor: showAlignment
                ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border: showAlignment
                ? '1px solid var(--pf-color-action-primary, #173D34)'
                : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            관절 정렬선 {showAlignment ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            aria-pressed={showDirection}
            data-testid="layer-toggle-direction"
            onClick={() => setShowDirection((prev) => !prev)}
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor: showDirection
                ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border: showDirection
                ? '1px solid var(--pf-color-action-primary, #173D34)'
                : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            움직임 방향 {showDirection ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            aria-pressed={showMuscles}
            data-testid="layer-toggle-muscles"
            onClick={() => setShowMuscles((prev) => !prev)}
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor: showMuscles
                ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border: showMuscles
                ? '1px solid var(--pf-color-action-primary, #173D34)'
                : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            주요 근육 {showMuscles ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            aria-pressed={showGhostStartPose}
            data-testid="layer-toggle-ghost"
            onClick={() => setShowGhostStartPose((prev) => !prev)}
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor: showGhostStartPose
                ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border: showGhostStartPose
                ? '1px solid var(--pf-color-action-primary, #173D34)'
                : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            시작↔중간 자세 변화 겹쳐 보기 {showGhostStartPose ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            aria-pressed={activeSide === 'right'}
            data-testid="layer-toggle-side"
            onClick={() =>
              setActiveSide((prev) => (prev === 'left' ? 'right' : 'left'))
            }
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor:
                activeSide === 'right'
                  ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                  : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border:
                activeSide === 'right'
                  ? '1px solid var(--pf-color-action-primary, #173D34)'
                  : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            좌/우 전환 ({activeSide === 'left' ? '좌측 기준' : '우측 기준'})
          </button>

          <button
            type="button"
            aria-pressed={mirrored}
            data-testid="layer-toggle-mirror"
            onClick={() => setMirrored((prev) => !prev)}
            style={{
              ...TOUCH_BUTTON_BASE_STYLE,
              backgroundColor: mirrored
                ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                : 'var(--pf-color-bg-surface, #FFFEF9)',
              color: 'var(--pf-color-text-primary, #1E3129)',
              border: mirrored
                ? '1px solid var(--pf-color-action-primary, #173D34)'
                : '1px solid var(--pf-color-border-default, #D5DDD0)',
            }}
          >
            화면 반전 {mirrored ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 3. Mobile Quick-Read Summary Bar */}
      <div
        data-testid="mobile-quick-read-summary-bar"
        style={{
          backgroundColor: 'var(--pf-color-block-surface, #F6F7F2)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
          borderRadius: 'var(--pf-radius-md, 12px)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <strong
            style={{
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              color: 'var(--pf-color-action-primary, #173D34)',
            }}
          >
            모바일 3초 핵심 요약 (시작·중간·끝 자세 & 관절 변위)
          </strong>
          <span
            data-testid="max-joint-delta-badge"
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              fontWeight: 700,
              backgroundColor: 'var(--pf-color-bg-surface-muted, #E4EADF)',
              color: 'var(--pf-color-action-primary, #173D34)',
              padding: '3px 8px',
              borderRadius: 'var(--pf-radius-pill, 9999px)',
            }}
          >
            최대 관절 변위 Δ{jointDelta.maxDeltaPx}px · 가동 관절{' '}
            {jointDelta.movedJoints.length}개 / 고정 관절{' '}
            {jointDelta.anchoredJoints.length}개
          </span>
        </div>

        {/* 3 Mobile Summary Bullets */}
        <ul
          data-testid="mobile-summary-bullets"
          style={{
            margin: 0,
            paddingLeft: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: 'var(--pf-text-xs, 0.75rem)',
            color: 'var(--pf-color-text-primary, #1E3129)',
            lineHeight: 1.5,
          }}
        >
          {asset.mobileSummaryBulletsKo.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </ul>

        {/* Pose Delta Summary Grid */}
        <div
          data-testid="pose-delta-summary-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '8px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '8px 10px',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: 'var(--pf-color-action-primary, #173D34)' }}>
              시작→중간 변화:{' '}
            </strong>
            <span>{asset.poseDeltaSummary.startToMiddleKo}</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '8px 10px',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: 'var(--pf-color-action-primary, #173D34)' }}>
              중간→끝 제어:{' '}
            </strong>
            <span>{asset.poseDeltaSummary.middleToEndKo}</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '8px 10px',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: 'var(--pf-color-action-primary, #173D34)' }}>
              고정 지지점:{' '}
            </strong>
            <span>{asset.poseDeltaSummary.invariantAnchorsKo}</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '8px 10px',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: 'var(--pf-color-action-primary, #173D34)' }}>
              핵심 관절 변화:{' '}
            </strong>
            <span>{asset.poseDeltaSummary.keyJointChangeKo}</span>
          </div>
        </div>

        {/* Quantitative Moved-Joint Displacement Badges */}
        <div
          data-testid="moved-joint-displacement-badges"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              fontWeight: 700,
              color: 'var(--pf-color-text-secondary, #3D4F45)',
            }}
          >
            시작→중간 실측 변위 상위 관절:
          </span>
          {jointDelta.movedJoints.slice(0, 6).map((item) => (
            <span
              key={item.joint}
              data-testid={`joint-delta-badge-${item.joint}`}
              style={{
                fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                padding: '3px 8px',
                borderRadius: 'var(--pf-radius-xs, 6px)',
                backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                color: 'var(--pf-color-text-primary, #1E3129)',
              }}
            >
              {JOINT_LABELS_KO[item.joint]} ({item.joint}) Δ{item.deltaPx}px
            </span>
          ))}
        </div>
      </div>

      {/* Primary Visual Diagram Viewport (Only rendered when integrity passes) */}
      {integrity.integrityPassed && (
        <div
          data-testid="visual-diagram-viewport"
          data-view-mode={viewMode}
          data-motion-primary-mode={motionCoverage.primaryMode}
          data-readiness-state={motionCoverage.readinessState}
          data-canonical-motion-ready={String(motionCoverage.canonicalMotionReady)}
          data-true-3d={String(motionCoverage.safetyFlags.true3dSupported)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {viewMode === 'three-phase-strip' && (
            <MovementTriptychDiagramSvg
              asset={asset}
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
              activeSide={activeSide}
              mirrored={mirrored}
              showAlignment={showAlignment}
              showDirection={showDirection}
              showMuscles={showMuscles}
              showGhostStartPose={showGhostStartPose}
            />
          )}

          {viewMode === 'single-phase-focus' && (
            <div
              data-testid="single-phase-focus-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                role="group"
                aria-label="단일 확대 단계 선택"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px',
                }}
              >
                {PHASE_ORDER.map((phaseId) => {
                  const isSelected = selectedPhase === phaseId;
                  return (
                    <button
                      key={phaseId}
                      type="button"
                      aria-pressed={isSelected}
                      data-testid={`single-focus-phase-btn-${phaseId}`}
                      onClick={() => setSelectedPhase(phaseId)}
                      style={{
                        ...TOUCH_BUTTON_BASE_STYLE,
                        justifyContent: 'center',
                        textAlign: 'center',
                        backgroundColor: isSelected
                          ? 'var(--pf-color-action-primary, #173D34)'
                          : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                        color: isSelected
                          ? '#FFFEF9'
                          : 'var(--pf-color-text-primary, #1E3129)',
                        border: isSelected
                          ? '1px solid var(--pf-color-action-primary, #173D34)'
                          : '1px solid var(--pf-color-border-default, #D5DDD0)',
                      }}
                    >
                      {asset.phases[phaseId].badgeKo}
                    </button>
                  );
                })}
              </div>

              <MovementPhaseDiagramSvg
                asset={asset}
                phase={selectedPhase}
                activeSide={activeSide}
                mirrored={mirrored}
                showAlignment={showAlignment}
                showDirection={showDirection}
                showMuscles={showMuscles}
                showGhostStartPose={showGhostStartPose}
                compact={false}
                label={`${exercise.nameKo} ${activePhaseSpec.badgeKo}`}
              />
            </div>
          )}

          {viewMode === 'difference-compare' && (
            <MovementDifferenceCompareView
              leftExercise={exercise}
              rightExercise={effectivePeerExercise}
              availablePeers={peerOptions}
              onSelectRightExercise={(peer) =>
                setPeerOverrideByExercise({
                  exerciseId: exercise.id,
                  peer,
                })
              }
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
              activeSide={activeSide}
              mirrored={mirrored}
              showAlignment={showAlignment}
              showDirection={showDirection}
              showMuscles={showMuscles}
              showGhostStartPose={showGhostStartPose}
            />
          )}
        </div>
      )}

      {/* 4. Four Core Visual Detail Panels (Readable on 320px/390px Mobile & Desktop) */}
      <div
        data-testid="visual-detail-panels-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 패널 A — 시작·중간·끝 자세 단계별 핵심 */}
        <section
          aria-label="패널 A — 시작·중간·끝 자세 단계별 핵심"
          data-testid="visual-panel-phases"
          style={PANEL_CARD_STYLE}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              fontWeight: 700,
              color: 'var(--pf-color-action-primary, #173D34)',
            }}
          >
            패널 A · 시작·중간·끝 자세 단계별 핵심
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {PHASE_ORDER.map((phaseId) => {
              const phaseSpec = asset.phases[phaseId];
              const isFocused = selectedPhase === phaseId;
              return (
                <button
                  key={phaseId}
                  type="button"
                  aria-pressed={isFocused}
                  data-testid={`phase-focus-btn-${phaseId}`}
                  onClick={() => setSelectedPhase(phaseId)}
                  style={{
                    minHeight: '44px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 'var(--pf-radius-sm, 8px)',
                    backgroundColor: isFocused
                      ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                      : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                    border: isFocused
                      ? '2px solid var(--pf-color-action-primary, #173D34)'
                      : '1px solid var(--pf-color-border-default, #D5DDD0)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: 'var(--pf-color-text-primary, #1E3129)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        fontWeight: 700,
                        color: 'var(--pf-color-action-primary, #173D34)',
                      }}
                    >
                      {phaseSpec.badgeKo}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        color: 'var(--pf-color-text-muted, #526358)',
                      }}
                    >
                      {isFocused ? '현재 선택됨' : '탭하여 이 단계 초점'}
                    </span>
                  </div>
                  <strong
                    style={{
                      fontSize: 'var(--pf-text-xs, 0.75rem)',
                      color: 'var(--pf-color-text-primary, #1E3129)',
                    }}
                  >
                    {phaseSpec.shortTitleKo}
                  </strong>
                  <span
                    style={{
                      fontSize: 'var(--pf-text-xs, 0.75rem)',
                      color: 'var(--pf-color-text-secondary, #3D4F45)',
                      lineHeight: 1.45,
                    }}
                  >
                    {phaseSpec.summaryKo}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      color: 'var(--pf-color-text-primary, #1E3129)',
                      fontWeight: 600,
                    }}
                  >
                    호흡 큐: {phaseSpec.breathCueKo}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      color: 'var(--pf-color-text-muted, #526358)',
                    }}
                  >
                    지지 환경: {phaseSpec.apparatusState.supportSurfaceKo}
                    {phaseSpec.apparatusState.propPositionKo
                      ? ` · ${phaseSpec.apparatusState.propPositionKo}`
                      : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 패널 B — 관절 정렬 & 고정 접점 */}
        <section
          aria-label="패널 B — 관절 정렬 & 고정 접점"
          data-testid="visual-panel-alignments"
          style={PANEL_CARD_STYLE}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              fontWeight: 700,
              color: 'var(--pf-color-action-primary, #173D34)',
            }}
          >
            패널 B · 관절 정렬 & 고정 접점 (Anchors vs Moving)
          </h4>

          {/* Joint Alignment Guides */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {allAlignmentsWithPhase.map(({ phaseId, guide }) => {
              const isCurrentPhase = phaseId === selectedPhase;
              return (
                <div
                  key={`${phaseId}-${guide.id}`}
                  data-testid={`alignment-guide-item-${guide.id}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--pf-radius-sm, 8px)',
                    backgroundColor: isCurrentPhase
                      ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                      : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                    border: isCurrentPhase
                      ? '1px solid var(--pf-color-action-primary, #173D34)'
                      : '1px solid var(--pf-color-border-default, #D5DDD0)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: 'var(--pf-text-xs, 0.75rem)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: '4px',
                    }}
                  >
                    <strong>
                      [{PHASE_SHORT_LABELS_KO[phaseId]}] {guide.labelKo}
                    </strong>
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        color: 'var(--pf-color-text-muted, #526358)',
                      }}
                    >
                      {ALIGNMENT_KIND_LABELS_KO[guide.kind]}
                      {guide.targetAngleDeg !== undefined
                        ? ` · 목표 각도 ${guide.targetAngleDeg}°`
                        : ''}
                    </span>
                  </div>
                  <span
                    style={{
                      color: 'var(--pf-color-text-secondary, #3D4F45)',
                      lineHeight: 1.45,
                    }}
                  >
                    정렬 큐: {guide.cueKo}
                  </span>
                  <span
                    style={{
                      color: 'var(--pf-color-status-warning-text, #6B4010)',
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      fontWeight: 600,
                    }}
                  >
                    주의 보상 패턴: {guide.cautionKo}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Fixed Anchors vs Moving Joints */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingTop: '6px',
              borderTop: '1px dashed var(--pf-color-border-default, #D5DDD0)',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
            }}
          >
            <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
              고정 지지 접점 (Fixed Anchors · {activePhaseSpec.fixedAnchors.length}곳)
            </strong>
            <ul
              data-testid="fixed-anchors-list"
              style={{
                margin: 0,
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: 'var(--pf-color-text-secondary, #3D4F45)',
              }}
            >
              {activePhaseSpec.fixedAnchors.map((anchor) => (
                <li key={anchor.joint}>
                  <strong>
                    {JOINT_LABELS_KO[anchor.joint]} ({anchor.joint}):
                  </strong>{' '}
                  {anchor.surfaceKo}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '4px' }}>
              <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                가동 관절 (Moving Joints · {activePhaseSpec.movingJoints.length}곳):{' '}
              </strong>
              <span
                data-testid="moving-joints-list"
                style={{ color: 'var(--pf-color-text-secondary, #3D4F45)' }}
              >
                {activePhaseSpec.movingJoints
                  .map((joint) => `${JOINT_LABELS_KO[joint]}(${joint})`)
                  .join(', ')}
              </span>
            </div>
          </div>
        </section>

        {/* 패널 C — 움직임 방향 & 기구 저항 */}
        <section
          aria-label="패널 C — 움직임 방향 & 기구 저항"
          data-testid="visual-panel-directions"
          style={PANEL_CARD_STYLE}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              fontWeight: 700,
              color: 'var(--pf-color-action-primary, #173D34)',
            }}
          >
            패널 C · 움직임 방향 & 기구 저항 벡터
          </h4>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {allVectorsWithPhase.map(({ phaseId, vector }) => {
              const isCurrentPhase = phaseId === selectedPhase;
              return (
                <div
                  key={`${phaseId}-${vector.id}`}
                  data-testid={`direction-vector-item-${vector.id}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--pf-radius-sm, 8px)',
                    backgroundColor: isCurrentPhase
                      ? 'var(--pf-color-bg-surface-muted, #E4EADF)'
                      : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                    border: isCurrentPhase
                      ? '1px solid var(--pf-color-action-primary, #173D34)'
                      : '1px solid var(--pf-color-border-default, #D5DDD0)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontSize: 'var(--pf-text-xs, 0.75rem)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: '4px',
                    }}
                  >
                    <strong>{vector.labelKo}</strong>
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        color: 'var(--pf-color-text-muted, #526358)',
                      }}
                    >
                      {DIRECTION_KIND_LABELS_KO[vector.kind]} ({vector.kind})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      color: 'var(--pf-color-text-secondary, #3D4F45)',
                    }}
                  >
                    적용 구간: {PHASE_SCOPE_LABELS_KO[vector.phaseScope]} (
                    {vector.phaseScope})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Apparatus Travel / Pedal / Spring State */}
          <div
            data-testid="apparatus-resistance-summary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingTop: '6px',
              borderTop: '1px dashed var(--pf-color-border-default, #D5DDD0)',
              fontSize: 'var(--pf-text-xs, 0.75rem)',
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
              기구 이동·페달·스프링 상태 ({PHASE_SHORT_LABELS_KO[selectedPhase]} 기준)
            </strong>
            <div>
              • 스프링 세팅: <strong>{exercise.springs}</strong> (
              {SPRING_TENSION_LABELS_KO[activePhaseSpec.apparatusState.springTensionLevel]}
              )
            </div>
            <div>
              • 캐리지 이동 변위:{' '}
              <strong>
                시작 {asset.phases.start.apparatusState.carriageOffsetPx}px → 중간{' '}
                {asset.phases.middle.apparatusState.carriageOffsetPx}px → 끝{' '}
                {asset.phases.end.apparatusState.carriageOffsetPx}px
              </strong>
            </div>
            <div>
              • 체어 페달 각도:{' '}
              <strong>
                시작 {asset.phases.start.apparatusState.pedalAngleDeg}° → 중간{' '}
                {asset.phases.middle.apparatusState.pedalAngleDeg}° → 끝{' '}
                {asset.phases.end.apparatusState.pedalAngleDeg}°
              </strong>
            </div>
            <div>
              • 지지면·세팅: {activePhaseSpec.apparatusState.supportSurfaceKo} (풋바:{' '}
              {exercise.footbar} / 헤드레스트: {exercise.headrest} / 박스:{' '}
              {exercise.box})
            </div>
          </div>
        </section>

        {/* 패널 D — 주요 근육 역할 구분 */}
        <section
          aria-label="패널 D — 주요 근육 역할 구분"
          data-testid="visual-panel-muscles"
          style={PANEL_CARD_STYLE}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--pf-text-sm, 0.8125rem)',
              fontWeight: 700,
              color: 'var(--pf-color-action-primary, #173D34)',
            }}
          >
            패널 D · 주요 사용 근육 역할 구분 ({asset.primaryMuscles.length}군)
          </h4>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {asset.primaryMuscles.map((muscle) => {
              const roleStyle = MUSCLE_ROLE_STYLES[muscle.role];
              return (
                <div
                  key={`${muscle.muscleGroupId}-${muscle.role}`}
                  data-testid={`muscle-highlight-item-${muscle.muscleGroupId}`}
                  data-muscle-role={muscle.role}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 'var(--pf-radius-sm, 8px)',
                    backgroundColor: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--pf-radius-pill, 9999px)',
                        backgroundColor: roleStyle.badgeBg,
                        color: roleStyle.text,
                      }}
                    >
                      {muscle.roleLabelKo}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                        color: roleStyle.text,
                        fontWeight: 600,
                      }}
                    >
                      활성 단계:{' '}
                      {muscle.activePhases
                        .map((p) => PHASE_SHORT_LABELS_KO[p])
                        .join(' · ')}
                    </span>
                  </div>

                  <strong
                    style={{
                      fontSize: 'var(--pf-text-xs, 0.75rem)',
                      color: 'var(--pf-color-text-primary, #1E3129)',
                    }}
                  >
                    {muscle.labelKo}{' '}
                    <span
                      style={{
                        fontWeight: 500,
                        color: 'var(--pf-color-text-secondary, #3D4F45)',
                      }}
                    >
                      ({muscle.labelEn})
                    </span>
                  </strong>

                  <span
                    style={{
                      fontSize: 'var(--pf-text-2xs, 0.6875rem)',
                      color: 'var(--pf-color-text-secondary, #3D4F45)',
                      fontWeight: 600,
                    }}
                  >
                    카탈로그 매칭 근육: {muscle.catalogMuscleMatches.join(', ')}
                  </span>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--pf-text-xs, 0.75rem)',
                      color: 'var(--pf-color-text-primary, #1E3129)',
                      lineHeight: 1.45,
                    }}
                  >
                    {muscle.reasonKo}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. Reliable Source Audit & Pre/Post Review Distinction Section (<details>) */}
      <details
        data-testid="visual-source-audit-details"
        style={{
          backgroundColor: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
          borderRadius: 'var(--pf-radius-md, 12px)',
          padding: '10px 14px',
        }}
      >
        <summary
          style={{
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 'var(--pf-text-sm, 0.8125rem)',
            color: 'var(--pf-color-text-primary, #1E3129)',
          }}
        >
          <span>
            신뢰 출처 대조 · 제작 권리 · 검토 전/후(Pre/Post-Review) 구분 상세 (
            {sourceAudit.reviewStage})
          </span>
          <span
            style={{
              fontSize: 'var(--pf-text-2xs, 0.6875rem)',
              color: 'var(--pf-color-text-muted, #526358)',
              fontWeight: 600,
            }}
          >
            출처 {sourceAudit.matchedReliableSources.length}건 · 자세히 보기
          </span>
        </summary>

        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: 'var(--pf-text-xs, 0.75rem)',
            color: 'var(--pf-color-text-secondary, #3D4F45)',
            lineHeight: 1.55,
          }}
        >
          {/* Review Stage & Production Rights Summary */}
          <div
            style={{
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '1px solid var(--pf-color-border-default, #D5DDD0)',
              borderRadius: 'var(--pf-radius-sm, 8px)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div>
              <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                검토 단계 구분 (Pre-Review vs Post-Review):{' '}
              </strong>
              <span>
                {sourceAudit.isPostReview
                  ? '검토 후 (Post-Review)'
                  : '검토 전 (Pre-Review)'}{' '}
                · <code>{sourceAudit.reviewStage}</code> · {sourceAudit.reviewBadgeKo}
              </span>
            </div>
            <div>
              <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                무료 저작·라이선스 원칙:{' '}
              </strong>
              <span>{sourceAudit.productionRightsSummaryKo}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                정적 기구 정렬 가이드 SVG 경로:{' '}
              </strong>
              <code data-testid="static-guide-svg-path">
                {asset.staticGuideSvgPath}
              </code>
            </div>
            <div>
              <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
                해부학적 비추정 고지:{' '}
              </strong>
              <span>{integrity.anatomicalDisclaimerKo}</span>
            </div>
          </div>

          {/* Matched Catalog Facts */}
          <div>
            <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
              1) 카탈로그 메타데이터 대조 완료 항목 ({sourceAudit.matchedCatalogFactsKo.length}건)
            </strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              {sourceAudit.matchedCatalogFactsKo.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          {/* Diagram Simplifications */}
          <div>
            <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
              2) 2D 도해 단순화 한계 ({sourceAudit.diagramSimplificationsKo.length}건)
            </strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              {sourceAudit.diagramSimplificationsKo.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Unverified Items */}
          <div>
            <strong style={{ color: 'var(--pf-color-status-warning-text, #6B4010)' }}>
              3) 미검증·현장 직접 확인 필요 항목 ({sourceAudit.unverifiedItemsKo.length}건)
            </strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              {sourceAudit.unverifiedItemsKo.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Pre-to-Post Review Checklist */}
          <div>
            <strong style={{ color: 'var(--pf-color-action-primary, #173D34)' }}>
              4) 검토 전(Pre-Review) → 검토 후(Post-Review) 전환 체크리스트
            </strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              {sourceAudit.preToPostReviewChecklistKo.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Matched Reliable Sources */}
          <div>
            <strong style={{ color: 'var(--pf-color-text-primary, #1E3129)' }}>
              5) 대조된 신뢰 출처 원문 링크 ({sourceAudit.matchedReliableSources.length}건 ·
              Link-Only)
            </strong>
            <ul
              data-testid="reliable-sources-list"
              style={{
                margin: '6px 0 0',
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {sourceAudit.matchedReliableSources.map((src) => (
                <li key={src.id}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--pf-color-action-primary, #173D34)',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    {src.titleKo}
                  </a>{' '}
                  <span>
                    — {src.publisherKo} · [{src.verificationStatusLabelKo}] · (
                    {src.rightsLabelKo})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
