# 무료 전용 AI 수업·동작 보조 (Zero-Key Free-Only AI Assistant) — 정책 확인 및 통합 제안서

## 1. 담당 파일 및 제외 범위 선언

다른 병렬 세션(P1 스키마, P2 공통 UI, P3 1줄 동작 메모/모바일 워크벤치 등)의 변경을 덮어쓰지 않도록, 본 세션은 **독립 신규 파일만 생성·검증**하고 공통 파일은 직접 수정하지 않습니다.

### 담당 파일 (Owned Files)
- `src/types/freeAiAssistant.ts` — 무료 전용 AI 보조 타입 및 P1 스키마(`P1ReusableBlockContract`, `P1MovementIdeaContract`, `P1MovementSnapshotContract`)·P2 공통 UI(`P2CommonUiContract`) 어댑터 계약
- `src/schemas/freeAiAssistantSchema.ts` — 무료 모델 화이트리스트 검증, BYOK·브라우저 키 노출 차단(`detectByokOrSecretExposure`, `stripForbiddenKeyFields`), 민감 건강·개인정보(PHI/PII) 검출·차단(`inspectSensitiveHealthText`, `inspectPayloadForSensitiveHealth`) 및 요청/응답 Zod 스키마
- `src/schemas/freeAiAssistantSchema.test.ts` — 스키마·보안·무료 정책 단위 테스트
- `backend/freeAiService.ts` — 서버 비밀 키 전용 무료 AI 서비스(Gemini Free Tier / OpenRouter `:free`), 유료 모델·유료 자동 fallback 원천 차단, 정규화 SHA-256 응답 캐시, 사용자별·전역 동시요청 제한, 분당(RPM)·일일(RPD) 서버 사용량 제한 및 검증 가능한 갱신 시각(`resetAt`) 계산
- `backend/freeAiService.test.ts` — 백엔드 무료 AI 서비스 단위 테스트
- `src/utils/freeAiAssistantEngine.ts` — 로컬 조건 기반 수업 초안 생성, 새 동작 아이디어 구조화 및 3단계(Easy/Standard/Hard) 변형 제안, 검토 완료 동작·P1 블록 기반 시퀀스 구성, 사용자 편집 및 미검토 창작 동작 변환 엔진
- `src/utils/freeAiAssistantEngine.test.ts` — 로컬 보조·편집 엔진 단위 테스트
- `src/lib/freeAiClient.ts` — 키 설정 없는 클라이언트 컨트롤러(클라이언트 캐시, 동시요청 제한, 무료 사용량 소진 시 외부 AI 호출 차단 및 갱신 시각 유지, 서버 미구성 시 로컬 추천·수동 편집·저장 프리셋 폴백)
- `src/lib/freeAiClient.test.ts` — 클라이언트 컨트롤러 단위 테스트
- `src/components/FreeAiAssistantPanel.tsx` — 무료 전용 AI 보조 UI 컴포넌트(수업 초안 만들기 / 새 동작 아이디어·변형 제안 / 검토 동작·블록 시퀀스 구성 + 전 항목 사용자 편집 + 미검토 안전성 미보장 고지)
- `src/components/FreeAiAssistantPanel.test.tsx` — UI 통합 및 사용자 여정 테스트
- `src/styles/free-ai-assistant.css` — 반응형·접근성(44px 터치 타깃) 스타일시트

### 제외 범위 (Excluded Scope — 직접 수정 금지)
- P1 스키마 담당 파일: `src/types/pilates.ts`, `src/schemas/cloudBackupSchema.ts`, `src/store/usePilatesStore.ts`
- P2 공통 UI 담당 파일: `src/design-system/**`
- 공통 엔트리·워크벤치·백엔드 라우터: `src/App.tsx`, `src/components/SequenceWorkbench.tsx`, `backend/index.ts`, `tsconfig.backend.json`, `package.json`

---

## 2. Google Gemini API 무료 티어 및 OpenRouter 무료 모델 공식 조건 확인 (2026-11 기준)

| 항목 | Google Gemini Developer API (Free Tier) | OpenRouter Free Models (`:free` / `openrouter/free`) | 본 구현의 무료 보장 방식 |
| --- | --- | --- | --- |
| **과금/결제 조건** | Google AI Studio의 **Unpaid(결제 미연결) 프로젝트**에서만 무료 티어 제공. 프로젝트에 Cloud Billing(Tier 1+)을 연결하면 무료 한도 없이 토큰당 유료 과금됨. | 모델 ID가 `:free`로 끝나거나 `openrouter/free` 라우터인 경우 입력·출력 토큰 단가 `\$0.00/M`. 신용카드·크레딧 충전 불필요. | Gemini는 `GEMINI_FREE_TIER_UNPAID_CONFIRMED=true` 서버 확인 필수. OpenRouter는 `:free` 접미사 또는 `openrouter/free` 외 모든 모델 차단 + `provider: { allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } }` 강제. |
| **허용 무료 모델 (2026-11 검증)** | `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.5-flash` (2026년 6월 1일부로 종료된 `gemini-2.0-flash` / `gemini-2.0-flash-lite` 제외, 유료 전용 `gemini-4-argon`, `gemini-3.1-pro-preview`, 이미지 생성, 유료 Search Grounding 제외) | `openrouter/free` 또는 `^[a-z0-9._-]+/[a-z0-9._-]+:free$` 패턴 모델(예: `google/gemma-4-31b-it:free`, `meta-llama/llama-3.3-70b-instruct:free`)만 허용 | `isGuaranteedFreeGeminiModel` 및 `isGuaranteedFreeOpenRouterModel`로 화이트리스트 검증 후 불일치 시 호출 차단 (`invalid_paid_model_blocked`). |
| **유료 Fallback 위험** | 유료 모델이나 Grounding 도구 호출 시 과금 가능 | `models` 배열에 유료 모델 포함 시 또는 기본 라우팅 fallback 허용 시 유료 모델로 자동 전환되어 과금됨 | `allow_fallbacks: false` 및 `max_price: { prompt: 0, completion: 0 }` 고정, 대체 모델 배열 미사용, 429/402/5xx 발생 시 유료 재시도 절대 금지. |
| **호출 한도 및 갱신 시각** | 프로젝트 단위 RPM/TPM/RPD 적용 (무료 티어 텍스트 모델 기준 약 5~15 RPM, 20~1,000 RPD). 일일 한도(RPD)는 **미국 태평양 시간 자정(`00:00 America/Los_Angeles`, PT)** 기준 초기화. | 무료 모델 공식 한도: **분당 20회(20 RPM)**, **일일 50회(50 RPD, 무결제 계정 기준 / 10 크레딧 이상 구매 이력 계정 1,000 RPD)**. 일일 한도는 **매일 `00:00 UTC`** 초기화 (`X-RateLimit-Reset` 헤더 제공). | 서버에서 보수적 한도(기본 10 RPM / 45 RPD) 및 업스트림 429를 추적하며, 소진 시 `"무료 사용량 소진"` 상태와 정확한 `resetAt`(PT 자정 또는 `00:00 UTC` ISO 시각)을 반환. |
| **데이터 프라이버시** | 무료 티어(Unpaid) 입력·출력은 Google 제품 개선 및 리뷰어 검토에 사용될 수 있으므로 민감·개인·건강 정보 전송 금지 명시 | 무료(`:free`) 모델 제공자가 프롬프트·응답을 로깅하거나 학습에 사용할 수 있으므로 민감 데이터 전송 금지 | 클라이언트·서버 이중으로 디스크·수술·임신·통증·진단명·실명·연락처 등 민감 건강·개인정보(PHI/PII) 검출 시 외부 전송 즉시 차단 (로컬 전용 모드는 마스킹 후 기기 내 실행 가능). |

---

## 3. 공통 파일 통합 제안 (통합 담당자용 패치 가이드)

### 3.1 `backend/index.ts` 라우트 마운트 제안

```ts
import { createFreeAiRoutes, createFreeAiService } from './freeAiService';

const freeAiService = createFreeAiService();
const freeAiRoutes = createFreeAiRoutes(freeAiService);

// handler router 내부에 아래 2개 라우트 병합:
// 'GET /api/studio/ai/status': freeAiRoutes['GET /api/studio/ai/status'],
// 'POST /api/studio/ai/assist': freeAiRoutes['POST /api/studio/ai/assist'],
```

### 3.2 `src/components/SequenceWorkbench.tsx` (또는 `src/App.tsx`) — P1 스키마 & P2 공통 UI 계약 어댑터 연결 제안

```tsx
import { FreeAiAssistantPanel } from './FreeAiAssistantPanel';
import { PfBadge, PfStatusBanner } from '../design-system';
import type { P1ReusableBlockContract } from '../types/freeAiAssistant';
import { isExerciseAutoEligible } from '../utils/exerciseReview';

// 1) P1 ReusableBlock(items 기반) -> P1ReusableBlockContract 어댑터:
// 블록 내 모든 동작이 검토 완료(isExerciseAutoEligible)이거나 스냅샷이 확인된 경우에만 isReviewed: true 부여
const adaptedReusableBlocks: P1ReusableBlockContract[] = (s.reusableBlocks ?? []).map((block) => {
  const items = block.items ?? [];
  const allItemsReviewed =
    items.length > 0 &&
    items.every((item) => {
      const catalogEx = s.exercises.find((ex) => ex.id === item.exerciseId);
      return catalogEx ? isExerciseAutoEligible(catalogEx) : Boolean(item.exerciseSnapshot);
    });
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    apparatus: block.apparatus,
    level: block.level,
    sectionRole: block.sectionRole,
    category: items[0]?.blockCategory ?? 'core',
    durationMin: items.reduce((sum, item) => sum + item.durationMin, 0),
    version: block.version,
    items,
    steps: items,
    isReviewed: allItemsReviewed,
  };
});

// 2) SequenceWorkbench 내부에서 무료 AI 보조 패널 렌더링 (P1 HumanMovementDraft + P2 PfBadge/PfStatusBanner 주입):
<FreeAiAssistantPanel
  exercises={s.exercises}
  reusableBlocks={adaptedReusableBlocks}
  conditionTemplates={s.conditionTemplates}
  activeTargetMinutes={s.activeTargetMinutes}
  activeApparatus={s.activeApparatus}
  activeLevel={s.activeLevel}
  uiContract={{
    renderBadge: ({ tone, children }) => (
      <PfBadge tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral'}>
        {children}
      </PfBadge>
    ),
    renderNotice: ({ tone, title, description }) => (
      <PfStatusBanner tone={tone === 'error' ? 'danger' : tone === 'warning' ? 'warning' : 'info'}>
        <strong>{title}:</strong> {description}
      </PfStatusBanner>
    ),
  }}
  onApplyDraftSequence={({ title, subtitle, targetMinutes, level, apparatus, steps }) => {
    s.setActiveSequenceMeta({ title, subtitle, targetMinutes, level, apparatus });
    usePilatesStore.setState({ activeSteps: steps });
  }}
  onSaveUnreviewedMovementIdea={(exercise, ideaContract) => {
    // 커스텀 미검토 동작(review: undefined) 저장 및 P1 HumanMovementDraft(safetyBoundary 포함) 연동 가능
    s.addCustomExercise(exercise);
    s.saveHumanMovementDraft?.({
      id: ideaContract.id,
      ideaLine: ideaContract.ideaText,
      workingNameKo: ideaContract.nameKo,
      apparatus: ideaContract.apparatus,
      blockCategory: ideaContract.blockCategory,
      level: ideaContract.level,
      defaultDurationMin: ideaContract.defaultDurationMin,
      breathPattern: ideaContract.breathPattern,
      cues: [...ideaContract.cues],
      precautions: ideaContract.precautions,
      layers: ideaContract.layers,
      feelLogs: [],
      modificationLogs: [],
      photoReferences: [],
      sourceOrigin: 'human-created',
      completenessStage: 'idea-only',
      revision: 1,
      revisionHistory: [],
      safetyBoundary: ideaContract.safetyBoundary!,
      createdAt: ideaContract.createdAt,
      updatedAt: ideaContract.createdAt,
    });
  }}
  onApplyConditionTemplate={(templateId) => {
    s.applyConditionTemplate(templateId);
  }}
  onSaveConditionTemplate={(name, criteria) => {
    s.setDraftCriteria(criteria);
    s.saveConditionTemplate(name);
  }}
/>
```
