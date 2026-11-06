#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const fixtureHtmlPath = path.join(__dirname, 'browserFixture.html');

function parseArgs(argv) {
  let jsonOut = null;
  let failureDir = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json-out' && argv[i + 1]) {
      jsonOut = path.resolve(argv[++i]);
    } else if (argv[i] === '--failure-dir' && argv[i + 1]) {
      failureDir = path.resolve(argv[++i]);
    }
  }
  return { jsonOut, failureDir };
}

async function loadPuppeteer() {
  const candidates = [
    '/usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js',
    'puppeteer',
    'puppeteer-core',
  ];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      if (mod.puppeteer) return mod.puppeteer;
      if (mod.default?.launch) return mod.default;
      if (mod.launch) return mod;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    'Unable to load puppeteer/puppeteer-core for headless Chromium verification.',
  );
}

async function resolveChromiumBinary() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const bin of candidates) {
    try {
      await fs.access(bin);
      return bin;
    } catch {
      // continue
    }
  }
  throw new Error('No local Chromium binary found at /usr/bin/chromium.');
}

async function main() {
  const { jsonOut, failureDir } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const tempProfileDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'pf-motion-coverage-chromium-'),
  );

  let viteServer = null;
  let browser = null;
  let page = null;

  const directApiChecks = [];
  const realDomAndKeyboardChecks = [];
  const failureCaptures = [];

  const recordCheck = (bucket, name, fn) =>
    (async () => {
      const t0 = Date.now();
      try {
        const detail = await fn();
        bucket.push({
          name,
          status: 'pass',
          durationMs: Date.now() - t0,
          detail,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        bucket.push({
          name,
          status: 'fail',
          durationMs: Date.now() - t0,
          error: message,
        });
        if (page) {
          try {
            const captureDir =
              failureDir ??
              path.join(os.tmpdir(), `pf-mc-failure-${Date.now()}`);
            await fs.mkdir(captureDir, { recursive: true });
            const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const screenshotPath = path.join(captureDir, `${safeName}.png`);
            const htmlPath = path.join(captureDir, `${safeName}.html`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            const htmlContent = await page.content();
            await fs.writeFile(htmlPath, htmlContent, 'utf8');
            failureCaptures.push({ name, screenshotPath, htmlPath });
          } catch {
            // ignore capture error
          }
        }
      }
    })();

  try {
    const rawFixtureHtml = await fs.readFile(fixtureHtmlPath, 'utf8');
    viteServer = await createServer({
      root: projectRoot,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
      },
      plugins: [
        {
          name: 'motion-coverage-local-browser-fixture',
          configureServer(srv) {
            srv.middlewares.use(
              '/__motion_coverage_fixture__',
              async (req, res, next) => {
                try {
                  const transformed = await srv.transformIndexHtml(
                    req.url || '/__motion_coverage_fixture__',
                    rawFixtureHtml,
                  );
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                  res.end(transformed);
                } catch (err) {
                  next(err);
                }
              },
            );
          },
        },
      ],
    });

    await viteServer.listen();
    const addr = viteServer.httpServer?.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const fixtureUrl = `http://127.0.0.1:${port}/__motion_coverage_fixture__`;

    const puppeteer = await loadPuppeteer();
    const executablePath = await resolveChromiumBinary();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      userDataDir: tempProfileDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 320, height: 800 });
    await page.goto(fixtureUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="motion-coverage-preview-harness"]');

    const browserUserAgent = await page.evaluate(() => navigator.userAgent);

    // =========================================================================
    // 1. DIRECT API INVOCATION CHECKS (Separated from Real DOM/Keyboard Checks)
    // =========================================================================
    await recordCheck(
      directApiChecks,
      'direct_api_98_catalog_sweep',
      async () => {
        const sweep = await page.evaluate(() =>
          window.__motionCoverageFixture__.runMotionCoverageCatalogSweep(),
        );
        if (sweep.totalCatalogCount !== 98) {
          throw new Error(`Expected 98 catalog items, got ${sweep.totalCatalogCount}`);
        }
        if (
          sweep.countsByMode['three-phase-2d'] !== 77 ||
          sweep.countsByMode['continuous-2d'] !== 1 ||
          sweep.countsByMode['projected-3d'] !== 20 ||
          sweep.countsByMode.missing !== 0
        ) {
          throw new Error(
            `Unexpected mode distribution: ${JSON.stringify(sweep.countsByMode)}`,
          );
        }
        if (
          sweep.reused2dPoseAssetCount !== 98 ||
          sweep.newlyCreatedAssetCount !== 0 ||
          sweep.discreteExercisesNeverPlayedCount !== 77 ||
          sweep.continuousExercisesVerifiedCount !== 21 ||
          !sweep.controllerDestroyedCleanly
        ) {
          throw new Error(`Sweep invariant failed: ${JSON.stringify(sweep)}`);
        }
        return sweep;
      },
    );

    await recordCheck(
      directApiChecks,
      'direct_api_speed_and_repeat_allowed_vs_rejected',
      async () => {
        const apiResult = await page.evaluate(() => {
          const {
            DRAFT_SPEEDS,
            DRAFT_REPEAT_COUNTS,
            MotionCoveragePlaybackController,
          } = window.__motionCoverageFixture__;
          const ctrl = new MotionCoveragePlaybackController({
            exerciseOrId: 'original-mat-quadruped-reach',
          });
          const acceptedSpeeds = [];
          for (const spd of [0.5, 0.75, 1]) {
            ctrl.setSpeed(spd);
            acceptedSpeeds.push(ctrl.getSnapshot().speed);
          }
          const rejectedSpeeds = [];
          for (const badSpd of [0, -1, 0.25, 1.25, 2, NaN, Infinity, -Infinity]) {
            try {
              ctrl.setSpeed(badSpd);
            } catch (e) {
              if (e instanceof RangeError) rejectedSpeeds.push(String(badSpd));
            }
          }

          const acceptedRepeats = [];
          for (const rep of [1, 2, 3]) {
            ctrl.setRepeatCount(rep);
            acceptedRepeats.push(ctrl.getSnapshot().repeatCount);
          }
          const rejectedRepeats = [];
          for (const badRep of [0, -2, 1.5, 4, NaN, Infinity, -Infinity]) {
            try {
              ctrl.setRepeatCount(badRep);
            } catch (e) {
              if (e instanceof RangeError) rejectedRepeats.push(String(badRep));
            }
          }
          ctrl.destroy();
          return {
            DRAFT_SPEEDS,
            DRAFT_REPEAT_COUNTS,
            acceptedSpeeds,
            rejectedSpeeds,
            acceptedRepeats,
            rejectedRepeats,
          };
        });

        if (
          JSON.stringify(apiResult.acceptedSpeeds) !== '[0.5,0.75,1]' ||
          JSON.stringify(apiResult.acceptedRepeats) !== '[1,2,3]' ||
          apiResult.rejectedSpeeds.length !== 8 ||
          apiResult.rejectedRepeats.length !== 7
        ) {
          throw new Error(
            `Speed/repeat contract mismatch: ${JSON.stringify(apiResult)}`,
          );
        }
        return apiResult;
      },
    );

    // =========================================================================
    // 2. REAL BROWSER DOM / KEYBOARD / BUTTON PATH CHECKS
    // =========================================================================
    const measureViewportAndTouchTargets = async (viewportWidth) => {
      await page.setViewport({ width: viewportWidth, height: 844 });
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      return page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const harness = document.querySelector(
          '[data-testid="motion-coverage-preview-harness"]',
        );
        const harnessRect = harness.getBoundingClientRect();
        const harnessOverflow = harness.scrollWidth > harness.clientWidth;
        const controls = Array.from(
          harness.querySelectorAll('button, select, input[type="range"]'),
        );
        const touchResults = controls.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            testId:
              el.getAttribute('data-testid') ||
              el.textContent?.trim().slice(0, 24),
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            meets44px: rect.width >= 44 && rect.height >= 44,
          };
        });
        return {
          viewportWidth: innerWidth,
          docScrollWidth,
          zeroDocHorizontalOverflow: docScrollWidth <= innerWidth,
          harnessClientWidth: harness.clientWidth,
          harnessScrollWidth: harness.scrollWidth,
          zeroHarnessHorizontalOverflow:
            !harnessOverflow && harnessRect.width <= innerWidth,
          controlCount: touchResults.length,
          allControlsMeet44px: touchResults.every((c) => c.meets44px),
          failedControls: touchResults.filter((c) => !c.meets44px),
        };
      });
    };

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_dom_viewport_320_and_390_discrete_mode',
      async () => {
        await page.click('[data-testid="harness-rep-three-phase-2d"]');
        const v320 = await measureViewportAndTouchTargets(320);
        const v390 = await measureViewportAndTouchTargets(390);
        if (
          !v320.zeroDocHorizontalOverflow ||
          !v320.zeroHarnessHorizontalOverflow ||
          !v320.allControlsMeet44px ||
          !v390.zeroDocHorizontalOverflow ||
          !v390.zeroHarnessHorizontalOverflow ||
          !v390.allControlsMeet44px
        ) {
          throw new Error(
            `Discrete layout/44px check failed: ${JSON.stringify({ v320, v390 })}`,
          );
        }
        return { v320, v390 };
      },
    );

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_dom_viewport_320_and_390_continuous_mode',
      async () => {
        await page.click('[data-testid="harness-rep-projected-3d"]');
        const v320 = await measureViewportAndTouchTargets(320);
        const v390 = await measureViewportAndTouchTargets(390);
        if (
          !v320.zeroDocHorizontalOverflow ||
          !v320.zeroHarnessHorizontalOverflow ||
          !v320.allControlsMeet44px ||
          !v390.zeroDocHorizontalOverflow ||
          !v390.zeroHarnessHorizontalOverflow ||
          !v390.allControlsMeet44px
        ) {
          throw new Error(
            `Continuous layout/44px check failed: ${JSON.stringify({ v320, v390 })}`,
          );
        }
        return { v320, v390 };
      },
    );

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_dom_representative_4_modes_button_and_seek_paths',
      async () => {
        // 1. three-phase-2d button path
        await page.click('[data-testid="harness-rep-three-phase-2d"]');
        await page.click('[data-testid="harness-phase-middle"]');
        const discretePhase = await page.$eval(
          '[data-testid="harness-reused-2d-surface"]',
          (el) => el.getAttribute('data-selected-phase'),
        );

        // 2. continuous-2d button play, pause, speed, repeat
        await page.click('[data-testid="harness-rep-continuous-2d"]');
        await page.click('[data-testid="harness-speed-0.75"]');
        await page.click('[data-testid="harness-repeat-2"]');
        await page.click('[data-testid="harness-play-pause-btn"]');
        await new Promise((r) => setTimeout(r, 90));
        const cont2dState = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          const fig = document.querySelector(
            '[data-testid="harness-continuous-figure-surface"]',
          );
          return {
            mode: h.getAttribute('data-motion-mode'),
            playing: h.getAttribute('data-playing') === 'true',
            progress: Number(fig.getAttribute('data-progress')),
          };
        });
        await page.click('[data-testid="harness-play-pause-btn"]');

        // 3. projected-3d variant switch & play
        await page.click('[data-testid="harness-rep-projected-3d"]');
        await page.click('[data-testid="harness-variant-quadruped-leg-slide"]');
        await page.click('[data-testid="harness-play-pause-btn"]');
        await new Promise((r) => setTimeout(r, 90));
        const proj3dState = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          const fig = document.querySelector(
            '[data-testid="harness-continuous-figure-surface"]',
          );
          return {
            mode: h.getAttribute('data-motion-mode'),
            true3d: h.getAttribute('data-true-3d'),
            variantId: fig.getAttribute('data-variant-id'),
            playing: h.getAttribute('data-playing') === 'true',
            progress: Number(fig.getAttribute('data-progress')),
          };
        });

        // 4. Switch to missing while playing -> must immediately stop playback
        await page.click('[data-testid="harness-rep-missing"]');
        const missingState = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          return {
            mode: h.getAttribute('data-motion-mode'),
            playing: h.getAttribute('data-playing') === 'true',
            missingSurface: Boolean(
              document.querySelector('[data-testid="harness-missing-surface"]'),
            ),
          };
        });

        if (
          discretePhase !== 'middle' ||
          cont2dState.mode !== 'continuous-2d' ||
          !cont2dState.playing ||
          !(cont2dState.progress > 0) ||
          proj3dState.mode !== 'projected-3d' ||
          proj3dState.true3d !== 'false' ||
          proj3dState.variantId !== 'quadruped-leg-slide' ||
          !proj3dState.playing ||
          !(proj3dState.progress > 0) ||
          missingState.mode !== 'missing' ||
          missingState.playing ||
          !missingState.missingSurface
        ) {
          throw new Error(
            `Representative 4-mode DOM check failed: ${JSON.stringify({
              discretePhase,
              cont2dState,
              proj3dState,
              missingState,
            })}`,
          );
        }
        return { discretePhase, cont2dState, proj3dState, missingState };
      },
    );

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_keyboard_native_controls_vs_stage_shortcuts',
      async () => {
        await page.click('[data-testid="harness-rep-projected-3d"]');
        await page.click('[data-testid="harness-restart-btn"]');

        // Focus native range slider and press ArrowRight twice via real Chromium keyboard
        await page.focus('[data-testid="harness-seek-slider"]');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        const sliderProgressAfterArrows = await page.$eval(
          '[data-testid="harness-continuous-figure-surface"]',
          (el) => Number(el.getAttribute('data-progress')),
        );
        // Native range step="1" on 0..100 moves to 0.02 (NOT 0.5 or 1 from stage phase jump!)
        if (
          Math.abs(sliderProgressAfterArrows - 0.02) > 0.005
        ) {
          throw new Error(
            `Range slider ArrowRight was hijacked by stage shortcut: progress=${sliderProgressAfterArrows}`,
          );
        }

        // Focus speed-0.5 button and press Space via real Chromium keyboard -> must activate speed-0.5 and NOT start playback
        await page.focus('[data-testid="harness-speed-0.5"]');
        await page.keyboard.press('Space');
        const afterSpeedSpace = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          const btn = document.querySelector('[data-testid="harness-speed-0.5"]');
          return {
            speedPressed: btn.getAttribute('aria-pressed') === 'true',
            playing: h.getAttribute('data-playing') === 'true',
          };
        });
        if (!afterSpeedSpace.speedPressed || afterSpeedSpace.playing) {
          throw new Error(
            `Button Space key was hijacked by stage shortcut: ${JSON.stringify(afterSpeedSpace)}`,
          );
        }

        // Focus play-pause button and press Space -> must start playback ONCE (not double-toggle back to false)
        await page.focus('[data-testid="harness-play-pause-btn"]');
        await page.keyboard.press('Space');
        const playingAfterBtnSpace = await page.$eval(
          '[data-testid="motion-coverage-preview-harness"]',
          (el) => el.getAttribute('data-playing') === 'true',
        );
        if (!playingAfterBtnSpace) {
          throw new Error(
            'Play button Space failed to start playback (double-toggled or blocked).',
          );
        }
        await page.keyboard.press('Space'); // pause again

        // Focus stage container directly and press ArrowRight, Home, Space
        await page.focus('[data-testid="harness-interactive-stage"]');
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowRight');
        const stageProgressAfterRight = await page.$eval(
          '[data-testid="harness-continuous-figure-surface"]',
          (el) => Number(el.getAttribute('data-progress')),
        );
        await page.keyboard.press('Space');
        const stagePlayingAfterSpace = await page.$eval(
          '[data-testid="motion-coverage-preview-harness"]',
          (el) => el.getAttribute('data-playing') === 'true',
        );
        await page.keyboard.press('Space');

        if (stageProgressAfterRight !== 0.5 || !stagePlayingAfterSpace) {
          throw new Error(
            `Stage direct shortcuts failed: progress=${stageProgressAfterRight}, playing=${stagePlayingAfterSpace}`,
          );
        }

        return {
          sliderProgressAfterArrows,
          afterSpeedSpace,
          playingAfterBtnSpace,
          stageProgressAfterRight,
          stagePlayingAfterSpace,
        };
      },
    );

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_browser_runtime_reduced_motion_and_pagehide_recovery',
      async () => {
        await page.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'no-preference' },
        ]);
        await page.click('[data-testid="harness-rep-projected-3d"]');
        await page.click('[data-testid="harness-play-pause-btn"]');

        // Flip prefers-reduced-motion to reduce at runtime while playing
        await page.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ]);
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(r)),
        );
        const pausedOnReducedMotion = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          return {
            playing: h.getAttribute('data-playing') === 'true',
            reducedMotion: h.getAttribute('data-reduced-motion') === 'true',
          };
        });

        // Explicit user click on play button under reduced-motion must start playback
        await page.click('[data-testid="harness-play-pause-btn"]');
        const explicitPlayUnderReduced = await page.$eval(
          '[data-testid="motion-coverage-preview-harness"]',
          (el) => el.getAttribute('data-playing') === 'true',
        );

        // Dispatch pagehide -> must pause and set data-background-hidden="true"
        await page.evaluate(() => {
          window.dispatchEvent(new PageTransitionEvent('pagehide'));
        });
        const pausedOnPageHide = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          return {
            playing: h.getAttribute('data-playing') === 'true',
            backgroundHidden:
              h.getAttribute('data-background-hidden') === 'true',
          };
        });

        // Explicit click on play button after pagehide (while document is visible) recovers and plays
        await page.click('[data-testid="harness-play-pause-btn"]');
        const recoveredAfterPageHide = await page.evaluate(() => {
          const h = document.querySelector(
            '[data-testid="motion-coverage-preview-harness"]',
          );
          return {
            playing: h.getAttribute('data-playing') === 'true',
            backgroundHidden:
              h.getAttribute('data-background-hidden') === 'true',
          };
        });

        await page.click('[data-testid="harness-play-pause-btn"]');
        await page.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'no-preference' },
        ]);

        if (
          pausedOnReducedMotion.playing ||
          !pausedOnReducedMotion.reducedMotion ||
          !explicitPlayUnderReduced ||
          pausedOnPageHide.playing ||
          !pausedOnPageHide.backgroundHidden ||
          !recoveredAfterPageHide.playing ||
          recoveredAfterPageHide.backgroundHidden
        ) {
          throw new Error(
            `Runtime reduced-motion / pagehide recovery failed: ${JSON.stringify({
              pausedOnReducedMotion,
              explicitPlayUnderReduced,
              pausedOnPageHide,
              recoveredAfterPageHide,
            })}`,
          );
        }

        return {
          pausedOnReducedMotion,
          explicitPlayUnderReduced,
          pausedOnPageHide,
          recoveredAfterPageHide,
        };
      },
    );

    await recordCheck(
      realDomAndKeyboardChecks,
      'real_browser_mount_unmount_remount_cleanup',
      async () => {
        const cycleResult = await page.evaluate(async () => {
          const origReq = window.requestAnimationFrame.bind(window);
          const origCancel = window.cancelAnimationFrame.bind(window);
          const activeHandles = new Set();
          window.requestAnimationFrame = (cb) => {
            const h = origReq((t) => {
              activeHandles.delete(h);
              cb(t);
            });
            activeHandles.add(h);
            return h;
          };
          window.cancelAnimationFrame = (h) => {
            activeHandles.delete(h);
            origCancel(h);
          };

          const perCycle = [];
          for (let i = 0; i < 3; i++) {
            window.__motionCoverageFixture__.remount({
              initialExerciseOrId: 'original-mat-quadruped-reach',
            });
            await new Promise((r) =>
              origReq(() => origReq(r)),
            );
            document
              .querySelector('[data-testid="harness-play-pause-btn"]')
              .click();
            const playingHandles = activeHandles.size;
            window.__motionCoverageFixture__.unmount();
            await new Promise((r) => setTimeout(r, 20));
            const afterUnmountHandles = activeHandles.size;
            perCycle.push({ cycle: i + 1, playingHandles, afterUnmountHandles });
          }

          // Remount one final time so page stays mounted cleanly
          window.__motionCoverageFixture__.remount({
            initialExerciseOrId: 'ex-warmup-01',
          });
          await new Promise((r) => origReq(() => origReq(r)));
          window.__motionCoverageFixture__.unmount();
          await new Promise((r) => setTimeout(r, 20));

          window.requestAnimationFrame = origReq;
          window.cancelAnimationFrame = origCancel;
          return {
            perCycle,
            finalPendingRafCount: activeHandles.size,
          };
        });

        if (
          cycleResult.finalPendingRafCount !== 0 ||
          cycleResult.perCycle.some(
            (c) => c.playingHandles !== 1 || c.afterUnmountHandles !== 0,
          )
        ) {
          throw new Error(
            `Mount/unmount/remount leak detected: ${JSON.stringify(cycleResult)}`,
          );
        }
        return cycleResult;
      },
    );

    const allChecks = [...directApiChecks, ...realDomAndKeyboardChecks];
    const summary = {
      pass: allChecks.filter((c) => c.status === 'pass').length,
      fail: allChecks.filter((c) => c.status === 'fail').length,
      skip: allChecks.filter((c) => c.status === 'skip').length,
      total: allChecks.length,
    };

    const report = {
      suite: 'motionCoverage-local-chromium-verification',
      startedAt,
      completedAt: new Date().toISOString(),
      environment: {
        os: `${os.platform()} ${os.release()} (${os.arch()})`,
        nodeVersion: process.version,
        browserUserAgent,
        chromiumExecutable: executablePath,
        executionMode:
          'desktop-headless-chromium-viewport-emulation (NOT physical mobile device)',
        truthfulnessInvariants: {
          canonicalMotionReady: false,
          manualReady: false,
          true3dSupported: false,
          anatomicalOrExpertVerified: false,
        },
      },
      summary,
      directApiChecks,
      realDomAndKeyboardChecks,
      failureCaptures,
    };

    const jsonString = JSON.stringify(report, null, 2);
    if (jsonOut) {
      await fs.mkdir(path.dirname(jsonOut), { recursive: true });
      await fs.writeFile(jsonOut, jsonString, 'utf8');
    }
    console.log(jsonString);

    if (summary.fail > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (viteServer) {
      await viteServer.close().catch(() => {});
    }
    await fs
      .rm(tempProfileDir, { recursive: true, force: true })
      .catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
