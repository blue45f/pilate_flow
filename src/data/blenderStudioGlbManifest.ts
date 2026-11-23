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
      fileBytes: 2425196,
      triangles: 88160,
      vertices: 44346,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '50fba2753595bdf4f92f33f9b91bcd0a4f06cfbfbab221d516d4272abb9d2941',
      generator: 'Blender 5.3.0',
      summaryKo:
        '화이트오크·알루미늄 C-채널 트랙 & 4슬롯 황동 기어바·스토퍼 리포머 · 라이저 풀리 더블루프 스트랩 & 고밀도 3D 코일 스프링 · 7.5등신 무봉제 통합 인체·캐스케이드 포니테일 수행자',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 2407732,
      triangles: 86828,
      vertices: 43702,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'e767e1749713140d3579b69c6c5d6bb78b2c2a2fdae05d6b89234a9dc8dfccf8',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스테인리스 캐노피 & 3웨이 황동 코너 캐스팅 캐딜락 · 트래피즈바·푸쉬스루바·가죽 안전스트랩·메이플 롤백바·퍼지 루프 · 7.5등신 무봉제 통합 인체·발레 그립삭스 수행자',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 2182180,
      triangles: 81716,
      vertices: 41048,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '531f30a3b3975f775732a1137fd631a13ca4e5329506c1766a5a9bede8b90407',
      generator: 'Blender 5.3.0',
      summaryKo:
        '오픈 C-프레임 적층 화이트오크 운다 체어 · 황동 힌지 듀얼 스플릿 페달 & 논슬립 패드·중앙 커넥터 다월 · 후면 4단 캑터스 스프링 트리 & 무봉제 골반·어깨 조형 수행자',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 2176352,
      triangles: 82580,
      vertices: 41474,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'bed6e757ea67def8b71ecdf7883eeb396d499c08a33f2541efadfec4ec24c772',
      generator: 'Blender 5.3.0',
      summaryKo:
        '멀티슬랫 오크 래더 렁 & 하부 3단 크로스 스트레처 · 5로브 황동 스타노브 슬라이딩 레일 & 연속 파이핑 아치 볼트 · 7.5등신 무봉제 통합 인체 사이드벤드 수행자',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 2108276,
      triangles: 81480,
      vertices: 40872,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '4547785118e83c4063184aaf9d7ef4ca8c48161b7f55a144fb0d56d0ca6dee08',
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
  fileBytes: 2063560,
  triangles: 80080,
  vertices: 40144,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: 'cf250dd5c60f2bc0f10fd875bf29e4a6b7cc9757b25907f86b80142fb1b37efd',
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
