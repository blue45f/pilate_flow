/**
 * Synthetic fixtures for Class Flow Audit (2026-11-07).
 * Strictly isolated from user data; used only in ephemeral test contexts.
 */

export const AUDIT_DATE_ISO = '2026-11-07T09:00:00.000Z';

export const SYNTHETIC_MOVEMENT_IDEAS = [
  {
    key: 'idea-warmup-breathing',
    ideaLine: '리포머 풋바 잡고 척추 분절 호흡 준비',
    workingTitle: '풋바 분절 호흡 워밍업',
    subjectiveFeeling: '초보 회원도 갈비뼈 닫기 감각을 빠르게 인지함',
    adjustmentNote: '어깨 으쓱임 방지를 위해 헤드레스트 낮춤',
    triedByInstructor: true,
    apparatus: 'reformer',
    level: '1.0',
    durationMin: 3,
    repetitions: 8,
    sets: 2,
    sideMode: 'together',
    explanationSec: 25,
    transitionSec: 15,
    sectionRole: 'preparation',
    easyVariation: '무릎 살짝 굽혀 골반 중립 유지',
    hardVariation: '호흡 끝에 복부 수축 3초 유지',
    variantLabelKo: '초보 호흡 유도형',
  },
  {
    key: 'idea-unilateral-strap',
    ideaLine: '리포머 싱글 레그 스트랩 원형 서클',
    workingTitle: '싱글 레그 스트랩 서클',
    subjectiveFeeling: '골반 비대칭 회원에게 좌우 차이 확인하기 좋음',
    adjustmentNote: '반대쪽 다리는 테이블탑 또는 풋바 지지 선택',
    triedByInstructor: true,
    apparatus: 'reformer',
    level: '1.0',
    durationMin: 4,
    repetitions: 6,
    sets: 2,
    sideMode: 'left-then-right',
    explanationSec: 20,
    transitionSec: 20,
    sectionRole: 'main',
    easyVariation: '가동 범위를 작게 하여 골반 흔들림 최소화',
    hardVariation: '서클 후 정지 2초 추가',
    variantLabelKo: '편측 골반 안정화',
  },
  {
    key: 'idea-boundary-short',
    ideaLine: '매트 브릿지 홀드 30초 경계 테스트',
    workingTitle: '초단시간 브릿지 홀드',
    subjectiveFeeling: '짧은 전환 브릿지',
    adjustmentNote: '둔근 수축 유지',
    triedByInstructor: true,
    apparatus: 'mat',
    level: '1.0',
    durationMin: 0.5,
    repetitions: 5,
    sets: 1,
    sideMode: 'together',
    explanationSec: 20,
    transitionSec: 15,
    sectionRole: 'main',
  },
];

export const SYNTHETIC_BOUNDARY_CASES = {
  repetitions: [
    { label: 'min-valid-1', value: 1, expectedValid: true },
    { label: 'zero-falsy', value: 0, expectedValid: false },
    { label: 'negative', value: -3, expectedValid: false },
    { label: 'decimal-float', value: 7.6, expectedValid: false },
    { label: 'idea-sheet-max-100', value: 100, expectedValid: true },
    { label: 'hierarchy-max-500', value: 500, expectedValid: true },
    { label: 'between-hierarchy-and-step-600', value: 600, expectedValid: 'divergent-500-vs-1000' },
    { label: 'step-schema-max-1000', value: 1000, expectedValid: 'divergent-500-vs-1000' },
    { label: 'above-step-schema-1500', value: 1500, expectedValid: false },
  ],
  sets: [
    { label: 'min-valid-1', value: 1, expectedValid: true },
    { label: 'zero-falsy', value: 0, expectedValid: false },
    { label: 'idea-sheet-max-20', value: 20, expectedValid: true },
    { label: 'hierarchy-max-50', value: 50, expectedValid: true },
    { label: 'between-hierarchy-and-step-60', value: 60, expectedValid: 'divergent-50-vs-100' },
    { label: 'step-schema-max-100', value: 100, expectedValid: 'divergent-50-vs-100' },
    { label: 'above-step-schema-150', value: 150, expectedValid: false },
  ],
  sideModes: ['together', 'left', 'right', 'left-then-right', 'right-then-left'],
  durationsMin: [0, 0.25, 0.5, 1, 2.816666666666667, 4, 20, 25, 120, 121],
};

export const VIEWPORT_MATRIX = [
  { id: '320-100', width: 320, height: 568, scale: 1, mobile: true, label: '320px @ 100%' },
  { id: '390-100', width: 390, height: 844, scale: 1, mobile: true, label: '390px @ 100%' },
  { id: '768-100', width: 768, height: 1024, scale: 1, mobile: true, label: '768px @ 100%' },
  { id: '1440-100', width: 1440, height: 900, scale: 1, mobile: false, label: '1440px @ 100%' },
  { id: '320-200', width: 320, height: 568, scale: 2, mobile: true, label: '320px @ 200%' },
  { id: '390-200', width: 390, height: 844, scale: 2, mobile: true, label: '390px @ 200%' },
  { id: '768-200', width: 768, height: 1024, scale: 2, mobile: false, label: '768px @ 200%' },
  { id: '1440-200', width: 1440, height: 900, scale: 2, mobile: false, label: '1440px @ 200%' },
];
