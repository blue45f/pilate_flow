import React, { useState } from 'react';
import { Check, Clock3, Plus } from 'lucide-react';
import { LogClassHistorySchema } from '../schemas/pilatesSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { formatSecondsToMMSS, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/teaching.css';

export interface TeachingLogContext {
  actualDurationSec?: number;
  actualRestDurationSec?: number;
  stepsSnapshot?: SequenceStep[];
  sequenceTitle?: string;
  taughtStepIds?: string[];
}

interface LogSessionModalProps {
  sequenceId: string | null;
  onClose: () => void;
  context?: TeachingLogContext;
}

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const LogSessionModal: React.FC<LogSessionModalProps> = (props) =>
  props.sequenceId ? (
    <SessionLogForm
      key={props.sequenceId}
      sequenceId={props.sequenceId}
      onClose={props.onClose}
      context={props.context}
    />
  ) : null;

const SessionLogForm: React.FC<
  Omit<LogSessionModalProps, 'sequenceId'> & { sequenceId: string }
> = ({ sequenceId, onClose, context }) => {
  const {
    savedSequences,
    classGroups,
    activeTitle,
    activeSequenceId,
    activeSteps,
    activeTargetGroupId,
    exercises,
    logClassSession,
    addClassGroup,
    setActiveTab,
  } = usePilatesStore();
  const saved = savedSequences.find((sequence) => sequence.id === sequenceId);
  // Capture the reviewed plan once; edits elsewhere cannot change this record.
  const [snapshot] = useState(() =>
    (
      context?.stepsSnapshot ??
      (sequenceId === activeSequenceId ? activeSteps : saved?.steps) ??
      []
    ).map((step) => ({ ...step })),
  );
  const [selectedSteps, setSelectedSteps] = useState(
    () => new Set(context?.taughtStepIds ?? snapshot.map((step) => step.stepId)),
  );
  const [title] = useState(
    () =>
      context?.sequenceTitle ??
      (sequenceId === activeSequenceId ? activeTitle : saved?.title) ??
      activeTitle,
  );
  const [groupId, setGroupId] = useState(() =>
    classGroups.some((group) => group.id === activeTargetGroupId)
      ? activeTargetGroupId
      : (classGroups[0]?.id ?? ''),
  );
  const [taughtDate, setTaughtDate] = useState(localDate);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [intensity, setIntensity] = useState<'relaxed' | 'moderate' | 'intense'>('moderate');
  const [reflection, setReflection] = useState('');
  const [minutes, setMinutes] = useState(
    context?.actualDurationSec === undefined
      ? ''
      : String(Math.floor(context.actualDurationSec / 60)),
  );
  const [seconds, setSeconds] = useState(
    context?.actualDurationSec === undefined
      ? ''
      : String(Math.round(context.actualDurationSec % 60)),
  );
  const [error, setError] = useState('');
  const [showGroup, setShowGroup] = useState(classGroups.length === 0);
  const [newGroupName, setNewGroupName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const planned = snapshot.reduce((sum, step) => sum + step.durationMin, 0);
  const plannedTiming = getSequenceDurations(snapshot);
  const exerciseCount = snapshot.filter((step) => !isRestStep(step)).length;
  const selectedExerciseCount = snapshot.filter(
    (step) => selectedSteps.has(step.stepId) && !isRestStep(step),
  ).length;

  const createGroup = () => {
    if (!newGroupName.trim()) {
      setError('수업 그룹 별칭을 입력해 주세요.');
      return;
    }
    addClassGroup({
      name: newGroupName.trim(),
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '',
      notes: '',
    });
    const added = usePilatesStore.getState().classGroups.at(-1);
    if (added) setGroupId(added.id);
    setNewGroupName('');
    setShowGroup(false);
    setError('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitted) return;
    setError('');
    const date = new Date(`${taughtDate}T12:00:00`);
    if (!taughtDate || Number.isNaN(date.getTime()) || taughtDate > localDate()) {
      setError('오늘 또는 이전 수업 일자를 선택해 주세요.');
      return;
    }
    let actualDurationSec: number | undefined;
    if (minutes !== '' || seconds !== '') {
      const mins = Number(minutes || 0);
      const secs = Number(seconds || 0);
      if (
        !Number.isInteger(mins) ||
        mins < 0 ||
        mins > 1440 ||
        !Number.isInteger(secs) ||
        secs < 0 ||
        secs > 59
      ) {
        setError('진행 시간은 0~1440분, 0~59초로 입력해 주세요.');
        return;
      }
      actualDurationSec = mins * 60 + secs;
    }
    if (
      actualDurationSec !== undefined &&
      (context?.actualRestDurationSec ?? 0) > actualDurationSec
    ) {
      setError('전체 진행 시간은 타이머에 기록된 휴식 시간보다 짧을 수 없습니다.');
      return;
    }
    const taughtSteps = snapshot.filter((step) => selectedSteps.has(step.stepId));
    if (!taughtSteps.some((step) => !isRestStep(step))) {
      setError('실제로 진행한 동작을 하나 이상 선택해 주세요.');
      return;
    }
    const parsed = LogClassHistorySchema.safeParse({
      sequenceId,
      groupId,
      taughtAt: date.toISOString(),
      rating,
      intensity,
      instructorReflection: reflection.trim() || '별도 메모 없음',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }
    const payload = {
      ...parsed.data,
      actualDurationSec,
      actualRestDurationSec: context?.actualRestDurationSec,
      stepsSnapshot: taughtSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
      sequenceTitle: title,
    };
    const previousLogIds = new Set(usePilatesStore.getState().historyLogs.map((log) => log.id));
    setSubmitted(true);
    try {
      logClassSession(payload);
    } catch {
      setSubmitted(false);
      setError('수업 기록을 저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    const after = usePilatesStore.getState();
    const matchingLogs = after.historyLogs.filter(
      (log) =>
        !previousLogIds.has(log.id) &&
        log.sequenceId === payload.sequenceId &&
        log.groupId === payload.groupId &&
        log.taughtAt === payload.taughtAt &&
        log.sequenceTitle === payload.sequenceTitle &&
        log.rating === payload.rating &&
        log.intensity === payload.intensity &&
        log.instructorReflection === payload.instructorReflection &&
        log.actualDurationSec === payload.actualDurationSec &&
        log.actualRestDurationSec === payload.actualRestDurationSec &&
        JSON.stringify(log.stepsSnapshot) === JSON.stringify(payload.stepsSnapshot),
    );
    const idsAreUnique =
      new Set(after.historyLogs.map((log) => log.id)).size === after.historyLogs.length;
    if (matchingLogs.length !== 1 || !idsAreUnique) {
      setSubmitted(false);
      setError(
        after.generationError ??
          '수업 기록 저장을 확인하지 못했습니다. 기록을 확인하거나 다시 시도해 주세요.',
      );
      return;
    }
    setActiveTab('history');
    onClose();
  };

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      title="수업 기록 남기기"
      subtitle={title}
      maxWidth="640px"
    >
      <form className="teaching-log-form" onSubmit={submit}>
        <div className="teaching-log-summary">
          <Clock3 size={20} />
          <div>
            <strong>
              계획 {Number(planned.toFixed(2))}분 · {exerciseCount}개 동작
            </strong>
            <p className="muted">계획 시간과 실제 진행 시간은 별도로 보관됩니다.</p>
            {plannedTiming.restSec > 0 && (
              <p className="muted">
                운동 {formatSecondsToMMSS(plannedTiming.exerciseSec)} · 휴식{' '}
                {formatSecondsToMMSS(plannedTiming.restSec)} · 휴식은 전체 시간에 포함
              </p>
            )}
          </div>
        </div>
        <div className="teaching-form-grid teaching-form-two">
          <label className="form-field">
            <span>수업 그룹 *</span>
            <select required value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="" disabled>
                그룹을 선택해 주세요
              </option>
              {classGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>수업 일자 *</span>
            <input
              type="date"
              required
              max={localDate()}
              value={taughtDate}
              onChange={(event) => setTaughtDate(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="teaching-log-link"
          aria-expanded={showGroup}
          onClick={() => setShowGroup((value) => !value)}
        >
          <Plus size={15} />
          수업 그룹 추가
        </button>
        {showGroup && (
          <div className="teaching-inline-group">
            <label className="form-field">
              <span>그룹 별칭 · 실명은 필요 없어요</span>
              <input
                maxLength={60}
                placeholder="예: 저녁 A반, 개인 01"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
              />
            </label>
            <button type="button" className="btn-secondary" onClick={createGroup}>
              추가
            </button>
          </div>
        )}
        <fieldset className="teaching-duration-field">
          <legend>실제 진행 시간 (선택)</legend>
          <div>
            <label className="form-field">
              <span>분</span>
              <input
                inputMode="numeric"
                type="number"
                min="0"
                max="1440"
                step="1"
                placeholder="미기록"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>초</span>
              <input
                inputMode="numeric"
                type="number"
                min="0"
                max="59"
                step="1"
                placeholder="00"
                value={seconds}
                onChange={(event) => setSeconds(event.target.value)}
              />
            </label>
          </div>
          <p className="muted">
            {context?.actualDurationSec === undefined
              ? '실제로 진행한 시간을 알고 있다면 입력해 주세요. 비워 두면 미기록으로 남습니다.'
              : '일시정지를 제외한 타이머 시간입니다. 실제 수업에 맞게 수정해 주세요.'}
          </p>
          {context?.actualRestDurationSec !== undefined && (
            <p className="muted">
              타이머에서 진행된 휴식 {formatSecondsToMMSS(context.actualRestDurationSec)} · 일시정지
              제외
            </p>
          )}
        </fieldset>
        <details
          className="teaching-log-steps"
          open={context?.taughtStepIds !== undefined ? true : undefined}
        >
          <summary>
            실제로 진행한 동작 확인 · {selectedExerciseCount} / {exerciseCount}개
          </summary>
          <p className="muted">
            {context?.taughtStepIds !== undefined
              ? '진행한 동작만 선택해 주세요. 타이머를 사용한 동작을 먼저 선택해 두었습니다.'
              : '계획에 있는 동작이 선택되어 있어요. 실제로 진행한 동작만 남겨 주세요.'}
          </p>
          <div>
            {snapshot.map((step) => (
              <label key={step.stepId}>
                <input
                  type="checkbox"
                  checked={selectedSteps.has(step.stepId)}
                  onChange={(event) =>
                    setSelectedSteps((value) => {
                      const next = new Set(value);
                      if (event.target.checked) next.add(step.stepId);
                      else next.delete(step.stepId);
                      return next;
                    })
                  }
                />
                <span>
                  {isRestStep(step)
                    ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}`
                    : (exercises.find((exercise) => exercise.id === step.exerciseId)?.nameKo ??
                      '삭제된 동작')}
                </span>
              </label>
            ))}
          </div>
        </details>
        <div className="teaching-form-grid teaching-form-two">
          <label className="form-field">
            <span>강사가 느낀 강도</span>
            <select
              value={intensity}
              onChange={(event) => setIntensity(event.target.value as typeof intensity)}
            >
              <option value="relaxed">가볍게</option>
              <option value="moderate">보통</option>
              <option value="intense">높게</option>
            </select>
          </label>
          <label className="form-field">
            <span>강사의 수업 평가</span>
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value) as typeof rating)}
            >
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="form-field">
          <span>다음 수업을 위한 메모 (선택)</span>
          <textarea
            aria-label="다음 수업을 위한 메모 (선택)"
            rows={3}
            maxLength={3000}
            placeholder="잘 이어진 전환, 다음에 바꿔볼 동작 등을 남겨 주세요."
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
          />
          <small className="muted">학생 실명이나 건강 정보는 적지 않아도 돼요.</small>
        </label>
        {error && (
          <p role="alert" className="teaching-error">
            {error}
          </p>
        )}
        <div className="teaching-form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitted || classGroups.length === 0}
          >
            <Check size={17} />
            수업 기록 저장
          </button>
        </div>
        <p className="teaching-log-footnote muted">
          이 브라우저에 저장됩니다. 기록이 실제 수업과 맞는지 확인해 주세요.
        </p>
      </form>
    </LightDismissDialog>
  );
};
