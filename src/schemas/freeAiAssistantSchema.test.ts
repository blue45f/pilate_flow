import { describe, expect, it } from 'vitest';
import {
  detectByokOrSecretExposure,
  freeAiServerRequestSchema,
  inspectPayloadForSensitiveHealth,
  inspectSensitiveHealthText,
  isGuaranteedFreeGeminiModel,
  isGuaranteedFreeOpenRouterModel,
  stripForbiddenKeyFields,
} from './freeAiAssistantSchema';

describe('freeAiAssistantSchema and policy guards', () => {
  it('allows only verified Google Gemini Free Tier text models and blocks paid models', () => {
    expect(isGuaranteedFreeGeminiModel('gemini-3.5-flash-lite')).toBe(true);
    expect(isGuaranteedFreeGeminiModel('gemini-3.1-flash-lite')).toBe(true);
    expect(isGuaranteedFreeGeminiModel('gemini-2.5-flash-lite')).toBe(true);
    expect(isGuaranteedFreeGeminiModel('gemini-2.5-flash')).toBe(true);

    // Paid-only or billing-required models must be rejected
    expect(isGuaranteedFreeGeminiModel('gemini-4-argon')).toBe(false);
    expect(isGuaranteedFreeGeminiModel('gemini-3.1-pro-preview')).toBe(false);
    expect(isGuaranteedFreeGeminiModel('gemini-3.8-pro')).toBe(false);
    expect(isGuaranteedFreeGeminiModel('imagen-3.0-generate-002')).toBe(false);
  });

  it('allows only OpenRouter :free model variants or openrouter/free and blocks paid models', () => {
    expect(isGuaranteedFreeOpenRouterModel('openrouter/free')).toBe(true);
    expect(isGuaranteedFreeOpenRouterModel('google/gemma-4-31b-it:free')).toBe(true);
    expect(isGuaranteedFreeOpenRouterModel('meta-llama/llama-3.3-70b-instruct:free')).toBe(true);

    // Paid variants without :free must be rejected
    expect(isGuaranteedFreeOpenRouterModel('google/gemma-4-31b-it')).toBe(false);
    expect(isGuaranteedFreeOpenRouterModel('anthropic/claude-3.7-sonnet')).toBe(false);
    expect(isGuaranteedFreeOpenRouterModel('openai/gpt-4o')).toBe(false);
    expect(isGuaranteedFreeOpenRouterModel('')).toBe(false);
  });

  it('detects and strips user BYOK fields and browser key exposure', () => {
    const withByok = {
      task: 'class-draft',
      apiKey: 'AIzaSyFakeKeyForTesting1234567890',
      nested: {
        openRouterApiKey: 'sk-or-v1-1234567890abcdef1234567890abcdef',
        VITE_GEMINI_API_KEY: 'secret',
        keepMe: 'valid',
      },
    };

    const check = detectByokOrSecretExposure(withByok);
    expect(check.safe).toBe(false);
    expect(check.violations.length).toBeGreaterThanOrEqual(3);

    const stripped = stripForbiddenKeyFields(withByok);
    expect('apiKey' in stripped).toBe(false);
    expect(stripped.nested).toEqual({ keepMe: 'valid' });
  });

  it('blocks sensitive health and personal information (PHI/PII) from external AI requests', () => {
    const discCheck = inspectSensitiveHealthText('요추 4-5번 디스크 추간판 탈출증 수술 후 통증 호소 회원');
    expect(discCheck.hasSensitiveData).toBe(true);
    expect(discCheck.matchedCategories).toContain('척추·관절 질환/진단명');
    expect(discCheck.matchedCategories).toContain('수술·시술·치료 이력');
    expect(discCheck.sanitizedText).toContain('[민감정보 제외]');
    expect(discCheck.warningMessageKo).toContain('무료 외부 AI로 전송할 수 없습니다');

    const piiCheck = inspectSensitiveHealthText('임신 12주 산모 연락처 010-1234-5678 test@example.com');
    expect(piiCheck.hasSensitiveData).toBe(true);
    expect(piiCheck.matchedCategories).toContain('임신·산전·산후 건강상태');
    expect(piiCheck.matchedCategories).toContain('개인 식별 정보(연락처·이메일·주민번호)');

    const safeCheck = inspectSensitiveHealthText('중급 리포머 코어 조절과 둔근·하체 연결성 강화 수업');
    expect(safeCheck.hasSensitiveData).toBe(false);
    expect(safeCheck.warningMessageKo).toBeNull();
  });

  it('rejects server requests containing sensitive health notes or BYOK fields', () => {
    const invalidHealthReq = freeAiServerRequestSchema.safeParse({
      task: 'movement-idea',
      idea: {
        rawIdeaText: '허리 디스크 협착증 수술 환자를 위한 브릿지 변형',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'glute-lower',
        level: '1.0',
      },
    });
    expect(invalidHealthReq.success).toBe(false);

    const validReq = freeAiServerRequestSchema.safeParse({
      task: 'movement-idea',
      idea: {
        rawIdeaText: '발바닥 지지 감각을 깨우며 골반 분절에 집중하는 브릿지 변형',
        apparatus: 'reformer',
        blockCategory: 'bridging',
        strengthenArea: 'glute-lower',
        level: '1.0',
      },
    });
    expect(validReq.success).toBe(true);

    const payloadHealth = inspectPayloadForSensitiveHealth({
      memberHealthNotes: '좌골신경통',
    });
    expect(payloadHealth.hasSensitiveData).toBe(true);
  });
});
