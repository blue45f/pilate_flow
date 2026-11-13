import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryPreview } from './RecoveryPreview';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const raw = JSON.stringify({
  format: 'pilates-flow-atelier',
  version: 3,
  exportedAt: '2026-11-07T00:00:00.000Z',
  data: { exercises: [exercise], savedSequences: [], classGroups: [], historyLogs: [] },
});
function choose(contents = raw) {
  const file = new File([contents], 'PRIVATE_FILENAME.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(contents) });
  fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), { target: { files: [file] } });
}
beforeEach(async () => {
  usePilatesStore.setState(
    {
      ...original,
      exercises: [],
      savedSequences: [],
      classGroups: [],
      historyLogs: [],
      activeSteps: [],
      persistenceError: null,
    },
    true,
  );
  await Promise.resolve();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
});

describe('progressive backup preflight layout', () => {
  it('keeps the change summary and preservation rules visible while count details stay optional and read-only', async () => {
    render(<RecoveryPreview />);
    const before = usePilatesStore.getState();
    choose();
    await screen.findByRole('region', { name: '복구 전 확인' });
    expect(screen.getByRole('heading', { name: '복구 전 확인' })).toHaveFocus();
    expect(screen.getByText('아직 적용 전')).toBeVisible();
    expect(screen.getByText('새로 추가 1개')).toBeVisible();
    expect(screen.getByRole('region', { name: '복원 시 유지할 자료' })).toBeVisible();
    expect(screen.getByText(/작성자·무결성 서명·전문가 검수나 자격을/)).toBeVisible();
    const details = screen.getByText('자료 유형별 개수 자세히 보기').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByRole('table')).not.toBeVisible();
    fireEvent.click(screen.getByText('자료 유형별 개수 자세히 보기'));
    expect(details).toHaveAttribute('open');
    expect(screen.getByRole('table')).toHaveAccessibleName('파일을 적용할 때의 자료 개수');
    expect(usePilatesStore.getState()).toBe(before);
    expect(screen.getByText('PRIVATE_FILENAME.json')).toBeVisible();
    expect(screen.getByRole('region', { name: '선택한 백업' })).toBeVisible();
  });
  it('offers another file after a bounded error without applying or exposing the rejected content', async () => {
    render(<RecoveryPreview />);
    const before = usePilatesStore.getState();
    choose('{ PRIVATE_MALFORMED');
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: '다른 백업 선택' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '이 내용으로 복원 적용' })).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByRole('button', { name: '백업 불러오기' })).toHaveFocus();
    expect(usePilatesStore.getState()).toBe(before);
  });
  it('keeps the changed-current-data warning and reinspection action outside closed details', async () => {
    render(<RecoveryPreview />);
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    act(() => usePilatesStore.setState({ activeTitle: '합성 새 제목' }));
    expect(apply).toBeDisabled();
    expect(screen.getByText(/검토 후 현재 자료가 달라졌습니다/)).toBeVisible();
    const recheck = screen.getByRole('button', { name: '현재 자료로 다시 검토' });
    expect(recheck).toBeVisible();
    fireEvent.click(recheck);
    await waitFor(() => expect(apply).toBeEnabled());
    expect(screen.getByText('자료 유형별 개수 자세히 보기').closest('details')).not.toHaveAttribute(
      'open',
    );
    expect(usePilatesStore.getState().activeTitle).toBe('합성 새 제목');
  });
});
