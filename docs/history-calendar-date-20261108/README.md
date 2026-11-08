# Date-only history calendar-date verification

Base: a3afb9c4429b2381cff7a680d393e83414a8e73d. This change is independent of production deployment.

## Reproduction on the base

A synthetic record created for 2026-11-05 in Asia/Seoul had taughtAt=2026-11-05T03:00:00.000Z. Reopening it in America/Los_Angeles incorrectly grouped it under 2026-11-04. A second record created for the same date in Pacific/Kiritimati had taughtAt=2026-11-04T22:00:00.000Z and exported the wrong calendar date in TXT. Both were reproduced with isolated real Chrome contexts. Three new UI assertions failed before the fix.

## Contract

- Newly recorded date-only sessions also keep the chosen YYYY-MM-DD in optional programSnapshot.taughtDate. Existing taughtAt ISO, actual timings, snapshot fingerprints, duplicate handling, and snapshot versions remain unchanged.
- Strictly valid date-only metadata is used consistently for calendar groups, filters, search, detail, TXT body and filename, and new copy provenance labels.
- Calendar date is the primary history sort key; original timestamp orders entries within one date. Group preparation and recent-criteria reuse use the same ordering without mutating saved history.
- Legacy records with no calendar metadata are not guessed, migrated, or rewritten. Explicit timestamps keep their existing behavior. Invalid optional metadata falls back without rejecting otherwise compatible backup data.
- Local persistence, export, backend schema parsing, actual restore, and complete snapshot equality are exercised. No real account or production data is used.

## Validation before the clean candidate run

- UTC: 52 relevant tests passed. Pacific/Kiritimati: 34 relevant tests passed.
- Frontend and backend type checks passed. ESLint passed with one pre-existing react-refresh warning in MotionAuthoringBatchFigure.tsx.
- Production build and PWA validation passed. Motion ledger: 22 entries and 6 tests passed.
- Local QA helper node tests: 15 passed.
- Real Chrome: Seoul to Los Angeles and Kiritimati to UTC, each at 320/390/768/1440px, passed. This includes form creation, date group, detail, actual TXT download, no invented time badge, no horizontal overflow, and complete original-record equality.
- Independent read-only review found no remaining blocker after recent-criteria ordering was aligned.

The final clean-candidate aggregate run and browser evidence are recorded below after completion. The Linux-only classCueSheetChromium PDF test is excluded on this Mac because its required /usr/bin Chromium and Poppler programs are unavailable; it is not represented as passed. Production deployment is not part of this change.
