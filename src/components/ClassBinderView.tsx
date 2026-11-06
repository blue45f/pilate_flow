import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  FileText,
  FolderHeart,
  History,
  Play,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  APPARATUS_LABELS,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ClassHistoryLog,
  DifficultyLevel,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import {
  formatSecondsToMMSS,
  formatSequenceAsStudioSheet,
  getSequenceDurations,
  isRestStep,
} from '../utils/sequenceEngine';
import { LightDismissDialog } from './LightDismissDialog';
import type { TeachingLogContext } from './LogSessionModal';
import '../styles/teaching.css';
import '../styles/rest.css';

interface ClassBinderViewProps {
  onOpenLogModal: (sequenceId: string, context?: TeachingLogContext) => void;
  view?: 'saved' | 'history';
}

const sampleSequenceIds = new Set(INITIAL_SAVED_SEQUENCES.map((sequence) => sequence.id));
const sampleHistoryIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));
const historyMovementIds = (log: ClassHistoryLog) =>
  log.stepsSnapshot
    ? log.stepsSnapshot.filter((step) => !isRestStep(step)).map((step) => step.exerciseId)
    : log.exerciseIds.filter(Boolean);
const movementCount = (steps: SequenceStep[]) => steps.filter((step) => !isRestStep(step)).length;
const minutesLabel = (seconds: number) => Number((seconds / 60).toFixed(2));
const formatDate = (date: string) =>
  Number.isNaN(Date.parse(date))
    ? '날짜 미상'
    : new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

export const ClassBinderView: React.FC<ClassBinderViewProps> = ({
  onOpenLogModal,
  view = 'saved',
}) => {
  const {
    savedSequences,
    classGroups,
    historyLogs,
    exercises,
    activeSteps,
    reformerBrand,
    conditionTemplates,
    loadSequenceIntoWorkbench,
    duplicateSavedSequence,
    deleteSavedSequence,
    loadHistoryIntoWorkbench,
    applyConditionTemplate,
    addClassGroup,
    setActiveTab,
  } = usePilatesStore();
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSchedule, setGroupSchedule] = useState('');
  const [groupLevel, setGroupLevel] = useState<DifficultyLevel>('1.5');
  const [message, setMessage] = useState('');
  const [historyCopyError, setHistoryCopyError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [printSequence, setPrintSequence] = useState<SavedSequence | null>(null);
  const exercisesMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const sequences = useMemo(
    () =>
      [...savedSequences]
        .filter((sequence) =>
          `${sequence.title} ${sequence.subtitle}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [savedSequences, query],
  );
  const logs = useMemo(
    () =>
      historyLogs
        .filter((log) => selectedGroup === 'all' || log.groupId === selectedGroup)
        .sort((a, b) => Date.parse(b.taughtAt) - Date.parse(a.taughtAt)),
    [historyLogs, selectedGroup],
  );
  const actualLogs = logs.filter((log) => !sampleHistoryIds.has(log.id));
  const recent = actualLogs.slice(0, 3);
  const draftIds = new Set(
    activeSteps.filter((step) => !isRestStep(step)).map((step) => step.exerciseId),
  );
  const counts = new Map<string, number>();
  for (const log of actualLogs.slice(0, 5))
    for (const id of new Set(historyMovementIds(log))) counts.set(id, (counts.get(id) ?? 0) + 1);
  const mostUsed = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const sheetFor = (sequence: SavedSequence) => {
    const durations = getSequenceDurations(sequence.steps);
    return `시간 구성: 총 ${minutesLabel(durations.totalSec)}분 · 동작·설명·전환 ${minutesLabel(durations.exerciseSec)}분 · 휴식 ${minutesLabel(durations.restSec)}분\n\n${formatSequenceAsStudioSheet(
      sequence.title,
      sequence.subtitle,
      sequence.steps,
      exercisesMap,
      reformerBrand,
    )}`;
  };
  const exportText = (sequence: SavedSequence) => {
    const content = `강사 검토용 계획 · 동작 시간은 양쪽 수행·설명·전환을 포함하며 휴식은 별도 항목으로 전체 시간에 포함합니다.\n스프링은 원문 참고값이며 실제 기구에서 확인해 주세요.\n\n${sheetFor(sequence)}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sequence.title.replace(/[\\/:*?"<>|]/g, '-') || 'pilates-sequence'}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('텍스트 파일을 내보냈습니다.');
  };
  const createGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) return;
    addClassGroup({
      name: groupName.trim(),
      type: 'group',
      defaultLevel: groupLevel,
      scheduleLabel: groupSchedule.trim(),
      notes: '',
    });
    setGroupName('');
    setGroupSchedule('');
    setShowGroupForm(false);
    setMessage('수업 그룹을 추가했습니다.');
  };
  const copyHistory = (logId: string) => {
    const before = usePilatesStore.getState();
    loadHistoryIntoWorkbench(logId);
    const after = usePilatesStore.getState();
    setHistoryCopyError(after === before ? '' : (after.generationError ?? ''));
  };

  return (
    <div className="teaching-collection">
      <header className="teaching-page-header">
        <div>
          <span className="eyebrow">
            {view === 'saved' ? '나의 수업 서랍' : '다음 수업을 위한 기억'}
          </span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            {view === 'saved' ? '저장한 시퀀스' : '수업 기록'}
            <span className="teaching-count">
              {view === 'saved' ? savedSequences.length : actualLogs.length}
            </span>
          </h1>
          <p className="muted">
            {view === 'saved'
              ? '마음에 드는 흐름을 보관하고, 오늘의 수업으로 이어가세요.'
              : '직접 남긴 수업과 메모를 모아 봅니다. 반 이름은 별칭으로 충분해요.'}
          </p>
        </div>
        <button
          type="button"
          className={view === 'saved' ? 'btn-primary' : 'btn-secondary'}
          onClick={() =>
            view === 'saved' ? setActiveTab('workbench') : setShowGroupForm((value) => !value)
          }
        >
          {view === 'saved' ? (
            <>
              <Plus size={17} /> 새 시퀀스 계획
            </>
          ) : (
            <>
              <Users size={17} /> 수업 그룹 추가
            </>
          )}
        </button>
      </header>
      {message && (
        <p className="teaching-feedback" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {view === 'history' && historyCopyError && (
        <p className="teaching-error" role="alert">
          {historyCopyError}
        </p>
      )}
      {view === 'saved' ? (
        <>
          <div className="teaching-collection-toolbar">
            <label className="teaching-search">
              <Search size={18} />
              <input
                aria-label="저장한 시퀀스 검색"
                placeholder="시퀀스 이름으로 찾기"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <span className="muted">최근 수정 순 · 이 브라우저에 저장됨</span>
          </div>
          {sequences.length === 0 ? (
            <div className="panel teaching-empty">
              <FolderHeart size={32} />
              <h2>{query ? '검색한 시퀀스가 없어요' : '첫 수업의 흐름을 저장해 보세요'}</h2>
              <p className="muted">
                {query
                  ? '다른 이름으로 검색해 주세요.'
                  : '계획에서 시퀀스를 만들고 저장하면 이곳에 모입니다.'}
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (query ? setQuery('') : setActiveTab('workbench'))}
              >
                {query ? '검색 지우기' : '수업 계획하기'}
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="teaching-saved-grid">
              {sequences.map((sequence, index) => {
                const durations = getSequenceDurations(sequence.steps);
                const exerciseCount = movementCount(sequence.steps);
                const restCount = sequence.steps.length - exerciseCount;
                return (
                  <article className="panel teaching-sequence-card" key={sequence.id}>
                    <div className="teaching-card-top">
                      <span className="teaching-card-label">
                        {String(index + 1).padStart(2, '0')} ·{' '}
                        {sequence.apparatus === 'mixed'
                          ? '여러 기구'
                          : APPARATUS_LABELS[sequence.apparatus].ko}
                        {sampleSequenceIds.has(sequence.id) && ' · 예시'}
                      </span>
                      <span className="teaching-level">Lv {sequence.level}</span>
                    </div>
                    <h2>{sequence.title}</h2>
                    <p className="muted teaching-sequence-subtitle">
                      {sequence.subtitle || '내가 만든 수업 흐름'}
                    </p>
                    {sequence.recoveredDraftOrigin && (
                      <p className="muted" data-recovered-draft="true">
                        이전 편집 초안에서 복구한 자료 · 수업 전 조건을 확인해 주세요.
                      </p>
                    )}
                    <div className="teaching-card-stats">
                      <span>
                        <Clock3 size={15} />
                        {minutesLabel(durations.totalSec)}분
                      </span>
                      <span>{exerciseCount}개 동작</span>
                      {restCount > 0 && <span>휴식 {restCount}개</span>}
                      <span>
                        기록{' '}
                        {
                          historyLogs.filter(
                            (log) =>
                              log.sequenceId === sequence.id && !sampleHistoryIds.has(log.id),
                          ).length
                        }
                        회
                      </span>
                    </div>
                    {restCount > 0 && (
                      <p className="teaching-rest-summary" aria-label="저장 수업 시간 구성">
                        동작·설명·전환 {formatSecondsToMMSS(durations.exerciseSec)} · 휴식{' '}
                        {formatSecondsToMMSS(durations.restSec)}
                      </p>
                    )}
                    <ol className="teaching-flow-preview">
                      {sequence.steps.slice(0, 4).map((step) => (
                        <li key={step.stepId}>
                          {isRestStep(step)
                            ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}`
                            : (exercisesMap.get(step.exerciseId)?.nameKo ?? '삭제된 동작')}
                        </li>
                      ))}
                      {sequence.steps.length > 4 && (
                        <li className="muted">외 {sequence.steps.length - 4}개 항목</li>
                      )}
                    </ol>
                    <p className="teaching-card-date">
                      {sequence.lastTaughtAt
                        ? `최근 수업 ${formatDate(sequence.lastTaughtAt)}`
                        : `수정 ${formatDate(sequence.updatedAt)}`}
                    </p>
                    <div className="teaching-card-main-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => loadSequenceIntoWorkbench(sequence.id)}
                      >
                        <BookOpen size={16} />
                        불러오기
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          loadSequenceIntoWorkbench(sequence.id);
                          setActiveTab('stage');
                        }}
                      >
                        <Play size={16} />
                        수업 시작
                      </button>
                    </div>
                    <div className="teaching-card-tools">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          const id = duplicateSavedSequence(sequence.id);
                          if (id)
                            setMessage('복사본을 저장했습니다. 원본의 기록은 그대로 유지됩니다.');
                        }}
                      >
                        <Copy size={15} />
                        복제
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setPrintSequence(sequence)}
                      >
                        <Printer size={15} />
                        인쇄
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => exportText(sequence)}
                      >
                        <ArrowDownToLine size={15} />
                        텍스트
                      </button>
                      <button
                        type="button"
                        className="icon-btn teaching-delete"
                        aria-label={`${sequence.title} 삭제`}
                        onClick={() => setPendingDelete(sequence.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="teaching-log-link"
                      onClick={() =>
                        onOpenLogModal(sequence.id, {
                          stepsSnapshot: sequence.steps,
                          sequenceTitle: sequence.title,
                        })
                      }
                    >
                      <CalendarDays size={15} />
                      이미 진행한 수업 기록하기
                    </button>
                    {pendingDelete === sequence.id && (
                      <div className="teaching-delete-confirm">
                        <p>이 시퀀스를 삭제할까요? 남긴 수업 기록은 유지됩니다.</p>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setPendingDelete(null)}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className="btn-secondary teaching-delete"
                          onClick={() => {
                            deleteSavedSequence(sequence.id);
                            setPendingDelete(null);
                            setMessage('시퀀스를 삭제했습니다.');
                          }}
                        >
                          삭제 확인
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {conditionTemplates.length > 0 && (
            <section className="panel teaching-template-panel">
              <div>
                <span className="eyebrow">다시 쓰는 조건</span>
                <h2 className="section-heading">저장한 수업 조건</h2>
                <p className="muted">조건을 불러온 뒤 계획에서 초안을 생성할 수 있어요.</p>
              </div>
              <div className="teaching-template-list">
                {conditionTemplates.map((template) => (
                  <button
                    type="button"
                    className="btn-secondary"
                    key={template.id}
                    onClick={() => {
                      applyConditionTemplate(template.id);
                      setActiveTab('workbench');
                    }}
                  >
                    {template.name}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {showGroupForm && (
            <form className="panel teaching-group-form" onSubmit={createGroup}>
              <h2 className="section-heading">수업 그룹 추가</h2>
              <p className="muted">실명과 건강 정보 없이 반 번호나 별칭을 사용해 주세요.</p>
              <div className="teaching-form-grid">
                <label className="form-field">
                  <span>그룹 별칭 *</span>
                  <input
                    required
                    maxLength={60}
                    placeholder="예: 저녁 A반, 개인 01"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>일정 (선택)</span>
                  <input
                    placeholder="예: 화·목 저녁"
                    value={groupSchedule}
                    onChange={(event) => setGroupSchedule(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>기본 난이도</span>
                  <select
                    value={groupLevel}
                    onChange={(event) => setGroupLevel(event.target.value as DifficultyLevel)}
                  >
                    <option value="1.0">Lv 1.0</option>
                    <option value="1.5">Lv 1.5</option>
                    <option value="2.0">Lv 2.0</option>
                  </select>
                </label>
              </div>
              <div className="teaching-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowGroupForm(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  그룹 추가
                </button>
              </div>
            </form>
          )}
          <div className="teaching-group-filters" aria-label="수업 그룹 필터">
            <button
              type="button"
              className={`teaching-filter ${selectedGroup === 'all' ? 'active' : ''}`}
              aria-pressed={selectedGroup === 'all'}
              onClick={() => setSelectedGroup('all')}
            >
              전체 기록
            </button>
            {classGroups.map((group) => (
              <button
                type="button"
                className={`teaching-filter ${selectedGroup === group.id ? 'active' : ''}`}
                aria-pressed={selectedGroup === group.id}
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
              >
                {group.name}
              </button>
            ))}
          </div>
          <div className="teaching-history-layout">
            <section className="teaching-history-feed" aria-label="수업 기록 목록">
              {actualLogs.length === 0 && (
                <div className="panel teaching-empty">
                  <History size={32} />
                  <h2>아직 남긴 수업 기록이 없어요</h2>
                  <p className="muted">
                    수업을 마친 뒤 날짜와 짧은 메모를 남겨 보세요.
                    <br />
                    아래 예시 기록은 내 수업 분석에 포함되지 않아요.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setActiveTab('workbench')}
                  >
                    오늘 수업 계획하기
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {logs.map((log) => {
                const isSample = sampleHistoryIds.has(log.id);
                const snapshot = log.stepsSnapshot;
                const exerciseIds = historyMovementIds(log);
                const restCount = snapshot?.filter(isRestStep).length ?? 0;
                const durations = snapshot ? getSequenceDurations(snapshot) : null;
                const missingExercise = exerciseIds.some((id) => !exercisesMap.has(id));
                return (
                  <article
                    key={log.id}
                    className={`panel teaching-history-card ${isSample ? 'teaching-sample-record' : ''}`}
                  >
                    <div className="teaching-card-top">
                      <span className="teaching-history-group">
                        <Users size={14} />
                        {log.groupName}
                      </span>
                      <time dateTime={log.taughtAt}>{formatDate(log.taughtAt)}</time>
                    </div>
                    {isSample && (
                      <span className="teaching-sample-label">예시 기록 · 실제 수업 아님</span>
                    )}
                    <h2>{log.sequenceTitle}</h2>
                    <div className="teaching-card-stats">
                      <span>{exerciseIds.length}개 동작</span>
                      {restCount > 0 && <span>휴식 {restCount}개</span>}
                      <span>
                        {log.actualDurationSec !== undefined
                          ? `타이머/입력 시간 ${Math.floor(log.actualDurationSec / 60)}분 ${Math.round(log.actualDurationSec % 60)}초`
                          : '실제 진행 시간 미기록'}
                      </span>
                      <span>강사 평가 {log.rating}/5</span>
                    </div>
                    {durations && (
                      <p className="teaching-rest-summary" aria-label="기록한 수업 계획 시간 구성">
                        계획 총 {formatSecondsToMMSS(durations.totalSec)} · 동작·설명·전환{' '}
                        {formatSecondsToMMSS(durations.exerciseSec)} · 휴식{' '}
                        {formatSecondsToMMSS(durations.restSec)}
                      </p>
                    )}
                    <p className="teaching-reflection">
                      {log.instructorReflection || '남긴 메모가 없습니다.'}
                    </p>
                    <div className="teaching-history-exercises">
                      {snapshot
                        ? snapshot.map((step) => (
                            <span key={step.stepId}>
                              {isRestStep(step)
                                ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}`
                                : (exercisesMap.get(step.exerciseId)?.nameKo ?? '삭제된 동작')}
                            </span>
                          ))
                        : exerciseIds.map((id, index) => (
                            <span key={`${id}-${index}`}>
                              {exercisesMap.get(id)?.nameKo ?? '삭제된 동작'}
                            </span>
                          ))}
                    </div>
                    <div className="teaching-history-bottom">
                      <span className="muted">
                        {missingExercise
                          ? '삭제된 동작이 있어 불러올 수 없습니다.'
                          : snapshot
                            ? restCount > 0
                              ? '당시 저장한 동작·휴식·시간으로 불러옵니다.'
                              : '당시 저장한 동작·시간으로 불러옵니다.'
                            : '구성 참고 · 시간은 현재 기본값으로 복원'}
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={missingExercise}
                        onClick={() => copyHistory(log.id)}
                      >
                        <Copy size={15} />이 수업 다시 계획
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
            <aside className="teaching-memory-aside">
              <section className="panel teaching-memory-card">
                <span className="eyebrow">반복을 살펴보세요</span>
                <h2 className="section-heading">현재 초안과 최근 수업</h2>
                <p className="muted">선택한 그룹의 실제 기록 최근 3회와 같은 동작 수입니다.</p>
                {recent.length === 0 ? (
                  <p className="teaching-insight-empty">기록을 남기면 비교가 시작됩니다.</p>
                ) : (
                  recent.map((log) => {
                    const shared = [...draftIds].filter((id) =>
                      historyMovementIds(log).includes(id),
                    ).length;
                    return (
                      <div className="teaching-overlap-row" key={log.id}>
                        <div>
                          <strong>{log.groupName}</strong>
                          <span>{formatDate(log.taughtAt)}</span>
                        </div>
                        <b>
                          {shared}
                          <small> / {draftIds.size}개</small>
                        </b>
                      </div>
                    );
                  })
                )}
              </section>
              <section className="panel teaching-memory-card">
                <FileText size={20} />
                <h2 className="section-heading">최근 5회에 포함된 동작</h2>
                {mostUsed.length === 0 ? (
                  <p className="muted">수업 기록을 바탕으로 표시합니다.</p>
                ) : (
                  <ul className="teaching-frequency-list">
                    {mostUsed.map(([id, count]) => (
                      <li key={id}>
                        <span>{exercisesMap.get(id)?.nameKo ?? '삭제된 동작'}</span>
                        <strong>{count}회</strong>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="muted">
                  반복 여부는 참고 정보입니다. 회원과 수업 목표에 따라 강사가 판단해 주세요.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
      <p className="teaching-local-note">
        자료는 이 브라우저에 저장됩니다. 다른 기기에서 사용하려면 설정에서 JSON 백업을 내보내세요.
      </p>
      <LightDismissDialog
        open={Boolean(printSequence)}
        onClose={() => setPrintSequence(null)}
        title="수업 계획 인쇄"
        subtitle="동작의 양쪽 수행·설명·전환과 별도 휴식을 포함한 전체 수업 시간입니다."
      >
        <div className="teaching-print-sheet">
          <p>강사 검토용 계획 · 스프링과 세팅은 실제 기구에서 확인해 주세요.</p>
          <pre>{printSequence ? sheetFor(printSequence) : ''}</pre>
        </div>
        <div className="teaching-form-actions">
          <button type="button" className="btn-secondary" onClick={() => setPrintSequence(null)}>
            닫기
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} />
            인쇄하기
          </button>
        </div>
      </LightDismissDialog>
    </div>
  );
};
