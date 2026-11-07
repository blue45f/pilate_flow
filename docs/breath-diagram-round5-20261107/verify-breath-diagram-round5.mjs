import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dist2D,
  evaluateContactAccuracySuite,
  loadReadOnlyBaselineModules,
  renderAndExtractPhaseGeometry,
} from '../../scripts/diagram-contact-audit-20261107/shared/contact-geometry-analyzer.mjs';
import { renderVNodeToMarkup } from '../../scripts/diagram-contact-audit-20261107/shared/ts-loader-hooks.mjs';

const THIRD_PARTY_URL =
  'file:///usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.join(__dirname, 'evidence');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const BREATH_EXERCISE_IDS = [
  'original-mat-rib-breath',
  'original-cadillac-table-breath',
  'original-chair-seated-breath',
  'original-barrel-standing-breath',
];

const BEFORE_BASELINE = {
  'original-mat-rib-breath': {
    archetypeId: 'supine-breath-pelvic-clock',
    pelvisStart: { x: 184, y: 142 },
    heelStart: { x: 252, y: 148 },
    handDeltaSmPx: 64.1,
    heelDeltaSmPx: 0,
    springTensionLevel: 'none',
    primaryMuscles: ['core-transversus(stabilizer)', 'thoracic-extensors(lengthening)'],
    defectSummary: 'Hands perform 64.1px overhead arc (120,74→56,70→166,138) absent from breath cue; summary conflates pelvic clock imprint.',
  },
  'original-cadillac-table-breath': {
    archetypeId: 'supine-breath-pelvic-clock',
    pelvisStart: { x: 184, y: 142 },
    heelStart: { x: 252, y: 148 },
    handDeltaSmPx: 64.1,
    heelDeltaSmPx: 0,
    springTensionLevel: 'medium',
    cadillacHandSpringCoilPaths: 1,
    primaryMuscles: ['core-transversus(stabilizer)', 'thoracic-extensors(lengthening)'],
    defectSummary: 'Cue explicitly states no springs used, yet springTensionLevel is medium, SVG renders hand-connected spring coil path, and hands sweep 64.1px overhead.',
  },
  'original-chair-seated-breath': {
    archetypeId: 'seated-row-arm-arc',
    pelvisStart: { x: 112, y: 138 },
    heelStart: { x: 238, y: 148 },
    handDeltaSmPx: 80.5,
    heelDeltaSmPx: 0,
    springTensionLevel: 'medium',
    primaryMuscles: [
      'latissimus-serratus(primary)',
      'shoulder-deltoid(primary)',
      'core-transversus(stabilizer)',
      'thoracic-extensors(lengthening)',
    ],
    defectSummary: 'pelvis y=138 penetrates below Chair seat (y=106..115), heel y=148 floats 30px above floor (y=178), hands row 80.5px, and muscles fall back to latissimus/deltoid.',
  },
  'original-barrel-standing-breath': {
    archetypeId: 'standing-ankle-calf-upper-reach',
    pelvisStart: { x: 144, y: 116 },
    heelStart: { x: 142, y: 176 },
    handStart: { x: 194, y: 80 },
    handDistToLadderStartPx: 98,
    handDeltaSmPx: 50.5,
    heelDeltaSmPx: 14.6,
    springTensionLevel: 'none',
    primaryMuscles: [
      'calves(primary:호흡)',
      'shoulder-deltoid(primary)',
      'core-transversus(stabilizer)',
      'thoracic-extensors(lengthening)',
    ],
    defectSummary: 'Hands (x=194..236) miss Ladder Barrel support (x=76..96) by 98px, heels rise 14.6px into a calf raise, and primaryMuscles falls back to calves(primary:호흡).',
  },
};

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const { catalogMod, correctionsMod, svgMod, coverageMod } =
    await loadReadOnlyBaselineModules();
  const assets = catalogMod.MOVEMENT_VISUAL_ASSETS;
  const AssetComponent = svgMod.MovementPhaseDiagramSvg;
  const TriptychComponent = svgMod.MovementTriptychDiagramSvg;
  const corrections = correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;
  const coverageRecords = assets.map((a) =>
    coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );

  const contactReport = evaluateContactAccuracySuite({
    assets,
    AssetComponent,
    corrections,
    coverageRecords,
  });
  assert.equal(contactReport.allFiveDefectsPassed, true, 'D-01..D-05 must pass');
  assert.equal(contactReport.svgRenderIntegrity.passed, true, 'All 294 SVGs must pass');
  assert.equal(contactReport.truthfulnessBoundary.passed, true, 'Truthfulness boundary must pass');

  // Verify calves muscle fallback across all 98 exercises (non-calf / non-footwork exercises)
  const calfKeywords = ['종아리', '발목', '하체', '아킬레스', '발바닥'];
  const bogusCalfFallbackExercises = assets.filter((a) => {
    if (a.blockCategory === 'footwork') return false;
    const hasCalfHighlight = a.primaryMuscles.some((m) => m.muscleGroupId === 'calves');
    if (!hasCalfHighlight) return false;
    const matchedTargets = a.primaryMuscles
      .filter((m) => m.muscleGroupId === 'calves')
      .flatMap((m) => m.catalogMuscleMatches);
    return !matchedTargets.some((t) =>
      calfKeywords.some((kw) => t.includes(kw) || kw.includes(t)),
    );
  });
  assert.equal(
    bogusCalfFallbackExercises.length,
    0,
    `Expected 0 non-calf exercises with calves fallback, found: ${bogusCalfFallbackExercises.map((a) => a.exerciseId).join(', ')}`,
  );

  // Verify 4 pure breath exercises across 3 phases x 2 mirror orientations (24 SVG renders)
  const afterBreathMetrics = {};
  const breathRenderCardsHtml = [];

  for (const id of BREATH_EXERCISE_IDS) {
    const asset = catalogMod.getMovementVisualAsset(id);
    assert.ok(asset, `Missing breath asset ${id}`);
    assert.equal(asset.anatomicalAccuracyAssumed, false);

    const s = renderAndExtractPhaseGeometry(AssetComponent, asset, 'start', false);
    const m = renderAndExtractPhaseGeometry(AssetComponent, asset, 'middle', false);
    const e = renderAndExtractPhaseGeometry(AssetComponent, asset, 'end', false);
    const sMirror = renderAndExtractPhaseGeometry(AssetComponent, asset, 'start', true);
    const mMirror = renderAndExtractPhaseGeometry(AssetComponent, asset, 'middle', true);
    const eMirror = renderAndExtractPhaseGeometry(AssetComponent, asset, 'end', true);

    const handDeltaSm = dist2D(s.joints.hand, m.joints.hand);
    const handDeltaMe = dist2D(m.joints.hand, e.joints.hand);
    const heelDeltaSm = dist2D(s.joints.heel, m.joints.heel);
    const heelDeltaMe = dist2D(m.joints.heel, e.joints.heel);
    const thoracicDeltaSm = dist2D(s.joints.thoracic, m.joints.thoracic);
    const thoracicDeltaSe = dist2D(s.joints.thoracic, e.joints.thoracic);

    assert.equal(handDeltaSm, 0, `${id} hand must stay stationary (start->middle)`);
    assert.equal(handDeltaMe, 0, `${id} hand must stay stationary (middle->end)`);
    assert.equal(heelDeltaSm, 0, `${id} heel must stay stationary (start->middle)`);
    assert.equal(heelDeltaMe, 0, `${id} heel must stay stationary (middle->end)`);
    assert.ok(thoracicDeltaSm >= 6, `${id} thoracic breath delta must be >= 6px`);
    assert.ok(thoracicDeltaSe >= 3, `${id} thoracic end delta must be >= 3px`);

    for (const [phaseName, r, rMir] of [
      ['start', s, sMirror],
      ['middle', m, mMirror],
      ['end', e, eMirror],
    ]) {
      assert.equal(Object.keys(r.jointCircles).length, 7);
      assert.equal(Object.keys(rMir.jointCircles).length, 7);
      // Mirror symmetry: cx + cx_mirror === 320, cy === cy_mirror
      for (const jk of Object.keys(r.jointCircles)) {
        assert.equal(
          r.jointCircles[jk].x + rMir.jointCircles[jk].x,
          320,
          `${id} ${phaseName} ${jk} mirror X sum must equal 320`,
        );
        assert.equal(
          r.jointCircles[jk].y,
          rMir.jointCircles[jk].y,
          `${id} ${phaseName} ${jk} mirror Y must match`,
        );
      }
    }

    const triptychStandardMarkup = renderVNodeToMarkup(
      TriptychComponent({
        asset,
        activePhase: 'middle',
        mirrored: false,
        showMuscles: true,
        showDirection: true,
        showAlignment: true,
      }),
    );
    const triptychMirroredMarkup = renderVNodeToMarkup(
      TriptychComponent({
        asset,
        activePhase: 'middle',
        mirrored: true,
        showMuscles: true,
        showDirection: true,
        showAlignment: true,
      }),
    );

    const supportPathCount = (s.markup.match(/data-layer="apparatus-support"[\s\S]*?<\/g>/)?.[0]?.match(/<path /g) ?? []).length;

    afterBreathMetrics[id] = {
      exerciseId: id,
      nameKo: asset.nameKo,
      apparatus: asset.apparatus,
      archetypeId: asset.archetypeId,
      anatomicalAccuracyAssumed: asset.anatomicalAccuracyAssumed,
      springTensionLevel: s.phaseSpec.apparatusState.springTensionLevel,
      supportPathCount,
      pelvisStart: s.joints.pelvis,
      heelStart: s.joints.heel,
      handStart: s.joints.hand,
      thoracicTrajectory: [s.joints.thoracic, m.joints.thoracic, e.joints.thoracic],
      handDeltaSmPx: handDeltaSm,
      heelDeltaSmPx: heelDeltaSm,
      thoracicDeltaSmPx: thoracicDeltaSm,
      thoracicDeltaSePx: thoracicDeltaSe,
      primaryMuscles: asset.primaryMuscles.map(
        (x) => `${x.muscleGroupId}(${x.role}:${x.catalogMuscleMatches.join(',')})`,
      ),
      phaseSummariesKo: [
        s.phaseSpec.summaryKo,
        m.phaseSpec.summaryKo,
        e.phaseSpec.summaryKo,
      ],
      mirroredSymmetryVerified: true,
    };

    breathRenderCardsHtml.push(`
      <section class="breath-card" data-exercise-id="${id}">
        <div class="card-header">
          <h2>${asset.nameKo} (<code>${id}</code>) · <span>${asset.archetypeId}</span></h2>
          <div class="meta-badges">
            <span class="badge">기구: ${asset.apparatus.toUpperCase()}</span>
            <span class="badge">스프링 장력: ${s.phaseSpec.apparatusState.springTensionLevel}</span>
            <span class="badge">hand Δ: ${handDeltaSm}px · heel Δ: ${heelDeltaSm}px · thoracic Δ: ${thoracicDeltaSm}px</span>
            <span class="badge warn">해부학/전문가 실측 검증 미완 (anatomicalAccuracyAssumed: false)</span>
          </div>
        </div>
        <div class="phase-summaries">
          <div><strong>시작(지지):</strong> ${s.phaseSpec.summaryKo}</div>
          <div><strong>중간(들숨):</strong> ${m.phaseSpec.summaryKo}</div>
          <div><strong>끝(날숨):</strong> ${e.phaseSpec.summaryKo}</div>
        </div>
        <div class="triptych-pair">
          <div class="triptych-box" data-orientation="standard">
            <h3>기본 방향 (Standard · Start / Middle / End)</h3>
            ${triptychStandardMarkup}
          </div>
          <div class="triptych-box" data-orientation="mirrored">
            <h3>좌우 반전 (Mirrored · Start / Middle / End)</h3>
            ${triptychMirroredMarkup}
          </div>
        </div>
      </section>
    `);
  }

  // Launch lightweight local HTTP server with synthetic fixture HTML to verify 5 viewports in Chromium
  const htmlDoc = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Round 5 Pure Breath Observation Diagrams Verification</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; background: #f6f4ee; color: #1f2e28; }
    h1 { font-size: 1.15rem; margin: 0 0 8px; }
    .notice { font-size: 0.8rem; background: #fff6e5; border: 1px solid #e0b25b; padding: 8px 10px; border-radius: 8px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .breath-card { background: #fff; border: 1px solid #d5dfd9; border-radius: 10px; padding: 12px; overflow: hidden; }
    .card-header h2 { font-size: 0.98rem; margin: 0 0 6px; word-break: keep-all; }
    .meta-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .badge { font-size: 0.72rem; background: #e9f0ec; padding: 2px 7px; border-radius: 999px; }
    .badge.warn { background: #fbe9e7; color: #8c2d19; }
    .phase-summaries { font-size: 0.76rem; line-height: 1.45; background: #f8faf8; padding: 8px; border-radius: 6px; margin-bottom: 10px; display: grid; gap: 4px; }
    .triptych-pair { display: grid; grid-template-columns: 1fr; gap: 10px; }
    @media (min-width: 1024px) { .triptych-pair { grid-template-columns: 1fr 1fr; } }
    .triptych-box { border: 1px solid #e2e8e4; border-radius: 8px; padding: 8px; background: #fcfbfa; }
    .triptych-box h3 { font-size: 0.78rem; margin: 0 0 6px; color: #35584e; }
    svg { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <h1>순수 호흡 관찰 4종 도해 실제 렌더러 검증 (4 동작 × 3 위상 × 미러)</h1>
  <div class="notice">
    본 화면은 합성 검증 픽스처이며 2D 개략 도해입니다. 임상적·해부학적·전문가 정확성 검증은 완료되지 않았습니다 (<code>anatomicalAccuracyAssumed: false</code>, <code>expertVerificationCompleted: false</code>).
  </div>
  <main class="grid">
    ${breathRenderCardsHtml.join('\n')}
  </main>
</body>
</html>`;

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlDoc);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  const viewports = [
    { name: 'mobile-320', width: 320, height: 640, zoom: 1 },
    { name: 'mobile-390', width: 390, height: 844, zoom: 1 },
    { name: 'tablet-768', width: 768, height: 1024, zoom: 1 },
    { name: 'desktop-1440', width: 1440, height: 900, zoom: 1 },
    { name: 'desktop-1440-zoom200', width: 1440, height: 900, zoom: 2 },
  ];

  const viewportResults = [];
  const { puppeteer } = await import(THIRD_PARTY_URL);
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    for (const vp of viewports) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.zoom === 2 ? 2 : 1,
      });
      await page.goto(url, { waitUntil: 'networkidle0' });
      if (vp.zoom !== 1) {
        await page.evaluate((z) => {
          document.documentElement.style.zoom = String(z);
        }, vp.zoom);
      }
      const check = await page.evaluate(() => {
        const docEl = document.documentElement;
        const overflowPx = Math.max(0, docEl.scrollWidth - window.innerWidth);
        const svgCount = document.querySelectorAll('svg').length;
        const cardCount = document.querySelectorAll('.breath-card').length;
        return { overflowPx, svgCount, cardCount };
      });
      assert.equal(check.cardCount, 4, `${vp.name} must render 4 breath cards`);
      assert.equal(check.svgCount, 24, `${vp.name} must render 24 SVGs (4 exercises x 3 phases x 2 orientations)`);
      assert.equal(check.overflowPx, 0, `${vp.name} must have 0px horizontal overflow`);

      const shotPath = path.join(SCREENSHOTS_DIR, `round5-breath-${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      viewportResults.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        zoom: vp.zoom,
        cardCount: check.cardCount,
        svgCount: check.svgCount,
        horizontalOverflowPx: check.overflowPx,
        screenshot: `docs/breath-diagram-round5-20261107/screenshots/round5-breath-${vp.name}.png`,
      });

      if (vp.name === 'desktop-1440') {
        for (const id of BREATH_EXERCISE_IDS) {
          const el = await page.$(`[data-exercise-id="${id}"]`);
          const cardShot = path.join(SCREENSHOTS_DIR, `card-${id}.png`);
          if (el) {
            await el.screenshot({ path: cardShot });
          }
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  const evidencePayload = {
    auditId: 'breath-diagram-round5-20261107',
    verifiedAt: new Date().toISOString(),
    truthfulnessBoundary: {
      anatomicalAccuracyAssumed: false,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
      professionalReviewCount: 0,
    },
    beforeBaseline: BEFORE_BASELINE,
    afterVerification: afterBreathMetrics,
    regressionSummary: {
      totalExercises: assets.length,
      totalPhaseDiagrams: assets.length * 3,
      breathExercisesVerified: 4,
      breathPhaseMirrorSvgCount: 24,
      allFiveApparatusContactDefectsPassed: contactReport.allFiveDefectsPassed,
      bogusCalvesFallbackCount: bogusCalfFallbackExercises.length,
    },
    viewportResults,
  };

  const outJsonPath = path.join(EVIDENCE_DIR, 'round5-breath-metrics.json');
  fs.writeFileSync(outJsonPath, `${JSON.stringify(evidencePayload, null, 2)}\n`, 'utf8');
  console.log('ROUND 5 BREATH DIAGRAM VERIFICATION PASSED:', outJsonPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
