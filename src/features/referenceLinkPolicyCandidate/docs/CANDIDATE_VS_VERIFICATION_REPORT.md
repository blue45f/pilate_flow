# `referenceLinkPolicyCandidate` — 통합 전 후보(Pre-Integration Candidate)와 실제 검증(Actual Verification) 구분 보고서

> [!IMPORTANT]
> 본 문서는 조정 담당자가 `main`에 순차 머지하기 전에 **통합 전 후보(Pre-Integration Candidate)의 범위·한계**와 **실제 수행된 검증(Actual Verified Evidence)**을 명확히 구분하여 기록합니다.

---

## 1. 통합 전 후보(Pre-Integration Candidate) vs 실제 검증(Actual Verification) 구분

| 구분 항목 | 통합 전 후보 (Pre-Integration Candidate — 아직 연결하지 않은 영역) | 실제 검증 완료 (Actual Verified Evidence — 본 브랜치에서 직접 입증된 영역) |
| --- | --- | --- |
| **파일 및 라우트 범위** | `src/App.tsx`, `src/components/ExerciseYouTubeGallery.tsx`, `MovementMediaGuidancePanel.tsx`, `YouTubeClipModal.tsx`, `ExerciseEvidencePanel.tsx` 등 운영 화면·라우트·공유 컴포넌트에는 **직접 연결하지 않았음** (`docs/INTEGRATION_PATCH_PROPOSAL.md`에 최소 unified diff 제안만 수록). | `src/features/referenceLinkPolicyCandidate/**` 단일 폴더 내에서 독립 모듈, 로컬 합성 iframe 픽스처(`syntheticEmbedFrame.html`), 브라우저 픽스처(`browserFixture.html`)로 100% 격리 작성 및 검증 완료. |
| **기존 카탈로그 및 렌더 경로** | `src/data/**`, `src/utils/**`, `src/schemas/**`, `package.json`, `pnpm-lock.yaml` 무수정(`git diff` 0건). | 기존 공개 URL 표본(`INITIAL_EXERCISES` 98건, `VERIFIED_REFERENCES` 30건, `PUBLIC_REFERENCES` 3건, `COURSE_REFERENCES` 20건, `VERIFIED_YOUTUBE_VIDEO_POOL` 141건, `MOTION_CANDIDATE_RESEARCH` 2건)을 인메모리 읽기 전용으로 전수 점검하여 입력 불변성·비동결 보존을 입증. |
| **동작 해부학·모션 근거 조사와의 경계** | 동작 해부학 근거 조사(`motionEvidenceReview`), 생체역학적 정확성, 임상적 안전성, 전문가 모션 검수는 **본 후보가 소유하거나 판정하지 않음**. | `REFERENCE_LINK_POLICY_CANDIDATE_SCOPE.ownsAnatomicalOrMotionEvidenceReview === false` 및 `ownsLinkAndPlayerDisplayContractOnly === true`로 계약이 고정되고 테스트로 검증됨. |
| **외부 네트워크 및 실제 YouTube/웹 서버** | 실제 외부 YouTube 서버나 외부 웹사이트(`merrithew.com`, `basipilates.com`, `nhs.uk` 등)로 네트워크 요청·크롤링·영상 다운로드를 수행하거나 접근 차단(403 등)을 우회하지 않음. | 로컬 합성 iframe 픽스처(`syntheticEmbedFrame.html`)와 CDP 네트워크 감사(`externalNetworkRequestCount: 0`)를 통해 외부 요청 0건 상태에서 클릭 전 미로드(`autoplay=0`), 클릭 후 수동 마운트, 런타임 차단/오류 시 외부 링크 폴백을 검증함. |

---

## 2. 2트랙 다이나믹 워크플로우 수행 및 독립 검증 보정 내역

### 2.1 트랙 1 (구현 트랙)
- `types.ts`, `urlPolicyEngine.ts`, `playerDisplayContract.ts`, `catalogSampleAudit.ts`, `ReferenceLinkPolicyPreview.tsx`, `referenceLinkPolicy.css`, `syntheticEmbedFrame.html`, `browserFixture.html`, `index.ts`
- 트랙 1 자체 테스트: `urlPolicyEngine.test.ts` (8건) + `ReferenceLinkPolicyPreview.test.tsx` (4건) = **12건 통과**.

### 2.2 트랙 2 (독립 검증 트랙 — 파일 분리)
- 분리 경로: `src/features/referenceLinkPolicyCandidate/independentVerification/**`
  - `referenceLinkPolicy.independent.test.tsx` (9개 독립 경계·보안·DOM 테스트)
  - `verifyReferenceLinkPolicyBrowser.mjs` (320px / 390px / 768px / 1440px 헤드리스 Chromium CDP 검증)
- **트랙 2가 실제 재현·발견하여 트랙 1에서 보정한 결함 2건**:
  1. **IPv4-mapped IPv6 사설/루프백 주소(`http://[::ffff:127.0.0.1]/`) 정규화 우회**:
     - 원인: WHATWG `new URL()` 파서가 `[::ffff:127.0.0.1]`을 16진수 형태인 `[::ffff:7f00:1]`로 정규화하여 기존 `host.startsWith('::ffff:127.')` 문자열 검사를 통과함.
     - 보정: `isPrivateOrLocalHostname`에서 모든 raw IPv6 리터럴(`host.includes(':')`)을 raw IPv4 리터럴과 동일하게 차단하여 우회 경로를 원천 봉쇄함.
  2. **React 19 비버블링 `<iframe onError>` 이벤트 미수신**:
     - 원인: React 19(`react-dom@19`)는 `iframe` 태그에 대해 non-delegated `error` 리스너를 개별 부착하지 않고 루트 컨테이너의 캡처 단계 리스너만 등록하므로 `onError`만으로는 네이티브 `iframe` `error` 이벤트가 호출되지 않음.
     - 보정: `<iframe data-testid="rlpc-synthetic-iframe" />`에 `onErrorCapture={handleSimulatePlaybackError}`를 함께 연결하여 네이티브 `error` 이벤트 발생 시 즉시 `<iframe>`을 언마운트하고 `external-link-only` 폴백 상자로 전환되도록 수정함.

---

## 3. 재현 명령어 (외부 네트워크·추가 패키지 설치 불필요)

```bash
# 1. 단위·컴포넌트·독립 경계 테스트 (3파일 21테스트)
node node_modules/vitest/vitest.mjs run src/features/referenceLinkPolicyCandidate

# 2. TypeScript 및 ESLint 검사
pnpm exec tsc -b --pretty false
pnpm exec eslint src/features/referenceLinkPolicyCandidate

# 3. 로컬 합성 iframe 픽스처 기반 헤드리스 Chrome 브라우저 검증 (320/390/768/1440px)
node src/features/referenceLinkPolicyCandidate/independentVerification/verifyReferenceLinkPolicyBrowser.mjs
```
