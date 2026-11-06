# Sequence composition and AI acceptance contract

## Authoring update, 2026-11-06

The authoring contract in [composition-authoring.md](composition-authoring.md) supersedes mandatory reviewed-pool restrictions for local creation, local composition, saving, and timing rehearsal. Review records are optional provenance and remain unchanged. Separate external AI validation contracts are not relaxed by this change. The historical implementation notes below describe the earlier boundary and must not be used to reintroduce an authoring gate.

## Current operating boundary

The single public URL is https://pilates-flow-atelier.web.app. Firebase Google sign-in provides identity. Existing AppDeploy backups and browser-local studio records are separate data stores. Do not claim account cloud storage or cross-device restoration until authenticated write/read, logout/login, restart, and recovery tests pass against a real deployed backend. Preserve the existing backend and data during migration.

## Four editable levels

1. Movement: one existing exercise identity, instructor review state, apparatus and setup, side, repetitions, and explicit duration.
2. Reusable block: ordered movement/rest instances, editable repetitions, transitions, and timing. A block has a stable identity and immutable published revisions.
3. Sequence: ordered block instances with a revision snapshot. Editing an instance does not silently update the saved block or other sequences. Updating to a newer block revision requires a visible comparison and explicit application.
4. Class: a scheduled program or an actually taught session. Class instances capture their ordered sequence/block/movement snapshots and exact timing. Planned and taught states are distinct.

Do not mutate historical records when an exercise, block, or sequence changes. Copying a class creates new instance IDs but retains source IDs/revision references for provenance. Existing flat SequenceStep arrays and stored class records must remain loadable. Prefer an additive schema version with a deterministic compiler to the established flat playback/timer format, and test migration without overwriting the source.

## Timing and safety acceptance

- Sum movement, repetition, side, rest, and transition time consistently through every level; show planned and actual durations separately.
- Reject invalid, negative, non-finite, or impossible durations. Target fitting must not quietly create unsafe speed, zero-duration movement, or excessive repetitions.
- Applying a generated candidate is an explicit instructor action, with review states, selected apparatus, level, left/right balance, movement balance, transitions, and total time visible before use.
- Unreviewed exercises never become automatically eligible merely because the reviewed pool is small. An insufficient reviewed pool is a clear blocked/partial result, not a silent fallback.
- Pain, injury, pregnancy, diagnosis, treatment, and other health constraints remain local. No therapeutic guarantees or condition-specific medical advice.
- Existing active work must not be replaced by a generated candidate without an explicit apply/copy step and a recoverable prior snapshot.

## Free-only server AI

The original Gemini draft included a browser API-key field, sessionStorage key persistence, direct Gemini requests, free-text transmission, and a fallback to unreviewed movements. The integrated candidate removes those client-key and network-call paths, preserves private local rule-based recommendations, and requires reviewed exercises. External AI remains visibly disabled until a verified free-only server is connected. The movement/block/sequence/class hierarchy and account-backed history remain follow-up work, not completed features.

- API keys belong only in a server secret facility. Do not request, store, embed, log, or transmit provider keys through the frontend, URLs, screenshots, or source control.
- Use a server allowlist and verify the actual account/project free status before enabling network generation. Never enable billing, add paid credits, choose paid models, or fall back to a paid route automatically.
- Gemini free-tier input/output may be used for product improvement and reviewed by humans. Do not send personal or health data. Use only non-sensitive structured theme/duration/apparatus/level fields and public catalog IDs. User notes, class history text, names, and health constraints stay local.
- OpenRouter free routes require a free-model allowlist, maximum price zero, verified provider policy, and no paid fallback. Unfunded limits currently include 20 requests/minute and 50/day, subject to current account/provider limits.
- On exhausted quota, 429, or 402, disable network generation and show a clear reason. Existing manual editing and local presets remain available; do not mislabel them as a successful live AI response.
- Parse and validate output against the existing catalog and reviewed eligibility. Unknown IDs, unsupported equipment, unsafe timing, or incomplete output are rejected locally.
- Network tests must use a verified free-only setup and non-sensitive synthetic input. Mocks do not establish account billing status or real provider connectivity.

## Actual teaching history and recovery

Capture taught date/time, planned class reference, actual movement/block order, side/repetition/timing edits, and immutable program snapshots. Later catalog edits must not change a previously taught class. Allow date-based review and copying into a new plan. Test local restart, export/import, missing-source recovery, version migration, and repeated save idempotency. Real account-backed storage needs a separately tested user-scoped authorization boundary; a successful Google login alone is not evidence of persistence.

## Required regression evidence

Legacy flat data compatibility; nested timing sums; independent copy/version edits; historical snapshot stability; selected-equipment filtering; no unreviewed automatic fallback; quota/error fail-closed behavior; no client keys or sensitive payloads; explicit apply/undo; mobile layout and reachable close controls; local and real-server persistence tested separately.

## Official policy sources

- https://ai.google.dev/gemini-api/docs/pricing
- https://openrouter.ai/docs/guides/routing/provider-selection

This document is an implementation and verification contract, not a claim that the unfinished AI or account-storage features are deployed.
