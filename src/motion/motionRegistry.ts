/**
 * Which elements take part in the "Breath" motion language.
 *
 * Kept as data, in one place, so the large page components stay free of
 * animation plumbing and the choreography can be read (and changed) at once.
 * The look of each effect lives in `src/styles/pf-motion-studio.css`.
 */

/** Elements that breathe in (fade + rise) the first time they enter the viewport. */
export const REVEAL_TARGETS = {
  shared: ['[data-pf-reveal]'],
  /** 수업 만들기 — picker rows and the growing sequence. */
  workbench: ['.flow-pick-card', '.flow-sequence-row', '.flow-section-heading'],
  /** 동작 라이브러리 — catalog cards. */
  atlas: ['.flow-atlas__card'],
  /** 저장한 수업 · 수업 기록. */
  binder: [
    '.flow-binder-card',
    '.pf-binder-block-card',
    '.teaching-history-date-group',
  ],
  /** 수업 일정. */
  schedule: ['.schedule-class'],
  /** 수업 진행 — outline rows. */
  stage: ['.teaching-outline-row'],
  /** 회원 예약. */
  member: ['.pf-member-slot-card', '.pf-member-my-bookings__item'],
} as const;

/** Cards that lean toward a fine pointer and catch a soft highlight. */
export const TILT_TARGETS = ['.flow-binder-card', '.pf-member-wallet-hero', '[data-pf-tilt]'] as const;

export const REVEAL_SELECTOR = Object.values(REVEAL_TARGETS).flat().join(', ');
export const TILT_SELECTOR = TILT_TARGETS.join(', ');
