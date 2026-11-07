# 프리셋 추천 개선 후보 모듈 (`src/features/presetSuggestionCandidate`)

사용자가 선택한 **기구(apparatus / availableEquipment)**, **주제(theme / focusPreset)**, **목표 수업 시간(targetMinutes)**, **쉬는 시간(restMinutes)** 및 선택적 **시드 스텝(seedPlan)** 입력을 바탕으로, **기존 카탈로그의 검증 가능한 동작 ID만 사용해 편집 가능한 프리셋 초안 후보를 결정론적(deterministic)으로 추천·조립하는 순수 TypeScript 독립 모듈**입니다.

현재 운영 라우트(`App.tsx`, `SequenceWorkbench.tsx`)나 전역 스토어(`usePilatesStore.ts`)를 직접 수정하지 않고 독립 서브트리(`src/features/presetSuggestionCandidate/**`)에 격리되어 있으며, 통합 코디네이터가 기존 `OfflinePresetPicker` 및 `sequenceEngine`과 안전하게 연결할 수 있도록 설계되었습니다.

---

## 1. 기존 `OfflinePresetPicker` 및 `sequenceEngine` 대비 개선점

1. **기존 계약의 읽기 전용 재사용 (중복 구현 배제)**
   - `INITIAL_EXERCISES`, `OFFLINE_CLASS_PRESETS`, `OFFLINE_BLOCK_PRESETS`, `PRESET_THEME_CATALOG`, `EQUIPMENT_OPTIONS` 데이터를 읽기 전용으로 참조합니다.
   - 시간·전환·검증 계산은 기존 `sequenceEngine` (`getStepTiming`, `getSequenceDurations`, `applyTransitionAllowances`, `fitSequenceDuration`, `analyzeSequence`), `stepTimeEstimate` (`calculateStepTimeEstimate`), `exerciseAuthoring` (`isExerciseAuthoringEligible`), `classBlockPresetValidator` (`inspectUnverifiedHealthOrRehabClaims`)를 그대로 재사용합니다.
2. **정적 시간 필터의 한계를 보완하는 3계층(3-Tier) 결정론적 추천**
   - 기존 `OfflinePresetPicker`는 고정된 프리셋 시간(`15, 20, 30, 45, 50, 60분`)과 단순 필터 일치만 보여줍니다.
   - 본 모듈은 강사가 `25분`, `40분 + 휴식 3분` 등 임의의 유효 목표 시간을 요청하더라도:
     - **Tier 1 (`offline-class-preset-exact` / `offline-class-preset-adapted`)**: 기구·주제가 일치하는 오프라인 수업 프리셋의 정확 일치본 또는 목표시간·휴식 비례 맞춤 초안
     - **Tier 2 (`offline-block-preset-assembly`)**: `preparation` + `main` + `cooldown` 오프라인 재사용 블록 프리셋을 고유 동작 계열 중복 없이 조립한 초안
     - **Tier 3 (`catalog-deterministic-composition`)**: 검증 가능한 카탈로그 동작 ID(`INITIAL_EXERCISES`)에서 필수 기구 커버리지와 전환 점수, 최근 수업 이력 회피를 반영해 구성한 초안
     을 순위화하여 제시합니다.
3. **6대 경계 조건 및 목표시간 불가능 사유의 명시적 진단**
   - 입력이 불가능하거나 손상된 경우 조용히 실패하거나 임의의 0초·가짜 동작을 만들어내지 않고, 왜 목표 시간을 맞출 수 없는지(`TargetFeasibilityReport`)와 어떤 스텝에서 경계 조건이 위반되었는지(`PresetSuggestionIssue`)를 구조화된 코드로 반환합니다.

---

## 2. 진실성 및 비조작(Non-Fabrication) 경계

모든 추천 결과(`PresetSuggestionResult`)와 개별 후보(`PresetSuggestionCandidate`), 그리고 복사본 생성 함수(`instantiateSuggestedCandidateAsEditableDraft`)는 `DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY`를 포함합니다.

- **AI 미사용 (`aiUsed: false`, `isAiGenerated: false`)**: 외부 LLM/AI 호출이나 확률적 생성을 일절 사용하지 않는 100% 결정론적 규칙 기반 엔진입니다.
- **임상·해부학 검증 완료 비주장 (`clinicalSafetyGuaranteed: false`, `medicalOrRehabEfficacyClaimed: false`, `anatomicalVerificationCompleted: false`, `expertClinicalVerified: false`)**: 의료적 안전, 통증 치료, 재활 효과나 해부학적 검증 완료를 주장하지 않으며, 생성된 모든 텍스트는 `inspectUnverifiedHealthOrRehabClaims` 검사를 통과해야 합니다.
- **새 동작·근거·관절 각도 창작 금지 (`newMovementInvented: false`, `newEvidenceOrAngleInvented: false`, `catalogIdsOnly: true`)**: 오직 카탈로그에 등록되어 있고 `isExerciseAuthoringEligible(ex)` 및 `getExerciseEquipment(ex).requirementsKnown`을 충족하는 동작 ID만 사용합니다.
- **편집 가능한 초안 (`isEditableDraft: true`)**: 추천 결과는 강사가 수업 전 직접 검토·수정하는 초안이며, `instantiateSuggestedCandidateAsEditableDraft(candidate)` 호출 시 동결되지 않은 독립 복사본(`SavedSequence`, `ConditionTemplate`, `SequenceStep[]`)을 생성합니다.

---

## 3. 6대 경계 및 불가능 조건 명세

### 3.1 중첩 cycle 및 컨테이너 깊이 (`cycle-and-bounds`)
- `nested-cycle-detected`: `seedPlan`의 `steps` / `items` / `blocks` / `children` 중첩 구조에서 자기 참조 또는 조상 참조 순환(cycle)이 감지된 경우 무한 루프 없이 즉시 차단(`blocking: true`)합니다.
- `max-nesting-depth-exceeded`: 컨테이너 중첩 깊이가 `PRESET_SUGGESTION_LIMITS.MAX_NESTING_DEPTH` (`16`)를 초과한 경우 차단합니다.

### 3.2 없는 ID 및 미검증 카탈로그 동작 (`unknown-id`)
- `unknown-exercise-id`: 시드 스텝의 `exerciseId`가 비어 있거나 카탈로그에 존재하지 않는 ID일 때 가짜 동작을 만들어내지 않고 즉시 차단합니다.
- `unverifiable-catalog-exercise`: 카탈로그에는 존재하나 필수 작성·검증 계약(`isExerciseAuthoringEligible` 또는 `requirementsKnown`)을 충족하지 않는 동작 ID일 때 차단합니다.
- `unknown-equipment-id`: 지원하지 않는 `apparatus` 분류, 등록되지 않은 `availableEquipment` ID, 빈 기구 목록, 또는 선택한 기구와 보유 기구(`ownedApparatus`) 불일치 시 차단합니다.

### 3.3 편측(Unilateral) 시간 및 좌우 균형 (`unilateral-timing`)
- `unilateral-together-mismatch`: 카탈로그상 편측(`isUnilateral: true`)인 동작이 `sideMode: 'together'`로 설정되어 좌·우 교대 수행 시간이 누락된 경우 차단합니다.
- `unilateral-per-side-too-short`: 양쪽 순차(`left-then-right`, `right-then-left`) 또는 좌/우 분할(`left`, `right`) 편측 동작에서 한쪽당 순수 수행 시간(`perSideSec`)이 `MIN_PER_SIDE_SEC` (`15초`) 미만인 경우 차단합니다.
- `unilateral-split-imbalance`: 동일 동작을 `left` 스텝과 `right` 스텝으로 분리했을 때 좌·우 스텝 수 또는 수행 시간 합계가 1:1로 일치하지 않는 경우 차단합니다.
- `unilateral-time-estimate-mismatch`: `timeEstimate`의 `sides` 값(`1` 또는 `2`)이 편측 `sideMode` 계약과 모순되거나 숫자 범위를 벗어난 경우 진단합니다.

### 3.4 쉬는 시간(Rest Budget) 계약 (`rest-budget`)
- `rest-duration-invalid`: `restMinutes` 또는 휴식 스텝(`kind: 'rest'`)의 `durationMin`이 0 이하(휴식 스텝 기준), 음수, `NaN`/`Infinity`, 또는 20분 초과인 경우 차단합니다.
- `rest-exceeds-or-equals-target`: 요청한 쉬는 시간과 시드 휴식 스텝의 합계(`totalRestSec`)가 전체 목표 수업 시간(`targetSec`) 이상이어서 운동 시간이 0초 이하가 되는 경우 차단합니다.
- `rest-leaves-insufficient-exercise-time`: 목표 시간 전체는 충분하더라도 쉬는 시간을 차감한 잔여 운동 시간이 최소 동작 시간 합계보다 부족해지는 경우 차단합니다.
- `rest-step-malformed`: 휴식 스텝(`kind: 'rest'`)에 `exerciseId`, `repetitions`, `sets`, `sideMode` 등 동작 전용 속성이 잘못 포함된 경우 차단합니다.

### 3.5 상한 및 입력 위생 (`PRESET_SUGGESTION_LIMITS`)
| 상수 | 값 | 설명 |
| --- | --- | --- |
| `MAX_RAW_SCAN_NODES` | `10,000` | 원시 컨테이너·리프 최대 스캔 노드 수 (`max-input-scan-exceeded`) |
| `MAX_ITEMS` | `1,000` | 정규화 가능한 최대 시드 스텝 수 (`max-item-count-exceeded`) |
| `MAX_NESTING_DEPTH` | `16` | 중첩 블록/컨테이너 최대 깊이 (`max-nesting-depth-exceeded`) |
| `MIN_TARGET_MINUTES` / `MAX_TARGET_MINUTES` | `10` / `120` | 수업 목표 시간 허용 범위 (10분~120분) |
| `MIN_STEP_TOTAL_SEC` / `MAX_STEP_TOTAL_SEC` | `30` / `1,200` | 개별 스텝 총 시간 허용 범위 (30초~20분, `step-duration-out-of-bounds`) |
| `MIN_MOVEMENT_SEC` | `30` | 동작 스텝당 최소 순수 수행 시간 (30초) |
| `MIN_PER_SIDE_SEC` | `15` | 편측 동작 한쪽당 최소 순수 수행 시간 (15초) |
| `MIN_ADJUSTABLE_STEP_FLOOR_SEC` | `60` | 비잠금 동작 스텝 시간 배분 시 최소 바닥 시간 (60초) |
| `MAX_REPETITIONS` / `MAX_SETS` | `1,000` / `100` | 반복 횟수 및 세트 수 상한 (`invalid-repetition-or-set`) |

- 손상된 스칼라나 깊은 객체가 `durationMin`, `targetMinutes`, `apparatus` 등에 주입되더라도 `toPresetSuggestionDiagnosticValue`를 통해 짧은 원시 진단 문자열로 분리하며, 호출자의 입력 객체를 절대 변형(mutate)하거나 동결(`Object.freeze`)하지 않습니다.

### 3.6 목표시간 불가능 조건 (`TargetTimeImpossibilityReason` 11종)
`evaluatePresetTargetFeasibility`는 다음 11가지 사유를 판별합니다.
1. `target-duration-out-of-bounds`: 목표 수업 시간이 미지정이거나 10~120분 범위를 벗어남(또는 난이도 오류)
2. `unknown-equipment-id`: 기구 분류 또는 세부 기구 ID가 유효하지 않음
3. `rest-duration-invalid`: 쉬는 시간 입력값이 유효하지 않음
4. `rest-exceeds-or-equals-target`: 총 휴식 시간이 목표 수업 시간 이상임
5. `rest-leaves-insufficient-exercise-time`: 휴식 시간을 제외하면 최소 동작 수행 시간을 확보할 수 없음
6. `locked-step-has-unknown-or-incompatible-exercise`: 잠긴(`locked: true`) 시드 스텝에 미등록 동작, 기구·난이도 불일치 동작, 또는 동일 계열 중복 동작이 포함됨
7. `locked-steps-exceed-target`: 잠긴 동작 시간과 휴식 시간의 합이 목표 수업 시간을 초과함
8. `all-steps-locked-time-mismatch`: 모든 시드 동작이 잠겨 있어 목표 시간과의 차이를 조정할 수 없음
9. `minimum-step-duration-exceeds-target`: 각 동작의 최소 보장 시간(수행 30초 + 설명·전환, 스텝당 최소 60초) 합계가 목표 시간을 초과함
10. `maximum-step-cap-cannot-reach-target`: 스텝당 최대 20분 상한과 동일 동작 계열 중복 금지 계약으로 인해 가용 동작만으로는 목표 시간에 도달할 수 없음
11. `insufficient-verifiable-catalog-movements`: 요청한 기구·소도구·난이도 조건을 만족하는 검증 가능한 고유 카탈로그 동작 수가 부족함

---

## 4. 사용 예시

```tsx
import {
  suggestPresetCandidates,
  instantiateSuggestedCandidateAsEditableDraft,
  PresetSuggestionCandidatePreview,
} from './features/presetSuggestionCandidate';

const result = suggestPresetCandidates({
  apparatus: 'reformer',
  theme: 'core-spinal-control',
  targetMinutes: 40,
  restMinutes: 3,
  level: '1.5',
});

if (result.status === 'ready' && result.recommendedCandidate) {
  const editableDraft = instantiateSuggestedCandidateAsEditableDraft(
    result.recommendedCandidate,
  );
  // editableDraft.sequence, editableDraft.steps, editableDraft.conditionTemplate는
  // 동결되지 않은 독립 복사본이므로 워크벤치에서 자유롭게 편집할 수 있습니다.
}

return (
  <PresetSuggestionCandidatePreview
    result={result}
    onInstantiateEditableDraft={(draft) => {
      console.log('편집 가능한 수업 초안 복사 완료:', draft.sequence.title);
    }}
  />
);
```

## 5. 테스트 실행

기존에 설치된 Vitest로 단위·경계·컴포넌트 테스트를 실행할 수 있습니다 (추가 패키지 설치 불필요):

```bash
node node_modules/vitest/vitest.mjs run src/features/presetSuggestionCandidate
```

운영 화면(`OfflinePresetPicker.tsx`, `SequenceWorkbench.tsx`)과의 비침투적 통합 방법은 [`INTEGRATION_PROPOSAL.md`](./INTEGRATION_PROPOSAL.md)를 참고하세요.
