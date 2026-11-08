# Track I8 — Pilates Rotation 2D Diagrams (`Saw`, `Spine Twist`, `Criss-Cross`)

## 1. Owned Files (`rotation*` Prefix & `src/features/rotationDiagramCandidate/`)

- [`src/data/rotationSourceFacts.json`](../../data/rotationSourceFacts.json) — Verified public source ledger (`Return to Life Through Contrology` 1945 #11 Criss-Cross, #14 The Spine Twist, #16 The Saw; repository verified Lesson #4; PMA/Balanced Body axial rotation cues) and truthfulness disclosures (`anatomicalAccuracyAssumed: false`, `professionalReviewCount: 0`, `sourceFrameMappings: 0`).
- [`src/models/rotation-LICENSE.txt`](../../models/rotation-LICENSE.txt) — `CC0-1.0 OR MIT` clean-room numeric synthesis license and non-medical notice.
- [`src/models/rotation-provenance.md`](../../models/rotation-provenance.md) — Provenance ledger and 5-axis kinematic distinction matrix.
- [`src/models/rotationDrafts.ts`](../../models/rotationDrafts.ts) — Pure 3D-to-2D projected kinematic models (`getRotationDiscretePose`, `getRotationDraftPose`, `getRotationKinematicTelemetry`, `projectRotationPoint`) for `rotation-mat-saw`, `rotation-mat-spine-twist`, and `rotation-mat-criss-cross`.
- [`src/data/rotationDiagramData.ts`](../../data/rotationDiagramData.ts) — `ROTATION_VISUAL_ASSETS` (`CatalogMovementVisualAsset`), `ROTATION_DIAGRAM_CORRECTIONS` (`MovementDiagramCorrection`), `ROTATION_PATTERN_REFERENCES`, `ROTATION_CATALOG_EXERCISE_BINDINGS`, and `getRotationI7IntegrationBundle()`.
- [`src/components/RotationDraftFigure.tsx`](../../components/RotationDraftFigure.tsx) — Dedicated 2D schematic SVG component (`<RotationDraftFigure />`) and 3-phase triptych (`<RotationPhaseTriptych />`) rendering `data-rotation-axis`, `data-pelvis-anchor`, `data-gaze-vector`, `data-ribcage-scapula`, and `data-transition-pose`.
- [`src/features/rotationDiagramCandidate/rotationDiagramAdapters.ts`](./rotationDiagramAdapters.ts) & [`src/features/rotationDiagramCandidate/index.ts`](./index.ts) — Shared registry adapters (`toRotationMovementPhaseDiagramProps`, `toRotationMovementTriptychProps`, `resolveRotationDiagramCandidate`).
- [`src/test/rotationDiagram.test.tsx`](../../test/rotationDiagram.test.tsx) — Unit and component verification suite.

## 2. Five Mandatory Kinematic Distinctions

1. **회전축 (`data-rotation-axis`)**:
   - **스파인 트위스트 (`rotation-mat-spine-twist`)**: 정수리-천골 수직 축회전(`vertical-plumb-axis`, 후방 C-커브 롤백 0°).
   - **쏘 (`rotation-mat-saw`)**: 1차 수직 축회전 선행 후 2차 고관절·흉추 사선 굴곡 힌지축(`twist-then-hinge-axis`).
   - **크리스크로스 (`rotation-mat-criss-cross`)**: 견갑 하각 부양 상부 흉추 굴곡 + 사선 회전축(`oblique-curl-axis`).
2. **골반 고정 (`data-pelvis-anchor`)**:
   - 모든 단계에서 골반 변위 `pelvisShiftMm === 0`, 좌골 들림 `sitBoneLiftMm === 0` 유지.
   - 스파인 트위스트 양 발뒤꿈치 X 정렬(`heelAlignmentDeltaMm === 0`), 쏘 V-싯 반대쪽 좌골 고정, 크리스크로스 천골 수평 임프린트 고정.
3. **시선 (`data-gaze-vector`)**:
   - 경추 단독 과회전/과신전 없이 흉골 회전·굴곡 궤적과 결합된 시선 벡터(`sternum-coupled`).
4. **갈비뼈/견갑 (`data-ribcage-scapula`)**:
   - 축회전 각도(`yawDeg`) 증가에 따른 실제 2D 양측 어깨 폭 단축(`shoulderSpan2D < restShoulderSpan`, `coronal-foreshortening`), 스파인 트위스트 180° T-암 유지, 쏘 앞손 반대 새끼발가락 리치 + 뒷팔 내회전 후방 신전, 크리스크로스 팔꿈치 광폭(`>= 165°`) + 겨드랑이→반대 무릎 사선 슬링.
5. **전환 자세 (`data-transition-pose`)**:
   - `start`(준비·정렬) → `middle`(최대 회전·도달 정점) → `end`(수직 신장 복귀 / 회전 유지 척추 재적층 후 복귀 / 고-컬업 높이 유지 중앙 교차 전환).

## 3. Usage Example (I7 Shared App Integration)

```tsx
import {
  RotationDraftFigure,
  RotationPhaseTriptych,
  toRotationMovementPhaseDiagramProps,
  toRotationMovementTriptychProps,
  resolveRotationDiagramCandidate,
} from '../features/rotationDiagramCandidate';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';

// Dedicated 2D Rotation Diagram & 3-Phase Triptych
<RotationDraftFigure movementId="rotation-mat-saw" phase="middle" showProvenance />
<RotationPhaseTriptych movementId="rotation-mat-criss-cross" activePhase="middle" />

// Shared MovementPhaseDiagramSvg / MovementTriptychDiagramSvg Adapter
const phaseProps = toRotationMovementPhaseDiagramProps('ex-core-02', 'middle');
const triptychProps = toRotationMovementTriptychProps('ex-cooldown-01', { selectedPhase: 'middle' });
{phaseProps && <MovementPhaseDiagramSvg {...phaseProps} />}
{triptychProps && <MovementTriptychDiagramSvg {...triptychProps} />}
```

## 4. Non-Clinical / Non-Medical Disclaimer

- `anatomicalAccuracyAssumed: false`
- `professionalReviewCount: 0`
- `sourceFrameMappings: 0`
- 본 도해와 데이터는 필라테스 회전 동작의 2D 운동학·정렬 학습 참고용이며, 의학적 진단·임상 평가·치료 효과를 보증하지 않습니다.
