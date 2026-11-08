import type { ReactNode } from 'react';
import type { EquipmentGuideId } from '../data/equipmentGuide';

// Original schematic silhouettes. They identify equipment, not a specific product or setup.
const drawings: Record<EquipmentGuideId, ReactNode> = {
  mat: (
    <>
      <path d="M16 26 64 18 84 57 30 68Z" fill="var(--equipment-fill)" />
      <path d="m24 33 38-7m-34 15 38-7m-34 15 38-7m-34 15 38-7" opacity=".45" />
      <path d="M30 68c-9 2-15-3-15-10s7-12 15-10l7 16" fill="var(--equipment-fill-light)" />
      <ellipse cx="28" cy="58" rx="6" ry="7" fill="none" />
    </>
  ),
  reformer: (
    <>
      <path d="m12 51 57-12 15 10-58 14Z" fill="var(--equipment-fill-light)" />
      <path d="m26 63 58-14v8L26 70 12 58v-7m8 12v8m57-11v8" />
      <path d="m31 48 24-5 11 8-25 6Z" fill="var(--equipment-fill)" />
      <path d="m17 48-3-10 9-2 5 10m32-8 5-16 15-3v26" fill="none" />
      <path d="m64 23 12 12-9 9m-15 8 13-3m-20 5 14-3" />
      <path d="m39 42 3-7 5-1 1 7" fill="var(--equipment-fill)" />
    </>
  ),
  chair: (
    <>
      <path d="m27 31 28-7 17 10-28 8Z" fill="var(--equipment-fill)" />
      <path d="m27 31 1 29 16 11 28-9V34M44 42v29" fill="var(--equipment-fill-light)" />
      <path d="m30 51 29-7 11 6-28 8Z" fill="var(--equipment-fill)" />
      <path d="m34 58 3 7 3-6 4 7m7-11 4 7 3-8m-27 7-2 9m39-9 2 8" fill="none" />
    </>
  ),
  cadillac: (
    <>
      <path d="M18 57V19l57-8 10 8v37M18 19l13 10 54-10M31 29v39M75 11v47" fill="none" />
      <path d="m16 57 58-10 13 9-57 12Z" fill="var(--equipment-fill)" />
      <path d="M18 61v9m13-2v8m54-16v9M43 27v13l22-4V24m-22 8 3 2-3 3m22-7-3 2 3 3" fill="none" />
    </>
  ),
  tower: (
    <>
      <path
        d="M33 58V13l36-4v44M33 13l4 4 36-4-4-4M73 13v40M43 16v15m19-18v15m-21 3 23-4M43 38v9m19-12v9"
        fill="none"
      />
      <path d="m15 62 48-12 19 13-48 13Z" fill="var(--equipment-fill)" />
      <path d="m41 38 5 3-5 3m19-9 5 3-5 3" fill="none" />
    </>
  ),
  'ladder-barrel': (
    <>
      <path
        d="M17 20v50m25-57v54m-25-40 25-7m-25 20 25-7m-25 20 25-7m-25 20 25-7M17 70l24 7 42-11M42 67l-1 10"
        fill="none"
      />
      <path d="M47 57V39c0-24 31-24 31 0v18Z" fill="var(--equipment-fill)" />
      <path d="m47 57 9 6 29-7V38c0-12-6-18-13-19m6 38 7-1M56 63v11m27-18v10" fill="none" />
    </>
  ),
  'spine-corrector': (
    <>
      <path d="M13 62h16c0-36 43-40 43-2l12 4v10H13Z" fill="var(--equipment-fill)" />
      <path d="m13 62 10-7h13c3-25 24-29 34-17M29 62l7-7m36 5 9-5 3 9" fill="none" />
    </>
  ),
  barrel: (
    <>
      <path d="M20 65V45c0-38 56-38 56 0v20Z" fill="var(--equipment-fill)" />
      <path d="M31 65V44c0-23 25-32 37-23M20 65h56" fill="none" />
      <path d="M48 34c0-8 13-8 13 0 0 5-7 5-7 10m0 7v1" fill="none" />
    </>
  ),
  'mini-ball': (
    <>
      <circle cx="48" cy="48" r="20" fill="var(--equipment-fill)" />
      <path d="M38 35c-6 3-9 9-9 15m6 13c11 4 23-3 28-14" fill="none" />
      <path d="M21 73h54" opacity=".25" />
    </>
  ),
  'fitness-ball': (
    <>
      <circle cx="48" cy="44" r="32" fill="var(--equipment-fill)" />
      <path
        d="M21 27c14 8 40 8 54 0M17 39c17 8 45 8 62 0M17 51c17 8 45 8 62 0M24 65c14 6 34 6 48 0"
        fill="none"
        opacity=".65"
      />
    </>
  ),
  'magic-circle': (
    <>
      <ellipse cx="48" cy="43" rx="29" ry="28" fill="none" strokeWidth="5" />
      <path d="M18 32v23m60-23v23" strokeWidth="11" />
      <path d="M18 33v21m60-21v21" stroke="var(--equipment-fill)" strokeWidth="7" />
    </>
  ),
  theraband: (
    <>
      <path
        d="M14 30c15-20 29-4 37 10s19 25 31 12v14c-17 13-28-1-38-18S24 29 14 43Z"
        fill="var(--equipment-fill)"
      />
      <path d="M22 23c-5 5-5 11-5 16m56 19c5 0 8-3 9-6" fill="none" />
      <path d="M61 19c0-7 12-7 12 0 0 5-6 5-6 9m0 7v1" fill="none" />
    </>
  ),
  'loop-band': (
    <>
      <path d="M14 37c0-12 68-12 68 0v17c0 24-68 24-68 0Z" fill="var(--equipment-fill)" />
      <ellipse cx="48" cy="37" rx="34" ry="13" fill="var(--equipment-fill-light)" />
      <ellipse cx="48" cy="37" rx="23" ry="6" fill="var(--equipment-paper)" />
      <path d="M22 58c14 7 39 7 52 0" fill="none" opacity=".45" />
    </>
  ),
  'tube-band': (
    <>
      <path d="M22 36c-5 25 5 41 25 39s32-19 26-43" fill="none" strokeWidth="5" />
      <path d="m12 20 19-4 7 14-23 6Zm50-6 20 3-3 17-23-6Z" fill="var(--equipment-fill)" />
      <path d="m16 22 11-2m39-1 11 2" strokeWidth="4" />
    </>
  ),
  'long-band': (
    <>
      <path
        d="m10 34 13-10c15 22 29 28 44 3l14 6C58 77 33 67 10 34Z"
        fill="var(--equipment-fill)"
      />
      <path d="m10 34-1 12 14-9m58-4 6 13-13 7M24 34c14 20 27 22 43 3" fill="none" />
    </>
  ),
  'foam-roller': (
    <>
      <path d="m20 28 49-11c16-4 26 35 10 40L32 69" fill="var(--equipment-fill)" />
      <ellipse
        cx="26"
        cy="49"
        rx="13"
        ry="21"
        transform="rotate(-16 26 49)"
        fill="var(--equipment-fill-light)"
      />
      <ellipse cx="26" cy="49" rx="5" ry="9" transform="rotate(-16 26 49)" fill="none" />
      <path d="m39 35 37-9m-34 17 37-9m-34 18 36-9" fill="none" opacity=".5" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m29 34 39 10-4 12-39-10Z" fill="var(--equipment-fill-light)" />
      <path d="m17 23 15 4-9 30-15-4Zm50 13 16 4-9 30-16-4Z" fill="var(--equipment-fill)" />
      <path d="m33 30 5 2-7 24-6-2m32-15-5-1-7 24 5 1" fill="none" />
    </>
  ),
  sliders: (
    <>
      <ellipse cx="32" cy="53" rx="23" ry="14" fill="var(--equipment-fill)" />
      <ellipse cx="65" cy="33" rx="23" ry="14" fill="var(--equipment-fill-light)" />
      <path
        d="M9 53v5c3 17 43 17 46 0v-5M42 33v5c3 17 43 17 46 0v-5m-67 19c6-5 15-6 22-2m12-17c6-5 15-6 22-2"
        fill="none"
      />
    </>
  ),
  'yoga-block': (
    <>
      <path d="m15 33 42-13 25 16-43 15Z" fill="var(--equipment-fill-light)" />
      <path d="M15 33v27l24 16V51Zm24 18 43-15v27L39 76Z" fill="var(--equipment-fill)" />
      <path d="m44 56 30-11M21 43l12 8" fill="none" opacity=".4" />
    </>
  ),
  bosu: (
    <>
      <ellipse cx="48" cy="62" rx="36" ry="12" fill="var(--equipment-fill-light)" />
      <path d="M17 59c0-47 62-47 62 0-12 13-50 13-62 0Z" fill="var(--equipment-fill)" />
      <path
        d="M29 58c-1-21 10-35 19-35m19 35c1-21-10-35-19-35m-30 2c14 7 44 7 60 0"
        fill="none"
        opacity=".5"
      />
    </>
  ),
  'toning-ball': (
    <>
      <circle cx="31" cy="48" r="19" fill="var(--equipment-fill)" />
      <circle cx="68" cy="37" r="17" fill="var(--equipment-fill-light)" />
      <path
        d="M19 43c2-6 5-8 10-9m27-1c2-5 5-7 9-8M24 49h14m-7-7v14m31-18h11m-5-6v12"
        fill="none"
      />
    </>
  ),
};

export function EquipmentIllustration({ id }: { id: EquipmentGuideId }) {
  return (
    <svg
      className="equipment-illustration"
      viewBox="0 0 96 88"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawings[id]}
    </svg>
  );
}
