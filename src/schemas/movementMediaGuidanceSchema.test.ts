import { describe, expect, it } from 'vitest';
import { KOREAN_VOICE_SPEED_OPTIONS } from '../types/movementMediaGuidance';
import {
  buildPermittedYouTubeNocookieEmbedUrl,
  createMediaComplianceAudit,
  detectForbiddenPaidVoiceOrDownloadUrl,
  isPermittedEmbedUrl,
  isValidKoreanVoiceSpeed,
  koreanVoiceSpeedSchema,
  resolvePermittedEmbed,
  validateSafeExternalReferenceUrl,
} from './movementMediaGuidanceSchema';

describe('movementMediaGuidanceSchema', () => {
  describe('koreanVoiceSpeedSchema & isValidKoreanVoiceSpeed', () => {
    it('accepts all supported Korean voice playback speeds', () => {
      for (const speed of KOREAN_VOICE_SPEED_OPTIONS) {
        expect(koreanVoiceSpeedSchema.safeParse(speed).success).toBe(true);
        expect(isValidKoreanVoiceSpeed(speed)).toBe(true);
      }
    });

    it('rejects unsupported numbers and non-numeric values', () => {
      for (const invalid of [0, 0.5, 0.8, 1.05, 1.5, 2, -1, NaN, Infinity, '1', null, undefined]) {
        expect(koreanVoiceSpeedSchema.safeParse(invalid).success).toBe(false);
        expect(isValidKoreanVoiceSpeed(invalid)).toBe(false);
      }
    });
  });

  describe('detectForbiddenPaidVoiceOrDownloadUrl', () => {
    it('blocks all paid TTS API hosts and paths', () => {
      const paidVoiceUrls = [
        'https://api.elevenlabs.io/v1/text-to-speech/voice123',
        'https://elevenlabs.io/app/speech-synthesis',
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        'https://api.openai.com/v1/audio/speech',
        'https://polly.ap-northeast-2.amazonaws.com/v1/speech',
        'https://amazonaws.com/polly/synthesize',
        'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts',
        'https://clova.ai/voice/api',
        'https://typecast.ai/kr/speech',
        'https://koreacentral.tts.speech.microsoft.com/cognitiveservices/v1',
        'https://api.play.ht/api/v2/tts',
        'https://murf.ai/api/v1/speech',
        'https://api.supertone.ai/v1/tts',
      ];

      for (const url of paidVoiceUrls) {
        const result = detectForbiddenPaidVoiceOrDownloadUrl(url);
        expect(result.forbidden, `Expected ${url} to be forbidden`).toBe(true);
        expect(result.category).toBe('paid-voice-api');
        expect(result.reasonKo).toBeTruthy();
      }
    });

    it('blocks unauthorized video downloaders and scrapers', () => {
      const downloaderUrls = [
        'https://www.y2mate.com/youtube/Bkgcbd1nabU',
        'https://en.savefrom.net/1-youtube-video-downloader',
        'https://www.ssyoutube.com/watch?v=Bkgcbd1nabU',
        'https://ytmp3.cc/en13/',
        'https://yt1s.com/en/youtube-to-mp4',
        'https://www.snaptube.com/download',
        'https://example.com/api/yt-dlp?url=https://youtu.be/Bkgcbd1nabU',
        'https://loader.to/en/youtube-downloader.html',
        'https://keepvid.pro/youtube-downloader',
        'https://9xbuddy.com/process?url=https://www.youtube.com/watch?v=Bkgcbd1nabU',
        'https://savemp3.net/extract',
      ];

      for (const url of downloaderUrls) {
        const result = detectForbiddenPaidVoiceOrDownloadUrl(url);
        expect(result.forbidden, `Expected ${url} to be forbidden`).toBe(true);
        expect(result.category).toBe('unauthorized-video-download');
        expect(result.reasonKo).toBeTruthy();
      }
    });

    it('blocks redistributed raw video and audio binary URLs', () => {
      const binaryUrls = [
        'https://cdn.example.com/pilates/hundred.mp4',
        'https://cdn.example.com/pilates/footwork.webm?token=123',
        'https://cdn.example.com/pilates/clip.mkv',
        'https://cdn.example.com/pilates/clip.avi',
        'https://cdn.example.com/pilates/clip.mov',
        'https://cdn.example.com/voice/cue.mp3',
        'https://cdn.example.com/voice/cue.wav',
        'https://cdn.example.com/voice/cue.m4a',
        'https://cdn.example.com/voice/cue.ogg',
        'https://cdn.example.com/stream?id=123&format=mp4',
        'https://cdn.example.com/stream?mime=video/mp4',
      ];

      for (const url of binaryUrls) {
        const result = detectForbiddenPaidVoiceOrDownloadUrl(url);
        expect(result.forbidden, `Expected ${url} to be forbidden`).toBe(true);
        expect(result.category).toBe('redistributed-media-binary');
        expect(result.reasonKo).toBeTruthy();
      }
    });

    it('allows credible public references including YouTube watch URLs, Merrithew articles, NHS PDFs, KSPO, and KDCA', () => {
      const safeUrls = [
        'https://www.youtube.com/watch?v=Bkgcbd1nabU',
        'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
        'https://www.leicspart.nhs.uk/wp-content/uploads/2022/07/134-Falls-service-stretching-and-strengthening-exercises-edition-5.pdf',
        'https://nfa.kspo.or.kr/classroom/program/0/selectPhysicalUpProgramByAgeSe04.kspo',
        'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5293',
      ];

      for (const url of safeUrls) {
        const result = detectForbiddenPaidVoiceOrDownloadUrl(url);
        expect(result).toEqual({
          forbidden: false,
          reasonKo: null,
          category: null,
        });
      }
    });
  });

  describe('validateSafeExternalReferenceUrl', () => {
    it('accepts valid http and https URLs and trims surrounding whitespace', () => {
      expect(
        validateSafeExternalReferenceUrl('  https://www.youtube.com/watch?v=Bkgcbd1nabU  '),
      ).toBe('https://www.youtube.com/watch?v=Bkgcbd1nabU');
      expect(
        validateSafeExternalReferenceUrl(
          'https://www.merrithew.com/blog/post/2023-08-13/exercise-of-the-month-swan-dive',
        ),
      ).toBe('https://www.merrithew.com/blog/post/2023-08-13/exercise-of-the-month-swan-dive');
    });

    it('rejects dangerous protocols, credentials, control characters, and forbidden media URLs', () => {
      expect(validateSafeExternalReferenceUrl('javascript:alert(1)')).toBeNull();
      expect(validateSafeExternalReferenceUrl('data:text/html,<h1>test</h1>')).toBeNull();
      expect(validateSafeExternalReferenceUrl('blob:https://example.com/123')).toBeNull();
      expect(validateSafeExternalReferenceUrl('file:///etc/passwd')).toBeNull();
      expect(validateSafeExternalReferenceUrl('https://user:pass@example.com/page')).toBeNull();
      expect(validateSafeExternalReferenceUrl('https://example.com/video.mp4')).toBeNull();
      expect(validateSafeExternalReferenceUrl('https://api.elevenlabs.io/v1/tts')).toBeNull();
      expect(validateSafeExternalReferenceUrl('https://y2mate.com/youtube/123')).toBeNull();
      expect(validateSafeExternalReferenceUrl('')).toBeNull();
      expect(validateSafeExternalReferenceUrl(null)).toBeNull();
    });
  });

  describe('buildPermittedYouTubeNocookieEmbedUrl & isPermittedEmbedUrl', () => {
    it('builds valid youtube-nocookie embed URLs with rel=0 and autoplay=0', () => {
      const url = buildPermittedYouTubeNocookieEmbedUrl('Bkgcbd1nabU');
      expect(url).toBe('https://www.youtube-nocookie.com/embed/Bkgcbd1nabU?rel=0&autoplay=0');
      expect(isPermittedEmbedUrl(url)).toBe(true);
    });

    it('includes start and end parameters when valid and finite', () => {
      const url = buildPermittedYouTubeNocookieEmbedUrl('K56Z12XNQ5c', 45, 210);
      expect(url).toBe(
        'https://www.youtube-nocookie.com/embed/K56Z12XNQ5c?rel=0&autoplay=0&start=45&end=210',
      );
      expect(isPermittedEmbedUrl(url)).toBe(true);
    });

    it('omits endSec when endSec <= startSec and never sets autoplay=1', () => {
      const url = buildPermittedYouTubeNocookieEmbedUrl('K56Z12XNQ5c', 100, 80);
      expect(url).toBe(
        'https://www.youtube-nocookie.com/embed/K56Z12XNQ5c?rel=0&autoplay=0&start=100',
      );
      expect(url).not.toContain('autoplay=1');
      expect(isPermittedEmbedUrl(url)).toBe(true);
    });

    it('rejects invalid video IDs and non-nocookie or autoplay=1 embed URLs', () => {
      expect(buildPermittedYouTubeNocookieEmbedUrl('short')).toBeNull();
      expect(buildPermittedYouTubeNocookieEmbedUrl('bad!video!id')).toBeNull();

      expect(
        isPermittedEmbedUrl('https://www.youtube.com/embed/Bkgcbd1nabU?rel=0&autoplay=0'),
      ).toBe(false);
      expect(
        isPermittedEmbedUrl('https://www.youtube-nocookie.com/embed/Bkgcbd1nabU?rel=0&autoplay=1'),
      ).toBe(false);
      expect(
        isPermittedEmbedUrl('https://www.youtube-nocookie.com/embed/Bkgcbd1nabU?autoplay=0'),
      ).toBe(false);
      expect(
        isPermittedEmbedUrl('http://www.youtube-nocookie.com/embed/Bkgcbd1nabU?rel=0&autoplay=0'),
      ).toBe(false);
    });
  });

  describe('resolvePermittedEmbed & createMediaComplianceAudit', () => {
    it('resolves youtube-nocookie-allowed sources with both embedUrl and externalOriginalUrl', () => {
      const resolution = resolvePermittedEmbed({
        provider: 'youtube',
        embedPolicy: 'youtube-nocookie-allowed',
        youtubeVideoId: 'Bkgcbd1nabU',
        url: 'https://www.youtube.com/watch?v=Bkgcbd1nabU',
        startSec: 30,
        endSec: 120,
        publisher: 'WITH PILATES / 위드필라테스',
      });

      expect(resolution.allowed).toBe(true);
      expect(resolution.policy).toBe('youtube-nocookie-allowed');
      expect(resolution.embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/Bkgcbd1nabU?rel=0&autoplay=0&start=30&end=120',
      );
      expect(resolution.externalOriginalUrl).toBe('https://www.youtube.com/watch?v=Bkgcbd1nabU');
      expect(resolution.externalLinkLabelKo).toBe('YouTube 외부 원본 보기');
    });

    it('resolves external-link-only sources with embedUrl=null and externalOriginalUrl preserved', () => {
      const resolution = resolvePermittedEmbed({
        provider: 'official-website',
        embedPolicy: 'external-link-only',
        youtubeVideoId: null,
        url: 'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
        startSec: null,
        endSec: null,
        publisher: 'Merrithew 공식 웹사이트',
      });

      expect(resolution.allowed).toBe(false);
      expect(resolution.policy).toBe('external-link-only');
      expect(resolution.embedUrl).toBeNull();
      expect(resolution.externalOriginalUrl).toBe(
        'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
      );
      expect(resolution.externalLinkLabelKo).toBe('외부 원본 보기');
    });

    it('returns a frozen compliance audit with all required flags', () => {
      const audit = createMediaComplianceAudit();
      expect(Object.isFrozen(audit)).toBe(true);
      expect(audit).toEqual({
        usesPaidVoiceApi: false,
        usesUnauthorizedVideoDownload: false,
        usesRedistributedMediaBinary: false,
        autoPlaysOnEntryOrSwitch: false,
        externalOriginalLinkAlwaysPresent: true,
      });
    });
  });
});
