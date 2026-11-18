import React from 'react';

interface StudioBrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Architectural Pilates Flow emblem — Reformer mat horizon + precision spring arc.
 * Flat 1.5px line geometry in currentColor (zero glossy orb / gradient tile).
 */
export const StudioBrandMark: React.FC<StudioBrandMarkProps> = ({ size = 22, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className ? `pf-brand-mark ${className}` : 'pf-brand-mark'}
    aria-hidden="true"
  >
    <rect
      x="2.25"
      y="2.25"
      width="19.5"
      height="19.5"
      rx="5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.24"
    />
    <path
      d="M5.5 15.75H18.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.75 12.25C8.1 8.5 10.15 8.5 11.2 12.25C12.05 15.1 13.55 8.25 15.1 8.25C16.4 8.25 17.15 10.35 17.65 12.25"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17.65" cy="8.25" r="1.2" fill="currentColor" />
  </svg>
);

interface StudioSpringHorizonProps {
  /** Progress ratio 0..1 of planned sequence time against target class duration. */
  ratio: number;
  className?: string;
}

/**
 * Signature visual for Pilates Flow: a physical Reformer spring-coil horizon
 * whose slack coils draw taut into a balanced line as the 50-minute class fills.
 */
export const StudioSpringHorizon: React.FC<StudioSpringHorizonProps> = ({ ratio, className }) => {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  // Amplitude relaxes as tension approaches 1.0 (from 4.2px coil height down to 1.1px taut spring)
  const amp = Number((4.2 - clamped * 3.0).toFixed(2));
  const mid = 8;
  const coils = 7;
  const startX = 6;
  const endX = 114;
  const span = (endX - startX) / coils;

  let path = `M 1 ${mid} L ${startX} ${mid}`;
  for (let i = 0; i < coils; i += 1) {
    const x0 = startX + i * span;
    const x1 = x0 + span * 0.5;
    const x2 = x0 + span;
    path += ` Q ${(x0 + span * 0.25).toFixed(1)} ${(mid - amp).toFixed(2)}, ${x1.toFixed(1)} ${mid}`;
    path += ` Q ${(x0 + span * 0.75).toFixed(1)} ${(mid + amp).toFixed(2)}, ${x2.toFixed(1)} ${mid}`;
  }
  path += ` L 119 ${mid}`;

  return (
    <svg
      viewBox="0 0 120 16"
      fill="none"
      className={className ? `pf-spring-horizon ${className}` : 'pf-spring-horizon'}
      aria-hidden="true"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={Number((100 - clamped * 100).toFixed(1))}
        className="pf-spring-horizon__active"
      />
    </svg>
  );
};
