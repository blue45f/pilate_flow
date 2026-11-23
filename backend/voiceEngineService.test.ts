import { describe, expect, it, vi } from 'vitest';
import {
  createVoiceEngineRoutes,
  createVoiceEngineService,
  resolveVoiceEngineConfig,
} from './voiceEngineService';

describe('backend voiceEngineService', () => {
  it('resolves server-only provider priority (OpenAI -> ElevenLabs -> Deepgram) and never reads VITE_* vars', () => {
    const empty = resolveVoiceEngineConfig({
      VITE_OPENAI_API_KEY: 'should-never-be-read',
    });
    expect(empty.configured).toBe(false);
    expect(empty.provider).toBe('none');

    const openaiCfg = resolveVoiceEngineConfig({
      OPENAI_API_KEY: 'test-openai-voice-token',
      DEEPGRAM_API_KEY: 'test-deepgram-voice-token',
      OPENAI_TTS_VOICE: 'sage',
    });
    expect(openaiCfg.configured).toBe(true);
    expect(openaiCfg.provider).toBe('openai');
    expect(openaiCfg.model).toBe('gpt-4o-mini-tts');
    expect(openaiCfg.defaultVoiceId).toBe('sage');

    const deepgramOverride = resolveVoiceEngineConfig({
      OPENAI_API_KEY: 'test-openai-voice-token',
      DEEPGRAM_API_KEY: 'test-deepgram-voice-token',
      VOICE_ENGINE_PROVIDER: 'deepgram',
    });
    expect(deepgramOverride.provider).toBe('deepgram');

    const elevenCfg = resolveVoiceEngineConfig({
      ELEVENLABS_API_KEY: 'test-elevenlabs-voice-token',
    });
    expect(elevenCfg.provider).toBe('elevenlabs');
  });

  it('synthesizes Korean Pilates narration via OpenAI gpt-4o-mini-tts and caches identical requests', async () => {
    const mockFetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.openai.com/v1/audio/speech');
      const parsed = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(parsed.model).toBe('gpt-4o-mini-tts');
      expect(parsed.voice).toBe('coral');
      expect(parsed.response_format).toBe('mp3');
      expect(String(parsed.instructions)).toContain('Pilates instructor');
      return new Response(new Uint8Array([0x49, 0x44, 0x33, 0x03]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    });

    const service = createVoiceEngineService({
      env: { OPENAI_API_KEY: 'test-openai-voice-token' },
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    const routes = createVoiceEngineRoutes(service);

    const statusRes = await routes['GET /api/studio/voice/status']({});
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.headers['Cache-Control']).toBe('private, no-store');
    expect(statusRes.body).not.toContain('test-openai-voice-token');
    expect(JSON.parse(statusRes.body)).toMatchObject({
      available: true,
      provider: 'openai',
      model: 'gpt-4o-mini-tts',
      voiceId: 'coral',
    });

    const firstRes = await routes['POST /api/studio/voice/synthesize']({
      user: { userId: 'u-1', scope: 'openid' },
      body: {
        text: '먼저 스프링은 빨강 둘에 파랑 하나 걸어주시고요, 편하게 누워볼게요.',
        tone: 'setup',
        voice: 'coral',
        speed: 1,
      },
    });
    expect(firstRes.statusCode).toBe(200);
    const firstPayload = JSON.parse(firstRes.body);
    expect(firstPayload.provider).toBe('openai');
    expect(firstPayload.mimeType).toBe('audio/mpeg');
    expect(firstPayload.cachedOnServer).toBe(false);
    expect(firstPayload.audioBase64.length).toBeGreaterThan(0);

    // Repeat request hits server cache without hitting OpenAI again
    const secondRes = await routes['POST /api/studio/voice/synthesize']({
      user: { userId: 'u-1', scope: 'openid' },
      body: {
        text: '먼저 스프링은 빨강 둘에 파랑 하나 걸어주시고요, 편하게 누워볼게요.',
        tone: 'setup',
        voice: 'coral',
        speed: 1,
      },
    });
    expect(secondRes.statusCode).toBe(200);
    expect(JSON.parse(secondRes.body).cachedOnServer).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('supports Deepgram /v1/speak and ElevenLabs providers cleanly', async () => {
    const deepgramFetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toContain('https://api.deepgram.com/v1/speak?');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Token test-dg-token');
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });

    const dgService = createVoiceEngineService({
      env: { DEEPGRAM_API_KEY: 'test-dg-token' },
      fetchFn: deepgramFetch as unknown as typeof fetch,
    });
    const dgResult = await dgService.synthesize('u-dg', {
      text: '코로 깊게 마시고 내쉬어 볼게요.',
      tone: 'breath',
    });
    expect(dgResult.provider).toBe('deepgram');
    expect(deepgramFetch).toHaveBeenCalledTimes(1);
  });

  it('blocks BYOK keys, blocks sensitive health/personal data, and returns 503 when unconfigured', async () => {
    const service = createVoiceEngineService({
      env: {},
    });
    const routes = createVoiceEngineRoutes(service);

    const byokRes = await routes['POST /api/studio/voice/synthesize']({
      user: { userId: 'u-1', scope: 'openid' },
      body: {
        text: '정상 안내 문구',
        apiKey: 'user-supplied-key',
      },
    });
    expect(byokRes.statusCode).toBe(400);
    expect(JSON.parse(byokRes.body).error).toBe('byok_forbidden');

    const sensitiveRes = await routes['POST /api/studio/voice/synthesize']({
      user: { userId: 'u-1', scope: 'openid' },
      body: {
        text: '회원님 010-9876-5432 허리 디스크 수술 이력 주의',
      },
    });
    expect(sensitiveRes.statusCode).toBe(400);
    expect(JSON.parse(sensitiveRes.body).error).toBe('sensitive_data_blocked');

    const unconfiguredRes = await routes['POST /api/studio/voice/synthesize']({
      user: { userId: 'u-1', scope: 'openid' },
      body: {
        text: '이번 동작은 리포머 풋워크예요.',
      },
    });
    expect(unconfiguredRes.statusCode).toBe(503);
    expect(JSON.parse(unconfiguredRes.body).error).toBe('unconfigured');
  });
});
