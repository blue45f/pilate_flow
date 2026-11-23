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
  readonly generator: 'Blender 5.3.0';
  readonly summaryKo: string;
}

export const BLENDER_STUDIO_GLB_MANIFEST: Readonly<Record<ApparatusType, StudioApparatusGlbMeta>> =
  {
    reformer: {
      apparatus: 'reformer',
      labelKo: '아틀리에 리포머 3D 정본 (.glb)',
      url: '/models/pilates-studio/reformer-studio-rig.glb',
      fileName: 'reformer-studio-rig.glb',
      fileBytes: 2594380,
      triangles: 95328,
      vertices: 47930,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'f9147ad39287e5ca450bf7c2257754e90af85d60782cd79133939daf000871e8',
      generator: 'Blender 5.3.0',
      summaryKo:
        '화이트오크·알루미늄 C-채널 트랙 & 4슬롯 황동 기어바·스토퍼 리포머 · 라이저 풀리 더블루프 스트랩 & 고밀도 3D 코일 스프링 · 7.5등신 무봉제 통합 인체·캐스케이드 포니테일 수행자',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 2575572,
      triangles: 93996,
      vertices: 47286,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '1ef0bb4d1ee988654b44005963ae54b82cc7069528df6d0ad3c3497522e7cd3f',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스테인리스 캐노피 & 3웨이 황동 코너 캐스팅 캐딜락 · 트래피즈바·푸쉬스루바·가죽 안전스트랩·메이플 롤백바·퍼지 루프 · 7.5등신 무봉제 통합 인체·발레 그립삭스 수행자',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 2337124,
      triangles: 88884,
      vertices: 44632,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'f65e598fd5dda1c8e83d0a9e69195eac3410977ed5731c6ae4b44efddac54822',
      generator: 'Blender 5.3.0',
      summaryKo:
        '오픈 C-프레임 적층 화이트오크 운다 체어 · 황동 힌지 듀얼 스플릿 페달 & 논슬립 패드·중앙 커넥터 다월 · 후면 4단 캑터스 스프링 트리 & 무봉제 골반·어깨 조형 수행자',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 2337248,
      triangles: 89748,
      vertices: 45058,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '09f963f4407c2235f5229dfccf1e6b463fb6359790d8bcb483d84c149e3e754c',
      generator: 'Blender 5.3.0',
      summaryKo:
        '멀티슬랫 오크 래더 렁 & 하부 3단 크로스 스트레처 · 5로브 황동 스타노브 슬라이딩 레일 & 연속 파이핑 아치 볼트 · 7.5등신 무봉제 통합 인체 사이드벤드 수행자',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 2276372,
      triangles: 88648,
      vertices: 44456,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '38047149ec5a90ce01f2975620575f256750c59f5d2be38d6b4ea9528a990664',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스티치 파이핑 아틀리에 매트 · 스프링스틸 듀얼패드 매직써클 · 베벨 엔드캡 EVA 폼롤러 · 매트 세이지 미니볼 & 7.5등신 무봉제 통합 인체 헌드레드 수행자',
    },
  };

export const STUDIO_PRACTITIONER_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'practitioner',
  labelKo: '스튜디오 필라테스 수행자 3D 조형 정본 (.glb)',
  url: '/models/pilates-studio/practitioner-studio-rig.glb',
  fileName: 'practitioner-studio-rig.glb',
  fileBytes: 2229768,
  triangles: 87248,
  vertices: 43728,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: '87c9a5120ac01092f5722108bd7e85601df6abdece0c7ef6a4ee12cd31f1ba3a',
  generator: 'Blender 5.3.0',
  summaryKo:
    '7.5등신 한국 아틀리에 강사 조형 · V라인 페이셜·레이어드 커튼뱅·실크 포니테일·Y분기 무봉제 골반/다리/어깨/스쿱 크롭탑 통합 인체 · 5지 댄서 손·크리스크로스 발레 그립삭스 정본',
};

export const ALL_STUDIO_GLB_ASSETS: readonly StudioApparatusGlbMeta[] = Object.freeze([
  ...Object.values(BLENDER_STUDIO_GLB_MANIFEST),
  STUDIO_PRACTITIONER_GLB_META,
]);

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
