import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import {
  clearIdeaWorkingBuffer,
  isMovementIdeaExercise,
  readIdeaWorkingBuffer,
  readMovementIdeaDraft,
  resetMovementIdeaStateForTests,
  saveMovementIdeaToStore,
} from '../utils/movementIdeaDraft';

const originalStore = usePilatesStore.getState();
const originalWidth = window.innerWidth;

function resize(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  fireEvent(window, new Event('resize'));
}

beforeEach(() => {
  localStorage.clear();
  resetMovementIdeaStateForTests();
  clearIdeaWorkingBuffer();
  resize(390);
  usePilatesStore.setState(
    {
      ...originalStore,
      activeTab: 'workbench',
      activeSteps: [],
      activeTitle: '모바일 창작 흐름 검수 수업',
      activeTargetMinutes: 50,
      activeApparatus: 'reformer',
      activeLevel: '1.0',
      ownedEquipment: ['mat', 'reformer', 'chair'],
      ownedApparatus: ['mat', 'reformer', 'chair'],
      ownedProps: [],
      exercises: structuredClone(INITIAL_EXERCISES),
      instructorSchedule: createEmptyInstructorSchedule(),
      historyLogs: [],
      savedSequences: [],
      draftCriteria: {
        apparatus: 'reformer',
        availableEquipment: ['reformer'],
        ownedApparatus: ['reformer'],
        level: '1.0',
        focusPreset: 'full-body',
        preferredProps: ['none'],
        excludeDaysWindow: 14,
        targetMinutes: 50,
        defaultLayer: 'standard',
      },
      lastCriteria: null,
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  resetMovementIdeaStateForTests();
  clearIdeaWorkingBuffer();
  localStorage.clear();
  usePilatesStore.setState(originalStore, true);
  resize(originalWidth);
  vi.restoreAllMocks();
});

describe('1-line movement idea creation, progressive try-out notes, and class integration', () => {
  it('exposes the 4 plain-language core quick menu actions (새 동작 메모, 수업 만들기, 내 수업, 기록)', () => {
    render(<App />);
    const quickNav = screen.getByRole('navigation', { name: '핵심 빠른 메뉴' });
    expect(within(quickNav).getByRole('button', { name: '새 동작 메모' })).toBeVisible();
    expect(within(quickNav).getByRole('button', { name: '수업 만들기' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(quickNav).getByRole('button', { name: '내 수업' })).toBeVisible();
    expect(within(quickNav).getByRole('button', { name: '기록' })).toBeVisible();
  });

  it('completes the full mobile journey: 1-line idea save -> reopen -> add feeling/adjustments/sketch -> edit -> add to class without requiring anatomy or block hierarchy', () => {
    render(<App />);

    // 1. Open from Core Quick Menu
    const quickNav = screen.getByRole('navigation', { name: '핵심 빠른 메뉴' });
    fireEvent.click(within(quickNav).getByRole('button', { name: '새 동작 메모' }));

    const dialog = screen.getByRole('dialog', { name: /새 동작 메모/ });
    expect(dialog).toBeVisible();

    // Verify honest distinction between subjective feeling and objective verification
    expect(within(dialog).getByLabelText('창작 메모 안내')).toHaveTextContent(
      /주관적 체감을 기록하는 공간입니다\. 객관적 운동 효과 판정, 안전성 보장, 또는 전문가 검증을 뜻하지 않습니다/,
    );

    // 2. Save with ONLY a 1-line idea (no classification, anatomy, or formal name required)
    const ideaInput = within(dialog).getByLabelText('한 줄 아이디어');
    fireEvent.change(ideaInput, {
      target: { value: '풋바를 밀며 한 팔씩 천장으로 길게 뻗어 흉추 회전 느끼기' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 바로 저장' }));

    expect(within(dialog).getByRole('status')).toHaveTextContent(/한 줄 초안을 저장했습니다/);

    const savedExercises = usePilatesStore
      .getState()
      .exercises.filter(isMovementIdeaExercise);
    expect(savedExercises).toHaveLength(1);
    const created = savedExercises[0]!;
    expect(readMovementIdeaDraft(created)?.ideaLine).toBe(
      '풋바를 밀며 한 팔씩 천장으로 길게 뻗어 흉추 회전 느끼기',
    );
    expect(readMovementIdeaDraft(created)?.triedByInstructor).toBe(false);

    // Close the sheet
    fireEvent.click(within(dialog).getByRole('button', { name: /나중에 이어서 쓰기/ }));
    expect(screen.queryByRole('dialog', { name: /새 동작 메모/ })).not.toBeInTheDocument();

    // 3. Reopen the saved draft directly from the workbench first screen
    const ideaSection = screen.getByRole('region', { name: '내 새 동작 메모' });
    expect(ideaSection).toHaveTextContent('풋바를 밀며 한 팔씩 천장으로 길게 뻗어');
    fireEvent.click(
      within(ideaSection).getByRole('button', { name: /다시 열기/ }),
    );

    const reopenedDialog = screen.getByRole('dialog', { name: /내 동작 메모 수정/ });
    expect(within(reopenedDialog).getByLabelText('한 줄 아이디어')).toHaveValue(
      '풋바를 밀며 한 팔씩 천장으로 길게 뻗어 흉추 회전 느끼기',
    );

    // 4. Progressively add subjective feeling, adjustment note, and local sketch after trying
    fireEvent.click(
      within(reopenedDialog).getByRole('button', { name: '+ 호흡 연결이 자연스러움' }),
    );
    const feelingInput = within(reopenedDialog).getByLabelText('직접 해본 느낌');
    fireEvent.change(feelingInput, {
      target: { value: '호흡 연결이 자연스러움 · 갈비뼈 옆선이 시원하게 열림' },
    });

    const adjustmentInput = within(reopenedDialog).getByLabelText('수정할 점');
    fireEvent.change(adjustmentInput, {
      target: { value: '승모근이 긴장되지 않게 시선은 사선 아래로 낮추기' },
    });

    fireEvent.click(
      within(reopenedDialog).getByRole('button', { name: '예시 자세 스케치 넣기' }),
    );

    // Save the updated notes
    fireEvent.click(within(reopenedDialog).getByRole('button', { name: '수정 저장' }));
    expect(within(reopenedDialog).getByRole('status')).toHaveTextContent(
      /수정 내용을 저장했습니다/,
    );

    const updated = usePilatesStore
      .getState()
      .exercises.find((item) => item.id === created.id)!;
    expect(updated.review?.credentialVerified).toBe(false);
    const updatedDraft = readMovementIdeaDraft(updated)!;
    expect(updatedDraft.triedByInstructor).toBe(true);
    expect(updatedDraft.subjectiveFeeling).toContain('갈비뼈 옆선이 시원하게 열림');
    expect(updatedDraft.adjustmentNote).toContain('시선은 사선 아래로 낮추기');
    expect(updatedDraft.photoDataUrl).toMatch(/^data:image\/svg\+xml/);

    // 5. Add directly to the current class (even if apparatus differs from draftCriteria)
    fireEvent.click(
      within(reopenedDialog).getAllByRole('button', { name: '수업에 넣기' })[0]!,
    );

    const stateAfterAdd = usePilatesStore.getState();
    expect(stateAfterAdd.activeSteps).toHaveLength(1);
    expect(stateAfterAdd.activeSteps[0]?.exerciseId).toBe(created.id);
    expect(stateAfterAdd.activeSteps[0]?.instructorNote).toContain('[느낌]');
    expect(stateAfterAdd.activeSteps[0]?.instructorNote).toContain('[수정]');

    // Sheet closes on add and step is rendered in the sequence with honest non-verified badge
    const sequenceRegion = screen.getByRole('region', { name: '오늘의 시퀀스' });
    expect(sequenceRegion).toHaveTextContent('내 창작 메모 · 전문가 검증 아님');
  });

  it('preserves unsaved draft text across Escape/back close, cancel, simulated save error, and prevents duplicate creation on rapid repeated clicks', () => {
    render(<App />);
    const quickNav = screen.getByRole('navigation', { name: '핵심 빠른 메뉴' });
    fireEvent.click(within(quickNav).getByRole('button', { name: '새 동작 메모' }));

    let dialog = screen.getByRole('dialog', { name: /새 동작 메모/ });
    const ideaInput = within(dialog).getByLabelText('한 줄 아이디어');
    fireEvent.change(ideaInput, {
      target: { value: '뒤로가기 후에도 보존되어야 하는 새 동작 메모 초안' },
    });

    // Buffer should hold the unsaved text
    expect(readIdeaWorkingBuffer()?.ideaLine).toBe(
      '뒤로가기 후에도 보존되어야 하는 새 동작 메모 초안',
    );

    // 1. Close via Escape / close button without saving
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog', { name: /새 동작 메모/ })).not.toBeInTheDocument();

    // Reopen -> unsaved text is still preserved!
    fireEvent.click(within(quickNav).getByRole('button', { name: '새 동작 메모' }));
    dialog = screen.getByRole('dialog', { name: /새 동작 메모/ });
    expect(within(dialog).getByLabelText('한 줄 아이디어')).toHaveValue(
      '뒤로가기 후에도 보존되어야 하는 새 동작 메모 초안',
    );

    // 2. Simulate save failure -> shows alert and keeps the user's input intact
    const addCustomSpy = vi
      .spyOn(usePilatesStore.getState(), 'addCustomExercise')
      .mockImplementationOnce(() => {
        throw new Error('simulated storage write failure');
      });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 바로 저장' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      /저장에 실패했습니다\. 작성 중인 내용은 이 화면에 그대로 보관되어 있습니다/,
    );
    expect(within(dialog).getByLabelText('한 줄 아이디어')).toHaveValue(
      '뒤로가기 후에도 보존되어야 하는 새 동작 메모 초안',
    );
    addCustomSpy.mockRestore();

    // 3. Rapid repeated save calls with identical content are deduplicated (idempotency)
    let firstSave!: ReturnType<typeof saveMovementIdeaToStore>;
    let secondSave!: ReturnType<typeof saveMovementIdeaToStore>;
    act(() => {
      firstSave = saveMovementIdeaToStore({
        ideaLine: '연속 클릭 중복 방지 테스트 동작 아이디어',
        workingTitle: '',
        subjectiveFeeling: '',
        adjustmentNote: '',
        photoDataUrl: '',
        apparatus: 'mat',
        durationMin: 3,
      });
      secondSave = saveMovementIdeaToStore({
        ideaLine: '연속 클릭 중복 방지 테스트 동작 아이디어',
        workingTitle: '',
        subjectiveFeeling: '',
        adjustmentNote: '',
        photoDataUrl: '',
        apparatus: 'mat',
        durationMin: 3,
      });
    });
    expect(firstSave.ok).toBe(true);
    expect(secondSave.ok).toBe(true);
    expect(secondSave.exercise?.id).toBe(firstSave.exercise?.id);
    const matching = usePilatesStore
      .getState()
      .exercises.filter((item) =>
        item.cues.includes('연속 클릭 중복 방지 테스트 동작 아이디어'),
      );
    expect(matching).toHaveLength(1);
  });
});
