import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  SETTINGS_PAGE_FIXTURE_PRESETS,
  cloneSettingsSnapshotInput,
  getSettingsFixturePreset,
} from './settingsPageFixtures';
import {
  createMockSettingsActionRecorder,
  resolveSettingsPageViewModel,
} from './settingsPageModel';
import {
  SETTINGS_PAGE_SAFETY_CONTRACT,
  type SettingsFixturePresetId,
  type SettingsGroupId,
  type SettingsPageActionPort,
  type SettingsPageSnapshotInput,
  type SettingsVoicePreferenceKey,
  type SettingsVoiceSpeed,
} from './types';
import './pilatesSettingsPage.css';

export interface PilatesSettingsPageProps {
  readonly snapshot?: SettingsPageSnapshotInput | unknown;
  readonly port?: Partial<SettingsPageActionPort>;
  readonly initialActiveGroup?: SettingsGroupId;
  readonly preferReducedMotion?: boolean;
  readonly className?: string;
}

const SPEED_OPTIONS: readonly { value: SettingsVoiceSpeed; labelKo: string }[] = [
  { value: 0.85, labelKo: '0.85x 천천히' },
  { value: 1, labelKo: '1.0x 기본' },
  { value: 1.15, labelKo: '1.15x 조금 빠르게' },
];

const VOICE_PREF_ITEMS: readonly { key: SettingsVoicePreferenceKey; labelKo: string }[] = [
  { key: 'movement', labelKo: '동작·단계 이름 안내' },
  { key: 'breath', labelKo: '검토한 호흡 메모 안내' },
  { key: 'time', labelKo: '남은 시간·10초 전 알림' },
];

export function PilatesSettingsPage({
  snapshot,
  port,
  initialActiveGroup = 'account',
  preferReducedMotion: preferReducedMotionProp,
  className = '',
}: PilatesSettingsPageProps) {
  const instanceId = useId();
  const [activeGroup, setActiveGroup] = useState<SettingsGroupId>(initialActiveGroup);
  const [overrideState, setOverrideState] = useState<{
    snapshotRef: unknown;
    voice: {
      enabled?: boolean;
      speed?: SettingsVoiceSpeed;
      preferences?: Partial<Record<SettingsVoicePreferenceKey, boolean>>;
      sampleNotice?: string;
    };
    equip: Record<string, boolean>;
    props: Record<string, boolean>;
    feedback: string;
  }>({
    snapshotRef: snapshot,
    voice: {},
    equip: {},
    props: {},
    feedback: '',
  });
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
  const sectionRefs = useRef<Record<SettingsGroupId, HTMLElement | null>>({
    account: null,
    voice: null,
    install: null,
    data: null,
  });

  const activeOverrides = useMemo(
    () =>
      overrideState.snapshotRef === snapshot
        ? overrideState
        : { snapshotRef: snapshot, voice: {}, equip: {}, props: {}, feedback: '' },
    [overrideState, snapshot],
  );

  const setLocalVoiceOverrides = (
    updater: (prev: typeof activeOverrides.voice) => typeof activeOverrides.voice,
  ) => {
    setOverrideState((prev) => {
      const base =
        prev.snapshotRef === snapshot
          ? prev
          : { snapshotRef: snapshot, voice: {}, equip: {}, props: {}, feedback: '' };
      return { ...base, voice: updater(base.voice) };
    });
  };

  const setLocalEquipOverrides = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => {
    setOverrideState((prev) => {
      const base =
        prev.snapshotRef === snapshot
          ? prev
          : { snapshotRef: snapshot, voice: {}, equip: {}, props: {}, feedback: '' };
      return { ...base, equip: updater(base.equip) };
    });
  };

  const setLocalPropOverrides = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => {
    setOverrideState((prev) => {
      const base =
        prev.snapshotRef === snapshot
          ? prev
          : { snapshotRef: snapshot, voice: {}, equip: {}, props: {}, feedback: '' };
      return { ...base, props: updater(base.props) };
    });
  };

  const setLocalActionFeedback = (feedback: string) => {
    setOverrideState((prev) => {
      const base =
        prev.snapshotRef === snapshot
          ? prev
          : { snapshotRef: snapshot, voice: {}, equip: {}, props: {}, feedback: '' };
      return { ...base, feedback };
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setMediaReducedMotion(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  const baseModel = useMemo(() => resolveSettingsPageViewModel(snapshot), [snapshot]);

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

    const rawRecord =
      typeof snapshot === 'object' && snapshot !== null
        ? (snapshot as Record<string, unknown>)
        : {};

    return {
      account: (rawRecord.account as SettingsPageSnapshotInput['account']) ?? undefined,
      voice: {
        ...((rawRecord.voice as SettingsPageSnapshotInput['voice']) ?? {}),
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
      install: (rawRecord.install as SettingsPageSnapshotInput['install']) ?? undefined,
      data: {
        ...((rawRecord.data as SettingsPageSnapshotInput['data']) ?? {}),
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
      preferReducedMotion:
        preferReducedMotionProp ?? (baseModel.preferReducedMotion || mediaReducedMotion),
    };
  }, [
    snapshot,
    baseModel,
    activeOverrides,
    preferReducedMotionProp,
    mediaReducedMotion,
  ]);

  const model = useMemo(
    () => resolveSettingsPageViewModel(effectiveSnapshot),
    [effectiveSnapshot],
  );

  const reducedMotion = Boolean(
    preferReducedMotionProp ?? (model.preferReducedMotion || mediaReducedMotion),
  );

  const handleGroupJump = (groupId: SettingsGroupId) => {
    setActiveGroup(groupId);
    const target = sectionRefs.current[groupId];
    if (target && !reducedMotion && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      } catch {
        // Ignore in JSDOM environments
      }
    }
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
    setActiveGroup(nextGroup);
    navRefs.current[nextGroup]?.focus();
  };

  const getGroupSummary = (id: SettingsGroupId) =>
    model.groups.find((item) => item.id === id) ?? model.groups[0];

  const accountSummary = getGroupSummary('account');
  const voiceSummary = getGroupSummary('voice');
  const installSummary = getGroupSummary('install');
  const dataSummary = getGroupSummary('data');

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

      <div className="pf-settings-page__groups">
        <section
          ref={(el) => {
            sectionRefs.current.account = el;
          }}
          id={`${instanceId}-group-account`}
          className={`pf-settings-group ${activeGroup === 'account' ? 'pf-settings-group--active' : ''}`}
          aria-labelledby={`${instanceId}-heading-account`}
          aria-busy={model.account.busy}
          data-testid="settings-group-account"
        >
          <div className="pf-settings-group__top">
            <span className="pf-settings-page__eyebrow">{accountSummary.eyebrow}</span>
            <div className="pf-settings-group__heading-row">
              <h3 id={`${instanceId}-heading-account`} className="pf-settings-group__title">
                1. {accountSummary.titleKo}
              </h3>
              <span
                className="pf-settings-group__badge"
                data-testid="settings-current-value-account"
              >
                현재값: {accountSummary.currentValueBadgeKo}
              </span>
            </div>
            <p className="pf-settings-group__desc" data-testid="settings-description-account">
              {accountSummary.shortDescriptionKo}
            </p>
          </div>

          <dl className="pf-settings-kv-list">
            <div className="pf-settings-kv-item">
              <dt>로그인 상태</dt>
              <dd>{model.account.currentStatusLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>자료 보관 범위</dt>
              <dd>{model.account.storageBoundaryLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>인증·보안 보호</dt>
              <dd data-testid="settings-account-security-readonly-badge">
                {model.account.securityPolicyLabelKo}
              </dd>
            </div>
            {model.account.user?.email && (
              <div className="pf-settings-kv-item">
                <dt>연결된 이메일</dt>
                <dd>{model.account.user.email}</dd>
              </div>
            )}
          </dl>

          {model.account.errorMessageKo && (
            <p role="alert" className="pf-settings-alert" data-testid="settings-account-error">
              {model.account.errorMessageKo}
            </p>
          )}

          {(model.account.noticeKo ||
            model.account.phase === 'checking' ||
            model.account.operation === 'signing-in') && (
            <p role="status" className="pf-settings-status" data-testid="settings-account-status">
              {model.account.phase === 'checking'
                ? '저장된 로그인 상태를 확인하고 있어요…'
                : model.account.operation === 'signing-in'
                  ? '열린 Google 창에서 로그인을 완료하거나 창을 닫아 취소할 수 있습니다.'
                  : model.account.noticeKo}
            </p>
          )}

          <div className="pf-settings-actions">
            {model.account.phase === 'signed-out' && (
              <button
                type="button"
                className="pf-settings-page__btn pf-settings-page__btn--primary"
                data-testid="settings-account-signin-btn"
                disabled={model.account.busy}
                onClick={() => port?.onRequestGoogleSignIn?.()}
              >
                {model.account.operation === 'signing-in'
                  ? 'Google 로그인 진행 중…'
                  : 'Google로 계속하기'}
              </button>
            )}

            {model.account.phase === 'signed-in' && (
              <>
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-account-switch-btn"
                  disabled={model.account.busy}
                  onClick={() => port?.onRequestAccountSwitch?.()}
                >
                  다른 Google 계정으로 전환
                </button>
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-account-signout-btn"
                  disabled={model.account.busy}
                  onClick={() => port?.onRequestSignOut?.()}
                >
                  {model.account.operation === 'signing-out' ? '로그아웃 중…' : '로그아웃'}
                </button>
              </>
            )}

            {model.account.phase === 'unavailable' &&
              (model.account.unsupportedHost ? (
                <p
                  className="pf-settings-guard-box"
                  data-testid="settings-account-operating-origin-note"
                >
                  운영 도메인({model.account.operatingOrigin})에서만 Google 로그인을 지원합니다. 현재
                  기기의 로컬 수업 자료는 그대로 유지됩니다.
                </p>
              ) : (
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-account-recheck-btn"
                  onClick={() => port?.onRequestAuthRecheck?.()}
                >
                  계정 연결 다시 확인
                </button>
              ))}
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.voice = el;
          }}
          id={`${instanceId}-group-voice`}
          className={`pf-settings-group ${activeGroup === 'voice' ? 'pf-settings-group--active' : ''}`}
          aria-labelledby={`${instanceId}-heading-voice`}
          data-testid="settings-group-voice"
        >
          <div className="pf-settings-group__top">
            <span className="pf-settings-page__eyebrow">{voiceSummary.eyebrow}</span>
            <div className="pf-settings-group__heading-row">
              <h3 id={`${instanceId}-heading-voice`} className="pf-settings-group__title">
                2. {voiceSummary.titleKo}
              </h3>
              <span
                className="pf-settings-group__badge"
                data-testid="settings-current-value-voice"
              >
                현재값: {voiceSummary.currentValueBadgeKo}
              </span>
            </div>
            <p className="pf-settings-group__desc" data-testid="settings-description-voice">
              {voiceSummary.shortDescriptionKo}
            </p>
          </div>

          <dl className="pf-settings-kv-list">
            <div className="pf-settings-kv-item">
              <dt>기기 한국어 음성</dt>
              <dd>{model.voice.currentCapabilityLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>재생 속도 현재값</dt>
              <dd>{model.voice.currentSpeedLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>안내 항목 현재값</dt>
              <dd>{model.voice.currentPreferencesLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>음성 개인정보 보호</dt>
              <dd>{model.voice.privacyBoundaryLabelKo}</dd>
            </div>
          </dl>

          {model.voice.errorMessageKo && (
            <p role="alert" className="pf-settings-alert" data-testid="settings-voice-error">
              {model.voice.errorMessageKo}
            </p>
          )}

          <div className="pf-settings-actions">
            <button
              type="button"
              className={`pf-settings-page__btn ${model.voice.enabled ? 'pf-settings-page__btn--primary' : ''}`}
              data-testid="settings-voice-enable-toggle"
              aria-pressed={model.voice.enabled}
              disabled={!model.voice.canToggleEnabled}
              onClick={() => {
                const next = !model.voice.enabled;
                setLocalVoiceOverrides((prev) => ({
                  ...prev,
                  enabled: next,
                  sampleNotice: next
                    ? '한국어 음성 안내를 켰습니다. 수업 진행 중 기기 음성으로 안내합니다.'
                    : '한국어 음성 안내를 껐습니다. 화면 대본은 계속 표시됩니다.',
                }));
                port?.onToggleVoiceEnabled?.(next);
              }}
            >
              {model.voice.enabled
                ? '수업 한국어 음성 안내 켜짐 (누르면 끔)'
                : '수업 한국어 음성 안내 켜기'}
            </button>

            <button
              type="button"
              className="pf-settings-page__btn"
              data-testid="settings-voice-sample-btn"
              disabled={!model.voice.canToggleEnabled}
              onClick={() => {
                setLocalVoiceOverrides((prev) => ({
                  ...prev,
                  sampleNotice: `샘플 안내 확인 (${model.voice.currentSpeedLabelKo}): "호흡을 내쉬며 골반을 천천히 말아 올립니다."`,
                }));
                port?.onPreviewVoiceSample?.();
              }}
            >
              샘플 문구 확인
            </button>

            <button
              type="button"
              className="pf-settings-page__btn"
              data-testid="settings-voice-recheck-btn"
              onClick={() => {
                setLocalVoiceOverrides((prev) => ({
                  ...prev,
                  sampleNotice: '기기 내장 한국어 음성 목록을 다시 확인했습니다.',
                }));
                port?.onRecheckVoiceCapability?.();
              }}
            >
              음성 상태 다시 확인
            </button>
          </div>

          <fieldset className="pf-settings-fieldset">
            <legend>한국어 음성 재생 속도</legend>
            <div className="pf-settings-actions">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="pf-settings-page__speed-btn"
                  data-testid={`settings-voice-speed-${option.value}`}
                  aria-pressed={model.voice.speed === option.value}
                  onClick={() => {
                    setLocalVoiceOverrides((prev) => ({
                      ...prev,
                      speed: option.value,
                      sampleNotice: `한국어 음성 재생 속도가 ${option.value}배속으로 설정되었습니다.`,
                    }));
                    port?.onChangeVoiceSpeed?.(option.value);
                  }}
                >
                  {option.labelKo}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="pf-settings-fieldset">
            <legend>수업 중 읽어 줄 음성 안내 항목</legend>
            <div className="pf-settings-check-grid">
              {VOICE_PREF_ITEMS.map(({ key, labelKo }) => {
                const checked = model.voice.preferences[key];
                return (
                  <label
                    key={key}
                    className="pf-settings-check-label"
                    data-testid={`settings-voice-pref-label-${key}`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`settings-voice-pref-${key}`}
                      checked={checked}
                      onChange={() => {
                        const nextChecked = !checked;
                        setLocalVoiceOverrides((prev) => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            [key]: nextChecked,
                          },
                        }));
                        port?.onToggleVoicePreference?.(key, nextChecked);
                      }}
                    />
                    <span>{labelKo}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="pf-settings-status" data-testid="settings-voice-announcement">
            {model.voice.statusAnnouncementKo}
          </p>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.install = el;
          }}
          id={`${instanceId}-group-install`}
          className={`pf-settings-group ${activeGroup === 'install' ? 'pf-settings-group--active' : ''}`}
          aria-labelledby={`${instanceId}-heading-install`}
          data-testid="settings-group-install"
        >
          <div className="pf-settings-group__top">
            <span className="pf-settings-page__eyebrow">{installSummary.eyebrow}</span>
            <div className="pf-settings-group__heading-row">
              <h3 id={`${instanceId}-heading-install`} className="pf-settings-group__title">
                3. {installSummary.titleKo}
              </h3>
              <span
                className="pf-settings-group__badge"
                data-testid="settings-current-value-install"
              >
                현재값: {installSummary.currentValueBadgeKo}
              </span>
            </div>
            <p className="pf-settings-group__desc" data-testid="settings-description-install">
              {installSummary.shortDescriptionKo}
            </p>
          </div>

          <dl className="pf-settings-kv-list">
            <div className="pf-settings-kv-item">
              <dt>실행 형태 현재값</dt>
              <dd>{model.install.currentRunModeLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>오프라인 기본 화면</dt>
              <dd>{model.install.currentOfflineLabelKo}</dd>
            </div>
          </dl>

          {model.install.showInstallButton && (
            <div className="pf-settings-actions">
              <button
                type="button"
                className="pf-settings-page__btn pf-settings-page__btn--primary"
                data-testid="settings-install-action-btn"
                onClick={() => port?.onRequestPwaInstall?.()}
              >
                이 기기에 설치
              </button>
            </div>
          )}

          {model.install.liveStatusAnnouncementKo && (
            <p
              role="status"
              className="pf-settings-status"
              data-testid="settings-install-status"
            >
              {model.install.liveStatusAnnouncementKo}
            </p>
          )}

          {!model.install.installed &&
            (model.install.platform === 'ios-safari' ? (
              <div className="pf-settings-guard-box" data-testid="settings-install-ios-safari">
                <strong>iPhone·iPad Safari 설치 3단계:</strong> 1) 공유 버튼 선택 → 2) 홈 화면에
                추가 선택 → 3) 웹 앱으로 열기 확인 후 추가.
              </div>
            ) : model.install.platform === 'ios-other' ? (
              <p className="pf-settings-guard-box" data-testid="settings-install-ios-other">
                이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.
              </p>
            ) : (
              <details
                className="pf-settings-details"
                open={model.install.manualGuideOpenByDefault}
                data-testid="settings-install-manual-guide"
              >
                <summary>설치 버튼이 보이지 않을 때 수동 설치 방법</summary>
                <div className="pf-settings-details__body">
                  <p>
                    Android Chrome: 브라우저 ⋮ 메뉴 → 홈 화면에 추가 → 설치를 선택하세요. PC에서는
                    주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치를 확인하세요.
                  </p>
                  <p>
                    Mac Safari: 파일 → Dock에 추가를 선택하세요. 브라우저나 기기 정책에 따라 설치를
                    지원하지 않을 수 있습니다.
                  </p>
                </div>
              </details>
            ))}

          <details
            className="pf-settings-details"
            data-testid="settings-install-offline-notes"
          >
            <summary>오프라인·자료 분리 보관 안내</summary>
            <div className="pf-settings-details__body">
              <p>{model.install.offlineDetailSummaryKo}</p>
              <p>
                특히 iPhone·iPad는 Safari와 홈 화면 앱의 저장 공간이 분리될 수 있으니, 앱으로 옮기기
                전 아래 데이터 관리에서 전체 JSON 백업을 먼저 보관해 주세요.
              </p>
            </div>
          </details>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.data = el;
          }}
          id={`${instanceId}-group-data`}
          className={`pf-settings-group ${activeGroup === 'data' ? 'pf-settings-group--active' : ''}`}
          aria-labelledby={`${instanceId}-heading-data`}
          data-testid="settings-group-data"
        >
          <div className="pf-settings-group__top">
            <span className="pf-settings-page__eyebrow">{dataSummary.eyebrow}</span>
            <div className="pf-settings-group__heading-row">
              <h3 id={`${instanceId}-heading-data`} className="pf-settings-group__title">
                4. {dataSummary.titleKo}
              </h3>
              <span className="pf-settings-group__badge" data-testid="settings-current-value-data">
                현재값: {dataSummary.currentValueBadgeKo}
              </span>
            </div>
            <p className="pf-settings-group__desc" data-testid="settings-description-data">
              {dataSummary.shortDescriptionKo}
            </p>
          </div>

          <dl className="pf-settings-kv-list">
            <div className="pf-settings-kv-item">
              <dt>보관된 수업 자료</dt>
              <dd>{model.data.currentRecordsSummaryKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>내 보유 기구·소도구</dt>
              <dd>{model.data.currentInventorySummaryKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>백업·복구 상태</dt>
              <dd>{model.data.currentRecoveryLabelKo}</dd>
            </div>
            <div className="pf-settings-kv-item">
              <dt>데이터 보호 정책</dt>
              <dd>{model.data.nonDestructivePolicyLabelKo}</dd>
            </div>
          </dl>

          {model.data.persistenceErrorKo && (
            <p role="alert" className="pf-settings-alert" data-testid="settings-data-error">
              {model.data.persistenceErrorKo}
            </p>
          )}

          {model.data.backupMessageKo && (
            <p role="status" className="pf-settings-status" data-testid="settings-data-message">
              {model.data.backupMessageKo}
            </p>
          )}

          <div
            className="pf-settings-guard-box"
            data-testid="settings-data-no-delete-guard"
          >
            <strong>데이터 삭제 동작 금지 보호:</strong> 실수로 수업 시퀀스·커스텀 동작·수업 기록이
            영구 삭제되지 않도록 이 설정 화면에서는 ‘전체 데이터 삭제/초기화’ 기능을 제공하지
            않습니다. 백업 불러오기는 항상 기존 자료와 병합하며 즉시 되돌리기를 지원합니다.
          </div>

          <div className="pf-settings-actions">
            <button
              type="button"
              className="pf-settings-page__btn pf-settings-page__btn--primary"
              data-testid="settings-data-export-btn"
              onClick={() => {
                setLocalActionFeedback(
                  '백업 파일 내보내기를 요청했습니다. 안전한 곳에 JSON 파일을 보관해 주세요.',
                );
                port?.onExportBackupJson?.();
              }}
            >
              전체 JSON 백업 내보내기
            </button>

            <button
              type="button"
              className="pf-settings-page__btn"
              data-testid="settings-data-import-btn"
              onClick={() => {
                setLocalActionFeedback(
                  '백업 JSON 파일을 읽기 전용으로 검사합니다. 적용 전까지 현재 자료는 바뀌지 않습니다.',
                );
                port?.onSelectBackupFile?.('flow-atelier-backup.json', 12288);
              }}
            >
              백업 불러오기 (복구 전 확인)
            </button>
          </div>

          {model.data.recoveryStage === 'preview-ready' && model.data.recoveryPreview && (
            <div
              className="pf-settings-status"
              role="region"
              aria-label="복구 전 확인 요약"
              data-testid="settings-data-recovery-preview"
            >
              <strong>복구 전 확인: {model.data.recoveryPreview.sourceLabel}</strong>
              <p style={{ margin: '6px 0' }}>
                새로 추가 {model.data.recoveryPreview.newItems}개 · 기존 충돌{' '}
                {model.data.recoveryPreview.conflicts}개 · 기본 예시 복원{' '}
                {model.data.recoveryPreview.restoredExamples}개 (기존 수정본 유지)
              </p>
              {model.data.recoveryPreview.stale && (
                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                  검토 후 현재 자료가 달라졌습니다. 다시 검토한 뒤 적용해 주세요.
                </p>
              )}
              {model.data.recoveryPreview.diskBlocked &&
                model.data.recoveryPreview.errorMessage && (
                  <p role="alert" className="pf-settings-alert">
                    {model.data.recoveryPreview.errorMessage}
                  </p>
                )}
              <div className="pf-settings-actions">
                <button
                  type="button"
                  className="pf-settings-page__btn pf-settings-page__btn--primary"
                  data-testid="settings-data-preview-apply-btn"
                  disabled={
                    model.data.recoveryPreview.stale || model.data.recoveryPreview.diskBlocked
                  }
                  onClick={() => port?.onApplyBackupRestore?.()}
                >
                  이 내용으로 복원 적용
                </button>
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-data-preview-cancel-btn"
                  onClick={() => port?.onCancelBackupRestore?.()}
                >
                  복원 취소
                </button>
              </div>
            </div>
          )}

          {model.data.recoveryStage === 'rollback-available' && model.data.rollbackPoint && (
            <div
              className="pf-settings-status"
              data-testid="settings-data-rollback-bar"
            >
              <strong>
                직전 백업 복원 되돌리기 가능 (+{model.data.rollbackPoint.addedCount}개 항목)
              </strong>
              <div className="pf-settings-actions">
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-data-rollback-btn"
                  onClick={() => port?.onRollbackBackupRestore?.()}
                >
                  복원 이전 상태로 되돌리기
                </button>
                <button
                  type="button"
                  className="pf-settings-page__btn"
                  data-testid="settings-data-rollback-dismiss-btn"
                  onClick={() => port?.onDismissRollbackBanner?.()}
                >
                  되돌리기 닫기
                </button>
              </div>
            </div>
          )}

          <details
            className="pf-settings-details"
            open
            data-testid="settings-data-inventory-details"
          >
            <summary>
              내 보유 기구·소도구 선택 ({model.data.currentInventorySummaryKo})
            </summary>
            <div className="pf-settings-details__body">
              <p style={{ marginTop: 0 }}>
                추천 시퀀스는 선택한 기구·소도구 안에서만 구성됩니다. 캐딜락·타워·바렐 종류는 서로
                대체하지 않습니다.
              </p>
              <fieldset className="pf-settings-fieldset">
                <legend>보유 기구 · 여러 개 선택</legend>
                <div className="pf-settings-check-grid">
                  {model.data.equipmentOptions.map((item) => (
                    <label
                      key={item.id}
                      className="pf-settings-check-label"
                      data-testid={`settings-equipment-label-${item.id}`}
                    >
                      <input
                        type="checkbox"
                        data-testid={`settings-equipment-check-${item.id}`}
                        checked={item.selected}
                        onChange={() => {
                          setLocalEquipOverrides((prev) => ({
                            ...prev,
                            [item.id]: !item.selected,
                          }));
                          port?.onToggleOwnedEquipment?.(item.id);
                        }}
                      />
                      <span>{item.labelKo}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="pf-settings-fieldset">
                <legend>보유 소도구 · 여러 개 선택</legend>
                <div className="pf-settings-check-grid">
                  {model.data.propOptions.map((item) => (
                    <label
                      key={item.id}
                      className="pf-settings-check-label"
                      data-testid={`settings-prop-label-${item.id}`}
                    >
                      <input
                        type="checkbox"
                        data-testid={`settings-prop-check-${item.id}`}
                        checked={item.selected}
                        onChange={() => {
                          setLocalPropOverrides((prev) => ({
                            ...prev,
                            [item.id]: !item.selected,
                          }));
                          port?.onToggleOwnedProp?.(item.id);
                        }}
                      />
                      <span>{item.labelKo}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>

          <details
            className="pf-settings-details"
            data-testid="settings-data-safety-notes"
          >
            <summary>추천 기준·골반 메모·운동 전 안전 확인 안내</summary>
            <div className="pf-settings-details__body">
              <p style={{ marginTop: 0 }}>
                추천은 기구·시간·난이도·목표 조건 조합이며 의료·교정 효과를 보증하지 않습니다.
                수업 전 강사가 대상자의 상태와 스프링을 직접 확인해 주세요.
              </p>
              <p style={{ marginBottom: 8 }}>
                새로 생기거나 악화하는 통증·저림·근력 저하가 있으면 전문가에게 평가받으세요.
              </p>
              <a
                className="pf-settings-page__link-btn"
                href="https://www.nhs.uk/conditions/back-pain/"
                target="_blank"
                rel="noreferrer"
                data-testid="settings-nhs-safety-link"
              >
                NHS 허리 통증·응급 증상 안내
              </a>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __pilatesSettingsFixture__?: {
      selectPreset: (presetId: SettingsFixturePresetId) => void;
      showTwo: (two: boolean) => void;
      getRecordedCalls: () => ReturnType<typeof createMockSettingsActionRecorder>['calls'];
    };
  }
}

export function PilatesSettingsFixtureHarness() {
  const [presetId, setPresetId] = useState<SettingsFixturePresetId>('default-local-studio');
  const [renderTwo, setRenderTwo] = useState(false);
  const recorder = useMemo(() => createMockSettingsActionRecorder(), []);
  const preset = useMemo(() => getSettingsFixturePreset(presetId), [presetId]);
  const snapshotClone = useMemo(() => cloneSettingsSnapshotInput(preset.snapshot), [preset]);

  useEffect(() => {
    window.__pilatesSettingsFixture__ = {
      selectPreset: (nextId: SettingsFixturePresetId) => {
        recorder.clear();
        setPresetId(nextId);
      },
      showTwo: (two: boolean) => {
        setRenderTwo(Boolean(two));
      },
      getRecordedCalls: () => recorder.calls,
    };
    return () => {
      delete window.__pilatesSettingsFixture__;
    };
  }, [recorder]);

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
