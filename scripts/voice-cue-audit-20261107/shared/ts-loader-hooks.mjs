import fs from 'node:fs';
import module from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BUNDLED_THIRD_PARTY_URL =
  'file:///usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js';

const ZOD_SHIM_SOURCE = `
import { zod } from "${BUNDLED_THIRD_PARTY_URL}";
export const z = zod;
export default zod;
`;

function resolveRelativePath(parentDir, specifier) {
  for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '.json']) {
    const candidate = path.resolve(parentDir, specifier + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

module.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'zod') {
      return {
        url: `data:text/javascript,${encodeURIComponent(ZOD_SHIM_SOURCE)}`,
        shortCircuit: true,
      };
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL &&
      context.parentURL.startsWith('file:')
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const resolvedFile = resolveRelativePath(parentDir, specifier);
      if (resolvedFile) {
        return {
          url: pathToFileURL(resolvedFile).href,
          shortCircuit: true,
        };
      }
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const raw = fs.readFileSync(fileURLToPath(url), 'utf8');
      return {
        format: 'module',
        source: `export default ${raw};\n`,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

/**
 * Transforms a read-only TypeScript or JSON file from `src/` into browser-loadable
 * ES module JavaScript without modifying any source file on disk.
 */
export function transformRepoFileForBrowser(absFilePath, repoRoot) {
  if (absFilePath.endsWith('.json')) {
    const raw = fs.readFileSync(absFilePath, 'utf8');
    return `export default ${raw};\n`;
  }

  const rawTs = fs.readFileSync(absFilePath, 'utf8');
  const stripped = module.stripTypeScriptTypes(rawTs, {
    mode: 'transform',
    sourceUrl: path.relative(repoRoot, absFilePath),
  });

  const fileDir = path.dirname(absFilePath);

  return stripped.replace(
    /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.\.?\/[^'"]+)(['"])/g,
    (fullMatch, prefix, specifier, suffix) => {
      const resolved = resolveRelativePath(fileDir, specifier);
      if (!resolved) {
        return fullMatch;
      }
      const relFromRepo =
        '/' + path.relative(repoRoot, resolved).split(path.sep).join('/');
      return `${prefix}${relFromRepo}${suffix}`;
    },
  );
}
