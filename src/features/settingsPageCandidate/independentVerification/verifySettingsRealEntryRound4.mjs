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

const evidenceDir = resolve(projectRoot, 'docs/settings-real-entry-round4-20261107/evidence');
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

const browser = await launchCdpBrowser('pf-settings-r4-cdp-');
const realEntryViewportResults = [];
const fixtureViewportResults = [];
let interactiveRevisitReport = null;

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

      const entryInspection = await page.evaluate(() => {
        const studioDialog = [...document.querySelectorAll('dialog')].find(
          (d) => d.open && d.textContent?.includes('나의 스튜디오'),
        );
        if (!studioDialog) {
          throw new Error('Studio dialog not open');
        }
        const summaries = [...studioDialog.querySelectorAll('details.settings-section > summary')];
        const candidateSummary = summaries.find((s) =>
          s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
        );
        const candidateDetails = candidateSummary?.closest('details') ?? null;
        return {
          dialogTitle:
            studioDialog.querySelector('.atelier-modal-title')?.textContent?.trim() ?? '',
          hasLegacyCloudSyncPanel: Boolean(studioDialog.querySelector('.firebase-account-panel')),
          hasLegacyInventoryPanel: Boolean(studioDialog.querySelector('.inventory-panel')),
          hasLegacyRecoveryPreview: Boolean(studioDialog.querySelector('.recovery-preview')),
          hasCandidateSummaryDisclosure: Boolean(candidateSummary),
          candidateDetailsInitiallyOpen: candidateDetails ? candidateDetails.open : null,
        };
      });

      assert.equal(entryInspection.dialogTitle, '나의 스튜디오');
      assert.equal(entryInspection.hasLegacyCloudSyncPanel, true);
      assert.equal(entryInspection.hasLegacyInventoryPanel, true);
      assert.equal(entryInspection.hasLegacyRecoveryPreview, true);
      assert.equal(entryInspection.hasCandidateSummaryDisclosure, true);
      assert.equal(
        entryInspection.candidateDetailsInitiallyOpen,
        false,
        `${width}x${height}: expected 4-group summary <details> to be initially collapsed`,
      );

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

        const groupIds = ['account', 'voice', 'install', 'data'];
        const groupsPresent = groupIds.every((id) =>
          Boolean(rootEl?.querySelector(`[data-testid="settings-group-${id}"]`)),
        );

        const requiredTestIds = [
          'settings-voice-autoplay-prerequisite',
          'settings-video-autoplay-policy',
          'settings-reduced-motion-status',
          'settings-reduced-motion-toggle',
          'settings-install-offline-summary',
          'settings-install-offline-scope',
        ];
        const visibleRequiredTestIds = {};
        for (const tid of requiredTestIds) {
          const node = rootEl?.querySelector(`[data-testid="${tid}"]`);
          const rect = node?.getBoundingClientRect();
          visibleRequiredTestIds[tid] = Boolean(
            node && rect && rect.width > 0 && rect.height > 0 && node.textContent?.trim(),
          );
        }

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
          groupsPresent,
          visibleRequiredTestIds,
          interactiveTargetCount: targets.length,
          undersizedTargets,
          overlaps,
        };
      });

      assert.equal(realEntryAudit.groupsPresent, true, `${width}x${height}: missing 4 groups`);
      for (const [tid, isVis] of Object.entries(realEntryAudit.visibleRequiredTestIds)) {
        assert.equal(
          isVis,
          true,
          `${width}x${height}: expected [data-testid="${tid}"] to be visible on real entry path`,
        );
      }
      assert.ok(
        realEntryAudit.docScrollWidth <= realEntryAudit.winInnerWidth + 1,
        `${width}x${height} real entry: document horizontal overflow`,
      );
      assert.ok(
        realEntryAudit.rootScrollWidth <= realEntryAudit.rootClientWidth + 1,
        `${width}x${height} real entry: .pf-settings-page horizontal overflow`,
      );
      assert.equal(realEntryAudit.undersizedTargets.length, 0);
      assert.equal(realEntryAudit.overlaps.length, 0);

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
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          if (!(el instanceof HTMLElement)) throw new Error('Missing chair checkbox');
          el.click();
        });
        await page.waitForFunction((prevChecked) => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return el instanceof HTMLInputElement && el.checked === !prevChecked;
        }, chairBefore);

        await page.evaluate(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find(
            (d) => d.open && d.textContent?.includes('나의 스튜디오'),
          );
          const closeBtn = studioDialog?.querySelector('button[aria-label="닫기"]');
          if (!(closeBtn instanceof HTMLElement)) {
            throw new Error('Missing close button on 나의 스튜디오 dialog');
          }
          closeBtn.click();
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

        const afterRevisit = await page.evaluate(() => {
          const dataChip = document.querySelector('[data-testid="settings-nav-chip-data"]');
          const chairInput = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return {
            dataChipPressed: dataChip?.getAttribute('aria-pressed') === 'true',
            chairChecked: chairInput instanceof HTMLInputElement ? chairInput.checked : null,
          };
        });

        assert.equal(afterRevisit.dataChipPressed, true);
        assert.equal(afterRevisit.chairChecked, !chairBefore);

        interactiveRevisitReport = {
          viewport: '390x844',
          afterRevisit,
          revisitConsistencyVerified: true,
        };
      }

      assert.deepEqual(page.pageErrors, []);

      realEntryViewportResults.push({
        viewport: `${width}x${height}`,
        width,
        height,
        entryInspection,
        groupsPresent: realEntryAudit.groupsPresent,
        visibleRequiredTestIds: realEntryAudit.visibleRequiredTestIds,
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

  const reportPayload = {
    featureId: 'settings-real-entry-round4-20261107',
    verifiedAt: new Date().toISOString(),
    passed: true,
    driver: browser.driverKind,
    interactiveRevisitReport,
    realEntryViewportResults,
    fixtureViewportResults,
    candidateSourceMetrics: {
      totalFiles: candidateSourceFiles.length,
      files: candidateSourceFiles,
    },
  };

  await writeFile(
    resolve(evidenceDir, 'real-entry-round4-verification.json'),
    JSON.stringify(reportPayload, null, 2),
  );
  console.log(JSON.stringify(reportPayload, null, 2));
} finally {
  await browser.close();
  await viteServer.close();
}
