const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { artifactDirectory } = require('./artifact-directory.cjs');

test('default artifacts are unique private directories without replacing prior outputs', () => {
  const first = artifactDirectory();
  const second = artifactDirectory();
  try {
    assert.notEqual(first, second);
    for (const directory of [first, second]) {
      assert.ok(fs.lstatSync(directory).isDirectory());
      if (process.platform !== 'win32') assert.equal(fs.statSync(directory).mode & 0o077, 0);
    }
    const marker = path.join(first, 'result.json');
    fs.writeFileSync(marker, '{"saved":true}');
    assert.equal(artifactDirectory(first), first);
    assert.equal(fs.readFileSync(marker, 'utf8'), '{"saved":true}');
  } finally {
    fs.rmSync(first, { recursive: true });
    fs.rmSync(second, { recursive: true });
  }
});
