import { useMemo, useRef, useState } from 'react';
import type { PilatesExercise } from '../types/pilates';
import { toMovementPhaseDiagramProps } from '../features/motionCoverage/adapters';
import {
  isRotationDiagramExercise,
  resolveRotationDiagramCandidate,
  toRotationMovementPhaseDiagramProps,
} from '../features/rotationDiagramCandidate';
import { resolveSpineArticulationDiagramByExerciseId } from '../data/spineArticulationDiagramData';
import {
  getPelvisHipCatalogVisualAssets,
  type PelvisHipVariantId,
} from '../data/pelvisHipDiagramData';
import { resolveHipLegMovementId } from '../models/hip-leg-diagram-model';
import { EXTENSION_MOVEMENT_SPECS } from '../data/extensionMovementData';
import {
  resolveShoulderSupportDiagramForExercise,
  type ShoulderSupportTargetExerciseId,
} from '../data/shoulderSupportDiagrams';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';
import { RotationPhaseTriptych } from './RotationDraftFigure';
import { SpineArticulationDiagramReference } from './SpineArticulationDiagramReference';
import { PelvisHipIntegrationExamples } from './PelvisHipIntegrationExamples';
import { HipLegDiagramFigure } from './hip-leg-diagram-figure';
import {
  CoreAbdominalDiagramFigure,
  resolveCoreAbdominalDiagram,
} from './CoreAbdominalDiagramFigure';
import {
  BreathingPelvicDiagramFigure,
  resolveBreathingPelvicDiagram,
} from './BreathingPelvicDiagramFigure';
import {
  FootworkLowerDiagramFigure,
  resolveFootworkLowerDiagram,
} from './FootworkLowerDiagramFigure';
import {
  UpperBodyArmDiagramFigure,
  resolveUpperBodyArmDiagram,
} from './UpperBodyArmDiagramFigure';
import {
  LateralAndApparatusDiagramFigure,
  resolveLateralAndApparatusDiagram,
} from './LateralAndApparatusDiagramFigure';
import { ExtendedMotionVerificationPanel } from './ExtendedMotionVerificationPanel';
import { ExtensionMovementTriptych } from './ExtensionMovementDiagram';
import { ShoulderSupportTriptychDiagram } from './ShoulderSupportDiagramFigure';
import { MOVEMENT_DIAGRAM_CORRECTIONS } from '../data/movementDiagramCorrections';
import '../styles/movement-diagram-reference.css';

/** Single authored reference only; no verified motion sequence or class-side instruction. */
export function MovementDiagramReference({ exercise }: { exercise: PilatesExercise }) {
  return <DiagramDisclosure key={exercise.id} exercise={exercise} />;
}

function DiagramDisclosure({ exercise }: { exercise: PilatesExercise }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="movement-diagram-reference"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>참고 자세 그림</summary>
      {open && <DiagramContent exercise={exercise} />}
    </details>
  );
}

function DiagramContent({ exercise }: { exercise: PilatesExercise }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [showCorrectionRecord, setShowCorrectionRecord] = useState(false);
  const [showVisualGuide, setShowVisualGuide] = useState(false);
  const [showFallbackGuide, setShowFallbackGuide] = useState(false);
  const [showSpineDiagram, setShowSpineDiagram] = useState(false);
  const [showPelvisDiagram, setShowPelvisDiagram] = useState(false);
  const [showHipLegDiagram, setShowHipLegDiagram] = useState(false);
  const [showCoreDiagram, setShowCoreDiagram] = useState(false);
  const [showExtensionDiagram, setShowExtensionDiagram] = useState(false);
  const [showShoulderDiagram, setShowShoulderDiagram] = useState(false);
  const [showRotationTriptych, setShowRotationTriptych] = useState(false);
  const [showBreathingPelvicDiagram, setShowBreathingPelvicDiagram] = useState(false);
  const [showFootworkLowerDiagram, setShowFootworkLowerDiagram] = useState(false);
  const [showUpperBodyArmDiagram, setShowUpperBodyArmDiagram] = useState(false);
  const [showLateralApparatusDiagram, setShowLateralApparatusDiagram] = useState(false);
  const [showExtendedVerification, setShowExtendedVerification] = useState(false);

  const hasExpandedSubSection =
    showCorrectionRecord ||
    showVisualGuide ||
    showFallbackGuide ||
    showSpineDiagram ||
    showPelvisDiagram ||
    showHipLegDiagram ||
    showCoreDiagram ||
    showExtensionDiagram ||
    showShoulderDiagram ||
    showRotationTriptych ||
    showBreathingPelvicDiagram ||
    showFootworkLowerDiagram ||
    showUpperBodyArmDiagram ||
    showLateralApparatusDiagram ||
    showExtendedVerification;

  const handleCollapseAll = () => {
    setShowCorrectionRecord(false);
    setShowVisualGuide(false);
    setShowFallbackGuide(false);
    setShowSpineDiagram(false);
    setShowPelvisDiagram(false);
    setShowHipLegDiagram(false);
    setShowCoreDiagram(false);
    setShowExtensionDiagram(false);
    setShowShoulderDiagram(false);
    setShowRotationTriptych(false);
    setShowBreathingPelvicDiagram(false);
    setShowFootworkLowerDiagram(false);
    setShowUpperBodyArmDiagram(false);
    setShowLateralApparatusDiagram(false);
    setShowExtendedVerification(false);

    const nestedDetails = sectionRef.current?.querySelectorAll('details');
    nestedDetails?.forEach((detailEl) => {
      detailEl.open = false;
      detailEl.removeAttribute('open');
    });

    if (typeof sectionRef.current?.scrollIntoView === 'function') {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    sectionRef.current?.focus({ preventScroll: true });
  };

  const isRotation = isRotationDiagramExercise(exercise.id);
  const rotCandidate = useMemo(
    () => (isRotation ? resolveRotationDiagramCandidate(exercise.id) : null),
    [exercise.id, isRotation],
  );
  const props = useMemo(
    () =>
      toMovementPhaseDiagramProps(exercise, 'start', {
        activeSide: 'right',
        mirrored: false,
        showMuscles: false,
        showAlignment: false,
        showDirection: false,
        showGhostStartPose: false,
        label: `${exercise.nameKo} · 직접 작성한 참고 자세 그림 · 출처 대조 확인`,
      }) ??
      (isRotation &&
      rotCandidate &&
      exercise.apparatus === rotCandidate.asset.apparatus &&
      exercise.bodyPosition === rotCandidate.asset.bodyPosition
        ? toRotationMovementPhaseDiagramProps(exercise, 'start', {
            activeSide: 'right',
            mirrored: false,
            showMuscles: false,
            showAlignment: false,
            showDirection: false,
            showGhostStartPose: false,
            label: `${exercise.nameKo} · 직접 작성한 참고 자세 그림 · 출처 대조 확인`,
          })
        : null),
    [exercise, isRotation, rotCandidate],
  );
  const spineSpec = useMemo(
    () => resolveSpineArticulationDiagramByExerciseId(exercise.id),
    [exercise.id],
  );
  const hasPelvisDiagram = useMemo(
    () => exercise.id in getPelvisHipCatalogVisualAssets(),
    [exercise.id],
  );
  const hipLegId = useMemo(
    () => resolveHipLegMovementId(exercise.id),
    [exercise.id],
  );
  const coreSpec = useMemo(
    () => resolveCoreAbdominalDiagram(exercise.id),
    [exercise.id],
  );
  const hasExtensionDiagram = useMemo(
    () => exercise.id in EXTENSION_MOVEMENT_SPECS,
    [exercise.id],
  );
  const shoulderTargetId =
    exercise.id === 'original-mat-forearm-plank' ? 'plank-support' : exercise.id;
  const shoulderSpec = useMemo(
    () => resolveShoulderSupportDiagramForExercise(shoulderTargetId),
    [shoulderTargetId],
  );
  const breathingPelvicSpec = useMemo(
    () => resolveBreathingPelvicDiagram(exercise.id),
    [exercise.id],
  );
  const footworkLowerSpec = useMemo(
    () => resolveFootworkLowerDiagram(exercise.id),
    [exercise.id],
  );
  const upperBodyArmSpec = useMemo(
    () => resolveUpperBodyArmDiagram(exercise.id),
    [exercise.id],
  );
  const lateralApparatusSpec = useMemo(
    () => resolveLateralAndApparatusDiagram(exercise.id),
    [exercise.id],
  );
  const correction = MOVEMENT_DIAGRAM_CORRECTIONS[exercise.id];
  const matchedCorrection = correction?.archetypeId === props?.asset.archetypeId ? correction : null;
  return (
    <section
      ref={sectionRef}
      className="movement-diagram-reference-content"
      aria-label="참고 자세 정지 그림"
      tabIndex={-1}
    >
      <div
        className="movement-diagram-collapse-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '8px',
        }}
      >
        <button
          type="button"
          className="movement-diagram-collapse-all-btn"
          data-testid="diagram-ref-collapse-all-btn"
          aria-hidden={hasExpandedSubSection ? undefined : 'true'}
          tabIndex={hasExpandedSubSection ? 0 : -1}
          onClick={handleCollapseAll}
          style={{
            minHeight: '44px',
            minWidth: '44px',
            wordBreak: 'keep-all',
            overflowWrap: 'anywhere',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #c5d6cf',
            background: '#f5f8f6',
            color: '#24594c',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          열린 참고 섹션 모두 접기
        </button>
      </div>
      {!props ? (
        <>
          <p>이 동작과 일치하는 도해가 아직 없어요. 다른 동작의 그림으로 대신하지 않아요.</p>
          <details
            className="movement-diagram-fallback-disclosure"
            data-testid="movement-diagram-fallback-disclosure"
            onToggle={(event) => setShowFallbackGuide(event.currentTarget.open)}
          >
            <summary className="movement-diagram-correction-summary">
              기구·자세 기준 3단계 기본 골격 가이드 보기 (개별 동작 정밀 도해 아님)
            </summary>
            {showFallbackGuide && <MovementVisualGuideCard exercise={exercise} />}
          </details>
        </>
      ) : (
        <>
          <p className="muted">
            직접 작성한 정지 그림 한 장이에요. 실제 단계별 프레임이 검증되지 않아 단계 탐색이나
            재생은 제공하지 않아요.
          </p>
          {matchedCorrection && (
            <details onToggle={(event) => setShowCorrectionRecord(event.currentTarget.open)}>
              <summary>출처 대조 기록</summary>
              <p>{matchedCorrection.reviewedScopeKo}</p>
              <p>{matchedCorrection.correctionKo}</p>
              <p className="muted">{matchedCorrection.limitationKo}</p>
              <ul>
                {matchedCorrection.sources.map((source) => (
                  <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>
                ))}
              </ul>
            </details>
          )}
          <div className="movement-diagram-reference-canvas">
            <MovementPhaseDiagramSvg {...props} />
          </div>
          <p className="muted">
            기준 그림: 오른쪽 · 화면 반전 없음. 수업안의 좌우 설정과 연결되지 않아요.
          </p>
          <p className="muted">
            해부학적 정확성과 운동 안전성은 검증되지 않았어요. 실제 운동 시범이나 3D 모델이 아닌
            참고 자료예요.
          </p>
          <details
            className="movement-diagram-visual-guide-disclosure"
            onToggle={(event) => setShowVisualGuide(event.currentTarget.open)}
          >
            <summary className="movement-diagram-correction-summary">
              3단계 연속 도해 및 유사 동작 비교 보기
            </summary>
            {showVisualGuide && <MovementVisualGuideCard exercise={exercise} />}
          </details>
          {spineSpec && (
            <details
              className="movement-diagram-spine-disclosure"
              data-testid="movement-diagram-spine-disclosure"
              onToggle={(event) => setShowSpineDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                척추 분절(C7~S1) 6분절 상세 도해 보기
              </summary>
              {showSpineDiagram && (
                <SpineArticulationDiagramReference
                  movementId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {hasPelvisDiagram && (
            <details
              className="movement-diagram-pelvis-disclosure"
              data-testid="movement-diagram-pelvis-disclosure"
              onToggle={(event) => setShowPelvisDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                골반·고관절 브릿징 3단계 상세 도해 보기
              </summary>
              {showPelvisDiagram && (
                <div data-testid="pelvis-hip-integration-examples">
                  <PelvisHipIntegrationExamples
                    initialVariantId={exercise.id as PelvisHipVariantId}
                    initialPhase="middle"
                  />
                </div>
              )}
            </details>
          )}
          {hipLegId && (
            <details
              className="movement-diagram-hip-leg-disclosure"
              data-testid="movement-diagram-hip-leg-disclosure"
              onToggle={(event) => setShowHipLegDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                고관절·하지 가동 궤적 및 골반 고정 도해 보기
              </summary>
              {showHipLegDiagram && (
                <HipLegDiagramFigure
                  movementId={hipLegId}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {coreSpec && (
            <details
              className="movement-diagram-core-disclosure"
              data-testid="movement-diagram-core-disclosure"
              onToggle={(event) => setShowCoreDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                복부 코어·요추 임프린트 3단계 상세 도해 보기
              </summary>
              {showCoreDiagram && (
                <CoreAbdominalDiagramFigure
                  exerciseId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {hasExtensionDiagram && (
            <details
              className="movement-diagram-extension-disclosure"
              data-testid="movement-diagram-extension-disclosure"
              onToggle={(event) => setShowExtensionDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                척추 신전·치골 지지 3단계 상세 도해 보기
              </summary>
              {showExtensionDiagram && (
                <div data-testid="extension-movement-triptych">
                  <ExtensionMovementTriptych
                    movementId={exercise.id as keyof typeof EXTENSION_MOVEMENT_SPECS}
                    selectedPhase="middle"
                  />
                </div>
              )}
            </details>
          )}
          {shoulderSpec && (
            <details
              className="movement-diagram-shoulder-disclosure"
              data-testid="movement-diagram-shoulder-disclosure"
              onToggle={(event) => setShowShoulderDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                견갑 안정·전신 지지 플랭크 3단계 상세 도해 보기
              </summary>
              {showShoulderDiagram && (
                <ShoulderSupportTriptychDiagram
                  movementId={shoulderTargetId as ShoulderSupportTargetExerciseId}
                />
              )}
            </details>
          )}
          {isRotation && (
            <details
              className="movement-diagram-rotation-disclosure"
              onToggle={(event) => setShowRotationTriptych(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                흉추 회전·골반 고정 3단계 상세 도해 보기
              </summary>
              {showRotationTriptych && rotCandidate && (
                <RotationPhaseTriptych movementId={rotCandidate.movementId} activePhase="middle" />
              )}
            </details>
          )}
          {breathingPelvicSpec && (
            <details
              className="movement-diagram-breathing-pelvic-disclosure"
              data-testid="movement-diagram-breathing-pelvic-disclosure"
              onToggle={(event) => setShowBreathingPelvicDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                호흡·센터링·골반 시계 3단계 상세 도해 보기
              </summary>
              {showBreathingPelvicDiagram && (
                <BreathingPelvicDiagramFigure
                  exerciseId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {footworkLowerSpec && (
            <details
              className="movement-diagram-footwork-lower-disclosure"
              data-testid="movement-diagram-footwork-lower-disclosure"
              onToggle={(event) => setShowFootworkLowerDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                풋워크·발목·페달·하지 정렬 3단계 상세 도해 보기
              </summary>
              {showFootworkLowerDiagram && (
                <FootworkLowerDiagramFigure
                  exerciseId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {upperBodyArmSpec && (
            <details
              className="movement-diagram-upper-body-arm-disclosure"
              data-testid="movement-diagram-upper-body-arm-disclosure"
              onToggle={(event) => setShowUpperBodyArmDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                상지 스트랩·로우·암 아크 3단계 상세 도해 보기
              </summary>
              {showUpperBodyArmDiagram && (
                <UpperBodyArmDiagramFigure
                  exerciseId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          {lateralApparatusSpec && (
            <details
              className="movement-diagram-lateral-apparatus-disclosure"
              data-testid="movement-diagram-lateral-apparatus-disclosure"
              onToggle={(event) => setShowLateralApparatusDiagram(event.currentTarget.open)}
            >
              <summary className="movement-diagram-correction-summary">
                측굴·기구 회전·테이블탑·사지 지지 3단계 상세 도해 보기
              </summary>
              {showLateralApparatusDiagram && (
                <LateralAndApparatusDiagramFigure
                  exerciseId={exercise.id}
                  initialPhase="middle"
                />
              )}
            </details>
          )}
          <details
            className="movement-diagram-extended-verification-disclosure"
            data-testid="movement-diagram-extended-verification-disclosure"
            onToggle={(event) => setShowExtendedVerification(event.currentTarget.open)}
          >
            <summary className="movement-diagram-correction-summary">
              후보 연속 모션·출처 원장 전수 검증 기록 보기
            </summary>
            {showExtendedVerification && (
              <ExtendedMotionVerificationPanel exercise={exercise} />
            )}
          </details>
        </>
      )}
    </section>
  );
}
