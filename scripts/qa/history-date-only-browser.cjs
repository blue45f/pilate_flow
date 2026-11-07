const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5264/';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE_URL).hostname)) throw new Error('Use a local isolated preview only.');
const OUT = process.env.QA_OUTPUT_DIR || fs.mkdtempSync(path.join(tmpdir(), 'pilates-date-only-browser-'));
fs.mkdirSync(OUT, { recursive: true });
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const results = [];
 try {
  for (const timezoneId of ['Asia/Seoul', 'UTC']) { for (const width of [320,390,768,1440]) {
   const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId });
   await context.route('**/*', route => { const host = new URL(route.request().url()).hostname; return ['127.0.0.1','localhost'].includes(host) ? route.continue() : route.abort(); });
   const page = await context.newPage(); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   await page.goto(BASE_URL);
   await page.evaluate(async () => {
    const reactModule = await import('/node_modules/.vite/deps/react.js'); const React = reactModule.createElement ? reactModule : reactModule.default;
    const domClient = await import('/node_modules/.vite/deps/react-dom_client.js'); const createRoot = domClient.createRoot || domClient.default.createRoot;
    const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
    const { LogSessionModal } = await import('/src/components/LogSessionModal.tsx');
    const { ClassBinderView } = await import('/src/components/ClassBinderView.tsx');
    const state = usePilatesStore.getState();
    const ex = state.exercises.find(e=>e.apparatus==='mat' && e.blockCategory==='warmup') || state.exercises[0];
    const steps = [{ stepId:'periodic-date-step',order:1,exerciseId:ex.id,blockCategory:ex.blockCategory,durationMin:1,explanationSec:0,transitionSec:0,selectedLayer:'standard' }];
    usePilatesStore.setState({activeSequenceId:'periodic-date-only',activeTitle:'합성 날짜전용 검증',activeSteps:steps,historyLogs:[],savedSequences:[],activeTab:'sequence'});
    document.getElementById('root').style.display='none'; const mount=document.createElement('div');mount.id='date-only-component-harness';document.body.append(mount);
    const root=createRoot(mount);window.__dateHarness={root,React,usePilatesStore,ClassBinderView,closed:false};
    root.render(React.createElement(LogSessionModal,{sequenceId:'periodic-date-only',context:{stepsSnapshot:steps,sequenceTitle:'합성 날짜전용 검증'},onClose:()=>{window.__dateHarness.closed=true;root.render(null);}}));
   });
   const dialog=page.getByRole('dialog',{name:'수업 기록 남기기'});await dialog.waitFor();
   const timeInputs=await dialog.locator('input[type="time"],input[type="datetime-local"]').count();
   await dialog.locator('input[type="date"]').fill('2026-11-05');
   await dialog.getByRole('button',{name:'수업 기록 저장',exact:true}).click();
   await page.waitForFunction(()=>window.__dateHarness.closed);
   const record=await page.evaluate(()=>{ const h=window.__dateHarness; const log=h.usePilatesStore.getState().historyLogs[0]; h.root.render(h.React.createElement(h.ClassBinderView,{onOpenLogModal:()=>{},view:'history'})); return {taughtAt:log.taughtAt,dateOnly:log.dateOnly??null,timestamps:log.timestamps??null,snapshotDateOnly:log.programSnapshot?.dateOnly??null}; });
   await page.waitForFunction(()=>document.getElementById('date-only-component-harness')?.innerText.includes('합성 날짜전용 검증'));
   const assert=require('node:assert/strict'); assert.equal(record.snapshotDateOnly,true);
   const badges=await page.locator('#date-only-component-harness .teaching-history-time-of-day').allTextContents();
   assert.deepEqual(badges,[]); await page.screenshot({path:path.join(OUT,'date-only-'+timezoneId.replace('/','-')+'-'+width+'.png')});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
   const legacy=[];for(const time of ['12:00:00','00:00:00']) { await page.evaluate(time=>{const s=window.__dateHarness.usePilatesStore; const old=structuredClone(s.getState().historyLogs[0]);delete old.programSnapshot.dateOnly;old.taughtAt=new Date('2026-11-04T'+time).toISOString();old.programSnapshot.taughtAt=old.taughtAt;s.setState({historyLogs:[old]});},time); await page.waitForFunction(expected=>document.querySelector('#date-only-component-harness .teaching-history-time-of-day')?.textContent===expected,time.slice(0,5)); legacy.push(time.slice(0,5)); }
   assert.deepEqual(errors,[]);results.push({timezoneId,width,timeInputs,record,badges,legacy,overflow,errors}); await context.close();
  }
  }
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({base:'ca0fef4309e5d2b416d14254579cd6ede669d1cb',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'isolated real Chrome component integration; synthetic local data only',results},null,2));console.log(JSON.stringify(results,null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
