import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { ClassBinderView } from '../components/ClassBinderView';
import { LogSessionModal } from '../components/LogSessionModal';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { useCloudSession } from '../lib/cloudSync';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import { inspectBackupRecovery } from '../utils/backupRecoveryInspection';
import { syntheticPlanningExercise } from './planningFixtures';

const originalStore = usePilatesStore.getState();
const originalCloud = useCloudSession.getState();

describe('completed teaching program history snapshot, immutability, reopen/copy, and failure/refresh/duplicate guards', () => {
  let exWarm: PilatesExercise;
  let exCore: PilatesExercise;
  let steps: SequenceStep[];
  let criteria: AutoGenerateCriteria;
  let savedPlan: SavedSequence;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T10:00:00.000Z'));
    localStorage.clear();

    exWarm = {
      ...syntheticPlanningExercise('reformer', 'warmup', 'alpha', false),
      nameKo: '당시 풋워크 예열 동작',
      nameEn: 'Snapshot Footwork Warmup',
      springs: '2 Red + 1 Blue',
      cues: ['당시 큐잉: 골반 중립과 흉곽 호흡을 유지하세요.'],
      layers: {
        easy: '당시 이지 가이드',
        standard: '당시 스탠다드 가이드',
        hard: '당시 하드 가이드',
      },
    };
    exCore = {
      ...syntheticPlanningExercise('reformer', 'core', 'beta', false),
      nameKo: '당시 헌드레드 코어 동작',
      nameEn: 'Snapshot Hundred Core',
      springs: '1 Red + 1 Blue',
      cues: ['당시 큐잉: 복횡근 수축과 균일한 호흡을 유지하세요.'],
      layers: {
        easy: '당시 코어 이지',
        standard: '당시 코어 스탠다드',
        hard: '당시 코어 하드챌린지',
      },
    };

    steps = [
      {
        stepId: 'hist-step-1',
        order: 1,
        exerciseId: exWarm.id,
        blockCategory: 'warmup',
        durationMin: 8,
        explanationSec: 20,
        transitionSec: 15,
        selectedLayer: 'standard',
        customSpringOverride: '2 Red',
        repetitions: 10,
        sets: 2,
        instructorNote: '도입 정렬 체크 메모',
        blockInstanceId: 'block-inst-opening-1',
        sourceBlockId: 'block-reformer-warmup',
        sourceBlockVersion: 1,
        sourceBlockTitle: '당시 리포머 도입 블록',
      },
      {
        stepId: 'hist-step-rest',
        order: 2,
        kind: 'rest',
        exerciseId: '',
        blockCategory: 'core',
        durationMin: 2,
        selectedLayer: 'standard',
        instructorNote: '스프링 전환 휴식',
        locked: true,
      },
      {
        stepId: 'hist-step-2',
        order: 3,
        exerciseId: exCore.id,
        blockCategory: 'core',
        durationMin: 10,
        explanationSec: 25,
        transitionSec: 15,
        selectedLayer: 'hard',
        repetitions: 8,
        sets: 3,
        sideMode: 'left-then-right',
        instructorNote: '메인 코어 집중 메모',
      },
    ];

    criteria = {
      apparatus: 'reformer',
      ownedApparatus: ['reformer'],
      availableEquipment: ['reformer'],
      level: '1.5',
      focusPreset: 'full-body',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 20,
      restMinutes: 2,
      targetGroupId: INITIAL_CLASS_GROUPS[0].id,
      defaultLayer: 'standard',
    };

    savedPlan = {
      id: 'seq-plan-template-1',
      title: '목요 리포머 정규 시퀀스',
      subtitle: '코어·정렬 집중',
      apparatus: 'reformer',
      level: '1.5',
      targetMinutes: 20,
      focusTags: ['코어'],
      steps: structuredClone(steps),
      criteriaSnapshot: structuredClone(criteria),
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-01T09:00:00.000Z',
      taughtCount: 0,
    };

    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: [...INITIAL_EXERCISES, structuredClone(exWarm), structuredClone(exCore)],
        savedSequences: [structuredClone(savedPlan)],
        conditionTemplates: [
          {
            id: 'tpl-1',
            name: '오전 리포머 20분 조건 템플릿',
            createdAt: '2026-11-01T09:00:00.000Z',
            criteria: structuredClone(criteria),
          },
        ],
        classGroups: INITIAL_CLASS_GROUPS,
        historyLogs: [],
        activeSequenceId: savedPlan.id,
        activeTitle: savedPlan.title,
        activeSubtitle: savedPlan.subtitle,
        activeSteps: structuredClone(steps),
        activeApparatus: 'reformer',
        activeLevel: '1.5',
        activeTargetMinutes: 20,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
        persistenceError: null,
        saveFeedback: null,
        generationError: null,
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    usePilatesStore.setState(originalStore, true);
    useCloudSession.setState(originalCloud, true);
    localStorage.clear();
  });

  it('distinguishes plans/templates from completed history and preserves immutable snapshot when original movements or blocks are later edited or deleted', () => {
    // 1. Complete and record the class via LogSessionModal
    const onClose = vi.fn();
    const { unmount } = render(
      <LogSessionModal
        sequenceId={savedPlan.id}
        onClose={onClose}
        context={{
          actualDurationSec: 1185,
          actualRestDurationSec: 115,
          stepsSnapshot: structuredClone(steps),
          sequenceTitle: savedPlan.title,
          taughtStepIds: steps.map((step) => step.stepId),
        }}
      />,
    );

    const dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    expect(dialog.getByText('진행 완료 이력 스냅샷')).toBeInTheDocument();
    expect(dialog.getByText('원본: 저장한 시퀀스 계획')).toBeInTheDocument();

    fireEvent.change(dialog.getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' }), {
      target: { value: '목요 오전 완료 기록 · 흉곽 안정성 우수' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();

    const recorded = usePilatesStore.getState().historyLogs[0] as ClassHistoryLogWithSnapshot;
    expect(recorded).toBeDefined();
    expect(recorded.programSnapshot).toBeDefined();
    expect(recorded.programSnapshot?.recordKind).toBe('completed-history');
    expect(recorded.programSnapshot?.sourceKind).toBe('saved-sequence');
    expect(recorded.programSnapshot?.timing).toEqual({
      plannedTotalSec: 1200,
      plannedExerciseSec: 1080,
      plannedRestSec: 120,
      actualDurationSec: 1185,
      actualRestDurationSec: 115,
      actualExerciseDurationSec: 1070,
    });

    // 2. LATER MUTATION: Modify exWarm in catalog, delete exCore from catalog, and mutate savedPlan & activeSteps
    act(() => {
      usePilatesStore.setState((state) => ({
        exercises: state.exercises
          .filter((exercise) => exercise.id !== exCore.id)
          .map((exercise) =>
            exercise.id === exWarm.id
              ? {
                  ...exercise,
                  nameKo: '나중에 완전히 바뀐 동작 이름',
                  nameEn: 'Mutated Later Name',
                  blockCategory: 'cooldown',
                  defaultDurationMin: 19,
                  springs: '3 Red',
                  cues: ['나중에 바뀐 큐잉'],
                  layers: {
                    easy: '나중에 바뀐 이지',
                    standard: '나중에 바뀐 스탠다드',
                    hard: '나중에 바뀐 하드',
                  },
                }
              : exercise,
          ),
        savedSequences: state.savedSequences.map((seq) =>
          seq.id === savedPlan.id
            ? {
                ...seq,
                title: '나중에 수정된 계획 시퀀스 제목',
                steps: [
                  {
                    ...steps[0],
                    blockCategory: 'cooldown',
                    durationMin: 18,
                  },
                ],
              }
            : seq,
        ),
        activeTitle: '현재 다른 작업대 초안',
        activeSteps: [
          {
            ...steps[0],
            blockCategory: 'cooldown',
            durationMin: 10,
          },
        ],
      }));
    });

    // 3. Render Saved view vs. History view to verify separation and snapshot immutability
    const { rerender } = render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);
    expect(screen.getByLabelText('계획 및 템플릿 구분 안내')).toHaveTextContent(
      '계획 / 템플릿 (수정·재사용 가능)',
    );
    expect(
      screen.getByRole('heading', { name: '나중에 수정된 계획 시퀀스 제목' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '저장한 수업 조건' })).toBeInTheDocument();

    // Switch to History view
    act(() => {
      useCloudSession.setState({
        phase: 'signed-in',
        user: {
          userId: 'u-1',
          email: 'pilates@studio.kr',
          name: '박강사',
          picture: undefined,
          scope: 'authenticated',
        },
        backup: {
          exists: true,
          revision: 'r-1',
          updatedAt: '2026-11-05T10:05:00.000Z',
          bytes: 1024,
        },
        error: null,
        conflict: false,
        pendingSave: false,
        pendingDelete: false,
      });
    });
    rerender(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    expect(screen.getByLabelText('진행 완료 이력 스냅샷 보존 안내')).toHaveTextContent(
      '진행 완료 이력 (불변 스냅샷 보존)',
    );
    expect(screen.getByLabelText('진행 완료 이력 스냅샷 보존 안내')).toHaveTextContent(
      'P3 계정 연결됨 (pilates@studio.kr · 백업 있음)',
    );

    const historyCard = within(
      screen.getByRole('heading', { name: '목요 리포머 정규 시퀀스' }).closest('article')!,
    );
    // Past history card still shows the exact movement names at the time of teaching!
    expect(historyCard.getByText('당시 풋워크 예열 동작')).toBeInTheDocument();
    expect(historyCard.getByText('당시 헌드레드 코어 동작')).toBeInTheDocument();
    expect(historyCard.getByText('휴식 02:00')).toBeInTheDocument();
    expect(historyCard.queryByText('나중에 완전히 바뀐 동작 이름')).not.toBeInTheDocument();
    expect(historyCard.queryByText('삭제된 동작')).not.toBeInTheDocument();
    expect(historyCard.getByText('원본 수정 후에도 당시 스냅샷 유지됨')).toBeInTheDocument();

    // 4. Filter by search query using the historical movement name and historical block title
    const searchInput = screen.getByRole('textbox', { name: '수업 기록 검색' });
    fireEvent.change(searchInput, { target: { value: '당시 헌드레드 코어' } });
    expect(screen.getByRole('heading', { name: '목요 리포머 정규 시퀀스' })).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '당시 리포머 도입 블록' } });
    expect(screen.getByRole('heading', { name: '목요 리포머 정규 시퀀스' })).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });

    // 5. Reopen the completed history snapshot ("이력 다시 열기")
    fireEvent.click(historyCard.getByRole('button', { name: '이력 다시 열기' }));
    const reopenDialog = within(
      screen.getByRole('dialog', { name: '진행 완료 수업 이력 상세' }),
    );
    expect(reopenDialog.getByText(/진행 완료 이력 스냅샷/)).toBeInTheDocument();
    expect(reopenDialog.getByText(/블록 스냅샷: 당시 리포머 도입 블록 \(v1\)/)).toBeInTheDocument();
    expect(reopenDialog.getByText(/블록: 당시 리포머 도입 블록 v1/)).toBeInTheDocument();
    expect(reopenDialog.getByText(/원본 동작·블록 수정 후에도 당시 이력 스냅샷 그대로 보존됨/)).toBeInTheDocument();
    expect(reopenDialog.getByText('당시 풋워크 예열 동작')).toBeInTheDocument();
    expect(reopenDialog.getByText('당시 헌드레드 코어 동작')).toBeInTheDocument();
    expect(reopenDialog.getByText('원본 동작 수정됨 · 당시 값 표시')).toBeInTheDocument();
    expect(reopenDialog.getByText('원본 동작 삭제됨 · 스냅샷 복원 가능')).toBeInTheDocument();
    expect(reopenDialog.getByText(/당시 스탠다드 가이드/)).toBeInTheDocument();
    expect(reopenDialog.getByText(/당시 코어 하드챌린지/)).toBeInTheDocument();
    expect(reopenDialog.getByText(/당시 스프링: 2 Red/)).toBeInTheDocument();

    // 6. Copy to create next class ("복사해 다음 수업 만들기") from the reopened modal
    fireEvent.click(reopenDialog.getByRole('button', { name: '복사해 다음 수업 만들기' }));
    const afterCopy = usePilatesStore.getState();
    expect(afterCopy.generationError).toBeNull();
    expect(afterCopy.activeTitle).toBe('목요 리포머 정규 시퀀스 (기록에서 복사)');
    expect(afterCopy.activeSteps).toEqual(steps);
    expect(afterCopy.activeTargetMinutes).toBe(20);
    // Deleted exercise was restored from the snapshot so backup validation passes
    expect(afterCopy.exercises.some((ex) => ex.id === exCore.id)).toBe(true);
    // And the historical record itself was not mutated
    expect(afterCopy.historyLogs[0]).toEqual(recorded);
    // And P1 backup validation passes on the resulting state
    const exported = afterCopy.exportBackup();
    expect(cloudBackupDataSchema.safeParse(JSON.parse(exported).data).success).toBe(true);
    expect(parseRecoverableNativeBackup(exported).historyLogs).toHaveLength(1);
    expect(inspectBackupRecovery(exported, afterCopy).success).toBe(true);
  });

  it('prevents duplicate completion of the same session, survives page refresh (rehydration), and handles storage failure honestly', async () => {
    const context = {
      actualDurationSec: 1200,
      actualRestDurationSec: 120,
      stepsSnapshot: structuredClone(steps),
      sequenceTitle: savedPlan.title,
      taughtStepIds: steps.map((step) => step.stepId),
    };

    // 1. First completion succeeds
    const onClose1 = vi.fn();
    const { unmount: unmount1 } = render(
      <LogSessionModal sequenceId={savedPlan.id} onClose={onClose1} context={context} />,
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 기록 남기기' })).getByRole('button', {
        name: '수업 기록 저장',
      }),
    );
    expect(onClose1).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    unmount1();

    // 2. Duplicate completion attempt for the same session is blocked
    const onClose2 = vi.fn();
    const { unmount: unmount2 } = render(
      <LogSessionModal sequenceId={savedPlan.id} onClose={onClose2} context={context} />,
    );
    const dupDialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    fireEvent.click(dupDialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(onClose2).not.toHaveBeenCalled();
    expect(dupDialog.getByRole('alert')).toHaveTextContent(
      /이미 동일한 수업 완료 이력이 기록되어 있습니다/,
    );
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    unmount2();

    // 3. Simulate page refresh (Zustand persist.rehydrate()) after mutating in-memory catalog
    const persistedRaw = localStorage.getItem(RECOVERY_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();

    act(() => {
      usePilatesStore.setState({
        historyLogs: [],
        exercises: INITIAL_EXERCISES,
      });
    });
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    localStorage.setItem(RECOVERY_STORAGE_KEY, persistedRaw!);

    await act(async () => {
      await usePilatesStore.persist.rehydrate();
    });

    const rehydratedLogs = usePilatesStore.getState().historyLogs as ClassHistoryLogWithSnapshot[];
    expect(rehydratedLogs).toHaveLength(1);
    expect(rehydratedLogs[0].programSnapshot).toBeDefined();
    expect(rehydratedLogs[0].programSnapshot?.items[0].exerciseSnapshot?.nameKo).toBe(
      '당시 풋워크 예열 동작',
    );
    expect(rehydratedLogs[0].programSnapshot?.items[2].exerciseSnapshot?.nameKo).toBe(
      '당시 헌드레드 코어 동작',
    );

    // 4. Simulate browser localStorage QuotaExceededError on a new session completion
    vi.setSystemTime(new Date('2026-11-06T10:00:00.000Z'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const onClose3 = vi.fn();
    render(
      <LogSessionModal
        sequenceId={savedPlan.id}
        onClose={onClose3}
        context={{ ...context, actualDurationSec: 1150 }}
      />,
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 기록 남기기' })).getByRole('button', {
        name: '수업 기록 저장',
      }),
    );
    await act(async () => {
      for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
    });

    const afterQuotaFail = usePilatesStore.getState();
    expect(afterQuotaFail.historyLogs).toHaveLength(2);
    expect(
      (afterQuotaFail.historyLogs[0] as ClassHistoryLogWithSnapshot).programSnapshot,
    ).toBeDefined();
    expect(afterQuotaFail.persistenceError).toEqual(expect.any(String));
    expect(afterQuotaFail.saveFeedback).toBeNull();
    expect(getRecoveryStorageStatus().ok).toBe(false);
  });
});
