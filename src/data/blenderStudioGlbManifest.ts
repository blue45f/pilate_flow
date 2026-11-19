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
      fileBytes: 2535100,
      triangles: 94656,
      vertices: 59161,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'bd815152b1e68982f36b4bc5308273f5d48ae78530a780e0dfe4973549bb12e4',
      generator: 'Blender 5.3.0',
      summaryKo:
        '화이트오크·알루미늄 C-채널 트랙 & 4슬롯 황동 기어바·스토퍼 리포머 · 라이저 풀리 더블루프 스트랩 & 컬러 헬리컬 스프링 · 고밀도 SubD-2 한국형 웹툰 안면·밀착 커튼뱅·장궁 5지 조형 수행자',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 2571132,
      triangles: 94612,
      vertices: 60295,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'e466ea55b31636b559cb8d2046a0402d5cbb36b20c5ac55ec5d944d76787e399',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스테인리스 캐노피 & 3웨이 황동 코너 캐스팅 캐딜락 · 트래피즈바·푸쉬스루바·가죽 안전스트랩·메이플 롤백바·퍼지 루프 · 고밀도 SubD-2 한국형 웹툰 안면·밀착 커튼뱅·장궁 5지 조형 수행자',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 2337816,
      triangles: 89556,
      vertices: 53952,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '86411f3b1714c51580c2b5f7c15a8e8e25c8c511869c0522d9e1c735a04e5fa2',
      generator: 'Blender 5.3.0',
      summaryKo:
        '오픈 C-프레임 적층 화이트오크 운다 체어 · 황동 힌지 듀얼 스플릿 페달 & 중앙 커넥터 다월 · 후면 4단 캑터스 스프링 트리 & 고밀도 SubD-2 한국형 웹툰 조형 수행자',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 2339624,
      triangles: 90652,
      vertices: 53803,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '05793c134fb067384efd7034e726d1e68b22bda94da3490eecd566431cb2b587',
      generator: 'Blender 5.3.0',
      summaryKo:
        '멀티슬랫 오크 래더 렁 & 하부 3단 크로스 스트레처 · 5로브 황동 스타노브 슬라이딩 레일 & 연속 파이핑 아치 볼트 · 고밀도 SubD-2 한국형 웹툰 조형 사이드벤드 수행자',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 2282716,
      triangles: 89552,
      vertices: 52231,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '848aefde7d19bc9732d49ff7f6a30291f08d00229bae4bfce883caf821d47cfb',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스티치 파이핑 아틀리에 매트 · 스프링스틸 듀얼패드 매직써클 · 베벨 엔드캡 EVA 폼롤러 · 매트 세이지 미니볼 & 고밀도 SubD-2 한국형 웹툰 조형 헌드레드 수행자',
    },
  };

export const STUDIO_PRACTITIONER_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'practitioner',
  labelKo: '스튜디오 필라테스 수행자 3D 조형 정본 (.glb)',
  url: '/models/pilates-studio/practitioner-studio-rig.glb',
  fileName: 'practitioner-studio-rig.glb',
  fileBytes: 2237360,
  triangles: 88152,
  vertices: 51076,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: 'b6185846bc1a657d0feeeb119e8a5bbd4d0d20f0a2ef2c6a91f85506e7f5e135',
  generator: 'Blender 5.3.0',
  summaryKo:
    '고밀도 SubD-2 한국형 웹툰·아틀리에 V라인 안면·속눈썹·밀착 커튼뱅·브레이드 시뇽 조형 · 쇄골·슬개골·복사뼈 무봉제 연속 인체 · 대립 엄지·장궁 5지 손 · 월넛·황동 인레이 페데스탈 아라베스크 정본',
};

export const ALL_STUDIO_GLB_ASSETS: readonly StudioApparatusGlbMeta[] = Object.freeze([
  ...Object.values(BLENDER_STUDIO_GLB_MANIFEST),
  STUDIO_PRACTITIONER_GLB_META,
]);

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
