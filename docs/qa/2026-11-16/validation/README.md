# Local workflow quality gate · 2026-11-16

**Result: all eight quality gates passed.** The workflow's exact 70-file Vitest selection passed **517 tests**. The 1,584 product/build-input files had the same SHA256 fingerprint before and after validation. Total sequential command time was **463.832 seconds**.

This is local execution of `.github/workflows/deploy-production.yml` → `verify-and-build` quality commands. The commands, test paths, and existing test limits were preserved. Gates ran one at a time. No hosting upload, authentication setup/login, or live production verification was executed.

## Results and exact commands

| Step | Command | Evidence | Log |
|---|---|---|---|
| 01 | `pnpm check:secrets` | PASS · 7 tests + tracked-file scan | [01-check-secrets.log](01-check-secrets.log) |
| 02 | `pnpm check:motion-study` | PASS · 6 tests + study-ledger consistency | [02-check-motion-study.log](02-check-motion-study.log) |
| 03 | `pnpm test:deploy` | PASS · 55 isolated deployment/auth-orchestrator unit tests | [03-test-deploy.log](03-test-deploy.log) |
| 04 | `pnpm test:motion-artwork` | PASS · 6 artwork generator unit tests | [04-test-motion-artwork.log](04-test-motion-artwork.log) |
| 05 | `pnpm lint` | PASS · Whole-project ESLint | [05-lint.log](05-lint.log) |
| 06 | `pnpm build` | PASS · Artwork cache check → TypeScript → Vite → PWA integrity | [06-build.log](06-build.log) |
| 07 | `pnpm deploy:check` | PASS · Read-only canonical configuration and local dist readiness | [07-deploy-check-readonly.log](07-deploy-check-readonly.log) |
| 08 | `pnpm vitest run` + exact workflow list | PASS · 70 files / 517 tests | [08-workflow-vitest.log](08-workflow-vitest.log) |

The complete argument array for every command is in [gate-plan.json](gate-plan.json). The 70 unique test paths are in [vitest-files.txt](vitest-files.txt), extracted directly from the workflow. [gate-results.json](gate-results.json) records timestamps, exit codes, duration, runtime versions, input fingerprints, log hashes, output scans, and the built entry hash.

## Validated source and runtime

- Branch during execution: `feat/simple-flow-natural-motion-20261116`.
- HEAD during execution: `26d5c5f0ab2f120d3d924578695c7203f2c9bb27`. The validated working tree included the pending product changes; the input fingerprint below identifies those actual files.
- Product/build-input SHA256: `76fee616f2a1f14842bdc51e5567d76a8110ff7bbb301b2594bba31dd381956d`.
- Input scope: `src`, `backend`, `public`, `scripts`, the workflow, and build/package/config inputs. QA documentation was excluded so capture/README updates could continue without changing the tested product.
- Local runtime: Node `v24.22.1`, pnpm `11.25.0`. GitHub Actions configures Node `22.x`; these local results record the actual runtime used.
- `sourceInputsUnchanged`: `true`. No gate, test assertion, timeout, or worker configuration was changed for this run.

## Production build artifact

- Entry: `/assets/index-Bd9Clluz.js`.
- Entry SHA256: `d51655735102ccbb6ed40e95940ec2eb5e15d919089af1ede39ed7bdccb22994`.
- Entry bytes: `2184174`.
- `index.html` SHA256: `39cc1599ec6a5d5b41defc60d08c164d87302e7e31a7167c79a2ca33b22bcb62`.
- PWA audit: **76 real static files, four Atelier V2 PNG assets, manifest, PNG icons, and zero circular JavaScript chunks**.

`deploy:check` resolves to `node scripts/deploy-universal.mjs --check-env`. Code review confirmed that the `isCheckOnly` branch prints status and exits before live verification, deployment locks, authentication materialization, or Firebase execution. Its canonical configuration and local dist-readiness checks passed. The reported feature branch and uncommitted working tree were retained during this pre-publication check.

## Additional focused evidence

These are separate focused runs; their test counts are not added to the workflow's 517 as unique coverage.

| Focus | Result | Evidence |
|---|---|---|
| Final library flow and independent review | 4 files / 22 tests passed | [Library log](focused/library-ux-reviewed-20261116.log) |
| Existing schedule, start, and recovery paths | 8 files / 98 tests passed; exit code 0; no watched file changed during that run | [Log](focused/schedule-start-recovery-20261116.log), [original run metadata](focused/schedule-start-recovery-20261116.json) |
| Motion renderer and player | 5 files / 47 tests passed, documented by the motion review | [Motion validation document](../motion-renderer/README.md) |

[focused/focused-evidence.json](focused/focused-evidence.json) records source paths, byte counts, SHA256 hashes, and output-scan results for the copied library and schedule/start/recovery evidence. The motion run had no shell log file at the time; its complete captured tool stdout is now preserved in [focused-47-tool-stdout.log](../motion-renderer/focused-47-tool-stdout.log), with its source and checksum recorded in [focused-47-tool-stdout.provenance.json](../motion-renderer/focused-47-tool-stdout.provenance.json).

Root's isolated browser verification is recorded in [browser/evidence.json](../browser/evidence.json), separately from these automated tests.

## Output handling

All eight gate logs were captured outside the repository first, scanned with the project's credential-shape detector, and then copied here. The detector reported **zero findings** in every gate log, so no output line needed redaction. The three additional focused log/metadata files also reported zero findings. Metadata contains no environment dump or credential values. Log fingerprints preserve a reviewable record of the executed commands and their results. [output-scan.json](output-scan.json) records the final validation-artifact scan and hashes.
