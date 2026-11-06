# Class Plan Review Module (`src/features/classPlanReview`)

강사가 작성한 필라테스 수업안(시퀀스·블록·동작·창작 초안)의 **총시간**, **좌/우/양측/미지정 편성**, **빠진 시간 정보**, **입력 진단**을 쉬운 한국어로 검토하는 로컬 전용 모듈입니다.

> **주의 (비처방·비보장 원칙)**
> 이 모듈은 강사가 입력한 수업 편성과 시간 수치를 사실대로 요약·검토할 뿐이며, **운동 처방이나 의학적·신체적 효과 및 안전을 보장하지 않습니다.**

---

## 1. 소유 파일 구조 (Owned Files)

| 파일 | 트랙 | 역할 |
| --- | --- | --- |
| `classPlanReviewTypes.ts` | 공통 계약 | 입력 어댑터·분석 결과·이슈 코드·프리뷰 Props 타입 및 유한 상한 상수 정의 |
| `classPlanReviewAdapter.ts` | Track A | 수업/블록/시퀀스 스텝/이름만 있는 창작 초안을 읽기 전용으로 정규화하고 순환·깊은 중첩·수치 손상을 방어 |
| `classPlanReviewAnalyzer.ts` | Track A | 총시간(동작·휴식·전환·설명)·목표시간 차이·미정 시간 분리·좌우 편성 사실 집계·안정적 `itemId` 기반 이슈 생성 |
| `classPlanReviewFixtures.ts` | Track B | 30분/50분 정상 수업, 휴식·반복·좌우·미정 시간, 이름만 있는 새 동작, 빈 수업, 과대/손상 입력 합성 fixture |
| `ClassPlanReviewPreview.tsx` | Track B | 독립 실행 가능한 반응형(320px/390px) 프리뷰 컴포넌트 (키보드 탐색, 읽기 순서, 쉬운 한국어 문구) |
| `classPlanReview.css` | Track B | 프리뷰 전용 스타일 (가로 넘침 방지, 모바일/좁은 화면 대응, 포커스 링) |
| `classPlanReviewAnalyzer.test.ts` | Track B | 분석기·어댑터 단위 테스트 (기존 유틸 parity, 원본 불변성, 결정론, 경계/손상 입력 검증) |
| `ClassPlanReviewPreview.test.tsx` | Track B | 프리뷰 렌더링·접근성·키보드·복합 시나리오 컴포넌트 테스트 |
| `index.ts` | 통합 | 모듈 공개 배럴(Barrel) 엔트리 |

---

## 2. 기존 순수 유틸 읽기 전용 재사용 (Read-Only Reuse)

중복 계산을 피하고 기존 시퀀스 시간·좌우 규칙과 100% 일관성을 유지하기 위해 다음 기존 모듈을 **읽기 전용**으로 재사용합니다:

- `src/utils/sequenceEngine.ts`
  - `getStepTiming(step, movement)`: 스텝의 `durationMin`(분)에 이미 반영된 반복·세트·순차 좌우·설명(`explanationSec`)·전환(`transitionSec`) 시간을 기존 계약 그대로 분해(`movementSec`, `explanationSec`, `transitionSec`, `totalSec`)하여 **반복/양측 중복 합산을 방지**합니다.
  - `getSequenceDurations(steps, exercises, targetMinutes)`: 전체 시퀀스 시간 합계 및 목표 대비 차이 계약 parity 검증에 사용합니다.
  - `getStepSideLabels(sideMode, orderedSides)`: 좌/우/양측 모드를 기존 순서 규칙과 동일하게 해석합니다.
  - `isRestStep(step, movement)`: 휴식 및 리커버리 스텝 여부를 판별합니다.
  - `getMovementKey(step, movement)`: 동작 식별 키를 일관되게 생성합니다.
  - `formatSecondsToMMSS(seconds)`: 초 단위 시간을 `MM:SS` 형식으로 변환합니다.
- `src/utils/stepTimeEstimate.ts`
  - `calculateStepTimeEstimate(estimate)`: `StepTimeEstimate`가 주어진 경우(`perRepSec`, `reps`, `sets`, `restBetweenSetsSec`, `sideMultiplier`, `transitionSec`) 기존 추정 공식 그대로 초 단위 시간을 산출합니다.
- `src/utils/sequenceValidation.ts`
  - `resolveMovementForValidation(step, customMovementsById)`: 커스텀 동작 및 카탈로그 동작을 안전하게 조회합니다.
  - `resolveStepSectionRole(step, customMovementsById)`: 스텝의 섹션 역할(`warmup`, `main`, `cooldown`, `rest`)을 판별합니다.
  - `calculateSequenceTimeBreakdown(steps, exercises)` 및 `calculateApparatusTransitionDetail(steps, exercises)`: 세부 시간 및 기구 전환 시간 검증에 사용합니다.
- `src/utils/classInsights.ts`
  - `buildPlanInsights(steps, exercises, targetMinutes)`: 기존 좌우/시간 인사이트 집계와의 계약 parity 검증에 사용합니다.
- `src/utils/hierarchyModel.ts`
  - `getMovementSectionRole(movement)` 및 `summarizeReusableBlockTiming(block)`: 동작 기본 섹션 역할 및 재사용 블록 시간 요약 조회에 사용합니다.

---

## 3. 핵심 동작 원칙 (Core Guarantees)

1. **빠진 시간(미정 시간)을 `0초`로 속이지 않음**
   - 시간이 입력되지 않은 항목(`durationMin` 누락 및 유효한 시간 추정치 없음)은 `durationStatus: 'unspecified'`, `knownTotalSec: null`로 표시합니다.
   - 요약에서는 **알려진 시간 합계(`knownTotalSec`)**와 **시간 미정 항목 수(`unspecifiedTimeItemCount`)**를 분리해 보여주며, 미정 항목이 있을 때 목표시간과 단순 비교해 정시/초과/부족으로 단정하지 않습니다.
2. **반복·세트·양측 적용의 중복 합산 방지**
   - `SequenceStep.durationMin`은 이미 스텝 전체 할당 시간을 뜻하므로 `reps`, `sets`, `sideMode`를 다시 곱하지 않습니다.
   - `StepTimeEstimate`로 계산하는 경우에만 `calculateStepTimeEstimate`의 기존 `sideMultiplier` 및 세트 휴식 공식을 그대로 따릅니다.
3. **좌/우/양측/미지정 사실 표기 및 비처방 문구**
   - 명시된 `sideMode` / `orderedSides`만 집계하며, 동작 이름에서 임의로 좌/우를 추측하지 않습니다.
   - 좌우 항목 수나 알려진 시간 차이가 있더라도 이를 사실대로만 안내하고, 좌우 숫자가 같다고 해서 신체에 안전하거나 균형 잡힌 처방이라고 단정하지 않습니다.
4. **이름만 적은 창작 초안(Draft) 지원**
   - `nameKo`, `workingNameKo`, `ideaLine`, `title`만 있는 초안도 검토할 수 있으며, 블록 분류·기구·해부학(척추면/타깃 근육)·주의사항·건강정보 입력을 강제하지 않습니다.
5. **원본 불변성(Immutability) 및 결정론적(Deterministic) 결과**
   - 입력 객체/배열을 절대 변경하거나 자동 수정하지 않습니다.
   - 동일한 입력에 대해 항상 동일한 `itemId`, 시간 합계, 이슈 목록을 반환합니다.
6. **유한 상한 및 손상 입력 방어**
   - 음수, `NaN`, `Infinity`, 잘못된 반복/세트 수, 순환 참조(`WeakSet` 감지), 깊은 중첩(최대 깊이 `16`), 과대 항목 수(최대 `1,000`개)에 대해 유한 상한을 적용하고 구조화된 진단 이슈를 생성합니다.

---

## 4. 통합 후보 사용 예시 (Integration Candidate Usage)

기존 제품 라우트(`src/App.tsx`, `src/components/**` 등)를 건드리지 않고 독립 모듈로 제공되며, 추후 필요한 화면에서 바로 연결할 수 있습니다.

```tsx
import {
  reviewClassPlan,
  ClassPlanReviewPreview,
  ClassPlanReviewFixtureHarness,
} from './features/classPlanReview';

// 1) 순수 분석기 직접 호출 (원본 불변 보장)
const report = reviewClassPlan({
  title: '50분 리포머 수업안',
  targetMinutes: 50,
  steps: mySequenceSteps,
});

// 2) 단일 수업안 프리뷰 렌더링
export function CandidateReviewPanel() {
  return <ClassPlanReviewPreview report={report} />;
}

// 3) 합성 fixture 시나리오 전환 하네스 렌더링
export function CandidateReviewFixtureDemo() {
  return <ClassPlanReviewFixtureHarness initialPresetId="mixed-rest-side-unspec" />;
}
```

---

## 5. 검증 요약 (API 계산 vs 실제 브라우저 확인 구분)

- **API / 순수 계산 및 JSDOM 테스트 (`vitest`)**
  - `classPlanReviewAnalyzer.test.ts` (15개 테스트): 30분/50분 정상 수업, 휴식·반복·좌우·미정 시간 혼합, 이름만 있는 창작 초안, 빈 수업, 과대(1,200개 항목)/순환/깊은 중첩/음수/`NaN`/`Infinity` 손상 입력, 원본 불변성, 결정론적 결과, 기존 유틸(`getStepTiming`, `getSequenceDurations`, `buildPlanInsights`) 계약 parity 검증.
  - `ClassPlanReviewPreview.test.tsx` (7개 테스트): 프리뷰 컴포넌트 렌더링, 비처방/비보장 안내 문구, 탭 키보드 탐색(`ArrowRight`/`ArrowLeft`/`Home`/`End`), 이슈 항목 바로가기(`jump-to-item-*`) 포커스 이동 검증.
- **실제 브라우저 렌더링 확인 (`/usr/bin/chromium` Headless + Vite)**
  - `320px` 및 `390px` 뷰포트에서 6개 프리셋 전체(`normal-30min`, `normal-50min`, `mixed-rest-side-unspec`, `name-only-draft`, `empty-class`, `corrupted-input`) 실제 레이아웃 측정:
    - 가로 넘침 없음 (`docScrollWidth === docClientWidth`, `previewScrollWidth === previewClientWidth`, 모든 섹션 `scrollWidth <= clientWidth`)
    - 시각적 읽기 순서 단조 증가 (`review-boundary-banner` → `review-timing-section` → `review-laterality-section` → `review-issues-section` → `review-items-section`)
    - 실제 Chromium 키보드 이벤트(`ArrowRight`) 및 항목 이동 버튼 포커스 전환 확인
