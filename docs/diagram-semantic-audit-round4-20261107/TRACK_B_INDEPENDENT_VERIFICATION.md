# Track B 독립 적대적 검증 보고서 (`diagram-semantic-audit-round4-20261107`)

## 1. 소유 경계 및 읽기 전용(Read-Only) 보호 검증
- **허용 소유 경로**: `docs/diagram-semantic-audit-round4-20261107/**` 단독 소유.
- **읽기 전용 무결성 확인**:
  - `src/data/movementVisualRigCatalog.ts`, `src/components/MovementPhaseDiagramSvg.tsx`, `ExerciseAtlasView`, `CourseReferenceBrowser`, `PackagePanel`, `package-panel`, `PackageDetail` 및 공유 스토어/라우트/테마/설정에 대한 수정 **0건** (`git status --porcelain` 자동 검증 통과).
  - 이전 6접점 패치(`R-01`, `D-01`, `D-02A`, `D-02B`, `D-03`, `D-04`, `D-05`)는 기해결 항목으로 명시적 제외 처리하여 중복 보고하지 않음.

## 2. 진실성 경계 및 확인 가능한 공개 출처 URL 검증
- **임상·해부학·전문가 검증 미완 명시**:
  - `anatomicalAccuracyAssumed: false`
  - `anatomicalVerificationCompleted: false`
  - `expertVerificationCompleted: false`
  - `professionalReviewCount: 0`
- **확인 가능한 공개 출처 URL만 기록**:
  - 98개 전 동작에 대해 `VERIFIED_REFERENCES`, `PUBLIC_REFERENCES`, `COURSE_REFERENCES`, `motionEvidenceReview` 원장 중 `blocked-by-sandbox-proxy-unverified`를 제외한 확인 가능한 `https://` URL만 기록되었음을 Track B 테스트로 검증.

## 3. 실제 브라우저 기구별 캡처 및 5개 뷰포트 검증 결과
- **렌더러**: 현재 `main` (`ca38174`)의 실제 `src/components/MovementPhaseDiagramSvg.tsx` (`MovementPhaseDiagramSvg`)
- **콘솔 에러 / 페이지 런타임 에러**: `0` / `0`
- **기구별 표본 캡처 5종**:
  - `screenshots/apparatus-mat-sm03-sample.png`
  - `screenshots/apparatus-reformer-sm04-sample.png`
  - `screenshots/apparatus-cadillac-sm05-sm06-sample.png`
  - `screenshots/apparatus-chair-sm01-sm08-sample.png`
  - `screenshots/apparatus-barrel-sm02-sm07-sm08-sample.png`
- **반응형 및 200% 확대 뷰포트 5종 (`horizontalOverflowPx = 0`, 42개 SVG 모두 가시성 통과)**:
  - `320×850` (`screenshots/viewport-mobile-320x850.png`) — `scrollWidth: 320`, `horizontalOverflowPx: 0`
  - `390×850` (`screenshots/viewport-mobile-390x850.png`) — `scrollWidth: 390`, `horizontalOverflowPx: 0`
  - `768×1024` (`screenshots/viewport-tablet-768x1024.png`) — `scrollWidth: 768`, `horizontalOverflowPx: 0`
  - `1440×900` (`screenshots/viewport-desktop-1440x900.png`) — `scrollWidth: 1440`, `horizontalOverflowPx: 0`
  - `1440×900 @ 200% zoom` (`screenshots/viewport-desktop-1440x900-zoom200.png`) — `scrollWidth: 1440`, `horizontalOverflowPx: 0`
- **자체 테스트 서버·탭 정리**: `verify-browser-semantic-audit.mjs`의 `finally` 블록에서 `page.close()`, `browser.close()`, `server.close()`를 호출하여 잔여 프로세스 0건 확인.
