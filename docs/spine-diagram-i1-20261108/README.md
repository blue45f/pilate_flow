# [I1/구현] Pilates 척추 분절 2D 도해 구현 및 시각 검증 보고서

- **브랜치**: `gemini/diagram-i1-spine-20261108` (`main` 통합 및 원격 동기화 포함)
- **대상 동작군**:
  1. **롤업 (`spine-roll-up`)** — Mat / Reformer / Cadillac Spine Roll-Up
  2. **롤다운 (`spine-roll-down`)** — Standing / Seated Spine Roll-Down
  3. **스파인 스트레치 (`spine-stretch`)** — Mat / Barrel Spine Stretch Forward

---

## 1. 소유 파일 및 구현 구성

- `src/data/spineArticulationDiagramData.ts`
  - 6분절 척추 체인(`c7`, `t4`, `t8`, `t12`, `l3`, `s1`) 3단계(`start`, `middle`, `end`) 기하 좌표
  - 매트 수평 기준선(`matBaselineY = 144`) 및 스파인 스트레치 가상 수직벽 플럼라인(`wallPlumbLineX = 58`)
  - 공개 교본 출처(`sources`) 및 비의료 진실성 메타데이터(`SPINE_TRUTHFULNESS_METADATA`)
  - I7 연결 어댑터(`resolveSpineArticulationDiagramByExerciseId`, `resolveSpineArticulationVisualAsset`, `getSpineCatalogMovementVisualAssets`, `getSpineMovementDiagramCorrections`, `toSpineMovementPhaseDiagramProps`, `toSpineMovementTriptychDiagramProps`)
- `src/components/SpineArticulationDiagramSvg.tsx`
  - 독립 2D 척추 분절 SVG 도해(`SpineArticulationDiagramSvg`), 3단계 연속 도해(`SpineArticulationTriptychSvg`), 6종 기호 범례(`SpineArticulationLegend`)
  - 관절축(`data-testid="spine-joint-axes"`: 경추 `C7`, 요추 스쿱 `L3`, 골반·고관절 중심축), 고정 앵커(`data-layer="fixed-anchors"`), 분절·대조 방향 벡터(`data-layer="direction-vector"`), 근위(실선)·원위(점선) 양측 사지(`data-testid="spine-bilateral-far-limbs"`) 렌더링
- `src/components/SpineArticulationDiagramReference.tsx`
  - 동작 전환 탭, 3단계 자세 탭, 6분절 좌표 칩, 출처 대조 섹션, 비의료 고지 푸터 및 `SpineI7IntegrationExample`
- `src/styles/spine-articulation-diagram.css`
  - `320px` · `390px` · `768px` · `1440px` · `200%` 확대 대응 반응형 레이아웃
- `src/test/spineArticulationDiagram.test.tsx`
  - 합성 픽스처(`SYNTHETIC_SPINE_FIXTURES`) 기반 기하 불변식, 관절축·양측 사지·범례·I7 어댑터 단위/통합 테스트

---

## 2. 공개 근거 출처 (Verified Public Sources)

1. **롤업 (`spine-roll-up`)**:
   - Pilates Foundation UK — *The Roll Up — Classical Matwork Teaching Guide*: https://www.pilatesfoundation.com/pilates/the-history-of-pilates/
   - BASI Pilates — *Spinal Articulation & Pelvic C-Curve in the Roll Up*: https://www.basipilates.com/blog/spinal-articulation-in-pilates/
   - Balanced Body Education — *Mat Instructor Manual — Roll Up Opposition & Heel Anchor*: https://www.pilates.com/education/mat-instructor-training/
2. **롤다운 (`spine-roll-down`)**:
   - Merrithew (STOTT PILATES®) — *Spinal Articulation & Roll Down Mechanics*: https://www.merrithew.com/blog/post/2020-08-27/ask-the-expert-how-to-maintain-a-healthy-and-mobile-spine-at-any-age
   - Polestar Pilates — *Segmental Spinal Control in Roll Down & Half Roll Back*: https://polestarpilates.com/blog/
   - Pilates Method Alliance (PMA) — *Study Guide — Lumbopelvic Imprint & Eccentric Roll Down*: https://www.pilatesmethodalliance.org/
3. **스파인 스트레치 (`spine-stretch`)**:
   - Balanced Body (*The CORE®*) — *Spine Stretch Forward — Imaginary Wall & Sit-Bone Anchor*: https://thecore.pilates.com/
   - BASI Pilates — *Spine Stretch — Opposition Between Lumbar Lift and Crown Reach*: https://www.basipilates.com/blog/
   - Joseph H. Pilates (1945 Public Domain) — *Return to Life Through Contrology — Spine Stretch*: https://archive.org/details/returntolifethro00pila

---

## 3. 비의료·진실성 고지

- `anatomicalAccuracyAssumed: false`
- `anatomicalVerificationCompleted: false`
- `expertVerificationCompleted: false`
- `professionalReviewCount: 0`
- `containsMedicalDiagnosisOrGuarantee: false`
- 본 2D 척추 분절 도해는 수업 구성을 돕기 위한 교육·참고용 모식도이며, 의학적 진단·처방이나 재활 치료 효과를 보증하지 않습니다.
