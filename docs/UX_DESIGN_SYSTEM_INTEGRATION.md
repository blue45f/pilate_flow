# UX 고도화 및 디자인 시스템 통합 문서 (UX & Design System Integration Contract)

## 1. 담당 파일 및 제외 범위 선언 (Scope Ownership & Exclusion Declaration)

### 담당 파일 (Owned / Modified in UX & Design System Stream)
- **디자인 시스템 토큰 및 공통 프리미티브**:
  - `src/design-system/tokens.ts`
  - `src/design-system/PfDomainPrimitives.tsx` (`PfAiStatusBadge`, `PfMovementCard`, `PfSequenceBlock`, `PfBlockPill`, `PfButton`, `PfBadge`, `PfCard`, `PfField`, `PfInput`, `PfSelect`, `PfTextarea`, `PfSearchField`, `PfTabs`, `PfTabContent`, `PfTooltip`, `PfStatusBanner`, `PfFormError`, `PfEmptyState`, `PfLoadingState`, `PfErrorState`)
  - `src/design-system/DesignSystemInspector.tsx`
  - `src/design-system/index.ts`
  - `src/styles/design-tokens.css`
- **핵심 흐름(새 동작 만들기 → 수업 만들기 → 내 수업 → 기록) 및 실제 운영 화면**:
  - `src/App.tsx` (상단 핵심 빠른 메뉴 `.pf-core-quick-bar`: `새 동작 메모`, `수업 만들기`, `내 수업`, `기록` 및 점진적 노출)
  - `src/components/MovementIdeaSheet.tsx` (한 줄 아이디어 즉시 저장 → 직접 해본 느낌/수정 메모/자세 스케치 점진적 확장 시트)
  - `src/utils/movementIdeaDraft.ts` (창작 메모 어댑터, 취소/뒤로가기/오류 시 입력 보존 버퍼, 멱등성 중복 생성 방지)
  - `src/components/SequenceWorkbench.tsx` (첫 화면 단순화, 내 새 동작 메모 섹션, `PfSequenceBlock`/`PfMovementCard`/`PfBlockPill`/`PfAiStatusBadge` 도메인 프리미티브 적용, `.pf-flow-continuation` 핵심 흐름 이어가기 배너)
  - `src/components/ExerciseAtlasView.tsx` (카탈로그 및 창작 동작 카드에 `PfMovementCard`, `PfAiStatusBadge`, `PfBadge`, `PfButton` 적용)
  - `src/components/InlineExerciseFinder.tsx` (인라인 동작 찾기 카드에 `PfMovementCard`, `PfAiStatusBadge` 적용 및 한 줄 창작 메모 즉시 추가 지원)
  - `src/components/ClassBinderView.tsx` (내 수업 및 완료 이력 스냅샷 카드에 `PfBlockPill`, `PfAiStatusBadge`, `PfMovementCard`, `PfBadge` 적용)
  - `src/components/LogSessionModal.tsx` (수업 기록 모달 시트 및 폼 프리미티브 적용)
  - `src/components/InstructorStudyDialog.tsx`, `src/components/LightDismissDialog.tsx` (Radix Dialog/Tabs/Tooltip 기반 키보드·모달 접근성)
- **검증 테스트**:
  - `src/test/designSystem.test.tsx`
  - `src/test/movementIdeaFlow.test.tsx`

### 제외 범위 (Excluded Scope — 수정 금지 영역 준수)
- **P1 공통 데이터 모델·스키마·스토어·백업/이력 엔진**:
  - `src/types/pilates.ts`, `src/types/hierarchy.ts`, `src/types/teachingHistorySnapshot.ts`
  - `src/schemas/pilatesSchema.ts`, `src/schemas/hierarchySchema.ts`, `src/schemas/cloudBackupSchema.ts`
  - `src/store/usePilatesStore.ts`
  - `src/utils/hierarchyModel.ts`, `src/utils/humanMovementCreation.ts`, `src/utils/sequenceValidation.ts`, `src/utils/backupRecoveryInspection.ts`, `src/utils/teachingHistorySnapshot.ts`
- **P3 인증·클라우드 동기화·계정 분리 스토리지**:
  - `backend/**`, `src/lib/cloudSync.ts`, `src/lib/localAppDeploy.ts`, `src/lib/accountStorage.ts`, `src/lib/recoveryStorageGuard.ts`, `src/components/CloudSyncPanel.tsx`
- **AI·미디어 호출 로직 및 3D/도해 자산 모델**:
  - `src/lib/freeAiClient.ts`, `src/utils/freeAiAssistantEngine.ts`, `src/schemas/freeAiAssistantSchema.ts`, `src/types/freeAiAssistant.ts`, `src/components/FreeAiAssistantPanel.tsx`
  - `src/components/YouTubeClipModal.tsx`, `src/components/MotionDraftLabDialog.tsx`, `src/models/**`
- **해시 고정 스타일시트**:
  - `src/styles/atelier-v2.css`, `src/styles/step-inspector.css` (`src/styles/atelier-v2-verification.json` 해시 무결성 유지)

---

## 2. 공통/인접 모듈 통합 제안 (Proposals for Shared Module Integration Owner)

다른 병렬 세션에서 작성된 P1(`humanMovementCreation.ts`, `hierarchyModel.ts`), P3(`CloudSyncPanel.tsx`), AI(`FreeAiAssistantPanel.tsx`) 모듈을 덮어쓰지 않고 안전하게 연동할 수 있도록 통합 담당자에게 아래 3가지 연결 지점을 제안합니다:

1. **`MovementIdeaSheet.tsx` ↔ `src/utils/humanMovementCreation.ts` 브리지 제안**:
   - 현재 `src/utils/movementIdeaDraft.ts`는 P1 스토어를 건드리지 않고 `PilatesExercise` 형태로 창작 메모를 어댑팅합니다.
   - 추후 통합 시 `saveMovementIdeaToStore` 내부에서 `createQuickIdeaDraft(ideaLine)` 및 `appendQuickTryLog(draft, { feeling, adjustmentNote })`, `promoteMovementDraftToExercise(draft)`(`src/utils/humanMovementCreation.ts`)를 호출하면 UI 변경 없이 P1 정식 `HumanMovementDraft` 스키마와 1:1 통합됩니다.
2. **`FreeAiAssistantPanel.tsx` 디자인 시스템 상태 배지(`PfAiStatusBadge`) 연결 제안**:
   - `FreeAiAssistantPanel.tsx`의 AI 응답 헤더에 `<PfAiStatusBadge kind="auto-draft" />` (`조건 맞춤 초안 · 강사 확인 필요`)를 배치하면 작업대(`SequenceWorkbench.tsx`) 및 아틀라스(`ExerciseAtlasView.tsx`)의 상태 표시 체계와 시각적으로 완전히 통일됩니다.
3. **`SequenceWorkbench.tsx` 내 4계층(`Block → Section → Layer → Movement`) 인스펙터 노출 제안**:
   - `src/utils/hierarchyModel.ts`의 `buildProgramHierarchy` 결과를 `SequenceWorkbench.tsx`의 고급 펼침 영역(`<details>`) 또는 `ClassInsightsDialog.tsx`에 읽기 전용 요약으로 연결하면 초보자의 첫 화면 단순성을 해치지 않으면서 숙련 강사에게 4계층 검증 정보를 제공할 수 있습니다.
