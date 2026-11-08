import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DesignSystemInspector,
  PF_COLOR_TOKENS,
  PF_RADIUS_SHADOW_TOKENS,
  PF_SPACING_TOKENS,
  PF_TYPOGRAPHY_TOKENS,
  PfAiStatusBadge,
  PfBadge,
  PfBlockPill,
  PfButton,
  PfCard,
  PfEmptyState,
  PfErrorState,
  PfField,
  PfFormError,
  PfInput,
  PfLoadingState,
  PfMovementCard,
  PfSearchField,
  PfSelect,
  PfSequenceBlock,
  PfStatusBanner,
  PfTabContent,
  PfTabs,
  PfTextarea,
  PfTooltip,
} from '../design-system';
import { ClassBinderView } from '../components/ClassBinderView';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { InlineExerciseFinder } from '../components/InlineExerciseFinder';
import { InstructorStudyDialog } from '../components/InstructorStudyDialog';
import { LightDismissDialog } from '../components/LightDismissDialog';
import { LogSessionModal } from '../components/LogSessionModal';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  clearIdeaWorkingBuffer,
  resetMovementIdeaStateForTests,
  saveMovementIdeaToStore,
} from '../utils/movementIdeaDraft';

const originalState = usePilatesStore.getState();

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalState, true);
});

describe('Pilates Flow semantic design tokens and theme compatibility', () => {
  const tokenCss = readFileSync(resolve(process.cwd(), 'src/styles/design-tokens.css'), 'utf8');

  it('defines all cataloged color, typography, spacing, radius, and shadow CSS custom properties', () => {
    for (const token of PF_COLOR_TOKENS) {
      expect(tokenCss).toContain(`${token.cssVar}:`);
    }
    for (const token of PF_TYPOGRAPHY_TOKENS) {
      expect(tokenCss).toContain(`${token.cssVar}:`);
    }
    for (const token of PF_SPACING_TOKENS) {
      expect(tokenCss).toContain(`${token.cssVar}:`);
    }
    for (const token of PF_RADIUS_SHADOW_TOKENS) {
      expect(tokenCss).toContain(`${token.cssVar}:`);
    }
  });

  it('maintains compatibility with vnext variables and .teaching-high-contrast theme', () => {
    expect(tokenCss).toContain('var(--vnext-forest');
    expect(tokenCss).toContain('var(--vnext-ivory');
    expect(tokenCss).toContain('var(--vnext-sage');
    expect(tokenCss).toContain('var(--vnext-clay');
    expect(tokenCss).toContain('.teaching-high-contrast');
    expect(tokenCss).toContain("[data-pf-theme='high-contrast']");
    expect(tokenCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('Pilates Flow common design system components', () => {
  it('supports default, disabled, loading, and pressed states on PfButton with accessible names', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <PfButton variant="primary" onClick={onClick}>
        저장하기
      </PfButton>,
    );
    const btn = screen.getByRole('button', { name: '저장하기' });
    expect(btn).toHaveClass('btn-primary', 'pf-btn', 'pf-btn--primary');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <PfButton variant="primary" loading loadingLabel="저장 중…" onClick={onClick}>
        저장하기
      </PfButton>,
    );
    const loadingBtn = screen.getByRole('button', { name: '저장 중…' });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(loadingBtn);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <PfButton variant="secondary" pressed onClick={onClick}>
        북마크됨
      </PfButton>,
    );
    expect(screen.getByRole('button', { name: '북마크됨' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('wires PfField, PfInput, PfSelect, PfTextarea, PfSearchField, and PfFormError with ARIA attributes', () => {
    render(
      <div>
        <PfField
          label="그룹 별칭"
          htmlFor="test-group-input"
          required
          hint="실명 대신 반 별칭을 사용하세요."
          hintId="test-group-hint"
          error="수업 그룹 별칭을 입력해 주세요."
          errorId="test-group-err"
        >
          <PfInput
            id="test-group-input"
            hasError
            aria-describedby="test-group-hint test-group-err"
          />
        </PfField>
        <PfField label="기본 난이도" htmlFor="test-level-select">
          <PfSelect id="test-level-select" disabled defaultValue="1.5">
            <option value="1.0">Lv 1.0</option>
            <option value="1.5">Lv 1.5</option>
          </PfSelect>
        </PfField>
        <PfField label="메모" htmlFor="test-memo">
          <PfTextarea id="test-memo" defaultValue="예시 메모" />
        </PfField>
        <PfSearchField label="시퀀스 검색" placeholder="이름 검색" />
      </div>,
    );

    const input = screen.getByLabelText(/그룹 별칭/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('수업 그룹 별칭을 입력해 주세요.');
    expect(screen.getByLabelText('기본 난이도')).toBeDisabled();
    expect(screen.getByLabelText('메모')).toHaveValue('예시 메모');
    expect(screen.getByLabelText('시퀀스 검색')).toHaveAttribute('placeholder', '이름 검색');
  });

  it('supports keyboard navigation (ArrowRight, ArrowLeft, Home, End) on PfTabs in both tablist and group modes', () => {
    const onChange = vi.fn();
    const items = [
      { id: 'tab-1', label: '첫 번째' },
      { id: 'tab-2', label: '두 번째', disabled: true },
      { id: 'tab-3', label: '세 번째' },
    ] as const;

    const { rerender } = render(
      <PfTabs
        ariaLabel="테스트 탭"
        semantics="tablist"
        items={items}
        value="tab-1"
        onChange={onChange}
      />,
    );
    const tablist = screen.getByRole('tablist', { name: '테스트 탭' });
    const firstTab = within(tablist).getByRole('tab', { name: '첫 번째' });
    const thirdTab = within(tablist).getByRole('tab', { name: '세 번째' });

    act(() => {
      fireEvent.focus(firstTab);
      firstTab.focus();
    });
    // ArrowRight skips disabled tab-2 and moves to tab-3
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(thirdTab);
    expect(onChange).toHaveBeenLastCalledWith('tab-3');

    rerender(
      <PfTabs
        ariaLabel="테스트 탭"
        semantics="tablist"
        items={items}
        value="tab-3"
        onChange={onChange}
      />,
    );
    // ArrowRight wraps around to tab-1
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(firstTab);
    expect(onChange).toHaveBeenLastCalledWith('tab-1');

    // End moves to last enabled tab
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(document.activeElement).toBe(thirdTab);

    // Home moves to first enabled tab
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(document.activeElement).toBe(firstTab);
    expect(onChange).toHaveBeenLastCalledWith('tab-1');
    expect(thirdTab).toHaveAttribute('data-state', 'active');
  });

  it('wires Radix UI TabContent (role="tabpanel") and PfFormError / PfTooltip primitives cleanly', () => {
    render(
      <div>
        <PfTabs
          ariaLabel="프리미티브 탭"
          semantics="tablist"
          items={[
            { id: 'overview', label: '개요 탭' },
            { id: 'details', label: '상세 탭' },
          ]}
          value="overview"
          onChange={vi.fn()}
        >
          <PfTabContent value="overview">개요 패널 본문</PfTabContent>
          <PfTabContent value="details">상세 패널 본문</PfTabContent>
        </PfTabs>
        <PfFormError inline>인라인 오류 안내</PfFormError>
        <PfTooltip content="스프링 저항 안내" delayDuration={0}>
          <button type="button">스프링 도움말</button>
        </PfTooltip>
      </div>,
    );

    const activeTab = screen.getByRole('tab', { name: '개요 탭' });
    const tabpanel = screen.getByRole('tabpanel', { name: '개요 탭' });
    expect(tabpanel).toHaveTextContent('개요 패널 본문');
    expect(activeTab).toHaveAttribute('aria-controls', tabpanel.getAttribute('id'));
    expect(screen.getByRole('alert')).toHaveTextContent('인라인 오류 안내');
    expect(screen.getByRole('button', { name: '스프링 도움말' })).toBeInTheDocument();
  });

  it('renders PfCard, PfBadge, PfAiStatusBadge, PfMovementCard, PfSequenceBlock, PfBlockPill, feedback states, and sheet LightDismissDialog', () => {
    const onClose = vi.fn();
    render(
      <div>
        <PfCard as="article" variant="sample">
          <PfBadge tone="sample" shape="rect">
            예시 배지
          </PfBadge>
        </PfCard>
        <PfSequenceBlock phase="main" eyebrow="MAIN FLOW" title="본운동" meta="08:00">
          <PfMovementCard variant="idea" selected>
            <strong>창작 동작 카드</strong>
            <PfAiStatusBadge kind="creative-memo" />
          </PfMovementCard>
          <PfBlockPill kind="rest">휴식 01:00</PfBlockPill>
        </PfSequenceBlock>
        <PfStatusBanner tone="success">저장을 완료했습니다.</PfStatusBanner>
        <PfLoadingState title="불러오는 중…" />
        <PfEmptyState title="항목이 없습니다" description="새 항목을 추가해 주세요." />
        <PfErrorState title="불러오기 실패" description="다시 시도해 주세요." />
        <LightDismissDialog
          open
          variant="sheet"
          title="모바일 시트 제목"
          subtitle="시트 부제목 설명"
          onClose={onClose}
        >
          <button type="button">내부 액션</button>
        </LightDismissDialog>
      </div>,
    );

    expect(screen.getByText('예시 배지')).toHaveClass('pf-badge', 'pf-badge--sample');
    expect(
      screen.getByText('내 창작 메모 · 전문가 검증 아님').closest('.pf-ai-status'),
    ).toHaveClass('pf-ai-status--creative-memo');
    expect(screen.getByText('창작 동작 카드').closest('.pf-movement-card')).toHaveClass(
      'pf-movement-card--idea',
      'is-selected',
    );
    expect(screen.getByText('본운동').closest('.pf-sequence-block')).toHaveClass(
      'pf-sequence-block--main',
    );
    expect(screen.getByText('휴식 01:00')).toHaveClass('pf-block-pill', 'pf-block-pill--rest');
    expect(screen.getByText('불러오는 중…').closest('[role="status"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('heading', { name: '항목이 없습니다' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('불러오기 실패');

    const dialog = screen.getByRole('dialog', { name: '모바일 시트 제목' });
    expect(dialog).toHaveClass('pf-modal-dialog', 'pf-modal-dialog--sheet');
    expect(dialog).toHaveAccessibleDescription('시트 부제목 설명');
  });
});

describe('Internal dev-only DesignSystemInspector screen', () => {
  it('renders tokens, components, states, high-contrast preview, and responsive viewport simulation with synthetic data', () => {
    const onClose = vi.fn();
    render(<DesignSystemInspector open onClose={onClose} />);

    const inspector = screen.getByTestId('pf-design-system-inspector');
    expect(inspector).toHaveAttribute('data-pf-theme', 'light');
    expect(screen.getByRole('region', { name: '의미 기반 토큰 카탈로그' })).toBeInTheDocument();

    // Toggle high-contrast preview
    fireEvent.click(screen.getByRole('button', { name: /고대비 테마 미리보기/ }));
    expect(inspector).toHaveAttribute('data-pf-theme', 'high-contrast');

    // Switch to Components section
    fireEvent.click(screen.getByRole('tab', { name: '2. 공통 컴포넌트' }));
    expect(screen.getByRole('region', { name: '공통 컴포넌트 쇼케이스' })).toBeInTheDocument();
    expect(screen.getByText('조건 맞춤 초안')).toBeInTheDocument();
    expect(screen.getByText('벽 짚고 한 발 골반 회전 (예시)')).toBeInTheDocument();

    // Switch to States section
    fireEvent.click(screen.getByRole('tab', { name: '3. 상태·오류·접근성' }));
    expect(screen.getByRole('region', { name: '입력·폼 오류·상태 검수' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '로딩 상태 (Loading)' }));
    expect(screen.getByText('작업 공간을 열고 있어요…')).toBeInTheDocument();

    // Switch to Responsive simulation section
    fireEvent.click(screen.getByRole('tab', { name: '4. 반응형 시뮬레이션' }));
    const frame = inspector.querySelector('.pf-ds-viewport-frame') as HTMLElement;
    expect(frame).toHaveAttribute('data-viewport', '390');
    fireEvent.click(screen.getByRole('button', { name: '320px (소형 모바일)' }));
    expect(frame).toHaveAttribute('data-viewport', '320');
    fireEvent.click(screen.getByRole('button', { name: '768px (태블릿)' }));
    expect(frame).toHaveAttribute('data-viewport', '768');
    fireEvent.click(screen.getByRole('button', { name: '1280px (데스크톱)' }));
    expect(frame).toHaveAttribute('data-viewport', '1280');
  });
});

describe('Representative screens upgraded with the Design System', () => {
  beforeEach(() => {
    usePilatesStore.setState(
      {
        ...originalState,
        classGroups: [
          {
            id: 'group-evening-a',
            name: '저녁 A반 (예시)',
            type: 'group',
            defaultLevel: '1.5',
            scheduleLabel: '화·목 19:00',
            notes: '',
          },
          {
            id: 'group-morning-b',
            name: '오전 기구 반 (예시)',
            type: 'group',
            defaultLevel: '1.0',
            scheduleLabel: '월·수 10:00',
            notes: '',
          },
        ],
      },
      true,
    );
  });

  it('validates empty group alias with inline PfFormError and supports keyboard arrow navigation on ClassBinderView history filters', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    // Open group creation form and submit whitespace
    fireEvent.click(screen.getByRole('button', { name: '수업 그룹 추가' }));
    const aliasInput = screen.getByLabelText(/그룹 별칭/);
    fireEvent.change(aliasInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '그룹 추가' }));

    expect(screen.getByRole('alert')).toHaveTextContent('수업 그룹 별칭을 입력해 주세요.');
    expect(aliasInput).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(aliasInput);

    // Typing clears the inline error and submits cleanly
    fireEvent.change(aliasInput, { target: { value: '새벽 소그룹 (예시)' } });
    expect(aliasInput).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: '그룹 추가' }));
    // Action feedback is separate from the named history search-results announcement.
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('수업 그룹을 추가했습니다.');
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).not.toHaveTextContent(
      '수업 그룹을 추가했습니다.',
    );

    // Keyboard navigation on group filter pills
    const filterGroup = screen.getByRole('group', { name: '수업 그룹 필터' });
    const allBtn = within(filterGroup).getByRole('button', { name: '전체 기록' });
    const firstGroupBtn = within(filterGroup).getByRole('button', { name: '저녁 A반 (예시)' });
    allBtn.focus();
    fireEvent.keyDown(filterGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(firstGroupBtn);
    expect(firstGroupBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports keyboard mode switching and design system components in InstructorStudyDialog and LogSessionModal', () => {
    const exercise = structuredClone(INITIAL_EXERCISES[0]);
    render(
      <InstructorStudyDialog
        exercises={[exercise]}
        study={{
          bookmarkedExerciseIds: [],
          rehearsalCueHidden: true,
          completedTutorialTaskIds: [],
        }}
        onToggleBookmark={vi.fn()}
        onCueHiddenChange={vi.fn()}
        onTutorialTaskChange={vi.fn()}
        onOpenReview={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const modeGroup = screen.getByRole('group', { name: '연습실 보기' });
    const studyBtn = within(modeGroup).getByRole('button', { name: '동작 숙지' });
    const guideBtn = within(modeGroup).getByRole('button', { name: '사용법 다시 보기' });
    studyBtn.focus();
    fireEvent.keyDown(modeGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(guideBtn);
    expect(guideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: '수업 준비 사용법' })).toBeInTheDocument();

    cleanup();

    render(<LogSessionModal sequenceId="seq-reformer-1" onClose={vi.fn()} />);
    const logDialog = screen.getByRole('dialog', { name: '수업 기록 남기기' });
    expect(logDialog).toHaveClass('pf-modal-dialog', 'pf-modal-dialog--sheet');
    fireEvent.click(within(logDialog).getByRole('button', { name: '수업 그룹 추가' }));
    fireEvent.click(within(logDialog).getByRole('button', { name: '추가' }));
    expect(within(logDialog).getByRole('alert')).toHaveTextContent(
      '수업 그룹 별칭을 입력해 주세요.',
    );
  });

  it('applies PfMovementCard, PfSequenceBlock, PfBlockPill, PfAiStatusBadge, and core flow continuation across SequenceWorkbench, ExerciseAtlasView, InlineExerciseFinder, and ClassBinderView', () => {
    resetMovementIdeaStateForTests();
    clearIdeaWorkingBuffer();

    const ideaResult = saveMovementIdeaToStore({
      ideaLine: '박스 위에서 골반 중립 유지하며 팔 원 그리기',
      workingTitle: '박스 암 서클 메모',
      subjectiveFeeling: '견갑골 하각이 안정적으로 지지됨',
      adjustmentNote: '어깨가 으쓱하지 않게 목 길게 유지',
      photoDataUrl: '',
      apparatus: 'reformer',
      durationMin: 4,
    });
    expect(ideaResult.ok).toBe(true);
    const ideaId = ideaResult.exercise!.id;

    // 1. ExerciseAtlasView renders PfMovementCard (variant="idea") + PfAiStatusBadge (tried-memo)
    const { container: atlasContainer } = render(
      <ExerciseAtlasView
        onOpenYouTubePreview={vi.fn()}
        onOpenIdeaSheet={vi.fn()}
        onOpenClipper={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '박스 암 서클 메모' },
    });
    const ideaCardInAtlas = atlasContainer.querySelector('.pf-movement-card--idea');
    expect(ideaCardInAtlas).not.toBeNull();
    expect(ideaCardInAtlas?.querySelector('.pf-ai-status--tried-memo')).not.toBeNull();

    cleanup();

    // 2. InlineExerciseFinder renders PfMovementCard + PfAiStatusBadge and allows adding the 1-line idea directly
    const { container: finderContainer } = render(
      <InlineExerciseFinder onOpenExercise={vi.fn()} />,
    );
    fireEvent.change(
      screen.getByRole('searchbox', { name: '동작 이름 또는 등록된 부위 태그 검색' }),
      { target: { value: '박스 암 서클 메모' } },
    );
    expect(finderContainer.querySelector('.pf-movement-card--idea')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '박스 암 서클 메모 수업안에 추가' }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(ideaId);

    cleanup();

    // 3. SequenceWorkbench renders PfSequenceBlock, PfMovementCard--step, PfBlockPill--memo, PfAiStatusBadge, and .pf-flow-continuation
    const { container: workbenchContainer } = render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenIdeaSheet={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );
    expect(workbenchContainer.querySelector('.pf-sequence-block')).not.toBeNull();
    expect(workbenchContainer.querySelector('.pf-movement-card--step')).not.toBeNull();
    expect(workbenchContainer.querySelector('.pf-block-pill--memo')).toHaveTextContent(
      '내 창작 메모 · 전문가 검증 아님',
    );
    expect(screen.getByRole('region', { name: '핵심 흐름 이어가기' })).toBeInTheDocument();

    // Save to binder and verify ClassBinderView renders PfBlockPill--memo on saved sequence card
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    cleanup();

    const { container: binderContainer } = render(
      <ClassBinderView view="saved" onOpenLogModal={vi.fn()} />,
    );
    expect(binderContainer.querySelector('.pf-block-pill--memo')).toHaveTextContent(
      '박스 암 서클 메모',
    );
  });

  it('enforces >= 44px touch targets and 320px/390px/768px overflow protection rules in design-tokens.css', () => {
    const tokenCss = readFileSync(resolve(process.cwd(), 'src/styles/design-tokens.css'), 'utf8');
    expect(tokenCss).toContain('@media (max-width: 768px)');
    expect(tokenCss).toContain('@media (max-width: 560px)');
    expect(tokenCss).toContain('@media (max-width: 390px)');
    expect(tokenCss).toContain('min-height: var(--pf-touch-min, 44px)');
    expect(tokenCss).toContain('.motion-library .movement-card-grid');
    expect(tokenCss).toContain('.pf-core-quick-bar');
  });
});
