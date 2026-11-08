import { HONEST_DEFAULT_TRUTHFULNESS_FLAGS } from './trackAMatEvidence';
import type { MotionEvidenceReviewRecord } from './types';

export const TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [
    {
      exerciseId: 'original-mat-rib-breath',
      track: 'track-c-extended-mat',
      rankInTrack: 1,
      nameKo: '누워서 호흡 관찰',
      nameEn: 'Supine Breath Awareness',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-rib-breath',
        nameKo: '누워서 호흡 관찰',
        nameEn: 'Supine Breath Awareness',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-rib-breath-leaflet-2023',
          title: 'Pilates: exercises and principles (Centering & Lateral Breathing in Supine)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 교육 리플릿으로 수파인 중립 자세 호흡 및 센터링 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-supine-neutral-breath-pdf',
          title: 'Exercises for Back Pain (Supine Neutral Pelvis & Deep Core Breathing)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 재활 교육 자료로 무릎을 세운 수파인 자세에서의 복횡근·흉곽 호흡 조절 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 굽혀 세우고 양발을 골반 너비 평행으로 매트 바닥에 내려놓는다. 후두부·흉추·천골을 매트에 편안하게 지지하고 양손은 하부 갈비뼈 측면 또는 매트 옆에 가볍게 둔다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 정렬 유지',
            '양측 고관절·슬관절 굴곡 및 발바닥 수평 지지',
            '견갑대 하강 및 상부 승모근 긴장 완화',
          ],
          supportPointsKo: [
            '후두부 바닥',
            '양측 견갑골 및 흉추 후면',
            '천골(Sacrum) 및 양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '매트 바닥면 전체를 척추와 골반 중립 인지를 위한 촉각 피드백 지지면으로 활용한다.',
          breathingKo:
            '자연스러운 초기 호흡 리듬을 관찰하며 코로 부드럽게 들쉴 준비를 한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '코로 깊게 들쉬며 어깨가 귀 쪽으로 들리지 않도록 유지한 채 하부 흉곽의 좌우 측면과 등 뒤쪽이 매트 바닥으로 넓어지는 3차원 흉식 호흡 확장을 경험한다.',
          jointDirectionsKo: [
            '늑추관절 및 흉곽 측면·후면 확장',
            '경추 신전(턱 들림) 및 요추 과전만(허리 들뜸) 억제',
            '골반 중립 및 하지 정렬 고정 유지',
          ],
          supportPointsKo: [
            '후두부',
            '매트 바닥에 넓게 밀착되는 후방 흉곽 및 견갑골',
            '천골 및 양발 발바닥',
          ],
          apparatusInteractionKo:
            '들쉬는 동안 등 뒤 갈비뼈가 매트 표면을 부드럽게 누르는 압력 변화를 인지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 흉곽을 양옆과 등 뒤로 넓히고 목·어깨 보조호흡근 과긴장을 방지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '입으로 길고 부드럽게 내쉬며 확장되었던 양측 갈비뼈가 중심선과 골반 방향으로 모아지고 아랫배 심부가 편평하게 연결되는 중립 안정화 상태로 돌아온다.',
          jointDirectionsKo: [
            '흉곽 하강 및 내늑간근·복횡근 협응 수축',
            '골반 후방경사(Imprint) 없이 천골 중립 유지',
            '쇄골 너비 및 뒷목 길이 유지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 하부 흉추',
            '천골 및 양발 발바닥',
          ],
          apparatusInteractionKo:
            '내쉬는 끝 구간에서도 꼬리뼈가 말리지 않도록 천골의 매트 접촉점을 일정하게 유지한다.',
          breathingKo:
            '입으로 천천히 내쉬며(Exhale) 흉곽을 닫고 심부 코어와 골반저근의 부드러운 연결을 완성한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['횡격막', '복횡근', '내늑간근 및 외늑간근'],
        synergistMusclesKo: ['내복사근', '외복사근', '골반저근'],
        stabilizerMusclesKo: ['다열근', '심부경추굴곡근', '하부승모근'],
        lengthenedStructuresKo: ['흉곽 측면 근막', '후방 흉요근막', '상부승모근 및 사각근(긴장 이완)'],
        evidenceBasisKo:
          'NHS 병원 필라테스 호흡·센터링 교육 자료에 근거하여 수파인 무릎 굴곡 자세에서 횡격막 하강과 복횡근·늑간근의 동시 조절이 요추-골반 중립 안정화에 기여함을 정성적으로 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '들쉴 때 어깨가 귀 쪽으로 솟거나 목 앞쪽 근육이 과긴장됨',
          biomechanicalCauseKo: '하부 흉곽 가동성 부족을 상부 승모근·흉쇄유돌근 등 보조호흡근으로 보상함',
          cueCorrectionKo: '쇄골을 옆으로 넓게 두고 양손으로 아래 갈비뼈 옆면이 부풀어 오르는 움직임에 집중하도록 안내한다.',
        },
        {
          compensationKo: '들쉴 때 허리가 매트에서 과하게 들뜨거나 내쉴 때 꼬리뼈를 말아 올림',
          biomechanicalCauseKo: '흉곽 확장과 요추 신전을 분리하지 못하거나 복직근을 과수축하여 골반 중립이 무너짐',
          cueCorrectionKo: '천골 무게를 매트에 일정하게 두고 갈비뼈 뒷면만 부드럽게 매트에 닿도록 유도한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '경추 전만 소실 또는 거북목으로 누웠을 때 턱이 천장으로 들리는 경우',
          modificationKo: '후두부 아래에 얇은 수건이나 낮은 패드를 받쳐 경추 중립과 시선 수직 정렬을 확보한다.',
        },
        {
          conditionOrCautionKo: '요추 불편감으로 무릎 세운 자세에서도 허리 긴장이 남는 경우',
          modificationKo: '무릎 아래에 볼스터나 쿠션을 받치거나 호흡 범위를 줄여 편안한 중립 범위를 탐색한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '2D 도해 관절 이동량 대비 실제 흉곽 호흡 변위',
          catalogOrDraftStateKo:
            '2D rig(mat-supine-rib-breath-isolated)는 시각적 가독성을 위해 흉추·어깨 좌표를 미세 이동시켜 호흡을 표현한다.',
          evidenceStandardKo:
            '실제 수파인 호흡 관찰은 사지 위치 변화 없이 흉곽 전후·측방 직경 변화가 중심이 된다.',
          conservativeResolutionKo:
            '도해 화살표는 흉곽 확장 방향을 나타내는 교육용 기호로만 해석하고 과장된 척추 신전으로 오해하지 않도록 안내한다.',
        },
        {
          aspect: '연속 모션 초안 유무 및 검증 상태',
          catalogOrDraftStateKo:
            '현재 MOTION_PATTERN_REFERENCES에 연결된 별도 연속 모션 초안은 없으며 2D 단계 도해만 존재한다.',
          evidenceStandardKo:
            '호흡 인식 동작은 정밀 흉곽 메쉬 변형이 필요하므로 단순 2D 스켈레톤만으로 해부학적 검증 완료로 간주할 수 없다.',
          conservativeResolutionKo:
            'canonicalMotionReady 및 expertVerificationCompleted를 모두 false로 유지한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'mat-supine-rib-breath-isolated',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-rib-breath',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 무릎을 세운 수파인 호흡 관찰을 설명한다.',
          },
          {
            category: 'fact',
            targetId: 'mat-supine-rib-breath-isolated',
            summaryKo:
              '전용 2D rig(mat-supine-rib-breath-isolated)가 배정되어 수파인 무릎 굴곡 자세와 흉곽 호흡 가이드를 표시하며, 연결된 연속 모션 초안(targetPatternVariantIds)은 없다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'mat-supine-rib-breath-isolated',
            summaryKo:
              '2D 스켈레톤 특성상 늑골 케이지의 좌우 측면 확장을 선분 높이 변화로 단순화하여 표현하고 있으므로 텍스트 큐를 통한 보완이 필요하다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'mat-supine-rib-breath-isolated',
            summaryKo:
              '흉곽 3차원 확장 비율 및 호흡 주기 타이밍에 대한 외부 임상·해부학 전문가 최종 감수는 완료되지 않았다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'mat-supine-rib-breath-isolated 도해에서 요추 과신전으로 오인되지 않도록 흉곽 측면 확장 보조 라벨을 유지할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '본 레코드는 공개 병원 리플릿 근거를 바탕으로 작성된 교육용 요약이며, 3D 흉곽 볼륨 계측이나 전문가 임상 감수를 거치지 않았습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-pelvic-clock',
      track: 'track-c-extended-mat',
      rankInTrack: 2,
      nameKo: '골반 시계',
      nameEn: 'Pelvic Clock',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['flexion', 'extension'],
      exercise: {
        id: 'original-mat-pelvic-clock',
        nameKo: '골반 시계',
        nameEn: 'Pelvic Clock',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['flexion', 'extension'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-pelvic-tilt-clock-leaflet-2023',
          title: 'Pilates: exercises and principles (Pelvic Tilt & Neutral Pelvis Finding)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 리플릿으로 골반 전·후방 기울임과 중립 탐색 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-pelvic-tilt-pdf',
          title: 'Exercises for Back Pain (Pelvic Tilt in Supine)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 검증된 공개 병원 자료로 수파인 자세에서 골반 경사 조절과 요추 분절 이완 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 세우고 발바닥을 골반 너비 평행으로 매트에 지지한다. 배꼽(12시)과 치골(6시), 좌우 골반뼈(3시·9시)가 수평을 이루는 골반 시계 중립 위치를 설정한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수평 중립 정렬',
            '양측 고관절·슬관절 굴곡 및 두 무릎 간격 일정 유지',
            '견갑골과 상완 후면 매트 안착',
          ],
          supportPointsKo: [
            '후두부 및 상부 흉추',
            '천골 중앙(중립 지지점)',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '매트 바닥에 닿는 천골의 접촉점이 중앙에 놓이도록 준비하고 발바닥으로 과도하게 매트를 밀지 않는다.',
          breathingKo:
            '코로 편안하게 들쉬며(Inhale) 복부와 고관절 전면의 불필요한 긴장을 내려놓는다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 배꼽(12시) 방향으로 골반을 부드럽게 후방경사시켰다가, 들쉬는 숨에 치골(6시) 및 시계 방향 원호를 따라 작은 범위로 골반 기울임을 탐색하며 요추와 천골의 미세한 구름 움직임을 만든다.',
          jointDirectionsKo: [
            '골반 후방경사(요추 완만한 굴곡) 및 전방경사(요추 완만한 신전) 교대 탐색',
            '천장관절 및 고관절 내 미세 회전·굴곡 협응',
            '두 무릎이 좌우로 흔들리지 않도록 대퇴골 수직 정렬 유지',
          ],
          supportPointsKo: [
            '후두부 및 양측 견갑골',
            '천골 상부·하부·측면으로 부드럽게 구르는 매트 접촉면',
            '양발 발바닥 삼각 지지점',
          ],
          apparatusInteractionKo:
            '엉덩이를 매트에서 번쩍 들어 올리지 않고 천골이 매트 표면 위에서 시계 숫자판을 따라 굴러가듯 접촉점을 이동시킨다.',
          breathingKo:
            '내쉬며(Exhale) 후방경사(12시)를 유도하고 들쉬며(Inhale) 6시 및 원호 탐색을 부드럽게 이어간다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '시계 방향과 반시계 방향의 작은 탐색을 마친 뒤 12시와 6시의 중간 지점인 수평 중립 골반(Neutral Pelvis) 위치로 천천히 돌아와 척추 길이를 정리한다.',
          jointDirectionsKo: [
            '골반 경사에서 수평 중립 정렬로 복귀',
            '요추 자연 만곡 및 흉곽-골반 수평 정렬 회복',
            '하지 및 견갑대 안정 유지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골',
            '천골 중앙 및 양발 발바닥',
          ],
          apparatusInteractionKo:
            '천골 중앙이 다시 매트에 고르게 닿는 것을 확인하며 움직임을 멈춘다.',
          breathingKo:
            '편안하게 내쉬며(Exhale) 골반 중립과 심부 복부의 가벼운 지지를 확인한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복횡근', '내복사근 및 외복사근', '다열근'],
        synergistMusclesKo: ['복직근(미세 조절)', '장요근', '골반저근'],
        stabilizerMusclesKo: ['내전근군(무릎 정렬 유지)', '심부경추굴곡근', '하부승모근'],
        lengthenedStructuresKo: ['요추 신전근막(후방경사 구간)', '전방 복벽 근막(전방경사 구간)'],
        evidenceBasisKo:
          'NHS 요통 재활 및 필라테스 기초 리플릿의 Pelvic Tilt/Pelvic Clock 원리에 따라 대둔근 과수축 없이 복벽과 요추 심부 근육으로 골반 경사를 미세 조절하는 기전을 반영함.',
      },
      commonCompensations: [
        {
          compensationKo: '골반만 굴리지 않고 발로 매트를 세게 밀어 엉덩이를 브리지처럼 들어 올림',
          biomechanicalCauseKo: '심부 복근 대신 대둔근과 햄스트링을 과도하게 동원함',
          cueCorrectionKo: '천골이 매트에서 떨어지지 않게 두고 꼬리뼈와 허리 사이로 작은 구슬만 굴린다고 상상하도록 지도한다.',
        },
        {
          compensationKo: '골반 시계 원을 그릴 때 양 무릎이 좌우로 같이 쓰러짐',
          biomechanicalCauseKo: '골반과 대퇴골의 분리 조절이 부족하여 다리 무게로 골반을 흔듦',
          cueCorrectionKo: '양 무릎은 천장을 향한 채 고정하고 골반 그릇만 매트 위에서 작게 움직이도록 안내한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '급성 요추 통증으로 전방경사(6시) 구간에서 허리 불편감이 나타나는 경우',
          modificationKo: '6시 방향 과신전을 생략하고 중립에서 12시(후방경사) 사이의 작은 앞뒤 틸팅만 수행한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '골반 시계 원호(좌우 3시·9시)와 시상면 2D 도해의 표현 한계',
          catalogOrDraftStateKo:
            '2D rig(supine-pelvic-clock-isolated)는 측면(Sagittal) 뷰로 작성되어 전후 경사 위주로 표현된다.',
          evidenceStandardKo:
            'Pelvic Clock은 시상면(12시-6시)뿐 아니라 횡단면·관상면의 미세한 천골 원호 구름을 포함한다.',
          conservativeResolutionKo:
            '측면 2D 도해는 12시-6시 틸팅 이해용 보조 자료로 설명하고, 시계 방향 원호는 큐잉 텍스트로 보완한다.',
        },
        {
          aspect: '전문가 검수 및 연속 모션 초안 여부',
          catalogOrDraftStateKo:
            '별도 연속 모션 초안은 없으며 2D 단계 도해만 연결되어 있다.',
          evidenceStandardKo:
            '미세 골반 경사 각도는 개인 체형에 따라 다르므로 정량 각도 단정을 피해야 한다.',
          conservativeResolutionKo:
            '모든 수치 각도 주장 없이 편안한 범위 내 탐색으로 기술하고 진실성 플래그를 보수적으로 유지한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'supine-pelvic-clock-isolated',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-pelvic-clock',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: supine, spinalPlanes: [flexion, extension]으로 정의하며 골반 시계 방향 기울임 탐색을 안내한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-pelvic-clock-isolated',
            summaryKo:
              '2D rig(supine-pelvic-clock-isolated)는 천골을 매트에 둔 채 요추·골반의 미세 기울임 변화를 표현하며 브리지 거상과 분리되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-pelvic-clock-isolated',
            summaryKo:
              '측면 2D 투영에서는 3시·9시 좌우 기울임이 직접 보이지 않으므로 상단 안내 텍스트와 함께 읽어야 정확하다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-pelvic-clock-isolated',
            summaryKo:
              '골반 시계 원호 궤적에 대한 3D 모션 캡처나 외부 전문가 해부학 감수는 미완료 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-pelvic-clock-isolated 도해에 천골 매트 접촉 유지(브리지 거상 아님) 안내와 시계 방향 원호 아이콘 보강을 검토할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '공개 병원 리플릿의 골반 틸트 원리를 반영한 정성적 가이드이며, 측면 2D 도해는 좌우 원호(3시·9시)를 직접 입체 표현하지 못합니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-ankle-reach',
      track: 'track-c-extended-mat',
      rankInTrack: 3,
      nameKo: '서서 발목 움직임',
      nameEn: 'Standing Ankle Reach',
      apparatus: 'mat',
      bodyPosition: 'standing',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-ankle-reach',
        nameKo: '서서 발목 움직임',
        nameEn: 'Standing Ankle Reach',
        apparatus: 'mat',
        bodyPosition: 'standing',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'nhs-inform-standing-heel-raises-ankle',
          title: 'Exercises for Calf and Ankle Problems (Standing Heel Raises with Support)',
          publisher: 'NHS inform (Scottish National Health Information Service)',
          directUrl:
            'https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-calf-and-achilles-problems/',
          sourceCategory: 'public-health-institution',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(supported-heel-raise)에 등록된 공공 보건 교육 자료로 고정 지지 입위 뒤꿈치 거상 및 감속 하강 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-standing-alignment-leaflet-2023',
          title: 'Pilates: exercises and principles (Standing Posture & Balance Alignment)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 입위 중립 척추·골반 정렬 및 발바닥 체중 분배 원칙 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 또는 평탄한 바닥 위에 두 발을 골반 너비 평행으로 두고 똑바로 선다(Standing). 필요 시 고정된 지지대에 손을 가볍게 얹고 정수리부터 발뒤꿈치까지 수직 중립 정렬을 세운다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립 정렬',
            '양측 고관절·슬관절 중립 신전(무릎 과신전 잠금 방지)',
            '거골하관절 중립 및 발바닥 삼각 지지 균등 배분',
          ],
          supportPointsKo: [
            '양발 발바닥 전체(엄지발볼·새끼발볼·뒤꿈치)',
            '필요 시 고정 지지대에 가볍게 얹은 손끝',
          ],
          apparatusInteractionKo:
            '매트 바닥의 미끄러짐 여부를 확인하고 발가락이 움켜쥐지 않도록 넓게 펴서 지면을 지지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 정수리를 천장 방향으로 길게 세우고 복부 중심을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 첫 번째와 두 번째 발허리뼈(발볼 안쪽과 중앙) 지지점을 유지하며 양쪽 발뒤꿈치를 천천히 들어 올려 족저굴곡(Heel Raise) 정점에 도달한다.',
          jointDirectionsKo: [
            '양측 족관절 족저굴곡(Ankle Plantarflexion) 및 중족지절관절 신전 지지',
            '발목이 바깥쪽(내번)으로 꺾이지 않도록 경골-거골 수직 정렬 유지',
            '골반 전방 쏠림 없이 체간 수직 축 신장 유지',
          ],
          supportPointsKo: [
            '양발 전족부(엄지발볼부터 새끼발볼까지의 가로 아치)',
            '균형 보조 시 고정 지지대 위 양손',
          ],
          apparatusInteractionKo:
            '전족부로 매트 바닥을 수직 아래로 밀어 정수리가 천장 쪽으로 곧게 올라가도록 한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 뒤꿈치를 들어 올리고 정점에서 균형을 유지하며 짧게 호흡한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 종아리 근육의 원심성(Eccentric) 조절을 유지하며 양쪽 발뒤꿈치를 바닥에 소리 없이 천천히 내려놓아 시작 자세로 복귀한다.',
          jointDirectionsKo: [
            '양측 족관절 원심성 배측굴곡 복귀',
            '슬관절 및 고관절 수직 정렬 유지',
            '척추·골반 중립 유지',
          ],
          supportPointsKo: [
            '전족부를 거쳐 매트에 다시 안착하는 양발 뒤꿈치 전체',
            '필요 시 고정 지지대 위 양손',
          ],
          apparatusInteractionKo:
            '뒤꿈치가 매트에 쿵 떨어지지 않도록 마지막 접촉 순간까지 속도를 제어한다.',
          breathingKo:
            '코로 들쉬거나 부드럽게 내쉬며(Inhale/Exhale) 시작 입위 정렬로 돌아온다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['비복근', '가자미근'],
        synergistMusclesKo: ['후경골근', '장비골근 및 단비골근', '장무지굴근'],
        stabilizerMusclesKo: ['복횡근', '중둔근 및 대둔근', '대퇴사두근'],
        lengthenedStructuresKo: ['족저근막(중족지절관절 신전 구간)', '하퇴 후면 근막(원심성 하강 구간)'],
        evidenceBasisKo:
          'NHS inform의 입위 카프 레이즈 재활 가이드 및 필라테스 입위 정렬 원칙에 따라 전족부 지지 균형과 하퇴 삼두근의 구심성·원심성 수축 조절을 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '뒤꿈치를 들 때 발목이 새끼발가락 쪽으로 돌아가며 바깥쪽으로 꺾임',
          biomechanicalCauseKo: '장비골근과 후경골근의 협응 부족으로 거골하관절 내번 보상이 발생함',
          cueCorrectionKo: '엄지발볼과 두 번째 발볼에 체중을 고르게 두고 양쪽 복사뼈 사이 거리를 일정하게 유지하도록 안내한다.',
        },
        {
          compensationKo: '위로 올라가는 대신 골반과 허리를 앞으로 내밀며 뒤꿈치를 듦',
          biomechanicalCauseKo: '코어 및 둔근 안정화 없이 체중 이동으로 높이를 만들려 함',
          cueCorrectionKo: '정수리가 천장과 수직으로 가까워지도록 복부와 둔부를 가볍게 연결하게 한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '발목 불안정성이나 균형 저하로 입위 수행 시 흔들림이 큰 경우',
          modificationKo: '벽이나 고정된 의자 등받이를 양손으로 지지하고 뒤꿈치를 드는 높이를 낮추거나 앉은 자세 발목 움직임으로 대체한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '공유 2D rig와 연속 초안의 지지 환경 차이',
          catalogOrDraftStateKo:
            '2D rig(standing-ankle-calf-upper-reach)는 매트 입위 및 상지 리치 동작들과 공유되며, 연속 초안(supported-heel-raise)은 일반 고정 의자 등받이 지지를 포함한다.',
          evidenceStandardKo:
            '카탈로그는 "필요하면 고정된 지지를 잡고"라고 명시하여 무지지 매트 입위와 고정 지지 입위를 모두 허용한다.',
          conservativeResolutionKo:
            '의자 지지 여부는 난이도·균형 보조 옵션임을 명시하고 단일 표준 자세로 단정하지 않는다.',
        },
        {
          aspect: '2D rig 상지 움직임 혼합 여부',
          catalogOrDraftStateKo:
            '공유 2D rig(standing-ankle-calf-upper-reach)는 상지 리치 동작과 아키타입을 공유한다.',
          evidenceStandardKo:
            '서서 발목 움직임(Standing Ankle Reach)의 핵심은 족관절 족저·배측굴곡 조절이다.',
          conservativeResolutionKo:
            '도해 해석 시 발뒤꿈치(heel/ankle) 수직 이동과 체간 수직 정렬을 우선 기준으로 삼는다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'standing-ankle-calf-upper-reach',
        targetPatternVariantIds: ['supported-heel-raise'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-ankle-reach',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 필요 시 고정 지지를 잡고 발뒤꿈치를 올렸다 내리는 동작이다.',
          },
          {
            category: 'fact',
            targetId: 'supported-heel-raise',
            summaryKo:
              '연속 초안(supported-heel-raise)은 일반 고정 의자 등받이를 짚고 수행하는 뒤꿈치 들기 패턴을 제공한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'standing-ankle-calf-upper-reach',
            summaryKo:
              '공유 2D rig(standing-ankle-calf-upper-reach)가 바렐 지지 암 리치 등과 공유되므로 발목 단독 움직임과 상지 리치 변형을 구분해 읽어야 한다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supported-heel-raise',
            summaryKo:
              '연속 초안의 일반 고정 의자 치수 및 뒤꿈치 거상 높이는 저작 가정치이며 전문가 임상 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'standing-ankle-calf-upper-reach에서 순수 발목 카프레이즈(original-mat-ankle-reach)와 상지 리치 동작의 팔 궤적 표기를 분리할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '공공 보건 가이드에 기반한 입위 발목 조절 요약이며, 공유 2D 도해 및 의자 지지 초안은 전문가 최종 검증 전 참고 자료입니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-seated-arm-reach',
      track: 'track-c-extended-mat',
      rankInTrack: 4,
      nameKo: '앉아서 암 리치',
      nameEn: 'Seated Arm Reach',
      apparatus: 'mat',
      bodyPosition: 'seated',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-seated-arm-reach',
        nameKo: '앉아서 암 리치',
        nameEn: 'Seated Arm Reach',
        apparatus: 'mat',
        bodyPosition: 'seated',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-seated-shoulder-alignment-2023',
          title: 'Pilates: exercises and principles (Seated Posture & Scapular Setting)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 중립 척추 및 견갑대 안정화 하의 상지 거상 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-shoulder-scapular-control-pdf',
          title: 'Exercises for Back Pain & Postural Upper Quarter Control',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 검증된 공개 병원 자료로 체간 중립 유지 하의 상지 리치 조절 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 양반다리 또는 두 다리를 편하게 두고 앉아(Seated) 양쪽 좌골에 체중을 균등하게 싣는다. 정수리를 천장으로 길게 세워 척추 중립을 만들고 양팔은 몸통 옆이나 무릎 위에 편안히 준비한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립 정렬',
            '양측 견갑골 중립 안착(쇄골 넓게 유지)',
            '고관절·슬관절은 골반이 뒤로 말리지 않는 편안한 좌위 굴곡 유지',
          ],
          supportPointsKo: [
            '양측 좌골결절(Sit-bones)',
            '매트에 닿은 둔부 및 하지 측면/발',
          ],
          apparatusInteractionKo:
            '매트 바닥을 좌골로 수직 아래로 밀어내어 척추가 무너지지 않는 앉은 지지 기반을 확보한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 척추 축 신장(Axial Elongation)을 만들고 복부를 가볍게 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 어깨가 귀 쪽으로 으쓱 올라가지 않도록 하부 승모근과 전거근을 연결하며 양팔을 가슴 앞쪽(또는 편한 전방 사선 높이)으로 길게 뻗어 상완골과 견갑골의 부드러운 리듬을 관찰한다.',
          jointDirectionsKo: [
            '양측 견관절 굴곡(Shoulder Flexion) 및 주관절 완만한 신전',
            '견갑골의 자연스러운 상방회전·전인 조절(견갑 거상 억제)',
            '팔을 뻗을 때 흉곽 들뜸이나 요추 과신전 없이 체간 수직 중립 유지',
          ],
          supportPointsKo: [
            '매트 위 양측 좌골결절',
            '매트에 지지된 양측 하지',
          ],
          apparatusInteractionKo:
            '양팔이 앞으로 나아가는 무게중심 변화에 맞서 좌골을 매트 바닥에 무겁게 뿌리내린다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 갈비뼈 아랫부분을 닫고 양팔을 앞으로 길게 리치한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬며 척추 키가 작아지지 않도록 정수리 높이를 유지한 채 양팔을 천천히 시작 위치로 회수한다.',
          jointDirectionsKo: [
            '양측 견관절 원심성 신전 복귀',
            '견갑골 중립 복원 및 흉추·요추 수직 정렬 유지',
          ],
          supportPointsKo: [
            '양측 좌골결절',
            '매트에 지지된 하지',
          ],
          apparatusInteractionKo:
            '팔이 돌아올 때 몸통이 뒤로 기대지 않도록 매트 좌골 지지를 끝까지 유지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 쇄골을 넓히고 시작 자세로 부드럽게 돌아온다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['전면삼각근', '전거근'],
        synergistMusclesKo: ['중부 및 하부승모근', '상완삼두근(팔 길이 유지)'],
        stabilizerMusclesKo: ['복횡근', '척추기립근 및 다열근', '장요근(좌위 골반 수직 유지)'],
        lengthenedStructuresKo: ['광배근 및 후면 견관절낭(전방 리치 구간)'],
        evidenceBasisKo:
          '공개 병원 필라테스 교육 자료의 좌위 척추 중립 및 견갑-상완 리듬(Scapulohumeral Rhythm) 안정화 원칙에 따라 상부 승모근 보상 없는 전방 암 리치를 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '팔을 앞으로 뻗을 때 어깨가 귀 쪽으로 솟아오름',
          biomechanicalCauseKo: '하부 승모근·전거근 대신 상부 승모근과 견갑거근이 과활성화됨',
          cueCorrectionKo: '겨드랑이 아래를 살짝 조이며 날개뼈 아래 끝을 뒷주머니 쪽으로 낮춘 뒤 팔을 뻗도록 큐잉한다.',
        },
        {
          compensationKo: '햄스트링이나 고관절이 타이트해 처음부터 골반이 뒤로 말리고 등이 굽음',
          biomechanicalCauseKo: '좌위에서 골반 전방 수직 정렬을 유지할 고관절 굴곡 가동성이 부족함',
          cueCorrectionKo: '엉덩이 아래에 요가 블록이나 접은 매트를 받쳐 좌골이 수직으로 서도록 지지 높이를 조정한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '어깨 충돌 불편감이 있거나 좌위 유지가 힘든 경우',
          modificationKo: '팔 높이를 어깨 아래 낮은 범위로 제한하고 벽이나 등받이에 등을 대고 앉아 수행한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '공유 2D rig와 관련 패턴 초안의 기구 차이',
          catalogOrDraftStateKo:
            '2D rig(seated-row-arm-arc)는 밴드/박스 로잉 동작과 공유되며, 연결된 패턴 초안(chair-seated-bilateral-arm-raise-v1)은 일반 의자 좌위(ordinary-chair)로 작성되어 있다.',
          evidenceStandardKo:
            'original-mat-seated-arm-reach는 매트 좌위(apparatus: mat)에서 소도구 없이 양팔을 앞으로 뻗고 돌아오는 동작이다.',
          conservativeResolutionKo:
            'chair-seated-bilateral-arm-raise-v1은 상지 거상 패턴 비교용 참고 도해로만 표시하고 매트 좌위 정본으로 취급하지 않는다.',
        },
        {
          aspect: '로잉(당기기) vs 리치(뻗기) 강조 구간 차이',
          catalogOrDraftStateKo:
            '공유 2D rig(seated-row-arm-arc)는 팔을 뒤로 당기는 로잉 동작들과 동일한 좌표를 사용한다.',
          evidenceStandardKo:
            '앉아서 암 리치는 전방 뻗기(Reach)와 견갑 전인-후인 조절이 주된 초점이다.',
          conservativeResolutionKo:
            '도해 팀에 전방 리치 전용 포즈 분리를 권고하고 텍스트 단계 설명을 우선 기준으로 제공한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'seated-row-arm-arc',
        targetPatternVariantIds: ['chair-seated-bilateral-arm-raise-v1'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-seated-arm-reach',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 매트에 편하게 앉아 양팔을 앞으로 뻗고 돌아오는 동작이다.',
          },
          {
            category: 'fact',
            targetId: 'chair-seated-bilateral-arm-raise-v1',
            summaryKo:
              '연결된 연속 초안(chair-seated-bilateral-arm-raise-v1)은 매트 바닥이 아닌 일반 고정 의자(ordinary-chair)에 앉은 양팔 들기 변형으로 작성되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'seated-row-arm-arc',
            summaryKo:
              '공유 2D rig(seated-row-arm-arc)가 밴드 로우·박스 로우와 함께 쓰이면서 전방 리치와 후방 로잉의 팔 궤적 구분이 모호해졌다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'chair-seated-bilateral-arm-raise-v1',
            summaryKo:
              '연속 초안의 일반 의자 좌위 설정은 매트 좌위(original-mat-seated-arm-reach)와 지지 기구가 다르며 전문가 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'seated-row-arm-arc에서 매트 좌위 전방 암 리치 전용 2D 포즈를 분리하여 팔이 몸통 옆에서 전방으로 뻗어 나가는 궤적을 명확히 표시할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '병원 필라테스 좌위 상지 조절 자료에 기반한 요약이며, 연결된 의자 좌위 초안 및 공유 2D 도해는 정식 매트 도해로 검증되지 않았습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-band-row',
      track: 'track-c-extended-mat',
      rankInTrack: 5,
      nameKo: '밴드 시티드 로우',
      nameEn: 'Seated Band Row',
      apparatus: 'mat',
      bodyPosition: 'seated',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-band-row',
        nameKo: '밴드 시티드 로우',
        nameEn: 'Seated Band Row',
        apparatus: 'mat',
        bodyPosition: 'seated',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'ruh-nhs-seated-theraband-row-posture-pdf',
          title: 'Physiotherapy Upper Back & Scapular Retraction Band Row Exercises',
          publisher: 'Royal United Hospitals Bath NHS Foundation Trust',
          directUrl:
            'https://www.ruh.nhs.uk/patients/patient_information/PHY091_Gluteal_Tendinopathy.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(floor-seated-band-row) 및 공개 재활 자료와 연계하여 탄성밴드 고정 확인 후 팔꿈치 후방 견인 및 원심성 복귀 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-seated-scapular-control-2023',
          title: 'Pilates: exercises and principles (Neutral Spine & Scapular Stability)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 자료로 좌위 척추 중립 유지 및 견갑골 내전·하강 정렬 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 두 다리를 뻗거나 무릎을 살짝 굽혀 앉고(Seated), 발바닥 중앙에 탄력 밴드(Theraband)를 안전하게 걸어 양손으로 밴드 끝을 잡는다. 좌골 위에 척추를 수직으로 세우고 양팔을 앞으로 뻗어 초기 장력을 준비한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립 정렬',
            '양측 견관절 굴곡·주관절 신전 및 손목 중립(꺾임 방지)',
            '발목 약간 배측굴곡 유지로 발바닥 중앙에 밴드 고정',
          ],
          supportPointsKo: [
            '양측 좌골결절',
            '매트에 닿은 양측 뒤꿈치 및 하지 후면',
            '발바닥 아치 중앙(밴드 고정 앵커)',
          ],
          apparatusInteractionKo:
            '밴드의 찢어짐 등 손상 여부와 발바닥 중앙 걸림 상태를 먼저 점검하여 얼굴 쪽으로 튕기지 않게 안전을 확보한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 정수리를 천장 쪽으로 길게 세우고 쇄골을 넓힌다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 어깨가 귀로 올라가지 않게 유지하면서 날개뼈를 등 중앙으로 부드럽게 모으고 팔꿈치를 몸통 옆을 스치듯 뒤로 당겨 밴드 저항을 이겨낸다.',
          jointDirectionsKo: [
            '양측 견갑골 후인(Retraction) 및 하강 유지',
            '양측 견관절 신전 및 주관절 굴곡(손목 중립 일직선 유지)',
            '당기는 순간 흉곽이 앞으로 튀어나오거나 몸통이 뒤로 젖혀지지 않도록 체간 중립 고정',
          ],
          supportPointsKo: [
            '양측 좌골결절(매트 수직 지지)',
            '양측 뒤꿈치 및 밴드를 고정한 발바닥',
          ],
          apparatusInteractionKo:
            '발바닥으로 밴드 앵커를 단단히 밀어 지지하고 양손과 팔꿈치로 밴드 탄성 저항을 수평 후방으로 당긴다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 코어를 조여 몸통을 고정하고 팔꿈치를 뒤로 보내 정점에서 잠시 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 밴드 탄성에 손이 급격히 끌려가지 않도록 속도를 제어하며 양팔을 천천히 앞쪽 시작 위치로 뻗어 돌아온다.',
          jointDirectionsKo: [
            '양측 견관절 원심성 굴곡 및 주관절 신전 복귀',
            '견갑골의 조절된 전인 복귀(어깨 말림이나 등 굽음 억제)',
            '척추 수직 중립 불변',
          ],
          supportPointsKo: [
            '양측 좌골결절',
            '양측 뒤꿈치 및 발바닥 밴드 고정점',
          ],
          apparatusInteractionKo:
            '밴드가 완전히 느슨해지기 직전까지 일정한 장력을 유지하며 천천히 되돌아온다.',
          breathingKo:
            '코로 들쉬며(Inhale) 척추 높이를 유지한 채 시작 자세로 복귀한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['능형근', '중부 및 하부승모근', '광배근', '후면삼각근'],
        synergistMusclesKo: ['상완이두근', '상완근', '완요골근'],
        stabilizerMusclesKo: ['복횡근', '척추기립근 및 다열근', '전경골근(발목 배측굴곡 밴드 고정)'],
        lengthenedStructuresKo: ['대흉근 및 소흉근(견갑 후인 정점 구간)', '햄스트링(장좌위 유지 시)'],
        evidenceBasisKo:
          '탄력밴드 시티드 로우 재활 원리 및 필라테스 상체 정렬 원칙에 따라 발바닥 밴드 앵커 안전 확인, 견갑골 후인-하강 선행, 원심성 복귀 제어를 반영함.',
      },
      commonCompensations: [
        {
          compensationKo: '밴드를 당길 때 상체를 뒤로 젖히며 허리 힘으로 당김',
          biomechanicalCauseKo: '등 근육 대신 척추기립근과 체중 이동으로 밴드 장력을 보상함',
          cueCorrectionKo: '좌골 위에 몸통을 기둥처럼 고정하고 갈비뼈 앞쪽을 닫은 채 팔꿈치만 뒤로 보내도록 안내한다.',
        },
        {
          compensationKo: '손목을 안쪽으로 강하게 꺾어 밴드를 잡아당김',
          biomechanicalCauseKo: '견갑골 후인 대신 수근굴곡근을 과사용함',
          cueCorrectionKo: '손등과 전완이 일직선을 이루도록 유지하고 팔꿈치 끝으로 뒤쪽 벽을 찌르듯 당기게 한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '햄스트링 단축으로 다리를 펴고 앉을 때 골반이 뒤로 말리는 경우',
          modificationKo: '무릎을 살짝 굽혀 뒤꿈치를 매트에 대거나 엉덩이 아래에 요가 블록·쿠션을 받쳐 중립 척추를 먼저 확보한다.',
        },
        {
          conditionOrCautionKo: '밴드 미끄러짐 위험',
          modificationKo: '발끝에만 걸지 말고 발바닥 아치 한가운데에 넓게 감싸 걸어 얼굴 쪽 튕김 사고를 예방한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '2D rig 및 연속 초안과의 정렬 일치성',
          catalogOrDraftStateKo:
            '2D rig(seated-row-arm-arc)와 연속 초안(floor-seated-band-row) 모두 좌위에서 팔꿈치를 뒤로 당기는 로잉 궤적을 표현한다.',
          evidenceStandardKo:
            '카탈로그는 props: [theraband]를 명시하며 밴드 고정과 손상 확인을 핵심 안전 수칙으로 둔다.',
          conservativeResolutionKo:
            '연속 초안(floor-seated-band-row)은 저작된 패턴 참고용 도해로 표시하고 실제 수업 전 밴드 상태와 발 고정은 강사가 직접 점검하도록 명시한다.',
        },
        {
          aspect: '밴드 탄성 계수 및 장력 정량화 불가',
          catalogOrDraftStateKo:
            '카탈로그는 "탄력 밴드 · 종류 미지정"으로 정의되어 있다.',
          evidenceStandardKo:
            '밴드 색상·두께·파지 길이에 따라 실제 저항이 달라지므로 고정 수치 부하를 주장할 수 없다.',
          conservativeResolutionKo:
            '밴드 없이 팔 경로를 먼저 연습하는 쉬운 단계부터 개인 맞춤 장력을 선택하도록 안내한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'seated-row-arm-arc',
        targetPatternVariantIds: ['floor-seated-band-row'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-band-row',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: seated, spinalPlanes: [neutral], props: [theraband]로 정의하며 밴드 고정 확인 후 팔꿈치를 뒤로 당겼다 돌아오는 동작이다.',
          },
          {
            category: 'fact',
            targetId: 'floor-seated-band-row',
            summaryKo:
              '연속 초안(floor-seated-band-row)은 매트 바닥 장좌위에서 발에 건 밴드를 양손으로 당기는 궤적을 제공하며 2D rig(seated-row-arm-arc)와 방향성이 부합한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'seated-row-arm-arc',
            summaryKo:
              '2D rig(seated-row-arm-arc)는 소도구 없는 암 리치 및 리포머 박스 로우와도 공유되므로 밴드 앵커 라인 표시는 연속 초안과 함께 참조하는 것이 명확하다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'floor-seated-band-row',
            summaryKo:
              '연속 초안의 밴드 장력 및 견갑골 이동량은 저작 모델이며 외부 전문가 해부학 감수는 미완료 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'seated-row-arm-arc를 original-mat-band-row에 렌더링할 때 발바닥에서 양손으로 이어지는 탄력밴드 안전 앵커 가이드를 명확히 유지할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '재활 및 필라테스 좌위 밴드 로우 원리를 정리한 교육 자료이며, 밴드 저항 수치나 전문가 최종 모션 검수는 포함하지 않습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-forearm-plank',
      track: 'track-c-extended-mat',
      rankInTrack: 6,
      nameKo: '무릎 지지 플랭크',
      nameEn: 'Kneeling Forearm Plank',
      apparatus: 'mat',
      bodyPosition: 'kneeling',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-forearm-plank',
        nameKo: '무릎 지지 플랭크',
        nameEn: 'Kneeling Forearm Plank',
        apparatus: 'mat',
        bodyPosition: 'kneeling',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-kneeling-plank-scapular-2023',
          title: 'Pilates: exercises and principles (Scapular Stability & Core Control in Prone/Kneeling Support)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 리플릿으로 전완·무릎 지지 시 견갑골 안정화 및 요추 중립 유지 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-core-endurance-support-pdf',
          title: 'Exercises for Back Pain (Trunk Stability & Supported Prone Hold)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 검증된 공개 병원 자료로 허리 과신전 없는 체간 등척성 지지 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에서 양쪽 팔꿈치를 어깨 바로 아래에 어깨너비로 두고 전완(팔뚝)과 양 무릎을 바닥에 대어 네발기기 변형 준비 자세(Kneeling Forearm Prep)를 취한다.',
          jointDirectionsKo: [
            '양측 주관절 굴곡 및 어깨 수직 아래 팔꿈치 정렬',
            '경추·흉추·요추 중립 및 시선은 양 전완 사이 바닥 유지',
            '고관절 및 슬관절 굴곡 지지',
          ],
          supportPointsKo: [
            '양측 전완(팔꿈치부터 손목까지) 및 손바닥',
            '양측 무릎 상단(슬개골 바로 위 원위 대퇴 전면부) 및 정강이',
          ],
          apparatusInteractionKo:
            '매트 쿠션감을 확인하고 무릎이 예민한 경우 무릎 아래에 도톰한 패드를 덧대어 지지면을 준비한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 전완으로 매트를 밀어 날개뼈 사이를 평평하게 채운다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 무릎 위치를 뒤로 조금 보내거나 골반을 앞으로 이동시켜 정수리-어깨-갈비뼈-골반-무릎이 사선 일직선을 이루는 무릎 지지 포암 플랭크(Kneeling Forearm Plank) 자세를 유지하며 짧고 고른 호흡을 이어간다.',
          jointDirectionsKo: [
            '견갑골 전인-후인 중립(전거근 활성으로 날개뼈 익상 방지)',
            '골반 가벼운 후방경사 연결 및 요추 중립 유지(허리 처짐 억제)',
            '고관절 사선 신전 및 무릎 굴곡 지지 유지',
          ],
          supportPointsKo: [
            '매트를 수직으로 밀어내는 양측 전완 전체',
            '매트에 지지된 양측 무릎 및 하퇴 전면',
          ],
          apparatusInteractionKo:
            '전완으로 매트 바닥을 밀어내는 반작용과 복부 심부 지지를 연결해 중력에 의한 체간 하강을 막는다.',
          breathingKo:
            '숨을 참지 않고 코로 짧게 들쉬고 입으로 내쉬며(Exhale) 갈비뼈와 골반 사이 복벽 텐션을 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '어깨나 허리에 부담이 생기기 전에 골반을 뒤쪽 발뒤꿈치 방향으로 부드럽게 물려 레스트 포지션(Rest Position) 또는 시작 준비 자세로 내려와 휴식한다.',
          jointDirectionsKo: [
            '고관절·슬관절 굴곡으로 체중을 뒤로 이동',
            '견갑대 및 척추 후면 긴장 이완',
          ],
          supportPointsKo: [
            '양측 무릎 및 정강이',
            '매트 위에 편안히 내려놓은 양팔과 이마',
          ],
          apparatusInteractionKo:
            '매트 위에서 상체 체중 부하를 완전히 덜어내고 손목·어깨·허리의 긴장을 해소한다.',
          breathingKo:
            '등 뒤 갈비뼈로 깊게 들쉬고 길게 내쉬며 호흡을 정리한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복횡근', '복직근', '전거근'],
        synergistMusclesKo: ['내복사근 및 외복사근', '대둔근', '광배근'],
        stabilizerMusclesKo: ['심부경추굴곡근', '회전근개(견관절 안정화)', '다열근'],
        lengthenedStructuresKo: ['고관절 굴곡근 전면(사선 신전 구간)', '흉추 후면 근막(레스트 포지션 복귀 구간)'],
        evidenceBasisKo:
          '공개 병원 필라테스 가이드의 전완·무릎 지지 플랭크 원리에 따라 짧은 지렛대(Kneeling Lever)를 활용해 요추 과전만 없이 전거근과 복횡근의 등척성 협응을 유도함을 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '날개뼈 사이가 바닥 쪽으로 푹 꺼지며 어깨에 체중이 매달림',
          biomechanicalCauseKo: '전거근 활성 부족으로 견갑골 과도한 내전·익상이 발생함',
          cueCorrectionKo: '양쪽 팔뚝으로 매트를 바닥 아래로 밀어내어 등 윗부분을 넓고 평평하게 채우도록 안내한다.',
        },
        {
          compensationKo: '배가 바닥 쪽으로 처지며 허리(요추)가 꺾이거나 고개가 바닥으로 떨어짐',
          biomechanicalCauseKo: '복횡근·둔근 지지 약화 및 심부경추굴곡근 지구력 저하',
          cueCorrectionKo: '치골을 배꼽 쪽으로 살짝 끌어당기고 뒷목을 등 라인과 일직선으로 유지하게 한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '어깨 충돌 불편감이나 요추 부담이 느껴지는 경우',
          modificationKo: '즉시 동작을 멈추고 골반을 뒤로 보내 네발기기 자세에서 몸통 지지만 먼저 연습한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '공유 2D rig의 지지 형태(손바닥·발끝 플랭크 vs 전완·무릎 플랭크) 불일치',
          catalogOrDraftStateKo:
            '2D rig(plank-long-stretch-chair-pike)는 손바닥(wrist/hand)과 발끝(ankle/toe)으로 지지하는 풀 플랭크(리포머 롱 스트레치) 좌표를 공유한다.',
          evidenceStandardKo:
            'original-mat-forearm-plank는 팔꿈치(전완)와 무릎으로 지지하는 Kneeling Forearm Plank이다.',
          conservativeResolutionKo:
            '공유 2D rig의 손바닥·발끝 지지는 아키타입 공유 한계임을 명시하고, 실제 수행은 반드시 카탈로그 정의대로 팔꿈치와 무릎 지지로 안내한다.',
        },
        {
          aspect: '연속 모션 초안 유무',
          catalogOrDraftStateKo:
            '현재 연결된 연속 모션 초안(targetPatternVariantIds)은 없다.',
          evidenceStandardKo:
            '전완·무릎 접지면을 정확히 표현하는 별도 도해 검증이 완료되지 않았다.',
          conservativeResolutionKo:
            '도해 팀에 전완·무릎 지지 전용 2D rig 분리를 권고하고 ready 플래그를 false로 유지한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'plank-long-stretch-chair-pike',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-forearm-plank',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: kneeling, spinalPlanes: [neutral]로 정의하며 팔꿈치와 무릎으로 지지하는 무릎 지지 플랭크를 설명한다.',
          },
          {
            category: 'fact',
            targetId: 'plank-long-stretch-chair-pike',
            summaryKo:
              '그러나 공유 2D rig(plank-long-stretch-chair-pike)는 팔을 펴고 발끝으로 서는 풀 플랭크/롱 스트레치 자세로 그려져 있어 전완(팔꿈치) 및 무릎 접지와 시각적으로 다르다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'plank-long-stretch-chair-pike',
            summaryKo:
              '플랭크 블록 동작들을 단일 아키타입으로 묶으면서 Kneeling Forearm Plank의 핵심인 짧은 지렛대(전완·무릎 지지)가 도해에 반영되지 않았다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'plank-long-stretch-chair-pike',
            summaryKo:
              '2D rig의 손바닥·발끝 지지는 original-mat-forearm-plank의 전완·무릎 지지 정의와 불일치(mismatched)하며 전문가 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'plank-long-stretch-chair-pike에서 무릎 지지 포암 플랭크 전용 2D rig를 분리하여 elbow-wrist와 knee가 매트 바닥에 닿도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '병원 필라테스 가이드에 기반한 전완·무릎 플랭크 요약이며, 현재 공유 2D 도해는 풀 플랭크 형태를 재사용하고 있어 지지점 수정이 필요합니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-swimming-prep',
      track: 'track-c-extended-mat',
      rankInTrack: 7,
      nameKo: '스위밍 준비',
      nameEn: 'Swimming Preparation',
      apparatus: 'mat',
      bodyPosition: 'prone',
      spinalPlanes: ['neutral'],
      exercise: {
        id: 'original-mat-swimming-prep',
        nameKo: '스위밍 준비',
        nameEn: 'Swimming Preparation',
        apparatus: 'mat',
        bodyPosition: 'prone',
        spinalPlanes: ['neutral'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-prone-swimming-prep-2023',
          title: 'Pilates: exercises and principles (Swimming Level 1 / Prone Limb Reach)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 엎드린 자세에서 몸통 흔들림 없이 사지를 길게 뻗는 Swimming 준비 단계 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-prone-hip-extension-pdf',
          title: 'Exercises for Back Pain (Prone Leg Extension & Trunk Stability)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 검증된 공개 병원 자료로 엎드린 자세에서 요추 과신전 없이 다리를 길게 들어 올리는 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 엎드린 자세(Prone)에서 양팔을 머리 앞쪽으로 길게 뻗고 양다리도 골반 너비로 뒤로 길게 뻗는다. 이마(또는 코끝)는 매트 가까이 두고 치골을 매트에 부드럽게 밀착하여 요추 중립을 세팅한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 정렬(턱 들림 방지)',
            '양측 견관절 굴곡(머리 위 매트 지지) 및 견갑골 하강',
            '양측 고관절·슬관절 신전 및 발등 매트 지지',
          ],
          supportPointsKo: [
            '전방 흉곽, 복부 및 치골(Pubic Symphysis)',
            '매트 바닥에 놓인 양팔 전완·손바닥',
            '양측 대퇴 전면 및 발등',
          ],
          apparatusInteractionKo:
            '매트 바닥에 양쪽 골반 앞뼈(ASIS)와 치골이 균등하게 닿아 있는지 확인한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 손끝과 발끝이 서로 반대 방향으로 길어지듯 축 신장을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 배꼽을 등 쪽으로 부드럽게 당겨 허리를 보호하면서, 팔 또는 다리 하나(숙련도에 따라 반대쪽 팔과 다리)를 높이 들기보다 벽 쪽으로 길게 뻗어 매트에서 살짝 띄우고 몸통이 좌우로 흔들리지 않게 유지한다.',
          jointDirectionsKo: [
            '가동 측 고관절 신전(슬관절은 구부리지 않고 길게 신전 유지) 또는 견관절 굴곡 거상',
            '골반 좌우 회전(Rolling) 및 요추 과전만 억제',
            '경추 중립 유지(시선은 매트 바닥 유지)',
          ],
          supportPointsKo: [
            '매트에 균등하게 밀착된 양측 ASIS 및 치골 삼각 지지점',
            '비거상 측 상지·하지의 매트 지지면',
          ],
          apparatusInteractionKo:
            '사지 하나가 매트에서 가벼워질 때 반대쪽 지지 사지와 골반 앞면이 매트 위에서 회전하지 않도록 대칭 압력을 유지한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 지지를 유지한 채 사지를 길게 뻗어 올린다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬며 뻗어냈던 길이를 그대로 유지한 채 팔 또는 다리를 매트 바닥에 소리 없이 내려놓고 반대쪽 교대 반복을 준비한다.',
          jointDirectionsKo: [
            '가동 측 고관절 또는 견관절 원심성 하강 복귀',
            '척추 및 골반 중립 유지',
          ],
          supportPointsKo: [
            '전방 흉곽 및 치골',
            '매트에 다시 안착한 양팔과 양다리 전체',
          ],
          apparatusInteractionKo:
            '사지를 내려놓을 때도 복부 긴장을 갑자기 풀지 않고 매트에 부드럽게 접지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 중심을 재정비하고 다음 교대 리치를 이어간다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['대둔근', '척추기립근 및 다열근', '하부승모근 및 후면/전면 삼각근(상지 리치 시)'],
        synergistMusclesKo: ['햄스트링', '광배근(후면 사선 슬링 연결)'],
        stabilizerMusclesKo: ['복횡근', '내복사근 및 외복사근(골반 회전 억제)', '심부경추굴곡근'],
        lengthenedStructuresKo: ['장요근 및 고관절 전면 관절낭(고관절 신전 구간)'],
        evidenceBasisKo:
          'NHS 필라테스 리플릿(Swimming Level 1) 및 요통 재활 자료에 따라 높이보다 사지 축 신장(Length over Height)과 골반 수평 고정을 우선하는 후면 사슬 조절 원리를 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '다리를 높이 들기 위해 무릎을 접거나 골반 한쪽이 매트에서 들림',
          biomechanicalCauseKo: '대둔근 대신 햄스트링 단독 수축 및 요추 과신전·골반 회전으로 보상함',
          cueCorrectionKo: '양쪽 골반 앞뼈를 매트에 붙이고 무릎을 펴서 발끝을 뒤쪽 벽으로 길게 뻗어내도록 큐잉한다.',
        },
        {
          compensationKo: '팔을 들 때 고개를 뒤로 젖히고 어깨가 귀로 올라감',
          biomechanicalCauseKo: '경추 신전근과 상부 승모근 과긴장',
          cueCorrectionKo: '이마 아래에 작은 수건을 두어 뒷목을 길게 유지하고 날개뼈를 먼저 끌어내린 뒤 팔을 뻗게 한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '사지를 공중으로 띄울 때 요추 압박감이 발생하는 경우',
          modificationKo: '팔 또는 다리를 공중으로 들지 않고 매트 바닥을 따라 멀리 미끄러뜨리는 슬라이드(easier layer)로 범위를 낮춘다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '공유 2D rig(양팔 후방 스윕)와 연속 초안(단일 하지 거상) 차이',
          catalogOrDraftStateKo:
            '공유 2D rig(prone-swan-pulling-straps-swimming)는 양팔을 뒤로 당기는 Pulling Straps 궤적을 함께 그리며, 연속 초안(prone-single-straight-leg-extension-v1)은 한쪽 다리만 신전 거상한다.',
          evidenceStandardKo:
            '카탈로그는 "팔 또는 다리를 하나씩 길게 뻗으며"(단일 사지 교대 리치)를 기본으로 하고 반대 팔·다리 동시 리치를 심화(harder)로 둔다.',
          conservativeResolutionKo:
            '연속 초안(prone-single-straight-leg-extension-v1)은 하지 리치 부분 패턴으로만 참고하고, 공유 2D rig의 양팔 후방 스윕은 Pulling Straps 공유 아키타입 한계로 명시한다.',
        },
        {
          aspect: '편측 교대(Unilateral) 시퀀스 표현',
          catalogOrDraftStateKo:
            '카탈로그는 isUnilateral: true로 좌우 교대 수행을 정의한다.',
          evidenceStandardKo:
            '단일 정지 도해만으로는 좌우 교대 시 몸통 회전 억제 과정을 완전히 보여주기 어렵다.',
          conservativeResolutionKo:
            '단계를 시작·리치 정점·복귀로 나누어 골반 수평 지지 기준을 텍스트로 명확히 보완한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'prone-swan-pulling-straps-swimming',
        targetPatternVariantIds: ['prone-single-straight-leg-extension-v1'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-swimming-prep',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: prone, spinalPlanes: [neutral]로 정의하며 팔 또는 다리를 하나씩 길게 뻗는 스위밍 준비 동작이다.',
          },
          {
            category: 'fact',
            targetId: 'prone-single-straight-leg-extension-v1',
            summaryKo:
              '연결된 연속 초안(prone-single-straight-leg-extension-v1)은 엎드린 자세에서 이마를 지지하고 한쪽 다리를 길게 들어 올리는 하지 신전 패턴을 표현한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '공유 2D rig(prone-swan-pulling-straps-swimming)가 리포머 풀링 스트랩과 합쳐져 있어 middle 단계에서 손이 골반 뒤로 이동하는 것은 스위밍 준비의 전방 리치와 다르다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '2D rig의 양팔 후방 스윕은 스위밍 준비의 전방 팔·후방 다리 리치 궤적과 일치하지 않으며 전문가 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'prone-swan-pulling-straps-swimming에서 스위밍 준비 전용 2D 포즈를 분리하여 양팔이 머리 앞쪽에 머문 상태에서 사지 리치가 표현되도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '병원 필라테스 리플릿에 기반한 스위밍 준비 요약이며, 공유 2D 도해의 팔 후방 궤적은 풀링 스트랩과 공유된 한계가 있습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'original-mat-mermaid',
      track: 'track-c-extended-mat',
      rankInTrack: 8,
      nameKo: '매트 머메이드',
      nameEn: 'Mat Mermaid',
      apparatus: 'mat',
      bodyPosition: 'seated',
      spinalPlanes: ['lateral'],
      exercise: {
        id: 'original-mat-mermaid',
        nameKo: '매트 머메이드',
        nameEn: 'Mat Mermaid',
        apparatus: 'mat',
        bodyPosition: 'seated',
        spinalPlanes: ['lateral'],
      },
      sources: [
        {
          sourceId: 'merrithew-mat-side-bend-mermaid-2025',
          title: 'Exercise of the Month: Side Bend / Seated Lateral Flexion Principles',
          publisher: 'Merrithew Official Educational Blog',
          directUrl:
            'https://www.merrithew.com/blog/post/2025-01-27/exercise-of-the-month-side-bend-with-the-flex-band',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 verifiedReferences.ts(mv-05)에 등록된 공식 교육 자료로 좌위 골반 고정 하의 척추 측굴(Lateral Flexion) 및 늑간 확장 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-spine-mobility-leaflet-2023',
          title: 'Pilates: exercises and principles (Spinal Lateral Mobility & Breathing)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 측면 흉곽 호흡과 척추 가동성 원칙 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 양반다리 또는 편안한 인어(Z-sit) 자세로 앉아(Seated) 양쪽 좌골이 가능한 한 고르게 바닥을 향하도록 둔다. 한 손은 몸통 옆 매트 바닥을 가볍게 짚고 반대쪽 팔은 천장 방향으로 길게 들어 올린다.',
          jointDirectionsKo: [
            '경추·흉추·요추 수직 중립 정렬 및 축 신장',
            '지지 측 견관절 외전·손바닥 매트 접지, 거상 측 견관절 굴곡·외전',
            '골반 좌우 높이를 최대한 수평에 가깝게 유지',
          ],
          supportPointsKo: [
            '매트에 닿은 양측 좌골 및 둔부',
            '매트에 놓인 양측 하지 측면',
            '몸통 옆 매트를 짚은 지지 손바닥',
          ],
          apparatusInteractionKo:
            '고관절이나 무릎이 불편한 경우 양반다리로 앉거나 엉덩이 아래에 패드를 받쳐 매트 좌면 지지를 편안하게 만든다.',
          breathingKo:
            '코로 들쉬며(Inhale) 들어 올린 손끝까지 척추를 위로 길게 늘인다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬거나 들쉬는 호흡과 함께 반대쪽 좌골이 매트에서 따라 들리지 않도록 무겁게 내리누르면서, 지지 손의 팔꿈치를 부드럽게 굽혀 상체를 옆으로 기울여 긴 C자 형태의 척추 측굴(Lateral Flexion)을 만든다.',
          jointDirectionsKo: [
            '흉추 및 요추의 고른 측굴(한 마디만 꺾이지 않고 긴 호 형성)',
            '경추는 흉추 측굴 곡선의 연장선 유지 및 정면 시선 유지(몸통 회전 억제)',
            '거상 측 좌골의 하방 고정(Opposition) 유지',
          ],
          supportPointsKo: [
            '매트에 무겁게 닻을 내린 양측 좌골(특히 늘어나는 쪽 좌골)',
            '매트를 지지하는 아래쪽 손바닥(어깨 거상 금지)',
          ],
          apparatusInteractionKo:
            '지지 손으로 매트를 가볍게 밀어 아래쪽 옆구리도 찌그러지지 않고 길게 들어 올려진 측굴 아치를 만든다.',
          breathingKo:
            '늘어나는 위쪽 갈비뼈 사이(늑간근)로 깊게 들쉬어(Inhale) 측면 흉곽을 확장한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 늘어났던 위쪽 옆구리와 복사근의 힘으로 골반 위에 갈비뼈와 머리를 차례로 다시 세워 수직 시작 자세로 돌아온다.',
          jointDirectionsKo: [
            '측굴된 흉추·요추의 수직 중립 복귀',
            '거상했던 팔의 하강 및 견갑대 안정화',
          ],
          supportPointsKo: [
            '양측 좌골결절',
            '매트 위 양측 하지',
          ],
          apparatusInteractionKo:
            '지지 손으로 바닥을 세게 밀어 반동으로 올라오지 않고 옆구리 코어 힘으로 수직 복귀한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 중심축을 세우고 반대쪽 진행을 준비한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['외복사근 및 내복사근', '요방형근', '늑간근'],
        synergistMusclesKo: ['광배근', '척추기립근(측굴 및 복귀 조절)', '삼각근'],
        stabilizerMusclesKo: ['복횡근', '전Serratus(전거근·지지 손 어깨 안정)', '중둔근 및 고관절 회전근(좌위 골반 지지)'],
        lengthenedStructuresKo: ['거상 측 외·내복사근 및 요방형근', '거상 측 광배근 및 외측 늑간 근막'],
        evidenceBasisKo:
          'Merrithew 및 병원 필라테스 측굴 가동성 원리에 따라 좌골 하방 고정(Pelvic Grounding)과 흉곽 측면 호흡 확장을 결합한 관상면 척추 측굴 기전을 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '옆으로 많이 내려가려고 반대쪽 엉덩이(좌골)가 매트에서 들림',
          biomechanicalCauseKo: '척추 순수 측굴 범위를 넘어 골반 전체를 기울여 보상함',
          cueCorrectionKo: '뻗는 손끝만큼 반대쪽 엉덩이뼈를 매트 바닥에 무겁게 눌러 위아래 대칭 길이를 만들도록 안내한다.',
        },
        {
          compensationKo: '바닥을 짚은 쪽 어깨가 귀로 솟고 아래쪽 옆구리가 완전히 접힘',
          biomechanicalCauseKo: '지지 팔에 체중을 기대며 상부 승모근에 의존함',
          cueCorrectionKo: '바닥 짚은 손은 가볍게 두고 아래쪽 갈비뼈도 큰 공을 감싸듯 위로 들어 올리며 넘어가도록 큐잉한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '무릎 또는 고관절 내·외회전 제한으로 Z-sit 자세가 불편한 경우',
          modificationKo: '두 다리를 앞으로 편하게 놓거나 양반다리, 또는 고정된 의자에 앉아 작은 범위로 측굴을 수행한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '연결된 연속 초안의 의자 좌위 vs 매트 좌위 차이',
          catalogOrDraftStateKo:
            '연속 초안(chair-seated-overhead-sidebend-v1)은 일반 고정 의자(ordinary-chair)에 앉은 오버헤드 사이드벤드로 작성되어 있으며, 카탈로그는 매트 좌위를 기본으로 하고 쉬운 옵션에 의자 좌위를 언급한다.',
          evidenceStandardKo:
            '매트 머메이드는 매트 바닥 좌위(Z-sit 또는 양반다리)가 기본 자세이고 의자 착석은 수정(easier) 옵션이다.',
          conservativeResolutionKo:
            'chair-seated-overhead-sidebend-v1은 쉬운 변형/패턴 참고 도해로 구분하여 설명하고 정본 일치로 표시하지 않는다.',
        },
        {
          aspect: '측면 뷰 2D rig에서의 관상면 측굴 표현',
          catalogOrDraftStateKo:
            '2D rig(lateral-mermaid-side-bend)는 리포머·캐딜락·체어 머메이드 동작들과 공유된다.',
          evidenceStandardKo:
            '관상면(Frontal Plane) 측굴 동작은 정면 뷰에서 가장 명확히 읽히나 2D rig는 공통 좌표계를 사용한다.',
          conservativeResolutionKo:
            '도해의 팔 원호와 흉추 기울기를 관상면 측굴 상징으로 해석하도록 안내한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'lateral-mermaid-side-bend',
        targetPatternVariantIds: ['chair-seated-overhead-sidebend-v1'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-mermaid',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: seated, spinalPlanes: [lateral]로 정의하며 매트에 앉아 한 팔을 길게 보내 옆구리 길이를 탐색하는 동작이다.',
          },
          {
            category: 'fact',
            targetId: 'chair-seated-overhead-sidebend-v1',
            summaryKo:
              '연결된 연속 초안(chair-seated-overhead-sidebend-v1)은 일반 고정 의자 좌위에서의 측굴을 모델링하여 카탈로그의 easier 옵션("의자에 앉아 작은 범위로 움직입니다")과 대응된다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'lateral-mermaid-side-bend',
            summaryKo:
              '공유 2D rig(lateral-mermaid-side-bend)가 매트·리포머·캐딜락·체어 측굴 동작에 공통 사용되므로 기구별 손 지지점 차이는 텍스트로 구분해야 한다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'chair-seated-overhead-sidebend-v1',
            summaryKo:
              '연속 초안은 매트 바닥 Z-sit이 아닌 의자 좌위 변형이며 전문가 해부학 감수는 미완료 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'lateral-mermaid-side-bend에서 매트 머메이드의 바닥 지지 손과 반대쪽 좌골 앵커 표시를 명확히 유지할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '공식 교육 자료 및 병원 리플릿에 기반한 매트 측굴 가이드이며, 연결된 의자 좌위 초안은 보조 변형 참고 자료입니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'ex-warmup-03',
      track: 'track-c-extended-mat',
      rankInTrack: 9,
      nameKo: '매트 폼롤러 흉추 릴리즈 & 립케이지 암써클',
      nameEn: 'Foam Roller Thoracic Release & Arm Circles',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral', 'extension'],
      exercise: {
        id: 'ex-warmup-03',
        nameKo: '매트 폼롤러 흉추 릴리즈 & 립케이지 암써클',
        nameEn: 'Foam Roller Thoracic Release & Arm Circles',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['neutral', 'extension'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-supine-arm-circles-ribcage-2023',
          title: 'Pilates: exercises and principles (Supine Ribcage Closure & Overhead Arm Reach)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 자료로 수파인 자세에서 흉곽 들뜸 없이 양팔을 머리 위로 넘기는 Ribcage Closure 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-supine-thoracic-arm-reach-pdf',
          title: 'Exercises for Back Pain (Supine Postural Alignment & Shoulder Mobility)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 검증된 공개 병원 자료로 수파인 척추 중립 지지와 상지 가동성 조절 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 세로로 놓은 폼롤러 위에 후두부부터 흉추·천골까지 척추 전체가 빈틈없이 닿도록 바로 눕고(Supine), 양 무릎을 굽혀 두 발바닥을 매트 바닥에 골반 너비로 지지한다. 양팔은 천장 방향으로 나란히 뻗어 올린다.',
          jointDirectionsKo: [
            '폼롤러 축을 따른 경추·흉추·요추·천골 일직선 정렬',
            '양측 고관절·슬관절 굴곡 및 매트 바닥 발바닥 삼각 지지',
            '양측 견관절 수직 굴곡 및 견갑골이 폼롤러 옆면을 감싸는 중립 안착',
          ],
          supportPointsKo: [
            '폼롤러 상단면 위 후두부·흉추·천골',
            '매트 바닥 위 양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '원통형 폼롤러의 좌우 불안정성을 양발 발바닥 지지와 심부 복부 조절로 제어하며 날개뼈 움직임 공간을 확보한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 등 뒤가 폼롤러에 넓게 닿는 것을 느끼고 암써클을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '들쉬는 숨에 명치와 하부 갈비뼈가 천장으로 들뜨지 않도록 지긋이 닫은 상태를 유지하며, 양팔을 머리 위 귀 옆 방향으로 길게 넘겼다가 측면 큰 원호를 따라 대흉근과 소흉근을 부드럽게 신장시킨다.',
          jointDirectionsKo: [
            '양측 견관절 굴곡·외전·외회전 원호 이동(Arm Circle)',
            '견갑골의 자연스러운 상방회전 및 후인(폼롤러 감싸기)',
            '팔이 머리 위로 갈 때 요추 과신전 및 흉곽 들뜸(Rib Flare) 억제',
          ],
          supportPointsKo: [
            '폼롤러 위 후두부·흉추·천골(허리 들뜸 최소화)',
            '매트 바닥을 균등하게 딛고 있는 양발 발바닥',
          ],
          apparatusInteractionKo:
            '폼롤러가 척추 중앙만 지지하므로 양쪽 날개뼈가 바닥에 걸리지 않고 후방으로 자유롭게 모이며 전면 가슴 근막이 열린다.',
          breathingKo:
            '코로 들쉬며(Inhale) 양팔을 머리 위로 보내 가슴을 열고, 어깨 충돌이 없는 편안한 원호 높이를 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 양팔로 큰 원을 그려 골반 옆을 거쳐 다시 가슴 위 시작 위치로 회수하며 복횡근과 하부 흉곽의 중심 연결을 재확인한다.',
          jointDirectionsKo: [
            '양측 견관절 내전·신전 및 수직 시작 위치 복귀',
            '견갑골 하강 및 중립 복원',
            '폼롤러 위 체간 좌우 균형 유지',
          ],
          supportPointsKo: [
            '폼롤러 위 후두부·흉추·천골',
            '매트 바닥 위 양발 발바닥',
          ],
          apparatusInteractionKo:
            '팔이 원을 그리며 돌아올 때도 폼롤러가 좌우로 굴러가지 않도록 양발과 코어 지지를 일정하게 유지한다.',
          breathingKo:
            '입으로 가늘게 내쉬며(Exhale) 아랫배와 갈비뼈를 닫고 양팔을 회수한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복횡근(흉곽 닫기 유지)', '능형근 및 중·하부승모근(견갑 조절)', '전면 및 측면 삼각근'],
        synergistMusclesKo: ['내복사근 및 외복사근', '회전근개(극하근·소원근)'],
        stabilizerMusclesKo: ['심부경추굴곡근', '다열근', '내전근 및 둔근(폼롤러 좌우 균형)'],
        lengthenedStructuresKo: ['소흉근 및 대흉근', '광배근 및 전방 견관절낭(오버헤드 암써클 구간)'],
        evidenceBasisKo:
          'NHS 수파인 흉곽 안정화(Ribcage Closure) 원리와 폼롤러 축 지지를 결합하여 요추 보상 없이 흉추 신전 가동성과 전면 흉근 신장을 유도하는 기전을 반영함.',
      },
      commonCompensations: [
        {
          compensationKo: '팔을 머리 위로 넘길 때 등이 폼롤러에서 번쩍 들리며 허리가 꺾임',
          biomechanicalCauseKo: '광배근·소흉근 단축을 흉요추 과신전으로 보상함',
          cueCorrectionKo: '등 뒤 갈비뼈를 폼롤러에 붙인 채 유지할 수 있는 높이까지만 팔을 넘기도록 가동범위를 조절한다.',
        },
        {
          compensationKo: '어깨 측면 원호를 그릴 때 팔꿈치와 손목이 바닥으로 과하게 처져 어깨 앞쪽이 집힘',
          biomechanicalCauseKo: '전방 관절낭에 과부하가 걸리는 과도한 수평외전',
          cueCorrectionKo: '팔꿈치를 살짝 구부려 양손이 시야 가장자리에 보이는 편안한 높이에서 원을 그리도록 수정한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '어깨 충돌증후군이나 회전근개 불편감이 있는 경우',
          modificationKo: '팔꿈치를 살짝 구부려 지렛대를 줄이고 어깨 높이 아래 작은 원호로만 움직인다.',
        },
        {
          conditionOrCautionKo: '폼롤러 위에서 균형 잡기가 어렵거나 어지러운 경우',
          modificationKo: '폼롤러 없이 매트 바닥에 바로 누워 동일한 립케이지 암써클을 수행한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '공유 2D rig의 폼롤러 소도구 및 오버헤드 암써클 표현 한계',
          catalogOrDraftStateKo:
            '2D rig(supine-breath-pelvic-clock)는 일반 매트 수파인 호흡·골반 클락 동작과 공유되어 폼롤러 원통과 큰 오버헤드 암써클이 별도로 분리되어 있지 않다.',
          evidenceStandardKo:
            'ex-warmup-03은 props: [foam-roller]를 사용하며 양팔 만세 및 원호 회수가 핵심이다.',
          conservativeResolutionKo:
            '공유 2D rig는 수파인 중립 척추 정렬 참고용으로만 안내하고, 폼롤러 정렬과 암써클 궤적은 단계별 텍스트 설명을 우선한다.',
        },
        {
          aspect: '외부 참고 영상 링크와 자체 모션 검수 구분',
          catalogOrDraftStateKo:
            '카탈로그에 유튜브 참고 링크가 있으나 이는 외부 참고용 링크일 뿐 앱 내 모션 검증이 아니다.',
          evidenceStandardKo:
            '외부 영상 존재 여부는 자체 도해의 해부학적 정확성 보증이 아니다.',
          conservativeResolutionKo:
            'truthfulnessFlags의 모든 ready/verified 항목을 false로 유지한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'supine-breath-pelvic-clock',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'ex-warmup-03',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: supine, spinalPlanes: [neutral, extension], props: [foam-roller]로 정의하며 폼롤러 위 흉추 릴리즈 및 암써클을 설명한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-breath-pelvic-clock',
            summaryKo:
              '배정된 공유 2D rig(supine-breath-pelvic-clock)는 골반 클락·수파인 호흡과 공유되어 팔이 머리 위로 크게 원을 그리는 궤적이나 세로 폼롤러가 별도 렌더링되지 않는다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-breath-pelvic-clock',
            summaryKo:
              '웜업 수파인 동작들을 단일 아키타입으로 묶으면서 폼롤러 지지 높이와 상지 오버헤드 가동 범위가 생략되었다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-breath-pelvic-clock',
            summaryKo:
              '2D 도해에 폼롤러 소도구 및 오버헤드 암써클 궤적이 반영되어 있지 않으며 전문가 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-breath-pelvic-clock에서 ex-warmup-03 전용 2D 포즈를 분리하여 척추 아래 세로 폼롤러 가이드와 양팔 오버헤드 리치 좌표를 추가할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '수파인 흉곽 안정화 및 상지 가동성 원리를 정리한 교육 자료이며, 공유 2D 도해는 폼롤러와 큰 암써클을 직접 묘사하지 않습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'ex-core-03',
      track: 'track-c-extended-mat',
      rankInTrack: 10,
      nameKo: '매트 필라테스 앱 파이브 (Ab Series of 5)',
      nameEn: 'Classical Mat Ab Series of 5 (Single/Double Leg Stretch, Scissors, Criss-Cross)',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['flexion', 'rotation'],
      exercise: {
        id: 'ex-core-03',
        nameKo: '매트 필라테스 앱 파이브 (Ab Series of 5)',
        nameEn: 'Classical Mat Ab Series of 5 (Single/Double Leg Stretch, Scissors, Criss-Cross)',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['flexion', 'rotation'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-ab-prep-single-leg-stretch-2023',
          title: 'Pilates: exercises and principles (Abdominal Preparation & Single Leg Stretch Control)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 자료로 상부 흉추 컬업 유지 및 교대 하지 신전 시 골반·요추 안정화 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'pilates-anytime-ab-series-of-five-guide',
          title: 'The Pilates Ab Series of Five: Technique & Modifications',
          publisher: 'Pilates Anytime Educational Encyclopedia',
          directUrl:
            'https://www.pilatesanytime.com/blog/pilates-exercises/the-pilates-ab-series-of-five',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 검색 스니펫으로 Single Leg Stretch, Double Leg Stretch, Scissors, Lower & Lift, Criss-Cross 5종 연결 시 견갑골 하각 컬업 유지 및 크리스크로스 흉곽 회전 큐 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트에 바로 누워(Supine) 두 다리를 테이블탑으로 들어 올리고, 내쉬는 숨에 턱을 가볍게 당기며 상부 흉추를 굴곡(Curl-up)하여 날개뼈 하각 부근까지 매트에서 들어 올린다. 한쪽 무릎을 가슴 쪽으로 당기고 반대쪽 다리는 사선 앞으로 길게 뻗을 준비를 한다.',
          jointDirectionsKo: [
            '상부 경추 가벼운 굴곡 및 상부·중부 흉추 굴곡(Curl-up 높이 고정)',
            '요추 및 천골의 매트 바닥 안정 지지',
            '양측 고관절·슬관절 굴곡(테이블탑 또는 싱글 레그 스트레치 시작 배치)',
          ],
          supportPointsKo: [
            '하부 흉추(견갑골 하각 아래)',
            '요추 후면 및 천골(Sacrum)',
          ],
          apparatusInteractionKo:
            '양발이 모두 공중에 떠 있는 열린 사슬(Open-Chain) 부하에서 매트 바닥에 닿은 하부 흉추와 천골을 흔들림 없는 중심 앵커로 삼는다.',
          breathingKo:
            '코로 들쉬며 준비하고 내쉬며(Exhale) 복부 스쿱으로 상체 컬업 높이를 세팅한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '일정한 컬업 높이를 유지한 채 싱글 레그 스트레치, 더블 레그 스트레치, 시저스, 로워 앤 리프트, 그리고 겨드랑이를 반대쪽 무릎 방향으로 회전하는 크리스크로스(Criss-Cross)를 호흡 리듬에 맞춰 연결한다.',
          jointDirectionsKo: [
            '고관절·슬관절의 교대 또는 동시 굴곡·신전(사선 리치)',
            '크리스크로스 구간에서 골반은 수평으로 고정하고 흉추만 회전(Thoracic Rotation)',
            '다리를 뻗을 때 요추가 매트에서 들뜨지 않도록 골반 후방 안정 유지',
          ],
          supportPointsKo: [
            '하부 흉추 및 천골 매트 접촉면',
            '크리스크로스 및 로워 리프트 시 후두부를 받친 양손',
          ],
          apparatusInteractionKo:
            '다리 지렛대가 길어질수록 허리가 매트에서 떨어지지 않도록 배꼽을 매트 쪽으로 단단히 연결하고, 필요 시 다리 높이를 천장 쪽으로 높여 부하를 조절한다.',
          breathingKo:
            '다리 교대 및 뻗기 구간마다 짧고 명료하게 내쉬며(Exhale) 복벽이 위로 부풀어 오르지 않도록 제어한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '5가지 복부 시리즈를 마친 뒤 양 무릎을 가슴 쪽으로 부드럽게 안아 올리고 상체와 후두부를 매트 바닥에 천천히 내려놓아 목과 복부의 긴장을 이완한다.',
          jointDirectionsKo: [
            '흉추 굴곡에서 매트 수파인 중립으로 분절 하강',
            '양측 고관절·슬관절 완전 굴곡(무릎 안기 휴식) 후 양발 매트 착지',
          ],
          supportPointsKo: [
            '후두부 및 양측 견갑골',
            '흉추·요추·천골 전체',
          ],
          apparatusInteractionKo:
            '매트에 머리를 내려놓은 뒤 고개를 좌우로 부드럽게 굴려 경추 주변 근육의 피로를 풀어준다.',
          breathingKo:
            '코로 깊게 들쉬고 입으로 길게 내쉬며(Exhale) 복부와 목을 이완한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복직근', '내복사근 및 외복사근', '복횡근'],
        synergistMusclesKo: ['장요근 및 대퇴직근', '내전근군', '전면삼각근'],
        stabilizerMusclesKo: ['심부경추굴곡근', '다열근', '하부승모근 및 전거근'],
        lengthenedStructuresKo: ['햄스트링(시저스 구간)', '상부 흉추 신전근막(컬업 유지 구간)'],
        evidenceBasisKo:
          '고전 필라테스 Ab Series of 5 교육 기준 및 병원 필라테스 코어 안정화 원칙에 따라 열린 사슬 하지 부하 중 요추-골반 안정성 유지와 경추 보호 수정안을 반영함.',
      },
      commonCompensations: [
        {
          compensationKo: '동작이 진행될수록 어깨가 내려앉고 턱만 앞으로 빠져 목 앞쪽이 아픔',
          biomechanicalCauseKo: '상복부 지구력 저하를 흉쇄유돌근 과수축과 경추 전인(Forward Head)으로 보상함',
          cueCorrectionKo: '중간중간 머리를 매트에 내려놓고 다리 동작만 이어가거나 손으로 후두부를 받쳐 경추를 보호하도록 안내한다.',
        },
        {
          compensationKo: '크리스크로스에서 몸통은 안 돌고 팔꿈치만 좁혀 무릎에 갖다 댐',
          biomechanicalCauseKo: '내·외복사근을 통한 흉추 회전 대신 견관절 수평내전으로 보상함',
          cueCorrectionKo: '양 팔꿈치는 넓게 유지하고 갈비뼈와 겨드랑이 전체를 반대쪽 무릎 방향으로 회전시키도록 큐잉한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '경추 통증이나 목 피로도가 높은 경우, 또는 급성 요추 디스크 불편감이 있는 경우',
          modificationKo: '머리를 매트(또는 작은 쿠션)에 내려놓은 Head Down 상태로 진행하고 다리를 천장 쪽 높은 사선으로 뻗어 허리 부하를 줄인다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '5종 복합 시리즈 대비 단일 2D rig 표현 범위',
          catalogOrDraftStateKo:
            '2D rig(supine-leg-stretch-hundred)는 수파인 컬업 및 다리 뻗기 대표 포즈 1종으로 5가지 하위 동작을 요약한다.',
          evidenceStandardKo:
            'Ab Series of 5는 Single/Double Leg Stretch, Scissors, Lower & Lift, Criss-Cross(회전 포함)의 5개 세부 패턴으로 구성된다.',
          conservativeResolutionKo:
            '단일 2D 도해는 컬업 높이와 하지 사선 리치의 대표 기준점으로 안내하고, 시저스·크리스크로스 회전 큐는 텍스트 설명으로 보완한다.',
        },
        {
          aspect: '써클링(magic-circle) 소도구 적용 단계',
          catalogOrDraftStateKo:
            '카탈로그 props에 magic-circle이 포함되어 있으며 심화(hard) 레이어에서 발목·손에 적용하도록 안내한다.',
          evidenceStandardKo:
            '기본 Ab Series of 5는 맨몸으로 먼저 코어 조절을 확립한 뒤 소도구를 추가해야 안전하다.',
          conservativeResolutionKo:
            '써클링은 숙련자 선택 옵션임을 명시한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'supine-leg-stretch-hundred',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'ex-core-03',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: supine, spinalPlanes: [flexion, rotation]으로 정의하며 클래식 매트 앱 파이브 5종 시리즈를 다룬다.',
          },
          {
            category: 'fact',
            targetId: 'supine-leg-stretch-hundred',
            summaryKo:
              '공유 2D rig(supine-leg-stretch-hundred)는 상체 컬업과 하지 사선 신전을 표현하나 크리스크로스의 흉추 회전과 시저스의 양다리 가위 교차는 별도 프레임으로 분리되어 있지 않다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-leg-stretch-hundred',
            summaryKo:
              '5개 연속 동작으로 이루어진 복합 시리즈를 3단계(start/middle/end) 단일 아키타입에 매핑하면서 대표 굴곡-신전 포즈만 시각화된 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-leg-stretch-hundred',
            summaryKo:
              '5종 개별 동작 각각의 2D/3D 분절 검증 및 외부 전문가 감수는 완료되지 않았다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-leg-stretch-hundred 도해에 Ab Series 5종(특히 Criss-Cross 흉곽 회전)의 보조 회전 화살표 또는 서브 탭 구분을 검토할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '클래식 앱 파이브 5종 시리즈의 교육적 요약이며, 현재 2D 도해는 대표 컬업·레그 스트레치 자세만 표현합니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'ex-cooldown-02',
      track: 'track-c-extended-mat',
      rankInTrack: 11,
      nameKo: '스탠딩 척추 롤다운 & 센터링 호흡 피날레',
      nameEn: 'Standing Spine Roll-Down & Final Centering Breath',
      apparatus: 'mat',
      bodyPosition: 'standing',
      spinalPlanes: ['flexion', 'neutral'],
      exercise: {
        id: 'ex-cooldown-02',
        nameKo: '스탠딩 척추 롤다운 & 센터링 호흡 피날레',
        nameEn: 'Standing Spine Roll-Down & Final Centering Breath',
        apparatus: 'mat',
        bodyPosition: 'standing',
        spinalPlanes: ['flexion', 'neutral'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-standing-roll-down-leaflet-2023',
          title: 'Pilates: exercises and principles (Standing Roll Down & Spinal Articulation)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 입위에서 경추·흉추·요추 순차 분절 굴곡 및 복귀(Roll Down) 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-standing-roll-down-guide',
          title: 'Exercise Series: The Standing Roll Down',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/the-standing-roll-down/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 검색 스니펫으로 발바닥 균등 체중 지지, 복부 리프트 유지 하의 척추 분절 하강 및 골반 후방경사로부터의 분절 롤업 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 두 발을 골반 너비 평행으로 두고 똑바로 서서(Standing) 발바닥 삼각대(엄지발볼·새끼발볼·뒤꿈치)에 체중을 고르게 싣는다. 양팔은 몸통 옆에 힘을 빼고 내려놓으며 정수리를 천장으로 길게 세운다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립 정렬',
            '양측 고관절·슬관절 부드러운 중립(무릎 과신전 잠금 방지)',
            '견갑대 이완 및 쇄골 수평 정렬',
          ],
          supportPointsKo: [
            '양발 발바닥 전체(전족부와 후족부 균등 분배)',
          ],
          apparatusInteractionKo:
            '매트 바닥 위에서 뒤꿈치로만 체중이 쏠리지 않도록 발바닥 중앙에 무게중심을 맞춘다.',
          breathingKo:
            '코로 깊게 들쉬며(Inhale) 척추 마디 사이 공간을 넓히고 롤다운을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 턱을 가볍게 당기며(Head Nod) 뒤에 투명한 벽이 있는 것처럼 정수리부터 경추·상부 흉추·중부 흉추·요추 순서로 한 마디씩 척추를 분절 굴곡하여 상체를 바닥 쪽으로 늘어뜨린다.',
          jointDirectionsKo: [
            '경추·흉추·요추 순차적 척추 분절 굴곡(Spinal Articulation Flexion)',
            '복벽은 등 쪽으로 들어 올려 요추를 지지하고 양팔·머리는 중력 방향으로 이완',
            '골반이 뒤로 빠지지 않도록 발목-무릎-고관절 수직선 유지(필요 시 무릎 살짝 굴곡)',
          ],
          supportPointsKo: [
            '매트 바닥을 단단히 딛고 있는 양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '상체가 내려갈 때 엉덩이가 뒤쪽 벽으로 밀리지 않게 발볼과 뒤꿈치 압력을 고르게 유지한다.',
          breathingKo:
            '입으로 길게 내쉬며(Exhale) 분절 하강하고, 하단 정점에서 등 뒤 갈비뼈로 깊게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 발바닥으로 매트를 밀고 아랫배와 둔근을 연결하여 골반을 먼저 수직으로 세운 뒤, 요추·흉추·경추·머리 순으로 아래에서 위로 벽에 다시 쌓아 올리듯 수직 입위 자세로 돌아와 센터링 호흡으로 마무리한다.',
          jointDirectionsKo: [
            '골반 후방경사 복원 및 고관절 신전',
            '요추·흉추·경추 순차적 분절 신전 복귀(Roll-Up)',
            '견갑대 안착 및 정면 시선 회복',
          ],
          supportPointsKo: [
            '양발 발바닥 삼각 지지점 전체',
          ],
          apparatusInteractionKo:
            '양발로 매트 바닥을 수직 아래로 밀어내는 지면 반력을 이용해 척추를 한 마디씩 세운다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 아래에서부터 척추를 쌓아 올라오고 상단에서 센터링 호흡으로 정리한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복횡근 및 복직근(분절 굴곡 및 복부 리프트 제어)', '대둔근 및 햄스트링(골반 수직 복원)', '척추기립근 및 다열근(원심성 하강 및 구심성 복귀)'],
        synergistMusclesKo: ['내복사근 및 외복사근', '심부경추굴곡근'],
        stabilizerMusclesKo: ['전경골근 및 비복근·가자미근(발목 수직 균형)', '중둔근'],
        lengthenedStructuresKo: ['척추기립근 및 흉요근막', '후두하근 및 경추 후면 근막', '햄스트링 및 종아리 후면 사슬'],
        evidenceBasisKo:
          'NHS 필라테스 입위 롤다운 리플릿 및 BASI 교육 기준에 따라 고관절 경첩(Hinge)보다 척추 분절 굴곡과 복벽 리프트를 우선하고, 하강 시 원심성 기립근 조절과 복귀 시 둔근-복근 협응을 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '척추를 마디마디 말지 않고 고관절만 접어 평평한 등으로 내려가며 엉덩이가 뒤로 빠짐',
          biomechanicalCauseKo: '요추·흉추 분절 굴곡 부족과 후면 사슬 긴장으로 체중을 뒤꿈치 뒤로 도피함',
          cueCorrectionKo: '뒤꿈치 뒤에 벽이 있다고 상상하고 배꼽을 등 쪽으로 당기며 윗등부터 차례로 둥글게 말아 내려가도록 안내한다.',
        },
        {
          compensationKo: '하단에서 고개를 들어 바닥을 보거나 어깨를 귀 쪽으로 긴장시킴',
          biomechanicalCauseKo: '경추 신전근과 상부 승모근의 습관적 과긴장',
          cueCorrectionKo: '하단에서 고개를 가볍게 도리도리 흔들어 머리와 양팔이 추처럼 무겁게 매달리도록 이완시킨다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '급성 요추 추간판 탈출증, 심한 골다공증, 또는 기립성 어지럼증이 있는 경우',
          modificationKo: '무릎을 구부리고 손으로 허벅지를 짚은 채 작은 범위로만 내려가거나 고개를 심장보다 낮게 오래 숙이지 않고 천천히 올라온다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '2D rig의 3단계 프레임과 연속 분절(Articulation) 표현',
          catalogOrDraftStateKo:
            '2D rig(standing-roll-down-centering)는 직립(start), 하단 굴곡(middle), 복귀(end)의 3단계 스냅샷으로 척추 롤다운을 표시한다.',
          evidenceStandardKo:
            '스탠딩 롤다운의 핵심은 정지 포즈가 아니라 경추부터 요추까지 순차적으로 이어지는 분절 타이밍이다.',
          conservativeResolutionKo:
            '2D 3단계 도해는 시작·정점·복귀 정렬 확인용으로 사용하고, 마디별 순차 이동은 단계 설명과 강사 큐잉으로 보완한다.',
        },
        {
          aspect: '전문가 감수 및 외부 영상 출처 상태',
          catalogOrDraftStateKo:
            '카탈로그상 검증된 외부 영상 출처는 비어 있으며("자료 미확인"), 별도 연속 모션 초안도 없다.',
          evidenceStandardKo:
            '병원 리플릿 문헌 근거는 확인되었으나 앱 내 모션 에셋의 전문가 감수는 완료되지 않았다.',
          conservativeResolutionKo:
            '모든 ready/verified 플래그를 false로 유지한다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'standing-roll-down-centering',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'ex-cooldown-02',
            summaryKo:
              '카탈로그는 apparatus: mat, bodyPosition: standing, spinalPlanes: [flexion, neutral]로 정의하며 스탠딩 척추 롤다운과 센터링 호흡을 다룬다.',
          },
          {
            category: 'fact',
            targetId: 'standing-roll-down-centering',
            summaryKo:
              '전용 2D rig(standing-roll-down-centering)가 연결되어 직립 준비, 전방 분절 굴곡, 수직 복귀의 3단계를 표현한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'standing-roll-down-centering',
            summaryKo:
              '3개의 이산 프레임(start/middle/end)만으로는 상부 흉추에서 요추로 이어지는 연속 분절 파동을 모두 나타낼 수 없으므로 텍스트 큐가 필수적이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'standing-roll-down-centering',
            summaryKo:
              '스탠딩 롤다운 2D 좌표에 대한 외부 해부학·임상 전문가 최종 감수는 미완료 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'standing-roll-down-centering의 middle 단계에서 고관절이 뒤로 밀리지 않고 발목 수직선 위에 머무는 수직 기준선(Plumb Line)을 유지할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        '병원 필라테스 리플릿 및 커리큘럼 문헌에 기반한 롤다운 요약이며, 3단계 정지 도해는 연속 분절 타이밍을 완전히 대체하지 않습니다.',
      reviewedAtIso: '2026-11-08',
    },
    {
      exerciseId: 'ex-global-reformer-02',
      track: 'track-c-extended-mat',
      rankInTrack: 12,
      nameKo: '[해외 BASI] Flow with Mira 15분 코르셋 딥코어 & 척추 분절 루틴',
      nameEn: 'Flow with Mira 15-Min Corset Deep Core & Spine Flow',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['flexion', 'rotation'],
      exercise: {
        id: 'ex-global-reformer-02',
        nameKo: '[해외 BASI] Flow with Mira 15분 코르셋 딥코어 & 척추 분절 루틴',
        nameEn: 'Flow with Mira 15-Min Corset Deep Core & Spine Flow',
        apparatus: 'mat',
        bodyPosition: 'supine',
        spinalPlanes: ['flexion', 'rotation'],
      },
      sources: [
        {
          sourceId: 'cuh-pilates-deep-core-corset-chest-lift-2023',
          title: 'Pilates: exercises and principles (Transversus Abdominis Centering & Chest Lift)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 복횡근 코르셋 수축 선행 및 수파인 흉추 굴곡·분절 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-chest-lift-with-rotation-guide',
          title: 'Exercise Series: The Chest Lift & Chest Lift with Rotation',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/exercise-series-the-chest-lift/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 검색 스니펫으로 BASI 기초 매트 시퀀스(Pelvic Curl, Chest Lift, Chest Lift with Rotation)의 골반 고정 및 상부 흉추 굴곡·회전 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트 위에 바로 누워(Supine) 양 무릎을 굽혀 세우고 발바닥을 골반 너비 평행으로 매트에 지지한다. 양손을 깍지 끼어 후두부를 넓게 받치고 허리 주변을 감싸는 코르셋을 조이듯 복횡근을 부드럽게 준비한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 정렬',
            '양손 후두부 지지 및 팔꿈치는 시야 가장자리 안쪽 유지',
            '고관절·슬관절 굴곡 및 양발 매트 고정',
          ],
          supportPointsKo: [
            '후두부(양손 받침) 및 양측 견갑골',
            '천골(Sacrum)',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '매트 바닥에 천골과 양발을 흔들림 없이 안착시켜 상부 흉추 굴곡 및 회전 시 골반이 따라 움직이지 않도록 기준점을 세운다.',
          breathingKo:
            '코로 갈비뼈 뒷면과 측면까지 깊게 들쉬며(Inhale) 척추 길이를 확보한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 복횡근을 먼저 수축한 뒤 상부 흉추를 굴곡하여 체스트 리프트(Chest Lift)로 올라오고, 이어지는 흐름에서 골반 수평을 유지한 채 흉곽을 좌우로 회전하는 체스트 리프트 위드 로테이션(Chest Lift with Rotation) 및 분절 흐름을 정밀하게 수행한다.',
          jointDirectionsKo: [
            '상부·중부 흉추 굴곡 및 축 회전(Thoracic Flexion & Rotation)',
            '골반 중립 고정(회전 시 반대쪽 천골이 매트에서 들리지 않도록 유지)',
            '경추는 양손에 무게를 맡겨 목 굴곡근 과긴장 방지',
          ],
          supportPointsKo: [
            '하부 흉추(견갑골 하각 부근)',
            '매트에 단단히 고정된 천골 양측',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '상체가 대각선으로 회전할 때도 반대쪽 엉덩이와 발바닥이 매트에서 가벼워지지 않도록 지면 접지를 유지한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 코르셋을 조이듯 컬업 및 흉곽 회전을 수행하고 중앙에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '회전을 중앙으로 되돌린 뒤 내쉬는 숨에 복부 원심성 조절을 유지하며 중부·상부 흉추와 머리를 매트 바닥에 순차적으로 내려놓아 시작 중립 자세로 복귀한다.',
          jointDirectionsKo: [
            '흉추 회전 복귀 후 굴곡에서 중립으로 분절 하강',
            '골반 및 하지 정렬 불변',
          ],
          supportPointsKo: [
            '후두부 및 양측 견갑골',
            '천골 및 양발 발바닥',
          ],
          apparatusInteractionKo:
            '머리가 매트에 완전히 닿을 때까지 복벽의 가벼운 지지를 놓지 않고 부드럽게 착지한다.',
          breathingKo:
            '내쉬거나 들쉬며(Exhale/Inhale) 목과 어깨의 긴장을 풀고 호흡을 정리한다.',
        },
      },
      muscles: {
        primaryMusclesKo: ['복횡근', '복직근', '내복사근 및 외복사근'],
        synergistMusclesKo: ['골반저근', '다열근', '대둔근 및 햄스트링(펠빅 컬 연결 구간)'],
        stabilizerMusclesKo: ['심부경추굴곡근', '전Serratus 및 하부승모근', '내전근군'],
        lengthenedStructuresKo: ['상부 흉추 후면 근막', '반대측 외·내복사근(흉곽 회전 구간)'],
        evidenceBasisKo:
          'BASI 기초 매트 커리큘럼(Pelvic Curl, Chest Lift, Chest Lift with Rotation)과 병원 필라테스 복횡근 코르셋 안정화 원리에 기반하여 골반 고정 하의 상부 흉추 굴곡·회전 협응을 기술함.',
      },
      commonCompensations: [
        {
          compensationKo: '체스트 리프트 로테이션 시 팔꿈치만 얼굴 앞으로 당기거나 골반이 함께 돌아감',
          biomechanicalCauseKo: '흉추 회전 가동성 부족을 견관절 내전 및 골반 회전으로 보상함',
          cueCorrectionKo: '양손과 팔꿈치 간격은 그대로 고정하고, 양쪽 천골을 매트에 붙인 채 갈비뼈 전체를 회전시키도록 안내한다.',
        },
        {
          compensationKo: '컬업할 때 아랫배가 천장 쪽으로 볼록하게 솟아오름(Doming)',
          biomechanicalCauseKo: '복횡근 선행 수축 없이 표층 복직근만 급격히 수축함',
          cueCorrectionKo: '움직이기 직전 내쉬는 숨 초반에 허리 둘레 코르셋을 먼저 부드럽게 조인 뒤 상체를 들어 올리게 한다.',
        },
      ],
      contraindicationsAndModifications: [
        {
          conditionOrCautionKo: '목 긴장이 쉽게 올라오거나 요추 디스크로 굴곡+회전 복합 부하가 부담스러운 경우',
          modificationKo: '회전을 생략하고 작은 높이의 직선 체스트 리프트와 골반 중립 호흡 및 펠빅 컬 위주로 진행한다.',
        },
      ],
      discrepancyChecks: [
        {
          aspect: '레거시 ID 명칭(ex-global-reformer-02)과 실제 기구(mat) 일치 확인',
          catalogOrDraftStateKo:
            'ID 문자열에 reformer가 포함되어 있으나 INITIAL_EXERCISES 카탈로그 정의는 apparatus: "mat", springs: "Bodyweight"인 순수 매트 루틴이다.',
          evidenceStandardKo:
            '검증기는 카탈로그의 apparatus("mat")를 기준으로 매트 트랙 배치를 판정한다.',
          conservativeResolutionKo:
            '카탈로그 정의에 따라 Track C(확장 매트 트랙)에 배치하고 ID 명칭 유래로 인한 기구 혼동이 없도록 매트 동작임을 명확히 표기한다.',
        },
        {
          aspect: '15분 복합 루틴 대비 단일 2D rig 표현 범위',
          catalogOrDraftStateKo:
            '2D rig(supine-chest-lift-curl)는 대표 체스트 리프트 3단계를 시각화한다.',
          evidenceStandardKo:
            '해당 카탈로그 항목은 펠빅 컬, 체스트 리프트, 체스트 리프트 위드 로테이션 등이 이어지는 15분 매트 루틴 요약이다.',
          conservativeResolutionKo:
            '2D 도해는 핵심 동작인 체스트 리프트 정렬 기준점으로 안내하고 전체 클래스 영상과 동일시하지 않는다.',
        },
      ],
      discrepancyAudit: {
        targetVisualAssetId: 'supine-chest-lift-curl',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'ex-global-reformer-02',
            summaryKo:
              '카탈로그는 ID가 ex-global-reformer-02이나 실제 메타데이터는 apparatus: mat, bodyPosition: supine, spinalPlanes: [flexion, rotation]인 매트 딥코어 루틴이다.',
          },
          {
            category: 'fact',
            targetId: 'supine-chest-lift-curl',
            summaryKo:
              '공유 2D rig(supine-chest-lift-curl)가 연결되어 수파인 상체 컬업 및 하강을 표시하며 별도 연속 모션 초안은 없다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'ex-global-reformer-02',
            summaryKo:
              '15분 루틴의 여러 매트 동작(펠빅 컬·체스트 리프트·로테이션) 중 대표 코어 패턴인 supine-chest-lift-curl 아키타입이 매핑된 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-chest-lift-curl',
            summaryKo:
              '외부 15분 루틴 전체 구간에 대한 개별 프레임 검수나 전문가 해부학 감수는 완료되지 않았다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-chest-lift-curl을 ex-global-reformer-02에 표시할 때 체스트 리프트 위드 로테이션(흉곽 회전) 보조 안내를 함께 표기할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
      honestLimitationSummaryKo:
        'BASI 매트 코어 원리 및 병원 리플릿에 기반한 요약이며, 15분 외부 클래스 전체를 정밀 모션으로 재현하거나 전문가 감수를 마친 자료가 아닙니다.',
      reviewedAtIso: '2026-11-08',
    },
  ] as const;
