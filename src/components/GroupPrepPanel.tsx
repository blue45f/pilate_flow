import { compareTeachingHistoryDates, getTeachingHistoryDateSource } from '../utils/teachingHistoryDate';
import { useRef, useState } from 'react';
import { ArrowRight, CalendarDays, History, PencilLine, Users } from 'lucide-react';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassGroupProfile, DifficultyLevel } from '../types/pilates';
import type { GroupPlanningPreferences } from '../types/instructorPlanning';
import '../styles/group-planning.css';
import { LightDismissDialog } from './LightDismissDialog';
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
const levelLabels = { '1.0': '입문·기초', '1.5': '초중급', '2.0': '중상급' };
const displayDate = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: 'UTC' } : {}),
  });

export function GroupPrepPanel({ groupId }: { groupId?: string }) {
  const store = usePilatesStore();
  const group = store.classGroups.find((item) => item.id === groupId);
  const [editing, setEditing] = useState<ClassGroupProfile | null>(null);
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const closeEditor = () => {
    const dialog = formRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    setEditing(null);
  };
  const logs = store.historyLogs
    .filter(
      (log) =>
        log.groupId === groupId &&
        !sampleIds.has(log.id) &&
        Number.isFinite(Date.parse(log.taughtAt)),
    )
    .sort(compareTeachingHistoryDates);
  const recent = logs[0];
  if (!group) return null;

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
    setMessage(result.message);
    if (result.success) closeEditor();
  };

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
          onClick={() => {
            setEditing({ ...group });
            setMessage('');
          }}
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
      </div>
      <div className="group-prep-memory">
        <span className="group-prep-memory-label">
          <History size={14} aria-hidden="true" />
          {recent ? `${displayDate(getTeachingHistoryDateSource(recent))} 수업에서 남긴 기억` : '다음 수업을 위한 기억'}
        </span>
        <p>
          {recent
            ? recent.instructorReflection
            : '수업을 마친 뒤 회고를 남기면 이 대상의 다음 준비에 이어집니다.'}
        </p>
        {recent && <span className="muted">{recent.sequenceTitle}</span>}
      </div>
      <div className="group-prep-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!logs.some((log) => log.criteriaSnapshot)}
          onClick={() => setMessage(store.reuseGroupRecentCriteria(group.id).message)}
        >
          최근 수업 조건 가져오기 <ArrowRight size={15} />
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setMessage(store.applyGroupDefaultLevel(group.id).message)}
        >
          기본 난이도 적용
        </button>
      </div>
      {group.planningPreferences && (
        <p className="group-planning-summary">
          {ageLabels[group.planningPreferences.ageBand ?? 'unspecified']} ·{' '}
          {experienceLabels[group.planningPreferences.experience ?? 'unspecified']}
          {group.planningPreferences.conditions &&
            ` · 저장 조건 ${group.planningPreferences.conditions.targetMinutes}분 / 휴식 ${group.planningPreferences.conditions.restMinutes ?? 0}분 포함`}
        </p>
      )}
      <details className="group-prep-details">
        <summary>반별 저장 조건·대상 메모</summary>
        <div className="group-planning-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={!group.planningPreferences?.conditions}
            onClick={() => setMessage(store.applyGroupPlanningConditions(group.id).message)}
          >
            이 반의 저장 조건 불러오기
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMessage(store.saveCurrentConditionsToGroup(group.id).message)}
          >
            현재 조건을 이 반에 저장
          </button>
        </div>
        {group.planningPreferences?.mixedLevelNotes && (
          <p>혼합 수준 준비 메모 · {group.planningPreferences.mixedLevelNotes}</p>
        )}
        <p className="muted">
          연령·경험은 강사가 참고하는 정보입니다. 연령만으로 난도나 운동 적합성을 정하지 않습니다.
          조건 적용은 현재 편집 중인 블록·잠금·이력을 바꾸지 않습니다.
        </p>
        <p>{group.notes || '수업에서 기억할 내용을 대상 정보 편집에 남겨 보세요.'}</p>
        <p className="muted">
          조건만 불러오며 현재 동작·잠금은 유지합니다. 반의 기본 난이도는 강사의 계획값이며 회원의
          상태를 진단하지 않습니다.
        </p>
        <button type="button" className="text-button" onClick={() => store.setActiveTab('history')}>
          대상 추가·수업 기록 전체 보기 <ArrowRight size={14} />
        </button>
      </details>
      {message && !editing && (
        <p className="group-prep-feedback" role="status">
          {message}
        </p>
      )}
      {editing && (
        <LightDismissDialog
          open
          onClose={closeEditor}
          title="대상 정보 편집"
          subtitle="실명과 건강 정보 대신 반 번호·별칭과 수업 준비 메모를 사용해 주세요."
          maxWidth="560px"
        >
          <form ref={formRef} onSubmit={saveProfile} className="group-profile-form">
            <label className="form-field">
              <span>대상 별칭</span>
              <input
                required
                maxLength={60}
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </label>
            <div className="group-profile-pair">
              <label className="form-field">
                <span>반의 넓은 연령대 · 선택</span>
                <select
                  value={editing.planningPreferences?.ageBand ?? 'unspecified'}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      planningPreferences: {
                        ...editing.planningPreferences,
                        ageBand: event.target.value as GroupPlanningPreferences['ageBand'],
                      },
                    })
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
                    setEditing({
                      ...editing,
                      planningPreferences: {
                        ...editing.planningPreferences,
                        experience: event.target.value as GroupPlanningPreferences['experience'],
                      },
                    })
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
                  setEditing({
                    ...editing,
                    planningPreferences: {
                      ...editing.planningPreferences,
                      mixedLevelNotes: event.target.value,
                    },
                  })
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
                    setEditing({
                      ...editing,
                      defaultLevel: event.target.value as DifficultyLevel,
                    })
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
                    setEditing({
                      ...editing,
                      scheduleLabel: event.target.value,
                    })
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
                onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
              />
            </label>
            <p className="muted">
              이 변경은 과거 수업에 기록된 별칭·회고·수업 조건을 바꾸지 않습니다.
            </p>
            <div className="button-row">
              <button type="button" className="btn-secondary" onClick={closeEditor}>
                취소
              </button>
              <button className="btn-primary" type="submit">
                대상 정보 저장
              </button>
            </div>
            {message && <p role="status">{message}</p>}
          </form>
        </LightDismissDialog>
      )}
    </section>
  );
}
