import { ArrowRight, Coffee, Info } from 'lucide-react';
import { EQUIPMENT_OPTIONS, getExerciseEquipment, PROP_OPTIONS } from '../data/equipmentCatalog';
import { POSITION_LABELS } from '../data/pilatesCatalog';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import type { AnatomicalSide } from '../models/types';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import type { SequenceSimulation, SimulationPosition } from '../utils/sequenceSimulation';
import {
  CONNECTED_CLASS_SECTION_LABELS,
  resolveConnectedMotionStudy,
} from '../utils/connectedMotionStudy';
import { isRestStep } from '../utils/sequenceEngine';
import { getMotionStudyPhase, getMotionStudyStage } from '../utils/motionStudyStages';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { MotionAuthoringBatchFigure } from './MotionAuthoringBatchFigure';
import { MotionDraftFigure } from './MotionDraftFigure';
import { SupineReachFigure } from './SupineReachFigure';
import { MotionPhaseContextPanel } from './MotionPhaseContextPanel';
import '../styles/connected-motion-study.css';

interface ConnectedMotionStudyProps {
  model: SequenceSimulation;
  position: SimulationPosition;
  steps: readonly SequenceStep[];
  exercises: readonly PilatesExercise[];
  selectedIndex: number;
  playing: boolean;
  reducedMotion: boolean;
  active?: boolean;
  mirrored?: boolean;
}

function equipmentText(exercise?: PilatesExercise): string {
  if (!exercise) return '기구·소도구 정보 없음';
  const requirements = getExerciseEquipment(exercise);
  const equipment = requirements.requiredEquipment.map(
    (id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id,
  );
  const props = requirements.requiredProps.map(
    (id) => PROP_OPTIONS.find((item) => item.id === id)?.labelKo ?? id,
  );
  return (
    [
      ...equipment,
      ...props,
      ...(!requirements.requirementsKnown ? ['일부 요구 조건 확인 필요'] : []),
    ].join(' · ') || '기구·소도구 정보 없음'
  );
}

function contextText(
  step: SequenceStep | undefined,
  exercise: PilatesExercise | undefined,
  sourceUnchanged: boolean,
): string {
  if (!step) return '다음 항목 없음';
  if (isRestStep(step)) return '계획한 휴식';
  if (!exercise) return '동작·세팅 정보 확인 필요';
  const review = getExerciseReviewState(exercise);
  const reviewed = sourceUnchanged && review === 'approved';
  const reviewLabel = !sourceUnchanged
    ? '원본 변경 · 검토 상태 다시 확인 필요'
    : reviewed
      ? '내 계획 정보 검토 기록 · 전문가 검토 아님'
      : review === 'stale'
        ? '정보 변경 · 다시 검토 필요'
        : '계획 정보 미검토';
  const box = { none: '박스 없음', 'long-box': '롱박스', 'short-box': '숏박스' }[exercise.box];
  return [
    `계획 기구 정보: ${equipmentText(exercise)}`,
    POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition,
    reviewLabel,
    ...(reviewed
      ? [
          ...(exercise.apparatus !== 'mat'
            ? [box, `풋바 ${exercise.footbar}`, `헤드레스트 ${exercise.headrest}`]
            : []),
          ...(!step.customSpringOverride && exercise.springs
            ? [`내가 검토한 기본 기구 메모: ${exercise.springs}`]
            : []),
        ]
      : ['원본 기구 세팅은 검토 후 확인 필요']),
    ...(step.customSpringOverride
      ? [`이번 수업 강사 입력 메모: ${step.customSpringOverride}`]
      : []),
  ]
    .filter(Boolean)
    .join(' · ');
}

function StudyFigure({
  reference,
  progress,
  side,
  mirrored,
}: {
  reference: MotionPatternReference;
  progress: number;
  side: AnatomicalSide;
  mirrored: boolean;
}) {
  const label = `${reference.title} · 관련 패턴 저작 도해 · 전문가 미검토`;
  switch (reference.family) {
    case 'existing-proposal':
      return (
        <MotionDraftFigure
          draftId={reference.variantId}
          progress={progress}
          activeSide={side}
          mirrored={mirrored}
          label={label}
        />
      );
    case 'authoring-batch':
      return (
        <MotionAuthoringBatchFigure
          variantId={reference.variantId}
          progress={progress}
          activeSide={side}
          mirrored={mirrored}
          label={label}
        />
      );
    case 'supine-reach':
      return (
        <SupineReachFigure
          progress={progress}
          activeSide={side}
          mirrored={mirrored}
          label={label}
        />
      );
  }
}

/** A pure view of the parent's cursor. It creates no clock, playback controller or persistence. */
export function ConnectedMotionStudy({
  model,
  position,
  steps,
  exercises,
  selectedIndex,
  playing,
  reducedMotion,
  active = true,
  mirrored = false,
}: ConnectedMotionStudyProps) {
  const study = resolveConnectedMotionStudy({
    model,
    position,
    steps,
    selectedIndex,
    reducedMotion,
    active,
  });
  const step = study.stepIndex === null ? undefined : steps[study.stepIndex];
  const exercise = step ? exercises.find((item) => item.id === step.exerciseId) : undefined;
  // Lookup is permitted only after the saved binding passes every resolver check.
  const reference =
    study.kind === 'study' && study.bindingStatus === 'matched' && step?.motionStudy
      ? getMotionPatternReferences(step.exerciseId).find(
          (item) =>
            item.family === step.motionStudy?.family &&
            item.variantId === step.motionStudy.variantId,
        )
      : undefined;
  const bilateral = reference?.definition.sideMode === 'bilateral';
  const unknownSide = study.side === 'unknown';
  const pairStill = !!reference && !bilateral && (study.side === 'both' || unknownSide);
  const incompatibleSide =
    !!reference && bilateral && (study.side === 'left' || study.side === 'right');
  const still =
    study.static || reducedMotion || !active || pairStill || unknownSide || incompatibleSide;
  const holdProgress = study.entry?.phases.find((phase) => phase.id === 'turn')?.sample ?? 0;
  const progress =
    pairStill || incompatibleSide || unknownSide
      ? study.stage?.id === 'setup'
        ? (study.entry?.phases.find((phase) => phase.id === 'setup')?.sample ?? 0)
        : study.stage?.id === 'finish'
          ? (study.entry?.phases.find((phase) => phase.id === 'finish')?.sample ?? 1)
          : holdProgress
      : study.progress;
  const displayedPhase = study.entry ? getMotionStudyPhase(study.entry, progress) : undefined;
  const displayedStage = study.entry ? getMotionStudyStage(study.entry, progress) : undefined;
  const nextIndex = study.nextStepIndex;
  const nextStep = nextIndex === undefined ? undefined : steps[nextIndex];
  const nextExercise = nextStep
    ? exercises.find((item) => item.id === nextStep.exerciseId)
    : undefined;
  const sideLabel = {
    left: '해부학적 왼쪽',
    right: '해부학적 오른쪽',
    both: '양쪽 함께',
    unknown: '좌우 정보 없음',
  }[study.side];

  return (
    <section
      className="connected-motion-study"
      aria-label="수업 시간에 연결한 동작 흐름"
      data-study-kind={study.kind}
      data-binding-status={study.bindingStatus}
      data-class-section={study.section}
      data-motion-stage={displayedStage?.id}
      data-motion-phase={displayedPhase?.id}
      data-study-progress={progress}
      data-study-side={study.side}
      data-view-mirrored={mirrored}
      data-study-static={still}
    >
      <header className="connected-study-heading">
        <div>
          <span className="connected-study-section">
            수업 역할 · {CONNECTED_CLASS_SECTION_LABELS[study.section]}
          </span>
          <h4>동작 흐름</h4>
        </div>
        <span className="connected-study-clock-state">
          {playing && !still ? '수업 시간표에 연결됨' : '정지 화면 확인'}
        </span>
      </header>

      {study.kind === 'rest' ? (
        <div className="connected-study-neutral">
          <Coffee size={25} />
          <strong>계획한 휴식</strong>
          <p>동작 도해 없이 수업의 휴식 시간을 표시합니다.</p>
        </div>
      ) : study.kind === 'transition' ? (
        <div className="connected-study-neutral connected-study-transition">
          <strong>{nextStep ? '다음 항목 세팅 확인' : '수업 마무리'}</strong>
          <div className="connected-study-contexts">
            <div>
              <span>현재 · {exercise?.nameKo || '동작 정보 없음'}</span>
              <p>{contextText(step, exercise, active)}</p>
            </div>
            <ArrowRight size={20} aria-hidden="true" />
            <div>
              <span>
                다음 ·{' '}
                {nextStep
                  ? isRestStep(nextStep)
                    ? '휴식'
                    : nextExercise?.nameKo || '동작 정보 없음'
                  : '계획 끝'}
              </span>
              <p>{contextText(nextStep, nextExercise, active)}</p>
            </div>
          </div>
          <p>
            위 내용은 계획에 저장된 세팅입니다. 동작 사이의 이동 경로나 기구 전환은 제작·검수되지
            않았습니다.
          </p>
        </div>
      ) : reference ? (
        <>
          <div className="connected-study-badges" aria-label="연결한 모션 제작 상태">
            <span>저장한 연결 · 자료 버전 일치</span>
            <span>관련 패턴</span>
            <span>정확한 동작 자산 아님</span>
            <span>전문가 미검토 · 0명</span>
          </div>
          <p className="connected-study-title">
            <strong>{reference.title}</strong>
            <span>{reference.variant}</span>
          </p>
          <div className={`connected-study-figures${pairStill ? ' is-paired' : ''}`}>
            {(pairStill
              ? (['left', 'right'] as const)
              : ([study.anatomicalSide ?? 'left'] as const)
            ).map((side) => (
              <figure
                key={`${reference.family}:${reference.variantId}:${side}`}
                data-study-anatomical-side={bilateral ? 'both' : side}
              >
                <StudyFigure
                  reference={reference}
                  progress={progress}
                  side={side}
                  mirrored={mirrored}
                />
                <figcaption>
                  {pairStill
                    ? `${side === 'left' ? '해부학적 왼쪽' : '해부학적 오른쪽'} · 참고 정지 화면`
                    : sideLabel}
                </figcaption>
              </figure>
            ))}
          </div>
          <dl className="connected-study-legend">
            <div>
              <dt>도해 안의 단계</dt>
              <dd>
                {displayedStage?.id === 'setup'
                  ? '세팅 · 정지'
                  : displayedStage?.id === 'finish'
                    ? '종료 · 정지'
                    : `수행 참고 · ${displayedPhase?.label || '저작 단계'}`}
              </dd>
            </div>
            <div>
              <dt>표시 방향</dt>
              <dd>
                {mirrored ? '화면만 반전 · 해부학적 좌우 유지' : '화면 반전 없음'}
                {reference.family === 'supine-reach' &&
                  ' · 두 겹 윤곽: 각 그림의 움직이는 다리'}
              </dd>
            </div>
          </dl>
          <MotionPhaseContextPanel reference={reference} progress={progress} />
          {pairStill && (
            <p className="connected-study-note">
              {unknownSide
                ? '계획의 좌우를 확인할 수 없어'
                : '함께 수행하는 계획이지만 이 도해는 한쪽 패턴이므로'}{' '}
              양쪽의 참고 정지 화면을 나란히 표시합니다.
            </p>
          )}
          {incompatibleSide && (
            <p className="connected-study-note">
              계획은 {sideLabel}이지만 이 관련 패턴은 양쪽 함께의 도해입니다. 한쪽 수행을 나타내지
              않으므로 정지 화면만 표시합니다.
            </p>
          )}
          {unknownSide && (
            <p className="connected-study-note">
              계획의 해부학적 좌우를 확인할 수 없어 참고 정지 화면만 표시합니다.
            </p>
          )}
          <p className="connected-study-note">
            <Info size={15} />{' '}
            {reducedMotion
              ? '동작 줄이기 설정 · 참고 정지 화면. '
              : !active
                ? '원본 상태 확인 필요 · 참고 정지 화면. '
                : ''}
            수행 구간의 8초 순환은 도해 표시용입니다. 실제 수행 속도·횟수·처방 시간이 아니며, 횟수와
            세트로 시간을 계산하지 않습니다.
          </p>
          <details className="connected-study-context">
            <summary>관련 패턴의 기구·자료 맥락</summary>
            <p>계획 기구: {equipmentText(exercise)}</p>
            <p>도해 기구: {reference.equipment.join(' · ')}</p>
            <p>{reference.context}</p>
            <p>{reference.definition.supportNote}</p>
          </details>
        </>
      ) : (
        <div className="connected-study-neutral">
          <Info size={25} />
          <strong>
            {study.kind === 'empty'
              ? '표시할 수업 항목이 없어요'
              : '연결한 동작 도해를 표시할 수 없어요'}
          </strong>
          <p>{study.reason || '저장한 연결과 해당 동작의 자료를 확인해 주세요.'}</p>
          <p>
            항목 설정에서 관련 패턴과 버전을 확인한 뒤 연결을 저장해 주세요. 시간표 위치는 수동으로
            살펴볼 수 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}
