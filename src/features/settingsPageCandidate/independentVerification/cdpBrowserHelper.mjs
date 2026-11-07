import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const projectRoot = resolve(__dirname, '../../../..');

export const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

export const PRESET_IDS = [
  'default-local-studio',
  'signed-in-active-instructor',
  'ios-safari-no-korean-voice',
  'unsupported-host-update-ready',
  'storage-warning-stale-preview',
  'adversarial-untrusted-input',
];

const KEY_DEFINITIONS = {
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
};

export function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not find a local chromium or google-chrome binary.');
}

export async function collectCandidateSourceMetrics(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectCandidateSourceMetrics(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath, 'utf8');
      const fileStat = await stat(fullPath);
      files.push({
        path: relative(projectRoot, fullPath),
        lines: content.split('\n').length,
        bytes: fileStat.size,
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function launchCdpBrowser(prefix = 'pf-settings-cdp-') {
  const chromeBin = findChromeBinary();
  const userDataDir = await mkdtemp(join(os.tmpdir(), prefix));
  const proc = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const wsEndpoint = await new Promise((resolveWs, rejectWs) => {
    let stderrText = '';
    const timeout = setTimeout(() => {
      rejectWs(new Error(`Timed out waiting for Chrome DevTools endpoint. stderr: ${stderrText}`));
    }, 10_000);

    proc.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8');
      const match = stderrText.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolveWs(match[1]);
      }
    });

    proc.once('exit', (code) => {
      clearTimeout(timeout);
      rejectWs(new Error(`Chromium exited early with code ${code}. stderr: ${stderrText}`));
    });
  });

  const ws = new WebSocket(wsEndpoint);
  await new Promise((res, rej) => {
    ws.addEventListener('open', () => res(), { once: true });
    ws.addEventListener('error', (err) => rej(err), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Map();

  ws.addEventListener('message', (event) => {
    const data = typeof event.data === 'string' ? event.data : event.data.toString('utf8');
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject: rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        rej(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        res(msg.result);
      }
      return;
    }
    if (msg.method) {
      const listeners = eventListeners.get(msg.method) || [];
      for (const listener of listeners) {
        listener(msg.params, msg.sessionId);
      }
    }
  });

  const send = (method, params = {}, sessionId = undefined) =>
    new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, { resolve: res, reject: rej });
      const payload = sessionId ? { id, sessionId, method, params } : { id, method, params };
      ws.send(JSON.stringify(payload));
    });

  const onEvent = (method, handler) => {
    const list = eventListeners.get(method) || [];
    list.push(handler);
    eventListeners.set(method, list);
  };

  return {
    chromeBin,
    driverKind: 'cdp-native-chromium',
    async newPage({ width, height, reducedMotion = false }) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', {
        targetId,
        flatten: true,
      });

      const pageErrors = [];
      onEvent('Runtime.exceptionThrown', (params, sid) => {
        if (sid === sessionId) {
          const details = params?.exceptionDetails;
          pageErrors.push(
            details?.exception?.description || details?.text || 'Uncaught page exception',
          );
        }
      });

      await send('Page.enable', {}, sessionId);
      await send('Runtime.enable', {}, sessionId);
      await send('DOM.enable', {}, sessionId);
      await send(
        'Emulation.setDeviceMetricsOverride',
        { width, height, deviceScaleFactor: 1, mobile: width < 768 },
        sessionId,
      );
      await send(
        'Emulation.setEmulatedMedia',
        {
          features: [
            {
              name: 'prefers-reduced-motion',
              value: reducedMotion ? 'reduce' : 'no-preference',
            },
          ],
        },
        sessionId,
      );

      const evaluate = async (fnOrExpr, ...args) => {
        const expression =
          typeof fnOrExpr === 'function'
            ? `(${fnOrExpr.toString()})(...${JSON.stringify(args)})`
            : String(fnOrExpr);
        const res = await send(
          'Runtime.evaluate',
          {
            expression,
            awaitPromise: true,
            returnByValue: true,
          },
          sessionId,
        );
        if (res.exceptionDetails) {
          throw new Error(
            res.exceptionDetails.exception?.description ||
              res.exceptionDetails.text ||
              'Evaluation failed',
          );
        }
        return res.result?.value;
      };

      const waitForFunction = async (fn, arg, timeoutMs = 10_000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const ok = await evaluate(fn, arg);
          if (ok) return ok;
          await new Promise((r) => setTimeout(r, 35));
        }
        throw new Error(`Timed out waiting for condition: ${fn.toString()}`);
      };

      return {
        pageErrors,
        evaluate,
        waitForFunction,
        async setReducedMotionMedia(reduced) {
          await send(
            'Emulation.setEmulatedMedia',
            {
              features: [
                {
                  name: 'prefers-reduced-motion',
                  value: reduced ? 'reduce' : 'no-preference',
                },
              ],
            },
            sessionId,
          );
        },
        async goto(url) {
          await send('Page.navigate', { url }, sessionId);
          await waitForFunction(() => document.readyState === 'complete');
        },
        async pressKey(keyName) {
          const def = KEY_DEFINITIONS[keyName] || {
            key: keyName,
            code: keyName,
            keyCode: 0,
          };
          await send(
            'Input.dispatchKeyEvent',
            {
              type: 'rawKeyDown',
              key: def.key,
              code: def.code,
              windowsVirtualKeyCode: def.keyCode,
              nativeVirtualKeyCode: def.keyCode,
            },
            sessionId,
          );
          await send(
            'Input.dispatchKeyEvent',
            {
              type: 'keyUp',
              key: def.key,
              code: def.code,
              windowsVirtualKeyCode: def.keyCode,
              nativeVirtualKeyCode: def.keyCode,
            },
            sessionId,
          );
        },
        async screenshot(filePath) {
          const { data } = await send(
            'Page.captureScreenshot',
            { format: 'png', captureBeyondViewport: false },
            sessionId,
          );
          await writeFile(filePath, Buffer.from(data, 'base64'));
        },
        async close() {
          try {
            await send('Target.closeTarget', { targetId });
          } catch {
            // ignore target close error
          }
        },
      };
    },
    async close() {
      try {
        ws.close();
      } catch {
        // ignore ws close
      }
      proc.kill('SIGTERM');
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}
