export interface CanonicalProductionDeploySpec {
  id: 'firebase-hosting';
  site: 'pilates-flow-atelier';
  projectId: 'deskcloud-fleet-auth';
  productionUrl: 'https://pilates-flow-atelier.web.app';
  branch: 'main';
  configFile: 'firebase.json';
  projectConfigFile: '.firebaserc';
  outputDir: 'dist';
  verifyAllCommand: string;
  buildCommand: string;
  deployCommand: string;
  checkCommand: string;
  verifyLiveCommand: string;
  rollbackCommand: string;
  firebaseToolsVersion: string;
  immutableAssetPath: '/assets/**';
  pwaNoCachePaths: readonly ['/sw.js', '/index.html', '/site.webmanifest'];
  atelierV2AssetPaths: readonly [
    '/images/atelier-v2/reformer-studio-3d.png',
    '/images/atelier-v2/cadillac-studio-3d.png',
    '/images/atelier-v2/chair-studio-3d.png',
    '/images/atelier-v2/barrel-studio-3d.png',
  ];
  spaFallbackTarget: '/index.html';
}

export interface FirebaseHeaderItem {
  key?: string;
  value?: string;
}

export interface FirebaseHeaderRule {
  source?: string;
  headers?: FirebaseHeaderItem[];
}

export interface FirebaseRewriteRule {
  source?: string;
  destination?: string;
}

export interface FirebaseJsonInput {
  hosting?: {
    site?: string;
    public?: string;
    rewrites?: FirebaseRewriteRule[];
    headers?: FirebaseHeaderRule[];
  };
}

export interface FirebasercInput {
  projects?: {
    default?: string;
  };
}

export interface ProductionConfigValidationInput {
  firebaseJson?: FirebaseJsonInput;
  firebaserc?: FirebasercInput;
  branch?: string;
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
  verifyAllCommand: 'pnpm verify:all',
  buildCommand: 'pnpm build',
  deployCommand: 'pnpm deploy',
  checkCommand: 'pnpm deploy:check',
  verifyLiveCommand: 'pnpm deploy:verify',
  rollbackCommand: 'pnpm deploy:rollback',
  firebaseToolsVersion: '13.29.1',
  immutableAssetPath: '/assets/**',
  pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
  atelierV2AssetPaths: [
    '/images/atelier-v2/reformer-studio-3d.png',
    '/images/atelier-v2/cadillac-studio-3d.png',
    '/images/atelier-v2/chair-studio-3d.png',
    '/images/atelier-v2/barrel-studio-3d.png',
  ],
  spaFallbackTarget: '/index.html',
};

function hasHeaderContaining(
  rules: FirebaseHeaderRule[],
  source: string,
  headerKey: string,
  expectedSubstring: string,
): boolean {
  return rules.some(
    (rule) =>
      rule.source === source &&
      Array.isArray(rule.headers) &&
      rule.headers.some(
        (h) =>
          h.key?.toLowerCase() === headerKey.toLowerCase() &&
          typeof h.value === 'string' &&
          h.value.includes(expectedSubstring),
      ),
  );
}

export function verifyCanonicalProductionConfig(input?: ProductionConfigValidationInput): {
  aligned: boolean;
  site: string;
  projectId: string;
  productionUrl: string;
  branch: string;
  consistentOutputDir: boolean;
  consistentSpaFallback: boolean;
  consistentImmutableAssets: boolean;
  consistentPwaNoCache: boolean;
} {
  const spec = CANONICAL_PRODUCTION_DEPLOY_SPEC;
  const hosting = input?.firebaseJson?.hosting;
  const projects = input?.firebaserc?.projects;

  const site = hosting ? (hosting.site ?? '') : spec.site;
  const projectId = projects ? (projects.default ?? '') : spec.projectId;
  const branch = input?.branch ?? spec.branch;
  const outputDir = hosting ? (hosting.public ?? '') : spec.outputDir;

  const consistentOutputDir = outputDir === spec.outputDir;

  const consistentSpaFallback = hosting
    ? Boolean(
        Array.isArray(hosting.rewrites) &&
          hosting.rewrites.some(
            (r) => r.source === '**' && r.destination === spec.spaFallbackTarget,
          ),
      )
    : spec.spaFallbackTarget === '/index.html';

  const headerRules = hosting?.headers ?? [];
  const consistentImmutableAssets = hosting
    ? hasHeaderContaining(headerRules, spec.immutableAssetPath, 'Cache-Control', 'immutable')
    : true;

  const consistentPwaNoCache = hosting
    ? spec.pwaNoCachePaths.every(
        (noCachePath) =>
          hasHeaderContaining(headerRules, noCachePath, 'Cache-Control', 'no-cache') &&
          hasHeaderContaining(headerRules, noCachePath, 'Cache-Control', 'must-revalidate'),
      )
    : spec.pwaNoCachePaths.length === 3;

  return {
    aligned:
      site === spec.site &&
      projectId === spec.projectId &&
      branch === spec.branch &&
      consistentOutputDir &&
      consistentSpaFallback &&
      consistentImmutableAssets &&
      consistentPwaNoCache,
    site,
    projectId,
    productionUrl: spec.productionUrl,
    branch,
    consistentOutputDir,
    consistentSpaFallback,
    consistentImmutableAssets,
    consistentPwaNoCache,
  };
}
