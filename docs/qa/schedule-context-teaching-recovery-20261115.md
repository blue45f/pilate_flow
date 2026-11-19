# Schedule-to-teaching context and explicit interrupted-session recovery

## Scope and baseline

- Isolated local implementation based on `26d5c5f0ab2f120d3d924578695c7203f2c9bb27`.
- No remote push, merge, production deployment, real-account mutation, or real-class data used.
- Synthetic fixture: an original 60-minute reformer plan (55-minute movement + 5-minute rest), a copied plan for a fictional mat-only venue, and a 50-minute dated slot.

## Changes

1. Opening a dated plan as an independent draft carries a validated, draft-bound reference to its venue, class, date and time. Teaching displays that reference and recalculates equipment/time warnings against the current session steps. A moved/cancelled source occurrence is explicit, never silently relabelled. Warnings do not block preparation or start the timer.
2. Draft save, undo and local hydration preserve the reference correctly. Other/new drafts cannot borrow it. Persisted backup inspection accepts only the strict known field and explains that importing a backup preserves dated plans but does not apply local teaching context to the currently open class.
3. A tab/account/draft-scoped sessionStorage checkpoint records current movement/rest, actual elapsed totals and local session edits. A matching checkpoint offers explicit recovery or discard. Recovery is paused and does not enable voice, wake lock or a timer. Downtime does not count as teaching time. A deliberate movement selection before starting is also recoverable.
4. Owner-keyed teaching remount prevents a previous account's mounted title/clock/venue from remaining visible during an account switch. Draft identity comparison ignores object property order but rejects material draft/context changes.
5. Pending recovery must be resolved before a zero-time record can be offered. Both finish and local exit paths are covered by a baseline-failing regression, with a final record-action guard as well. Recording and explicit exits clear only the relevant recovery entry; cancelling an exit or record form preserves it. Completed history, source plans and copied dated snapshots are not modified by recovery.

## Verification

- Related final focused regressions include real components, store persistence, both manual workbench undo paths, malformed/other-draft context, backup compatibility, account isolation, explicit recovery/discard, movement/rest clock reconstruction, storage denial and stale/changed recovery rejection.
- Real isolated Chrome at 390×844, 768×1024 and 1440×1000: schedule → Start now, normal/high-contrast layout, no horizontal overflow, refresh → recovery, and explicit resume.
- All three viewports retained the fictional mat venue, reformer mismatch and 10-minute overrun. Before recovery the clock remained 00:00. Explicit recovery restored 00:07 (movement 00:05 + rest 00:02), remaining rest 04:58, and paused status. Another five seconds did not advance the clock. Explicit resume advanced to 00:08.
- Original and copied saved plans, both dated assignments, and completed history were structurally unchanged across the complete browser flow. External browser requests were blocked; none were attempted. Speech and wake-lock calls were observed with safe test doubles, not a speaker/device test.
- Production build chain: artwork check, TypeScript build, Vite build, PWA file validation. 98 exercises / 294 artwork frames verified; 76 static PWA files and 4 image assets; no circular JS chunks. Existing oversized-chunk warning remains. The artwork check logs a sandbox HMR socket warning but exits successfully.
- Changed source/test ESLint passes. Booking/recurrence Node tests: 93 passed.
- Existing real Chromium/PDF suite: 3 passed, including seven fixtures, 320/390/768/1440 layouts, 100%/200% text scale, A4/Letter pagination and raster checks. It required approved local socket access; the ordinary sandbox cannot listen on 127.0.0.1:5173.

## Limits

- This is same-tab, best-effort recovery, not durable/cloud teaching-history storage. Checkpoints are bounded to 256,000 characters, 500 steps and 12 hours, written about once per second and on visibility/pagehide/unmount. A hard crash can lose the most recent second. Closing a tab, browser/OS eviction, a different device or unavailable sessionStorage may prevent recovery.
- Real iPhone/Android PWA eviction, physical speakers, actual authenticated account sign-in and production Firebase were not tested. Account isolation was tested using the actual component/store boundary and synthetic owner transitions, not a real login.
- Recovery intentionally never auto-resumes an interrupted class or creates a completed class record.
- Browser clock was controlled for deterministic timing. The QA runner was corrected to allow React's delayed Suspense commit after refresh and compare rehydrated objects structurally rather than by JSON key order. Neither harness issue was presented as a production defect.
