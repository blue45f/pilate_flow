export type CloudDeployTargetId =
  | 'firebase-hosting'
  | 'github-pages'
  | 'vercel'
  | 'netlify'
  | 'cloudflare-pages'
  | 'docker-nginx'
  | 'local-preview';

export interface CloudDeployTargetSpec {
  id: CloudDeployTargetId;
  labelKo: string;
  configFile: string;
  outputDir: string;
  cliCommand: string;
  githubWorkflowJob: string;
  requiredCiSecrets: readonly string[];
  pwaNoCachePaths: readonly string[];
  spaFallbackTarget: string;
}

export const MULTI_CLOUD_DEPLOY_MATRIX: readonly CloudDeployTargetSpec[] = [
  {
    id: 'firebase-hosting',
    labelKo: 'Firebase Hosting (기본 운영)',
    configFile: 'firebase.json',
    outputDir: 'dist',
    cliCommand: 'firebase deploy --only hosting:pilates-flow-atelier --project deskcloud-fleet-auth',
    githubWorkflowJob: 'deploy-firebase-hosting',
    requiredCiSecrets: ['FIREBASE_SERVICE_ACCOUNT'],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'github-pages',
    labelKo: 'GitHub Pages (Actions 아티팩트)',
    configFile: '.github/workflows/deploy-production.yml',
    outputDir: 'dist',
    cliCommand: 'git push origin main',
    githubWorkflowJob: 'deploy-github-pages',
    requiredCiSecrets: ['GITHUB_TOKEN'],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'vercel',
    labelKo: 'Vercel Edge Network',
    configFile: 'vercel.json',
    outputDir: 'dist',
    cliCommand: 'npx vercel deploy --prod --yes',
    githubWorkflowJob: 'deploy-vercel',
    requiredCiSecrets: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'netlify',
    labelKo: 'Netlify CDN',
    configFile: 'netlify.toml',
    outputDir: 'dist',
    cliCommand: 'npx netlify-cli deploy --prod --dir=dist',
    githubWorkflowJob: 'deploy-netlify',
    requiredCiSecrets: ['NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID'],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'cloudflare-pages',
    labelKo: 'Cloudflare Pages',
    configFile: 'wrangler.toml',
    outputDir: 'dist',
    cliCommand: 'npx wrangler pages deploy dist --project-name=pilates-flow-atelier',
    githubWorkflowJob: 'deploy-cloudflare-pages',
    requiredCiSecrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'docker-nginx',
    labelKo: 'Docker · Cloud Run · 자체 서버 (Nginx)',
    configFile: 'nginx/default.conf',
    outputDir: 'dist',
    cliCommand: 'docker compose up -d --build',
    githubWorkflowJob: 'verify-and-build',
    requiredCiSecrets: [],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
  {
    id: 'local-preview',
    labelKo: '로컬 프로덕션 프리뷰 서버',
    configFile: 'vite.config.ts',
    outputDir: 'dist',
    cliCommand: 'pnpm preview --host 0.0.0.0 --port 4173',
    githubWorkflowJob: 'verify-and-build',
    requiredCiSecrets: [],
    pwaNoCachePaths: ['/sw.js', '/index.html', '/site.webmanifest'],
    spaFallbackTarget: '/index.html',
  },
] as const;

export function verifyMultiCloudConfigAlignment(): {
  aligned: boolean;
  targetCount: number;
  consistentOutputDir: boolean;
  consistentSpaFallback: boolean;
  consistentPwaNoCache: boolean;
} {
  const consistentOutputDir = MULTI_CLOUD_DEPLOY_MATRIX.every((t) => t.outputDir === 'dist');
  const consistentSpaFallback = MULTI_CLOUD_DEPLOY_MATRIX.every(
    (t) => t.spaFallbackTarget === '/index.html',
  );
  const consistentPwaNoCache = MULTI_CLOUD_DEPLOY_MATRIX.every(
    (t) =>
      t.pwaNoCachePaths.includes('/sw.js') &&
      t.pwaNoCachePaths.includes('/index.html') &&
      t.pwaNoCachePaths.includes('/site.webmanifest'),
  );
  return {
    aligned: consistentOutputDir && consistentSpaFallback && consistentPwaNoCache,
    targetCount: MULTI_CLOUD_DEPLOY_MATRIX.length,
    consistentOutputDir,
    consistentSpaFallback,
    consistentPwaNoCache,
  };
}

export function resolveDynamicDeployTargets(
  requestedInput: string,
  availableTargets: readonly CloudDeployTargetId[],
): CloudDeployTargetSpec[] {
  const normalized = (requestedInput || 'auto').trim().toLowerCase();
  if (normalized === 'all') {
    return [...MULTI_CLOUD_DEPLOY_MATRIX];
  }
  if (normalized === 'auto') {
    const availSet = new Set(availableTargets);
    return MULTI_CLOUD_DEPLOY_MATRIX.filter((spec) => availSet.has(spec.id));
  }
  const tokens = new Set(
    normalized
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return MULTI_CLOUD_DEPLOY_MATRIX.filter(
    (spec) => tokens.has(spec.id) || tokens.has(spec.id.split('-')[0] ?? ''),
  );
}
