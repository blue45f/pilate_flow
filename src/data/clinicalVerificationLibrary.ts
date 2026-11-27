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

export interface ExerciseNoteRecordedFields {
  springsKo: string | null;
  breathPatternKo: string | null;
  hasSpecificSprings: boolean;
  hasSpecificBreath: boolean;
}

export interface StudioVerifiedGuidance {
  exerciseId: string;
  verificationBadgeKo: string;
  verificationTier:
    | 'apparatus-block-template'
    | 'clinical-literature-and-video'
    | 'curriculum-and-video';
  scopeNoticeKo: string;
  referenceLinksNoticeKo: string;
  exerciseNote: ExerciseNoteRecordedFields;
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
    titleKo: '필라테스 운동의 원리와 재활 분야의 활용',
    citation: 'Sports Health, 2011 · PMID 23016028',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3445206/',
    clinicalSummaryKo:
      '필라테스가 어떤 운동인지, 재활 분야에서는 어떻게 활용해 왔는지 살펴보는 문헌이에요.',
  },
  reformer: {
    id: 'balanced-body-reformer-manual',
    titleKo: '리포머 입문 수업 교재',
    citation: 'Positive Action Pilates · Reformer Level 1 Student Manual, 2024',
    url: 'https://positiveactionpilates.com.au/wp-content/uploads/2024/11/2024-Reformer-Level-1-Student-Manual.pdf',
    clinicalSummaryKo:
      '리포머를 다루는 입문 과정의 교재예요. 사용하는 기구의 바와 스프링은 해당 제조사의 안내를 함께 확인하세요.',
  },
  cadillac: {
    id: 'polestar-cadillac-rehab',
    titleKo: '허리 통증 관련 임상 필라테스 문헌 고찰',
    citation: 'Biology, 2021 · PMID 34827088',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8615180/',
    clinicalSummaryKo:
      '만성 허리 통증이 있는 사람에게 운동을 개별적으로 적용하는 방법을 검토한 문헌이에요. 캐딜락의 스프링 색상이나 강도는 사용하는 기구의 안내를 확인하세요.',
  },
  chair: {
    id: 'basi-chair-biomechanics',
    titleKo: '어깨를 움직일 때 날개뼈를 받쳐 주는 운동에 관한 연구',
    citation: 'Medical Journal of the Islamic Republic of Iran, 2014 · PMID 25664288',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4301231/',
    clinicalSummaryKo:
      '어깨 충돌 증후군이 있는 참가자를 대상으로 운동치료와 물리치료를 비교한 연구예요. 체어 수업에서는 어깨 주변 움직임을 이해하는 배경자료로 읽을 수 있어요.',
  },
  barrel: {
    id: 'ladder-barrel-lumbo-pelvic',
    titleKo: '필라테스 수업과 유연성·골반 움직임 연구',
    citation: 'Asian Journal of Sports Medicine, 2011 · PMID 22375213',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3289190/',
    clinicalSummaryKo:
      '건강한 성인 40명을 대상으로 8주간 매트 필라테스를 한 그룹과 비교 그룹의 유연성, 허리와 골반의 움직임 조절을 살펴본 연구예요.',
  },
};

export const VERIFIED_VIDEOS_BY_APPARATUS: Record<
  ApparatusType,
  { primary: ClinicalVideoReference; secondary: ClinicalVideoReference }
> = {
  mat: {
    primary: {
      titleKo: '클래식 매트 34개 동작 이어 보기',
      channelName: 'Idit Spiro Pilates',
      url: 'https://www.youtube.com/watch?v=qkdhm5r8NoQ',
      keyTakeawayKo: '매트 동작 34개를 원래 순서대로 이어 가는 수업이에요. 익숙한 동작이 다음 자세로 어떻게 이어지는지 살펴보세요.',
    },
    secondary: {
      titleKo: '클래식 매트 동작을 잇는 수업',
      channelName: 'Quiet Bodies - Pilates with Kala Loek (Fletcher)',
      url: 'https://www.youtube.com/watch?v=H3D_RnGYYss',
      keyTakeawayKo: '여러 동작이 이어지는 수업이에요. 확인하고 싶은 동작의 이름과 시작 자세를 먼저 찾아보세요.',
    },
  },
  reformer: {
    primary: {
      titleKo: '리포머에서 풋바 밀고 돌아오기',
      channelName: 'Pilates Anytime',
      url: 'https://www.youtube.com/watch?v=QDBzjlhKsco',
      keyTakeawayKo: '발을 바에 대고 캐리지를 밀 때와 다시 돌아올 때, 무릎이 발끝과 같은 방향을 향하는지 봐요.',
    },
    secondary: {
      titleKo: '리포머에서 하는 헌드레드',
      channelName: 'Pilates Anytime',
      url: 'https://www.youtube.com/watch?v=vx4DdBWY6kQ',
      keyTakeawayKo: '손에 스트랩을 쥐고 팔을 작게 움직이는 동작이에요. 팔의 리듬과 숨을 이어 가는 방법을 들어보세요.',
    },
  },
  cadillac: {
    primary: {
      titleKo: '캐딜락·타워 스프링의 종류와 쓰임',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=R00X3brvFl0',
      keyTakeawayKo: '기구에 달린 스프링을 언제 쓰는지 소개해요. 내 기구의 연결 위치와 장력은 스튜디오에서 확인하세요.',
    },
    secondary: {
      titleKo: '캐딜락에서 푸시스루 바로 하는 타워',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=tV3l-LkhHtc',
      keyTakeawayKo: '타워 동작에서 발로 바를 받친 채 몸통을 움직이는 방법을 설명해요. 발을 올리는 준비 자세부터 들어보세요.',
    },
  },
  chair: {
    primary: {
      titleKo: '체어 스완을 단계별로 익히기',
      channelName: 'Online Pilates Classes by Lesley Logan',
      url: 'https://www.youtube.com/watch?v=deQhPLrHz2k',
      keyTakeawayKo: '체어에서 할 수 있는 여러 스완 동작을 비교해요. 어떤 자세부터 연습하는지 살펴보세요.',
    },
    secondary: {
      titleKo: '체어에서 하는 호스백',
      channelName: 'Authentic Pilates Learning Center',
      url: 'https://www.youtube.com/watch?v=-Scg195T8Yw',
      keyTakeawayKo: '좌석에 앉을 때 몸의 위치를 어떻게 잡는지, 강사가 곁에서 어떻게 돕는지 설명해요.',
    },
  },
  barrel: {
    primary: {
      titleKo: '래더 바렐에서 하는 호스백',
      channelName: 'Balanced Body',
      url: 'https://www.youtube.com/watch?v=k-dcF4uF5E8',
      keyTakeawayKo: '바렐에 걸터앉은 자세에서 다리로 몸을 받치는 동작이에요. 골반이 들릴 때 다리의 위치를 살펴보세요.',
    },
    secondary: {
      titleKo: '래더 바렐에서 옆으로 상체 들기',
      channelName: 'Posture Pilates',
      url: 'https://www.youtube.com/watch?v=5rt5LLYiZ3U',
      keyTakeawayKo: '초급부터 고급까지 여러 자세를 다뤄요. 옆으로 몸을 움직이기 전에 다리를 사다리 어디에 두는지 살펴보세요.',
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

function resolveBlockBreathingTemplate(block: ClassBlockCategory): string {
  if (block === 'extension') {
    return '들숨에 척추를 길게 세우며 가슴을 열고, 날숨에 복부 중심을 조이며 분절하여 돌아옵니다.';
  }
  if (block === 'core' || block === 'bridging') {
    return '들숨에 흉곽을 좌우·뒤로 넓혀 준비하고, 날숨에 갈비뼈와 복부 중심을 연결하며 동작을 수행합니다.';
  }
  return '들숨에 척추 축성 신장(Axial Elongation)으로 공간과 길이를 만들고, 날숨에 코어 지지와 함께 일정한 속도로 움직입니다.';
}

/**
 * Apparatus/block reference template, kept strictly separate from the exercise's
 * own recorded note fields and personal instructor review status.
 */
export function getStudioVerifiedGuidance(exercise: PilatesExercise): StudioVerifiedGuidance {
  const apparatus = exercise.apparatus;
  const block = exercise.blockCategory;
  const setupDefault =
    BLOCK_SETUP_DEFAULTS[apparatus]?.[block] ?? BLOCK_SETUP_DEFAULTS[apparatus].core;
  const videos = VERIFIED_VIDEOS_BY_APPARATUS[apparatus];
  const literature = VERIFIED_LITERATURE_BY_APPARATUS[apparatus];

  const rawSprings = exercise.springs.trim();
  const rawBreath = exercise.breathPattern.trim();
  const hasSpecificSprings = Boolean(
    rawSprings && rawSprings !== '강사가 기구별 설정' && rawSprings !== '스프링 사용 없음',
  );
  const hasSpecificBreath = Boolean(rawBreath && !rawBreath.includes('강사와 조정'));

  const templateSpringKo = setupDefault.springKo;
  const templateBreathKo = resolveBlockBreathingTemplate(block);

  return {
    exerciseId: exercise.id,
    verificationBadgeKo: '기구·구간 공통 참고 · 원문 확인 필요',
    verificationTier: 'apparatus-block-template',
    scopeNoticeKo:
      '기구·구간 분류에 따른 공통 참고 템플릿입니다. 개별 동작의 원문 확인·임상 유효성·개인 검토 완료를 뜻하지 않습니다.',
    referenceLinksNoticeKo:
      '아래 유튜브·문헌은 이 동작 전용 검수 자료가 아니라 해당 기구의 일반 원리 참고용 외부 링크입니다. 원문을 직접 확인해 주세요.',
    exerciseNote: {
      springsKo: rawSprings || null,
      breathPatternKo: rawBreath || null,
      hasSpecificSprings,
      hasSpecificBreath,
    },
    springAndSetupStandardKo: templateSpringKo,
    biomechanicalFocusKo: setupDefault.biomechKo,
    breathingCadenceKo: templateBreathKo,
    teachingChecklistKo: [
      `기구·구간 공통 세팅 참고: ${templateSpringKo}`,
      `기구·구간 정렬 참고: ${setupDefault.biomechKo}`,
      `구간 공통 호흡 참고: ${templateBreathKo}`,
    ],
    primaryVideo: videos.primary,
    secondaryVideo: videos.secondary,
    literature,
  };
}
