import { getActiveWorkspaceOwner } from './lib/accountStorage';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useManagedTimeouts } from './hooks/useManagedTimeouts';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownToLine,
  Bookmark,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  Clock3,
  Library,
  Menu,
  Play,
  Plus,
  Search,
  Settings2,
  Ticket,
  X,
} from 'lucide-react';
import { StudioBrandMark } from './components/StudioBrandMark';
import { directionBetween, MotionDirector, runPageTransition } from './motion';
import type { TeachingLogContext } from './components/LogSessionModal';
import type { LiveStageNavigationHandle } from './components/LiveStageView';
import { SequenceStudioWorkbench } from './components/SequenceStudioWorkbench';
import { LightDismissDialog } from './components/LightDismissDialog';
import { PwaInstallPanel } from './components/PwaInstallPanel';
import { MovementIdeaSheet } from './components/MovementIdeaSheet';
import { InventoryPanel } from './components/InventoryPanel';
import { DeferredPanelBoundary } from './components/DeferredPanelBoundary';
import { InstructorStudyBoundary } from './components/InstructorStudyBoundary';
import { MemberBookingView } from './components/MemberBookingView';
import { SequenceQrImportDialog } from './components/SequenceQrShareDialog';
import { MobileSubPageBar } from './components/MobileSubPageBar';
import { StudioCommandPalette } from './components/StudioCommandPalette';
import {
  type DecodedSharedSequence,
  PF_SEQUENCE_SHARE_HASH_PREFIX,
  parseSequenceShareFromHashOrToken,
} from './utils/localQrSequenceShare';
import { type ActiveWorkspaceTab, usePilatesStore } from './store/usePilatesStore';
import type { PilatesExercise, PropType } from './types/pilates';
import type { MotionDraftId } from './models/types';
import {
  addScheduleDays,
  expandInstructorSchedule,
  formatScheduleTime,
  localScheduleDate,
} from './utils/instructorSchedule';
import { isRestStep } from './utils/sequenceEngine';
import { buildSequenceSimulation } from './utils/sequenceSimulation';
import './styles/controls.css';
import './styles/member-booking.css';
import './styles/atelier-luxury-v2.css';
import './styles/mobile-first-atelier-v3.css';
import './styles/atelier-clean-declutter-v5.css';
import './styles/mobile-subpages-user-first-v6.css';
import './styles/atelier-unslop-system.css';
import './styles/pf-motion-studio.css';
import './styles/rea-studio-advancement.css';
import './styles/mobile-readability-unslop-v17.css';
import './styles/mobile-atelier-unslop-flagship.css';
import { createEmptyInstructorStudyState } from './types/instructorStudy';
import { isMovementIdeaExercise } from './utils/movementIdeaDraft';
import { cycleWorkspaceLandmark } from './utils/workspaceLandmarkNavigation';

const InstructorStudyDialog = lazy(() =>
  import('./components/InstructorStudyDialog').then((module) => ({
    default: module.InstructorStudyDialog,
  })),
);
const PilatesSettingsPage = lazy(() =>
  import('./components/PilatesSettingsPage').then((module) => ({
    default: module.PilatesSettingsPage,
  })),
);
const MotionDraftLabDialog = lazy(() =>
  import('./components/MotionDraftLabDialog').then((module) => ({
    default: module.MotionDraftLabDialog,
  })),
);
const RecoveryPreview = lazy(() =>
  import('./components/RecoveryPreview').then((module) => ({ default: module.RecoveryPreview })),
);
const CloudSyncPanel = lazy(() =>
  import('./components/CloudSyncPanel').then((module) => ({
    default: module.CloudSyncPanel,
  })),
);
const InstructorScheduleView = lazy(() =>
  import('./components/InstructorScheduleView').then((module) => ({
    default: module.InstructorScheduleView,
  })),
);
const ClassBinderView = lazy(() =>
  import('./components/ClassBinderView').then((module) => ({
    default: module.ClassBinderView,
  })),
);
const ExerciseAtlasView = lazy(() =>
  import('./components/ExerciseAtlasView').then((module) => ({
    default: module.ExerciseAtlasView,
  })),
);
const LiveStageView = lazy(() =>
  import('./components/LiveStageView').then((module) => ({
    default: module.LiveStageView,
  })),
);
const LogSessionModal = lazy(() =>
  import('./components/LogSessionModal').then((module) => ({
    default: module.LogSessionModal,
  })),
);
const YouTubeClipperModal = lazy(() =>
  import('./components/YouTubeClipModal').then((module) => ({
    default: module.YouTubeClipperModal,
  })),
);
const YouTubePreviewModal = lazy(() =>
  import('./components/YouTubeClipModal').then((module) => ({
    default: module.YouTubePreviewModal,
  })),
);
const DesignSystemInspector = lazy(() =>
  import('./design-system/DesignSystemInspector').then((module) => ({
    default: module.DesignSystemInspector,
  })),
);
const LazyMotionCoveragePreviewHarness = lazy(() =>
  import('./features/motionCoverage/MotionCoveragePreviewHarness').then((module) => ({
    default: module.MotionCoveragePreviewHarness,
  })),
);

const navigation = [
  { id: 'workbench', label: '작성', detail: '수업 만들기', icon: CalendarDays },
  { id: 'atlas', label: '동작', detail: '동작 라이브러리', icon: Library },
  { id: 'binder', label: '저장', detail: '저장한 수업', icon: Bookmark },
  { id: 'schedule', label: '일정', detail: '수업 일정', icon: CalendarRange },
] as const;

const desktopNavigationGroups = [
  {
    groupLabel: '수업 설계',
    items: [
      { id: 'workbench' as const, detail: '수업 만들기', icon: CalendarDays },
      { id: 'atlas' as const, detail: '동작 라이브러리', icon: Library },
    ],
  },
  {
    groupLabel: '운영 · 아카이브',
    items: [
      { id: 'schedule' as const, detail: '수업 일정', icon: CalendarRange },
      { id: 'binder' as const, detail: '저장한 수업', icon: Bookmark },
      { id: 'history' as const, detail: '진행 기록', icon: Clock3 },
    ],
  },
] as const;

const WORKSPACE_ORDER: readonly ActiveWorkspaceTab[] = [
  'workbench',
  'atlas',
  'schedule',
  'binder',
  'history',
  'stage',
];

export interface InitialLaunchTarget {
  readonly portalRole: 'instructor' | 'member';
  readonly memberSection: 'schedule' | 'bookings' | 'wallet';
  readonly instructorTab: ActiveWorkspaceTab | null;
}

const LAUNCHABLE_TABS: readonly ActiveWorkspaceTab[] = [
  'workbench',
  'atlas',
  'schedule',
  'binder',
  'history',
];

// eslint-disable-next-line react-refresh/only-export-components
export function resolveInitialLaunchTarget(search: string): InitialLaunchTarget {
  const params = new URLSearchParams(search);
  const utm = params.get('utm_source')?.trim().toLowerCase() ?? '';
  const rawRole = params.get('role')?.trim().toLowerCase() ?? '';
  const rawSection = params.get('section')?.trim().toLowerCase() ?? '';
  const rawTab = params.get('tab')?.trim().toLowerCase() ?? '';

  const memberSection:
    | 'schedule'
    | 'bookings'
    | 'wallet' =
    rawSection === 'bookings' || rawSection === 'wallet' ? rawSection : 'schedule';

  if (rawRole === 'member' || utm === 'pwa-member') {
    return { portalRole: 'member', memberSection, instructorTab: null };
  }
  if (utm === 'pwa-atlas') {
    return { portalRole: 'instructor', memberSection: 'schedule', instructorTab: 'atlas' };
  }
  if (utm === 'pwa-workbench') {
    return { portalRole: 'instructor', memberSection: 'schedule', instructorTab: 'workbench' };
  }
  if ((LAUNCHABLE_TABS as readonly string[]).includes(rawTab)) {
    return {
      portalRole: 'instructor',
      memberSection: 'schedule',
      instructorTab: rawTab as ActiveWorkspaceTab,
    };
  }
  return { portalRole: 'instructor', memberSection: 'schedule', instructorTab: null };
}

/** Runs only when the workspace inside Suspense actually commits, including its first load. */
function WorkspaceHeadingFocus({ tab, request }: { tab: ActiveWorkspaceTab; request: number }) {
  useEffect(() => {
    let current = true;
    const frame = requestAnimationFrame(() => {
      if (!current || usePilatesStore.getState().activeTab !== tab) return;
      document.getElementById('workspace-main-heading')?.focus({ preventScroll: true });
    });
    return () => {
      current = false;
      cancelAnimationFrame(frame);
    };
  }, [tab, request]);
  return null;
}

export function App() {
  const state = usePilatesStore();
  const initialLaunch = useMemo(
    () =>
      typeof window !== 'undefined'
        ? resolveInitialLaunchTarget(window.location.search)
        : { portalRole: 'instructor' as const, memberSection: 'schedule' as const, instructorTab: null },
    [],
  );
  const today = localScheduleDate();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcoming = useMemo(
    () =>
      expandInstructorSchedule(state.instructorSchedule, today, addScheduleDays(today, 30))
        .filter(
          (item) =>
            (item.status === 'scheduled' || item.status === 'moved') &&
            (item.date > today || item.startTime >= nowTime),
        )
        .slice(0, 2),
    [state.instructorSchedule, today, nowTime],
  );
  const [studyOpen, setStudyOpen] = useState<{
    mode: 'study' | 'guide';
    exerciseId?: string;
  } | null>(null);
  const [motionDraftLabOpen, setMotionDraftLabOpen] = useState(false);
  const [motionDraftInitialId, setMotionDraftInitialId] = useState<MotionDraftId | undefined>();
  const [preview, setPreview] = useState<PilatesExercise | null>(null);
  const [ideaSheetState, setIdeaSheetState] = useState<{
    open: boolean;
    exercise: PilatesExercise | null;
  }>({ open: false, exercise: null });
  const [clipperOpen, setClipperOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSummaryOpen, setSettingsSummaryOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [landmarkAnnouncement, setLandmarkAnnouncement] = useState('');
  const { scheduleTimeout } = useManagedTimeouts();
  const workbenchDetailAddRef = useRef<
    ((exerciseId: string) => { success: boolean; message?: string }) | null
  >(null);
  useEffect(() => {
    if (initialLaunch.instructorTab) {
      const cur = usePilatesStore.getState();
      if (cur.activeTab !== initialLaunch.instructorTab) {
        cur.setActiveTab(initialLaunch.instructorTab);
      }
    }
  }, [initialLaunch.instructorTab]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (
        event.key === 'F6' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !commandPaletteOpen &&
        !document.querySelector('dialog[open], [aria-modal="true"]')
      ) {
        event.preventDefault();
        const result = cycleWorkspaceLandmark(event.shiftKey ? -1 : 1, document);
        if (result.moved && result.targetLabel) {
          setLandmarkAnnouncement(`${result.targetLabel} 영역으로 이동했습니다.`);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!commandPaletteOpen && document.querySelector('dialog[open]')) return;
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !commandPaletteOpen &&
        !document.querySelector('dialog[open]')
      ) {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT')
        ) {
          return;
        }
        if (usePilatesStore.getState().activeTab === 'stage') return;
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen]);
  const [designSystemOpen, setDesignSystemOpen] = useState(() => {
    if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return false;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('pf_ds_inspect') === '1';
  });
  const [mcPreviewOpen, setMcPreviewOpen] = useState(() => {
    if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return false;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('pf_mc_preview') === '1';
  });
  const [portalRole, setPortalRole] = useState<'instructor' | 'member'>(
    initialLaunch.portalRole,
  );
  const [incomingSharedSequence, setIncomingSharedSequence] =
    useState<DecodedSharedSequence | null>(() => {
      if (typeof window === 'undefined') return null;
      return window.location.hash.includes(PF_SEQUENCE_SHARE_HASH_PREFIX)
        ? parseSequenceShareFromHashOrToken(window.location.hash)
        : null;
    });
  useEffect(() => {
    const handleHashChange = () => {
      if (!window.location.hash.includes(PF_SEQUENCE_SHARE_HASH_PREFIX)) return;
      const decoded = parseSequenceShareFromHashOrToken(window.location.hash);
      if (decoded) {
        setIncomingSharedSequence(decoded);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const clearShareHashFromAddressBar = () => {
    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes(PF_SEQUENCE_SHARE_HASH_PREFIX)
    ) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };
  const [memberSection, setMemberSection] = useState<'schedule' | 'bookings' | 'wallet'>(
    initialLaunch.memberSection,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceFocusRequest, setWorkspaceFocusRequest] = useState(0);
  const prefersReduced = useReducedMotion();
  const nonRestStepCount = useMemo(
    () => state.activeSteps.filter((step) => !isRestStep(step)).length,
    [state.activeSteps],
  );
  const activeSimulation = useMemo(
    () => buildSequenceSimulation(state.activeSteps, state.exercises, state.activeTargetMinutes),
    [state.activeSteps, state.exercises, state.activeTargetMinutes],
  );
  const canStartLiveStage = activeSimulation.gate.canRehearse;
  const plannedClassMinutes = Math.round(activeSimulation.totals.totalSec / 60);
  const stageReadinessRatio =
    state.activeTargetMinutes > 0
      ? Math.min(1, activeSimulation.totals.totalSec / (state.activeTargetMinutes * 60))
      : 0;
  const [logId, setLogId] = useState<string | null>(null);
  const [logContext, setLogContext] = useState<TeachingLogContext | undefined>();
  const [backupMessage, setBackupMessage] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const stageNavigationRef = useRef<LiveStageNavigationHandle | null>(null);
  const pendingStageTransition = useRef<{
    target: ActiveWorkspaceTab;
    commit: () => void;
  } | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const closingLog = useRef(false);
  const logNavigation = useRef<{
    target: ActiveWorkspaceTab;
    sequenceId: string;
    previousIds: Set<string>;
  } | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const opener = menuButtonRef.current;
    sidebarRef.current?.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
    return () => {
      if (window.innerWidth < 1024) {
        opener?.focus();
        return;
      }
      // Restore focus after React removes inert, including a still-loading workspace.
      requestAnimationFrame(() =>
        (
          document.getElementById('workspace-main-heading') ??
          document.getElementById('main-content')
        )?.focus({ preventScroll: true }),
      );
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeAtDesktop = () => {
      if (window.innerWidth < 1024) return;
      setMenuOpen(false);
    };
    window.addEventListener('resize', closeAtDesktop);
    return () => window.removeEventListener('resize', closeAtDesktop);
  }, [menuOpen]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.activeTab]);
  const commitTabChange = (tab: ActiveWorkspaceTab) => {
    const prevTab = usePilatesStore.getState().activeTab;
    const kind =
      portalRole === 'member'
        ? 'portal'
        : tab === 'stage' || prevTab === 'stage'
          ? 'stage'
          : directionBetween(WORKSPACE_ORDER, prevTab, tab);
    runPageTransition(
      () => {
        setPortalRole('instructor');
        state.setActiveTab(tab);
        setMenuOpen(false);
        setWorkspaceFocusRequest((value) => value + 1);
      },
      { kind },
    );
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const commitMemberSection = (section: 'schedule' | 'bookings' | 'wallet') => {
    const switchingPortal = portalRole !== 'member';
    runPageTransition(
      () => {
        if (usePilatesStore.getState().activeTab === 'stage') state.setActiveTab('workbench');
        setPortalRole('member');
        setMemberSection(section);
        setMenuOpen(false);
      },
      { kind: switchingPortal ? 'portal' : 'fade' },
    );
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const completeStageTransition = (tab: ActiveWorkspaceTab) => {
    const pending = pendingStageTransition.current;
    pendingStageTransition.current = null;
    if (pending?.target === tab) {
      pending.commit();
      return;
    }
    commitTabChange(tab);
  };
  const requestWorkspaceTransition = (
    target: ActiveWorkspaceTab,
    commit: () => void,
    label?: string,
  ) => {
    pendingStageTransition.current = null;
    if (
      portalRole === 'instructor' &&
      usePilatesStore.getState().activeTab === 'stage' &&
      target !== 'stage' &&
      stageNavigationRef.current?.requestExit(target, label)
    ) {
      pendingStageTransition.current = { target, commit };
      setMenuOpen(false);
      return;
    }
    commit();
  };
  const changeTab = (tab: ActiveWorkspaceTab) => {
    requestWorkspaceTransition(tab, () => commitTabChange(tab));
  };
  const focusMemberSection = (section: 'schedule' | 'bookings' | 'wallet') => {
    requestWorkspaceTransition('workbench', () => commitMemberSection(section), '회원 예약');
  };
  const loadSavedSequence = (sequenceId: string) => {
    const saved = usePilatesStore.getState().savedSequences.find((item) => item.id === sequenceId);
    if (!saved) return;
    requestWorkspaceTransition(
      'workbench',
      () => {
        usePilatesStore.getState().loadSequenceIntoWorkbench(sequenceId);
        commitTabChange('workbench');
      },
      `${saved.title} 불러오기`,
    );
  };
  const openLog = (id: string, context?: TeachingLogContext, destination?: ActiveWorkspaceTab) => {
    const resolvedId =
      id.trim() || usePilatesStore.getState().activeSequenceId.trim() || 'draft-live-session';
    closingLog.current = false;
    logNavigation.current = destination
      ? {
          target: destination,
          sequenceId: resolvedId,
          previousIds: new Set(usePilatesStore.getState().historyLogs.map((log) => log.id)),
        }
      : null;
    setLogId(resolvedId);
    setLogContext(context);
  };
  const closeLog = () => {
    if (closingLog.current) return;
    closingLog.current = true;
    const requested = logNavigation.current;
    const latest = usePilatesStore.getState();
    // The existing form moves to history only after its matching RAM-append postcondition.
    // Cancelling or a failed submission must never consume the requested navigation.
    const recorded =
      requested &&
      latest.activeTab === 'history' &&
      latest.historyLogs.filter(
        (log) => !requested.previousIds.has(log.id) && log.sequenceId === requested.sequenceId,
      ).length === 1;
    const dialog = logContainerRef.current?.querySelector('dialog');
    if (dialog?.open) dialog.close();
    logNavigation.current = null;
    setLogId(null);
    setLogContext(undefined);
    if (requested && recorded) completeStageTransition(requested.target);
    else pendingStageTransition.current = null;
  };
  const exportData = () => {
    try {
      const blob = new Blob([state.exportBackup()], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `flow-atelier-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      scheduleTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage('백업 파일을 만들었습니다. 기기 변경 전 안전한 곳에 보관해 주세요.');
    } catch {
      setBackupMessage('백업을 만들 수 없습니다. 브라우저 저장 권한을 확인해 주세요.');
    }
  };
  return (
    <div
      className={`app-shell vnext-shell flow-app ${state.activeTab === 'stage' ? 'is-teaching' : ''}`}
      data-active-page={portalRole === 'member' ? 'member' : state.activeTab}
    >
      <MotionDirector />
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="workspace-landmark-status"
      >
        {landmarkAnnouncement}
      </p>
      <aside
        ref={sidebarRef}
        className={`sidebar ${menuOpen ? 'is-open' : ''}`}
        aria-label="스튜디오 탐색"
        role={menuOpen ? 'dialog' : undefined}
        aria-modal={menuOpen ? true : undefined}
        onKeyDown={(event) => {
          if (!menuOpen) return;
          if (event.key === 'Escape') {
            setMenuOpen(false);
            return;
          }
          if (event.key !== 'Tab') return;
          const controls = Array.from(
            sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ??
              [],
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            if (portalRole === 'member') {
              focusMemberSection('schedule');
              return;
            }
            changeTab('workbench');
          }}
          aria-label={
            portalRole === 'member' ? 'Pilates Flow 회원 예약으로' : 'Pilates Flow 수업 만들기로'
          }
        >
          <StudioBrandMark size={22} />
          <span>
            Pilates Flow
            <small className="brand-tagline-deco" aria-hidden="true">
              수업 설계 · 3D 스튜디오
            </small>
          </span>
        </a>
        <button
          className="icon-btn sidebar-close"
          onClick={() => setMenuOpen(false)}
          aria-label="메뉴 닫기"
        >
          <X size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        {portalRole === 'member' ? (
          <>
            <p className="sidebar-label">회원 공간</p>
            <nav className="desktop-nav" aria-label="회원 메뉴" data-testid="member-desktop-nav">
              {(
                [
                  { id: 'schedule', label: '시간표 · 수업 예약', icon: CalendarDays },
                  { id: 'bookings', label: '내 예약 현황', icon: Bookmark },
                  { id: 'wallet', label: '내 수강권 지갑', icon: Ticket },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const isActive = memberSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => focusMemberSection(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={isActive ? 'active' : ''}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={prefersReduced ? undefined : 'pf-member-sidebar-pill'}
                        className="pf-nav-active-pill"
                        aria-hidden="true"
                        transition={
                          prefersReduced
                            ? { duration: 0 }
                            : { type: 'spring', duration: 0.28, bounce: 0 }
                        }
                      />
                    )}
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="pf-nav-item-label">{label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`pf-sidebar-quick-stage ${
                state.activeTab === 'stage' ? 'is-active' : ''
              } ${canStartLiveStage ? 'is-ready' : ''}`.trim()}
              data-testid="sidebar-quick-stage-btn"
              aria-current={state.activeTab === 'stage' ? 'page' : undefined}
              onClick={() => changeTab(canStartLiveStage ? 'stage' : 'workbench')}
            >
              <span className="pf-sidebar-quick-stage__row">
                <Play size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{canStartLiveStage ? '수업 진행하기' : '수업 준비하기'}</span>
                <small>
                  {canStartLiveStage
                    ? `${plannedClassMinutes}분 · ${nonRestStepCount}동작`
                    : '동작 추가'}
                </small>
              </span>
              <span className="pf-sidebar-quick-stage__track" aria-hidden="true">
                <i style={{ transform: `scaleX(${stageReadinessRatio})` }} />
              </span>
            </button>
            <nav className="desktop-nav" aria-label="주 메뉴">
              {desktopNavigationGroups.map((group) => (
                <div key={group.groupLabel} className="pf-nav-group">
                  <p className="sidebar-label">{group.groupLabel}</p>
                  {group.items.map(({ id, detail, icon: Icon }) => {
                    const isActive = state.activeTab === id;
                    const quietBadge =
                      id === 'workbench' && nonRestStepCount > 0
                        ? nonRestStepCount
                        : id === 'schedule' && upcoming.length > 0
                          ? upcoming.length
                          : id === 'binder' && state.savedSequences.length > 0
                            ? state.savedSequences.length
                            : id === 'history' && state.historyLogs.length > 0
                              ? state.historyLogs.length
                              : null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => changeTab(id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={isActive ? 'active' : ''}
                      >
                        {isActive && (
                          <motion.span
                            layoutId={prefersReduced ? undefined : 'pf-instructor-sidebar-pill'}
                            className="pf-nav-active-pill"
                            aria-hidden="true"
                            transition={
                              prefersReduced
                                ? { duration: 0 }
                                : { type: 'spring', duration: 0.28, bounce: 0 }
                            }
                          />
                        )}
                        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                        <span className="pf-nav-item-label">{detail}</span>
                        {id === 'atlas' ? (
                          <small>{state.exercises.length}</small>
                        ) : quietBadge !== null ? (
                          <small aria-hidden="true">{quietBadge}</small>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            {upcoming[0] && (
              <button
                type="button"
                className="pf-sidebar-next-peek"
                aria-label="다가오는 예정 수업 바로가기"
                onClick={() => changeTab('schedule')}
              >
                <span className="pf-sidebar-next-peek__kicker">
                  <i aria-hidden="true" /> 다음 일정
                </span>
                <strong>
                  {upcoming[0].date === today ? '오늘' : upcoming[0].date.slice(5).replace('-', '/')}{' '}
                  {formatScheduleTime(upcoming[0].startTime)}
                </strong>
                <small>{upcoming[0].title}</small>
              </button>
            )}
            <details className="pf-sidebar-more-drawer">
              <summary>기록 · 도구 더보기</summary>
              <div className="pf-sidebar-more-drawer__body">
                <button
                  type="button"
                  className="sidebar-study-link"
                  onClick={() => changeTab('history')}
                >
                  <Clock3 size={16} strokeWidth={1.5} aria-hidden="true" /> 수업 기록
                </button>
                <section className="v2-sidebar-upcoming" aria-label="다가오는 수업">
                  <h2>다가오는 수업</h2>
                  {upcoming.length ? (
                    upcoming.map((item) => (
                      <button
                        key={item.id}
                        className="v2-upcoming-link"
                        onClick={() => changeTab('schedule')}
                      >
                        <strong>{formatScheduleTime(item.startTime)}</strong>
                        <span>
                          {item.title}
                          <small>
                            {state.instructorSchedule.locations.find(
                              (location) => location.id === item.locationId,
                            )?.alias || '장소 확인 필요'}{' '}
                            · {item.date === today ? '오늘' : item.date.slice(5).replace('-', '/')}
                          </small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>등록된 가까운 수업이 없습니다.</p>
                  )}
                  <button className="text-button" onClick={() => changeTab('schedule')}>
                    일정 전체 보기 <CalendarRange size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </section>
                <button
                  type="button"
                  className="sidebar-study-link"
                  aria-label="강사 연습실과 사용법"
                  onClick={() => {
                    setMenuOpen(false);
                    setStudyOpen({ mode: 'guide' });
                  }}
                >
                  <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" /> 사용법·연습실
                </button>
                <button
                  type="button"
                  className="sidebar-study-link"
                  onClick={() => {
                    setMenuOpen(false);
                    focusMemberSection('schedule');
                  }}
                >
                  <CalendarDays size={16} strokeWidth={1.5} aria-hidden="true" /> 회원 예약 화면
                  보기
                </button>
                <button
                  className="pwa-sidebar-button"
                  type="button"
                  onClick={() => setInstallOpen(true)}
                >
                  <ArrowDownToLine size={16} strokeWidth={1.5} aria-hidden="true" /> 앱 설치
                </button>
              </div>
            </details>
          </>
        )}
        {portalRole === 'member' && (
          <>
            <button
              type="button"
              className="sidebar-study-link"
              onClick={() => {
                setMenuOpen(false);
                runPageTransition(() => setPortalRole('instructor'), { kind: 'portal' });
              }}
            >
              <CalendarDays size={16} strokeWidth={1.5} aria-hidden="true" /> 강사 작업실로 전환
            </button>
            <button
              className="pwa-sidebar-button"
              type="button"
              onClick={() => setInstallOpen(true)}
            >
              <ArrowDownToLine size={16} strokeWidth={1.5} aria-hidden="true" /> 앱 설치
            </button>
          </>
        )}
        <button className="workspace-button" onClick={() => setSettingsOpen(true)}>
          <span className="studio-avatar">F</span>
          <span>
            나의 스튜디오
            <small>
              {state.persistenceError ? '기기 저장 확인 · 백업 권장' : '이 기기에 저장'}
            </small>
          </span>
          <Settings2 size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </aside>
      {menuOpen && (
        <button className="menu-scrim" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기" />
      )}
      <div className="workspace" inert={menuOpen ? true : undefined}>
        <header className="topbar">
          <div className="mobile-brand">
            <button
              ref={menuButtonRef}
              className="icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="메뉴 열기"
              aria-expanded={menuOpen}
            >
              <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <span className="vnext-wordmark">
              <StudioBrandMark size={18} />
              Pilates Flow<small aria-hidden="true">수업 설계 · 3D 스튜디오</small>
            </span>
          </div>
          <div className="breadcrumb">
            <span className="pf-breadcrumb-root">나의 스튜디오</span> <span>/</span>{' '}
            <strong>
              {portalRole === 'member'
                ? '회원 수업 예약·수강권'
                : state.activeTab === 'stage'
                  ? '수업 진행'
                  : state.activeTab === 'history'
                    ? '진행 기록'
                    : navigation.find((item) => item.id === state.activeTab)?.detail}
            </strong>
            {portalRole === 'instructor' && state.activeTab === 'workbench' && (
              <span className="pf-breadcrumb-meta" aria-hidden="true">
                {plannedClassMinutes} / {state.activeTargetMinutes}분
              </span>
            )}
          </div>
          <div className="topbar-actions">
            {portalRole === 'instructor' && state.activeTab !== 'stage' && canStartLiveStage && (
              <button
                type="button"
                className="pf-mobile-topbar-stage-btn"
                aria-label="모바일 수업 진행 바로가기"
                onClick={() => changeTab('stage')}
              >
                <Play size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>진행</span>
              </button>
            )}
            {state.activeTab !== 'stage' && (
              <button
                type="button"
                className="pf-topbar-cmdk-btn"
                data-testid="topbar-command-palette-btn"
                aria-label="빠른 이동 및 동작 검색 열기"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Search size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>동작 · 수업 검색</span>
                <kbd className="pf-topbar-cmdk-kbd" aria-hidden="true" />
              </button>
            )}
            {portalRole === 'instructor' && state.activeTab !== 'stage' && (
              <button
                type="button"
                className="app-create-movement"
                aria-label="새 동작 메모"
                onClick={() => setIdeaSheetState({ open: true, exercise: null })}
              >
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>새 동작</span>
              </button>
            )}
            {state.activeTab !== 'stage' && (
              <div
                className="pf-role-switcher"
                role="group"
                aria-label="이용자 화면 전환"
                data-testid="portal-role-switcher"
              >
                <button
                  type="button"
                  className="pf-role-switcher__btn"
                  aria-pressed={portalRole === 'instructor'}
                  onClick={() => {
                    if (portalRole !== 'instructor') {
                      runPageTransition(() => setPortalRole('instructor'), { kind: 'portal' });
                    }
                  }}
                >
                  {portalRole === 'instructor' && (
                    <motion.span
                      layoutId={prefersReduced ? undefined : 'pf-role-switcher-pill'}
                      className="pf-role-switcher__pill"
                      aria-hidden="true"
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: 'spring', duration: 0.25, bounce: 0 }
                      }
                    />
                  )}
                  <span className="pf-role-switcher__label">강사 작업실</span>
                </button>
                <button
                  type="button"
                  className="pf-role-switcher__btn"
                  aria-pressed={portalRole === 'member'}
                  onClick={() => focusMemberSection('schedule')}
                >
                  {portalRole === 'member' && (
                    <motion.span
                      layoutId={prefersReduced ? undefined : 'pf-role-switcher-pill'}
                      className="pf-role-switcher__pill"
                      aria-hidden="true"
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: 'spring', duration: 0.25, bounce: 0 }
                      }
                    />
                  )}
                  <span className="pf-role-switcher__label">회원 예약</span>
                </button>
              </div>
            )}
            {state.activeTab !== 'stage' && (
              <button
                type="button"
                className="app-quick-guide-btn"
                aria-label="처음 사용 안내 열기"
                onClick={() => setStudyOpen({ mode: 'guide' })}
              >
                <CircleHelp size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>사용법</span>
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="데이터 백업과 사용 안내"
              title="내 보유 장비 · 데이터 백업"
            >
              <Settings2 size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {state.persistenceError && (
            <p className="status error" role="alert" data-testid="global-persistence-alert">
              <span>{state.persistenceError}</span>{' '}
              <button type="button" className="text-button" onClick={exportData}>
                JSON 백업 내보내기
              </button>{' '}
              <button type="button" className="text-button" onClick={() => setSettingsOpen(true)}>
                전체 백업 열기
              </button>
            </p>
          )}
          {portalRole === 'member' ? (
            <MemberBookingView
              activeSection={memberSection}
              onOpenSchedule={() => focusMemberSection('schedule')}
            />
          ) : (
            <>
              {(state.activeTab === 'binder' || state.activeTab === 'history') && (
                <div className="pf-auto-mobile-only">
                  <MobileSubPageBar
                    ariaLabel="저장한 수업과 진행 기록"
                    activeId={state.activeTab}
                    options={[
                      { id: 'binder', label: '저장한 수업', badge: state.savedSequences.length },
                      { id: 'history', label: '수업 기록', badge: state.historyLogs.length },
                    ]}
                    onSelect={changeTab}
                  />
                </div>
              )}
              {state.activeTab === 'workbench' && (
                <SequenceStudioWorkbench
                  onStartClass={() => changeTab('stage')}
                  sourceDetailOpen={!!preview || ideaSheetState.open}
                  onRegisterDetailAddHandler={(handler) => {
                    workbenchDetailAddRef.current = handler;
                  }}
                  onOpenYouTubePreview={(exercise) => {
                    if (isMovementIdeaExercise(exercise)) {
                      setIdeaSheetState({ open: true, exercise });
                      return;
                    }
                    setPreview(exercise);
                  }}
                  onOpenIdeaSheet={(exercise) =>
                    setIdeaSheetState({ open: true, exercise: exercise ?? null })
                  }
                  onOpenClipper={() => setClipperOpen(true)}
                  onOpenLogModal={openLog}
                  onOpenInventory={() => setSettingsOpen(true)}
                />
              )}
              <Suspense
                fallback={
                  <p className="status" role="status">
                    작업 공간을 열고 있어요…
                  </p>
                }
              >
                {state.activeTab === 'schedule' && <InstructorScheduleView />}
                {state.activeTab === 'atlas' && (
                  <ExerciseAtlasView
                    onOpenStudy={(exerciseId) => setStudyOpen({ mode: 'study', exerciseId })}
                    onOpenMotionDrafts={(draftId) => {
                      setMotionDraftInitialId(draftId);
                      setMotionDraftLabOpen(true);
                    }}
                    onOpenYouTubePreview={(exercise) => {
                      if (isMovementIdeaExercise(exercise)) {
                        setIdeaSheetState({ open: true, exercise });
                        return;
                      }
                      setPreview(exercise);
                    }}
                    onOpenIdeaSheet={(exercise) =>
                      setIdeaSheetState({ open: true, exercise: exercise ?? null })
                    }
                    onOpenClipper={() => setClipperOpen(true)}
                  />
                )}
                {(state.activeTab === 'binder' || state.activeTab === 'history') && (
                  <ClassBinderView
                    view={state.activeTab === 'history' ? 'history' : 'saved'}
                    onOpenLogModal={openLog}
                  />
                )}
                {state.activeTab === 'stage' && (
                  <LiveStageView
                    key={getActiveWorkspaceOwner() ?? '__anonymous__'}
                    navigationRef={stageNavigationRef}
                    onNavigate={completeStageTransition}
                    onNavigationCancelled={() => {
                      pendingStageTransition.current = null;
                    }}
                    onOpenLogModal={openLog}
                  />
                )}
                <WorkspaceHeadingFocus tab={state.activeTab} request={workspaceFocusRequest} />
              </Suspense>
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            Pilates Flow <span>·</span> 나의 수업, 나의 흐름
          </span>
          <button onClick={() => setSettingsOpen(true)}>저장·복구 안내</button>
        </footer>
      </div>
      {portalRole === 'member' ? (
        <nav
          className="bottom-nav is-member-nav"
          inert={menuOpen ? true : undefined}
          aria-label="모바일 회원 메뉴"
          data-testid="member-bottom-nav"
        >
          {(
            [
              { id: 'schedule', label: '시간표', icon: CalendarDays },
              { id: 'bookings', label: '내 예약', icon: Bookmark },
              { id: 'wallet', label: '수강권', icon: Ticket },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const isActive = memberSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => focusMemberSection(id)}
                className={isActive ? 'active' : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'pf-member-bottom-pill'}
                    className="pf-bottom-nav-pill"
                    aria-hidden="true"
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: 'spring', duration: 0.26, bounce: 0 }
                    }
                  />
                )}
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      ) : (
        state.activeTab !== 'stage' && (
          <nav
            className="bottom-nav"
            inert={menuOpen ? true : undefined}
            aria-label="모바일 주 메뉴"
          >
            {navigation.map(({ id, label, icon: Icon }) => {
              const isExact = state.activeTab === id;
              const isVisualActive = isExact || (id === 'binder' && state.activeTab === 'history');
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeTab(id)}
                  className={isVisualActive ? 'active' : ''}
                  aria-current={isExact ? 'page' : undefined}
                >
                  {isVisualActive && (
                    <motion.span
                      layoutId={prefersReduced ? undefined : 'pf-instructor-bottom-pill'}
                      className="pf-bottom-nav-pill"
                      aria-hidden="true"
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: 'spring', duration: 0.26, bounce: 0 }
                      }
                    />
                  )}
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        )
      )}
      <Suspense
        fallback={
          <p className="modal-loading" role="status">
            자료를 열고 있어요…
          </p>
        }
      >
        {motionDraftLabOpen && (
          <MotionDraftLabDialog
            open
            initialDraftId={motionDraftInitialId}
            onClose={() => setMotionDraftLabOpen(false)}
          />
        )}
        {studyOpen && (
          <InstructorStudyBoundary onClose={() => setStudyOpen(null)}>
            <Suspense
              fallback={
                <p className="modal-loading" role="status">
                  연습실을 열고 있어요…
                </p>
              }
            >
              <InstructorStudyDialog
                exercises={state.exercises}
                study={state.instructorStudyState ?? createEmptyInstructorStudyState()}
                onOpenWorkbench={() => {
                  setStudyOpen(null);
                  changeTab('workbench');
                }}
                initialMode={studyOpen.mode}
                initialExerciseId={studyOpen.exerciseId}
                onToggleBookmark={(id) => {
                  state.toggleStudyBookmark(id);
                }}
                onCueHiddenChange={(hidden) => {
                  state.setRehearsalCueHidden(hidden);
                }}
                onTutorialTaskChange={(id, complete) => {
                  state.setStudyTutorialTaskCompleted(id, complete);
                }}
                onOpenReview={(exercise) => {
                  setStudyOpen(null);
                  if (isMovementIdeaExercise(exercise)) {
                    setIdeaSheetState({ open: true, exercise });
                    return;
                  }
                  setPreview(exercise);
                }}
                onClose={() => setStudyOpen(null)}
              />
            </Suspense>
          </InstructorStudyBoundary>
        )}
        {preview && (
          <YouTubePreviewModal
            exercise={preview}
            onClose={() => setPreview(null)}
            onAddToSequence={(exerciseId) => {
              const before = usePilatesStore.getState();
              if (before.activeTab === 'workbench' && workbenchDetailAddRef.current) {
                return workbenchDetailAddRef.current(exerciseId);
              }
              const exercise = before.exercises.find((item) => item.id === exerciseId);
              if (!exercise)
                return {
                  success: false,
                  message: '동작 정보가 바뀌었습니다. 현재 정보를 다시 확인해 주세요.',
                };
              before.appendExerciseToSequence(exerciseId);
              const after = usePilatesStore.getState();
              const success =
                after.activeSteps.length === before.activeSteps.length + 1 &&
                after.activeSteps.at(-1)?.exerciseId === exerciseId;
              return {
                success,
                ...(success
                  ? {}
                  : {
                      message:
                        after !== before
                          ? after.generationError ||
                            '현재 수업 조건을 확인한 뒤 다시 추가해 주세요.'
                          : '동작을 추가하지 못했습니다. 현재 수업안을 확인해 주세요.',
                    }),
              };
            }}
          />
        )}
        {clipperOpen && (
          <YouTubeClipperModal open={clipperOpen} onClose={() => setClipperOpen(false)} />
        )}
      </Suspense>
      {logId && (
        <Suspense
          fallback={
            <p className="modal-loading" role="status">
              자료를 열고 있어요…
            </p>
          }
        >
          <div ref={logContainerRef}>
            <LogSessionModal sequenceId={logId} context={logContext} onClose={closeLog} />
          </div>
        </Suspense>
      )}
      {ideaSheetState.open && (
        <MovementIdeaSheet
          key={ideaSheetState.exercise?.id ?? 'new-idea'}
          open={ideaSheetState.open}
          initialExercise={ideaSheetState.exercise}
          onClose={() => setIdeaSheetState({ open: false, exercise: null })}
          onAddedToClass={() => {
            if (usePilatesStore.getState().activeTab !== 'workbench') {
              commitTabChange('workbench');
            }
          }}
        />
      )}
      <LightDismissDialog
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title="앱 설치"
        maxWidth="560px"
      >
        <PwaInstallPanel />
      </LightDismissDialog>
      <LightDismissDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="나의 스튜디오"
        subtitle="보유 장비를 고르고 수업 자료를 안전하게 보관하세요."
        maxWidth="640px"
      >
        <div className="button-row" style={{ marginBottom: '12px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSettingsOpen(false);
              setStudyOpen({ mode: 'guide' });
            }}
          >
            <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>처음 오셨나요? 3단계 사용법 보기</span>
          </button>
        </div>
        <InventoryPanel />
        <section className="settings-section">
          <span className="eyebrow">브라우저 기본 보관</span>
          <h3>이 브라우저에 보관됩니다</h3>
          <p>
            시퀀스, 동작, 수업 기록은 이 브라우저에 자동 보관됩니다. 다른 기기로 옮길 때는 JSON
            백업 파일을 사용하고, 브라우저 데이터를 삭제하기 전 백업해 주세요.
          </p>
          <div className="button-row">
            <button className="btn-primary" onClick={exportData}>
              <ArrowDownToLine size={16} strokeWidth={1.5} aria-hidden="true" />
              전체 백업
            </button>
          </div>
          <Suspense
            fallback={
              <p role="status" className="status">
                복구 도구를 열고 있어요…
              </p>
            }
          >
            <RecoveryPreview />
          </Suspense>
          <p className="muted">
            불러오기는 검증 후 기존 자료와 합칩니다. 학생의 실명이나 건강 정보 대신 수업 별칭을
            사용하세요.
          </p>
          {backupMessage && (
            <p className="status" role="status">
              {backupMessage}
            </p>
          )}
        </section>
        {settingsOpen && (
          <details className="settings-section">
            <summary>계정 연결 · 클라우드 동기화</summary>
            <DeferredPanelBoundary>
              <Suspense
                fallback={
                  <p className="status" role="status">
                    계정 백업을 열고 있어요…
                  </p>
                }
              >
                <CloudSyncPanel />
              </Suspense>
            </DeferredPanelBoundary>
          </details>
        )}
        <details className="settings-section safety-notes">
          <summary>무료 추천 기준 · 골반 목표 및 운동 전 확인</summary>
          <p>
            기본 추천은 기구·시간·난이도·이력을 바탕으로 이 기기에서 추가 비용 없이(0원 확인됨) 바로
            조합됩니다. 서버 무료 조건 AI 보조는 확인된 한도 안에서만 동작하며, 한도 도달·연결 오류
            시에는 기기 내 규칙 추천으로 자동 전환되어 작성이 중단되지 않습니다. 동의 없는 유료 과금
            호출이나 브라우저 비밀키 노출·저장은 차단됩니다.
          </p>
          <p>
            전방·후방 골반경사는 강사의 관찰 메모입니다. 외형만으로 통증 원인이나 특정 근육의
            약화·단축을 판정하지 않으며 교정·치료 효과를 보장하지 않습니다. 모든 추천·도해·창작
            메모는 수업 준비 참고 자료이므로, 수업 전 강사가 대상자 컨디션과 스프링 장력을 직접
            확인하고 통증 발생 시 즉시 중단하세요.
          </p>
          <p>
            새로 생기거나 악화하는 통증·저림·근력 저하는 전문가에게 평가받으세요. 허리 통증과 함께
            양쪽 다리 증상, 회음부 감각 저하 또는 배뇨·배변 변화가 있으면 즉시 응급 평가를 받으세요.
          </p>
          <a href="https://www.nhs.uk/conditions/back-pain/" target="_blank" rel="noopener noreferrer">
            NHS 허리 통증·응급 증상 안내
          </a>
        </details>
        <details
          className="settings-section"
          onToggle={(event) => setSettingsSummaryOpen(event.currentTarget.open)}
        >
          <summary onClick={() => setSettingsSummaryOpen(true)}>
            4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)
          </summary>
          {settingsSummaryOpen && (
            <Suspense
              fallback={
                <p className="status" role="status">
                  통합 설정 요약을 열고 있어요…
                </p>
              }
            >
              <PilatesSettingsPage
                snapshot={{
                  data: {
                    savedSequenceCount: state.savedSequences.length,
                    exerciseCount: state.exercises.length,
                    historyLogCount: state.historyLogs.length,
                    ownedEquipmentIds: state.ownedEquipment,
                    ownedPropIds: state.ownedProps,
                    persistenceError: state.persistenceError,
                    backupMessage,
                  },
                }}
                port={{
                  onExportBackupJson: exportData,
                  onToggleOwnedEquipment: state.toggleOwnedEquipment,
                  onToggleOwnedProp: (propId) => state.toggleOwnedProp(propId as PropType),
                }}
              />
            </Suspense>
          )}
        </details>
        {(import.meta.env.DEV || import.meta.env.MODE === 'test') && (
          <section className="settings-section" aria-label="개발용 내부 검수">
            <span className="eyebrow">개발·테스트 전용</span>
            <h3>디자인 시스템 내부 검수</h3>
            <p>
              개발·테스트 환경에서만 표시되는 내부 검수 도구입니다. 토큰·공통 컴포넌트 상태·반응형
              뷰포트를 외부 공개 없이 확인합니다.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="pf-ds-trigger"
                onClick={() => {
                  setSettingsOpen(false);
                  setDesignSystemOpen(true);
                }}
              >
                디자인 시스템 검수 열기
              </button>
              <button
                type="button"
                className="btn-secondary"
                data-testid="open-motion-coverage-preview-btn"
                onClick={() => {
                  setSettingsOpen(false);
                  setMcPreviewOpen(true);
                }}
              >
                모션 도해 검수 프리뷰 열기
              </button>
            </div>
          </section>
        )}
      </LightDismissDialog>
      {designSystemOpen && (
        <Suspense
          fallback={
            <p className="modal-loading" role="status">
              검수 화면을 열고 있어요…
            </p>
          }
        >
          <DesignSystemInspector
            open={designSystemOpen}
            onClose={() => setDesignSystemOpen(false)}
          />
        </Suspense>
      )}
      {mcPreviewOpen && (
        <LightDismissDialog
          open={mcPreviewOpen}
          onClose={() => setMcPreviewOpen(false)}
          title="모션 도해 지원 수준 로컬 검수 프리뷰"
          maxWidth="960px"
        >
          <Suspense fallback={null}>
            <LazyMotionCoveragePreviewHarness initialExerciseOrId="ex-warmup-01" />
          </Suspense>
        </LightDismissDialog>
      )}
      <StudioCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={changeTab}
        onLoadSequence={loadSavedSequence}
        onSwitchPortalRole={(role) => {
          if (role === 'member') focusMemberSection('schedule');
          else setPortalRole('instructor');
        }}
        onInspectExercise3D={(exercise) => {
          if (isMovementIdeaExercise(exercise)) {
            setIdeaSheetState({ open: true, exercise });
            return;
          }
          setPreview(exercise);
        }}
        onOpenNewIdea={() => setIdeaSheetState({ open: true, exercise: null })}
        canStartLiveStage={canStartLiveStage}
      />
      {incomingSharedSequence && (
        <SequenceQrImportDialog
          sharedSequence={incomingSharedSequence}
          onDismiss={() => {
            clearShareHashFromAddressBar();
            setIncomingSharedSequence(null);
          }}
          onImported={() => {
            clearShareHashFromAddressBar();
            setIncomingSharedSequence(null);
            setPortalRole('instructor');
          }}
        />
      )}
    </div>
  );
}
