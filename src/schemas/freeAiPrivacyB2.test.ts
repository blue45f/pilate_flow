import { describe, expect, it, vi } from 'vitest';
import {
  detectByokOrSecretExposure,
  inspectSensitiveHealthText,
  stripForbiddenKeyFields,
} from './freeAiAssistantSchema';
import { inspectSensitiveHealthText as inspectLocalText } from '../utils/freeAiAssistantEngine';
import { createDefaultFreeAiStatus, createFreeAiClient } from '../lib/freeAiClient';

const sensitiveExamples = [
  '김민지 회원(34세) 출산 8주차 복직근 이개 및 허리 통증 완화',
  '박서연님 무릎 통증·어깨 충돌증후군 주의',
  '김민지 회원',
  '박서연님',
  '회원 김민지',
  '출산 8주차',
  '산후 12주',
  '복직근 이개',
  '허리 통증',
  '무릎 통증',
  '어깨 충돌증후군',
];

describe('DEFECT-B2 fixed privacy boundary', () => {
  it('strips secret fields at every nested array level without mutating input', () => {
    const input = {
      apiKey: 'synthetic-value',
      steps: [
        {
          exerciseId: 'ex-1',
          apiKey: 'synthetic-value',
          nested: [
            [
              {
                VITE_OPENROUTER_API_KEY: 'synthetic-value',
                keep: true,
              },
            ],
            null,
            7,
            'plain',
          ],
        },
      ],
    };
    const clean = stripForbiddenKeyFields(input);
    expect(clean).toEqual({
      steps: [{ exerciseId: 'ex-1', nested: [[{ keep: true }], null, 7, 'plain'] }],
    });
    expect(detectByokOrSecretExposure(clean).safe).toBe(true);
    expect(input.steps[0].apiKey).toBe('synthetic-value');
  });

  it.each(sensitiveExamples)('blocks external transmission for %s', async (rawIdeaText) => {
    const inspected = inspectSensitiveHealthText(rawIdeaText);
    expect(inspected.hasSensitiveData).toBe(true);
    expect(inspected.sanitizedText).not.toBe(rawIdeaText);
    expect(inspectLocalText(rawIdeaText)).toEqual(inspected);
    const postAssist = vi.fn();
    const client = createFreeAiClient({
      transport: {
        getStatus: async () => createDefaultFreeAiStatus(),
        postAssist,
      },
    });
    await expect(
      client.requestMovementIdea({
        rawIdeaText,
        apparatus: 'mat',
        blockCategory: 'core',
        strengthenArea: 'core',
        level: '1.0',
      }),
    ).rejects.toMatchObject({ code: 'sensitive_health_blocked' });
    expect(postAssist).not.toHaveBeenCalled();
  });

  it.each([
    '중급 리포머 코어 조절과 둔근·하체 연결성 강화 수업',
    '초급 회원 대상 흉추 가동성 수업',
    '회원 수준에 맞는 어깨 안정화와 무릎 정렬',
    '선생님 지도에 맞춰 코어 강화',
  ])('preserves benign class-planning input: %s', (text) => {
    expect(inspectSensitiveHealthText(text).hasSensitiveData).toBe(false);
    expect(inspectLocalText(text).sanitizedText).toBe(text);
  });
});
