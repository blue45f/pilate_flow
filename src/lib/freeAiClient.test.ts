import { describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER } from '../schemas/freeAiAssistantSchema';
import type {
  EditableMovementIdeaResult,
  FreeAiQuotaStatus,
  FreeAiRenewalInfo,
} from '../types/freeAiAssistant';
import type { PilatesExercise } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import {
  FreeAiClientError,
  assertNoBrowserKeyExposure,
  createDefaultFreeAiStatus,
  createFreeAiClient,
  type FreeAiTransport,
} from './freeAiClient';

function makeApprovedExercise(base: PilatesExercise): PilatesExercise {
  const withoutReview: PilatesExercise = {
    ...base,
    requiredEquipment: base.requiredEquipment ?? [base.apparatus],
    review: undefined,
  };
  const revision = exerciseRevision(withoutReview);
  return {
    ...withoutReview,
    review: {
      status: 'approved',
      reviewerAlias: '수석강사_검토',
      reviewedAt: '2026-11-01T09:00:00.000Z',
      revision,
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };
}

const approvedCatalog = INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'reformer').map(
  makeApprovedExercise,
);

function makeReadyStatus(overrides: Partial<FreeAiQuotaStatus> = {}): FreeAiQuotaStatus {
  return createDefaultFreeAiStatus({
    provider: 'gemini-free',
    model: 'gemini-2.5-flash-lite',
    enabled: true,
    exhausted: false,
    reason: 'ready',
    minuteLimit: 10,
    minuteUsed: 1,
    minuteRemaining: 9,
    dailyLimit: 50,
    dailyUsed: 3,
    dailyRemaining: 47,
    statusMessageKo: '무료 AI 사용 가능 (Gemini Free Tier)',
    renewal: {
      resetAt: '2026-11-07T08:00:00.000Z',
      resetWindow: 'daily',
      resetTimezone: 'America/Los_Angeles',
      remainingSeconds: 36000,
      formattedResetKo: '갱신 예정: 미국 태평양 시간(PT) 자정 (2026-11-07T08:00:00.000Z)',
      policyNoteKo: 'Gemini 무료 등급 일일 할당량은 PT 자정에 초기화됩니다.',
    },
    ...overrides,
  });
}

function makeMockMovementIdeaResult(): EditableMovementIdeaResult {
  return {
    kind: 'movement-idea',
    source: 'external-free-ai',
    provider: 'gemini-free',
    model: 'gemini-2.5-flash-lite',
    cached: false,
    nameKo: '리포머 수파인 코어 분절 브릿지 변형',
    nameEn: 'Reformer Supine Core Articulation Bridge Variation',
    apparatus: 'reformer',
    blockCategory: 'bridging',
    level: '1.5',
    bodyPosition: 'supine',
    spinalPlanes: ['flexion', 'neutral'],
    props: ['mini-ball'],
    defaultDurationMin: 5,
    springs: '2R',
    targetMuscles: ['대둔근', '햄스트링', '복횡근'],
    breathPattern: '내쉬는 숨에 꼬리뼈부터 말아 올리며 골반을 분절합니다.',
    cues: [
      '발바닥 삼점 지지와 미니볼 내전근 연결을 유지하세요.',
      '늑골이 들리지 않도록 흉곽 하부를 부드럽게 닫아 주세요.',
      '내려올 때 윗등부터 순서대로 캐리지에 내려놓으세요.',
    ],
    precautions: '[미검토 창작 동작] 햄스트링 경련 시 스프링을 추가하거나 범위를 줄이세요.',
    layers: {
      easy: '골반 중립 리프트(힌지 브릿지)로 범위를 50% 축소합니다.',
      standard: '2R 스프링에서 미니볼을 조이며 분절 브릿지를 6회 수행합니다.',
      hard: '탑 포지션에서 캐리지를 5cm 밀어내며 햄스트링 신장성 수축을 유지합니다.',
    },
    variationRationale: '미니볼 내전근 연결을 통해 골반 흔들림을 줄이고 둔근·코어 협응을 단계화했습니다.',
    reviewStatus: 'unreviewed-creative',
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

describe('freeAiClient', () => {
  it('blocks browser key exposure and BYOK fields with byok_forbidden', async () => {
    const syntheticBrowserGoogleKey = ['AIza', 'Sy', 'B'.repeat(33)].join('');
    const syntheticOpenRouterKey = ['sk-or', '-v1-', 'a'.repeat(32)].join('');
    const syntheticPromptGoogleKey = ['AIza', 'Sy', 'P'.repeat(33)].join('');

    const exposedEnvCheck = assertNoBrowserKeyExposure({
      VITE_GEMINI_API_KEY: syntheticBrowserGoogleKey,
    });
    expect(exposedEnvCheck.safe).toBe(false);
    expect(exposedEnvCheck.violations.length).toBeGreaterThan(0);

    const postAssist = vi.fn();
    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockResolvedValue(makeReadyStatus()),
      postAssist,
    };

    const clientWithExposedEnv = createFreeAiClient({
      transport,
      envRecord: {
        VITE_OPENROUTER_API_KEY: syntheticOpenRouterKey,
      },
    });

    await expect(
      clientWithExposedEnv.requestMovementIdea({
        rawIdeaText: '리포머 브릿지 코어 연결 변형',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'glute-lower',
        level: '1.5',
      }),
    ).rejects.toMatchObject({
      code: 'byok_forbidden',
    });
    expect(postAssist).not.toHaveBeenCalled();

    const cleanClient = createFreeAiClient({
      transport,
      envRecord: {},
    });

    const payloadWithSecretKey = {
      rawIdeaText: `내 키 ${syntheticPromptGoogleKey} 로 호출`,
      apparatus: 'reformer' as const,
      blockCategory: 'bridging' as const,
      strengthenArea: 'glute-lower' as const,
      level: '1.5' as const,
    };

    await expect(cleanClient.requestMovementIdea(payloadWithSecretKey)).rejects.toMatchObject({
      code: 'byok_forbidden',
    });
    expect(postAssist).not.toHaveBeenCalled();
  });

  it('blocks sensitive health information (PHI/PII) from external AI calls while allowing preferLocalOnly sanitized execution', async () => {
    const postAssist = vi.fn();
    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockResolvedValue(makeReadyStatus()),
      postAssist,
    };

    const client = createFreeAiClient({ transport, envRecord: {} });

    await expect(
      client.requestMovementIdea({
        rawIdeaText: '요추 디스크 협착증 수술 환자 010-9876-5432 리포머 브릿지',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'mobility-rehab',
        level: '1.0',
      }),
    ).rejects.toMatchObject({
      code: 'sensitive_health_blocked',
    });
    expect(postAssist).not.toHaveBeenCalled();

    // When preferLocalOnly is true, runs local deterministic engine without calling external AI
    const localResponse = await client.requestMovementIdea(
      {
        rawIdeaText: '요추 디스크 수술 회원 브릿지 가동성 아이디어',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'mobility-rehab',
        level: '1.0',
      },
      { preferLocalOnly: true },
    );
    expect(localResponse.usedLocalFallback).toBe(true);
    expect(localResponse.result.source).toBe('local-rule-engine');
    expect(localResponse.result.nameKo).not.toContain('디스크');
    expect(postAssist).not.toHaveBeenCalled();
  });

  it('caches identical external AI requests and respects TTL and clearCache()', async () => {
    let currentNow = 1_700_000_000_000;
    const postAssist = vi.fn().mockResolvedValue({
      status: makeReadyStatus(),
      result: makeMockMovementIdeaResult(),
    });
    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockResolvedValue(makeReadyStatus()),
      postAssist,
    };

    const client = createFreeAiClient({
      transport,
      cacheTtlMs: 60_000,
      now: () => currentNow,
      envRecord: {},
    });

    const input = {
      rawIdeaText: '미니볼을 활용한 수파인 브릿지 분절 변형',
      apparatus: 'reformer' as const,
      blockCategory: 'bridging' as const,
      strengthenArea: 'glute-lower' as const,
      level: '1.5' as const,
    };

    const first = await client.requestMovementIdea(input);
    expect(first.usedLocalFallback).toBe(false);
    expect(first.result.cached).toBe(false);
    expect(postAssist).toHaveBeenCalledTimes(1);
    expect(client.getQuotaStatus().cacheEntries).toBe(1);

    const second = await client.requestMovementIdea(input);
    expect(second.usedLocalFallback).toBe(false);
    expect(second.result.cached).toBe(true);
    expect(postAssist).toHaveBeenCalledTimes(1);

    // Advance past TTL -> should re-fetch
    currentNow += 61_000;
    const third = await client.requestMovementIdea(input);
    expect(third.result.cached).toBe(false);
    expect(postAssist).toHaveBeenCalledTimes(2);

    // Clear cache explicitly -> next call hits transport again
    client.clearCache();
    expect(client.getQuotaStatus().cacheEntries).toBe(0);
    await client.requestMovementIdea(input);
    expect(postAssist).toHaveBeenCalledTimes(3);
  });

  it('enforces maxConcurrentRequests and blocks overlapping requests with concurrency_limit_exceeded', async () => {
    let resolveFirst!: (value: {
      status: FreeAiQuotaStatus;
      result: EditableMovementIdeaResult;
    }) => void;

    const postAssist = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockResolvedValue(makeReadyStatus()),
      postAssist,
    };

    const client = createFreeAiClient({
      transport,
      maxConcurrentRequests: 1,
      envRecord: {},
    });

    const firstPromise = client.requestMovementIdea({
      rawIdeaText: '첫 번째 코어 컨트롤 아이디어',
      apparatus: 'reformer',
      blockCategory: 'core',
      strengthenArea: 'core',
      level: '1.5',
    });

    await expect(
      client.requestMovementIdea({
        rawIdeaText: '동시에 요청된 두 번째 아이디어',
        apparatus: 'reformer',
        blockCategory: 'core',
        strengthenArea: 'core',
        level: '1.5',
      }),
    ).rejects.toMatchObject({
      code: 'concurrency_limit_exceeded',
    });

    expect(postAssist).toHaveBeenCalledTimes(1);

    resolveFirst({
      status: makeReadyStatus(),
      result: makeMockMovementIdeaResult(),
    });

    const firstDone = await firstPromise;
    expect(firstDone.result.kind).toBe('movement-idea');
    expect(client.getQuotaStatus().activeRequests).toBe(0);
  });

  it('surfaces free_quota_exhausted with renewal time, blocks subsequent external AI calls until reset, and never auto-switches to paid', async () => {
    let currentNow = Date.parse('2026-11-06T12:00:00.000Z');
    const renewalInfo: FreeAiRenewalInfo = {
      resetAt: '2026-11-07T00:00:00.000Z',
      resetWindow: 'daily',
      resetTimezone: 'UTC',
      remainingSeconds: 43200,
      formattedResetKo: '갱신 예정: 2026-11-07 00:00 UTC (한국시간 09:00)',
      policyNoteKo: 'OpenRouter 무료 모델 일일 한도는 UTC 자정에 갱신됩니다.',
    };

    const exhaustedStatus = makeReadyStatus({
      provider: 'openrouter-free',
      model: 'google/gemma-4-31b-it:free',
      exhausted: true,
      reason: 'free_quota_exhausted',
      minuteRemaining: 0,
      dailyRemaining: 0,
      renewal: renewalInfo,
    });

    const postAssist = vi
      .fn()
      .mockRejectedValueOnce({
        status: 429,
        data: {
          code: 'free_quota_exhausted',
          message: `무료 사용량 소진: 일일 무료 호출 한도를 모두 사용했습니다. (${renewalInfo.formattedResetKo})`,
          status: exhaustedStatus,
          renewal: renewalInfo,
        },
      })
      .mockResolvedValueOnce({
        status: makeReadyStatus({
          provider: 'openrouter-free',
          model: 'google/gemma-4-31b-it:free',
        }),
        result: makeMockMovementIdeaResult(),
      });

    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockResolvedValue(exhaustedStatus),
      postAssist,
    };

    const client = createFreeAiClient({
      transport,
      now: () => currentNow,
      envRecord: {},
    });

    const ideaInput = {
      rawIdeaText: '리포머 플랭크 코어 안정화 변형',
      apparatus: 'reformer' as const,
      blockCategory: 'plank' as const,
      strengthenArea: 'core' as const,
      level: '1.5' as const,
    };

    // First call hits 429 free_quota_exhausted -> must throw FreeAiClientError with '무료 사용량 소진' and renewal info
    let caughtError: FreeAiClientError | null = null;
    try {
      await client.requestMovementIdea(ideaInput);
    } catch (err) {
      caughtError = err as FreeAiClientError;
    }

    expect(caughtError).toBeInstanceOf(FreeAiClientError);
    expect(caughtError?.code).toBe('free_quota_exhausted');
    expect(caughtError?.message).toContain('무료 사용량 소진');
    expect(caughtError?.message).toContain(renewalInfo.formattedResetKo);
    expect(caughtError?.renewal?.resetAt).toBe('2026-11-07T00:00:00.000Z');
    expect(client.getQuotaStatus().exhausted).toBe(true);
    expect(postAssist).toHaveBeenCalledTimes(1);

    // Second call before resetAt must be blocked client-side without calling transport.postAssist
    await expect(
      client.requestClassDraft(
        {
          durationMinutes: 50,
          theme: '코어 플로우',
          strengthenAreas: ['core'],
          level: '1.5',
          apparatus: 'reformer',
        },
        approvedCatalog,
      ),
    ).rejects.toMatchObject({
      code: 'free_quota_exhausted',
    });
    expect(postAssist).toHaveBeenCalledTimes(1);

    // However, preferLocalOnly still works 100% while quota is exhausted
    const localDraftWhileExhausted = await client.requestClassDraft(
      {
        durationMinutes: 40,
        theme: '무료 한도 소진 중 로컬 초안 생성',
        strengthenAreas: ['core'],
        level: '1.5',
        apparatus: 'reformer',
      },
      approvedCatalog,
      [],
      { preferLocalOnly: true },
    );
    expect(localDraftWhileExhausted.usedLocalFallback).toBe(true);
    expect(localDraftWhileExhausted.result.source).toBe('local-rule-engine');
    expect(localDraftWhileExhausted.result.steps.length).toBeGreaterThan(0);

    // Once time advances past renewal.resetAt, external calls are unblocked
    currentNow = Date.parse('2026-11-07T00:01:00.000Z');
    const afterReset = await client.requestMovementIdea(ideaInput);
    expect(afterReset.usedLocalFallback).toBe(false);
    expect(postAssist).toHaveBeenCalledTimes(2);
  });

  it.each(['minute', 'daily'] as const)(
    'preserves the successful result that exhausts the %s quota and blocks only later external requests',
    async (window) => {
      const exhaustedStatus = makeReadyStatus({
        exhausted: true,
        reason: 'free_quota_exhausted',
        ...(window === 'minute'
          ? { minuteUsed: 10, minuteRemaining: 0 }
          : { dailyUsed: 50, dailyRemaining: 0 }),
        renewal: {
          ...makeReadyStatus().renewal!,
          resetWindow: window,
          resetAt: '2026-11-07T08:00:00.000Z',
        },
      });
      const result = makeMockMovementIdeaResult();
      const postAssist = vi.fn().mockResolvedValue({ status: exhaustedStatus, result });
      const client = createFreeAiClient({
        transport: { getStatus: vi.fn().mockResolvedValue(makeReadyStatus()), postAssist },
        now: () => Date.parse('2026-11-06T12:00:00.000Z'),
        envRecord: {},
      });
      const input = {
        rawIdeaText: '미니볼 수파인 브릿지 변형',
        apparatus: 'reformer' as const,
        blockCategory: 'bridging' as const,
        strengthenArea: 'glute-lower' as const,
        level: '1.5' as const,
      };

      const response = await client.requestMovementIdea(input);
      expect(response.result).toEqual(result);
      expect(response.usedLocalFallback).toBe(false);
      expect(response.status.exhausted).toBe(true);
      expect(response.status.reason).toBe('free_quota_exhausted');
      expect(client.getQuotaStatus().cacheEntries).toBe(1);

      await expect(client.requestMovementIdea(input)).rejects.toMatchObject({
        code: 'free_quota_exhausted',
      });
      const local = await client.requestMovementIdea(input, { preferLocalOnly: true });
      expect(local.usedLocalFallback).toBe(true);
      expect(local.result.source).toBe('local-rule-engine');
      expect(postAssist).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['exact adapter message', 'explicit adapter code'] as const)(
    'uses local mode only for a known unavailable contract: %s',
    async (contract) => {
      const unavailableError = contract === 'explicit adapter code'
        ? Object.assign(new Error('Local API is not configured'), {
            code: 'local_api_unavailable',
          })
        : new Error(
            '서버 기능은 연결되어 있지 않습니다. 수업 자료는 이 브라우저에 보관됩니다. 전체 JSON 백업을 이용해 주세요.',
          );
      const transport: FreeAiTransport = {
        getStatus: vi.fn().mockRejectedValue(unavailableError),
        postAssist: vi.fn().mockRejectedValue(unavailableError),
      };
      const input = {
        rawIdeaText: '미니볼 수파인 브릿지 변형',
        apparatus: 'reformer' as const,
        blockCategory: 'bridging' as const,
        strengthenArea: 'glute-lower' as const,
        level: '1.5' as const,
      };
      const client = createFreeAiClient({ transport, envRecord: {} });
      await expect(client.refreshQuotaStatus()).resolves.toMatchObject({
        enabled: false,
        exhausted: false,
        reason: 'unconfigured',
      });
      const afterStatus = await client.requestMovementIdea(input);
      expect(afterStatus.usedLocalFallback).toBe(true);
      expect(afterStatus.result.source).toBe('local-rule-engine');
      expect(transport.postAssist).not.toHaveBeenCalled();

      // A first assist request without a prior status read uses the same contract.
      const freshClient = createFreeAiClient({ transport, envRecord: {} });
      const firstAssist = await freshClient.requestMovementIdea(input);
      expect(firstAssist.usedLocalFallback).toBe(true);
      expect(firstAssist.status.enabled).toBe(false);
      expect(firstAssist.status.exhausted).toBe(false);
      expect(firstAssist.result.provider).toBe('none');
      expect(transport.postAssist).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    new TypeError('Failed to fetch'),
    Object.assign(new Error('Authentication required'), { code: 'unauthenticated', status: 401 }),
    Object.assign(
      new Error(
        '서버 기능은 연결되어 있지 않습니다. 수업 자료는 이 브라우저에 보관됩니다. 전체 JSON 백업을 이용해 주세요.',
      ),
      { status: 503 },
    ),
  ])('does not treat an arbitrary network/auth/server error as known local mode: %s', async (cause) => {
    const transport: FreeAiTransport = {
      getStatus: vi.fn().mockRejectedValue(cause),
      postAssist: vi.fn().mockRejectedValue(cause),
    };
    const client = createFreeAiClient({ transport, envRecord: {} });
    await expect(client.refreshQuotaStatus()).rejects.toMatchObject({
      code: 'request_failed',
    });
    await expect(
      client.requestMovementIdea({
        rawIdeaText: '미니볼 수파인 브릿지 변형',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'glute-lower',
        level: '1.5',
      }),
    ).rejects.toMatchObject({ code: 'request_failed' });
    expect(transport.postAssist).toHaveBeenCalledTimes(1);
  });

  it('gracefully falls back to the local deterministic engine when the server is unconfigured or local SDK is unavailable', async () => {
    const defaultClient = createFreeAiClient({ envRecord: {} });

    const status = await defaultClient.refreshQuotaStatus();
    expect(status.enabled).toBe(false);
    expect(status.exhausted).toBe(false);
    expect(status.reason).toBe('unconfigured');

    const draftRes = await defaultClient.requestClassDraft(
      {
        durationMinutes: 50,
        theme: '로컬 규칙 엔진 자동 폴백 테스트',
        strengthenAreas: ['core', 'glute-lower'],
        level: '1.5',
        apparatus: 'reformer',
      },
      approvedCatalog,
    );

    expect(draftRes.usedLocalFallback).toBe(true);
    expect(draftRes.result.source).toBe('local-rule-engine');
    expect(draftRes.result.steps.length).toBeGreaterThan(0);

    const composeRes = await defaultClient.requestSequenceCompose(
      {
        targetMinutes: 30,
        level: '1.5',
        apparatus: 'reformer',
        strengthenAreas: ['core'],
        selectedExerciseIds: [approvedCatalog[0].id, 'unreviewed-or-missing-id'],
        selectedBlockIds: ['p1-items-reviewed-block', 'p1-items-unreviewed-block'],
      },
      approvedCatalog,
      [
        {
          id: 'p1-items-reviewed-block',
          title: 'P1 items 기반 블록',
          apparatus: 'reformer',
          level: '1.5',
          isReviewed: true,
          items: [
            {
              itemId: 'item-1',
              order: 1,
              exerciseId: approvedCatalog[1].id,
              blockCategory: approvedCatalog[1].blockCategory,
              durationMin: 8,
              selectedLayer: 'standard',
            },
          ],
        },
        {
          id: 'p1-items-unreviewed-block',
          title: 'P1 items 미검토 블록',
          apparatus: 'reformer',
          level: '1.5',
          isReviewed: false,
          items: [
            {
              itemId: 'item-2',
              order: 1,
              exerciseId: approvedCatalog[2].id,
            },
          ],
        },
      ],
    );

    expect(composeRes.usedLocalFallback).toBe(true);
    expect(composeRes.result.steps).toHaveLength(2);
    expect(composeRes.result.excludedUnreviewedIds).toContain('unreviewed-or-missing-id');
    expect(composeRes.result.excludedUnreviewedIds).toContain('p1-items-unreviewed-block');
  });
});

describe('Track B outbound privacy and paid-model boundary', () => {
  const conditions = {
    durationMinutes: 50 as const,
    theme: '코어 안정화',
    strengthenAreas: ['core' as const],
    level: '1.5' as const,
    apparatus: 'reformer' as const,
  };

  it.each(['김민지 회원 허리 통증', ['sk', '-', 'x'.repeat(24)].join('')])(
    'blocks selected catalog text at transport boundary: %s',
    async (nameKo) => {
      const postAssist = vi.fn();
      const client = createFreeAiClient({ transport: { getStatus: async () => makeReadyStatus(), postAssist } });
      const exercise = makeApprovedExercise({ ...approvedCatalog[0], nameKo, level: '1.5' });
      await expect(client.requestClassDraft(conditions, [exercise])).rejects.toMatchObject({
        code: nameKo.startsWith('sk-') ? 'byok_forbidden' : 'sensitive_health_blocked',
      });
      await expect(client.requestSequenceCompose({
        targetMinutes: 50, level: '1.5', apparatus: 'reformer', strengthenAreas: ['core'], selectedExerciseIds: [exercise.id],
      }, [exercise])).rejects.toMatchObject({
        code: nameKo.startsWith('sk-') ? 'byok_forbidden' : 'sensitive_health_blocked',
      });
      expect(postAssist).not.toHaveBeenCalled();
      const local = await client.requestClassDraft(conditions, [exercise], [], { preferLocalOnly: true });
      expect(local.usedLocalFallback).toBe(true);
      expect(postAssist).not.toHaveBeenCalled();
    },
  );

  it('blocks sensitive selected block titles while keeping notes local', async () => {
    const postAssist = vi.fn();
    const client = createFreeAiClient({ transport: { getStatus: async () => makeReadyStatus(), postAssist } });
    await expect(client.requestSequenceCompose({
      targetMinutes: 50, level: '1.5', apparatus: 'reformer', strengthenAreas: ['core'], selectedExerciseIds: [], selectedBlockIds: ['private'],
    }, approvedCatalog, [{
      id: 'private', title: '김민지 회원 수업', apparatus: 'reformer', level: '1.5', category: 'core', durationMin: 5, isReviewed: true,
      steps: [{ exerciseId: approvedCatalog[0].id, durationMin: 5, blockCategory: 'core', selectedLayer: 'standard' }],
    }])).rejects.toMatchObject({ code: 'sensitive_health_blocked' });
    expect(postAssist).not.toHaveBeenCalled();
  });

  it('uses local engine without any transport after paid model status is known', async () => {
    const blocked = makeReadyStatus({ enabled: false, reason: 'invalid_paid_model_blocked' });
    const postAssist = vi.fn();
    const client = createFreeAiClient({ transport: { getStatus: async () => blocked, postAssist } });
    await client.refreshQuotaStatus();
    const result = await client.requestClassDraft(conditions, approvedCatalog);
    expect(result.usedLocalFallback).toBe(true);
    expect(result.result.source).toBe('local-rule-engine');
    expect(postAssist).not.toHaveBeenCalled();
  });

  it('uses local engine after paid-model blocked response and does not retry provider', async () => {
    const blocked = makeReadyStatus({ enabled: false, reason: 'invalid_paid_model_blocked' });
    const postAssist = vi.fn().mockResolvedValue({ status: blocked });
    const client = createFreeAiClient({ transport: { getStatus: async () => blocked, postAssist } });
    expect((await client.requestClassDraft(conditions, approvedCatalog)).usedLocalFallback).toBe(true);
    expect((await client.requestClassDraft(conditions, approvedCatalog)).usedLocalFallback).toBe(true);
    expect(postAssist).toHaveBeenCalledTimes(1);
  });
});
