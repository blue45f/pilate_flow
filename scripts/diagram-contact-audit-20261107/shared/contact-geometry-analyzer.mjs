import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  renderVNodeToMarkup,
  queryVNodes,
} from './ts-loader-hooks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../..');

export async function loadReadOnlyBaselineModules() {
  const catalogUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/data/movementVisualRigCatalog.ts'),
  ).href;
  const correctionsUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/data/movementDiagramCorrections.ts'),
  ).href;
  const svgUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/components/MovementPhaseDiagramSvg.tsx'),
  ).href;
  const coverageUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionCoverage/adapters.ts'),
  ).href;
  const trackAUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionEvidenceReview/trackAMatEvidence.ts'),
  ).href;
  const trackBUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionEvidenceReview/trackBApparatusEvidence.ts'),
  ).href;
  const reviewTypesUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionEvidenceReview/types.ts'),
  ).href;

  const [
    catalogMod,
    correctionsMod,
    svgMod,
    coverageMod,
    trackAMod,
    trackBMod,
    reviewTypesMod,
  ] = await Promise.all([
    import(catalogUrl),
    import(correctionsUrl),
    import(svgUrl),
    import(coverageUrl),
    import(trackAUrl),
    import(trackBUrl),
    import(reviewTypesUrl),
  ]);

  return {
    catalogMod,
    correctionsMod,
    svgMod,
    coverageMod,
    trackAMod,
    trackBMod,
    reviewTypesMod,
  };
}

export function dist2D(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100) / 100;
}

function parseBarrelDomeBounds(pathD) {
  // Format: M x1 y1 C x2 y2 x3 y3 x4 y4 Z
  const nums = (String(pathD).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (nums.length < 8) {
    return { minX: 68, maxX: 174, minY: 102, maxY: 174 };
  }
  const xs = [nums[0], nums[2], nums[4], nums[6]];
  const ys = [nums[1], nums[3], nums[5], nums[7]];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function renderAndExtractPhaseGeometry(AssetComponent, asset, phaseId, mirrored = false) {
  const vnode = AssetComponent({
    asset,
    phase: phaseId,
    phaseId,
    mirrored,
    compact: false,
    showMuscles: true,
    showDirection: true,
    showAlignment: true,
  });
  const markup = renderVNodeToMarkup(vnode);
  const phaseSpec = asset.phases[phaseId];

  const apparatusGroup = queryVNodes(
    vnode,
    (n) => n.type === 'g' && n.props?.['data-layer'] === 'apparatus-support',
  )[0];

  const skeletalGroup = queryVNodes(
    vnode,
    (n) => n.type === 'g' && n.props?.['data-layer'] === 'kinematic-figure',
  )[0];

  const schematicShoulderConnection = skeletalGroup
    ? queryVNodes(
        skeletalGroup,
        (n) => n.type === 'path' && n.props?.['data-segment'] === 'schematic-shoulder-connection',
      )[0] ?? null
    : null;

  const jointCircles = {};
  const allKinematicCircles = skeletalGroup
    ? queryVNodes(skeletalGroup, (n) => n.type === 'circle')
    : [];
  if (skeletalGroup) {
    for (const c of queryVNodes(
      skeletalGroup,
      (n) => n.type === 'circle' && typeof n.props?.['data-joint-node'] === 'string',
    )) {
      jointCircles[c.props['data-joint-node']] = {
        x: Number(c.props.cx),
        y: Number(c.props.cy),
      };
    }
  }

  const apparatusGeometry = {
    kind: apparatusGroup?.props?.['data-apparatus-kind'] ?? asset.apparatus,
    carriageOffsetAttr:
      apparatusGroup?.props?.['data-carriage-offset'] !== undefined
        ? Number(apparatusGroup.props['data-carriage-offset'])
        : null,
    pedalAngleAttr:
      apparatusGroup?.props?.['data-pedal-angle'] !== undefined
        ? Number(apparatusGroup.props['data-pedal-angle'])
        : null,
  };

  if (asset.apparatus === 'reformer' && apparatusGroup) {
    const footbarLine = queryVNodes(
      apparatusGroup,
      (n) =>
        n.type === 'line' &&
        Number(n.props?.y1) === 156 &&
        Number(n.props?.y2) === 126,
    )[0];
    const carriageRect = queryVNodes(
      apparatusGroup,
      (n) => n.type === 'rect' && Number(n.props?.y) === 143,
    )[0];
    apparatusGeometry.footbar = footbarLine
      ? {
          base: { x: Number(footbarLine.props.x1), y: Number(footbarLine.props.y1) },
          top: { x: Number(footbarLine.props.x2), y: Number(footbarLine.props.y2) },
        }
      : null;
    apparatusGeometry.carriage = carriageRect
      ? {
          x: Number(carriageRect.props.x),
          y: Number(carriageRect.props.y),
          width: Number(carriageRect.props.width),
          height: Number(carriageRect.props.height),
        }
      : null;
  }

  if (asset.apparatus === 'cadillac' && apparatusGroup) {
    const lines = queryVNodes(apparatusGroup, (n) => n.type === 'line');
    const ptbLine = lines.find((l) => Number(l.props.y1) === 22 && Number(l.props.y2) !== 22 && Number(l.props.y2) !== 145);
    apparatusGeometry.pushThroughBar = ptbLine
      ? {
          pivot: { x: Number(ptbLine.props.x1), y: Number(ptbLine.props.y1) },
          barEnd: { x: Number(ptbLine.props.x2), y: Number(ptbLine.props.y2) },
        }
      : null;
  }

  if (asset.apparatus === 'chair' && apparatusGroup) {
    const seatRect = queryVNodes(
      apparatusGroup,
      (n) => n.type === 'rect' && n.props?.['data-chair-seat'] === 'fixed',
    )[0];
    const pedalLine = queryVNodes(
      apparatusGroup,
      (n) => n.type === 'line' && n.props?.['data-chair-pedal'] === 'hinged',
    )[0];
    apparatusGeometry.seat = seatRect
      ? {
          x: Number(seatRect.props.x),
          y: Number(seatRect.props.y),
          width: Number(seatRect.props.width),
          height: Number(seatRect.props.height),
        }
      : null;
    apparatusGeometry.pedal = pedalLine
      ? {
          hinge: { x: Number(pedalLine.props.x1), y: Number(pedalLine.props.y1) },
          pedalTip: { x: Number(pedalLine.props.x2), y: Number(pedalLine.props.y2) },
        }
      : null;
  }

  if (asset.apparatus === 'barrel' && apparatusGroup) {
    const domePath = queryVNodes(apparatusGroup, (n) => n.type === 'path')[0];
    const lines = queryVNodes(apparatusGroup, (n) => n.type === 'line');
    const uprights = lines.filter(
      (l) => Number(l.props.x1) === Number(l.props.x2) && Number(l.props.y2) === 176,
    );
    const uprightXs = uprights.map((u) => Number(u.props.x1));
    apparatusGeometry.dome = domePath ? parseBarrelDomeBounds(domePath.props.d) : null;
    apparatusGeometry.ladder =
      uprightXs.length >= 2
        ? {
            minX: Math.min(...uprightXs),
            maxX: Math.max(...uprightXs),
            minY: 46,
            maxY: 176,
          }
        : null;
  }

  return {
    vnode,
    markup,
    phaseSpec,
    joints: phaseSpec.joints,
    jointCircles,
    kinematicCircleCount: allKinematicCircles.length,
    schematicShoulderConnection,
    apparatusGeometry,
  };
}

export function evaluateContactAccuracySuite({
  assets,
  AssetComponent,
  corrections = [],
  coverageRecords = [],
}) {
  const assetById = new Map(assets.map((a) => [a.exerciseId, a]));

  // 1. R-01: Excluded already-resolved baseline items (Clam vs Open Book + showShoulderConnection)
  const clamAsset = assetById.get('original-mat-clam');
  const openBookAsset = assetById.get('original-mat-open-book');

  const clamKneeMove = dist2D(
    clamAsset.phases.start.joints.knee,
    clamAsset.phases.middle.joints.knee,
  );
  const clamHandLeak = dist2D(
    clamAsset.phases.start.joints.hand,
    clamAsset.phases.middle.joints.hand,
  );
  const clamThoracicLeak = dist2D(
    clamAsset.phases.start.joints.thoracic,
    clamAsset.phases.middle.joints.thoracic,
  );

  const openBookHandMove = dist2D(
    openBookAsset.phases.start.joints.hand,
    openBookAsset.phases.middle.joints.hand,
  );
  const openBookKneeLeak = dist2D(
    openBookAsset.phases.start.joints.knee,
    openBookAsset.phases.middle.joints.knee,
  );

  const clamStartRender = renderAndExtractPhaseGeometry(AssetComponent, clamAsset, 'start');
  const openBookMiddleRender = renderAndExtractPhaseGeometry(
    AssetComponent,
    openBookAsset,
    'middle',
  );
  const bridgeRender = renderAndExtractPhaseGeometry(
    AssetComponent,
    assetById.get('original-mat-bridge'),
    'middle',
  );
  const clamZeroLenShoulderLine = Boolean(bridgeRender.schematicShoulderConnection);
  const openBookShoulderBridgeRendered =
    Boolean(clamStartRender.schematicShoulderConnection) &&
    Boolean(openBookMiddleRender.schematicShoulderConnection);

  const r01ExcludedBaseline = {
    id: 'R-01',
    titleKo: '기해결 제외 항목: 매트 클램(Clam) · 오픈 북(Open Book) 교차 오염 분리 및 원근 어깨선 조건부 렌더링',
    status:
      clamAsset.archetypeId === 'mat-clam-isolated' &&
      openBookAsset.archetypeId === 'mat-open-book-isolated' &&
      clamKneeMove > 20 &&
      clamHandLeak === 0 &&
      clamThoracicLeak === 0 &&
      openBookHandMove > 100 &&
      openBookKneeLeak === 0 &&
      !clamZeroLenShoulderLine &&
      openBookShoulderBridgeRendered
        ? 'ALREADY_RESOLVED_ON_MAIN'
        : 'REGRESSED',
    metrics: {
      clamArchetypeId: clamAsset.archetypeId,
      openBookArchetypeId: openBookAsset.archetypeId,
      clamKneeMovePx: clamKneeMove,
      clamHandLeakPx: clamHandLeak,
      clamThoracicLeakPx: clamThoracicLeak,
      openBookHandMovePx: openBookHandMove,
      openBookKneeLeakPx: openBookKneeLeak,
      clamZeroLenShoulderLine,
      openBookShoulderBridgeRendered,
      correctionsCount: Object.keys(corrections).length,
    },
  };

  // 2. D-01: Frog end phase return contact & knee flexion
  const frogAsset = assetById.get('original-reformer-strap-frog');
  const frogStart = renderAndExtractPhaseGeometry(AssetComponent, frogAsset, 'start');
  const frogMiddle = renderAndExtractPhaseGeometry(AssetComponent, frogAsset, 'middle');
  const frogEnd = renderAndExtractPhaseGeometry(AssetComponent, frogAsset, 'end');

  const frogStartToEndAnkleDist = dist2D(frogStart.joints.ankle, frogEnd.joints.ankle);
  const frogStartToEndKneeDist = dist2D(frogStart.joints.knee, frogEnd.joints.knee);
  const frogEndAnkleDeltaY = frogEnd.joints.ankle.y - frogStart.joints.ankle.y;
  const d01Passed =
    frogStartToEndAnkleDist <= 6 &&
    frogStartToEndKneeDist <= 6 &&
    frogEnd.joints.knee.y >= 88 &&
    frogEnd.phaseSpec.apparatusState.carriageOffsetPx <= 8;

  const d01FrogEnd = {
    id: 'D-01',
    titleKo: '리포머 프로그(original-reformer-strap-frog) 끝 자세(end) 무릎 굴곡 복귀 누락 · 천장 다리 리프트 오적용',
    passed: d01Passed,
    exerciseId: 'original-reformer-strap-frog',
    archetypeId: frogAsset.archetypeId,
    metrics: {
      startKnee: frogStart.joints.knee,
      middleKnee: frogMiddle.joints.knee,
      endKnee: frogEnd.joints.knee,
      startAnkle: frogStart.joints.ankle,
      middleAnkle: frogMiddle.joints.ankle,
      endAnkle: frogEnd.joints.ankle,
      startToEndAnkleDistPx: frogStartToEndAnkleDist,
      startToEndKneeDistPx: frogStartToEndKneeDist,
      endAnkleDeltaYFromStartPx: frogEndAnkleDeltaY,
      carriageOffsets: [
        frogStart.phaseSpec.apparatusState.carriageOffsetPx,
        frogMiddle.phaseSpec.apparatusState.carriageOffsetPx,
        frogEnd.phaseSpec.apparatusState.carriageOffsetPx,
      ],
    },
  };

  // 3. D-02: Reformer plank hand/foot contact inversion + Chair plank hand/foot contact float
  const reformerPlankAsset = assetById.get('ex-plank-01');
  const rpStart = renderAndExtractPhaseGeometry(AssetComponent, reformerPlankAsset, 'start');
  const rpMiddle = renderAndExtractPhaseGeometry(AssetComponent, reformerPlankAsset, 'middle');
  const rpEnd = renderAndExtractPhaseGeometry(AssetComponent, reformerPlankAsset, 'end');

  const footbarTop = rpStart.apparatusGeometry.footbar.top;
  const rpHandToFootbarDist = Math.min(
    dist2D(rpStart.joints.hand, footbarTop),
    dist2D(rpStart.joints.wrist, footbarTop),
  );
  const rpAnkleOnCarriageStart =
    rpStart.joints.ankle.x >= rpStart.apparatusGeometry.carriage.x &&
    rpStart.joints.ankle.x <=
      rpStart.apparatusGeometry.carriage.x + rpStart.apparatusGeometry.carriage.width &&
    Math.abs(rpStart.joints.ankle.y - rpStart.apparatusGeometry.carriage.y) <= 8;
  const rpAnkleOnCarriageMiddle =
    rpMiddle.joints.ankle.x >= rpMiddle.apparatusGeometry.carriage.x &&
    rpMiddle.joints.ankle.x <=
      rpMiddle.apparatusGeometry.carriage.x + rpMiddle.apparatusGeometry.carriage.width &&
    Math.abs(rpMiddle.joints.ankle.y - rpMiddle.apparatusGeometry.carriage.y) <= 8;
  const rpHandOnFootbarSide = rpStart.joints.hand.x > rpStart.joints.ankle.x;

  const chairPlankIds = ['ex-plank-02', 'original-chair-incline-support', 'ex-kr-chair-01'];
  const chairPlankChecks = chairPlankIds.map((id) => {
    const asset = assetById.get(id);
    const s = renderAndExtractPhaseGeometry(AssetComponent, asset, 'start');
    const m = renderAndExtractPhaseGeometry(AssetComponent, asset, 'middle');
    const e = renderAndExtractPhaseGeometry(AssetComponent, asset, 'end');
    const seat = s.apparatusGeometry.seat;
    const seatTopY = seat.y;
    const handSeatVerticalGap = Math.abs(s.joints.hand.y - seatTopY);
    const handWithinSeatX =
      s.joints.hand.x >= seat.x - 4 && s.joints.hand.x <= seat.x + seat.width + 4;
    const startAnkleToPedalTipDist = dist2D(
      s.joints.ankle,
      s.apparatusGeometry.pedal.pedalTip,
    );
    const middleAnkleToPedalTipDist = dist2D(
      m.joints.ankle,
      m.apparatusGeometry.pedal.pedalTip,
    );
    const endAnkleToPedalTipDist = dist2D(
      e.joints.ankle,
      e.apparatusGeometry.pedal.pedalTip,
    );
    return {
      exerciseId: id,
      archetypeId: asset.archetypeId,
      hand: s.joints.hand,
      wrist: s.joints.wrist,
      seatTopY,
      seatRangeX: [seat.x, seat.x + seat.width],
      handSeatVerticalGapPx: handSeatVerticalGap,
      handWithinSeatX,
      startAnkle: s.joints.ankle,
      middleAnkle: m.joints.ankle,
      endAnkle: e.joints.ankle,
      startPedalTip: s.apparatusGeometry.pedal.pedalTip,
      middlePedalTip: m.apparatusGeometry.pedal.pedalTip,
      endPedalTip: e.apparatusGeometry.pedal.pedalTip,
      startAnkleToPedalTipDistPx: startAnkleToPedalTipDist,
      middleAnkleToPedalTipDistPx: middleAnkleToPedalTipDist,
      endAnkleToPedalTipDistPx: endAnkleToPedalTipDist,
      passed:
        handSeatVerticalGap <= 6 &&
        handWithinSeatX &&
        startAnkleToPedalTipDist <= 12 &&
        middleAnkleToPedalTipDist <= 12 &&
        endAnkleToPedalTipDist <= 12,
    };
  });

  const d02Passed =
    rpHandToFootbarDist <= 10 &&
    rpHandOnFootbarSide &&
    rpAnkleOnCarriageStart &&
    rpAnkleOnCarriageMiddle &&
    chairPlankChecks.every((c) => c.passed);

  const d02PlankContact = {
    id: 'D-02',
    titleKo: '리포머 플랭크(ex-plank-01) 손·발 기구 접점 좌우 반전 및 체어 플랭크 시트·페달 접점 이탈',
    passed: d02Passed,
    reformerPlank: {
      exerciseId: 'ex-plank-01',
      archetypeId: reformerPlankAsset.archetypeId,
      footbarTop,
      startHand: rpStart.joints.hand,
      startWrist: rpStart.joints.wrist,
      startAnkle: rpStart.joints.ankle,
      middleAnkle: rpMiddle.joints.ankle,
      endAnkle: rpEnd.joints.ankle,
      startCarriageRect: rpStart.apparatusGeometry.carriage,
      middleCarriageRect: rpMiddle.apparatusGeometry.carriage,
      handToFootbarDistPx: rpHandToFootbarDist,
      handOnFootbarSide: rpHandOnFootbarSide,
      ankleOnCarriageStart: rpAnkleOnCarriageStart,
      ankleOnCarriageMiddle: rpAnkleOnCarriageMiddle,
    },
    chairPlanks: chairPlankChecks,
  };

  // 4. D-03: Cadillac stationary table false carriageOffsetPx
  const cadillacAssets = assets.filter((a) => a.apparatus === 'cadillac');
  const cadillacDetails = cadillacAssets.map((a) => {
    const s = renderAndExtractPhaseGeometry(AssetComponent, a, 'start');
    const m = renderAndExtractPhaseGeometry(AssetComponent, a, 'middle');
    const e = renderAndExtractPhaseGeometry(AssetComponent, a, 'end');
    const offsets = [
      s.phaseSpec.apparatusState.carriageOffsetPx,
      m.phaseSpec.apparatusState.carriageOffsetPx,
      e.phaseSpec.apparatusState.carriageOffsetPx,
    ];
    const barEndShiftX =
      m.apparatusGeometry.pushThroughBar.barEnd.x -
      s.apparatusGeometry.pushThroughBar.barEnd.x;
    return {
      exerciseId: a.exerciseId,
      archetypeId: a.archetypeId,
      carriageOffsets: offsets,
      barEndStart: s.apparatusGeometry.pushThroughBar.barEnd,
      barEndMiddle: m.apparatusGeometry.pushThroughBar.barEnd,
      barEndShiftXPx: barEndShiftX,
      hasNonZeroCarriageOffset: offsets.some((v) => v !== 0),
    };
  });
  const nonZeroCadillacExercises = cadillacDetails.filter((d) => d.hasNonZeroCarriageOffset);
  const d03Passed = nonZeroCadillacExercises.length === 0;

  const d03CadillacCarriage = {
    id: 'D-03',
    titleKo: '캐딜락(Cadillac) 고정 베드 기구에 비정상 캐리지 활주(carriageOffsetPx > 0) 오적용 (18개 중 15개)',
    passed: d03Passed,
    totalCadillacExercises: cadillacAssets.length,
    nonZeroCadillacCount: nonZeroCadillacExercises.length,
    nonZeroCadillacExerciseIds: nonZeroCadillacExercises.map((d) => d.exerciseId),
    sampleDetails: cadillacDetails.slice(0, 6),
  };

  // 5. D-04: Chair pedal angular direction inversion (pedal goes up when foot presses down)
  const chairPedalFootworkIds = [
    'original-chair-seated-pedal-press',
    'original-chair-alternating-pedal',
    'ex-footwork-03',
  ];
  const chairPedalChecks = chairPedalFootworkIds.map((id) => {
    const asset = assetById.get(id);
    const s = renderAndExtractPhaseGeometry(AssetComponent, asset, 'start');
    const m = renderAndExtractPhaseGeometry(AssetComponent, asset, 'middle');
    const e = renderAndExtractPhaseGeometry(AssetComponent, asset, 'end');

    const footDeltaY = m.joints.ankle.y - s.joints.ankle.y;
    const pedalTipDeltaY =
      Math.round((m.apparatusGeometry.pedal.pedalTip.y - s.apparatusGeometry.pedal.pedalTip.y) * 10) /
      10;
    const middleAnkleToPedalTipVerticalGap =
      Math.round(Math.abs(m.joints.ankle.y - m.apparatusGeometry.pedal.pedalTip.y) * 10) / 10;
    const middleHeelToPedalTipVerticalGap =
      Math.round(Math.abs(m.joints.heel.y - m.apparatusGeometry.pedal.pedalTip.y) * 10) / 10;
    const middleAnkleToPedalTipDist = dist2D(
      m.joints.ankle,
      m.apparatusGeometry.pedal.pedalTip,
    );
    const sameDirection = Math.sign(footDeltaY) === Math.sign(pedalTipDeltaY) && pedalTipDeltaY > 0;

    return {
      exerciseId: id,
      archetypeId: asset.archetypeId,
      pedalAngles: [
        s.phaseSpec.apparatusState.pedalAngleDeg,
        m.phaseSpec.apparatusState.pedalAngleDeg,
        e.phaseSpec.apparatusState.pedalAngleDeg,
      ],
      startAnkle: s.joints.ankle,
      middleAnkle: m.joints.ankle,
      endAnkle: e.joints.ankle,
      startHeel: s.joints.heel,
      middleHeel: m.joints.heel,
      startPedalTip: s.apparatusGeometry.pedal.pedalTip,
      middlePedalTip: m.apparatusGeometry.pedal.pedalTip,
      endPedalTip: e.apparatusGeometry.pedal.pedalTip,
      footDeltaYPx: footDeltaY,
      pedalTipDeltaYPx: pedalTipDeltaY,
      sameDirection,
      middleAnkleToPedalTipVerticalGapPx: middleAnkleToPedalTipVerticalGap,
      middleHeelToPedalTipVerticalGapPx: middleHeelToPedalTipVerticalGap,
      middleAnkleToPedalTipDistPx: middleAnkleToPedalTipDist,
      passed:
        sameDirection &&
        middleAnkleToPedalTipVerticalGap <= 8 &&
        middleAnkleToPedalTipDist <= 10,
    };
  });

  const d04Passed = chairPedalChecks.every((c) => c.passed);

  const d04ChairPedal = {
    id: 'D-04',
    titleKo: '운다 체어(Chair) 페달 하방 프레스 시 페달 팁이 반대(상방)로 회전하여 발-페달 50px 분리 발생',
    passed: d04Passed,
    checks: chairPedalChecks,
  };

  // 6. D-05: Barrel standing dome & ladder penetration + hand air-grab
  const barrelStandingIds = assets
    .filter((a) => a.apparatus === 'barrel' && a.bodyPosition === 'standing')
    .map((a) => a.exerciseId);

  const barrelStandingChecks = barrelStandingIds.map((id) => {
    const asset = assetById.get(id);
    const s = renderAndExtractPhaseGeometry(AssetComponent, asset, 'start');
    const m = renderAndExtractPhaseGeometry(AssetComponent, asset, 'middle');
    const e = renderAndExtractPhaseGeometry(AssetComponent, asset, 'end');

    const dome = m.apparatusGeometry.dome;
    const ladder = m.apparatusGeometry.ladder;

    const lowerJointKeys = [
      'pelvis',
      'hip',
      'knee',
      'ankle',
      'heel',
      'toe',
      'farKnee',
      'farAnkle',
      'farToe',
    ];

    const penetratingDomeJoints = [];
    for (const [phaseName, phaseRender] of [
      ['start', s],
      ['middle', m],
      ['end', e],
    ]) {
      for (const jk of lowerJointKeys) {
        const ptVal = phaseRender.joints[jk];
        if (!ptVal) continue;
        if (
          ptVal.x > dome.minX + 4 &&
          ptVal.x < dome.maxX - 4 &&
          ptVal.y > dome.minY + 6
        ) {
          penetratingDomeJoints.push({ phase: phaseName, joint: jk, point: ptVal });
        }
      }
    }

    // Check if leg segment (hip -> knee or knee -> ankle) crosses ladder [minX, maxX]
    const ladderCrossings = [];
    for (const [phaseName, phaseRender] of [
      ['start', s],
      ['middle', m],
      ['end', e],
    ]) {
      const segs = [
        ['hip', 'knee', phaseRender.joints.hip, phaseRender.joints.knee],
        ['knee', 'ankle', phaseRender.joints.knee, phaseRender.joints.ankle],
      ];
      for (const [j1, j2, p1, p2] of segs) {
        const minSegX = Math.min(p1.x, p2.x);
        const maxSegX = Math.max(p1.x, p2.x);
        const overlapsLadderX =
          minSegX <= ladder.maxX - 2 && maxSegX >= ladder.minX + 2;
        if (overlapsLadderX) {
          ladderCrossings.push({
            phase: phaseName,
            segment: `${j1}->${j2}`,
            from: p1,
            to: p2,
            ladderRangeX: [ladder.minX, ladder.maxX],
          });
        }
      }
    }

    const isScooterHipExt =
      id === 'original-barrel-standing-hip-extension' ||
      id === 'original-barrel-standing-side-reach';

    const handDistToLadderStart =
      s.joints.hand.x < ladder.minX
        ? ladder.minX - s.joints.hand.x
        : s.joints.hand.x > ladder.maxX
          ? s.joints.hand.x - ladder.maxX
          : 0;
    const handDistToLadderMiddle =
      m.joints.hand.x < ladder.minX
        ? ladder.minX - m.joints.hand.x
        : m.joints.hand.x > ladder.maxX
          ? m.joints.hand.x - ladder.maxX
          : 0;

    const handContactPassed = isScooterHipExt
      ? handDistToLadderStart <= 8 && handDistToLadderMiddle <= 8
      : true;

    return {
      exerciseId: id,
      archetypeId: asset.archetypeId,
      domeBounds: dome,
      ladderBounds: ladder,
      startHand: s.joints.hand,
      middleHand: m.joints.hand,
      middleKnee: m.joints.knee,
      middleAnkle: m.joints.ankle,
      middleFarAnkle: m.joints.farAnkle,
      penetratingDomeJointCount: penetratingDomeJoints.length,
      penetratingDomeJoints: penetratingDomeJoints.slice(0, 6),
      ladderCrossingCount: ladderCrossings.length,
      ladderCrossings,
      handDistToLadderStartPx: handDistToLadderStart,
      handDistToLadderMiddlePx: handDistToLadderMiddle,
      passed:
        penetratingDomeJoints.length === 0 &&
        ladderCrossings.length === 0 &&
        handContactPassed,
    };
  });

  // Also verify non-standing barrel exercises remain on the barrel dome/ladder without regression
  const barrelNonStandingAssets = assets.filter(
    (a) => a.apparatus === 'barrel' && a.bodyPosition !== 'standing',
  );
  const barrelNonStandingRenderOk = barrelNonStandingAssets.every((a) => {
    const r = renderAndExtractPhaseGeometry(AssetComponent, a, 'middle');
    return (
      r.apparatusGeometry.dome.minX === 68 &&
      r.apparatusGeometry.dome.maxX === 174 &&
      r.apparatusGeometry.ladder.minX === 222 &&
      r.apparatusGeometry.ladder.maxX === 256
    );
  });

  const d05Passed =
    barrelStandingChecks.every((c) => c.passed) && barrelNonStandingRenderOk;

  const d05BarrelPenetration = {
    id: 'D-05',
    titleKo: '래더 배럴 스탠딩(original-barrel-standing-hip-extension 외) 돔 내부 하지 관통 · 래더 렁 허공 파지 · 사다리 프레임 관통',
    passed: d05Passed,
    standingBarrelCount: barrelStandingChecks.length,
    nonStandingBarrelPreserved: barrelNonStandingRenderOk,
    checks: barrelStandingChecks,
  };

  // 7. Full 294 SVG render integrity & truthfulness check
  let renderedSvgCount = 0;
  let invalidSvgCount = 0;
  for (const asset of assets) {
    for (const phaseId of ['start', 'middle', 'end']) {
      const r = renderAndExtractPhaseGeometry(AssetComponent, asset, phaseId);
      if (
        r.markup.startsWith('<svg') &&
        r.markup.includes('viewBox="0 0 320 200"') &&
        r.kinematicCircleCount === 12 &&
        Object.keys(r.jointCircles).length === 7
      ) {
        renderedSvgCount += 1;
      } else {
        invalidSvgCount += 1;
      }
    }
  }

  const assetTruthfulnessViolations = assets.filter(
    (a) => a.anatomicalAccuracyAssumed !== false,
  );
  const coverageTruthfulnessViolations = coverageRecords.filter(
    (rec) =>
      rec.anatomicalVerificationCompleted !== false ||
      rec.expertVerificationCompleted !== false ||
      rec.canonicalContinuousReady !== false ||
      rec.manualReady !== false ||
      rec.true3dSupported !== false,
  );
  const truthfulnessViolations = [
    ...assetTruthfulnessViolations,
    ...coverageTruthfulnessViolations,
  ];

  return {
    r01ExcludedBaseline,
    defects: {
      D01: d01FrogEnd,
      D02: d02PlankContact,
      D03: d03CadillacCarriage,
      D04: d04ChairPedal,
      D05: d05BarrelPenetration,
    },
    allFiveDefectsPassed:
      d01Passed && d02Passed && d03Passed && d04Passed && d05Passed,
    svgRenderIntegrity: {
      expectedSvgCount: assets.length * 3,
      renderedSvgCount,
      invalidSvgCount,
      passed: renderedSvgCount === 294 && invalidSvgCount === 0,
    },
    truthfulnessBoundary: {
      coverageRecordCount: coverageRecords.length,
      violationCount: truthfulnessViolations.length,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
      passed:
        coverageRecords.length === 98 && truthfulnessViolations.length === 0,
    },
  };
}
