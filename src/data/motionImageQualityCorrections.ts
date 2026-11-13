import type { MovementDiagramCorrection } from './movementDiagramCorrections';

const footworkCorrection: MovementDiagramCorrection = {
  archetypeId: 'reformer-supine-footwork',
  checkedAt: '2026-11-13',
  reviewedScopeKo: '제작자의 풋워크 설명에서 발의 풋바 지지, 무릎 굽힘·폄, 캐리지의 왕복과 제어 복귀를 대조했어요.',
  correctionKo: '발 접점을 고정 풋바에 맞추고 몸통·헤드레스트·캐리지가 같은 방향과 거리로 움직이도록 수정했어요. 서로 반대로 움직이던 쿠션과 몸통을 일치시켰어요.',
  limitationKo: '뒤꿈치를 지지한 기본 왕복을 설명하는 자체 제작 측면 그림이에요. 와이드·V·아치·카프레이즈 전체 변형이나 개인별 자세·각도를 검증한 그림은 아니에요.',
  professionalReviewCount: 0,
  sourceFrameMappings: 0,
  sources: [{
    title: 'Online Pilates Classes · Footwork on the Reformer · Lesley Logan',
    url: 'https://onlinepilatesclasses.com/pilates-exercises/reformer-exercises/reformer-footwork/',
  }],
};

function catalogContactCorrection(
  archetypeId: string,
  correctionKo: string,
  limitationKo: string,
  legacy = false,
): MovementDiagramCorrection {
  return {
    archetypeId,
    checkedAt: '2026-11-13',
    reviewedScopeKo: '기존 카탈로그의 자세·기구·큐와 앱 SVG의 고정 지지면 좌표를 대조하고 실제 정지·중간 경로의 의미 연결을 수정했어요. 원본 영상 재생이나 전문가 자세 검수는 수행하지 않았어요.',
    correctionKo,
    limitationKo: `자체 제작 2D 대표 그림이에요. ${limitationKo} 실제 영상 프레임·해부학적 각도·개인별 적합성을 검증한 자료는 아니에요.`,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: [{
      title: 'Pilates Flow 고정 main 카탈로그 · 자세·지지 큐 대조',
      url: `https://github.com/blue45f/pilate_flow/blob/f3641ef9293e51cb2358dfd387a04fb13a0a5cc6/src/data/${legacy ? 'pilatesCatalog' : 'originalMovements'}.ts`,
    }],
  };
}

const kneelingContactCorrection = catalogContactCorrection(
  'reformer-kneeling-supported-arm-press',
  '무릎·정강이가 캐리지 아래로 내려가던 좌표를 캐리지 상면의 지지로 옮기고, 몸통을 유지하는 팔 프레스 대표 사이클로 분리했어요.',
  '로잉·스파인 트위스트 또는 연결된 전신 수업 전체를 표시하지 않아요.',
  true,
);

/** A source-text comparison and correction record, never professional approval. */
export const MOTION_IMAGE_QUALITY_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> = {
  'original-mat-chest-lift': {
    archetypeId: 'mat-chest-lift-supported-head',
    checkedAt: '2026-11-13',
    reviewedScopeKo: 'Physitrack의 체스트 리프트 설명에서 굽힌 무릎·바닥 발 지지·머리 뒤 손 지지와 상체의 작은 들기·복귀 관계를 대조했어요.',
    correctionKo: '앉은 자세까지 올라가던 롤업 연결을 제거하고, 골반과 하체를 유지하며 손으로 머리를 받치는 별도 체스트 리프트로 분리했어요.',
    limitationKo: '출처의 동작 관계를 참고한 자체 제작 그림이에요. 실제 영상 프레임의 각도·근육 활성 또는 개인에게 적합한 범위를 검증한 것은 아니에요.',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: [{
      title: 'Physitrack · Pilates chest lift',
      url: 'https://us.physitrack.com/home-exercise-video/pilates-chest-lift',
    }],
  },
  'ex-core-02': {
    archetypeId: 'reformer-short-box-supported-roll-back',
    checkedAt: '2026-11-13',
    reviewedScopeKo: '기존 카탈로그의 리포머·앉은 자세·숏박스 메타데이터와 연결된 도해의 누운 싱글 레그 스트레치 분류를 대조했어요.',
    correctionKo: '누운 다리 스트레치의 외부 트랙 연결을 제거하고, 골반이 숏박스 상면에 지지되고 발은 고정 스트랩 아래 유지되는 작은 라운드백·복귀 대표 자세로 분리했어요.',
    limitationKo: '잘못된 자세 연결을 분리한 자체 제작 대표 그림이에요. 숏박스의 모든 라운드백·플랫백·회전 변형이나 연결 영상의 프레임을 검증한 것은 아니에요.',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: [{
      title: '카탈로그 연결 영상 · 한님쌤 필라테스 · 리포머 숏박스 시리즈 (연결 관계만 대조)',
      url: 'https://www.youtube.com/watch?v=iUv1gxF5JcA',
    }],
  },
  'original-reformer-parallel-footwork': footworkCorrection,
  'ex-footwork-01': footworkCorrection,
  'ex-footwork-02': footworkCorrection,
  'ex-kr-reformer-01': footworkCorrection,
  'ex-cooldown-02': catalogContactCorrection(
    'standing-roll-down-centering',
    '앉은 롤백 트랙의 연결을 제거하고 양발을 바닥에 둔 서서 롤다운·선 자세 복귀로 분리했어요.',
    '척추 분절의 실제 각도나 깊은 전굴 범위를 검증하지 않았어요.',
    true,
  ),
  'original-mat-forearm-plank': catalogContactCorrection(
    'mat-kneeling-forearm-support',
    '손바닥·발끝 지지의 푸시업 연결을 제거하고 양 전완과 무릎이 매트에 남는 지지 자세로 바꿨어요.',
    '정적인 지지와 작은 호흡 변화를 표시하며 전신 손 플랭크·푸시업은 포함하지 않아요.',
  ),
  'original-chair-incline-support': catalogContactCorrection(
    'chair-fixed-seat-incline-support',
    '움직이는 페달을 밟고 파이크로 올라가던 연결을 분리했어요. 손은 고정 좌면, 발은 바닥에 두고 페달은 움직이지 않아요.',
    '실제 체어의 고정과 제조사별 허용 지지면을 확인한 자료는 아니에요.',
  ),
  'original-barrel-supported-arm-reach': catalogContactCorrection(
    'barrel-one-hand-supported-arm-reach',
    '양손과 뒤꿈치가 함께 들리는 공통 모델 대신 한 손은 래더에 고정하고 반대 팔만 뻗는 모델로 분리했어요.',
    '팔 경로의 모든 변형이나 바렐 제품별 치수를 표시하지 않아요.',
  ),
  'original-reformer-side-lying-press': catalogContactCorrection(
    'reformer-side-lying-footbar-press',
    '발이 공중으로 벌어지던 외전 그림을 제거했어요. 풋바 접촉 발을 고정하고 머리·골반·아래 다리가 캐리지와 함께 이동하도록 분리했어요.',
    '기본 발 접촉의 작은 프레스 대표이며 개인별 다리 정렬·발 위치 변형을 검증하지 않았어요.',
  ),
  'ex-upper-01': kneelingContactCorrection,
  'ex-kr-reformer-03': kneelingContactCorrection,
  'ex-global-reformer-03': kneelingContactCorrection,
  'ex-lower-03': catalogContactCorrection(
    'chair-seat-pedal-step-up',
    '앞발을 고정 시트 위로 옮기고 반대 발볼이 실제 회전 페달 끝을 따르는 작은 스텝업으로 분리했어요.',
    '완전히 올라서기·빠른 마운틴 클라이머·탑승과 하차는 포함하지 않아요.',
    true,
  ),
  'ex-warmup-03': catalogContactCorrection(
    'mat-longitudinal-roller-arm-arc',
    '평평한 매트의 호흡 모델 대신 뒤통수부터 골반까지 길이방향 롤러 위에 지지하고 양발은 매트에 두는 팔 아크 대표로 분리했어요.',
    '흉추 릴리즈 전체와 팔 원운동의 모든 평면을 표시하지 않아요.',
    true,
  ),
  'original-mat-swimming-prep': {
    archetypeId: 'mat-swimming-contralateral-prep',
    checkedAt: '2026-11-13',
    reviewedScopeKo: '제작자의 스위밍 설명에서 엎드린 준비, 앞으로 긴 팔, 반대 팔·다리의 교차 리치와 몸통 유지 원칙을 대조했어요.',
    correctionKo: '스완 패턴 식별자를 분리하고, 같은 쪽 팔·다리가 함께 들리던 표현을 가까운 팔·먼 다리가 움직이는 대각선 준비 동작으로 수정했어요.',
    limitationKo: '천천히 한 대각선을 뻗고 복귀하는 준비 변형의 자체 제작 그림이에요. 빠른 교대 스위밍의 원본 프레임, 정확한 각도 또는 개인 적합성을 검증한 것은 아니에요.',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: [{
      title: 'Online Pilates Classes · Swimming on the Mat · Lesley Logan',
      url: 'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-swimming/',
    }],
  },
};
