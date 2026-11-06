# 수업안 검토 모듈

강사가 적은 계획의 시간과 좌우 편성 정보를 로컬에서 읽고 요약하는 독립 모듈입니다. 기존 앱 화면에는 아직 연결하지 않았습니다. 검토 기록은 선택 사항이며 수업 작성·저장·시작을 막는 기능이 아닙니다. 운동 효과, 실제 신체 균형, 의료적 안전을 판정하지 않습니다.

## 입력과 계산

- `reviewClassPlan(source)`는 시퀀스·블록·휴식·이름만 적은 동작 초안을 읽습니다. 분류나 건강정보를 강제로 요구하지 않습니다.
- `durationMin`은 이미 해당 항목 전체에 배정된 시간입니다. 반복·세트·양측 수를 다시 곱하지 않습니다.
- 유효한 `timeEstimate`는 기존 `calculateStepTimeEstimate`를 사용합니다. 현재 필드는 `secondsPerRep`, `repetitions`, `sets`, `sides`, `holdSecPerRep`, `breathsPerSet`, `secondsPerBreath`, `restBetweenSetsSec`, `sideSwitchSec`, `explanationSec`, `transitionSec`입니다. 계산값은 가정이며 실측 시간이 아닙니다.
- 시간 미정·오류뿐 아니라 잘못된 항목 제외, 순환, 깊이·개수·스캔 한도 초과도 부분 합계로 표시합니다. 일부만 읽은 수업을 정확한 목표시간 일치나 전체 시간 부족으로 표시하지 않습니다. 전체 좌우 편성이 확인되지 않으면 이를 명시합니다.
- 기구 변경의 30초 안내는 편성 검토용 가정 기준입니다. 이동 거리와 세팅에 맞춰 강사가 조절해야 합니다.
- 입력 배열은 전체 10,000개까지 스캔하고, 정규화된 항목은 최대 1,000개, 중첩은 최대 16단계로 제한합니다. 잘못된 스칼라 값은 짧은 진단 문자열로 분리해 원본 참조·암묵 변환·깊은 순회를 피합니다.

## 읽기 전용 계약

기존 `sequenceEngine`, `stepTimeEstimate`, `sequenceValidation`, `classInsights`, `hierarchyModel`의 순수 계산을 재사용합니다. 원본 데이터와 전달된 정규화 계획을 변경하거나 동결하지 않습니다. 저장소·계정·네트워크·음성·타이머를 호출하지 않습니다. 반환 결과는 분리된 객체이며 동결됩니다.

이슈의 `itemIds`와 `itemIndices`는 제외·중복 항목 처리 후 실제 정규화 항목에 연결됩니다. 여러 검토 패널을 동시에 띄워도 DOM ID와 이동 대상이 충돌하지 않습니다. 항목 이동은 모션 줄이기를 존중하고, 보고서 교체 시 이전 강조를 남기지 않습니다.

## 사용

```tsx
import { reviewClassPlan, ClassPlanReviewPreview } from './features/classPlanReview';
const report = reviewClassPlan({ title: '수업 계획', targetMinutes: 50, steps });
return <ClassPlanReviewPreview report={report} />;
```

`ClassPlanReviewFixtureHarness`는 합성 데이터 6종을 제공하는 개발용 하네스입니다. `browserFixture.html` 및 `verifyClassPlanReviewBrowser.mjs`는 로컬 확인용이며 운영 라우트가 아닙니다.

## 독립 검증

2026-11-06 UTC, main `29a6edb` 기반 직접 검증:

- 원본 후보: 2파일 22테스트 통과. 추가 경계 검사 13개 중 12개 실패를 실제 재현한 뒤 수정했습니다.
- 보정 후: 3파일 36테스트 통과. 부분 합계·스캔 한도·입력 불변성·12,000단계 잘못된 스칼라·정확한 항목 연결·다중 패널·모션 줄이기·불완전 좌우 요약 포함.
- 설치된 Google Chrome과 기존 Playwright로 320/390/768/1440px, 합성 프리셋 6종, 가로 넘침 없음, 44px 조작부, 키보드 탭, 부분 합계, 다중 패널 정확한 이동, 모션 줄이기, localStorage 불변을 검증했습니다.
- 실제 기기·Safari·운영 화면 검증이나 의료/해부학적 검증을 의미하지 않습니다. 전체 통합 회귀와 빌드는 별도 최종 검증입니다.

재현: 기존 의존성을 사용해 `node node_modules/vitest/vitest.mjs run src/features/classPlanReview`를 실행합니다. 브라우저는 로컬 Vite 서버를 준비한 뒤 `CLASS_REVIEW_BASE_URL`, `PLAYWRIGHT_MODULE`(기존 설치 경로), 선택적으로 `CLASS_REVIEW_OUT`을 지정해 `node src/features/classPlanReview/verifyClassPlanReviewBrowser.mjs`를 실행합니다. 새 패키지 설치는 필요하지 않습니다.

원본 출처·검증 한계는 `INTEGRATION_PROVENANCE.md`를 참고하세요.
