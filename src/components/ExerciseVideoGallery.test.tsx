import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  getExerciseVideoReferences,
  type ExerciseVideoReference,
} from '../utils/exerciseVideoReferences';
import { ExerciseVideoGallery } from './ExerciseVideoGallery';

vi.mock('../utils/exerciseVideoReferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/exerciseVideoReferences')>();
  return { ...actual, getExerciseVideoReferences: vi.fn() };
});

const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
const videos: ExerciseVideoReference[] = Array.from({ length: 8 }, (_, index) => {
  const videoId = `video${String(index + 1).padStart(6, '0')}`;
  const title = `Bridge reference ${index + 1}`;
  const region = index % 2 === 0 ? 'kr' : 'global';
  return {
    videoId,
    title,
    authorName: `Creator ${index + 1}`,
    region,
    apparatus: ['mat'],
    blocks: ['bridging'],
    keywords: ['bridge'],
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    hqThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=0`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    relation: index === 0 ? 'named-movement' : 'related-variant',
    relationLabelKo: index === 0 ? '동작명 일치' : '관련 변형',
    matchReasonKo: '제목·기구를 대조한 참고 자료',
    isPrimary: index === 0,
    metadataStatus: 'creator-page-and-oembed',
    exactDemonstrationVerified: false,
    segmentVerified: false,
    professionalReviewVerified: false,
    playbackVerified: false,
    clip: {
      videoId,
      videoTitle: title,
      channelName: `Creator ${index + 1}`,
      region,
      startSec: 0,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
});
const cards = () => screen.getAllByRole('button', { name: /영상 선택$/ });
const load = () => fireEvent.click(screen.getByRole('button', { name: /인베드 영상 불러오기/ }));

describe('ExerciseVideoGallery', () => {
  beforeEach(() => {
    vi.mocked(getExerciseVideoReferences).mockReturnValue(videos);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows six lazy thumbnails, selects the saved primary, and focuses the first newly revealed reference', () => {
    render(<ExerciseVideoGallery exercise={exercise} />);
    expect(screen.getByRole('heading', { name: '참고 영상 8' })).toBeInTheDocument();
    expect(cards()).toHaveLength(6);
    expect(cards()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(cards()[0]).toHaveTextContent('저장한 영상 · 동작명 일치');
    expect(cards()[1]).toHaveTextContent('관련 변형');
    expect(cards()[0].querySelector('img')).toHaveAttribute('loading', 'lazy');
    expect(cards()[0].querySelector('img')).toHaveAttribute('decoding', 'async');
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /관련 영상 2개 더 보기/ }));
    expect(cards()).toHaveLength(8);
    expect(cards()[6]).toHaveFocus();
    expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument();
  });

  it('selects without playback or draft mutation and mounts only one explicit no-autoplay iframe', () => {
    const onSelect = vi.fn();
    const onUseForNoteDraft = vi.fn();
    render(
      <ExerciseVideoGallery
        exercise={exercise}
        onSelect={onSelect}
        onUseForNoteDraft={onUseForNoteDraft}
      />,
    );
    expect(onSelect).not.toHaveBeenCalled();
    cards()[1].focus();
    fireEvent.click(cards()[1]);
    expect(cards()[1]).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith(videos[1]);
    expect(onUseForNoteDraft).not.toHaveBeenCalled();
    expect(document.querySelector('iframe')).toBeNull();
    load();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    const oldFrame = document.querySelector('iframe')!;
    expect(oldFrame).toHaveAttribute('src', videos[1].embedUrl);
    expect(oldFrame.getAttribute('allow')).not.toContain('autoplay');
    expect(
      screen.getByRole('region', { name: /Bridge reference 2 인베드 플레이어/ }),
    ).toHaveFocus();
    fireEvent.click(cards()[2]);
    expect(oldFrame.isConnected).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
    expect(cards()[2]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '내 노트 참조 URL로 반영' }));
    expect(onUseForNoteDraft).toHaveBeenCalledExactlyOnceWith(videos[2]);
    expect(exercise.youtube.videoId).not.toBe(videos[2].videoId);
    load();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    expect(document.querySelector('iframe')).toHaveAttribute('src', videos[2].embedUrl);
  });

  it('supports arrow/Home/End focus navigation and restores the play button after Escape', () => {
    render(<ExerciseVideoGallery exercise={exercise} />);
    cards()[0].focus();
    fireEvent.keyDown(cards()[0], { key: 'ArrowRight' });
    expect(cards()[1]).toHaveFocus();
    fireEvent.keyDown(cards()[1], { key: 'End' });
    expect(cards()[5]).toHaveFocus();
    fireEvent.keyDown(cards()[5], { key: 'Home' });
    expect(cards()[0]).toHaveFocus();
    expect(cards()[0]).toHaveAttribute('aria-pressed', 'true');
    load();
    fireEvent.keyDown(screen.getByRole('region', { name: /인베드 플레이어/ }), { key: 'Escape' });
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: /인베드 영상 불러오기/ })).toHaveFocus();
  });

  it('unloads for regional filtering, subject edits, hiding and unmount without resuming automatically', () => {
    const view = render(<ExerciseVideoGallery exercise={exercise} />);
    load();
    fireEvent.click(screen.getByRole('button', { name: /해외 \(Global\)/ }));
    expect(document.querySelector('iframe')).toBeNull();
    expect(cards()).toHaveLength(4);
    expect(cards()[0]).toHaveAttribute('data-video-id', videos[1].videoId);
    load();
    view.rerender(
      <ExerciseVideoGallery
        exercise={{ ...exercise, youtube: { ...exercise.youtube, startSec: 15 } }}
      />,
    );
    expect(document.querySelector('iframe')).toBeNull();
    expect(cards()[0]).toHaveAttribute('data-video-id', videos[0].videoId);
    load();
    view.rerender(<ExerciseVideoGallery exercise={exercise} active={false} />);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByTestId('exercise-video-gallery')).not.toBeInTheDocument();
    view.rerender(<ExerciseVideoGallery exercise={exercise} />);
    expect(document.querySelector('iframe')).toBeNull();
    load();
    view.unmount();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('stops on document hidden and pagehide and requires another explicit action', () => {
    render(<ExerciseVideoGallery exercise={exercise} />);
    load();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(document.querySelector('iframe')).toBeNull();
    load();
    expect(document.querySelector('iframe')).toBeNull();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    expect(document.querySelector('iframe')).toBeNull();
    load();
    fireEvent(window, new Event('pagehide'));
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent(window, new Event('pageshow'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('tries the second thumbnail once then keeps a selectable text fallback', () => {
    render(<ExerciseVideoGallery exercise={exercise} />);
    const card = cards()[0];
    fireEvent.error(card.querySelector('img')!);
    expect(card.querySelector('img')).toHaveAttribute('src', videos[0].thumbnailUrl);
    fireEvent.error(card.querySelector('img')!);
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByText('미리보기 이미지 없음')).toBeInTheDocument();
    expect(card).toHaveAccessibleName('Bridge reference 1 (Creator 1) 영상 선택');
    fireEvent.click(card);
    load();
    expect(document.querySelector('iframe')).toHaveAttribute('src', videos[0].embedUrl);
  });

  it('rejects an unsafe embed and keeps an honest empty state without playback controls', () => {
    vi.mocked(getExerciseVideoReferences).mockReturnValue([
      { ...videos[0], embedUrl: videos[0].embedUrl.replace('autoplay=0', 'autoplay=1') },
    ]);
    const view = render(<ExerciseVideoGallery exercise={exercise} />);
    load();
    expect(document.querySelector('iframe')).toBeNull();
    view.unmount();
    vi.mocked(getExerciseVideoReferences).mockReturnValue([]);
    render(<ExerciseVideoGallery exercise={exercise} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      '이 동작에 연결된 참고 영상이 아직 없어요.',
    );
    expect(screen.queryByRole('button', { name: /영상 선택/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /인베드 영상 불러오기/ })).not.toBeInTheDocument();
  });
});
