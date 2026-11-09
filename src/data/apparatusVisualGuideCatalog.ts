import type { ApparatusType } from '../types/pilates';
import {
  VERIFIED_LITERATURE_BY_APPARATUS,
  VERIFIED_VIDEOS_BY_APPARATUS,
} from './clinicalVerificationLibrary';

export interface ApparatusAnatomyPart {
  readonly pinNumber: 1 | 2 | 3 | 4;
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly roleKo: string;
  readonly setupTipKo: string;
  /** SVG coordinates on a 240x136 blueprint canvas */
  readonly pinX: number;
  readonly pinY: number;
}

export interface ApparatusSpringSpec {
  readonly id: string;
  readonly colorNameKo: string;
  readonly colorHex: string;
  readonly tensionLabelKo: string;
  readonly usageKo: string;
}

export interface ApparatusBodyFitTip {
  readonly badgeKo: string;
  readonly adjustmentKo: string;
}

export interface ApparatusFreshIdeaLens {
  readonly lensId: 'contrarian' | 'story' | 'evidence' | 'playbook' | 'missed';
  readonly badgeKo: string;
  readonly headlineKo: string;
  readonly pitchKo: string;
  readonly suggestedTitleKo: string;
  readonly suggestedSubtitleKo: string;
  readonly sourceLabelKo: string;
  readonly sourceUrl: string;
}

export interface PropQuickGuide {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly summaryKo: string;
  readonly bestApparatusKo: string;
  readonly cueTipKo: string;
}

export interface ApparatusVisualGuideEntry {
  readonly id: string;
  readonly family: ApparatusType;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly oneLineSummaryKo: string;
  readonly studioRoleBadgeKo: string;
  readonly resistancePrincipleKo: string;
  readonly anatomyParts: readonly [
    ApparatusAnatomyPart,
    ApparatusAnatomyPart,
    ApparatusAnatomyPart,
    ApparatusAnatomyPart,
  ];
  readonly springSpecs: readonly ApparatusSpringSpec[];
  readonly bodyFitTips: readonly ApparatusBodyFitTip[];
  readonly freshIdeas: readonly [
    ApparatusFreshIdeaLens,
    ApparatusFreshIdeaLens,
    ApparatusFreshIdeaLens,
    ApparatusFreshIdeaLens,
    ApparatusFreshIdeaLens,
  ];
}

export const APPARATUS_VISUAL_GUIDE_CATALOG: readonly ApparatusVisualGuideEntry[] = [
  {
    id: 'reformer',
    family: 'reformer',
    nameKo: '리포머',
    nameEn: 'Universal Reformer',
    oneLineSummaryKo:
      '움직이는 캐리지(Carriage)와 스프링 장력을 이용해 저항 보조와 코어 불안정성 제어를 동시에 훈련하는 핵심 기구',
    studioRoleBadgeKo: '전신 정렬 · 스프링 가변 저항 · 원심성 조절',
    resistancePrincipleKo:
      '하지 프레스(풋워크)에서는 스프링이 무거울수록 저항이 커지지만, 코어·니스트레치·롱스트레치에서는 스프링이 가벼울수록 코어가 감당해야 할 안정화 요구량이 커집니다.',
    anatomyParts: [
      {
        pinNumber: 1,
        id: 'footbar',
        nameKo: '풋바 (Footbar)',
        nameEn: 'Adjustable Footbar',
        roleKo: '발·손을 지지해 닫힌 사슬(Closed-Chain) 밀기·당기기 기준점을 만듭니다.',
        setupTipKo: '고관절 굴곡 약 90°가 되도록 키에 맞춰 2~3단 높이로 조절하세요.',
        pinX: 198,
        pinY: 54,
      },
      {
        pinNumber: 2,
        id: 'carriage',
        nameKo: '캐리지 & 숄더블록 (Carriage)',
        nameEn: 'Sliding Carriage & Shoulder Blocks',
        roleKo: '레일 위를 활주하며 앙와위·장좌위·네발기기·입위 지지면을 제공합니다.',
        setupTipKo: '어깨가 숄더블록에 으쓱하게 눌리지 않도록 주먹 반 개 간격을 띄우세요.',
        pinX: 98,
        pinY: 70,
      },
      {
        pinNumber: 3,
        id: 'springs',
        nameKo: '컬러 코딩 스프링 & 기어바 (Springs)',
        nameEn: 'Color-Coded Springs & Gearbar',
        roleKo: 'Red(강)·Blue(중)·Yellow(약) 조합으로 보조력과 저항력을 정밀 조절합니다.',
        setupTipKo: '신장 170cm 이상 회원은 기어바/스토퍼를 1단 뒤로 물려 관절 압박을 줄이세요.',
        pinX: 162,
        pinY: 82,
      },
      {
        pinNumber: 4,
        id: 'risers-ropes',
        nameKo: '라이저 & 더블 루프 스트랩 (Ropes)',
        nameEn: 'Risers, Pulleys & Double Loops',
        roleKo: '상·하지 열린 사슬(Open-Chain) 궤적과 견갑·고관절 대칭 협응을 유도합니다.',
        setupTipKo: '짧은 루프는 손·상체, 긴 루프는 발·하체 레그서클에 연결해 길이를 맞추세요.',
        pinX: 34,
        pinY: 48,
      },
    ],
    springSpecs: [
      {
        id: 'ref-red',
        colorNameKo: 'Red (강 · Heavy)',
        colorHex: '#C84B31',
        tensionLabelKo: '1.0 R (표준 1개 기준)',
        usageKo: '풋워크(2~3 Red), 하체 스트랩(1~2 Red), 롱박스 풀스트랩',
      },
      {
        id: 'ref-blue',
        colorNameKo: 'Blue (중 · Medium)',
        colorHex: '#2D6A9F',
        tensionLabelKo: '0.5 R (중간 장력)',
        usageKo: '헌드레드(1 Red + 1 Blue), 암워크, 니스트레치, 스쿠터',
      },
      {
        id: 'ref-yellow',
        colorNameKo: 'Yellow (약 · Light)',
        colorHex: '#D4A017',
        tensionLabelKo: '0.25 R (가벼운 장력)',
        usageKo: '상체 후면 삼각근·로테이터 커프, 코어 심화(롱스트레치·업스트레치)',
      },
    ],
    bodyFitTips: [
      {
        badgeKo: '키 170cm+ 장신 체형',
        adjustmentKo: '기어바(Gearbar) 1~2단 후퇴 · 풋워크 시 고관절 과굴곡 방지',
      },
      {
        badgeKo: '경추 긴장 · 거북목',
        adjustmentKo:
          '앙와위 풋워크·스트랩 시 헤드레스트 1~2단 상승 (단, 브릿지·롤오버 시 평평하게 하강)',
      },
      {
        badgeKo: '손목 민감 · 임산부',
        adjustmentKo:
          '네발기기·플랭크 시 풋바에 패드 추가 또는 롱박스 위 전완 지지(Forearm Support)로 변경',
      },
    ],
    freshIdeas: [
      {
        lensId: 'contrarian',
        badgeKo: '🔥 역발상 코칭',
        headlineKo: '스프링을 가볍게 걸수록 쉬워진다? 코어 동작에선 정반대입니다',
        pitchKo:
          '회원들은 노란색·파란색 스프링을 걸면 운동이 쉬워진다고 생각하지만, 플랭크·니스트레치 계열에서는 스프링 보조력이 줄어 복횡근이 캐리지를 직접 붙잡아야 합니다.',
        suggestedTitleKo: '리포머 가벼운 스프링의 역설 · 심부 코어 제어',
        suggestedSubtitleKo: '1 Blue·1 Yellow 저장력에서 흔들림 없이 캐리지 멈추기',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.reformer.citation,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.reformer.url,
      },
      {
        lensId: 'story',
        badgeKo: '📖 현장 공감 훅',
        headlineKo: '“선생님, 밀 때는 괜찮은데 돌아올 때 허리가 떠요”',
        pitchKo:
          '캐리지를 밀어내는 구심성 구간에만 집중하던 회원이 스토퍼에 쿵 부딪히지 않고 3초 동안 들어오는 원심성 조절을 배운 뒤 요추 불편감이 사라진 전환점 스토리입니다.',
        suggestedTitleKo: '리포머 무소음 리턴(Silent Return) 원심성 클래스',
        suggestedSubtitleKo: '스토퍼 직전 2cm를 지배하는 3초 원심성 컨트롤',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.reformer.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.reformer.primary.url,
      },
      {
        lensId: 'evidence',
        badgeKo: '📊 임상·역학 근거',
        headlineKo: '닫힌 사슬(Closed-Chain) 스프링 저항이 슬관절·고관절 정렬에 주는 이점',
        pitchKo:
          '리포머 스프링 저항 운동은 지면 반발력 부담을 낮추면서 대퇴사두근·둔근·복횡근의 동시 수축(Co-contraction)을 유도해 하지 정렬 개선에 유의미한 효과를 보입니다.',
        suggestedTitleKo: '리포머 하지 정렬 & 닫힌 사슬 바이오메카닉스',
        suggestedSubtitleKo: '고관절-슬관절-제2족지 축 정렬 집중 시퀀스',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.reformer.titleKo,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.reformer.url,
      },
      {
        lensId: 'playbook',
        badgeKo: '✅ 3단계 실전 플레이북',
        headlineKo: '수업 중 스프링 교체를 5초 안에 끝내는 무중단 리포머 동선 공식',
        pitchKo:
          '1) 풋워크(3R+1B) → 2) 내리는 길에 Red 2개만 빼서 바로 헌드레드·레그서클(1R+1B) → 3) 앉으며 Red 1개만 빼서 암워크·척추분절(1B)로 이어가는 3단 세팅 공식입니다.',
        suggestedTitleKo: '5초 스프링 전환 · 원플로우 리포머 50분',
        suggestedSubtitleKo: '풋워크(3R1B) → 스트랩(1R1B) → 코어·상체(1B) 무중단 연결',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.reformer.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.reformer.secondary.url,
      },
      {
        lensId: 'missed',
        badgeKo: '🎯 놓치기 쉬운 디테일',
        headlineKo: '양쪽 스트랩 로프 길이 1cm 차이가 만드는 골반 회전 비대칭',
        pitchKo:
          '회원 체간 비대칭이라고 단정하기 전에 라이저 도르래 높이와 양쪽 스트랩 루프 매듭 길이가 정확히 대칭인지 먼저 점검하면 불필요한 보상 작용의 절반이 즉시 해결됩니다.',
        suggestedTitleKo: '리포머 좌우 대칭 캘리브레이션 & 골반 중립',
        suggestedSubtitleKo: '양측 스트랩 장력 대칭 인지와 좌골 균등 지지',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.reformer.citation,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.reformer.url,
      },
    ],
  },
  {
    id: 'mat',
    family: 'mat',
    nameKo: '매트',
    nameEn: 'Classical & Studio Mat',
    oneLineSummaryKo:
      '기구의 스프링 보조 없이 오직 자신의 체중과 중력, 심부 코어(Powerhouse)의 힘만으로 척추 분절과 중심 안정성을 완성하는 필라테스의 뿌리',
    studioRoleBadgeKo: '중력 저항 · 척추 분절 · 호흡-파워하우스 직결',
    resistancePrincipleKo:
      '스프링 가이드가 없기 때문에 팔·다리의 지렛대 길이(Lever Length)와 바닥에서 띄우는 각도가 곧 저항의 크기를 결정합니다.',
    anatomyParts: [
      {
        pinNumber: 1,
        id: 'spine-zone',
        nameKo: '척추 임프린트·중립 존 (Spine Zone)',
        nameEn: 'Central Spine Articulation Zone',
        roleKo: '후두골·흉추·천골이 닿아 척추 분절(Roll Up/Roll Over)의 기준면이 됩니다.',
        setupTipKo: '고밀도 10~15mm 필라테스 매트를 사용해 극돌기 압박 없이 분절 감각을 살리세요.',
        pinX: 112,
        pinY: 74,
      },
      {
        pinNumber: 2,
        id: 'magic-circle',
        nameKo: '매직 서클 · 써클링 (Magic Circle)',
        nameEn: 'Pilates Resistance Ring',
        roleKo: '내전근·흉근·심부 코어의 등척성 수축(Isometric) 피드백을 즉시 깨웁니다.',
        setupTipKo: '손목이나 무릎 관절이 아닌 손바닥 뿌리·허벅지 안쪽 근육에 패드를 대세요.',
        pinX: 162,
        pinY: 54,
      },
      {
        pinNumber: 3,
        id: 'head-pad',
        nameKo: '헤드·경추 서포트 존 (Head Zone)',
        nameEn: 'Cervical Alignment Zone',
        roleKo: '턱이 들리거나 목이 과긴장되지 않도록 시선과 경추 곡선을 정렬합니다.',
        setupTipKo: '누웠을 때 턱이 천장을 향하면 얇은 타월을 후두골 아래에만 받쳐 주세요.',
        pinX: 54,
        pinY: 66,
      },
      {
        pinNumber: 4,
        id: 'lever-zone',
        nameKo: '하지 지렛대 확장 존 (Leg Lever Zone)',
        nameEn: 'Distal Lever Control Zone',
        roleKo: '두 다리를 뻗는 각도(90°→60°→45°)로 복부 부하를 단계별로 조절합니다.',
        setupTipKo: '허리가 뜨면 즉시 다리 각도를 천장 쪽(75~90°)으로 높이거나 테이블탑으로 접으세요.',
        pinX: 194,
        pinY: 78,
      },
    ],
    springSpecs: [
      {
        id: 'mat-lever-short',
        colorNameKo: '기초 지렛대 (Tabletop · 90°)',
        colorHex: '#4E8774',
        tensionLabelKo: '중력 부하 Low',
        usageKo: '무릎 굴곡(테이블탑) · 경추 지지 · 임프린트 안정화',
      },
      {
        id: 'mat-lever-mid',
        colorNameKo: '중급 지렛대 (Diagonal · 60°)',
        colorHex: '#2D6A9F',
        tensionLabelKo: '중력 부하 Medium',
        usageKo: '헌드레드 60° 신전, 싱글/더블 레그 스트레치, 스완 프렙',
      },
      {
        id: 'mat-lever-long',
        colorNameKo: '심화 지렛대 (Low Lever · 45°)',
        colorHex: '#C84B31',
        tensionLabelKo: '중력 부하 High',
        usageKo: '롤오버, 티저(Teaser), 시저스, 컨트롤 밸런스',
      },
    ],
    bodyFitTips: [
      {
        badgeKo: '요추 경직 · 롤업 불가',
        adjustmentKo: '무릎 뒤에 미니볼을 끼우거나 롱밴드를 발바닥에 걸어 C-커브 분절 구간을 보조',
      },
      {
        badgeKo: '꼬리뼈·극돌기 통증',
        adjustmentKo: '롤링 라이크 어 볼(Rolling Like a Ball) 수행 시 매트 두 겹 또는 스파인 코렉터 대체',
      },
      {
        badgeKo: '고관절 굴곡근 과긴장',
        adjustmentKo: '양발 사이에 매직 서클이나 미니볼을 살짝 조여 내전근-골반저근 연결을 먼저 활성화',
      },
    ],
    freshIdeas: [
      {
        lensId: 'contrarian',
        badgeKo: '🔥 역발상 코칭',
        headlineKo: '매트가 가장 기초라고요? 스프링 보조가 없는 매트가 진짜 실력 시험대입니다',
        pitchKo:
          '기구 필라테스에 익숙한 회원일수록 스프링이 도와주던 롤업과 티저를 맨몸 매트에서 할 때 가장 큰 코어 각성을 경험합니다.',
        suggestedTitleKo: '스프링 없이 마주하는 진짜 코어 · 클래식 매트 플로우',
        suggestedSubtitleKo: '기구 보조를 덜어내고 중력과 호흡만으로 완성하는 척추 분절',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.mat.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.mat.primary.url,
      },
      {
        lensId: 'story',
        badgeKo: '📖 현장 공감 훅',
        headlineKo: '헌드레드에서 목만 아프던 회원이 ‘견갑 하강’ 하나로 복부를 찾은 순간',
        pitchKo:
          '고개를 들 때마다 승모근만 잡던 회원에게 시선을 배꼽이 아닌 무릎 사이로 두고 하부 늑골을 먼저 미끄러뜨리게 하자 처음으로 아랫배 수축을 느낀 스토리입니다.',
        suggestedTitleKo: '목이 편안한 매트 코어 · 흉곽 슬라이딩과 파워하우스',
        suggestedSubtitleKo: '경추 과긴장 없이 상복부·복횡근을 연결하는 체스트 리프트 공식',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.mat.citation,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.mat.url,
      },
      {
        lensId: 'evidence',
        badgeKo: '📊 임상·역학 근거',
        headlineKo: '흉곽 측면 호흡(Lateral Breathing)이 복횡근·다열근 두께를 바꾸는 이유',
        pitchKo:
          '초음파 영상 기반 임상 연구에서 일반 호흡 대비 필라테스 측면 호흡을 병행할 때 복횡근(TrA)과 내복사근(IO)의 수축 활성도가 유의하게 증가함이 입증되었습니다.',
        suggestedTitleKo: '호흡이 만드는 천연 코르셋 · 심부 안정화 매트',
        suggestedSubtitleKo: '측면 흉곽 확장 호흡과 복횡근 동시 수축 트레이닝',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.mat.titleKo,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.mat.url,
      },
      {
        lensId: 'playbook',
        badgeKo: '✅ 3단계 실전 플레이북',
        headlineKo: '소도구 1개(매직 서클)로 기구 못지않은 저항감을 만드는 3단계 매트 루틴',
        pitchKo:
          '1) 허벅지 안쪽 링 조이기(내전근-골반저 연결) → 2) 양손 링 프레스 롤업(전거근-복직근 연결) → 3) 발목 링 끼고 티저(중심 통합)로 이어지는 고밀도 매트 공식입니다.',
        suggestedTitleKo: '매직 서클 원프롭(One-Prop) 시그니처 매트',
        suggestedSubtitleKo: '내전근·전거근·복횡근을 하나로 묶는 등척성 링 시퀀스',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.mat.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.mat.secondary.url,
      },
      {
        lensId: 'missed',
        badgeKo: '🎯 놓치기 쉬운 디테일',
        headlineKo: '동작과 동작 사이의 ‘전환(Transition)’이 매트 수업의 진짜 하이라이트입니다',
        pitchKo:
          '동작이 끝날 때마다 털썩 누워 휴식하는 대신, 한 동작의 피니시 자세를 다음 동작의 시작 자세로 물 흐르듯 연결할 때 심박수와 코어 텐션이 끊기지 않습니다.',
        suggestedTitleKo: '끊기지 않는 호흡 · 논스톱 매트 트랜지션',
        suggestedSubtitleKo: '시작과 끝이 하나로 이어지는 조셉 필라테스 오리지널 플로우',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.mat.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.mat.primary.url,
      },
    ],
  },
  {
    id: 'chair',
    family: 'chair',
    nameKo: '체어',
    nameEn: 'Wunda Chair / Stability Chair',
    oneLineSummaryKo:
      '좁은 지지면(Seat)과 강력한 페달 스프링을 통해 좌우 불균형 교정, 하체 파워, 스탠딩 밸런스를 극대화하는 고밀도 기구',
    studioRoleBadgeKo: '좁은 기저면 · 단측 밸런스 · 기능적 하체·코어 파워',
    resistancePrincipleKo:
      '지지면이 좁고 캐리지처럼 몸 전체를 받쳐주지 않기 때문에, 페달이 올라오는 순간의 스프링 반동을 코어의 원심성 수축으로 브레이크 거는 능력이 핵심입니다.',
    anatomyParts: [
      {
        pinNumber: 1,
        id: 'seat',
        nameKo: '시트 패드 (Padded Seat)',
        nameEn: 'Compact Padded Top Seat',
        roleKo: '좌위·복와위·측와위·손 짚기 등 좁은 기저면 위에서 중심 제어를 요구합니다.',
        setupTipKo: '복와위(Swan) 시 골반 ASIS가 시트 앞모서리에서 2~3cm 안쪽에 오도록 맞추세요.',
        pinX: 122,
        pinY: 44,
      },
      {
        pinNumber: 2,
        id: 'pedal',
        nameKo: '분할·통합 페달 (Split/Single Pedal)',
        nameEn: 'Spring-Loaded Foot/Hand Pedal',
        roleKo: '단일 페달로 양측 통합 힘을 쓰거나 분할(Split)하여 좌우 회전·교차 움직임을 만듭니다.',
        setupTipKo: '스플릿 페달로 변경 시 양손/양발의 좌우 비대칭 힘을 즉시 진단할 수 있습니다.',
        pinX: 74,
        pinY: 84,
      },
      {
        pinNumber: 3,
        id: 'cactus-springs',
        nameKo: '선인장 걸이 & 고장력 스프링 (Cactus)',
        nameEn: 'Cactus Tree & Heavy/Light Springs',
        roleKo: '걸이 높이(1~4단)와 스프링 위치로 지렛대 각도별 장력을 세밀하게 바꿉니다.',
        setupTipKo: '위쪽 칸에 걸수록 스프링 초기 텐션이 강해집니다. 전환 전 핀 체결을 꼭 확인하세요.',
        pinX: 118,
        pinY: 78,
      },
      {
        pinNumber: 4,
        id: 'handles',
        nameKo: '높이 조절 핸들 (Side Handles)',
        nameEn: 'Removable Assist Handles',
        roleKo: '스탠딩 런지·프레스업·티저에서 상체 지지와 안전 가이드를 제공합니다.',
        setupTipKo: '초보자 고잉업 프론트(Going Up Front) 시 핸들을 가장 높은 단에 고정하세요.',
        pinX: 158,
        pinY: 28,
      },
    ],
    springSpecs: [
      {
        id: 'chair-heavy-2',
        colorNameKo: '2 Heavy (상·중단 · 고장력)',
        colorHex: '#C84B31',
        tensionLabelKo: 'High Support / Heavy Load',
        usageKo: '체어 풋워크, 고잉업 프론트(체중 리프트 보조), 레그 펌프',
      },
      {
        id: 'chair-med',
        colorNameKo: '1 Heavy + 1 Light (중간 장력)',
        colorHex: '#2D6A9F',
        tensionLabelKo: 'Balanced Control',
        usageKo: '파이크(Pike), 호스백(Horseback), 풀업 프렙',
      },
      {
        id: 'chair-light',
        colorNameKo: '1 Heavy 또는 2 Light (저장력)',
        colorHex: '#D4A017',
        tensionLabelKo: 'Mobility / Unilateral',
        usageKo: '스완(Swan), 머메이드(Mermaid), 원암 푸시, 스플릿 페달 로테이션',
      },
    ],
    bodyFitTips: [
      {
        badgeKo: '스탠딩 밸런스 불안정',
        adjustmentKo: '양측 핸들을 장착하고 시선을 정면 눈높이 고정점에 두어 전정기관 흔들림 최소화',
      },
      {
        badgeKo: '어깨 으쓱 · 손목 압박',
        adjustmentKo:
          '페달을 누를 때 손바닥 전체가 아닌 손목 수직선 아래 손바닥 뒤꿈치(Heel of Hand)로 지지',
      },
      {
        badgeKo: '키가 작은 체형',
        adjustmentKo: '체어 앞 바닥에 논슬립 박스나 패드를 놓아 시트-바닥 간 단차를 안전하게 조절',
      },
    ],
    freshIdeas: [
      {
        lensId: 'contrarian',
        badgeKo: '🔥 역발상 코칭',
        headlineKo:
          '체어 파이크(Pike)는 팔로 밀어 올리는 동작이 아니라 배꼽으로 페달을 끌어올리는 동작입니다',
        pitchKo:
          '어깨와 손목으로 버티려 하면 페달이 꿈쩍도 하지 않지만, 날숨에 복횡근으로 골반을 천장 쪽으로 말아 올리면 손목은 가벼워지고 페달이 스스로 따라 올라옵니다.',
        suggestedTitleKo: '손목이 가벼워지는 체어 파이크 & 풀업 마스터',
        suggestedSubtitleKo: '상체 지지가 아닌 골반 리프트로 완성하는 체어 코어',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.chair.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.chair.secondary.url,
      },
      {
        lensId: 'story',
        badgeKo: '📖 현장 공감 훅',
        headlineKo: '계단 오를 때 무릎이 시큰거리던 회원이 체어 스텝업으로 찾은 둔근의 힘',
        pitchKo:
          '무릎이 발끝 앞으로 쏟아지던 습관을 체어 핸들 지지 하에 뒤꿈치-중둔근 수직 리프트로 교정한 뒤 일상 계단 보행이 편안해진 실전 변화 스토리입니다.',
        suggestedTitleKo: '무릎 대신 둔근으로 오르는 체어 기능성 하체',
        suggestedSubtitleKo: '고관절-무릎-두 번째 발가락 정렬로 완성하는 스텝업',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.chair.citation,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.chair.url,
      },
      {
        lensId: 'evidence',
        badgeKo: '📊 임상·역학 근거',
        headlineKo: '좁은 기저면(Base of Support)과 분할 페달이 고유수용성 감각을 깨우는 원리',
        pitchKo:
          '체어의 좁은 시트와 독립 페달은 양측 하지·체간의 미세한 힘 차이를 즉각 드러내어 중둔근과 다열근의 반사적 안정화(Neuromuscular Control)를 촉진합니다.',
        suggestedTitleKo: '좌우 비대칭 밸런스 리셋 · 스플릿 체어 클리닉',
        suggestedSubtitleKo: '단측 페달 제어와 골반 수평 유지 집중 트레이닝',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.chair.titleKo,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.chair.url,
      },
      {
        lensId: 'playbook',
        badgeKo: '✅ 3단계 실전 플레이북',
        headlineKo: '체어 스완(Swan)에서 허리 꺾임 없이 흉추만 시원하게 여는 3단계 큐잉',
        pitchKo:
          '1) 치골을 시트 패드에 부드럽게 밀착 → 2) 페달을 먼저 누르지 말고 전거근으로 겨드랑이를 끌어내리기 → 3) 윗등(T1~T8)부터 순차적으로 아치를 그리며 상승합니다.',
        suggestedTitleKo: '라운드숄더를 펴는 체어 흉추 신전 & 스완 플로우',
        suggestedSubtitleKo: '요추 과신전 없이 전거근·하부승모근으로 여는 상체',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.chair.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.chair.primary.url,
      },
      {
        lensId: 'missed',
        badgeKo: '🎯 놓치기 쉬운 디테일',
        headlineKo:
          '페달이 바닥에 닿는 소리보다 ‘정점(Top)에서 멈추는 1초’가 운동 효과를 좌우합니다',
        pitchKo:
          '스프링 탄성에 끌려 페달이 위까지 튕겨 올라오면 근육 긴장이 풀립니다. 상단 스토퍼에 닿기 직전 1cm에서 멈추고 다시 내려갈 때 하체와 코어의 텐션이 2배로 유지됩니다.',
        suggestedTitleKo: '체어 텐션 홀드(Tension Hold) · 고밀도 하체 & 코어',
        suggestedSubtitleKo: '스프링 반동을 이기는 정점 1초 아이소메트릭 컨트롤',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.chair.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.chair.primary.url,
      },
    ],
  },
  {
    id: 'cadillac',
    family: 'cadillac',
    nameKo: '캐딜락 · 타워',
    nameEn: 'Cadillac Trapeze Table & Tower',
    oneLineSummaryKo:
      '안정적인 테이블 베드와 상·하·측면 다방향 타워 프레임을 결합해 재활 가동성부터 고난도 공중 현수(Suspension)까지 아우르는 3차원 기구',
    studioRoleBadgeKo: '다방향 스프링 벡터 · 척추 분절 보조 · 재활~고난도 현수',
    resistancePrincipleKo:
      '스프링이 걸리는 각도(상단 사선·중단 수평·하단 수직)에 따라 중력을 거스르는 리프트를 도와주거나(보조), 당기는 방향에 정밀한 분절 저항을 제공합니다.',
    anatomyParts: [
      {
        pinNumber: 1,
        id: 'push-through-bar',
        nameKo: '푸시스루바 (Push-Through Bar)',
        nameEn: 'Pivoting Push-Through Bar',
        roleKo:
          '상단 또는 하단 스프링과 연결해 척추 분절(티저·몽키·스완)의 정교한 궤적을 가이드합니다.',
        setupTipKo:
          '하단 스프링(Bottom-Sprung) 사용 시 반드시 상단 안전 스트랩(Safety Strap)을 먼저 체결하세요!',
        pinX: 68,
        pinY: 46,
      },
      {
        pinNumber: 2,
        id: 'roll-down-bar',
        nameKo: '롤다운바 & 타워 스프링 (Roll-Down Bar)',
        nameEn: 'Wooden Roll-Down Bar & Springs',
        roleKo:
          '양측 대칭 스프링으로 척추를 마디마디 굴곡·신전하며 좌우 회전 비대칭을 잡아줍니다.',
        setupTipKo:
          '바가 한쪽으로 기울어지지 않도록 양쪽 어깨너비 그립과 견갑 하강을 먼저 맞추세요.',
        pinX: 168,
        pinY: 44,
      },
      {
        pinNumber: 3,
        id: 'canopy-loops',
        nameKo: '캐노피 프레임 & 퍼지 루프 (Canopy & Fuzzies)',
        nameEn: 'Overhead Canopy & Fuzzy Hanging Loops',
        roleKo: '브릿지·스프레드 이글·행잉 동작에서 상·하지 현수 지지와 견인을 제공합니다.',
        setupTipKo: '손목·발목 걸이 위치가 좌우 동일한지 확인한 뒤 체중을 실으세요.',
        pinX: 118,
        pinY: 24,
      },
      {
        pinNumber: 4,
        id: 'table-bed',
        nameKo: '높은 테이블 베드 & 레그 스프링 (Table Bed)',
        nameEn: 'Elevated Mat Bed & Leg Springs',
        roleKo:
          '바닥까지 내려가지 않아도 앉고 눕기 편하며, 롱 스프링으로 고관절 가동 범위를 넓힙니다.',
        setupTipKo: '레그 스프링 수행 시 골반이 들리지 않도록 천골을 베드에 단단히 고정하세요.',
        pinX: 118,
        pinY: 84,
      },
    ],
    springSpecs: [
      {
        id: 'cad-roll-yellow',
        colorNameKo: '2 Yellow / Blue (롤다운 · 암 스프링)',
        colorHex: '#D4A017',
        tensionLabelKo: 'Articulation & Scapular Control',
        usageKo: '롤다운(Roll Down), 브리딩, 체스트 익스팬션, 스탠딩 암 시리즈',
      },
      {
        id: 'cad-ptb-blue',
        colorNameKo: '1 Blue / Red (푸시스루바 상·하단)',
        colorHex: '#2D6A9F',
        tensionLabelKo: 'Guided Spine Arc',
        usageKo: '푸시스루 시티드, 스완, 티저(상단 1 Blue), 몽키(하단 1 Red + 안전스트랩)',
      },
      {
        id: 'cad-leg-purple',
        colorNameKo: '2 Long Purple / Yellow (레그 스프링)',
        colorHex: '#6C4AB6',
        tensionLabelKo: 'Long-Lever Hip Decompression',
        usageKo: '레그 서클, 프로그, 워킹, 바이시클, 타워 프레스',
      },
    ],
    bodyFitTips: [
      {
        badgeKo: '하단 스프링(Bottom-Sprung) 필수 수칙',
        adjustmentKo:
          '푸시스루바에 하단 스프링 체결 시 반드시 상단 안전 스트랩 연결 및 바 아래에 얼굴 두지 않기',
      },
      {
        badgeKo: '뻣뻣한 흉추 · 일자허리',
        adjustmentKo:
          '롤다운바 스프링을 1단 높은 위치에 걸어 내려갈 때의 원심성 분절 보조력을 높여주기',
      },
      {
        badgeKo: '고관절 집히는 느낌(Impingement)',
        adjustmentKo:
          '긴 레그 스프링(Long Leg Springs)의 견인(Traction) 장력을 활용해 대퇴골두 공간을 열어주며 서클 수행',
      },
    ],
    freshIdeas: [
      {
        lensId: 'contrarian',
        badgeKo: '🔥 역발상 코칭',
        headlineKo:
          '캐딜락은 재활 전용 침대나 서커스 기구가 아닙니다 — 가장 정직한 좌우 대칭 거울입니다',
        pitchKo:
          '롤다운바 양쪽에 걸린 2개의 독립 스프링은 좌우 몸통 중 어느 쪽이 먼저 당기고 어느 쪽 허리가 안 굽혀지는지 바의 기울기로 1초 만에 보여줍니다.',
        suggestedTitleKo: '롤다운바가 보여주는 내 몸의 대칭 · 캐딜락 척추 리셋',
        suggestedSubtitleKo: '양측 스프링 밸런스로 교정하는 척추 마디마디 분절',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.url,
      },
      {
        lensId: 'story',
        badgeKo: '📖 현장 공감 훅',
        headlineKo: '매트 롤업에서 늘 반동을 쓰던 회원이 롤다운바에서 처음 느낀 ‘요추 1번의 터치’',
        pitchKo:
          '스프링이 상체 무게를 30% 덜어주자 복부 긴장을 놓지 않고도 천골부터 요추·흉추를 도장 찍듯 바닥에 내려놓는 감각을 처음으로 터득한 스토리입니다.',
        suggestedTitleKo: '반동 없이 성공하는 첫 롤업 · 캐딜락 분절 클래스',
        suggestedSubtitleKo: '타워 스프링 보조로 완성하는 부드러운 C-커브 컨트롤',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.secondary.url,
      },
      {
        lensId: 'evidence',
        badgeKo: '📊 임상·역학 근거',
        headlineKo:
          '레그 스프링의 축성 견인(Axial Traction)이 고관절 가동성과 골반 안정성에 미치는 영향',
        pitchKo:
          '발목에 걸린 롱 스프링이 하지 원위부를 부드럽게 당겨주는 견인력을 제공해 고관절 굴곡근의 과긴장을 줄이고 심부 복근 중심의 다리 궤적 제어를 돕습니다.',
        suggestedTitleKo: '고관절이 가벼워지는 캐딜락 레그 스프링 & 디컴프레션',
        suggestedSubtitleKo: '천골 고정과 하지 견인 장력을 결합한 코어-고관절 시퀀스',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.titleKo,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.url,
      },
      {
        lensId: 'playbook',
        badgeKo: '✅ 3단계 실전 플레이북',
        headlineKo: '푸시스루바(Push-Through Bar) 안전 세팅과 아크 궤적 코칭 3원칙',
        pitchKo:
          '1) 상단/하단 스프링 및 안전 스트랩 체결 확인 → 2) 팔꿈치를 먼저 굽히지 말고 견갑골 하강으로 바의 원호(Arc) 궤적 따라가기 → 3) 복귀 시 스프링에 끌려가지 않고 아랫배로 제동하기.',
        suggestedTitleKo: '푸시스루바 아크(Arc) 마스터 · 흉추 가동성 플로우',
        suggestedSubtitleKo: '견갑 안정화와 원호 궤적으로 여는 상체·척추 가동성',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.secondary.url,
      },
      {
        lensId: 'missed',
        badgeKo: '🎯 놓치기 쉬운 디테일',
        headlineKo: '스프링 걸이 아이볼트(Eyebolt) 높이를 한 칸만 바꿔도 전혀 다른 근육이 깨어납니다',
        pitchKo:
          '같은 롤다운이나 암 스프링이라도 아이볼트를 하이(High)에 걸면 광배근·하부승모근이, 미드/로우(Mid/Low)에 걸면 전거근·후면삼각근과 복부 사슬이 집중 타겟팅됩니다.',
        suggestedTitleKo: '캐딜락 3단 각도 벡터(High·Mid·Low) 입체 시퀀스',
        suggestedSubtitleKo: '스프링 각도 변화로 깨우는 후면 사슬과 코어 통합',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.url,
      },
    ],
  },
  {
    id: 'barrel',
    family: 'barrel',
    nameKo: '래더 바렐 · 아크',
    nameEn: 'Ladder Barrel & Spine Corrector',
    oneLineSummaryKo:
      '인체공학적으로 설계된 곡면(Barrel Arc)과 사다리(Ladder Rungs) 지지를 통해 현대인의 굽은 흉추를 펴고 복사근·측면 사슬을 길게 강화하는 곡선형 기구',
    studioRoleBadgeKo: '곡면 지지(Apex) · 흉추 신전 · 측면 복사근·둔근 사슬',
    resistancePrincipleKo:
      '스프링 대신 바렐의 볼록한 정점(Apex)이 받침점(Fulcrum) 역할을 하며, 사다리와 바렐 사이의 거리(Frame Distance)와 상체 지렛대 길이가 강도를 결정합니다.',
    anatomyParts: [
      {
        pinNumber: 1,
        id: 'barrel-apex',
        nameKo: '바렐 아크 정점 (Barrel Apex)',
        nameEn: 'Upholstered Barrel Crown / Apex',
        roleKo: '골반·측면 골반·흉추를 곡면으로 받쳐 과신전 없이 척추를 분절시킵니다.',
        setupTipKo:
          '스완(Swan) 시 치골을, 사이드 싯업 시 대전자(Greater Trochanter)를 정점 약간 앞에 두세요.',
        pinX: 78,
        pinY: 48,
      },
      {
        pinNumber: 2,
        id: 'ladder-rungs',
        nameKo: '우드 래더 단 (Wooden Ladder Rungs)',
        nameEn: 'Multi-Height Ladder Rungs',
        roleKo: '발·손을 거는 높이에 따라 골반 경사 각도와 신전/굴곡 가동 범위를 조절합니다.',
        setupTipKo:
          '발을 높은 단에 걸수록 골반 고정이 쉬워지고, 낮은 단에 걸수록 고관절 신전 요구량이 커집니다.',
        pinX: 176,
        pinY: 44,
      },
      {
        pinNumber: 3,
        id: 'sliding-base',
        nameKo: '슬라이딩 간격 조절 프레임 (Sliding Base)',
        nameEn: 'Adjustable Barrel-to-Ladder Frame',
        roleKo: '회원의 다리 길이(대퇴·하퇴 길이)에 맞춰 바렐과 사다리 사이 간격을 조절합니다.',
        setupTipKo:
          '수업 시작 전 회원 다리 길이에 맞춰 프레임 잠금 레버가 완전히 고정되었는지 확인하세요.',
        pinX: 126,
        pinY: 92,
      },
      {
        pinNumber: 4,
        id: 'step-lip',
        nameKo: '스파인 코렉터 스텝 & 립 (Step & Lip)',
        nameEn: 'Spine Corrector Step Edge',
        roleKo: '소형 아크/스파인 코렉터에서 꼬리뼈 지지와 견갑골 가동 범위를 안내합니다.',
        setupTipKo: '롤오버·레그서클 시 어깨는 스텝에, 천골은 아크 상단에 안정적으로 올리세요.',
        pinX: 46,
        pinY: 82,
      },
    ],
    springSpecs: [
      {
        id: 'bar-short',
        colorNameKo: '근거리 프레임 + 손 가슴 앞 (기초)',
        colorHex: '#4E8774',
        tensionLabelKo: 'Short Lever · Safe Support',
        usageKo: '스완 프렙, 사이드 오버(손 가슴 앞), 숏박스 라운드백 입문',
      },
      {
        id: 'bar-mid',
        colorNameKo: '표준 프레임 + 손 머리 뒤 (중급)',
        colorHex: '#2D6A9F',
        tensionLabelKo: 'Medium Lever · Core & Obliques',
        usageKo: '사이드 싯업(Side Sit Up), 호스백(Horseback), 백 익스텐션',
      },
      {
        id: 'bar-long',
        colorNameKo: '원거리 프레임 + 양팔 만세 (심화)',
        colorHex: '#C84B31',
        tensionLabelKo: 'Long Lever · Full Arc Extension',
        usageKo: '풀 스완 다이브, 플랫백·트위스트 만세 지렛대, 핸드스탠드 변형',
      },
    ],
    bodyFitTips: [
      {
        badgeKo: '다리 길이별 프레임 거리',
        adjustmentKo:
          '숏박스 착석 시 무릎이 살짝(약 10~15°) 굽혀진 상태에서 발목이 래더에 안정적으로 걸리는 거리로 고정',
      },
      {
        badgeKo: '요추 전만 · 허리 뻐근함',
        adjustmentKo:
          '스완 수행 시 치골을 아크에 밀착해 골반 후방경사(Imprint sense)를 먼저 걸어 요추 압박 차단',
      },
      {
        badgeKo: '측면 골반(대전자) 압박감',
        adjustmentKo:
          '사이드 싯업 시 골반 뼈 바로 아래에 얇은 논슬립 패드를 깔아 편안한 측면 지지면 확보',
      },
    ],
    freshIdeas: [
      {
        lensId: 'contrarian',
        badgeKo: '🔥 역발상 코칭',
        headlineKo:
          '바렐은 허리를 꺾는 기구가 아니라 ‘가슴을 길게 뽑아 올리는(Lengthening)’ 기구입니다',
        pitchKo:
          '바렐 위에서 뒤로 많이 젖히려고 하면 요추만 찍히지만, 정수리를 사선 앞으로 길게 뽑으며 아크 곡선을 타고 올라가면 흉추가 시원하게 열립니다.',
        suggestedTitleKo: '허리가 편안한 바렐 스완 & 흉추 일롱게이션',
        suggestedSubtitleKo: '압박 없는 척추 신전(Lengthening Extension)과 호흡 확장',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.barrel.citation,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.barrel.url,
      },
      {
        lensId: 'story',
        badgeKo: '📖 현장 공감 훅',
        headlineKo: '하루 8시간 앉아 일하던 직장인 회원이 바렐 위에서 되찾은 3cm의 키와 숨통',
        pitchKo:
          '굽은 등과 짧아진 장요근 때문에 깊은 숨을 못 쉬던 회원이 바렐 아크 위 흉곽 오픈과 사이드 스트레치 후 “숨이 배까지 내려간다”고 말한 실제 변화 스토리입니다.',
        suggestedTitleKo: '데스크 워커를 위한 바렐 흉곽 오픈 & 디컴프레션',
        suggestedSubtitleKo: '굽은 등·말린 어깨·짧아진 옆구리를 여는 50분 회복 플로우',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.barrel.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.barrel.primary.url,
      },
      {
        lensId: 'evidence',
        badgeKo: '📊 임상·역학 근거',
        headlineKo:
          '곡면 지지(Curved Support)가 척추 신전근·복사근 원심성 조절에 주는 생체역학적 이점',
        pitchKo:
          '평평한 바닥과 달리 바렐의 곡면은 중력에 대항해 내려가는 구간(Eccentric Phase)의 가동 범위를 넓혀 복사근·요방형근·척추기립근의 기능적 길이-장력 관계를 개선합니다.',
        suggestedTitleKo: '바렐 3차원 코어 · 복사근 & 측면 사슬 강화',
        suggestedSubtitleKo: '가동 범위 끝에서 조절하는 측면 굴곡과 회전 시퀀스',
        sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.barrel.titleKo,
        sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.barrel.url,
      },
      {
        lensId: 'playbook',
        badgeKo: '✅ 3단계 실전 플레이북',
        headlineKo: '팔 위치 하나로 초보자부터 상급자까지 동시에 코칭하는 바렐 지렛대 3단 공식',
        pitchKo:
          '같은 사이드 싯업·숏박스 동작에서도 1단계(양손 가슴 앞 교차) → 2단계(양손 후두골 뒤 가볍게 터치) → 3단계(양팔 귀 옆 만세)로 지렛대만 바꾸면 레벨별 맞춤 수업이 완성됩니다.',
        suggestedTitleKo: '지렛대(Lever) 3단 조절 · 멀티레벨 바렐 클래스',
        suggestedSubtitleKo: '팔 위치 변화로 세밀하게 조절하는 코어 & 측면 부하',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.barrel.secondary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.barrel.secondary.url,
      },
      {
        lensId: 'missed',
        badgeKo: '🎯 놓치기 쉬운 디테일',
        headlineKo: '래더 바렐 호스백(Horseback)의 성패는 팔 힘이 아니라 ‘허벅지 안쪽 조임’에 있습니다',
        pitchKo:
          '바렐을 양 허벅지 안쪽(내전근)으로 감싸 안으며 골반저근을 위로 끌어올릴 때 비로소 골반이 바렐에서 1cm 떠오르는 진짜 호스백 연결이 일어납니다.',
        suggestedTitleKo: '내전근과 코어를 하나로 묶는 바렐 호스백 심화',
        suggestedSubtitleKo: '하지 내전과 골반 후방경사 리프트의 정교한 연결',
        sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.barrel.primary.channelName,
        sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.barrel.primary.url,
      },
    ],
  },
];

export const PROP_QUICK_GUIDES: readonly PropQuickGuide[] = [
  {
    id: 'magic-circle',
    nameKo: '써클링 · 매직 서클',
    nameEn: 'Magic Circle',
    summaryKo: '내전근·골반저근·전거근의 등척성(Isometric) 수축을 즉각 유도하는 탄성 링',
    bestApparatusKo: '매트 · 리포머 풋워크/브릿지 · 캐딜락 롤다운',
    cueTipKo: '링을 쥐어짜지 말고 “양쪽 패드가 중심선으로 2cm만 가까워진다”고 큐잉하세요.',
  },
  {
    id: 'foam-roller',
    nameKo: '폼롤러',
    nameEn: 'Foam Roller',
    summaryKo: '원통형 지지면으로 고유수용성 균형 감각과 흉추 근막 이완을 동시에 제공',
    bestApparatusKo: '매트 척추 정렬 · 리포머 스탠딩 보조',
    cueTipKo: '세로로 누웠을 때 후두골·흉추·천골 3점이 롤러 중앙에 수평으로 놓이게 맞추세요.',
  },
  {
    id: 'mini-ball',
    nameKo: '미니볼',
    nameEn: 'Overball / Mini Ball',
    summaryKo: '요추 C-커브 분절 보조 및 무릎 사이 내전근 정렬 유지에 탁월한 소프트 볼',
    bestApparatusKo: '매트 롤업 보조 · 체어/리포머 무릎 정렬',
    cueTipKo: '천골 위쪽(L4~S1)에 살짝 고여 요추가 뻣뻣한 회원의 분절 감각을 깨워주세요.',
  },
  {
    id: 'theraband',
    nameKo: '탄력 밴드 (롱·루프)',
    nameEn: 'Resistance & Loop Band',
    summaryKo: '스프링 궤적을 미리 체험하게 하거나 중둔근·견갑 외회전 저항을 추가하는 밴드',
    bestApparatusKo: '매트 롤업 · 사이드 킥 · 상체 로테이션',
    cueTipKo: '돌아올 때 밴드 탄성에 끌려가지 않도록 천천히 버티며 돌아오게 안내하세요.',
  },
  {
    id: 'bosu',
    nameKo: '보수 · 밸런스 돔',
    nameEn: 'BOSU Balance Trainer',
    summaryKo: '반구형 불안정 지지면으로 발목·무릎·고관절 안정화 근육을 입체적으로 자극',
    bestApparatusKo: '매트·스탠딩 밸런스 · 리포머 점프보드 대체',
    cueTipKo: '돔 정점 중앙에 발바닥 삼각 지지대(엄지·새끼·뒤꿈치)를 고르게 밀착시키세요.',
  },
];

export interface ApparatusIdeaExpandedDraft {
  readonly lensNumber: 1 | 2 | 3 | 4 | 5;
  readonly openingScriptKo: string;
  readonly memberNoticeKo: string;
  readonly coachingChecklistKo: readonly [string, string, string];
}

export function buildApparatusIdeaExpandedDraft(
  guide: ApparatusVisualGuideEntry,
  idea: ApparatusFreshIdeaLens,
): ApparatusIdeaExpandedDraft {
  const lensOrderMap: Record<ApparatusFreshIdeaLens['lensId'], 1 | 2 | 3 | 4 | 5> = {
    contrarian: 1,
    story: 2,
    evidence: 3,
    playbook: 4,
    missed: 5,
  };
  const lensNumber = lensOrderMap[idea.lensId];
  const primaryPart = guide.anatomyParts[0];
  const secondaryPart = guide.anatomyParts[1];
  const primarySpring = guide.springSpecs[0];
  const lightSpring = guide.springSpecs[guide.springSpecs.length - 1];
  const fitTip = guide.bodyFitTips[0];

  switch (idea.lensId) {
    case 'contrarian':
      return {
        lensNumber,
        openingScriptKo: `“회원님들, 오늘 ${guide.nameKo} 수업에서는 평소 우리가 당연하게 생각하던 습관을 완전히 뒤집어볼 거예요. ‘${idea.headlineKo}’ 오늘 50분 동안은 힘으로 밀어내는 대신, ${lightSpring.colorNameKo} 세팅에서 내 심부 코어가 ${primaryPart.nameKo}와 ${secondaryPart.nameKo}의 움직임을 얼마나 정교하게 통제하는지 직접 느껴보실 겁니다.”`,
        memberNoticeKo: `[${idea.suggestedTitleKo}] ${idea.pitchKo} 오늘 수업은 (${idea.suggestedSubtitleKo})를 중심으로 관절 부담은 줄이고 심부 안정근 깨우기에 집중합니다.`,
        coachingChecklistKo: [
          `초기 세팅: ${primaryPart.nameKo} 위치를 회원 체형(${fitTip.badgeKo})에 맞춰 먼저 정렬`,
          `저항 역발상: ${lightSpring.colorNameKo}(${lightSpring.tensionLabelKo})에서 반동 없이 3초간 중심 유지 큐잉`,
          `보상 차단: 어깨 으쓱임이나 요추 과신전이 나타나면 즉시 가동 범위를 70%로 축소`,
        ],
      };
    case 'story':
      return {
        lensNumber,
        openingScriptKo: `“수업 전에 많은 회원님들이 가장 자주 하시는 말씀이 있어요. 바로 ‘${idea.headlineKo}’인데요. 오늘 수업에서는 왜 그동안 목표 부위 대신 목이나 허리가 먼저 피로했는지, ${secondaryPart.nameKo}의 돌아오는 구간(원심성 컨트롤) 하나로 몸의 느낌이 어떻게 달라지는지 첫 10분 만에 체감하실 수 있게 안내해 드릴게요.”`,
        memberNoticeKo: `[${idea.suggestedTitleKo}] 평소 동작 중 목·어깨·허리 긴장이 고민이셨나요? ${idea.pitchKo} 오늘 수업에서 내 몸이 편안해지는 진짜 정렬 포인트를 찾아보세요.`,
        coachingChecklistKo: [
          `공감 체크: 수업 시작 전 ${fitTip.badgeKo} 해당 여부와 오늘 불편한 관절 부위를 10초간 확인`,
          `감각 전환: 밀어낼 때보다 돌아오는 마지막 2cm 구간에서 3초 카운트 원심성 브레이크 적용`,
          `피드백 질문: 첫 세트 직후 ‘어깨/허리 대신 아랫배와 목표 근육에 텐션이 들어오나요?’ 확인`,
        ],
      };
    case 'evidence':
      return {
        lensNumber,
        openingScriptKo: `“오늘 ${guide.nameKo} 시퀀스는 단순한 스트레칭이나 근력 운동이 아니라, 생체역학·임상 근거(${idea.sourceLabelKo})를 바탕으로 설계된 ‘${idea.suggestedTitleKo}’ 시간입니다. ${guide.resistancePrincipleKo} 이 원리를 활용해서 관절은 보호하고 심부 근육의 동시 수축을 끌어올려 볼게요.”`,
        memberNoticeKo: `[${idea.suggestedTitleKo}] ${idea.pitchKo} 검증된 바이오메카닉스 원리(${idea.suggestedSubtitleKo})를 기반으로 안전하고 밀도 높은 50분 수업을 진행합니다.`,
        coachingChecklistKo: [
          `정렬 기준점: ${primaryPart.nameKo} 지지 시 고관절-슬관절-제2족지(또는 견갑-흉곽) 중립 축 일치`,
          `호흡 연동: 들숨에 측면 흉곽을 넓히고 날숨 시작 0.5초 전에 복횡근·골반저근 선행 수축 유도`,
          `부하 처방: ${primarySpring.colorNameKo}에서 ${lightSpring.colorNameKo} 순으로 신경근 제어 난이도 점진 상향`,
        ],
      };
    case 'playbook':
      return {
        lensNumber,
        openingScriptKo: `“오늘은 동작과 동작 사이에 흐름이 끊기지 않는 3단계 실전 플레이북으로 진행합니다. ‘${idea.headlineKo}’ 공식에 맞춰 웜업부터 피크 코어, 전신 통합까지 물 흐르듯 연결할 테니, 제 호흡 카운트와 ${primaryPart.nameKo}·${secondaryPart.nameKo} 전환 큐잉에만 집중해 따라와 주세요!”`,
        memberNoticeKo: `[${idea.suggestedTitleKo}] ${idea.pitchKo} 군더더기 없는 3단계 전환 플로우(${idea.suggestedSubtitleKo})로 50분 내내 코어 온도를 유지합니다.`,
        coachingChecklistKo: [
          `1단계 도입: ${primarySpring.colorNameKo} 기반 기초 정렬 확인 및 호흡-척추 예열 (${primarySpring.usageKo})`,
          `2단계 전개: 5초 이내 스프링·지렛대 전환으로 흐름 끊김 없이 코어·사지 협응 본운동 진입`,
          `3단계 통합: ${lightSpring.colorNameKo}에서 가장 긴 지렛대·밸런스 동작 수행 후 척추 감압 마무리`,
        ],
      };
    case 'missed':
      return {
        lensNumber,
        openingScriptKo: `“필라테스에서 1cm의 차이가 결과를 완전히 바꿉니다. 오늘 수업의 핵심 키워드는 ‘${idea.headlineKo}’입니다. 동작 횟수를 급하게 채우기보다, ${guide.anatomyParts[2].nameKo}와 ${guide.anatomyParts[3].nameKo}의 좌우 대칭과 정점 1초 홀드에 집중해서 평소 놓치던 깊은 속근육까지 정확히 깨워보겠습니다.”`,
        memberNoticeKo: `[${idea.suggestedTitleKo}] ${idea.pitchKo} 작은 디테일(${idea.suggestedSubtitleKo}) 하나로 운동 밀도가 2배 깊어지는 정교한 세션을 경험해 보세요.`,
        coachingChecklistKo: [
          `사전 캘리브레이션: ${guide.anatomyParts[2].nameKo} 및 ${guide.anatomyParts[3].nameKo}의 좌우 길이·높이 대칭 점검`,
          `정점 아이소메트릭: 가동 범위 끝(End-Range)과 복귀 직전 1cm 지점에서 1초 정지(Hold) 큐잉`,
          `트랜지션 규율: 동작이 끝난 뒤 털썩 힘을 풀지 않고 다음 동작 시작 자세까지 텐션 유지`,
        ],
      };
  }
}

export interface SpecialPopulationStepSpec {
  readonly exerciseId: string;
  readonly labelKo: string;
  readonly apparatusBadgeKo: string;
  readonly durationMin: number;
  readonly springsNoteKo: string;
  readonly cueNoteKo: string;
  readonly blockCategory:
    | 'warmup'
    | 'footwork'
    | 'core'
    | 'upper-body'
    | 'lower-body'
    | 'feet-in-straps'
    | 'extension'
    | 'cooldown';
  readonly classSection: 'preparation' | 'main' | 'cooldown';
  readonly sideMode?: 'together' | 'left-then-right';
}

export interface SpecialPopulationCarePreset {
  readonly id: 'prenatal-postnatal' | 'scoliosis-asymmetry' | 'senior-joint-safe';
  readonly badgeKo: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly targetMinutes: 50;
  readonly primaryApparatus: ApparatusType;
  readonly summaryKo: string;
  readonly setupRulesKo: readonly [string, string, string];
  readonly contraindicationsKo: string;
  readonly openingScriptKo: string;
  readonly memberNoticeKo: string;
  readonly sourceLabelKo: string;
  readonly sourceUrl: string;
  readonly steps: readonly SpecialPopulationStepSpec[];
}

export interface TargetedPainCareBlock {
  readonly id: 'shoulder-rotator-cuff' | 'snapping-hip-psoas' | 'plantar-foot-tripod';
  readonly badgeKo: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly durationMinutes: 15;
  readonly primaryApparatus: ApparatusType;
  readonly summaryKo: string;
  readonly setupRulesKo: readonly [string, string, string];
  readonly contraindicationsKo: string;
  readonly sourceLabelKo: string;
  readonly sourceUrl: string;
  readonly steps: readonly [
    SpecialPopulationStepSpec,
    SpecialPopulationStepSpec,
    SpecialPopulationStepSpec,
  ];
}

export const SPECIAL_POPULATION_CARE_PRESETS: readonly SpecialPopulationCarePreset[] = [
  {
    id: 'prenatal-postnatal',
    badgeKo: '🤰 임산부 산전·산후 & 복직근이개 케어',
    titleKo: '산전·산후 50분 골반저근·흉곽 호흡 & 부종 완화 시퀀스',
    subtitleKo: '웨지 30° 경사 지지 · 와이드 V-스탠스 · 복직근이개(Diastasis Recti) 보호 루틴',
    targetMinutes: 50,
    primaryApparatus: 'reformer',
    summaryKo:
      '임신 중기(16주+) 이후 대정맥 압박 및 복직근이개를 예방하기 위해 앙와위 평평한 자세와 상복부 크런치(컬업)를 배제하고, 웨지 지지·시티드·사이드라잉 중심으로 구성한 50분 전용 시퀀스입니다.',
    setupRulesKo: [
      '① 앙와위 웨지(Spine Supine Wedge) / 헤드레스트 상승: 상체 약 30° 경사를 유지하고 연속 누운 자세는 3~5분 이내로 전환',
      '② 풋바 와이드 V-스탠스 & 기어바 1단 후퇴: 고관절 외회전으로 복부 공간을 확보하고 치골결합(Pubic Symphysis) 압박 예방',
      '③ 복직근이개 보호 호흡: 크런치·롤업 대신 날숨에 골반저근과 복횡근으로 아기를 감싸 안는 ‘Hug the Baby’ 코르셋 수축 적용',
    ],
    contraindicationsKo:
      '임신 16주 이후 평평한 앙와위 장시간 유지 금지 · 상복부 굴곡(Curl-up/Roll-up/Teaser) 및 복강 내압 상승(발살바 호흡) 금지 · 릴랙신 호르몬에 의한 내전근 과신장 주의',
    openingScriptKo:
      '“회원님, 오늘 50분 수업은 복부 압박이나 허리 부담 없이 호흡으로 골반저근과 심부 복횡근을 부드럽게 깨우는 산전·산후 케어 플로우입니다. 웨지로 상체 각도를 높이고 고관절 공간을 여유 있게 열어두었으니, 날숨마다 아랫배를 등 쪽으로 포근히 감싸 안는 감각에 집중해 볼게요.”',
    memberNoticeKo:
      '[산전·산후 50분 맞춤 케어 클래스] 복직근이개와 골반 불안을 예방하는 웨지 서포트 호흡·와이드 풋워크·중둔근 안정화·하체 부종 순환 50분 시퀀스입니다.',
    sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.reformer.citation,
    sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.reformer.url,
    steps: [
      {
        exerciseId: 'original-reformer-supine-breath',
        labelKo: '웨지 지지 흉곽 호흡 & Hug the Baby 복횡근 인지',
        apparatusBadgeKo: '리포머 · 웨지 30°',
        durationMin: 6,
        springsNoteKo: '2 Red',
        cueNoteKo: '웨지 위에서 측면 흉곽 들숨과 골반저근-복횡근 날숨 수축 연결',
        blockCategory: 'warmup',
        classSection: 'preparation',
      },
      {
        exerciseId: 'ex-footwork-01',
        labelKo: '와이드 V-스탠스 풋워크 & 발목 펌핑 순환',
        apparatusBadgeKo: '리포머 · 기어바 1단 후퇴',
        durationMin: 10,
        springsNoteKo: '2 Red + 1 Blue',
        cueNoteKo: '고관절 외회전으로 복부 공간 확보 후 뒤꿈치·발목 펌핑으로 하지 정맥 환류 촉진',
        blockCategory: 'footwork',
        classSection: 'main',
      },
      {
        exerciseId: 'original-reformer-seated-row',
        labelKo: '박스 시티드 로잉 & 라운드숄더 흉추 오픈',
        apparatusBadgeKo: '리포머 · 박스 시티드',
        durationMin: 10,
        springsNoteKo: '1 Red 또는 1 Blue',
        cueNoteKo: '수유·임신으로 말리기 쉬운 전면 가슴을 열고 하부승모근·능형근 강화',
        blockCategory: 'upper-body',
        classSection: 'main',
      },
      {
        exerciseId: 'ex-lower-04',
        labelKo: '사이드 라잉 레그 스트랩 & 천장관절 중둔근 안정화',
        apparatusBadgeKo: '리포머 · 측와위',
        durationMin: 10,
        springsNoteKo: '1 Red',
        cueNoteKo: '머리·복부 패드 지지 하에 골반 수직 정렬을 지키며 중둔근 강화',
        blockCategory: 'lower-body',
        classSection: 'main',
        sideMode: 'left-then-right',
      },
      {
        exerciseId: 'ex-straps-01',
        labelKo: '웨지 지지 핏인스트랩 프로그 & 고관절 이완',
        apparatusBadgeKo: '리포머 · 웨지 서포트',
        durationMin: 8,
        springsNoteKo: '1 Red + 1 Blue',
        cueNoteKo: '내전근 과신장 없이 통제 가능한 작은 서클 반경으로 골반 순환 유도',
        blockCategory: 'feet-in-straps',
        classSection: 'main',
      },
      {
        exerciseId: 'ex-cooldown-01',
        labelKo: '시티드 머메이드 흉곽 측면 확장 릴리즈',
        apparatusBadgeKo: '리포머 · 시티드',
        durationMin: 6,
        springsNoteKo: '1 Blue',
        cueNoteKo: '강한 비틀기 대신 옆구리 늑간근 공간을 넓히는 측면 호흡으로 마무리',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        sideMode: 'left-then-right',
      },
    ],
  },
  {
    id: 'scoliosis-asymmetry',
    badgeKo: '📐 척추측만 · 골반·어깨 비대칭 3D 교정',
    titleKo: '척추측만·비대칭 50분 축성 신장(Elongation) & 좌우 밸런스 시퀀스',
    subtitleKo: '양측 스프링 대칭 캘리브레이션 · 오목측(Concave) 호흡 확장 · 볼록측(Convex) 지지',
    targetMinutes: 50,
    primaryApparatus: 'cadillac',
    summaryKo:
      '캐딜락 롤다운바·독립 레그 스프링과 리포머·래더 바렐을 결합해 좌우 근력 편차를 정밀 진단하고, 축성 신장(Axial Elongation)과 오목측 호흡 확장을 유도하는 50분 3차원 교정 시퀀스입니다.',
    setupRulesKo: [
      '① 스프링·스트랩 100% 대칭 캘리브레이션: 캐딜락 양측 스프링과 리포머 더블 루프 길이를 시작 전 동일하게 세팅',
      '② 오목측(Concave) 들숨 확장 + 볼록측(Convex) 날숨 지지: 좁아진 늑곽 쪽으로 숨을 불어넣고 돌출된 쪽 복사근은 중심축으로 수축',
      '③ 축성 신장(Axial Elongation) 최우선: 척추를 과하게 꺾거나 비틀기 전에 정수리와 좌골을 위아래로 길게 뽑아 올리기',
    ],
    contraindicationsKo:
      '축성 신장 없는 끝범위 척추 측굴·과신전·강한 회전 부하 주의 · 양측 스프링 비대칭 상태에서 무거운 저항 수행 금지',
    openingScriptKo:
      '“회원님, 오늘 50분 수업은 내 몸의 좌우 대칭 거울인 캐딜락과 바렐·리포머를 활용해 골반과 흉곽의 중심축을 똑바로 세우는 3차원 밸런스 시간입니다. 좁아진 옆구리에는 호흡으로 공간을 열어주고, 약해진 쪽 둔근과 복사근에는 정교한 스프링 지지력을 채워 넣어 볼게요.”',
    memberNoticeKo:
      '[척추측만·좌우 비대칭 50분 3D 밸런스 클래스] 양측 독립 스프링 피드백과 비대칭 흉곽 호흡(오목측 확장·볼록측 지지)으로 골반·어깨 수평을 리셋하는 50분 세션입니다.',
    sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.citation,
    sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.url,
    steps: [
      {
        exerciseId: 'ex-warmup-02',
        labelKo: '캐딜락 롤다운바 양측 스프링 대칭 체크 & 분절',
        apparatusBadgeKo: '캐딜락 · 2 Yellow',
        durationMin: 8,
        springsNoteKo: '2 Yellow (상단 대칭)',
        cueNoteKo: '롤다운바의 수평 기울기를 보며 좌우 광배근·복근 당김 속도를 1:1로 일치',
        blockCategory: 'warmup',
        classSection: 'preparation',
      },
      {
        exerciseId: 'original-cadillac-seated-rotation',
        labelKo: '시티드 축성 신장 & 오목측 흉곽 호흡 로테이션',
        apparatusBadgeKo: '캐딜락 · 시티드',
        durationMin: 8,
        springsNoteKo: '2 Yellow',
        cueNoteKo: '양쪽 좌골 무게를 50:50으로 고정한 채 정수리를 천장으로 길게 뽑으며 회전',
        blockCategory: 'upper-body',
        classSection: 'main',
        sideMode: 'left-then-right',
      },
      {
        exerciseId: 'ex-straps-02',
        labelKo: '독립 레그 스프링 좌우 대칭 프로그 & 천골 고정',
        apparatusBadgeKo: '캐딜락 · 2 Long Purple',
        durationMin: 10,
        springsNoteKo: '2 Long Purple',
        cueNoteKo:
          '양다리가 따로 노는 독립 스프링에서 두 발뒤꿈치가 정중앙선(Midline)에서 만나도록 제어',
        blockCategory: 'feet-in-straps',
        classSection: 'main',
      },
      {
        exerciseId: 'ex-upper-01',
        labelKo: '리포머 닐링 체스트 익스팬션 & 견갑 수평 정렬',
        apparatusBadgeKo: '리포머 · 1 Red',
        durationMin: 8,
        springsNoteKo: '1 Red',
        cueNoteKo: '양쪽 스트랩 장력을 대칭으로 당기며 높아진 쪽 어깨의 상부승모근 하강 유도',
        blockCategory: 'upper-body',
        classSection: 'main',
        sideMode: 'left-then-right',
      },
      {
        exerciseId: 'original-barrel-supported-side-bend',
        labelKo: '래더 바렐 측면 일롱게이션 & 복사근 등척성 홀드',
        apparatusBadgeKo: '래더 바렐 · 측와위',
        durationMin: 9,
        springsNoteKo: '바렐 아크 지지',
        cueNoteKo: '오목측은 길게 늘려 호흡을 채우고 볼록측은 수평 등척성 홀드 시간을 1세트 추가',
        blockCategory: 'extension',
        classSection: 'main',
        sideMode: 'left-then-right',
      },
      {
        exerciseId: 'ex-cooldown-01',
        labelKo: '리포머 머메이드 비대칭 늑간근 호흡 이완',
        apparatusBadgeKo: '리포머 · 1 Blue',
        durationMin: 7,
        springsNoteKo: '1 Blue',
        cueNoteKo: '좁아진 갈비뼈 사이가 부채처럼 열리도록 깊은 측면 호흡으로 마무리',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        sideMode: 'left-then-right',
      },
    ],
  },
  {
    id: 'senior-joint-safe',
    badgeKo: '🌿 시니어 · 골다공증 척추 보호 & 낙상 예방',
    titleKo: '시니어 50분 중립 척추(Neutral Spine) & 고관절·발목 밸런스 시퀀스',
    subtitleKo: '척추 과굴곡(Loaded Flexion) 배제 · 체어 안전 핸들 지지 · 하지 고유수용성 강화',
    targetMinutes: 50,
    primaryApparatus: 'chair',
    summaryKo:
      '골밀도 저하(골다공증·골감소증) 및 슬관절·고관절 퇴행성 변화가 있는 시니어 회원을 위해 체중 부하 척추 굴곡(롤업·컬업)을 완전히 배제하고, 안전 핸들 지지 하체 근력과 중립 척추 신전 중심으로 설계한 50분 시퀀스입니다.',
    setupRulesKo: [
      '① 골다공증 금기(Loaded Spinal Flexion) 완전 배제: 롤업·롤오버·크리스크로스 대신 중립 척추(Neutral Spine)와 부드러운 흉추 신전만 수행',
      '② 체어 양측 하이 핸들(Dual High Handles) & 높은 베드 활용: 바닥에 눕고 일어나는 횟수를 줄이고 스탠딩 시 양손 핸들을 항상 파지',
      '③ 고관절-슬관절-제2족지 정렬 & 발목 고유수용성: 계단 보행과 낙상 예방에 직결되는 중둔근·종아리·발바닥 삼각 지지력 집중 강화',
    ],
    contraindicationsKo:
      '골다공증·척추압박골절 병력 시 체중이 실린 척추 굴곡(Roll-up/Roll-over/Loaded C-curve) 및 강한 회전 결합 굴곡 절대 금지 · 눈 감고 한발 서기 등 낙상 위험 동작 주의',
    openingScriptKo:
      '“어르신·회원님, 오늘 50분 수업은 허리를 무리하게 구부리거나 손목·무릎을 누르는 동작 없이, 척추를 반듯하게 세운 상태에서 다리 근력과 균형 감각을 탄탄하게 채우는 관절 보호 클래스입니다. 안전 핸들을 편하게 잡으시고 제 호흡 카운트에 맞춰 천천히 따라오세요.”',
    memberNoticeKo:
      '[시니어·관절 보호 50분 밸런스 클래스] 척추 압박 없는 중립 정렬(Osteoporosis-Safe)과 안전 핸들 지지 하체·둔근·발목 균형 강화로 일상 보행을 가볍게 만드는 50분 수업입니다.',
    sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.chair.citation,
    sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.chair.url,
    steps: [
      {
        exerciseId: 'original-chair-seated-breath',
        labelKo: '운다 체어 시티드 수직 중립 호흡 & 좌골 지지',
        apparatusBadgeKo: '체어 · 시티드',
        durationMin: 6,
        springsNoteKo: '시트 고정 지지',
        cueNoteKo: '바닥까지 내려가지 않고 체어 시트에 편히 앉아 정수리-좌골 수직 축 세우기',
        blockCategory: 'warmup',
        classSection: 'preparation',
      },
      {
        exerciseId: 'original-chair-seated-pedal-press',
        labelKo: '시티드 더블 페달 프레스 & 무릎-발끝 정렬',
        apparatusBadgeKo: '체어 · 2 Heavy',
        durationMin: 9,
        springsNoteKo: '2 Heavy (중단)',
        cueNoteKo: '허리를 둥글게 말지 않고 중립 척추를 유지한 채 허벅지·둔근 힘으로 페달 컨트롤',
        blockCategory: 'footwork',
        classSection: 'main',
      },
      {
        exerciseId: 'original-chair-sit-to-stand',
        labelKo: '안전 핸들 지지 시트-투-스탠드 기능적 하체 리프트',
        apparatusBadgeKo: '체어 · 양측 핸들 장착',
        durationMin: 9,
        springsNoteKo: '양측 핸들 고정',
        cueNoteKo: '의자에서 일어날 때 무릎이 모이지 않도록 발바닥 전체로 바닥을 밀어 수직 기립',
        blockCategory: 'lower-body',
        classSection: 'main',
      },
      {
        exerciseId: 'original-chair-supported-calf-raise',
        labelKo: '양손 핸들 지지 카프 레이즈 & 발목 낙상 예방 밸런스',
        apparatusBadgeKo: '체어 · 핸들 지지 스탠딩',
        durationMin: 8,
        springsNoteKo: '양손 핸들 지지',
        cueNoteKo: '엄지발가락 뿌리와 두 번째 발가락 축으로 뒤꿈치를 천천히 들어 올리고 3초 하강',
        blockCategory: 'lower-body',
        classSection: 'main',
      },
      {
        exerciseId: 'ex-footwork-01',
        labelKo: '리포머 헤드레스트 업 닫힌 사슬 풋워크 정렬',
        apparatusBadgeKo: '리포머 · 헤드레스트 업',
        durationMin: 10,
        springsNoteKo: '2 Red + 1 Blue',
        cueNoteKo: '어지럼증 예방을 위해 헤드레스트를 높이고 관절 충격 없이 대퇴사두근·둔근 강화',
        blockCategory: 'footwork',
        classSection: 'main',
      },
      {
        exerciseId: 'original-chair-seated-mermaid',
        labelKo: '시티드 중립 측면 리치 & 흉곽 확장 마무리',
        apparatusBadgeKo: '체어 · 1 Heavy',
        durationMin: 8,
        springsNoteKo: '1 Heavy',
        cueNoteKo: '척추를 앞으로 구부리지 않고 옆구리를 천장 쪽으로 길게 늘리며 호흡 정리',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        sideMode: 'left-then-right',
      },
    ],
  },
];

export const TARGETED_PAIN_CARE_BLOCKS: readonly TargetedPainCareBlock[] = [
  {
    id: 'shoulder-rotator-cuff',
    badgeKo: '🪽 회전근개 · 어깨 충돌증후군 & 라운드숄더 15분 블록',
    titleKo: '어깨 충돌 예방 · 견갑상완리듬(Scapulohumeral Rhythm) 15분 케어',
    subtitleKo: '90° 이하 안전 거상 · 전거근·하부승모근 선행 활성 · 흉추 외회전 가동성',
    durationMinutes: 15,
    primaryApparatus: 'cadillac',
    summaryKo:
      '팔을 들 때 견봉하 공간이 좁아져 집히는 회원님을 위해 상완골 90° 이하 안전 각도에서 전거근·하부승모근을 먼저 깨우고 흉추 신전·회전 가동성을 확보하는 15분 집중 모듈입니다.',
    setupRulesKo: [
      '① 상완골 거상 90° 이하 제한: 초기 세트에서 손이 어깨 높이(90°)를 넘지 않도록 스트랩·바 궤적 제한',
      '② 저장력(1 Yellow / 1 Blue) 세팅: 무거운 스프링으로 상부승모근이 개입하는 것을 막고 회전근개 미세 안정화 유도',
      '③ 견갑골 면(Scapular Plane · 전방 30°) 유지: 팔꿈치를 몸통 뒤로 과하게 빼지 않고 몸통 앞 30° 시야 안에서 움직임 제어',
    ],
    contraindicationsKo:
      '어깨 내회전 상태에서 90° 이상 오버헤드 프레스 금지 · 숄더블록에 어깨가 강하게 눌리는 역플랭크/롱스트레치 주의',
    sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.channelName,
    sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.cadillac.primary.url,
    steps: [
      {
        exerciseId: 'ex-warmup-02',
        labelKo: '캐딜락 롤다운바 견갑 하강 & 전거근 프로트랙션',
        apparatusBadgeKo: '캐딜락 · 2 Yellow',
        durationMin: 5,
        springsNoteKo: '2 Yellow',
        cueNoteKo: '팔꿈치를 굽히지 않고 겨드랑이 아래 전거근으로 바를 부드럽게 끌어내리기',
        blockCategory: 'warmup',
        classSection: 'preparation',
      },
      {
        exerciseId: 'original-reformer-seated-row',
        labelKo: '리포머 시티드 로잉 (견갑면 30° 외회전 컨트롤)',
        apparatusBadgeKo: '리포머 · 1 Yellow/Blue',
        durationMin: 5,
        springsNoteKo: '1 Yellow 또는 1 Blue',
        cueNoteKo: '쇄골을 양옆으로 넓게 펼친 채 팔꿈치가 몸통 선을 넘지 않게 당기고 3초 원심성 복귀',
        blockCategory: 'upper-body',
        classSection: 'main',
      },
      {
        exerciseId: 'original-mat-open-book',
        labelKo: '사이드 라잉 오픈 북 흉추 회전 & 소흉근 이완',
        apparatusBadgeKo: '매트 · 폼롤러/소도구',
        durationMin: 5,
        springsNoteKo: '체중·호흡 저항',
        cueNoteKo: '어깨 관절만 꺾지 말고 날숨에 흉곽 전체를 회전시켜 견봉하 공간 확보',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        sideMode: 'left-then-right',
      },
    ],
  },
  {
    id: 'snapping-hip-psoas',
    badgeKo: '🦴 장요근 과긴장 · 고관절 스내핑힙(탄발성 고관절) 15분 블록',
    titleKo: '고관절 스내핑힙 감압 · 대퇴골두 중심화(Centration) 15분 케어',
    subtitleKo: '레그 스프링 축성 견인 · 천골 고정 복횡근 선행 수축 · 중둔근 외회전 안정화',
    durationMinutes: 15,
    primaryApparatus: 'reformer',
    summaryKo:
      '다리를 내릴 때마다 고관절 앞쪽에서 ‘뚝’ 소리가 나거나 집히는 회원님을 위해, 긴 스프링의 견인력(Traction)으로 관절 공간을 열고 복횡근-중둔근 협응을 회복하는 15분 집중 모듈입니다.',
    setupRulesKo: [
      '① 축성 견인(Axial Traction) 우선: 다리를 들어 올리기 전 스트랩/스프링이 발목을 멀리 당겨주는 견인감을 먼저 인지',
      '② 가동 범위(ROM) 50% 축소 & 턴아웃(외회전): 소리가 나는 각도 직전까지만 작은 서클을 그리고 고관절 외회전 정렬 적용',
      '③ 요추 중립 & 복횡근 선행 수축: 장요근이 요추를 앞으로 잡아당기지 않도록 날숨에 아랫배를 먼저 고정',
    ],
    contraindicationsKo:
      '무거운 다리 지렛대(양다리 45° 이하 맨몸 하강) 금지 · 고관절 내회전 상태에서 큰 서클 수행 주의',
    sourceLabelKo: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.titleKo,
    sourceUrl: VERIFIED_LITERATURE_BY_APPARATUS.cadillac.url,
    steps: [
      {
        exerciseId: 'ex-straps-02',
        labelKo: '캐딜락 롱 레그 스프링 축성 견인 & 소형 프로그',
        apparatusBadgeKo: '캐딜락 · 2 Long Purple',
        durationMin: 5,
        springsNoteKo: '2 Long Purple',
        cueNoteKo: '천골을 베드에 무겁게 고정하고 대퇴골두가 관절와 깊숙이 안착되는 작은 프로그 수행',
        blockCategory: 'feet-in-straps',
        classSection: 'main',
      },
      {
        exerciseId: 'ex-lower-04',
        labelKo: '리포머 사이드 라잉 레그 스트랩 & 중둔근 후방 섬유 활성화',
        apparatusBadgeKo: '리포머 · 1 Red',
        durationMin: 5,
        springsNoteKo: '1 Red',
        cueNoteKo: '전면 대퇴근막장근(TFL) 대신 뒤쪽 중둔근으로 다리를 길게 뻗어 고관절 전방 활주 차단',
        blockCategory: 'lower-body',
        classSection: 'main',
        sideMode: 'left-then-right',
      },
      {
        exerciseId: 'ex-global-reformer-03',
        labelKo: '리포머 닐링 런지 장요근 원심성 신장 릴리즈',
        apparatusBadgeKo: '리포머 · 1 Red',
        durationMin: 5,
        springsNoteKo: '1 Red',
        cueNoteKo: '허리를 꺾지 말고 둔근을 수축해 골반 후방경사를 유지한 채 장요근만 길게 이완',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        sideMode: 'left-then-right',
      },
    ],
  },
  {
    id: 'plantar-foot-tripod',
    badgeKo: '🦶 족저근막염 · 무지외반증 & 발목-무릎 아치 정렬 15분 블록',
    titleKo: '족부 삼각 아치(Foot Tripod) · 아킬레스-종아리 원심성 15분 케어',
    subtitleKo: '엄지·새끼·뒤꿈치 3점 돔(Dome) 활성 · 러닝 원심성 이완 · 제2족지 무릎 트래킹',
    durationMinutes: 15,
    primaryApparatus: 'reformer',
    summaryKo:
      '평발·무지외반증·족저근막 피로로 인해 발목이 안으로 무너지고(회내) 무릎까지 돌아가는 회원님을 위해, 발바닥 내재근 돔(Foot Dome)과 종아리 원심성 이완을 연결하는 15분 집중 모듈입니다.',
    setupRulesKo: [
      '① 족부 3점 지지(Foot Tripod): 제1중족골두(엄지 뿌리)·제5중족골두(새끼 뿌리)·종골(뒤꿈치) 3점에 체중을 균등 배분',
      '② 발가락 말아 쥐기(Clawing) 방지: 풋바 위에서 발가락에 힘을 빼고 발바닥 아치 돔(Dome)만 부드럽게 끌어올리기',
      '③ 슬관절-제2족지 축 정렬: 뒤꿈치를 들고 내릴 때 발목이 바깥으로 꺾이지 않도록 두 번째 발가락 수직선 유지',
    ],
    contraindicationsKo:
      '급성 족저근막 통증 시 맨발 고중량 점프(점프보드) 금지 · 아킬레스건 반동 스트레칭(Bouncing) 금지',
    sourceLabelKo: VERIFIED_VIDEOS_BY_APPARATUS.reformer.primary.channelName,
    sourceUrl: VERIFIED_VIDEOS_BY_APPARATUS.reformer.primary.url,
    steps: [
      {
        exerciseId: 'ex-footwork-01',
        labelKo: '리포머 풋워크 (아치 돔 · 힐 · 러닝 & 프랜싱 원심성 이완)',
        apparatusBadgeKo: '리포머 · 2 Red + 1 Blue',
        durationMin: 6,
        springsNoteKo: '2 Red + 1 Blue',
        cueNoteKo: '풋바 아래로 한쪽 뒤꿈치를 3초간 깊숙이 내리며 가자미근·비복근·족저근막을 부드럽게 신장',
        blockCategory: 'footwork',
        classSection: 'main',
      },
      {
        exerciseId: 'original-chair-supported-calf-raise',
        labelKo: '운다 체어 핸들 지지 카프 레이즈 & 발목 고유수용성 강화',
        apparatusBadgeKo: '체어 · 핸들 지지',
        durationMin: 5,
        springsNoteKo: '양손 핸들 지지',
        cueNoteKo: '뒤꿈치가 안팎으로 흔들리지 않도록 엄지발가락 뿌리 지지력을 유지하며 수직 상승·하강',
        blockCategory: 'lower-body',
        classSection: 'main',
      },
      {
        exerciseId: 'original-barrel-supported-ankle',
        labelKo: '래더 지지 발목 모빌리티 & 하지 후면 근막 이완',
        apparatusBadgeKo: '바렐 · 래더 지지',
        durationMin: 4,
        springsNoteKo: '래더 고정 지지',
        cueNoteKo: '발바닥 3점 접지를 느끼며 발목 배측굴곡 가동 범위를 넓히고 호흡 정리',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
      },
    ],
  },
];

export function getApparatusVisualGuide(
  equipmentOrApparatusId: string | undefined | null,
): ApparatusVisualGuideEntry {
  const raw = (equipmentOrApparatusId ?? 'reformer').toLowerCase();
  if (raw === 'mat') {
    return APPARATUS_VISUAL_GUIDE_CATALOG.find((item) => item.id === 'mat')!;
  }
  if (raw === 'chair') {
    return APPARATUS_VISUAL_GUIDE_CATALOG.find((item) => item.id === 'chair')!;
  }
  if (raw === 'cadillac' || raw === 'tower') {
    return APPARATUS_VISUAL_GUIDE_CATALOG.find((item) => item.id === 'cadillac')!;
  }
  if (raw === 'barrel' || raw === 'ladder-barrel' || raw === 'spine-corrector') {
    return APPARATUS_VISUAL_GUIDE_CATALOG.find((item) => item.id === 'barrel')!;
  }
  return APPARATUS_VISUAL_GUIDE_CATALOG.find((item) => item.id === 'reformer')!;
}
