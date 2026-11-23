import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DualScreenNfcPanel, MemberDualDisplayStage } from './DualScreenNfcPanel';
import {
  createDualScreenChannel,
  type DualScreenCommand,
  type DualScreenStageSnapshot,
} from '../utils/dualScreenSyncEngine';

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

const SAMPLE_STAGE_SNAPSHOT: Omit<DualScreenStageSnapshot, 'roomCode' | 'updatedAt'> = {
  sequenceTitle: '오전 리포머 정렬 50분',
  stepIndex: 1,
  totalSteps: 8,
  exerciseId: 'ref-footwork-parallel',
  exerciseNameKo: '리포머 풋워크 패럴렐',
  apparatus: 'reformer',
  springs: '2R 1B',
  nextExerciseNameKo: '브릿징 척추 분절',
  nextSprings: '2R',
  cueLine: '내쉬는 숨에 양쪽 발볼로 풋바를 균일하게 밀어냅니다.',
  timerRemainingSec: 90,
  running: false,
  phaseLabelKo: '풋워크 · 하지 정렬',
};

describe('DualScreenNfcPanel & MemberDualDisplayStage', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalWindowOpen = window.open;
  const hadNdefReader = 'NDEFReader' in window;
  const originalNdefReader = (window as unknown as { NDEFReader?: unknown }).NDEFReader;

  beforeEach(() => {
    localStorage.clear();
    MockBroadcastChannel.reset();
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: MockBroadcastChannel,
    });
    delete (window as unknown as { NDEFReader?: unknown }).NDEFReader;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: originalBroadcastChannel,
    });
    window.open = originalWindowOpen;
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

  it('never calls localStorage.setItem automatically on initial mount for either component', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { unmount: unmountPanel } = render(
      <DualScreenNfcPanel
        snapshot={SAMPLE_STAGE_SNAPSHOT}
        baseOrigin="https://pilates-flow-atelier.web.app"
      />,
    );
    const { unmount: unmountStage } = render(<MemberDualDisplayStage roomCode="A7K2" />);

    expect(setItemSpy).not.toHaveBeenCalled();

    unmountPanel();
    unmountStage();
  });

  it('opens member dual display window with room query and fires remote commands on user clicks', () => {
    const openSpy = vi.fn().mockReturnValue({} as Window);
    window.open = openSpy;
    const receivedCommands: DualScreenCommand[] = [];

    render(
      <DualScreenNfcPanel
        snapshot={SAMPLE_STAGE_SNAPSHOT}
        onRemoteCommand={(cmd) => receivedCommands.push(cmd)}
        baseOrigin="https://pilates-flow-atelier.web.app"
      />,
    );

    const roomInput = screen.getByTestId('dual-screen-room-input') as HTMLInputElement;
    fireEvent.change(roomInput, { target: { value: 'rm42' } });
    expect(roomInput.value).toBe('RM42');

    fireEvent.click(screen.getByTestId('open-member-display-btn'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://pilates-flow-atelier.web.app/?display=member-stage&room=RM42',
      '_blank',
      'noopener',
    );

    fireEvent.click(screen.getByTestId('remote-prev-btn'));
    fireEvent.click(screen.getByTestId('remote-toggle-play-btn'));
    fireEvent.click(screen.getByTestId('remote-next-btn'));

    expect(receivedCommands.map((c) => c.type)).toEqual(['prev', 'toggle-play', 'next']);
  });

  it('switches to Apparatus NFC/QR tab, builds live deep link + QR card, and handles NFC/clipboard actions', async () => {
    render(
      <DualScreenNfcPanel
        snapshot={SAMPLE_STAGE_SNAPSHOT}
        activeApparatus="reformer"
        activeSequenceId="seq-morning-50"
        baseOrigin="https://pilates-flow-atelier.web.app"
      />,
    );

    fireEvent.click(screen.getByTestId('nfc-qr-tab'));
    expect(screen.getByTestId('nfc-qr-tabpanel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nfc-apparatus-chair'));
    fireEvent.click(screen.getByTestId('nfc-mode-atlas'));

    expect(screen.getByTestId('nfc-deeplink-url').textContent).toBe(
      'https://pilates-flow-atelier.web.app/?mode=atlas&apparatus=chair&sequence=seq-morning-50',
    );

    const qrImg = screen.getByTestId('nfc-tag-qr-image') as HTMLImageElement;
    expect(qrImg.getAttribute('src')?.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);

    // Uncheck sequence include -> removes sequence param
    fireEvent.click(screen.getByTestId('nfc-include-sequence-checkbox'));
    expect(screen.getByTestId('nfc-deeplink-url').textContent).toBe(
      'https://pilates-flow-atelier.web.app/?mode=atlas&apparatus=chair',
    );

    // Copy link
    fireEvent.click(screen.getByTestId('nfc-copy-link-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('nfc-feedback').textContent).toContain('복사');
    });

    // Unsupported NFC click gives helpful QR fallback guidance
    fireEvent.click(screen.getByTestId('nfc-write-tag-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('nfc-feedback').textContent).toContain('QR');
    });
  });

  it('renders MemberDualDisplayStage live snapshot updates via BroadcastChannel without private instructor memos', () => {
    render(<MemberDualDisplayStage roomCode="STUDIO7" />);

    expect(screen.getByTestId('member-stage-waiting')).toBeInTheDocument();
    expect(screen.getByTestId('member-stage-room-badge').textContent).toContain('STUDIO7');

    const controller = createDualScreenChannel('STUDIO7', 'controller');
    act(() => {
      controller.publishSnapshot({
        ...SAMPLE_STAGE_SNAPSHOT,
        running: true,
        timerRemainingSec: 125,
      });
    });

    expect(screen.queryByTestId('member-stage-waiting')).not.toBeInTheDocument();
    expect(screen.getByTestId('member-stage-exercise').textContent).toBe('리포머 풋워크 패럴렐');
    expect(screen.getByTestId('member-stage-timer').textContent).toBe('02:05');
    expect(screen.getByTestId('member-stage-cue').textContent).toContain('풋바를 균일하게');
    expect(screen.getByTestId('member-stage-next-springs').textContent).toBe('2R');
    expect(screen.getByTestId('member-stage-step-progress').textContent).toBe('2 / 8');

    controller.close();
  });

  it('complies strictly with Wave 18 typography & Calm Atelier CSS guardrails', () => {
    const cssPath = path.resolve(import.meta.dirname, '../styles/dual-screen-nfc.css');
    const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    for (const match of css.matchAll(/font-size\s*:\s*([0-9.]+)\s*px\b/gi)) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(13);
    }
    for (const match of css.matchAll(/font-size\s*:\s*([0-9.]+)\s*rem\b/gi)) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(0.8125);
    }
    expect(css).not.toMatch(/font-weight\s*:\s*(?:700|800|900|bold)\b/i);
    expect(css).not.toMatch(/font-style\s*:\s*italic\b/i);
    expect(css).not.toMatch(/text-transform\s*:\s*uppercase\b/i);
    expect(css).not.toMatch(/transition\s*:\s*all\b/i);
  });
});
