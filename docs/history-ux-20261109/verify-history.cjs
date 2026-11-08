const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.HISTORY_REVIEW_URL;
if (!base || new URL(base).hostname !== '127.0.0.1') throw new Error('Explicit parent-provided loopback URL required');
const origin = new URL(base).origin;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const spec of [{width:320,height:760},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:1024,height:500},{width:320,height:760,text:200},{width:320,height:760,long:true}]) {
      const {width,height}=spec;
      const label=`${width}x${height}${spec.text?'-text200':''}${spec.long?'-long':''}`;
      const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
      const blocked = [];
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        blocked.push(new URL(route.request().url()).origin);
        return route.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base);
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { revisionSource, revisionExercise } = await import('/src/test/datedRevisionFixtures.ts');
        const sequence = revisionSource();
        sequence.title = '매트 기본 수업';
        sequence.subtitle = '합성 검증용 계획';
        sequence.criteriaSnapshot = undefined;
        const log = { id: 'qa-history', sequenceId: 'original', sequenceTitle: sequence.title, groupId: 'qa-group', groupName: '합성 검증 수업', taughtAt: '2026-11-05', apparatus: 'mat', level: '1.0', exerciseIds: [revisionExercise.id], rating: 4, intensity: 'moderate', instructorReflection: '합성 검증용 기록', actualDurationSec: 3000, stepsSnapshot: sequence.steps };
        usePilatesStore.setState({ activeTab: 'history', savedSequences: [sequence], exercises: [revisionExercise], activeSequenceId: 'qa-unrelated-draft', activeTitle: '별도의 현재 초안', activeSteps: structuredClone(sequence.steps), classGroups: [{ id: 'qa-group', name: '합성 검증 수업', type: 'group', defaultLevel: '1.0', scheduleLabel: '', notes: '' }], historyLogs: [log, { ...structuredClone(log), id: 'qa-history-second', sequenceTitle: '소그룹 수업', taughtAt: '2026-11-03' }] });
        window.__historyReviewStore = usePilatesStore;
        window.__historyReviewSignature = () => JSON.stringify(Object.fromEntries(['activeTab', 'activeSequenceId', 'activeTitle', 'activeSubtitle', 'activeSteps', 'activeTargetMinutes', 'activeTargetGroupId', 'draftCriteria', 'lastCriteria', 'historyLogs', 'savedSequences', 'exercises', 'classGroups', 'undoStack'].map(k => [k, usePilatesStore.getState()[k]])));
      });
      await page.getByRole('heading', { name: /수업 기록/, level: 1 }).waitFor();
      if(spec.text)await page.evaluate(()=>{
        // Double actual computed text sizes, including fixed-pixel history styles.
        const sizes=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);
        for(const [e,size] of sizes)if(Number.isFinite(size))e.style.setProperty('font-size',`${size*2}px`,'important');
      });
      if(spec.long)await page.evaluate(()=>{const s=window.__historyReviewStore; s.setState({historyLogs:s.getState().historyLogs.map((log,i)=>i?log:{...log,sequenceTitle:'긴수업제목'.repeat(15),groupName:'긴수업그룹'.repeat(12),instructorReflection:'긴 기록 메모와 줄바꿈을 유지합니다.\n'.repeat(8)})});});
      await page.screenshot({ path: `${__dirname}/after-${label}-full.png`, fullPage: true, scale: 'css' });
      await page.screenshot({ path: `${__dirname}/after-${label}-viewport.png`, fullPage: false, scale: 'css' });
      const geometry = await page.evaluate(() => {
        const rect = e => { if (!e) return null; const b=e.getBoundingClientRect(), s=getComputedStyle(e); return {text:e.innerText, x:b.x,y:b.y,w:b.width,h:b.height,order:s.order,background:s.backgroundColor,color:s.color}; };
        const cards = [...document.querySelectorAll('.teaching-history-card')];
        return { overflow: document.documentElement.scrollWidth-innerWidth, viewportHeight: innerHeight, heading:rect(document.querySelector('.teaching-page-header')), firstCard:rect(cards[0]), secondCard:rect(cards[1]), actions:[...cards[0].querySelectorAll('.teaching-history-actions button')].map(rect), dateHeader:rect(document.querySelector('.teaching-history-date-header')), aside:rect(document.querySelector('.teaching-memory-aside')) };
      });
      fs.writeFileSync(`${__dirname}/geometry-${label}.json`,JSON.stringify(geometry,null,2));
      assert.equal(geometry.overflow,0);
      assert.equal(geometry.actions[0].text.trim(),'당시 시퀀스 보기');
      assert.equal(geometry.actions[1].text.trim(),'복사해 새 수업 만들기');
      assert.ok(geometry.actions[0].y<=geometry.actions[1].y);
      assert.ok(geometry.actions.every(a=>a.h>=44));
      assert.notEqual(geometry.dateHeader.background,'rgba(0, 0, 0, 0)');
      const first=page.locator('.teaching-history-card').first();
      const view=first.getByRole('button',{name:'당시 시퀀스 보기',exact:true});
      const copy=first.getByRole('button',{name:'복사해 새 수업 만들기',exact:true});
      await view.focus(); await page.keyboard.press('Tab');
      assert.equal(await copy.evaluate(e=>e===document.activeElement),true);
      if(spec.text)assert.equal(await first.getByRole('heading',{level:2}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),36);
      const before = await page.evaluate(() => window.__historyReviewSignature());
      const opener = page.getByRole('button', { name: /이력 다시 열기|당시 시퀀스 보기/ }).first();
      await opener.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: '진행 완료 수업 이력 상세' });
      await dialog.waitFor();
      await page.screenshot({ path: `${__dirname}/after-${label}-detail.png`, fullPage: false, scale: 'css' });
      const viewUnchanged = before === await page.evaluate(() => window.__historyReviewSignature());
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden'});
      const escapeFocus = await opener.evaluate(el => el === document.activeElement);
      const closedUnchanged = before === await page.evaluate(() => window.__historyReviewSignature());
      await opener.click();
      await dialog.waitFor();
      await dialog.getByRole('button',{name:'닫기',exact:true}).last().click();
      await dialog.waitFor({state:'hidden'});
      const buttonFocus = await opener.evaluate(el => el === document.activeElement);
      const repeatedUnchanged = before === await page.evaluate(() => window.__historyReviewSignature());
      assert.ok(viewUnchanged && closedUnchanged && repeatedUnchanged && escapeFocus && buttonFocus);
      await first.locator('.teaching-history-details > summary').click();
      assert.ok(await first.locator('.teaching-history-details').evaluate(e=>e.open));
      assert.equal(await page.evaluate(()=>window.__historyReviewSignature()),before);
      await first.locator('.teaching-history-details > summary').click();
      const persisted=await page.evaluate(()=>JSON.stringify([window.__historyReviewStore.getState().historyLogs,window.__historyReviewStore.getState().savedSequences]));
      const expectedTitle=await first.getByRole('heading',{level:2}).innerText();
      await copy.click();
      await page.waitForFunction(()=>window.__historyReviewStore.getState().activeTab==='workbench');
      const copied=await page.evaluate(()=>{const s=window.__historyReviewStore.getState();return {title:s.activeTitle,count:s.activeSteps.length,originals:JSON.stringify([s.historyLogs,s.savedSequences])};});
      assert.ok(copied.title.includes(expectedTitle)); assert.ok(copied.count>0); assert.equal(copied.originals,persisted);
      await page.evaluate(()=>{const store=window.__historyReviewStore;const log=store.getState().historyLogs[0];store.setState({activeTab:'history',historyLogs:[{...log,id:'qa-missing',exerciseIds:['missing-movement'],stepsSnapshot:[{stepId:'missing-step',kind:'exercise',order:1,exerciseId:'missing-movement',blockCategory:'core',durationMin:5,selectedLayer:'standard'}],programSnapshot:undefined}]});});
      await page.getByRole('heading',{level:1,name:/수업 기록/}).waitFor();
      const missing=page.locator('.teaching-history-card').first();
      assert.equal(await missing.getByRole('button',{name:'복사해 새 수업 만들기'}).isDisabled(),true);
      assert.equal(await missing.getByRole('button',{name:'당시 시퀀스 보기'}).isEnabled(),true);
      await missing.getByRole('button',{name:'당시 시퀀스 보기'}).click(); await dialog.waitFor(); await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
      assert.deepEqual(errors,[]);
      results.push({ spec, geometry, copiedWithoutMutatingOriginals:true, missingCopyDisabledViewAvailable:true, viewUnchanged, closedUnchanged, repeatedUnchanged, escapeFocus, buttonFocus, pageErrors: errors, blockedOrigins: [...new Set(blocked)] });
      await context.close();
    }
    fs.writeFileSync(`${__dirname}/history-browser-results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
