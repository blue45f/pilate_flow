const { artifactDirectory } = require('./artifact-directory.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = artifactDirectory(process.env.OUT_DIR);
const base = process.env.BASE_URL || 'http://127.0.0.1:5247';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: width < 800,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const state = () =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3'))?.state,
        );
      const openSettings = async () => {
        await page.getByRole('button', { name: '데이터 백업과 사용 안내', exact: true }).click();
        return page.getByRole('region', { name: '내 보유 기구와 소도구', exact: true });
      };
      const closeDialog = async (name) => {
        const dialog = page.getByRole('dialog', { name, exact: true });
        await dialog.getByRole('button', { name: '닫기', exact: true }).first().click();
        await dialog.waitFor({ state: 'hidden' });
      };
      const navigate = async (mobile, desktop) => {
        const bottom = page.locator('.bottom-nav');
        if (await bottom.isVisible())
          await bottom.getByRole('button', { name: mobile, exact: true }).click();
        else
          await page
            .locator('.desktop-nav')
            .getByRole('button', { name: new RegExp('^' + desktop) })
            .click();
      };
      const checkLayout = async (locator) => {
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'document fits ' + width,
        );
        const cards = await locator.locator('.equipment-choice').evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect();
            return {
              width: r.width,
              height: r.height,
              fits: node.scrollWidth <= node.clientWidth + 1,
            };
          }),
        );
        assert.ok(cards.length > 0);
        assert.ok(
          cards.every((card) => card.height >= 44 && card.fits),
          'touch targets and content fit ' + width,
        );
      };
      await page.goto(base);
      let inventory = await openSettings();
      assert.equal(await inventory.getByRole('checkbox').count(), 21);
      assert.equal(await inventory.locator('svg.equipment-illustration').count(), 21);
      await inventory.getByRole('checkbox', { name: '매트', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + '/settings-equipment-' + width + '.png' });
      const checkedNames = () =>
        inventory
          .getByRole('checkbox', { checked: true })
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-labelledby')).sort());
      const before = await checkedNames();
      const mat = inventory.getByRole('checkbox', { name: '매트', exact: true });
      await mat.focus();
      assert.ok(await mat.evaluate((node) => node === document.activeElement));
      await page.keyboard.press('Space');
      assert.equal(await mat.isChecked(), false);
      await page.keyboard.press('Space');
      assert.equal(await mat.isChecked(), true);
      assert.deepEqual(await checkedNames(), before);
      for (const name of ['짐볼', '루프 밴드'])
        await inventory.getByRole('checkbox', { name, exact: true }).check();
      assert.equal(
        await inventory.getByRole('checkbox', { name: '미니볼', exact: true }).isChecked(),
        false,
      );
      await inventory
        .getByRole('checkbox', { name: '루프 밴드', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + '/settings-props-' + width + '.png' });
      await checkLayout(inventory);
      const selectedProps = (await state()).ownedProps;
      assert.ok(selectedProps.includes('fitness-ball') && selectedProps.includes('loop-band'));
      await closeDialog('나의 스튜디오');
      await page.reload();
      inventory = await openSettings();
      for (const name of ['매트', '짐볼', '루프 밴드'])
        assert.equal(
          await inventory.getByRole('checkbox', { name, exact: true }).isChecked(),
          true,
        );
      const equipment = inventory.getByRole('group', { name: '기구 · 여러 개 선택', exact: true });
      for (const checkbox of await equipment.getByRole('checkbox').all()) await checkbox.uncheck();
      assert.deepEqual((await state()).ownedEquipment, []);
      assert.deepEqual((await state()).ownedProps, selectedProps);
      await inventory.getByRole('checkbox', { name: '매트', exact: true }).check();
      await closeDialog('나의 스튜디오');

      await navigate('동작', '동작 라이브러리');
      const owned = page.locator('.library-owned-editor');
      const parentDetails = owned.locator('xpath=..');
      if (!(await owned.isVisible())) await parentDetails.locator(':scope > summary').click();
      await owned.locator('summary').click();
      const gymButton = owned.getByRole('button', { name: '짐볼', exact: true });
      assert.equal(await gymButton.getAttribute('aria-pressed'), 'true');
      await gymButton.focus();
      await page.keyboard.press('Space');
      assert.equal(await gymButton.getAttribute('aria-pressed'), 'false');
      assert.equal((await state()).ownedProps.includes('fitness-ball'), false);
      await gymButton.click();
      await checkLayout(owned);
      await gymButton.scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + '/library-inventory-' + width + '.png' });

      await navigate('일정', '강사 일정');
      await page.getByRole('button', { name: '장소 관리', exact: true }).click();
      let location = page.getByRole('dialog', { name: '장소 관리', exact: true });
      await location
        .getByRole('textbox', { name: '장소 별칭', exact: true })
        .fill('기구 그림 검증 장소');
      for (const name of ['매트', '짐볼', '루프 밴드'])
        await location.getByRole('checkbox', { name, exact: true }).check();
      await checkLayout(location);
      await location.getByRole('checkbox', { name: '짐볼', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + '/location-props-' + width + '.png' });
      await location.getByRole('button', { name: '장소 저장', exact: true }).click();
      if (!(await location.isVisible()))
        await page.getByRole('button', { name: '장소 관리', exact: true }).click();
      location = page.getByRole('dialog', { name: '장소 관리', exact: true });
      await location.getByRole('button', { name: '기구 그림 검증 장소', exact: true }).click();
      for (const name of ['매트', '짐볼', '루프 밴드'])
        assert.equal(await location.getByRole('checkbox', { name, exact: true }).isChecked(), true);
      await location.getByRole('checkbox', { name: '짐볼', exact: true }).uncheck();
      await closeDialog('장소 관리');
      await page.getByRole('button', { name: '장소 관리', exact: true }).click();
      location = page.getByRole('dialog', { name: '장소 관리', exact: true });
      await location.getByRole('button', { name: '기구 그림 검증 장소', exact: true }).click();
      assert.equal(
        await location.getByRole('checkbox', { name: '짐볼', exact: true }).isChecked(),
        true,
        'closing does not save draft changes',
      );
      await closeDialog('장소 관리');

      await navigate('수업', '오늘의 수업');
      const conditions = page.getByRole('button', { name: /수업 조건 열기/ });
      if (await conditions.count()) await conditions.first().click();
      else await page.getByRole('button', { name: '수업 조건', exact: true }).click();
      const classDialog = page.getByRole('dialog', { name: '수업 조건', exact: true });
      assert.equal(
        await classDialog
          .getByRole('checkbox', { name: '리포머 · 미보유', exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await classDialog.getByRole('checkbox', { name: '매트', exact: true }).isEnabled(),
        true,
      );
      await checkLayout(classDialog);
      await classDialog
        .getByRole('checkbox', { name: '매트', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + '/class-equipment-' + width + '.png' });
      await closeDialog('수업 조건');
      assert.deepEqual(errors, [], 'no browser errors ' + width);
      results.push({
        width,
        cards: 21,
        keyboardCheckbox: true,
        keyboardButton: true,
        independentMultiSelect: true,
        emptyInventory: true,
        reload: true,
        librarySync: true,
        locationSaveCancel: true,
        unavailableDisabled: true,
        noHorizontalOverflow: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
