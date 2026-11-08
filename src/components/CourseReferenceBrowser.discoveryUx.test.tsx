import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';
import { COURSE_REFERENCES } from '../data/courseReferences';

afterEach(cleanup);

describe('course reference discovery and keyboard recovery', () => {
  it('offers title-language choices without presenting them as verified spoken language', () => {
    render(<CourseReferenceBrowser />);
    const languages = screen.getByRole('group', { name: '제목·설명 언어 빠른 선택' });
    fireEvent.click(within(languages).getByRole('button', { name: '한국어 표기' }));
    expect(within(languages).getByRole('button', { name: '한국어 표기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('제목·설명 기준 · 음성 언어 미확인')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '수업 영상 적용 조건' })).toHaveTextContent(
      '한국어 제목·설명',
    );
    for (const card of screen.getAllByRole('article'))
      expect(card).toHaveTextContent('한국어 제목·설명');
    fireEvent.click(within(languages).getByRole('button', { name: '전체 제목' }));
    expect(screen.getByRole('status')).toHaveTextContent('27 / 32건');
  });

  it('keeps applied conditions visible when filters are folded and removes only the selected condition', async () => {
    render(<CourseReferenceBrowser />);
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.change(screen.getByRole('combobox', { name: '게시자가 선언한 수업 길이' }), {
      target: { value: 'under-30' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /게시자·제목 확인이 덜 된 후보/ }));
    fireEvent.click(screen.getByRole('button', { name: '필터 2' }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const active = screen.getByRole('group', { name: '수업 영상 적용 조건' });
    expect(active).toHaveTextContent('선언 길이 30분 미만');
    expect(active).toHaveTextContent('추가 확인 후보 포함');
    fireEvent.click(within(active).getByRole('button', { name: '선언 길이 30분 미만 조건 해제' }));
    expect(active).not.toHaveTextContent('선언 길이');
    expect(screen.getByRole('status')).toHaveTextContent('32 / 32건');
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: '수업 영상 검색' })).toHaveFocus(),
    );
  });

  it('recovers from the unsupported owned-equipment condition without dropping the query or other choices', async () => {
    render(<CourseReferenceBrowser />);
    const search = screen.getByRole('searchbox', { name: '수업 영상 검색' });
    fireEvent.change(search, { target: { value: 'Jessica' } });
    const expected = screen.getByRole('status').textContent;
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '내 보유 장비로만 가능한 자료' }));
    expect(screen.getByText(/전체 필수 장비가 확인된 링크가 없어/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '보유 장비 조건만 해제' }));
    expect(search).toHaveValue('Jessica');
    expect(screen.getByRole('status')).toHaveTextContent(expected!);
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.queryByRole('button', { name: '보유 장비 조건만 해제' })).not.toBeInTheDocument();
  });

  it('returns focus to search after clearing and resetting empty search results', async () => {
    render(<CourseReferenceBrowser />);
    const search = screen.getByRole('searchbox', { name: '수업 영상 검색' });
    fireEvent.change(search, { target: { value: 'missing-course-xyz' } });
    fireEvent.click(screen.getByRole('button', { name: '수업 영상 검색어 지우기' }));
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('27 / 32건');
    fireEvent.change(search, { target: { value: 'missing-course-xyz' } });
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    await waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue('');
    expect(screen.queryByRole('group', { name: '수업 영상 적용 조건' })).not.toBeInTheDocument();
  });

  it('focuses the first added result on every page, including when the final more button disappears', () => {
    const sourceBefore = JSON.stringify(COURSE_REFERENCES);
    const { container } = render(<CourseReferenceBrowser />);
    let more = screen.queryByRole('button', { name: /건 더 보기/ });
    while (more) {
      const previousCount = screen.getAllByRole('article').length;
      fireEvent.click(more);
      expect(container.querySelectorAll('article h3')[previousCount]).toHaveFocus();
      more = screen.queryByRole('button', { name: /건 더 보기/ });
    }
    expect(screen.getAllByRole('article')).toHaveLength(27);
    expect(JSON.stringify(COURSE_REFERENCES)).toBe(sourceBefore);
    expect(container.querySelector('video, iframe')).toBeNull();
    expect(screen.queryByRole('button', { name: /수업에 추가|추천/ })).not.toBeInTheDocument();
  });
});
