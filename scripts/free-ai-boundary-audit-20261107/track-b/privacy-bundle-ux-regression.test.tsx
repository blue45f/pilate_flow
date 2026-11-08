import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createFreeAiRoutes, createFreeAiService } from '../../../backend/freeAiService';
import { FreeAiAssistantPanel } from '../../../src/components/FreeAiAssistantPanel';
import {
  assertNoBrowserKeyExposure,
  createDefaultFreeAiStatus,
  createFreeAiClient,
} from '../../../src/lib/freeAiClient';
import {
  detectByokOrSecretExposure,
  freeAiServerRequestSchema,
  inspectPayloadForSensitiveHealth,
  inspectSensitiveHealthText,
  stripForbiddenKeyFields,
} from '../../../src/schemas/freeAiAssistantSchema';
import type {
  FreeAiQuotaStatus,
  FreeAiServerRequest,
  P1ReusableBlockContract,
} from '../../../src/types/freeAiAssistant';
import type { ConditionTemplate, PilatesExercise } from '../../../src/types/pilates';
import { exerciseRevision } from '../../../src/utils/exerciseReview';
import {
  buildLocalClassDraft,
  buildLocalMovementIdea,
  composeSequenceFromReviewedItems,
} from '../../../src/utils/freeAiAssistantEngine';

const REPO_ROOT = process.cwd();
const DIST_DIR = path.join(REPO_ROOT, 'dist');

/**
 * Runtime-constructed synthetic secret fixtures so static git-tracked scanners
 * never match literal API key tokens in source files.
 */
function buildSyntheticKeys() {
  return {
    googleKey: ['AIza', 'Sy', 'B'.repeat(33)].join(''),
    openRouterKey: ['sk-or', '-v1-', 'b'.repeat(32)].join(''),
    openAiKey: ['sk', '-', 'c'.repeat(24)].join(''),
    githubPat: ['ghp', '_', 'd'.repeat(36)].join(''),
    awsAccessKey: ['AKIA', 'E'.repeat(16)].join(''),
  };
}

function collectFilesRecursively(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function makeReviewedExercise(
  overrides: Partial<PilatesExercise> & { id: string; nameKo: string },
): PilatesExercise {
  const base: PilatesExercise = {
    id: overrides.id,
    nameKo: overrides.nameKo,
    nameEn: overrides.nameEn ?? 'Pilates Movement',
    apparatus: overrides.apparatus ?? 'reformer',
    requiredEquipment: overrides.requiredEquipment ?? [overrides.apparatus ?? 'reformer'],
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['flexion', 'neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 10,
    isUnilateral: overrides.isUnilateral ?? false,
    springs: overrides.springs ?? '1R 1B',
    box: overrides.box ?? 'none',
    footbar: overrides.footbar ?? 'mid',
    headrest: overrides.headrest ?? 'up',
    targetMuscles: overrides.targetMuscles ?? ['복횡근', '골반기저근'],
    breathPattern: overrides.breathPattern ?? '내쉬는 숨에 복부를 납작하게 연결',
    cues: overrides.cues ?? ['갈비뼈를 부드럽게 닫아 코어를 유지하세요.'],
    precautions: overrides.precautions ?? '목과 어깨 과긴장 주의',
    layers: overrides.layers ?? {
      easy: '가동 범위 축소',
      standard: '정석 템포 유지',
      hard: '엔드레인지 3초 유지',
    },
    youtube: overrides.youtube ?? {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Pilates Studio Internal Note',
      videoTitle: overrides.nameKo,
      startSec: 12,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      note: '강사 전용 내부 참고 영상 노트',
      region: 'kr',
    },
    favoriteTag: overrides.favoriteTag ?? 'core-sculpt',
    isCustom: overrides.isCustom ?? true,
    createdAt: overrides.createdAt ?? '2026-11-01T00:00:00.000Z',
    lastUsedAt: overrides.lastUsedAt ?? '2026-11-05T00:00:00.000Z',
    lastTaughtAt: overrides.lastTaughtAt ?? '2026-11-06T00:00:00.000Z',
    taughtCount: overrides.taughtCount ?? 7,
  };

  return {
    ...base,
    review:
      'review' in overrides
        ? overrides.review
        : {
            status: 'approved',
            reviewerAlias: '김수석강사-내부검토자',
            reviewedAt: '2026-11-01T00:00:00.000Z',
            revision: exerciseRevision(base),
            scope: 'planning-metadata',
            credentialVerified: false,
          },
  };
}

const SAMPLE_EXERCISES: PilatesExercise[] = [
  makeReviewedExercise({
    id: 'ex-warmup-1',
    nameKo: '리포머 호흡 워밍업',
    blockCategory: 'warmup',
    defaultDurationMin: 10,
  }),
  makeReviewedExercise({
    id: 'ex-core-1',
    nameKo: '헌드레드 코어 프렙',
    blockCategory: 'core',
    defaultDurationMin: 15,
  }),
  makeReviewedExercise({
    id: 'ex-glute-1',
    nameKo: '펠빅 컬 브릿징',
    blockCategory: 'bridging',
    defaultDurationMin: 15,
  }),
  makeReviewedExercise({
    id: 'ex-cool-1',
    nameKo: '머메이드 쿨다운 스트레치',
    blockCategory: 'cooldown',
    defaultDurationMin: 10,
  }),
  {
    ...makeReviewedExercise({
      id: 'ex-unreviewed-99',
      nameKo: '미검토 실험 동작',
      blockCategory: 'core',
    }),
    review: undefined,
  },
  {
    ...makeReviewedExercise({
      id: 'ex-stale-98',
      nameKo: '개정 불일치 구버전 동작',
      blockCategory: 'core',
    }),
    review: {
      status: 'approved',
      reviewerAlias: '김수석강사-내부검토자',
      reviewedAt: '2026-10-01T00:00:00.000Z',
      revision: 'planning-v3-json-fnv1a128-00000000000000000000000000000000',
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  },
];

const SAMPLE_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'tpl-morning-40',
    name: '오전 코어 집중 40분',
    createdAt: '2026-11-01T00:00:00.000Z',
    criteria: {
      apparatus: 'reformer',
      level: '1.0',
      focusPreset: 'core-sculpt',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 40,
      defaultLayer: 'easy',
    },
  },
];

const SAMPLE_BLOCKS: P1ReusableBlockContract[] = [
  {
    id: 'blk-reviewed-1',
    title: '코어·브릿지 기본 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'bridging',
    durationMin: 15,
    isReviewed: true,
    steps: [
      {
        exerciseId: 'ex-glute-1',
        blockCategory: 'bridging',
        durationMin: 15,
        selectedLayer: 'standard',
      },
    ],
  },
  {
    id: 'blk-unreviewed-2',
    title: '미검토 실험 블록',
    apparatus: 'reformer',
    level: '1.5',
    category: 'core',
    durationMin: 10,
    isReviewed: false,
    steps: [
      {
        exerciseId: 'ex-unreviewed-99',
        blockCategory: 'core',
        durationMin: 10,
        selectedLayer: 'standard',
      },
    ],
  },
];

describe('Track B Audit — 1. Prompt Data Minimization & Privacy Boundary (프롬프트 데이터 최소화)', () => {
  it('1a. toReviewedExerciseCandidates strips non-essential exercise fields and excludes unreviewed/stale exercises before building FreeAiServerRequest', async () => {
    let capturedRequest: FreeAiServerRequest | null = null;
    const readyStatus: FreeAiQuotaStatus = createDefaultFreeAiStatus({
      provider: 'gemini-free',
      model: 'gemini-3.5-flash-lite',
      enabled: true,
      exhausted: false,
      reason: 'ready',
    });

    const client = createFreeAiClient({
      transport: {
        getStatus: async () => readyStatus,
        postAssist: async (req) => {
          capturedRequest = req;
          return {
            status: readyStatus,
            result: buildLocalClassDraft(
              {
                durationMinutes: 50,
                theme: '코어 정렬 플로우',
                strengthenAreas: ['core'],
                level: '1.5',
                apparatus: 'reformer',
              },
              SAMPLE_EXERCISES,
            ),
          };
        },
      },
    });

    await client.requestClassDraft(
      {
        durationMinutes: 50,
        theme: '코어 정렬 플로우',
        strengthenAreas: ['core'],
        level: '1.5',
        apparatus: 'reformer',
      },
      SAMPLE_EXERCISES,
      SAMPLE_TEMPLATES,
    );

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.task).toBe('class-draft');
    if (!capturedRequest || capturedRequest.task !== 'class-draft') {
      throw new Error('Expected class-draft server request');
    }

    // Unreviewed (ex-unreviewed-99) and stale (ex-stale-98) exercises must be excluded
    const catalogIds = capturedRequest.reviewedCatalog.map((c) => c.id);
    expect(catalogIds).toEqual(['ex-warmup-1', 'ex-core-1', 'ex-glute-1', 'ex-cool-1']);
    expect(catalogIds).not.toContain('ex-unreviewed-99');
    expect(catalogIds).not.toContain('ex-stale-98');

    // Each candidate must contain ONLY the 10 whitelisted schema keys
    const expectedKeys = [
      'apparatus',
      'blockCategory',
      'bodyPosition',
      'defaultDurationMin',
      'id',
      'isReviewed',
      'level',
      'nameEn',
      'nameKo',
      'spinalPlanes',
    ];
    for (const candidate of capturedRequest.reviewedCatalog) {
      expect(Object.keys(candidate).sort()).toEqual(expectedKeys);
      expect('youtube' in candidate).toBe(false);
      expect('cues' in candidate).toBe(false);
      expect('precautions' in candidate).toBe(false);
      expect('layers' in candidate).toBe(false);
      expect('review' in candidate).toBe(false);
      expect('createdAt' in candidate).toBe(false);
      expect('lastUsedAt' in candidate).toBe(false);
      expect('lastTaughtAt' in candidate).toBe(false);
      expect('springs' in candidate).toBe(false);
      expect('breathPattern' in candidate).toBe(false);
    }

    // Verify reviewerAlias and YouTube URLs never appear anywhere in serialized request
    const serialized = JSON.stringify(capturedRequest);
    expect(serialized).not.toContain('김수석강사-내부검토자');
    expect(serialized).not.toContain('dQw4w9WgXcQ');
    expect(serialized).not.toContain('강사 전용 내부 참고 영상 노트');
  });

  it('1b. freeAiServerRequestSchema (.strict()) and backend service reject extra non-whitelisted fields', async () => {
    const { googleKey } = buildSyntheticKeys();
    const validBase = {
      task: 'class-draft' as const,
      conditions: {
        durationMinutes: 50,
        theme: '코어 안정화 플로우',
        strengthenAreas: ['core' as const],
        level: '1.5' as const,
        apparatus: 'reformer' as const,
      },
      reviewedCatalog: [
        {
          id: 'ex-1',
          nameKo: '헌드레드',
          nameEn: 'Hundred',
          apparatus: 'reformer' as const,
          blockCategory: 'core' as const,
          level: '1.5' as const,
          defaultDurationMin: 5,
          isReviewed: true as const,
        },
      ],
    };

    expect(freeAiServerRequestSchema.safeParse(validBase).success).toBe(true);

    const forbiddenExtraPayloads: Array<Record<string, unknown>> = [
      { ...validBase, historyLogs: [{ id: 'log-1', notes: '수업 기록' }] },
      { ...validBase, classGroups: [{ id: 'grp-1', name: '오전반' }] },
      { ...validBase, memberHealthNotes: '좌골신경통 주의' },
      { ...validBase, medicalHistory: '요추 수술 이력' },
      { ...validBase, patientNotes: '도수치료 병행' },
      { ...validBase, diagnosis: '추간판 탈출증' },
      { ...validBase, instructorReflection: '회원 피로도 높음' },
      { ...validBase, groupNotes: '개인 레슨 메모' },
      { ...validBase, apiKey: googleKey },
      {
        ...validBase,
        conditions: {
          ...validBase.conditions,
          memberHealthNotes: '슬개건염',
        },
      },
      {
        ...validBase,
        reviewedCatalog: [
          {
            ...validBase.reviewedCatalog[0],
            youtube: { url: 'https://youtube.com/watch?v=123' },
          },
        ],
      },
    ];

    const service = createFreeAiService({
      env: {
        FREE_AI_PROVIDER: 'gemini-free',
        GEMINI_API_KEY: googleKey,
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
        GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
      },
      fetchFn: vi.fn(),
    });

    for (const extraPayload of forbiddenExtraPayloads) {
      const parsed = freeAiServerRequestSchema.safeParse(extraPayload);
      expect(parsed.success).toBe(false);
      await expect(service.assist('instructor-1', extraPayload)).rejects.toThrow();
    }
  });

  it('1c. inspectSensitiveHealthText and inspectPayloadForSensitiveHealth block all 6 known PHI/PII categories while allowing preferLocalOnly sanitized execution', async () => {
    const categorySamples: Array<{ category: string; sample: string }> = [
      {
        category: '척추·관절 질환/진단명',
        sample: '요추 4-5번 디스크 추간판 탈출 및 척추관 협착증, 회전근개 파열, 골다공증',
      },
      {
        category: '수술·시술·치료 이력',
        sample: '무릎 인공관절 수술 후 입원·신경차단술 주사치료 재활 환자 의사 소견',
      },
      {
        category: '임신·산전·산후 건강상태',
        sample: '임신 16주 임산부 산모 및 제왕절개 출산 직후 복직근 이개 진단',
      },
      {
        category: '급성 통증·신경학적 증상',
        sample: '하지 방사통과 신경통, 저림 증상 및 급성 통증 호소',
      },
      {
        category: '내과·만성 질환 및 복약 정보',
        sample: '고혈압·당뇨·갑상선 질환 약물 복용 약 주의',
      },
      {
        category: '개인 식별 정보(연락처·이메일·주민번호)',
        sample: '연락처 010-1234-5678 주민번호 900101-2345678 이메일 user@pilates.kr 회원 실명',
      },
    ];

    for (const { category, sample } of categorySamples) {
      const check = inspectSensitiveHealthText(sample);
      expect(check.hasSensitiveData).toBe(true);
      expect(check.matchedCategories).toContain(category);
      expect(check.sanitizedText).toContain('[민감정보 제외]');
      expect(check.warningMessageKo).toContain('무료 외부 AI로 전송할 수 없습니다');
    }

    // Explicit forbidden field key detection in inspectPayloadForSensitiveHealth
    for (const fieldName of [
      'memberHealthNotes',
      'medicalHistory',
      'patientNotes',
      'diagnosis',
      'instructorReflection',
      'groupNotes',
    ]) {
      const check = inspectPayloadForSensitiveHealth({ [fieldName]: '일반 컨디션 메모' });
      expect(check.hasSensitiveData).toBe(true);
      expect(check.matchedCategories).toContain('수술·시술·치료 이력');
    }

    const postAssistSpy = vi.fn();
    const client = createFreeAiClient({
      transport: {
        getStatus: async () =>
          createDefaultFreeAiStatus({
            provider: 'gemini-free',
            enabled: true,
            exhausted: false,
            reason: 'ready',
          }),
        postAssist: postAssistSpy,
      },
    });

    // External AI call (preferLocalOnly: false) must throw sensitive_health_blocked and never call transport
    await expect(
      client.requestClassDraft(
        {
          durationMinutes: 50,
          theme: '허리 디스크 수술 환자 재활 플로우 010-1234-5678',
          strengthenAreas: ['core'],
          level: '1.0',
          apparatus: 'reformer',
        },
        SAMPLE_EXERCISES,
        SAMPLE_TEMPLATES,
        { preferLocalOnly: false },
      ),
    ).rejects.toMatchObject({
      code: 'sensitive_health_blocked',
    });
    expect(postAssistSpy).not.toHaveBeenCalled();

    // Local-only execution (preferLocalOnly: true) succeeds and sanitizes PHI/PII out of the output
    const localDraft = await client.requestClassDraft(
      {
        durationMinutes: 50,
        theme: '허리 디스크 수술 환자 코어 안정화 010-1234-5678',
        strengthenAreas: ['core'],
        level: '1.0',
        apparatus: 'reformer',
      },
      SAMPLE_EXERCISES,
      SAMPLE_TEMPLATES,
      { preferLocalOnly: true },
    );
    expect(localDraft.usedLocalFallback).toBe(true);
    expect(localDraft.result.source).toBe('local-rule-engine');
    expect(localDraft.result.title).not.toContain('디스크');
    expect(localDraft.result.title).not.toContain('수술');
    expect(localDraft.result.title).not.toContain('010-1234-5678');
    expect(postAssistSpy).not.toHaveBeenCalled();

    const localIdea = buildLocalMovementIdea({
      rawIdeaText: '임신 20주 산모 골반 분절 브릿지 010-9999-8888',
      apparatus: 'reformer',
      blockCategory: 'bridging',
      strengthenArea: 'glute-lower',
      level: '1.0',
    });
    expect(localIdea.nameKo).not.toContain('임신 20주');
    expect(localIdea.nameKo).not.toContain('산모');
    expect(localIdea.nameKo).not.toContain('010-9999-8888');
    expect(localIdea.precautions).toContain('무료 외부 AI로 전송할 수 없습니다');
  });
});

describe('Track B Audit — 2. Client Bundle Zero-Secret & Server-Boundary Verification (클라이언트 bundle에 비밀 미포함)', () => {
  it('2a. dist/ build artifacts and git-tracked files contain zero API key literals or private keys', () => {
    expect(existsSync(DIST_DIR)).toBe(true);
    const distFiles = collectFilesRecursively(DIST_DIR).filter((file) =>
      /\.(html|js|css|json|webmanifest|txt)$/i.test(file),
    );
    expect(distFiles.length).toBeGreaterThan(0);

    const hasIndexHtml = distFiles.some((f) => f.endsWith('index.html'));
    const hasSwJs = distFiles.some((f) => f.endsWith('sw.js'));
    const jsAssets = distFiles.filter(
      (f) => f.includes(`${path.sep}assets${path.sep}`) && f.endsWith('.js'),
    );
    expect(hasIndexHtml).toBe(true);
    expect(hasSwJs).toBe(true);
    expect(jsAssets.length).toBeGreaterThan(0);

    const secretPatterns = [
      { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
      { name: 'OpenRouter API Key', regex: /\bsk-or-v1-[0-9a-fA-F]{16,}\b/ },
      { name: 'OpenAI-style Secret Key', regex: /\bsk-[0-9A-Za-z_-]{20,}\b/ },
      { name: 'GitHub Token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{20,}\b/ },
      { name: 'GitHub Fine-Grained PAT', regex: /\bgithub_pat_[0-9A-Za-z_]{20,}\b/ },
      { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
      { name: 'PEM Private Key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    ];

    const distFindings: string[] = [];
    for (const file of distFiles) {
      if (statSync(file).size > 25 * 1024 * 1024) continue;
      const content = readFileSync(file, 'utf8');
      for (const { name, regex } of secretPatterns) {
        if (regex.test(content)) {
          distFindings.push(`${path.relative(REPO_ROOT, file)}: matched ${name}`);
        }
      }
    }
    expect(distFindings).toEqual([]);

    const trackedFiles = execFileSync('git', ['ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter((file) => file.length > 0 && !/\.(png|jpg|jpeg|webp|gif|tar\.gz|ico)$/i.test(file));

    const trackedFindings: string[] = [];
    for (const relFile of trackedFiles) {
      const fullPath = path.join(REPO_ROOT, relFile);
      if (!existsSync(fullPath)) continue;
      const content = readFileSync(fullPath, 'utf8');
      for (const { name, regex } of secretPatterns) {
        if (regex.test(content)) {
          trackedFindings.push(`${relFile}: matched ${name}`);
        }
      }
    }
    expect(trackedFindings).toEqual([]);
  });

  it('2b. dist/assets/*.js and src/** are strictly isolated from backend/freeAiService.ts upstream provider endpoints and server-only env guards', () => {
    const jsAssets = collectFilesRecursively(path.join(DIST_DIR, 'assets')).filter((f) =>
      f.endsWith('.js'),
    );
    expect(jsAssets.length).toBeGreaterThan(0);

    const forbiddenServerOnlyTokens = [
      'https://generativelanguage.googleapis.com',
      'https://openrouter.ai/api/v1/chat/completions',
      'GEMINI_FREE_TIER_UNPAID_CONFIRMED',
      'x-goog-api-key',
    ];

    const leakedServerTokens: string[] = [];

    for (const jsFile of jsAssets) {
      const content = readFileSync(jsFile, 'utf8');
      for (const token of forbiddenServerOnlyTokens) {
        if (content.includes(token)) {
          leakedServerTokens.push(`${path.relative(REPO_ROOT, jsFile)}: leaked ${token}`);
        }
      }
    }

    expect(leakedServerTokens).toEqual([]);

    // Also verify zero files in src/** import backend/** or reference upstream provider endpoints
    const srcFiles = collectFilesRecursively(path.join(REPO_ROOT, 'src')).filter(
      (f) => /\.(ts|tsx)$/i.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    );
    const srcBoundaryViolations: string[] = [];
    for (const srcFile of srcFiles) {
      const content = readFileSync(srcFile, 'utf8');
      if (/from\s+['"][^'"]*backend\//.test(content)) {
        srcBoundaryViolations.push(`${path.relative(REPO_ROOT, srcFile)}: imports backend/*`);
      }
      for (const token of forbiddenServerOnlyTokens) {
        if (content.includes(token)) {
          srcBoundaryViolations.push(`${path.relative(REPO_ROOT, srcFile)}: contains ${token}`);
        }
      }
    }
    expect(srcBoundaryViolations).toEqual([]);
  });

  it('2c. assertNoBrowserKeyExposure and detectByokOrSecretExposure block VITE_*, OPENAI_API_KEY, and synthetic secret values', () => {
    const { googleKey, openRouterKey, openAiKey } = buildSyntheticKeys();

    expect(assertNoBrowserKeyExposure({ MODE: 'production', BASE_URL: './' }).safe).toBe(true);

    const exposedEnvKeys = [
      'VITE_GEMINI_API_KEY',
      'VITE_OPENROUTER_API_KEY',
      'VITE_AI_SECRET',
      'PUBLIC_GEMINI_KEY',
      'NEXT_PUBLIC_OPENROUTER_TOKEN',
      'REACT_APP_API_KEY',
      'GEMINI_API_KEY',
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'API_KEY',
      'BEARER_TOKEN',
      'CLIENT_SECRET',
    ];

    for (const envKey of exposedEnvKeys) {
      const check = assertNoBrowserKeyExposure({ [envKey]: 'configured-value' });
      expect(check.safe).toBe(false);
      expect(check.violations.some((v) => v.includes(envKey))).toBe(true);
    }

    const valueCheck = detectByokOrSecretExposure({
      nested: {
        g: googleKey,
        o: openRouterKey,
        s: openAiKey,
      },
    });
    expect(valueCheck.safe).toBe(false);
    expect(valueCheck.violations.length).toBe(3);
  });

  it('2d. FreeAiAssistantPanel renders zero password inputs or BYOK API-key fields across all 3 tabs', async () => {
    const { container } = render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('조건 기반 추천')).toBeInTheDocument();
    });

    const tabs = [
      '1. 수업 초안 만들기',
      '2. 새 동작 아이디어·변형',
      '3. 검토 동작·블록 시퀀스 구성',
    ];

    for (const tabName of tabs) {
      fireEvent.click(screen.getByRole('tab', { name: tabName }));
      expect(container.querySelector('input[type="password"]')).toBeNull();

      const allControls = Array.from(container.querySelectorAll('input, textarea, select'));
      for (const el of allControls) {
        const metadata = [
          el.getAttribute('id') ?? '',
          el.getAttribute('name') ?? '',
          el.getAttribute('placeholder') ?? '',
          el.getAttribute('aria-label') ?? '',
        ].join(' ');
        expect(metadata).not.toMatch(/api[-_ ]?key|byok|secret|token|sk-|AIza|bearer/i);
      }
    }
  });
});

describe('Track B Audit — 3. Provider Error UX Regression (provider 오류 UX 회귀 검사)', () => {
  it('3a. free_quota_exhausted (429) across all 3 tabs renders alert banner, readable renewal timing, hides unavailable external AI button, and keeps local engine button functional', async () => {
    const renewalInfo = {
      resetAt: '2026-11-07T08:00:00.000Z',
      resetWindow: 'daily' as const,
      resetTimezone: 'America/Los_Angeles' as const,
      remainingSeconds: 7200,
      formattedResetKo:
        '미국 태평양 시간 자정(00:00 PT) 기준 일일 무료 한도 갱신 · 약 2시간 0분 후',
      policyNoteKo: '유료 모델 자동 전환 차단',
    };

    const readyStatus: FreeAiQuotaStatus = createDefaultFreeAiStatus({
      provider: 'gemini-free',
      model: 'gemini-3.5-flash-lite',
      enabled: true,
      exhausted: false,
      reason: 'ready',
    });

    const exhaustedStatus: FreeAiQuotaStatus = {
      ...readyStatus,
      exhausted: true,
      reason: 'free_quota_exhausted',
      minuteRemaining: 0,
      dailyRemaining: 0,
      renewal: renewalInfo,
      statusMessageKo: '무료 사용량 소진: 일일 한도에 도달했습니다.',
    };

    const postAssistMock = vi.fn().mockRejectedValue({
      status: 429,
      code: 'free_quota_exhausted',
      message: '무료 사용량 소진: 현재 무료 AI 호출 한도에 도달하여 외부 AI 호출이 차단되었습니다.',
      quotaStatus: exhaustedStatus,
      renewal: renewalInfo,
    });

    const client = createFreeAiClient({
      now: () => Date.parse('2026-11-07T06:00:00.000Z'),
      transport: {
        getStatus: async () => readyStatus,
        postAssist: postAssistMock,
      },
    });

    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={client}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).not.toBeDisabled();
    });

    // Trigger 429 on Tab 1
    fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: '무료 사용량 소진 안내' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('free-ai-renewal-info')).toHaveTextContent(
      renewalInfo.formattedResetKo,
    );
    expect(client.getQuotaStatus().renewal?.resetAt).toBe('2026-11-07T08:00:00.000Z');
    expect(client.getQuotaStatus().renewal?.resetTimezone).toBe('America/Los_Angeles');
    expect(
      screen.queryByRole('button', { name: '무료 사용량 소진 (호출 차단됨)' }),
    ).not.toBeInTheDocument();

    // Local button on Tab 1 still works
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
    });

    // Switch to Tab 2 (movement-idea): unavailable external action is absent, local button works
    fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
    expect(
      screen.queryByRole('button', { name: '무료 사용량 소진 (호출 차단됨)' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('새 동작 아이디어 설명'), {
      target: { value: '풋바 아치 지지 골반 분절 브릿지 변형' },
    });
    fireEvent.click(screen.getByRole('button', { name: '아이디어 정리하기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('동작 이름 (국문) 편집')).toBeInTheDocument();
    });

    // Switch to Tab 3 (sequence-compose): unavailable external action is absent, local button works
    fireEvent.click(screen.getByRole('tab', { name: '3. 검토 동작·블록 시퀀스 구성' }));
    expect(
      screen.queryByRole('button', { name: '무료 사용량 소진 (호출 차단됨)' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 구성하기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('시퀀스 제목 편집')).toBeInTheDocument();
    });
    expect(postAssistMock).toHaveBeenCalledTimes(1);
  });

  it('3b. sensitive_health_blocked (400) across all 3 tabs renders immediate warning banner, disables external AI button, and allows local sanitized execution', async () => {
    const postAssistSpy = vi.fn();
    const client = createFreeAiClient({
      transport: {
        getStatus: async () =>
          createDefaultFreeAiStatus({
            provider: 'gemini-free',
            model: 'gemini-3.5-flash-lite',
            enabled: true,
            exhausted: false,
            reason: 'ready',
          }),
        postAssist: postAssistSpy,
      },
    });

    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={client}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).not.toBeDisabled();
    });

    // Tab 1: enter sensitive theme
    fireEvent.change(screen.getByLabelText('수업 주제'), {
      target: { value: '요추 디스크 수술 환자 재활 플로우' },
    });
    expect(screen.getByText(/무료 외부 AI로 전송할 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
    });
    expect((screen.getByLabelText('초안 제목 편집') as HTMLInputElement).value).not.toContain(
      '디스크',
    );

    // Tab 2: enter sensitive idea
    fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
    fireEvent.change(screen.getByLabelText('새 동작 아이디어 설명'), {
      target: { value: '임신 14주 산모 골반 교정 010-1234-5678' },
    });
    expect(screen.getByText(/무료 외부 AI로 전송할 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료 AI로 아이디어·변형 정리' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '아이디어 정리하기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('동작 이름 (국문) 편집')).toBeInTheDocument();
    });

    // Tab 3: enter sensitive compose theme
    fireEvent.click(screen.getByRole('tab', { name: '3. 검토 동작·블록 시퀀스 구성' }));
    fireEvent.change(screen.getByLabelText('시퀀스 주제'), {
      target: { value: '척추관 협착증 환자 재활 시퀀스' },
    });
    expect(screen.getByRole('button', { name: '무료 AI로 시퀀스 구성' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 구성하기' }));
    await waitFor(() => {
      expect(screen.getByLabelText('시퀀스 제목 편집')).toBeInTheDocument();
    });
    expect(postAssistSpy).not.toHaveBeenCalled();
  });

  it('3c. handles byok_forbidden (400), concurrency_limit_exceeded (429), upstream_error (502), and invalid_ai_response (502) without crashing and preserves local fallback', async () => {
    const { googleKey } = buildSyntheticKeys();

    // 1) byok_forbidden via server route & client
    const service = createFreeAiService({
      env: {
        FREE_AI_PROVIDER: 'gemini-free',
        GEMINI_API_KEY: googleKey,
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
        GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
      },
      fetchFn: vi.fn(),
    });
    const routes = createFreeAiRoutes(service);
    const byokRouteRes = await routes['POST /api/studio/ai/assist']({
      query: { apiKey: googleKey },
      body: {},
    });
    expect(byokRouteRes.statusCode).toBe(400);
    expect(JSON.parse(byokRouteRes.body).code).toBe('byok_forbidden');

    // 2) concurrency_limit_exceeded (429)
    let resolveInFlight: (() => void) | null = null;
    const slowFetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveInFlight = () =>
            resolve(new Response(JSON.stringify({ error: 'upstream fail' }), { status: 500 }));
        }),
    );
    const concurrentService = createFreeAiService({
      env: {
        FREE_AI_PROVIDER: 'gemini-free',
        GEMINI_API_KEY: googleKey,
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
        GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
      },
      fetchFn: slowFetch,
      maxConcurrentPerUser: 1,
    });
    const validIdeaReq: FreeAiServerRequest = {
      task: 'movement-idea',
      idea: {
        rawIdeaText: '리포머 코어 분절 브릿지 변형',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'glute-lower',
        level: '1.5',
      },
    };
    const firstCall = concurrentService.assist('user-1', validIdeaReq);
    await expect(concurrentService.assist('user-1', validIdeaReq)).rejects.toMatchObject({
      code: 'concurrency_limit_exceeded',
      status: 429,
    });
    resolveInFlight?.();
    await expect(firstCall).rejects.toMatchObject({
      code: 'upstream_error',
      status: 502,
    });

    // 3) invalid_ai_response (502) when upstream returns malformed JSON or schema-invalid object
    const malformedService = createFreeAiService({
      env: {
        FREE_AI_PROVIDER: 'gemini-free',
        GEMINI_API_KEY: googleKey,
        GEMINI_FREE_TIER_UNPAID_CONFIRMED: 'true',
        GEMINI_FREE_MODEL: 'gemini-3.5-flash-lite',
      },
      fetchFn: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{"invalid":"schema"}' }] } }],
          }),
          { status: 200 },
        ),
      ),
    });
    await expect(malformedService.assist('user-1', validIdeaReq)).rejects.toMatchObject({
      code: 'invalid_ai_response',
      status: 502,
    });
  });
});

describe('Track B Audit — 4. Exact Reproduction of Discovered Track B Defects (DEFECT-B1, DEFECT-B2, DEFECT-B3)', () => {
  it('DEFECT-B1: FreeAiAssistantPanel and freeAiClient.requestSequenceCompose fail to inspect reviewedBlocks / reviewedCatalog for PHI/PII or BYOK secrets and transmit unselected reviewedBlocks with sensitive instructorNote to transport.postAssist', async () => {
    const { openAiKey } = buildSyntheticKeys();
    const postAssistSpy = vi.fn().mockImplementation(async (req: FreeAiServerRequest) => ({
      status: createDefaultFreeAiStatus({
        provider: 'gemini-free',
        model: 'gemini-3.5-flash-lite',
        enabled: true,
        exhausted: false,
        reason: 'ready',
      }),
      result: composeSequenceFromReviewedItems(
        req.task === 'sequence-compose'
          ? req.compose
          : {
              targetMinutes: 50,
              level: '1.5',
              apparatus: 'reformer',
              strengthenAreas: ['core'],
              selectedExerciseIds: ['ex-warmup-1'],
            },
        SAMPLE_EXERCISES,
        SAMPLE_BLOCKS,
      ),
    }));

    const client = createFreeAiClient({
      transport: {
        getStatus: async () =>
          createDefaultFreeAiStatus({
            provider: 'gemini-free',
            model: 'gemini-3.5-flash-lite',
            enabled: true,
            exhausted: false,
            reason: 'ready',
          }),
        postAssist: postAssistSpy,
      },
    });

    // An UNSELECTED reviewed block containing sensitive PHI/PII and a synthetic API key in instructorNote
    const blocksWithUnselectedSensitiveNote: P1ReusableBlockContract[] = [
      ...SAMPLE_BLOCKS,
      {
        id: 'blk-unselected-sensitive-99',
        title: '오전 그룹 블록',
        apparatus: 'reformer',
        level: '1.5',
        category: 'core',
        durationMin: 10,
        isReviewed: true,
        steps: [
          {
            exerciseId: 'ex-core-1',
            blockCategory: 'core',
            durationMin: 10,
            selectedLayer: 'standard',
            instructorNote: `김철수 회원 허리 디스크 수술 후 주의 010-1234-5678 ${openAiKey}`,
          },
        ],
      },
    ];

    // Only select 'blk-reviewed-1' (NOT 'blk-unselected-sensitive-99')
    await client.requestSequenceCompose(
      {
        targetMinutes: 50,
        level: '1.5',
        apparatus: 'reformer',
        theme: '코어·브릿지 안정화 시퀀스',
        strengthenAreas: ['core'],
        selectedExerciseIds: ['ex-warmup-1'],
        selectedBlockIds: ['blk-reviewed-1'],
      },
      SAMPLE_EXERCISES,
      blocksWithUnselectedSensitiveNote,
      { preferLocalOnly: false },
    );

    // REPRODUCED DEFECT-B1:
    // 1. Client-side guardByokAndEnv(input) and guardSensitiveHealthForExternalAi(input) did NOT block the request!
    expect(postAssistSpy).toHaveBeenCalledTimes(1);
    const outgoingServerRequest = postAssistSpy.mock.calls[0][0] as FreeAiServerRequest;
    expect(outgoingServerRequest.task).toBe('sequence-compose');
    if (outgoingServerRequest.task !== 'sequence-compose') {
      throw new Error('Expected sequence-compose request');
    }

    // 2. Unselected block 'blk-unselected-sensitive-99' was still included in outgoingServerRequest.reviewedBlocks!
    const transmittedBlockIds = (outgoingServerRequest.reviewedBlocks ?? []).map((b) => b.id);
    expect(transmittedBlockIds).toContain('blk-unselected-sensitive-99');

    // 3. The sensitive PHI/PII and synthetic secret in step.instructorNote were transmitted in the payload!
    const serializedRequest = JSON.stringify(outgoingServerRequest);
    expect(serializedRequest).toContain('허리 디스크 수술 후 주의 010-1234-5678');
    expect(serializedRequest).toContain(openAiKey);

    // 4. Server-side schema validation (freeAiServerRequestSchema) rejects this exact outgoing payload!
    const serverValidation = freeAiServerRequestSchema.safeParse(outgoingServerRequest);
    expect(serverValidation.success).toBe(false);

    // 5. Reproduce in FreeAiAssistantPanel UI (Tab 3: sequence-compose):
    // composeHealthInspection only inspects composeTheme, so the primary external AI button remains enabled
    // and clicking it sends the sensitive unselected block through transport.postAssist!
    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={blocksWithUnselectedSensitiveNote}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={client}
        initialTab="sequence-compose"
      />,
    );

    const composeAiBtn = await screen.findByRole('button', { name: '무료 AI로 시퀀스 구성' });
    expect(composeAiBtn).not.toBeDisabled();

    // Deselect the sensitive block if it was auto-selected, leaving only 'blk-reviewed-1'
    const sensitiveChip = screen.getByRole('button', { name: /\[블록\] 오전 그룹 블록/ });
    if (sensitiveChip.getAttribute('aria-pressed') === 'true') {
      fireEvent.click(sensitiveChip);
    }

    fireEvent.click(composeAiBtn);
    await waitFor(() => {
      expect(postAssistSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('DEFECT-B2: stripForbiddenKeyFields fails to strip forbidden keys inside arrays, and inspectSensitiveHealthText misses realistic Korean member names, postpartum weeks, and general pain terms', () => {
    const { googleKey, openRouterKey } = buildSyntheticKeys();

    // Part A: stripForbiddenKeyFields skips array elements (!Array.isArray(value))
    const recordWithArraySecrets = {
      task: 'sequence-compose',
      apiKey: googleKey,
      steps: [
        {
          exerciseId: 'ex-core-1',
          apiKey: googleKey,
          VITE_OPENROUTER_API_KEY: openRouterKey,
        },
      ],
    };

    const stripped = stripForbiddenKeyFields(recordWithArraySecrets);
    // Top-level apiKey is stripped, but array element secrets remain intact!
    expect('apiKey' in stripped).toBe(false);
    expect(stripped.steps[0]).toHaveProperty('apiKey', googleKey);
    expect(stripped.steps[0]).toHaveProperty('VITE_OPENROUTER_API_KEY', openRouterKey);
    expect(detectByokOrSecretExposure(stripped).safe).toBe(false);

    // Part B: inspectSensitiveHealthText misses realistic member names, postpartum weeks, and general pain terms
    const realisticPostpartumAndName = '김민지 회원(34세) 출산 8주차 복직근 이개 및 허리 통증 완화';
    const realisticJointPainAndName = '박서연님 무릎 통증·어깨 충돌증후군 주의';

    const inspection1 = inspectSensitiveHealthText(realisticPostpartumAndName);
    const inspection2 = inspectSensitiveHealthText(realisticJointPainAndName);

    // REPRODUCED DEFECT-B2: both return hasSensitiveData: false and leave text unredacted
    expect(inspection1.hasSensitiveData).toBe(false);
    expect(inspection1.sanitizedText).toBe(realisticPostpartumAndName);
    expect(inspection2.hasSensitiveData).toBe(false);
    expect(inspection2.sanitizedText).toBe(realisticJointPainAndName);
  });

  it('DEFECT-B3: Provider Error UX Regression — contradictory Ready banner on 502 error, stale actionFeedback across tab switches, and non-fallback on invalid_paid_model_blocked', async () => {
    const readyStatus: FreeAiQuotaStatus = createDefaultFreeAiStatus({
      provider: 'gemini-free',
      model: 'gemini-3.5-flash-lite',
      enabled: true,
      exhausted: false,
      reason: 'ready',
    });

    const failingPostAssist = vi.fn().mockRejectedValue({
      status: 502,
      code: 'upstream_error',
      message:
        '외부 무료 AI 서비스가 오류 상태(502)를 반환했습니다. 유료 폴백 없이 중단되었으며 로컬 추천 엔진을 계속 사용할 수 있습니다.',
      quotaStatus: readyStatus,
    });

    const client = createFreeAiClient({
      transport: {
        getStatus: async () => readyStatus,
        postAssist: failingPostAssist,
      },
    });

    render(
      <FreeAiAssistantPanel
        exercises={SAMPLE_EXERCISES}
        reusableBlocks={SAMPLE_BLOCKS}
        conditionTemplates={SAMPLE_TEMPLATES}
        client={client}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).not.toBeDisabled();
    });

    // 1. Trigger 502 upstream_error on Tab 1
    fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));

    await waitFor(() => {
      expect(
        screen.getByText(/외부 무료 AI 서비스가 오류 상태\(502\)를 반환했습니다/),
      ).toBeInTheDocument();
    });

    // The simplified header exposes the failure without claiming a working connection.
    expect(screen.getByText('AI 응답 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText(/무료 AI 연결됨|무료 전용 AI 사용 가능/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled();

    // 2. Generate local draft on Tab 1 (sets actionFeedback), then switch to Tab 2
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
    await waitFor(() => {
      expect(
        screen.getByText('수업 초안을 만들었습니다. 수업에 맞게 편집해 주세요.'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
    // REPRODUCED DEFECT-B3 (Part 2): Tab click clears errorBanner but does NOT clear actionFeedback,
    // so Tab 1's "수업 초안을 만들었습니다" feedback remains visible on Tab 2!
    expect(
      screen.getByText('수업 초안을 만들었습니다. 수업에 맞게 편집해 주세요.'),
    ).toBeInTheDocument();

    // 3. REPRODUCED DEFECT-B3 (Part 3): When server returns reason: 'invalid_paid_model_blocked' (enabled: false),
    // freeAiClient throws request_failed instead of falling back to the local rule engine
    const paidBlockedStatus: FreeAiQuotaStatus = createDefaultFreeAiStatus({
      provider: 'gemini-free',
      model: null,
      enabled: false,
      exhausted: false,
      reason: 'invalid_paid_model_blocked',
      statusMessageKo:
        'Google Gemini 무료 등급 허용 목록에 없는 유료 모델이 감지되어 외부 AI 호출이 차단되었습니다.',
    });

    const paidBlockedClient = createFreeAiClient({
      transport: {
        getStatus: async () => paidBlockedStatus,
        postAssist: vi.fn().mockRejectedValue({
          status: 503,
          code: 'invalid_paid_model_blocked',
          message: paidBlockedStatus.statusMessageKo,
          quotaStatus: paidBlockedStatus,
        }),
      },
    });

    await expect(
      paidBlockedClient.requestClassDraft(
        {
          durationMinutes: 50,
          theme: '코어 안정화 플로우',
          strengthenAreas: ['core'],
          level: '1.5',
          apparatus: 'reformer',
        },
        SAMPLE_EXERCISES,
        SAMPLE_TEMPLATES,
      ),
    ).rejects.toMatchObject({
      code: 'request_failed',
    });
  });
});
