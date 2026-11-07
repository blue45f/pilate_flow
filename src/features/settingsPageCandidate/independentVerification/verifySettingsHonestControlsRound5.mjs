#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import {
  PRESET_IDS,
  VIEWPORTS,
  collectCandidateSourceMetrics,
  launchCdpBrowser,
  projectRoot,
} from './cdpBrowserHelper.mjs';

const evidenceDir = resolve(projectRoot, 'docs/settings-honest-controls-round5-20261107/evidence');
const screenshotDir = resolve(evidenceDir, 'screenshots');
await mkdir(screenshotDir, { recursive: true });

const viteServer = await createServer({
  root: projectRoot,
  logLevel: 'silent',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
  },
});

await viteServer.listen();
const address = viteServer.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : 0;
assert.ok(port > 0, 'Expected ephemeral local Vite port');
const baseUrl = `http://127.0.0.1:${port}`;
const realEntryUrl = `${baseUrl}/`;
const fixtureUrl = `${baseUrl}/src/features/settingsPageCandidate/browserFixture.html`;

const browser = await launchCdpBrowser('pf-settings-r5-cdp-');
const realEntryViewportResults = [];
const fixtureViewportResults = [];
let interactiveHonestControlsReport = null;

try {
  // Part 1: Real User Settings Entry Path (`/`) across 320, 390, 768, 1440 and 200% zoom
  for (const { width, height } of VIEWPORTS) {
    const page = await browser.newPage({ width, height, reducedMotion: false });
    try {
      await page.goto(realEntryUrl);
      await page.waitForFunction(() =>
        Boolean(document.querySelector('[aria-label="데이터 백업과 사용 안내"]')),
      );

      await page.evaluate(() => {
        const btn = document.querySelector('[aria-label="데이터 백업과 사용 안내"]');
        if (!(btn instanceof HTMLElement)) {
          throw new Error('Missing topbar settings button [aria-label="데이터 백업과 사용 안내"]');
        }
        btn.click();
      });

      await page.waitForFunction(() => {
        const dialogs = [...document.querySelectorAll('dialog')];
        const studioDialog = dialogs.find(
          (d) => d.open && d.textContent?.includes('나의 스튜디오'),
        );
        if (!studioDialog) return false;
        const hasCloudSync = Boolean(studioDialog.querySelector('.firebase-account-panel'));
        const hasRecovery = Boolean(studioDialog.querySelector('.recovery-preview'));
        return hasCloudSync && hasRecovery;
      });

      await page.evaluate(() => {
        const summaries = [...document.querySelectorAll('details.settings-section > summary')];
        const candidateSummary = summaries.find((s) =>
          s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
        );
        if (!(candidateSummary instanceof HTMLElement)) {
          throw new Error('Missing 4-group summary element');
        }
        candidateSummary.click();
      });

      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="pilates-settings-page"]');
        return Boolean(el && el.getBoundingClientRect().height > 0);
      });

      await page.evaluate(() => {
        document
          .querySelectorAll('.pf-settings-page details')
          .forEach((d) => d.setAttribute('open', ''));
      });

      const realEntryAudit = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const rootEl = document.querySelector('[data-testid="pilates-settings-page"]');
        const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
        const rootClientWidth = rootEl ? rootEl.clientWidth : 0;

        const unconnectedIds = [
          'settings-account-signin-btn',
          'settings-voice-enable-toggle',
          'settings-voice-sample-btn',
          'settings-voice-recheck-btn',
          'settings-reduced-motion-toggle',
          'settings-voice-speed-0.85',
          'settings-voice-speed-1',
          'settings-voice-speed-1.15',
          'settings-voice-pref-movement',
          'settings-voice-pref-breath',
          'settings-voice-pref-time',
          'settings-data-import-btn',
        ];
        const unconnectedDisabledMap = {};
        for (const tid of unconnectedIds) {
          const el = rootEl?.querySelector(`[data-testid="${tid}"]`);
          unconnectedDisabledMap[tid] = Boolean(
            el && 'disabled' in el && el.disabled === true,
          );
        }

        const connectedIds = [
          'settings-nav-chip-account',
          'settings-nav-chip-voice',
          'settings-nav-chip-install',
          'settings-nav-chip-data',
          'settings-data-export-btn',
          'settings-equipment-check-reformer',
          'settings-equipment-check-cadillac',
          'settings-equipment-check-chair',
          'settings-equipment-check-ladder-barrel',
          'settings-equipment-check-spine-corrector',
          'settings-equipment-check-mat',
          'settings-prop-check-foam-roller',
          'settings-prop-check-mini-ball',
          'settings-prop-check-magic-circle',
          'settings-prop-check-theraband',
        ];
        const connectedEnabledMap = {};
        for (const tid of connectedIds) {
          const el = rootEl?.querySelector(`[data-testid="${tid}"]`);
          connectedEnabledMap[tid] = Boolean(
            el && 'disabled' in el && el.disabled === false,
          );
        }

        const guideIds = [
          'settings-account-unconnected-guide',
          'settings-voice-unconnected-guide',
          'settings-install-unconnected-guide',
          'settings-data-unconnected-guide',
          'settings-voice-speed-status',
        ];
        const visibleGuides = {};
        for (const tid of guideIds) {
          const el = rootEl?.querySelector(`[data-testid="${tid}"]`);
          const rect = el?.getBoundingClientRect();
          visibleGuides[tid] = Boolean(
            el && rect && rect.width > 0 && rect.height > 0 && el.textContent?.trim(),
          );
        }

        const forbiddenDevJargon =
          /\b(?:LiveStage|LiveStageView|PwaPanel|PwaInstallPanel|RecoveryPreview|CloudSyncPanel|useClassVoiceGuidance|usePilatesStore|props|callback|snapshot|DOM|hook|candidate|mock|undefined|null)\b/i;
        const hasForbiddenDevJargon = forbiddenDevJargon.test(rootEl?.textContent ?? '');

        const interactiveSelector =
          '.pf-settings-page button, .pf-settings-page summary, .pf-settings-page label.pf-settings-check-label, .pf-settings-page a.pf-settings-page__link-btn';
        const targets = [...document.querySelectorAll(interactiveSelector)].filter(
          (el) => el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().width > 0,
        );

        const undersizedTargets = targets
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              id: el.getAttribute('data-testid') || el.textContent?.trim().slice(0, 30),
              w: Number(r.width.toFixed(2)),
              h: Number(r.height.toFixed(2)),
            };
          })
          .filter((item) => item.w < 43.9 || item.h < 43.9);

        const groups = [
          ...document.querySelectorAll(
            '.pf-settings-page__nav, .pf-settings-actions, .pf-settings-check-grid',
          ),
        ];
        const overlaps = [];
        for (const grp of groups) {
          const children = [
            ...grp.querySelectorAll(
              ':scope > button, :scope > label.pf-settings-check-label, :scope > a.pf-settings-page__link-btn',
            ),
          ].filter((c) => c.getBoundingClientRect().height > 0);
          for (let i = 0; i < children.length; i += 1) {
            for (let j = i + 1; j < children.length; j += 1) {
              const a = children[i].getBoundingClientRect();
              const b = children[j].getBoundingClientRect();
              const horizOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const vertOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (horizOverlap > 0.5 && vertOverlap > 0.5) {
                overlaps.push({
                  a: children[i].getAttribute('data-testid') || children[i].textContent?.trim(),
                  b: children[j].getAttribute('data-testid') || children[j].textContent?.trim(),
                });
              }
            }
          }
        }

        return {
          docScrollWidth,
          winInnerWidth,
          rootScrollWidth,
          rootClientWidth,
          unconnectedDisabledMap,
          connectedEnabledMap,
          visibleGuides,
          hasForbiddenDevJargon,
          interactiveTargetCount: targets.length,
          undersizedTargets,
          overlaps,
        };
      });

      for (const [tid, isDisabled] of Object.entries(realEntryAudit.unconnectedDisabledMap)) {
        assert.equal(
          isDisabled,
          true,
          `${width}x${height}: expected unconnected control [data-testid="${tid}"] to be disabled`,
        );
      }
      for (const [tid, isEnabled] of Object.entries(realEntryAudit.connectedEnabledMap)) {
        assert.equal(
          isEnabled,
          true,
          `${width}x${height}: expected connected control [data-testid="${tid}"] to be enabled`,
        );
      }
      for (const [tid, isVisible] of Object.entries(realEntryAudit.visibleGuides)) {
        assert.equal(
          isVisible,
          true,
          `${width}x${height}: expected guidance [data-testid="${tid}"] to be visible`,
        );
      }
      assert.equal(
        realEntryAudit.hasForbiddenDevJargon,
        false,
        `${width}x${height}: detected forbidden developer jargon in user-facing UI`,
      );
      assert.ok(realEntryAudit.docScrollWidth <= realEntryAudit.winInnerWidth + 1);
      assert.ok(realEntryAudit.rootScrollWidth <= realEntryAudit.rootClientWidth + 1);
      assert.equal(realEntryAudit.undersizedTargets.length, 0);
      assert.equal(realEntryAudit.overlaps.length, 0);

      await page.evaluate(() => {
        document
          .querySelector('[data-testid="pilates-settings-page"]')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await page.screenshot(resolve(screenshotDir, `round5-real-entry-${width}-100.png`));

      const zoom200RealEntry = await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        const rootEl = document.querySelector('[data-testid="pilates-settings-page"]');
        return {
          font200DocScrollWidth: document.documentElement.scrollWidth,
          font200WinInnerWidth: window.innerWidth,
          font200RootScrollWidth: rootEl ? rootEl.scrollWidth : 0,
          font200RootClientWidth: rootEl ? rootEl.clientWidth : 0,
        };
      });

      assert.ok(
        zoom200RealEntry.font200DocScrollWidth <= zoom200RealEntry.font200WinInnerWidth + 1,
      );
      assert.ok(
        zoom200RealEntry.font200RootScrollWidth <= zoom200RealEntry.font200RootClientWidth + 1,
      );

      if (width === 320 || width === 1440) {
        await page.evaluate(() => {
          document
            .querySelector('[data-testid="pilates-settings-page"]')
            ?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.screenshot(resolve(screenshotDir, `round5-real-entry-${width}-200zoom.png`));
      }

      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });

      if (width === 390) {
        const chairBefore = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return el instanceof HTMLInputElement ? el.checked : null;
        });

        await page.evaluate(() => {
          const navChip = document.querySelector('[data-testid="settings-nav-chip-data"]');
          if (navChip instanceof HTMLElement) navChip.click();
          const chairEl = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          if (chairEl instanceof HTMLElement) chairEl.click();
        });

        await page.waitForFunction((prevChecked) => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return el instanceof HTMLInputElement && el.checked === !prevChecked;
        }, chairBefore);

        // Close and reopen "나의 스튜디오" modal to verify revisit consistency
        await page.evaluate(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find(
            (d) => d.open && d.textContent?.includes('나의 스튜디오'),
          );
          const closeBtn = studioDialog?.querySelector('button[aria-label="닫기"]');
          if (closeBtn instanceof HTMLElement) closeBtn.click();
        });

        await page.waitForFunction(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find((d) =>
            d.textContent?.includes('나의 스튜디오'),
          );
          return Boolean(
            studioDialog &&
              !studioDialog.open &&
              !studioDialog.querySelector('.firebase-account-panel'),
          );
        });

        await page.evaluate(() => {
          const btn = document.querySelector('[aria-label="데이터 백업과 사용 안내"]');
          if (btn instanceof HTMLElement) btn.click();
        });

        await page.waitForFunction(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find(
            (d) => d.open && d.textContent?.includes('나의 스튜디오'),
          );
          return Boolean(studioDialog);
        });

        await page.evaluate(() => {
          const summaries = [...document.querySelectorAll('details.settings-section > summary')];
          const candidateSummary = summaries.find((s) =>
            s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
          );
          const details = candidateSummary?.closest('details');
          if (details && !details.open && candidateSummary instanceof HTMLElement) {
            candidateSummary.click();
          }
        });

        await page.waitForFunction(() => {
          const el = document.querySelector('[data-testid="pilates-settings-page"]');
          return Boolean(el && el.getBoundingClientRect().height > 0);
        });

        const revisitCheck = await page.evaluate(() => {
          const dataChip = document.querySelector('[data-testid="settings-nav-chip-data"]');
          const chairEl = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          const voiceToggle = document.querySelector('[data-testid="settings-voice-enable-toggle"]');
          const importBtn = document.querySelector('[data-testid="settings-data-import-btn"]');
          return {
            dataChipPressed: dataChip?.getAttribute('aria-pressed') === 'true',
            chairChecked: chairEl instanceof HTMLInputElement ? chairEl.checked : null,
            voiceToggleDisabled:
              voiceToggle instanceof HTMLButtonElement ? voiceToggle.disabled : null,
            importBtnDisabled:
              importBtn instanceof HTMLButtonElement ? importBtn.disabled : null,
          };
        });

        assert.equal(revisitCheck.dataChipPressed, true);
        assert.equal(revisitCheck.chairChecked, !chairBefore);
        assert.equal(revisitCheck.voiceToggleDisabled, true);
        assert.equal(revisitCheck.importBtnDisabled, true);

        await page.evaluate(() => {
          document
            .querySelector('[data-testid="settings-group-voice"]')
            ?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.screenshot(resolve(screenshotDir, 'round5-real-entry-voice-group-390.png'));

        interactiveHonestControlsReport = {
          viewport: '390x844',
          revisitCheck,
          verified: true,
        };
      }

      assert.deepEqual(page.pageErrors, []);

      realEntryViewportResults.push({
        viewport: `${width}x${height}`,
        width,
        height,
        unconnectedControlsAllDisabled: true,
        connectedControlsAllEnabled: true,
        visibleGuides: realEntryAudit.visibleGuides,
        hasForbiddenDevJargon: false,
        horizontalOverflow100Pct: false,
        horizontalOverflow200PctFont: false,
        minTouchTarget44x44Verified: true,
        interactiveTargetCount: realEntryAudit.interactiveTargetCount,
        touchSiblingOverlapCount: 0,
        pageErrors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  // Part 2: Candidate Fixture (`/src/features/settingsPageCandidate/browserFixture.html`) across 320, 390, 768, 1440
  for (const { width, height } of VIEWPORTS) {
    const page = await browser.newPage({ width, height, reducedMotion: true });
    try {
      await page.goto(fixtureUrl);
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="settings-fixture-harness"]')) &&
          Boolean(window.__pilatesSettingsFixture__),
      );

      for (const presetId of PRESET_IDS) {
        await page.evaluate((id) => {
          window.__pilatesSettingsFixture__.selectPreset(id);
        }, presetId);
        await page.waitForFunction(
          (id) =>
            document
              .querySelector(`[data-testid="fixture-preset-btn-${id}"]`)
              ?.getAttribute('aria-pressed') === 'true',
          presetId,
        );
        await page.evaluate(() => {
          document
            .querySelectorAll('.pf-settings-page details')
            .forEach((d) => d.setAttribute('open', ''));
        });

        const fixtureAudit = await page.evaluate(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const rootEl = document.querySelector('.pf-settings-page');
          const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
          const rootClientWidth = rootEl ? rootEl.clientWidth : 0;
          return {
            docScrollWidth,
            winInnerWidth,
            rootScrollWidth,
            rootClientWidth,
          };
        });

        assert.ok(fixtureAudit.docScrollWidth <= fixtureAudit.winInnerWidth + 1);
        assert.ok(fixtureAudit.rootScrollWidth <= fixtureAudit.rootClientWidth + 1);
      }

      fixtureViewportResults.push({
        viewport: `${width}x${height}`,
        presetsVerified: PRESET_IDS.length,
        horizontalOverflow100Pct: false,
        pageErrors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  const candidateSourceFiles = await collectCandidateSourceMetrics(
    resolve(projectRoot, 'src/features/settingsPageCandidate'),
  );
  const filesOver800Lines = candidateSourceFiles.filter((f) => f.lines > 800);
  assert.equal(
    filesOver800Lines.length,
    0,
    `Expected all files in src/features/settingsPageCandidate to be <= 800 lines, found: ${JSON.stringify(filesOver800Lines)}`,
  );

  const reportPayload = {
    featureId: 'settings-honest-controls-round5-20261107',
    track: 'Round 5 Honest Controls & Real-Entry Browser Verification',
    verifiedAt: new Date().toISOString(),
    passed: true,
    driver: browser.driverKind,
    chromeBinary: browser.chromeBin,
    maxLineLimit800Enforced: true,
    maxFileLinesObserved: Math.max(...candidateSourceFiles.map((f) => f.lines)),
    interactiveHonestControlsReport,
    realEntryViewportResults,
    fixtureViewportResults,
    screenshots: [
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-320-100.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-320-200zoom.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-390-100.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-768-100.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-1440-100.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-1440-200zoom.png',
      'docs/settings-honest-controls-round5-20261107/evidence/screenshots/round5-real-entry-voice-group-390.png',
    ],
    candidateSourceMetrics: {
      totalFiles: candidateSourceFiles.length,
      filesOver800Lines: filesOver800Lines.length,
      files: candidateSourceFiles,
    },
  };

  await writeFile(
    resolve(evidenceDir, 'honest-controls-round5-verification.json'),
    JSON.stringify(reportPayload, null, 2),
  );
  console.log(JSON.stringify(reportPayload, null, 2));
} finally {
  await browser.close();
  await viteServer.close();
}
