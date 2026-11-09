export interface CanonicalProductionDeploySpec {
  id: 'firebase-hosting';
  site: 'pilates-flow-atelier';
  projectId: 'deskcloud-fleet-auth';
  productionUrl: 'https://pilates-flow-atelier.web.app';
  branch: 'main';
  configFile: 'firebase.json';
  projectConfigFile: '.firebaserc';
  outputDir: 'dist';
  deployCommand: string;
  parallelDeployCommand: string;
  immutableAssetPath: '/assets/**';
  pwaNoCachePaths: readonly ['/sw.js', '/index.html', '/site.webmanifest'];
  spaFallbackTarget: '/index.html';
}

export const CANONICAL_PRODUCTION_DEPLOY_SPEC: CanonicalProductionDeploySpec = {
  id: 'firebase-hosting',
  site: 'pilates-flow-atelier',
  projectId: 'deskcloud-fleet-auth',
  productionUrl: 'https://pilates-flow-atelier.web.app',
  branch: 'main',
  configFile: 'firebase.json',
  projectConfigFile: '.firebaserc',
  outputDir: 'dist',
  deployCommand: 'pnpm deploy',
  parallelDeployCommand: 'pnpm deploy:parallel',
  immutableAssetPath: '/assets/**',
  pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
  spaFallbackTarget: '/index.html',
};

export function verifyCanonicalProductionConfig(): {
  aligned: boolean;
  site: string;
  projectId: string;
  productionUrl: string;
  branch: string;
  consistentOutputDir: boolean;
  consistentSpaFallback: boolean;
  consistentPwaNoCache: boolean;
} {
  const spec = CANONICAL_PRODUCTION_DEPLOY_SPEC;
  const consistentOutputDir = spec.outputDir === 'dist';
  const consistentSpaFallback = spec.spaFallbackTarget === '/index.html';
  const consistentPwaNoCache =
    spec.pwaNoCachePaths.includes('/sw.js') &&
    spec.pwaNoCachePaths.includes('/index.html') &&
    spec.pwaNoCachePaths.includes('/site.webmanifest');

  return {
    aligned:
      spec.site === 'pilates-flow-atelier' &&
      spec.projectId === 'deskcloud-fleet-auth' &&
      spec.branch === 'main' &&
      consistentOutputDir &&
      consistentSpaFallback &&
      consistentPwaNoCache,
    site: spec.site,
    projectId: spec.projectId,
    productionUrl: spec.productionUrl,
    branch: spec.branch,
    consistentOutputDir,
    consistentSpaFallback,
    consistentPwaNoCache,
  };
}
