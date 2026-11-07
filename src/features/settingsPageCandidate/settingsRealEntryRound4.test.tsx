// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PilatesSettingsPage,
  cloneSettingsSnapshotInput,
  createMockSettingsActionRecorder,
  getSettingsFixturePreset,
  resetSettingsCandidateSessionForTests,
  resolveSettingsPageViewModel,
} from './index';

describe('settingsRealEntryRound4 — Real Entry Wiring, Honest Voice/Install Feedback & Revisit Consistency', () => {
  beforeEach(() => {
    resetSettingsCandidateSessionForTests();
  });

  afterEach(() => {
    cleanup();
    resetSettingsCandidateSessionForTests();
  });

  it('1. [음성안내 토글 · 잘못된 성공 차단] Real App.tsx entry shape (data-only snapshot, no voice port) disables unconnected voice controls and shows honest guidance without fake success', () => {
    const appEntrySnapshot = {
      data: {
        savedSequenceCount: 2,
        exerciseCount: 98,
        historyLogCount: 1,
        ownedEquipmentIds: ['reformer'],
        ownedPropIds: [],
      },
    };

    const rawEntryViewModel = resolveSettingsPageViewModel(appEntrySnapshot);
    expect(rawEntryViewModel.voice.currentCapabilityLabelKo).toBe(
      '기기 내장 한국어 음성 (수업 화면 진입·명시 토글 시 확인)',
    );
    expect(rawEntryViewModel.voice.voiceName).toBeNull();

    render(
      <PilatesSettingsPage
        snapshot={appEntrySnapshot}
        port={{
          onExportBackupJson: vi.fn(),
          onToggleOwnedEquipment: vi.fn(),
        }}
      />,
    );

    const voiceSection = screen.getByTestId('settings-group-voice');
    expect(within(voiceSection).queryByText(/Yuna|Sora/)).toBeNull();

    const voiceToggle = screen.getByTestId('settings-voice-enable-toggle') as HTMLButtonElement;
    expect(voiceToggle.disabled).toBe(true);
    expect(voiceToggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(voiceToggle);
    expect(voiceToggle.getAttribute('aria-pressed')).toBe('false');

    const guide = screen.getByTestId('settings-voice-unconnected-guide').textContent ?? '';
    expect(guide).toContain('수업 진행');
    expect(guide).toContain('기기 음성 안내');
    expect(guide).toContain('1.0x');
  });

  it('2. [음성안내 토글 · 0/3 항목 선택 방어] Unchecking all 3 voice preferences while voice is enabled updates badge to "음성 대기 (항목 0/3)" and warns that no speech occurs', () => {
    const preset = getSettingsFixturePreset('default-local-studio');
    const recorder = createMockSettingsActionRecorder();
    render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
        port={recorder.port}
      />,
    );

    // Enable voice first
    fireEvent.click(screen.getByTestId('settings-voice-enable-toggle'));
    expect(screen.getByTestId('settings-current-value-voice').textContent).toBe(
      '현재값: 음성 켜짐 · 1.0x (기본)',
    );

    // Uncheck all 3 preferences (movement, breath, time)
    fireEvent.click(screen.getByTestId('settings-voice-pref-movement'));
    fireEvent.click(screen.getByTestId('settings-voice-pref-breath'));
    fireEvent.click(screen.getByTestId('settings-voice-pref-time'));

    expect(screen.getByTestId('settings-current-value-voice').textContent).toBe(
      '현재값: 음성 대기 (항목 0/3) · 1.0x (기본)',
    );
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '안내 항목이 모두 꺼져(0/3) 수업 중 음성이 발화되지 않습니다.',
    );

    // Clicking sample button when 0/3 items are selected also warns that sample speech is skipped
    fireEvent.click(screen.getByTestId('settings-voice-sample-btn'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '선택된 안내 항목이 없어(0/3) 샘플 발화를 생략하고 화면 대본만 표시합니다',
    );
  });

  it('3. [음성안내 토글 · 샘플/재확인 잘못된 성공 차단] Sample button when voice is OFF and Recheck button when capability is unavailable report honest non-speaking status', () => {
    const recorder = createMockSettingsActionRecorder();
    const defaultPreset = getSettingsFixturePreset('default-local-studio');
    const { unmount } = render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(defaultPreset.snapshot)}
        port={recorder.port}
      />,
    );

    // Voice is OFF by default in default-local-studio
    fireEvent.click(screen.getByTestId('settings-voice-sample-btn'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '음성 안내가 꺼져 있어 자동 발화 없이 화면 대본만 표시합니다',
    );
    unmount();

    // Test no-korean-voice preset recheck
    const noKoreanPreset = getSettingsFixturePreset('ios-safari-no-korean-voice');
    const { unmount: unmountNoKo } = render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(noKoreanPreset.snapshot)}
        port={recorder.port}
      />,
    );
    fireEvent.click(screen.getByTestId('settings-voice-recheck-btn'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '음성 상태 확인 결과: 기기 내장 한국어(ko-KR) 음성이 아직 확인되지 않아 화면 대본으로 대체합니다.',
    );
    unmountNoKo();

    // Test unsupported preset recheck
    const unsupportedPreset = getSettingsFixturePreset('storage-warning-stale-preview');
    render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(unsupportedPreset.snapshot)}
        port={recorder.port}
      />,
    );
    fireEvent.click(screen.getByTestId('settings-voice-recheck-btn'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '음성 상태 확인 결과: 현재 브라우저에서 Web Speech API 음성 합성을 지원하지 않아 화면 대본으로만 안내합니다.',
    );
  });

  it('4. [음성안내 토글 · 반영누락 수정] Toggling a voice preference after speed/sample action clears stale sampleNotice and reflects updated preference count immediately', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('signed-in-active-instructor');
    render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
        port={recorder.port}
      />,
    );

    // Click speed 0.85x, which sets sampleNotice
    fireEvent.click(screen.getByTestId('settings-voice-speed-0.85'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '한국어 음성 재생 속도가 0.85배속으로 설정되었습니다.',
    );

    // Now toggle breath preference ON (was false in signed-in-active-instructor -> becomes 3/3)
    fireEvent.click(screen.getByTestId('settings-voice-pref-breath'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain('3/3 켜짐');

    // Toggle breath preference OFF again -> becomes 2/3 켜짐
    fireEvent.click(screen.getByTestId('settings-voice-pref-breath'));
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain('2/3 켜짐');
  });

  it('5. [미디어·음성 자동재생 금지 정책 명시] Renders explicit prerequisite for user gesture + browser permission and zero video autoplay policy', () => {
    render(<PilatesSettingsPage />);

    expect(screen.getByTestId('settings-voice-autoplay-prerequisite').textContent).toBe(
      '사용자 명시적 토글 ON + 브라우저 음성 허용 전제 (자동 발화 금지)',
    );
    expect(screen.getByTestId('settings-video-autoplay-policy').textContent).toBe(
      '참고 영상 자동재생 금지 (수업 중 강사가 직접 열 때만 실행)',
    );
  });

  it('6. [모션감소 · UI 반영 및 액션 포트] Toggling settings-reduced-motion-toggle updates data-reduced-motion, status row, announcement, and action recorder', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');
    render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
        port={recorder.port}
      />,
    );

    const root = screen.getByTestId('pilates-settings-page');
    expect(root.getAttribute('data-reduced-motion')).toBe('false');
    expect(screen.getByTestId('settings-reduced-motion-status').textContent).toBe(
      '기본 모션 (표준 화면 전환)',
    );

    const motionBtn = screen.getByTestId('settings-reduced-motion-toggle');
    expect(motionBtn.getAttribute('aria-pressed')).toBe('false');

    // Toggle ON
    fireEvent.click(motionBtn);
    expect(root.getAttribute('data-reduced-motion')).toBe('true');
    expect(motionBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('settings-reduced-motion-status').textContent).toContain(
      '모션 감소 켜짐 (즉시 전환 · 스크롤 애니메이션 생략)',
    );
    expect(screen.getByTestId('settings-voice-announcement').textContent).toContain(
      '시각 모션 감소를 켰습니다.',
    );
    expect(recorder.calls).toContainEqual({
      type: 'motion:toggle-reduced-motion',
      nextReducedMotion: true,
    });

    // Toggle OFF
    fireEvent.click(motionBtn);
    expect(root.getAttribute('data-reduced-motion')).toBe('false');
    expect(motionBtn.getAttribute('aria-pressed')).toBe('false');
    expect(recorder.calls).toContainEqual({
      type: 'motion:toggle-reduced-motion',
      nextReducedMotion: false,
    });
  });

  it('7. [모션감소 · 그룹 점프 스크롤] Group navigation always uses instant scroll behavior even when reducedMotion is enabled', () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollSpy,
    });

    render(<PilatesSettingsPage preferReducedMotion={true} />);

    fireEvent.click(screen.getByTestId('settings-nav-chip-install'));
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'instant', block: 'nearest' });
  });

  it('8. [오프라인설치 설명 · 오류 상태 및 범위 경계] Verifies offlineStatus error copy and explicit offline/media/sync boundary notice', () => {
    const errorModel = resolveSettingsPageViewModel({
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: false,
        installStatus: 'error',
        offlineStatus: 'error',
      },
    });

    expect(errorModel.install.currentOfflineLabelKo).toBe('오프라인 준비 오류 (온라인 연결 필요)');
    expect(errorModel.install.offlineDetailSummaryKo).toContain(
      '오프라인 기본 화면 캐시를 준비하지 못했어요.',
    );

    render(
      <PilatesSettingsPage
        snapshot={{
          install: {
            standalone: false,
            installed: false,
            platform: 'browser',
            canInstall: false,
            installStatus: 'error',
            offlineStatus: 'error',
          },
        }}
      />,
    );

    expect(screen.getByTestId('settings-install-offline-summary').textContent).toContain(
      '오프라인 기본 화면 캐시를 준비하지 못했어요.',
    );
    const scopeText = screen.getByTestId('settings-install-offline-scope').textContent ?? '';
    expect(scopeText).toContain('기본 화면만 오프라인 열람 가능');
    expect(scopeText).toContain('로그인·클라우드 백업·외부 참고 영상(자동재생 금지)은 인터넷 연결 필요');
    expect(scopeText).toContain('설치는 기기 간 자동 동기화가 아님');
  });

  it('9. [오프라인설치 설명 · 포트 미연결 시 비활성화 및 안내] Disables install button, shows honest fallback guide, and opens manual guide when port.onRequestPwaInstall is undefined', () => {
    render(
      <PilatesSettingsPage
        snapshot={{
          install: {
            standalone: false,
            installed: false,
            platform: 'browser',
            canInstall: true,
            installStatus: 'idle',
            offlineStatus: 'ready',
          },
        }}
        port={{}}
      />,
    );

    const installBtn = screen.getByTestId('settings-install-action-btn') as HTMLButtonElement;
    expect(installBtn.disabled).toBe(true);

    const manualGuide = screen.getByTestId('settings-install-manual-guide') as HTMLDetailsElement;
    expect(manualGuide.open).toBe(true);

    expect(screen.getByTestId('settings-install-unconnected-guide').textContent).toContain(
      '메뉴의 ‘앱 설치’ 버튼이나 아래 브라우저 메뉴 설치 방법을 이용해 주세요.',
    );
  });

  it('10. [설정 재방문 불일치 수정 · 포트 연결 라이프사이클] Preserves voice, speed, preference, reduced motion, and active group across parent re-renders and modal unmount/remount revisit when connected', () => {
    const recorder = createMockSettingsActionRecorder();

    // Step 1: Mount with inline data-only snapshot and connected port
    const { rerender, unmount } = render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={recorder.port}
      />,
    );

    // Step 2: User modifies settings in Group 2 & Group 3
    fireEvent.click(screen.getByTestId('settings-voice-enable-toggle'));
    fireEvent.click(screen.getByTestId('settings-voice-speed-0.85'));
    fireEvent.click(screen.getByTestId('settings-voice-pref-breath'));
    fireEvent.click(screen.getByTestId('settings-reduced-motion-toggle'));
    fireEvent.click(screen.getByTestId('settings-nav-chip-install'));

    expect(screen.getByTestId('settings-voice-enable-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-voice-speed-0.85').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      (screen.getByTestId('settings-voice-pref-breath') as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-nav-chip-install').getAttribute('aria-pressed')).toBe(
      'true',
    );

    // Step 3: Parent re-renders with a brand-new inline snapshot object (e.g. after equipment toggle)
    rerender(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat', 'chair'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={recorder.port}
      />,
    );

    // Verify no state was lost on parent re-render
    expect(screen.getByTestId('settings-voice-enable-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-voice-speed-0.85').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      (screen.getByTestId('settings-voice-pref-breath') as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-nav-chip-install').getAttribute('aria-pressed')).toBe(
      'true',
    );

    // Step 4: User closes "나의 스튜디오" modal (unmount) and reopens it later (mount with new inline snapshot)
    unmount();

    render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat', 'chair'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={recorder.port}
      />,
    );

    // Verify 100% revisit consistency!
    expect(screen.getByTestId('settings-voice-enable-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-voice-speed-0.85').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      (screen.getByTestId('settings-voice-pref-breath') as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-nav-chip-install').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-current-value-voice').textContent).toBe(
      '현재값: 음성 켜짐 · 0.85x (천천히)',
    );
  });

  it('11. [설정 재방문 불일치 수정 · 명시적 스냅샷 참조 유지] Preserves overrides when unmounting and remounting with the same explicit snapshot object reference', () => {
    const preset = getSettingsFixturePreset('default-local-studio');
    const sharedSnapshot = cloneSettingsSnapshotInput(preset.snapshot);
    const recorder = createMockSettingsActionRecorder();

    const { unmount } = render(
      <PilatesSettingsPage snapshot={sharedSnapshot} port={recorder.port} />,
    );

    fireEvent.click(screen.getByTestId('settings-voice-enable-toggle'));
    fireEvent.click(screen.getByTestId('settings-voice-speed-1.15'));
    fireEvent.click(screen.getByTestId('settings-reduced-motion-toggle'));

    unmount();

    render(<PilatesSettingsPage snapshot={sharedSnapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-voice-enable-toggle').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('settings-voice-speed-1.15').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );
  });
});
