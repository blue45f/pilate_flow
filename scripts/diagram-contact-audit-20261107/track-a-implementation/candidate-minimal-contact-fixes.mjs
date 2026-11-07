import {
  loadReadOnlyBaselineModules,
} from '../shared/contact-geometry-analyzer.mjs';
import { queryVNodes } from '../shared/ts-loader-hooks.mjs';

function cloneWithUpdates(obj, updates) {
  return Object.freeze({ ...obj, ...updates });
}

/**
 * Reconstructs the pre-fix (338e7bd) asset state for historical before-vs-after comparison,
 * while keeping `realAppAssets` / `candidateAssets` strictly identical (`Object.is`) to the
 * live app's `MOVEMENT_VISUAL_ASSETS` exported from `src/data/movementVisualRigCatalog.ts`.
 */
export function reconstructPreFix338e7bdAsset(asset, allRealAssets) {
  // D-01 pre-fix: original-reformer-strap-frog shared supine-feet-in-straps (same as ex-straps-01)
  if (asset.exerciseId === 'original-reformer-strap-frog') {
    const legCircles = allRealAssets.find((a) => a.archetypeId === 'supine-feet-in-straps');
    return cloneWithUpdates(asset, {
      archetypeId: 'supine-feet-in-straps',
      phases: cloneWithUpdates(asset.phases, {
        end: cloneWithUpdates(asset.phases.end, {
          joints: legCircles.phases.end.joints,
          apparatusState: cloneWithUpdates(asset.phases.end.apparatusState, {
            carriageOffsetPx: 12,
          }),
        }),
      }),
    });
  }

  // D-02A / D-02B pre-fix: ex-plank-01, ex-plank-02, original-chair-incline-support, ex-kr-chair-01
  // shared plank-long-stretch-chair-pike
  if (
    asset.exerciseId === 'ex-plank-01' ||
    asset.exerciseId === 'ex-plank-02' ||
    asset.exerciseId === 'original-chair-incline-support' ||
    asset.exerciseId === 'ex-kr-chair-01'
  ) {
    const matPlank = allRealAssets.find(
      (a) => a.archetypeId === 'plank-long-stretch-chair-pike',
    );
    const isReformer = asset.apparatus === 'reformer';
    const isChair = asset.apparatus === 'chair';
    return cloneWithUpdates(asset, {
      archetypeId: 'plank-long-stretch-chair-pike',
      phases: Object.freeze({
        start: cloneWithUpdates(asset.phases.start, {
          joints: matPlank.phases.start.joints,
          apparatusState: cloneWithUpdates(asset.phases.start.apparatusState, {
            carriageOffsetPx: isReformer ? 18 : 0,
            pedalAngleDeg: isChair ? 28 : 0,
          }),
        }),
        middle: cloneWithUpdates(asset.phases.middle, {
          joints: matPlank.phases.middle.joints,
          apparatusState: cloneWithUpdates(asset.phases.middle.apparatusState, {
            carriageOffsetPx: isReformer ? 2 : 0,
            pedalAngleDeg: isChair ? 6 : 0,
          }),
        }),
        end: cloneWithUpdates(asset.phases.end, {
          joints: matPlank.phases.end.joints,
          apparatusState: cloneWithUpdates(asset.phases.end.apparatusState, {
            carriageOffsetPx: isReformer ? 26 : 0,
            pedalAngleDeg: isChair ? 30 : 0,
          }),
        }),
      }),
    });
  }

  // D-03 pre-fix: Cadillac had non-zero carriageOffsetPx on 15 of 18 exercises
  if (asset.apparatus === 'cadillac') {
    const nonZeroThreeApparatusArchetypes = new Set([
      'standing-roll-down-centering',
      'lateral-mermaid-side-bend',
      'chair-seated-pedal-footwork',
    ]);
    const offsets = nonZeroThreeApparatusArchetypes.has(asset.archetypeId)
      ? [0, 0, 0]
      : [4, 24, 8];
    return cloneWithUpdates(asset, {
      phases: Object.freeze({
        start: cloneWithUpdates(asset.phases.start, {
          apparatusState: cloneWithUpdates(asset.phases.start.apparatusState, {
            carriageOffsetPx: offsets[0],
          }),
        }),
        middle: cloneWithUpdates(asset.phases.middle, {
          apparatusState: cloneWithUpdates(asset.phases.middle.apparatusState, {
            carriageOffsetPx: offsets[1],
          }),
        }),
        end: cloneWithUpdates(asset.phases.end, {
          apparatusState: cloneWithUpdates(asset.phases.end.apparatusState, {
            carriageOffsetPx: offsets[2],
          }),
        }),
      }),
    });
  }

  // D-05 pre-fix: original-barrel-standing-hip-extension & original-barrel-standing-side-reach
  // shared standing-scooter-lunge-splits
  if (
    asset.exerciseId === 'original-barrel-standing-hip-extension' ||
    asset.exerciseId === 'original-barrel-standing-side-reach'
  ) {
    const scooter = allRealAssets.find(
      (a) => a.archetypeId === 'standing-scooter-lunge-splits',
    );
    return cloneWithUpdates(asset, {
      archetypeId: 'standing-scooter-lunge-splits',
      phases: Object.freeze({
        start: cloneWithUpdates(asset.phases.start, {
          joints: scooter.phases.start.joints,
        }),
        middle: cloneWithUpdates(asset.phases.middle, {
          joints: scooter.phases.middle.joints,
        }),
        end: cloneWithUpdates(asset.phases.end, {
          joints: scooter.phases.end.joints,
        }),
      }),
    });
  }

  return asset;
}

/**
 * Reconstructs the pre-fix (338e7bd) SVG apparatus geometry for D-04 (Chair pedal)
 * and D-05 (Barrel standing dome/ladder) ONLY for historical before-vs-after comparison.
 * The real app's `MovementPhaseDiagramSvg` is used directly without any wrapper for all
 * real-app / candidate evaluations.
 */
export function createPreFix338e7bdMovementPhaseDiagramSvg(RealAppMovementPhaseDiagramSvg) {
  return function PreFixBaselineMovementPhaseDiagramSvg(props) {
    const vnode = RealAppMovementPhaseDiagramSvg(props);
    const { asset, phase, phaseId, mirrored = false } = props;
    const resolvedPhase = phase ?? phaseId ?? 'middle';
    const phaseSpec = asset.phases[resolvedPhase];
    const apparatusState = phaseSpec.apparatusState;
    const mx = (x) => (mirrored ? 320 - x : x);
    const p = (x, y) => ({ x: mx(x), y });

    if (asset.apparatus === 'chair') {
      const apparatusGroup = queryVNodes(
        vnode,
        (n) => n.type === 'g' && n.props?.['data-layer'] === 'apparatus-support',
      )[0];
      if (apparatusGroup) {
        const hinge = p(188, 164);
        const angleRad = ((24 + apparatusState.pedalAngleDeg * 0.75) * Math.PI) / 180;
        const dirSign = mirrored ? -1 : 1;
        const pedalTip = {
          x: Math.round((hinge.x + dirSign * Math.cos(angleRad) * 54) * 10) / 10,
          y: Math.round((hinge.y - Math.sin(angleRad) * 54) * 10) / 10,
        };
        for (const child of apparatusGroup.children) {
          if (!child || typeof child !== 'object') continue;
          if (child.type === 'line' && child.props?.['data-chair-pedal'] === 'hinged') {
            child.props = {
              ...child.props,
              x1: hinge.x,
              y1: hinge.y,
              x2: pedalTip.x,
              y2: pedalTip.y,
            };
          } else if (child.type === 'circle' && Number(child.props?.r) === 3.2) {
            child.props = { ...child.props, cx: hinge.x, cy: hinge.y };
          } else if (child.type === 'circle' && Number(child.props?.r) === 4) {
            child.props = { ...child.props, cx: pedalTip.x, cy: pedalTip.y };
          }
        }
      }
    }

    if (asset.apparatus === 'barrel' && asset.bodyPosition === 'standing') {
      const apparatusGroup = queryVNodes(
        vnode,
        (n) => n.type === 'g' && n.props?.['data-layer'] === 'apparatus-support',
      )[0];
      if (apparatusGroup) {
        const arcLeft = p(68, 174);
        const arcPeak1 = p(76, 102);
        const arcPeak2 = p(164, 102);
        const arcRight = p(174, 174);
        const ladderFrontX = mx(222);
        const ladderBackX = mx(256);

        let uprightIdx = 0;
        for (const child of apparatusGroup.children) {
          if (!child || typeof child !== 'object') continue;
          if (child.type === 'path') {
            child.props = {
              ...child.props,
              d: `M ${arcLeft.x} ${arcLeft.y} C ${arcPeak1.x} ${arcPeak1.y} ${arcPeak2.x} ${arcPeak2.y} ${arcRight.x} ${arcRight.y} Z`,
            };
          } else if (child.type === 'line') {
            const y1 = Number(child.props.y1);
            const y2 = Number(child.props.y2);
            if (y1 === 174 && y2 === 174) {
              child.props = { ...child.props, x1: arcLeft.x, x2: ladderBackX };
            } else if (y2 === 176 && (y1 === 56 || y1 === 46)) {
              const ux = uprightIdx === 0 ? ladderFrontX : ladderBackX;
              uprightIdx += 1;
              child.props = { ...child.props, x1: ux, x2: ux };
            } else if ([66, 88, 110, 132, 154].includes(y1)) {
              child.props = { ...child.props, x1: ladderFrontX, x2: ladderBackX };
            }
          }
        }
      }
    }

    return vnode;
  };
}

export async function loadCandidateContactFixSuite() {
  const realMods = await loadReadOnlyBaselineModules();
  // Real app exports directly from src/data/movementVisualRigCatalog.ts & src/components/MovementPhaseDiagramSvg.tsx
  const realAppAssets = realMods.catalogMod.MOVEMENT_VISUAL_ASSETS;
  const RealAppMovementPhaseDiagramSvg = realMods.svgMod.MovementPhaseDiagramSvg;
  const RealAppMovementTriptychDiagramSvg = realMods.svgMod.MovementTriptychDiagramSvg;

  // Pre-fix 338e7bd baseline reconstructed for historical before-vs-after diff comparison
  const baselineAssets = Object.freeze(
    realAppAssets.map((asset) => reconstructPreFix338e7bdAsset(asset, realAppAssets)),
  );
  const BaselineMovementPhaseDiagramSvg = createPreFix338e7bdMovementPhaseDiagramSvg(
    RealAppMovementPhaseDiagramSvg,
  );

  return {
    ...realMods,
    realAppAssets,
    RealAppMovementPhaseDiagramSvg,
    RealAppMovementTriptychDiagramSvg,
    baselineAssets,
    candidateAssets: realAppAssets,
    BaselineMovementPhaseDiagramSvg,
    CandidateMovementPhaseDiagramSvg: RealAppMovementPhaseDiagramSvg,
  };
}
