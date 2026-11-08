import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useSequenceRehearsal } from '../hooks/useSequenceRehearsal';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import type { SimulationSegment, SimulationStep } from '../utils/sequenceSimulation';
import '../styles/sequence-segment-rehearsal.css';

export interface SequenceSegmentCursorProjection {
  /** Absolute seconds in the frozen class plan, wrapped only within this rehearsal's span. */
  readonly classTimeSec: number;
  readonly complete: boolean;
  readonly playing: boolean;
  readonly reducedMotion: boolean;
}

interface SequenceSegmentRehearsalProps {
  step: SimulationStep;
  segments: readonly SimulationSegment[];
  fullPlanCanRehearse: boolean;
  sourceUnchanged: boolean;
  onExit: () => void;
  /** A pure view of this clock. Null means the selected span cannot be projected. */
  renderProjection?: (cursor: SequenceSegmentCursorProjection | null) => ReactNode;
}

const durationLabel = (seconds: number) => {
  const roundedTenths = Math.round(Math.max(0, seconds) * 10) / 10;
  return `${formatSecondsToMMSS(roundedTenths)}${Math.abs((roundedTenths % 1) - 0.5) < 1e-6 ? '.5' : ''}`;
};

/** A bounded planning timeline only. It never changes a lesson, counts, motion or history. */
export function SequenceSegmentRehearsal({
  step,
  segments,
  fullPlanCanRehearse,
  sourceUnchanged,
  onExit,
  renderProjection,
}: SequenceSegmentRehearsalProps) {
  const titleId = useId();
  const noteId = useId();
  const hostRef = useRef<HTMLElement>(null);
  const canRehearseInHost = useCallback(() => {
    const host = hostRef.current;
    const dialog = host?.closest('dialog');
    return host?.isConnected === true && (!dialog || dialog.open);
  }, []);
  const [phaseId, setPhaseId] = useState('whole');
  const [repeatCount, setRepeatCount] = useState<1 | 2 | 3>(1);
  const phases = useMemo(
    () =>
      segments.filter(
        (segment) => segment.stepIndex === step.stepIndex && segment.stepId === step.stepId,
      ),
    [segments, step.stepIndex, step.stepId],
  );
  const phase = phaseId === 'whole' ? undefined : phases.find((item) => item.id === phaseId);
  const startSec = phase?.startSec ?? step.startSec;
  const endSec = phase?.endSec ?? step.endSec;
  const spanSec = Math.max(0, endSec - startSec);
  const totalSec = spanSec * repeatCount;
  const validSpan =
    Number.isFinite(totalSec) &&
    totalSec > 0 &&
    (phaseId === 'whole' || !!phase) &&
    phases.length > 0 &&
    phases[0].startSec === step.startSec &&
    phases[phases.length - 1].endSec === step.endSec &&
    phases.every(
      (item, index) =>
        item.kind !== 'unavailable' &&
        item.durationSec > 0 &&
        item.endSec - item.startSec === item.durationSec &&
        (index === 0 || phases[index - 1].endSec === item.startSec),
    );
  const rehearsal = useSequenceRehearsal({
    totalSec,
    canRun: canRehearseInHost,
    enabled: fullPlanCanRehearse && sourceUnchanged && validSpan,
  });
  const complete = totalSec > 0 && rehearsal.elapsedSec >= totalSec;
  // Check the finite end before wrapping: boundaries belong to the next cycle/phase, [start,end).
  const cycleIndex =
    spanSec > 0 ? Math.min(repeatCount - 1, Math.floor(rehearsal.elapsedSec / spanSec)) : 0;
  const rawElapsedInCycle = Math.max(0, rehearsal.elapsedSec - cycleIndex * spanSec);
  const elapsedInCycle =
    !complete && spanSec > 0 ? Math.min(rawElapsedInCycle, spanSec) : rawElapsedInCycle;
  const rawSourceTime = startSec + elapsedInCycle;
  const sourceTime =
    !complete && rawSourceTime >= endSec && endSec > startSec
      ? endSec - Number.EPSILON * Math.max(1, Math.abs(endSec))
      : rawSourceTime;
  const currentPhase = complete
    ? undefined
    : (phases.find((item) => item.startSec <= sourceTime && sourceTime < item.endSec) ??
      phases[phases.length - 1]);
  const remainingInPhase = currentPhase
    ? Math.max(0, Math.min(endSec, currentPhase.endSec) - sourceTime)
    : 0;

  return (
    <section
      ref={hostRef}
      className="sequence-segment-rehearsal"
      aria-labelledby={titleId}
      aria-describedby={noteId}
    >
      <div className="segment-rehearsal-heading">
        <h4 id={titleId}>선택 구간 반복 연습</h4>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            rehearsal.pause();
            onExit();
          }}
        >
          전체 시간표로 돌아가기
        </button>
      </div>
      <p className="muted" id={noteId}>
        {renderProjection
          ? '시간표 연습용 · 저장한 관련 도해를 이 연습 시간에 연결해 표시합니다. '
          : '시간표 연습용 · 모션 자동 재생 없음. '}
        기본은 항목 전체이며 설명·좌우·전환 등 원래 계획 구간을 보존합니다. 반복은 이 연습에만
        적용하며 실제 수업 시간·횟수·세트와 기록을 바꾸지 않습니다.
      </p>
      <div className="segment-rehearsal-options">
        <label>
          <span>연습 구간</span>
          <select
            aria-label="반복 연습 구간"
            value={phaseId}
            onChange={(event) => {
              const next = event.currentTarget.value;
              rehearsal.reset();
              if (next === 'whole' || phases.some((item) => item.id === next)) setPhaseId(next);
            }}
          >
            <option value="whole">항목 전체 · {durationLabel(step.durationSec)}</option>
            {phases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {durationLabel(item.durationSec)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>연습 반복</span>
          <select
            aria-label="구간 연습 반복 횟수"
            value={repeatCount}
            onChange={(event) => {
              rehearsal.reset();
              const next = Number(event.currentTarget.value);
              if (next === 1 || next === 2 || next === 3) setRepeatCount(next);
            }}
          >
            {[1, 2, 3].map((count) => (
              <option key={count} value={count}>
                {count}회 후 멈춤
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>연습 시간표 속도</span>
          <select
            aria-label="구간 연습 시간표 속도"
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
      <p className="segment-rehearsal-source">
        원래 수업 시간표 {durationLabel(startSec)} → {durationLabel(endSec)} · 한 번의 구간 예산{' '}
        {durationLabel(spanSec)}
      </p>
      <div className="segment-rehearsal-clock" aria-label="구간 연습 경과와 전체 예산">
        <strong>{durationLabel(rehearsal.elapsedSec)}</strong>
        <span>/ {durationLabel(totalSec)}</span>
      </div>
      <p className="segment-rehearsal-status" role="status" aria-live="polite">
        반복 {cycleIndex + 1} / {repeatCount} ·{' '}
        {complete ? '반복 연습 끝' : rehearsal.playing ? '연습 진행 중' : '일시정지'} ·{' '}
        {complete ? '현재 구간 없음' : currentPhase?.label || '구간 정보 확인 필요'}
      </p>
      <p className="segment-rehearsal-budget" aria-label="현재 연습 구간 예산">
        {currentPhase
          ? `현재 구간 예산 ${durationLabel(currentPhase.durationSec)} · 남은 구간 ${durationLabel(remainingInPhase)}`
          : '남은 구간 00:00'}
      </p>
      <label className="segment-rehearsal-progress">
        <span>연습 시간 위치 · 탐색하면 일시정지</span>
        <input
          type="range"
          aria-label="구간 반복 연습 위치"
          min="0"
          max={Math.max(totalSec, 1)}
          step="0.5"
          value={rehearsal.elapsedSec}
          disabled={!totalSec}
          aria-valuetext={`${durationLabel(rehearsal.elapsedSec)} / ${durationLabel(totalSec)}`}
          onChange={(event) => rehearsal.seek(Number(event.currentTarget.value))}
        />
      </label>
      <div className="segment-rehearsal-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!rehearsal.canPlay}
          aria-label={rehearsal.playing ? '구간 반복 연습 일시정지' : '구간 반복 연습 시작'}
          onClick={() => {
            if (rehearsal.playing) rehearsal.pause();
            else rehearsal.start();
          }}
        >
          {rehearsal.playing ? <Pause size={17} /> : <Play size={17} />}
          {rehearsal.playing ? '일시정지' : complete ? '구간 다시 연습' : '구간 연습 시작'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          aria-label="구간 연습 처음으로"
          onClick={rehearsal.reset}
        >
          <RotateCcw size={16} /> 처음으로
        </button>
      </div>
      {renderProjection?.(
        validSpan
          ? {
              classTimeSec: sourceTime,
              complete,
              playing: rehearsal.playing,
              reducedMotion: rehearsal.reducedMotion,
            }
          : null,
      )}
      <p className="muted">
        구간·반복 횟수를 바꾸면 처음으로 돌아가 멈춥니다. 위치·속도를 바꾸면 현재 위치에서 멈춥니다.
        속도는 시간표 확인용이며 동작 수행 속도가 아닙니다. 마지막 반복 끝에서 멈추며 전체 시간표로
        돌아가도 일시정지 상태를 유지합니다.
      </p>
      {(!fullPlanCanRehearse || !sourceUnchanged || !validSpan) && (
        <p className="segment-rehearsal-notice">
          전체 수업의 검토·중복·목표 시간 조건과 원본 상태를 충족해야 자동 연습할 수 있습니다. 수동
          구간 확인은 가능합니다.
        </p>
      )}
      {rehearsal.reducedMotion && (
        <p className="segment-rehearsal-notice">
          동작 줄이기 설정에 따라 수동 구간 탐색을 사용합니다.
        </p>
      )}
    </section>
  );
}
