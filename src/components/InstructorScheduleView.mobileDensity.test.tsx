import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { PilatesSettingsPage } from './PilatesSettingsPage';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { getSettingsFixturePreset } from '../features/settingsPageCandidate/settingsPageFixtures';

const original = usePilatesStore.getState();

beforeEach(() => {
  usePilatesStore.setState({
    ...original,
    instructorSchedule: createEmptyInstructorSchedule(),
    generationError: null,
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

describe('InstructorScheduleView mobile density & modal draft recovery', () => {
  it('preserves unsaved location draft (alias, equipment, props, notes) across modal close and re-open until saved', () => {
    render(<InstructorScheduleView today="2026-11-04" />);

    fireEvent.click(screen.getByRole('button', { name: '장소 관리' }));
    let dialog = within(screen.getByRole('dialog', { name: '장소 관리' }));

    fireEvent.change(dialog.getByLabelText('장소 별칭'), {
      target: { value: '성수 리포머 룸' },
    });
    fireEvent.click(dialog.getByRole('checkbox', { name: '타워' }));
    fireEvent.click(dialog.getByRole('checkbox', { name: '루프 밴드' }));
    fireEvent.change(dialog.getByLabelText('장소 메모'), {
      target: { value: '주차장 2시간 무료' },
    });

    // Dismiss without saving
    fireEvent.click(dialog.getAllByRole('button', { name: '닫기' })[0]);
    expect(screen.queryByRole('dialog', { name: '장소 관리' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.locations).toHaveLength(0);

    // Re-open location modal and verify draft was preserved
    fireEvent.click(screen.getByRole('button', { name: '첫 장소 등록' }));
    dialog = within(screen.getByRole('dialog', { name: '장소 관리' }));

    expect(dialog.getByLabelText('장소 별칭')).toHaveValue('성수 리포머 룸');
    expect(dialog.getByRole('checkbox', { name: '타워' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: '루프 밴드' })).toBeChecked();
    expect(dialog.getByLabelText('장소 메모')).toHaveValue('주차장 2시간 무료');

    // Save location and verify draft resets for the next new entry
    fireEvent.click(dialog.getByRole('button', { name: '장소 저장' }));
    expect(usePilatesStore.getState().instructorSchedule.locations).toHaveLength(1);
    expect(dialog.getByLabelText('장소 별칭')).toHaveValue('');
    expect(dialog.getByLabelText('장소 메모')).toHaveValue('');
  });

  it('preserves unsaved closed/holiday draft (date, location, reason) across modal close and re-open until saved', () => {
    render(<InstructorScheduleView today="2026-11-04" />);

    // Register one location first so we can select it in the holiday modal
    fireEvent.click(screen.getByRole('button', { name: '장소 관리' }));
    const locDialog = within(screen.getByRole('dialog', { name: '장소 관리' }));
    fireEvent.change(locDialog.getByLabelText('장소 별칭'), {
      target: { value: '본점 스튜디오' },
    });
    fireEvent.click(locDialog.getByRole('button', { name: '장소 저장' }));
    fireEvent.click(locDialog.getAllByRole('button', { name: '닫기' })[0]);

    const savedLocId = usePilatesStore.getState().instructorSchedule.locations[0].id;

    // Open holiday modal and fill draft
    fireEvent.click(screen.getByRole('button', { name: '휴무 등록' }));
    let closedDialog = within(screen.getByRole('dialog', { name: '휴무 등록' }));

    fireEvent.change(closedDialog.getByLabelText('휴무 날짜'), {
      target: { value: '2026-11-15' },
    });
    fireEvent.change(closedDialog.getByLabelText('휴무 장소'), {
      target: { value: savedLocId },
    });
    fireEvent.change(closedDialog.getByLabelText('휴무 메모'), {
      target: { value: '강사 해부학 세미나 참석' },
    });

    // Close without saving
    fireEvent.click(closedDialog.getAllByRole('button', { name: '닫기' })[0]);
    expect(screen.queryByRole('dialog', { name: '휴무 등록' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(0);

    // Re-open holiday modal and verify draft recovery
    fireEvent.click(screen.getByRole('button', { name: '휴무 등록' }));
    closedDialog = within(screen.getByRole('dialog', { name: '휴무 등록' }));

    expect(closedDialog.getByLabelText('휴무 날짜')).toHaveValue('2026-11-15');
    expect(closedDialog.getByLabelText('휴무 장소')).toHaveValue(savedLocId);
    expect(closedDialog.getByLabelText('휴무 메모')).toHaveValue('강사 해부학 세미나 참석');

    // Save holiday and verify saved exception & cleared draft on next open
    fireEvent.click(closedDialog.getByRole('button', { name: '휴무 저장' }));
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '휴무 등록' }));
    closedDialog = within(screen.getByRole('dialog', { name: '휴무 등록' }));
    expect(closedDialog.getByLabelText('휴무 메모')).toHaveValue('');
  });
});

describe('PilatesSettingsPage task-selection step summary and section navigation', () => {
  it('renders the 3-step task summary and navigates focus & active state across install, backup, and cloud sync sections', () => {
    const preset = getSettingsFixturePreset('default-local-studio');
    render(<PilatesSettingsPage snapshot={preset.snapshot} />);

    const stepGuide = screen.getByTestId('settings-task-step-guide');
    const step1Btn = within(stepGuide).getByRole('button', { name: '1 기기·설치 점검' });
    const step2Btn = within(stepGuide).getByRole('button', { name: '2 데이터 백업·복원' });
    const step3Btn = within(stepGuide).getByRole('button', { name: '3 클라우드 동기화(선택)' });

    // Click Step 1: 기기·설치 점검
    fireEvent.click(step1Btn);
    expect(step1Btn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('settings-group-install')).toHaveClass('pf-settings-group--active');
    expect(screen.getByTestId('settings-task-step-summary')).toHaveTextContent(
      /홈 화면 앱 설치와 오프라인/,
    );
    expect(
      within(screen.getByTestId('settings-group-install')).getByRole('heading', { level: 3 }),
    ).toHaveFocus();

    // Click Step 2: 데이터 백업·복원
    fireEvent.click(step2Btn);
    expect(step2Btn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('settings-group-data')).toHaveClass('pf-settings-group--active');
    expect(screen.getByTestId('settings-task-step-summary')).toHaveTextContent(
      /JSON 파일로 백업하거나 복구 전 확인/,
    );
    expect(
      within(screen.getByTestId('settings-group-data')).getByRole('heading', { level: 3 }),
    ).toHaveFocus();

    // Click Step 3: 클라우드 동기화(선택)
    fireEvent.click(step3Btn);
    expect(step3Btn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('settings-group-account')).toHaveClass('pf-settings-group--active');
    expect(screen.getByTestId('settings-task-step-summary')).toHaveTextContent(
      /Google 계정을 연결해/,
    );
    expect(
      within(screen.getByTestId('settings-group-account')).getByRole('heading', { level: 3 }),
    ).toHaveFocus();

    // Keyboard navigation on step buttons
    step3Btn.focus();
    fireEvent.keyDown(step3Btn, { key: 'Home' });
    expect(step1Btn).toHaveFocus();
    expect(step1Btn).toHaveAttribute('aria-current', 'step');

    fireEvent.keyDown(step1Btn, { key: 'ArrowRight' });
    expect(step2Btn).toHaveFocus();
    expect(step2Btn).toHaveAttribute('aria-current', 'step');
  });
});
