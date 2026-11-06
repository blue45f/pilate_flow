import type {
  ClassCueSheetProjection,
  CueSheetFixtureEntry,
  CueSheetFlexibleClassInput,
  CueSheetNestedBlockInput,
  CueSheetSourceInput,
} from './classCueSheetTypes';
import { buildClassCueSheetProjection } from './classCueSheetProjection';

export type CueSheetFixtureId = CueSheetFixtureEntry['fixtureId'];

function createStandardMixedInput(): CueSheetFlexibleClassInput {
  return {
    id: 'fixture-standard-mixed-50',
    title: '리포머·캐딜락·매트 Lv 1.5 전신 정렬 & 코어 플로우 50분',
    subtitle: '호흡 예열부터 하지 정렬, 단측성 중둔근 컨트롤, 쿨다운까지 이어지는 표준 수업 큐시트',
    apparatus: 'mixed',
    level: '1.5',
    targetMinutes: 50,
    humanDrafts: [
      {
        id: 'draft-rib-glide-01',
        sourceOrigin: 'human-created',
        completenessStage: 'practiced-recorded',
        revision: 2,
        ideaLine: '사이드 라잉에서 폼롤러 위 상부 흉추 회전과 호흡 연결',
        workingNameKo: '사이드 라잉 흉추 글라이드 오픈',
        apparatus: 'mat',
        props: ['foam-roller'],
        blockCategory: 'warmup',
        sectionRole: 'preparation',
        level: '1.0',
        defaultDurationMin: 4,
        defaultRepetitions: 6,
        defaultSets: 2,
        isUnilateral: true,
        sideMode: 'left-then-right',
        springs: 'Bodyweight',
        breathPattern: '들쉬며 윗팔 천장 오픈 → 내쉬며 갈비뼈부터 제자리 복귀',
        cues: [
          '무릎 사이에 미니 쿠션이나 폼롤러를 두고 골반이 뒤로 넘어가지 않게 고정합니다.',
          '시선이 손끝을 따라가며 경추가 아닌 흉추에서 회전이 일어나도록 유도하세요.',
        ],
        precautions: '어깨 전면 집힘이 느껴지면 팔 각도를 낮춰 진행합니다.',
        feelLogs: [],
        modificationLogs: [],
        photoReferences: [],
        revisionHistory: [],
        safetyBoundary: {
          originType: 'instructor-created-draft',
          evaluationBasis: 'subjective-instructor-feel',
          aiSafetyGuaranteed: false,
          objectiveEfficacyClaimed: false,
          expertVerified: false,
          disclaimerKo: '강사 주관적 초안 기록입니다.',
        },
        createdAt: '2026-11-01T09:00:00.000Z',
        updatedAt: '2026-11-02T09:00:00.000Z',
      },
    ],
    steps: [
      {
        stepId: 'std-step-1',
        order: 1,
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        blockCategory: 'warmup',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 30,
        transitionSec: 15,
        repetitions: 8,
        sets: 2,
        sideMode: 'together',
        selectedLayer: 'standard',
        instructorNote: '오프닝 호흡 세팅 · 갈비뼈 측면 확장에 손바닥 피드백 제공',
      },
      {
        stepId: 'std-step-2',
        order: 2,
        kind: 'exercise',
        exerciseId: 'draft-rib-glide-01',
        humanDraftId: 'draft-rib-glide-01',
        humanDraftRevision: 2,
        blockCategory: 'warmup',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        transitionSec: 20,
        repetitions: 6,
        sets: 2,
        sideMode: 'left-then-right',
        selectedLayer: 'standard',
        instructorNote: '좌측 흉추 먼저 연 뒤 우측 비교 확인',
      },
      {
        stepId: 'std-step-3',
        order: 3,
        kind: 'exercise',
        exerciseId: 'ex-footwork-01',
        blockCategory: 'footwork',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 30,
        transitionSec: 30,
        repetitions: 10,
        sets: 3,
        sideMode: 'together',
        selectedLayer: 'standard',
        customSpringOverride: '2R 1B',
        instructorNote: '패럴렐 → 필라테스 V → 와이드 세컨드 순서로 발 위치 안내',
      },
      {
        stepId: 'std-step-4',
        order: 4,
        kind: 'rest',
        exerciseId: '',
        blockCategory: 'core',
        durationMin: 2,
        selectedLayer: 'standard',
        instructorNote: '수분 섭취 및 리포머 스프링 1R 전환 안내',
      },
      {
        stepId: 'std-step-5',
        order: 5,
        kind: 'exercise',
        exerciseId: 'ex-lower-01',
        blockCategory: 'lower-body',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 30,
        transitionSec: 30,
        repetitions: 10,
        sets: 2,
        sideMode: 'left-then-right',
        selectedLayer: 'standard',
        customSpringOverride: '1R',
        instructorNote: '지지하는 쪽 고관절 외회전 유지 및 무릎 흔들림 체크',
      },
      {
        stepId: 'std-step-6',
        order: 6,
        kind: 'exercise',
        exerciseId: 'ex-cooldown-01',
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        durationMin: 5,
        explanationSec: 15,
        transitionSec: 15,
        repetitions: 4,
        sets: 1,
        sideMode: 'left-then-right',
        selectedLayer: 'easy',
        customSpringOverride: '1B',
        instructorNote: '양쪽 좌골이 캐리지에 무겁게 내려앉도록 유도하며 마무리',
      },
    ],
  };
}

function createEmptyClassInput(): CueSheetFlexibleClassInput {
  return {
    id: 'fixture-empty-class',
    title: '빈 수업 초안 · 동작 미등록 상태',
    subtitle: '아직 수업 동작이 추가되지 않은 초기 빈 시퀀스',
    apparatus: 'reformer',
    level: '1.0',
    targetMinutes: 50,
    steps: [],
  };
}

function createNameOnlyDraftsInput(): CueSheetFlexibleClassInput {
  return {
    id: 'fixture-name-only-drafts',
    title: '강사 자유 메모 · 이름만 적은 즉흥 수업 플로우',
    subtitle: '카탈로그 매칭이나 기구·분류 강제 없이 동작 이름과 한 줄 메모만으로 구성된 큐시트',
    steps: [
      {
        stepId: 'name-only-1',
        workingNameKo: '갈비뼈 호흡 깨우기 & 견갑골 프로트랙션',
        instructorNote: '수업 시작 전 매트 위에서 흉곽 360도 확장 감각만 가볍게 체크',
      },
      {
        stepId: 'name-only-2',
        nameKo: '풋바 밀며 골반 중립 찾기 (변형 초안)',
        cues: ['발뒤꿈치로 풋바를 지그시 누르며 골반이 말리지 않는 범위까지만 이동합니다.'],
        repetitions: 8,
      },
      {
        stepId: 'name-only-3',
        ideaLine: '사이드 스탠딩 슬라이더 내전근 끌어당기기',
        sideMode: 'right-then-left',
        sets: 2,
        repetitions: 10,
      },
      {
        stepId: 'name-only-4',
        title: '마무리 스탠딩 롤다운 & 목 긴장 풀기',
        durationMin: 3,
        instructorNote: '정수리부터 척추 마디마디 순서대로 내려갔다가 복부 힘으로 롤업',
      },
    ],
  };
}

function createLongKoreanCuesEmptyCuesDuplicatesInput(): CueSheetFlexibleClassInput {
  return {
    id: 'fixture-long-empty-duplicates',
    title:
      '한국어 장문 큐잉 · 빈 큐잉 · 동일 동작명/중복 StepID 반복 검증용 50분 집중 시퀀스',
    subtitle:
      '매우 긴 한국어 해부학 정렬 큐잉 문구와 큐잉이 전혀 없는 빈 메모 항목, 그리고 동일 이름의 동작이 여러 번 등장하는 경우를 모두 검증합니다.',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 50,
    steps: [
      {
        stepId: 'dup-step-01',
        order: 1,
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        durationMin: 4,
        sideMode: 'together',
        cues: [
          '[장문큐-시작-01] 양쪽 갈비뼈 하단(10번~12번 늑골)이 매트에서 들뜨지 않도록 등 뒤쪽 공간을 넓게 채우며 코로 깊게 들이마시고, 입술 사이로 가늘고 길게 내쉬면서 양쪽 좌골과 치골이 이루는 삼각형 수평면을 끝까지 유지해 주세요.',
          '목 앞쪽 흉쇄유돌근이나 상부 승모근에 불필요한 긴장이 올라오지 않도록 턱 끝을 가볍게 당기고 시선은 천장 수직 위를 바라보며 경추의 자연스러운 C-커브를 지켜냅니다.',
          '골반 시계(Pelvic Clock) 12시와 6시 방향 미세 움직임을 진행할 때 대둔근을 과도하게 조이지 말고, 복횡근과 골반저근의 부드러운 연결로 천골의 무게 중심만 매트 위에서 굴려줍니다.',
          '양발 뒤꿈치와 엄지발가락 볼, 새끼발가락 볼의 삼각 지지점을 리포머 풋바 또는 매트 바닥에 균등하게 내려놓고 무릎이 안쪽이나 바깥쪽으로 흔들리지 않도록 고관절-무릎-두 번째 발가락 정렬선을 계속 확인합니다. [장문큐-끝-01]',
        ],
        instructorNote:
          '첫 번째 웜업 세팅 구간: 호흡이 짧은 경우 카운트를 4초 들숨 - 6초 날숨으로 천천히 리드하고 흉곽 닫힘 타이밍을 손끝으로 가볍게 터치해 안내합니다. 긴 문단이 인쇄 페이지 경계를 넘어갈 때도 문장 잘림 없이 이어져야 합니다.',
      },
      {
        stepId: 'dup-step-01',
        order: 2,
        kind: 'exercise',
        nameKo: '무큐잉 자유 스트레칭 동작',
        durationMin: 3,
        cues: [],
        instructorNote: '',
      },
      {
        stepId: 'step-mid-3',
        order: 3,
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        durationMin: 5,
        sideMode: 'together',
        selectedLayer: 'hard',
        cues: [
          '[장문큐-시작-03] 중간 리셋 구간: 테이블탑 포지션에서 고관절 90도와 무릎 90도를 유지하며 골반 흔들림 없이 호흡과 코어 복강 내압을 재확인합니다.',
          '한 다리씩 매트 쪽으로 토 탭(Toe Tap)을 내려갈 때 허리가 아치형으로 들리지 않도록 전면 갈비뼈와 장골능 사이의 거리를 일정하게 유지하고, 돌아올 때는 대퇴직근 대신 하복부 심부 근육의 조절력을 사용하도록 큐잉합니다. [장문큐-끝-03]',
        ],
        instructorNote: '두 번째 등장하는 동일 동작 (심화 레이어 적용 · 복부 컨트롤 집중)',
      },
      {
        stepId: 'step-mid-4',
        order: 4,
        kind: 'exercise',
        nameKo: '사이드 킥 시리즈',
        durationMin: 6,
        sideMode: 'left-then-right',
        cues: [],
        instructorNote: '',
      },
      {
        stepId: 'step-end-5',
        order: 5,
        kind: 'exercise',
        nameKo: '사이드 킥 시리즈',
        durationMin: 4,
        sideMode: 'right-then-left',
        cues: [
          '[장문큐-시작-05] 두 번째 사이드 킥 시리즈: 반대쪽(오른쪽)부터 시작해 몸통이 흔들리지 않는 가동범위 안에서 전방 2회 펄스 후 후방 신전으로 고관절 굴곡근을 길게 늘려줍니다.',
          '아래쪽 옆구리(요방형근과 내·외복사근)가 매트 바닥으로 무너지지 않도록 작은 개미집 공간을 유지하고, 위쪽 다리를 원형(레그 서클)으로 8회씩 회전할 때 골반 상단 장골능이 앞뒤로 회전하지 않게 고정합니다. [장문큐-끝-05]',
        ],
        instructorNote: '둔근 피로도 확인 후 가동범위 조절 및 좌우 편차 구두 피드백 제공',
      },
      {
        stepId: 'step-end-6',
        order: 6,
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        durationMin: 3,
        sideMode: 'together',
        selectedLayer: 'easy',
        cues: [
          '[장문큐-시작-06] 마무리 호흡 정리: 수업 시작 첫 동작과 비교해 골반 주변과 흉추 하부의 긴장이 얼마나 부드러워졌는지 스스로 인지하도록 천천히 안내합니다.',
          '마지막 세 번의 호흡 동안 어깨와 귀 사이의 거리를 멀게 두고, 턱과 미간, 손끝의 잔여 긴장을 모두 내려놓으며 수업을 마무리합니다. [장문큐-끝-06]',
        ],
        instructorNote: '세 번째 등장하는 동일 동작 (마무리 이완 · 최종 정렬 체크)',
      },
    ],
  };
}

function buildDeepNestedBlockChain(depth: number, maxDepth: number): CueSheetNestedBlockInput {
  if (depth >= maxDepth) {
    return {
      id: `deep-block-${depth}`,
      title: `심층 블록 L${depth}`,
      repetitions: 1,
      items: [
        {
          stepId: `deep-leaf-step-${depth}`,
          nameKo: `심층 중첩 코어 컨트롤 L${depth}`,
          durationMin: undefined,
          sideMode: 'left-then-right',
          sets: 2,
          repetitions: 6,
          cues: ['중첩 깊이 상한 테스트용 리프 동작입니다.'],
        },
      ],
    };
  }
  return {
    id: `deep-block-${depth}`,
    title: `심층 블록 L${depth}`,
    repetitions: 1,
    children: [buildDeepNestedBlockChain(depth + 1, maxDepth)],
  };
}

function createNestedRepeatsUnilateralUnspecifiedTimeInput(): CueSheetFlexibleClassInput {
  return {
    id: 'fixture-nested-unilateral-unspecified',
    title: '중첩 블록 반복 · 좌우 편측 · 시간 미정 보존 시퀀스',
    subtitle:
      '블록 반복과 세트·좌우 전개, 그리고 시간이 미정인 동작을 임의 추정 없이 그대로 보존하는지 검증합니다.',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 45,
    blocks: [
      {
        id: 'blk-unilateral-circuit',
        title: '하체·둔근 편측 서킷 블록',
        sectionRole: 'main',
        blockCategory: 'lower-body',
        repetitions: 2,
        items: [
          {
            stepId: 'uni-step-ltr',
            exerciseId: 'ex-lower-01',
            durationMin: 6,
            sets: 2,
            repetitions: 8,
            sideMode: 'left-then-right',
            instructorNote: '왼쪽 먼저 8회 수행 후 오른쪽 8회 연결',
          },
          {
            stepId: 'uni-step-rtl-unspecified',
            nameKo: '리포머 스탠딩 런지 펄스 (시간 미정)',
            durationMin: undefined,
            sets: 2,
            repetitions: 10,
            sideMode: 'right-then-left',
            apparatus: 'reformer',
            springs: '1R',
            cues: ['오른쪽 먼저 지지하고 골반 정면 정렬을 유지한 채 수직 하강합니다.'],
          },
          {
            stepId: 'uni-step-left-only',
            nameKo: '사이드 스플릿 좌측 집중 홀드',
            durationMin: null,
            sets: 1,
            repetitions: 5,
            sideMode: 'left',
            apparatus: 'reformer',
            springs: '1B',
            cues: ['왼쪽 내전근과 중둔근의 등척성 수축을 5초간 유지합니다.'],
          },
          {
            stepId: 'uni-step-right-only',
            nameKo: '사이드 스플릿 우측 집중 홀드',
            durationMin: null,
            sets: 1,
            repetitions: 5,
            sideMode: 'right',
            apparatus: 'reformer',
            springs: '1B',
            cues: ['오른쪽 내전근과 중둔근의 등척성 수축을 5초간 유지합니다.'],
          },
        ],
        children: [
          {
            id: 'blk-sub-excess-repeat',
            title: '코어 피니셔 과다 반복 서브블록',
            repetitions: 20, // Exceeds DEFAULT_MAX_REPEAT_PER_BLOCK (12) -> capped at 12
            items: [
              {
                stepId: 'uni-step-together',
                exerciseId: 'ex-core-01',
                durationMin: 4,
                sets: 1,
                repetitions: 10,
                sideMode: 'together',
                instructorNote: '양쪽 함께 헌드레드 펌핑 마무리',
              },
            ],
          },
        ],
      },
      // Deep nested chain (depth 8 > DEFAULT_MAX_NESTING_DEPTH 6)
      buildDeepNestedBlockChain(1, 8),
    ],
  };
}

function createHundredItemsBoundedInput(): CueSheetFlexibleClassInput {
  const steps = Array.from({ length: 160 }, (_, idx) => {
    const num = idx + 1;
    const isUnilateral = num % 2 === 0;
    const hasDuration = num % 5 !== 0;
    return {
      stepId: `hundred-step-${String(num).padStart(3, '0')}`,
      order: num,
      kind: 'exercise' as const,
      nameKo: `대규모 내구성 검증 동작 #${String(num).padStart(3, '0')}`,
      apparatus: (num % 3 === 0 ? 'cadillac' : 'reformer') as 'cadillac' | 'reformer',
      blockCategory: (num <= 20 ? 'warmup' : num >= 145 ? 'cooldown' : 'core') as
        | 'warmup'
        | 'core'
        | 'cooldown',
      durationMin: hasDuration ? 1 : undefined,
      sets: 2,
      repetitions: 8,
      sideMode: isUnilateral ? ('left-then-right' as const) : ('together' as const),
      springs: '1R 1B',
      cues: [`${num}번 동작 호흡과 척추 중립 정렬을 유지하며 일정한 템포로 수행합니다.`],
    };
  });

  return {
    id: 'fixture-hundred-items-bounded',
    title: '100개 이상 대규모 항목 & 유한 전개 제한(Truncation) 검증 시퀀스',
    subtitle:
      '160개 입력 항목과 다중 세트·좌우 전개가 상한(150개 항목 / 240개 전개 행) 내에서 안전하게 제한되고 생략 사유가 명시되는지 검증합니다.',
    apparatus: 'mixed',
    level: '2.0',
    targetMinutes: 60,
    steps,
  };
}

function createCorruptedCircularSensitiveHtmlInput(): CueSheetSourceInput {
  const cyclicBlockA: Record<string, unknown> = {
    id: 'cyclic-block-a',
    title: '순환 참조 블록 A <script>alert("blockA")</script>',
    repetitions: 2,
    items: [
      {
        stepId: 'safe-step-in-cyclic-a',
        nameKo: '순환 블록 내부 리포머 브릿징 <b>안전 복구</b>',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        durationMin: 4,
        sideMode: 'together',
        springs: '2R',
        cues: [
          '골반 분절 시 <img src=x onerror=alert(1)> 태그가 그대로 노출되지 않아야 합니다.',
        ],
        instructorNote:
          '회원명: 김필라 (연락처 010-1234-5678, kim@pilates.kr, 주민번호 920304-2345678) 진단명: 요추 추간판 탈출증 주의 · javascript:alert(99)',
        healthNotes: '절대 노출 금지 건강 메모: 허리 디스크 시술',
        participantName: '김필라',
        memberId: 'mem-999',
      },
    ],
  };

  const cyclicBlockB: Record<string, unknown> = {
    id: 'cyclic-block-b',
    title: '순환 참조 블록 B <svg onload=alert(2)>',
    repetitions: 1,
    children: [cyclicBlockA],
  };

  // Introduce cycle: Block A -> Block B -> Block A
  cyclicBlockA.children = [cyclicBlockB];

  const rootObj: Record<string, unknown> = {
    id: 'fixture-corrupted-circular-sensitive-html',
    title: '손상·순환참조·민감정보·<script>alert("xss")</script> 방어 큐시트',
    subtitle: '<iframe>외부스크립트</iframe> 및 회원/건강 민감 필드 차단 검증',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 50,
    // Sensitive top-level fields that MUST be stripped by allowlist
    participantName: '홍길동',
    participantAlias: '길동님',
    memberName: '이영희',
    groupName: '화목 오후 프라이빗 케어반',
    groupId: 'grp-private-secret',
    phone: '010-5555-7777',
    email: 'private@member.com',
    birthDate: '1988-05-12',
    age: 38,
    gender: 'F',
    address: '서울시 강남구 테헤란로',
    medicalHistory: '경추 5-6번 추간판 팽윤 및 우측 회전근개 부분 파열',
    diagnosis: '경추 디스크',
    injury: '오른쪽 발목 염좌',
    painNotes: '굴곡 시 허리 통증 NRS 4',
    painLevel: 4,
    pregnancy: '임신 16주차',
    medication: '소염진통제 복용 중',
    contraindications: '과도한 경추 굴곡 금지',
    instructorObservations: ['anterior-pelvic-tilt'],
    personalConstraint: { avoidSpinalPlanes: ['flexion'] },
    feelLogs: [{ id: 'f-1', feelNoteKo: '비공개 체감 로그' }],
    photoReferences: [{ id: 'p-1', localRefUri: 'file:///secret/photo.jpg' }],
    steps: [
      null,
      12345,
      {},
      {
        stepId: 'html-step-1',
        exerciseId: 'ex-warmup-01',
        durationMin: 4,
        cues: [
          '<script>window.steal()</script>호흡과 함께 갈비뼈를 부드럽게 닫아줍니다.',
          '<style>body{display:none}</style>어깨 긴장을 낮추고 경추 정렬을 유지합니다.',
        ],
        instructorNote: '참가자: 최수진, 연락처: 010-3333-4444, 병력: 무릎 연골연화증',
      },
      cyclicBlockA,
    ],
  };

  // Also add a direct self-reference on the root object
  rootObj.selfReference = rootObj;

  return rootObj;
}

export function createSyntheticCueSheetInputs(): Record<CueSheetFixtureId, CueSheetSourceInput> {
  return {
    'standard-mixed': createStandardMixedInput(),
    'empty-class': createEmptyClassInput(),
    'name-only-drafts': createNameOnlyDraftsInput(),
    'long-korean-cues-empty-cues-duplicates': createLongKoreanCuesEmptyCuesDuplicatesInput(),
    'nested-repeats-unilateral-unspecified-time':
      createNestedRepeatsUnilateralUnspecifiedTimeInput(),
    'hundred-items-bounded': createHundredItemsBoundedInput(),
    'corrupted-circular-sensitive-html': createCorruptedCircularSensitiveHtmlInput(),
  };
}

export const CLASS_CUE_SHEET_FIXTURES: readonly CueSheetFixtureEntry[] = Object.freeze([
  {
    fixtureId: 'standard-mixed',
    labelKo: '표준 50분 복합 기구 수업',
    descriptionKo:
      '리포머·캐딜락·매트 카탈로그 동작, 강사 초안(Draft), 휴식 구간이 조화롭게 구성된 기본 수업 큐시트입니다.',
    buildProjection: () => buildClassCueSheetProjection(createStandardMixedInput()),
  },
  {
    fixtureId: 'empty-class',
    labelKo: '빈 수업 (동작 0개)',
    descriptionKo:
      '동작 항목이 아직 등록되지 않은 빈 수업 입력을 오류 없이 안전하게 안내하는 상태입니다.',
    buildProjection: () => buildClassCueSheetProjection(createEmptyClassInput()),
  },
  {
    fixtureId: 'name-only-drafts',
    labelKo: '이름만 있는 강사 메모 수업',
    descriptionKo:
      '카탈로그 매칭이나 기구·분류·시간 강제 추정 없이 강사가 적은 동작 이름과 메모만 그대로 보존합니다.',
    buildProjection: () => buildClassCueSheetProjection(createNameOnlyDraftsInput()),
  },
  {
    fixtureId: 'long-korean-cues-empty-cues-duplicates',
    labelKo: '장문 한글 큐잉 · 빈 큐잉 · 중복 동작명',
    descriptionKo:
      '긴 한국어 해부학 큐잉, 큐잉이 비어 있는 항목, 동일 이름 및 중복 stepId 구분 표기를 확인합니다.',
    buildProjection: () =>
      buildClassCueSheetProjection(createLongKoreanCuesEmptyCuesDuplicatesInput()),
  },
  {
    fixtureId: 'nested-repeats-unilateral-unspecified-time',
    labelKo: '중첩 블록 반복 · 좌우 편측 · 시간 미정',
    descriptionKo:
      '중첩 블록 반복, 좌·우 편측 전개, 그리고 시간 미정 항목의 비추정(Explicit Unspecified) 보존을 확인합니다.',
    buildProjection: () =>
      buildClassCueSheetProjection(createNestedRepeatsUnilateralUnspecifiedTimeInput()),
  },
  {
    fixtureId: 'hundred-items-bounded',
    labelKo: '100+ 대규모 항목 · 유한 전개 상한',
    descriptionKo:
      '160개 대규모 항목과 다중 세트·좌우 전개가 상한(150개 항목 / 240행) 내에서 안전하게 제한되고 생략 사유가 표시됩니다.',
    buildProjection: () => buildClassCueSheetProjection(createHundredItemsBoundedInput()),
  },
  {
    fixtureId: 'corrupted-circular-sensitive-html',
    labelKo: '손상·순환참조 · 민감정보 차단 · HTML 이스케이프',
    descriptionKo:
      '자기/순환 참조 객체, 손상된 항목, 회원·건강 민감 정보 차단, <script> 등 HTML 태그 무해화를 검증합니다.',
    buildProjection: () =>
      buildClassCueSheetProjection(createCorruptedCircularSensitiveHtmlInput()),
  },
]);

export function getCueSheetFixtureById(fixtureId: CueSheetFixtureId): CueSheetFixtureEntry {
  const found = CLASS_CUE_SHEET_FIXTURES.find((entry) => entry.fixtureId === fixtureId);
  return found ?? CLASS_CUE_SHEET_FIXTURES[0];
}

export function buildDefaultCueSheetProjection(): ClassCueSheetProjection {
  return CLASS_CUE_SHEET_FIXTURES[0].buildProjection();
}
