import { renderVNodeToMarkup } from "./ts-loader-hooks.mjs";
export const VIEWPORTS = [
  { id: 'mobile-320', width: 320, height: 850, zoom: 1, file: 'viewport-mobile-320x850.png' },
  { id: 'mobile-390', width: 390, height: 850, zoom: 1, file: 'viewport-mobile-390x850.png' },
  { id: 'tablet-768', width: 768, height: 1024, zoom: 1, file: 'viewport-tablet-768x1024.png' },
  { id: 'desktop-1440', width: 1440, height: 900, zoom: 1, file: 'viewport-desktop-1440x900.png' },
  {
    id: 'desktop-1440-zoom200',
    width: 1440,
    height: 900,
    zoom: 2,
    file: 'viewport-desktop-1440x900-zoom200.png',
  },
];
export const APPARATUS_SAMPLE_SPECS = [
  {
    apparatus: 'mat',
    apparatusLabelKo: '매트 (Mat)',
    mismatchIds: ['SM-03'],
    screenshotFile: 'apparatus-mat-sm03-sample.png',
    archetypeId: 'supine-breath-pelvic-clock',
    headlineKo:
      'SM-03 매트 표본: 「골반 시계」·「누워서 호흡 관찰」이 「폼롤러 암 서클」의 64.1px 오버헤드 팔 원 그리기 궤적(골반 Δ0px)을 100% 공유',
    compatibleExerciseId: 'ex-warmup-03',
    compatibleRoleKo: '의도적 기준 동작 (암 서클 & 흉추 가동)',
    mismatchedExercises: [
      {
        exerciseId: 'original-mat-pelvic-clock',
        issueKo:
          '큐: "양팔은 몸통 옆에 편안히 내려놓고 골반을 굴립니다" → 실제 도해: 골반(174,128) Δ0px 정지, 손(152,132→92,108) Δ64.1px 오버헤드 스윕',
      },
      {
        exerciseId: 'original-mat-rib-breath',
        issueKo:
          '큐: "양손을 갈비뼈 옆에 가볍게 얹습니다" → 실제 도해: 갈비뼈 지지 대신 손이 머리 위로 Δ64.1px 오버헤드 아크 이동',
      },
    ],
  },
  {
    apparatus: 'reformer',
    apparatusLabelKo: '리포머 (Reformer)',
    mismatchIds: ['SM-04'],
    screenshotFile: 'apparatus-reformer-sm04-sample.png',
    archetypeId: 'standing-scooter-lunge-splits',
    headlineKo:
      'SM-04 리포머 표본: 관상면 직립 양측 외전·내전인 「스탠딩 사이드 스플릿」이 시상면 단측 후방 차기인 「스탠딩 스쿠터(ankle Δ65.5px)」와 동일',
    compatibleExerciseId: 'ex-lower-01',
    compatibleRoleKo: '의도적 기준 동작 (단측 지지 후방 스쿠터 프레스)',
    mismatchedExercises: [
      {
        exerciseId: 'ex-lower-02',
        issueKo:
          '큐: "플랫폼과 캐리지 위에 11자로 나란히 서서 양다리를 옆으로 대칭되게 벌립니다" → 실제 도해: 상체 전방 힌지 + 한 다리 후상방 공중 킥(214,162→278,148)',
      },
    ],
  },
  {
    apparatus: 'cadillac',
    apparatusLabelKo: '캐딜락 (Cadillac)',
    mismatchIds: ['SM-05', 'SM-06'],
    screenshotFile: 'apparatus-cadillac-sm05-sm06-sample.png',
    archetypeId: 'kneeling-chest-expansion-triceps / seated-roll-back-spine-twist',
    headlineKo:
      'SM-05·SM-06 캐딜락 표본: 척추 분절 굴곡인 「캣 스트레치」가 수직 척추 고정(thoracic Δ2.8px) 「체스트 익스팬션」과 동일 & 「흉곽 회전」이 56.4px 후방 롤백과 동일',
    compatibleExerciseId: 'ex-upper-01',
    compatibleRoleKo: '의도적 기준 동작 (수직 척추 고정 + 스트랩 후방 당김 Δ118.3px)',
    mismatchedExercises: [
      {
        exerciseId: 'ex-warmup-02',
        issueKo:
          '큐: "정수리부터 경추-흉추-요추 순서로 분절하여 바를 아래로 밀어 내려갑니다(Cat Stretch)" → 실제 도해: 척추 수직 고정(Δ2.8px) + 팔만 골반 뒤(x:214→102)로 당김',
      },
      {
        exerciseId: 'original-cadillac-seated-rotation',
        issueKo:
          '큐: "좌골 위에서 척추를 길게 세우고 흉곽만 좌우 회전" → 실제 도해: 머리(142,38→92,64)가 뒤로 56.4px 눕는 C-커브 롤백',
      },
    ],
  },
  {
    apparatus: 'chair',
    apparatusLabelKo: '체어 (Chair)',
    mismatchIds: ['SM-01', 'SM-04', 'SM-08'],
    screenshotFile: 'apparatus-chair-sm01-sm08-sample.png',
    archetypeId: 'seated-row-arm-arc / chair-seated-pedal-footwork',
    headlineKo:
      'SM-01·SM-08 체어 표본: 「골반 록」이 골반 고정(Δ0px) + 80.5px 로잉/오버헤드 리치를 수행하고, 「니 리프트」가 무릎을 +34px 아래로 밟아 내림',
    compatibleExerciseId: 'original-chair-seated-arm-arc',
    compatibleRoleKo: '의도적 기준 동작 (시티드 암 아크 & 써브 어 트레이 Δ80.5px)',
    mismatchedExercises: [
      {
        exerciseId: 'original-chair-seated-pelvic-rock',
        issueKo:
          '큐: "양손은 허벅지에 두고 골반을 앞뒤로 굴립니다" → 실제 도해: 골반(132,138) Δ0px 정지, 손만 로잉/오버헤드 리치(Δ80.5px)',
      },
      {
        exerciseId: 'original-chair-seated-knee-lift',
        issueKo:
          '큐: "한쪽 무릎을 가볍게 위로 들어 올립니다(Knee Lift)" → 실제 도해: middle에서 무릎이 y:98→132로 34px 아래로 하강(페달 프레스 역방향)',
      },
    ],
  },
  {
    apparatus: 'barrel',
    apparatusLabelKo: '래더 바렐 (Ladder Barrel)',
    mismatchIds: ['SM-02', 'SM-07', 'SM-08'],
    screenshotFile: 'apparatus-barrel-sm02-sm07-sm08-sample.png',
    archetypeId: 'standing-ankle-calf-upper-reach / lateral-mermaid-side-bend',
    headlineKo:
      'SM-02·SM-07·SM-08 바렐 표본: 「래더 지지 발목」의 손이 기구를 놓고 허공 50.5px 상승하며, 「스탠딩/사이드라잉 사이드 벤드」가 바닥 Z-Sit으로 착석',
    compatibleExerciseId: 'original-barrel-supported-arm-reach',
    compatibleRoleKo: '의도적 기준 동작 (바렐 지지 상방 암 리치 Δ50.5px)',
    mismatchedExercises: [
      {
        exerciseId: 'original-barrel-supported-ankle',
        issueKo:
          '큐: "사다리 프레임을 가볍게 잡고 뒤꿈치를 들었다 내립니다" → 실제 도해: 손이 좌측 래더(x:88)를 놓고 우측 상방 허공(194,80→236,52, Δ50.5px)으로 뻗음',
      },
      {
        exerciseId: 'original-barrel-standing-side-stretch',
        issueKo:
          '큐: "두 발로 바닥을 지지하고 바렐 옆에 섭니다(standing)" → 실제 도해: 스탠딩 기구 레이어 앞에 바닥 Z-Sit(pelvis.y:138, knee.y:148)으로 앉아 있음',
      },
    ],
  },
];
function renderThreePhaseRow(MovementPhaseDiagramSvg, asset) {
  return ['start', 'middle', 'end']
    .map((phaseId) => {
      const vnode = MovementPhaseDiagramSvg({
        asset,
        phase: phaseId,
        phaseId,
        compact: true,
        showMuscles: true,
        showDirection: true,
        showAlignment: true,
      });
      const svgMarkup = renderVNodeToMarkup(vnode);
      const phaseTitle =
        phaseId === 'start'
          ? '시작 (Start)'
          : phaseId === 'middle'
            ? '중간 정점 (Middle)'
            : '끝 복귀 (End)';
      return `
        <div class="phase-cell" data-phase-cell="${phaseId}">
          <div class="phase-title">${phaseTitle}</div>
          <div class="svg-box">${svgMarkup}</div>
        </div>
      `;
    })
    .join('\n');
}
export function buildAuditHtmlPage(analysis, rigCatalogMod, svgMod) {
  const { MovementPhaseDiagramSvg } = svgMod;
  const invById = new Map(analysis.inventory.map((i) => [i.exerciseId, i]));
  const apparatusSectionsHtml = APPARATUS_SAMPLE_SPECS.map((spec) => {
    const compatAsset = rigCatalogMod.getMovementVisualAsset(spec.compatibleExerciseId);
    const compatInv = invById.get(spec.compatibleExerciseId);
    const compatTop = compatInv.topMovingJoints[0];
    const mismatchCardsHtml = spec.mismatchedExercises
      .map((m) => {
        const mAsset = rigCatalogMod.getMovementVisualAsset(m.exerciseId);
        const mInv = invById.get(m.exerciseId);
        const mTop = mInv.topMovingJoints[0];
        const mUrl = mInv.verifiablePublicSources[0]?.url ?? '';
        return `
          <div class="exercise-strip mismatch-strip" data-exercise-strip="${m.exerciseId}">
            <div class="strip-meta">
              <span class="role-pill role-mismatch">잔여 의미론적 불일치 (${mInv.mismatchId})</span>
              <strong>${mAsset.nameKo}</strong>
              <code>${m.exerciseId}</code>
              <span class="meta-tag">${mAsset.apparatus} · ${mAsset.bodyPosition} · ${mAsset.spinalPlanes.join('/')}</span>
              <span class="meta-tag">Rig: <code>${mAsset.archetypeId}</code> (${mTop.joint} Δ${mTop.maxPhaseDist}px, pelvis Δ${mInv.jointDeltas.pelvis.maxPhaseDist}px)</span>
            </div>
            <p class="issue-desc">${m.issueKo}</p>
            <div class="source-line">확인 가능한 공개 출처 URL: <a href="${mUrl}">${mUrl}</a></div>
            <div class="phase-grid">
              ${renderThreePhaseRow(MovementPhaseDiagramSvg, mAsset)}
            </div>
          </div>
        `;
      })
      .join('\n');
    return `
      <section class="apparatus-sample-card" id="sample-${spec.apparatus}" data-apparatus-sample="${spec.apparatus}">
        <div class="sample-header">
          <span class="apparatus-badge">${spec.apparatusLabelKo}</span>
          <span class="mismatch-badges">${spec.mismatchIds.join(' · ')}</span>
          <h2>${spec.headlineKo}</h2>
        </div>
        <div class="exercise-strip compatible-strip" data-exercise-strip="${spec.compatibleExerciseId}">
          <div class="strip-meta">
            <span class="role-pill role-compatible">${spec.compatibleRoleKo}</span>
            <strong>${compatAsset.nameKo}</strong>
            <code>${spec.compatibleExerciseId}</code>
            <span class="meta-tag">${compatAsset.apparatus} · ${compatAsset.bodyPosition} · ${compatAsset.spinalPlanes.join('/')}</span>
            <span class="meta-tag">Rig: <code>${compatAsset.archetypeId}</code> (${compatTop.joint} Δ${compatTop.maxPhaseDist}px, pelvis Δ${compatInv.jointDeltas.pelvis.maxPhaseDist}px)</span>
          </div>
          <div class="phase-grid">
            ${renderThreePhaseRow(MovementPhaseDiagramSvg, compatAsset)}
          </div>
        </div>
        ${mismatchCardsHtml}
      </section>
    `;
  }).join('\n');
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>98개 필라테스 도해 동일 Rig/위상 의미론적 불일치 감사 (Round 4)</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f2eb; color: #1b2d27; overflow-x: hidden; }
    header, main { max-width: 1380px; margin: 0 auto 12px; }
    header { background: #ffffff; border: 1px solid #d7cfc0; border-radius: 10px; padding: 10px 12px; }
    h1 { margin: 0 0 6px; font-size: 1rem; line-height: 1.35; }
    .truthfulness-banner { font-size: 0.75rem; line-height: 1.45; background: #fdf6ec; border-left: 3px solid #c97a2b; padding: 6px 10px; border-radius: 6px; color: #57422c; word-break: keep-all; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .filter-bar button { font-size: 0.74rem; padding: 4px 9px; border-radius: 6px; border: 1px solid #2b5447; background: #eef5f2; color: #1c3f35; cursor: pointer; }
    .filter-bar button[aria-pressed="true"] { background: #2b5447; color: #ffffff; }
    .apparatus-sample-card { background: #ffffff; border: 1px solid #d7cfc0; border-radius: 12px; padding: 10px; margin-bottom: 12px; min-width: 0; }
    .sample-header { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
    .apparatus-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #1f473c; color: #ffffff; }
    .mismatch-badges { font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: #fbe7e4; color: #962d22; }
    .sample-header h2 { margin: 0; font-size: 0.84rem; line-height: 1.35; word-break: keep-all; }
    .exercise-strip { border: 1px solid #e3dccf; border-radius: 8px; padding: 8px; margin-bottom: 8px; background: #faf8f4; min-width: 0; }
    .mismatch-strip { border-color: #e6b8b2; background: #fff9f8; }
    .strip-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; font-size: 0.74rem; margin-bottom: 4px; min-width: 0; }
    .role-pill { font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .role-compatible { background: #dff0e8; color: #1b523d; }
    .role-mismatch { background: #fadbd8; color: #8f261b; }
    .meta-tag { font-size: 0.69rem; color: #4f625b; background: #eef1ef; padding: 1px 6px; border-radius: 4px; max-width: 100%; overflow-wrap: anywhere; }
    .issue-desc { margin: 4px 0; font-size: 0.73rem; color: #6e241b; line-height: 1.38; word-break: keep-all; }
    .source-line { font-size: 0.68rem; color: #3d564d; margin-bottom: 6px; overflow-wrap: anywhere; }
    .phase-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
    @media (min-width: 640px) { .phase-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    .phase-cell { border: 1px solid #e6dfd2; border-radius: 6px; padding: 4px; background: #ffffff; min-width: 0; }
    .phase-title { font-size: 0.68rem; font-weight: 600; color: #2f564b; margin-bottom: 3px; }
    .svg-box { width: 100%; overflow: hidden; }
    .svg-box svg { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <header>
    <h1>98개 필라테스 도해 동일 Rig/위상 의미론적 불일치 감사 표본 (실제 현재 렌더러 · 기구별 5종)</h1>
    <div class="truthfulness-banner" id="truthfulness-banner">
      진실성 경계: 본 감사 표본은 현재 main(ca38174) 실제 렌더러(MovementPhaseDiagramSvg)에서 서로 다른 동작이 동일 아키타입과 시작/중간/끝 좌표를 공유해 오해를 유발하는 사례(SM-01~SM-08)를 기구별로 캡처한 것이며, 임상적·해부학적·전문가 검증 완료를 절대 주장하지 않습니다 (anatomicalAccuracyAssumed: false, anatomicalVerificationCompleted: false, expertVerificationCompleted: false).
    </div>
    <div class="filter-bar">
      <button type="button" id="btn-filter-all" aria-pressed="true">전체 기구 표본 보기 (5종)</button>
      <button type="button" id="btn-filter-mismatch-only" aria-pressed="false">불일치 동작 스트립만 강조</button>
    </div>
  </header>
  <main id="semantic-audit-main" data-total-exercises="${analysis.summary.totalExercisesAudited}" data-total-groups="${analysis.summary.totalCoordinateGroups}">
    ${apparatusSectionsHtml}
  </main>
  <script>
    const btnAll = document.getElementById('btn-filter-all');
    const btnMis = document.getElementById('btn-filter-mismatch-only');
    btnMis.addEventListener('click', () => {
      btnAll.setAttribute('aria-pressed', 'false');
      btnMis.setAttribute('aria-pressed', 'true');
      document.querySelectorAll('.compatible-strip').forEach((el) => {
        el.style.display = 'none';
      });
    });
    btnAll.addEventListener('click', () => {
      btnAll.setAttribute('aria-pressed', 'true');
      btnMis.setAttribute('aria-pressed', 'false');
      document.querySelectorAll('.compatible-strip').forEach((el) => {
        el.style.display = '';
      });
    });
  </script>
</body>
</html>`;
}
