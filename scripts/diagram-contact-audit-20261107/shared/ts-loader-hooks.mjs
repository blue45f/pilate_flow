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

export const REACT_SHIM_SOURCE = `
let __uidCounter = 0;
export function useId() {
  __uidCounter += 1;
  return ":r" + __uidCounter + ":";
}
export function useState(initial) {
  const val = typeof initial === "function" ? initial() : initial;
  return [val, () => {}];
}
export function useMemo(factory) {
  return factory();
}
export const Fragment = Symbol.for("react.fragment");
export function createElement(type, props, ...children) {
  const flatChildren = [];
  const pushChild = (c) => {
    if (Array.isArray(c)) {
      for (const item of c) pushChild(item);
    } else if (c !== null && c !== undefined && c !== false && c !== true) {
      flatChildren.push(c);
    }
  };
  for (const ch of children) pushChild(ch);
  const mergedProps = Object.assign({}, props || {});
  if (flatChildren.length === 1) mergedProps.children = flatChildren[0];
  else if (flatChildren.length > 1) mergedProps.children = flatChildren;
  if (typeof type === "function") {
    return type(mergedProps);
  }
  return {
    $$typeof: "vnode",
    type,
    props: mergedProps,
    children: flatChildren,
  };
}
const React = {
  useId,
  useState,
  useMemo,
  Fragment,
  createElement,
};
export default React;
`;

const ATTR_NAME_MAP = {
  className: 'class',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  fillOpacity: 'fill-opacity',
  textAnchor: 'text-anchor',
  fontSize: 'font-size',
  markerWidth: 'markerWidth',
  markerHeight: 'markerHeight',
  markerEnd: 'marker-end',
  viewBox: 'viewBox',
  refX: 'refX',
  refY: 'refY',
};

function camelToKebabCss(prop) {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function renderVNodeToMarkup(node) {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return escapeXml(node);
  }
  if (Array.isArray(node)) {
    return node.map(renderVNodeToMarkup).join('');
  }
  if (node.type === Symbol.for('react.fragment')) {
    return (node.children || []).map(renderVNodeToMarkup).join('');
  }
  if (typeof node.type === 'function') {
    return renderVNodeToMarkup(node.type(node.props || {}));
  }
  const tag = String(node.type);
  const props = node.props || {};
  const attrParts = [];
  for (const [rawKey, rawVal] of Object.entries(props)) {
    if (
      rawKey === 'children' ||
      rawKey === 'key' ||
      rawKey === 'ref' ||
      typeof rawVal === 'function' ||
      rawVal === undefined ||
      rawVal === null ||
      rawVal === false
    ) {
      continue;
    }
    if (rawKey === 'style' && typeof rawVal === 'object') {
      const styleStr = Object.entries(rawVal)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${camelToKebabCss(k)}:${v}`)
        .join(';');
      if (styleStr) {
        attrParts.push(`style="${escapeXml(styleStr)}"`);
      }
      continue;
    }
    const attrName = ATTR_NAME_MAP[rawKey] ?? rawKey;
    if (rawVal === true) {
      attrParts.push(`${attrName}="true"`);
    } else {
      attrParts.push(`${attrName}="${escapeXml(rawVal)}"`);
    }
  }
  const openTag = attrParts.length > 0 ? `<${tag} ${attrParts.join(' ')}>` : `<${tag}>`;
  const inner = (node.children || []).map(renderVNodeToMarkup).join('');
  return `${openTag}${inner}</${tag}>`;
}

export function queryVNodes(node, predicate, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (Array.isArray(node)) {
    for (const item of node) queryVNodes(item, predicate, results);
    return results;
  }
  if (predicate(node)) {
    results.push(node);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      queryVNodes(child, predicate, results);
    }
  }
  return results;
}

function findMatchingBrace(str, startIdx, openChar = '{', closeChar = '}') {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let i = startIdx; i < str.length; i += 1) {
    const ch = str[i];
    const prev = str[i - 1];
    if (inSingle) {
      if (ch === "'" && prev !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"' && prev !== '\\') inDouble = false;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseJsxElement(str, startIdx) {
  let i = startIdx;
  let tagName = 'React.Fragment';
  if (str.startsWith('<>', i)) {
    i += 2;
  } else {
    const m = str.slice(i).match(/^<([a-zA-Z_][a-zA-Z0-9_.]*)/);
    if (!m) return null;
    tagName = m[1];
    i += m[0].length;
  }
  const isIntrinsic = /^[a-z]/.test(tagName) && !tagName.includes('.');
  const tagExpr = isIntrinsic ? JSON.stringify(tagName) : tagName;

  const propsParts = [];
  let currentProps = [];
  const flushProps = () => {
    if (currentProps.length > 0) {
      propsParts.push(`{${currentProps.join(', ')}}`);
      currentProps = [];
    }
  };

  let selfClosing = false;
  if (tagName !== 'React.Fragment') {
    while (i < str.length) {
      while (i < str.length && /\s/.test(str[i])) i += 1;
      if (str.startsWith('/>', i)) {
        selfClosing = true;
        i += 2;
        break;
      }
      if (str[i] === '>') {
        i += 1;
        break;
      }
      if (str.startsWith('{...', i)) {
        flushProps();
        const endBrace = findMatchingBrace(str, i);
        const spreadExpr = str.slice(i + 4, endBrace).trim();
        propsParts.push(spreadExpr);
        i = endBrace + 1;
        continue;
      }
      const attrMatch = str.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_:-]*)/);
      if (!attrMatch) return null;
      const attrName = attrMatch[1];
      i += attrName.length;
      while (i < str.length && /\s/.test(str[i])) i += 1;
      if (str[i] !== '=') {
        currentProps.push(`${JSON.stringify(attrName)}: true`);
        continue;
      }
      i += 1;
      while (i < str.length && /\s/.test(str[i])) i += 1;
      if (str[i] === '"' || str[i] === "'") {
        const q = str[i];
        let val = q;
        i += 1;
        while (i < str.length) {
          const c = str[i];
          i += 1;
          val += c;
          if (c === '\\') {
            val += str[i];
            i += 1;
            continue;
          }
          if (c === q) break;
        }
        currentProps.push(`${JSON.stringify(attrName)}: ${val}`);
      } else if (str[i] === '{') {
        const endBrace = findMatchingBrace(str, i);
        const rawExpr = str.slice(i + 1, endBrace);
        const transpiledExpr = transpileJsxToCreateElement(rawExpr);
        currentProps.push(`${JSON.stringify(attrName)}: (${transpiledExpr})`);
        i = endBrace + 1;
      }
    }
  }
  flushProps();
  let propsCode = 'null';
  if (propsParts.length === 1) propsCode = propsParts[0];
  else if (propsParts.length > 1) propsCode = `Object.assign({}, ${propsParts.join(', ')})`;

  if (selfClosing) {
    return { code: `React.createElement(${tagExpr}, ${propsCode})`, nextIdx: i };
  }

  const closeTag = tagName === 'React.Fragment' ? '</>' : `</${tagName}>`;
  const children = [];
  let textBuf = '';
  const flushText = () => {
    const cleaned = textBuf.replace(/\r?\n\s*/g, ' ');
    if (cleaned.trim().length > 0) {
      children.push(JSON.stringify(cleaned));
    }
    textBuf = '';
  };

  while (i < str.length) {
    if (str.startsWith(closeTag, i)) {
      flushText();
      i += closeTag.length;
      break;
    }
    if (str[i] === '{') {
      flushText();
      const endBrace = findMatchingBrace(str, i);
      const rawExpr = str.slice(i + 1, endBrace).trim();
      if (rawExpr && !/^\/\*[\s\S]*\*\/$/.test(rawExpr)) {
        children.push(transpileJsxToCreateElement(rawExpr));
      }
      i = endBrace + 1;
      continue;
    }
    if (str[i] === '<') {
      flushText();
      const child = parseJsxElement(str, i);
      if (!child) return null;
      children.push(child.code);
      i = child.nextIdx;
      continue;
    }
    textBuf += str[i];
    i += 1;
  }

  const args = [tagExpr, propsCode, ...children].join(', ');
  return { code: `React.createElement(${args})`, nextIdx: i };
}

export function transpileJsxToCreateElement(input) {
  let i = 0;
  let out = '';
  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === '/' && next === '/') {
      const nl = input.indexOf('\n', i);
      if (nl === -1) {
        out += input.slice(i);
        break;
      }
      out += input.slice(i, nl + 1);
      i = nl + 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = input.indexOf('*/', i + 2);
      if (end === -1) {
        out += input.slice(i);
        break;
      }
      out += input.slice(i, end + 2);
      i = end + 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < input.length) {
        const c = input[i];
        out += c;
        i += 1;
        if (c === '\\') {
          if (i < input.length) {
            out += input[i];
            i += 1;
          }
          continue;
        }
        if (c === quote) break;
      }
      continue;
    }
    if (ch === '<') {
      const prevNonSpace = out.trimEnd().slice(-1);
      const prevWordMatch = out.trimEnd().match(/([a-zA-Z0-9_$]+)$/);
      const prevWord = prevWordMatch ? prevWordMatch[1] : '';
      const isAfterValue =
        /[a-zA-Z0-9_$\])]/.test(prevNonSpace) &&
        !['return', 'case', 'else'].includes(prevWord);
      const fragMatch = input.slice(i).match(/^<>/);
      const tagMatch = input.slice(i).match(/^<([a-zA-Z_][a-zA-Z0-9_.]*)(?=[\s/>])/);
      if (!isAfterValue && (fragMatch || tagMatch)) {
        const parsed = parseJsxElement(input, i);
        if (parsed) {
          out += parsed.code;
          i = parsed.nextIdx;
          continue;
        }
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

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
    if (specifier === 'react') {
      return {
        url: `data:text/javascript,${encodeURIComponent(REACT_SHIM_SOURCE)}`,
        shortCircuit: true,
      };
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL &&
      context.parentURL.startsWith('file:')
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      if (specifier.endsWith('.css')) {
        return {
          url: 'data:text/javascript,export default {};',
          shortCircuit: true,
        };
      }
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
    if (url.startsWith('file:') && url.endsWith('.tsx')) {
      const absPath = fileURLToPath(url);
      const rawTsx = fs.readFileSync(absPath, 'utf8');
      const withCreateElement = transpileJsxToCreateElement(rawTsx);
      const withReactImport = /\bimport\s+React\b/.test(withCreateElement)
        ? withCreateElement
        : `import React from 'react';\n${withCreateElement}`;
      const stripped = module.stripTypeScriptTypes(withReactImport, {
        mode: 'strip',
        sourceUrl: absPath.replace(/\.tsx$/, '.ts'),
      });
      return {
        format: 'module',
        source: stripped,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

/**
 * Transforms a read-only TypeScript, TSX, or JSON file from `src/` into browser-loadable
 * ES module JavaScript without modifying any source file on disk.
 */
export function transformRepoFileForBrowser(absFilePath, repoRoot) {
  if (absFilePath.endsWith('.json')) {
    const raw = fs.readFileSync(absFilePath, 'utf8');
    return `export default ${raw};\n`;
  }
  if (absFilePath.endsWith('.css')) {
    return 'export default {};\n';
  }

  let rawSource = fs.readFileSync(absFilePath, 'utf8');
  if (absFilePath.endsWith('.tsx')) {
    rawSource = transpileJsxToCreateElement(rawSource);
    if (!/\bimport\s+React\b/.test(rawSource)) {
      rawSource = `import React from 'react';\n${rawSource}`;
    }
  }

  const stripped = module.stripTypeScriptTypes(rawSource, {
    mode: 'strip',
    sourceUrl: path.relative(repoRoot, absFilePath).replace(/\.tsx$/, '.ts'),
  });

  const fileDir = path.dirname(absFilePath);

  return stripped
    .replace(
      /from\s+['"]react['"]/g,
      "from '/__react_shim.js'",
    )
    .replace(
      /from\s+['"]zod['"]/g,
      "from '/__zod_shim.js'",
    )
    .replace(
      /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.\.?\/[^'"]+)(['"])/g,
      (fullMatch, prefix, specifier, suffix) => {
        if (specifier.endsWith('.css')) {
          return `${prefix}/__empty_css.js${suffix}`;
        }
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
