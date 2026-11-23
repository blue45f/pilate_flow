import type { ApparatusType } from '../types/pilates';
import { normalizeDualScreenRoomCode } from './dualScreenSyncEngine';
import { generateLocalQrCodeSvg } from './localQrSequenceShare';

export type ApparatusDeepLinkMode = 'live' | 'workbench' | 'atlas' | 'member-display';

export interface ApparatusDeepLinkPayload {
  apparatus?: ApparatusType;
  mode?: ApparatusDeepLinkMode;
  roomCode?: string;
  sequenceId?: string;
}

export interface ApparatusNfcWriteResult {
  ok: boolean;
  messageKo: string;
}

export interface ApparatusNfcScanResult {
  ok: boolean;
  stop: () => void;
  messageKo: string;
}

interface WebNfcRecord {
  readonly recordType: string;
  readonly mediaType?: string;
  readonly encoding?: string;
  readonly data?: DataView | ArrayBuffer | string;
}

interface WebNfcMessage {
  readonly records: ReadonlyArray<WebNfcRecord>;
}

interface WebNfcReadingEvent extends Event {
  readonly serialNumber?: string;
  readonly message: WebNfcMessage;
}

interface WebNfcWriteMessage {
  readonly records: ReadonlyArray<{
    readonly recordType: 'url' | 'text';
    readonly data: string;
  }>;
}

interface WebNfcReaderInstance {
  onreading: ((event: WebNfcReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  addEventListener?: (type: string, listener: (event: WebNfcReadingEvent) => void) => void;
  removeEventListener?: (type: string, listener: (event: WebNfcReadingEvent) => void) => void;
  write(message: WebNfcWriteMessage | string): Promise<void>;
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}

type WebNfcReaderConstructor = new () => WebNfcReaderInstance;

const VALID_APPARATUS_LIST: readonly ApparatusType[] = [
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
];

const VALID_APPARATUS_SET: ReadonlySet<string> = new Set(VALID_APPARATUS_LIST);

const VALID_MODES: ReadonlySet<string> = new Set<ApparatusDeepLinkMode>([
  'live',
  'workbench',
  'atlas',
  'member-display',
]);

const DEFAULT_FALLBACK_ORIGIN = 'https://pilates-flow-atelier.web.app';
const SAFE_SEQUENCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

function getNdefReaderConstructor(): WebNfcReaderConstructor | null {
  if (typeof window === 'undefined' || !('NDEFReader' in window)) {
    return null;
  }
  const ctor = (window as unknown as { NDEFReader?: unknown }).NDEFReader;
  if (typeof ctor !== 'function') {
    return null;
  }
  return ctor as WebNfcReaderConstructor;
}

export function isWebNfcSupported(): boolean {
  return getNdefReaderConstructor() !== null;
}

function resolveBaseUrl(baseOrigin: string): URL {
  const trimmed = baseOrigin.trim();
  if (trimmed) {
    try {
      return new URL(trimmed);
    } catch {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        // Fall through to studio default origin
      }
    }
  }
  return new URL(DEFAULT_FALLBACK_ORIGIN);
}

export function buildApparatusDeepLinkUrl(
  baseOrigin: string,
  payload: ApparatusDeepLinkPayload,
): string {
  const url = resolveBaseUrl(baseOrigin);
  url.search = '';
  url.hash = '';

  const params = new URLSearchParams();

  if (payload.mode === 'member-display') {
    params.set('display', 'member-stage');
  } else if (payload.mode && VALID_MODES.has(payload.mode)) {
    params.set('mode', payload.mode);
  }

  if (payload.apparatus && VALID_APPARATUS_SET.has(payload.apparatus)) {
    params.set('apparatus', payload.apparatus);
  }

  if (payload.roomCode) {
    const normalizedRoom = normalizeDualScreenRoomCode(payload.roomCode);
    if (normalizedRoom) {
      params.set('room', normalizedRoom);
    }
  }

  if (payload.sequenceId) {
    const trimmedSeq = payload.sequenceId.trim();
    if (trimmedSeq && SAFE_SEQUENCE_ID_PATTERN.test(trimmedSeq)) {
      params.set('sequence', trimmedSeq);
    }
  }

  const query = params.toString();
  url.search = query ? `?${query}` : '';
  return url.toString();
}

export function parseApparatusDeepLink(search: string): ApparatusDeepLinkPayload | null {
  const trimmed = search.trim();
  if (!trimmed) return null;

  let queryPart = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      queryPart = new URL(trimmed).search;
    } catch {
      return null;
    }
  } else {
    const questionIndex = trimmed.indexOf('?');
    if (questionIndex >= 0) {
      queryPart = trimmed.slice(questionIndex + 1);
    }
    const hashIndex = queryPart.indexOf('#');
    if (hashIndex >= 0) {
      queryPart = queryPart.slice(0, hashIndex);
    }
  }

  const params = new URLSearchParams(queryPart);
  const payload: ApparatusDeepLinkPayload = {};

  const rawApparatus = params.get('apparatus')?.trim().toLowerCase() ?? '';
  if (VALID_APPARATUS_SET.has(rawApparatus)) {
    payload.apparatus = rawApparatus as ApparatusType;
  }

  const rawDisplay = params.get('display')?.trim().toLowerCase() ?? '';
  const rawMode = params.get('mode')?.trim().toLowerCase() ?? '';
  if (rawDisplay === 'member-stage' || rawMode === 'member-display') {
    payload.mode = 'member-display';
  } else if (VALID_MODES.has(rawMode)) {
    payload.mode = rawMode as ApparatusDeepLinkMode;
  }

  const rawRoom = params.get('room') ?? params.get('roomCode') ?? '';
  const normalizedRoom = normalizeDualScreenRoomCode(rawRoom);
  if (normalizedRoom.length >= 2) {
    payload.roomCode = normalizedRoom;
  }

  const rawSequence = (params.get('sequence') ?? params.get('sequenceId') ?? '').trim();
  if (rawSequence && SAFE_SEQUENCE_ID_PATTERN.test(rawSequence)) {
    payload.sequenceId = rawSequence;
  }

  if (
    payload.apparatus === undefined &&
    payload.mode === undefined &&
    payload.roomCode === undefined &&
    payload.sequenceId === undefined
  ) {
    return null;
  }

  return payload;
}

function isValidHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function decodeNfcRecordText(record: WebNfcRecord): string {
  if (!record.data) return '';
  if (typeof record.data === 'string') return record.data;
  const decoder = new TextDecoder(record.encoding || 'utf-8');
  if (record.data instanceof ArrayBuffer) {
    return decoder.decode(record.data);
  }
  if (ArrayBuffer.isView(record.data)) {
    return decoder.decode(record.data);
  }
  return '';
}

function formatNfcErrorKo(error: unknown, action: 'write' | 'scan'): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError') {
    return action === 'write'
      ? 'NFC 쓰기 권한이 허용되지 않았습니다. 브라우저 권한을 확인하거나 아래 QR 태그 카드를 이용해 주세요.'
      : 'NFC 스캔 권한이 허용되지 않았습니다. 기구 QR 코드를 카메라로 스캔해 주세요.';
  }
  if (name === 'AbortError') {
    return action === 'write'
      ? 'NFC 태그 쓰기가 취소되었습니다.'
      : 'NFC 태그 스캔을 중지했습니다.';
  }
  if (name === 'NotSupportedError') {
    return '이 기기나 브라우저에서는 Web NFC 기능을 사용할 수 없습니다. 아래 QR 인쇄·링크 복사를 이용해 주세요.';
  }
  return action === 'write'
    ? 'NFC 태그에 기록하지 못했습니다. 태그가 읽기 전용이 아닌지 확인하거나 QR 카드로 부착해 주세요.'
    : 'NFC 태그를 읽지 못했습니다. 스마트폰 뒷면을 태그에 다시 가까이 대 주세요.';
}

export async function writeApparatusNfcTag(url: string): Promise<ApparatusNfcWriteResult> {
  const trimmedUrl = url.trim();
  if (!isValidHttpUrl(trimmedUrl)) {
    return {
      ok: false,
      messageKo: '유효한 실행 링크(http/https)가 필요합니다.',
    };
  }

  const NdefReaderCtor = getNdefReaderConstructor();
  if (!NdefReaderCtor) {
    return {
      ok: false,
      messageKo:
        '현재 브라우저(iOS Safari·데스크톱 등)는 Web NFC 쓰기를 지원하지 않습니다. 아래 QR 태그 카드를 인쇄하거나 링크를 복사해 기구에 부착해 주세요.',
    };
  }

  try {
    const reader = new NdefReaderCtor();
    await reader.write({
      records: [{ recordType: 'url', data: trimmedUrl }],
    });
    return {
      ok: true,
      messageKo: '기구 NFC 태그에 바로 실행 링크를 기록했습니다. 스마트폰을 태그에 대면 즉시 열립니다.',
    };
  } catch (error) {
    return {
      ok: false,
      messageKo: formatNfcErrorKo(error, 'write'),
    };
  }
}

export async function scanApparatusNfcTag(
  onDetected: (payload: ApparatusDeepLinkPayload) => void,
): Promise<ApparatusNfcScanResult> {
  const NdefReaderCtor = getNdefReaderConstructor();
  if (!NdefReaderCtor) {
    return {
      ok: false,
      stop: () => {},
      messageKo:
        '현재 브라우저에서는 Web NFC 스캔을 지원하지 않습니다. 기구에 부착된 QR 코드를 카메라로 스캔해 주세요.',
    };
  }

  const abortController = typeof AbortController === 'function' ? new AbortController() : null;
  let stopped = false;

  try {
    const reader = new NdefReaderCtor();
    const handleReading = (event: WebNfcReadingEvent) => {
      if (stopped || !event?.message?.records) return;
      for (const record of event.message.records) {
        if (
          record.recordType !== 'url' &&
          record.recordType !== 'text' &&
          record.recordType !== 'absolute-url'
        ) {
          continue;
        }
        const rawText = decodeNfcRecordText(record);
        const parsed = parseApparatusDeepLink(rawText);
        if (parsed) {
          onDetected(parsed);
          break;
        }
      }
    };

    if (typeof reader.addEventListener === 'function') {
      reader.addEventListener('reading', handleReading);
    } else {
      reader.onreading = handleReading;
    }

    await reader.scan(abortController ? { signal: abortController.signal } : undefined);

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (typeof reader.removeEventListener === 'function') {
        reader.removeEventListener('reading', handleReading);
      }
      if (reader.onreading === handleReading) {
        reader.onreading = null;
      }
      abortController?.abort();
    };

    return {
      ok: true,
      stop,
      messageKo: 'NFC 태그를 찾고 있습니다. 스마트폰 뒷면을 기구 태그에 가까이 대 주세요.',
    };
  } catch (error) {
    return {
      ok: false,
      stop: () => {},
      messageKo: formatNfcErrorKo(error, 'scan'),
    };
  }
}

function escapeXmlText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFallbackCardSvg(label: string): string {
  const safeLabel = escapeXmlText(label.slice(0, 48) || '기구 바로 실행 태그');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" role="img" aria-label="기구 딥링크 카드">',
    '<rect width="220" height="220" rx="14" fill="#FAF8F4" stroke="#D5DDD0" stroke-width="2"/>',
    '<rect x="24" y="24" width="172" height="128" rx="10" fill="#FFFFFF" stroke="#355441" stroke-width="2"/>',
    '<text x="110" y="92" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="#1E3129">NFC · QR</text>',
    `<text x="110" y="182" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#3D4F45">${safeLabel}</text>`,
    '</svg>',
  ].join('');
}

/**
 * Generates an offline, zero-network SVG QR code data URL for apparatus tags and dual-screen links.
 */
export function buildSimpleQrDataUrl(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildFallbackCardSvg('링크 준비 중'))}`;
  }

  try {
    const qr = generateLocalQrCodeSvg(trimmed, {
      quietZone: 4,
      darkFill: '#1E3129',
      lightFill: '#FAF8F4',
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svgMarkup)}`;
  } catch {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildFallbackCardSvg(trimmed))}`;
  }
}
