# Documents UX selective integration (2026-11-08)

Base: `b6f2211cb2f8edd7aee8005d3f7d6d638958413a`. This is a local integration review, not evidence of current remote main or deployment.

## Adopted

- Schedule: date boundary disabling, week-to-day navigation using the existing heading-focus mechanism, live period summary.
- Course references: visible/removable conditions, title-language shortcuts with spoken-language uncertainty preserved, empty-state recovery, focus on newly revealed results.
- Instructor study: normalized search, bookmark/query reset, list/detail return focus, per-exercise variation reset. Main's visual tutorial import, state, disclosure and return callback are preserved and tested.
- Source note: only the component/style delta from `d46a18f`, including grouped inputs, optional guidance, section navigation and focus/scroll recovery. Existing validation, dirty-state dismissal and save error handling are retained.
- Recovery: only the component/style delta from `275c292`, including collapsed count details, visible preservation guidance and error file re-selection. Existing apply/rollback guards, remount recovery, unchanged-import rollback preservation and storage/state fingerprint checks are unchanged.
- History: a separately named live result summary with actual/sample counts. The current date/group/search filtering and record design stay unchanged.

## Not adopted

Do not replace files with the old combined candidate. Main contains later date-only/timezone, rollback, drag and feature integrations absent there.

History's older reset/empty-state/card/CSS replacement is superseded by main's date-aware reset, progressive disclosure, pagination and newer card layout. The new history test uses the current disclosure and empty-state wording rather than requiring obsolete labels. No old history layout CSS is imported.

## Verification

- Three discovery areas: 8 test files / 40 tests passed. After adding a visual-tutorial preservation test, the study discovery file passed all 9 tests (41 distinct tests across these files).
- Source note, recovery, history and date utilities: 12 files / 95 tests passed.
- Before implementation, the 3 new layout/history test files failed all 9 tests on the existing implementation. Source-note navigation/grouped guidance and recovery disclosure/error recovery were absent; history lacked the separated count announcement. One legacy history scenario was adapted to main's existing filter disclosure and current reset labels, rather than changing main to satisfy obsolete labels.
- Additional rollback/independent backup review, history program records and date-only modal regression: 4 files / 44 tests passed.
- Scoped ESLint and `git diff --check` passed.
- No browser/server/network operation, dependency installation, staging or commit was performed by this UX worker. Screenshots from old candidates are not evidence for this integration. Visual browser validation and aggregate checks remain the integrating owner's responsibility.
