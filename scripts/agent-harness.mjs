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
];

const ADAPTER_FILES = [
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/pilates-flow.mdc',
  '.github/copilot-instructions.md',
];

export function inspectHarness(root = ROOT) {
  const problems = [];
  for (const rel of REQUIRED_FILES) {
    if (!existsSync(join(root, rel))) {
      problems.push(`필수 하네스 파일 누락: ${rel}`);
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
    console.error('Pilates Flow 에이전트 하네스 무결성 검사 실패:');
    for (const item of problems) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  console.log('Pilates Flow 에이전트 하네스 무결성 검사 통과');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
