# 새 동작 창작 도구 및 4단계 계층(동작 → 재사용 블록 → 시퀀스 → 수업) 데이터·저장·조율 계약서

본 문서는 **사람이 직접 구상·시도하며 만드는 미완성 새 동작 초안(`HumanMovementDraft`)**부터 **재사용 블록(`ReusableBlock`) → 시퀀스(`Sequence`) → 수업(`ClassSequenceSnapshot` / `TeachingProgramSnapshot`)**까지의 공통 스키마·저장·검증·UI 점진적 노출 계약을 정의하고, 병렬 진행 중인 타 세션(AI 보조·인증/클라우드 백업·미디어 연구실·공통 디자인 시스템·공통 스토어)과의 소유 경계 및 비침투적 통합 제안을 명문화합니다.

---

## 1. 작업 소유 범위 및 제외 범위 선언 (Scope & Ownership Declaration)

### 1.1 본 세션 소유 파일 (Owned Files)
본 세션(새 동작 창작 도구 & 4단계 계층 구조/저장 담당)이 직접 소유·유지보수하는 파일 목록입니다:

- **계층·초안 타입 및 스키마**:
  - [`src/types/hierarchy.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/hierarchy.ts): 새 동작 초안(`HumanMovementDraft`), 주관적 느낌(`SubjectiveFeelLog`)/수정점(`DraftModificationLog`)/로컬 사진 참조(`DraftPhotoReference`), 변형 분기(`parentDraftId`, `parentDraftRevision`, `variantLabelKo`), 수정 이력(`DraftRevisionEntry`), 4단계 계층 스냅샷(`MovementSnapshot`, `ReusableBlock`, `ClassBlockSnapshot`, `ClassSequenceSnapshot`) 및 검증 리포트 타입 정의 (`declare module './pilates'`를 통한 비침투적 타입 확장 포함)
  - [`src/schemas/hierarchySchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/hierarchySchema.ts): 최소 1줄 아이디어 저장, 주관적 체감/객관적 효능 분리(`movementSafetyAndEfficacyBoundarySchema`), 로컬 사진 참조 보안(`draftPhotoReferenceSchema`), 변형/수정 이력 및 계층별 Zod 검증 스키마
- **핵심 도메인 유틸리티**:
  - [`src/utils/humanMovementCreation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/humanMovementCreation.ts): 한 줄 아이디어 초안 생성(`createHumanMovementIdeaDraft`), 점진적 느낌(`addSubjectiveFeelToDraft`)·수정점(`addModificationLogToDraft`)·로컬 사진(`addPhotoReferenceToDraft`)·메타데이터 보완(`refineHumanDraftMetadata`), 변형(Easy/Standard/Hard) 관리(`updateHumanDraftVariants`) 및 독립 변형 초안 분기(`forkHumanDraftVariant`), 비파괴 수정 이력 복원(`restoreHumanDraftRevision`), 실패 시 입력 보존 저장소(`createHumanDraftRepository`), 후속 단계별 수업 연결 준비도 평가(`evaluateDraftStageReadiness`)
  - [`src/utils/hierarchyModel.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/hierarchyModel.ts): 동작(카탈로그 + 사람 창작 초안) → 재사용 블록(`createReusableBlock`, `summarizeReusableBlockTiming`, `updateReusableBlockTemplate`) → 시퀀스(`insertReusableBlockIntoSequence`, `editSequenceStepWithIsolation`, `linkHumanDraftToSequence`) → 수업 불변 스냅샷(`createClassSequenceSnapshot`) 및 과거 스냅샷 기반 새 초안 복제(`cloneClassSnapshotToDraft`)
  - [`src/utils/sequenceValidation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceValidation.ts): 하위 시간 합산(`calculateSequenceTimeBreakdown`), 기구 전환 시간 산출(`calculateApparatusTransitionDetail`, `applyAutoApparatusTransitions`), 순서·반복·세트·좌우 균형 검증 및 자동 보정(`validateSequenceStructure`, `balanceSequenceSides`), 난이도 흐름 정규화(`normalizeSequenceDifficultyFlow`), AI 자동 추천 경계 vs 사람 창작 동작 허용 경계(`validateMovementSourceBoundary`)
  - [`src/utils/movementIdeaDraft.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/movementIdeaDraft.ts): 워크벤치 UI용 한 줄 동작 메모 버퍼(`loadMovementIdeaWorkingBuffer`, `saveMovementIdeaWorkingBuffer`), 즉시 저장(`saveMovementIdeaDraft`), 카탈로그/기구 필터 차단 없는 현재 수업 즉시 투입(`addMovementIdeaToCurrentClass`)
- **새 동작 메모 시트 UI 컴포넌트**:
  - [`src/components/MovementIdeaSheet.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementIdeaSheet.tsx): 1단계 한 줄 아이디어 즉시 저장 및 `<details>` 기반 점진적 노출(느낀 점·수정점·로컬 사진·고급 계층/기구/시간 옵션) 시트 컴포넌트
- **단위 및 통합 테스트**:
  - [`src/test/humanMovementCreation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/humanMovementCreation.test.ts)
  - [`src/test/hierarchyModel.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/hierarchyModel.test.ts)
  - [`src/test/sequenceValidation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/sequenceValidation.test.ts)
  - [`src/test/movementIdeaFlow.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/test/movementIdeaFlow.test.tsx)

### 1.2 제외 범위 (Excluded Files Owned by Other Sessions)
충돌 방지 및 병렬 작업 경계 준수를 위해 아래 파일들은 다른 전담 세션의 소유로 두며 본 세션에서 직접 수정하지 않습니다:

- **AI 어시스턴트 세션**:
  - [`backend/freeAiService.ts`](file:///home/antigravity/blue45f/pilate_flow/backend/freeAiService.ts)
  - [`src/components/FreeAiAssistantPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/FreeAiAssistantPanel.tsx)
- **인증 · 계정 저장소 · 클라우드 동기화 세션**:
  - [`src/lib/cloudSync.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/cloudSync.ts)
  - [`src/lib/localAppDeploy.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/localAppDeploy.ts)
  - [`src/lib/accountStorage.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/accountStorage.ts)
  - [`src/lib/recoveryStorageGuard.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/recoveryStorageGuard.ts)
- **미디어 · 모션 연구실 세션**:
  - [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx)
  - [`src/components/MotionDraftLabDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MotionDraftLabDialog.tsx)
  - `src/models/**`
- **공통 디자인 시스템 및 스타일 세션**:
  - `src/design-system/**`
  - `src/styles/**`
- **공통 스토어 · 스키마 · 수업 이력 원본 세션**:
  - [`src/types/pilates.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/pilates.ts)
  - [`src/schemas/pilatesSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/pilatesSchema.ts)
  - [`src/schemas/cloudBackupSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/cloudBackupSchema.ts)
  - [`src/utils/backupRecoveryInspection.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/backupRecoveryInspection.ts)
  - [`src/store/usePilatesStore.ts`](file:///home/antigravity/blue45f/pilate_flow/src/store/usePilatesStore.ts)
  - [`src/utils/teachingHistorySnapshot.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/teachingHistorySnapshot.ts)
  - *(위 공통 파일들에 대해서는 직접 덮어쓰지 않고 본 문서 **제4장**에 비침투적 통합 패치 제안을 제공합니다.)*

---

## 2. 사람 중심 새 동작 창작 End-to-End 계약 (Human Movement Creation Contract)

### 2.1 Step 1 — 1줄 아이디어 초안 즉시 저장 (`ideaLine` Only, Zero Mandatory Anatomy/Classification)
- **필수 입력**: `ideaLine: string` (공백 제외 1자 이상 1,000자 이하) **단 하나만 필수**입니다.
- **선행 분류·해부학 입력 강제 금지**:
  - 완성된 동작 이름(`workingNameKo`), 기구(`apparatus`), 수업 구간 역할(`sectionRole`), 블록 카테고리(`blockCategory`), 난이도(`level`), 기본 시간(`defaultDurationMin`), 반복(`defaultRepetitions`), 세트(`defaultSets`), 좌우 편측 여부(`isUnilateral`, `sideMode`), 해부학 메타데이터(`spinalPlanes`, `targetMuscles`, `bodyPosition`, `breathPattern`, `cues`, `precautions`)가 **모두 `undefined`여도 즉시 `completenessStage: 'idea-only'`, `revision: 1` 초안으로 저장·복구**됩니다.
- **실패 시 입력 보존 계약 (`PreservedCreationInputState`)**:
  - `createHumanDraftRepository` 및 `saveMovementIdeaWorkingBuffer`는 입력 검증 실패(빈 문자열, 허용되지 않는 외부 사진 URL 등)나 브라우저 스토리지 기록 예외(`localStorage.setItem` 쿼터 초과 등)가 발생하더라도, 사용자가 작성 중이던 `ideaLine`, `workingNameKo`, `pendingFeelNoteKo`, `pendingModificationPointKo`, `pendingPhotoUri`, `pendingOverrides`를 유실 없이 보존하고 기존 `drafts`와 `revisionHistory`를 절대 손상시키지 않습니다.

### 2.2 Step 2 — 직접 해본 뒤 점진적 기록 (Progressive Try-Out Logs & Epistemic/Privacy Boundary)
강사가 동작을 직접 몸으로 시도해 본 뒤, 언제든 점진적으로 아래 3가지 기록을 추가할 수 있습니다 (`completenessStage`가 `'practiced-recorded'`로 자동 승격):

1. **주관적 느낌 기록 (`feelLogs: SubjectiveFeelLog[]`)**:
   - `addSubjectiveFeelToDraft` / `repo.appendFeelLog`를 통해 체감 메모(`feelNoteKo`), 체감 강도(`perceivedIntensity`: `'gentle' | 'moderate' | 'challenging'`), 주의할 느낌(`cautionFeelKo`)을 기록합니다.
   - **엄격한 인식론적·안전 경계 (Epistemic & Safety Boundary)**:
     - 강사의 주관적 운동감 메모가 객관적 운동 효능 판정이나 AI/전문가 안전성 보증으로 오인되지 않도록 모든 `SubjectiveFeelLog` 및 `HumanMovementDraft.safetyBoundary`는 다음 리터럴 값을 스키마(`subjectiveFeelLogSchema`, `movementSafetyAndEfficacyBoundarySchema`) 수준에서 강제합니다:
       - `evaluationBasis: 'subjective-instructor-feel'`
       - `objectiveEfficacyClaimed: false`
       - `safetyGuaranteed: false` (초안 경계에서는 `aiSafetyGuaranteed: false`)
       - `expertVerified: false`
     - 호출 측에서 위 플래그 중 하나라도 `true`로 전달하면 `EPISTEMIC_BOUNDARY_VIOLATION` 예외를 발생시켜 즉시 차단합니다.
2. **수정할 점 기록 (`modificationLogs: DraftModificationLog[]`)**:
   - `addModificationLogToDraft` / `repo.appendModificationLog`를 통해 동작 수정 포인트(`modificationPointKo`), 스프링·기구 세팅 변경점(`setupOrSpringChangeKo`), 큐잉 변경점(`cueChangeKo`) 및 반영된 리비전 번호(`appliedToRevision`)를 기록합니다.
3. **로컬 전용 사진 참조 (`photoReferences: DraftPhotoReference[]`)**:
   - `addPhotoReferenceToDraft` / `repo.appendPhotoReference`를 통해 자세 사진이나 스케치를 연결합니다 (`angleTag`: `'setup' | 'start-pose' | 'end-pose' | 'modification'`).
   - **로컬 프라이버시 경계**:
     - `localRefUri`는 기기/앱 내부 참조 스킴(`local-photo://`, `blob:`, `asset://`, `file://`, `data:image/`)만 허용하며, 외부 원격 URL(`http://`, `https://`)은 스키마에서 즉시 거부합니다.
     - `externalAiUploadAllowed: false` 리터럴을 강제하여 강사의 개인 연습 사진이나 스케치가 외부 AI 서버로 전송되는 것을 원천 차단합니다.

### 2.3 Step 3 — 변형(Variant) 및 버전·수정 이력 관리 (Variant & Version Management)
1. **초안 내부 난이도 변형 레이어 관리 (`updateHumanDraftVariants`)**:
   - `updateHumanDraftVariants(draft, { easy, standard, hard, summaryKo, now })`를 통해 하나의 동작 초안 안에서 회원 컨디션별 변형(`layers.easy`, `layers.standard`, `layers.hard`)을 점진적으로 기록·수정할 수 있으며, 호출 시 `revision`이 1 증가하고 `'variant-updated'`(또는 `'metadata-refined'`) 이력이 스냅샷으로 남습니다.
2. **독립 변형 초안 분기 (`forkHumanDraftVariant`)**:
   - 기존 초안을 바탕으로 기구 세팅·소도구·포지션을 달리한 별도 변형 동작을 만들고 싶을 때 `forkHumanDraftVariant(sourceDraft, { variantLabelKo, ideaLine, workingNameKo, patch, now })`를 호출합니다.
   - 분기된 초안은 새 고유 `id`와 `revision: 1`을 부여받으며, 원본 추적을 위해 다음 계보 메타데이터를 보존합니다:
     - `parentDraftId: sourceDraft.id`
     - `parentDraftRevision: sourceDraft.revision`
     - `variantLabelKo: string` (예: `'롱박스 변형'`, `'임산부 가동범위 축소 변형'`)
   - 원본 초안(`sourceDraft`)과 분기된 변형 초안은 서로 완전히 독립되어 어느 한쪽을 수정해도 다른 쪽이 변경되지 않습니다.
3. **불변 수정 이력(`revisionHistory`) 및 비파괴 복원(`restoreHumanDraftRevision`)**:
   - 모든 상태 변경(`initial-idea`, `idea-updated`, `feel-added`, `modification-added`, `photo-added`, `metadata-refined`, `variant-updated`, `restored-revision`)마다 `revision`이 1씩 증가하고 당시의 전체 `contentSnapshot: HumanMovementDraftContent`가 `deepFreeze`로 동결 저장됩니다.
   - `restoreHumanDraftRevision(draft, targetRevision)` 호출 시 과거 이력을 덮어쓰거나 삭제하지 않고, `targetRevision`의 스냅샷을 복원한 **새 리비전(`revision: draft.revision + 1`, `parentRevision: targetRevision`, `changeType: 'restored-revision'`)**을 추가하여 언제든 재복원이 가능합니다.

### 2.4 Step 4 — 4단계 계층(`동작 → 재사용 블록 → 시퀀스 → 수업`)의 점진적 UX 노출 원칙
- **계층 학습 강제 금지 (No Upfront Hierarchy Burden)**:
  - 첫 사용자는 `동작 → 재사용 블록 → 시퀀스 → 수업`이라는 4단계 계층 구조를 미리 배우거나 분류할 필요 없이, [`MovementIdeaSheet.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementIdeaSheet.tsx)에서 **1줄 아이디어만 적고 `[초안 바로 저장]` 또는 `[수업에 넣기]`**를 누를 수 있습니다.
  - 미완성 초안을 블록·시퀀스·수업에 바로 넣을 때는 `evaluateDraftStageReadiness`가 누락된 권장 항목(`apparatus`, `durationMin`, `sectionRole`, `sideMode`)에 대해 안전한 기본값(`'mat'`, `4분`, `'main'`, `'together'`)을 자동 적용하고, 차단이 아닌 친절한 안내(`guidanceNoticesKo` 및 `code: 'draft-metadata-guidance'`, `severity: 'warning'`)만 제공합니다.
- **고급 계층·블록·세부 시간 제어의 `<details>` 점진적 노출**:
  - 직접 해본 느낌/수정점/사진 입력 영역과 임시 이름·기구·시간·블록 묶기·하위 시간(설명/전환 초) 등 고급 제어는 모두 접을 수 있는 `<details className="pf-idea-progressive-section">` 내부에 배치하여, 초기 화면의 인지 부하를 최소화하고 필요한 강사만 펼쳐서 정교하게 다듬을 수 있도록 유지합니다.

---

## 3. 하위 시간 합산 · 순서/반복/좌우 · 블록 편집/복사 분리 · 과거 수업 불변 정책

### 3.1 하위 시간 자동 합산 공식 (Sub-Timing Summation Formula)
1. **개별 동작 단계(Step) 하위 시간 공식 (`getStepTiming`)**:
   - 각 동작 스텝의 배정 시간 `durationMin`을 초 단위로 환산한 총 시간(`totalSec = Math.round(durationMin * 60)`)은 **순수 동작 수행 시간(`movementSec`) + 설명 시간(`explanationSec`) + 기구/세팅 전환 시간(`transitionSec`)**의 합으로 구성됩니다:
     $$\text{totalSec} = \text{durationMin} \times 60 = \text{movementSec} + \text{explanationSec} + \text{transitionSec}$$
   - 이때 $\text{explanationSec} + \text{transitionSec} \le \text{durationMin} \times 60$ 제약이 스키마(`stepSchema`, `reusableBlockItemSchema`)에서 항상 검증되며, 순수 동작 시간은 $\text{movementSec} = \max(0, \text{totalSec} - \text{explanationSec} - \text{transitionSec})$으로 계산됩니다.
   - 양쪽 순차 수행(`sideMode: 'left-then-right' | 'right-then-left'`)인 편측 동작의 경우 `sides = 2`, 한쪽당 순수 수행 시간은 $\text{perSideSec} = \lfloor \text{movementSec} / 2 \rfloor$로 산출됩니다.
2. **재사용 블록 단위 시간 요약 (`summarizeReusableBlockTiming`)**:
   - `ReusableBlock` 내부의 `items` 전체에 대해 `movementSec`, `explanationSec`, `transitionSec`, `totalSec`, `totalMinutes`를 합산하여 블록 카드 및 삽입 미리보기에서 즉시 확인할 수 있습니다.
3. **시퀀스 전체 시간 합산 및 기구 전환 예산 (`calculateSequenceTimeBreakdown`)**:
   - 시퀀스 내 모든 운동 스텝의 하위 시간(`movementSec`, `explanationSec`, `transitionSec`)과 휴식 스텝(`kind: 'rest'`)의 `restSec`을 합산하여:
     - $\text{exerciseSec} = \sum (\text{movementSec} + \text{explanationSec} + \text{transitionSec})$
     - $\text{totalSec} = \text{exerciseSec} + \text{restSec}$
     - 구간별 시간 `sectionDurations` (`preparationSec`, `mainSec`, `cooldownSec`, `restSec`)
     - 목표 수업 시간 대비 오차 $\text{deltaSec} = \text{totalSec} - (\text{targetMinutes} \times 60)$을 계산합니다.
   - 연속된 두 운동 스텝 사이의 기구/박스/스프링/체위 변경을 감지(`calculateApparatusTransitionDetail`)하여 권장 전환 시간(기구 변경 45초, 박스 변경 25초, 스프링/체위 변경 15초, 동일 세팅 10초)을 산출하고, 기구 변경 시 전환 시간이 30초 미만이면 `transition-underbudgeted` 경고를 발생시킵니다.

### 3.2 순서(Order) · 반복(Repetitions) · 세트(Sets) · 해부학적 좌우(`sideMode`) 및 균형 보정
1. **순서·반복·세트 규칙**:
   - 모든 블록 항목(`ReusableBlockItem.order`)과 시퀀스 스텝(`SequenceStep.order`)은 `1..N` 연속 정수로 정규화(`renumberSteps`)됩니다.
   - `repetitions`(1~1,000회)와 `sets`(1~100세트)는 강사가 의도한 수행 횟수/세트 가이드로 보존되며, 배정 시간(`durationMin`)을 임의로 왜곡하지 않습니다.
2. **해부학적 좌우 모드 (`StepSideMode`)**:
   - 관찰자 시점이 아닌 **회원 신체의 해부학적 좌우** 기준으로 5가지 모드를 지원합니다:
     - `'together'`: 양측 동시 수행
     - `'left'`: 왼쪽 단독 수행
     - `'right'`: 오른쪽 단독 수행
     - `'left-then-right'`: 한 스텝 안에서 왼쪽 수행 후 오른쪽 연속 수행
     - `'right-then-left'`: 한 스텝 안에서 오른쪽 수행 후 왼쪽 연속 수행
3. **좌우 불균형 검출 및 자동 균형 맞춤 (`balanceSequenceSides` / `balanceSequenceUnilateralSides`)**:
   - 편측 동작(`isUnilateral: true`)에 대해 다음 불균형을 검출합니다:
     - `'together'`로 잘못 설정된 경우: `unilateral-bilateral-mode-mismatch` (warning)
     - 분할된 `'left'` 스텝과 `'right'` 스텝의 개수가 맞지 않는 경우: `unilateral-missing-pair` (error)
     - 분할된 좌·우 스텝의 순수 동작 시간(`movementSec`) 차이가 1초를 초과하는 경우: `unilateral-duration-imbalance` (error)
     - 분할된 좌·우 스텝의 `repetitions` 또는 `sets`가 서로 다른 경우: `unilateral-reps-imbalance` (warning)
   - `balanceSequenceSides(steps, exercises, { humanDrafts })` 호출 시 잠기지 않은(`!locked`) 편측 스텝의 `'together'`를 `'left-then-right'`로 전환하고, 짝이 있는 좌/우 스텝의 시간·반복·세트를 동일하게 맞추며, 짝이 없는 잠긴 단일 스텝 뒤에는 반대쪽 파트너 스텝을 자동 삽입합니다.

### 3.3 재사용 블록 템플릿 편집 vs 시퀀스 내부 복사본 편집 정책 (Block Edit vs. Copy Isolation)
1. **재사용 블록 라이브러리 템플릿 편집 (`updateReusableBlockTemplate`, `addItemToReusableBlock`, `linkHumanDraftToReusableBlock`, `scaleReusableBlockDuration`)**:
   - 블록 라이브러리에서 `ReusableBlock`을 수정하면 `block.version`이 `version + 1`로 증가하고 `updatedAt`이 갱신됩니다.
   - **기존 시퀀스 불변**: 이미 해당 블록을 삽입해 둔 기존 시퀀스들의 스텝은 템플릿 수정으로 인해 자동으로 덮어써지지 않습니다.
2. **시퀀스에 블록 삽입 (`insertReusableBlockIntoSequence`)**:
   - 블록의 각 항목(`ReusableBlockItem`)을 시퀀스 스텝(`SequenceStep`)으로 복사하면서 동일한 고유 인스턴스 식별자 `blockInstanceId`와 출처 메타데이터(`sourceBlockId: block.id`, `sourceBlockVersion: block.version`, `sourceBlockTitle: block.title`, `blockInstanceDetached: false`)를 부여합니다.
3. **시퀀스 내부에 삽입된 블록 스텝 편집 (`editSequenceStepWithIsolation`, `adjustSequenceBlockInstanceDuration`, `removeSequenceBlockInstance`)**:
   - 시퀀스 안에서 특정 스텝이나 블록 인스턴스의 시간·스프링·노트·레이어를 수정하면 해당 `blockInstanceId`에 속한 스텝들이 `blockInstanceDetached: true`로 전환됩니다.
   - **원본 템플릿 불변**: 시퀀스 내부 수정은 원본 `ReusableBlock` 템플릿이나 같은 블록을 사용한 다른 시퀀스에 절대 전파되지 않습니다.

### 3.4 과거 수업 스냅샷 불변 보장 (Past Class Immutability)
1. **계층 스냅샷 동결 (`createClassSequenceSnapshot`)**:
   - 수업을 저장·확정하거나 일정/이력에 기록할 때 `createClassSequenceSnapshot`은 당시의 시퀀스 메타데이터, 각 스텝(`steps`), 사용된 모든 동작의 스냅샷 맵(`exerciseSnapshots: Record<string, MovementSnapshot>`), 블록 버전 스냅샷(`blockSnapshots: ClassBlockSnapshot[]`), 하위 시간 합산(`timeBreakdown`)을 생성하여 재귀적 `deepFreeze`로 동결합니다.
   - 사람이 만든 새 동작 초안(`HumanMovementDraft`)의 경우 당시의 `humanDraftRevision`, `ideaLineSnapshot`, `feelLogsSnapshot`, `modificationLogsSnapshot`, `photoReferencesSnapshot`, `safetyBoundarySnapshot`까지 모두 `MovementSnapshot` 내부에 깊은 복사 후 동결됩니다.
2. **완료된 수업 이력 스냅샷 (`TeachingProgramSnapshot`)**:
   - [`src/utils/teachingHistorySnapshot.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/teachingHistorySnapshot.ts)의 `buildTeachingProgramSnapshot` 또한 완료 시점의 동작 정의(`exercisesById: Record<string, TeachingExerciseSnapshot>`)와 스텝별 하위 시간·스프링·레이어 설명(`items: TeachingProgramSnapshotItem[]`)을 독립 복사본으로 박제합니다.
3. **사후 편집 및 삭제 격리 보장**:
   - 이후 강사가 원본 `HumanMovementDraft`의 아이디어·느낌·수정점·사진·기구·시간을 수정하거나, 카탈로그 `PilatesExercise`를 수정/삭제하거나, `ReusableBlock` 템플릿을 편집/삭제하더라도 **과거 수업 기록(`ClassSequenceSnapshot` 및 `TeachingProgramSnapshot`)은 1바이트도 변하지 않습니다**.
   - 과거 수업 스냅샷을 기반으로 새 수업을 준비할 때는 `cloneClassSnapshotToDraft`가 호출되어 `sourceProvenance`(`kind: 'history-snapshot' | 'dated-plan-snapshot'`, `sourceVersion`, `clonedAt`, `summaryKo`)가 명시된 독립 편집 초안을 생성하며, 카탈로그에서 삭제된 동작이 있더라도 스냅샷에서 안전하게 복원(`restoredExercises`)합니다.

---

## 4. 공통 스키마 및 스토어 비침투적 통합 제안 (Shared Schema & Store Integration Proposals)

공통 파일 소유 세션에서 전체 스토어·클라우드 백업·이력 스냅샷에 본 계층 모델을 결합할 때, 기존 동작과 하위 호환성을 100% 유지하면서 최소한의 변경으로 연결할 수 있는 통합 제안입니다.

### 4.1 [`src/types/pilates.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/pilates.ts) 통합 제안
현재 [`src/types/hierarchy.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/hierarchy.ts)에서 TypeScript 모듈 보강(`declare module './pilates'`)으로 `SequenceStep`, `SavedSequence`, `ClassHistoryLog`에 선택 필드를 주입하고 있습니다. 향후 [`src/types/pilates.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/pilates.ts)에 정식 병합할 때 아래 선택(optional) 필드를 추가하면 됩니다:

```ts
// src/types/pilates.ts 내 인터페이스 선택 필드 추가 제안
import type {
  ClassSequenceSnapshot,
  MovementSnapshot,
  SequenceSourceProvenance,
} from './hierarchy';

export interface PilatesExercise {
  // ...기존 필드 유지
  defaultRepetitions?: number;
  defaultSets?: number;
  humanDraftId?: string;
  humanDraftRevision?: number;
}

export interface SequenceStep extends StepPracticeOptions {
  // ...기존 필드 유지
  blockInstanceId?: string;
  sourceBlockId?: string;
  sourceBlockVersion?: number;
  sourceBlockTitle?: string;
  blockInstanceDetached?: boolean;
  exerciseSnapshot?: MovementSnapshot;
  humanDraftId?: string;
  humanDraftRevision?: number;
}

export interface SavedSequence {
  // ...기존 필드 유지
  version?: number;
  sourceProvenance?: SequenceSourceProvenance;
}

export interface ClassHistoryLog {
  // ...기존 필드 유지
  sequenceSnapshot?: ClassSequenceSnapshot;
  sourceProvenance?: SequenceSourceProvenance;
}
```

### 4.2 [`src/schemas/pilatesSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/pilatesSchema.ts) 통합 제안
폼 검증 스키마 모음인 [`src/schemas/pilatesSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/pilatesSchema.ts)에서 새 동작 초안 및 재사용 블록 폼 검증을 재수출(re-export)하여 단일 진입점으로 사용할 수 있습니다:

```ts
// src/schemas/pilatesSchema.ts 하단 추가 제안
export {
  humanMovementDraftSchema,
  humanMovementDraftContentSchema,
  subjectiveFeelLogSchema,
  draftModificationLogSchema,
  draftPhotoReferenceSchema,
  reusableBlockSchema,
  reusableBlockItemSchema,
} from './hierarchySchema';
```

### 4.3 [`src/schemas/cloudBackupSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/cloudBackupSchema.ts) 통합 제안
기존 백업 포맷(`version: 3`)과의 하위 호환성을 깨뜨리지 않도록 `cloudBackupDataSchema`에 `humanMovementDrafts`와 `reusableBlocks`를 선택(`optional()`) 필드로 추가하고, `stepSchema`는 이미 `.passthrough()`가 적용되어 있으므로 선택 메타데이터 스키마만 명시적으로 결합합니다:

```ts
// src/schemas/cloudBackupSchema.ts 추가 제안
import {
  humanMovementDraftSchema,
  movementSnapshotSchema,
  reusableBlockSchema,
  sequenceSourceProvenanceSchema,
} from './hierarchySchema';

// stepSchema 내부 선택 필드 보강 (기존 백업 100% 호환):
// blockInstanceId: idSchema.optional(),
// sourceBlockId: idSchema.optional(),
// sourceBlockVersion: z.number().int().positive().optional(),
// sourceBlockTitle: textSchema.optional(),
// blockInstanceDetached: z.boolean().optional(),
// humanDraftId: idSchema.optional(),
// humanDraftRevision: z.number().int().positive().optional(),
// exerciseSnapshot: movementSnapshotSchema.optional(),

// cloudBackupDataSchema 내부 선택 필드 추가:
export const cloudBackupDataSchema = z.object({
  // ...기존 필드 유지
  humanMovementDrafts: z.array(humanMovementDraftSchema).max(5000).optional(),
  reusableBlocks: z.array(reusableBlockSchema).max(2000).optional(),
  // sequenceSchema / historySchema는 .passthrough()로 sourceProvenance 및 sequenceSnapshot을 보존
});
```

### 4.4 [`src/utils/backupRecoveryInspection.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/backupRecoveryInspection.ts) 통합 제안
백업 파일 검사 및 충돌 없는 병합(`inspectBackupRecovery`) 시 `humanMovementDrafts`와 `reusableBlocks`를 함께 검사·병합하도록 다음과 같이 확장합니다:

```ts
// src/utils/backupRecoveryInspection.ts 확장 제안
import type { HumanMovementDraft, ReusableBlock } from '../types/hierarchy';

// 1. RecoveryCurrentState 및 RecoveryNextState에 선택 필드 추가:
//    humanMovementDrafts?: HumanMovementDraft[];
//    reusableBlocks?: ReusableBlock[];

// 2. parseInput 내 중복 ID 검사(recordSets)에 추가:
//    checked.humanMovementDrafts ?? [],
//    checked.reusableBlocks ?? [],

// 3. inspectBackupRecovery 내 known 동작 ID 집합 구성 시 humanMovementDrafts ID도 포함:
//    const known = new Set([
//      ...exercises.records.map((r) => r.id),
//      ...(current.humanMovementDrafts ?? []).map((d) => d.id),
//      ...(data.humanMovementDrafts ?? []).map((d) => d.id),
//    ]);

// 4. mergeRecords 호출 추가:
//    const humanDrafts = mergeRecords(
//      'humanMovementDrafts',
//      '새 동작 창작 초안',
//      current.humanMovementDrafts ?? [],
//      data.humanMovementDrafts ?? [],
//    );
//    const reusableBlocks = mergeRecords(
//      'reusableBlocks',
//      '재사용 블록 템플릿',
//      current.reusableBlocks ?? [],
//      data.reusableBlocks ?? [],
//    );
```

### 4.5 [`src/store/usePilatesStore.ts`](file:///home/antigravity/blue45f/pilate_flow/src/store/usePilatesStore.ts) 통합 제안
공통 스토어(`PilatesStudioState`)에 `humanMovementDrafts`와 `reusableBlocks` 상태 슬라이스 및 액션을 비침투적으로 위임 연결하는 제안입니다:

```ts
// src/store/usePilatesStore.ts 상태 및 액션 연결 제안
import type { HumanMovementDraft, ReusableBlock } from '../types/hierarchy';
import {
  createHumanMovementIdeaDraft,
  addSubjectiveFeelToDraft,
  addModificationLogToDraft,
  addPhotoReferenceToDraft,
  refineHumanDraftMetadata,
  restoreHumanDraftRevision,
} from '../utils/humanMovementCreation';
import {
  insertReusableBlockIntoSequence,
  editSequenceStepWithIsolation,
  linkHumanDraftToSequence,
  createClassSequenceSnapshot,
} from '../utils/hierarchyModel';

// PilatesStudioState 추가 필드:
// humanMovementDrafts: HumanMovementDraft[];
// reusableBlocks: ReusableBlock[];
//
// 권장 액션 위임:
// - saveHumanMovementIdea(input) -> createHumanMovementIdeaDraft 호출 후 humanMovementDrafts에 반영
// - insertBlockToActiveSequence(blockId, afterStepIndex) -> insertReusableBlockIntoSequence 호출 후 activeSteps 갱신
// - linkDraftToActiveSequence(draftId, options) -> linkHumanDraftToSequence 호출 후 activeSteps 갱신
// - setStepTimingOptions / setStepPracticeOptions / setStepBlockOptions 내부에서
//   대상 스텝에 blockInstanceId가 존재할 경우 editSequenceStepWithIsolation을 통해 blockInstanceDetached: true 자동 설정
```

### 4.6 [`src/utils/teachingHistorySnapshot.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/teachingHistorySnapshot.ts) 통합 제안
완료된 수업 이력 스냅샷(`TeachingProgramSnapshot`)과 4단계 계층 스냅샷(`ClassSequenceSnapshot`) 간의 상호 운용성 제안입니다:

```ts
// src/utils/teachingHistorySnapshot.ts 연동 제안
// 1. buildTeachingProgramSnapshot(input) 수행 시:
//    step.exerciseSnapshot (특히 sourceOrigin === 'human-created'인 초안 스냅샷)이 존재하면
//    exercisesMap 조회보다 step.exerciseSnapshot을 우선 사용하여 TeachingExerciseSnapshot을 생성합니다.
//    이를 통해 카탈로그에 등록하지 않고 바로 수업에 투입한 HumanMovementDraft의
//    당시 리비전(humanDraftRevision), 한 줄 아이디어(ideaLineSnapshot), 주관적 느낌(feelLogsSnapshot)이
//    완료된 수업 이력에도 손실 없이 박제됩니다.
//
// 2. ClassHistoryLog 저장 시:
//    attachProgramSnapshotToHistoryLog와 함께 createClassSequenceSnapshot 결과를
//    log.sequenceSnapshot에 병행 부착하면, 블록 인스턴스 분리 상태(ClassBlockSnapshot)와
//    출전 계보(SequenceSourceProvenance)까지 완벽히 보존됩니다.
```
