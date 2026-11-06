import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMovementProvenance, getMovementVideoLink } from '../data/movementProvenance';
import {
  parseManualChapters,
  parseReferenceTime,
  parseYouTubeReference,
} from '../schemas/pilatesSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { getExerciseEquipment } from '../data/equipmentCatalog';
import { SYNTHETIC_APPROVED_EXERCISES, syntheticPlanningExercise } from './planningFixtures';
import {
  closeWorkbenchBlockInspector,
  closeWorkbenchConditions,
  openWorkbenchBlockInspector,
  openWorkbenchBlockMemo,
  openWorkbenchAutomation,
  openWorkbenchConditions,
  openWorkbenchPlanPreview,
} from './workbenchControls';
import type { AutoGenerateCriteria } from '../types/pilates';
import {
  extractYouTubeVideoId,
  formatSequenceAsStudioSheet,
  getMovementKey,
} from '../utils/sequenceEngine';

configure({ asyncUtilTimeout: 6000 });

const originalStore = usePilatesStore.getState();
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  targetMinutes: 50,
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 14,
  targetGroupId: originalStore.classGroups[0]?.id,
  defaultLayer: 'standard',
};
const totalMinutes = () =>
  usePilatesStore.getState().activeSteps.reduce((sum, step) => sum + step.durationMin, 0);
const nav = () => within(screen.getByRole('navigation', { name: '주 메뉴' }));
const generate = () => {
  closeWorkbenchConditions();
  if (!usePilatesStore.getState().activeSteps.length) {
    fireEvent.click(openWorkbenchAutomation().getByRole('button', { name: '시퀀스 만들기' }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: '자동 구성' }));
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 만들기' }));
  }
};
const save = () =>
  fireEvent.click(
    within(screen.getByRole('region', { name: '오늘의 시퀀스' })).getByRole('button', {
      name: '저장',
    }),
  );

describe('reference validation and honest provenance', () => {
  it.each([
    'https://www.youtube.com/watch?v=9x2F6B1vH4s',
    'https://youtu.be/9x2F6B1vH4s?t=42',
    'https://www.youtube.com/shorts/9x2F6B1vH4s',
    'https://www.youtube.com/embed/9x2F6B1vH4s',
  ])('keeps a valid official video reference: %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBe('9x2F6B1vH4s');
    expect(parseYouTubeReference(url)?.url).toBe('https://www.youtube.com/watch?v=9x2F6B1vH4s');
  });
  it.each([
    'invalid-url',
    'https://example.com/watch?v=9x2F6B1vH4s',
    'https://youtube.com.evil.test/watch?v=9x2F6B1vH4s',
    'https://youtube.com/watch?v=short',
    'javascript:alert(1)',
  ])('rejects an invalid reference without a fallback video: %s', (url) => {
    expect(parseYouTubeReference(url)).toBeNull();
    expect(extractYouTubeVideoId(url)).toBe('');
  });
  it('preserves entered chapter titles and rejects unordered or ambiguous times', () => {
    expect(parseManualChapters('00:45 호흡과 준비\n05:00 풋워크 (2R)\n1:02:30 마무리')).toEqual({
      chapters: [
        { startSec: 45, title: '호흡과 준비' },
        { startSec: 300, title: '풋워크 (2R)' },
        { startSec: 3750, title: '마무리' },
      ],
      error: null,
    });
    for (const text of [
      '02:70 잘못된 초',
      '03:00 첫 동작\n03:00 같은 시간',
      '03:00 첫 동작\n02:00 이전 시간',
      '설명만 있는 줄',
    ]) {
      expect(parseManualChapters(text).error).toEqual(expect.any(String));
    }
    expect(parseReferenceTime('1:60:00')).toBeNull();
    expect(parseReferenceTime('00:59')).toBe(59);
  });
  it('distinguishes original notes, user references and unverified legacy material', () => {
    const legacy = INITIAL_EXERCISES.find(
      (exercise) => !exercise.id.startsWith('original-') && !exercise.isCustom,
    )!;
    const original = INITIAL_EXERCISES.find((exercise) => exercise.id.startsWith('original-'))!;
    expect(getMovementProvenance(legacy).kind).toBe('legacy');
    expect(getMovementProvenance(original).kind).toBe('original');
    expect(getMovementProvenance({ ...legacy, id: 'manual-test', isCustom: true }).kind).toBe(
      'manual',
    );
    expect(
      getMovementVideoLink({ ...legacy, youtube: { ...legacy.youtube, url: 'invalid-url' } }),
    ).toBeNull();
    expect(getMovementVideoLink(original)).toBeNull();
  });
});

// These integrated DOM journeys serialize sizable synthetic planning fixtures and
// evaluate accessible controls. Keep a bounded allowance for shared-runner pauses.
describe('planning, reference, teaching and backup user journeys', { timeout: 60000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...originalStore,
        activeTab: 'workbench',
        exercises: [...INITIAL_EXERCISES, ...SYNTHETIC_APPROVED_EXERCISES],
        activeSteps: [],
        activeSequenceId: 'qa-synthetic-draft',
        activeTitle: '합성 QA 수업',
        lastCriteria: criteria,
        draftCriteria: criteria,
        activeTargetMinutes: 50,
        activeApparatus: 'mat',
        activeLevel: '1.0',
        ownedApparatus: ['mat', 'reformer', 'chair'],
        ownedEquipment: ['mat', 'reformer', 'chair'],
        ownedProps: [],
        savedSequences: [],
        historyLogs: [],
        conditionTemplates: [],
        generationError: null,
        saveFeedback: '',
        undoStack: [],
      },
      true,
    );
  });
  afterEach(() => {
    cleanup();
    usePilatesStore.setState(originalStore, true);
    vi.restoreAllMocks();
  });
  it('starts blank and refuses the reported reformer 50-minute beginner pelvic request with zero reviewed production records', () => {
    expect(originalStore.activeSteps).toEqual([]);
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    const request: AutoGenerateCriteria = {
      ...criteria,
      apparatus: 'reformer',
      ownedApparatus: ['reformer'],
      availableEquipment: ['reformer'],
      planningGoals: ['pelvic-control'],
      instructorObservations: ['anterior-pelvic-tilt'],
    };
    usePilatesStore.setState({
      exercises: INITIAL_EXERCISES,
      activeSteps: [],
      activeApparatus: 'reformer',
      draftCriteria: request,
      lastCriteria: null,
    });
    render(<App />);
    expect(screen.queryByRole('button', { name: /^수업 시작/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '시퀀스 미리보기' })).not.toBeInTheDocument();
    generate();
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    expect(usePilatesStore.getState().generationError).toMatch(/승인|검토/);
    expect(screen.getByRole('alert')).toHaveTextContent(/승인|검토/);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/Short Spine|숏스파인/)).not.toBeInTheDocument();
    expect(screen.queryByText(INITIAL_EXERCISES[0]!.cues[0]!)).not.toBeInTheDocument();
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });
  it.each([
    { selected: ['mat', 'reformer'], minutes: 50 },
    { selected: ['mat', 'reformer'], minutes: 60 },
    { selected: ['chair', 'reformer'], minutes: 50 },
    { selected: ['chair', 'reformer'], minutes: 60 },
  ])(
    'uses only distinct synthetic approved movements for $selected at $minutes minutes',
    ({ selected, minutes }) => {
      render(<App />);
      openWorkbenchConditions();
      const names: Record<string, string> = { mat: '매트', reformer: '리포머', chair: '체어' };
      if (!selected.includes('mat'))
        fireEvent.click(screen.getByRole('checkbox', { name: '매트' }));
      for (const equipment of selected.filter((item) => item !== 'mat'))
        fireEvent.click(screen.getByRole('checkbox', { name: names[equipment] }));
      fireEvent.change(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' }), {
        target: { value: String(minutes) },
      });
      generate();
      const current = usePilatesStore.getState();
      expect(current.generationError).toBeNull();
      expect(totalMinutes()).toBeCloseTo(minutes, 8);
      const records = current.activeSteps.map((step) =>
        current.exercises.find((exercise) => exercise.id === step.exerciseId)!,
      );
      expect(
        records.every(
          (exercise) => exercise.id.startsWith('qa-synthetic-') && isExerciseAutoEligible(exercise),
        ),
      ).toBe(true);
      expect(new Set(records.map(getMovementKey)).size).toBe(records.length);
      expect(
        [
          ...new Set(
            records.flatMap((exercise) => getExerciseEquipment(exercise).requiredEquipment),
          ),
        ].sort(),
      ).toEqual([...selected].sort());
      expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    },
  );
  it('edits and explicitly self-attests one synthetic record without reviewing any production item', async () => {
    const pending = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, pending] });
    render(<App />);
    fireEvent.click(nav().getByRole('button', { name: /동작 라이브러리/ }));
    fireEvent.change(await screen.findByRole('searchbox', { name: '동작 검색' }), {
      target: { value: pending.nameKo },
    });
    fireEvent.click(screen.getByRole('button', { name: `${pending.nameKo} 상세 보기` }));
    const dialog = within(await screen.findByRole('dialog', { name: pending.nameKo }));
    expect(dialog.getByRole('button', { name: '강사 검토 후 추가 가능' })).toBeDisabled();
    fireEvent.click(dialog.getByText('검토 전 메모 수정 · 근거 미확인 입력값'));
    fireEvent.change(dialog.getByRole('textbox', { name: '검토한 강사 별칭' }), {
      target: { value: 'Synthetic QA reviewer' },
    });
    const consent = dialog.getByRole('checkbox', { name: /이 동작의 위 모든 조건/ });
    fireEvent.click(consent);
    expect(consent).toBeChecked();
    fireEvent.change(dialog.getByRole('textbox', { name: '스프링·기구 설정 메모 · 직접 확인' }), {
      target: { value: '합성 QA 수정 설정 · 실제 수업용 아님' },
    });
    expect(consent).not.toBeChecked();
    fireEvent.change(dialog.getByRole('textbox', { name: '티칭 큐 · 줄마다 하나 · 직접 작성' }), {
      target: { value: '합성 QA 검토 후 수정한 큐' },
    });
    fireEvent.change(
      dialog.getByRole('textbox', { name: '주의·제외·개인별 적용 메모 · 직접 작성' }),
      { target: { value: '합성 QA 검토 주의 메모 · 실제 수업용 아님' } },
    );
    const approve = dialog.getByRole('button', {
      name: '수정 내용을 저장하고 내 강사 검토로 승인',
    });
    expect(approve).toBeDisabled();
    fireEvent.click(consent);
    fireEvent.click(approve);
    const reviewed = usePilatesStore
      .getState()
      .exercises.find((exercise) => exercise.id === pending.id)!;
    expect(isExerciseAutoEligible(reviewed)).toBe(true);
    expect(reviewed.review).toMatchObject({
      reviewerAlias: 'Synthetic QA reviewer',
      scope: 'planning-metadata',
      credentialVerified: false,
    });
    expect(reviewed.springs).toBe('합성 QA 수정 설정 · 실제 수업용 아님');
    expect(
      usePilatesStore
        .getState()
        .exercises.filter(
          (exercise) =>
            !exercise.id.startsWith('qa-synthetic-') && isExerciseAutoEligible(exercise),
        ),
    ).toHaveLength(0);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });
  it('navigates the four workspaces and creates exact 50, 60 and custom minute plans', async () => {
    render(<App />);
    for (const minutes of [50, 60, 37]) {
      openWorkbenchConditions();
      fireEvent.change(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' }), {
        target: { value: String(minutes) },
      });
      generate();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(totalMinutes()).toBeCloseTo(minutes, 8);
      expect(screen.getByText('시간이 딱 맞아요')).toBeInTheDocument();
      const state = usePilatesStore.getState();
      const byId = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
      expect(
        state.activeSteps.every(
          (step) =>
            byId.get(step.exerciseId)?.apparatus === 'mat' &&
            Number(byId.get(step.exerciseId)?.level) <= 1,
        ),
      ).toBe(true);
    }
    fireEvent.click(nav().getByRole('button', { name: /동작 라이브러리/ }));
    expect(await screen.findByRole('searchbox', { name: '동작 검색' })).toBeInTheDocument();
    fireEvent.click(nav().getByRole('button', { name: '저장한 플로우' }));
    expect(await screen.findByRole('textbox', { name: '저장한 시퀀스 검색' })).toBeInTheDocument();
    fireEvent.click(nav().getByRole('button', { name: '수업 기록' }));
    expect(await screen.findByText('아직 남긴 수업 기록이 없어요')).toBeInTheDocument();
  });
  it('preserves locked notes and time through fitting and regeneration, and can replace and undo an unlocked item', async () => {
    const { container } = render(<App />);
    generate();
    fireEvent.click(container.querySelector('.step-title')!);
    const beforeNote = structuredClone(usePilatesStore.getState().activeSteps[0]);
    const inspector = openWorkbenchBlockMemo(0);
    fireEvent.change(inspector.getByRole('textbox', { name: '이번 수업 티칭 메모' }), {
      target: { value: '첫 호흡을 충분히 기다리기' },
    });
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(beforeNote);
    fireEvent.click(inspector.getByRole('button', { name: '변경 적용' }));
    expect(usePilatesStore.getState().activeSteps[0].instructorNote).toBe(
      '첫 호흡을 충분히 기다리기',
    );
    fireEvent.click(openWorkbenchBlockInspector(0).getByRole('button', { name: '블록 잠금' }));
    const locked = structuredClone(usePilatesStore.getState().activeSteps[0]);
    const lockedInspector = openWorkbenchBlockMemo(0);
    expect(lockedInspector.getByRole('textbox', { name: '이번 수업 티칭 메모' })).toBeDisabled();
    expect(lockedInspector.getByRole('button', { name: '변경 적용' })).toBeDisabled();
    closeWorkbenchBlockInspector();
    expect(screen.getByRole('button', { name: '1번 동작 교체' })).toBeDisabled();
    openWorkbenchConditions();
    fireEvent.change(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' }), {
      target: { value: '60' },
    });
    closeWorkbenchConditions();
    fireEvent.click(screen.getByRole('button', { name: '60분에 맞추기' }));
    expect(totalMinutes()).toBeCloseTo(60, 8);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(locked);
    fireEvent.change(screen.getByRole('combobox', { name: '다시 만들 구간' }), {
      target: { value: 'main' },
    });
    fireEvent.click(screen.getByRole('button', { name: '잠그지 않은 동작 다시 만들기' }));
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(locked);
    const before = structuredClone(usePilatesStore.getState().activeSteps[1]!);
    fireEvent.click(screen.getByRole('button', { name: '2번 동작 교체' }));
    const dialog = await screen.findByRole('dialog', { name: '이 동작만 교체' });
    fireEvent.click(dialog.querySelector('.replacement-item')!);
    expect(usePilatesStore.getState().activeSteps[1]!.exerciseId).not.toBe(before.exerciseId);
    expect(usePilatesStore.getState().activeSteps[1]!.durationMin).toBe(before.durationMin);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(locked);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[1]).toEqual(before);
  });
  it('rejects invalid imports and registers a reference with manually entered source metadata', async () => {
    render(<App />);
    fireEvent.click(nav().getByRole('button', { name: /동작 라이브러리/ }));
    fireEvent.click(await screen.findByRole('button', { name: '유튜브 참조 추가' }));
    // This dialog is a separate React.lazy entry. Allow cold module loading under
    // shared-runner CPU contention; all import validation assertions stay unchanged.
    const dialog = within(
      await screen.findByRole('dialog', { name: '내 유튜브 레퍼런스' }, { timeout: 15000 }),
    );
    fireEvent.click(dialog.getByRole('button', { name: '한 동작' }));
    fireEvent.change(dialog.getByLabelText('동작 이름 *'), {
      target: { value: '검토할 나의 참조 동작' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 채널명 *'), {
      target: { value: '직접 확인한 채널' },
    });
    fireEvent.change(dialog.getByLabelText(/YouTube 영상 링크/), {
      target: { value: 'https://example.com/watch?v=9x2F6B1vH4s' },
    });
    fireEvent.click(dialog.getByRole('button', { name: /^매트$/ }));
    fireEvent.click(dialog.getByRole('button', { name: /^소도구 없음$/ }));
    const before = usePilatesStore.getState().exercises.length;
    fireEvent.click(dialog.getByRole('button', { name: '참조 동작 보관' }));
    expect(usePilatesStore.getState().exercises).toHaveLength(before);
    expect(dialog.getByText(/유효한 YouTube 영상 링크를 입력/)).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText(/YouTube 영상 링크/), {
      target: { value: 'https://youtu.be/9x2F6B1vH4s' },
    });
    fireEvent.change(dialog.getByLabelText('시작 시간 *'), { target: { value: '02:15' } });
    fireEvent.click(dialog.getByRole('button', { name: '참조 동작 보관' }));
    expect(dialog.getByText('참고 자료를 보관했어요.')).toBeInTheDocument();
    const added = usePilatesStore
      .getState()
      .exercises.find((exercise) => exercise.nameKo === '검토할 나의 참조 동작')!;
    expect(added.youtube.startSec).toBe(135);
    expect(added.youtube.channelName).toBe('직접 확인한 채널');
    expect(added.isCustom).toBe(true);
    expect(added.springs).toBe('강사가 기구별 설정');
    expect(getMovementProvenance(added).kind).toBe('manual');
  });
  it('saves, enters teaching paused, adds session time and records a reviewed history snapshot', async () => {
    render(<App />);
    generate();
    fireEvent.change(screen.getByRole('textbox', { name: '시퀀스 제목' }), {
      target: { value: '오전 매트 흐름' },
    });
    save();
    expect(usePilatesStore.getState().savedSequences[0]?.title).toBe('오전 매트 흐름');
    const plan = structuredClone(usePilatesStore.getState().activeSteps);
    expect(screen.queryByRole('button', { name: /^수업 시작/ })).not.toBeInTheDocument();
    const preview = openWorkbenchPlanPreview();
    expect(preview.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    fireEvent.click(preview.getByRole('button', { name: '수업 시작' }));
    expect(await screen.findByText('준비되면 시작하세요', { exact: false })).toBeInTheDocument();
    const timer = screen.getByRole('timer').textContent;
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(screen.getByRole('timer').textContent).not.toBe(timer);
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    expect(screen.getByRole('button', { name: '이전 동작' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    const form = within(await screen.findByRole('dialog', { name: '수업 기록 남기기' }));
    fireEvent.click(form.getAllByRole('checkbox')[0]!);
    fireEvent.change(form.getByRole('spinbutton', { name: '분' }), {
      target: { value: '51' },
    });
    fireEvent.change(form.getByRole('spinbutton', { name: '초' }), {
      target: { value: '12' },
    });
    fireEvent.change(form.getByRole('textbox', { name: /다음 수업을 위한 메모/ }), {
      target: { value: '전환이 자연스러웠어요' },
    });
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    const log = usePilatesStore.getState().historyLogs[0]!;
    expect(log.sequenceTitle).toBe('오전 매트 흐름');
    expect(log.actualDurationSec).toBe(3072);
    expect(log.stepsSnapshot?.[0]?.durationMin).toBe(plan[0]!.durationMin + 1);
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    fireEvent.click(nav().getByRole('button', { name: '수업 기록' }));
    expect(await screen.findByText('전환이 자연스러웠어요')).toBeInTheDocument();
    expect(screen.getByText('타이머/입력 시간 51분 12초')).toBeInTheDocument();
  });
  it('restores JSON through settings while preserving the draft, existing data and the v3 local storage key', async () => {
    render(<App />);
    generate();
    fireEvent.change(screen.getByRole('textbox', { name: '시퀀스 제목' }), {
      target: { value: '먼저 저장한 수업' },
    });
    save();
    const existing = usePilatesStore.getState().savedSequences[0]!;
    const backup = JSON.parse(usePilatesStore.getState().exportBackup());
    backup.data.savedSequences = [
      { ...existing, id: 'restored-sequence', title: '백업에서 복원한 수업' },
    ];
    const before = structuredClone(usePilatesStore.getState().activeSteps);
    fireEvent.click(screen.getByRole('button', { name: '데이터 백업과 사용 안내' }));
    const file = new File([JSON.stringify(backup)], 'flow-backup.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(backup) });
    fireEvent.change(await screen.findByLabelText('백업 JSON 파일 선택'), {
      target: { files: [file] },
    });
    const recovery = await screen.findByRole('region', { name: '복구 전 확인' });
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    fireEvent.click(within(recovery).getByRole('button', { name: '이 내용으로 복원 적용' }));
    await waitFor(() => expect(usePilatesStore.getState().savedSequences).toHaveLength(2));
    expect(usePilatesStore.getState().savedSequences).toContainEqual(existing);
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    expect(screen.getByRole('dialog', { name: '나의 스튜디오' })).toHaveTextContent(
      '1개 새 자료를 추가하고 기본 예시 0개를 복원했습니다.',
    );
    const sheet = formatSequenceAsStudioSheet(
      existing.title,
      existing.subtitle,
      existing.steps,
      new Map(usePilatesStore.getState().exercises.map((exercise) => [exercise.id, exercise])),
      'balanced-body',
    );
    expect(sheet).toContain('50분');
    expect(sheet).toContain('01.');
    expect(
      JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')!).state.savedSequences,
    ).toHaveLength(2);
  });
});
