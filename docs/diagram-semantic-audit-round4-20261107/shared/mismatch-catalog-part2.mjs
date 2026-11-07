export const RESIDUAL_SEMANTIC_MISMATCH_PART2 = [
  {
    mismatchId: 'SM-05',
    rank: 5,
    severity: 'high',
    archetypeId: 'kneeling-chest-expansion-triceps',
    archetypeTitleKo: '닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치',
    groupSize: 4,
    intentionalMemberIds: [
      'ex-upper-01',
      'ex-kr-reformer-03',
      'ex-global-reformer-03',
    ],
    mismatchedMemberIds: [
      'ex-warmup-02',
    ],
    dominantSharedTrajectory: {
      hand: 'start(214,92) → middle(102,130) → end(198,96) [maxDelta = 118.3px 골반 뒤 스트랩 당김]',
      thoracic: 'start(146,88) → middle(148,86) → end(146,88) [maxDelta = 2.8px 수직 고정]',
      head: 'start(146,30) → middle(148,28) → end(146,30) [maxDelta = 2.8px 수직 고정]',
    },
    mismatchReasonKo:
      '척추를 수직 기둥으로 고정(thoracic Δ2.8px, head Δ2.8px)하고 스트랩을 골반 뒤로 당기는 「닐링 체스트 익스팬션」 궤적을 척추 전방 분절 굴곡·신전이 핵심인 「캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치(ex-warmup-02)」가 공유하여, 캣 스트레치인데도 척추가 전혀 굴곡되지 않고 팔만 뒤로 당기는 정반대 동작으로 표시됩니다.',
    perExerciseFindings: [
      {
        exerciseId: 'ex-warmup-02',
        nameKo: '캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치',
        apparatus: 'cadillac',
        bodyPosition: 'kneeling',
        spinalPlanes: ['flexion', 'extension'],
        catalogCueQuoteKo: '턱을 가볍게 당기며 정수리부터 경추-흉추-요추 순서로 분절하여 바를 아래로 밀어 내려갑니다.',
        observedJointAnomalyKo:
          '척추 분절 굴곡(Cat Stretch) 동작임에도 흉추(thoracic Δ2.8px)·요추(lumbar Δ2.0px)·머리(head Δ2.8px)가 꼿꼿이 서 있고 손만 골반 뒤(x:214→102)로 당겨집니다.',
        proposedMinimalFixKo:
          '무릎 지지 위에서 롤다운 바를 전하방으로 밀며 경추·흉추·요추가 둥근 C-커브 후 정수리부터 척추를 길게 펴는 캣 스트레치 분절 궤적(head: 146,32→192,78, thoracic: 146,88→168,74, hand: 196,74→232,112)으로 분리.',
      },
    ],
  },
  {
    mismatchId: 'SM-06',
    rank: 6,
    severity: 'medium',
    archetypeId: 'seated-roll-back-spine-twist',
    archetypeTitleKo: '시티드 롤백(Roll-Back) · 숏박스 & 스파인 트위스트',
    groupSize: 5,
    intentionalMemberIds: [
      'original-cadillac-seated-roll-back',
      'original-barrel-seated-spine-reach',
      'ex-core-02',
    ],
    mismatchedMemberIds: [
      'original-chair-seated-spine-twist',
      'original-cadillac-seated-rotation',
    ],
    dominantSharedTrajectory: {
      head: 'start(142,38) → middle(92,64) → end(138,36) [maxDelta = 56.4px 후방 C-커브 롤백]',
      shoulder: 'start(140,72) → middle(108,84) → end(138,70) [maxDelta = 34.2px 후방 젖힘]',
      thoracic: 'start(140,96) → middle(120,104) → end(138,94) [maxDelta = 21.5px 후방 굴곡]',
    },
    mismatchReasonKo:
      '상체를 뒤로 56.4px 눕히는 시상면 C-커브 롤백(head: 142,38→92,64) 궤적을 수직 축 순수 회전 동작인 「체어 시티드 스파인 트위스트」와 「캐딜락 앉아서 흉곽 회전」이 공유합니다. 두 동작의 큐는 모두 「허리가 뒤로 무너지지 않게 좌골 위에서 척추를 길게 세운 채 회전」하라고 지시하나 도해는 뒤로 눕는 롤백을 보여줍니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-chair-seated-spine-twist',
        nameKo: '체어 시티드 스파인 트위스트',
        apparatus: 'chair',
        bodyPosition: 'seated',
        spinalPlanes: ['rotation'],
        catalogCueQuoteKo: '양쪽 좌골 무게를 같게 유지하며 흉곽만 부드럽게 회전합니다. / 주의: 허리가 뒤로 무너지지 않게 척추 길이를 유지합니다.',
        observedJointAnomalyKo:
          '주의사항에서 금지한 「허리가 뒤로 무너지는 롤백」(head.x: 142→92, thoracic.x: 140→120)이 정점 자세로 그려져 있습니다.',
        proposedMinimalFixKo:
          '머리-흉추-요추-골반 수직 축(x:132)을 좌골 위에 고정하고 양팔(hand/farWrist)과 견갑대만 좌우 비대칭 수평 회전하도록 분리.',
      },
      {
        exerciseId: 'original-cadillac-seated-rotation',
        nameKo: '앉아서 흉곽 회전',
        apparatus: 'cadillac',
        bodyPosition: 'seated',
        spinalPlanes: ['rotation'],
        catalogCueQuoteKo: '좌골 위에서 척추를 길게 세웁니다. / 골반을 고정한 채 흉곽만 천천히 좌우로 회전합니다.',
        observedJointAnomalyKo:
          '수직 축 회전 대신 후방 56.4px 롤백 C-커브가 표시되어 동일 기구의 「앉아서 롤백 준비(original-cadillac-seated-roll-back)」와 도해가 100% 동일합니다.',
        proposedMinimalFixKo:
          '캐딜락 테이블 착석 수직 축을 유지한 채 흉곽·양팔 수평 회전만 일어나도록 분리하여 롤백과 시각적으로 구별.',
      },
    ],
  },
  {
    mismatchId: 'SM-07',
    rank: 7,
    severity: 'high',
    archetypeId: 'lateral-mermaid-side-bend',
    archetypeTitleKo: '머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드',
    groupSize: 7,
    intentionalMemberIds: [
      'original-mat-mermaid',
      'original-chair-seated-mermaid',
      'original-cadillac-seated-side-reach',
      'ex-cooldown-01',
    ],
    mismatchedMemberIds: [
      'original-barrel-standing-side-stretch',
      'original-barrel-supported-side-bend',
      'ex-kr-barrel-01',
    ],
    dominantSharedTrajectory: {
      pelvis: 'start(148,138) → middle(148,138) → end(148,138) [바닥 Z-Sit 착석 고정]',
      knee: 'start(196,148) → middle(196,148) → end(196,148) [바닥 접은 무릎 고정]',
      hand: 'start(88,50) → middle(236,36) → end(82,98) [maxDelta = 148.7px 오버헤드 측굴]',
    },
    mismatchReasonKo:
      '바닥에 다리를 접고 앉은 Z-Sit 머메이드 착석 좌표(pelvis: 148,138, knee: 196,148)를 (1) 서서 수행하는 「바렐 옆 스탠딩 사이드 스트레치(bodyPosition: standing)」와 (2) 래더 바렐 돔 위에 옆으로 기대어 다리를 사다리 가로대에 걸고 수행하는 「바렐 지지 사이드 벤드 / 오블리크(bodyPosition: side-lying)」가 그대로 공유하여 기구 레이어와 하체 자세가 불일치합니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-barrel-standing-side-stretch',
        nameKo: '바렐 옆 스탠딩 사이드 스트레치',
        apparatus: 'barrel',
        bodyPosition: 'standing',
        spinalPlanes: ['lateral'],
        catalogCueQuoteKo: '바렐 옆에 서서 한 손을 바렐 위에 가볍게 올립니다. / 두 발로 바닥을 지지하고 바렐 옆에 섭니다.',
        observedJointAnomalyKo:
          'bodyPosition이 standing이라 좌측 스탠딩 바렐 기구가 렌더링되는데, 인체는 서 있지 않고 바닥(pelvis.y:138, knee.y:148)에 Z-Sit으로 주저앉아 있습니다.',
        proposedMinimalFixKo:
          '양발을 바렐 외측 바닥(ankle: 148,172)에 디뎌 직립(pelvis: 146,118)한 상태에서 한 손은 바렐/래더를 짚고 반대 팔로 오버헤드 측굴하도록 분리.',
      },
      {
        exerciseId: 'original-barrel-supported-side-bend',
        nameKo: '바렐 지지 사이드 벤드',
        apparatus: 'barrel',
        bodyPosition: 'side-lying',
        spinalPlanes: ['lateral'],
        catalogCueQuoteKo: '바렐 곡선 위에 옆구리를 대고 다리를 지지대에 안정적으로 둡니다.',
        observedJointAnomalyKo:
          '바렐 아치 상단(y:96~108)에 골반·옆구리를 기대고 사다리 가로대(x:222..256)에 발을 걸어야 하나, 바닥(pelvis: 148,138)에 무릎을 접고 앉은 Z-Sit으로 표시됩니다.',
        proposedMinimalFixKo:
          '골반을 바렐 아치 상단(pelvis: 132,108)에 지지하고 다리를 우측 사다리 가로대(ankle: 236,136)로 뻗은 사이드 렝스닝/사이드 벤드 궤적으로 분리.',
      },
      {
        exerciseId: 'ex-kr-barrel-01',
        nameKo: '래더 바렐 사이드 시트업 & 오블리크 (Side Sit-Up)',
        apparatus: 'barrel',
        bodyPosition: 'side-lying',
        spinalPlanes: ['lateral', 'extension'],
        catalogCueQuoteKo: '골반 측면을 바렐 아치 가장 높은 곳에 대고 위쪽 발은 사다리 앞쪽 가로대, 아래쪽 발은 뒤쪽 가로대에 걸어 하체를 단단히 고정합니다.',
        observedJointAnomalyKo:
          '사다리 가로대 하체 고정 없이 바닥 Z-Sit 착석 자세(pelvis: 148,138, knee: 196,148)로 렌더링됩니다.',
        proposedMinimalFixKo:
          '바렐 아치 골반 지지(pelvis: 132,108) + 우측 사다리 가로대 발 걸기(ankle: 236,136) 상태에서 상체 사선 리프트(head: 74,88→96,42)를 수행하도록 분리.',
      },
    ],
  },
  {
    mismatchId: 'SM-08',
    rank: 8,
    severity: 'high',
    archetypeId: 'chair-seated-pedal-footwork / barrel-standing-hip-extension-isolated',
    archetypeTitleKo: '하지 가동 방향/평면 역전 쌍 (체어 니 리프트 vs 페달 프레스 / 바렐 사이드 리치 vs 힙 익스텐션)',
    groupSize: 6,
    intentionalMemberIds: [
      'original-chair-seated-pedal-press',
      'original-chair-alternating-pedal',
      'ex-footwork-03',
      'original-barrel-standing-hip-extension',
    ],
    mismatchedMemberIds: [
      'original-chair-seated-knee-lift',
      'original-barrel-standing-side-reach',
    ],
    dominantSharedTrajectory: {
      chairKnee: 'start(184,98) → middle(198,132) → end(188,104) [무릎 하방 +34px 하강 프레스]',
      barrelAnkle: 'start(170,168) → middle(222,148) → end(174,168) [시상면 후방 킥 Δ55.7px]',
    },
    mismatchReasonKo:
      '(1) 「체어 시티드 니 리프트(original-chair-seated-knee-lift, core)」는 무릎을 위로 들어 올리는(Lift) 코어 동작인데 페달을 아래로 밟아 무릎이 y:98→132(+34px 하강)로 내려가는 「체어 시티드 페달 프레스」 궤적을 그대로 공유하여 가동 방향이 정반대입니다. (2) 「래더 지지 사이드 레그 리치(original-barrel-standing-side-reach)」는 다리를 옆(관상면 외전)으로 들어 올리는 동작인데 뒤로 차내는 「스탠딩 힙 익스텐션」과 100% 동일한 좌표를 사용합니다.',
    perExerciseFindings: [
      {
        exerciseId: 'original-chair-seated-knee-lift',
        nameKo: '체어 시티드 니 리프트',
        apparatus: 'chair',
        bodyPosition: 'seated',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '체어 시트 위에 바르게 앉아 양발을 바닥에 둡니다. / 골반이 흔들리지 않게 유지하며 한쪽 무릎을 가볍게 들어 올립니다.',
        observedJointAnomalyKo:
          '무릎을 들어 올리는(Knee Lift) 동작임에도 middle 위상에서 무릎이 y:98→132로 34px 아래로 내려가며 페달을 밟는 궤적으로 표시됩니다.',
        proposedMinimalFixKo:
          '지지 다리(farAnkle: 176,172)는 바닥에 두고 가동 다리 무릎을 상방 리프트(knee: 184,126→176,88, ankle: 192,168→188,134)하도록 방향 역전 교정.',
      },
      {
        exerciseId: 'original-barrel-standing-side-reach',
        nameKo: '래더 지지 사이드 레그 리치',
        apparatus: 'barrel',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
        catalogCueQuoteKo: '바렐 옆에 서서 한 손으로 프레임을 잡습니다. / 몸통이 기울어지지 않게 유지하며 바깥쪽 다리를 옆으로 들어 올립니다.',
        observedJointAnomalyKo:
          '「래더 지지 스탠딩 힙 익스텐션(original-barrel-standing-hip-extension)」과 모든 관절 좌표가 100% 동일하여 굴곡된 무릎(knee: 184,138)의 시상면 후방 차기로 보입니다.',
        proposedMinimalFixKo:
          '래더 손 지지(hand: 88,76)와 수직 골반을 유지한 채 무릎을 편 직선 외전 궤적(knee: 176,136, ankle: 214,122, toe: 226,120) 및 중둔근 외전 화살표로 분리.',
      },
    ],
  },
];

export const SINGLETON_RESIDUAL_NOTE = Object.freeze({
  mismatchId: 'SM-09-singleton-note',
  exerciseId: 'original-mat-forearm-plank',
  nameKo: '포암 플랭크 준비',
  archetypeId: 'plank-long-stretch-chair-pike',
  noteKo:
    '이전 라운드(D-02A/D-02B)에서 리포머 플랭크(ex-plank-01)와 체어 플랭크 3종이 개별 리그로 분리된 결과 현재는 단독(1개) 그룹이나, 아키타입 기본 좌표가 체어 파이크를 겸하고 있어 포암 플랭크 홀드 준비임에도 middle 위상에서 골반이 천장으로 50px 솟구치며(pelvis.y: 108→58) 전완(elbow-wrist) 수평 지지 대신 손목 직립 지지로 그려집니다. 최소 후속 패치에서 전완 수평 지지(elbow: 92,158, wrist: 124,158) 및 중립 플랭크 유지(pelvis.y: 118→114)로 함께 교정할 것을 권장합니다.',
});

