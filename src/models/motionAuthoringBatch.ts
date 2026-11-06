/**
 * SPDX-License-Identifier: 0BSD
 * Original parametric schematic geometry. No media, frame tracing, motion capture,
 * downloaded model, medical validation, or source illustration coordinates.
 * All dimensions, angles, phase fractions and contact patches are author choices.
 */
export const BATCH_IDS = [
  'chair-seated-bilateral-arm-raise-v1',
  'chair-seated-overhead-sidebend-v1',
  'prone-single-straight-leg-extension-v1',
  'prone-forearm-chest-extension-v1',
] as const;
export type BatchVariantId = (typeof BATCH_IDS)[number];
export type BatchSide = 'left' | 'right';
export type BatchPoint = readonly [number, number, number];
export type BatchCamera = 'seated-front-oblique' | 'prone-left-oblique';
export interface BatchPhase {
  id: 'setup' | 'move' | 'turn' | 'return' | 'finish';
  label: string;
  start: number;
  end: number;
  sample: number;
  displayBehavior: 'hold' | 'move';
}
export interface BatchLimb {
  hip: BatchPoint;
  knee: BatchPoint;
  ankle: BatchPoint;
  heel: BatchPoint;
  toe: BatchPoint;
  shoulder: BatchPoint;
  elbow: BatchPoint;
  hand: BatchPoint;
  active: boolean;
}
export interface BatchContact {
  id: string;
  side: BatchSide | null;
  target: 'mat' | 'floor' | 'chair-seat';
  state: 'fixed' | 'released';
  bodyPoint: BatchPoint;
  anchorPoint: BatchPoint;
}
export interface BatchEquipment {
  id: string;
  kind: 'mat' | 'chair-seat' | 'chair-leg' | 'floor';
  points: BatchPoint[];
}
export interface BatchPose {
  variantId: BatchVariantId;
  modelVersion: 'original-motion-authoring-batch-1.0.0-draft';
  progress: number;
  amount: number;
  phase: BatchPhase;
  sideMode: 'bilateral' | 'unilateral';
  activeSide: BatchSide;
  camera: { id: BatchCamera; nearAnatomicalSide: 'left'; mirrored: boolean };
  trunk: BatchPoint[];
  head: { center: BatchPoint; neck: BatchPoint; nose: BatchPoint };
  limbs: Record<BatchSide, BatchLimb>;
  contacts: BatchContact[];
  equipment: BatchEquipment[];
}

const phases = (setup: string, move: string, turn: string, back: string): BatchPhase[] => [
  { id: 'setup', label: setup, start: 0, end: .12, sample: 0, displayBehavior: 'hold' },
  { id: 'move', label: move, start: .12, end: .42, sample: .27, displayBehavior: 'move' },
  { id: 'turn', label: turn, start: .42, end: .58, sample: .5, displayBehavior: 'hold' },
  { id: 'return', label: back, start: .58, end: .88, sample: .73, displayBehavior: 'move' },
  { id: 'finish', label: '처음 배치로 돌아옴', start: .88, end: 1, sample: 1, displayBehavior: 'hold' },
];
export const BATCH_PHASES: Readonly<Record<BatchVariantId, readonly BatchPhase[]>> = {
  'chair-seated-bilateral-arm-raise-v1': phases('의자에 앉아 양팔 내림', '양팔이 앞·위로 이동', '양팔을 위로 뻗은 배치', '양팔을 처음 자리로 내림'),
  'chair-seated-overhead-sidebend-v1': phases('의자 앉은 지지 · 한 팔 위로', '몸통이 선택한 쪽으로 기울어짐', '팔과 분절 몸통이 옆으로 길어짐', '앉은 중심으로 돌아옴'),
  'prone-single-straight-leg-extension-v1': phases('엎드림 · 양다리와 손 지지', '선택한 편 다리가 매트에서 들림', '한 다리 들림 · 반대 다리는 지지', '편 다리가 매트로 돌아옴'),
  'prone-forearm-chest-extension-v1': phases('엎드림 · 양 팔뚝 지지', '팔뚝을 둔 채 가슴이 올라감', '분절 몸통과 가슴이 올라간 배치', '팔뚝 지지를 유지하며 돌아옴'),
};

const SIDES = ['right', 'left'] as const;
const sign = (side: BatchSide) => side === 'left' ? 1 : -1;
const add = (a: BatchPoint, b: BatchPoint): BatchPoint => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix = (a: BatchPoint, b: BatchPoint, t: number): BatchPoint => a.map((v, i) => v + (b[i] - v) * t) as unknown as BatchPoint;
const smooth = (t: number) => t * t * (3 - 2 * t);
export function batchAmount(progress: number): number {
  const p = clampBatchProgress(progress);
  if (p <= .12 || p >= .88) return 0;
  if (p < .42) return smooth((p - .12) / .3);
  if (p <= .58) return 1;
  return 1 - smooth((p - .58) / .3);
}
export function clampBatchProgress(progress: number): number {
  if (!Number.isFinite(progress)) throw new RangeError('Motion progress must be finite');
  return Math.max(0, Math.min(1, progress));
}
export function projectBatchPoint(point: BatchPoint, mirrored = false, camera: BatchCamera = 'prone-left-oblique'): readonly [number, number] {
  const [x, y, z] = point;
  const screen = camera === 'prone-left-oblique'
    ? [x + .22 * y, 293 + .28 * y - z]
    : [320 + .55 * x - .9 * y, 324 + .08 * x - .85 * z];
  return [mirrored ? 640 - screen[0] : screen[0], screen[1]];
}

function fixedContact(id: string, side: BatchSide | null, target: BatchContact['target'], point: BatchPoint): BatchContact {
  return { id, side, target, state: 'fixed', bodyPoint: point, anchorPoint: point };
}
function chairEquipment(): BatchEquipment[] {
  const points: BatchPoint[] = [[-42,-62,106],[66,-62,106],[66,62,106],[-42,62,106]];
  return [
    { id: 'ordinary-stable-chair-seat', kind: 'chair-seat', points },
    ...points.map(([x,y,z], i): BatchEquipment => ({ id: `ordinary-chair-leg-${i}`, kind: 'chair-leg', points: [[x,y,z],[x,y,0]] })),
    { id: 'floor', kind: 'floor', points: [[-90,-210,0],[170,-210,0],[170,210,0],[-90,210,0]] },
  ];
}
function matEquipment(): BatchEquipment[] {
  return [{ id: 'mat', kind: 'mat', points: [[55,-95,0],[580,-95,0],[580,95,0],[55,95,0]] }];
}
function seatedLeg(side: BatchSide): Pick<BatchLimb, 'hip'|'knee'|'ankle'|'heel'|'toe'> {
  const y = sign(side) * 29;
  return { hip:[0,y,116], knee:[93,y,108], ankle:[93,y,14], heel:[82,y,0], toe:[128,y,0] };
}
function seatedPose(id: BatchVariantId, q: number, activeSide: BatchSide) {
  const sidebend = id === 'chair-seated-overhead-sidebend-v1';
  // Six rigid links describe a distributed bend; they do not model vertebrae.
  const trunk: BatchPoint[] = [[0,0,116]];
  const direction = sign(activeSide);
  for (let i = 0; i < 6; i++) {
    const angle = sidebend ? direction * .32 * q * (i + 1) / 6 : 0;
    trunk.push(add(trunk[i], [0, 19 * Math.sin(angle), 19 * Math.cos(angle)]));
  }
  const chest = trunk[6];
  const topAngle = sidebend ? direction * .32 * q : 0;
  const vertical: BatchPoint = [0, Math.sin(topAngle), Math.cos(topAngle)];
  const across: BatchPoint = [0, Math.cos(topAngle), -Math.sin(topAngle)];
  const headCenter = add(chest, [0, 36 * vertical[1], 36 * vertical[2]]);
  const limbs = {} as Record<BatchSide, BatchLimb>;
  for (const side of SIDES) {
    const s = sign(side);
    const shoulder = add(chest, [0, 33 * s * across[1], 33 * s * across[2]]);
    let elbow: BatchPoint;
    let hand: BatchPoint;
    if (!sidebend) {
      // Forward flexion of both rigid arms; no trunk movement or shoulder shrug.
      const angle = 2.75 * q;
      const armVector: BatchPoint = [Math.sin(angle), 0, -Math.cos(angle)];
      elbow = add(shoulder, armVector.map(v => v * 53) as unknown as BatchPoint);
      hand = add(elbow, armVector.map(v => v * 49) as unknown as BatchPoint);
    } else if (side !== activeSide) {
      // Opposite arm stays overhead and follows the upper trunk orientation.
      elbow = add(shoulder, [0, 53 * vertical[1] + s * 8 * across[1], 53 * vertical[2] + s * 8 * across[2]]);
      hand = add(elbow, [0, 49 * vertical[1], 49 * vertical[2]]);
    } else {
      // Lower hand is free beside the thigh; it is never falsely marked support.
      elbow = add(shoulder, [0, -53 * vertical[1] + s * 10 * across[1], -53 * vertical[2] + s * 10 * across[2]]);
      hand = add(elbow, [0, -49 * vertical[1], -49 * vertical[2]]);
    }
    limbs[side] = { ...seatedLeg(side), shoulder, elbow, hand, active: !sidebend || side !== activeSide };
  }
  const contacts: BatchContact[] = [
    ...SIDES.map(side => fixedContact(`${side}-seat`, side, 'chair-seat', [0,sign(side)*29,106])),
    ...SIDES.flatMap(side => [fixedContact(`${side}-heel`, side, 'floor', limbs[side].heel), fixedContact(`${side}-toe`, side, 'floor', limbs[side].toe)]),
  ];
  return { trunk, limbs, contacts, equipment: chairEquipment(), head: { center:headCenter, neck:add(chest,[0,12*vertical[1],12*vertical[2]]), nose:add(headCenter,[19,0,0]) } };
}

function proneLeg(side: BatchSide, q: number, moving: boolean): Pick<BatchLimb, 'hip'|'knee'|'ankle'|'heel'|'toe'> {
  const y = sign(side) * 24;
  const hip: BatchPoint = [330,y,35];
  const angle = moving ? .25 * q : 0;
  const axis: BatchPoint = [Math.cos(angle),0,Math.sin(angle)];
  const knee = add(hip, axis.map(v => 100*v) as unknown as BatchPoint);
  const ankle = add(knee, axis.map(v => 100*v) as unknown as BatchPoint);
  // Rigid foot offset rotates with the leg; mat contact lies under the forefoot.
  const foot = (dx: number, dz: number): BatchPoint => add(ankle,[dx*Math.cos(angle)-dz*Math.sin(angle),0,dx*Math.sin(angle)+dz*Math.cos(angle)]);
  return { hip,knee,ankle,heel:foot(0,-15),toe:foot(28,-35) };
}

/** Two fixed-length spine groups, each split into three rigid visual links. */
function constrainedProneTrunk(shoulder: BatchPoint): BatchPoint[] {
  const hip: BatchPoint = [330,0,35];
  const dx = shoulder[0]-hip[0], dz = shoulder[2]-hip[2];
  const d = Math.hypot(dx,dz), half = 66;
  if (d > 2*half + 1e-8) throw new RangeError('Unreachable authored spine endpoint');
  const h = Math.sqrt(Math.max(0,half*half-d*d/4));
  // The lower branch keeps the abdomen below the lifted upper chest.
  const middle: BatchPoint = [(hip[0]+shoulder[0])/2-dz*h/d,0,(hip[2]+shoulder[2])/2+dx*h/d];
  return [hip,mix(hip,middle,1/3),mix(hip,middle,2/3),middle,mix(middle,shoulder,1/3),mix(middle,shoulder,2/3),shoulder];
}
function pronePose(id: BatchVariantId, q: number, activeSide: BatchSide) {
  const chestExtension = id === 'prone-forearm-chest-extension-v1';
  // Shoulder describes an arc around each fixed elbow: upper-arm lengths stay fixed.
  const angle = -.5*q;
  const shoulder: BatchPoint = chestExtension
    ? [240-42*Math.cos(angle)-27*Math.sin(angle),0,8-42*Math.sin(angle)+27*Math.cos(angle)]
    : [198,0,35];
  const trunk: BatchPoint[] = chestExtension
    ? constrainedProneTrunk(shoulder)
    : Array.from({length:7},(_,i):BatchPoint=>[330-i*22,0,35]);
  const last = trunk[6], before = trunk[5];
  const length = Math.hypot(last[0]-before[0],last[2]-before[2]);
  const axis: BatchPoint = [(last[0]-before[0])/length,0,(last[2]-before[2])/length];
  const center = chestExtension ? add(last,[axis[0]*47,0,axis[2]*47]) : [139,0,24] as const;
  const limbs = {} as Record<BatchSide,BatchLimb>;
  for (const side of SIDES) {
    const s = sign(side);
    const leg = proneLeg(side,q,!chestExtension && side===activeSide);
    limbs[side] = { ...leg, shoulder:add(shoulder,[0,s*32,0]),
      elbow:chestExtension ? [240,s*50,8] : [154,s*65,8],
      hand:chestExtension ? [180,s*50,8] : [127,s*14,5],
      active:chestExtension || side===activeSide };
  }
  const contacts: BatchContact[] = [fixedContact('pelvis-mat',null,'mat',[330,0,0])];
  if (!chestExtension) {
    contacts.push(fixedContact('upper-trunk-mat',null,'mat',[220,0,0]),fixedContact('forehead-mat',null,'mat',[139,0,0]));
    for (const side of SIDES) {
      contacts.push(fixedContact(`${side}-hand-mat`,side,'mat',[127,sign(side)*14,0]));
      contacts.push({ id:`${side}-forefoot`,side,target:'mat',state:side===activeSide && q>0?'released':'fixed',bodyPoint:limbs[side].toe,anchorPoint:[558,sign(side)*24,0] });
    }
  } else for (const side of SIDES) {
    contacts.push(fixedContact(`${side}-elbow-mat`,side,'mat',[240,sign(side)*50,0]),fixedContact(`${side}-forearm-mat`,side,'mat',[210,sign(side)*50,0]),fixedContact(`${side}-hand-mat`,side,'mat',[180,sign(side)*50,0]),fixedContact(`${side}-forefoot`,side,'mat',limbs[side].toe));
  }
  return { trunk,limbs,contacts,equipment:matEquipment(),head:{center,neck:add(last,[axis[0]*20,0,axis[2]*20]),nose:add(center,[0,0,-19])} };
}

export function getBatchPose(variantId: BatchVariantId, progress: number, options: {activeSide?:BatchSide;mirrored?:boolean} = {}): BatchPose {
  if (!BATCH_IDS.includes(variantId)) throw new RangeError('Unknown motion variant');
  const activeSide = options.activeSide ?? 'right';
  if (activeSide !== 'left' && activeSide !== 'right') throw new RangeError('Unknown anatomical side');
  const p = clampBatchProgress(progress), amount = batchAmount(p);
  const seated = variantId.startsWith('chair-');
  const pose = seated ? seatedPose(variantId,amount,activeSide) : pronePose(variantId,amount,activeSide);
  return {
    variantId,modelVersion:'original-motion-authoring-batch-1.0.0-draft',progress:p,amount,
    phase:BATCH_PHASES[variantId].find(phase=>p>=phase.start && p<phase.end) ?? BATCH_PHASES[variantId][4],
    sideMode:variantId==='chair-seated-bilateral-arm-raise-v1'||variantId==='prone-forearm-chest-extension-v1'?'bilateral':'unilateral',
    activeSide,camera:{id:seated?'seated-front-oblique':'prone-left-oblique',nearAnatomicalSide:'left',mirrored:options.mirrored??false},...pose,
  };
}
