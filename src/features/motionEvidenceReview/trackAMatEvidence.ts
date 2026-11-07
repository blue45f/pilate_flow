import type {
  EvidenceTruthfulnessFlags,
  MotionEvidenceReviewRecord,
} from './types';

export const HONEST_DEFAULT_TRUTHFULNESS_FLAGS: EvidenceTruthfulnessFlags = {
  canonicalMotionReady: false,
  manualReady: false,
  true3dSupported: false,
  anatomicalVerificationCompleted: false,
  expertVerificationCompleted: false,
  containsUnverifiedNumericAngleClaim: false,
  containsUnverifiedEmgMuscleClaim: false,
  containsMedicalSafetyGuarantee: false,
};

export const TRACK_A_MAT_EVIDENCE_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [
    {
      exerciseId: 'original-mat-bridge',
      track: 'track-a-mat',
      rankInTrack: 1,
      nameKo: '매트 브리지',
      nameEn: 'Mat Bridge',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['extension'],
      sources: [
        {
          sourceId: 'cuh-pilates-mat-leaflet-2023',
          title: 'Pilates: exercises and principles (Mat Bridge / Pelvic Curl)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256 검증 스냅샷) 및 verifiedReferences.ts에 등록된 공개 병원 교육 자료 URL.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-pilates-bridge-pdf',
          title: 'Exercises for Back Pain (Pelvic Tilt & Shoulder Bridge)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256: b308de7c8d6a0dd96ffef3bf9ab3e79dd81f1713ffba385bc649f3003ec3a4e2)에 검증된 공개 교육 리플릿.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-pelvic-curl-guide',
          title: 'Exercise Series: The Pelvic Curl',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/exercise-series-the-pelvic-curl/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 시작 자세(Supine, 무릎 굴곡, 발바닥 지지)와 분절 브리지 호흡·시퀀스 확인(샌드박스 프록시로 본문 직접 크롤링은 제한).',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 굽혀 세우고 양발을 엉덩이 너비 평행으로 매트에 둔다. 양팔은 몸통 옆 매트에 길게 내려놓고 골반과 척추는 중립을 유지한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 중립 정렬 유지',
            '고관절 및 슬관절 굴곡 상태에서 대퇴골 평행 유지',
            '견갑대 하강 및 쇄골 넓게 유지',
          ],
          supportPointsKo: [
            '후두부 바닥',
            '양측 견갑골 및 상완 후면',
            '천골(Sacrum)',
            '양발 발바닥 전체(삼각 지지점)',
          ],
          apparatusInteractionKo:
            '매트 바닥면을 지지면으로 사용하며 발바닥으로 매트를 수직 아래로 밀어낼 준비를 한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 흉곽 측면·후면을 확장하고 골반 중립에서 코어를 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 골반을 후방경사(Pelvic Imprint)시키며 꼬리뼈부터 요추·하부 흉추 순으로 매트에서 분절 거상하여 어깨-갈비뼈-골반-무릎이 사선 일직선을 이루는 브리지 정점을 유지한다.',
          jointDirectionsKo: [
            '골반 후방경사 후 고관절 신전(Hip Extension)',
            '요추 분절 굴곡을 거쳐 흉요추 중립 사선 정렬 유지(요추 과신전 억제)',
            '슬관절 굴곡 유지 및 정강이 전방 리치',
          ],
          supportPointsKo: [
            '상부 흉추 및 양측 견갑골',
            '후두부(경추 체중 부하 금지)',
            '양팔 후면 및 손바닥',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '양발 뒤꿈치와 발바닥으로 매트를 아래로 밀어 고관절 신전 토크를 만들고 무릎이 벌어지지 않도록 평행 궤적을 유지한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 척추를 분절 거상하고, 브리지 정점에서 코로 들쉬며(Inhale) 흉곽이 들리지 않게 사선 정렬을 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 흉골과 상부 흉추부터 요추·천골·꼬리뼈 순으로 위에서 아래로 매트에 하나씩 분절 하강하여 시작 중립 골반 자세로 완전히 복귀한다.',
          jointDirectionsKo: [
            '상부 흉추부터 요추까지 순차적 분절 굴곡 하강',
            '고관절 점진적 굴곡 복귀',
            '천골 착지 시 골반 중립(Neutral Pelvis) 복원',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 상부·하부 흉추',
            '요추를 거쳐 천골 안착',
            '양발 발바닥',
          ],
          apparatusInteractionKo:
            '양발 지지점을 흔들림 없이 유지한 채 척추 마디를 매트 표면에 순차적으로 내려놓는다.',
          breathingKo:
            '입으로 길게 내쉬며(Exhale) 흉추부터 꼬리뼈까지 분절 하강을 완료하고 하단에서 들쉬며 정리한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-articulated-bridge',
        targetPatternVariantIds: ['articulated-pelvic-curl'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-bridge',
            summaryKo:
              '카탈로그(INITIAL_EXERCISES)는 apparatus: mat, bodyPosition: supine, spinalPlanes: [extension]으로 정의되어 있으며 2D rig supine-articulated-bridge 및 연속 초안 articulated-pelvic-curl과 연결되어 있다.',
          },
          {
            category: 'fact',
            targetId: 'supine-articulated-bridge',
            summaryKo:
              '2D rig의 start 골반(164,142)·흉추(110,142)·요추(138,142)에서 middle 골반(164,108)·흉추(112,126)·요추(138,118)로 거상하나, end 단계에서 흉추(112,136)·요추(138,138)가 start(y:142) 높이로 완전히 내려오지 않고 떠 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'original-mat-bridge',
            summaryKo:
              '카탈로그 spinalPlanes가 [extension]만 포함하고 있으나, 분절 브리지(Pelvic Curl)는 골반 후방경사와 요추 굴곡 분절(flexion)이 핵심이므로 [flexion, extension] 또는 [neutral, flexion, extension]으로 보완하는 것이 타당하다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-articulated-bridge',
            summaryKo:
              '2D rig end phase의 흉추(y:136)·요추(y:138) 잔류 거상이 의도적 중간 프레임인지 start(y:142) 완전 착지 누락인지 미검증 상태이며, 해부학·전문가 최종 감수는 미완료이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-articulated-bridge의 end phase에서 thoracic(y:136 -> 142) 및 lumbar(y:138 -> 142) 좌표를 start와 동일하게 매트 완전 착지 상태로 수정할 것.',
          'original-mat-bridge의 spinalPlanes 메타데이터에 분절 굴곡을 반영하여 flexion 추가를 검토할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-chest-lift',
      track: 'track-a-mat',
      rankInTrack: 2,
      nameKo: '체스트 리프트',
      nameEn: 'Chest Lift',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['flexion'],
      sources: [
        {
          sourceId: 'cuh-pilates-chest-lift-leaflet-2023',
          title: 'Pilates: exercises and principles (Abdominal preparation / Chest Lift)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256: b4da231802eb2642573fb91f7a380d99e2d248697c0976f57d7db733c18f62de)에 검증된 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-chest-lift-series-guide',
          title: 'Exercise Series: The Chest Lift',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/exercise-series-the-chest-lift/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 검색 스니펫으로 깍지 낀 손의 후두부 지지, 골반 중립 유지, 견갑골 하각까지의 상부 흉추 굴곡 및 호흡(Inhale 준비 / Exhale 컬업 / Inhale 유지 / Exhale 하강) 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 세우고 발바닥을 매트에 평행하게 지지한다. 양손을 깍지 끼어 후두부(머리 뒤)를 받치고 팔꿈치는 시야 가장자리에 살짝 보이도록 둔다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립(Neutral Pelvis) 유지',
            '견관절 외전·외회전 및 주관절 굴곡으로 후두부 지지',
            '고관절·슬관절 굴곡 및 발바닥 지면 고정',
          ],
          supportPointsKo: [
            '후두부(양손 받침) 및 상·하부 흉추',
            '천골(Sacrum)',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '매트 위에서 천골과 양발 발바닥을 흔들림 없이 고정하고 손으로 머리 무게를 받쳐 목 긴장을 예방한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 뒷목이 길어지듯 가벼운 상부 경추 굴곡(Head Nod)을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 흉골을 부드럽게 낮추며 상부 흉추를 굴곡하여 머리와 어깨(견갑골 하각 부근)를 매트에서 들어 올린다. 천골은 매트에 무겁게 고정하고 양발도 매트에서 뜨지 않게 유지한다.',
          jointDirectionsKo: [
            '상부 경추 가벼운 굴곡 유지 및 상부 흉추 굴곡(Thoracic Flexion)',
            '골반 중립 유지(요추 과도한 압착이나 골반 후방경사 억제)',
            '양손은 계속 후두부를 지지하며 팔을 앞으로 뻗지 않음',
          ],
          supportPointsKo: [
            '하부 흉추(견갑골 하각 아래)',
            '천골(Sacrum)',
            '양발 발바닥 전체(지면 고정 유지)',
          ],
          apparatusInteractionKo:
            '상부 흉추가 매트에서 떨어질 때 천골과 양발 발바닥이 매트 바닥에 고정된 상태를 유지한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 갈비뼈를 골반 쪽으로 미끄러뜨려 상체를 들어 올리고, 정점에서 코로 들쉬며(Inhale) 흉추 굴곡 높이를 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 복부 조절을 유지하며 중부·상부 흉추, 어깨, 후두부 순으로 매트에 분절 하강하여 시작 자세로 돌아온다.',
          jointDirectionsKo: [
            '흉추 굴곡에서 중립 신전 방향으로 원심성(Eccentric) 복귀',
            '후두부 매트 안착 시까지 양손 지지 유지',
            '천골 및 양발 지지 불변',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추 전체',
            '천골',
            '양발 발바닥',
          ],
          apparatusInteractionKo:
            '상체를 매트에 급격히 떨어뜨리지 않고 천골 고정 상태에서 순차적으로 내려놓는다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 상체를 매트에 천천히 내려놓고 시작 자세로 복귀한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-chest-lift-curl',
        targetPatternVariantIds: ['supine-chest-lift'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-chest-lift',
            summaryKo:
              '카탈로그 standard 큐잉은 "무릎을 세우고 바로 누워 머리를 손으로 지지하고... 상부 흉추를 말아 올립니다"라고 명시한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-chest-lift-curl',
            summaryKo:
              '2D rig supine-chest-lift-curl은 Roll-Up·Cadillac Teaser와 공유되어 start에서 팔을 머리 위(hand: 108,70)에 두고 middle에서 앞으로 길게 뻗으며(hand: 196,94), middle에서 발목까지 공중으로 들린다(ankle y: 144 -> 116).',
          },
          {
            category: 'fact',
            targetId: 'supine-chest-lift',
            summaryKo:
              '연속 모션 초안(supine-chest-lift)에서도 armsPose가 overhead -> forward-reach(knee-reach)로 보간되어 후두부 손 지지 큐잉과 어긋난다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-chest-lift-curl',
            summaryKo:
              'Roll-Up 및 Teaser와 단일 2D 아키타입을 공유하면서 Chest Lift 고유의 "발바닥 매트 고정 + 양손 후두부 지지" 해부학 제약이 깨진 것으로 판단된다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-chest-lift-curl',
            summaryKo:
              '2D rig middle 단계의 발목 거상(ankle y: 144 -> 116)과 전방 팔 뻗기(hand x: 108 -> 196)는 Chest Lift 교육 근거 및 카탈로그 본문과 명백히 불일치(mismatched)한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-chest-lift-curl에서 Chest Lift 전용 2D rig를 분리하여 start/middle/end 전 구간 발목(ankle y:144)을 매트에 고정할 것.',
          '2D rig와 연속 초안(supine-chest-lift)의 손 위치를 머리 위/앞 뻗기 대신 후두부(head 주변) 지지 포즈로 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-single-leg-stretch',
      track: 'track-a-mat',
      rankInTrack: 3,
      nameKo: '싱글 레그 스트레치 준비',
      nameEn: 'Single Leg Stretch Preparation',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'pilates-return-to-life-single-leg-stretch-1945',
          title:
            'Return to Life Through Contrology — The One Leg Stretch (Exercise #6)',
          publisher: 'J.H. Pilates & W.J. Miller (Public Domain 1945 Edition)',
          directUrl: 'https://pilatesology.com/blog/the-one-leg-stretch/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 고전 원전 텍스트(머리를 앞으로 숙여 턱을 가슴 쪽으로 당기고 한쪽 무릎을 당기며 반대쪽 다리를 전방 사선으로 뻗고 호흡과 함께 교대) 확인.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-mat-leaflet-single-leg-prep',
          title: 'Pilates: exercises and principles (Supine Single Leg Stretch / Tabletop)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 골반 중립 또는 안정된 지지를 유지하며 다리를 테이블탑(또는 한 무릎을 가슴 쪽으로 당긴 준비 자세)으로 들고, 상부 흉추를 가볍게 말아 올리거나(수정본에서는 머리 지지) 양손으로 당긴 쪽 정강이/무릎을 감싼다.',
          jointDirectionsKo: [
            '골반 중립 및 요추 안정화 유지',
            '양측 고관절·슬관절 테이블탑 굴곡 준비',
            '상부 흉추 굴곡(또는 목 부담 시 후두부 바닥 지지)',
          ],
          supportPointsKo: [
            '하부 흉추 및 천골(Sacrum)',
            '머리 내려놓은 수정본의 경우 후두부 추가 지지',
          ],
          apparatusInteractionKo:
            '매트 바닥에 천골과 하부 흉추를 안정적으로 고정하여 다리 교대 시 골반이 좌우나 전후로 흔들리지 않게 한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 복부 중심을 잡고 한쪽 다리 리치를 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 한쪽 무릎은 가슴/테이블탑 쪽으로 유지하며 양손으로 정강이를 가볍게 안내하고, 반대쪽 다리는 골반이 흔들리지 않는 높이의 전방 사선으로 길게 뻗어 고관절·슬관절을 신전한다.',
          jointDirectionsKo: [
            '뻗는 다리: 고관절 신전(사선 높이 유지) 및 슬관절 신전',
            '당기는 다리: 고관절·슬관절 굴곡 유지',
            '몸통·골반: 요추 과신전 및 골반 전방경사 억제',
          ],
          supportPointsKo: ['하부 흉추', '천골(Sacrum)'],
          apparatusInteractionKo:
            '다리가 공중 사선으로 뻗는 긴 레버 부하에 맞서 천골과 하부 갈비뼈를 매트에 단단히 고정한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 다리를 사선으로 길게 뻗고, 들쉬며(Inhale) 교대 전환을 준비한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '뻗었던 다리를 다시 중심 테이블탑으로 회수하거나 반대쪽 다리와 교대한 뒤, 양 무릎을 정렬하고 상체와 발을 매트로 안전하게 내려놓는다.',
          jointDirectionsKo: [
            '뻗은 다리의 고관절·슬관절 굴곡 복귀',
            '양다리 교대 후 테이블탑 정렬 및 매트 착지',
            '흉추 및 후두부 매트 복귀',
          ],
          supportPointsKo: ['후두부', '흉추 전체', '천골', '양발 발바닥'],
          apparatusInteractionKo:
            '다리 회수 과정에서 허리가 매트에서 들뜨지 않도록 복부 지지를 끝까지 유지한다.',
          breathingKo:
            '교대 호흡(한쪽 리치 Exhale / 전환 Inhale)을 마친 뒤 내쉬며 시작 자세로 내려온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-leg-stretch-hundred',
        targetPatternVariantIds: ['supine-single-leg-reach-v1'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-single-leg-stretch',
            summaryKo:
              '카탈로그 spinalPlanes는 [neutral]만 기재되어 있으나, 2D rig(supine-leg-stretch-hundred)와 연속 초안(supine-single-leg-reach-v1, curlUp: 0.45 -> 0.52)은 모두 상부 흉추 굴곡(curl-up)을 포함한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-leg-stretch-hundred',
            summaryKo:
              '2D rig supine-leg-stretch-hundred는 Hundred·Double Leg Stretch·Criss Cross 등과 공유되어 양손이 무릎/정강이를 잡지 않고 골반 옆 바닥 근처(hand: 158,136 -> 168,128)에서 펌핑 자세로 그려진다.',
          },
          {
            category: 'fact',
            targetId: 'supine-single-leg-reach-v1',
            summaryKo:
              'motionAuthoringBatch.ts에서 이 동작은 mismatched로 분류되어 있으며, 연속 초안은 한쪽 다리만 뻗었다 접을 뿐 카탈로그 큐잉("다리를 번갈아 길게 뻗습니다")의 좌우 교대가 없다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'original-mat-single-leg-stretch',
            summaryKo:
              '상체 컬업을 수행하는 고전/표준 Single Leg Stretch를 표현하려면 spinalPlanes에 flexion이 포함되어야 하며, 2D rig에서 Hundred 팔 자세와 Single Leg Stretch 손 정강이 파지 자세를 분리해야 한다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-single-leg-reach-v1',
            summaryKo:
              '연속 초안(supine-single-leg-reach-v1)은 편측 단일 레그 리치만 구현하고 좌우 교대(alternation) 및 정강이 파지 손 궤적이 누락되어 있어 canonical ready로 볼 수 없다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-leg-stretch-hundred에서 Single Leg Stretch 전용 2D 포즈를 분리하여 양손이 당긴 쪽 무릎/정강이(knee/ankle 인근)를 지지하도록 수정할 것.',
          '연속 초안(supine-single-leg-reach-v1)에 좌우 다리 교대(left/right alternation) 주기를 추가하고 카탈로그 spinalPlanes에 flexion 병기를 검토할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-heel-slide',
      track: 'track-a-mat',
      rankInTrack: 4,
      nameKo: '힐 슬라이드',
      nameEn: 'Heel Slide',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'cuh-pilates-heel-slide-leaflet-2023',
          title: 'Pilates: exercises and principles (Heel Slides in Neutral Spine)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256 검증 스냅샷) 및 verifiedReferences.ts에 등록된 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-heel-slide-pdf',
          title: 'Exercises for Back Pain (Supine Lumbopelvic Stability & Leg Slide)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 물리치료 교육 PDF.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 굽혀 발바닥을 매트에 두고, 양쪽 골반 앞쪽 돌기(ASIS)와 치골이 수평을 이루는 중립 골반과 자연스러운 요추 커브를 유지한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립(Neutral Spine & Pelvis) 고정',
            '양측 고관절·슬관절 굴곡 상태에서 엉덩이 너비 평행 정렬',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추',
            '천골(Sacrum)',
            '양발 발바닥(슬라이드할 발은 뒤꿈치 접촉 준비)',
          ],
          apparatusInteractionKo:
            '매트 바닥을 지지면으로 삼아 천골의 무게 중심이 좌우나 위아래로 쏠리지 않게 고정한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 흉곽을 넓히고 하복부 심부 안정화 근육을 가볍게 깨운다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 골반 중립과 요추 높이를 그대로 유지한 채 한쪽 발뒤꿈치를 매트 표면을 따라 발끝 방향으로 미끄러뜨려 무릎과 고관절을 신전한다.',
          jointDirectionsKo: [
            '이동 측 고관절·슬관절 점진적 신전(Extension)',
            '반대측 지지 다리 고관절·슬관절 굴곡 및 수직 정렬 유지',
            '요추 전만 증가(허리 들뜸) 및 골반 회전 억제',
          ],
          supportPointsKo: [
            '후두부 및 흉추',
            '천골(Sacrum)',
            '반대측 고정 발바닥',
            '이동 측 발뒤꿈치(매트 표면 슬라이딩 접촉)',
          ],
          apparatusInteractionKo:
            '이동하는 발뒤꿈치가 매트에서 들리지 않고 매트 마찰면을 따라 수평으로 미끄러진다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 지지로 골반을 고정한 채 뒤꿈치를 멀리 미끄러뜨리고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨(또는 부드러운 복귀 호흡)에 발뒤꿈치를 다시 매트를 따라 엉덩이 쪽으로 끌어당겨 고관절과 무릎을 굴곡하고 시작 자세로 돌아온다.',
          jointDirectionsKo: [
            '이동 측 고관절·슬관절 굴곡 복귀',
            '골반 후방경사나 좌우 흔들림 없이 천골 중립 유지',
          ],
          supportPointsKo: ['후두부', '흉추', '천골', '양발 발바닥 전체'],
          apparatusInteractionKo:
            '뒤꿈치를 매트 표면에서 떼지 않고 매끄럽게 당겨 양발 평행 지지 상태로 복귀한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 골반 흔들림 없이 발을 시작 위치로 회수한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-heel-slide-ankle',
        targetPatternVariantIds: ['adult-supine-heel-slide'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-heel-slide',
            summaryKo:
              '카탈로그 메타데이터(mat, supine, [neutral])와 2D rig(supine-heel-slide-ankle), 연속 초안(adult-supine-heel-slide)의 매트 수평 슬라이드 방향(ankle x: 244 -> 284 -> 244, y: 144 고정)이 일치한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-heel-slide-ankle',
            summaryKo:
              '2D rig에서 무릎-발목(정강이) 분절 길이가 start(knee 214,104 ~ ankle 244,144 -> 약 50.1px)에서 middle(knee 244,128 ~ ankle 284,144 -> 약 42.8px)로 약 15% 단축된다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-heel-slide-ankle',
            summaryKo:
              '2D rig가 Foot Toe Touch·Ankle Circles와 아키타입을 공유하면서 수동 지정된 middle 좌표의 정강이 길이 비율이 일정하게 유지되지 않은 것으로 추정된다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-heel-slide-ankle',
            summaryKo:
              '2D rig middle 프레임의 정강이 분절 길이 축소(50.1px -> 42.8px)는 강체 분절 일관성 검증을 통과하지 못하며, 좌우 다리 교대 표현은 아직 미포함 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-heel-slide-ankle의 middle phase에서 knee-ankle 거리가 start(약 50px)와 동일하게 유지되도록 ankle x좌표 또는 knee 좌표를 보정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-knee-fold',
      track: 'track-a-mat',
      rankInTrack: 5,
      nameKo: '니 폴드',
      nameEn: 'Alternating Knee Fold',
      apparatus: 'mat',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'cuh-pilates-knee-fold-leaflet-2023',
          title: 'Pilates: exercises and principles (Scissors Level 1 / Knee Fold)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256: b4da231802eb2642573fb91f7a380d99e2d248697c0976f57d7db733c18f62de)에 검증된 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-knee-fold-pdf',
          title: 'Exercises for Back Pain (Supine Knee Lift in Neutral Spine)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 물리치료 교육 PDF.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '바로 누운 자세(Supine)에서 양 무릎을 세우고 양발을 엉덩이 너비로 매트에 평행하게 둔다. 골반과 요추는 중립을 유지하고 양팔은 몸통 옆에 길게 내려놓는다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 유지',
            '양측 고관절·슬관절 굴곡 및 발바닥 지면 지지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추',
            '천골(Sacrum)',
            '양발 발바닥 전체',
          ],
          apparatusInteractionKo:
            '한쪽 다리를 들기 전 반대쪽 발바닥과 천골의 매트 지지 압력을 균등하게 유지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 골반 중립과 복부 심부 지지를 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 골반이 기울거나 회전하지 않게 유지하면서 한쪽 다리를 고관절에서 접어 들어 올려 무릎이 고관절 바로 위에 오고 정강이가 바닥과 수평인 단일 다리 테이블탑 자세를 만든다.',
          jointDirectionsKo: [
            '거상 측 고관절 굴곡 및 슬관절 테이블탑 수평 유지',
            '지지 측 고관절·슬관절 굴곡 및 발바닥 매트 고정',
            '골반 좌우 회전 및 요추 전만 변화 억제',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추',
            '천골(Sacrum)',
            '지지 측 발바닥(거상 측 발은 공중)',
          ],
          apparatusInteractionKo:
            '지지하는 발바닥이 매트를 과도하게 밀어 골반이 들리지 않도록 가벼운 지면 접촉과 코어 지지를 병행한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 한쪽 무릎을 테이블탑으로 들어 올리고, 정점에서 코로 들쉬며(Inhale) 골반 수평을 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 고관절을 신전하여 들었던 발을 매트 시작 위치로 부드럽게 내려놓고, 양발 지지 상태에서 반대쪽 다리 교대를 준비한다.',
          jointDirectionsKo: [
            '거상 측 고관절 원심성 신전으로 발바닥 매트 착지',
            '발 착지 순간 요추 들뜸 및 골반 전방경사 억제',
          ],
          supportPointsKo: ['후두부', '흉추', '천골', '양발 발바닥 전체'],
          apparatusInteractionKo:
            '발바닥이 매트에 닿을 때 쿵 소리가 나지 않도록 끝까지 고관절 굴곡근과 복부를 조절하여 내려놓는다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 발을 매트에 내려놓고 들쉬며 반대쪽 다리 시작을 준비한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-knee-fold',
        targetPatternVariantIds: ['supine-knee-fold'],
        facts: [
          {
            category: 'fact',
            targetId: 'supine-knee-fold',
            summaryKo:
              '2D rig(supine-knee-fold)의 middle 단계는 knee(186,92)·ankle(230,92)로 정강이가 바닥과 평행한 테이블탑을 정확히 표현한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-knee-fold',
            summaryKo:
              '반면 연속 초안(supineDrafts.ts의 supine-knee-fold)은 굽힌 다리 전체를 hip around 단일 회전(-0.68 rad)시켜 정점(p=0.5)에서 무릎 높이(z:112)보다 발목 높이(z:78.6)가 33.4 유닛 낮게 처진다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-knee-fold',
            summaryKo:
              '연속 초안 생성 시 고관절 굴곡과 함께 정강이를 수평 테이블탑으로 들어 올리는 슬관절 상대 각도 보정이 누락된 것으로 분석된다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-knee-fold',
            summaryKo:
              '연속 초안(supine-knee-fold)의 정점 발목 처짐(z:78.6 vs knee z:112)과 편측 단일 다리 반복(NameEn "Alternating Knee Fold" 대비 좌우 교대 미구현)은 추가 보정이 필요하다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supineDrafts.ts의 supine-knee-fold에서 정점(p=0.5)의 ankle z좌표가 knee z좌표(약 112)와 수평을 이루도록 슬관절 각도를 함께 보간할 것.',
          'Alternating Knee Fold 명칭에 맞추어 연속 모션에 좌·우 다리 교대 주기를 반영할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-side-leg-lift',
      track: 'track-a-mat',
      rankInTrack: 6,
      nameKo: '옆으로 누워 다리 들기',
      nameEn: 'Side-Lying Leg Lift',
      apparatus: 'mat',
      bodyPosition: 'side-lying',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'cuh-pilates-side-lying-leaflet-2023',
          title: 'Pilates: exercises and principles (Side-Lying Leg Lift & Alignment)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'pilates-return-to-life-side-kick-series-1945',
          title: 'Return to Life Through Contrology — Side Kick Series (Up and Down)',
          publisher: 'J.H. Pilates & W.J. Miller (Public Domain 1945 Edition)',
          directUrl: 'https://pilatesology.com/blog/side-kick-series/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 옆으로 누운 정렬(머리·어깨·골반 수직 적층) 및 위쪽 다리 외전 거상/내전 하강 시 골반 고정 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '매트에 옆으로 누워(Side-Lying) 아래쪽 팔로 머리를 받치고, 양쪽 어깨와 양쪽 골반이 수직으로 포개지도록 정렬한다. 위쪽 다리는 몸통 연장선으로 길게 뻗어 아랫 옆구리에 미세한 공간을 유지한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 측방 중립 정렬(아랫 옆구리 꺼짐 억제)',
            '위쪽 고관절·슬관절 신전 및 중립 회전',
            '아래쪽 다리는 지지 안정성을 위해 살짝 굽히거나 일직선으로 지지',
          ],
          supportPointsKo: [
            '아래쪽 측두부/아래 팔',
            '아래쪽 측면 흉곽 및 대전자(Greater Trochanter)',
            '아래쪽 다리 측면(및 앞쪽 가슴 앞 매트를 짚은 위쪽 손)',
          ],
          apparatusInteractionKo:
            '매트 바닥에서 아래쪽 골반(대전자)과 측면 흉곽을 지지점으로 삼고, 위쪽 손끝은 가슴 앞 매트를 가볍게 짚어 회전을 방지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 정수리부터 위쪽 발끝까지 축 신장(Axial Elongation)을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 위쪽 골반이 갈비뼈 쪽으로 딸려 올라가지 않는 범위(고관절 외전 가동범위)까지 위쪽 다리를 무릎을 편 채 길게 들어 올린다.',
          jointDirectionsKo: [
            '위쪽 고관절 순수 외전(Hip Abduction) 및 슬관절 신전 유지',
            '요추 측굴(옆구리 찌그러짐) 및 골반 전·후방 회전 억제',
          ],
          supportPointsKo: [
            '아래쪽 팔/머리',
            '아래쪽 측면 흉곽',
            '아래쪽 대전자 및 아래쪽 다리 외측면',
          ],
          apparatusInteractionKo:
            '다리를 들어 올릴 때 아랫 옆구리가 매트 바닥으로 무너지지 않도록 위쪽 다리를 벽 쪽으로 길게 뻗어내며 거상한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 위쪽 다리를 길게 들어 올리고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡과 함께 위쪽 다리를 길게 뻗은 채 천천히 내전하여 시작 높이(골반 너비 또는 아래 다리 위)로 내려놓는다.',
          jointDirectionsKo: [
            '위쪽 고관절 원심성 내전(Hip Adduction) 복귀',
            '하강 중에도 골반 수직 적층 및 척추 중립 유지',
          ],
          supportPointsKo: [
            '아래쪽 팔/머리',
            '아래쪽 측면 흉곽 및 대전자',
            '아래쪽 다리 및 시작 위치로 돌아온 위쪽 다리',
          ],
          apparatusInteractionKo:
            '다리를 중력에 맡겨 툭 떨어뜨리지 않고 안쪽 허벅지와 둔근 조절로 매트/아래 다리 높이까지 내려놓는다.',
          breathingKo:
            '내쉬거나 들쉬며(Exhale/Inhale) 몸통 길이를 유지한 채 다리를 시작 위치로 복귀시킨다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'side-lying-leg-press-sweep',
        targetPatternVariantIds: ['side-lying-straight-leg-lift'],
        facts: [
          {
            category: 'fact',
            targetId: 'side-lying-leg-press-sweep',
            summaryKo:
              '2D rig(side-lying-leg-press-sweep)는 아래쪽 지지 다리를 살짝 굽혀(farKnee: 218,148 / farAnkle: 268,154) 그리며, 위쪽 다리를 ankle y: 126 -> 84 -> 124로 외전 거상·하강시킨다.',
          },
          {
            category: 'fact',
            targetId: 'side-lying-straight-leg-lift',
            summaryKo:
              '연속 초안(sideLyingDrafts.ts의 side-lying-straight-leg-lift)은 아래쪽 지지 다리도 완전히 편 상태(rightKnee/rightAnkle 일직선)로 구현하고 카탈로그에 없는 head-pad prop을 렌더링한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'original-mat-side-leg-lift',
            summaryKo:
              '아래 다리 굴곡(물리치료/초급 변형)과 양다리 신전(고전 변형) 모두 교육적으로 존재하나, 2D rig와 연속 초안 간 아래 다리 자세 기준을 하나로 통일할 필요가 있다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'side-lying-straight-leg-lift',
            summaryKo:
              '2D rig(아래 다리 굴곡)와 연속 초안(아래 다리 신전 + 비표준 head-pad prop) 간 지지 기저면 표현이 서로 일치하지 않는다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          '카탈로그 regression 큐("아래 다리를 더 넓게 구부려 지지면을 키웁니다")와 2D rig에 맞추어 표준/초급 아래 다리 자세 기준을 통일하고, 연속 초안의 비카탈로그 head-pad prop 표시 여부를 정리할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-clam',
      track: 'track-a-mat',
      rankInTrack: 7,
      nameKo: '사이드 클램',
      nameEn: 'Side-Lying Clam',
      apparatus: 'mat',
      bodyPosition: 'side-lying',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'cuh-pilates-clam-leaflet-2023',
          title: 'Pilates: exercises and principles (The Clam — Level 1)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256 검증 스냅샷)에 등록된 공개 병원 교육 자료(옆으로 누워 양 무릎 굴곡, 양발 뒤꿈치 붙이고 골반 고정 상태에서 위쪽 무릎 외회전).',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ruh-nhs-gluteal-clam-exercises-pdf',
          title: 'Gluteal Tendinopathy / Hip Rehabilitation Exercises (Side-Lying Clam)',
          publisher: 'Royal United Hospitals Bath NHS Foundation Trust',
          directUrl:
            'https://www.ruh.nhs.uk/patients/patient_information/PHY091_Gluteal_Tendinopathy.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 옆으로 누워 무릎 굴곡·양발 접촉 상태에서 골반 후방회전 없이 위쪽 무릎만 여닫는 클램 동작 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '옆으로 누워(Side-Lying) 머리를 아래 팔에 지지하고 귀·어깨·골반·발뒤꿈치가 일직선상에 놓이게 한 뒤, 양 고관절과 무릎을 앞으로 굽혀 포개어 놓는다. 상체와 팔은 고정한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 수직 적층 유지',
            '양측 고관절 및 슬관절 굴곡 상태에서 무릎과 발안쪽/뒤꿈치 밀착',
            '상지 및 흉곽 회전 고정',
          ],
          supportPointsKo: [
            '아래쪽 팔/머리',
            '아래쪽 측면 흉곽 및 대전자',
            '아래쪽 허벅지·무릎·정강이 외측면',
            '서로 맞닿은 양발 안쪽/뒤꿈치',
          ],
          apparatusInteractionKo:
            '매트 위에서 아래쪽 다리 외측면 전체를 지지면으로 삼고 양발 뒤꿈치를 경첩(Hinge)처럼 서로 붙여 둔다.',
          breathingKo:
            '코로 들쉬며(Inhale) 위쪽 골반이 뒤로 넘어가지 않도록 복부와 옆구리를 정렬한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 양발 안쪽/뒤꿈치를 서로 붙인 채 골반과 상체는 전혀 뒤로 회전하지 않고 위쪽 고관절만 외회전하여 위쪽 무릎을 조개껍데기 열듯 들어 올린다.',
          jointDirectionsKo: [
            '위쪽 고관절 외회전 및 외전(Hip External Rotation & Abduction)',
            '양발 뒤꿈치 접촉 유지 및 슬관절 굴곡 각도 유지',
            '골반 후방 회전 및 흉추 회전 엄격 억제(팔은 제자리 유지)',
          ],
          supportPointsKo: [
            '아래쪽 팔/머리 및 측면 흉곽',
            '아래쪽 대전자 및 아래쪽 무릎/정강이 외측면',
            '맞닿은 양발 뒤꿈치 경첩점',
          ],
          apparatusInteractionKo:
            '아래쪽 무릎은 매트를 누르며 고정하고 양발 뒤꿈치 접촉점을 축으로 위쪽 무릎만 공중으로 열린다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 골반을 고정한 채 위쪽 무릎을 들어 올리고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬거나 들쉬는 조절 호흡으로 위쪽 고관절을 천천히 내회전하여 위쪽 무릎을 아래쪽 무릎 위에 부드럽게 포개어 내려놓는다.',
          jointDirectionsKo: [
            '위쪽 고관절 원심성 내회전 복귀',
            '골반 수직 적층 및 상체 고정 유지',
          ],
          supportPointsKo: [
            '아래쪽 팔/머리 및 측면 흉곽',
            '아래쪽 대전자 및 다리 외측면',
            '다시 포개어진 양 무릎과 양발 뒤꿈치',
          ],
          apparatusInteractionKo:
            '위쪽 무릎이 아래쪽 무릎에 닿을 때까지 둔근의 원심성 조절을 유지한다.',
          breathingKo:
            '조절된 호흡과 함께 무릎을 닫아 시작 자세로 복귀한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'mat-clam-isolated',
        targetPatternVariantIds: ['side-lying-clam'],
        facts: [
          {
            category: 'fact',
            targetId: 'mat-clam-isolated',
            summaryKo:
              '2D rig mat-clam-isolated는 기존 공유 아키타입(side-lying-clam-open-book)에서 오픈 북의 팔 회전을 제거하여 middle 단계에서 위쪽 무릎(knee y: 152 -> 104)만 열리고 손(hand: 176,136)과 상체는 시작 위치를 유지한다.',
          },
          {
            category: 'fact',
            targetId: 'side-lying-clam',
            summaryKo:
              '연속 초안(sideLyingDrafts.ts의 side-lying-clam) 또한 상체와 팔을 고정한 채 위쪽 무릎만 여닫으나, 카탈로그에 없는 head-pad 소도구를 함께 렌더링한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'mat-clam-isolated',
            summaryKo:
              '2D rig에서 상지 회전 누수는 분리되었으나, startJoints의 farShoulder·farElbow·farWrist가 위쪽 팔 좌표와 완전히 동일하게 겹쳐져 있어 아래쪽 지지 팔(머리 받침 팔)이 별도로 구분되지 않는다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'mat-clam-isolated',
            summaryKo:
              '2D rig(mat-clam-isolated)의 개략 좌표·가동범위(ROM)는 실측 해부학 검증이 완료되지 않았으며, 연속 초안(side-lying-clam)의 비표준 head-pad 소도구 표기도 미검증 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'mat-clam-isolated에서 아래쪽 지지 팔(farShoulder/farElbow/farWrist)을 머리 아래 지지 위치로 분리하여 위쪽 팔과 겹치지 않게 표현할 것.',
          'side-lying-clam 연속 초안의 비카탈로그 head-pad 소도구 표기 여부를 카탈로그 props와 일치시킬 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-open-book',
      track: 'track-a-mat',
      rankInTrack: 8,
      nameKo: '사이드 오픈 북',
      nameEn: 'Side-Lying Open Book',
      apparatus: 'mat',
      bodyPosition: 'side-lying',
      spinalPlanes: ['rotation'],
      sources: [
        {
          sourceId: 'cuh-pilates-open-book-leaflet-2023',
          title: 'Pilates: exercises and principles (Arm Openings / Open Book)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 교육 자료(옆으로 누워 양 무릎을 포개어 바닥에 고정하고 위쪽 팔과 흉추만 회전).',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'csp-thoracic-mobility-open-book-guide',
          title: 'Thoracic Spine Mobility: Side-Lying Arm Openings (Open Book)',
          publisher: 'Chartered Society of Physiotherapy / NHS Musculoskeletal Guidance',
          directUrl:
            'https://www.torbayandsouthdevon.nhs.uk/uploads/24912.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 옆으로 누워 양 무릎을 모아 고정한 상태에서 위쪽 팔을 천장을 거쳐 반대편으로 열며 흉추 회전을 유도하는 호흡·자세 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '옆으로 누워(Side-Lying) 양 고관절과 무릎을 앞으로 굽혀 포개어 매트에 두고, 양팔을 가슴 앞 바닥에서 나란히 포개어 뻗는다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 굴곡 및 양 무릎·발목 상하 밀착 고정',
            '양측 견관절 전방 굴곡으로 양손바닥 마주 포갬',
            '경추·흉추·요추 중립 정렬',
          ],
          supportPointsKo: [
            '측두부(또는 베개/아래 팔 지지)',
            '아래쪽 측면 흉곽 및 아래 팔',
            '아래쪽 대전자 및 포개어진 양 다리(무릎·정강이·발)',
          ],
          apparatusInteractionKo:
            '매트 바닥에 아래쪽 다리와 그 위에 포개어진 위쪽 무릎을 무겁게 붙여 하체 회전 축을 고정한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 위쪽 팔을 천장 쪽으로 들어 올릴 준비를 한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 양 무릎과 골반은 앞쪽 매트에 포개어 고정한 채, 시선과 함께 위쪽 팔을 천장을 거쳐 등 뒤 반대편 바닥 쪽으로 크게 열어 상부·중부 흉추를 회전시킨다.',
          jointDirectionsKo: [
            '흉추 회전(Thoracic Rotation) 및 경추 자연스러운 동반 회전',
            '위쪽 견관절 수평 외전(Horizontal Abduction)으로 반대편 바닥 리치',
            '골반 및 양 무릎은 전방 포갬 유지(위쪽 무릎이 들리거나 벌어지지 않음)',
          ],
          supportPointsKo: [
            '후두부/측두부',
            '매트 쪽으로 회전하여 넓어진 양측 견갑대 방향 등 상부',
            '아래쪽 대전자 및 포개어 고정된 양 무릎·양발',
          ],
          apparatusInteractionKo:
            '흉추가 반대편 매트 쪽으로 열리는 동안 두 무릎이 서로 떨어지거나 위쪽 무릎이 들리지 않도록 하체를 매트에 고정한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 갈비뼈와 흉추를 부드럽게 회전해 가슴을 열고, 열린 정점에서 코로 깊게 들쉬며(Inhale) 앞가슴과 흉곽을 확장한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 갈비뼈와 흉추를 먼저 되돌리면서 위쪽 팔을 천장을 거쳐 다시 앞쪽 손 위로 포개어 시작 자세로 복귀한다.',
          jointDirectionsKo: [
            '흉추 회전에서 측면 중립으로 복귀',
            '위쪽 견관절 수평 내전으로 양손 포갬 복원',
            '양 무릎 및 골반 고정 유지',
          ],
          supportPointsKo: [
            '측두부',
            '아래쪽 측면 흉곽 및 양팔',
            '아래쪽 대전자 및 포개어진 양 다리',
          ],
          apparatusInteractionKo:
            '하체 지지점을 끝까지 유지한 채 팔과 몸통을 부드럽게 닫아 시작 정렬로 돌아온다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 위쪽 팔과 흉곽을 닫아 시작 자세로 복귀한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'mat-open-book-isolated',
        targetPatternVariantIds: ['side-lying-open-book'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-open-book',
            summaryKo:
              '카탈로그 큐잉은 옆으로 누워 무릎을 포개어 유지한 채 위쪽 팔과 흉곽을 반대편으로 천천히 열어 회전하도록 정의한다.',
          },
          {
            category: 'fact',
            targetId: 'mat-open-book-isolated',
            summaryKo:
              '2D rig mat-open-book-isolated는 middle 단계에서 위쪽 무릎(knee: 214,152)을 고정하고 위쪽 손(hand: 176,136 -> 38,62)과 상체만 열어 클램 무릎 거상 누수를 분리하였다.',
          },
          {
            category: 'fact',
            targetId: 'side-lying-open-book',
            summaryKo:
              '연속 초안(sideLyingDrafts.ts의 side-lying-open-book)도 양 무릎을 고정하고 상체·팔만 회전시키나, 카탈로그에 없는 head-pad 소도구를 포함한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'mat-open-book-isolated',
            summaryKo:
              'mat-open-book-isolated의 start 단계에서 위쪽 손(hand: 176,136)이 어깨(shoulder: 102,126)보다 골반/무릎 쪽(x:176)에 치우쳐 있어, 가슴 앞 수직 전방으로 양팔을 나란히 포개는 표준 준비 자세와 시각적 차이가 있다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'mat-open-book-isolated',
            summaryKo:
              '2D rig(mat-open-book-isolated)의 시작 팔 위치(hand x:176)와 회전 시 상완·전완 길이 비율 변화(start 상완+전완 합 약 80px -> middle 약 102px)는 해부학적 실측 검증이 완료되지 않았다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'mat-open-book-isolated의 start/middle/end 단계에서 상완(shoulder-elbow) 및 전완(elbow-wrist) 분절 길이가 일정하게 유지되도록 middle 손/팔꿈치 좌표를 보정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-quadruped-reach',
      track: 'track-a-mat',
      rankInTrack: 9,
      nameKo: '네발기기 팔·다리 리치',
      nameEn: 'Quadruped Reach',
      apparatus: 'mat',
      bodyPosition: 'quadruped',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'cuh-pilates-quadruped-swimming-leaflet-2023',
          title: 'Pilates: exercises and principles (Four-Point Kneeling / Swimming Level 1 & 2)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256: b4da231802eb2642573fb91f7a380d99e2d248697c0976f57d7db733c18f62de)에 검증된 네발기기 팔·다리 슬라이드/리치 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-quadruped-reach-pdf',
          title: 'Exercises for Back Pain (Four-Point Kneeling Arm & Leg Reach)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 물리치료 교육 PDF.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '네발기기 자세(Quadruped)에서 양손은 어깨 바로 아래, 양 무릎은 고관절 바로 아래 매트에 두고 머리부터 꼬리뼈까지 중립 척추 테이블 정렬을 만든다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 유지(시선은 매트 바닥)',
            '견관절 및 고관절 수직 지지 정렬, 견갑골 전인·후인 중립 안정화',
          ],
          supportPointsKo: [
            '양손 손바닥 전체',
            '양측 무릎 및 정강이 전면/발등',
          ],
          apparatusInteractionKo:
            '매트 바닥을 양손으로 밀어내어 날개뼈 사이가 꺼지지 않게 하고 네 지지점에 체중을 균등 분배한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 복부를 가볍게 들어 올려 요추와 골반 중립을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 몸통과 골반이 좌우로 기울거나 허리가 꺾이지 않게 유지하며, 기본(Level 1)에서는 팔 또는 다리 하나를 바닥을 따라 길게 뻗고, 진행(Progression / Bird-Dog)에서는 반대쪽 팔과 다리를 수평으로 뻗는다.',
          jointDirectionsKo: [
            '리치 측 견관절 굴곡(팔 전방 리치) 또는 고관절·슬관절 신전(다리 후방 리치)',
            '지지 측 어깨·고관절 수직 안정화 유지',
            '요추 과신전 및 골반 회전/체중 쏠림 억제',
          ],
          supportPointsKo: [
            '지지 측 손바닥',
            '지지 측 무릎 및 정강이',
            'Level 1 바닥 슬라이드 시 리치 측 손끝 또는 발끝 바닥 접촉',
          ],
          apparatusInteractionKo:
            '지지점이 3점(또는 대각선 2점)으로 줄어드는 동안 매트를 짚은 손과 무릎으로 바닥을 밀어 몸통 수평을 지킨다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 지지를 유지한 채 팔·다리를 길게 뻗고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬거나 들쉬는 조절 호흡으로 뻗었던 팔·다리를 바닥을 스치듯 당겨 어깨와 고관절 아래 시작 네발기기 위치로 내려놓는다.',
          jointDirectionsKo: [
            '리치 측 견관절 신전 복귀 및 고관절·슬관절 굴곡 복귀',
            '사지 복귀 중 척추·골반 중립 유지',
          ],
          supportPointsKo: ['양손 손바닥 전체', '양측 무릎 및 정강이'],
          apparatusInteractionKo:
            '손과 무릎이 매트에 다시 닿을 때 체중이 급격히 쏠리지 않도록 부드럽게 4점 지지로 복귀한다.',
          breathingKo:
            '조절된 호흡으로 시작 네발기기 정렬로 돌아온 뒤 반대쪽을 준비한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'quadruped-reach-slide',
        targetPatternVariantIds: ['quadruped-arm-slide', 'quadruped-leg-slide'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-quadruped-reach',
            summaryKo:
              '카탈로그 standard 큐는 "팔 또는 다리 하나를 바닥을 따라 길게 뻗고"(단일 사지 바닥 슬라이드)이며, 대각선 동시 거상은 progression 큐("반대쪽 팔과 다리를 함께 길게 뻗어")에 정의되어 있다.',
          },
          {
            category: 'fact',
            targetId: 'quadruped-reach-slide',
            summaryKo:
              '2D rig(quadruped-reach-slide)는 middle 단계에서 팔과 다리를 동시에 공중으로 높이 들어 올리는 Bird-Dog(hand y: 150 -> 72, ankle y: 150 -> 82)를 그린다.',
          },
          {
            category: 'fact',
            targetId: 'quadruped-arm-slide',
            summaryKo:
              '반면 연속 초안(quadruped-arm-slide, quadruped-leg-slide)은 팔만 바닥을 따라 미끄러지거나 다리만 바닥을 따라 미끄러지는 단일 사지 슬라이드로 나뉘어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'original-mat-quadruped-reach',
            summaryKo:
              '카탈로그 standard 문구(단일 사지 바닥 슬라이드)와 2D rig(대각선 공중 Bird-Dog), 연속 초안(팔/다리 개별 바닥 슬라이드) 사이에 기본 단계(standard vs progression) 기준이 어긋나 있다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'quadruped-reach-slide',
            summaryKo:
              '2D rig middle 프레임의 공중 대각선 거상(hand y:72, ankle y:82)은 카탈로그 standard("팔 또는 다리 하나를 바닥을 따라") 및 연속 초안(바닥 슬라이드)과 단계 수준이 일치하지 않는다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'original-mat-quadruped-reach의 기본 도해를 바닥 슬라이드(Level 1)로 통일할지, 대각선 공중 리치(Bird-Dog)로 통일할지 결정하여 2D rig와 연속 초안의 사지 높이(z/y)를 일치시킬 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-mat-swan-prep',
      track: 'track-a-mat',
      rankInTrack: 10,
      nameKo: '매트 스완 준비',
      nameEn: 'Mat Swan Preparation',
      apparatus: 'mat',
      bodyPosition: 'prone',
      spinalPlanes: ['extension'],
      sources: [
        {
          sourceId: 'cuh-pilates-swan-dive-prep-leaflet-2023',
          title: 'Pilates: exercises and principles (Swan Dive Level 1 / Breaststroke Prep)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json(SHA-256 검증 스냅샷)에 등록된 엎드린 상부 흉추 신전(Swan Dive Level 1) 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-swan-prep-reference',
          title: 'Back Extension in Pilates: Swan Prep Mechanics',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/back-extension-in-pilates/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 제한으로 외부 본문 직접 열람은 차단되었으나, 공개 검색 스니펫 및 병원 리플릿으로 엎드린 자세 전완/손 지지 상부 흉추 신전 원리를 교차 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '엎드린 자세(Prone)에서 이마/코끝을 매트 가까이 두고 양손과 전완을 어깨 옆 매트에 가볍게 지지한다. 양다리는 뒤로 길게 뻗어 발등을 매트에 내려놓고 치골을 매트에 부드럽게 밀착한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 중립 및 치골 매트 지지(요추 과전만 예방)',
            '견관절 외전·주관절 굴곡으로 손바닥과 전완을 어깨 옆 매트에 배치',
            '양측 고관절·슬관절 신전 및 양발 매트 지지',
          ],
          supportPointsKo: [
            '양손 손바닥 및 전완',
            '전방 하부 흉곽, 복부 및 치골(Pubic Bone)',
            '양측 대퇴 전면 및 발등',
          ],
          apparatusInteractionKo:
            '매트 바닥에 양손/전완과 치골, 양발등을 지지점으로 두고 어깨가 귀 쪽으로 올라가지 않게 날개뼈를 끌어내린다.',
          breathingKo:
            '코로 들쉬며(Inhale) 정수리를 앞으로 길게 뽑아내듯 축 신장을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 큐에 맞추어 복부를 들어 올려 요추를 보호하면서, 전완과 손으로 매트를 가볍게 밀고 앞으로 당기듯 지지하여 머리와 상부 흉추만 부드럽게 신전해 가슴을 들어 올린다.',
          jointDirectionsKo: [
            '상부·중부 흉추 신전(Thoracic Extension) 및 경추는 흉추 연장선 유지(턱 들림 금지)',
            '양손·전완은 어깨 옆/앞 매트에 지지 유지(뒤로 젖히지 않음)',
            '양다리 및 발목은 매트 바닥에 길게 고정(발이 공중으로 들리지 않음)',
          ],
          supportPointsKo: [
            '양손 손바닥 및 전완(매트 지지)',
            '하부 흉곽·복부 및 치골',
            '양측 대퇴 전면 및 매트에 고정된 발등',
          ],
          apparatusInteractionKo:
            '손과 전완을 매트 바닥에서 떼어 뒤로 휘젓지 않고 매트에 둔 채 흉골을 전방 상방으로 길게 연결한다.',
          breathingKo:
            '가슴을 앞으로 길게 여는 동안 코로 들쉬거나(Inhale) 내쉬며(Exhale) 복부 지지로 요추 압박을 방지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '호흡을 정리하며 복부 지지를 유지한 채 하부 갈비뼈부터 상부 흉추, 이마 순으로 척추를 길게 늘이며 매트 시작 자세로 내려온다.',
          jointDirectionsKo: [
            '흉추 신전에서 중립으로 원심성 복귀',
            '전완·손 및 양발 매트 지지 불변',
          ],
          supportPointsKo: [
            '양손 손바닥 및 전완',
            '전방 흉곽·치골',
            '양측 대퇴 전면 및 발등',
          ],
          apparatusInteractionKo:
            '상체를 내려놓을 때도 어깨가 말리지 않게 쇄골 너비를 유지하며 매트에 안착한다.',
          breathingKo:
            '내쉬거나 들쉬며(Exhale/Inhale) 척추 길이를 유지한 채 시작 자세로 완전히 복귀한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'prone-swan-pulling-straps-swimming',
        targetPatternVariantIds: ['prone-forearm-chest-extension-v1'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-mat-swan-prep',
            summaryKo:
              '카탈로그 standard 큐는 "엎드려 손이나 전완을 가볍게 두고... 상부 흉추만 부드럽게 들어 올립니다"라고 정의한다.',
          },
          {
            category: 'fact',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '그러나 공유 2D rig(prone-swan-pulling-straps-swimming)는 Reformer Pulling Straps·Swimming과 합쳐져 있어 middle 단계에서 손이 머리 앞(x:46, y:126)에서 골반 뒤(x:184, y:96, 이동량 약 141px)로 크게 휘둘러지고 발목도 공중으로 들린다(ankle y: 144 -> 128).',
          },
          {
            category: 'fact',
            targetId: 'prone-forearm-chest-extension-v1',
            summaryKo:
              '연속 초안(prone-forearm-chest-extension-v1)은 motionAuthoringBatch.ts에서 mismatched로 분류되어 있으며, 전완 지지(forearm prop) 상태로 발목은 바닥에 고정되어 2D rig와 팔·다리 궤적이 전혀 다르다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '전완/손 매트 지지 동작인 Mat Swan Prep을 스트랩 후방 당김 동작(Pulling Straps) 및 사지 거상 동작(Swimming)과 동일한 2D rig에 묶으면서 지지점(Base of Support) 자체가 왜곡되었다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '2D rig middle 프레임의 양팔 후방 스윕(hand x: 46 -> 184)과 발목 거상(ankle y: 144 -> 128)은 Mat Swan Preparation의 카탈로그 정의 및 교육 근거와 불일치(mismatched)한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'prone-swan-pulling-straps-swimming에서 Mat Swan Prep 전용 2D rig(prone-mat-swan-prep)를 분리하여 양손/전완(hand/elbow)을 어깨 앞·옆 매트에 유지하고 발목(ankle y:144)도 매트에 고정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
  ] as const;
