import type { BodyPosition, SpinalPlane } from '../types/pilates';

/** Original orientation drawings, not exercise demonstrations or anatomical models. */
export const POSTURE_GUIDE: Record<BodyPosition, { label: string; orientation: string }> = {
  supine: { label: '바로 누운 자세', orientation: '등이 아래 · 얼굴이 위' },
  prone: { label: '엎드린 자세', orientation: '배가 아래 · 얼굴이 아래' },
  'side-lying': { label: '옆으로 누운 자세', orientation: '몸의 한쪽 옆면이 아래' },
  seated: { label: '앉은 자세', orientation: '골반을 지지한 앉은 방향' },
  kneeling: { label: '무릎 선 자세', orientation: '무릎으로 지지한 방향' },
  standing: { label: '선 자세', orientation: '발로 지지한 방향' },
  quadruped: { label: '네발기기 자세', orientation: '손과 무릎으로 지지한 방향' },
};

export const SPINE_GUIDE: Record<SpinalPlane, { label: string; description: string }> = {
  flexion: { label: '굴곡', description: '앞으로 굽힘' },
  extension: { label: '신전', description: '펴거나 뒤로 움직임' },
  lateral: { label: '측굴', description: '옆으로 굽힘' },
  rotation: { label: '회전', description: '몸통 축을 중심으로 돌림' },
  neutral: { label: '중립 유지', description: '계획에 기록된 안정화 방향' },
};

export const ANATOMY_GUIDE_SOURCES = [
  {
    label: 'OpenStax · 자세와 부위 용어',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology',
  },
  {
    label: 'OpenStax · 엉덩이와 다리 근육',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs',
  },
  {
    label: 'OpenStax · 등과 척추 주변 근육',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back',
  },
  {
    label: 'OpenStax · 움직임의 방향',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-5-types-of-body-movements',
  },
] as const;

type View = 'front' | 'back';
export type AnatomyRegion =
  | 'trunk'
  | 'abdomen'
  | 'ribs'
  | 'chest'
  | 'shoulder'
  | 'arms'
  | 'back'
  | 'spine'
  | 'neck'
  | 'glute'
  | 'side-hip'
  | 'pelvis'
  | 'hip'
  | 'thigh-front'
  | 'thigh-back'
  | 'thigh-inner'
  | 'legs'
  | 'knee'
  | 'calf'
  | 'ankle'
  | 'waist'
  | 'neck-front'
  | 'arms-back'
  | 'shoulder-back'
  | 'side-hip-front'
  | 'waist-back'
  | 'upper-body';
export interface RegionGuide {
  label: string;
  view: View;
  /** Approximate regions, never muscle borders, insertions, or activation measurements. */
  marks: ReadonlyArray<readonly [number, number, number, number]>;
  badge: readonly [number, number];
}
// Coordinates are local to one 100 × 200 silhouette. Front/back are explicit.
export const ANATOMY_REGIONS: Record<AnatomyRegion, RegionGuide> = {
  'neck-front': { label: '목 앞', view: 'front', marks: [[50, 38, 6, 7]], badge: [78, 32] },
  'arms-back': {
    label: '위팔 뒤',
    view: 'back',
    marks: [
      [22, 65, 5, 13],
      [78, 65, 5, 13],
    ],
    badge: [9, 68],
  },
  'shoulder-back': {
    label: '어깨 뒤',
    view: 'back',
    marks: [
      [28, 49, 7, 8],
      [72, 49, 7, 8],
    ],
    badge: [12, 42],
  },
  'side-hip-front': {
    label: '골반 바깥 앞',
    view: 'front',
    marks: [
      [30, 105, 4, 7],
      [70, 105, 4, 7],
    ],
    badge: [87, 105],
  },
  'waist-back': {
    label: '허리 뒤',
    view: 'back',
    marks: [
      [38, 91, 5, 10],
      [62, 91, 5, 10],
    ],
    badge: [13, 83],
  },
  'upper-body': {
    label: '상체',
    view: 'front',
    marks: [
      [50, 77, 18, 29],
      [22, 70, 5, 17],
      [78, 70, 5, 17],
    ],
    badge: [88, 82],
  },
  trunk: { label: '몸통', view: 'front', marks: [[50, 79, 17, 30]], badge: [76, 82] },
  abdomen: { label: '배', view: 'front', marks: [[50, 91, 14, 17]], badge: [76, 97] },
  ribs: { label: '흉곽', view: 'front', marks: [[50, 67, 18, 17]], badge: [77, 61] },
  chest: {
    label: '가슴',
    view: 'front',
    marks: [
      [41, 58, 9, 10],
      [59, 58, 9, 10],
    ],
    badge: [76, 49],
  },
  shoulder: {
    label: '어깨',
    view: 'front',
    marks: [
      [28, 49, 7, 8],
      [72, 49, 7, 8],
    ],
    badge: [12, 42],
  },
  arms: {
    label: '팔',
    view: 'front',
    marks: [
      [21, 73, 5, 19],
      [79, 73, 5, 19],
    ],
    badge: [7, 76],
  },
  back: {
    label: '등',
    view: 'back',
    marks: [
      [40, 66, 9, 20],
      [60, 66, 9, 20],
    ],
    badge: [79, 57],
  },
  spine: {
    label: '척추 주변',
    view: 'back',
    marks: [
      [44, 80, 3, 25],
      [56, 80, 3, 25],
    ],
    badge: [80, 87],
  },
  neck: { label: '목 주변', view: 'back', marks: [[50, 38, 7, 7]], badge: [77, 34] },
  glute: {
    label: '엉덩이 뒤',
    view: 'back',
    marks: [
      [39, 110, 9, 10],
      [61, 110, 9, 10],
    ],
    badge: [80, 112],
  },
  'side-hip': {
    label: '엉덩이 바깥',
    view: 'back',
    marks: [
      [31, 100, 5, 7],
      [69, 100, 5, 7],
    ],
    badge: [14, 100],
  },
  pelvis: { label: '골반 주변', view: 'front', marks: [[50, 109, 18, 10]], badge: [13, 111] },
  hip: {
    label: '고관절 주변',
    view: 'front',
    marks: [
      [37, 114, 7, 10],
      [63, 114, 7, 10],
    ],
    badge: [80, 118],
  },
  'thigh-front': {
    label: '허벅지 앞',
    view: 'front',
    marks: [
      [36, 137, 7, 17],
      [64, 137, 7, 17],
    ],
    badge: [13, 141],
  },
  'thigh-back': {
    label: '허벅지 뒤',
    view: 'back',
    marks: [
      [36, 137, 7, 17],
      [64, 137, 7, 17],
    ],
    badge: [80, 143],
  },
  'thigh-inner': {
    label: '허벅지 안쪽',
    view: 'front',
    marks: [
      [43, 132, 3, 13],
      [57, 132, 3, 13],
    ],
    badge: [80, 142],
  },
  legs: {
    label: '다리',
    view: 'front',
    marks: [
      [35, 150, 8, 31],
      [65, 150, 8, 31],
    ],
    badge: [12, 166],
  },
  knee: {
    label: '무릎',
    view: 'front',
    marks: [
      [34, 155, 6, 6],
      [66, 155, 6, 6],
    ],
    badge: [80, 160],
  },
  calf: {
    label: '종아리',
    view: 'back',
    marks: [
      [34, 169, 6, 13],
      [66, 169, 6, 13],
    ],
    badge: [80, 172],
  },
  ankle: {
    label: '발목',
    view: 'front',
    marks: [
      [33, 184, 5, 5],
      [67, 184, 5, 5],
    ],
    badge: [81, 185],
  },
  waist: {
    label: '옆구리',
    view: 'front',
    marks: [
      [33, 89, 4, 13],
      [67, 89, 4, 13],
    ],
    badge: [11, 92],
  },
};

interface TagGuide {
  region: AnatomyRegion;
  note: string;
}
const knownTags: Record<string, TagGuide> = Object.create(null);
const add = (tags: string[], region: AnatomyRegion, note: string) => {
  for (const tag of tags) knownTags[tag] = { region, note };
};
add(['대둔근'], 'glute', '일반 역할: 고관절을 펴는 데 관여');
add(['둔근'], 'glute', '엉덩이 근육군의 넓은 태그 · 대둔근 하나로 확정하지 않음');
add(['햄스트링'], 'thigh-back', '일반 역할: 무릎 굽힘 · 대부분 고관절 폄에도 관여');
add(['중둔근', '소둔근'], 'side-hip', '엉덩이 바깥쪽 위치 · 깊이와 근육 경계는 생략');
add(['대퇴근막장근'], 'side-hip-front', '골반 바깥 앞쪽 위치 · 세부 근육 경계는 생략');
add(['다열근'], 'spine', '척추 가까이 깊은 근육 · 위치를 겉면에 투영해 표시');
add(['척추기립근'], 'spine', '척추 양옆 근육군 · 일반 역할: 척추 폄과 옆 굽힘');
add(
  ['척추분절근', '척추 분절근'],
  'spine',
  '기존 묶음 표현 · 특정 해부학 근육명으로 확정하지 않음',
);
add(
  ['척추 분절', '척추분절', '흉추 가동성'],
  'spine',
  '움직임·목표를 기록한 태그 · 하나의 근육명이 아님',
);
add(
  ['몸통', '코어', '코어 밸런스'],
  'trunk',
  '몸통을 묶은 계획 태그 · 특정 근육의 활성도는 알 수 없음',
);
add(
  ['복부', '복직근', '복횡근', '상복부', '하복부'],
  'abdomen',
  '배 주변 위치 · 심부 근육도 겉면에 투영한 단순 그림',
);
add(
  ['내/외복사근', '외/내복사근', '내복사근', '외복사근', '옆구리'],
  'waist',
  '몸통 옆면 위치 · 근육별 깊이와 경계는 생략',
);
add(['흉곽', '횡격막', '늑간근'], 'ribs', '갈비뼈 주변 위치 · 횡격막의 돔과 호흡 움직임은 생략');
add(['대흉근', '소흉근'], 'chest', '상체 앞쪽 위치를 요약 · 심부 구조와 범위는 생략');
add(
  ['어깨', '삼각근', '전면/측면 삼각근', '전면삼각근'],
  'shoulder',
  '어깨 주변 위치 · 앞·옆·뒤의 세부 구획은 생략',
);
add(['팔', '상완이두근'], 'arms', '팔 앞쪽 위치 · 정확한 근육 경계는 생략');
add(['삼두근', '상완삼두근'], 'arms-back', '위팔 뒤쪽 위치 · 정확한 근육 경계는 생략');
add(['후면삼각근'], 'shoulder-back', '어깨 뒤쪽 위치 · 정확한 근육 경계는 생략');
add(['상체'], 'upper-body', '몸통과 팔을 묶은 넓은 계획 태그');
add(['요방형근'], 'waist-back', '허리 뒤쪽 깊은 위치 · 겉면에 투영해 표시');
add(['등', '광배근', '능형근', '하부승모근'], 'back', '등 주변 위치 · 근육별 범위와 깊이는 생략');
add(['전거근'], 'ribs', '갈비뼈 바깥쪽 위치 · 전거근의 세부 형태는 생략');
add(['후두하근'], 'neck', '뒤통수 아래 깊은 위치 · 겉면에 투영해 표시');
add(['심부경추굴곡근'], 'neck-front', '목 앞쪽 깊은 위치 · 겉면에 투영해 표시');
add(
  ['골반', '골반저근', '골반기저근', '골반 안정화근'],
  'pelvis',
  '골반 주변의 넓은 위치 · 골반저는 내부 구조',
);
add(
  ['고관절', '고관절 굴곡근', '장요근'],
  'hip',
  '고관절 주변 위치 · 심부 근육은 겉면에 투영해 표시',
);
add(['대퇴사두근'], 'thigh-front', '허벅지 앞 근육군의 위치');
add(['내전근'], 'thigh-inner', '허벅지 안쪽 근육군의 위치');
add(['하체'], 'legs', '다리 전체를 묶은 넓은 계획 태그');
add(['무릎'], 'knee', '관절 부위 태그 · 근육명이 아님');
add(
  ['종아리', '비복근/가자미근', '비복근', '가자미근'],
  'calf',
  '무릎 아래 뒤쪽 위치 · 근육별 깊이는 생략',
);
add(['발목'], 'ankle', '관절 부위 태그 · 근육명이 아님');

export interface MappedAnatomyTag extends TagGuide {
  label: string;
}
export function mapAnatomyTags(tags: readonly string[]) {
  const mapped: MappedAnatomyTag[] = [];
  const unmapped: string[] = [];
  const nonAnatomical: string[] = [];
  for (const label of [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]) {
    if (['호흡', '균형'].includes(label)) {
      nonAnatomical.push(label);
      continue;
    }
    // Exact lookup only. Never infer a muscle from a substring or strip arbitrary words.
    const base = label.replace(/ (이완|스트레칭)$/, '');
    const match = knownTags[base];
    if (!match) {
      unmapped.push(label);
      continue;
    }
    mapped.push({
      ...match,
      label,
      note: base === label ? match.note : `이완·스트레칭 메모 · ${match.note}`,
    });
  }
  return { mapped, unmapped, nonAnatomical };
}
