import React, { useRef, useState } from 'react';
import { Check, Clock3, Plus, ShieldCheck } from 'lucide-react';
import {
  PfButton,
  PfField,
  PfFormError,
  PfInput,
  PfSelect,
  PfTextarea,
} from '../design-system';
import { LogClassHistorySchema } from '../schemas/pilatesSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import {
  getSavedHumanMovementDrafts,
  getSavedReusableBlocks,
} from '../utils/movementIdeaDraft';
import { formatSecondsToMMSS, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import {
  attachProgramSnapshotToHistoryLog,
  buildTeachingProgramSnapshot,
  findDuplicateCompletedHistoryLog,
} from '../utils/teachingHistorySnapshot';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/design-tokens.css';
import '../styles/teaching.css';
import './LogSessionModal.css';

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
    activeSubtitle,
    activeSequenceId,
    activeSteps,
    activeTargetGroupId,
    exercises,
    persistenceError,
    logClassSession,
    addClassGroup,
    setActiveTab,
  } = usePilatesStore();
  const saved = savedSequences.find((sequence) => sequence.id === sequenceId);
  // Capture the reviewed plan and exercise definitions once; edits elsewhere cannot change this record.
  const [snapshot] = useState(() =>
    (
      context?.stepsSnapshot ??
      (sequenceId === activeSequenceId ? activeSteps : saved?.steps) ??
      []
    ).map((step) => structuredClone(step)),
  );
  const [exercisesAtOpen] = useState(() =>
    exercises.map((exercise) => structuredClone(exercise)),
  );
  const [humanDraftsAtOpen] = useState(() =>
    getSavedHumanMovementDrafts().map((draft) => structuredClone(draft)),
  );
  const [reusableBlocksAtOpen] = useState(() =>
    getSavedReusableBlocks().map((block) => structuredClone(block)),
  );
  const [sourceSubtitle] = useState(
    () => (sequenceId === activeSequenceId ? activeSubtitle : saved?.subtitle) ?? '',
  );
  const [sourceKind] = useState<'saved-sequence' | 'active-draft'>(() =>
    saved ? 'saved-sequence' : 'active-draft',
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
  const submittingRef = useRef(false);
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
    if (submitted || submittingRef.current) return;
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
    const beforeState = usePilatesStore.getState();
    const isActiveSeq = sequenceId === beforeState.activeSequenceId;
    const resolvedApparatus = isActiveSeq
      ? beforeState.activeApparatus
      : (saved?.apparatus ?? beforeState.activeApparatus);
    const resolvedLevel = isActiveSeq
      ? beforeState.activeLevel
      : (saved?.level ?? beforeState.activeLevel);
    const resolvedCriteriaSnapshot = isActiveSeq
      ? (beforeState.draftCriteria ?? beforeState.lastCriteria ?? undefined)
      : saved?.criteriaSnapshot;
    const stepsForLog = taughtSteps.map((step, index) => ({
      ...structuredClone(step),
      order: index + 1,
    }));
    const programSnapshot = buildTeachingProgramSnapshot({
      sequenceId,
      sequenceTitle: title,
      sequenceSubtitle: sourceSubtitle,
      sourceKind,
      sourceSequenceVersion: saved?.version,
      sourceSequenceUpdatedAt: saved?.updatedAt,
      sourceProvenance: saved?.sourceProvenance,
      apparatus: resolvedApparatus,
      level: resolvedLevel,
      targetMinutes: resolvedCriteriaSnapshot?.targetMinutes ?? beforeState.activeTargetMinutes,
      taughtAt: date.toISOString(),
      groupId,
      steps: stepsForLog,
      exercises: exercisesAtOpen,
      reusableBlocks: reusableBlocksAtOpen,
      humanDrafts: humanDraftsAtOpen,
      actualDurationSec,
      actualRestDurationSec: context?.actualRestDurationSec,
      criteriaSnapshot: resolvedCriteriaSnapshot ?? undefined,
    });
    // This form captures a calendar date, not an observed start time.
    // Keep the existing ISO/fingerprint contract and annotate only this new snapshot.
    programSnapshot.dateOnly = true;
    programSnapshot.taughtDate = taughtDate;
    const payload = {
      ...parsed.data,
      actualDurationSec,
      actualRestDurationSec: context?.actualRestDurationSec,
      stepsSnapshot: stepsForLog,
      sequenceTitle: title,
      programSnapshot,
    };
    const duplicate = findDuplicateCompletedHistoryLog(beforeState.historyLogs, {
      sequenceId: payload.sequenceId,
      groupId: payload.groupId,
      taughtAt: payload.taughtAt,
      stepsSnapshot: payload.stepsSnapshot,
      actualDurationSec: payload.actualDurationSec,
      actualRestDurationSec: payload.actualRestDurationSec,
    });
    if (
      duplicate &&
      duplicate.rating === payload.rating &&
      duplicate.intensity === payload.intensity &&
      duplicate.instructorReflection === payload.instructorReflection
    ) {
      setError('이미 동일한 수업 완료 이력이 기록되어 있습니다. 중복 완료 기록을 방지했습니다.');
      return;
    }
    const previousLogIds = new Set(beforeState.historyLogs.map((log) => log.id));
    submittingRef.current = true;
    setSubmitted(true);
    try {
      logClassSession(payload);
    } catch {
      submittingRef.current = false;
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
      submittingRef.current = false;
      setSubmitted(false);
      setError(
        after.generationError ??
          '수업 기록 저장을 확인하지 못했습니다. 기록을 확인하거나 다시 시도해 주세요.',
      );
      return;
    }
    const matchedLog = matchingLogs[0] as ClassHistoryLogWithSnapshot;
    if (
      !matchedLog.programSnapshot ||
      (!matchedLog.sequenceSnapshot && programSnapshot.sequenceSnapshot) ||
      (!matchedLog.sourceProvenance && programSnapshot.sourceProvenance)
    ) {
      attachProgramSnapshotToHistoryLog(
        matchedLog.id,
        programSnapshot,
        usePilatesStore.setState,
      );
    }
    setActiveTab('history');
    onClose();
  };

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      variant="sheet"
      title="수업 기록 남기기"
      subtitle={title}
      maxWidth="640px"
      className="class-log-modal"
    >
      <form className="teaching-log-form" onSubmit={submit}>
        <div className="class-log-content">
          <div className="teaching-log-summary">
            <Clock3 size={20} />
            <div>
              <strong>
                계획 {Number(planned.toFixed(2))}분 · {exerciseCount}개 동작
              </strong>
              <p className="muted">계획 시간과 실제 진행 시간은 별도로 보관됩니다.</p>
              <details className="class-log-provenance">
                <summary>완료 이력 보관 방식</summary>
                <div className="teaching-log-badge-row">
                  <span className="teaching-record-kind-badge is-history">
                    <ShieldCheck size={13} /> 진행 완료 이력 스냅샷
                  </span>
                  <span className="teaching-record-source-badge">
                    {sourceKind === 'saved-sequence'
                      ? '원본: 저장한 시퀀스 계획'
                      : '원본: 현재 수업 초안'}
                  </span>
                </div>
                <p className="muted">
                  당시 동작·블록·순서·시간이 스냅샷으로 보존되어 나중에 원본 동작이나 블록을
                  수정해도 이 완료 이력은 바뀌지 않습니다.
                </p>
              </details>
              {plannedTiming.restSec > 0 && (
                <p className="muted">
                  운동 {formatSecondsToMMSS(plannedTiming.exerciseSec)} · 휴식{' '}
                  {formatSecondsToMMSS(plannedTiming.restSec)} · 휴식은 전체 시간에 포함
                </p>
              )}
              {persistenceError && (
                <p className="teaching-storage-warning">브라우저 저장소 경고: {persistenceError}</p>
              )}
            </div>
          </div>
          <div className="teaching-form-grid teaching-form-two">
            <PfField label="수업 그룹 *">
              <PfSelect
                required
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
              >
                <option value="" disabled>
                  그룹을 선택해 주세요
                </option>
                {classGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </PfSelect>
            </PfField>
            <PfField label="수업 일자 *">
              <PfInput
                type="date"
                required
                max={localDate()}
                value={taughtDate}
                onChange={(event) => setTaughtDate(event.target.value)}
              />
            </PfField>
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
              <PfField label="그룹 별칭 · 실명은 필요 없어요">
                <PfInput
                  maxLength={60}
                  placeholder="예: 저녁 A반, 개인 01"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                />
              </PfField>
              <PfButton variant="secondary" onClick={createGroup}>
                추가
              </PfButton>
            </div>
          )}
          <fieldset className="teaching-duration-field">
            <legend>실제 진행 시간 (선택)</legend>
            <div>
              <PfField label="분">
                <PfInput
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  placeholder="미기록"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </PfField>
              <PfField label="초">
                <PfInput
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  placeholder="00"
                  value={seconds}
                  onChange={(event) => setSeconds(event.target.value)}
                />
              </PfField>
            </div>
            <p className="muted">
              {context?.actualDurationSec === undefined
                ? '실제로 진행한 시간을 알고 있다면 입력해 주세요. 비워 두면 미기록으로 남습니다.'
                : '일시정지를 제외한 타이머 시간입니다. 실제 수업에 맞게 수정해 주세요.'}
            </p>
            {context?.actualRestDurationSec !== undefined && (
              <p className="muted">
                타이머에서 진행된 휴식 {formatSecondsToMMSS(context.actualRestDurationSec)} ·
                일시정지 제외
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
                      : step.blockInstanceId
                        ? (step.exerciseSnapshot?.nameKo ??
                          exercisesAtOpen.find((exercise) => exercise.id === step.exerciseId)
                            ?.nameKo ??
                          exercises.find((exercise) => exercise.id === step.exerciseId)?.nameKo ??
                          '삭제된 동작')
                        : (exercisesAtOpen.find((exercise) => exercise.id === step.exerciseId)
                            ?.nameKo ??
                          step.exerciseSnapshot?.nameKo ??
                          exercises.find((exercise) => exercise.id === step.exerciseId)?.nameKo ??
                          '삭제된 동작')}
                  </span>
                </label>
              ))}
            </div>
          </details>
          <div className="teaching-form-grid teaching-form-two">
            <PfField label="강사가 느낀 강도">
              <PfSelect
                value={intensity}
                onChange={(event) => setIntensity(event.target.value as typeof intensity)}
              >
                <option value="relaxed">가볍게</option>
                <option value="moderate">보통</option>
                <option value="intense">높게</option>
              </PfSelect>
            </PfField>
            <PfField label="강사의 수업 평가">
              <PfSelect
                value={rating}
                onChange={(event) => setRating(Number(event.target.value) as typeof rating)}
              >
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </PfSelect>
            </PfField>
          </div>
          <PfField
            label="다음 수업을 위한 메모 (선택)"
            hint="학생 실명이나 건강 정보는 적지 않아도 돼요."
          >
            <PfTextarea
              aria-label="다음 수업을 위한 메모 (선택)"
              rows={3}
              maxLength={3000}
              placeholder="잘 이어진 전환, 다음에 바꿔볼 동작 등을 남겨 주세요."
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
            />
          </PfField>
        </div>
        <footer className="class-log-footer">
          {error && <PfFormError>{error}</PfFormError>}
          <div className="teaching-form-actions">
            <PfButton variant="secondary" onClick={onClose}>
              취소
            </PfButton>
            <PfButton
              type="submit"
              variant="primary"
              disabled={submitted || classGroups.length === 0}
            >
              <Check size={17} />
              수업 기록 저장
            </PfButton>
          </div>
          <p className="teaching-log-footnote muted">
            이 브라우저에 저장됩니다. 기록이 실제 수업과 맞는지 확인해 주세요.
          </p>
        </footer>
      </form>
    </LightDismissDialog>
  );
};
