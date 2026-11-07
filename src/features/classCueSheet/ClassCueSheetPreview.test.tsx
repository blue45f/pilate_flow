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

    expect(screen.getByTestId('no-mandatory-gate-badge').textContent).toContain(
      '필수 검토 게이트 없음',
    );
    expect(screen.getByTestId('cue-sheet-empty-state').textContent).toContain(
      '수업 진행 항목이 비어 있습니다 (0개 항목)',
    );

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

  it('prioritizes mobile-first reading order (Compact Header -> Focus Deck -> Full List -> Diagnostics) and collapses full list and diagnostics by default', () => {
    render(<ClassCueSheetPreview />);

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    expect(rootEl.getAttribute('data-full-list-open')).toBe('false');
    expect(rootEl.getAttribute('data-diagnostics-open')).toBe('false');
    expect(rootEl.getAttribute('data-mandatory-review-gate')).toBe('false');
    expect(rootEl.getAttribute('data-reduced-motion')).toBe('respected');

    const headerEl = screen.getByTestId('cue-sheet-compact-header');
    const focusDeckEl = screen.getByTestId('cue-sheet-focus-deck');
    const progressionEl = screen.getByTestId('cue-sheet-progression-section');
    const diagnosticsEl = screen.getByTestId('cue-sheet-diagnostics-section');

    // Verify top-to-bottom DOM reading order
    expect(
      Boolean(
        headerEl.compareDocumentPosition(focusDeckEl) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      Boolean(
        focusDeckEl.compareDocumentPosition(progressionEl) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      Boolean(
        progressionEl.compareDocumentPosition(diagnosticsEl) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);

    // Full list and diagnostics panels are collapsed on screen by default
    const fullListPanel = screen.getByTestId('cue-sheet-full-list-panel');
    const diagnosticsPanel = screen.getByTestId('cue-sheet-diagnostics-panel');
    expect(fullListPanel.getAttribute('data-collapsed')).toBe('true');
    expect(diagnosticsPanel.getAttribute('data-collapsed')).toBe('true');

    // Toggle full progression list open and closed
    const fullListToggle = screen.getByTestId('cue-sheet-full-list-toggle');
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(fullListToggle);
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('true');
    expect(rootEl.getAttribute('data-full-list-open')).toBe('true');
    expect(fullListPanel.getAttribute('data-collapsed')).toBe('false');

    // Toggle technical diagnostics open and closed
    const diagnosticsToggle = screen.getByTestId('cue-sheet-diagnostics-toggle');
    expect(diagnosticsToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(diagnosticsToggle);
    expect(diagnosticsToggle.getAttribute('aria-expanded')).toBe('true');
    expect(rootEl.getAttribute('data-diagnostics-open')).toBe('true');
    expect(diagnosticsPanel.getAttribute('data-collapsed')).toBe('false');
  });

  it('supports configurable text scale controls (100%, 125%, 150%, 200%) with aria-pressed and CSS custom property', () => {
    render(<ClassCueSheetPreview />);

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    const btn100 = screen.getByTestId('cue-sheet-scale-100');
    const btn125 = screen.getByTestId('cue-sheet-scale-125');
    const btn150 = screen.getByTestId('cue-sheet-scale-150');
    const btn200 = screen.getByTestId('cue-sheet-scale-200');

    expect(rootEl.getAttribute('data-text-scale')).toBe('100');
    expect(rootEl.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1');
    expect(btn100.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(btn125);
    expect(rootEl.getAttribute('data-text-scale')).toBe('125');
    expect(rootEl.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1.25');
    expect(btn125.getAttribute('aria-pressed')).toBe('true');
    expect(btn100.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(btn150);
    expect(rootEl.getAttribute('data-text-scale')).toBe('150');
    expect(rootEl.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1.5');
    expect(btn150.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(btn200);
    expect(rootEl.getAttribute('data-text-scale')).toBe('200');
    expect(rootEl.style.getPropertyValue('--cue-sheet-font-scale')).toBe('2');
    expect(btn200.getAttribute('aria-pressed')).toBe('true');
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

    // Expand full progression list and click row 2 to verify aria-current="step"
    fireEvent.click(screen.getByTestId('cue-sheet-full-list-toggle'));
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
      <ClassCueSheetPreview
        initialFixtureId="long-korean-cues-empty-cues-duplicates"
        initialFullListOpen={true}
      />,
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

    // Compact header truncation badge and truncation banner are rendered prominently and never hidden
    expect(
      screen.getByTestId('cue-sheet-header-truncation-badge').textContent,
    ).toContain('상한 적용됨');
    const truncationBanner = screen.getByRole('region', {
      name: '진행표 잘림 및 상한 안내',
    });
    expect(truncationBanner).toBeTruthy();
    expect(truncationBanner.textContent).toContain('생략된 입력 항목:');
    expect(truncationBanner.textContent).toContain('생략된 펼침 행:');

    // Switch to expanded view ('반복·좌우 펼침 진행표') which also opens the full list panel
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

  it('preserves active movement identity across live edits when steps are inserted before, deleted before, or reordered', () => {
    const baseSteps = [
      {
        id: 'step-1',
        nameKo: '풋워크 패러렐',
        durationMin: 4,
        cues: ['뒤꿈치 정렬 유지'],
      },
      {
        id: 'step-2',
        nameKo: '헌드레드 프렙',
        durationMin: 3,
        cues: ['흉곽 하단 고정 및 호흡 연결'],
      },
      {
        id: 'step-3',
        nameKo: '레그 서클즈',
        durationMin: 4,
        cues: ['골반 중립 유지'],
      },
    ];

    const { rerender } = render(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'live-edit-seq',
          title: '실시간 편집 시퀀스',
          steps: baseSteps,
        }}
      />,
    );

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    const nextSection = screen.getByRole('region', { name: '다음 준비 항목' });

    // Navigate to step-2 ('헌드레드 프렙', index 1)
    fireEvent.click(screen.getByRole('button', { name: '다음 진행 항목' }));
    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-step-2-1',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('1');
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'user-navigation',
    );

    // 1. Insert a new step BEFORE the current item
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'live-edit-seq',
          title: '실시간 편집 시퀀스',
          steps: [
            {
              id: 'step-0',
              nameKo: '호흡 워밍업',
              durationMin: 2,
              cues: ['갈비뼈 3차원 호흡'],
            },
            ...baseSteps,
          ],
        }}
      />,
    );

    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect(within(currentSection).getByText('03 / 04')).toBeTruthy();
    expect(within(nextSection).getByText('레그 서클즈')).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-step-2-1',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('2');
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'preserved-by-id',
    );
    expect(screen.getByTestId('cue-sheet-a11y-status').textContent).toContain(
      '현재 진행: #03/04 헌드레드 프렙 · 다음 준비: #04 레그 서클즈',
    );

    // 2. Delete the two steps BEFORE the current item
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'live-edit-seq',
          title: '실시간 편집 시퀀스',
          steps: [baseSteps[1]!, baseSteps[2]!],
        }}
      />,
    );

    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect(within(currentSection).getByText('01 / 02')).toBeTruthy();
    expect(within(nextSection).getByText('레그 서클즈')).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-step-2-1',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('0');
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'preserved-by-id',
    );

    // 3. Reorder steps so step-2 is moved to the last position
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'live-edit-seq',
          title: '실시간 편집 시퀀스',
          steps: [baseSteps[2]!, baseSteps[0]!, baseSteps[1]!],
        }}
      />,
    );

    expect(within(currentSection).getByText('헌드레드 프렙')).toBeTruthy();
    expect(within(currentSection).getByText('03 / 03')).toBeTruthy();
    expect(
      within(nextSection).getByText(/마지막 항목입니다 · 다음 예정 항목 없음/),
    ).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-step-2-1',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('2');
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'preserved-by-id',
    );

    fireEvent.click(screen.getByTestId('cue-sheet-full-list-toggle'));
    const progressionList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const rowButtons = within(progressionList).getAllByRole('button');
    expect(rowButtons[2]?.getAttribute('aria-current')).toBe('step');
  });

  it('tracks the exact movement instance when multiple steps share the same Korean name (same-name different-id) across insertions and reorders', () => {
    const { rerender } = render(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'dup-name-live-seq',
          title: '동일 이름 구분 라이브 편집 시퀀스',
          steps: [
            {
              id: 'bridge-warmup',
              nameKo: '브릿징',
              durationMin: 3,
              cues: ['워밍업 기본 척추 분절 브릿징'],
            },
            {
              id: 'bridge-challenge',
              nameKo: '브릿징',
              durationMin: 5,
              cues: ['심화 싱글 레그 챌린지 브릿징'],
            },
          ],
        }}
      />,
    );

    // Select the 2nd '브릿징' (bridge-challenge)
    fireEvent.click(screen.getByRole('button', { name: '다음 진행 항목' }));

    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    const rootEl = screen.getByTestId('class-cue-sheet-root');

    expect(
      within(currentSection).getByText('심화 싱글 레그 챌린지 브릿징'),
    ).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-bridge-challenge-1',
    );

    // Insert another '브릿징' at the beginning AND swap bridge-challenge before bridge-warmup
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'dup-name-live-seq',
          title: '동일 이름 구분 라이브 편집 시퀀스',
          steps: [
            {
              id: 'bridge-prep',
              nameKo: '브릿징',
              durationMin: 2,
              cues: ['사전 골반 틸트 브릿징'],
            },
            {
              id: 'bridge-challenge',
              nameKo: '브릿징',
              durationMin: 5,
              cues: ['심화 싱글 레그 챌린지 브릿징'],
            },
            {
              id: 'bridge-warmup',
              nameKo: '브릿징',
              durationMin: 3,
              cues: ['워밍업 기본 척추 분절 브릿징'],
            },
          ],
        }}
      />,
    );

    expect(
      within(currentSection).getByText('심화 싱글 레그 챌린지 브릿징'),
    ).toBeTruthy();
    expect(within(currentSection).getByText('02 / 03')).toBeTruthy();
    expect(rootEl.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-bridge-challenge-1',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('1');
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'preserved-by-id',
    );
  });

  it('falls back to the adjacent step and shows an explicit fallback notice when the active item is deleted, then clears the notice on manual navigation', () => {
    const { rerender } = render(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'delete-active-seq',
          title: '선택 항목 삭제 폴백 시퀀스',
          steps: [
            { id: 's-1', nameKo: '풋워크', durationMin: 4 },
            { id: 's-2', nameKo: '헌드레드', durationMin: 3 },
            { id: 's-3', nameKo: '레그 서클즈', durationMin: 4 },
          ],
        }}
      />,
    );

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });

    // Move to s-2 ('헌드레드', index 1)
    fireEvent.click(screen.getByRole('button', { name: '다음 진행 항목' }));
    expect(within(currentSection).getByText('헌드레드')).toBeTruthy();

    // Delete s-2 while it is active -> should fallback to s-3 ('레그 서클즈') at clamped index 1
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'delete-active-seq',
          title: '선택 항목 삭제 폴백 시퀀스',
          steps: [
            { id: 's-1', nameKo: '풋워크', durationMin: 4 },
            { id: 's-3', nameKo: '레그 서클즈', durationMin: 4 },
          ],
        }}
      />,
    );

    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'fallback-adjacent-after-delete',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('1');
    expect(within(currentSection).getByText('레그 서클즈')).toBeTruthy();

    const fallbackNotice = screen.getByTestId(
      'cue-sheet-selection-fallback-notice',
    );
    expect(fallbackNotice.textContent).toContain('헌드레드');
    expect(fallbackNotice.textContent).toContain('#02 레그 서클즈');

    // Manual navigation clears the fallback notice
    fireEvent.click(screen.getByRole('button', { name: '이전 진행 항목' }));
    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'user-navigation',
    );
    expect(
      screen.queryByTestId('cue-sheet-selection-fallback-notice'),
    ).toBeNull();
  });

  it('keeps expanded view rows synchronized with the current item across view toggles and live edits', () => {
    const { rerender } = render(
      <ClassCueSheetPreview
        initialViewMode="expanded"
        initialFullListOpen={true}
        sourceInput={{
          id: 'expanded-sync-seq',
          title: '펼침 보기 동기화 시퀀스',
          steps: [
            {
              id: 'exp-1',
              nameKo: '풋워크',
              durationMin: 3,
              sets: 2,
              sideMode: 'together',
            },
            {
              id: 'exp-2',
              nameKo: '사이드 레그 리프트',
              durationMin: 4,
              sets: 2,
              sideMode: 'left-then-right',
            },
          ],
        }}
      />,
    );

    const expandedList = screen.getByRole('list', {
      name: '펼친 진행표 항목 목록',
    });
    const expandedButtons = within(expandedList).getAllByRole('button');
    // Click an expanded row belonging to exp-2 ('사이드 레그 리프트')
    const exp2RowButton = expandedButtons.find((btn) =>
      btn.textContent?.includes('사이드 레그 리프트'),
    );
    expect(exp2RowButton).toBeTruthy();
    fireEvent.click(exp2RowButton!);

    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });
    expect(within(currentSection).getByText('사이드 레그 리프트')).toBeTruthy();

    const activeExpandedRows = expandedList.querySelectorAll(
      'li[data-is-current-parent="true"]',
    );
    expect(activeExpandedRows.length).toBe(4); // 2 sets * 2 sides

    // Live-edit: insert exp-0 before exp-1 while in expanded view
    rerender(
      <ClassCueSheetPreview
        initialViewMode="expanded"
        initialFullListOpen={true}
        sourceInput={{
          id: 'expanded-sync-seq',
          title: '펼침 보기 동기화 시퀀스',
          steps: [
            {
              id: 'exp-0',
              nameKo: '임프린트 앤 릴리즈',
              durationMin: 2,
              sets: 1,
              sideMode: 'together',
            },
            {
              id: 'exp-1',
              nameKo: '풋워크',
              durationMin: 3,
              sets: 2,
              sideMode: 'together',
            },
            {
              id: 'exp-2',
              nameKo: '사이드 레그 리프트',
              durationMin: 4,
              sets: 2,
              sideMode: 'left-then-right',
            },
          ],
        }}
      />,
    );

    expect(within(currentSection).getByText('사이드 레그 리프트')).toBeTruthy();
    expect(within(currentSection).getByText('03 / 03')).toBeTruthy();

    const updatedActiveExpandedRows = expandedList.querySelectorAll(
      'li[data-is-current-parent="true"]',
    );
    expect(updatedActiveExpandedRows.length).toBe(4);
    expect(
      updatedActiveExpandedRows[0]?.getAttribute('data-parent-cue-item-id'),
    ).toBe('cue-item-id-exp-2-1');

    // Switch to compact view and verify aria-current="step" is on #03 사이드 레그 리프트
    fireEvent.click(screen.getByRole('button', { name: /기본 진행표/ }));
    const compactList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const compactButtons = within(compactList).getAllByRole('button');
    expect(compactButtons[2]?.getAttribute('aria-current')).toBe('step');
  });

  it('handles empty ↔ 100+ item transitions and resets to step #1 when sourceInput is replaced with a different class', () => {
    const { rerender } = render(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'empty-seq',
          title: '빈 수업',
          steps: [],
        }}
      />,
    );

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    const currentSection = screen.getByRole('region', { name: '현재 진행 항목' });

    expect(rootEl.getAttribute('data-selection-resolution')).toBe('empty-class');
    expect(rootEl.getAttribute('data-current-step-index')).toBe('-1');
    expect(screen.getByTestId('cue-sheet-a11y-status').textContent).toBe(
      '현재 진행 항목 없음 (0/0) · 다음 준비 항목 없음',
    );

    // Transition from empty class to a 160-step class
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'long-160-seq',
          title: '대용량 160개 동작 수업',
          steps: Array.from({ length: 160 }, (_, idx) => ({
            id: `long-step-${idx + 1}`,
            nameKo: `대용량 동작 ${idx + 1}`,
            durationMin: 1,
          })),
        }}
      />,
    );

    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'reset-on-class-change',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('0');
    expect(within(currentSection).getByText('대용량 동작 1')).toBeTruthy();

    // Jump to the last bounded step (#150 / index 149)
    fireEvent.click(
      screen.getByRole('button', { name: '마지막 진행 항목으로 이동' }),
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('149');
    expect(within(currentSection).getByText('대용량 동작 150')).toBeTruthy();

    // Replace with a different class -> resets to step #1 (index 0)
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'brand-new-class',
          title: '완전히 다른 신규 수업',
          steps: [
            { id: 'new-1', nameKo: '신규 첫 동작', durationMin: 5 },
            { id: 'new-2', nameKo: '신규 둘째 동작', durationMin: 5 },
          ],
        }}
      />,
    );

    expect(rootEl.getAttribute('data-selection-resolution')).toBe(
      'reset-on-class-change',
    );
    expect(rootEl.getAttribute('data-current-step-index')).toBe('0');
    expect(within(currentSection).getByText('신규 첫 동작')).toBeTruthy();

    // Transition back to empty class
    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'brand-new-class',
          title: '완전히 다른 신규 수업 (비움)',
          steps: [],
        }}
      />,
    );

    expect(rootEl.getAttribute('data-selection-resolution')).toBe('empty-class');
    expect(rootEl.getAttribute('data-current-step-index')).toBe('-1');
  });

  it('retains keyboard focus inside the focus deck (never dropping to document.body) when boundary buttons disable or a focused step is deleted', () => {
    const { rerender } = render(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'focus-retention-seq',
          title: '포커스 유지 검증 시퀀스',
          steps: [
            { id: 'f-1', nameKo: '동작 1', durationMin: 3 },
            { id: 'f-2', nameKo: '동작 2', durationMin: 3 },
          ],
        }}
      />,
    );

    const focusDeck = screen.getByTestId('cue-sheet-focus-deck');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');
    const prevBtn = screen.getByTestId('cue-sheet-nav-prev');

    // Focus nextBtn and click it to reach the last step (which disables nextBtn)
    nextBtn.focus();
    expect(document.activeElement).toBe(nextBtn);
    fireEvent.click(nextBtn);

    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(focusDeck);

    // Focus prevBtn and click it to reach the first step (which disables prevBtn)
    prevBtn.focus();
    expect(document.activeElement).toBe(prevBtn);
    fireEvent.click(prevBtn);

    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(focusDeck);

    // Navigate with ArrowDown / j / ArrowUp / k on the focus deck
    fireEvent.keyDown(focusDeck, { key: 'ArrowDown' });
    expect(
      screen.getByTestId('class-cue-sheet-root').getAttribute(
        'data-current-step-index',
      ),
    ).toBe('1');
    fireEvent.keyDown(focusDeck, { key: 'ArrowUp' });
    expect(
      screen.getByTestId('class-cue-sheet-root').getAttribute(
        'data-current-step-index',
      ),
    ).toBe('0');

    // Open full list, focus the row button for '동작 2', select it, and then delete '동작 2' in a live edit
    fireEvent.click(screen.getByTestId('cue-sheet-full-list-toggle'));
    const progressionList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const rowButtons = within(progressionList).getAllByRole('button');
    rowButtons[1]!.focus();
    fireEvent.click(rowButtons[1]!);
    expect(document.activeElement).toBe(rowButtons[1]);

    rerender(
      <ClassCueSheetPreview
        sourceInput={{
          id: 'focus-retention-seq',
          title: '포커스 유지 검증 시퀀스',
          steps: [{ id: 'f-1', nameKo: '동작 1', durationMin: 3 }],
        }}
      />,
    );

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(focusDeck);
  });

  it('does not preventDefault or change the active step when keyboard shortcuts are dispatched from input, textarea, select, contenteditable, modifier keys, or IME composition', () => {
    render(
      <ClassCueSheetPreview
        showFixtureSwitcher={true}
        initialStepIndex={1}
        sourceInput={{
          id: 'editable-guard-seq',
          title: '편집 입력 키보드 보호 시퀀스',
          steps: [
            { id: 'eg-1', nameKo: '동작 1', durationMin: 3 },
            { id: 'eg-2', nameKo: '동작 2', durationMin: 3 },
            { id: 'eg-3', nameKo: '동작 3', durationMin: 3 },
          ],
        }}
      />,
    );

    const rootEl = screen.getByTestId('class-cue-sheet-root');
    const focusDeck = screen.getByTestId('cue-sheet-focus-deck');
    expect(rootEl.getAttribute('data-current-step-index')).toBe('1');

    // Mount editable elements inside focusDeck to prove bubbling keydowns from editable controls are never intercepted
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    const textareaEl = document.createElement('textarea');
    const selectEl = document.createElement('select');
    const contentEditableEl = document.createElement('div');
    contentEditableEl.setAttribute('contenteditable', 'true');
    const nestedSpanInContentEditable = document.createElement('span');
    contentEditableEl.appendChild(nestedSpanInContentEditable);

    focusDeck.appendChild(inputEl);
    focusDeck.appendChild(textareaEl);
    focusDeck.appendChild(selectEl);
    focusDeck.appendChild(contentEditableEl);

    const shortcutKeys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'j',
      'k',
      'n',
      'p',
    ];

    for (const target of [
      inputEl,
      textareaEl,
      selectEl,
      contentEditableEl,
      nestedSpanInContentEditable,
    ]) {
      target.focus();
      for (const key of shortcutKeys) {
        const evt = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        });
        const notCancelled = fireEvent(target, evt);
        expect(notCancelled).toBe(true);
        expect(evt.defaultPrevented).toBe(false);
        expect(rootEl.getAttribute('data-current-step-index')).toBe('1');
      }
    }

    // Remove temporary editable elements and focus the deck itself
    inputEl.remove();
    textareaEl.remove();
    selectEl.remove();
    contentEditableEl.remove();
    focusDeck.focus();

    // Modifier keys (ctrlKey, metaKey, altKey, shiftKey) and IME composition must not intercept or navigate
    for (const key of shortcutKeys) {
      for (const mod of [
        { ctrlKey: true },
        { metaKey: true },
        { altKey: true },
        { shiftKey: true },
        { isComposing: true },
        { keyCode: 229 },
      ]) {
        const evt = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
          ...mod,
        });
        const notCancelled = fireEvent(focusDeck, evt);
        expect(notCancelled).toBe(true);
        expect(evt.defaultPrevented).toBe(false);
        expect(rootEl.getAttribute('data-current-step-index')).toBe('1');
      }
    }

    // Plain unmodified shortcut on focusDeck still navigates and prevents default
    const validEvt = new KeyboardEvent('keydown', {
      key: 'j',
      bubbles: true,
      cancelable: true,
    });
    const validNotCancelled = fireEvent(focusDeck, validEvt);
    expect(validNotCancelled).toBe(false);
    expect(validEvt.defaultPrevented).toBe(true);
    expect(rootEl.getAttribute('data-current-step-index')).toBe('2');
  });

  it('maintains a single aria-live / role="status" announcement region (cue-sheet-a11y-status) across normal, empty, and delete-fallback states', () => {
    const { container, rerender } = render(
      <ClassCueSheetPreview
        initialFullListOpen={true}
        sourceInput={{
          id: 'single-live-region-seq',
          title: '단일 라이브 리전 검증 시퀀스',
          steps: [
            { id: 'sl-1', nameKo: '풋워크', durationMin: 4 },
            { id: 'sl-2', nameKo: '헌드레드', durationMin: 3 },
            { id: 'sl-3', nameKo: '레그 서클즈', durationMin: 4 },
          ],
        }}
      />,
    );

    const assertSingleLiveStatusRegion = () => {
      const liveOrStatusEls = container.querySelectorAll(
        '[aria-live], [role="status"]',
      );
      expect(liveOrStatusEls.length).toBe(1);
      expect(liveOrStatusEls[0]?.getAttribute('data-testid')).toBe(
        'cue-sheet-a11y-status',
      );
      expect(liveOrStatusEls[0]?.getAttribute('role')).toBe('status');
      expect(liveOrStatusEls[0]?.getAttribute('aria-live')).toBe('polite');
      expect(liveOrStatusEls[0]?.getAttribute('aria-atomic')).toBe('true');
      expect(
        screen.getByTestId('cue-sheet-current-card').getAttribute('aria-live'),
      ).toBeNull();
    };

    // 1. Normal state
    assertSingleLiveStatusRegion();

    // 2. Delete active step -> fallback-adjacent-after-delete state with fallback notice visible
    fireEvent.click(screen.getByRole('button', { name: '다음 진행 항목' }));
    rerender(
      <ClassCueSheetPreview
        initialFullListOpen={true}
        sourceInput={{
          id: 'single-live-region-seq',
          title: '단일 라이브 리전 검증 시퀀스',
          steps: [
            { id: 'sl-1', nameKo: '풋워크', durationMin: 4 },
            { id: 'sl-3', nameKo: '레그 서클즈', durationMin: 4 },
          ],
        }}
      />,
    );
    const fallbackNotice = screen.getByTestId(
      'cue-sheet-selection-fallback-notice',
    );
    expect(fallbackNotice.getAttribute('role')).toBe('note');
    expect(screen.getByTestId('cue-sheet-a11y-status').textContent).toContain(
      '이전 선택 항목(헌드레드) 삭제됨, 인접 항목으로 위치 유지',
    );
    assertSingleLiveStatusRegion();

    // 3. Empty class state
    rerender(
      <ClassCueSheetPreview
        initialFullListOpen={true}
        sourceInput={{
          id: 'single-live-region-seq',
          title: '단일 라이브 리전 검증 시퀀스 (비움)',
          steps: [],
        }}
      />,
    );
    expect(
      screen.getByTestId('cue-sheet-empty-state').getAttribute('role'),
    ).toBeNull();
    assertSingleLiveStatusRegion();
  });

  it('does not steal focus back to the cue sheet when the user blurs to document.body or focuses an external input before a re-render', () => {
    const externalInput = document.createElement('input');
    externalInput.type = 'text';
    document.body.appendChild(externalInput);

    try {
      const { rerender } = render(
        <ClassCueSheetPreview
          sourceInput={{
            id: 'no-focus-steal-seq',
            title: '포커스 비탈취 검증 시퀀스',
            steps: [
              { id: 'nfs-1', nameKo: '동작 1', durationMin: 3 },
              { id: 'nfs-2', nameKo: '동작 2', durationMin: 3 },
            ],
          }}
        />,
      );

      const nextBtn = screen.getByTestId('cue-sheet-nav-next');

      // 1. Focus inside root, then blur to document.body (relatedTarget === null)
      nextBtn.focus();
      expect(document.activeElement).toBe(nextBtn);
      nextBtn.blur();
      expect(document.activeElement).toBe(document.body);

      // Re-render with updated steps while nextBtn is still mounted and enabled -> must NOT steal focus
      rerender(
        <ClassCueSheetPreview
          sourceInput={{
            id: 'no-focus-steal-seq',
            title: '포커스 비탈취 검증 시퀀스 (업데이트 1)',
            steps: [
              { id: 'nfs-1', nameKo: '동작 1', durationMin: 3 },
              { id: 'nfs-2', nameKo: '동작 2', durationMin: 3 },
              { id: 'nfs-3', nameKo: '동작 3', durationMin: 3 },
            ],
          }}
        />,
      );
      expect(document.activeElement).toBe(document.body);

      // 2. Focus inside root, then move focus to external input outside root
      nextBtn.focus();
      expect(document.activeElement).toBe(nextBtn);
      externalInput.focus();
      expect(document.activeElement).toBe(externalInput);

      rerender(
        <ClassCueSheetPreview
          sourceInput={{
            id: 'no-focus-steal-seq',
            title: '포커스 비탈취 검증 시퀀스 (업데이트 2)',
            steps: [{ id: 'nfs-1', nameKo: '동작 1', durationMin: 3 }],
          }}
        />,
      );
      expect(document.activeElement).toBe(externalInput);
    } finally {
      externalInput.remove();
    }
  });
});
