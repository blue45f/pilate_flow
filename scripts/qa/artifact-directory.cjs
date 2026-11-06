const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// The default is atomically created and private, never a predictable shared path.
// An explicit output directory remains an operator-controlled destination.
function artifactDirectory(explicitPath) {
  if (explicitPath) {
    const directory = path.resolve(explicitPath);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pilates-qa-'));
}
module.exports = { artifactDirectory };
