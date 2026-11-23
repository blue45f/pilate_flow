import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildApparatusDeepLinkUrl,
  buildSimpleQrDataUrl,
  isWebNfcSupported,
  parseApparatusDeepLink,
  scanApparatusNfcTag,
  writeApparatusNfcTag,
  type ApparatusDeepLinkPayload,
} from './apparatusNfcDeepLink';

describe('apparatusNfcDeepLink', () => {
  const hadNdefReader = 'NDEFReader' in window;
  const originalNdefReader = (window as unknown as { NDEFReader?: unknown }).NDEFReader;

  afterEach(() => {
    if (hadNdefReader) {
      Object.defineProperty(window, 'NDEFReader', {
        configurable: true,
        writable: true,
        value: originalNdefReader,
      });
    } else {
      delete (window as unknown as { NDEFReader?: unknown }).NDEFReader;
    }
    vi.restoreAllMocks();
  });

  it('builds and parses apparatus deep links accurately with full round-trip fidelity', () => {
    const url = buildApparatusDeepLinkUrl('https://pilates-flow-atelier.web.app', {
      apparatus: 'cadillac',
      mode: 'live',
      sequenceId: 'seq-cadillac-50',
    });

    expect(url).toBe(
      'https://pilates-flow-atelier.web.app/?mode=live&apparatus=cadillac&sequence=seq-cadillac-50',
    );
    expect(parseApparatusDeepLink(new URL(url).search)).toEqual({
      apparatus: 'cadillac',
      mode: 'live',
      sequenceId: 'seq-cadillac-50',
    });
    expect(parseApparatusDeepLink(url)).toEqual({
      apparatus: 'cadillac',
      mode: 'live',
      sequenceId: 'seq-cadillac-50',
    });
  });

  it('builds and parses member dual-display stage URLs (?display=member-stage&room=XXXX)', () => {
    const displayUrl = buildApparatusDeepLinkUrl('https://studio.example.com/', {
      mode: 'member-display',
      roomCode: 'a7k2',
    });

    expect(displayUrl).toBe('https://studio.example.com/?display=member-stage&room=A7K2');
    expect(parseApparatusDeepLink('?display=member-stage&room=a7k2')).toEqual({
      mode: 'member-display',
      roomCode: 'A7K2',
    });
  });

  it('returns null for empty or unrelated query strings and strips invalid parameters', () => {
    expect(parseApparatusDeepLink('')).toBeNull();
    expect(parseApparatusDeepLink('?utm_source=pwa-member&role=member')).toBeNull();
    expect(parseApparatusDeepLink('?apparatus=trampoline&mode=unknown')).toBeNull();
    expect(parseApparatusDeepLink('?apparatus=chair&mode=unknown')).toEqual({
      apparatus: 'chair',
    });
  });

  it('detects Web NFC support and returns Korean fallback guidance when unsupported', async () => {
    delete (window as unknown as { NDEFReader?: unknown }).NDEFReader;
    expect(isWebNfcSupported()).toBe(false);

    const writeRes = await writeApparatusNfcTag(
      'https://pilates-flow-atelier.web.app/?apparatus=reformer&mode=live',
    );
    expect(writeRes.ok).toBe(false);
    expect(writeRes.messageKo).toContain('QR');

    const scanRes = await scanApparatusNfcTag(vi.fn());
    expect(scanRes.ok).toBe(false);
    expect(typeof scanRes.stop).toBe('function');
    expect(scanRes.messageKo).toContain('QR');
  });

  it('writes NDEF URL record when Web NFC NDEFReader is available', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    class MockNDEFReader {
      onreading = null;
      onreadingerror = null;
      write = writeMock;
      scan = vi.fn().mockResolvedValue(undefined);
    }
    Object.defineProperty(window, 'NDEFReader', {
      configurable: true,
      writable: true,
      value: MockNDEFReader,
    });

    expect(isWebNfcSupported()).toBe(true);

    const url = 'https://pilates-flow-atelier.web.app/?mode=workbench&apparatus=barrel';
    const result = await writeApparatusNfcTag(url);
    expect(result.ok).toBe(true);
    expect(writeMock).toHaveBeenCalledWith({
      records: [{ recordType: 'url', data: url }],
    });

    const invalidResult = await writeApparatusNfcTag('javascript:alert(1)');
    expect(invalidResult.ok).toBe(false);
  });

  it('scans NDEF URL records via NDEFReader and stops cleanly', async () => {
    let readingHandler: ((event: unknown) => void) | null = null;
    let capturedSignal: AbortSignal | undefined;

    class MockNDEFReader {
      onreading: ((event: unknown) => void) | null = null;
      onreadingerror = null;
      addEventListener(type: string, cb: (event: unknown) => void) {
        if (type === 'reading') readingHandler = cb;
      }
      removeEventListener(type: string, cb: (event: unknown) => void) {
        if (type === 'reading' && readingHandler === cb) readingHandler = null;
      }
      write = vi.fn().mockResolvedValue(undefined);
      scan = vi.fn().mockImplementation(async (opts?: { signal?: AbortSignal }) => {
        capturedSignal = opts?.signal;
      });
    }

    Object.defineProperty(window, 'NDEFReader', {
      configurable: true,
      writable: true,
      value: MockNDEFReader,
    });

    const detected: ApparatusDeepLinkPayload[] = [];
    const session = await scanApparatusNfcTag((payload) => detected.push(payload));
    expect(session.ok).toBe(true);
    expect(readingHandler).toBeTruthy();

    const encodedUrl = new TextEncoder().encode(
      'https://pilates-flow-atelier.web.app/?apparatus=mat&mode=atlas',
    );
    const readingCallback = readingHandler as unknown as (event: unknown) => void;
    readingCallback({
      message: {
        records: [{ recordType: 'url', data: new DataView(encodedUrl.buffer) }],
      },
    });

    expect(detected).toEqual([{ apparatus: 'mat', mode: 'atlas' }]);

    session.stop();
    expect(capturedSignal?.aborted).toBe(true);
    expect(readingHandler).toBeNull();
  });

  it('builds deterministic offline SVG QR data URLs without external requests', () => {
    const targetUrl = 'https://pilates-flow-atelier.web.app/?mode=live&apparatus=reformer';
    const dataUrl = buildSimpleQrDataUrl(targetUrl);

    expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    const decodedSvg = decodeURIComponent(dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
    expect(decodedSvg).toContain('<svg');
    expect(decodedSvg).toContain('<path');
    expect(decodedSvg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
    expect(decodedSvg).not.toContain('https://api.');

    // Fallback path for empty string never throws
    const emptyFallback = buildSimpleQrDataUrl('');
    expect(emptyFallback.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });
});
