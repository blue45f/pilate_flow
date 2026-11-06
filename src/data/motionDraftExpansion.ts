import tensionLedger from "./motionTensionSourceLedger.json";
import standingLedger from "./motionStandingSourceLedger.json";
import { TENSION_PHASES } from "../models/tensionDrafts";
import { STANDING_SUPPORT_PHASES } from "../models/standingSupportDrafts";
import type { MotionDraftDefinition, MotionDraftSource } from "./motionDrafts";

function tensionSources(id: string): readonly MotionDraftSource[] {
  const proposal = tensionLedger.proposals.find(
    (item) => item.proposalId === id,
  );
  if (!proposal) throw new Error(`Missing tension proposal: ${id}`);
  return [...proposal.instructionSourceIds, ...proposal.contextSourceIds].map(
    (sourceId) => {
      const source = tensionLedger.sources.find(
        (item) => item.sourceId === sourceId,
      );
      if (!source?.sourceChecked || !source.factualRecordSha256)
        throw new Error(`Missing tension fact: ${sourceId}`);
      return {
        sourceId,
        label: `${source.publisher} · ${source.title}`,
        url: source.url,
        factualRecordSha256: source.factualRecordSha256,
        context: proposal.instructionSourceIds.includes(sourceId)
          ? "공개 본문·전사만 확인했습니다. 영상 관찰·정확한 관절 경로·개인 적합성·전문 검토는 미완료입니다."
          : "기구 구조·일반 문맥만 확인했습니다. 이 변형의 정확한 운동 근거가 아닙니다.",
      };
    },
  );
}
function standingSources(): readonly MotionDraftSource[] {
  return [
    "RUH-STANDING-SLIDES",
    "BB-LADDER-GUIDE-2024",
    "MERRITHEW-LADDER-SUPPORT",
  ].map((sourceId) => {
    const source = standingLedger.source_factual_records.find(
      (item) => item.source_id === sourceId,
    );
    if (!source?.access.body_read || !source.factual_record_sha256)
      throw new Error(`Missing standing fact: ${sourceId}`);
    return {
      sourceId,
      label: `${source.publisher} · ${source.title}`,
      url: source.url,
      factualRecordSha256: source.factual_record_sha256,
      context:
        sourceId === "RUH-STANDING-SLIDES"
          ? "물리치료 환자 안내의 일반 지지면 운동입니다. 래더바렐 변형·일반 성인 적합성은 확인되지 않았습니다."
          : "래더바렐 구조·일반 지지 문맥입니다. 바닥 서기 슬라이드의 정확한 시범 근거가 아닙니다.",
    };
  });
}
const unreviewed = {
  status: "variant-proposal",
  professionalReviewCount: 0,
  exactAssetReady: false,
  autoRecommendationEligible: false,
  exactSourceVariantMatched: false,
  sourceVariantReconciliationRequired: true,
} as const;

/** Separate authored variants. Requirements here never inherit or amend a catalog entry. */
export const MOTION_DRAFT_EXPANSION: readonly MotionDraftDefinition[] = [
  {
    ...unreviewed,
    id: "reformer-supine-strap-arm-press",
    intendedExerciseId: "original-reformer-supine-arm-press",
    title: "리포머 팔 프레스 · 발목 사이 볼",
    sideMode: "bilateral",
    variant:
      "공개 전사의 tabletop·발목 사이 볼·기본 양팔 내림을 참고한 원본 기하 제안",
    phases: TENSION_PHASES["reformer-supine-strap-arm-press"],
    matched: [
      "공개 전사에 누운 자세·tabletop·발목 사이 볼·어깨 위에서 양팔 내림과 복귀가 기재됨",
    ],
    unknown: [
      "팔꿈치 각도·머리받침·관절 범위·기구 치수·위상·속도는 저작 선택 또는 미확인",
      "두 구간 로프와 캐리지 이동은 선택한 수학적 모델이며 제조사별 실제 경로·장력·안전 설정이 아님",
      "볼의 종류·크기·압력·개인 적합성·원문 변형의 정확 정합성·전문가 검토 미완료",
    ],
    mismatched: [
      "기존 비교 계획은 양발 지지·소도구 없음이지만 이 제안은 tabletop·발목 사이 볼이 필요함",
      "체스트 컬·다리 뻗기·다른 볼 위치 진행을 합치지 않음",
    ],
    variantRequirements: [
      {
        id: "reformer-loops",
        label: "리포머·양손 루프 · 경로와 설정 미검증",
        basis: "mixed",
      },
      {
        id: "generic-unspecified-ball",
        label: "볼 · 종류/크기 미확인 · 미니볼/짐볼로 확정하지 않음",
        basis: "source-text",
      },
      {
        id: "tabletop-ankle-ball",
        label: "tabletop·발목 사이 볼 · 도해 접점은 저작 선택",
        basis: "mixed",
      },
    ],
    supportSummary:
      "발목 사이 볼과 tabletop이 필요한 별도 제안입니다. 볼 종류·크기는 미확인입니다.",
    supportNote:
      "등·머리·골반은 저작 캐리지 지지에 연결합니다. 기존 동작의 양발 지지·소도구 없음 조건을 이 제안에 적용하지 않습니다.",
    sourceFactsCheckedAt: tensionLedger.researchCheckpointUtc.slice(0, 10),
    sourcePatternId: "reformer-supine-strap-arm-press",
    sources: tensionSources("reformer-supine-strap-arm-press"),
  },
  {
    ...unreviewed,
    id: "cadillac-supine-arm-spring-press",
    intendedExerciseId: "original-cadillac-arm-spring-press",
    title: "캐딜락 굽힌 팔 프레스",
    sideMode: "bilateral",
    variant:
      "Hundred 준비 전사의 굽힌 무릎·양발 지지 선택과 굽힌 팔 내림에서 착안한 저작 호 경로",
    phases: TENSION_PHASES["cadillac-supine-arm-spring-press"],
    matched: [
      "공개 전사에 굽힌 팔로 누르는 준비와 무릎을 굽혀 발을 지지하는 선택이 기재됨",
      "기구 안내의 테이블·프레임·스프링·손잡이 구조",
    ],
    unknown: [
      "전사는 팔꿈치 펴짐·복귀·시작/끝 손 위치·스프링 높이를 확정하지 않음",
      "굽힌 팔꿈치 유지와 팔 호·고정 테이블·앵커·지지 좌표·속도는 저작 선택",
      "그린 스프링은 시각적 길이 표현이며 힘·저항·세팅·적합성·안전은 미검토",
    ],
    mismatched: [
      "Hundred 완성 동작·머리 들기·다리 들기·임의 스프링 설정을 이 제안에 합치지 않음",
    ],
    variantRequirements: [
      {
        id: "cadillac-handles",
        label: "캐딜락·양손 스프링 손잡이 · 앵커/저항 설정 미검증",
        basis: "mixed",
      },
      {
        id: "fixed-table-feet",
        label: "고정 테이블·굽힌 무릎·양발 지지 · 접점 좌표는 저작 선택",
        basis: "mixed",
      },
    ],
    supportSummary:
      "굽힌 무릎과 양발 테이블 지지 제안입니다. 스프링 힘과 세팅은 표현하지 않습니다.",
    supportNote:
      "리포머 캐리지가 아닌 고정 테이블입니다. 제조사 조작법이나 승인된 Hundred 시범을 제공하지 않습니다.",
    sourceFactsCheckedAt: tensionLedger.researchCheckpointUtc.slice(0, 10),
    sourcePatternId: "cadillac-supine-arm-spring-press",
    sources: tensionSources("cadillac-supine-arm-spring-press"),
  },
  ...(
    [
      "ladder-supported-hip-extension-slide",
      "ladder-supported-side-leg-slide",
    ] as const
  ).map((id): MotionDraftDefinition => {
    const rear = id === "ladder-supported-hip-extension-slide";
    return {
      ...unreviewed,
      id,
      sideMode: "unilateral",
      sideRole: "moving-leg",
      sideControlLabel: "슬라이드하는 다리",
      intendedExerciseId: rear
        ? "original-barrel-standing-hip-extension"
        : "original-barrel-standing-side-reach",
      title: rear
        ? "래더 지지 뒤 슬라이드 · 저작 적응"
        : "래더 지지 옆 슬라이드 · 저작 적응",
      variant:
        "일반 단단한 지지면 운동을 래더바렐 rung 지지로 바꾼 미검토 저작 적응",
      phases: STANDING_SUPPORT_PHASES[id],
      matched: [
        rear
          ? "NHS 본문은 일반 firm surface 지지·한 다리 서기·다른 다리 뒤 slide·바로 선 몸을 명시함"
          : "NHS 본문은 일반 firm surface 지지·한 다리 서기·다른 다리 옆 slide·발끝 앞으로를 명시함",
        "제조사 자료의 둥근 바렐·래더 가로대 구조는 운동 사실과 별도로 확인함",
      ],
      unknown: [
        "정확한 래더바렐 운동 변형은 원문에서 확인되지 않아 변형 정합성 검토가 필요함",
        "양손 rung·발끝/뒤꿈치 두 패치의 연속 바닥 접촉·몸통 고정·무릎 IK·치수·범위·시간은 저작 선택",
        "기구 고정·마찰·하중·개인 적합성·안전성·전문가 검토 미완료",
      ],
      mismatched: [
        "일반 지지면의 운동 사실과 래더바렐 구조 사실을 정확한 기구 운동 시범으로 합치지 않음",
        "바렐 곡면 위 발 지지 스트레칭·프레임 위 서기·몸통 측굴과 다른 제안",
      ],
      variantRequirements: [
        {
          id: "ladder-barrel-rung-adaptation",
          label: "래더바렐 가로대 양손 지지 · 원문 변형 미대조",
          basis: "author-choice",
        },
        {
          id: "floor-slide-adaptation",
          label: "바닥 서기·한 발 슬라이드 · 연속 두 패치 접촉은 저작 선택",
          basis: "mixed",
        },
      ],
      supportSummary:
        "일반 지지면 운동을 래더바렐로 바꾼 저작 적응입니다. 정확한 기구 변형은 미확인입니다.",
      supportNote:
        "손은 그린 가로대, 발은 저작 바닥 패치에 연결합니다. 바렐 곡면에는 몸이 닿지 않습니다. 제조사 운동 지시나 안전 검증이 아닙니다.",
      sourceFactsCheckedAt: standingLedger.research_checked_at_utc.slice(0, 10),
      sourcePatternId: id,
      sources: standingSources(),
    };
  }),
];
