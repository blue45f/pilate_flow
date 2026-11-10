// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PilatesSettingsPage as LiveIntegratedSettingsPage } from '../../components/PilatesSettingsPage';
import { usePilatesStore } from '../../store/usePilatesStore';
import {
  PilatesSettingsPage as CandidateSettingsPage,
  cloneSettingsSnapshotInput,
  createMockSettingsActionRecorder,
  getSettingsFixturePreset,
  resetSettingsCandidateSessionForTests,
} from './index';

describe('Settings Purpose-Driven Flow UX (First Entry -> Device/Voice -> Data Preservation -> Next Action)', () => {
  beforeEach(() => {
    resetSettingsCandidateSessionForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    resetSettingsCandidateSessionForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('1. [첫 진입 → 기기/음성 준비] Starts on Step 1 (1 기기·설치 점검), supports 1-tap switch between Install and Voice, and auto-executes zero actions on mount', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');

    render(
      <LiveIntegratedSettingsPage
        snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
        port={recorder.port}
      />,
    );

    // Zero automatic side effects on initial mount
    expect(recorder.calls).toHaveLength(0);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    // First entry starts at Step 1 (Device & Install check) rather than Step 3 (optional Cloud Sync)
    const step1Chip = screen.getByTestId('settings-task-step-1');
    expect(step1Chip).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('settings-group-install')).toHaveClass('pf-settings-group--active');

    // Step 1 exposes inline sub-navigation so Korean Voice prep is directly reachable within Step 1
    const subnav = screen.getByTestId('settings-step1-subnav');
    const jumpVoiceBtn = within(subnav).getByTestId('settings-step1-jump-voice');
    fireEvent.click(jumpVoiceBtn);

    expect(step1Chip).toHaveAttribute('aria-current', 'step');
    expect(jumpVoiceBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('settings-group-voice')).toHaveClass('pf-settings-group--active');
    expect(
      within(screen.getByTestId('settings-group-voice')).getByRole('heading', { level: 3 }),
    ).toHaveFocus();
    expect(recorder.calls).toHaveLength(0);
  });

  it('2. [실제 연결 vs 미연결 정직성 & 정보량 축소] Distinguishes connected vs summary-only sections honestly, folds unconnected voice sub-controls, and eliminates duplicate offline paragraphs', () => {
    const onExportBackupJson = vi.fn();
    const onToggleOwnedEquipment = vi.fn();
    const onToggleOwnedProp = vi.fn();

    render(
      <LiveIntegratedSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={{
          onExportBackupJson,
          onToggleOwnedEquipment,
          onToggleOwnedProp,
        }}
      />,
    );

    expect(screen.getByTestId('settings-connection-badge-account')).toHaveTextContent(
      '상태 요약 전용',
    );
    expect(screen.getByTestId('settings-connection-badge-voice')).toHaveTextContent(
      '수업 진행 화면에서 설정',
    );
    expect(screen.getByTestId('settings-connection-badge-install')).toHaveTextContent(
      '상단 앱 설치 메뉴 이용',
    );
    expect(screen.getByTestId('settings-connection-badge-data')).toHaveTextContent(
      '백업 내보내기·기구 바로 반영',
    );

    // Overview honestly tells the instructor voice is configured in the teaching screen
    expect(screen.getByTestId('settings-overview-device-voice')).toHaveTextContent(
      '음성은 수업 진행 화면에서 설정',
    );

    // Unconnected secondary voice controls stay collapsed by default to reduce clutter
    const voiceDisclosure = screen.getByTestId(
      'settings-voice-controls-disclosure',
    ) as HTMLDetailsElement;
    expect(voiceDisclosure.open).toBe(false);

    // Policy disclosures stay collapsed by default while keeping safety badges inspectable
    expect(
      (screen.getByTestId('settings-account-policy-details') as HTMLDetailsElement).open,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-voice-policy-details') as HTMLDetailsElement).open,
    ).toBe(false);

    // Clicking next-action CTA jumps & focuses the connected primary export button without auto-exporting
    const nextActionBtn = screen.getByTestId('settings-next-action-btn');
    expect(nextActionBtn).toHaveTextContent('데이터·기구 관리로 이동');
    fireEvent.click(nextActionBtn);

    expect(screen.getByTestId('settings-task-step-2')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('settings-data-export-btn')).toHaveFocus();
    expect(onExportBackupJson).not.toHaveBeenCalled();
  });

  it('3. [데이터 보존 확인 경계 & 다음 행동 안내] Prioritizes preview confirmation, storage alerts, and rollback without auto-applying or mutating store drafts', () => {
    const storeBefore = JSON.stringify(usePilatesStore.getState().activeSteps);
    const recorder = createMockSettingsActionRecorder();
    const previewPreset = getSettingsFixturePreset('ios-safari-no-korean-voice');

    const { rerender } = render(
      <LiveIntegratedSettingsPage
        snapshot={cloneSettingsSnapshotInput(previewPreset.snapshot)}
        port={recorder.port}
      />,
    );

    // Preview-ready state surfaces confirmation boundary in overview & focuses apply button on jump
    expect(screen.getByTestId('settings-overview-data-safety')).toHaveTextContent(
      '복구 전 확인 대기 중 (적용 전까지 기존 자료 유지)',
    );
    const nextBtn = screen.getByTestId('settings-next-action-btn');
    expect(nextBtn).toHaveTextContent('복구 전 확인 바로 보기');
    fireEvent.click(nextBtn);

    const applyBtn = screen.getByTestId('settings-data-preview-apply-btn');
    expect(applyBtn).toHaveFocus();
    expect(recorder.calls).toHaveLength(0);

    // Explicit user click required to trigger restore or cancel callback intent
    fireEvent.click(applyBtn);
    expect(recorder.calls).toEqual([{ type: 'data:apply-restore' }]);

    // Rollback-available state guides user to rollback confirmation bar without auto-rolling back
    recorder.clear();
    const rollbackPreset = getSettingsFixturePreset('signed-in-active-instructor');
    rerender(
      <LiveIntegratedSettingsPage
        snapshot={cloneSettingsSnapshotInput(rollbackPreset.snapshot)}
        port={recorder.port}
      />,
    );

    expect(screen.getByTestId('settings-next-action-btn')).toHaveTextContent(
      '복원 되돌리기 확인하기',
    );
    fireEvent.click(screen.getByTestId('settings-next-action-btn'));
    expect(screen.getByTestId('settings-data-rollback-btn')).toHaveFocus();
    expect(recorder.calls).toHaveLength(0);

    // Store active draft steps remain 100% untouched
    expect(JSON.stringify(usePilatesStore.getState().activeSteps)).toBe(storeBefore);
  });

  it('4. [양방향 초안·선택 보존 및 영역 왕복·재오픈 검증] Preserves both deselection (true->false) and selection (false->true) across pre-click, post-click, section round-trips, and modal reopen', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');
    const snap = cloneSettingsSnapshotInput(preset.snapshot);

    const { unmount } = render(
      <LiveIntegratedSettingsPage snapshot={snap} port={recorder.port} />,
    );

    // (1) Pre-click baseline on default-local-studio:
    // chair is initially selected (true), tower & loop-band are unselected (false), voice is off (false)
    expect(screen.getByTestId('settings-voice-enable-toggle')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-equipment-check-tower') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-prop-check-loop-band') as HTMLInputElement).checked,
    ).toBe(false);

    // (2) Immediate post-click transitions (both true->false and false->true)
    fireEvent.click(screen.getByTestId('settings-overview-jump-voice'));
    fireEvent.click(screen.getByTestId('settings-voice-enable-toggle'));
    fireEvent.click(screen.getByTestId('settings-equipment-check-chair')); // true -> false
    fireEvent.click(screen.getByTestId('settings-equipment-check-tower')); // false -> true
    fireEvent.click(screen.getByTestId('settings-prop-check-loop-band')); // false -> true

    expect(screen.getByTestId('settings-voice-enable-toggle')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-equipment-check-tower') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-prop-check-loop-band') as HTMLInputElement).checked,
    ).toBe(true);
    expect(recorder.calls).toEqual([
      { type: 'voice:toggle-enabled', nextEnabled: true },
      { type: 'data:toggle-equipment', equipmentId: 'chair' },
      { type: 'data:toggle-equipment', equipmentId: 'tower' },
      { type: 'data:toggle-prop', propId: 'loop-band' },
    ]);

    // (3) Round-trip across other sections (Account -> Install -> Data): values stay intact without extra port calls
    fireEvent.click(screen.getByTestId('settings-task-step-3'));
    expect(screen.getByTestId('settings-group-account')).toHaveClass('pf-settings-group--active');
    fireEvent.click(screen.getByTestId('settings-overview-jump-install'));
    expect(screen.getByTestId('settings-group-install')).toHaveClass('pf-settings-group--active');
    fireEvent.click(screen.getByTestId('settings-task-step-2'));
    expect(screen.getByTestId('settings-group-data')).toHaveClass('pf-settings-group--active');

    expect(screen.getByTestId('settings-voice-enable-toggle')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-equipment-check-tower') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-prop-check-loop-band') as HTMLInputElement).checked,
    ).toBe(true);
    expect(recorder.calls).toHaveLength(4);

    // (4) Unmount & reopen modal: both deselected (chair=false) and newly selected (tower=true, loop-band=true, voice=true) states persist
    unmount();

    render(<LiveIntegratedSettingsPage snapshot={snap} port={recorder.port} />);
    expect(screen.getByTestId('settings-group-data')).toHaveClass('pf-settings-group--active');
    expect(screen.getByTestId('settings-voice-enable-toggle')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-equipment-check-tower') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-prop-check-loop-band') as HTMLInputElement).checked,
    ).toBe(true);
    expect(recorder.calls).toHaveLength(4);

    cleanup();

    // CandidateSettingsPage (without onNavigateToGroup prop) shares the same persisted session slice & focuses cleanly
    render(<CandidateSettingsPage snapshot={snap} port={recorder.port} />);
    expect(screen.getByTestId('settings-purpose-overview')).toBeInTheDocument();
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId('settings-equipment-check-tower') as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByTestId('settings-overview-jump-install'));
    expect(
      within(screen.getByTestId('settings-group-install')).getByRole('heading', { level: 3 }),
    ).toHaveFocus();
  });
});
