#!/usr/bin/env node
/**
 * Parallel 3-Track Dynamic Workflow Runner (2026-11-07)
 * Runs Track A, Track B, and Track C concurrently against a single ephemeral Vite server
 * with isolated headless Chromium instances, then shuts down all test processes cleanly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startViteTestServer } from './shared/cdp-harness.mjs';
import { runTrackA } from './track-a/run-track-a.mjs';
import { runTrackB } from './track-b/run-track-b.mjs';
import { runTrackC } from './track-c/run-track-c.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs/class-flow-audit-20261107');

async function main() {
  fs.mkdirSync(DOCS_ROOT, { recursive: true });
  const startedAt = new Date().toISOString();
  console.log(`[3-Track Audit] Starting ephemeral Vite server...`);
  const server = await startViteTestServer(PROJECT_ROOT);
  console.log(`[3-Track Audit] Vite server listening at ${server.url}. Launching Tracks A, B, C in parallel...`);

  try {
    const settled = await Promise.allSettled([
      runTrackA({ baseUrl: server.url }),
      runTrackB({ baseUrl: server.url }),
      runTrackC({ baseUrl: server.url }),
    ]);
    const rejected = settled.find((r) => r.status === 'rejected');
    if (rejected) {
      throw rejected.reason;
    }
    const [trackA, trackB, trackC] = settled.map((r) => r.value);

    const allDefects = [...trackA.defects, ...trackB.defects, ...trackC.defects];
    const totalAssertions =
      trackA.totalAssertions + trackB.totalAssertions + trackC.totalAssertions;
    const totalPassed = trackA.passedCount + trackB.passedCount + trackC.passedCount;
    const totalFailed = trackA.failedCount + trackB.failedCount + trackC.failedCount;

    const consolidated = {
      auditId: 'class-flow-audit-20261107',
      startedAt,
      completedAt: new Date().toISOString(),
      totalAssertions,
      totalPassed,
      totalFailed,
      totalReproducedDefects: allDefects.length,
      tracks: {
        trackA: {
          passedCount: trackA.passedCount,
          failedCount: trackA.failedCount,
          totalAssertions: trackA.totalAssertions,
          defectCount: trackA.defectCount,
        },
        trackB: {
          passedCount: trackB.passedCount,
          failedCount: trackB.failedCount,
          totalAssertions: trackB.totalAssertions,
          defectCount: trackB.defectCount,
        },
        trackC: {
          passedCount: trackC.passedCount,
          failedCount: trackC.failedCount,
          totalAssertions: trackC.totalAssertions,
          defectCount: trackC.defectCount,
        },
      },
      defects: allDefects,
    };

    fs.writeFileSync(
      path.join(DOCS_ROOT, 'summary.json'),
      JSON.stringify(consolidated, null, 2),
    );

    console.log(
      `[3-Track Audit] Completed! Assertions: ${totalPassed}/${totalAssertions} passed (${totalFailed} failed assertions reproducing ${allDefects.length} defects).`,
    );
  } finally {
    await server.stop();
    console.log(`[3-Track Audit] Ephemeral Vite server stopped cleanly.`);
  }
}

main().catch((err) => {
  console.error('[3-Track Audit] Fatal error:', err);
  process.exitCode = 1;
});
