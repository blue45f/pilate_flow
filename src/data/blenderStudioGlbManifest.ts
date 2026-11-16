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
      fileBytes: 113424,
      triangles: 16052,
      vertices: 8160,
      drawCalls: 6,
      glbForgeScore: 95,
      sha256: 'd085bbcf272fb1ead88755fa216ce29f1bbd3c68249f329d6b2bf72b3444fa49',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '베벨 화이트오크·월넛 스플라인 · 파이핑 세이지 가죽 캐리지 · 황동 풀리·페룰 · 3D 헬리컬 4색 코일 스프링 · 조형 마네킹',
    },
    cadillac: {
      apparatus: 'cadillac',
      labelKo: '캐딜락 트래피즈 3D 정본 (.glb)',
      url: '/models/pilates-studio/cadillac-studio-rig.glb',
      fileName: 'cadillac-studio-rig.glb',
      fileBytes: 84420,
      triangles: 11744,
      vertices: 5980,
      drawCalls: 6,
      glbForgeScore: 95,
      sha256: 'd0508e0499b0e73989a9b031e3566d5c9928dbc10dfbeede6eb63ca40c732548',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '스테인리스 4포스트 캐노피 · 황동 코너 조인트 · 브레이스 푸쉬스루바 · 듀얼 스프링 롤다운바 · 퍼지 스트랩 · 조형 마네킹',
    },
    chair: {
      apparatus: 'chair',
      labelKo: '스플릿 페달 운다 체어 3D 정본 (.glb)',
      url: '/models/pilates-studio/chair-studio-rig.glb',
      fileName: 'chair-studio-rig.glb',
      fileBytes: 69168,
      triangles: 8968,
      vertices: 4562,
      drawCalls: 6,
      glbForgeScore: 95,
      sha256: '0f5b9926a2d46d0e4499483a768e00ef4f2e73227931e7274b65afc511d6beb7',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '화이트오크 사이드 패널 · 월넛 스플릿 페달 & 황동 잠금 다월 · 듀얼 헬리컬 스프링 · 높이 조절 핸들 · 조형 마네킹',
    },
    barrel: {
      apparatus: 'barrel',
      labelKo: '래더 바렐 아치 볼트 3D 정본 (.glb)',
      url: '/models/pilates-studio/barrel-studio-rig.glb',
      fileName: 'barrel-studio-rig.glb',
      fileBytes: 50932,
      triangles: 5876,
      vertices: 3058,
      drawCalls: 6,
      glbForgeScore: 95,
      sha256: '86100a67bef4c52cccbf85b31ae9b4807dd6ce837da357e830fa793a71582c95',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '실린더 아치 배럴 볼트 · 곡면 오크 치크 · 황동 스타노브 슬라이드 레일 · 5단 월넛-오크 래더 · 스완 마네킹',
    },
    mat: {
      apparatus: 'mat',
      labelKo: '아틀리에 매트 & 소도구 3D 정본 (.glb)',
      url: '/models/pilates-studio/mat-studio-rig.glb',
      fileName: 'mat-studio-rig.glb',
      fileBytes: 45536,
      triangles: 5812,
      vertices: 2974,
      drawCalls: 4,
      glbForgeScore: 95,
      sha256: 'dc023bec68fd4d2be35feef7084fd6f09720a679e7bc63c4492f5224e1511c43',
      generator: 'Blender 5.2.0 LTS + GLBForge 0.8.0 (meshopt)',
      summaryKo:
        '코르크 베이스 & 파이핑 매트 · 센터 정렬 인레이 · 황동 아일렛 · 듀얼패드 매직써클 · 폼롤러 · 미니볼 · 헌드레드 마네킹',
    },
  };

export function getStudioApparatusGlbAsset(apparatus: ApparatusType): StudioApparatusGlbMeta {
  return BLENDER_STUDIO_GLB_MANIFEST[apparatus];
}
