import type { ApparatusType, PilatesExercise } from '../types/pilates';

export type Studio3DSignatureId =
  | 'reformer-footwork'
  | 'reformer-bridge'
  | 'reformer-shortspine'
  | 'reformer-longbox-teaser'
  | 'reformer-elephant'
  | 'reformer-mermaid'
  | 'reformer-scooter-lunge'
  | 'mat-hundred'
  | 'mat-twist'
  | 'mat-sidekick-plank'
  | 'chair-pedal-press'
  | 'chair-goingup'
  | 'chair-pike'
  | 'cadillac-cat-rolldown'
  | 'cadillac-teaser'
  | 'cadillac-hanging'
  | 'cadillac-leg-springs'
  | 'barrel-sidebend'
  | 'barrel-swan'
  | 'barrel-horseback';

export interface Studio3DMotionSpec {
  readonly signatureId: Studio3DSignatureId;
  readonly titleKo: string;
  readonly startImg: string;
  readonly peakImg: string;
  readonly matchScope: 'exact-signature' | 'apparatus-family-reference';
  readonly matchScopeBadgeKo: string;
  readonly excursionLabelKo: string;
  readonly anchorLabelKo: string;
  readonly activeMuscleSummaryKo: string;
  /** Normalized 0..100 SVG viewBox coordinates over 1280x840 studio render */
  readonly trajectoryArc: {
    readonly from: readonly [number, number];
    readonly ctrl: readonly [number, number];
    readonly to: readonly [number, number];
  };
  readonly anchorPoint: readonly [number, number];
}

export const STUDIO_3D_SIGNATURES: Record<
  Studio3DSignatureId,
  Omit<Studio3DMotionSpec, 'matchScope' | 'matchScopeBadgeKo'>
> = {
  'reformer-footwork': {
    signatureId: 'reformer-footwork',
    titleKo: '리포머 풋워크 · 캐리지 활주 & 하지 정렬',
    startImg: '/motion-studio3d/footwork-start.png',
    peakImg: '/motion-studio3d/footwork-peak.png',
    excursionLabelKo: '캐리지 수평 활주 · 스프링 신장',
    anchorLabelKo: '풋바 발뒤꿈치·전족부 고정 지지',
    activeMuscleSummaryKo: '대퇴사두근 · 심부 코어 중립 유지',
    trajectoryArc: { from: [46, 54], ctrl: [34, 40], to: [22, 54] },
    anchorPoint: [84, 55],
  },
  'reformer-bridge': {
    signatureId: 'reformer-bridge',
    titleKo: '리포머 펠빅 컬 브릿지 · 척추 분절 리프트',
    startImg: '/motion-studio3d/bridge-start.png',
    peakImg: '/motion-studio3d/bridge-peak.png',
    excursionLabelKo: '골반 후방경사 → 사선 브릿지 분절',
    anchorLabelKo: '견갑대 지지 & 캐리지 스토퍼 제어',
    activeMuscleSummaryKo: '대둔근 · 햄스트링 · 복횡근',
    trajectoryArc: { from: [53, 60], ctrl: [49, 36], to: [53, 35] },
    anchorPoint: [30, 58],
  },
  'reformer-shortspine': {
    signatureId: 'reformer-shortspine',
    titleKo: '리포머 숏 스파인 마사지 · 스트랩 롤오버 분절',
    startImg: '/motion-studio3d/shortspine-start.png',
    peakImg: '/motion-studio3d/shortspine-peak.png',
    excursionLabelKo: '45° 스트랩 리치 → 스토퍼 복귀 및 척추 롤오버',
    anchorLabelKo: '평평한 헤드레스트 & 양 견갑대 안정 지지',
    activeMuscleSummaryKo: '복횡근 스쿱 · 햄스트링 신장 · 척추 분절',
    trajectoryArc: { from: [44, 28], ctrl: [34, 16], to: [26, 22] },
    anchorPoint: [29, 63],
  },
  'reformer-longbox-teaser': {
    signatureId: 'reformer-longbox-teaser',
    titleKo: '리포머 롱박스 스트랩 티저 · V자 코어 밸런스',
    startImg: '/motion-studio3d/longbox-teaser-start.png',
    peakImg: '/motion-studio3d/longbox-teaser-peak.png',
    excursionLabelKo: '스트랩 당김과 동시 상·하체 V자 티저 리프트',
    anchorLabelKo: '롱박스 상단 좌골 뒤 천골 균형 지지',
    activeMuscleSummaryKo: '복직근 · 복횡근 · 광배근 하강 제어',
    trajectoryArc: { from: [26, 52], ctrl: [32, 30], to: [41, 24] },
    anchorPoint: [54, 54],
  },
  'reformer-elephant': {
    signatureId: 'reformer-elephant',
    titleKo: '리포머 일리펀트 & 업스트레치 · 파이크 캐리지 제어',
    startImg: '/motion-studio3d/reformer-elephant-start.png',
    peakImg: '/motion-studio3d/reformer-elephant-peak.png',
    excursionLabelKo: 'C커브 파이크 유지 채 고관절 신전으로 캐리지 후방 활주',
    anchorLabelKo: '풋바 양손 지지(어깨 고정) & 숄더블록 발뒤꿈치 밀착',
    activeMuscleSummaryKo: '복횡근 스쿱 · 햄스트링 · 대둔근 · 전거근',
    trajectoryArc: { from: [46, 68], ctrl: [36, 58], to: [26, 68] },
    anchorPoint: [76, 54],
  },
  'reformer-mermaid': {
    signatureId: 'reformer-mermaid',
    titleKo: '리포머 머메이드 측굴 · Z-Sit 늑간·측면 사슬 신장',
    startImg: '/motion-studio3d/reformer-mermaid-start.png',
    peakImg: '/motion-studio3d/reformer-mermaid-peak.png',
    excursionLabelKo: '풋바 수평 프레스와 동시 반대편 골반 앵커링 C커브 측굴',
    anchorLabelKo: '캐리지 양 좌골 수평 유지 & 지지 손 견갑 하강',
    activeMuscleSummaryKo: '요방형근 · 외복사근 · 늑간근 · 광배근 신장',
    trajectoryArc: { from: [42, 30], ctrl: [56, 20], to: [69, 34] },
    anchorPoint: [44, 64],
  },
  'reformer-scooter-lunge': {
    signatureId: 'reformer-scooter-lunge',
    titleKo: '리포머 스탠딩 스쿠터 & 이브스 런지 · 단측 둔근 제어',
    startImg: '/motion-studio3d/reformer-lunge-start.png',
    peakImg: '/motion-studio3d/reformer-lunge-peak.png',
    excursionLabelKo: '앞다리 무릎 정렬 고정 채 뒷다리 캐리지 후방 프레스',
    anchorLabelKo: '바닥 지지발 삼각대 밀착 & 풋바 가벼운 손끝 안정',
    activeMuscleSummaryKo: '대둔근 · 중둔근 · 대퇴사두근 · 장요근 신장',
    trajectoryArc: { from: [50, 62], ctrl: [39, 56], to: [28, 62] },
    anchorPoint: [66, 86],
  },
  'mat-hundred': {
    signatureId: 'mat-hundred',
    titleKo: '스튜디오 매트 코어 컬업 · 흉추 굴곡 & 호흡',
    startImg: '/motion-studio3d/mat-hundred-start.png',
    peakImg: '/motion-studio3d/mat-hundred-peak.png',
    excursionLabelKo: '흉추 컬업 & 하지 45° 뻗기',
    anchorLabelKo: '천골·하부 흉곽 매트 안정 지지',
    activeMuscleSummaryKo: '복횡근 · 복직근 · 고관절 굴곡 제어',
    trajectoryArc: { from: [33, 72], ctrl: [36, 50], to: [43, 45] },
    anchorPoint: [48, 77],
  },
  'mat-twist': {
    signatureId: 'mat-twist',
    titleKo: '스튜디오 매트 쏘우 & 스파인 트위스트 · 축성 회전',
    startImg: '/motion-studio3d/mat-twist-start.png',
    peakImg: '/motion-studio3d/mat-twist-peak.png',
    excursionLabelKo: '수직 축 흉추 회전 → 대각선 전굴 스쿱 리치',
    anchorLabelKo: '양 좌골 매트 대칭 고정 (반대쪽 엉덩이 들림 방지)',
    activeMuscleSummaryKo: '외복사근 · 내복사근 · 흉추 회전근 · 햄스트링',
    trajectoryArc: { from: [42, 34], ctrl: [54, 32], to: [66, 48] },
    anchorPoint: [42, 74],
  },
  'mat-sidekick-plank': {
    signatureId: 'mat-sidekick-plank',
    titleKo: '스튜디오 매트 사이드 킥 & 사이드 플랭크 · 측면 코어',
    startImg: '/motion-studio3d/mat-sidekick-start.png',
    peakImg: '/motion-studio3d/mat-sidekick-peak.png',
    excursionLabelKo: '측면 전완 지지 → 골반 수직 리프트 및 위쪽 다리 외전',
    anchorLabelKo: '지지 전완·어깨 수직 정렬 & 아래쪽 옆구리 아치 유지',
    activeMuscleSummaryKo: '중둔근 · 소둔근 · 외복사근 · 전거근 측면 사슬',
    trajectoryArc: { from: [54, 72], ctrl: [58, 50], to: [66, 36] },
    anchorPoint: [34, 78],
  },
  'chair-pedal-press': {
    signatureId: 'chair-pedal-press',
    titleKo: '운다 체어 시티드 페달 프레스 · 수직 정렬',
    startImg: '/motion-studio3d/chair-start.png',
    peakImg: '/motion-studio3d/chair-peak.png',
    excursionLabelKo: '페달 하강 프레스 & 원심성 복귀',
    anchorLabelKo: '양 좌골 시트 수직 고정 & 축성 신장',
    activeMuscleSummaryKo: '대퇴사두근 · 복횡근 · 척추기립근',
    trajectoryArc: { from: [66, 60], ctrl: [72, 74], to: [69, 87] },
    anchorPoint: [42, 53],
  },
  'chair-goingup': {
    signatureId: 'chair-goingup',
    titleKo: '운다 체어 고잉 업 프론트 · 원레그 수직 스텝업',
    startImg: '/motion-studio3d/chair-goingup-start.png',
    peakImg: '/motion-studio3d/chair-goingup-peak.png',
    excursionLabelKo: '런지 준비 → 시트 지지 다리 수직 상승 & 페달 제어',
    anchorLabelKo: '체어 시트 앞다리 발바닥 전체 & 핸들 보조 지지',
    activeMuscleSummaryKo: '대둔근 · 중둔근(골반 수평) · 대퇴사두근',
    trajectoryArc: { from: [54, 42], ctrl: [50, 26], to: [48, 14] },
    anchorPoint: [46, 69],
  },
  'chair-pike': {
    signatureId: 'chair-pike',
    titleKo: '운다 체어 풀업 파이크 · 심부 코어 인버티드 리프트',
    startImg: '/motion-studio3d/chair-pike-start.png',
    peakImg: '/motion-studio3d/chair-pike-peak.png',
    excursionLabelKo: '낮은 페달 지지 → 복부 스쿱으로 골반 수직 파이크 상승',
    anchorLabelKo: '체어 상단 시트 손바닥 수직 푸쉬 & 견갑 전인 안정',
    activeMuscleSummaryKo: '복횡근 · 복직근 하부 · 전거근 · 내전근',
    trajectoryArc: { from: [60, 74], ctrl: [56, 44], to: [51, 24] },
    anchorPoint: [38, 56],
  },
  'cadillac-cat-rolldown': {
    signatureId: 'cadillac-cat-rolldown',
    titleKo: '캐딜락 롤다운 바 캣 · C커브 척추 분절',
    startImg: '/motion-studio3d/cadillac-cat-start.png',
    peakImg: '/motion-studio3d/cadillac-cat-peak.png',
    excursionLabelKo: '롤다운 바 전하방 프레스 & 분절 굴곡',
    anchorLabelKo: '양 무릎 수직 지지 & 견갑 하강',
    activeMuscleSummaryKo: '복부 심부 코어 · 광배근 · 흉추 가동',
    trajectoryArc: { from: [62, 33], ctrl: [68, 46], to: [68, 58] },
    anchorPoint: [42, 81],
  },
  'cadillac-teaser': {
    signatureId: 'cadillac-teaser',
    titleKo: '캐딜락 푸쉬스루 바 티저 · 상단 스프링 V자 리프트',
    startImg: '/motion-studio3d/cadillac-teaser-start.png',
    peakImg: '/motion-studio3d/cadillac-teaser-peak.png',
    excursionLabelKo: '푸쉬스루 바 상방 리치 & 상·하체 V자 티저 상승',
    anchorLabelKo: '캐딜락 베드 천골 지지 & 견갑 하강 고정',
    activeMuscleSummaryKo: '복직근 · 복횡근 · 전거근 · 고관절 굴곡 협응',
    trajectoryArc: { from: [31, 62], ctrl: [36, 40], to: [43, 28] },
    anchorPoint: [49, 68],
  },
  'cadillac-hanging': {
    signatureId: 'cadillac-hanging',
    titleKo: '캐딜락 캐노피 행잉 풀업 · 서스펜션 코어 리프트',
    startImg: '/motion-studio3d/cadillac-hanging-start.png',
    peakImg: '/motion-studio3d/cadillac-hanging-peak.png',
    excursionLabelKo: '캐노피 행잉 사선 지지 → 견갑 하강 풀업 & 골반 수평 부양',
    anchorLabelKo: '상단 캐노피 바·퍼지 스트랩 양손 그립 고정',
    activeMuscleSummaryKo: '광배근 · 하부 승모근 · 복횡근 · 둔근 후면 사슬',
    trajectoryArc: { from: [40, 56], ctrl: [38, 38], to: [36, 28] },
    anchorPoint: [58, 16],
  },
  'cadillac-leg-springs': {
    signatureId: 'cadillac-leg-springs',
    titleKo: '캐딜락 레그 스프링 프로그 & 서클 · 독립 양측 고관절 제어',
    startImg: '/motion-studio3d/cadillac-legspring-start.png',
    peakImg: '/motion-studio3d/cadillac-legspring-peak.png',
    excursionLabelKo: '독립 양측 레그 스프링 대칭 45° 프레스 & 서클 제어',
    anchorLabelKo: '수직 폴 양손 파지로 윗등 고정 & 천골 수평 밀착',
    activeMuscleSummaryKo: '고관절 내전근 · 복횡근 · 대둔근 · 햄스트링',
    trajectoryArc: { from: [54, 28], ctrl: [62, 34], to: [70, 44] },
    anchorPoint: [24, 58],
  },
  'barrel-sidebend': {
    signatureId: 'barrel-sidebend',
    titleKo: '래더 바렐 사이드 벤드 · 측면 사슬 신장',
    startImg: '/motion-studio3d/barrel-sidebend-start.png',
    peakImg: '/motion-studio3d/barrel-sidebend-peak.png',
    excursionLabelKo: '측면 드레이프 → 사선 축성 리프트',
    anchorLabelKo: '래더 렁 발목 고정 & 골반 측면 지지',
    activeMuscleSummaryKo: '외복사근 · 내복사근 · 중둔근',
    trajectoryArc: { from: [28, 52], ctrl: [30, 32], to: [35, 18] },
    anchorPoint: [74, 66],
  },
  'barrel-swan': {
    signatureId: 'barrel-swan',
    titleKo: '래더 바렐 풀 스완 · 후면 사슬 아크 신전',
    startImg: '/motion-studio3d/barrel-swan-start.png',
    peakImg: '/motion-studio3d/barrel-swan-peak.png',
    excursionLabelKo: '전방 드레이프 준비 → 사선 상승 흉추 신전 아치',
    anchorLabelKo: '바렐 정점 치골·골반 지지 & 사다리 발바닥 고정',
    activeMuscleSummaryKo: '척추기립근 · 대둔근 · 햄스트링 · 전면 복부 지지',
    trajectoryArc: { from: [25, 56], ctrl: [26, 34], to: [31, 18] },
    anchorPoint: [72, 66],
  },
  'barrel-horseback': {
    signatureId: 'barrel-horseback',
    titleKo: '래더 바렐 호스백 · 내전근 밀착 & C커브 부양',
    startImg: '/motion-studio3d/barrel-horseback-start.png',
    peakImg: '/motion-studio3d/barrel-horseback-peak.png',
    excursionLabelKo: '바렐 정점 기승 자세 → 허벅지 안쪽 조임과 C커브 골반 호버',
    anchorLabelKo: '바렐 양 측면 허벅지 내전근 밀착 고정',
    activeMuscleSummaryKo: '고관절 내전근군 · 복횡근 · 골반저근 · 견갑 안정근',
    trajectoryArc: { from: [41, 48], ctrl: [39, 36], to: [41, 28] },
    anchorPoint: [42, 62],
  },
};

export const ALL_STUDIO_3D_ASSET_URLS: readonly string[] = Object.values(
  STUDIO_3D_SIGNATURES,
).flatMap((spec) => [spec.startImg, spec.peakImg]);

export function resolveStudio3DMotionForExercise(
  exercise: Pick<
    PilatesExercise,
    'id' | 'nameKo' | 'nameEn' | 'apparatus' | 'blockCategory' | 'bodyPosition' | 'box'
  >,
): Studio3DMotionSpec {
  const hay = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`.toLowerCase();

  if (exercise.apparatus === 'reformer') {
    const isElephantOrPlankPike =
      exercise.blockCategory === 'plank' ||
      /elephant|up[\s-]*stretch|down[\s-]*stretch|arabesque|long[\s-]*stretch|front[\s-]*support|control[\s-]*front|tendon[\s-]*stretch|일리펀트|업\s*스트레치|다운\s*스트레치|아라베스크|롱\s*스트레치|플랭크|텐던\s*스트레치/.test(
        hay,
      );
    if (isElephantOrPlankPike) {
      const exact = /elephant|up[\s-]*stretch|arabesque|tendon[\s-]*stretch|일리펀트|업\s*스트레치|아라베스크|텐던\s*스트레치/.test(
        hay,
      );
      return {
        ...STUDIO_3D_SIGNATURES['reformer-elephant'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 리포머 일리펀트·업스트레치'
          : '리포머 플랭크·파이크 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isShortSpineOrStraps =
      exercise.blockCategory === 'feet-in-straps' ||
      /short[\s-]*spine|long[\s-]*spine|frog|circle|숏\s*스파인|롱\s*스파인|핏\s*인\s*스트랩|프로그|레그\s*서클/.test(
        hay,
      );
    if (isShortSpineOrStraps) {
      const exact = /short[\s-]*spine|숏\s*스파인|rollover/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['reformer-shortspine'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 숏 스파인 롤오버'
          : '리포머 스트랩 계열 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isBoxOrTeaser =
      exercise.box === 'long-box' ||
      exercise.box === 'short-box' ||
      /long[\s-]*box|short[\s-]*box|teaser|backstroke|breaststroke|horseback|stomach[\s-]*massage|롱박스|숏박스|티저|백스트로크|브레스트|홀스백|스터먹/.test(
        hay,
      );
    if (isBoxOrTeaser) {
      const exact = /teaser|backstroke|티저|백스트로크/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['reformer-longbox-teaser'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 롱박스 티저'
          : '리포머 박스·스트랩 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isMermaidOrLateral =
      /mermaid|z[\s-]*sit|side[\s-]*bend|cleopatra|머메이드|측굴/.test(hay) ||
      (exercise.blockCategory === 'cooldown' && exercise.bodyPosition === 'seated');
    if (isMermaidOrLateral) {
      const exact = /mermaid|side[\s-]*bend|머메이드|측굴/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['reformer-mermaid'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 리포머 머메이드 측굴'
          : '리포머 시티드 측굴 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isScooterOrStandingLunge =
      exercise.bodyPosition === 'standing' ||
      /scooter|lunge|side[\s-]*split|skater|russian[\s-]*split|스쿠터|런지|사이드\s*스플릿|스케이터/.test(
        hay,
      );
    if (isScooterOrStandingLunge) {
      const exact = /scooter|lunge|스쿠터|런지/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['reformer-scooter-lunge'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 리포머 스쿠터·런지'
          : '리포머 스탠딩 하체 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isBridge =
      exercise.blockCategory === 'bridging' ||
      /bridge|bridging|pelvic\s*curl|semi[\s-]*circle|브릿지|골반\s*컬|아티큘레이|세미서클/.test(hay);
    if (isBridge) {
      return {
        ...STUDIO_3D_SIGNATURES['reformer-bridge'],
        matchScope: 'exact-signature',
        matchScopeBadgeKo: '3D 동작 궤적 일치 · 브릿징',
      };
    }

    const isFootwork =
      exercise.blockCategory === 'footwork' || /footwork|풋워크|프레스|press|tendon|heel/.test(hay);
    return {
      ...STUDIO_3D_SIGNATURES['reformer-footwork'],
      matchScope: isFootwork ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: isFootwork
        ? '3D 동작 궤적 일치 · 리포머 활주'
        : '리포머 기구 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  if (exercise.apparatus === 'chair') {
    const isChairPikeOrPullUp =
      /pike|pull[\s-]*up|tendon[\s-]*stretch|teaser[\s-]*floor|파이크|풀업|텐던\s*스트레치/.test(hay);
    if (isChairPikeOrPullUp) {
      return {
        ...STUDIO_3D_SIGNATURES['chair-pike'],
        matchScope: 'exact-signature',
        matchScopeBadgeKo: '3D 동작 궤적 일치 · 체어 풀업 파이크',
      };
    }

    const isGoingUpOrStanding =
      exercise.bodyPosition === 'standing' ||
      /going[\s-]*up|step[\s-]*up|mountain|standing|pump|lunge|고잉\s*업|스텝업|마운틴|스탠딩|펌프|런지/.test(
        hay,
      );
    if (isGoingUpOrStanding) {
      const exact = /going[\s-]*up|step[\s-]*up|mountain|고잉\s*업|스텝업|마운틴/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['chair-goingup'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 체어 고잉업 스텝업'
          : '체어 스탠딩 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isExact = /pedal|press|frog|페달|프레스|풋워크|프로그|seated|시티드/.test(hay);
    return {
      ...STUDIO_3D_SIGNATURES['chair-pedal-press'],
      matchScope: isExact ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: isExact
        ? '3D 동작 궤적 일치 · 체어 페달'
        : '체어 기구 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  if (exercise.apparatus === 'cadillac') {
    const isHangingOrTrapeze =
      /hanging|fuzzy|fuzzies|trapeze|pull[\s-]*up|spread[\s-]*eagle|inverted|행잉|퍼지|트래피즈|풀업|스프레드\s*이글|인버티드/.test(
        hay,
      );
    if (isHangingOrTrapeze) {
      return {
        ...STUDIO_3D_SIGNATURES['cadillac-hanging'],
        matchScope: 'exact-signature',
        matchScopeBadgeKo: '3D 동작 궤적 일치 · 캐딜락 캐노피 행잉',
      };
    }

    const isLegSprings =
      exercise.blockCategory === 'feet-in-straps' ||
      /leg[\s-]*spring|frog|airplane|walking|bicycle|레그\s*스프링|레그스프링|프로그|에어플레인|시저스/.test(
        hay,
      );
    if (isLegSprings && !/teaser|push[\s-]*through|티저|푸쉬스루/.test(hay)) {
      const exact = /leg[\s-]*spring|frog|레그\s*스프링|레그스프링|프로그/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['cadillac-leg-springs'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 캐딜락 레그 스프링'
          : '캐딜락 레그 스프링 계열 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isSupineTeaserOrTower =
      exercise.bodyPosition === 'supine' ||
      /teaser|monkey|tower|push[\s-]*through|dolphin|magician|티저|몽키|타워|푸쉬스루/.test(
        hay,
      );
    if (isSupineTeaserOrTower) {
      const exact = /teaser|push[\s-]*through|티저|푸쉬스루/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['cadillac-teaser'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 캐딜락 푸쉬스루 티저'
          : '캐딜락 수파인·바 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isExact = /cat|roll|캣|롤다운|분절/.test(hay);
    return {
      ...STUDIO_3D_SIGNATURES['cadillac-cat-rolldown'],
      matchScope: isExact ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: isExact
        ? '3D 동작 궤적 일치 · 캐딜락 롤다운 바'
        : '캐딜락 기구 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  if (exercise.apparatus === 'barrel') {
    const isHorseback = /horseback|straddle|round[\s-]*back|호스백|홀스백|라운드\s*백/.test(hay);
    if (isHorseback) {
      const exact = /horseback|호스백|홀스백/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['barrel-horseback'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 바렐 호스백 코어 호버'
          : '래더 바렐 라운드백·호스백 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isSwanOrExtension =
      exercise.bodyPosition === 'prone' ||
      exercise.blockCategory === 'extension' ||
      /swan|grasshopper|tree|extension|thoracic|arc|스완|그래스하퍼|트리|신전|아크/.test(hay);
    if (isSwanOrExtension) {
      const exact = /swan|grasshopper|스완|그래스하퍼/.test(hay);
      return {
        ...STUDIO_3D_SIGNATURES['barrel-swan'],
        matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
        matchScopeBadgeKo: exact
          ? '3D 동작 궤적 일치 · 바렐 풀 스완'
          : '래더 바렐 신전·트리 3D 참조 · 세부 자세는 큐 확인',
      };
    }

    const isExact = /side|mermaid|사이드|측굴|싯업|오버/.test(hay);
    return {
      ...STUDIO_3D_SIGNATURES['barrel-sidebend'],
      matchScope: isExact ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: isExact
        ? '3D 동작 궤적 일치 · 바렐 측굴'
        : '래더 바렐 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  const isMatSideKickOrSidePlank =
    exercise.bodyPosition === 'side-lying' ||
    /side[\s-]*kick|side[\s-]*plank|side[\s-]*bend|clam|star|kneeling[\s-]*side|사이드\s*킥|사이드\s*플랭크|사이드\s*밴드|클램/.test(
      hay,
    );
  if (isMatSideKickOrSidePlank) {
    const exact = /side[\s-]*kick|side[\s-]*plank|side[\s-]*bend|사이드\s*킥|사이드\s*플랭크|사이드\s*밴드/.test(
      hay,
    );
    return {
      ...STUDIO_3D_SIGNATURES['mat-sidekick-plank'],
      matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: exact
        ? '3D 동작 궤적 일치 · 매트 사이드킥·플랭크'
        : '스튜디오 매트 측면 사슬 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  const isSeatedTwistOrSaw =
    exercise.bodyPosition === 'seated' ||
    /saw|twist|spine\s*stretch|rolling|rocker|seal|mermaid|쏘우|트위스트|회전|스파인\s*스트레치|롤링|라커|씰|머메이드/.test(
      hay,
    );
  if (isSeatedTwistOrSaw) {
    const exact = /saw|twist|spine\s*stretch|쏘우|트위스트|회전/.test(hay);
    return {
      ...STUDIO_3D_SIGNATURES['mat-twist'],
      matchScope: exact ? 'exact-signature' : 'apparatus-family-reference',
      matchScopeBadgeKo: exact
        ? '3D 동작 궤적 일치 · 매트 쏘우·트위스트'
        : '스튜디오 매트 시티드 3D 참조 · 세부 자세는 큐 확인',
    };
  }

  const isExactMat = /hundred|curl|roll|teaser|헌드레드|컬업|복부|코어|호흡/.test(hay);
  return {
    ...STUDIO_3D_SIGNATURES['mat-hundred'],
    matchScope: isExactMat ? 'exact-signature' : 'apparatus-family-reference',
    matchScopeBadgeKo: isExactMat
      ? '3D 동작 궤적 일치 · 매트 코어'
      : '스튜디오 매트 3D 참조 · 세부 자세는 큐 확인',
  };
}

export function getApparatusPrimary3DThumb(apparatus: ApparatusType | 'mixed'): string {
  switch (apparatus) {
    case 'cadillac':
      return '/motion-studio3d/cadillac-teaser-peak.png';
    case 'chair':
      return '/motion-studio3d/chair-goingup-peak.png';
    case 'barrel':
      return '/motion-studio3d/barrel-swan-peak.png';
    case 'mat':
      return '/motion-studio3d/mat-hundred-peak.png';
    case 'reformer':
    case 'mixed':
    default:
      return '/motion-studio3d/footwork-peak.png';
  }
}
