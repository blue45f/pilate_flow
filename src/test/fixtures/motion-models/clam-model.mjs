/**
 * Original schematic authoring draft, not a validated exercise demonstration.
 * Source descriptions and authored geometry are separated in clam-source-facts.json.
 * No photographs, video frames, motion capture, or source illustrations were reused.
 */
export const MODEL_VERSION = 'clam-original-schematic-0.1.0';
export const EXERCISE_ID = 'original-mat-clam';
export const PHASES = Object.freeze([
  Object.freeze({ id: 'setup', label: '시작 배치', labelKo: '시작 배치', start: 0, end: 0.12, sample: 0 }),
  Object.freeze({ id: 'move', label: '위쪽 무릎 열림', labelKo: '위쪽 무릎 열림', start: 0.12, end: 0.42, sample: 0.29 }),
  Object.freeze({ id: 'turn', label: '열린 배치', labelKo: '열린 배치', start: 0.42, end: 0.58, sample: 0.51 }),
  Object.freeze({ id: 'return', label: '위쪽 무릎 돌아옴', labelKo: '위쪽 무릎 돌아옴', start: 0.58, end: 0.88, sample: 0.74 }),
  Object.freeze({ id: 'finish', label: '처음 배치', labelKo: '처음 배치', start: 0.88, end: 1, sample: 1 }),
]);

const MAX_OPENING_RAD = 0.62; // An authored drawing parameter, not a clinical angle.
const WIDTH = 640;
const clone = (point) => [...point];
const add = (a, b) => a.map((n, i) => n + b[i]);
const subtract = (a, b) => a.map((n, i) => n - b[i]);
const multiply = (a, n) => a.map((v) => v * n);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(...a);
const smoothstep = (t) => t * t * (3 - 2 * t);

const FIXED = Object.freeze({
  topHip: Object.freeze([300, 0, 56]),
  bottomHip: Object.freeze([300, 0, 32]),
  bottomKnee: Object.freeze([390, 100, 22]),
  heelContact: Object.freeze([480, 0, 12]),
  toeContact: Object.freeze([514, 5, 12]),
  shoulder: Object.freeze([192, 0, 37]),
  headCenter: Object.freeze([125, 0, 46]),
  elbow: Object.freeze([226, 64, 20]),
  hand: Object.freeze([278, 54, 12]),
  headPillowContact: Object.freeze([125, 0, 18]),
  shoulderMatContact: Object.freeze([192, 0, 0]),
  pelvisMatContact: Object.freeze([300, 0, 0]),
  bottomHeelMatContact: Object.freeze([480, 0, 0]),
});

/** Orthographic camera: x is along the body, y across the mat, z above the mat. */
export function projectClamPoint(point, mirrored = false) {
  const x = point[0] + point[1] * 0.08;
  return [mirrored ? WIDTH - x : x, 268 + point[1] * 0.32 - point[2]];
}

function openingAt(progress) {
  if (progress <= 0.12 || progress >= 0.88) return 0;
  if (progress < 0.42) return smoothstep((progress - 0.12) / 0.3);
  if (progress <= 0.58) return 1;
  return 1 - smoothstep((progress - 0.58) / 0.3);
}

function phaseAt(progress) {
  return PHASES.find((phase) => progress < phase.end) ?? PHASES.at(-1);
}

/**
 * Rotate the top knee around the fixed hip–heel axis. Both segment lengths stay
 * constant in model space. This geometric constraint is not a biomechanical model.
 */
function getTopKnee(angleRad) {
  const hipToHeel = subtract(FIXED.heelContact, FIXED.topHip);
  const axis = multiply(hipToHeel, 1 / length(hipToHeel));
  const center = multiply(add(FIXED.topHip, FIXED.heelContact), 0.5);
  const radial = [0, 100, 0];
  const rotated = add(
    add(multiply(radial, Math.cos(angleRad)), multiply(cross(axis, radial), Math.sin(angleRad))),
    multiply(axis, dot(axis, radial) * (1 - Math.cos(angleRad))),
  );
  return add(center, rotated);
}

export function getClamPose(progress, { activeSide = 'right', mirrored = false } = {}) {
  if (!Number.isFinite(progress)) throw new TypeError('progress must be finite');
  if (activeSide !== 'left' && activeSide !== 'right') throw new TypeError('activeSide must be left or right');
  if (typeof mirrored !== 'boolean') throw new TypeError('mirrored must be boolean');
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const opening = openingAt(clampedProgress);
  const topKnee = getTopKnee(MAX_OPENING_RAD * opening);
  const supportSide = activeSide === 'right' ? 'left' : 'right';
  const top = {
    anatomicalSide: activeSide,
    placement: 'top',
    hip: clone(FIXED.topHip),
    knee: topKnee,
    heel: clone(FIXED.heelContact),
    toe: clone(FIXED.toeContact),
  };
  const bottom = {
    anatomicalSide: supportSide,
    placement: 'bottom',
    hip: clone(FIXED.bottomHip),
    knee: clone(FIXED.bottomKnee),
    heel: clone(FIXED.heelContact),
    toe: clone(FIXED.toeContact),
  };
  const legs = { [activeSide]: top, [supportSide]: bottom };
  const world = {
    topHip: top.hip,
    topKnee: top.knee,
    bottomHip: bottom.hip,
    bottomKnee: bottom.knee,
    topHeel: top.heel,
    bottomHeel: bottom.heel,
    topToe: top.toe,
    bottomToe: bottom.toe,
    shoulder: clone(FIXED.shoulder),
    headCenter: clone(FIXED.headCenter),
    elbow: clone(FIXED.elbow),
    hand: clone(FIXED.hand),
  };
  const screen = Object.fromEntries(Object.entries(world).map(([key, point]) => [key, projectClamPoint(point, mirrored)]));
  return {
    exerciseId: EXERCISE_ID,
    modelVersion: MODEL_VERSION,
    progress: clampedProgress,
    phase: phaseAt(clampedProgress).id,
    phaseLabelKo: phaseAt(clampedProgress).labelKo,
    opening,
    openingRad: MAX_OPENING_RAD * opening,
    activeSide,
    supportSide,
    mirrored,
    camera: { projection: 'authored-oblique-orthographic', mirrored },
    legs,
    world,
    screen,
    anchors: {
      headPillow: clone(FIXED.headPillowContact),
      shoulderMat: clone(FIXED.shoulderMatContact),
      pelvisMat: clone(FIXED.pelvisMatContact),
      heelTogether: clone(FIXED.heelContact),
      bottomHeelMat: clone(FIXED.bottomHeelMatContact),
    },
    review: { status: 'unreviewed', professionalReviewCount: 0 },
    safetyAssessment: 'unassessed',
    autoRecommendationEligible: false,
  };
}

const number = (value) => Number(value.toFixed(3));
const pointString = (point) => point.map(number).join(',');
const polyline = (points) => points.map(pointString).join(' ');
const sideKo = (side) => side === 'right' ? '오른쪽' : '왼쪽';

/** Complete, original SVG. No external media, fonts, scripts, or URLs are loaded. */
export function renderClamSvg(progress, options = {}) {
  const pose = getClamPose(progress, options);
  const p = (point) => projectClamPoint(point, pose.mirrored);
  const s = pose.screen;
  const mat = [[55, -55, 0], [553, -55, 0], [553, 130, 0], [55, 130, 0]].map(p);
  const pillow = [[89, -24, 18], [158, -24, 18], [158, 28, 18], [89, 28, 18]].map(p);
  const torso = [[169, 0, 65], [211, 0, 73], [302, 0, 73], [321, 0, 51], [316, 0, 18], [300, 0, 0], [280, 0, 5], [192, 0, 0], [166, 0, 20]].map(p);
  const topLeg = [s.topHip, s.topKnee, s.topHeel];
  const bottomLeg = [s.bottomHip, s.bottomKnee, s.bottomHeel];
  const leaderStart = p([480, 0, 12]);
  const leaderEnd = [pose.mirrored ? 119 : 521, 224];
  const textAnchor = pose.mirrored ? 'start' : 'end';
  const contactTextX = pose.mirrored ? 29 : 611;
  const phase = PHASES.find((entry) => entry.id === pose.phase);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="사이드 클램 오리지널 도식 제작 초안. 전문가 미검토. 위쪽 ${sideKo(pose.activeSide)} 무릎 ${pose.opening === 0 ? '닫힌' : '열린'} 배치. 운동 시범 아님.">
  <title>사이드 클램 · 오리지널 도식 제작 초안</title>
  <desc>바닥 지지와 발뒤꿈치 접촉을 고정한 단순 기하 도식입니다. 관절 각도, 몸 비율, 화면 재생 속도는 제작 선택이며 운동의 정확성·안전성은 검증되지 않았습니다. 현재 위쪽은 ${sideKo(pose.activeSide)}, 아래쪽은 ${sideKo(pose.supportSide)}입니다. 좌우 화면 반전은 해부학적 쪽을 바꾸지 않습니다.</desc>
  <rect width="640" height="360" rx="18" fill="#f7f5ef"/>
  <g font-family="system-ui, sans-serif" fill="#254d45">
    <text x="24" y="29" font-size="20" font-weight="700">사이드 클램</text>
    <text x="24" y="52" font-size="14" fill="#875641">제작 초안 · 전문가 미검토</text>
    <text x="616" y="29" text-anchor="end" font-size="13">위쪽 ${sideKo(pose.activeSide)} · 아래쪽 ${sideKo(pose.supportSide)}</text>
    <text x="616" y="52" text-anchor="end" font-size="12" fill="#586a60">${pose.mirrored ? '화면 반전 켬 · 해부학적 쪽 유지' : '고정 사선 시점 · 해부학적 쪽 표시'}</text>
  </g>
  <g stroke-linecap="round" stroke-linejoin="round">
    <polygon points="${polyline(mat)}" fill="#dbe4d9" stroke="#b4c7b7" stroke-width="2"/>
    <polygon points="${polyline(pillow)}" fill="#fffdf8" stroke="#b9baab" stroke-width="2"/>
    <polyline points="${polyline(bottomLeg)}" fill="none" stroke="#74978a" stroke-width="24"/>
    <polyline points="${polyline(bottomLeg)}" fill="none" stroke="#466e62" stroke-width="2" stroke-dasharray="5 6"/>
    <polyline points="${polyline([s.bottomHeel, s.bottomToe])}" fill="none" stroke="#74978a" stroke-width="16"/>
    <polyline points="${polyline([p([145, 0, 44]), p([188, 0, 40])])}" fill="none" stroke="#d4a891" stroke-width="16"/>
    <polygon points="${polyline(torso)}" fill="#a6bba8" stroke="#4b7566" stroke-width="2"/>
    <polyline points="${polyline([s.shoulder, s.elbow, s.hand])}" fill="none" stroke="#d4a891" stroke-width="16"/>
    <circle cx="${number(s.headCenter[0])}" cy="${number(s.headCenter[1])}" r="28" fill="#d4a891" stroke="#916a56" stroke-width="2"/>
    <polyline points="${polyline(topLeg)}" fill="none" stroke="#c88666" stroke-width="23"/>
    <polyline points="${polyline(topLeg)}" fill="none" stroke="#875641" stroke-width="2"/>
    <polyline points="${polyline([s.topHeel, s.topToe])}" fill="none" stroke="#c88666" stroke-width="15"/>
    <circle cx="${number(s.topHip[0])}" cy="${number(s.topHip[1])}" r="6" fill="#f7f5ef" stroke="#875641" stroke-width="2"/>
    <circle cx="${number(s.topKnee[0])}" cy="${number(s.topKnee[1])}" r="6" fill="#f7f5ef" stroke="#875641" stroke-width="2"/>
    <circle cx="${number(s.topHeel[0])}" cy="${number(s.topHeel[1])}" r="5" fill="#f7f5ef" stroke="#875641" stroke-width="2"/>
    <circle cx="${number(leaderStart[0])}" cy="${number(leaderStart[1])}" r="12" fill="none" stroke="#254d45" stroke-width="1.5"/>
    <line x1="${number(leaderStart[0])}" y1="${number(leaderStart[1] - 12)}" x2="${leaderEnd[0]}" y2="${leaderEnd[1]}" stroke="#466e62" stroke-width="1.5"/>
  </g>
  <g font-family="system-ui, sans-serif" fill="#254d45">
    <text x="${contactTextX}" y="218" text-anchor="${textAnchor}" font-size="13">발뒤꿈치 접촉 고정</text>
    <text x="24" y="336" font-size="14" font-weight="600">${phase.labelKo}</text>
    <text x="616" y="336" text-anchor="end" font-size="12" fill="#586a60">도형·각도는 제작 선택 · 운동 시범 아님</text>
  </g>
</svg>`;
}
