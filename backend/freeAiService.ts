import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { RouterContext, RouterResponse } from '@appdeploy/sdk';
import {
  apparatusSchema,
  categorySchema as blockCategorySchema,
  layerSchema,
  levelSchema,
  propSchema,
  textSchema,
} from '../src/schemas/cloudBackupSchema';
import type {
  FreeAiAssistResult,
  FreeAiProviderId,
  FreeAiQuotaStatus,
  FreeAiRenewalInfo,
  StrengthenArea,
} from '../src/types/freeAiAssistant';

export const UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER =
  '미검토 창작 동작 및 AI 제안은 안전성이나 운동·교정·치료 효과를 보장하지 않습니다. 실제 수업에 적용하기 전 강사가 대상자 상태, 기구·스프링 세팅, 동작 범위를 직접 검토해야 합니다.' as const;

export const FREE_QUOTA_EXHAUSTED_HEADING = '무료 사용량 소진' as const;

export const GEMINI_FREE_TIER_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

export type GeminiFreeTierModel = (typeof GEMINI_FREE_TIER_MODELS)[number];

export function isGuaranteedFreeGeminiModel(model: string): model is GeminiFreeTierModel {
  const normalized = model.trim();
  return (GEMINI_FREE_TIER_MODELS as readonly string[]).includes(normalized);
}

export function isGuaranteedFreeOpenRouterModel(model: string): boolean {
  const normalized = model.trim();
  if (!normalized || normalized.length > 160) return false;
  if (normalized === 'openrouter/free') return true;
  return /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/i.test(normalized);
}

const FORBIDDEN_SECRET_FIELD_PATTERN =
  /^(?:api[_-]?key|gemini[_-]?api[_-]?key|openrouter[_-]?api[_-]?key|client[_-]?secret|bearer[_-]?token|authorization|x[_-]?api[_-]?key|byok|user[_-]?api[_-]?key|secret[_-]?key)$/i;

const FORBIDDEN_SECRET_VALUE_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{20,}\b/,
  /\bsk-or-v1-[0-9a-fA-F]{16,}\b/,
  /\bsk-[0-9A-Za-z_-]{20,}\b/,
];

export interface SecretExposureCheckResult {
  safe: boolean;
  violations: string[];
}

export function detectByokOrSecretExposure(input: unknown): SecretExposureCheckResult {
  const violations: string[] = [];

  function walk(value: unknown, path: string, depth: number) {
    if (depth > 8 || value === null || value === undefined) return;
    if (typeof value === 'string') {
      for (const pattern of FORBIDDEN_SECRET_VALUE_PATTERNS) {
        if (pattern.test(value)) {
          violations.push(`${path || 'value'}: API 키 형식의 문자열이 감지되었습니다.`);
          break;
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const nextPath = path ? `${path}.${key}` : key;
        if (FORBIDDEN_SECRET_FIELD_PATTERN.test(key) || /^VITE_.*(?:KEY|TOKEN|SECRET)/i.test(key)) {
          violations.push(
            `${nextPath}: 사용자 API 키(BYOK) 입력 또는 브라우저 키 노출 필드는 허용되지 않습니다.`,
          );
        }
        walk(child, nextPath, depth + 1);
      }
    }
  }

  walk(input, '', 0);
  return {
    safe: violations.length === 0,
    violations,
  };
}

const SENSITIVE_HEALTH_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: '척추·관절 질환/진단명',
    regex:
      /디스크|추간판\s*탈출|척추관\s*협착|협착증|전방\s*전위증|척추\s*분리증|골절|파열|오십견|회전근개\s*파열|관절염|류마티스|골다공증|측만증|herniated\s*disc|spinal\s*stenosis|fracture|scoliosis|osteoarthritis|osteoporosis/i,
  },
  {
    label: '수술·시술·치료 이력',
    regex:
      /수술|시술|인공\s*관절|입원|퇴원|주사\s*치료|스테로이드|신경\s*차단술|물리\s*치료\s*처방|병원\s*진단|의사\s*소견|처방전|재활\s*환자|환자|surgery|post-op|operation|hospital|diagnosis|prescription|patient/i,
  },
  {
    label: '임신·산전·산후 건강상태',
    regex:
      /임신\s*\d*주|임산부|산모|출산\s*직후|제왕절개|유산|복직근\s*이개\s*진단|pregnant|pregnancy|trimester|postpartum\s*patient|c-section/i,
  },
  {
    label: '급성 통증·신경학적 증상',
    regex:
      /방사통|신경통|저림\s*증상|마비|감각\s*저하|배뇨\s*장애|배변\s*장애|어지럼증|실신|급성\s*통증|심한\s*통증|통증\s*호소|sciatica|numbness|paralysis|acute\s*pain|chronic\s*pain/i,
  },
  {
    label: '내과·만성 질환 및 복약 정보',
    regex:
      /고혈압|저혈압|당뇨|심장병|협심증|뇌졸중|암\s*투병|항암|갑상선\s*질환|우울증|공황장애|복용\s*약|약물|hypertension|diabetes|cancer|stroke|medication/i,
  },
  {
    label: '개인 식별 정보(연락처·이메일·주민번호)',
    regex:
      /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)|(?:회원\s*실명|환자\s*이름|차트\s*번호|병록\s*번호)/i,
  },
];

export interface SensitiveHealthInspection {
  hasSensitiveData: boolean;
  matchedCategories: string[];
  sanitizedText: string;
  warningMessageKo: string | null;
}

export function inspectSensitiveHealthText(rawText: string): SensitiveHealthInspection {
  const matchedCategories: string[] = [];
  let sanitizedText = rawText;

  for (const { label, regex } of SENSITIVE_HEALTH_PATTERNS) {
    if (regex.test(rawText)) {
      if (!matchedCategories.includes(label)) {
        matchedCategories.push(label);
      }
      const globalRegex = new RegExp(regex.source, 'gi');
      sanitizedText = sanitizedText.replace(globalRegex, '[민감정보 제외]');
    }
  }

  return {
    hasSensitiveData: matchedCategories.length > 0,
    matchedCategories,
    sanitizedText: sanitizedText.trim(),
    warningMessageKo:
      matchedCategories.length > 0
        ? `민감 건강·개인정보(${matchedCategories.join(', ')})는 무료 외부 AI로 전송할 수 없습니다. 질환·통증·실명 대신 일반적인 수업 주제나 운동 부위(예: 코어 조절, 둔근 강화, 흉추 가동성)로 입력해 주세요.`
        : null,
  };
}

export function inspectPayloadForSensitiveHealth(payload: unknown): SensitiveHealthInspection {
  const allStrings: string[] = [];

  function collectStrings(value: unknown, depth: number) {
    if (depth > 8 || value === null || value === undefined) return;
    if (typeof value === 'string') {
      allStrings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collectStrings(item, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (
          /^(?:memberHealthNotes|medicalHistory|patientNotes|diagnosis|instructorReflection|groupNotes)$/i.test(
            key,
          ) &&
          typeof child === 'string' &&
          child.trim().length > 0
        ) {
          allStrings.push(`환자 ${child}`);
        } else {
          collectStrings(child, depth + 1);
        }
      }
    }
  }

  collectStrings(payload, 0);
  return inspectSensitiveHealthText(allStrings.join(' \n '));
}

const bodyPositionSchema = z.enum([
  'supine',
  'prone',
  'side-lying',
  'seated',
  'kneeling',
  'standing',
  'quadruped',
]);

const spinalPlaneSchema = z.enum(['flexion', 'extension', 'lateral', 'rotation', 'neutral']);

const strengthenAreaSchema = z.enum([
  'core',
  'glute-lower',
  'posture-upper',
  'mobility-rehab',
  'full-body',
]);

const classDraftConditionsInputSchema = z
  .object({
    durationMinutes: z.number().int().min(10).max(120),
    theme: textSchema.max(160).default('균형 잡힌 리포머 플로우'),
    strengthenAreas: z.array(strengthenAreaSchema).min(1).max(5),
    level: levelSchema,
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    availableEquipment: z.array(textSchema.max(80)).max(20).optional(),
    preferredProps: z.array(propSchema).max(14).optional(),
    tempo: z.enum(['slow-precise', 'moderate-flow', 'athletic-burn']).optional(),
    templateId: textSchema.max(120).optional(),
  })
  .strict();

const movementIdeaInputSchema = z
  .object({
    rawIdeaText: textSchema.min(2, '동작 아이디어를 2자 이상 입력해 주세요.').max(600),
    baseExerciseName: textSchema.max(160).optional(),
    apparatus: apparatusSchema,
    blockCategory: blockCategorySchema,
    strengthenArea: strengthenAreaSchema,
    level: levelSchema,
    bodyPosition: bodyPositionSchema.optional(),
    spinalPlane: spinalPlaneSchema.optional(),
    preferredProps: z.array(propSchema).max(10).optional(),
  })
  .strict();

const reviewedExerciseCandidateSchema = z
  .object({
    id: textSchema.min(1).max(120),
    nameKo: textSchema.min(1).max(160),
    nameEn: textSchema.max(160),
    apparatus: apparatusSchema,
    blockCategory: blockCategorySchema,
    level: levelSchema,
    defaultDurationMin: z.number().finite().min(0.5).max(30),
    bodyPosition: bodyPositionSchema.optional(),
    spinalPlanes: z.array(spinalPlaneSchema).max(5).optional(),
    isReviewed: z.literal(true),
  })
  .strict();

const reviewedBlockCandidateSchema = z
  .object({
    id: textSchema.min(1).max(120),
    title: textSchema.min(1).max(160),
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    level: levelSchema,
    category: blockCategorySchema,
    durationMin: z.number().finite().min(1).max(60),
    isReviewed: z.literal(true),
    steps: z
      .array(
        z
          .object({
            exerciseId: textSchema.min(1).max(120),
            nameKo: textSchema.min(1).max(160),
            nameEn: textSchema.max(160).default(''),
            apparatus: apparatusSchema,
            blockCategory: blockCategorySchema,
            durationMin: z.number().finite().min(0.5).max(30),
            selectedLayer: layerSchema,
            instructorNote: textSchema.max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict();

const sequenceComposeInputSchema = z
  .object({
    targetMinutes: z.number().int().min(10).max(120),
    level: levelSchema,
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    theme: textSchema.max(160).optional(),
    strengthenAreas: z.array(strengthenAreaSchema).min(1).max(5),
    selectedExerciseIds: z.array(textSchema.min(1).max(120)).max(60),
    selectedBlockIds: z.array(textSchema.min(1).max(120)).max(30).optional(),
  })
  .strict();

export const freeAiServerRequestSchema = z
  .discriminatedUnion('task', [
    z
      .object({
        task: z.literal('class-draft'),
        conditions: classDraftConditionsInputSchema,
        reviewedCatalog: z.array(reviewedExerciseCandidateSchema).max(100),
      })
      .strict(),
    z
      .object({
        task: z.literal('movement-idea'),
        idea: movementIdeaInputSchema,
      })
      .strict(),
    z
      .object({
        task: z.literal('sequence-compose'),
        compose: sequenceComposeInputSchema,
        reviewedCatalog: z.array(reviewedExerciseCandidateSchema).max(100),
        reviewedBlocks: z.array(reviewedBlockCandidateSchema).max(30).optional(),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    const secretCheck = detectByokOrSecretExposure(value);
    if (!secretCheck.safe) {
      for (const violation of secretCheck.violations) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: violation,
        });
      }
    }
    const healthCheck = inspectPayloadForSensitiveHealth(value);
    if (healthCheck.hasSensitiveData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          healthCheck.warningMessageKo ??
          '민감 건강·개인정보는 무료 외부 AI로 전송할 수 없습니다.',
      });
    }
  });

export type FreeAiServerRequest = z.infer<typeof freeAiServerRequestSchema>;

const editableDraftStepSchema = z.object({
  stepId: textSchema.min(1).max(120),
  order: z.number().int().nonnegative(),
  exerciseId: textSchema.min(1).max(120),
  nameKo: textSchema.min(1).max(160),
  nameEn: textSchema.max(160),
  apparatus: apparatusSchema,
  blockCategory: blockCategorySchema,
  durationMin: z.number().finite().min(0.5).max(60),
  selectedLayer: layerSchema,
  instructorNote: textSchema.max(500),
  isReviewed: z.literal(true),
  sourceBlockId: textSchema.max(120).optional(),
});

const editableClassDraftResultSchema = z.object({
  kind: z.literal('class-draft'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  title: textSchema.min(1).max(150),
  subtitle: textSchema.max(240),
  targetMinutes: z.number().int().min(10).max(120),
  level: levelSchema,
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  focusPreset: z.enum([
    'full-body',
    'core-sculpt',
    'glute-lower',
    'posture-upper',
    'mobility-rehab',
  ]),
  strengthenAreas: z.array(strengthenAreaSchema).min(1).max(5),
  coachingSummary: textSchema.max(1000),
  steps: z.array(editableDraftStepSchema).max(40),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

const editableMovementIdeaResultSchema = z.object({
  kind: z.literal('movement-idea'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  nameKo: textSchema.min(2).max(160),
  nameEn: textSchema.max(160),
  apparatus: apparatusSchema,
  blockCategory: blockCategorySchema,
  level: levelSchema,
  bodyPosition: bodyPositionSchema,
  spinalPlanes: z.array(spinalPlaneSchema).min(1).max(5),
  props: z.array(propSchema).min(1).max(10),
  defaultDurationMin: z.number().finite().min(0.5).max(20),
  springs: textSchema.max(240),
  targetMuscles: z.array(textSchema.max(120)).min(1).max(12),
  breathPattern: textSchema.max(500),
  cues: z.array(textSchema.min(1).max(300)).min(1).max(10),
  precautions: textSchema.min(2).max(500),
  layers: z.object({
    easy: textSchema.min(2).max(400),
    standard: textSchema.min(2).max(400),
    hard: textSchema.min(2).max(400),
  }),
  variationRationale: textSchema.max(600),
  reviewStatus: z.literal('unreviewed-creative'),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

const editableSequenceComposeResultSchema = z.object({
  kind: z.literal('sequence-compose'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  title: textSchema.min(1).max(150),
  subtitle: textSchema.max(240),
  targetMinutes: z.number().int().min(10).max(120),
  level: levelSchema,
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  steps: z.array(editableDraftStepSchema).max(40),
  excludedUnreviewedIds: z.array(textSchema.max(120)).max(100),
  transitionSummary: textSchema.max(1000),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

export const freeAiAssistResultSchema = z.discriminatedUnion('kind', [
  editableClassDraftResultSchema,
  editableMovementIdeaResultSchema,
  editableSequenceComposeResultSchema,
]);

export const DEFAULT_GEMINI_FREE_MODEL = 'gemini-3.5-flash-lite' as const;
export const DEFAULT_OPENROUTER_FREE_MODEL = 'openrouter/free' as const;

export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_MAX_CACHE_ENTRIES = 200;
export const DEFAULT_MAX_CONCURRENT_PER_USER = 1;
export const DEFAULT_MAX_CONCURRENT_GLOBAL = 3;
export const DEFAULT_MINUTE_LIMIT = 10;
export const DEFAULT_DAILY_LIMIT = 45;

export const FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE =
  '무료 사용량 소진: 현재 무료 AI 호출 한도에 도달하여 외부 AI 호출이 차단되었습니다. 로컬 추천·수동 편집·저장 프리셋은 계속 사용할 수 있습니다.' as const;

export const CONCURRENCY_LIMIT_ERROR_MESSAGE =
  '동시 AI 요청 한도를 초과했습니다. 이전 요청이 끝난 뒤 다시 시도해 주세요.' as const;

export type FreeAiErrorCode =
  | 'byok_forbidden'
  | 'sensitive_health_blocked'
  | 'invalid_request'
  | 'unconfigured'
  | 'billing_guard_unconfirmed'
  | 'invalid_paid_model_blocked'
  | 'concurrency_limit_exceeded'
  | 'free_quota_exhausted'
  | 'upstream_error'
  | 'invalid_ai_response';

export class FreeAiError extends Error {
  public readonly code: FreeAiErrorCode;
  public readonly status: number;
  public readonly statusCode: number;
  public readonly quotaStatus?: FreeAiQuotaStatus;
  public readonly renewal: FreeAiRenewalInfo | null;

  constructor(
    code: FreeAiErrorCode,
    message: string,
    status = 400,
    quotaStatus?: FreeAiQuotaStatus,
  ) {
    super(message);
    this.name = 'FreeAiError';
    this.code = code;
    this.status = status;
    this.statusCode = status;
    this.quotaStatus = quotaStatus;
    this.renewal = quotaStatus?.renewal ?? null;
  }
}

export interface ResolvedFreeAiConfig {
  provider: FreeAiProviderId;
  model: string | null;
  apiKey: string | null;
  enabled: boolean;
  reason:
    | 'ready'
    | 'unconfigured'
    | 'billing_guard_unconfirmed'
    | 'invalid_paid_model_blocked';
  statusMessageKo: string;
}

/**
 * Resolves free-only external AI configuration strictly from server-side environment variables.
 * Never reads or accepts API keys from client requests.
 */
export function resolveFreeAiConfig(
  env: Record<string, string | undefined> = process.env,
): ResolvedFreeAiConfig {
  const explicitProvider = (env.FREE_AI_PROVIDER ?? '').trim().toLowerCase();
  if (explicitProvider === 'none') {
    return {
      provider: 'none',
      model: null,
      apiKey: null,
      enabled: false,
      reason: 'unconfigured',
      statusMessageKo:
        '외부 무료 AI가 비활성화되어 있습니다. 로컬 추천 엔진·수동 편집·저장 프리셋을 사용할 수 있습니다.',
    };
  }

  const geminiKey = (env.GEMINI_API_KEY ?? '').trim();
  const geminiUnpaidConfirmed =
    (env.GEMINI_FREE_TIER_UNPAID_CONFIRMED ?? '').trim().toLowerCase() === 'true';
  const geminiModel = (env.GEMINI_FREE_MODEL ?? '').trim() || DEFAULT_GEMINI_FREE_MODEL;

  const openRouterKey = (env.OPENROUTER_API_KEY ?? '').trim();
  const openRouterModel =
    (env.OPENROUTER_FREE_MODEL ?? '').trim() || DEFAULT_OPENROUTER_FREE_MODEL;

  const preferOpenRouter =
    explicitProvider === 'openrouter-free' || (!geminiKey && Boolean(openRouterKey));

  if (preferOpenRouter) {
    if (!openRouterKey) {
      return {
        provider: 'none',
        model: null,
        apiKey: null,
        enabled: false,
        reason: 'unconfigured',
        statusMessageKo:
          '외부 무료 AI 키가 설정되지 않았습니다. 로컬 추천 엔진·수동 편집·저장 프리셋으로 모든 기능을 사용할 수 있습니다.',
      };
    }

    if (!isGuaranteedFreeOpenRouterModel(openRouterModel)) {
      return {
        provider: 'openrouter-free',
        model: null,
        apiKey: null,
        enabled: false,
        reason: 'invalid_paid_model_blocked',
        statusMessageKo:
          '유료 과금 위험이 있는 OpenRouter 모델이 감지되어 외부 AI 호출이 차단되었습니다. (:free 또는 openrouter/free 모델만 허용)',
      };
    }

    return {
      provider: 'openrouter-free',
      model: openRouterModel,
      apiKey: openRouterKey,
      enabled: true,
      reason: 'ready',
      statusMessageKo: `OpenRouter 무료 모델(${openRouterModel}) 활성화 · max_price=0 및 유료 폴백 차단 적용`,
    };
  }

  if (geminiKey || explicitProvider === 'gemini-free') {
    if (!geminiKey) {
      return {
        provider: 'none',
        model: null,
        apiKey: null,
        enabled: false,
        reason: 'unconfigured',
        statusMessageKo:
          '외부 무료 AI 키가 설정되지 않았습니다. 로컬 추천 엔진·수동 편집·저장 프리셋으로 모든 기능을 사용할 수 있습니다.',
      };
    }

    if (!isGuaranteedFreeGeminiModel(geminiModel)) {
      return {
        provider: 'gemini-free',
        model: null,
        apiKey: null,
        enabled: false,
        reason: 'invalid_paid_model_blocked',
        statusMessageKo:
          'Google Gemini 무료 등급 허용 목록에 없는 유료 모델이 감지되어 외부 AI 호출이 차단되었습니다.',
      };
    }

    if (!geminiUnpaidConfirmed) {
      return {
        provider: 'gemini-free',
        model: null,
        apiKey: null,
        enabled: false,
        reason: 'billing_guard_unconfirmed',
        statusMessageKo:
          'Google AI Studio 무과금 프로젝트 확인(GEMINI_FREE_TIER_UNPAID_CONFIRMED=true)이 설정되지 않아 외부 AI 호출이 차단되었습니다.',
      };
    }

    return {
      provider: 'gemini-free',
      model: geminiModel,
      apiKey: geminiKey,
      enabled: true,
      reason: 'ready',
      statusMessageKo: `Google Gemini 무료 등급(${geminiModel}) 활성화 · 무과금 프로젝트 보호 적용`,
    };
  }

  return {
    provider: 'none',
    model: null,
    apiKey: null,
    enabled: false,
    reason: 'unconfigured',
    statusMessageKo:
      '외부 무료 AI 키가 설정되지 않았습니다. 로컬 추천 엔진·수동 편집·저장 프리셋으로 모든 기능을 사용할 수 있습니다.',
  };
}

interface TimeZoneDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const losAngelesFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getLosAngelesParts(ms: number): TimeZoneDateParts {
  const parts = losAngelesFormatter.formatToParts(new Date(ms));
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = Number.parseInt(part.value, 10);
    }
  }
  return {
    year: map.year ?? 1970,
    month: map.month ?? 1,
    day: map.day ?? 1,
    hour: (map.hour ?? 0) % 24,
    minute: map.minute ?? 0,
    second: map.second ?? 0,
  };
}

/**
 * Computes the exact UTC timestamp (ms) for the next midnight (00:00:00.000) in America/Los_Angeles.
 * Handles both PST (UTC-8) and PDT (UTC-7) cleanly.
 */
export function computeNextGeminiDailyResetMs(nowMs: number = Date.now()): number {
  const current = getLosAngelesParts(nowMs);
  const candidateUtcMs = Date.UTC(current.year, current.month - 1, current.day + 1, 8, 0, 0, 0);
  const check = getLosAngelesParts(candidateUtcMs);
  if (check.hour === 0 && check.minute === 0) {
    return candidateUtcMs;
  }
  const hourDiff = check.hour > 12 ? 24 - check.hour : -check.hour;
  return candidateUtcMs + hourDiff * 3_600_000 - check.minute * 60_000 - check.second * 1_000;
}

/**
 * Computes the exact UTC timestamp (ms) for the next midnight (00:00:00.000Z) in UTC.
 */
export function computeNextOpenRouterDailyResetMs(nowMs: number = Date.now()): number {
  const now = new Date(nowMs);
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}

/**
 * Computes the end of the current 60-second minute window.
 */
export function computeMinuteWindowResetMs(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 60_000) * 60_000 + 60_000;
}

/**
 * Parses upstream rate-limit reset headers (`X-RateLimit-Reset` or `Retry-After`) if present.
 */
export function parseUpstreamResetHeaderMs(
  headers: Headers | Record<string, string | undefined> | undefined,
  nowMs: number = Date.now(),
): { resetAtMs: number; resetWindow: 'minute' | 'daily' } | null {
  if (!headers) return null;

  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name);
    }
    const record = headers as Record<string, string | undefined>;
    const foundKey = Object.keys(record).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );
    return foundKey ? (record[foundKey] ?? null) : null;
  };

  const rateLimitReset = getHeader('x-ratelimit-reset')?.trim();
  if (rateLimitReset) {
    const numeric = Number(rateLimitReset);
    if (Number.isFinite(numeric) && numeric > 0) {
      let resetAtMs: number;
      if (numeric > 1e12) {
        resetAtMs = Math.ceil(numeric);
      } else if (numeric > 1e9) {
        resetAtMs = Math.ceil(numeric * 1000);
      } else {
        resetAtMs = nowMs + Math.ceil(numeric * 1000);
      }
      if (resetAtMs > nowMs) {
        const deltaSec = (resetAtMs - nowMs) / 1000;
        return {
          resetAtMs,
          resetWindow: deltaSec <= 120 ? 'minute' : 'daily',
        };
      }
    } else {
      const parsedDate = Date.parse(rateLimitReset);
      if (Number.isFinite(parsedDate) && parsedDate > nowMs) {
        const deltaSec = (parsedDate - nowMs) / 1000;
        return {
          resetAtMs: parsedDate,
          resetWindow: deltaSec <= 120 ? 'minute' : 'daily',
        };
      }
    }
  }

  const retryAfter = getHeader('retry-after')?.trim();
  if (retryAfter) {
    const numeric = Number(retryAfter);
    if (Number.isFinite(numeric) && numeric > 0) {
      const resetAtMs = nowMs + Math.ceil(numeric * 1000);
      return {
        resetAtMs,
        resetWindow: numeric <= 120 ? 'minute' : 'daily',
      };
    }
    const parsedDate = Date.parse(retryAfter);
    if (Number.isFinite(parsedDate) && parsedDate > nowMs) {
      const deltaSec = (parsedDate - nowMs) / 1000;
      return {
        resetAtMs: parsedDate,
        resetWindow: deltaSec <= 120 ? 'minute' : 'daily',
      };
    }
  }

  return null;
}

export function computeQuotaRenewal(options: {
  provider: FreeAiProviderId;
  resetWindow: 'minute' | 'daily';
  nowMs?: number;
  overrideResetAtMs?: number;
}): FreeAiRenewalInfo | null {
  const { provider, resetWindow } = options;
  if (provider === 'none') return null;

  const nowMs = options.nowMs ?? Date.now();
  const resetTimezone: 'UTC' | 'America/Los_Angeles' =
    provider === 'gemini-free' ? 'America/Los_Angeles' : 'UTC';

  let resetAtMs: number;
  if (options.overrideResetAtMs && options.overrideResetAtMs > nowMs) {
    resetAtMs = options.overrideResetAtMs;
  } else if (resetWindow === 'minute') {
    resetAtMs = computeMinuteWindowResetMs(nowMs);
  } else if (provider === 'gemini-free') {
    resetAtMs = computeNextGeminiDailyResetMs(nowMs);
  } else {
    resetAtMs = computeNextOpenRouterDailyResetMs(nowMs);
  }

  const remainingSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  const totalMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formattedResetKo: string;
  if (resetWindow === 'minute') {
    formattedResetKo =
      provider === 'gemini-free'
        ? `분당 무료 호출 한도(RPM) 갱신 · 약 ${remainingSeconds}초 후 (미국 태평양 시간 기준 프로젝트)`
        : `분당 무료 호출 한도(RPM) 갱신 · 약 ${remainingSeconds}초 후 (UTC 기준)`;
  } else if (provider === 'gemini-free') {
    formattedResetKo = `미국 태평양 시간 자정(00:00 PT) 기준 일일 무료 한도 갱신 · 약 ${hours}시간 ${minutes}분 후`;
  } else {
    formattedResetKo = `협정 세계시 자정(00:00 UTC) 기준 일일 무료 한도 갱신 · 약 ${hours}시간 ${minutes}분 후`;
  }

  const policyNoteKo =
    provider === 'gemini-free'
      ? 'Google AI Studio 무과금 무료 등급(Unpaid Free Tier) 일일 한도(RPD)는 미국 태평양 시간 자정(America/Los_Angeles, 00:00 PT)에 초기화되며 유료 모델로 절대 전환되지 않습니다.'
      : 'OpenRouter 무료 모델(:free) 일일 한도(RPD)는 00:00 UTC에 초기화되며 max_price=0 및 allow_fallbacks=false 설정으로 유료 전환이 차단됩니다.';

  return {
    resetAt: new Date(resetAtMs).toISOString(),
    resetWindow,
    resetTimezone,
    remainingSeconds,
    formattedResetKo,
    policyNoteKo,
  };
}

function canonicalizeForHash(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value.trim());
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeForHash(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    const entries = sortedKeys.map(
      (key) => `${JSON.stringify(key)}:${canonicalizeForHash(record[key])}`,
    );
    return `{${entries.join(',')}}`;
  }
  return 'null';
}

export function computeFreeAiCacheKey(
  provider: FreeAiProviderId,
  model: string,
  request: FreeAiServerRequest,
): string {
  const payload = canonicalizeForHash({ provider, model, request });
  return createHash('sha256').update(payload).digest('hex');
}

function deriveFocusPreset(
  areas: StrengthenArea[],
): 'full-body' | 'core-sculpt' | 'glute-lower' | 'posture-upper' | 'mobility-rehab' {
  const first = areas[0];
  if (first === 'core') return 'core-sculpt';
  if (first === 'glute-lower') return 'glute-lower';
  if (first === 'posture-upper') return 'posture-upper';
  if (first === 'mobility-rehab') return 'mobility-rehab';
  return 'full-body';
}

function buildPromptForRequest(request: FreeAiServerRequest): string {
  if (request.task === 'class-draft') {
    return JSON.stringify({
      instruction:
        '필라테스 수업 초안을 JSON 형식으로만 응답하세요. 반드시 reviewedCatalog에 포함된 검증된 동작만 steps에 사용하고, 의학적·치료적 효과나 안전성을 보장하지 마세요.',
      task: 'class-draft',
      conditions: request.conditions,
      reviewedCatalog: request.reviewedCatalog,
    });
  }
  if (request.task === 'movement-idea') {
    return JSON.stringify({
      instruction:
        '필라테스 창작 동작 아이디어를 구조화된 JSON 형식으로만 응답하세요. 미검토 창작 아이디어(unreviewed-creative)로 표시되며 안전성이나 운동·교정 효과를 보장하지 않습니다.',
      task: 'movement-idea',
      idea: request.idea,
    });
  }
  return JSON.stringify({
    instruction:
      '선택된 검증 동작과 블록만 사용하여 필라테스 시퀀스 구성을 JSON 형식으로만 응답하세요. 미검토 창작 동작은 제외하세요.',
    task: 'sequence-compose',
    compose: request.compose,
    reviewedCatalog: request.reviewedCatalog,
    reviewedBlocks: request.reviewedBlocks ?? [],
  });
}

function extractRawJsonFromUpstream(upstreamPayload: unknown): Record<string, unknown> {
  if (!upstreamPayload || typeof upstreamPayload !== 'object') {
    throw new Error('Upstream payload is not an object');
  }

  const record = upstreamPayload as Record<string, unknown>;

  if (Array.isArray(record.candidates) && record.candidates.length > 0) {
    const firstCandidate = record.candidates[0] as Record<string, unknown> | undefined;
    const content = firstCandidate?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Array<Record<string, unknown>> | undefined;
    const text = parts?.[0]?.text;
    if (typeof text === 'string' && text.trim()) {
      return parseJsonString(text);
    }
  }

  if (Array.isArray(record.choices) && record.choices.length > 0) {
    const firstChoice = record.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content === 'string' && content.trim()) {
      return parseJsonString(content);
    }
  }

  return record;
}

function parseJsonString(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Parsed JSON is not an object');
  }
  return parsed as Record<string, unknown>;
}

function normalizeAndValidateAssistResult(
  upstreamPayload: unknown,
  request: FreeAiServerRequest,
  config: ResolvedFreeAiConfig,
): FreeAiAssistResult {
  const raw = extractRawJsonFromUpstream(upstreamPayload);

  if (request.task === 'class-draft') {
    const catalogIds = new Set(request.reviewedCatalog.map((item) => item.id));
    const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
    const normalizedSteps = rawSteps
      .filter((step): step is Record<string, unknown> => Boolean(step && typeof step === 'object'))
      .filter((step) => {
        return typeof step.exerciseId === 'string' && catalogIds.has(step.exerciseId);
      })
      .map((step, index) => ({
        ...step,
        stepId:
          typeof step.stepId === 'string' && step.stepId.trim()
            ? step.stepId
            : `draft-step-${index + 1}`,
        order: typeof step.order === 'number' ? step.order : index + 1,
        nameEn: typeof step.nameEn === 'string' ? step.nameEn : '',
        instructorNote: typeof step.instructorNote === 'string' ? step.instructorNote : '',
        isReviewed: true as const,
      }));

    const candidate = {
      ...raw,
      kind: 'class-draft' as const,
      source: 'external-free-ai' as const,
      provider: config.provider,
      model: config.model,
      cached: false,
      targetMinutes:
        typeof raw.targetMinutes === 'number'
          ? raw.targetMinutes
          : request.conditions.durationMinutes,
      level: raw.level ?? request.conditions.level,
      apparatus: raw.apparatus ?? request.conditions.apparatus,
      focusPreset: raw.focusPreset ?? deriveFocusPreset(request.conditions.strengthenAreas),
      strengthenAreas:
        Array.isArray(raw.strengthenAreas) && raw.strengthenAreas.length > 0
          ? raw.strengthenAreas
          : request.conditions.strengthenAreas,
      steps: normalizedSteps,
      guaranteesSafetyOrEffect: false as const,
      safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
    };

    return freeAiAssistResultSchema.parse(candidate);
  }

  if (request.task === 'movement-idea') {
    const preferredProps = request.idea.preferredProps;
    const candidate = {
      ...raw,
      kind: 'movement-idea' as const,
      source: 'external-free-ai' as const,
      provider: config.provider,
      model: config.model,
      cached: false,
      apparatus: raw.apparatus ?? request.idea.apparatus,
      blockCategory: raw.blockCategory ?? request.idea.blockCategory,
      level: raw.level ?? request.idea.level,
      bodyPosition: raw.bodyPosition ?? request.idea.bodyPosition ?? 'supine',
      spinalPlanes:
        Array.isArray(raw.spinalPlanes) && raw.spinalPlanes.length > 0
          ? raw.spinalPlanes
          : [request.idea.spinalPlane ?? 'neutral'],
      props:
        Array.isArray(raw.props) && raw.props.length > 0
          ? raw.props
          : preferredProps && preferredProps.length > 0
            ? preferredProps
            : ['none'],
      reviewStatus: 'unreviewed-creative' as const,
      guaranteesSafetyOrEffect: false as const,
      safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
    };

    return freeAiAssistResultSchema.parse(candidate);
  }

  const reviewedIds = new Set<string>(request.reviewedCatalog.map((item) => item.id));
  for (const block of request.reviewedBlocks ?? []) {
    if (block.isReviewed) {
      for (const step of block.steps) {
        reviewedIds.add(step.exerciseId);
      }
    }
  }

  const autoExcluded = request.compose.selectedExerciseIds.filter(
    (id) => !reviewedIds.has(id),
  );
  const rawExcluded = Array.isArray(raw.excludedUnreviewedIds)
    ? raw.excludedUnreviewedIds.filter((id): id is string => typeof id === 'string')
    : [];
  const excludedUnreviewedIds = Array.from(new Set([...rawExcluded, ...autoExcluded]));

  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const normalizedSteps = rawSteps
    .filter((step): step is Record<string, unknown> => Boolean(step && typeof step === 'object'))
    .filter((step) => {
      return typeof step.exerciseId === 'string' && reviewedIds.has(step.exerciseId);
    })
    .map((step, index) => ({
      ...step,
      stepId:
        typeof step.stepId === 'string' && step.stepId.trim()
          ? step.stepId
          : `compose-step-${index + 1}`,
      order: typeof step.order === 'number' ? step.order : index + 1,
      nameEn: typeof step.nameEn === 'string' ? step.nameEn : '',
      instructorNote: typeof step.instructorNote === 'string' ? step.instructorNote : '',
      isReviewed: true as const,
    }));

  const candidate = {
    ...raw,
    kind: 'sequence-compose' as const,
    source: 'external-free-ai' as const,
    provider: config.provider,
    model: config.model,
    cached: false,
    targetMinutes:
      typeof raw.targetMinutes === 'number'
        ? raw.targetMinutes
        : request.compose.targetMinutes,
    level: raw.level ?? request.compose.level,
    apparatus: raw.apparatus ?? request.compose.apparatus,
    steps: normalizedSteps,
    excludedUnreviewedIds,
    guaranteesSafetyOrEffect: false as const,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };

  return freeAiAssistResultSchema.parse(candidate);
}

export interface FreeAiServiceOptions {
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  now?: () => number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  maxConcurrentPerUser?: number;
  maxConcurrentGlobal?: number;
  minuteLimit?: number;
  dailyLimit?: number;
}

export interface FreeAiService {
  getStatus: () => FreeAiQuotaStatus;
  assist: (userId: string, rawInput: unknown) => Promise<FreeAiAssistResult>;
  clearCache: () => void;
}

interface CacheEntry {
  result: FreeAiAssistResult;
  expiresAtMs: number;
}

export function createFreeAiService(options: FreeAiServiceOptions = {}): FreeAiService {
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const now = options.now ?? (() => Date.now());
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const maxCacheEntries = options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  const maxConcurrentPerUser =
    options.maxConcurrentPerUser ?? DEFAULT_MAX_CONCURRENT_PER_USER;
  const maxConcurrentGlobal =
    options.maxConcurrentGlobal ?? DEFAULT_MAX_CONCURRENT_GLOBAL;
  const minuteLimit = options.minuteLimit ?? DEFAULT_MINUTE_LIMIT;
  const dailyLimit = options.dailyLimit ?? DEFAULT_DAILY_LIMIT;

  const cache = new Map<string, CacheEntry>();
  const activePerUser = new Map<string, number>();
  let activeGlobal = 0;

  let minuteUsed = 0;
  let minuteWindowResetMs = 0;

  let dailyUsed = 0;
  let dailyWindowResetMs = 0;
  let trackedProvider: FreeAiProviderId = 'none';

  let upstreamExhaustedUntilMs: number | null = null;
  let upstreamExhaustedWindow: 'minute' | 'daily' | null = null;

  function syncWindows(nowMs: number, config: ResolvedFreeAiConfig): void {
    for (const [key, entry] of cache.entries()) {
      if (nowMs >= entry.expiresAtMs) {
        cache.delete(key);
      }
    }

    if (!config.enabled || config.provider === 'none') {
      return;
    }

    if (trackedProvider !== config.provider) {
      trackedProvider = config.provider;
      dailyWindowResetMs =
        config.provider === 'gemini-free'
          ? computeNextGeminiDailyResetMs(nowMs)
          : computeNextOpenRouterDailyResetMs(nowMs);
      minuteWindowResetMs = computeMinuteWindowResetMs(nowMs);
    }

    if (minuteWindowResetMs === 0 || nowMs >= minuteWindowResetMs) {
      minuteUsed = 0;
      minuteWindowResetMs = computeMinuteWindowResetMs(nowMs);
    }

    if (dailyWindowResetMs === 0 || nowMs >= dailyWindowResetMs) {
      dailyUsed = 0;
      dailyWindowResetMs =
        config.provider === 'gemini-free'
          ? computeNextGeminiDailyResetMs(nowMs)
          : computeNextOpenRouterDailyResetMs(nowMs);
    }

    if (upstreamExhaustedUntilMs !== null && nowMs >= upstreamExhaustedUntilMs) {
      upstreamExhaustedUntilMs = null;
      upstreamExhaustedWindow = null;
    }
  }

  function buildStatus(
    overrideReason?: FreeAiQuotaStatus['reason'],
  ): FreeAiQuotaStatus {
    const nowMs = now();
    const config = resolveFreeAiConfig(env);
    syncWindows(nowMs, config);

    if (!config.enabled) {
      return {
        provider: config.provider,
        model: config.model,
        enabled: false,
        exhausted: false,
        reason: overrideReason ?? config.reason,
        minuteLimit,
        minuteUsed: 0,
        minuteRemaining: 0,
        dailyLimit,
        dailyUsed: 0,
        dailyRemaining: 0,
        activeRequests: activeGlobal,
        maxConcurrentRequests: maxConcurrentGlobal,
        cacheEntries: cache.size,
        statusMessageKo: config.statusMessageKo,
        renewal: null,
      };
    }

    const minuteRemaining = Math.max(0, minuteLimit - minuteUsed);
    const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

    const isUpstreamExhausted =
      upstreamExhaustedUntilMs !== null && upstreamExhaustedUntilMs > nowMs;
    const isDailyExhausted = dailyUsed >= dailyLimit;
    const isMinuteExhausted = minuteUsed >= minuteLimit;
    const exhausted = isUpstreamExhausted || isDailyExhausted || isMinuteExhausted;

    let renewal: FreeAiRenewalInfo | null;
    if (isUpstreamExhausted && upstreamExhaustedUntilMs !== null) {
      renewal = computeQuotaRenewal({
        provider: config.provider,
        resetWindow: upstreamExhaustedWindow ?? 'daily',
        nowMs,
        overrideResetAtMs: upstreamExhaustedUntilMs,
      });
    } else if (isDailyExhausted) {
      renewal = computeQuotaRenewal({
        provider: config.provider,
        resetWindow: 'daily',
        nowMs,
        overrideResetAtMs: dailyWindowResetMs,
      });
    } else if (isMinuteExhausted) {
      renewal = computeQuotaRenewal({
        provider: config.provider,
        resetWindow: 'minute',
        nowMs,
        overrideResetAtMs: minuteWindowResetMs,
      });
    } else {
      renewal = computeQuotaRenewal({
        provider: config.provider,
        resetWindow: 'daily',
        nowMs,
        overrideResetAtMs: dailyWindowResetMs,
      });
    }

    const reason: FreeAiQuotaStatus['reason'] =
      overrideReason ??
      (exhausted
        ? 'free_quota_exhausted'
        : activeGlobal >= maxConcurrentGlobal
          ? 'concurrency_limit_exceeded'
          : 'ready');

    const statusMessageKo = exhausted
      ? `무료 사용량 소진 · ${renewal?.formattedResetKo ?? '한도 갱신 대기 중'} · 로컬 추천·수동 편집·저장 프리셋 사용 가능`
      : reason === 'concurrency_limit_exceeded'
        ? CONCURRENCY_LIMIT_ERROR_MESSAGE
        : config.statusMessageKo;

    return {
      provider: config.provider,
      model: config.model,
      enabled: true,
      exhausted,
      reason,
      minuteLimit,
      minuteUsed,
      minuteRemaining,
      dailyLimit,
      dailyUsed,
      dailyRemaining,
      activeRequests: activeGlobal,
      maxConcurrentRequests: maxConcurrentGlobal,
      cacheEntries: cache.size,
      statusMessageKo,
      renewal,
    };
  }

  function setCacheEntry(key: string, result: FreeAiAssistResult, nowMs: number): void {
    if (cacheTtlMs <= 0 || maxCacheEntries <= 0) return;
    if (cache.size >= maxCacheEntries && !cache.has(key)) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    cache.set(key, {
      result: { ...result, cached: false },
      expiresAtMs: nowMs + cacheTtlMs,
    });
  }

  async function callUpstreamFreeProvider(
    config: ResolvedFreeAiConfig,
    request: FreeAiServerRequest,
  ): Promise<Response> {
    const promptText = buildPromptForRequest(request);

    if (config.provider === 'gemini-free') {
      const model = config.model!;
      if (!isGuaranteedFreeGeminiModel(model)) {
        throw new FreeAiError(
          'invalid_paid_model_blocked',
          'Google Gemini 무료 등급 허용 모델이 아닙니다.',
          503,
          buildStatus('invalid_paid_model_blocked'),
        );
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body = {
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      };

      return fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey!,
        },
        body: JSON.stringify(body),
      });
    }

    const model = config.model!;
    if (!isGuaranteedFreeOpenRouterModel(model)) {
      throw new FreeAiError(
        'invalid_paid_model_blocked',
        'OpenRouter 무료(:free) 모델이 아닙니다.',
        503,
        buildStatus('invalid_paid_model_blocked'),
      );
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model,
      provider: {
        allow_fallbacks: false,
        max_price: {
          prompt: 0,
          completion: 0,
        },
      },
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '당신은 필라테스 수업 설계 보조 AI입니다. 반드시 요청된 스키마의 JSON 객체만 반환하세요.',
        },
        {
          role: 'user',
          content: promptText,
        },
      ],
    };

    return fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey!}`,
      },
      body: JSON.stringify(body),
    });
  }

  return {
    getStatus(): FreeAiQuotaStatus {
      return buildStatus();
    },

    clearCache(): void {
      cache.clear();
    },

    async assist(userId: string, rawInput: unknown): Promise<FreeAiAssistResult> {
      const byokCheck = detectByokOrSecretExposure(rawInput);
      if (!byokCheck.safe) {
        throw new FreeAiError(
          'byok_forbidden',
          byokCheck.violations[0] ??
            '사용자 API 키(BYOK) 입력 또는 브라우저 키 노출은 허용되지 않습니다.',
          400,
          buildStatus(),
        );
      }

      const healthCheck = inspectPayloadForSensitiveHealth(rawInput);
      if (healthCheck.hasSensitiveData) {
        throw new FreeAiError(
          'sensitive_health_blocked',
          healthCheck.warningMessageKo ??
            '민감 건강·개인정보는 무료 외부 AI로 전송할 수 없습니다.',
          400,
          buildStatus(),
        );
      }

      const parsed = freeAiServerRequestSchema.safeParse(rawInput);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]?.message;
        throw new FreeAiError(
          'invalid_request',
          firstIssue ?? 'AI 보조 요청 형식이 올바르지 않습니다.',
          400,
          buildStatus(),
        );
      }

      const nowMs = now();
      const config = resolveFreeAiConfig(env);
      syncWindows(nowMs, config);

      if (!config.enabled || config.provider === 'none' || !config.model) {
        const code: FreeAiErrorCode =
          config.reason === 'ready' ? 'unconfigured' : config.reason;
        throw new FreeAiError(
          code,
          config.statusMessageKo,
          503,
          buildStatus(config.reason),
        );
      }

      const cacheKey = computeFreeAiCacheKey(
        config.provider,
        config.model,
        parsed.data,
      );
      const cachedEntry = cache.get(cacheKey);
      if (cachedEntry && nowMs < cachedEntry.expiresAtMs) {
        return {
          ...cachedEntry.result,
          cached: true,
        };
      }

      const normalizedUserKey = userId.trim() || 'anonymous-instructor';
      const userActiveCount = activePerUser.get(normalizedUserKey) ?? 0;
      if (
        activeGlobal >= maxConcurrentGlobal ||
        userActiveCount >= maxConcurrentPerUser
      ) {
        const status = buildStatus('concurrency_limit_exceeded');
        throw new FreeAiError(
          'concurrency_limit_exceeded',
          CONCURRENCY_LIMIT_ERROR_MESSAGE,
          429,
          status,
        );
      }

      if (
        (upstreamExhaustedUntilMs !== null && upstreamExhaustedUntilMs > nowMs) ||
        dailyUsed >= dailyLimit ||
        minuteUsed >= minuteLimit
      ) {
        const status = buildStatus('free_quota_exhausted');
        throw new FreeAiError(
          'free_quota_exhausted',
          FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
          429,
          status,
        );
      }

      activeGlobal += 1;
      activePerUser.set(normalizedUserKey, userActiveCount + 1);
      minuteUsed += 1;
      dailyUsed += 1;

      try {
        let response: Response;
        try {
          response = await callUpstreamFreeProvider(config, parsed.data);
        } catch (cause) {
          if (cause instanceof FreeAiError) throw cause;
          throw new FreeAiError(
            'upstream_error',
            '외부 무료 AI 서비스 연결에 실패했습니다. 유료 모델 폴백 없이 중단되었으며 로컬 추천 엔진을 계속 사용할 수 있습니다.',
            502,
            buildStatus(),
          );
        }

        if (response.status === 429 || response.status === 402) {
          const currentNowMs = now();
          const parsedHeaderReset = parseUpstreamResetHeaderMs(
            response.headers,
            currentNowMs,
          );
          if (parsedHeaderReset) {
            upstreamExhaustedUntilMs = parsedHeaderReset.resetAtMs;
            upstreamExhaustedWindow = parsedHeaderReset.resetWindow;
          } else {
            upstreamExhaustedUntilMs =
              config.provider === 'gemini-free'
                ? computeNextGeminiDailyResetMs(currentNowMs)
                : computeNextOpenRouterDailyResetMs(currentNowMs);
            upstreamExhaustedWindow = 'daily';
          }
          const exhaustedStatus = buildStatus('free_quota_exhausted');
          throw new FreeAiError(
            'free_quota_exhausted',
            FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
            429,
            exhaustedStatus,
          );
        }

        if (!response.ok) {
          throw new FreeAiError(
            'upstream_error',
            `외부 무료 AI 서비스가 오류 상태(${response.status})를 반환했습니다. 유료 폴백 없이 중단되었으며 로컬 추천 엔진을 계속 사용할 수 있습니다.`,
            502,
            buildStatus(),
          );
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new FreeAiError(
            'invalid_ai_response',
            '외부 AI 응답을 JSON으로 해석하지 못했습니다. 로컬 추천 엔진이나 수동 편집을 이용해 주세요.',
            502,
            buildStatus(),
          );
        }

        let validatedResult: FreeAiAssistResult;
        try {
          validatedResult = normalizeAndValidateAssistResult(
            payload,
            parsed.data,
            config,
          );
        } catch {
          throw new FreeAiError(
            'invalid_ai_response',
            '외부 AI 응답이 안전 스키마 검증을 통과하지 못했습니다. 로컬 추천 엔진이나 수동 편집을 이용해 주세요.',
            502,
            buildStatus(),
          );
        }

        setCacheEntry(cacheKey, validatedResult, now());
        return validatedResult;
      } finally {
        activeGlobal = Math.max(0, activeGlobal - 1);
        const remainingForUser = (activePerUser.get(normalizedUserKey) ?? 1) - 1;
        if (remainingForUser <= 0) {
          activePerUser.delete(normalizedUserKey);
        } else {
          activePerUser.set(normalizedUserKey, remainingForUser);
        }
      }
    },
  };
}

function createNoStoreJsonResponse(data: unknown, statusCode = 200): RouterResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
    },
    body: JSON.stringify(data),
  };
}

export interface FreeAiRouteHandlers {
  'GET /api/studio/ai/status': (
    context?: Partial<RouterContext>,
  ) => Promise<RouterResponse>;
  'POST /api/studio/ai/assist': (
    context?: Partial<RouterContext>,
  ) => Promise<RouterResponse>;
}

export function createFreeAiRoutes(
  service: FreeAiService = createFreeAiService(),
): FreeAiRouteHandlers {
  return {
    'GET /api/studio/ai/status': async (context = {}) => {
      if (context.query) {
        const queryByok = detectByokOrSecretExposure(context.query);
        if (!queryByok.safe) {
          const status = service.getStatus();
          return createNoStoreJsonResponse(
            {
              error: 'byok_forbidden',
              code: 'byok_forbidden',
              message:
                queryByok.violations[0] ??
                '사용자 API 키(BYOK) 입력은 허용되지 않습니다.',
              status,
              quotaStatus: status,
              renewal: status.renewal,
            },
            400,
          );
        }
      }
      const status = service.getStatus();
      return createNoStoreJsonResponse(status, 200);
    },

    'POST /api/studio/ai/assist': async (context = {}) => {
      try {
        if (context.query) {
          const queryByok = detectByokOrSecretExposure(context.query);
          if (!queryByok.safe) {
            throw new FreeAiError(
              'byok_forbidden',
              queryByok.violations[0] ??
                '사용자 API 키(BYOK) 입력은 허용되지 않습니다.',
              400,
              service.getStatus(),
            );
          }
        }

        const userId = context.user?.userId ?? 'anonymous-instructor';
        const result = await service.assist(userId, context.body);
        const status = service.getStatus();

        return createNoStoreJsonResponse(
          {
            ...result,
            result,
            status,
            quotaStatus: status,
          },
          200,
        );
      } catch (cause) {
        if (cause instanceof FreeAiError) {
          const status = cause.quotaStatus ?? service.getStatus();
          return createNoStoreJsonResponse(
            {
              error: cause.code,
              code: cause.code,
              message: cause.message,
              status,
              quotaStatus: status,
              renewal: cause.renewal ?? status.renewal,
            },
            cause.status,
          );
        }
        const status = service.getStatus();
        return createNoStoreJsonResponse(
          {
            error: 'upstream_error',
            code: 'upstream_error',
            message:
              '외부 무료 AI 요청을 처리하지 못했습니다. 로컬 추천 엔진이나 수동 편집을 이용해 주세요.',
            status,
            quotaStatus: status,
            renewal: status.renewal,
          },
          503,
        );
      }
    },
  };
}
