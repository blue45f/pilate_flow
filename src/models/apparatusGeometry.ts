/** SPDX-License-Identifier: 0BSD. Original mathematical helpers, not biomechanics. */
import type { Point3 } from "./types";
export const translate = (p: Point3, offset: Point3): Point3 => [
  p[0] + offset[0],
  p[1] + offset[1],
  p[2] + offset[2],
];
export function rotatePedal(p: Point3, hinge: Point3, angle: number): Point3 {
  return [
    hinge[0] + p[0] * Math.cos(angle) - p[2] * Math.sin(angle),
    hinge[1] + p[1],
    hinge[2] + p[0] * Math.sin(angle) + p[2] * Math.cos(angle),
  ];
}
export function solveKnee(
  hip: Point3,
  ankle: Point3,
  thigh: number,
  shin: number,
): Point3 {
  const dx = ankle[0] - hip[0],
    dz = ankle[2] - hip[2],
    d = Math.hypot(dx, dz);
  if (d <= 0 || d > thigh + shin + 1e-8 || d < Math.abs(thigh - shin) - 1e-8)
    throw new RangeError("Authored leg cannot reach its apparatus contact.");
  const along = (thigh ** 2 - shin ** 2 + d ** 2) / (2 * d),
    radial = Math.sqrt(Math.max(0, thigh ** 2 - along ** 2));
  return [
    hip[0] + (dx * along - dz * radial) / d,
    hip[1],
    hip[2] + (dz * along + dx * radial) / d,
  ];
}
