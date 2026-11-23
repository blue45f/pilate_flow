import type { ApparatusType } from '../types/pilates';

export type DualScreenRole = 'controller' | 'display';

export type DualScreenCommandType = 'prev' | 'next' | 'toggle-play' | 'jump-step';

export interface DualScreenStageSnapshot {
  roomCode: string;
  updatedAt: number;
  sequenceTitle: string;
  stepIndex: number;
  totalSteps: number;
  exerciseId: string;
  exerciseNameKo: string;
  apparatus: ApparatusType;
  springs: string;
  nextExerciseNameKo: string;
  nextSprings: string;
  cueLine: string;
  timerRemainingSec: number;
  running: boolean;
  phaseLabelKo: string;
}

export type DualScreenStageSnapshotInput =
  | DualScreenStageSnapshot
  | Omit<DualScreenStageSnapshot, 'roomCode' | 'updatedAt'>;

export interface DualScreenCommand {
  type: DualScreenCommandType;
  stepIndex?: number;
  issuedAt: number;
}

export type DualScreenTransportMode =
  | 'broadcast-channel'
  | 'storage-fallback'
  | 'webrtc-p2p'
  | 'local-only';

export type DualScreenWebRtcStatus =
  | 'idle'
  | 'offer-ready'
  | 'answer-ready'
  | 'connecting'
  | 'connected'
  | 'unsupported'
  | 'failed'
  | 'closed';

export interface DualScreenConnectionState {
  roomCode: string;
  role: DualScreenRole;
  transport: DualScreenTransportMode;
  broadcastSupported: boolean;
  storageFallbackActive: boolean;
  webrtcSupported: boolean;
  webrtcStatus: DualScreenWebRtcStatus;
  connectedPeers: number;
  lastSyncedAt: number | null;
  closed: boolean;
}

export interface WebRtcSignalEnvelope {
  v: 1;
  type: 'offer' | 'answer';
  roomCode: string;
  sdp: string;
}

export interface WebRtcSignalResult {
  ok: boolean;
  code: string;
  messageKo: string;
  fallbackOnly?: boolean;
}

export interface WebRtcCompleteResult {
  ok: boolean;
  messageKo: string;
  fallbackOnly?: boolean;
}

export interface DualScreenChannelOptions {
  iceServers?: RTCIceServer[];
  iceGatheringTimeoutMs?: number;
}

export interface DualScreenChannel {
  readonly roomCode: string;
  readonly role: DualScreenRole;
  publishSnapshot(snapshot: DualScreenStageSnapshotInput): DualScreenStageSnapshot;
  sendCommand(command: DualScreenCommand): void;
  requestSync(): void;
  onSnapshot(listener: (snapshot: DualScreenStageSnapshot) => void): () => void;
  onCommand(listener: (command: DualScreenCommand) => void): () => void;
  onConnectionStateChange(listener: (state: DualScreenConnectionState) => void): () => void;
  getConnectionState(): DualScreenConnectionState;
  createWebRtcOffer(): Promise<WebRtcSignalResult>;
  acceptWebRtcOfferAndCreateAnswer(offerCode: string): Promise<WebRtcSignalResult>;
  completeWebRtcAnswer(answerCode: string): Promise<WebRtcCompleteResult>;
  close(): void;
}

type DualScreenWireMessage =
  | {
      kind: 'snapshot';
      messageId: string;
      roomCode: string;
      senderId: string;
      payload: DualScreenStageSnapshot;
    }
  | {
      kind: 'command';
      messageId: string;
      roomCode: string;
      senderId: string;
      payload: DualScreenCommand;
    }
  | {
      kind: 'sync-request';
      messageId: string;
      roomCode: string;
      senderId: string;
      requestedAt: number;
    };

const VALID_APPARATUS: ReadonlySet<string> = new Set<ApparatusType>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);

const VALID_COMMAND_TYPES: ReadonlySet<string> = new Set<DualScreenCommandType>([
  'prev',
  'next',
  'toggle-play',
  'jump-step',
]);

const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SIGNAL_CODE_PREFIX = 'PF1.';
const MAX_SEEN_MESSAGE_IDS = 120;
const DEFAULT_ICE_GATHERING_TIMEOUT_MS = 1800;

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

let messageSequence = 0;

function createUniqueId(prefix: string): string {
  messageSequence += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${messageSequence.toString(36)}-${rand}`;
}

export function normalizeDualScreenRoomCode(raw: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 8);
}

export function generateDualScreenRoomCode(length = 4): string {
  const safeLength = Math.max(4, Math.min(8, Math.floor(length)));
  const chars: string[] = [];
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(safeLength);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < safeLength; i += 1) {
      chars.push(ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length]!);
    }
    return chars.join('');
  }
  for (let i = 0; i < safeLength; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    chars.push(ROOM_CODE_ALPHABET[idx]!);
  }
  return chars.join('');
}

export function getDualScreenBroadcastName(roomCode: string): string {
  const normalized = normalizeDualScreenRoomCode(roomCode) || 'STUDIO';
  return `pf-dual-screen-${normalized}`;
}

export function getDualScreenSnapshotStorageKey(roomCode: string): string {
  const normalized = normalizeDualScreenRoomCode(roomCode) || 'STUDIO';
  return `pf-dual-screen-${normalized}:snapshot`;
}

export function getDualScreenCommandStorageKey(roomCode: string): string {
  const normalized = normalizeDualScreenRoomCode(roomCode) || 'STUDIO';
  return `pf-dual-screen-${normalized}:command`;
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64UrlUtf8(encoded: string): string | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeWebRtcSignalCode(envelope: WebRtcSignalEnvelope): string {
  const compact = JSON.stringify({
    v: 1,
    type: envelope.type,
    roomCode: normalizeDualScreenRoomCode(envelope.roomCode) || 'STUDIO',
    sdp: envelope.sdp,
  });
  return `${SIGNAL_CODE_PREFIX}${encodeBase64UrlUtf8(compact)}`;
}

export function decodeWebRtcSignalCode(rawCode: string): WebRtcSignalEnvelope | null {
  const trimmed = rawCode.replace(/\s+/g, '');
  if (!trimmed) return null;
  const payloadPart = trimmed.startsWith(SIGNAL_CODE_PREFIX)
    ? trimmed.slice(SIGNAL_CODE_PREFIX.length)
    : trimmed;
  const decodedJson = decodeBase64UrlUtf8(payloadPart);
  if (!decodedJson) return null;

  try {
    const parsed = JSON.parse(decodedJson) as Record<string, unknown>;
    if (
      parsed.v !== 1 ||
      (parsed.type !== 'offer' && parsed.type !== 'answer') ||
      typeof parsed.sdp !== 'string' ||
      parsed.sdp.trim().length === 0
    ) {
      return null;
    }
    const roomCode =
      typeof parsed.roomCode === 'string'
        ? normalizeDualScreenRoomCode(parsed.roomCode) || 'STUDIO'
        : 'STUDIO';
    return {
      v: 1,
      type: parsed.type,
      roomCode,
      sdp: parsed.sdp,
    };
  } catch {
    return null;
  }
}

function isValidSnapshot(value: unknown): value is DualScreenStageSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.roomCode === 'string' &&
    typeof v.updatedAt === 'number' &&
    Number.isFinite(v.updatedAt) &&
    typeof v.sequenceTitle === 'string' &&
    typeof v.stepIndex === 'number' &&
    typeof v.totalSteps === 'number' &&
    typeof v.exerciseId === 'string' &&
    typeof v.exerciseNameKo === 'string' &&
    typeof v.apparatus === 'string' &&
    VALID_APPARATUS.has(v.apparatus) &&
    typeof v.springs === 'string' &&
    typeof v.nextExerciseNameKo === 'string' &&
    typeof v.nextSprings === 'string' &&
    typeof v.cueLine === 'string' &&
    typeof v.timerRemainingSec === 'number' &&
    typeof v.running === 'boolean' &&
    typeof v.phaseLabelKo === 'string'
  );
}

function isValidCommand(value: unknown): value is DualScreenCommand {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== 'string' || !VALID_COMMAND_TYPES.has(v.type)) return false;
  if (typeof v.issuedAt !== 'number' || !Number.isFinite(v.issuedAt)) return false;
  if (v.stepIndex !== undefined && (typeof v.stepIndex !== 'number' || !Number.isFinite(v.stepIndex))) {
    return false;
  }
  return true;
}

function parseWireMessage(raw: unknown): DualScreenWireMessage | null {
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  if (
    typeof obj.kind !== 'string' ||
    typeof obj.messageId !== 'string' ||
    typeof obj.roomCode !== 'string' ||
    typeof obj.senderId !== 'string'
  ) {
    return null;
  }
  if (obj.kind === 'snapshot' && isValidSnapshot(obj.payload)) {
    return {
      kind: 'snapshot',
      messageId: obj.messageId,
      roomCode: obj.roomCode,
      senderId: obj.senderId,
      payload: obj.payload,
    };
  }
  if (obj.kind === 'command' && isValidCommand(obj.payload)) {
    return {
      kind: 'command',
      messageId: obj.messageId,
      roomCode: obj.roomCode,
      senderId: obj.senderId,
      payload: obj.payload,
    };
  }
  if (obj.kind === 'sync-request' && typeof obj.requestedAt === 'number') {
    return {
      kind: 'sync-request',
      messageId: obj.messageId,
      roomCode: obj.roomCode,
      senderId: obj.senderId,
      requestedAt: obj.requestedAt,
    };
  }
  return null;
}

/**
 * Read-only lookup for the latest cached snapshot of a room in localStorage.
 * Never mutates storage.
 */
export function readLatestDualScreenSnapshot(roomCode: string): DualScreenStageSnapshot | null {
  if (typeof window === 'undefined') return null;
  const key = getDualScreenSnapshotStorageKey(roomCode);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const wire = parseWireMessage(raw);
    if (wire && wire.kind === 'snapshot') {
      return wire.payload;
    }
    return null;
  } catch {
    return null;
  }
}

function isWebRtcAvailable(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.RTCPeerConnection === 'function';
}

function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs: number,
): Promise<void> {
  if (pc.iceGatheringState === 'complete' || typeof pc.iceGatheringState !== 'string') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (typeof pc.removeEventListener === 'function') {
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        pc.removeEventListener('icecandidate', onCandidate);
      }
      resolve();
    };
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    };
    const onCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        finish();
      }
    };
    const timer = setTimeout(finish, Math.max(50, timeoutMs));
    if (typeof pc.addEventListener === 'function') {
      pc.addEventListener('icegatheringstatechange', onStateChange);
      pc.addEventListener('icecandidate', onCandidate);
    } else {
      pc.onicegatheringstatechange = onStateChange;
      pc.onicecandidate = onCandidate;
    }
  });
}

export function createDualScreenChannel(
  rawRoomCode: string,
  role: DualScreenRole,
  options: DualScreenChannelOptions = {},
): DualScreenChannel {
  const roomCode = normalizeDualScreenRoomCode(rawRoomCode) || 'STUDIO';
  const broadcastName = getDualScreenBroadcastName(roomCode);
  const snapshotStorageKey = getDualScreenSnapshotStorageKey(roomCode);
  const commandStorageKey = getDualScreenCommandStorageKey(roomCode);
  const senderId = createUniqueId(role);
  const iceServers = options.iceServers ?? DEFAULT_ICE_SERVERS;
  const iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;

  const snapshotListeners = new Set<(snapshot: DualScreenStageSnapshot) => void>();
  const commandListeners = new Set<(command: DualScreenCommand) => void>();
  const stateListeners = new Set<(state: DualScreenConnectionState) => void>();
  const seenMessageIds: string[] = [];
  const seenMessageSet = new Set<string>();

  let broadcastChannel: BroadcastChannel | null = null;
  let broadcastSupported = false;
  let storageFallbackActive = false;
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let webrtcStatus: DualScreenWebRtcStatus = isWebRtcAvailable() ? 'idle' : 'unsupported';
  let lastSyncedAt: number | null = null;
  let lastPublishedSnapshot: DualScreenStageSnapshot | null = null;
  let closed = false;

  const recordSeenMessage = (messageId: string): boolean => {
    if (seenMessageSet.has(messageId)) return false;
    seenMessageSet.add(messageId);
    seenMessageIds.push(messageId);
    if (seenMessageIds.length > MAX_SEEN_MESSAGE_IDS) {
      const oldest = seenMessageIds.shift();
      if (oldest) seenMessageSet.delete(oldest);
    }
    return true;
  };

  const getConnectionState = (): DualScreenConnectionState => {
    const webrtcOpen = dataChannel?.readyState === 'open' || webrtcStatus === 'connected';
    const transport: DualScreenTransportMode = webrtcOpen
      ? 'webrtc-p2p'
      : broadcastSupported
        ? 'broadcast-channel'
        : storageFallbackActive
          ? 'storage-fallback'
          : 'local-only';

    return {
      roomCode,
      role,
      transport,
      broadcastSupported,
      storageFallbackActive,
      webrtcSupported: isWebRtcAvailable(),
      webrtcStatus: closed ? 'closed' : webrtcStatus,
      connectedPeers: webrtcOpen ? 1 : 0,
      lastSyncedAt,
      closed,
    };
  };

  const emitStateChange = () => {
    if (stateListeners.size === 0) return;
    const state = getConnectionState();
    stateListeners.forEach((listener) => {
      listener(state);
    });
  };

  const sendOverLiveTransports = (wire: DualScreenWireMessage, persistToStorage: boolean) => {
    if (closed) return;

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(wire);
      } catch {
        // Channel might be closing or unsupported in current context
      }
    }

    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(wire));
      } catch {
        // Ignore transient data channel send failures
      }
    }

    if (persistToStorage && typeof window !== 'undefined') {
      const targetKey = wire.kind === 'snapshot' ? snapshotStorageKey : commandStorageKey;
      try {
        window.localStorage.setItem(targetKey, JSON.stringify(wire));
      } catch {
        // Private browsing or quota limits should not break live sync
      }
    }
  };

  const handleIncomingWire = (raw: unknown) => {
    if (closed) return;
    const wire = parseWireMessage(raw);
    if (!wire) return;
    if (wire.roomCode !== roomCode) return;
    if (wire.senderId === senderId) return;
    if (!recordSeenMessage(wire.messageId)) return;

    if (wire.kind === 'snapshot') {
      lastSyncedAt = wire.payload.updatedAt;
      snapshotListeners.forEach((listener) => {
        listener(wire.payload);
      });
      emitStateChange();
      return;
    }

    if (wire.kind === 'command') {
      lastSyncedAt = wire.payload.issuedAt;
      commandListeners.forEach((listener) => {
        listener(wire.payload);
      });
      emitStateChange();
      return;
    }

    if (wire.kind === 'sync-request' && role === 'controller' && lastPublishedSnapshot) {
      const reply: DualScreenWireMessage = {
        kind: 'snapshot',
        messageId: createUniqueId('snap-reply'),
        roomCode,
        senderId,
        payload: lastPublishedSnapshot,
      };
      recordSeenMessage(reply.messageId);
      sendOverLiveTransports(reply, false);
    }
  };

  // Initialize BroadcastChannel (read/listen only — zero localStorage writes)
  if (typeof globalThis !== 'undefined' && typeof globalThis.BroadcastChannel === 'function') {
    try {
      broadcastChannel = new globalThis.BroadcastChannel(broadcastName);
      broadcastSupported = true;
      broadcastChannel.onmessage = (event: MessageEvent) => {
        handleIncomingWire(event.data);
      };
    } catch {
      broadcastChannel = null;
      broadcastSupported = false;
    }
  }

  // Register localStorage storage event fallback listener (listen only — never writes on init)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== snapshotStorageKey && event.key !== commandStorageKey) return;
    if (!event.newValue) return;
    handleIncomingWire(event.newValue);
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', handleStorageEvent);
    storageFallbackActive = true;
  }

  const teardownPeerConnection = () => {
    if (dataChannel) {
      try {
        dataChannel.onopen = null;
        dataChannel.onmessage = null;
        dataChannel.onclose = null;
        dataChannel.onerror = null;
        dataChannel.close();
      } catch {
        // Safe cleanup
      }
      dataChannel = null;
    }
    if (peerConnection) {
      try {
        peerConnection.ondatachannel = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.close();
      } catch {
        // Safe cleanup
      }
      peerConnection = null;
    }
  };

  const attachDataChannel = (channel: RTCDataChannel) => {
    dataChannel = channel;
    channel.onopen = () => {
      if (closed) return;
      webrtcStatus = 'connected';
      emitStateChange();
      if (role === 'controller' && lastPublishedSnapshot) {
        const syncMsg: DualScreenWireMessage = {
          kind: 'snapshot',
          messageId: createUniqueId('rtc-sync'),
          roomCode,
          senderId,
          payload: lastPublishedSnapshot,
        };
        recordSeenMessage(syncMsg.messageId);
        try {
          channel.send(JSON.stringify(syncMsg));
        } catch {
          // Ignore if channel closed immediately
        }
      }
    };
    channel.onmessage = (event: MessageEvent) => {
      handleIncomingWire(event.data);
    };
    channel.onclose = () => {
      if (!closed) {
        webrtcStatus = 'closed';
        emitStateChange();
      }
    };
    channel.onerror = () => {
      if (!closed) {
        webrtcStatus = 'failed';
        emitStateChange();
      }
    };
    if (channel.readyState === 'open') {
      webrtcStatus = 'connected';
      emitStateChange();
    }
  };

  const bindPeerLifecycle = (pc: RTCPeerConnection) => {
    const syncPeerState = () => {
      if (closed) return;
      const connState = pc.connectionState;
      const iceState = pc.iceConnectionState;
      if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
        if (dataChannel?.readyState === 'open') {
          webrtcStatus = 'connected';
        }
      } else if (connState === 'failed' || iceState === 'failed') {
        webrtcStatus = 'failed';
      } else if (
        connState === 'closed' ||
        connState === 'disconnected' ||
        iceState === 'closed' ||
        iceState === 'disconnected'
      ) {
        if (webrtcStatus === 'connected') {
          webrtcStatus = 'closed';
        }
      }
      emitStateChange();
    };
    pc.onconnectionstatechange = syncPeerState;
    pc.oniceconnectionstatechange = syncPeerState;
  };

  const publishSnapshot = (snapshotInput: DualScreenStageSnapshotInput): DualScreenStageSnapshot => {
    const updatedAt =
      'updatedAt' in snapshotInput &&
      typeof snapshotInput.updatedAt === 'number' &&
      Number.isFinite(snapshotInput.updatedAt)
        ? snapshotInput.updatedAt
        : Date.now();

    const normalized: DualScreenStageSnapshot = {
      roomCode,
      updatedAt,
      sequenceTitle: snapshotInput.sequenceTitle,
      stepIndex: Math.max(0, Math.floor(snapshotInput.stepIndex)),
      totalSteps: Math.max(0, Math.floor(snapshotInput.totalSteps)),
      exerciseId: snapshotInput.exerciseId,
      exerciseNameKo: snapshotInput.exerciseNameKo,
      apparatus: VALID_APPARATUS.has(snapshotInput.apparatus) ? snapshotInput.apparatus : 'reformer',
      springs: snapshotInput.springs,
      nextExerciseNameKo: snapshotInput.nextExerciseNameKo,
      nextSprings: snapshotInput.nextSprings,
      cueLine: snapshotInput.cueLine,
      timerRemainingSec: Math.max(0, Math.floor(snapshotInput.timerRemainingSec)),
      running: Boolean(snapshotInput.running),
      phaseLabelKo: snapshotInput.phaseLabelKo,
    };

    lastPublishedSnapshot = normalized;
    lastSyncedAt = normalized.updatedAt;

    const wire: DualScreenWireMessage = {
      kind: 'snapshot',
      messageId: createUniqueId('snap'),
      roomCode,
      senderId,
      payload: normalized,
    };
    recordSeenMessage(wire.messageId);
    sendOverLiveTransports(wire, true);
    emitStateChange();
    return normalized;
  };

  const sendCommand = (command: DualScreenCommand): void => {
    if (closed || !isValidCommand(command)) return;
    lastSyncedAt = command.issuedAt;
    const wire: DualScreenWireMessage = {
      kind: 'command',
      messageId: createUniqueId('cmd'),
      roomCode,
      senderId,
      payload: {
        type: command.type,
        stepIndex: command.stepIndex,
        issuedAt: command.issuedAt,
      },
    };
    recordSeenMessage(wire.messageId);
    sendOverLiveTransports(wire, true);
    emitStateChange();
  };

  const requestSync = (): void => {
    if (closed) return;
    const wire: DualScreenWireMessage = {
      kind: 'sync-request',
      messageId: createUniqueId('sync-req'),
      roomCode,
      senderId,
      requestedAt: Date.now(),
    };
    recordSeenMessage(wire.messageId);
    // Deliberately never persists sync-request to localStorage (keeps mount read-only)
    sendOverLiveTransports(wire, false);
  };

  const createWebRtcOffer = async (): Promise<WebRtcSignalResult> => {
    if (closed) {
      return {
        ok: false,
        code: '',
        messageKo: '연결 채널이 닫혀 있습니다. 새로 연결을 열어 주세요.',
      };
    }
    if (!isWebRtcAvailable()) {
      webrtcStatus = 'unsupported';
      emitStateChange();
      return {
        ok: false,
        code: '',
        fallbackOnly: true,
        messageKo:
          '현재 브라우저에서는 WebRTC 기기 직접 연결을 지원하지 않습니다. 같은 기기 새 창 연동이나 QR 링크를 이용해 주세요.',
      };
    }

    try {
      teardownPeerConnection();
      const pc = new globalThis.RTCPeerConnection({ iceServers });
      peerConnection = pc;
      bindPeerLifecycle(pc);
      const dc = pc.createDataChannel(broadcastName, { ordered: true });
      attachDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc, iceGatheringTimeoutMs);

      const sdp = pc.localDescription?.sdp ?? offer.sdp ?? '';
      if (!sdp) {
        webrtcStatus = 'failed';
        emitStateChange();
        return {
          ok: false,
          code: '',
          messageKo: '연결 코드(SDP)를 만들지 못했습니다. 다시 시도해 주세요.',
        };
      }

      const code = encodeWebRtcSignalCode({
        v: 1,
        type: 'offer',
        roomCode,
        sdp,
      });
      webrtcStatus = 'offer-ready';
      emitStateChange();
      return {
        ok: true,
        code,
        messageKo: 'Offer 연결 코드를 만들었습니다. 큰 화면(TV·아이패드)에 붙여넣어 주세요.',
      };
    } catch {
      webrtcStatus = 'failed';
      emitStateChange();
      return {
        ok: false,
        code: '',
        messageKo:
          'WebRTC Offer 생성 중 오류가 발생했습니다. 같은 브라우저 새 창 연동으로 바로 시작할 수 있습니다.',
      };
    }
  };

  const acceptWebRtcOfferAndCreateAnswer = async (
    offerCode: string,
  ): Promise<WebRtcSignalResult> => {
    if (closed) {
      return {
        ok: false,
        code: '',
        messageKo: '연결 채널이 닫혀 있습니다. 화면을 새로고침해 주세요.',
      };
    }
    if (!isWebRtcAvailable()) {
      webrtcStatus = 'unsupported';
      emitStateChange();
      return {
        ok: false,
        code: '',
        fallbackOnly: true,
        messageKo:
          '현재 브라우저에서는 WebRTC 직접 연결을 지원하지 않습니다. 같은 기기 새 창 연동으로 이용해 주세요.',
      };
    }

    const decoded = decodeWebRtcSignalCode(offerCode);
    if (!decoded || decoded.type !== 'offer') {
      return {
        ok: false,
        code: '',
        messageKo: '올바른 Offer 연결 코드가 아닙니다. 강사 기기에서 코드를 처음부터 끝까지 복사해 주세요.',
      };
    }

    try {
      teardownPeerConnection();
      const pc = new globalThis.RTCPeerConnection({ iceServers });
      peerConnection = pc;
      bindPeerLifecycle(pc);
      pc.ondatachannel = (event: RTCDataChannelEvent) => {
        attachDataChannel(event.channel);
      };

      await pc.setRemoteDescription({ type: 'offer', sdp: decoded.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc, iceGatheringTimeoutMs);

      const sdp = pc.localDescription?.sdp ?? answer.sdp ?? '';
      if (!sdp) {
        webrtcStatus = 'failed';
        emitStateChange();
        return {
          ok: false,
          code: '',
          messageKo: '응답 코드(SDP)를 만들지 못했습니다. 다시 시도해 주세요.',
        };
      }

      const code = encodeWebRtcSignalCode({
        v: 1,
        type: 'answer',
        roomCode: decoded.roomCode || roomCode,
        sdp,
      });
      webrtcStatus = 'answer-ready';
      emitStateChange();
      return {
        ok: true,
        code,
        messageKo: 'Answer 응답 코드를 만들었습니다. 이 코드를 강사 폰에 붙여넣어 주세요.',
      };
    } catch {
      webrtcStatus = 'failed';
      emitStateChange();
      return {
        ok: false,
        code: '',
        messageKo: 'Offer 코드를 수락하는 중 문제가 생겼습니다. 새 Offer 코드로 다시 시도해 주세요.',
      };
    }
  };

  const completeWebRtcAnswer = async (answerCode: string): Promise<WebRtcCompleteResult> => {
    if (closed) {
      return {
        ok: false,
        messageKo: '연결 채널이 닫혀 있습니다. 새로 Offer를 만들어 주세요.',
      };
    }
    if (!isWebRtcAvailable()) {
      webrtcStatus = 'unsupported';
      emitStateChange();
      return {
        ok: false,
        fallbackOnly: true,
        messageKo: '현재 브라우저에서는 WebRTC 직접 연결을 지원하지 않습니다.',
      };
    }
    if (!peerConnection) {
      return {
        ok: false,
        messageKo: '먼저 1단계에서 Offer 연결 코드를 만들어 주세요.',
      };
    }

    const decoded = decodeWebRtcSignalCode(answerCode);
    if (!decoded || decoded.type !== 'answer') {
      return {
        ok: false,
        messageKo: '올바른 Answer 응답 코드가 아닙니다. 큰 화면 기기에서 만든 코드를 확인해 주세요.',
      };
    }

    try {
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: decoded.sdp });
      webrtcStatus = dataChannel?.readyState === 'open' ? 'connected' : 'connecting';
      emitStateChange();
      return {
        ok: true,
        messageKo:
          webrtcStatus === 'connected'
            ? '큰 화면 기기와 직접 연결되었습니다.'
            : 'Answer 코드를 적용했습니다. 기기 간 연결을 마무리하고 있습니다.',
      };
    } catch {
      webrtcStatus = 'failed';
      emitStateChange();
      return {
        ok: false,
        messageKo: 'Answer 코드 적용에 실패했습니다. 새 Offer 코드부터 다시 연결해 주세요.',
      };
    }
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    if (broadcastChannel) {
      try {
        broadcastChannel.onmessage = null;
        broadcastChannel.close();
      } catch {
        // Ignore close errors
      }
      broadcastChannel = null;
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    storageFallbackActive = false;
    teardownPeerConnection();
    webrtcStatus = 'closed';
    snapshotListeners.clear();
    commandListeners.clear();
    stateListeners.clear();
  };

  return {
    roomCode,
    role,
    publishSnapshot,
    sendCommand,
    requestSync,
    onSnapshot(listener) {
      snapshotListeners.add(listener);
      return () => {
        snapshotListeners.delete(listener);
      };
    },
    onCommand(listener) {
      commandListeners.add(listener);
      return () => {
        commandListeners.delete(listener);
      };
    },
    onConnectionStateChange(listener) {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },
    getConnectionState,
    createWebRtcOffer,
    acceptWebRtcOfferAndCreateAnswer,
    completeWebRtcAnswer,
    close,
  };
}
