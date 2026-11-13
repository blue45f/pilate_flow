import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  VERIFIED_YOUTUBE_VIDEO_POOL,
  type RawVerifiedYouTubeItem,
} from '../data/exerciseYouTubeCatalog';
import { filterPilatesVideos } from '../utils/pilatesVideoSearch';
import { PilatesVideoLibrary } from './PilatesVideoLibrary';

afterEach(cleanup);

describe('complete movement video library', () => {
  it('combines text, equipment, and region without broadening the requested equipment', () => {
    const fixtures: RawVerifiedYouTubeItem[] = [
      {
        videoId: 'abcdefghijk',
        title: 'Foot Work',
        authorName: 'Teacher One',
        apparatus: ['reformer'],
        region: 'global',
        keywords: ['풋워크'],
        blocks: ['footwork'],
      },
      {
        videoId: 'ABCDEFGHIJK',
        title: 'Chair footwork',
        authorName: 'Teacher One',
        apparatus: ['chair'],
        region: 'global',
        keywords: ['풋워크'],
        blocks: ['footwork'],
      },
      {
        videoId: '12345678901',
        title: '리포머 풋워크',
        authorName: '국내 강사',
        apparatus: ['reformer'],
        region: 'kr',
        keywords: ['footwork'],
        blocks: ['footwork'],
      },
      {
        videoId: 'invalid',
        title: 'Footwork',
        authorName: 'Teacher One',
        apparatus: ['reformer'],
        region: 'global',
        keywords: [],
        blocks: ['footwork'],
      },
    ];
    expect(
      filterPilatesVideos(fixtures, 'foot-work Teacher', 'reformer', 'global').map(
        (video) => video.videoId,
      ),
    ).toEqual(['abcdefghijk']);
    expect(
      filterPilatesVideos(fixtures, '리포머 풋워크', 'all', 'kr').map((video) => video.videoId),
    ).toEqual(['12345678901']);
    expect(filterPilatesVideos(fixtures, '', 'chair', 'kr')).toEqual([]);
  });

  it('loads only requested players, keeps one iframe, and restores keyboard focus on close', () => {
    const { container } = render(<PilatesVideoLibrary />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelectorAll('.pvl-card')).toHaveLength(12);
    const triggers = screen.getAllByRole('button', { name: /영상 열기$/ });
    fireEvent.click(triggers[0]);
    const player = screen.getByRole('region', { name: /영상 플레이어$/ });
    expect(player).toHaveFocus();
    const iframe = player.querySelector('iframe')!;
    const initialSrc = iframe.src;
    expect(iframe.src).toContain('https://www.youtube-nocookie.com/embed/');
    expect(iframe.src).toContain('autoplay=0');
    expect(iframe.getAttribute('allow')).not.toContain('autoplay');
    expect(within(player).getByRole('link', { name: 'YouTube에서 보기' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    fireEvent.click(triggers[1]);
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(container.querySelector('iframe')!.src).not.toBe(initialSrc);
    fireEvent.keyDown(screen.getByRole('region', { name: /영상 플레이어$/ }), { key: 'Escape' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(triggers[1]).toHaveFocus();
  });

  it('paginates thumbnails, resets filters and unloads the player on navigation or hidden pages', () => {
    const { container } = render(<PilatesVideoLibrary />);
    fireEvent.click(screen.getByRole('button', { name: '영상 12편 더 보기' }));
    expect(container.querySelectorAll('.pvl-card')).toHaveLength(24);
    const open = () => fireEvent.click(screen.getAllByRole('button', { name: /영상 열기$/ })[0]);
    open();
    fireEvent.click(
      within(screen.getByRole('group', { name: '전체 동작 영상 기구' })).getByRole('button', {
        name: '리포머',
      }),
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelectorAll('.pvl-card')).toHaveLength(12);
    open();
    fireEvent(window, new Event('pagehide'));
    expect(container.querySelector('iframe')).toBeNull();
    open();
    const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    try {
      fireEvent(document, new Event('visibilitychange'));
      expect(container.querySelector('iframe')).toBeNull();
    } finally {
      if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
      else Reflect.deleteProperty(document, 'hidden');
    }
    fireEvent.change(screen.getByRole('searchbox', { name: '전체 동작 영상 검색' }), {
      target: { value: 'a-nonexistent-movement-xyz' },
    });
    expect(screen.getByText('조건에 맞는 영상이 없습니다')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체 영상 보기' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      String(VERIFIED_YOUTUBE_VIDEO_POOL.length),
    );
  });

  it('retains the official source and an actionable video when its thumbnail fails', () => {
    const video = VERIFIED_YOUTUBE_VIDEO_POOL.find((item) => item.sourceUrl)!;
    const { container } = render(<PilatesVideoLibrary />);
    fireEvent.change(screen.getByRole('searchbox', { name: '전체 동작 영상 검색' }), {
      target: { value: video.title },
    });
    const trigger = screen.getByRole('button', { name: `${video.title} 영상 열기` });
    fireEvent.error(trigger.querySelector('img')!);
    expect(trigger.querySelector('img')).toBeNull();
    fireEvent.click(trigger);
    const player = screen.getByRole('region', { name: /영상 플레이어$/ });
    expect(within(player).getByRole('link', { name: '제작자 동작 설명' })).toHaveAttribute(
      'href',
      video.sourceUrl,
    );
    expect(container.querySelector('iframe')).not.toBeNull();
  });
});
