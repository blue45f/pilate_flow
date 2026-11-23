import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDualScreenChannel,
  decodeWebRtcSignalCode,
  encodeWebRtcSignalCode,
  generateDualScreenRoomCode,
  getDualScreenBroadcastName,
  getDualScreenSnapshotStorageKey,
  normalizeDualScreenRoomCode,
  readLatestDualScreenSnapshot,
  type DualScreenCommand,
  type DualScreenStageSnapshot,
} from './dualScreenSyncEngine';

class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    const set = MockBroadcastChannel.channels.get(name) ?? new Set();
    set.add(this);
    MockBroadcastChannel.channels.set(name, set);
  }

  postMessage(data: unknown): void {
    if (this.closed) return;
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    peers.forEach((peer) => {
      if (peer === this || peer.closed) return;
      peer.onmessage?.(new MessageEvent('message', { data }));
    });
  }

  close(): void {
    this.closed = true;
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

interface MockRtcDataChannelLike {
  label: string;
  readyState: RTCDataChannelState;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  send: (data: string) => void;
  close: () => void;
}

class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];

  iceGatheringState: RTCIceGatheringState = 'complete';
  connectionState: RTCPeerConnectionState = 'new';
  iceConnectionState: RTCIceConnectionState = 'new';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  dataChannel: MockRtcDataChannelLike | null = null;
  peer: MockRTCPeerConnection | null = null;

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }

  createDataChannel(label: string): RTCDataChannel {
    const dc = this.makeChannel(label);
    this.dataChannel = dc;
    return dc as unknown as RTCDataChannel;
  }

  private makeChannel(label: string): MockRtcDataChannelLike {
    const channel: MockRtcDataChannelLike = {
      label,
      readyState: 'connecting',
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: (data: string) => {
        const remoteDc = this.peer?.dataChannel;
        if (remoteDc && remoteDc.readyState === 'open') {
          remoteDc.onmessage?.(new MessageEvent('message', { data }));
        }
      },
      close: () => {
        channel.readyState = 'closed';
        channel.onclose?.(new Event('close'));
      },
    };
    return channel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=pf-offer\r\n' };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\ns=pf-answer\r\n' };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = desc;
    if (desc.type === 'answer') {
      const remotePeer = MockRTCPeerConnection.instances.find(
        (item) => item !== this && item.localDescription?.type === 'answer',
      );
      if (remotePeer) {
        this.peer = remotePeer;
        remotePeer.peer = this;

        const remoteDc = remotePeer.makeChannel(this.dataChannel?.label ?? 'pf-dual-screen');
        remotePeer.dataChannel = remoteDc;
        remotePeer.ondatachannel?.({ channel: remoteDc } as unknown as RTCDataChannelEvent);

        this.connectionState = 'connected';
        remotePeer.connectionState = 'connected';
        if (this.dataChannel) {
          this.dataChannel.readyState = 'open';
          this.dataChannel.onopen?.(new Event('open'));
        }
        remoteDc.readyState = 'open';
        remoteDc.onopen?.(new Event('open'));
        this.onconnectionstatechange?.();
        remotePeer.onconnectionstatechange?.();
      }
    }
  }

  close(): void {
    this.connectionState = 'closed';
    this.dataChannel?.close();
  }

  static reset(): void {
    MockRTCPeerConnection.instances = [];
  }
}

const SAMPLE_SNAPSHOT: Omit<DualScreenStageSnapshot, 'roomCode' | 'updatedAt'> = {
  sequenceTitle: '모닝 리포머 50분 코어 플로우',
  stepIndex: 2,
  totalSteps: 10,
  exerciseId: 'ref-footwork-parallel',
  exerciseNameKo: '리포머 풋워크 패럴렐',
  apparatus: 'reformer',
  springs: '2R 1B',
  nextExerciseNameKo: '헌드레드 프렙',
  nextSprings: '1R 1B',
  cueLine: '내쉬는 숨에 발바닥 전체로 풋바를 고르게 밀어냅니다.',
  timerRemainingSec: 95,
  running: true,
  phaseLabelKo: '풋워크 · 하지 정렬',
};

describe('dualScreenSyncEngine', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalRTCPeerConnection = globalThis.RTCPeerConnection;

  beforeEach(() => {
    localStorage.clear();
    MockBroadcastChannel.reset();
    MockRTCPeerConnection.reset();
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: MockBroadcastChannel,
    });
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: originalBroadcastChannel,
    });
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: originalRTCPeerConnection,
    });
    vi.restoreAllMocks();
  });

  it('normalizes and generates clean 4-character room codes and channel names', () => {
    expect(normalizeDualScreenRoomCode(' a7-k2 ')).toBe('A7K2');
    expect(getDualScreenBroadcastName('ab12')).toBe('pf-dual-screen-AB12');
    const code = generateDualScreenRoomCode(4);
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
  });

  it('never writes to localStorage on channel creation or requestSync', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const controller = createDualScreenChannel('A7K2', 'controller');
    const display = createDualScreenChannel('A7K2', 'display');
    display.requestSync();

    expect(setItemSpy).not.toHaveBeenCalled();

    controller.close();
    display.close();
  });

  it('syncs snapshots and commands over BroadcastChannel and isolates rooms', () => {
    const controller = createDualScreenChannel('A7K2', 'controller');
    const display = createDualScreenChannel('A7K2', 'display');
    const otherRoomDisplay = createDualScreenChannel('Z9M4', 'display');

    const receivedSnapshots: DualScreenStageSnapshot[] = [];
    const otherSnapshots: DualScreenStageSnapshot[] = [];
    const receivedCommands: DualScreenCommand[] = [];

    display.onSnapshot((snap) => receivedSnapshots.push(snap));
    otherRoomDisplay.onSnapshot((snap) => otherSnapshots.push(snap));
    controller.onCommand((cmd) => receivedCommands.push(cmd));

    const published = controller.publishSnapshot(SAMPLE_SNAPSHOT);
    expect(published.roomCode).toBe('A7K2');
    expect(receivedSnapshots).toHaveLength(1);
    expect(receivedSnapshots[0]?.exerciseNameKo).toBe('리포머 풋워크 패럴렐');
    expect(receivedSnapshots[0]?.springs).toBe('2R 1B');
    expect(otherSnapshots).toHaveLength(0);

    display.sendCommand({ type: 'next', issuedAt: 1700000000000 });
    expect(receivedCommands).toEqual([{ type: 'next', issuedAt: 1700000000000 }]);

    // Cached snapshot can be read back read-only
    const cached = readLatestDualScreenSnapshot('A7K2');
    expect(cached?.exerciseId).toBe('ref-footwork-parallel');

    controller.close();
    display.close();
    otherRoomDisplay.close();
  });

  it('falls back to localStorage storage events when BroadcastChannel is unavailable and deduplicates deliveries', () => {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const controller = createDualScreenChannel('B4C8', 'controller');
    const display = createDualScreenChannel('B4C8', 'display');

    expect(display.getConnectionState().broadcastSupported).toBe(false);
    expect(display.getConnectionState().transport).toBe('storage-fallback');

    const onSnap = vi.fn();
    display.onSnapshot(onSnap);

    controller.publishSnapshot(SAMPLE_SNAPSHOT);
    const key = getDualScreenSnapshotStorageKey('B4C8');
    const rawValue = localStorage.getItem(key);
    expect(rawValue).toBeTruthy();

    // Simulate cross-window StorageEvent firing twice with the same messageId
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: rawValue }));
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: rawValue }));

    expect(onSnap).toHaveBeenCalledTimes(1);
    expect(onSnap.mock.calls[0]?.[0]?.exerciseNameKo).toBe('리포머 풋워크 패럴렐');

    controller.close();
    display.close();
  });

  it('handles requestSync over BroadcastChannel without touching localStorage', () => {
    const controller = createDualScreenChannel('K3P9', 'controller');
    controller.publishSnapshot(SAMPLE_SNAPSHOT);

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const lateDisplay = createDualScreenChannel('K3P9', 'display');
    const onSnap = vi.fn();
    lateDisplay.onSnapshot(onSnap);
    lateDisplay.requestSync();

    expect(onSnap).toHaveBeenCalledTimes(1);
    expect(onSnap.mock.calls[0]?.[0]?.sequenceTitle).toBe('모닝 리포머 50분 코어 플로우');
    expect(setItemSpy).not.toHaveBeenCalled();

    controller.close();
    lateDisplay.close();
  });

  it('returns safe fallback result when WebRTC RTCPeerConnection is unsupported', async () => {
    const controller = createDualScreenChannel('W1R2', 'controller');
    expect(controller.getConnectionState().webrtcSupported).toBe(false);
    expect(controller.getConnectionState().webrtcStatus).toBe('unsupported');

    const offerRes = await controller.createWebRtcOffer();
    expect(offerRes.ok).toBe(false);
    expect(offerRes.fallbackOnly).toBe(true);
    expect(offerRes.messageKo).toContain('WebRTC');

    const answerRes = await controller.acceptWebRtcOfferAndCreateAnswer('invalid');
    expect(answerRes.ok).toBe(false);
    expect(answerRes.fallbackOnly).toBe(true);

    controller.close();
  });

  it('completes serverless WebRTC Offer/Answer P2P handshake and exchanges snapshots and commands', async () => {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: MockRTCPeerConnection,
    });

    const phone = createDualScreenChannel('TV88', 'controller', { iceGatheringTimeoutMs: 50 });
    const tv = createDualScreenChannel('TV88', 'display', { iceGatheringTimeoutMs: 50 });

    const tvSnapshots: DualScreenStageSnapshot[] = [];
    const phoneCommands: DualScreenCommand[] = [];
    tv.onSnapshot((snap) => tvSnapshots.push(snap));
    phone.onCommand((cmd) => phoneCommands.push(cmd));

    const offer = await phone.createWebRtcOffer();
    expect(offer.ok).toBe(true);
    expect(offer.code.startsWith('PF1.')).toBe(true);
    expect(decodeWebRtcSignalCode(offer.code)?.type).toBe('offer');

    const answer = await tv.acceptWebRtcOfferAndCreateAnswer(offer.code);
    expect(answer.ok).toBe(true);
    expect(decodeWebRtcSignalCode(answer.code)?.type).toBe('answer');

    const completed = await phone.completeWebRtcAnswer(answer.code);
    expect(completed.ok).toBe(true);
    expect(phone.getConnectionState().transport).toBe('webrtc-p2p');
    expect(tv.getConnectionState().transport).toBe('webrtc-p2p');
    expect(phone.getConnectionState().connectedPeers).toBe(1);

    phone.publishSnapshot(SAMPLE_SNAPSHOT);
    expect(tvSnapshots).toHaveLength(1);
    expect(tvSnapshots[0]?.cueLine).toContain('풋바');

    tv.sendCommand({ type: 'jump-step', stepIndex: 4, issuedAt: 1700000001234 });
    expect(phoneCommands).toEqual([{ type: 'jump-step', stepIndex: 4, issuedAt: 1700000001234 }]);

    phone.close();
    tv.close();
    expect(phone.getConnectionState().closed).toBe(true);
  });

  it('rejects malformed or mismatched WebRTC signal codes safely', async () => {
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: MockRTCPeerConnection,
    });

    expect(decodeWebRtcSignalCode('not-valid-base64!!!')).toBeNull();
    const fakeAnswerCode = encodeWebRtcSignalCode({
      v: 1,
      type: 'answer',
      roomCode: 'A1B2',
      sdp: 'v=0',
    });

    const display = createDualScreenChannel('A1B2', 'display');
    const wrongType = await display.acceptWebRtcOfferAndCreateAnswer(fakeAnswerCode);
    expect(wrongType.ok).toBe(false);
    expect(wrongType.messageKo).toContain('Offer');

    const controller = createDualScreenChannel('A1B2', 'controller');
    const noOfferYet = await controller.completeWebRtcAnswer(fakeAnswerCode);
    expect(noOfferYet.ok).toBe(false);

    display.close();
    controller.close();
  });
});
