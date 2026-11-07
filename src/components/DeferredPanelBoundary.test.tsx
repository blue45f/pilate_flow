import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { DeferredPanelBoundary } from './DeferredPanelBoundary';

const controlled = vi.hoisted(() => ({
  cloudError: new Error('PRIVATE_CSS_PRELOAD_FAILURE https://private.invalid/cloud-panel.css'),
}));
vi.mock('./CloudSyncPanel', () => {
  throw controlled.cloudError;
});
vi.mock('./SequenceWorkbench', () => ({
  SequenceWorkbench: () => <div>수업 작업실 유지</div>,
}));

const message =
  '계정 백업 화면을 불러오지 못했어요. 아래 전체 백업과 JSON 복구는 계속 사용할 수 있어요.';
const warning =
  '새로고침하면 적용 전 입력 내용이 사라질 수 있어요. 필요한 자료를 먼저 백업해 주세요.';
const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);

/** React's expected caught-error report is suppressed; every other console error fails. */
function captureExpectedError(failure: Error) {
  const unexpected: unknown[][] = [];
  const reported = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    // Vitest wraps a throwing import factory; accept only that exact controlled cause.
    if (
      !args.some(
        (value) => value === failure || (value instanceof Error && value.cause === failure),
      )
    )
      unexpected.push(args);
  });
  return () => {
    expect(reported).toHaveBeenCalled();
    expect(unexpected).toEqual([]);
  };
}

beforeEach(() => {
  // Backup draft timestamps are generated at export; hold Date steady while timers stay real.
  vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      exercises: [exercise],
      activeSteps: [
        {
          stepId: 'qa-boundary-step',
          order: 1,
          exerciseId: exercise.id,
          blockCategory: 'core',
          durationMin: 5,
          selectedLayer: 'standard',
          instructorNote: 'QA local draft preserved',
        },
      ],
      savedSequences: [],
      historyLogs: [],
      classGroups: [],
      undoStack: [],
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('optional account-panel failure containment', () => {
  it('renders successful children normally without a fallback or reload', () => {
    const onReload = vi.fn();
    const onClick = vi.fn();
    render(
      <DeferredPanelBoundary onReload={onReload}>
        <button onClick={onClick}>정상 계정 패널</button>
      </DeferredPanelBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: '정상 계정 패널' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '페이지 새로고침' })).not.toBeInTheDocument();
  });

  it('catches an actual lazy promise rejection, keeps it contained and reloads only after an explicit click', async () => {
    const failure = new Error('PRIVATE_LAZY_FAILURE https://private.invalid/chunk.js');
    const verifyExpectedError = captureExpectedError(failure);
    let reject!: (reason: Error) => void;
    const importer = vi.fn(
      () =>
        new Promise<{ default: ComponentType }>((_resolve, rejectImport) => {
          reject = rejectImport;
        }),
    );
    const Deferred = lazy(importer);
    const onReload = vi.fn();
    const before = usePilatesStore.getState();
    const view = render(
      <DeferredPanelBoundary onReload={onReload}>
        <Suspense fallback={<p role="status">불러오는 중</p>}>
          <Deferred />
        </Suspense>
      </DeferredPanelBoundary>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
    expect(importer).toHaveBeenCalledOnce();
    expect(onReload).not.toHaveBeenCalled();
    await act(async () => {
      reject(failure);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText(warning)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('PRIVATE_LAZY_FAILURE');
    expect(document.body).not.toHaveTextContent('private.invalid');
    expect(onReload).not.toHaveBeenCalled();
    view.rerender(
      <DeferredPanelBoundary onReload={onReload}>
        <Suspense fallback={<p role="status">불러오는 중</p>}>
          <Deferred />
        </Suspense>
      </DeferredPanelBoundary>,
    );
    expect(importer).toHaveBeenCalledOnce();
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '페이지 새로고침' }));
    expect(onReload).toHaveBeenCalledOnce();
    expect(importer).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState()).toBe(before);
    verifyExpectedError();
  });

  it('keeps the actual App, inventory, full export and JSON recovery usable after the cloud lazy import rejects', async () => {
    const verifyExpectedError = captureExpectedError(controlled.cloudError);
    const before = usePilatesStore.getState();
    const persistedBefore = localStorage.getItem('pilates-flow-atelier-storage-v3');
    const expectedData = JSON.parse(before.exportBackup()).data;
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:qa-local-backup');
    const revokeObjectURL = vi.fn();
    const BrowserURL = URL;
    vi.stubGlobal(
      'URL',
      class extends BrowserURL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '데이터 백업과 사용 안내' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    const settings = screen.getByRole('dialog', { name: '나의 스튜디오' });
    expect(screen.getByText('수업 작업실 유지')).toBeInTheDocument();
    expect(within(settings).getByRole('heading', { name: '내 보유 기구와 소도구' })).toBeVisible();
    expect(await within(settings).findByRole('button', { name: '백업 불러오기' })).toBeEnabled();
    expect(document.body).not.toHaveTextContent('PRIVATE_CSS_PRELOAD_FAILURE');
    expect(document.body).not.toHaveTextContent('private.invalid');
    fireEvent.click(within(settings).getByRole('button', { name: '전체 백업' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/json');
    const exportedRaw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(createObjectURL.mock.calls[0][0]);
    });
    expect(JSON.parse(exportedRaw).data).toEqual(expectedData);
    expect(
      within(settings).getAllByText(
        '백업 파일을 만들었습니다. 기기 변경 전 안전한 곳에 보관해 주세요.',
      )[0],
    ).toBeInTheDocument();
    const file = new File(['not JSON'], 'qa-read-only-invalid.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => 'not JSON' });
    fireEvent.change(within(settings).getByLabelText('백업 JSON 파일 선택'), {
      target: { files: [file] },
    });
    const recovery = await within(settings).findByRole('region', { name: '복구 전 확인' });
    expect(within(recovery).getByText('현재 자료와 초안은 바꾸지 않았습니다.')).toBeInTheDocument();
    expect(within(settings).getByRole('button', { name: '전체 백업' })).toBeEnabled();
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem('pilates-flow-atelier-storage-v3')).toBe(persistedBefore);
    await waitFor(
      () => expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:qa-local-backup'),
      { timeout: 1500 },
    );
    verifyExpectedError();
  });
});
