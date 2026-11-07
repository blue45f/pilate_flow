import { HONEST_DEFAULT_TRUTHFULNESS_FLAGS } from './trackAMatEvidence';
import type { MotionEvidenceReviewRecord } from './types';

export const TRACK_B_APPARATUS_EVIDENCE_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [
    {
      exerciseId: 'original-reformer-parallel-footwork',
      track: 'track-b-apparatus',
      rankInTrack: 1,
      nameKo: '패럴렐 풋워크',
      nameEn: 'Parallel Footwork',
      apparatus: 'reformer',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'nhs-bucks-hip-knee-closed-chain-press-pdf',
          title:
            'Hip and Knee Closed-Chain Leg Press & Alignment Rehabilitation Guide',
          publisher: 'Buckinghamshire Healthcare NHS Trust',
          directUrl:
            'https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionApparatusSourceLedger.json(SHA-256 검증 스냅샷) 및 publicReferences.ts에 등록된 하지 폐쇄사슬 정렬 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'basi-reformer-footwork-series-guide',
          title: 'Exercise Series: Reformer Footwork Parallel Heels/Toes',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/reformer-footwork-fundamentals/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 검색 스니펫으로 리포머 수파인 중립 골반 정렬, 풋바 위 두 번째 발가락-슬개골-고관절 일직선 트래킹 및 캐리지 아웃/인 호흡 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '리포머 캐리지 위에 바로 누워(Supine) 머리는 헤드레스트에, 양 어깨는 숄더블록에 대칭으로 맞추고 천골과 요추를 중립으로 둔다. 양발은 골반 너비 평행(Parallel)으로 풋바 위에 올려 고관절·무릎·발목을 굴곡한 준비 자세를 취한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 유지',
            '양측 고관절·슬관절 굴곡 및 두 번째 발가락-무릎 중앙-고관절 평행 정렬',
            '양팔은 캐리지 옆에 길게 내려놓고 견갑대 안정화',
          ],
          supportPointsKo: [
            '헤드레스트 위 후두부',
            '캐리지 매트 위 양측 견갑골 및 천골(Sacrum)',
            '숄더블록에 가볍게 닿은 양 어깨 상부',
            '풋바(Footbar) 위 양발 뒤꿈치 또는 발볼',
          ],
          apparatusInteractionKo:
            '캐리지가 스토퍼(Stopper)에 닿은 시작 위치에서 양발로 풋바를 균등하게 지지하고 스프링 초기 장력을 느낀다.',
          breathingKo:
            '코로 들쉬며(Inhale) 흉곽을 확장하고 골반 중립을 유지한 채 캐리지 프레스를 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 양발로 풋바를 균등하게 밀어내며 무릎과 고관절을 신전하여 캐리지를 수평으로 활주(Glide Out)시킨다. 정점에서 무릎을 과신전(잠금)하지 않고 허벅지 근육과 코어 지지를 유지한다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 동시 신전(무릎 잠금 금지)',
            '발목 정렬 유지(뒤꿈치 지지 시 중립 배측굴곡 유지)',
            '캐리지 활주 중 골반 전·후방 경사 및 요추 들뜸 억제',
          ],
          supportPointsKo: [
            '캐리지와 함께 이동하는 후두부·견갑골·천골',
            '고정된 풋바 위 양발 접촉점',
          ],
          apparatusInteractionKo:
            '양발은 고정된 풋바에 머물고 스프링 저항을 이기며 캐리지와 상체·골반 전체가 풋바 반대 방향으로 수평 이동한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 스프링을 밀어 캐리지를 확장하고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 스프링 복원력에 끌려가지 않도록 고관절과 무릎을 천천히 굴곡하며 캐리지를 스토퍼 직전까지 소음 없이 감속 복귀시킨다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 원심성(Eccentric) 굴곡 복귀',
            '무릎이 안쪽(외반)이나 바깥쪽으로 흔들리지 않도록 평행 궤적 유지',
            '천골 중립 및 척추 축 신장 유지',
          ],
          supportPointsKo: [
            '후두부·견갑골·천골(캐리지 지지)',
            '풋바 위 양발 지지점',
          ],
          apparatusInteractionKo:
            '캐리지가 스토퍼에 쾅 부딪치지 않도록 마지막 복귀 구간까지 스프링 장력을 제어한다.',
          breathingKo:
            '조절된 호흡(Inhale 또는 Exhale)으로 일정한 속도를 유지하며 시작 위치로 돌아온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'reformer-supine-footwork',
        targetPatternVariantIds: ['reformer-parallel-footwork'],
        facts: [
          {
            category: 'fact',
            targetId: 'reformer-supine-footwork',
            summaryKo:
              '2D rig(reformer-supine-footwork)는 발목(ankle: 278,132)을 풋바에 고정한 채 middle 단계에서 골반·몸통·머리를 왼쪽으로 44px(pelvis x: 204 -> 160) 수평 이동시키고 carriageOffsetPx도 0 -> 44 -> 8로 변경한다.',
          },
          {
            category: 'fact',
            targetId: 'reformer-supine-footwork',
            summaryKo:
              '그러나 이 단일 2D 아키타입이 패럴렐 풋워크뿐 아니라 3종 시리즈(ex-footwork-01), 써클링 와이드 세컨드(ex-footwork-02), 한국형 리포머 풋워크(ex-kr-reformer-01)에 동일 좌표로 재사용된다.',
          },
          {
            category: 'fact',
            targetId: 'reformer-parallel-footwork',
            summaryKo:
              '연속 초안(reformerFootwork.ts의 reformer-parallel-footwork)은 2-bone IK로 무릎 신전과 캐리지 이동(0.34m)을 계산하나, 발목 벡터(FOOT_VECTOR)가 전 구간 고정되어 뒤꿈치 접촉 단일 패턴만 표현한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'reformer-supine-footwork',
            summaryKo:
              '2D rig에서 start(대퇴+하퇴 합 약 106.7px) 대비 middle(약 110.3px)에서 하지 분절 길이 합이 약 3.6px 늘어나는 것은 수동 좌표 지정에 따른 미세한 분절 길이 오차이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'reformer-parallel-footwork',
            summaryKo:
              '연속 초안(reformer-parallel-footwork)의 풋바 높이·스프링 장력·캐리지 이동거리는 제작 가정(authoring assumption)이며 제조사 규격 및 해부학 전문가 검증은 미완료 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'reformer-supine-footwork의 start/middle/end 하지 분절 길이(hip-knee, knee-ankle)를 일정하게 보정하고, 발볼(Toes)·아치(Arches)·뒤꿈치(Heels) 접촉점 변형을 구분할 수 있는 보조 마커를 검토할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-reformer-supine-arm-press',
      track: 'track-b-apparatus',
      rankInTrack: 2,
      nameKo: '누워서 스트랩 암 프레스',
      nameEn: 'Supine Strap Arm Press',
      apparatus: 'reformer',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'ouh-shoulder-scapular-press-leaflet-pdf',
          title: 'Exercises for Back Pain & Supine Scapular/Core Stability',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionApparatusSourceLedger.json 및 motionDraftSourceLedger.json에 등록된 수파인 체간 안정화 공개 병원 교육 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'pilates-anytime-reformer-supine-arms-guide',
          title: 'Supine Arm Work on the Reformer (Arms in Straps)',
          publisher: 'Pilates Anytime Educational Encyclopedia',
          directUrl:
            'https://www.pilatesanytime.com/pilates-exercises/reformer/supine-arm-work',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 도메인 직접 본문 호출은 제한되었으나, 공개 교육 요약으로 수파인 핸드 스트랩 견관절 신전 아크 및 흉곽·골반 중립 고정 원리를 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '리포머 캐리지에 바로 누워(Supine) 양손에 핸드 스트랩을 쥐고 팔을 어깨 수직선 위 천장 방향으로 뻗는다. 카탈로그 기본 계획에서는 양발을 지지한 안정된 자세(또는 진행 단계에서는 테이블탑)에서 천골과 흉곽을 중립으로 고정한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 고정',
            '양측 견관절 굴곡(어깨 위 수직 정렬) 및 주관절 신전(손목 중립)',
            '견갑골 하강 및 캐리지 매트 밀착',
          ],
          supportPointsKo: [
            '헤드레스트 위 후두부',
            '캐리지 위 양측 견갑골 및 흉추',
            '천골(Sacrum) 및 지지된 양발(또는 테이블탑 시 천골 고정)',
          ],
          apparatusInteractionKo:
            '양손의 스트랩에 가벼운 초기 텐션을 유지하여 로프가 느슨해지지 않게 하고 어깨가 숄더블록 쪽으로 들리지 않게 한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 쇄골을 넓히고 광배근과 심부 복부 연결을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 손목과 팔꿈치를 길게 유지하며 양손 스트랩을 천장에서 골반 옆 캐리지 방향 원호(Arc)로 끌어내려 견관절을 신전하고 캐리지를 활주시킨다.',
          jointDirectionsKo: [
            '양측 견관절 신전(Shoulder Extension)으로 손이 골반 옆 높이까지 하강',
            '주관절 신전 및 손목 중립 유지',
            '팔을 내릴 때 갈비뼈가 들리거나(Rib flaring) 어깨가 앞으로 말리지 않게 흉추 중립 유지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 후면',
            '천골(Sacrum)',
          ],
          apparatusInteractionKo:
            '스트랩을 당기는 힘으로 풀리 로프를 통해 캐리지가 풋바 쪽으로 이동하며, 이때 몸통과 골반도 캐리지와 일체로 함께 이동해야 한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부와 광배근의 연결로 스트랩을 골반 옆까지 프레스하고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 스프링 장력에 팔이 갑자기 끌려 올라가지 않도록 통제하며 양손을 다시 어깨 수직선 위 시작 위치로 되돌리고 캐리지를 복귀시킨다.',
          jointDirectionsKo: [
            '양측 견관절 원심성 굴곡 복귀(어깨 수직선까지만 상승)',
            '견갑골 거상(어깨 으쓱거림) 억제 및 몸통 중립 유지',
          ],
          supportPointsKo: ['후두부', '양측 견갑골', '천골'],
          apparatusInteractionKo:
            '로프 텐션을 끝까지 일정하게 유지하며 캐리지와 양팔을 동시에 시작 위치로 감속 복귀시킨다.',
          breathingKo:
            '조절된 호흡과 함께 어깨 안정성을 유지하며 시작 자세로 돌아온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-strap-arm-press',
        targetPatternVariantIds: ['reformer-supine-strap-arm-press'],
        facts: [
          {
            category: 'fact',
            targetId: 'original-reformer-supine-arm-press',
            summaryKo:
              '카탈로그 standard 큐는 "양발을 지지한 상태에서 손의 스트랩을 몸 옆으로 보내고 천천히 돌아옵니다"(양발 지지·소도구 없음)라고 정의한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              '그러나 2D rig(supine-strap-arm-press)와 연속 초안(reformer-supine-strap-arm-press)은 모두 두 다리를 공중 테이블탑(knee: 196,94 / ankle: 238,94)으로 띄우고 있으며, 연속 초안은 카탈로그에 없는 발목 사이 볼(ballCenter)까지 포함한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              '또한 2D rig에서 carriageOffsetPx는 2 -> 24 -> 4로 변해 SVG 캐리지 사각형은 22px 이동하지만, 그 위에 누운 신체의 head(x:54)·thoracic(x:124)·pelvis(x:184) 좌표는 전혀 이동하지 않는다(Δx = 0px).',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              '2D rig에서 캐리지만 움직이고 몸통 좌표가 고정되어 있으면 리포머 위에서 몸이 미끄러지는 물리적 모순이 발생하며, 연속 초안(reformerStrapArmPress.ts)처럼 캐리지 이동량(carriageShift)만큼 신체 루트도 함께 이동해야 한다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'reformer-supine-strap-arm-press',
            summaryKo:
              '카탈로그 문구("양발을 지지한 상태")와 도해/초안(공중 테이블탑 + 발목 볼) 간 불일치가 motionPatternReferences.ts의 mismatched 항목에도 명시되어 있으며, 2D rig의 캐리지-몸통 분리 이동 오류가 존재한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'supine-strap-arm-press 2D rig에서 middle 단계의 carriageOffsetPx(24px) 이동에 맞추어 신체 고정 앵커(head, thoracic, pelvis 등)도 캐리지와 함께 수평 이동시키거나 상대 좌표계를 통일할 것.',
          '카탈로그의 "양발을 지지한 상태"와 도해의 "테이블탑 다리 + 발목 볼" 중 기준 자세를 명확히 일치시킬 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-reformer-strap-frog',
      track: 'track-b-apparatus',
      rankInTrack: 3,
      nameKo: '스트랩 프로그 준비',
      nameEn: 'Feet in Straps Frog Preparation',
      apparatus: 'reformer',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'basi-feet-in-straps-frog-guide',
          title: 'Reformer Feet in Straps: Frog and Leg Circles Alignment',
          publisher: 'BASI Pilates',
          directUrl:
            'https://www.basipilates.com/blog/feet-in-straps-on-the-reformer/',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹페이지 직접 호출은 제한되었으나, 공개 교육 자료 요약 및 저장소 내 카탈로그/도해 감사 문서로 프로그(Frog) 고관절 외회전·뒤꿈치 밀착·천골 고정 원리를 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-hip-neutral-pelvis-leaflet-2023',
          title: 'Pilates: exercises and principles (Neutral Pelvis & Hip Control)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 수파인 천골 고정 및 하지 움직임 분리 원칙 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '리포머 캐리지에 바로 누워(Supine) 양발 아치에 풋 스트랩(Long Loops)을 걸고, 천골을 캐리지 매트에 무겁게 고정한다. 양발 뒤꿈치를 서로 붙인 필라테스 V(가벼운 고관절 외회전) 상태에서 무릎을 굽혀 프로그(Frog) 시작 자세를 만든다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 천골 중립 고정(꼬리뼈가 말려 뜨지 않게 유지)',
            '양측 고관절 굴곡·외회전 및 슬관절 굴곡',
            '양발 뒤꿈치 밀착 및 발끝 살짝 외전(Pilates V)',
          ],
          supportPointsKo: [
            '헤드레스트 위 후두부',
            '캐리지 위 양측 견갑골 및 상체 후면',
            '캐리지 매트에 밀착된 천골(Sacrum)',
            '풋 스트랩에 걸린 양발 아치',
          ],
          apparatusInteractionKo:
            '스트랩 장력이 걸린 상태에서 꼬리뼈가 매트에서 들릴 정도로 무릎을 가슴 쪽으로 과도하게 당기지 않고 캐리지 범위를 유지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 천골을 무겁게 내리고 복부 중심을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 천골과 요추 중립을 그대로 유지하면서 양발 뒤꿈치를 붙인 채 무릎과 고관절을 전방 사선으로 길게 뻗어(Press Out) 캐리지를 활주시킨다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 사선 신전 및 내전근 연결로 양다리 밀착',
            '허리가 매트에서 들뜨지 않는 사선 높이 유지',
            '견갑대 및 후두부 이완 유지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추',
            '천골(Sacrum)',
            '스트랩을 밀어내는 양발 아치',
          ],
          apparatusInteractionKo:
            '양발 스트랩을 사선 앞으로 밀어내며 스프링 저항을 통해 캐리지가 이동한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 뒤꿈치와 허벅지 안쪽을 모아 다리를 길게 뻗는다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬는 숨에 천골이 캐리지에서 들리지 않도록 고정한 채 양발 뒤꿈치를 붙인 상태로 무릎과 고관절을 다시 굽혀 시작 프로그(Frog) 자세로 천천히 돌아온다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 원심성 굴곡 복귀(뒤꿈치 밀착 유지)',
            '복귀 시 꼬리뼈 들림(Posterior Pelvic Tilt) 억제',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골',
            '천골(Sacrum)',
            '스트랩에 지지된 양발 아치',
          ],
          apparatusInteractionKo:
            '스프링이 캐리지를 당겨올 때 급격히 끌려오지 않도록 고관절과 무릎 굴곡 속도를 일정하게 제어한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 골반 중립을 지킨 채 무릎을 접어 시작 프로그 자세로 복귀한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'reformer-strap-frog-isolated',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'original-reformer-strap-frog',
            summaryKo:
              '카탈로그 정의는 "무릎을 편한 범위로 굽혔다 길게 뻗습니다"라는 순수 프로그(무릎 굴곡 <-> 신전) 동작이며, 연속 모션 초안(MOTION_PATTERN_REFERENCES)은 아직 없다.',
          },
          {
            category: 'fact',
            targetId: 'reformer-strap-frog-isolated',
            summaryKo:
              '2D rig(supine-feet-in-straps)의 end 단계는 무릎을 다시 접는 프로그 복귀가 아니라 무릎을 편 채 천장 쪽으로 들어 올리는 Leg Circle 상방 리프트(knee: 210,58 / ankle: 222,40)로 그려져 있다.',
          },
          {
            category: 'fact',
            targetId: 'reformer-strap-frog-isolated',
            summaryKo:
              '또한 MovementPhaseDiagramSvg.tsx에서 로프가 헤드 끝(46,114)에서 발목으로 직선 연결되며, carriageOffsetPx(6 -> 36 -> 12) 이동 시 신체 좌표는 고정되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'reformer-strap-frog-isolated',
            summaryKo:
              'supine-feet-in-straps 아키타입이 Frog와 Leg Circles/Lower & Lift를 한 도해에 혼합하면서 end 단계가 무릎 굴곡 복귀 대신 직선 다리 거상으로 표현된 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'reformer-strap-frog-isolated',
            summaryKo:
              'original-reformer-strap-frog의 end 단계는 무릎을 굽힌 프로그 시작 자세로 돌아와야 하나, 현재 2D rig end 프레임은 무릎을 편 천장 리프트(ankle y:40)를 표시하여 동작 설명과 불일치한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'original-reformer-strap-frog용 2D 포즈에서는 end 단계가 무릎을 다시 굽힌 프로그 자세(start 인근 knee/ankle 굴곡 좌표)로 복귀하도록 Leg Circle 아크와 분리할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'ex-plank-01',
      track: 'track-b-apparatus',
      rankInTrack: 4,
      nameKo: '리포머 롱 스트레치 & 엘리펀트 / 니 스트레치',
      nameEn: 'Reformer Long Stretch, Elephant & Knee Stretch Series',
      apparatus: 'reformer',
      bodyPosition: 'quadruped',
      spinalPlanes: ['neutral', 'flexion'],
      sources: [
        {
          sourceId: 'pilatesology-reformer-long-stretch-series',
          title: 'Reformer Long Stretch Series (Long Stretch, Up Stretch, Elephant)',
          publisher: 'Pilatesology Classical Encyclopedia',
          directUrl: 'https://pilatesology.com/blog/long-stretch-series/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시로 외부 직접 크롤링은 차단되었으나, 공개 교육 설명 및 카탈로그 큐잉으로 양손 풋바 지지·양발 헤드레스트/숄더블록 지지 방향과 플랭크/파이크 역학을 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-plank-scapular-control-leaflet-2023',
          title: 'Pilates: exercises and principles (Scapular Stability & Plank Alignment)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 전거근 지지 및 체간 중립 안정화 원칙 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '리포머에서 양손으로 풋바(Footbar)를 넓게 잡고, 세워진 헤드레스트/숄더블록에 양발 뒤꿈치(또는 발볼)를 지지하여 머리부터 발뒤꿈치까지 일직선 플랭크(Long Stretch) 또는 업 스트레치/엘리펀트 준비 정렬을 만든다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 플랭크 정렬(또는 엘리펀트 시 척추 굴곡 준비)',
            '양측 견관절 굴곡·주관절 신전 및 전거근 활성으로 견갑골 안정화',
            '양측 고관절·슬관절 신전 및 둔근·복부 동시 수축',
          ],
          supportPointsKo: [
            '풋바(Footbar)를 잡은 양손 손바닥',
            '헤드레스트/숄더블록(또는 캐리지)에 지지한 양발',
          ],
          apparatusInteractionKo:
            '양손은 고정된 풋바를 밀어내고 양발은 이동하는 캐리지(헤드레스트/숄더블록)를 지지하여 스프링 장력을 유지한다.',
          breathingKo:
            '들쉬거나 내쉬는 시작 호흡으로 날개뼈 사이를 채우고 복부 중심을 세팅한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '롱 스트레치에서는 플랭크 일직선을 유지한 채 견관절 굴곡을 통해 캐리지를 뒤로 밀어냈다가 당기고, 업 스트레치/엘리펀트 연결 시에는 고관절 굴곡과 하복부 스쿱으로 골반을 천장 쪽으로 높여 캐리지를 풋바 쪽으로 끌어당긴다.',
          jointDirectionsKo: [
            '롱 스트레치 구간: 몸통·고관절 중립 유지 및 견관절 굴곡/신전 이동',
            '엘리펀트/업 스트레치 구간: 고관절 굴곡 및 요흉추 굴곡(Scoop)으로 골반 상방 리프트',
            '전 구간 주관절 신전 및 손목-풋바 지지 유지',
          ],
          supportPointsKo: [
            '고정된 풋바 위 양손',
            '캐리지/헤드레스트 위 양발 뒤꿈치·발바닥',
          ],
          apparatusInteractionKo:
            '손은 풋바에 고정된 상태에서 어깨 각도 변화(Long Stretch) 또는 고관절 굴곡(Elephant)으로 캐리지 이동을 제어한다.',
          breathingKo:
            '카탈로그 호흡 큐에 따라 캐리지가 뒤로 이동할 때 들쉬고(Inhale), 복부와 광배근 힘으로 당겨올 때 내쉰다(Exhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '코어 브레이크를 유지하며 골반과 어깨를 다시 손목 위 플랭크(또는 니 스트레치 착지) 시작 정렬로 감속 복귀시킨다.',
          jointDirectionsKo: [
            '견관절 수직 정렬 복귀 및 고관절·척추 중립 플랭크 라인 복원',
            '허리 과신전(처짐) 및 어깨 으쓱거림 억제',
          ],
          supportPointsKo: ['풋바 위 양손', '캐리지/헤드레스트 위 양발'],
          apparatusInteractionKo:
            '스프링 장력에 몸이 튕기지 않도록 끝까지 캐리지 속도를 통제하며 복귀한다.',
          breathingKo:
            '내쉬거나 들쉬며(Exhale/Inhale) 정렬을 유지한 채 시작 위치로 돌아온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'reformer-plank-long-stretch-isolated',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'reformer-plank-long-stretch-isolated',
            summaryKo:
              'MovementPhaseDiagramSvg.tsx의 리포머 도식(case reformer)에서는 풋바가 오른쪽(x: 278~288)에 있고 헤드레스트/풀리가 왼쪽(x: 42~72)에 그려진다.',
          },
          {
            category: 'fact',
            targetId: 'reformer-plank-long-stretch-isolated',
            summaryKo:
              '그러나 plank-long-stretch-chair-pike 2D rig는 손(wrist x:96, hand x:88)을 왼쪽에 두고 발(ankle x:280->242)을 오른쪽에 배치하여, 리포머 도식 위에서 손이 헤드레스트 쪽 허공을 짚고 발이 풋바에 놓이는 좌우 역전 오류가 발생한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'reformer-plank-long-stretch-isolated',
            summaryKo:
              '운다 체어 파이크(왼쪽 시트, 오른쪽 페달) 기준 좌표를 리포머 플랭크(오른쪽 풋바, 왼쪽 헤드레스트)에 좌우 반전 없이 그대로 재사용하면서 기구 지지점이 완전히 뒤바뀐 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'ex-plank-01',
            summaryKo:
              '카탈로그 큐잉("손바닥으로 풋바를 강하게 밀어내", "헤드레스트를 바짝 세워 두 발뒤꿈치를 걸고")과 2D 도해의 손·발 기구 접촉 위치가 정반대(mismatched)이며, 유튜브 참고 링크도 미검증(unverified-link) 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          '리포머 플랭크(ex-plank-01) 전용 2D rig를 분리하여 손(hand/wrist)이 오른쪽 풋바(x: 278~284)를 잡고 발(ankle/heel)이 왼쪽 캐리지 헤드레스트/숄더블록을 지지하도록 좌우 방향을 바로잡을 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'ex-extension-01',
      track: 'track-b-apparatus',
      rankInTrack: 5,
      nameKo: '리포머 롱박스 풀링 스트랩 & 티-스트랩 스완',
      nameEn: 'Long Box Pulling Straps I & II (Plow & T-Straps Swan)',
      apparatus: 'reformer',
      bodyPosition: 'prone',
      spinalPlanes: ['extension'],
      sources: [
        {
          sourceId: 'pilatesology-reformer-pulling-straps-guide',
          title: 'Reformer Long Box: Pulling Straps I & II (The Plow & T-Straps)',
          publisher: 'Pilatesology Classical Encyclopedia',
          directUrl: 'https://pilatesology.com/blog/pulling-straps/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹 직접 접속은 제한되었으나, 공개 교육 설명 및 카탈로그 큐잉으로 롱박스 프론 배치·스트랩 후방 당김·흉추 신전(Swan) 원리를 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-thoracic-extension-leaflet-2023',
          title: 'Pilates: exercises and principles (Prone Thoracic Extension & Scapular Control)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 복부 지지 기반 상부 흉추 신전 및 견갑골 하강 안정화 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '리포머 캐리지 위에 롱박스(Long Box)를 세팅하고, 가슴 앞쪽(하부 갈비뼈 바로 위)이 박스 앞 모서리 밖으로 살짝 나오도록 엎드린다(Prone). 양손은 풀리 쪽 로프(또는 스트랩)를 잡고 두 다리는 골반 너비로 길게 뻗어 둔근과 복부를 연결한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 긴 중립 정렬(또는 박스 모서리를 따른 미세한 준비 굴곡)',
            '양측 견관절 전방 하방 리치로 로프 파지',
            '양측 고관절·슬관절 신전으로 하지 수평 유지',
          ],
          supportPointsKo: [
            '롱박스 상판에 지지된 하부 흉곽·복부·치골(Pubic Bone) 및 대퇴 전면',
            '양손에 파지된 리포머 로프/스트랩',
          ],
          apparatusInteractionKo:
            '풋바는 내리고(Down) 캐리지 위 롱박스에 몸통을 안정적으로 지지한 상태에서 풀리 쪽 로프를 잡는다.',
          breathingKo:
            '들쉬거나 내쉬는 준비 호흡으로 아랫배를 등 쪽으로 들어 올려 요추를 보호한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '들쉬는 숨(또는 강사 큐 호흡)에 양손으로 스트랩을 박스 옆면을 따라 골반/허벅지 옆까지 길게 당기며(Pulling Straps I) 또는 수평 T자로 당기며(Pulling Straps II), 정수리부터 상부·중부 흉추를 순서대로 신전하여 가슴을 들어 올리고 캐리지를 활주시킨다.',
          jointDirectionsKo: [
            '견관절 신전(또는 수평 외전) 및 견갑골 내전·하강',
            '경추 중립 연장선 유지 및 상·중부 흉추 신전(Thoracic Extension)',
            '치골 박스 밀착 및 고관절·슬관절 신전 유지',
          ],
          supportPointsKo: [
            '롱박스 위 복부·치골 및 대퇴 전면',
            '후방으로 당긴 양손 스트랩',
          ],
          apparatusInteractionKo:
            '스트랩을 골반 뒤쪽으로 당기는 상지 힘으로 캐리지와 롱박스가 함께 헤드/풀리 쪽으로 활주한다.',
          breathingKo:
            '카탈로그 호흡 큐에 따라 들쉬며(Inhale) 스트랩을 골반 옆으로 당겨 흉추를 신전한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 정수리 길이를 유지하고 어깨가 으쓱거리지 않게 제어하면서 양팔을 앞으로 보내고 상체를 박스 수평 정렬로 천천히 내려 캐리지를 복귀시킨다.',
          jointDirectionsKo: [
            '흉추 신전에서 중립 정렬로 원심성 복귀',
            '견관절 원심성 굴곡으로 양팔 전방 복귀',
          ],
          supportPointsKo: ['롱박스 위 복부·치골·대퇴 전면', '양손 스트랩'],
          apparatusInteractionKo:
            '스프링 복원력에 상체가 급격히 끌려가지 않도록 끝까지 등 상부와 코어로 감속하며 캐리지를 되돌린다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 정수리를 길게 유지한 채 시작 자세로 돌아온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'prone-swan-pulling-straps-swimming',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '2D rig(prone-swan-pulling-straps-swimming)는 손이 전방(46,154)에서 골반 옆(184,126)으로 당겨지고 머리가 들리는(head y: 136 -> 78) Pulling Straps 궤적을 표현한다.',
          },
          {
            category: 'fact',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '그러나 MovementPhaseDiagramSvg.tsx의 리포머 도식에는 롱박스(Long Box)가 전혀 렌더링되지 않아 골반(y:142)이 낮은 캐리지 바닥(y:144)에 직접 놓여 있고, carriageOffsetPx(2 -> 34 -> 4) 이동 시 몸통 좌표(pelvis x:186)가 캐리지와 함께 이동하지 않는다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'prone-swan-pulling-straps-swimming',
            summaryKo:
              '롱박스 높이가 생략되면서 시작 자세에서 손(y:154)을 골반(y:142)보다 아래로 내리는 박스 모서리 드롭 각도와 캐리지-박스 일체 활주가 시각적으로 드러나지 않는다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'ex-extension-01',
            summaryKo:
              '2D 도해에서 롱박스 도형 누락 및 캐리지 활주 시 신체 고정 오류가 있으며, 카탈로그 유튜브 링크는 미검증(unverified-link) 상태이고 연속 모션 초안은 미구현이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'MovementPhaseDiagramSvg.tsx에서 exercise.box === "long-box"일 때 캐리지 위에 Long Box 사각형을 렌더링하고, 캐리지 이동 시 박스 위 신체 좌표가 함께 이동하도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-cadillac-arm-spring-press',
      track: 'track-b-apparatus',
      rankInTrack: 6,
      nameKo: '누워서 암 스프링 프레스',
      nameEn: 'Supine Arm Spring Press',
      apparatus: 'cadillac',
      bodyPosition: 'supine',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'ouh-cadillac-supine-arm-stability-pdf',
          title: 'Exercises for Back Pain & Supine Core/Shoulder Stabilization',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionApparatusSourceLedger.json(SHA-256 검증 스냅샷) 및 publicReferences.ts에 등록된 수파인 체간·상지 안정화 근거 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'pilates-anytime-cadillac-arm-springs-supine',
          title: 'Cadillac Arm Springs: Supine Arm Press & Scapular Mechanics',
          publisher: 'Pilates Anytime Educational Encyclopedia',
          directUrl:
            'https://www.pilatesanytime.com/pilates-exercises/cadillac/arm-springs',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹 직접 호출은 제한되었으나, 공개 교육 요약 및 저장소 내 cadillacArmSpringPress.ts 모델 문서로 고정 테이블 지지·암 스프링 프레스 원리를 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '캐딜락 고정 테이블 위에 바로 누워(Supine) 양 무릎을 굽혀 발바닥을 테이블에 지지하고, 수직 타워바에 연결된 암 스프링 핸들을 양손으로 안정적으로 쥔다. 골반과 흉곽은 테이블 위에서 중립을 유지한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 유지',
            '양측 고관절·슬관절 굴곡 및 양발 테이블 바닥 지지',
            '양측 견관절 굴곡(또는 타워 스프링 각도에 맞춘 준비 굴곡) 및 견갑골 안정화',
          ],
          supportPointsKo: [
            '캐딜락 고정 테이블 위 후두부',
            '양측 견갑골 및 흉추 후면',
            '천골(Sacrum)',
            '테이블 매트에 지지한 양발 발바닥',
          ],
          apparatusInteractionKo:
            '캐딜락은 리포머와 달리 바닥면이 움직이지 않는 고정 테이블이므로, 클립과 스프링 연결 상태를 확인하고 얼굴 위로 손잡이가 지나가지 않는 안전한 각도에서 시작한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 등 상부를 테이블에 넓게 붙이고 복부 중심을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 갈비뼈가 들리거나 어깨가 앞쪽으로 말리지 않게 유지하며 양손 핸들을 몸통 옆 테이블 방향으로 끌어내려 암 스프링을 신장시킨다.',
          jointDirectionsKo: [
            '양측 견관절 신전(Shoulder Extension) 및 안정적인 주관절 각도 제어',
            '견갑골 하강·후인 안정화 유지',
            '스프링 장력 증가에 맞서 흉추 신전(갈비뼈 들림) 및 요추 과전만 억제',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골 및 흉추',
            '천골(Sacrum)',
            '양발 발바닥(테이블 고정)',
          ],
          apparatusInteractionKo:
            '타워 상단/중단 앵커에서 내려오는 좌우 독립 암 스프링을 대칭 속도로 당겨 내린다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 지지로 흉곽을 닫고 양팔을 몸 옆으로 보낸다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 스프링 복원력에 손잡이가 튕겨 올라가지 않도록 원심성으로 제어하며 양팔을 시작 위치로 천천히 되돌린다.',
          jointDirectionsKo: [
            '양측 견관절 원심성 굴곡 복귀',
            '견갑골 거상 억제 및 몸통 중립 유지',
          ],
          supportPointsKo: [
            '후두부',
            '양측 견갑골',
            '천골',
            '양발 발바닥',
          ],
          apparatusInteractionKo:
            '좌우 암 스프링 장력을 끝까지 균등하게 통제하여 핸들을 시작 높이로 복귀시킨다.',
          breathingKo:
            '조절된 호흡으로 스프링 텐션을 느끼며 천천히 시작 자세로 돌아온다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-strap-arm-press',
        targetPatternVariantIds: ['cadillac-supine-arm-spring-press'],
        facts: [
          {
            category: 'fact',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              '2D rig(supine-strap-arm-press)는 리포머와 공유되어 다리가 공중 테이블탑(knee: 196,94 / ankle: 238,94)으로 떠 있고 팔꿈치를 완전히 편 원호로 그리며, 고정 테이블인 캐딜락임에도 carriageOffsetPx가 2 -> 24 -> 4로 설정되어 있다.',
          },
          {
            category: 'fact',
            targetId: 'cadillac-supine-arm-spring-press',
            summaryKo:
              '반면 연속 초안(cadillacArmSpringPress.ts의 cadillac-supine-arm-spring-press)은 양발을 캐딜락 테이블 바닥에 내려놓고(ankle y:0.45) 굽힌 팔꿈치(elbowBend: 0.21)로 손을 내리는 동작으로 구현되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              'movementVisualRigCatalog.ts(4327행)에서 isCarriageApparatus 조건에 cadillac을 포함시켜 고정 테이블인 캐딜락에 비정상적인 carriageOffsetPx가 들어간 것이며, 2D rig와 연속 초안 간 다리·팔꿈치 자세가 서로 다르다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'supine-strap-arm-press',
            summaryKo:
              '캐딜락 고정 테이블에서 carriageOffsetPx(2 -> 24 -> 4)가 발생하는 기구 상태 오류와, 2D rig(테이블탑 다리 + 편 팔) vs 연속 초안(바닥 지지 발 + 굽힌 팔) 간 자세 불일치가 존재한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'movementVisualRigCatalog.ts의 isCarriageApparatus에서 cadillac을 제외하여 캐딜락 동작의 carriageOffsetPx를 항상 0으로 고정할 것.',
          'original-cadillac-arm-spring-press의 2D rig와 연속 초안(cadillac-supine-arm-spring-press)의 발 지지 위치(테이블 지지 vs 테이블탑) 및 팔꿈치 각도를 일치시킬 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'ex-bridging-02',
      track: 'track-b-apparatus',
      rankInTrack: 7,
      nameKo: '캐딜락 타워 바 파라키트 & 숄더 브릿지',
      nameEn: 'Cadillac Tower Bar Shoulder Bridge & Parakeet Prep',
      apparatus: 'cadillac',
      bodyPosition: 'supine',
      spinalPlanes: ['flexion', 'extension'],
      sources: [
        {
          sourceId: 'pilatesology-cadillac-tower-parakeet-bridge',
          title: 'Cadillac Tower & Parakeet / Shoulder Bridge Mechanics',
          publisher: 'Pilatesology Classical Encyclopedia',
          directUrl: 'https://pilatesology.com/blog/tower-on-the-cadillac/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹 직접 접속은 제한되었으나, 공개 교육 설명 및 카탈로그 큐잉으로 하단 스프링 푸시스루 바(타워 바) 발아치 지지·척추 분절 브리지·무릎 굴신(Parakeet) 역학을 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ouh-back-pain-articulated-bridge-pdf',
          title: 'Exercises for Back Pain (Articulated Pelvic Curl & Shoulder Bridge)',
          publisher: 'Oxford University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 분절 브리지 및 경추 체중 부하 방지 원칙 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '캐딜락 테이블에 바로 누워(Supine) 하단 스프링(및 안전 스트랩)이 체결된 푸시스루 바(타워 바) 아래에 위치하고, 양발 아치(또는 발볼)를 공중의 타워 바에 걸어 무릎을 굽히거나 편 준비 자세를 만든다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 중립 정렬',
            '양측 고관절 굴곡 및 타워 바 높이에 맞춘 슬관절·발목 정렬',
            '양팔은 테이블 옆에 길게 두거나 수직 기둥(Vertical Poles)을 잡아 상체 고정',
          ],
          supportPointsKo: [
            '테이블 매트 위 후두부·양측 견갑골·천골',
            '공중 푸시스루 바(타워 바)에 걸린 양발 아치/발볼',
          ],
          apparatusInteractionKo:
            '하단 스프링 안전 스트랩 체결을 반드시 확인하고, 양발이 바에서 미끄러지지 않게 수직 압력으로 타워 바를 지지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 척추 분절 거상을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 양발로 타워 바를 밀어 올리며 꼬리뼈부터 척추를 분절하여 어깨-골반-무릎 사선 브리지 정점으로 올라가고, 정점에서 바를 수직 지지한 채 무릎을 접었다 펴는 파라키트(Parakeet) 니 벤드 제어를 연결한다.',
          jointDirectionsKo: [
            '골반 후방경사 및 척추 분절을 통한 고관절 신전 브리지 유지',
            '정점에서 고관절 높이 유지한 채 슬관절 굴곡·신전(니 벤드)',
            '경추 과굴곡 억제(체중은 양측 견갑골과 상부 흉추에 지지)',
          ],
          supportPointsKo: [
            '후두부 및 상부 흉추·양측 견갑골',
            '타워 바를 수직으로 밀어내는 양발 아치/발볼',
          ],
          apparatusInteractionKo:
            '타워 바가 앞뒤로 흔들리지 않도록 둔근과 햄스트링 힘으로 바를 수직 궤도로 제어한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 타워 바를 밀어 브리지로 올라가고, 정점 니 벤드 시 호흡을 일정하게 유지한다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '내쉬는 숨에 양발로 타워 바 높이를 유지하면서 상부 흉추(견갑골 하각)부터 요추·천골 순으로 테이블 매트에 한 마디씩 도장 찍듯 분절 하강하여 시작 자세로 돌아온다.',
          jointDirectionsKo: [
            '상부 흉추부터 천골까지 순차적 척추 분절 굴곡 하강',
            '천골 착지 후 골반 중립 복원',
          ],
          supportPointsKo: [
            '후두부·흉추·요추·천골(테이블 매트)',
            '타워 바 위 양발',
          ],
          apparatusInteractionKo:
            '척추가 내려오는 동안 타워 바가 급격히 내려오거나 튕기지 않게 발의 지지력을 유지한다.',
          breathingKo:
            '길게 내쉬며(Exhale) 척추 마디마디를 늘려 테이블에 내려놓는다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'supine-articulated-bridge',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'ex-bridging-02',
            summaryKo:
              '카탈로그는 "하단 스프링이 걸린 푸시스루 바에 발아치를 걸고... 타워 바에 양발 걸고 브릿지 업/다운"이라고 정의하여 발이 테이블 위 공중의 바에 걸려 있어야 한다.',
          },
          {
            category: 'fact',
            targetId: 'supine-articulated-bridge',
            summaryKo:
              '그러나 공유 2D rig(supine-articulated-bridge)는 매트 브리지와 동일 좌표를 사용하여 양발(ankle y:142, heel y:148)이 테이블 바닥에 놓여 있으며, MovementPhaseDiagramSvg.tsx의 캐딜락 도식에서는 푸시스루 바가 발 쪽(x:244)이 아닌 머리 왼쪽(x:86, y:26~72)에 고정 직선으로 그려진다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'supine-articulated-bridge',
            summaryKo:
              '매트 바닥 지지 브리지 아키타입을 캐딜락 타워 바 브리지(ex-bridging-02)에 그대로 할당하면서 공중 타워 바 발 지지와 바 회전이 완전히 누락되었다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'ex-bridging-02',
            summaryKo:
              '2D rig의 발 위치(바닥 y:148)가 카탈로그의 "타워 바에 양발 걸고"와 불일치(mismatched)하며, 유튜브 참고 링크는 미검증(unverified-link)이고 연속 모션 초안은 미구현 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          '캐딜락 타워 바 브리지(ex-bridging-02) 전용 2D rig를 분리하여 양발(ankle/heel)을 상방 타워 바 높이에 배치하고, 캐딜락 도식의 푸시스루 바가 발 지지점과 연결되도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-chair-seated-pedal-press',
      track: 'track-b-apparatus',
      rankInTrack: 8,
      nameKo: '체어 양발 페달 프레스',
      nameEn: 'Seated Double-Leg Pedal Press',
      apparatus: 'chair',
      bodyPosition: 'seated',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'nhs-bucks-seated-knee-hip-press-pdf',
          title: 'Physiotherapy Seated Knee & Hip Press Alignment Guide',
          publisher: 'Buckinghamshire Healthcare NHS Trust',
          directUrl:
            'https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionApparatusSourceLedger.json(SHA-256 검증 스냅샷) 및 publicReferences.ts에 등록된 시티드 하지 프레스 정렬 자료.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'pilates-anytime-wunda-chair-seated-footwork',
          title: 'Wunda Chair Seated Footwork (Double Leg Pumps)',
          publisher: 'Pilates Anytime Educational Encyclopedia',
          directUrl:
            'https://www.pilatesanytime.com/pilates-exercises/wunda-chair/footwork',
          sourceCategory: 'pilates-curriculum-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹 직접 접속은 제한되었으나, 공개 교육 설명 및 chairPedalPress.ts 모델 문서로 좌골 수직 고정 및 페달 하방 프레스/상방 복귀 역학을 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '운다 체어 시트 위에 양쪽 좌골(Sit-bones)로 균등하게 앉아(Seated) 정수리까지 척추를 수직 중립으로 길게 세운다. 양발을 상단 위치의 페달 위에 나란히 올려 고관절과 무릎을 굴곡한 준비 자세를 취한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립(Axial Elongation) 고정',
            '양측 고관절·슬관절 굴곡 및 상단 페달 위 양발 지지',
            '양손은 시트 양옆을 가볍게 잡거나 골반/가슴 앞에 두어 어깨 하강 유지',
          ],
          supportPointsKo: [
            '체어 시트 위 양측 좌골(Ischial Tuberosities)',
            '페달 위에 올린 양발 뒤꿈치 또는 발볼',
            '필요시 체어 시트 옆모서리를 잡은 양손',
          ],
          apparatusInteractionKo:
            '체어 본체가 바닥에 흔들림 없이 고정되어 있는지 확인하고, 페달 아래에 손이나 발이 들어가지 않게 주의하며 스프링 초기 장력을 지지한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 좌골로 시트를 누르고 정수리를 천장으로 길게 세운다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 상체가 뒤로 기울거나 허리가 무너지지 않게 복부와 척추 기립근으로 수직 기둥을 유지하면서, 양발로 페달을 아래쪽 원호 방향으로 밟아 내려 고관절과 무릎을 신전한다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 하방 신전(Pedal Downward Press)',
            '몸통·골반 수직 중립 완전 고정(골반 후방경사 및 상체 흔들림 억제)',
          ],
          supportPointsKo: [
            '체어 시트 위 양측 좌골',
            '하방 회전한 페달 위 양발 접촉점',
          ],
          apparatusInteractionKo:
            '페달이 스프링 저항을 이기며 회전축을 중심으로 아래쪽으로 내려가고, 바닥에 쾅 닿지 않는 제어 범위까지 프레스한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 복부 코르셋을 조인 채 양발로 페달을 바닥 방향으로 밀어낸다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 스프링이 페달을 밀어 올릴 때 다리가 튕겨 올라오지 않도록 고관절과 무릎 굴곡 속도를 천천히 제어하며 시작 상단 위치로 복귀한다.',
          jointDirectionsKo: [
            '양측 고관절·슬관절 원심성 굴곡으로 페달 상방 복귀',
            '페달이 올라오는 순간 좌골이 시트에서 뜨거나 허리가 말리지 않게 유지',
          ],
          supportPointsKo: ['체어 시트 위 양측 좌골', '페달 위 양발'],
          apparatusInteractionKo:
            '페달 상단 스토퍼 부근까지 스프링 복원 속도를 일정하게 감속 제어한다.',
          breathingKo:
            '조절된 호흡으로 상체 높이를 유지하며 페달을 시작 위치로 천천히 되돌린다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'chair-seated-pedal-footwork',
        targetPatternVariantIds: ['chair-seated-pedal-press'],
        facts: [
          {
            category: 'fact',
            targetId: 'chair-seated-pedal-footwork',
            summaryKo:
              '2D rig(chair-seated-pedal-footwork)에서 발목(ankle y: 136 -> 168)과 뒤꿈치(heel y: 142 -> 174)는 start에서 middle로 갈 때 32px 아래로 내려가며, apparatusState.pedalAngleDeg는 8 -> 36 -> 12로 설정되어 있다.',
          },
          {
            category: 'fact',
            targetId: 'chair-seated-pedal-footwork',
            summaryKo:
              '그러나 MovementPhaseDiagramSvg.tsx(183행)는 pedalTipY = 162 - Math.sin(rad) * 52로 음수 부호(-)를 사용하여, pedalAngleDeg가 8에서 36으로 커질 때 페달 막대가 아래가 아닌 위쪽(y: 154.8 -> 131.4)으로 올라가 버려 middle 단계에서 발(heel y:174)과 페달 끝(y:131.4)이 42.6px이나 분리되는 렌더링 버그가 있다.',
          },
          {
            category: 'fact',
            targetId: 'chair-seated-pedal-press',
            summaryKo:
              '연속 초안(chairPedalPress.ts의 chair-seated-pedal-press)은 페달이 아래로 회전(y: 0.304m -> 0.227m)하며 발뒤꿈치가 페달 바와 함께 내려가도록 올바르게 구현되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'chair-seated-pedal-footwork',
            summaryKo:
              'SVG 좌표계는 아래쪽이 +y 방향인데 MovementPhaseDiagramSvg.tsx에서 수학 평면(+y 위쪽) 공식을 그대로 써서 페달 회전 방향이 상하 반전된 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'chair-seated-pedal-footwork',
            summaryKo:
              '2D SVG 기구 도식(MovementPhaseDiagramSvg.tsx)에서 middle 단계에 발은 내려가고 페달은 위로 올라가는 치명적인 시각적 불일치(42.6px 유격)가 존재한다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          'MovementPhaseDiagramSvg.tsx(case "chair")의 페달 끝 Y좌표 계산 부호 또는 기준 회전축을 수정하여, pedalAngleDeg 증가 시 페달이 발뒤꿈치(heel y: 142 -> 174)를 따라 아래로 내려가도록 일치시킬 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'ex-plank-02',
      track: 'track-b-apparatus',
      rankInTrack: 9,
      nameKo: '운다 체어 파이크(Pike) & 플랭크 풀업',
      nameEn: 'Wunda Chair Pull-Up (Pike) & Scapular Plank',
      apparatus: 'chair',
      bodyPosition: 'standing',
      spinalPlanes: ['flexion', 'neutral'],
      sources: [
        {
          sourceId: 'pilatesology-wunda-chair-pull-up-pike',
          title: 'Wunda Chair Pull-Up (The Pike)',
          publisher: 'Pilatesology Classical Encyclopedia',
          directUrl: 'https://pilatesology.com/blog/pull-up-on-the-wunda-chair/',
          sourceCategory: 'classical-primary-reference',
          accessStatus: 'blocked-by-sandbox-proxy-unverified',
          accessNoteKo:
            '샌드박스 프록시 정책으로 외부 웹 직접 접속은 제한되었으나, 공개 교육 설명 및 카탈로그 큐잉으로 양손 체어 시트 지지·양발 페달 지지·복부 스쿱 파이크 풀업 역학을 확인함.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'cuh-pilates-scapular-core-plank-leaflet-2023',
          title: 'Pilates: exercises and principles (Core Scoop & Scapular Protraction Control)',
          publisher: 'Cambridge University Hospitals NHS Foundation Trust',
          directUrl:
            'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionDraftSourceLedger.json에 등록된 상지 지지 체간 굴곡 및 견갑대 안정화 원칙 자료.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '운다 체어 시트 상판 앞쪽 모서리를 양손으로 짚고 어깨를 손목 수직선 위에 정렬한 뒤, 양발 볼을 아래로 눌린 페달 위에 올려 경사 플랭크(또는 파이크 준비) 자세를 만든다.',
          jointDirectionsKo: [
            '양측 견관절 수직 지지, 주관절 신전 및 전거근 활성',
            '경추·흉추·요추 긴 사선 지지 또는 하복부 스쿱 준비',
            '양측 고관절·슬관절 신전 및 발목 저측굴곡(까치발)으로 페달 지지',
          ],
          supportPointsKo: [
            '체어 시트 상판 모서리를 짚은 양손 손바닥',
            '체어 페달 위에 올린 양발 발볼',
          ],
          apparatusInteractionKo:
            '체어 시트에 체중의 상당 부분을 양손으로 수직 지지하고, 페달 위 양발은 가볍게 얹어 스프링 상승력을 코어로 맞이할 준비를 한다.',
          breathingKo:
            '들쉬며(Inhale) 어깨 아래 손목 정렬과 복부 중심을 세팅한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 양손으로 체어 시트를 아래로 강하게 밀어내며 명치와 아랫배를 천장 쪽으로 깊게 끌어올려(Pike Up), 골반이 어깨 수직선 위 가까이 솟아오르고 페달이 함께 떠오르게 한다.',
          jointDirectionsKo: [
            '흉추·요추 깊은 굴곡(C-Curve Scoop) 및 고관절 굴곡(Pike)',
            '양측 슬관절 신전 유지 및 발뒤꿈치 높게 유지',
            '견갑골 전인·하강 지지로 어깨-손목 수직 축 유지',
          ],
          supportPointsKo: [
            '체어 시트 위 양손 손바닥',
            '상승한 페달 위 양발 발볼',
          ],
          apparatusInteractionKo:
            '다리 힘으로 페달을 차는 것이 아니라 복부 굴곡으로 골반을 들어 올림에 따라 스프링이 페달을 위로 들어 올린다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 아랫배를 천장으로 끌어올려 파이크 정점을 만든다.',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬는 숨에 어깨가 손목 앞으로 무너지거나 페달이 바닥에 쿵 떨어지지 않도록 코어 브레이크를 유지하며 골반과 페달을 천천히 시작 높이로 컨트롤 하강한다.',
          jointDirectionsKo: [
            '고관절·척추 굴곡에서 시작 사선 플랭크 방향으로 원심성 하강',
            '전 구간 주관절 신전 및 견갑대 지지 유지',
          ],
          supportPointsKo: ['체어 시트 위 양손', '하강 제어 중인 페달 위 양발'],
          apparatusInteractionKo:
            '스프링 저항을 이기며 페달을 천천히 눌러 내리되 바닥에 부딪치지 않게 끝 범위를 제어한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 코어 텐션을 유지한 채 페달을 천천히 내려놓는다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'chair-plank-pike-isolated',
        targetPatternVariantIds: [],
        facts: [
          {
            category: 'fact',
            targetId: 'chair-plank-pike-isolated',
            summaryKo:
              'MovementPhaseDiagramSvg.tsx(case "chair")에서 체어 시트 상판은 x: 104~152, y: 122이고 페달 끝은 x: 약 198~204, y: 131~155에 그려진다.',
          },
          {
            category: 'fact',
            targetId: 'chair-plank-pike-isolated',
            summaryKo:
              '그러나 공유 2D rig(plank-long-stretch-chair-pike)는 손목(wrist: 96,144)이 시트 상판(y:122)보다 22px 아래 허공에 있고, 발목(ankle: 280,150 -> 242,148)은 페달 끝(x: 약 200)보다 오른쪽으로 40~80px 떨어진 바닥 허공에서 수평 이동한다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'chair-plank-pike-isolated',
            summaryKo:
              '매트/리포머 플랭크용 넓은 수평 좌표(x: 88~280)를 폭이 좁은 운다 체어(시트 x:104~152, 페달 x:152~204) 위에 스케일 조정 없이 겹쳐 그리면서 손과 발 모두 기구에서 이탈한 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'ex-plank-02',
            summaryKo:
              '2D 도해에서 손이 체어 시트 위에 있지 않고 발도 페달 위에 있지 않아 기구 접촉점이 불일치(mismatched)하며, 유튜브 참고 링크는 미검증(unverified-link)이고 연속 모션 초안은 미구현 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          '운다 체어 파이크(ex-plank-02) 전용 2D rig를 분리하여 손(hand/wrist)을 체어 시트 상판(x: 118~136, y: 122)에 고정하고, 발(ankle/toe)이 페달 끝(x: 196~204) 위에서 상하 원호로 움직이도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
    {
      exerciseId: 'original-barrel-standing-hip-extension',
      track: 'track-b-apparatus',
      rankInTrack: 10,
      nameKo: '래더 지지 힙 익스텐션',
      nameEn: 'Ladder Supported Hip Extension',
      apparatus: 'barrel',
      bodyPosition: 'standing',
      spinalPlanes: ['neutral'],
      sources: [
        {
          sourceId: 'nhs-inform-standing-hip-extension-exercise',
          title: 'Exercises for Hip Problems — Standing Hip Extension with Support',
          publisher: 'NHS inform (Scottish National Health Information Service)',
          directUrl:
            'https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/',
          sourceCategory: 'public-health-institution',
          accessStatus: 'verified-in-repo-source-ledger',
          accessNoteKo:
            '저장소 내 motionApparatusSourceLedger.json(SHA-256 검증 스냅샷) 및 verifiedReferences.ts에 등록된 고정 지지 입위 고관절 신전 공공 의료 가이드.',
          rightsPolicy: 'link-only-no-download',
        },
        {
          sourceId: 'ruh-nhs-standing-glute-hip-extension-pdf',
          title: 'Hip Rehabilitation: Standing Hip Extension Holding Stable Support',
          publisher: 'Royal United Hospitals Bath NHS Foundation Trust',
          directUrl:
            'https://www.ruh.nhs.uk/patients/patient_information/PHY091_Gluteal_Tendinopathy.pdf',
          sourceCategory: 'nhs-hospital-leaflet',
          accessStatus: 'verified-via-public-search-snippet',
          accessNoteKo:
            '공개 웹 검색 스니펫으로 고정된 지지대를 잡고 허리가 꺾이지 않는 작은 범위로 다리를 뒤로 뻗었다 돌아오는 입위 둔근·고관절 신전 원리 확인.',
          rightsPolicy: 'link-only-no-download',
        },
      ],
      phases: {
        start: {
          phaseId: 'start',
          postureAndTransitionKo:
            '래더 바렐의 고정된 래더(사다리) 바깥쪽 바닥에 두 발을 골반 너비로 두고 똑바로 서서(Standing), 양손으로 래더 상단 가로대(Rung)를 가볍게 잡아 상체와 골반 중립을 세팅한다.',
          jointDirectionsKo: [
            '경추·흉추·요추 및 골반 수직 중립 정렬',
            '양손으로 래더 가로대 지지 및 견갑대 하강',
            '양측 고관절·슬관절 중립 입위 정렬(지지 다리 무릎 잠금 방지)',
          ],
          supportPointsKo: [
            '바닥에 디딘 양발 발바닥(이후 지지 측 발바닥으로 체중 이동)',
            '래더 상단 가로대를 잡은 양손',
          ],
          apparatusInteractionKo:
            '래더에 올라서지 않고 바닥의 미끄러짐과 래더 바렐 기구 고정 상태를 확인한 뒤 가로대를 균형 보조 지지점으로 사용한다.',
          breathingKo:
            '코로 들쉬며(Inhale) 정수리를 세우고 복부를 가볍게 당겨 요추 중립을 준비한다.',
        },
        middle: {
          phaseId: 'middle',
          postureAndTransitionKo:
            '내쉬는 숨에 상체가 앞으로 쏟아지거나 허리가 과신전(꺾임)되지 않도록 복부 지지를 유지하면서, 한쪽 발을 뒤쪽으로 짧게 미끄러뜨리거나 살짝 들어 올려 고관절을 신전한다.',
          jointDirectionsKo: [
            '가동 측 고관절 순수 신전(Hip Extension) 및 슬관절 신전 유지',
            '지지 측 고관절·슬관절·발목 수직 정렬 및 중둔근 골반 수평 지지',
            '요추 전만 증가(허리 젖힘) 및 골반 전방경사 억제',
          ],
          supportPointsKo: [
            '바닥에 단단히 뿌리내린 지지 측 발바닥 전체',
            '래더 가로대를 잡은 양손',
            '슬라이드 변형 시 가동 측 발끝 바닥 접촉',
          ],
          apparatusInteractionKo:
            '래더 가로대를 과도하게 잡아당기지 않고 가볍게 지지하여 몸통이 바렐 반대쪽(래더 뒤쪽 공간)에서 수직을 유지하게 한다.',
          breathingKo:
            '입으로 내쉬며(Exhale) 둔근 힘으로 다리를 뒤로 짧게 뻗고, 정점에서 짧게 들쉰다(Inhale).',
        },
        end: {
          phaseId: 'end',
          postureAndTransitionKo:
            '들쉬거나 내쉬는 조절 호흡으로 골반 높이를 유지한 채 뒤로 뻗었던 다리를 천천히 당겨 지지 발 옆 시작 위치로 내려놓는다.',
          jointDirectionsKo: [
            '가동 측 고관절 원심성 굴곡 복귀',
            '양발 나란히 착지 및 척추·골반 중립 유지',
          ],
          supportPointsKo: ['바닥 위 양발 발바닥', '래더 가로대 위 양손'],
          apparatusInteractionKo:
            '래더 가로대 지지를 유지하며 흔들림 없이 양발 입위 정렬로 돌아온다.',
          breathingKo:
            '조절된 호흡과 함께 다리를 모으고 반대쪽 반복을 준비한다.',
        },
      },
      discrepancyAudit: {
        targetVisualAssetId: 'barrel-standing-hip-extension-isolated',
        targetPatternVariantIds: ['ladder-supported-hip-extension-slide'],
        facts: [
          {
            category: 'fact',
            targetId: 'barrel-standing-hip-extension-isolated',
            summaryKo:
              '2D rig(standing-scooter-lunge-splits)는 리포머 스쿠터·런지·바렐 스탠딩 13개 동작에 공유되며, MovementPhaseDiagramSvg.tsx(case "barrel")에서 래더는 왼쪽(x: 58~82), 바렐 돔은 오른쪽(x: 122~246, y: 92~166)에 그려진다.',
          },
          {
            category: 'fact',
            targetId: 'barrel-standing-hip-extension-isolated',
            summaryKo:
              '그 결과 2D rig의 서 있는 인체(pelvis x:152, 지지발 farAnkle x:124, 가동발 ankle x: 214 -> 278)가 래더 바깥이 아니라 바렐 돔 내부(x: 122~246)를 관통하여 서 있는 기구 충돌 오류가 발생한다.',
          },
          {
            category: 'fact',
            targetId: 'ladder-supported-hip-extension-slide',
            summaryKo:
              '연속 초안(standingSupportDrafts.ts의 ladder-supported-hip-extension-slide)은 인체를 래더 뒤쪽(HIP_Z = -0.78, 손 HAND_Z = -0.56)에 배치해 바렐 돔과 겹치지 않으나, 일반 고정 지지 운동을 래더바렐로 바꾼 저작 적응(authored adaptation)으로 명시되어 있다.',
          },
        ],
        inferences: [
          {
            category: 'inference',
            targetId: 'barrel-standing-hip-extension-isolated',
            summaryKo:
              '리포머 스쿠터용 2D 좌표를 바렐 도식 위에 오프셋 조정 없이 그대로 렌더링하면서 인체가 바렐 몸통 한가운데를 뚫고 서 있는 시각적 오류가 발생한 것이다.',
          },
        ],
        unverifiedOrMismatched: [
          {
            category: 'unverified',
            targetId: 'barrel-standing-hip-extension-isolated',
            summaryKo:
              '2D rig에서 인체가 바렐 곡면 내부(x: 124~278)에 겹쳐 그려지는 배치 불일치(mismatched)가 있으며, 연속 초안 또한 고전 래더바렐 정식 매뉴얼 검증이 아닌 일반 지지 운동의 저작 적응 상태이다.',
          },
        ],
        diagramTeamRecommendationsKo: [
          '래더 지지 스탠딩 동작(original-barrel-standing-*) 전용 2D rig를 분리하거나, 바렐 도식 대비 인체 x좌표를 래더 왼쪽( 또는 래더를 오른쪽에 배치)으로 이동시켜 인체가 바렐 돔과 겹치지 않고 손(hand)이 래더 가로대(x: 58~82)를 잡도록 수정할 것.',
        ],
      },
      truthfulnessFlags: HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
    },
  ] as const;
