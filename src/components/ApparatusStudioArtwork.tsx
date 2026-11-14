import React, { useId, useState } from 'react';
import type { ApparatusType, BodyPosition } from '../types/pilates';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';

export interface ApparatusIconBadgeProps {
  apparatus: ApparatusType | 'all' | string;
  bodyPosition?: BodyPosition;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  decorative?: boolean;
  className?: string;
}

function normalizeApparatusType(apparatus: string): ApparatusType {
  if (apparatus === 'reformer' || apparatus === 'mat' || apparatus === 'cadillac' || apparatus === 'chair' || apparatus === 'barrel') {
    return apparatus;
  }
  if (apparatus === 'ladder-barrel' || apparatus === 'spine-corrector') {
    return 'barrel';
  }
  if (apparatus === 'tower') {
    return 'cadillac';
  }
  return 'reformer';
}

const APPARATUS_PALETTE: Record<
  ApparatusType,
  { bg: string; border: string; accent: string; wood: string; pad: string }
> = {
  mat: {
    bg: '#F2F6F2',
    border: '#B9CEBF',
    accent: '#1F5C4D',
    wood: '#C7A27C',
    pad: '#6C9482',
  },
  reformer: {
    bg: '#F4F2EC',
    border: '#CFC3AE',
    accent: '#234F43',
    wood: '#B98E63',
    pad: '#5E8575',
  },
  cadillac: {
    bg: '#F3F4F6',
    border: '#C2CBD4',
    accent: '#2B4C5E',
    wood: '#B38860',
    pad: '#5A7D7C',
  },
  chair: {
    bg: '#F7F2EE',
    border: '#D8BFAE',
    accent: '#7A3E24',
    wood: '#B88658',
    pad: '#7E998A',
  },
  barrel: {
    bg: '#F6F4EC',
    border: '#D6C8A5',
    accent: '#5C471E',
    wood: '#BA8E5E',
    pad: '#6A8F7E',
  },
};

export function ApparatusIllustrationSvg({
  apparatus: rawApparatus,
  compact = false,
}: {
  apparatus: ApparatusType | string;
  compact?: boolean;
}): React.JSX.Element {
  const rawUid = useId().replace(/:/g, '');
  const [atlasFailed, setAtlasFailed] = useState(false);
  const bgGradId = `pf-app-bg-grad-${rawUid}`;
  const apparatus = normalizeApparatusType(rawApparatus);
  const palette = APPARATUS_PALETTE[apparatus] ?? APPARATUS_PALETTE.mat;
  const atlasPosition: Record<ApparatusType, readonly [number, number]> = {
    reformer: [0, 0], cadillac: [512, 0], chair: [1024, 0], barrel: [0, 512], mat: [512, 512],
  };
  if (!compact && !atlasFailed) {
    const [x, y] = atlasPosition[apparatus];
    return <svg
      viewBox={`${x} ${y} 512 512`}
      aria-hidden="true"
      focusable="false"
      className="pf-apparatus-illustration-svg"
      data-artwork-origin="imagegen"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '10px', aspectRatio: '1' }}
    >
      <image href="/images/motion-atlas-v3/equipment.webp" width="1536" height="1024" onError={() => setAtlasFailed(true)} />
    </svg>;
  }
  return (
    <svg
      viewBox="0 0 120 72"
      aria-hidden="true"
      focusable="false"
      className="pf-apparatus-illustration-svg"
      style={{
        width: compact ? '44px' : '100%',
        height: compact ? '28px' : 'auto',
        display: 'block',
        borderRadius: compact ? '6px' : '10px',
      }}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCFBF7" />
          <stop offset="100%" stopColor={palette.bg} />
        </linearGradient>
      </defs>
      <rect
        x="0.5"
        y="0.5"
        width="119"
        height="71"
        rx="8"
        fill={`url(#${bgGradId})`}
        stroke={palette.border}
      />
      {/* Warm oak studio floor line & soft ambient shadow */}
      <ellipse cx="60" cy="59" rx="46" ry="2.2" fill="rgba(28, 49, 41, 0.08)" />
      <line x1="8" y1="58" x2="112" y2="58" stroke="#D5C8B5" strokeWidth="1.5" />

      {apparatus === 'mat' && (
        <g>
          {/* Studio Mat in perspective */}
          <polygon
            points="16,52 30,38 104,38 92,52"
            fill={palette.pad}
            stroke={palette.accent}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Magic Circle / Prop Ring */}
          <ellipse
            cx="76"
            cy="34"
            rx="11"
            ry="11"
            fill="none"
            stroke={palette.accent}
            strokeWidth="2.2"
          />
          <rect x="63" y="31" width="3" height="6" rx="1.5" fill={palette.wood} />
          <rect x="86" y="31" width="3" height="6" rx="1.5" fill={palette.wood} />
          {/* Rolled towel */}
          <rect x="26" y="39" width="12" height="5" rx="2.5" fill="#EFEAE1" stroke={palette.wood} />
        </g>
      )}

      {apparatus === 'reformer' && (
        <g>
          {/* Wooden Reformer Frame */}
          <rect
            x="12"
            y="42"
            width="96"
            height="7"
            rx="2"
            fill={palette.wood}
            stroke="#87623E"
            strokeWidth="1.2"
          />
          <rect x="15" y="49" width="5" height="9" rx="1" fill={palette.wood} />
          <rect x="100" y="49" width="5" height="9" rx="1" fill={palette.wood} />
          {/* Padded Sage Carriage */}
          <rect
            x="28"
            y="35"
            width="48"
            height="7"
            rx="2.5"
            fill={palette.pad}
            stroke={palette.accent}
            strokeWidth="1.3"
          />
          {/* Shoulder Blocks */}
          <rect x="34" y="28" width="5" height="7" rx="1.5" fill={palette.pad} stroke={palette.accent} />
          <rect x="42" y="28" width="5" height="7" rx="1.5" fill={palette.pad} stroke={palette.accent} />
          {/* Springs */}
          <line x1="76" y1="39" x2="96" y2="39" stroke="#7E8B89" strokeWidth="1.8" strokeDasharray="2 1.5" />
          <line x1="76" y1="41" x2="96" y2="41" stroke="#B65032" strokeWidth="1.8" strokeDasharray="2 1.5" />
          {/* Footbar */}
          <path d="M 98 42 L 106 27 L 94 27" fill="none" stroke={palette.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Risers & Ropes */}
          <rect x="14" y="22" width="3" height="20" rx="1" fill={palette.wood} />
          <path d="M 17 25 Q 25 32 34 33" fill="none" stroke="#857C70" strokeWidth="1.2" />
        </g>
      )}

      {apparatus === 'chair' && (
        <g>
          {/* Wunda Chair Wooden Base & Side Frame */}
          <path
            d="M 34 57 L 86 57 L 82 26 L 44 26 Z"
            fill="none"
            stroke={palette.wood}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Padded Top Seat */}
          <rect
            x="40"
            y="21"
            width="46"
            height="6"
            rx="3"
            fill={palette.pad}
            stroke={palette.accent}
            strokeWidth="1.4"
          />
          {/* Split Pedal & Springs */}
          <line x1="58" y1="53" x2="32" y2="39" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="39" r="2.8" fill={palette.pad} />
          <line x1="42" y1="44" x2="64" y2="27" stroke="#7E8B89" strokeWidth="1.8" strokeDasharray="2.5 1.5" />
          {/* Side Handles */}
          <line x1="76" y1="57" x2="76" y2="12" stroke="#6E7A78" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="72" y1="12" x2="80" y2="12" stroke={palette.accent} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}

      {apparatus === 'cadillac' && (
        <g>
          {/* Canopy Posts & Overhead Frame */}
          <rect x="16" y="12" width="88" height="36" fill="none" stroke="#7A888B" strokeWidth="2" rx="2" />
          {/* Table Bed & Wooden Legs */}
          <rect x="14" y="42" width="92" height="6" rx="2" fill={palette.pad} stroke={palette.accent} strokeWidth="1.3" />
          <rect x="16" y="48" width="5" height="10" fill={palette.wood} />
          <rect x="99" y="48" width="5" height="10" fill={palette.wood} />
          {/* Push-Through Bar & Roll-Down Bar with Springs */}
          <line x1="34" y1="12" x2="34" y2="29" stroke={palette.accent} strokeWidth="2" />
          <line x1="16" y1="16" x2="34" y2="27" stroke="#B65032" strokeWidth="1.5" strokeDasharray="2 1.5" />
          <line x1="82" y1="12" x2="76" y2="26" stroke="#7E8B89" strokeWidth="1.5" strokeDasharray="2 1.5" />
          <rect x="72" y="26" width="8" height="2.5" rx="1" fill={palette.wood} />
          {/* Fuzzy Hanging Loops */}
          <path d="M 56 12 L 56 22 C 53 26 59 26 56 22" fill="none" stroke={palette.accent} strokeWidth="1.6" />
        </g>
      )}

      {apparatus === 'barrel' && (
        <g>
          {/* Curved Upholstered Barrel */}
          <path
            d="M 20 57 L 20 36 C 20 18 58 18 58 36 L 58 57 Z"
            fill={palette.pad}
            stroke={palette.accent}
            strokeWidth="1.5"
          />
          {/* Base Frame */}
          <line x1="18" y1="57" x2="98" y2="57" stroke={palette.wood} strokeWidth="3.5" strokeLinecap="round" />
          {/* Wooden Ladder Uprights & Rungs */}
          <line x1="88" y1="14" x2="88" y2="57" stroke={palette.wood} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="76" y1="18" x2="94" y2="18" stroke="#87623E" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="78" y1="27" x2="94" y2="27" stroke="#87623E" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="80" y1="36" x2="94" y2="36" stroke="#87623E" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="82" y1="45" x2="94" y2="45" stroke="#87623E" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export function ApparatusIconBadge({
  apparatus,
  bodyPosition,
  size = 'sm',
  showLabel = false,
  decorative = true,
  className = '',
}: ApparatusIconBadgeProps): React.JSX.Element {
  const normalized = normalizeApparatusType(apparatus);
  const appLabel = APPARATUS_LABELS[normalized]?.ko ?? apparatus;
  const posLabel = bodyPosition ? (POSITION_LABELS[bodyPosition]?.ko ?? bodyPosition) : null;

  return (
    <span
      className={`pf-apparatus-icon-badge pf-apparatus-icon-badge--${size} ${className}`.trim()}
      data-testid="apparatus-icon-badge"
      data-apparatus={apparatus}
      aria-hidden={decorative ? 'true' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        verticalAlign: 'middle',
      }}
    >
      <ApparatusIllustrationSvg apparatus={apparatus} compact={size !== 'md'} />
      {showLabel && (
        <span
          style={{
            fontSize: size === 'xs' ? '11px' : '12px',
            fontWeight: 600,
            color: 'var(--pf-color-text-primary, #1E3129)',
            whiteSpace: 'nowrap',
          }}
        >
          {appLabel}
          {posLabel ? ` · ${posLabel}` : ''}
        </span>
      )}
    </span>
  );
}
