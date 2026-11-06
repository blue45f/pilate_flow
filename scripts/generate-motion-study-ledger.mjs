/** Reproducible authored-source fingerprints. Only trusted authored data/model modules execute. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_PATH = 'src/data/motionStudyLedger.json';
export const FINGERPRINT_SCOPE = 'authored-source-bundle-sha256-v1';
const PHASE_IDS = ['setup', 'move', 'turn', 'return', 'finish'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function canonicalJson(value) {
  const sorted = (item) => Array.isArray(item) ? item.map(sorted)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sorted(item[key])]))
      : item;
  return JSON.stringify(sorted(value));
}

/** Conservative family graph: all authored definitions/dispatch routes, including type imports. */
export const FAMILY_ROOTS = Object.freeze({
  'existing-proposal': [
    'src/data/motionDrafts.ts', 'src/data/motionDraftIndex.ts',
    'src/components/MotionDraftFigure.tsx', 'src/models/types.ts',
    // Source provenance is intentionally included even though the figure does not import it.
    'src/models/chestLiftProvenance.ts',
  ],
  'authoring-batch': [
    'src/data/motionAuthoringBatch.ts', 'src/components/MotionAuthoringBatchFigure.tsx',
  ],
  'supine-reach': [
    'src/data/supineReach.ts', 'src/components/SupineReachFigure.tsx',
  ],
});

// Explicit dispatch avoids routing an unfamiliar family through another model's geometry.
const FAMILY_MODULES = Object.freeze({
  'existing-proposal': {
    definitions: ['src/data/motionDrafts.ts', 'MOTION_DRAFTS'],
    identities: ['src/models/types.ts', 'MOTION_DRAFT_IDS'], count: 17,
  },
  'authoring-batch': {
    definitions: ['src/data/motionAuthoringBatch.ts', 'BATCH_VARIANTS'],
    identities: ['src/models/motionAuthoringBatch.ts', 'BATCH_IDS'], count: 4,
  },
  'supine-reach': {
    definitions: ['src/data/supineReach.ts', 'SUPINE_REACH_VARIANTS'],
    identities: ['src/models/supineReach.ts', 'SUPINE_REACH_IDS'], count: 1,
  },
});
const EXPECTED_ENTRIES = Object.values(FAMILY_MODULES).reduce((sum, item) => sum + item.count, 0);

function safePath(root, relative, missing = false) {
  assert(typeof relative === 'string' && /^src\/[A-Za-z0-9_./-]+$/.test(relative)
    && relative.split('/').every((part) => part && part !== '.' && part !== '..'),
  `Unsafe source path: ${relative}`);
  assert.equal(path.resolve(root), realpathSync(root), 'Root must be a real directory');
  let current = root;
  for (const [index, part] of relative.split('/').entries()) {
    current = path.join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if (missing && error.code === 'ENOENT' && index === relative.split('/').length - 1) return current;
      throw error;
    }
    assert(!stat.isSymbolicLink(), `Symlink source/output rejected: ${relative}`);
    assert(index === relative.split('/').length - 1 ? stat.isFile() : stat.isDirectory(),
      `Non-regular source/output: ${relative}`);
  }
  return current;
}

function sourceReader(root) {
  const files = new Map();
  function read(relative) {
    assert.notEqual(relative, LEDGER_PATH, 'Generated ledger cannot be its own dependency');
    if (!files.has(relative)) {
      const bytes = readFileSync(safePath(root, relative));
      const ast = /\.tsx?$/.test(relative)
        ? ts.createSourceFile(relative, bytes.toString('utf8'), ts.ScriptTarget.Latest, true) : null;
      assert(!ast?.parseDiagnostics.length, `Invalid TypeScript source: ${relative}`);
      files.set(relative, { bytes, ast });
    }
    return files.get(relative);
  }
  function resolve(from, request) {
    assert(request.startsWith('.') && !request.includes('\\'), `Only relative source modules may be loaded: ${request}`);
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), request));
    const candidates = path.posix.extname(base) ? [base]
      : [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}.css`, `${base}/index.ts`];
    const matches = candidates
      .filter((item) => {
        try { safePath(root, item); return true; } catch (error) {
          if (error.code === 'ENOENT') return false;
          throw error;
        }
      });
    assert.equal(matches.length, 1, `Unresolvable relative dependency: ${from} -> ${request}`);
    return matches[0];
  }
  function closure(seeds) {
    const visited = new Set();
    function visit(relative) {
      if (visited.has(relative)) return;
      visited.add(relative);
      const { ast, bytes } = read(relative);
      if (relative.endsWith('.css')) {
        assert(!/@import\b|url\s*\(/i.test(bytes.toString('utf8')), `CSS dependency needs explicit graph support: ${relative}`);
      }
      if (!ast) return;
      const requests = [];
      for (const statement of ast.statements) {
        if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
          assert(ts.isStringLiteral(statement.moduleSpecifier), `Non-literal module in ${relative}`);
          requests.push(statement.moduleSpecifier.text);
        }
      }
      const checkDynamic = (node) => {
        assert(!(ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
          || ts.isIdentifier(node.expression) && node.expression.text === 'require')),
        `Dynamic source dependency unsupported: ${relative}`);
        ts.forEachChild(node, checkDynamic);
      };
      checkDynamic(ast);
      for (const request of requests) {
        if (request.endsWith('.css')) continue; // External presentation CSS is explicitly outside this geometry/source scope.
        if (request.startsWith('.')) visit(resolve(relative, request));
        else assert.equal(request, 'react', `External dependency outside declared scope: ${request}`);
      }
    }
    seeds.forEach(visit);
    return [...visited].sort();
  }
  // Evaluate trusted authored data/model definitions only. Runtime packages, renderers and
  // filesystem/network globals are unavailable; relative dependencies must be in the graph.
  function dataModuleLoader(allowedFiles) {
    const cache = new Map();
    function load(relative) {
      assert(allowedFiles.includes(relative), `Module outside source graph: ${relative}`);
      assert(!relative.startsWith('src/components/'), 'Renderer execution is outside generator scope');
      if (cache.has(relative)) return cache.get(relative).exports;
      const { bytes } = read(relative);
      if (relative.endsWith('.json')) return JSON.parse(bytes.toString('utf8'));
      assert(relative.endsWith('.ts'), `Only data/model TypeScript can execute: ${relative}`);
      const module = { exports: {} };
      cache.set(relative, module);
      const compiled = ts.transpileModule(bytes.toString('utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
        fileName: relative,
      }).outputText;
      const evaluate = runInNewContext(`(function(exports,require,module){${compiled}\n})`, {}, { filename: relative, timeout: 1000 });
      evaluate(module.exports, (request) => load(resolve(relative, request)), module);
      return module.exports;
    }
    return load;
  }
  return { read, closure, dataModuleLoader };
}

function phasesAndStages(definition) {
  const phases = Array.from(definition.phases, (phase) => ({
    id: phase.id, label: phase.label, start: phase.start, end: phase.end, sample: phase.sample,
    displayBehavior: phase.displayBehavior ?? 'unknown',
  }));
  assert.deepEqual(phases.map((phase) => phase.id), PHASE_IDS, `Unexpected phase sequence: ${definition.id}`);
  phases.forEach((phase, index) => {
    assert(typeof phase.label === 'string' && phase.label.trim(), `Missing phase label: ${definition.id}`);
    assert([phase.start, phase.end, phase.sample].every(Number.isFinite), `Non-finite phase: ${definition.id}`);
    assert.equal(phase.start, index === 0 ? 0 : phases[index - 1].end, `Phase gap/overlap: ${definition.id}`);
    assert(phase.start < phase.end && phase.sample >= phase.start && phase.sample <= phase.end,
      `Invalid phase bounds/sample: ${definition.id}`);
    assert(['hold', 'move', 'unknown'].includes(phase.displayBehavior), `Invalid phase behavior: ${definition.id}`);
  });
  assert.equal(phases.at(-1).end, 1, `Incomplete phase coverage: ${definition.id}`);
  return {
    phases,
    stages: [
      { id: 'setup', label: '준비 배치', start: 0, end: phases[0].end, phaseIds: ['setup'] },
      { id: 'main', label: '동작과 돌아오기', start: phases[1].start, end: phases[3].end, phaseIds: ['move', 'turn', 'return'] },
      { id: 'finish', label: '처음 배치 확인', start: phases[4].start, end: 1, phaseIds: ['finish'] },
    ],
  };
}

export function buildMotionStudyLedger(rootDirectory = ROOT) {
  const root = path.resolve(rootDirectory);
  const reader = sourceReader(root);
  const entries = [];
  for (const [family, seeds] of Object.entries(FAMILY_ROOTS)) {
    const graph = reader.closure(seeds);
    const sourceFiles = graph.map((relative) => ({ path: relative, sha256: sha256(reader.read(relative).bytes) }));
    const load = reader.dataModuleLoader(graph);
    const modules = FAMILY_MODULES[family];
    assert(modules, `Unknown authored family: ${family}`);
    const definitions = load(modules.definitions[0])[modules.definitions[1]];
    const declaredIds = load(modules.identities[0])[modules.identities[1]];
    assert.equal(definitions.length, modules.count, `Explicit inventory update required: ${family}`);
    assert.deepEqual(Array.from(definitions, (item) => item.id).sort(), [...declaredIds].sort(), `Definition/identity mismatch: ${family}`);
    for (const definition of definitions) {
      assert(typeof definition.id === 'string' && typeof definition.intendedExerciseId === 'string'
        && typeof definition.title === 'string', `Missing source identity: ${family}`);
      assert(['bilateral', 'unilateral'].includes(definition.sideMode), `Missing side mode: ${definition.id}`);
      const identity = { family, variantId: definition.id, intendedExerciseIds: [definition.intendedExerciseId],
        title: definition.title, sideMode: definition.sideMode };
      const timing = phasesAndStages(definition);
      const fingerprinted = { ...identity, fingerprintScope: FINGERPRINT_SCOPE, sourceFiles, ...timing };
      entries.push({ ...identity, sourceFingerprint: sha256(canonicalJson(fingerprinted)),
        fingerprintScope: FINGERPRINT_SCOPE, sourceFiles, ...timing });
    }
  }
  assert.equal(new Set(entries.map((entry) => `${entry.family}/${entry.variantId}`)).size, EXPECTED_ENTRIES, 'Duplicate source identity');
  return {
    schemaVersion: 1,
    fingerprintScope: FINGERPRINT_SCOPE,
    scopeDescription: 'Per-entry identity, phases/stages and SHA-256 of original local bytes in the conservative family-wide relative import graph of authored definitions, models, model types and SVG renderers, plus listed identity/provenance roots; includes source-fact dependencies and renderer-owned inline SVG geometry/style attributes. External CSS, UI/player controls/layout, generated ledgers, compiled assets and external package bytes are excluded. Geometry/source scope does not fingerprint the complete displayed page. Shared definition/dispatch dependencies and their type imports are included; another variant in the same family can invalidate a fingerprint. This is source identity, never an asset hash, exact-match claim or professional review.',
    fingerprintMethod: 'SHA-256 of compact UTF-8 recursively key-sorted JSON {family,variantId,intendedExerciseIds,title,sideMode,fingerprintScope,sourceFiles,phases,stages}; array order preserved, sourceFiles sorted by relative path; original Unicode; no timestamps.',
    stageSemantics: 'Authored local progress only. setup is the established starting pose; main groups move/turn/return; finish checks the restored authored pose. These stages do not depict entering/leaving posture, prescribe holds/repetitions, or represent class warmup/cooldown. Unknown displayBehavior preserves absent source metadata.',
    entries,
  };
}
export const ledgerBytes = (ledger) => `${JSON.stringify(ledger, null, 2)}\n`;
export function checkMotionStudyLedger(rootDirectory = ROOT) {
  const root = path.resolve(rootDirectory);
  const ledger = buildMotionStudyLedger(root);
  const expected = ledgerBytes(ledger);
  let actual;
  try { actual = readFileSync(safePath(root, LEDGER_PATH), 'utf8'); } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Motion study ledger is missing; run explicit --write');
    throw error;
  }
  assert.equal(actual, expected, 'Motion study ledger is stale; inspect source changes then run explicit --write');
  return { entries: ledger.entries.length, bytes: Buffer.byteLength(expected), sha256: sha256(expected) };
}
export async function writeMotionStudyLedger(rootDirectory = ROOT) {
  const root = path.resolve(rootDirectory);
  const ledger = buildMotionStudyLedger(root);
  const bytes = ledgerBytes(ledger);
  const target = safePath(root, LEDGER_PATH, true);
  const temporary = `${target}.new-${process.pid}`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o644 });
    safePath(root, LEDGER_PATH, true);
    await rename(temporary, target);
  } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  return { path: LEDGER_PATH, entries: ledger.entries.length, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    assert(args.length === 0 || args.length === 1 && ['--check', '--write'].includes(args[0]),
      'Usage: node scripts/generate-motion-study-ledger.mjs [--check|--write]');
    const mode = args[0] === '--write' ? 'write' : 'check';
    const result = await (mode === 'write' ? writeMotionStudyLedger() : checkMotionStudyLedger());
    process.stdout.write(`${JSON.stringify({ mode, ...result })}\n`);
  } catch (error) { process.stderr.write(`Motion study ledger: ${error.message}\n`); process.exitCode = 1; }
}
