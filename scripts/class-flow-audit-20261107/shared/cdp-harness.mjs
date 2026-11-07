/**
 * Zero-dependency Chromium CDP + Vite test server harness.
 * Launches isolated temporary Chromium instances and cleans up strictly on exit.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
    srv.on('error', reject);
  });
}

export async function waitForHttpReady(url, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (err) {
      lastErr = err;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastErr?.message || 'not ready'}`);
}

export async function startViteTestServer(projectRoot) {
  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const viteBin = path.join(projectRoot, 'node_modules', '.bin', 'vite');
  const proc = spawn(
    viteBin,
    ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    },
  );

  let stderrBuf = '';
  proc.stderr?.on('data', (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForHttpReady(url, 25000);
  } catch (err) {
    try {
      proc.kill('SIGTERM');
    } catch {}
    throw new Error(`Failed to start Vite server on ${url}: ${err.message}\n${stderrBuf}`);
  }

  const stop = async () => {
    if (proc.exitCode !== null) return;
    try {
      proc.kill('SIGTERM');
    } catch {}
    await Promise.race([
      new Promise((resolve) => proc.once('exit', resolve)),
      sleep(2000).then(() => {
        try {
          if (proc.exitCode === null) proc.kill('SIGKILL');
        } catch {}
      }),
    ]);
  };

  return { port, url, proc, stop };
}

export class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(`CDP ${method} error: ${JSON.stringify(msg.error)}`));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method);
        if (listeners) {
          for (const fn of [...listeners]) {
            try {
              fn(msg.params);
            } catch {}
          }
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, new Set());
    }
    this.eventListeners.get(method).add(fn);
    return () => this.eventListeners.get(method)?.delete(fn);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${
          res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text ||
          JSON.stringify(res.exceptionDetails)
        }`,
      );
    }
    return res.result?.value;
  }

  async setViewport({ width, height, deviceScaleFactor = 1, mobile = false, pageScaleFactor = 1 }) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      scale: pageScaleFactor,
    });
    await this.send(
      'Emulation.setTouchEmulationEnabled',
      mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
    );
  }

  async screenshot(filePath, clip = undefined) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const params = { format: 'png', captureBeyondViewport: false };
    if (clip) {
      params.clip = { ...clip, scale: clip.scale ?? 1 };
    }
    const { data } = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return filePath;
  }

  async waitForReady(selector = '#main-content', timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const ok = await this.eval(
          `Boolean(document.readyState === 'complete' && document.querySelector(${JSON.stringify(selector)}))`,
        );
        if (ok) return true;
      } catch {}
      await sleep(150);
    }
    return false;
  }

  async close() {
    try {
      this.ws.close();
    } catch {}
  }
}

export async function launchChromiumBrowser(label = 'audit') {
  const debugPort = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `pf-audit-${label}-`));
  const chromiumBin = fs.existsSync('/usr/bin/chromium')
    ? '/usr/bin/chromium'
    : '/usr/bin/google-chrome';

  const proc = spawn(
    chromiumBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--no-zygote',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      '--renderer-process-limit=2',
      '--js-flags=--max-old-space-size=256',
      '--window-size=1440,900',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );

  await waitForHttpReady(`http://127.0.0.1:${debugPort}/json/version`, 15000);

  const openPage = async (url = 'about:blank') => {
    const putRes = await fetch(`http://127.0.0.1:${debugPort}/json/new`, {
      method: 'PUT',
    });
    const target = await putRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const session = new CdpSession(ws);
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('DOM.enable');
    if (url && url !== 'about:blank') {
      await session.send('Page.navigate', { url });
      await session.waitForReady('#main-content', 15000);
      await sleep(300);
    }
    return { session, targetId: target.id };
  };

  const closeTarget = async (targetId) => {
    try {
      await fetch(`http://127.0.0.1:${debugPort}/json/close/${targetId}`);
    } catch {}
  };

  const close = async () => {
    if (proc.exitCode === null) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {
        try {
          proc.kill('SIGTERM');
        } catch {}
      }
      await Promise.race([
        new Promise((resolve) => proc.once('exit', resolve)),
        sleep(1500).then(() => {
          try {
            if (proc.exitCode === null) process.kill(-proc.pid, 'SIGKILL');
          } catch {
            try {
              if (proc.exitCode === null) proc.kill('SIGKILL');
            } catch {}
          }
        }),
      ]);
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  };

  return { debugPort, userDataDir, proc, openPage, closeTarget, close };
}
