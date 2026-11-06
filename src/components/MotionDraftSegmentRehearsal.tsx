import { useId, useRef, useState } from 'react';
import type { MotionDraftDefinition } from '../data/motionDrafts';
import type { AnatomicalSide } from '../models/types';
import { MotionDraftFigure } from './MotionDraftFigure';
import { useMotionStoryboardPlayback } from '../hooks/useMotionStoryboardPlayback';
import type { StoryboardPlaybackSpeed } from '../hooks/useMotionStoryboardPlayback';
import {
  buildRehearsalTimeline,
  resolveRehearsalPosition,
  validateRehearsalPhases,
} from '../utils/motionDraftRehearsal';
import '../styles/motion-draft-segment-rehearsal.css';

export interface MotionDraftSegmentRehearsalProps {
  draft: MotionDraftDefinition;
  active: boolean;
  activeSide: AnatomicalSide;
  mirrored: boolean;
  onExit: () => void;
}

const seconds = (value: number) => `${Number(value.toFixed(2))}초`;

/** Local display rehearsal. The parent must unmount/pause its other clock first. */
export function MotionDraftSegmentRehearsal({
  draft,
  active,
  activeSide,
  mirrored,
  onExit,
}: MotionDraftSegmentRehearsalProps) {
  const id = useId();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [startPhase, setStartPhase] = useState(0);
  const [endPhase, setEndPhase] = useState(4);
  const [cycleSeconds, setCycleSeconds] = useState('8');
  const [repetitions, setRepetitions] = useState('1');
  const phaseValidation = validateRehearsalPhases(draft.phases);
  const phases = phaseValidation.valid ? draft.phases : [];
  const timeline = buildRehearsalTimeline(
    draft.phases,
    startPhase,
    endPhase,
    cycleSeconds.trim() ? Number(cycleSeconds) : Number.NaN,
    Number(repetitions),
  );
  let snapshot: string | null = null;
  try {
    snapshot = JSON.stringify([
      draft,
      activeSide,
      mirrored,
      startPhase,
      endPhase,
      cycleSeconds,
      repetitions,
    ]);
  } catch {
    // An unserializable definition cannot form a stable, reviewable snapshot.
  }
  const valid = timeline.valid && snapshot !== null;
  const { state, controller, reducedMotion } = useMotionStoryboardPlayback({
    totalSeconds: timeline.valid && snapshot !== null ? timeline.totalSeconds : 0,
    snapshotKey: snapshot ?? 'invalid-rehearsal-snapshot',
    active: active && valid,
    sceneRef,
    guardFrameGaps: true,
  });
  const position = timeline.valid ? resolveRehearsalPosition(timeline, state.elapsedSeconds) : null;
  const start = phases[startPhase];
  const end = phases[endPhase];
  const singlePhase = startPhase === endPhase ? start : null;
  const phaseLabel = (index: number) => phases[index]?.labelKo ?? phases[index]?.label ?? '';
  const status = state.playing
    ? '구간 재생 중'
    : position?.atEnd
      ? '선택 구간 끝 · 일시정지'
      : state.pauseReason === 'frame-delay'
        ? '화면 갱신이 지연되어 멈췄습니다. 재생을 눌러 이어 보세요.'
        : '일시정지 · 자동 재생 없음';
  const exit = () => {
    controller.pause();
    onExit();
  };
  const selectStart = (value: number) => {
    controller.reset();
    setStartPhase(value);
    if (value > endPhase) setEndPhase(value);
  };
  const selectEnd = (value: number) => {
    controller.reset();
    setEndPhase(value);
    if (value < startPhase) setStartPhase(value);
  };
  const staticStep = (fraction: number) => {
    if (timeline.valid) controller.seek(timeline.rangeSeconds * fraction);
  };
  const error = !timeline.valid
    ? timeline.error
    : snapshot === null
      ? '제안 정의를 확인할 수 없어 재생을 멈췄습니다.'
      : null;

  return (
    <section className="motion-draft-segment-rehearsal" aria-label="모션 구간 연습" tabIndex={-1}>
      <header className="mdsr-heading">
        <div>
          <p className="mdsr-eyebrow">미검토 도해 · 구간 연습</p>
          <h4>{draft.title}</h4>
        </div>
        <button type="button" className="mdsr-secondary" onClick={exit}>
          개별 동작으로 돌아가기
        </button>
      </header>
      <p className="mdsr-boundary">완성 자산 0건 · 전문가 검토 0건 · 자동 추천 제외</p>
      <div className="mdsr-range" role="group" aria-label="연습할 단계 범위">
        <label htmlFor={`${id}-start`}>
          시작 단계
          <select
            id={`${id}-start`}
            value={startPhase}
            onChange={(event) => selectStart(Number(event.target.value))}
          >
            {phases.map((phase, index) => (
              <option key={`${index}-${phase.id}`} value={index}>
                {index + 1}. {phase.labelKo ?? phase.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-end`}>
          끝 단계
          <select
            id={`${id}-end`}
            value={endPhase}
            onChange={(event) => selectEnd(Number(event.target.value))}
          >
            {phases.map((phase, index) => (
              <option key={`${index}-${phase.id}`} value={index}>
                {index + 1}. {phase.labelKo ?? phase.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mdsr-note">시작과 끝 사이의 단계를 순서대로 포함합니다.</p>
      {error && <p role="alert">{error}</p>}
      <div ref={sceneRef} className="mdsr-scene" role="group" aria-label="선택 구간 도해">
        {valid && position ? (
          <MotionDraftFigure
            draftId={draft.id}
            progress={position.progress}
            activeSide={activeSide}
            mirrored={mirrored}
            label={`${draft.title} · 구간 연습 미검토 도해`}
          />
        ) : (
          <p>단계와 표시 설정을 확인하세요.</p>
        )}
      </div>
      <div className="mdsr-status">
        <p role="status" aria-live="polite">
          {status}
        </p>
        {timeline.valid && position && (
          <p aria-label="구간 표시 위치 정보">
            {position.repetition} / {timeline.repetitions}번째 표시 ·{' '}
            {seconds(state.elapsedSeconds)} / {seconds(timeline.totalSeconds)}
          </p>
        )}
      </div>
      <div className="mdsr-controls" role="group" aria-label="구간 도해 재생 제어">
        <button
          type="button"
          disabled={!active || !valid || reducedMotion || state.playing}
          onClick={controller.play}
        >
          {position?.atEnd ? '구간 다시 재생' : '구간 재생'}
        </button>
        <button
          type="button"
          className="mdsr-secondary"
          disabled={!state.playing}
          onClick={controller.pause}
        >
          일시정지
        </button>
        <button
          type="button"
          className="mdsr-secondary"
          disabled={!valid}
          onClick={controller.reset}
        >
          구간 처음으로
        </button>
      </div>
      <label className="mdsr-seek" htmlFor={`${id}-seek`}>
        구간 표시 위치
        <input
          id={`${id}-seek`}
          type="range"
          min="0"
          max={timeline.valid ? timeline.totalSeconds : 1}
          step="any"
          disabled={!valid}
          value={state.elapsedSeconds}
          aria-valuetext={
            timeline.valid
              ? `${seconds(state.elapsedSeconds)} / ${seconds(timeline.totalSeconds)}`
              : '설정 확인 필요'
          }
          onChange={(event) => controller.seek(event.target.valueAsNumber)}
        />
      </label>
      <div className="mdsr-static" role="group" aria-label="선택 구간 정지 단계">
        <button
          type="button"
          className="mdsr-secondary"
          disabled={!valid}
          onClick={() => staticStep(0)}
        >
          시작
        </button>
        <button
          type="button"
          className="mdsr-secondary"
          disabled={!valid}
          onClick={() => staticStep(0.5)}
        >
          중간
        </button>
        <button
          type="button"
          className="mdsr-secondary"
          disabled={!valid}
          onClick={() => {
            if (timeline.valid) controller.seek(timeline.totalSeconds);
          }}
        >
          끝
        </button>
      </div>
      {singlePhase?.displayBehavior === 'hold' ? (
        <p className="mdsr-notice">정적 유지 구간 · 시간이 지나도 도해 배치를 유지합니다.</p>
      ) : singlePhase?.displayBehavior === 'move' ? (
        <p className="mdsr-note">선택한 단계는 움직임 구간입니다.</p>
      ) : (
        <p className="mdsr-note">
          정지 유지가 포함될 수 있습니다. 실제 도해와 단계 설명을 함께 확인하세요.
        </p>
      )}
      {reducedMotion && (
        <p className="mdsr-notice">
          동작 줄이기 설정 중입니다. 시작·중간·끝 정지 단계와 표시 위치로 살펴보세요.
        </p>
      )}
      {timeline.valid && start && end && (
        <p className="mdsr-note" aria-label="선택 구간 범위">
          {phaseLabel(startPhase)} → {phaseLabel(endPhase)} · 원래 주기의{' '}
          {Number((timeline.rangeFraction * 100).toFixed(2))}% · 한 구간{' '}
          {seconds(timeline.rangeSeconds)}
        </p>
      )}
      <p className="mdsr-note">
        반복 경계에서는 선택한 시작으로 바로 전환하며 연결 동작은 표현하지 않습니다.
      </p>
      <details className="mdsr-settings">
        <summary>시간·반복·속도 설정</summary>
        <p id={`${id}-timing`} className="mdsr-note">
          시간·횟수·속도는 도해 표시용입니다. 권장 운동 속도나 횟수가 아닙니다. 초 설정은 1×
          기준이며 원래 주기의 단계 비율을 유지합니다.
        </p>
        <div className="mdsr-settings-grid">
          <label htmlFor={`${id}-seconds`}>
            전체 한 주기 표시 초 (2–30)
            <input
              id={`${id}-seconds`}
              type="number"
              inputMode="numeric"
              min="2"
              max="30"
              step="1"
              value={cycleSeconds}
              aria-describedby={`${id}-timing`}
              onChange={(event) => {
                controller.reset();
                setCycleSeconds(event.target.value);
              }}
            />
          </label>
          <label htmlFor={`${id}-repetitions`}>
            선택 구간 표시 반복
            <select
              id={`${id}-repetitions`}
              value={repetitions}
              aria-describedby={`${id}-timing`}
              onChange={(event) => {
                controller.reset();
                setRepetitions(event.target.value);
              }}
            >
              <option value="1">1회</option>
              <option value="2">2회</option>
              <option value="3">3회</option>
            </select>
          </label>
          <label htmlFor={`${id}-speed`}>
            구간 표시 속도
            <select
              id={`${id}-speed`}
              value={state.speed}
              aria-describedby={`${id}-timing`}
              onChange={(event) => {
                controller.reset();
                controller.setSpeed(Number(event.target.value) as StoryboardPlaybackSpeed);
              }}
            >
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
            </select>
          </label>
        </div>
        {timeline.valid && (
          <p aria-label="구간 표시 시간">
            선택 구간 {seconds(timeline.rangeSeconds)} × {timeline.repetitions}회 = 전체 표시{' '}
            {seconds(timeline.totalSeconds)}
          </p>
        )}
      </details>
      <details className="mdsr-context">
        <summary>이 제안의 지지·미확인 정보</summary>
        <p>{draft.variant}</p>
        <p>{draft.supportNote}</p>
        {draft.unknown.length > 0 && (
          <ul>
            {draft.unknown.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        <p className="mdsr-note">
          개인 적합성·정확한 동작 매핑·전문가 검토는 별도입니다. 실제 수업·학습 이력에 기록하지
          않습니다.
        </p>
      </details>
    </section>
  );
}
