import { readFileSync, realpathSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv; charset=utf-8',
  '.ico': 'image/x-icon',
};

function isContainedFile(root, filename) {
  const relative = path.relative(root, filename);
  return relative !== '' && relative !== '..' &&
    !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function parseRequestPath(requestUrl) {
  const parsed = new URL(requestUrl || '/', 'http://127.0.0.1');
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname.includes('\0')) throw new URIError('Invalid path');
  return pathname === '/' ? '/index.html' : pathname;
}

function readContainedFile(root, pathname) {
  const candidate = path.resolve(root, '.' + pathname);
  if (!isContainedFile(root, candidate)) return null;
  try {
    const canonicalFile = realpathSync(candidate);
    if (!isContainedFile(root, canonicalFile) || !statSync(canonicalFile).isFile()) return null;
    return {
      body: readFileSync(canonicalFile),
      contentType: MIME_TYPES[path.extname(candidate)] || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

function sendText(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(body);
}

// Local QA only. The build root is trusted and remains filesystem-stable while
// serving; request paths and symlinks cannot select files outside that root.
export function createControllableStaticServer(distRoot) {
  const canonicalRoot = realpathSync(distRoot);
  if (!statSync(canonicalRoot).isDirectory()) throw new Error('Build root must be a directory');
  let rejectAllNetworkRequests = false;
  const sockets = new Set();

  const server = http.createServer((request, response) => {
    if (rejectAllNetworkRequests) {
      request.socket.destroy();
      return;
    }
    let pathname;
    try {
      pathname = parseRequestPath(request.url);
    } catch {
      sendText(response, 400, 'Bad request');
      return;
    }
    const file = readContainedFile(canonicalRoot, pathname);
    if (!file) {
      sendText(response, 404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': file.contentType,
      'Cache-Control': 'no-cache',
    });
    response.end(file.body);
  });

  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return {
    setOffline(offline) {
      rejectAllNetworkRequests = Boolean(offline);
      if (rejectAllNetworkRequests) {
        for (const socket of sockets) socket.destroy();
      }
    },
    listen() {
      return new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
        server.on('error', reject);
      });
    },
    close() {
      for (const socket of sockets) socket.destroy();
      return new Promise(resolve => server.close(() => resolve()));
    },
  };
}
