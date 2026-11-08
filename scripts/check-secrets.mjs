import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Keep complete credential-shaped examples out of source, including test fixtures.
// These narrow checks supplement provider scanning; they do not prove a key is safe.
const rules = [
  ['google-api-key', new RegExp('(?<![A-Za-z0-9_-])AI' + 'za[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])')],
  ['github-token', new RegExp('\\bgh[pousr]' + '_[A-Za-z0-9]{36,255}(?![A-Za-z0-9])')],
  ['github-fine-grained-token', new RegExp('\\bgithub_' + 'pat_[A-Za-z0-9_]{60,}(?![A-Za-z0-9_])')],
  [
    'openai-api-key',
    new RegExp('\\bsk' + '-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}(?![A-Za-z0-9_-])'),
  ],
  ['aws-access-key-id', new RegExp('\\b(?:AK' + 'IA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])')],
  [
    'jwt-token',
    new RegExp(
      '\\bey' + 'J[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{10,}(?![A-Za-z0-9_-])',
    ),
  ],
  [
    'private-key',
    new RegExp('-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE' + ' KEY-----'),
  ],
];

export function scanText(file, text) {
  const findings = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    for (const [rule, pattern] of rules) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, rule });
    }
  }
  return findings;
}

export function scanTrackedFiles(root) {
  const files = execFileSync('git', ['ls-files', '--cached', '--full-name', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  const findings = [];
  for (const file of new Set(files)) {
    const path = resolve(root, file);
    let data;
    try {
      // A tracked symlink stores its target name, not the target's external bytes.
      data = lstatSync(path).isSymbolicLink()
        ? Buffer.from(readlinkSync(path))
        : readFileSync(path);
    } catch (error) {
      if (error.code === 'ENOENT') continue; // A tracked deletion in the working tree.
      throw error;
    }
    if (!data.includes(0)) findings.push(...scanText(file, data.toString('utf8')));
  }
  return findings;
}

function safeFileName(file) {
  for (const [, pattern] of rules)
    file = file.replace(new RegExp(pattern.source, 'g'), '[REDACTED]');
  return JSON.stringify(file);
}

export function main() {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const findings = scanTrackedFiles(root);
  if (findings.length) {
    console.error(
      `Secret-shaped values found in tracked files (${findings.length}). Values are never printed.`,
    );
    for (const finding of findings) {
      console.error(`${safeFileName(finding.file)}:${finding.line}: ${finding.rule}`);
    }
    console.error(
      'Remove the literal and use provider configuration. Do not assume removal revokes a credential or erases Git history.',
    );
    return 1;
  }
  console.log('Tracked-file secret check passed (source, tests, docs, and config included).');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch {
    console.error(
      'Secret check could not inspect tracked files. Check repository access; no file contents are printed.',
    );
    process.exitCode = 2;
  }
}
