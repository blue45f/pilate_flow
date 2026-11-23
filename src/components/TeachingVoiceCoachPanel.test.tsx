import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeachingVoiceCoachPanel } from './TeachingVoiceCoachPanel';
import { TEACHING_COACH_HISTORY_KEY } from '../utils/teachingVoiceCoachEngine';

interface MockRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

describe('TeachingVoiceCoachPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    const win = window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
      AudioContext?: unknown;
    };
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('최초 마운트 시 localStorage.setItem을 절대 자동 호출하지 않으며 온디바이스 개인정보 안내를 표시한다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <TeachingVoiceCoachPanel
        sequenceTitle="오전 입문 리포머 50분"
        currentExerciseNameKo="풋워크 패럴렐"
      />,
    );

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText('모든 음성은 기기 안에서만 분석되며 서버로 전송·녹음 저장되지 않습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('오전 입문 리포머 50분')).toBeInTheDocument();
    expect(screen.getByText('풋워크 패럴렐')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: '이 기기에 리포트 저장' });
    expect(saveButton).toBeDisabled();
  });

  it('마이크 없이 3종 원탭 샘플 버튼으로 즉시 템포·습관어·큐 균형·강점·개선 팁을 확인한다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<TeachingVoiceCoachPanel sequenceTitle="입문 리포머" />);

    fireEvent.click(screen.getByRole('button', { name: /빠른 템포 · 습관어 많은 리허설/ }));

    expect(screen.getByText('빠른 템포 · 호흡 여백 필요')).toBeInTheDocument();
    expect(screen.getByLabelText('감지된 습관어 목록')).toBeInTheDocument();
    expect(screen.getByText('이번 리허설의 강점')).toBeInTheDocument();
    expect(screen.getByText('다음 수업 개선 팁')).toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /호흡·격려 균형 모범 수업/ }));

    expect(screen.getByText('차분한 안정 템포')).toBeInTheDocument();
    expect(screen.getByText(/주요 습관어\('자·어·음·약간/)).toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('텍스트 리허설 입력과 발화 시간 조절이 실시간으로 분석 결과에 반영된다', () => {
    render(<TeachingVoiceCoachPanel />);

    const textarea = screen.getByLabelText('티칭 리허설 스크립트');
    fireEvent.change(textarea, {
      target: {
        value:
          '코로 깊게 마시고 내쉬는 숨에 골반 중립과 어깨 정렬을 편안하게 유지해요. 좋아요, 천천히 복부 코어에 집중합니다.',
      },
    });

    const durationSelect = screen.getByLabelText('발화 시간');
    fireEvent.change(durationSelect, { target: { value: '30' } });

    expect(screen.getByText('발화 템포')).toBeInTheDocument();
    expect(screen.getByText('호흡 · 정렬 · 격려 큐 균형')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이 기기에 리포트 저장' })).toBeEnabled();
  });

  it('"이 기기에 리포트 저장" 버튼을 눌렀을 때만 로컬스토리지에 저장하고 히스토리 비교를 보여준다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<TeachingVoiceCoachPanel sequenceTitle="수요 오전 리포머" />);

    expect(setItemSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /빠른 템포 · 습관어 많은 리허설/ }));
    expect(setItemSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '이 기기에 리포트 저장' }));

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(TEACHING_COACH_HISTORY_KEY, expect.any(String));
    expect(screen.getByText(/이 기기에 리포트를 저장했습니다/)).toBeInTheDocument();

    // 모범 샘플로 전환 후 히스토리 비교 확인
    fireEvent.click(screen.getByRole('button', { name: /호흡·격려 균형 모범 수업/ }));
    expect(screen.getByText(/최근 저장 히스토리 비교/)).toBeInTheDocument();
    expect(screen.getByText(/직전 저장 리포트 대비:/)).toBeInTheDocument();
  });

  it('SpeechRecognition 미지원 브라우저에서는 안전 안내를 표시한다', () => {
    render(<TeachingVoiceCoachPanel />);

    fireEvent.click(screen.getByRole('button', { name: '실시간 마이크 분석 시작' }));

    expect(
      screen.getByText(/현재 브라우저에서는 실시간 음성 인식을 지원하지 않습니다/),
    ).toBeInTheDocument();
  });

  it('SpeechRecognition 지원 환경에서 한국어 실시간 인식·중지·권한 거부 흐름을 안전하게 처리한다', async () => {
    const instances: MockRecognitionInstance[] = [];
    const registerRecognition = (instance: MockRecognitionInstance) => {
      instances.push(instance);
    };
    const getLatestRecognition = () => instances[instances.length - 1] ?? null;
    const stopTrackSpy = vi.fn();
    const closeAudioSpy = vi.fn().mockResolvedValue(undefined);

    class MockSpeechRecognition implements MockRecognitionInstance {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();

      constructor() {
        registerRecognition(this);
      }
    }

    class MockAudioContext {
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
      createAnalyser() {
        return {
          fftSize: 256,
          smoothingTimeConstant: 0.8,
          frequencyBinCount: 128,
          getByteFrequencyData: (arr: Uint8Array) => {
            arr.fill(96);
          },
        };
      }
      close = closeAudioSpy;
    }

    const win = window as Window & {
      SpeechRecognition?: unknown;
      AudioContext?: unknown;
    };
    win.SpeechRecognition = MockSpeechRecognition;
    win.AudioContext = MockAudioContext;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrackSpy }],
        }),
      },
    });

    render(<TeachingVoiceCoachPanel sequenceTitle="라이브 리허설" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '실시간 마이크 분석 시작' }));
      await Promise.resolve();
    });

    const firstInstance = getLatestRecognition();
    expect(firstInstance).not.toBeNull();
    expect(firstInstance!.lang).toBe('ko-KR');
    expect(firstInstance!.continuous).toBe(true);
    expect(firstInstance!.start).toHaveBeenCalledTimes(1);

    act(() => {
      firstInstance!.onresult?.({
        resultIndex: 0,
        results: {
          length: 2,
          0: { isFinal: true, length: 1, 0: { transcript: '코로 마시고 골반 중립 유지해요.' } },
          1: { isFinal: false, length: 1, 0: { transcript: '천천히 내쉬며 복부 조여요' } },
        },
      });
    });

    expect(screen.getByText(/인식 중: 천천히 내쉬며 복부 조여요/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '마이크 분석 중지' }));
    expect(stopTrackSpy).toHaveBeenCalled();
    expect(closeAudioSpy).toHaveBeenCalled();
    expect(screen.getByText(/마이크 분석을 중지했습니다/)).toBeInTheDocument();

    // 권한 거부 시나리오
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '실시간 마이크 분석 시작' }));
      await Promise.resolve();
    });

    const secondInstance = getLatestRecognition();
    act(() => {
      secondInstance!.onerror?.({ error: 'not-allowed' });
    });

    expect(screen.getByText(/마이크 권한이 거부되었습니다/)).toBeInTheDocument();
  });

  it('스토리지 저장 실패 시 거짓 성공 문구 대신 정직한 안내를 표시한다', () => {
    render(<TeachingVoiceCoachPanel />);

    fireEvent.click(screen.getByRole('button', { name: /입문 리포머 차분한 큐/ }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    fireEvent.click(screen.getByRole('button', { name: '이 기기에 리포트 저장' }));

    expect(
      screen.getByText(
        /브라우저 저장 공간이 부족하거나 차단되어 이 기기에 리포트를 저장하지 못했습니다/,
      ),
    ).toBeInTheDocument();
  });
});
