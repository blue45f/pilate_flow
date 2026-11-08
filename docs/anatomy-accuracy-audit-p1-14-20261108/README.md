# [P1/14] Pilates Flow 2D 해부학 정확도 독립 감사 및 교정 보고서

- **감사 기준 브랜치**: `main` (`origin/main` 동기화)
- **비진단 원칙 준수**: 모든 시각 자산 및 감사 레코드에서 `anatomicalAccuracyAssumed: false` 유지, 의학적 진단·개인별 임상 처방 조언 일절 배제
- **제외 범위 준수**: 수업 기록 페이지(`ClassBinderView.tsx`, `LogSessionModal.tsx`, `docs/history-*`) 및 기존 QA 통합 제외, 기존 완료 감사(`D-01`~`D-05`, `SM-01`~`SM-08`, 호흡 4종)와 중복 없는 신규 결함 교정

---

## 우선순위 상위 5대 결함 및 교정 내역

| 순위 | 분류 | 대상 파일 및 심볼 | 합성 데이터 재현 증거 (교정 전) | 교정 내용 및 검증 결과 |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **정렬선·각도 아크 (`alignments` / `angle-arc`)** | `src/data/movementVisualRigCatalog.ts` (`buildSemanticOverrideBlueprint`, `resolveSeparatedApparatusContactBlueprint`), `src/components/MovementPhaseDiagramSvg.tsx` (`renderAlignmentGuideItem`) | 1) `buildSemanticOverrideBlueprint` 및 `barrel-standing-hip-extension-isolated`, `reformer-strap-frog-isolated`에서 `alignments`와 `directionVectors.start`가 기본 아키타입 좌표를 그대로 상속받아 현재 관절에서 **58~132px 떨어진 허공**에 표시됨.<br>2) `angle-arc`가 두 관절 사이 각도 부채꼴이 아니라 선분 중점의 **360° 원(`<circle r={9}>`)**으로 렌더링되고 `targetAngleDeg`가 기하학적 각도와 최대 **48.6° 불일치**함. | 1) 모든 분리 오버라이드 블루프린트에서 각 페이즈의 실제 관절·고정 앵커 좌표를 기반으로 `alignments` 및 `directionVectors.start` 생성.<br>2) `buildAngleArcSvgPath`를 도입해 실제 각도 부채꼴 `<path data-angle-arc>`로 렌더링하고 `targetAngleDeg`를 실제 관절 기하 각도와 정합화. |
| **P2** | **근육 매핑·폴리라인 (`primaryMuscles` / `anchorJoints`)** | `src/data/movementVisualRigCatalog.ts` (`MUSCLE_GROUP_CATALOG`, `buildMuscleHighlights`), `src/components/MovementPhaseDiagramSvg.tsx` (`renderPrimaryMusclesLayer`) | 1) `quadriceps`가 발목(`ankle`), `calves`가 발끝(`toe`), `shoulder-deltoid`가 손목(`wrist`), `hip-flexor-iliopsoas`가 무릎(`knee`)까지 침범.<br>2) `'중둔근'`이 `'둔근'` 부분문자열 매칭으로 `glute-max`에 오분류되고, `'심부경추굴곡근'`이 `thoracic-extensors`에 배정되며, fallback 시 동일 근육 그룹이 중복 생성됨.<br>3) 2관절 근육 배지가 원위 관절에 겹치고 동일 `anchorJoints` 근육들이 100% 중첩됨. | 1) 해부학적 부착 범위에 맞게 `anchorJoints` 축소(`quadriceps: ['hip','knee']` 등).<br>2) `matchesMuscleKeyword` 경계 매칭, `'심부경추굴곡근'`의 `core-transversus` 이동, 역할별 고유 fallback 보장.<br>3) 폴리라인 호 길이 보간(`interpolateAlongPolyline`) 및 법선 오프셋(`±3.5px`) 적용. |
| **P3** | **관절 체인 연속성 (`joints` / `endJoints`)** | `src/data/movementVisualRigCatalog.ts` (`resolveSeparatedApparatusContactBlueprint`, `resolveSeparatedSemanticMismatchBlueprint`, `standing-scooter-lunge-splits`) | 1) `original-reformer-strap-frog`의 `endJoints`에서 누운 상체 전체가 4~10px 이동.<br>2) 6개 분리 오버라이드의 `endJoints`에서 `head`와 `thoracic`만 이동하고 `neck`이 누락되어 경추가 **116°~143°로 꺾임**.<br>3) `standing-scooter-lunge-splits` 중간 자세에서 작동 다리 무릎이 뒤로 꺾임(슬관절 과신전). | 1) 프로그 `endJoints`가 `...base.startJoints` 상체 좌표를 보존하도록 수정.<br>2) 6개 분리 오버라이드의 `endJoints`에 `neck`·`shoulder`·척추 보간 좌표를 명시하여 경추 내각 **167°~180°** 확보.<br>3) 스쿠터 중간 자세 `knee`를 `{ x: 220, y: 138 }`로 교정. |
| **P4** | **동작 방향·앵커 모순 (`directionVectors` / `calculatePhaseJointDelta`)** | `src/data/movementVisualRigCatalog.ts` (`calculatePhaseJointDelta`, `ARCHETYPE_BLUEPRINTS`, `resolveSeparatedApparatusContactBlueprint`, `resolveSeparatedSemanticMismatchBlueprint`) | 1) `ex-plank-01`, `ex-plank-02`, `ex-lower-02`에서 이동 관절(`ankle` 23~52px 이동)이 `fixedAnchors`에 등록되어 `movedJoints`와 `anchoredJoints`에 **동시 출현**.<br>2) 10개 `directionVectors`가 3점 폴리라인에 서로 다른 두 관절(예: 골반→골반→흉추, 흉추→머리→손)을 이어 그릇된 궤적을 표시. | 1) 플랭크·사이드스플릿 고정 앵커를 실제 고정 지지점(`hand`, `farKnee`)으로 교정하고 `calculatePhaseJointDelta`에서 이동 관절을 `anchoredSet`에서 즉시 제거.<br>2) 다관절 혼선 3점 화살표를 단일 관절 궤적 또는 동일 관절 아크로 교정. |
| **P5** | **레이블·범례·좌우 전환 (`activeSide` / `JOINT_LABELS_KO` / `compareCatalogMovements`)** | `src/components/MovementPhaseDiagramSvg.tsx`, `src/components/MovementVisualGuideCard.tsx`, `src/data/movementVisualSourceAudit.ts` | 1) 단측(`isUnilateral`) 동작의 좌/우 토글(`activeSide`)이 SVG 좌표에 반영되지 않아 좌/우 도해가 100% 동일했고, 머리 방향선이 정수리 안테나처럼 수직(`y - 7`)으로 솟아 있음.<br>2) `JOINT_LABELS_KO`의 `'손(바닥/스트랩)'`, `'골반(천골/좌골)'`, `'머리(정수리)'`가 자세와 충돌하고, `compareCatalogMovements(B, A)` 역방향 호출 시 좌/우 동작 설명이 뒤바뀌며 공통 근육이 중복 출력됨. | 1) `activeSide === 'right'`일 때 근위(실선)·원위(점선) 사지 체인을 교차 렌더링하고 머리 방향선을 전방 시선 벡터(`head-gaze`)로 교체.<br>2) 자세 중립적 해부학 명칭(`'손(수부)'`, `'골반(천골·좌골·치골)'`, `'머리(두부)'`) 및 황토색 신장 배지 팔레트 통일, `compareCatalogMovements` 역방향 안전 분기 적용. |

---

## 검증 명령 및 합성 테스트

- `pnpm exec vitest run src/test/anatomyAccuracyAuditP1_14.test.tsx`
- `pnpm exec vitest run src/test/movementVisualGuide.test.tsx src/test/diagramApparatusContactRegression.test.tsx src/test/diagramTracksIntegration.test.tsx src/test/sideLyingDiagramSeparation.test.ts`
