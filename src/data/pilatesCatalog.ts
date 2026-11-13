import { ORIGINAL_MOVEMENTS } from './originalMovements';
import { EXPANDED_MOVEMENTS } from './expandedMovements';
import type {
  ApparatusType,
  BlockMetadata,
  BodyPosition,
  ClassGroupProfile,
  ClassHistoryLog,
  CuratedSequenceProgram,
  FavoriteTag,
  PilatesExercise,
  PropType,
  ReformerBrand,
  SavedSequence,
  SpinalPlane,
} from '../types/pilates';

export const CANONICAL_BLOCKS: BlockMetadata[] = [
  {
    category: "warmup", stepNumber: "01", nameKo: "호흡 & 골반/흉곽 예열", nameEn: "Warm-up & Breath Imprint",
    defaultTargetMin: 4, description: "흉식 호흡 세팅, 중립 골반 및 경추·견갑골 안정화로 본 운동 전 심부 코어를 깨웁니다.", recommendedSprings: "1R 1B / Bodyweight",
  },
  {
    category: "footwork", stepNumber: "02", nameKo: "풋워크 & 하지 정렬", nameEn: "Footwork Alignment",
    defaultTargetMin: 6, description: "패럴렐·필라테스 V·와이드 스탠스로 발목-무릎-고관절 정렬과 하지 협응력을 확립합니다.", recommendedSprings: "2R 1B",
  },
  {
    category: "bridging", stepNumber: "03", nameKo: "브릿징 & 척추 분절", nameEn: "Bridging & Articulation",
    defaultTargetMin: 5, description: "둔근·햄스트링 후면 사슬 활성화와 요추-흉추 분절 움직임(Articulation)을 유도합니다.", recommendedSprings: "2R",
  },
  {
    category: "core", stepNumber: "04", nameKo: "코어 & 헌드레드 시리즈", nameEn: "Core Warm-up & Hundred",
    defaultTargetMin: 6, description: "수파인 스트랩 워크, 헌드레드, 싱글/더블 레그 스트레치로 복횡근과 복사근을 집중 타겟합니다.", recommendedSprings: "1R 1B",
  },
  {
    category: "upper-body", stepNumber: "05", nameKo: "상체 & 로잉/흉추 회전", nameEn: "Arms, Rowing & Rotation",
    defaultTargetMin: 6, description: "시티드/닐링 스트랩 워크, 체스트 익스팬션, 스파인 트위스트로 라운드숄더 교정 및 흉추 회전을 강화합니다.", recommendedSprings: "1R or 1B",
  },
  {
    category: "lower-body", stepNumber: "06", nameKo: "하체 & 스탠딩/런지", nameEn: "Legs, Scooter & Standing",
    defaultTargetMin: 8, description: "스쿠터, 런지, 사이드 스플릿 등 단측성(Unilateral) 밸런스와 중둔근·대퇴사두근 지구력을 끌어올립니다.", recommendedSprings: "1R or 1B",
  },
  {
    category: "plank", stepNumber: "07", nameKo: "플랭크 & 전신 컨트롤", nameEn: "Planks & Scapular Control",
    defaultTargetMin: 4, description: "롱 스트레치, 엘리펀트, 니 스트레치로 전거근 안정성과 전신 파워하우스를 연결합니다.", recommendedSprings: "1R 1B or 1R",
  },
  {
    category: "extension", stepNumber: "08", nameKo: "신전 & 스완/백 익스텐션", nameEn: "Prone Spine Extension",
    defaultTargetMin: 4, description: "풀링 스트랩, 스완, 브레스트 스트로크로 굽은 등을 펴고 척추 기립근과 후면 삼각근을 깨웁니다.", recommendedSprings: "1R",
  },
  {
    category: "feet-in-straps", stepNumber: "09", nameKo: "핏인스트랩 & 고관절 모빌리티", nameEn: "Feet in Straps & Decompression",
    defaultTargetMin: 4, description: "프로그, 레그 써클, 숏스파인 마사지로 내전근·햄스트링 신장 및 고관절 감압을 유도합니다.", recommendedSprings: "1R 1B",
  },
  {
    category: "cooldown", stepNumber: "10", nameKo: "머메이드 & 파이널 롤다운", nameEn: "Mermaid & Final Rolldown",
    defaultTargetMin: 3, description: "측굴 스트레칭(Mermaid)과 스탠딩 롤다운으로 호흡을 정리하고 50분 수업을 우아하게 마무리합니다.", recommendedSprings: "1B",
  },
];

export const APPARATUS_LABELS: Record<ApparatusType, { ko: string; en: string; badge: string; short: string }> = {
  reformer: {"ko":"리포머","en":"Reformer","badge":"REF","short":"리포머"},
  cadillac: {"ko":"캐딜락","en":"Cadillac","badge":"CAD","short":"캐딜락"},
  chair: {"ko":"운다 체어","en":"Wunda Chair","badge":"CHR","short":"체어"},
  barrel: {"ko":"바렐","en":"Barrel","badge":"BRL","short":"바렐"},
  mat: {"ko":"매트","en":"Matwork","badge":"MAT","short":"매트"},
};

export const PROP_LABELS: Record<PropType, { ko: string; en: string }> = {
  none: {"ko":"소도구 없음","en":"No Prop"},
  "mini-ball": {"ko":"미니볼","en":"Mini Ball"},
  "magic-circle": {"ko":"써클링","en":"Magic Circle"},
  "foam-roller": {"ko":"폼롤러","en":"Foam Roller"},
  bosu: {"ko":"보수","en":"BOSU"},
  theraband: {"ko":"탄력 밴드 · 종류 미지정","en":"Resistance Band · unspecified type"},
  "toning-ball": {"ko":"토닝볼","en":"Toning Balls"},
  "fitness-ball": {"ko":"짐볼","en":"Fitness Ball"},
  "loop-band": {"ko":"루프 밴드","en":"Loop Band"},
  "tube-band": {"ko":"튜브 밴드","en":"Tube Band"},
  "long-band": {"ko":"롱 밴드","en":"Long Band"},
  dumbbell: {"ko":"가벼운 덤벨","en":"Light Dumbbells"},
  sliders: {"ko":"슬라이더","en":"Sliders"},
  "yoga-block": {"ko":"요가 블록","en":"Yoga Block"},
};

export const SPINAL_PLANE_LABELS: Record<SpinalPlane, { ko: string; en: string; symbol: string }> = {
  flexion: {"ko":"굴곡 (Flexion)","en":"Flexion","symbol":"⌒"},
  extension: {"ko":"신전 (Extension)","en":"Extension","symbol":"⌣"},
  lateral: {"ko":"측굴 (Lateral)","en":"Lateral Flexion","symbol":"∿"},
  rotation: {"ko":"회전 (Rotation)","en":"Rotation","symbol":"↻"},
  neutral: {"ko":"중립 안정화 (Neutral)","en":"Neutral Spine","symbol":"━"},
};

export const POSITION_LABELS: Record<BodyPosition, { ko: string; en: string }> = {
  supine: {"ko":"수파인 (누운 자세)","en":"Supine"},
  prone: {"ko":"프론 (엎드린 자세)","en":"Prone"},
  "side-lying": {"ko":"사이드 (옆으로 누운)","en":"Side-Lying"},
  seated: {"ko":"시티드 (앉은 자세)","en":"Seated"},
  kneeling: {"ko":"닐링 (무릎 선 자세)","en":"Kneeling"},
  standing: {"ko":"스탠딩 (선 자세)","en":"Standing"},
  quadruped: {"ko":"쿼드러페드 (네발기기)","en":"Quadruped"},
};

export const FAVORITE_TAG_META: Record<FavoriteTag, { label: string; symbol: string; toneClass: string }> = {
  none: {"label":"일반 보관","symbol":"♡","toneClass":"tag-none"},
  signature: {"label":"내 시그니처","symbol":"★","toneClass":"tag-signature"},
  "member-love": {"label":"회원님 인기","symbol":"♥","toneClass":"tag-member"},
  "rehab-posture": {"label":"정렬·가동성","symbol":"✚","toneClass":"tag-rehab"},
  "burn-sculpt": {"label":"강도 높이기","symbol":"⚡","toneClass":"tag-burn"},
};

export const REFORMER_BRAND_META: Record<ReformerBrand, { nameKo: string; nameEn: string; note: string; springMapping: Record<string, string> }> = {
  "balanced-body": {"nameKo":"밸런스드 바디 (Balanced Body)","nameEn":"Balanced Body","note":"Red(강) · Blue(중) · Yellow(약) · Green(특강)","springMapping":{"2R 1B":"2 Red, 1 Blue (중강)","2R":"2 Red (중상)","1R 1B":"1 Red, 1 Blue (중)","1R":"1 Red (기본)","1R 1Y":"1 Red, 1 Yellow (중약)","1B":"1 Blue (가벼움/코어)","1B 1Y":"1 Blue, 1 Yellow (약)","1Y":"1 Yellow (초경량/제어)","Bodyweight":"무스프링 / 체중 저항"}},
  intopilates: {"nameKo":"인투필라테스 / 모던 국내 표준","nameEn":"IntoPilates / KR Studio","note":"Red(강) · Blue(중) · Yellow(약) · Green(최강)","springMapping":{"2R 1B":"빨강 2 + 파랑 1 (풋워크 표준)","2R":"빨강 2 (브릿징/하체)","1R 1B":"빨강 1 + 파랑 1 (스트랩 표준)","1R":"빨강 1 (상체/런지)","1R 1Y":"빨강 1 + 노랑 1 (중약)","1B":"파랑 1 (코어/머메이드)","1B 1Y":"파랑 1 + 노랑 1 (상체 섬세)","1Y":"노랑 1 (고난도 코어 제어)","Bodyweight":"스프링 없음 (맨몸/소도구)"}},
  stott: {"nameKo":"스탓 / 메리듀 (Stott Merrithew)","nameEn":"Stott / Merrithew","note":"Red(1.0 Full) · Blue(0.5 Half) · White(0.25 Quarter)","springMapping":{"2R 1B":"2 Red + 1 Blue (2.5 Springs)","2R":"2 Red (2.0 Springs)","1R 1B":"1 Red + 1 Blue (1.5 Springs)","1R":"1 Red (1.0 Spring)","1R 1Y":"1 Red + 1 White (1.25 Springs)","1B":"1 Blue (0.5 Spring)","1B 1Y":"1 Blue + 1 White (0.75 Spring)","1Y":"1 White (0.25 Spring)","Bodyweight":"No Springs (Mat/Box)"}},
  classical: {"nameKo":"클래식 그라츠 (Gratz Classical)","nameEn":"Gratz / Classical","note":"동일 장력 스프링 4개 (#1 ~ #4)","springMapping":{"2R 1B":"4 Springs (Footwork Standard)","2R":"3 Springs (Heavy)","1R 1B":"2 Springs (Hundred / Straps)","1R":"2 Springs (Medium)","1R 1Y":"2 Springs (Light-Med)","1B":"1 Spring (Light Control)","1B 1Y":"1 Spring (Delicate)","1Y":"1 Outside Spring (Feather)","Bodyweight":"0 Springs"}},
};

const LEGACY_CURATED_EXERCISES: PilatesExercise[] = [
  {
    id: "ex-warmup-01", nameKo: "펠빅 클락 & 흉식 호흡 임프린팅", nameEn: "Pelvic Clock & Ribcage Breathing", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "warmup", spinalPlanes: ["neutral","flexion"], bodyPosition: "supine",
    level: "1.0", defaultDurationMin: 4, isUnilateral: false, springs: "2R 1B",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["횡격막","복횡근","골반저근","다열근"],
    breathPattern: "코로 깊게 들쉬며 갈비뼈 양옆 확장 → 입으로 가늘게 내쉬며 아랫배 납작하게 닫기", cues: ["무릎 사이에 미니볼을 가볍게 끼워 내전근 텐션을 깨워주세요.","꼬리뼈(6시)와 배꼽(12시) 사이로 작은 구슬을 굴리듯 골반 경사를 부드럽게 만듭니다.","어깨와 귀 사이가 멀어지도록 쇄골을 옆으로 길게 펼쳐주세요."], precautions: "목과 승모근에 과긴장이 들어가지 않도록 턱이 들리지 않게 유도합니다.", layers: {"easy":"두 발을 풋바에 안정적으로 두고 골반 12시-6시 틸팅만 집중 진행","standard":"미니볼 30% 조이기 + 골반 시계 방향/반시계 방향 12방위 서클","hard":"두 다리 테이블탑(Tabletop) 유지 상태에서 골반 중립 고정 & 암 플로트 호흡"},
    youtube: {"videoId":"","channelName":"자료 미확인","videoTitle":"","startSec":0,"url":"","note":"자료 미확인: 리포머 미니볼 펠빅 클락 & 흉식 호흡 임프린팅과 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(K56Z12XNQ5c)을 제거했습니다."}, favoriteTag: "signature",
  },
  {
    id: "ex-warmup-02", nameKo: "캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치", nameEn: "Cadillac Roll-Down Bar Cat & Thoracic Opener", apparatus: "cadillac",
    props: ["foam-roller"], blockCategory: "warmup", spinalPlanes: ["flexion","extension"], bodyPosition: "kneeling",
    level: "1.0", defaultDurationMin: 4, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["척추기립근","광배근","전거근","복직근"],
    breathPattern: "들쉬며 정수리 길게 세우기 → 내쉬며 정수리부터 분절해 바를 앞으로 밀어내기", cues: ["겨드랑이 아래 전거근을 끌어내려 롤다운 바를 누르는 힘을 유지하세요.","허리가 꺾이지 않도록 배꼽을 등 쪽으로 당기며 C-커브를 먼저 만듭니다.","하단에서 흉추를 길게 신전하며 가슴을 매트 쪽으로 부드럽게 녹여냅니다."], precautions: "손목이 꺾이지 않도록 손등과 전완근 일직선을 유지합니다.", layers: {"easy":"양반다리(Seated) 자세에서 짧은 가동범위로 C-커브 분절만 진행","standard":"톨 닐링(Tall Kneeling) 자세에서 롤다운 + 하단 스완 신전 연결","hard":"한 손씩 교차 잡고 흉추 로테이션(Thoracic Saw) 추가"},
    youtube: {"videoId":"7ZFi1eX9z_0","channelName":"Posture Pilates","videoTitle":"Pilates Cadillac, Roll Down Bar, Part 1 #posturepilates #mobility #pilatesequipment #tutorial","startSec":0,"url":"https://www.youtube.com/watch?v=7ZFi1eX9z_0","note":"공개 oEmbed 확인 완료 (Posture Pilates · 캐딜락 롤다운 바 가동성 튜토리얼)","region":"global"}, favoriteTag: "rehab-posture",
  },
  {
    id: "ex-warmup-03", nameKo: "매트 폼롤러 흉추 릴리즈 & 립케이지 암써클", nameEn: "Foam Roller Thoracic Release & Arm Circles", apparatus: "mat",
    props: ["foam-roller"], blockCategory: "warmup", spinalPlanes: ["neutral","extension"], bodyPosition: "supine",
    level: "1.0", defaultDurationMin: 4, isUnilateral: false, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["소흉근","능형근","심부경추굴곡근","복횡근"],
    breathPattern: "들쉬며 양팔 만세 → 내쉬며 큰 원을 그려 골반 옆으로 회수", cues: ["폼롤러 위에 뒤통수부터 꼬리뼈까지 척추 전체가 빈틈없이 닿도록 정렬하세요.","팔을 머리 위로 넘길 때 갈비뼈가 들뜨지 않게 명치를 지긋이 닫아줍니다.","날개뼈가 폼롤러를 부드럽게 감싸 안는 느낌을 느껴보세요."], precautions: "어깨 충돌증후군이 있는 회원님은 팔꿈치를 살짝 구부려 범위를 줄입니다.", layers: {"easy":"두 발 바닥 지지 상태에서 작은 암써클 진행","standard":"광범위 암써클 + 스캐퓰라 프로트랙션/리트랙션 연결","hard":"한 다리씩 테이블탑 마칭(Marching) 결합하여 코어 흔들림 제어"},
    youtube: {"videoId":"rr38TSdDIfY","channelName":"Jessica Valant","videoTitle":"Pilates Foam Roller Exercises - Full Body Foam Roller Workout","startSec":0,"url":"https://www.youtube.com/watch?v=rr38TSdDIfY","note":"공개 oEmbed 확인 완료 (Jessica Valant · 매트 폼롤러 필라테스 루틴)","region":"global"}, favoriteTag: "member-love",
  },
  {
    id: "ex-footwork-01", nameKo: "리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱", nameEn: "Reformer Footwork Series (Heels, Arches, Pilates V, Running)", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "footwork", spinalPlanes: ["neutral"], bodyPosition: "supine",
    level: "1.0", defaultDurationMin: 6, isUnilateral: false, springs: "2R 1B",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["대퇴사두근","내전근","둔근","비복근/가자미근"],
    breathPattern: "내쉬며 캐리지 길게 밀어내기 → 들쉬며 저항 느끼며 천천히 복귀", cues: ["발뒤꿈치(Heels) → 발아치(Arches) → 필라테스 V(Toes V) → 텐던 스트레치(Running) 순서로 이어갑니다.","무릎을 다 폈을 때 관절을 과신전(Locking)하지 말고 허벅지 안쪽을 지퍼 잠그듯 끌어올리세요.","돌아올 때 캐리지가 쿵 부딪히지 않도록 마지막 5cm를 속근육으로 브레이크 걸어줍니다."], precautions: "무릎이 안쪽(X자)으로 모이지 않도록 두 번째 발가락과 슬개골 라인을 일치시킵니다.", layers: {"easy":"2R 1B 기본 세팅으로 각 포지션 8회씩 정석 리듬 진행","standard":"발목 또는 허벅지 사이에 미니볼 끼우고 상단에서 3카운트 펄스(Pulse) 추가","hard":"스프링 2R로 낮추고 싱글 레그(Single Leg) 바이시클 & 스레드 더 니들 연결"},
    youtube: {"videoId":"QDBzjlhKsco","channelName":"Pilates Anytime","videoTitle":"PA Archives | Pilates Reformer Exercise: Footwork","startSec":0,"url":"https://www.youtube.com/watch?v=QDBzjlhKsco","note":"공개 oEmbed 확인 완료 (Pilates Anytime · 리포머 클래식 풋워크 아카이브)","region":"global"}, favoriteTag: "signature",
  },
  {
    id: "ex-footwork-02", nameKo: "써클링 와이드 세컨드 & 내전근/외전근 풋워크", nameEn: "Magic Circle Wide Second & Abductor Footwork", apparatus: "reformer",
    props: ["magic-circle"], blockCategory: "footwork", spinalPlanes: ["neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "2R 1B",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["중둔근","대퇴근막장근","내전근","대퇴사두근"],
    breathPattern: "내쉬며 링을 밀어내며 캐리지 확장 → 들쉬며 텐션 유지한 채 복귀", cues: ["허벅지 바깥쪽에 써클링을 착용해 중둔근 외전 텐션을 먼저 만든 뒤 캐리지를 밀어냅니다.","캐리지 위에서 골반이 좌우로 흔들리지 않게 양쪽 엉덩이 무게중심을 50:50으로 고정하세요.","탑 포지션에서 써클링을 바깥으로 5회 짧게 벌려 중둔근 자극을 극대화합니다."], precautions: "고관절 외회전 시 발끝 각도와 무릎 방향이 어긋나지 않게 주의합니다.", layers: {"easy":"써클링 없이 풋바 양끝 와이드 힐/토 포지션으로 진행","standard":"써클링 외측 착용(외전) 8회 + 내측 착용(내전) 8회 콤비네이션","hard":"중간 지점(Halfway) 홀드 상태에서 힐 업/다운 카프 엘리베이션 10회 추가"},
    youtube: {"videoId":"","channelName":"자료 미확인","videoTitle":"","startSec":0,"url":"","note":"자료 미확인: 리포머 써클링 와이드 세컨드 및 내·외전근 풋워크와 동작·기구·소도구 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(UItWltVZZmE)을 제거했습니다."}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-footwork-03", nameKo: "운다 체어 시티드 & 스탠딩 풋워크 프레스", nameEn: "Wunda Chair Seated Double Leg & Single Leg Pump", apparatus: "chair",
    props: ["none"], blockCategory: "footwork", spinalPlanes: ["neutral"], bodyPosition: "seated",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "2R",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["대퇴사두근","장요근","복횡근","척추기립근"],
    breathPattern: "들쉬며 코어 세팅 → 내쉬며 정수리는 천장으로, 페달은 바닥으로 프레스", cues: ["좌골(Sit-bones) 두 개를 체어 시트에 수직으로 꽂아 척추를 타워처럼 길게 세웁니다.","페달을 밟아 내릴 때 상체가 뒤로 눕거나 앞으로 쏟아지지 않게 복부 코르셋을 조여주세요.","페달이 올라올 때 다리가 튕겨 올라오지 않게 허벅지 뒤쪽 힘으로 컨트롤합니다."], precautions: "고관절 굴곡근(장요근)만 과사용되지 않도록 아랫배를 먼저 끌어올립니다.", layers: {"easy":"양손으로 시트 양옆을 가볍게 잡고 양발 힐/토 프레스 진행","standard":"양팔 지니(Genie) 포지션 또는 만세 상태에서 더블 레그 펌프","hard":"한 다리 뻗어 올린 상태에서 싱글 레그 펌프 좌/우 각 8회"},
    youtube: {"videoId":"iPEpNe3OhcA","channelName":"Merrithew®","videoTitle":"Exercise of the Month | STOTT PILATES®: Footwork on Stability Chair","startSec":0,"url":"https://www.youtube.com/watch?v=iPEpNe3OhcA","note":"공개 oEmbed 확인 완료 (Merrithew® · STOTT PILATES 스태빌리티 체어 풋워크)","region":"global"}, favoriteTag: "rehab-posture",
  },
  {
    id: "ex-bridging-01", nameKo: "리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬", nameEn: "Reformer Pelvic Lift Articulation & Hamstring Curl", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "bridging", spinalPlanes: ["flexion","extension","neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 5, isUnilateral: false, springs: "2R",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["대둔근","햄스트링","척추분절근","내전근"],
    breathPattern: "내쉬며 꼬리뼈부터 말아 브릿지 업 → 들쉬며 밀고 → 내쉬며 당긴 후 윗등부터 분절 하강", cues: ["주의! 브릿지 전 반드시 헤드레스트를 완전히 평평하게(Flat) 내려 경추를 보호하세요.","골반을 들어 올릴 때 캐리지가 전혀 밀리지 않도록 뒤꿈치로 풋바를 내 몸 쪽으로 끌어당기는 힘을 씁니다.","브릿지 탑에서 무릎-골반-어깨 사선 라인을 유지한 채 캐리지를 15cm만 밀었다가 햄스트링 힘으로 당겨옵니다."], precautions: "헤드레스트는 반드시 Flat! 햄스트링 쥐가 잘 나는 회원님은 풋바에 발아치(Arches)를 대거나 스프링을 2R 1B로 높입니다.", layers: {"easy":"스프링 2R 1B 세팅 후 캐리지 고정 상태에서 척추 분절 업/다운만 진행","standard":"스프링 2R + 무릎 사이 미니볼 조이며 브릿지 홀드 & 햄스트링 컬 6회","hard":"싱글 레그 브릿지(한 다리 천장 뻗기) 상태에서 캐리지 인/아웃 컨트롤"},
    youtube: {"videoId":"lqaIxlzhBw4","channelName":"Merrithew®","videoTitle":"STOTT PILATES® for Triathletes | Bike Training: Shoulder Bridge","startSec":0,"url":"https://www.youtube.com/watch?v=lqaIxlzhBw4","note":"공개 oEmbed 확인 완료 (Merrithew® · STOTT PILATES 리포머 숄더 브릿지)","region":"global"}, favoriteTag: "signature",
  },
  {
    id: "ex-bridging-02", nameKo: "캐딜락 타워 바 파라키트 & 숄더 브릿지", nameEn: "Cadillac Tower Bar Shoulder Bridge & Parakeet Prep", apparatus: "cadillac",
    props: ["none"], blockCategory: "bridging", spinalPlanes: ["flexion","extension"], bodyPosition: "supine",
    level: "2.0", defaultDurationMin: 5, isUnilateral: false, springs: "2R",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["둔근","햄스트링","척추기립근","복횡근"],
    breathPattern: "내쉬며 푸시스루 바를 발볼로 밀어 올리며 척추 분절 브릿지", cues: ["하단 스프링이 걸린 푸시스루 바에 발아치를 걸고, 바가 흔들리지 않게 둔근으로 수직 지지합니다.","윗등(견갑골 하각)부터 한 마디씩 매트에 도장 찍듯 천천히 내려오며 척추 마디마디를 늘려주세요.","탑 포지션에서 무릎을 접었다 펴며 발목과 고관절 굴곡 제어를 연결합니다."], precautions: "하단 스프링 안전 스트랩 체결 여부를 반드시 확인하고 발이 미끄러지지 않게 논슬립 양말을 착용합니다.", layers: {"easy":"매트 바닥에 두 발을 두고 롤다운 바를 손으로 잡은 채 기본 브릿지 진행","standard":"타워 바에 양발 걸고 브릿지 업/다운 분절 + 니 벤드 6회","hard":"한 발은 바 지지, 반대 발은 천장 뻗어 싱글 레그 숄더 브릿지 연결"},
    youtube: {"videoId":"EKSYuCaEX7s","channelName":"Optimize Wellness","videoTitle":"Pilates Shoulder Bridge on the Tower","startSec":0,"url":"https://www.youtube.com/watch?v=EKSYuCaEX7s","note":"공개 oEmbed 확인 완료 (Optimize Wellness · 캐딜락/타워 숄더 브릿지)","region":"global"}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-core-01", nameKo: "리포머 수파인 암워크 & 헌드레드 시리즈", nameEn: "Reformer Supine Arms, Coordination & The Hundred", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "core", spinalPlanes: ["flexion","neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "low", headrest: "up", targetMuscles: ["복직근","복횡근","내/외복사근","광배근"],
    breathPattern: "5카운트 스타카토 들쉬고(In 2-3-4-5) → 5카운트 스타카토 내쉬기(Out 2-3-4-5)", cues: ["양손에 핸드 스트랩을 걸고 손목이 꺾이지 않게 손끝을 멀리 뻗어 광배근부터 연결합니다.","컬업(Curl-up) 시 턱 밑에 계란 하나 공간을 유지하고 시선은 허벅지 안쪽을 바라보세요.","헌드레드 펌핑 시 어깨가 흔들리지 않게 몸통은 단단히 고정하고 팔만 골반 옆에서 힘차게 위아래로 흔듭니다."], precautions: "목 통증 호소 시 헤드레스트를 올린 상태에서 머리를 내려놓고(Head down)하거나 한 손으로 뒤통수를 받치게 합니다.", layers: {"easy":"머리 내려놓고(Head Down) 다리 테이블탑에서 암 프레스 & 암 써클 진행","standard":"상체 컬업 + 테이블탑에서 헌드레드 50카운트 + 45도 다리 뻗어 50카운트","hard":"코디네이션(Coordination: 뻗기-오픈/클로즈-무릎 접기-상체 하강) 6회 추가"},
    youtube: {"videoId":"vx4DdBWY6kQ","channelName":"Pilates Anytime","videoTitle":"PA Archives | Pilates Reformer Exercise: The Hundred","startSec":0,"url":"https://www.youtube.com/watch?v=vx4DdBWY6kQ","note":"공개 oEmbed 확인 완료 (Pilates Anytime · 리포머 헌드레드 아카이브)","region":"global"}, favoriteTag: "signature",
  },
  {
    id: "ex-core-02", nameKo: "숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)", nameEn: "Short Box Abdominal Series (Round, Flat, Twist & Reach)", apparatus: "reformer",
    props: ["none"], blockCategory: "core", spinalPlanes: ["flexion","rotation","neutral"], bodyPosition: "seated",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "2R 1B",
    box: "short-box", footbar: "down", headrest: "flat", targetMuscles: ["복직근","내복사근","외복사근","장요근","다열근"],
    breathPattern: "들쉬며 꼬리뼈 말아 하프 롤백 → 내쉬며 복부 스쿱(Scoop)으로 복귀", cues: ["풋 스트랩에 두 발을 단단히 걸고 박스 앞쪽에서 손바닥 한 뼘 뒤에 앉아 세팅합니다.","라운드백: 아랫배를 등 뒤로 깊게 파내며(C-Curve) 어깨는 긴장을 풀고 내려갑니다.","트위스트 & 리치: 골반과 두 무릎 높이가 절대 밀리지 않게 고정하고 갈비뼈(흉곽)만 회전하세요."], precautions: "요추 디스크 병력이 있는 회원님은 라운드백 대신 중립 척추 힌지(Flat Back Hinge) 위주로 진행합니다.", layers: {"easy":"양손을 가슴 앞에 포개고 짧은 각도(30도) 하프 롤백 진행","standard":"다웰 바(Dowel Bar)를 들고 라운드백 6회 + 플랫백 6회 + 트위스트 6회","hard":"어라운드 더 월드(Around the World) 및 트리(Tree) 스트레칭 연결"},
    youtube: {"videoId":"iUv1gxF5JcA","channelName":"한님쌤 필라테스","videoTitle":"리포머 숏박스 제대로 하는 법 Pilates Reformer Shortbox Series","startSec":0,"url":"https://www.youtube.com/watch?v=iUv1gxF5JcA","note":"공개 oEmbed 확인 완료 (한님쌤 필라테스 · 리포머 숏박스 시리즈)","region":"kr"}, favoriteTag: "member-love",
  },
  {
    id: "ex-core-03", nameKo: "매트 필라테스 앱 파이브 (Ab Series of 5)", nameEn: "Classical Mat Ab Series of 5 (Single/Double Leg Stretch, Scissors, Criss-Cross)", apparatus: "mat",
    props: ["magic-circle"], blockCategory: "core", spinalPlanes: ["flexion","rotation"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["상복부","하복부","내/외복사근","고관절 굴곡근"],
    breathPattern: "동작 교대마다 짧은 호흡 내쉬기 (후! 후!)", cues: ["날개뼈 하각이 매트에서 떨어진 컬업 높이를 5가지 동작 내내 일정하게 유지하는 것이 핵심입니다.","크리스크로스(Criss-Cross) 시 팔꿈치만 무릎으로 가져가지 말고, 겨드랑이 전체를 반대쪽 무릎으로 회전하세요.","허리가 매트에서 뜨지 않도록 배꼽을 매트 바닥에 단단히 압착합니다."], precautions: "경추 피로도가 높을 경우 중간중간 머리를 내리고 다리 동작만 이어가도록 안내합니다.", layers: {"easy":"머리 내려놓고 다리 각도를 천장 쪽(75도)으로 높여 하복부 안정화 집중","standard":"싱글 레그 → 더블 레그 → 시저스 → 로워 리프트 → 크리스크로스 각 8회","hard":"발목 또는 손에 써클링/토닝볼을 들고 정지 카운트(2초 홀드) 추가"},
    youtube: {"videoId":"DhO6u5pB0xo","channelName":"Lottie Murphy","videoTitle":"CLASSICAL PILATES WORKOUT in 20 Minutes | Lottie Murphy Pilates","startSec":0,"url":"https://www.youtube.com/watch?v=DhO6u5pB0xo","note":"공개 oEmbed 확인 완료 (Lottie Murphy · 클래식 매트 필라테스 루틴)","region":"global"}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-upper-01", nameKo: "리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리", nameEn: "Kneeling Chest Expansion, Hug a Tree & Seated Rotation", apparatus: "reformer",
    props: ["none"], blockCategory: "upper-body", spinalPlanes: ["rotation","neutral","extension"], bodyPosition: "kneeling",
    level: "1.5", defaultDurationMin: 6, isUnilateral: true, springs: "1R",
    box: "none", footbar: "low", headrest: "flat", targetMuscles: ["광배근","후면삼각근","능형근","외복사근","삼두근"],
    breathPattern: "들쉬며 스트랩을 골반 뒤로 당겨 홀드(고개 좌/우 회전) → 내쉬며 천천히 복귀", cues: ["스트랩을 당길 때 어깨가 앞으로 말리지 않도록 쇄골을 활짝 열고 날개뼈를 뒷주머니 쪽으로 끌어내립니다.","톨 닐링(무릎 선 자세)에서 허벅지 앞쪽과 엉덩이에 힘을 줘서 골반이 뒤로 빠지지 않게 벽처럼 세워주세요.","시티드 트위스트로 전환 시 좌우 각 8회씩 갈비뼈 전체가 회전문처럼 돌아가도록 유도합니다."], precautions: "무릎이 예민한 회원님은 캐리지 위에 패드를 덧대거나 엉덩이를 뒤꿈치에 살짝 내려놓고(Low Kneeling) 진행합니다.", layers: {"easy":"스프링 1B 세팅 후 양반다리(Seated) 또는 로우 닐링에서 진행","standard":"스프링 1R + 톨 닐링 체스트 익스팬션 8회 + 스파인 트위스트 좌/우 각 8회","hard":"한 손에 두 스트랩을 모아 잡고 닐링 보우 앤 애로우(Bow & Arrow) 로테이션 연결"},
    youtube: {"videoId":"khdMmxqpEXk","channelName":"EM  Pilates Studio","videoTitle":"Chest Expansion on the Reformer | Pilates for Strength, Control & Better Posture | STOTT Pilates","startSec":0,"url":"https://www.youtube.com/watch?v=khdMmxqpEXk","note":"공개 oEmbed 확인 완료 (EM  Pilates Studio · 리포머 체스트 익스팬션)","region":"global"}, favoriteTag: "rehab-posture",
  },
  {
    id: "ex-upper-02", nameKo: "리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)", nameEn: "Reformer Rowing Back & Front (Serve a Tray & Shave the Head)", apparatus: "reformer",
    props: ["none"], blockCategory: "upper-body", spinalPlanes: ["flexion","extension","neutral"], bodyPosition: "seated",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "1B",
    box: "none", footbar: "low", headrest: "flat", targetMuscles: ["전면/측면 삼각근","상완이두근","상완삼두근","하부승모근","전거근"],
    breathPattern: "내쉬며 팔을 앞으로 뻗어 트레이 서빙 → 들쉬며 가슴 활짝 열고 암써클", cues: ["두 다리를 앞으로 뻗고(햄스트링이 타이트하면 양반다리) 척추를 정수리까지 수직으로 세워 앉습니다.","써브 어 트레이(Serve a Tray): 팔꿈치를 옆구리에서 앞으로 뻗을 때 몸통이 뒤로 밀리지 않게 복부로 버텨주세요.","더 쉐이브(The Shave): 뒤통수 뒤에서 엄지손가락을 맞대고 정수리 사선 위로 팔꿈치를 펴며 삼두근과 하부승모근을 씁니다."], precautions: "승모근이 귀 쪽으로 솟지 않도록 어깨 하강 큐잉을 지속적으로 제공합니다.", layers: {"easy":"양반다리(Cross-legged)로 앉아 짧은 레버리지로 암 프레스 진행","standard":"1B 스프링에서 백 로잉 6회 + 써브 어 트레이 8회 + 더 쉐이브 8회","hard":"1R 스프링으로 올려 로잉 인투 더 스턴(Into the Sternum) 풀 시퀀스 완성"},
    youtube: {"videoId":"6iDJKeUAS5k","channelName":"필라나라","videoTitle":"필라테스 리포머 동작 : Back Rowing / 내가 연습하려고 찍어보는 영상🤍 #필라테스 #필라테스동작","startSec":0,"url":"https://www.youtube.com/watch?v=6iDJKeUAS5k","note":"공개 oEmbed 확인 완료 (필라나라 · 리포머 백 로잉 동작)","region":"kr"}, favoriteTag: "member-love",
  },
  {
    id: "ex-upper-03", nameKo: "캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스", nameEn: "Cadillac Standing Arm Springs: Boxing, Salute & Chest Expansion", apparatus: "cadillac",
    props: ["none"], blockCategory: "upper-body", spinalPlanes: ["rotation","neutral"], bodyPosition: "standing",
    level: "1.5", defaultDurationMin: 6, isUnilateral: true, springs: "1R 1Y",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["전면삼각근","대흉근","삼두근","내/외복사근"],
    breathPattern: "내쉬며 펀치 & 몸통 트위스트 → 들쉬며 중심 복귀", cues: ["캐딜락 기둥을 등지고 서서 두 발을 골반 너비로 단단히 뿌리내리고 몸통을 5도만 살짝 앞으로 기울입니다(Pilates Stance).","복싱(Boxing) 시 한 팔은 앞으로 뻗고 반대 팔은 뒤로 당기며 흉추 회전을 함께 연결하세요.","스프링 장력에 몸통이 뒤로 끌려가지 않도록 발가락 끝까지 바닥을 누르는 힘을 유지합니다."], precautions: "손목이 꺾이지 않게 그립을 주먹 쥐듯 단단히 잡도록 지도합니다.", layers: {"easy":"한 발을 앞에 둔 런지 스탠스(Split Stance)에서 안정적으로 진행","standard":"필라테스 V 스탠스에서 체스트 프레스 8회 + 복싱 트위스트 10회 + 살루트 8회","hard":"까치발(Relevé) 밸런스 유지한 상태에서 전체 암 시리즈 진행"},
    youtube: {"videoId":"pbwDO-mK8rg","channelName":"한님쌤 필라테스","videoTitle":"캐딜락 필라테스 | 상체 강화 Upper Body Strengthening with Cadillac Arm Spring","startSec":0,"url":"https://www.youtube.com/watch?v=pbwDO-mK8rg","note":"공개 oEmbed 확인 완료 (한님쌤 필라테스 · 캐딜락 암 스프링 상체 강화)","region":"kr"}, favoriteTag: "signature",
  },
  {
    id: "ex-lower-01", nameKo: "리포머 스탠딩 스쿠터 & 이브스 런지", nameEn: "Reformer Standing Scooter & Eve’s Lunge Flow", apparatus: "reformer",
    props: ["none"], blockCategory: "lower-body", spinalPlanes: ["neutral","extension"], bodyPosition: "standing",
    level: "1.5", defaultDurationMin: 8, isUnilateral: true, springs: "1R",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["대둔근","중둔근","대퇴사두근","장요근 스트레칭"],
    breathPattern: "내쉬며 뒤쪽 다리 밀어내기 → 들쉬며 앞쪽 지지 다리 무릎 고정한 채 복귀", cues: ["바닥에 지지한 다리의 무릎을 30도 구부려 고정하고, 엉덩이 옆쪽(중둔근)에 체중의 80%를 실어주세요!","캐리지 위 발을 뒤로 밀고 들어올 때 바닥 쪽 무릎은 1mm도 앞뒤로 흔들리지 않아야 둔근에 정확히 들어갑니다.","좌측 3분 30초 진행 후 반대쪽(우측)으로 방향을 바꿔 동일하게 진행합니다."], precautions: "기구 옆에 설 때 미끄럼 방지 패드를 확인하고, 초보자는 처음에 한 손으로 풋바를 가볍게 터치하게 합니다.", layers: {"easy":"양손을 풋바에 얹고 상체 안정성을 확보한 상태에서 스쿠터 진행","standard":"양손 골반 또는 가슴 앞 기도 손(Hands in Prayer)에서 스쿠터 10회 + 펄스 10회 + 풀 런지 연결","hard":"양손에 토닝볼을 들고 팔 동작(바이셉스/로우) 결합 또는 무스프링/1B 경량 제어"},
    youtube: {"videoId":"6lL8ZiX7tw0","channelName":"The Simple Fix by KezaWellness","videoTitle":"Standing Lunge into Scooter Variation | Reformer Pilates Technique Explained","startSec":0,"url":"https://www.youtube.com/watch?v=6lL8ZiX7tw0","note":"공개 oEmbed 확인 완료 (The Simple Fix by KezaWellness · 리포머 스탠딩 런지 & 스쿠터)","region":"global"}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-lower-02", nameKo: "리포머 스탠딩 사이드 스플릿 & 스케이터", nameEn: "Reformer Standing Side Splits & Skater (Heavy & Light)", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "lower-body", spinalPlanes: ["neutral"], bodyPosition: "standing",
    level: "1.5", defaultDurationMin: 8, isUnilateral: true, springs: "1R",
    box: "none", footbar: "down", headrest: "flat", targetMuscles: ["중둔근","소둔근","내전근","대퇴사두근"],
    breathPattern: "내쉬며 캐리지 밀어 스플릿 → 들쉬며 안쪽 허벅지 힘으로 닫기", cues: ["한 발은 플랫폼에, 한 발은 캐리지 끝에 평행(Parallel)하게 두고 승마 자세(Squat)로 낮게 앉아 시작합니다.","무거운 스프링(1R)에서는 바깥쪽 중둔근 힘으로 밀어내고, 가벼운 스프링(1Y)에서는 안쪽 내전근 힘으로 끌어당깁니다.","상체가 위아래로 바운스되지 않게 천장이 머리 바로 위에 있다고 상상하며 높이를 고정하세요."], precautions: "캐리지에 올라탈 때 반드시 플랫폼 쪽 발부터 먼저 딛고, 내려올 때도 캐리지 발부터 먼저 내려오도록 안전 수칙을 강조합니다!", layers: {"easy":"스프링 1R에서 직립(Standing Straight Legs) 사이드 스플릿으로 안전하게 진행","standard":"스케이터 스쿼트 자세 유지 + 사이드 스플릿 10회 + 캐리지 펄스 10회 (좌/우 교대)","hard":"스프링 1Y(경량)로 변경 후 내전근 어덕션 스플릿 + 암 레이즈 결합"},
    youtube: {"videoId":"HGMdglPKq9A","channelName":"한님쌤 필라테스","videoTitle":"사이드 스플릿 완전 정복 (세팅, 발 너비, 스프링) 필라테스 강사 꼭 보세요.","startSec":0,"url":"https://www.youtube.com/watch?v=HGMdglPKq9A","note":"공개 oEmbed 확인 완료 (한님쌤 필라테스 · 리포머 사이드 스플릿 티칭 가이드)","region":"kr"}, favoriteTag: "signature",
  },
  {
    id: "ex-lower-03", nameKo: "운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머", nameEn: "Wunda Chair Standing Forward Step-Up & Mountain Climber", apparatus: "chair",
    props: ["none"], blockCategory: "lower-body", spinalPlanes: ["neutral"], bodyPosition: "standing",
    level: "2.0", defaultDurationMin: 8, isUnilateral: true, springs: "1R 1B",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["대둔근","대퇴사두근","중둔근","코어 밸런스"],
    breathPattern: "내쉬며 시트 위 뒤꿈치로 바닥 밀어 스텝업 → 들쉬며 3카운트 버티며 하강", cues: ["시트 위에 올린 앞발 뒤꿈치(Heel)에 체중을 90% 실어야 무릎이 아닌 엉덩이 아래쪽(Under-butt)이 쓰입니다.","페달이 바닥에 닿기 직전 2cm 위에서 멈춘 뒤 다시 올라가며 둔근의 지속적 긴장(Time Under Tension)을 유지하세요.","마운틴 클라이머로 전환 시 상체 각도는 고정하고 아래쪽 페달만 빠르게 펌핑합니다."], precautions: "균형 감각이 부족한 회원님은 체어 핸들을 장착하거나 벽/폴대 옆에서 한 손을 짚고 진행합니다.", layers: {"easy":"스프링 높게(2R) 걸고 양손 핸들 잡은 상태에서 천천히 스텝업 진행","standard":"양손 골반 짚고 포워드 런지 8회 + 탑에서 마운틴 클라이머 펌핑 12회 (좌/우)","hard":"고잉 업 사이드(Going Up Side / 측면 런지) 및 아라베스크 밸런스 연결"},
    youtube: {"videoId":"byQtt6BvbfM","channelName":"Balanced Body","videoTitle":"Pilates for Athletes : S2E16 : Lunge On The Chair","startSec":0,"url":"https://www.youtube.com/watch?v=byQtt6BvbfM","note":"공개 oEmbed 확인 완료 (Balanced Body · 체어 스탠딩 런지)","region":"global"}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-plank-01", nameKo: "리포머 롱 스트레치 & 엘리펀트 / 니 스트레치", nameEn: "Reformer Long Stretch, Elephant & Knee Stretch Series", apparatus: "reformer",
    props: ["none"], blockCategory: "plank", spinalPlanes: ["neutral","flexion"], bodyPosition: "quadruped",
    level: "1.5", defaultDurationMin: 4, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["복횡근","전거근","광배근","고관절 굴곡근","햄스트링"],
    breathPattern: "들쉬며 플랭크 라인 그대로 어깨가 손목 뒤로 이동 → 내쉬며 복부 힘으로 손목 위로 복귀", cues: ["헤드레스트를 바짝 세워(Up) 두 발뒤꿈치를 지지대처럼 걸고 완벽한 널빤지(Plank) 라인을 만듭니다.","손바닥으로 풋바를 강하게 밀어내 날개뼈 사이가 꺼지지 않게(전거근 활성화) 채워주세요.","엘리펀트(Elephant) 연결 시 발가락을 몸 쪽으로 바짝 당겨 아랫배 스쿱 힘으로 캐리지를 끌어당깁니다."], precautions: "허리가 바닥으로 처지지 않도록 치골을 배꼽 쪽으로 살짝 말아 둔근과 복부를 동시에 조입니다.", layers: {"easy":"무릎을 캐리지에 내려놓은 니 스트레치(Knee Stretch Round/Flat) 및 닐링 플랭크로 진행","standard":"스프링 1R 1B에서 롱 스트레치 6회 + 업 스트레치 6회 + 엘리펀트 8회","hard":"스프링 1R로 낮추고 한 다리 든 싱글 레그 롱 스트레치 & 니즈 오프(Knees Off) 호버링 10회"},
    youtube: {"videoId":"R8hGg8R4mh0","channelName":"Metamorphose - Trening & Dieta","videoTitle":"Long stretch series: Elephant | Pilates Reformer","startSec":0,"url":"https://www.youtube.com/watch?v=R8hGg8R4mh0","note":"공개 oEmbed 확인 완료 (Metamorphose - Trening & Dieta · 리포머 롱 스트레치 & 엘리펀트)","region":"global"}, favoriteTag: "signature",
  },
  {
    id: "ex-plank-02", nameKo: "운다 체어 파이크(Pike) & 플랭크 풀업", nameEn: "Wunda Chair Pull-Up (Pike) & Scapular Plank", apparatus: "chair",
    props: ["none"], blockCategory: "plank", spinalPlanes: ["flexion","neutral"], bodyPosition: "standing",
    level: "2.0", defaultDurationMin: 4, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["복횡근","하복부","전거근","삼각근"],
    breathPattern: "내쉬며 아랫배를 천장으로 낚아채듯 파이크 업 → 들쉬며 페달을 천천히 컨트롤 하강", cues: ["양손은 시트 앞쪽 모서리를 짚고 어깨가 손목 수직선 위에 오도록 세팅합니다.","다리의 힘이 아니라 명치와 아랫배를 천장 쪽으로 끌어올리는 힘으로 페달이 가볍게 떠오르게 만드세요.","내려올 때 끝까지 툭 떨어지지 않고 코어 브레이크를 유지합니다."], precautions: "손목 통증이 있는 회원님은 시트 대신 팔꿈치를 대는 포암 플랭크(Forearm Plank)로 대체합니다.", layers: {"easy":"체어 시트에 팔꿈치를 대고 포암 플랭크 홀드 & 페달 푸시 진행","standard":"스프링 1R 1B에서 더블 레그 파이크 풀업 8회","hard":"오블리크 트위스트 파이크(Twist Pull-Up) 및 싱글 레그 파이크 연결"},
    youtube: {"videoId":"LMLmXJ7EBWE","channelName":"Sunset Pilates Bali","videoTitle":"Sunset Pilates Bali - Pike on Wunda Chair","startSec":0,"url":"https://www.youtube.com/watch?v=LMLmXJ7EBWE","note":"공개 oEmbed 확인 완료 (Sunset Pilates Bali · 운다 체어 파이크)","region":"global"}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-extension-01", nameKo: "리포머 롱박스 풀링 스트랩 & 티-스트랩 스완", nameEn: "Long Box Pulling Straps I & II (Plow & T-Straps Swan)", apparatus: "reformer",
    props: ["none"], blockCategory: "extension", spinalPlanes: ["extension"], bodyPosition: "prone",
    level: "1.5", defaultDurationMin: 4, isUnilateral: false, springs: "1R",
    box: "long-box", footbar: "down", headrest: "flat", targetMuscles: ["척추기립근","광배근","후면삼각근","능형근","대둔근"],
    breathPattern: "들쉬며 스트랩을 골반 옆으로 당기며 흉추 신전(Swan) → 내쉬며 정수리 길게 유지하며 복귀", cues: ["롱박스 앞쪽 모서리에 갈비뼈 가장 아랫부분이 걸치도록 엎드리고, 두 다리는 골반 너비로 모아 엉덩이에 힘을 줍니다.","고개를 먼저 꺾지 마세요! 코끝으로 매트 바닥에 구슬을 굴리듯 경추-흉추 순서로 가슴을 들어 올립니다.","스트랩을 골반 옆 재봉선까지 당겨 새끼손가락이 천장을 향하게 하며 날개뼈를 모읍니다."], precautions: "허리(요추)가 집히는 느낌이 들지 않도록 치골을 박스 바닥에 단단히 누르고 아랫배를 배꼽 쪽으로 들어 올립니다.", layers: {"easy":"낮은 가동범위로 상부 흉추만 살짝 신전(Baby Swan)하며 후면 삼각근 자극 집중","standard":"풀링 스트랩 I (차렷 당기기) 6회 + 풀링 스트랩 II (T자 수평 당기기) 6회","hard":"상단 신전 홀드 상태에서 삼두근 킥백(Tricep Press) 8회 + 브레스트 스트로크 연결"},
    youtube: {"videoId":"1qC1h6TmuZc","channelName":"한님쌤 필라테스","videoTitle":"풀링 스트랩 Pulling Straps 제대로 하는 법  | 리포머 필라테스","startSec":0,"url":"https://www.youtube.com/watch?v=1qC1h6TmuZc","note":"공개 oEmbed 확인 완료 (한님쌤 필라테스 · 리포머 롱박스 풀링 스트랩)","region":"kr"}, favoriteTag: "rehab-posture",
  },
  {
    id: "ex-extension-02", nameKo: "래더 바렐 스완 다이브 & 백 익스텐션", nameEn: "Ladder Barrel Swan Dive & Back Extension Articulation", apparatus: "barrel",
    props: ["none"], blockCategory: "extension", spinalPlanes: ["extension","flexion"], bodyPosition: "prone",
    level: "1.5", defaultDurationMin: 4, isUnilateral: false, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["척추기립근","대둔근","햄스트링","다열근"],
    breathPattern: "들쉬며 정수리부터 아치 그리며 신전 → 내쉬며 아랫배 끌어당기며 바렐 곡선 따라 하강", cues: ["래더 하단 가로대에 발아치를 단단히 걸고 치골이 바렐 정점 살짝 앞에 오도록 세팅합니다.","올라올 때 허리로 꺾어 올라오지 않고, 둔근과 햄스트링을 조여 다리에서부터 에너지를 뻗어 올리세요.","탑에서 양팔을 만세(V-Position)로 뻗어 척추 전체가 긴 활 모양을 그리도록 만듭니다."], precautions: "신전 정점에서 턱이 들리지 않도록 뒷목을 길게 유지합니다.", layers: {"easy":"양손을 이마 아래 포개어 두고 중립 척추(Flat Back)까지만 올라오기","standard":"풀 레인지 바렐 스완 익스텐션 + 암 오픈 서클 8회","hard":"탑에서 흉추 로테이션(Thoracic Twist Left/Right) 결합"},
    youtube: {"videoId":"VWQNwXEZXJk","channelName":"Balanced Body","videoTitle":"Getting the Most Out of Swan on the Ladder Barrel","startSec":0,"url":"https://www.youtube.com/watch?v=VWQNwXEZXJk","note":"공개 oEmbed 확인 완료 (Balanced Body · 래더 바렐 스완)","region":"global"}, favoriteTag: "signature",
  },
  {
    id: "ex-straps-01", nameKo: "리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)", nameEn: "Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine", apparatus: "reformer",
    props: ["none"], blockCategory: "feet-in-straps", spinalPlanes: ["neutral","flexion"], bodyPosition: "supine",
    level: "1.0", defaultDurationMin: 4, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "low", headrest: "up", targetMuscles: ["내전근","햄스트링","장요근 이완","골반 안정화근"],
    breathPattern: "내쉬며 뒤꿈치 밀어 프로그 확장 → 들쉬며 꼬리뼈가 뜨지 않는 범위까지만 다리 들어 올리기", cues: ["두 발아치에 긴 스트랩(Long Loops)을 걸고, 동작 내내 꼬리뼈(Sacrum)가 캐리지 바닥에 무겁게 붙어 있어야 합니다!","레그 써클(Leg Circles) 시 원을 크게 그리는 것보다 골반이 흔들리지 않는 범위 안에서 대퇴골두만 부드럽게 굴리는 것에 집중하세요.","마지막에 피터팬(Peter Pan)과 해피베이비 스트레칭으로 고관절과 내전근을 시원하게 풀어줍니다."], precautions: "숏스파인(Short Spine)으로 이어갈 경우 반드시 헤드레스트를 완전히 평평하게(Flat) 내린 뒤 진행하세요!", layers: {"easy":"꼬리뼈 고정 상태에서 프로그(Frogs) & 로워 앤 리프트(Lower & Lift) 위주 진행","standard":"프로그 8회 + 양방향 레그써클 각 6회 + 오프닝(Openings) + 피터팬 스트레치","hard":"헤드레스트 내린 후 숏스파인 마사지(Short Spine Massage) 분절 5회 연결"},
    youtube: {"videoId":"0bXHRQS5_CE","channelName":"Vanessa Vibes Pilates","videoTitle":"Reformer Pilates Muscles + Moves - Feet in Straps","startSec":0,"url":"https://www.youtube.com/watch?v=0bXHRQS5_CE","note":"공개 oEmbed 확인 완료 (Vanessa Vibes Pilates · 리포머 핏인스트랩)","region":"global"}, favoriteTag: "member-love",
  },
  {
    id: "ex-straps-02", nameKo: "캐딜락 레그 스프링 프로그 & 에어플레인 써클", nameEn: "Cadillac Leg Springs: Supine Frogs, Circles & Walking", apparatus: "cadillac",
    props: ["none"], blockCategory: "feet-in-straps", spinalPlanes: ["neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 4, isUnilateral: false, springs: "2Y",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["내전근","둔근","복횡근","햄스트링"],
    breathPattern: "내쉬며 두 다리를 바닥 쪽으로 길게 뻗어 내리기 → 들쉬며 복부 고정한 채 복귀", cues: ["리포머와 달리 캐딜락 레그 스프링은 좌우가 독립되어 있어 양다리 대칭 밸런스를 잡기에 최고입니다.","양손으로 머리 위 수직 기둥(Vertical Poles)을 잡아 견갑골과 윗등을 매트에 넓게 고정하세요.","두 다리가 각자 따로 놀지 않도록 뒤꿈치끼리 자석이 붙은 것처럼 대칭 속도를 맞춥니다."], precautions: "다리를 내릴 때 허리가 매트에서 과하게 뜨지 않도록 갈비뼈 뒷면을 바닥에 밀착합니다.", layers: {"easy":"무릎을 살짝 구부린 프로그 프레스와 작은 레그 써클로 진행","standard":"스트레이트 레그 로워/리프트 8회 + 써클 8회 + 시저스 워킹(Walking)","hard":"사이드 라잉(Side-Lying) 자세로 돌아누워 싱글 레그 킥 & 데자뷔 연결"},
    youtube: {"videoId":"RJGY2xJ0HAQ","channelName":"Online Pilates Classes by Lesley Logan","videoTitle":"In the Air with Leg Springs on the Cadillac or Tower | Online Pilates Classes","startSec":0,"url":"https://www.youtube.com/watch?v=RJGY2xJ0HAQ","note":"공개 oEmbed 확인 완료 (Online Pilates Classes by Lesley Logan · 캐딜락 레그 스프링)","region":"global"}, favoriteTag: "rehab-posture",
  },
  {
    id: "ex-cooldown-01", nameKo: "리포머 머메이드 측굴 스트레치 & 흉추 로테이션", nameEn: "Reformer Mermaid Lateral Flexion & Saw Rotation", apparatus: "reformer",
    props: ["none"], blockCategory: "cooldown", spinalPlanes: ["lateral","rotation","extension"], bodyPosition: "seated",
    level: "1.0", defaultDurationMin: 3, isUnilateral: true, springs: "1B",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["요방형근","외/내복사근","광배근","늑간근"],
    breathPattern: "들쉬며 풋바 밀어 옆구리 활짝 측굴 → 내쉬며 양손 풋바 잡고 흉추 회전 스트레칭", cues: ["정강이를 숄더레스트에 대고 인어공주(Z-Sit) 자세로 앉아 양쪽 엉덩이를 최대한 바닥에 무겁게 내려놓습니다.","풋바를 밀며 내려갈 때 위쪽 골반이 따라 들리지 않도록 반대쪽으로 팽팽하게 저항(Opposition)하세요.","갈비뼈 사이사이(늑간근)로 깊은 숨을 불어넣으며 수업 동안 조였던 코어와 옆구리를 길게 이완합니다."], precautions: "고관절이나 무릎이 불편한 회원님은 다리를 앞으로 내어 걸터앉거나 양반다리로 진행합니다.", layers: {"easy":"캐리지 옆으로 두 다리를 내리고 걸터앉아(Seated Side) 편안하게 측굴 진행","standard":"Z-Sit 머메이드 측굴 4회 + 양손 풋바 잡고 고양이 등/소 등 스완 스트레칭 (좌/우)","hard":"닐링 머메이드(Kneeling Mermaid) 및 사이드 밴드 코어 컨트롤 연결"},
    youtube: {"videoId":"h5WSRDtD-54","channelName":"유코어필라테스요가","videoTitle":"[리포머 스트레칭] 10. Mermaid (#전주기구필라테스자격증) 기구필라테스 머메이드 동작설명","startSec":0,"url":"https://www.youtube.com/watch?v=h5WSRDtD-54","note":"공개 oEmbed 확인 완료 (유코어필라테스요가 · 리포머 머메이드 스트레칭)","region":"kr"}, favoriteTag: "signature",
  },
  {
    id: "ex-cooldown-02", nameKo: "스탠딩 척추 롤다운 & 센터링 호흡 피날레", nameEn: "Standing Spine Roll-Down & Final Centering Breath", apparatus: "mat",
    props: ["none"], blockCategory: "cooldown", spinalPlanes: ["flexion","neutral"], bodyPosition: "standing",
    level: "1.0", defaultDurationMin: 3, isUnilateral: false, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["척추기립근 이완","햄스트링 이완","후두하근","횡격막"],
    breathPattern: "들쉬며 준비 → 내쉬며 정수리부터 다이빙하듯 분절 롤다운 → 하단에서 호흡 후 롤업", cues: ["두 발을 골반 너비로 두고 발바닥 삼각대(엄지발볼-새끼발볼-뒤꿈치)에 체중을 고르게 실어 섭니다.","뒤에 투명한 벽이 있다고 상상하며 정수리부터 척추를 한 마디씩 벽에서 떼어내듯 내려가세요.","바닥에서 고개를 도리도리 흔들어 목과 어깨의 마지막 긴장까지 툭 털어낸 뒤, 아랫배 힘으로 천천히 쌓아 올라옵니다."], precautions: "어지럼증이 있는 회원님은 너무 오래 고개를 숙이지 않고 무릎을 살짝 구부려 천천히 올라오도록 케어합니다.", layers: {"easy":"무릎을 살짝 구부린 상태에서 편안하게 상체 이완 롤다운 3회","standard":"스탠딩 롤다운 3회 + 양팔 만세 서클 호흡 3회로 50분 수업 클로징","hard":"롤다운 후 매트 플랭크 워킹(Walk-out to Plank) 2회 연결 후 롤업"},
    youtube: {"videoId":"","channelName":"자료 미확인","videoTitle":"","startSec":0,"url":"","note":"자료 미확인: 스탠딩 척추 롤다운 & 센터링 호흡 피날레와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다."}, favoriteTag: "member-love",
  },
  {
    id: "ex-core-04", nameKo: "리포머 리버스 앱스 & 닐링 크런치", nameEn: "Reformer Reverse Abs & Kneeling Ab Crunch", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "core", spinalPlanes: ["flexion"], bodyPosition: "kneeling",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "1B",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["하복부","복횡근","내/외복사근","전거근"],
    breathPattern: "내쉬며 아랫배 동그랗게 말아 무릎을 가슴 쪽으로 당기기 → 들쉬며 중립 복귀", cues: ["풋바를 바라보고 네발기기(Quadruped) 자세에서 두 손으로 프레임이나 숄더레스트를 잡습니다.","팔로 당기는 것이 아니라 아랫배(치골-배꼽)를 둥글게 말아 올리는 힘으로 캐리지를 끌어당기세요.","좌우 무릎 방향을 틀어 오블리크(Oblique) 니 인으로 연결하면 옆구리 자극이 배가됩니다."], precautions: "어깨가 손목 앞으로 밀리지 않도록 견갑대를 단단히 고정합니다.", layers: {"easy":"스프링 1R(보조 장력)에서 작은 범위로 캣 스트레치처럼 당기기","standard":"스프링 1B에서 센터 니 인 10회 + 좌/우 오블리크 니 인 각 8회","hard":"스프링 1Y(초경량) 또는 무릎을 1cm 띄운 호버링 상태에서 진행"},
    youtube: {"videoId":"","channelName":"자료 미확인","videoTitle":"","startSec":0,"url":"","note":"자료 미확인: 리포머 리버스 앱스 & 닐링 크런치와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다."}, favoriteTag: "burn-sculpt",
  },
  {
    id: "ex-lower-04", nameKo: "리포머 사이드 라잉 스트랩 싱글 레그 시리즈", nameEn: "Side-Lying Foot in Strap: Side Kick, Circles & Clam", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "lower-body", spinalPlanes: ["neutral"], bodyPosition: "side-lying",
    level: "1.0", defaultDurationMin: 8, isUnilateral: true, springs: "1R",
    box: "none", footbar: "low", headrest: "up", targetMuscles: ["중둔근","소둔근","대퇴근막장근","외복사근"],
    breathPattern: "내쉬며 다리를 골반 높이로 길게 차내기 → 들쉬며 위쪽 골반 고정한 채 앞으로 스윕", cues: ["옆으로 누웠을 때 아래쪽 옆구리에 개미 한 마리가 지나갈 만큼 작은 터널(Mouse House)을 유지해 골반이 무너지지 않게 합니다.","위쪽 발에 스트랩을 걸고 다리를 앞으로 보낼 때 엉덩이가 뒤로 말리지 않도록 좌골을 벽 쪽으로 길게 뻗어내세요.","좌측 4분 진행 후 반대쪽으로 돌아누워 우측 4분 동일하게 진행합니다."], precautions: "목이 꺾이지 않도록 헤드레스트 위에 작은 베개나 미니볼을 받쳐 경추 일직선을 맞춥니다.", layers: {"easy":"스프링 1B에서 무릎을 구부린 클램쉘(Clamshell) 및 짧은 레그 프레스 진행","standard":"스프링 1R에서 프론트/백 스윕 8회 + 업/다운 8회 + 레그 써클 8회 (좌/우)","hard":"스프링 1R 1B + 바이시클(Bicycle) 및 45도 사선 펄스 12회 추가"},
    youtube: {"videoId":"","channelName":"자료 미확인","videoTitle":"","startSec":0,"url":"","note":"자료 미확인: 리포머 사이드 라잉 스트랩 싱글 레그 시리즈와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다."}, favoriteTag: "member-love", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-reformer-01", nameKo: "[국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결", nameEn: "KR Studio Reformer Footwork to Articulating Bridge Flow", apparatus: "reformer",
    props: ["mini-ball"], blockCategory: "footwork", spinalPlanes: ["neutral","flexion"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "2R 1B",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["대퇴사두근","내전근","둔근","복횡근"],
    breathPattern: "내쉬며 캐리지 밀어내고 골반 중립 유지 → 들쉬며 무릎 정렬 지켜 복귀", cues: ["무릎 사이 미니볼을 가볍게 조여 내전근부터 복부 코어까지 지퍼를 잠그듯 연결합니다.","풋워크 마지막 카운트에서 헤드레스트를 평평하게 내리고 즉시 분절 브릿지로 물 흐르듯 이어갑니다."], precautions: "브릿지 연결 시 반드시 헤드레스트를 Flat으로 내린 뒤 진행하세요.", layers: {"easy":"두 발 패럴렐(Parallel) 10회 + 미니볼 스퀴즈 호흡에만 집중","standard":"패럴렐 → 필라테스 V → 와이드 세컨드 → 카프레이즈 후 펠빅 리프트 연결","hard":"한 다리 테이블탑 싱글 레그 풋워크 8회 + 싱글 레그 브릿지 마칭 추가"},
    youtube: {"videoId":"9h__STRp5dA","channelName":"정혜선","videoTitle":"리포머 50분 풀시퀀스","startSec":0,"url":"https://www.youtube.com/watch?v=9h__STRp5dA","note":"공개 oEmbed 확인 완료 (정혜선 · 리포머 50분 풀시퀀스)","region":"kr"}, favoriteTag: "signature", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-cadillac-01", nameKo: "[국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우", nameEn: "KR Cadillac Push-Through Bar Spine Articulation & Teaser", apparatus: "cadillac",
    props: ["none"], blockCategory: "core", spinalPlanes: ["flexion","extension"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "1B (상단 스프링)",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["복직근","장요근","척추기립근","전거근"],
    breathPattern: "들쉬며 바를 위로 컨트롤 → 내쉬며 턱부터 말아 올려 티저 V-포지션 홀드", cues: ["푸쉬스루바가 올라갈 때 어깨가 따라 올라가지 않도록 겨드랑이 아래 광배근을 먼저 끌어내립니다.","내쉬는 숨에 갈비뼈를 골반 쪽으로 닫으며 명치부터 차례대로 매트에서 떨어집니다."], precautions: "상단 스프링 연결 시 안전 스트랩(Safety Strap) 체결 여부를 반드시 먼저 확인하세요.", layers: {"easy":"두 발을 매트에 지지한 시티드 푸쉬스루(Seated Push-Through) C-커브만 진행","standard":"수파인 롤업 → 상단에서 흉추 신전 오픈 → 분절 롤다운 6회","hard":"두 다리를 45도로 함께 띄우는 풀 티저(Full Teaser) + 암 프레스 5회"},
    youtube: {"videoId":"E_K5eAr-D5M","channelName":"단필라","videoTitle":"캐딜락시퀀스 | 강사레슨 50분수업 | 힘들고 재밌고 알차게🌸","startSec":0,"url":"https://www.youtube.com/watch?v=E_K5eAr-D5M","note":"공개 oEmbed 확인 완료 (단필라 · 캐딜락 50분 시퀀스)","region":"kr"}, favoriteTag: "burn-sculpt", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-reformer-02", nameKo: "[국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스", nameEn: "KR Spicy Reformer Standing Lunge to Arabesque Glute Burn", apparatus: "reformer",
    props: ["none"], blockCategory: "lower-body", spinalPlanes: ["neutral","extension"], bodyPosition: "standing",
    level: "2.0", defaultDurationMin: 8, isUnilateral: true, springs: "1R",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["대둔근","중둔근","햄스트링","코어 밸런스"],
    breathPattern: "들쉬며 지지 다리 고관절 힌지 → 내쉬며 앞꿈치와 둔근 힘으로 캐리지 홈 복귀", cues: ["앞쪽 지지 다리의 무릎이 안쪽으로 무너지지 않도록 두 번째 발가락 라인과 일직선을 유지하세요.","후반 4분에는 양손을 풋바에 짚고 뒷다리를 길게 뻗어 아라베스크 펄스 10회로 연결합니다."], precautions: "균형 감각이 약한 회원님은 풋바에서 손을 떼지 않고 진행하도록 안내합니다.", layers: {"easy":"양손을 풋바에 짚고 무릎을 매트에 대는 닐링 런지 스트레치로 진행","standard":"스탠딩 런지 10회 + 바텀 홀드 뒷다리 스케이팅 8회 (좌/우 교대)","hard":"양손 가슴 앞 합장 노핸즈 런지 + 싱글 레그 아라베스크 프레스 8회"},
    youtube: {"videoId":"J-kF8o1WJoI","channelName":"필라테스 지영쌤","videoTitle":"🌶 리포머 50분 시퀀스 🌶 매운맛 🔥 Reformer advanced sequence 🔥","startSec":0,"url":"https://www.youtube.com/watch?v=J-kF8o1WJoI","note":"공개 oEmbed 확인 완료 (필라테스 지영쌤 · 리포머 50분 시퀀스)","region":"kr"}, favoriteTag: "burn-sculpt", tempo: "athletic-burn",
  },
  {
    id: "ex-kr-barrel-01", nameKo: "[국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전", nameEn: "KR Ladder Barrel Mini-Ball Oblique Side Bend & Swan Flow", apparatus: "barrel",
    props: ["mini-ball"], blockCategory: "extension", spinalPlanes: ["lateral","extension","rotation"], bodyPosition: "side-lying",
    level: "1.5", defaultDurationMin: 6, isUnilateral: true, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["외복사근","내복사근","요방형근","척추기립근"],
    breathPattern: "들쉬며 바렐 곡선을 따라 옆구리 늘리기 → 내쉬며 미니볼을 쥐어짜며 정수리 사선 업", cues: ["래더에 걸친 위쪽 발은 앞쪽, 아래쪽 발은 뒤쪽에 두어 골반이 정면을 바라보게 고정합니다.","양손 사이에 미니볼을 쥐고 올라올 때 어깨가 아닌 위쪽 갈비뼈와 골반 사이를 좁혀 올라오세요."], precautions: "허리 디스크 병력이 있는 회원님은 과도한 회전(트위스트) 대신 측면 굴곡 유지만 진행합니다.", layers: {"easy":"아래쪽 손으로 바렐을 가볍게 지지하며 짧은 가동범위로 사이드 리프트 8회","standard":"양손 미니볼 파지 사이드 밴드 10회 + 상단 흉추 로테이션 6회 (좌/우)","hard":"양팔을 귀 옆으로 길게 뻗어 긴 지렛대(Long Lever) 홀드 5초 추가"},
    youtube: {"videoId":"l3WQl2L__qQ","channelName":"혀니쌤 플라잉요가&필라테스","videoTitle":"[기구필라테스] 바렐 볼 시퀀스 지루할 틈이 없는 50분 수업! 근력 빵빵하게 채워봐요!","startSec":0,"url":"https://www.youtube.com/watch?v=l3WQl2L__qQ","note":"공개 oEmbed 확인 완료 (혀니쌤 플라잉요가&필라테스 · 바렐 볼 50분 시퀀스)","region":"kr"}, favoriteTag: "member-love", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-reformer-03", nameKo: "[국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉", nameEn: "KR Reformer Kneeling Arm Series for Sleek Triceps & Back", apparatus: "reformer",
    props: ["none"], blockCategory: "upper-body", spinalPlanes: ["neutral","rotation"], bodyPosition: "kneeling",
    level: "1.5", defaultDurationMin: 6, isUnilateral: false, springs: "1B",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["상완삼두근","후면삼각근","능형근","광배근"],
    breathPattern: "내쉬며 팔꿈치 고정한 채 스트랩 뻗어내기 → 들쉬며 천천히 90도 복귀", cues: ["팔꿈치가 몸통 옆구리에서 흔들리지 않도록 단단히 고정하고 전완근만 펴내세요.","승모근이 솟지 않도록 정수리는 천장, 날개뼈 아래쪽 끝은 뒷주머니 방향으로 끌어내립니다."], precautions: "1R가 무거운 여성 회원님들께는 1B(파랑 1개)로 낮춰 정확한 삼두 자극을 유도합니다.", layers: {"easy":"양무릎 사이에 엉덩이를 내려놓는 로우 닐링(Low Kneeling) 자세에서 진행","standard":"톨 닐링(Tall Kneeling) 체스트 익스팬션 10회 + 트라이셉스 프레스 12회","hard":"상체를 45도 앞으로 숙인 힌지 자세에서 버터플라이 암 써클 연결"},
    youtube: {"videoId":"wNRfJ45tDDo","channelName":"혀니쌤 플라잉요가&필라테스","videoTitle":"[기구필라테스]리포머 50분 풀 시퀀스! 여름대비 팔뚝라인 다져주는 동작들 가져왔습니다🌞","startSec":0,"url":"https://www.youtube.com/watch?v=wNRfJ45tDDo","note":"공개 oEmbed 확인 완료 (혀니쌤 플라잉요가&필라테스 · 리포머 상체 시퀀스)","region":"kr"}, favoriteTag: "member-love", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-chair-01", nameKo: "[국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어", nameEn: "KR Wunda Chair Pedal Plank to Pike Core & Glute Burner", apparatus: "chair",
    props: ["none"], blockCategory: "plank", spinalPlanes: ["neutral","flexion"], bodyPosition: "quadruped",
    level: "2.0", defaultDurationMin: 4, isUnilateral: false, springs: "1 Heavy (상단 1)",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["복횡근","복직근","전거근","둔근"],
    breathPattern: "들쉬며 플랭크 일직선 세팅 → 내쉬며 아랫배를 천장으로 끌어올려 파이크 업", cues: ["손바닥으로 체어 시트를 밀어내어 날개뼈 사이를 평평하게 채운 플랭크 자세를 먼저 만듭니다.","다리의 힘이 아니라 아랫배가 등 쪽으로 쏙 빨려 들어가는 힘으로 페달을 가볍게 들어 올리세요."], precautions: "손목 통증이 있는 회원님은 전완근(Forearm)을 시트에 대고 진행하도록 수정합니다.", layers: {"easy":"두 무릎을 바닥에 대고 페달 프레스 다운(Press Down) 8회로 코어 인지","standard":"플랭크 홀드 10초 + 파이크 업/다운 8회 연속 진행","hard":"한 다리를 뒤로 뻗어 올린 싱글 레그 체어 파이크(Single Leg Pike) 좌/우 5회"},
    youtube: {"videoId":"pmwYs3uqhWc","channelName":"Today sequence","videoTitle":"필라테스 체어 시퀀스ㅣ체어에서 플랭크 동작으로 복부 엉덩이를 한번에!/plank on pilates chair abs & glue workout","startSec":0,"url":"https://www.youtube.com/watch?v=pmwYs3uqhWc","note":"공개 oEmbed 확인 완료 (Today sequence · 체어 플랭크 & 코어 시퀀스)","region":"kr"}, favoriteTag: "burn-sculpt", tempo: "athletic-burn",
  },
  {
    id: "ex-kr-reformer-04", nameKo: "[국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스", nameEn: "KR 30-Min Seamless Upper-Lower Body Coordination Flow", apparatus: "reformer",
    props: ["none"], blockCategory: "core", spinalPlanes: ["flexion","rotation","neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 5, isUnilateral: false, springs: "1R 1B",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["복횡근","내복사근","외복사근","고관절 굴곡근"],
    breathPattern: "내쉬며 상체 컬업 & 반대쪽 다리 45도 뻗기 → 들쉬며 테이블탑 정렬 복귀", cues: ["스트랩을 쥔 손과 뻗어내는 다리가 서로 멀어지며 복부 사선 슬링(Oblique Sling)을 강하게 연결합니다.","동작 사이 휴식 시간을 최소화하고 호흡 리듬에 맞춰 물 흐르듯 다음 변형으로 이어갑니다."], precautions: "허리가 매트에서 뜨지 않도록 다리 높이를 회원님의 코어 근력에 맞게 조절하세요.", layers: {"easy":"머리를 헤드레스트에 내린 상태에서 암 프레스 + 싱글 레그 토 탭(Toe Tap)","standard":"컬업 유지 + 코디네이션(Coordination) 오픈/클로즈 + 크리스크로스 8회","hard":"두 다리 45도 로우(Lower) & 리프트(Lift) + 트라이셉스 비트(Beats) 추가"},
    youtube: {"videoId":"IKIjw-5-AmI","channelName":"유진쌤 움직임 회복 필라테스","videoTitle":"상·하체를 단단하게 연결하는 리포머 시퀀스 30분ㅣ쉼 없이 이어지는 자연스러운 빌드업","startSec":0,"url":"https://www.youtube.com/watch?v=IKIjw-5-AmI","note":"공개 oEmbed 확인 완료 (유진쌤 움직임 회복 필라테스 · 리포머 30분 빌드업 시퀀스)","region":"kr"}, favoriteTag: "signature", tempo: "moderate-flow",
  },
  {
    id: "ex-kr-cadillac-02", nameKo: "[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스", nameEn: "KR Cadillac Leg Springs Frog, Circles & Scissors Series", apparatus: "cadillac",
    props: ["none"], blockCategory: "feet-in-straps", spinalPlanes: ["neutral"], bodyPosition: "supine",
    level: "1.5", defaultDurationMin: 5, isUnilateral: false, springs: "2 Yellow (레그 스프링)",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["내전근","햄스트링","둔근","복횡근"],
    breathPattern: "내쉬며 두 발뒤꿈치를 붙여 45도 사선 프레스 → 들쉬며 고관절 접어 복귀", cues: ["양손으로 캐딜락 수직 폴(Upright Poles)을 가볍게 밀어내며 상체와 견갑골을 매트에 단단히 고정합니다.","양쪽 다리가 각각 독립된 스프링에 걸려 있으므로 좌·우 다리 높이와 속도를 대칭으로 맞추는 데 집중하세요."], precautions: "골반이 스프링 장력에 끌려가며 허리가 꺾이지 않도록 꼬리뼈를 매트에 무겁게 둡니다.", layers: {"easy":"스프링 높이를 낮추고 무릎을 구부린 프로그(Frog) 동작만 안정적으로 진행","standard":"프로그 10회 → 레그 써클 양방향 8회 → 워킹(Walking) 교차 10회","hard":"브릿지 자세로 골반을 들어 올린 채 레그 스프링 에어플레인 & 바이시클 연결"},
    youtube: {"videoId":"tU8cPEKkLSM","channelName":"서아앤헤이즐 | Seoah and Hazel","videoTitle":"[Pilates] 캐딜락 50분 시퀀스 | 전신 골고루 자극 주기 | 다양한 동작으로 풍성하게 수업해요💪","startSec":0,"url":"https://www.youtube.com/watch?v=tU8cPEKkLSM","note":"공개 oEmbed 확인 완료 (서아앤헤이즐 | Seoah and Hazel · 캐딜락 50분 시퀀스)","region":"kr"}, favoriteTag: "rehab-posture", tempo: "slow-precise",
  },
  {
    id: "ex-global-reformer-01", nameKo: "[해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우", nameEn: "Dez Fit Intermediate 45-Min Full Body Reformer Sculpt", apparatus: "reformer",
    props: ["magic-circle"], blockCategory: "lower-body", spinalPlanes: ["neutral","rotation"], bodyPosition: "supine",
    level: "2.0", defaultDurationMin: 7, isUnilateral: false, springs: "2R",
    box: "none", footbar: "high", headrest: "up", targetMuscles: ["둔근","대퇴사두근","내전근","외복사근"],
    breathPattern: "내쉬며 써클링 조이고 힙 브릿지 업 → 상단에서 캐리지 인/아웃 컨트롤", cues: ["허벅지 사이에 매직써클(써클링)을 끼워 일정한 텐션을 유지한 채 캐리지를 밀고 당깁니다.","엉덩이 높이가 바닥으로 떨어지지 않도록 뒤꿈치로 풋바를 강하게 누르며 햄스트링과 둔근을 연결하세요."], precautions: "쥐가 쉽게 나는 회원님은 캐리지 가동범위를 절반으로 줄여 등척성 수축 위주로 진행합니다.", layers: {"easy":"써클링 없이 양발 골반 너비 브릿지 홀드 + 작은 캐리지 프레스 8회","standard":"써클링 펄스 10회 + 브릿지 상태 캐리지 인/아웃 8회","hard":"원 레그(Single Leg) 브릿지 프레스 + 상단 뒤꿈치 업/다운 8회 추가"},
    youtube: {"videoId":"XMHUw3EhBlI","channelName":"Dez Fit","videoTitle":"Pilates Reformer Workout | Full Body | 45 min (Intermediate)","startSec":0,"url":"https://www.youtube.com/watch?v=XMHUw3EhBlI","note":"공개 oEmbed 확인 완료 (Dez Fit · 리포머 45분 인터미디어트 전신 루틴)","region":"global"}, favoriteTag: "burn-sculpt", tempo: "athletic-burn",
  },
  {
    id: "ex-global-reformer-02", nameKo: "[해외 BASI] Flow with Mira 15분 코르셋 딥코어 & 척추 분절 루틴", nameEn: "Flow with Mira 15-Min Corset Deep Core & Spine Flow", apparatus: "mat",
    props: ["none"], blockCategory: "core", spinalPlanes: ["flexion","rotation"], bodyPosition: "supine",
    level: "1.0", defaultDurationMin: 4, isUnilateral: false, springs: "Bodyweight",
    box: "none", footbar: "none", headrest: "flat", targetMuscles: ["복횡근","내복사근","골반저근","다열근"],
    breathPattern: "코로 갈비뼈 뒷면까지 들쉬기 → 입으로 내쉬며 복부 코르셋을 조이듯 체스트 리프트", cues: ["허리 주변을 감싸는 보이지 않는 코르셋 끈을 조이듯 복횡근을 먼저 수축한 뒤 움직임을 시작합니다.","빠른 속도보다 척추 마디마디의 정밀한 컨트롤에 집중하여 심부 안정화 근육을 깨웁니다."], precautions: "목 긴장이 올라오면 한 손으로 뒤통수를 가볍게 받쳐 경추 정렬을 도와주세요.", layers: {"easy":"두 발을 매트에 둔 채 펠빅 컬(Pelvic Curl) & 체스트 리프트 8회","standard":"체스트 리프트 위드 로테이션(Chest Lift with Rotation) + 헌드레드 프렙","hard":"더블 레그 스트레치(Double Leg Stretch) + 롤업(Roll-Up) 6회 연속 연결"},
    youtube: {"videoId":"1WDNTwAUjIw","channelName":"Flow with Mira","videoTitle":"15 min Pilates Core Flow That Feels Like Wearing a Corset for Your Spine","startSec":0,"url":"https://www.youtube.com/watch?v=1WDNTwAUjIw","note":"공개 oEmbed 확인 완료 (Flow with Mira · 15분 매트 코어 & 척추 분절 루틴)","region":"global"}, favoriteTag: "rehab-posture", tempo: "slow-precise",
  },
  {
    id: "ex-global-reformer-03", nameKo: "[해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우", nameEn: "Balanced Body Fundamentals: Reformer Strength & Stretch", apparatus: "reformer",
    props: ["none"], blockCategory: "cooldown", spinalPlanes: ["extension","lateral","flexion"], bodyPosition: "kneeling",
    level: "1.0", defaultDurationMin: 3, isUnilateral: true, springs: "1R",
    box: "none", footbar: "high", headrest: "flat", targetMuscles: ["장요근","광배근","햄스트링","흉추 가동성"],
    breathPattern: "들쉬며 캐리지를 밀어 고관절 굴곡근 오픈 → 내쉬며 앞다리 무릎 펴 햄스트링 스트레치", cues: ["수업 마무리 단계에서 긴장된 장요근과 햄스트링을 부드럽게 늘려주며 호흡을 가라앉힙니다.","양쪽 골반 헤드라이트가 정면을 향하도록 맞춘 상태에서 흉추를 길게 세워줍니다."], precautions: "무릎 아래에 얇은 패드나 미니 매트를 깔아주어 슬개골 압박을 예방하세요.", layers: {"easy":"양손을 풋바에 안정적으로 짚고 짧은 가동범위로 고관절 스트레치만 진행","standard":"닐링 이브스 런지 스트레치 + 앞다리 신전 러너스 스트레치 (좌/우 90초)","hard":"한 팔을 천장으로 들어 올려 측면 굴곡(Side Bend)까지 결합한 3차원 스트레치"},
    youtube: {"videoId":"sTYt4di0zzU","channelName":"Balanced Body","videoTitle":"Pilates Fundamentals: Beginner Reformer Strength & Stretch Routine - Exercise Break","startSec":0,"url":"https://www.youtube.com/watch?v=sTYt4di0zzU","note":"공개 oEmbed 확인 완료 (Balanced Body · 리포머 기초 스트렝스 & 스트레치)","region":"global"}, favoriteTag: "rehab-posture", tempo: "slow-precise",
  },
];

export const INITIAL_EXERCISES: PilatesExercise[] = [
  ...ORIGINAL_MOVEMENTS,
  ...LEGACY_CURATED_EXERCISES,
  ...EXPANDED_MOVEMENTS,
];

export const INITIAL_CLASS_GROUPS: ClassGroupProfile[] = [
  {
    id: "grp-mon-wed-7pm", name: "월·수 저녁반", type: "group",
    defaultLevel: "1.5", scheduleLabel: "매주 월·수 19:00 (6:1 기구 그룹)", notes: "전신 흐름과 하체 구간을 균형 있게 계획하는 예시 반입니다.",
  },
  {
    id: "grp-tue-thu-10am", name: "화·목 오전반", type: "group",
    defaultLevel: "1.0", scheduleLabel: "매주 화·목 10:30 (6:1 기구 그룹)", notes: "기초 동작과 충분한 설명 시간을 사용하는 예시 반입니다.",
  },
  {
    id: "grp-private-seoyeon", name: "개인 01", type: "private",
    defaultLevel: "1.5", scheduleLabel: "매주 금 14:00 (1:1 프라이빗)", notes: "개별 목표와 당일 컨디션을 확인하며 계획하는 개인 수업 예시입니다.",
  },
  {
    id: "grp-sat-11am", name: "토요일 심화반", type: "group",
    defaultLevel: "2.0", scheduleLabel: "매주 토 11:00 (장기 수강생 반)", notes: "기구 전환과 확장 동작을 강사가 검토하는 심화 수업 예시입니다.",
  },
];

export const INITIAL_SAVED_SEQUENCES: SavedSequence[] = [
  {
    id: "seq-reformer-signature-50", title: "리포머 Lv 1.5 전신 밸런스 & 힙업 시그니처 50분", subtitle: "미니볼 풋워크부터 스쿠터·롱스트레치·핏인스트랩까지 스프링 전환을 최소화한 황금 동선", apparatus: "reformer",
    level: "1.5", focusTags: ["전신 밸런스","힙업/중둔근","스프링 동선 최적화","시그니처"], targetMinutes: 50, createdAt: "2026-10-25T10:00:00.000Z",
    updatedAt: "2026-11-02T19:00:00.000Z", lastTaughtAt: "2026-11-02T19:00:00.000Z", taughtCount: 6, steps: [{"stepId":"s-1","order":1,"blockCategory":"warmup","exerciseId":"ex-warmup-01","durationMin":4,"selectedLayer":"standard","instructorNote":"미니볼 내전근 30% 조임으로 시작"},{"stepId":"s-2","order":2,"blockCategory":"footwork","exerciseId":"ex-footwork-01","durationMin":6,"selectedLayer":"standard","instructorNote":"2R 1B 그대로 유지하고 헤드레스트만 Up"},{"stepId":"s-3","order":3,"blockCategory":"bridging","exerciseId":"ex-bridging-01","durationMin":5,"selectedLayer":"standard","instructorNote":"파랑 스프링 1개만 빼서 2R, 헤드레스트 Flat 확인!"},{"stepId":"s-4","order":4,"blockCategory":"core","exerciseId":"ex-core-01","durationMin":6,"selectedLayer":"standard","instructorNote":"1R 1B로 변경 후 수파인 스트랩 & 헌드레드 100카운트"},{"stepId":"s-5","order":5,"blockCategory":"upper-body","exerciseId":"ex-upper-01","durationMin":6,"selectedLayer":"standard","instructorNote":"1R 세팅 후 닐링 체스트 익스팬션 & 스파인 트위스트"},{"stepId":"s-6","order":6,"blockCategory":"lower-body","exerciseId":"ex-lower-01","durationMin":8,"selectedLayer":"standard","instructorNote":"1R 그대로 유지! 좌측 4분 / 우측 4분 스쿠터 & 런지"},{"stepId":"s-7","order":7,"blockCategory":"plank","exerciseId":"ex-plank-01","durationMin":4,"selectedLayer":"standard","instructorNote":"1R 1B 세팅 후 롱스트레치 & 엘리펀트"},{"stepId":"s-8","order":8,"blockCategory":"extension","exerciseId":"ex-extension-01","durationMin":4,"selectedLayer":"standard","instructorNote":"롱박스 올리고 1R 풀링 스트랩 스완"},{"stepId":"s-9","order":9,"blockCategory":"feet-in-straps","exerciseId":"ex-straps-01","durationMin":4,"selectedLayer":"standard","instructorNote":"박스 내리고 1R 1B 핏인스트랩 프로그 & 써클"},{"stepId":"s-10","order":10,"blockCategory":"cooldown","exerciseId":"ex-cooldown-01","durationMin":3,"selectedLayer":"standard","instructorNote":"1B 머메이드 측굴 및 호흡 정리"}],
  },
  {
    id: "seq-reformer-posture-50", title: "리포머+소도구 Lv 1.0 체형교정 & 속근육 정렬 50분", subtitle: "목·어깨 과긴장 없이 써클링·미니볼로 골반 대칭과 라운드숄더를 잡는 소프트 플로우", apparatus: "reformer",
    level: "1.0", focusTags: ["체형교정","라운드숄더 케어","초급/입문","써클링/미니볼"], targetMinutes: 50, createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-11-03T11:30:00.000Z", lastTaughtAt: "2026-11-03T10:30:00.000Z", taughtCount: 4, steps: [{"stepId":"sp-1","order":1,"blockCategory":"warmup","exerciseId":"ex-warmup-03","durationMin":4,"selectedLayer":"easy"},{"stepId":"sp-2","order":2,"blockCategory":"footwork","exerciseId":"ex-footwork-02","durationMin":6,"selectedLayer":"standard"},{"stepId":"sp-3","order":3,"blockCategory":"bridging","exerciseId":"ex-bridging-01","durationMin":5,"selectedLayer":"easy"},{"stepId":"sp-4","order":4,"blockCategory":"core","exerciseId":"ex-core-04","durationMin":6,"selectedLayer":"standard"},{"stepId":"sp-5","order":5,"blockCategory":"upper-body","exerciseId":"ex-upper-02","durationMin":6,"selectedLayer":"standard"},{"stepId":"sp-6","order":6,"blockCategory":"lower-body","exerciseId":"ex-lower-04","durationMin":8,"selectedLayer":"standard"},{"stepId":"sp-7","order":7,"blockCategory":"plank","exerciseId":"ex-plank-01","durationMin":4,"selectedLayer":"easy"},{"stepId":"sp-8","order":8,"blockCategory":"extension","exerciseId":"ex-extension-01","durationMin":4,"selectedLayer":"standard"},{"stepId":"sp-9","order":9,"blockCategory":"feet-in-straps","exerciseId":"ex-straps-01","durationMin":4,"selectedLayer":"standard"},{"stepId":"sp-10","order":10,"blockCategory":"cooldown","exerciseId":"ex-cooldown-02","durationMin":3,"selectedLayer":"standard"}],
  },
  {
    id: "seq-combo-sculpt-50", title: "리포머 & 체어 Lv 2.0 주말 불타는 코어·힙 스컬프 50분", subtitle: "체어 스탠딩 런지 & 파이크와 리포머 사이드 스플릿을 결합한 고강도 애슬레틱 시퀀스", apparatus: "mixed",
    level: "2.0", focusTags: ["고강도 스컬프","리포머+체어 콤비","하체/복부 폭탄"], targetMinutes: 50, createdAt: "2026-10-28T14:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z", lastTaughtAt: "2026-10-31T11:00:00.000Z", taughtCount: 3, steps: [{"stepId":"sc-1","order":1,"blockCategory":"warmup","exerciseId":"ex-warmup-02","durationMin":4,"selectedLayer":"standard"},{"stepId":"sc-2","order":2,"blockCategory":"footwork","exerciseId":"ex-footwork-03","durationMin":6,"selectedLayer":"hard"},{"stepId":"sc-3","order":3,"blockCategory":"bridging","exerciseId":"ex-bridging-02","durationMin":5,"selectedLayer":"standard"},{"stepId":"sc-4","order":4,"blockCategory":"core","exerciseId":"ex-core-02","durationMin":6,"selectedLayer":"hard"},{"stepId":"sc-5","order":5,"blockCategory":"upper-body","exerciseId":"ex-upper-03","durationMin":6,"selectedLayer":"standard"},{"stepId":"sc-6","order":6,"blockCategory":"lower-body","exerciseId":"ex-lower-03","durationMin":8,"selectedLayer":"hard"},{"stepId":"sc-7","order":7,"blockCategory":"plank","exerciseId":"ex-plank-02","durationMin":4,"selectedLayer":"standard"},{"stepId":"sc-8","order":8,"blockCategory":"extension","exerciseId":"ex-extension-02","durationMin":4,"selectedLayer":"standard"},{"stepId":"sc-9","order":9,"blockCategory":"feet-in-straps","exerciseId":"ex-straps-02","durationMin":4,"selectedLayer":"standard"},{"stepId":"sc-10","order":10,"blockCategory":"cooldown","exerciseId":"ex-cooldown-01","durationMin":3,"selectedLayer":"standard"}],
  },
];

export const INITIAL_HISTORY_LOGS: ClassHistoryLog[] = [
  {
    id: "log-01", sequenceId: "seq-reformer-signature-50", sequenceTitle: "리포머 Lv 1.5 전신 밸런스 & 힙업 시그니처 50분", groupId: "grp-mon-wed-7pm",
    groupName: "월·수 저녁반", taughtAt: "2026-11-02T19:00:00.000Z", apparatus: "reformer", level: "1.5",
    exerciseIds: ["ex-warmup-01","ex-footwork-01","ex-bridging-01","ex-core-01","ex-upper-01","ex-lower-01","ex-plank-01","ex-extension-01","ex-straps-01","ex-cooldown-01"], rating: 5, intensity: "intense", instructorReflection: "스쿠터+런지 8분 구간에서 회원님들 중둔근 자극 반응 최고였음! 다음 수요일 수업에는 스쿠터 대신 사이드 스플릿(ex-lower-02)이나 사이드 라잉 스트랩으로 변주 줄 것.",
  },
  {
    id: "log-02", sequenceId: "seq-reformer-posture-50", sequenceTitle: "리포머+소도구 Lv 1.0 체형교정 & 속근육 정렬 50분", groupId: "grp-tue-thu-10am",
    groupName: "화·목 오전반", taughtAt: "2026-11-03T10:30:00.000Z", apparatus: "reformer", level: "1.0",
    exerciseIds: ["ex-warmup-03","ex-footwork-02","ex-bridging-01","ex-core-04","ex-upper-02","ex-lower-04","ex-plank-01","ex-extension-01","ex-straps-01","ex-cooldown-02"], rating: 5, intensity: "moderate", instructorReflection: "예시 기록: 코어 구간의 설명 시간을 충분히 사용했습니다. 다음 수업은 동작 사이 전환을 다시 확인합니다.",
  },
  {
    id: "log-03", sequenceId: "seq-combo-sculpt-50", sequenceTitle: "리포머 & 체어 Lv 2.0 주말 불타는 코어·힙 스컬프 50분", groupId: "grp-sat-11am",
    groupName: "토요일 심화반", taughtAt: "2026-10-31T11:00:00.000Z", apparatus: "mixed", level: "2.0",
    exerciseIds: ["ex-warmup-02","ex-footwork-03","ex-bridging-02","ex-core-02","ex-upper-03","ex-lower-03","ex-plank-02","ex-extension-02","ex-straps-02","ex-cooldown-01"], rating: 5, intensity: "intense", instructorReflection: "체어 마운틴 클라이머에서 파이크로 넘어가는 흐름이 아주 타이트하고 좋았음. 다음 주에는 리포머 롱스트레치 싱글레그 버전 추가 예정.",
  },
];

export const CURATED_SEQUENCE_PROGRAMS: CuratedSequenceProgram[] = [
  {
    id: "prog-kr-reformer-50", titleKo: "🇰🇷 [국내 정석] 리포머+미니볼 50분 전신 밸런스 & 힙업 그룹 시퀀스", subtitleKo: "정혜선 원장 & 지영쌤 레퍼런스 기반 · 풋워크부터 스쿠터·런지·핏인스트랩까지 스프링 전환을 최소화한 50분 시그니처", durationMinutes: 50, requiredApparatus: ["reformer"],
    recommendedProps: ["mini-ball"], level: "1.5", tempo: "moderate-flow", region: "kr", coverImage: "/images/reformer-flow.jpg",
    youtubeId: "9h__STRp5dA", youtubeChannel: "정혜선", focusPreset: "full-body", highlights: ["2R 1B → 1R 황금 동선","내전근·중둔근 집중 연결","4방향 척추 움직임 완비"],
  },
  {
    id: "prog-kr-cadillac-50", titleKo: "🇰🇷 [국내 인기] 캐딜락 푸쉬스루바 & 레그스프링 50분 코어·척추 교정", subtitleKo: "단필라 & 서아앤헤이즐 레퍼런스 · 롤다운 바 분절부터 푸쉬스루 티저, 레그스프링 프로그까지 알찬 50분 캐딜락 루틴", durationMinutes: 50, requiredApparatus: ["cadillac"],
    recommendedProps: ["foam-roller"], level: "1.5", tempo: "moderate-flow", region: "kr", coverImage: "/images/cadillac-chair.jpg",
    youtubeId: "E_K5eAr-D5M", youtubeChannel: "단필라", focusPreset: "posture-upper", highlights: ["캐딜락 단독 50분 완성","라운드숄더·흉추 가동성 극대화","상·하단 스프링 동선 최적화"],
  },
  {
    id: "prog-kr-combo-chair-barrel-50", titleKo: "🇰🇷 [콤비 시퀀스] 체어 & 래더 바렐 + 미니볼 50분 코어·옆구리 스컬프", subtitleKo: "혀니쌤 & Today Sequence 레퍼런스 · 바렐 사이드 밴드/스완과 운다 체어 페달 플랭크·파이크를 결합한 탄탄한 50분 수업", durationMinutes: 50, requiredApparatus: ["chair","barrel"],
    recommendedProps: ["mini-ball"], level: "2.0", tempo: "athletic-burn", region: "kr", coverImage: "/images/cadillac-chair.jpg",
    youtubeId: "l3WQl2L__qQ", youtubeChannel: "혀니쌤 플라잉요가&필라테스", focusPreset: "core-sculpt", highlights: ["체어+바렐 2기구 콤비","복부·외복사근·둔근 고강도 자극","지루할 틈 없는 전환 구성"],
  },
  {
    id: "prog-kr-reformer-30", titleKo: "🇰🇷 [30분 익스프레스] 유진쌤 리포머 상·하체 통합 쉼 없는 30분 플로우", subtitleKo: "런치타임 30분 수업이나 1:1 인트로 세션에 최적화된 무휴식 자연스러운 코어·하체 빌드업 프로그램", durationMinutes: 30, requiredApparatus: ["reformer"],
    recommendedProps: ["none"], level: "1.5", tempo: "moderate-flow", region: "kr", coverImage: "/images/hero-studio.jpg",
    youtubeId: "IKIjw-5-AmI", youtubeChannel: "유진쌤 움직임 회복 필라테스", focusPreset: "full-body", highlights: ["30분 6블록 압축 구성","스프링 변경 최소(2회)","상·하체 코어 협응력 강화"],
  },
  {
    id: "prog-global-reformer-45", titleKo: "🌏 [해외 부티크 45분] Dez Fit 리포머+써클링 45분 인터미디어트 번", subtitleKo: "미국 부티크 스튜디오 스타일의 45분 타이트 클래스 · 매직써클 브릿지와 롱스트레치 변형으로 칼로리 소모 극대화", durationMinutes: 45, requiredApparatus: ["reformer"],
    recommendedProps: ["magic-circle"], level: "2.0", tempo: "athletic-burn", region: "global", coverImage: "/images/reformer-flow.jpg",
    youtubeId: "XMHUw3EhBlI", youtubeChannel: "Dez Fit", focusPreset: "glute-lower", highlights: ["45분 9블록 애슬레틱 템포","써클링 내전근·둔근 펄스","해외 모던 리포머 스타일"],
  },
  {
    id: "prog-global-core-15", titleKo: "🌏 [15분 부위 집중] Flow with Mira 코르셋 딥코어 & 척추 분절 15분", subtitleKo: "BASI 패컬티 Mira의 15분 단기 집중 루틴 · 대기구 수업 전 15분 웜업이나 홈트/매트 소그룹 코어 특강용", durationMinutes: 15, requiredApparatus: ["mat"],
    recommendedProps: ["mini-ball","foam-roller"], level: "1.0", tempo: "slow-precise", region: "global", coverImage: "/images/mat-props.jpg",
    youtubeId: "1WDNTwAUjIw", youtubeChannel: "Flow with Mira", focusPreset: "core-sculpt", highlights: ["15분 4블록 초집중 코어","소도구/매트만으로 즉시 진행","초보자·재활 회원님 안전 적용"],
  },
  {
    id: "prog-kr-arms-20", titleKo: "🇰🇷 [20분 상체·웨딩케어] 리포머 스트랩 팔뚝 슬리밍 & 쇄골 라인 20분", subtitleKo: "혀니쌤 상체 시퀀스 기반 · 예비 신부 1:1 레슨이나 하체 운동 후 20분 상체 집중 루틴으로 결합하기 좋은 프로그램", durationMinutes: 20, requiredApparatus: ["reformer"],
    recommendedProps: ["theraband"], level: "1.0", tempo: "moderate-flow", region: "kr", coverImage: "/images/hero-studio.jpg",
    youtubeId: "wNRfJ45tDDo", youtubeChannel: "혀니쌤 플라잉요가&필라테스", focusPreset: "posture-upper", highlights: ["20분 5블록 상체·흉추 특화","승모근 개입 없는 삼두·광배 자극","웨딩/체형교정 맞춤"],
  },
  {
    id: "prog-global-master-60", titleKo: "🌏 [60분 마스터 클래스] 리포머+캐딜락+체어 원장 직강 60분 풀 시퀀스", subtitleKo: "Dez Fit & 필라디션 레퍼런스 · 60분 프라이빗 VIP 레슨 또는 강사 워크숍을 위한 대기구 총망라 풀 시퀀스", durationMinutes: 60, requiredApparatus: ["reformer","cadillac","chair"],
    recommendedProps: ["mini-ball","magic-circle","foam-roller"], level: "2.0", tempo: "athletic-burn", region: "global", coverImage: "/images/cadillac-chair.jpg",
    youtubeId: "bTsHgSk0Hik", youtubeChannel: "Dez Fit", focusPreset: "full-body", highlights: ["60분 10블록 확장 마스터 루틴","리포머·캐딜락·체어 3기구 순환","VIP 1:1 및 심화반 추천"],
  },
];
