# PWA install and offline app shell

## Entry and behavior
- Sidebar → **앱 설치** opens an optional, dismissible dialog. There are no automatic install prompts.
- Android Chrome and supporting desktop browsers expose **이 기기에 설치** only after a real `beforeinstallprompt` event. Each event is consumed once. Cancellation and errors remain visible when a fresh retry event arrives. Repeated clicks cannot issue multiple requests.
- Prompt acceptance is not installation success. Completion is reported only after `appinstalled`; standalone launch is detected separately with display-mode and iOS `navigator.standalone`. No installed flag is stored.
- iPhone/iPad Safari explains Share → Add to Home Screen → Open as Web App (when offered). Other iOS browsers point to Safari. Unsupported/private windows receive manual guidance, not a fake download.
- Manifest has a stable root ID/scope/start URL, 192/512 PNG icons, a separate safe-area maskable icon, and an Apple touch icon derived from the existing authored leaf mark.

## Cache and account boundaries
The production-only worker precaches the exact built HTML/JS/CSS app shell and two icons. It does not cache user records, authentication/API responses, external media, or requests with query strings. Auth paths (including Firebase /__/auth/*) are not intercepted. Root online navigation uses the original request and does not save its response; offline root navigation uses the precached document.

The worker deliberately has no skipWaiting, clients.claim, message-triggered activation, forced reload, or storage/database clearing. A new worker waits while old tabs remain open. Only obsolete caches beginning with flow-atelier-shell- are removed after activation. Local account-scoped drafts and auth callbacks retain their existing code paths.

The Vite hook runs with post ordering after empty CSS-only JS chunks have been removed. This matters: an earlier hook can include nonexistent chunks, and an SPA fallback can conceal those missing files by returning HTML. `npm run build` and `npm run check:pwa` verify all precache files exist and are nonempty, all built JS/CSS are covered, and the manifest and PNG sizes match. A strict static-server test, not only Vite's SPA preview, verified install/update.

Installation is not backup or cross-device sync. The UI explicitly warns that iOS browser and Home Screen storage may differ and recommends whole-data export before migration or deletion. Videos, login/cloud backup, and some images require a network connection.

## Verification (2026-11-06)
- Focused lifecycle/panel/SW tests cover availability, repeated click, cancel/retry, failure, acceptance versus completion, standalone, iPad desktop UA, update waiting, local-data retention, auth/query/external/API bypass, and scoped cache cleanup.
- Final integrated regression on d948653 plus this feature: 173 files / 1,843 tests passed. Focused PWA checks: 31 passed.
- TypeScript, lint, production build, and motion ledger passed. Existing lint warning: MotionAuthoringBatchFigure react-refresh export. Existing bundle-size warning remains.
- Chrome actual browser viewport QA at 320, 390, 768, and 1440 px, plus a short 320×568 screen: dialog, close/Escape/reopen, no horizontal overflow, offline reload, and local sentinel preservation passed. These are viewport tests, not phone hardware. Private contexts reported only in-incognito; a separate normal profile reported zero installability errors.
- Strict static server + actual Chrome, two open tabs and two worker versions: update waits, no controller switch or forced reload, next launch activates the new worker, obsolete shell cache is removed, and the local draft survives.
- Actual Android emulator (API 36, Chrome 133, 412 CSS px): trusted beforeinstallprompt, native install dialog, Cancel, fresh-event retry, and browser completion event/UI verified. A launcher icon/standalone relaunch was not confirmed on the loopback-hosted preview. Do not describe it as a physical phone or a completed standalone verification.
- Actual iOS 27 simulator Safari: app rendering, sidebar install entry, Safari-specific instructions, and native Share sheet verified. Home Screen addition and standalone relaunch remain unverified. Safari remote automation was disabled and was not enabled. DeviceHub is the installed Xcode simulator GUI on this Mac.
- No production deployment performed by this change's author. Browser test profiles/own Android tabs were closed. iOS test-device ownership was handed to the design QA worker, who confirmed shutdown after their checks.

## QA evidence
Selected screenshots and a file-size/SHA-256 manifest are also saved in /Users/hjunkim/Documents/Codex/pilates-pwa-qa-20261106.
Mac paths (local, not public links):
- /tmp/pilates-pwa-browser/ (responsive screenshots, normal-profile-installability.json, update-results.json)
- /tmp/pilates-pwa-android/ (native prompt, cancellation, completion screenshots)
- /tmp/pilates-pwa-ios/ (Safari, install guide, Share sheet)
- /tmp/pilates-pwa-*.log (checks and strict-server update logs)
