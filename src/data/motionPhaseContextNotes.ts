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
 * Narrow annotations of four inspected authored models, not new exercise/source facts.
 * Evidence: motionAuthoringBatch.ts seatedPose/pronePose, pelvicCurl.ts and supineReach.ts.
 * Preserve the expected fingerprint until the changed model has been inspected again.
 */
export const MOTION_PHASE_CONTEXT_NOTES: readonly MotionPhaseContextNotes[] = [
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
];
