최신 소스 검증은 [확장 QA](instructor-expansion-QA.md)를 확인하세요. 이 문서의 이전 검사 수는 보존된 보안 설계 이력이며 실제 로그인 저장·복원 성공을 뜻하지 않습니다.

# Account backup service

The deployed AppDeploy build uses its actual `@appdeploy/client` and `@appdeploy/sdk` packages. No third-party database credentials, provider keys, paid subscription, or newly provisioned external database are required. The local Vite fallback reports that server backup is unavailable and never simulates a successful server save.

## What is stored

Normal editing persists in browser storage. Account backup is explicit: **서버에 저장** sends a compact version 3 application export, including library changes, saved classes, teaching history, owned equipment, condition templates, and an unsaved draft. The limit is 2 MiB of UTF-8 JSON. Local JSON export remains available for larger libraries.

AppDeploy database table `studio_backups` contains one metadata pointer per SHA-256 hash of the authenticated user ID. The snapshot itself is a JSON object in managed storage under an account-specific private path. The app never returns a storage URL or accepts an owner ID or file path from the browser.

## Routes

| Route | Behavior |
| --- | --- |
| `GET /api/_healthcheck` | Public readiness response; contains no application data. |
| `GET /api/studio/backup/status` | Authenticated account's snapshot status. |
| `GET /api/studio/backup` | Authenticated account's snapshot content, after checksum verification. |
| `PUT /api/studio/backup` | Validate and save a snapshot using an expected revision. |
| `DELETE /api/studio/backup` | Invalidate the pointer and remove its storage object. |

Every backup route starts with the platform `requireAuth()` middleware. Ownership comes only from its verified `userId`. Requests must also assert `expectedUserId` (GET query; PUT/DELETE JSON body). This assertion must match the verified principal and only detects stale browser sessions; it never selects whose records are read or changed. The backend applies the same Zod data schema used by local recovery, verifies exercise references and duplicate record IDs, and checks the serialized byte size. Backup results and application errors set `Cache-Control: private, no-store` and vary on Authorization.

## Concurrent saves and failures

Saves create a storage object before publishing its database pointer through a conditional update. A stale revision returns a conflict instead of overwriting another device's backup. A stable request ID allows the same failed request to be reconciled. Storage paths also include the payload checksum so concurrent reuse of a request ID cannot corrupt another committed payload. A confirmed failed conditional update removes its unpublished object; uncertain outcomes retain their object for reconciliation. Replaced objects are cleaned up on a best-effort basis.

Deletion publishes a tombstone before removing the object, immediately denying subsequent backup reads. If file removal cannot be confirmed, the UI reports the pending cleanup and can retry the same deletion request. Old objects left by an unconfirmed or unsuccessful cleanup remain inaccessible through the application routes; this implementation does not run a background storage sweeper.

## Recovery behavior

**서버 자료 합치기** uses the existing validated recovery flow. It adds missing IDs and restores customized backed-up values over unchanged built-in examples on a fresh device. Actually edited local records with the same IDs and the current active draft are retained. It does not automatically reconcile edits to a shared record. A session that first discovers an existing account backup must recover it before saving; merely loading its status cannot authorize replacement. After another device changes an existing server snapshot, a conflicting device must recover the server snapshot before saving again. If the other device deleted the snapshot, refreshing status allows a deliberate new save.

Signing out removes cloud session metadata and tokens; the app explicitly retains local studio records. **로그인하고 백업 연결** delegates to the documented `auth.signInWithRedirect()` API. Its default scopes include `offline_access`; this app does not silently remove refresh-token support. AppDeploy auth SDK reference 2.12 supports only `scope` in `SignInOptions`, not `provider` or `prompt`. Provider selection belongs in the root `appdeploy.auth-login.json` methods configuration when requested. The app does not claim a provider-specific redirect or account chooser; users can sign out using the supported API before signing in again. Actual provider selection, authenticated backup/restore, and session restoration after expiration remain unverified in this local environment. Profile avatar URLs are restricted to `https:` with `referrerPolicy="no-referrer"`. Authentication restoration runs on each startup before any cloud data request. Every operation rechecks the active SDK identity before sending and before accepting its response. A cross-tab account change clears cached cloud state and pending requests and requires reconnection. No background upload or automatic synchronization runs.

## Checks

```sh
pnpm exec tsc -b
pnpm exec tsc -p tsconfig.backend.json --noEmit
pnpm exec vitest run backend/backupService.test.ts backend/principalAssertion.test.ts src/lib/cloudSync.test.ts --maxWorkers=1
```

The 16 service tests cover account isolation, validation, stale writes, repeated and concurrent requests, uncertain database outcomes, failed and corrupted storage, deletion, and cleanup retry. Three principal assertion tests cover matching, stale, and missing identities. The 14 client tests cover restored authentication, anonymous request denial, stable retry payloads, conflict recovery, remote deletion, sign-out cleanup, cross-tab identity changes, in-flight responses, Axios deletion transport, fresh-session overwrite prevention, and requiring a successful merge before clearing a conflict.

These local tests use an in-memory repository and a mocked SDK transport. A production authenticated roundtrip must be checked after a real sign-in. Anonymous API responses, public readiness, SDK inclusion, and deployment status are separate live checks.

## Static hosting capability

A build made without the managed `@appdeploy/client` package uses `src/lib/localAppDeploy.ts`. Its auth and API operations deliberately fail rather than simulate remote persistence. Such a build remains without account backup even when published on static Firebase Hosting. The UI must describe the missing connection and offer JSON backup, not imply that publishing alone enables the AppDeploy backend. No provider credentials or backend access are created by this patch.


## Firebase operating site and Google sign-in

The single public operating URL is https://pilates-flow-atelier.web.app. The Firebase project is `deskcloud-fleet-auth`, Hosting site `pilates-flow-atelier`, and existing web app `1:1083045258283:web:25c2e482307b366e70366e`.

On that exact origin, the settings panel lazily loads the official Firebase modular SDK and obtains public client configuration from `/__/firebase/init.json`. It uses Google popup sign-in, the Firebase auth-state observer for session restoration, and Firebase sign-out. Public Firebase client configuration is not a server credential; no OAuth client secret or service-account key belongs in the frontend.

Google sign-in identifies the account only. This Hosting deployment does not migrate the existing AppDeploy database, storage, or studio backups. Local studio data stays local, including on logout. Keep JSON export/import available, and retain the existing AppDeploy backend until a separately tested data migration and recovery plan exists. Never describe Firebase Hosting's SPA fallback at `/api/*` as a working backup API.

Provider/domain configuration is managed separately from Hosting deployment. Google must be enabled for the project, and `pilates-flow-atelier.web.app` must remain in its authorized domains. Do not remove other domains or old infrastructure merely because the frontend operates here.
