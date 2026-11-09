> Track B B1/B2/B3의 아래 재현 상태는 과거 기록입니다. 현재 수정 및 검증 범위는 [2026-11-09 후속 보고](FOLLOWUP-20261109.md)를 확인하세요.

# Track B Audit Report — Prompt Data Minimization, Client Bundle Zero-Secret & Provider Error UX Regression

- **Workflow**: Gemini 4 Argon High · Dynamic 2-Track Parallel Audit (`2026-11-07`)
- **Track**: **Track B** (`프롬프트 데이터 최소화 · 클라이언트 bundle에 비밀 미포함 · provider 오류 UX 회귀 검사`)
- **Executable Test Suite**: `scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx` (`13 passed / 13 total`)
- **Standalone Audit Runner**: `scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs`

---

## 1. Prompt Data Minimization & Client Bundle Audit Table

### 1.1 Outgoing Prompt Payload Minimization (`FreeAiServerRequest`)

| Task (`task`) | Source Function / Schema | Fields Included in Outgoing Payload | Stripped / Excluded Fields | Boundary Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `class-draft` | `toReviewedExerciseCandidates` (`src/lib/freeAiClient.ts:345-361`) + `classDraftConditionsInputSchema` (`src/schemas/freeAiAssistantSchema.ts:249-261`) | `conditions` (`durationMinutes`, `theme`, `strengthenAreas`, `level`, `apparatus`, `availableEquipment?`, `preferredProps?`, `tempo?`, `templateId?`), `reviewedCatalog` (max 100 items: `id`, `nameKo`, `nameEn`, `apparatus`, `blockCategory`, `level`, `defaultDurationMin`, `bodyPosition?`, `spinalPlanes?`, `isReviewed: true`) | Unreviewed/stale exercises (`!isExerciseAutoEligible(ex)`), `youtube`, `cues`, `precautions`, `layers`, `springs`, `breathPattern`, `targetMuscles`, `props`, `requiredEquipment`, `review` (`reviewerAlias`, `reviewedAt`, `revision`), `createdAt`, `lastUsedAt`, `lastTaughtAt`, `historyLogs`, `classGroups` | **Partially Compliant — see `DEFECT-B1`** (`reviewedCatalog` up to 100 items is not filtered to apparatus/level before transmission and bypasses client-side PHI/BYOK guards) |
| `movement-idea` | `movementIdeaInputSchema` (`src/schemas/freeAiAssistantSchema.ts:263-275`) | `idea` (`rawIdeaText`, `baseExerciseName?`, `apparatus`, `blockCategory`, `strengthenArea`, `level`, `bodyPosition?`, `spinalPlane?`, `preferredProps?`) | Entire exercise catalog, reusable blocks, condition templates, teaching history logs, class groups | **Pass** (strictly scoped to user's single movement idea input; subject to `DEFECT-B2` regex coverage gaps) |
| `sequence-compose` | `toReviewedExerciseCandidates` + `toReviewedBlockCandidates` (`src/lib/freeAiClient.ts:345-426`) + `sequenceComposeInputSchema` (`src/schemas/freeAiAssistantSchema.ts:321-331`) | `compose` (`targetMinutes`, `level`, `apparatus`, `theme?`, `strengthenAreas`, `selectedExerciseIds`, `selectedBlockIds?`), `reviewedCatalog` (up to 100), `reviewedBlocks` (up to 30 blocks, up to 25 steps each including `step.instructorNote` up to 500 chars) | Unreviewed exercises (`!isExerciseAutoEligible`), unreviewed blocks (`block.isReviewed !== true`), exercise `youtube`/`cues`/`precautions`/`layers`/`review` | **Defect Reproduced (`DEFECT-B1`)**: sends unselected `reviewedBlocks` and unselected `reviewedCatalog` items, including free-text `step.instructorNote` (up to 500 chars), without running client-side `guardSensitiveHealthForExternalAi` or `guardByokAndEnv` on `reviewedBlocks`/`reviewedCatalog` |

### 1.2 Client Bundle (`dist/`) & Repository Zero-Secret Audit

| Audit Target | Scope Inspected | Secret / Endpoint / Boundary Patterns Checked | Findings | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Built Client Assets (`dist/**`) | `42` files in `dist/` (`dist/index.html`, `dist/sw.js`, `24` JS chunks in `dist/assets/*.js` including `FreeAiAssistantPanel-Bje6HTIn.js` and `freeAiAssistantSchema-B22aY7sA.js`, CSS/JSON/manifest files) | Google API Key (`AIza...`), OpenRouter API Key (`sk-or-v1-...`), OpenAI-style Key (`sk-...`), GitHub PAT (`ghp_...`, `github_pat_...`), AWS Key (`AKIA...`), PEM Private Key | `0` matches | **Pass** |
| Server-to-Client Bundle Isolation (`dist/assets/*.js` & `src/**`) | All `24` client JS chunks + all non-test `src/**/*.{ts,tsx}` source files | `https://generativelanguage.googleapis.com`, `https://openrouter.ai/api/v1/chat/completions`, `GEMINI_FREE_TIER_UNPAID_CONFIRMED`, `x-goog-api-key`, `from '...backend/...'` | `0` leaked server tokens / `0` backend imports in `src/**` | **Pass** (`backend/freeAiService.ts` is 100% isolated from the browser bundle) |
| Git-Tracked Files (`git ls-files`) | `628` tracked text/code/config files | All 7 secret key & private key regular expressions | `0` matches | **Pass** |
| Browser Env & UI Input Surface | `assertNoBrowserKeyExposure` (`src/lib/freeAiClient.ts:81-115`) & `FreeAiAssistantPanel.tsx` across all 3 tabs | `VITE_*`, `PUBLIC_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `input[type="password"]`, BYOK placeholders | `0` password/BYOK inputs in DOM; all forbidden env keys blocked | **Pass** |

---

## 2. Track B Verification Matrix (`Pass` / `Reproduced Defect` / `Unverified`)

| ID | Category | Verification Item | Status | Evidence (Test ID & File/Line Reference) |
| :--- | :--- | :--- | :--- | :--- |
| **TB-1A** | Prompt Data Minimization | `toReviewedExerciseCandidates` strips `youtube`, `cues`, `precautions`, `layers`, `review.reviewerAlias`, `createdAt`, `lastUsedAt`, `lastTaughtAt`, `springs`, `breathPattern` and excludes unreviewed/stale exercises | **Pass** | `1a` in `privacy-bundle-ux-regression.test.tsx` (`src/lib/freeAiClient.ts:345-361`) |
| **TB-1B** | Schema Strictness | `freeAiServerRequestSchema` (`.strict()`) and `createFreeAiService().assist` reject extra fields (`historyLogs`, `classGroups`, `memberHealthNotes`, `medicalHistory`, `patientNotes`, `diagnosis`, `instructorReflection`, `groupNotes`, `apiKey`) | **Pass** | `1b` in `privacy-bundle-ux-regression.test.tsx` (`src/schemas/freeAiAssistantSchema.ts:249-376`, `backend/freeAiService.ts:308-351`) |
| **TB-1C** | PHI/PII Blocking & Local Sanitization | `inspectSensitiveHealthText` & `inspectPayloadForSensitiveHealth` block all 6 known PHI/PII categories from external AI while allowing `preferLocalOnly: true` sanitized local execution | **Pass** | `1c` in `privacy-bundle-ux-regression.test.tsx` (`src/schemas/freeAiAssistantSchema.ts:141-239`, `src/utils/freeAiAssistantEngine.ts:526-531, 810-825`) |
| **TB-2A** | Client Bundle Zero-Secret | Zero API key literals or private keys across all `42` files in `dist/` and `628` files in `git ls-files` | **Pass** | `2a` in `privacy-bundle-ux-regression.test.tsx` |
| **TB-2B** | Server Endpoint Isolation | Zero upstream AI endpoints (`generativelanguage.googleapis.com`, `openrouter.ai/api/v1/chat/completions`) or server env tokens (`GEMINI_FREE_TIER_UNPAID_CONFIRMED`, `x-goog-api-key`) in `dist/assets/*.js` | **Pass** | `2b` in `privacy-bundle-ux-regression.test.tsx` |
| **TB-2C** | Browser Env Guard | `assertNoBrowserKeyExposure` and `detectByokOrSecretExposure` reject `VITE_*`, `PUBLIC_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`, `OPENAI_API_KEY`, and nested secret values | **Pass** | `2c` in `privacy-bundle-ux-regression.test.tsx` (`src/lib/freeAiClient.ts:75-115`) |
| **TB-2D** | Zero BYOK UI Surface | `FreeAiAssistantPanel` renders zero `input[type="password"]` or API-key/token/secret inputs across all 3 tabs | **Pass** | `2d` in `privacy-bundle-ux-regression.test.tsx` (`src/components/FreeAiAssistantPanel.tsx:555-1465`) |
| **TB-3A** | Provider Error UX (429 Exhausted) | `free_quota_exhausted` (429) across all 3 tabs renders `role="alert"` (`무료 사용량 소진 안내`), `data-testid="free-ai-renewal-info"` (`resetAt` + `resetTimezone`), disables external AI button, and keeps local engine button functional | **Pass** | `3a` in `privacy-bundle-ux-regression.test.tsx` (`src/components/FreeAiAssistantPanel.tsx:593-615, 824-848, 1017-1041, 1367-1391`) |
| **TB-3B** | Provider Error UX (400 Health Block) | `sensitive_health_blocked` (400) across all 3 tabs renders immediate warning banner, disables external AI button, and allows sanitized local rule execution | **Pass** | `3b` in `privacy-bundle-ux-regression.test.tsx` (`src/components/FreeAiAssistantPanel.tsx:256-259, 303-306, 344-347`) |
| **TB-3C** | Provider Error UX (400/429/502) | `byok_forbidden` (400), `concurrency_limit_exceeded` (429), `upstream_error` (502), and `invalid_ai_response` (502) handled without unhandled rejections | **Pass** | `3c` in `privacy-bundle-ux-regression.test.tsx` (`backend/freeAiService.ts:1396-1579`, `src/lib/freeAiClient.ts:680-788`) |
| **DEFECT-B1** | Prompt Minimization & Client Guard Bypass | `requestClassDraft` / `requestSequenceCompose` and `FreeAiAssistantPanel` inspect only `input` / `composeTheme` (not `reviewedCatalog` or `reviewedBlocks`), and send unselected `reviewedBlocks` with free-text `step.instructorNote` to `transport.postAssist` | **Reproduced Defect (HIGH)** | `DEFECT-B1` in `privacy-bundle-ux-regression.test.tsx` (`src/lib/freeAiClient.ts:363-426, 871-888, 930-950`, `src/components/FreeAiAssistantPanel.tsx:201-204`) |
| **DEFECT-B2** | Array Key Stripping & PHI Regex Gaps | `stripForbiddenKeyFields` skips arrays (`!Array.isArray(value)`), and `inspectSensitiveHealthText` misses realistic Korean member names (`김민지 회원`, `박서연님`), postpartum weeks (`출산 8주차`, `복직근 이개`), and general pain (`허리 통증`, `무릎 통증`, `어깨 충돌증후군`) | **Reproduced Defect (MEDIUM)** | `DEFECT-B2` in `privacy-bundle-ux-regression.test.tsx` (`src/schemas/freeAiAssistantSchema.ts:121-172`, `src/utils/freeAiAssistantEngine.ts:16-47`) |
| **DEFECT-B3** | Provider Error UX & Paid-Model Fallback | 502 error displays error alert while header badge/status banner simultaneously claim `'무료 AI 연결됨'` / `'무료 전용 AI 사용 가능'`; tab switch does not clear stale `actionFeedback`; `invalid_paid_model_blocked` throws `request_failed` instead of local fallback | **Reproduced Defect (MEDIUM)** | `DEFECT-B3` in `privacy-bundle-ux-regression.test.tsx` (`src/components/FreeAiAssistantPanel.tsx:576-639, 664-691`, `src/lib/freeAiClient.ts:625-646, 693-715`) |
| **TB-LIVE** | Live External Network Quota Reset | Real network call against live Google Gemini / OpenRouter production endpoints | **Unverified (By Policy)** | Strictly prohibited by Zero-Network / Zero-Real-Key audit constraint; verified deterministically via injected `fetchFn` and `FreeAiTransport` mocks |

---

## 3. Root-Cause Analysis & Minimal Patch Diffs for Reproduced Defects

### 3.1 `DEFECT-B1` (HIGH): Client Guard Bypass & Over-Sharing on `reviewedBlocks` / `reviewedCatalog`

#### Root Cause
1. In `src/lib/freeAiClient.ts`:
   - `requestClassDraft` (lines `871-888`) and `requestSequenceCompose` (lines `930-950`) execute `guardByokAndEnv(input)` and `guardSensitiveHealthForExternalAi(input)` **only on `input`**, before building `reviewedCatalog` and `reviewedBlocks`. They never validate the full outgoing `serverRequest` against `guardByokAndEnv(serverRequest)` or `guardSensitiveHealthForExternalAi(serverRequest)`.
   - `toReviewedBlockCandidates(reusableBlocks, exercises)` (lines `363-426`) takes the first 30 reviewed blocks from `reusableBlocks` **without filtering to `input.selectedBlockIds`** and copies each step's free-text `step.instructorNote` (up to 500 chars, lines `402-404`) into the outgoing payload.
2. In `src/components/FreeAiAssistantPanel.tsx`:
   - `composeHealthInspection` (lines `201-204`) inspects only `composeTheme`, ignoring the selected `reusableBlocks` and `exercises`.
   - Consequently, if any `reusableBlocks` item (even an unselected block!) contains member PHI/PII or an accidental secret in `step.instructorNote` or `title`, the UI shows no warning, the primary external AI button stays enabled, and `freeAiClient.requestSequenceCompose` transmits the sensitive `instructorNote` over the network to `transport.postAssist(serverRequest)`.

#### Minimal Patch Proposal
```diff
--- a/src/lib/freeAiClient.ts
+++ b/src/lib/freeAiClient.ts
@@ -363,9 +363,14 @@
 function toReviewedBlockCandidates(
   blocks: readonly P1ReusableBlockContract[],
   exercises: readonly PilatesExercise[],
+  selectedBlockIds?: readonly string[],
 ) {
   const exercisesMap = new Map(exercises.map((ex) => [ex.id, ex]));
+  const selectedSet = selectedBlockIds ? new Set(selectedBlockIds) : null;
 
   return blocks
-    .filter((block) => block.isReviewed === true)
+    .filter(
+      (block) =>
+        block.isReviewed === true && (!selectedSet || selectedSet.has(block.id)),
+    )
     .slice(0, 30)
     .map((block) => {
@@ -401,7 +406,10 @@
             selectedLayer: step.selectedLayer ?? defaultLayer,
-            ...(step.instructorNote
-              ? { instructorNote: step.instructorNote.slice(0, 500) }
+            ...(step.instructorNote
+              ? {
+                  instructorNote: inspectSensitiveHealthText(step.instructorNote)
+                    .sanitizedText.slice(0, 500),
+                }
               : {}),
           };
         });
@@ -874,6 +882,12 @@
       const reviewedCatalog = toReviewedExerciseCandidates(exercises);
+      const serverRequest: FreeAiServerRequest = {
+        task: 'class-draft',
+        conditions: input,
+        reviewedCatalog,
+      };
+      guardByokAndEnv(serverRequest);
+      if (!requestOptions?.preferLocalOnly) {
+        guardSensitiveHealthForExternalAi(serverRequest);
+      }
 
       return executeExternalOrFallback<EditableClassDraftResult>({
         task: 'class-draft',
@@ -881,11 +895,7 @@
           conditions: input,
           reviewedIds: reviewedCatalog.map((item) => item.id),
         },
-        buildServerRequest: () => ({
-          task: 'class-draft',
-          conditions: input,
-          reviewedCatalog,
-        }),
+        buildServerRequest: () => serverRequest,
         runLocalFallback: () =>
           buildLocalClassDraft(input, exercises, conditionTemplates),
         preferLocalOnly: requestOptions?.preferLocalOnly,
@@ -932,8 +942,18 @@
       const reviewedCatalog = toReviewedExerciseCandidates(exercises);
-      const reviewedBlocks = toReviewedBlockCandidates(reusableBlocks, exercises);
+      const reviewedBlocks = toReviewedBlockCandidates(
+        reusableBlocks,
+        exercises,
+        input.selectedBlockIds,
+      );
+      const serverRequest: FreeAiServerRequest = {
+        task: 'sequence-compose',
+        compose: input,
+        reviewedCatalog,
+        ...(reviewedBlocks.length > 0 ? { reviewedBlocks } : {}),
+      };
+      guardByokAndEnv(serverRequest);
+      if (!requestOptions?.preferLocalOnly) {
+        guardSensitiveHealthForExternalAi(serverRequest);
+      }
```

---

### 3.2 `DEFECT-B2` (MEDIUM): `stripForbiddenKeyFields` Array Skip & `inspectSensitiveHealthText` PHI/PII Pattern Gaps

#### Root Cause
1. `stripForbiddenKeyFields` (`src/schemas/freeAiAssistantSchema.ts:121-134`) checks `if (value && typeof value === 'object' && !Array.isArray(value))` and otherwise assigns `clone[key] = value`. Any array of objects (e.g., `steps`, `reviewedCatalog`, `reviewedBlocks`) is copied verbatim without stripping forbidden key fields (`apiKey`, `VITE_OPENROUTER_API_KEY`, etc.) inside array elements.
2. `SENSITIVE_HEALTH_PATTERNS` (`src/schemas/freeAiAssistantSchema.ts:141-172` and `src/utils/freeAiAssistantEngine.ts:16-47`) only checks literal `'회원 실명'|'환자 이름'`, `'출산 직후'|'복직근 이개 진단'`, and `'급성 통증'|'심한 통증'|'통증 호소'`. Realistic Korean instructor inputs explicitly warned against in the panel disclaimer (`FreeAiAssistantPanel.tsx:646`)—such as `'김민지 회원(34세) 출산 8주차 복직근 이개 및 허리 통증 완화'` or `'박서연님 무릎 통증·어깨 충돌증후군 주의'`—return `hasSensitiveData: false`.

#### Minimal Patch Proposal
```diff
--- a/src/schemas/freeAiAssistantSchema.ts
+++ b/src/schemas/freeAiAssistantSchema.ts
@@ -124,7 +124,13 @@
     if (FORBIDDEN_SECRET_FIELD_PATTERN.test(key) || /^VITE_.*(?:KEY|TOKEN|SECRET)/i.test(key)) {
       continue;
     }
-    if (value && typeof value === 'object' && !Array.isArray(value)) {
+    if (Array.isArray(value)) {
+      clone[key] = value.map((item) =>
+        item && typeof item === 'object' && !Array.isArray(item)
+          ? stripForbiddenKeyFields(item as Record<string, unknown>)
+          : item,
+      );
+    } else if (value && typeof value === 'object') {
       clone[key] = stripForbiddenKeyFields(value as Record<string, unknown>);
     } else {
       clone[key] = value;
@@ -142,7 +148,7 @@
   {
     label: '척추·관절 질환/진단명',
     regex:
-      /디스크|추간판\s*탈출|척추관\s*협착|협착증|전방\s*전위증|척추\s*분리증|골절|파열|오십견|회전근개\s*파열|관절염|류마티스|골다공증|측만증|herniated\s*disc|spinal\s*stenosis|fracture|scoliosis|osteoarthritis|osteoporosis/i,
+      /디스크|추간판\s*탈출|척추관\s*협착|협착증|전방\s*전위증|척추\s*분리증|골절|파열|오십견|회전근개\s*파열|충돌\s*증후군|관절염|류마티스|골다공증|측만증|herniated\s*disc|spinal\s*stenosis|fracture|scoliosis|osteoarthritis|osteoporosis/i,
   },
@@ -152,17 +158,17 @@
   {
     label: '임신·산전·산후 건강상태',
     regex:
-      /임신\s*\d*주|임산부|산모|출산\s*직후|제왕절개|유산|복직근\s*이개\s*진단|pregnant|pregnancy|trimester|postpartum\s*patient|c-section/i,
+      /임신\s*\d*주|임산부|산모|출산\s*(?:직후|\d+\s*(?:주|개월|일)차?)|산후\s*\d*\s*(?:주|개월|일)?|제왕절개|유산|복직근\s*이개|pregnant|pregnancy|trimester|postpartum|c-section/i,
   },
   {
     label: '급성 통증·신경학적 증상',
     regex:
-      /방사통|신경통|저림\s*증상|마비|감각\s*저하|배뇨\s*장애|배변\s*장애|어지럼증|실신|급성\s*통증|심한\s*통증|통증\s*호소|sciatica|numbness|paralysis|acute\s*pain|chronic\s*pain/i,
+      /방사통|신경통|저림\s*증상|마비|감각\s*저하|배뇨\s*장애|배변\s*장애|어지럼증|실신|(?:급성|심한|만성|허리|요추|경추|목|어깨|무릎|고관절|손목|발목)\s*통증|통증\s*(?:호소|완화|관리)|sciatica|numbness|paralysis|acute\s*pain|chronic\s*pain/i,
   },
@@ -167,5 +173,5 @@
   {
     label: '개인 식별 정보(연락처·이메일·주민번호)',
     regex:
-      /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)|(?:회원\s*실명|환자\s*이름|차트\s*번호|병록\s*번호)/i,
+      /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)|(?:회원\s*실명|환자\s*이름|차트\s*번호|병록\s*번호)|(?:[가-힣]{2,4}\s*(?:회원님?|환자분?|님)\s*(?:\(\d{1,3}세\))?)/i,
   },
 ];
```
*(Apply the identical `SENSITIVE_HEALTH_PATTERNS` update to `src/utils/freeAiAssistantEngine.ts:16-47` and `backend/freeAiService.ts:105-136`.)*

---

### 3.3 `DEFECT-B3` (MEDIUM): Provider Error UX Contradictions & `invalid_paid_model_blocked` Non-Fallback

#### Root Cause
1. **Contradictory Ready Badge/Banner During 502 Failure (`src/components/FreeAiAssistantPanel.tsx:576-639`)**: When `quotaStatus.enabled === true` (`reason: 'ready'`) and an `upstream_error` (502) or `invalid_ai_response` (502) occurs, `errorBanner` is set, but `quotaStatus.enabled` remains `true` and `quotaStatus.exhausted` remains `false`. The header badge renders `'무료 AI 연결됨 (gemini-free)'` and the top status banner simultaneously renders `'무료 전용 AI 사용 가능'` right above the 502 error alert.
2. **Stale `actionFeedback` Across Tab Switches (`src/components/FreeAiAssistantPanel.tsx:664-691`)**: Clicking a tab button calls `setErrorBanner(null)` but omits `setActionFeedback(null)`, leaving Tab 1's success banner visible when the user switches to Tab 2 or Tab 3.
3. **Non-Fallback on `invalid_paid_model_blocked` (`src/lib/freeAiClient.ts:625-646, 693-715`)**: `executeExternalOrFallback` falls back to `runLocalFallback()` when `reason === 'unconfigured' || reason === 'billing_guard_unconfirmed'`, but omits `reason === 'invalid_paid_model_blocked'` (and `details.code === 'invalid_paid_model_blocked'`). When a paid model is blocked by the server policy guard (`enabled: false`), the client throws `FreeAiClientError('request_failed')` instead of degrading gracefully to the local rule engine.

#### Minimal Patch Proposal
```diff
--- a/src/lib/freeAiClient.ts
+++ b/src/lib/freeAiClient.ts
@@ -626,7 +626,8 @@
         response.status &&
         !response.status.enabled &&
         (response.status.reason === 'unconfigured' ||
-          response.status.reason === 'billing_guard_unconfirmed')
+          response.status.reason === 'billing_guard_unconfirmed' ||
+          response.status.reason === 'invalid_paid_model_blocked')
       ) {
         serverKnownUnconfigured = true;
         currentStatus = createDefaultFreeAiStatus({
@@ -693,9 +694,11 @@
         details.isLocalSdkUnavailable ||
         details.code === 'unconfigured' ||
         details.code === 'billing_guard_unconfirmed' ||
+        details.code === 'invalid_paid_model_blocked' ||
         details.status?.reason === 'unconfigured' ||
-        details.status?.reason === 'billing_guard_unconfirmed'
+        details.status?.reason === 'billing_guard_unconfirmed' ||
+        details.status?.reason === 'invalid_paid_model_blocked'
       ) {
         serverKnownUnconfigured = true;
```

```diff
--- a/src/components/FreeAiAssistantPanel.tsx
+++ b/src/components/FreeAiAssistantPanel.tsx
@@ -664,6 +664,7 @@
           onClick={() => {
             setActiveTab('class-draft');
             setErrorBanner(null);
+            setActionFeedback(null);
           }}
         >
           1. 수업 초안 만들기
@@ -676,6 +677,7 @@
           onClick={() => {
             setActiveTab('movement-idea');
             setErrorBanner(null);
+            setActionFeedback(null);
           }}
         >
           2. 새 동작 아이디어·변형
@@ -688,6 +690,7 @@
           onClick={() => {
             setActiveTab('sequence-compose');
             setErrorBanner(null);
+            setActionFeedback(null);
           }}
         >
           3. 검토 동작·블록 시퀀스 구성
```

---

## 4. How to Re-Run Track B Verification

```bash
# Run standalone Track B audit runner (static dist/ + git ls-files scan + Vitest suite)
node scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs

# Run Track B Vitest suite directly
pnpm vitest run scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx
```
