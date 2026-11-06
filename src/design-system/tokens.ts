export interface ColorTokenSpec {
  id: string;
  cssVar: `--pf-color-${string}`;
  category: 'surface' | 'text' | 'action' | 'border' | 'status';
  labelKo: string;
  value: string;
  usageKo: string;
  contrastNote?: string;
}

export interface TypographyTokenSpec {
  id: string;
  cssVar: `--pf-text-${string}`;
  labelKo: string;
  sizeValue: string;
  lineHeightVar: string;
  usageKo: string;
}

export interface SpacingTokenSpec {
  id: string;
  cssVar: `--pf-${string}`;
  pxValue: string;
  remValue: string;
  usageKo: string;
}

export interface RadiusShadowTokenSpec {
  id: string;
  cssVar: `--pf-${string}`;
  kind: 'radius' | 'shadow';
  value: string;
  usageKo: string;
}

export const PF_COLOR_TOKENS: readonly ColorTokenSpec[] = [
  {
    id: 'bg-canvas',
    cssVar: '--pf-color-bg-canvas',
    category: 'surface',
    labelKo: '캔버스 배경 (Warm Ivory)',
    value: '#F7F5EF',
    usageKo: '앱 기본 작업실 배경',
  },
  {
    id: 'bg-surface',
    cssVar: '--pf-color-bg-surface',
    category: 'surface',
    labelKo: '기본 표면 (Atelier Paper)',
    value: '#FFFEF9',
    usageKo: '카드, 패널, 모달 기본 배경',
  },
  {
    id: 'bg-surface-subtle',
    cssVar: '--pf-color-bg-surface-subtle',
    category: 'surface',
    labelKo: '보조 표면 (Subtle Linen)',
    value: '#F3F5EE',
    usageKo: '중첩 영역, 인쇄 시트, 비활성 입력 배경',
  },
  {
    id: 'bg-surface-muted',
    cssVar: '--pf-color-bg-surface-muted',
    category: 'surface',
    labelKo: '세이지 강조 표면 (Soft Sage)',
    value: '#E4EADF',
    usageKo: '선택된 행, 요약 배너, 카운트 배지 배경',
  },
  {
    id: 'text-primary',
    cssVar: '--pf-color-text-primary',
    category: 'text',
    labelKo: '본문 기본 잉크 (Deep Ink)',
    value: '#1E3129',
    usageKo: '제목, 본문, 핵심 수치 텍스트',
    contrastNote: '12.6:1 (AAA)',
  },
  {
    id: 'text-secondary',
    cssVar: '--pf-color-text-secondary',
    category: 'text',
    labelKo: '본문 보조 텍스트 (Slate Moss)',
    value: '#3D4F45',
    usageKo: '부제목, 설명, 카드 메타데이터',
    contrastNote: '8.1:1 (AAA)',
  },
  {
    id: 'text-muted',
    cssVar: '--pf-color-text-muted',
    category: 'text',
    labelKo: '캡션·안내 텍스트 (Muted Sage)',
    value: '#526358',
    usageKo: '보조 안내, 타임스탬프, 입력 힌트',
    contrastNote: '5.9:1 (AA)',
  },
  {
    id: 'action-primary',
    cssVar: '--pf-color-action-primary',
    category: 'action',
    labelKo: '주 액션 (Deep Forest)',
    value: '#173D34',
    usageKo: '화면당 핵심 CTA 버튼 및 활성 탭',
    contrastNote: '11.4:1 (AAA)',
  },
  {
    id: 'focus-ring',
    cssVar: '--pf-color-focus-ring',
    category: 'border',
    labelKo: '포커스 링 (Restrained Clay)',
    value: '#B16F48',
    usageKo: '키보드 focus-visible 3px 외곽선',
    contrastNote: '3.8:1 (UI 비텍스트 AA)',
  },
  {
    id: 'border-default',
    cssVar: '--pf-color-border-default',
    category: 'border',
    labelKo: '기본 경계선 (Warm Line)',
    value: '#D5DDD0',
    usageKo: '카드, 입력창, 구분선 테두리',
  },
  {
    id: 'status-success',
    cssVar: '--pf-color-status-success-text',
    category: 'status',
    labelKo: '성공·완료 상태 (Forest Success)',
    value: '#254B29',
    usageKo: '저장·복제·그룹 추가 완료 피드백',
    contrastNote: '8.8:1 (AAA)',
  },
  {
    id: 'status-warning',
    cssVar: '--pf-color-status-warning-text',
    category: 'status',
    labelKo: '주의·검토 상태 (Amber Clay)',
    value: '#6B4010',
    usageKo: '일정 겹침, 미검토 자료 안내',
    contrastNote: '7.9:1 (AAA)',
  },
  {
    id: 'status-danger',
    cssVar: '--pf-color-status-danger-text',
    category: 'status',
    labelKo: '오류·삭제 경고 (Terracotta Danger)',
    value: '#8A341E',
    usageKo: '폼 유효성 오류, 시퀀스 삭제 확인',
    contrastNote: '7.1:1 (AAA)',
  },
  {
    id: 'block-surface',
    cssVar: '--pf-color-block-surface',
    category: 'surface',
    labelKo: '시퀀스 블록 표면 (Block Canvas)',
    value: '#F6F7F2',
    usageKo: '준비·본운동·마무리·휴식 블록 컨테이너 표면',
  },
  {
    id: 'ai-draft-bg',
    cssVar: '--pf-color-ai-draft-bg',
    category: 'status',
    labelKo: '조건 맞춤·자동 초안 배지 (Draft Sage)',
    value: '#EEF2EA',
    usageKo: '자동 생성 초안·조건 기반 추천 안내 배경',
    contrastNote: '9.4:1 (AAA)',
  },
  {
    id: 'ai-memo-bg',
    cssVar: '--pf-color-ai-memo-bg',
    category: 'status',
    labelKo: '내 창작 메모·미검증 구분 (Memo Sand)',
    value: '#F4F1E3',
    usageKo: '강사 주관적 느낌·창작 메모(전문가 검증 아님) 구분',
    contrastNote: '8.5:1 (AAA)',
  },
] as const;

export const PF_TYPOGRAPHY_TOKENS: readonly TypographyTokenSpec[] = [
  {
    id: 'display',
    cssVar: '--pf-text-display',
    labelKo: 'Display / 페이지 주 제목 (h1)',
    sizeValue: 'clamp(1.75rem, 2.8vw, 2.4rem)',
    lineHeightVar: '--pf-leading-tight (1.3)',
    usageKo: '워크스페이스 상단 h1 제목',
  },
  {
    id: 'xl',
    cssVar: '--pf-text-xl',
    labelKo: 'Heading XL / 모달·섹션 제목',
    sizeValue: '1.375rem (22px)',
    lineHeightVar: '--pf-leading-snug (1.45)',
    usageKo: '모달 타이틀, 주요 섹션 헤더',
  },
  {
    id: 'lg',
    cssVar: '--pf-text-lg',
    labelKo: 'Heading LG / 카드 제목 (h2/h3)',
    sizeValue: '1.1875rem (19px)',
    lineHeightVar: '--pf-leading-snug (1.45)',
    usageKo: '시퀀스 카드 제목, 빈 상태 제목',
  },
  {
    id: 'base',
    cssVar: '--pf-text-base',
    labelKo: 'Body Base / 모바일 안전 입력 (16px)',
    sizeValue: '1rem (16px)',
    lineHeightVar: '--pf-leading-normal (1.65)',
    usageKo: '모바일 입력 컨트롤(자동 확대 방지) 및 강조 본문',
  },
  {
    id: 'sm',
    cssVar: '--pf-text-sm',
    labelKo: 'Body SM / 표준 본문·설명 (13px)',
    sizeValue: '0.8125rem (13px)',
    lineHeightVar: '--pf-leading-relaxed (1.8)',
    usageKo: '회고 메모, 안내 문구, 데스크톱 입력',
  },
  {
    id: 'xs',
    cssVar: '--pf-text-xs',
    labelKo: 'Label XS / 버튼·필드 라벨 (12px)',
    sizeValue: '0.75rem (12px)',
    lineHeightVar: '--pf-leading-snug (1.45)',
    usageKo: '폼 필드 라벨, 버튼 텍스트, 메타데이터',
  },
  {
    id: '2xs',
    cssVar: '--pf-text-2xs',
    labelKo: 'Caption 2XS / 배지·아이브로우 (11px)',
    sizeValue: '0.6875rem (11px)',
    lineHeightVar: '--pf-leading-snug (1.45)',
    usageKo: '상단 eyebrow, 상태 배지, 각주',
  },
] as const;

export const PF_SPACING_TOKENS: readonly SpacingTokenSpec[] = [
  { id: 'space-1', cssVar: '--pf-space-1', pxValue: '4px', remValue: '0.25rem', usageKo: '아이콘-텍스트 미세 간격' },
  { id: 'space-2', cssVar: '--pf-space-2', pxValue: '8px', remValue: '0.5rem', usageKo: '기본 8px 그리드 단위, 칩/버튼 간격' },
  { id: 'space-3', cssVar: '--pf-space-3', pxValue: '12px', remValue: '0.75rem', usageKo: '내부 패딩, 폼 요소 간격' },
  { id: 'space-4', cssVar: '--pf-space-4', pxValue: '16px', remValue: '1rem', usageKo: '모바일 카드 패딩, 섹션 간격' },
  { id: 'space-5', cssVar: '--pf-space-5', pxValue: '20px', remValue: '1.25rem', usageKo: '그리드 카드 간격' },
  { id: 'space-6', cssVar: '--pf-space-6', pxValue: '24px', remValue: '1.5rem', usageKo: '데스크톱 패널·모달 패딩' },
  { id: 'space-8', cssVar: '--pf-space-8', pxValue: '32px', remValue: '2rem', usageKo: '페이지 헤더 하단 여백' },
  { id: 'touch-min', cssVar: '--pf-touch-min', pxValue: '44px', remValue: '2.75rem', usageKo: 'WCAG 최소 터치 타깃 높이/너비' },
] as const;

export const PF_RADIUS_SHADOW_TOKENS: readonly RadiusShadowTokenSpec[] = [
  { id: 'radius-xs', cssVar: '--pf-radius-xs', kind: 'radius', value: '6px', usageKo: '동작 태그, 사각 배지' },
  { id: 'radius-sm', cssVar: '--pf-radius-sm', kind: 'radius', value: '8px', usageKo: '입력창, 셀렉트, 아이콘 버튼' },
  { id: 'radius-md', cssVar: '--pf-radius-md', kind: 'radius', value: '12px', usageKo: '기본 버튼, 인라인 배너' },
  { id: 'radius-lg', cssVar: '--pf-radius-lg', kind: 'radius', value: '16px', usageKo: '시퀀스·기록 카드, 모달' },
  { id: 'radius-pill', cssVar: '--pf-radius-pill', kind: 'radius', value: '9999px', usageKo: '필터 탭 칩, 카운트 배지' },
  { id: 'shadow-xs', cssVar: '--pf-shadow-xs', kind: 'shadow', value: '0 1px 2px rgba(23, 61, 52, 0.05)', usageKo: '주 버튼 및 세그먼트 활성 탭' },
  { id: 'shadow-sm', cssVar: '--pf-shadow-sm', kind: 'shadow', value: '0 3px 12px rgba(23, 61, 52, 0.06)', usageKo: '기본 카드 및 패널 표면' },
  { id: 'shadow-md', cssVar: '--pf-shadow-md', kind: 'shadow', value: '0 8px 24px rgba(23, 61, 52, 0.09)', usageKo: '인터랙티브 카드 호버' },
  { id: 'shadow-lg', cssVar: '--pf-shadow-lg', kind: 'shadow', value: '0 18px 42px rgba(23, 61, 52, 0.16)', usageKo: '모달 및 바텀 시트 오버레이' },
] as const;
