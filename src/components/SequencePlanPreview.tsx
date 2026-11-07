import { ClassPlanSummary } from './ClassPlanSummary';
import { ClassCueSheetPreview } from '../features/classCueSheet/ClassCueSheetPreview';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { EQUIPMENT_OPTIONS, getExerciseEquipment, PROP_OPTIONS } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  exerciseRevision,
  getExerciseReviewState,
  isExerciseAutoEligible,
} from '../utils/exerciseReview';
import { buildSequenceSimulation, seekSequenceSimulation } from '../utils/sequenceSimulation';
import { useSequenceRehearsal } from '../hooks/useSequenceRehearsal';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
import '../styles/sequence-simulation.css';
import {
  formatSecondsToMMSS,
  getSequenceDurations,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';
import { MotionReferencePlayer } from './MotionReferencePlayer';
import { SequenceSegmentRehearsal } from './SequenceSegmentRehearsal';
import { ConnectedMotionStudy } from './ConnectedMotionStudy';
import { buildConnectedClassSections } from '../utils/connectedMotionStudy';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';

interface SequencePlanPreviewProps {
  onClose: () => void;
  /** Explicit plan actions; rehearsal itself never saves or starts teaching. */
  onSave?: () => void;
  onStart?: () => void;
  canStartClass?: boolean;
  startReadiness?: string;
}

function planningRequirements(exercise?: PilatesExercise): string {
  if (!exercise) return '기구·소도구 정보 없음';
  const requirements = getExerciseEquipment(exercise);
  const equipment = requirements.requiredEquipment
    .map((id) => EQUIPMENT_OPTIONS.find((option) => option.id === id)?.labelKo)
    .filter(Boolean);
  const props = requirements.requiredProps
    .map((id) => PROP_OPTIONS.find((option) => option.id === id)?.labelKo)
    .filter(Boolean);
  const labels = [...equipment, ...props].join(' · ');
  return requirements.requirementsKnown
    ? labels
    : `${labels ? `${labels} · ` : ''}일부 요구 조건 확인 필요`;
}

function practiceLabel(step: SequenceStep, exercise?: PilatesExercise): string {
  const sides =
    !exercise && !step.sideMode ? '좌우 정보 없음' : getStepSideLabels(step, exercise).join(' → ');
  return `${sides} · ${step.repetitions === undefined ? '횟수 미지정' : `강사가 정한 횟수 ${step.repetitions}회`}${step.sets === undefined ? '' : ` × ${step.sets}세트`}`;
}

function evidenceStamp(exercise?: PilatesExercise): string {
  if (!exercise) return 'missing';
  try {
    return JSON.stringify([
      exerciseRevision(exercise),
      getExerciseReviewState(exercise),
      exercise.review?.reviewerAlias,
      exercise.review?.reviewedAt,
    ]);
  } catch {
    return 'invalid';
  }
}
const segmentDuration = (seconds: number) =>
  `${formatSecondsToMMSS(seconds)}${seconds % 1 === 0.5 ? '.5' : ''}`;

/** Frozen plan rehearsal. Teaching and saving require a separate explicit caller action. */
export function SequencePlanPreview({
  onClose,
  onSave,
  onStart,
  canStartClass = false,
  startReadiness,
}: SequencePlanPreviewProps) {
  const [snapshot] = useState(() => {
    const state = usePilatesStore.getState();
    return JSON.parse(
      JSON.stringify({
        title: state.activeTitle,
        steps: state.activeSteps,
        exercises: state.exercises,
        targetMinutes: state.activeTargetMinutes,
      }),
    ) as {
      title: string;
      steps: SequenceStep[];
      exercises: PilatesExercise[];
      targetMinutes: number;
    };
  });
  const [manualSelection, setManualSelection] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'connected'>(() =>
    snapshot.steps.some((step) => !isRestStep(step) && step.motionStudy) ? 'connected' : 'timeline',
  );
  const [segmentRehearsalOpen, setSegmentRehearsalOpen] = useState(false);
  const [showCueSheet, setShowCueSheet] = useState(false);
  const segmentEntryRef = useRef<HTMLButtonElement>(null);
  const liveSteps = usePilatesStore((state) => state.activeSteps);
  const liveExercises = usePilatesStore((state) => state.exercises);
  const liveTarget = usePilatesStore((state) => state.activeTargetMinutes);
  const liveTitle = usePilatesStore((state) => state.activeTitle);
  const saveFeedback = usePilatesStore((state) => state.saveFeedback);
  const persistenceError = usePilatesStore((state) => state.persistenceError);
  const [saveRequested, setSaveRequested] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);
  const orderHeadingRef = useRef<HTMLHeadingElement>(null);
  const canRehearseInHost = useCallback(
    () => dialogRef.current?.isConnected === true && dialogRef.current.open,
    [],
  );
  const closing = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const exercises = useMemo(
    () => new Map(snapshot.exercises.map((exercise) => [exercise.id, exercise])),
    [snapshot.exercises],
  );
  const durations = getSequenceDurations(snapshot.steps);
  const model = useMemo(
    () => buildSequenceSimulation(snapshot.steps, snapshot.exercises, snapshot.targetMinutes),
    [snapshot],
  );
  const snapshotChanged = useMemo(
    () =>
      liveTitle !== snapshot.title ||
      liveTarget !== snapshot.targetMinutes ||
      JSON.stringify(liveSteps) !== JSON.stringify(snapshot.steps) ||
      snapshot.steps.some(
        (step) =>
          !isRestStep(step) &&
          (liveExercises.filter((item) => item.id === step.exerciseId).length !==
            snapshot.exercises.filter((item) => item.id === step.exerciseId).length ||
            evidenceStamp(exercises.get(step.exerciseId)) !==
              evidenceStamp(liveExercises.find((item) => item.id === step.exerciseId))),
      ),
    [liveTitle, liveTarget, liveSteps, snapshot, exercises, liveExercises],
  );
  const rehearsal = useSequenceRehearsal({
    totalSec: model.totals.totalSec,
    canRun: canRehearseInHost,
    enabled: model.gate.canRehearse && !snapshotChanged && !segmentRehearsalOpen,
  });
  const position = seekSequenceSimulation(model, rehearsal.elapsedSec);
  const classSections = useMemo(
    () => buildConnectedClassSections(snapshot.steps, model),
    [snapshot.steps, model],
  );
  const index = manualSelection ?? position.stepIndex ?? Math.max(0, snapshot.steps.length - 1);
  const selected = snapshot.steps[index];
  const selectedSummary = model.steps[index];
  const selectedSegments = model.segments.filter((segment) => segment.stepIndex === index);
  const focusHeading = (target: 'selected' | 'order') => {
    // Only explicit navigation moves focus. Waiting for the selected item to render
    // also prevents focusing content that is about to be replaced.
    requestAnimationFrame(() => {
      const heading = target === 'selected' ? selectedHeadingRef.current : orderHeadingRef.current;
      if (!dialogRef.current?.open || !heading?.isConnected) return;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    });
  };
  const selectStep = (next: number) => {
    setSegmentRehearsalOpen(false);
    setManualSelection(next);
    rehearsal.seek(model.steps[next]?.startSec ?? 0);
    focusHeading('selected');
  };
  const selectTime = (time: number) => {
    setSegmentRehearsalOpen(false);
    setManualSelection(null);
    rehearsal.seek(time);
  };
  const exercise = selected ? exercises.get(selected.exerciseId) : undefined;
  const selectedRest = selected ? isRestStep(selected) : false;
  const currentExercise = exercise
    ? liveExercises.find((item) => item.id === exercise.id)
    : undefined;
  const approved =
    !!exercise &&
    isExerciseAutoEligible(exercise) &&
    !!currentExercise &&
    isExerciseAutoEligible(currentExercise) &&
    evidenceStamp(exercise) === evidenceStamp(currentExercise);

  const closeOnce = () => {
    if (closing.current) return;
    closing.current = true;
    setSegmentRehearsalOpen(false);
    rehearsal.pause();
    if (opener.current?.isConnected) opener.current.focus();
    onClose();
  };
  const close = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    closeOnce();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    closing.current = false;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      closing.current = true;
      if (dialog?.open) dialog.close();
      if (opener.current?.isConnected) opener.current.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="atelier-modal-dialog sequence-plan-preview vnext-sequence-preview"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      style={{ maxWidth: '960px' }}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={(event) => {
        // A queued close from an effect replay must not dismiss a reopened native dialog.
        if (event.currentTarget.open) return;
        closeOnce();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        if ('closedBy' in HTMLDialogElement.prototype) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const within =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        if (!within) close();
      }}
    >
      <div className="atelier-modal-shell">
        <header className="atelier-modal-header">
          <div>
            <h2 id={titleId} className="atelier-modal-title">
              전체 수업 계획 미리보기
            </h2>
            <p className="atelier-modal-subtitle">{snapshot.title || '현재 수업안'}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="계획 미리보기 닫기"
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        <div className="atelier-modal-body" style={{ display: 'grid', gap: '16px' }}>
          <p id={descriptionId} className="muted">
            <strong>계획 미리보기 · 모션 시범 미완료</strong>
            <br />
            열었을 때의 수업안과 근거 상태를 살펴봅니다. 시간표 리허설은 수업 준비용이며 실제 수업
            기록을 만들지 않습니다.
          </p>
          <dl
            className="sequence-preview-totals panel"
            aria-label="미리보기 시간 구성"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              margin: 0,
            }}
          >
            <div>
              <dt>전체</dt>
              <dd style={{ margin: 0 }}>{formatSecondsToMMSS(durations.totalSec)}</dd>
            </div>
            <div>
              <dt>동작·설명·전환</dt>
              <dd style={{ margin: 0 }}>{formatSecondsToMMSS(durations.exerciseSec)}</dd>
            </div>
            <div>
              <dt>휴식</dt>
              <dd style={{ margin: 0 }}>{formatSecondsToMMSS(durations.restSec)}</dd>
            </div>
          </dl>
          <ClassPlanSummary {...snapshot} />
          <details
            className="class-plan-summary class-cue-sheet-summary"
            open={showCueSheet}
            onToggle={(event) => setShowCueSheet(event.currentTarget.open)}
          >
            <summary>수업 진행 큐시트 · 인쇄 보기</summary>
            {showCueSheet && (
              <ClassCueSheetPreview
                sourceInput={snapshot}
                initialStepIndex={index}
              />
            )}
          </details>
          {selected && (
            <nav className="simulation-item-navigation" aria-label="미리보기 항목 이동">
              <p>
                <span>
                  {String(index + 1).padStart(2, '0')} / {snapshot.steps.length}
                </span>
                <strong>{selectedRest ? '휴식' : exercise?.nameKo || '동작 정보 없음'}</strong>
              </p>
              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={index === 0}
                  onClick={() => selectStep(index - 1)}
                >
                  <ChevronLeft size={16} /> 이전 항목
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={index === snapshot.steps.length - 1}
                  onClick={() => selectStep(index + 1)}
                >
                  다음 항목 <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="btn-secondary simulation-order-shortcut"
                  onClick={() => focusHeading('order')}
                >
                  <ListOrdered size={16} /> 전체 순서에서 고르기
                </button>
              </div>
            </nav>
          )}
          <div
            className="connected-preview-views"
            role="group"
            aria-label="수업 미리보기 표시 방식"
          >
            {(
              [
                { value: 'timeline', label: '시간표' },
                { value: 'connected', label: '동작 흐름' },
              ] as const
            ).map((view) => (
              <button
                key={view.value}
                type="button"
                className="btn-secondary"
                aria-label={`${view.label} 보기`}
                aria-pressed={viewMode === view.value}
                onClick={() => {
                  if (viewMode === view.value) return;
                  rehearsal.pause();
                  setSegmentRehearsalOpen(false);
                  setViewMode(view.value);
                }}
              >
                {view.label}
              </button>
            ))}
          </div>
          <dl className="connected-class-sections" aria-label="수업 역할별 계획 시간">
            {classSections.map((section) => (
              <div key={section.role}>
                <dt>{section.label}</dt>
                <dd>{segmentDuration(section.durationSec)}</dd>
              </div>
            ))}
          </dl>
          {viewMode === 'connected' && (
            <p className="muted">
              수업 역할별 시간에는 설명·수행·전환·휴식을 한 번씩 포함합니다. 수업의 준비·본·마무리
              운동과 도해 안의 세팅·수행·종료 단계는 별개입니다.
            </p>
          )}
          <section className="simulation-controls" aria-label="수업 시간표 리허설">
            <div className="simulation-heading">
              <h3>시간표 리허설</h3>
              <span>
                {viewMode === 'connected'
                  ? '저장한 연결만 표시 · 도해 전문가 미검토'
                  : '모션 자동 재생 없음'}
              </span>
            </div>
            <div className="simulation-clock" aria-label="시간표 경과와 전체 시간">
              <strong>{formatSecondsToMMSS(rehearsal.elapsedSec)}</strong>
              <span>/ {formatSecondsToMMSS(model.totals.totalSec)}</span>
              <span>
                {position.status === 'complete'
                  ? '계획 끝'
                  : rehearsal.playing
                    ? '리허설 진행 중'
                    : '일시정지'}
              </span>
            </div>
            {selected && (
              <div className="simulation-active-summary" aria-label="리허설 현재 항목">
                <span>
                  {index + 1} / {snapshot.steps.length} ·{' '}
                  {position.status === 'complete'
                    ? '계획 끝'
                    : position.segment?.stepIndex === index
                      ? position.segment.label
                      : '수동 항목 확인'}
                </span>
                <strong>{selectedRest ? '휴식' : exercise?.nameKo || '동작 정보 없음'}</strong>
              </div>
            )}
            <div
              className="simulation-partition"
              role="img"
              aria-label={`수행 ${segmentDuration(model.totals.movementSec)}, 티칭 ${segmentDuration(model.totals.teachingSec)}, 전환 ${segmentDuration(model.totals.transitionSec)}, 휴식 ${segmentDuration(model.totals.restSec)}, 확인 필요 ${segmentDuration(model.totals.unavailableSec)}`}
            >
              {(['movement', 'teaching', 'transition', 'rest', 'unavailable'] as const).map(
                (kind) => (
                  <span
                    key={kind}
                    className={`is-${kind}`}
                    style={{
                      width: `${(model.totals[`${kind}Sec`] / Math.max(model.totals.totalSec, 1)) * 100}%`,
                    }}
                  />
                ),
              )}
            </div>
            <div hidden={segmentRehearsalOpen}>
              <label className="simulation-progress">
                <span>전체 시간 위치 · 탐색하면 일시정지</span>
                <input
                  type="range"
                  aria-label="수업 시간표 위치"
                  min="0"
                  max={Math.max(model.totals.totalSec, 1)}
                  step="0.5"
                  value={rehearsal.elapsedSec}
                  disabled={!model.totals.totalSec}
                  aria-valuetext={`${formatSecondsToMMSS(rehearsal.elapsedSec)} / ${formatSecondsToMMSS(model.totals.totalSec)}`}
                  onChange={(event) => selectTime(Number(event.currentTarget.value))}
                />
              </label>
              <div className="simulation-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!rehearsal.canPlay}
                  aria-label={rehearsal.playing ? '시간표 리허설 일시정지' : '시간표 리허설 시작'}
                  onClick={() => {
                    if (rehearsal.playing) rehearsal.pause();
                    else {
                      setManualSelection(null);
                      rehearsal.start();
                    }
                  }}
                >
                  {rehearsal.playing ? <Pause size={17} /> : <Play size={17} />}
                  {rehearsal.playing ? '일시정지' : '리허설 시작'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label="시간표 처음으로"
                  onClick={() => {
                    setManualSelection(0);
                    rehearsal.reset();
                  }}
                >
                  <RotateCcw size={16} />
                  처음으로
                </button>
                <label>
                  <span>시간표 리허설 속도</span>
                  <select
                    aria-label="시간표 리허설 속도"
                    value={rehearsal.speed}
                    onChange={(event) => rehearsal.setSpeed(Number(event.currentTarget.value))}
                  >
                    {[0.5, 1, 2, 4].map((speed) => (
                      <option key={speed} value={speed}>
                        {speed}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted">
                속도는 시간표 확인용이며 동작 수행 속도가 아닙니다. 앱을 배경으로 보내거나
                위치·속도를 바꾸면 멈춥니다.
              </p>
            </div>
            {segmentRehearsalOpen && (
              <p className="muted">전체 시간표 일시정지 · 아래에서 선택 구간을 연습합니다.</p>
            )}
            {rehearsal.reducedMotion && (
              <p className="simulation-review-notice">
                동작 줄이기 설정에 따라 수동 시간표 탐색을 사용합니다.
              </p>
            )}
            {snapshotChanged && (
              <p className="simulation-review-notice">
                이 화면을 연 뒤 원본 계획 또는 검토 정보가 바뀌었습니다. 시간표 리허설을 멈췄습니다.
                닫고 다시 열어 현재 자료를 확인해 주세요.
              </p>
            )}
            {model.deltaSec !== null && model.deltaSec !== 0 && (
              <p className="simulation-review-notice">
                목표보다 {formatSecondsToMMSS(Math.abs(model.deltaSec))}{' '}
                {model.deltaSec > 0 ? '길어요' : '짧아요'}. 현재 계획 시간으로 미리보기·수업 진행이
                가능합니다.
              </p>
            )}
            <details className="simulation-readiness">
              <summary>
                {model.gate.canRehearse && !snapshotChanged
                  ? '시간표 리허설 가능 · 계획 시간 기준'
                  : '리허설 제한 · 수동 탐색 가능'}
              </summary>
              <p>
                목표 {snapshot.targetMinutes}분. 개인 검토 기록은 자격 인증이나 동작 안전성 검증이
                아닙니다. 정확한 모션 제작·검수 상태는 항목별로 따로 확인합니다. 기본은 일시정지이며
                횟수·세트로 시간을 곱하지 않습니다.
              </p>
              {model.gate.reasons.length > 0 && (
                <ul>
                  {model.gate.reasons.map((reason) => (
                    <li key={reason.code}>
                      {reason.message}
                      {reason.stepIndices.length > 0
                        ? ` (${reason.stepIndices.map((i) => i + 1).join(', ')}번)`
                        : ''}
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <dl className="simulation-durations" aria-label="세부 시간 예산">
              {[
                { label: '수행', value: model.totals.movementSec },
                { label: '티칭', value: model.totals.teachingSec },
                { label: '전환', value: model.totals.transitionSec },
                { label: '휴식', value: model.totals.restSec },
                ...(model.totals.unavailableSec > 0
                  ? [{ label: '확인 필요', value: model.totals.unavailableSec }]
                  : []),
              ].map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{segmentDuration(item.value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          {selected ? (
            <>
              <section className="panel sequence-preview-current" aria-label="선택한 계획 항목">
                <p className="eyebrow" role="status" aria-live="polite">
                  현재 항목 {index + 1} / {snapshot.steps.length} ·{' '}
                  {segmentRehearsalOpen
                    ? '선택 구간 연습'
                    : rehearsal.playing
                      ? '시간표 리허설'
                      : '수동 확인'}
                </p>
                <h3
                  ref={selectedHeadingRef}
                  tabIndex={-1}
                  className="simulation-navigation-heading"
                >
                  {selectedRest ? '중간 휴식' : exercise?.nameKo || '동작 정보 없음'}
                </h3>
                {viewMode === 'connected' && (
                  <p className="connected-study-section">
                    수업 역할 ·{' '}
                    {
                      classSections.find(
                        (section) =>
                          section.role === getSequenceStepClassSection(selected, snapshot.steps),
                      )?.label
                    }
                  </p>
                )}
                {selectedSummary && (
                  <p className="simulation-step-offset">
                    수업 {segmentDuration(selectedSummary.startSec)} →{' '}
                    {segmentDuration(selectedSummary.endSec)}
                  </p>
                )}
                {!segmentRehearsalOpen && position.segment && position.stepIndex === index && (
                  <p className="simulation-current-phase" aria-label="현재 시간표 구간">
                    {position.segment.label} · 남은 구간{' '}
                    {segmentDuration(position.remainingInSegmentSec)}
                  </p>
                )}
                <button
                  ref={segmentEntryRef}
                  type="button"
                  className="btn-secondary segment-rehearsal-entry"
                  aria-expanded={segmentRehearsalOpen}
                  disabled={!selectedSummary || selectedSummary.durationSec <= 0}
                  onClick={() => {
                    rehearsal.pause();
                    setManualSelection(index);
                    setSegmentRehearsalOpen((open) => !open);
                  }}
                >
                  선택한 항목 반복 연습
                </button>
                {segmentRehearsalOpen && selectedSummary && (
                  <SequenceSegmentRehearsal
                    key={index}
                    step={selectedSummary}
                    segments={selectedSegments}
                    fullPlanCanRehearse={model.gate.canRehearse}
                    sourceUnchanged={!snapshotChanged}
                    renderProjection={
                      viewMode === 'connected'
                        ? (cursor) =>
                            !cursor || cursor.complete ? (
                              <p
                                className="segment-rehearsal-notice"
                                aria-label="선택 구간 연결 도해 상태"
                              >
                                {cursor
                                  ? '선택 구간 연습 끝'
                                  : '선택 구간의 시간 정보를 확인해 주세요.'}
                              </p>
                            ) : (
                              <ConnectedMotionStudy
                                model={model}
                                position={seekSequenceSimulation(model, cursor.classTimeSec)}
                                steps={snapshot.steps}
                                exercises={snapshot.exercises}
                                selectedIndex={index}
                                playing={cursor.playing}
                                reducedMotion={cursor.reducedMotion}
                                active={!snapshotChanged}
                              />
                            )
                        : undefined
                    }
                    onExit={() => {
                      rehearsal.pause();
                      setSegmentRehearsalOpen(false);
                      segmentEntryRef.current?.focus();
                    }}
                  />
                )}
                {!segmentRehearsalOpen && selectedSegments.length > 0 && (
                  <div className="simulation-phase-list" aria-label="선택 항목 시간 구간">
                    {selectedSegments.map((segment) => (
                      <button
                        type="button"
                        key={segment.id}
                        className="btn-secondary"
                        aria-current={position.segment?.id === segment.id ? 'step' : undefined}
                        aria-label={`${index + 1}번 항목 ${segment.label} 구간 보기`}
                        onClick={() => selectTime(segment.startSec)}
                      >
                        <span>{segment.label}</span>
                        <strong>{segmentDuration(segment.durationSec)}</strong>
                      </button>
                    ))}
                  </div>
                )}
                {viewMode === 'connected' && !segmentRehearsalOpen && (
                  <ConnectedMotionStudy
                    model={model}
                    position={position}
                    steps={snapshot.steps}
                    exercises={snapshot.exercises}
                    selectedIndex={index}
                    playing={rehearsal.playing}
                    reducedMotion={rehearsal.reducedMotion}
                    active={!snapshotChanged}
                  />
                )}
                <p>
                  <Clock3 size={15} /> 계획 {formatSecondsToMMSS(getStepTiming(selected).totalSec)}
                </p>
                {selectedRest ? (
                  <p className="muted">
                    <Coffee size={16} /> 계획한 휴식 항목입니다.
                  </p>
                ) : (
                  <>
                    <p>{planningRequirements(exercise)}</p>
                    <p>{practiceLabel(selected, exercise)}</p>
                    {viewMode === 'timeline' && (
                      <>
                        <MotionReferencePlayer
                          key={selected.stepId}
                          exerciseId={selected.exerciseId}
                          exerciseName={exercise?.nameKo || '동작 정보 없음'}
                          active={!rehearsal.playing && !segmentRehearsalOpen}
                        />
                        <p className="muted">
                          도식은 시간표와 별도로 재생하며 실제 수행 시간·횟수를 뜻하지 않습니다.
                        </p>
                      </>
                    )}
                    {exercise && <ExerciseEvidencePanel exercise={exercise} step={selected} />}
                    {approved ? (
                      <section aria-label="내 강사 검토 티칭 메모">
                        <h4>내 강사 검토 메모 · 자격 인증 미확인</h4>
                        <ul>
                          {exercise?.cues.map((cue, cueIndex) => (
                            <li key={cueIndex}>{cue}</li>
                          ))}
                        </ul>
                        {selected.instructorNote && !snapshotChanged && (
                          <p>{selected.instructorNote}</p>
                        )}
                      </section>
                    ) : (
                      <p className="muted">전체 검토 전 초안 · 티칭 메모는 표시하지 않습니다.</p>
                    )}
                  </>
                )}
              </section>
              <section aria-label="전체 수업 순서">
                <h3 ref={orderHeadingRef} tabIndex={-1} className="simulation-navigation-heading">
                  <ListOrdered size={17} /> 전체 순서
                </h3>
                <ol className="simulation-order-list">
                  {snapshot.steps.map((step, stepIndex) => {
                    const rest = isRestStep(step);
                    const item = exercises.get(step.exerciseId);
                    return (
                      <li key={step.stepId}>
                        <button
                          type="button"
                          className="btn-secondary sequence-preview-row simulation-order-row"
                          aria-current={stepIndex === index ? 'step' : undefined}
                          aria-label={`${stepIndex + 1}번 ${rest ? '휴식' : item?.nameKo || '동작 정보 없음'} 계획 보기`}
                          onClick={() => selectStep(stepIndex)}
                          style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: '28px minmax(0, 1fr) auto',
                            gap: '8px',
                            textAlign: 'left',
                          }}
                        >
                          <span>{String(stepIndex + 1).padStart(2, '0')}</span>
                          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                            <strong style={{ display: 'block' }}>
                              {rest ? '휴식' : item?.nameKo || '동작 정보 없음'}
                            </strong>
                            {viewMode === 'connected' && (
                              <span style={{ display: 'block' }}>
                                수업 역할 ·{' '}
                                {
                                  classSections.find(
                                    (section) =>
                                      section.role ===
                                      getSequenceStepClassSection(step, snapshot.steps),
                                  )?.label
                                }
                              </span>
                            )}
                            {!rest && (
                              <>
                                <span style={{ display: 'block' }}>
                                  {planningRequirements(item)}
                                </span>
                                <span style={{ display: 'block' }}>
                                  {practiceLabel(step, item)}
                                </span>
                              </>
                            )}
                          </span>
                          <span>
                            {formatSecondsToMMSS(getStepTiming(step).totalSec)}
                            <small className="simulation-step-offset">
                              {segmentDuration(model.steps[stepIndex]?.startSec ?? 0)}
                              부터
                            </small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </>
          ) : (
            <section className="panel" aria-label="빈 수업 계획">
              <h3>미리볼 수업 항목이 없어요</h3>
              <p className="muted">수업안에 동작이나 휴식을 추가한 뒤 다시 열어 주세요.</p>
            </section>
          )}
        </div>
        <footer className="sequence-preview-continuation" aria-label="수업안 확인 후 다음 단계">
          {onSave || onStart ? (
            <>
              <p className="sequence-preview-readiness" role="status">
                {snapshotChanged
                  ? '수업안이 바뀌었어요. 편집 화면으로 돌아가 다시 확인해 주세요.'
                  : startReadiness}
              </p>
              {saveRequested && (persistenceError || saveFeedback) && (
                <p
                  role={persistenceError ? 'alert' : 'status'}
                  className="sequence-preview-save-feedback"
                >
                  {persistenceError || saveFeedback}
                </p>
              )}
              <div className="sequence-preview-actions">
                <button type="button" className="btn-secondary" onClick={close}>
                  <ArrowLeft size={17} /> 편집으로 돌아가기
                </button>
                {onSave && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={snapshotChanged || !snapshot.steps.length}
                    onClick={() => {
                      rehearsal.pause();
                      setSaveRequested(true);
                      onSave();
                    }}
                  >
                    <BookmarkPlus size={17} /> 사본 저장
                  </button>
                )}
                {onStart && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!canStartClass || snapshotChanged}
                    onClick={() => {
                      rehearsal.pause();
                      onStart();
                    }}
                  >
                    <Play size={17} /> 수업 시작
                  </button>
                )}
              </div>
            </>
          ) : (
            <button type="button" className="btn-secondary" onClick={close}>
              미리보기 닫기
            </button>
          )}
        </footer>
      </div>
    </dialog>
  );
}
