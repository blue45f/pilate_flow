# Secret scanning response

## Verified on 2026-11-08

- [Alert 1](https://github.com/blue45f/pilate_flow/security/secret-scanning/1) identifies a Google API key in historical `src/lib/localAppDeploy.ts:111`, commit `0bebbef3bcbaa2009f0cb4934f8c242c3aa884a6`.
- That value is absent from current tracked source. The Firebase auth rewrite in `bab6ae3` removed the hardcoded config. The application now reads public client config from the same-origin Firebase Hosting `/__/firebase/init.json` endpoint.
- An in-memory comparison confirmed that the historical value still matches the public operating site's Firebase client config. No key value is included in this report, logs, or a new fixture.
- Firebase explains that its client API keys generally identify a project rather than authorize access to its data. They are intentionally present in public web config. This does not prove that every API enabled for a project is safe to expose. See [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).
- Read-only project API-key metadata lists a Firebase-created Browser key with an API allowlist and no HTTP referrer allowlist. Restrictions, authorized domains, quotas, and any non-Firebase API use need an owner-approved review. No provider settings or credentials were changed, and no inference of unauthorized usage was made.
- [Alert 2](https://github.com/blue45f/pilate_flow/security/secret-scanning/2) is a different, synthetic value in a historical independent redaction test. It is already marked `hidden_by_config`, not revoked. The test intentionally exercises redaction and does not send the fixture to a provider. Current Google/GitHub test examples are assembled at runtime instead of storing complete credential-shaped literals.
- The existing `.github/secret_scanning.yml` broadly excludes test paths. This patch leaves that security configuration unchanged. A hidden alert must not be treated as proof that all excluded files are safe.

## Prevention added

Run `pnpm check:secrets` before publishing. The check scans Git-tracked source, tests, docs, and configuration without directory exclusions and fails on narrow credential-shaped patterns. Its diagnostics contain only redacted file names, line numbers, and rule names, never matched values. The GitHub Actions workflow runs the same checks without provider secrets or dependency installation.

Redaction-test JWT fixtures are now assembled from their segments at runtime. Their resulting test values and behavioral assertions are unchanged. New fixtures should be unmistakably synthetic and constructed without committing a full provider credential or token-shaped literal.

This lightweight guard supplements GitHub/provider scanning. It is not a comprehensive credential detector, a validity test, or a Git-history scanner. It cannot establish that a key has been revoked or that an account has not been abused.

## Remaining incident decisions

Alert 1 remains open pending an owner-approved restriction/rotation decision or a documented classification of the intentionally public Firebase client configuration. Changing browser/API restrictions can break existing Firebase applications that share this project; inventory consumers before narrowing them. Do not test the exposed key against additional services, revoke it, create replacements, rewrite shared history, or dismiss the alert as a side effect of a source-only fix.

Removing a literal in a new commit does not remove it from prior commits, clones, forks, caches, or artifacts. History cleanup, if needed after provider remediation, is a separate coordinated operation. Never force-push shared history merely to make an alert disappear.

## Read-only consumer inventory and proposed restriction scope

The project has one active Firebase web app, `DeskCloud Fleet Web`, whose API-key ID matches the Browser key metadata. It has two Hosting sites: `deskcloud-fleet-auth` and `pilates-flow-atelier`. Auth currently authorizes these three domains:

- `deskcloud-fleet-auth.firebaseapp.com`
- `deskcloud-fleet-auth.web.app`
- `pilates-flow-atelier.web.app`

The Pilates operating site returns the expected app/config. The default `deskcloud-fleet-auth.web.app` site returned an HTTP error during this check; that is not proof that its authorized domain can be removed. The source imports only `firebase/app` and `firebase/auth`.

Cloud Monitoring `consumed_api` request-series metadata for 2026-11-01 through 2026-11-08 associates this key with `identitytoolkit.googleapis.com` and `securetoken.googleapis.com`. The seven-day result was complete, but does not establish that there are no dormant or external consumers.

A concrete owner-approved tightening would retain HTTPS referrers for all three domains above (`https://<domain>/*`) and reduce allowed APIs to those two Auth services. Keep the `firebaseapp.com` auth-helper domain: excluding it can disrupt popup/redirect handling. Narrowing APIs can break other consumers using database, storage, ML, or other Firebase services. Referrer restrictions can reject other origins, local development, custom domains, or referrer-suppressing clients. Confirm the consumers and approval, then verify Google sign-in and refreshed sessions after applying any restriction. No such change was applied as part of this patch.

## Source-patch verification

- New guard: 7 Node tests passed; tracked-file scan passed.
- Independent Gitleaks scan of the complete staged source snapshot: zero findings. Existing historical findings were not erased or dismissed.
- Production build/PWA verification, backend typecheck, motion-study ledger and its 6 tests: passed.
- ESLint: zero errors, one existing React Fast Refresh warning in `MotionAuthoringBatchFigure.tsx`.
- Full Vitest attempt: 2,456 tests passed. A clean-worktree audit failed because this patch was still uncommitted. A separate browser/PDF suite cannot run on this Mac because it hardcodes Linux `/usr/bin/chromium` and Poppler paths; its two tests were not executed. These limitations are not reported as a full aggregate pass.

After committing the source patch, the clean-worktree audit and all three changed fixture suites passed together: 4 files, 37 tests. The Linux-only browser/PDF suite remains unexecuted on this Mac.
