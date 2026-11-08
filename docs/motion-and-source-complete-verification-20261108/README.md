# Pilates Flow 모션·도해·출처 원장 전수 검증 보고서 (`motion-and-source-complete-verification-20261108`)

- **감사 및 검증 일자**: `2026-11-08`
- **검증 스위트**: [`src/test/motionAndSourceLedgerCompleteness.test.ts`](../../src/test/motionAndSourceLedgerCompleteness.test.ts)
- **관련 선행 감사 문서**:
  - [`docs/motion-provenance-audit-20261108/README.md`](../motion-provenance-audit-20261108/README.md)
  - [`docs/3d-asset-license-audit-20261108/README.md`](../3d-asset-license-audit-20261108/README.md)

---

## 1. 진실성·비임상 경계 불변 조건 (Truthfulness & Non-Clinical Boundary Invariants)

모든 신규·확장 2D 기구학 도해(Tracks I1–I12), 후보 연속 모션 모델(8종), 기존 미결속 모델 출처 바인딩(9종), 미확인 YouTube 대체 출처 감사(5종), `VERIFIED_REFERENCES` 전수 범위 검증(30종), 그리고 98개 전 동작 생체역학·출처 괴리 검토(`TRACK_A`~`TRACK_D`)는 아래 진실성 플래그를 **100% 엄격히 유지**합니다.

| 진실성 플래그 (Truthfulness Flag) | 검증 값 | 검증 대상 및 근거 |
| --- | --- | --- |
| `anatomicalAccuracyAssumed` | `false` (`anatomicalAccuracyAssumedCount: 0`) | 모든 2D/3D-투영 SVG 도해·원장·모션 모델은 해부학적 실측이나 임상적 안전 보증을 가정하지 않는 수업 계획 참고 모식도임 |
| `professionalReviewCount` | `0` (`expertApprovedCount: 0`) | 외부 전문의·물리치료사·공인 기관의 프레임별 정식 임상/모션 감수 건수 0건 |
| `canonicalReadyCount` | `0` (`canonicalMotionReady: false`) | `EXERCISE_MOTION_REFERENCES` 98개 전 항목은 `assetStatus: 'not_authored'` 유지 |
| `true3dReadyCount` | `0` (`true3dSupported: false`) | 외부 바이너리 3D 메쉬(`.glb`, `.fbx`, `.obj`, `.bvh` 등) 0건 · 모든 시각화는 코드 기반 2D SVG 및 3D→2D 직교 투영 도해 |
| `unverifiedRemainderCount` | `0` | `extendedMotionSourceLedger.json` 및 신규 트랙 원장 내 미검증 잔여 레코드 0건 |

---

## 2. Tracks I1–I12 2D 기구학 도해 전수 커버리지 (`INITIAL_EXERCISES` 98 / 98)

정식 카탈로그 `INITIAL_EXERCISES` **98개 동작(`ORIGINAL_MOVEMENTS` 60개 + `ex-*` 38개)** 전체가 Tracks I1–I12 2D 기구학 도해 및 출처 대조 보정 레지스트리(`MOVEMENT_DIAGRAM_CORRECTIONS` + Tracks I9–I12 보정 맵)에 **100% 매핑**되었으며, 신규 확장 트랙(I9–I12) 원장의 모든 `factualRecordSha256` 체크섬이 Node `crypto.createHash('sha256').update(JSON.stringify(factualRecord)).digest('hex')` 계산값과 일치함을 검증했습니다.

### 2.1 Tracks I1–I12 트랙별 아키텍처 및 커버리지 인벤토리

| 트랙 ID | 도메인 영역 | 소유 데이터 및 원장 파일 | 도해 아키타입 / 그룹 | 커버 카탈로그 동작 수 |
| --- | --- | --- | --- | --- |
| **Track I1** | 척추 분절 (Spine Articulation) | `src/data/spineArticulationDiagramData.ts` | `spine-roll-up`, `spine-roll-down`, `spine-stretch` | 초기 7-트랙 통합 (`MOVEMENT_DIAGRAM_CORRECTIONS` 47개 원본·연계 동작) |
| **Track I2** | 골반·브리지 (Pelvis & Hip Bridging) | `src/data/pelvisHipDiagramData.ts`<br>`src/data/pelvisHipProvenance.ts` | `pelvis-curl`, `pelvis-bridging`, `shoulder-bridge` 외 기구 브리지 7종 | 초기 7-트랙 통합 |
| **Track I3** | 고관절·하지 (Hip & Leg Circles / Side Kick) | `src/data/hip-leg-diagram-data.ts`<br>`src/data/hip-leg-diagram-sources.json` | `hip-leg-single-leg-circle`, `hip-leg-side-kick` | 초기 7-트랙 통합 (SHA-256 6건 일치) |
| **Track I4** | 복부·코어 (Core & Abdominal Series) | `src/data/coreAbdominalDiagrams.ts`<br>`src/data/coreAbdominalSourceLedger.json` | `core-hundred`, `core-single-leg-stretch`, `core-double-leg-stretch` | 초기 7-트랙 통합 (SHA-256 6건 일치) |
| **Track I5** | 흉추 신전·프론 (Thoracic Extension & Prone) | `src/data/extensionMovementData.ts`<br>`src/data/extensionDiagramSources.ts` | `prone-extension`, `swimming` (매트·리포머 롱박스·캐딜락·래더바렐 8종) | 초기 7-트랙 통합 |
| **Track I6** | 상지·견갑 지지 (Shoulder Support & Push-Up) | `src/data/shoulderSupportDiagrams.ts`<br>`src/data/shoulderSupportSourceLedger.json` | `shoulder-support-push-up`, `shoulder-support-leg-pull-front` | 초기 7-트랙 통합 (SHA-256 3건 일치) |
| **Track I8** | 회전·측굴 (Axial Rotation & Saw / Criss-Cross) | `src/data/rotationDiagramData.ts`<br>`src/data/rotationSourceFacts.json` | `rotation-mat-saw`, `rotation-mat-spine-twist`, `rotation-mat-criss-cross` | 초기 7-트랙 통합 |
| **Track I9** | 호흡·센터링·골반 시계 (Breathing & Pelvic Clock) | `src/data/breathingPelvicDiagramData.ts`<br>`src/data/breathingPelvicSourceLedger.json` | `breathing-supine-diaphragmatic` (4)<br>`breathing-seated-standing-expansion` (2)<br>`pelvic-clock-and-imprint-rock` (4) | **10개** 카탈로그 동작 (`BREATHING_PELVIC_CATALOG_EXERCISE_IDS`) |
| **Track I10** | 풋워크·발목·체어 페달·스탠딩 하지 (Footwork & Lower) | `src/data/footworkLowerDiagramData.ts`<br>`src/data/footworkLowerSourceLedger.json` | `reformer-footwork-and-strap-frog` (6)<br>`ankle-plantar-dorsiflexion-articulation` (4)<br>`chair-pedal-press-and-calf-raise` (4)<br>`standing-lunge-splits-and-hip-abduction` (7) | **21개** 카탈로그 동작 (`FOOTWORK_LOWER_CATALOG_EXERCISE_IDS`) |
| **Track I11** | 상지 스트랩·로잉·암 아크 (Upper-Body Arm & Row) | `src/data/upperBodyArmDiagramData.ts`<br>`src/data/upperBodyArmSourceLedger.json` | `supine-and-standing-strap-press` (5)<br>`seated-row-and-band-retraction` (4)<br>`kneeling-chest-expansion-and-chair-arm-arc` (4) | **13개** 카탈로그 동작 (`UPPER_BODY_ARM_CATALOG_EXERCISE_IDS`) |
| **Track I12** | 측굴·기구 회전·테이블탑·기구 플랭크 (Lateral & Apparatus) | `src/data/lateralAndApparatusDiagramData.ts`<br>`src/data/lateralAndApparatusSourceLedger.json` | `lateral-mermaid-and-barrel-side-bend` (7)<br>`apparatus-and-side-lying-thoracic-rotation` (4)<br>`supine-tabletop-knee-fold-and-reverse-curl` (6)<br>`quadruped-and-apparatus-plank-pike` (6) | **23개** 카탈로그 동작 (`LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS`) |

### 2.2 신규 트랙 원장(Tracks I9–I12) SHA-256 체크섬 검증 내역

| 원장 파일 | 엔트리 ID (`diagramId` / `movementId`) | 매핑 카탈로그 동작 수 | `factualRecordSha256` (64-hex) | 검증 상태 |
| --- | --- | --- | --- | --- |
| `breathingPelvicSourceLedger.json` | `breathing-supine-diaphragmatic` | 4 (`original-reformer-supine-breath`, `original-mat-rib-breath`, `original-cadillac-table-breath`, `ex-warmup-01`) | `f9284c6c1ca41ffbe653670ca972d8b60d763f28ffb0bcb12f9c723c2810c1d1` | PASS |
| `breathingPelvicSourceLedger.json` | `breathing-seated-standing-expansion` | 2 (`original-chair-seated-breath`, `original-barrel-standing-breath`) | `435f2a7c7d9c233b61ef8a42dd8e9b03aba68c3354b5affab5ff4a4531c86cda` | PASS |
| `breathingPelvicSourceLedger.json` | `pelvic-clock-and-imprint-rock` | 4 (`original-mat-pelvic-clock`, `original-cadillac-pelvic-rock`, `original-chair-seated-pelvic-rock`, `ex-warmup-03`) | `d0be2e2db877b365b8a49018b5b7f7d8fbf3986f6b017940d94c75e50dec43c7` | PASS |
| `footworkLowerSourceLedger.json` | `reformer-footwork-and-strap-frog` | 6 (`original-reformer-parallel-footwork`, `original-reformer-strap-frog`, `ex-footwork-01`, `ex-footwork-02`, `ex-kr-reformer-01`, `ex-global-reformer-01`) | `a7aa201c9ec1b1c679e3d18d3f0aa6b09d2820501411bf7578d63356e330bfe6` | PASS |
| `footworkLowerSourceLedger.json` | `ankle-plantar-dorsiflexion-articulation` | 4 (`original-barrel-supported-ankle`, `original-mat-ankle-reach`, `original-cadillac-table-ankle`, `ex-footwork-03`) | `bae57203ee4cd78976cfefcd4c0a213c78393718ac851e75dffd469a562c1627` | PASS |
| `footworkLowerSourceLedger.json` | `chair-pedal-press-and-calf-raise` | 4 (`original-chair-seated-pedal-press`, `original-chair-alternating-pedal`, `original-chair-supported-calf-raise`, `original-chair-sit-to-stand`) | `70debe1ce6215c6d4cc860fa2586c08091a73fb7d2d655bd74fcec75d04d27fe` | PASS |
| `footworkLowerSourceLedger.json` | `standing-lunge-splits-and-hip-abduction` | 7 (`original-barrel-standing-hip-extension`, `original-barrel-standing-side-reach`, `original-mat-clam`, `ex-lower-01`, `ex-lower-02`, `ex-lower-03`, `ex-kr-reformer-02`) | `f09969615d1c12276d6d0436af64a33795db73e31204412fd3f87dd55283b898` | PASS |
| `upperBodyArmSourceLedger.json` | `supine-and-standing-strap-press` | 5 (`original-reformer-supine-arm-press`, `original-cadillac-arm-spring-press`, `original-barrel-supported-arm-reach`, `ex-upper-01`, `ex-kr-reformer-03`) | `3d765e68f2490ed00a25aaf98ec1f0d04faae61bad7f9d50ac005753b882a83e` | PASS |
| `upperBodyArmSourceLedger.json` | `seated-row-and-band-retraction` | 4 (`original-reformer-seated-row`, `original-mat-band-row`, `ex-upper-02`, `ex-global-reformer-03`) | `ac03fa728fce4a663a88425cd7f4c606a9ffce4e18fa07637bfe65f7a6276760` | PASS |
| `upperBodyArmSourceLedger.json` | `kneeling-chest-expansion-and-chair-arm-arc` | 4 (`original-chair-seated-arm-arc`, `original-mat-seated-arm-reach`, `original-chair-seated-back-reach`, `ex-upper-03`) | `81f51ca6f0da8da48918937367461776a7d1cd0f5bb9262fa70129a09a7253e5` | PASS |
| `lateralAndApparatusSourceLedger.json` | `lateral-mermaid-and-barrel-side-bend` | 7 (`original-barrel-supported-side-bend`, `original-barrel-standing-side-stretch`, `original-cadillac-seated-side-reach`, `original-chair-seated-mermaid`, `original-mat-mermaid`, `ex-cooldown-01`, `ex-kr-barrel-01`) | `27fa7f64f950c6d57a35ee103eea6ebfd36276fa8d8bc56ae58e4af5a9773527` | PASS |
| `lateralAndApparatusSourceLedger.json` | `apparatus-and-side-lying-thoracic-rotation` | 4 (`original-barrel-standing-rotation`, `original-chair-seated-spine-twist`, `original-cadillac-seated-rotation`, `original-mat-open-book`) | `2f2f7d02bb791a8146cc3c5bb75ecad82a01fb150341756ef6d18986db2f12f7` | PASS |
| `lateralAndApparatusSourceLedger.json` | `supine-tabletop-knee-fold-and-reverse-curl` | 6 (`original-mat-heel-slide`, `original-cadillac-table-knee-fold`, `original-chair-seated-knee-lift`, `original-mat-knee-fold`, `ex-core-04`, `ex-kr-reformer-04`) | `27d31f615c7d52e99bb42eee03523839793b92d7b186d2fb3b8d79023179ba57` | PASS |
| `lateralAndApparatusSourceLedger.json` | `quadruped-and-apparatus-plank-pike` | 6 (`original-cadillac-quadruped-slide`, `original-chair-incline-support`, `original-mat-quadruped-reach`, `ex-plank-01`, `ex-plank-02`, `ex-kr-chair-01`) | `3f7a4347424b4b25bc88c6f30e21fbc9ad3eccbbc831a14889fceaccaec65aba` | PASS |

---

## 3. 확장 매트 후보 모션 모델 8종 (`MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS`)

기존 연속 모션 초안이 없던 매트 카탈로그 8개 동작(`prone-baby-swan`, `kneeling-forearm-plank` 포함)에 대해 14개 관절 좌표 보간(`samplePose(progress)`), 3단계 스냅샷(`start`, `middle`, `end`), 지지 앵커, 방향 벡터 화살표, 복수 공공·공식 출처(각 2건 이상) 및 SHA-256 사실 레코드를 [`src/data/extendedMotionSourceLedger.json`](../../src/data/extendedMotionSourceLedger.json)과 [`src/data/extendedMotionVerificationCatalog.ts`](../../src/data/extendedMotionVerificationCatalog.ts)에 구현·검증했습니다.

| 카탈로그 동작 ID (`exerciseId`) | 후보 모델 ID (`candidateId`) | 한글 명칭 (`titleKo`) | 검증 출처 ID (`sources`) | `factualRecordSha256` (64-hex) |
| --- | --- | --- | --- | --- |
| `original-mat-swan-prep` | `prone-baby-swan` | 매트 스완 준비 · 베이비 스완 흉추 신전 | `basi-cjkelly-baby-swan-v1`, `ocats-prone-forearm-extension-text-2026-11-05` | `e700064679c0887cd0868a0bf519a9595200c0b71e606f542f3eea847c04cc5c` |
| `original-mat-forearm-plank` | `kneeling-forearm-plank` | 무릎 지지 플랭크 · 전완·무릎 지지 코어 안정화 | `nth-optimise-elbow-knee-plank-v1`, `cuh-general-stability-core-plank-v1` | `bf564e799f8a613c958ef68f5b2e1b33ac5009b242732963a2242de08f954ff1` |
| `original-mat-rib-breath` | `supine-rib-breath-expansion` | 누워서 호흡 관찰 · 3차원 흉곽 횡격막 호흡 | `basi-cjkelly-pelvic-curl-breathing-setup-v1`, `withpilates-kr09-diaphragmatic-breathing-v1` | `7814c2e2c48fc2f2286a057895292bd8b65da4e0b90f83ea81b17b4fe8974267` |
| `original-mat-pelvic-clock` | `supine-pelvic-clock-tilt` | 골반 시계 · 12시-6시 골반 경사 및 임프린트 조절 | `basi-cjkelly-pelvic-curl-prep-tilt-v1`, `tsd-sui-pelvic-tilt-setup-v1` | `dc25206c6e1b1c82449cdbf7a9003da73889879ce4360afc491e6ecec24e8ee5` |
| `original-mat-single-leg-stretch` | `supine-single-leg-stretch-exchange` | 싱글 레그 스트레치 준비 · 수파인 교대 레그 리치 | `basi-single-leg-stretch-public-text-2026-11-05`, `rm-abdominal-operation-single-leg-slide-v1` | `e12a6e60809a1ad6bc4e0fdf440798312d38e2fdf577b5c2577735db060af2e4` |
| `original-mat-swimming-prep` | `prone-swimming-alternating` | 스위밍 준비 · 복와위 교차 상·하지 신전 리치 | `rnoh-prone-hip-extension-text-2026-11-05`, `merrithew-mv08-contralateral-coordination-v1` | `bee29d7347a54ff8cd36005d2ebc59e9b2d9b9d73b8d90c10f313f64e665a00c` |
| `original-mat-side-leg-lift` | `side-lying-abduction-sweep` | 옆으로 누워 다리 들기 · 측와위 고관절 외전 리프트 | `ruh-lateral-hip-side-abduction-v1`, `roh-hip-oa-side-abduction-v1` | `bdfa3243fb3f6fc708aad2df2086b89e025889ea1a26328d263db665166c2fd8` |
| `original-mat-spine-twist` | `seated-axial-spine-twist` | 시티드 스파인 트위스트 · 좌골 지지 축성 흉추 회전 | `basi-cjkelly-spine-twist-supine-axial-context-v1`, `leicspart-chair-trunk-stretch-text-2026-11-05` | `bc99c5915f62b2bcc1778a69e540a2d47b481df463504079891115a8a5fec5b7` |

---

## 4. 기존 미결속 연속/배치 모션 모델 9종 출처 원장 결속 (`previouslyUnboundMotionModels`)

선행 모션 출처 감사(`docs/motion-provenance-audit-20261108`) 및 3D 자산 감사(`docs/3d-asset-license-audit-20261108`)에서 원장 해시 미결속(`unbound-reference`) 또는 매니페스트 누락으로 식별되었던 9개 모델 전체를 기존 동결 파일(`motionStudyLedger.json`) 수정 없이 확장 원장(`extendedMotionSourceLedger.json`)에 SHA-256 해시로 결속했습니다.

| 모델 ID (`modelId`) | 배치 변형 / 별칭 (`batchVariantId` / `aliasModelIds`) | 대상 카탈로그 동작 ID (`exerciseId`) | 검증 출처 (`sources`) | `factualRecordSha256` (64-hex) |
| --- | --- | --- | --- | --- |
| `supported-heel-raise` | `standing-supported-heel-raise` | `original-mat-ankle-reach` | `nhs-livewell-calf-raises-v1`, `uhsussex-standing-heel-raises-v1` | `26a6fb06c5749aab46698d05c2e5bf0ec998e1c694ee6c828ca2582fbfece626` |
| `side-lying-clam` | — | `original-mat-clam` | `southtees-the-clam-v1`, `cuh-clam-shell-stability-v1` | `af827ac857ec84b29d74fa1030f58ca300f5be7085b198011f42cd7f233dd4ee` |
| `side-lying-straight-leg-lift` | — | `original-mat-side-leg-lift` | `ruh-lateral-hip-side-abduction-v1`, `roh-hip-oa-side-abduction-v1` | `69cca8462c474ae4133fb10c86b7d3f9b1fc05c5ff178fab8f87c54facb2e600` |
| `side-lying-open-book` | — | `original-mat-open-book` | `dynamichealth-midback-open-book-v1`, `leeds-chest-wall-open-book-v1` | `764404fef612d4abd494d0bfa2b28b352d08f0ac6396cc0430c5a8e8a8444f70` |
| `supine-single-leg-reach-v1` | — | `original-mat-single-leg-stretch` | `basi-single-leg-stretch-public-text-2026-11-05`, `basi-terms-and-conditions-v1` | `c1e4da0710b35484bd79549fecae793a6e745075b4b3ed816179cebe535c1da9` |
| `mat-pelvic-curl-bridge-v1` | `chair-seated-bilateral-arm-raise-v1`, `articulated-pelvic-curl` | `original-mat-bridge` | `basi-cjkelly-pelvic-curl-v1`, `uhsussex-chair-arm-lift-text-2026-11-05` | `e98fde53346c7d53a3cb1d392f6367935132aa92a45945afc9eca1ffe4f84dc5` |
| `mat-chest-lift-abdominal-prep-v1` | `chair-seated-overhead-sidebend-v1`, `supine-chest-lift` | `original-mat-chest-lift` | `basi-cjkelly-chest-lift-v1`, `leicspart-chair-trunk-stretch-text-2026-11-05` | `bd8f8a2678b953a99c9070a25132296fada23c492d2755669ebbcb61c29e408c` |
| `mat-single-knee-to-chest-fold-v1` | `prone-single-straight-leg-extension-v1`, `supine-knee-fold` | `original-mat-knee-fold` | `rm-abdominal-operation-single-knee-lift-v1`, `rnoh-prone-hip-extension-text-2026-11-05` | `b35c18f923158f53beeca11988cc5e1aabae85b84e2965407215d04f413eba80` |
| `mat-prone-thoracic-extension-prep-v1` | `prone-forearm-chest-extension-v1` | `original-mat-swan-prep` | `ocats-prone-forearm-extension-text-2026-11-05`, `basi-cjkelly-baby-swan-v1` | `b0751a533b4fe73ed59acdc27f6a83cbb45db18f9c0ba6f2c4cd2bb6cd1912e2` |

---

## 5. 미확인 레거시 YouTube 제거 5종 대체 출처 감사 (`clearedYoutubeReplacementAudits`)

공개 oEmbed 검증에서 동작·기구·제목 일치가 확인되지 않아 제거된 5개 레거시 카탈로그 항목(`channelName: '자료 미확인'`)에 대해 제거 사유(`CLEARED_YOUTUBE_VIDEO_REASONS`) 보존과 대체 공식·공공 참고자료 매핑 및 SHA-256 해시를 검증했습니다.

| 카탈로그 동작 ID (`exerciseId`) | 제거된 레거시 비디오 식별자 (`legacyRemovedVideoId`) | 대체 참고자료 ID (`replacementReferences`) | `factualRecordSha256` (64-hex) |
| --- | --- | --- | --- |
| `ex-warmup-01` | `K56Z12XNQ5c` | `sr-01` (Merrithew Reformer & Fitness Circle), `kr-09` (위드필라테스 횡격막 호흡) | `bfefa3c12328615d71103eb0d470dc51f326ba995322aee6694b1e8cf1097ae4` |
| `ex-footwork-02` | `UItWltVZZmE` | `sr-01` (Merrithew Reformer & Fitness Circle), `mv-06` (Hip abduction/adduction) | `c43618fc186b9159e8590db3d6de995b110d3a71d711af475ebc6c51e0f79378` |
| `ex-cooldown-02` | `legacy-unverified-rolldown` | `sr-02` (Merrithew Standing Integration Series), `kr-08` (위드필라테스 호흡 기초) | `fa991a32cef67269a974cb1a4479e67de4622ab0424d1ced58e69264c85be226` |
| `ex-core-04` | `legacy-unverified-reverse-abs` | `mv-16` (Knee Stretch Prep with Rotations), `mv-08` (Quadruped Forward/Back Step) | `dea57eba5d5b7054e27eb340777326f015887a521299d1f5c4d11c4005da8e11` |
| `ex-lower-04` | `legacy-unverified-side-strap` | `mv-09` (Side-Lying Gait Patterns), `ruh-lateral-hip-side-abduction-v1` (RUH NHS PHY/067) | `c87756619a0ecb84ed5c4745cc7a338403aff029f0b1c89773bc1a7dd05ea818` |

---

## 6. `VERIFIED_REFERENCES` 30건 전수 생체역학 범위 및 메타데이터 감사 (`verifiedReferenceAuditRecords`)

[`src/data/verifiedReferences.ts`](../../src/data/verifiedReferences.ts)의 30개 전체 항목(`official-source-checked` 18건, `partial-playback-checked` 3건, `korean-candidate` 9건)에 대해 출처 메타데이터와 생체역학적 적용 범위(`auditConclusionStatus: 'source-metadata-and-biomechanical-scope-verified'`)를 전수 대조하고, `unverifiedRemainderCount: 0` 및 SHA-256 무결성을 검증했습니다.

| 참조 ID | 분류 (`originalVerificationStatus`) | 한글 제목 (`titleKo`) | 발행처 (`publisher`) | `factualRecordSha256` (64-hex) |
| --- | --- | --- | --- | --- |
| `mv-01` | `partial-playback-checked` | 체어 풋워크 | Merrithew 공식 웹사이트 | `6aa1ac13cedc2d9644f7121c794b8cf7f8ccff847e81c5f0361b6c5ad10bee93` |
| `mv-02` | `partial-playback-checked` | 미니볼 사이드 린 | Merrithew 공식 웹사이트 | `6535f12c4ae1d29601c4bec7d6fbd719009791afcd92e92fe90dd40b4dc924b8` |
| `mv-03` | `partial-playback-checked` | 미니볼 힙 익스텐션 | Merrithew 공식 웹사이트 | `3e1a674907e95954010703ea716e4d6e507e1ec9d548a4b035889085c1c85716` |
| `mv-04` | `official-source-checked` | 래더바렐 스완 다이브 | Merrithew 공식 웹사이트 | `e3bae62fc78570b2d5f12ef2ee8ea8c4fbd6eee1d6152a20fb84819e70cab9cf` |
| `mv-05` | `official-source-checked` | 밴드 사이드 벤드 | Merrithew 공식 웹사이트 | `dd4b1345871611f85026f7f2a17c88186d7cdf0508e6101c1f943093412ef655` |
| `sr-01` | `official-source-checked` | 리포머 링 준비운동 시리즈 | Merrithew 공식 웹사이트 | `a92f91164b94d76add462905a9abcbc4cbe4e868eb4280738e9b6c5d110f9ddd` |
| `mv-06` | `official-source-checked` | 루프밴드 리포머 점프 변형 | Merrithew 공식 웹사이트 | `fd8a4e238e92048812c33f076de42b2880173d72c7f513e0cc190e7d22ecbb5d` |
| `mv-07` | `official-source-checked` | 루프밴드 랫 풀다운 | Merrithew 공식 웹사이트 | `f0a50566c1a8d32d895f7553b46bb349ec1a2610bbcd5ef89547b7d8bb075e93` |
| `mv-08` | `official-source-checked` | 미니볼 네발기기 전후 스텝 | Merrithew 공식 웹사이트 | `ae6f097658d22abbc496f3da4058be047a2b39b563cfe029da89fe97c4a30a19` |
| `mv-09` | `official-source-checked` | 미니볼 옆누운 보행 패턴 | Merrithew 공식 웹사이트 | `307ab2d322687395c70ecdf2a09208d07fcbcdc817fff3b64553147d964d1119` |
| `mv-10` | `official-source-checked` | 닐링 사이드킥 | Merrithew 공식 웹사이트 | `c22b9a7f6a1f81174e2e40cea7b09f7eded07781d10703223cf8069cb49d9173` |
| `mv-11` | `official-source-checked` | 캐딜락 타이 스트레치 힌지 | Merrithew 공식 웹사이트 | `6495f5c0cf667995a8885ed58af55351674894ec5a9bd1f9f98fa75ec758119b` |
| `mv-12` | `official-source-checked` | 캐딜락 타이 스트레치 신전 변형 | Merrithew 공식 웹사이트 | `97cdc17d3e7435aa6a120bd68719c50c05e805317178444478bbe00d1837718f` |
| `mv-13` | `official-source-checked` | 리포머 타이 스트레치 | Merrithew 공식 웹사이트 | `a0b3109376ab6433b5318afce87b560dc9684f4f419dc2654cdb1eb02fa45d33` |
| `mv-14` | `official-source-checked` | 매트 스완 다이브 | Merrithew 공식 웹사이트 | `c3aaedba7b799643878510839ad2124f2d373021bc75060d2611680569aa8697` |
| `mv-15` | `official-source-checked` | 리포머 스완 다이브 변형 | Merrithew 공식 웹사이트 | `d9e87fd3d6fa028cbbdb3019c7ee867f517226260fa03eeae6e147a10231d51e` |
| `mv-16` | `official-source-checked` | 회전 니 스트레치 프렙 | Merrithew 공식 웹사이트 | `cd18ca5cfb6d922468dd26d00224216904f4f1883f74484fcc3d7ad8a23f9298` |
| `mv-17` | `official-source-checked` | 리포머 백 스플릿 | Merrithew 공식 웹사이트 | `6df7e2b0701a87b4eaf815f34cd2e9094a3dc82713b3a7c705ae64b451ff9368` |
| `sr-02` | `official-source-checked` | 스탠딩 밴드 통합 시리즈 | Merrithew 공식 웹사이트 | `83a9aa59c54d20d48040b629499cb7b5fa3fd466e5d54798fc430c477ef2479e` |
| `sr-03` | `official-source-checked` | 폼롤러 활용 시리즈 | Merrithew 공식 웹사이트 | `2d878268cc8b844de6e9526c2123132c0f905e40b095533bcd00f3f29b45f582` |
| `mv-18` | `official-source-checked` | 짐볼 롤오버 | Merrithew 공식 웹사이트 | `da57ff367f3f8618b372884d07ab294372bd2da10c6c98403d5132a4d7e499ab` |
| `kr-01` | `korean-candidate` | 헌드레드 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-02` | `korean-candidate` | 롤업 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-03` | `korean-candidate` | 원 레그 서클 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-04` | `korean-candidate` | 싱글 레그 스트레치 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-05` | `korean-candidate` | 숄더 브릿지 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-06` | `korean-candidate` | 폼롤러 흉추 가동성 & 코어 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-07` | `korean-candidate` | 레그 로워 앤 리프트 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-08` | `korean-candidate` | 필라테스 호흡 기초 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |
| `kr-09` | `korean-candidate` | 필라테스 횡격막 호흡법 | WITH PILATES / 위드필라테스 | `verifiedReferenceAuditRecords` 내 SHA-256 일치 검증 완료 |

---

## 7. 98개 전 동작 생체역학·출처 괴리 검토 (`TRACK_A` + `TRACK_B` + `TRACK_C` + `TRACK_D` = 98 / 98)

카탈로그 98개 전 동작에 대해 시작·중간·끝 3단계 관절 방향, 지지점, 기구 상호작용, 호흡, 주동·협응·안정화 근육, 보상 패턴, 금기/수정 옵션, 그리고 사실(`fact`)·추론(`inference`)·미검증(`unverified`) 인식론적 분리 감사를 수행하고 `validateMotionEvidenceRecord()` 무결성을 100% 통과했습니다.

| 트랙 구분 | 소유 파일 | 대상 기구 범주 | 레코드 수 | 검증 결과 (`validateMotionEvidenceRecord`) |
| --- | --- | --- | --- | --- |
| **`TRACK_A`** (`track-a-mat`) | [`src/features/motionEvidenceReview/trackAMatEvidence.ts`](../../src/features/motionEvidenceReview/trackAMatEvidence.ts) | 매트 핵심 동작 10종 (`apparatus: 'mat'`) | **10건** | `10 / 10 PASS` (중복 ID 0건) |
| **`TRACK_B`** (`track-b-apparatus`) | [`src/features/motionEvidenceReview/trackBApparatusEvidence.ts`](../../src/features/motionEvidenceReview/trackBApparatusEvidence.ts) | 기구 핵심 동작 10종 (`reformer`, `cadillac`, `chair`, `barrel`) | **10건** | `10 / 10 PASS` (중복 ID 0건) |
| **`TRACK_C`** (`track-c-extended-mat`) | [`src/features/motionEvidenceReview/trackCExtendedMatEvidence.ts`](../../src/features/motionEvidenceReview/trackCExtendedMatEvidence.ts) | 확장 매트 동작 12종 (`apparatus: 'mat'`, 전체 매트 22종 중 잔여 12종) | **12건** | `12 / 12 PASS` (중복 ID 0건) |
| **`TRACK_D`** (`track-d-extended-apparatus`) | [`src/features/motionEvidenceReview/trackDExtendedApparatusEvidence.ts`](../../src/features/motionEvidenceReview/trackDExtendedApparatusEvidence.ts) | 확장 기구 동작 66종 (`reformer`, `cadillac`, `chair`, `barrel`, 전체 기구 76종 중 잔여 66종) | **66건** | `66 / 66 PASS` (중복 ID 0건) |
| **합계** | — | **`INITIAL_EXERCISES` 전수 커버리지** | **98 / 98건** | **`98 / 98 PASS` (`canonicalMotionReady: false`, `true3dSupported: false`)** |

---

## 8. 재현 및 검증 명령 (Verification Command)

```bash
npx vitest run src/test/motionAndSourceLedgerCompleteness.test.ts
```
