import { useId, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, History, PencilLine, Users } from 'lucide-react';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { criteriaSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { GroupPlanningConditions, GroupPlanningPreferences } from '../types/instructorPlanning';
import type { AutoGenerateCriteria, ClassGroupProfile, DifficultyLevel } from '../types/pilates';
import {
  compareTeachingHistoryDates,
  getTeachingHistoryDateSource,
} from '../utils/teachingHistoryDate';
import { LightDismissDialog, type DialogCloseRequest } from './LightDismissDialog';
import '../styles/group-planning.css';
import '../styles/instructor.css';

const sampleIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));

const ageLabels = {
  'under-18': '18세 미만',
  '18-39': '18–39세',
  '40-59': '40–59세',
  '60-plus': '60세 이상',
  mixed: '여러 연령대',
  unspecified: '미입력',
};

const experienceLabels = {
  new: '처음 배우는 반',
  some: '경험이 있는 반',
  experienced: '숙련 경험이 있는 반',
  mixed: '경험이 섞인 반',
  unspecified: '미입력',
};

const levelLabels: Record<DifficultyLevel, string> = {
  '1.0': '입문·기초',
  '1.5': '초중급',
  '2.0': '중상급',
};

const displayDate = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: 'UTC' } : {}),
  });

function formatConditionsBrief(
  conditions: GroupPlanningConditions | AutoGenerateCriteria,
): string {
  const equipmentIds =
    conditions.availableEquipment && conditions.availableEquipment.length > 0
      ? conditions.availableEquipment
      : conditions.apparatus === 'mixed'
        ? (conditions.ownedApparatus ?? [])
        : [conditions.apparatus];
  const equipmentText =
    equipmentIds
      .map((id) => EQUIPMENT_OPTIONS.find((option) => option.id === id)?.labelKo ?? id)
      .join('·') || '기구 미지정';
  const restText =
    conditions.restMinutes && conditions.restMinutes > 0
      ? ` (휴식 ${conditions.restMinutes}분)`
      : '';
  return `${conditions.targetMinutes}분${restText} · ${equipmentText} · 최대 Lv ${conditions.level}`;
}

function isProfileDraftDirty(draft: ClassGroupProfile, baseline: ClassGroupProfile): boolean {
  return (
    draft.name !== baseline.name ||
    draft.defaultLevel !== baseline.defaultLevel ||
    draft.scheduleLabel !== baseline.scheduleLabel ||
    draft.notes !== baseline.notes ||
    (draft.planningPreferences?.ageBand ?? 'unspecified') !==
      (baseline.planningPreferences?.ageBand ?? 'unspecified') ||
    (draft.planningPreferences?.experience ?? 'unspecified') !==
      (baseline.planningPreferences?.experience ?? 'unspecified') ||
    (draft.planningPreferences?.mixedLevelNotes ?? '') !==
      (baseline.planningPreferences?.mixedLevelNotes ?? '')
  );
}

export function GroupPrepPanel({ groupId }: { groupId?: string }) {
  const store = usePilatesStore();
  const group = store.classGroups.find((item) => item.id === groupId);

  const [prevGroupId, setPrevGroupId] = useState(groupId);
  const [openEditorGroupId, setOpenEditorGroupId] = useState<string | null>(null);
  const [draftsByGroup, setDraftsByGroup] = useState<Record<string, ClassGroupProfile>>({});
  const [dismissalRequested, setDismissalRequested] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [feedbackByGroup, setFeedbackByGroup] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLFormElement>(null);
  const lastInputRef = useRef<HTMLElement | null>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const deferredCloseRef = useRef<DialogCloseRequest['close'] | null>(null);

  const baseId = useId();
  const recentHintId = `${baseId}-recent-hint`;
  const defaultLevelHintId = `${baseId}-level-hint`;
  const savedApplyHintId = `${baseId}-saved-apply-hint`;
  const saveCurrentHintId = `${baseId}-save-current-hint`;
  const decisionTitleId = `${baseId}-decision-title`;
  const decisionDescId = `${baseId}-decision-desc`;

  if (prevGroupId !== groupId) {
    setPrevGroupId(groupId);
    if (openEditorGroupId !== null) {
      setOpenEditorGroupId(null);
    }
    if (dismissalRequested) {
      setDismissalRequested(false);
    }
    if (editorError) {
      setEditorError('');
    }
  }

  const logs = store.historyLogs
    .filter(
      (log) =>
        log.groupId === groupId &&
        !sampleIds.has(log.id) &&
        Number.isFinite(Date.parse(log.taughtAt)),
    )
    .sort(compareTeachingHistoryDates);

  const recent = logs[0];
  const reusableRecent = logs
    .map((log) => ({ log, parsed: criteriaSchema.safeParse(log.criteriaSnapshot) }))
    .find((entry) => entry.parsed.success);

  if (!group) return null;

  const activeDraftTargetGroupId =
    store.draftCriteria?.targetGroupId ?? store.activeTargetGroupId;
  const isCurrentDraftTarget = activeDraftTargetGroupId === group.id;
  const currentDraftLevel = store.draftCriteria?.level ?? store.lastCriteria?.level;
  const savedConditions = group.planningPreferences?.conditions;

  const storedDraft = draftsByGroup[group.id];
  const hasUnsavedDraft = Boolean(storedDraft && isProfileDraftDirty(storedDraft, group));
  const isEditorOpen = openEditorGroupId === group.id && Boolean(storedDraft);
  const editing = isEditorOpen ? storedDraft : null;
  const isEditingDirty = Boolean(editing && isProfileDraftDirty(editing, group));
  const message = feedbackByGroup[group.id] ?? '';

  const setGroupMessage = (targetGroupId: string, nextMessage: string) => {
    setFeedbackByGroup((prev) => ({ ...prev, [targetGroupId]: nextMessage }));
  };

  const clearDraftForGroup = (targetGroupId: string) => {
    setDraftsByGroup((prev) => {
      if (!(targetGroupId in prev)) return prev;
      const next = { ...prev };
      delete next[targetGroupId];
      return next;
    });
  };

  const openEditor = () => {
    setDraftsByGroup((prev) => {
      const existing = prev[group.id];
      if (existing && isProfileDraftDirty(existing, group)) {
        return prev;
      }
      return { ...prev, [group.id]: structuredClone(group) };
    });
    deferredCloseRef.current = null;
    setDismissalRequested(false);
    setEditorError('');
    setGroupMessage(group.id, '');
    setOpenEditorGroupId(group.id);
  };

  const updateEditingDraft = (updater: (current: ClassGroupProfile) => ClassGroupProfile) => {
    setDismissalRequested(false);
    deferredCloseRef.current = null;
    if (editorError) setEditorError('');
    setDraftsByGroup((prev) => {
      const base = prev[group.id] ?? structuredClone(group);
      return { ...prev, [group.id]: updater(base) };
    });
  };

  const finalizeDiscardAndClose = (targetGroupId: string) => {
    const dialog = formRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    deferredCloseRef.current = null;
    setDismissalRequested(false);
    setEditorError('');
    clearDraftForGroup(targetGroupId);
    setOpenEditorGroupId(null);
  };

  const handleBeforeClose = (request: DialogCloseRequest): boolean => {
    if (!editing || !isProfileDraftDirty(editing, group)) {
      return true;
    }
    deferredCloseRef.current = request.close;
    setDismissalRequested(true);
    requestAnimationFrame(() => {
      decisionRef.current?.focus();
    });
    return false;
  };

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const currentGroup = usePilatesStore
      .getState()
      .classGroups.find((item) => item.id === editing.id);
    const currentConditions = currentGroup?.planningPreferences?.conditions;
    const planningPreferences = editing.planningPreferences
      ? { ...editing.planningPreferences, conditions: currentConditions }
      : currentConditions
        ? { conditions: currentConditions }
        : undefined;
    const result = store.updateClassGroup(editing.id, {
      name: editing.name,
      defaultLevel: editing.defaultLevel,
      scheduleLabel: editing.scheduleLabel,
      notes: editing.notes,
      planningPreferences,
    });
    if (!result.success) {
      setEditorError(result.message);
      if (!editing.name.trim()) {
        requestAnimationFrame(() => {
          formRef.current?.querySelector<HTMLInputElement>('input[name="groupAlias"]')?.focus();
        });
      }
      return;
    }
    setGroupMessage(editing.id, result.message);
    finalizeDiscardAndClose(editing.id);
  };

  const recentCriteriaDescription =
    reusableRecent && reusableRecent.parsed.success
      ? `시간·기구·난이도 전체 변경 · ${displayDate(getTeachingHistoryDateSource(reusableRecent.log))} (${formatConditionsBrief(reusableRecent.parsed.data)})`
      : '시간·기구·난이도 전체 변경 · 재사용할 최근 수업 조건 기록 없음';

  const defaultLevelDescription =
    isCurrentDraftTarget && currentDraftLevel === group.defaultLevel
      ? `시간·기구 유지 · 현재 초안과 같은 최대 Lv ${group.defaultLevel}(${levelLabels[group.defaultLevel]})`
      : `시간·기구 유지 · 최대 난이도만 Lv ${group.defaultLevel}(${levelLabels[group.defaultLevel]})로 변경`;

  return (
    <section className="group-prep-panel" aria-label="선택한 대상의 다음 수업 준비">
      <div className="group-prep-heading">
        <span className="group-prep-avatar">
          <Users size={21} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">NEXT CLASS · 대상별 준비</span>
          <h3>{group.name}</h3>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="대상 정보 편집"
          onClick={openEditor}
        >
          <PencilLine size={17} />
        </button>
      </div>

      <div className="group-prep-meta">
        <span>
          <CalendarDays size={13} aria-hidden="true" />
          {group.scheduleLabel || '일정 미입력'}
        </span>
        <span>기본 {levelLabels[group.defaultLevel]}</span>
        <span
          className={`group-prep-target-badge ${isCurrentDraftTarget ? 'is-matched' : 'is-pending'}`}
        >
          {isCurrentDraftTarget
            ? `현재 조건 대상 · ${group.name}`
            : `조건 적용 시 대상 · ${group.name}`}
        </span>
      </div>

      {hasUnsavedDraft && !isEditorOpen && (
        <div
          className="group-prep-draft-banner"
          role="status"
          aria-live="polite"
        >
          <span>저장하지 않은 ‘{group.name}’ 정보 편집 초안이 남아 있습니다.</span>
          <div className="group-prep-draft-actions">
            <button type="button" className="btn-primary" onClick={openEditor}>
              이어서 편집
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => clearDraftForGroup(group.id)}
            >
              초안 버리기
            </button>
          </div>
        </div>
      )}

      <div className="group-prep-memory">
        <span className="group-prep-memory-label">
          <History size={14} aria-hidden="true" />
          {recent
            ? `${displayDate(getTeachingHistoryDateSource(recent))} 수업에서 남긴 기억`
            : '다음 수업을 위한 기억'}
        </span>
        <p>
          {recent
            ? recent.instructorReflection
            : '수업을 마친 뒤 회고를 남기면 이 대상의 다음 준비에 이어집니다.'}
        </p>
        {recent && <span className="muted">{recent.sequenceTitle}</span>}
      </div>

      <div className="group-prep-actions">
        <div className="group-prep-action-item">
          <button
            type="button"
            className="btn-primary"
            disabled={!reusableRecent}
            aria-describedby={recentHintId}
            onClick={() =>
              setGroupMessage(group.id, store.reuseGroupRecentCriteria(group.id).message)
            }
          >
            최근 수업 조건 가져오기 <ArrowRight size={15} aria-hidden="true" />
          </button>
          <small id={recentHintId} className="group-prep-action-hint">
            {recentCriteriaDescription}
          </small>
        </div>

        <div className="group-prep-action-item">
          <button
            type="button"
            className="btn-secondary"
            aria-describedby={defaultLevelHintId}
            onClick={() =>
              setGroupMessage(group.id, store.applyGroupDefaultLevel(group.id).message)
            }
          >
            기본 난이도 적용
          </button>
          <small id={defaultLevelHintId} className="group-prep-action-hint">
            {defaultLevelDescription}
          </small>
        </div>
      </div>

      {group.planningPreferences && (
        <p className="group-planning-summary">
          {ageLabels[group.planningPreferences.ageBand ?? 'unspecified']} ·{' '}
          {experienceLabels[group.planningPreferences.experience ?? 'unspecified']}
          {savedConditions && ` · 저장 조건 ${formatConditionsBrief(savedConditions)}`}
        </p>
      )}

      <details className="group-prep-details">
        <summary>반별 저장 조건·대상 메모</summary>
        <div className="group-planning-actions">
          <div className="group-prep-action-item">
            <button
              type="button"
              className="btn-secondary"
              disabled={!savedConditions}
              aria-describedby={savedApplyHintId}
              onClick={() =>
                setGroupMessage(group.id, store.applyGroupPlanningConditions(group.id).message)
              }
            >
              이 반의 저장 조건 불러오기
            </button>
            <small id={savedApplyHintId} className="group-prep-action-hint">
              {savedConditions
                ? `${group.name} 저장 조건(${formatConditionsBrief(savedConditions)})으로 초안 전체 변경`
                : '이 반에 별도로 저장해 둔 고정 조건이 아직 없습니다'}
            </small>
          </div>

          <div className="group-prep-action-item">
            <button
              type="button"
              className="btn-secondary"
              aria-describedby={saveCurrentHintId}
              onClick={() =>
                setGroupMessage(group.id, store.saveCurrentConditionsToGroup(group.id).message)
              }
            >
              현재 조건을 이 반에 저장
            </button>
            <small id={saveCurrentHintId} className="group-prep-action-hint">
              현재 초안의 시간·기구·난이도를 {group.name} 고정 조건으로 보관 (관찰 메모 제외)
            </small>
          </div>
        </div>

        {group.planningPreferences?.mixedLevelNotes && (
          <p>혼합 수준 준비 메모 · {group.planningPreferences.mixedLevelNotes}</p>
        )}
        <p>{group.notes || '수업에서 기억할 내용을 대상 정보 편집에 남겨 보세요.'}</p>
        <p className="muted">
          조건 적용은 초안 조건만 바꾸며 현재 편집 중인 동작·잠금·수업 이력은 유지합니다. 연령·경험과
          기본 난이도는 강사의 계획 참고값이며, 연령만으로 난도를 정하거나 회원의 건강 상태를
          진단하지 않습니다.
        </p>
        <button
          type="button"
          className="text-button group-prep-history-link"
          onClick={() => store.setActiveTab('history')}
        >
          대상 추가·수업 기록 전체 보기 <ArrowRight size={14} aria-hidden="true" />
        </button>
      </details>

      {message && !isEditorOpen && (
        <p className="group-prep-feedback" role="status" aria-live="polite">
          {message}
        </p>
      )}

      {editing && (
        <LightDismissDialog
          open
          onClose={() => finalizeDiscardAndClose(editing.id)}
          onBeforeClose={handleBeforeClose}
          className="group-prep-editor-dialog"
          title="대상 정보 편집"
          subtitle="실명과 건강 정보 대신 반 번호·별칭과 수업 준비 메모를 사용해 주세요."
          maxWidth="560px"
        >
          {dismissalRequested && isEditingDirty && (
            <div
              ref={decisionRef}
              className="group-prep-discard-guard"
              role="group"
              aria-labelledby={decisionTitleId}
              aria-describedby={decisionDescId}
              tabIndex={-1}
            >
              <strong id={decisionTitleId}>저장하지 않은 대상 정보 변경사항이 있습니다.</strong>
              <p id={decisionDescId}>
                계속 편집하면 입력한 내용을 유지합니다. 버리고 닫으면 이번 수정은 반영되지 않습니다.
              </p>
              <div className="group-prep-discard-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    deferredCloseRef.current = null;
                    setDismissalRequested(false);
                    requestAnimationFrame(() => {
                      const prevInput = lastInputRef.current;
                      const fallback = formRef.current?.querySelector<HTMLElement>(
                        'input, select, textarea',
                      );
                      (prevInput?.isConnected ? prevInput : fallback)?.focus();
                    });
                  }}
                >
                  계속 편집
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const close = deferredCloseRef.current;
                    deferredCloseRef.current = null;
                    clearDraftForGroup(editing.id);
                    setDismissalRequested(false);
                    setEditorError('');
                    close?.();
                    setOpenEditorGroupId(null);
                  }}
                >
                  변경 버리고 닫기
                </button>
              </div>
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={saveProfile}
            className="group-profile-form"
            onFocusCapture={(event) => {
              const target = event.target;
              if (target instanceof HTMLElement && target.matches('input, select, textarea')) {
                lastInputRef.current = target;
              }
            }}
          >
            <label className="form-field">
              <span>대상 별칭</span>
              <input
                name="groupAlias"
                required
                maxLength={60}
                value={editing.name}
                onChange={(event) =>
                  updateEditingDraft((curr) => ({ ...curr, name: event.target.value }))
                }
              />
            </label>
            <div className="group-profile-pair">
              <label className="form-field">
                <span>반의 넓은 연령대 · 선택</span>
                <select
                  value={editing.planningPreferences?.ageBand ?? 'unspecified'}
                  onChange={(event) =>
                    updateEditingDraft((curr) => ({
                      ...curr,
                      planningPreferences: {
                        ...curr.planningPreferences,
                        ageBand: event.target.value as GroupPlanningPreferences['ageBand'],
                      },
                    }))
                  }
                >
                  {Object.entries(ageLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>수업 경험 · 선택</span>
                <select
                  value={editing.planningPreferences?.experience ?? 'unspecified'}
                  onChange={(event) =>
                    updateEditingDraft((curr) => ({
                      ...curr,
                      planningPreferences: {
                        ...curr.planningPreferences,
                        experience: event.target.value as GroupPlanningPreferences['experience'],
                      },
                    }))
                  }
                >
                  {Object.entries(experienceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>혼합 수준 준비 메모 · 선택</span>
              <textarea
                rows={2}
                maxLength={1000}
                value={editing.planningPreferences?.mixedLevelNotes ?? ''}
                placeholder="예: 같은 블록에 쉬운 대안과 진행 대안을 준비"
                onChange={(event) =>
                  updateEditingDraft((curr) => ({
                    ...curr,
                    planningPreferences: {
                      ...curr.planningPreferences,
                      mixedLevelNotes: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <p className="group-planning-privacy">
              실명·생년월일·진단 정보 없이 넓은 범위와 수업 준비 메모만 저장합니다. 연령을 바꿔도
              난이도는 자동으로 바뀌지 않습니다.
            </p>
            <div className="group-profile-pair">
              <label className="form-field">
                <span>반 기본 난이도</span>
                <select
                  value={editing.defaultLevel}
                  onChange={(event) =>
                    updateEditingDraft((curr) => ({
                      ...curr,
                      defaultLevel: event.target.value as DifficultyLevel,
                    }))
                  }
                >
                  <option value="1.0">입문·기초</option>
                  <option value="1.5">초중급</option>
                  <option value="2.0">중상급</option>
                </select>
              </label>
              <label className="form-field">
                <span>반 일정</span>
                <input
                  maxLength={120}
                  placeholder="예: 화·목 저녁"
                  value={editing.scheduleLabel}
                  onChange={(event) =>
                    updateEditingDraft((curr) => ({
                      ...curr,
                      scheduleLabel: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="form-field">
              <span>수업 준비 메모</span>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="다음에 이어갈 구성, 잘 전달된 큐 등"
                value={editing.notes}
                onChange={(event) =>
                  updateEditingDraft((curr) => ({ ...curr, notes: event.target.value }))
                }
              />
            </label>
            <p className="muted">
              이 변경은 과거 수업에 기록된 별칭·회고·수업 조건을 바꾸지 않습니다.
            </p>
            {editorError && (
              <p className="group-profile-error" role="alert">
                {editorError}
              </p>
            )}
            <div className="button-row group-profile-submit-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={(event) => {
                  const dialog = event.currentTarget.closest('dialog');
                  const close = () => {
                    if (dialog?.open) dialog.close();
                    finalizeDiscardAndClose(editing.id);
                  };
                  if (handleBeforeClose({ reason: 'close-button', close })) {
                    close();
                  }
                }}
              >
                취소
              </button>
              <button className="btn-primary" type="submit">
                대상 정보 저장
              </button>
            </div>
          </form>
        </LightDismissDialog>
      )}
    </section>
  );
}
