export const ALREADY_RESOLVED_EXCLUSIONS = Object.freeze([
  {
    fixId: 'R-01',
    commitSha: 'main (pre-round3)',
    exerciseIds: ['original-mat-clam', 'original-mat-open-book'],
    summaryKo:
      '매트 사이드 클램(mat-clam-isolated)과 오픈 북(mat-open-book-isolated)의 하체/상체 가동 관절 교차 누수 분리 완료 — 이번 감사에서 중복 결함 보고 제외',
  },
  {
    fixId: 'D-01',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['original-reformer-strap-frog'],
    summaryKo:
      '리포머 스트랩 프로그(reformer-strap-frog-isolated) 끝 자세(end) 프로그 굴곡 홈 포지션(ankle: 217,74, knee: 185,90) 복귀 수정 완료 — 중복 결함 보고 제외',
  },
  {
    fixId: 'D-02A',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['ex-plank-01'],
    summaryKo:
      '리포머 롱 스트레치 플랭크(reformer-plank-long-stretch-isolated) 우측 풋바 상단 손목(262,126)·좌측 캐리지 발목(80,138) 접점 분리 완료 — 중복 결함 보고 제외',
  },
  {
    fixId: 'D-02B',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['original-chair-incline-support', 'ex-plank-02', 'ex-kr-chair-01'],
    summaryKo:
      '체어 플랭크/파이크(chair-plank-pike-isolated) 시트 상단 손목(132,106) 및 페달 발목(216,156→208,134) 접점 정합 완료 — 기구 접점 결함 중복 보고 제외',
  },
  {
    fixId: 'D-03',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['original-cadillac-arm-spring-press', 'ex-bridging-02'],
    summaryKo:
      '캐딜락 고정 테이블(Cadillac Table) 비이동 베드 구조 반영(carriageOffsetPx: 0) 완료 — 중복 결함 보고 제외',
  },
  {
    fixId: 'D-04',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['original-chair-seated-pedal-press', 'original-chair-alternating-pedal', 'ex-footwork-03'],
    summaryKo:
      '체어 페달 회전 방향 부호 정합(28° 상단 → 36° 하단 프레스 / 8° 파이크 상단 부양) 완료 — 중복 결함 보고 제외',
  },
  {
    fixId: 'D-05',
    commitSha: '55ce22d / b2d6022',
    exerciseIds: ['original-barrel-standing-hip-extension', 'original-barrel-standing-side-reach'],
    summaryKo:
      '래더 배럴 스탠딩(barrel-standing-hip-extension-isolated) 배럴 돔 관통 제거(farAnkle x:138) 및 사다리 가로대 손 파지(hand: 88,76) 정합 완료 — 기구 관통 중복 보고 제외',
  },
]);

/**
 * Explicit semantic classification of all 98 exercises across the 24 coordinate-trajectory groups.
 * Distinguishes intentional/structurally compatible reuse from residual semantic mismatches (`SM-01`..`SM-08`).
 */
export const RESIDUAL_SEMANTIC_MISMATCH_PART1 = [
  {
    mismatchId: 'SM-01',
    rank: 1,
    severity: 'high',
    archetypeId: 'seated-row-arm-arc',
    archetypeTitleKo: '시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이',
    groupSize: 8,
    intentionalMemberIds: [
      'original-reformer-seated-row',
      'ex-upper-02',
      'original-mat-band-row',
      'original-chair-seated-arm-arc',
      'original-mat-seated-arm-reach',
    ],
    mismatchedMemberIds: [
      'original-chair-seated-pelvic-rock',
      'original-chair-seated-breath',
      'original-chair-seated-back-reach',
    ],
    dominantSharedTrajectory: {
      hand: 'start(206,86) → middle(128,106) → end(216,52) [maxDelta = 80.5px]',
      elbow: 'start(162,92) → middle(102,96) → end(168,66) [maxDelta = 60.1px]',
      thoracic: 'start(130,96) → middle(128,92) → end(130,94) [maxDelta = 4.5px]',
      pelvis: 'start(132,138) → middle(132,138) → end(132,138) [Δ = 0.0px 고정]',
    },
    mismatchReasonKo:
      '시티드 로잉/써브 어 트레이 상지 당김·오버헤드 뻗기(hand Δ80.5px, pelvis Δ0px) 궤적을 (1) 허벅지 위에 손을 얹고 골반만 앞뒤로 굴리는 「체어 시티드 골반 록」, (2) 갈비뼈/허벅지에 손을 얹고 어깨 긴장을 푸는 「체어 시티드 호흡」, (3) 흉추 상부 신전이 목적인 「체어 시티드 가슴 리치」가 그대로 공유하여 골반 가동과 호흡 안정 대신 강한 로잉·오버헤드 프레스로 오해됩니다. 또한 체어 시트 상단(y:106)보다 좌골(pelvis.y:138)이 32px 낮아 매트 바닥 착석 높이에 머뭅니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-chair-seated-pelvic-rock',
        nameKo: '체어 시티드 골반 록',
        apparatus: 'chair',
        bodyPosition: 'seated',
        spinalPlanes: ['flexion', 'extension'],
        catalogCueQuoteKo: '양손은 허벅지나 시트 옆에 가볍게 둡니다. / 날숨에 골반을 살짝 뒤로 굴렸다가 들숨에 세웁니다.',
        observedJointAnomalyKo:
          '골반(pelvis: 132,138→132,138, Δ0.0px)과 요추(lumbar Δ2.0px)가 사실상 멈춰 있고, 손(hand: 206,86→128,106→216,52, Δ80.5px)이 로잉 당김 후 머리 위로 뻗습니다.',
        proposedMinimalFixKo:
          '손을 허벅지 위(hand: 156,104)에 고정하고 चे어 시트 상단(pelvis: 132,106) 위에서 요추·골반 전후방 틸트(lumbar.x: 130→118→132, thoracic.x: 130→122→132)만 수행하도록 분리.',
      },
      {
        exerciseId: 'original-chair-seated-breath',
        nameKo: '체어 시티드 호흡',
        apparatus: 'chair',
        bodyPosition: 'seated',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '양손은 허벅지나 갈비뼈 옆에 가볍게 둡니다. / 어깨를 올리지 않고 갈비뼈가 옆으로 넓어지는 숨을 느낍니다.',
        observedJointAnomalyKo:
          '어깨·팔을 고정한 호흡 동작임에도 손(hand Δ80.5px)과 팔꿈치(elbow Δ60.1px)가 시티드 로잉 및 오버헤드 리치를 수행합니다.',
        proposedMinimalFixKo:
          '체어 시트 상단(pelvis: 132,106) 착석 상태에서 손을 늑골/허벅지(hand: 144,96)에 고정하고 흉곽 호흡 확장(thoracic Δ4px)만 표현하도록 분리.',
      },
      {
        exerciseId: 'original-chair-seated-back-reach',
        nameKo: '체어 시티드 가슴 리치',
        apparatus: 'chair',
        bodyPosition: 'seated',
        spinalPlanes: ['extension'],
        catalogCueQuoteKo: '체어 시트 위에 앉아 양발을 바닥에 둡니다. / 들숨에 흉골을 앞·위로 들어 올려 등 상부를 가볍게 펴줍니다.',
        observedJointAnomalyKo:
          '흉추 신전(thoracic Δ4.5px) 대신 상지 후방 로잉 당김(hand: 206,86→128,106)과 전상방 트레이 리치(216,52)가 주 움직임으로 표시됩니다.',
        proposedMinimalFixKo:
          '체어 시트 상단(pelvis: 132,106) 위에서 요추는 중립으로 유지하고 흉추·경추·머리 상부 신전 아크(thoracic: 130,80→138,74, head: 132,26→144,22)를 명확히 분리.',
      },
    ],
  },
  {
    mismatchId: 'SM-02',
    rank: 2,
    severity: 'high',
    archetypeId: 'standing-ankle-calf-upper-reach',
    archetypeTitleKo: '스탠딩 카프 레이즈(발목) & 체스트/암 스트랩 프레스',
    groupSize: 7,
    intentionalMemberIds: [
      'original-mat-ankle-reach',
      'original-barrel-supported-arm-reach',
    ],
    mismatchedMemberIds: [
      'original-barrel-supported-ankle',
      'original-chair-supported-calf-raise',
      'original-barrel-standing-rotation',
      'original-barrel-standing-breath',
      'ex-upper-03',
    ],
    dominantSharedTrajectory: {
      hand: 'start(194,80) → middle(236,52) → end(188,84) [maxDelta = 50.5px 전상방 허공 리치]',
      heel: 'start(142,174) → middle(146,160) → end(142,174) [maxDelta = 14.6px 까치발 상승]',
      pelvis: 'start(146,116) → middle(148,104) → end(146,116) [maxDelta = 12.2px 수직 상승]',
    },
    mismatchReasonKo:
      '까치발 상승(heel.y: 174→160)과 우측 허공 전상방 팔 뻗기(hand: 194,80→236,52, Δ50.5px)가 결합된 단일 궤적을 7개 동작이 공유합니다. 그 결과 (1) 사다리/체어를 잡고 발목만 움직여야 하는 지지 카프 레이즈에서 손이 기구를 놓고 허공으로 50.5px 뻗어 올리고, (2) 양발을 바닥에 고정해야 하는 스탠딩 흉추 회전·스탠딩 호흡·캐딜락 스탠딩 펀치/트라이셉스 프레스가 매 회 까치발(heel Δ14.6px)로 솟구칩니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-barrel-supported-ankle',
        nameKo: '래더 지지 발목 움직임',
        apparatus: 'barrel',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '바렐이나 사다리 프레임을 가볍게 잡고 양발을 평행하게 둡니다. / 상체를 세운 채 뒤꿈치를 천천히 들었다 내립니다.',
        observedJointAnomalyKo:
          '좌측 래더 바(x:76..96)를 잡아야 할 손이 우측 허공(hand: 194,80→236,52, Δ50.5px)으로 뻗어 올라가 지지 손 앵커가 소실됩니다.',
        proposedMinimalFixKo:
          '손을 래더 상단 가로대(hand: 88,76)에 고정(Δ0px)하고 뒤꿈치(heel.y: 174→160→174)와 신체 수직 상승만 일어나도록 분리.',
      },
      {
        exerciseId: 'original-chair-supported-calf-raise',
        nameKo: '체어 지지 카프 레이즈',
        apparatus: 'chair',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '체어 프레임이나 핸들을 가볍게 잡고 양발을 평행하게 둡니다.',
        observedJointAnomalyKo:
          '체어 시트/프레임 지지 없이 손이 우측 상방(194,80→236,52, Δ50.5px)으로 뻗어 올라갑니다.',
        proposedMinimalFixKo:
          '손을 체어 상단 지지점(hand: 132,96)에 고정하고 발목 저측굴곡(heel.y: 174→160→174)만 수행하도록 분리.',
      },
      {
        exerciseId: 'original-barrel-standing-rotation',
        nameKo: '래더 지지 몸통 회전',
        apparatus: 'barrel',
        bodyPosition: 'standing',
        spinalPlanes: ['rotation'],
        catalogCueQuoteKo: '양발을 골반 너비로 두고 바렐이나 사다리를 가볍게 잡습니다. / 골반은 정면을 유지한 채 흉곽만 부드럽게 회전합니다.',
        observedJointAnomalyKo:
          '양발 접지 회전 동작임에도 뒤꿈치가 14.6px 들려 까치발(heel.y: 174→160)을 서고 시상면 오버헤드 리치를 수행합니다.',
        proposedMinimalFixKo:
          '양발 뒤꿈치(heel: 142,174)와 골반(pelvis: 146,116)을 고정하고 한 손은 래더 지지, 반대 팔과 흉곽만 수평 회전 오픈하도록 분리.',
      },
      {
        exerciseId: 'original-barrel-standing-breath',
        nameKo: '바렐 앞 스탠딩 호흡',
        apparatus: 'barrel',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '양발에 체중을 고르게 싣고 어깨 힘을 뺍니다. / 어깨가 솟지 않게 목과 승모근 긴장을 풀어줍니다.',
        observedJointAnomalyKo:
          '발바닥 접지 호흡 동작임에도 까치발(heel Δ14.6px)로 솟구치며 팔을 머리 위(hand.y: 80→52)로 들어 올립니다.',
        proposedMinimalFixKo:
          '양발(heel: 142,174) 접지 상태에서 양손을 바렐/갈비뼈에 안정적으로 두고 흉곽 확장만 표시하도록 분리.',
      },
      {
        exerciseId: 'ex-upper-03',
        nameKo: '캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스',
        apparatus: 'cadillac',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral', 'rotation'],
        catalogCueQuoteKo: '양발을 골반 너비보다 넓게 벌려 뒤꿈치를 바닥에 뿌리내리고... 주먹을 정면 어깨 높이로 펀치하듯 뻗어냅니다.',
        observedJointAnomalyKo:
          '큐에서 「뒤꿈치를 바닥에 뿌리내리고」라고 명시했으나 도해는 뒤꿈치를 14.6px 들어 올리는 카프 레이즈(heel.y: 174→160)를 함께 수행합니다.',
        proposedMinimalFixKo:
          '뒤꿈치(heel: 142,174)와 골반(pelvis: 146,116)을 바닥에 완전 고정(Δ0px)하고 상지 전방 펀치/프레스(hand: 176,84→238,76)만 수행하도록 분리.',
      },
    ],
  },
  {
    mismatchId: 'SM-03',
    rank: 3,
    severity: 'high',
    archetypeId: 'supine-breath-pelvic-clock',
    archetypeTitleKo: '수파인 호흡 · 골반 시계 & 립케이지 암 아크',
    groupSize: 7,
    intentionalMemberIds: [
      'original-reformer-supine-breath',
      'ex-warmup-03',
      'ex-warmup-01',
    ],
    mismatchedMemberIds: [
      'original-mat-pelvic-clock',
      'original-cadillac-pelvic-rock',
      'original-mat-rib-breath',
      'original-cadillac-table-breath',
    ],
    dominantSharedTrajectory: {
      hand: 'start(152,132) → middle(92,108) → end(150,132) [maxDelta = 64.1px 오버헤드 암 아크]',
      elbow: 'start(122,130) → middle(84,116) → end(120,130) [maxDelta = 40.5px]',
      pelvis: 'start(174,128) → middle(174,128) → end(174,128) [Δ = 0.0px 고정]',
      lumbar: 'start(148,128) → middle(148,124) → end(148,128) [Δ = 4.0px]',
    },
    mismatchReasonKo:
      '골반(pelvis Δ0px)은 고정된 채 양팔만 머리 쪽으로 64.1px 크게 원을 그리는 립케이지 암 아크 궤적을 (1) 팔을 바닥에 내려놓고 골반만 굴려야 하는 「골반 시계」·「테이블 골반 록」, (2) 양손을 갈비뼈 옆에 얹고 호흡만 관찰해야 하는 「누워서 호흡 관찰」·「캐딜락 테이블 호흡」이 그대로 공유합니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-mat-pelvic-clock',
        nameKo: '골반 시계',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['flexion', 'extension'],
        catalogCueQuoteKo: '양팔은 몸통 옆에 편안히 내려놓습니다. / 천골 무게를 유지한 채 골반을 앞뒤로 부드럽게 굴립니다.',
        observedJointAnomalyKo:
          '골반(pelvis: 174,128) 이동량이 0.0px인데 반해, 바닥에 내려놓아야 할 손(hand)이 152,132→92,108로 64.1px 오버헤드 아크를 그립니다.',
        proposedMinimalFixKo:
          '상지(hand: 152,132, elbow: 122,130)를 매트에 고정(Δ0px)하고 골반·요추 전후방 틸트(lumbar.y: 128→132→124, pelvis.y: 128→124→128)를 시각화하도록 분리.',
      },
      {
        exerciseId: 'original-cadillac-pelvic-rock',
        nameKo: '테이블 골반 록',
        apparatus: 'cadillac',
        bodyPosition: 'supine',
        spinalPlanes: ['flexion', 'extension'],
        catalogCueQuoteKo: '캐딜락 테이블 위에 바로 누워 무릎을 세웁니다. / 숨에 맞추어 골반을 앞뒤로 작게 굴립니다.',
        observedJointAnomalyKo:
          '골반은 고정(Δ0px)되고 팔만 64.1px 머리 위로 이동하여 골반 록과 암 서클이 혼동됩니다.',
        proposedMinimalFixKo:
          '캐딜락 테이블 위 상지 고정 + 골반·요추 전후방 록킹 궤적으로 분리.',
      },
      {
        exerciseId: 'original-mat-rib-breath',
        nameKo: '누워서 호흡 관찰',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '무릎을 세워 발바닥을 매트에 두고 양손을 갈비뼈 옆에 가볍게 얹습니다.',
        observedJointAnomalyKo:
          '갈비뼈 옆에 얹어야 할 손이 머리 쪽(hand: 152,132→92,108, Δ64.1px)으로 크게 스윕합니다.',
        proposedMinimalFixKo:
          '손을 갈비뼈 측면(hand: 124,118)에 유지한 채 흉곽 호흡 확장(thoracic.y: 124→118→124)만 표시하도록 분리.',
      },
      {
        exerciseId: 'original-cadillac-table-breath',
        nameKo: '캐딜락 테이블 호흡',
        apparatus: 'cadillac',
        bodyPosition: 'supine',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '양손을 갈비뼈 옆이나 배 위에 가볍게 둡니다.',
        observedJointAnomalyKo:
          '손이 갈비뼈/배 위에 머물지 않고 64.1px 오버헤드 아크를 그립니다.',
        proposedMinimalFixKo:
          '캐딜락 테이블 위 손을 흉곽(hand: 124,118)에 고정하고 흉곽 호흡 확장만 표시하도록 분리.',
      },
    ],
  },
  {
    mismatchId: 'SM-04',
    rank: 4,
    severity: 'high',
    archetypeId: 'standing-scooter-lunge-splits',
    archetypeTitleKo: '스탠딩 스쿠터 · 런지 · 사이드 스플릿 & 체어 스텝업',
    groupSize: 5,
    intentionalMemberIds: [
      'ex-lower-01',
      'ex-kr-reformer-02',
      'ex-lower-03',
    ],
    mismatchedMemberIds: [
      'original-chair-sit-to-stand',
      'ex-lower-02',
    ],
    dominantSharedTrajectory: {
      ankle: 'start(214,162) → middle(278,148) → end(222,160) [maxDelta = 65.5px 단측 후방 스쿠터 킥]',
      knee: 'start(184,144) → middle(228,134) → end(190,142) [maxDelta = 45.1px 후방 신전]',
      pelvis: 'start(152,118) → middle(154,120) → end(152,118) [Δ = 2.8px 높이 고정]',
    },
    mismatchReasonKo:
      '골반 높이를 고정(pelvis.y: 118→120, Δ2.8px)한 채 한 발을 뒤로 65.5px 차내는 스탠딩 스쿠터 궤적을 (1) 체어 시트에 앉았다가 양발로 수직 기립해야 하는 「체어 앉았다 일어서기(Sit to Stand)」와 (2) 직립 관상면 양측 외전·내전 동작인 「리포머 스탠딩 사이드 스플릿 & 스케이터」가 공유합니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-chair-sit-to-stand',
        nameKo: '체어 앉았다 일어서기',
        apparatus: 'chair',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '체어 시트 앞쪽에 앉아 양발을 바닥에 평행하게 둡니다. / 날숨에 발바닥으로 바닥을 밀며 천천히 일어섭니다.',
        observedJointAnomalyKo:
          '시트에 앉았다가 양발로 일어서는 수직 기립 대신, 한 발로 서서 반대 다리를 뒤로 65.5px 차내는 스쿠터 킥(ankle: 214,162→278,148)이 표시되며 골반 수직 상승이 없습니다(pelvis.y: 118→120).',
        proposedMinimalFixKo:
          '양발을 바닥(ankle: 176,172)에 고정한 채 체어 시트 착석(start pelvis: 136,106)에서 직립 기립(middle pelvis: 162,78) 후 착석 복귀(end pelvis: 138,104)하는 Sit-to-Stand 전용 궤적으로 분리.',
      },
      {
        exerciseId: 'ex-lower-02',
        nameKo: '리포머 스탠딩 사이드 스플릿 & 스케이터',
        apparatus: 'reformer',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '한 발은 고정 플랫폼에, 다른 발은 캐리지 패드 위에 11자로 나란히 디뎌... 양다리를 옆으로 대칭되게 벌리며 캐리지를 밀어냅니다.',
        observedJointAnomalyKo:
          '상체를 앞으로 숙인 시상면 런지/스쿠터 자세에서 뒷발이 공중(y:148)으로 들리는 궤적이 표시되어 관상면 직립 양다리 스플릿과 불일치합니다.',
        proposedMinimalFixKo:
          '상체를 중앙 수직 축으로 세우고 플랫폼 지지 발(farAnkle: 236,138)과 슬라이딩 캐리지 발(ankle: 148,138→96,138)이 동일 수평면(y:138)에서 좌우로 벌어졌다 모이는 사이드 스플릿 궤적으로 분리.',
      },
    ],
  },
];
