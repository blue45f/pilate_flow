import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COURSE_REFERENCES } from '../../../data/courseReferences';
import { getMotionCandidateResearch } from '../../../data/motionCandidateResearch';
import { INITIAL_EXERCISES } from '../../../data/pilatesCatalog';
import { PUBLIC_REFERENCES } from '../../../data/publicReferences';
import { VERIFIED_REFERENCES } from '../../../data/verifiedReferences';
import {
  REFERENCE_LINK_POLICY_CANDIDATE_SCOPE,
  ReferenceLinkPolicyPreview,
  SYNTHETIC_POLICY_FIXTURE_PRESETS,
  auditExistingPublicUrlSamples,
  buildLocalSyntheticIframeFixtureUrl,
  createReferencePlayerDisplayController,
  evaluateReferenceLinkCandidates,
  isStrictNoAutoplayEmbedUrl,
  normalizeReferenceUrlPolicy,
  parseYouTubeTimeParamSeconds,
  type ReferenceLinkCandidateInput,
} from '../index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Independent Verification Track — referenceLinkPolicyCandidate', () => {
  describe('1. Caller-owned object immutability, non-freezing, deep nesting, circularity & null-prototype safety', () => {
    it('never mutates or freezes caller-owned candidate objects, arrays, or options while freezing all returned reports and snapshots', () => {
      const callerCandidate1: Record<string, unknown> = {
        candidateId: 'caller-yt-1',
        title: '호출자 소유 YouTube 객체',
        publisher: '위드필라테스',
        url: 'https://youtu.be/Y_9c3NFbm1A?si=callerShare123&t=20s',
        tier: 'curated-youtube-pool',
        region: 'kr',
      };
      const callerCandidate2: Record<string, unknown> = {
        candidateId: 'caller-web-1',
        title: '호출자 소유 웹사이트 객체',
        publisher: '질병관리청',
        url: `${PUBLIC_REFERENCES[2].url}&utm_source=caller`,
        tier: 'public-education-portal',
        region: 'kr',
      };
      const callerArray = [callerCandidate1, callerCandidate2];
      const callerOptions = {
        maxScanItems: 50,
        maxNormalizedItems: 20,
        deduplicateByVideoIdRegardlessOfStart: false,
      };

      const snapshotBefore = JSON.stringify(callerArray);
      const report = evaluateReferenceLinkCandidates(
        'immutability-check',
        '불변성 검증',
        callerArray,
        callerOptions,
      );

      // Caller objects and arrays must remain unfrozen and unmutated
      expect(Object.isFrozen(callerArray)).toBe(false);
      expect(Object.isFrozen(callerCandidate1)).toBe(false);
      expect(Object.isFrozen(callerCandidate2)).toBe(false);
      expect(Object.isFrozen(callerOptions)).toBe(false);
      expect(JSON.stringify(callerArray)).toBe(snapshotBefore);

      // Caller can still mutate its own objects after evaluation without throwing
      callerCandidate1.extraField = 'mutable-after-eval';
      callerArray.push({ candidateId: 'appended-later' });
      expect(callerArray).toHaveLength(3);
      expect(report.acceptedItems).toHaveLength(2);

      // Returned structures must be deeply frozen
      expect(Object.isFrozen(REFERENCE_LINK_POLICY_CANDIDATE_SCOPE)).toBe(true);
      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.summary)).toBe(true);
      expect(Object.isFrozen(report.acceptedItems)).toBe(true);
      expect(Object.isFrozen(report.acceptedItems[0])).toBe(true);
      expect(Object.isFrozen(report.acceptedItems[0].normalized)).toBe(true);
      expect(Object.isFrozen(report.acceptedItems[0].normalized.strippedQueryParams)).toBe(true);
      expect(Object.isFrozen(report.acceptedItems[0].normalized.strippedQueryKeys)).toBe(true);
    });

    it('handles malformed scalar inputs, 12,000-deep nested objects, circular candidate structures, and Object.create(null) inputs without stack overflow or caller mutation', () => {
      // Build a 12,000-deep nested object iteratively
      const deepRoot: Record<string, unknown> = { level: 0 };
      let cursor = deepRoot;
      for (let i = 1; i <= 12000; i += 1) {
        const next: Record<string, unknown> = { level: i };
        cursor.child = next;
        cursor = next;
      }

      // Build a self-referential circular candidate object
      const circularCandidate: Record<string, unknown> = {
        candidateId: 'circular-candidate',
        title: '순환 참조 후보',
        publisher: '순환 테스트',
        url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
        tier: 'direct-exercise-youtube',
      };
      circularCandidate.self = circularCandidate;
      circularCandidate.deepPayload = deepRoot;

      // Build an Object.create(null) candidate and options object
      const nullProtoCandidate: ReferenceLinkCandidateInput = Object.assign(
        Object.create(null),
        {
          candidateId: 'null-proto-candidate',
          title: '프로토타입 없는 후보',
          publisher: 'NullProto Publisher',
          url: 'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5293',
          tier: 'public-education-portal' as const,
          region: 'kr' as const,
        },
      );
      const nullProtoOptions = Object.assign(Object.create(null), {
        maxScanItems: 25,
        maxNormalizedItems: 10,
      });

      const malformedCandidates: unknown[] = [
        null,
        undefined,
        42,
        'raw-string-not-object',
        true,
        ['array-instead-of-object'],
        deepRoot,
        circularCandidate,
        nullProtoCandidate,
        {
          candidateId: 99999,
          title: { nested: 'bad-title' },
          publisher: ['bad-publisher'],
          url: { notAUrl: true },
          tier: 'invalid-tier-name',
          region: 'invalid-region',
          startSec: NaN,
          endSec: Infinity,
        },
      ];
      // Circular reference on the candidate array itself
      malformedCandidates.push(malformedCandidates);

      expect(normalizeReferenceUrlPolicy(deepRoot).rejectionCode).toBe('invalid-input-type');
      expect(normalizeReferenceUrlPolicy(circularCandidate).rejectionCode).toBe(
        'invalid-input-type',
      );
      expect(normalizeReferenceUrlPolicy(Object.create(null)).rejectionCode).toBe(
        'invalid-input-type',
      );

      const report = evaluateReferenceLinkCandidates(
        Object.create(null),
        deepRoot,
        malformedCandidates,
        nullProtoOptions,
      );

      expect(report.subjectId).toBe('unknown-subject');
      expect(report.subjectTitleKo).toBe('동작 참고 링크 후보');
      expect(report.summary.acceptedCount).toBe(2);
      expect(report.acceptedItems.map((item) => item.itemId)).toEqual([
        'circular-candidate',
        'null-proto-candidate',
      ]);
      expect(report.summary.rejectedCount).toBeGreaterThanOrEqual(8);

      // Verify caller-owned deep & circular structures were not frozen
      expect(Object.isFrozen(deepRoot)).toBe(false);
      expect(Object.isFrozen(circularCandidate)).toBe(false);
      expect(Object.isFrozen(nullProtoCandidate)).toBe(false);
      expect(Object.isFrozen(malformedCandidates)).toBe(false);
    });
  });

  describe('2. Strict PII, session token, and tracking query value redaction in JSON and DOM', () => {
    it('redacts all stripped query values so raw emails, phones, JWTs, API keys, si tokens, fbclid, and gclid never appear in JSON.stringify(report) or rendered DOM', () => {
      const secretEmail1 = 'instructor.pii@pilates-secret.example.com';
      const secretEmail2 = 'hidden.student@leak-check.example.kr';
      const secretPhoneKr = '010-9182-7364';
      const secretPhoneIntl = '+82-10-4455-6677';
      const secretJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwaWxhdGVzLXVzZXItOTk5In0.superSecretSignatureToken123';
      const secretOpenAiKey = ['sk-', 'proj9876543210abcdefghijklmnop'].join('');
      const secretGithubToken = ['ghp_', '1234567890abcdefghijklmnopqrstuvwxyz'].join('');
      const secretSiToken = 'si_ultra_secret_share_token_778899';
      const secretFbclid = 'IwAR_secret_facebook_click_id_554433';
      const secretGclid = 'Cj0KCQ_secret_google_click_id_112233';
      const secretSessionId = 'sess_private_instructor_cookie_990011';

      const dirtyYoutubeUrl = [
        'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
        `si=${encodeURIComponent(secretSiToken)}`,
        `fbclid=${encodeURIComponent(secretFbclid)}`,
        `gclid=${encodeURIComponent(secretGclid)}`,
        `email=${encodeURIComponent(secretEmail1)}`,
        `phone=${encodeURIComponent(secretPhoneKr)}`,
        `access_token=${encodeURIComponent(secretJwt)}`,
        `custom_email_note=${encodeURIComponent(secretEmail2)}`,
        `custom_phone_note=${encodeURIComponent(secretPhoneIntl)}`,
        `custom_openai_key=${encodeURIComponent(secretOpenAiKey)}`,
        `autoplay=1`,
        `t=40s`,
      ].join('&');

      const dirtyPortalUrl = [
        PUBLIC_REFERENCES[2].url,
        `session_id=${encodeURIComponent(secretSessionId)}`,
        `custom_gh_token=${encodeURIComponent(secretGithubToken)}`,
        `utm_source=private_newsletter_campaign_secret`,
      ].join('&');

      const report = evaluateReferenceLinkCandidates(
        'pii-redaction-audit',
        '개인정보 및 토큰 완전 마스킹 검증',
        [
          {
            candidateId: 'dirty-yt',
            title: '더티 쿼리 YouTube',
            publisher: '위드필라테스',
            url: dirtyYoutubeUrl,
            tier: 'direct-exercise-youtube',
            region: 'kr',
          },
          {
            candidateId: 'dirty-portal',
            title: '더티 쿼리 질병관리청 포털',
            publisher: '질병관리청',
            url: dirtyPortalUrl,
            tier: 'public-education-portal',
            region: 'kr',
          },
        ],
      );

      // Every diagnostic entry must only contain { key, category, valueRedacted: true }
      for (const item of report.acceptedItems) {
        for (const diag of item.normalized.strippedQueryParams) {
          expect(diag.valueRedacted).toBe(true);
          expect(Object.keys(diag).sort()).toEqual(['category', 'key', 'valueRedacted']);
        }
      }

      const forbiddenLeakTokens = [
        secretEmail1,
        secretEmail2,
        'pilates-secret.example.com',
        'leak-check.example.kr',
        secretPhoneKr,
        secretPhoneIntl,
        '9182-7364',
        '4455-6677',
        secretJwt,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'superSecretSignatureToken123',
        secretOpenAiKey,
        secretGithubToken,
        secretSiToken,
        secretFbclid,
        secretGclid,
        secretSessionId,
        'private_newsletter_campaign_secret',
      ];

      const serializedReport = JSON.stringify(report);
      for (const token of forbiddenLeakTokens) {
        expect(serializedReport).not.toContain(token);
      }

      // Render into DOM and inspect all tabs (all, embed-capable, external-only, diagnostics)
      const { container } = render(<ReferenceLinkPolicyPreview report={report} />);
      const tabTestIds = [
        'rlpc-tab-all',
        'rlpc-tab-embed-capable',
        'rlpc-tab-external-only',
        'rlpc-tab-diagnostics',
      ];

      for (const tabId of tabTestIds) {
        fireEvent.click(screen.getByTestId(tabId));
        const html = container.innerHTML;
        const text = container.textContent ?? '';
        for (const token of forbiddenLeakTokens) {
          expect(html).not.toContain(token);
          expect(text).not.toContain(token);
        }
      }
    });
  });

  describe('3. Adversarial scheme, encoding, credential, port, private/local IP, downloader, paid TTS, and raw media blocking', () => {
    it('blocks all adversarial schemes, HTML-entity/percent encodings, control/Bidi chars, credentials, explicit ports, private/loopback/link-local hosts, downloaders, paid TTS APIs, and raw media binaries', () => {
      const adversarialMatrix: ReadonlyArray<
        readonly [input: unknown, expectedRejectionCode: string]
      > = [
        // Invalid types & empty & oversize
        [undefined, 'invalid-input-type'],
        [12345, 'invalid-input-type'],
        ['', 'empty-url'],
        ['     ', 'empty-url'],
        [`https://www.youtube.com/watch?v=Y_9c3NFbm1A&pad=${'x'.repeat(2050)}`, 'max-length-exceeded'],

        // Control chars, zero-width chars, BOM, and Bidi overrides
        ['   \n\t  ', 'control-characters'],
        ['https://www.youtube.com/watch?v=Y_9c3NFbm1A\u0000', 'control-characters'],
        ['https://www.youtube.com/watch?v=Y_9c3NFbm1A\u0007', 'control-characters'],
        ['https://www.youtube.com/watch?v=Y_9c3NFbm1A\u001b', 'control-characters'],
        ['https://www.youtube.com/watch?v=Y_9c3NFbm1A\u007f', 'control-characters'],
        ['https://www.youtube.com/watch?v=Y_9c3NFbm1A\u0085', 'control-characters'],
        ['https://www.youtube.com/\u200bwatch?v=Y_9c3NFbm1A', 'control-characters'],
        ['\ufeffhttps://www.youtube.com/watch?v=Y_9c3NFbm1A', 'control-characters'],
        ['https://www.youtube.com/watch?v=\u202eY_9c3NFbm1A', 'control-characters'],
        ['https://www.youtube.com/watch?v=\u202aY_9c3NFbm1A', 'control-characters'],
        ['https://www.youtube.com/watch?v=\u2066Y_9c3NFbm1A\u2069', 'control-characters'],

        // Relative / protocol-relative paths
        ['//www.youtube.com/watch?v=Y_9c3NFbm1A', 'protocol-relative-or-relative'],
        ['/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html', 'protocol-relative-or-relative'],
        ['./local-video.html', 'protocol-relative-or-relative'],
        ['../secret/config.json', 'protocol-relative-or-relative'],

        // Direct, HTML-entity encoded, and double-percent-encoded malicious schemes
        ['javascript:alert(1)', 'malicious-scheme'],
        ['JAVASCRIPT:alert(document.domain)', 'malicious-scheme'],
        ['&#106;avascript:alert(1)', 'malicious-scheme'],
        ['&#x6a;avascript:alert(1)', 'malicious-scheme'],
        ['&#106;&#97;&#118;&#97;script:alert(1)', 'malicious-scheme'],
        ['java%09script:alert(1)', 'malicious-scheme'],
        ['java%0ascript:alert(1)', 'malicious-scheme'],
        ['java%0d%0ascript:alert(1)', 'malicious-scheme'],
        ['%6a%61%76%61%73%63%72%69%70%74:alert(1)', 'malicious-scheme'],
        ['%256a%2561%2576%2561script:alert(1)', 'malicious-scheme'],
        ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'malicious-scheme'],
        ['&#100;ata:text/html,<svg onload=alert(1)>', 'malicious-scheme'],
        ['vbscript:msgbox("xss")', 'malicious-scheme'],
        ['%76%62%73%63%72%69%70%74:execute("alert")', 'malicious-scheme'],
        ['file:///etc/passwd', 'malicious-scheme'],
        ['&#x66;ile:///c:/windows/win.ini', 'malicious-scheme'],
        ['blob:https://www.youtube.com/550e8400-e29b-41d4-a716-446655440000', 'malicious-scheme'],
        ['ftp://files.example.com/pilates.mp4', 'malicious-scheme'],
        ['ws://realtime.example.com/socket', 'malicious-scheme'],
        ['wss://realtime.example.com/socket', 'malicious-scheme'],

        // Embedded credentials & explicit ports
        ['https://admin:hunter2@www.youtube.com/watch?v=Y_9c3NFbm1A', 'embedded-credentials'],
        ['https://oauthTokenOnly@www.merrithew.com/pilates-exercise', 'embedded-credentials'],
        ['https://www.youtube.com:443/watch?v=Y_9c3NFbm1A', 'disallowed-port'],
        ['https://www.youtube.com:8443/watch?v=Y_9c3NFbm1A', 'disallowed-port'],
        ['http://www.merrithew.com:80/blog', 'disallowed-port'],
        ['http://[::1]:8080/admin', 'disallowed-port'],

        // Loopback, private, link-local IPv4 & IPv6 hosts
        ['http://127.0.0.1/pilates', 'private-or-local-host'],
        ['http://127.255.255.254/internal', 'private-or-local-host'],
        ['http://localhost/pilates', 'private-or-local-host'],
        ['http://api.localhost/pilates', 'private-or-local-host'],
        ['http://studio.local/pilates', 'private-or-local-host'],
        ['http://cluster.internal/pilates', 'private-or-local-host'],
        ['http://0.0.0.0/pilates', 'private-or-local-host'],
        ['http://[::1]/pilates', 'private-or-local-host'],
        ['http://[0:0:0:0:0:0:0:1]/pilates', 'private-or-local-host'],
        ['http://10.0.0.1/pilates', 'private-or-local-host'],
        ['http://192.168.1.1/pilates', 'private-or-local-host'],
        ['http://172.16.0.1/pilates', 'private-or-local-host'],
        ['http://172.31.255.1/pilates', 'private-or-local-host'],
        ['http://169.254.169.254/latest/meta-data/', 'private-or-local-host'],
        ['http://[::ffff:127.0.0.1]/pilates', 'private-or-local-host'],
        ['http://[fe80::1]/pilates', 'private-or-local-host'],
        ['http://[fc00::1]/pilates', 'private-or-local-host'],
        ['http://[fd12:3456:789a::1]/pilates', 'private-or-local-host'],

        // Video downloaders
        ['https://www.y2mate.com/youtube/Y_9c3NFbm1A', 'unauthorized-video-downloader'],
        ['https://en.savefrom.net/1-youtube-video-downloader/', 'unauthorized-video-downloader'],
        ['https://www.ssyoutube.com/watch?v=Y_9c3NFbm1A', 'unauthorized-video-downloader'],
        ['https://ytmp3.cc/en13/', 'unauthorized-video-downloader'],
        ['https://yt1s.com/en', 'unauthorized-video-downloader'],
        ['https://loader.to/en/', 'unauthorized-video-downloader'],
        ['https://cobalt.tools/', 'unauthorized-video-downloader'],

        // Paid TTS APIs
        ['https://api.elevenlabs.io/v1/text-to-speech/voice123', 'paid-voice-api'],
        ['https://texttospeech.googleapis.com/v1/text:synthesize', 'paid-voice-api'],
        ['https://api.openai.com/v1/audio/speech', 'paid-voice-api'],
        ['https://polly.ap-northeast-2.amazonaws.com/v1/speech', 'paid-voice-api'],
        ['https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', 'paid-voice-api'],
        ['https://typecast.ai/api/speak', 'paid-voice-api'],
        ['https://tts.speech.microsoft.com/cognitiveservices/v1', 'paid-voice-api'],

        // Raw media binaries
        ['https://cdn.example.com/media/swan-prep.mp4', 'raw-media-binary'],
        ['https://cdn.example.com/media/swan-prep.webm?token=1', 'raw-media-binary'],
        ['https://cdn.example.com/media/audio.mp3', 'raw-media-binary'],
        ['https://cdn.example.com/media/playlist.m3u8', 'raw-media-binary'],
        ['https://cdn.example.com/download?id=123&format=mp4', 'raw-media-binary'],
        ['https://cdn.example.com/stream?mime=video%2Fmp4', 'raw-media-binary'],
      ];

      for (const [input, expectedCode] of adversarialMatrix) {
        const result = normalizeReferenceUrlPolicy(input);
        expect(result.ok, `Expected ${String(input)} to fail with ${expectedCode}`).toBe(false);
        expect(result.displayMode).toBe('blocked');
        expect(result.provider).toBe('blocked');
        expect(result.rejectionCode).toBe(expectedCode);
        expect(result.embedAllowed).toBe(false);
        expect(result.embedUrl).toBeNull();
        expect(result.localSyntheticFixtureUrl).toBeNull();
        expect(result.canonicalExternalUrl).toBeNull();
      }

      // Unbracketed ::ffff:127.0.0.1 is also strictly blocked
      const unbracketedMapped = normalizeReferenceUrlPolicy('http://::ffff:127.0.0.1/pilates');
      expect(unbracketedMapped.ok).toBe(false);
      expect(unbracketedMapped.displayMode).toBe('blocked');
      expect(unbracketedMapped.embedAllowed).toBe(false);
    });

    it('enforces strict no-autoplay nocookie validation in isStrictNoAutoplayEmbedUrl', () => {
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
        ),
      ).toBe(true);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&start=15&end=60',
        ),
      ).toBe(true);

      // Rejections for strict embed URL validator
      expect(isStrictNoAutoplayEmbedUrl(null)).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'http://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=1',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&autoplay=1',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?autoplay=0',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&start=60&end=30',
        ),
      ).toBe(false);
      expect(
        isStrictNoAutoplayEmbedUrl(
          'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&si=leak',
        ),
      ).toBe(false);
    });
  });

  describe('4. Embed separation & observation-point non-transplanting across all repository catalogs', () => {
    it('strictly separates VERIFIED_REFERENCES websites (including mv-01 with 23s observation point), PUBLIC_REFERENCES (including KDCA cntnts_sn=5293), COURSE_REFERENCES, MOTION_CANDIDATE_RESEARCH (BASI & NHS), and non-video YouTube URLs into external-link-only', () => {
      // 1. mv-01 has a 23s observation point and is a Merrithew website reference
      const mv01 = VERIFIED_REFERENCES.find((r) => r.id === 'mv-01')!;
      expect(mv01).toBeDefined();
      expect(mv01.observationPoints[0]?.seconds).toBe(23);

      const mv01Report = evaluateReferenceLinkCandidates('mv-01-check', mv01.title, [
        {
          candidateId: 'mv-01-cand',
          title: mv01.title,
          publisher: mv01.sourceName,
          url: `${mv01.url}?t=23s&start=23&utm_source=test`,
          tier: 'verified-catalog-reference',
          embedPolicy: 'external-link-only',
          startSec: 23,
          isObservationTimestampOnly: true,
        },
      ]);
      const mv01Item = mv01Report.acceptedItems[0];
      expect(mv01Item.normalized.displayMode).toBe('external-link-only');
      expect(mv01Item.normalized.embedAllowed).toBe(false);
      expect(mv01Item.normalized.embedUrl).toBeNull();
      expect(mv01Item.normalized.localSyntheticFixtureUrl).toBeNull();
      expect(mv01Item.normalized.startSec).toBeNull();
      expect(mv01Item.normalized.canonicalExternalUrl).toBe(mv01.url);
      expect(mv01Item.normalized.canonicalExternalUrl).not.toContain('23');

      // Also verify observation point non-transplanting on a YouTube reference when isObservationTimestampOnly=true
      const ytObsReport = evaluateReferenceLinkCandidates('yt-obs-check', '관찰 시점 시크 변환 금지', [
        {
          candidateId: 'yt-obs-cand',
          title: '관찰 시점 23초가 기록된 YouTube 출처',
          publisher: '위드필라테스',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=23s&start=23',
          tier: 'exact-source-snapshot',
          embedPolicy: 'youtube-nocookie-allowed',
          startSec: 23,
          endSec: 55,
          isObservationTimestampOnly: true,
        },
      ]);
      const ytObsNorm = ytObsReport.acceptedItems[0].normalized;
      expect(ytObsNorm.startSec).toBeNull();
      expect(ytObsNorm.endSec).toBeNull();
      expect(ytObsNorm.canonicalExternalUrl).toBe('https://www.youtube.com/watch?v=Y_9c3NFbm1A');
      expect(ytObsNorm.embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
      );

      // 2. All 21 website items in VERIFIED_REFERENCES -> external-link-only
      const websiteRefs = VERIFIED_REFERENCES.filter((r) => r.provider === 'website');
      expect(websiteRefs).toHaveLength(21);
      for (const ref of websiteRefs) {
        const norm = normalizeReferenceUrlPolicy(ref.url, {
          embedPolicy: 'external-link-only',
          forbidTimeSeekTransplant: true,
        });
        expect(norm.ok).toBe(true);
        expect(norm.displayMode).toBe('external-link-only');
        expect(norm.embedAllowed).toBe(false);
        expect(norm.embedUrl).toBeNull();
      }

      // 3. PUBLIC_REFERENCES (KSPO + KDCA cntnts_sn=5293) -> external-link-only & preserves cntnts_sn=5293
      expect(PUBLIC_REFERENCES).toHaveLength(3);
      for (const pub of PUBLIC_REFERENCES) {
        const norm = normalizeReferenceUrlPolicy(pub.url, {
          embedPolicy: 'external-link-only',
        });
        expect(norm.ok).toBe(true);
        expect(norm.displayMode).toBe('external-link-only');
        expect(norm.embedAllowed).toBe(false);
        expect(norm.embedUrl).toBeNull();
        expect(norm.canonicalExternalUrl).toBe(pub.url);
      }
      expect(PUBLIC_REFERENCES[2].url).toContain('cntnts_sn=5293');

      // 4. COURSE_REFERENCES -> external-link-only even when pointing to YouTube watch URLs
      expect(COURSE_REFERENCES.length).toBeGreaterThan(0);
      for (const course of COURSE_REFERENCES) {
        const courseReport = evaluateReferenceLinkCandidates(course.id, course.title, [
          {
            candidateId: course.id,
            title: course.title,
            publisher: course.publisher,
            url: course.canonicalUrl,
            tier: 'course-reference-link-only',
          },
        ]);
        const evalCourse = courseReport.acceptedItems[0];
        expect(evalCourse.normalized.displayMode).toBe('external-link-only');
        expect(evalCourse.normalized.embedAllowed).toBe(false);
        expect(evalCourse.normalized.embedUrl).toBeNull();
      }

      // 5. MOTION_CANDIDATE_RESEARCH (BASI & NHS) -> external-link-only
      const swanResearch = getMotionCandidateResearch('original-mat-swan-prep');
      const plankResearch = getMotionCandidateResearch('original-mat-forearm-plank');
      expect(swanResearch).toHaveLength(1);
      expect(plankResearch).toHaveLength(1);
      for (const r of [...swanResearch, ...plankResearch]) {
        const norm = normalizeReferenceUrlPolicy(r.source.url, {
          embedPolicy: 'external-link-only',
          forbidTimeSeekTransplant: true,
        });
        expect(norm.ok).toBe(true);
        expect(norm.displayMode).toBe('external-link-only');
        expect(norm.embedAllowed).toBe(false);
        expect(norm.embedUrl).toBeNull();
      }

      // 6. Non-video YouTube URLs (channels, handles, playlists, search results) -> external-link-only
      const nonVideoYoutubeUrls = [
        'https://www.youtube.com/@withpilates?si=123',
        'https://www.youtube.com/channel/UC1234567890abcdef',
        'https://www.youtube.com/c/PilatesAnytime',
        'https://www.youtube.com/user/PilatesChannel',
        'https://www.youtube.com/playlist?list=PL1234567890&si=abc',
        'https://www.youtube.com/results?search_query=swan+prep+pilates&utm_source=x',
      ];
      for (const rawUrl of nonVideoYoutubeUrls) {
        const norm = normalizeReferenceUrlPolicy(rawUrl);
        expect(norm.ok).toBe(true);
        expect(norm.provider).toBe('youtube-non-video');
        expect(norm.displayMode).toBe('external-link-only');
        expect(norm.embedAllowed).toBe(false);
        expect(norm.embedUrl).toBeNull();
        expect(norm.localSyntheticFixtureUrl).toBeNull();
      }
    });
  });

  describe('5. Player display contract, synthetic iframe fixture, native onError, pagehide/visibilitychange, multi-instance IDs, and localStorage immutability', () => {
    it('enforces manual click-to-load, transitions to external-link-only on native <iframe onError>, unloads on document.hidden/pagehide without pageshow auto-resume, preserves unique DOM [id]s across multiple instances, and leaves localStorage untouched', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      const clearSpy = vi.spyOn(Storage.prototype, 'clear');
      const storageSnapshotBefore = JSON.stringify(window.localStorage);

      const report = evaluateReferenceLinkCandidates(
        'player-contract-independent',
        '플레이어 계약 독립 검증',
        [
          {
            candidateId: 'yt-main',
            title: '수동 로드 검증 영상',
            publisher: '위드필라테스',
            url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=45s&end=95',
            tier: 'direct-exercise-youtube',
            region: 'kr',
          },
          {
            candidateId: 'kdca-ext',
            title: PUBLIC_REFERENCES[2].title,
            publisher: PUBLIC_REFERENCES[2].publisher,
            url: PUBLIC_REFERENCES[2].url,
            tier: 'public-education-portal',
            region: 'kr',
          },
        ],
      );

      // Direct controller verification for invalid/false requestLoadEmbed calls
      const directCtrl = createReferencePlayerDisplayController(report);
      expect(directCtrl.requestLoadEmbed({ userClicked: false })).toBe(false);
      expect(
        directCtrl.requestLoadEmbed(null as unknown as { userClicked: boolean }),
      ).toBe(false);
      expect(directCtrl.getSnapshot().iframeMounted).toBe(false);

      // Mount TWO instances simultaneously to verify unique DOM [id] attributes and zero initial iframes
      const { container } = render(
        <div>
          <ReferenceLinkPolicyPreview
            report={report}
            iframeMode="local-synthetic-fixture"
          />
          <ReferenceLinkPolicyPreview
            report={report}
            iframeMode="local-synthetic-fixture"
          />
        </div>,
      );

      const allElementsWithId = Array.from(container.querySelectorAll('[id]'));
      const idValues = allElementsWithId.map((el) => el.id);
      expect(idValues.length).toBeGreaterThanOrEqual(12);
      expect(new Set(idValues).size).toBe(idValues.length);

      // Zero iframes before user click across both instances
      expect(container.querySelectorAll('iframe')).toHaveLength(0);

      const firstPreview = screen.getAllByTestId('reference-link-policy-preview')[0];
      const manualLoadBtn = within(firstPreview).getByTestId('rlpc-manual-load-embed-btn');
      fireEvent.click(manualLoadBtn);

      // Only the first instance mounts the local synthetic iframe fixture
      expect(container.querySelectorAll('iframe')).toHaveLength(1);
      const iframe = within(firstPreview).getByTestId('rlpc-synthetic-iframe');
      expect(iframe.getAttribute('src')).toBe(
        buildLocalSyntheticIframeFixtureUrl('Y_9c3NFbm1A', 45, 95),
      );
      expect(iframe.getAttribute('src')).toContain('autoplay=0');
      expect(iframe.getAttribute('src')).toContain('rel=0');
      expect(iframe.getAttribute('data-autoplay-param')).toBe('0');
      expect(iframe.getAttribute('data-rel-param')).toBe('0');
      expect(iframe.getAttribute('allow')).toBe(
        'encrypted-media; gyroscope; picture-in-picture',
      );
      expect(iframe.getAttribute('allow')).not.toContain('autoplay');

      // Native <iframe onError> unmounts iframe and transitions to external-link-only fallback
      fireEvent.error(iframe);
      expect(container.querySelectorAll('iframe')).toHaveLength(0);
      expect(
        within(firstPreview).getByTestId('rlpc-external-only-fallback-box'),
      ).toBeInTheDocument();
      expect(
        within(firstPreview).getByTestId('rlpc-external-original-link'),
      ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=45s');

      // Reset to idle, manually reload, then test document.hidden (visibilitychange)
      fireEvent.click(within(firstPreview).getByTestId('rlpc-reset-fallback-btn'));
      fireEvent.click(within(firstPreview).getByTestId('rlpc-manual-load-embed-btn'));
      expect(container.querySelectorAll('iframe')).toHaveLength(1);

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      fireEvent(document, new Event('visibilitychange'));
      expect(container.querySelectorAll('iframe')).toHaveLength(0);

      // Restoring document.hidden = false must NOT auto-resume / remount the iframe
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false,
      });
      fireEvent(document, new Event('visibilitychange'));
      expect(container.querySelectorAll('iframe')).toHaveLength(0);

      // Reload manually, then test pagehide -> pageshow must NOT auto-resume
      fireEvent.click(within(firstPreview).getByTestId('rlpc-manual-load-embed-btn'));
      expect(container.querySelectorAll('iframe')).toHaveLength(1);
      fireEvent(window, new Event('pagehide'));
      expect(container.querySelectorAll('iframe')).toHaveLength(0);
      fireEvent(window, new Event('pageshow'));
      expect(container.querySelectorAll('iframe')).toHaveLength(0);

      // Verify localStorage was never written or cleared
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(removeItemSpy).not.toHaveBeenCalled();
      expect(clearSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(window.localStorage)).toBe(storageSnapshotBefore);
    });
  });

  describe('6. Scan truncation (maxScanItems), maxNormalizedItems, and deduplicateByVideoIdRegardlessOfStart', () => {
    it('truncates scanning at maxScanItems, caps accepted output at maxNormalizedItems, and supports deduplicateByVideoIdRegardlessOfStart', () => {
      // Build 12 distinct valid YouTube candidates (11-char IDs)
      const manyCandidates: ReferenceLinkCandidateInput[] = Array.from(
        { length: 12 },
        (_, idx) => {
          const suffix = String(idx).padStart(2, '0');
          return {
            candidateId: `bulk-item-${suffix}`,
            title: `대량 스캔 후보 #${idx + 1}`,
            publisher: '테스트 채널',
            url: `https://www.youtube.com/watch?v=VideoId00${suffix}`,
            tier: 'curated-youtube-pool',
          };
        },
      );

      const truncatedReport = evaluateReferenceLinkCandidates(
        'truncation-test',
        '스캔 한도 검증',
        manyCandidates,
        {
          maxScanItems: 5,
          maxNormalizedItems: 3,
        },
      );

      expect(truncatedReport.scanTruncated).toBe(true);
      expect(truncatedReport.totalScannedCount).toBe(5);
      expect(truncatedReport.acceptedItems).toHaveLength(3);
      expect(truncatedReport.acceptedItems.map((i) => i.itemId)).toEqual([
        'bulk-item-00',
        'bulk-item-01',
        'bulk-item-02',
      ]);

      // Verify deduplicateByVideoIdRegardlessOfStart: false vs true
      const multiTimestampCandidates: ReferenceLinkCandidateInput[] = [
        {
          candidateId: 'clip-at-30s-low-tier',
          title: '30초 구간 참조 (하위 티어)',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=30s',
          tier: 'custom-instructor-input',
        },
        {
          candidateId: 'clip-at-90s-high-tier',
          title: '90초 구간 참조 (상위 티어)',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=90s',
          tier: 'direct-exercise-youtube',
        },
      ];

      const reportSeparateTimestamps = evaluateReferenceLinkCandidates(
        'dedup-by-time',
        '구간별 개별 유지 검증',
        multiTimestampCandidates,
        { deduplicateByVideoIdRegardlessOfStart: false },
      );
      expect(reportSeparateTimestamps.acceptedItems).toHaveLength(2);
      expect(reportSeparateTimestamps.summary.deduplicatedCount).toBe(0);

      const reportMergedByVideoId = evaluateReferenceLinkCandidates(
        'dedup-by-video-id',
        '영상 ID 단위 통합 병합 검증',
        multiTimestampCandidates,
        { deduplicateByVideoIdRegardlessOfStart: true },
      );
      expect(reportMergedByVideoId.acceptedItems).toHaveLength(1);
      expect(reportMergedByVideoId.acceptedItems[0].itemId).toBe('clip-at-90s-high-tier');
      expect(reportMergedByVideoId.acceptedItems[0].mergedDuplicateIds).toEqual([
        'clip-at-30s-low-tier',
      ]);
      expect(reportMergedByVideoId.summary.deduplicatedCount).toBe(1);
      expect(reportMergedByVideoId.deduplicatedDiagnostics[0].deduplicationKey).toBe(
        'youtube::Y_9c3NFbm1A',
      );
    });

    it('verifies all SYNTHETIC_POLICY_FIXTURE_PRESETS and full 98-exercise catalog policy resolution invariants', () => {
      expect(SYNTHETIC_POLICY_FIXTURE_PRESETS).toHaveLength(4);
      for (const preset of SYNTHETIC_POLICY_FIXTURE_PRESETS) {
        const rep = preset.buildReport();
        expect(rep.summary.allAcceptedHaveExternalLink).toBe(true);
        expect(rep.summary.anyAutoplayAllowed).toBe(false);
      }

      const audit = auditExistingPublicUrlSamples();
      expect(audit.exercisesCount).toBe(INITIAL_EXERCISES.length);
      expect(audit.allSamplesPassSchemeCheck).toBe(true);
      expect(audit.allWebsitesAndPortalsSeparatedAsExternalOnly).toBe(true);
      expect(audit.allYoutubeEmbedsEnforceNoAutoplayAndNocookie).toBe(true);
      expect(audit.observationPointsNeverTransplantedAsSeekParams).toBe(true);

      // Parse time helper edge cases
      expect(parseYouTubeTimeParamSeconds(0)).toBe(0);
      expect(parseYouTubeTimeParamSeconds(125.9)).toBe(125);
      expect(parseYouTubeTimeParamSeconds('2h0m0s')).toBe(7200);
      expect(parseYouTubeTimeParamSeconds('invalid')).toBeNull();
    });
  });
});
