import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  adaptSequenceForPrivateProfile,
  analyzeGroupFlowTransitions,
  applyPrivateAdaptationsToSteps,
  buildGroupLayeringMatrix,
  buildMemberRecapCard,
  renderMemberRecapCardSvg,
  sanitizePrivateMemberProfile,
} from './lessonFormatEngine';

function makeExercise(overrides: Partial<PilatesExercise> & Pick<PilatesExercise, 'id' | 'nameKo'>): PilatesExercise {
  const base = INITIAL_EXERCISES[0]!;
  return {
    ...base,
    ...overrides,
    layers: overrides.layers ?? {
      easy: `${overrides.nameKo} 완화 변형`,
      standard: `${overrides.nameKo} 기본 수행`,
      hard: `${overrides.nameKo} 심화 변형`,
    },
  };
}

const SAMPLE_EXERCISES: PilatesExercise[] = [
  makeExercise({
    id: 'ex-supine-warmup',
    nameKo: '펠빅 클락 호흡',
    nameEn: 'Pelvic Clock Breathing',
    apparatus: 'reformer',
    blockCategory: 'warmup',
    bodyPosition: 'supine',
    spinalPlanes: ['neutral', 'flexion'],
    springs: '2R 1B',
    box: 'none',
    footbar: 'high',
    level: '1.0',
  }),
  makeExercise({
    id: 'ex-footwork',
    nameKo: '리포머 클래식 풋워크',
    nameEn: 'Reformer Footwork',
    apparatus: 'reformer',
    blockCategory: 'footwork',
    bodyPosition: 'supine',
    spinalPlanes: ['neutral'],
    springs: '2R 1B',
    box: 'none',
    footbar: 'high',
    level: '1.0',
  }),
  makeExercise({
    id: 'ex-hundred',
    nameKo: '리포머 헌드레드',
    nameEn: 'Reformer Hundred',
    apparatus: 'reformer',
    blockCategory: 'core',
    bodyPosition: 'supine',
    spinalPlanes: ['flexion'],
    springs: '1R 1B',
    box: 'none',
    footbar: 'high',
    level: '1.5',
  }),
  makeExercise({
    id: 'ex-plank',
    nameKo: '롱 스트레치 플랭크',
    nameEn: 'Long Stretch Plank',
    apparatus: 'reformer',
    blockCategory: 'plank',
    bodyPosition: 'quadruped',
    spinalPlanes: ['neutral'],
    springs: '1R',
    box: 'none',
    footbar: 'high',
    level: '2.0',
    precautions: '손목에 체중이 과하게 실리지 않게 중심을 끌어올립니다.',
  }),
  makeExercise({
    id: 'ex-swan',
    nameKo: '롱박스 스완 익스텐션',
    nameEn: 'Long Box Swan Extension',
    apparatus: 'reformer',
    blockCategory: 'extension',
    bodyPosition: 'prone',
    spinalPlanes: ['extension'],
    springs: '1R',
    box: 'long-box',
    footbar: 'down',
    level: '1.5',
  }),
  makeExercise({
    id: 'ex-mermaid',
    nameKo: '머메이드 측굴 & 회전',
    nameEn: 'Mermaid Side Bend & Twist',
    apparatus: 'reformer',
    blockCategory: 'cooldown',
    bodyPosition: 'seated',
    spinalPlanes: ['lateral', 'rotation'],
    springs: '1B',
    box: 'none',
    footbar: 'high',
    level: '1.0',
  }),
  makeExercise({
    id: 'ex-kneeling-lunge',
    nameKo: '닐링 스쿠터 런지',
    nameEn: 'Kneeling Scooter Lunge',
    apparatus: 'reformer',
    blockCategory: 'lower-body',
    bodyPosition: 'kneeling',
    spinalPlanes: ['neutral'],
    springs: '1R',
    box: 'none',
    footbar: 'high',
    level: '1.5',
  }),
];

const SAMPLE_STEPS: SequenceStep[] = [
  {
    stepId: 's1',
    order: 1,
    blockCategory: 'warmup',
    exerciseId: 'ex-supine-warmup',
    durationMin: 4,
    selectedLayer: 'standard',
  },
  {
    stepId: 's2',
    order: 2,
    blockCategory: 'footwork',
    exerciseId: 'ex-footwork',
    durationMin: 6,
    selectedLayer: 'standard',
  },
  {
    stepId: 's3',
    order: 3,
    blockCategory: 'core',
    exerciseId: 'ex-hundred',
    durationMin: 5,
    selectedLayer: 'standard',
  },
  {
    stepId: 's4',
    order: 4,
    blockCategory: 'plank',
    exerciseId: 'ex-plank',
    durationMin: 4,
    selectedLayer: 'hard',
  },
  {
    stepId: 's5',
    order: 5,
    blockCategory: 'extension',
    exerciseId: 'ex-swan',
    durationMin: 5,
    selectedLayer: 'standard',
  },
  {
    stepId: 's6',
    order: 6,
    blockCategory: 'cooldown',
    exerciseId: 'ex-mermaid',
    durationMin: 4,
    selectedLayer: 'standard',
  },
];

describe('lessonFormatEngine — privacy & private 1:1 mode', () => {
  it('strips real names, phone numbers, emails, and medical diagnoses into safe aliases', () => {
    const res = sanitizePrivateMemberProfile({
      alias: '김민지',
      focusGoal: '허리 디스크 치료 010-1234-5678 test@example.com',
      comfortGuards: ['lower-back'],
      recentNotes: '박서연 회원 수술 후 재활 환자',
    });

    expect(res.hadSensitiveInput).toBe(true);
    expect(res.noticeKo).toBeTruthy();
    expect(res.profile.alias).toBe('회원 A · 금요 2시 개인');
    expect(res.profile.focusGoal).not.toMatch(/010-1234-5678|디스크|test@example\.com/);
    expect(res.profile.recentNotes).not.toMatch(/박서연|수술|환자/);
  });

  it('keeps clean non-identifying aliases intact without false privacy warnings', () => {
    const res = sanitizePrivateMemberProfile({
      alias: '회원 A · 금요 2시 개인',
      focusGoal: '코어 안정과 흉추 가동성',
      comfortGuards: ['wrist', 'neck'],
    });

    expect(res.hadSensitiveInput).toBe(false);
    expect(res.noticeKo).toBeNull();
    expect(res.profile.alias).toBe('회원 A · 금요 2시 개인');
    expect(res.profile.comfortGuards).toEqual(['wrist', 'neck']);
  });

  it('adapts sequence steps for wrist, neck, knee, and lower-back comfort guards and respects locks/rest', () => {
    const stepsWithRestAndLock: SequenceStep[] = [
      ...SAMPLE_STEPS.slice(0, 3),
      {
        stepId: 's-rest',
        kind: 'rest',
        order: 4,
        blockCategory: 'cooldown',
        exerciseId: '',
        durationMin: 1,
        selectedLayer: 'standard',
      },
      { ...SAMPLE_STEPS[3]!, locked: true }, // locked plank
      SAMPLE_STEPS[4]!, // unlocked swan (lower-back)
      {
        stepId: 's7',
        order: 7,
        blockCategory: 'lower-body',
        exerciseId: 'ex-kneeling-lunge',
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];

    const adaptation = adaptSequenceForPrivateProfile(
      stepsWithRestAndLock,
      SAMPLE_EXERCISES,
      {
        alias: '회원 B · 오전 개인',
        focusGoal: '전신 정렬과 편안한 움직임',
        comfortGuards: ['wrist', 'neck', 'knee', 'lower-back'],
      },
      SAMPLE_EXERCISES,
    );

    const plankRow = adaptation.stepAdaptations.find((a) => a.exerciseId === 'ex-plank');
    const hundredRow = adaptation.stepAdaptations.find((a) => a.exerciseId === 'ex-hundred');
    const swanRow = adaptation.stepAdaptations.find((a) => a.exerciseId === 'ex-swan');
    const lungeRow = adaptation.stepAdaptations.find((a) => a.exerciseId === 'ex-kneeling-lunge');

    expect(plankRow?.matchedGuards).toContain('wrist');
    expect(plankRow?.recommendedLayer).toBe('easy');
    expect(plankRow?.suggestedAlternative).toBeDefined();

    expect(hundredRow?.matchedGuards).toContain('neck');
    expect(swanRow?.matchedGuards).toContain('lower-back');
    expect(lungeRow?.matchedGuards).toContain('knee');

    const updatedSteps = applyPrivateAdaptationsToSteps(stepsWithRestAndLock, adaptation);
    const lockedPlank = updatedSteps.find((s) => s.stepId === 's4');
    const unlockedSwan = updatedSteps.find((s) => s.stepId === 's5');
    const restStep = updatedSteps.find((s) => s.stepId === 's-rest');

    expect(lockedPlank?.selectedLayer).toBe('hard'); // locked step preserved
    expect(unlockedSwan?.selectedLayer).toBe('easy'); // unlocked flagged step adapted
    expect(restStep?.kind).toBe('rest'); // rest preserved
  });

  it('builds a post-class member recap card with 4 spinal planes, 2 highlights, 2 guard-safe home tips, Kakao text & valid SVG', () => {
    const card = buildMemberRecapCard({
      steps: SAMPLE_STEPS,
      exercises: SAMPLE_EXERCISES,
      profile: {
        alias: '회원 A · 금요 2시 개인',
        focusGoal: '흉추 열기와 편안한 코어 정렬',
        comfortGuards: ['wrist', 'knee'],
      },
      sequenceTitle: '리포머 밸런스 1:1',
      sessionDateIso: '2026-11-23',
    });

    expect(card.memberAlias).toBe('회원 A · 금요 2시 개인');
    expect(card.coveredPlaneCount).toBe(4);
    expect(card.spinalBalance).toHaveLength(4);
    expect(card.highlightMoves).toHaveLength(2);
    expect(card.homeCareTips).toHaveLength(2);
    // Wrist & knee comfort guards must exclude quadruped cat-cow homecare tip
    expect(card.homeCareTips.every((t) => !t.titleKo.includes('네발기기'))).toBe(true);

    expect(card.kakaoShareText).toContain('회원 A · 금요 2시 개인');
    expect(card.kakaoShareText).toContain('척추 4평면 밸런스 (4/4 방향)');
    expect(card.kakaoShareText).toContain('집에서 3분 매트 홈케어 참고');
    expect(card.kakaoShareText).not.toMatch(/완치|처방전|교정\s*보장/);

    const svg = renderMemberRecapCardSvg(card);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('오늘의 1:1 수업 리캡');
    expect(svg).toContain('회원 A · 금요 2시 개인');
    expect(svg).toContain('집에서 3분 매트 홈케어 참고');
  });
});

describe('lessonFormatEngine — group 6:1 mode', () => {
  it('generates a 3-tier simultaneous layering cue sheet for all non-rest steps', () => {
    const matrix = buildGroupLayeringMatrix(SAMPLE_STEPS, SAMPLE_EXERCISES, {
      classSize: 6,
      brand: 'intopilates',
    });

    expect(matrix.classSize).toBe(6);
    expect(matrix.rows).toHaveLength(6);
    expect(matrix.rows[0]!.tiers.easy).toContain('완화');
    expect(matrix.rows[0]!.tiers.standard).toContain('기본');
    expect(matrix.rows[0]!.tiers.hard).toContain('심화');
    expect(matrix.copyableCueSheetText).toContain('[6:1 그룹 레슨 · 3단계 동시 레이어링 큐 시트]');
    expect(matrix.copyableCueSheetText).toContain('완화(초보):');
    expect(matrix.copyableCueSheetText).toContain('심화:');
  });

  it('diagnoses 6:1 spring/box transition bottlenecks and highlights spring-keep streaks', () => {
    const flow = analyzeGroupFlowTransitions(SAMPLE_STEPS, SAMPLE_EXERCISES, { classSize: 6 });

    expect(flow.classSize).toBe(6);
    expect(flow.exerciseCount).toBe(6);
    // Steps 1 & 2 share reformer + 2R 1B + no box -> spring-keep streak!
    expect(flow.springKeepStreaks.length).toBeGreaterThanOrEqual(1);
    expect(flow.springKeepStreaks[0]!.startOrder).toBe(1);
    expect(flow.springKeepStreaks[0]!.endOrder).toBe(2);
    expect(flow.springKeepStreaks[0]!.springCode).toBe('2R 1B');
    expect(flow.springKeepStreaks[0]!.totalMinutes).toBe(10);

    // Step 5 (long-box swan) changes box -> bottleneck!
    const swanTransition = flow.transitions.find((t) => t.exerciseId === 'ex-swan');
    expect(swanTransition?.boxChanged).toBe(true);
    expect(swanTransition?.status).toBe('bottleneck');
    expect(swanTransition?.estimatedGroupSec).toBeGreaterThanOrEqual(40);
    expect(flow.bottleneckCount).toBeGreaterThanOrEqual(1);
    expect(flow.springChangeCount).toBeGreaterThanOrEqual(2);
  });
});
