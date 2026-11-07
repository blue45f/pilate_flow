import {
  loadReadOnlyBaselineModules,
} from '../shared/contact-geometry-analyzer.mjs';
import { queryVNodes } from '../shared/ts-loader-hooks.mjs';

const pt = (x, y) => Object.freeze({ x, y });

function cloneWithUpdates(obj, updates) {
  return Object.freeze({ ...obj, ...updates });
}

function makeFixedAnchorsForJoints(fixedAnchorTemplates, joints) {
  return Object.freeze(
    fixedAnchorTemplates.map((anchor) =>
      Object.freeze({
        joint: anchor.joint,
        surfaceKo: anchor.surfaceKo,
        point: joints[anchor.joint] ?? joints.pelvis,
      }),
    ),
  );
}

/**
 * Applies the minimal candidate rig-catalog fixes (D-01, D-02, D-03, D-05 hand contact)
 * to a read-only CatalogMovementVisualAsset without mutating the source object.
 */
export function applyCandidateMinimalRigFixToAsset(asset) {
  let updated = asset;

  // D-03: Cadillac is a stationary table with tower/canopy, never a sliding carriage.
  if (updated.apparatus === 'cadillac') {
    const fixCadillacPhase = (phase) =>
      cloneWithUpdates(phase, {
        apparatusState: cloneWithUpdates(phase.apparatusState, {
          carriageOffsetPx: 0,
        }),
      });
    updated = cloneWithUpdates(updated, {
      phases: Object.freeze({
        start: fixCadillacPhase(updated.phases.start),
        middle: fixCadillacPhase(updated.phases.middle),
        end: fixCadillacPhase(updated.phases.end),
      }),
    });
  }

  // D-01: Reformer Strap Frog ('original-reformer-strap-frog') end phase must bend knees back
  // to the flexed Frog start position rather than lifting extended legs to the ceiling.
  if (updated.exerciseId === 'original-reformer-strap-frog') {
    const startJoints = updated.phases.start.joints;
    const middleJoints = updated.phases.middle.joints;
    const endPhase = cloneWithUpdates(updated.phases.end, {
      shortTitleKo: '무릎 굴곡 제어 복귀 · 프로그 홈 자세',
      summaryKo:
        '뒤꿈치를 붙인 채 무릎을 다시 다이아몬드(프로그) 각도로 접으며 스프링 저항을 제어해 시작 위치로 돌아옵니다. (2D 개략 도해 · 임상 검증 완료 아님)',
      joints: startJoints,
      fixedAnchors: makeFixedAnchorsForJoints(
        updated.phases.start.fixedAnchors,
        startJoints,
      ),
      apparatusState: cloneWithUpdates(updated.phases.end.apparatusState, {
        carriageOffsetPx: updated.phases.start.apparatusState.carriageOffsetPx,
      }),
      alignments: updated.phases.start.alignments,
      directionVectors: Object.freeze([
        Object.freeze({
          id: 'vec-frog-return-bend',
          labelKo: '무릎 굴곡 제어 복귀 (프로그 홈)',
          kind: 'return-control',
          points: Object.freeze([middleJoints.ankle, startJoints.ankle]),
          phaseScope: 'middle-to-end',
        }),
      ]),
    });

    updated = cloneWithUpdates(updated, {
      archetypeId: 'reformer-strap-frog-isolated',
      archetypeTitleKo: '리포머 발 스트랩 프로그 · 무릎 굴곡-신전-굴곡 분리',
      phases: Object.freeze({
        ...updated.phases,
        end: endPhase,
      }),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '천골(pelvis)을 고정한 채 무릎(x:182→242)과 발목(x:214→284)이 45도 사선으로 길게 뻗어집니다.',
        middleToEndKo:
          '사선 신전 정점(x:284,y:80)에서 뒤꿈치를 붙인 채 무릎을 다시 접어 시작 프로그 위치(knee x:182,y:92 · ankle x:214,y:74)로 복귀합니다.',
        invariantAnchorsKo:
          '머리(head), 흉추(thoracic), 천골(pelvis)이 캐리지 위에 고정됩니다.',
        keyJointChangeKo:
          '프로그 신전(ankle Δ70px) → 무릎 굴곡 복귀(end=start) · 천장 리프트 오염 제거',
      }),
    });
  }

  // D-02 (Part 1): Reformer Long Stretch ('ex-plank-01')
  // Reformer footbar is rendered on the right (top: 266,126) and sliding carriage/shoulder rest on the left.
  if (updated.exerciseId === 'ex-plank-01') {
    const startJoints = Object.freeze({
      head: pt(246, 78),
      neck: pt(232, 84),
      shoulder: pt(218, 90),
      elbow: pt(240, 108),
      wrist: pt(262, 126),
      hand: pt(268, 126),
      thoracic: pt(186, 102),
      lumbar: pt(156, 112),
      pelvis: pt(132, 120),
      hip: pt(126, 122),
      knee: pt(102, 130),
      ankle: pt(80, 138),
      heel: pt(76, 134),
      toe: pt(84, 143),
      farShoulder: pt(214, 88),
      farElbow: pt(236, 106),
      farWrist: pt(258, 124),
      farKnee: pt(106, 128),
      farAnkle: pt(84, 136),
    });

    const middleJoints = Object.freeze({
      head: pt(258, 84),
      neck: pt(244, 90),
      shoulder: pt(230, 96),
      elbow: pt(246, 112),
      wrist: pt(262, 126),
      hand: pt(268, 126),
      thoracic: pt(200, 106),
      lumbar: pt(172, 116),
      pelvis: pt(152, 124),
      hip: pt(146, 126),
      knee: pt(128, 132),
      ankle: pt(114, 138),
      heel: pt(110, 134),
      toe: pt(118, 143),
      farShoulder: pt(226, 94),
      farElbow: pt(242, 110),
      farWrist: pt(258, 124),
      farKnee: pt(132, 130),
      farAnkle: pt(118, 136),
    });

    const endJoints = Object.freeze({
      ...startJoints,
      shoulder: pt(220, 90),
      pelvis: pt(134, 120),
      hip: pt(128, 122),
      knee: pt(104, 130),
      ankle: pt(82, 138),
      heel: pt(78, 134),
      toe: pt(86, 143),
    });

    const anchorTemplates = [
      { joint: 'wrist', surfaceKo: '리포머 우측 풋바(Footbar · 266,126) 손바닥·손목 지지점' },
      { joint: 'toe', surfaceKo: '리포머 좌측 캐리지·숄더레스트 발볼 지지점' },
    ];

    updated = cloneWithUpdates(updated, {
      archetypeId: 'reformer-plank-long-stretch-isolated',
      archetypeTitleKo: '리포머 롱 스트레치 플랭크 · 우측 풋바 손 지지 & 좌측 캐리지 발 지지',
      phases: Object.freeze({
        start: cloneWithUpdates(updated.phases.start, {
          joints: startJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, startJoints),
          apparatusState: cloneWithUpdates(updated.phases.start.apparatusState, {
            carriageOffsetPx: 6,
          }),
          alignments: Object.freeze([
            Object.freeze({
              id: 'reformer-plank-line-start',
              labelKo: '정수리-어깨-골반-발목 사선 플랭크 축 (풋바 손 지지)',
              cueKo: '손은 우측 풋바(266,126)를 밀어내고 발은 좌측 캐리지 위에서 몸통 일직선을 유지합니다.',
              kind: 'axis-line',
              from: startJoints.head,
              to: startJoints.ankle,
            }),
          ]),
          directionVectors: Object.freeze([
            Object.freeze({
              id: 'vec-reformer-plank-push',
              labelKo: '풋바 수직 푸시 & 전거근 지지',
              kind: 'axial-lengthening',
              points: Object.freeze([startJoints.wrist, startJoints.shoulder]),
              phaseScope: 'start',
            }),
          ]),
        }),
        middle: cloneWithUpdates(updated.phases.middle, {
          joints: middleJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, middleJoints),
          apparatusState: cloneWithUpdates(updated.phases.middle.apparatusState, {
            carriageOffsetPx: 36,
          }),
          alignments: Object.freeze([
            Object.freeze({
              id: 'reformer-plank-line-middle',
              labelKo: '캐리지 활주 중 몸통 일직선 유지',
              cueKo: '캐리지가 이동할 때도 허리가 처지지 않게 복부 긴장을 유지합니다.',
              kind: 'axis-line',
              from: middleJoints.head,
              to: middleJoints.ankle,
            }),
          ]),
          directionVectors: Object.freeze([
            Object.freeze({
              id: 'vec-reformer-plank-glide',
              labelKo: '캐리지 수평 활주 제어',
              kind: 'carriage-travel',
              points: Object.freeze([startJoints.ankle, middleJoints.ankle]),
              phaseScope: 'start-to-middle',
            }),
          ]),
        }),
        end: cloneWithUpdates(updated.phases.end, {
          joints: endJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, endJoints),
          apparatusState: cloneWithUpdates(updated.phases.end.apparatusState, {
            carriageOffsetPx: 10,
          }),
          alignments: Object.freeze([
            Object.freeze({
              id: 'reformer-plank-line-end',
              labelKo: '어깨-손목 수직 정렬 복귀',
              cueKo: '풋바 위 어깨 정렬로 흔들림 없이 복귀합니다.',
              kind: 'anchor-lock',
              from: endJoints.shoulder,
              to: endJoints.wrist,
            }),
          ]),
          directionVectors: Object.freeze([
            Object.freeze({
              id: 'vec-reformer-plank-return',
              labelKo: '풋바 기준 플랭크 정렬 복귀',
              kind: 'return-control',
              points: Object.freeze([middleJoints.ankle, endJoints.ankle]),
              phaseScope: 'middle-to-end',
            }),
          ]),
        }),
      }),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '손(wrist 262,126 · hand 268,126)은 우측 풋바 상단(266,126)에 고정된 채 좌측 캐리지 위의 발(ankle x:80→114)이 캐리지와 함께 수평 이동합니다.',
        middleToEndKo:
          '코어와 광배근 제어로 캐리지를 감속하며 플랭크 시작 정렬(ankle x:114→82)로 돌아옵니다.',
        invariantAnchorsKo:
          '우측 풋바 위 손목·손(262~268, 126) 고정 및 좌측 캐리지 위 발 접점 유지',
        keyJointChangeKo:
          '리포머 기구 방향과 일치하도록 손(풋바)·발(캐리지) 접점 좌우 반전 교정 (2D 개략 도해)',
      }),
    });
  }

  // D-02 (Part 2): Chair Plank / Pike ('ex-plank-02', 'original-chair-incline-support', 'ex-kr-chair-01')
  // Hands anchor on Chair padded seat top (x: 108..196, y: 106), feet ride on Chair pedal tip.
  if (
    updated.exerciseId === 'ex-plank-02' ||
    updated.exerciseId === 'original-chair-incline-support' ||
    updated.exerciseId === 'ex-kr-chair-01'
  ) {
    const startJoints = Object.freeze({
      head: pt(114, 52),
      neck: pt(124, 60),
      shoulder: pt(134, 68),
      elbow: pt(133, 88),
      wrist: pt(132, 106),
      hand: pt(124, 106),
      thoracic: pt(154, 84),
      lumbar: pt(170, 98),
      pelvis: pt(182, 110),
      hip: pt(186, 114),
      knee: pt(202, 136),
      ankle: pt(216, 156),
      heel: pt(222, 158),
      toe: pt(210, 160),
      farShoulder: pt(130, 66),
      farElbow: pt(129, 86),
      farWrist: pt(128, 104),
      farKnee: pt(198, 134),
      farAnkle: pt(212, 154),
    });

    const middleJoints = Object.freeze({
      head: pt(120, 66),
      neck: pt(126, 66),
      shoulder: pt(132, 64),
      elbow: pt(132, 86),
      wrist: pt(132, 106),
      hand: pt(124, 106),
      thoracic: pt(148, 52),
      lumbar: pt(162, 56),
      pelvis: pt(174, 64),
      hip: pt(178, 68),
      knee: pt(194, 102),
      ankle: pt(208, 134),
      heel: pt(214, 136),
      toe: pt(202, 138),
      farShoulder: pt(128, 62),
      farElbow: pt(128, 84),
      farWrist: pt(128, 104),
      farKnee: pt(190, 100),
      farAnkle: pt(204, 132),
    });

    const endJoints = Object.freeze({
      ...startJoints,
      pelvis: pt(182, 112),
      ankle: pt(216, 158),
      heel: pt(222, 160),
      toe: pt(210, 162),
    });

    const anchorTemplates = [
      { joint: 'wrist', surfaceKo: '체어 상단 패디드 시트(x:108~196, y:106) 손바닥·손목 지지점' },
      { joint: 'toe', surfaceKo: '체어 경첩 페달 팁(Pedal Tip) 발볼 접촉점' },
    ];

    updated = cloneWithUpdates(updated, {
      archetypeId: 'chair-plank-pike-isolated',
      archetypeTitleKo: '운다 체어 시트 손 지지 · 페달 발 지지 인클라인 플랭크 & 파이크',
      phases: Object.freeze({
        start: cloneWithUpdates(updated.phases.start, {
          joints: startJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, startJoints),
          alignments: Object.freeze([
            Object.freeze({
              id: 'chair-plank-seat-pedal-start',
              labelKo: '체어 시트 손 지지 & 페달 발볼 지지 사선 축',
              cueKo: '손목(132,106)은 체어 시트 상단에 수직 지지하고 발은 페달 팁 위에 둡니다.',
              kind: 'axis-line',
              from: startJoints.shoulder,
              to: startJoints.ankle,
            }),
          ]),
        }),
        middle: cloneWithUpdates(updated.phases.middle, {
          joints: middleJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, middleJoints),
          alignments: Object.freeze([
            Object.freeze({
              id: 'chair-plank-pike-middle',
              labelKo: '골반 상방 스쿱 & 페달 상승 동조',
              cueKo: '손은 시트 상단(y:106)을 밀어내고 골반과 페달을 함께 끌어올립니다.',
              kind: 'angle-arc',
              from: middleJoints.wrist,
              to: middleJoints.pelvis,
            }),
          ]),
        }),
        end: cloneWithUpdates(updated.phases.end, {
          joints: endJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, endJoints),
          alignments: Object.freeze([
            Object.freeze({
              id: 'chair-plank-return-end',
              labelKo: '시트-페달 사선 플랭크 제어 복귀',
              cueKo: '페달을 천천히 눌러 시작 사선 정렬로 복귀합니다.',
              kind: 'anchor-lock',
              from: endJoints.shoulder,
              to: endJoints.wrist,
            }),
          ]),
        }),
      }),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '체어 시트 상단(y:106)에 손목(132,106)·손(124,106)을 지지한 채 페달 상승(217.9,160.9→210.3,137.4)과 함께 발목(216,156→208,134)과 골반(y:110→64)이 올라갑니다.',
        middleToEndKo:
          '복부 편심성 제어로 페달을 다시 누르며 사선 플랭크(ankle 216,158)로 복귀합니다.',
        invariantAnchorsKo:
          '체어 패디드 시트 상단(y:106) 위 손·손목 지지점 고정 및 페달 팁 발 접점 동조',
        keyJointChangeKo:
          '체어 시트 허공 부유(Δ42px) 및 페달 이격 해소 · 시트(y:106) 및 페달 팁 접점 일치',
      }),
    });
  }

  // D-05: Standing Barrel Hip Extension / Side Reach ('original-barrel-standing-hip-extension', 'original-barrel-standing-side-reach')
  // Anchor hands on the ladder rung (x: 76..96, y: 76..80) while standing/working legs stay in x: 108..282 outside dome (18..70) & ladder (76..96).
  if (
    updated.exerciseId === 'original-barrel-standing-hip-extension' ||
    updated.exerciseId === 'original-barrel-standing-side-reach'
  ) {
    const patchBarrelStandingJoints = (joints) =>
      Object.freeze({
        ...joints,
        elbow: pt(116, 78),
        wrist: pt(96, 80),
        hand: pt(88, 76),
        farElbow: pt(114, 76),
        farWrist: pt(94, 78),
      });

    const startJoints = patchBarrelStandingJoints(updated.phases.start.joints);
    const middleJoints = patchBarrelStandingJoints(updated.phases.middle.joints);
    const endJoints = patchBarrelStandingJoints(updated.phases.end.joints);

    const anchorTemplates = [
      { joint: 'hand', surfaceKo: '래더 배럴 사다리 상단 가로대(Ladder Rung · x:76~96) 손 지지점' },
      { joint: 'farAnkle', surfaceKo: '배럴 사다리 앞 바닥 지지 다리(Standing Leg · x:124)' },
    ];

    updated = cloneWithUpdates(updated, {
      archetypeId: 'barrel-standing-hip-extension-isolated',
      archetypeTitleKo: '래더 배럴 스탠딩 힙 익스텐션 · 사다리 가로대 손 지지 & 후방 하지 신전',
      phases: Object.freeze({
        start: cloneWithUpdates(updated.phases.start, {
          joints: startJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, startJoints),
        }),
        middle: cloneWithUpdates(updated.phases.middle, {
          joints: middleJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, middleJoints),
        }),
        end: cloneWithUpdates(updated.phases.end, {
          joints: endJoints,
          fixedAnchors: makeFixedAnchorsForJoints(anchorTemplates, endJoints),
        }),
      }),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '배럴 사다리 가로대(x:76~96, y:76)를 양손(88,76)으로 잡고 지지 다리(farAnkle 124,174)를 사다리 앞 바닥에 세운 채 작동 다리(ankle x:214→278)를 뒤로 길게 뻗습니다.',
        middleToEndKo:
          '상체와 골반 높이를 유지한 채 뻗었던 다리를 사다리 앞 시작 위치(ankle 218,166)로 제어해 복귀합니다.',
        invariantAnchorsKo:
          '사다리 가로대 손 파지점(88,76) 및 사다리 외부 지지 다리(x:124) 고정 · 돔/사다리 관통 0건',
        keyJointChangeKo:
          '스탠딩 배럴 기구 배치(돔 x:18~70, 사다리 x:76~96) 및 손 가로대 접점 일치로 돔/사다리 관통 제거',
      }),
    });
  }

  return updated;
}

/**
 * Candidate wrapper around MovementPhaseDiagramSvg that patches:
 * - D-04: Chair pedal angular direction & hinge geometry so increasing pedalAngleDeg presses the pedal down with the foot
 * - D-05: Standing Barrel dome/ladder placement so standing lower-body and extending leg never penetrate the barrel dome or ladder uprights
 */
export function createCandidateMovementPhaseDiagramSvg(BaseMovementPhaseDiagramSvg) {
  return function CandidateMovementPhaseDiagramSvg(props) {
    const phaseKey = props.phase ?? props.phaseId;
    const vnode = BaseMovementPhaseDiagramSvg({ ...props, phase: phaseKey });
    const { asset, mirrored = false } = props;
    const phaseSpec = asset.phases[phaseKey];
    const { apparatusState } = phaseSpec;
    const mx = (x) => (mirrored ? Math.round((320 - x) * 10) / 10 : Math.round(x * 10) / 10);
    const p = (x, y) => ({ x: mx(x), y: Math.round(y * 10) / 10 });

    if (asset.apparatus === 'chair') {
      const apparatusGroup = queryVNodes(
        vnode,
        (n) => n.type === 'g' && n.props?.['data-layer'] === 'apparatus-support',
      )[0];
      if (apparatusGroup) {
        const hinge = p(168, 164);
        const angleRad = ((40 - apparatusState.pedalAngleDeg * 1.3) * Math.PI) / 180;
        const dirSign = mirrored ? -1 : 1;
        const pedalTip = {
          x: Math.round((hinge.x + dirSign * Math.cos(angleRad) * 50) * 10) / 10,
          y: Math.round((hinge.y - Math.sin(angleRad) * 50) * 10) / 10,
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
        const arcLeft = p(18, 174);
        const arcPeak1 = p(24, 106);
        const arcPeak2 = p(64, 106);
        const arcRight = p(70, 174);
        const ladderFrontX = mx(76);
        const ladderBackX = mx(96);

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
  const baseline = await loadReadOnlyBaselineModules();
  const baselineAssets = baseline.catalogMod.MOVEMENT_VISUAL_ASSETS;
  const candidateAssets = Object.freeze(
    baselineAssets.map((asset) => applyCandidateMinimalRigFixToAsset(asset)),
  );
  const CandidateMovementPhaseDiagramSvg = createCandidateMovementPhaseDiagramSvg(
    baseline.svgMod.MovementPhaseDiagramSvg,
  );
  return {
    ...baseline,
    baselineAssets,
    candidateAssets,
    BaselineMovementPhaseDiagramSvg: baseline.svgMod.MovementPhaseDiagramSvg,
    CandidateMovementPhaseDiagramSvg,
  };
}
