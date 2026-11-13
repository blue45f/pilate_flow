import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { EXERCISE_MOTION_REFERENCES, MOTION_PROTOTYPES } from '../data/motionReferences';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, PilatesExercise } from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { classSimulationFixture } from './classSimulationFixtures';
import { openAdvancedWorkbench } from './workbenchControls';

// Transform the retained advanced tools before the timed rehearsal assertions.
// The journey still enters them through the actual studio disclosure.
beforeAll(async () => {
  await import('../components/SequenceWorkbench');
}, 60000);

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const references = structuredClone(VERIFIED_REFERENCES);
const productionIds = new Set(production.map((exercise) => exercise.id));
const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
let visible = true;
let reduced = false;
const mediaListeners = new Set<() => void>();

const storedState = () => JSON.parse(JSON.stringify(usePilatesStore.getState()));
const tick = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));
const fakeClock = () => {
  vi.useFakeTimers({
    toFake: ['Date', 'performance', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  vi.setSystemTime(new Date('2026-11-05T09:00:00Z'));
};

function seed(targetMinutes: 17 | 50 | 60 = 50, oddPairedMovement = false) {
  const fixture = classSimulationFixture(targetMinutes, oddPairedMovement);
  const criteria: AutoGenerateCriteria = {
    apparatus: 'mat',
    ownedApparatus: ['mat'],
    availableEquipment: ['mat'],
    level: '1.0',
    focusPreset: 'full-body',
    preferredProps: ['none'],
    excludeDaysWindow: 0,
    targetMinutes,
    restMinutes: fixture.expected.restSec / 60,
    targetGroupId: INITIAL_CLASS_GROUPS[0].id,
    defaultLayer: 'standard',
  };
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      exercises: [...structuredClone(production), ...fixture.exercises],
      activeSequenceId: 'qa-class-simulation-current-draft',
      activeTitle: fixture.title,
      activeSubtitle: '합성 QA 산술 계획 · 운동 시범이나 처방 아님',
      activeSteps: structuredClone(fixture.steps),
      activeTargetMinutes: targetMinutes,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
      draftCriteria: criteria,
      lastCriteria: structuredClone(criteria),
      ownedApparatus: ['mat'],
      ownedEquipment: ['mat'],
      ownedProps: [],
      undoStack: [],
      historyLogs: [
        {
          id: 'qa-class-simulation-existing-history',
          sequenceId: 'qa-class-simulation-existing-plan',
          sequenceTitle: '합성 QA 기존 기록 · 실제 수업 아님',
          groupId: INITIAL_CLASS_GROUPS[0].id,
          groupName: INITIAL_CLASS_GROUPS[0].name,
          taughtAt: '2026-11-04T09:00:00Z',
          apparatus: 'mat',
          level: '1.0',
          exerciseIds: [fixture.exercises[0].id],
          rating: 4,
          intensity: 'moderate',
          instructorReflection: '합성 QA 보존 대상',
          actualDurationSec: 60,
          actualRestDurationSec: 0,
        },
      ],
      savedSequences: [
        {
          id: 'qa-class-simulation-existing-plan',
          title: '합성 QA 기존 저장본 · 실제 수업 아님',
          subtitle: '',
          apparatus: 'mat',
          level: '1.0',
          focusTags: ['합성 QA'],
          targetMinutes,
          steps: structuredClone(fixture.steps),
          createdAt: '2026-11-04T09:00:00Z',
          updatedAt: '2026-11-04T09:00:00Z',
          taughtCount: 1,
        },
      ],
    },
    true,
  );
  return fixture;
}

async function openPreview() {
  render(<App />);
  await openAdvancedWorkbench();
  const opener = await screen.findByRole('button', { name: '시퀀스 미리보기' }, { timeout: 10000 });
  opener.focus();
  fireEvent.click(opener);
  const element = await screen.findByRole('dialog', { name: '전체 수업 계획 미리보기' });
  const dialog = within(element);
  const controls = within(dialog.getByRole('region', { name: '수업 시간표 리허설' }));
  return {
    element,
    dialog,
    controls,
    range: controls.getByRole('slider', { name: '수업 시간표 위치' }) as HTMLInputElement,
  };
}

function seek(range: HTMLInputElement, seconds: number) {
  fireEvent.change(range, { target: { value: String(seconds) } });
}

function restoreDescriptor(target: object, name: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else Reflect.deleteProperty(target, name);
}

describe('actual full-class rehearsal and read-only evidence journeys', { timeout: 60000 }, () => {
  beforeEach(() => {
    visible = true;
    reduced = false;
    mediaListeners.clear();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (visible ? 'visible' : 'hidden'),
    });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => !visible });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(
        (query: string) =>
          ({
            media: query,
            get matches() {
              return query.includes('prefers-reduced-motion') && reduced;
            },
            addEventListener: (_type: string, listener: () => void) => mediaListeners.add(listener),
            removeEventListener: (_type: string, listener: () => void) =>
              mediaListeners.delete(listener),
            addListener: (listener: () => void) => mediaListeners.add(listener),
            removeListener: (listener: () => void) => mediaListeners.delete(listener),
          }) as unknown as MediaQueryList,
      ),
    });
    localStorage.clear();
    seed();
  });

  afterEach(() => {
    cleanup();
    expect(INITIAL_EXERCISES).toEqual(production);
    expect(
      usePilatesStore.getState().exercises.filter((exercise) => productionIds.has(exercise.id)),
    ).toEqual(production);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(VERIFIED_REFERENCES).toEqual(references);
    expect(EXERCISE_MOTION_REFERENCES).toHaveLength(158);
    expect(
      EXERCISE_MOTION_REFERENCES.every(
        (item) => item.status === 'not_authored' && item.asset === null && !item.expertApproved,
      ),
    ).toBe(true);
    expect(MOTION_PROTOTYPES).toHaveLength(2);
    expect(
      MOTION_PROTOTYPES.every(
        (item) => item.exerciseId === null && item.professionalReviewStatus === 'unreviewed',
      ),
    ).toBe(true);
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreDescriptor(document, 'visibilityState', originalVisibility);
    restoreDescriptor(document, 'hidden', originalHidden);
    restoreDescriptor(window, 'matchMedia', originalMatchMedia);
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it.each([
    [17, '전체17:00동작·설명·전환15:00휴식02:00', '수행12:00티칭01:45전환01:15휴식02:00'],
    [50, '전체50:00동작·설명·전환48:00휴식02:00', '수행45:00티칭01:45전환01:15휴식02:00'],
    [60, '전체60:00동작·설명·전환55:00휴식05:00', '수행52:00티칭01:45전환01:15휴식05:00'],
  ] as const)(
    'opens an exact %i-minute class paused with every time budget counted once',
    async (minutes, totals, partition) => {
      const fixture = seed(minutes);
      const before = storedState();
      const { dialog, controls, range } = await openPreview();
      expect(dialog.getByLabelText('미리보기 시간 구성')).toHaveTextContent(totals);
      expect(controls.getByLabelText('세부 시간 예산')).toHaveTextContent(partition);
      expect(range).toHaveAttribute('max', String(fixture.expected.totalSec));
      expect(range).toHaveValue('0');
      expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
      expect(dialog.getByRole('button', { name: '수업 시작' })).toBeEnabled();
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
      expect(
        controls.queryByRole('button', { name: '시간표 리허설 일시정지' }),
      ).not.toBeInTheDocument();
      fakeClock();
      tick(8);
      expect(range).toHaveValue('0');
      expect(dialog.getByRole('region', { name: '선택한 계획 항목' })).toHaveTextContent(
        '8회 × 2세트',
      );
      expect(dialog.queryByRole('dialog', { name: '수업 기록 남기기' })).not.toBeInTheDocument();
      expect(storedState()).toEqual(before);
    },
  );

  it('plays only explicitly, follows odd-second side boundaries and rest, then stops at the exact end without recording a class', async () => {
    const fixture = seed(50, true);
    const before = storedState();
    const { dialog, controls, range } = await openPreview();
    fakeClock();
    fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
    tick(30);
    expect(Number(range.value)).toBe(30);
    expect(dialog.getByLabelText('현재 시간표 구간')).toHaveTextContent('수행 · 양쪽 함께');
    fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 일시정지' }));
    tick(10);
    expect(Number(range.value)).toBe(30);
    seek(range, 869);
    expect(dialog.getByRole('region', { name: '선택한 계획 항목' })).toHaveTextContent(
      fixture.exercises[1].nameKo,
    );
    expect(dialog.getByLabelText('현재 시간표 구간')).toHaveTextContent('수행 · 왼쪽');
    expect(
      dialog.getByRole('button', { name: '2번 항목 수행 · 왼쪽 구간 보기' }),
    ).toHaveTextContent('08:00.5');
    seek(range, 1349.5);
    expect(dialog.getByLabelText('현재 시간표 구간')).toHaveTextContent('수행 · 오른쪽');
    seek(range, 1860);
    const rest = within(dialog.getByRole('region', { name: '선택한 계획 항목' }));
    expect(rest.getByRole('heading', { name: '중간 휴식' })).toBeInTheDocument();
    expect(rest.queryByRole('region', { name: /근거와 검토 상태/ })).not.toBeInTheDocument();
    expect(rest.queryByText(fixture.exercises[0].cues[0])).not.toBeInTheDocument();
    expect(rest.queryByRole('region', { name: '동작 모션 제작 상태' })).not.toBeInTheDocument();
    seek(range, 2999);
    fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
    tick(1.25);
    expect(Number(range.value)).toBe(3000);
    expect(controls.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('계획 끝');
    expect(
      controls.queryByRole('button', { name: '시간표 리허설 일시정지' }),
    ).not.toBeInTheDocument();
    tick(30);
    expect(Number(range.value)).toBe(3000);
    expect(storedState()).toEqual(before);
  });

  it.each([
    'pending',
    'stale',
    'missing',
    'normalized-duplicate',
    'target-mismatch',
    'rest-only',
    'empty',
  ] as const)(
    'preserves data guards and permits valid %s plans without review approval',
    async (kind) => {
      const fixture = seed();
      const state = usePilatesStore.getState();
      if (kind === 'pending')
        usePilatesStore.setState({
          exercises: state.exercises.map((item) =>
            item.id === fixture.exercises[0].id ? { ...item, review: undefined } : item,
          ),
        });
      if (kind === 'stale')
        usePilatesStore.setState({
          exercises: state.exercises.map((item) =>
            item.id === fixture.exercises[0].id
              ? { ...item, cues: ['합성 QA 변경 후 미검토 메모'] }
              : item,
          ),
        });
      if (kind === 'missing')
        usePilatesStore.setState({
          exercises: state.exercises.filter((item) => item.id !== fixture.exercises[0].id),
        });
      if (kind === 'normalized-duplicate') {
        const duplicate: PilatesExercise = {
          ...fixture.exercises[2],
          id: 'qa-synthetic-class-family-duplicate',
          movementFamily: fixture.exercises[0].movementFamily!.toUpperCase().replaceAll('-', ' / '),
        };
        duplicate.review = { ...duplicate.review!, revision: exerciseRevision(duplicate) };
        expect(isExerciseAutoEligible(duplicate)).toBe(true);
        usePilatesStore.setState({
          exercises: [...state.exercises, duplicate],
          activeSteps: state.activeSteps.map((step, index) =>
            index === 3 ? { ...step, exerciseId: duplicate.id } : step,
          ),
        });
      }
      if (kind === 'target-mismatch') usePilatesStore.setState({ activeTargetMinutes: 51 });
      if (kind === 'rest-only') usePilatesStore.setState({ activeSteps: [fixture.steps[2]] });
      if (kind === 'empty') usePilatesStore.setState({ activeSteps: [] });
      const before = storedState();
      if (kind === 'empty') {
        render(<App />);
        await openAdvancedWorkbench();
        expect(screen.queryByRole('button', { name: '시퀀스 미리보기' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
        expect(
          screen.queryByRole('dialog', { name: '전체 수업 계획 미리보기' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('timer')).not.toBeInTheDocument();
        expect(storedState()).toEqual(before);
        return;
      }
      const { dialog, controls, range } = await openPreview();
      if (
        kind === 'pending' ||
        kind === 'stale' ||
        kind === 'normalized-duplicate' ||
        kind === 'target-mismatch'
      ) {
        expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
        expect(dialog.getByRole('button', { name: '수업 시작' })).toBeEnabled();
        fakeClock();
        fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
        tick(3);
        expect(Number(range.value)).toBeGreaterThan(0);
        expect(storedState()).toEqual(before);
        expect(screen.queryByRole('timer')).not.toBeInTheDocument();
        return;
      }
      expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
      expect(dialog.getByRole('button', { name: '수업 시작' })).toBeDisabled();
      fireEvent.click(dialog.getByRole('button', { name: '수업 시작' }));
      fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
      fakeClock();
      tick(3);
      expect(Number(range.value)).toBe(0);
      seek(range, Math.min(60, Number(range.max)));
      expect(Number(range.value)).toBeGreaterThan(0);
      expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
      if (kind === 'rest-only')
        expect(controls.getByText(/휴식 외의 동작을 추가해 주세요/)).toBeInTheDocument();
      if (kind === 'missing') {
        const selected = within(dialog.getByRole('region', { name: '선택한 계획 항목' }));
        expect(
          selected.queryByRole('region', { name: '내 강사 검토 티칭 메모' }),
        ).not.toBeInTheDocument();
        expect(selected.queryByText(fixture.exercises[0].cues[0])).not.toBeInTheDocument();
        expect(selected.queryByText(fixture.steps[0].instructorNote!)).not.toBeInTheDocument();
      }
      expect(storedState()).toEqual(before);
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    },
  );

  it('pauses on speed, seek, manual navigation, visibility and page lifecycle, and closes without carrying a running timer into reopening', async () => {
    const fixture = seed();
    const before = storedState();
    const { dialog, controls, range } = await openPreview();
    fakeClock();
    const start = () =>
      fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
    start();
    tick(1);
    fireEvent.change(controls.getByRole('combobox', { name: '시간표 리허설 속도' }), {
      target: { value: '4' },
    });
    tick(2);
    expect(Number(range.value)).toBe(1);
    start();
    tick(1);
    expect(Number(range.value)).toBe(5);
    fireEvent.click(dialog.getByRole('button', { name: '다음 항목' }));
    expect(Number(range.value)).toBe(840);
    tick(2);
    expect(Number(range.value)).toBe(840);
    fireEvent.click(dialog.getByRole('button', { name: '2번 항목 수행 · 오른쪽 구간 보기' }));
    expect(Number(range.value)).toBe(1350);
    start();
    tick(1);
    act(() => {
      visible = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hiddenAt = Number(range.value);
    tick(20);
    expect(Number(range.value)).toBe(hiddenAt);
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    act(() => {
      visible = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    tick(2);
    expect(Number(range.value)).toBe(hiddenAt);
    start();
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    act(() => window.dispatchEvent(new Event('pageshow')));
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    start();
    act(() => {
      reduced = true;
      mediaListeners.forEach((listener) => listener());
    });
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(controls.getByText(/동작 줄이기 설정에 따라 수동 시간표 탐색/)).toBeInTheDocument();
    act(() => {
      reduced = false;
      mediaListeners.forEach((listener) => listener());
    });
    fireEvent.click(controls.getByRole('button', { name: '시간표 처음으로' }));
    expect(Number(range.value)).toBe(0);
    start();
    fireEvent.click(dialog.getByRole('button', { name: '계획 미리보기 닫기' }));
    tick(30);
    expect(
      screen.queryByRole('dialog', { name: '전체 수업 계획 미리보기' }),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
    const reopened = within(await screen.findByRole('dialog', { name: '전체 수업 계획 미리보기' }));
    expect(reopened.getByRole('slider', { name: '수업 시간표 위치' })).toHaveValue('0');
    expect(reopened.getByRole('region', { name: '선택한 계획 항목' })).toHaveTextContent(
      fixture.exercises[0].nameKo,
    );
    expect(reopened.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(storedState()).toEqual(before);
  });

  it.each(['plan', 'target', 'apparatus', 'level', 'material', 'review'] as const)(
    'keeps the opened snapshot frozen but stops and disables playback after a live %s change',
    async (kind) => {
      const fixture = seed();
      const { dialog, controls, range } = await openPreview();
      const visualDrawer = dialog.getByTestId(
        'plan-preview-visual-3d-cuesheet-drawer',
      ) as HTMLDetailsElement;
      visualDrawer.open = true;
      fireEvent(visualDrawer, new Event('toggle'));
      expect(dialog.getByTestId('one-page-visual-3d-cuesheet')).toHaveTextContent(
        fixture.steps[0].instructorNote!,
      );
      const cueDrawer = dialog
        .getByText('수업 진행 큐시트 · 인쇄 보기', { selector: 'summary' })
        .closest('details')!;
      cueDrawer.open = true;
      fireEvent(cueDrawer, new Event('toggle'));
      expect(dialog.getByTestId('class-cue-sheet-root')).toBeInTheDocument();
      fakeClock();
      fireEvent.click(controls.getByRole('button', { name: '시간표 리허설 시작' }));
      tick(1);
      act(() => {
        const state = usePilatesStore.getState();
        if (kind === 'plan') usePilatesStore.setState({ activeSteps: state.activeSteps.slice(1) });
        if (kind === 'target') usePilatesStore.setState({ activeTargetMinutes: 60 });
        if (kind === 'apparatus') usePilatesStore.setState({ activeApparatus: 'reformer' });
        if (kind === 'level') usePilatesStore.setState({ activeLevel: '2.0' });
        if (kind === 'material')
          usePilatesStore.setState({
            exercises: state.exercises.map((item) =>
              item.id === fixture.exercises[0].id
                ? { ...item, cues: ['합성 QA 변경된 미검토 큐'] }
                : item,
            ),
          });
        if (kind === 'review')
          usePilatesStore.setState({
            exercises: state.exercises.map((item) =>
              item.id === fixture.exercises[0].id ? { ...item, review: undefined } : item,
            ),
          });
      });
      const afterExternalChange = storedState();
      expect(dialog.queryByTestId('one-page-visual-3d-cuesheet')).not.toBeInTheDocument();
      expect(dialog.queryByTestId('class-cue-sheet-root')).not.toBeInTheDocument();
      expect(within(visualDrawer).getByText(/미리보기를 다시 열어 큐시트를 확인/)).toBeVisible();
      const stoppedAt = Number(range.value);
      expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
      expect(controls.getByText(/원본 계획 또는 검토 정보가 바뀌었습니다/)).toBeInTheDocument();
      expect(dialog.getByRole('button', { name: '수업 시작' })).toBeDisabled();
      tick(15);
      expect(Number(range.value)).toBe(stoppedAt);
      expect(dialog.getByLabelText('미리보기 시간 구성')).toHaveTextContent('전체50:00');
      expect(dialog.getByRole('region', { name: '선택한 계획 항목' })).toHaveTextContent(
        fixture.exercises[0].nameKo,
      );
      if (kind === 'material' || kind === 'review') {
        expect(dialog.queryByText(fixture.exercises[0].cues[0])).not.toBeInTheDocument();
        expect(dialog.queryByText(fixture.steps[0].instructorNote!)).not.toBeInTheDocument();
      }
      expect(storedState()).toEqual(afterExternalChange);
    },
  );

  it('opens exact source evidence read-only without treating a verified link or personal record as expert motion approval', async () => {
    const fixture = seed();
    const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-02')!;
    const pending: PilatesExercise = {
      ...fixture.exercises[0],
      review: undefined,
      sourceReference: {
        referenceId: reference.id,
        url: reference.url,
        title: reference.title,
        publisher: reference.sourceName,
        region: reference.region,
        verificationStatus: reference.verificationStatus,
        verifiedAt: reference.verifiedAt,
        rights: reference.rights,
        rawLedgerFile: reference.rawLedgerFile,
        rawItemId: reference.rawItemId,
      },
    };
    usePilatesStore.setState({
      exercises: usePilatesStore
        .getState()
        .exercises.map((item) => (item.id === pending.id ? pending : item)),
    });
    const before = storedState();
    const { dialog, controls } = await openPreview();
    const evidenceElement = dialog.getByRole('region', {
      name: `${pending.nameKo} 근거와 검토 상태`,
    });
    fireEvent.click(evidenceElement.querySelector('summary')!);
    const evidence = within(evidenceElement);
    expect(evidence.getByRole('heading', { name: '개인 계획 검토' })).toBeVisible();
    expect(evidence.getByText('원출처 기록').parentElement).toHaveTextContent('mv-02');
    expect(evidence.getByText(reference.title)).toBeVisible();
    expect(evidence.getByText('48.821초')).toBeVisible();
    expect(evidence.getByText('미확인 · 계획 시간으로 가져오지 않음')).toBeVisible();
    expect(evidence.getByText('확인된 동작 구간 없음')).toBeVisible();
    expect(evidence.getByText('0건 · 미검토')).toBeVisible();
    expect(evidence.getByText('0종 · ID 대조용 · 정확 연결 아님')).toBeVisible();
    expect(evidence.getByText('전체 공통 개념 시안').parentElement).toHaveTextContent(
      '2개 · 모두 미검토 · 이 노트의 관련 제안 수와 별개',
    );
    expect(evidence.getByText('미확인 · 외부 전문가 검수와 별개')).toBeVisible();
    expect(evidence.queryAllByRole('button')).toHaveLength(0);
    expect(
      evidenceElement.querySelectorAll('input,select,textarea,iframe,video,canvas'),
    ).toHaveLength(0);
    expect(
      evidence.getAllByRole('link').some((link) => link.getAttribute('href') === reference.url),
    ).toBe(true);
    expect(controls.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(
      dialog.queryByRole('region', { name: '내 강사 검토 티칭 메모' }),
    ).not.toBeInTheDocument();
    expect(storedState()).toEqual(before);
  });
});
