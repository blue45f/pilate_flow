/** SPDX-License-Identifier: 0BSD. Original geometry; solveSagittalJoint adapts
 * this project's earlier 0BSD apparatusGeometry.ts two-link math. */
import type { Point3 } from "./types";
export const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function solveSagittalJoint(
  a: Point3,
  b: Point3,
  first: number,
  second: number,
): Point3 {
  const dx = b[0] - a[0],
    dz = b[2] - a[2],
    d = Math.hypot(dx, dz);
  if (
    d <= 0 ||
    d > first + second + 1e-9 ||
    d < Math.abs(first - second) - 1e-9
  )
    throw new RangeError("Authored two-link rig cannot reach its target.");
  const along = (first ** 2 - second ** 2 + d * d) / (2 * d),
    radial = Math.sqrt(Math.max(0, first ** 2 - along ** 2));
  return [
    a[0] + (dx * along - dz * radial) / d,
    a[1],
    a[2] + (dz * along + dx * radial) / d,
  ];
}
/** Lateral elbow choice keeps both arms above the support, with fixed bones. */
export function elbowOutward(
  shoulder: Point3,
  hand: Point3,
  upper: number,
  forearm: number,
  sideSign: number,
): Point3 {
  const d = distance(shoulder, hand),
    along = (upper ** 2 - forearm ** 2 + d * d) / (2 * d),
    height2 = upper ** 2 - along ** 2;
  if (d <= 0 || height2 < -1e-8)
    throw new RangeError("Authored arm cannot reach its handle.");
  return [
    shoulder[0] + ((hand[0] - shoulder[0]) * along) / d,
    shoulder[1] + sideSign * Math.sqrt(Math.max(0, height2)),
    shoulder[2] + ((hand[2] - shoulder[2]) * along) / d,
  ];
}
export function visualSpring(
  anchor: Point3,
  handle: Point3,
): readonly Point3[] {
  const dx = handle[0] - anchor[0],
    dz = handle[2] - anchor[2],
    length = Math.hypot(dx, dz);
  return Array.from({ length: 65 }, (_, i) => {
    const t = i / 64,
      offset = i === 0 || i === 64 ? 0 : Math.sin(t * Math.PI * 20) * 3;
    return [
      anchor[0] + dx * t - (dz / length) * offset,
      anchor[1] + (handle[1] - anchor[1]) * t,
      anchor[2] + dz * t + (dx / length) * offset,
    ] as Point3;
  });
}
