/** Original authored geometry, not captured motion or a clinically validated human model. */
export const MODEL_VERSION = 'heel-raise-authoring-draft-0.1.0';
export const EXERCISE_ID = 'original-mat-ankle-reach';
export const PHASES = Object.freeze([
  { id: 'setup', label: '준비 상태', start: 0, end: 0.12, sample: 0 },
  { id: 'move', label: '뒤꿈치가 올라가는 중', start: 0.12, end: 0.46, sample: 0.29 },
  { id: 'turn', label: '높아진 상태', start: 0.46, end: 0.56, sample: 0.51 },
  { id: 'return', label: '처음 상태로 돌아오는 중', start: 0.56, end: 0.92, sample: 0.74 },
  { id: 'finish', label: '종료 상태', start: 0.92, end: 1, sample: 1 },
]);
export const DIMENSIONS = Object.freeze({
  heelToForefoot: 50,
  ankleFromForefootX: -32,
  ankleFromForefootY: -20,
  toeLength: 18,
  shin: 70,
  thigh: 76,
  torso: 78,
  upperArm: 64,
  forearm: 66,
  maxFootRotationRadians: 0.45,
});
const OFFSETS = Object.freeze({ left: { x: 0, y: 0 }, right: { x: 16, y: -8 } });
const smooth = (value) => value * value * (3 - 2 * value);
const point = (x, y) => ({ x, y });
const add = (a, b) => point(a.x + b.x, a.y + b.y);
const rotate = (p, angle) => point(p.x * Math.cos(angle) - p.y * Math.sin(angle), p.x * Math.sin(angle) + p.y * Math.cos(angle));

export function clampProgress(value) {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
}
export function getHeelRaisePhase(value) {
  const progress = clampProgress(value);
  return PHASES.find((phase) => progress < phase.end) ?? PHASES.at(-1);
}
export function heelRaiseEnvelope(value) {
  const progress = clampProgress(value);
  if (progress <= 0.12 || progress >= 0.92) return 0;
  if (progress < 0.46) return smooth((progress - 0.12) / 0.34);
  if (progress <= 0.56) return 1;
  return 1 - smooth((progress - 0.56) / 0.36);
}

/** Two segment linkage for an authored arm, with a fixed hand on the support rail. */
function solveElbow(shoulder, hand) {
  const dx = hand.x - shoulder.x;
  const dy = hand.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const along = (DIMENSIONS.upperArm ** 2 - DIMENSIONS.forearm ** 2 + distance ** 2) / (2 * distance);
  const heightSquared = DIMENSIONS.upperArm ** 2 - along ** 2;
  if (distance <= 0 || heightSquared < -1e-9) throw new RangeError('Authored arm cannot reach its fixed support contact.');
  const height = Math.sqrt(Math.max(0, heightSquared));
  const ux = dx / distance;
  const uy = dy / distance;
  return point(shoulder.x + ux * along - uy * height, shoulder.y + uy * along + ux * height);
}

export function getHeelRaisePose(value, { mirrored = false } = {}) {
  const progress = clampProgress(value);
  const q = heelRaiseEnvelope(progress);
  const angle = q * DIMENSIONS.maxFootRotationRadians;
  const limbs = {};
  const contacts = [];
  for (const side of ['left', 'right']) {
    const offset = OFFSETS[side];
    const forefoot = add(point(300, 326), offset);
    const toe = add(forefoot, point(DIMENSIONS.toeLength, 0));
    const heel = add(forefoot, rotate(point(-DIMENSIONS.heelToForefoot, 0), angle));
    const ankle = add(forefoot, rotate(point(DIMENSIONS.ankleFromForefootX, DIMENSIONS.ankleFromForefootY), angle));
    const knee = add(ankle, point(0, -DIMENSIONS.shin));
    const hip = add(knee, point(0, -DIMENSIONS.thigh));
    const shoulder = add(hip, point(0, -DIMENSIONS.torso));
    const hand = add(point(355, 170), offset);
    const elbow = solveElbow(shoulder, hand);
    limbs[side] = { forefoot, toe, heel, ankle, knee, hip, shoulder, elbow, hand, active: true };
    contacts.push(
      { id: `${side}-forefoot`, side, point: forefoot, target: `${side}-floor-plane`, state: 'fixed' },
      { id: `${side}-toe`, side, point: toe, target: `${side}-floor-plane`, state: 'fixed' },
      { id: `${side}-hand`, side, point: hand, target: 'stable-chair-back-rail', state: 'fixed' },
      { id: `${side}-heel`, side, point: heel, target: `${side}-floor-plane`, state: q === 0 ? 'grounded' : 'released' },
    );
  }
  const centerShoulder = point((limbs.left.shoulder.x + limbs.right.shoulder.x) / 2, (limbs.left.shoulder.y + limbs.right.shoulder.y) / 2);
  return {
    exerciseId: EXERCISE_ID,
    modelVersion: MODEL_VERSION,
    progress,
    q,
    phase: getHeelRaisePhase(progress),
    camera: { id: 'authored-left-near-oblique', nearAnatomicalSide: 'left', mirrored: Boolean(mirrored) },
    sideMode: 'bilateral',
    limbs,
    head: { center: add(centerShoulder, point(0, -26)), radius: 15 },
    contacts,
    equipment: {
      type: 'ordinary-stable-chair',
      isPilatesChair: false,
      railContacts: [point(355, 170), point(371, 162)],
      floorContacts: [point(395, 326), point(411, 318), point(451, 326), point(467, 318)],
    },
  };
}

const number = (value) => String(Math.round(value * 1000) / 1000);
const xy = (p) => `${number(p.x)} ${number(p.y)}`;
const path = (points) => points.map((p, index) => `${index ? 'L' : 'M'} ${xy(p)}`).join(' ');

export function renderHeelRaiseSvg(progress, options = {}) {
  const pose = getHeelRaisePose(progress, options);
  const { left, right } = pose.limbs;
  const limb = (side) => {
    const leg = pose.limbs[side];
    const color = side === 'left' ? '#285b4c' : '#9a7259';
    const dash = side === 'right' ? ' stroke-dasharray="6 4"' : '';
    return `<g data-anatomical-side="${side}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${path([leg.hip, leg.knee, leg.ankle])}" stroke-width="14" opacity=".72"/>
      <path d="${path([leg.hip, leg.knee, leg.ankle])}" stroke-width="3"${dash}/>
      <path d="${path([leg.shoulder, leg.elbow, leg.hand])}" stroke-width="9" opacity=".65"/>
      <path d="${path([leg.shoulder, leg.elbow, leg.hand])}" stroke-width="2.5"${dash}/>
      <path d="${path([leg.heel, leg.ankle, leg.forefoot])}" stroke-width="6"/>
      <path d="${path([leg.heel, leg.forefoot, leg.toe])}" stroke-width="4"${dash}/>
      <circle cx="${number(leg.knee.x)}" cy="${number(leg.knee.y)}" r="3.5" fill="#fcfaf5" stroke-width="1.5"/>
      <circle cx="${number(leg.hand.x)}" cy="${number(leg.hand.y)}" r="4" fill="#285b4c" stroke="#fcfaf5" stroke-width="1.5"/>
      <circle cx="${number(leg.forefoot.x)}" cy="${number(leg.forefoot.y)}" r="4" fill="#285b4c" stroke="#fcfaf5" stroke-width="1.5"/>
      <circle cx="${number(leg.heel.x)}" cy="${number(leg.heel.y)}" r="4" fill="${pose.q === 0 ? '#285b4c' : '#c17c52'}" stroke="#fcfaf5" stroke-width="1.5"/>
    </g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="양측 지지 뒤꿈치 들기 제작 초안 · ${pose.phase.label} · 전문가 미검토">
    <title>양측 지지 뒤꿈치 들기 · 독립 제작 초안</title>
    <desc>앞발과 손의 접촉을 고정한 원본 도해입니다. 일반 의자 지지를 사용하며 필라테스 체어가 아닙니다. 각도와 신체 비율은 제작 선택이고 개인별 적합성과 자세 정확성은 검토하지 않았습니다.</desc>
    <rect width="640" height="360" rx="16" fill="#f5f3eb"/>
    <text x="24" y="30" fill="#6a725f" font-family="sans-serif" font-size="13">제작 초안 · 전문가 미검토 · 양쪽 함께</text>
    <g${pose.camera.mirrored ? ' transform="translate(640 0) scale(-1 1)"' : ''}>
      <path d="M 150 326 L 430 326 L 488 318 L 208 318 Z" fill="#e1e6d9"/>
      <path d="M 335 170 L 351 162 L 411 162 L 395 170 Z" fill="#b99b75" stroke="#85735d" stroke-width="2"/>
      <path d="M 395 170 L 395 326 M 411 162 L 411 318 M 395 250 L 451 250 L 467 242 L 411 242 Z M 451 250 L 451 326 M 467 242 L 467 318" fill="none" stroke="#a48c6d" stroke-width="6" stroke-linejoin="round"/>
      ${limb('right')}
      <path d="${path([left.shoulder, right.shoulder, right.hip, left.hip])} Z" fill="#cedbc9" stroke="#6b826d" stroke-width="2"/>
      ${limb('left')}
      <path d="M ${number(pose.head.center.x)} ${number(pose.head.center.y + 14)} L ${number((left.shoulder.x + right.shoulder.x) / 2)} ${number((left.shoulder.y + right.shoulder.y) / 2)}" stroke="#84997e" stroke-width="8"/>
      <circle cx="${number(pose.head.center.x)}" cy="${number(pose.head.center.y)}" r="15" fill="#dfc6aa" stroke="#7d826e" stroke-width="2"/>
      <path d="M ${number(pose.head.center.x + 13)} ${number(pose.head.center.y - 4)} l 7 5 -7 3" fill="#dfc6aa" stroke="#7d826e" stroke-width="1.5"/>
    </g>
    <g font-family="sans-serif" font-size="12" fill="#586653">
      <text x="24" y="327">실선: 몸의 왼쪽</text><text x="24" y="345">점선: 몸의 오른쪽</text>
      <text x="466" y="60">손: 지지물 접촉</text><text x="466" y="79">앞발: 바닥 접촉</text>
      <text x="466" y="98">뒤꿈치: ${pose.q === 0 ? '바닥 접촉' : '바닥에서 떨어짐'}</text>
    </g>
  </svg>`;
}
