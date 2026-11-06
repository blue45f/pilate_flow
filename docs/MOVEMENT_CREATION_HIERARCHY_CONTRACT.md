# 새 동작 창작 도구 및 4단계 계층(동작 → 재사용 블록 → 시퀀스 → 수업) 데이터·저장 계약서

본 문서는 **사람이 직접 구상·시도하며 만드는 미완성 새 동작 초안(`HumanMovementDraft`)**부터 **재사용 블록(`ReusableBlock`) → 시퀀스(`Sequence`) → 수업(`ClassSequenceSnapshot`)**까지의 공통 스키마·저장·검증 계약을 정의하고, 병렬 진행 중인 디자인 시스템·인증·공통 백업 담당과의 경계 및 통합 제안을 정리합니다.

---

## 1. 작업 소유 범위 및 제외 범위 선언 (Scope & Ownership Boundary)

### 1.1 본 계층·저장 세션의 소유 파일 (Owned Files)
- [`src/types/hierarchy.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/hierarchy.ts): 새 동작 초안, 주관적 느낌/수정점/사진 참조, 수정 이력, 4단계 계층 스냅샷 및 검증 타입 정의 (`declare module './pilates'`를 통한 비침투적 타입 확장 포함)
- [`src/schemas/hierarchySchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/hierarchySchema.ts): 최소 1줄 아이디어 저장, 주관적 체감/객관적 효능 분리, 로컬 사진 참조 보안, 수정 이력 및 계층별 Zod 검증 스키마
- [`src/utils/humanMovementCreation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/humanMovementCreation.ts): 한 줄 아이디어 초안 생성, 점진적 느낌·수정점·사진·메타데이터 추가, 수정 이력 복원, 실패 시 입력 보존 저장소(`createHumanDraftRepository`), 후속 단계별 수업 연결 안내(`evaluateDraftStageReadiness`)
- [`src/utils/hierarchyModel.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/hierarchyModel.ts): 동작(카탈로그 + 사람 창작 초안) → 재사용 블록 → 시퀀스 → 수업 불변 스냅샷 생성 및 과거 스냅샷 기반 새 초안 복제
- [`src/utils/sequenceValidation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceValidation.ts): 하위 시간 합산(동작·설명·기구 전환·휴식), 순서·반복·세트·좌우 균형 검증, 난이도 흐름 검증, AI 자동 추천 경계 vs 사람 창작 동작 허용 경계(`validateMovementSourceBoundary`)
- [`src/test/humanMovementCreation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/humanMovementCreation.test.ts): 새 동작 창작·점진적 기록·실패 보존·수정 이력 단위/통합 테스트
- [`src/test/hierarchyModel.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/hierarchyModel.test.ts): 4단계 계층 연결·블록 편집/복사 분리·원본 수정 후 과거 수업 스냅샷 불변 테스트
- [`src/test/sequenceValidation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/sequenceValidation.test.ts): 하위 시간 합산·좌우 균형·난이도 흐름·AI 추천 경계와 사람 창작 허용 경계 검증 테스트

### 1.2 제외 범위 (Excluded Scope — 다른 담당 영역으로 수정하지 않음)
- **디자인 시스템 / 화면 / 쉬운 용어 / 첫 사용 폼 UI**: `src/components/**`, `src/styles/**`, `src/App.tsx` (별도 Pilate Flow 디자인 시스템 고도화 세션 담당)
- **로그인 · 인증 · 서버 백업 API**: `backend/**`, `src/lib/cloudSync.ts`, `src/lib/localAppDeploy.ts`, `src/lib/recoveryStorageGuard.ts`
- **미디어 · 모션 연구실**: `src/components/YouTubeClipModal.tsx`, `src/components/MotionDraftLabDialog.tsx`, `src/models/**`
- **공통 스토어 및 클라우드 백업 와이어 스키마 원본**: `src/types/pilates.ts`, `src/schemas/cloudBackupSchema.ts`, `src/utils/backupRecoveryInspection.ts`, `src/store/usePilatesStore.ts` (직접 덮어쓰지 않고 아래 **제5장**에 통합 담당용 패치 제안을 제공)

---

## 2. 새 동작 창작 도구 데이터·저장 계약 (`HumanMovementDraft`)

### 2.1 최소 한 줄 아이디어 저장 (Zero Mandatory Advanced Metadata)
- **필수 입력**: `ideaLine: string` (공백 제외 1자 이상 1000자 이하) **단 하나만 필수**입니다.
- **비필수(선택) 항목**:
  - 완성된 동작 이름(`workingNameKo`), 기구(`apparatus`), 수업 구간(`sectionRole`), 동작 분류(`blockCategory`), 난이도(`level`), 기본 시간(`defaultDurationMin`), 반복(`defaultRepetitions`), 세트(`defaultSets`), 좌우 여부(`isUnilateral`, `sideMode`), 해부학 용어(`spinalPlanes`, `targetMuscles`, `bodyPosition`)가 **모두 비어 있어도(`undefined`) 즉시 `'idea-only'` 단계 초안으로 저장·복구**됩니다.

### 2.2 점진적 기록: 직접 해본 느낌 · 수정할 점 · 사진 참조
1. **느낀 점 (`feelLogs: SubjectiveFeelLog[]`)**:
   - 강사가 직접 동작을 수행해 본 뒤 느낀 자극·움직임 감각(`feelNoteKo`), 체감 강도(`perceivedIntensity`), 주의할 느낌(`cautionFeelKo`)을 기록합니다.
   - **주관적 느낌 vs 객관적 효과/안전성 분리 원칙**:
     - 모든 `SubjectiveFeelLog` 및 `HumanMovementDraft.safetyBoundary`는 다음 리터럴 계약을 강제합니다:
       - `evaluationBasis: 'subjective-instructor-feel'`
       - `objectiveEfficacyClaimed: false`
       - `aiSafetyGuaranteed: false` (또는 `safetyGuaranteed: false`)
       - `expertVerified: false`
     - AI나 시스템이 안전성·의학적/운동학적 효과를 보장하거나 전문가 검증을 받았다고 표시하는 값은 스키마(`subjectiveFeelLogSchema`, `movementSafetyAndEfficacyBoundarySchema`) 수준에서 즉시 거부됩니다.
2. **수정할 점 (`modificationLogs: DraftModificationLog[]`)**:
   - 직접 해본 뒤 바꾸기로 한 동작 포인트(`modificationPointKo`), 스프링·세팅 변경점(`setupOrSpringChangeKo`), 큐잉 변경점(`cueChangeKo`)을 점진적으로 추가하며, 어느 수정 버전(`appliedToRevision`)에 반영되었는지 추적합니다.
3. **사진 참조 (`photoReferences: DraftPhotoReference[]`)**:
   - 로컬/앱 내부 참조(`local-photo://`, `blob:`, `asset://`, `file://`)만 허용하며 외부 URL(`http://`, `https://`) 및 외부 AI 전송(`externalAiUploadAllowed: false`)을 스키마에서 차단합니다.

### 2.3 수정 이력 (`revisionHistory: DraftRevisionEntry[]`) 및 복원
- 초안 생성(`initial-idea`), 아이디어 수정(`idea-updated`), 느낌 추가(`feel-added`), 수정점 추가(`modification-added`), 사진 추가(`photo-added`), 세부 메타데이터 보완(`metadata-refined`), 이전 버전 복원(`restored-revision`)마다 `revision`이 1씩 증가하고 당시의 `contentSnapshot`이 `Object.freeze`로 보관됩니다.
- `restoreHumanDraftRevision(draft, targetRevision)` 호출 시 기존 이력을 삭제하지 않고 `targetRevision`의 내용을 복원한 새 리비전(`revision + 1`, `parentRevision: targetRevision`)을 생성합니다.

### 2.4 저장·검증·스토리지 실패 시 입력 보존 (`PreservedCreationInputState`)
- `createHumanDraftRepository`는 입력 검증 실패(빈 아이디어, 허용되지 않는 외부 사진 URL 등) 또는 브라우저 스토리지 기록 실패(`localStorage.setItem` 예외)가 발생하더라도:
  1. 사용자가 방금 입력 중이던 값(`ideaLine`, `workingNameKo`, `pendingFeelNoteKo`, `pendingModificationPointKo`, `pendingPhotoUri`, `pendingOverrides`)을 `preservedInput`에 그대로 보존합니다.
  2. 기존에 저장된 `drafts` 및 `revisionHistory`를 절대 손상시키지 않습니다.

---

## 3. 4단계 계층 연결 및 편집/복사/스냅샷 정책 (`동작 → 재사용 블록 → 시퀀스 → 수업`)

### 3.1 AI 자동 추천 경계 vs 사람 창작 동작 허용 경계
- **AI 자동 추천 (`mode: 'ai-auto-recommendation'`)**:
  - 검증된 카탈로그 동작 ID만 조합할 수 있으며, 미검증 초안이나 존재하지 않는 ID를 임의로 생성·추천할 수 없습니다 (`validateMovementSourceBoundary`).
- **사람의 새 동작 창작 및 수업 활용 (`mode: 'human-creation'`)**:
  - 강사가 직접 만든 `HumanMovementDraft`는 카탈로그 등록 여부나 `review.status === 'approved'` 여부와 무관하게 **재사용 블록(`linkHumanDraftToReusableBlock`), 시퀀스(`linkHumanDraftToSequence`), 수업 스냅샷(`createClassSequenceSnapshot`)에 즉시 연결 가능**합니다.

### 3.2 후속 단계별 수업 사용 검증 및 안내 (`evaluateDraftStageReadiness`)
- **초안 저장 단계 (`'idea-save'`)**: `ideaLine`만 있으면 통과 (`canSaveIdeaDraft: true`).
- **블록/시퀀스/수업 연결 단계 (`'block-link' | 'sequence-link' | 'class-confirm'`)**:
  - 초안에 `apparatus`, `defaultDurationMin`, `sectionRole`, `sideMode`가 아직 비어 있는 경우 연결을 차단하지 않고 안전한 기본값(`mat`, `4분`, `main`, `together`) 또는 연결 시점 오버라이드(`DraftClassLinkOverrides`)를 적용한 뒤, `guidanceNoticesKo`와 시퀀스 검증 경고(`code: 'draft-metadata-guidance'`, `severity: 'warning'`)로 강사에게 안내합니다.

### 3.3 하위 시간 합산 및 순서·반복·세트·좌우 균형 정책
- **하위 시간 자동 합산 (`calculateSequenceTimeBreakdown`)**:
  - 각 동작 단계의 `durationMin`(총 배정 시간) 안에서 `explanationSec`(설명 시간) + `transitionSec`(기구/세팅 전환 시간) + 순수 `movementSec`(동작 수행 시간)을 계산하고, 휴식 단계(`restSec`)를 합산하여 시퀀스 총 시간(`totalSec`) 및 구간별 시간(`preparationSec`, `mainSec`, `cooldownSec`, `restSec`)을 산출합니다.
- **순서 · 반복 · 세트 · 좌우(`sideMode`)**:
  - 편측 동작(`isUnilateral: true`)이 `'left'` 또는 `'right'` 단독으로만 배치되었거나 좌·우 수행 시간/반복 횟수(`repetitions * sets`)가 불균형할 때 검출하며, `balanceSequenceUnilateralSides`로 강사가 즉시 균형을 맞출 수 있습니다.

### 3.4 재사용 블록 편집 vs 시퀀스 내부 복사본 편집 정책
- **블록 라이브러리 템플릿 편집 (`updateReusableBlockTemplate`, `linkHumanDraftToReusableBlock`, 등)**:
  - `ReusableBlock.version`을 증가시키며, 이미 해당 블록을 삽입한 기존 시퀀스들을 자동으로 덮어쓰지 않습니다.
- **시퀀스 내 블록 인스턴스 편집 (`editSequenceStepWithIsolation`, `adjustSequenceBlockInstanceDuration`, 등)**:
  - 블록 삽입 시 부여된 `blockInstanceId` 단위로 시퀀스 내부에서만 수정되며 `blockInstanceDetached: true`로 표시됩니다. 원본 `ReusableBlock` 템플릿이나 다른 시퀀스에는 변경이 전파되지 않습니다.

### 3.5 과거 수업 스냅샷 불변 보장 (`ClassSequenceSnapshot`)
- 수업 저장/확정 시 `createClassSequenceSnapshot`이 호출되어 당시 시퀀스의 단계, 블록 버전(`ClassBlockSnapshot`), 그리고 각 동작(사람이 만든 초안 포함)의 `MovementSnapshot`(`ideaLineSnapshot`, `feelLogsSnapshot`, `modificationLogsSnapshot`, `photoReferencesSnapshot`, `humanDraftRevision`, `safetyBoundarySnapshot`)을 깊은 동결(`deepFreeze`)로 보관합니다.
- 이후 원본 `HumanMovementDraft`의 아이디어·느낌·수정점·사진·시간·기구를 수정하거나 삭제하더라도 **과거 수업 스냅샷(`ClassSequenceSnapshot`)은 1바이트도 변하지 않습니다**.
- 과거 수업 스냅샷에서 `cloneClassSnapshotToDraft`로 언제든 새 편집 초안을 복제할 수 있으며, 출처 버전 정보(`SequenceSourceProvenance`)가 명시적으로 기록됩니다.

---

## 4. 디자인 시스템 UI 담당을 위한 연결 가이드 (UI Integration Guide)

디자인 시스템 담당 세션에서 첫 사용 폼 및 점진적 노출 UI를 연결할 때 아래 순수 함수/저장소 API를 바로 호출할 수 있습니다:

```ts
import {
  createHumanDraftRepository,
  evaluateDraftStageReadiness,
} from '../utils/humanMovementCreation';
import {
  linkHumanDraftToReusableBlock,
  linkHumanDraftToSequence,
  createClassSequenceSnapshot,
  cloneClassSnapshotToDraft,
} from '../utils/hierarchyModel';
import { validateSequenceHierarchy } from '../utils/sequenceValidation';
```

1. **첫 사용 1줄 초안 폼**: `repo.saveIdeaDraft({ ideaLine })` — 분류/해부학 입력 없이 한 줄 텍스트만으로 즉시 저장.
2. **직접 해본 뒤 점진적 추가 시트**:
   - 느낀 점: `repo.appendFeelLog(draftId, { feelNoteKo, perceivedIntensity })` (UI 배지에 `safetyBoundary.disclaimerKo` 표기 권장: *"주관적 체감 메모 · 객관적 효과/안전성 보증 아님"*)
   - 수정할 점: `repo.appendModificationLog(draftId, { modificationPointKo, setupOrSpringChangeKo })`
   - 로컬 사진: `repo.appendPhotoReference(draftId, { localRefUri, captionKo, angleTag })`
3. **모바일 기록 → 수정 → 수업 넣기 연결**:
   - `linkHumanDraftToSequence(activeSteps, draft, { overrides })` 호출 후 반환된 `guidanceNoticesKo`를 토스트/배너로 안내.

---

## 5. 공통 파일 통합 담당을 위한 비침투적 패치 제안 (Shared File Integration Proposal)

공통 백업/스토어 통합 담당자가 전체 클라우드 백업(`cloudBackupDataSchema`)에 `humanMovementDrafts`와 `reusableBlocks`를 병합할 때 아래 최소 변경만 추가하면 됩니다:

1. **`src/schemas/cloudBackupSchema.ts` 제안**:
   ```ts
   import { humanMovementDraftSchema, reusableBlockSchema } from './hierarchySchema';
   // cloudBackupDataSchema 내부에 선택 필드로 추가 (기존 백업 v3와 100% 하위 호환):
   humanMovementDrafts: z.array(humanMovementDraftSchema).max(5000).optional(),
   reusableBlocks: z.array(reusableBlockSchema).max(2000).optional(),
   ```
2. **`src/utils/backupRecoveryInspection.ts` 제안**:
   - `RecoveryCurrentState` / `RecoveryNextState`에 `humanMovementDrafts?: HumanMovementDraft[]`, `reusableBlocks?: ReusableBlock[]` 선택 필드 추가 및 `mergeRecords('humanMovementDrafts', '새 동작 창작 초안', ...)` 병합 연결.
