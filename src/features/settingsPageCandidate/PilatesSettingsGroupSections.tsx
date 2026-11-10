import { useRef } from 'react';
import type {
  CandidateInstallOverride,
  CandidateVoiceOverride,
} from './settingsPageModel';
import { PilatesSettingsInstallDataSections } from './PilatesSettingsInstallDataSections';
import type {
  SettingsGroupId,
  SettingsGroupSummary,
  SettingsPageActionPort,
  SettingsPageViewModel,
  SettingsVoicePreferenceKey,
  SettingsVoiceSpeed,
} from './types';

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

export interface SettingsGroupSectionsProps {
  readonly instanceId: string;
  readonly activeGroup: SettingsGroupId;
  readonly model: SettingsPageViewModel;
  readonly port?: Partial<SettingsPageActionPort>;
  readonly reducedMotion: boolean;
  readonly mediaReducedMotion: boolean;
  readonly manualGuideOpen: boolean;
  readonly offlineNotesOpen: boolean;
  readonly combinedInstallStatusAnnouncement: string | null;
  readonly onNavigateToGroup?: (
    groupId: SettingsGroupId,
    focusMode?: 'none' | 'heading' | 'primary-action',
  ) => void;
  readonly registerSectionRef: (groupId: SettingsGroupId, el: HTMLElement | null) => void;
  readonly setLocalVoiceOverrides: (
    updater: (prev: CandidateVoiceOverride) => CandidateVoiceOverride,
  ) => void;
  readonly setLocalInstallOverrides: (
    updater: (prev: CandidateInstallOverride) => CandidateInstallOverride,
  ) => void;
  readonly setLocalReducedMotionOverride: (nextReducedMotion: boolean) => void;
  readonly setLocalEquipOverrides: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  readonly setLocalPropOverrides: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  readonly setLocalActionFeedback: (feedback: string) => void;
}

function getGroupSummary(
  model: SettingsPageViewModel,
  id: SettingsGroupId,
): SettingsGroupSummary {
  return model.groups.find((item) => item.id === id) ?? model.groups[0];
}

interface PurposeNextAction {
  readonly summaryKo: string;
  readonly buttonLabelKo: string;
  readonly targetGroup: SettingsGroupId;
  readonly tone: 'attention' | 'ready';
}

function resolvePurposeNextAction(
  model: SettingsPageViewModel,
  flags: {
    hasInstallPort: boolean;
    hasExportBackupPort: boolean;
    hasToggleEquipPort: boolean;
  },
): PurposeNextAction {
  if (model.data.persistenceErrorKo) {
    return {
      summaryKo: '저장 공간 점검 알림이 있습니다. 전체 JSON 백업 파일을 먼저 내려받아 보관하세요.',
      buttonLabelKo: '백업 영역으로 이동',
      targetGroup: 'data',
      tone: 'attention',
    };
  }
  if (model.data.recoveryStage === 'preview-ready' && model.data.recoveryPreview) {
    const blockedOrStale =
      model.data.recoveryPreview.stale || model.data.recoveryPreview.diskBlocked;
    return {
      summaryKo: blockedOrStale
        ? '복구 전 확인 항목에 재검토가 필요합니다. 기존 자료는 그대로 보존되어 있습니다.'
        : '불러온 백업 병합 요약을 검토한 뒤 복원 적용 또는 취소를 선택하세요.',
      buttonLabelKo: '복구 전 확인 바로 보기',
      targetGroup: 'data',
      tone: 'attention',
    };
  }
  if (model.data.recoveryStage === 'rollback-available' && model.data.rollbackPoint) {
    return {
      summaryKo: '방금 적용한 백업 병합 결과를 확인하거나 이전 상태로 되돌릴 수 있습니다.',
      buttonLabelKo: '복원 되돌리기 확인하기',
      targetGroup: 'data',
      tone: 'attention',
    };
  }
  if (!model.install.installed && model.install.showInstallButton && flags.hasInstallPort) {
    return {
      summaryKo: '수업 중 빠른 실행과 오프라인 열람을 위해 기기 설치와 음성 준비를 점검하세요.',
      buttonLabelKo: '기기·설치 점검으로 이동',
      targetGroup: 'install',
      tone: 'ready',
    };
  }
  return {
    summaryKo:
      flags.hasExportBackupPort || flags.hasToggleEquipPort
        ? '보유 기구·소도구를 맞추고 중요한 수업 변경 뒤에는 JSON 백업을 보관하세요.'
        : '보관된 수업 자료 수와 기기·음성 준비 상태를 한눈에 확인하세요.',
    buttonLabelKo: '데이터·기구 관리로 이동',
    targetGroup: 'data',
    tone: 'ready',
  };
}

export function PilatesSettingsGroupSections(props: SettingsGroupSectionsProps) {
  const {
    instanceId,
    activeGroup,
    model,
    port,
    reducedMotion,
    mediaReducedMotion,
    onNavigateToGroup,
    registerSectionRef,
    setLocalVoiceOverrides,
    setLocalReducedMotionOverride,
  } = props;

  const localSectionEls = useRef<Record<SettingsGroupId, HTMLElement | null>>({
    account: null,
    voice: null,
    install: null,
    data: null,
  });

  const bindSectionRef = (groupId: SettingsGroupId, el: HTMLElement | null) => {
    localSectionEls.current[groupId] = el;
    registerSectionRef(groupId, el);
  };

  const jumpToSection = (
    groupId: SettingsGroupId,
    focusMode: 'none' | 'heading' | 'primary-action' = 'heading',
  ) => {
    if (onNavigateToGroup) {
      onNavigateToGroup(groupId, focusMode);
      return;
    }
    const target = localSectionEls.current[groupId];
    if (target && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      } catch {
        // Ignore in JSDOM environments
      }
    }
    if (!target || focusMode === 'none') return;
    if (focusMode === 'primary-action') {
      const primary = target.querySelector<HTMLElement>(
        '[data-settings-primary-action="true"]:not([disabled])',
      );
      if (primary) {
        primary.focus({ preventScroll: true });
        return;
      }
    }
    const heading = target.querySelector<HTMLElement>('h3');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus({ preventScroll: true });
    }
  };

  const accountSummary = getGroupSummary(model, 'account');
  const voiceSummary = getGroupSummary(model, 'voice');

  const hasSignInPort = typeof port?.onRequestGoogleSignIn === 'function';
  const hasSwitchPort = typeof port?.onRequestAccountSwitch === 'function';
  const hasSignOutPort = typeof port?.onRequestSignOut === 'function';
  const hasAuthRecheckPort = typeof port?.onRequestAuthRecheck === 'function';
  const hasAnyAccountPort =
    hasSignInPort || hasSwitchPort || hasSignOutPort || hasAuthRecheckPort;

  const hasVoiceTogglePort = typeof port?.onToggleVoiceEnabled === 'function';
  const hasVoiceSpeedPort = typeof port?.onChangeVoiceSpeed === 'function';
  const hasVoicePrefPort = typeof port?.onToggleVoicePreference === 'function';
  const hasVoiceSamplePort = typeof port?.onPreviewVoiceSample === 'function';
  const hasVoiceRecheckPort = typeof port?.onRecheckVoiceCapability === 'function';
  const hasReducedMotionPort = typeof port?.onToggleReducedMotion === 'function';
  const hasAnyVoicePort =
    hasVoiceTogglePort ||
    hasVoiceSpeedPort ||
    hasVoicePrefPort ||
    hasVoiceSamplePort ||
    hasVoiceRecheckPort;

  const hasInstallPort = typeof port?.onRequestPwaInstall === 'function';
  const hasExportBackupPort = typeof port?.onExportBackupJson === 'function';
  const hasToggleEquipPort = typeof port?.onToggleOwnedEquipment === 'function';

  const nextAction = resolvePurposeNextAction(model, {
    hasInstallPort,
    hasExportBackupPort,
    hasToggleEquipPort,
  });

  const deviceReadinessLineKo = `${
    model.install.installed
      ? '앱 설치 완료'
      : hasInstallPort && model.install.showInstallButton
        ? '홈 화면 설치 가능'
        : '웹 브라우저 실행 중'
  } · ${
    !model.voice.canToggleEnabled
      ? '한국어 음성 미지원(대본 안내)'
      : hasAnyVoicePort
        ? model.voice.enabled
          ? '한국어 음성 켜짐'
          : '한국어 음성 준비됨(꺼짐)'
        : '음성은 수업 진행 화면에서 설정'
  }`;

  const dataPreservationStateKo = model.data.persistenceErrorKo
    ? '저장 공간 점검 필요 · 백업 권장'
    : model.data.recoveryStage === 'preview-ready'
      ? '복구 전 확인 대기 중 (적용 전까지 기존 자료 유지)'
      : model.data.recoveryStage === 'rollback-available'
        ? '방금 백업 병합됨 · 직전 상태 되돌리기 가능'
        : '이 브라우저에 자동 보관 중';

  return (
    <div className="pf-settings-page__groups">
      <section
        className="pf-settings-purpose-overview"
        aria-label="설정 준비 및 데이터 보존 요약"
        data-testid="settings-purpose-overview"
      >
        <div className="pf-settings-overview-card" data-testid="settings-overview-device-voice">
          <span className="pf-settings-overview-card__label">1. 기기 · 음성 준비</span>
          <strong className="pf-settings-overview-card__value">{deviceReadinessLineKo}</strong>
          <div className="pf-settings-overview-card__links">
            <button
              type="button"
              className="pf-settings-subchip"
              data-testid="settings-overview-jump-install"
              onClick={() => jumpToSection('install', 'heading')}
            >
              앱 설치 확인
            </button>
            <button
              type="button"
              className="pf-settings-subchip"
              data-testid="settings-overview-jump-voice"
              onClick={() => jumpToSection('voice', 'heading')}
            >
              음성 준비 확인
            </button>
          </div>
        </div>

        <div className="pf-settings-overview-card" data-testid="settings-overview-data-safety">
          <span className="pf-settings-overview-card__label">2. 데이터 보존 상태</span>
          <strong className="pf-settings-overview-card__value">
            {model.data.currentRecordsSummaryKo}
          </strong>
          <span className="pf-settings-overview-card__meta">{dataPreservationStateKo}</span>
        </div>

        <div
          className={`pf-settings-overview-card pf-settings-overview-card--action ${
            nextAction.tone === 'attention' ? 'is-attention' : ''
          }`}
          data-testid="settings-next-action-card"
        >
          <span className="pf-settings-overview-card__label">필요한 다음 행동</span>
          <span className="pf-settings-overview-card__meta" data-testid="settings-next-action-text">
            {nextAction.summaryKo}
          </span>
          <button
            type="button"
            className="pf-settings-page__btn pf-settings-page__btn--primary pf-settings-overview-cta"
            data-testid="settings-next-action-btn"
            onClick={() => jumpToSection(nextAction.targetGroup, 'primary-action')}
          >
            {nextAction.buttonLabelKo}
          </button>
        </div>
      </section>

      <section
        ref={(el) => bindSectionRef('account', el)}
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
            <div className="pf-settings-group__badges">
              <span
                className="pf-settings-group__badge"
                data-testid="settings-current-value-account"
              >
                현재값: {accountSummary.currentValueBadgeKo}
              </span>
              <span
                className={`pf-settings-connection-badge ${
                  hasAnyAccountPort ? 'is-connected' : 'is-summary-only'
                }`}
                data-testid="settings-connection-badge-account"
              >
                {hasAnyAccountPort
                  ? '바로 전환 가능'
                  : model.account.unsupportedHost
                    ? '운영 도메인 전용'
                    : '상태 요약 전용'}
              </span>
            </div>
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

        {!hasAnyAccountPort && !model.account.unsupportedHost && (
          <p
            className="pf-settings-guard-box"
            data-testid="settings-account-unconnected-guide"
          >
            이 요약 영역에서는 로그인을 실행하지 않습니다. 바로 위 ‘Google 계정 연결’에서
            로그인·계정 전환을 이용해 주세요.
          </p>
        )}

        <div className="pf-settings-actions">
          {model.account.phase === 'signed-out' && (
            <button
              type="button"
              className={`pf-settings-page__btn ${hasSignInPort ? 'pf-settings-page__btn--primary' : ''}`}
              data-testid="settings-account-signin-btn"
              data-settings-primary-action="true"
              disabled={model.account.busy || !hasSignInPort}
              onClick={() => {
                if (model.account.busy || !hasSignInPort) return;
                port?.onRequestGoogleSignIn?.();
              }}
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
                data-settings-primary-action="true"
                disabled={model.account.busy || !hasSwitchPort}
                onClick={() => {
                  if (model.account.busy || !hasSwitchPort) return;
                  port?.onRequestAccountSwitch?.();
                }}
              >
                다른 Google 계정으로 전환
              </button>
              <button
                type="button"
                className="pf-settings-page__btn"
                data-testid="settings-account-signout-btn"
                disabled={model.account.busy || !hasSignOutPort}
                onClick={() => {
                  if (model.account.busy || !hasSignOutPort) return;
                  port?.onRequestSignOut?.();
                }}
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
                data-settings-primary-action="true"
                disabled={model.account.busy || !hasAuthRecheckPort}
                onClick={() => {
                  if (model.account.busy || !hasAuthRecheckPort) return;
                  port?.onRequestAuthRecheck?.();
                }}
              >
                계정 연결 다시 확인
              </button>
            ))}
        </div>

        <details
          className="pf-settings-details pf-settings-details--compact"
          data-testid="settings-account-policy-details"
        >
          <summary>인증·보안 보호 기준 보기</summary>
          <div className="pf-settings-details__body">
            <p
              style={{ margin: 0 }}
              data-testid="settings-account-security-readonly-badge"
            >
              {model.account.securityPolicyLabelKo}
            </p>
          </div>
        </details>
      </section>

      <section
        ref={(el) => bindSectionRef('voice', el)}
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
            <div className="pf-settings-group__badges">
              <span
                className="pf-settings-group__badge"
                data-testid="settings-current-value-voice"
              >
                현재값: {voiceSummary.currentValueBadgeKo}
              </span>
              <span
                className={`pf-settings-connection-badge ${
                  hasAnyVoicePort || hasReducedMotionPort ? 'is-connected' : 'is-summary-only'
                }`}
                data-testid="settings-connection-badge-voice"
              >
                {hasAnyVoicePort || hasReducedMotionPort
                  ? '바로 설정 가능'
                  : '수업 진행 화면에서 설정'}
              </span>
            </div>
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
            <dd data-testid="settings-voice-speed-status">
              {hasVoiceSpeedPort
                ? model.voice.currentSpeedLabelKo
                : '1.0x (기본 고정 · 수업 화면 속도 변경 미지원)'}
            </dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>안내 항목 현재값</dt>
            <dd>{model.voice.currentPreferencesLabelKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>시각 모션 감소</dt>
            <dd data-testid="settings-reduced-motion-status">
              {reducedMotion
                ? '모션 감소 켜짐 (즉시 전환 · 스크롤 애니메이션 생략)'
                : '기본 모션 (표준 화면 전환)'}
            </dd>
          </div>
        </dl>

        {model.voice.errorMessageKo && (
          <p role="alert" className="pf-settings-alert" data-testid="settings-voice-error">
            {model.voice.errorMessageKo}
          </p>
        )}

        {(!hasAnyVoicePort || !hasReducedMotionPort) && (
          <p className="pf-settings-guard-box" data-testid="settings-voice-unconnected-guide">
            음성 켜기와 읽어 줄 항목은 ‘수업 진행’ 화면의 ‘기기 음성 안내’에서 수업마다 직접 설정해
            주세요. 재생 속도는 기본(1.0x)으로 고정되며, 화면 전환 줄이기는 기기·브라우저의 ‘모션
            감소’ 설정을 따릅니다.
          </p>
        )}

        <div className="pf-settings-actions">
          <button
            type="button"
            className={`pf-settings-page__btn ${
              model.voice.enabled && hasVoiceTogglePort ? 'pf-settings-page__btn--primary' : ''
            }`}
            data-testid="settings-voice-enable-toggle"
            data-settings-primary-action="true"
            aria-pressed={model.voice.enabled}
            disabled={!model.voice.canToggleEnabled || !hasVoiceTogglePort}
            onClick={() => {
              if (!model.voice.canToggleEnabled || !hasVoiceTogglePort) return;
              const next = !model.voice.enabled;
              let nextNotice: string;
              if (!next) {
                nextNotice = '한국어 음성 안내를 껐습니다. 자동 발화 없이 화면 대본만 표시됩니다.';
              } else if (model.voice.enabledPreferenceCount === 0) {
                nextNotice =
                  '한국어 음성 안내를 켰으나 안내 항목이 모두 꺼져 있어(0/3) 실제 발화되지 않습니다. 최소 1개 항목을 선택해 주세요.';
              } else {
                nextNotice =
                  '한국어 음성 안내를 켰습니다. 수업 진행 중 사용자의 명시적 토글·브라우저 허용 하에 기기 음성으로 안내하며, 참고 영상은 자동 재생하지 않습니다.';
              }
              setLocalVoiceOverrides((prev) => ({
                ...prev,
                enabled: next,
                sampleNotice: nextNotice,
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
            className={`pf-settings-page__btn ${
              reducedMotion && hasReducedMotionPort ? 'pf-settings-page__btn--primary' : ''
            }`}
            data-testid="settings-reduced-motion-toggle"
            aria-pressed={reducedMotion}
            disabled={!hasReducedMotionPort}
            onClick={() => {
              if (!hasReducedMotionPort) return;
              const next = !reducedMotion;
              setLocalReducedMotionOverride(next);
              setLocalVoiceOverrides((prev) => ({
                ...prev,
                sampleNotice: next
                  ? '시각 모션 감소를 켰습니다. 설정 화면의 전환 효과와 부드러운 스크롤을 줄입니다.'
                  : mediaReducedMotion
                    ? '설정 내 모션 감소 토글을 해제했습니다. 기기·브라우저 모션 감소 설정이 켜져 있으면 기기 설정도 함께 확인해 주세요.'
                    : '시각 모션 감소를 껐습니다. 기본 화면 전환을 사용합니다.',
              }));
              port?.onToggleReducedMotion?.(next);
            }}
          >
            {reducedMotion ? '시각 모션 감소 켜짐 (누르면 기본 모션)' : '시각 모션 감소 켜기'}
          </button>
        </div>

        <details
          className="pf-settings-details pf-settings-details--compact"
          open={hasAnyVoicePort}
          data-testid="settings-voice-controls-disclosure"
        >
          <summary>
            {hasAnyVoicePort
              ? '샘플 확인 · 재생 속도 · 안내 항목 선택'
              : '기본 음성 속도·항목 구성을 읽기 전용으로 보기'}
          </summary>
          <div className="pf-settings-details__body">
            <div className="pf-settings-actions" style={{ marginTop: 4 }}>
              <button
                type="button"
                className="pf-settings-page__btn"
                data-testid="settings-voice-sample-btn"
                disabled={!model.voice.canToggleEnabled || !hasVoiceSamplePort}
                onClick={() => {
                  if (!model.voice.canToggleEnabled || !hasVoiceSamplePort) return;
                  let sampleNotice: string;
                  if (!model.voice.enabled) {
                    sampleNotice = `음성 안내가 꺼져 있어 자동 발화 없이 화면 대본만 표시합니다 (${model.voice.currentSpeedLabelKo}): "호흡을 내쉬며 골반을 천천히 말아 올립니다." (발화는 사용자 명시 토글·브라우저 허용 전제)`;
                  } else if (model.voice.enabledPreferenceCount === 0) {
                    sampleNotice = `선택된 안내 항목이 없어(0/3) 샘플 발화를 생략하고 화면 대본만 표시합니다 (${model.voice.currentSpeedLabelKo}).`;
                  } else {
                    sampleNotice = `샘플 안내 확인 (${model.voice.currentSpeedLabelKo}): "호흡을 내쉬며 골반을 천천히 말아 올립니다."`;
                  }
                  setLocalVoiceOverrides((prev) => ({
                    ...prev,
                    sampleNotice,
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
                disabled={!hasVoiceRecheckPort}
                onClick={() => {
                  if (!hasVoiceRecheckPort) return;
                  let recheckNotice: string;
                  if (model.voice.capabilityStatus === 'unsupported') {
                    recheckNotice =
                      '음성 상태 확인 결과: 현재 브라우저에서 Web Speech API 음성 합성을 지원하지 않아 화면 대본으로만 안내합니다.';
                  } else if (
                    model.voice.capabilityStatus === 'no-korean-voice' ||
                    !model.voice.localService
                  ) {
                    recheckNotice =
                      '음성 상태 확인 결과: 기기 내장 한국어(ko-KR) 음성이 아직 확인되지 않아 화면 대본으로 대체합니다.';
                  } else {
                    recheckNotice =
                      '기기 내장 한국어 음성 목록을 다시 확인했습니다. (사용자 명시 토글·브라우저 허용 시 발화)';
                  }
                  setLocalVoiceOverrides((prev) => ({
                    ...prev,
                    sampleNotice: recheckNotice,
                  }));
                  port?.onRecheckVoiceCapability?.();
                }}
              >
                음성 상태 다시 확인
              </button>
            </div>

            <fieldset className="pf-settings-fieldset" disabled={!hasVoiceSpeedPort}>
              <legend>한국어 음성 재생 속도</legend>
              <div className="pf-settings-actions">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="pf-settings-page__speed-btn"
                    data-testid={`settings-voice-speed-${option.value}`}
                    aria-pressed={model.voice.speed === option.value}
                    disabled={!hasVoiceSpeedPort}
                    onClick={() => {
                      if (!hasVoiceSpeedPort) return;
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

            <fieldset className="pf-settings-fieldset" disabled={!hasVoicePrefPort}>
              <legend>수업 중 읽어 줄 음성 안내 항목</legend>
              <div className="pf-settings-check-grid">
                {VOICE_PREF_ITEMS.map(({ key, labelKo }) => {
                  const checked = model.voice.preferences[key];
                  return (
                    <label
                      key={key}
                      className={`pf-settings-check-label ${!hasVoicePrefPort ? 'pf-settings-check-label--disabled' : ''}`}
                      data-testid={`settings-voice-pref-label-${key}`}
                    >
                      <input
                        type="checkbox"
                        data-testid={`settings-voice-pref-${key}`}
                        checked={checked}
                        disabled={!hasVoicePrefPort}
                        onChange={() => {
                          if (!hasVoicePrefPort) return;
                          const nextChecked = !checked;
                          const nextPrefs = {
                            ...model.voice.preferences,
                            [key]: nextChecked,
                          };
                          const nextActiveCount =
                            (nextPrefs.movement ? 1 : 0) +
                            (nextPrefs.breath ? 1 : 0) +
                            (nextPrefs.time ? 1 : 0);
                          setLocalVoiceOverrides((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              [key]: nextChecked,
                            },
                            sampleNotice:
                              model.voice.enabled && nextActiveCount === 0
                                ? '안내 항목이 모두 꺼져(0/3) 수업 중 음성이 발화되지 않습니다. 화면 대본만 유지됩니다.'
                                : undefined,
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
          </div>
        </details>

        <p className="pf-settings-status" data-testid="settings-voice-announcement">
          {model.voice.statusAnnouncementKo}
        </p>

        <details
          className="pf-settings-details pf-settings-details--compact"
          data-testid="settings-voice-policy-details"
        >
          <summary>음성 개인정보·자동재생 금지 기준 보기</summary>
          <div className="pf-settings-details__body">
            <dl className="pf-settings-kv-list" style={{ marginBottom: 0 }}>
              <div className="pf-settings-kv-item">
                <dt>음성 개인정보 보호</dt>
                <dd>{model.voice.privacyBoundaryLabelKo}</dd>
              </div>
              <div className="pf-settings-kv-item">
                <dt>음성 자동발화 전제</dt>
                <dd data-testid="settings-voice-autoplay-prerequisite">
                  {model.voice.autoSpeechPolicyLabelKo}
                </dd>
              </div>
              <div className="pf-settings-kv-item">
                <dt>참고 영상 재생 정책</dt>
                <dd data-testid="settings-video-autoplay-policy">
                  {model.voice.videoAutoplayPolicyLabelKo}
                </dd>
              </div>
            </dl>
          </div>
        </details>
      </section>

      <PilatesSettingsInstallDataSections
        {...props}
        registerSectionRef={bindSectionRef}
      />
    </div>
  );
}
