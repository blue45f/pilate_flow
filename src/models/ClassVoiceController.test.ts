import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassVoiceController } from './ClassVoiceController';
import type { ClassVoiceSnapshot } from './ClassVoiceController';

const base: ClassVoiceSnapshot = {
  stepKey: 'step-1',
  title: '검토한 첫 동작',
  breath: '들이마시고 내쉽니다.',
  phase: '수행 · 왼쪽',
  remainingSec: 60,
  nextTitle: '검토한 다음 동작',
  running: false,
  eligible: true,
  visible: true,
};
let speak: ReturnType<typeof vi.fn>;
let cancel: ReturnType<typeof vi.fn>;
let controller: ClassVoiceController;
beforeEach(() => {
  speak = vi.fn();
  cancel = vi.fn();
  controller = new ClassVoiceController({ speak, cancel });
});
const running = (extra: Partial<ClassVoiceSnapshot> = {}) => ({ ...base, running: true, ...extra });

describe('class-only device speech controller', () => {
  it('stays silent until both explicit voice consent and class start', () => {
    controller.update(running());
    expect(speak).not.toHaveBeenCalled();
    controller.setEnabled(true, base);
    expect(speak).not.toHaveBeenCalled();
    controller.update(running());
    expect(speak).toHaveBeenCalledExactlyOnceWith(
      '검토한 첫 동작. 수행 · 왼쪽. 남은 시간 1분. 검토한 호흡 메모. 들이마시고 내쉽니다.',
    );
  });
  it('deduplicates ticks and phase changes, and replaces rather than queues speech', () => {
    controller.setEnabled(true, running());
    for (let i = 0; i < 5; i++) controller.update(running());
    expect(speak).toHaveBeenCalledTimes(1);
    controller.update(running({ phase: '수행 · 오른쪽', remainingSec: 30 }));
    controller.update(running({ phase: '수행 · 오른쪽', remainingSec: 29 }));
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith('수행 · 오른쪽.');
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('announces the current remaining seconds once after a delayed threshold crossing', () => {
    controller.setEnabled(true, running());
    controller.update(running({ remainingSec: 7 }));
    controller.update(running({ remainingSec: 6 }));
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith('7초 남았습니다. 다음은 검토한 다음 동작입니다.');
  });
  it('never queues a stale warning after late enable', () => {
    controller.setEnabled(true, running({ remainingSec: 8 }));
    controller.update(running({ remainingSec: 7 }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toContain('남은 시간 8초.');
  });
  it('cancels on pause without repeating the same cue on resume', () => {
    controller.setEnabled(true, running());
    controller.update(base);
    expect(cancel).toHaveBeenCalledOnce();
    controller.update(running());
    expect(speak).toHaveBeenCalledOnce();
  });
  it('keeps hidden tabs silent and never replays missed warnings', () => {
    controller.setEnabled(true, running());
    controller.update(running({ visible: false }));
    controller.update(running({ visible: false, remainingSec: 8 }));
    controller.update(running({ remainingSec: 7 }));
    expect(speak).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('announces only the newest step when delayed ticks skip several steps', () => {
    controller.setEnabled(true, running());
    controller.update(
      running({ stepKey: 'step-4', title: '현재 동작', breath: '', remainingSec: 19 }),
    );
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith('현재 동작. 수행 · 왼쪽. 남은 시간 19초.');
  });
  it('allows explicit revisits, and rearms warnings after a minute is added', () => {
    controller.setEnabled(true, running());
    controller.update(running({ remainingSec: 10 }));
    controller.update(running({ remainingSec: 70 }));
    controller.update(running({ remainingSec: 10 }));
    expect(speak).toHaveBeenCalledTimes(3);
    controller.update(running({ stepKey: 'step-2' }));
    controller.update(running());
    expect(speak).toHaveBeenCalledTimes(5);
  });
  it('respects independent content switches and a fully silent configuration', () => {
    controller.setPreferences({ movement: false, breath: true, time: false });
    controller.setEnabled(true, running());
    expect(speak).toHaveBeenLastCalledWith('검토한 호흡 메모. 들이마시고 내쉽니다.');
    controller.setPreferences({ movement: false, breath: false, time: false });
    controller.update(running({ stepKey: 'step-2' }));
    expect(speak).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('announces an elapsed deadline once, not on a manual pause', () => {
    controller.setEnabled(true, running());
    controller.update({ ...base, remainingSec: 0 });
    controller.update({ ...base, remainingSec: 0 });
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith(
      '계획 시간이 끝났습니다. 다음은 검토한 다음 동작입니다.',
    );
    expect(cancel).toHaveBeenCalledOnce(); // Idle rerenders must not cut off the completion cue.
  });
  it('cancels and blocks newly invalidated review material', () => {
    controller.setEnabled(true, running());
    controller.update(running({ eligible: false, title: 'unreviewed changed content' }));
    expect(speak).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('stops immediately, cleans up, and does not cancel unrelated speech when never enabled', () => {
    controller.destroy();
    expect(cancel).not.toHaveBeenCalled();
    controller.setEnabled(true, running());
    controller.setEnabled(false, running());
    controller.update(running({ stepKey: 'step-2' }));
    controller.destroy();
    expect(speak).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
