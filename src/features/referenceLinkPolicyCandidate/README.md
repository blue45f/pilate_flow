# 동작별 참고 영상·링크 표시 계약 후보 (`referenceLinkPolicyCandidate`)

Pilates 동작별 참고 영상과 외부 출처 링크를 표시하기 전에 **URL 정규화, 중복 병합, 악성 스킴·사설 IP·다운로더 차단, 개인정보·추적 쿼리 마스킹 제거, 임베드 불가 출처의 외부 링크 분리, 사용자 클릭 전 자동재생(autoplay) 방지**를 수행하고 검증하는 **독립 후보 모듈(`src/features/referenceLinkPolicyCandidate/**`)**입니다.

---

## 1. 소유 범위 및 경계 선언 (Ownership & Read-Only Boundaries)

- **독점 신규 작성 경로**: `src/features/referenceLinkPolicyCandidate/**`
- **기존 구현·공통 설정 READ-ONLY**:
  - 기존 카탈로그(`src/data/pilatesCatalog.ts`, `verifiedReferences.ts`, `publicReferences.ts`, `courseReferences.ts`, `exerciseYouTubeCatalog.ts`, `motionCandidateResearch.ts`) 및 영상 렌더 경로(`src/components/ExerciseYouTubeGallery.tsx`, `MovementMediaGuidancePanel.tsx`, `YouTubeClipModal.tsx`, `ExerciseEvidencePanel.tsx`), 라우트(`src/App.tsx`), 설정 파일(`package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`)은 **단 1바이트도 수정하지 않았습니다(`git diff` 0건)**.
- **도메인 역할 분리 (`motionEvidenceReview`와 구분)**:
  - 본 모듈은 **참고 링크·플레이어 표시 계약(Link & Player Display Contract)**만 소유합니다.
  - 동작의 해부학적 근거 조사(`motionEvidenceReview`), 생체역학적 정확성, 임상적 안전성, 전문가 모션 검수는 판정하거나 부여하지 않습니다.
- **크롤링·다운로드·접근차단 우회 금지**:
  - 외부 웹 대량 크롤링, 영상/오디오 바이너리 다운로드, 접근 차단(예: 403) 우회 시도를 일체 수행하지 않습니다.
  - 기존 저장소 내 공개 URL 표본을 **인메모리 읽기 전용(`auditExistingPublicUrlSamples`)**으로만 점검하고, 브라우저·단위 테스트에서는 **로컬 합성 iframe 픽스처(`syntheticEmbedFrame.html`)**를 사용해 외부 네트워크 요청 0건으로 검증합니다.

---

## 2. 핵심 정책 계약 6대 항목

| 정책 영역 | 계약 내용 | 핵심 구현 함수 / 타입 |
| --- | --- | --- |
| **1. URL 정규화** | 다양한 YouTube 호스트(`youtube.com`, `m.youtube.com`, `youtu.be`, `youtube-nocookie.com`, `/watch`, `/shorts/`, `/embed/`, `/live/`)에서 유효한 11자리 `videoId`를 추출해 표준 외부 URL(`https://www.youtube.com/watch?v={id}`)과 개인정보 보호 임베드 URL(`https://www.youtube-nocookie.com/embed/{id}?rel=0&autoplay=0`)로 정규화합니다. 원출처 관찰 시점(`isObservationTimestampOnly: true`)은 재생 시크(`t`/`start`)로 변환하지 않습니다. | [`normalizeReferenceUrlPolicy`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.ts) |
| **2. 중복 링크 병합** | 단축 URL(`youtu.be`), 모바일 URL(`m.youtube.com`), 추적 쿼리가 붙은 URL이 정규화 후 동일한 영상·구간(`youtube::{id}::{start}::{end}`) 또는 동일한 웹 문서(`web::{host}{path}`)를 가리키면 상위 신뢰 계층(`ReferenceSourceTier`) 항목으로 병합하고 중복 진단을 기록합니다. | [`evaluateReferenceLinkCandidates`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.ts) |
| **3. 악성 스킴 및 위험 경로 차단** | `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, HTML 엔티티/퍼센트 인코딩 우회 스킴, 제어 문자·Bidi 조작 문자, URL 내 자격 증명(`user:pass@`), 비표준/명시적 포트, 로컬호스트·사설 IP(`127.0.0.1`, `10.*`, `192.168.*`, `172.16-31.*`, `169.254.169.254`, `[::1]`), 무단 영상 다운로더(`y2mate`, `savefrom` 등), 유료 음성 API, `.mp4`/`.mp3` 직접 바이너리 링크를 차단(`displayMode: 'blocked'`)합니다. | [`normalizeReferenceUrlPolicy`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.ts) |
| **4. 임베드 불가 시 외부 링크 분리** | 공식 웹사이트(`Merrithew`), 학술/교육 본문(`BASI`, `NHS`), 국내 공공포털(`국민체력100`, `질병관리청 국가건강정보포털`), `link-only` 수업 참조(`COURSE_REFERENCES`), 단일 영상 ID가 없는 YouTube 채널/재생목록 URL은 `displayMode: 'external-link-only'`(`embedAllowed: false`, `embedUrl: null`)로 분리합니다. 런타임 임베드 차단·재생 오류 발생 시에도 즉시 `<iframe>`을 제거하고 외부 원본 링크로 폴백합니다. | [`createReferencePlayerDisplayController`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/playerDisplayContract.ts) |
| **5. 사용자 클릭 전 Autoplay 방지** | 초기 진입, 동작 전환, 탭 전환, `pagehide`, 백그라운드 전환(`document.hidden`) 시 절대 `<iframe>`을 마운트하지 않으며(`state: 'idle-unmounted'`), `pageshow`에서도 자동 재개하지 않습니다. `requestLoadEmbed({ userClicked: true })`를 통한 명시적 사용자 클릭 시에만 `autoplay=0&rel=0` 및 `allow` 속성에서 `autoplay`가 제거된 `<iframe>`을 로드합니다. | [`ReferenceLinkPolicyPreview`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/ReferenceLinkPolicyPreview.tsx) |
| **6. 개인정보·추적 쿼리 마스킹 제거** | `si`, `feature`, `pp`, `utm_*`, `fbclid`, `gclid`, `_ga`, `session_id` 및 개인정보/인증 키(`email`, `phone`, `name`, `user_id`, `token`, `access_token`, `api_key`, `password` 등), 그리고 값 패턴이 이메일·전화번호·JWT/시크릿과 일치하는 쿼리 파라미터를 제거합니다. 제거 내역에는 키 이름과 분류만 남기고 원본 값은 마스킹(`valueRedacted: true`)하여 로그·DOM 유출을 방지합니다. | [`normalizeReferenceUrlPolicy`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.ts) |

---

## 3. 2트랙 파일 분리 구조 (구현 트랙 vs 독립 검증 트랙)

- **트랙 1 (구현 및 단위 계약 트랙)**:
  - [`types.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/types.ts)
  - [`urlPolicyEngine.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.ts)
  - [`playerDisplayContract.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/playerDisplayContract.ts)
  - [`catalogSampleAudit.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/catalogSampleAudit.ts)
  - [`ReferenceLinkPolicyPreview.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/ReferenceLinkPolicyPreview.tsx)
  - [`referenceLinkPolicy.css`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/referenceLinkPolicy.css)
  - [`syntheticEmbedFrame.html`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html) / [`browserFixture.html`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/browserFixture.html)
  - [`urlPolicyEngine.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/urlPolicyEngine.test.ts) / [`ReferenceLinkPolicyPreview.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/ReferenceLinkPolicyPreview.test.tsx)
- **트랙 2 (독립 경계·브라우저 검증 트랙)**:
  - [`independentVerification/referenceLinkPolicy.independent.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/independentVerification/referenceLinkPolicy.independent.test.tsx)
  - [`independentVerification/verifyReferenceLinkPolicyBrowser.mjs`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/independentVerification/verifyReferenceLinkPolicyBrowser.mjs)
- **통합 문서**:
  - [`docs/INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/docs/INTEGRATION_PATCH_PROPOSAL.md)
  - [`docs/CANDIDATE_VS_VERIFICATION_REPORT.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/referenceLinkPolicyCandidate/docs/CANDIDATE_VS_VERIFICATION_REPORT.md)
