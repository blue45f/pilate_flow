import type { Point2D } from '../data/movementVisualRigCatalog';

export const PRACTITIONER_ATLAS_URL = '/images/motion-atlas-v3/practitioner.webp';
let atlasReady = false;
export const isPractitionerAtlasReady = () => atlasReady;
export const markPractitionerAtlasReady = () => { atlasReady = true; };

export function mapSpriteTriangle(source: Point2D[], target: Point2D[]): string {
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
