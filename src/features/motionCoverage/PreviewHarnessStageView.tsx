import React from 'react';
import { MotionAuthoringBatchFigure } from '../../components/MotionAuthoringBatchFigure';
import { MotionDraftFigure } from '../../components/MotionDraftFigure';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../../components/MovementPhaseDiagramSvg';
import { SupineReachFigure } from '../../components/SupineReachFigure';
import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import type { BatchVariantId } from '../../models/motionAuthoringBatch';
import type { MotionDraftId } from '../../models/types';
import { getMotionPose } from '../../utils/motionReferenceModel';
import type { ExerciseEvidenceMotionCoverageOverlay, RenderableMotionDescriptor } from './adapters';
import {
  DISCRETE_VISUAL_PHASES,
  DRAFT_REPEAT_COUNTS,
  DRAFT_SPEEDS,
  type DraftRepeatCount,
  type DraftSpeed,
  type MotionCoveragePlaybackController,
  type MotionCoveragePlaybackSnapshot,
} from './playbackController';
import {
  ACTIVE_TOUCH_BUTTON_STYLE,
  TOUCH_BUTTON_STYLE,
  getDiscretePhaseButtonLabelKo,
  pointsToSvgPath,
} from './previewHarnessSelectors';

export interface PreviewHarnessStageViewProps {
  readonly uid: string;
  readonly snapshot: MotionCoveragePlaybackSnapshot;
  readonly controller: MotionCoveragePlaybackController;
  readonly onStageKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export interface ContinuousDraftFigureSurfaceProps {
  readonly snapshot: MotionCoveragePlaybackSnapshot;
}

export interface Discrete2dRigSurfaceProps {
  readonly descriptor: RenderableMotionDescriptor;
  readonly selectedPhase: VisualPhaseId;
  readonly onSelectPhase: (nextPhase: VisualPhaseId) => void;
}

export interface PreviewHarnessTruthLedgerProps {
  readonly evidenceOverlay: ExerciseEvidenceMotionCoverageOverlay;
}

/**
 * Continuous draft figure surface (`projected-3d` and `continuous-2d`).
 * Strictly distinguishes 2D SVG oblique projection (`projected-3d`) and 2D continuous drafts (`continuous-2d`)
 * from true WebGL 3D.
 */
export const ContinuousDraftFigureSurface: React.FC<ContinuousDraftFigureSurfaceProps> = ({
  snapshot,
}) => {
  const activePatternRef = snapshot.activePatternReference;
  const activeLabProto = snapshot.activeLabPrototype;
  const continuousProgress = snapshot.progress ?? 0;

  return (
    <div
      data-testid="harness-continuous-figure-surface"
      data-variant-id={snapshot.activeVariantId ?? ''}
      data-progress={String(continuousProgress)}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        marginBottom: '12px',
        padding: '8px',
        borderRadius: '8px',
        background: '#f3f6f4',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#254235',
        }}
      >
        {snapshot.mode === 'projected-3d'
          ? `미검토 3D→2D SVG 사선 투영 연속 초안 (${snapshot.activeVariantId}) · 실제 3D(WebGL) 아님`
          : `미검토 2D 평면 연속 초안 (${snapshot.activeVariantId})`}
      </p>
      <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        {activePatternRef?.family === 'existing-proposal' && (
          <MotionDraftFigure
            draftId={activePatternRef.variantId as MotionDraftId}
            progress={continuousProgress}
          />
        )}
        {activePatternRef?.family === 'authoring-batch' && (
          <MotionAuthoringBatchFigure
            variantId={activePatternRef.variantId as BatchVariantId}
            progress={continuousProgress}
          />
        )}
        {activePatternRef?.family === 'supine-reach' && (
          <SupineReachFigure progress={continuousProgress} />
        )}
        {!activePatternRef && activeLabProto && (
          <svg
            viewBox="65 80 440 160"
            role="img"
            aria-label={`${activeLabProto.title} 연구실 2D 프로토타입 도해`}
            data-testid="harness-lab-prototype-svg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {(() => {
              const pose = getMotionPose(activeLabProto.id, continuousProgress, 'left');
              return (
                <g>
                  <rect x="102" y="217" width="380" height="9" rx="4.5" fill="#d6dfd9" />
                  <path
                    d={pointsToSvgPath([pose.joints.shoulder, pose.joints.hip])}
                    stroke="#1f4d3b"
                    strokeWidth="6"
                    fill="none"
                  />
                  <path
                    d={pointsToSvgPath([
                      pose.legs.left.hip,
                      pose.legs.left.knee,
                      pose.legs.left.ankle,
                      pose.legs.left.heel,
                      pose.legs.left.toe,
                    ])}
                    stroke="#1f4d3b"
                    strokeWidth="5"
                    fill="none"
                  />
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
};

/**
 * Reused eligible 2D 3-phase schematic surface (`MovementPhaseDiagramSvg` + `MovementTriptychDiagramSvg`).
 */
export const Discrete2dRigSurface: React.FC<Discrete2dRigSurfaceProps> = ({
  descriptor,
  selectedPhase,
  onSelectPhase,
}) => {
  if (descriptor.mode === 'missing') return null;

  const phaseProps =
    descriptor.mode === 'three-phase-2d'
      ? descriptor.phasePropsByPhase[selectedPhase]
      : (descriptor.fallbackPhasePropsByPhase?.[selectedPhase] ?? null);
  const triptychProps =
    descriptor.mode === 'three-phase-2d'
      ? descriptor.triptychProps
      : descriptor.fallbackTriptychProps;

  return (
    <div
      data-testid="harness-reused-2d-surface"
      data-selected-phase={selectedPhase}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#2c3e35',
        }}
      >
        기존 카탈로그 2D 3단계 포즈 에셋 재사용 (중복 생성 0건 · 현재 선택 단계: {selectedPhase})
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {phaseProps && (
          <div
            data-testid="harness-single-phase-diagram"
            style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
          >
            <MovementPhaseDiagramSvg {...phaseProps} phase={selectedPhase} />
          </div>
        )}
        {triptychProps && (
          <div
            data-testid="harness-triptych-diagram"
            style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
          >
            <MovementTriptychDiagramSvg
              {...triptychProps}
              selectedPhase={selectedPhase}
              onSelectPhase={onSelectPhase}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Interactive stage region containing mode-specific playback/step controls and figure surfaces.
 */
export const PreviewHarnessStageView: React.FC<PreviewHarnessStageViewProps> = ({
  uid,
  snapshot,
  controller,
  onStageKeyDown,
}) => {
  const activePhaseFor2d: VisualPhaseId = snapshot.selectedPhase ?? 'start';
  const activeDescriptor = snapshot.descriptor;
  const continuousProgress = snapshot.progress ?? 0;

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="모션 도해 검수 스테이지 (스테이지 포커스 시 좌우 방향키로 단계 이동, 스페이스바로 연속 초안 재생/일시정지)"
      data-testid="harness-interactive-stage"
      onKeyDown={onStageKeyDown}
      style={{
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid rgba(40, 54, 48, 0.18)',
        background: '#ffffff',
        marginBottom: '12px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ marginBottom: '10px' }}>
        <strong data-testid="harness-descriptor-badge">{activeDescriptor.badgeLabelKo}</strong>
        <p
          data-testid="harness-descriptor-disclaimer"
          style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#46584f' }}
        >
          {activeDescriptor.disclaimerKo}
        </p>
      </div>

      {/* Continuous Draft Controls (ONLY for projected-3d and continuous-2d) */}
      {snapshot.controlKind === 'continuous-draft-playback' && (
        <div
          data-testid="harness-continuous-controls"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '12px',
            padding: '10px',
            borderRadius: '8px',
            background: '#f5f8f6',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {snapshot.availableVariantIds.length > 1 && (
            <div
              role="group"
              aria-label="관련 패턴 초안 변형 선택"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
            >
              {snapshot.availableVariantIds.map((variantId, idx) => (
                <button
                  key={variantId}
                  type="button"
                  data-testid={`harness-variant-${variantId}`}
                  aria-pressed={snapshot.activeVariantIndex === idx}
                  style={
                    snapshot.activeVariantIndex === idx
                      ? ACTIVE_TOUCH_BUTTON_STYLE
                      : TOUCH_BUTTON_STYLE
                  }
                  onClick={() => controller.selectVariantIndex(idx)}
                >
                  패턴 변형 {idx + 1}: {variantId}
                </button>
              ))}
            </div>
          )}

          <div
            role="group"
            aria-label="연속 초안 재생 제어"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
          >
            <button
              type="button"
              data-testid="harness-play-pause-btn"
              disabled={!snapshot.canPlay && !snapshot.playing}
              style={snapshot.playing ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
              onClick={() => {
                if (snapshot.playing) {
                  controller.pause();
                } else {
                  controller.play({ explicitUserAction: true });
                }
              }}
            >
              {snapshot.playing
                ? '일시정지'
                : snapshot.reducedMotion
                  ? '동작 줄이기 · 정지 단계 보기'
                  : '한 주기 재생'}
            </button>

            <button
              type="button"
              data-testid="harness-restart-btn"
              style={TOUCH_BUTTON_STYLE}
              onClick={() => controller.restart()}
            >
              처음으로 (0%)
            </button>
          </div>

          <label
            htmlFor={`${uid}-seek-range`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '0.84rem',
              maxWidth: '100%',
            }}
          >
            <span>
              연속 초안 진행 위치: {Math.round(continuousProgress * 100)}%
              {snapshot.continuousPhaseLabelKo ? ` · ${snapshot.continuousPhaseLabelKo}` : ''}
            </span>
            <input
              id={`${uid}-seek-range`}
              type="range"
              aria-label="연속 초안 진행 위치"
              data-testid="harness-seek-slider"
              min="0"
              max="100"
              step="1"
              value={Math.round(continuousProgress * 100)}
              onChange={(event) => controller.seek(Number(event.target.value) / 100)}
              style={{
                width: '100%',
                maxWidth: '100%',
                minHeight: '44px',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            />
          </label>

          <div
            role="group"
            aria-label="재생 속도 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
          >
            {DRAFT_SPEEDS.map((spd: DraftSpeed) => (
              <button
                key={spd}
                type="button"
                data-testid={`harness-speed-${spd}`}
                aria-pressed={snapshot.speed === spd}
                style={snapshot.speed === spd ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
                onClick={() => controller.setSpeed(spd)}
              >
                속도 {spd}×
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="반복 횟수 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
          >
            {DRAFT_REPEAT_COUNTS.map((cnt: DraftRepeatCount) => (
              <button
                key={cnt}
                type="button"
                data-testid={`harness-repeat-${cnt}`}
                aria-pressed={snapshot.repeatCount === cnt}
                style={
                  snapshot.repeatCount === cnt ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE
                }
                onClick={() => controller.setRepeatCount(cnt)}
              >
                반복 {cnt}회
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Discrete 3-Phase Controls and parallel 2D phase inspection */}
      {snapshot.mode !== 'missing' && (
        <div
          data-testid="harness-discrete-phase-controls"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '12px',
            padding: '10px',
            borderRadius: '8px',
            background: '#f8faf9',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            {snapshot.mode === 'three-phase-2d'
              ? '이산 2D 3단계 수동 선택 (연속 모션 자동 보간 없음)'
              : '병행 2D 3단계 기준 포즈 빠른 이동'}
          </span>
          <div
            role="group"
            aria-label="2D 3단계 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
          >
            <button
              type="button"
              data-testid="harness-phase-prev"
              style={TOUCH_BUTTON_STYLE}
              disabled={activePhaseFor2d === 'start'}
              onClick={() => controller.prevPhase()}
            >
              이전 단계
            </button>
            {DISCRETE_VISUAL_PHASES.map((phaseId) => {
              const labelKo = getDiscretePhaseButtonLabelKo(phaseId);
              const isSelected = activePhaseFor2d === phaseId;
              return (
                <button
                  key={phaseId}
                  type="button"
                  data-testid={`harness-phase-${phaseId}`}
                  aria-pressed={isSelected}
                  style={isSelected ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
                  onClick={() => controller.selectPhase(phaseId)}
                >
                  {labelKo}
                </button>
              );
            })}
            <button
              type="button"
              data-testid="harness-phase-next"
              style={TOUCH_BUTTON_STYLE}
              disabled={activePhaseFor2d === 'end'}
              onClick={() => controller.nextPhase()}
            >
              다음 단계
            </button>
          </div>
        </div>
      )}

      {/* Continuous Draft Figure Surface (when projected-3d or continuous-2d) */}
      {(snapshot.mode === 'projected-3d' || snapshot.mode === 'continuous-2d') && (
        <ContinuousDraftFigureSurface snapshot={snapshot} />
      )}

      {/* Reused eligible 2D 3-Phase Schematic Surface */}
      {activeDescriptor.mode !== 'missing' && (
        <Discrete2dRigSurface
          descriptor={activeDescriptor}
          selectedPhase={activePhaseFor2d}
          onSelectPhase={(nextPhase) => controller.selectPhase(nextPhase)}
        />
      )}

      {/* Missing / Unsupported Truthful Fallback */}
      {activeDescriptor.mode === 'missing' && (
        <div
          data-testid="harness-missing-surface"
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: '#fbf3f2',
            border: '1px solid rgba(168, 56, 48, 0.25)',
            color: '#5c231f',
            fontSize: '0.84rem',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
            {activeDescriptor.badgeLabelKo} · 모션 도해 및 연속 재생 비활성
          </p>
          <p style={{ margin: '0 0 8px' }}>사유: {activeDescriptor.resolution.evidenceSummaryKo}</p>
          {activeDescriptor.resolution.threePhase2d.sourceComparison?.matchedReliableSources.map(
            (source) => (
              <p key={source.url} style={{ margin: '0 0 8px' }}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.titleKo}
                </a>
              </p>
            ),
          )}
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {activeDescriptor.resolution.rejectedCandidates.map((rej) => (
              <li key={`${rej.candidateId}-${rej.reason}`}>
                [{rej.reason}] {rej.detailKo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Truthfulness & Verification Ledger footer (`data-testid="harness-truth-ledger"`).
 */
export const PreviewHarnessTruthLedger: React.FC<PreviewHarnessTruthLedgerProps> = ({
  evidenceOverlay,
}) => (
  <dl
    data-testid="harness-truth-ledger"
    style={{
      margin: 0,
      padding: '10px',
      borderRadius: '8px',
      background: '#f4f7f5',
      fontSize: '0.8rem',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: '6px',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}
  >
    <div>
      <dt style={{ fontWeight: 600 }}>지원 수준 요약</dt>
      <dd style={{ margin: 0 }}>{evidenceOverlay.supportLevelLabelKo}</dd>
    </div>
    <div>
      <dt style={{ fontWeight: 600 }}>이산 2D vs 연속 모션 구분</dt>
      <dd style={{ margin: 0 }}>{evidenceOverlay.continuousVsDiscreteLabelKo}</dd>
    </div>
    <div>
      <dt style={{ fontWeight: 600 }}>2D SVG 투영 vs 진짜 3D 구분</dt>
      <dd style={{ margin: 0 }}>{evidenceOverlay.threeDimensionalTruthLabelKo}</dd>
    </div>
    <div>
      <dt style={{ fontWeight: 600 }}>정식 승인·해부학 검증 상태</dt>
      <dd style={{ margin: 0 }}>{evidenceOverlay.verificationTruthLabelKo}</dd>
    </div>
  </dl>
);
