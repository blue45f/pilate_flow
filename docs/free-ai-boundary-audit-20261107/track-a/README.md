# Track A Audit Report — Free Quota Exhaustion / 429 / 401 / Timeout / Offline Boundary & Studio Survival

- **Audit Date**: `2026-11-07`
- **Track**: `Track A (무료 quota 소진/429/401/timeout/오프라인 시 AI만 비활성화되고 일반 동작·수업 저장은 살아있는지 독립 테스트)`
- **Executable Vitest Suite**: `scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx`
- **Standalone Runner**: `scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs`

---

## 1. Current Implementation Status vs Non-Existent Features Distinction

| Component / Module | File Path | Actual Implementation Status | External AI Connection |
| :--- | :--- | :--- | :--- |
| **`AiSequenceCoPilotPanel` & `generateAiThematicSequence`** | `src/components/AiSequenceCoPilotPanel.tsx`, `src/services/geminiSequenceAi.ts` | **100% Local Rule Engine (`engineSource: 'local-rules'`)**. Despite the file name `geminiSequenceAi.ts`, it never calls `fetch` or any LLM API. Returns `modelName: '로컬 규칙 추천 · 외부 AI 미연결'` and renders a permanently disabled button `'외부 AI 생성 · 무료 서버 연결 대기'`. | **Non-existent (Local-only)** |
| **Static/Local `@appdeploy/client` Adapter** | `src/lib/localAppDeploy.ts` (aliased in `vitest.config.ts` and `vite.config.ts`) | **Stub Adapter**. `api.get` and `api.post` always reject with `Error('서버 기능은 연결되어 있지 않습니다...')` carrying `{ code: 'local_api_unavailable' }`. | **Non-existent in static/local builds** |
| **`freeAiClient` Controller** | `src/lib/freeAiClient.ts` | **Implemented Client Boundary**. Recognizes `local_api_unavailable`, `unconfigured`, and `billing_guard_unconfirmed` to auto-switch to `local-rule-engine` (`buildLocalClassDraft`, `buildLocalMovementIdea`, `composeSequenceFromReviewedItems`). | **Conditional (via `FreeAiTransport`)** |
| **`FreeAiAssistantPanel` UI** | `src/components/FreeAiAssistantPanel.tsx` | **Implemented 3-Tab Co-Pilot UI**. Provides separate buttons for External Free AI (`run*(false)`) and Local Rule Fallback (`run*(true)`), plus inline editing and workbench apply. | **Conditional (via `client` prop)** |
| **`freeAiService` Backend** | `backend/freeAiService.ts` | **Implemented Server Handler (`GET /api/studio/ai/status`, `POST /api/studio/ai/assist`)**. Enforces free-tier model allowlists (`GEMINI_FREE_TIER_MODELS`, `:free` / `openrouter/free`), `GEMINI_FREE_TIER_UNPAID_CONFIRMED=true`, `max_price=0`, `allow_fallbacks=false`, in-memory RPM/RPD counters, and PT/UTC renewal calculation. | **Server-only (requires AppDeploy backend runtime + env vars)** |
| **Automatic Retry / Auto-Fallback on HTTP 429 / 401 / Timeout / Offline** | `src/lib/freeAiClient.ts`, `src/components/FreeAiAssistantPanel.tsx` | **Non-existent**. Only `local_api_unavailable`, `unconfigured`, and `billing_guard_unconfirmed` auto-fallback to `local-rule-engine`. On `free_quota_exhausted` (429), HTTP `401`, `Timeout`, or `Offline`, `freeAiClient` throws `FreeAiClientError` and requires the user to manually click the secondary local fallback button. | **Manual fallback button required** |

---

## 2. Verification Matrix (Pass / Reproduced Defect / Unverified)

| ID | Verification Target | Status | Evidence / Test Case |
| :--- | :--- | :--- | :--- |
| **A-01** | `AiSequenceCoPilotPanel` & `generateAiThematicSequence` operate strictly locally without network `fetch` | **PASS** | `1.1 verifies AiSequenceCoPilotPanel + generateAiThematicSequence is strictly a local rule engine and never calls fetch` |
| **A-02** | `localAppDeploy` (`@appdeploy/client`) rejects with `local_api_unavailable` and `freeAiClient` falls back to `local-rule-engine` | **PASS** | `1.2 verifies localAppDeploy (@appdeploy/client) rejects with local_api_unavailable and freeAiClient seamlessly falls back to local-rule-engine` |
| **A-03** | Billing guard blocks paid/retired models (`gemini-4-argon`, `gemini-3.8-pro`, `gemini-3.1-pro-preview`, `gemini-2.0-flash`, non-`:free` OpenRouter) and missing `GEMINI_FREE_TIER_UNPAID_CONFIRMED` | **PASS** | `2.1 blocks paid/retired Gemini & OpenRouter models with invalid_paid_model_blocked and unconfirmed billing guard with billing_guard_unconfirmed` |
| **A-04** | OpenRouter payload enforces `allow_fallbacks: false, max_price: { prompt: 0, completion: 0 }` and Gemini payload omits paid `tools` / `google_search` | **PASS** | `2.2 enforces max_price=0 & allow_fallbacks=false on OpenRouter and omits paid grounding tools on Gemini upstream payloads` |
| **A-05** | Minute/Daily quota exhaustion and upstream HTTP `429`/`402` lock external calls (`free_quota_exhausted`) with exact PT (`America/Los_Angeles`) & `UTC` reset timestamps | **PASS** | `2.3 locks external AI on minute/daily quota exhaustion and upstream HTTP 429/402 with exact PT/UTC renewal timestamps and zero paid fallback` |
| **A-06** | Studio operations (`autoGenerateSequence`, step edits, rest insertion, `saveCurrentSequenceToBinder`, presets, `logClassSession`, `exportBackup`/`restoreBackup`) and local AI fallbacks (`preferLocalOnly: true`) survive **all 5 failure modes** (`free_quota_exhausted`, `429`, `401`, `Timeout`, `Offline`) | **PASS** | `3.1–3.5 survives [1..5] — local AI fallbacks, sequence editing, binder saving, history logging, and backup/restore work 100%` |
| **DEFECT-A1** | Missing `AbortSignal` timeout on upstream `fetchFn` + hung `postAssist` locks `FreeAiAssistantPanel` `isLoading=true` and disables the local fallback button | **REPRODUCED DEFECT** | `4.1 DEFECT-A1: createFreeAiService passes no AbortSignal timeout to fetchFn, and a hung postAssist locks FreeAiAssistantPanel isLoading=true` |
| **DEFECT-A2** | HTTP `401` / `Timeout` / `Offline` errors throw `request_failed` while leaving `quotaStatus.enabled === true` and `reason === 'ready'`, keeping the UI badge `'무료 AI 연결됨'` and primary external AI button active | **REPRODUCED DEFECT** | `4.2 DEFECT-A2: HTTP 401 / Timeout / Offline errors on postAssist or refreshQuotaStatus leave quotaStatus.enabled=true and reason="ready"` |
| **DEFECT-A3** | `backend/freeAiService.ts` increments `minuteUsed` and `dailyUsed` before `callUpstreamFreeProvider` and never decrements them on network/401/5xx/timeout errors, prematurely exhausting quota | **REPRODUCED DEFECT** | `4.3 DEFECT-A3: backend/freeAiService.ts increments minuteUsed and dailyUsed BEFORE callUpstreamFreeProvider and never rolls them back` |
| **DEFECT-A4** | `SequenceWorkbench.tsx` omits `onSaveConditionTemplate`, `onApplyConditionTemplate`, and `reusableBlocks` on `<LazyFreeAiAssistantPanel>`, causing `'프리셋 저장'` to display a false success banner without saving | **REPRODUCED DEFECT** | `4.4 DEFECT-A4: FreeAiAssistantPanel rendered with SequenceWorkbench props (missing onSaveConditionTemplate) shows false positive preset save banner` |
| **U-01** | Live network round-trip against deployed `@appdeploy/sdk` cloud runtime and live Google/OpenRouter endpoints | **UNVERIFIED (By Design)** | Sandbox has zero live API keys and zero external network calls by strict security policy; verified deterministically via injected `fetchFn` and `FreeAiTransport`. |

---

## 3. Root-Cause Analysis & Minimal Patch Proposals for Reproduced Defects

### DEFECT-A1: Missing Request Timeout & Hung External Call Blocks Local Fallback UI Button

- **Root Cause**:
  1. In `backend/freeAiService.ts` (`callUpstreamFreeProvider`, lines `1332-1339` and `1377-1384`), `fetchFn(url, { method: 'POST', headers, body })` is invoked without an `AbortSignal` timeout (`AbortSignal.timeout(ms)`).
  2. In `src/components/FreeAiAssistantPanel.tsx` (lines `840-847`, `1033-1040`, `1383-1390`), the secondary local fallback buttons (`'로컬 조건 추천으로 초안 만들기'`, `'로컬 규칙으로 아이디어·변형 정리'`, `'로컬 규칙으로 시퀀스 구성'`) have `disabled={isLoading}`. While an external AI request is slow or hung, the instructor is blocked from clicking the local fallback button in the UI.
- **Minimal Patch Proposal**:
```diff
--- a/backend/freeAiService.ts
+++ b/backend/freeAiService.ts
@@ -1335,4 +1335,5 @@
           'x-goog-api-key': config.apiKey!,
         },
         body: JSON.stringify(body),
+        signal: AbortSignal.timeout(15_000),
       });
@@ -1380,4 +1381,5 @@
           Authorization: `Bearer ${config.apiKey!}`,
         },
         body: JSON.stringify(body),
+        signal: AbortSignal.timeout(15_000),
       });
```
```diff
--- a/src/components/FreeAiAssistantPanel.tsx
+++ b/src/components/FreeAiAssistantPanel.tsx
@@ -841,6 +841,5 @@
             <button
               type="button"
               className="free-ai-btn-secondary"
-              disabled={isLoading}
               onClick={() => runClassDraft(true)}
             >
```

---

### DEFECT-A2: HTTP 401 / Timeout / Offline Errors Leave `quotaStatus.enabled === true` Instead of Disabling External AI

- **Root Cause**:
  - In `src/lib/freeAiClient.ts` (`executeExternalOrFallback` lines `693-715` and `781-787`, plus `refreshQuotaStatus` lines `835-858`), only `isLocalSdkUnavailable`, `unconfigured`, `billing_guard_unconfirmed`, and `429`/`free_quota_exhausted` update `currentStatus.enabled` or `currentStatus.exhausted`.
  - When `transport.postAssist` or `transport.getStatus` fails with HTTP `401` (`upstream_error`), `AbortError`/`ETIMEDOUT`, or `TypeError: Failed to fetch` (offline), `currentStatus` remains `{ enabled: true, exhausted: false, reason: 'ready' }`. Consequently, `FreeAiAssistantPanel` continues to display `'무료 AI 연결됨 (gemini-free)'` and leaves the primary external AI button enabled instead of disabling external AI.
- **Minimal Patch Proposal**:
```diff
--- a/src/lib/freeAiClient.ts
+++ b/src/lib/freeAiClient.ts
@@ -780,6 +780,14 @@
       }
 
+      currentStatus = {
+        ...currentStatus,
+        enabled: false,
+        exhausted: false,
+        reason: 'unconfigured',
+        statusMessageKo:
+          '외부 무료 AI 연결(인증·시간 초과·오프라인)에 실패하여 외부 AI가 일시 비활성화되었습니다. 로컬 추천 엔진·수동 편집·저장 프리셋을 이용해 주세요.',
+      };
       throw new FreeAiClientError(
         'request_failed',
         details.message ??
           '외부 무료 AI 요청 처리에 실패했습니다. 로컬 추천 엔진이나 수동 편집을 이용해 주세요.',
         syncStatusCounters(),
         currentStatus.renewal,
       );
```

---

### DEFECT-A3: Premature Quota Counter Increment on Upstream Network / 401 / 5xx / Timeout Failure in `backend/freeAiService.ts`

- **Root Cause**:
  - In `backend/freeAiService.ts` (`assist`, lines `1489-1490`), `minuteUsed += 1` and `dailyUsed += 1` are executed *before* `callUpstreamFreeProvider(config, parsed.data)` (line `1495`).
  - When `callUpstreamFreeProvider` rejects (network failure / timeout) or returns HTTP `401`, `500`, or `503` (lines `1496-1504` and `1531-1538`), `minuteUsed` and `dailyUsed` are never rolled back. A single failed network/auth/5xx call with `minuteLimit: 1` exhausts the minute quota (`exhausted: true`, `reason: 'free_quota_exhausted'`), causing the next request to fail with HTTP `429` even though zero AI completions succeeded.
- **Minimal Patch Proposal**:
```diff
--- a/backend/freeAiService.ts
+++ b/backend/freeAiService.ts
@@ -1487,14 +1487,18 @@
       activeGlobal += 1;
       activePerUser.set(normalizedUserKey, userActiveCount + 1);
       minuteUsed += 1;
       dailyUsed += 1;
+      let quotaCounted = true;
+      const rollbackQuotaCounters = () => {
+        if (!quotaCounted) return;
+        quotaCounted = false;
+        minuteUsed = Math.max(0, minuteUsed - 1);
+        dailyUsed = Math.max(0, dailyUsed - 1);
+      };
 
       try {
         let response: Response;
         try {
           response = await callUpstreamFreeProvider(config, parsed.data);
         } catch (cause) {
+          rollbackQuotaCounters();
           if (cause instanceof FreeAiError) throw cause;
           throw new FreeAiError(
             'upstream_error',
@@ -1530,6 +1534,7 @@
         }
 
         if (!response.ok) {
+          rollbackQuotaCounters();
           throw new FreeAiError(
             'upstream_error',
             `외부 무료 AI 서비스가 오류 상태(${response.status})를 반환했습니다. 유료 폴백 없이 중단되었으며 로컬 추천 엔진을 계속 사용할 수 있습니다.`,
```

---

### DEFECT-A4: `SequenceWorkbench.tsx` Missing `onSaveConditionTemplate` / `onApplyConditionTemplate` / `reusableBlocks` Props & False Preset Save Feedback

- **Root Cause**:
  1. In `src/components/SequenceWorkbench.tsx` (lines `1367-1389`), `<LazyFreeAiAssistantPanel>` is rendered without `onSaveConditionTemplate`, `onApplyConditionTemplate`, or `reusableBlocks`.
  2. In `src/components/FreeAiAssistantPanel.tsx` (`handleSavePreset`, lines `232-251`), `onSaveConditionTemplate?.(trimmed, criteria)` uses optional chaining and unconditionally sets `setActionFeedback("'...' 프리셋을 저장했습니다.")` even when `onSaveConditionTemplate` is `undefined`.
- **Minimal Patch Proposal**:
```diff
--- a/src/components/FreeAiAssistantPanel.tsx
+++ b/src/components/FreeAiAssistantPanel.tsx
@@ -245,6 +245,10 @@
       targetMinutes: draftMinutes,
       defaultLayer: draftLevel === '1.0' ? 'easy' : draftLevel === '2.0' ? 'hard' : 'standard',
     };
+    if (!onSaveConditionTemplate) {
+      setErrorBanner('프리셋 저장 기능이 현재 화면에 연결되어 있지 않습니다.');
+      return;
+    }
     onSaveConditionTemplate(trimmed, criteria);
     setNewPresetName('');
     setErrorBanner(null);
     setActionFeedback(`'${trimmed}' 프리셋을 저장했습니다.`);
```
```diff
--- a/src/components/SequenceWorkbench.tsx
+++ b/src/components/SequenceWorkbench.tsx
@@ -1371,6 +1371,13 @@
                 activeTargetMinutes={s.activeTargetMinutes}
                 activeApparatus={s.activeApparatus}
                 activeLevel={s.activeLevel}
+                onApplyConditionTemplate={(templateId) => s.applyConditionTemplate(templateId)}
+                onSaveConditionTemplate={(name, nextCriteria) => {
+                  s.setDraftCriteria(nextCriteria);
+                  s.saveConditionTemplate(name);
+                }}
                 onApplyDraftSequence={(payload) => {
```

---

## 4. Reproduction & Verification Commands

```bash
# Run Track A Vitest suite directly
pnpm exec vitest run scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx

# Run standalone Track A summary runner (table + JSON report)
node scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs
```
