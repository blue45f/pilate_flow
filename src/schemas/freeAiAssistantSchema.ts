import {
  inspectSensitiveHealthText,
  type SensitiveHealthInspection,
} from '../utils/sensitiveHealthPrivacy';
export {
  inspectSensitiveHealthText,
  type SensitiveHealthInspection,
} from '../utils/sensitiveHealthPrivacy';
import { z } from 'zod';
import {
  apparatusSchema,
  categorySchema as blockCategorySchema,
  layerSchema,
  levelSchema,
  propSchema,
  textSchema,
} from './cloudBackupSchema';

export const bodyPositionSchema = z.enum([
  'supine',
  'prone',
  'side-lying',
  'seated',
  'kneeling',
  'standing',
  'quadruped',
]);
export const spinalPlaneSchema = z.enum(['flexion', 'extension', 'lateral', 'rotation', 'neutral']);

export const UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER =
  '미검토 창작 동작 및 AI 제안은 안전성이나 운동·교정·치료 효과를 보장하지 않습니다. 실제 수업에 적용하기 전 강사가 대상자 상태, 기구·스프링 세팅, 동작 범위를 직접 검토해야 합니다.' as const;

export const FREE_QUOTA_EXHAUSTED_HEADING = '무료 사용량 소진' as const;

export const GEMINI_FREE_TIER_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

export type GeminiFreeTierModel = (typeof GEMINI_FREE_TIER_MODELS)[number];

export const OPENAI_ALLOWED_MODELS = [
  'gpt-4o-mini',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
] as const;

export type OpenAiAllowedModel = (typeof OPENAI_ALLOWED_MODELS)[number];

export function isAllowedOpenAiModel(model: string): boolean {
  const normalized = model.trim();
  if (!normalized || normalized.length > 80) return false;
  return (
    (OPENAI_ALLOWED_MODELS as readonly string[]).includes(normalized) ||
    /^gpt-(?:4o|4\.1|5)(?:-[a-z0-9._-]+)?$/i.test(normalized)
  );
}

/**
 * Checks whether a Gemini model ID is guaranteed to be eligible on an Unpaid Free Tier project.
 */
export function isGuaranteedFreeGeminiModel(model: string): model is GeminiFreeTierModel {
  const normalized = model.trim();
  return (GEMINI_FREE_TIER_MODELS as readonly string[]).includes(normalized);
}

/**
 * Checks whether an OpenRouter model ID is guaranteed to be $0 token cost under OpenRouter's official rules:
 * Must be 'openrouter/free' or end strictly with ':free'.
 */
export function isGuaranteedFreeOpenRouterModel(model: string): boolean {
  const normalized = model.trim();
  if (!normalized || normalized.length > 160) return false;
  if (normalized === 'openrouter/free') return true;
  return /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/i.test(normalized);
}

/**
 * Forbidden BYOK / client-side secret field names.
 * User BYOK input and browser key exposure are strictly prohibited.
 */
const FORBIDDEN_SECRET_FIELD_PATTERN =
  /^(?:api[_-]?key|openai[_-]?api[_-]?key|openai[_-]?org[_-]?id|openai[_-]?project[_-]?id|gemini[_-]?api[_-]?key|openrouter[_-]?api[_-]?key|client[_-]?secret|bearer[_-]?token|authorization|x[_-]?api[_-]?key|byok|user[_-]?api[_-]?key|secret[_-]?key)$/i;

const FORBIDDEN_SECRET_VALUE_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{20,}\b/, // Google API key pattern
  /\bsk-or-v1-[0-9a-fA-F]{16,}\b/, // OpenRouter API key pattern
  /\bsk-(?:proj-|svcacct-)?[0-9A-Za-z_-]{20,}\b/, // OpenAI / generic sk- key pattern
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
        if (
          FORBIDDEN_SECRET_FIELD_PATTERN.test(key) ||
          /^VITE_.*(?:KEY|TOKEN|SECRET|OPENAI)/i.test(key)
        ) {
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

/**
 * Strips any legacy or accidental BYOK fields from a shallow/nested record so keys are never persisted or forwarded.
 */
export function stripForbiddenKeyFields<T extends Record<string, unknown>>(record: T): T {
  function strip(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !FORBIDDEN_SECRET_FIELD_PATTERN.test(key) &&
            !/^VITE_.*(?:KEY|TOKEN|SECRET|OPENAI)/i.test(key),
        )
        .map(([key, child]) => [key, strip(child)]),
    );
  }
  return strip(record) as T;
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

export const strengthenAreaSchema = z.enum([
  'core',
  'glute-lower',
  'posture-upper',
  'mobility-rehab',
  'full-body',
]);

export const classDraftConditionsInputSchema = z
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

export const movementIdeaInputSchema = z
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

export const reviewedExerciseCandidateSchema = z
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

export const catalogSearchCandidateSchema = z
  .object({
    id: textSchema.min(1).max(120),
    nameKo: textSchema.min(1).max(160),
    nameEn: textSchema.max(160),
    apparatus: apparatusSchema,
    blockCategory: blockCategorySchema,
    level: levelSchema,
    defaultDurationMin: z.number().finite().min(0.5).max(30),
    springs: textSchema.max(160).default(''),
    bodyPosition: bodyPositionSchema.optional(),
    targetMuscles: z.array(textSchema.max(80)).max(8).optional(),
    cues: z.array(textSchema.max(240)).max(4).optional(),
  })
  .strict();

export const reviewedBlockCandidateSchema = z
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

export const sequenceComposeInputSchema = z
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

export const movementSearchInputSchema = z
  .object({
    queryText: textSchema.min(2, '찾고 싶은 동작 상황을 2자 이상 입력해 주세요.').max(300),
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    level: levelSchema,
    strengthenArea: strengthenAreaSchema.optional(),
    maxResults: z.number().int().min(1).max(8).optional(),
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
    z
      .object({
        task: z.literal('exercise-search'),
        search: movementSearchInputSchema,
        catalogCandidates: z.array(catalogSearchCandidateSchema).max(100),
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
          '민감 건강·개인정보는 외부 AI로 전송할 수 없습니다.',
      });
    }
  });

export type FreeAiServerRequest = z.infer<typeof freeAiServerRequestSchema>;

const aiResultSourceSchema = z.enum(['openai-api', 'external-free-ai', 'local-rule-engine']);
const aiProviderIdSchema = z.enum(['openai', 'gemini-free', 'openrouter-free', 'none']);

export const editableDraftStepSchema = z.object({
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

export const editableClassDraftResultSchema = z.object({
  kind: z.literal('class-draft'),
  source: aiResultSourceSchema,
  provider: aiProviderIdSchema,
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

export const editableMovementIdeaResultSchema = z.object({
  kind: z.literal('movement-idea'),
  source: aiResultSourceSchema,
  provider: aiProviderIdSchema,
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

export const editableSequenceComposeResultSchema = z.object({
  kind: z.literal('sequence-compose'),
  source: aiResultSourceSchema,
  provider: aiProviderIdSchema,
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

export const movementSearchRecommendationItemSchema = z.object({
  exerciseId: textSchema.min(1).max(120),
  nameKo: textSchema.min(1).max(160),
  nameEn: textSchema.max(160),
  apparatus: apparatusSchema,
  blockCategory: blockCategorySchema,
  level: levelSchema,
  defaultDurationMin: z.number().finite().min(0.5).max(30),
  springs: textSchema.max(160),
  matchReasonKo: textSchema.min(2).max(300),
  cueHighlightKo: textSchema.min(2).max(300),
  setupCheckKo: textSchema.min(2).max(300),
});

export const editableMovementSearchResultSchema = z.object({
  kind: z.literal('exercise-search'),
  source: aiResultSourceSchema,
  provider: aiProviderIdSchema,
  model: z.string().nullable(),
  cached: z.boolean(),
  querySummaryKo: textSchema.min(2).max(300),
  recommendations: z.array(movementSearchRecommendationItemSchema).max(8),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

export const freeAiAssistResultSchema = z.discriminatedUnion('kind', [
  editableClassDraftResultSchema,
  editableMovementIdeaResultSchema,
  editableSequenceComposeResultSchema,
  editableMovementSearchResultSchema,
]);
