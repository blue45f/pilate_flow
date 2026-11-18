#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  'AGENTS.md',
  'DESIGN.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/pilates-flow.mdc',
  '.github/copilot-instructions.md',
  'DEPLOYMENT.md',
  'docs/engineering/unslop-3d-studio-playbook.md',
  'public/models/studio3d/atelier-reformer-v9.glb',
  'src/utils/studio3dResourceGuard.ts',
];

const ADAPTER_FILES = [
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/pilates-flow.mdc',
  '.github/copilot-instructions.md',
];

function inspectGlbAsset(glbPath) {
  const problems = [];
  if (!existsSync(glbPath)) {
    problems.push(`실측 3D GLB 에셋 누락: ${glbPath}`);
    return problems;
  }
  const buf = readFileSync(glbPath);
  if (buf.length < 20) {
    problems.push('atelier-reformer-v9.glb 헤더가 20바이트 미만입니다.');
    return problems;
  }
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (magic !== 0x46546c67 || version !== 2 || jsonType !== 0x4e4f534a) {
    problems.push('atelier-reformer-v9.glb가 유효한 glTF 2.0 바이너리 규격이 아닙니다.');
    return problems;
  }
  const parsed = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const negNodes = (parsed.nodes ?? []).filter(
    (node) => Array.isArray(node.scale) && node.scale.some((axis) => typeof axis === 'number' && axis < 0),
  );
  if (negNodes.length > 0) {
    problems.push(`atelier-reformer-v9.glb에 음수 스케일 노드(${negNodes.length}개)가 포함되어 있습니다.`);
  }
  return problems;
}

export function inspectHarness(root = ROOT) {
  const problems = [];
  for (const rel of REQUIRED_FILES) {
    if (!existsSync(join(root, rel))) {
      problems.push(`필수 하네스·가드 파일 누락: ${rel}`);
    }
  }

  const agentsPath = join(root, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const content = readFileSync(agentsPath, 'utf8');
    for (const marker of [
      '<!-- agent-harness:canonical -->',
      'pnpm run verify:all',
      'DESIGN.md',
      'provider_id: "ghidra"',
      'REA_ANALYSIS_PROVIDER=ghidra',
      '.env.deploy.local',
    ]) {
      if (!content.includes(marker)) {
        problems.push(`AGENTS.md 필수 기준 누락: ${marker}`);
      }
    }
  }

  for (const rel of ADAPTER_FILES) {
    const full = join(root, rel);
    if (existsSync(full)) {
      const txt = readFileSync(full, 'utf8');
      if (!txt.includes('AGENTS.md')) {
        problems.push(`어댑터가 AGENTS.md를 참조하지 않음: ${rel}`);
      }
    }
  }

  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gi = readFileSync(gitignorePath, 'utf8');
    for (const entry of ['*.local', '.env.*', '.claude-flow/']) {
      if (!gi.includes(entry)) {
        problems.push(`.gitignore 로컬 상태 제외 누락: ${entry}`);
      }
    }
  }

  // 4-Step Korean Web & 3D Production Gate
  // 1) Korean Typography Lock & 2) Concentric Radii / Zero Gradient Slop
  const wave9CssPath = join(root, 'src/styles/rea-studio-advancement.css');
  if (existsSync(wave9CssPath)) {
    const css = readFileSync(wave9CssPath, 'utf8');
    for (const requiredToken of ['word-break: keep-all', 'overflow-wrap: break-word', 'tabular-nums']) {
      if (!css.includes(requiredToken)) {
        problems.push(`한글 조판 잠금 토큰 누락 (rea-studio-advancement.css): ${requiredToken}`);
      }
    }
    for (const forbiddenToken of ['999px', '9999px', 'font-weight: 700', 'linear-gradient(']) {
      if (css.includes(forbiddenToken)) {
        problems.push(`Unslop 금지 스타일 회귀 감지 (rea-studio-advancement.css): ${forbiddenToken}`);
      }
    }
  }

  // 3) Plain Korean Chrome Gate (zero raw internal format/hash jargon in offline readiness card)
  const offlineCardPath = join(root, 'src/components/StudioOffline3dReadinessCard.tsx');
  if (existsSync(offlineCardPath)) {
    const cardSrc = readFileSync(offlineCardPath, 'utf8');
    for (const forbiddenTerm of ['GLB v2', 'SceneDocument', 'sha256:']) {
      if (cardSrc.includes(forbiddenTerm)) {
        problems.push(`기본 사용자 크롬에 내부 기술 용어 노출 감지: ${forbiddenTerm}`);
      }
    }
  }

  // 4) Binary GLB & GPU Resource Guard Gate
  problems.push(...inspectGlbAsset(join(root, 'public/models/studio3d/atelier-reformer-v9.glb')));

  return problems;
}

function main() {
  const cmd = process.argv[2] ?? 'check';
  if (!['check', 'doctor'].includes(cmd)) {
    console.error(`지원하지 않는 명령입니다: ${cmd} (check | doctor)`);
    process.exitCode = 2;
    return;
  }
  const problems = inspectHarness(ROOT);
  if (cmd === 'doctor') {
    console.log(`Node: ${process.version}`);
    console.log(`저장소 루트: ${ROOT}`);
  }
  if (problems.length > 0) {
    console.error('Pilates Flow 에이전트 하네스 및 4단계 Unslop·3D 출하 게이트 실패:');
    for (const item of problems) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  console.log('Pilates Flow 에이전트 하네스 및 4단계 Unslop·3D 출하 게이트 통과');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
