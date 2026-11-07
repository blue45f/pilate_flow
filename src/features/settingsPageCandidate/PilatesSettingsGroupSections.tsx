import {
  type CandidateInstallOverride,
  type CandidateVoiceOverride,
} from './settingsPageModel';
import { PilatesSettingsInstallDataSections } from './PilatesSettingsInstallDataSections';
import {
  type SettingsGroupId,
  type SettingsGroupSummary,
  type SettingsPageActionPort,
  type SettingsPageViewModel,
  type SettingsVoicePreferenceKey,
  type SettingsVoiceSpeed,
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

export function PilatesSettingsGroupSections(props: SettingsGroupSectionsProps) {
  const {
    instanceId,
    activeGroup,
    model,
    port,
    reducedMotion,
    mediaReducedMotion,
    registerSectionRef,
    setLocalVoiceOverrides,
    setLocalReducedMotionOverride,
  } = props;

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

  return (
    <div className="pf-settings-page__groups">
      <section
        ref={(el) => registerSectionRef('account', el)}
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

        {!hasAnyAccountPort && !model.account.unsupportedHost && (
          <p
            className="pf-settings-guard-box"
            data-testid="settings-account-unconnected-guide"
          >
            이 요약 영역에서는 로그인을 실행하지 않습니다. 바로 위 ‘Google 계정 연결’에서
            로그인·계정 전환을 이용해 주세요.
          </p>
        )}
      </section>

      <section
        ref={(el) => registerSectionRef('voice', el)}
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
            <dt>음성 개인정보 보호</dt>
            <dd>{model.voice.privacyBoundaryLabelKo}</dd>
          </div>
          <div className="pf-settings-kv-item">
            <dt>시각 모션 감소</dt>
            <dd data-testid="settings-reduced-motion-status">
              {reducedMotion
                ? '모션 감소 켜짐 (즉시 전환 · 스크롤 애니메이션 생략)'
                : '기본 모션 (표준 화면 전환)'}
            </dd>
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

          <button
            type="button"
            className={`pf-settings-page__btn ${reducedMotion ? 'pf-settings-page__btn--primary' : ''}`}
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

        {(!hasAnyVoicePort || !hasReducedMotionPort) && (
          <p className="pf-settings-guard-box" data-testid="settings-voice-unconnected-guide">
            음성 켜기와 읽어 줄 항목은 ‘수업 진행’ 화면의 ‘기기 음성 안내’에서 수업마다 직접 설정해
            주세요. 재생 속도는 기본(1.0x)으로 고정되며, 화면 전환 줄이기는 기기·브라우저의 ‘모션
            감소’ 설정을 따릅니다.
          </p>
        )}

        <p className="pf-settings-status" data-testid="settings-voice-announcement">
          {model.voice.statusAnnouncementKo}
        </p>
      </section>

      <PilatesSettingsInstallDataSections {...props} />
    </div>
  );
}
