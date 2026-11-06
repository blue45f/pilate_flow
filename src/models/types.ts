export type AnatomicalSide = 'left' | 'right';
export const MOTION_DRAFT_IDS = [
  'supported-heel-raise',
  'side-lying-clam',
  'adult-supine-heel-slide',
  'supine-knee-fold',
  'side-lying-straight-leg-lift',
  'side-lying-open-book',
  'quadruped-arm-slide',
  'quadruped-leg-slide',
  'reformer-parallel-footwork',
  'chair-seated-pedal-press',
  'reformer-supine-strap-arm-press',
  'cadillac-supine-arm-spring-press',
  'ladder-supported-hip-extension-slide',
  'ladder-supported-side-leg-slide',
  'floor-seated-band-row',
  'supine-chest-lift',
  'articulated-pelvic-curl',
] as const;
export type MotionDraftId = (typeof MOTION_DRAFT_IDS)[number];
export type PhaseId = 'setup' | 'move' | 'turn' | 'return' | 'finish';
export interface DraftPhase {
  readonly id: PhaseId;
  readonly label: string;
  readonly labelKo?: string;
  /** Authored display behavior only; absent metadata must remain unknown. */
  readonly displayBehavior?: 'hold' | 'move' | 'unknown';
  readonly start: number;
  readonly end: number;
  readonly sample: number;
}
export interface Point2 {
  x: number;
  y: number;
}
export type Point3 = readonly [number, number, number];
export type ScreenPoint = readonly [number, number];
export interface HeelLimb {
  forefoot: Point2;
  toe: Point2;
  heel: Point2;
  ankle: Point2;
  knee: Point2;
  hip: Point2;
  shoulder: Point2;
  elbow: Point2;
  hand: Point2;
  active: boolean;
}
export interface HeelContact {
  id: string;
  side: AnatomicalSide;
  point: Point2;
  target: string;
  state: 'fixed' | 'grounded' | 'released';
}
export interface ClamLeg {
  anatomicalSide: AnatomicalSide;
  placement: 'top' | 'bottom';
  hip: Point3;
  knee: Point3;
  heel: Point3;
  toe: Point3;
}
