import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Bookmark,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  Clock3,
  Leaf,
  Library,
  Menu,
  Play,
  Settings2,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import type { TeachingLogContext } from './components/LogSessionModal';
import type { LiveStageNavigationHandle } from './components/LiveStageView';
import { SequenceWorkbench } from './components/SequenceWorkbench';
import type { WorkbenchPlanningMode } from './components/SequenceWorkbench';
import { LightDismissDialog } from './components/LightDismissDialog';
import { PwaInstallPanel } from './components/PwaInstallPanel';
import { StudioOffline3dReadinessCard } from './components/StudioOffline3dReadinessCard';
import { MovementIdeaSheet } from './components/MovementIdeaSheet';
import { InventoryPanel } from './components/InventoryPanel';
import { DeferredPanelBoundary } from './components/DeferredPanelBoundary';
import { InstructorStudyBoundary } from './components/InstructorStudyBoundary';
import { StudioJourneyBar } from './components/StudioJourneyBar';
import { MemberBookingView } from './components/MemberBookingView';
import { SequenceQrImportDialog } from './components/SequenceQrShareDialog';
import { PageIntentBanner } from './components/PageIntentBanner';
import { MobileSubPageBar } from './components/MobileSubPageBar';
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
import { createEmptyInstructorStudyState } from './types/instructorStudy';
import { isMovementIdeaExercise } from './utils/movementIdeaDraft';

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
  { id: 'workbench', label: '수업', detail: '오늘의 수업', icon: CalendarDays },
  { id: 'atlas', label: '동작', detail: '동작 라이브러리', icon: Library },
  { id: 'schedule', label: '일정', detail: '강사 일정', icon: CalendarRange },
  { id: 'binder', label: '저장', detail: '저장한 플로우', icon: Bookmark },
  { id: 'history', label: '기록', detail: '수업 기록', icon: Clock3 },
] as const;

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
  const [planningMode, setPlanningMode] = useState<WorkbenchPlanningMode>(() =>
    usePilatesStore.getState().activeSteps.length ? 'auto' : 'manual',
  );
  const [preview, setPreview] = useState<PilatesExercise | null>(null);
  const [ideaSheetState, setIdeaSheetState] = useState<{
    open: boolean;
    exercise: PilatesExercise | null;
  }>({ open: false, exercise: null });
  const [clipperOpen, setClipperOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
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
  const [portalRole, setPortalRole] = useState<'instructor' | 'member'>('instructor');
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
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }
  };
  const [memberSection, setMemberSection] = useState<'schedule' | 'bookings' | 'wallet'>('schedule');
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceFocusRequest, setWorkspaceFocusRequest] = useState(0);
  const nonRestStepCount = useMemo(
    () => state.activeSteps.filter((step) => !isRestStep(step)).length,
    [state.activeSteps],
  );
  const canStartLiveStage = useMemo(
    () =>
      buildSequenceSimulation(
        state.activeSteps,
        state.exercises,
        state.activeTargetMinutes,
      ).gate.canRehearse,
    [state.activeSteps, state.exercises, state.activeTargetMinutes],
  );
  const [logId, setLogId] = useState<string | null>(null);
  const [logContext, setLogContext] = useState<TeachingLogContext | undefined>();
  const [backupMessage, setBackupMessage] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const stageNavigationRef = useRef<LiveStageNavigationHandle | null>(null);
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
    setPortalRole('instructor');
    state.setActiveTab(tab);
    setMenuOpen(false);
    setWorkspaceFocusRequest((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const focusMemberSection = (section: 'schedule' | 'bookings' | 'wallet') => {
    setPortalRole('member');
    setMemberSection(section);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      const targetId =
        section === 'wallet'
          ? 'member-wallet-section'
          : section === 'bookings'
            ? 'member-bookings-section'
            : 'member-schedule-section';
      const el = document.getElementById(targetId) ?? document.getElementById('workspace-main-heading');
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
  };
  const changeTab = (tab: ActiveWorkspaceTab) => {
    if (
      usePilatesStore.getState().activeTab === 'stage' &&
      tab !== 'stage' &&
      stageNavigationRef.current?.requestExit(tab)
    ) {
      setMenuOpen(false);
      return;
    }
    commitTabChange(tab);
  };
  const openLog = (id: string, context?: TeachingLogContext, destination?: ActiveWorkspaceTab) => {
    closingLog.current = false;
    logNavigation.current = destination
      ? {
          target: destination,
          sequenceId: id,
          previousIds: new Set(usePilatesStore.getState().historyLogs.map((log) => log.id)),
        }
      : null;
    setLogId(id);
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
    if (requested && recorded) commitTabChange(requested.target);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage('백업 파일을 만들었습니다. 기기 변경 전 안전한 곳에 보관해 주세요.');
    } catch {
      setBackupMessage('백업을 만들 수 없습니다. 브라우저 저장 권한을 확인해 주세요.');
    }
  };
  return (
    <div className={`app-shell vnext-shell ${state.activeTab === 'stage' ? 'is-teaching' : ''}`}>
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
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
          aria-label={portalRole === 'member' ? 'Flow Atelier 회원 예약으로' : 'Flow Atelier 계획으로'}
        >
          <Leaf size={30} strokeWidth={1.3} />
          <span>
            Flow Atelier<small>PILATES CLASS PLANNER</small>
          </span>
        </a>
        <button
          className="icon-btn sidebar-close"
          onClick={() => setMenuOpen(false)}
          aria-label="메뉴 닫기"
        >
          <X size={20} />
        </button>
        {portalRole === 'member' ? (
          <>
            <p className="sidebar-label">MEMBER PORTAL</p>
            <nav className="desktop-nav" aria-label="회원 메뉴" data-testid="member-desktop-nav">
              <button
                type="button"
                onClick={() => focusMemberSection('schedule')}
                aria-current={memberSection === 'schedule' ? 'page' : undefined}
                className={memberSection === 'schedule' ? 'active' : ''}
              >
                <CalendarDays size={20} strokeWidth={1.6} />
                시간표 · 수업 예약
              </button>
              <button
                type="button"
                onClick={() => focusMemberSection('bookings')}
                aria-current={memberSection === 'bookings' ? 'page' : undefined}
                className={memberSection === 'bookings' ? 'active' : ''}
              >
                <Bookmark size={20} strokeWidth={1.6} />
                내 예약 현황
              </button>
              <button
                type="button"
                onClick={() => focusMemberSection('wallet')}
                aria-current={memberSection === 'wallet' ? 'page' : undefined}
                className={memberSection === 'wallet' ? 'active' : ''}
              >
                <Ticket size={20} strokeWidth={1.6} />
                내 수강권 지갑
              </button>
            </nav>
          </>
        ) : (
          <>
            <p className="sidebar-label">필라테스 작업실</p>
            <nav className="desktop-nav" aria-label="주 메뉴">
              {navigation.map(({ id, detail, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => changeTab(id)}
                  aria-current={state.activeTab === id ? 'page' : undefined}
                  className={state.activeTab === id ? 'active' : ''}
                >
                  <Icon size={20} strokeWidth={1.6} />
                  {detail}
                  {id === 'atlas' && <small>{state.exercises.length}</small>}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className={`pf-sidebar-quick-stage ${
                state.activeTab === 'stage' ? 'is-active' : ''
              } ${canStartLiveStage ? 'is-ready' : ''}`.trim()}
              data-testid="sidebar-quick-stage-btn"
              aria-current={state.activeTab === 'stage' ? 'page' : undefined}
              onClick={() => changeTab(canStartLiveStage ? 'stage' : 'workbench')}
            >
              <Play size={17} aria-hidden="true" />
              <span>수업 진행</span>
              <small>{canStartLiveStage ? `${nonRestStepCount}개 준비됨` : '동작 담기'}</small>
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
                일정 전체 보기 <CalendarRange size={15} />
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
              <BookOpen size={19} aria-hidden="true" /> 사용법·연습실
            </button>
          </>
        )}
        <button
          type="button"
          className="sidebar-study-link"
          onClick={() => {
            setMenuOpen(false);
            setPortalRole((prev) => (prev === 'member' ? 'instructor' : 'member'));
          }}
        >
          <CalendarDays size={18} aria-hidden="true" />{' '}
          {portalRole === 'member' ? '강사 작업실로 전환' : '회원 예약 화면 보기'}
        </button>
        <button className="pwa-sidebar-button" type="button" onClick={() => setInstallOpen(true)}>
          <ArrowDownToLine size={18} aria-hidden="true" /> 앱 설치
        </button>
        <button className="workspace-button" onClick={() => setSettingsOpen(true)}>
          <span className="studio-avatar">F</span>
          <span>
            나의 스튜디오<small>이 기기에 저장</small>
          </span>
          <Settings2 size={17} />
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
              <Menu size={21} />
            </button>
            <span className="vnext-wordmark">
              Flow Atelier<small>YOUR TEACHING STUDIO</small>
            </span>
          </div>
          <div className="breadcrumb">
            나의 스튜디오 <span>/</span>{' '}
            {portalRole === 'member'
              ? '회원 수업 예약·수강권'
              : state.activeTab === 'stage'
                ? '수업 진행'
                : navigation.find((item) => item.id === state.activeTab)?.detail}
          </div>
          <div className="topbar-actions">
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
                  onClick={() => setPortalRole('instructor')}
                >
                  강사 작업실
                </button>
                <button
                  type="button"
                  className="pf-role-switcher__btn"
                  aria-pressed={portalRole === 'member'}
                  onClick={() => setPortalRole('member')}
                >
                  회원 예약
                </button>
              </div>
            )}
            <span className="local-state">
              <i />
              개인 작업 공간
            </span>
            {portalRole === 'instructor' && state.activeTab !== 'stage' && (
              <button
                type="button"
                className="app-create-movement"
                aria-label="새 동작 메모"
                onClick={() => setIdeaSheetState({ open: true, exercise: null })}
              >
                <Sparkles size={18} aria-hidden="true" />
                <span>새 동작</span>
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="데이터 백업과 사용 안내"
            >
              <CircleHelp size={20} strokeWidth={1.6} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {state.persistenceError && (
            <p className="status error" role="alert">
              {state.persistenceError}{' '}
              <button className="text-button" onClick={() => setSettingsOpen(true)}>
                전체 백업 열기
              </button>
            </p>
          )}
          {portalRole === 'member' ? (
            <MemberBookingView
              activeSection={memberSection}
              onSwitchToInstructor={() => setPortalRole('instructor')}
            />
          ) : (
            <>
              {state.activeTab === 'atlas' && (
                <PageIntentBanner
                  stepBadge="동작 탐색"
                  title="수업에 필요한 동작을 찾아보세요"
                  purpose="기구·부위로 좁혀 보고, 동작을 선택해 원자료와 주의사항을 확인한 뒤 수업안에 담으세요."
                  singleActionHint="동작 선택 → 세부 안내 확인"
                />
              )}
              {(state.activeTab === 'binder' || state.activeTab === 'history') && (
                <MobileSubPageBar
                  ariaLabel="저장한 수업과 진행 기록"
                  activeId={state.activeTab}
                  options={[
                    { id: 'binder', label: '저장한 수업', badge: state.savedSequences.length },
                    { id: 'history', label: '수업 기록', badge: state.historyLogs.length },
                  ]}
                  onSelect={changeTab}
                />
              )}
              {state.activeTab !== 'stage' && state.activeTab !== 'schedule' && (
                <StudioJourneyBar
                  activeTab={state.activeTab}
                  exerciseCount={state.exercises.length}
                  stepCount={nonRestStepCount}
                  targetMinutes={state.activeTargetMinutes}
                  historyCount={state.historyLogs.length}
                  canStartStage={canStartLiveStage}
                  onSelectStep={changeTab}
                />
              )}
              {state.activeTab === 'workbench' && (
            <SequenceWorkbench
              planningMode={planningMode}
              onPlanningModeChange={setPlanningMode}
              sourceDetailOpen={!!preview || ideaSheetState.open}
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
                navigationRef={stageNavigationRef}
                onNavigate={commitTabChange}
                onOpenLogModal={openLog}
              />
            )}
            <WorkspaceHeadingFocus tab={state.activeTab} request={workspaceFocusRequest} />
          </Suspense>
          {state.activeTab !== 'schedule' && (
            <aside
              className="instructor-review-notice v2-review-notice"
              aria-label="강사 검토 안내"
            >
              <details>
                <summary>자료·모션의 검토 상태 안내</summary>
                <p>
                  검토 기록은 선택 사항이며, 없어도 수업을 구성할 수 있습니다. 진행 전 대상자 컨디션과
                  기구·스프링 장력을 직접 확인하세요. 검토 여부나 AI 제안은 의학적 판단·운동 적합성 보장이
                  아닙니다.
                </p>
                <button className="text-button" onClick={() => changeTab('atlas')}>
                  동작 자료·기록 보기
                </button>
              </details>
            </aside>
          )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            FLOW ATELIER <span>·</span> 수업을 준비하는 조용한 작업실
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
          <button
            type="button"
            onClick={() => focusMemberSection('schedule')}
            className={memberSection === 'schedule' ? 'active' : ''}
            aria-current={memberSection === 'schedule' ? 'page' : undefined}
          >
            <CalendarDays size={21} strokeWidth={1.7} />
            <span>시간표</span>
          </button>
          <button
            type="button"
            onClick={() => focusMemberSection('bookings')}
            className={memberSection === 'bookings' ? 'active' : ''}
            aria-current={memberSection === 'bookings' ? 'page' : undefined}
          >
            <Bookmark size={21} strokeWidth={1.7} />
            <span>내 예약</span>
          </button>
          <button
            type="button"
            onClick={() => focusMemberSection('wallet')}
            className={memberSection === 'wallet' ? 'active' : ''}
            aria-current={memberSection === 'wallet' ? 'page' : undefined}
          >
            <Ticket size={21} strokeWidth={1.7} />
            <span>수강권</span>
          </button>
        </nav>
      ) : (
        state.activeTab !== 'stage' && (
          <nav className="bottom-nav" inert={menuOpen ? true : undefined} aria-label="모바일 주 메뉴">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                className={state.activeTab === id ? 'active' : ''}
                aria-current={state.activeTab === id ? 'page' : undefined}
              >
                <Icon size={21} strokeWidth={1.7} />
                <span>{label}</span>
              </button>
            ))}
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
        {logId && (
          <div ref={logContainerRef}>
            <LogSessionModal sequenceId={logId} context={logContext} onClose={closeLog} />
          </div>
        )}
      </Suspense>
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
        <StudioOffline3dReadinessCard />
      </LightDismissDialog>
      <LightDismissDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="나의 스튜디오"
        subtitle="수업 자료를 안전하게 보관하고 다른 기기로 옮기세요."
        maxWidth="640px"
      >
        {settingsOpen && <StudioOffline3dReadinessCard />}
        {settingsOpen && (
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
        )}
        <InventoryPanel />
        <section className="settings-section">
          <span className="eyebrow">PRIVATE BY DEFAULT</span>
          <h3>이 브라우저에 보관됩니다</h3>
          <p>
            시퀀스, 동작, 수업 기록은 이 브라우저에 자동 보관됩니다. Google 로그인만으로 자료가
            서버에 저장되거나 다른 기기와 동기화되지는 않습니다. 다른 기기로 옮길 때는 JSON 파일을
            사용하고, 브라우저 데이터를 삭제하기 전 백업해 주세요.
          </p>
          <div className="button-row">
            <button className="btn-primary" onClick={exportData}>
              <ArrowDownToLine size={17} />
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
        <section className="settings-section">
          <h3>추천·AI 보조와 동작 자료 안내</h3>
          <p>
            기본 추천은 기구·시간·난이도·이력을 바탕으로 이 기기에서 추가 비용 없이(0원 확인됨) 바로 조합됩니다.
            서버 무료 조건 AI 보조는 설정된 서버 환경의 확인된 한도 안에서만 동작하며, 한도 도달·연결 오류 시에는
            기기 내 규칙 추천으로 자동 전환되어 시퀀스 작성이 중단되지 않습니다. 개인 구독·개발도구 크레딧과 외부
            종량제 API 크레딧은 동일 크레딧으로 가정하지 않으며, 브라우저 비밀키 노출·저장과 동의 없는 유료 과금
            호출은 차단됩니다.
          </p>
          <p>
            모든 추천·도해·창작 메모는 수업 준비 참고 자료이며 의학적 진단이나 치료·안전성을 보장하지
            않습니다. 수업 전 강사가 대상자 컨디션과 스프링 장력을 직접 확인하고, 통증 발생 시 즉시 중단하세요.
          </p>
        </section>
        <details className="settings-section safety-notes">
          <summary>골반 목표와 운동 전 확인</summary>
          <p>
            전방·후방 골반경사는 강사의 관찰 메모입니다. 외형만으로 통증 원인이나 특정 근육의
            약화·단축을 판정하지 않으며 교정·치료 효과를 보장하지 않습니다. 인지·조절, 몸통과 고관절
            협응, 가동성, 근력처럼 검토 가능한 수업 목표를 사용하세요.
          </p>
          <p>
            새로 생기거나 악화하는 통증·저림·근력 저하는 전문가에게 평가받으세요. 허리 통증과 함께
            양쪽 다리 증상, 회음부 감각 저하 또는 배뇨·배변 변화가 있으면 즉시 응급 평가를 받으세요.
          </p>
          <a href="https://www.nhs.uk/conditions/back-pain/" target="_blank" rel="noreferrer">
            NHS 허리 통증·응급 증상 안내
          </a>
        </details>
        <details className="settings-section">
          <summary>4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)</summary>
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
        </details>
        {(import.meta.env.DEV || import.meta.env.MODE === 'test') && (
          <section className="settings-section" aria-label="개발용 내부 검수">
            <span className="eyebrow">INTERNAL DEV ONLY</span>
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
