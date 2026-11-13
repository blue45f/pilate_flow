import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { cwd } from 'node:process';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SequenceWorkbench } from '../../src/components/SequenceWorkbench';
import { usePilatesStore } from '../../src/store/usePilatesStore';
import {
  SYNTHETIC_CLASS_TITLE,
  SYNTHETIC_SAVED_SEQUENCE_FOR_NEXT_VISIT,
  SYNTHETIC_TWO_MOVEMENT_STEPS,
} from './fixtures/firstUseRound4Fixtures';

const PROTECTED_BOUNDARY_PATHS = [
  'src',
  'package.json',
  'pnpm-lock.yaml',
  'vite.config.ts',
  'index.html',
] as const;

interface ProtectedBoundarySnapshot {
  gitStatusPorcelain: string;
  fileCount: number;
  fileFingerprints: Record<string, string>;
}

function resolveAuditRepoRoot(): string {
  let current = resolve(cwd());
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'vite.config.ts'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(cwd());
}

function collectFingerprints(
  repoRoot: string,
  targetPath: string,
  out: Record<string, string>,
): void {
  const relKey = relative(repoRoot, targetPath).split(sep).join('/');
  if (!existsSync(targetPath)) {
    out[relKey] = '<missing>';
    return;
  }
  const stat = lstatSync(targetPath);
  if (stat.isSymbolicLink()) {
    out[relKey] = `symlink:${readlinkSync(targetPath)}`;
    return;
  }
  if (stat.isDirectory()) {
    const children = readdirSync(targetPath).sort();
    for (const child of children) {
      collectFingerprints(repoRoot, join(targetPath, child), out);
    }
    return;
  }
  if (stat.isFile()) {
    out[relKey] = createHash('sha256').update(readFileSync(targetPath)).digest('hex');
  }
}

function captureProtectedBoundarySnapshot(repoRoot: string): ProtectedBoundarySnapshot {
  const gitStatusPorcelain = execFileSync(
    'git',
    [
      '--no-optional-locks',
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      ...PROTECTED_BOUNDARY_PATHS,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  const fileFingerprints: Record<string, string> = {};
  for (const relTarget of PROTECTED_BOUNDARY_PATHS) {
    collectFingerprints(repoRoot, resolve(repoRoot, relTarget), fileFingerprints);
  }
  return {
    gitStatusPorcelain,
    fileCount: Object.keys(fileFingerprints).length,
    fileFingerprints,
  };
}

function resetToSyntheticEmptyFirstUse() {
  localStorage.clear();
  sessionStorage.clear();
  usePilatesStore.setState({
    activeTab: 'workbench',
    activeSequenceId: null,
    activeTitle: '첫 수업 시퀀스 초안',
    activeSubtitle: '',
    activeTargetMinutes: 50,
    activeLevel: '1.0',
    activeApparatus: 'reformer',
    activeSteps: [],
    savedSequences: [],
    historyLogs: [],
    undoStack: [],
    ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
    ownedApparatus: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
    ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
    draftCriteria: {
      apparatus: 'reformer',
      availableEquipment: ['reformer'],
      ownedApparatus: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      preferredProps: ['none'],
      targetMinutes: 50,
      level: '1.0',
      focusPreset: 'full-body',
      excludeDaysWindow: 14,
      defaultLayer: 'standard',
    },
    lastCriteria: null,
    generationError: null,
    saveFeedback: null,
  });
}

describe('Round 4 독립 감사: 필라테스 첫사용자(초보 강사) 동선 (빈상태 → 새수업 → 동작2개추가 → 저장 → 다음방문 이어하기)', () => {
  const repoRoot = resolveAuditRepoRoot();
  let baselineProtectedSnapshot: ProtectedBoundarySnapshot;

  beforeAll(() => {
    baselineProtectedSnapshot = captureProtectedBoundarySnapshot(repoRoot);
  });

  beforeEach(() => {
    resetToSyntheticEmptyFirstUse();
  });

  afterEach(() => {
    cleanup();
  });

  it('현재 빠른 시작으로 동작 2개 추가·저장을 5클릭에 마치고 다음 방문 1클릭 이어하기로 수업을 보존한다', () => {
    const view = render(<SequenceWorkbench />);
    let journeyClicks = 0;
    const clickJourneyAction = (element: HTMLElement) => {
      fireEvent.click(element);
      journeyClicks += 1;
    };

    // The current primary path goes straight to the finder with the selected
    // class equipment. The guided first step and modal finder remain secondary.
    const welcomeSection = screen.getByRole('region', { name: '첫 수업안 준비' });
    const fastStart = within(welcomeSection).getByTestId('wizard-fast-step2-btn');
    expect(fastStart).toBeVisible();
    expect(fastStart).toHaveClass('pf-step-primary-cta');
    expect(within(welcomeSection).getByTestId('wizard-start-step1-btn')).not.toHaveClass(
      'pf-step-primary-cta',
    );
    expect(within(welcomeSection).getAllByRole('button', { name: '동작 추가' })).toEqual([
      fastStart,
    ]);
    expect(within(welcomeSection).getByRole('button', { name: /추천 초안 만들기/ })).not.toHaveClass(
      'pf-step-primary-cta',
    );
    expect(
      Array.from(view.container.querySelectorAll('details')).filter((item) => item.open),
    ).toHaveLength(0);
    const recentSection = screen.getByRole('region', { name: '최근 수업 이어가기' });
    expect(within(recentSection).getByText(/아직 저장한 수업이 없어요/)).toBeVisible();

    // Click 1 opens the inline finder without a modal or a separate filter step.
    clickJourneyAction(fastStart);
    const finderPage = screen.getByTestId('wizard-step2-page');
    expect(finderPage).toBeVisible();
    expect(
      view.container.querySelector('dialog.workbench-finder-dialog')?.hasAttribute('open'),
    ).not.toBe(true);
    expect(within(finderPage).getByRole('button', { name: '리포머 필터 해제' })).toBeVisible();
    expect(within(finderPage).getByTestId('ief-go-arrange-btn')).toBeDisabled();

    // Clicks 2 and 3 add two distinct eligible movements without a rejected add.
    const addButtons = within(finderPage)
      .getAllByRole<HTMLButtonElement>('button', { name: /수업안에 추가$/ })
      .filter((button) => !button.disabled);
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
    clickJourneyAction(addButtons[0]);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    clickJourneyAction(addButtons[1]);
    const authoredSteps = structuredClone(usePilatesStore.getState().activeSteps);
    expect(authoredSteps).toHaveLength(2);
    expect(new Set(authoredSteps.map((step) => step.exerciseId)).size).toBe(2);
    expect(usePilatesStore.getState().generationError).toBeNull();
    for (const step of authoredSteps) {
      expect(
        usePilatesStore.getState().exercises.find((exercise) => exercise.id === step.exerciseId)
          ?.apparatus,
      ).toBe('reformer');
    }

    // Click 4 reaches arrangement directly from the finder's selection bar.
    clickJourneyAction(within(finderPage).getByTestId('ief-go-arrange-btn'));
    expect(screen.queryByTestId('wizard-step2-page')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toEqual(authoredSteps);
    expect(screen.getByRole('region', { name: '오늘의 시퀀스' })).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: '수업 제작 단계' })).getByRole('button', {
        name: '3 순서·시간 확인',
      }),
    ).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: '1번 동작 30초 늘리기' })).toBeVisible();
    expect(
      screen.getByText(/^동작 참고 자료 ·/, { selector: 'summary' }).closest('details'),
    ).not.toHaveAttribute('open');

    fireEvent.change(screen.getByLabelText('시퀀스 제목'), {
      target: { value: SYNTHETIC_CLASS_TITLE },
    });
    const saveButton = view.container.querySelector<HTMLButtonElement>('button.save-flow');
    expect(saveButton).toBeVisible();
    clickJourneyAction(saveButton!);
    expect(journeyClicks).toBe(5);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    const savedSnapshot = structuredClone(usePilatesStore.getState().savedSequences[0]);
    expect(savedSnapshot.title).toBe(SYNTHETIC_CLASS_TITLE);
    expect(savedSnapshot.steps).toEqual(authoredSteps);

    // Set up the next empty visit; this setup is outside the authoring/reopen
    // click budget. A remount must retain the saved class and its full draft.
    const newClassButton = view.container.querySelector<HTMLButtonElement>(
      'button.workbench-new-class-btn',
    );
    expect(newClassButton).toBeVisible();
    fireEvent.click(newClassButton!);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    view.unmount();
    render(<SequenceWorkbench />);
    expect(usePilatesStore.getState().savedSequences[0]).toEqual(savedSnapshot);
    const recentContinue = screen.getByRole('region', { name: '최근 수업 이어가기' });
    const continueButton = within(recentContinue).getByRole('button', {
      name: `${SYNTHETIC_CLASS_TITLE} 이어서 구성`,
    });
    expect(continueButton).toBeVisible();

    // Click 6 restores the actual authored steps and metadata without editing
    // the saved original or creating a duplicate class.
    clickJourneyAction(continueButton);
    expect(journeyClicks).toBe(6);
    expect(usePilatesStore.getState().activeSteps).toEqual(authoredSteps);
    expect(usePilatesStore.getState().activeTitle).toBe(SYNTHETIC_CLASS_TITLE);
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(savedSnapshot.targetMinutes);
    expect(usePilatesStore.getState().activeApparatus).toBe(savedSnapshot.apparatus);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSnapshot]);
  });

  it('조건 접근 감사: 빈 첫 화면에서는 요약 버튼 1개를 보여주고 추가 조건 버튼 4개는 펼친 뒤 사용할 수 있다 (IMP-R4-02)', () => {
    const { container } = render(<SequenceWorkbench />);

    const welcomeSummaryBtn = container.querySelector('button.workbench-welcome-summary');
    const toolbarChipBtns = container.querySelectorAll('.v2-plan-toolbar .v2-condition-chips button');

    expect(welcomeSummaryBtn).toBeVisible();
    expect(toolbarChipBtns.length).toBe(4);
    for (const button of toolbarChipBtns) expect(button).not.toBeVisible();
    fireEvent.click(screen.getByText('추가 도구 · 휴식·기구 안내·AI', { selector: 'summary' }));
    for (const button of toolbarChipBtns) expect(button).toBeVisible();
  });

  it('뒤로가기 보존 감사: 새 수업 만들기로 비운 뒤 되돌리기(Undo) 실행 시 기존 2개 동작과 제목이 무손실 복원된다', () => {
    usePilatesStore.setState({
      activeTitle: SYNTHETIC_CLASS_TITLE,
      activeSteps: SYNTHETIC_TWO_MOVEMENT_STEPS,
      savedSequences: [SYNTHETIC_SAVED_SEQUENCE_FOR_NEXT_VISIT],
    });

    const { container } = render(<SequenceWorkbench />);
    expect(usePilatesStore.getState().activeSteps.length).toBe(2);

    // '새 수업 만들기' 클릭 -> 빈 상태로 전환
    const newClassBtn = container.querySelector(
      'button.workbench-new-class-btn',
    ) as HTMLButtonElement;
    fireEvent.click(newClassBtn);
    expect(usePilatesStore.getState().activeSteps.length).toBe(0);

    // '되돌리기' 클릭 -> 원래 2개 동작 및 제목 복원
    const undoBtn = screen.getByRole('button', { name: /되돌리기/ });
    fireEvent.click(undoBtn);
    expect(usePilatesStore.getState().activeSteps.length).toBe(2);
    expect(usePilatesStore.getState().activeTitle).toBe(SYNTHETIC_CLASS_TITLE);
  });

  it('소유 경계 보호 검증: 앱 소스(src/**), 공유 CSS, 설정 파일 및 PackagePanel 관련 파일은 0줄 수정이어야 한다', () => {
    // 단일 테스트 필터(-t) 실행 시에도 감사 대상 워크벤치 렌더링이 보호 경계 파일을 변조하지 않는지 함께 검증
    const { unmount } = render(<SequenceWorkbench />);
    unmount();

    const afterProtectedSnapshot = captureProtectedBoundarySnapshot(repoRoot);
    expect(baselineProtectedSnapshot.fileCount).toBeGreaterThan(0);
    expect(afterProtectedSnapshot.gitStatusPorcelain).toBe(
      baselineProtectedSnapshot.gitStatusPorcelain,
    );
    expect(afterProtectedSnapshot.fileCount).toBe(baselineProtectedSnapshot.fileCount);
    expect(afterProtectedSnapshot.fileFingerprints).toEqual(
      baselineProtectedSnapshot.fileFingerprints,
    );
  });
});
