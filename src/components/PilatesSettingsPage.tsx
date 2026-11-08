import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PilatesSettingsGroupSections } from '../features/settingsPageCandidate/PilatesSettingsGroupSections';
import {
  SETTINGS_PAGE_FIXTURE_PRESETS,
  cloneSettingsSnapshotInput,
  getSettingsFixturePreset,
} from '../features/settingsPageCandidate/settingsPageFixtures';
import {
  createMockSettingsActionRecorder,
  readPersistedSettingsSessionSlice as readPersistedSlice,
  resolveSettingsPageViewModel,
  safeReadSettingsProp as safeReadProp,
  safeSettingsBaselineKey as safeBaselineKey,
  writePersistedSettingsSessionSlice as writePersistedSlice,
  type CandidateInstallOverride,
  type CandidateVoiceOverride,
} from '../features/settingsPageCandidate/settingsPageModel';
import {
  SETTINGS_PAGE_SAFETY_CONTRACT,
  type SettingsFixturePresetId,
  type SettingsGroupId,
  type SettingsPageActionPort,
  type SettingsPageSnapshotInput,
} from '../features/settingsPageCandidate/types';
import '../features/settingsPageCandidate/pilatesSettingsPage.css';
import './CloudSyncPanel.css';

export type SettingsTaskStep = 1 | 2 | 3;

const TASK_STEP_ITEMS: readonly {
  readonly step: SettingsTaskStep;
  readonly label: string;
  readonly groupId: SettingsGroupId;
  readonly summaryKo: string;
}[] = [
  {
    step: 1,
    label: '1 기기·설치 점검',
    groupId: 'install',
    summaryKo:
      '지금 할 일: 홈 화면 앱 설치와 오프라인·한국어 음성 안내 준비 상태를 먼저 점검하세요.',
  },
  {
    step: 2,
    label: '2 데이터 백업·복원',
    groupId: 'data',
    summaryKo:
      '지금 할 일: 수업 자료를 JSON 파일로 백업하거나 복구 전 확인으로 안전하게 병합하세요.',
  },
  {
    step: 3,
    label: '3 클라우드 동기화(선택)',
    groupId: 'account',
    summaryKo:
      '지금 할 일: 필요할 때만 Google 계정을 연결해 브라우저 내 계정별 작업 공간을 구분하세요.',
  },
];

function groupToTaskStep(groupId: SettingsGroupId): SettingsTaskStep {
  if (groupId === 'install' || groupId === 'voice') return 1;
  if (groupId === 'data') return 2;
  return 3;
}

export interface PilatesSettingsPageProps {
  readonly snapshot?: SettingsPageSnapshotInput | unknown;
  readonly port?: Partial<SettingsPageActionPort>;
  readonly initialActiveGroup?: SettingsGroupId;
  readonly preferReducedMotion?: boolean;
  readonly sessionKey?: string;
  readonly className?: string;
}

export function PilatesSettingsPage({
  snapshot,
  port,
  initialActiveGroup = 'account',
  preferReducedMotion: preferReducedMotionProp,
  sessionKey,
  className = '',
}: PilatesSettingsPageProps) {
  const instanceId = useId();
  const initialPersisted = useMemo(
    () => readPersistedSlice(snapshot, preferReducedMotionProp, sessionKey),
    [snapshot, preferReducedMotionProp, sessionKey],
  );

  const voiceBaselineKey = useMemo(
    () => safeBaselineKey(safeReadProp(snapshot, 'voice')),
    [snapshot],
  );
  const motionBaselineKey = useMemo(
    () =>
      safeBaselineKey({
        prop: preferReducedMotionProp ?? null,
        snap: safeReadProp(snapshot, 'preferReducedMotion') ?? null,
      }),
    [snapshot, preferReducedMotionProp],
  );
  const installBaselineKey = useMemo(
    () => safeBaselineKey(safeReadProp(snapshot, 'install')),
    [snapshot],
  );
  const dataBaselineKey = useMemo(() => {
    const rawData = safeReadProp(snapshot, 'data');
    return safeBaselineKey({
      equip: safeReadProp(rawData, 'ownedEquipmentIds') ?? null,
      props: safeReadProp(rawData, 'ownedPropIds') ?? null,
    });
  }, [snapshot]);

  const [activeGroup, setActiveGroup] = useState<SettingsGroupId>(
    () => initialPersisted?.activeGroup ?? initialActiveGroup,
  );
  const [taskStep, setTaskStep] = useState<SettingsTaskStep>(() =>
    groupToTaskStep(initialPersisted?.activeGroup ?? initialActiveGroup),
  );
  const [overrideState, setOverrideState] = useState<{
    voiceKey: string;
    motionKey: string;
    installKey: string;
    dataKey: string;
    voice: CandidateVoiceOverride;
    reducedMotion?: boolean;
    install: CandidateInstallOverride;
    equip: Record<string, boolean>;
    props: Record<string, boolean>;
    feedback: string;
  }>(() => ({
    voiceKey: voiceBaselineKey,
    motionKey: motionBaselineKey,
    installKey: installBaselineKey,
    dataKey: dataBaselineKey,
    voice: initialPersisted?.voice ?? {},
    reducedMotion: initialPersisted?.reducedMotion,
    install: initialPersisted?.install ?? {},
    equip: initialPersisted?.equip ?? {},
    props: initialPersisted?.props ?? {},
    feedback: initialPersisted?.feedback ?? '',
  }));
  const [mediaReducedMotion, setMediaReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const navRefs = useRef<Record<SettingsGroupId, HTMLButtonElement | null>>({
    account: null,
    voice: null,
    install: null,
    data: null,
  });
  const stepChipRefs = useRef<Record<SettingsTaskStep, HTMLButtonElement | null>>({
    1: null,
    2: null,
    3: null,
  });
  const sectionRefs = useRef<Record<SettingsGroupId, HTMLElement | null>>({
    account: null,
    voice: null,
    install: null,
    data: null,
  });

  const activeOverrides = useMemo(() => {
    const persisted = readPersistedSlice(snapshot, preferReducedMotionProp, sessionKey);
    return {
      voiceKey: voiceBaselineKey,
      motionKey: motionBaselineKey,
      installKey: installBaselineKey,
      dataKey: dataBaselineKey,
      voice:
        overrideState.voiceKey === voiceBaselineKey
          ? overrideState.voice
          : (persisted?.voice ?? {}),
      reducedMotion:
        overrideState.motionKey === motionBaselineKey
          ? overrideState.reducedMotion
          : persisted?.reducedMotion,
      install:
        overrideState.installKey === installBaselineKey
          ? overrideState.install
          : (persisted?.install ?? {}),
      equip:
        overrideState.dataKey === dataBaselineKey
          ? overrideState.equip
          : (persisted?.equip ?? {}),
      props:
        overrideState.dataKey === dataBaselineKey
          ? overrideState.props
          : (persisted?.props ?? {}),
      feedback:
        overrideState.dataKey === dataBaselineKey
          ? overrideState.feedback
          : (persisted?.feedback ?? ''),
    };
  }, [
    overrideState,
    voiceBaselineKey,
    motionBaselineKey,
    installBaselineKey,
    dataBaselineKey,
    snapshot,
    preferReducedMotionProp,
    sessionKey,
  ]);

  const commitOverrides = (
    updater: (prev: typeof activeOverrides) => typeof activeOverrides,
    nextActiveGroup: SettingsGroupId = activeGroup,
  ) => {
    setOverrideState((prev) => {
      const normalizedPrev = {
        voiceKey: voiceBaselineKey,
        motionKey: motionBaselineKey,
        installKey: installBaselineKey,
        dataKey: dataBaselineKey,
        voice: prev.voiceKey === voiceBaselineKey ? prev.voice : activeOverrides.voice,
        reducedMotion:
          prev.motionKey === motionBaselineKey
            ? prev.reducedMotion
            : activeOverrides.reducedMotion,
        install:
          prev.installKey === installBaselineKey ? prev.install : activeOverrides.install,
        equip: prev.dataKey === dataBaselineKey ? prev.equip : activeOverrides.equip,
        props: prev.dataKey === dataBaselineKey ? prev.props : activeOverrides.props,
        feedback:
          prev.dataKey === dataBaselineKey ? prev.feedback : activeOverrides.feedback,
      };
      const next = updater(normalizedPrev);
      writePersistedSlice(snapshot, preferReducedMotionProp, sessionKey, {
        activeGroup: nextActiveGroup,
        voice: next.voice,
        reducedMotion: next.reducedMotion,
        install: next.install,
        equip: next.equip,
        props: next.props,
        feedback: next.feedback,
      });
      return next;
    });
  };

  const setLocalVoiceOverrides = (
    updater: (prev: CandidateVoiceOverride) => CandidateVoiceOverride,
  ) => {
    commitOverrides((prev) => ({ ...prev, voice: updater(prev.voice) }));
  };

  const setLocalInstallOverrides = (
    updater: (prev: CandidateInstallOverride) => CandidateInstallOverride,
  ) => {
    commitOverrides((prev) => ({ ...prev, install: updater(prev.install) }));
  };

  const setLocalReducedMotionOverride = (nextReducedMotion: boolean) => {
    commitOverrides((prev) => ({ ...prev, reducedMotion: nextReducedMotion }));
  };

  const setLocalEquipOverrides = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => {
    commitOverrides((prev) => ({ ...prev, equip: updater(prev.equip) }));
  };

  const setLocalPropOverrides = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => {
    commitOverrides((prev) => ({ ...prev, props: updater(prev.props) }));
  };

  const setLocalActionFeedback = (feedback: string) => {
    commitOverrides((prev) => ({ ...prev, feedback }));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setMediaReducedMotion(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  const baseModel = useMemo(() => resolveSettingsPageViewModel(snapshot), [snapshot]);

  const effectiveReducedMotion = useMemo<boolean>(() => {
    if (typeof activeOverrides.reducedMotion === 'boolean') {
      return activeOverrides.reducedMotion;
    }
    const rawSnapMotion = safeReadProp(snapshot, 'preferReducedMotion');
    if (typeof preferReducedMotionProp === 'boolean') {
      return preferReducedMotionProp || rawSnapMotion === true || mediaReducedMotion;
    }
    if (typeof rawSnapMotion === 'boolean') {
      return rawSnapMotion || mediaReducedMotion;
    }
    return baseModel.preferReducedMotion || mediaReducedMotion;
  }, [
    activeOverrides.reducedMotion,
    preferReducedMotionProp,
    snapshot,
    baseModel.preferReducedMotion,
    mediaReducedMotion,
  ]);

  const effectiveSnapshot = useMemo<SettingsPageSnapshotInput>(() => {
    const localVoiceOverrides = activeOverrides.voice;
    const localEquipOverrides = activeOverrides.equip;
    const localPropOverrides = activeOverrides.props;
    const localActionFeedback = activeOverrides.feedback;
    const mergedPrefs = {
      movement: localVoiceOverrides.preferences?.movement ?? baseModel.voice.preferences.movement,
      breath: localVoiceOverrides.preferences?.breath ?? baseModel.voice.preferences.breath,
      time: localVoiceOverrides.preferences?.time ?? baseModel.voice.preferences.time,
    };
    const nextEquip = baseModel.data.equipmentOptions
      .filter((item) => localEquipOverrides[item.id] ?? item.selected)
      .map((item) => item.id);
    const nextProps = baseModel.data.propOptions
      .filter((item) => localPropOverrides[item.id] ?? item.selected)
      .map((item) => item.id);

    const rawAccount = safeReadProp(snapshot, 'account') as
      | SettingsPageSnapshotInput['account']
      | undefined;
    const rawVoice = safeReadProp(snapshot, 'voice');
    const rawInstall = safeReadProp(snapshot, 'install') as
      | SettingsPageSnapshotInput['install']
      | undefined;
    const rawData = safeReadProp(snapshot, 'data');

    return {
      account: rawAccount ?? undefined,
      voice: {
        ...(typeof rawVoice === 'object' && rawVoice !== null
          ? (rawVoice as SettingsPageSnapshotInput['voice'])
          : {}),
        capabilityStatus: baseModel.voice.capabilityStatus,
        voiceName: baseModel.voice.voiceName,
        voiceLang: baseModel.voice.voiceLang,
        localService: baseModel.voice.localService,
        enabled: localVoiceOverrides.enabled ?? baseModel.voice.enabled,
        speed: localVoiceOverrides.speed ?? baseModel.voice.speed,
        preferences: mergedPrefs,
        error: baseModel.voice.errorMessageKo ?? '',
        ...(localVoiceOverrides.sampleNotice
          ? { statusAnnouncementKo: localVoiceOverrides.sampleNotice }
          : {}),
      },
      install: rawInstall ?? undefined,
      data: {
        ...(typeof rawData === 'object' && rawData !== null
          ? (rawData as SettingsPageSnapshotInput['data'])
          : {}),
        savedSequenceCount: baseModel.data.savedSequenceCount,
        exerciseCount: baseModel.data.exerciseCount,
        historyLogCount: baseModel.data.historyLogCount,
        ownedEquipmentIds: nextEquip,
        ownedPropIds: nextProps,
        persistenceError: baseModel.data.persistenceErrorKo,
        backupMessage: localActionFeedback || (baseModel.data.backupMessageKo ?? ''),
        recoveryStage: baseModel.data.recoveryStage,
        recoveryPreview: baseModel.data.recoveryPreview,
        rollbackPoint: baseModel.data.rollbackPoint,
      },
      preferReducedMotion: effectiveReducedMotion,
    };
  }, [snapshot, baseModel, activeOverrides, effectiveReducedMotion]);

  const model = useMemo(
    () => resolveSettingsPageViewModel(effectiveSnapshot),
    [effectiveSnapshot],
  );

  const reducedMotion = effectiveReducedMotion;

  const updateActiveGroup = (nextGroup: SettingsGroupId) => {
    setActiveGroup(nextGroup);
    setTaskStep(groupToTaskStep(nextGroup));
    commitOverrides((prev) => prev, nextGroup);
  };

  const scrollAndFocusSection = (groupId: SettingsGroupId, focusHeading = false) => {
    const target = sectionRefs.current[groupId];
    if (target && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      } catch {
        // Ignore in JSDOM environments
      }
    }
    if (focusHeading && target) {
      const heading = target.querySelector<HTMLElement>('h3');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }
        heading.focus({ preventScroll: true });
      }
    }
  };

  const handleGroupJump = (groupId: SettingsGroupId) => {
    updateActiveGroup(groupId);
    scrollAndFocusSection(groupId, false);
  };

  const navigateTaskStep = (nextStep: SettingsTaskStep, moveFocusToHeading = true) => {
    const stepConfig = TASK_STEP_ITEMS.find((item) => item.step === nextStep) ?? TASK_STEP_ITEMS[0];
    setTaskStep(nextStep);
    setActiveGroup(stepConfig.groupId);
    commitOverrides((prev) => prev, stepConfig.groupId);
    scrollAndFocusSection(stepConfig.groupId, moveFocusToHeading);
  };

  const handleTaskStepKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TASK_STEP_ITEMS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TASK_STEP_ITEMS.length) % TASK_STEP_ITEMS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TASK_STEP_ITEMS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const targetItem = TASK_STEP_ITEMS[nextIndex];
    navigateTaskStep(targetItem.step, false);
    stepChipRefs.current[targetItem.step]?.focus();
  };

  const handleNavKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const order = SETTINGS_PAGE_SAFETY_CONTRACT.groups;
    let nextIndex: number;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % order.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = order.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextGroup = order[nextIndex];
    updateActiveGroup(nextGroup);
    navRefs.current[nextGroup]?.focus();
  };

  const combinedInstallStatusAnnouncement = useMemo(() => {
    const parts: string[] = [];
    if (activeOverrides.install.requestFeedback) {
      parts.push(activeOverrides.install.requestFeedback);
    }
    if (model.install.liveStatusAnnouncementKo) {
      parts.push(model.install.liveStatusAnnouncementKo);
    }
    return parts.length > 0 ? parts.join(' ') : null;
  }, [activeOverrides.install.requestFeedback, model.install.liveStatusAnnouncementKo]);

  const hasInstallPort = typeof port?.onRequestPwaInstall === 'function';
  const manualGuideOpen =
    activeOverrides.install.manualGuideOpen ??
    (model.install.manualGuideOpenByDefault || (!hasInstallPort && !model.install.installed));
  const offlineNotesOpen =
    activeOverrides.install.offlineNotesOpen ?? model.install.offlineStatus !== 'ready';

  const activeTaskStepItem =
    TASK_STEP_ITEMS.find((item) => item.step === taskStep) ?? TASK_STEP_ITEMS[0];

  return (
    <div
      className={['pf-settings-page', className].filter(Boolean).join(' ')}
      data-testid="pilates-settings-page"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-destructive-delete="disabled"
      data-auth-security-mutation="disabled"
    >
      <header className="pf-settings-page__header">
        <span className="pf-settings-page__eyebrow">PILATES STUDIO SETTINGS</span>
        <h2 className="pf-settings-page__title" id={`${instanceId}-title`}>
          나의 스튜디오 설정
        </h2>
        <p className="pf-settings-page__subtitle">
          계정 · 한국어 음성 · 앱 설치 · 데이터 관리를 4개 짧은 그룹에서 확인하세요. 인증·보안
          설정을 임의로 바꾸거나 수업 데이터를 삭제하는 위험 동작은 제공하지 않습니다.
        </p>

        <nav
          className="pf-step-guide-bar pf-settings-task-steps"
          aria-label="설정 작업 단계 선택"
          data-testid="settings-task-step-guide"
        >
          <ol className="pf-step-guide-list">
            {TASK_STEP_ITEMS.map((item, idx) => (
              <li key={item.step}>
                <button
                  ref={(el) => {
                    stepChipRefs.current[item.step] = el;
                  }}
                  type="button"
                  data-testid={`settings-task-step-${item.step}`}
                  aria-current={taskStep === item.step ? 'step' : undefined}
                  className={`pf-step-guide-chip ${taskStep === item.step ? 'is-active' : ''}`}
                  onClick={() => navigateTaskStep(item.step, true)}
                  onKeyDown={(event) => handleTaskStepKeyDown(event, idx)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
          <div className="pf-step-guide-subrow">
            <span
              className="pf-step-guide-focus"
              role="status"
              aria-live="polite"
              data-testid="settings-task-step-summary"
            >
              {activeTaskStepItem.summaryKo}
            </span>
            <div className="pf-step-guide-nav">
              <button
                type="button"
                className="pf-step-nav-btn"
                disabled={taskStep === 1}
                onClick={() => navigateTaskStep(taskStep === 3 ? 2 : 1, true)}
              >
                이전 단계
              </button>
              <button
                type="button"
                className="pf-step-nav-btn"
                disabled={taskStep === 3}
                onClick={() => navigateTaskStep(taskStep === 1 ? 2 : 3, true)}
              >
                다음 단계
              </button>
            </div>
          </div>
        </nav>

        <div
          className="pf-settings-page__nav"
          role="toolbar"
          aria-label="설정 그룹 바로가기"
          data-testid="settings-group-nav"
        >
          {model.groups.map((group, idx) => (
            <button
              key={group.id}
              ref={(el) => {
                navRefs.current[group.id] = el;
              }}
              type="button"
              className="pf-settings-page__nav-chip"
              data-testid={`settings-nav-chip-${group.id}`}
              aria-pressed={activeGroup === group.id}
              onClick={() => handleGroupJump(group.id)}
              onKeyDown={(event) => handleNavKeyDown(event, idx)}
            >
              <span>
                {group.order}. {group.titleKo}
              </span>
            </button>
          ))}
        </div>
      </header>

      <PilatesSettingsGroupSections
        instanceId={instanceId}
        activeGroup={activeGroup}
        model={model}
        port={port}
        reducedMotion={reducedMotion}
        mediaReducedMotion={mediaReducedMotion}
        manualGuideOpen={manualGuideOpen}
        offlineNotesOpen={offlineNotesOpen}
        combinedInstallStatusAnnouncement={combinedInstallStatusAnnouncement}
        registerSectionRef={(groupId, el) => {
          sectionRefs.current[groupId] = el;
          const heading = el?.querySelector('h3');
          if (heading && !heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
          }
        }}
        setLocalVoiceOverrides={setLocalVoiceOverrides}
        setLocalInstallOverrides={setLocalInstallOverrides}
        setLocalReducedMotionOverride={setLocalReducedMotionOverride}
        setLocalEquipOverrides={setLocalEquipOverrides}
        setLocalPropOverrides={setLocalPropOverrides}
        setLocalActionFeedback={setLocalActionFeedback}
      />
    </div>
  );
}

export function PilatesSettingsFixtureHarness() {
  const [presetId, setPresetId] = useState<SettingsFixturePresetId>('default-local-studio');
  const [renderTwo, setRenderTwo] = useState(false);
  const recorder = useMemo(() => createMockSettingsActionRecorder(), []);
  const preset = useMemo(() => getSettingsFixturePreset(presetId), [presetId]);
  const snapshotClone = useMemo(() => cloneSettingsSnapshotInput(preset.snapshot), [preset]);

  return (
    <main className="pf-settings-fixture-harness" data-testid="settings-fixture-harness">
      <div
        className="pf-settings-fixture-toolbar"
        role="region"
        aria-label="합성 시나리오 전환 도구"
      >
        {SETTINGS_PAGE_FIXTURE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pf-settings-page__btn"
            data-testid={`fixture-preset-btn-${item.id}`}
            aria-pressed={presetId === item.id}
            onClick={() => {
              recorder.clear();
              setPresetId(item.id);
            }}
          >
            {item.labelKo}
          </button>
        ))}
        <button
          type="button"
          className="pf-settings-page__btn"
          aria-pressed={renderTwo}
          onClick={() => setRenderTwo((prev) => !prev)}
        >
          이중 인스턴스 전환
        </button>
      </div>
      <PilatesSettingsPage snapshot={snapshotClone} port={recorder.port} />
      {renderTwo && (
        <div style={{ marginTop: 20 }} data-testid="second-settings-instance">
          <PilatesSettingsPage snapshot={snapshotClone} port={recorder.port} />
        </div>
      )}
    </main>
  );
}
