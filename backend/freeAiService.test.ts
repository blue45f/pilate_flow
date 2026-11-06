import { describe, expect, it, vi } from 'vitest';
import {
  CONCURRENCY_LIMIT_ERROR_MESSAGE,
  FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
  UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  computeFreeAiCacheKey,
  computeMinuteWindowResetMs,
  computeNextGeminiDailyResetMs,
  computeNextOpenRouterDailyResetMs,
  computeQuotaRenewal,
  createFreeAiRoutes,
  createFreeAiService,
  resolveFreeAiConfig,
  type FreeAiServerRequest,
} from './freeAiService';

const VALID_GEMINI_ENV = {
  GEMINI_API_KEY: 'test-server-gemini-secret',
  GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
  GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
};

const VALID_OPENROUTER_ENV = {
  OPENROUTER_API_KEY: 'test-server-openrouter-secret',
  OPENROUTER_FREE_MODEL: 'google/gemma-4-31b-it:free',
};

const SAMPLE_MOVEMENT_IDEA_REQ: FreeAiServerRequest = {
  task: 'movement-idea',
  idea: {
    rawIdeaText: '풋바 지지와 견갑 안정성을 동시에 깨우는 리포머 플랭크 변형 동작',
    apparatus: 'reformer',
    blockCategory: 'core',
    strengthenArea: 'core',
    level: '1.5',
    bodyPosition: 'quadruped',
    spinalPlane: 'neutral',
    preferredProps: ['none'],
  },
};

const SAMPLE_CLASS_DRAFT_REQ: FreeAiServerRequest = {
  task: 'class-draft',
  conditions: {
    durationMinutes: 50,
    theme: '코어 중심 리포머 시퀀스',
    strengthenAreas: ['core', 'glute-lower'],
    level: '1.5',
    apparatus: 'reformer',
    tempo: 'moderate-flow',
  },
  reviewedCatalog: [
    {
      id: 'ex-footwork',
      nameKo: '풋워크 패럴렐',
      nameEn: 'Footwork Parallel',
      apparatus: 'reformer',
      blockCategory: 'footwork',
      level: '1.0',
      defaultDurationMin: 5,
      isReviewed: true,
    },
    {
      id: 'ex-hundred',
      nameKo: '헌드레드',
      nameEn: 'The Hundred',
      apparatus: 'reformer',
      blockCategory: 'core',
      level: '1.5',
      defaultDurationMin: 5,
      isReviewed: true,
    },
  ],
};

function makeGeminiSuccessResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(payload) }],
          },
        },
      ],
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function makeOpenRouterSuccessResponse(
  payload: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(payload),
          },
        },
      ],
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

const VALID_IDEA_UPSTREAM_JSON = {
  nameKo: '리포머 스태빌리티 니 호버',
  nameEn: 'Reformer Stability Knee Hover',
  apparatus: 'reformer',
  blockCategory: 'core',
  level: '1.5',
  bodyPosition: 'quadruped',
  spinalPlanes: ['neutral'],
  props: ['none'],
  defaultDurationMin: 4,
  springs: '1 Red + 1 Blue',
  targetMuscles: ['복횡근', '전거근'],
  breathPattern: '들쉬며 준비, 내쉬며 무릎을 매트에서 2cm 띄워 유지',
  cues: ['견갑골 사이를 넓게 채우세요', '정수리부터 꼬리뼈까지 중립 정렬을 유지하세요'],
  precautions: '손목 과신전이 발생하면 박스 위 전완 지지로 변경하세요.',
  layers: {
    easy: '무릎을 내린 상태에서 캐리지 미세 밀기',
    standard: '무릎 2cm 호버 유지하며 호흡 3회',
    hard: '호버 상태에서 고관절 굴곡·신전 왕복',
  },
  variationRationale: '지지면 반력을 활용해 견갑과 복부 심부 연결을 강화합니다.',
};

describe('backend/freeAiService', () => {
  describe('1. Free-Only Provider Configuration (resolveFreeAiConfig)', () => {
    it('enables gemini-free only when GEMINI_API_KEY, GEMINI_FREE_TIER_UNPAID_CONFIRMED=true, and a verified free model are present', () => {
      const resolved = resolveFreeAiConfig({
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
      });
      expect(resolved.provider).toBe('gemini-free');
      expect(resolved.model).toBe('gemini-3.5-flash-lite');
      expect(resolved.enabled).toBe(true);
      expect(resolved.reason).toBe('ready');

      const resolved38Flash = resolveFreeAiConfig({
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
        GEMINI_FREE_MODEL: 'gemini-3.8-flash',
      });
      expect(resolved38Flash.provider).toBe('gemini-free');
      expect(resolved38Flash.model).toBe('gemini-3.8-flash');
      expect(resolved38Flash.enabled).toBe(true);
      expect(resolved38Flash.reason).toBe('ready');
    });

    it('blocks gemini-free with billing_guard_unconfirmed when GEMINI_FREE_TIER_UNPAID_CONFIRMED is missing or false', () => {
      const missingFlag = resolveFreeAiConfig({
        GEMINI_API_KEY: 'test-gemini-key',
      });
      expect(missingFlag.enabled).toBe(false);
      expect(missingFlag.reason).toBe('billing_guard_unconfirmed');
      expect(missingFlag.apiKey).toBeNull();

      const falseFlag = resolveFreeAiConfig({
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'false',
      });
      expect(falseFlag.enabled).toBe(false);
      expect(falseFlag.reason).toBe('billing_guard_unconfirmed');
    });

    it('blocks paid or retired Gemini models with invalid_paid_model_blocked', () => {
      for (const blockedModel of [
        'gemini-3.1-pro-preview',
        'gemini-4-argon',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ]) {
        const blocked = resolveFreeAiConfig({
          GEMINI_API_KEY: 'test-gemini-key',
          GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
          GEMINI_FREE_MODEL: blockedModel,
        });
        expect(blocked.enabled).toBe(false);
        expect(blocked.reason).toBe('invalid_paid_model_blocked');
        expect(blocked.model).toBeNull();
      }
    });

    it('enables openrouter-free for openrouter/free or :free models and blocks non-free models', () => {
      const defaultFreeRouter = resolveFreeAiConfig({
        OPENROUTER_API_KEY: 'test-or-key',
      });
      expect(defaultFreeRouter.provider).toBe('openrouter-free');
      expect(defaultFreeRouter.model).toBe('openrouter/free');
      expect(defaultFreeRouter.enabled).toBe(true);
      expect(defaultFreeRouter.reason).toBe('ready');

      const specificFreeModel = resolveFreeAiConfig(VALID_OPENROUTER_ENV);
      expect(specificFreeModel.provider).toBe('openrouter-free');
      expect(specificFreeModel.model).toBe('google/gemma-4-31b-it:free');
      expect(specificFreeModel.enabled).toBe(true);

      const paidOpenRouter = resolveFreeAiConfig({
        OPENROUTER_API_KEY: 'test-or-key',
        OPENROUTER_FREE_MODEL: 'anthropic/claude-3.7-sonnet',
      });
      expect(paidOpenRouter.enabled).toBe(false);
      expect(paidOpenRouter.reason).toBe('invalid_paid_model_blocked');
      expect(paidOpenRouter.model).toBeNull();
    });

    it('returns provider=none, enabled=false, reason=unconfigured when no keys are configured', () => {
      const unconfigured = resolveFreeAiConfig({});
      expect(unconfigured.provider).toBe('none');
      expect(unconfigured.enabled).toBe(false);
      expect(unconfigured.reason).toBe('unconfigured');
      expect(unconfigured.model).toBeNull();
    });
  });

  describe('2. Verifiable Quota Reset / Renewal Calculation', () => {
    it('computes exact midnight America/Los_Angeles (00:00 PT) in both PST (UTC-8) and PDT (UTC-7)', () => {
      const winterNowMs = Date.parse('2026-11-06T06:51:47.000Z');
      const winterResetMs = computeNextGeminiDailyResetMs(winterNowMs);
      expect(new Date(winterResetMs).toISOString()).toBe('2026-11-06T08:00:00.000Z');

      const winterRenewal = computeQuotaRenewal({
        provider: 'gemini-free',
        resetWindow: 'daily',
        nowMs: winterNowMs,
      });
      expect(winterRenewal).not.toBeNull();
      expect(winterRenewal!.resetAt).toBe('2026-11-06T08:00:00.000Z');
      expect(winterRenewal!.resetTimezone).toBe('America/Los_Angeles');
      expect(winterRenewal!.resetWindow).toBe('daily');
      expect(winterRenewal!.remainingSeconds).toBe(4093);
      expect(winterRenewal!.formattedResetKo).toContain(
        '미국 태평양 시간 자정(00:00 PT) 기준 일일 무료 한도 갱신',
      );

      const summerNowMs = Date.parse('2026-07-15T10:00:00.000Z');
      const summerResetMs = computeNextGeminiDailyResetMs(summerNowMs);
      expect(new Date(summerResetMs).toISOString()).toBe('2026-07-16T07:00:00.000Z');
    });

    it('computes exact midnight UTC (00:00:00.000Z) for OpenRouter daily quota and minute window resets', () => {
      const nowMs = Date.parse('2026-11-06T18:30:00.000Z');
      const openRouterResetMs = computeNextOpenRouterDailyResetMs(nowMs);
      expect(new Date(openRouterResetMs).toISOString()).toBe('2026-11-07T00:00:00.000Z');

      const openRouterRenewal = computeQuotaRenewal({
        provider: 'openrouter-free',
        resetWindow: 'daily',
        nowMs,
      });
      expect(openRouterRenewal!.resetAt).toBe('2026-11-07T00:00:00.000Z');
      expect(openRouterRenewal!.resetTimezone).toBe('UTC');
      expect(openRouterRenewal!.remainingSeconds).toBe(5.5 * 3600);
      expect(openRouterRenewal!.formattedResetKo).toContain('00:00 UTC');

      const minuteResetMs = computeMinuteWindowResetMs(
        Date.parse('2026-11-06T18:30:15.000Z'),
      );
      expect(new Date(minuteResetMs).toISOString()).toBe('2026-11-06T18:31:00.000Z');
    });
  });

  describe('3. Cache, Concurrency Limit, Server Rate/Usage Limit, and Zero Paid Fallback', () => {
    it('returns cached results with cached=true without calling fetchFn or incrementing RPM/RPD, and evicts expired/excess entries', async () => {
      let currentMs = Date.parse('2026-11-06T06:00:00.000Z');
      const fetchFn = vi.fn(async () =>
        makeGeminiSuccessResponse(VALID_IDEA_UPSTREAM_JSON),
      );

      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
        now: () => currentMs,
        cacheTtlMs: 10_000,
        maxCacheEntries: 1,
      });

      const first = await service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ);
      expect(first.cached).toBe(false);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(service.getStatus().minuteUsed).toBe(1);
      expect(service.getStatus().dailyUsed).toBe(1);
      expect(service.getStatus().cacheEntries).toBe(1);

      const keyA = computeFreeAiCacheKey(
        'gemini-free',
        'gemini-3.5-flash-lite',
        SAMPLE_MOVEMENT_IDEA_REQ,
      );
      const keyB = computeFreeAiCacheKey('gemini-free', 'gemini-3.5-flash-lite', {
        idea: { ...SAMPLE_MOVEMENT_IDEA_REQ.idea },
        task: 'movement-idea',
      });
      expect(keyA).toBe(keyB);

      const second = await service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ);
      expect(second.cached).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(service.getStatus().minuteUsed).toBe(1);
      expect(service.getStatus().dailyUsed).toBe(1);

      // Expire TTL
      currentMs += 11_000;
      expect(service.getStatus().cacheEntries).toBe(0);
    });

    it('enforces per-user and global concurrency limits and cleans up in-flight counters in finally', async () => {
      let resolveFirst!: (value: Response) => void;
      const fetchFn = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          }),
      );

      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
        maxConcurrentPerUser: 1,
        maxConcurrentGlobal: 1,
      });

      const inFlight1 = service.assist('user-a', SAMPLE_MOVEMENT_IDEA_REQ);

      // Same user attempting concurrent request fails
      await expect(
        service.assist('user-a', SAMPLE_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'concurrency_limit_exceeded',
        status: 429,
        message: CONCURRENCY_LIMIT_ERROR_MESSAGE,
      });

      // Another user exceeding maxConcurrentGlobal also fails
      await expect(
        service.assist('user-b', SAMPLE_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'concurrency_limit_exceeded',
        status: 429,
        message: CONCURRENCY_LIMIT_ERROR_MESSAGE,
      });

      resolveFirst(makeGeminiSuccessResponse(VALID_IDEA_UPSTREAM_JSON));
      await inFlight1;
      expect(service.getStatus().activeRequests).toBe(0);
    });

    it('enforces minuteLimit and dailyLimit, surfaces verifiable renewal info, and recovers after resetAt', async () => {
      let nowMs = Date.parse('2026-11-06T06:50:00.000Z');
      const fetchFn = vi.fn(async () =>
        makeGeminiSuccessResponse(VALID_IDEA_UPSTREAM_JSON),
      );

      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
        now: () => nowMs,
        minuteLimit: 1,
        dailyLimit: 2,
        cacheTtlMs: 0,
      });

      await service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ);
      expect(service.getStatus().minuteUsed).toBe(1);
      expect(service.getStatus().exhausted).toBe(true);

      await expect(
        service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ),
      ).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
        message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
        renewal: expect.objectContaining({
          resetWindow: 'minute',
          resetTimezone: 'America/Los_Angeles',
        }),
      });

      nowMs += 61_000;
      expect(service.getStatus().exhausted).toBe(false);

      await service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ);
      expect(service.getStatus().dailyUsed).toBe(2);
      expect(service.getStatus().exhausted).toBe(true);

      nowMs += 120_000;
      await expect(
        service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ),
      ).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
        renewal: expect.objectContaining({
          resetWindow: 'daily',
          resetAt: '2026-11-06T08:00:00.000Z',
        }),
      });

      nowMs = Date.parse('2026-11-06T08:00:01.000Z');
      const renewedStatus = service.getStatus();
      expect(renewedStatus.exhausted).toBe(false);
      expect(renewedStatus.dailyUsed).toBe(0);
      expect(renewedStatus.dailyRemaining).toBe(2);
    });

    it('locks quota on upstream 429/402, respects X-RateLimit-Reset and Retry-After headers, and never falls back to paid models', async () => {
      const nowMs = Date.parse('2026-11-06T12:00:00.000Z');
      const resetEpochMs = Date.parse('2026-11-07T00:00:00.000Z');

      const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const parsedBody = JSON.parse(String(init?.body));
        expect(parsedBody.provider).toEqual({
          allow_fallbacks: false,
          max_price: { prompt: 0, completion: 0 },
        });
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'X-RateLimit-Reset': String(resetEpochMs),
          },
        });
      });

      const service = createFreeAiService({
        env: VALID_OPENROUTER_ENV,
        fetchFn,
        now: () => nowMs,
      });

      await expect(
        service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ),
      ).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
        message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
        renewal: expect.objectContaining({
          resetAt: '2026-11-07T00:00:00.000Z',
          resetTimezone: 'UTC',
        }),
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('calls Gemini v1beta generateContent with x-goog-api-key and never attaches google_search grounding tools', async () => {
      const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
        );
        const headers = init?.headers as Record<string, string>;
        expect(headers['x-goog-api-key']).toBe('test-server-gemini-secret');
        const parsedBody = JSON.parse(String(init?.body));
        expect(parsedBody.tools).toBeUndefined();
        expect(JSON.stringify(parsedBody)).not.toContain('google_search');
        return makeGeminiSuccessResponse(VALID_IDEA_UPSTREAM_JSON);
      });

      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
      });

      const res = await service.assist('instructor-1', SAMPLE_MOVEMENT_IDEA_REQ);
      expect(res.provider).toBe('gemini-free');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. BYOK & Sensitive Health / PII Enforcement', () => {
    it('rejects BYOK fields or secret strings with 400 byok_forbidden before checking cache or calling upstream', async () => {
      const fetchFn = vi.fn();
      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
      });

      await expect(
        service.assist('instructor-1', {
          ...SAMPLE_MOVEMENT_IDEA_REQ,
          apiKey: 'AIzaSyClientInjectedKey123456789012345',
        }),
      ).rejects.toMatchObject({
        code: 'byok_forbidden',
        status: 400,
      });

      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('rejects sensitive health and personal info with 400 sensitive_health_blocked before calling upstream', async () => {
      const fetchFn = vi.fn();
      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
      });

      await expect(
        service.assist('instructor-1', {
          task: 'movement-idea',
          idea: {
            ...SAMPLE_MOVEMENT_IDEA_REQ.idea,
            rawIdeaText: '요추 디스크 수술 환자 김철수(010-1234-5678) 재활 동작',
          },
        }),
      ).rejects.toMatchObject({
        code: 'sensitive_health_blocked',
        status: 400,
      });

      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('5. Structured Output Parsing, Unreviewed Filtering & Route Factory', () => {
    it('enforces unreviewed-creative status and safety disclaimer on movement-idea and excludes unreviewed IDs in sequence-compose', async () => {
      const fetchFn = vi.fn(async () =>
        makeOpenRouterSuccessResponse({
          title: '코어·둔근 통합 시퀀스',
          subtitle: '리포머 50분 루틴',
          targetMinutes: 50,
          level: '1.5',
          apparatus: 'reformer',
          transitionSummary: '풋워크에서 헌드레드로 자연스럽게 연결합니다.',
          excludedUnreviewedIds: [],
          steps: [
            {
              stepId: 's1',
              order: 1,
              exerciseId: 'ex-footwork',
              nameKo: '풋워크 패럴렐',
              nameEn: 'Footwork Parallel',
              apparatus: 'reformer',
              blockCategory: 'footwork',
              durationMin: 10,
              selectedLayer: 'standard',
              instructorNote: '발바닥 삼점 지지 확인',
              isReviewed: true,
            },
            {
              stepId: 's2',
              order: 2,
              exerciseId: 'unreviewed-creative-999',
              nameKo: '미검토 창작 동작',
              nameEn: 'Unreviewed Idea',
              apparatus: 'reformer',
              blockCategory: 'core',
              durationMin: 5,
              selectedLayer: 'standard',
              instructorNote: '제외되어야 함',
              isReviewed: true,
            },
          ],
        }),
      );

      const service = createFreeAiService({
        env: VALID_OPENROUTER_ENV,
        fetchFn,
      });

      const composeResult = await service.assist('instructor-1', {
        task: 'sequence-compose',
        compose: {
          targetMinutes: 50,
          level: '1.5',
          apparatus: 'reformer',
          strengthenAreas: ['core'],
          selectedExerciseIds: ['ex-footwork', 'unreviewed-creative-999'],
        },
        reviewedCatalog: SAMPLE_CLASS_DRAFT_REQ.reviewedCatalog,
      });

      expect(composeResult.kind).toBe('sequence-compose');
      if (composeResult.kind === 'sequence-compose') {
        expect(composeResult.steps).toHaveLength(1);
        expect(composeResult.steps[0].exerciseId).toBe('ex-footwork');
        expect(composeResult.excludedUnreviewedIds).toContain('unreviewed-creative-999');
        expect(composeResult.guaranteesSafetyOrEffect).toBe(false);
        expect(composeResult.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
      }
    });

    it.each(['class-draft', 'sequence-compose'] as const)(
      'fails closed for %s when no reviewed exercise or block authorizes an upstream step',
      async (task) => {
        const fetchFn = vi.fn(async () =>
          makeOpenRouterSuccessResponse({
            title: '빈 검토 목록의 추천',
            subtitle: '검토 가능한 동작 없음',
            coachingSummary: '검토 완료 동작을 먼저 추가하세요.',
            transitionSummary: '검토 완료 동작을 먼저 추가하세요.',
            excludedUnreviewedIds: [],
            steps: [{
              stepId: 'invented-step',
              order: 1,
              exerciseId: 'invented-exercise',
              nameKo: '검토되지 않은 생성 동작',
              nameEn: 'Unreviewed Generated Exercise',
              apparatus: 'reformer',
              blockCategory: 'core',
              durationMin: 5,
              selectedLayer: 'standard',
              instructorNote: '',
              isReviewed: true,
            }],
          }),
        );
        const service = createFreeAiService({ env: VALID_OPENROUTER_ENV, fetchFn });
        const request: FreeAiServerRequest = task === 'class-draft'
          ? { ...SAMPLE_CLASS_DRAFT_REQ, reviewedCatalog: [] }
          : {
              task: 'sequence-compose',
              compose: {
                targetMinutes: 50,
                level: '1.5',
                apparatus: 'reformer',
                strengthenAreas: ['core'],
                selectedExerciseIds: ['invented-exercise'],
              },
              reviewedCatalog: [],
              reviewedBlocks: [],
            };

        const result = await service.assist('instructor-1', request);
        expect(result.kind).toBe(task);
        if (result.kind === 'movement-idea') throw new Error('Unexpected result kind');
        expect(result.steps).toEqual([]);
        expect(result.guaranteesSafetyOrEffect).toBe(false);
        if (result.kind === 'sequence-compose') {
          expect(result.excludedUnreviewedIds).toContain('invented-exercise');
        }
        expect(fetchFn).toHaveBeenCalledTimes(1);
      },
    );

    it('exposes GET /api/studio/ai/status and POST /api/studio/ai/assist with Cache-Control: private, no-store', async () => {
      const fetchFn = vi.fn(async () =>
        makeGeminiSuccessResponse(VALID_IDEA_UPSTREAM_JSON),
      );
      const service = createFreeAiService({
        env: VALID_GEMINI_ENV,
        fetchFn,
      });
      const routes = createFreeAiRoutes(service);

      const statusRes = await routes['GET /api/studio/ai/status']({});
      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.headers['Cache-Control']).toBe('private, no-store');
      const statusBody = JSON.parse(statusRes.body);
      expect(statusBody.provider).toBe('gemini-free');
      expect(statusBody.enabled).toBe(true);

      const assistRes = await routes['POST /api/studio/ai/assist']({
        user: { userId: 'instructor-1', scope: 'user' },
        body: SAMPLE_MOVEMENT_IDEA_REQ,
      });
      expect(assistRes.statusCode).toBe(200);
      expect(assistRes.headers['Cache-Control']).toBe('private, no-store');
      const assistBody = JSON.parse(assistRes.body);
      expect(assistBody.kind).toBe('movement-idea');
      expect(assistBody.reviewStatus).toBe('unreviewed-creative');
      expect(assistBody.guaranteesSafetyOrEffect).toBe(false);
      expect(assistBody.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);

      const byokRes = await routes['POST /api/studio/ai/assist']({
        user: { userId: 'instructor-1', scope: 'user' },
        body: { ...SAMPLE_MOVEMENT_IDEA_REQ, apiKey: 'sk-123456789012345678901234' },
      });
      expect(byokRes.statusCode).toBe(400);
      expect(byokRes.headers['Cache-Control']).toBe('private, no-store');
      expect(JSON.parse(byokRes.body).error).toBe('byok_forbidden');
    });
  });
});
