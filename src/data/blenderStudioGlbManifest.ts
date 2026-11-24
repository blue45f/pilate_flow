import type { ApparatusType } from '../types/pilates';

export interface StudioApparatusGlbMeta {
  readonly apparatus: ApparatusType | 'practitioner' | 'skinned-instructor';
  readonly labelKo: string;
  readonly url: string;
  readonly fileName: string;
  readonly fileBytes: number;
  readonly triangles: number;
  readonly vertices: number;
  readonly drawCalls: number;
  readonly boneCount?: number;
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
      fileBytes: 2649096,
      triangles: 97296,
      vertices: 48914,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '46702ac03bd34fa36c047b68491b6d5a727248642d0aceaba2deb3a3339a0d83',
      generator: 'Blender 5.3.0',
      summaryKo:
        '화이트오크·알루미늄 C-채널 트랙 & 4슬롯 황동 기어바·스토퍼 리포머 · 라이저 풀리 더블루프 스트랩 & 고밀도 3D 코일 스프링 · 7.5등신 고밀도 무봉제 통합 인체·BVH 밀착 스트랩·캐스케이드 포니테일 수행자',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 2630100,
      triangles: 95964,
      vertices: 48270,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'ae2035d57dadb54d8dbf823f9d90960e036b7c52741527d1815d7b442e8aab0b',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스테인리스 캐노피 & 3웨이 황동 코너 캐스팅 캐딜락 · 트래피즈바·푸쉬스루바·가죽 안전스트랩·메이플 롤백바·퍼지 루프 · 7.5등신 고밀도 무봉제 통합 인체·발레 그립삭스 수행자',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 2392672,
      triangles: 90852,
      vertices: 45616,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'd191fea53793def2dd85ddc2283dd604e6e22622f3ebfb5bb0ce5dd3b9851d21',
      generator: 'Blender 5.3.0',
      summaryKo:
        '오픈 C-프레임 적층 화이트오크 운다 체어 · 황동 힌지 듀얼 스플릿 페달 & 논슬립 패드·중앙 커넥터 다월 · 후면 4단 캑터스 스프링 트리 & 고밀도 무봉제 골반·어깨 조형 수행자',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 2378304,
      triangles: 91716,
      vertices: 46042,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '19cefd05f9a17941da91793e34aa2f3b4085cf33cfda7c7565d3b71c535d5dea',
      generator: 'Blender 5.3.0',
      summaryKo:
        '멀티슬랫 오크 래더 렁 & 하부 3단 크로스 스트레처 · 5로브 황동 스타노브 슬라이딩 레일 & 연속 파이핑 아치 볼트 · 7.5등신 고밀도 무봉제 통합 인체 사이드벤드 수행자',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 2327604,
      triangles: 90616,
      vertices: 45440,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'f3040832447846fb8fbb6869bd66c5418a7d9f288a7a4f433d409928c925ef8f',
      generator: 'Blender 5.3.0',
      summaryKo:
        '스티치 파이핑 아틀리에 매트 · 스프링스틸 듀얼패드 매직써클 · 베벨 엔드캡 EVA 폼롤러 · 매트 세이지 미니볼 & 7.5등신 고밀도 무봉제 통합 인체 헌드레드 수행자',
    },
  };

export const STUDIO_PRACTITIONER_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'practitioner',
  labelKo: '스튜디오 필라테스 수행자 3D 조형 정본 (.glb)',
  url: '/models/pilates-studio/practitioner-studio-rig.glb',
  fileName: 'practitioner-studio-rig.glb',
  fileBytes: 2287304,
  triangles: 89216,
  vertices: 44712,
  drawCalls: 2,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: '59de85f665c86fa2e442ee0442234c209b012ae66d46d922495bdead7762ac76',
  generator: 'Blender 5.3.0',
  summaryKo:
    '7.5등신 고밀도 한국 아틀리에 강사 조형 · 황금비 V라인 페이셜·표면 밀착 커튼뱅·7겹 실크 포니테일·Y분기 무봉제 골반/다리/어깨/BVH 밀착 스트랩 크롭탑 통합 인체 · 5지 댄서 손·크리스크로스 발레 그립삭스 정본',
};

export const STUDIO_SKINNED_INSTRUCTOR_GLB_META: StudioApparatusGlbMeta = {
  apparatus: 'skinned-instructor',
  labelKo: '21본 고밀도 단일 스킨드 휴머노이드 강사 정본 (.glb)',
  url: '/models/pilates-studio/instructor-skinned-v5.glb',
  fileName: 'instructor-skinned-v5.glb',
  fileBytes: 1089728,
  triangles: 27520,
  vertices: 14189,
  drawCalls: 1,
  boneCount: 21,
  glbForgeScore: 100,
  mobileHeroScore: 100,
  arkitCompatible: true,
  sha256: 'da420fb5ac0025c3f6d942e9a54dc391e5e29f23c405d8ecab6dee344227f1a7',
  generator: 'Blender 5.3.0',
  summaryKo:
    '21본 아머처(IBM 포함) · 27,520삼각형 고밀도 단일 무봉제 수밀 휴머노이드 메시 · BVH 밀착 크롭탑 스트랩·실크 포니테일 · 실시간 WebGPU 1,752동작 본 리타게팅 정본',
};

export const ALL_STUDIO_GLB_ASSETS: readonly StudioApparatusGlbMeta[] = Object.freeze([
  ...Object.values(BLENDER_STUDIO_GLB_MANIFEST),
  STUDIO_PRACTITIONER_GLB_META,
]);

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
