import { getCoreI7RegistryPatch } from './coreAbdominalDiagrams';
import { getExtensionDiagramCorrections } from './extensionMovementData';
import { getHipLegDiagramCorrections } from './hip-leg-diagram-data';
import { getMovementVisualAsset } from './movementVisualRigCatalog';
import { getPelvisHipDiagramCorrections } from './pelvisHipDiagramData';
import { getRotationI7IntegrationBundle } from './rotationDiagramData';
import { getShoulderSupportRegistryIntegrationPayload } from './shoulderSupportDiagrams';
import { getSpineMovementDiagramCorrections } from './spineArticulationDiagramData';

/** Reviewed source statements, not a professional or frame-by-frame approval. */
export interface MovementDiagramCorrection {
  readonly archetypeId: string;
  readonly checkedAt: '2026-11-06';
  readonly reviewedScopeKo: string;
  readonly correctionKo: string;
  readonly limitationKo: string;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly sources: readonly { readonly title: string; readonly url: string }[];
}

const BASE_SIDE_LYING_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> = Object.freeze({
  'original-mat-clam': {
    archetypeId: 'mat-clam-isolated', checkedAt: '2026-11-06',
    reviewedScopeKo: 'NHS 두 기관의 클램 본문과 위 무릎 열기·발 위치 유지·몸통 회전 방지·복귀를 직접 대조했어요.',
    correctionKo: '함께 섞여 있던 오픈 북의 팔·몸통 회전을 제거했어요.',
    limitationKo: '2D 좌표·가동범위·머리 지지·근육 표현은 전문 검증 전이에요. 개인에게 안전한 범위를 뜻하지 않아요.',
    professionalReviewCount: 0, sourceFrameMappings: 0,
    sources: [
      { title: 'CUH NHS · General stability exercises · Clam shell', url: 'https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/' },
      { title: 'South Tees NHS · The clam', url: 'https://www.southtees.nhs.uk/resources/the-clam/' },
    ],
  },
  'original-mat-open-book': {
    archetypeId: 'mat-open-book-isolated', checkedAt: '2026-11-06',
    reviewedScopeKo: '매트 오픈 북의 옆으로 누운 준비 자세·팔과 흉곽 회전·무릎 유지·팔 복귀를 출처 본문과 직접 대조했어요.',
    correctionKo: '함께 섞여 있던 클램의 무릎 벌림을 제거했어요.',
    limitationKo: '원본 영상 프레임·2D 각도·머리 지지·해부학적 정확성은 검증 전이에요. 팔을 바닥까지 억지로 누르는 동작이 아니에요.',
    professionalReviewCount: 0, sourceFrameMappings: 0,
    sources: [
      { title: 'Physitrack · Open book · Version 3', url: 'https://na.physitrack.com/home-exercise-video/thoracic-rotations-in-side-lying-%2528open-book%2529---version-3' },
      { title: 'HQPT / MedBridge · Open Book · PDF 2쪽', url: 'https://hqpt.com/wp-content/uploads/2022/04/Yard-work-cool-down.pdf#page=2' },
    ],
  },
});

const corePatch = getCoreI7RegistryPatch();
const shoulderPayload = getShoulderSupportRegistryIntegrationPayload();
const rotationBundle = getRotationI7IntegrationBundle();

const RAW_DIAGRAM_CORRECTIONS: Record<string, MovementDiagramCorrection> = {
  ...BASE_SIDE_LYING_CORRECTIONS,
  ...getSpineMovementDiagramCorrections(),
  ...getPelvisHipDiagramCorrections(),
  ...getHipLegDiagramCorrections(),
  ...getExtensionDiagramCorrections(),
  ...shoulderPayload.corrections,
  ...rotationBundle.diagramCorrections,
  ...corePatch.corrections,
};

export const MOVEMENT_DIAGRAM_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_DIAGRAM_CORRECTIONS).map(([id, correction]) => {
      const asset = getMovementVisualAsset(id);
      if (asset && asset.archetypeId !== correction.archetypeId) {
        return [
          id,
          Object.freeze({
            ...correction,
            archetypeId: asset.archetypeId,
          }),
        ];
      }
      return [id, correction];
    }),
  ),
);

