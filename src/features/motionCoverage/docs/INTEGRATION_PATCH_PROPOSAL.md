# `motionCoverage` 통합 Patch 제안서 (Reviewable Integration Patch Proposal)

> [!IMPORTANT]
> 본 문서는 `src/features/motionCoverage/` 소유 범위 내에서 작성된 **검토 가능한 통합 Patch 제안서(docs artifact)** 입니다.
> 공유 UI 컴포넌트(`InlineExerciseFinder.tsx`, `MovementVisualGuideCard.tsx`, `ExerciseAtlasView.tsx`, `MotionReferencePlayer.tsx`, `ExerciseEvidencePanel.tsx`) 및 `src/utils/exerciseEvidence.ts`, 기존 레지스트리, 스키마, `pnpm-lock.yaml`은 **직접 수정하지 않았으며(`git diff` 0건)**, 통합 담당자가 그대로 검토·적용할 수 있는 정확한 파일 경로, `import`/`export` 시그니처, 호출 예시, 그리고 라인 단위 `unified diff`를 제공합니다.

---

## 1. 핵심 설계 원칙 및 진실성(Truthfulness) 경계

1. **기존 98개 2D 포즈 에셋 100% 참조 재사용 (중복 에셋 0건)**
   - [`src/data/movementVisualRigCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualRigCatalog.ts#L4432-L4448)의 `MOVEMENT_VISUAL_ASSETS` / `MOVEMENT_VISUAL_ASSET_MAP` / `getMovementVisualAsset(id)` 싱글턴 에셋을 그대로 참조(`===`)하여 반환합니다 (`duplicateAssetCount: 0`, `reusedByIdentityCount: 98`).
2. **지원 수준의 4단계 엄격 구분 (`MotionSupportMode`)**
   - `'projected-3d'` (**20개** `original-*` ID, 21개 패턴): 3D 스틱/튜브 좌표(`Point3` / `BatchPoint` / `SupineReachPoint`)를 2D `<svg>` 평면에 사선 정사영(`oblique-orthographic-3d-to-2d-svg`)한 **미검수 패턴 참고 초안** (`authored-unreviewed-draft`).
   - `'continuous-2d'` (**1개** `original-mat-ankle-reach` → `supported-heel-raise`, 옵션 시 랩 프로토타입 2종): 2D 평면 좌표(`Point2`) 기반 연속 보간($t \in [0, 1]$) **미검수 초안**.
   - `'three-phase-2d'` (**77개** Primary / **98개** 전체 카탈로그): `start` / `middle` / `end` 3단계 **이산(discrete) 2D 기구학 도해** (`temporalKind: 'discrete-three-phase'`, `isContinuousPlayback: false`).
   - `'missing'` (카탈로그 외 미등록 ID, 런타임 커스텀 `idea-*` / `ex-custom-*`, 기구·자세 변조 입력): 검증된 출처 감사가 없으므로 도해 미표시.
3. **연속 모션 vs 이산 2D 도해, `projected-3d` vs 진짜 3D, `manual-ready` 및 해부학 검증 꾸밈 금지**
   - 정식 개별 연속 모션(`EXERCISE_MOTION_REFERENCES`): **98개 전량 `status: 'not_authored'`** (`canonicalAssetReady: false`, `canonicalContinuousReady: false`, `manualReady: false`).
   - 실제 3D 엔진(WebGL / Three.js / 자유 카메라 회전): **0건** (`true3dSupported: false`, `webgl3dReady: false`, `interactive3dCameraSupported: false`, `renderSurface: 'svg-2d'`).
   - 해부학적 정밀 검증 / 외부 전문가 모션 검수: **0건** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertApproved: false`, `professionalMotionReviewCount: 0`).
   - V7 리서치 후보 2종(`prone-baby-swan`, `kneeling-forearm-plank`): 본문 사실 조사만 존재하고 기하 모델 미작성(`modelAuthored: false`, `exactAssetReady: false`, `researchCandidateStatus: 'research_pending'`)이므로 절대 `ready`로 표시하지 않습니다.

---

## 2. `src/features/motionCoverage` 공개 Export 계약

통합 대상 파일들은 단일 배럴 경로 `../features/motionCoverage`에서 아래 함수와 컴포넌트를 import합니다:

```ts
import {
  // 1) 핵심 Resolver 및 카탈로그 요약
  resolveMotionCoverage,
  evaluateMotionCandidateMatch,
  resolveAllCatalogMotionCoverage,
  getMotionCoverageSummary,
  isCanonicalMotionReady,

  // 2) 기존 2D/3D 렌더러 및 ExerciseEvidence 전용 Export Adapters
  resolveVisualAssetForRenderer,
  resolvePatternReferencesForRenderer,
  resolveRenderableMotionDescriptor,
  toMovementPhaseDiagramProps,
  toAllPhaseDiagramProps,
  toMovementTriptychProps,
  toExerciseEvidenceMotionOverlay,
  toExerciseEvidenceWithMotionCoverage,

  // 3) 드롭인 UI 통합 헬퍼 컴포넌트
  MotionCoverageStatusBadge,
  MotionCoverageEvidenceDlItems,
  MotionCoverageUnifiedViewer,
} from '../features/motionCoverage';
```

---

## 3. 소비자 파일별 통합 호출 예시 및 Unified Diff

### Patch 1: [`src/utils/exerciseEvidence.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/exerciseEvidence.ts)
- **목적**: `getExerciseEvidence(exercise)` 반환 객체의 `motion` 섹션에 `coverage: ExerciseEvidenceMotionCoverageOverlay`를 연결하여 현재 도해 지원 수준(`three-phase-2d` 이산 도해 재사용 vs `continuous-2d`/`projected-3d` 연속 초안 vs `missing`), 2D SVG 사선 투영과 실제 3D 구분, `manual-ready: false` 및 해부학 미검증 한계를 구조화해 제공합니다.
- **하위호환 보장**: 기존 `motion.status: 'not-authored'`, `motion.label: '모션 제작 대기'`, `motion.professionallyApprovedCount: 0`, `motion.unreviewedLabPrototypeCount: 2`를 그대로 유지하며, `exercise.springs` 및 `exercise.cues` 문자열을 절대 포함하지 않습니다.

```diff
--- a/src/utils/exerciseEvidence.ts
+++ b/src/utils/exerciseEvidence.ts
@@ -13,6 +13,10 @@ import type {
 import { sourceReferenceSchema } from '../schemas/cloudBackupSchema';
 import type { ExerciseSourceReference, PilatesExercise } from '../types/pilates';
 import { getExerciseReviewState } from './exerciseReview';
+import {
+  toExerciseEvidenceMotionOverlay,
+  type ExerciseEvidenceMotionCoverageOverlay,
+} from '../features/motionCoverage';
 
 export interface ExerciseEvidenceLink {
   kind: 'source' | 'youtube';
@@ -66,6 +70,7 @@ export interface ExerciseEvidence {
     professionalReviewStatus: 'unreviewed';
     professionallyApprovedCount: 0;
     unreviewedLabPrototypeCount: number;
+    coverage?: ExerciseEvidenceMotionCoverageOverlay;
   };
   links: ExerciseEvidenceLink[];
   /** Exact ID discovery only; never evidence for this edited note's variant/source. */
@@ -239,6 +244,7 @@ export function getExerciseEvidence(exercise: PilatesExercise): ExerciseEvidence
       professionalReviewStatus: 'unreviewed',
       professionallyApprovedCount: MOTION_REFERENCE_COUNTS.expertApprovedMotions,
       unreviewedLabPrototypeCount: MOTION_REFERENCE_COUNTS.labPrototypes,
+      coverage: toExerciseEvidenceMotionOverlay(exercise),
     },
     links,
     candidateResearch: getMotionCandidateResearch(exercise.id),
```

---

### Patch 2: [`src/components/ExerciseEvidencePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseEvidencePanel.tsx)
- **목적**: `<ExerciseEvidencePanel />` 내 `#${id}-motion` 정의 목록(`<dl>`)에 `<MotionCoverageEvidenceDlItems exercise={exercise} />`를 연결하여 이산 2D 3단계 포즈 재사용 여부, 연속 모션 초안 여부, 실제 3D 엔진 미지원(`projected-3d` 2D SVG 투영), 해부학·전문가 검수 한계를 표시합니다.
- **하위호환 보장**: `<summary>`의 기존 3개 상태 배지(`계획`, `노트 출처`, `모션 모션 제작 대기`)와 기존 4개 `<dt>/<dd>` 항목을 그대로 유지하며, 대화형 태그(`button,input,textarea,select,iframe,img,video`)나 `role="status"`를 추가하지 않아 `src/components/ExerciseEvidencePanel.test.tsx`의 모든 기존 테스트를 통과시킵니다.

```diff
--- a/src/components/ExerciseEvidencePanel.tsx
+++ b/src/components/ExerciseEvidencePanel.tsx
@@ -4,6 +4,7 @@ import { ExternalLink, FileCheck2, ChevronDown } from 'lucide-react';
 import { getExerciseEvidence, safeEvidenceHttpUrl } from '../utils/exerciseEvidence';
 import { isRestStep } from '../utils/sequenceEngine';
 import type { PilatesExercise, SequenceStep } from '../types/pilates';
+import { MotionCoverageEvidenceDlItems } from '../features/motionCoverage';
 import '../styles/exercise-evidence-panel.css';
 
 interface ExerciseEvidencePanelProps {
@@ -201,6 +202,7 @@ export function ExerciseEvidencePanel({ exercise, step }: ExerciseEvidencePanelP
                   {motion.unreviewedLabPrototypeCount}개 · 모두 미검토 · 이 노트의 관련 제안 수와
                   별개
                 </dd>
               </div>
+              <MotionCoverageEvidenceDlItems exercise={exercise} />
             </dl>
             {motion.relatedProposals.length > 0 && (
               <ul aria-label="이 기록 ID와 대조하는 제작 제안">
```

---

### Patch 3: [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx)
- **목적**: 기존 `getMotionPatternReferences(exercise.id)` 직접 호출을 `resolvePatternReferencesForRenderer(exercise)` 및 `resolveRenderableMotionDescriptor(exercise)`로 교체합니다.
  - 연속 패턴 초안이 있는 21개 동작(`projected-3d` 20개 + `continuous-2d` 1개)은 기존과 동일하게 `<MotionPatternThumbnail />` 및 초안 미리보기를 제공합니다.
  - 연속 패턴 초안은 없으나 기존 98개 카탈로그의 2D 3단계 이산 도해가 있는 77개 동작(`three-phase-2d`)은 기존의 모호한 `"— 모션 도해 준비 중"` 대신 `"2D 3단계 이산 도해 지원 · 정식 연속 모션 대기"`로 정확히 안내하며, 출처 감사가 없는 커스텀 동작(`missing`)과 구분합니다.

```diff
--- a/src/components/InlineExerciseFinder.tsx
+++ b/src/components/InlineExerciseFinder.tsx
@@ -24,8 +24,11 @@ import {
   PfMovementCard,
 } from '../design-system';
 import { isRestStep } from '../utils/sequenceEngine';
-import { getMotionPatternReferences } from '../data/motionPatternReferences';
 import type { MotionPatternReference } from '../data/motionPatternReferences';
+import {
+  resolvePatternReferencesForRenderer,
+  resolveRenderableMotionDescriptor,
+} from '../features/motionCoverage';
 import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
 import '../styles/design-tokens.css';
 import '../styles/inline-exercise-finder.css';
@@ -105,7 +108,7 @@ export const InlineExerciseFinder: React.FC<InlineExerciseFinderProps> = ({
     const terms = filters.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
     return exercises.filter((exercise) => {
       const equipment = getExerciseEquipment(exercise);
-      const motionReferences = getMotionPatternReferences(exercise.id);
+      const motionReferences = resolvePatternReferencesForRenderer(exercise);
       if (filters.motionOnly && !motionReferences.length) return false;
       if (
         filters.equipment.length &&
@@ -487,7 +490,8 @@ export const InlineExerciseFinder: React.FC<InlineExerciseFinderProps> = ({
             const isIdea = isMovementIdeaExercise(exercise);
             const ideaMeta = isIdea ? readMovementIdeaDraft(exercise) : null;
             const canAdd = approved || isIdea;
-            const references = getMotionPatternReferences(exercise.id);
+            const references = resolvePatternReferencesForRenderer(exercise);
+            const motionDescriptor = resolveRenderableMotionDescriptor(exercise);
             const firstReference = references[0];
             const alreadyAdded = activeSteps.some(
               (step) => !isRestStep(step) && step.exerciseId === exercise.id,
@@ -513,6 +517,13 @@ export const InlineExerciseFinder: React.FC<InlineExerciseFinderProps> = ({
                 >
                   {firstReference ? (
                     <MotionPatternThumbnail reference={firstReference} />
+                  ) : motionDescriptor.mode === 'three-phase-2d' ? (
+                    <span
+                      className="ief-motion-empty"
+                      data-motion-mode={motionDescriptor.mode}
+                      data-readiness-state={motionDescriptor.readinessState}
+                    >
+                      <span aria-hidden="true">2D</span>3단계 이산 도해 · 연속 모션 대기
+                    </span>
                   ) : (
                     <span className="ief-motion-empty">
                       <span aria-hidden="true">—</span>모션 도해 준비 중
```

---

### Patch 4: [`src/components/MovementVisualGuideCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementVisualGuideCard.tsx)
- **목적**: `getMovementVisualAsset(exercise)` 호출부를 `resolveVisualAssetForRenderer(exercise)`(기존 98개 2D 포즈 참조 동일성 재사용)로 연결하고, `resolveMotionCoverage(exercise)`의 지원 수준·3D 사선 투영/이산 2D 구분 메타데이터를 뷰포트 `data-*` 속성에 노출합니다.

```diff
--- a/src/components/MovementVisualGuideCard.tsx
+++ b/src/components/MovementVisualGuideCard.tsx
@@ -10,6 +10,10 @@ import {
   calculatePhaseJointDelta,
   getMovementVisualAsset,
 } from '../data/movementVisualRigCatalog';
+import {
+  resolveMotionCoverage,
+  resolveVisualAssetForRenderer,
+} from '../features/motionCoverage';
 import type {
   JointAlignmentGuide,
   MovementDirectionVector,
@@ -759,9 +763,13 @@ export function MovementVisualGuideCard({
     peer: PilatesExercise;
   } | null>(null);
 
+  const coverage = useMemo(() => resolveMotionCoverage(exercise), [exercise]);
+
   const asset = useMemo(
     () =>
+      resolveVisualAssetForRenderer(exercise) ??
       getMovementVisualAsset(exercise) ??
       buildMovementVisualAssetForExercise(exercise),
     [exercise],
   );
@@ -1439,6 +1447,10 @@ export function MovementVisualGuideCard({
         <div
           data-testid="visual-diagram-viewport"
           data-view-mode={viewMode}
+          data-motion-primary-mode={coverage.primaryMode}
+          data-readiness-state={coverage.readinessState}
+          data-canonical-motion-ready={String(coverage.canonicalMotionReady)}
+          data-true-3d={String(coverage.safetyFlags.true3dSupported)}
           style={{
             display: 'flex',
             flexDirection: 'column',
```

---

### Patch 5: [`src/components/ExerciseAtlasView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseAtlasView.tsx)
- **목적**: 아틀라스 카드 그리드에서 `getMotionPatternReferences(exercise.id)` 대신 `resolvePatternReferencesForRenderer(exercise)` 및 `resolveRenderableMotionDescriptor(exercise)`를 사용하여 기구·자세·방향이 검증된 패턴만 연결하고, 연속 패턴 초안이 없는 카탈로그 동작에 대해 기존 98개 2D 3단계 이산 도해 지원 상태(`three-phase-2d-schematic-only`)와 정식 모션 미작성(`not_authored`)을 명확히 구분합니다.

```diff
--- a/src/components/ExerciseAtlasView.tsx
+++ b/src/components/ExerciseAtlasView.tsx
@@ -4,6 +4,10 @@ import {
   getMotionPatternReferences,
 } from '../data/motionPatternReferences';
 import type { MotionPatternReference } from '../data/motionPatternReferences';
+import {
+  resolvePatternReferencesForRenderer,
+  resolveRenderableMotionDescriptor,
+} from '../features/motionCoverage';
 import { matchesDiscoverySearch } from '../utils/discoverySearch';
 import React, { useEffect, useMemo, useRef, useState } from 'react';
@@ -796,7 +800,7 @@ export const ExerciseAtlasView: React.FC<ExerciseAtlasViewProps> = ({
         })
       )
         return false;
-      const patterns = getMotionPatternReferences(exercise.id);
+      const patterns = resolvePatternReferencesForRenderer(exercise);
       const hasProposal = patterns.length > 0;
       if (filters.motionDraft === 'proposal' && !hasProposal) return false;
       if (filters.motionDraft === 'none' && hasProposal) return false;
@@ -1394,7 +1398,8 @@ export const ExerciseAtlasView: React.FC<ExerciseAtlasViewProps> = ({
                 const isIdea = isMovementIdeaExercise(exercise);
                 const ideaMeta = isIdea ? readMovementIdeaDraft(exercise) : null;
                 const canAdd = approved || isIdea;
-                const patterns = getMotionPatternReferences(exercise.id);
+                const patterns = resolvePatternReferencesForRenderer(exercise);
+                const motionDescriptor = resolveRenderableMotionDescriptor(exercise);
                 const isFavorite = exercise.favoriteTag !== 'none';
                 const lastTaught = getExerciseLastTaughtInfo(
                   exercise.id,
@@ -1432,9 +1437,14 @@ export const ExerciseAtlasView: React.FC<ExerciseAtlasViewProps> = ({
                             <span>MOTION STUDY PENDING</span>
                           </div>
                         )}
-                        <span className="art-caption" id={`motion-caption-${exercise.id}`}>
+                        <span
+                          className="art-caption"
+                          id={`motion-caption-${exercise.id}`}
+                          data-motion-mode={motionDescriptor.mode}
+                          data-readiness-state={motionDescriptor.readinessState}
+                        >
                           {patterns[0]
                             ? `${patterns[0].title} · 관련 패턴 초안`
                             : '정확한 모션 애셋 제작 대기'}
                         </span>
                       </button>
```

---

### Patch 6: [`src/components/MotionReferencePlayer.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MotionReferencePlayer.tsx)
- **목적**: `MotionReferencePlayer`가 `resolvePatternReferencesForRenderer(exerciseId)` 및 `resolveMotionCoverage(exerciseId)`를 통해 기구·자세·방향이 일치하는 패턴 초안만 재생하고, DOM 속성으로 `data-motion-coverage-mode`, `data-readiness-state`, `data-true-3d="false"`, `data-manual-ready="false"`를 명시합니다.

```diff
--- a/src/components/MotionReferencePlayer.tsx
+++ b/src/components/MotionReferencePlayer.tsx
@@ -12,6 +12,10 @@ import { clampMotionProgress, getMotionPhase, getMotionPose } from '../utils/mot
 import type { AnatomicalSide, MotionPoint, MotionPrototypeId } from '../utils/motionReferenceModel';
 import { getMotionPatternReferences } from '../data/motionPatternReferences';
 import type { MotionPatternReference } from '../data/motionPatternReferences';
+import {
+  resolveMotionCoverage,
+  resolvePatternReferencesForRenderer,
+} from '../features/motionCoverage';
 import { MotionPatternPreview } from './MotionPatternPreview';
 import '../styles/motion-reference.css';
@@ -548,7 +552,8 @@ export function MotionReferencePlayer({
   if (kind === 'rest') return null;
   if (mode === 'prototype-lab' && !exerciseId?.trim()) return <PrototypeLab active={active} />;
   const reference = exerciseId ? getExerciseMotionReference(exerciseId) : null;
-  const patterns = exerciseId ? getMotionPatternReferences(exerciseId) : [];
+  const coverage = resolveMotionCoverage(exerciseId);
+  const patterns = exerciseId ? resolvePatternReferencesForRenderer(exerciseId) : [];
   const name = exerciseName || reference?.exerciseName || '이 동작';
   if (patterns.length)
     return (
@@ -565,6 +570,10 @@ export function MotionReferencePlayer({
       className={`motion-reference motion-reference-pending ${className}`}
       aria-label="동작 모션 제작 상태"
       data-motion-status="not_authored"
+      data-motion-coverage-mode={coverage.primaryMode}
+      data-readiness-state={coverage.readinessState}
+      data-true-3d="false"
+      data-manual-ready="false"
     >
       <span className="motion-reference-badge">모션 제작 대기</span>
       <h3>아직 연결된 도해가 없어요</h3>
```

---

## 4. 하위호환성(Backward Compatibility) 및 재현 조건

### A. 하위호환성 보장 체크리스트
1. **`src/utils/exerciseEvidence.test.ts` 무결성**:
   - `evidence.motion.status === 'not-authored'`, `evidence.motion.label === '모션 제작 대기'`, `evidence.motion.professionallyApprovedCount === 0`, `evidence.motion.unreviewedLabPrototypeCount === 2`, `evidence.planning.credentialVerified === false`가 그대로 유지됩니다.
   - `toExerciseEvidenceMotionOverlay`는 동작의 원시 `springs` 문자열이나 `cues` 문장을 일절 포함하지 않으므로 `JSON.stringify(evidence)`에 지시문이 유출되지 않습니다.
2. **`src/components/ExerciseEvidencePanel.test.tsx` 무결성**:
   - `<MotionCoverageEvidenceDlItems />`는 순수 `<div>`, `<dt>`, `<dd>` 요소만 렌더링하며 `button,input,textarea,select,iframe,img,video` 및 `role="status"`를 전혀 생성하지 않습니다.
3. **기존 98개 2D 포즈 참조 동일성(`===`) 보장**:
   - `resolveVisualAssetForRenderer(id) === getMovementVisualAsset(id)`가 98개 전체 카탈로그 동작에 대해 `true`입니다.

### B. 재현 및 검증 명령 (Reproducibility)
```bash
# 1. TypeScript 전체 프로젝트 타입 검사
./node_modules/.bin/tsc -b

# 2. motionCoverage 전용 테스트 실행 (8개 스위트)
./node_modules/.bin/vitest run src/features/motionCoverage/motionCoverage.test.tsx

# 3. 기존 exerciseEvidence 및 가이드 테스트와의 호환성 확인
./node_modules/.bin/vitest run src/utils/exerciseEvidence.test.ts src/components/ExerciseEvidencePanel.test.tsx src/test/movementVisualGuide.test.tsx

# 4. 소유 경로 외 변경 없음 확인 (git diff 0건)
git status --short && git diff --stat
```

---

## 5. 아직 검증하지 못한 부분 (Unverified / Out-of-Scope Limitations)

1. **공유 UI 컴포넌트 실제 패치 적용 후 브라우저 E2E 시각 회귀(Visual Regression)**:
   - 작업 제약상 공유 UI 파일(`InlineExerciseFinder.tsx`, `MovementVisualGuideCard.tsx`, `ExerciseAtlasView.tsx`, `MotionReferencePlayer.tsx`, `ExerciseEvidencePanel.tsx`) 및 `src/utils/exerciseEvidence.ts`를 직접 수정하지 않았으므로, 위 Patch 1~6을 통합 담당자가 실제 적용한 뒤의 전체 화면 레이아웃/CSS 줄바꿈은 통합 브랜치에서 추가 확인해야 합니다.
2. **외부 전문가(물리치료사·필라테스 마스터) 임상·해부학 검수 미수행 (`0/98`)**:
   - 코드 수준에서 기구(`apparatus`), 시작 자세(`bodyPosition`), 운동 방향, 출처 레코드(`VERIFIED_REFERENCES`) 일치를 검증했으나, 실제 인체 해부학적 관절 각도·근전도(EMG)·임상 안전성에 대한 외부 전문가 검수는 수행되지 않았습니다 (`expertApproved: false`, `anatomicalAccuracyAssumed: false`).
3. **정식 개별 연속 모션(98개 카탈로그 1:1 대응 에셋) 및 V7 리서치 후보 2종 미제작**:
   - `EXERCISE_MOTION_REFERENCES`의 98개 정식 개별 모션 에셋(`status: 'not_authored'`)과 V7 후보 2종(`prone-baby-swan`, `kneeling-forearm-plank`, `modelAuthored: false`)은 아직 기하 모델이 제작되지 않았습니다.
4. **실제 3D 엔진(WebGL / Three.js) 미구현**:
   - 현재 `'projected-3d'`로 분류된 20개 동작(21개 패턴)은 3D 좌표를 2D `<svg>` 평면에 사선 정사영(`oblique-orthographic-3d-to-2d-svg`)한 도해이며, 자유 시점 회전이나 3D 메쉬 충돌을 지원하는 실제 3D 렌더러가 아닙니다 (`true3dSupported: false`, `webgl3dReady: false`).
