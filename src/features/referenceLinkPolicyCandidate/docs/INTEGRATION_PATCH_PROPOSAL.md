# `referenceLinkPolicyCandidate` — 공통 파일 무수정 원칙 및 최소 통합 Patch 제안서

> [!IMPORTANT]
> - 본 문서는 `src/features/referenceLinkPolicyCandidate/**` 독점 소유 범위 안에서 작성된 **통합 전 후보(pre-integration candidate) 최소 Patch 제안서**입니다.
> - 기존 카탈로그(`src/data/**`), 유틸리티(`src/utils/**`), 스키마(`src/schemas/**`), 공유 라우트 및 컴포넌트(`src/App.tsx`, `src/components/**`)는 **직접 수정하지 않았습니다(`git diff` 0건)**.
> - 본 모듈은 **참고 링크 정규화·중복 병합·악성 스킴 차단·임베드 불가 시 외부 링크 분리·사용자 클릭 전 autoplay 방지·개인정보/추적 쿼리 제거** 및 **플레이어 표시 계약**만 소유합니다. 동작 해부학 근거 조사(`motionEvidenceReview`), 임상 적합성 판정, 전문가 모션 검수는 소유하지 않습니다.

---

## 1. 공개 배럴 Export 시그니처 (`src/features/referenceLinkPolicyCandidate`)

```ts
import {
  // 1) 단일 URL 정규화·악성 스킴 차단·개인정보 쿼리 마스킹·임베드/외부링크 분리
  normalizeReferenceUrlPolicy,
  isStrictNoAutoplayEmbedUrl,
  parseYouTubeTimeParamSeconds,
  buildLocalSyntheticIframeFixtureUrl,

  // 2) 동작별 후보 링크 중복 병합·우선순위 평가·카탈로그 표본 감사
  evaluateReferenceLinkCandidates,
  resolveExerciseReferenceLinkPolicyReport,
  auditExistingPublicUrlSamples,

  // 3) 사용자 클릭 전 Autoplay 방지 및 런타임 실패 외부링크 폴백 컨트롤러/UI
  createReferencePlayerDisplayController,
  ReferenceLinkPolicyPreview,
  ReferenceLinkPolicyFixtureHarness,
} from '../features/referenceLinkPolicyCandidate';
```

---

## 2. 공유 컴포넌트별 최소 통합 Unified Diff 제안 (조정 담당자 순차 머지용)

### 2.1 [`src/components/ExerciseYouTubeGallery.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseYouTubeGallery.tsx#L196-L224)

- **목적**: 인라인 갤러리에서 외부 원본 링크(`watchUrl`)와 수동 클릭 임베드(`embedUrl`)를 렌더링할 때 `normalizeReferenceUrlPolicy`를 통과시켜 `si`·`utm_*`·개인정보 쿼리를 제거하고, `isStrictNoAutoplayEmbedUrl`이 검증된 `https://www.youtube-nocookie.com/embed/{id}?rel=0&autoplay=0` URL만 `<iframe>`에 주입합니다.

```diff
--- a/src/components/ExerciseYouTubeGallery.tsx
+++ b/src/components/ExerciseYouTubeGallery.tsx
@@ -8,6 +8,10 @@ import {
 import type { CuratedYouTubeVideoItem } from '../data/exerciseYouTubeCatalog';
 import type { MotionPatternReference } from '../data/motionPatternReferences';
 import type { PilatesExercise } from '../types/pilates';
+import {
+  isStrictNoAutoplayEmbedUrl,
+  normalizeReferenceUrlPolicy,
+} from '../features/referenceLinkPolicyCandidate';
 import '../styles/exercise-youtube-gallery.css';
 
 interface ExerciseYouTubeGalleryProps {
@@ -87,6 +91,13 @@ const ExerciseYouTubeGalleryContent: React.FC<ExerciseYouTubeGalleryProps> = ({
     () => videos.find((v) => v.videoId === activeVideoId) ?? null,
     [videos, activeVideoId],
   );
+  const activePolicy = useMemo(
+    () =>
+      activeVideo
+        ? normalizeReferenceUrlPolicy(activeVideo.watchUrl, {
+            embedPolicy: 'youtube-nocookie-allowed',
+            startSec: activeVideo.startSec ?? null,
+          })
+        : null,
+    [activeVideo],
+  );
 
   const krCount = videos.filter((v) => v.region === 'kr').length;
   const globalCount = videos.filter((v) => v.region === 'global').length;
@@ -194,7 +205,7 @@ const ExerciseYouTubeGalleryContent: React.FC<ExerciseYouTubeGalleryProps> = ({
                     </button>
                   )}
                   <a
-                    href={activeVideo.watchUrl}
+                    href={activePolicy?.canonicalExternalUrl ?? activeVideo.watchUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="eyg-ext-link"
@@ -211,15 +222,17 @@ const ExerciseYouTubeGalleryContent: React.FC<ExerciseYouTubeGalleryProps> = ({
                   </button>
                 </div>
               </div>
-              <div className="eyg-iframe-wrap">
-                <iframe
-                  src={`${activeVideo.embedUrl}&autoplay=0`}
-                  title={`${activeVideo.title} - ${activeVideo.authorName}`}
-                  allow="encrypted-media; gyroscope; picture-in-picture"
-                  allowFullScreen
-                  referrerPolicy="strict-origin-when-cross-origin"
-                />
-              </div>
+              {activePolicy?.embedAllowed &&
+                isStrictNoAutoplayEmbedUrl(activePolicy.embedUrl) && (
+                  <div className="eyg-iframe-wrap">
+                    <iframe
+                      src={activePolicy.embedUrl!}
+                      title={`${activeVideo.title} - ${activeVideo.authorName}`}
+                      allow={activePolicy.iframeAllowAttr}
+                      allowFullScreen
+                      referrerPolicy={activePolicy.iframeReferrerPolicy}
+                    />
+                  </div>
+                )}
             </div>
           )}
```

---

### 2.2 [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L757-L787)

- **목적**: 동작 상세 모달(`MovementDetails`)에서 직접 입력된 YouTube 참조(`exercise.youtube`)와 원출처(`primarySource.url`)를 표시할 때, 개인정보·추적 파라미터(`si`, `utm_*`, 이메일/토큰 등)를 제거하고 지원되지 않는 임베드는 외부 링크로만 분리합니다.

```diff
--- a/src/components/YouTubeClipModal.tsx
+++ b/src/components/YouTubeClipModal.tsx
@@ -50,6 +50,7 @@ import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
 import { ExerciseYouTubeGallery } from './ExerciseYouTubeGallery';
 import { MovementArt } from './MovementArt';
 import { MotionReferencePlayer } from './MotionReferencePlayer';
 import { MovementMediaGuidancePanel } from './MovementMediaGuidancePanel';
+import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate';
 import '../styles/library.css';
 import '../styles/review-usability.css';
@@ -755,12 +756,15 @@ const MovementDetails: React.FC<{
   const hasOptionalVideo = Boolean(exercise.youtube.url.trim());
   const showVideoSource =
     hasOptionalVideo || (!primarySource && !exercise.id.startsWith('ex-custom-own-'));
-  const link = getMovementVideoLink(exercise);
-  const { videoId, startSec, endSec } = exercise.youtube;
+  const rawLink = getMovementVideoLink(exercise);
+  const { startSec, endSec } = exercise.youtube;
   const safeStart = Math.max(0, Math.floor(startSec || 0));
   const safeEnd = endSec && endSec > safeStart ? Math.floor(endSec) : null;
-  const embedUrl = link
-    ? `https://www.youtube-nocookie.com/embed/${videoId}?start=${safeStart}${safeEnd ? `&end=${safeEnd}` : ''}&rel=0&autoplay=0`
-    : '';
+  const normalizedVideoPolicy = rawLink
+    ? normalizeReferenceUrlPolicy(rawLink, {
+        embedPolicy: 'youtube-nocookie-allowed',
+        startSec: safeStart,
+        endSec: safeEnd,
+      })
+    : null;
+  const link = normalizedVideoPolicy?.canonicalExternalUrl ?? null;
+  const embedUrl = normalizedVideoPolicy?.embedUrl ?? '';
```

---

### 2.3 [`src/components/ExerciseEvidencePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseEvidencePanel.tsx#L163-L177)

- **목적**: 근거 패널(`ExerciseEvidencePanel`) 내 외부 링크(`evidence.links` 및 `candidateResearch` 원문 링크)를 렌더링할 때 `normalizeReferenceUrlPolicy(href, { embedPolicy: 'external-link-only', forbidTimeSeekTransplant: true })`를 거치게 하여 악성 스킴·사설 IP·추적 쿼리를 차단하고 원출처 관찰 시점이 시크 파라미터로 오용되지 않게 보장합니다. (기존 `<summary>` 배지 및 `<dl>` 구조는 100% 보존)

```diff
--- a/src/components/ExerciseEvidencePanel.tsx
+++ b/src/components/ExerciseEvidencePanel.tsx
@@ -3,6 +3,7 @@ import { ChevronDown, ExternalLink, FileCheck2 } from 'lucide-react';
 import type { PilatesExercise, SequenceStep } from '../types/pilates';
 import { getExerciseEvidence, safeEvidenceHttpUrl } from '../utils/exerciseEvidence';
 import { isRestStep } from '../utils/sequenceEngine';
+import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate';
 import '../styles/exercise-evidence.css';
 import '../styles/motion-review-worksheet.css';
@@ -162,16 +163,23 @@ export function ExerciseEvidencePanel({ exercise, step }: ExerciseEvidencePanelP
             )}
             {evidence.links.length > 0 && (
               <div className="eep-links">
-                {evidence.links.map((link) => (
-                  <a
-                    key={`${link.kind}-${link.href}`}
-                    href={link.href}
-                    target="_blank"
-                    rel="noopener noreferrer"
-                  >
-                    {link.label} <ExternalLink size={14} aria-hidden="true" />
-                  </a>
-                ))}
+                {evidence.links.map((link) => {
+                  const policy = normalizeReferenceUrlPolicy(link.href, {
+                    embedPolicy: 'external-link-only',
+                    forbidTimeSeekTransplant: link.kind === 'source',
+                  });
+                  if (!policy.ok || !policy.canonicalExternalUrl) return null;
+                  return (
+                    <a
+                      key={`${link.kind}-${policy.canonicalExternalUrl}`}
+                      href={policy.canonicalExternalUrl}
+                      target="_blank"
+                      rel="noopener noreferrer"
+                    >
+                      {link.label} <ExternalLink size={14} aria-hidden="true" />
+                    </a>
+                  );
+                })}
               </div>
             )}
```

---

### 2.4 [`src/components/MovementMediaGuidancePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementMediaGuidancePanel.tsx#L493-L508)

- **목적**: `MovementMediaGuidancePanel`의 수동 임베드 플레이어 또는 개발자/강사용 링크 정책 점검 탭에서 `<ReferenceLinkPolicyPreview exercise={exercise} iframeMode="production-nocookie" />` 또는 `resolveExerciseReferenceLinkPolicyReport(exercise)`를 선택적으로 조합할 수 있습니다.
