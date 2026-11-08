import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';

const originalScope = usePilatesStore.getState().exerciseBrowseScope;
beforeEach(() => usePilatesStore.getState().setExerciseBrowseScope('all'));
afterEach(() => {
  cleanup();
  usePilatesStore.getState().setExerciseBrowseScope(originalScope);
});

describe('whole-course reference exploration', () => {
  it('labels the list honestly and opens original links without embedding or recommendation', () => {
    const { container } = render(<CourseReferenceBrowser />);
    expect(screen.getByRole('status')).toHaveTextContent('27 / 32건');
    expect(container.querySelectorAll('article')).toHaveLength(6);
    expect(container.querySelector('iframe, video')).toBeNull();
    expect(screen.getAllByText(/재생·음성 언어·임베드 미확인/)).toHaveLength(6);
    for (const link of container.querySelectorAll('a')) {
      expect(link.href).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(
      screen.queryByRole('button', { name: /수업에 추가|추천/ }),
    ).not.toBeInTheDocument();
  });
  it('combines filters, includes incomplete candidates explicitly, and resets empty results', () => {
    render(<CourseReferenceBrowser />);
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: /게시자·제목 확인이 덜 된 후보/ }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('32 / 32건');
    fireEvent.click(
      screen.getByRole('checkbox', { name: '내 보유 장비로만 가능한 자료' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('0 / 32건');
    expect(
      screen.getByText(/전체 필수 장비가 확인된 링크가 없어/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 / 32건');
    fireEvent.click(screen.getByRole('button', { name: '보유 장비 조건만 해제' }));
    expect(screen.getByRole('status')).toHaveTextContent('27 / 32건');
    fireEvent.change(
      screen.getByRole('searchbox', { name: '수업 영상 검색' }),
      {
        target: { value: 'no-matching-course-0000' },
      },
    );
    expect(
      screen.getByText('이 조건의 수업 자료가 없습니다'),
    ).toBeInTheDocument();
  });
  it('exposes the exact official publisher amendment while keeping playback and timing unknown', () => {
    const { container } = render(<CourseReferenceBrowser />);
    fireEvent.change(
      screen.getByRole('searchbox', { name: '수업 영상 검색' }),
      { target: { value: 'Jessica Valant' } },
    );
    const cards = screen.getAllByRole('article');
    const card = cards.find((item) =>
      item.querySelector(
        'a[href="https://www.youtube.com/watch?v=D3TC-tz3TeQ"]',
      ),
    )!;
    expect(card).toBeTruthy();
    expect(
      within(card).getByText('Jessica Valant', { exact: true }),
    ).toBeInTheDocument();
    fireEvent.click(within(card).getByText('근거·권리와 확인 범위'));
    expect(
      within(card).getByRole('link', { name: /공식 게시자 연결 근거/ }),
    ).toHaveAttribute(
      'href',
      'https://jessicavalantpilates.com/pilates-beginners-beginner-pilates-exercise-video',
    );
    expect(
      within(card).getByText(/원본 재생·현재 접근성은 확인하지 않았습니다/),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/재생·음성 언어·임베드 미확인/),
    ).toBeInTheDocument();
    expect(container.querySelector('iframe,video')).toBeNull();
  });
  it('keeps unknown language/runtime distinctions in card details', () => {
    render(<CourseReferenceBrowser />);
    const card = screen.getAllByRole('article')[0];
    expect(within(card).getByText(/실제 영상 길이 미확인/)).toBeInTheDocument();
    expect(within(card).getByText(/게시 국가 미확인/)).toBeInTheDocument();
    expect(within(card).getByText(/복제 라이선스 미확인/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /6건 더 보기/ }));
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });
});
