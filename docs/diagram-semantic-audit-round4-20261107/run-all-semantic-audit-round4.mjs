import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  REPO_ROOT,
  AUDIT_DIR,
  runSemanticAuditAnalysis,
} from './shared/semantic-audit-analyzer.mjs';
import { runBrowserSemanticVerification } from './verify-browser-semantic-audit.mjs';

const execFileAsync = promisify(execFile);

async function main() {
  const startedAt = new Date().toISOString();

  // 1. Regenerate inventory JSON, Markdown group table, and minimal patch proposal
  execFileSync(
    process.execPath,
    [
      '--experimental-transform-types',
      path.join(AUDIT_DIR, 'generate-audit-artifacts.mjs'),
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );

  // 2. Parallel dynamic workflow: Track A (Inventory & Patch Check) + Track B (Adversarial Ownership & Truthfulness Check)
  const [trackARes, trackBRes] = await Promise.all([
    execFileAsync(
      process.execPath,
      [
        '--experimental-transform-types',
        '--test',
        path.join(AUDIT_DIR, 'track-a-inventory-audit.node-test.mjs'),
      ],
      { cwd: REPO_ROOT },
    ),
    execFileAsync(
      process.execPath,
      [
        '--experimental-transform-types',
        '--test',
        path.join(AUDIT_DIR, 'track-b-independent-verify.node-test.mjs'),
      ],
      { cwd: REPO_ROOT },
    ),
  ]);

  // 3. Real browser verification across 5 apparatus sample cards + 5 viewports (320, 390, 768, 1440, 1440@200% zoom)
  const browserSummary = await runBrowserSemanticVerification();
  const analysis = await runSemanticAuditAnalysis();

  const summary = {
    startedAt,
    completedAt: new Date().toISOString(),
    auditSummary: analysis.summary,
    trackATestPassed: !trackARes.stdout.includes('✖'),
    trackBTestPassed: !trackBRes.stdout.includes('✖'),
    browserVerification: {
      consoleErrorCount: browserSummary.consoleErrorCount,
      pageErrorCount: browserSummary.pageErrorCount,
      allViewportsZeroHorizontalOverflow:
        browserSummary.allViewportsZeroHorizontalOverflow,
      allViewportsSvgsVisible: browserSummary.allViewportsSvgsVisible,
      apparatusScreenshotsCount: browserSummary.apparatusScreenshots.length,
      viewportScreenshotsCount: browserSummary.viewportResults.length,
    },
  };

  const outPath = path.join(AUDIT_DIR, 'evidence/round4-audit-summary.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 2));

  if (
    !summary.trackATestPassed ||
    !summary.trackBTestPassed ||
    browserSummary.consoleErrorCount > 0 ||
    browserSummary.pageErrorCount > 0 ||
    !browserSummary.allViewportsZeroHorizontalOverflow ||
    !browserSummary.allViewportsSvgsVisible
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
