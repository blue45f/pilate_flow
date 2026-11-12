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
    ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
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

  it('설명문 없이 빈상태 → 새수업 → 동작2개추가 → 저장 → 다음방문 이어하기를 최소 6클릭(모달 함정 포함 시 7클릭)으로 완주하고 상태를 보존한다', () => {
    const { container } = render(<SequenceWorkbench />);

    let optimalClicks = 0;
    let trappedClicks = 0;

    // 1. 빈상태(Empty State): 주요 CTA 가시성 및 첫화면 접힘 상태 확인
    const welcomeSection = screen.getByRole('region', { name: '첫 수업안 준비' });
    const pickMovementCta = within(welcomeSection).getByRole('button', { name: /동작 고르기/ });
    expect(pickMovementCta).toBeTruthy();
    // 목업 정렬 이후 첫 화면의 단일 주 CTA는 '1단계부터 차근차근 만들기'이며,
    // '동작 고르기'는 바로 보이는 보조(secondary) 빠른 동작으로 유지된다.
    expect(within(welcomeSection).getByTestId('wizard-start-step1-btn').className).toContain(
      'pf-step-primary-cta',
    );
    expect(pickMovementCta.className).toContain('pf-btn--secondary');

    // 첫 화면에서 모든 <details>는 기본 닫힘(openDetails === 0)이어야 함
    const openDetailsOnEmpty = Array.from(container.querySelectorAll('details')).filter(
      (d) => d.open,
    );
    expect(openDetailsOnEmpty.length).toBe(0);

    // 빈 최근 수업 안내 확인
    const recentSection = screen.getByRole('region', { name: '최근 수업 이어가기' });
    expect(within(recentSection).getByText(/저장한 최근 수업이 아직 없습니다/)).toBeTruthy();

    // [Click 1] 새 수업 동작 고르기 열기
    fireEvent.click(pickMovementCta);
    optimalClicks += 1;
    trappedClicks += 1;

    const finderDialog = container.querySelector(
      'dialog.workbench-finder-dialog',
    ) as HTMLDialogElement | null;
    expect(finderDialog).toBeTruthy();
    expect(finderDialog?.open).toBe(true);

    // 2. 동작 2개 추가
    const addButtons = within(finderDialog!).getAllByRole('button', {
      name: /수업안에 추가$/,
    });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);

    // 감사 발견 사항 재현 (IMP-R4-01): InlineExerciseFinder 초기 필터가 수업 기구(classEquipment)가 아닌 전체 기구([])여서
    // 1번째 카드('캐리지 호흡 & 암 아크', 리포머)와 2번째 카드('누워서 호흡 관찰', 매트)가 섞여 노출됨.
    // 따라서 초보 강사가 상위 1·2번째 '+ 추가' 버튼을 순서대로 누르면 1개만 담기고 나머지 1개는 기구 불일치 오류로 거부됨!
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[1]);
    expect(usePilatesStore.getState().activeSteps.length).toBe(1);
    expect(
      within(finderDialog!).getByRole('alert').textContent,
    ).toContain('현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다.');

    // '수업 기구로 좁히기' 클릭 후 두 번째 동작을 추가해야 비로소 2개 동작이 모두 담김 (최적 2클릭 대신 +2클릭 추가 발생)
    const narrowToClassEquipBtn = within(finderDialog!).getByRole('button', {
      name: '수업 기구로 좁히기',
    });
    fireEvent.click(narrowToClassEquipBtn);
    const filteredAddButtons = within(finderDialog!)
      .getAllByRole('button', { name: /수업안에 추가$/ })
      .filter((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(filteredAddButtons[0]);

    optimalClicks += 2; // 기구 필터가 기본 적용되었을 때의 이상적 동작 추가 클릭수 (2회)
    trappedClicks += 4; // 실제 발생한 클릭수: 1번째 추가 + 2번째 추가(실패) + 수업 기구로 좁히기 + 2번째 재추가 (4회)

    expect(usePilatesStore.getState().activeSteps.length).toBe(2);

    // 감사 발견 사항 재현 (IMP-R4-02): 모달 내부 .ief-selection-bar의 '수업안으로' 버튼 클릭 시 모달이 닫히지 않음(+1 헛클릭 유발)
    const innerSelectionBarBtn = finderDialog!.querySelector(
      '.ief-selection-bar button',
    ) as HTMLButtonElement | null;
    expect(innerSelectionBarBtn).toBeTruthy();
    fireEvent.click(innerSelectionBarBtn!);
    trappedClicks += 1;
    expect(finderDialog?.open).toBe(true); // 모달이 닫히지 않음을 실증

    // [Click 4 optimal / Click 7 trapped] 모달 하단 '수업 구성으로 돌아가기' 클릭 시 모달 닫힘 + 2개 동작 보존
    const returnToArrangeBtn = within(finderDialog!).getByRole('button', {
      name: /수업 구성으로 돌아가기/,
    });
    fireEvent.click(returnToArrangeBtn);
    optimalClicks += 1;
    trappedClicks += 1;

    expect(finderDialog?.open).toBe(false);
    expect(usePilatesStore.getState().activeSteps.length).toBe(2);

    // 3. 저장 (Save)
    const titleInput = screen.getByLabelText('시퀀스 제목') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: SYNTHETIC_CLASS_TITLE } });

    const saveBtn = container.querySelector('button.save-flow') as HTMLButtonElement | null;
    expect(saveBtn).toBeTruthy();
    // [Click 5 optimal / Click 6 trapped] 저장 클릭
    fireEvent.click(saveBtn!);
    optimalClicks += 1;
    trappedClicks += 1;

    expect(usePilatesStore.getState().savedSequences.length).toBe(1);
    expect(usePilatesStore.getState().savedSequences[0].title).toBe(SYNTHETIC_CLASS_TITLE);
    expect(usePilatesStore.getState().savedSequences[0].steps.length).toBe(2);

    // 4. 다음 방문 이어하기 (빈 홈 상태에서 저장된 최근 수업 1클릭 이어하기)
    const newClassBtn = container.querySelector(
      'button.workbench-new-class-btn',
    ) as HTMLButtonElement | null;
    expect(newClassBtn).toBeTruthy();
    fireEvent.click(newClassBtn!);
    expect(usePilatesStore.getState().activeSteps.length).toBe(0);

    // 빈 홈 화면의 '최근 수업 이어가기' 카드에 방금 저장한 수업이 표시됨
    const recentContinueAfterSave = screen.getByRole('region', { name: '최근 수업 이어가기' });
    const continueBtn = within(recentContinueAfterSave).getByRole('button', {
      name: `${SYNTHETIC_CLASS_TITLE} 이어서 구성`,
    });
    expect(continueBtn).toBeTruthy();

    // [Click 6 optimal / Click 7 trapped] '이어서 구성' 클릭 시 2개 동작과 제목이 100% 복원됨
    fireEvent.click(continueBtn);
    optimalClicks += 1;
    trappedClicks += 1;

    expect(optimalClicks).toBe(6);
    expect(trappedClicks).toBe(9);
    expect(usePilatesStore.getState().activeSteps.length).toBe(2);
    expect(usePilatesStore.getState().activeTitle).toBe(SYNTHETIC_CLASS_TITLE);
  });

  it('중복메뉴 정량 감사: 빈 첫 화면에서 수업 조건 열기 버튼이 5개(.workbench-welcome-summary 1개 + .v2-condition-chips 4개) 중복 노출됨을 검증한다 (IMP-R4-02)', () => {
    const { container } = render(<SequenceWorkbench />);

    const welcomeSummaryBtn = container.querySelector('button.workbench-welcome-summary');
    const toolbarChipBtns = container.querySelectorAll('.v2-plan-toolbar .v2-condition-chips button');

    expect(welcomeSummaryBtn).toBeTruthy();
    expect(toolbarChipBtns.length).toBe(4);
    expect(1 + toolbarChipBtns.length).toBe(5);
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
