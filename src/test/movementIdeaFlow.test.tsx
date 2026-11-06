import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import {
  captureCurrentClassHierarchySnapshot,
  clearIdeaWorkingBuffer,
  getMovementIdeaMetaMap,
  getSavedReusableBlocks,
  isMovementIdeaExercise,
  moveIdeaReusableBlockItem,
  readIdeaWorkingBuffer,
  readMovementIdeaDraft,
  resetMovementIdeaStateForTests,
  saveMovementIdeaToStore,
  saveMovementIdeaWorkingBuffer,
} from '../utils/movementIdeaDraft';

const ACTIVE_OWNER_KEY = `${RECOVERY_STORAGE_KEY}:active-owner`;

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

    const savedExercises = usePilatesStore.getState().exercises.filter(isMovementIdeaExercise);
    expect(savedExercises).toHaveLength(1);
    const created = savedExercises[0]!;
    expect(created.review).toBeUndefined();
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
    fireEvent.click(within(ideaSection).getByRole('button', { name: /다시 열기/ }));

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

    fireEvent.click(within(reopenedDialog).getByRole('button', { name: '예시 자세 스케치 넣기' }));

    // Save the updated notes
    fireEvent.click(within(reopenedDialog).getByRole('button', { name: '수정 저장' }));
    expect(within(reopenedDialog).getByRole('status')).toHaveTextContent(
      /수정 내용을 저장했습니다/,
    );

    const updated = usePilatesStore.getState().exercises.find((item) => item.id === created.id)!;
    expect(updated.review).toBeUndefined();
    const updatedDraft = readMovementIdeaDraft(updated)!;
    expect(updatedDraft.triedByInstructor).toBe(true);
    expect(updatedDraft.subjectiveFeeling).toContain('갈비뼈 옆선이 시원하게 열림');
    expect(updatedDraft.adjustmentNote).toContain('시선은 사선 아래로 낮추기');
    expect(updatedDraft.photoDataUrl).toMatch(/^data:image\/svg\+xml/);

    // 5. Add directly to the current class (even if apparatus differs from draftCriteria)
    fireEvent.click(within(reopenedDialog).getAllByRole('button', { name: '수업에 넣기' })[0]!);

    const stateAfterAdd = usePilatesStore.getState();
    expect(stateAfterAdd.exercises.find((item) => item.id === created.id)?.review).toBeUndefined();
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
      .exercises.filter((item) => item.cues.includes('연속 클릭 중복 방지 테스트 동작 아이디어'));
    expect(matching).toHaveLength(1);
  });

  it('supports progressive variant & version management: Easy/Hard variation notes, revision history rollback, and variant forking without altering original draft', () => {
    render(<App />);
    const quickNav = screen.getByRole('navigation', { name: '핵심 빠른 메뉴' });
    fireEvent.click(within(quickNav).getByRole('button', { name: '새 동작 메모' }));

    const dialog = screen.getByRole('dialog', { name: /새 동작 메모/ });

    // 1. Save v1 with 1-line idea only
    fireEvent.change(within(dialog).getByLabelText('한 줄 아이디어'), {
      target: { value: 'v1 원본 아이디어: 롱박스 위에서 한 다리 뻗으며 골반 안정화' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 바로 저장' }));

    const originalEx = usePilatesStore.getState().exercises.find(isMovementIdeaExercise)!;
    expect(readMovementIdeaDraft(originalEx)?.revision).toBe(1);

    // 2. Update idea and add Easy/Hard variations -> creates new revision(s)
    fireEvent.change(within(dialog).getByLabelText('한 줄 아이디어'), {
      target: { value: 'v2 수정 아이디어: 롱박스 위에서 양팔 앞으로 뻗으며 한 다리 신전' },
    });
    fireEvent.change(within(dialog).getByLabelText('쉬운 변형 메모'), {
      target: { value: '발끝을 바닥에 살짝 터치한 상태로 가동범위 절반만 진행' },
    });
    fireEvent.change(within(dialog).getByLabelText('심화 변형 메모'), {
      target: { value: '정점에서 3초 홀드 후 호흡 2회 유지' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '수정 저장' }));

    const afterUpdateMeta = readMovementIdeaDraft(
      usePilatesStore.getState().exercises.find((item) => item.id === originalEx.id)!,
    )!;
    expect(afterUpdateMeta.revision).toBeGreaterThanOrEqual(2);
    expect(afterUpdateMeta.easyVariation).toContain('가동범위 절반만 진행');
    expect(afterUpdateMeta.hardVariation).toContain('3초 홀드');

    // 3. Non-destructive rollback to v1 from revision history UI
    const revisionBox = within(dialog).getByLabelText('초안 버전 이력');
    expect(revisionBox).toBeInTheDocument();
    fireEvent.click(within(revisionBox).getByRole('button', { name: 'v1 버전으로 복원' }));

    expect(within(dialog).getByLabelText('한 줄 아이디어')).toHaveValue(
      'v1 원본 아이디어: 롱박스 위에서 한 다리 뻗으며 골반 안정화',
    );
    const afterRestoreMeta = readMovementIdeaDraft(
      usePilatesStore.getState().exercises.find((item) => item.id === originalEx.id)!,
    )!;
    expect(afterRestoreMeta.ideaLine).toBe(
      'v1 원본 아이디어: 롱박스 위에서 한 다리 뻗으며 골반 안정화',
    );
    // All previous revisions are preserved non-destructively
    expect(afterRestoreMeta.revisionHistory?.length).toBeGreaterThanOrEqual(3);

    // 4. Fork a new independent variant draft from the current draft
    fireEvent.change(within(dialog).getByLabelText('변형 구분 이름'), {
      target: { value: '초보자 지지면 확장 변형' },
    });
    fireEvent.click(within(dialog).getByTestId('idea-fork-variant'));

    const allIdeaExercises = usePilatesStore.getState().exercises.filter(isMovementIdeaExercise);
    expect(allIdeaExercises).toHaveLength(2);
    const forkedEx = allIdeaExercises.find((item) => item.id !== originalEx.id)!;
    expect(forkedEx.review).toBeUndefined();
    const forkedMeta = readMovementIdeaDraft(forkedEx)!;
    expect(forkedMeta.parentDraftId).toBe(originalEx.id);
    expect(forkedMeta.variantLabelKo).toBe('초보자 지지면 확장 변형');
    expect(forkedMeta.revision).toBe(1);

    // Modifying the forked variant does not alter the original draft
    fireEvent.change(within(dialog).getByLabelText('한 줄 아이디어'), {
      target: { value: '파생 변형 전용 아이디어: 핸드스트랩을 잡고 보조 지지' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '수정 저장' }));

    const untouchedOriginal = usePilatesStore
      .getState()
      .exercises.find((item) => item.id === originalEx.id)!;
    expect(readMovementIdeaDraft(untouchedOriginal)?.ideaLine).toBe(
      'v1 원본 아이디어: 롱박스 위에서 한 다리 뻗으며 골반 안정화',
    );
  });

  it('supports progressive 4-tier hierarchy (동작 -> 재사용 블록 -> 시퀀스 -> 수업), sub-timing summation, order/reps/L-R, block copy isolation, and past class snapshot immutability', () => {
    render(<App />);
    const quickNav = screen.getByRole('navigation', { name: '핵심 빠른 메뉴' });
    fireEvent.click(within(quickNav).getByRole('button', { name: '새 동작 메모' }));

    const dialog = screen.getByRole('dialog', { name: /새 동작 메모/ });

    // 1. Progressive UX check: hierarchy section is collapsed by default so beginners only see 1-line idea
    const timeBreakdownRegion = within(dialog).getByTestId('idea-time-breakdown');
    const hierarchyDetails = timeBreakdownRegion.closest('details');
    expect(hierarchyDetails).not.toHaveAttribute('open');

    // 2. Configure movement #1 with sub-timing, repetitions, sets, and left-then-right sideMode
    fireEvent.change(within(dialog).getByLabelText('한 줄 아이디어'), {
      target: { value: '사이드 라잉 한 다리 서클 감각 익히기' },
    });
    fireEvent.change(within(dialog).getByLabelText('임시 이름'), {
      target: { value: '사이드 서클 초안' },
    });
    fireEvent.change(within(dialog).getByLabelText('예상 시간 (분)'), {
      target: { value: '4' },
    });
    fireEvent.change(within(dialog).getByLabelText('설명 시간 (초)'), {
      target: { value: '25' },
    });
    fireEvent.change(within(dialog).getByLabelText('전환 시간 (초)'), {
      target: { value: '15' },
    });
    fireEvent.change(within(dialog).getByLabelText('반복 횟수'), {
      target: { value: '8' },
    });
    fireEvent.change(within(dialog).getByLabelText('세트 수'), {
      target: { value: '2' },
    });
    fireEvent.change(within(dialog).getByLabelText('좌우 수행 방식'), {
      target: { value: 'left-then-right' },
    });

    // Verify live sub-timing summation: 4min (240s) = 200s movement + 25s explanation + 15s transition
    expect(timeBreakdownRegion).toHaveTextContent('총 240초 (4분)');
    expect(timeBreakdownRegion).toHaveTextContent('순수 동작 200초 + 설명 25초 + 전환 15초');

    // 3. Create a ReusableBlock from movement #1
    fireEvent.change(within(dialog).getByLabelText('재사용 블록 이름'), {
      target: { value: '고관절·코어 연결 블록' },
    });
    fireEvent.click(within(dialog).getByTestId('create-reusable-block-btn'));

    expect(getSavedReusableBlocks()).toHaveLength(1);
    const createdBlock = getSavedReusableBlocks()[0]!;
    expect(createdBlock.title).toBe('고관절·코어 연결 블록');
    expect(createdBlock.version).toBe(1);

    // 4. Create movement #2 and append it to the same ReusableBlock
    fireEvent.click(within(dialog).getByRole('button', { name: /새 초안 쓰기/ }));
    fireEvent.change(within(dialog).getByLabelText('한 줄 아이디어'), {
      target: { value: '브릿징 정점에서 골반 좌우 틸트 컨트롤' },
    });
    fireEvent.change(within(dialog).getByLabelText('임시 이름'), {
      target: { value: '브릿징 틸트 초안' },
    });
    fireEvent.change(within(dialog).getByLabelText('예상 시간 (분)'), {
      target: { value: '3' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: '고관절·코어 연결 블록 블록에 현재 동작 추가' }),
    );

    const updatedBlock = getSavedReusableBlocks()[0]!;
    expect(updatedBlock.version).toBe(2);
    expect(updatedBlock.items).toHaveLength(2);

    // Verify block sub-timing summation in UI: 4min + 3min = 7min (420s)
    const blockList = within(dialog).getByTestId('saved-reusable-blocks');
    expect(blockList).toHaveTextContent('총 7분 (420초)');

    // 5. Copy the ReusableBlock into the current class sequence (Sequence tier)
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: '고관절·코어 연결 블록 수업 시퀀스에 블록 복사해 넣기',
      }),
    );

    const stepsAfterBlockInsert = usePilatesStore.getState().activeSteps;
    expect(stepsAfterBlockInsert).toHaveLength(2);
    expect(stepsAfterBlockInsert[0]?.sourceBlockId).toBe(updatedBlock.id);
    expect(stepsAfterBlockInsert[0]?.sourceBlockVersion).toBe(2);
    expect(stepsAfterBlockInsert[0]?.blockInstanceId).toBeTruthy();
    expect(stepsAfterBlockInsert[0]?.sideMode).toBe('left-then-right');
    expect(stepsAfterBlockInsert[0]?.repetitions).toBe(8);
    expect(stepsAfterBlockInsert[0]?.sets).toBe(2);

    // 6. Capture an immutable ClassSequenceSnapshot (Class tier — past class record)
    const pastClassSnapshot = captureCurrentClassHierarchySnapshot('오전 10시 고관절 집중 수업');
    expect(Object.isFrozen(pastClassSnapshot)).toBe(true);
    expect(pastClassSnapshot.steps).toHaveLength(2);
    expect(pastClassSnapshot.timeBreakdown.totalSec).toBe(420);
    const firstStepExerciseId = pastClassSnapshot.steps[0]!.exerciseId;
    const originalSnapshotName = pastClassSnapshot.exerciseSnapshots[firstStepExerciseId]!.nameKo;

    // 7. Mutate the ReusableBlock template order AND mutate the source movement draft afterwards
    act(() => {
      moveIdeaReusableBlockItem(updatedBlock.id, 1, 'up');
      saveMovementIdeaToStore({
        existingExerciseId: firstStepExerciseId,
        ideaLine: '완전히 바뀐 이후 아이디어 텍스트',
        workingTitle: '나중에 바뀐 동작 이름',
        durationMin: 10,
      });
    });

    // Verify block template is now v3 with swapped order
    const blockAfterReorder = getSavedReusableBlocks()[0]!;
    expect(blockAfterReorder.version).toBe(3);
    expect(blockAfterReorder.items[0]?.exerciseId).not.toBe(firstStepExerciseId);

    // Verify sequence steps already inserted in activeSteps were NOT reordered by block template edit
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(firstStepExerciseId);

    // Verify past class snapshot is 100% untouched (immutability guarantee)
    expect(pastClassSnapshot.steps[0]?.exerciseId).toBe(firstStepExerciseId);
    expect(pastClassSnapshot.steps[0]?.durationMin).toBe(4);
    expect(pastClassSnapshot.exerciseSnapshots[firstStepExerciseId]?.nameKo).toBe(
      originalSnapshotName,
    );
    expect(pastClassSnapshot.exerciseSnapshots[firstStepExerciseId]?.ideaLineSnapshot).toBe(
      '사이드 라잉 한 다리 서클 감각 익히기',
    );
  });

  it('isolates movement idea metadata and working buffers per account owner and infers apparatus from 1-line text', () => {
    usePilatesStore.setState({
      activeApparatus: 'mat',
      ownedEquipment: ['mat'],
      draftCriteria: null,
    });

    // Account A saves a 1-line idea mentioning 체어 (chair) without selecting apparatus explicitly
    localStorage.setItem(ACTIVE_OWNER_KEY, 'user-alpha');
    saveMovementIdeaWorkingBuffer({ ideaLine: '알파 강사의 작성 중 버퍼' });
    expect(readIdeaWorkingBuffer().ideaLine).toBe('알파 강사의 작성 중 버퍼');

    const savedAlpha = saveMovementIdeaToStore({
      ideaLine: '체어 페달 프레스 중 흉곽 회전 큐잉',
      subjectiveFeeling: '알파 강사 전용 느낌 기록',
    });
    expect(savedAlpha.ok).toBe(true);
    expect(savedAlpha.exercise?.apparatus).toBe('chair');
    expect(Object.keys(getMovementIdeaMetaMap())).toHaveLength(1);

    // Switch to Account B ('user-beta'): Account A's metadata and working buffer must not leak
    localStorage.setItem(ACTIVE_OWNER_KEY, 'user-beta');
    expect(readIdeaWorkingBuffer().ideaLine).toBe('');
    expect(Object.keys(getMovementIdeaMetaMap())).toHaveLength(0);

    saveMovementIdeaWorkingBuffer({ ideaLine: '베타 강사의 임시 메모' });
    const savedBeta = saveMovementIdeaToStore({
      ideaLine: '캐딜락 롤다운 바 분절 감각 체크',
    });
    expect(savedBeta.ok).toBe(true);
    expect(savedBeta.exercise?.apparatus).toBe('cadillac');
    expect(Object.keys(getMovementIdeaMetaMap())).toHaveLength(1);
    expect(getMovementIdeaMetaMap()[savedAlpha.exercise!.id]).toBeUndefined();

    // Switch back to Account A: Account A's metadata is intact and isolated from Account B
    localStorage.setItem(ACTIVE_OWNER_KEY, 'user-alpha');
    expect(getMovementIdeaMetaMap()[savedAlpha.exercise!.id]?.subjectiveFeeling).toBe(
      '알파 강사 전용 느낌 기록',
    );
    expect(getMovementIdeaMetaMap()[savedBeta.exercise!.id]).toBeUndefined();
  });
});
