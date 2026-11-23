import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Layers,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  ClassHistoryLog,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import {
  buildMonthlyInstructorGrowthReport,
  buildSubInstructorHandoffBrief,
  generatePostClassFollowUpDraft,
  renderFaqTemplateText,
  STUDIO_FAQ_QUICK_TEMPLATES,
} from '../utils/instructorChoreAutomation';
import type { StudioFaqTemplateId } from '../utils/instructorChoreAutomation';
import {
  adaptSequenceSpringsForVenue,
  autoAdaptSequenceForResources,
  createDefaultResourceQuantities,
  DEFAULT_CONCURRENT_SESSIONS,
  DEFAULT_FREELANCE_VENUE_PRESETS,
  DEFAULT_STUDIO_INVENTORY,
  detectTimeSlotResourceConflicts,
  FREELANCE_FEE_LOG_STORAGE_KEY,
  getStudioResourceLabelKo,
  loadSavedStudioRoleMode,
  saveStudioRoleMode,
  STUDIO_RESOURCE_CATALOG,
  STUDIO_ROLE_MODES,
  summarizeFreelanceEarnings,
} from '../utils/studioPropAllocator';
import type {
  AutoAdaptStrategyId,
  AutoAdaptStrategyOption,
  ConcurrentRoomSession,
  FreelanceSessionEntry,
  StudioResourceInventory,
  StudioResourceItemId,
  StudioRoleMode,
} from '../utils/studioPropAllocator';
import { SmartBusinessAdvisorPanel } from './SmartBusinessAdvisorPanel';
import '../styles/studio-prop-allocator.css';

export type StudioAllocatorTabId = 'allocator' | 'chores' | 'earnings' | 'handoff' | 'advisor';

export interface StudioAdaptedSequencePayload {
  readonly steps: SequenceStep[];
  readonly apparatus?: ApparatusType | 'mixed';
  readonly reasonKo: string;
  readonly strategyId?: AutoAdaptStrategyId | 'venue-spring-sync';
}

export interface StudioPropAllocatorPanelProps {
  readonly steps?: readonly SequenceStep[];
  readonly exercises?: readonly PilatesExercise[];
  readonly historyLogs?: readonly ClassHistoryLog[];
  readonly activeTitle?: string;
  readonly activeApparatus?: ApparatusType | 'mixed';
  readonly initialRoleMode?: StudioRoleMode;
  readonly initialTab?: StudioAllocatorTabId;
  readonly initialHeadcount?: number;
  readonly initialInventory?: StudioResourceInventory;
  readonly initialConcurrentSessions?: readonly ConcurrentRoomSession[];
  readonly onApplyAdaptedSequence?: (payload: StudioAdaptedSequencePayload) => void;
}

const TARGET_APPARATUS_OPTIONS: ReadonlyArray<{ id: ApparatusType; labelKo: string }> = [
  { id: 'chair', labelKo: '운다 체어' },
  { id: 'mat', labelKo: '매트' },
  { id: 'barrel', labelKo: '바렐' },
  { id: 'cadillac', labelKo: '캐딜락' },
  { id: 'reformer', labelKo: '리포머' },
];

const QUICK_TOGGLE_ROOM_RESOURCES: readonly StudioResourceItemId[] = [
  'magic-circle',
  'mini-ball',
  'foam-roller',
  'loop-band',
  'long-box',
  'short-box',
];

function createInitialFreelanceEntries(): FreelanceSessionEntry[] {
  return DEFAULT_FREELANCE_VENUE_PRESETS.map((venue, index) => ({
    id: `entry-${venue.id}`,
    venueId: venue.id,
    venueLabelKo: venue.venueLabelKo,
    classCount: index === 0 ? 4 : index === 1 ? 2 : 0,
    feePerClassKrw: venue.feePerClassKrw,
  }));
}

function loadFreelanceEntries(): FreelanceSessionEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createInitialFreelanceEntries();
    }
    const raw = window.localStorage.getItem(FREELANCE_FEE_LOG_STORAGE_KEY);
    if (!raw) return createInitialFreelanceEntries();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createInitialFreelanceEntries();
    }
    return parsed as FreelanceSessionEntry[];
  } catch {
    return createInitialFreelanceEntries();
  }
}

function formatKrw(amount: number): string {
  return `${Math.max(0, Math.round(amount)).toLocaleString('ko-KR')}원`;
}

function getAvailableTabsForRole(
  roleMode: StudioRoleMode,
): ReadonlyArray<{ id: StudioAllocatorTabId; labelKo: string }> {
  if (roleMode === 'freelance') {
    return [
      { id: 'allocator', labelKo: '교보재 · 센터 전환' },
      { id: 'earnings', labelKo: '출강 · 수업료 집계' },
    ];
  }
  if (roleMode === 'solo-owner') {
    return [
      { id: 'allocator', labelKo: '교보재 배분 & 자동 변경' },
      { id: 'chores', labelKo: '귀찮은 업무 1탭 자동화' },
      { id: 'advisor', labelKo: '경영 비서 · 보강' },
    ];
  }
  return [
    { id: 'allocator', labelKo: '교보재 배분 & 자동 변경' },
    { id: 'chores', labelKo: '귀찮은 업무 1탭 자동화' },
    { id: 'advisor', labelKo: '경영 비서 · 보강' },
    { id: 'handoff', labelKo: '대강 3분 인수인계' },
  ];
}

export const StudioPropAllocatorPanel: React.FC<StudioPropAllocatorPanelProps> = ({
  steps: stepsProp,
  exercises: exercisesProp,
  historyLogs: historyLogsProp,
  activeTitle: activeTitleProp,
  activeApparatus: activeApparatusProp,
  initialRoleMode,
  initialTab,
  initialHeadcount = 6,
  initialInventory,
  initialConcurrentSessions,
  onApplyAdaptedSequence,
}) => {
  const storeSteps = usePilatesStore((state) => state.activeSteps);
  const storeExercises = usePilatesStore((state) => state.exercises);
  const storeHistoryLogs = usePilatesStore((state) => state.historyLogs);
  const storeActiveTitle = usePilatesStore((state) => state.activeTitle);
  const storeActiveApparatus = usePilatesStore((state) => state.activeApparatus);

  const steps = stepsProp ?? storeSteps;
  const exercises = exercisesProp ?? storeExercises;
  const historyLogs = historyLogsProp ?? storeHistoryLogs;
  const activeTitle = activeTitleProp ?? storeActiveTitle;
  const activeApparatus = activeApparatusProp ?? storeActiveApparatus;

  const [roleMode, setRoleMode] = useState<StudioRoleMode>(() =>
    initialRoleMode ?? loadSavedStudioRoleMode('freelance'),
  );
  const [activeTab, setActiveTab] = useState<StudioAllocatorTabId>(() => {
    const allowed = getAvailableTabsForRole(initialRoleMode ?? loadSavedStudioRoleMode('freelance'));
    if (initialTab && allowed.some((item) => item.id === initialTab)) {
      return initialTab;
    }
    return allowed[0].id;
  });

  // Resource inventory & concurrent sessions state
  const [inventory, setInventory] = useState<StudioResourceInventory>(
    () =>
      initialInventory ?? {
        ...DEFAULT_STUDIO_INVENTORY,
        quantities: { ...DEFAULT_STUDIO_INVENTORY.quantities },
        rooms: DEFAULT_STUDIO_INVENTORY.rooms.map((room) => ({ ...room })),
      },
  );
  const [myRoomId, setMyRoomId] = useState<string>(
    () => (initialInventory ?? DEFAULT_STUDIO_INVENTORY).rooms[0]?.roomId ?? 'room-a-reformer',
  );
  const [myHeadcount, setMyHeadcount] = useState<number>(Math.max(1, initialHeadcount));
  const [concurrentSessions, setConcurrentSessions] = useState<ConcurrentRoomSession[]>(() =>
    (initialConcurrentSessions ?? DEFAULT_CONCURRENT_SESSIONS).map((session) => ({
      ...session,
      requiredResourcesPerMember: [...session.requiredResourcesPerMember],
    })),
  );
  const [targetFallbackApparatus, setTargetFallbackApparatus] = useState<ApparatusType>('chair');
  const [previewStrategyId, setPreviewStrategyId] = useState<AutoAdaptStrategyId | null>(null);
  const [undoSnapshotSteps, setUndoSnapshotSteps] = useState<SequenceStep[] | null>(null);
  const [statusFeedbackKo, setStatusFeedbackKo] = useState<string>('');

  // Freelance venue & simple earnings counter state
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    DEFAULT_FREELANCE_VENUE_PRESETS[0].id,
  );
  const [freelanceEntries, setFreelanceEntries] = useState<FreelanceSessionEntry[]>(() =>
    loadFreelanceEntries(),
  );

  // Chore automation state (post-class message, FAQ, handoff note)
  const [memberAlias, setMemberAlias] = useState<string>('금요 오전반 회원님');
  const [messageTone, setMessageTone] = useState<'warm' | 'concise'>('warm');
  const [nextClassHint, setNextClassHint] = useState<string>('');
  const [handoffNote, setHandoffNote] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visibleTabs = useMemo(() => getAvailableTabsForRole(roleMode), [roleMode]);
  const roleMeta = useMemo(
    () => STUDIO_ROLE_MODES.find((item) => item.id === roleMode) ?? STUDIO_ROLE_MODES[0],
    [roleMode],
  );

  const hasMountedFreelanceRef = useRef(false);

  useEffect(() => {
    if (!hasMountedFreelanceRef.current) {
      hasMountedFreelanceRef.current = true;
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          FREELANCE_FEE_LOG_STORAGE_KEY,
          JSON.stringify(freelanceEntries),
        );
      }
    } catch {
      // Ignore storage write errors in restricted environments.
    }
  }, [freelanceEntries]);

  const handleSelectRoleMode = (nextMode: StudioRoleMode) => {
    setRoleMode(nextMode);
    saveStudioRoleMode(nextMode);
    const nextTabs = getAvailableTabsForRole(nextMode);
    if (!nextTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(nextTabs[0].id);
    }
    setPreviewStrategyId(null);
    setStatusFeedbackKo('');
  };

  // In freelance / solo-owner modes, hide multi-room collisions so the instructor focuses
  // cleanly on their own inventory & class capacity; center-manager enables full multi-room checks.
  const effectiveConcurrentSessions = useMemo(
    () => (roleMode === 'center-manager' ? concurrentSessions : []),
    [roleMode, concurrentSessions],
  );

  const conflictReport = useMemo(
    () =>
      detectTimeSlotResourceConflicts({
        steps,
        exercises,
        inventory,
        myHeadcount,
        concurrentSessions: effectiveConcurrentSessions,
        myRoomId,
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
      }),
    [steps, exercises, inventory, myHeadcount, effectiveConcurrentSessions, myRoomId],
  );

  const autoAdaptPlan = useMemo(
    () =>
      autoAdaptSequenceForResources({
        steps,
        exercises,
        conflictReport,
        preferredFallbackApparatus: targetFallbackApparatus,
      }),
    [steps, exercises, conflictReport, targetFallbackApparatus],
  );

  const activePreviewStrategy: AutoAdaptStrategyOption | null = useMemo(() => {
    if (!previewStrategyId) return null;
    return (
      autoAdaptPlan.strategies.find((item) => item.strategyId === previewStrategyId) ?? null
    );
  }, [autoAdaptPlan, previewStrategyId]);

  const selectedVenue = useMemo(
    () =>
      DEFAULT_FREELANCE_VENUE_PRESETS.find((venue) => venue.id === selectedVenueId) ??
      DEFAULT_FREELANCE_VENUE_PRESETS[0],
    [selectedVenueId],
  );

  const freelanceEarnings = useMemo(
    () => summarizeFreelanceEarnings(freelanceEntries),
    [freelanceEntries],
  );

  const followUpDraft = useMemo(
    () =>
      generatePostClassFollowUpDraft({
        memberAliasKo: memberAlias,
        classTitleKo: activeTitle,
        apparatus: activeApparatus,
        steps,
        exercises,
        nextClassHintKo: nextClassHint,
        tone: messageTone,
      }),
    [memberAlias, activeTitle, activeApparatus, steps, exercises, nextClassHint, messageTone],
  );

  const monthlyReport = useMemo(
    () =>
      buildMonthlyInstructorGrowthReport({
        historyLogs,
        exercises,
      }),
    [historyLogs, exercises],
  );

  const handoffBrief = useMemo(
    () =>
      buildSubInstructorHandoffBrief({
        classTitleKo: activeTitle,
        roomNameKo: conflictReport.myRoom?.roomNameKo ?? 'A룸 · 리포머 6:1',
        slotLabelKo: conflictReport.slotLabelKo,
        headcount: myHeadcount,
        apparatus: activeApparatus,
        steps,
        exercises,
        conflictReport,
        specialNoteKo: handoffNote,
      }),
    [activeTitle, conflictReport, myHeadcount, activeApparatus, steps, exercises, handoffNote],
  );

  const featuredResources = useMemo(
    () => STUDIO_RESOURCE_CATALOG.filter((item) => item.featuredInPanel),
    [],
  );

  const handleCopyText = async (copyKey: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(copyKey);
      window.setTimeout(() => {
        setCopiedId((current) => (current === copyKey ? null : current));
      }, 1800);
    } catch {
      setCopiedId(copyKey);
    }
  };

  const applyStepsPayload = (payload: StudioAdaptedSequencePayload) => {
    setUndoSnapshotSteps(steps.map((step) => ({ ...step })));
    if (onApplyAdaptedSequence) {
      onApplyAdaptedSequence(payload);
    } else {
      usePilatesStore.setState((current) => ({
        activeSteps: payload.steps,
        activeApparatus: payload.apparatus ?? current.activeApparatus,
      }));
    }
    setStatusFeedbackKo(payload.reasonKo);
    setPreviewStrategyId(null);
  };

  const handleUndoApplied = () => {
    if (!undoSnapshotSteps) return;
    if (onApplyAdaptedSequence) {
      onApplyAdaptedSequence({
        steps: undoSnapshotSteps,
        apparatus: activeApparatus,
        reasonKo: '방금 적용한 변경을 원래 시퀀스로 되돌렸어요.',
      });
    } else {
      usePilatesStore.setState({ activeSteps: undoSnapshotSteps });
    }
    setUndoSnapshotSteps(null);
    setStatusFeedbackKo('원래 시퀀스로 되돌렸어요.');
  };

  const handleAdjustQuantity = (resourceId: StudioResourceItemId, delta: number) => {
    setInventory((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [resourceId]: Math.max(0, (prev.quantities[resourceId] ?? 0) + delta),
      },
    }));
  };

  const handleAdjustRoomOperationalUnits = (roomId: string, delta: number) => {
    setInventory((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.roomId === roomId
          ? {
              ...room,
              operationalUnits: Math.max(
                0,
                Math.min(room.totalUnits, room.operationalUnits + delta),
              ),
            }
          : room,
      ),
    }));
  };

  const handleToggleConcurrentSession = (sessionId: string) => {
    setConcurrentSessions((prev) =>
      prev.map((session) =>
        session.sessionId === sessionId
          ? { ...session, active: session.active === false ? true : false }
          : session,
      ),
    );
  };

  const handleToggleConcurrentResource = (
    sessionId: string,
    resourceId: StudioResourceItemId,
  ) => {
    setConcurrentSessions((prev) =>
      prev.map((session) => {
        if (session.sessionId !== sessionId) return session;
        const exists = session.requiredResourcesPerMember.includes(resourceId);
        const nextList = exists
          ? session.requiredResourcesPerMember.filter((id) => id !== resourceId)
          : [...session.requiredResourcesPerMember, resourceId];
        return { ...session, requiredResourcesPerMember: nextList };
      }),
    );
  };

  const handleSelectFreelanceVenue = (venueId: string) => {
    setSelectedVenueId(venueId);
    const venue = DEFAULT_FREELANCE_VENUE_PRESETS.find((item) => item.id === venueId);
    if (!venue) return;
    setMyHeadcount(venue.defaultHeadcount);
    setInventory((prev) => ({
      ...prev,
      studioLabelKo: venue.venueLabelKo,
      quantities: createDefaultResourceQuantities(venue.propQuantities),
    }));
    setStatusFeedbackKo(`${venue.venueLabelKo} 보유 소도구와 인원을 불러왔어요.`);
  };

  const handleSyncVenueSprings = () => {
    const result = adaptSequenceSpringsForVenue(steps, exercises, selectedVenue);
    applyStepsPayload({
      steps: result.adaptedSteps,
      reasonKo: result.summaryKo,
      strategyId: 'venue-spring-sync',
    });
  };

  const handleAdjustFreelanceCount = (entryId: string, delta: number) => {
    setFreelanceEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, classCount: Math.max(0, entry.classCount + delta) }
          : entry,
      ),
    );
  };

  const strategyById = (id: AutoAdaptStrategyId) =>
    autoAdaptPlan.strategies.find((item) => item.strategyId === id);

  const swapStrategy = strategyById('swap-available-prop');
  const staggerStrategy = strategyById('stagger-half-class');
  const apparatusStrategy = strategyById('adapt-room-apparatus');
  const currentRoom = conflictReport.myRoom;

  return (
    <section
      className="spa-panel"
      aria-label="스튜디오 교보재 배분 및 강사 업무 자동화"
      data-role-mode={roleMode}
    >
      <header className="spa-header">
        <div className="spa-header-top">
          <div className="spa-header-copy">
            <p className="spa-eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              <span>{roleMeta.badgeKo} 모드</span>
            </p>
            <h2 className="spa-title">교보재 자동 배분 &amp; 강사 도우미</h2>
            <p className="spa-subtitle">{roleMeta.subtitleKo}</p>
          </div>
          {undoSnapshotSteps && (
            <button
              type="button"
              className="spa-btn"
              onClick={handleUndoApplied}
              aria-label="방금 변경 되돌리기"
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>되돌리기</span>
            </button>
          )}
        </div>

        {/* 3-Way Studio Role Mode Switcher (persisted in localStorage) */}
        <div
          className="spa-role-track"
          role="group"
          aria-label="강사 운영 형태 선택"
        >
          {STUDIO_ROLE_MODES.map((item) => {
            const selected = item.id === roleMode;
            return (
              <button
                key={item.id}
                type="button"
                className="spa-role-btn"
                aria-pressed={selected}
                onClick={() => handleSelectRoleMode(item.id)}
              >
                <span>{item.labelKo}</span>
                <span className="spa-role-badge">{item.badgeKo}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Panel Tabs */}
      <div className="spa-tabs" role="tablist" aria-label="도우미 기능 탭">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="spa-tab-btn"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id === 'allocator' && <Layers size={15} aria-hidden="true" />}
            {tab.id === 'chores' && <MessageSquareText size={15} aria-hidden="true" />}
            {tab.id === 'earnings' && <Wallet size={15} aria-hidden="true" />}
            {tab.id === 'handoff' && <CalendarClock size={15} aria-hidden="true" />}
            <span>{tab.labelKo}</span>
          </button>
        ))}
      </div>

      {statusFeedbackKo && (
        <div className="spa-body">
          <div className="spa-toast-feedback" role="status" aria-live="polite">
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{statusFeedbackKo}</span>
          </div>
        </div>
      )}

      {/* TAB 1: Prop Allocator & Resource-Aware Auto-Adapt */}
      {activeTab === 'allocator' && (
        <div className="spa-body" role="tabpanel" aria-label="교보재 배분 및 자동 변경">
          {/* Freelance Venue Preset Strip (shown in freelance & solo-owner) */}
          {roleMode === 'freelance' && (
            <div className="spa-section">
              <div className="spa-section-head">
                <h3 className="spa-section-title">출강 센터 기구·스프링 빠른 전환</h3>
                <button
                  type="button"
                  className="spa-btn spa-btn-soft"
                  onClick={handleSyncVenueSprings}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>스프링 표기 자동 맞추기</span>
                </button>
              </div>
              <p className="spa-section-desc">
                오늘 수업 가는 센터를 누르면 보유 소도구 수량과 리포머 브랜드 스프링 표기를 한 번에 맞춰요.
              </p>
              <div className="spa-venue-grid">
                {DEFAULT_FREELANCE_VENUE_PRESETS.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    className="spa-venue-card"
                    aria-pressed={selectedVenueId === venue.id}
                    onClick={() => handleSelectFreelanceVenue(venue.id)}
                  >
                    <span className="spa-venue-title">{venue.venueLabelKo}</span>
                    <span className="spa-venue-note">{venue.noteKo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conflict Status Banner */}
          <div className="spa-section">
            <div
              className={`spa-status-banner ${conflictReport.hasAnyConflict ? 'is-conflict' : ''}`}
              role="status"
            >
              <div className="spa-status-banner-main">
                {conflictReport.hasAnyConflict ? (
                  <AlertTriangle size={18} className="spa-status-banner-icon" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={18} className="spa-status-banner-icon" aria-hidden="true" />
                )}
                <div>
                  <strong>{conflictReport.summaryHeadlineKo}</strong>
                  {conflictReport.conflictingResources.length > 0 && (
                    <div className="spa-badge-row" style={{ marginTop: 8 }}>
                      {conflictReport.conflictingResources.map((item) => (
                        <span key={item.resourceId} className="spa-badge is-conflict">
                          {item.labelKo} {item.shortage}개 부족 (잔여 {item.remainingBeforeMyClass}개)
                        </span>
                      ))}
                    </div>
                  )}
                  {conflictReport.apparatusConflict && (
                    <div className="spa-badge-row" style={{ marginTop: 8 }}>
                      <span className="spa-badge is-conflict">
                        {APPARATUS_LABELS[conflictReport.apparatusConflict.requestedApparatus].ko}{' '}
                        {conflictReport.apparatusConflict.shortageUnits}대 부족
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Class Headcount & Room Capacity Controls */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">내 수업 인원 &amp; 기구 상태</h3>
              <span className="spa-badge is-neutral spa-num">
                현재 수업 {myHeadcount}명
              </span>
            </div>
            <div className="spa-controls-grid">
              <div className="spa-field">
                <span className="spa-field-label">내 수업 인원</span>
                <div className="spa-stepper">
                  <button
                    type="button"
                    className="spa-stepper-btn"
                    aria-label="내 수업 인원 1명 줄이기"
                    onClick={() => setMyHeadcount((prev) => Math.max(1, prev - 1))}
                  >
                    −
                  </button>
                  <span className="spa-stepper-value">{myHeadcount}명</span>
                  <button
                    type="button"
                    className="spa-stepper-btn"
                    aria-label="내 수업 인원 1명 늘리기"
                    onClick={() => setMyHeadcount((prev) => Math.min(20, prev + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {roleMode !== 'freelance' && currentRoom && (
                <>
                  <div className="spa-field">
                    <label htmlFor="spa-my-room-select" className="spa-field-label">
                      진행 룸 선택
                    </label>
                    <select
                      id="spa-my-room-select"
                      className="spa-select"
                      value={myRoomId}
                      onChange={(event) => setMyRoomId(event.target.value)}
                    >
                      {inventory.rooms.map((room) => (
                        <option key={room.roomId} value={room.roomId}>
                          {room.roomNameKo} ({room.operationalUnits}/{room.totalUnits}대)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="spa-field">
                    <span className="spa-field-label">가동 가능 기구 대수 (고장 반영)</span>
                    <div className="spa-stepper">
                      <button
                        type="button"
                        className="spa-stepper-btn"
                        aria-label="가동 기구 1대 줄이기"
                        onClick={() => handleAdjustRoomOperationalUnits(currentRoom.roomId, -1)}
                      >
                        −
                      </button>
                      <span className="spa-stepper-value">
                        {currentRoom.operationalUnits}/{currentRoom.totalUnits}대
                      </span>
                      <button
                        type="button"
                        className="spa-stepper-btn"
                        aria-label="가동 기구 1대 늘리기"
                        onClick={() => handleAdjustRoomOperationalUnits(currentRoom.roomId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center-Manager Only: Concurrent Other Rooms Check */}
          {roleMode === 'center-manager' && (
            <div className="spa-section">
              <div className="spa-section-head">
                <h3 className="spa-section-title">
                  <Building2 size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
                  동시간대 타 룸 교보재 사용 체크
                </h3>
                <span className="spa-badge is-neutral spa-num">
                  진행 중 {conflictReport.activeConcurrentSessions.length}개 룸
                </span>
              </div>
              <p className="spa-section-desc">
                같은 시간대 옆 방에서 쓰는 소도구를 눌러 체크하면 남은 수량과 부족분을 바로 계산해요.
              </p>
              <div className="spa-room-list">
                {concurrentSessions.map((session) => {
                  const isActive = session.active !== false;
                  return (
                    <div
                      key={session.sessionId}
                      className={`spa-room-row ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="spa-room-top">
                        <button
                          type="button"
                          className="spa-room-toggle"
                          aria-pressed={isActive}
                          onClick={() => handleToggleConcurrentSession(session.sessionId)}
                        >
                          <span>{isActive ? '수업 중' : '비어 있음'}</span>
                          <span>
                            {session.roomNameKo} ({session.headcount}명)
                          </span>
                        </button>
                        <span className="spa-section-desc">{session.instructorAliasKo}</span>
                      </div>
                      {isActive && (
                        <div className="spa-chip-row" role="group" aria-label={`${session.roomNameKo} 사용 교보재`}>
                          {QUICK_TOGGLE_ROOM_RESOURCES.map((resId) => {
                            const used = session.requiredResourcesPerMember.includes(resId);
                            return (
                              <button
                                key={resId}
                                type="button"
                                className="spa-chip"
                                aria-pressed={used}
                                onClick={() =>
                                  handleToggleConcurrentResource(session.sessionId, resId)
                                }
                              >
                                <span>{getStudioResourceLabelKo(resId)}</span>
                                {used && <span className="spa-num">({session.headcount})</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Studio Prop Inventory Steppers */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">센터 보유 교보재 수량</h3>
              <span className="spa-section-desc">{inventory.studioLabelKo}</span>
            </div>
            <div className="spa-inventory-grid">
              {featuredResources.map((item) => {
                const allocation = conflictReport.resourceAllocations.find(
                  (entry) => entry.resourceId === item.id,
                );
                const isConflict = allocation?.status === 'conflict';
                return (
                  <div
                    key={item.id}
                    className={`spa-inventory-row ${isConflict ? 'is-conflict' : ''}`}
                  >
                    <div className="spa-inventory-meta">
                      <span className="spa-inventory-name">{item.labelKo}</span>
                      <span className="spa-inventory-sub">
                        {allocation && allocation.otherRoomsUsed > 0
                          ? `타 룸 ${allocation.otherRoomsUsed} · 잔여 ${allocation.remainingBeforeMyClass}`
                          : allocation && allocation.myClassNeeded > 0
                            ? `내 수업 필요 ${allocation.myClassNeeded}개`
                            : '여유 있음'}
                      </span>
                    </div>
                    <div className="spa-stepper">
                      <button
                        type="button"
                        className="spa-stepper-btn"
                        aria-label={`${item.labelKo} 보유 수량 줄이기`}
                        onClick={() => handleAdjustQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span className="spa-stepper-value">
                        {inventory.quantities[item.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        className="spa-stepper-btn"
                        aria-label={`${item.labelKo} 보유 수량 늘리기`}
                        onClick={() => handleAdjustQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1-Tap Resource-Aware Auto-Adapt Actions */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">자원 맞춤 시퀀스 자동 변경</h3>
              <span className="spa-section-desc">누르면 변경 전·후를 먼저 확인해요</span>
            </div>

            <div className="spa-field">
              <span className="spa-field-label">기구 변경 전환 대상</span>
              <div className="spa-chip-row" role="group" aria-label="전환할 기구 선택">
                {TARGET_APPARATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="spa-chip"
                    aria-pressed={targetFallbackApparatus === option.id}
                    onClick={() => setTargetFallbackApparatus(option.id)}
                  >
                    {option.labelKo}
                  </button>
                ))}
              </div>
            </div>

            <div className="spa-strategy-actions">
              <button
                type="button"
                className={`spa-btn ${swapStrategy?.recommended ? 'spa-btn-primary' : 'spa-btn-soft'}`}
                disabled={!swapStrategy?.applicable}
                onClick={() => setPreviewStrategyId('swap-available-prop')}
              >
                <Sparkles size={15} aria-hidden="true" />
                <span>남는 소도구로 자동 바꾸기</span>
              </button>

              {roleMode === 'center-manager' && (
                <button
                  type="button"
                  className="spa-btn spa-btn-soft"
                  disabled={!staggerStrategy?.applicable}
                  onClick={() => setPreviewStrategyId('stagger-half-class')}
                >
                  <CalendarClock size={15} aria-hidden="true" />
                  <span>전·후반 교차 배치</span>
                </button>
              )}

              <button
                type="button"
                className={`spa-btn ${apparatusStrategy?.recommended ? 'spa-btn-primary' : 'spa-btn-soft'}`}
                disabled={!apparatusStrategy?.applicable}
                onClick={() => setPreviewStrategyId('adapt-room-apparatus')}
              >
                <RefreshCw size={15} aria-hidden="true" />
                <span>기구 변경 자동 전환</span>
              </button>
            </div>

            {/* Before / After Preview */}
            {activePreviewStrategy && (
              <div className="spa-preview-box" aria-label="자동 변경 전후 미리보기">
                <div className="spa-section-head">
                  <h4 className="spa-section-title">{activePreviewStrategy.titleKo} 미리보기</h4>
                  <span className="spa-badge is-ok spa-num">
                    변경 {activePreviewStrategy.changes.length}건 · 부족{' '}
                    {activePreviewStrategy.remainingShortageCount}건
                  </span>
                </div>
                <p className="spa-section-desc">{activePreviewStrategy.summaryKo}</p>

                {activePreviewStrategy.timeShareSchedule && (
                  <div className="spa-field">
                    <pre className="spa-message-preview">
                      {activePreviewStrategy.timeShareSchedule.copyableRoomNoticeKo}
                    </pre>
                    <div>
                      <button
                        type="button"
                        className="spa-btn"
                        onClick={() =>
                          handleCopyText(
                            'timeshare-notice',
                            activePreviewStrategy.timeShareSchedule?.copyableRoomNoticeKo ?? '',
                          )
                        }
                      >
                        {copiedId === 'timeshare-notice' ? (
                          <Check size={15} aria-hidden="true" />
                        ) : (
                          <ClipboardCopy size={15} aria-hidden="true" />
                        )}
                        <span>
                          {copiedId === 'timeshare-notice'
                            ? '교차 안내 복사됨'
                            : '타 룸 교차 안내 복사'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <ul className="spa-diff-list">
                  {activePreviewStrategy.changes.slice(0, 6).map((diff) => (
                    <li key={`${diff.stepId}-${diff.order}`} className="spa-diff-item">
                      <div className="spa-diff-line">
                        <span className="spa-badge is-neutral spa-num">{diff.order}번</span>
                        <span className="spa-diff-before">{diff.beforeExerciseNameKo}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                        <span className="spa-diff-after">{diff.afterExerciseNameKo}</span>
                      </div>
                      <p className="spa-diff-cue">
                        {diff.beforeResourceLabelKo} → {diff.afterResourceLabelKo} · {diff.cueSyncNoteKo}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="spa-preview-footer">
                  <button
                    type="button"
                    className="spa-btn"
                    onClick={() => setPreviewStrategyId(null)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="spa-btn spa-btn-primary"
                    onClick={() =>
                      applyStepsPayload({
                        steps: activePreviewStrategy.adaptedSteps,
                        apparatus: activePreviewStrategy.targetApparatus,
                        reasonKo: `${activePreviewStrategy.titleKo} 적용을 마쳤어요.`,
                        strategyId: activePreviewStrategy.strategyId,
                      })
                    }
                  >
                    <Check size={15} aria-hidden="true" />
                    <span>이대로 시퀀스에 적용</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Freelance Simple Class & Fee Counter */}
      {activeTab === 'earnings' && roleMode === 'freelance' && (
        <div className="spa-body" role="tabpanel" aria-label="출강 횟수 및 수업료 집계">
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">이번 달 내 출강 간편 집계</h3>
              <span className="spa-badge is-ok">내 기기 전용 저장</span>
            </div>
            <div className="spa-metric-strip">
              <div className="spa-metric-cell">
                <span className="spa-metric-label">총 출강 횟수</span>
                <span className="spa-metric-value">{freelanceEarnings.totalClasses}회</span>
              </div>
              <div className="spa-metric-cell">
                <span className="spa-metric-label">예상 수업료 합계</span>
                <span className="spa-metric-value">
                  {formatKrw(freelanceEarnings.totalFeeKrw)}
                </span>
              </div>
              <div className="spa-metric-cell">
                <span className="spa-metric-label">회당 평균</span>
                <span className="spa-metric-value">
                  {formatKrw(freelanceEarnings.averageFeeKrw)}
                </span>
              </div>
            </div>
          </div>

          <div className="spa-section">
            <h3 className="spa-section-title">센터별 출강 체크 (+1 탭)</h3>
            <div className="spa-room-list">
              {freelanceEntries.map((entry) => (
                <div key={entry.id} className="spa-inventory-row">
                  <div className="spa-inventory-meta">
                    <span className="spa-inventory-name">{entry.venueLabelKo}</span>
                    <span className="spa-inventory-sub">
                      회당 {formatKrw(entry.feePerClassKrw)} · 소계{' '}
                      {formatKrw(entry.classCount * entry.feePerClassKrw)}
                    </span>
                  </div>
                  <div className="spa-stepper">
                    <button
                      type="button"
                      className="spa-stepper-btn"
                      aria-label={`${entry.venueLabelKo} 출강 횟수 줄이기`}
                      onClick={() => handleAdjustFreelanceCount(entry.id, -1)}
                    >
                      −
                    </button>
                    <span className="spa-stepper-value">{entry.classCount}회</span>
                    <button
                      type="button"
                      className="spa-stepper-btn"
                      aria-label={`${entry.venueLabelKo} 출강 횟수 늘리기`}
                      onClick={() => handleAdjustFreelanceCount(entry.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Instructor Repetitive Chore Automation (Solo-Owner & Center-Manager) */}
      {activeTab === 'chores' && roleMode !== 'freelance' && (
        <div className="spa-body" role="tabpanel" aria-label="귀찮은 업무 1탭 자동화">
          {/* 1. Post-Class Member Follow-Up Kakao Draft */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">수업 직후 회원 안내 카톡 초안</h3>
              <button
                type="button"
                className="spa-btn spa-btn-primary"
                onClick={() => handleCopyText('followup', followUpDraft.kakaoCopyTextKo)}
              >
                {copiedId === 'followup' ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={15} aria-hidden="true" />
                )}
                <span>{copiedId === 'followup' ? '카톡 문구 복사됨' : '카톡 문구 1탭 복사'}</span>
              </button>
            </div>

            <div className="spa-controls-grid">
              <div className="spa-field">
                <label htmlFor="spa-member-alias" className="spa-field-label">
                  받는 분 별칭 (실명 대신 반·별칭)
                </label>
                <input
                  id="spa-member-alias"
                  type="text"
                  className="spa-input"
                  value={memberAlias}
                  onChange={(event) => setMemberAlias(event.target.value)}
                  placeholder="예: 금요 오전반 회원님, 회원 A"
                />
              </div>
              <div className="spa-field">
                <label htmlFor="spa-next-hint" className="spa-field-label">
                  다음 수업 예고 (선택)
                </label>
                <input
                  id="spa-next-hint"
                  type="text"
                  className="spa-input"
                  value={nextClassHint}
                  onChange={(event) => setNextClassHint(event.target.value)}
                  placeholder="예: 다음 주엔 밴드 상체 연결을 해볼게요"
                />
              </div>
            </div>

            <div className="spa-chip-row" role="group" aria-label="메시지 말투 선택">
              <button
                type="button"
                className="spa-chip"
                aria-pressed={messageTone === 'warm'}
                onClick={() => setMessageTone('warm')}
              >
                따뜻한 말투
              </button>
              <button
                type="button"
                className="spa-chip"
                aria-pressed={messageTone === 'concise'}
                onClick={() => setMessageTone('concise')}
              >
                간결한 요약형
              </button>
            </div>

            {followUpDraft.privacyNoticeKo && (
              <div className="spa-status-banner is-warning" role="status">
                <span>{followUpDraft.privacyNoticeKo}</span>
              </div>
            )}

            <pre className="spa-message-preview">{followUpDraft.kakaoCopyTextKo}</pre>
          </div>

          {/* 2. Studio FAQ 1-Tap Copy Templates (5 templates) */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">자주 묻는 안내 1탭 복사</h3>
              <span className="spa-badge is-neutral spa-num">
                {STUDIO_FAQ_QUICK_TEMPLATES.length}종
              </span>
            </div>
            <div className="spa-faq-list">
              {STUDIO_FAQ_QUICK_TEMPLATES.map((template) => {
                const key = `faq-${template.id}`;
                const copied = copiedId === key;
                return (
                  <div key={template.id} className="spa-faq-item">
                    <div>
                      <div className="spa-faq-head">
                        <span className="spa-badge is-ok">{template.categoryKo}</span>
                      </div>
                      <h4 className="spa-faq-title" style={{ marginTop: 6 }}>
                        {template.titleKo}
                      </h4>
                      <p className="spa-faq-hint">{template.shortHintKo}</p>
                    </div>
                    <button
                      type="button"
                      className="spa-btn spa-btn-soft"
                      onClick={() =>
                        handleCopyText(
                          key,
                          renderFaqTemplateText(template.id as StudioFaqTemplateId),
                        )
                      }
                    >
                      {copied ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        <ClipboardCopy size={15} aria-hidden="true" />
                      )}
                      <span>{copied ? '복사 완료' : '안내 복사'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Monthly Instructor Balance & Popular Pattern Report */}
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">
                <BarChart3 size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
                {monthlyReport.periodLabelKo}
              </h3>
              <button
                type="button"
                className="spa-btn"
                onClick={() => handleCopyText('monthly-report', monthlyReport.copyableSummaryKo)}
              >
                {copiedId === 'monthly-report' ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={15} aria-hidden="true" />
                )}
                <span>{copiedId === 'monthly-report' ? '요약 복사됨' : '월간 요약 복사'}</span>
              </button>
            </div>

            <div className="spa-metric-strip">
              <div className="spa-metric-cell">
                <span className="spa-metric-label">분석 수업</span>
                <span className="spa-metric-value">{monthlyReport.totalSessions}회</span>
              </div>
              <div className="spa-metric-cell">
                <span className="spa-metric-label">평균 평점</span>
                <span className="spa-metric-value">{monthlyReport.averageRating}점</span>
              </div>
              <div className="spa-metric-cell">
                <span className="spa-metric-label">5점 인기 수업</span>
                <span className="spa-metric-value">{monthlyReport.fiveStarSessionCount}회</span>
              </div>
            </div>

            {monthlyReport.imbalanceAlertKo && (
              <div className="spa-status-banner is-warning" role="status">
                <span>{monthlyReport.imbalanceAlertKo}</span>
              </div>
            )}

            <div className="spa-plane-bars" aria-label="척추 움직임 평면 비중">
              {monthlyReport.spinalPlaneShares.map((item) => (
                <div key={item.plane} className="spa-plane-row">
                  <span>{item.labelKo.split(' ')[0]}</span>
                  <div className="spa-plane-track">
                    <div
                      className="spa-plane-fill"
                      style={{ width: `${Math.min(100, item.sharePct)}%` }}
                    />
                  </div>
                  <span className="spa-plane-pct">{item.sharePct}%</span>
                </div>
              ))}
            </div>

            {monthlyReport.goldenPatterns.length > 0 && (
              <div className="spa-field">
                <span className="spa-field-label">가장 자주 쓴 황금 패턴</span>
                <ul className="spa-pattern-list">
                  {monthlyReport.goldenPatterns.map((pattern) => (
                    <li key={pattern.exerciseId} className="spa-pattern-item">
                      <span>
                        <strong>{pattern.nameKo}</strong> · {pattern.apparatusLabelKo}
                      </span>
                      <span className="spa-badge is-ok spa-num">
                        {pattern.usedCount}회 · ★{pattern.avgRating}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="spa-field">
              <span className="spa-field-label">만족도 5점 수업 공통 특징</span>
              <ul className="spa-checklist">
                {monthlyReport.fiveStarHighlightsKo.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3 (Center-Manager): 3-Minute Substitute Instructor Handoff */}
      {activeTab === 'handoff' && roleMode === 'center-manager' && (
        <div className="spa-body" role="tabpanel" aria-label="대강 3분 인수인계">
          <div className="spa-section">
            <div className="spa-section-head">
              <h3 className="spa-section-title">{handoffBrief.headlineKo}</h3>
              <button
                type="button"
                className="spa-btn spa-btn-primary"
                onClick={() => handleCopyText('handoff-brief', handoffBrief.copyTextKo)}
              >
                {copiedId === 'handoff-brief' ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={15} aria-hidden="true" />
                )}
                <span>
                  {copiedId === 'handoff-brief' ? '인수인계 복사됨' : '3분 인수인계 1탭 복사'}
                </span>
              </button>
            </div>
            <p className="spa-section-desc">
              대강 선생님이 3분 안에 첫 스프링 세팅과 소도구 수량을 바로 파악할 수 있게 정리해 드려요.
            </p>

            <div className="spa-field">
              <label htmlFor="spa-handoff-note" className="spa-field-label">
                현장 참고 메모 (비식별 운영 메모만 입력)
              </label>
              <input
                id="spa-handoff-note"
                type="text"
                className="spa-input"
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                placeholder="예: 입문 회원 2명 포함, 풋워크 속도를 차분하게 맞춰주세요"
              />
            </div>

            <ul className="spa-checklist">
              {handoffBrief.checklistKo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <pre className="spa-message-preview">{handoffBrief.copyTextKo}</pre>
          </div>
        </div>
      )}

      {/* TAB 4 (Solo-Owner / Center-Manager): Smart Daily Business Advisor & Absence Makeup */}
      {activeTab === 'advisor' && roleMode !== 'freelance' && (
        <div className="spa-body" role="tabpanel" aria-label="스마트 경영 비서 및 결석 보강">
          <SmartBusinessAdvisorPanel
            historyLogs={historyLogs}
            activeApparatus={activeApparatus}
            roleMode={roleMode}
          />
        </div>
      )}
    </section>
  );
};
