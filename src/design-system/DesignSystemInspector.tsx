import React, { useId, useState } from 'react';
import { BookOpen, Clock3, FolderHeart, Layers, Play, Plus, Trash2 } from 'lucide-react';
import { LightDismissDialog } from '../components/LightDismissDialog';
import { SpringBadge } from '../components/SpringBadge';
import { PfBadge } from './PfBadge';
import { PfButton } from './PfButton';
import { PfCard } from './PfCard';
import {
  PfAiStatusBadge,
  PfBlockPill,
  PfMovementCard,
  PfSequenceBlock,
} from './PfDomainPrimitives';
import { PfEmptyState, PfErrorState, PfLoadingState, PfStatusBanner } from './PfFeedback';
import {
  PfField,
  PfFormError,
  PfInput,
  PfSearchField,
  PfSelect,
  PfTextarea,
} from './PfField';
import { PfTabs } from './PfTabs';
import { PfTooltip } from './PfTooltip';
import {
  PF_COLOR_TOKENS,
  PF_RADIUS_SHADOW_TOKENS,
  PF_SPACING_TOKENS,
  PF_TYPOGRAPHY_TOKENS,
} from './tokens';

export interface DesignSystemInspectorProps {
  open: boolean;
  onClose: () => void;
}

type InspectorSection = 'tokens' | 'components' | 'states' | 'responsive';
type SimulatedViewport = '320' | '390' | '768' | '1280';

const SECTION_ITEMS = [
  { id: 'tokens', label: '1. 의미 기반 토큰' },
  { id: 'components', label: '2. 공통 컴포넌트' },
  { id: 'states', label: '3. 상태·오류·접근성' },
  { id: 'responsive', label: '4. 반응형 시뮬레이션' },
] as const;

const VIEWPORT_ITEMS = [
  { id: '320', label: '320px (소형 모바일)' },
  { id: '390', label: '390px (모바일)' },
  { id: '768', label: '768px (태블릿)' },
  { id: '1280', label: '1280px (데스크톱)' },
] as const;

const FILTER_DEMO_ITEMS = [
  { id: 'all', label: '전체 기록' },
  { id: 'evening-a', label: '저녁 A반 (예시)' },
  { id: 'morning-b', label: '오전 기구 반 (예시)' },
] as const;

export const DesignSystemInspector: React.FC<DesignSystemInspectorProps> = ({ open, onClose }) => {
  const isDevOrTest = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'test');
  const [section, setSection] = useState<InspectorSection>('tokens');
  const [highContrast, setHighContrast] = useState(false);
  const [viewport, setViewport] = useState<SimulatedViewport>('390');
  const [filterDemo, setFilterDemo] = useState<'all' | 'evening-a' | 'morning-b'>('all');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoPressed, setDemoPressed] = useState(false);
  const [demoInput, setDemoInput] = useState('저녁 A반');
  const [demoErrorInput, setDemoErrorInput] = useState('');
  const [demoSearch, setDemoSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackDemo, setFeedbackDemo] = useState<'empty' | 'loading' | 'error'>('empty');
  const errorFieldId = useId();
  const errorMsgId = useId();

  if (!isDevOrTest || !open) return null;

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="Flow Atelier 내부 디자인 시스템 검수"
      subtitle="개발 환경 전용 (외부 비공개) · 의미 기반 토큰, 공통 컴포넌트 상태, 접근성 및 반응형 사례 검수"
      maxWidth="1080px"
    >
      <div
        className={`pf-ds-inspector ${highContrast ? 'teaching-high-contrast' : ''}`}
        data-pf-theme={highContrast ? 'high-contrast' : 'light'}
        data-testid="pf-design-system-inspector"
      >
        <div className="pf-ds-toolbar">
          <PfTabs
            ariaLabel="디자인 시스템 검수 섹션"
            items={SECTION_ITEMS}
            value={section}
            onChange={setSection}
            semantics="tablist"
            variant="segmented"
          />
          <PfButton
            variant="secondary"
            size="sm"
            pressed={highContrast}
            onClick={() => setHighContrast((prev) => !prev)}
          >
            <Layers size={15} />
            {highContrast ? '고대비 테마 켜짐' : '고대비 테마 미리보기'}
          </PfButton>
        </div>

        <PfStatusBanner tone="info">
          이 검수 화면은 개발·테스트 환경에서만 열리며 실제 회원 정보 없이 합성 예제 데이터(반 별칭)만 사용합니다.
        </PfStatusBanner>

        {section === 'tokens' && (
          <div className="pf-ds-section" role="region" aria-label="의미 기반 토큰 카탈로그">
            <h3>색상 및 상태 토큰 ({PF_COLOR_TOKENS.length}종 · WCAG 대비 검증)</h3>
            <div className="pf-ds-swatch-grid">
              {PF_COLOR_TOKENS.map((token) => (
                <div className="pf-ds-swatch" key={token.id}>
                  <div
                    className="pf-ds-swatch__preview"
                    style={{
                      background: `var(${token.cssVar}, ${token.value})`,
                      color:
                        token.id === 'action-primary' || token.id === 'text-primary'
                          ? '#fffef9'
                          : '#1e3129',
                    }}
                  >
                    <span>{token.value}</span>
                    {token.contrastNote && <span>{token.contrastNote}</span>}
                  </div>
                  <div className="pf-ds-swatch__meta">
                    <strong>{token.labelKo}</strong>
                    <code>{token.cssVar}</code>
                    <span className="muted">{token.usageKo}</span>
                  </div>
                </div>
              ))}
            </div>

            <h3>타이포그래피 스케일 ({PF_TYPOGRAPHY_TOKENS.length}종)</h3>
            <PfCard variant="subtle">
              <div style={{ display: 'grid', gap: '12px' }}>
                {PF_TYPOGRAPHY_TOKENS.map((typo) => (
                  <div
                    key={typo.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '12px',
                      borderBottom: '1px solid var(--pf-color-border-subtle)',
                      paddingBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: `var(${typo.cssVar})`, fontWeight: 600 }}>
                      {typo.labelKo} — 수업을 준비하는 조용한 작업실
                    </span>
                    <code style={{ fontSize: 'var(--pf-text-2xs)' }}>
                      {typo.cssVar} ({typo.sizeValue})
                    </code>
                  </div>
                ))}
              </div>
            </PfCard>

            <h3>간격·터치 타깃 ({PF_SPACING_TOKENS.length}종) 및 모서리·그림자 ({PF_RADIUS_SHADOW_TOKENS.length}종)</h3>
            <div className="pf-ds-matrix">
              <PfCard variant="subtle">
                <strong>간격 및 최소 터치 타깃 (44px)</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '8px', fontSize: 'var(--pf-text-xs)' }}>
                  {PF_SPACING_TOKENS.map((sp) => (
                    <li key={sp.id}>
                      <code>{sp.cssVar}</code>: {sp.pxValue} ({sp.usageKo})
                    </li>
                  ))}
                </ul>
              </PfCard>
              <PfCard variant="subtle">
                <strong>모서리 반경 및 그림자</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '8px', fontSize: 'var(--pf-text-xs)' }}>
                  {PF_RADIUS_SHADOW_TOKENS.map((rs) => (
                    <li key={rs.id}>
                      <code>{rs.cssVar}</code>: {rs.value} ({rs.usageKo})
                    </li>
                  ))}
                </ul>
              </PfCard>
            </div>
          </div>
        )}

        {section === 'components' && (
          <div className="pf-ds-section" role="region" aria-label="공통 컴포넌트 쇼케이스">
            <h3>버튼 (PfButton) — 변형·크기·상태</h3>
            <PfCard>
              <div className="button-row" style={{ gap: '10px', marginBottom: '14px' }}>
                <PfButton variant="primary">
                  <Plus size={16} /> 주 액션 (Primary)
                </PfButton>
                <PfButton variant="secondary">보조 액션 (Secondary)</PfButton>
                <PfButton variant="ghost">고스트 (Ghost)</PfButton>
                <PfButton variant="danger">
                  <Trash2 size={15} /> 위험/삭제 (Danger)
                </PfButton>
                <PfButton variant="text">텍스트 링크형</PfButton>
                <PfButton variant="icon" aria-label="아이콘 전용 버튼 예시">
                  <BookOpen size={17} />
                </PfButton>
              </div>
              <div className="button-row" style={{ gap: '10px' }}>
                <PfButton variant="secondary" size="sm">
                  소형 (sm · 44px 보장)
                </PfButton>
                <PfButton variant="secondary" size="md">
                  중형 (md · 기본)
                </PfButton>
                <PfButton variant="primary" size="lg">
                  대형 (lg · 48px)
                </PfButton>
                <PfButton variant="primary" disabled>
                  비활성 (Disabled)
                </PfButton>
                <PfButton
                  variant="primary"
                  loading={demoLoading}
                  loadingLabel="저장 중…"
                  onClick={() => setDemoLoading((v) => !v)}
                >
                  로딩 상태 토글
                </PfButton>
                <PfButton
                  variant="secondary"
                  pressed={demoPressed}
                  onClick={() => setDemoPressed((v) => !v)}
                >
                  토글 버튼 ({demoPressed ? '켜짐' : '꺼짐'})
                </PfButton>
              </div>
            </PfCard>

            <h3>배지 (PfBadge & SpringBadge) 및 카드 (PfCard)</h3>
            <div className="pf-ds-matrix">
              <PfCard>
                <strong>의미 기반 배지 톤 & 스프링 배지</strong>
                <div className="button-row" style={{ gap: '8px', marginTop: '12px' }}>
                  <PfBadge tone="brand">브랜드</PfBadge>
                  <PfBadge tone="sage">Lv 1.5</PfBadge>
                  <PfBadge tone="neutral">기본 중립</PfBadge>
                  <PfBadge tone="success">검토됨</PfBadge>
                  <PfBadge tone="warning">조건 확인</PfBadge>
                  <PfBadge tone="danger">시간 초과</PfBadge>
                  <PfBadge tone="sample" shape="rect">
                    예시 기록 · 실제 수업 아님
                  </PfBadge>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <SpringBadge springs="1R 1B" brand="balanced-body" />
                  <PfTooltip content="Radix Tooltip 프리미티브 (키보드 포커스·호버 시 role=tooltip 노출)">
                    <PfButton variant="ghost" size="sm">
                      접근성 툴팁 확인 (Radix UI)
                    </PfButton>
                  </PfTooltip>
                </div>
              </PfCard>
              <PfCard variant="sample">
                <PfBadge tone="sample" shape="rect">
                  샘플 카드 변형
                </PfBadge>
                <p className="muted" style={{ marginTop: '8px' }}>
                  실제 기록과 예시 데이터를 시각적·의미적으로 명확히 구분합니다.
                </p>
              </PfCard>
            </div>

            <h3>동작 카드 (PfMovementCard) · 시퀀스 블록 (PfSequenceBlock) · AI/검증 상태 표시 (PfAiStatusBadge)</h3>
            <div className="pf-ds-matrix">
              <PfCard>
                <strong>AI 초안·창작 메모·검토 상태 배지 (PfAiStatusBadge)</strong>
                <p className="muted" style={{ marginTop: '4px', marginBottom: '10px' }}>
                  조건 맞춤 초안과 강사의 주관적 창작 메모를 전문가 검증·운동 효과 보장과 명확히 구분합니다.
                </p>
                <div className="button-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <PfAiStatusBadge kind="ai-draft" />
                  <PfAiStatusBadge kind="creative-memo" />
                  <PfAiStatusBadge kind="tried-memo" />
                  <PfAiStatusBadge kind="instructor-reviewed" />
                  <PfAiStatusBadge kind="review-pending" />
                  <PfAiStatusBadge kind="sample-data" />
                </div>
              </PfCard>

              <PfSequenceBlock phase="main" eyebrow="MAIN FLOW" title="본운동 블록" meta="2개 동작 · 12분">
                <PfMovementCard variant="idea" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>벽 짚고 한 발 골반 회전 (예시)</strong>
                    <PfAiStatusBadge kind="tried-memo" />
                  </div>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--pf-text-xs)' }}>
                    직접 해본 느낌: 중둔근 자극이 또렷함 · 수정할 점: 벽 간격 반 발짝
                  </p>
                </PfMovementCard>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  <PfBlockPill kind="movement">헌드레드 프렙</PfBlockPill>
                  <PfBlockPill kind="memo">벽 짚고 한 발 골반 회전</PfBlockPill>
                  <PfBlockPill kind="rest">휴식 01:00</PfBlockPill>
                </div>
              </PfSequenceBlock>
            </div>

            <h3>탭 & 필터 그룹 (PfTabs — 좌/우/Home/End 키보드 이동)</h3>
            <PfCard>
              <p className="muted" style={{ marginBottom: '8px' }}>
                포커스 후 키보드 좌우 화살표(←/→) 또는 Home/End 키로 탭을 이동할 수 있습니다.
              </p>
              <PfTabs
                ariaLabel="예시 수업 그룹 필터"
                items={FILTER_DEMO_ITEMS}
                value={filterDemo}
                onChange={setFilterDemo}
                semantics="group"
                variant="pills"
              />
            </PfCard>
          </div>
        )}

        {section === 'states' && (
          <div className="pf-ds-section" role="region" aria-label="입력·폼 오류·상태 검수">
            <h3>입력·선택·검색 및 폼 오류 (PfField, PfInput, PfSelect, PfFormError)</h3>
            <PfCard>
              <div className="teaching-form-grid">
                <PfField label="그룹 별칭 (정상)" required hint="실명 대신 수업 별칭을 사용하세요.">
                  <PfInput
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    placeholder="예: 저녁 A반"
                  />
                </PfField>
                <PfField
                  label="필수 입력 오류 사례"
                  htmlFor={errorFieldId}
                  required
                  error="수업 그룹 별칭을 입력해 주세요."
                  errorId={errorMsgId}
                >
                  <PfInput
                    id={errorFieldId}
                    hasError
                    aria-describedby={errorMsgId}
                    value={demoErrorInput}
                    onChange={(e) => setDemoErrorInput(e.target.value)}
                    placeholder="빈 값 제출 시 오류 표시"
                  />
                </PfField>
                <PfField label="기본 난이도 (비활성 사례)">
                  <PfSelect disabled defaultValue="1.5" aria-label="비활성 난이도 선택">
                    <option value="1.0">Lv 1.0</option>
                    <option value="1.5">Lv 1.5</option>
                  </PfSelect>
                </PfField>
              </div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                <PfSearchField
                  label="검수용 시퀀스 검색"
                  placeholder="시퀀스 이름으로 찾기"
                  value={demoSearch}
                  onChange={(e) => setDemoSearch(e.target.value)}
                />
                <PfField label="회고 메모 (Textarea)">
                  <PfTextarea
                    rows={2}
                    defaultValue="예시 메모: 흉곽 호흡 큐를 먼저 안내하니 전환이 매끄러웠음."
                  />
                </PfField>
                <PfFormError>
                  폼 전체 오류 배너 예시: 실제로 진행한 동작을 하나 이상 선택해 주세요.
                </PfFormError>
              </div>
            </PfCard>

            <h3>로딩·빈 상태·오류 상태 및 모달/시트 검수</h3>
            <div className="button-row" style={{ gap: '8px' }}>
              <PfButton
                variant="secondary"
                pressed={feedbackDemo === 'empty'}
                onClick={() => setFeedbackDemo('empty')}
              >
                빈 상태 (Empty)
              </PfButton>
              <PfButton
                variant="secondary"
                pressed={feedbackDemo === 'loading'}
                onClick={() => setFeedbackDemo('loading')}
              >
                로딩 상태 (Loading)
              </PfButton>
              <PfButton
                variant="secondary"
                pressed={feedbackDemo === 'error'}
                onClick={() => setFeedbackDemo('error')}
              >
                오류 상태 (Error)
              </PfButton>
              <PfButton variant="primary" onClick={() => setSheetOpen(true)}>
                모바일 시트/모달 열기
              </PfButton>
            </div>

            {feedbackDemo === 'empty' && (
              <PfEmptyState
                icon={<FolderHeart size={26} />}
                title="검색한 시퀀스가 없어요"
                description="다른 이름으로 검색하거나 새 시퀀스를 계획해 보세요."
                action={<PfButton variant="secondary">검색 지우기</PfButton>}
              />
            )}
            {feedbackDemo === 'loading' && (
              <PfLoadingState
                title="작업 공간을 열고 있어요…"
                description="시퀀스와 동작 노트를 준비하고 있습니다."
              />
            )}
            {feedbackDemo === 'error' && (
              <PfErrorState
                title="수업 기록을 불러오지 못했습니다"
                description="삭제된 동작이 포함되어 있는지 확인한 뒤 다시 시도해 주세요."
                action={<PfButton variant="secondary">다시 시도</PfButton>}
              />
            )}

            <LightDismissDialog
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              variant="sheet"
              title="모바일 바텀 시트 / 모달 검수"
              subtitle="Escape, 배경 클릭, 닫기 버튼 및 Tab 포커스 순환을 지원합니다."
              maxWidth="520px"
            >
              <p className="muted">
                좁은 화면(680px 이하)에서는 하단 시트 형태로, 데스크톱에서는 중앙 모달로 표시됩니다.
              </p>
              <div className="teaching-form-actions">
                <PfButton variant="primary" onClick={() => setSheetOpen(false)}>
                  확인 후 닫기
                </PfButton>
              </div>
            </LightDismissDialog>
          </div>
        )}

        {section === 'responsive' && (
          <div className="pf-ds-section" role="region" aria-label="반응형 뷰포트 시뮬레이션">
            <div className="pf-ds-toolbar">
              <strong>뷰포트 너비 선택</strong>
              <PfTabs
                ariaLabel="시뮬레이션 뷰포트 크기"
                items={VIEWPORT_ITEMS}
                value={viewport}
                onChange={setViewport}
                semantics="group"
                variant="pills"
              />
            </div>
            <div
              className="pf-ds-viewport-frame"
              style={{ maxWidth: `${viewport}px` }}
              data-viewport={viewport}
            >
              <PfCard as="article" variant="interactive" className="teaching-sequence-card">
                <div className="teaching-card-top">
                  <span className="teaching-card-label">01 · 리포머 · 예시</span>
                  <PfBadge tone="sage" shape="rect" className="teaching-level">
                    Lv 1.5
                  </PfBadge>
                </div>
                <h2>저녁 A반 척추 분절 & 코어 플로우 (예시)</h2>
                <p className="muted teaching-sequence-subtitle">
                  골반 중립 인지와 흉추 가동성을 연결하는 50분 구성
                </p>
                <div className="teaching-card-stats">
                  <span>
                    <Clock3 size={15} /> 50분
                  </span>
                  <span>8개 동작</span>
                  <span>휴식 2개</span>
                  <PfAiStatusBadge kind="ai-draft" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  <PfBlockPill kind="movement">펠빅 컬</PfBlockPill>
                  <PfBlockPill kind="memo">창작 동작 메모</PfBlockPill>
                  <PfBlockPill kind="rest">휴식 01:00</PfBlockPill>
                </div>
                <div className="teaching-card-main-actions">
                  <PfButton variant="primary">
                    <BookOpen size={16} /> 불러오기
                  </PfButton>
                  <PfButton variant="secondary">
                    <Play size={16} /> 수업 시작
                  </PfButton>
                </div>
              </PfCard>
            </div>
          </div>
        )}
      </div>
    </LightDismissDialog>
  );
};
