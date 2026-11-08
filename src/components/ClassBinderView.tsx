import { compareTeachingHistoryDates, getTeachingHistoryDateSource } from '../utils/teachingHistoryDate';
import React, { useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Clock3, Copy,
  Eye, FileText, FolderHeart, History, Play, Plus, Printer, ShieldCheck, Trash2, Users,
} from 'lucide-react';
import { APPARATUS_LABELS, INITIAL_HISTORY_LOGS, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { ClassCueSheetPreview } from '../features/classCueSheet/ClassCueSheetPreview';
import {
  PfAiStatusBadge, PfBadge, PfBlockPill, PfButton, PfCard, PfEmptyState,
  PfField, PfFormError, PfInput, PfMovementCard, PfSearchField, PfSelect, PfStatusBanner,
} from '../design-system';
import { useCloudSession } from '../lib/cloudSync';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLog, DifficultyLevel, SavedSequence, SequenceStep } from '../types/pilates';
import type { ClassHistoryLogWithSnapshot, ResolvedTeachingHistoryView } from '../types/teachingHistorySnapshot';
import { getSavedHumanMovementDrafts, getSavedReusableBlocks, isMovementIdeaExercise } from '../utils/movementIdeaDraft';
import { formatSecondsToMMSS, formatSequenceAsStudioSheet, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import {
  copyHistoryLogIntoWorkbenchSafely, formatTeachingHistorySnapshotText, resolveTeachingHistoryView,
} from '../utils/teachingHistorySnapshot';
import { LightDismissDialog } from './LightDismissDialog';
import type { TeachingLogContext } from './LogSessionModal';
import '../styles/design-tokens.css';
import '../styles/teaching.css';
import '../styles/rest.css';
import './ClassBinderView.css';

interface ClassBinderViewProps {
  onOpenLogModal: (sequenceId: string, context?: TeachingLogContext) => void;
  view?: 'saved' | 'history';
}

const INITIAL_VISIBLE_DATE_CHIPS = 3;
const INITIAL_VISIBLE_GROUP_CHIPS = 2;
const INITIAL_VISIBLE_HISTORY_LOGS = 30;
const HISTORY_LOGS_PAGE_SIZE = 30;

const sampleSequenceIds = new Set(INITIAL_SAVED_SEQUENCES.map((sequence) => sequence.id));
const sampleHistoryIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));
const historyMovementIds = (log: ClassHistoryLog) =>
  log.stepsSnapshot ? log.stepsSnapshot.filter((step) => !isRestStep(step)).map((step) => step.exerciseId) : log.exerciseIds.filter(Boolean);
const movementCount = (steps: SequenceStep[]) => steps.filter((step) => !isRestStep(step)).length;
const minutesLabel = (seconds: number) => Number((seconds / 60).toFixed(2));

const parseHistoryDate = (date: string): Date | null => {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed + 'T00:00:00.000Z');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const formatDate = (date: string) => {
  const dt = parseHistoryDate(date);
  return !dt ? '날짜 미상' : dt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', ...(/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? { timeZone: 'UTC' } : {}) });
};

const getHistoryDateKey = (date: string) => {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dt = parseHistoryDate(trimmed);
  return !dt ? 'unknown' : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const isDateOnlyTimestampString = (date: string) => {
  const trimmed = date.trim();
  return !trimmed || (!trimmed.includes('T') && !/\d{1,2}:\d{2}/.test(trimmed));
};

const hasExplicitDateOnlyMetadata = (log?: ClassHistoryLog): boolean => {
  if (!log) return false;
  if (isDateOnlyTimestampString(log.taughtAt)) return true;
  const raw = log as ClassHistoryLogWithSnapshot & {
    timestamps?: unknown; dateOnly?: unknown; isDateOnly?: unknown; timeRecorded?: unknown;
    recoveredDraftOrigin?: { timestamps?: unknown };
  };
  if (
    raw.timestamps === 'unrecorded' || raw.recoveredDraftOrigin?.timestamps === 'unrecorded' ||
    raw.dateOnly === true || raw.isDateOnly === true || raw.timeRecorded === false
  ) return true;
  const snap = raw.programSnapshot as (NonNullable<ClassHistoryLogWithSnapshot['programSnapshot']> & {
    timestamps?: unknown; dateOnly?: unknown; isDateOnly?: unknown; timeRecorded?: unknown;
  }) | undefined;
  if (!snap) return false;
  return (
    (typeof snap.taughtAt === 'string' && isDateOnlyTimestampString(snap.taughtAt)) ||
    snap.timestamps === 'unrecorded' || snap.dateOnly === true || snap.isDateOnly === true || snap.timeRecorded === false
  );
};

const formatHistoryTimeOfDay = (date: string, log?: ClassHistoryLog) => {
  const dt = parseHistoryDate(date);
  if (!dt || isDateOnlyTimestampString(date) || hasExplicitDateOnlyMetadata(log)) return null;
  return dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDateWithWeekday = (date: string) => {
  const dt = parseHistoryDate(date);
  return !dt ? '날짜 미상' : dt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', ...(/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? { timeZone: 'UTC' } : {}) });
};

const normalizeSearchToken = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeCompactSearch = (value: string) => value.trim().toLowerCase().replace(/[\s.\-/년월일&·,()[\]]+/g, '');
const INTENSITY_LABELS: Record<'relaxed' | 'moderate' | 'intense', string> = {
  relaxed: '여유롭게', moderate: '적당하게', intense: '집중해서',
};

export const ClassBinderView: React.FC<ClassBinderViewProps> = ({ onOpenLogModal, view = 'saved' }) => {
  const {
    savedSequences, classGroups, historyLogs, exercises, activeSteps, reformerBrand,
    conditionTemplates, persistenceError, loadSequenceIntoWorkbench, duplicateSavedSequence,
    deleteSavedSequence, applyConditionTemplate, addClassGroup, setActiveTab,
  } = usePilatesStore();
  const cloudPhase = useCloudSession((state) => state.phase);
  const cloudUser = useCloudSession((state) => state.user);
  const cloudBackup = useCloudSession((state) => state.backup);
  const [query, setQuery] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [showAllGroupChips, setShowAllGroupChips] = useState(false);
  const [showAllDateChips, setShowAllDateChips] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(INITIAL_VISIBLE_HISTORY_LOGS);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSchedule, setGroupSchedule] = useState('');
  const [groupLevel, setGroupLevel] = useState<DifficultyLevel>('1.5');
  const [groupFormError, setGroupFormError] = useState('');
  const [message, setMessage] = useState('');
  const [historyCopyError, setHistoryCopyError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [printSequence, setPrintSequence] = useState<SavedSequence | null>(null);
  const [showBinderCueSheet, setShowBinderCueSheet] = useState(false);
  const [reopenedHistoryId, setReopenedHistoryId] = useState<string | null>(null);
  const groupNameInputRef = useRef<HTMLInputElement | null>(null);
  const allGroupsChipRef = useRef<HTMLButtonElement | null>(null);
  const groupMoreToggleRef = useRef<HTMLButtonElement | null>(null);
  const allDatesChipRef = useRef<HTMLButtonElement | null>(null);
  const dateMoreToggleRef = useRef<HTMLButtonElement | null>(null);
  const reopenedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const groupErrorId = useId();

  const exercisesMap = useMemo(() => new Map(exercises.map((ex) => [ex.id, ex])), [exercises]);
  const rawReusableBlocks = getSavedReusableBlocks();
  const reusableBlocksKey = rawReusableBlocks.length === 0 ? '[]' : JSON.stringify(rawReusableBlocks);
  const reusableBlocks = useMemo(() => (reusableBlocksKey === '[]' ? [] : (JSON.parse(reusableBlocksKey) as typeof rawReusableBlocks)), [reusableBlocksKey]);
  const rawHumanDrafts = getSavedHumanMovementDrafts();
  const humanDraftsKey = rawHumanDrafts.length === 0 ? '[]' : JSON.stringify(rawHumanDrafts);
  const humanDrafts = useMemo(() => (humanDraftsKey === '[]' ? [] : (JSON.parse(humanDraftsKey) as typeof rawHumanDrafts)), [humanDraftsKey]);
  const resolvedHistoryMap = useMemo(() => {
    const map = new Map<string, ResolvedTeachingHistoryView>();
    for (const log of historyLogs) map.set(log.id, resolveTeachingHistoryView(log, exercisesMap, savedSequences, { reusableBlocks, humanDrafts }));
    return map;
  }, [historyLogs, exercisesMap, savedSequences, reusableBlocks, humanDrafts]);

  const sequences = useMemo(
    () => [...savedSequences].filter((s) => `${s.title} ${s.subtitle}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [savedSequences, query],
  );
  const totalActualLogsCount = useMemo(() => historyLogs.filter((log) => !sampleHistoryIds.has(log.id)).length, [historyLogs]);
  const groupAndQueryLogs = useMemo(
    () =>
      historyLogs
        .filter((log) => selectedGroup === 'all' || log.groupId === selectedGroup)
        .filter((log) => {
          const trimmed = normalizeSearchToken(historyQuery);
          if (!trimmed) return true;
          const compactQuery = normalizeCompactSearch(historyQuery);
          const resolved = resolvedHistoryMap.get(log.id);
          const stepNames = resolved?.steps.map((s) => `${s.nameKo} ${s.nameEn} ${s.blockNameKo} ${s.sourceBlockTitle ?? ''} ${s.ideaLineSnapshot ?? ''}`).join(' ') ?? '';
          const searchable = normalizeSearchToken(`${log.sequenceTitle} ${log.groupName} ${log.instructorReflection} ${getHistoryDateKey(getTeachingHistoryDateSource(log))} ${getTeachingHistoryDateSource(log).trim().slice(0, 10)} ${formatDate(getTeachingHistoryDateSource(log))} ${stepNames}`);
          return searchable.includes(trimmed) || (Boolean(compactQuery) && normalizeCompactSearch(searchable).includes(compactQuery));
        })
        .sort(compareTeachingHistoryDates),
    [historyLogs, selectedGroup, historyQuery, resolvedHistoryMap],
  );

  const visibleGroupFilterOptions = useMemo(() => {
    if (showAllGroupChips || classGroups.length <= INITIAL_VISIBLE_GROUP_CHIPS) return classGroups;
    const primarySlice = classGroups.slice(0, INITIAL_VISIBLE_GROUP_CHIPS);
    if (selectedGroup !== 'all' && !primarySlice.some((g) => g.id === selectedGroup)) {
      const activeGroup = classGroups.find((g) => g.id === selectedGroup);
      if (activeGroup) return [...primarySlice, activeGroup];
    }
    return primarySlice;
  }, [classGroups, showAllGroupChips, selectedGroup]);
  const hiddenGroupChipCount = Math.max(0, classGroups.length - visibleGroupFilterOptions.length);
  const hasCollapsibleGroupChips = showAllGroupChips ? classGroups.length > INITIAL_VISIBLE_GROUP_CHIPS : hiddenGroupChipCount > 0;

  const dateFilterOptions = useMemo(() => {
    const map = new Map<string, { dateKey: string; label: string; count: number; sampleLogTaughtAt: string }>();
    for (const log of groupAndQueryLogs) {
      const dateKey = getHistoryDateKey(getTeachingHistoryDateSource(log));
      const existing = map.get(dateKey);
      if (existing) existing.count += 1;
      else map.set(dateKey, { dateKey, label: formatDate(getTeachingHistoryDateSource(log)), count: 1, sampleLogTaughtAt: getTeachingHistoryDateSource(log) });
    }
    return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [groupAndQueryLogs]);

  const effectiveSelectedDate = useMemo(
    () => (selectedDate !== 'all' && dateFilterOptions.some((o) => o.dateKey === selectedDate) ? selectedDate : 'all'),
    [selectedDate, dateFilterOptions],
  );

  const visibleDateFilterOptions = useMemo(() => {
    if (showAllDateChips || dateFilterOptions.length <= INITIAL_VISIBLE_DATE_CHIPS) return dateFilterOptions;
    const recentSlice = dateFilterOptions.slice(0, INITIAL_VISIBLE_DATE_CHIPS);
    if (effectiveSelectedDate !== 'all' && !recentSlice.some((o) => o.dateKey === effectiveSelectedDate)) {
      const selectedOption = dateFilterOptions.find((o) => o.dateKey === effectiveSelectedDate);
      if (selectedOption) return [...recentSlice, selectedOption];
    }
    return recentSlice;
  }, [dateFilterOptions, showAllDateChips, effectiveSelectedDate]);

  const hiddenDateChipCount = Math.max(0, dateFilterOptions.length - visibleDateFilterOptions.length);
  const hasCollapsibleDateChips = showAllDateChips ? dateFilterOptions.length > INITIAL_VISIBLE_DATE_CHIPS : hiddenDateChipCount > 0;

  const logs = useMemo(
    () => (effectiveSelectedDate === 'all' ? groupAndQueryLogs : groupAndQueryLogs.filter((log) => getHistoryDateKey(getTeachingHistoryDateSource(log)) === effectiveSelectedDate)),
    [groupAndQueryLogs, effectiveSelectedDate],
  );
  const visibleLogs = useMemo(() => logs.slice(0, visibleHistoryCount), [logs, visibleHistoryCount]);
  const remainingHistoryCount = Math.max(0, logs.length - visibleLogs.length);

  const groupedLogsByDate = useMemo(() => {
    const groups: Array<{ dateKey: string; dateLabel: string; weekdayLabel: string; items: ClassHistoryLog[] }> = [];
    for (const log of visibleLogs) {
      const dateKey = getHistoryDateKey(getTeachingHistoryDateSource(log));
      const last = groups[groups.length - 1];
      if (last && last.dateKey === dateKey) last.items.push(log);
      else groups.push({ dateKey, dateLabel: formatDate(getTeachingHistoryDateSource(log)), weekdayLabel: formatDateWithWeekday(getTeachingHistoryDateSource(log)), items: [log] });
    }
    return groups;
  }, [visibleLogs]);

  const actualLogs = useMemo(() => logs.filter((log) => !sampleHistoryIds.has(log.id)), [logs]);
  const hasActiveHistoryFilter = Boolean(historyQuery.trim()) || selectedGroup !== 'all' || effectiveSelectedDate !== 'all';
  const resetHistoryFilters = () => {
    setHistoryQuery(''); setSelectedGroup('all'); setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS);
  };
  const recent = useMemo(() => actualLogs.slice(0, 3), [actualLogs]);
  const draftIds = useMemo(() => new Set(activeSteps.filter((step) => !isRestStep(step)).map((step) => step.exerciseId)), [activeSteps]);
  const { snapshotExerciseNames, mostUsed } = useMemo(() => {
    const nextCounts = new Map<string, number>();
    const nextNames = new Map<string, string>();
    for (const log of actualLogs.slice(0, 5)) {
      const resolved = resolvedHistoryMap.get(log.id);
      if (resolved) {
        for (const step of resolved.steps) {
          if (step.kind === 'exercise' && step.exerciseId && step.fromSnapshot) nextNames.set(step.exerciseId, step.nameKo);
        }
      }
      for (const id of new Set(historyMovementIds(log))) nextCounts.set(id, (nextCounts.get(id) ?? 0) + 1);
    }
    return { snapshotExerciseNames: nextNames, mostUsed: [...nextCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [actualLogs, resolvedHistoryMap]);

  const reopenedView = reopenedHistoryId ? (resolvedHistoryMap.get(reopenedHistoryId) ?? null) : null;
  const storageStatus = getRecoveryStorageStatus();

  const sheetFor = (sequence: SavedSequence) => {
    const durations = getSequenceDurations(sequence.steps);
    return `시간 구성: 총 ${minutesLabel(durations.totalSec)}분 · 동작·설명·전환 ${minutesLabel(durations.exerciseSec)}분 · 휴식 ${minutesLabel(durations.restSec)}분\n\n${formatSequenceAsStudioSheet(sequence.title, sequence.subtitle, sequence.steps, exercisesMap, reformerBrand)}`;
  };
  const downloadTxt = (filename: string, content: string, bannerMsg: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(bannerMsg);
  };
  const exportText = (sequence: SavedSequence) =>
    downloadTxt(`${sequence.title.replace(/[\\/:*?"<>|]/g, '-') || 'pilates-sequence'}.txt`, `강사 검토용 계획 · 동작 시간은 양쪽 수행·설명·전환을 포함하며 휴식은 별도 항목으로 전체 시간에 포함합니다.\n스프링은 원문 참고값이며 실제 기구에서 확인해 주세요.\n\n${sheetFor(sequence)}`, '텍스트 파일을 내보냈습니다.');
  const exportHistorySnapshotText = (viewItem: ResolvedTeachingHistoryView) =>
    downloadTxt(`${viewItem.sequenceTitle.replace(/[\\/:*?"<>|]/g, '-') || 'pilates-history'}-${getTeachingHistoryDateSource(viewItem).slice(0, 10)}.txt`, formatTeachingHistorySnapshotText(viewItem), '수업 완료 이력 스냅샷 텍스트를 내보냈습니다.');
  const createGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      setGroupFormError('수업 그룹 별칭을 입력해 주세요.');
      groupNameInputRef.current?.focus();
      return;
    }
    setGroupFormError('');
    addClassGroup({ name: groupName.trim(), type: 'group', defaultLevel: groupLevel, scheduleLabel: groupSchedule.trim(), notes: '' });
    setGroupName(''); setGroupSchedule(''); setShowGroupForm(false); setMessage('수업 그룹을 추가했습니다.');
  };
  const copyingRef = useRef(false);
  const copyHistory = (logId: string) => {
    if (copyingRef.current) return;
    copyingRef.current = true;
    try {
      const stateBeforeLoad = usePilatesStore.getState();
      copyHistoryLogIntoWorkbenchSafely(logId, usePilatesStore);
      const after = usePilatesStore.getState();
      setHistoryCopyError(after === stateBeforeLoad ? '' : (after.generationError ?? ''));
    } finally {
      copyingRef.current = false;
    }
  };

  const handleRovingKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    selector: string,
    isExpanded: boolean,
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
    toggleRef: React.RefObject<HTMLButtonElement | null>,
    activateOnNavigate = false,
  ) => {
    if (event.key === 'Escape' && isExpanded) {
      event.preventDefault(); setExpanded(false); toggleRef.current?.focus(); return;
    }
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(selector));
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1 || buttons.length === 0) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (currentIndex + 1) % buttons.length
      : (currentIndex - 1 + buttons.length) % buttons.length;
    const nextButton = buttons[nextIndex];
    nextButton?.focus();
    if (activateOnNavigate) nextButton?.click();
  };

  const closeReopenedModal = () => {
    const trigger = reopenedTriggerRef.current;
    setReopenedHistoryId(null);
    if (trigger?.isConnected) {
      trigger.focus();
      window.setTimeout(() => {
        if (trigger.isConnected) trigger.focus();
      }, 0);
    }
  };

  return (
    <div className={`teaching-collection ${view === 'history' ? 'teaching-collection--history' : 'teaching-collection--saved'}`}>
      <header className="teaching-page-header">
        <div>
          <span className="eyebrow">{view === 'saved' ? '나의 수업 서랍' : '다음 수업을 위한 기억'}</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            {view === 'saved' ? '저장한 시퀀스' : '수업 기록'}
            <PfBadge tone="sage" className="teaching-count">{view === 'saved' ? savedSequences.length : totalActualLogsCount}</PfBadge>
          </h1>
          <p className="muted">{view === 'saved' ? '마음에 드는 흐름을 보관하고, 오늘의 수업으로 이어가세요.' : '지난 수업을 다음 계획으로 이어가세요.'}</p>
        </div>
        <PfButton
          variant={view === 'saved' ? 'primary' : 'secondary'} aria-expanded={view === 'history' ? showGroupForm : undefined}
          onClick={() => { if (view === 'saved') setActiveTab('workbench'); else { setGroupFormError(''); setShowGroupForm((v) => !v); } }}
        >
          {view === 'saved' ? <><Plus size={17} /> 새 시퀀스 계획</> : <><Users size={17} /> 수업 그룹 추가</>}
        </PfButton>
      </header>
      <div className="teaching-separation-banner" aria-label={view === 'saved' ? '계획 및 템플릿 구분 안내' : '진행 완료 이력 스냅샷 보존 안내'}>
        <span className={`teaching-record-kind-badge ${view === 'saved' ? 'is-plan' : 'is-history'}`}>
          <ShieldCheck size={14} />{view === 'saved' ? '수업 계획 · 수정하고 다시 사용' : '진행한 수업 · 당시 내용 보존'}
        </span>
        <span className="teaching-contract-status" role={persistenceError || !storageStatus.ok ? 'alert' : undefined}>
          {persistenceError || !storageStatus.ok ? `기기 저장 확인 필요: ${persistenceError ?? (!storageStatus.ok ? storageStatus.message : '')}` : '이 기기 저장 사용 중'}
          {' · '}
          {cloudPhase === 'signed-in' ? `계정 연결됨 (${cloudUser?.email ?? '강사 계정'}${cloudBackup?.exists ? ' · 백업 있음' : ' · 계정 백업 미연결'})`
            : cloudPhase === 'unavailable' ? '계정 백업 미연결' : cloudPhase === 'checking' ? '계정 확인 중 · 기기 자료 사용 중' : '로그아웃 상태 · 기기 자료 사용 중'}
        </span>
      </div>
      {message && <PfStatusBanner tone="success">{message}</PfStatusBanner>}
      {view === 'history' && historyCopyError && <PfFormError>{historyCopyError}</PfFormError>}
      {view === 'saved' ? (
        <>
          <div className="teaching-collection-toolbar">
            <PfSearchField label="저장한 시퀀스 검색" wrapperClassName="teaching-search" placeholder="시퀀스 이름으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
            <span className="muted">최근 수정 순 · 이 브라우저에 저장됨</span>
          </div>
          {sequences.length === 0 ? (
            <PfEmptyState
              icon={<FolderHeart size={28} />} title={query ? '검색한 시퀀스가 없어요' : '첫 수업의 흐름을 저장해 보세요'}
              description={query ? '다른 이름으로 검색해 주세요.' : '계획에서 시퀀스를 만들고 저장하면 이곳에 모입니다.'}
              action={<PfButton variant="secondary" onClick={() => (query ? setQuery('') : setActiveTab('workbench'))}>{query ? '검색 지우기' : '수업 계획하기'}<ArrowRight size={16} /></PfButton>}
            />
          ) : (
            <div className="teaching-saved-grid">
              {sequences.map((sequence, index) => {
                const lastTaughtLog = historyLogs.find(log => log.sequenceId === sequence.id && log.taughtAt === sequence.lastTaughtAt);
                const lastTaughtDate = lastTaughtLog ? getTeachingHistoryDateSource(lastTaughtLog) : sequence.lastTaughtAt;
                const durations = getSequenceDurations(sequence.steps);
                const exerciseCount = movementCount(sequence.steps);
                const restCount = sequence.steps.length - exerciseCount;
                return (
                  <PfCard as="article" variant="interactive" className="teaching-sequence-card" key={sequence.id}>
                    <div className="teaching-card-top">
                      <span className="teaching-card-label">
                        {String(index + 1).padStart(2, '0')} · {sequence.apparatus === 'mixed' ? '여러 기구' : APPARATUS_LABELS[sequence.apparatus].ko}
                        {sampleSequenceIds.has(sequence.id) && ' · 예시'}
                      </span>
                      <PfBadge tone="sage" shape="rect" className="teaching-level">Lv {sequence.level}</PfBadge>
                    </div>
                    <h2>{sequence.title}</h2>
                    <p className="muted teaching-sequence-subtitle">{sequence.subtitle || '내가 만든 수업 흐름'}</p>
                    {sequence.recoveredDraftOrigin && <p className="muted" data-recovered-draft="true">이전 편집 초안에서 복구한 자료 · 수업 전 조건을 확인해 주세요.</p>}
                    <div className="teaching-card-stats">
                      <span><Clock3 size={15} />{minutesLabel(durations.totalSec)}분</span>
                      <span>{exerciseCount}개 동작</span>
                      {restCount > 0 && <span>휴식 {restCount}개</span>}
                      <span>기록 {historyLogs.filter((l) => l.sequenceId === sequence.id && !sampleHistoryIds.has(l.id)).length}회</span>
                    </div>
                    {restCount > 0 && <p className="teaching-rest-summary" aria-label="저장 수업 시간 구성">동작·설명·전환 {formatSecondsToMMSS(durations.exerciseSec)} · 휴식 {formatSecondsToMMSS(durations.restSec)}</p>}
                    <ol className="teaching-flow-preview">
                      {sequence.steps.slice(0, 4).map((step) => {
                        const ex = exercisesMap.get(step.exerciseId);
                        return (
                          <PfBlockPill as="li" key={step.stepId} kind={isRestStep(step) ? 'rest' : ex && isMovementIdeaExercise(ex) ? 'memo' : 'movement'}>
                            {isRestStep(step) ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}` : (ex?.nameKo ?? '삭제된 동작')}
                          </PfBlockPill>
                        );
                      })}
                      {sequence.steps.length > 4 && <PfBlockPill as="li" className="muted">외 {sequence.steps.length - 4}개 항목</PfBlockPill>}
                    </ol>
                    <p className="teaching-card-date">{lastTaughtDate ? `최근 수업 ${formatDate(lastTaughtDate)}` : `수정 ${formatDate(sequence.updatedAt)}`}</p>
                    <div className="teaching-card-main-actions">
                      <PfButton variant="primary" onClick={() => loadSequenceIntoWorkbench(sequence.id)}><BookOpen size={16} /> 불러오기</PfButton>
                      <PfButton variant="secondary" onClick={() => { loadSequenceIntoWorkbench(sequence.id); setActiveTab('stage'); }}><Play size={16} /> 수업 시작</PfButton>
                    </div>
                    <div className="teaching-card-tools">
                      <PfButton variant="ghost" onClick={() => { if (duplicateSavedSequence(sequence.id)) setMessage('복사본을 저장했습니다. 원본의 기록은 그대로 유지됩니다.'); }}><Copy size={15} /> 복제</PfButton>
                      <PfButton variant="ghost" onClick={() => setPrintSequence(sequence)}><Printer size={15} /> 인쇄</PfButton>
                      <PfButton variant="ghost" onClick={() => exportText(sequence)}><ArrowDownToLine size={15} /> 텍스트</PfButton>
                      <PfButton variant="icon" className="teaching-delete" aria-label={`${sequence.title} 삭제`} onClick={() => setPendingDelete(sequence.id)}><Trash2 size={16} /></PfButton>
                    </div>
                    <button type="button" className="teaching-log-link" onClick={() => onOpenLogModal(sequence.id, { stepsSnapshot: sequence.steps, sequenceTitle: sequence.title })}>
                      <CalendarDays size={15} /> 이미 진행한 수업 기록하기
                    </button>
                    {pendingDelete === sequence.id && (
                      <div className="teaching-delete-confirm" role="region" aria-label="시퀀스 삭제 확인">
                        <p>이 시퀀스를 삭제할까요? 남긴 수업 기록은 유지됩니다.</p>
                        <PfButton variant="secondary" onClick={() => setPendingDelete(null)}>취소</PfButton>
                        <PfButton variant="danger" onClick={() => { deleteSavedSequence(sequence.id); setPendingDelete(null); setMessage('시퀀스를 삭제했습니다.'); }}>삭제 확인</PfButton>
                      </div>
                    )}
                  </PfCard>
                );
              })}
            </div>
          )}
          {conditionTemplates.length > 0 && (
            <PfCard as="section" className="teaching-template-panel">
              <div><span className="eyebrow">다시 쓰는 조건</span><h2 className="section-heading">저장한 수업 조건</h2><p className="muted">조건을 불러온 뒤 계획에서 초안을 생성할 수 있어요.</p></div>
              <div className="teaching-template-list">
                {conditionTemplates.map((template) => (
                  <PfButton variant="secondary" key={template.id} onClick={() => { applyConditionTemplate(template.id); setActiveTab('workbench'); }}>{template.name}<ArrowRight size={16} /></PfButton>
                ))}
              </div>
            </PfCard>
          )}
        </>
      ) : (
        <>
          {showGroupForm && (
            <form className="panel pf-card teaching-group-form" noValidate onSubmit={createGroup}>
              <h2 className="section-heading">수업 그룹 추가</h2>
              <p className="muted">실명과 건강 정보 없이 반 번호나 별칭을 사용해 주세요.</p>
              <div className="teaching-form-grid">
                <PfField label="그룹 별칭 *" error={groupFormError} errorId={groupErrorId}>
                  <PfInput
                    ref={groupNameInputRef} required maxLength={60} hasError={Boolean(groupFormError)}
                    aria-describedby={groupFormError ? groupErrorId : undefined} placeholder="예: 저녁 A반, 개인 01"
                    value={groupName} onChange={(e) => { setGroupName(e.target.value); if (groupFormError) setGroupFormError(''); }}
                  />
                </PfField>
                <PfField label="일정 (선택)"><PfInput placeholder="예: 화·목 저녁" value={groupSchedule} onChange={(e) => setGroupSchedule(e.target.value)} /></PfField>
                <PfField label="기본 난이도">
                  <PfSelect value={groupLevel} onChange={(e) => setGroupLevel(e.target.value as DifficultyLevel)}>
                    <option value="1.0">Lv 1.0</option><option value="1.5">Lv 1.5</option><option value="2.0">Lv 2.0</option>
                  </PfSelect>
                </PfField>
              </div>
              <div className="teaching-form-actions">
                <PfButton variant="secondary" onClick={() => { setGroupFormError(''); setShowGroupForm(false); }}>취소</PfButton>
                <PfButton type="submit" variant="primary">그룹 추가</PfButton>
              </div>
            </form>
          )}
          <div className="teaching-collection-toolbar">
            <PfSearchField
              label="수업 기록 검색" wrapperClassName="teaching-search"
              placeholder="수업 제목, 반 이름, 날짜, 당시 동작·블록으로 찾기" value={historyQuery}
              onChange={(e) => { setHistoryQuery(e.target.value); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); }}
            />
            <span className="muted">최근 진행 순 · 당시 동작·블록·순서·시간 스냅샷 보존</span>
          </div>
          <details className="teaching-history-filters">
            <summary>날짜·그룹 필터{selectedGroup !== 'all' || effectiveSelectedDate !== 'all' ? ' · 선택 중' : ''}</summary>
          <div
            className={`pf-tabs pf-tabs--pills teaching-group-filters ${showAllGroupChips ? 'is-expanded' : 'is-collapsed'}`}
            role="group" aria-label="수업 그룹 필터"
            onKeyDown={(e) => handleRovingKeyDown(e, 'button.teaching-filter:not(:disabled)', showAllGroupChips, setShowAllGroupChips, groupMoreToggleRef, true)}
          >
            <div className="teaching-group-chip-list">
              <button
                type="button" ref={allGroupsChipRef} data-tab-id="all" aria-pressed={selectedGroup === 'all'}
                className={`pf-tab teaching-filter teaching-group-pill ${selectedGroup === 'all' ? 'active' : ''}`}
                onClick={() => { setSelectedGroup('all'); setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); }}
              >
                전체 기록
              </button>
              {visibleGroupFilterOptions.map((group) => (
                <button
                  type="button" key={group.id} data-tab-id={group.id} aria-pressed={selectedGroup === group.id}
                  className={`pf-tab teaching-filter teaching-group-pill ${selectedGroup === group.id ? 'active' : ''}`}
                  onClick={() => { setSelectedGroup(group.id); setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); }}
                >
                  {group.name}
                </button>
              ))}
            </div>
            {hasCollapsibleGroupChips && (
              <button
                type="button" ref={groupMoreToggleRef} className="teaching-date-reset teaching-group-more-toggle" aria-expanded={showAllGroupChips}
                onClick={() => { setShowAllGroupChips((prev) => !prev); groupMoreToggleRef.current?.focus(); }}
              >
                {showAllGroupChips ? '그룹 접기' : `그룹 더보기 (+${hiddenGroupChipCount}개)`}
              </button>
            )}
            {selectedGroup !== 'all' && (
              <button
                type="button" className="teaching-date-reset teaching-group-reset"
                onClick={() => { setSelectedGroup('all'); setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); allGroupsChipRef.current?.focus(); }}
              >
                전체 그룹 보기
              </button>
            )}
          </div>
          {dateFilterOptions.length > 0 && (
            <div
              className={`teaching-date-nav ${showAllDateChips ? 'is-expanded' : 'is-collapsed'}`}
              role="group" aria-label="날짜별 기록 탐색"
              onKeyDown={(e) => handleRovingKeyDown(e, 'button.teaching-date-chip:not(:disabled)', showAllDateChips, setShowAllDateChips, dateMoreToggleRef)}
            >
              <span className="teaching-date-nav-label"><CalendarDays size={14} aria-hidden="true" />날짜별 탐색</span>
              <div className="teaching-date-chip-list">
                <button
                  type="button" ref={allDatesChipRef} className={`teaching-date-chip ${effectiveSelectedDate === 'all' ? 'is-active' : ''}`}
                  aria-pressed={effectiveSelectedDate === 'all'} onClick={() => { setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); }}
                >
                  전체 날짜<span className="teaching-date-chip-count">{groupAndQueryLogs.length}</span>
                </button>
                {visibleDateFilterOptions.map((option) => (
                  <button
                    type="button" key={option.dateKey} className={`teaching-date-chip ${effectiveSelectedDate === option.dateKey ? 'is-active' : ''}`}
                    aria-pressed={effectiveSelectedDate === option.dateKey} onClick={() => { setSelectedDate(option.dateKey); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); }}
                  >
                    {option.label}<span className="teaching-date-chip-count">{option.count}</span>
                  </button>
                ))}
              </div>
              {hasCollapsibleDateChips && (
                <button
                  type="button" ref={dateMoreToggleRef} className="teaching-date-reset teaching-date-more-toggle" aria-expanded={showAllDateChips}
                  onClick={() => { setShowAllDateChips((prev) => !prev); dateMoreToggleRef.current?.focus(); }}
                >
                  {showAllDateChips ? '날짜 접기' : `이전 날짜 더보기 (+${hiddenDateChipCount}일)`}
                </button>
              )}
              {effectiveSelectedDate !== 'all' && (
                <button
                  type="button" className="teaching-date-reset"
                  onClick={() => { setSelectedDate('all'); setVisibleHistoryCount(INITIAL_VISIBLE_HISTORY_LOGS); allDatesChipRef.current?.focus(); }}
                >
                  전체 날짜 보기
                </button>
              )}
            </div>
          )}
          </details>
          {(selectedGroup !== 'all' || effectiveSelectedDate !== 'all') && (
            <div className="teaching-history-filter-status">
              <span>{selectedGroup === 'all' ? '전체 그룹' : classGroups.find((group) => group.id === selectedGroup)?.name} · {effectiveSelectedDate === 'all' ? '전체 날짜' : dateFilterOptions.find((date) => date.dateKey === effectiveSelectedDate)?.label}</span>
              <PfButton variant="secondary" onClick={resetHistoryFilters}>선택 해제</PfButton>
            </div>
          )}
          <div className="teaching-history-layout">
            <section className="teaching-history-feed" aria-label="수업 기록 목록">
              {(logs.length === 0 || (!hasActiveHistoryFilter && actualLogs.length === 0)) && (
                <PfEmptyState
                  icon={<History size={28} />}
                  title={
                    hasActiveHistoryFilter
                      ? historyQuery.trim() && selectedGroup === 'all' && effectiveSelectedDate === 'all'
                        ? '검색한 수업 완료 기록이 없어요'
                        : effectiveSelectedDate !== 'all' ? '선택한 날짜에 남긴 수업 기록이 없어요' : '선택한 그룹에 남긴 수업 기록이 없어요'
                      : '아직 남긴 수업 기록이 없어요'
                  }
                  description={
                    hasActiveHistoryFilter ? '다른 날짜·그룹을 선택하거나 필터를 초기화해 전체 기록을 확인해 보세요.'
                    : <>수업을 마친 뒤 날짜와 짧은 메모를 남겨 보세요.<br />아래 예시 기록은 내 수업 분석에 포함되지 않아요.</>
                  }
                  action={
                    <PfButton variant="secondary" onClick={() => (hasActiveHistoryFilter ? resetHistoryFilters() : setActiveTab('workbench'))}>
                      {hasActiveHistoryFilter ? (historyQuery.trim() && selectedGroup === 'all' && effectiveSelectedDate === 'all' ? '검색 지우기' : '필터 초기화') : '오늘 수업 계획하기'}
                      <ArrowRight size={16} />
                    </PfButton>
                  }
                />
              )}
              {groupedLogsByDate.map((dateGroup) => (
                <div className="teaching-history-date-group" key={dateGroup.dateKey} data-date-group={dateGroup.dateKey}>
                  <div className="teaching-history-date-header">
                    <div className="teaching-history-date-title"><CalendarDays size={15} aria-hidden="true" /><strong>{dateGroup.weekdayLabel}</strong></div>
                    <span className="teaching-history-date-count">수업 기록 {dateGroup.items.length}건</span>
                  </div>
                  {dateGroup.items.map((log) => {
                    const isSample = sampleHistoryIds.has(log.id);
                    const resolved = resolvedHistoryMap.get(log.id) ?? resolveTeachingHistoryView(log, exercisesMap, savedSequences, { reusableBlocks, humanDrafts });
                    const hasStepTimings = Boolean(log.stepsSnapshot || resolved.hasPreservedSnapshot);
                    const missingExercise = !resolved.canCopyToNextClass;
                    const timeOfDay = formatHistoryTimeOfDay(resolved.taughtAt, log);
                    const plannedMinutes = Math.max(1, Math.round(resolved.timing.plannedTotalSec / 60));
                    return (
                      <PfCard as="article" key={log.id} variant={isSample ? 'sample' : 'default'} className="teaching-history-card">
                        <div className="teaching-card-top">
                          <div className="teaching-history-datetime">
                            <time className="teaching-history-card-date" dateTime={getTeachingHistoryDateSource(resolved)}>{formatDate(getTeachingHistoryDateSource(resolved))}</time>
                            {timeOfDay && <span className="teaching-history-time-of-day">{timeOfDay}</span>}
                            <span className="teaching-history-time-pill">
                              <Clock3 size={12} aria-hidden="true" />{log.actualDurationSec !== undefined ? `${Math.max(1, Math.round(log.actualDurationSec / 60))}분 진행` : `계획 ${plannedMinutes}분`}
                            </span>
                          </div>
                          <span className="teaching-history-group"><Users size={14} aria-hidden="true" />{resolved.groupName}</span>
                        </div>
                        {isSample && <PfAiStatusBadge kind="sample-data" className="teaching-sample-label" />}
                        <h2>{resolved.sequenceTitle}</h2>
                        <p className="teaching-reflection">{log.instructorReflection || '남긴 메모가 없습니다.'}</p>
                          {resolved.hasCatalogDrift && <span className="teaching-drift-badge" data-snapshot-preserved="true">원본 수정 후에도 당시 스냅샷 유지됨</span>}
                        <div className="teaching-history-bottom">
                          <span className="muted">
                            {missingExercise ? '삭제된 동작이 있어 불러올 수 없습니다.'
                              : hasStepTimings ? (resolved.restCount > 0 ? '당시 저장한 동작·휴식·시간으로 불러옵니다.' : '당시 저장한 동작·시간으로 불러옵니다.')
                              : '구성 참고 · 시간은 현재 기본값으로 복원'}
                          </span>
                          <div className="teaching-history-actions">
                            <PfButton variant="secondary" onClick={(e) => { reopenedTriggerRef.current = e.currentTarget; setReopenedHistoryId(log.id); }}><Eye size={15} />이력 다시 열기</PfButton>
                            <PfButton variant="primary" disabled={missingExercise} onClick={() => copyHistory(log.id)}><Copy size={15} />이 수업 다시 계획</PfButton>
                          </div>
                        </div>
                        <details className="teaching-history-details">
                          <summary>수업 구성 · {resolved.movementCount}개 동작 보기</summary>
                        <div className="teaching-card-stats">
                          <span>{resolved.movementCount}개 동작</span>{resolved.restCount > 0 && <span>휴식 {resolved.restCount}개</span>}
                          <span>{log.actualDurationSec !== undefined ? `타이머/입력 시간 ${Math.floor(log.actualDurationSec / 60)}분 ${Math.round(log.actualDurationSec % 60)}초` : '실제 진행 시간 미기록'}</span>
                          <span>강사 평가 {log.rating}/5</span>
                        </div>
                        {hasStepTimings && (
                          <p className="teaching-rest-summary" aria-label="기록한 수업 계획 시간 구성">
                            계획 총 {formatSecondsToMMSS(resolved.timing.plannedTotalSec)} · 동작·설명·전환 {formatSecondsToMMSS(resolved.timing.plannedExerciseSec)} · 휴식 {formatSecondsToMMSS(resolved.timing.plannedRestSec)}
                          </p>
                        )}
                        <div className="teaching-history-badges">
                          <span className="teaching-record-kind-badge is-history">진행 완료 이력</span>
                          <span className="teaching-record-source-badge">{resolved.sourceKind === 'saved-sequence' ? '저장 시퀀스 기반' : '수업 초안 기반'}</span>
                          {resolved.hasPreservedSnapshot && <span className="teaching-snapshot-badge">당시 동작·블록·시간 스냅샷 보존</span>}
                          {resolved.blockSnapshots.length > 0 && <span className="teaching-snapshot-badge">재사용 블록 {resolved.blockSnapshots.length}개 스냅샷</span>}
                        </div>
                        <div className="teaching-history-exercises">
                          {resolved.steps.map((step) => (
                            <PfBlockPill
                              as="span" key={step.stepId}
                              kind={step.kind === 'rest' ? 'rest' : step.exerciseId?.startsWith('ex-custom-idea-') ? 'memo' : 'movement'}
                              title={step.kind === 'rest' ? `휴식 (${step.durationMin}분)` : `${String(step.order).padStart(2, '0')}. [${step.sourceBlockTitle ? `${step.blockNameKo} · ${step.sourceBlockTitle}` : step.blockNameKo}] ${step.nameKo} (${step.durationMin}분)`}
                            >
                              {step.kind === 'rest' ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}` : step.isMissingUnrecoverable ? '삭제된 동작' : step.nameKo}
                            </PfBlockPill>
                          ))}
                        </div>
                        </details>
                      </PfCard>
                    );
                  })}
                </div>
              ))}
              {remainingHistoryCount > 0 && (
                <div className="teaching-history-load-more">
                  <PfButton variant="secondary" className="teaching-history-load-more-btn" onClick={() => setVisibleHistoryCount((prev) => prev + HISTORY_LOGS_PAGE_SIZE)}>
                    이전 수업 기록 더 보기 ({visibleLogs.length} / {logs.length}건 표시 중 · 남은 {remainingHistoryCount}건)
                  </PfButton>
                </div>
              )}
            </section>
            <aside className="teaching-memory-aside">
              <PfCard as="section" className="teaching-memory-card">
                <span className="eyebrow">반복을 살펴보세요</span><h2 className="section-heading">현재 초안과 최근 수업</h2>
                <p className="muted">선택한 그룹의 실제 기록 최근 3회와 같은 동작 수입니다.</p>
                {recent.length === 0 ? <p className="teaching-insight-empty">기록을 남기면 비교가 시작됩니다.</p> : (
                  recent.map((log) => {
                    const shared = [...draftIds].filter((id) => historyMovementIds(log).includes(id)).length;
                    return (
                      <div className="teaching-overlap-row" key={log.id}>
                        <div><strong>{log.groupName}</strong><span>{formatDate(getTeachingHistoryDateSource(log))} · {log.sequenceTitle}</span></div>
                        <b>{shared}<small> / {draftIds.size}개</small></b>
                      </div>
                    );
                  })
                )}
              </PfCard>
              <PfCard as="section" className="teaching-memory-card">
                <FileText size={20} /><h2 className="section-heading">최근 5회에 포함된 동작</h2>
                {mostUsed.length === 0 ? <p className="muted">수업 기록을 바탕으로 표시합니다.</p> : (
                  <ul className="teaching-frequency-list">
                    {mostUsed.map(([id, count]) => <li key={id}><span>{snapshotExerciseNames.get(id) ?? exercisesMap.get(id)?.nameKo ?? '삭제된 동작'}</span><strong>{count}회</strong></li>)}
                  </ul>
                )}
                <p className="muted">반복 여부는 참고 정보입니다. 회원과 수업 목표에 따라 강사가 판단해 주세요.</p>
              </PfCard>
            </aside>
          </div>
        </>
      )}
      <p className="teaching-local-note">자료는 이 브라우저에 저장됩니다. 다른 기기에서 사용하려면 설정에서 JSON 백업을 내보내세요.</p>
      <LightDismissDialog open={Boolean(printSequence)} onClose={() => setPrintSequence(null)} title="수업 계획 인쇄" subtitle="동작의 양쪽 수행·설명·전환과 별도 휴식을 포함한 전체 수업 시간입니다.">
        <div className="teaching-print-sheet">
          <p>강사 검토용 계획 · 스프링과 세팅은 실제 기구에서 확인해 주세요.</p>
          <pre>{printSequence ? sheetFor(printSequence) : ''}</pre>
          {printSequence && (
            <details className="teaching-cue-sheet-disclosure" open={showBinderCueSheet} onToggle={(e) => setShowBinderCueSheet(e.currentTarget.open)}>
              <summary>구조형 수업 큐시트 보기</summary>
              {showBinderCueSheet && <ClassCueSheetPreview sourceInput={printSequence} projectionOptions={{ exercises }} />}
            </details>
          )}
        </div>
        <div className="teaching-form-actions">
          <PfButton variant="secondary" onClick={() => setPrintSequence(null)}>닫기</PfButton>
          <PfButton variant="primary" onClick={() => window.print()}><Printer size={16} /> 인쇄하기</PfButton>
        </div>
      </LightDismissDialog>
      <LightDismissDialog
        open={Boolean(reopenedView)} onClose={closeReopenedModal} title="진행 완료 수업 이력 상세"
        subtitle={reopenedView ? `${reopenedView.sequenceTitle} · ${formatDate(getTeachingHistoryDateSource(reopenedView))}` : ''} maxWidth="760px"
      >
        {reopenedView && (
          <div className="teaching-history-detail-modal">
            <div className="teaching-history-detail-meta">
              <div className="teaching-history-badges">
                <span className="teaching-record-kind-badge is-history"><ShieldCheck size={13} /> 진행 완료 이력 스냅샷 (계획/템플릿과 분리됨)</span>
                <span className="teaching-record-source-badge">{reopenedView.sourceKind === 'saved-sequence' ? '원본 구분: 저장 시퀀스 계획' : '원본 구분: 작업대 수업 초안'}</span>
                {reopenedView.blockSnapshots.map((b) => <span key={b.blockInstanceId} className="teaching-snapshot-badge">블록 스냅샷: {b.sourceBlockTitle} (v{b.sourceBlockVersion})</span>)}
                {reopenedView.hasCatalogDrift && <span className="teaching-drift-badge" data-snapshot-preserved="true">원본 동작·블록 수정 후에도 당시 이력 스냅샷 그대로 보존됨</span>}
              </div>
              <dl className="teaching-history-detail-grid">
                <div><dt>진행 일시</dt><dd>{formatDate(getTeachingHistoryDateSource(reopenedView))} ({getHistoryDateKey(getTeachingHistoryDateSource(reopenedView))})</dd></div>
                <div><dt>대상 반 · 레벨</dt><dd>{reopenedView.groupName} · {reopenedView.apparatus === 'mixed' ? '여러 기구' : APPARATUS_LABELS[reopenedView.apparatus].ko} · Lv. {reopenedView.level}</dd></div>
                <div>
                  <dt>당시 계획 시간 스냅샷</dt>
                  <dd>총 {formatSecondsToMMSS(reopenedView.timing.plannedTotalSec)} (동작·설명·전환 {formatSecondsToMMSS(reopenedView.timing.plannedExerciseSec)} · 휴식 {formatSecondsToMMSS(reopenedView.timing.plannedRestSec)})</dd>
                </div>
                <div>
                  <dt>실제 진행 시간 · 평가</dt>
                  <dd>
                    {reopenedView.timing.actualDurationSec !== undefined
                      ? `실제 ${formatSecondsToMMSS(reopenedView.timing.actualDurationSec)}${reopenedView.timing.actualRestDurationSec ? ` (휴식 ${formatSecondsToMMSS(reopenedView.timing.actualRestDurationSec)})` : ''}`
                      : '실제 진행 시간 미기록'}{' '}
                    · 평가 {reopenedView.rating}/5 · {INTENSITY_LABELS[reopenedView.intensity]}
                  </dd>
                </div>
              </dl>
              {reopenedView.instructorReflection && <p className="teaching-reflection"><strong>당시 강사 메모:</strong> {reopenedView.instructorReflection}</p>}
            </div>
            <section className="teaching-history-snapshot-section" aria-label="당시 수업 블록 및 동작 순서">
              <h3 className="section-heading">당시 진행한 블록 · 동작 · 순서 · 시간 ({reopenedView.movementCount}개 동작{reopenedView.restCount > 0 ? ` · 휴식 ${reopenedView.restCount}개` : ''})</h3>
              <ol className="teaching-history-snapshot-list">
                {reopenedView.steps.map((step) => (
                  <PfMovementCard as="li" variant="step" key={step.stepId} className={`teaching-history-snapshot-item ${step.kind === 'rest' ? 'is-rest' : ''}`}>
                    <div className="teaching-history-snapshot-row">
                      <span className="teaching-step-order">{String(step.order).padStart(2, '0')}</span>
                      <PfBlockPill kind={step.kind === 'rest' ? 'rest' : 'movement'} className="teaching-step-block-badge">
                        {step.kind === 'rest' ? `휴식 · ${step.classSectionLabelKo}` : `${step.blockNameKo} · ${step.classSectionLabelKo}`}
                      </PfBlockPill>
                      {step.sourceBlockTitle && <span className="teaching-step-block-badge">블록: {step.sourceBlockTitle} v{step.sourceBlockVersion ?? 1}</span>}
                      {step.sourceOrigin === 'human-created' && <span className="teaching-step-block-badge">창작 초안 rev.{step.humanDraftRevision ?? 1}</span>}
                      <strong>{step.kind === 'rest' ? '휴식' : step.isMissingUnrecoverable ? '삭제된 동작' : step.nameKo}</strong>
                      {step.nameEn && step.kind !== 'rest' && <small className="muted">({step.nameEn})</small>}
                      {step.isCatalogModified && <PfBadge tone="warning" className="teaching-step-drift-tag">원본 동작 수정됨 · 당시 값 표시</PfBadge>}
                      {step.isCatalogDeleted && <PfBadge tone="warning" className="teaching-step-drift-tag">원본 동작 삭제됨 · 스냅샷 복원 가능</PfBadge>}
                      {step.isBlockTemplateModified && <span className="teaching-step-drift-tag">원본 블록 수정됨 · 당시 블록 유지</span>}
                      {step.isBlockTemplateDeleted && <span className="teaching-step-drift-tag">원본 블록 삭제됨 · 스냅샷 유지</span>}
                      <span className="teaching-step-duration">{formatSecondsToMMSS(step.durationMin * 60)} ({step.durationMin}분)</span>
                    </div>
                    {step.kind === 'exercise' ? (
                      <div className="teaching-history-snapshot-details">
                        <span>수행 {formatSecondsToMMSS(step.movementSec)} · 설명 {step.explanationSec}초 · 전환 {step.transitionSec}초</span>
                        <span>레이어: {step.selectedLayerLabelKo}{step.selectedLayerDescription ? ` — ${step.selectedLayerDescription}` : ''}</span>
                        {step.effectiveSprings && <span>당시 스프링: {step.effectiveSprings}</span>}
                        {step.repetitions !== undefined && step.sets !== undefined && <span>반복·세트: {step.repetitions}회 × {step.sets}세트</span>}
                        {step.ideaLineSnapshot && <span>당시 창작 아이디어: {step.ideaLineSnapshot}</span>}
                        {step.cues[0] && <span>당시 핵심 큐: {step.cues[0]}</span>}
                        {step.instructorNote && <span>당시 메모: {step.instructorNote}</span>}
                      </div>
                    ) : step.instructorNote && <div className="teaching-history-snapshot-details"><span>당시 휴식 메모: {step.instructorNote}</span></div>}
                  </PfMovementCard>
                ))}
              </ol>
            </section>
            <div className="teaching-form-actions">
              <PfButton variant="secondary" onClick={closeReopenedModal}>닫기</PfButton>
              <PfButton variant="ghost" onClick={() => exportHistorySnapshotText(reopenedView)}><ArrowDownToLine size={16} /> 스냅샷 텍스트 내보내기</PfButton>
              <PfButton variant="primary" disabled={!reopenedView.canCopyToNextClass} onClick={() => { copyHistory(reopenedView.logId); setReopenedHistoryId(null); }}>
                <Copy size={16} /> 복사해 다음 수업 만들기
              </PfButton>
            </div>
          </div>
        )}
      </LightDismissDialog>
    </div>
  );
};
