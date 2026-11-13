import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SequenceWorkbench } from '../../src/components/SequenceWorkbench';
import { usePilatesStore } from '../../src/store/usePilatesStore';
import {
  SYNTHETIC_ROUND5_INITIAL_STEPS,
  SYNTHETIC_ROUND5_REORDERED_STEPS,
  SYNTHETIC_ROUND5_SAVED_SEQUENCE,
} from './fixtures/firstUseRound5Fixtures';

describe('Round 5 First-Use 6-Step Journey Audit (첫 진입 → 기구 선택 → 동작 2개 추가 → 순서 변경 → 저장 → 재방문 이어하기)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    usePilatesStore.setState({
      activeTab: 'workbench',
      activeSequenceId: null,
      activeTitle: '첫 수업 시퀀스 초안',
      activeSubtitle: '',
      activeTargetMinutes: 50,
      activeLevel: '1.0',
      activeApparatus: 'mat',
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
      undoStack: [],
      draftCriteria: null,
      lastCriteria: null,
      exerciseBrowseScope: 'all',
      ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
      generationError: null,
      saveFeedback: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('R5-AUDIT-01: Stage 1 (첫 진입) & Stage 2 (기구 선택) — keeps extra tools closed and carries equipment selection into the direct movement picker without generating a class', () => {
    const { container } = render(<SequenceWorkbench />);

    // Empty home keeps optional tools closed and the manual-add action visible.
    const openDetails = Array.from(container.querySelectorAll('details')).filter((d) => d.open);
    expect(openDetails.length).toBe(0);

    const pickMovementBtn = screen.getByTestId('wizard-fast-step2-btn');
    expect(pickMovementBtn).toBeVisible();
    expect(pickMovementBtn).toHaveAccessibleName('동작 추가');

    // Additional condition shortcuts remain available inside optional tools.
    const welcomeSummaryBtn = container.querySelector<HTMLButtonElement>('.workbench-welcome-summary');
    const toolbarChipBtns = container.querySelectorAll<HTMLButtonElement>('.v2-condition-chips button');
    expect(welcomeSummaryBtn).not.toBeNull();
    expect(toolbarChipBtns.length).toBe(4);
    toolbarChipBtns.forEach((button) => expect(button).not.toBeVisible());

    // Stage 2: Open 수업 조건 modal and select 리포머 (Reformer) only
    fireEvent.click(welcomeSummaryBtn!);
    const dialog = Array.from(container.querySelectorAll<HTMLDialogElement>('dialog')).find((d) =>
      d.textContent?.includes('이번 수업에 사용할 기구'),
    );
    expect(dialog).toBeDefined();

    const reformerCheckbox = within(dialog!)
      .getByText(/리포머/)
      .closest('label')
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const matCheckbox = within(dialog!)
      .getByText(/매트/)
      .closest('label')
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(reformerCheckbox).toBeTruthy();
    expect(matCheckbox).toBeTruthy();

    if (reformerCheckbox && !reformerCheckbox.checked) fireEvent.click(reformerCheckbox);
    if (matCheckbox && matCheckbox.checked) fireEvent.click(matCheckbox);
    expect(reformerCheckbox?.checked).toBe(true);
    expect(matCheckbox?.checked).toBe(false);

    // Closing conditions returns to the visible manual path; choosing equipment
    // and opening the picker must not generate, save, or record a class.
    fireEvent.click(dialog!.querySelector<HTMLButtonElement>('.v2-conditions-actions button')!);
    expect(dialog).not.toHaveAttribute('open');
    expect(pickMovementBtn).toBeVisible();
    fireEvent.click(pickMovementBtn);
    const pickerPage = screen.getByTestId('wizard-step2-page');
    expect(pickerPage).toBeVisible();
    expect(within(pickerPage).getByRole('region', { name: '이번 수업 기구' })).toHaveTextContent('리포머');
    expect(usePilatesStore.getState().draftCriteria?.availableEquipment).toEqual(['reformer']);
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    expect(usePilatesStore.getState().savedSequences).toEqual([]);
    expect(usePilatesStore.getState().historyLogs).toEqual([]);
  });

  it('R5-AUDIT-02: Stage 3 (동작 2개 추가) — guards class equipment in broad search and preserves both movements when returning through either finder action', () => {
    const { container } = render(<SequenceWorkbench />);

    // Select Reformer in conditions, close, and open Finder
    fireEvent.click(container.querySelector<HTMLButtonElement>('.workbench-welcome-summary')!);
    const condDialog = Array.from(container.querySelectorAll<HTMLDialogElement>('dialog')).find((d) =>
      d.textContent?.includes('이번 수업에 사용할 기구'),
    )!;
    const reformerCheckbox = within(condDialog)
      .getByText(/리포머/)
      .closest('label')
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const matCheckbox = within(condDialog)
      .getByText(/매트/)
      .closest('label')
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(reformerCheckbox).toBeTruthy();
    expect(matCheckbox).toBeTruthy();
    if (reformerCheckbox && !reformerCheckbox.checked) fireEvent.click(reformerCheckbox);
    if (matCheckbox && matCheckbox.checked) fireEvent.click(matCheckbox);
    fireEvent.click(condDialog.querySelector<HTMLButtonElement>('.v2-conditions-actions button')!);

    fireEvent.click(screen.getByTestId('wizard-fast-step2-btn'));
    const pickerPage = screen.getByTestId('wizard-step2-page');
    expect(pickerPage).toBeVisible();
    const picker = within(pickerPage);
    const narrowBtn = picker.getByRole('button', { name: '수업 기구로 좁히기' });
    expect(narrowBtn).toHaveAttribute('aria-pressed', 'true');

    // The primary inline picker starts with the selected equipment. Broaden it
    // explicitly and verify that a mismatched result cannot change the class.
    fireEvent.click(picker.getByRole('button', { name: '수업 기구 조건 해제' }));
    const firstReformer = usePilatesStore.getState().exercises.find(
      (exercise) => exercise.id === SYNTHETIC_ROUND5_INITIAL_STEPS[0].exerciseId,
    )!;
    const matMovement = usePilatesStore.getState().exercises.find(
      (exercise) => exercise.id === 'original-mat-rib-breath',
    )!;
    fireEvent.click(picker.getByRole('button', { name: `${firstReformer.nameKo} 수업안에 추가` }));
    const beforeRejectedAdd = structuredClone(usePilatesStore.getState().activeSteps);
    fireEvent.click(picker.getByRole('button', { name: `${matMovement.nameKo} 수업안에 추가` }));

    expect(usePilatesStore.getState().activeSteps.length).toBe(1);
    expect(usePilatesStore.getState().activeSteps).toEqual(beforeRejectedAdd);
    const errorFeedback = pickerPage.querySelector('.ief-feedback.error');
    expect(errorFeedback?.textContent).toContain(
      '현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다.',
    );

    // Narrow to class equipment and add the second Reformer movement.
    fireEvent.click(narrowBtn);
    const secondReformer = usePilatesStore.getState().exercises.find(
      (exercise) => exercise.id === SYNTHETIC_ROUND5_INITIAL_STEPS[1].exerciseId,
    )!;
    fireEvent.click(picker.getByRole('button', { name: `${secondReformer.nameKo} 수업안에 추가` }));
    expect(usePilatesStore.getState().activeSteps.length).toBe(2);

    const authoredSteps = structuredClone(usePilatesStore.getState().activeSteps);
    fireEvent.click(screen.getByTestId('wizard-to-step3-btn'));
    expect(screen.getByRole('region', { name: '오늘의 시퀀스' })).toBeVisible();
    expect(usePilatesStore.getState().activeSteps).toEqual(authoredSteps);

    // Open the temporary picker through the visible editor action. Both return
    // controls must close it while preserving every authored step field.
    const openTemporaryFinder = () => {
      const editorActions = screen.getByRole('group', { name: '시퀀스 편집 도구' });
      const addButton = within(editorActions).getByRole('button', { name: '동작 추가' });
      expect(addButton).toBeVisible();
      fireEvent.click(addButton);
      return screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' });
    };
    const finderDialog = openTemporaryFinder();
    const innerSelectionBarBtn = finderDialog.querySelector<HTMLButtonElement>(
      '.ief-selection-bar button',
    );
    const outerFooterReturnBtn = finderDialog.querySelector<HTMLButtonElement>(
      '.workbench-finder-footer button.btn-primary',
    );
    expect(innerSelectionBarBtn).not.toBeNull();
    expect(outerFooterReturnBtn).not.toBeNull();

    fireEvent.click(innerSelectionBarBtn!);
    expect(finderDialog).not.toHaveAttribute('open');
    expect(usePilatesStore.getState().activeSteps).toEqual(authoredSteps);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');

    const reopenedFinder = openTemporaryFinder();
    const footerReturn = within(reopenedFinder).getByRole('button', {
      name: /수업 구성으로 돌아가기/,
    });
    fireEvent.click(footerReturn);

    expect(reopenedFinder).not.toHaveAttribute('open');
    expect(usePilatesStore.getState().activeSteps).toEqual(authoredSteps);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it('R5-AUDIT-03: Stage 4 (순서 변경) → Stage 5 (저장) → Stage 6 (재방문 이어하기) — verifies applied 51f1e6a reorder + live announcement, save, and 100% reordered sequence restoration on revisit', () => {
    usePilatesStore.setState({
      activeApparatus: 'reformer',
      activeSteps: structuredClone(SYNTHETIC_ROUND5_INITIAL_STEPS),
    });

    const { container } = render(<SequenceWorkbench />);

    // Stage 4: Reorder 2nd movement up to 1st position (1 click on "위로 이동")
    const moveUpButtons = screen.getAllByRole('button', { name: /위로 이동/ });
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveUpButtons[1]).not.toBeDisabled();

    fireEvent.click(moveUpButtons[1]);

    const stepsAfterReorder = usePilatesStore.getState().activeSteps;
    expect(stepsAfterReorder.map((s) => s.exerciseId)).toEqual(
      SYNTHETIC_ROUND5_REORDERED_STEPS.map((s) => s.exerciseId),
    );

    // Applied 51f1e6a: aria-live [data-plan-feedback] announces reorder with undo guidance
    const liveStatus = container.querySelector('[data-plan-feedback]');
    expect(liveStatus?.getAttribute('aria-live')).toBe('polite');
    expect(liveStatus?.textContent).toContain('순서를 1번째 위치로 바꿨어요. 되돌릴 수 있습니다.');

    // Stage 5: Save sequence (1 click on button.save-flow)
    const titleInput = screen.getByLabelText('시퀀스 제목');
    fireEvent.change(titleInput, { target: { value: SYNTHETIC_ROUND5_SAVED_SEQUENCE.title } });

    const saveBtn = container.querySelector<HTMLButtonElement>('button.save-flow')!;
    expect(saveBtn).not.toBeNull();
    // Unapplied IMP-R5-03: unsaved sequence save button still uses secondary variant
    expect(saveBtn.className).toContain('pf-btn--secondary');
    fireEvent.click(saveBtn);

    const saved = usePilatesStore.getState().savedSequences;
    expect(saved.length).toBe(1);
    expect(saved[0].title).toBe(SYNTHETIC_ROUND5_SAVED_SEQUENCE.title);
    expect(saved[0].steps.map((s) => s.exerciseId)).toEqual(
      SYNTHETIC_ROUND5_REORDERED_STEPS.map((s) => s.exerciseId),
    );

    // Stage 6: Revisit Empty Home ("새 수업 만들기") -> Click "이어서 구성" (1 click)
    const newClassBtn = container.querySelector<HTMLButtonElement>('.workbench-new-class-btn')!;
    fireEvent.click(newClassBtn);
    expect(usePilatesStore.getState().activeSteps.length).toBe(0);

    const continueBtn = container.querySelector<HTMLButtonElement>(
      '.workbench-recent-continue .workbench-recent-card__action',
    )!;
    expect(continueBtn).not.toBeNull();
    fireEvent.click(continueBtn);

    const restored = usePilatesStore.getState();
    expect(restored.activeTitle).toBe(SYNTHETIC_ROUND5_SAVED_SEQUENCE.title);
    expect(restored.activeSteps.map((s) => s.exerciseId)).toEqual(
      SYNTHETIC_ROUND5_REORDERED_STEPS.map((s) => s.exerciseId),
    );
  });
});
