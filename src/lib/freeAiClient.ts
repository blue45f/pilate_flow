import { api } from '@appdeploy/client';
import {
  FREE_QUOTA_EXHAUSTED_HEADING,
  UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  detectByokOrSecretExposure,
  freeAiAssistResultSchema,
  inspectPayloadForSensitiveHealth,
  type FreeAiServerRequest,
  type SecretExposureCheckResult,
} from '../schemas/freeAiAssistantSchema';
import type {
  ClassDraftConditionsInput,
  EditableClassDraftResult,
  EditableMovementIdeaResult,
  EditableSequenceComposeResult,
  FreeAiAssistResult,
  FreeAiQuotaStatus,
  FreeAiRenewalInfo,
  MovementIdeaInput,
  P1ReusableBlockContract,
  SequenceComposeInput,
} from '../types/freeAiAssistant';
import type { ConditionTemplate, PilatesExercise } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  buildLocalClassDraft,
  buildLocalMovementIdea,
  composeSequenceFromReviewedItems,
} from '../utils/freeAiAssistantEngine';

export interface FreeAiTransport {
  getStatus: () => Promise<FreeAiQuotaStatus>;
  postAssist: (
    request: FreeAiServerRequest,
  ) => Promise<{ status: FreeAiQuotaStatus; result: FreeAiAssistResult }>;
}

export interface FreeAiClientControllerOptions {
  transport?: FreeAiTransport;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  maxConcurrentRequests?: number;
  now?: () => number;
  envRecord?: Record<string, unknown>;
}

export type FreeAiClientErrorCode =
  | 'byok_forbidden'
  | 'sensitive_health_blocked'
  | 'free_quota_exhausted'
  | 'concurrency_limit_exceeded'
  | 'unconfigured'
  | 'request_failed';

export class FreeAiClientError extends Error {
  readonly code: FreeAiClientErrorCode;
  readonly status: FreeAiQuotaStatus | null;
  readonly renewal: FreeAiRenewalInfo | null;

  constructor(
    code: FreeAiClientErrorCode,
    message: string,
    status: FreeAiQuotaStatus | null = null,
    renewal: FreeAiRenewalInfo | null = status?.renewal ?? null,
  ) {
    super(message);
    this.name = 'FreeAiClientError';
    this.code = code;
    this.status = status;
    this.renewal = renewal ?? status?.renewal ?? null;
  }
}

const BROWSER_EXPOSED_KEY_NAME_REGEX =
  /^(?:(?:VITE|PUBLIC|NEXT_PUBLIC|REACT_APP)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|GEMINI|OPENROUTER)[A-Z0-9_]*|GEMINI_API_KEY|OPENROUTER_API_KEY|API_KEY|OPENAI_API_KEY|BEARER_TOKEN|CLIENT_SECRET)$/i;

/**
 * Verifies that no API keys or secrets are exposed in the browser environment record.
 */
export function assertNoBrowserKeyExposure(
  envRecord?: Record<string, unknown>,
): SecretExposureCheckResult {
  const targetEnv: Record<string, unknown> =
    envRecord ??
    ((typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, unknown> }).env) ||
      {});

  const violations: string[] = [];
  for (const [key, value] of Object.entries(targetEnv)) {
    if (
      BROWSER_EXPOSED_KEY_NAME_REGEX.test(key) &&
      value !== undefined &&
      value !== null &&
      String(value).trim().length > 0
    ) {
      violations.push(
        `${key}: 브라우저 환경 변수에 외부 AI API 키 또는 시크릿을 노출할 수 없습니다.`,
      );
    }
  }

  const deepCheck = detectByokOrSecretExposure(targetEnv);
  for (const v of deepCheck.violations) {
    if (!violations.includes(v)) {
      violations.push(v);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

export function createDefaultFreeAiStatus(
  overrides: Partial<FreeAiQuotaStatus> = {},
): FreeAiQuotaStatus {
  return {
    provider: 'none',
    model: null,
    enabled: false,
    exhausted: false,
    reason: 'unconfigured',
    minuteLimit: 10,
    minuteUsed: 0,
    minuteRemaining: 10,
    dailyLimit: 50,
    dailyUsed: 0,
    dailyRemaining: 50,
    activeRequests: 0,
    maxConcurrentRequests: 1,
    cacheEntries: 0,
    statusMessageKo:
      '외부 무료 AI가 설정되지 않아 로컬 규칙 엔진·수동 편집·저장 프리셋 모드로 동작합니다.',
    renewal: null,
    ...overrides,
  };
}

function buildFallbackRenewalInfo(nowMs: number, provider: FreeAiQuotaStatus['provider']): FreeAiRenewalInfo {
  const nextUtcMidnight = new Date(nowMs);
  nextUtcMidnight.setUTCHours(24, 0, 0, 0);
  const resetAtMs = nextUtcMidnight.getTime();
  const remainingSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  const resetTimezone = provider === 'gemini-free' ? 'America/Los_Angeles' : 'UTC';
  const tzLabel =
    resetTimezone === 'America/Los_Angeles'
      ? '미국 태평양 시간(PT) 자정'
      : 'UTC 자정(한국시간 오전 09:00)';

  return {
    resetAt: new Date(resetAtMs).toISOString(),
    resetWindow: 'daily',
    resetTimezone,
    remainingSeconds,
    formattedResetKo: `갱신 예정: ${tzLabel} (${new Date(resetAtMs).toISOString()})`,
    policyNoteKo:
      '무료 한도 소진 시 유료 모델로 자동 전환되지 않으며, 갱신 시각 이후 무료 호출이 재개됩니다.',
  };
}

function formatQuotaExhaustedMessage(renewal: FreeAiRenewalInfo | null): string {
  const renewalPart = renewal?.formattedResetKo
    ? ` ${renewal.formattedResetKo}.`
    : ' 일일 또는 분당 무료 한도 갱신 시각 이후 다시 시도해 주세요.';
  return `${FREE_QUOTA_EXHAUSTED_HEADING}: 현재 무료 AI 제공자 한도가 모두 소진되어 외부 AI 호출이 차단되었습니다.${renewalPart} 유료 전환 없이 로컬 추천 엔진·수동 편집·저장 프리셋은 계속 사용할 수 있습니다.`;
}

function stableJsonKey(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonKey).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJsonKey(v)}`).join(',')}}`;
}

function unwrapApiData(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') {
      return obj.data as Record<string, unknown>;
    }
    return obj;
  }
  return {};
}

function parseQuotaStatusPayload(raw: unknown, fallback: FreeAiQuotaStatus): FreeAiQuotaStatus {
  const data = unwrapApiData(raw);
  const candidate =
    (data.status && typeof data.status === 'object'
      ? (data.status as Record<string, unknown>)
      : null) ??
    (data.quotaStatus && typeof data.quotaStatus === 'object'
      ? (data.quotaStatus as Record<string, unknown>)
      : null) ??
    data;

  if (
    typeof candidate.provider === 'string' &&
    typeof candidate.enabled === 'boolean' &&
    typeof candidate.exhausted === 'boolean'
  ) {
    return {
      ...fallback,
      ...(candidate as Partial<FreeAiQuotaStatus>),
      renewal:
        (candidate.renewal as FreeAiRenewalInfo | null | undefined) ??
        (data.renewal as FreeAiRenewalInfo | null | undefined) ??
        fallback.renewal,
    };
  }
  return fallback;
}

function extractErrorDetails(cause: unknown): {
  code?: string;
  httpStatus?: number;
  message?: string;
  status?: FreeAiQuotaStatus;
  renewal?: FreeAiRenewalInfo | null;
  isLocalSdkUnavailable: boolean;
} {
  if (cause instanceof FreeAiClientError) {
    return {
      code: cause.code,
      message: cause.message,
      status: cause.status ?? undefined,
      renewal: cause.renewal,
      isLocalSdkUnavailable: false,
    };
  }

  const errObj =
    cause && typeof cause === 'object' ? (cause as Record<string, unknown>) : {};
  const responseObj =
    errObj.response && typeof errObj.response === 'object'
      ? (errObj.response as Record<string, unknown>)
      : {};
  const bodyObj =
    responseObj.data && typeof responseObj.data === 'object'
      ? (responseObj.data as Record<string, unknown>)
      : errObj.data && typeof errObj.data === 'object'
        ? (errObj.data as Record<string, unknown>)
        : errObj;

  const message =
    typeof bodyObj.message === 'string'
      ? bodyObj.message
      : typeof errObj.message === 'string'
        ? errObj.message
        : undefined;

  const isLocalSdkUnavailable =
    typeof message === 'string' &&
    message.includes('서버 계정 백업은 배포된 앱에서 사용할 수 있습니다');

  const code =
    typeof bodyObj.code === 'string'
      ? bodyObj.code
      : typeof bodyObj.error === 'string'
        ? bodyObj.error
        : typeof errObj.code === 'string'
          ? errObj.code
          : undefined;

  const httpStatus =
    typeof responseObj.status === 'number'
      ? responseObj.status
      : typeof errObj.status === 'number'
        ? errObj.status
        : typeof errObj.statusCode === 'number'
          ? errObj.statusCode
          : undefined;

  const fallbackStatus = createDefaultFreeAiStatus();
  const parsedStatus =
    bodyObj.status || bodyObj.quotaStatus
      ? parseQuotaStatusPayload(bodyObj, fallbackStatus)
      : undefined;

  const renewal =
    (bodyObj.renewal as FreeAiRenewalInfo | null | undefined) ??
    parsedStatus?.renewal ??
    undefined;

  return {
    code,
    httpStatus,
    message,
    status: parsedStatus,
    renewal,
    isLocalSdkUnavailable,
  };
}

function createDefaultAppDeployTransport(): FreeAiTransport {
  return {
    getStatus: async () => {
      const response = await api.get('/api/studio/ai/status');
      return parseQuotaStatusPayload(response, createDefaultFreeAiStatus());
    },
    postAssist: async (request: FreeAiServerRequest) => {
      const response = await api.post('/api/studio/ai/assist', request);
      const data = unwrapApiData(response);
      const status = parseQuotaStatusPayload(
        data,
        createDefaultFreeAiStatus({
          provider: 'gemini-free',
          enabled: true,
          exhausted: false,
          reason: 'ready',
        }),
      );
      const rawResult = data.result && typeof data.result === 'object' ? data.result : data;
      const parsedResult = freeAiAssistResultSchema.parse(rawResult);
      return { status, result: parsedResult };
    },
  };
}

function toReviewedExerciseCandidates(exercises: readonly PilatesExercise[]) {
  return exercises
    .filter((ex) => isExerciseAutoEligible(ex))
    .slice(0, 100)
    .map((ex) => ({
      id: ex.id.slice(0, 120),
      nameKo: ex.nameKo.slice(0, 160),
      nameEn: ex.nameEn.slice(0, 160),
      apparatus: ex.apparatus,
      blockCategory: ex.blockCategory,
      level: ex.level,
      defaultDurationMin: Math.min(30, Math.max(0.5, ex.defaultDurationMin)),
      bodyPosition: ex.bodyPosition,
      spinalPlanes: ex.spinalPlanes.slice(0, 5),
      isReviewed: true as const,
    }));
}

function toReviewedBlockCandidates(
  blocks: readonly P1ReusableBlockContract[],
  exercises: readonly PilatesExercise[],
) {
  const exercisesMap = new Map(exercises.map((ex) => [ex.id, ex]));

  return blocks
    .filter((block) => block.isReviewed === true)
    .slice(0, 30)
    .map((block) => {
      const reviewedSteps = block.steps
        .filter((step) => {
          const ex = exercisesMap.get(step.exerciseId);
          if (ex) return isExerciseAutoEligible(ex);
          return Boolean(step.exerciseSnapshot);
        })
        .slice(0, 25)
        .map((step) => {
          const ex = exercisesMap.get(step.exerciseId);
          return {
            exerciseId: step.exerciseId.slice(0, 120),
            nameKo: (ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? step.exerciseId).slice(0, 160),
            nameEn: (ex?.nameEn ?? step.exerciseSnapshot?.nameEn ?? '').slice(0, 160),
            apparatus: ex?.apparatus ?? step.exerciseSnapshot?.apparatus ?? 'reformer',
            blockCategory: step.blockCategory,
            durationMin: Math.min(30, Math.max(0.5, step.durationMin)),
            selectedLayer: step.selectedLayer,
            ...(step.instructorNote
              ? { instructorNote: step.instructorNote.slice(0, 500) }
              : {}),
          };
        });

      return {
        id: block.id.slice(0, 120),
        title: block.title.slice(0, 160),
        apparatus: block.apparatus,
        level: block.level,
        category: block.category,
        durationMin: Math.min(60, Math.max(1, block.durationMin)),
        isReviewed: true as const,
        steps: reviewedSteps,
      };
    })
    .filter((block) => block.steps.length > 0);
}

export function createFreeAiClient(options: FreeAiClientControllerOptions = {}) {
  const transport = options.transport ?? createDefaultAppDeployTransport();
  const cacheTtlMs = options.cacheTtlMs ?? 15 * 60 * 1000;
  const maxCacheEntries = options.maxCacheEntries ?? 100;
  const maxConcurrentRequests = Math.max(1, options.maxConcurrentRequests ?? 1);
  const now = options.now ?? (() => Date.now());

  const cache = new Map<string, { result: FreeAiAssistResult; expiresAtMs: number }>();
  let activeRequests = 0;
  let serverKnownUnconfigured = false;

  let currentStatus: FreeAiQuotaStatus = createDefaultFreeAiStatus({
    maxConcurrentRequests,
  });

  function syncStatusCounters(): FreeAiQuotaStatus {
    const nowMs = now();
    for (const [key, entry] of cache.entries()) {
      if (nowMs >= entry.expiresAtMs) {
        cache.delete(key);
      }
    }

    if (
      currentStatus.exhausted &&
      currentStatus.renewal?.resetAt &&
      Number.isFinite(Date.parse(currentStatus.renewal.resetAt)) &&
      Date.parse(currentStatus.renewal.resetAt) <= nowMs
    ) {
      currentStatus = {
        ...currentStatus,
        exhausted: false,
        reason: currentStatus.enabled ? 'ready' : 'unconfigured',
        renewal: null,
      };
    }

    currentStatus = {
      ...currentStatus,
      activeRequests,
      maxConcurrentRequests,
      cacheEntries: cache.size,
    };
    return { ...currentStatus };
  }

  function guardByokAndEnv(inputPayload: unknown): void {
    const envCheck = assertNoBrowserKeyExposure(options.envRecord);
    if (!envCheck.safe) {
      throw new FreeAiClientError(
        'byok_forbidden',
        envCheck.violations[0] ??
          '브라우저 환경에 외부 AI API 키 노출이 감지되어 요청이 차단되었습니다.',
        syncStatusCounters(),
        currentStatus.renewal,
      );
    }

    const inputCheck = detectByokOrSecretExposure(inputPayload);
    if (!inputCheck.safe) {
      throw new FreeAiClientError(
        'byok_forbidden',
        inputCheck.violations[0] ??
          '사용자 API 키(BYOK) 입력 또는 시크릿 전달은 허용되지 않습니다.',
        syncStatusCounters(),
        currentStatus.renewal,
      );
    }
  }

  function guardSensitiveHealthForExternalAi(inputPayload: unknown): void {
    const inspection = inspectPayloadForSensitiveHealth(inputPayload);
    if (inspection.hasSensitiveData) {
      throw new FreeAiClientError(
        'sensitive_health_blocked',
        inspection.warningMessageKo ??
          '민감 건강·개인정보는 무료 외부 AI로 전송할 수 없습니다.',
        syncStatusCounters(),
        null,
      );
    }
  }

  function getCachedResult(cacheKey: string): FreeAiAssistResult | null {
    const nowMs = now();
    const entry = cache.get(cacheKey);
    if (!entry) return null;
    if (nowMs >= entry.expiresAtMs) {
      cache.delete(cacheKey);
      return null;
    }
    return {
      ...entry.result,
      cached: true,
    };
  }

  function setCachedResult(cacheKey: string, result: FreeAiAssistResult): void {
    const nowMs = now();
    for (const [key, entry] of cache.entries()) {
      if (nowMs >= entry.expiresAtMs) {
        cache.delete(key);
      }
    }
    while (cache.size >= maxCacheEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      cache.delete(oldestKey);
    }
    cache.set(cacheKey, {
      result: { ...result, cached: false },
      expiresAtMs: nowMs + cacheTtlMs,
    });
    syncStatusCounters();
  }

  async function executeExternalOrFallback<T extends FreeAiAssistResult>(params: {
    task: FreeAiServerRequest['task'];
    cachePayload: unknown;
    buildServerRequest: () => FreeAiServerRequest;
    runLocalFallback: () => T;
    preferLocalOnly?: boolean;
  }): Promise<{ result: T; status: FreeAiQuotaStatus; usedLocalFallback: boolean }> {
    if (params.preferLocalOnly) {
      const localResult = params.runLocalFallback();
      return {
        result: localResult,
        status: syncStatusCounters(),
        usedLocalFallback: true,
      };
    }

    syncStatusCounters();

    if (activeRequests >= maxConcurrentRequests) {
      const statusSnapshot = {
        ...syncStatusCounters(),
        reason: 'concurrency_limit_exceeded' as const,
      };
      throw new FreeAiClientError(
        'concurrency_limit_exceeded',
        '동시 AI 요청 한도를 초과했습니다. 진행 중인 요청이 완료된 후 다시 시도해 주세요.',
        statusSnapshot,
        statusSnapshot.renewal,
      );
    }

    if (currentStatus.exhausted) {
      const renewal =
        currentStatus.renewal ?? buildFallbackRenewalInfo(now(), currentStatus.provider);
      currentStatus = {
        ...currentStatus,
        exhausted: true,
        reason: 'free_quota_exhausted',
        renewal,
        statusMessageKo: formatQuotaExhaustedMessage(renewal),
      };
      throw new FreeAiClientError(
        'free_quota_exhausted',
        formatQuotaExhaustedMessage(renewal),
        syncStatusCounters(),
        renewal,
      );
    }

    const cacheKey = `${params.task}:${stableJsonKey(params.cachePayload)}`;
    const cached = getCachedResult(cacheKey);
    if (cached && cached.kind === params.task) {
      return {
        result: cached as T,
        status: syncStatusCounters(),
        usedLocalFallback: false,
      };
    }

    if (serverKnownUnconfigured) {
      const localResult = params.runLocalFallback();
      return {
        result: localResult,
        status: syncStatusCounters(),
        usedLocalFallback: true,
      };
    }

    const serverRequest = params.buildServerRequest();
    activeRequests += 1;
    syncStatusCounters();

    try {
      const response = await transport.postAssist(serverRequest);
      if (response.status) {
        currentStatus = {
          ...currentStatus,
          ...response.status,
        };
      }

      if (
        response.status &&
        !response.status.enabled &&
        (response.status.reason === 'unconfigured' ||
          response.status.reason === 'billing_guard_unconfirmed')
      ) {
        serverKnownUnconfigured = true;
        currentStatus = createDefaultFreeAiStatus({
          ...response.status,
          enabled: false,
          exhausted: false,
          reason: 'unconfigured',
          maxConcurrentRequests,
          cacheEntries: cache.size,
        });
        const localResult = params.runLocalFallback();
        return {
          result: localResult,
          status: syncStatusCounters(),
          usedLocalFallback: true,
        };
      }

      if (
        response.status?.exhausted ||
        response.status?.reason === 'free_quota_exhausted'
      ) {
        const renewal =
          response.status.renewal ??
          buildFallbackRenewalInfo(now(), response.status.provider);
        currentStatus = {
          ...currentStatus,
          ...response.status,
          exhausted: true,
          reason: 'free_quota_exhausted',
          renewal,
          statusMessageKo: formatQuotaExhaustedMessage(renewal),
        };
        throw new FreeAiClientError(
          'free_quota_exhausted',
          formatQuotaExhaustedMessage(renewal),
          syncStatusCounters(),
          renewal,
        );
      }

      const normalizedResult: T = {
        ...(response.result as T),
        cached: false,
        guaranteesSafetyOrEffect: false,
        safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
      };

      setCachedResult(cacheKey, normalizedResult);
      return {
        result: normalizedResult,
        status: syncStatusCounters(),
        usedLocalFallback: false,
      };
    } catch (cause) {
      if (cause instanceof FreeAiClientError) {
        throw cause;
      }

      const details = extractErrorDetails(cause);
      if (details.status) {
        currentStatus = {
          ...currentStatus,
          ...details.status,
        };
      }

      if (
        details.isLocalSdkUnavailable ||
        details.code === 'unconfigured' ||
        details.code === 'billing_guard_unconfirmed' ||
        details.status?.reason === 'unconfigured' ||
        details.status?.reason === 'billing_guard_unconfirmed'
      ) {
        serverKnownUnconfigured = true;
        currentStatus = createDefaultFreeAiStatus({
          ...(details.status ?? {}),
          enabled: false,
          exhausted: false,
          reason: 'unconfigured',
          maxConcurrentRequests,
          cacheEntries: cache.size,
        });
        const localResult = params.runLocalFallback();
        return {
          result: localResult,
          status: syncStatusCounters(),
          usedLocalFallback: true,
        };
      }

      if (details.code === 'byok_forbidden') {
        throw new FreeAiClientError(
          'byok_forbidden',
          details.message ?? '사용자 API 키(BYOK) 입력은 허용되지 않습니다.',
          syncStatusCounters(),
          currentStatus.renewal,
        );
      }

      if (details.code === 'sensitive_health_blocked') {
        throw new FreeAiClientError(
          'sensitive_health_blocked',
          details.message ??
            '민감 건강·개인정보는 무료 외부 AI로 전송할 수 없습니다.',
          syncStatusCounters(),
          null,
        );
      }

      if (details.code === 'concurrency_limit_exceeded') {
        throw new FreeAiClientError(
          'concurrency_limit_exceeded',
          details.message ??
            '동시 AI 요청 한도를 초과했습니다. 진행 중인 요청이 완료된 후 다시 시도해 주세요.',
          syncStatusCounters(),
          currentStatus.renewal,
        );
      }

      if (
        details.code === 'free_quota_exhausted' ||
        details.httpStatus === 429 ||
        details.status?.exhausted ||
        details.status?.reason === 'free_quota_exhausted'
      ) {
        const renewal =
          details.renewal ??
          currentStatus.renewal ??
          buildFallbackRenewalInfo(now(), currentStatus.provider);
        const message =
          details.message &&
          details.message.includes(FREE_QUOTA_EXHAUSTED_HEADING) &&
          (!renewal.formattedResetKo || details.message.includes(renewal.formattedResetKo))
            ? details.message
            : formatQuotaExhaustedMessage(renewal);

        currentStatus = {
          ...currentStatus,
          enabled: true,
          exhausted: true,
          reason: 'free_quota_exhausted',
          minuteRemaining: 0,
          renewal,
          statusMessageKo: message,
        };

        throw new FreeAiClientError(
          'free_quota_exhausted',
          message,
          syncStatusCounters(),
          renewal,
        );
      }

      throw new FreeAiClientError(
        'request_failed',
        details.message ??
          '외부 무료 AI 요청 처리에 실패했습니다. 로컬 추천 엔진이나 수동 편집을 이용해 주세요.',
        syncStatusCounters(),
        currentStatus.renewal,
      );
    } finally {
      activeRequests = Math.max(0, activeRequests - 1);
      syncStatusCounters();
    }
  }

  return {
    getQuotaStatus(): FreeAiQuotaStatus {
      return syncStatusCounters();
    },

    async refreshQuotaStatus(): Promise<FreeAiQuotaStatus> {
      const envCheck = assertNoBrowserKeyExposure(options.envRecord);
      if (!envCheck.safe) {
        throw new FreeAiClientError(
          'byok_forbidden',
          envCheck.violations[0] ??
            '브라우저 환경에 외부 AI API 키 노출이 감지되어 요청이 차단되었습니다.',
          syncStatusCounters(),
          currentStatus.renewal,
        );
      }

      try {
        const status = await transport.getStatus();
        if (
          !status.enabled &&
          (status.reason === 'unconfigured' ||
            status.reason === 'billing_guard_unconfirmed')
        ) {
          serverKnownUnconfigured = true;
          currentStatus = createDefaultFreeAiStatus({
            ...status,
            enabled: false,
            exhausted: false,
            reason: 'unconfigured',
            maxConcurrentRequests,
            cacheEntries: cache.size,
          });
        } else {
          serverKnownUnconfigured = false;
          currentStatus = {
            ...currentStatus,
            ...status,
          };
        }
        return syncStatusCounters();
      } catch (cause) {
        const details = extractErrorDetails(cause);
        if (
          details.isLocalSdkUnavailable ||
          details.code === 'unconfigured' ||
          details.code === 'billing_guard_unconfirmed'
        ) {
          serverKnownUnconfigured = true;
          currentStatus = createDefaultFreeAiStatus({
            enabled: false,
            exhausted: false,
            reason: 'unconfigured',
            maxConcurrentRequests,
            cacheEntries: cache.size,
          });
          return syncStatusCounters();
        }
        throw new FreeAiClientError(
          'request_failed',
          details.message ?? '무료 AI 상태 조회에 실패했습니다.',
          syncStatusCounters(),
          currentStatus.renewal,
        );
      }
    },

    async requestClassDraft(
      input: ClassDraftConditionsInput,
      exercises: readonly PilatesExercise[],
      conditionTemplates: readonly ConditionTemplate[] = [],
      requestOptions?: { preferLocalOnly?: boolean },
    ): Promise<{
      result: EditableClassDraftResult;
      status: FreeAiQuotaStatus;
      usedLocalFallback: boolean;
    }> {
      guardByokAndEnv(input);
      if (!requestOptions?.preferLocalOnly) {
        guardSensitiveHealthForExternalAi(input);
      }

      const reviewedCatalog = toReviewedExerciseCandidates(exercises);

      return executeExternalOrFallback<EditableClassDraftResult>({
        task: 'class-draft',
        cachePayload: {
          conditions: input,
          reviewedIds: reviewedCatalog.map((item) => item.id),
        },
        buildServerRequest: () => ({
          task: 'class-draft',
          conditions: input,
          reviewedCatalog,
        }),
        runLocalFallback: () =>
          buildLocalClassDraft(input, exercises, conditionTemplates),
        preferLocalOnly: requestOptions?.preferLocalOnly,
      });
    },

    async requestMovementIdea(
      input: MovementIdeaInput,
      requestOptions?: { preferLocalOnly?: boolean },
    ): Promise<{
      result: EditableMovementIdeaResult;
      status: FreeAiQuotaStatus;
      usedLocalFallback: boolean;
    }> {
      guardByokAndEnv(input);
      if (!requestOptions?.preferLocalOnly) {
        guardSensitiveHealthForExternalAi(input);
      }

      return executeExternalOrFallback<EditableMovementIdeaResult>({
        task: 'movement-idea',
        cachePayload: input,
        buildServerRequest: () => ({
          task: 'movement-idea',
          idea: input,
        }),
        runLocalFallback: () => buildLocalMovementIdea(input),
        preferLocalOnly: requestOptions?.preferLocalOnly,
      });
    },

    async requestSequenceCompose(
      input: SequenceComposeInput,
      exercises: readonly PilatesExercise[],
      reusableBlocks: readonly P1ReusableBlockContract[] = [],
      requestOptions?: { preferLocalOnly?: boolean },
    ): Promise<{
      result: EditableSequenceComposeResult;
      status: FreeAiQuotaStatus;
      usedLocalFallback: boolean;
    }> {
      guardByokAndEnv(input);
      if (!requestOptions?.preferLocalOnly) {
        guardSensitiveHealthForExternalAi(input);
      }

      const reviewedCatalog = toReviewedExerciseCandidates(exercises);
      const reviewedBlocks = toReviewedBlockCandidates(reusableBlocks, exercises);

      const response = await executeExternalOrFallback<EditableSequenceComposeResult>({
        task: 'sequence-compose',
        cachePayload: {
          compose: input,
          reviewedIds: reviewedCatalog.map((item) => item.id),
          reviewedBlockIds: reviewedBlocks.map((item) => item.id),
        },
        buildServerRequest: () => ({
          task: 'sequence-compose',
          compose: input,
          reviewedCatalog,
          ...(reviewedBlocks.length > 0 ? { reviewedBlocks } : {}),
        }),
        runLocalFallback: () =>
          composeSequenceFromReviewedItems(input, exercises, reusableBlocks),
        preferLocalOnly: requestOptions?.preferLocalOnly,
      });

      if (!response.usedLocalFallback) {
        // Ensure client-side unreviewed exclusion invariants are strictly enforced on external results too
        const localAudit = composeSequenceFromReviewedItems(
          input,
          exercises,
          reusableBlocks,
        );
        const allowedExerciseIds = new Set(
          localAudit.steps.map((s) => s.exerciseId),
        );
        const filteredSteps = response.result.steps
          .filter((step) => allowedExerciseIds.has(step.exerciseId))
          .map((step, idx) => ({
            ...step,
            order: idx + 1,
            isReviewed: true as const,
          }));
        const mergedExcluded = [
          ...new Set([
            ...response.result.excludedUnreviewedIds,
            ...localAudit.excludedUnreviewedIds,
          ]),
        ];
        return {
          ...response,
          result: {
            ...response.result,
            steps: filteredSteps,
            excludedUnreviewedIds: mergedExcluded,
            guaranteesSafetyOrEffect: false,
            safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
          },
        };
      }

      return response;
    },

    clearCache(): void {
      cache.clear();
      syncStatusCounters();
    },
  };
}

export type FreeAiClient = ReturnType<typeof createFreeAiClient>;

export const defaultFreeAiClient = createFreeAiClient();
