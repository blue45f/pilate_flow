import { HONEST_DEFAULT_TRUTHFULNESS_FLAGS } from './trackAMatEvidence';
import type { MotionEvidenceReviewRecord } from './types';

export const TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [
  {
    "exerciseId": "original-reformer-supine-breath",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 1,
    "nameKo": "캐리지 호흡 & 암 아크",
    "nameEn": "Carriage Breath and Arm Arc",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-reformer-supine-breath",
      "nameKo": "캐리지 호흡 & 암 아크",
      "nameEn": "Carriage Breath and Arm Arc",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-original-reformer-supine-breath",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Carriage Breath and Arm Arc)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-original-reformer-supine-breath",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Carriage Breath and Arm Arc)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 안정된 캐리지 위에서 호흡을 관찰하고 스트랩 없이 팔을 작은 원호로 움직입니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐리지 호흡 & 암 아크의 핵심 가동 구간(안정된 캐리지 위에서 호흡을 관찰하고 스트랩 없이 팔을 작은 원호로 움직입니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "호흡·어깨·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 손끝이 천장(x:120,y:74)에서 머리 위 사선(x:56,y:70)으로 이동하며 요추가 매트로 밀착됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 양팔이 큰 원호를 그리며 골반 옆(x:166,y:138)으로 내려오고 골반이 중립(y:142)으로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "호흡",
        "어깨",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 호흡, 어깨, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "안정된 캐리지 위에서 호흡을 관찰하고 스트랩 없이 팔을 작은 원호로 움직입니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 캐리지·스토퍼·풋바·스트랩을 확인합니다. 스프링은 제조사 지침과 대상자에 맞게 강사가 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔을 내려놓고 호흡만 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-breath-pelvic-clock\" · 수파인 호흡 · 골반 시계 & 흉곽 암 아크)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐리지 호흡 & 암 아크의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: mid)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-breath-pelvic-clock",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-reformer-supine-breath",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"supine-breath-pelvic-clock\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-breath-pelvic-clock",
          "summaryKo": "2D rig(supine-breath-pelvic-clock)는 손끝이 천장(x:120,y:74)에서 머리 위 사선(x:56,y:70)으로 이동하며 요추가 매트로 밀착됩니다. 및 고정 지지점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-breath-pelvic-clock",
          "summaryKo": "단일 2D 평면 투영 도해(supine-breath-pelvic-clock) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-reformer-supine-breath",
          "summaryKo": "캐리지 호흡 & 암 아크의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-breath-pelvic-clock 도해에서 캐리지 호흡 & 암 아크(original-reformer-supine-breath)의 핵심 지지점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-breath-pelvic-clock 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-table-breath",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 2,
    "nameKo": "캐딜락 테이블 호흡",
    "nameEn": "Cadillac Table Breath",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-cadillac-table-breath",
      "nameKo": "캐딜락 테이블 호흡",
      "nameEn": "Cadillac Table Breath",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-table-breath",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Table Breath)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-table-breath",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Table Breath)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 스프링을 사용하지 않고 테이블 위 지지와 편안한 호흡을 관찰합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(캐딜락 테이블 위 골반(pelvis: 182,140), 뒤꿈치(heel: 248,145), 손(hand: 146,132 · 스프링 미연결)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 테이블 호흡의 핵심 가동 구간(스프링을 사용하지 않고 테이블 위 지지와 편안한 호흡을 관찰합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "호흡·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 스프링 미사용 상태에서 양손(146,132)과 뒤꿈치(248,145)를 테이블에 고정한 채 들숨 흉곽(126,138→126,132) 확장을 관찰합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 팔·다리 움직임 없이 날숨에 흉곽(126,132→126,135)과 어깨가 테이블 위에서 편안히 가라앉는 흐름을 관찰합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "호흡",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 호흡, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "스프링을 사용하지 않고 테이블 위 지지와 편안한 호흡을 관찰합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(머리와 무릎 아래 지지를 조정합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"cadillac-table-breath-isolated\" · 캐딜락 테이블 호흡 · 스프링 미사용 테이블 지지 & 순수 흉곽 호흡 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 테이블 호흡의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "cadillac-table-breath-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-table-breath",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"cadillac-table-breath-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "cadillac-table-breath-isolated",
          "summaryKo": "2D rig(cadillac-table-breath-isolated)는 스프링 미사용 상태에서 양손(146,132)과 뒤꿈치(248,145)를 테이블에 고정한 채 들숨 흉곽(126,138→126,132) 확장을 관찰합니다. 및 고정 지지점(캐딜락 테이블 위 골반(pelvis: 182,140), 뒤꿈치(heel: 248,145), 손(hand: 146,132 · 스프링 미연결)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "cadillac-table-breath-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(cadillac-table-breath-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-table-breath",
          "summaryKo": "캐딜락 테이블 호흡의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "cadillac-table-breath-isolated 도해에서 캐딜락 테이블 호흡(original-cadillac-table-breath)의 핵심 지지점(캐딜락 테이블 위 골반(pelvis: 182,140), 뒤꿈치(heel: 248,145), 손(hand: 146,132 · 스프링 미연결)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, cadillac-table-breath-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-breath",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 3,
    "nameKo": "체어 시티드 호흡",
    "nameEn": "Chair Seated Breath",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-seated-breath",
      "nameKo": "체어 시티드 호흡",
      "nameEn": "Chair Seated Breath",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-breath",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Breath)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-breath",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Breath)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 좌면에 안정적으로 앉고 발을 바닥에 놓아 편한 호흡을 관찰합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(체어 시트 위 좌골(pelvis: 132,108), 바닥 뒤꿈치(heel: 198,176), 허벅지 위 양손(hand: 148,96)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 호흡의 핵심 가동 구간(좌면에 안정적으로 앉고 발을 바닥에 놓아 편한 호흡을 관찰합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "호흡·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 체어 시트 좌골(132,108)·바닥 뒤꿈치(198,176)·허벅지 위 손(148,96)을 고정한 채 들숨 흉곽(132,78→136,73) 확장을 관찰합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 팔·다리 움직임 없이 날숨에 흉곽(136,73→134,75)이 좌골 수직 중심 위에서 정돈되는 흐름을 관찰합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "호흡",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 호흡, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "좌면에 안정적으로 앉고 발을 바닥에 놓아 편한 호흡을 관찰합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발밑 지지와 앉은 위치를 조정합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-breath-isolated\" · 체어 시티드 호흡 · 시트 상단 좌골 착석 & 바닥 양발 접지 순수 호흡 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 호흡의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-breath-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-breath",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-seated-breath-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-breath-isolated",
          "summaryKo": "2D rig(chair-seated-breath-isolated)는 체어 시트 좌골(132,108)·바닥 뒤꿈치(198,176)·허벅지 위 손(148,96)을 고정한 채 들숨 흉곽(132,78→136,73) 확장을 관찰합니다. 및 고정 지지점(체어 시트 위 좌골(pelvis: 132,108), 바닥 뒤꿈치(heel: 198,176), 허벅지 위 양손(hand: 148,96)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-breath-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-breath-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-breath",
          "summaryKo": "체어 시티드 호흡의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-breath-isolated 도해에서 체어 시티드 호흡(original-chair-seated-breath)의 핵심 지지점(체어 시트 위 좌골(pelvis: 132,108), 바닥 뒤꿈치(heel: 198,176), 허벅지 위 양손(hand: 148,96)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-breath-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-standing-breath",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 4,
    "nameKo": "바렐 앞 스탠딩 호흡",
    "nameEn": "Standing Breath at Barrel",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-barrel-standing-breath",
      "nameKo": "바렐 앞 스탠딩 호흡",
      "nameEn": "Standing Breath at Barrel",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-standing-breath",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Standing Breath at Barrel)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-standing-breath",
        "title": "Supported Standing & Trunk Control Exercises (Standing Breath at Barrel)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바닥에 두 발을 두고 강사가 정한 고정 지지에 손을 가볍게 놓아 호흡을 관찰합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(래더 상단 가로대 손(hand: 88,76), 바닥 양발 뒤꿈치(heel: 140,176), 기립 골반(pelvis: 140,120)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 앞 스탠딩 호흡의 핵심 가동 구간(바닥에 두 발을 두고 강사가 정한 고정 지지에 손을 가볍게 놓아 호흡을 관찰합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "호흡·몸통·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 래더 가로대 위 손(88,76)과 바닥 뒤꿈치(140,176)를 고정한 채 들숨에 흉곽(138,84→142,79)의 입체적 확장을 관찰합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 카프 레이즈나 팔 이동(Δ0px) 없이 날숨에 발바닥 접지를 느끼며 흉곽(142,79→140,81)을 정돈합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "호흡",
        "몸통",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 호흡, 몸통, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에 두 발을 두고 강사가 정한 고정 지지에 손을 가볍게 놓아 호흡을 관찰합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(지지를 넓히거나 앉은 자세에서 호흡합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-standing-breath-isolated\" · 바렐 앞 스탠딩 호흡 · 래더 가로대 손 지지 & 평발 바닥 접지 순수 호흡 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 앞 스탠딩 호흡의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-standing-breath-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-standing-breath",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"barrel-standing-breath-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-standing-breath-isolated",
          "summaryKo": "2D rig(barrel-standing-breath-isolated)는 래더 가로대 위 손(88,76)과 바닥 뒤꿈치(140,176)를 고정한 채 들숨에 흉곽(138,84→142,79)의 입체적 확장을 관찰합니다. 및 고정 지지점(래더 상단 가로대 손(hand: 88,76), 바닥 양발 뒤꿈치(heel: 140,176), 기립 골반(pelvis: 140,120)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-standing-breath-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-standing-breath-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-standing-breath",
          "summaryKo": "바렐 앞 스탠딩 호흡의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-standing-breath-isolated 도해에서 바렐 앞 스탠딩 호흡(original-barrel-standing-breath)의 핵심 지지점(래더 상단 가로대 손(hand: 88,76), 바닥 양발 뒤꿈치(heel: 140,176), 기립 골반(pelvis: 140,120)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-standing-breath-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-pelvic-rock",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 5,
    "nameKo": "테이블 골반 록",
    "nameEn": "Table Pelvic Rock",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "flexion",
      "extension"
    ],
    "exercise": {
      "id": "original-cadillac-pelvic-rock",
      "nameKo": "테이블 골반 록",
      "nameEn": "Table Pelvic Rock",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "flexion",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-pelvic-rock",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Pelvic Rock)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-pelvic-rock",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Pelvic Rock)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 테이블에 놓고 골반을 작은 범위로 앞뒤 기울였다 편한 위치로 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(매트/테이블에 내려놓은 손(hand: 160,140), 흉곽(thoracic: 118,134), 양발(ankle: 248,140)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 골반 록의 핵심 가동 구간(발을 테이블에 놓고 골반을 작은 범위로 앞뒤 기울였다 편한 위치로 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "골반·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 양팔(hand: 160,140)과 어깨(92,134)를 바닥에 편안히 내려놓은 채 골반(174,136→170,128)과 요추(146,132→146,140)만 부드럽게 굴립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 팔의 오버헤드 이동 없이 천골 무게중심을 굴려 중립 골반(146,127 / 176,134)으로 돌아옵니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "골반",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 골반, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 테이블에 놓고 골반을 작은 범위로 앞뒤 기울였다 편한 위치로 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(움직임 없이 호흡과 접촉면부터 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-pelvic-clock-isolated\" · 수파인 골반 시계 · 상지 지지면 고정 & 골반 전후방 틸트 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 골반 록의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-pelvic-clock-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-pelvic-rock",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [flexion, extension]로 정의하며 2D rig \"supine-pelvic-clock-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-pelvic-clock-isolated",
          "summaryKo": "2D rig(supine-pelvic-clock-isolated)는 양팔(hand: 160,140)과 어깨(92,134)를 바닥에 편안히 내려놓은 채 골반(174,136→170,128)과 요추(146,132→146,140)만 부드럽게 굴립니다. 및 고정 지지점(매트/테이블에 내려놓은 손(hand: 160,140), 흉곽(thoracic: 118,134), 양발(ankle: 248,140)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-pelvic-clock-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(supine-pelvic-clock-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-pelvic-rock",
          "summaryKo": "테이블 골반 록의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-pelvic-clock-isolated 도해에서 테이블 골반 록(original-cadillac-pelvic-rock)의 핵심 지지점(매트/테이블에 내려놓은 손(hand: 160,140), 흉곽(thoracic: 118,134), 양발(ankle: 248,140)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-pelvic-clock-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-pelvic-rock",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 6,
    "nameKo": "체어 시티드 골반 록",
    "nameEn": "Chair Seated Pelvic Rock",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "flexion",
      "extension"
    ],
    "exercise": {
      "id": "original-chair-seated-pelvic-rock",
      "nameKo": "체어 시티드 골반 록",
      "nameEn": "Chair Seated Pelvic Rock",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "flexion",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-pelvic-rock",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Pelvic Rock)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-pelvic-rock",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Pelvic Rock)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 바닥에 지지하고 골반을 작은 범위로 기울였다 앉은 중심으로 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(허벅지 위 양손(hand: 158,102)과 바닥에 둔 발목(ankle: 186,170)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 골반 록의 핵심 가동 구간(발을 바닥에 지지하고 골반을 작은 범위로 기울였다 앉은 중심으로 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "골반·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 양손(158,102)과 발(186,170)을 고정한 채 체어 시트 위에서 골반(132,108→124,110)과 요추(132,92→116,96)를 뒤로 부드럽게 굴립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 복부 지지로 골반과 요추(116,96→137,90)를 다시 좌골 수직 중심 위로 세워 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "골반",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 골반, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 바닥에 지지하고 골반을 작은 범위로 기울였다 앉은 중심으로 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(움직임을 줄이고 접촉면을 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-pelvic-rock-isolated\" · 체어 시티드 골반 록 · 시트 착석 & 손 허벅지 고정 골반 틸트 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 골반 록의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-pelvic-rock-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-pelvic-rock",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [flexion, extension]로 정의하며 2D rig \"chair-seated-pelvic-rock-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-pelvic-rock-isolated",
          "summaryKo": "2D rig(chair-seated-pelvic-rock-isolated)는 양손(158,102)과 발(186,170)을 고정한 채 체어 시트 위에서 골반(132,108→124,110)과 요추(132,92→116,96)를 뒤로 부드럽게 굴립니다. 및 고정 지지점(허벅지 위 양손(hand: 158,102)과 바닥에 둔 발목(ankle: 186,170)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-pelvic-rock-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-pelvic-rock-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-pelvic-rock",
          "summaryKo": "체어 시티드 골반 록의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-pelvic-rock-isolated 도해에서 체어 시티드 골반 록(original-chair-seated-pelvic-rock)의 핵심 지지점(허벅지 위 양손(hand: 158,102)과 바닥에 둔 발목(ankle: 186,170)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-pelvic-rock-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-supported-ankle",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 7,
    "nameKo": "래더 지지 발목 움직임",
    "nameEn": "Ladder Supported Ankle Movement",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-barrel-supported-ankle",
      "nameKo": "래더 지지 발목 움직임",
      "nameEn": "Ladder Supported Ankle Movement",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-supported-ankle",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Ladder Supported Ankle Movement)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-supported-ankle",
        "title": "Supported Standing & Trunk Control Exercises (Ladder Supported Ankle Movement)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바닥에서 고정된 래더를 지지하고 발뒤꿈치를 작게 올렸다 내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(기구 지지 손(hand: 88,76)과 바닥 발볼(toe: 164,176)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 래더 지지 발목 움직임의 핵심 가동 구간(바닥에서 고정된 래더를 지지하고 발뒤꿈치를 작게 올렸다 내립니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "발목·종아리·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 손(88,76)으로 기구를 안정적으로 잡은 채 발볼(164,176) 위에서 뒤꿈치(y:174→160)와 정수리(y:26→16)가 수직 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 기구 손 지지를 유지하며 종아리 편심성 조절로 뒤꿈치(y:160→169)를 바닥으로 천천히 내립니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "발목",
        "종아리",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 발목, 종아리, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에서 고정된 래더를 지지하고 발뒤꿈치를 작게 올렸다 내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 래더에 올라서지 않고 바닥의 미끄러짐과 기구 고정을 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발뒤꿈치를 들지 않고 무게만 이동합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-supported-ankle-isolated\" · 래더 지지 발목 움직임 · 사다리 손 고정 & 카프 레이즈 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "래더 지지 발목 움직임의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-supported-ankle-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-supported-ankle",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"barrel-supported-ankle-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-supported-ankle-isolated",
          "summaryKo": "2D rig(barrel-supported-ankle-isolated)는 손(88,76)으로 기구를 안정적으로 잡은 채 발볼(164,176) 위에서 뒤꿈치(y:174→160)와 정수리(y:26→16)가 수직 상승합니다. 및 고정 지지점(기구 지지 손(hand: 88,76)과 바닥 발볼(toe: 164,176)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-supported-ankle-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-supported-ankle-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-supported-ankle",
          "summaryKo": "래더 지지 발목 움직임의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-supported-ankle-isolated 도해에서 래더 지지 발목 움직임(original-barrel-supported-ankle)의 핵심 지지점(기구 지지 손(hand: 88,76)과 바닥 발볼(toe: 164,176)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-supported-ankle-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-reformer-supported-bridge",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 8,
    "nameKo": "리포머 브리지 준비",
    "nameEn": "Reformer Bridge Preparation",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-reformer-supported-bridge",
      "nameKo": "리포머 브리지 준비",
      "nameEn": "Reformer Bridge Preparation",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-original-reformer-supported-bridge",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Reformer Bridge Preparation)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-original-reformer-supported-bridge",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Bridge Preparation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 강사가 정한 발 위치에서 캐리지를 안정시키며 골반을 조금 들었다 내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(헤드레스트 Flat 후두부(52,141), 숄더블록 견갑(88,139), 고정 풋바 뒤꿈치(266,126)가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 브리지 준비의 핵심 가동 구간(강사가 정한 발 위치에서 캐리지를 안정시키며 골반을 조금 들었다 내립니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "둔근·몸통·하체의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "상부 흉추·견갑대 및 풋바 위 양발 지지점(골반 거상)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 고정 풋바(266,126)에 뒤꿈치를 걸고 캐리지 스토퍼(offset 0→2px)를 지킨 채 골반(178,143→178,99)이 24.2° 사선 정점으로 올라갑니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 캐리지 홈 스토퍼(offset 0px) 위에서 흉추(118,142)·요추(148,142)·골반(178,143)이 캐리지 베드로 완전히 착지합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "둔근",
        "몸통",
        "하체"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 둔근, 몸통, 하체의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "강사가 정한 발 위치에서 캐리지를 안정시키며 골반을 조금 들었다 내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 캐리지·스토퍼·풋바·스트랩을 확인합니다. 스프링은 제조사 지침과 대상자에 맞게 강사가 직접 설정합니다. 헤드레스트와 목의 위치를 강사가 확인하고 동작 중 고개를 돌리지 않습니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(골반 기울임만 작게 연습합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-articulated-bridge\" · 리포머 서포티드 브리지 · 고정 풋바 발 지지 & 캐리지 홈 스토퍼 고정 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 브리지 준비의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: mid)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-articulated-bridge",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-reformer-supported-bridge",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [extension]로 정의하며 2D rig \"supine-articulated-bridge\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "2D rig(supine-articulated-bridge)는 고정 풋바(266,126)에 뒤꿈치를 걸고 캐리지 스토퍼(offset 0→2px)를 지킨 채 골반(178,143→178,99)이 24.2° 사선 정점으로 올라갑니다. 및 고정 지지점(헤드레스트 Flat 후두부(52,141), 숄더블록 견갑(88,139), 고정 풋바 뒤꿈치(266,126)가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "단일 2D 평면 투영 도해(supine-articulated-bridge) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-reformer-supported-bridge",
          "summaryKo": "리포머 브리지 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-articulated-bridge 도해에서 리포머 브리지 준비(original-reformer-supported-bridge)의 핵심 지지점(헤드레스트 Flat 후두부(52,141), 숄더블록 견갑(88,139), 고정 풋바 뒤꿈치(266,126)가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-articulated-bridge 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-table-ankle",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 9,
    "nameKo": "테이블 발목 플렉스 & 포인트",
    "nameEn": "Table Ankle Flex and Point",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-cadillac-table-ankle",
      "nameKo": "테이블 발목 플렉스 & 포인트",
      "nameEn": "Table Ankle Flex and Point",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-table-ankle",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Ankle Flex and Point)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-table-ankle",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Ankle Flex and Point)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 다리를 편하게 지지하고 발끝을 몸 쪽과 반대쪽으로 천천히 움직입니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(머리(head), 흉추(thoracic), 골반(pelvis) 앵커가 1px도 흔들리지 않고 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 발목 플렉스 & 포인트의 핵심 가동 구간(다리를 편하게 지지하고 발끝을 몸 쪽과 반대쪽으로 천천히 움직입니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "발목·하체의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 몸통(lumbar·pelvis)은 고정된 채 무릎이 펴지며 뒤꿈치(heel)가 x:244→280으로 수평 슬라이드합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 발목 정렬을 유지하며 무릎(knee)이 다시 굴곡되어 시작 지지 위치로 돌아옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "발목",
        "하체"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 발목, 하체의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "다리를 편하게 지지하고 발끝을 몸 쪽과 반대쪽으로 천천히 움직입니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발뒤꿈치를 테이블에 둔 상태에서 움직입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-heel-slide-ankle\" · 수파인 힐 슬라이드 & 발목 플렉스·포인트)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 발목 플렉스 & 포인트의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-heel-slide-ankle",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-table-ankle",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"supine-heel-slide-ankle\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-heel-slide-ankle",
          "summaryKo": "2D rig(supine-heel-slide-ankle)는 몸통(lumbar·pelvis)은 고정된 채 무릎이 펴지며 뒤꿈치(heel)가 x:244→280으로 수평 슬라이드합니다. 및 고정 지지점(머리(head), 흉추(thoracic), 골반(pelvis) 앵커가 1px도 흔들리지 않고 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-heel-slide-ankle",
          "summaryKo": "단일 2D 평면 투영 도해(supine-heel-slide-ankle) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-table-ankle",
          "summaryKo": "테이블 발목 플렉스 & 포인트의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-heel-slide-ankle 도해에서 테이블 발목 플렉스 & 포인트(original-cadillac-table-ankle)의 핵심 지지점(머리(head), 흉추(thoracic), 골반(pelvis) 앵커가 1px도 흔들리지 않고 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-heel-slide-ankle 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-seated-spine-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 10,
    "nameKo": "바렐 시티드 스파인 리치",
    "nameEn": "Barrel Seated Spine Reach",
    "apparatus": "barrel",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "flexion"
    ],
    "exercise": {
      "id": "original-barrel-seated-spine-reach",
      "nameKo": "바렐 시티드 스파인 리치",
      "nameEn": "Barrel Seated Spine Reach",
      "apparatus": "barrel",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-seated-spine-reach",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Barrel Seated Spine Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-seated-spine-reach",
        "title": "Supported Standing & Trunk Control Exercises (Barrel Seated Spine Reach)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 강사가 정한 앉은 지지와 발 고정을 유지하고 몸통을 짧게 기울였다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바렐 정점(Apex) 또는 안장 부위에 안정적으로 안착한 양측 좌골 및 둔부",
          "래더 가로대(Rung)에 단단히 건 양발 아치/발뒤꿈치",
          "골반과 요추를 지지하는 복부 코어 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(천골(S1 x=58, y=138)·골반(60,140)·무릎(136,140)·뒤꿈치(214,144)는 3단계 모두 동일한 위치에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 시티드 스파인 리치의 핵심 가동 구간(강사가 정한 앉은 지지와 발 고정을 유지하고 몸통을 짧게 기울였다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·복부의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바렐 정점(Apex) 또는 안장 부위에 안정적으로 안착한 양측 좌골 및 둔부",
          "래더 가로대(Rung)에 단단히 건 양발 아치/발뒤꿈치",
          "골반과 요추를 지지하는 복부 코어 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 가상 수직벽(x=58)에 일직선으로 서 있던 척추에서 S1(x=58)·L3(x=60)는 벽에 남고 C7(x:58→114)·T4(x:58→96)가 전방 박리됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바렐 정점(Apex) 또는 안장 부위에 안정적으로 안착한 양측 좌골 및 둔부",
          "래더 가로대(Rung)에 단단히 건 양발 아치/발뒤꿈치",
          "골반과 요추를 지지하는 복부 코어 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 천골(S1 x=58) 벽 앵커를 유지한 채 C7(x=146, y=78)과 양손(x=228, y=78)이 깊은 전방 C-커브로 뻗어 나갑니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "복부"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 복부의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "강사가 정한 앉은 지지와 발 고정을 유지하고 몸통을 짧게 기울였다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 바렐 위 앉은 자세의 안정성과 승하차 보조를 먼저 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(범위를 줄이고 강사의 지지를 받습니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"seated-roll-back-spine-twist\" · 스파인 스트레치 (Spine Stretch Forward) · 가상 수직벽(x=58) 천골·골반 고정 · 경추→상부흉추 순차 벽 박리 및 전방 C-커브 신장)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 시티드 스파인 리치의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "seated-roll-back-spine-twist",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-seated-spine-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: seated, spinalPlanes: [flexion]로 정의하며 2D rig \"seated-roll-back-spine-twist\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "2D rig(seated-roll-back-spine-twist)는 가상 수직벽(x=58)에 일직선으로 서 있던 척추에서 S1(x=58)·L3(x=60)는 벽에 남고 C7(x:58→114)·T4(x:58→96)가 전방 박리됩니다. 및 고정 지지점(천골(S1 x=58, y=138)·골반(60,140)·무릎(136,140)·뒤꿈치(214,144)는 3단계 모두 동일한 위치에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "단일 2D 평면 투영 도해(seated-roll-back-spine-twist) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-seated-spine-reach",
          "summaryKo": "바렐 시티드 스파인 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "seated-roll-back-spine-twist 도해에서 바렐 시티드 스파인 리치(original-barrel-seated-spine-reach)의 핵심 지지점(천골(S1 x=58, y=138)·골반(60,140)·무릎(136,140)·뒤꿈치(214,144)는 3단계 모두 동일한 위치에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, seated-roll-back-spine-twist 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-table-bridge",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 11,
    "nameKo": "캐딜락 테이블 브리지",
    "nameEn": "Cadillac Table Bridge",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-cadillac-table-bridge",
      "nameKo": "캐딜락 테이블 브리지",
      "nameEn": "Cadillac Table Bridge",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-table-bridge",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Table Bridge)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-table-bridge",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Table Bridge)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 테이블에 지지하고 골반을 편한 높이로 들어 올렸다 내려옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(수직 기둥 파지 손(34,118), 테이블 위 후두부(54,141)·견갑대(92,140), 테이블 위 뒤꿈치(250,144)가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 테이블 브리지의 핵심 가동 구간(발을 테이블에 지지하고 골반을 편한 높이로 들어 올렸다 내려옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "둔근·하체·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 수평 테이블 위 양발(250,144)과 수직 기둥 양손(34,118)을 고정한 채 골반(182,143→184,103)을 들어 21.8° 사선 정점을 만듭니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 스프링 저항 없이 흉추(122,142)→요추(152,142)→골반(182,143)이 수평 캐딜락 테이블 상면으로 완전히 착지합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "둔근",
        "하체",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 둔근, 하체, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 테이블에 지지하고 골반을 편한 높이로 들어 올렸다 내려옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 움직이는 바를 발 지지로 사용하지 않고 목에 체중을 싣지 않습니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(골반 기울임 또는 낮은 높이로 연습합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-articulated-bridge\" · 캐딜락 테이블 브리지 · 수평 테이블 발 지지 & 수직 기둥 손 파지 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 테이블 브리지의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-articulated-bridge",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-table-bridge",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [extension]로 정의하며 2D rig \"supine-articulated-bridge\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "2D rig(supine-articulated-bridge)는 수평 테이블 위 양발(250,144)과 수직 기둥 양손(34,118)을 고정한 채 골반(182,143→184,103)을 들어 21.8° 사선 정점을 만듭니다. 및 고정 지지점(수직 기둥 파지 손(34,118), 테이블 위 후두부(54,141)·견갑대(92,140), 테이블 위 뒤꿈치(250,144)가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "단일 2D 평면 투영 도해(supine-articulated-bridge) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-table-bridge",
          "summaryKo": "캐딜락 테이블 브리지의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-articulated-bridge 도해에서 캐딜락 테이블 브리지(original-cadillac-table-bridge)의 핵심 지지점(수직 기둥 파지 손(34,118), 테이블 위 후두부(54,141)·견갑대(92,140), 테이블 위 뒤꿈치(250,144)가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-articulated-bridge 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-alternating-pedal",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 12,
    "nameKo": "체어 교대 풋워크",
    "nameEn": "Alternating Chair Footwork",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-alternating-pedal",
      "nameKo": "체어 교대 풋워크",
      "nameEn": "Alternating Chair Footwork",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-alternating-pedal",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Alternating Chair Footwork)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-alternating-pedal",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Alternating Chair Footwork)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 기구가 교대 동작을 지원하는지 확인한 뒤 한쪽씩 작게 눌렀다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 교대 풋워크의 핵심 가동 구간(기구가 교대 동작을 지원하는지 확인한 뒤 한쪽씩 작게 눌렀다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "하체·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 머리부터 좌골(x:120~122)까지 상체 수직 기둥은 고정된 채 무릎(y:98→132)과 발목(y:136→168)이 페달을 밟아 하강합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 스프링 반발력을 제어하며 무릎(y:132→104)과 발목(y:168→142)이 상단으로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "하체",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 하체, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "기구가 교대 동작을 지원하는지 확인한 뒤 한쪽씩 작게 눌렀다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 분할 페달의 연결 상태와 허용 동작은 제조사 지침에 따라 강사가 결정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양발 동시 프레스로 돌아갑니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-pedal-footwork\" · 운다 체어 시티드 페달 프레스 & 교대 풋워크)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 교대 풋워크의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-pedal-footwork",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-alternating-pedal",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-seated-pedal-footwork\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-pedal-footwork",
          "summaryKo": "2D rig(chair-seated-pedal-footwork)는 머리부터 좌골(x:120~122)까지 상체 수직 기둥은 고정된 채 무릎(y:98→132)과 발목(y:136→168)이 페달을 밟아 하강합니다. 및 고정 지지점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-pedal-footwork",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-pedal-footwork) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-alternating-pedal",
          "summaryKo": "체어 교대 풋워크의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-pedal-footwork 도해에서 체어 교대 풋워크(original-chair-alternating-pedal)의 핵심 지지점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-pedal-footwork 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-supported-arm-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 13,
    "nameKo": "바렐 지지 암 리치",
    "nameEn": "Barrel Supported Arm Reach",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-barrel-supported-arm-reach",
      "nameKo": "바렐 지지 암 리치",
      "nameEn": "Barrel Supported Arm Reach",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-supported-arm-reach",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Barrel Supported Arm Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-supported-arm-reach",
        "title": "Supported Standing & Trunk Control Exercises (Barrel Supported Arm Reach)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바닥에 서서 한 손을 고정된 지지에 놓고 반대 팔을 앞으로 길게 뻗습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(발볼·발가락(toe) 바닥 지지점이 부동 앵커로 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 지지 암 리치의 핵심 가동 구간(바닥에 서서 한 손을 고정된 지지에 놓고 반대 팔을 앞으로 길게 뻗습니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "어깨·등·상체의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 발볼(toe x:164,y:176) 지지점 위에서 뒤꿈치(y:176→162)와 정수리(y:26→18)가 수직 상승하고 손(x:194→236, y:80→52)이 앞으로 뻗습니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 종아리 편심성 조절로 뒤꿈치(y:162→176)와 상지가 시작 자세로 차분히 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "어깨",
        "등",
        "상체"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 어깨, 등, 상체의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에 서서 한 손을 고정된 지지에 놓고 반대 팔을 앞으로 길게 뻗습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔꿈치를 굽혀 작은 범위로 움직입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"standing-ankle-calf-upper-reach\" · 스탠딩 카프 레이즈 · 발목 리치 & 상체 암 스프링/회전)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 지지 암 리치의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "standing-ankle-calf-upper-reach",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-supported-arm-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"standing-ankle-calf-upper-reach\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "standing-ankle-calf-upper-reach",
          "summaryKo": "2D rig(standing-ankle-calf-upper-reach)는 발볼(toe x:164,y:176) 지지점 위에서 뒤꿈치(y:176→162)와 정수리(y:26→18)가 수직 상승하고 손(x:194→236, y:80→52)이 앞으로 뻗습니다. 및 고정 지지점(발볼·발가락(toe) 바닥 지지점이 부동 앵커로 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "standing-ankle-calf-upper-reach",
          "summaryKo": "단일 2D 평면 투영 도해(standing-ankle-calf-upper-reach) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-supported-arm-reach",
          "summaryKo": "바렐 지지 암 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "standing-ankle-calf-upper-reach 도해에서 바렐 지지 암 리치(original-barrel-supported-arm-reach)의 핵심 지지점(발볼·발가락(toe) 바닥 지지점이 부동 앵커로 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, standing-ankle-calf-upper-reach 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-reformer-seated-row",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 14,
    "nameKo": "박스 시티드 로우",
    "nameEn": "Box Seated Row",
    "apparatus": "reformer",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-reformer-seated-row",
      "nameKo": "박스 시티드 로우",
      "nameEn": "Box Seated Row",
      "apparatus": "reformer",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-original-reformer-seated-row",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Box Seated Row)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-original-reformer-seated-row",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Box Seated Row)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 및 박스(short-box) 설정을 확인한다. 박스의 고정을 확인하고 앉아 스트랩을 몸 쪽으로 당겼다 천천히 돌려보냅니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 박스 시티드 로우의 핵심 가동 구간(박스의 고정을 확인하고 앉아 스트랩을 몸 쪽으로 당겼다 천천히 돌려보냅니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "등·팔·어깨의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 몸통 수직 축을 유지하며 손끝이 전상방 사선(x:216,y:52)으로 길게 확장됩니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "등",
        "팔",
        "어깨"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 등, 팔, 어깨의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "박스의 고정을 확인하고 앉아 스트랩을 몸 쪽으로 당겼다 천천히 돌려보냅니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 캐리지·스토퍼·풋바·스트랩을 확인합니다. 스프링은 제조사 지침과 대상자에 맞게 강사가 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스트랩 없이 팔 경로를 먼저 연습합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"seated-row-arm-arc\" · 시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "박스 시티드 로우의 기구 세팅(스프링: 강사가 기구별 설정, 박스: short-box, 풋바: mid)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "seated-row-arm-arc",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-reformer-seated-row",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"seated-row-arm-arc\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "seated-row-arm-arc",
          "summaryKo": "2D rig(seated-row-arm-arc)는 좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다. 및 고정 지지점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "seated-row-arm-arc",
          "summaryKo": "단일 2D 평면 투영 도해(seated-row-arm-arc) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-reformer-seated-row",
          "summaryKo": "박스 시티드 로우의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "seated-row-arm-arc 도해에서 박스 시티드 로우(original-reformer-seated-row)의 핵심 지지점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, seated-row-arm-arc 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-table-knee-fold",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 15,
    "nameKo": "테이블 니 폴드",
    "nameEn": "Table Alternating Knee Fold",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-cadillac-table-knee-fold",
      "nameKo": "테이블 니 폴드",
      "nameEn": "Table Alternating Knee Fold",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-table-knee-fold",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Alternating Knee Fold)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-table-knee-fold",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Alternating Knee Fold)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 테이블 위에서 한 발씩 들었다 내려놓으며 골반의 위치를 관찰합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(머리(head), 흉추(thoracic), 골반(pelvis) 및 반대측 지지 다리가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 니 폴드의 핵심 가동 구간(테이블 위에서 한 발씩 들었다 내려놓으며 골반의 위치를 관찰합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·고관절의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 골반(pelvis) 고정 상태에서 무릎(x:226→194, y:102→92)과 발목(y:146→92)이 90도 테이블탑으로 들어 올려집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 요추 중립을 유지한 채 발목과 뒤꿈치가 바닥(y:142~148)으로 사뿐히 내려옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "고관절"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 고관절의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "테이블 위에서 한 발씩 들었다 내려놓으며 골반의 위치를 관찰합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발의 무게만 살짝 덜어냅니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-knee-fold\" · 수파인 니 폴드 (테이블탑 고관절 분리 제어))로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 니 폴드의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-knee-fold",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-table-knee-fold",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"supine-knee-fold\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-knee-fold",
          "summaryKo": "2D rig(supine-knee-fold)는 골반(pelvis) 고정 상태에서 무릎(x:226→194, y:102→92)과 발목(y:146→92)이 90도 테이블탑으로 들어 올려집니다. 및 고정 지지점(머리(head), 흉추(thoracic), 골반(pelvis) 및 반대측 지지 다리가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-knee-fold",
          "summaryKo": "단일 2D 평면 투영 도해(supine-knee-fold) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-table-knee-fold",
          "summaryKo": "테이블 니 폴드의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-knee-fold 도해에서 테이블 니 폴드(original-cadillac-table-knee-fold)의 핵심 지지점(머리(head), 흉추(thoracic), 골반(pelvis) 및 반대측 지지 다리가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-knee-fold 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-knee-lift",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 16,
    "nameKo": "체어 시티드 니 리프트",
    "nameEn": "Chair Seated Knee Lift",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-seated-knee-lift",
      "nameKo": "체어 시티드 니 리프트",
      "nameEn": "Chair Seated Knee Lift",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-knee-lift",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Knee Lift)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-knee-lift",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Knee Lift)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 바닥에 둔 자세에서 한쪽 발의 무게를 조금 덜었다 내려놓습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(체어 시트 좌골(pelvis: 132,108)과 바닥 지지 다리(farAnkle: 184,172)가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 니 리프트의 핵심 가동 구간(발을 바닥에 둔 자세에서 한쪽 발의 무게를 조금 덜었다 내려놓습니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·고관절의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 체어 시트(132,108)와 바닥 지지 발(farAnkle: 184,172)을 고정한 채 가동 무릎(184,126→174,88)과 발목(188,170→184,132)을 위로 들어 올립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 움직이는 페달을 밟지 않고 코어 제어로 무릎(174,88→182,120)과 발목을 바닥 쪽으로 감속 하강합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "고관절"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 고관절의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 바닥에 둔 자세에서 한쪽 발의 무게를 조금 덜었다 내려놓습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 움직이는 페달을 발 지지로 사용하지 않고 체어의 흔들림을 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발을 들지 않고 무게만 덜어냅니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-knee-lift-isolated\" · 체어 시티드 니 리프트 · 시트 좌골 고정 & 단측 무릎 상방 리프트 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 니 리프트의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-knee-lift-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-knee-lift",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-seated-knee-lift-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-knee-lift-isolated",
          "summaryKo": "2D rig(chair-seated-knee-lift-isolated)는 체어 시트(132,108)와 바닥 지지 발(farAnkle: 184,172)을 고정한 채 가동 무릎(184,126→174,88)과 발목(188,170→184,132)을 위로 들어 올립니다. 및 고정 지지점(체어 시트 좌골(pelvis: 132,108)과 바닥 지지 다리(farAnkle: 184,172)가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-knee-lift-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-knee-lift-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-knee-lift",
          "summaryKo": "체어 시티드 니 리프트의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-knee-lift-isolated 도해에서 체어 시티드 니 리프트(original-chair-seated-knee-lift)의 핵심 지지점(체어 시트 좌골(pelvis: 132,108)과 바닥 지지 다리(farAnkle: 184,172)가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-knee-lift-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-standing-rotation",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 17,
    "nameKo": "래더 지지 몸통 회전",
    "nameEn": "Ladder Supported Rotation",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "rotation"
    ],
    "exercise": {
      "id": "original-barrel-standing-rotation",
      "nameKo": "래더 지지 몸통 회전",
      "nameEn": "Ladder Supported Rotation",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-standing-rotation",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Ladder Supported Rotation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-standing-rotation",
        "title": "Supported Standing & Trunk Control Exercises (Ladder Supported Rotation)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바닥에 안정적으로 서서 가슴 방향을 작은 범위로 돌렸다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바닥에 디딘 뒤꿈치(heel: 142,174)와 골반(pelvis: 146,118)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 래더 지지 몸통 회전의 핵심 가동 구간(바닥에 안정적으로 서서 가슴 방향을 작은 범위로 돌렸다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "흉곽·몸통·등의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 양발 뒤꿈치(142,174)와 골반(146,118)을 바닥에 고정한 채 흉곽(146,84→154,84)과 팔(hand: 88,76→224,64)을 수평 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 까치발 상승 없이 발바닥 접지를 유지하며 가슴과 팔(hand: 100,76)이 정면으로 돌아옵니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "흉곽",
        "몸통",
        "등"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 흉곽, 몸통, 등의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에 안정적으로 서서 가슴 방향을 작은 범위로 돌렸다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(두 손을 몸 가까이 두고 회전 범위를 줄입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-standing-rotation-isolated\" · 래더 지지 스탠딩 몸통 회전 · 양발 접지 고정 & 수평 흉곽 회전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "래더 지지 몸통 회전의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-standing-rotation-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-standing-rotation",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [rotation]로 정의하며 2D rig \"barrel-standing-rotation-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-standing-rotation-isolated",
          "summaryKo": "2D rig(barrel-standing-rotation-isolated)는 양발 뒤꿈치(142,174)와 골반(146,118)을 바닥에 고정한 채 흉곽(146,84→154,84)과 팔(hand: 88,76→224,64)을 수평 회전합니다. 및 고정 지지점(바닥에 디딘 뒤꿈치(heel: 142,174)와 골반(pelvis: 146,118)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-standing-rotation-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-standing-rotation-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-standing-rotation",
          "summaryKo": "래더 지지 몸통 회전의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-standing-rotation-isolated 도해에서 래더 지지 몸통 회전(original-barrel-standing-rotation)의 핵심 지지점(바닥에 디딘 뒤꿈치(heel: 142,174)와 골반(pelvis: 146,118)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-standing-rotation-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-reformer-side-lying-press",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 18,
    "nameKo": "사이드 라잉 레그 프레스",
    "nameEn": "Side-Lying Leg Press",
    "apparatus": "reformer",
    "bodyPosition": "side-lying",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-reformer-side-lying-press",
      "nameKo": "사이드 라잉 레그 프레스",
      "nameEn": "Side-Lying Leg Press",
      "apparatus": "reformer",
      "bodyPosition": "side-lying",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-original-reformer-side-lying-press",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Side-Lying Leg Press)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-original-reformer-side-lying-press",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Side-Lying Leg Press)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 옆으로 누운 자세(Side-Lying)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 옆으로 누운 지지와 발의 접촉을 확인하고 캐리지를 작은 범위로 밀었다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "옆으로 누운 자세(Side-Lying) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 사이드 라잉 레그 프레스의 핵심 가동 구간(옆으로 누운 지지와 발의 접촉을 확인하고 캐리지를 작은 범위로 밀었다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "하체·둔근·고관절의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 골반 전·후방 회전 없이 위쪽 다리를 고관절 후방 신전(+14°, 발목 저굴)으로 길게 리치하여 고관절 수평 스윕을 완성합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "하체",
        "둔근",
        "고관절"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 하체, 둔근, 고관절의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "옆으로 누운 지지와 발의 접촉을 확인하고 캐리지를 작은 범위로 밀었다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 캐리지·스토퍼·풋바·스트랩을 확인합니다. 스프링은 제조사 지침과 대상자에 맞게 강사가 직접 설정합니다. 머리·골반의 지지와 풋바 접촉이 안정적인지 강사가 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(움직임의 범위를 줄이고 지지를 더합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"side-lying-leg-press-sweep\" · 사이드 킥 · 측와위 귀-어깨-고관절 일직선·골반 수직 적층 & 전후 수평 스윕)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "사이드 라잉 레그 프레스의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: mid)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "side-lying-leg-press-sweep",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-reformer-side-lying-press",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: side-lying, spinalPlanes: [neutral]로 정의하며 2D rig \"side-lying-leg-press-sweep\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "2D rig(side-lying-leg-press-sweep)는 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다. 및 고정 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "단일 2D 평면 투영 도해(side-lying-leg-press-sweep) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-reformer-side-lying-press",
          "summaryKo": "사이드 라잉 레그 프레스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "side-lying-leg-press-sweep 도해에서 사이드 라잉 레그 프레스(original-reformer-side-lying-press)의 핵심 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, side-lying-leg-press-sweep 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-seated-roll-back",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 19,
    "nameKo": "시티드 롤백 준비",
    "nameEn": "Seated Roll Back Preparation",
    "apparatus": "cadillac",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "flexion"
    ],
    "exercise": {
      "id": "original-cadillac-seated-roll-back",
      "nameKo": "시티드 롤백 준비",
      "nameEn": "Seated Roll Back Preparation",
      "apparatus": "cadillac",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-seated-roll-back",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Seated Roll Back Preparation)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-seated-roll-back",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Seated Roll Back Preparation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발과 손의 지지를 강사가 확인한 뒤 몸통을 뒤로 조금 기울였다 앉은 자세로 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(뒤꿈치(258,144)·발목(252,140)·무릎(204,126)·고관절(156,140) 앵커는 전 구간 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 시티드 롤백 준비의 핵심 가동 구간(발과 손의 지지를 강사가 확인한 뒤 몸통을 뒤로 조금 기울였다 앉은 자세로 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복부·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 좌골 위 수직 적층(L3 x=150, y=118)에서 골반 후방경사로 L3가 후하방(x=126, y=132)으로 이동하며 C-커브를 만듭니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 천골(S1 y=143)·요추(L3 y=142)·하부흉추(T12 y=140)가 차례로 매트에 닿으며 원심성 롤다운 제어를 완성합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복부",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복부, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발과 손의 지지를 강사가 확인한 뒤 몸통을 뒤로 조금 기울였다 앉은 자세로 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 롤다운 바 사용 여부와 보조 위치는 강사가 정하며 바를 놓지 않습니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(작은 골반 움직임만 연습합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"seated-roll-back-spine-twist\" · 롤다운 (Spine Roll Down) · 발 뒤꿈치 고정 앵커 · 좌골 수직 준비 → 골반 후방경사(천골 컬) → 요추·흉추 순차 매트 착지)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "시티드 롤백 준비의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "seated-roll-back-spine-twist",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-seated-roll-back",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: seated, spinalPlanes: [flexion]로 정의하며 2D rig \"seated-roll-back-spine-twist\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "2D rig(seated-roll-back-spine-twist)는 좌골 위 수직 적층(L3 x=150, y=118)에서 골반 후방경사로 L3가 후하방(x=126, y=132)으로 이동하며 C-커브를 만듭니다. 및 고정 지지점(뒤꿈치(258,144)·발목(252,140)·무릎(204,126)·고관절(156,140) 앵커는 전 구간 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "단일 2D 평면 투영 도해(seated-roll-back-spine-twist) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-seated-roll-back",
          "summaryKo": "시티드 롤백 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "seated-roll-back-spine-twist 도해에서 시티드 롤백 준비(original-cadillac-seated-roll-back)의 핵심 지지점(뒤꿈치(258,144)·발목(252,140)·무릎(204,126)·고관절(156,140) 앵커는 전 구간 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, seated-roll-back-spine-twist 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-arm-arc",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 20,
    "nameKo": "체어 시티드 암 아크",
    "nameEn": "Chair Seated Arm Arc",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-seated-arm-arc",
      "nameKo": "체어 시티드 암 아크",
      "nameEn": "Chair Seated Arm Arc",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-arm-arc",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Arm Arc)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-arm-arc",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Arm Arc)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 페달을 사용하지 않고 양팔을 편한 높이로 올렸다 내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 암 아크의 핵심 가동 구간(페달을 사용하지 않고 양팔을 편한 높이로 올렸다 내립니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "어깨·상체·등의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 몸통 수직 축을 유지하며 손끝이 전상방 사선(x:216,y:52)으로 길게 확장됩니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "어깨",
        "상체",
        "등"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 어깨, 상체, 등의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "페달을 사용하지 않고 양팔을 편한 높이로 올렸다 내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔꿈치를 굽히고 범위를 줄입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-arm-arc-isolated\" · 체어 시티드 암 아크 · 시트 상단 좌골 착석 & 오버헤드 암 아크 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 암 아크의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-arm-arc-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-arm-arc",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-seated-arm-arc-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-arm-arc-isolated",
          "summaryKo": "2D rig(chair-seated-arm-arc-isolated)는 체어 시트 상단 좌골(pelvis: 132,108)과 바닥 양발 뒤꿈치(heel: 190,176)를 고정한 채 양손(206,70→196,18→204,68)이 갈비뼈 들뜸 없는 범위의 원호로 올라갔다 정면 높이로 제어 복귀하는 과정을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-arm-arc-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-arm-arc-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-arm-arc",
          "summaryKo": "체어 시티드 암 아크의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-arm-arc-isolated 도해에서 체어 시티드 암 아크(original-chair-seated-arm-arc)의 핵심 지지점(체어 시트 좌골(pelvis: 132,108)과 바닥 양발 뒤꿈치(heel: 190,176))과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-arm-arc-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-reformer-box-swan-prep",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 21,
    "nameKo": "롱박스 등 리치",
    "nameEn": "Long Box Back Reach",
    "apparatus": "reformer",
    "bodyPosition": "prone",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-reformer-box-swan-prep",
      "nameKo": "롱박스 등 리치",
      "nameEn": "Long Box Back Reach",
      "apparatus": "reformer",
      "bodyPosition": "prone",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-original-reformer-box-swan-prep",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Long Box Back Reach)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-original-reformer-box-swan-prep",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Long Box Back Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 엎드린 자세(Prone)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 및 박스(long-box) 설정을 확인한다. 박스 위에서 가슴을 앞쪽으로 길게 보내며 편한 범위의 작은 신전을 탐색합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "엎드린 자세(Prone) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 롱박스(Long Box) 위 전방 하부 흉곽·복부 및 치골(Pubic Bone)",
          "풀리 로프 스트랩을 파지한 양손",
          "골반 너비로 모아 후면 사슬로 지지한 양다리"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(롱박스 상판 위 치골(148,116)·고관절(154,116)·하체 수평 지지 고정)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 롱박스 등 리치의 핵심 가동 구간(박스 위에서 가슴을 앞쪽으로 길게 보내며 편한 범위의 작은 신전을 탐색합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "등·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 롱박스(Long Box) 위 전방 하부 흉곽·복부 및 치골(Pubic Bone)",
          "풀리 로프 스트랩을 파지한 양손",
          "골반 너비로 모아 후면 사슬로 지지한 양다리"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 롱박스 상판(y=116)에 치골(148,116)과 하체를 고정한 채 흉추(94,110→96,96)와 머리(56,103→58,71)가 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 롱박스(Long Box) 위 전방 하부 흉곽·복부 및 치골(Pubic Bone)",
          "풀리 로프 스트랩을 파지한 양손",
          "골반 너비로 모아 후면 사슬로 지지한 양다리"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 치골 고정과 복부 리프트를 유지하며 흉추(96,96→95,103)와 머리(58,71→56,89)가 편심성 제어로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "등",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 등, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "박스 위에서 가슴을 앞쪽으로 길게 보내며 편한 범위의 작은 신전을 탐색합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 캐리지·스토퍼·풋바·스트랩을 확인합니다. 스프링은 제조사 지침과 대상자에 맞게 강사가 직접 설정합니다. 박스의 고정과 승하차를 강사가 확인하고 허리에 부담이 생기면 범위를 줄입니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(상체를 들지 않고 길이와 호흡만 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"prone-swan-pulling-straps-swimming\" · 리포머 롱박스 스완 준비 · 박스 상판(y=116) 치골 지지 및 순수 흉추 신전)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "롱박스 등 리치의 기구 세팅(스프링: 강사가 기구별 설정, 박스: long-box, 풋바: mid)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "prone-swan-pulling-straps-swimming",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-reformer-box-swan-prep",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: prone, spinalPlanes: [extension]로 정의하며 2D rig \"prone-swan-pulling-straps-swimming\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "2D rig(prone-swan-pulling-straps-swimming)는 롱박스 상판(y=116)에 치골(148,116)과 하체를 고정한 채 흉추(94,110→96,96)와 머리(56,103→58,71)가 상승합니다. 및 고정 지지점(롱박스 상판 위 치골(148,116)·고관절(154,116)·하체 수평 지지 고정)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "단일 2D 평면 투영 도해(prone-swan-pulling-straps-swimming) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-reformer-box-swan-prep",
          "summaryKo": "롱박스 등 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "prone-swan-pulling-straps-swimming 도해에서 롱박스 등 리치(original-reformer-box-swan-prep)의 핵심 지지점(롱박스 상판 위 치골(148,116)·고관절(154,116)·하체 수평 지지 고정)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, prone-swan-pulling-straps-swimming 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-spine-twist",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 22,
    "nameKo": "체어 시티드 스파인 트위스트",
    "nameEn": "Chair Seated Spine Twist",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "rotation"
    ],
    "exercise": {
      "id": "original-chair-seated-spine-twist",
      "nameKo": "체어 시티드 스파인 트위스트",
      "nameEn": "Chair Seated Spine Twist",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-spine-twist",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Spine Twist)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-spine-twist",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Spine Twist)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 바닥에 지지하고 가슴을 작은 범위로 돌렸다 정면으로 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(좌골(pelvis: 136,108), 요추(lumbar: 136,92), 정수리(head: 136,26) 수직 기둥이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 스파인 트위스트의 핵심 가동 구간(발을 바닥에 지지하고 가슴을 작은 범위로 돌렸다 정면으로 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "흉곽·등·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 머리(136,26)부터 좌골(136,108)까지 수직 축이 뒤로 무너지지 않게 유지한 채 흉곽과 양팔(hand: 196,72→82,70)만 수평 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 좌골 무게를 균등하게 지키며 가슴과 팔(hand: 188,72)을 정면으로 되돌립니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "흉곽",
        "등",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 흉곽, 등, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 바닥에 지지하고 가슴을 작은 범위로 돌렸다 정면으로 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(손을 가슴 앞에 두고 움직입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-spine-twist-isolated\" · 체어 시티드 스파인 트위스트 · 좌골 수직 축 유지 & 흉곽 수평 회전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 스파인 트위스트의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-spine-twist-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-spine-twist",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [rotation]로 정의하며 2D rig \"chair-seated-spine-twist-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-spine-twist-isolated",
          "summaryKo": "2D rig(chair-seated-spine-twist-isolated)는 머리(136,26)부터 좌골(136,108)까지 수직 축이 뒤로 무너지지 않게 유지한 채 흉곽과 양팔(hand: 196,72→82,70)만 수평 회전합니다. 및 고정 지지점(좌골(pelvis: 136,108), 요추(lumbar: 136,92), 정수리(head: 136,26) 수직 기둥이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-spine-twist-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-spine-twist-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-spine-twist",
          "summaryKo": "체어 시티드 스파인 트위스트의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-spine-twist-isolated 도해에서 체어 시티드 스파인 트위스트(original-chair-seated-spine-twist)의 핵심 지지점(좌골(pelvis: 136,108), 요추(lumbar: 136,92), 정수리(head: 136,26) 수직 기둥이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-spine-twist-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-standing-side-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 23,
    "nameKo": "래더 지지 사이드 레그 리치",
    "nameEn": "Ladder Supported Side Leg Reach",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-barrel-standing-side-reach",
      "nameKo": "래더 지지 사이드 레그 리치",
      "nameEn": "Ladder Supported Side Leg Reach",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-standing-side-reach",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Ladder Supported Side Leg Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-standing-side-reach",
        "title": "Supported Standing & Trunk Control Exercises (Ladder Supported Side Leg Reach)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 고정된 지지를 잡고 한 발을 옆으로 길게 보냈다가 천천히 모읍니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(사다리 가로대 손(hand: 88,76), 수직 몸통(head/thoracic/pelvis x:140), 바닥 지지 발(farAnkle: 138,172)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 래더 지지 사이드 레그 리치의 핵심 가동 구간(고정된 지지를 잡고 한 발을 옆으로 길게 보냈다가 천천히 모읍니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "둔근·고관절·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 사다리 가로대 손 지지(88,76)와 몸통 수직 축(x:140)을 유지한 채 무릎을 편 바깥 다리를 옆·위로 길게 들어 올립니다(ankle: 152,170→228,118).",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 골반 기울어짐 없이 외전된 다리를 천천히 내전하여 시작 자세 근처(ankle: 160,166)로 모읍니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "둔근",
        "고관절",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 둔근, 고관절, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "고정된 지지를 잡고 한 발을 옆으로 길게 보냈다가 천천히 모읍니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발끝을 바닥에 둔 채 작은 범위로 움직입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-standing-side-reach-isolated\" · 래더 바렐 스탠딩 사이드 레그 리치 · 사다리 손 지지 & 직선 다리 외전 분리)로 시각화되며 연결된 연속 모션 초안은 [ladder-supported-side-leg-slide]이다.",
        "evidenceStandardKo": "래더 지지 사이드 레그 리치의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-standing-side-reach-isolated",
      "targetPatternVariantIds": [
        "ladder-supported-side-leg-slide"
      ],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-standing-side-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"barrel-standing-side-reach-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-standing-side-reach-isolated",
          "summaryKo": "2D rig(barrel-standing-side-reach-isolated)는 사다리 가로대 손 지지(88,76)와 몸통 수직 축(x:140)을 유지한 채 무릎을 편 바깥 다리를 옆·위로 길게 들어 올립니다(ankle: 152,170→228,118). 및 고정 지지점(사다리 가로대 손(hand: 88,76), 수직 몸통(head/thoracic/pelvis x:140), 바닥 지지 발(farAnkle: 138,172)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-standing-side-reach-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-standing-side-reach-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-standing-side-reach",
          "summaryKo": "래더 지지 사이드 레그 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-standing-side-reach-isolated 도해에서 래더 지지 사이드 레그 리치(original-barrel-standing-side-reach)의 핵심 지지점(사다리 가로대 손(hand: 88,76), 수직 몸통(head/thoracic/pelvis x:140), 바닥 지지 발(farAnkle: 138,172)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-standing-side-reach-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-seated-rotation",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 24,
    "nameKo": "앉아서 흉곽 회전",
    "nameEn": "Seated Ribcage Rotation",
    "apparatus": "cadillac",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "rotation"
    ],
    "exercise": {
      "id": "original-cadillac-seated-rotation",
      "nameKo": "앉아서 흉곽 회전",
      "nameEn": "Seated Ribcage Rotation",
      "apparatus": "cadillac",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-seated-rotation",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Seated Ribcage Rotation)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-seated-rotation",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Seated Ribcage Rotation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 양쪽 좌골의 지지를 유지하고 가슴 방향을 조금 돌렸다 정면으로 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(좌골(pelvis: 136,138), 요추(lumbar: 136,122), 정수리(head: 136,56) 수직 기둥이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 앉아서 흉곽 회전의 핵심 가동 구간(양쪽 좌골의 지지를 유지하고 가슴 방향을 조금 돌렸다 정면으로 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·흉곽·등의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 머리(136,56)부터 좌골(136,138)까지 수직 축이 뒤로 무너지지 않게 유지한 채 흉곽과 양팔(hand: 196,102→82,100)만 수평 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 좌골 무게를 균등하게 지키며 가슴과 팔(hand: 188,102)을 정면으로 되돌립니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "흉곽",
        "등"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 흉곽, 등의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "양쪽 좌골의 지지를 유지하고 가슴 방향을 조금 돌렸다 정면으로 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(손을 가슴 앞에 두고 회전 범위를 줄입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"cadillac-seated-rotation-isolated\" · 캐딜락 앉아서 흉곽 회전 · 좌골 수직 축 유지 & 흉곽 수평 회전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "앉아서 흉곽 회전의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "cadillac-seated-rotation-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-seated-rotation",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: seated, spinalPlanes: [rotation]로 정의하며 2D rig \"cadillac-seated-rotation-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "cadillac-seated-rotation-isolated",
          "summaryKo": "2D rig(cadillac-seated-rotation-isolated)는 머리(136,56)부터 좌골(136,138)까지 수직 축이 뒤로 무너지지 않게 유지한 채 흉곽과 양팔(hand: 196,102→82,100)만 수평 회전합니다. 및 고정 지지점(좌골(pelvis: 136,138), 요추(lumbar: 136,122), 정수리(head: 136,56) 수직 기둥이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "cadillac-seated-rotation-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(cadillac-seated-rotation-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-seated-rotation",
          "summaryKo": "앉아서 흉곽 회전의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "cadillac-seated-rotation-isolated 도해에서 앉아서 흉곽 회전(original-cadillac-seated-rotation)의 핵심 지지점(좌골(pelvis: 136,138), 요추(lumbar: 136,122), 정수리(head: 136,56) 수직 기둥이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, cadillac-seated-rotation-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-sit-to-stand",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 25,
    "nameKo": "체어 앉았다 일어서기",
    "nameEn": "Chair Sit to Stand",
    "apparatus": "chair",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-sit-to-stand",
      "nameKo": "체어 앉았다 일어서기",
      "nameEn": "Chair Sit to Stand",
      "apparatus": "chair",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-sit-to-stand",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Sit to Stand)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-sit-to-stand",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Sit to Stand)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 움직이지 않는 좌면과 발 위치를 확인하고 천천히 일어섰다 앉습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(바닥에 평행하게 디딘 양발 발목(ankle: 186,170)과 뒤꿈치(heel: 180,176)가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 앉았다 일어서기의 핵심 가동 구간(움직이지 않는 좌면과 발 위치를 확인하고 천천히 일어섰다 앉습니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "하체·둔근·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 양발(ankle: 186,170)을 바닥에 고정한 채 체어 시트(pelvis: 136,108)에서 발바닥으로 바닥을 밀며 상체와 골반(178,102, head: 178,16)을 수직으로 일으켜 세웁니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 엉덩이를 뒤·아래로 천천히 보내며 체어 시트 좌면(pelvis: 142,106)으로 안전하게 앉아 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "하체",
        "둔근",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 하체, 둔근, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "움직이지 않는 좌면과 발 위치를 확인하고 천천히 일어섰다 앉습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 체어가 밀리지 않도록 고정하고 필요한 경우 강사의 지지를 받습니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(고정된 지지를 사용하거나 높이를 조정합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-sit-to-stand-isolated\" · 체어 앉았다 일어서기 · 양발 바닥 고정 & 좌골 수직 기립 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 앉았다 일어서기의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-sit-to-stand-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-sit-to-stand",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-sit-to-stand-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-sit-to-stand-isolated",
          "summaryKo": "2D rig(chair-sit-to-stand-isolated)는 양발(ankle: 186,170)을 바닥에 고정한 채 체어 시트(pelvis: 136,108)에서 발바닥으로 바닥을 밀며 상체와 골반(178,102, head: 178,16)을 수직으로 일으켜 세웁니다. 및 고정 지지점(바닥에 평행하게 디딘 양발 발목(ankle: 186,170)과 뒤꿈치(heel: 180,176)가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-sit-to-stand-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-sit-to-stand-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-sit-to-stand",
          "summaryKo": "체어 앉았다 일어서기의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-sit-to-stand-isolated 도해에서 체어 앉았다 일어서기(original-chair-sit-to-stand)의 핵심 지지점(바닥에 평행하게 디딘 양발 발목(ankle: 186,170)과 뒤꿈치(heel: 180,176)가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-sit-to-stand-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-supported-swan",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 26,
    "nameKo": "바렐 스완 준비",
    "nameEn": "Barrel Swan Preparation",
    "apparatus": "barrel",
    "bodyPosition": "prone",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-barrel-supported-swan",
      "nameKo": "바렐 스완 준비",
      "nameEn": "Barrel Swan Preparation",
      "apparatus": "barrel",
      "bodyPosition": "prone",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-supported-swan",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Barrel Swan Preparation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-supported-swan",
        "title": "Supported Standing & Trunk Control Exercises (Barrel Swan Preparation)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 엎드린 자세(Prone)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 몸통과 발의 지지를 강사가 확인한 뒤 가슴을 앞으로 길게 보내 작은 신전을 탐색합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "엎드린 자세(Prone) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 스완 준비의 핵심 가동 구간(몸통과 발의 지지를 강사가 확인한 뒤 가슴을 앞으로 길게 보내 작은 신전을 탐색합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "등·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 바렐 정점(132,104) 치골 지지와 래더 가로대(228,132) 발 고정 위에서 흉추(80,98→82,82)와 머리(42,91→46,54)가 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 하체 래더 지지와 치골 앵커를 유지하며 바렐 곡면을 따라 편심성 복귀(머리 46,54→43,78)합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "등",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 등, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "몸통과 발의 지지를 강사가 확인한 뒤 가슴을 앞으로 길게 보내 작은 신전을 탐색합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 바렐의 곡면과 발 고정에 맞춰 지지를 조정하고 승하차를 보조합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(몸통을 지지한 채 호흡과 등 길이만 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"prone-swan-pulling-straps-swimming\" · 래더 바렐 정점(132,104) 치골 지지 + 래더 가로대(228,132) 발 고정 스완 준비)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 스완 준비의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "prone-swan-pulling-straps-swimming",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-supported-swan",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: prone, spinalPlanes: [extension]로 정의하며 2D rig \"prone-swan-pulling-straps-swimming\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "2D rig(prone-swan-pulling-straps-swimming)는 바렐 정점(132,104) 치골 지지와 래더 가로대(228,132) 발 고정 위에서 흉추(80,98→82,82)와 머리(42,91→46,54)가 상승합니다. 및 고정 지지점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "단일 2D 평면 투영 도해(prone-swan-pulling-straps-swimming) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-supported-swan",
          "summaryKo": "바렐 스완 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "prone-swan-pulling-straps-swimming 도해에서 바렐 스완 준비(original-barrel-supported-swan)의 핵심 지지점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, prone-swan-pulling-straps-swimming 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-side-leg-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 27,
    "nameKo": "테이블 사이드 레그 리치",
    "nameEn": "Table Side-Lying Leg Reach",
    "apparatus": "cadillac",
    "bodyPosition": "side-lying",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-cadillac-side-leg-reach",
      "nameKo": "테이블 사이드 레그 리치",
      "nameEn": "Table Side-Lying Leg Reach",
      "apparatus": "cadillac",
      "bodyPosition": "side-lying",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-side-leg-reach",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Side-Lying Leg Reach)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-side-leg-reach",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Side-Lying Leg Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 옆으로 누운 자세(Side-Lying)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 테이블 중앙에서 옆으로 누워 위쪽 다리를 길게 뻗었다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "옆으로 누운 자세(Side-Lying) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙에 놓인 아래쪽 머리·흉곽·골반 측면",
          "지지 면적을 넓혀 구부린 아래쪽 다리",
          "테이블 매트 또는 프레임을 짚은 앞손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 사이드 레그 리치의 핵심 가동 구간(테이블 중앙에서 옆으로 누워 위쪽 다리를 길게 뻗었다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "둔근·고관절·하체의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙에 놓인 아래쪽 머리·흉곽·골반 측면",
          "지지 면적을 넓혀 구부린 아래쪽 다리",
          "테이블 매트 또는 프레임을 짚은 앞손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙에 놓인 아래쪽 머리·흉곽·골반 측면",
          "지지 면적을 넓혀 구부린 아래쪽 다리",
          "테이블 매트 또는 프레임을 짚은 앞손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 골반 전·후방 회전 없이 위쪽 다리를 고관절 후방 신전(+14°, 발목 저굴)으로 길게 리치하여 고관절 수평 스윕을 완성합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "둔근",
        "고관절",
        "하체"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 둔근, 고관절, 하체의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "테이블 중앙에서 옆으로 누워 위쪽 다리를 길게 뻗었다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 테이블 가장자리와 충분히 거리를 두고 지지를 확보합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(무릎을 굽혀 지지 면적을 넓힙니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"side-lying-leg-press-sweep\" · 사이드 킥 · 측와위 귀-어깨-고관절 일직선·골반 수직 적층 & 전후 수평 스윕)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 사이드 레그 리치의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "side-lying-leg-press-sweep",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-side-leg-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: side-lying, spinalPlanes: [neutral]로 정의하며 2D rig \"side-lying-leg-press-sweep\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "2D rig(side-lying-leg-press-sweep)는 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다. 및 고정 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "단일 2D 평면 투영 도해(side-lying-leg-press-sweep) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-side-leg-reach",
          "summaryKo": "테이블 사이드 레그 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "side-lying-leg-press-sweep 도해에서 테이블 사이드 레그 리치(original-cadillac-side-leg-reach)의 핵심 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, side-lying-leg-press-sweep 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-supported-calf-raise",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 28,
    "nameKo": "체어 지지 카프 레이즈",
    "nameEn": "Chair Supported Calf Raise",
    "apparatus": "chair",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-supported-calf-raise",
      "nameKo": "체어 지지 카프 레이즈",
      "nameEn": "Chair Supported Calf Raise",
      "apparatus": "chair",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-supported-calf-raise",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Supported Calf Raise)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-supported-calf-raise",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Supported Calf Raise)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 바닥에 서서 강사가 확인한 고정 지지를 잡고 발뒤꿈치를 조금 들었다 내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(기구 지지 손(hand: 116,106)과 바닥 발볼(toe: 102,176)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 지지 카프 레이즈의 핵심 가동 구간(바닥에 서서 강사가 확인한 고정 지지를 잡고 발뒤꿈치를 조금 들었다 내립니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "종아리·발목·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 손(116,106)으로 기구를 안정적으로 잡은 채 발볼(102,176) 위에서 뒤꿈치(y:174→160)와 정수리(y:26→16)가 수직 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 기구 손 지지를 유지하며 종아리 편심성 조절로 뒤꿈치(y:160→169)를 바닥으로 천천히 내립니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "종아리",
        "발목",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 종아리, 발목, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에 서서 강사가 확인한 고정 지지를 잡고 발뒤꿈치를 조금 들었다 내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 페달 위에 올라서지 않고 체어가 넘어지거나 움직이지 않는지 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(발뒤꿈치의 무게만 조금 덜어냅니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-supported-calf-raise-isolated\" · 체어 지지 카프 레이즈 · 체어 손 고정 & 카프 레이즈 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 지지 카프 레이즈의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-supported-calf-raise-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-supported-calf-raise",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-supported-calf-raise-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-supported-calf-raise-isolated",
          "summaryKo": "2D rig(chair-supported-calf-raise-isolated)는 손(116,106)으로 기구를 안정적으로 잡은 채 발볼(102,176) 위에서 뒤꿈치(y:174→160)와 정수리(y:26→16)가 수직 상승합니다. 및 고정 지지점(기구 지지 손(hand: 116,106)과 바닥 발볼(toe: 102,176)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-supported-calf-raise-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-supported-calf-raise-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-supported-calf-raise",
          "summaryKo": "체어 지지 카프 레이즈의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-supported-calf-raise-isolated 도해에서 체어 지지 카프 레이즈(original-chair-supported-calf-raise)의 핵심 지지점(기구 지지 손(hand: 116,106)과 바닥 발볼(toe: 102,176)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-supported-calf-raise-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-supported-side-bend",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 29,
    "nameKo": "바렐 사이드 벤드 준비",
    "nameEn": "Barrel Side Bend Preparation",
    "apparatus": "barrel",
    "bodyPosition": "side-lying",
    "spinalPlanes": [
      "lateral"
    ],
    "exercise": {
      "id": "original-barrel-supported-side-bend",
      "nameKo": "바렐 사이드 벤드 준비",
      "nameEn": "Barrel Side Bend Preparation",
      "apparatus": "barrel",
      "bodyPosition": "side-lying",
      "spinalPlanes": [
        "lateral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-supported-side-bend",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Barrel Side Bend Preparation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-supported-side-bend",
        "title": "Supported Standing & Trunk Control Exercises (Barrel Side Bend Preparation)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 옆으로 누운 자세(Side-Lying)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바렐의 옆 지지와 발 고정을 강사가 보조한 상태에서 짧은 옆 기울임을 연습합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "옆으로 누운 자세(Side-Lying) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 사이드 벤드 준비의 핵심 가동 구간(바렐의 옆 지지와 발 고정을 강사가 보조한 상태에서 짧은 옆 기울임을 연습합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "옆구리·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 바렐 아치 상단(pelvis: 126,116)과 우측 사다리 가로대 발 지지(ankle: 228,132)를 고정한 채 상체(head: 52,88→84,32)를 옆구리 힘으로 들어 올립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 측면 복사근 편심성 제어로 상체를 바렐 곡선 사선 정렬(head: 56,74)로 내려놓습니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "옆구리",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 옆구리, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바렐의 옆 지지와 발 고정을 강사가 보조한 상태에서 짧은 옆 기울임을 연습합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 혼자 승하차하지 않고 몸통의 접촉과 발 지지가 유지되는지 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(강사의 지지를 받아 움직임 없이 호흡만 유지합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-side-lying-side-bend-isolated\" · 래더 바렐 사이드라잉 사이드 벤드 · 바렐 아치 골반 지지 & 래더 발 고정 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 사이드 벤드 준비의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-side-lying-side-bend-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-supported-side-bend",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: side-lying, spinalPlanes: [lateral]로 정의하며 2D rig \"barrel-side-lying-side-bend-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-side-lying-side-bend-isolated",
          "summaryKo": "2D rig(barrel-side-lying-side-bend-isolated)는 바렐 아치 상단(pelvis: 126,116)과 우측 사다리 가로대 발 지지(ankle: 228,132)를 고정한 채 상체(head: 52,88→84,32)를 옆구리 힘으로 들어 올립니다. 및 고정 지지점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-side-lying-side-bend-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-side-lying-side-bend-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-supported-side-bend",
          "summaryKo": "바렐 사이드 벤드 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-side-lying-side-bend-isolated 도해에서 바렐 사이드 벤드 준비(original-barrel-supported-side-bend)의 핵심 지지점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-side-lying-side-bend-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-quadruped-slide",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 30,
    "nameKo": "테이블 네발기기 슬라이드",
    "nameEn": "Table Quadruped Slide",
    "apparatus": "cadillac",
    "bodyPosition": "quadruped",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-cadillac-quadruped-slide",
      "nameKo": "테이블 네발기기 슬라이드",
      "nameEn": "Table Quadruped Slide",
      "apparatus": "cadillac",
      "bodyPosition": "quadruped",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-quadruped-slide",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Quadruped Slide)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-quadruped-slide",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Quadruped Slide)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 네발기기/플랭크 지지 자세(Quadruped)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 테이블 중앙에서 손 또는 발 하나를 짧게 밀었다 돌아오며 지지를 유지합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "네발기기/플랭크 지지 자세(Quadruped) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙을 지지하는 양손 손바닥(어깨 수직 아래)",
          "테이블 매트 위 양측 무릎 및 정강이(골반 수직 아래)",
          "비거상 측 3점 또는 4점 지지 기반"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(흉추(thoracic), 요추(lumbar), 골반(pelvis) 및 지지측 손목/무릎이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 네발기기 슬라이드의 핵심 가동 구간(테이블 중앙에서 손 또는 발 하나를 짧게 밀었다 돌아오며 지지를 유지합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·어깨·균형의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙을 지지하는 양손 손바닥(어깨 수직 아래)",
          "테이블 매트 위 양측 무릎 및 정강이(골반 수직 아래)",
          "비거상 측 3점 또는 4점 지지 기반"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 흉추·요추·골반(y:80~82)이 수평 고정된 채 손(x:102→26, y:150→72)은 앞으로, 발목(x:256→288, y:150→82)은 뒤로 수평 리치합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 중앙을 지지하는 양손 손바닥(어깨 수직 아래)",
          "테이블 매트 위 양측 무릎 및 정강이(골반 수직 아래)",
          "비거상 측 3점 또는 4점 지지 기반"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 몸통 회전 없이 손과 무릎이 다시 어깨·고관절 아래 지지 위치로 돌아옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "어깨",
        "균형"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 어깨, 균형의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "테이블 중앙에서 손 또는 발 하나를 짧게 밀었다 돌아오며 지지를 유지합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 테이블 가장자리와 바의 위치를 확인하고 손목·무릎의 지지를 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(네 지점을 모두 지지하고 작은 체중 이동을 연습합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"quadruped-reach-slide\" · 네발기기(Quadruped) 팔·다리 리치 & 슬라이드 (버드독))로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 네발기기 슬라이드의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "quadruped-reach-slide",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-quadruped-slide",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: quadruped, spinalPlanes: [neutral]로 정의하며 2D rig \"quadruped-reach-slide\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "quadruped-reach-slide",
          "summaryKo": "2D rig(quadruped-reach-slide)는 흉추·요추·골반(y:80~82)이 수평 고정된 채 손(x:102→26, y:150→72)은 앞으로, 발목(x:256→288, y:150→82)은 뒤로 수평 리치합니다. 및 고정 지지점(흉추(thoracic), 요추(lumbar), 골반(pelvis) 및 지지측 손목/무릎이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "quadruped-reach-slide",
          "summaryKo": "단일 2D 평면 투영 도해(quadruped-reach-slide) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-quadruped-slide",
          "summaryKo": "테이블 네발기기 슬라이드의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "quadruped-reach-slide 도해에서 테이블 네발기기 슬라이드(original-cadillac-quadruped-slide)의 핵심 지지점(흉추(thoracic), 요추(lumbar), 골반(pelvis) 및 지지측 손목/무릎이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, quadruped-reach-slide 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-incline-support",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 31,
    "nameKo": "체어 고정 좌면 플랭크 준비",
    "nameEn": "Fixed-Seat Incline Support",
    "apparatus": "chair",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "original-chair-incline-support",
      "nameKo": "체어 고정 좌면 플랭크 준비",
      "nameEn": "Fixed-Seat Incline Support",
      "apparatus": "chair",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-incline-support",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Fixed-Seat Incline Support)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-incline-support",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Fixed-Seat Incline Support)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 제조사가 허용한 고정 좌면에 손을 대고 발을 조금 뒤로 보내 짧게 지지합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 고정 좌면 플랭크 준비의 핵심 가동 구간(제조사가 허용한 고정 좌면에 손을 대고 발을 조금 뒤로 보내 짧게 지지합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "몸통·어깨·팔의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 체어 시트 상단(132,106)에 손목을 지지한 채 복부 스쿱으로 골반(178,104→176,48)과 페달 위 발목(216,156→208,134)을 끌어올립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 시트 손목 지지를 유지하며 페달 위 발목(208,134→216,159)과 골반을 시작 사선 정렬로 감속 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "몸통",
        "어깨",
        "팔"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 몸통, 어깨, 팔의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "제조사가 허용한 고정 좌면에 손을 대고 발을 조금 뒤로 보내 짧게 지지합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 움직이는 페달은 사용하지 않습니다. 체어 고정과 손목 부담을 강사가 확인합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(체어 가까이에 서서 작은 기울임으로 시작합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-plank-pike-isolated\" · 체어 시트 손 지지 · 페달 발 지지 플랭크 & 파이크 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 고정 좌면 플랭크 준비의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-plank-pike-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-incline-support",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-plank-pike-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-plank-pike-isolated",
          "summaryKo": "2D rig(chair-plank-pike-isolated)는 체어 시트 상단(132,106)에 손목을 지지한 채 복부 스쿱으로 골반(178,104→176,48)과 페달 위 발목(216,156→208,134)을 끌어올립니다. 및 고정 지지점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-plank-pike-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-plank-pike-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-incline-support",
          "summaryKo": "체어 고정 좌면 플랭크 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-plank-pike-isolated 도해에서 체어 고정 좌면 플랭크 준비(original-chair-incline-support)의 핵심 지지점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-plank-pike-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-barrel-standing-side-stretch",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 32,
    "nameKo": "바렐 스탠딩 사이드 리치",
    "nameEn": "Barrel Standing Side Reach",
    "apparatus": "barrel",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "lateral"
    ],
    "exercise": {
      "id": "original-barrel-standing-side-stretch",
      "nameKo": "바렐 스탠딩 사이드 리치",
      "nameEn": "Barrel Standing Side Reach",
      "apparatus": "barrel",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "lateral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-original-barrel-standing-side-stretch",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Barrel Standing Side Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-original-barrel-standing-side-stretch",
        "title": "Supported Standing & Trunk Control Exercises (Barrel Standing Side Reach)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(스프링 사용 없음) 설정을 확인한다. 바닥에서 고정된 지지를 잡고 반대 팔을 위로 길게 보내 작은 측굴을 탐색합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바닥에 디딘 양발(ankle: 148,170)과 기립 골반(pelvis: 148,122)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 바렐 스탠딩 사이드 리치의 핵심 가동 구간(바닥에서 고정된 지지를 잡고 반대 팔을 위로 길게 보내 작은 측굴을 탐색합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "옆구리·어깨·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 양발(ankle: 148,170)로 바닥에 서서 골반(148,122)을 고정한 채 반대 팔(hand: 180,22→88,24)과 흉곽을 바렐 쪽으로 길게 측굴합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "래더 바렐 주변 평탄한 바닥에 단단히 디딘 양발(또는 지지 측 발바닥)",
          "고정된 래더 상단 가로대 또는 바렐 고정 지지부에 가볍게 얹은 손",
          "정수리부터 발뒤꿈치까지 이어지는 수직 입위 축"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 골반과 하체 기둥을 흔들림 없이 유지하며 상체를 수직으로 세우고 팔(hand: 176,104)을 내립니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "옆구리",
        "어깨",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 옆구리, 어깨, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에서 고정된 지지를 잡고 반대 팔을 위로 길게 보내 작은 측굴을 탐색합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바렐과 래더의 고정·간격·접촉면을 확인합니다. 올라가고 내려오는 방법과 지지 위치는 강사가 정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔을 낮게 두고 범위를 줄입니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-standing-side-stretch-isolated\" · 바렐 스탠딩 사이드 리치 · 양발 바닥 기립 & 오버헤드 측굴 스트레치 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "바렐 스탠딩 사이드 리치의 기구 세팅(스프링: 스프링 사용 없음, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-standing-side-stretch-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-barrel-standing-side-stretch",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: standing, spinalPlanes: [lateral]로 정의하며 2D rig \"barrel-standing-side-stretch-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-standing-side-stretch-isolated",
          "summaryKo": "2D rig(barrel-standing-side-stretch-isolated)는 양발(ankle: 148,170)로 바닥에 서서 골반(148,122)을 고정한 채 반대 팔(hand: 180,22→88,24)과 흉곽을 바렐 쪽으로 길게 측굴합니다. 및 고정 지지점(바닥에 디딘 양발(ankle: 148,170)과 기립 골반(pelvis: 148,122)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-standing-side-stretch-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-standing-side-stretch-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-barrel-standing-side-stretch",
          "summaryKo": "바렐 스탠딩 사이드 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-standing-side-stretch-isolated 도해에서 바렐 스탠딩 사이드 리치(original-barrel-standing-side-stretch)의 핵심 지지점(바닥에 디딘 양발(ankle: 148,170)과 기립 골반(pelvis: 148,122)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-standing-side-stretch-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-prone-back-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 33,
    "nameKo": "테이블 스완 준비",
    "nameEn": "Table Swan Preparation",
    "apparatus": "cadillac",
    "bodyPosition": "prone",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-cadillac-prone-back-reach",
      "nameKo": "테이블 스완 준비",
      "nameEn": "Table Swan Preparation",
      "apparatus": "cadillac",
      "bodyPosition": "prone",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-prone-back-reach",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Table Swan Preparation)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-prone-back-reach",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Table Swan Preparation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 엎드린 자세(Prone)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 스프링이나 바를 사용하지 않고 가슴을 앞쪽으로 길게 보내는 작은 신전을 탐색합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "엎드린 자세(Prone) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 전방 하부 흉곽·복부 및 치골",
          "어깨 옆 테이블 매트를 가볍게 지지한 양손 및 전완",
          "테이블 위에 길게 뻗어 지지한 양측 대퇴 전면 및 발등"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(캐딜락 테이블 베드 위 치골(146,142)·하체(230,143) 및 carriageOffsetPx=0 고정)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 테이블 스완 준비의 핵심 가동 구간(스프링이나 바를 사용하지 않고 가슴을 앞쪽으로 길게 보내는 작은 신전을 탐색합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "등·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 전방 하부 흉곽·복부 및 치골",
          "어깨 옆 테이블 매트를 가볍게 지지한 양손 및 전완",
          "테이블 위에 길게 뻗어 지지한 양측 대퇴 전면 및 발등"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 고정된 캐딜락 테이블(y=142) 위에서 치골(146,142)과 하체를 고정한 채 전방 리치(손 36,102→38,72)와 함께 흉추(92,136→94,120)가 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 전방 하부 흉곽·복부 및 치골",
          "어깨 옆 테이블 매트를 가볍게 지지한 양손 및 전완",
          "테이블 위에 길게 뻗어 지지한 양측 대퇴 전면 및 발등"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 치골 고정을 유지하며 아래 흉곽부터 베드 방향으로 길게 편심성 복귀(머리 56,92→55,115)합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "등",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 등, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "스프링이나 바를 사용하지 않고 가슴을 앞쪽으로 길게 보내는 작은 신전을 탐색합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(이마 아래 지지를 두고 호흡만 관찰합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"prone-swan-pulling-straps-swimming\" · 캐딜락 테이블(y=142) 고정 지지 및 전방 프레임/바 리치 흉추 신전)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "테이블 스완 준비의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "prone-swan-pulling-straps-swimming",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-prone-back-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: prone, spinalPlanes: [extension]로 정의하며 2D rig \"prone-swan-pulling-straps-swimming\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "2D rig(prone-swan-pulling-straps-swimming)는 고정된 캐딜락 테이블(y=142) 위에서 치골(146,142)과 하체를 고정한 채 전방 리치(손 36,102→38,72)와 함께 흉추(92,136→94,120)가 상승합니다. 및 고정 지지점(캐딜락 테이블 베드 위 치골(146,142)·하체(230,143) 및 carriageOffsetPx=0 고정)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "단일 2D 평면 투영 도해(prone-swan-pulling-straps-swimming) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-prone-back-reach",
          "summaryKo": "테이블 스완 준비의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "prone-swan-pulling-straps-swimming 도해에서 테이블 스완 준비(original-cadillac-prone-back-reach)의 핵심 지지점(캐딜락 테이블 베드 위 치골(146,142)·하체(230,143) 및 carriageOffsetPx=0 고정)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, prone-swan-pulling-straps-swimming 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-back-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 34,
    "nameKo": "체어 시티드 가슴 리치",
    "nameEn": "Chair Seated Chest Reach",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "extension"
    ],
    "exercise": {
      "id": "original-chair-seated-back-reach",
      "nameKo": "체어 시티드 가슴 리치",
      "nameEn": "Chair Seated Chest Reach",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-back-reach",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Chest Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-back-reach",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Chest Reach)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 두 발과 좌골을 지지하고 가슴을 앞·위로 조금 길게 보냈다 돌아옵니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(체어 시트 좌골(pelvis: 132,108), 요추(lumbar: 132,92), 바닥 양발(ankle: 186,170)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 가슴 리치의 핵심 가동 구간(두 발과 좌골을 지지하고 가슴을 앞·위로 조금 길게 보냈다 돌아옵니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "등·흉곽·어깨의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 좌골(132,108)과 요추(132,92)를 안정적으로 지지한 채 흉추(132,74→142,68)와 머리(132,26→142,20)를 앞·위로 길게 뻗어 가슴을 엽니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 갈비뼈를 부드럽게 정돈하며 상부 흉추(142,68→136,71)가 중립 수직선으로 돌아옵니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "등",
        "흉곽",
        "어깨"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 등, 흉곽, 어깨의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "두 발과 좌골을 지지하고 가슴을 앞·위로 조금 길게 보냈다 돌아옵니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 허리를 꺾거나 고개를 뒤로 떨어뜨리지 않고 작은 범위를 선택합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(손을 허벅지에 놓고 호흡만 연결합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-back-reach-isolated\" · 체어 시티드 가슴 리치 · 좌골 지지 & 상부 흉추 전상방 신전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 가슴 리치의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-back-reach-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-back-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [extension]로 정의하며 2D rig \"chair-seated-back-reach-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-back-reach-isolated",
          "summaryKo": "2D rig(chair-seated-back-reach-isolated)는 좌골(132,108)과 요추(132,92)를 안정적으로 지지한 채 흉추(132,74→142,68)와 머리(132,26→142,20)를 앞·위로 길게 뻗어 가슴을 엽니다. 및 고정 지지점(체어 시트 좌골(pelvis: 132,108), 요추(lumbar: 132,92), 바닥 양발(ankle: 186,170)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-back-reach-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-back-reach-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-back-reach",
          "summaryKo": "체어 시티드 가슴 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-back-reach-isolated 도해에서 체어 시티드 가슴 리치(original-chair-seated-back-reach)의 핵심 지지점(체어 시트 좌골(pelvis: 132,108), 요추(lumbar: 132,92), 바닥 양발(ankle: 186,170)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-back-reach-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-cadillac-seated-side-reach",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 35,
    "nameKo": "캐딜락 시티드 사이드 리치",
    "nameEn": "Cadillac Seated Side Reach",
    "apparatus": "cadillac",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "lateral"
    ],
    "exercise": {
      "id": "original-cadillac-seated-side-reach",
      "nameKo": "캐딜락 시티드 사이드 리치",
      "nameEn": "Cadillac Seated Side Reach",
      "apparatus": "cadillac",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "lateral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-original-cadillac-seated-side-reach",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Seated Side Reach)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-original-cadillac-seated-side-reach",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Seated Side Reach)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 테이블에 안정적으로 앉아 한 팔을 길게 보내며 편한 측굴 범위를 찾습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 시티드 사이드 리치의 핵심 가동 구간(테이블에 안정적으로 앉아 한 팔을 길게 보내며 편한 측굴 범위를 찾습니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "옆구리·몸통·어깨의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 중앙에 수직으로 안착한 양측 좌골결절",
          "테이블 매트 또는 수직 기둥에 지지한 양발/하지",
          "롤다운 바·푸시스루바 또는 테이블 표면을 지지한 양손"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 측면 복사근 수축으로 몸통이 수직 중심축(head x:148,y:34)으로 복귀하고 팔이 카운터 스트레치(x:82,y:98)로 내려옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "옆구리",
        "몸통",
        "어깨"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 옆구리, 몸통, 어깨의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "테이블에 안정적으로 앉아 한 팔을 길게 보내며 편한 측굴 범위를 찾습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 바·스프링·클립·안전 스트랩을 제조사 지침에 따라 점검합니다. 바의 이동 범위와 보조 위치는 강사가 결정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔을 낮추고 몸통의 움직임을 작게 합니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"lateral-mermaid-side-bend\" · 머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 시티드 사이드 리치의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "lateral-mermaid-side-bend",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-cadillac-seated-side-reach",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: seated, spinalPlanes: [lateral]로 정의하며 2D rig \"lateral-mermaid-side-bend\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "lateral-mermaid-side-bend",
          "summaryKo": "2D rig(lateral-mermaid-side-bend)는 골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다. 및 고정 지지점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "lateral-mermaid-side-bend",
          "summaryKo": "단일 2D 평면 투영 도해(lateral-mermaid-side-bend) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-cadillac-seated-side-reach",
          "summaryKo": "캐딜락 시티드 사이드 리치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "lateral-mermaid-side-bend 도해에서 캐딜락 시티드 사이드 리치(original-cadillac-seated-side-reach)의 핵심 지지점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, lateral-mermaid-side-bend 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "original-chair-seated-mermaid",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 36,
    "nameKo": "체어 시티드 머메이드",
    "nameEn": "Chair Seated Mermaid",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "lateral"
    ],
    "exercise": {
      "id": "original-chair-seated-mermaid",
      "nameKo": "체어 시티드 머메이드",
      "nameEn": "Chair Seated Mermaid",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "lateral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-original-chair-seated-mermaid",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Chair Seated Mermaid)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-original-chair-seated-mermaid",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Chair Seated Mermaid)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(강사가 기구별 설정) 설정을 확인한다. 발을 바닥에 둔 채 한 팔을 위로 길게 보내 작은 옆 기울임을 탐색합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 체어 시티드 머메이드의 핵심 가동 구간(발을 바닥에 둔 채 한 팔을 위로 길게 보내 작은 옆 기울임을 탐색합니다.)을 수행한다. 높이와 횟수보다 편안한 범위와 일정한 속도를 먼저 확인합니다.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "옆구리·몸통의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (편안한 호흡을 이어가며 힘을 쓰는 구간의 호흡은 강사와 조정합니다.)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 측면 복사근 수축으로 몸통이 수직 중심축(head x:148,y:34)으로 복귀하고 팔이 카운터 스트레치(x:82,y:98)로 내려옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "옆구리",
        "몸통"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 옆구리, 몸통의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발을 바닥에 둔 채 한 팔을 위로 길게 보내 작은 옆 기울임을 탐색합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "강사 검토 전 계획 자료입니다. 체어의 고정과 페달·핸들·스프링을 점검합니다. 승하차와 페달 복귀는 강사가 보조하고 장력은 직접 설정합니다. 통증이나 불편이 생기면 동작을 멈추고 강사와 구성을 조정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(팔을 낮추고 손을 좌면의 고정 부분에 둡니다.)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-mermaid-isolated\" · 체어 시티드 머메이드 · 시트 상단 좌골 착석 & 페달 지지 측굴 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "체어 시티드 머메이드의 기구 세팅(스프링: 강사가 기구별 설정, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-mermaid-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "original-chair-seated-mermaid",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [lateral]로 정의하며 2D rig \"chair-seated-mermaid-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-mermaid-isolated",
          "summaryKo": "2D rig(chair-seated-mermaid-isolated)는 체어 시트 상단 좌골(pelvis: 136,108)과 바닥 지지 발(heel: 182,176)을 고정한 채 지지 손(farWrist: 196,108→216,156)으로 페달을 누르며 반대 팔(hand: 82,36→216,22)과 흉곽이 측굴한 뒤 좌골 위 수직 척추로 감속 복귀하는 과정을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-mermaid-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-mermaid-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "original-chair-seated-mermaid",
          "summaryKo": "체어 시티드 머메이드의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-mermaid-isolated 도해에서 체어 시티드 머메이드(original-chair-seated-mermaid)의 핵심 지지점(체어 시트 좌골(pelvis: 136,108)과 바닥 지지 발(heel: 182,176))과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-mermaid-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-warmup-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 37,
    "nameKo": "펠빅 클락 & 흉식 호흡 임프린팅",
    "nameEn": "Pelvic Clock & Ribcage Breathing",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral",
      "flexion"
    ],
    "exercise": {
      "id": "ex-warmup-01",
      "nameKo": "펠빅 클락 & 흉식 호흡 임프린팅",
      "nameEn": "Pelvic Clock & Ribcage Breathing",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-warmup-01",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Pelvic Clock & Ribcage Breathing)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-warmup-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Pelvic Clock & Ribcage Breathing)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R 1B) 설정을 확인한다. 무릎 사이에 미니볼을 가볍게 끼워 내전근 텐션을 깨워주세요.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (코로 깊게 들쉬며 갈비뼈 양옆 확장 → 입으로 가늘게 내쉬며 아랫배 납작하게 닫기)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 펠빅 클락 & 흉식 호흡 임프린팅의 핵심 가동 구간(미니볼 균등한 비율 조이기 + 골반 시계 방향/반시계 방향 12방위 서클)을 수행한다. 꼬리뼈(6시)와 배꼽(12시) 사이로 작은 구슬을 굴리듯 골반 경사를 부드럽게 만듭니다. 어깨와 귀 사이가 멀어지도록 쇄골을 옆으로 길게 펼쳐주세요.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "횡격막·복횡근·골반저근·다열근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 손끝이 천장(x:120,y:74)에서 머리 위 사선(x:56,y:70)으로 이동하며 요추가 매트로 밀착됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (코로 깊게 들쉬며 갈비뼈 양옆 확장 → 입으로 가늘게 내쉬며 아랫배 납작하게 닫기)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 양팔이 큰 원호를 그리며 골반 옆(x:166,y:138)으로 내려오고 골반이 중립(y:142)으로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "횡격막",
        "복횡근",
        "골반저근",
        "다열근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 횡격막, 복횡근, 골반저근, 다열근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "무릎 사이에 미니볼을 가볍게 끼워 내전근 텐션을 깨워주세요. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "목과 승모근에 과긴장이 들어가지 않도록 턱이 들리지 않게 유도합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(두 발을 풋바에 안정적으로 두고 골반 12시-6시 틸팅만 집중 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-breath-pelvic-clock\" · 수파인 호흡 · 골반 시계 & 흉곽 암 아크)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "펠빅 클락 & 흉식 호흡 임프린팅의 기구 세팅(스프링: 2R 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-breath-pelvic-clock",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-warmup-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral, flexion]로 정의하며 2D rig \"supine-breath-pelvic-clock\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-breath-pelvic-clock",
          "summaryKo": "2D rig(supine-breath-pelvic-clock)는 손끝이 천장(x:120,y:74)에서 머리 위 사선(x:56,y:70)으로 이동하며 요추가 매트로 밀착됩니다. 및 고정 지지점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-breath-pelvic-clock",
          "summaryKo": "단일 2D 평면 투영 도해(supine-breath-pelvic-clock) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-warmup-01",
          "summaryKo": "펠빅 클락 & 흉식 호흡 임프린팅의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-breath-pelvic-clock 도해에서 펠빅 클락 & 흉식 호흡 임프린팅(ex-warmup-01)의 핵심 지지점(후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-breath-pelvic-clock 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-warmup-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 38,
    "nameKo": "캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치",
    "nameEn": "Cadillac Roll-Down Bar Cat & Thoracic Opener",
    "apparatus": "cadillac",
    "bodyPosition": "kneeling",
    "spinalPlanes": [
      "flexion",
      "extension"
    ],
    "exercise": {
      "id": "ex-warmup-02",
      "nameKo": "캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치",
      "nameEn": "Cadillac Roll-Down Bar Cat & Thoracic Opener",
      "apparatus": "cadillac",
      "bodyPosition": "kneeling",
      "spinalPlanes": [
        "flexion",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-ex-warmup-02",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Roll-Down Bar Cat & Thoracic Opener)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-ex-warmup-02",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Roll-Down Bar Cat & Thoracic Opener)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 무릎 선 자세(Kneeling)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1B) 설정을 확인한다. 겨드랑이 아래 전거근을 끌어내려 롤다운 바를 누르는 힘을 유지하세요.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "무릎 선 자세(Kneeling) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 양측 무릎과 정강이 전면",
          "롤다운 바(Roll-Down Bar)를 어깨너비로 파지한 양손",
          "하부 흉곽 및 골반 중립 지지 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(캐딜락 테이블 위 양무릎(knee: 146,142)과 정강이(ankle: 108,144)가 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 정수리 길게 세우기 → 내쉬며 정수리부터 분절해 바를 앞으로 밀어내기)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치의 핵심 가동 구간(톨 닐링(Tall Kneeling) 자세에서 롤다운 + 하단 스완 신전 연결)을 수행한다. 허리가 꺾이지 않도록 배꼽을 등 쪽으로 당기며 C-커브를 먼저 만듭니다. 하단에서 흉추를 길게 신전하며 가슴을 매트 쪽으로 부드럽게 녹여냅니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "척추기립근·광배근·전거근·복직근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 양측 무릎과 정강이 전면",
          "롤다운 바(Roll-Down Bar)를 어깨너비로 파지한 양손",
          "하부 흉곽 및 골반 중립 지지 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 양무릎(146,142) 지지 위에서 복부를 등 쪽으로 당기며 정수리(142,30→188,76)와 흉추(142,86→152,68)를 둥글게 말아 롤다운 바(hand: 198,78→230,114)를 아래로 밀어냅니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 정수리 길게 세우기 → 내쉬며 정수리부터 분절해 바를 앞으로 밀어내기)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 양측 무릎과 정강이 전면",
          "롤다운 바(Roll-Down Bar)를 어깨너비로 파지한 양손",
          "하부 흉곽 및 골반 중립 지지 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 하단 흉추 신전 후 골반 위에 요추·흉추·머리를 차례로 쌓아 올려(head: 148,34) 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "척추기립근",
        "광배근",
        "전거근",
        "복직근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 척추기립근, 광배근, 전거근, 복직근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "겨드랑이 아래 전거근을 끌어내려 롤다운 바를 누르는 힘을 유지하세요. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "손목이 꺾이지 않도록 손등과 전완근 일직선을 유지합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양반다리(Seated) 자세에서 짧은 가동범위로 C-커브 분절만 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"cadillac-kneeling-cat-stretch-isolated\" · 캐딜락 롤다운 바 닐링 캣 스트레치 · 전방 척추 분절 굴곡·신전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치의 기구 세팅(스프링: 1R 1B, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "cadillac-kneeling-cat-stretch-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-warmup-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: kneeling, spinalPlanes: [flexion, extension]로 정의하며 2D rig \"cadillac-kneeling-cat-stretch-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "cadillac-kneeling-cat-stretch-isolated",
          "summaryKo": "2D rig(cadillac-kneeling-cat-stretch-isolated)는 양무릎(146,142) 지지 위에서 복부를 등 쪽으로 당기며 정수리(142,30→188,76)와 흉추(142,86→152,68)를 둥글게 말아 롤다운 바(hand: 198,78→230,114)를 아래로 밀어냅니다. 및 고정 지지점(캐딜락 테이블 위 양무릎(knee: 146,142)과 정강이(ankle: 108,144)가 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "cadillac-kneeling-cat-stretch-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(cadillac-kneeling-cat-stretch-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-warmup-02",
          "summaryKo": "캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "cadillac-kneeling-cat-stretch-isolated 도해에서 캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치(ex-warmup-02)의 핵심 지지점(캐딜락 테이블 위 양무릎(knee: 146,142)과 정강이(ankle: 108,144)가 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, cadillac-kneeling-cat-stretch-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-footwork-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 39,
    "nameKo": "리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱",
    "nameEn": "Reformer Footwork Series (Heels, Arches, Pilates V, Running)",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-footwork-01",
      "nameKo": "리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱",
      "nameEn": "Reformer Footwork Series (Heels, Arches, Pilates V, Running)",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-footwork-01",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Reformer Footwork Series (Heels, Arches, Pilates V, Running))",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-footwork-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Footwork Series (Heels, Arches, Pilates V, Running))",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R 1B) 설정을 확인한다. 발뒤꿈치(Heels) → 발아치(Arches) → 필라테스 V(Toes V) → 텐던 스트레치(Running) 순서로 이어갑니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 캐리지 길게 밀어내기 → 들쉬며 저항 느끼며 천천히 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱의 핵심 가동 구간(발목 또는 허벅지 사이에 미니볼 끼우고 상단에서 3카운트 펄스(Pulse) 추가)을 수행한다. 무릎을 다 폈을 때 관절을 과신전(Locking)하지 말고 허벅지 안쪽을 지퍼 잠그듯 끌어올리세요. 돌아올 때 캐리지가 쿵 부딪히지 않도록 마지막 5cm를 속근육으로 브레이크 걸어줍니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대퇴사두근·내전근·둔근·비복근/가자미근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 캐리지 길게 밀어내기 → 들쉬며 저항 느끼며 천천히 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee y:134→98)이 다시 굴곡되며 캐리지가 감속 복귀(pelvis x:160→196)합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대퇴사두근",
        "내전근",
        "둔근",
        "비복근/가자미근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대퇴사두근, 내전근, 둔근, 비복근/가자미근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "발뒤꿈치(Heels) → 발아치(Arches) → 필라테스 V(Toes V) → 텐던 스트레치(Running) 순서로 이어갑니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "무릎이 안쪽(X자)으로 모이지 않도록 두 번째 발가락과 슬개골 라인을 일치시킵니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(2R 1B 기본 세팅으로 각 포지션 8회씩 정석 리듬 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"reformer-supine-footwork\" · 리포머 수파인 풋워크 (패럴렐 · V · 와이드 · 카프))로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱의 기구 세팅(스프링: 2R 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "reformer-supine-footwork",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-footwork-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"reformer-supine-footwork\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "2D rig(reformer-supine-footwork)는 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다. 및 고정 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "단일 2D 평면 투영 도해(reformer-supine-footwork) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-footwork-01",
          "summaryKo": "리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "reformer-supine-footwork 도해에서 리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱(ex-footwork-01)의 핵심 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, reformer-supine-footwork 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-footwork-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 40,
    "nameKo": "써클링 와이드 세컨드 & 내전근/외전근 풋워크",
    "nameEn": "Magic Circle Wide Second & Abductor Footwork",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-footwork-02",
      "nameKo": "써클링 와이드 세컨드 & 내전근/외전근 풋워크",
      "nameEn": "Magic Circle Wide Second & Abductor Footwork",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-footwork-02",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Magic Circle Wide Second & Abductor Footwork)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-footwork-02",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Magic Circle Wide Second & Abductor Footwork)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R 1B) 설정을 확인한다. 허벅지 바깥쪽에 써클링을 착용해 중둔근 외전 텐션을 먼저 만든 뒤 캐리지를 밀어냅니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 링을 밀어내며 캐리지 확장 → 들쉬며 텐션 유지한 채 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 써클링 와이드 세컨드 & 내전근/외전근 풋워크의 핵심 가동 구간(써클링 외측 착용(외전) 8회 + 내측 착용(내전) 8회 콤비네이션)을 수행한다. 캐리지 위에서 골반이 좌우로 흔들리지 않게 양쪽 엉덩이 무게중심을 50:50으로 고정하세요. 탑 포지션에서 써클링을 바깥으로 5회 짧게 벌려 중둔근 자극을 극대화합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "중둔근·대퇴근막장근·내전근·대퇴사두근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 링을 밀어내며 캐리지 확장 → 들쉬며 텐션 유지한 채 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee y:134→98)이 다시 굴곡되며 캐리지가 감속 복귀(pelvis x:160→196)합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "중둔근",
        "대퇴근막장근",
        "내전근",
        "대퇴사두근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 중둔근, 대퇴근막장근, 내전근, 대퇴사두근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "허벅지 바깥쪽에 써클링을 착용해 중둔근 외전 텐션을 먼저 만든 뒤 캐리지를 밀어냅니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "고관절 외회전 시 발끝 각도와 무릎 방향이 어긋나지 않게 주의합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(써클링 없이 풋바 양끝 와이드 힐/토 포지션으로 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"reformer-supine-footwork\" · 리포머 수파인 풋워크 (패럴렐 · V · 와이드 · 카프))로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "써클링 와이드 세컨드 & 내전근/외전근 풋워크의 기구 세팅(스프링: 2R 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "reformer-supine-footwork",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-footwork-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"reformer-supine-footwork\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "2D rig(reformer-supine-footwork)는 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다. 및 고정 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "단일 2D 평면 투영 도해(reformer-supine-footwork) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-footwork-02",
          "summaryKo": "써클링 와이드 세컨드 & 내전근/외전근 풋워크의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "reformer-supine-footwork 도해에서 써클링 와이드 세컨드 & 내전근/외전근 풋워크(ex-footwork-02)의 핵심 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, reformer-supine-footwork 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-footwork-03",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 41,
    "nameKo": "운다 체어 시티드 & 스탠딩 풋워크 프레스",
    "nameEn": "Wunda Chair Seated Double Leg & Single Leg Pump",
    "apparatus": "chair",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-footwork-03",
      "nameKo": "운다 체어 시티드 & 스탠딩 풋워크 프레스",
      "nameEn": "Wunda Chair Seated Double Leg & Single Leg Pump",
      "apparatus": "chair",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-ex-footwork-03",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Wunda Chair Seated Double Leg & Single Leg Pump)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-ex-footwork-03",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Wunda Chair Seated Double Leg & Single Leg Pump)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R) 설정을 확인한다. 좌골(Sit-bones) 두 개를 체어 시트에 수직으로 꽂아 척추를 타워처럼 길게 세웁니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 코어 세팅 → 내쉬며 정수리는 천장으로, 페달은 바닥으로 프레스)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 운다 체어 시티드 & 스탠딩 풋워크 프레스의 핵심 가동 구간(양팔 지니(Genie) 포지션 또는 만세 상태에서 더블 레그 펌프)을 수행한다. 페달을 밟아 내릴 때 상체가 뒤로 눕거나 앞으로 쏟아지지 않게 복부 코르셋을 조여주세요. 페달이 올라올 때 다리가 튕겨 올라오지 않게 허벅지 뒤쪽 힘으로 컨트롤합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대퇴사두근·장요근·복횡근·척추기립근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 머리부터 좌골(x:120~122)까지 상체 수직 기둥은 고정된 채 무릎(y:98→132)과 발목(y:136→168)이 페달을 밟아 하강합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 코어 세팅 → 내쉬며 정수리는 천장으로, 페달은 바닥으로 프레스)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면(Seat) 위에 균등하게 안착한 양측 좌골결절",
          "바닥 또는 체어 페달(Pedal) 위에 지지한 양발 발바닥/발볼",
          "체어 시트 가장자리를 가볍게 잡은 양손 또는 체간 수직 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 스프링 반발력을 제어하며 무릎(y:132→104)과 발목(y:168→142)이 상단으로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대퇴사두근",
        "장요근",
        "복횡근",
        "척추기립근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대퇴사두근, 장요근, 복횡근, 척추기립근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "좌골(Sit-bones) 두 개를 체어 시트에 수직으로 꽂아 척추를 타워처럼 길게 세웁니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "고관절 굴곡근(장요근)만 과사용되지 않도록 아랫배를 먼저 끌어올립니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손으로 시트 양옆을 가볍게 잡고 양발 힐/토 프레스 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-seated-pedal-footwork\" · 운다 체어 시티드 페달 프레스 & 교대 풋워크)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "운다 체어 시티드 & 스탠딩 풋워크 프레스의 기구 세팅(스프링: 2R, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-seated-pedal-footwork",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-footwork-03",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: seated, spinalPlanes: [neutral]로 정의하며 2D rig \"chair-seated-pedal-footwork\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-seated-pedal-footwork",
          "summaryKo": "2D rig(chair-seated-pedal-footwork)는 머리부터 좌골(x:120~122)까지 상체 수직 기둥은 고정된 채 무릎(y:98→132)과 발목(y:136→168)이 페달을 밟아 하강합니다. 및 고정 지지점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-seated-pedal-footwork",
          "summaryKo": "단일 2D 평면 투영 도해(chair-seated-pedal-footwork) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-footwork-03",
          "summaryKo": "운다 체어 시티드 & 스탠딩 풋워크 프레스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-seated-pedal-footwork 도해에서 운다 체어 시티드 & 스탠딩 풋워크 프레스(ex-footwork-03)의 핵심 지지점(머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-seated-pedal-footwork 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-bridging-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 42,
    "nameKo": "리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬",
    "nameEn": "Reformer Pelvic Lift Articulation & Hamstring Curl",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "flexion",
      "extension",
      "neutral"
    ],
    "exercise": {
      "id": "ex-bridging-01",
      "nameKo": "리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬",
      "nameEn": "Reformer Pelvic Lift Articulation & Hamstring Curl",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "flexion",
        "extension",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-bridging-01",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Reformer Pelvic Lift Articulation & Hamstring Curl)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-bridging-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Pelvic Lift Articulation & Hamstring Curl)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R) 설정을 확인한다. 주의! 브릿지 전 반드시 헤드레스트를 완전히 평평하게(Flat) 내려 경추를 보호하세요.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(고정 풋바 위 뒤꿈치(266,126)와 평평한 헤드레스트(y:143) 기준선이 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 꼬리뼈부터 말아 브릿지 업 → 들쉬며 밀고 → 내쉬며 당긴 후 윗등부터 분절 하강)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬의 핵심 가동 구간(스프링 2R + 무릎 사이 미니볼 조이며 브릿지 홀드 & 햄스트링 컬 6회)을 수행한다. 골반을 들어 올릴 때 캐리지가 전혀 밀리지 않도록 뒤꿈치로 풋바를 내 몸 쪽으로 끌어당기는 힘을 씁니다. 브릿지 탑에서 무릎-골반-어깨 사선 라인을 유지한 채 캐리지를 15cm만 밀었다가 햄스트링 힘으로 당겨옵니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대둔근·햄스트링·척추분절근·내전근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "상부 흉추·견갑대 및 풋바 위 양발 지지점(골반 거상)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 풋바(266,126) 뒤꿈치 지지와 미니볼 조임으로 브리지 정점(23.2° 사선)에 오른 뒤 캐리지가 18px 활주하며 햄스트링 컬을 수행합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 꼬리뼈부터 말아 브릿지 업 → 들쉬며 밀고 → 내쉬며 당긴 후 윗등부터 분절 하강)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(flat) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 캐리지를 홈 스토퍼(0px)로 되돌린 후 흉추(118,142)→요추(148,142)→골반(178,143)이 캐리지 베드에 완전히 착지합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대둔근",
        "햄스트링",
        "척추분절근",
        "내전근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대둔근, 햄스트링, 척추분절근, 내전근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "주의! 브릿지 전 반드시 헤드레스트를 완전히 평평하게(Flat) 내려 경추를 보호하세요. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "헤드레스트는 반드시 Flat! 햄스트링 쥐가 잘 나는 회원님은 풋바에 발아치(Arches)를 대거나 스프링을 2R 1B로 높입니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 2R 1B 세팅 후 캐리지 고정 상태에서 척추 분절 업/다운만 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-articulated-bridge\" · 리포머 바텀 리프트 & 햄스트링 컬 · 스토퍼 체크 및 정점 캐리지 컬 활주)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬의 기구 세팅(스프링: 2R, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-articulated-bridge",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-bridging-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [flexion, extension, neutral]로 정의하며 2D rig \"supine-articulated-bridge\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "2D rig(supine-articulated-bridge)는 풋바(266,126) 뒤꿈치 지지와 미니볼 조임으로 브리지 정점(23.2° 사선)에 오른 뒤 캐리지가 18px 활주하며 햄스트링 컬을 수행합니다. 및 고정 지지점(고정 풋바 위 뒤꿈치(266,126)와 평평한 헤드레스트(y:143) 기준선이 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "단일 2D 평면 투영 도해(supine-articulated-bridge) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-bridging-01",
          "summaryKo": "리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-articulated-bridge 도해에서 리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬(ex-bridging-01)의 핵심 지지점(고정 풋바 위 뒤꿈치(266,126)와 평평한 헤드레스트(y:143) 기준선이 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-articulated-bridge 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-core-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 43,
    "nameKo": "리포머 수파인 암워크 & 헌드레드 시리즈",
    "nameEn": "Reformer Supine Arms, Coordination & The Hundred",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "flexion",
      "neutral"
    ],
    "exercise": {
      "id": "ex-core-01",
      "nameKo": "리포머 수파인 암워크 & 헌드레드 시리즈",
      "nameEn": "Reformer Supine Arms, Coordination & The Hundred",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "flexion",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-core-01",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Reformer Supine Arms, Coordination & The Hundred)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-core-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Supine Arms, Coordination & The Hundred)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1B) 설정을 확인한다. 양손에 핸드 스트랩을 걸고 손목이 꺾이지 않게 손끝을 멀리 뻗어 광배근부터 연결합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(견갑골 하각(thoracic y:136), 요추(lumbar y:144), 천골(pelvis y:143) 3점 매트 지지선이 전 구간 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (5카운트 스타카토 들쉬고(In 2-3-4-5) → 5카운트 스타카토 내쉬기(Out 2-3-4-5))."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 수파인 암워크 & 헌드레드 시리즈의 핵심 가동 구간(상체 컬업 + 테이블탑에서 헌드레드 50카운트 + 45도 다리 뻗어 50카운트)을 수행한다. 컬업(Curl-up) 시 턱 밑에 계란 하나 공간을 유지하고 시선은 허벅지 안쪽을 바라보세요. 헌드레드 펌핑 시 어깨가 흔들리지 않게 몸통은 단단히 고정하고 팔만 골반 옆에서 힘차게 위아래로 흔듭니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복직근·복횡근·내/외복사근·광배근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 요추(y:144)·골반(y:143)·견갑골 하각(y:136)은 고정된 채 양다리가 90° 테이블탑(knee 162,96)에서 45° 사선(ankle 244,60)으로 신전되고 양팔이 골반 옆(y:120..148)에서 수직 펌핑합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (5카운트 스타카토 들쉬고(In 2-3-4-5) → 5카운트 스타카토 내쉬기(Out 2-3-4-5))."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 상체 컬업 높이를 유지한 채 양다리가 다시 90° 테이블탑(knee 162,98, ankle 212,98)으로 제어 회수됩니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복직근",
        "복횡근",
        "내/외복사근",
        "광배근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복직근, 복횡근, 내/외복사근, 광배근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "양손에 핸드 스트랩을 걸고 손목이 꺾이지 않게 손끝을 멀리 뻗어 광배근부터 연결합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "목 통증 호소 시 헤드레스트를 올린 상태에서 머리를 내려놓고(Head down)하거나 한 손으로 뒤통수를 받치게 합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(머리 내려놓고(Head Down) 다리 테이블탑에서 암 프레스 & 암 써클 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-leg-stretch-hundred\" · 코어 헌드레드 · 45° 하지 사선 지지 & 골반 옆 수직 암 펌핑)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 수파인 암워크 & 헌드레드 시리즈의 기구 세팅(스프링: 1R 1B, 박스: none, 풋바: low)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-leg-stretch-hundred",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-core-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [flexion, neutral]로 정의하며 2D rig \"supine-leg-stretch-hundred\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-leg-stretch-hundred",
          "summaryKo": "2D rig(supine-leg-stretch-hundred)는 요추(y:144)·골반(y:143)·견갑골 하각(y:136)은 고정된 채 양다리가 90° 테이블탑(knee 162,96)에서 45° 사선(ankle 244,60)으로 신전되고 양팔이 골반 옆(y:120..148)에서 수직 펌핑합니다. 및 고정 지지점(견갑골 하각(thoracic y:136), 요추(lumbar y:144), 천골(pelvis y:143) 3점 매트 지지선이 전 구간 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-leg-stretch-hundred",
          "summaryKo": "단일 2D 평면 투영 도해(supine-leg-stretch-hundred) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-core-01",
          "summaryKo": "리포머 수파인 암워크 & 헌드레드 시리즈의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-leg-stretch-hundred 도해에서 리포머 수파인 암워크 & 헌드레드 시리즈(ex-core-01)의 핵심 지지점(견갑골 하각(thoracic y:136), 요추(lumbar y:144), 천골(pelvis y:143) 3점 매트 지지선이 전 구간 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-leg-stretch-hundred 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-core-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 44,
    "nameKo": "숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)",
    "nameEn": "Short Box Abdominal Series (Round, Flat, Twist & Reach)",
    "apparatus": "reformer",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "flexion",
      "rotation",
      "neutral"
    ],
    "exercise": {
      "id": "ex-core-02",
      "nameKo": "숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)",
      "nameEn": "Short Box Abdominal Series (Round, Flat, Twist & Reach)",
      "apparatus": "reformer",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "flexion",
        "rotation",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-core-02",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Short Box Abdominal Series (Round, Flat, Twist & Reach))",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-core-02",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Short Box Abdominal Series (Round, Flat, Twist & Reach))",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R 1B) 및 박스(short-box) 설정을 확인한다. 풋 스트랩에 두 발을 단단히 걸고 박스 앞쪽에서 손바닥 한 뼘 뒤에 앉아 세팅합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(상체 컬업 피벗(thoracic y:136), 요추(lumbar y:144), 골반(pelvis y:143) 지지선이 좌우 교대 중에도 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 꼬리뼈 말아 하프 롤백 → 내쉬며 복부 스쿱(Scoop)으로 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)의 핵심 가동 구간(다웰 바(Dowel Bar)를 들고 라운드백 6회 + 플랫백 6회 + 트위스트 6회)을 수행한다. 라운드백: 아랫배를 등 뒤로 깊게 파내며(C-Curve) 어깨는 긴장을 풀고 내려갑니다. 트위스트 & 리치: 골반과 두 무릎 높이가 절대 밀리지 않게 고정하고 갈비뼈(흉곽)만 회전하세요.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복직근·내복사근·외복사근·장요근·다열근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 양손이 정강이(164,98)에서 중심 전환점(158,90)으로 이동하며 당긴 다리(knee 126,90)와 뻗은 다리(farKnee 202,94)가 공중에서 교차합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 꼬리뼈 말아 하프 롤백 → 내쉬며 복부 스쿱(Scoop)으로 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 short-box 상단 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 반대쪽 무릎(farKnee 122,88)이 가슴으로 당겨지고 우측 다리(knee 206,96, ankle 248,54)가 45° 사선으로 뻗어 78° 시저 스플릿을 완성합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복직근",
        "내복사근",
        "외복사근",
        "장요근",
        "다열근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복직근, 내복사근, 외복사근, 장요근, 다열근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "풋 스트랩에 두 발을 단단히 걸고 박스 앞쪽에서 손바닥 한 뼘 뒤에 앉아 세팅합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "요추 디스크 병력이 있는 회원님은 라운드백 대신 중립 척추 힌지(Flat Back Hinge) 위주로 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손을 가슴 앞에 포개고 짧은 각도(30도) 하프 롤백 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"seated-roll-back-spine-twist\" · 코어 싱글 레그 스트레치 · 정강이 핸드 그립 & 78° 가위 교차)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)의 기구 세팅(스프링: 2R 1B, 박스: short-box, 풋바: down)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "seated-roll-back-spine-twist",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-core-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: seated, spinalPlanes: [flexion, rotation, neutral]로 정의하며 2D rig \"seated-roll-back-spine-twist\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "2D rig(seated-roll-back-spine-twist)는 양손이 정강이(164,98)에서 중심 전환점(158,90)으로 이동하며 당긴 다리(knee 126,90)와 뻗은 다리(farKnee 202,94)가 공중에서 교차합니다. 및 고정 지지점(상체 컬업 피벗(thoracic y:136), 요추(lumbar y:144), 골반(pelvis y:143) 지지선이 좌우 교대 중에도 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "seated-roll-back-spine-twist",
          "summaryKo": "단일 2D 평면 투영 도해(seated-roll-back-spine-twist) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-core-02",
          "summaryKo": "숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "seated-roll-back-spine-twist 도해에서 숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트)(ex-core-02)의 핵심 지지점(상체 컬업 피벗(thoracic y:136), 요추(lumbar y:144), 골반(pelvis y:143) 지지선이 좌우 교대 중에도 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, seated-roll-back-spine-twist 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-upper-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 45,
    "nameKo": "리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리",
    "nameEn": "Kneeling Chest Expansion, Hug a Tree & Seated Rotation",
    "apparatus": "reformer",
    "bodyPosition": "kneeling",
    "spinalPlanes": [
      "rotation",
      "neutral",
      "extension"
    ],
    "exercise": {
      "id": "ex-upper-01",
      "nameKo": "리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리",
      "nameEn": "Kneeling Chest Expansion, Hug a Tree & Seated Rotation",
      "apparatus": "reformer",
      "bodyPosition": "kneeling",
      "spinalPlanes": [
        "rotation",
        "neutral",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-upper-01",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Kneeling Chest Expansion, Hug a Tree & Seated Rotation)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-upper-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Kneeling Chest Expansion, Hug a Tree & Seated Rotation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-07-06/exercise-of-the-month-thigh-stretch-on-the-reformer",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 무릎 선 자세(Kneeling)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 스트랩을 당길 때 어깨가 앞으로 말리지 않도록 쇄골을 활짝 열고 날개뼈를 뒷주머니 쪽으로 끌어내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "무릎 선 자세(Kneeling) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 스트랩을 골반 뒤로 당겨 홀드(고개 좌/우 회전) → 내쉬며 천천히 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리의 핵심 가동 구간(스프링 1R + 톨 닐링 체스트 익스팬션 8회 + 스파인 트위스트 좌/우 각 8회)을 수행한다. 톨 닐링(무릎 선 자세)에서 허벅지 앞쪽과 엉덩이에 힘을 줘서 골반이 뒤로 빠지지 않게 벽처럼 세워주세요. 시티드 트위스트로 전환 시 좌우 각 8회씩 갈비뼈 전체가 회전문처럼 돌아가도록 유도합니다.",
        "jointDirectionsKo": [
          "횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "광배근·후면삼각근·능형근·외복사근·삼두근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 스트랩을 골반 뒤로 당겨 홀드(고개 좌/우 회전) → 내쉬며 천천히 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 몸통 수직 기둥을 지킨 채 손과 팔꿈치가 전방 준비 위치(hand x:198,y:96)로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "광배근",
        "후면삼각근",
        "능형근",
        "외복사근",
        "삼두근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 광배근, 후면삼각근, 능형근, 외복사근, 삼두근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "스트랩을 당길 때 어깨가 앞으로 말리지 않도록 쇄골을 활짝 열고 날개뼈를 뒷주머니 쪽으로 끌어내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "무릎이 예민한 회원님은 캐리지 위에 패드를 덧대거나 엉덩이를 뒤꿈치에 살짝 내려놓고(Low Kneeling) 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 1B 세팅 후 양반다리(Seated) 또는 로우 닐링에서 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"kneeling-chest-expansion-triceps\" · 닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리의 기구 세팅(스프링: 1R, 박스: none, 풋바: low)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "kneeling-chest-expansion-triceps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-upper-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: kneeling, spinalPlanes: [rotation, neutral, extension]로 정의하며 2D rig \"kneeling-chest-expansion-triceps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "2D rig(kneeling-chest-expansion-triceps)는 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다. 및 고정 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "단일 2D 평면 투영 도해(kneeling-chest-expansion-triceps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-upper-01",
          "summaryKo": "리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "kneeling-chest-expansion-triceps 도해에서 리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리(ex-upper-01)의 핵심 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, kneeling-chest-expansion-triceps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-upper-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 46,
    "nameKo": "리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)",
    "nameEn": "Reformer Rowing Back & Front (Serve a Tray & Shave the Head)",
    "apparatus": "reformer",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "flexion",
      "extension",
      "neutral"
    ],
    "exercise": {
      "id": "ex-upper-02",
      "nameKo": "리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)",
      "nameEn": "Reformer Rowing Back & Front (Serve a Tray & Shave the Head)",
      "apparatus": "reformer",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "flexion",
        "extension",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-upper-02",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Reformer Rowing Back & Front (Serve a Tray & Shave the Head))",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-upper-02",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Rowing Back & Front (Serve a Tray & Shave the Head))",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1B) 설정을 확인한다. 두 다리를 앞으로 뻗고(햄스트링이 타이트하면 양반다리) 척추를 정수리까지 수직으로 세워 앉습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 팔을 앞으로 뻗어 트레이 서빙 → 들쉬며 가슴 활짝 열고 암써클)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)의 핵심 가동 구간(1B 스프링에서 백 로잉 6회 + 써브 어 트레이 8회 + 더 쉐이브 8회)을 수행한다. 써브 어 트레이(Serve a Tray): 팔꿈치를 옆구리에서 앞으로 뻗을 때 몸통이 뒤로 밀리지 않게 복부로 버텨주세요. 더 쉐이브(The Shave): 뒤통수 뒤에서 엄지손가락을 맞대고 정수리 사선 위로 팔꿈치를 펴며 삼두근과 하부승모근을 씁니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "전면/측면 삼각근·상완이두근·상완삼두근·하부승모근·전거근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 팔을 앞으로 뻗어 트레이 서빙 → 들쉬며 가슴 활짝 열고 암써클)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 몸통 수직 축을 유지하며 손끝이 전상방 사선(x:216,y:52)으로 길게 확장됩니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "전면/측면 삼각근",
        "상완이두근",
        "상완삼두근",
        "하부승모근",
        "전거근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 전면/측면 삼각근, 상완이두근, 상완삼두근, 하부승모근, 전거근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "두 다리를 앞으로 뻗고(햄스트링이 타이트하면 양반다리) 척추를 정수리까지 수직으로 세워 앉습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "승모근이 귀 쪽으로 솟지 않도록 어깨 하강 큐잉을 지속적으로 제공합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양반다리(Cross-legged)로 앉아 짧은 레버리지로 암 프레스 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"seated-row-arm-arc\" · 시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)의 기구 세팅(스프링: 1B, 박스: none, 풋바: low)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "seated-row-arm-arc",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-upper-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: seated, spinalPlanes: [flexion, extension, neutral]로 정의하며 2D rig \"seated-row-arm-arc\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "seated-row-arm-arc",
          "summaryKo": "2D rig(seated-row-arm-arc)는 좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다. 및 고정 지지점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "seated-row-arm-arc",
          "summaryKo": "단일 2D 평면 투영 도해(seated-row-arm-arc) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-upper-02",
          "summaryKo": "리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "seated-row-arm-arc 도해에서 리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브)(ex-upper-02)의 핵심 지지점(좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, seated-row-arm-arc 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-upper-03",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 47,
    "nameKo": "캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스",
    "nameEn": "Cadillac Standing Arm Springs: Boxing, Salute & Chest Expansion",
    "apparatus": "cadillac",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "rotation",
      "neutral"
    ],
    "exercise": {
      "id": "ex-upper-03",
      "nameKo": "캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스",
      "nameEn": "Cadillac Standing Arm Springs: Boxing, Salute & Chest Expansion",
      "apparatus": "cadillac",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "rotation",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-ex-upper-03",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Standing Arm Springs: Boxing, Salute & Chest Expansion)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-ex-upper-03",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Standing Arm Springs: Boxing, Salute & Chest Expansion)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1Y) 설정을 확인한다. 캐딜락 기둥을 등지고 서서 두 발을 골반 너비로 단단히 뿌리내리고 몸통을 5도만 살짝 앞으로 기울입니다(Pilates Stance).",
        "jointDirectionsKo": [
          "척추 및 골반을 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 기둥 앞 바닥에 골반 너비로 뿌리내린 양발 발바닥 전체",
          "암 스프링 핸들을 단단히 쥔 양손 그립",
          "입위 골반-척추 수직 안정 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(바닥에 뿌리내린 뒤꿈치(heel: 140,174), 발목(ankle: 146,170), 골반(pelvis: 142,114)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 펀치 & 몸통 트위스트 → 들쉬며 중심 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스의 핵심 가동 구간(필라테스 V 스탠스에서 체스트 프레스 8회 + 복싱 트위스트 10회 + 살루트 8회)을 수행한다. 복싱(Boxing) 시 한 팔은 앞으로 뻗고 반대 팔은 뒤로 당기며 흉추 회전을 함께 연결하세요. 스프링 장력에 몸통이 뒤로 끌려가지 않도록 발가락 끝까지 바닥을 누르는 힘을 유지합니다.",
        "jointDirectionsKo": [
          "횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "전면삼각근·대흉근·삼두근·내/외복사근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 기둥 앞 바닥에 골반 너비로 뿌리내린 양발 발바닥 전체",
          "암 스프링 핸들을 단단히 쥔 양손 그립",
          "입위 골반-척추 수직 안정 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 뒤꿈치(140,174)를 바닥에 단단히 뿌리내린 채 암 스프링을 정면 어깨 높이(hand: 168,74→238,62)로 펀치하며 흉추를 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 펀치 & 몸통 트위스트 → 들쉬며 중심 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 기둥 앞 바닥에 골반 너비로 뿌리내린 양발 발바닥 전체",
          "암 스프링 핸들을 단단히 쥔 양손 그립",
          "입위 골반-척추 수직 안정 축"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 몸통이 뒤로 끌려가지 않게 발바닥 접지를 유지하며 손(238,62→178,73)을 감속 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "전면삼각근",
        "대흉근",
        "삼두근",
        "내/외복사근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 전면삼각근, 대흉근, 삼두근, 내/외복사근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "캐딜락 기둥을 등지고 서서 두 발을 골반 너비로 단단히 뿌리내리고 몸통을 5도만 살짝 앞으로 기울입니다(Pilates Stance). 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "손목이 꺾이지 않게 그립을 주먹 쥐듯 단단히 잡도록 지도합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(한 발을 앞에 둔 런지 스탠스(Split Stance)에서 안정적으로 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"cadillac-standing-punch-press-isolated\" · 캐딜락 스탠딩 암 스프링 펀치 · 뒤꿈치 접지 고정 & 상지 펀치/회전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스의 기구 세팅(스프링: 1R 1Y, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "cadillac-standing-punch-press-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-upper-03",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: standing, spinalPlanes: [rotation, neutral]로 정의하며 2D rig \"cadillac-standing-punch-press-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "cadillac-standing-punch-press-isolated",
          "summaryKo": "2D rig(cadillac-standing-punch-press-isolated)는 뒤꿈치(140,174)를 바닥에 단단히 뿌리내린 채 암 스프링을 정면 어깨 높이(hand: 168,74→238,62)로 펀치하며 흉추를 회전합니다. 및 고정 지지점(바닥에 뿌리내린 뒤꿈치(heel: 140,174), 발목(ankle: 146,170), 골반(pelvis: 142,114)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "cadillac-standing-punch-press-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(cadillac-standing-punch-press-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-upper-03",
          "summaryKo": "캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "cadillac-standing-punch-press-isolated 도해에서 캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스(ex-upper-03)의 핵심 지지점(바닥에 뿌리내린 뒤꿈치(heel: 140,174), 발목(ankle: 146,170), 골반(pelvis: 142,114)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, cadillac-standing-punch-press-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-lower-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 48,
    "nameKo": "리포머 스탠딩 스쿠터 & 이브스 런지",
    "nameEn": "Reformer Standing Scooter & Eve’s Lunge Flow",
    "apparatus": "reformer",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral",
      "extension"
    ],
    "exercise": {
      "id": "ex-lower-01",
      "nameKo": "리포머 스탠딩 스쿠터 & 이브스 런지",
      "nameEn": "Reformer Standing Scooter & Eve’s Lunge Flow",
      "apparatus": "reformer",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-lower-01",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Reformer Standing Scooter & Eve’s Lunge Flow)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-lower-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Standing Scooter & Eve’s Lunge Flow)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 바닥에 지지한 다리의 무릎을 30도 구부려 고정하고, 엉덩이 옆쪽(중둔근)에 체중의 균등한 비율를 실어주세요!",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 뒤쪽 다리 밀어내기 → 들쉬며 앞쪽 지지 다리 무릎 고정한 채 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 스탠딩 스쿠터 & 이브스 런지의 핵심 가동 구간(양손 골반 또는 가슴 앞 기도 손(Hands in Prayer)에서 스쿠터 10회 + 펄스 10회 + 풀 런지 연결)을 수행한다. 캐리지 위 발을 뒤로 밀고 들어올 때 바닥 쪽 무릎은 1mm도 앞뒤로 흔들리지 않아야 둔근에 정확히 들어갑니다. 좌측 3분 30초 진행 후 반대쪽(우측)으로 방향을 바꿔 동일하게 진행합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대둔근·중둔근·대퇴사두근·장요근 스트레칭의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 뒤쪽 다리 밀어내기 → 들쉬며 앞쪽 지지 다리 무릎 고정한 채 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 지지 둔근 버팀 속에서 가동 다리(ankle x:278→222)가 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대둔근",
        "중둔근",
        "대퇴사두근",
        "장요근 스트레칭"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대둔근, 중둔근, 대퇴사두근, 장요근 스트레칭의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "바닥에 지지한 다리의 무릎을 30도 구부려 고정하고, 엉덩이 옆쪽(중둔근)에 체중의 균등한 비율를 실어주세요! 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "기구 옆에 설 때 미끄럼 방지 패드를 확인하고, 초보자는 처음에 한 손으로 풋바를 가볍게 터치하게 합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손을 풋바에 얹고 상체 안정성을 확보한 상태에서 스쿠터 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"standing-scooter-lunge-splits\" · 스탠딩 스쿠터 · 런지 · 사이드 스플릿 & 체어 스텝업)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 스탠딩 스쿠터 & 이브스 런지의 기구 세팅(스프링: 1R, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "standing-scooter-lunge-splits",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-lower-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: standing, spinalPlanes: [neutral, extension]로 정의하며 2D rig \"standing-scooter-lunge-splits\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "2D rig(standing-scooter-lunge-splits)는 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다. 및 고정 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "단일 2D 평면 투영 도해(standing-scooter-lunge-splits) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-lower-01",
          "summaryKo": "리포머 스탠딩 스쿠터 & 이브스 런지의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "standing-scooter-lunge-splits 도해에서 리포머 스탠딩 스쿠터 & 이브스 런지(ex-lower-01)의 핵심 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, standing-scooter-lunge-splits 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-lower-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 49,
    "nameKo": "리포머 스탠딩 사이드 스플릿 & 스케이터",
    "nameEn": "Reformer Standing Side Splits & Skater (Heavy & Light)",
    "apparatus": "reformer",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-lower-02",
      "nameKo": "리포머 스탠딩 사이드 스플릿 & 스케이터",
      "nameEn": "Reformer Standing Side Splits & Skater (Heavy & Light)",
      "apparatus": "reformer",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-lower-02",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Reformer Standing Side Splits & Skater (Heavy & Light))",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-lower-02",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Standing Side Splits & Skater (Heavy & Light))",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 한 발은 플랫폼에, 한 발은 캐리지 끝에 평행(Parallel)하게 두고 승마 자세(Squat)로 낮게 앉아 시작합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(우측 플랫폼 지지 발(farAnkle: 214,138)과 양발 수평 지지 높이(y:138)가 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 캐리지 밀어 스플릿 → 들쉬며 안쪽 허벅지 힘으로 닫기)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 스탠딩 사이드 스플릿 & 스케이터의 핵심 가동 구간(스케이터 스쿼트 자세 유지 + 사이드 스플릿 10회 + 캐리지 펄스 10회 (좌/우 교대))을 수행한다. 무거운 스프링(1R)에서는 바깥쪽 중둔근 힘으로 밀어내고, 가벼운 스프링(1Y)에서는 안쪽 내전근 힘으로 끌어당깁니다. 상체가 위아래로 바운스되지 않게 천장이 머리 바로 위에 있다고 상상하며 높이를 고정하세요.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "중둔근·소둔근·내전근·대퇴사두근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 우측 플랫폼 발(farAnkle: 214,138)을 고정하고 상체 수직 축을 유지한 채 좌측 캐리지 발(ankle: 148,138→96,138)을 옆으로 밀어냅니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 캐리지 밀어 스플릿 → 들쉬며 안쪽 허벅지 힘으로 닫기)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 상체 높이를 일정하게 유지하며 내전근과 중둔근 제어로 캐리지 발(96,138→140,138)을 모읍니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "중둔근",
        "소둔근",
        "내전근",
        "대퇴사두근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 중둔근, 소둔근, 내전근, 대퇴사두근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "한 발은 플랫폼에, 한 발은 캐리지 끝에 평행(Parallel)하게 두고 승마 자세(Squat)로 낮게 앉아 시작합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "캐리지에 올라탈 때 반드시 플랫폼 쪽 발부터 먼저 딛고, 내려올 때도 캐리지 발부터 먼저 내려오도록 안전 수칙을 강조합니다!",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 1R에서 직립(Standing Straight Legs) 사이드 스플릿으로 안전하게 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"reformer-standing-side-splits-isolated\" · 리포머 스탠딩 사이드 스플릿 · 플랫폼/캐리지 수평 양다리 외전·내전 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 스탠딩 사이드 스플릿 & 스케이터의 기구 세팅(스프링: 1R, 박스: none, 풋바: down)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "reformer-standing-side-splits-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-lower-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"reformer-standing-side-splits-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "reformer-standing-side-splits-isolated",
          "summaryKo": "2D rig(reformer-standing-side-splits-isolated)는 우측 플랫폼 발(farAnkle: 214,138)을 고정하고 상체 수직 축을 유지한 채 좌측 캐리지 발(ankle: 148,138→96,138)을 옆으로 밀어냅니다. 및 고정 지지점(우측 플랫폼 지지 발(farAnkle: 214,138)과 양발 수평 지지 높이(y:138)가 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "reformer-standing-side-splits-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(reformer-standing-side-splits-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-lower-02",
          "summaryKo": "리포머 스탠딩 사이드 스플릿 & 스케이터의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "reformer-standing-side-splits-isolated 도해에서 리포머 스탠딩 사이드 스플릿 & 스케이터(ex-lower-02)의 핵심 지지점(우측 플랫폼 지지 발(farAnkle: 214,138)과 양발 수평 지지 높이(y:138)가 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, reformer-standing-side-splits-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-lower-03",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 50,
    "nameKo": "운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머",
    "nameEn": "Wunda Chair Standing Forward Step-Up & Mountain Climber",
    "apparatus": "chair",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-lower-03",
      "nameKo": "운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머",
      "nameEn": "Wunda Chair Standing Forward Step-Up & Mountain Climber",
      "apparatus": "chair",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-ex-lower-03",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (Wunda Chair Standing Forward Step-Up & Mountain Climber)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-ex-lower-03",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (Wunda Chair Standing Forward Step-Up & Mountain Climber)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1B) 설정을 확인한다. 시트 위에 올린 앞발 뒤꿈치(Heel)에 체중을 균등한 비율 실어야 무릎이 아닌 엉덩이 아래쪽(Under-butt)이 쓰입니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 시트 위 뒤꿈치로 바닥 밀어 스텝업 → 들쉬며 3카운트 버티며 하강)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머의 핵심 가동 구간(양손 골반 짚고 포워드 런지 8회 + 탑에서 마운틴 클라이머 펌핑 12회 (좌/우))을 수행한다. 페달이 바닥에 닿기 직전 2cm 위에서 멈춘 뒤 다시 올라가며 둔근의 지속적 긴장(Time Under Tension)을 유지하세요. 마운틴 클라이머로 전환 시 상체 각도는 고정하고 아래쪽 페달만 빠르게 펌핑합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대둔근·대퇴사두근·중둔근·코어 밸런스의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 시트 위 뒤꿈치로 바닥 밀어 스텝업 → 들쉬며 3카운트 버티며 하강)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 체어 고정 좌면 위에 디딘 지지 발바닥 전체",
          "체어 고정 지지부·시트 모서리 또는 페달에 닿은 보조 접촉점",
          "고관절-무릎-발목 일직선 정렬 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 지지 둔근 버팀 속에서 가동 다리(ankle x:278→222)가 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대둔근",
        "대퇴사두근",
        "중둔근",
        "코어 밸런스"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대둔근, 대퇴사두근, 중둔근, 코어 밸런스의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "시트 위에 올린 앞발 뒤꿈치(Heel)에 체중을 균등한 비율 실어야 무릎이 아닌 엉덩이 아래쪽(Under-butt)이 쓰입니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "균형 감각이 부족한 회원님은 체어 핸들을 장착하거나 벽/폴대 옆에서 한 손을 짚고 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 높게(2R) 걸고 양손 핸들 잡은 상태에서 천천히 스텝업 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"standing-scooter-lunge-splits\" · 스탠딩 스쿠터 · 런지 · 사이드 스플릿 & 체어 스텝업)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머의 기구 세팅(스프링: 1R 1B, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "standing-scooter-lunge-splits",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-lower-03",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: standing, spinalPlanes: [neutral]로 정의하며 2D rig \"standing-scooter-lunge-splits\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "2D rig(standing-scooter-lunge-splits)는 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다. 및 고정 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "단일 2D 평면 투영 도해(standing-scooter-lunge-splits) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-lower-03",
          "summaryKo": "운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "standing-scooter-lunge-splits 도해에서 운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머(ex-lower-03)의 핵심 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, standing-scooter-lunge-splits 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-extension-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 51,
    "nameKo": "래더 바렐 스완 다이브 & 백 익스텐션",
    "nameEn": "Ladder Barrel Swan Dive & Back Extension Articulation",
    "apparatus": "barrel",
    "bodyPosition": "prone",
    "spinalPlanes": [
      "extension",
      "flexion"
    ],
    "exercise": {
      "id": "ex-extension-02",
      "nameKo": "래더 바렐 스완 다이브 & 백 익스텐션",
      "nameEn": "Ladder Barrel Swan Dive & Back Extension Articulation",
      "apparatus": "barrel",
      "bodyPosition": "prone",
      "spinalPlanes": [
        "extension",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-ex-extension-02",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (Ladder Barrel Swan Dive & Back Extension Articulation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-ex-extension-02",
        "title": "Supported Standing & Trunk Control Exercises (Ladder Barrel Swan Dive & Back Extension Articulation)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 엎드린 자세(Prone)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(Bodyweight) 설정을 확인한다. 래더 하단 가로대에 발아치를 단단히 걸고 치골이 바렐 정점 살짝 앞에 오도록 세팅합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "엎드린 자세(Prone) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 정수리부터 아치 그리며 신전 → 내쉬며 아랫배 끌어당기며 바렐 곡선 따라 하강)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 래더 바렐 스완 다이브 & 백 익스텐션의 핵심 가동 구간(풀 레인지 바렐 스완 익스텐션 + 암 오픈 서클 8회)을 수행한다. 올라올 때 허리로 꺾어 올라오지 않고, 둔근과 햄스트링을 조여 다리에서부터 에너지를 뻗어 올리세요. 탑에서 양팔을 만세(V-Position)로 뻗어 척추 전체가 긴 활 모양을 그리도록 만듭니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "척추기립근·대둔근·햄스트링·다열근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 바렐 정점(132,104) 치골 지지와 래더 발(228,132) 고정 위에서 사선 준비(손 24,80·머리 42,84)가 오버헤드 V-리치 풀 스완 아크(손 28,32·머리 48,49)로 확장됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 정수리부터 아치 그리며 신전 → 내쉬며 아랫배 끌어당기며 바렐 곡선 따라 하강)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바렐 곡면 정점 앞쪽에 밀착한 골반 전면 및 치골(Pubic Bone)",
          "래더 하단 가로대에 단단히 고정한 양발 아치/발볼",
          "준비 및 복귀 구간에서 바렐 또는 이마 아래를 지지하는 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 축성 신장을 유지하며 오버헤드 정점(손 28,32·머리 48,49)에서 사선 제어 호버(손 26,60·머리 44,71)로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "척추기립근",
        "대둔근",
        "햄스트링",
        "다열근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 척추기립근, 대둔근, 햄스트링, 다열근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "래더 하단 가로대에 발아치를 단단히 걸고 치골이 바렐 정점 살짝 앞에 오도록 세팅합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "신전 정점에서 턱이 들리지 않도록 뒷목을 길게 유지합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손을 이마 아래 포개어 두고 중립 척추(Flat Back)까지만 올라오기)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"prone-swan-pulling-straps-swimming\" · 래더 바렐 정점(132,104) 지지 + 오버헤드 V-리치 풀 스완 익스텐션 아크)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "래더 바렐 스완 다이브 & 백 익스텐션의 기구 세팅(스프링: Bodyweight, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "prone-swan-pulling-straps-swimming",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-extension-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: prone, spinalPlanes: [extension, flexion]로 정의하며 2D rig \"prone-swan-pulling-straps-swimming\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "2D rig(prone-swan-pulling-straps-swimming)는 바렐 정점(132,104) 치골 지지와 래더 발(228,132) 고정 위에서 사선 준비(손 24,80·머리 42,84)가 오버헤드 V-리치 풀 스완 아크(손 28,32·머리 48,49)로 확장됩니다. 및 고정 지지점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "prone-swan-pulling-straps-swimming",
          "summaryKo": "단일 2D 평면 투영 도해(prone-swan-pulling-straps-swimming) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-extension-02",
          "summaryKo": "래더 바렐 스완 다이브 & 백 익스텐션의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "prone-swan-pulling-straps-swimming 도해에서 래더 바렐 스완 다이브 & 백 익스텐션(ex-extension-02)의 핵심 지지점(바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, prone-swan-pulling-straps-swimming 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-straps-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 52,
    "nameKo": "리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)",
    "nameEn": "Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral",
      "flexion"
    ],
    "exercise": {
      "id": "ex-straps-01",
      "nameKo": "리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)",
      "nameEn": "Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-straps-01",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-straps-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1B) 설정을 확인한다. 두 발아치에 긴 스트랩(Long Loops)을 걸고, 동작 내내 꼬리뼈(Sacrum)가 캐리지 바닥에 무겁게 붙어 있어야 합니다!",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "양발 아치에 건 롱 스트랩(Long Loops) 지지점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(머리(head), 흉추(thoracic), 천골(pelvis)이 캐리지/매트 위에 무겁게 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 뒤꿈치 밀어 프로그 확장 → 들쉬며 꼬리뼈가 뜨지 않는 범위까지만 다리 들어 올리기)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)의 핵심 가동 구간(프로그 8회 + 양방향 레그써클 각 6회 + 오프닝(Openings) + 피터팬 스트레치)을 수행한다. 레그 써클(Leg Circles) 시 원을 크게 그리는 것보다 골반이 흔들리지 않는 범위 안에서 대퇴골두만 부드럽게 굴리는 것에 집중하세요. 마지막에 피터팬(Peter Pan)과 해피베이비 스트레칭으로 고관절과 내전근을 시원하게 풀어줍니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "내전근·햄스트링·장요근 이완·골반 안정화근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "양발 아치에 건 롱 스트랩(Long Loops) 지지점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 천골(pelvis)을 고정한 채 무릎(x:182→242)과 발목(x:214→284)이 45도 사선으로 길게 뻗어집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 뒤꿈치 밀어 프로그 확장 → 들쉬며 꼬리뼈가 뜨지 않는 범위까지만 다리 들어 올리기)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "양발 아치에 건 롱 스트랩(Long Loops) 지지점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 사선 정점(x:284,y:80)에서 고관절 굴곡 아크를 따라 천장 방향(x:222,y:40)으로 리프트 및 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "내전근",
        "햄스트링",
        "장요근 이완",
        "골반 안정화근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 내전근, 햄스트링, 장요근 이완, 골반 안정화근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "두 발아치에 긴 스트랩(Long Loops)을 걸고, 동작 내내 꼬리뼈(Sacrum)가 캐리지 바닥에 무겁게 붙어 있어야 합니다! 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "숏스파인(Short Spine)으로 이어갈 경우 반드시 헤드레스트를 완전히 평평하게(Flat) 내린 뒤 진행하세요!",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(꼬리뼈 고정 상태에서 프로그(Frogs) & 로워 앤 리프트(Lower & Lift) 위주 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-feet-in-straps\" · 핏인스트랩 · 레그 스프링 프로그 & 레그 써클)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)의 기구 세팅(스프링: 1R 1B, 박스: none, 풋바: low)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-feet-in-straps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-straps-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral, flexion]로 정의하며 2D rig \"supine-feet-in-straps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "2D rig(supine-feet-in-straps)는 천골(pelvis)을 고정한 채 무릎(x:182→242)과 발목(x:214→284)이 45도 사선으로 길게 뻗어집니다. 및 고정 지지점(머리(head), 흉추(thoracic), 천골(pelvis)이 캐리지/매트 위에 무겁게 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "단일 2D 평면 투영 도해(supine-feet-in-straps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-straps-01",
          "summaryKo": "리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-feet-in-straps 도해에서 리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)(ex-straps-01)의 핵심 지지점(머리(head), 흉추(thoracic), 천골(pelvis)이 캐리지/매트 위에 무겁게 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-feet-in-straps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-straps-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 53,
    "nameKo": "캐딜락 레그 스프링 프로그 & 에어플레인 써클",
    "nameEn": "Cadillac Leg Springs: Supine Frogs, Circles & Walking",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-straps-02",
      "nameKo": "캐딜락 레그 스프링 프로그 & 에어플레인 써클",
      "nameEn": "Cadillac Leg Springs: Supine Frogs, Circles & Walking",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-ex-straps-02",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (Cadillac Leg Springs: Supine Frogs, Circles & Walking)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-ex-straps-02",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (Cadillac Leg Springs: Supine Frogs, Circles & Walking)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2Y) 설정을 확인한다. 리포머와 달리 캐딜락 레그 스프링은 좌우가 독립되어 있어 양다리 대칭 밸런스를 잡기에 최고입니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 두 다리를 바닥 쪽으로 길게 뻗어 내리기 → 들쉬며 복부 고정한 채 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 캐딜락 레그 스프링 프로그 & 에어플레인 써클의 핵심 가동 구간(스트레이트 레그 로워/리프트 8회 + 써클 8회 + 시저스 워킹(Walking))을 수행한다. 양손으로 머리 위 수직 기둥(Vertical Poles)을 잡아 견갑골과 윗등을 매트에 넓게 고정하세요. 두 다리가 각자 따로 놀지 않도록 뒤꿈치끼리 자석이 붙은 것처럼 대칭 속도를 맞춥니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "내전근·둔근·복횡근·햄스트링의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 천골(164,136)과 바닥 지지 다리 뒤꿈치(y=144)를 고정한 채 작동 다리가 고관절 수직(-90°)에서 중심선 내전 교차를 거쳐 원위 하방 아크(-38°)로 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 두 다리를 바닥 쪽으로 길게 뻗어 내리기 → 들쉬며 복부 고정한 채 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 외측 원호를 따라 골반 흔들림(pelvisDriftMm=0)과 분절 길이 왜곡(drift < 1e-6) 없이 고관절 상방 정점(-78°~-90°)으로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "내전근",
        "둔근",
        "복횡근",
        "햄스트링"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 내전근, 둔근, 복횡근, 햄스트링의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "리포머와 달리 캐딜락 레그 스프링은 좌우가 독립되어 있어 양다리 대칭 밸런스를 잡기에 최고입니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "다리를 내릴 때 허리가 매트에서 과하게 뜨지 않도록 갈비뼈 뒷면을 바닥에 밀착합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(무릎을 살짝 구부린 프로그 프레스와 작은 레그 써클로 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-feet-in-straps\" · 싱글 레그 서클 · 앙와위 골반 수평·지지 다리(y=144) 고정 & 단측 고관절 360° 원 궤적)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "캐딜락 레그 스프링 프로그 & 에어플레인 써클의 기구 세팅(스프링: 2Y, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-feet-in-straps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-straps-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"supine-feet-in-straps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "2D rig(supine-feet-in-straps)는 천골(164,136)과 바닥 지지 다리 뒤꿈치(y=144)를 고정한 채 작동 다리가 고관절 수직(-90°)에서 중심선 내전 교차를 거쳐 원위 하방 아크(-38°)로 회전합니다. 및 고정 지지점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "단일 2D 평면 투영 도해(supine-feet-in-straps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-straps-02",
          "summaryKo": "캐딜락 레그 스프링 프로그 & 에어플레인 써클의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-feet-in-straps 도해에서 캐딜락 레그 스프링 프로그 & 에어플레인 써클(ex-straps-02)의 핵심 지지점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-feet-in-straps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-cooldown-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 54,
    "nameKo": "리포머 머메이드 측굴 스트레치 & 흉추 로테이션",
    "nameEn": "Reformer Mermaid Lateral Flexion & Saw Rotation",
    "apparatus": "reformer",
    "bodyPosition": "seated",
    "spinalPlanes": [
      "lateral",
      "rotation",
      "extension"
    ],
    "exercise": {
      "id": "ex-cooldown-01",
      "nameKo": "리포머 머메이드 측굴 스트레치 & 흉추 로테이션",
      "nameEn": "Reformer Mermaid Lateral Flexion & Saw Rotation",
      "apparatus": "reformer",
      "bodyPosition": "seated",
      "spinalPlanes": [
        "lateral",
        "rotation",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-cooldown-01",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Reformer Mermaid Lateral Flexion & Saw Rotation)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-cooldown-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Mermaid Lateral Flexion & Saw Rotation)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 앉은 자세(Seated)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1B) 설정을 확인한다. 정강이를 숄더레스트에 대고 인어공주(Z-Sit) 자세로 앉아 양쪽 엉덩이를 최대한 바닥에 무겁게 내려놓습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 및 횡단면 흉곽 회전(Rotation) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "앉은 자세(Seated) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 풋바 밀어 옆구리 활짝 측굴 → 내쉬며 양손 풋바 잡고 흉추 회전 스트레칭)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 머메이드 측굴 스트레치 & 흉추 로테이션의 핵심 가동 구간(Z-Sit 머메이드 측굴 4회 + 양손 풋바 잡고 고양이 등/소 등 스완 스트레칭 (좌/우))을 수행한다. 풋바를 밀며 내려갈 때 위쪽 골반이 따라 들리지 않도록 반대쪽으로 팽팽하게 저항(Opposition)하세요. 갈비뼈 사이사이(늑간근)로 깊은 숨을 불어넣으며 수업 동안 조였던 코어와 옆구리를 길게 이완합니다.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 및 횡단면 흉곽 회전(Rotation) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "요방형근·외/내복사근·광배근·늑간근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 풋바 밀어 옆구리 활짝 측굴 → 내쉬며 양손 풋바 잡고 흉추 회전 스트레칭)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 위 양측 좌골결절",
          "풋 스트랩 또는 숄더레스트에 지지된 하지 접촉면",
          "핸드 스트랩 또는 풋바를 파지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 측면 복사근 수축으로 몸통이 수직 중심축(head x:148,y:34)으로 복귀하고 팔이 카운터 스트레치(x:82,y:98)로 내려옵니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "요방형근",
        "외/내복사근",
        "광배근",
        "늑간근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 및 횡단면 흉곽 회전(Rotation) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 요방형근, 외/내복사근, 광배근, 늑간근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "정강이를 숄더레스트에 대고 인어공주(Z-Sit) 자세로 앉아 양쪽 엉덩이를 최대한 바닥에 무겁게 내려놓습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "고관절이나 무릎이 불편한 회원님은 다리를 앞으로 내어 걸터앉거나 양반다리로 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(캐리지 옆으로 두 다리를 내리고 걸터앉아(Seated Side) 편안하게 측굴 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"lateral-mermaid-side-bend\" · 머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 머메이드 측굴 스트레치 & 흉추 로테이션의 기구 세팅(스프링: 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "lateral-mermaid-side-bend",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-cooldown-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: seated, spinalPlanes: [lateral, rotation, extension]로 정의하며 2D rig \"lateral-mermaid-side-bend\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "lateral-mermaid-side-bend",
          "summaryKo": "2D rig(lateral-mermaid-side-bend)는 골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다. 및 고정 지지점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "lateral-mermaid-side-bend",
          "summaryKo": "단일 2D 평면 투영 도해(lateral-mermaid-side-bend) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-cooldown-01",
          "summaryKo": "리포머 머메이드 측굴 스트레치 & 흉추 로테이션의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "lateral-mermaid-side-bend 도해에서 리포머 머메이드 측굴 스트레치 & 흉추 로테이션(ex-cooldown-01)의 핵심 지지점(골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, lateral-mermaid-side-bend 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-core-04",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 55,
    "nameKo": "리포머 리버스 앱스 & 닐링 크런치",
    "nameEn": "Reformer Reverse Abs & Kneeling Ab Crunch",
    "apparatus": "reformer",
    "bodyPosition": "kneeling",
    "spinalPlanes": [
      "flexion"
    ],
    "exercise": {
      "id": "ex-core-04",
      "nameKo": "리포머 리버스 앱스 & 닐링 크런치",
      "nameEn": "Reformer Reverse Abs & Kneeling Ab Crunch",
      "apparatus": "reformer",
      "bodyPosition": "kneeling",
      "spinalPlanes": [
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-core-04",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Reformer Reverse Abs & Kneeling Ab Crunch)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-core-04",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Reformer Reverse Abs & Kneeling Ab Crunch)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-07-06/exercise-of-the-month-thigh-stretch-on-the-reformer",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 무릎 선 자세(Kneeling)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1B) 설정을 확인한다. 풋바를 바라보고 네발기기(Quadruped) 자세에서 두 손으로 프레임이나 숄더레스트를 잡습니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "무릎 선 자세(Kneeling) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(손목(wrist), 손(hand), 어깨(shoulder) 전면 지지 기둥이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 아랫배 동그랗게 말아 무릎을 가슴 쪽으로 당기기 → 들쉬며 중립 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 리버스 앱스 & 닐링 크런치의 핵심 가동 구간(스프링 1B에서 센터 니 인 10회 + 좌/우 오블리크 니 인 각 8회)을 수행한다. 팔로 당기는 것이 아니라 아랫배(치골-배꼽)를 둥글게 말아 올리는 힘으로 캐리지를 끌어당기세요. 좌우 무릎 방향을 틀어 오블리크(Oblique) 니 인으로 연결하면 옆구리 자극이 배가됩니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "하복부·복횡근·내/외복사근·전거근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 손목(wrist)과 어깨(shoulder)는 고정된 채 무릎(x:224→182)과 골반(x:212→184)이 전방으로 당겨지고 요추(y:82→68)가 둥글게 말립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 아랫배 동그랗게 말아 무릎을 가슴 쪽으로 당기기 → 들쉬며 중립 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 하복부 편심성 제어로 무릎(x:182→218)과 요추(y:68→80)가 중립 네발기기로 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "하복부",
        "복횡근",
        "내/외복사근",
        "전거근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 하복부, 복횡근, 내/외복사근, 전거근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "풋바를 바라보고 네발기기(Quadruped) 자세에서 두 손으로 프레임이나 숄더레스트를 잡습니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "어깨가 손목 앞으로 밀리지 않도록 견갑대를 단단히 고정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 1R(보조 장력)에서 작은 범위로 캣 스트레치처럼 당기기)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"kneeling-reverse-abs-crunch\" · 리포머 닐링 리버스 앱스 & 하복부 크런치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 리버스 앱스 & 닐링 크런치의 기구 세팅(스프링: 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "kneeling-reverse-abs-crunch",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-core-04",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: kneeling, spinalPlanes: [flexion]로 정의하며 2D rig \"kneeling-reverse-abs-crunch\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "kneeling-reverse-abs-crunch",
          "summaryKo": "2D rig(kneeling-reverse-abs-crunch)는 손목(wrist)과 어깨(shoulder)는 고정된 채 무릎(x:224→182)과 골반(x:212→184)이 전방으로 당겨지고 요추(y:82→68)가 둥글게 말립니다. 및 고정 지지점(손목(wrist), 손(hand), 어깨(shoulder) 전면 지지 기둥이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "kneeling-reverse-abs-crunch",
          "summaryKo": "단일 2D 평면 투영 도해(kneeling-reverse-abs-crunch) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-core-04",
          "summaryKo": "리포머 리버스 앱스 & 닐링 크런치의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "kneeling-reverse-abs-crunch 도해에서 리포머 리버스 앱스 & 닐링 크런치(ex-core-04)의 핵심 지지점(손목(wrist), 손(hand), 어깨(shoulder) 전면 지지 기둥이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, kneeling-reverse-abs-crunch 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-lower-04",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 56,
    "nameKo": "리포머 사이드 라잉 스트랩 싱글 레그 시리즈",
    "nameEn": "Side-Lying Foot in Strap: Side Kick, Circles & Clam",
    "apparatus": "reformer",
    "bodyPosition": "side-lying",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-lower-04",
      "nameKo": "리포머 사이드 라잉 스트랩 싱글 레그 시리즈",
      "nameEn": "Side-Lying Foot in Strap: Side Kick, Circles & Clam",
      "apparatus": "reformer",
      "bodyPosition": "side-lying",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-lower-04",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Side-Lying Foot in Strap: Side Kick, Circles & Clam)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-lower-04",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Side-Lying Foot in Strap: Side Kick, Circles & Clam)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 옆으로 누운 자세(Side-Lying)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 옆으로 누웠을 때 아래쪽 옆구리에 개미 한 마리가 지나갈 만큼 작은 터널(Mouse House)을 유지해 골반이 무너지지 않게 합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "옆으로 누운 자세(Side-Lying) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 다리를 골반 높이로 길게 차내기 → 들쉬며 위쪽 골반 고정한 채 앞으로 스윕)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 리포머 사이드 라잉 스트랩 싱글 레그 시리즈의 핵심 가동 구간(스프링 1R에서 프론트/백 스윕 8회 + 업/다운 8회 + 레그 써클 8회 (좌/우))을 수행한다. 위쪽 발에 스트랩을 걸고 다리를 앞으로 보낼 때 엉덩이가 뒤로 말리지 않도록 좌골을 벽 쪽으로 길게 뻗어내세요. 좌측 4분 진행 후 반대쪽으로 돌아누워 우측 4분 동일하게 진행합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "중둔근·소둔근·대퇴근막장근·외복사근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 다리를 골반 높이로 길게 차내기 → 들쉬며 위쪽 골반 고정한 채 앞으로 스윕)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "헤드레스트(또는 베개) 위 머리 측면과 캐리지에 닿은 아래쪽 흉곽·골반 측면",
          "캐리지 위에서 접어 지지한 아래쪽 다리",
          "풋바 또는 스트랩에 연결된 위쪽 발 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 골반 전·후방 회전 없이 위쪽 다리를 고관절 후방 신전(+14°, 발목 저굴)으로 길게 리치하여 고관절 수평 스윕을 완성합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "중둔근",
        "소둔근",
        "대퇴근막장근",
        "외복사근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 중둔근, 소둔근, 대퇴근막장근, 외복사근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "옆으로 누웠을 때 아래쪽 옆구리에 개미 한 마리가 지나갈 만큼 작은 터널(Mouse House)을 유지해 골반이 무너지지 않게 합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "목이 꺾이지 않도록 헤드레스트 위에 작은 베개나 미니볼을 받쳐 경추 일직선을 맞춥니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 1B에서 무릎을 구부린 클램쉘(Clamshell) 및 짧은 레그 프레스 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"side-lying-leg-press-sweep\" · 사이드 킥 · 측와위 귀-어깨-고관절 일직선·골반 수직 적층 & 전후 수평 스윕)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "리포머 사이드 라잉 스트랩 싱글 레그 시리즈의 기구 세팅(스프링: 1R, 박스: none, 풋바: low)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "side-lying-leg-press-sweep",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-lower-04",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: side-lying, spinalPlanes: [neutral]로 정의하며 2D rig \"side-lying-leg-press-sweep\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "2D rig(side-lying-leg-press-sweep)는 측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다. 및 고정 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "side-lying-leg-press-sweep",
          "summaryKo": "단일 2D 평면 투영 도해(side-lying-leg-press-sweep) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-lower-04",
          "summaryKo": "리포머 사이드 라잉 스트랩 싱글 레그 시리즈의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "side-lying-leg-press-sweep 도해에서 리포머 사이드 라잉 스트랩 싱글 레그 시리즈(ex-lower-04)의 핵심 지지점(귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, side-lying-leg-press-sweep 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-reformer-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 57,
    "nameKo": "[국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결",
    "nameEn": "KR Studio Reformer Footwork to Articulating Bridge Flow",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral",
      "flexion"
    ],
    "exercise": {
      "id": "ex-kr-reformer-01",
      "nameKo": "[국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결",
      "nameEn": "KR Studio Reformer Footwork to Articulating Bridge Flow",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-kr-reformer-01",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (KR Studio Reformer Footwork to Articulating Bridge Flow)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-kr-reformer-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (KR Studio Reformer Footwork to Articulating Bridge Flow)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R 1B) 설정을 확인한다. 무릎 사이 미니볼을 가볍게 조여 내전근부터 복부 코어까지 지퍼를 잠그듯 연결합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 캐리지 밀어내고 골반 중립 유지 → 들쉬며 무릎 정렬 지켜 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결의 핵심 가동 구간(패럴렐 → 필라테스 V → 와이드 세컨드 → 카프레이즈 후 펠빅 리프트 연결)을 수행한다. 풋워크 마지막 카운트에서 헤드레스트를 평평하게 내리고 즉시 분절 브릿지로 물 흐르듯 이어갑니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대퇴사두근·내전근·둔근·복횡근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 캐리지 밀어내고 골반 중립 유지 → 들쉬며 무릎 정렬 지켜 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee y:134→98)이 다시 굴곡되며 캐리지가 감속 복귀(pelvis x:160→196)합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대퇴사두근",
        "내전근",
        "둔근",
        "복횡근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대퇴사두근, 내전근, 둔근, 복횡근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "무릎 사이 미니볼을 가볍게 조여 내전근부터 복부 코어까지 지퍼를 잠그듯 연결합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "브릿지 연결 시 반드시 헤드레스트를 Flat으로 내린 뒤 진행하세요.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(두 발 패럴렐(Parallel) 10회 + 미니볼 스퀴즈 호흡에만 집중)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"reformer-supine-footwork\" · 리포머 수파인 풋워크 (패럴렐 · V · 와이드 · 카프))로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결의 기구 세팅(스프링: 2R 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "reformer-supine-footwork",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-reformer-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral, flexion]로 정의하며 2D rig \"reformer-supine-footwork\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "2D rig(reformer-supine-footwork)는 발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다. 및 고정 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "reformer-supine-footwork",
          "summaryKo": "단일 2D 평면 투영 도해(reformer-supine-footwork) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-reformer-01",
          "summaryKo": "[국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "reformer-supine-footwork 도해에서 [국내 시퀀스] 정혜선 원장 리포머 50분 오프닝 풋워크 & 브릿지 연결(ex-kr-reformer-01)의 핵심 지지점(풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, reformer-supine-footwork 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-cadillac-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 58,
    "nameKo": "[국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우",
    "nameEn": "KR Cadillac Push-Through Bar Spine Articulation & Teaser",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "flexion",
      "extension"
    ],
    "exercise": {
      "id": "ex-kr-cadillac-01",
      "nameKo": "[국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우",
      "nameEn": "KR Cadillac Push-Through Bar Spine Articulation & Teaser",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "flexion",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-ex-kr-cadillac-01",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (KR Cadillac Push-Through Bar Spine Articulation & Teaser)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-ex-kr-cadillac-01",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (KR Cadillac Push-Through Bar Spine Articulation & Teaser)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1B (상단 스프링)) 설정을 확인한다. 푸쉬스루바가 올라갈 때 어깨가 따라 올라가지 않도록 겨드랑이 아래 광배근을 먼저 끌어내립니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(고관절(164,140)·무릎(214,140)·발목(262,140)·뒤꿈치(268,144)는 3단계 내내 매트에 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 바를 위로 컨트롤 → 내쉬며 턱부터 말아 올려 티저 V-포지션 홀드)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우의 핵심 가동 구간(수파인 롤업 → 상단에서 흉추 신전 오픈 → 분절 롤다운 6회)을 수행한다. 내쉬는 숨에 갈비뼈를 골반 쪽으로 닫으며 명치부터 차례대로 매트에서 떨어집니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복직근·장요근·척추기립근·전거근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 앙와위(C7~S1 매트 접지)에서 경추·상부흉추(C7·T4·T8)가 순차 거상되며 요추(L3)가 매트에 임프린트됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 바를 위로 컨트롤 → 내쉬며 턱부터 말아 올려 티저 V-포지션 홀드)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 요추(L3)가 매트에서 떨어지며 후방 스쿱을 유지한 채 양팔이 바닥과 평행(y=76)한 C-커브 정점에 도달합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복직근",
        "장요근",
        "척추기립근",
        "전거근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복직근, 장요근, 척추기립근, 전거근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "푸쉬스루바가 올라갈 때 어깨가 따라 올라가지 않도록 겨드랑이 아래 광배근을 먼저 끌어내립니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "상단 스프링 연결 시 안전 스트랩(Safety Strap) 체결 여부를 반드시 먼저 확인하세요.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(두 발을 매트에 지지한 시티드 푸쉬스루(Seated Push-Through) C-커브만 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-chest-lift-curl\" · 롤업 (Spine Roll Up) · 하체 매트 앵커 고정 · 경추→흉추→요추 순차 박리(Peel) 및 할로우 C-커브 전방 리치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우의 기구 세팅(스프링: 1B (상단 스프링), 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-chest-lift-curl",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-cadillac-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [flexion, extension]로 정의하며 2D rig \"supine-chest-lift-curl\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-chest-lift-curl",
          "summaryKo": "2D rig(supine-chest-lift-curl)는 앙와위(C7~S1 매트 접지)에서 경추·상부흉추(C7·T4·T8)가 순차 거상되며 요추(L3)가 매트에 임프린트됩니다. 및 고정 지지점(고관절(164,140)·무릎(214,140)·발목(262,140)·뒤꿈치(268,144)는 3단계 내내 매트에 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-chest-lift-curl",
          "summaryKo": "단일 2D 평면 투영 도해(supine-chest-lift-curl) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-cadillac-01",
          "summaryKo": "[국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-chest-lift-curl 도해에서 [국내 시퀀스] 단필라 캐딜락 푸쉬스루바 척추 분절 & 티저 플로우(ex-kr-cadillac-01)의 핵심 지지점(고관절(164,140)·무릎(214,140)·발목(262,140)·뒤꿈치(268,144)는 3단계 내내 매트에 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-chest-lift-curl 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-reformer-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 59,
    "nameKo": "[국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스",
    "nameEn": "KR Spicy Reformer Standing Lunge to Arabesque Glute Burn",
    "apparatus": "reformer",
    "bodyPosition": "standing",
    "spinalPlanes": [
      "neutral",
      "extension"
    ],
    "exercise": {
      "id": "ex-kr-reformer-02",
      "nameKo": "[국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스",
      "nameEn": "KR Spicy Reformer Standing Lunge to Arabesque Glute Burn",
      "apparatus": "reformer",
      "bodyPosition": "standing",
      "spinalPlanes": [
        "neutral",
        "extension"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-kr-reformer-02",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (KR Spicy Reformer Standing Lunge to Arabesque Glute Burn)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-kr-reformer-02",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (KR Spicy Reformer Standing Lunge to Arabesque Glute Burn)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 선 자세(Standing)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 앞쪽 지지 다리의 무릎이 안쪽으로 무너지지 않도록 두 번째 발가락 라인과 일직선을 유지하세요.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "선 자세(Standing) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 지지 다리 고관절 힌지 → 내쉬며 앞꿈치와 둔근 힘으로 캐리지 홈 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스의 핵심 가동 구간(스탠딩 런지 10회 + 바텀 홀드 뒷다리 스케이팅 8회 (좌/우 교대))을 수행한다. 후반 4분에는 양손을 풋바에 짚고 뒷다리를 길게 뻗어 아라베스크 펄스 10회로 연결합니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "대둔근·중둔근·햄스트링·코어 밸런스의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 지지 다리 고관절 힌지 → 내쉬며 앞꿈치와 둔근 힘으로 캐리지 홈 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바닥 또는 리포머 플랫폼에 단단히 디딘 지지 측 발바닥 전체",
          "캐리지 표면 또는 숄더블록에 닿은 가동 측 발/앞꿈치",
          "균형 보조 시 풋바 위에 가볍게 얹은 양손 또는 골반 중립 축"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 지지 둔근 버팀 속에서 가동 다리(ankle x:278→222)가 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "대둔근",
        "중둔근",
        "햄스트링",
        "코어 밸런스"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 흉추·고관절 신전(Extension) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 대둔근, 중둔근, 햄스트링, 코어 밸런스의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "앞쪽 지지 다리의 무릎이 안쪽으로 무너지지 않도록 두 번째 발가락 라인과 일직선을 유지하세요. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "균형 감각이 약한 회원님은 풋바에서 손을 떼지 않고 진행하도록 안내합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손을 풋바에 짚고 무릎을 매트에 대는 닐링 런지 스트레치로 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"standing-scooter-lunge-splits\" · 스탠딩 스쿠터 · 런지 · 사이드 스플릿 & 체어 스텝업)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스의 기구 세팅(스프링: 1R, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "standing-scooter-lunge-splits",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-reformer-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: standing, spinalPlanes: [neutral, extension]로 정의하며 2D rig \"standing-scooter-lunge-splits\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "2D rig(standing-scooter-lunge-splits)는 지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→220)과 발목(x:214→278)이 후방으로 64px 뻗어집니다. 및 고정 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "standing-scooter-lunge-splits",
          "summaryKo": "단일 2D 평면 투영 도해(standing-scooter-lunge-splits) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-reformer-02",
          "summaryKo": "[국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "standing-scooter-lunge-splits 도해에서 [국내 매운맛] 지영쌤 리포머 런지 & 아라베스크 힙 폭격 시퀀스(ex-kr-reformer-02)의 핵심 지지점(지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, standing-scooter-lunge-splits 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-barrel-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 60,
    "nameKo": "[국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전",
    "nameEn": "KR Ladder Barrel Mini-Ball Oblique Side Bend & Swan Flow",
    "apparatus": "barrel",
    "bodyPosition": "side-lying",
    "spinalPlanes": [
      "lateral",
      "extension",
      "rotation"
    ],
    "exercise": {
      "id": "ex-kr-barrel-01",
      "nameKo": "[국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전",
      "nameEn": "KR Ladder Barrel Mini-Ball Oblique Side Bend & Swan Flow",
      "apparatus": "barrel",
      "bodyPosition": "side-lying",
      "spinalPlanes": [
        "lateral",
        "extension",
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-ladder-barrel-ex-kr-barrel-01",
        "title": "Exercise of the Month: Ladder Barrel Support & Spine Mechanics (KR Ladder Barrel Mini-Ball Oblique Side Bend & Swan Flow)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-04)에 등록된 공식 래더 바렐 교육 자료로 바렐 곡면·래더 가로대 지지 및 척추 분절·신전 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "nhs-inform-supported-hip-ankle-ex-kr-barrel-01",
        "title": "Supported Standing & Trunk Control Exercises (KR Ladder Barrel Mini-Ball Oblique Side Bend & Swan Flow)",
        "publisher": "NHS inform (Scottish National Health Information Service)",
        "directUrl": "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/",
        "sourceCategory": "public-health-institution",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json에 등록된 공공 보건 가이드로 고정 지지대 활용 시 골반·척추 중립 유지 및 사지 조절 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "래더 바렐(Ladder Barrel)에서 옆으로 누운 자세(Side-Lying)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(Bodyweight) 설정을 확인한다. 래더에 걸친 위쪽 발은 앞쪽, 아래쪽 발은 뒤쪽에 두어 골반이 정면을 바라보게 고정합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 관상면 척추 측굴(Lateral Flexion) 및 흉추·고관절 신전(Extension) 및 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "옆으로 누운 자세(Side-Lying) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)의 지지면과 접촉점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 바렐 곡선을 따라 옆구리 늘리기 → 내쉬며 미니볼을 쥐어짜며 정수리 사선 업)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전의 핵심 가동 구간(양손 미니볼 파지 사이드 밴드 10회 + 상단 흉추 로테이션 6회 (좌/우))을 수행한다. 양손 사이에 미니볼을 쥐고 올라올 때 어깨가 아닌 위쪽 갈비뼈와 골반 사이를 좁혀 올라오세요.",
        "jointDirectionsKo": [
          "관상면 척추 측굴(Lateral Flexion) 및 흉추·고관절 신전(Extension) 및 횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "외복사근·내복사근·요방형근·척추기립근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 바렐 아치 상단(pelvis: 126,116)과 우측 사다리 가로대 발 지지(ankle: 228,132)를 고정한 채 상체(head: 52,88→84,32)를 옆구리 힘으로 들어 올립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 바렐 곡선을 따라 옆구리 늘리기 → 내쉬며 미니볼을 쥐어짜며 정수리 사선 업)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "바렐 곡면 상단에 밀착된 아래쪽 골반 측면(대전자 상부)과 옆구리",
          "래더 가로대에 앞뒤로 엇갈려 걸어 고정한 양발 측면",
          "초기 지지 시 바렐을 가볍게 짚은 아래쪽 손 또는 미니볼을 쥔 양손"
        ],
        "apparatusInteractionKo": "래더 바렐(Ladder Barrel)에서 측면 복사근 편심성 제어로 상체를 바렐 곡선 사선 정렬(head: 56,74)로 내려놓습니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "외복사근",
        "내복사근",
        "요방형근",
        "척추기립근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "관상면 척추 측굴(Lateral Flexion) 및 흉추·고관절 신전(Extension) 및 횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "래더 바렐(Ladder Barrel) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 외복사근, 내복사근, 요방형근, 척추기립근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "래더에 걸친 위쪽 발은 앞쪽, 아래쪽 발은 뒤쪽에 두어 골반이 정면을 바라보게 고정합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "허리 디스크 병력이 있는 회원님은 과도한 회전(트위스트) 대신 측면 굴곡 유지만 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(아래쪽 손으로 바렐을 가볍게 지지하며 짧은 가동범위로 사이드 리프트 8회)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"barrel-side-lying-side-bend-isolated\" · 래더 바렐 사이드라잉 사이드 벤드 · 바렐 아치 골반 지지 & 래더 발 고정 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전의 기구 세팅(스프링: Bodyweight, 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "barrel-side-lying-side-bend-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-barrel-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: barrel, bodyPosition: side-lying, spinalPlanes: [lateral, extension, rotation]로 정의하며 2D rig \"barrel-side-lying-side-bend-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "barrel-side-lying-side-bend-isolated",
          "summaryKo": "2D rig(barrel-side-lying-side-bend-isolated)는 바렐 아치 상단(pelvis: 126,116)과 우측 사다리 가로대 발 지지(ankle: 228,132)를 고정한 채 상체(head: 52,88→84,32)를 옆구리 힘으로 들어 올립니다. 및 고정 지지점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "barrel-side-lying-side-bend-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(barrel-side-lying-side-bend-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-barrel-01",
          "summaryKo": "[국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "barrel-side-lying-side-bend-isolated 도해에서 [국내 시퀀스] 혀니쌤 래더 바렐 + 미니볼 사이드 밴드 & 스완 신전(ex-kr-barrel-01)의 핵심 지지점(바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, barrel-side-lying-side-bend-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-reformer-03",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 61,
    "nameKo": "[국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉",
    "nameEn": "KR Reformer Kneeling Arm Series for Sleek Triceps & Back",
    "apparatus": "reformer",
    "bodyPosition": "kneeling",
    "spinalPlanes": [
      "neutral",
      "rotation"
    ],
    "exercise": {
      "id": "ex-kr-reformer-03",
      "nameKo": "[국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉",
      "nameEn": "KR Reformer Kneeling Arm Series for Sleek Triceps & Back",
      "apparatus": "reformer",
      "bodyPosition": "kneeling",
      "spinalPlanes": [
        "neutral",
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-kr-reformer-03",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (KR Reformer Kneeling Arm Series for Sleek Triceps & Back)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-kr-reformer-03",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (KR Reformer Kneeling Arm Series for Sleek Triceps & Back)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-07-06/exercise-of-the-month-thigh-stretch-on-the-reformer",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 무릎 선 자세(Kneeling)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1B) 설정을 확인한다. 팔꿈치가 몸통 옆구리에서 흔들리지 않도록 단단히 고정하고 전완근만 펴내세요.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "무릎 선 자세(Kneeling) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 팔꿈치 고정한 채 스트랩 뻗어내기 → 들쉬며 천천히 90도 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉의 핵심 가동 구간(톨 닐링(Tall Kneeling) 체스트 익스팬션 10회 + 트라이셉스 프레스 12회)을 수행한다. 승모근이 솟지 않도록 정수리는 천장, 날개뼈 아래쪽 끝은 뒷주머니 방향으로 끌어내립니다.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "상완삼두근·후면삼각근·능형근·광배근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 팔꿈치 고정한 채 스트랩 뻗어내기 → 들쉬며 천천히 90도 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 몸통 수직 기둥을 지킨 채 손과 팔꿈치가 전방 준비 위치(hand x:198,y:96)로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "상완삼두근",
        "후면삼각근",
        "능형근",
        "광배근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 상완삼두근, 후면삼각근, 능형근, 광배근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "팔꿈치가 몸통 옆구리에서 흔들리지 않도록 단단히 고정하고 전완근만 펴내세요. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "1R가 무거운 여성 회원님들께는 1B(파랑 1개)로 낮춰 정확한 삼두 자극을 유도합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양무릎 사이에 엉덩이를 내려놓는 로우 닐링(Low Kneeling) 자세에서 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"kneeling-chest-expansion-triceps\" · 닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉의 기구 세팅(스프링: 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "kneeling-chest-expansion-triceps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-reformer-03",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: kneeling, spinalPlanes: [neutral, rotation]로 정의하며 2D rig \"kneeling-chest-expansion-triceps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "2D rig(kneeling-chest-expansion-triceps)는 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다. 및 고정 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "단일 2D 평면 투영 도해(kneeling-chest-expansion-triceps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-reformer-03",
          "summaryKo": "[국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "kneeling-chest-expansion-triceps 도해에서 [국내 시퀀스] 혀니쌤 리포머 스트랩 팔뚝 슬리밍 트라이셉스 & 로잉(ex-kr-reformer-03)의 핵심 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, kneeling-chest-expansion-triceps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-chair-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 62,
    "nameKo": "[국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어",
    "nameEn": "KR Wunda Chair Pedal Plank to Pike Core & Glute Burner",
    "apparatus": "chair",
    "bodyPosition": "quadruped",
    "spinalPlanes": [
      "neutral",
      "flexion"
    ],
    "exercise": {
      "id": "ex-kr-chair-01",
      "nameKo": "[국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어",
      "nameEn": "KR Wunda Chair Pedal Plank to Pike Core & Glute Burner",
      "apparatus": "chair",
      "bodyPosition": "quadruped",
      "spinalPlanes": [
        "neutral",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "merrithew-stability-chair-ex-kr-chair-01",
        "title": "Exercise of the Month: Stability Chair Alignment & Pedal Control (KR Wunda Chair Pedal Plank to Pike Core & Glute Burner)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-01)에 등록된 공식 체어 교육 자료로 좌면·페달 지지 및 체간·어깨 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "cuh-pilates-chair-posture-ex-kr-chair-01",
        "title": "Pilates: exercises and principles — Seated & Standing Postural Control (KR Wunda Chair Pedal Plank to Pike Core & Glute Burner)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json에 등록된 공개 병원 필라테스 리플릿으로 골반·척추 중립 및 하지 정렬 원칙 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 네발기기/플랭크 지지 자세(Quadruped)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1 Heavy (상단 1)) 설정을 확인한다. 손바닥으로 체어 시트를 밀어내어 날개뼈 사이를 평평하게 채운 플랭크 자세를 먼저 만듭니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "네발기기/플랭크 지지 자세(Quadruped) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "체어 고정 좌면 상판을 밀어내는 양손 손바닥(또는 전완)",
          "체어 페달 위에 올린 양발 앞꿈치",
          "전거근으로 채운 견갑대와 복부 코어 연결 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)의 지지면과 접촉점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 플랭크 일직선 세팅 → 내쉬며 아랫배를 천장으로 끌어올려 파이크 업)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어의 핵심 가동 구간(플랭크 홀드 10초 + 파이크 업/다운 8회 연속 진행)을 수행한다. 다리의 힘이 아니라 아랫배가 등 쪽으로 쏙 빨려 들어가는 힘으로 페달을 가볍게 들어 올리세요.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복횡근·복직근·전거근·둔근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "체어 고정 좌면 상판을 밀어내는 양손 손바닥(또는 전완)",
          "체어 페달 위에 올린 양발 앞꿈치",
          "전거근으로 채운 견갑대와 복부 코어 연결 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 체어 시트 상단(132,106)에 손목을 지지한 채 복부 스쿱으로 골반(178,104→176,48)과 페달 위 발목(216,156→208,134)을 끌어올립니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 플랭크 일직선 세팅 → 내쉬며 아랫배를 천장으로 끌어올려 파이크 업)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "체어 고정 좌면 상판을 밀어내는 양손 손바닥(또는 전완)",
          "체어 페달 위에 올린 양발 앞꿈치",
          "전거근으로 채운 견갑대와 복부 코어 연결 축"
        ],
        "apparatusInteractionKo": "운다/스태빌리티 체어(Wunda/Stability Chair)에서 시트 손목 지지를 유지하며 페달 위 발목(208,134→216,159)과 골반을 시작 사선 정렬로 감속 복귀합니다. (해부학적 실측 아님)",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복횡근",
        "복직근",
        "전거근",
        "둔근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "운다/스태빌리티 체어(Wunda/Stability Chair) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복횡근, 복직근, 전거근, 둔근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "손바닥으로 체어 시트를 밀어내어 날개뼈 사이를 평평하게 채운 플랭크 자세를 먼저 만듭니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "손목 통증이 있는 회원님은 전완근(Forearm)을 시트에 대고 진행하도록 수정합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(두 무릎을 바닥에 대고 페달 프레스 다운(Press Down) 8회로 코어 인지)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"chair-plank-pike-isolated\" · 체어 시트 손 지지 · 페달 발 지지 플랭크 & 파이크 분리)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어의 기구 세팅(스프링: 1 Heavy (상단 1), 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "chair-plank-pike-isolated",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-chair-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: chair, bodyPosition: quadruped, spinalPlanes: [neutral, flexion]로 정의하며 2D rig \"chair-plank-pike-isolated\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "chair-plank-pike-isolated",
          "summaryKo": "2D rig(chair-plank-pike-isolated)는 체어 시트 상단(132,106)에 손목을 지지한 채 복부 스쿱으로 골반(178,104→176,48)과 페달 위 발목(216,156→208,134)을 끌어올립니다. 및 고정 지지점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "chair-plank-pike-isolated",
          "summaryKo": "단일 2D 평면 투영 도해(chair-plank-pike-isolated) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-chair-01",
          "summaryKo": "[국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "chair-plank-pike-isolated 도해에서 [국내 시퀀스] Today Sequence 운다 체어 페달 플랭크 & 파이크 코어(ex-kr-chair-01)의 핵심 지지점(체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, chair-plank-pike-isolated 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-reformer-04",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 63,
    "nameKo": "[국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스",
    "nameEn": "KR 30-Min Seamless Upper-Lower Body Coordination Flow",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "flexion",
      "rotation",
      "neutral"
    ],
    "exercise": {
      "id": "ex-kr-reformer-04",
      "nameKo": "[국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스",
      "nameEn": "KR 30-Min Seamless Upper-Lower Body Coordination Flow",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "flexion",
        "rotation",
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-kr-reformer-04",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (KR 30-Min Seamless Upper-Lower Body Coordination Flow)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-kr-reformer-04",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (KR 30-Min Seamless Upper-Lower Body Coordination Flow)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R 1B) 설정을 확인한다. 스트랩을 쥔 손과 뻗어내는 다리가 서로 멀어지며 복부 사선 슬링(Oblique Sling)을 강하게 연결합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(요추(lumbar)와 천골(pelvis) 중심 지지점이 매트/캐리지에 밀착 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 상체 컬업 & 반대쪽 다리 45도 뻗기 → 들쉬며 테이블탑 정렬 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스의 핵심 가동 구간(컬업 유지 + 코디네이션(Coordination) 오픈/클로즈 + 크리스크로스 8회)을 수행한다. 동작 사이 휴식 시간을 최소화하고 호흡 리듬에 맞춰 물 흐르듯 다음 변형으로 이어갑니다.",
        "jointDirectionsKo": [
          "척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "복횡근·내복사근·외복사근·고관절 굴곡근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 요추(lumbar)와 골반(pelvis)은 고정된 채 발끝(toe)이 x:248,y:88에서 45도 사선(x:292,y:66)으로 뻗고 손이 골반 옆(x:202,y:134)으로 프레스됩니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 상체 컬업 & 반대쪽 다리 45도 뻗기 → 들쉬며 테이블탑 정렬 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 상체 컬업을 유지한 상태에서 다리가 테이블탑(ankle x:238,y:92)으로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "복횡근",
        "내복사근",
        "외복사근",
        "고관절 굴곡근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추 분절 굴곡(Flexion) 및 횡단면 흉곽 회전(Rotation) 및 척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 복횡근, 내복사근, 외복사근, 고관절 굴곡근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "스트랩을 쥔 손과 뻗어내는 다리가 서로 멀어지며 복부 사선 슬링(Oblique Sling)을 강하게 연결합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "허리가 매트에서 뜨지 않도록 다리 높이를 회원님의 코어 근력에 맞게 조절하세요.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(머리를 헤드레스트에 내린 상태에서 암 프레스 + 싱글 레그 토 탭(Toe Tap))로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-leg-stretch-hundred\" · 수파인 헌드레드 · 앱 파이브 & 상하체 협응 스트레치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스의 기구 세팅(스프링: 1R 1B, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-leg-stretch-hundred",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-reformer-04",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [flexion, rotation, neutral]로 정의하며 2D rig \"supine-leg-stretch-hundred\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-leg-stretch-hundred",
          "summaryKo": "2D rig(supine-leg-stretch-hundred)는 요추(lumbar)와 골반(pelvis)은 고정된 채 발끝(toe)이 x:248,y:88에서 45도 사선(x:292,y:66)으로 뻗고 손이 골반 옆(x:202,y:134)으로 프레스됩니다. 및 고정 지지점(요추(lumbar)와 천골(pelvis) 중심 지지점이 매트/캐리지에 밀착 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-leg-stretch-hundred",
          "summaryKo": "단일 2D 평면 투영 도해(supine-leg-stretch-hundred) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-reformer-04",
          "summaryKo": "[국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-leg-stretch-hundred 도해에서 [국내 30분 플로우] 유진쌤 리포머 상·하체 통합 코어 협응 시퀀스(ex-kr-reformer-04)의 핵심 지지점(요추(lumbar)와 천골(pelvis) 중심 지지점이 매트/캐리지에 밀착 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-leg-stretch-hundred 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-kr-cadillac-02",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 64,
    "nameKo": "[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스",
    "nameEn": "KR Cadillac Leg Springs Frog, Circles & Scissors Series",
    "apparatus": "cadillac",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral"
    ],
    "exercise": {
      "id": "ex-kr-cadillac-02",
      "nameKo": "[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스",
      "nameEn": "KR Cadillac Leg Springs Frog, Circles & Scissors Series",
      "apparatus": "cadillac",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral"
      ]
    },
    "sources": [
      {
        "sourceId": "ouh-cadillac-table-stability-ex-kr-cadillac-02",
        "title": "Exercises for Back Pain & Table Core/Scapular Stability (KR Cadillac Leg Springs Frog, Circles & Scissors Series)",
        "publisher": "Oxford University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 공개 병원 재활 자료로 테이블 지지면 위 척추·골반 안정화 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-cadillac-curriculum-ex-kr-cadillac-02",
        "title": "STOTT PILATES Cadillac/Tower Spring & Bar Mechanics (KR Cadillac Leg Springs Frog, Circles & Scissors Series)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(mv-11, mv-12)에 등록된 공식 캐딜락 교육 페이지로 바·스프링 장력 제어 및 몸통 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "캐딜락/타워(Cadillac/Tower)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2 Yellow (레그 스프링)) 설정을 확인한다. 양손으로 캐딜락 수직 폴(Upright Poles)을 가볍게 밀어내며 상체와 견갑골을 매트에 단단히 고정합니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)의 지지면과 접촉점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 두 발뒤꿈치를 붙여 45도 사선 프레스 → 들쉬며 고관절 접어 복귀)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스의 핵심 가동 구간(프로그 10회 → 레그 써클 양방향 8회 → 워킹(Walking) 교차 10회)을 수행한다. 양쪽 다리가 각각 독립된 스프링에 걸려 있으므로 좌·우 다리 높이와 속도를 대칭으로 맞추는 데 집중하세요.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "내전근·햄스트링·둔근·복횡근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 천골(164,136)과 바닥 지지 다리 뒤꿈치(y=144)를 고정한 채 작동 다리가 고관절 수직(-90°)에서 중심선 내전 교차를 거쳐 원위 하방 아크(-38°)로 회전합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 두 발뒤꿈치를 붙여 45도 사선 프레스 → 들쉬며 고관절 접어 복귀)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "캐딜락 테이블 매트 위 후두부 및 양측 견갑골",
          "테이블 매트 위 천골(브리지 구간에서는 상부 흉추와 양발 지지)",
          "테이블 바닥 양발 또는 레그 스프링/푸시스루바/수직 폴 접촉점"
        ],
        "apparatusInteractionKo": "캐딜락/타워(Cadillac/Tower)에서 외측 원호를 따라 골반 흔들림(pelvisDriftMm=0)과 분절 길이 왜곡(drift < 1e-6) 없이 고관절 상방 정점(-78°~-90°)으로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "내전근",
        "햄스트링",
        "둔근",
        "복횡근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "캐딜락/타워(Cadillac/Tower) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 내전근, 햄스트링, 둔근, 복횡근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "양손으로 캐딜락 수직 폴(Upright Poles)을 가볍게 밀어내며 상체와 견갑골을 매트에 단단히 고정합니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "골반이 스프링 장력에 끌려가며 허리가 꺾이지 않도록 꼬리뼈를 매트에 무겁게 둡니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(스프링 높이를 낮추고 무릎을 구부린 프로그(Frog) 동작만 안정적으로 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-feet-in-straps\" · 싱글 레그 서클 · 앙와위 골반 수평·지지 다리(y=144) 고정 & 단측 고관절 360° 원 궤적)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스의 기구 세팅(스프링: 2 Yellow (레그 스프링), 박스: none, 풋바: none)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-feet-in-straps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-kr-cadillac-02",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: cadillac, bodyPosition: supine, spinalPlanes: [neutral]로 정의하며 2D rig \"supine-feet-in-straps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "2D rig(supine-feet-in-straps)는 천골(164,136)과 바닥 지지 다리 뒤꿈치(y=144)를 고정한 채 작동 다리가 고관절 수직(-90°)에서 중심선 내전 교차를 거쳐 원위 하방 아크(-38°)로 회전합니다. 및 고정 지지점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-feet-in-straps",
          "summaryKo": "단일 2D 평면 투영 도해(supine-feet-in-straps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-kr-cadillac-02",
          "summaryKo": "[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-feet-in-straps 도해에서 [국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스(ex-kr-cadillac-02)의 핵심 지지점(앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-feet-in-straps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-global-reformer-01",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 65,
    "nameKo": "[해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우",
    "nameEn": "Dez Fit Intermediate 45-Min Full Body Reformer Sculpt",
    "apparatus": "reformer",
    "bodyPosition": "supine",
    "spinalPlanes": [
      "neutral",
      "rotation"
    ],
    "exercise": {
      "id": "ex-global-reformer-01",
      "nameKo": "[해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우",
      "nameEn": "Dez Fit Intermediate 45-Min Full Body Reformer Sculpt",
      "apparatus": "reformer",
      "bodyPosition": "supine",
      "spinalPlanes": [
        "neutral",
        "rotation"
      ]
    },
    "sources": [
      {
        "sourceId": "nhs-bucks-closed-chain-ex-global-reformer-01",
        "title": "Hip and Knee Closed-Chain Alignment & Resistance Guide (Dez Fit Intermediate 45-Min Full Body Reformer Sculpt)",
        "publisher": "Buckinghamshire Healthcare NHS Trust",
        "directUrl": "https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionApparatusSourceLedger.json 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 및 신전·굴곡 감속 제어 공개 병원 교육 자료.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-global-reformer-01",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Dez Fit Intermediate 45-Min Full Body Reformer Sculpt)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2022-09-23/exercise-of-the-month-warm-up-with-reformer-fitness-circle",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 바로 누운 자세(Supine)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(2R) 설정을 확인한다. 허벅지 사이에 매직써클(써클링)을 끼워 일정한 텐션을 유지한 채 캐리지를 밀고 당깁니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "바로 누운 자세(Supine) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(머리(head), 어깨(shoulder), 발뒤꿈치(heel) 3점 앵커가 지지면을 단단히 지킵니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (내쉬며 써클링 조이고 힙 브릿지 업 → 상단에서 캐리지 인/아웃 컨트롤)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우의 핵심 가동 구간(써클링 펄스 10회 + 브릿지 상태 캐리지 인/아웃 8회)을 수행한다. 엉덩이 높이가 바닥으로 떨어지지 않도록 뒤꿈치로 풋바를 강하게 누르며 햄스트링과 둔근을 연결하세요.",
        "jointDirectionsKo": [
          "척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "둔근·대퇴사두근·내전근·외복사근의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 골반(pelvis)과 고관절(hip)이 바닥(y:144)에서 사선 정점(y:94~96)으로 50px 수직 상승합니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (내쉬며 써클링 조이고 힙 브릿지 업 → 상단에서 캐리지 인/아웃 컨트롤)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 헤드레스트(up) 위 후두부 및 캐리지 위 양측 견갑골",
          "캐리지 매트 위 천골(Sacrum)",
          "풋바(Footbar) 또는 핸드 스트랩 접촉점"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 흉추→요추→골반 순서로 분절 하강하며 시작 지지선(y:144)으로 안정 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "둔근",
        "대퇴사두근",
        "내전근",
        "외복사근"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "척추·골반 중립 안정화(Neutral) 및 횡단면 흉곽 회전(Rotation) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 둔근, 대퇴사두근, 내전근, 외복사근의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "허벅지 사이에 매직써클(써클링)을 끼워 일정한 텐션을 유지한 채 캐리지를 밀고 당깁니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "쥐가 쉽게 나는 회원님은 캐리지 가동범위를 절반으로 줄여 등척성 수축 위주로 진행합니다.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(써클링 없이 양발 골반 너비 브릿지 홀드 + 작은 캐리지 프레스 8회)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"supine-articulated-bridge\" · 수파인 아티큘레이팅 브릿지 & 숄더 브릿지)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우의 기구 세팅(스프링: 2R, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "supine-articulated-bridge",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-global-reformer-01",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: supine, spinalPlanes: [neutral, rotation]로 정의하며 2D rig \"supine-articulated-bridge\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "2D rig(supine-articulated-bridge)는 골반(pelvis)과 고관절(hip)이 바닥(y:144)에서 사선 정점(y:94~96)으로 50px 수직 상승합니다. 및 고정 지지점(머리(head), 어깨(shoulder), 발뒤꿈치(heel) 3점 앵커가 지지면을 단단히 지킵니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "supine-articulated-bridge",
          "summaryKo": "단일 2D 평면 투영 도해(supine-articulated-bridge) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-global-reformer-01",
          "summaryKo": "[해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "supine-articulated-bridge 도해에서 [해외 마스터] Dez Fit 리포머 45분 인터미디어트 전신 스컬프 플로우(ex-global-reformer-01)의 핵심 지지점(머리(head), 어깨(shoulder), 발뒤꿈치(heel) 3점 앵커가 지지면을 단단히 지킵니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, supine-articulated-bridge 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  },
  {
    "exerciseId": "ex-global-reformer-03",
    "track": "track-d-extended-apparatus",
    "rankInTrack": 66,
    "nameKo": "[해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우",
    "nameEn": "Balanced Body Fundamentals: Reformer Strength & Stretch",
    "apparatus": "reformer",
    "bodyPosition": "kneeling",
    "spinalPlanes": [
      "extension",
      "lateral",
      "flexion"
    ],
    "exercise": {
      "id": "ex-global-reformer-03",
      "nameKo": "[해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우",
      "nameEn": "Balanced Body Fundamentals: Reformer Strength & Stretch",
      "apparatus": "reformer",
      "bodyPosition": "kneeling",
      "spinalPlanes": [
        "extension",
        "lateral",
        "flexion"
      ]
    },
    "sources": [
      {
        "sourceId": "cuh-pilates-reformer-core-ex-global-reformer-03",
        "title": "Pilates: exercises and principles — Trunk & Scapular Control (Balanced Body Fundamentals: Reformer Strength & Stretch)",
        "publisher": "Cambridge University Hospitals NHS Foundation Trust",
        "directUrl": "https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/",
        "sourceCategory": "nhs-hospital-leaflet",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 motionDraftSourceLedger.json 및 verifiedReferences.ts에 등록된 공개 병원 필라테스 리플릿으로 척추·골반 중립 및 호흡-사지 협응 원리 확인.",
        "rightsPolicy": "link-only-no-download"
      },
      {
        "sourceId": "merrithew-reformer-curriculum-ex-global-reformer-03",
        "title": "STOTT PILATES Reformer Biomechanics & Alignment Reference (Balanced Body Fundamentals: Reformer Strength & Stretch)",
        "publisher": "Merrithew Official Educational Blog",
        "directUrl": "https://www.merrithew.com/blog/post/2023-07-06/exercise-of-the-month-thigh-stretch-on-the-reformer",
        "sourceCategory": "pilates-curriculum-reference",
        "accessStatus": "verified-in-repo-source-ledger",
        "accessNoteKo": "저장소 내 verifiedReferences.ts(sr-01, mv-13)에 등록된 공식 리포머 교육 페이지로 캐리지 스프링 저항 제어 및 정렬 주의점 확인.",
        "rightsPolicy": "link-only-no-download"
      }
    ],
    "phases": {
      "start": {
        "phaseId": "start",
        "postureAndTransitionKo": "리포머(Reformer)에서 무릎 선 자세(Kneeling)로 시작 자세를 세팅하고 기구 고정 상태와 스프링(1R) 설정을 확인한다. 수업 마무리 단계에서 긴장된 장요근과 햄스트링을 부드럽게 늘려주며 호흡을 가라앉힙니다.",
        "jointDirectionsKo": [
          "척추 및 골반을 흉추·고관절 신전(Extension) 및 관상면 척추 측굴(Lateral Flexion) 및 척추 분절 굴곡(Flexion) 준비 정렬에 맞춰 세팅하고 경추 과긴장을 방지",
          "무릎 선 자세(Kneeling) 기반 지지 관절(고관절·슬관절·견갑대)의 좌우 대칭 정렬 유지",
          "동작 시작 전 심부 복횡근과 견갑 하강 안정화를 선행 연결"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)의 지지면과 접촉점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 흔들림 없이 확보하고 초기 스프링/중력 부하를 안전하게 수용한다.",
        "breathingKo": "코로 들쉬며(Inhale) 흉곽을 확장하고 축 신장(Axial Elongation)을 준비한다 (들쉬며 캐리지를 밀어 고관절 굴곡근 오픈 → 내쉬며 앞다리 무릎 펴 햄스트링 스트레치)."
      },
      "middle": {
        "phaseId": "middle",
        "postureAndTransitionKo": "호흡과 코어 지지를 연결하며 [해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우의 핵심 가동 구간(닐링 이브스 런지 스트레치 + 앞다리 신전 러너스 스트레치 (좌/우 90초))을 수행한다. 양쪽 골반 헤드라이트가 정면을 향하도록 맞춘 상태에서 흉추를 길게 세워줍니다.",
        "jointDirectionsKo": [
          "흉추·고관절 신전(Extension) 및 관상면 척추 측굴(Lateral Flexion) 및 척추 분절 굴곡(Flexion) 방향의 주 가동 궤적을 일정한 속도로 수행하며 요추 과신전이나 골반 흔들림 억제",
          "장요근·광배근·햄스트링·흉추 가동성의 협응 수축으로 사지 및 체간 정렬 유지",
          "관절 끝 범위에서 잠금(Locking)이나 반동 없이 능동적 근육 지지 유지"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다.",
        "breathingKo": "힘을 쓰는 가동 정점 구간에서 호흡을 참지 않고 리듬에 맞춰 내쉬거나(Exhale) 조절 호흡을 이어간다 (들쉬며 캐리지를 밀어 고관절 굴곡근 오픈 → 내쉬며 앞다리 무릎 펴 햄스트링 스트레치)."
      },
      "end": {
        "phaseId": "end",
        "postureAndTransitionKo": "스프링 복원력이나 중력에 급격히 끌려가지 않도록 원심성(Eccentric) 브레이크를 유지하며 천천히 시작 정렬 자세로 감속 복귀한다.",
        "jointDirectionsKo": [
          "가동했던 관절과 척추 분절을 역순 또는 일정한 속도로 원심성 복귀",
          "복귀 마지막 구간까지 좌우 대칭과 골반·견갑대 중립 유지",
          "시작 자세의 안정된 지지 기반 회복"
        ],
        "supportPointsKo": [
          "리포머 캐리지 매트 위 양측 무릎 및 정강이 전면",
          "숄더레스트에 가볍게 닿은 양발 또는 발목 지지점",
          "핸드 스트랩 또는 풋바/프레임을 지지한 양손"
        ],
        "apparatusInteractionKo": "리포머(Reformer)에서 몸통 수직 기둥을 지킨 채 손과 팔꿈치가 전방 준비 위치(hand x:198,y:96)로 제어 복귀합니다.",
        "breathingKo": "조절된 호흡(Inhale 또는 Exhale)으로 중심을 유지하며 시작 위치로 부드럽게 돌아온다."
      }
    },
    "muscles": {
      "primaryMusclesKo": [
        "장요근",
        "광배근",
        "햄스트링",
        "흉추 가동성"
      ],
      "synergistMusclesKo": [
        "내복사근 및 외복사근",
        "다열근",
        "골반저근"
      ],
      "stabilizerMusclesKo": [
        "복횡근",
        "전거근 및 하부승모근(견갑대 안정화)",
        "심부경추굴곡근"
      ],
      "lengthenedStructuresKo": [
        "흉추·고관절 신전(Extension) 및 관상면 척추 측굴(Lateral Flexion) 및 척추 분절 굴곡(Flexion) 가동에 따른 대항근 및 후면·측면 근막 사슬",
        "흉곽 늑간근 및 고관절 주변 관절낭(가동 구간 신장)"
      ],
      "evidenceBasisKo": "리포머(Reformer) 공식 교육 자료 및 병원 재활 리플릿의 폐쇄/개방 사슬 정렬 원칙에 근거하여 장요근, 광배근, 햄스트링, 흉추 가동성의 구심성·원심성 협응과 체간 안정화 기전을 정성적으로 기술함."
    },
    "commonCompensations": [
      {
        "compensationKo": "기구 저항이나 사지 무게를 이기려다 어깨가 귀 쪽으로 솟거나 목 앞쪽이 과긴장됨",
        "biomechanicalCauseKo": "심부 코어 및 하부 승모근·전거근 지지 부족을 상부 승모근과 흉쇄유돌근으로 보상함",
        "cueCorrectionKo": "쇄골을 넓게 열고 날개뼈 아래 끝을 뒷주머니 방향으로 부드럽게 끌어내린 뒤 움직임을 시작하도록 큐잉한다."
      },
      {
        "compensationKo": "가동 정점 또는 복귀 구간에서 허리가 과하게 꺾이거나 골반이 좌우로 흔들림",
        "biomechanicalCauseKo": "복횡근·둔근 안정화 범위를 넘어선 과도한 가동범위 시도 또는 스프링 통제력 상실",
        "cueCorrectionKo": "수업 마무리 단계에서 긴장된 장요근과 햄스트링을 부드럽게 늘려주며 호흡을 가라앉힙니다. 가동범위를 줄여 골반과 요추 중립이 유지되는 범위 안에서 일정한 속도로 수행하게 한다."
      }
    ],
    "contraindicationsAndModifications": [
      {
        "conditionOrCautionKo": "무릎 아래에 얇은 패드나 미니 매트를 깔아주어 슬개골 압박을 예방하세요.",
        "modificationKo": "초보자나 불편감이 있는 경우 쉬운 단계(양손을 풋바에 안정적으로 짚고 짧은 가동범위로 고관절 스트레치만 진행)로 가동범위와 스프링·지지 조건을 조정하여 안전하게 수행한다."
      }
    ],
    "discrepancyChecks": [
      {
        "aspect": "2D 도해 아키타입과 실제 기구 세부 동작 간의 표현 범위",
        "catalogOrDraftStateKo": "현재 이 동작은 2D rig(\"kneeling-chest-expansion-triceps\" · 닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치)로 시각화되며 연결된 연속 모션 초안은 [없음]이다.",
        "evidenceStandardKo": "[해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우의 기구 세팅(스프링: 1R, 박스: none, 풋바: high)과 세부 동작 레이어는 단일 2D 스켈레톤만으로 모든 프레임이 치환되지 않는다.",
        "conservativeResolutionKo": "2D 도해는 3단계 핵심 관절 방향과 고정 지지점을 확인하는 개략도로만 활용하고 세부 세팅과 안전 수칙은 본문 큐를 우선한다."
      },
      {
        "aspect": "전문가 해부학·임상 감수 및 정식 3D 지원 여부",
        "catalogOrDraftStateKo": "카탈로그 계획 노트 및 2D 도해는 자체 제작된 교육용 참고 자료 상태이다.",
        "evidenceStandardKo": "외부 물리치료·필라테스 전문가의 정식 모션 감수나 실측 생체역학 데이터 검증은 완료되지 않았다.",
        "conservativeResolutionKo": "truthfulnessFlags의 모든 ready/verified 플래그를 false로 유지하고 한계를 투명하게 고지한다."
      }
    ],
    "discrepancyAudit": {
      "targetVisualAssetId": "kneeling-chest-expansion-triceps",
      "targetPatternVariantIds": [],
      "facts": [
        {
          "category": "fact",
          "targetId": "ex-global-reformer-03",
          "summaryKo": "카탈로그(INITIAL_EXERCISES)는 apparatus: reformer, bodyPosition: kneeling, spinalPlanes: [extension, lateral, flexion]로 정의하며 2D rig \"kneeling-chest-expansion-triceps\"와 연결되어 있다."
        },
        {
          "category": "fact",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "2D rig(kneeling-chest-expansion-triceps)는 무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다. 및 고정 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)을 개략적인 2D 스켈레톤으로 표현한다."
        }
      ],
      "inferences": [
        {
          "category": "inference",
          "targetId": "kneeling-chest-expansion-triceps",
          "summaryKo": "단일 2D 평면 투영 도해(kneeling-chest-expansion-triceps) 특성상 스프링 장력 변화와 입체적 회전·정렬 디테일은 단계별 텍스트 큐와 함께 해석해야 정확하다."
        }
      ],
      "unverifiedOrMismatched": [
        {
          "category": "unverified",
          "targetId": "ex-global-reformer-03",
          "summaryKo": "[해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우의 2D 도해 좌표 및 기구 치수 비례는 저작 가정(authoring assumption)에 기반하며 외부 해부학·임상 전문가의 최종 감수는 미완료 상태이다."
        }
      ],
      "diagramTeamRecommendationsKo": [
        "kneeling-chest-expansion-triceps 도해에서 [해외 공식] Balanced Body 리포머 기초 스트렝스 & 스트레치 플로우(ex-global-reformer-03)의 핵심 지지점(양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.)과 관절 가동 화살표가 기구 프레임과 시각적으로 명확히 구분되도록 유지할 것."
      ]
    },
    "truthfulnessFlags": HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    "honestLimitationSummaryKo": "본 레코드는 공개 병원 리플릿 및 기구 필라테스 공식 교육 원리를 바탕으로 작성된 정성적 근거 요약이며, kneeling-chest-expansion-triceps 도해는 전문가 최종 감수 전 참고 자료입니다.",
    "reviewedAtIso": "2026-11-08"
  }
] as const;
