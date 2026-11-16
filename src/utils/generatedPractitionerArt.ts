import type { Point2D } from '../data/movementVisualRigCatalog';

export const PRACTITIONER_ATLAS_URL = '/images/motion-atlas-v3/practitioner.webp';
let atlasReady = false;
export const isPractitionerAtlasReady = () => atlasReady;
export const markPractitionerAtlasReady = () => { atlasReady = true; };

/** Painted cuff, heel and toe landmarks in the original 1254px atlas. */
export const PRACTITIONER_FOOT_ANCHORS: readonly Point2D[] = [
  { x: 944, y: 1008 },
  { x: 878, y: 1130 },
  { x: 1196, y: 1130 },
];

/** The rig ankle is a joint inside the sock, not the top of its cuff. Preserve
 * both sole contacts and keep a small cuff above a nearly flat ankle/sole
 * triangle. Its side comes from setup so a passing joint cannot flip the foot. */
export function getPractitionerFootTargets(
  ankle: Point2D,
  heel: Point2D,
  toe: Point2D,
  referenceAnkle: Point2D,
  referenceHeel: Point2D,
  referenceToe: Point2D,
  scale: number,
): readonly Point2D[] {
  const dx = toe.x - heel.x, dy = toe.y - heel.y;
  const length = Math.hypot(dx, dy) || 1;
  const rx = referenceToe.x - referenceHeel.x, ry = referenceToe.y - referenceHeel.y;
  const side = ry * (referenceAnkle.x - referenceHeel.x) - rx * (referenceAnkle.y - referenceHeel.y) >= 0 ? 1 : -1;
  const nx = dy / length * side, ny = -dx / length * side;
  const height = (ankle.x - heel.x) * nx + (ankle.y - heel.y) * ny;
  const cuffHeight = Math.max(5.5 * scale, Math.min(9 * scale, height));
  return [
    { x: ankle.x + nx * (cuffHeight - height), y: ankle.y + ny * (cuffHeight - height) },
    heel,
    toe,
  ];
}

export interface PractitionerTorsoRow {
  readonly left: Point2D;
  readonly right: Point2D;
  readonly textureV: number;
}

function sampleSpine(points: readonly Point2D[]): Point2D[] {
  return points.flatMap((point, index) => {
    if (index === points.length - 1) return [point];
    const a = points[Math.max(0, index - 1)];
    const b = point;
    const c = points[index + 1];
    const d = points[Math.min(points.length - 1, index + 2)];
    return [0, 0.25, 0.5, 0.75].map((t) => {
      const coordinate = (axis: 'x' | 'y') =>
        0.5 * (2 * b[axis] + (-a[axis] + c[axis]) * t +
          (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t +
          (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t * t * t);
      return { x: coordinate('x'), y: coordinate('y') };
    });
  });
}

/** Texture coordinates follow setup arc length, not array indices or the
 * changing pose. A short neck section cannot consume a third of the shirt,
 * and a spine curl cannot make the clothing slide along the body. */
export function getPractitionerTorsoRows(
  points: readonly Point2D[],
  referencePoints: readonly Point2D[],
  width: number,
  flip: number,
  endWidth = width,
): PractitionerTorsoRow[] {
  const centers = sampleSpine(points);
  const reference = sampleSpine(referencePoints);
  let distance = 0;
  const distances = reference.map((point, index) => {
    if (index > 0) distance += Math.hypot(
      point.x - reference[index - 1].x,
      point.y - reference[index - 1].y,
    );
    return distance;
  });
  return centers.map((point, index) => {
    const previous = centers[Math.max(0, index - 1)];
    const next = centers[Math.min(centers.length - 1, index + 1)];
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
    const nx = (next.y - previous.y) / length * flip;
    const ny = -(next.x - previous.x) / length * flip;
    const textureV = distance > 0.001 ? distances[index] / distance : index / Math.max(1, centers.length - 1);
    const tail = Math.max(0, Math.min(1, (textureV - 0.82) / 0.18));
    const rowWidth = width + (endWidth - width) * tail * tail * (3 - 2 * tail);
    return {
      left: { x: point.x - nx * rowWidth / 2, y: point.y - ny * rowWidth / 2 },
      right: { x: point.x + nx * rowWidth / 2, y: point.y + ny * rowWidth / 2 },
      textureV,
    };
  });
}

export function mapSpriteTriangle(source: readonly Point2D[], target: readonly Point2D[]): string {
  const [p, q, r] = source;
  const [u, v, w] = target;
  const sx1 = q.x - p.x, sy1 = q.y - p.y, sx2 = r.x - p.x, sy2 = r.y - p.y;
  const det = sx1 * sy2 - sx2 * sy1;
  if (Math.abs(det) < 1e-8) return 'matrix(1 0 0 1 0 0)';
  const a = ((v.x - u.x) * sy2 - (w.x - u.x) * sy1) / det;
  const c = (sx1 * (w.x - u.x) - sx2 * (v.x - u.x)) / det;
  const b = ((v.y - u.y) * sy2 - (w.y - u.y) * sy1) / det;
  const d = (sx1 * (w.y - u.y) - sx2 * (v.y - u.y)) / det;
  return `matrix(${[a, b, c, d, u.x - a * p.x - c * p.y, u.y - b * p.x - d * p.y].map((n) => Number(n.toFixed(6))).join(' ')})`;
}
