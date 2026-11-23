import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { createNaturalVoiceAudioCache } from '../utils/naturalVoiceEngine';
import {
  getPreferredStudioVoicePersona,
  setPreferredStudioVoicePersona,
} from '../utils/studioNeuralVoiceResolver';
import { DailyCommuteBriefingPanel } from './DailyCommuteBriefingPanel';

const originalState = usePilatesStore.getState();

function createMockAudioEnv() {
  const fetchedUrls: string[] = [];
  const fetchStudioPack = vi.fn(async (url: string) => {
    fetchedUrls.push(url);
    return new Uint8Array(2048).fill(0x49).buffer;
  });

  const created: Array<{
    url: string;
    playbackRate: number;
    onended: (() => void) | null;
    onerror: (() => void) | null;
    ontimeupdate: (() => void) | null;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
  }> = [];

  const createAudioElement = (url: string) => {
    const el = {
      url,
      playbackRate: 1,
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      ontimeupdate: null as (() => void) | null,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    };
    created.push(el);
    return el as unknown as HTMLAudioElement;
  };

  return {
    fetchedUrls,
    fetchStudioPack,
    created,
    env: {
      speechSynthesis: null,
      SpeechSynthesisUtterance: null,
      AudioContextCtor: null,
      audioCache: createNaturalVoiceAudioCache(null),
      enableStudioPack: true,
      fetchStudioPack,
      createAudioElement,
    },
  };
}

describe('DailyCommuteBriefingPanel & Multi-Persona AI Studio Voice', () => {
  beforeEach(() => {
    setPreferredStudioVoicePersona('seoyeon');
    const ex1 = INITIAL_EXERCISES[0];
    const ex2 = INITIAL_EXERCISES[1];
    usePilatesStore.setState({
      ...originalState,
      instructorSchedule: {
        locations: [],
        exceptions: [],
        classes: [
          {
            id: 'cls-morning-1',
            title: '오전 리포머 베이직',
            participantAlias: '그룹 A',
            locationId: 'loc-1',
            startDate: '2026-11-24',
            startTime: '09:00',
            endTime: '09:50',
            recurrence: 'once',
            weekdays: [],
            linkSavedSequenceId: 'seq-brief-1',
            notes: '',
          },
          {
            id: 'cls-morning-2',
            title: '오전 매트 코어',
            participantAlias: '그룹 B',
            locationId: 'loc-1',
            startDate: '2026-11-24',
            startTime: '10:30',
            endTime: '11:20',
            recurrence: 'once',
            weekdays: [],
            linkSavedSequenceId: 'seq-brief-2',
            notes: '',
          },
        ],
      },
      savedSequences: [
        {
          id: 'seq-brief-1',
          title: '오전 리포머 베이직',
          subtitle: '입문',
          apparatus: 'reformer',
          level: '1.0',
          targetMinutes: 50,
          createdAt: '2026-11-24T00:00:00Z',
          updatedAt: '2026-11-24T00:00:00Z',
          focusTags: [],
          taughtCount: 0,
          steps: [
            {
              stepId: 'b1-s1',
              order: 1,
              blockCategory: ex1.blockCategory,
              exerciseId: ex1.id,
              durationMin: 5,
              selectedLayer: 'standard',
            },
          ],
        },
        {
          id: 'seq-brief-2',
          title: '오전 매트 코어',
          subtitle: '중급',
          apparatus: 'mat',
          level: '1.5',
          targetMinutes: 50,
          createdAt: '2026-11-24T00:00:00Z',
          updatedAt: '2026-11-24T00:00:00Z',
          focusTags: [],
          taughtCount: 0,
          steps: [
            {
              stepId: 'b2-s1',
              order: 1,
              blockCategory: ex2.blockCategory,
              exerciseId: ex2.id,
              durationMin: 5,
              selectedLayer: 'standard',
            },
          ],
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    setPreferredStudioVoicePersona('seoyeon');
    usePilatesStore.setState(originalState, true);
    vi.restoreAllMocks();
  });

  it('stitches today scheduled classes, switches between Seoyeon and Hyunsu AI voice personas, and plays Studio Neural clips', async () => {
    const mock = createMockAudioEnv();
    render(<DailyCommuteBriefingPanel todayDate="2026-11-24" engineOptions={mock.env} />);

    expect(screen.getByText(/오늘 예정 수업 2건/)).toBeInTheDocument();
    expect(screen.getByText('오전 리포머 베이직')).toBeInTheDocument();
    expect(screen.getByText('오전 매트 코어')).toBeInTheDocument();

    // Switch persona to Hyunsu AI voice
    fireEvent.click(screen.getByTestId('briefing-persona-hyunsu'));
    expect(getPreferredStudioVoicePersona()).toBe('hyunsu');
    expect(screen.getByText('현수 · 스튜디오 AI 음성')).toBeInTheDocument();

    // Play continuous briefing -> fetches Hyunsu briefing-welcome MP3
    await act(async () => {
      fireEvent.click(screen.getByTestId('briefing-primary-play-btn'));
    });
    await vi.waitFor(() => expect(mock.fetchedUrls.length).toBeGreaterThanOrEqual(1));
    expect(mock.fetchedUrls[0]).toBe('/audio/studio-voice/hyunsu/clips/briefing-welcome.mp3');
  });

  it('allows excluding individual classes from the briefing queue and toggling 1-min vs full mode', () => {
    const mock = createMockAudioEnv();
    render(<DailyCommuteBriefingPanel todayDate="2026-11-24" engineOptions={mock.env} />);

    expect(screen.getByText('브리핑 포함 수업 (2/2)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '오전 매트 코어 브리핑 제외' }));
    expect(screen.getByText('브리핑 포함 수업 (1/2)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '전체 동작 연속 듣기' }));
    expect(screen.getByRole('button', { name: '전체 동작 연속 듣기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
