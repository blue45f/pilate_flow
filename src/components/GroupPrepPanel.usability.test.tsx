import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, ClassGroupProfile, ClassHistoryLog, SequenceStep } from '../types/pilates';
import { GroupPrepPanel } from './GroupPrepPanel';

const originalStore = usePilatesStore.getState();

const groupAlpha: ClassGroupProfile = {
  id: 'synth-group-alpha',
  name: '합성 별칭 A반',
  type: 'group',
  defaultLevel: '1.0',
  scheduleLabel: '화·목 오전',
  notes: '초기 호흡 리듬 안내 유지',
  planningPreferences: {
    ageBand: '40-59',
    experience: 'mixed',
    mixedLevelNotes: '동일 블록 내 기본·쉬운 옵션 병행',
    conditions: {
      apparatus: 'reformer',
      availableEquipment: ['reformer'],
      ownedApparatus: ['reformer'],
      level: '1.5',
      focusPreset: 'core-sculpt',
      targetMinutes: 50,
      restMinutes: 5,
      defaultLayer: 'standard',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
    },
  },
};

const groupBeta: ClassGroupProfile = {
  id: 'synth-group-beta',
  name: '합성 별칭 B반',
  type: 'group',
  defaultLevel: '2.0',
  scheduleLabel: '수·금 저녁',
  notes: '전환 설명 간결하게',
};

const lockedStepsFixture: SequenceStep[] = [
  {
    stepId: 'locked-step-1',
    order: 1,
    exerciseId: INITIAL_EXERCISES[0].id,
    blockCategory: INITIAL_EXERCISES[0].blockCategory,
    selectedLayer: 'standard',
    durationMin: 4,
    locked: true,
  },
];

const initialDraftCriteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.5',
  focusPreset: 'full-body',
  targetMinutes: 60,
  restMinutes: 0,
  defaultLayer: 'standard',
  preferredProps: ['none'],
  excludeDaysWindow: 14,
  targetGroupId: groupBeta.id,
};

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  usePilatesStore.setState({
    ...originalStore,
    ownedEquipment: ['mat', 'reformer', 'chair'],
    ownedApparatus: ['mat', 'reformer', 'chair'],
    ownedProps: [],
    classGroups: [structuredClone(groupAlpha), structuredClone(groupBeta)],
    historyLogs: [...INITIAL_HISTORY_LOGS],
    activeSteps: structuredClone(lockedStepsFixture),
    activeTargetGroupId: groupBeta.id,
    draftCriteria: structuredClone(initialDraftCriteria),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalStore, true);
});

describe('GroupPrepPanel condition clarity and edit recovery usability', () => {
  it('explains target group and exact scope of recent, default-level, and saved-condition actions while excluding sample logs and preserving steps/locks/history', () => {
    const olderRealLog: ClassHistoryLog = {
      ...INITIAL_HISTORY_LOGS[0],
      id: 'synth-log-older',
      groupId: groupAlpha.id,
      groupName: groupAlpha.name,
      sequenceTitle: '이전 실제 수업',
      taughtAt: '2026-11-06T12:00:00.000Z',
      instructorReflection: '이전 회고 메모',
      criteriaSnapshot: {
        ...initialDraftCriteria,
        targetGroupId: groupAlpha.id,
        targetMinutes: 30,
        level: '1.0',
      },
    };
    const newerCalendarLog: ClassHistoryLog = {
      ...INITIAL_HISTORY_LOGS[0],
      id: 'synth-log-newer',
      groupId: groupAlpha.id,
      groupName: groupAlpha.name,
      sequenceTitle: '최신 날짜 수업',
      // Earlier UTC timestamp, but newer explicit taughtDate via programSnapshot
      taughtAt: '2026-11-05T22:00:00.000Z',
      instructorReflection: '최신 회고 메모',
      criteriaSnapshot: {
        ...initialDraftCriteria,
        apparatus: 'chair',
        availableEquipment: ['chair'],
        ownedApparatus: ['chair'],
        targetGroupId: groupAlpha.id,
        targetMinutes: 45,
        level: '2.0',
      },
      ...({
        programSnapshot: {
          taughtAt: '2026-11-05T22:00:00.000Z',
          dateOnly: true,
          taughtDate: '2026-11-08',
        },
      } as Record<string, unknown>),
    };
    // Sample log coerced to same groupId must still be excluded
    const sampleLogWithSameGroup: ClassHistoryLog = {
      ...INITIAL_HISTORY_LOGS[0],
      groupId: groupAlpha.id,
      taughtAt: '2026-11-10T10:00:00.000Z',
      criteriaSnapshot: {
        ...initialDraftCriteria,
        targetGroupId: groupAlpha.id,
        targetMinutes: 90,
      },
    };

    const logsBefore = [sampleLogWithSameGroup, olderRealLog, newerCalendarLog];
    act(() => {
      usePilatesStore.setState({ historyLogs: logsBefore });
    });

    render(<GroupPrepPanel groupId={groupAlpha.id} />);

    // Clarifies pending target switch before applying conditions
    expect(screen.getByText(`조건 적용 시 대상 · ${groupAlpha.name}`)).toBeInTheDocument();
    expect(screen.getByText('최신 날짜 수업')).toBeInTheDocument();

    // Recent condition button describes full-criteria replacement from newest actual calendar date (11월 8일, 45분 · 체어 · 최대 Lv 2.0)
    const recentBtn = screen.getByRole('button', { name: /최근 수업 조건 가져오기/ });
    const recentHintId = recentBtn.getAttribute('aria-describedby')!;
    expect(document.getElementById(recentHintId)?.textContent).toContain('11월 8일');
    expect(document.getElementById(recentHintId)?.textContent).toContain(
      '45분 · 체어 · 최대 Lv 2.0',
    );

    // Default level button clarifies that time/equipment stay and only max level changes
    const levelBtn = screen.getByRole('button', { name: '기본 난이도 적용' });
    const levelHintId = levelBtn.getAttribute('aria-describedby')!;
    expect(document.getElementById(levelHintId)?.textContent).toContain(
      '시간·기구 유지 · 최대 난이도만 Lv 1.0(입문·기초)로 변경',
    );

    const stepsRefBefore = usePilatesStore.getState().activeSteps;

    // 1) Apply default level -> only level & targetGroupId change; steps/locks/history untouched
    fireEvent.click(levelBtn);
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      targetMinutes: 60,
      apparatus: 'mat',
      level: '1.0',
      targetGroupId: groupAlpha.id,
    });
    expect(screen.getByText(`현재 조건 대상 · ${groupAlpha.name}`)).toBeInTheDocument();

    // 2) Apply group's saved conditions -> 50분 (휴식 5분) · 리포머 · 최대 Lv 1.5
    fireEvent.click(screen.getByText('반별 저장 조건·대상 메모'));
    const applySavedBtn = screen.getByRole('button', { name: '이 반의 저장 조건 불러오기' });
    const savedHintId = applySavedBtn.getAttribute('aria-describedby')!;
    expect(document.getElementById(savedHintId)?.textContent).toContain(
      '50분 (휴식 5분) · 리포머 · 최대 Lv 1.5',
    );
    fireEvent.click(applySavedBtn);
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      targetMinutes: 50,
      restMinutes: 5,
      apparatus: 'reformer',
      level: '1.5',
      targetGroupId: groupAlpha.id,
    });

    // 3) Reuse recent session criteria -> 45분 · chair · Lv 2.0 (excludes sample 90분 and older 30분)
    fireEvent.click(recentBtn);
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      targetMinutes: 45,
      apparatus: 'chair',
      level: '2.0',
      targetGroupId: groupAlpha.id,
    });
    expect(usePilatesStore.getState().activeSteps).toBe(stepsRefBefore);
    expect(usePilatesStore.getState().activeSteps[0].locked).toBe(true);
    expect(usePilatesStore.getState().historyLogs).toEqual(logsBefore);
  });

  it('closes clean editor immediately on Cancel, but guards unsaved edits against Escape, close button, and Cancel until explicitly discarded', () => {
    render(<GroupPrepPanel groupId={groupAlpha.id} />);

    // Clean open -> Cancel closes in one step without confirmation
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    expect(screen.getByRole('dialog', { name: '대상 정보 편집' })).toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog', { name: '대상 정보 편집' })).not.toBeInTheDocument();

    // Reopen and edit preparation notes -> Escape (native cancel) & Cancel button must NOT lose input
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    const dialogEl = screen.getByRole('dialog', { name: '대상 정보 편집' });
    const dialog = within(dialogEl);

    fireEvent.change(dialog.getByLabelText('수업 준비 메모'), {
      target: { value: '다음 주 풋워크 스프링 설명 보강' },
    });

    const escapeCancelEvent = new Event('cancel', { cancelable: true });
    fireEvent(dialogEl, escapeCancelEvent);
    expect(escapeCancelEvent.defaultPrevented).toBe(true);
    expect(dialogEl).toHaveAttribute('open');
    expect(
      dialog.getByText('저장하지 않은 대상 정보 변경사항이 있습니다.'),
    ).toBeInTheDocument();

    // Choosing '계속 편집' hides guard and keeps typed text intact
    fireEvent.click(dialog.getByRole('button', { name: '계속 편집' }));
    expect(
      dialog.queryByText('저장하지 않은 대상 정보 변경사항이 있습니다.'),
    ).not.toBeInTheDocument();
    expect(dialog.getByLabelText('수업 준비 메모')).toHaveValue(
      '다음 주 풋워크 스프링 설명 보강',
    );

    // Clicking '취소' while dirty also triggers the guard; '변경 버리고 닫기' discards without mutating store
    fireEvent.click(dialog.getByRole('button', { name: '취소' }));
    fireEvent.click(dialog.getByRole('button', { name: '변경 버리고 닫기' }));

    expect(screen.queryByRole('dialog', { name: '대상 정보 편집' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().classGroups[0].notes).toBe('초기 호흡 리듬 안내 유지');
  });

  it('isolates feedback and preserves unsaved profile edits in memory across parent groupId switches without automatic store writes', () => {
    const { rerender } = render(<GroupPrepPanel groupId={groupAlpha.id} />);

    // Trigger feedback on Alpha
    fireEvent.click(screen.getByRole('button', { name: '기본 난이도 적용' }));
    expect(screen.getByRole('status')).toHaveTextContent(groupAlpha.name);

    // Open editor on Alpha and make unsaved edits
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    const alphaDialog = within(screen.getByRole('dialog', { name: '대상 정보 편집' }));
    fireEvent.change(alphaDialog.getByLabelText('대상 별칭'), {
      target: { value: '합성 별칭 A반 (오전)' },
    });
    fireEvent.change(alphaDialog.getByLabelText('혼합 수준 준비 메모 · 선택'), {
      target: { value: '신규 합류 인원 기초 호흡 안내 추가' },
    });

    // Parent switches groupId to Beta -> Alpha modal closes, Alpha feedback does not leak, store stays unchanged
    rerender(<GroupPrepPanel groupId={groupBeta.id} />);
    expect(screen.getByRole('heading', { name: groupBeta.name })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '대상 정보 편집' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().classGroups[0].name).toBe('합성 별칭 A반');

    // Parent switches back to Alpha -> inline recovery banner allows resuming and explicitly saving
    rerender(<GroupPrepPanel groupId={groupAlpha.id} />);
    expect(
      screen.getByText(/저장하지 않은 ‘합성 별칭 A반’ 정보 편집 초안이 남아 있습니다/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이어서 편집' }));
    const resumedDialog = within(screen.getByRole('dialog', { name: '대상 정보 편집' }));
    expect(resumedDialog.getByLabelText('대상 별칭')).toHaveValue('합성 별칭 A반 (오전)');
    expect(resumedDialog.getByLabelText('혼합 수준 준비 메모 · 선택')).toHaveValue(
      '신규 합류 인원 기초 호흡 안내 추가',
    );

    // Explicit save commits changes while preserving Alpha's saved planning conditions and keeping age non-prescriptive
    fireEvent.change(resumedDialog.getByLabelText('반의 넓은 연령대 · 선택'), {
      target: { value: '60-plus' },
    });
    fireEvent.click(resumedDialog.getByRole('button', { name: '대상 정보 저장' }));

    const updatedAlpha = usePilatesStore.getState().classGroups[0];
    expect(updatedAlpha.name).toBe('합성 별칭 A반 (오전)');
    expect(updatedAlpha.defaultLevel).toBe('1.0');
    expect(updatedAlpha.planningPreferences).toMatchObject({
      ageBand: '60-plus',
      mixedLevelNotes: '신규 합류 인원 기초 호흡 안내 추가',
      conditions: { targetMinutes: 50, restMinutes: 5, apparatus: 'reformer' },
    });
    expect(
      screen.queryByText(/저장하지 않은 .* 정보 편집 초안이 남아 있습니다/),
    ).not.toBeInTheDocument();
  });
});
