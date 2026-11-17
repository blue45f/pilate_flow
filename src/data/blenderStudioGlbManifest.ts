import type { ApparatusType } from '../types/pilates';

export interface StudioApparatusGlbMeta {
  readonly apparatus: ApparatusType | 'practitioner';
  readonly labelKo: string;
  readonly url: string;
  readonly fileName: string;
  readonly fileBytes: number;
  readonly triangles: number;
  readonly vertices: number;
  readonly drawCalls: number;
  readonly glbForgeScore: number;
  readonly mobileHeroScore: number;
  readonly arkitCompatible: boolean;
  readonly sha256: string;
  readonly generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)';
  readonly summaryKo: string;
}

export const BLENDER_STUDIO_GLB_MANIFEST: Readonly<Record<ApparatusType, StudioApparatusGlbMeta>> =
  {
    reformer: {
      apparatus: 'reformer',
      labelKo: '아틀리에 리포머 3D 정본 (.glb)',
      url: '/models/pilates-studio/reformer-studio-rig.glb',
      fileName: 'reformer-studio-rig.glb',
      fileBytes: 650780,
      triangles: 32912,
      vertices: 44365,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'a8a5017c018601672252301d20705004dbec876871d791df61d39d8d23349f93',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '화이트오크·알루미늄 C트랙 & 4슬롯 기어바 리포머 · 5코일 컬러 스프링 · 연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 수행자',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 561460,
      triangles: 29888,
      vertices: 38217,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'df8bd5f86ae06a16a46656179b652d09f59353d9b5ab8e7cebf267e9956466d4',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '하부 H스트레처·황동 코너 캐스팅 4포스트 캐딜락 · 푸쉬스루·롤다운바 & 퍼지 루프 · 연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 수행자',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 519648,
      triangles: 27204,
      vertices: 34355,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'd2b4c41449ebb8e7edfe8f2f20f6a99c1b87879b099a10b5af0d58c6a232cbb0',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '오픈 C-프레임 화이트오크 운다 체어 · 4단 스프링 캑터스 트리 & 월넛 스플릿 페달 · 연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 수행자',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 514548,
      triangles: 27520,
      vertices: 34440,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '8a36e5efce319237d56be25c7b80c053271fefe9bed14201de161d3a884c4709',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '곡면 화이트오크 치크 아치 볼트 & 슬라이딩 베이스 · 5단 월넛 래더 바렐 · 연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 스완 수행자',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 488400,
      triangles: 26400,
      vertices: 33018,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '5a0b2f16d886709b28be74d38a96ace27b9b45daa382950fae7e1f3f4f81b2cb',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '코르크 베이스 & 파이핑 아틀리에 매트 · 듀얼패드 매직써클·폼롤러·미니볼 · 연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 헌드레드 수행자',
    },
  };

export const STUDIO_PRACTITIONER_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'practitioner',
  labelKo: '스튜디오 필라테스 수행자 3D 조형 정본 (.glb)',
  url: '/models/pilates-studio/practitioner-studio-rig.glb',
  fileName: 'practitioner-studio-rig.glb',
  fileBytes: 486252,
  triangles: 25668,
  vertices: 32556,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: '9be293d262b4d8d2c81ff44192682d92ebe3f33390d03eea130114e45892b245',
  generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
  summaryKo:
    '연속 SubD 해부학 토르소·근복 로프트 · 5지 조형 손·그립삭스 발 · 세이지 아틀리에 수트·시뇽 헤어 · 월넛 페데스탈 & 황동 토닝볼 아라베스크 정본',
};

export const ALL_STUDIO_GLB_ASSETS: readonly StudioApparatusGlbMeta[] = Object.freeze([
  ...Object.values(BLENDER_STUDIO_GLB_MANIFEST),
  STUDIO_PRACTITIONER_GLB_META,
]);

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
