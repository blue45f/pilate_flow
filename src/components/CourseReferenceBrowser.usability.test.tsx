import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSE_REFERENCES } from '../data/courseReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { CourseReference } from '../utils/courseReferences';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';

const baseComplete = COURSE_REFERENCES.find(
  (entry) => entry.publisher !== null && !entry.publisherAmendment,
)!;
const baseAmended = COURSE_REFERENCES.find((entry) => Boolean(entry.publisherAmendment))!;

const MOCK_ENTRIES: readonly CourseReference[] = [
  {
    ...baseComplete,
    id: 'mock-reformer-title-50',
    title: '리포머 시퀀스 50분 참고 구성',
    titleCompleteness: 'complete-as-observed',
    publisher: '모의 필라테스 연구소',
    publisherRegion: null,
    titleLanguage: ['ko'],
    facts: {
      apparatus: ['reformer'],
      props: null,
      difficulty: 'intermediate',
      bodyTags: ['core'],
    },
    duration: {
      officialMetadataSeconds: null,
      publisherTitleDeclaredMinutes: 50,
      publisherDescriptionDeclaredMinutes: null,
    },
  },
  {
    ...baseAmended,
    id: 'mock-mat-amended-desc-30',
    title: 'Beginner Mat Sequence Reference (No Props)',
    titleCompleteness: 'complete-as-observed',
    publisherRegion: 'San Diego, CA',
    titleLanguage: ['en'],
    facts: {
      apparatus: ['mat'],
      props: [],
      difficulty: 'beginner',
      bodyTags: ['full-body'],
    },
    duration: {
      officialMetadataSeconds: null,
      publisherTitleDeclaredMinutes: null,
      publisherDescriptionDeclaredMinutes: 30,
    },
  },
  {
    ...baseComplete,
    id: 'mock-unknown-apparatus-len',
    title: '미니볼 활용 전신 수업 참고 링크',
    titleCompleteness: 'complete-as-observed',
    publisher: '모의 미니볼 채널',
    publisherRegion: null,
    titleLanguage: ['ko'],
    facts: {
      apparatus: null,
      props: ['mini-ball'],
      difficulty: null,
      bodyTags: null,
    },
    duration: {
      officialMetadataSeconds: null,
      publisherTitleDeclaredMinutes: null,
      publisherDescriptionDeclaredMinutes: null,
    },
  },
  {
    ...baseComplete,
    id: 'mock-chair-short-25',
    title: '체어 하체 25분 시퀀스 참고',
    titleCompleteness: 'complete-as-observed',
    publisher: '모의 체어 스튜디오',
    publisherRegion: null,
    titleLanguage: ['ko'],
    facts: {
      apparatus: ['chair'],
      props: ['box'],
      difficulty: 'for beginners',
      bodyTags: ['lower-body'],
    },
    duration: {
      officialMetadataSeconds: null,
      publisherTitleDeclaredMinutes: 25,
      publisherDescriptionDeclaredMinutes: null,
    },
  },
  {
    ...baseComplete,
    id: 'mock-incomplete-candidate',
    title: '캐딜락 시퀀스 일부 제목 ...',
    titleCompleteness: 'partial-as-observed',
    publisher: null,
    publisherRegion: null,
    titleLanguage: ['ko'],
    facts: {
      apparatus: ['cadillac'],
      props: null,
      difficulty: null,
      bodyTags: null,
    },
    duration: {
      officialMetadataSeconds: null,
      publisherTitleDeclaredMinutes: null,
      publisherDescriptionDeclaredMinutes: null,
    },
    researchDisposition: 'metadata-incomplete',
  },
];

const initialStoreSnapshot = usePilatesStore.getState();
const initialCatalogJson = JSON.stringify(COURSE_REFERENCES);

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('Network requests are forbidden in CourseReferenceBrowser tests');
  });
  usePilatesStore.setState(
    {
      ...initialStoreSnapshot,
      exerciseBrowseScope: 'all',
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(initialStoreSnapshot, true);
  expect(JSON.stringify(COURSE_REFERENCES)).toBe(initialCatalogJson);
});

describe('CourseReferenceBrowser quick apparatus/duration filtering, honest source facts, and comparison UX', () => {
  it('filters directly via quick apparatus and declared-duration chips, syncs with the filter drawer, and never estimates unverified metadata', async () => {
    render(<CourseReferenceBrowser entries={MOCK_ENTRIES} />);

    // 4 complete entries visible by default out of 5 total
    expect(screen.getByRole('status')).toHaveTextContent('4 / 5건');
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(4);

    // Card 1: title-declared minutes distinguished from actual video runtime
    expect(cards[0]).toHaveTextContent('50분 (제목 표기) · 실제 영상 길이 미확인');

    // Card 2: publisher amendment badge, explicit empty-props statement, and description-declared minutes
    expect(cards[1]).toHaveTextContent('공식 게시자 근거 보완');
    expect(cards[1]).toHaveTextContent('소도구 없음(게시자 표기)');
    expect(cards[1]).toHaveTextContent('30분 (설명 표기) · 실제 영상 길이 미확인');

    // Card 3: missing apparatus, duration, difficulty, and body tags stay explicitly unverified (never inferred as Mat)
    expect(cards[2]).toHaveTextContent('기구 표기 미확인');
    expect(cards[2]).toHaveTextContent('미확인 · 실제 영상 길이 미확인');
    expect(cards[2]).toHaveTextContent('난이도 미확인 · 부위 미확인');

    // Quick apparatus filter without opening the filter drawer
    const eqGroup = screen.getByRole('group', { name: '게시자 표기 기구 빠른 선택' });
    const durationGroup = screen.getByRole('group', { name: '선언 수업 길이 빠른 선택' });

    fireEvent.click(within(eqGroup).getByRole('button', { name: '리포머' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 5건');
    fireEvent.click(within(eqGroup).getByRole('button', { name: '매트' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 5건');

    // Combine with quick declared-duration filter ('30–49분') -> narrows to description-declared 30-min entry
    fireEvent.click(within(durationGroup).getByRole('button', { name: '30–49분' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 5건');
    expect(
      screen.getByRole('heading', { name: /Beginner Mat Sequence Reference/ }),
    ).toBeInTheDocument();

    // Opening the filter drawer via its toggle button (showing 3 active filters) syncs the combobox
    const filterDrawerToggle = screen.getByRole('button', { name: '필터 3', expanded: false });
    expect(filterDrawerToggle).toHaveAttribute('aria-controls', 'course-filters');
    fireEvent.click(filterDrawerToggle);
    expect(filterDrawerToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: '게시자가 선언한 수업 길이' })).toHaveValue(
      '30-49',
    );

    // Switching quick duration to '길이 미확인' while '리포머'+'매트' are selected produces 0 results with applied summary
    fireEvent.click(within(durationGroup).getByRole('button', { name: '길이 미확인' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 / 5건');
    expect(screen.getByTestId('course-empty-filter-summary')).toHaveTextContent('리포머');
    expect(screen.getByTestId('course-empty-filter-summary')).toHaveTextContent(
      '선언 길이 미확인',
    );

    // Clicking '전체 기구' reveals the unknown-duration entry; '초기화' resets all filters and restores search focus
    fireEvent.click(within(eqGroup).getByRole('button', { name: '전체 기구' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 5건');
    expect(
      screen.getByRole('heading', { name: /미니볼 활용 전신 수업 참고 링크/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '수업 영상 검색·필터 초기화' }));
    expect(screen.getByRole('status')).toHaveTextContent('4 / 5건');
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: '수업 영상 검색' })).toHaveFocus(),
    );
  });

  it('compares up to 3 sources across repeated search and owned-scope changes, rejects a 4th politely, and keeps article/status contracts intact', () => {
    const { container } = render(<CourseReferenceBrowser entries={MOCK_ENTRIES} />);

    // Pin 1st source -> collapsed tray (1/3); Pin 2nd source -> auto-expands side-by-side comparison (2/3)
    fireEvent.click(
      screen.getByRole('button', { name: '리포머 시퀀스 50분 참고 구성 출처 비교 담기' }),
    );
    const comparePanel = screen.getByRole('region', { name: '선택한 참고 자료 비교' });
    expect(comparePanel).toHaveTextContent('출처 비교 1/3건');
    expect(within(comparePanel).getByRole('button', { name: '비교표 펼치기 (1)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Beginner Mat Sequence Reference (No Props) 출처 비교 담기',
      }),
    );
    expect(comparePanel).toHaveTextContent('출처 비교 2/3건');
    expect(within(comparePanel).getByRole('button', { name: '비교표 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    // Comparison items never use <article>, preserving card article counts
    expect(container.querySelectorAll('article')).toHaveLength(4);

    const cmpItem1 = screen.getByTestId('course-compare-item-mock-reformer-title-50');
    const cmpItem2 = screen.getByTestId('course-compare-item-mock-mat-amended-desc-30');
    expect(cmpItem1).toHaveTextContent('공개 검색 메타데이터');
    expect(cmpItem1).toHaveTextContent('게시 국가 미확인');
    expect(cmpItem2).toHaveTextContent('공식 게시자 근거 보완');
    expect(cmpItem2).toHaveTextContent('지역 표기: San Diego, CA');
    const evidenceLink = within(cmpItem2).getByRole('link', {
      name: /공식 게시자 연결 근거/,
    });
    expect(evidenceLink).toHaveAttribute('href', baseAmended.publisherAmendment!.sourceUrl);
    expect(evidenceLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Survives 0-result search and owned-equipment scope transitions without losing compared items
    const searchInput = screen.getByRole('searchbox', { name: '수업 영상 검색' });
    fireEvent.change(searchInput, { target: { value: '존재하지않는수업검색어888' } });
    expect(within(cmpItem1).getByText('현재 조건 밖 · 선택 유지됨')).toBeInTheDocument();
    expect(within(cmpItem2).getByText('현재 조건 밖 · 선택 유지됨')).toBeInTheDocument();

    act(() => {
      usePilatesStore.getState().setExerciseBrowseScope('owned');
    });
    expect(screen.getByText(/전체 필수 장비가 확인된 링크가 없어/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '선택한 참고 자료 비교' })).toHaveTextContent(
      '출처 비교 2/3건',
    );

    fireEvent.click(screen.getByRole('button', { name: '보유 장비 조건만 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 영상 검색어 지우기' }));
    expect(screen.getByRole('status')).toHaveTextContent('4 / 5건');

    // Pin 3rd source, then verify 4th source is politely rejected without creating duplicate role="status" or role="alert"
    fireEvent.click(
      screen.getByRole('button', { name: '미니볼 활용 전신 수업 참고 링크 출처 비교 담기' }),
    );
    expect(comparePanel).toHaveTextContent('출처 비교 3/3건');

    const fourthBtn = screen.getByRole('button', {
      name: '체어 하체 25분 시퀀스 참고 출처 비교 담기',
    });
    fireEvent.click(fourthBtn);
    expect(fourthBtn).toHaveAttribute('aria-pressed', 'false');
    expect(comparePanel).toHaveTextContent('출처 비교 3/3건');
    expect(comparePanel).toHaveTextContent('최대 3건까지 담을 수 있습니다');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /수업에 추가|추천/ })).toBeNull();
  });

  it('supports keyboard arrow navigation on quick chips, Escape/remove/clear focus recovery, and responsive/reduced-motion CSS rules', async () => {
    render(<CourseReferenceBrowser entries={MOCK_ENTRIES} />);

    // Keyboard ArrowRight / ArrowLeft / End / Home navigation on quick apparatus chip group
    const eqGroup = screen.getByRole('group', { name: '게시자 표기 기구 빠른 선택' });
    const allEqBtn = within(eqGroup).getByRole('button', { name: '전체 기구' });
    const reformerBtn = within(eqGroup).getByRole('button', { name: '리포머' });
    const cadillacBtn = within(eqGroup).getByRole('button', { name: '캐딜락' });

    allEqBtn.focus();
    fireEvent.keyDown(eqGroup, { key: 'ArrowRight' });
    expect(reformerBtn).toHaveFocus();
    fireEvent.keyDown(eqGroup, { key: 'End' });
    expect(cadillacBtn).toHaveFocus();
    fireEvent.keyDown(eqGroup, { key: 'Home' });
    expect(allEqBtn).toHaveFocus();
    fireEvent.keyDown(eqGroup, { key: 'ArrowLeft' });
    expect(cadillacBtn).toHaveFocus();

    // Pin 2 items -> Escape collapses comparison grid and restores focus to expand/collapse button
    const firstCompareTrigger = screen.getByRole('button', {
      name: '리포머 시퀀스 50분 참고 구성 출처 비교 담기',
    });
    const secondCompareTrigger = screen.getByRole('button', {
      name: '미니볼 활용 전신 수업 참고 링크 출처 비교 담기',
    });
    fireEvent.click(firstCompareTrigger);
    fireEvent.click(secondCompareTrigger);

    const comparePanel = screen.getByRole('region', { name: '선택한 참고 자료 비교' });
    expect(within(comparePanel).getByRole('button', { name: '비교표 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.keyDown(comparePanel, { key: 'Escape' });
    const expandBtn = within(comparePanel).getByRole('button', { name: '비교표 펼치기 (2)' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(expandBtn).toHaveFocus());

    // Removing one chip while 1 remains moves focus to expandBtn; clearing all restores focus to last visible card trigger
    fireEvent.click(
      within(comparePanel).getByRole('button', {
        name: '리포머 시퀀스 50분 참고 구성 비교에서 제외',
      }),
    );
    await waitFor(() =>
      expect(within(comparePanel).getByRole('button', { name: '비교표 펼치기 (1)' })).toHaveFocus(),
    );

    fireEvent.click(within(comparePanel).getByRole('button', { name: /비교 비우기/ }));
    expect(screen.queryByRole('region', { name: '선택한 참고 자료 비교' })).toBeNull();
    await waitFor(() => expect(secondCompareTrigger).toHaveFocus());

    // When last trigger is filtered out, clearing comparison falls back focus safely to searchbox
    fireEvent.click(secondCompareTrigger);
    const searchInput = screen.getByRole('searchbox', { name: '수업 영상 검색' });
    fireEvent.change(searchInput, { target: { value: '리포머' } });
    fireEvent.click(
      within(screen.getByRole('region', { name: '선택한 참고 자료 비교' })).getByRole('button', {
        name: /비교 비우기/,
      }),
    );
    await waitFor(() => expect(searchInput).toHaveFocus());

    // Verify CSS touch target (>= 44px), responsive mobile breakpoints, and prefers-reduced-motion rules
    const explorerCss = readFileSync(
      resolve(process.cwd(), 'src/styles/course-explorer.css'),
      'utf8',
    );
    const referencesCss = readFileSync(
      resolve(process.cwd(), 'src/styles/course-references.css'),
      'utf8',
    );
    expect(explorerCss).toContain('min-height: 44px');
    expect(explorerCss).toContain('@media (max-width: 680px)');
    expect(explorerCss).toContain('@media (max-width: 390px)');
    expect(explorerCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(referencesCss).toContain('word-break: keep-all');
  });
});
