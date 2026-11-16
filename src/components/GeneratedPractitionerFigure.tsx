import { useId } from 'react';
import type { Point2D, RigJointMap } from '../data/movementVisualRigCatalog';
import { resolveRigFoot, resolveRigHand, resolveRigHeadFrame } from '../utils/motionRigGeometry';
import {
  getPractitionerFootTargets,
  getPractitionerTorsoRows,
  mapSpriteTriangle,
  markPractitionerAtlasReady,
  PRACTITIONER_ATLAS_URL,
  PRACTITIONER_FOOT_ANCHORS,
} from '../utils/generatedPractitionerArt';

type Crop = readonly [number, number, number, number];
// Atlas coordinates are recorded from the generated source, normalized to 1254².
const CROPS = {
  head: [40, 16, 344, 375],
  torso: [520, 10, 223, 393],
  hip: [902, 50, 250, 321],
  upperArm: [129, 432, 148, 376],
  forearm: [559, 433, 113, 378],
  hand: [959, 442, 180, 368],
  thigh: [101, 847, 208, 389],
  calf: [544, 847, 143, 383],
  foot: [857, 967, 352, 178],
} as const satisfies Record<string, Crop>;
const n = (value: number) => Number(value.toFixed(5));

function Sprite({
  atlasId,
  crop,
  width,
  height,
  x = 0,
  y = 0,
}: {
  atlasId: string;
  crop: Crop;
  width: number;
  height: number;
  x?: number;
  y?: number;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={crop.join(' ')}
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <use href={`#${atlasId}`} />
    </svg>
  );
}

function Limb({
  atlasId,
  crop,
  from,
  to,
  width,
  overlap = 2,
  flip = 1,
}: {
  atlasId: string;
  crop: Crop;
  from: Point2D;
  to: Point2D;
  width: number;
  overlap?: number;
  flip?: number;
}) {
  const clipId = `practitioner-limb-${useId().replace(/:/g, '')}`;
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const length = Math.max(0.1, Math.hypot(dx, dy));
  return (
    <g
      transform={`matrix(${[(dy / length) * flip, (-dx / length) * flip, dx / length, dy / length, from.x, from.y].map(n).join(' ')})`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={-width / 2}
            y={-overlap}
            width={width}
            height={length + overlap * 1.6}
            rx={width / 2}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <Sprite
          atlasId={atlasId}
          crop={crop}
          x={-width / 2}
          y={-overlap}
          width={width}
          height={length + overlap * 1.6}
        />
      </g>
    </g>
  );
}

function Foot({
  atlasId,
  ankle,
  heel,
  toe,
  referenceFoot,
  point,
  scale,
}: {
  atlasId: string;
  ankle: Point2D;
  heel: Point2D;
  toe: Point2D;
  referenceFoot: { ankle: Point2D; heel: Point2D; toe: Point2D };
  point: (p: Point2D) => Point2D;
  scale: number;
}) {
  const [x, y, width, height] = CROPS.foot;
  return (
    <g
      data-generated-part="foot"
      data-foot-ankle={`${ankle.x},${ankle.y}`}
      data-foot-heel={`${heel.x},${heel.y}`}
      data-foot-toe={`${toe.x},${toe.y}`}
      transform={mapSpriteTriangle(
        PRACTITIONER_FOOT_ANCHORS,
        getPractitionerFootTargets(
          ankle,
          heel,
          toe,
          point(referenceFoot.ankle),
          point(referenceFoot.heel),
          point(referenceFoot.toe),
          scale,
        ),
      )}
    >
      <Sprite atlasId={atlasId} crop={CROPS.foot} x={x} y={y} width={width} height={height} />
    </g>
  );
}

/** A continuous cloth mesh follows the existing authored spine. */
function Torso({
  atlasId,
  id,
  points,
  referencePoints,
  width,
  endWidth,
  flip,
}: {
  atlasId: string;
  id: string;
  points: Point2D[];
  referencePoints: Point2D[];
  width: number;
  endWidth: number;
  flip: number;
}) {
  const vertices = getPractitionerTorsoRows(points, referencePoints, width, flip, endWidth);
  return (
    <g data-generated-part="torso">
      {vertices.slice(0, -1).flatMap((row, i) => {
        const [x, y, w, h] = CROPS.torso;
        const y0 = y + h * row.textureV,
          y1 = y + h * vertices[i + 1].textureV;
        const source = [
          { x, y: y0 },
          { x: x + w, y: y0 },
          { x, y: y1 },
          { x: x + w, y: y1 },
        ];
        const target = [row.left, row.right, vertices[i + 1].left, vertices[i + 1].right];
        return [
          [0, 1, 2],
          [1, 3, 2],
        ].map((indices, t) => {
          const clipId = `${id}-mesh-${i}-${t}`;
          const s = indices.map((index) => source[index]),
            d = indices.map((index) => target[index]);
          const center = {
            x: d.reduce((sum, p) => sum + p.x, 0) / 3,
            y: d.reduce((sum, p) => sum + p.y, 0) / 3,
          };
          // Shared UV edges need a small raster overlap; subpixel clipping otherwise
          // exposes a white triangulation grid once the vector fallback is hidden.
          const overlap = d.map((p) => {
            const distance = Math.hypot(p.x - center.x, p.y - center.y) || 1;
            return {
              x: p.x + ((p.x - center.x) / distance) * 0.7,
              y: p.y + ((p.y - center.y) / distance) * 0.7,
            };
          });
          return (
            <g key={clipId}>
              <defs>
                <clipPath id={clipId}>
                  <polygon points={overlap.map((p) => `${n(p.x)},${n(p.y)}`).join(' ')} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId})`}>
                <use href={`#${atlasId}`} transform={mapSpriteTriangle(s, d)} />
              </g>
            </g>
          );
        });
      })}
    </g>
  );
}

/** A narrow panel stays behind both the shirt and thigh. Only their gap is
 * exposed, avoiding a circular patch over the surface of the hip. */
function Pelvis({
  atlasId,
  pelvis,
  lumbar,
  hip,
  knee,
  scale,
  flip,
}: {
  atlasId: string;
  pelvis: Point2D;
  lumbar: Point2D;
  hip: Point2D;
  knee: Point2D;
  scale: number;
  flip: number;
}) {
  const clipId = `practitioner-pelvis-${useId().replace(/:/g, '')}`;
  const trunkLength = Math.hypot(pelvis.x - lumbar.x, pelvis.y - lumbar.y) || 1;
  const thighLength = Math.hypot(knee.x - hip.x, knee.y - hip.y) || 1;
  const from = {
    x: pelvis.x - ((pelvis.x - lumbar.x) / trunkLength) * 4 * scale,
    y: pelvis.y - ((pelvis.y - lumbar.y) / trunkLength) * 4 * scale,
  };
  const to = {
    x: hip.x + ((knee.x - hip.x) / thighLength) * 4 * scale,
    y: hip.y + ((knee.y - hip.y) / thighLength) * 4 * scale,
  };
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const length = Math.max(0.1, Math.hypot(dx, dy));
  const width = 20 * scale,
    endWidth = 18 * scale;
  return (
    <g
      data-generated-part="pelvis"
      transform={`matrix(${[
        (dy / length) * flip,
        (-dx / length) * flip,
        dx / length,
        dy / length,
        from.x,
        from.y,
      ]
        .map(n)
        .join(' ')})`}
    >
      <defs>
        <clipPath id={clipId}>
          <polygon
            points={`${-width / 2},0 ${width / 2},0 ${endWidth / 2},${length} ${-endWidth / 2},${length}`}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <Sprite atlasId={atlasId} crop={CROPS.hip} x={-width / 2} width={width} height={length} />
      </g>
    </g>
  );
}

export function GeneratedPractitionerFigure({
  joints,
  referenceJoints,
  activeSide,
  mirrored,
  scale,
  id,
  ready = true,
  onLoad,
  onError,
}: {
  joints: RigJointMap;
  referenceJoints: RigJointMap;
  activeSide: 'left' | 'right';
  mirrored: boolean;
  scale: number;
  id: string;
  ready?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const atlasId = `${id}-practitioner-atlas`;
  const farDepthId = `${id}-far-depth`;
  const point = (p: Point2D): Point2D => ({ x: mirrored ? 320 - p.x : p.x, y: p.y });
  const j = (key: keyof RigJointMap) => point(joints[key] ?? joints.pelvis);
  const mirrorSign = mirrored ? -1 : 1;
  const foot = resolveRigFoot(joints, 'near', referenceJoints),
    farFoot = resolveRigFoot(joints, 'far', referenceJoints);
  const referenceFoot = resolveRigFoot(referenceJoints, 'near', referenceJoints),
    referenceFarFoot = resolveRigFoot(referenceJoints, 'far', referenceJoints);
  const shifted = (key: keyof RigJointMap, x: number, y: number) =>
    point({ x: joints[key]!.x + x, y: joints[key]!.y + y });
  const near = {
    hip: j('hip'),
    knee: j('knee'),
    ankle: point(foot.ankle),
    heel: point(foot.heel),
    toe: point(foot.toe),
    referenceFoot,
    shoulder: j('shoulder'),
    elbow: j('elbow'),
    wrist: j('wrist'),
    hand: point(resolveRigHand(joints, 'near')),
  };
  const far = {
    hip: joints.farHip ? j('farHip') : shifted('hip', -3, -3),
    knee: joints.farKnee ? j('farKnee') : shifted('knee', -4, -4),
    ankle: point(farFoot.ankle),
    heel: point(farFoot.heel),
    toe: point(farFoot.toe),
    referenceFoot: referenceFarFoot,
    shoulder: joints.farShoulder ? j('farShoulder') : shifted('shoulder', -3, -3),
    elbow: joints.farElbow ? j('farElbow') : shifted('elbow', -4, -3),
    wrist: joints.farWrist ? j('farWrist') : shifted('wrist', -4, -3),
    hand: point(resolveRigHand(joints, 'far')),
  };
  const foreground = activeSide === 'left' ? far : near,
    background = activeSide === 'left' ? near : far;
  const frame = resolveRigHeadFrame(joints, referenceJoints);
  const face = { x: frame.faceAxis.x * mirrorSign, y: frame.faceAxis.y },
    up = { x: frame.headAxis.x * mirrorSign, y: frame.headAxis.y };
  const setupFrame = resolveRigHeadFrame(referenceJoints, referenceJoints);
  const neck = j('neck');
  // The painted neckline starts inside its transparent crop. Extend only the
  // garment viewport enough to meet the head atlas's existing neck cutout.
  const collar = { x: neck.x + up.x * 2.5 * scale, y: neck.y + up.y * 2.5 * scale };
  const referenceCollar = point({
    x: referenceJoints.neck.x + setupFrame.headAxis.x * 2.5 * scale,
    y: referenceJoints.neck.y + setupFrame.headAxis.y * 2.5 * scale,
  });
  // Tuck the final cloth row under the thigh, tapering only the connection.
  // Ending a full-width shirt at the pelvis leaves a visible straight cut.
  const thighJoin = (hip: Point2D, knee: Point2D): Point2D => {
    const length = Math.hypot(knee.x - hip.x, knee.y - hip.y) || 1;
    return {
      x: hip.x + ((knee.x - hip.x) / length) * 3.5 * scale,
      y: hip.y + ((knee.y - hip.y) / length) * 3.5 * scale,
    };
  };
  const setupHip =
    activeSide === 'left'
      ? (referenceJoints.farHip ?? { x: referenceJoints.hip.x - 3, y: referenceJoints.hip.y - 3 })
      : referenceJoints.hip;
  const setupKnee =
    activeSide === 'left'
      ? (referenceJoints.farKnee ?? {
          x: referenceJoints.knee.x - 4,
          y: referenceJoints.knee.y - 4,
        })
      : referenceJoints.knee;
  const dx = referenceJoints.pelvis.x - referenceJoints.neck.x,
    dy = referenceJoints.pelvis.y - referenceJoints.neck.y;
  const profileSign =
    (dy * setupFrame.faceAxis.x - dx * setupFrame.faceAxis.y >= 0 ? 1 : -1) * mirrorSign;
  const [hx, hy, hw, hh] = CROPS.head;
  const headScale = (30 / hh) * scale,
    head = j('head');
  const anchorX = hx + hw * 0.54,
    anchorY = hy + hh * 0.405;
  const headTransform = `matrix(${[face.x * headScale, face.y * headScale, -up.x * headScale, -up.y * headScale, head.x - (face.x * anchorX - up.x * anchorY) * headScale, head.y - (face.y * anchorX - up.y * anchorY) * headScale].map(n).join(' ')})`;
  const legJointFillId = `${id}-leg-joint-fill`;
  const skinJointFillId = `${id}-skin-joint-fill`;
  const hasDualHipSpan =
    Math.hypot(background.hip.x - foreground.hip.x, background.hip.y - foreground.hip.y) > 6;
  const leg = (limb: typeof near) => (
    <>
      <circle cx={limb.hip.x} cy={limb.hip.y} r={n(7.4 * scale)} fill={`url(#${legJointFillId})`} />
      <circle
        cx={limb.knee.x}
        cy={limb.knee.y}
        r={n(5.4 * scale)}
        fill={`url(#${legJointFillId})`}
      />
      <Limb
        atlasId={atlasId}
        crop={CROPS.thigh}
        from={limb.hip}
        to={limb.knee}
        width={20 * scale}
        overlap={6.5 * scale}
        flip={profileSign}
      />
      <Limb
        atlasId={atlasId}
        crop={CROPS.calf}
        from={limb.knee}
        to={limb.ankle}
        width={14 * scale}
        overlap={3.5 * scale}
        flip={profileSign}
      />
      <Foot
        atlasId={atlasId}
        ankle={limb.ankle}
        heel={limb.heel}
        toe={limb.toe}
        referenceFoot={limb.referenceFoot}
        point={point}
        scale={scale}
      />
    </>
  );
  const arm = (limb: typeof near) => (
    <>
      <circle
        cx={limb.shoulder.x}
        cy={limb.shoulder.y}
        r={n(4.6 * scale)}
        fill={`url(#${skinJointFillId})`}
      />
      <circle
        cx={limb.elbow.x}
        cy={limb.elbow.y}
        r={n(3.7 * scale)}
        fill={`url(#${skinJointFillId})`}
      />
      <circle
        cx={limb.wrist.x}
        cy={limb.wrist.y}
        r={n(2.6 * scale)}
        fill={`url(#${skinJointFillId})`}
      />
      <Limb
        atlasId={atlasId}
        crop={CROPS.upperArm}
        from={limb.shoulder}
        to={limb.elbow}
        width={12.5 * scale}
        overlap={5.2 * scale}
        flip={profileSign}
      />
      <Limb
        atlasId={atlasId}
        crop={CROPS.forearm}
        from={limb.elbow}
        to={limb.wrist}
        width={8.5 * scale}
        overlap={2.8 * scale}
        flip={profileSign}
      />
      <Limb
        atlasId={atlasId}
        crop={CROPS.hand}
        from={limb.wrist}
        to={limb.hand}
        width={7.2 * scale}
        overlap={1.4 * scale}
        flip={profileSign}
      />
    </>
  );
  return (
    <g
      data-layer="generated-practitioner"
      data-artwork-origin="imagegen"
      data-atlas-version="3"
      opacity={ready ? 1 : 0}
      aria-hidden="true"
    >
      <defs>
        <image
          id={atlasId}
          href={PRACTITIONER_ATLAS_URL}
          width={1254}
          height={1254}
          onLoad={() => {
            markPractitionerAtlasReady();
            onLoad?.();
          }}
          onError={onError}
        />
        <radialGradient id={legJointFillId} cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#778462" />
          <stop offset="62%" stopColor="#63704f" />
          <stop offset="100%" stopColor="#4f5b3f" />
        </radialGradient>
        <radialGradient id={skinJointFillId} cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#d49e77" />
          <stop offset="64%" stopColor="#be8761" />
          <stop offset="100%" stopColor="#a46f4c" />
        </radialGradient>
        <filter id={farDepthId} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope={0.92} intercept={0.015} />
            <feFuncG type="linear" slope={0.92} intercept={0.015} />
            <feFuncB type="linear" slope={0.92} intercept={0.015} />
          </feComponentTransfer>
        </filter>
      </defs>
      <g data-generated-depth="far" filter={`url(#${farDepthId})`}>
        {hasDualHipSpan && (
          <Pelvis
            atlasId={atlasId}
            pelvis={j('pelvis')}
            lumbar={j('lumbar')}
            hip={background.hip}
            knee={background.knee}
            scale={scale}
            flip={profileSign}
          />
        )}
        {leg(background)}
        {arm(background)}
      </g>
      <Pelvis
        atlasId={atlasId}
        pelvis={j('pelvis')}
        lumbar={j('lumbar')}
        hip={foreground.hip}
        knee={foreground.knee}
        scale={scale}
        flip={profileSign}
      />
      <Torso
        atlasId={atlasId}
        id={id}
        points={[
          collar,
          j('thoracic'),
          j('lumbar'),
          j('pelvis'),
          thighJoin(foreground.hip, foreground.knee),
        ]}
        referencePoints={[
          referenceCollar,
          point(referenceJoints.thoracic),
          point(referenceJoints.lumbar),
          point(referenceJoints.pelvis),
          point(thighJoin(setupHip, setupKnee)),
        ]}
        width={28 * scale}
        endWidth={14 * scale}
        flip={profileSign}
      />
      <g data-generated-depth="near">{leg(foreground)}</g>
      <g data-generated-part="head" transform={headTransform}>
        <Sprite atlasId={atlasId} crop={CROPS.head} x={hx} y={hy} width={hw} height={hh} />
      </g>
      <g data-generated-depth="near">{arm(foreground)}</g>
    </g>
  );
}
