import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { YouTubePreviewModal } from '../components/YouTubePreviewModal';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  composeAiSmartSequence,
  parseNaturalSequencePrompt,
} from '../utils/aiNaturalSequenceComposer';
import { normalizeRigJointMap } from '../utils/motionRigGeometry';
import { syntheticPlanningExercise } from './planningFixtures';

const initialStore = usePilatesStore.getState();

function buildEligibleStudioPool() {
  return [
    { ...syntheticPlanningExercise('reformer', 'warmup'), nameKo: '리포머 호흡 예열' },
    { ...syntheticPlanningExercise('reformer', 'footwork'), nameKo: '리포머 패럴렐 풋워크' },
    { ...syntheticPlanningExercise('reformer', 'bridging'), nameKo: '리포머 분절 브릿지' },
    { ...syntheticPlanningExercise('reformer', 'core'), nameKo: '리포머 코어 암 프레스' },
    { ...syntheticPlanningExercise('reformer', 'lower-body'), nameKo: '리포머 스탠딩 스쿠터' },
    { ...syntheticPlanningExercise('reformer', 'upper-body'), nameKo: '리포머 시티드 로잉' },
    { ...syntheticPlanningExercise('reformer', 'extension'), nameKo: '리포머 롱박스 스완 준비' },
    { ...syntheticPlanningExercise('reformer', 'feet-in-straps'), nameKo: '리포머 스트랩 프로그' },
    { ...syntheticPlanningExercise('reformer', 'cooldown'), nameKo: '리포머 머메이드 이완' },
    {
      ...syntheticPlanningExercise('reformer', 'plank'),
      nameKo: '리포머 하이 플랭크',
      level: '2.0' as const,
    },
  ];
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(initialStore, true);
  localStorage.clear();
  sessionStorage.clear();
});

describe('Natural-Language AI Sequence Composer & In-Place Studio UX', () => {
  it('parses Korean natural-language prompts into apparatus, level, duration, focus, and body-part cautions', () => {
    const parsed = parseNaturalSequencePrompt(
      '리포머 초급 40분, 허리와 손목 부담 없이 코어·복부 위주로 부드럽게 짜줘',
      { apparatus: 'mat', level: '1.5', targetMinutes: 50 },
    );

    expect(parsed.apparatus).toBe('reformer');
    expect(parsed.level).toBe('1.0');
    expect(parsed.targetMinutes).toBe(40);
    expect(parsed.cautions).toEqual(expect.arrayContaining(['lower-back', 'wrist']));
    expect(parsed.preferredLayer).toBe('easy');
  });

  it('composes a balanced Preparation -> Main -> Cooldown sequence fitted to target minutes and shuffles variations', () => {
    const pool = buildEligibleStudioPool();
    const res1 = composeAiSmartSequence({
      prompt: '리포머 중급 45분 둔근·하체 집중, 손목 보호',
      exercises: pool,
      ownedEquipment: ['reformer'],
      ownedProps: ['none', 'mini-ball', 'magic-circle', 'foam-roller', 'theraband'],
      historyLogs: [],
      defaultApparatus: 'reformer',
      defaultLevel: '1.5',
      defaultTargetMinutes: 50,
      seed: 0,
    });

    expect(res1.steps.length).toBeGreaterThanOrEqual(4);
    expect(res1.steps[0]?.classSection).toBe('preparation');
    expect(res1.steps.at(-1)?.classSection).toBe('cooldown');
    // Wrist caution excludes plank
    expect(res1.steps.some((s) => s.blockCategory === 'plank')).toBe(false);
    const totalMin = res1.steps.reduce((acc, st) => acc + st.durationMin, 0);
    expect(Math.round(totalMin)).toBe(45);

    const res2 = composeAiSmartSequence({
      prompt: '리포머 중급 45분 둔근·하체 집중, 손목 보호',
      exercises: pool,
      ownedEquipment: ['reformer'],
      ownedProps: ['none', 'mini-ball', 'magic-circle', 'foam-roller', 'theraband'],
      historyLogs: [],
      defaultApparatus: 'reformer',
      defaultLevel: '1.5',
      defaultTargetMinutes: 50,
      seed: 3,
    });
    expect(res2.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('composes via AiQuickSequenceBar in SequenceStudioWorkbench, supports in-place layer/time/favorite controls, and undoes cleanly', () => {
    const pool = buildEligibleStudioPool();
    usePilatesStore.setState(
      {
        ...initialStore,
        exercises: pool,
        ownedApparatus: ['reformer'],
        ownedEquipment: ['reformer'],
        ownedProps: ['none', 'mini-ball'],
        activeApparatus: 'reformer',
        activeLevel: '1.5',
        activeTargetMinutes: 50,
        activeSteps: [],
        undoStack: [],
      },
      true,
    );

    render(
      <SequenceStudioWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenIdeaSheet={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );

    // 1. Favorite heart toggle & filter
    const favBtn = screen.getByRole('button', { name: '리포머 패럴렐 풋워크 즐겨찾기 등록' });
    fireEvent.click(favBtn);
    fireEvent.click(screen.getByRole('button', { name: '♥ 즐겨찾기' }));
    expect(screen.getByRole('button', { name: '리포머 패럴렐 풋워크' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체' }));

    // 2. Natural-language AI prompt compose
    fireEvent.click(screen.getByText('수업 자동 구성', { selector: 'summary span' }));
    const promptInput = screen.getByTestId('ai-quick-prompt-input');
    fireEvent.change(promptInput, {
      target: { value: '리포머 초급 40분 허리 부담 없이 코어 위주로 짜줘' },
    });
    fireEvent.click(screen.getByTestId('ai-quick-compose-btn'));

    expect(screen.getByTestId('ai-quick-summary')).toHaveTextContent('40분');
    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId('ai-quick-shuffle-btn')).toBeVisible();

    // 3. In-place layer pill & duration nudge on first sequence step
    const firstStep = usePilatesStore.getState().activeSteps[0]!;
    const firstEx = pool.find((e) => e.id === firstStep.exerciseId)!;
    const layerGroup = screen.getByRole('group', { name: `${firstEx.nameKo} 난이도 레이어 선택` });
    fireEvent.click(within(layerGroup).getByRole('button', { name: '심화' }));
    expect(usePilatesStore.getState().activeSteps[0]?.selectedLayer).toBe('hard');

    const beforeDur = usePilatesStore.getState().activeSteps[0]!.durationMin;
    fireEvent.click(screen.getByRole('button', { name: `${firstEx.nameKo} 30초 늘리기` }));
    expect(usePilatesStore.getState().activeSteps[0]!.durationMin).toBeCloseTo(beforeDur + 0.5, 5);

    // 4. Undo restores previous state cleanly
    fireEvent.click(screen.getByRole('button', { name: '마지막 편집 되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[0]!.durationMin).toBeCloseTo(beforeDur, 5);
  });

  it('simplifies YouTubePreviewModal & Studio3DMotionHeroCard with friendly Korean posture labels and inline layer switcher', () => {
    const sample = INITIAL_EXERCISES.find((ex) => ex.id === 'original-reformer-supine-breath')!;
    render(<YouTubePreviewModal exercise={sample} onClose={vi.fn()} />);

    const hero = screen.getByTestId('studio-3d-motion-hero-card');
    expect(hero).toHaveTextContent('리포머 · 편안히 누운 자세');

    // 강도 정보는 요청했을 때 펼쳐 같은 자리에서 조절한다.
    fireEvent.click(screen.getByText('기구 설정과 강도 조절'));
    const layerSwitcher = screen.getByTestId('detail-layer-switcher');
    fireEvent.click(within(layerSwitcher).getByRole('button', { name: '완화' }));
    expect(layerSwitcher).toHaveTextContent(sample.layers.easy);

    // Primary 3D hero mounts interactive 360° 3D viewport directly without engineering frame jargon
    const viewport3d = within(hero).getByTestId('studio-interactive-3d-viewport');
    expect(viewport3d).not.toHaveTextContent(/프레임 \d+ \//);
    expect(
      within(viewport3d).getByRole('slider', { name: '3D 동작 진행 구간 스크러버' }),
    ).toBeInTheDocument();
  });

  it('anchors independent quadruped farKnee/farWrist and side-splits farHip without anatomical detachment', () => {
    const quad = getMovementVisualAsset('original-mat-quadruped-reach')!;
    const normMid = normalizeRigJointMap(quad.phases.middle.joints, quad.phases.start.joints);
    // Supporting kneeling ankle remains grounded near mat (y >= 140), never lifted to extended ankle (y <= 95)
    expect(normMid.farAnkle!.y).toBeGreaterThanOrEqual(140);
    expect(normMid.ankle.y).toBeLessThan(100);

    // Side splits keeps farHip connected within 10px of pelvis
    const splits = getMovementVisualAsset('ex-lower-02')!;
    const mid = splits.phases.middle.joints;
    expect(
      Math.hypot(mid.farHip!.x - mid.pelvis.x, mid.farHip!.y - mid.pelvis.y),
    ).toBeLessThanOrEqual(10);
  });
});
