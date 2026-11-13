import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { OFFLINE_BLOCK_PRESETS } from '../data/classBlockPresets';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from './planningFixtures';
import { resetMovementIdeaStateForTests } from '../utils/movementIdeaDraft';

vi.mock('../components/MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="mock-motion-reference-player" />,
}));

const originalState = usePilatesStore.getState();
const originalInnerWidth = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('Round 2 Integrated User Journey (Home -> Search -> Block/Drag -> Save -> Live/Voice -> History Reuse)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetMovementIdeaStateForTests();
    usePilatesStore.setState(originalState, true);
  });

  afterEach(() => {
    cleanup();
    resetMovementIdeaStateForTests();
    usePilatesStore.setState(originalState, true);
    setViewportWidth(originalInnerWidth);
    vi.restoreAllMocks();
  });

  it.each([320, 390, 768, 1440])(
    'executes the full end-to-end journey seamlessly at %ipx viewport',
    async (viewportWidth) => {
      setViewportWidth(viewportWidth);

      // Prepare approved exercises across warmup / main / cooldown for Reformer so LiveStageView can start cleanly
      const warmupEx = syntheticPlanningExercise('reformer', 'warmup');
      const mainEx = syntheticPlanningExercise('reformer', 'core');
      const cooldownEx = syntheticPlanningExercise('reformer', 'cooldown');

      const baseState = usePilatesStore.getState();
      const presetExerciseIds = new Set(OFFLINE_BLOCK_PRESETS[0]!.steps.map((s) => s.exerciseId));
      const compactCatalog = [
        warmupEx,
        mainEx,
        cooldownEx,
        ...baseState.exercises.filter((ex, idx) => presetExerciseIds.has(ex.id) || idx < 6),
      ];

      usePilatesStore.setState({
        ...baseState,
        activeTab: 'workbench',
        activeSteps: [],
        activeTitle: '통합 검증 전 초안',
        activeApparatus: 'reformer',
        activeLevel: '1.5',
        activeTargetMinutes: 50,
        ownedEquipment: ['reformer', 'mat'],
        ownedApparatus: ['reformer', 'mat'],
        exercises: compactCatalog,
        draftCriteria: {
          apparatus: 'reformer',
          availableEquipment: ['reformer', 'mat'],
          ownedApparatus: ['reformer', 'mat'],
          preferredProps: ['none'],
          level: '1.5',
          focusPreset: 'full-body',
          excludeDaysWindow: 0,
          targetMinutes: 50,
          defaultLayer: 'standard',
        },
        generationError: null,
        persistenceError: null,
        saveFeedback: null,
      });

      render(<App />);

      // =========================================================================
      // 1. 홈 (Home — 4256230 + c6acd66 + f3c093e)
      // =========================================================================
      const welcomeRegion = screen.getByRole('region', { name: '첫 수업안 준비' });
      expect(within(welcomeRegion).getByText('새 수업 만들기')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '최근 수업 이어가기' })).toBeInTheDocument();

      // Open Settings dialog and verify 4-group PilatesSettingsPage integration (c6acd66 + f3c093e)
      fireEvent.click(screen.getByRole('button', { name: '데이터 백업과 사용 안내' }));
      const settingsSummary = await screen.findByText(
        '4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)',
        {},
        { timeout: 10000 },
      );
      fireEvent.click(settingsSummary);
      const settingsDetails = settingsSummary.closest('details');
      if (settingsDetails) settingsDetails.open = true;
      const settingsPage = await screen.findByTestId(
        'pilates-settings-page',
        {},
        { timeout: 10000 },
      );
      expect(
        within(settingsPage).getByRole('toolbar', { name: '설정 그룹 바로가기' }),
      ).toBeInTheDocument();
      // Close Settings dialog
      const closeSettingsBtns = screen.getAllByRole('button', { name: '닫기' });
      fireEvent.click(closeSettingsBtns[closeSettingsBtns.length - 1]!);

      // =========================================================================
      // 2. 동작검색 (Movement Search / Atlas & Finder — f95b188)
      // =========================================================================
      // Navigate to Atlas ('동작') and search + add warmupEx and mainEx
      const navButtons = screen.getAllByRole('button', { name: /동작/ });
      const atlasNavBtn = navButtons.find((btn) => btn.closest('nav') !== null)!;
      fireEvent.click(atlasNavBtn);

      const addWarmupBtn = await screen.findByRole(
        'button',
        { name: `${warmupEx.nameKo} 수업안에 추가` },
        { timeout: 10000 },
      );
      fireEvent.click(addWarmupBtn);
      expect(
        screen.getByText(`${warmupEx.nameKo} · 현재 수업안에 추가했어요.`),
      ).toBeInTheDocument();
      expect(usePilatesStore.getState().activeSteps).toHaveLength(1);

      // Search for mainEx in Atlas search box and add it
      const atlasSearchInput = screen.getByPlaceholderText(/동작 이름|근육|키워드|검색/);
      fireEvent.change(atlasSearchInput, { target: { value: mainEx.nameKo } });
      const addMainBtn = await screen.findByRole(
        'button',
        { name: `${mainEx.nameKo} 수업안에 추가` },
        { timeout: 10000 },
      );
      fireEvent.click(addMainBtn);
      expect(usePilatesStore.getState().activeSteps).toHaveLength(2);

      // Return to Home / Workbench ('수업')
      const workbenchNavBtn = screen
        .getAllByRole('button', { name: /오늘의 수업|^수업$/ })
        .find((btn) => btn.closest('nav') !== null)!;
      fireEvent.click(workbenchNavBtn);

      // Add cooldownEx through the editor's primary movement action.
      const editorActions = await screen.findByRole(
        'group',
        { name: '시퀀스 편집 도구' },
        { timeout: 10000 },
      );
      const openFinderBtn = within(editorActions).getByRole('button', { name: '동작 추가' });
      fireEvent.click(openFinderBtn);
      const finderDialog = screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' });
      const finderAddCooldownBtn = within(finderDialog).getByRole('button', {
        name: new RegExp(`${cooldownEx.nameKo}.*(담기|추가)`),
      });
      fireEvent.click(finderAddCooldownBtn);
      fireEvent.click(within(finderDialog).getByRole('button', { name: /수업 구성으로 돌아가기/ }));
      expect(usePilatesStore.getState().activeSteps).toHaveLength(3);

      // =========================================================================
      // 3. 블록삽입/드래그 (Block Combination, Preset Insertion, Rest & Reorder — 338f912 + f3c093e)
      // =========================================================================
      // Open '블록 조합' details and save current steps as a reusable block
      const blockComboSummary = screen.getByText(/^블록 조합/);
      fireEvent.click(blockComboSummary);
      const blockComboDetails = blockComboSummary.closest('details');
      if (blockComboDetails) blockComboDetails.open = true;
      const blockNameInput = screen.getByLabelText('새 재사용 블록 이름');
      const customBlockName = `통합검증 블록 ${viewportWidth}`;
      fireEvent.change(blockNameInput, { target: { value: customBlockName } });
      fireEvent.click(screen.getByRole('button', { name: '현재 동작 묶어 블록 저장' }));

      // Verify the new reusable block appears in the list
      const savedBlockRegion = await screen.findByLabelText(
        '내 저장된 재사용 블록',
        {},
        { timeout: 10000 },
      );
      expect(within(savedBlockRegion).getByText(customBlockName)).toBeInTheDocument();

      // Open OfflinePresetPicker ('프리셋·동작 묶음 열기') and verify both '연계 동작 묶음' and '시간·휴식 맞춤 후보'
      fireEvent.click(screen.getByRole('button', { name: /프리셋·동작 묶음 열기/ }));
      const presetSection = await screen.findByRole(
        'region',
        { name: '오프라인 수업·연계 블록 프리셋' },
        { timeout: 10000 },
      );
      fireEvent.click(within(presetSection).getByRole('button', { name: /시간·휴식 맞춤 후보/ }));
      expect(
        await within(presetSection).findByTestId(
          'preset-suggestion-candidate-preview',
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();

      // Switch to '연계 동작 묶음' tab and inspect a block preset without accidental mutation
      fireEvent.click(within(presetSection).getByRole('button', { name: /연계 동작 묶음/ }));
      const firstBlockPreset = OFFLINE_BLOCK_PRESETS[0]!;
      fireEvent.click(
        within(presetSection).getByRole('button', { name: new RegExp(firstBlockPreset.title) }),
      );
      expect(
        within(presetSection).getByRole('region', { name: '선택한 프리셋 확인' }),
      ).toBeInTheDocument();
      // Close preset dialog
      const presetDialog = presetSection.closest('dialog');
      const closePresetBtn = presetDialog
        ? within(presetDialog).getByRole('button', { name: '닫기' })
        : screen.getAllByRole('button', { name: '닫기' }).at(-1)!;
      fireEvent.click(closePresetBtn);

      // Insert a rest step via RestInsertControl ('휴식 추가' -> '이 위치에 휴식 넣기')
      const restSummary = screen.getByText('휴식 추가');
      const restDetails = restSummary.closest('details');
      if (restDetails) restDetails.open = true;
      fireEvent.click(screen.getByRole('button', { name: /이 위치에 휴식 넣기/ }));
      expect(usePilatesStore.getState().activeSteps).toHaveLength(4);

      // Reorder steps via SequenceOrderCard ('아래로 이동' & keyboard ArrowUp on drag handle)
      const firstStepLabel = `1번 ${warmupEx.nameKo}`;
      const moveDownBtn = screen.getByRole('button', { name: `${firstStepLabel} 아래로 이동` });
      const orderBeforeMove = usePilatesStore.getState().activeSteps.map((s) => s.stepId);
      fireEvent.click(moveDownBtn);
      const orderAfterMoveDown = usePilatesStore.getState().activeSteps.map((s) => s.stepId);
      expect(orderAfterMoveDown[1]).toBe(orderBeforeMove[0]);

      // Move it back up with keyboard ArrowUp on the drag handle to keep canonical WARM-UP -> MAIN -> COOL-DOWN order
      const movedStepHandle = document.getElementById(`order-handle-${orderBeforeMove[0]}`)!;
      expect(movedStepHandle).not.toBeNull();
      fireEvent.keyDown(movedStepHandle, { key: 'ArrowUp' });
      expect(usePilatesStore.getState().activeSteps[0]?.stepId).toBe(orderBeforeMove[0]);

      // =========================================================================
      // 4. 저장 & 미리보기/큐시트 (Save & SequencePlanPreview / ClassCueSheetPreview — 338f912 + f3c093e)
      // =========================================================================
      const journeyTitle = `통합검증 ${viewportWidth}px 리포머 플로우`;
      const titleInput = screen.getByLabelText('시퀀스 제목');
      fireEvent.change(titleInput, { target: { value: journeyTitle } });
      expect(usePilatesStore.getState().activeTitle).toBe(journeyTitle);

      // Click '저장' in workbench
      const saveBtn = screen
        .getAllByRole('button', { name: /^저장$/ })
        .find((btn) => btn.classList.contains('save-flow'))!;
      fireEvent.click(saveBtn);
      expect(
        usePilatesStore.getState().savedSequences.some((seq) => seq.title === journeyTitle),
      ).toBe(true);

      // Open SequencePlanPreview ('시퀀스 미리보기')
      fireEvent.click(screen.getByRole('button', { name: /시퀀스 미리보기/ }));
      const previewDialog = await screen.findByRole('dialog', {}, { timeout: 10000 });
      // Toggle ClassCueSheetPreview inside SequencePlanPreview
      const previewCueSummary = within(previewDialog).getByText('수업 진행 큐시트 · 인쇄 보기');
      const previewCueDetails = previewCueSummary.closest('details');
      if (previewCueDetails) {
        previewCueDetails.open = true;
        fireEvent(previewCueDetails, new Event('toggle'));
      }
      expect(
        await within(previewDialog).findByTestId('class-cue-sheet-root', {}, { timeout: 10000 }),
      ).toBeInTheDocument();

      // =========================================================================
      // 5. 수업진행/음성 (LiveStageView & Voice Guidance — f3c093e)
      // =========================================================================
      const startClassBtn = within(previewDialog).getByRole('button', { name: /수업 시작/ });
      expect(startClassBtn).toBeEnabled();
      fireEvent.click(startClassBtn);

      await waitFor(
        () => {
          expect(usePilatesStore.getState().activeTab).toBe('stage');
        },
        { timeout: 10000 },
      );

      // Verify LiveStageView rendered and toggle Cue Sheet in LiveStageView
      const stageCueBtn = await screen.findByRole(
        'button',
        { name: '큐시트 보기' },
        { timeout: 10000 },
      );
      fireEvent.click(stageCueBtn);
      expect(screen.getByRole('region', { name: '수업 진행 큐시트' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '큐시트 닫기' }));

      // Verify Voice Guidance section ('수업 음성 안내 설정')
      const voiceSection = screen.getByRole('region', { name: '수업 음성 안내 설정' });
      expect(voiceSection).toBeInTheDocument();
      const voiceToggleBtn = within(voiceSection).getByRole('button', {
        name: /음성 안내 켜기|음성 안내 끄기/,
      });
      if (!voiceToggleBtn.hasAttribute('disabled')) {
        fireEvent.click(voiceToggleBtn);
        expect(voiceToggleBtn).toHaveAttribute('aria-pressed', 'true');
        const stopVoiceBtn = within(voiceSection).getByRole('button', { name: '음성 즉시 중지' });
        fireEvent.click(stopVoiceBtn);
      }

      // Start class timer ('수업 시작') and advance to next step ('다음 동작')
      const playTimerBtn = screen.getByRole('button', { name: /^(수업 시작|휴식 시작)$/ });
      fireEvent.click(playTimerBtn);
      const nextStepBtn = screen.getByRole('button', { name: /^(다음 동작|휴식 건너뛰기)$/ });
      fireEvent.click(nextStepBtn);

      // Finish class -> open review dialog -> open LogSessionModal
      fireEvent.click(screen.getByRole('button', { name: /종료 \/ 기록/ }));
      const reviewConfirmBtn = await screen.findByRole(
        'button',
        { name: /검토하고 기록하기/ },
        { timeout: 10000 },
      );
      fireEvent.click(reviewConfirmBtn);

      // =========================================================================
      // 6. 기록재사용 (LogSessionModal -> History Date/Search/Hierarchy -> Reuse — 45839ff)
      // =========================================================================
      const reflectionInput = await screen.findByLabelText(
        '다음 수업을 위한 메모 (선택)',
        {},
        { timeout: 10000 },
      );
      const reflectionNote = `${viewportWidth}px 통합 동선 수업 완료 메모`;
      fireEvent.change(reflectionInput, { target: { value: reflectionNote } });

      const saveLogBtn = screen.getByRole('button', { name: /수업 기록 저장/ });
      fireEvent.click(saveLogBtn);

      await waitFor(
        () => {
          expect(usePilatesStore.getState().activeTab).toBe('history');
        },
        { timeout: 10000 },
      );

      // Verify History view (ClassBinderView view="history") shows the new record
      const historyFeed = await screen.findByRole(
        'region',
        { name: '수업 기록 목록' },
        { timeout: 10000 },
      );
      expect(within(historyFeed).getByText(journeyTitle)).toBeInTheDocument();

      // Test compact search in History
      const historySearchInput = screen.getByLabelText('수업 기록 검색');
      fireEvent.change(historySearchInput, {
        target: { value: `통합검증${viewportWidth}px` },
      });
      const matchingCards = within(historyFeed).getAllByRole('article');
      expect(matchingCards.length).toBeGreaterThanOrEqual(1);

      // Verify date chip group exists and is interactive
      const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
      expect(within(dateNav).getByRole('button', { name: /전체 날짜/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      // Clear activeSteps first so we can verify that '복사해 새 수업 만들기' restores the class into workbench
      act(() => {
        usePilatesStore.setState({ activeSteps: [], activeTitle: '비어있는 초안' });
      });

      const targetCard = matchingCards[0]!;
      const reuseBtn = within(targetCard).getByRole('button', { name: /복사해 새 수업 만들기/ });
      fireEvent.click(reuseBtn);

      await waitFor(
        () => {
          expect(usePilatesStore.getState().activeTab).toBe('workbench');
        },
        { timeout: 10000 },
      );
      expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
      expect(usePilatesStore.getState().activeTitle).toContain(journeyTitle);
    },
    30000,
  );
});
