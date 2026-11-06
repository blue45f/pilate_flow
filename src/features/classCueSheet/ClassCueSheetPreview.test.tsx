import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassCueSheetPreview } from './ClassCueSheetPreview';
import type { CueSheetFlexibleClassInput } from './classCueSheetTypes';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ClassCueSheetPreview', () => {
  it('renders empty class state cleanly without crashing and disables step navigation buttons', () => {
    render(<ClassCueSheetPreview initialFixtureId="empty-class" />);

    expect(
      screen.getByText(/독립 통합 후보 \(Standalone Integration Candidate\)/),
    ).toBeTruthy();
    expect(
      screen.getByText(/자동 처방 없음 · 안전성·운동 효과 보장 없음/),
    ).toBeTruthy();

    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    expect(
      within(currentSection).getByText(/등록된 수업 진행 항목이 없습니다/),
    ).toBeTruthy();

    const nextSection = screen.getByRole('region', { name: '다음 준비 항목' });
    expect(
      within(nextSection).getByText(/마지막 항목입니다 · 다음 예정 항목 없음/),
    ).toBeTruthy();

    const progressionSection = screen.getByRole('region', {
      name: '전체 수업 진행표',
    });
    expect(
      within(progressionSection).getByText(
        /수업 진행 항목이 비어 있습니다 \(0개 항목\)/,
      ),
    ).toBeTruthy();

    expect(
      (screen.getByRole('button', { name: '이전 진행 항목' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '다음 진행 항목' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: '첫 진행 항목으로 이동',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('navigates Current / Next item deck via buttons, keyboard (ArrowRight, ArrowLeft, Home, End), and clicking a progression row', () => {
    const sourceInput: CueSheetFlexibleClassInput = {
      id: 'nav-test-seq',
      title: '포커스 데크 네비게이션 검증 시퀀스',
      apparatus: 'reformer',
      level: '1.0',
      steps: [
        {
          id: 'step-1',
          nameKo: '풋워크 패러렐',
          durationMin: 4,
          repetitions: 10,
          sets: 2,
          sideMode: 'bilateral',
          springs: 'Red 3 + Blue 1',
          cues: ['뒤꿈치 정렬을 유지하며 캐리지를 밀어냅니다.'],
        },
        {
          id: 'step-2',
          nameKo: '헌드레드 프렙',
          durationMin: 3,
          repetitions: 10,
          sets: 1,
          sideMode: 'bilateral',
          springs: 'Red 1 + Blue 1',
          cues: ['흉곽 하단을 닫고 호흡과 팔 펌핑을 연결합니다.'],
        },
        {
          id: 'step-3',
          nameKo: '레그 서클즈',
          durationMin: 4,
          repetitions: 8,
          sets: 1,
          sideMode: 'bilateral',
          springs: 'Red 2',
          cues: ['골반 중립을 유지하며 고관절에서 원을 그립니다.'],
        },
      ],
    };

    render(<ClassCueSheetPreview sourceInput={sourceInput} />);

    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    const nextSection = screen.getByRole('region', { name: '다음 준비 항목' });
    const prevBtn = screen.getByRole('button', { name: '이전 진행 항목' });
    const nextBtn = screen.getByRole('button', { name: '다음 진행 항목' });
    const firstBtn = screen.getByRole('button', { name: '첫 진행 항목으로 이동' });

    expect(within(currentSection).getByText('풋워크 패러렐')).toBeTruthy();
    expect(within(currentSection).getByText('01 / 03')).toBeTruthy();
    expect(within(nextSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);

    // Move to step 2 via Next button
    fireEvent.click(nextBtn);
    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect(within(currentSection).getByText('02 / 03')).toBeTruthy();
    expect(within(nextSection).getByText('레그 서클즈')).toBeTruthy();

    // Move to step 3 via keyboard ArrowRight on focus deck
    const deck = screen.getByLabelText('현재 및 다음 진행 포커스 데크');
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(within(currentSection).getByText('레그 서클즈')).toBeTruthy();
    expect(within(currentSection).getByText('03 / 03')).toBeTruthy();
    expect(
      within(nextSection).getByText(/마지막 항목입니다 · 다음 예정 항목 없음/),
    ).toBeTruthy();
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);

    // Move back to step 2 via keyboard ArrowLeft
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();

    // Move to first step via Home key
    fireEvent.keyDown(deck, { key: 'Home' });
    expect(within(currentSection).getByText('풋워크 패러렐')).toBeTruthy();

    // Move to last step via End key
    fireEvent.keyDown(deck, { key: 'End' });
    expect(within(currentSection).getByText('레그 서클즈')).toBeTruthy();

    // Move to first step via firstBtn
    fireEvent.click(firstBtn);
    expect(within(currentSection).getByText('풋워크 패러렐')).toBeTruthy();

    // Click row 2 in full progression list and verify aria-current="step"
    const progressionList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const rowButtons = within(progressionList).getAllByRole('button');
    expect(rowButtons[0]?.getAttribute('aria-current')).toBe('step');
    expect(rowButtons[1]?.getAttribute('aria-current')).toBeNull();

    fireEvent.click(rowButtons[1]!);
    expect(rowButtons[1]?.getAttribute('aria-current')).toBe('step');
    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
  });

  it('renders name-only movements without forced classification and marks unspecified time explicitly', () => {
    render(<ClassCueSheetPreview initialFixtureId="name-only-drafts" />);

    expect(screen.getByTestId('name-only-count-badge').textContent).toContain(
      '강제 분류 없음',
    );
    expect(screen.getByTestId('unspecified-time-badge').textContent).toContain(
      '새 시간 추정 없음',
    );

    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    expect(
      within(currentSection).getByText('이름만 입력된 새 동작'),
    ).toBeTruthy();
    expect(within(currentSection).getAllByText(/시간 미정/).length).toBeGreaterThan(
      0,
    );
  });

  it('preserves long Korean titles/cues, explicit empty cues placeholder, and disambiguates duplicate movement names with stable data-cue-item-id', () => {
    render(
      <ClassCueSheetPreview initialFixtureId="long-korean-cues-empty-cues-duplicates" />,
    );

    const progressionList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const listItems = Array.from(
      progressionList.querySelectorAll('li[data-cue-item-id]'),
    );
    expect(listItems.length).toBeGreaterThanOrEqual(3);

    // Every item has a unique, stable data-cue-item-id
    const cueItemIds = listItems.map((li) =>
      li.getAttribute('data-cue-item-id'),
    );
    expect(cueItemIds.every((id) => Boolean(id))).toBe(true);
    expect(new Set(cueItemIds).size).toBe(cueItemIds.length);

    // Duplicate movement disambiguators are shown
    expect(
      within(progressionList).getAllByText(/동일 이름 #/).length,
    ).toBeGreaterThanOrEqual(2);

    // Empty cues show explicit placeholder ('작성된 큐 메모 없음')
    expect(
      within(progressionList).getAllByText(/작성된 큐 메모 없음/).length,
    ).toBeGreaterThanOrEqual(1);

    // Long cue item has .is-long-cue and .cue-sheet-long-note without truncation
    const longCueItems = progressionList.querySelectorAll(
      '.cue-sheet-item.is-long-cue',
    );
    expect(longCueItems.length).toBeGreaterThanOrEqual(1);
    const longNotes = progressionList.querySelectorAll('.cue-sheet-long-note');
    expect(longNotes.length).toBeGreaterThanOrEqual(1);
  });

  it('switches to expanded view and displays explicit truncation banner and omitted footer on 100+ item / high-repetition inputs', () => {
    const highExpansionInput: CueSheetFlexibleClassInput = {
      id: 'bounded-160-seq',
      title: '160개 항목 및 대량 펼침 상한 검증 수업',
      apparatus: 'reformer',
      level: '1.5',
      steps: Array.from({ length: 165 }, (_, idx) => ({
        id: `heavy-step-${idx + 1}`,
        nameKo: `고반복 유니래터럴 동작 ${idx + 1}`,
        durationMin: 1,
        repetitions: 8,
        sets: 4,
        sideMode: 'unilateral' as const,
        blockRepetitions: 3,
        cues: [`${idx + 1}번 동작 좌우 정렬 유지`],
      })),
    };

    render(<ClassCueSheetPreview sourceInput={highExpansionInput} />);

    // Truncation banner is rendered prominently and never hidden
    const truncationBanner = screen.getByRole('region', {
      name: '진행표 잘림 및 상한 안내',
    });
    expect(truncationBanner).toBeTruthy();
    expect(truncationBanner.textContent).toContain('생략된 입력 항목:');
    expect(truncationBanner.textContent).toContain('생략된 펼침 행:');

    // Switch to expanded view ('반복·좌우 펼침 진행표')
    const expandedBtn = screen.getByRole('button', {
      name: /반복·좌우 펼침 진행표/,
    });
    fireEvent.click(expandedBtn);

    const expandedList = screen.getByRole('list', {
      name: '펼친 진행표 항목 목록',
    });
    expect(expandedList).toBeTruthy();

    const omittedFooter = screen.getByTestId('expanded-omitted-footer');
    expect(omittedFooter.textContent).toContain('펼침 행이 생략되었습니다');
  });

  it('strips sensitive fields and renders HTML/script strings as escaped plain text with zero <script> elements in DOM', () => {
    const maliciousAndSensitiveInput = {
      id: 'sec-test-seq',
      title: '보안 검증 <script>window.__xss = true</script>',
      studentName: '김민수 회원',
      memberPhone: '010-1234-5678',
      medicalHistory: '요추 추간판 탈출증 병력',
      apiKey: 'AIzaSySecretKey99999',
      steps: [
        {
          id: 'xss-step-1',
          nameKo: '펠빅 컬 <img src=x onerror=alert(1)>',
          cues: ['<script>alert(1)</script> 꼬리뼈부터 분절합니다.'],
          instructorNote: '회원 연락처 010-9999-8888 메모 및 <b>강조 태그</b>',
          privateMemo: '절대 노출되면 안 되는 비공개 상담 기록',
        },
      ],
    };

    const { container } = render(
      <ClassCueSheetPreview sourceInput={maliciousAndSensitiveInput} />,
    );

    // Zero <script> or <img> elements injected into DOM
    expect(container.querySelectorAll('script').length).toBe(0);
    expect(container.querySelectorAll('img').length).toBe(0);

    // Sensitive values are completely absent from rendered text
    const fullText = container.textContent ?? '';
    expect(fullText).not.toContain('김민수 회원');
    expect(fullText).not.toContain('010-1234-5678');
    expect(fullText).not.toContain('요추 추간판 탈출증 병력');
    expect(fullText).not.toContain('AIzaSySecretKey99999');
    expect(fullText).not.toContain('절대 노출되면 안 되는 비공개 상담 기록');
    expect(fullText).not.toContain('010-9999-8888');

    // Escaped/literal text is preserved safely as text content
    expect(fullText).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(screen.getByTestId('privacy-stripped-badge')).toBeTruthy();
  });

  it('guarantees local ephemeral state: navigating steps, switching fixtures, and toggling print preview never writes to storage or mutates inputs', () => {
    const localSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const localRemoveItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const localClearSpy = vi.spyOn(Storage.prototype, 'clear');

    const rawInput: CueSheetFlexibleClassInput = {
      id: 'immutability-seq',
      title: '불변성 검증 시퀀스',
      steps: [
        {
          id: 'imm-1',
          nameKo: '브릿징',
          durationMin: 3,
          cues: ['척추 분절 유지'],
        },
        {
          id: 'imm-2',
          nameKo: '체스트 리프트',
          durationMin: 3,
          cues: ['경추 정렬 유지'],
        },
      ],
    };
    const snapshotBefore = JSON.stringify(rawInput);

    render(
      <ClassCueSheetPreview
        sourceInput={rawInput}
        showFixtureSwitcher={true}
      />,
    );

    // Navigate next and previous
    fireEvent.click(screen.getByRole('button', { name: '다음 진행 항목' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 진행 항목' }));

    // Toggle expanded / compact view
    fireEvent.click(
      screen.getByRole('button', { name: /반복·좌우 펼침 진행표/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: /기본 진행표/ }));

    // Toggle local print preview mode
    const printPreviewBtn = screen.getByRole('button', {
      name: '로컬 인쇄 미리보기 보기',
    });
    const rootEl = screen.getByTestId('class-cue-sheet-root');
    expect(rootEl.classList.contains('is-print-preview')).toBe(false);

    fireEvent.click(printPreviewBtn);
    expect(rootEl.classList.contains('is-print-preview')).toBe(true);
    expect(printPreviewBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(printPreviewBtn);
    expect(rootEl.classList.contains('is-print-preview')).toBe(false);

    // Switch fixture via <select>
    const fixtureSelect = screen.getByLabelText('합성 수업 픽스처 선택');
    fireEvent.change(fixtureSelect, { target: { value: 'empty-class' } });

    expect(localSetItemSpy).not.toHaveBeenCalled();
    expect(localRemoveItemSpy).not.toHaveBeenCalled();
    expect(localClearSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(rawInput)).toBe(snapshotBefore);
  });
});
