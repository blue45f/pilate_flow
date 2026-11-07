# Pilates 2D 도해 자세-기구 접점 정확성 회귀 검사 및 최소 패치 패키지 (`2026-11-07`)

> **해부학·전문가 검증 미완료 고지 (Truthfulness & Non-Certification Boundary)**
> - 본 감사 및 최소 패치 제안은 **2D 개략 도해(`320×200` SVG)의 자세-기구 접점 좌표 및 기구 회전 부호 오류(`D-01`~`D-05`)만 최소 교정**한 결과입니다.
> - **해부학적·임상적·외부 필라테스 전문가 검증 완료를 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`, `canonicalMotionReady: false`, `manualReady: false`, `true3dSupported: false`).
> - 모든 기존 앱 도해 구현(`src/**`, `package.json`, 기존 `docs/**`, 기존 `scripts/**`)은 **100% READ-ONLY (`수정 0줄`)**로 유지되었습니다.

---

## 1. 독점 소유 경로 및 파일 구조

- `scripts/diagram-contact-audit-20261107/`
  - [`shared/ts-loader-hooks.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/shared/ts-loader-hooks.mjs): Node 24 내장 `module.stripTypeScriptTypes` 기반 무의존성 `.ts`/`.tsx` 로더 및 SVG VNode 직렬화·트리 쿼리 엔진
  - [`shared/contact-geometry-analyzer.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/shared/contact-geometry-analyzer.mjs): 기해결 제외 항목(`R-01`) 및 5대 미해결 접점 결함(`D-01`~`D-05`), 294개 SVG 무결성(`G-01`), 정직성 플래그(`G-02`) 정적·SVG 좌표 분석기
  - [`track-a-implementation/candidate-minimal-contact-fixes.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/track-a-implementation/candidate-minimal-contact-fixes.mjs): `src/**` 무수정 상태에서 `D-01`~`D-05` 최소 패치를 적용하는 후보 모듈 (`applyCandidateMinimalRigFixToAsset`, `createCandidateMovementPhaseDiagramSvg`)
  - [`track-a-implementation/track-a-contact-regression.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/track-a-implementation/track-a-contact-regression.node-test.mjs): Track A 정적 좌표·회귀 검증 테스트 스위트 (7 tests)
  - [`track-b-verification/track-b-adversarial-contact-audit.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/track-b-verification/track-b-adversarial-contact-audit.node-test.mjs): Track B 독립 적대적 감사 테스트 스위트 — `main` 결함 재현, 후보 패치 검증, 좌우 반전(`mirrored`) 대칭, `git apply --check`, 읽기 전용 경계 검증 (5 tests)
  - [`track-b-verification/track-b-browser-contact-verify.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/track-b-verification/track-b-browser-contact-verify.mjs): 실제 Headless Chromium (`320`, `390`, `768`, `1440`, `200% 확대`) DOM `getBBox()` 실측 및 스크린샷 캡처 스크립트
  - [`run-all-diagram-contact-audit.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/diagram-contact-audit-20261107/run-all-diagram-contact-audit.mjs): 구문 검사 + Track A/B 병렬 실행 + Chromium 멀티 뷰포트 검증 + 패치 검증 통합 오케스트레이터
- `docs/diagram-contact-audit-20261107/`
  - [`TRACK_A_IMPLEMENTATION_AND_MINIMAL_PATCH.md`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/TRACK_A_IMPLEMENTATION_AND_MINIMAL_PATCH.md): 기해결 제외(`R-01`) 및 5대 결함(`D-01`~`D-05`) 원인과 최소 패치 좌표 명세
  - [`TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md): 독립 회귀 검증 및 Chromium 5개 뷰포트 화면 실측 보고서
  - [`patches/minimal-diagram-contact-fixes.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch): 통합 담당자가 `git apply`로 즉시 반영할 수 있는 최소 unified diff 패치
  - [`evidence/regression-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/evidence/regression-summary.json): 전체 정적·브라우저 회귀 검사 결과 JSON
  - [`evidence/browser-verification-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/evidence/browser-verification-results.json): Chromium 5개 뷰포트 및 DOM 접점 실측 결과 JSON
  - `evidence/screenshots/contact-audit-{320x850,390x850,768x1024,1440x900,1440x900-zoom200}.png`: 실제 화면 비교 스크린샷 5종

---

## 2. 핵심 결과 요약

1. **기해결 항목 제외 (`R-01`)**:
   - `original-mat-clam` (`mat-clam-isolated`) 및 `original-mat-open-book` (`mat-open-book-isolated`) 교차 동작 누수 분리와 `schematic-shoulder-connection` 조건부 렌더링은 현재 `main`에 이미 반영되어 있음을 확인하고 재구현 대상에서 제외했으며, 원본 참조 동일성(`Object.is === true`)을 회귀 테스트로 고정했습니다.
2. **남은 5대 자세-기구 접점 결함 (`D-01` ~ `D-05`) 검증 및 최소 패치 제안**:
   - **D-01 (`Frog end`)**: `original-reformer-strap-frog`의 `end` 위상이 무릎을 접어 시작 프로그 자세(`ankle: 214,74`, `knee: 182,92`)로 돌아오지 않고 천장(`ankle: 222,40`, `Δy = -34px`)으로 다리를 들어 올리던 결함 → `endJoints = startJoints` 및 `carriageOffsets: [6, 36, 6]`으로 교정 (`오차 34.93px → 0px`).
   - **D-02 (`Reformer plank 손발` + `Chair plank 접점`)**:
     - `ex-plank-01` (리포머 롱 스트레치): 우측 풋바(`266,126`)와 좌측 캐리지(`x: 38..216 + shift`)에 대해 손(`88,148`)과 발(`280,144`)이 좌우 반전되어 있던 결함 → 손을 우측 풋바 상단(`268,126`, 거리 `2.0px`), 발을 좌측 캐리지(`80→114→82, 138`)에 정렬.
     - `ex-plank-02`, `original-chair-incline-support`, `ex-kr-chair-01` (체어 플랭크 3종): 손(`88,148`)이 시트 상단(`y=106`) 아래 `42px` 허공에 떠 있던 결함 → 손을 시트 상단(`124,106`, 수직 이격 `0px`)에, 발을 페달 팁(`216,156 → 208,134 → 216,158`, 거리 `2.3~5.4px`)에 정렬.
   - **D-03 (`Cadillac carriage`)**: 고정 베드 기구인 캐딜락 18개 운동 중 15개(45개 위상)에 `carriageOffsetPx > 0`이 부여되던 결함 → `isCarriageApparatus = exercise.apparatus === 'reformer'`로 교정하여 캐딜락 54개 전 위상 `carriageOffsetPx = 0` 달성.
   - **D-04 (`Chair pedal`)**: 체어 페달 하방 프레스(`ankle.y: 136→168`, `Δy = +32px`) 시 페달 팁이 상방 역회전(`pedalTip.y: 137.0→122.0`, `Δy = -15.0px`)하여 `middle`에서 발과 페달이 `46.0px`(발목) / `50.0px`(뒤꿈치) 분리되던 결함 → 경첩(`168,164`) 및 각도 부호(`40 - pedalAngleDeg * 1.3`) 교정으로 하방 동조 회전(`pedalTip.y: 139.3→169.9`, `Δy = +30.6px`, 수직 오차 **`1.9px`**) 달성.
   - **D-05 (`Barrel 관통`)**: 스탠딩 배럴 7종에서 지지 다리·골반이 배럴 돔(`x: 68..174`) 내부를 관통하고, `original-barrel-standing-hip-extension` / `original-barrel-standing-side-reach`에서 손(`90,78`)이 사다리(`x: 222..256`)로부터 `132~146px` 허공을 잡으며 뒤로 뻗는 다리가 사다리 프레임을 관통하던 결함 → 스탠딩 배럴 기구 배치(`돔 x: 18..70`, `사다리 x: 76..96`) 및 사다리 가로대 손 파지(`88,76`)로 **돔 관통 `0건`, 사다리 관통 `0건`, 가로대 손 이격 `0px`** 달성.

---

## 3. 재현 및 통합 검증 실행 명령

```bash
# 전체 다이나믹 병렬 워크플로우 (구문 검사 + Track A/B Node 테스트 + Chromium 5개 뷰포트 + git apply --check + Read-Only 가드)
node --experimental-transform-types scripts/diagram-contact-audit-20261107/run-all-diagram-contact-audit.mjs

# 후보 패치 적용 가능성 단독 확인
git apply --check docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch
```
