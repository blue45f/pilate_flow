import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../components/ClassBinderView';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { useCloudSession } from '../lib/cloudSync';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SavedSequence, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from './planningFixtures';

const originalStore = usePilatesStore.getState();
const originalCloud = useCloudSession.getState();
const originalInnerWidth = window.innerWidth;
const productionExercises = structuredClone(INITIAL_EXERCISES);

const syntheticWarmup = syntheticPlanningExercise('reformer', 'warmup', 'alpha');
const syntheticCore = syntheticPlanningExercise('reformer', 'core', 'beta');

const syntheticSteps: SequenceStep[] = [
  {
    stepId: 'quota-qa-step-1',
    order: 1,
    exerciseId: syntheticWarmup.id,
    blockCategory: 'warmup',
    durationMin: 5,
    selectedLayer: 'standard',
  },
  {
    stepId: 'quota-qa-step-2',
    order: 2,
    exerciseId: syntheticCore.id,
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
  },
];

const syntheticCriteria: AutoGenerateCriteria = {
  apparatus: 'reformer',
  availableEquipment: ['reformer'],
  ownedApparatus: ['reformer'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 10,
  restMinutes: 0,
  excludeDaysWindow: 14,
  defaultLayer: 'standard',
  targetGroupId: INITIAL_CLASS_GROUPS[0].id,
};

const settleStorage = async () => {
  for (let turn = 0; turn < 8; turn += 1) {
    await Promise.resolve();
  }
};

function setViewportWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('Quota failure honest save labels, RAM/disk safety, retry & single-plan reload (isolated synthetic, network blocked)', () => {
  let fetchSpy: { mock: { calls: unknown[][] }; mockRestore: () => void };

  beforeEach(async () => {
    localStorage.clear();
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network blocked in isolated synthetic quota test'));
    useCloudSession.setState(
      { ...originalCloud, phase: 'signed-out', user: null, backup: null },
      true,
    );
    usePilatesStore.setState(
      {
        ...originalStore,
        activeTab: 'workbench',
        activeSequenceId: 'quota-qa-initial-disk-seq',
        activeTitle: '합성 기존 디스크 보관 수업 · 실제 수업 아님',
        activeSubtitle: '합성 QA 초기 디스크 보존 검증용',
        activeApparatus: 'reformer',
        activeLevel: '1.0',
        activeTargetMinutes: 10,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        activeSteps: structuredClone(syntheticSteps.slice(0, 1)),
        exercises: [...INITIAL_EXERCISES, syntheticWarmup, syntheticCore],
        classGroups: INITIAL_CLASS_GROUPS,
        savedSequences: [],
        historyLogs: [],
        conditionTemplates: [],
        draftCriteria: structuredClone(syntheticCriteria),
        lastCriteria: structuredClone(syntheticCriteria),
        persistenceError: null,
        saveFeedback: null,
        generationError: null,
        undoStack: [],
      },
      true,
    );
    // Persist 1 baseline synthetic sequence cleanly onto localStorage before quota failure.
    usePilatesStore.getState().saveCurrentSequenceToBinder();
    await settleStorage();
  });

  afterEach(async () => {
    cleanup();
    setViewportWidth(originalInnerWidth);
    vi.restoreAllMocks();
    expect(INITIAL_EXERCISES).toEqual(productionExercises);
    usePilatesStore.setState(originalStore, true);
    useCloudSession.setState(originalCloud, true);
    await settleStorage();
    localStorage.clear();
  });

  it.each([
    { label: 'PC (1440px)', width: 1440 },
    { label: 'Mobile (390px)', width: 390 },
  ])(
    '$label: SequenceStudioWorkbench + ClassBinderView never show false saved labels on QuotaExceededError, protect RAM & disk data, succeed on retry without duplicates, and reload the same plan once',
    async ({ width }) => {
      setViewportWidth(width);
      const preQuotaDiskRaw = localStorage.getItem(RECOVERY_STORAGE_KEY);
      expect(preQuotaDiskRaw).toEqual(expect.any(String));
      const preQuotaSaved: SavedSequence[] = JSON.parse(preQuotaDiskRaw!).state.savedSequences;
      expect(preQuotaSaved).toHaveLength(1);
      const baselineDiskId = preQuotaSaved[0]!.id;

      // Start a fresh synthetic draft in RAM so baseline disk sequence stays distinct.
      act(() => {
        usePilatesStore.setState({
          activeSequenceId: 'quota-qa-new-draft',
          activeTitle: `합성 쿼터 초과 검증 플랜 (${width}px)`,
          activeSubtitle: '합성 QA · 네트워크 차단',
          activeSteps: structuredClone(syntheticSteps),
          saveFeedback: null,
          persistenceError: null,
        });
      });
      await settleStorage();
      const diskSnapshotBeforeQuota = localStorage.getItem(RECOVERY_STORAGE_KEY);

      // Block localStorage writes with QuotaExceededError.
      const quotaSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Synthetic storage quota full', 'QuotaExceededError');
      });

      const studioView = render(
        <SequenceStudioWorkbench
          onOpenYouTubePreview={vi.fn()}
          onOpenClipper={vi.fn()}
          onOpenLogModal={vi.fn()}
          onOpenInventory={vi.fn()}
          onStartClass={vi.fn()}
        />,
      );

      // 1. Save fails due to QuotaExceededError -> NO false saved label, RAM & disk kept safe!
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          '브라우저 저장 공간에 기록하지 못했습니다',
        ),
      );
      expect(screen.getByRole('status')).not.toHaveTextContent('저장한 수업에 보관했습니다');
      expect(screen.getByTestId('flow-actionbar-save-hint')).toHaveTextContent(
        '기기 저장 미완료 · 메모리 작업본 유지 중',
      );
      expect(screen.getByTestId('flow-footer-backup-btn')).toBeInTheDocument();

      const afterFail = usePilatesStore.getState();
      expect(afterFail.persistenceError).toContain('브라우저 저장 공간에 기록하지 못했습니다');
      expect(afterFail.saveFeedback).toBeNull();
      // RAM has both the baseline sequence and the new unsaved sequence; disk still has ONLY pre-quota data!
      expect(afterFail.savedSequences).toHaveLength(2);
      const ramPlanId = afterFail.activeSequenceId;
      expect(ramPlanId).not.toBe(baselineDiskId);
      expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(diskSnapshotBeforeQuota);
      expect(JSON.parse(afterFail.exportBackup()).data.savedSequences).toHaveLength(2);

      // 2. Inspect ClassBinderView (including line 1257 caption + card badges + backup strip).
      studioView.unmount();
      const binderView = render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);

      const caption = screen.getByTestId('binder-browser-save-caption');
      expect(caption).not.toHaveTextContent('이 브라우저에 저장됨');
      expect(caption).toHaveTextContent('기기 미저장 메모리 보관 1개 포함');
      expect(screen.getByTestId('binder-emergency-backup-strip')).toHaveTextContent(
        '전체 JSON 백업 내보내기',
      );
      // Only the 1 RAM-only sequence card gets the unsaved-RAM warning badge; baseline disk card stays clean!
      const ramBadges = screen.getAllByTestId('binder-card-unsaved-ram-badge');
      expect(ramBadges).toHaveLength(1);

      // Duplicating inside ClassBinderView during quota failure also never claims browser save.
      binderView.unmount();

      // 3. Free storage quota and RETRY Save on the exact same plan -> deduplicated in place!
      quotaSpy.mockRestore();
      const retryStudio = render(
        <SequenceStudioWorkbench
          onOpenYouTubePreview={vi.fn()}
          onOpenClipper={vi.fn()}
          onOpenLogModal={vi.fn()}
          onOpenInventory={vi.fn()}
          onStartClass={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('저장한 수업에 보관했습니다.'),
      );
      await settleStorage();

      const afterRetry = usePilatesStore.getState();
      expect(afterRetry.persistenceError).toBeNull();
      expect(afterRetry.activeSequenceId).toBe(ramPlanId);
      // Deduplicated: still exactly 2 sequences total (baseline + 1 retried plan, zero duplicate copies!).
      expect(afterRetry.savedSequences).toHaveLength(2);
      expect(afterRetry.savedSequences.filter((s) => s.id === ramPlanId)).toHaveLength(1);

      const postRetryDisk = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
      expect(postRetryDisk.state.savedSequences).toHaveLength(2);
      expect(postRetryDisk.state.savedSequences.map((s: SavedSequence) => s.id)).toEqual([
        ramPlanId,
        baselineDiskId,
      ]);
      retryStudio.unmount();

      // 4. Reload the same plan once (simulate fresh page reload from intact localStorage + open once).
      const persistedDiskJson = localStorage.getItem(RECOVERY_STORAGE_KEY)!;
      act(() => {
        usePilatesStore.setState({
          savedSequences: [],
          activeSequenceId: 'transient-cleared',
          activeTitle: '임시 초기화',
          activeSteps: [],
        });
      });
      localStorage.setItem(RECOVERY_STORAGE_KEY, persistedDiskJson);
      await act(async () => {
        await usePilatesStore.persist.rehydrate();
      });
      await settleStorage();

      const afterReload = usePilatesStore.getState();
      expect(afterReload.persistenceError).toBeNull();
      expect(afterReload.savedSequences).toHaveLength(2);
      expect(afterReload.activeSequenceId).toBe(ramPlanId);
      expect(afterReload.activeTitle).toBe(`합성 쿼터 초과 검증 플랜 (${width}px)`);
      expect(afterReload.activeSteps.map((s) => s.exerciseId)).toEqual([
        syntheticWarmup.id,
        syntheticCore.id,
      ]);

      const reloadedBinder = render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);
      expect(screen.getByTestId('binder-browser-save-caption')).toHaveTextContent(
        '최근 수정 순 · 이 브라우저에 저장됨',
      );
      expect(screen.queryByTestId('binder-card-unsaved-ram-badge')).not.toBeInTheDocument();

      // Click 불러오기 on the same plan once -> switches cleanly to workbench without duplicating.
      const targetCard = reloadedBinder
        .getByRole('heading', { name: `합성 쿼터 초과 검증 플랜 (${width}px)` })
        .closest('article') as HTMLElement;
      expect(targetCard).not.toBeNull();
      fireEvent.click(within(targetCard).getByRole('button', { name: '불러오기' }));
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(usePilatesStore.getState().activeSequenceId).toBe(ramPlanId);
      expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('Advanced SequenceWorkbench never shows 저장됨 on PC or Mobile when quota fails, then recovers to 저장됨 on retry', async () => {
    setViewportWidth(390);
    act(() => {
      usePilatesStore.setState({
        activeSequenceId: 'quota-qa-adv-draft',
        activeTitle: '합성 고급 작업대 쿼터 검증',
        activeSteps: structuredClone(syntheticSteps),
        persistenceError: null,
        saveFeedback: null,
      });
    });
    await settleStorage();

    const quotaSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Synthetic storage quota full', 'QuotaExceededError');
    });

    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    const mobileStickySaveBtn = screen.getByTestId('p04-mobile-sticky-save-btn');
    fireEvent.click(mobileStickySaveBtn);
    await settleStorage();

    expect(screen.getByTestId('workbench-save-state')).not.toHaveTextContent('저장됨');
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('기기 미저장 · 백업 권장');
    expect(mobileStickySaveBtn).toHaveTextContent('다시 저장');
    expect(mobileStickySaveBtn).not.toHaveTextContent('저장됨');

    // Restore quota and click retry -> transitions cleanly to 저장됨 without creating duplicate copies!
    const countAfterFail = usePilatesStore.getState().savedSequences.length;
    quotaSpy.mockRestore();
    fireEvent.click(mobileStickySaveBtn);
    await settleStorage();

    expect(usePilatesStore.getState().persistenceError).toBeNull();
    expect(usePilatesStore.getState().savedSequences).toHaveLength(countAfterFail);
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');
    expect(mobileStickySaveBtn).toHaveTextContent('저장됨');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
