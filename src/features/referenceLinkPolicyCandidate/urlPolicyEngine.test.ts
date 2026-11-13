import { describe, expect, it } from 'vitest';
import {
  auditExistingPublicUrlSamples,
  evaluateReferenceLinkCandidates,
  isStrictNoAutoplayEmbedUrl,
  normalizeReferenceUrlPolicy,
  parseYouTubeTimeParamSeconds,
  resolveExerciseReferenceLinkPolicyReport,
} from './index';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { VERIFIED_YOUTUBE_VIDEO_POOL } from '../../data/exerciseYouTubeCatalog';
import { PUBLIC_REFERENCES } from '../../data/publicReferences';
import { VERIFIED_REFERENCES } from '../../data/verifiedReferences';

describe('urlPolicyEngine — URL normalization, deduplication, malicious scheme, embed separation & privacy query stripping', () => {
  it('normalizes YouTube watch, short, mobile, music, shorts, live, and nocookie URLs to canonical watch & nocookie embed URLs', () => {
    const rawVariants = [
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
      'https://youtube.com/watch?v=Y_9c3NFbm1A',
      'https://m.youtube.com/watch?v=Y_9c3NFbm1A',
      'https://music.youtube.com/watch?v=Y_9c3NFbm1A',
      'https://youtu.be/Y_9c3NFbm1A',
      'https://www.youtu.be/Y_9c3NFbm1A/',
      'https://www.youtube.com/shorts/Y_9c3NFbm1A',
      'https://www.youtube.com/embed/Y_9c3NFbm1A',
      'https://www.youtube.com/live/Y_9c3NFbm1A',
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
    ];

    for (const raw of rawVariants) {
      const res = normalizeReferenceUrlPolicy(raw);
      expect(res.ok).toBe(true);
      expect(res.displayMode).toBe('embed-with-external-link');
      expect(res.provider).toBe('youtube-video');
      expect(res.youtubeVideoId).toBe('Y_9c3NFbm1A');
      expect(res.canonicalExternalUrl).toBe('https://www.youtube.com/watch?v=Y_9c3NFbm1A');
      expect(res.embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
      );
      expect(res.localSyntheticFixtureUrl).toBe(
        '/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html?videoId=Y_9c3NFbm1A&rel=0&autoplay=0',
      );
      expect(res.deduplicationKey).toBe('youtube::Y_9c3NFbm1A::0::');
      expect(res.embedAllowed).toBe(true);
      expect(res.autoplayPrevented).toBe(true);
      expect(res.requiresExplicitUserClick).toBe(true);
      expect(res.externalLinkAlwaysProvided).toBe(true);
      expect(isStrictNoAutoplayEmbedUrl(res.embedUrl)).toBe(true);
    }
  });

  it('parses valid start and end time parameters and forbids observation-point seek transplanting', () => {
    expect(parseYouTubeTimeParamSeconds('1m30s')).toBe(90);
    expect(parseYouTubeTimeParamSeconds('1h2m5s')).toBe(3725);
    expect(parseYouTubeTimeParamSeconds('45')).toBe(45);
    expect(parseYouTubeTimeParamSeconds('-10')).toBeNull();
    expect(parseYouTubeTimeParamSeconds('999999')).toBeNull();

    const withTime = normalizeReferenceUrlPolicy(
      'https://youtu.be/Y_9c3NFbm1A?t=1m15s&end=120',
    );
    expect(withTime.startSec).toBe(75);
    expect(withTime.endSec).toBe(120);
    expect(withTime.canonicalExternalUrl).toBe(
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=75s',
    );
    expect(withTime.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0&start=75&end=120',
    );

    // When forbidTimeSeekTransplant is true, time params are stripped and never transplanted
    const observationOnly = normalizeReferenceUrlPolicy(
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A&t=23s&start=23',
      { forbidTimeSeekTransplant: true },
    );
    expect(observationOnly.startSec).toBeNull();
    expect(observationOnly.canonicalExternalUrl).toBe(
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
    );
    expect(observationOnly.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
    );
  });

  it('strips tracking, share/session, PII keys, PII values, and autoplay=1 overrides while redacting raw values', () => {
    const dirtyUrl =
      'https://www.youtube.com/watch?v=Y_9c3NFbm1A&si=secretShareToken99&utm_source=newsletter&fbclid=IwAR123&email=student@private.example.com&phone=010-1234-5678&access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.sig123&custom_note=contact@leaked.example.org&autoplay=1';

    const res = normalizeReferenceUrlPolicy(dirtyUrl);
    expect(res.ok).toBe(true);
    expect(res.canonicalExternalUrl).toBe('https://www.youtube.com/watch?v=Y_9c3NFbm1A');
    expect(res.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/Y_9c3NFbm1A?rel=0&autoplay=0',
    );
    expect(res.hadAutoplayOverrideAttempt).toBe(true);
    expect(res.strippedQueryKeys).toEqual(
      expect.arrayContaining([
        'si',
        'utm_source',
        'fbclid',
        'email',
        'phone',
        'access_token',
        'custom_note',
        'autoplay',
      ]),
    );

    // Ensure no raw PII values leak anywhere in the serialized result
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('student@private.example.com');
    expect(serialized).not.toContain('010-1234-5678');
    expect(serialized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(serialized).not.toContain('contact@leaked.example.org');
    expect(serialized).not.toContain('secretShareToken99');
  });

  it('preserves functional query params (like cntnts_sn=5293 on health.kdca.go.kr) while stripping tracking/PII queries on external websites', () => {
    const kdcaDirty =
      'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5293&utm_medium=social&user_email=test@kdca.example.kr&sessionid=xyz987';
    const res = normalizeReferenceUrlPolicy(kdcaDirty);
    expect(res.ok).toBe(true);
    expect(res.displayMode).toBe('external-link-only');
    expect(res.embedAllowed).toBe(false);
    expect(res.embedUrl).toBeNull();
    expect(res.canonicalExternalUrl).toBe(PUBLIC_REFERENCES[2].url);
    expect(res.strippedQueryKeys).toEqual(['utm_medium', 'user_email', 'sessionid']);
  });

  it('blocks malicious schemes, encoded schemes, credentials, non-standard ports, private/local hosts, downloaders, paid TTS, and raw media binaries', () => {
    const cases: Array<[unknown, string]> = [
      [null, 'invalid-input-type'],
      ['   ', 'empty-url'],
      ['https://example.com/' + 'a'.repeat(2100), 'max-length-exceeded'],
      ['https://example.com/watch\u0000?v=1', 'control-characters'],
      ['https://example.com/\u202Eevil', 'control-characters'],
      ['javascript:alert(1)', 'malicious-scheme'],
      ['&#106;avascript:alert(1)', 'malicious-scheme'],
      ['java%09script:alert(1)', 'malicious-scheme'],
      ['data:text/html,<script>alert(1)</script>', 'malicious-scheme'],
      ['vbscript:msgbox(1)', 'malicious-scheme'],
      ['file:///etc/passwd', 'malicious-scheme'],
      ['blob:https://example.com/1234', 'malicious-scheme'],
      ['//www.youtube.com/watch?v=Y_9c3NFbm1A', 'protocol-relative-or-relative'],
      ['/local/path/video', 'protocol-relative-or-relative'],
      ['https://user:pass@www.youtube.com/watch?v=Y_9c3NFbm1A', 'embedded-credentials'],
      ['https://www.youtube.com:8443/watch?v=Y_9c3NFbm1A', 'disallowed-port'],
      ['https://www.youtube.com:443/watch?v=Y_9c3NFbm1A', 'disallowed-port'],
      ['http://localhost/pilates', 'private-or-local-host'],
      ['http://127.0.0.1/pilates', 'private-or-local-host'],
      ['http://192.168.1.1/pilates', 'private-or-local-host'],
      ['http://10.0.0.1/pilates', 'private-or-local-host'],
      ['http://172.20.0.1/pilates', 'private-or-local-host'],
      ['http://169.254.169.254/latest/meta-data', 'private-or-local-host'],
      ['http://[::1]/pilates', 'private-or-local-host'],
      ['https://y2mate.com/youtube/Y_9c3NFbm1A', 'unauthorized-video-downloader'],
      ['https://api.elevenlabs.io/v1/text-to-speech', 'paid-voice-api'],
      ['https://cdn.example.com/pilates/swan.mp4', 'raw-media-binary'],
      ['https://cdn.example.com/stream?format=webm', 'raw-media-binary'],
      ['https://www.youtube.com/watch?v=short', 'invalid-youtube-target'],
      ['https://www.youtube.com/embed/bad_id', 'invalid-youtube-target'],
    ];

    for (const [input, expectedCode] of cases) {
      const res = normalizeReferenceUrlPolicy(input);
      expect(res.ok, `Expected ${String(input)} to be rejected`).toBe(false);
      expect(res.displayMode).toBe('blocked');
      expect(res.rejectionCode).toBe(expectedCode);
      expect(res.embedAllowed).toBe(false);
      expect(res.embedUrl).toBeNull();
      expect(res.canonicalExternalUrl).toBeNull();
    }
  });

  it('separates unsupported embeds (websites, portals, YouTube channels/playlists, link-only courses) into external-link-only', () => {
    const merrithew = normalizeReferenceUrlPolicy(VERIFIED_REFERENCES[0].url);
    expect(merrithew.ok).toBe(true);
    expect(merrithew.displayMode).toBe('external-link-only');
    expect(merrithew.embedAllowed).toBe(false);
    expect(merrithew.embedUrl).toBeNull();
    expect(merrithew.canonicalExternalUrl).toBe(VERIFIED_REFERENCES[0].url);

    const ytChannel = normalizeReferenceUrlPolicy(
      'https://www.youtube.com/@withpilates?si=tracking123',
    );
    expect(ytChannel.ok).toBe(true);
    expect(ytChannel.provider).toBe('youtube-non-video');
    expect(ytChannel.displayMode).toBe('external-link-only');
    expect(ytChannel.embedAllowed).toBe(false);
    expect(ytChannel.embedUrl).toBeNull();
    expect(ytChannel.canonicalExternalUrl).toBe('https://www.youtube.com/@withpilates');
    expect(ytChannel.strippedQueryKeys).toContain('si');

    const ytCustomSlug = normalizeReferenceUrlPolicy(
      'https://www.youtube.com/jessicavalantpilates',
    );
    expect(ytCustomSlug.ok).toBe(true);
    expect(ytCustomSlug.provider).toBe('youtube-non-video');
    expect(ytCustomSlug.displayMode).toBe('external-link-only');
    expect(ytCustomSlug.embedAllowed).toBe(false);
  });

  it('deduplicates equivalent YouTube and external web links while preserving highest source tier priority', () => {
    const report = evaluateReferenceLinkCandidates(
      'dedup-test',
      '중복 제거 테스트',
      [
        {
          candidateId: 'low-tier-short',
          title: '하위 티어 단축 링크',
          url: 'https://youtu.be/Y_9c3NFbm1A?si=111',
          tier: 'custom-instructor-input',
        },
        {
          candidateId: 'high-tier-watch',
          title: '상위 티어 공식 링크',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A&utm_source=test',
          tier: 'verified-catalog-reference',
        },
        {
          candidateId: 'web-slash',
          title: '웹사이트 슬래시 포함',
          url: 'https://www.withpilates.com/?utm_campaign=a',
          tier: 'verified-catalog-reference',
        },
        {
          candidateId: 'web-no-slash',
          title: '웹사이트 슬래시 미포함',
          url: 'https://WWW.WITHPILATES.COM',
          tier: 'custom-instructor-input',
        },
      ],
    );

    expect(report.summary.acceptedCount).toBe(2);
    expect(report.summary.deduplicatedCount).toBe(2);
    expect(report.acceptedItems[0].itemId).toBe('high-tier-watch');
    expect(report.acceptedItems[0].mergedDuplicateIds).toEqual(['low-tier-short']);
    expect(report.acceptedItems[1].itemId).toBe('web-slash');
    expect(report.acceptedItems[1].mergedDuplicateIds).toEqual(['web-no-slash']);
  });

  it('audits all existing in-repo public URL samples in read-only memory without network calls or mutations', () => {
    const audit = auditExistingPublicUrlSamples();
    expect(audit.auditedInMemoryOnly).toBe(true);
    expect(audit.networkRequestsMade).toBe(0);
    expect(audit.videosDownloaded).toBe(0);
    expect(audit.accessBlocksBypassed).toBe(0);
    expect(audit.exercisesCount).toBe(INITIAL_EXERCISES.length);
    expect(audit.verifiedReferencesCount).toBe(30);
    expect(audit.verifiedWebsiteOnlyCount).toBe(21);
    expect(audit.verifiedYoutubeCandidateCount).toBe(9);
    expect(audit.publicPortalReferencesCount).toBe(3);
    expect(audit.curatedYoutubePoolCount).toBe(VERIFIED_YOUTUBE_VIDEO_POOL.length);
    expect(audit.motionCandidateResearchCount).toBe(2);
    expect(audit.allSamplesPassSchemeCheck).toBe(true);
    expect(audit.allWebsitesAndPortalsSeparatedAsExternalOnly).toBe(true);
    expect(audit.allYoutubeEmbedsEnforceNoAutoplayAndNocookie).toBe(true);
    expect(audit.observationPointsNeverTransplantedAsSeekParams).toBe(true);

    // Verify exercise policy resolution on an existing exercise with motion candidate research
    const swan = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-swan-prep')!;
    const swanReport = resolveExerciseReferenceLinkPolicyReport(swan);
    expect(swanReport.summary.allAcceptedHaveExternalLink).toBe(true);
    expect(swanReport.summary.anyAutoplayAllowed).toBe(false);
    expect(
      swanReport.externalLinkOnlyItems.some((item) =>
        item.normalized.canonicalExternalUrl?.includes('basipilates.com'),
      ),
    ).toBe(true);
  });
});
