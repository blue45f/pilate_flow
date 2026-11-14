import { useId } from 'react';
import type { Point2D, RigJointMap } from '../data/movementVisualRigCatalog';
import { resolveRigFoot, resolveRigHand, resolveRigHeadFrame } from '../utils/motionRigGeometry';
import { mapSpriteTriangle, markPractitionerAtlasReady, PRACTITIONER_ATLAS_URL } from '../utils/generatedPractitionerArt';

type Crop = readonly [number, number, number, number];
// Atlas coordinates are recorded from the generated source, normalized to 1254².
const CROPS = {
  head: [40, 16, 344, 375], torso: [520, 10, 223, 393], hip: [902, 50, 250, 321],
  upperArm: [129, 432, 148, 376], forearm: [559, 433, 113, 378], hand: [959, 442, 180, 368],
  thigh: [101, 847, 208, 389], calf: [544, 847, 143, 383], foot: [857, 967, 352, 178],
} as const satisfies Record<string, Crop>;
const n = (value: number) => Number(value.toFixed(5));

function Sprite({ atlasId, crop, width, height, x = 0, y = 0 }: {
  atlasId: string; crop: Crop; width: number; height: number; x?: number; y?: number;
}) {
  return <svg x={x} y={y} width={width} height={height} viewBox={crop.join(' ')} preserveAspectRatio="none" overflow="hidden"><use href={`#${atlasId}`} /></svg>;
}

function Limb({ atlasId, crop, from, to, width, overlap = 2, flip = 1 }: {
  atlasId: string; crop: Crop; from: Point2D; to: Point2D; width: number; overlap?: number; flip?: number;
}) {
  const clipId = `practitioner-limb-${useId().replace(/:/g, '')}`;
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.max(0.1, Math.hypot(dx, dy));
  return <g transform={`matrix(${[dy / length * flip, -dx / length * flip, dx / length, dy / length, from.x, from.y].map(n).join(' ')})`}>
    <defs><clipPath id={clipId}><rect x={-width / 2} y={-overlap} width={width} height={length + overlap * 1.6} rx={width / 2} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}><Sprite atlasId={atlasId} crop={crop} x={-width / 2} y={-overlap} width={width} height={length + overlap * 1.6} /></g>
  </g>;
}

function Foot({ atlasId, ankle, heel, toe }: { atlasId: string; ankle: Point2D; heel: Point2D; toe: Point2D }) {
  const length = Math.max(1, Math.hypot(toe.x - heel.x, toe.y - heel.y));
  const ux = (toe.x - heel.x) / length, uy = (toe.y - heel.y) / length;
  const side = (-uy * (ankle.x - heel.x) + ux * (ankle.y - heel.y)) >= 0 ? -1 : 1;
  const [x, y, width, height] = CROPS.foot;
  const sx = length / (width * 0.85);
  const sy = Math.max(5, Math.min(10, height * sx)) / height;
  const a = ux * sx, b = uy * sx, c = -uy * sy * side, d = ux * sy * side;
  const heelX = x + width * 0.08, baselineY = y + height * 0.85;
  return <g data-generated-part="foot" transform={`matrix(${[a, b, c, d, heel.x - a * heelX - c * baselineY, heel.y - b * heelX - d * baselineY].map(n).join(' ')})`}>
    <Sprite atlasId={atlasId} crop={CROPS.foot} x={x} y={y} width={width} height={height} />
  </g>;
}

/** A continuous cloth mesh follows the existing authored spine. */
function Torso({ atlasId, id, points, width, flip }: { atlasId: string; id: string; points: Point2D[]; width: number; flip: number }) {
  const centers = points.flatMap((p, i) => {
    if (i === points.length - 1) return [p];
    const a = points[Math.max(0, i - 1)], b = p, c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
    return [0, 0.25, 0.5, 0.75].map((t) => {
      const coordinate = (key: 'x' | 'y') => 0.5 * ((2 * b[key]) + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t * t + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t * t * t);
      return { x: coordinate('x'), y: coordinate('y') };
    });
  });
  const vertices = centers.map((p, i) => {
    const prev = centers[Math.max(0, i - 1)], next = centers[Math.min(centers.length - 1, i + 1)];
    const length = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
    const nx = (next.y - prev.y) / length * flip, ny = -(next.x - prev.x) / length * flip;
    return [{ x: p.x - nx * width / 2, y: p.y - ny * width / 2 }, { x: p.x + nx * width / 2, y: p.y + ny * width / 2 }];
  });
  return <g data-generated-part="torso">{vertices.slice(0, -1).flatMap((row, i) => {
    const [x, y, w, h] = CROPS.torso;
    const y0 = y + h * i / (vertices.length - 1), y1 = y + h * (i + 1) / (vertices.length - 1);
    const source = [{ x, y: y0 }, { x: x + w, y: y0 }, { x, y: y1 }, { x: x + w, y: y1 }];
    const target = [row[0], row[1], vertices[i + 1][0], vertices[i + 1][1]];
    return [[0, 1, 2], [1, 3, 2]].map((indices, t) => {
      const clipId = `${id}-mesh-${i}-${t}`;
      const s = indices.map((index) => source[index]), d = indices.map((index) => target[index]);
      const center = { x: d.reduce((sum, p) => sum + p.x, 0) / 3, y: d.reduce((sum, p) => sum + p.y, 0) / 3 };
      const overlap = d.map((p) => {
        const distance = Math.hypot(p.x - center.x, p.y - center.y) || 1;
        return { x: p.x + (p.x - center.x) / distance * 0.28, y: p.y + (p.y - center.y) / distance * 0.28 };
      });
      return <g key={clipId}>
        <defs><clipPath id={clipId}><polygon points={overlap.map((p) => `${n(p.x)},${n(p.y)}`).join(' ')} /></clipPath></defs>
        <g clipPath={`url(#${clipId})`}><use href={`#${atlasId}`} transform={mapSpriteTriangle(s, d)} /></g>
      </g>;
    });
  })}</g>;
}

export function GeneratedPractitionerFigure({ joints, referenceJoints, activeSide, mirrored, scale, id, ready = true, onLoad, onError }: {
  joints: RigJointMap; referenceJoints: RigJointMap; activeSide: 'left' | 'right'; mirrored: boolean; scale: number; id: string; ready?: boolean; onLoad?: () => void; onError?: () => void;
}) {
  const atlasId = `${id}-practitioner-atlas`;
  const point = (p: Point2D): Point2D => ({ x: mirrored ? 320 - p.x : p.x, y: p.y });
  const j = (key: keyof RigJointMap) => point(joints[key] ?? joints.pelvis);
  const mirrorSign = mirrored ? -1 : 1;
  const foot = resolveRigFoot(joints, 'near', referenceJoints), farFoot = resolveRigFoot(joints, 'far', referenceJoints);
  const shifted = (key: keyof RigJointMap, x: number, y: number) => point({ x: joints[key]!.x + x, y: joints[key]!.y + y });
  const near = { hip: j('hip'), knee: j('knee'), ankle: point(foot.ankle), heel: point(foot.heel), toe: point(foot.toe), shoulder: j('shoulder'), elbow: j('elbow'), wrist: j('wrist'), hand: point(resolveRigHand(joints, 'near')) };
  const far = { hip: joints.farHip ? j('farHip') : shifted('hip', -3, -3), knee: joints.farKnee ? j('farKnee') : shifted('knee', -4, -4), ankle: point(farFoot.ankle), heel: point(farFoot.heel), toe: point(farFoot.toe), shoulder: joints.farShoulder ? j('farShoulder') : shifted('shoulder', -3, -3), elbow: joints.farElbow ? j('farElbow') : shifted('elbow', -4, -3), wrist: joints.farWrist ? j('farWrist') : shifted('wrist', -4, -3), hand: point(resolveRigHand(joints, 'far')) };
  const foreground = activeSide === 'left' ? far : near, background = activeSide === 'left' ? near : far;
  const frame = resolveRigHeadFrame(joints, referenceJoints);
  const face = { x: frame.faceAxis.x * mirrorSign, y: frame.faceAxis.y }, up = { x: frame.headAxis.x * mirrorSign, y: frame.headAxis.y };
  const setupFrame = resolveRigHeadFrame(referenceJoints, referenceJoints);
  const dx = referenceJoints.pelvis.x - referenceJoints.neck.x, dy = referenceJoints.pelvis.y - referenceJoints.neck.y;
  const profileSign = (dy * setupFrame.faceAxis.x - dx * setupFrame.faceAxis.y >= 0 ? 1 : -1) * mirrorSign;
  const [hx, hy, hw, hh] = CROPS.head;
  const headScale = 30 / hh * scale, head = j('head');
  const anchorX = hx + hw * 0.54, anchorY = hy + hh * 0.405;
  const headTransform = `matrix(${[face.x * headScale, face.y * headScale, -up.x * headScale, -up.y * headScale, head.x - (face.x * anchorX - up.x * anchorY) * headScale, head.y - (face.y * anchorX - up.y * anchorY) * headScale].map(n).join(' ')})`;
  const leg = (limb: typeof near) => <>
    <Limb atlasId={atlasId} crop={CROPS.thigh} from={limb.hip} to={limb.knee} width={20 * scale} overlap={4 * scale} flip={profileSign} />
    <Limb atlasId={atlasId} crop={CROPS.calf} from={limb.knee} to={limb.ankle} width={14 * scale} overlap={3 * scale} flip={profileSign} />
    <Foot atlasId={atlasId} ankle={limb.ankle} heel={limb.heel} toe={limb.toe} />
  </>;
  const arm = (limb: typeof near) => <>
    <Limb atlasId={atlasId} crop={CROPS.upperArm} from={limb.shoulder} to={limb.elbow} width={12.5 * scale} overlap={5 * scale} flip={profileSign} />
    <Limb atlasId={atlasId} crop={CROPS.forearm} from={limb.elbow} to={limb.wrist} width={8.5 * scale} overlap={2.5 * scale} flip={profileSign} />
    <Limb atlasId={atlasId} crop={CROPS.hand} from={limb.wrist} to={limb.hand} width={6.5 * scale} overlap={scale} flip={profileSign} />
  </>;
  return <g data-layer="generated-practitioner" data-artwork-origin="imagegen" data-atlas-version="3" opacity={ready ? 1 : 0} aria-hidden="true">
    <defs><image id={atlasId} href={PRACTITIONER_ATLAS_URL} width={1254} height={1254} onLoad={() => { markPractitionerAtlasReady(); onLoad?.(); }} onError={onError} /></defs>
    <g data-generated-depth="far" opacity={0.78}>{leg(background)}{arm(background)}</g>
    <Torso atlasId={atlasId} id={id} points={[j('neck'), j('thoracic'), j('lumbar'), j('pelvis')]} width={28 * scale} flip={profileSign} />
    <g data-generated-depth="near">{leg(foreground)}</g>
    <g data-generated-part="head" transform={headTransform}><Sprite atlasId={atlasId} crop={CROPS.head} x={hx} y={hy} width={hw} height={hh} /></g>
    <g data-generated-depth="near">{arm(foreground)}</g>
  </g>;
}
