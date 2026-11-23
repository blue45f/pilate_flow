import { describe, expect, it, beforeEach } from 'vitest';
import {
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import type { ClassHistoryLog, SequenceStep } from '../types/pilates';
import {
  buildMonthlyInstructorGrowthReport,
  buildSubInstructorHandoffBrief,
  generatePostClassFollowUpDraft,
  renderFaqTemplateText,
  sanitizeMemberAliasKo,
  STUDIO_FAQ_QUICK_TEMPLATES,
} from './instructorChoreAutomation';
import {
  adaptSequenceSpringsForVenue,
  autoAdaptSequenceForResources,
  createDefaultResourceQuantities,
  DEFAULT_FREELANCE_VENUE_PRESETS,
  DEFAULT_STUDIO_INVENTORY,
  detectTimeSlotResourceConflicts,
  loadSavedStudioRoleMode,
  saveStudioRoleMode,
  STUDIO_ROLE_STORAGE_KEY,
  summarizeFreelanceEarnings,
} from './studioPropAllocator';
import type {
  ConcurrentRoomSession,
  StudioResourceInventory,
} from './studioPropAllocator';

function buildMagicCircleAndLongBoxSteps(): SequenceStep[] {
  // Uses ex-warmup-01 (mini-ball), ex-footwork-02 (magic-circle), ex-bridging-01 (none),
  // ex-core-01 (none), ex-extension-01 (long-box), ex-cooldown-01 (none)
  return [
    {
      stepId: 'step-warmup',
      order: 1,
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-footwork-ring',
      order: 2,
      blockCategory: 'footwork',
      exerciseId: 'ex-footwork-02',
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-bridging',
      order: 3,
      blockCategory: 'bridging',
      exerciseId: 'ex-bridging-01',
      durationMin: 5,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-core',
      order: 4,
      blockCategory: 'core',
      exerciseId: 'ex-core-01',
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-extension-longbox',
      order: 5,
      blockCategory: 'extension',
      exerciseId: 'ex-extension-01',
      durationMin: 5,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-cooldown',
      order: 6,
      blockCategory: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 4,
      selectedLayer: 'standard',
    },
  ];
}

describe('studioPropAllocator & instructorChoreAutomation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('1. 동시간대 타 룸 소도구 사용량을 합산해 부족 수량(shortage)과 잔여 수량(remaining)을 정확히 계산한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const concurrent: ConcurrentRoomSession[] = [
      {
        sessionId: 'b-1000',
        roomId: 'room-b-chair-barrel',
        roomNameKo: 'B룸 · 체어·바렐',
        instructorAliasKo: 'B룸 담당 강사',
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
        headcount: 6,
        primaryApparatus: 'chair',
        requiredResourcesPerMember: ['magic-circle'],
        active: true,
      },
    ];

    const report = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY, // magic-circle: 6, mini-ball: 10
      myHeadcount: 6,
      concurrentSessions: concurrent,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
      durationMin: 50,
    });

    const ringAlloc = report.resourceAllocations.find((item) => item.resourceId === 'magic-circle');
    const ballAlloc = report.resourceAllocations.find((item) => item.resourceId === 'mini-ball');

    expect(report.hasAnyConflict).toBe(true);
    expect(ringAlloc).toBeDefined();
    expect(ringAlloc?.totalInventory).toBe(6);
    expect(ringAlloc?.otherRoomsUsed).toBe(6);
    expect(ringAlloc?.remainingBeforeMyClass).toBe(0);
    expect(ringAlloc?.myClassNeeded).toBe(6);
    expect(ringAlloc?.shortage).toBe(6);
    expect(ringAlloc?.status).toBe('conflict');
    expect(ringAlloc?.affectedStepIds).toEqual(['step-footwork-ring']);

    expect(ballAlloc?.shortage).toBe(0);
    expect(ballAlloc?.remainingAfterMyClass).toBe(4);
    expect(report.availableSubstituteProps.some((p) => p.resourceId === 'mini-ball')).toBe(true);
  });

  it('2. 시간이 겹치지 않거나 비활성화된 타 룸 수업은 충돌로 집계하지 않는다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const nonOverlapping: ConcurrentRoomSession[] = [
      {
        sessionId: 'b-1100',
        roomId: 'room-b-chair-barrel',
        roomNameKo: 'B룸 · 체어·바렐',
        instructorAliasKo: 'B룸 담당 강사',
        date: '2026-11-24',
        startTime: '11:00',
        durationMin: 50,
        headcount: 6,
        primaryApparatus: 'chair',
        requiredResourcesPerMember: ['magic-circle'],
        active: true,
      },
      {
        sessionId: 'c-1000-off',
        roomId: 'room-c-cadillac-private',
        roomNameKo: 'C룸 · 1:1 캐딜락',
        instructorAliasKo: 'C룸 담당 강사',
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
        headcount: 6,
        primaryApparatus: 'cadillac',
        requiredResourcesPerMember: ['magic-circle'],
        active: false,
      },
    ];

    const report = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY,
      myHeadcount: 6,
      concurrentSessions: nonOverlapping,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
      durationMin: 50,
    });

    expect(report.hasAnyConflict).toBe(false);
    expect(report.conflictingResources).toHaveLength(0);
    expect(report.activeConcurrentSessions).toHaveLength(0);
  });

  it('3. 롱박스·숏박스 같은 기구 부속 교보재 충돌도 소도구와 함께 정밀 감지한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const concurrent: ConcurrentRoomSession[] = [
      {
        sessionId: 'b-longbox',
        roomId: 'room-b-chair-barrel',
        roomNameKo: 'B룸 · 체어·바렐',
        instructorAliasKo: 'B룸 담당 강사',
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
        headcount: 4,
        primaryApparatus: 'chair',
        requiredResourcesPerMember: ['long-box'],
        active: true,
      },
    ];

    const report = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY, // long-box: 6
      myHeadcount: 6,
      concurrentSessions: concurrent,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
      durationMin: 50,
    });

    const boxAlloc = report.conflictingResources.find((item) => item.resourceId === 'long-box');
    expect(boxAlloc).toBeDefined();
    expect(boxAlloc?.remainingBeforeMyClass).toBe(2);
    expect(boxAlloc?.shortage).toBe(4);
    expect(boxAlloc?.affectedStepIds).toContain('step-extension-longbox');
  });

  it('4. 리포머 1대 고장 등 기구 가동 대수 부족을 감지하고 대체 기구 후보를 제시한다', () => {
    const brokenReformerInventory: StudioResourceInventory = {
      ...DEFAULT_STUDIO_INVENTORY,
      rooms: DEFAULT_STUDIO_INVENTORY.rooms.map((room) =>
        room.roomId === 'room-a-reformer' ? { ...room, operationalUnits: 5 } : room,
      ),
    };

    const report = detectTimeSlotResourceConflicts({
      steps: INITIAL_SAVED_SEQUENCES[0].steps,
      exercises: INITIAL_EXERCISES,
      inventory: brokenReformerInventory,
      myHeadcount: 6,
      concurrentSessions: [],
      myRoomId: 'room-a-reformer',
    });

    expect(report.hasAnyConflict).toBe(true);
    expect(report.apparatusConflict).not.toBeNull();
    expect(report.apparatusConflict?.shortageUnits).toBe(1);
    expect(report.apparatusConflict?.fallbackApparatusCandidates).toContain('chair');
  });

  it('5. 전략①(swap-available-prop): 부족한 써클링 동작만 여유 소도구·대체 동작으로 바꾸고 큐 메모를 동기화한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const concurrent: ConcurrentRoomSession[] = [
      {
        sessionId: 'b-ring',
        roomId: 'room-b-chair-barrel',
        roomNameKo: 'B룸 · 체어·바렐',
        instructorAliasKo: 'B룸 담당 강사',
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
        headcount: 6,
        primaryApparatus: 'chair',
        requiredResourcesPerMember: ['magic-circle'],
        active: true,
      },
    ];

    const conflictReport = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY,
      myHeadcount: 6,
      concurrentSessions: concurrent,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
    });

    const plan = autoAdaptSequenceForResources({
      steps,
      exercises: INITIAL_EXERCISES,
      conflictReport,
    });

    const swap = plan.strategies.find((s) => s.strategyId === 'swap-available-prop');
    expect(swap?.applicable).toBe(true);
    expect(swap?.remainingShortageCount).toBe(0);
    expect(swap?.changes.length).toBe(1);
    expect(swap?.changes[0].stepId).toBe('step-footwork-ring');
    expect(swap?.changes[0].cueSyncNoteKo.length).toBeGreaterThan(5);

    // Re-checking conflicts after applying adapted steps should report zero prop conflicts!
    const afterReport = detectTimeSlotResourceConflicts({
      steps: swap!.adaptedSteps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY,
      myHeadcount: 6,
      concurrentSessions: concurrent,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
    });
    expect(afterReport.conflictingResources).toHaveLength(0);
  });

  it('6. 전략①은 잠금(locked)된 동작을 강제로 덮어쓰지 않고 보존한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps().map((step) =>
      step.stepId === 'step-footwork-ring' ? { ...step, locked: true } : step,
    );
    const conflictReport = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: {
        ...DEFAULT_STUDIO_INVENTORY,
        quantities: createDefaultResourceQuantities({ 'magic-circle': 0 }),
      },
      myHeadcount: 6,
      concurrentSessions: [],
      myRoomId: 'room-a-reformer',
    });

    const plan = autoAdaptSequenceForResources({
      steps,
      exercises: INITIAL_EXERCISES,
      conflictReport,
      preserveLockedSteps: true,
    });

    const swap = plan.strategies.find((s) => s.strategyId === 'swap-available-prop');
    const keptStep = swap?.adaptedSteps.find((s) => s.stepId === 'step-footwork-ring');
    expect(keptStep?.exerciseId).toBe('ex-footwork-02');
    expect(swap?.changes[0].changeKind).toBe('kept-locked');
  });

  it('7. 전략②(stagger-half-class): 써클링 6개로 A/B룸 12명이 충돌 없이 수업하도록 전·후반 교차 타임셰어를 생성한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const concurrent: ConcurrentRoomSession[] = [
      {
        sessionId: 'b-ring-first-half',
        roomId: 'room-b-chair-barrel',
        roomNameKo: 'B룸 · 체어·바렐',
        instructorAliasKo: 'B룸 담당 강사',
        date: '2026-11-24',
        startTime: '10:00',
        durationMin: 50,
        headcount: 6,
        primaryApparatus: 'chair',
        requiredResourcesPerMember: ['magic-circle'],
        propUsageWindow: 'first-half',
        active: true,
      },
    ];

    const conflictReport = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: DEFAULT_STUDIO_INVENTORY,
      myHeadcount: 6,
      concurrentSessions: concurrent,
      myRoomId: 'room-a-reformer',
      date: '2026-11-24',
      startTime: '10:00',
    });

    const plan = autoAdaptSequenceForResources({
      steps,
      exercises: INITIAL_EXERCISES,
      conflictReport,
    });

    const stagger = plan.strategies.find((s) => s.strategyId === 'stagger-half-class');
    expect(stagger?.applicable).toBe(true);
    expect(stagger?.remainingShortageCount).toBe(0);
    // Since B room uses first-half, my class should schedule magic-circle in second-half
    expect(stagger?.timeShareSchedule?.myPropWindow).toBe('second-half');
    expect(stagger?.timeShareSchedule?.copyableRoomNoticeKo).toContain('써클링');
    // Warmup stays first, cooldown stays last for spinal safety
    expect(stagger?.adaptedSteps[0].blockCategory).toBe('warmup');
    expect(stagger?.adaptedSteps[stagger.adaptedSteps.length - 1].blockCategory).toBe('cooldown');
    // Magic-circle step moved after non-prop middle steps
    const ringIndex = stagger!.adaptedSteps.findIndex((s) => s.stepId === 'step-footwork-ring');
    const coreIndex = stagger!.adaptedSteps.findIndex((s) => s.stepId === 'step-core');
    expect(ringIndex).toBeGreaterThan(coreIndex);
  });

  it('8. 전략②는 센터 보유 총량이 단일 반 인원보다 적으면 적용 불가 사유를 명확히 반환한다', () => {
    const steps = buildMagicCircleAndLongBoxSteps();
    const tinyStockInventory: StudioResourceInventory = {
      ...DEFAULT_STUDIO_INVENTORY,
      quantities: createDefaultResourceQuantities({ 'magic-circle': 3 }),
    };
    const conflictReport = detectTimeSlotResourceConflicts({
      steps,
      exercises: INITIAL_EXERCISES,
      inventory: tinyStockInventory,
      myHeadcount: 6,
      concurrentSessions: [],
      myRoomId: 'room-a-reformer',
    });

    const plan = autoAdaptSequenceForResources({
      steps,
      exercises: INITIAL_EXERCISES,
      conflictReport,
    });

    const stagger = plan.strategies.find((s) => s.strategyId === 'stagger-half-class');
    expect(stagger?.applicable).toBe(false);
    expect(stagger?.unapplicableReasonKo).toBeTruthy();
  });

  it('9. 전략③(adapt-room-apparatus): 리포머 고장/룸 변경 시 목표 부위·시간·척추 흐름을 유지하며 체어/매트로 자동 치환한다', () => {
    const baseSteps = INITIAL_SAVED_SEQUENCES[0].steps;
    const baseTotalMin = baseSteps.reduce((sum, s) => sum + s.durationMin, 0);
    const brokenInventory: StudioResourceInventory = {
      ...DEFAULT_STUDIO_INVENTORY,
      rooms: DEFAULT_STUDIO_INVENTORY.rooms.map((room) =>
        room.roomId === 'room-a-reformer' ? { ...room, operationalUnits: 4 } : room,
      ),
    };

    const conflictReport = detectTimeSlotResourceConflicts({
      steps: baseSteps,
      exercises: INITIAL_EXERCISES,
      inventory: brokenInventory,
      myHeadcount: 6,
      concurrentSessions: [],
      myRoomId: 'room-a-reformer',
    });

    const plan = autoAdaptSequenceForResources({
      steps: baseSteps,
      exercises: INITIAL_EXERCISES,
      conflictReport,
      preferredFallbackApparatus: 'chair',
    });

    const converted = plan.strategies.find((s) => s.strategyId === 'adapt-room-apparatus');
    expect(converted?.applicable).toBe(true);
    expect(converted?.recommended).toBe(true);
    expect(converted?.changes.length).toBeGreaterThanOrEqual(5);

    const adaptedTotalMin = converted!.adaptedSteps.reduce((sum, s) => sum + s.durationMin, 0);
    expect(adaptedTotalMin).toBe(baseTotalMin);

    const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const adaptedApparatuses = new Set(
      converted!.adaptedSteps.map((s) => exerciseMap.get(s.exerciseId)?.apparatus),
    );
    expect(adaptedApparatuses.has('chair')).toBe(true);
    expect(adaptedApparatuses.has('reformer')).toBe(false);
    expect(converted!.preservedSpinalPlanes.length).toBeGreaterThanOrEqual(3);
  });

  it('10. 프리랜서 출강 센터 스프링 전환 및 월간 출강 횟수/수업료 집계를 정확히 계산한다', () => {
    const stottVenue = DEFAULT_FREELANCE_VENUE_PRESETS.find((v) => v.reformerBrand === 'stott')!;
    const adapted = adaptSequenceSpringsForVenue(
      INITIAL_SAVED_SEQUENCES[0].steps,
      INITIAL_EXERCISES,
      stottVenue,
    );

    expect(adapted.updatedStepCount).toBeGreaterThan(0);
    expect(adapted.adaptedSteps[0].instructorNote).toContain('출강 스프링');

    const summary = summarizeFreelanceEarnings([
      {
        id: 'e1',
        venueId: 'venue-a',
        venueLabelKo: 'A 센터',
        classCount: 10,
        feePerClassKrw: 45_000,
      },
      {
        id: 'e2',
        venueId: 'venue-b',
        venueLabelKo: 'B 센터',
        classCount: 5,
        feePerClassKrw: 60_000,
      },
    ]);

    expect(summary.totalClasses).toBe(15);
    expect(summary.totalFeeKrw).toBe(750_000);
    expect(summary.averageFeeKrw).toBe(50_000);
    expect(summary.byVenue).toHaveLength(2);
  });

  it('11. 강사 운영 모드(StudioRoleMode)는 기본값 freelance를 반환하고 localStorage에 저장·복원한다', () => {
    expect(loadSavedStudioRoleMode()).toBe('freelance');
    saveStudioRoleMode('center-manager');
    expect(window.localStorage.getItem(STUDIO_ROLE_STORAGE_KEY)).toBe('center-manager');
    expect(loadSavedStudioRoleMode()).toBe('center-manager');

    saveStudioRoleMode('solo-owner');
    expect(loadSavedStudioRoleMode()).toBe('solo-owner');
  });

  it('12. 수업 직후 회원 안내 초안은 실명·연락처·질환 표현을 자동 정화하고 3분 홈케어 팁 2종을 포함한다', () => {
    const scrubbedAlias = sanitizeMemberAliasKo('김지영 회원 010-1234-5678 디스크');
    expect(scrubbedAlias.wasSanitized).toBe(true);
    expect(scrubbedAlias.aliasKo).not.toContain('김지영');
    expect(scrubbedAlias.aliasKo).not.toContain('010');

    const draft = generatePostClassFollowUpDraft({
      memberAliasKo: '김지영 회원 010-1234-5678',
      classTitleKo: INITIAL_SAVED_SEQUENCES[0].title,
      apparatus: 'reformer',
      steps: INITIAL_SAVED_SEQUENCES[0].steps,
      exercises: INITIAL_EXERCISES,
      tone: 'warm',
    });

    expect(draft.privacyNoticeKo).toBeTruthy();
    expect(draft.homeCareTipsKo).toHaveLength(2);
    expect(draft.kakaoCopyTextKo).not.toContain('김지영');
    expect(draft.kakaoCopyTextKo).not.toContain('010-1234-5678');
    expect(draft.kakaoCopyTextKo).not.toMatch(/치료|완치|진단/);
    expect(draft.kakaoCopyTextKo).toContain('집에서 3분');
  });

  it('13. 자주 묻는 안내 5종 템플릿이 비의료 문구로 제공되며 센터명·취소 마감시간을 반영한다', () => {
    expect(STUDIO_FAQ_QUICK_TEMPLATES).toHaveLength(5);
    const ids = STUDIO_FAQ_QUICK_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      'attire-socks',
      'parking-arrival',
      'cancel-reschedule',
      'first-class-prep',
      'post-class-recovery',
    ]);

    const customized = renderFaqTemplateText('cancel-reschedule', {
      studioNameKo: '아틀리에 필라테스',
      cancelHours: 12,
    });
    expect(customized).toContain('[아틀리에 필라테스]');
    expect(customized).toContain('12시간 전까지');
    expect(customized).not.toMatch(/치료|완치|진단/);
  });

  it('14. 월간 수업 밸런스 리포트는 척추 4평면 편식을 감지하고 황금 패턴과 5점 수업 특징을 요약한다', () => {
    // Construct logs with neutral/flexion only (zero lateral/rotation) to trigger imbalance alert
    const skewedLogs: ClassHistoryLog[] = [
      {
        ...INITIAL_HISTORY_LOGS[0],
        id: 'log-skew-1',
        exerciseIds: ['ex-warmup-01', 'ex-footwork-01', 'ex-bridging-01', 'ex-core-01'],
        rating: 5,
      },
      {
        ...INITIAL_HISTORY_LOGS[1],
        id: 'log-skew-2',
        exerciseIds: ['ex-warmup-01', 'ex-footwork-01', 'ex-core-01'],
        rating: 5,
      },
    ];

    const report = buildMonthlyInstructorGrowthReport({
      historyLogs: skewedLogs,
      exercises: INITIAL_EXERCISES,
    });

    expect(report.totalSessions).toBe(2);
    expect(report.averageRating).toBe(5);
    expect(report.fiveStarSessionCount).toBe(2);
    expect(report.imbalanceAlertKo).toBeTruthy();
    expect(report.goldenPatterns[0].usedCount).toBe(2);
    expect(report.fiveStarHighlightsKo.length).toBeGreaterThanOrEqual(2);
  });

  it('15. 대강 3분 인수인계 요약은 첫 스프링·교보재 수량·흐름을 정리하고 민감 건강정보를 자동 마스킹한다', () => {
    const brief = buildSubInstructorHandoffBrief({
      classTitleKo: INITIAL_SAVED_SEQUENCES[0].title,
      roomNameKo: 'A룸 · 리포머 6:1',
      slotLabelKo: '2026-11-24 10:00 (50분)',
      headcount: 6,
      apparatus: 'reformer',
      steps: INITIAL_SAVED_SEQUENCES[0].steps,
      exercises: INITIAL_EXERCISES,
      specialNoteKo: '허리 디스크 환자 있음 · 차분한 속도로 진행',
    });

    expect(brief.headlineKo).toContain('A룸');
    expect(brief.checklistKo.length).toBeGreaterThanOrEqual(3);
    expect(brief.copyTextKo).toContain('시작 세팅');
    expect(brief.copyTextKo).not.toContain('디스크');
    expect(brief.copyTextKo).not.toContain('환자');
  });
});
