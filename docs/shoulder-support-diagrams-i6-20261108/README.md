# Track I6 — Pilates 견갑·상지 지지 2D 도해 구현 (Push-Up & Leg Pull Front)

- **브랜치**: `gemini/diagram-i6-shoulder-20261108` (`main` 통합 완료)
- **할당 동작군 (`shoulder-support`)**:
  - `shoulder-support-push-up` — 필라테스 푸시업 (Pilates Push-Up · 견갑 전인 지지 & 주관절 굴곡)
  - `shoulder-support-leg-pull-front` — 레그 풀 프런트 (Leg Pull Front · 프런트 서포트 & 단측 고관절 신전)
- **비의학적·진실성 메타데이터**:
  - `anatomicalAccuracyAssumed: false`
  - `professionalReviewCount: 0`
  - `sourceFrameMappings: 0`
  - `exactAssetReady: false`
  - `safetyAssessment: "unassessed"`

---

## 1. 소유 파일 및 구현 구성

1. `src/models/shoulder-support-LICENSE.txt` — MIT 라이선스 및 비의학적 합성 키네마틱 도해 고지.
2. `src/models/shoulderSupportDrafts.ts` — 2-Link 분석적 역기구학(`solveTwoLinkIK`) 기반 2D 시상면(Sagittal) 골격 솔버, 3대 지지선(`wrist-vertical-support`, `scapula-thoracic-support`, `shoulder-pelvis-ankle-plank-line`) 정렬 불변식, 3단계(`start`/`middle`/`end`) 및 5단계 연속 위상(`setup`/`move`/`turn`/`return`/`finish`).
3. `src/data/shoulderSupportSourceLedger.json` — 동작별 4개 공개 출처(Joseph H. Pilates 1945 *Return to Life Through Contrology* #25/#34, Pilates Anytime Mat Guide, NHS Push-Up Alignment, PMC9818814 Leg Pull Front 생체역학 논문, STOTT PILATES Scapular Stabilization) 및 비의학적 면책 원장.
4. `src/data/shoulderSupportDiagrams.ts` — 7개 타깃 운동 ID(`mat-push-up`, `mat-leg-pull-front`, `reformer-long-stretch`, `reformer-down-stretch`, `reformer-up-stretch`, `reformer-elephant`, `chair-pull-up`)에 대한 Track I7 공용 레지스트리 연결 페이로드(`getShoulderSupportRegistryIntegrationPayload`, `SHOULDER_SUPPORT_VISUAL_ASSETS`, `SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS`).
5. `src/components/ShoulderSupportDiagramFigure.tsx` — 단일 위상 SVG 도해(`ShoulderSupportDiagramFigure`), 3단계 전환 자세 트립틱 + 지지선 범례 + 외부 공개 출처 링크(`ShoulderSupportTriptychDiagram`), 독립 통합 데모(`ShoulderSupportIntegrationDemo`).
6. `public/images/movement-guides/shoulder-support-push-up-guide.svg` & `public/images/movement-guides/shoulder-support-leg-pull-front-guide.svg` — 정적 3단 트립틱 SVG 가이드 에셋.
7. `src/test/shoulderSupportDiagrams.test.tsx` — 골격 길이 불변성, 2-Link IK 정합성, 3대 지지선 공차, 5단계 연속 위상 홀드/이동 불변성, 범례/출처 링크 렌더링 단위 테스트.

---

## 2. 검증 결과 요약

- **단위 및 통합 테스트 (`vitest`)**:
  - `src/test/shoulderSupportDiagrams.test.tsx` (6 tests passed)
  - `src/test/diagramTracksIntegration.test.tsx` (3 tests passed)
  - `src/test/movementVisualGuide.test.tsx` (8 tests passed)
- **타입 및 린트 검증**:
  - `./node_modules/.bin/tsc -b` — 0 errors
  - `./node_modules/.bin/eslint` — 0 errors
  - `node scripts/check-secrets.mjs` — passed
- **브라우저 시각 검증 (`docs/shoulder-support-diagrams-i6-20261108/verification-report.json`)**:
  - `1440x900` 데스크톱, `390x844` 모바일, `320x640` 200% 줌 가로 오버플로 `0px`, 콘솔/페이지 에러 `0건`.
  - 캡처 스크린샷:
    - `screenshots/shoulder-support-desktop-1440.png`
    - `screenshots/shoulder-support-push-up-triptych.png`
    - `screenshots/shoulder-support-leg-pull-front-triptych.png`
    - `screenshots/shoulder-support-mobile-390.png`
    - `screenshots/shoulder-support-mobile-320-zoom200.png`
