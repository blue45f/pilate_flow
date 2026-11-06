/** Offline review sheets. Exporting geometry is not anatomical or movement validation. */
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PHASES = ['start', 'middle', 'end'];
const LABELS = { start: '시작', middle: '중간', end: '끝' };
const WARNING = '미검증 공용 패턴 초안 · 실제 동작 단계/해부학/안전성 검증 아님';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jointSignature = (asset) => JSON.stringify(PHASES.map((phase) => Object.entries(asset.phases[phase].joints).sort(([a], [b]) => a.localeCompare(b))));

export async function exportDiagramReview(parentDirectory = tmpdir()) {
  // Always allocate a fresh private directory; never overwrite a user's previous export.
  const output = await mkdtemp(path.join(path.resolve(parentDirectory), 'pilates-diagram-review-'));
  const server = await createServer({ root: ROOT, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, esbuild: { jsx: 'automatic' }, logLevel: 'error' });
  try {
    const { INITIAL_EXERCISES: exercises } = await server.ssrLoadModule('/src/data/pilatesCatalog.ts');
    const { MOVEMENT_VISUAL_ASSETS: assets } = await server.ssrLoadModule('/src/data/movementVisualRigCatalog.ts');
    const { getVisualSourceComparison } = await server.ssrLoadModule('/src/data/movementVisualSourceAudit.ts');
    const { MovementPhaseDiagramSvg } = await server.ssrLoadModule('/src/components/MovementPhaseDiagramSvg.tsx');
    const groups = new Map();
    for (const asset of assets) {
      const signature = jointSignature(asset);
      groups.set(signature, [...(groups.get(signature) ?? []), asset.exerciseId]);
    }
    await mkdir(path.join(output, 'diagrams'));
    const rows = [];
    const files = [];
    for (const exercise of exercises) {
      const asset = assets.find((item) => item.exerciseId === exercise.id);
      if (!asset) throw new Error(`Missing diagram asset: ${exercise.id}`);
      if (!/^[a-zA-Z0-9_-]+$/.test(exercise.id)) throw new Error('Unsafe exercise ID');
      const comparison = getVisualSourceComparison(exercise);
      const phases = [];
      for (const phase of PHASES) {
        const geometry = asset.phases[phase];
        if (!Object.values(geometry.joints).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) throw new Error(`Nonfinite pose: ${exercise.id}/${phase}`);
        const svg = renderToStaticMarkup(createElement(MovementPhaseDiagramSvg, {
          asset, phase, activeSide: 'right', mirrored: false,
          showAlignment: false, showDirection: false, showMuscles: false, showGhostStartPose: false,
          label: `${exercise.nameKo} · ${LABELS[phase]} · ${WARNING}`,
        }));
        // Visible warning travels with every standalone SVG, not only its surrounding page.
        const svgWithNotice = svg.replace('</svg>', `<rect x="0" y="182" width="320" height="18" fill="#fff3cd"/><text x="160" y="194" text-anchor="middle" font-size="8" fill="#563d00">${escape(WARNING)}</text></svg>`);
        const relativePath = `diagrams/${exercise.id}-${phase}.svg`;
        await writeFile(path.join(output, relativePath), svgWithNotice, { mode: 0o600 });
        const file = { path: relativePath, bytes: Buffer.byteLength(svgWithNotice), sha256: hash(svgWithNotice) };
        files.push(file);
        phases.push({ phase, labelKo: LABELS[phase], file: relativePath, exactSourceFrame: null, anatomicalReview: 'unreviewed' });
      }
      rows.push({
        exerciseId: exercise.id, nameKo: exercise.nameKo, nameEn: exercise.nameEn,
        apparatus: exercise.apparatus, bodyPosition: exercise.bodyPosition, archetypeId: asset.archetypeId,
        poseSignatureSha256: hash(jointSignature(asset)),
        identicalPoseExerciseIds: groups.get(jointSignature(asset)).filter((id) => id !== exercise.id),
        status: 'unverified-shared-pattern-draft', canonicalMotionReady: false, anatomicalAccuracyVerified: false,
        professionalReviewCount: 0, sourceFrameMappingCount: 0, phases,
        researchLinks: comparison.matchedReliableSources.map((source) => ({ title: source.titleKo, url: source.url, role: 'research-candidate-not-frame-evidence', rights: source.rightsLabelKo })),
        reviewRequired: ['운동과 변형의 정확한 일치', '시작·중간·끝 원본 근거 및 관찰 시점', '신체 자세·기구 접촉·좌우·정렬', '동작별 좌표 수정과 자격 있는 검토자의 확인'],
      });
    }
    const summary = { catalogExercises: exercises.length, exportedSvgFiles: files.length, uniqueThreePhaseJointSets: groups.size, exercisesSharingCoordinates: rows.filter((row) => row.identicalPoseExerciseIds.length > 0).length, exactCanonicalMotionVerified: 0, anatomyVerified: 0, sourceFrameMappings: 0 };
    const sections = rows.map((row) => `<section id="${escape(row.exerciseId)}"><h2>${escape(row.nameKo)} <small>${escape(row.nameEn)}</small></h2><p>${escape(row.apparatus)} / ${escape(row.bodyPosition)} / ${escape(row.archetypeId)}</p><p class="warning">${WARNING}</p><div class="phases">${row.phases.map((phase) => `<figure><img src="${phase.file}" alt="${escape(row.nameKo)} ${phase.labelKo} 미검증 공용 패턴 초안"><figcaption>${phase.labelKo} · 원본 프레임 대조 없음</figcaption></figure>`).join('')}</div><p>동일한 3단계 관절 좌표를 공유하는 다른 운동 ${row.identicalPoseExerciseIds.length}종: ${row.identicalPoseExerciseIds.map(escape).join(', ') || '없음'}. 좌표 고유성도 정확성의 증거가 아닙니다.</p><details><summary>조사 후보 링크와 검수 항목</summary><p>아래 링크는 기구/패턴으로 배정된 조사 후보이며 이 그림을 뒷받침하는 단계별 출처로 검증되지 않았습니다. 외부 이미지는 복제하지 않았습니다.</p><ul>${row.researchLinks.filter((link) => /^https?:\/\//.test(link.url)).map((link) => `<li><a href="${escape(link.url)}" rel="noreferrer">${escape(link.title)}</a></li>`).join('')}</ul><ul>${row.reviewRequired.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></details></section>`).join('\n');
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pilates Flow 도해 초안 전수 검수</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f5f5f2;color:#202820;margin:0 auto;padding:20px;max-width:1200px}h1{font-size:1.7rem}h2{font-size:1.3rem}small{display:block;font-weight:normal}section{background:white;border:1px solid #ccd1cc;border-radius:12px;padding:16px;margin:20px 0;break-inside:avoid}p,li{overflow-wrap:anywhere}.warning{background:#fff3cd;color:#563d00;padding:8px}.phases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0}img{display:block;width:100%;height:auto}summary{cursor:pointer;min-height:44px}a{color:#185737}nav a{display:inline-block;padding:10px}@media(max-width:650px){.phases{grid-template-columns:1fr}}@media print{details{display:block}body{max-width:none}nav{display:none}}</style><main><h1>Pilates Flow 도해 초안 전수 검수</h1><p>${exercises.length}종 / ${files.length}장 · 고유 3단계 좌표 ${groups.size}세트 · 정확한 실제 동작·해부학 검증 0건</p><p class="warning">정지 초안 검수용입니다. 수업 시범이나 운동 지침이 아닙니다. 시작·중간·끝 명칭은 작성자가 붙인 단계명이며 관찰된 실제 프레임이 아닙니다. 자동재생·3D·근육 정확성 주장을 하지 않습니다.</p><p>기존 자료를 그대로 렌더링했습니다. 외부 콘텐츠 요청, 분석 추적, 스크립트, 영상 및 자동재생이 없습니다. 외부 출처는 직접 링크를 누를 때만 열립니다.</p><nav aria-label="동작 목록">${rows.map((row) => `<a href="#${escape(row.exerciseId)}">${escape(row.nameKo)}</a>`).join(' ')}</nav>${sections}</main></html>`;
    await writeFile(path.join(output, 'index.html'), html, { mode: 0o600 });
    files.push({ path: 'index.html', bytes: Buffer.byteLength(html), sha256: hash(html) });
    const manifest = { schemaVersion: 1, purpose: 'offline-draft-review-only', warning: WARNING, summary, rows, files };
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    return { output, summary };
  } finally {
    await server.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3) throw new Error('Usage: node scripts/qa/export-diagram-review.mjs [existing-parent-directory]');
  console.log(JSON.stringify(await exportDiagramReview(process.argv[2]), null, 2));
}
