import type { ApparatusType } from '../types/pilates';

export interface StudioApparatusGlbMeta {
  readonly apparatus: ApparatusType | 'practitioner' | 'skinned-instructor' | 'apparatus-dynamic-parts';
  readonly labelKo: string;
  readonly url: string;
  readonly fileName: string;
  readonly fileBytes: number;
  readonly triangles: number;
  readonly vertices: number;
  readonly drawCalls: number;
  readonly boneCount?: number;
  readonly partCount?: number;
  readonly glbForgeScore: number;
  readonly mobileHeroScore: number;
  readonly arkitCompatible: boolean;
  readonly sha256: string;
  readonly generator: 'Blender 5.3.0';
  readonly summaryKo: string;
}

export const BLENDER_STUDIO_GLB_MANIFEST: Readonly<Record<ApparatusType, StudioApparatusGlbMeta>> =
  {
    reformer: {
      apparatus: 'reformer',
      labelKo: '리포머 3D 모델 (.glb)',
      url: '/models/pilates-studio/reformer-studio-rig.glb',
      fileName: 'reformer-studio-rig.glb',
      fileBytes: 2665236,
      triangles: 97296,
      vertices: 48914,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '2fe4841e453d4370043a125616d80824d7aa6b688438338f986865ab054143db',
      generator: 'Blender 5.3.0',
      summaryKo:
        '누운 자세에서 발로 바를 미는 모습을 담았어요. 움직이는 발판, 발이 닿는 바, 양옆의 끈을 돌려 보며 확인할 수 있어요.',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 3D 모델 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 2646236,
      triangles: 95964,
      vertices: 48270,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '8886a2dad343693dfd525914f5647246fc691af14a4dcba9c5f55dfc94f2719b',
      generator: 'Blender 5.3.0',
      summaryKo:
        '캐딜락 위에 앉아 양손으로 바를 잡은 모습이에요. 바가 어느 방향에서 스프링에 연결되는지 살펴보세요.',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '체어 3D 모델 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 2408812,
      triangles: 90852,
      vertices: 45616,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '9d7b9719de5e853999fa14060eb0699c9737e751e506860ed689c19cfb12ba79',
      generator: 'Blender 5.3.0',
      summaryKo:
        '손으로 의자 위를 짚고 발로 페달을 누른 모습이에요. 손과 발이 각각 어디에 닿는지 볼 수 있어요.',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 3D 모델 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 2394444,
      triangles: 91716,
      vertices: 46042,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '685841dd7580fc8738aa656076caaab1e1df9a0294c524b0ed302ac07eefc22f',
      generator: 'Blender 5.3.0',
      summaryKo:
        '몸통 옆을 둥근 바렐에 기대고 발을 사다리에 댄 모습이에요. 옆에서 보면 몸을 받쳐 주는 위치가 보입니다.',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '매트와 소도구 3D 모델 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 2343740,
      triangles: 90616,
      vertices: 45440,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '6cfe231a2bb098aa26134ab79eba14f449e69c5a3cdd60b1e1d79e6fd20ee898',
      generator: 'Blender 5.3.0',
      summaryKo:
        '매트에 누워 다리를 든 자세예요. 주변에는 수업에서 쓰는 링, 폼롤러, 작은 공을 함께 놓았어요.',
    },
  };

export const STUDIO_PRACTITIONER_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'practitioner',
  labelKo: '강사 자세 3D 모델 (.glb)',
  url: '/models/pilates-studio/practitioner-studio-rig.glb',
  fileName: 'practitioner-studio-rig.glb',
  fileBytes: 2303440,
  triangles: 89216,
  vertices: 44712,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: 'ee586bc54916b7678390ba98f2d4a4f6349b7c99684e8e5e968036e841e1f8ed',
  generator: 'Blender 5.3.0',
  summaryKo:
    '한 발로 서서 반대쪽 다리를 뒤로 든 모습이에요. 앞과 옆에서 지지하는 다리와 몸통의 관계를 살펴볼 수 있어요.',
};

export const STUDIO_SKINNED_INSTRUCTOR_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'skinned-instructor',
  labelKo: '움직이는 강사 모델 (.glb)',
  url: '/models/pilates-studio/instructor-skinned-v5.glb',
  fileName: 'instructor-skinned-v5.glb',
  fileBytes: 1105828,
  triangles: 27520,
  vertices: 14189,
  drawCalls: 1,
  boneCount: 21,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: '9b65e5657ba2fb69c5330559a349745d46e2a954f3b638670c8a9ae1d05fc3fd',
  generator: 'Blender 5.3.0',
  summaryKo:
    '어깨, 팔꿈치, 골반, 무릎을 비롯한 21개 관절로 동작을 보여 주는 연습용 인체 모델이에요.',
};

export const STUDIO_APPARATUS_DYNAMIC_PARTS_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'apparatus-dynamic-parts',
  labelKo: '움직이는 기구 모델 (.glb)',
  url: '/models/pilates-studio/apparatus-dynamic-parts-v1.glb',
  fileName: 'apparatus-dynamic-parts-v1.glb',
  fileBytes: 1818808,
  triangles: 32404,
  vertices: 31124,
  drawCalls: 1,
  partCount: 12,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: 'b9d10516e7e598ef3615923af1b19a1f08d5f924a3a0d89836fc59669e03f3e4',
  generator: 'Blender 5.3.0',
  summaryKo:
    '리포머, 체어, 캐딜락, 바렐, 매트의 구성품을 담았어요. 발판과 페달, 바처럼 움직이는 부분을 따로 돌리거나 옮길 수 있어요.',
};

export const ALL_STUDIO_GLB_ASSETS: readonly StudioApparatusGlbMeta[] = Object.freeze([
  ...Object.values(BLENDER_STUDIO_GLB_MANIFEST),
  STUDIO_PRACTITIONER_GLB_META,
]);

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
