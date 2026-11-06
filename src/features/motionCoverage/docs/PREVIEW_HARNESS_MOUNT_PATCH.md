# 로컬 검수용 `MotionCoveragePreviewHarness` 및 `MotionCoveragePlaybackController` 통합 안내 (미적용 최소 Patch)

> [!IMPORTANT]
> - 본 문서는 `src/features/motionCoverage/` 내부에 격리 구현된 **`MotionCoveragePlaybackController`** 및 **`MotionCoveragePreviewHarness`**를 통합 담당자가 필요 시 연결할 수 있도록 제공하는 **미적용(unapplied) 최소 patch 제안**입니다.
> - 소유권 경계 준수를 위해 `src/App.tsx` 및 공유 UI·라우터·스토어 파일은 직접 수정하지 않았습니다 (`git diff` 기준 공유 파일 변경 0건).

---

## 1. Export / Import 경로 및 호출 예시

### 1.1 모듈 Export 목록 ([`src/features/motionCoverage/index.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/index.ts))
```ts
import {
  MotionCoveragePlaybackController,
  MotionCoveragePreviewHarness,
  MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS,
  runMotionCoverageCatalogSweep,
  type MotionCoveragePlaybackSnapshot,
  type MotionCoveragePlaybackControllerOptions,
  type MotionCoveragePreviewHarnessProps,
} from './features/motionCoverage';
```

### 1.2 단독 렌더링 호출 예시
```tsx
import { MotionCoveragePreviewHarness } from './features/motionCoverage';

export function LocalMotionCoverageInspectorModal() {
  return (
    <MotionCoveragePreviewHarness
      initialExerciseOrId="ex-warmup-01"
      resolveOptions={{ includeLabPrototypesInContinuous2d: false }}
    />
  );
}
```

### 1.3 프로그래매틱 98종 전수 순회 검증 호출 예시
```ts
import { runMotionCoverageCatalogSweep } from './features/motionCoverage';

const report = runMotionCoverageCatalogSweep();
// report.totalCatalogCount === 98
// report.countsByMode === { 'three-phase-2d': 77, 'continuous-2d': 1, 'projected-3d': 20, missing: 0 }
// report.reused2dPoseAssetCount === 98
// report.newlyCreatedAssetCount === 0
// report.discreteExercisesNeverPlayedCount === 77
// report.continuousExercisesVerifiedCount === 21
// report.controllerDestroyedCleanly === true
```

---

## 2. 미적용 최소 Unified Diff 제안 (개발/테스트 쿼리 파라미터 `?pf_mc_preview=1` 조건부 마운트)

기존 [`src/App.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx)의 `?pf_ds_inspect=1` (`DesignSystemInspector`) 패턴과 동일하게, 일반 사용자 화면이나 백업 이력(Backup History) 작업 영역과 충돌하지 않도록 개발/검수 쿼리 파라미터(`?pf_mc_preview=1`)가 있을 때만 선택적으로 다이얼로그로 열 수 있는 최소 diff입니다.

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -37,6 +37,7 @@ import {
    SegmentedControl,
    StatusPill,
 } from './design-system';
+import { MotionCoveragePreviewHarness } from './features/motionCoverage';
 
 export function App() {
   const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === 'test';
@@ -155,6 +156,11 @@ export function App() {
     return new URLSearchParams(window.location.search).get('pf_ds_inspect') === '1';
   });
+  const [motionPreviewOpen, setMotionPreviewOpen] = useState(() => {
+    if (!isDevOrTest || typeof window === 'undefined') return false;
+    return new URLSearchParams(window.location.search).get('pf_mc_preview') === '1';
+  });
 
   // ... 기존 렌더링 하단 검수 다이얼로그 영역 ...
+  {isDevOrTest && motionPreviewOpen && (
+    <LightDismissDialog
+      open={motionPreviewOpen}
+      onClose={() => setMotionPreviewOpen(false)}
+      title="모션 도해 지원 수준 로컬 검수 프리뷰"
+    >
+      <MotionCoveragePreviewHarness initialExerciseOrId="ex-warmup-01" />
+    </LightDismissDialog>
+  )}
```
