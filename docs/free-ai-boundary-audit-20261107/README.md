> Track B B1/B2/B3의 아래 재현 상태는 과거 기록입니다. 현재 수정 및 검증 범위는 [2026-11-09 후속 보고](track-b/FOLLOWUP-20261109.md)를 확인하세요.

# Pilates 무료 전용 AI 과금 방지 및 개인정보 경계 2-Track 병렬 모의 감사 보고서 (`2026-11-07`)

- **감사 워크플로우**: `Gemini 4 Argon High · 다이나믹 워크플로우 2트랙 병렬 (Track A + Track B)`
- **변경 격리 원칙**: 기존 AI 구현(`src/**`, `backend/**`) 및 공유 설정(`package.json`, `vite.config.ts`, `vitest.config.ts` 등) **100% READ-ONLY 유지**. 신규 산출물은 독점 경로 `scripts/free-ai-boundary-audit-20261107/**` 및 `docs/free-ai-boundary-audit-20261107/**` 하위에만 트랙별로 분리 배치.
- **보안·비용·프라이버시 원칙**: `.env*`/인증 파일/실제 API 키/실제 회원 의료정보 열람·출력 0건, 외부 실시간 AI 네트워크 호출·과금·새 키 발급·권한 확대 0건(인메모리 `fetchFn` 및 `FreeAiTransport` 네트워크 모의 더블과 런타임 동적 조합 합성 픽스처만 사용).

---

## 1. 트랙별 산출물 구조

| 구분 | 스크립트 / 테스트 경로 | 문서 경로 | 검증 범위 요약 |
| :--- | :--- | :--- | :--- |
| **통합 (Unified)** | [`scripts/free-ai-boundary-audit-20261107/run-all-audits.mjs`](../../scripts/free-ai-boundary-audit-20261107/run-all-audits.mjs) | [`docs/free-ai-boundary-audit-20261107/README.md`](./README.md) | Track A + Track B + 기존 스키마/시크릿 스캔 통합 실행 및 기존 파일 Read-Only 무결성 검증 |
| **Track A** | [`scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx`](../../scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx)<br>[`scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs`](../../scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs) | [`docs/free-ai-boundary-audit-20261107/track-a/README.md`](./track-a/README.md) | 무료 쿼터 소진 / HTTP `429` / HTTP `401` / `Timeout` / `Offline` 5대 장애 시 AI 격리, 유료 모델·유료 도구 차단, 일반 워크벤치·수업 저장(`usePilatesStore`) 생존 검증 (`14/14 PASS`) |
| **Track B** | [`scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx`](../../scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx)<br>[`scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs`](../../scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs) | [`docs/free-ai-boundary-audit-20261107/track-b/README.md`](./track-b/README.md) | 프롬프트 데이터 최소화, 프로덕션 번들(`dist/`) 및 `git ls-files` 비밀 미포함, Provider 오류 UX 회귀 검사 (`13/13 PASS`) |

---

## 2. 현재 구현 상태 vs 미구현 기능 구분 (Honest Feature Boundary)

기능이 없거나 로컬 전용인 모듈을 외부 AI 연결 기능인 것처럼 가장하지 않고, 실제 코드베이스 기준 구현 상태를 아래와 같이 명확히 구분합니다.

| 모듈 / 기능 영역 | 관련 소스 파일 | 실제 구현 상태 구분 | 외부 AI 호출 여부 |
| :--- | :--- | :--- | :--- |
| **AI 시퀀스 코파일럿 (`AiSequenceCoPilotPanel`)** | `src/components/AiSequenceCoPilotPanel.tsx`<br>`src/services/geminiSequenceAi.ts` | **로컬 규칙 전용 엔진 (`engineSource: 'local-rules'`)**. 파일명만 `geminiSequenceAi.ts`일 뿐 네트워크 `fetch`나 외부 LLM 호출 코드가 전혀 없음. `'외부 AI 생성 · 무료 서버 연결 대기'` 버튼은 상시 `disabled` 상태이며 `'외부 AI 생성은 아직 연결되지 않았습니다.'` 배너를 표시함. | **미구현 (100% 로컬 규칙)** |
| **정적/로컬 `@appdeploy/client` 어댑터** | `src/lib/localAppDeploy.ts`<br>(`vite.config.ts`, `vitest.config.ts` alias) | **로컬 스텁 어댑터**. `api.get` 및 `api.post` 호출 시 항상 `{ code: 'local_api_unavailable' }` 에러로 reject하며, `freeAiClient`는 이를 감지해 즉시 로컬 규칙 엔진(`local-rule-engine`)으로 폴백함. | **정적 빌드에서 외부 연결 없음** |
| **무료 전용 AI 보조 패널 (`FreeAiAssistantPanel` + `freeAiClient`)** | `src/components/FreeAiAssistantPanel.tsx`<br>`src/lib/freeAiClient.ts`<br>`src/utils/freeAiAssistantEngine.ts` | **구현 완료 (서버 라우트 + 로컬 규칙 이중 엔진)**. 3개 탭(`1. 수업 초안 만들기`, `2. 새 동작 아이디어·변형`, `3. 검토 동작·블록 시퀀스 구성`)에서 외부 무료 AI 버튼과 로컬 규칙 추천 버튼을 분리 제공하며, 결과 인라인 편집 후 워크벤치 반영 지원. | **조건부 (`FreeAiTransport` 주입 또는 서버 연결 시)** |
| **무료 전용 AI 서버 핸들러 (`freeAiService`)** | `backend/freeAiService.ts`<br>`backend/index.ts` | **구현 완료 (`GET /api/studio/ai/status`, `POST /api/studio/ai/assist`)**. 무료 모델 화이트리스트(`GEMINI_FREE_TIER_MODELS`, `:free`/`openrouter/free`), `GEMINI_FREE_TIER_UNPAID_CONFIRMED=true` 가드, OpenRouter `max_price=0` & `allow_fallbacks=false`, 분당/일일 인메모리 쿼터 및 `PT`/`UTC` 갱신 시각 계산 구현. | **서버 전용 (서버 환경변수 설정 시에만 활성)** |
| **런타임 장애(`429`/`401`/`Timeout`/`Offline`) 시 자동 로컬 폴백** | `src/lib/freeAiClient.ts` | **미구현 (수동 버튼 클릭 필요)**. `local_api_unavailable`, `unconfigured`, `billing_guard_unconfirmed` 상태에서만 자동 로컬 폴백이 수행되며, 런타임 `429`/`401`/`Timeout`/`Offline` 및 `invalid_paid_model_blocked` 발생 시에는 `FreeAiClientError`를 throw하고 사용자가 직접 보조 버튼(`로컬 조건 추천으로 초안 만들기` 등)을 눌러야 함. | **자동 폴백 미구현** |
| **영구(Persistent) 분산 쿼터 저장소** | `backend/freeAiService.ts` | **미구현 (프로세스 인메모리 카운터)**. `minuteUsed`/`dailyUsed`와 60초 응답 캐시가 프로세스 메모리에만 저장되며, 서버 콜드 스타트/재시작 시 카운터가 초기화됨(단, 업스트림 `429`/`402` 수신 시 즉시 차단됨). | **인메모리 한정** |

---

## 3. 통합 검증 결과 표 (통과 / 결함 재현 / 미검증 표)

| 트랙 / ID | 검증 항목 | 판정 | 실행 테스트 케이스 | 비고 및 근거 |
| :--- | :--- | :---: | :--- | :--- |
| **Track A / A-01** | `AiSequenceCoPilotPanel` 및 `generateAiThematicSequence`가 외부 네트워크 호출 없이 100% 로컬 규칙으로만 동작 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`1.1`) | `fetch` 호출 `0회`, `engineSource: 'local-rules'`, 외부 AI 버튼 `disabled` 확인 |
| **Track A / A-02** | `localAppDeploy` (`@appdeploy/client`) `local_api_unavailable` 반환 시 `freeAiClient`가 즉시 `local-rule-engine`으로 폴백 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`1.2`) | `usedLocalFallback: true`, `provider: 'none'` 확인 |
| **Track A / A-03** | 유료/은퇴 모델(`gemini-4-argon`, `gemini-3.8-pro`, `gemini-3.1-pro-preview`, `gemini-2.0-flash`, 비-`:free` OpenRouter) 및 `GEMINI_FREE_TIER_UNPAID_CONFIRMED !== 'true'` 원천 차단 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`2.1`) | `invalid_paid_model_blocked` / `billing_guard_unconfirmed`, `apiKey: null` 확인 |
| **Track A / A-04** | OpenRouter `{ allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } }` 강제 및 Gemini 유료 Grounding `tools` 미포함 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`2.2`) | 업스트림 `fetchFn` 요청 JSON 페이로드 직접 검증 |
| **Track A / A-05** | 분당/일일 쿼터 소진 및 업스트림 `429`/`402` 수신 시 `free_quota_exhausted` 잠금 + `America/Los_Angeles`(`00:00 PT`) / `UTC`(`00:00 UTC`) 갱신 시각 계산 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`2.3`) | 한도 소진 후 추가 업스트림 호출 `0회`, 유료 폴백 `0회` |
| **Track A / A-06** | **5대 장애(`free_quota_exhausted`, `429`, `401`, `Timeout`, `Offline`)** 상태에서 로컬 AI 폴백(`preferLocalOnly: true`) 및 일반 수업 생성·편집·바인더 저장·수업 기록·백업/복원(`usePilatesStore`) 100% 생존 | **통과 (PASS)** | `quota-fallback-survival.test.tsx` (`3.1`–`3.5`) | 5개 장애 시나리오 전수에서 시퀀스 저장(`seq-*`), 프리셋 저장, 수업 로그 기록, 백업/복원 무결성 통과 |
| **Track B / B-1a** | `toReviewedExerciseCandidates`가 허용된 10개 메타데이터 필드만 추출하고 미검토/개정 불일치 동작 및 내부 필드(`youtube`, `cues`, `precautions`, `review.reviewerAlias` 등) 제거 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`1a`) | 직렬화 페이로드 내 내부 메모·유튜브 URL·검토자 별칭 `0건` |
| **Track B / B-1b** | `freeAiServerRequestSchema` (`.strict()`)가 `historyLogs`, `classGroups`, `memberHealthNotes`, `diagnosis`, `apiKey` 등 비허용 필드를 100% 거부 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`1b`) | 11개 비허용 확장 페이로드 전수 거부 |
| **Track B / B-1c** | 6대 민감 건강/개인식별 카테고리 감지 시 외부 전송 차단(`sensitive_health_blocked`) 및 로컬 전용 실행(`preferLocalOnly: true`) 시 마스킹 처리 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`1c`) | 외부 `postAssist` 호출 `0회`, 로컬 결과 내 민감어 마스킹 확인 |
| **Track B / B-2a** | 프로덕션 빌드 산출물(`dist/` 40개 파일) 및 `git ls-files` 전체에 실제/합성 API 키 리터럴 및 개인키 미포함 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`2a`) | `AIza*`, `sk-or-v1-*`, `sk-*`, `ghp_*`, `github_pat_*`, `AKIA*`, PEM 개인키 `0건` |
| **Track B / B-2b** | 클라이언트 번들(`dist/assets/*.js`) 및 `src/**`에 서버 전용 엔드포인트(`generativelanguage.googleapis.com`, `openrouter.ai`) 및 `GEMINI_FREE_TIER_UNPAID_CONFIRMED`, `x-goog-api-key` 미포함 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`2b`) | 클라이언트-백엔드 번들 경계 침범 `0건` |
| **Track B / B-2c** | `assertNoBrowserKeyExposure` 및 `detectByokOrSecretExposure`가 `VITE_*`, `PUBLIC_*`, `OPENAI_API_KEY` 및 중첩 객체 내 합성 키를 차단 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`2c`) | 12개 금지 환경변수 키 및 3종 합성 시크릿 값 차단 확인 |
| **Track B / B-2d** | `FreeAiAssistantPanel` 3개 탭 전체에 `input[type="password"]` 또는 API 키/토큰/BYOK 입력 컨트롤이 존재하지 않음 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`2d`) | 전 탭 DOM 컨트롤 속성 전수 스캔 통과 |
| **Track B / B-3a** | `free_quota_exhausted` (`429`) 발생 시 경고 배너, `resetAt`/`resetTimezone` 표시, 3개 탭 외부 AI 버튼 비활성화 및 로컬 엔진 정상 동작 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`3a`) | 3개 탭 전환 및 로컬 생성·편집 정상 동작 확인 |
| **Track B / B-3b** | 3개 탭 민감 건강정보 입력 시 즉시 경고 배너 노출, 외부 AI 버튼 비활성화, 로컬 마스킹 실행 허용 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`3b`) | `postAssist` 호출 `0회` 확인 |
| **Track B / B-3c** | `byok_forbidden` (`400`), `concurrency_limit_exceeded` (`429`), `upstream_error` (`502`), `invalid_ai_response` (`502`) 예외 격리 | **통과 (PASS)** | `privacy-bundle-ux-regression.test.tsx` (`3c`) | 앱 크래시 없음 및 에러 코드 정확성 확인 |
| **Track A / DEFECT-A1** | 업스트림 `fetchFn` 호출 시 `AbortSignal` 타임아웃 미설정 + 외부 요청 지연 시 `isLoading=true`로 인해 로컬 폴백 버튼까지 `disabled` 잠김 | **결함 재현 (REPRODUCED)** | `quota-fallback-survival.test.tsx` (`4.1 DEFECT-A1`) | `backend/freeAiService.ts:1332-1384`, `FreeAiAssistantPanel.tsx:840-847` |
| **Track A / DEFECT-A2** | HTTP `401` / `Timeout` / `Offline` 오류 발생 후에도 `quotaStatus.enabled === true` (`reason: 'ready'`)가 유지되어 `'무료 AI 연결됨'` 배지와 외부 AI 버튼이 비활성화되지 않음 | **결함 재현 (REPRODUCED)** | `quota-fallback-survival.test.tsx` (`4.2 DEFECT-A2`) | `src/lib/freeAiClient.ts:781-858` |
| **Track A / DEFECT-A3** | `backend/freeAiService.ts`가 업스트림 호출 전에 `minuteUsed`/`dailyUsed`를 선증가시키고 네트워크/401/500/503 실패 시 롤백하지 않아 무료 쿼터가 조기 소진됨 | **결함 재현 (REPRODUCED)** | `quota-fallback-survival.test.tsx` (`4.3 DEFECT-A3`) | `backend/freeAiService.ts:1489-1538` |
| **Track A / DEFECT-A4** | `SequenceWorkbench.tsx`에서 `onSaveConditionTemplate`·`onApplyConditionTemplate`·`reusableBlocks` prop 전달 누락 + `FreeAiAssistantPanel.tsx`가 미연결 상태에서도 허위 저장 성공 배너 노출 | **결함 재현 (REPRODUCED)** | `quota-fallback-survival.test.tsx` (`4.4 DEFECT-A4`) | `src/components/SequenceWorkbench.tsx:1367-1389`, `FreeAiAssistantPanel.tsx:232-251` |
| **Track B / DEFECT-B1** | `requestSequenceCompose` 및 `FreeAiAssistantPanel`이 `reviewedBlocks`/`reviewedCatalog`에 대해 민감정보·BYOK 가드를 생략하고, 선택되지 않은 블록(`selectedBlockIds` 미포함)과 `step.instructorNote` 자유 텍스트를 외부 요청에 포함 | **결함 재현 (REPRODUCED)** | `privacy-bundle-ux-regression.test.tsx` (`4. DEFECT-B1`) | `src/lib/freeAiClient.ts:363-426, 930-965`, `FreeAiAssistantPanel.tsx:201-204` |
| **Track B / DEFECT-B2** | `stripForbiddenKeyFields`가 배열(`Array.isArray`) 내부 원소를 순회하지 않아 `steps[0].apiKey`가 잔류하며, `inspectSensitiveHealthText`가 현실적인 회원명(`김민지 회원(34세)`), 산후 주수(`출산 8주차`, `복직근 이개`), 일반 통증(`허리 통증`, `무릎 통증`, `어깨 충돌증후군`)을 미탐지 | **결함 재현 (REPRODUCED)** | `privacy-bundle-ux-regression.test.tsx` (`4. DEFECT-B2`) | `src/schemas/freeAiAssistantSchema.ts:121-172` |
| **Track B / DEFECT-B3** | `502` (`upstream_error`/`invalid_ai_response`) 에러 배너와 `'무료 AI 연결됨'`/`'무료 전용 AI 사용 가능'` 배너 동시 노출, 탭 전환 시 이전 탭 `actionFeedback` 잔류, `invalid_paid_model_blocked` 수신 시 로컬 자동 폴백 미수행 | **결함 재현 (REPRODUCED)** | `privacy-bundle-ux-regression.test.tsx` (`4. DEFECT-B3`) | `FreeAiAssistantPanel.tsx:576-691`, `src/lib/freeAiClient.ts:625-715` |
| **공통 / U-01** | 실제 클라우드 배포 환경(`@appdeploy/sdk`) 및 실 Google Gemini / OpenRouter 서버 대상 라이브 네트워크 호출 | **미검증 (UNVERIFIED — 정책상 금지)** | N/A (모의 `fetchFn` 및 `FreeAiTransport`로 대체) | 사용자 지침상 실제 API 키 사용·외부 AI 호출·과금·배포가 엄격히 금지되어 모의 계층으로 검증 완료 |

---

## 4. 발견된 결함(7건) 요약 및 최소 패치 제안 (Minimal Patch Diffs)

> 상세 분석은 [`docs/free-ai-boundary-audit-20261107/track-a/README.md`](./track-a/README.md) 및 [`docs/free-ai-boundary-audit-20261107/track-b/README.md`](./track-b/README.md)에 수록되어 있으며, 아래는 핵심 원인 및 최소 패치 요약입니다.

### 4.1 Track A 결함 (`DEFECT-A1` ~ `DEFECT-A4`)

1. **`DEFECT-A1` (`backend/freeAiService.ts:1332-1384`, `src/components/FreeAiAssistantPanel.tsx:840-847, 1033-1040, 1383-1390`)**
   - **원인**: 업스트림 `fetchFn`에 `AbortSignal.timeout(...)`이 없고, 외부 AI 호출 대기 중(`isLoading === true`) 보조 로컬 추천 버튼까지 `disabled={isLoading}`로 잠겨 사용자가 로컬 엔진으로 즉시 전환할 수 없음.
   - **최소 패치**: `callUpstreamFreeProvider`의 `fetchFn` 옵션에 `signal: AbortSignal.timeout(15_000)`을 추가하고, `FreeAiAssistantPanel.tsx`의 로컬 규칙 보조 버튼 3개에서 `disabled={isLoading}`를 제거(또는 외부 요청 취소 후 로컬 실행).

2. **`DEFECT-A2` (`src/lib/freeAiClient.ts:781-787, 835-858`)**
   - **원인**: `postAssist` 또는 `refreshQuotaStatus`에서 HTTP `401`, `AbortError`(`ETIMEDOUT`), `TypeError: Failed to fetch`(오프라인) 발생 시 `currentStatus.enabled`가 `true`(`reason: 'ready'`)로 남아 UI가 계속 `'무료 AI 연결됨'`을 표시함.
   - **최소 패치**: 비-429 통신/인증 실패 시 `currentStatus`를 `{ ...currentStatus, enabled: false, exhausted: false, reason: 'unconfigured' }`로 전환하여 외부 AI 버튼을 비활성화하고 로컬 전용 모드로 안내.

3. **`DEFECT-A3` (`backend/freeAiService.ts:1489-1538`)**
   - **원인**: `callUpstreamFreeProvider` 호출 전에 `minuteUsed += 1; dailyUsed += 1;`를 수행하고, 업스트림 네트워크 오류나 HTTP `401`/`500`/`503` 실패 시 카운터를 감산(rollback)하지 않아 실패한 요청이 무료 쿼터를 소진시킴.
   - **최소 패치**: 업스트림 네트워크 예외 및 비정상 응답(`!response.ok`, `429`/`402` 제외) 분기에서 `minuteUsed = Math.max(0, minuteUsed - 1); dailyUsed = Math.max(0, dailyUsed - 1);` 롤백 수행.

4. **`DEFECT-A4` (`src/components/SequenceWorkbench.tsx:1367-1389`, `src/components/FreeAiAssistantPanel.tsx:232-251`)**
   - **원인**: `SequenceWorkbench.tsx`가 `<LazyFreeAiAssistantPanel>`에 `onSaveConditionTemplate`, `onApplyConditionTemplate`, `reusableBlocks`를 전달하지 않으며, `FreeAiAssistantPanel.tsx`의 `handleSavePreset`은 콜백이 `undefined`여도 무조건 `"'...' 프리셋을 저장했습니다."` 배너를 띄움.
   - **최소 패치**: `handleSavePreset`에서 `!onSaveConditionTemplate`일 때 에러 배너를 표시하고 조기 반환하며, `SequenceWorkbench.tsx`에서 스토어의 `saveConditionTemplate`/`applyConditionTemplate`을 연결.

### 4.2 Track B 결함 (`DEFECT-B1` ~ `DEFECT-B3`)

1. **`DEFECT-B1` (`src/lib/freeAiClient.ts:363-426, 871-965`, `src/components/FreeAiAssistantPanel.tsx:201-204`)**
   - **원인**: 클라이언트 가드(`guardByokAndEnv`, `guardSensitiveHealthForExternalAi`)가 `input`만 검사하고 `reviewedCatalog`/`reviewedBlocks`를 검사하지 않으며, `toReviewedBlockCandidates`가 사용자가 선택하지 않은 블록(`selectedBlockIds` 외 블록)과 `step.instructorNote` 자유 텍스트를 그대로 외부 요청 페이로드에 포함시킴.
   - **최소 패치**: `toReviewedBlockCandidates`에서 `selectedBlockIds`에 선택된 블록만 필터링하고 `step.instructorNote`를 외부 전송 페이로드에서 제외하며, `executeExternalOrFallback` 직전에 최종 `serverRequest` 전체에 대해 `guardByokAndEnv` 및 `guardSensitiveHealthForExternalAi`를 실행.

2. **`DEFECT-B2` (`src/schemas/freeAiAssistantSchema.ts:121-172`)**
   - **원인**: `stripForbiddenKeyFields`가 배열(`Array.isArray(value)`) 내부 객체를 재귀 순회하지 않으며, `SENSITIVE_HEALTH_PATTERNS` 정규식이 `김민지 회원(34세)`/`박서연님`, `출산 8주차`/`복직근 이개`, `허리 통증`/`무릎 통증`/`어깨 충돌증후군`을 탐지하지 못함.
   - **최소 패치**: `stripForbiddenKeyFields`에 `Array.isArray(value)` 매핑 분기를 추가하고, `SENSITIVE_HEALTH_PATTERNS`에 산후 주수/복직근 이개, 일반 부위별 통증/증후군, 한글 실명+호칭(`회원`/`님`/`씨`/`환자`) 패턴을 보강.

3. **`DEFECT-B3` (`src/components/FreeAiAssistantPanel.tsx:576-691`, `src/lib/freeAiClient.ts:625-715`)**
   - **원인**: `502` 오류로 `errorBanner`가 떠 있는 동안 상단 배지/배너는 여전히 `'무료 AI 연결됨'`/`'무료 전용 AI 사용 가능'`을 표시하고, 탭 전환 클릭 핸들러가 `actionFeedback`을 초기화하지 않으며, `invalid_paid_model_blocked` 상태일 때 로컬 자동 폴백 대신 `request_failed` 예외를 던짐.
   - **최소 패치**: `errorBanner` 존재 시 상단 상태 배너 문구를 오류 안내로 전환하고, 탭 클릭 핸들러에서 `setActionFeedback(null)`을 호출하며, `shouldAutoFallbackToLocal`에 `status.reason === 'invalid_paid_model_blocked'`를 추가.

---

## 5. 재현 및 통합 검증 실행 명령어

```bash
# 1. 통합 감사 러너 실행 (Track A + Track B + 정적 번들/시크릿 스캔 + Read-Only 범위 검증)
node scripts/free-ai-boundary-audit-20261107/run-all-audits.mjs

# 2. 개별 트랙 러너 실행
node scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs
node scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs

# 3. Vitest 직접 실행 (Track A 14개 + Track B 13개 + 기존 스키마/시크릿 검증 6개 = 총 33개 테스트)
pnpm exec vitest run \
  scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx \
  scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx \
  src/schemas/freeAiAssistantSchema.test.ts
```
