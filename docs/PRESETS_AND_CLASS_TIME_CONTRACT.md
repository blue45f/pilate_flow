# Offline presets and explicit class timing

## Product behavior

- The existing 18 class presets and 20 reusable movement blocks can be selected from the workbench without an AI key or external request.
- Browsing and selecting are read-only. Apply creates independent step IDs and copies the source. It does not change saved lessons, teaching history, source exercises or review records.
- An existing plan defaults to appending. Replacing it requires a separate checkbox. The entire apply is one undo action.
- A newer store/account state invalidates the selected copy. Missing exercise data, malformed existing steps, duplicate step IDs, invalid times or more than 1,000 items are rejected without changing memory or persistence.
- User-authored repeat movements, split left/right items and a plan shorter/longer than its target remain editable and playable. The target difference and repeated movement remain advisory. Missing or ambiguous exercise data, malformed steps, duplicate step IDs and invalid target values still prevent playback.
- No copied preset or user-authored plan becomes professionally reviewed or safe by being saved or played.

## Optional time calculation

The block inspector keeps this under a closed details control. Plain duration editing remains the default. All numbers are instructor-entered assumptions, not prescribed cadence, training volume or measured duration.

For sides S, sets N and repetitions R:

`total = S × N × R × (movement seconds + additional hold seconds)
       + S × N × extra breaths per set × seconds per extra breath
       + S × (N − 1) × between-set rest seconds
       + (S − 1) × side-switch seconds
       + teaching seconds + equipment/next-movement transition seconds`

- Simultaneous bilateral work or one side uses S = 1. Sequential left and right uses S = 2.
- Breathing during movement belongs inside movement seconds. Only separate, additional breathing goes in the extra-breath fields, avoiding double counting.
- Between-set rest is not added after the last set. Side switching is not added for one side. Teaching and next-movement/equipment transition are counted once.
- A positive cadence must be supplied. Default one repetition/set is explicitly a calculation assumption, not a recommendation. Extra breathing defaults to zero; a positive count requires a positive entered time.
- The editable estimate is limited to 30 seconds–20 minutes per block. Longer work can be split into several blocks. Existing valid legacy durations are retained when not edited.
- “계산값을 편집란에 넣기” changes the local draft only. “변경 적용” commits the duration, counts, side mode and saved assumptions together with one undo.
- Optional versioned `timeEstimate` fields survive backup, persistence and restart. Older steps without the field remain valid. Editing other metadata does not silently multiply or replace duration.
- This is a budget calculator, not a detailed breath/hold cue generator. The class timer uses the final total plus the existing teaching/movement/transition segmentation. No medical benefit or actual duration is guaranteed.

## Planned versus actual

The existing classroom clock starts paused, measures active elapsed time, excludes pauses and supports next/previous movement, extension and explicit resume. These controls do not rewrite the saved plan or create a history entry on their own. Actual teaching records remain an explicit separate action. Existing local, opt-in voice rules and the prohibition on unrelated autoplay remain unchanged.

## Browser verification, 2026-11-06

Isolated Chrome profiles at 320, 390, 768 and 1440 pixels, reduced motion enabled:

1. Select/filter a preset, close without applying, and verify all plan/source/history values unchanged.
2. Copy a four-movement class. Append a reusable group and undo the append in one action.
3. Enter 4 repetitions × 2 sets × 2 sides with 3-second movement, 1-second additional hold, 2 separate 5-second breaths per set, 10-second between-set rest, 15-second side switch, 20-second teaching and 10-second transition. Confirm the exact 169-second total.
4. Apply explicitly, reload the page and verify the saved assumptions, counts, sides and duration restored.
5. Open preview despite the now-different target, start the classroom paused, run it, pause, wait, and move to the next item. Check that paused wall time is excluded and source plan/history remain unchanged.
6. Check no horizontal overflow or page errors. Inspect actual screenshots of the picker, calculator, preview and classroom.

All four viewport journeys passed. These are real browser UI/timer checks, not physical exercise or speaker tests. Native iPhone/Android execution and audible TTS are not claimed by this feature's QA.

## Final integrated verification

Integrated with the latest history/recovery changes and PWA main `9a0fac43ce521f2b3b4533240d7b39b6f7331321`, without reintroducing pre-rewrite history:

- Full Vitest: 176 files, 1,907 tests passed.
- TypeScript, ESLint and production build: passed. Existing warnings remain for one Fast Refresh export and a catalog chunk larger than 500 kB.
- Motion ledger: 22 source identities checked and all 6 ledger regression tests passed.
- PWA build check: 40 real static files, manifest and PNG icons verified.
- Real production-preview Chrome, 390px: loaded the service worker, went offline before ever opening the lazy preset picker, copied a preset, edited an explicit time estimate, reloaded offline and recovered the same draft. All 40 shell files were cached; no page errors occurred. This verifies offline app-shell behavior, not installation onto a physical home screen.

Remote production deployment is a separate, coordinated action after the next design integration. This change does not itself claim an operating-site update.
