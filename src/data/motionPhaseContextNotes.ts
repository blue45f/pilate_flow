import type { MotionStudyFamily, MotionStudyPhaseId } from '../utils/motionStudyStages';

export interface MotionPhaseContextNote {
  readonly poseSummaryKo: string;
  /** Describes changes over the phase, not an instantaneous contact/pressure measurement. */
  readonly contactChangeKo: string;
  readonly qualifications: readonly string[];
}

export interface MotionPhaseContextNotes {
  readonly family: MotionStudyFamily;
  readonly variantId: string;
  /** The authored source bundle inspected for these annotations; never a review hash. */
  readonly expectedSourceFingerprint: string;
  readonly phases: Readonly<Record<MotionStudyPhaseId, MotionPhaseContextNote>>;
}

const MODEL_LIMITS = [
  '저작 도형과 접점의 설명입니다. 실제 자세·접촉 압력·개인별 적합성·안전성은 미확인입니다.',
  '원문 영상과의 동작 정합성·전문가 검토·의학적 적합성은 확인하지 않았습니다.',
] as const;

const qualifications = (detail: string): readonly string[] => [...MODEL_LIMITS, detail];

/**
 * Narrow annotations of twenty-one inspected authored models, not new exercise/source facts.
 * Evidence: motionAuthoringBatch.ts seatedPose/pronePose, pelvicCurl.ts, supineReach.ts,
 * chestLift.ts, seatedBandRow.ts, heelRaise.ts, clam.ts, supineDrafts.ts, lateralDrafts.ts,
 * quadrupedDrafts.ts, reformerFootwork.ts, chairPedalPress.ts, reformerStrapArmPress.ts,
 * cadillacArmSpringPress.ts and standingSupportDrafts.ts.
 * Preserve the expected fingerprint until the changed model has been inspected again.
 */
export const MOTION_PHASE_CONTEXT_NOTES: readonly MotionPhaseContextNotes[] = [
  {
    family: 'existing-proposal',
    variantId: 'supported-heel-raise',
    expectedSourceFingerprint: '28fc4a7ffca1f6bb58c03150e86a2534d52f8333d9c77821ac67aacbf42b4326',
    phases: {
      setup: {
        poseSummaryKo: '일반 고정 의자 등받이 레일에 양손을 두고 양발을 바닥에 둔 선 자세 시작 배치입니다.',
        contactChangeKo: '양손의 의자 등받이 접점과 양 앞발·발가락의 바닥 접점이 고정되며, 양 뒤꿈치는 바닥에 닿은 상태입니다.',
        qualifications: qualifications('의자 앞으로 다가서는 준비 과정은 포함하지 않습니다. 필라테스 체어가 아닌 일반 고정 의자 도해입니다.'),
      },
      move: {
        poseSummaryKo: '고정된 앞발 둘레로 발목·뒤꿈치가 회전하며 무릎·골반·몸통·머리가 함께 위로 올라가고 팔꿈치 각도가 조정됩니다.',
        contactChangeKo: '양 뒤꿈치의 바닥 접점이 떨어짐 상태로 바뀌고, 양 앞발·발가락 바닥 접점과 양손의 의자 등받이 고정 접점은 유지됩니다.',
        qualifications: qualifications('발 회전 각도와 두 링크 팔꿈치 풀이는 저작 기하이며 실제 종아리 부하·균형·체중 분배는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양손은 의자 등받이에 둔 채 양 뒤꿈치가 들린 저작 배치를 표시합니다.',
        contactChangeKo: '양 뒤꿈치 접점은 바닥에서 떨어진 상태이며, 양 앞발·발가락과 양손의 고정 지지 접점이 이어집니다.',
        qualifications: qualifications('높아진 구간의 높이와 정지 비율은 도해 설정이며 실제 유지 시간이나 권장 각도를 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '들렸던 양 뒤꿈치와 몸통이 고정 앞발을 기준으로 처음 높이로 내려옵니다.',
        contactChangeKo: '내려오는 동안 뒤꿈치 접점은 떨어진 상태였다가 복귀 끝에 바닥 접촉으로 돌아오며, 앞발·발가락·양손 고정 접점은 유지됩니다.',
        qualifications: qualifications('복귀 속도와 경로는 저작 보간이며 실제 착지 압력이나 반복 횟수는 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '양 뒤꿈치가 다시 바닥에 닿은 처음의 의자 지지 선 자세 배치로 돌아옵니다.',
        contactChangeKo: '양 뒤꿈치의 바닥 접촉이 복원되고 양 앞발·발가락·의자 등받이 양손 고정 접점 설정으로 끝납니다.',
        qualifications: qualifications('손을 떼거나 이동하는 마무리 과정은 포함하지 않습니다. 실제 의자 지지 안정성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'side-lying-clam',
    expectedSourceFingerprint: '2647b2d5ae15685f36a28246ac67a62e327008a61d46007e3db897e7a7c91832',
    phases: {
      setup: {
        poseSummaryKo: '옆으로 누워 양 무릎을 굽히고 양 뒤꿈치·발끝을 모은 시작 배치입니다.',
        contactChangeKo: '머리 베개·어깨·골반·아래쪽 뒤꿈치의 매트 기준점과 양 뒤꿈치 모음 기준점이 고정됩니다.',
        qualifications: qualifications('옆으로 눕거나 베개를 고이는 준비 과정은 포함하지 않습니다. 머리 베개와 관절 길이는 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '고정된 위쪽 고관절과 뒤꿈치 축 둘레로 위쪽 무릎이 회전하며 열리고, 아래 다리와 몸통은 고정됩니다.',
        contactChangeKo: '위쪽 무릎이 열리는 동안 양 뒤꿈치 모음 기준점과 머리 베개·어깨·골반·아래 뒤꿈치 매트 기준점을 그대로 유지합니다.',
        qualifications: qualifications('고관절-뒤꿈치 축 회전은 두 다리 선분 길이를 유지하는 저작 기하이며 실제 골반 흔들림이나 둔근 부하는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양 뒤꿈치를 모은 채 위쪽 무릎이 열린 저작 배치를 표시합니다.',
        contactChangeKo: '양 뒤꿈치 모음 기준점과 머리 베개·어깨·골반·아래 뒤꿈치의 고정 기준점 설정이 이어집니다.',
        qualifications: qualifications('열린 각도와 구간 비율은 도해 설정이며 실제 가동 범위나 유지 시간을 정하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '열렸던 위쪽 무릎이 같은 고관절-뒤꿈치 축을 따라 아래 무릎 쪽으로 돌아옵니다.',
        contactChangeKo: '복귀 동안에도 양 뒤꿈치 모음 기준점과 몸통·아래 다리의 매트 고정 기준점을 유지합니다.',
        qualifications: qualifications('복귀 경로는 한쪽 다리의 저작 회전이며 반대쪽으로 돌아눕는 전환은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '위쪽 무릎이 닫힌 처음의 무릎 굽힌 옆누움 배치로 돌아옵니다.',
        contactChangeKo: '머리 베개·어깨·골반·아래 뒤꿈치 매트 기준점과 양 뒤꿈치 모음 기준점 설정으로 끝납니다.',
        qualifications: qualifications('자세를 풀거나 반대쪽으로 바꾸는 과정은 포함하지 않습니다. 개인별 고관절 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'adult-supine-heel-slide',
    expectedSourceFingerprint: '86d6763cbca5f8c4f0f3ac530cfb74dab2024bee9efe5c41d5af23a31af0547f',
    phases: {
      setup: {
        poseSummaryKo: '등을 대고 누워 두 무릎을 굽히고 양발을 매트에 둔 시작 배치입니다.',
        contactChangeKo: '머리·상부 등·골반과 양쪽 뒤꿈치·발끝의 매트 접점이 모두 고정 상태로 설정됩니다.',
        qualifications: qualifications('무릎을 세워 눕는 준비 과정은 포함하지 않습니다. 몸통 고정과 다리 치수는 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '선택한 다리의 발목과 뒤꿈치가 매트 위를 따라 발끝 쪽으로 이동하며 무릎이 펴지고, 반대 다리는 고정됩니다.',
        contactChangeKo: '움직이는 다리의 뒤꿈치·발끝 접점이 매트 위 슬라이딩 상태로 바뀌며, 반대 발과 머리·상부 등·골반 고정 접점은 유지됩니다.',
        qualifications: qualifications('슬라이딩 접점은 수평 이동 제약이며 실제 매트 마찰력·골반 중립 유지·복부 조절은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 다리가 매트 위로 길게 펴진 저작 배치를 표시하며 반대 무릎은 굽힌 채 남습니다.',
        contactChangeKo: '펴진 다리의 뒤꿈치·발끝은 매트 위 슬라이딩 접점으로 표시되고, 반대 발과 머리·상부 등·골반 고정 접점이 이어집니다.',
        qualifications: qualifications('다리가 펴진 거리와 정지 구간은 도해 설정이며 실제 무릎 신전 각도나 유지 시간을 처방하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '펴졌던 같은 다리의 뒤꿈치가 매트를 따라 처음의 무릎 굽힌 자리로 돌아옵니다.',
        contactChangeKo: '돌아오는 동안 움직이는 뒤꿈치·발끝은 슬라이딩 상태였다가 복귀 끝에 고정 접점으로 돌아옵니다.',
        qualifications: qualifications('복귀는 같은 다리의 한 주기이며 좌우 다리 교대나 휴식 자세는 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '두 무릎을 모두 굽힌 처음의 누운 시작 배치로 돌아옵니다.',
        contactChangeKo: '양쪽 뒤꿈치·발끝과 머리·상부 등·골반이 모두 매트 고정 접점인 상태로 끝납니다.',
        qualifications: qualifications('다리를 모두 펴거나 일어나는 마무리 과정은 포함하지 않습니다. 실제 요추 압력은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'supine-knee-fold',
    expectedSourceFingerprint: '384987251d0e223a37dd9ee4271ebc32df3510027896cedf0360ae000173da40',
    phases: {
      setup: {
        poseSummaryKo: '등을 대고 누워 두 무릎을 굽히고 양발을 매트에 둔 시작 배치입니다.',
        contactChangeKo: '머리·상부 등·골반과 양쪽 뒤꿈치·발끝의 매트 접점이 모두 고정 상태로 설정됩니다.',
        qualifications: qualifications('누워 무릎을 세우는 준비 과정은 포함하지 않습니다. 골반·몸통 완전 고정은 저작 단순화입니다.'),
      },
      move: {
        poseSummaryKo: '선택한 굽힌 다리가 고관절 둘레로 한 덩어리처럼 회전하며 발이 매트에서 들려 올라갑니다.',
        contactChangeKo: '움직이는 다리의 뒤꿈치·발끝 접점이 들림 상태로 바뀌고, 반대쪽 뒤꿈치·발끝과 머리·상부 등·골반 고정 접점은 유지됩니다.',
        qualifications: qualifications('무릎 각도를 고정한 채 고관절만 회전하는 저작 링크이며 두 번째 다리를 함께 드는 변형은 포함하지 않습니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 한쪽 무릎이 골반 위로 접혀 발이 매트에서 떨어진 저작 배치를 표시합니다.',
        contactChangeKo: '들린 다리의 뒤꿈치·발끝은 매트에서 떨어진 상태이며, 반대 발과 머리·상부 등·골반의 고정 매트 접점이 이어집니다.',
        qualifications: qualifications('정지 구간의 허벅지 수직 배치와 시간 비율은 도해 설정이며 실제 유지 시간이나 복부 부하를 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '들렸던 같은 쪽의 굽힌 다리가 고관절 둘레로 내려오며 처음 발 자리로 돌아갑니다.',
        contactChangeKo: '내려오는 동안 움직이는 발 접점은 들림 상태였다가 복귀 끝에서 매트 고정 접점으로 돌아옵니다.',
        qualifications: qualifications('복귀 중 허리 들림 여부나 착지 충격은 모델링하지 않았으며 반대 다리 교대는 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양발을 모두 매트에 둔 처음의 두 무릎 굽힌 누운 배치로 돌아옵니다.',
        contactChangeKo: '들렸던 뒤꿈치·발끝이 다시 매트 고정 접점으로 복원되어 양발·머리·상부 등·골반 고정 상태로 끝납니다.',
        qualifications: qualifications('자세를 풀고 일어나는 과정은 포함하지 않습니다. 개인별 고관절·요추 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'side-lying-straight-leg-lift',
    expectedSourceFingerprint: '9d27755c9052c88cad9c5c6e8d84d1b40013f4f9e4e7269a47c57e20b519ab58',
    phases: {
      setup: {
        poseSummaryKo: '도해용 머리 받침을 두고 옆으로 누워 양다리를 곧게 편 시작 배치입니다.',
        contactChangeKo: '머리 받침·아래 어깨·골반·아래 무릎·아래 뒤꿈치·앞손의 매트 지지 접점과 위쪽 뒤꿈치의 바닥 접점이 고정됩니다.',
        qualifications: qualifications('도해용 머리 받침과 앞손 매트 지지는 원문 필수 조건이 아닌 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '선택한 위쪽의 곧은 다리가 고관절 둘레로 위로 들려 올라가고 몸통과 아래 다리는 고정됩니다.',
        contactChangeKo: '위쪽 뒤꿈치의 매트 접점이 해제 상태로 바뀌며, 머리 받침·아래 어깨·골반·아래 무릎·아래 뒤꿈치·앞손 고정 접점은 유지됩니다.',
        qualifications: qualifications('위쪽 다리 들림 각도와 골반 고정은 저작 기하이며 실제 중둔근 부하나 골반 측면 경사는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '위쪽 곧은 다리가 열린 저작 배치를 표시하며 아래 다리와 몸통은 시작 위치를 유지합니다.',
        contactChangeKo: '위쪽 뒤꿈치 접점은 해제된 채로 남고, 나머지 머리 받침·몸통·아래 다리·앞손의 고정 지지 접점이 이어집니다.',
        qualifications: qualifications('열린 높이와 정지 구간은 도해 표시 설정이며 실제 권장 가동 범위나 유지 시간을 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '들렸던 위쪽 곧은 다리가 내려오며 처음의 포갠 다리 높이로 돌아갑니다.',
        contactChangeKo: '내려오는 동안 위쪽 뒤꿈치 접점은 해제 상태였다가 복귀 끝에 고정 상태로 돌아옵니다.',
        qualifications: qualifications('복귀 경로는 한쪽 다리의 저작 보간이며 반대쪽으로 돌아눕는 과정은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '도해용 머리 받침을 두고 양다리를 곧게 편 처음의 옆누움 시작 배치로 돌아옵니다.',
        contactChangeKo: '위쪽 뒤꿈치 접점이 다시 고정 상태로 복원되고 머리 받침·아래 몸통·아래 다리·앞손 고정 설정으로 끝납니다.',
        qualifications: qualifications('머리 받침 유무와 발목 각도는 저작 선택이며 개인별 고관절 안전성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'side-lying-open-book',
    expectedSourceFingerprint: 'a79a1c84abc3d961d8224a2aa96d6e24de72e0219803170d4a538529be28a665',
    phases: {
      setup: {
        poseSummaryKo: '무릎을 굽혀 옆으로 누운 배치에서 양손을 앞으로 모으고 머리는 도해용 받침 위에 둔 시작 자세입니다.',
        contactChangeKo: '머리 받침·아래 어깨·골반·아래 무릎·아래 뒤꿈치 매트 접점과 양 무릎 포갬·양손 모음 접점이 고정 상태로 설정됩니다.',
        qualifications: qualifications('도해용 머리 받침과 고정된 머리 중심은 저작 단순화이며 원문의 필수 소도구 조건이 아닙니다.'),
      },
      move: {
        poseSummaryKo: '포갠 무릎과 골반은 고정한 채 위쪽 팔과 상부 흉곽 리본·머리 방향이 위·반대쪽으로 회전하며 열립니다.',
        contactChangeKo: '양손 모음 접점이 해제 상태로 바뀌고, 양 무릎 포갬 접점과 머리 받침·아래 어깨·골반·아래 다리 매트 고정 접점은 유지됩니다.',
        qualifications: qualifications('세 링으로 그린 몸통 비틀림과 팔·머리 회전 각도는 저작 기하이며 실제 흉추·견갑골 가동 범위는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '위쪽 팔과 가슴이 반대쪽으로 열린 저작 배치를 표시하며 위쪽 손은 바닥에 닿지 않습니다.',
        contactChangeKo: '양손 모음 접점은 해제된 상태이며, 양 무릎 포갬과 아래쪽 몸통·다리·머리 받침 고정 접점이 이어집니다.',
        qualifications: qualifications('위쪽 팔을 바닥에 닿게 강제하지 않는 도해 설정입니다. 실제 유지 시간이나 스트레칭 강도를 정하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '열렸던 위쪽 팔과 상부 흉곽·머리 방향이 다시 앞쪽으로 회전하며 처음 모아 둔 손 위치로 돌아옵니다.',
        contactChangeKo: '돌아오는 동안 양 무릎 포갬 접점은 고정으로 유지되고, 해제되었던 양손 모음 접점이 복귀 끝에 다시 만납니다.',
        qualifications: qualifications('복귀 경로는 한쪽 회전 주기의 저작 보간이며 호흡 타이밍이나 반복 횟수는 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '양손을 앞에 모으고 무릎을 포갠 처음의 옆누움 배치로 돌아옵니다.',
        contactChangeKo: '양손 모음 접점이 다시 고정 상태로 복원되어 양 무릎 포갬 및 매트·머리 받침 고정 설정으로 끝납니다.',
        qualifications: qualifications('반대쪽으로 돌아눕거나 일어나는 과정은 포함하지 않습니다. 개인별 흉추·어깨 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'quadruped-arm-slide',
    expectedSourceFingerprint: '39e74fe8a7e5206c337e94e176fb84cd62f7e7bde3d2f03fe575178e21453179',
    phases: {
      setup: {
        poseSummaryKo: '양손바닥·양무릎·양발끝 패치를 매트에 두고 팔꿈치를 약간 굽힌 네발기기 시작 배치입니다.',
        contactChangeKo: '좌우 손바닥·무릎의 주 지지 패치와 양 발끝 보조 패치 여섯 곳이 모두 매트 고정 상태로 설정됩니다.',
        qualifications: qualifications('팔꿈치를 약간 굽힌 시작 각도와 고정 몸통 상자는 두 링크 도달 거리를 위한 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '몸통과 다른 세 사지는 고정한 채 선택한 쪽 손바닥 패치가 매트 위를 따라 앞으로 미끄러지며 팔이 펴집니다.',
        contactChangeKo: '움직이는 손바닥 패치가 매트 위 슬라이딩 상태로 바뀌고, 반대 손바닥과 양쪽 무릎·발끝 패치 다섯 곳은 고정 상태를 유지합니다.',
        qualifications: qualifications('손바닥 점 접촉 슬라이드는 저작 제약이며 손을 들어 올리는 후반 진행 단계나 실제 체중 이동은 모델링하지 않았습니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 한 손이 매트 위 앞쪽에 뻗은 저작 배치를 표시하며 몸통과 골반 높이는 고정되어 있습니다.',
        contactChangeKo: '앞으로 간 손바닥 패치는 매트 슬라이딩 접촉으로 표시되고, 나머지 손·양무릎·양발끝 매트 고정 패치가 이어집니다.',
        qualifications: qualifications('뻗은 거리와 정지 구간은 도해 표시 설정이며 실제 어깨 굴곡 범위나 지지 하중을 검증한 값이 아닙니다.'),
      },
      return: {
        poseSummaryKo: '앞으로 미끄러졌던 같은 손바닥 패치가 매트를 따라 어깨 아래의 처음 자리로 돌아옵니다.',
        contactChangeKo: '돌아오는 동안 움직이는 손바닥 패치는 슬라이딩 상태였다가 복귀 끝에 매트 고정 상태로 돌아옵니다.',
        qualifications: qualifications('복귀는 한 팔 슬라이드의 저작 구간이며 팔·다리 동시 리치나 좌우 교대는 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양손과 양무릎·양발끝이 처음 위치에 놓인 네발기기 시작 배치로 돌아옵니다.',
        contactChangeKo: '여섯 매트 패치가 모두 다시 고정 상태로 복원되어 끝납니다.',
        qualifications: qualifications('네발기기에서 내려오거나 손목을 쉬게 하는 과정은 포함하지 않습니다. 손목·어깨 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'reformer-parallel-footwork',
    expectedSourceFingerprint: '77659ce03747e406b15b80537133a4f5fbd6850592bdbe88a4db62d027cc571a',
    phases: {
      setup: {
        poseSummaryKo: '리포머 캐리지에 누워 양 뒤꿈치를 고정 풋바에 두고 두 무릎을 굽힌 시작 배치입니다.',
        contactChangeKo: '양 뒤꿈치의 풋바 월드 고정 접점과 골반·등·머리의 캐리지 고정 접점이 설정됩니다.',
        qualifications: qualifications('리포머에 눕거나 스프링을 거는 과정은 포함하지 않습니다. 스프링 저항과 제조사별 치수는 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '풋바의 양 뒤꿈치 위치는 고정한 채 무릎이 펴지며 캐리지와 골반·몸통·머리가 함께 수평 이동합니다.',
        contactChangeKo: '양 뒤꿈치는 고정 풋바 접점에 남고, 골반·등·머리 접점은 이동하는 캐리지 프레임 위에서 고정 설정을 유지합니다.',
        qualifications: qualifications('캐리지 이동 거리와 두 링크 무릎 풀이는 저작 기하이며 실제 스프링 장력·발 아치나 발끝 위치 변형은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '캐리지가 밀려 나가 양다리가 펴진 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '고정 풋바의 양 뒤꿈치 접점과 이동한 캐리지 위의 골반·등·머리 지지 접점이 그대로 이어집니다.',
        qualifications: qualifications('다리가 펴진 구간에서 무릎 과신전 여부나 유지 시간은 처방하지 않으며 도해 표시용 정지입니다.'),
      },
      return: {
        poseSummaryKo: '양 무릎이 다시 굽혀지며 캐리지와 몸통이 풋바 쪽 처음 위치로 돌아옵니다.',
        contactChangeKo: '복귀 동안에도 양 뒤꿈치의 풋바 접점과 캐리지 위의 골반·등·머리 지지 접점 설정을 유지합니다.',
        qualifications: qualifications('복귀 속도는 저작 곡선이며 스프링 복원력이나 스토퍼 접촉 충격은 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '캐리지가 처음 위치로 돌아와 두 무릎을 굽힌 리포머 풋워크 시작 배치로 끝납니다.',
        contactChangeKo: '양 뒤꿈치 풋바 고정 접점과 골반·등·머리 캐리지 고정 접점 설정이 처음 좌표로 복원됩니다.',
        qualifications: qualifications('풋바에서 발을 내리거나 기구에서 내려오는 과정은 포함하지 않습니다. 실제 기구 세팅 안전성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'chair-seated-pedal-press',
    expectedSourceFingerprint: '988889979d2a7693dbbcceb91dde7e435767b3ff353444568c6ba6b0d1043111',
    phases: {
      setup: {
        poseSummaryKo: '필라테스 체어 시트에 앉아 상체를 세우고, 들려 있는 페달 위에 양 뒤꿈치를 올린 시작 배치입니다.',
        contactChangeKo: '양쪽 좌골의 체어 시트 고정 접점과 양 뒤꿈치의 체어 페달 고정 접점이 설정됩니다.',
        qualifications: qualifications('필라테스 체어에 앉거나 페달에 발을 올리는 준비 과정은 포함하지 않습니다. 스프링 강도는 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '골반과 상체는 체어 시트에 고정한 채 페달이 힌지 축 둘레로 아래로 회전하며 양 뒤꿈치와 무릎이 함께 내려갑니다.',
        contactChangeKo: '양쪽 좌골은 고정 시트 접점에 남고, 양 뒤꿈치 접점은 회전하는 페달 프레임에 고정된 채 아래 호를 따라 이동합니다.',
        qualifications: qualifications('페달 회전 각도와 두 링크 무릎 위치는 저작 기하이며 실제 스프링 저항·척추 정렬·손잡이 유무는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '페달을 아래로 누른 저작 배치를 정지 구간으로 표시하며 상체는 처음 시트 위 위치를 유지합니다.',
        contactChangeKo: '체어 시트의 양 좌골 접점과 낮아진 페달 위의 양 뒤꿈치 고정 접점 설정이 이어집니다.',
        qualifications: qualifications('페달 하단 각도와 정지 시간은 도해 표시 설정이며 바닥 접촉 여부나 실제 유지 시간을 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '페달이 힌지 축을 따라 다시 위로 올라오며 양 무릎이 굽혀지고 처음 페달 높이로 돌아갑니다.',
        contactChangeKo: '올라오는 동안에도 시트 위 양 좌골 고정 접점과 페달 위 양 뒤꿈치 고정 접점 설정을 유지합니다.',
        qualifications: qualifications('복귀 중 스프링이 페달을 밀어 올리는 힘이나 발목 각도 변화는 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '페달이 처음 각도로 올라온 체어 앉기 시작 배치로 돌아옵니다.',
        contactChangeKo: '양 좌골 시트 접점과 양 뒤꿈치 페달 접점이 처음 저작 좌표로 복원되어 끝납니다.',
        qualifications: qualifications('페달에서 발을 떼거나 체어에서 내려오는 과정은 포함하지 않습니다. 실제 기구 안전 설정은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'reformer-supine-strap-arm-press',
    expectedSourceFingerprint: '6513250f64ebd38b0be4c594e75aec5a5147367ec9552982a122cbd10a3d7251',
    phases: {
      setup: {
        poseSummaryKo: '리포머 캐리지에 누워 발목 사이에 도해용 공을 끼운 테이블톱 다리 배치에서 양손으로 스트랩 핸들을 위로 든 시작 자세입니다.',
        contactChangeKo: '머리·등·골반의 캐리지 지지 접점, 양 발목의 공 지지 접점, 양손의 핸들 파지 접점이 설정됩니다.',
        qualifications: qualifications('발목 사이 공 크기·압력과 도르래-캐리지 로프 총길이 보존 풀이는 원문 실측이 아닌 저작 기하입니다.'),
      },
      move: {
        poseSummaryKo: '양손이 호를 그리며 골반 쪽 아래로 내려가고, 로프 길이를 보존하도록 캐리지와 몸통·테이블톱 다리가 함께 이동합니다.',
        contactChangeKo: '양손 핸들 파지 접점과 발목 공 지지, 머리·등·골반 캐리지 지지 접점을 유지한 채 캐리지 프레임이 이동합니다.',
        qualifications: qualifications('스프링 힘과 도르래 마찰은 모델링하지 않았으며 외측으로 굽힌 두 링크 팔꿈치 경로는 저작 선택입니다.'),
      },
      turn: {
        poseSummaryKo: '양손을 캐리지 옆 아래로 내리고 캐리지가 이동한 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '양손 핸들 파지 접점, 양 발목의 공 지지 접점, 머리·등·골반의 캐리지 지지 접점이 그대로 이어집니다.',
        qualifications: qualifications('정지 구간의 팔 각도와 캐리지 위치는 도해 설정이며 실제 유지 시간이나 어깨·복부 부하를 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '양손이 다시 위쪽으로 올라가며 캐리지와 몸통·테이블톱 다리가 처음 위치로 돌아갑니다.',
        contactChangeKo: '복귀 동안에도 양손 핸들 파지, 양 발목 공 지지, 머리·등·골반 캐리지 지지 접점 설정을 유지합니다.',
        qualifications: qualifications('복귀 경로는 같은 저작 호를 역방향으로 따르며 다리 뻗기나 상체 들기 변형은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양손을 위로 들고 캐리지가 처음 자리로 돌아온 테이블톱 시작 배치로 끝납니다.',
        contactChangeKo: '머리·등·골반 캐리지 지지, 양 발목 공 지지, 양손 핸들 파지 접점이 처음 좌표로 복원됩니다.',
        qualifications: qualifications('스트랩을 걸거나 다리를 내리는 마무리 과정은 포함하지 않습니다. 실제 리포머 세팅 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'cadillac-supine-arm-spring-press',
    expectedSourceFingerprint: 'ef04508838a26f27cd5967234311098796feee8db2486199072f9feea3bb33dc',
    phases: {
      setup: {
        poseSummaryKo: '캐딜락 테이블에 무릎을 굽혀 눕고, 상부 프레임 고정점에 연결된 암 스프링 핸들을 팔꿈치를 굽혀 위로 든 시작 배치입니다.',
        contactChangeKo: '머리·등·골반과 양 뒤꿈치·발끝의 테이블 지지 접점, 양손의 스프링 핸들 파지 접점이 고정됩니다.',
        qualifications: qualifications('원문은 시작 팔꿈치 각도와 상부 고정점 좌표를 정하지 않으며, 시각적 코일 스프링은 장력을 계산하지 않습니다.'),
      },
      move: {
        poseSummaryKo: '테이블 위의 몸통과 다리는 고정한 채 양손이 호를 따라 테이블 쪽으로 내려가며 시각적 스프링 코일 길이가 늘어납니다.',
        contactChangeKo: '머리·등·골반·양발의 테이블 지지 접점은 고정으로 유지되고, 양손의 핸들 파지 접점이 호를 따라 이동합니다.',
        qualifications: qualifications('팔꿈치 바깥 굽힘과 손 경로 반지름은 저작 기하이며 실제 스프링 강도·견갑골 안정성은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양손을 아래로 내리고 스프링 코일이 길어진 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '테이블 위의 머리·등·골반·양 뒤꿈치·발끝 지지 접점과 양손 핸들 파지 접점이 이어집니다.',
        qualifications: qualifications('정지 구간의 손 높이와 코일 길이는 도해 표시 설정이며 실제 유지 시간이나 스프링 장력을 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '양손이 같은 저작 호를 따라 위로 올라가며 시각적 스프링 코일 길이가 처음 상태로 줄어듭니다.',
        contactChangeKo: '복귀 동안에도 머리·등·골반·양발의 테이블 고정 지지와 양손 핸들 파지 접점을 유지합니다.',
        qualifications: qualifications('복귀 속도는 저작 곡선이며 스프링이 손을 당기는 실제 물리력은 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '양손을 위로 든 처음의 캐딜락 테이블 누운 배치로 돌아옵니다.',
        contactChangeKo: '머리·등·골반·양발 테이블 지지 접점과 양손 핸들 파지 접점이 처음 저작 배치로 복원되어 끝납니다.',
        qualifications: qualifications('핸들을 놓거나 테이블에서 내려오는 과정은 포함하지 않습니다. 실제 캐딜락 체인·클립 안전은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'ladder-supported-hip-extension-slide',
    expectedSourceFingerprint: 'ea1a45c0a0c9110ce8f7a198f4037e788be5741a47d43f2316f15d7aeb6cf01e',
    phases: {
      setup: {
        poseSummaryKo: '래더 배럴의 선택된 가로대를 양손바닥으로 짚고 바닥에 두 발로 선 저작 적응 시작 배치입니다.',
        contactChangeKo: '양손바닥의 래더 가로대 접점과 양발 발끝·뒤꿈치의 바닥 접점 여섯 곳이 모두 고정 상태로 설정됩니다.',
        qualifications: qualifications('일반 지지면 서서 다리 슬라이드 원문을 래더 배럴 가로대 지지로 옮긴 저작 적응이며 배럴 곡면 접촉은 없습니다.'),
      },
      move: {
        poseSummaryKo: '몸통·양손·지지 다리는 고정한 채 선택한 다리의 발끝·뒤꿈치 패치가 바닥을 따라 뒤쪽(+x)으로 미끄러집니다.',
        contactChangeKo: '움직이는 발의 발끝·뒤꿈치 바닥 접점이 슬라이딩 상태로 바뀌고, 양손 가로대 접점과 지지 발 바닥 접점은 고정됩니다.',
        qualifications: qualifications('고정 골반에서 바닥 슬라이드가 닿도록 무릎 초기 굽힘과 두 링크 풀이를 사용한 저작 기하입니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 다리가 뒤쪽 바닥에 뻗은 저작 배치를 표시하며 상체와 골반은 수직 고정을 유지합니다.',
        contactChangeKo: '뒤로 간 발의 발끝·뒤꿈치는 바닥 슬라이딩 접점으로 남고, 양손 가로대 접점과 반대 발 바닥 고정 접점이 이어집니다.',
        qualifications: qualifications('발끝과 뒤꿈치가 동시에 바닥에 남는 설정은 저작 제약이며 원문의 정확한 발 자세나 유지 시간을 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '뒤로 미끄러졌던 같은 발이 바닥을 따라 지지 발 옆의 처음 자리로 돌아옵니다.',
        contactChangeKo: '돌아오는 동안 움직이는 발끝·뒤꿈치 접점은 슬라이딩 상태였다가 복귀 끝에 바닥 고정 상태로 돌아옵니다.',
        qualifications: qualifications('복귀 경로는 한쪽 다리의 저작 선형 구간이며 좌우 교대나 배럴 위 동작은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양손은 래더 가로대에, 양발은 나란히 바닥에 둔 처음의 선 자세 배치로 돌아옵니다.',
        contactChangeKo: '양손 가로대 접점과 양발 발끝·뒤꿈치 바닥 접점이 모두 고정 상태로 복원되어 끝납니다.',
        qualifications: qualifications('기구에서 손을 떼거나 이동하는 과정은 포함하지 않습니다. 실제 기구 고정 및 지지 안전성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'ladder-supported-side-leg-slide',
    expectedSourceFingerprint: '1ab9b95d96a418f4ded057dd367a3f92be6f9cd1247ab3c4ccc3c03dd2b0685e',
    phases: {
      setup: {
        poseSummaryKo: '래더 배럴의 선택된 가로대를 양손바닥으로 짚고 바닥에 두 발로 선 저작 적응 시작 배치입니다.',
        contactChangeKo: '양손바닥의 래더 가로대 접점과 양발 발끝·뒤꿈치의 바닥 접점 여섯 곳이 모두 고정 상태로 설정됩니다.',
        qualifications: qualifications('일반 지지면 서서 옆 슬라이드 원문을 래더 배럴 가로대 지지로 옮긴 저작 적응이며 배럴 몸통 접촉은 없습니다.'),
      },
      move: {
        poseSummaryKo: '몸통·양손·지지 다리는 고정한 채 선택한 다리의 발끝·뒤꿈치 패치가 바닥을 따라 바깥 옆쪽(±y)으로 미끄러집니다.',
        contactChangeKo: '움직이는 발의 발끝·뒤꿈치 바닥 접점이 슬라이딩 상태로 바뀌고, 양손 가로대 접점과 지지 발 바닥 접점은 고정됩니다.',
        qualifications: qualifications('발끝을 앞으로 둔 옆 슬라이드를 고정 골반과 두 링크 무릎 풀이로 표현한 저작 기하입니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 다리가 옆쪽 바닥으로 뻗은 저작 배치를 표시하며 상체와 지지 다리는 처음 위치를 유지합니다.',
        contactChangeKo: '옆으로 간 발의 발끝·뒤꿈치는 바닥 슬라이딩 접점으로 남고, 양손 가로대 접점과 반대 발 바닥 고정 접점이 이어집니다.',
        qualifications: qualifications('옆 슬라이드 거리와 정지 구간은 도해 표시 설정이며 실제 고관절 외전 범위나 유지 시간을 정하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '옆으로 미끄러졌던 같은 발이 바닥을 따라 지지 발 옆의 처음 자리로 돌아옵니다.',
        contactChangeKo: '돌아오는 동안 움직이는 발끝·뒤꿈치 접점은 슬라이딩 상태였다가 복귀 끝에 바닥 고정 상태로 돌아옵니다.',
        qualifications: qualifications('복귀는 한쪽 다리의 저작 구간이며 좌우 교대나 다리를 공중으로 드는 변형은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양손은 래더 가로대에, 양발은 나란히 바닥에 둔 처음의 선 자세 배치로 돌아옵니다.',
        contactChangeKo: '양손 가로대 접점과 양발 발끝·뒤꿈치 바닥 접점이 모두 고정 상태로 복원되어 끝납니다.',
        qualifications: qualifications('기구에서 물러나는 마무리 과정은 포함하지 않습니다. 실제 기구 지지 강도와 개인별 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'authoring-batch',
    variantId: 'chair-seated-bilateral-arm-raise-v1',
    expectedSourceFingerprint: '17ab99ccc38c0c65675ac483c475cc25a7dd8984255c6fbb18998754224a5a93',
    phases: {
      setup: {
        poseSummaryKo: '의자에 앉아 여섯 몸통 링크를 수직에 두고, 양팔은 몸통 옆으로 내려 둔 시작 배치입니다.',
        contactChangeKo: '양쪽 좌석과 양발 뒤꿈치·발끝의 바닥 저작 접점이 고정됩니다. 양손은 지지점으로 연결하지 않습니다.',
        qualifications: qualifications('의자에 앉는 과정은 포함하지 않습니다. 좌석·발 고정 접점과 팔 길이는 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '몸통과 다리는 고정한 채 양팔의 두 강체 링크가 앞·위로 함께 올라갑니다.',
        contactChangeKo: '양팔이 이동하는 동안 양쪽 좌석과 양발 뒤꿈치·발끝의 바닥 고정 접점을 유지합니다.',
        qualifications: qualifications('양팔의 회전 각도와 경로는 저작 기하이며 견갑골 회전·어깨 으쓱임·실제 가동 범위는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양팔을 위로 뻗은 저작 배치를 정지 구간으로 표시하고 몸통은 수직 배치를 유지합니다.',
        contactChangeKo: '좌석·양발 바닥 접점의 고정 설정이 이어지며 손에는 별도 지지 접점을 두지 않습니다.',
        qualifications: qualifications('정지 구간과 위팔·아래팔 높이는 도해 표시 설정입니다. 실제 유지 시간이나 권장 각도를 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '위로 뻗었던 양팔 링크가 같은 저작 경로를 따라 처음의 내린 자리로 돌아옵니다.',
        contactChangeKo: '복귀 동안에도 양쪽 좌석과 양발의 바닥 고정 접점 설정을 그대로 유지합니다.',
        qualifications: qualifications('복귀 속도와 경로는 저작 선택입니다. 호흡이나 팔 내리기 부하·횟수는 모델링하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '몸통은 수직에 두고 양팔을 몸통 옆으로 내린 처음의 의자 앉기 배치로 돌아옵니다.',
        contactChangeKo: '양쪽 좌석과 양발 뒤꿈치·발끝의 고정 접점 설정으로 끝나며 손 지지점은 추가하지 않습니다.',
        qualifications: qualifications('의자에서 일어나는 마무리 과정은 포함하지 않습니다. 이 종료 배치의 개인별 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'authoring-batch',
    variantId: 'chair-seated-overhead-sidebend-v1',
    expectedSourceFingerprint: '0f3d509dba7db8c79fc9e92f2c2054a579b221403a03048d9c920e79e116e2db',
    phases: {
      setup: {
        poseSummaryKo: '몸통은 앉은 중심에 있고, 기울일 방향의 반대쪽 팔은 이미 위에 놓여 있습니다.',
        contactChangeKo: '양쪽 좌석과 양발의 저작 접점이 유지됩니다. 아래 손은 의자 지지점으로 연결하지 않습니다.',
        qualifications: qualifications('앉기와 팔 올리기 과정은 포함하지 않은 시작 배치입니다. 위팔 배치와 좌석·발 고정은 저작 선택입니다.'),
      },
      move: {
        poseSummaryKo: '몸통의 여섯 링크가 선택한 쪽으로 굽으며, 반대쪽의 위로 뻗은 팔과 머리는 상부 몸통 방향을 따라갑니다.',
        contactChangeKo: '몸통이 기울어지는 동안 양쪽 좌석·발 접점은 고정하고, 아래 손은 자유롭게 이동하도록 그렸습니다.',
        qualifications: qualifications('몸통 링크는 분산된 굽힘을 그린 저작 근사이며 개별 척추·견갑골의 움직임은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '반대쪽 팔을 위에 둔 채 저작한 옆굽힘 배치를 표시합니다.',
        contactChangeKo: '좌석·발 접점의 고정 설정은 이어지고, 어느 손도 의자 접점으로 바뀌지 않습니다.',
        qualifications: qualifications('이 구간의 정지는 도해 표시 설정입니다. 실제로 유지할 시간이나 가동 범위를 정하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '몸통 링크가 앉은 중심으로 돌아오고, 반대쪽 팔은 위 배치를 유지하며 상부 몸통을 따라옵니다.',
        contactChangeKo: '돌아오는 동안 좌석·발 접점의 고정 설정을 유지합니다. 아래 손의 의자 접촉을 추가하지 않습니다.',
        qualifications: qualifications('복귀는 팔을 내리는 과정이 아닙니다. 팔 경로·몸통 굽힘 수치와 복귀 시간은 저작 선택입니다.'),
      },
      finish: {
        poseSummaryKo: '몸통은 처음 앉은 중심으로 돌아왔고, 반대쪽 팔은 여전히 위에 놓여 있습니다.',
        contactChangeKo: '처음의 좌석·발 접점 설정으로 끝나며, 손의 의자 지지는 표시하지 않습니다.',
        qualifications: qualifications('팔 내리기나 의자에서 일어나는 과정은 포함하지 않습니다. 종료는 이 도해의 처음 배치를 뜻합니다.'),
      },
    },
  },
  {
    family: 'authoring-batch',
    variantId: 'prone-forearm-chest-extension-v1',
    expectedSourceFingerprint: '1010511d1fc959d12a1c2c25151bd843a3e02b39ecf6aca4debc34407affbf95',
    phases: {
      setup: {
        poseSummaryKo: '양 팔뚝 지지를 둔 엎드림 배치이며, 머리와 가슴은 시작부터 이미 들린 상태로 그렸습니다.',
        contactChangeKo: '골반·양 앞발·팔꿈치·팔뚝·손의 저작 접점을 고정합니다. 머리 접점은 두지 않습니다.',
        qualifications: qualifications('머리를 바닥에 둔 휴식에서 올라오는 과정은 포함하지 않습니다. 복부의 면 접촉과 압력은 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '어깨가 고정 팔꿈치 둘레의 저작 호를 따라 올라가며, 몸통 링크와 머리 배치가 함께 바뀝니다.',
        contactChangeKo: '올라가는 동안 골반·앞발과 팔꿈치·팔뚝·손의 접점 고정 설정을 유지합니다.',
        qualifications: qualifications('어깨 호와 두 그룹의 몸통 링크는 길이를 유지하는 저작 기하입니다. 실제 척추·흉곽·견갑골 움직임은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '저작한 높이의 가슴과 머리 배치를 표시하고, 양 팔뚝은 처음 지지 위치에 둡니다.',
        contactChangeKo: '골반·앞발·팔꿈치·팔뚝·손의 고정 접점 설정이 이어집니다. 머리의 바닥 지지를 추가하지 않습니다.',
        qualifications: qualifications('정지 구간은 표시를 위한 저작 설정입니다. 실제 유지 시간·허리 부하·지지력을 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '어깨와 몸통 링크가 처음의 들린 배치로 돌아갑니다. 머리를 매트까지 내리는 과정은 그리지 않습니다.',
        contactChangeKo: '복귀 동안 골반·앞발·팔꿈치·팔뚝·손 접점의 고정 설정을 유지합니다.',
        qualifications: qualifications('복귀 끝도 머리와 가슴이 들린 시작 배치입니다. 복부 접촉 범위와 실제 허리 움직임은 미확인입니다.'),
      },
      finish: {
        poseSummaryKo: '머리와 가슴이 들린 처음의 팔뚝 지지 배치로 끝납니다.',
        contactChangeKo: '골반·앞발·팔꿈치·팔뚝·손의 접점 설정을 유지하며, 머리의 매트 접촉은 표시하지 않습니다.',
        qualifications: qualifications('머리를 내려 쉬거나 엎드림을 끝내는 과정은 포함하지 않습니다. 이 종료 배치의 개인별 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'articulated-pelvic-curl',
    expectedSourceFingerprint: 'e0f80bc25975cb426337b0f0b364909547980780cd84b4ad8d7e89fe21b72c71',
    phases: {
      setup: {
        poseSummaryKo: '무릎을 굽혀 누운 배치에 저작한 허리 곡선이 남아 있습니다.',
        contactChangeKo: '머리·상부 등·손·발 패치는 고정합니다. 모든 척추 패치가 매트에 닿는 배치는 아니며, 가운데 척추 패치 하나는 떨어져 있습니다.',
        qualifications: qualifications('초기 허리 곡선과 패치 위치는 저작 선택입니다. 실제 척추의 휴식 자세나 접촉 지도로 확인한 결과가 아닙니다.'),
      },
      move: {
        poseSummaryKo: '처음에는 허리 곡선을 줄이는 골반 말림을 표시하고, 이어서 저작 척추 링크가 차례로 올라갑니다.',
        contactChangeKo: '진행 중 척추·골반 패치의 매트 접촉 설정이 바뀝니다. 처음부터 모든 패치가 계속 떨어져 있거나 계속 닿아 있는 것은 아닙니다.',
        qualifications: qualifications('패치의 접촉·해제 순서와 비율은 저작 기하에서 정했습니다. 실제 척추 분절 순서나 압력은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '저작한 높이의 골반과 네 척추 링크를 표시합니다.',
        contactChangeKo: '척추·골반의 움직이는 패치는 매트에서 떨어진 배치이며, 머리·상부 등·손·발의 고정 패치는 유지합니다.',
        qualifications: qualifications('꼭대기 높이와 선 맞춤·정지 시간은 저작 선택입니다. 실제 유지 자세나 권장 수행 시간으로 검증하지 않았습니다.'),
      },
      return: {
        poseSummaryKo: '가슴 쪽 링크부터 내려오고, 마지막에는 처음의 저작 허리 곡선이 다시 나타납니다.',
        contactChangeKo: '내려오는 동안 척추·골반 패치의 접촉 설정이 바뀝니다. 복귀 끝에 모든 척추 패치가 매트 접촉으로 남는 것은 아닙니다.',
        qualifications: qualifications('복귀 중 접촉 변화는 저작한 링크와 패치의 결과입니다. 실제 척추가 바닥에 닿는 순서나 지지 압력은 미확인입니다.'),
      },
      finish: {
        poseSummaryKo: '처음의 무릎 굽힌 누운 배치와 저작 허리 곡선으로 돌아옵니다.',
        contactChangeKo: '머리·상부 등·손·발 패치는 고정하고, 가운데 척추 패치 하나는 다시 떨어진 배치입니다. 모든 척추가 매트에 닿았다는 뜻은 아닙니다.',
        qualifications: qualifications('끝 배치는 이 도해의 처음 곡선을 복원합니다. 실제 허리 이완 자세·접촉 압력·개인별 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'supine-reach',
    variantId: 'supine-single-leg-reach-v1',
    expectedSourceFingerprint: 'df537ca2a12eaed8f5bbe2fb6734d08622c44ca3c285ffa49220f0e1363236c7',
    phases: {
      setup: {
        poseSummaryKo: '머리와 가슴이 이미 들려 있고 양다리는 테이블톱으로 굽힌 저작 배치입니다. 양손은 뻗지 않는 반대 무릎 쪽에 둡니다.',
        contactChangeKo: '골반·아래 몸통의 저작 매트 패치만 고정합니다. 양손은 반대 무릎 패치에 두며 머리·가슴·양발의 매트 지지는 표시하지 않습니다.',
        qualifications: qualifications('가슴을 들거나 두 다리를 올려 이 배치에 들어오는 과정은 없습니다. 이 상태를 유지할 실제 시간을 정하지 않습니다.'),
      },
      move: {
        poseSummaryKo: '선택한 다리의 두 링크가 펴지며 대각선으로 뻗어갑니다. 반대 다리와 몸통은 저작한 시작 배치에 남습니다.',
        contactChangeKo: '양손은 굽힌 반대 무릎에 둔 채 이동하지 않습니다. 발의 선은 선택한 발목의 저작 경로이며 어느 발도 매트 접점으로 바뀌지 않습니다.',
        qualifications: qualifications('다리 각도와 중간 경로·몸통 고정은 저작 선택입니다. 원문의 연속 좌우 교대나 손 옮기기는 이 구간에 포함하지 않습니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 다리는 길게 뻗은 저작 배치이며, 반대 무릎은 굽혀 둡니다. 머리와 가슴은 여전히 들려 있습니다.',
        contactChangeKo: '골반·아래 몸통의 매트 패치와 양손·반대 무릎 패치를 유지합니다. 머리·가슴·양발에 새 매트 지지를 추가하지 않습니다.',
        qualifications: qualifications('정지 표시는 도해 설정입니다. 실제로 유지할 자세·시간·가동 범위나 지지 압력을 검증한 지침이 아닙니다.'),
      },
      return: {
        poseSummaryKo: '뻗었던 같은 다리만 굽혀 테이블톱으로 돌아옵니다. 반대 다리로 역할을 바꾸는 장면은 아닙니다.',
        contactChangeKo: '양손은 처음의 반대 무릎에 둡니다. 돌아오는 발도 매트에 내려놓지 않으며 머리·가슴의 들린 배치가 이어집니다.',
        qualifications: qualifications('경로의 화살표는 이 저작 복귀 구간의 방향입니다. 실측 경로나 원문 교대 동작 전체를 재현했다는 뜻이 아닙니다.'),
      },
      finish: {
        poseSummaryKo: '처음의 가슴 든 테이블톱 배치로 돌아옵니다. 머리·가슴·양발이 여전히 들려 있습니다.',
        contactChangeKo: '골반·아래 몸통의 저작 매트 패치와 양손·반대 무릎 패치가 그대로입니다. 머리나 발을 내려 쉬는 지지는 추가하지 않습니다.',
        qualifications: qualifications('이 종료는 한쪽 저작 구간의 닫힘입니다. 몸을 내려 쉬는 과정이나 다른 쪽으로 교대하는 전환을 표현하지 않습니다.'),
      },
    },
  },
  {
    family: 'authoring-batch',
    variantId: 'prone-single-straight-leg-extension-v1',
    expectedSourceFingerprint: 'faa16aa76044d8a5ca26f6fa58ea86cb1596bb332d3e0b77c5c656c56e4f4558',
    phases: {
      setup: {
        poseSummaryKo: '엎드린 몸통과 이마·양손·양다리를 매트에 둔 시작 배치입니다.',
        contactChangeKo: '골반·상부 몸통·이마·양손·양 앞발의 저작 매트 접점이 모두 고정 상태로 설정됩니다.',
        qualifications: qualifications('엎드려 눕는 준비 과정은 포함하지 않습니다. 복부·골반의 실제 면 접촉 압력은 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '선택한 쪽의 편 다리 두 강체 링크가 고관절 둘레로 매트에서 올라가고, 반대 다리와 몸통은 고정됩니다.',
        contactChangeKo: '움직이는 쪽 앞발의 매트 접점이 해제 상태로 바뀌고, 반대쪽 앞발·골반·상부 몸통·이마·양손 접점은 고정 설정을 유지합니다.',
        qualifications: qualifications('다리 회전 각도와 몸통 고정은 저작 기하이며 실제 고관절 신전 범위·골반 기울기·요추 부하는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '선택한 편 다리가 매트에서 들린 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '움직이는 쪽 앞발 접점은 해제된 채로 남고, 반대쪽 앞발·골반·상부 몸통·이마·양손의 고정 매트 접점이 이어집니다.',
        qualifications: qualifications('정지 구간의 다리 높이와 시간은 도해 표시 설정입니다. 실제 유지 시간이나 권장 높이를 뜻하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '들렸던 같은 쪽의 편 다리가 매트 쪽으로 내려오며 처음 배치로 돌아갑니다.',
        contactChangeKo: '내려오는 동안 움직이는 앞발 접점은 해제 상태였다가 복귀 끝에서 매트 접촉으로 돌아오며, 나머지 고정 접점은 유지됩니다.',
        qualifications: qualifications('복귀 경로는 한쪽 다리의 저작 구간이며 좌우 다리 교대나 휴식 전환은 포함하지 않습니다.'),
      },
      finish: {
        poseSummaryKo: '양다리와 이마·양손을 모두 매트에 둔 처음의 엎드림 배치로 돌아옵니다.',
        contactChangeKo: '해제되었던 앞발 접점이 다시 고정 상태로 복원되어 골반·상부 몸통·이마·양손·양 앞발 고정 설정으로 끝납니다.',
        qualifications: qualifications('엎드린 자세에서 일어나는 과정은 포함하지 않습니다. 이 종료 배치의 개인별 적합성과 안전성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'supine-chest-lift',
    expectedSourceFingerprint: '5873b98e64eb59a5bad029f7035e8538740c6f2bf3d033ac50cd2975ea3e0ef0',
    phases: {
      setup: {
        poseSummaryKo: '무릎을 굽혀 누운 배치에서 양손 패치를 이미 머리 뒤통수 패치에 둔 시작 자세입니다.',
        contactChangeKo: '골반·허리·양발 고정 접점과 양손-머리 유지 접점이 설정되며, 양쪽 견갑 하각 접점은 매트에 닿은 상태입니다.',
        qualifications: qualifications('양팔을 들어 머리 뒤로 가져가는 과정은 포함하지 않습니다. 손깍지 형태나 머리 지지 압력은 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '위쪽 척추 구간과 머리가 앞·위로 굽으며 양팔이 뒤통수 패치를 따라 함께 올라갑니다.',
        contactChangeKo: '올라가는 동안 양쪽 견갑 하각 접점이 매트에서 떨어짐 상태로 바뀌고, 골반·허리·양발 고정 접점과 양손-머리 유지 접점은 지속됩니다.',
        qualifications: qualifications('다섯 척추 구간 각도와 견갑 하각 높이는 저작 기하이며 실제 경추·흉추 분절 움직임과 복부 부하는 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양손을 머리 뒤에 둔 채 상체와 머리가 들린 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '양쪽 견갑 하각 접점은 매트에서 떨어진 상태이며, 골반·허리·양발의 고정 매트 접점과 양손-머리 유지 접점이 이어집니다.',
        qualifications: qualifications('정지 구간의 상체 높이와 시간은 도해 표시 설정입니다. 실제 유지 시간이나 목·복부 안전성을 검증한 지침이 아닙니다.'),
      },
      return: {
        poseSummaryKo: '들렸던 상체와 머리 링크가 내려오며 처음의 무릎 굽힌 누운 배치로 돌아갑니다.',
        contactChangeKo: '내려오는 동안 견갑 하각 접점은 떨어진 상태였다가 복귀 끝에 매트 접촉으로 돌아오며, 양손-머리 유지 접점은 그대로입니다.',
        qualifications: qualifications('복귀 중에도 양손을 머리 뒤에서 내리지 않습니다. 실제 척추가 매트에 닿는 순서와 압력은 미확인입니다.'),
      },
      finish: {
        poseSummaryKo: '양손을 뒤통수 패치에 둔 처음의 무릎 굽힌 누운 배치로 돌아옵니다.',
        contactChangeKo: '양쪽 견갑 하각이 다시 매트에 닿은 상태로 복원되며 골반·허리·양발 고정 접점과 양손-머리 유지 접점으로 끝납니다.',
        qualifications: qualifications('양팔을 매트로 내리거나 다리를 펴는 마무리 과정은 포함하지 않습니다. 실제 휴식 자세 적합성은 미확인입니다.'),
      },
    },
  },
  {
    family: 'existing-proposal',
    variantId: 'floor-seated-band-row',
    expectedSourceFingerprint: '91ca6c27ab0bcd56da061598d1b536c5c5c50c03465e52c16348346626ef0e7a',
    phases: {
      setup: {
        poseSummaryKo: '바닥에 앉아 두 다리를 앞으로 뻗고, 발바닥 패치를 지나는 밴드 양끝을 양손에 둔 양팔 편 시작 배치입니다.',
        contactChangeKo: '양쪽 좌골 지지와 양 뒤꿈치의 바닥 고정 접점, 양 발바닥과 양손의 밴드 연결 접점이 설정됩니다.',
        qualifications: qualifications('밴드를 발에 걸거나 앉는 준비 과정은 포함하지 않습니다. 밴드 장력·초기 길이·무릎 잠김 여부는 모델링하지 않았습니다.'),
      },
      move: {
        poseSummaryKo: '몸통과 뻗은 다리는 고정한 채 양팔꿈치가 굽혀지며 양손이 몸통 쪽으로 이동합니다.',
        contactChangeKo: '좌골·뒤꿈치의 바닥 고정 접점은 유지되고, 양손의 밴드 끝 접점이 뒤로 이동하며 발바닥과 손을 잇는 밴드 선분 길이가 바뀝니다.',
        qualifications: qualifications('팔꿈치 궤적은 수직 평면의 두 원 교점으로 계산한 저작 기하이며 실제 견갑골 후인이나 밴드 저항력은 미확인입니다.'),
      },
      turn: {
        poseSummaryKo: '양팔꿈치를 굽혀 양손이 몸통 가까이에 온 저작 배치를 정지 구간으로 표시합니다.',
        contactChangeKo: '좌골·뒤꿈치 바닥 고정 접점과 발바닥·양손의 밴드 연결 설정이 그대로 유지됩니다.',
        qualifications: qualifications('정지 구간의 손 위치와 시간은 도해 표시 설정입니다. 실제 당기는 힘이나 유지 시간을 정하지 않습니다.'),
      },
      return: {
        poseSummaryKo: '굽혔던 양팔이 앞으로 펴지며 양손과 밴드 끝이 처음 자리로 돌아갑니다.',
        contactChangeKo: '복귀 동안에도 좌골·뒤꿈치의 바닥 고정 접점과 발바닥·손의 밴드 연결 접점 설정을 유지합니다.',
        qualifications: qualifications('복귀 경로는 저작 선형 보간이며 밴드 복원력이나 신장성 수축 부하는 계산하지 않았습니다.'),
      },
      finish: {
        poseSummaryKo: '양팔을 앞으로 편 처음의 바닥 앉기 배치로 돌아옵니다.',
        contactChangeKo: '처음의 좌골·뒤꿈치 바닥 고정 접점과 발바닥·양손 밴드 연결 상태로 끝납니다.',
        qualifications: qualifications('밴드를 내려놓거나 다리를 굽히는 과정은 포함하지 않습니다. 실제 기구·밴드 안전 설정은 미확인입니다.'),
      },
    },
  },
];
