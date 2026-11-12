import { getVisibleWorkbenchButton } from './workbenchControls';
import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { LiveStageView } from '../components/LiveStageView';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassGroupProfile,
  ClassHistoryLog,
  ExerciseSourceReference,
  SequenceStep,
} from '../types/pilates';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { SYNTHETIC_APPROVED_EXERCISES, syntheticPlanningExercise } from './planningFixtures';
import { closeWorkbenchConditions, openWorkbenchConditions } from './workbenchControls';

configure({ asyncUtilTimeout: 6000 });

const original = usePilatesStore.getState();
const productionSnapshot = structuredClone(INITIAL_EXERCISES);
const sourcesSnapshot = structuredClone(VERIFIED_REFERENCES);
const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-01')!;
const sourceReference: ExerciseSourceReference = {
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
};
const group: ClassGroupProfile = {
  id: 'qa-teacher-target',
  name: '합성 QA 대상 A',
  type: 'group',
  defaultLevel: '1.0',
  scheduleLabel: '화·목 저녁',
  notes: '합성 QA 준비 메모 · 실제 수업용 아님',
};
const otherGroup: ClassGroupProfile = { ...group, id: 'qa-teacher-other', name: '합성 QA 대상 B' };
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 14,
  targetGroupId: group.id,
  targetMinutes: 50,
  defaultLayer: 'standard',
};
const synthetic = syntheticPlanningExercise('mat', 'warmup');
const lockedStep: SequenceStep = {
  stepId: 'qa-teacher-locked-step',
  order: 1,
  blockCategory: synthetic.blockCategory,
  exerciseId: synthetic.id,
  durationMin: 4,
  selectedLayer: 'easy',
  instructorNote: '합성 QA 잠근 초안 메모',
  locked: true,
};
const log = (
  id: string,
  target: ClassGroupProfile,
  taughtAt: string,
  snapshot: AutoGenerateCriteria,
): ClassHistoryLog => ({
  id,
  sequenceId: `qa-teacher-sequence-${id}`,
  sequenceTitle: `합성 QA 기록 ${id}`,
  groupId: target.id,
  groupName: target.name,
  taughtAt,
  apparatus: snapshot.apparatus,
  level: snapshot.level,
  exerciseIds: [synthetic.id],
  rating: 4,
  intensity: 'moderate',
  instructorReflection: `합성 QA 회고 ${id}`,
  stepsSnapshot: [lockedStep],
  criteriaSnapshot: snapshot,
});
const history = [log('baseline', group, '2026-11-01T10:00:00Z', criteria)];
const preservedDraft = () => {
  const current = usePilatesStore.getState();
  return structuredClone({
    activeSequenceId: current.activeSequenceId,
    activeTitle: current.activeTitle,
    activeSubtitle: current.activeSubtitle,
    activeApparatus: current.activeApparatus,
    activeLevel: current.activeLevel,
    activeTargetMinutes: current.activeTargetMinutes,
    activeSteps: current.activeSteps,
    lastCriteria: current.lastCriteria,
    savedSequences: current.savedSequences,
    historyLogs: current.historyLogs,
    ownedEquipment: current.ownedEquipment,
    ownedProps: current.ownedProps,
  });
};
const expectProductionUnchanged = () => {
  expect(INITIAL_EXERCISES).toEqual(productionSnapshot);
  expect(INITIAL_EXERCISES).toHaveLength(98);
  const current = usePilatesStore.getState().exercises;
  expect(
    current.filter((item) => productionSnapshot.some((entry) => entry.id === item.id)),
  ).toEqual(productionSnapshot);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(VERIFIED_REFERENCES).toEqual(sourcesSnapshot);
  expect(VERIFIED_REFERENCES).toHaveLength(30);
  expect(VERIFIED_REFERENCES.every((item) => !item.autoRecommendationEligible)).toBe(true);
};
const navigate = (name: RegExp) =>
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', { name }),
  );
const openHandoff = async () => {
  navigate(/동작 라이브러리/);
  fireEvent.click(await screen.findByRole('tab', { name: '공개 자료 30' }));
  fireEvent.click(screen.getByRole('button', { name: '전체 장비 보기' }));
  fireEvent.change(screen.getByRole('searchbox', { name: '공개 참고 자료 검색' }), {
    target: { value: reference.title },
  });
  fireEvent.click(
    screen.getByRole('button', { name: `${reference.title} 자료로 내 계획 노트 작성` }),
  );
  return within(await screen.findByRole('dialog', { name: '공개 자료로 내 계획 노트 작성' }));
};
const fillPersonalNote = (dialog: ReturnType<typeof within>, name: string) => {
  fireEvent.change(dialog.getByLabelText('내가 계획할 동작 이름 *'), { target: { value: name } });
  // This deliberately differs from the source's chair metadata: only entered planning data wins.
  fireEvent.click(dialog.getByRole('button', { name: '매트' }));
  fireEvent.click(dialog.getByRole('button', { name: '소도구 없음' }));
  fireEvent.change(dialog.getByLabelText('직접 정한 계획 시간 · 분 *'), {
    target: { value: '3.5' },
  });
  fireEvent.change(dialog.getByLabelText('직접 확인한 난이도 *'), { target: { value: '1.5' } });
  fireEvent.change(dialog.getByLabelText('내 계획의 구간 분류 *'), { target: { value: 'core' } });
  fireEvent.change(dialog.getByLabelText('직접 확인한 시작 자세 *'), {
    target: { value: 'seated' },
  });
  fireEvent.change(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
    target: { value: 'together' },
  });
  fireEvent.change(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *'), {
    target: { value: '합성 QA 직접 입력 메모 · 실제 동작 설명 아님' },
  });
};
const savePersonalNote = async (dialog: ReturnType<typeof within>, name: string) => {
  fillPersonalNote(dialog, name);
  fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
  const detail = within(await screen.findByRole('dialog', { name }));
  fireEvent.click(detail.getByText('내 검토 기록 (선택)'));
  fireEvent.click(detail.getByText('출처·검토 상태 자세히 보기'));
  const note = usePilatesStore.getState().exercises.find((item) => item.nameKo === name)!;
  return { detail, note };
};

// These are actual App/dialog journeys with lazy entries and persisted synthetic data.
// Keep the same bounded shared-runner allowance as the existing integration file.
describe('teacher preparation and pending source-note handoff', { timeout: 60000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeTab: 'workbench',
        exercises: [...INITIAL_EXERCISES, synthetic],
        classGroups: [group, otherGroup],
        historyLogs: structuredClone(history),
        activeTargetGroupId: group.id,
        activeSequenceId: 'qa-teacher-current-draft',
        activeTitle: '합성 QA 현재 초안',
        activeSubtitle: '잠금 보존 시험 · 실제 수업용 아님',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeSteps: [structuredClone(lockedStep)],
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
        savedSequences: [
          {
            id: 'qa-teacher-saved',
            title: '합성 QA 기존 저장',
            subtitle: '',
            apparatus: 'mat',
            level: '1.0',
            focusTags: [],
            targetMinutes: 50,
            steps: [structuredClone(lockedStep)],
            createdAt: '2026-11-01T10:00:00Z',
            updatedAt: '2026-11-01T10:00:00Z',
            taughtCount: 1,
            criteriaSnapshot: structuredClone(criteria),
          },
        ],
        ownedApparatus: ['mat', 'reformer'],
        ownedEquipment: ['mat', 'reformer'],
        ownedProps: [],
        conditionTemplates: [],
        generationError: null,
        saveFeedback: null,
        undoStack: [],
      },
      true,
    );
  });
  afterEach(() => {
    cleanup();
    expectProductionUnchanged();
    usePilatesStore.setState(original, true);
    vi.restoreAllMocks();
  });

  it('reuses the latest actual same-group conditions in the form and preserves the locked draft and all history', () => {
    const recent: AutoGenerateCriteria = {
      ...criteria,
      apparatus: 'reformer',
      availableEquipment: ['reformer'],
      ownedApparatus: ['reformer'],
      targetMinutes: 60,
      level: '1.5',
      focusPreset: 'posture-upper',
      targetGroupId: otherGroup.id,
    };
    usePilatesStore.setState({
      historyLogs: [
        history[0],
        log('other-newest', otherGroup, '2026-11-04T12:00:00Z', { ...criteria, targetMinutes: 37 }),
        log('same-recent', group, '2026-11-03T12:00:00Z', recent),
      ],
    });
    const before = preservedDraft();
    render(<App />);
    const conditions = openWorkbenchConditions();
    const panel = within(conditions.getByRole('region', { name: '선택한 대상의 다음 수업 준비' }));
    expect(panel.getByText('합성 QA 회고 same-recent')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' })).toHaveValue(50);
    fireEvent.click(panel.getByRole('button', { name: /최근 수업 조건 가져오기/ }));
    expect(usePilatesStore.getState().draftCriteria).toEqual({
      ...recent,
      targetGroupId: group.id,
    });
    expect(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' })).toHaveValue(60);
    expect(screen.getByRole('combobox', { name: '최대 난이도' })).toHaveValue('1.5');
    expect(screen.getByRole('checkbox', { name: '리포머' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '매트' })).not.toBeChecked();
    expect(panel.getByRole('status')).toHaveTextContent(/2026-11-03/);
    closeWorkbenchConditions();
    expect(preservedDraft()).toEqual(before);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('requires explicit planning inputs and cancel leaves all local records unchanged', async () => {
    const before = preservedDraft();
    const exercisesBefore = structuredClone(usePilatesStore.getState().exercises);
    render(<App />);
    const dialog = await openHandoff();
    expect(dialog.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue(reference.title);
    expect(dialog.getByLabelText('직접 정한 계획 시간 · 분 *')).toHaveValue(null);
    for (const label of [
      '직접 확인한 난이도 *',
      '내 계획의 구간 분류 *',
      '직접 확인한 시작 자세 *',
      '직접 확인한 좌우 진행 방식 *',
    ])
      expect(dialog.getByLabelText(label)).toHaveValue('');
    expect(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *')).toHaveValue('');
    expect(dialog.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(dialog.getByRole('link', { name: /원본 자료 확인/ })).toHaveAttribute(
      'href',
      reference.url,
    );
    expect(screen.getByRole('dialog').querySelector('iframe')).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(dialog.getByRole('alert')).toBeInTheDocument();
    expect(usePilatesStore.getState().exercises).toEqual(exercisesBefore);
    fireEvent.click(dialog.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(preservedDraft()).toEqual(before);
  });

  it('creates a separate pending note with exact durable provenance and restores it through the actual JSON form without changing the draft', async () => {
    const before = preservedDraft();
    render(<App />);
    const { detail, note } = await savePersonalNote(
      await openHandoff(),
      '합성 QA 공개 자료 계획 노트',
    );
    expect(note.sourceReference).toEqual(sourceReference);
    expect(note).toMatchObject({
      isCustom: true,
      apparatus: 'mat',
      requiredEquipment: ['mat'],
      props: ['none'],
      level: '1.5',
      defaultDurationMin: 3.5,
      blockCategory: 'core',
      bodyPosition: 'seated',
      cues: ['합성 QA 직접 입력 메모 · 실제 동작 설명 아님'],
      springs: '',
      breathPattern: '',
      precautions: '',
      youtube: { videoId: '', channelName: '', videoTitle: '', url: '', startSec: 0 },
    });
    expect(note.youtube.endSec).toBeUndefined();
    expect(note.review).toBeUndefined();
    expect(getExerciseReviewState(note)).toBe('pending');
    expect(detail.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    expect(
      detail.getByRole('button', { name: '수정 내용을 저장하고 내 강사 검토로 승인' }),
    ).toBeDisabled();
    expect(
      within(
        detail.getByRole('heading', { name: '자료의 출처와 검토 상태' }).closest('section')!,
      ).getByRole('link', { name: /보존된 원출처 열기/ }),
    ).toHaveAttribute('href', reference.url);
    expect(detail.queryByRole('button', { name: 'YouTube 영상 불러오기' })).not.toBeInTheDocument();
    expect(preservedDraft()).toEqual(before);
    const key = 'pilates-flow-atelier-storage-v3';
    const persisted = JSON.parse(localStorage.getItem(key)!).state;
    expect(persisted.exercises.find((item: { id: string }) => item.id === note.id)).toEqual(note);
    await act(async () => usePilatesStore.persist.rehydrate());
    expect(usePilatesStore.getState().exercises.find((item) => item.id === note.id)).toEqual(note);
    const backup = usePilatesStore.getState().exportBackup();
    fireEvent.click(detail.getByRole('button', { name: '닫기' }));
    act(() => {
      usePilatesStore.setState((current) => ({
        exercises: current.exercises.filter((item) => item.id !== note.id),
      }));
    });
    fireEvent.click(screen.getByRole('button', { name: '데이터 백업과 사용 안내' }));
    const file = new File([backup], 'synthetic-teacher-workflow-backup.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => backup });
    fireEvent.change(await screen.findByLabelText('백업 JSON 파일 선택'), {
      target: { files: [file] },
    });
    const recovery = await screen.findByRole('region', { name: '복구 전 확인' });
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === note.id),
    ).toBeUndefined();
    expect(preservedDraft()).toEqual(before);
    fireEvent.click(within(recovery).getByRole('button', { name: '이 내용으로 복원 적용' }));
    await waitFor(() =>
      expect(usePilatesStore.getState().exercises.find((item) => item.id === note.id)).toEqual(
        note,
      ),
    );
    const { savedSequences: savedBefore, ...draftBefore } = before;
    const { savedSequences: savedAfter, ...draftAfter } = preservedDraft();
    expect(draftAfter).toEqual(draftBefore);
    // Restoring an unsaved backup draft also archives a recovery copy. Existing
    // saved records and the active working draft must remain intact.
    expect(savedAfter).toEqual(expect.arrayContaining(savedBefore));
    expect(savedAfter.filter((item) => !savedBefore.some((saved) => saved.id === item.id))).toEqual(
      [
        expect.objectContaining({
          steps: before.activeSteps,
          targetMinutes: before.activeTargetMinutes,
        }),
      ],
    );
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === note.id)?.review,
    ).toBeUndefined();
  });

  it('allows pending source notes in local composition and teaching without granting review', async () => {
    usePilatesStore.setState({ exercises: INITIAL_EXERCISES, activeSteps: [], lastCriteria: null });
    render(<App />);
    expect(screen.queryByRole('button', { name: /^수업 시작/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '시퀀스 미리보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    const { detail, note } = await savePersonalNote(
      await openHandoff(),
      '합성 QA 검토 전 출처 노트',
    );
    fireEvent.click(detail.getByRole('button', { name: '닫기' }));
    navigate(/오늘의 수업/);
    fireEvent.click(screen.getByText('자동 구성·휴식 먼저 넣기', { selector: 'summary' }));
    const beforeAttempt = usePilatesStore.getState();
    const makeSequence = getVisibleWorkbenchButton('시퀀스 만들기');
    expect(makeSequence).toBeEnabled();
    fireEvent.click(makeSequence);
    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThan(0);
    expect(usePilatesStore.getState().exercises).toBe(beforeAttempt.exercises);
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      apparatus: beforeAttempt.draftCriteria!.apparatus,
      level: beforeAttempt.draftCriteria!.level,
      targetMinutes: beforeAttempt.draftCriteria!.targetMinutes,
    });
    expect(usePilatesStore.getState().generationError).toBeNull();
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    cleanup();
    usePilatesStore.setState({ activeSteps: [{ ...lockedStep, exerciseId: note.id }] });
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByText(/교차 검증 완료 가이드/)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(
      within(screen.getByRole('region', { name: '현재 동작 핵심 티칭 큐' })).getByText(note.cues[0]),
    ).toBeInTheDocument();
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === note.id)?.review,
    ).toBeUndefined();
  });

  it('registers a no-video synthetic movement, explicitly reviews it, composes an exact class and preserves its taught history through JSON recovery', async () => {
    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, ...SYNTHETIC_APPROVED_EXERCISES],
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
    });
    render(<App />);
    fireEvent.click(screen.getByText('자동 구성·휴식 먼저 넣기', { selector: 'summary' }));
    fireEvent.click(getVisibleWorkbenchButton('시퀀스 만들기'));
    expect(
      usePilatesStore.getState().activeSteps.reduce((sum, step) => sum + step.durationMin, 0),
    ).toBeCloseTo(50, 8);
    navigate(/동작 라이브러리/);
    fireEvent.click(await screen.findByRole('button', { name: '내 동작 직접 등록' }));
    const form = within(await screen.findByRole('dialog', { name: '내 동작 직접 등록' }));
    expect(form.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue('');
    expect(form.queryByLabelText(/URL|YouTube|영상 링크/)).not.toBeInTheDocument();
    const name = '합성 QA 직접 등록 동작 · 실제 수업용 아님';
    fillPersonalNote(form, name);
    fireEvent.change(form.getByLabelText('직접 확인한 난이도 *'), { target: { value: '1.0' } });
    fireEvent.change(form.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'separate' },
    });
    fireEvent.change(form.getByLabelText('직접 작성한 주의·제외·개인별 적용 메모 · 선택'), {
      target: { value: '합성 QA 절차 확인용 메모 · 실제 수업이나 안전성 자료가 아닙니다.' },
    });
    fireEvent.click(form.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    const detail = within(await screen.findByRole('dialog', { name }));
    fireEvent.click(detail.getByText('내 검토 기록 (선택)'));
    fireEvent.click(detail.getByText('출처·검토 상태 자세히 보기'));
    const pending = usePilatesStore.getState().exercises.find((item) => item.nameKo === name)!;
    expect(pending.id).toMatch(/^ex-custom-own-/);
    expect(pending.sourceReference).toBeUndefined();
    expect(pending.youtube).toEqual({
      videoId: '',
      channelName: '',
      videoTitle: '',
      url: '',
      startSec: 0,
    });
    expect(pending.isUnilateral).toBe(true);
    expect(pending.defaultDurationMin).toBe(3.5);
    expect(pending.review).toBeUndefined();
    expect(detail.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    fireEvent.click(detail.getByText('검토 전 메모 수정 · 근거 미확인 입력값'));
    fireEvent.change(detail.getByLabelText('스프링·기구 설정 메모 · 직접 확인'), {
      target: { value: '합성 QA 메모 · 실제 동작 설정 아님' },
    });
    fireEvent.change(detail.getByLabelText('검토한 강사 별칭'), {
      target: { value: 'Synthetic QA reviewer · test only' },
    });
    const approve = detail.getByRole('button', {
      name: '수정 내용을 저장하고 내 강사 검토로 승인',
    });
    expect(approve).toBeDisabled();
    fireEvent.click(detail.getByRole('checkbox', { name: /이 동작의 위 모든 조건/ }));
    fireEvent.click(approve);
    const reviewed = usePilatesStore.getState().exercises.find((item) => item.id === pending.id)!;
    expect(isExerciseAutoEligible(reviewed)).toBe(true);
    expect(reviewed.review).toMatchObject({
      reviewerAlias: 'Synthetic QA reviewer · test only',
      scope: 'planning-metadata',
      credentialVerified: false,
    });
    fireEvent.click(detail.getByRole('button', { name: '수업안에 추가' }));
    navigate(/오늘의 수업/);
    const ownIndex = usePilatesStore
      .getState()
      .activeSteps.findIndex((step) => step.exerciseId === pending.id);
    expect(ownIndex).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: `${ownIndex + 1}번 동작 잠금` }));
    const ownStep = structuredClone(usePilatesStore.getState().activeSteps[ownIndex]);
    fireEvent.click(screen.getByRole('button', { name: '50분에 맞추기' }));
    const plan = structuredClone(usePilatesStore.getState().activeSteps);
    expect(plan.reduce((seconds, step) => seconds + step.durationMin * 60, 0)).toBeCloseTo(3000, 8);
    expect(plan.find((step) => step.stepId === ownStep.stepId)).toEqual(ownStep);
    expect(screen.queryByRole('button', { name: /^수업 시작/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
    const preview = within(await screen.findByRole('dialog', { name: '전체 수업 계획 미리보기' }));
    expect(preview.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    fireEvent.click(preview.getByRole('button', { name: '사본 저장' }));
    fireEvent.click(preview.getByRole('button', { name: '수업 시작' }));
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
    expect(screen.getByRole('timer')).toHaveTextContent('03:30');
    expect(
      within(screen.getByRole('region', { name: '현재 동작 핵심 티칭 큐' })).getByText(reviewed.cues[0]),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    const record = within(await screen.findByRole('dialog', { name: '수업 기록 남기기' }));
    const taught = record.getByRole('checkbox', { name: new RegExp(name) });
    if (!(taught as HTMLInputElement).checked) fireEvent.click(taught);
    fireEvent.change(record.getByRole('spinbutton', { name: '분' }), { target: { value: '50' } });
    fireEvent.change(record.getByRole('spinbutton', { name: '초' }), { target: { value: '0' } });
    fireEvent.change(record.getByRole('textbox', { name: /다음 수업을 위한 메모/ }), {
      target: { value: '합성 QA 직접 등록에서 기록까지 · 실제 수업 아님' },
    });
    fireEvent.click(record.getByRole('button', { name: '수업 기록 저장' }));
    const taughtLog = structuredClone(usePilatesStore.getState().historyLogs[0]);
    expect(taughtLog.exerciseIds).toContain(pending.id);
    expect(taughtLog.actualDurationSec).toBe(3000);
    expect(taughtLog.stepsSnapshot?.find((step) => step.exerciseId === pending.id)).toEqual({
      ...ownStep,
      order: taughtLog.exerciseIds.indexOf(pending.id) + 1,
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    expect(
      await screen.findByText('합성 QA 직접 등록에서 기록까지 · 실제 수업 아님'),
    ).toBeInTheDocument();
    const backup = usePilatesStore.getState().exportBackup();
    act(() => {
      usePilatesStore.setState((current) => ({
        exercises: current.exercises.filter((item) => item.id !== pending.id),
        savedSequences: [],
        historyLogs: [],
      }));
    });
    fireEvent.click(screen.getByRole('button', { name: '데이터 백업과 사용 안내' }));
    const file = new File([backup], 'synthetic-own-movement-backup.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => backup });
    fireEvent.change(await screen.findByLabelText('백업 JSON 파일 선택'), {
      target: { files: [file] },
    });
    const recovery = await screen.findByRole('region', { name: '복구 전 확인' });
    expect(usePilatesStore.getState().historyLogs).toEqual([]);
    fireEvent.click(within(recovery).getByRole('button', { name: '이 내용으로 복원 적용' }));
    await waitFor(() => expect(usePilatesStore.getState().historyLogs).toContainEqual(taughtLog));
    expect(usePilatesStore.getState().exercises.find((item) => item.id === pending.id)).toEqual(
      reviewed,
    );
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some((item) => item.steps.some((step) => step.exerciseId === pending.id)),
    ).toBe(true);
  });

  it('preserves origin and stale review evidence while allowing teaching', async () => {
    // Adding provenance after a synthetic fixture review deliberately makes that review stale.
    // No production note or public source is approved by this test.
    const stale = {
      ...synthetic,
      sourceReference,
      nameKo: '합성 QA 출처 변경 후 오래된 검토',
    };
    expect(getExerciseReviewState(stale)).toBe('stale');
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, stale] });
    render(<App />);
    navigate(/동작 라이브러리/);
    fireEvent.change(await screen.findByRole('searchbox', { name: '동작 검색' }), {
      target: { value: stale.nameKo },
    });
    fireEvent.click(screen.getByRole('button', { name: `${stale.nameKo} 상세 보기` }));
    const detail = within(await screen.findByRole('dialog', { name: stale.nameKo }));
    fireEvent.click(detail.getByText('내 검토 기록 (선택)'));
    fireEvent.click(detail.getByText('출처·검토 상태 자세히 보기'));
    expect(detail.getByRole('button', { name: '수업안에 추가됨' })).toBeDisabled();
    expect(
      detail.getByText('현재 수업안에 담긴 교차 검증 자료입니다. 검토 기록은 선택 사항입니다.'),
    ).toBeVisible();
    fireEvent.click(detail.getByText('검토 전 메모 수정 · 근거 미확인 입력값'));
    fireEvent.change(detail.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성'), {
      target: { value: '합성 QA 수정 메모 · 실제 수업용 아님' },
    });
    fireEvent.click(detail.getByRole('button', { name: '수정 메모만 저장' }));
    const edited = usePilatesStore.getState().exercises.find((item) => item.id === stale.id)!;
    expect(edited.sourceReference).toEqual(sourceReference);
    expect(edited.review).toEqual(stale.review);
    expect(getExerciseReviewState(edited)).toBe('stale');
    cleanup();
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByText(/교차 검증 완료 가이드/)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(
      within(screen.getByRole('region', { name: '현재 동작 핵심 티칭 큐' })).getByText(edited.cues[0]),
    ).toBeInTheDocument();
    expect(edited.review).toEqual(stale.review);
  });
});
