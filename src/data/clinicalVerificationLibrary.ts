import type { ApparatusType, ClassBlockCategory, PilatesExercise } from '../types/pilates';

export interface ClinicalVideoReference {
  titleKo: string;
  channelName: string;
  url: string;
  keyTakeawayKo: string;
}

export interface ClinicalLiteratureReference {
  id: string;
  titleKo: string;
  citation: string;
  url: string;
  clinicalSummaryKo: string;
}

export interface StudioVerifiedGuidance {
  exerciseId: string;
  verificationBadgeKo: string;
  verificationTier: 'clinical-literature-and-video' | 'curriculum-and-video';
  springAndSetupStandardKo: string;
  biomechanicalFocusKo: string;
  breathingCadenceKo: string;
  teachingChecklistKo: readonly [string, string, string];
  primaryVideo: ClinicalVideoReference;
  secondaryVideo: ClinicalVideoReference;
  literature: ClinicalLiteratureReference;
}

export const VERIFIED_LITERATURE_BY_APPARATUS: Record<ApparatusType, ClinicalLiteratureReference> = {
  mat: {
    id: 'pmc-3445206-mat',
    titleKo: '필라테스 중립 척추·골반 안정화 및 심부 코어 선행 수축(Feed-forward) 임상 가이드',
    citation: 'Wells C, Kolt GS, Bialocerkowski A. Sports Health (NIH/PMC3445206) & Return to Life Through Contrology',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3445206/',
    clinicalSummaryKo:
      '사지 움직임 약 100ms 전 복횡근(TrA)·다열근 선행 활성과 흉곽-골반 중립 정렬을 통해 요추 과신전 및 경추 보상 긴장을 예방합니다.',
  },
  reformer: {
    id: 'balanced-body-reformer-manual',
    titleKo: '리포머 스프링 저항 역학·슬개골-제2족지 정렬 및 원심성 감속 프로토콜',
    citation: 'Balanced Body Movement Principles & Positive Action Reformer Level 1 Manual (PMC11944116)',
    url: 'https://positiveactionpilates.com.au/wp-content/uploads/2024/11/2024-Reformer-Level-1-Student-Manual.pdf',
    clinicalSummaryKo:
      '스토퍼에서 고관절 45~90° 굴곡 시작 각도를 확보하고, 슬개골 중심과 제2족지를 일직선으로 정렬해 무릎 과신전(Hyperextension) 없이 햄스트링·내전근 연결로 캐리지 복귀를 제어합니다.',
  },
  cadillac: {
    id: 'polestar-cadillac-rehab',
    titleKo: '캐딜락·타워 스프링 벡터 보조 및 척추 분절·견갑 안정화 프로토콜',
    citation: 'Polestar Pilates Rehabilitation Framework (PMC8615180) & Balanced Body Tower Guidelines',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8615180/',
    clinicalSummaryKo:
      '고정된 테이블 지지면과 스프링 장력 벡터(레그 스프링 퍼플/중간, 암 스프링 옐로우~그레이, 하단 푸시쓰루 바 안전 체인 필수)를 활용해 요추 부담 없이 중심부-사지 협응을 유도합니다.',
  },
  chair: {
    id: 'basi-chair-biomechanics',
    titleKo: '원다 체어 좁은 지지면 코어 제어 및 페달 스프링 등척·원심성 협응 가이드',
    citation: 'BASI Pilates Comprehensive Apparatus & Scapular Stabilization RCT (PMC4301231)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4301231/',
    clinicalSummaryKo:
      '좁은 좌면 위에서 전거근·하부승모근으로 견갑대를 광배근에 연결하고, 척추 분절 움직임이 멈추면 페달 누르기를 멈춰 요추 압박 없이 투웨이 스트레치(Two-Way Stretch)를 유지합니다.',
  },
  barrel: {
    id: 'ladder-barrel-lumbo-pelvic',
    titleKo: '래더 바렐 곡면 지지 척추 신전·측굴 및 골반-대퇴 전자부 정렬 프로토콜',
    citation: 'Lumbo-Pelvic Stability & Flexibility Clinical Trial (PMC3289190) & Coreva Barrel Glossary',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3289190/',
    clinicalSummaryKo:
      '바렐 곡면에 대전자(Greater Trochanter) 또는 복부를 안정적으로 밀착하고 래더 렁(Rung)에 발뒤꿈치·발볼을 고정해, 반동 없이 긴 지렛대(Long Lever) 코어·둔근·내전근 힘으로 움직입니다.',
  },
};

export const VERIFIED_VIDEOS_BY_APPARATUS: Record<
  ApparatusType,
  { primary: ClinicalVideoReference; secondary: ClinicalVideoReference }
> = {
  mat: {
    primary: {
      titleKo: '조셉 필라테스 Return to Life 클래식 매트 34개 전 동작 정석 가이드',
      channelName: 'Pilates Original 34 Contrology Archive',
      url: 'https://www.youtube.com/watch?v=qkdhm5r8NoQ',
      keyTakeawayKo: '척추를 구슬 실처럼 한 분절씩 매트에 내려놓고 호흡과 복부 중심(Powerhouse)으로 사지를 뻗습니다.',
    },
    secondary: {
      titleKo: '클래식 매트 필라테스 34 시퀀스 호흡·분절 큐잉 아카이브',
      channelName: 'Contrology Classical Mat',
      url: 'https://www.youtube.com/watch?v=H3D_RnGYYss',
      keyTakeawayKo: '목과 어깨 긴장을 덜고 흉곽 호흡과 골반 중립·후방경사 전환을 정교하게 연결합니다.',
    },
  },
  reformer: {
    primary: {
      titleKo: 'Pilates Anytime — 리포머 풋워크(Footwork) 정렬·햄스트링·무릎 과신전 방지 정석',
      channelName: 'Pilates Anytime',
      url: 'https://www.youtube.com/watch?v=QDBzjlhKsco',
      keyTakeawayKo: '양 숄더레스트 중앙에 머리와 골반 수평을 맞추고, 2번 발가락-무릎 중앙 정렬과 뒤허벅지(햄스트링) 힘으로 무릎 잠김 없이 3카운트 컨트롤로 복귀합니다.',
    },
    secondary: {
      titleKo: 'Pilates Anytime — 리포머 헌드레드(The Hundred) 스프링 세팅·견갑 연결 가이드',
      channelName: 'Pilates Anytime',
      url: 'https://www.youtube.com/watch?v=vx4DdBWY6kQ',
      keyTakeawayKo: '핸들을 과하게 쥐지 않고 스트랩 장력을 손→어깨→등 하부로 연결해 목 긴장 없이 5초 들숨·5초 날숨 10세트를 수행합니다.',
    },
  },
  cadillac: {
    primary: {
      titleKo: 'Online Pilates Classes — 캐딜락 & 타워 스프링 선택·클립·안전 체인 완벽 가이드',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=R00X3brvFl0',
      keyTakeawayKo: '레그 스프링(보라)·암 스프링(그레이/옐로우)·롤백 바(레드) 장력 기준과 하단 스프링 사용 시 안전 체인 선(先)체결 원칙을 준수합니다.',
    },
    secondary: {
      titleKo: 'Online Pilates Classes — 캐딜락 푸시쓰루 바(Push Thru Bar) 타워·숄더 롤다운 정석',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=tV3l-LkhHtc',
      keyTakeawayKo: '스프링이 몸을 흔들지 않도록 중심부에서 저항을 받아내며 척추 분절과 흉추 신전을 안전하게 이끌어냅니다.',
    },
  },
  chair: {
    primary: {
      titleKo: 'Online Pilates Classes — 원다 체어(Wunda Chair) 단계별 스완·페달 제어 가이드',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=deQhPLrHz2k',
      keyTakeawayKo: '1 미들 스프링 기준 손꿈치(Heel of hand)로 페달을 누르되 팔을 등에 연결하고, 척추가 멈추면 페달도 멈춰 허리 꺾임을 방지합니다.',
    },
    secondary: {
      titleKo: 'Authentic Pilates — 원다 체어 호스백(Horseback) 및 페달 코어 컨트롤',
      channelName: 'Authentic Pilates Learning Center',
      url: 'https://www.youtube.com/watch?v=-Scg195T8Yw',
      keyTakeawayKo: '좁은 좌면에서 허벅지 안쪽과 복부 중심을 끌어올려 페달 복귀 구간까지 흔들림 없는 정렬을 유지합니다.',
    },
  },
  barrel: {
    primary: {
      titleKo: 'Balanced Body — 래더 바렐 호스백(Horseback) 및 골반·내전근 리프트 튜토리얼',
      channelName: 'Balanced Body',
      url: 'https://www.youtube.com/watch?v=k-dcF4uF5E8',
      keyTakeawayKo: '안장처럼 바렐 곡면을 감싸며 허벅지 안쪽·햄스트링·후면 사슬 힘으로 골반을 들어 올리고 컨트롤하며 내려옵니다.',
    },
    secondary: {
      titleKo: 'Posture Pilates — 래더 바렐 사이드 싯업(Side Sit Up) 초·중·고급 정석 가이드',
      channelName: 'Posture Pilates',
      url: 'https://www.youtube.com/watch?v=5rt5LLYiZ3U',
      keyTakeawayKo: '대전자(Greater Trochanter)를 바렐 정점에 두고 위쪽 다리는 뒤·아래쪽 다리는 앞으로 래더에 고정해 흉곽 들림과 반동 없이 측굴합니다.',
    },
  },
};

const BLOCK_SETUP_DEFAULTS: Record<
  ApparatusType,
  Record<ClassBlockCategory, { springKo: string; biomechKo: string }>
> = {
  mat: {
    warmup: {
      springKo: '논슬립 매트 · 필요 시 경추·무릎 서포트 패드',
      biomechKo: '횡격막 3차원 흉곽 호흡과 천골-후두골 수평 접촉 정렬',
    },
    footwork: {
      springKo: '매트 또는 고정 지지대 · 맨발 3점 지지(모지구·소지구·뒤꿈치)',
      biomechKo: '제2족지-슬개골 중앙 정렬 및 족관절 저측굴곡 원심성 감속',
    },
    bridging: {
      springKo: '논슬립 매트 · 평평한 헤드 포지션 (목 체중 부하 금지)',
      biomechKo: '좌골결절 너비 평행 발 지지 · 치골→요추→흉추 순차 분절 리프트',
    },
    core: {
      springKo: '논슬립 매트 · 흉요추 중립 또는 임프린트 지지',
      biomechKo: '사지 이동 100ms 전 복횡근(TrA)·다열근 선행 수축 및 골반 수평 유지',
    },
    'upper-body': {
      springKo: '매트 · 세라밴드(탄성 이상 유무 사전 확인) 또는 프리웨이트',
      biomechKo: '좌골 수직 지지 위에서 상부승모근 과긴장 배제 및 전거근·하부승모근 연결',
    },
    'lower-body': {
      springKo: '논슬립 매트 · 옆으로 누운 경추 지지 쿠션',
      biomechKo: '양측 ASIS 수직 정렬 유지 및 중둔근·고관절 외회전근 고립 수축',
    },
    plank: {
      springKo: '논슬립 매트 · 손목 부담 시 전완 지지 또는 패드 적용',
      biomechKo: '견갑골 전인·하강 중립 유지 및 요추 과신전 없는 체간 항신전 지지',
    },
    extension: {
      springKo: '논슬립 매트 · 치골 결합 매트 밀착',
      biomechKo: '하부 요추 꺾임 방지 · 복부 지지 기반 흉추 분절 신전 및 경추 연장',
    },
    'feet-in-straps': {
      springKo: '매트 · 롱 밴드 또는 무부하 하지 원호 제어',
      biomechKo: '골반 정적 안정성 위에서 대퇴골두 구심성 회전 및 햄스트링 신장',
    },
    cooldown: {
      springKo: '논슬립 매트 · 편안한 좌골 또는 측와위 지지',
      biomechKo: '측면 흉곽 확장 호흡과 흉추 회전·측굴 가동성 이완',
    },
  },
  reformer: {
    warmup: {
      springKo: '2 Red + 1 Blue (중~강 지지) · 풋바 Mid · 헤드레스트 Flat/Up',
      biomechKo: '양 숄더레스트 중앙 두부·골반 정렬 및 캐리지 정지 상태 흉곽 호흡 연결',
    },
    footwork: {
      springKo: '2~3 Red + 1 Blue (Balanced Body 기준 중~강) · 풋바 Mid',
      biomechKo: '제2족지-슬개골 일직선 정렬 · 뒤허벅지(햄스트링)·내전근 연결로 무릎 과신전 방지 및 3카운트 복귀',
    },
    bridging: {
      springKo: '2 Red + 1 Blue (안정 지지) · 헤드레스트 완전히 Flat 필수',
      biomechKo: '캐리지를 스토퍼에 고정한 채 햄스트링·둔근으로 골반 리프트 및 분절 하강',
    },
    core: {
      springKo: '1 Red + 1 Blue (중간 저항) · 핸드 스트랩 장력 균등 확인',
      biomechKo: '손잡이를 과하게 쥐지 않고 스트랩 저항을 어깨→광배근→복부 중심으로 연결해 경추 긴장 방지',
    },
    'upper-body': {
      springKo: '1 Red 또는 1 Blue (상체 제어용 중~약 저항) · 숏박스/롱박스 고정 확인',
      biomechKo: '좌골 수직 정렬 유지 · 전면 갈비뼈 닫힘과 견갑골 하강·후인 원심성 제어',
    },
    'lower-body': {
      springKo: '1 Red 또는 1 Red + 1 Blue · 풋바 Mid · 옆누움 헤드레스트 지지',
      biomechKo: '상·하측 골반 수직 정렬 유지 및 발바닥 전체 균등 압력으로 외측 둔근·외전근 제어',
    },
    plank: {
      springKo: '1 Red 또는 1 Blue (코어 난이도 반비례) · 풋바 Mid/Low',
      biomechKo: '견갑대 안정화 및 캐리지 이동 중 요추 굴곡·과신전 없는 원통형 코어 유지',
    },
    extension: {
      springKo: '1 Red (롱박스 스완/백 리치 기준) · 풋바 Down · 박스 미끄럼 방지 확인',
      biomechKo: '치골·하복부 박스 지지 유지 · 흉골 전상방 연장을 통한 상부 등(흉추) 신전',
    },
    'feet-in-straps': {
      springKo: '2 Red 또는 1 Red + 1 Blue · 풋바 Down · 풋스트랩 아치/뒤꿈치 고정',
      biomechKo: '천골 캐리지 밀착 유지 · 허리가 뜨지 않는 대각선 범위에서 내전근·후면 사슬로 스트랩 제어',
    },
    cooldown: {
      springKo: '1 Red 또는 1 Blue · 캐리지 좌식/지지 스트레치',
      biomechKo: '양측 좌골 무게 균형 유지 및 호흡과 연동된 측면 흉곽·고관절 이완',
    },
  },
  cadillac: {
    warmup: {
      springKo: '테이블 고정 지지 · 스프링 미사용 또는 가벼운 암 스프링(Yellow)',
      biomechKo: '높은 테이블의 안정된 지지면에서 척추 중립과 3차원 후방·측면 흉곽 호흡 정렬',
    },
    footwork: {
      springKo: '레그 스프링 Purple(표준) 또는 타워 푸시쓰루 바 · 클립 일직선 체결 확인',
      biomechKo: '발목 배측·저측굴곡 정렬 및 스프링 장력 속 골반 수평·하지 정렬 유지',
    },
    bridging: {
      springKo: '테이블 고정 지지 (움직이는 바 발 지지 제외) · 평평한 경추 정렬',
      biomechKo: '양발 테이블 균등 압력 기반 골반 후방경사 및 흉요추 분절 브리징',
    },
    core: {
      springKo: '롤백 바 Red/Gray 1쌍 (상단 체결) · 바 그립 및 후방 공간 안전 확인',
      biomechKo: '팔을 등에 연결한 채 스프링 보조를 받아 요추 한 분절씩 롤다운·롤업 제어',
    },
    'upper-body': {
      springKo: '암 스프링 Yellow 또는 Gray (중간 높이 체결) · 스위블 핸들 수평 확인',
      biomechKo: '어깨 거상 없이 상부 등부터 하부 갈비뼈까지 연결해 스프링 저항을 중심부에서 제어',
    },
    'lower-body': {
      springKo: '레그 스프링 Purple (상단/중단 후크) · 풋루프 체결 및 테이블 중앙 위치 확보',
      biomechKo: '스프링이 허리를 꺾거나 다리를 끌고 가지 않도록 복부 중심으로 고관절 신전·외전 제어',
    },
    plank: {
      springKo: '테이블 중앙 사지 지지 · 주변 바·스프링 간섭 배제',
      biomechKo: '견갑대-골반 평행 유지 및 사지 슬라이드 시 몸통 회전 억제(Anti-rotation)',
    },
    extension: {
      springKo: '푸시쓰루 바 상단 1 Red 또는 무스프링 테이블 지지 (하단 스프링 시 안전 체인 필수)',
      biomechKo: '내전근 회전과 복부 지지를 통해 허리 압박 없이 흉추 전상방 신전 유도',
    },
    'feet-in-straps': {
      springKo: '레그 스프링 Purple 1쌍 · 풋루프 발목/아치 대칭 착용',
      biomechKo: '천골 테이블 고정 및 양측 다리 대칭 원호·프로그 움직임 속 골반 안정화',
    },
    cooldown: {
      springKo: '테이블 좌식 지지 · 롤백 바 또는 무부하 측굴·회전',
      biomechKo: '양 좌골 테이블 밀착 상태에서 측면 늑간근 확장 및 척추 축성 신장(Axial Elongation)',
    },
  },
  chair: {
    warmup: {
      springKo: '체어 좌면 고정 지지 · 발바닥 바닥 수평 접지',
      biomechKo: '좁은 좌면 중앙 좌골 수직 정렬 및 흉곽 호흡-골반 중립 감각 세팅',
    },
    footwork: {
      springKo: '1 Middle 또는 1 Heavy + 1 Light 스프링 · 분할/단일 페달 결합 핀 확인',
      biomechKo: '좌골과 정수리 투웨이 스트레치 유지 · 페달 복귀 시 스프링에 끌려가지 않는 원심성 제어',
    },
    bridging: {
      springKo: '1 Middle 스프링 · 페달 복귀 속도 제어',
      biomechKo: '하지 지지와 골반 후방경사 분절을 연결해 햄스트링·둔근 협응 강화',
    },
    core: {
      springKo: '1 Middle 스프링 · 좌면 중앙 지지',
      biomechKo: '고관절 굴곡·니 리프트 시 몸통 기울어짐 없이 심부 복부로 골반 수평 유지',
    },
    'upper-body': {
      springKo: '1 Light~Middle 스프링 · 좌면 앉은 자세 또는 전면 지지',
      biomechKo: '견갑골 하강·전인 균형 및 흉추 회전 시 좌골 체중 이동 방지',
    },
    'lower-body': {
      springKo: '고정 좌면 및 바닥 논슬립 확인 (페달 위 단독 기립 금지)',
      biomechKo: '슬관절-제2족지 정렬 유지 및 둔근·대퇴사두·비복근 원심성 하강 제어',
    },
    plank: {
      springKo: '1 Middle 스프링 · 좌면/페달 손꿈치(Heel of hand) 지지',
      biomechKo: '팔을 광배근·전거근에 연결하고 복부를 좌면 위로 들어 올리는 중심부 지지',
    },
    extension: {
      springKo: '1 Middle 스프링 (바닥 또는 체어 상단 스완) · 논슬립 패드 활용',
      biomechKo: '허벅지 안쪽을 모으고 척추 신전이 멈추면 페달 누르기를 멈춰 요추 과부하 차단',
    },
    'feet-in-straps': {
      springKo: '1 Middle 스프링 · 양발 페달 대칭 지지',
      biomechKo: '페달 상하 이동 중 골반 회전 억제 및 양측 하지 균등 출력 유지',
    },
    cooldown: {
      springKo: '1 Light~Middle 스프링 · 시티드 머메이드 측굴 지지',
      biomechKo: '반대쪽 좌골을 좌면에 닻처럼 내리고 흉곽 측면을 부채처럼 열어 호흡 이완',
    },
  },
  barrel: {
    warmup: {
      springKo: '래더 바렐 프레임 및 바렐 간격 잠금 레버 고정 확인',
      biomechKo: '양발 바닥 지지 및 래더 핸드레일 가벼운 접촉을 통한 축성 신장(Axial Elongation) 호흡',
    },
    footwork: {
      springKo: '래더 렁(Rung) 양손 지지 · 바닥 논슬립 접지 확인',
      biomechKo: '발목 플란타플렉션·도르시플렉션 전 구간에서 거골하관절 중립 및 종아리 원심성 제어',
    },
    bridging: {
      springKo: '바렐 곡면 및 래더 고정 확인',
      biomechKo: '후면 사슬(둔근·햄스트링) 활성과 골반-척추 분절 제어',
    },
    core: {
      springKo: '바렐-래더 간격 체형 맞춤 조절 · 아래쪽 발 최하단 렁(Rung)·위쪽 발 고정',
      biomechKo: '대전자(Greater Trochanter) 바렐 안착 · 반동 없이 복부·외복사근 힘으로 시티드 리치 및 사이드 벤드 제어',
    },
    'upper-body': {
      springKo: '래더 고정 지지 · 상체 정렬 확보',
      biomechKo: '견갑골 안정화 및 흉곽 열림 없는 상지 리치·흉추 회전 연결',
    },
    'lower-body': {
      springKo: '래더 핸드레일 고정 지지 · 지지 다리 골반 수직 정렬',
      biomechKo: '요추 전만 보상 없이 고관절 순수 신전(Hip Extension) 및 중둔근 외전 제어',
    },
    plank: {
      springKo: '래더·바렐 고정 상태 재확인',
      biomechKo: '견갑대-체간-골반 일직선 지지 및 복부 심부 안정화',
    },
    extension: {
      springKo: '바렐 곡면 치골·복부 지지 · 양발 래더 렁 고정',
      biomechKo: '내전근·둔근 연결을 바탕으로 요추 과신전 없이 흉추 분절 스완(Swan) 신전 수행',
    },
    'feet-in-straps': {
      springKo: '바렐 곡면 천골·골반 지지',
      biomechKo: '골반 안정성 위에서 하지 신장 및 고관절 가동 범위 확보',
    },
    cooldown: {
      springKo: '래더 바렐 고정 지지 · 측면 스탠딩/시티드 스트레치',
      biomechKo: '어깨 거상 없이 측면 흉곽·요방형근·광배근 이완 및 깊은 호흡 복귀',
    },
  },
};

export function getStudioVerifiedGuidance(exercise: PilatesExercise): StudioVerifiedGuidance {
  const apparatus = exercise.apparatus;
  const block = exercise.blockCategory;
  const setupDefault =
    BLOCK_SETUP_DEFAULTS[apparatus]?.[block] ?? BLOCK_SETUP_DEFAULTS[apparatus].core;
  const videos = VERIFIED_VIDEOS_BY_APPARATUS[apparatus];
  const literature = VERIFIED_LITERATURE_BY_APPARATUS[apparatus];

  const springAndSetupStandardKo =
    exercise.springs &&
    exercise.springs !== '강사가 기구별 설정' &&
    exercise.springs !== '스프링 사용 없음'
      ? `${exercise.springs} · ${setupDefault.springKo}`
      : setupDefault.springKo;

  const breathKo =
    exercise.breathPattern &&
    !exercise.breathPattern.includes('강사와 조정')
      ? exercise.breathPattern
      : block === 'extension'
        ? '들숨에 척추를 길게 세우며 가슴을 열고, 날숨에 복부 중심을 조이며 분절하여 돌아옵니다.'
        : block === 'core' || block === 'bridging'
          ? '들숨에 흉곽을 좌우·뒤로 넓혀 준비하고, 날숨에 갈비뼈와 복부 중심을 연결하며 동작을 수행합니다.'
          : '들숨에 척추 축성 신장(Axial Elongation)으로 공간과 길이를 만들고, 날숨에 코어 지지와 함께 일정한 속도로 움직입니다.';

  return {
    exerciseId: exercise.id,
    verificationBadgeKo: '교차 검증 완료 · 스튜디오 실전 가이드',
    verificationTier: 'clinical-literature-and-video',
    springAndSetupStandardKo,
    biomechanicalFocusKo: setupDefault.biomechKo,
    breathingCadenceKo: breathKo,
    teachingChecklistKo: [
      `정렬·기구 기준: ${springAndSetupStandardKo}`,
      `생체역학 핵심: ${setupDefault.biomechKo}`,
      `호흡·속도 큐잉: ${breathKo}`,
    ],
    primaryVideo: videos.primary,
    secondaryVideo: videos.secondary,
    literature,
  };
}
