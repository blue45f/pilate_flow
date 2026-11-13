import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
  computeNextGeminiDailyResetMs,
  computeNextOpenRouterDailyResetMs,
  computeQuotaRenewal,
  createFreeAiRoutes,
  createFreeAiService,
  resolveFreeAiConfig,
  type FreeAiServerRequest,
} from '../../../backend/freeAiService';
import { AiSequenceCoPilotPanel } from '../../../src/components/AiSequenceCoPilotPanel';
import { FreeAiAssistantPanel } from '../../../src/components/FreeAiAssistantPanel';
import {
  createDefaultFreeAiStatus,
  createFreeAiClient,
  type FreeAiTransport,
} from '../../../src/lib/freeAiClient';
import { api as localAppDeployApi } from '../../../src/lib/localAppDeploy';
import { generateAiThematicSequence } from '../../../src/services/geminiSequenceAi';
import { usePilatesStore } from '../../../src/store/usePilatesStore';
import type {
  FreeAiAssistResult,
  FreeAiQuotaStatus,
  P1ReusableBlockContract,
} from '../../../src/types/freeAiAssistant';
import type {
  AutoGenerateCriteria,
  ConditionTemplate,
  PilatesExercise,
} from '../../../src/types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../../../src/utils/exerciseReview';
import {
  buildLocalClassDraft,
  buildLocalMovementIdea,
  composeSequenceFromReviewedItems,
  editableStepsToSequenceSteps,
} from '../../../src/utils/freeAiAssistantEngine';

function makeReviewedExercise(
  overrides: Partial<PilatesExercise> & { id: string; nameKo: string },
): PilatesExercise {
  const apparatus = overrides.apparatus ?? 'reformer';
  const base: PilatesExercise = {
    id: overrides.id,
    nameKo: overrides.nameKo,
    nameEn: overrides.nameEn ?? 'Pilates Movement',
    apparatus,
    requiredEquipment: overrides.requiredEquipment ?? [apparatus],
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['flexion', 'neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 6,
    isUnilateral: false,
    springs: overrides.springs ?? '1R 1B',
    box: 'none',
    footbar: apparatus === 'reformer' ? 'mid' : 'none',
    headrest: apparatus === 'reformer' ? 'up' : 'flat',
    targetMuscles: overrides.targetMuscles ?? ['복횡근', '골반기저근', '대둔근'],
    breathPattern: overrides.breathPattern ?? '내쉬는 숨에 복횡근과 골반기저근을 부드럽게 연결',
    cues: overrides.cues ?? [
      '갈비뼈를 부드럽게 닫아 코어 중립을 유지하세요.',
      '어깨 긴장을 풀고 정수리부터 꼬리뼈까지 길게 늘리세요.',
    ],
    precautions: overrides.precautions ?? '과도한 허리 꺾임이나 승모근 긴장 주의',
    layers: overrides.layers ?? {
      easy: '가동 범위를 절반으로 줄이고 호흡 인지에 집중',
      standard: '정석 템포로 왕복 움직임 수행',
      hard: '끝 범위에서 3초 정지 후 컨트롤 복귀',
    },
    youtube: {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Pilates Studio',
      videoTitle: overrides.nameKo,
      startSec: 0,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      region: 'kr',
    },
    favoriteTag: overrides.favoriteTag ?? 'none',
  };

  return {
    ...base,
    review:
      'review' in overrides
        ? overrides.review
        : {
            status: 'approved',
            reviewerAlias: '수석강사',
            reviewedAt: '2026-11-01T00:00:00.000Z',
            revision: exerciseRevision(base),
            scope: 'planning-metadata',
            credentialVerified: false,
          },
  };
}

const REVIEWED_CATALOG: PilatesExercise[] = [
  makeReviewedExercise({
    id: 'audit-ex-warmup',
    nameKo: '리포머 흉식 호흡 워밍업',
    nameEn: 'Reformer Breath Warmup',
    blockCategory: 'warmup',
    apparatus: 'reformer',
    level: '1.0',
    defaultDurationMin: 5,
    spinalPlanes: ['neutral'],
    targetMuscles: ['횡격막', '복횡근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-footwork',
    nameKo: '풋워크 패럴렐 힐즈',
    nameEn: 'Footwork Parallel Heels',
    blockCategory: 'footwork',
    apparatus: 'reformer',
    level: '1.0',
    defaultDurationMin: 6,
    spinalPlanes: ['neutral'],
    targetMuscles: ['대퇴사두근', '대둔근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-bridging',
    nameKo: '펠빅 컬 아티큘레이션',
    nameEn: 'Pelvic Curl Articulation',
    blockCategory: 'bridging',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 6,
    spinalPlanes: ['flexion', 'neutral'],
    targetMuscles: ['대둔근', '햄스트링', '복횡근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-core',
    nameKo: '헌드레드 코어 컨트롤',
    nameEn: 'Hundred Core Control',
    blockCategory: 'core',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 6,
    spinalPlanes: ['flexion'],
    targetMuscles: ['복횡근', '내·외복사근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-upper',
    nameKo: '시티드 로잉 견갑 안정화',
    nameEn: 'Seated Rowing Scapular Control',
    blockCategory: 'upper-body',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 6,
    bodyPosition: 'seated',
    spinalPlanes: ['neutral', 'rotation'],
    targetMuscles: ['능형근', '전거근', '중·하부 승모근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-lower',
    nameKo: '스탠딩 스쿠터 중둔근 연결',
    nameEn: 'Standing Scooter Glute Focus',
    blockCategory: 'lower-body',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 6,
    bodyPosition: 'standing',
    spinalPlanes: ['neutral'],
    targetMuscles: ['중둔근', '대둔근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-plank',
    nameKo: '롱 스트레치 플랭크 밸런스',
    nameEn: 'Long Stretch Plank Balance',
    blockCategory: 'plank',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 5,
    bodyPosition: 'quadruped',
    spinalPlanes: ['neutral'],
    targetMuscles: ['복횡근', '전거근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-extension',
    nameKo: '풀링 스트랩 흉추 신전',
    nameEn: 'Pulling Straps Thoracic Extension',
    blockCategory: 'extension',
    apparatus: 'reformer',
    level: '1.5',
    defaultDurationMin: 5,
    bodyPosition: 'prone',
    spinalPlanes: ['extension'],
    targetMuscles: ['척추기립근', '중·하부 승모근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-straps',
    nameKo: '핏 인 스트랩 프로그 & 레그써클',
    nameEn: 'Feet in Straps Frog & Circles',
    blockCategory: 'feet-in-straps',
    apparatus: 'reformer',
    level: '1.0',
    defaultDurationMin: 5,
    spinalPlanes: ['neutral'],
    targetMuscles: ['내전근', '햄스트링', '장요근'],
  }),
  makeReviewedExercise({
    id: 'audit-ex-cooldown',
    nameKo: '머메이드 측굴 쿨다운',
    nameEn: 'Mermaid Lateral Cooldown',
    blockCategory: 'cooldown',
    apparatus: 'reformer',
    level: '1.0',
    defaultDurationMin: 5,
    bodyPosition: 'seated',
    spinalPlanes: ['lateral', 'rotation'],
    targetMuscles: ['요방형근', '늑간근'],
  }),
  {
    ...makeReviewedExercise({
      id: 'audit-ex-unreviewed-99',
      nameKo: '미검토 실험 동작 (자동 배제 대상)',
      blockCategory: 'core',
      apparatus: 'reformer',
      level: '1.5',
      defaultDurationMin: 5,
    }),
    review: undefined,
  },
];

const SAMPLE_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'audit-tpl-reformer-50',
    name: '리포머 코어·둔근 표준 50분',
    createdAt: '2026-11-01T00:00:00.000Z',
    criteria: {
      apparatus: 'reformer',
      level: '1.5',
      focusPreset: 'core-sculpt',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 50,
      defaultLayer: 'standard',
    },
  },
];

const SAMPLE_REUSABLE_BLOCKS: P1ReusableBlockContract[] = [
  {
    id: 'audit-blk-reviewed-1',
    title: '브릿징·코어 필수 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'bridging',
    durationMin: 12,
    isReviewed: true,
    steps: [
      {
        exerciseId: 'audit-ex-bridging',
        blockCategory: 'bridging',
        durationMin: 6,
        selectedLayer: 'standard',
      },
      {
        exerciseId: 'audit-ex-core',
        blockCategory: 'core',
        durationMin: 6,
        selectedLayer: 'standard',
      },
    ],
  },
  {
    id: 'audit-blk-unreviewed-2',
    title: '미검토 창작 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'core',
    durationMin: 10,
    isReviewed: false,
    steps: [
      {
        exerciseId: 'audit-ex-unreviewed-99',
        blockCategory: 'core',
        durationMin: 10,
        selectedLayer: 'standard',
      },
    ],
  },
];

// Dynamically constructed synthetic server env (never matches literal secret scanners)
const SYNTHETIC_GEMINI_ENV = {
  GEMINI_API_KEY: ['test-server', 'gemini', 'token'].join('-'),
  GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
  GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
};

const SYNTHETIC_OPENROUTER_ENV = {
  OPENROUTER_API_KEY: ['test-server', 'openrouter', 'token'].join('-'),
  OPENROUTER_FREE_MODEL: 'google/gemma-4-31b-it:free',
};

const SAMPLE_SERVER_CLASS_DRAFT_REQ: FreeAiServerRequest = {
  task: 'class-draft',
  conditions: {
    durationMinutes: 50,
    theme: '코어·둔근 균형 리포머 플로우',
    strengthenAreas: ['core', 'glute-lower'],
    level: '1.5',
    apparatus: 'reformer',
  },
  reviewedCatalog: [
    {
      id: 'audit-ex-warmup',
      nameKo: '리포머 흉식 호흡 워밍업',
      nameEn: 'Reformer Breath Warmup',
      apparatus: 'reformer',
      blockCategory: 'warmup',
      level: '1.0',
      defaultDurationMin: 5,
      isReviewed: true,
    },
    {
      id: 'audit-ex-core',
      nameKo: '헌드레드 코어 컨트롤',
      nameEn: 'Hundred Core Control',
      apparatus: 'reformer',
      blockCategory: 'core',
      level: '1.5',
      defaultDurationMin: 6,
      isReviewed: true,
    },
  ],
};

function makeGeminiUpstreamResponse(payload: Record<string, unknown>, status = 200): Response {
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

function makeOpenRouterUpstreamResponse(payload: Record<string, unknown>, status = 200): Response {
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

const VALID_UPSTREAM_CLASS_DRAFT_JSON = {
  title: '무료 AI 리포머 코어 50분 초안',
  subtitle: '검토 완료 동작 기반 구성',
  targetMinutes: 50,
  level: '1.5',
  apparatus: 'reformer',
  focusPreset: 'core-sculpt',
  strengthenAreas: ['core', 'glute-lower'],
  coachingSummary: '워밍업과 코어 블록을 연결한 초안입니다.',
  steps: [
    {
      stepId: 'step-1',
      order: 1,
      exerciseId: 'audit-ex-warmup',
      nameKo: '리포머 흉식 호흡 워밍업',
      nameEn: 'Reformer Breath Warmup',
      apparatus: 'reformer',
      blockCategory: 'warmup',
      durationMin: 20,
      selectedLayer: 'standard',
      instructorNote: '흉곽 호흡 연결',
      isReviewed: true,
    },
    {
      stepId: 'step-2',
      order: 2,
      exerciseId: 'audit-ex-core',
      nameKo: '헌드레드 코어 컨트롤',
      nameEn: 'Hundred Core Control',
      apparatus: 'reformer',
      blockCategory: 'core',
      durationMin: 30,
      selectedLayer: 'standard',
      instructorNote: '복횡근 수축 유지',
      isReviewed: true,
    },
  ],
};

function resetStudioStoreWithReviewedCatalog() {
  localStorage.clear();
  usePilatesStore.getState().resetDemoData();
  usePilatesStore.setState({
    exercises: structuredClone(REVIEWED_CATALOG),
    ownedApparatus: ['reformer', 'mat', 'cadillac', 'chair', 'barrel'],
    ownedEquipment: ['reformer', 'mat', 'cadillac', 'chair', 'barrel'],
    ownedProps: ['mini-ball', 'magic-circle', 'theraband', 'foam-roller'],
    conditionTemplates: structuredClone(SAMPLE_TEMPLATES),
    savedSequences: [],
    historyLogs: [],
    generationError: null,
    saveFeedback: null,
    persistenceError: null,
  });
}

describe('Track A Audit — Free Quota Exhaustion / 429 / 401 / Timeout / Offline Boundary & Studio Survival', () => {
  beforeEach(() => {
    resetStudioStoreWithReviewedCatalog();
  });

  describe('1. Current Implementation Status vs Non-Existent Features Distinction', () => {
    it('verifies AiSequenceCoPilotPanel + generateAiThematicSequence is strictly a local rule engine and never calls fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw new Error('Network fetch must never be called by local AiSequenceCoPilotPanel');
      });

      try {
        const directResult = await generateAiThematicSequence({
          themeId: 'posture-upper',
          customPrompt: '상체와 코어 연결 위주로 구성',
          targetMinutes: 50,
          restMinutes: 0,
          equipmentIds: ['reformer'],
          level: '1.5',
          excludeDaysWindow: 14,
          exercises: REVIEWED_CATALOG,
          historyLogs: [],
          savedSequences: [],
        });

        expect(directResult.engineSource).toBe('local-rules');
        expect(directResult.modelName).toBe('로컬 규칙 추천 · 외부 AI 미연결');
        expect(directResult.steps.length).toBeGreaterThanOrEqual(4);
        expect(
          directResult.steps.every((step) =>
            REVIEWED_CATALOG.some((ex) => ex.id === step.exerciseId && isExerciseAutoEligible(ex)),
          ),
        ).toBe(true);
        expect(fetchSpy).not.toHaveBeenCalled();

        const criteria: AutoGenerateCriteria = {
          apparatus: 'reformer',
          level: '1.5',
          focusPreset: 'posture-upper',
          preferredProps: ['none'],
          excludeDaysWindow: 14,
          targetMinutes: 50,
          defaultLayer: 'standard',
        };

        render(<AiSequenceCoPilotPanel criteria={criteria} selectedEquipment={['reformer']} />);

        expect(screen.getByRole('heading', { name: '주제별 수업 추천' })).toBeVisible();
        expect(screen.queryByRole('button', { name: /외부 AI 생성/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '50분 수업 추천받기' }));

        await waitFor(() => {
          expect(screen.getByRole('region', { name: '추천 수업 미리보기' })).toBeInTheDocument();
        });

        fireEvent.click(
          screen.getByRole('button', {
            name: /새 수업 초안으로 적용/,
          }),
        );

        const storeState = usePilatesStore.getState();
        expect(storeState.activeSteps.length).toBeGreaterThanOrEqual(4);
        expect(storeState.activeTitle).toContain('[로컬 추천]');
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('verifies localAppDeploy (@appdeploy/client) rejects with local_api_unavailable and freeAiClient seamlessly falls back to local-rule-engine', async () => {
      await expect(localAppDeployApi.get('/api/studio/ai/status')).rejects.toMatchObject({
        code: 'local_api_unavailable',
      });
      await expect(
        localAppDeployApi.post('/api/studio/ai/assist', { task: 'class-draft' }),
      ).rejects.toMatchObject({
        code: 'local_api_unavailable',
      });

      const defaultTransportClient = createFreeAiClient({ envRecord: {} });
      const refreshedStatus = await defaultTransportClient.refreshQuotaStatus();
      expect(refreshedStatus.enabled).toBe(false);
      expect(refreshedStatus.exhausted).toBe(false);
      expect(refreshedStatus.reason).toBe('unconfigured');

      const draftResp = await defaultTransportClient.requestClassDraft(
        {
          durationMinutes: 50,
          theme: '리포머 코어 정렬',
          strengthenAreas: ['core'],
          level: '1.5',
          apparatus: 'reformer',
        },
        REVIEWED_CATALOG,
        SAMPLE_TEMPLATES,
      );
      expect(draftResp.usedLocalFallback).toBe(true);
      expect(draftResp.result.source).toBe('local-rule-engine');
      expect(draftResp.result.provider).toBe('none');
      expect(draftResp.result.steps.length).toBeGreaterThan(0);
    });
  });

  describe('2. Billing Prevention & Free Quota Exhaustion / HTTP 429', () => {
    it('blocks paid/retired Gemini & OpenRouter models with invalid_paid_model_blocked and unconfirmed billing guard with billing_guard_unconfirmed', () => {
      for (const paidOrRetiredGeminiModel of [
        'gemini-4-argon',
        'gemini-3.8-pro',
        'gemini-3.1-pro-preview',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ]) {
        const cfg = resolveFreeAiConfig({
          GEMINI_API_KEY: SYNTHETIC_GEMINI_ENV.GEMINI_API_KEY,
          GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
          GEMINI_FREE_MODEL: paidOrRetiredGeminiModel,
        });
        expect(cfg.enabled).toBe(false);
        expect(cfg.reason).toBe('invalid_paid_model_blocked');
        expect(cfg.apiKey).toBeNull();
        expect(cfg.model).toBeNull();
      }

      for (const paidOpenRouterModel of [
        'google/gemma-4-31b-it',
        'anthropic/claude-3.7-sonnet',
        'openai/gpt-4o',
      ]) {
        const cfg = resolveFreeAiConfig({
          OPENROUTER_API_KEY: SYNTHETIC_OPENROUTER_ENV.OPENROUTER_API_KEY,
          OPENROUTER_FREE_MODEL: paidOpenRouterModel,
        });
        expect(cfg.enabled).toBe(false);
        expect(cfg.reason).toBe('invalid_paid_model_blocked');
        expect(cfg.apiKey).toBeNull();
        expect(cfg.model).toBeNull();
      }

      const unconfirmedGemini = resolveFreeAiConfig({
        GEMINI_API_KEY: SYNTHETIC_GEMINI_ENV.GEMINI_API_KEY,
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'false',
        GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
      });
      expect(unconfirmedGemini.enabled).toBe(false);
      expect(unconfirmedGemini.reason).toBe('billing_guard_unconfirmed');
      expect(unconfirmedGemini.apiKey).toBeNull();
    });

    it('enforces max_price=0 & allow_fallbacks=false on OpenRouter and omits paid grounding tools on Gemini upstream payloads', async () => {
      const openRouterFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(makeOpenRouterUpstreamResponse(VALID_UPSTREAM_CLASS_DRAFT_JSON));

      const orService = createFreeAiService({
        env: SYNTHETIC_OPENROUTER_ENV,
        fetchFn: openRouterFetch,
      });

      await orService.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(openRouterFetch).toHaveBeenCalledTimes(1);
      const [, orInit] = openRouterFetch.mock.calls[0];
      const orBody = JSON.parse(String(orInit?.body));
      expect(orBody.provider).toEqual({
        allow_fallbacks: false,
        max_price: {
          prompt: 0,
          completion: 0,
        },
      });

      const geminiFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(makeGeminiUpstreamResponse(VALID_UPSTREAM_CLASS_DRAFT_JSON));

      const geminiService = createFreeAiService({
        env: SYNTHETIC_GEMINI_ENV,
        fetchFn: geminiFetch,
      });

      await geminiService.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(geminiFetch).toHaveBeenCalledTimes(1);
      const [, geminiInit] = geminiFetch.mock.calls[0];
      const geminiBody = JSON.parse(String(geminiInit?.body));
      expect(geminiBody.tools).toBeUndefined();
      expect(geminiBody.toolConfig).toBeUndefined();
      expect(geminiBody.google_search).toBeUndefined();
    });

    it('locks external AI on minute/daily quota exhaustion and upstream HTTP 429/402 with exact PT/UTC renewal timestamps and zero paid fallback', async () => {
      const fixedNowMs = Date.parse('2026-11-07T01:30:00.000Z');
      const expectedGeminiResetIso = new Date(
        computeNextGeminiDailyResetMs(fixedNowMs),
      ).toISOString();
      expect(expectedGeminiResetIso).toBe('2026-11-07T08:00:00.000Z');

      const expectedOpenRouterResetIso = new Date(
        computeNextOpenRouterDailyResetMs(fixedNowMs),
      ).toISOString();
      expect(expectedOpenRouterResetIso).toBe('2026-11-08T00:00:00.000Z');

      // 1) Daily limit exhaustion
      const fetchDaily = vi
        .fn<typeof fetch>()
        .mockImplementation(async () =>
          makeGeminiUpstreamResponse(VALID_UPSTREAM_CLASS_DRAFT_JSON),
        );
      const dailyService = createFreeAiService({
        env: SYNTHETIC_GEMINI_ENV,
        fetchFn: fetchDaily,
        now: () => fixedNowMs,
        minuteLimit: 5,
        dailyLimit: 1,
      });

      await dailyService.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(dailyService.getStatus().exhausted).toBe(true);
      expect(dailyService.getStatus().reason).toBe('free_quota_exhausted');
      expect(dailyService.getStatus().renewal?.resetAt).toBe('2026-11-07T08:00:00.000Z');
      expect(dailyService.getStatus().renewal?.resetTimezone).toBe('America/Los_Angeles');

      // Different request after exhaustion must fail immediately without calling fetchFn
      const secondReq: FreeAiServerRequest = {
        ...SAMPLE_SERVER_CLASS_DRAFT_REQ,
        conditions: {
          ...SAMPLE_SERVER_CLASS_DRAFT_REQ.conditions,
          theme: '두 번째 다른 요청',
        },
      };
      await expect(dailyService.assist('instructor-1', secondReq)).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
      });
      expect(fetchDaily).toHaveBeenCalledTimes(1);

      // 2) Upstream HTTP 429 & 402 lock external calls and never retry paid models
      const fetch429 = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Retry-After': '45' },
        }),
      );
      const service429 = createFreeAiService({
        env: SYNTHETIC_OPENROUTER_ENV,
        fetchFn: fetch429,
        now: () => fixedNowMs,
        minuteLimit: 10,
        dailyLimit: 50,
      });

      await expect(
        service429.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
        message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
      });
      expect(service429.getStatus().exhausted).toBe(true);
      expect(service429.getStatus().renewal?.resetTimezone).toBe('UTC');
      expect(service429.getStatus().renewal?.remainingSeconds).toBe(45);
      expect(fetch429).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Normal Studio Operations & Class Saving Survival under All 5 Failure Modes', () => {
    const FAILURE_MODES: ReadonlyArray<{
      id: string;
      label: string;
      expectedClientErrorCode: 'free_quota_exhausted' | 'request_failed';
      createFailingTransport: () => FreeAiTransport;
    }> = [
      {
        id: 'quota-exhausted',
        label: '1) Free Quota Exhausted (free_quota_exhausted)',
        expectedClientErrorCode: 'free_quota_exhausted',
        createFailingTransport: () => {
          const renewal = computeQuotaRenewal({
            provider: 'gemini-free',
            resetWindow: 'daily',
            nowMs: Date.parse('2026-11-07T02:00:00.000Z'),
          });
          const exhaustedStatus = createDefaultFreeAiStatus({
            provider: 'gemini-free',
            model: 'gemini-3.5-flash-lite',
            enabled: true,
            exhausted: true,
            reason: 'free_quota_exhausted',
            minuteRemaining: 0,
            dailyRemaining: 0,
            renewal,
          });
          return {
            getStatus: async () => exhaustedStatus,
            postAssist: async () => {
              throw Object.assign(new Error(FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE), {
                code: 'free_quota_exhausted',
                status: 429,
                data: {
                  code: 'free_quota_exhausted',
                  message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
                  status: exhaustedStatus,
                  renewal,
                },
              });
            },
          };
        },
      },
      {
        id: 'http-429',
        label: '2) Upstream HTTP 429 Too Many Requests',
        expectedClientErrorCode: 'free_quota_exhausted',
        createFailingTransport: () => ({
          getStatus: async () =>
            createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
          postAssist: async () => {
            throw Object.assign(new Error('HTTP 429 Too Many Requests'), {
              status: 429,
              response: {
                status: 429,
                data: {
                  code: 'free_quota_exhausted',
                  message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
                },
              },
            });
          },
        }),
      },
      {
        id: 'http-401',
        label: '3) HTTP 401 Unauthorized / Invalid Upstream Credential',
        expectedClientErrorCode: 'request_failed',
        createFailingTransport: () => ({
          getStatus: async () =>
            createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
          postAssist: async () => {
            throw Object.assign(
              new Error(
                '외부 무료 AI 서비스가 오류 상태(401)를 반환했습니다. 유료 폴백 없이 중단되었으며 로컬 추천 엔진을 계속 사용할 수 있습니다.',
              ),
              {
                code: 'upstream_error',
                status: 401,
              },
            );
          },
        }),
      },
      {
        id: 'timeout-abort',
        label: '4) Request Timeout / AbortError (ETIMEDOUT)',
        expectedClientErrorCode: 'request_failed',
        createFailingTransport: () => ({
          getStatus: async () =>
            createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
          postAssist: async () => {
            const timeoutErr = new Error('The operation was aborted due to timeout');
            timeoutErr.name = 'AbortError';
            throw Object.assign(timeoutErr, { code: 'ETIMEDOUT' });
          },
        }),
      },
      {
        id: 'offline-network',
        label: '5) Offline / Network Disconnected (TypeError: Failed to fetch)',
        expectedClientErrorCode: 'request_failed',
        createFailingTransport: () => ({
          getStatus: async () =>
            createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
          postAssist: async () => {
            throw new TypeError('Failed to fetch');
          },
        }),
      },
    ];

    it.each(FAILURE_MODES)(
      'survives $label — local AI fallbacks, sequence editing, binder saving, history logging, and backup/restore work 100%',
      async ({ expectedClientErrorCode, createFailingTransport }) => {
        resetStudioStoreWithReviewedCatalog();
        const client = createFreeAiClient({
          transport: createFailingTransport(),
          envRecord: {},
        });

        await client.refreshQuotaStatus();

        // 1) External AI call fails with expected error code
        await expect(
          client.requestClassDraft(
            {
              durationMinutes: 50,
              theme: '코어·둔근 강화 리포머',
              strengthenAreas: ['core', 'glute-lower'],
              level: '1.5',
              apparatus: 'reformer',
            },
            REVIEWED_CATALOG,
            SAMPLE_TEMPLATES,
            { preferLocalOnly: false },
          ),
        ).rejects.toMatchObject({
          name: 'FreeAiClientError',
          code: expectedClientErrorCode,
        });

        // 2) Local fallback calls via freeAiClient (preferLocalOnly: true) succeed 100%
        const localDraftResp = await client.requestClassDraft(
          {
            durationMinutes: 50,
            theme: '코어·둔근 강화 리포머',
            strengthenAreas: ['core', 'glute-lower'],
            level: '1.5',
            apparatus: 'reformer',
          },
          REVIEWED_CATALOG,
          SAMPLE_TEMPLATES,
          { preferLocalOnly: true },
        );
        expect(localDraftResp.usedLocalFallback).toBe(true);
        expect(localDraftResp.result.source).toBe('local-rule-engine');
        expect(localDraftResp.result.steps.length).toBeGreaterThanOrEqual(4);
        expect(localDraftResp.result.guaranteesSafetyOrEffect).toBe(false);

        const localIdeaResp = await client.requestMovementIdea(
          {
            rawIdeaText: '풋바 아치 지지와 골반 분절을 연결하는 브릿지 변형',
            apparatus: 'reformer',
            blockCategory: 'bridging',
            strengthenArea: 'glute-lower',
            level: '1.5',
          },
          { preferLocalOnly: true },
        );
        expect(localIdeaResp.usedLocalFallback).toBe(true);
        expect(localIdeaResp.result.source).toBe('local-rule-engine');
        expect(localIdeaResp.result.reviewStatus).toBe('unreviewed-creative');
        expect(localIdeaResp.result.guaranteesSafetyOrEffect).toBe(false);

        const localComposeResp = await client.requestSequenceCompose(
          {
            targetMinutes: 50,
            level: '1.5',
            apparatus: 'reformer',
            theme: '검토 완료 블록 시퀀스',
            strengthenAreas: ['core', 'glute-lower'],
            selectedExerciseIds: ['audit-ex-warmup', 'audit-ex-cooldown', 'audit-ex-unreviewed-99'],
            selectedBlockIds: ['audit-blk-reviewed-1', 'audit-blk-unreviewed-2'],
          },
          REVIEWED_CATALOG,
          SAMPLE_REUSABLE_BLOCKS,
          { preferLocalOnly: true },
        );
        expect(localComposeResp.usedLocalFallback).toBe(true);
        expect(localComposeResp.result.source).toBe('local-rule-engine');
        expect(localComposeResp.result.excludedUnreviewedIds).toEqual(
          expect.arrayContaining(['audit-ex-unreviewed-99', 'audit-blk-unreviewed-2']),
        );
        expect(
          localComposeResp.result.steps.some((s) => s.exerciseId === 'audit-ex-unreviewed-99'),
        ).toBe(false);

        // 3) Direct local engine functions also succeed 100%
        const directDraft = buildLocalClassDraft(
          {
            durationMinutes: 50,
            theme: '직접 로컬 초안',
            strengthenAreas: ['core'],
            level: '1.5',
            apparatus: 'reformer',
          },
          REVIEWED_CATALOG,
          SAMPLE_TEMPLATES,
        );
        expect(directDraft.steps.length).toBeGreaterThan(0);

        const directIdea = buildLocalMovementIdea({
          rawIdeaText: '스트랩을 활용한 흉추 회전 변형',
          apparatus: 'reformer',
          blockCategory: 'upper-body',
          strengthenArea: 'posture-upper',
          level: '1.5',
        });
        expect(directIdea.reviewStatus).toBe('unreviewed-creative');

        const directCompose = composeSequenceFromReviewedItems(
          {
            targetMinutes: 40,
            level: '1.5',
            apparatus: 'reformer',
            strengthenAreas: ['core'],
            selectedExerciseIds: ['audit-ex-warmup', 'audit-ex-core', 'audit-ex-cooldown'],
          },
          REVIEWED_CATALOG,
          SAMPLE_REUSABLE_BLOCKS,
        );
        expect(directCompose.steps).toHaveLength(3);

        // 4) Core usePilatesStore operations & class persistence survive without error
        const store = usePilatesStore.getState();

        // 4a. Auto-generate sequence
        store.autoGenerateSequence({
          apparatus: 'reformer',
          level: '1.5',
          focusPreset: 'core-sculpt',
          preferredProps: ['none'],
          excludeDaysWindow: 14,
          targetMinutes: 50,
          defaultLayer: 'standard',
        });
        expect(usePilatesStore.getState().generationError).toBeNull();
        expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThanOrEqual(4);

        // 4b. Apply local AI draft steps to workbench and edit
        const sequenceSteps = editableStepsToSequenceSteps(localDraftResp.result.steps);
        usePilatesStore.setState({
          activeTitle: localDraftResp.result.title,
          activeSubtitle: localDraftResp.result.subtitle,
          activeTargetMinutes: localDraftResp.result.targetMinutes,
          activeLevel: localDraftResp.result.level,
          activeApparatus: localDraftResp.result.apparatus,
          activeSteps: sequenceSteps,
        });

        usePilatesStore.getState().updateStepNote(0, '강사 수동 큐잉 메모 추가 완료');
        expect(usePilatesStore.getState().activeSteps[0]?.instructorNote).toBe(
          '강사 수동 큐잉 메모 추가 완료',
        );

        const restRes = usePilatesStore.getState().addRestStep(2, 0);
        expect(restRes.success).toBe(true);

        // 4c. Save sequence to binder
        const savedSeqId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
        expect(savedSeqId).toMatch(/^seq-/);
        const savedSeq = usePilatesStore.getState().savedSequences.find((s) => s.id === savedSeqId);
        expect(savedSeq).toBeDefined();
        expect(savedSeq?.title).toBe(localDraftResp.result.title);
        expect(usePilatesStore.getState().saveFeedback).toBe('이 브라우저에 수업을 저장했습니다.');

        // 4d. Save and apply condition template
        usePilatesStore.getState().saveConditionTemplate('오프라인 생존 테스트 프리셋');
        const createdTpl = usePilatesStore
          .getState()
          .conditionTemplates.find((t) => t.name === '오프라인 생존 테스트 프리셋');
        expect(createdTpl).toBeDefined();
        usePilatesStore.getState().applyConditionTemplate(createdTpl!.id);
        expect(usePilatesStore.getState().saveFeedback).toContain('조건을 불러왔습니다.');

        // 4e. Log class session
        const groupId = usePilatesStore.getState().classGroups[0]?.id ?? 'group-1';
        usePilatesStore.getState().logClassSession({
          sequenceId: savedSeqId,
          groupId,
          taughtAt: '2026-11-07T10:00:00.000Z',
          rating: 5,
          intensity: 'moderate',
          instructorReflection: '외부 AI 장애 중에도 로컬 시퀀스로 수업을 정상 진행하고 기록함.',
        });
        expect(usePilatesStore.getState().historyLogs[0]?.sequenceId).toBe(savedSeqId);
        expect(usePilatesStore.getState().saveFeedback).toBe(
          '수업 기록을 이 브라우저에 저장했습니다.',
        );

        // 4f. Full JSON backup export & restore round-trip
        const exportedJson = usePilatesStore.getState().exportBackup();
        const parsedBackup = JSON.parse(exportedJson);
        expect(parsedBackup.format).toBe('pilates-flow-atelier');
        expect(
          parsedBackup.data.savedSequences.some((s: { id: string }) => s.id === savedSeqId),
        ).toBe(true);

        // Remove the sequence locally and restore from backup
        usePilatesStore.getState().deleteSavedSequence(savedSeqId);
        expect(usePilatesStore.getState().savedSequences.some((s) => s.id === savedSeqId)).toBe(
          false,
        );

        const restoreRes = usePilatesStore.getState().restoreBackup(exportedJson);
        expect(restoreRes.success).toBe(true);
        expect(usePilatesStore.getState().savedSequences.some((s) => s.id === savedSeqId)).toBe(
          true,
        );

        // 5) FreeAiAssistantPanel UI survival: local draft generation + edit + apply to workbench
        const { unmount } = render(
          <FreeAiAssistantPanel
            exercises={REVIEWED_CATALOG}
            reusableBlocks={SAMPLE_REUSABLE_BLOCKS}
            conditionTemplates={SAMPLE_TEMPLATES}
            client={client}
            onApplyDraftSequence={(payload) => {
              usePilatesStore.setState({
                activeTitle: payload.title,
                activeSubtitle: payload.subtitle,
                activeTargetMinutes: payload.targetMinutes,
                activeLevel: payload.level,
                activeApparatus: payload.apparatus,
                activeSteps: payload.steps,
              });
            }}
          />,
        );

        fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));

        await waitFor(() => {
          expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('초안 제목 편집'), {
          target: { value: 'UI 로컬 폴백 생존 검증 수업' },
        });
        fireEvent.click(screen.getByRole('button', { name: '워크벤치 수업안에 반영' }));
        expect(usePilatesStore.getState().activeTitle).toBe('UI 로컬 폴백 생존 검증 수업');
        unmount();
      },
      15000,
    );
  });

  describe('4. Exact Reproduction of Discovered Track A Defects', () => {
    it('DEFECT-A1: createFreeAiService passes no AbortSignal timeout to fetchFn, and a hung postAssist locks FreeAiAssistantPanel isLoading=true (disabling the local fallback button)', async () => {
      // Part 1: Verify backend callUpstreamFreeProvider passes no signal (timeout) in fetch init
      const fetchSpy = vi
        .fn<typeof fetch>()
        .mockResolvedValue(makeGeminiUpstreamResponse(VALID_UPSTREAM_CLASS_DRAFT_JSON));
      const service = createFreeAiService({
        env: SYNTHETIC_GEMINI_ENV,
        fetchFn: fetchSpy,
      });

      await service.assist('instructor-timeout-check', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, fetchInit] = fetchSpy.mock.calls[0];
      // DEFECT-A1 reproduction: no AbortSignal / timeout is configured on upstream fetch
      expect(fetchInit?.signal).toBeUndefined();

      // Part 2: Verify a hung transport.postAssist keeps FreeAiAssistantPanel in isLoading=true,
      // which disables the local fallback button ('조건으로 초안 만들기')
      let rejectHungRequest!: (reason?: unknown) => void;
      const hungTransport: FreeAiTransport = {
        getStatus: async () =>
          createDefaultFreeAiStatus({
            provider: 'gemini-free',
            model: 'gemini-3.5-flash-lite',
            enabled: true,
            exhausted: false,
            reason: 'ready',
          }),
        postAssist: () =>
          new Promise<{ status: FreeAiQuotaStatus; result: FreeAiAssistResult }>(
            (_resolve, reject) => {
              rejectHungRequest = reject;
            },
          ),
      };

      const hungClient = createFreeAiClient({
        transport: hungTransport,
        maxConcurrentRequests: 1,
        envRecord: {},
      });

      render(
        <FreeAiAssistantPanel
          exercises={REVIEWED_CATALOG}
          conditionTemplates={SAMPLE_TEMPLATES}
          client={hungClient}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).not.toBeDisabled();
      });

      // Click external AI button -> transport.postAssist hangs
      fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));

      const localFallbackBtn = screen.getByRole('button', {
        name: '조건으로 초안 만들기',
      });

      // DEFECT-A1 reproduction: while external AI call is hung, the local fallback UI button is ALSO disabled!
      expect(localFallbackBtn).toBeDisabled();
      expect(hungClient.getQuotaStatus().activeRequests).toBe(1);

      // A second non-local request while hung throws concurrency_limit_exceeded
      await expect(
        hungClient.requestClassDraft(
          {
            durationMinutes: 50,
            theme: '동시 요청 테스트',
            strengthenAreas: ['core'],
            level: '1.5',
            apparatus: 'reformer',
          },
          REVIEWED_CATALOG,
          SAMPLE_TEMPLATES,
        ),
      ).rejects.toMatchObject({
        code: 'concurrency_limit_exceeded',
      });

      // Clean up the hung promise so the component settles cleanly
      rejectHungRequest(new Error('Aborted after hang verification'));
      await waitFor(() => {
        expect(localFallbackBtn).not.toBeDisabled();
      });
    });

    it('DEFECT-A2: HTTP 401 / Timeout / Offline errors on postAssist or refreshQuotaStatus leave quotaStatus.enabled=true and reason="ready" instead of disabling external AI', async () => {
      const transientErrors = [
        {
          label: 'HTTP 401 Unauthorized',
          err: Object.assign(new Error('HTTP 401 Unauthorized'), {
            status: 401,
            code: 'upstream_error',
          }),
        },
        {
          label: 'Timeout AbortError',
          err: Object.assign(new Error('Request timed out'), {
            name: 'AbortError',
            code: 'ETIMEDOUT',
          }),
        },
        {
          label: 'Offline TypeError: Failed to fetch',
          err: new TypeError('Failed to fetch'),
        },
      ];

      for (const { err } of transientErrors) {
        let shouldFailStatus = false;
        const transport: FreeAiTransport = {
          getStatus: async () => {
            if (shouldFailStatus) throw err;
            return createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            });
          },
          postAssist: async () => {
            throw err;
          },
        };

        const client = createFreeAiClient({ transport, envRecord: {} });
        const initialStatus = await client.refreshQuotaStatus();
        expect(initialStatus.enabled).toBe(true);
        expect(initialStatus.reason).toBe('ready');

        await expect(
          client.requestClassDraft(
            {
              durationMinutes: 50,
              theme: '오류 상태 전이 확인',
              strengthenAreas: ['core'],
              level: '1.5',
              apparatus: 'reformer',
            },
            REVIEWED_CATALOG,
            SAMPLE_TEMPLATES,
          ),
        ).rejects.toMatchObject({
          code: 'request_failed',
        });

        // DEFECT-A2 reproduction: after 401 / Timeout / Offline error, quotaStatus.enabled is STILL true and reason is STILL 'ready'
        const statusAfterPostError = client.getQuotaStatus();
        expect(statusAfterPostError.enabled).toBe(true);
        expect(statusAfterPostError.exhausted).toBe(false);
        expect(statusAfterPostError.reason).toBe('ready');

        // Even if refreshQuotaStatus() subsequently fails with 401 / Timeout / Offline,
        // it throws request_failed and leaves currentStatus.enabled === true!
        shouldFailStatus = true;
        await expect(client.refreshQuotaStatus()).rejects.toMatchObject({
          code: 'request_failed',
        });
        expect(client.getQuotaStatus().enabled).toBe(true);
        expect(client.getQuotaStatus().reason).toBe('ready');
      }

      // Verify UI impact in FreeAiAssistantPanel when 401 / Offline occurs:
      const offlineAfterReadyClient = createFreeAiClient({
        transport: {
          getStatus: async () =>
            createDefaultFreeAiStatus({
              provider: 'gemini-free',
              model: 'gemini-3.5-flash-lite',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
          postAssist: async () => {
            throw new TypeError('Failed to fetch');
          },
        },
        envRecord: {},
      });

      const { unmount } = render(
        <FreeAiAssistantPanel
          exercises={REVIEWED_CATALOG}
          conditionTemplates={SAMPLE_TEMPLATES}
          client={offlineAfterReadyClient}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('AI 초안')).toBeInTheDocument();
      });

      const primaryBtn = screen.getByRole('button', { name: '무료 AI 초안 만들기' });
      fireEvent.click(primaryBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');
      });

      // The failed request is visible without claiming a live connection.
      // Existing retry behavior remains enabled; client status is still asserted above.
      expect(screen.getByText('AI 응답 확인 필요')).toBeInTheDocument();
      expect(primaryBtn).not.toBeDisabled();
      unmount();
    });

    it('DEFECT-A3 (resolved regression): rolls back reserved quota on 401/network/invalid-JSON failures, consumes on success, enforces concurrent & repeated limits, and forbids paid fallback', async () => {
      const fixedNowMs = Date.parse('2026-11-07T03:00:00.000Z');
      let callCount = 0;
      let resolveFourthCall!: (res: Response) => void;

      const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          // 1st attempt: upstream HTTP 401 -> must roll back reserved quota
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
          });
        }
        if (callCount === 2) {
          // 2nd attempt: network failure -> must roll back reserved quota
          throw new TypeError('fetch failed');
        }
        if (callCount === 3) {
          // 3rd attempt: schema-invalid 200 JSON -> must roll back reserved quota
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: '{"invalid":"payload"}' }] } }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        // 4th attempt: stays in-flight until resolved to verify concurrency & reservation limits
        return new Promise<Response>((resolve) => {
          resolveFourthCall = resolve;
        });
      });

      const service = createFreeAiService({
        env: SYNTHETIC_GEMINI_ENV,
        fetchFn,
        now: () => fixedNowMs,
        minuteLimit: 1,
        dailyLimit: 5,
        maxConcurrentPerUser: 1,
        maxConcurrentGlobal: 2,
      });

      expect(service.getStatus().minuteUsed).toBe(0);
      expect(service.getStatus().dailyUsed).toBe(0);

      // 1) Upstream HTTP 401 fails with 502 upstream_error (zero paid fallback) and rolls back quota to 0
      await expect(
        service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'upstream_error',
        status: 502,
        message: expect.stringContaining('자동 유료 충전이나 대체 호출 없이 중단했으며'),
      });
      expect(service.getStatus()).toMatchObject({
        minuteUsed: 0,
        dailyUsed: 0,
        minuteRemaining: 1,
        dailyRemaining: 5,
        exhausted: false,
        reason: 'ready',
        activeRequests: 0,
      });

      // 2) Network failure also rolls back quota to 0 without paid retry
      await expect(
        service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'upstream_error',
        status: 502,
        message: expect.stringContaining('추가 과금 재시도 없이 중단했으며'),
      });
      expect(service.getStatus()).toMatchObject({
        minuteUsed: 0,
        dailyUsed: 0,
        exhausted: false,
        activeRequests: 0,
      });

      // 3) Malformed / schema-invalid upstream JSON rolls back quota to 0
      await expect(
        service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'invalid_ai_response',
        status: 502,
      });
      expect(service.getStatus()).toMatchObject({
        minuteUsed: 0,
        dailyUsed: 0,
        exhausted: false,
        activeRequests: 0,
      });
      expect(fetchFn).toHaveBeenCalledTimes(3);

      // 4) In-flight 4th call reserves active slot & minuteLimit=1 slot immediately:
      //    - same user concurrent request -> concurrency_limit_exceeded (429)
      //    - different user uncached request -> free_quota_exhausted (429)
      const inFlightPromise = service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(service.getStatus().activeRequests).toBe(1);
      expect(service.getStatus().minuteUsed).toBe(1);

      await expect(
        service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'concurrency_limit_exceeded',
        status: 429,
      });

      const distinctUncachedReq: FreeAiServerRequest = {
        ...SAMPLE_SERVER_CLASS_DRAFT_REQ,
        conditions: {
          ...SAMPLE_SERVER_CLASS_DRAFT_REQ.conditions,
          theme: '동시 호출 한도 초과 검증용 별도 주제',
        },
      };
      await expect(service.assist('instructor-2', distinctUncachedReq)).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
      });
      expect(fetchFn).toHaveBeenCalledTimes(4);

      // 5) Resolve 4th call with valid response -> permanently consumes 1 quota unit
      resolveFourthCall(makeGeminiUpstreamResponse(VALID_UPSTREAM_CLASS_DRAFT_JSON));
      const succeededResult = await inFlightPromise;
      expect(succeededResult.source).toBe('external-free-ai');
      expect(succeededResult.provider).toBe('gemini-free');
      expect(succeededResult.guaranteesSafetyOrEffect).toBe(false);

      const statusAfterSuccess = service.getStatus();
      expect(statusAfterSuccess).toMatchObject({
        minuteUsed: 1,
        dailyUsed: 1,
        minuteRemaining: 0,
        dailyRemaining: 4,
        exhausted: true,
        reason: 'free_quota_exhausted',
        activeRequests: 0,
      });

      // Identical request hits cache without extra upstream calls, whereas a new uncached request is blocked by minuteLimit=1
      const cachedHit = await service.assist('instructor-1', SAMPLE_SERVER_CLASS_DRAFT_REQ);
      expect(cachedHit.cached).toBe(true);

      await expect(service.assist('instructor-1', distinctUncachedReq)).rejects.toMatchObject({
        code: 'free_quota_exhausted',
        status: 429,
        message: FREE_QUOTA_EXHAUSTED_ERROR_MESSAGE,
      });
      expect(fetchFn).toHaveBeenCalledTimes(4);
      for (const [calledUrl] of fetchFn.mock.calls) {
        expect(String(calledUrl)).toContain('gemini-3.5-flash-lite:generateContent');
      }

      // 6) Verify HTTP route handler also embeds rolled-back status (minuteUsed=0, exhausted=false) on 502 failure,
      //    and blocks paid models with 0 upstream calls
      const failingRouteFetch = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new TypeError('fetch failed'));
      const routes = createFreeAiRoutes(
        createFreeAiService({
          env: SYNTHETIC_GEMINI_ENV,
          fetchFn: failingRouteFetch,
          now: () => fixedNowMs,
          minuteLimit: 1,
          dailyLimit: 5,
        }),
      );
      const routeRes = await routes['POST /api/studio/ai/assist']({
        user: { userId: 'instructor-route', scope: 'openid' },
        body: SAMPLE_SERVER_CLASS_DRAFT_REQ,
      });
      expect(routeRes.statusCode).toBe(502);
      const routeBody = JSON.parse(routeRes.body);
      expect(routeBody.code).toBe('upstream_error');
      expect(routeBody.status.minuteUsed).toBe(0);
      expect(routeBody.status.dailyUsed).toBe(0);
      expect(routeBody.status.exhausted).toBe(false);
      expect(failingRouteFetch).toHaveBeenCalledTimes(1);

      const paidFetchSpy = vi.fn<typeof fetch>();
      const paidBlockedService = createFreeAiService({
        env: {
          ...SYNTHETIC_GEMINI_ENV,
          GEMINI_FREE_MODEL: 'gemini-2.0-flash',
        },
        fetchFn: paidFetchSpy,
        now: () => fixedNowMs,
      });
      await expect(
        paidBlockedService.assist('instructor-paid-check', SAMPLE_SERVER_CLASS_DRAFT_REQ),
      ).rejects.toMatchObject({
        code: 'invalid_paid_model_blocked',
        status: 503,
      });
      expect(paidFetchSpy).not.toHaveBeenCalled();
    });

    it('DEFECT-A4: FreeAiAssistantPanel rendered with SequenceWorkbench props (missing onSaveConditionTemplate) shows false positive preset save banner while conditionTemplates is unchanged', async () => {
      usePilatesStore.setState({ conditionTemplates: [] });
      const initialTemplateCount = usePilatesStore.getState().conditionTemplates.length;
      expect(initialTemplateCount).toBe(0);

      // Render matching SequenceWorkbench.tsx lines 1367-1389 (no onSaveConditionTemplate, no onApplyConditionTemplate, no reusableBlocks)
      render(
        <FreeAiAssistantPanel
          exercises={usePilatesStore.getState().exercises}
          conditionTemplates={usePilatesStore.getState().conditionTemplates}
          activeTargetMinutes={usePilatesStore.getState().activeTargetMinutes}
          activeApparatus={usePilatesStore.getState().activeApparatus}
          activeLevel={usePilatesStore.getState().activeLevel}
          onApplyDraftSequence={(payload) => {
            usePilatesStore.setState({
              activeTitle: payload.title,
              activeSubtitle: payload.subtitle,
              activeTargetMinutes: payload.targetMinutes,
              activeLevel: payload.level,
              activeApparatus: payload.apparatus,
              activeSteps: payload.steps,
            });
          }}
          onSaveUnreviewedMovementIdea={(exercise) => {
            usePilatesStore.getState().addCustomExercise(exercise);
          }}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('조건 기반 추천')).toBeInTheDocument();
      });

      const presetNameInput = screen.getByLabelText('현재 조건을 새 프리셋으로 저장');
      fireEvent.change(presetNameInput, {
        target: { value: '오전 리포머 코어 50분' },
      });

      fireEvent.click(screen.getByRole('button', { name: '프리셋 저장' }));

      // DEFECT-A4 reproduction: UI claims "'오전 리포머 코어 50분' 프리셋을 저장했습니다."
      // even though onSaveConditionTemplate was undefined and store.conditionTemplates is still empty!
      expect(
        screen.getByText("'오전 리포머 코어 50분' 프리셋을 저장했습니다."),
      ).toBeInTheDocument();
      expect(usePilatesStore.getState().conditionTemplates).toHaveLength(0);
    });
  });
});
