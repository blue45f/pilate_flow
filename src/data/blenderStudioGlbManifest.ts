import type { ApparatusType } from '../types/pilates';

export interface StudioApparatusGlbMeta {
  readonly apparatus: ApparatusType;
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
      fileBytes: 152000,
      triangles: 19040,
      vertices: 9702,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '830894106c531ec169bdf70bd0bc61a1ce4c217a57164828d5cc16a4d9585fb6',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '베벨 화이트오크·월넛 스플라인 · 파이핑 세이지 가죽 캐리지 · 황동 풀리·페룰 · 3D 헬리컬 코일 스프링 · Catmull-Clark 조형 마네킹',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 116112,
      triangles: 14344,
      vertices: 7337,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'a8714cef606f9aa646f6f05bc50f9ae8e48919cba2d59a939b6a03189ad77910',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '스테인리스 4포스트 캐노피 · 황동 코너 조인트 · 브레이스 푸쉬스루바 · 듀얼 스프링 롤다운바 · 퍼지 스트랩 · Catmull-Clark 조형 마네킹',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 80708,
      triangles: 9580,
      vertices: 4894,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'e1ae10c20534015176a46124b2de3f6784ae4626698e8072136f3f433b112588',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '화이트오크 사이드 패널 · 월넛 스플릿 페달 & 황동 잠금 노브 · 듀얼 헬리컬 스프링 · 높이 조절 핸들 · Catmull-Clark 조형 마네킹',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 62968,
      triangles: 7172,
      vertices: 3674,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: '9cb216200c9ed6dba641302ef866f13fe53b7ed759e2234c93e592ec2d2d14ef',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '실린더 아치 배럴 볼트 · 곡면 오크 치크 · 황동 슬라이드 노브 · 5단 월넛-오크 래더 · Catmull-Clark 스완 마네킹',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 56116,
      triangles: 6268,
      vertices: 3212,
      drawCalls: 2,
      glbForgeScore: 100,
      mobileHeroScore: 100,
      arkitCompatible: true,
      sha256: 'a58d9289d784bfd9d476cdf3bb3f80e63937d0336f8984a561ad664d097facc6',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '코르크 베이스 & 파이핑 매트 · 센터 정렬 인레이 · 황동 아일렛 · 듀얼패드 매직써클 · 폼롤러 · 미니볼 · Catmull-Clark 헌드레드 마네킹',
    },
  };

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
