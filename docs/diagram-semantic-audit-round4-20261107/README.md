# 98개 필라테스 도해 동일 Rig/위상 의미론적 불일치 독립 정밀 감사 (`docs/diagram-semantic-audit-round4-20261107`)

> **진실성·한계 고지 (Truthfulness & Boundary Notice)**
> - 본 감사는 현재 `main` (`ca38174`, 이전 6접점 패치 `55ce22d` / `b2d6022` 반영 완료)의 **98개 필라테스 동작 도해**에서 **서로 다른 동작이 동일한 Rig(`archetypeId`) 및 시작/중간/끝(`start`/`middle`/`end`) 좌표를 공유하여 명칭·기구·척추 면(`spinalPlanes`)·움직임 목적과 불일치하는 잔여 사례**를 전수 조사한 기술 감사 보고서입니다.
> - **임상적·해부학적·외부 전문가 검증 완료를 절대 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`).
> - 공개 출처 근거는 저장소 원장에서 **확인 가능한 공개 URL만 기록**했으며(`blocked-by-sandbox-proxy-unverified` 제외), 외부 이미지·영상을 임의 복제하지 않았습니다.
> - 다른 활성 세션/작업과의 충돌을 방지하기 위해 `src/**` (원본 rig·렌더러·Atlas·CourseReferenceBrowser·PackagePanel 등)는 **100% 읽기 전용(READ ONLY)** 으로 유지하고 `docs/diagram-semantic-audit-round4-20261107/**` 경로만 소유했습니다.

---

## 1. 산출물 구성

| 파일 경로 | 설명 |
| :--- | :--- |
| [`GROUP_INVENTORY_AND_MISMATCH_TABLE.md`](./GROUP_INVENTORY_AND_MISMATCH_TABLE.md) | **98개 전수 인벤토리(`exerciseId → rig → start/middle/end → 관절별 delta`)**, **28개 고유 좌표 그룹(`G-01`..`G-28`) 분류표**, **기해결 6접점 제외 명세(`R-01`, `D-01`..`D-05`)**, **상위 잔여 의미론적 불일치 8대 범주(`SM-01`..`SM-08` + `SM-09`) 정밀 분석 및 확인 가능한 공개 출처 URL** |
| [`TRACK_B_INDEPENDENT_VERIFICATION.md`](./TRACK_B_INDEPENDENT_VERIFICATION.md) | Track B 독립 적대적 검증 보고서 (읽기 전용 경계, 5개 뷰포트 `320`/`390`/`768`/`1440`/`200%` 실브라우저 무오류 검증, 진실성 플래그 검증) |
| [`patches/minimal-semantic-differentiation-proposal.patch`](./patches/minimal-semantic-differentiation-proposal.patch) | 원본 파일을 복제하지 않고 `src/data/movementVisualRigCatalog.ts`에 `resolveSeparatedSemanticMismatchBlueprint()`를 최소 추가하는 후속 패치 제안 (`git apply --check` 통과 검증 완료) |
| [`evidence/full-98-inventory-and-groups.json`](./evidence/full-98-inventory-and-groups.json) | 98개 동작 전체의 `start`/`middle`/`end` 관절 좌표, 관절별 변위(`dist_sm`, `dist_me`, `maxPhaseDist`), 28개 그룹, 확인 가능한 공개 URL 원장 JSON |
| [`evidence/browser-verification-summary.json`](./evidence/browser-verification-summary.json) | 실제 현재 렌더러(`MovementPhaseDiagramSvg`) 기구별 5종 표본 캡처 및 5개 뷰포트 실브라우저 검증 수치 |
| [`screenshots/`](./screenshots/) | 기구별(`mat`, `reformer`, `cadillac`, `chair`, `barrel`) 실제 현재 렌더러 표본 캡처 5종 + 반응형/200% 확대 뷰포트 캡처 5종 |

---

## 2. 실제 현재 렌더러 기구별(`Mat` / `Reformer` / `Cadillac` / `Chair` / `Barrel`) 불일치 표본 캡처

1. **매트 (`SM-03`, `supine-breath-pelvic-clock`)**: [`screenshots/apparatus-mat-sm03-sample.png`](./screenshots/apparatus-mat-sm03-sample.png)
   - `original-mat-pelvic-clock`(골반 시계)와 `original-mat-rib-breath`(누워서 호흡 관찰)가 골반 고정(`dist_sm: 6.3px`) 상태에서 양팔을 머리 위로 크게 휘젓는(`hand dist_sm: 64.1px`, `maxPhaseDist: 129.3px`) 암 서클 궤적을 그대로 공유합니다.
2. **리포머 (`SM-04`, `standing-scooter-lunge-splits`)**: [`screenshots/apparatus-reformer-sm04-sample.png`](./screenshots/apparatus-reformer-sm04-sample.png)
   - 관상면 직립 양다리 외전·내전 동작인 `ex-lower-02`(리포머 스탠딩 사이드 스플릿 & 스케이터)가 시상면 전방 힌지 단측 후방 킥인 `ex-lower-01`(스탠딩 스쿠터, `ankle Δ65.5px`)과 동일한 도해를 표시합니다.
3. **캐딜락 (`SM-05` & `SM-06`, `kneeling-chest-expansion-triceps` / `seated-roll-back-spine-twist`)**: [`screenshots/apparatus-cadillac-sm05-sm06-sample.png`](./screenshots/apparatus-cadillac-sm05-sm06-sample.png)
   - 척추 전방 분절 굴곡이 핵심인 `ex-warmup-02`(캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치)가 척추를 수직 고정(`thoracic Δ2.8px`)한 채 팔만 골반 뒤로 당기는(`hand Δ118.3px`) 체스트 익스팬션과 동일하며, `original-cadillac-seated-rotation`(앉아서 흉곽 회전)이 56.4px 후방 C-커브 롤백과 동일합니다.
4. **체어 (`SM-01` & `SM-08`, `seated-row-arm-arc` / `chair-seated-pedal-footwork`)**: [`screenshots/apparatus-chair-sm01-sm08-sample.png`](./screenshots/apparatus-chair-sm01-sm08-sample.png)
   - `original-chair-seated-pelvic-rock`(체어 시티드 골반 록)이 골반은 고정(`pelvis Δ0px`)된 채 `dist_sm: 80.5px` / `maxPhaseDist: 103.2px` 로잉·오버헤드 리치를 수행하고, 무릎을 위로 들어 올리는 `original-chair-seated-knee-lift`(체어 시티드 니 리프트)가 반대로 무릎을 `+34px` 아래로 밟아 내립니다(`knee.y: 98→132`).
5. **래더 바렐 (`SM-02` & `SM-07` & `SM-08`)**: [`screenshots/apparatus-barrel-sm02-sm07-sm08-sample.png`](./screenshots/apparatus-barrel-sm02-sm07-sm08-sample.png)
   - `original-barrel-supported-ankle`(래더 지지 발목 움직임)에서 사다리를 잡아야 할 손이 허공으로 50.5px 뻗어 올라가며, 서서 수행하는 `original-barrel-standing-side-stretch`(`bodyPosition: standing`)가 스탠딩 바렐 기구 앞에서 바닥 Z-Sit(`pelvis.y: 138`, `knee.y: 148`)으로 앉아 있습니다.

---

## 3. 재현 실행 명령

```bash
node --experimental-transform-types docs/diagram-semantic-audit-round4-20261107/run-all-semantic-audit-round4.mjs
```
