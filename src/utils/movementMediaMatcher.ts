import {
  getMotionCandidateResearch,
  type MotionCandidateResearch,
} from '../data/motionCandidateResearch';
import {
  getMotionPatternReferences,
  type MotionPatternReference,
} from '../data/motionPatternReferences';
import { getMovementProvenance } from '../data/movementProvenance';
import { getExpandedMovementSource } from '../data/expandedMovements';
import {
  getExerciseSourcePageReferences,
  getExerciseVideoEvidence,
} from '../data/exerciseVideoBindings';
import { PUBLIC_REFERENCES } from '../data/publicReferences';
import {
  VERIFIED_REFERENCES,
  type ReferenceVerificationStatus,
  type VerifiedPublicReference,
} from '../data/verifiedReferences';
import { sourceReferenceSchema } from '../schemas/cloudBackupSchema';
import {
  createMediaComplianceAudit,
  resolvePermittedEmbed,
  validateSafeExternalReferenceUrl,
} from '../schemas/movementMediaGuidanceSchema';
import { parseYouTubeReference } from '../schemas/pilatesSchema';
import type {
  CrediblePublicMediaSource,
  MediaMatchTier,
  MovementMediaBundle,
  MovementMediaMatch,
  PublicMediaProvider,
  PublicMediaPublisherType,
} from '../types/movementMediaGuidance';
import type { ApparatusType, PilatesExercise } from '../types/pilates';
import { getVideoMatchReasonKo, scoreVideoSemanticMatch } from './videoSemanticMatching';

const MATCH_TIER_LABELS_KO: Readonly<Record<MediaMatchTier, string>> = Object.freeze({
  'exact-source-snapshot': '원본 출처 스냅샷 연결',
  'curated-youtube-reference': '동작 연결 YouTube 참고 구간',
  'clinical-pattern-source': '임상·교육 움직임 패턴 원문',
  'verified-catalog-match': '검증 출처 카탈로그 매칭',
  'public-education-portal': '공공 체육·건강 교육 포털 참고',
});

const VERIFICATION_STATUS_LABELS_KO: Readonly<Record<ReferenceVerificationStatus, string>> =
  Object.freeze({
    'official-source-checked': '공식 출처 본문 확인 · 전문 강사 검수 대기',
    'partial-playback-checked': '공식 페이지 및 부분 프레임 확인 · 전체 검수 대기',
    'korean-candidate': '국내 자격 기관 후보 · 개별 영상 검수 대기',
  });

function inferPublisherTypeFromName(
  publisher: string,
  isCustom?: boolean,
): PublicMediaPublisherType {
  if (isCustom) return 'instructor-curated-reference';
  const normalized = publisher.toLowerCase();
  if (
    normalized.includes('merrithew') ||
    normalized.includes('stott') ||
    normalized.includes('balanced body')
  ) {
    return 'official-federation';
  }
  if (
    normalized.includes('nhs') ||
    normalized.includes('hospital') ||
    normalized.includes('trust')
  ) {
    return 'public-health-nhs';
  }
  if (
    normalized.includes('국민체육진흥공단') ||
    normalized.includes('국민체력100') ||
    normalized.includes('질병관리청') ||
    normalized.includes('국가건강정보포털')
  ) {
    return 'public-institution-kr';
  }
  if (
    normalized.includes('basi') ||
    normalized.includes('polestar') ||
    normalized.includes('body harmonics') ||
    normalized.includes('harvard') ||
    normalized.includes('education')
  ) {
    return 'education-foundation';
  }
  // A channel name alone cannot establish an instructor's credentials.
  return 'instructor-curated-reference';
}

function buildSourceFromVerifiedReference(ref: VerifiedPublicReference): CrediblePublicMediaSource {
  const ytRef = ref.provider === 'youtube' ? parseYouTubeReference(ref.url) : null;
  const isYoutube = ref.provider === 'youtube' && ytRef !== null;
  const provider: PublicMediaProvider = isYoutube ? 'youtube' : 'official-website';
  const embedPolicy = isYoutube ? 'youtube-nocookie-allowed' : 'external-link-only';
  const publisherType: PublicMediaPublisherType =
    ref.region === 'kr' ? 'certified-instructor-channel' : 'official-federation';

  return Object.freeze({
    sourceId: `verified-${ref.id}`,
    titleKo: ref.title,
    originalTitle: ref.originalTitle,
    publisher: ref.sourceName,
    publisherType,
    provider,
    region: ref.region,
    languageLabelKo: ref.language,
    url: ref.url,
    embedPolicy,
    youtubeVideoId: ytRef?.videoId ?? null,
    startSec: null,
    endSec: null,
    observationPoints: Object.freeze(
      ref.observationPoints.map((pt) =>
        Object.freeze({
          seconds: pt.seconds,
          note: pt.note,
        }),
      ),
    ),
    verificationStatusLabelKo: VERIFICATION_STATUS_LABELS_KO[ref.verificationStatus],
    verifiedAt: ref.verifiedAt,
    rightsNoteKo: ref.rightsNote,
    safetyDisclaimerKo:
      ref.safetyNote ??
      '원본 자료는 수업 계획 참고용이며 개인별 적용과 기구 설정은 담당 강사가 직접 확인해야 합니다.',
  });
}

function createMatch(
  exerciseId: string,
  matchSuffix: string,
  matchTier: MediaMatchTier,
  matchReasonKo: string,
  source: CrediblePublicMediaSource,
): MovementMediaMatch {
  const embedResolution = resolvePermittedEmbed(source);
  return Object.freeze({
    matchId: `${exerciseId}::${matchTier}::${matchSuffix}`,
    exerciseId,
    matchTier,
    matchTierLabelKo: MATCH_TIER_LABELS_KO[matchTier],
    matchReasonKo,
    isExactDemonstration: false,
    source,
    embedResolution,
  });
}

function extractTier1ExactSnapshotMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  if (!exercise.sourceReference) return [];
  const parsedSnapshot = sourceReferenceSchema.safeParse(exercise.sourceReference);
  if (!parsedSnapshot.success) return [];

  const snapshot = parsedSnapshot.data;
  const matchedCatalogRef = VERIFIED_REFERENCES.find(
    (ref) =>
      ref.id === snapshot.referenceId ||
      ref.rawItemId === snapshot.rawItemId ||
      ref.url === snapshot.url,
  );

  if (matchedCatalogRef) {
    const source = buildSourceFromVerifiedReference(matchedCatalogRef);
    return [
      createMatch(
        exercise.id,
        matchedCatalogRef.id,
        'exact-source-snapshot',
        `동작에 기록된 원본 출처 스냅샷(${snapshot.referenceId})과 일치하는 검증 카탈로그 항목입니다.`,
        source,
      ),
    ];
  }

  const safeUrl = validateSafeExternalReferenceUrl(snapshot.url);
  if (!safeUrl) return [];

  const ytRef = parseYouTubeReference(safeUrl);
  const isYoutube = ytRef !== null;
  const source: CrediblePublicMediaSource = Object.freeze({
    sourceId: `snapshot-${snapshot.referenceId}`,
    titleKo: snapshot.title,
    originalTitle: snapshot.title,
    publisher: snapshot.publisher,
    publisherType: inferPublisherTypeFromName(snapshot.publisher, exercise.isCustom),
    provider: isYoutube ? 'youtube' : 'official-website',
    region: snapshot.region,
    languageLabelKo: snapshot.region === 'kr' ? '한국어 출처 스냅샷' : '해외 출처 스냅샷',
    url: safeUrl,
    embedPolicy: isYoutube ? 'youtube-nocookie-allowed' : 'external-link-only',
    youtubeVideoId: ytRef?.videoId ?? null,
    startSec: null,
    endSec: null,
    observationPoints: Object.freeze([]),
    verificationStatusLabelKo: VERIFICATION_STATUS_LABELS_KO[snapshot.verificationStatus],
    verifiedAt: snapshot.verifiedAt,
    rightsNoteKo: '원본 링크 전용 스냅샷 기록입니다. 외부 원본 페이지에서 전체 맥락을 확인하세요.',
    safetyDisclaimerKo:
      exercise.precautions ||
      '출처 스냅샷은 동작 적합성 승인이 아니므로 수업 전 강사가 직접 확인해야 합니다.',
  });

  return [
    createMatch(
      exercise.id,
      snapshot.referenceId,
      'exact-source-snapshot',
      `동작에 저장된 원본 출처 스냅샷(${snapshot.referenceId}) 기록입니다.`,
      source,
    ),
  ];
}

function extractTier2CuratedYouTubeMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  const rawUrl = exercise.youtube?.url;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return [];

  const parsedYt = parseYouTubeReference(rawUrl);
  if (!parsedYt || parsedYt.videoId !== exercise.youtube.videoId) return [];

  const startSec =
    typeof exercise.youtube.startSec === 'number' &&
    Number.isFinite(exercise.youtube.startSec) &&
    exercise.youtube.startSec >= 0
      ? Math.floor(exercise.youtube.startSec)
      : 0;

  const endSec =
    typeof exercise.youtube.endSec === 'number' &&
    Number.isFinite(exercise.youtube.endSec) &&
    Math.floor(exercise.youtube.endSec) > startSec
      ? Math.floor(exercise.youtube.endSec)
      : null;

  const externalWatchUrl = `${parsedYt.url}&t=${startSec}s`;
  if (!validateSafeExternalReferenceUrl(externalWatchUrl)) return [];

  const channelName = exercise.youtube.channelName?.trim() || 'YouTube 공개 채널';
  const region: 'kr' | 'global' =
    exercise.youtube.region ?? (/[가-힣]/.test(channelName) ? 'kr' : 'global');
  const provenance = getMovementProvenance(exercise);
  const expandedSource = getExpandedMovementSource(exercise);
  const videoEvidence = getExerciseVideoEvidence(exercise);
  const noteText = exercise.youtube.note?.trim() || `${exercise.nameKo} 수업 참고 구간`;

  const source: CrediblePublicMediaSource = Object.freeze({
    sourceId: `curated-yt-${exercise.id}-${parsedYt.videoId}`,
    titleKo: `${exercise.nameKo} 참고 영상`,
    originalTitle: exercise.youtube.videoTitle?.trim() || exercise.nameEn || exercise.nameKo,
    publisher: channelName,
    publisherType:
      expandedSource || videoEvidence
        ? 'instructor-curated-reference'
        : inferPublisherTypeFromName(channelName, exercise.isCustom),
    provider: 'youtube',
    region,
    languageLabelKo:
      region === 'kr' ? '한국어/국내 채널 참고 영상' : '해외 스튜디오·교육 채널 참고 영상',
    url: externalWatchUrl,
    embedPolicy: 'youtube-nocookie-allowed',
    youtubeVideoId: parsedYt.videoId,
    startSec,
    endSec,
    observationPoints: Object.freeze(
      startSec > 0 ? [Object.freeze({ seconds: startSec, note: noteText })] : [],
    ),
    verificationStatusLabelKo: videoEvidence
      ? `${videoEvidence.metadataStatus === 'creator-page-and-oembed' ? '제작자 원문·YouTube 제목·채널' : '기존 카탈로그 제목·채널'} 대조 · 실제 재생 미검수 · 시작/종료 구간 미검수 · 동일 시범·강사 자격 미검수`
      : expandedSource
        ? '제작자 원문·YouTube 제목·채널 확인 · 영상 전체 재생·모션 프레임·강사 자격 미검수'
        : `${provenance.shortLabel} · ${provenance.label}`,
    verifiedAt: videoEvidence?.metadataCheckedAt ?? expandedSource?.checkedAt ?? null,
    rightsNoteKo:
      '영상의 저작권은 원 채널 권리자에게 있습니다. 공식 YouTube 개인정보 보호 모드(youtube-nocookie) 수동 재생 및 외부 원본 링크만 제공합니다.',
    safetyDisclaimerKo:
      exercise.precautions ||
      '참고 영상의 스프링·기구 설정과 가동범위는 수강생에 맞게 강사가 직접 조정해야 합니다.',
  });

  const intervalLabel =
    endSec !== null
      ? `${startSec}초~${endSec}초, 입력 구간`
      : startSec > 0
        ? `${startSec}초~, 입력 시작점`
        : '영상 시작부터 · 동작 구간 미확인';

  return [
    createMatch(
      exercise.id,
      parsedYt.videoId,
      'curated-youtube-reference',
      `${videoEvidence?.relationshipNoteKo ?? '동작 카드에 등록된 YouTube 참조입니다.'} (${channelName}, ${intervalLabel}) 실제 시범과 구간 일치는 별도 확인이 필요합니다.`,
      source,
    ),
  ];
}

function splitPublisherAndTitle(
  label: string,
  fallbackTitle: string,
): {
  publisher: string;
  title: string;
} {
  const parts = label
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      publisher: parts[0],
      title: parts.slice(1).join(' · '),
    };
  }
  return {
    publisher: label.trim() || '공개 임상·교육 출처',
    title: fallbackTitle,
  };
}

function extractTier3ClinicalPatternMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  const matches: MovementMediaMatch[] = [];
  const patternRefs: readonly MotionPatternReference[] = getMotionPatternReferences(exercise.id);

  for (const patternRef of patternRefs) {
    const rawSources = patternRef.definition.sources;
    const hasExplicitSourceId = rawSources.some(
      (item) => 'sourceId' in item && typeof item.sourceId === 'string' && item.sourceId.length > 0,
    );

    for (const [index, rawSource] of rawSources.entries()) {
      const sourceIdValue =
        'sourceId' in rawSource && typeof rawSource.sourceId === 'string'
          ? rawSource.sourceId
          : null;
      if (hasExplicitSourceId && !sourceIdValue) {
        continue;
      }

      const safeUrl = validateSafeExternalReferenceUrl(rawSource.url);
      if (!safeUrl) continue;

      const { publisher, title } = splitPublisherAndTitle(rawSource.label, patternRef.title);
      const isPdf = safeUrl.toLowerCase().endsWith('.pdf');
      const provider: PublicMediaProvider = isPdf ? 'clinical-pdf' : 'official-website';
      const publisherType = inferPublisherTypeFromName(publisher, false);
      const checkedAt =
        'sourceFactsCheckedAt' in patternRef.definition &&
        typeof patternRef.definition.sourceFactsCheckedAt === 'string'
          ? patternRef.definition.sourceFactsCheckedAt.slice(0, 10)
          : null;

      const source: CrediblePublicMediaSource = Object.freeze({
        sourceId: `pattern-${patternRef.variantId}-${sourceIdValue ?? index}`,
        titleKo: `${patternRef.title} · ${title}`,
        originalTitle: title,
        publisher,
        publisherType,
        provider,
        region: 'global',
        languageLabelKo: isPdf
          ? '영문 임상·환자 안내 리플릿(PDF) · 원문 사실 확인'
          : '영문 공식 교육·임상 본문 · 원문 사실 확인',
        url: safeUrl,
        embedPolicy: 'external-link-only',
        youtubeVideoId: null,
        startSec: null,
        endSec: null,
        observationPoints: Object.freeze([]),
        verificationStatusLabelKo: '공개 본문 사실 대조 완료 · 정확한 정식 시범 자산 아님',
        verifiedAt: checkedAt,
        rightsNoteKo:
          '원문 링크 전용 참조(외부 임베드 비허용). 원문 이미지·영상을 복제하지 않으며 새 창에서 원본 문서를 확인합니다.',
        safetyDisclaimerKo:
          rawSource.context ??
          patternRef.context ??
          '임상·교육 참고 문서이며 일반 성인 수업 적합성이나 개인별 처방을 보증하지 않습니다.',
      });

      matches.push(
        createMatch(
          exercise.id,
          `${patternRef.variantId}-${sourceIdValue ?? index}`,
          'clinical-pattern-source',
          `연결된 움직임 패턴 도해(${patternRef.title})의 원문 출처(${publisher})입니다.`,
          source,
        ),
      );
    }
  }

  const researchCandidates: readonly MotionCandidateResearch[] = getMotionCandidateResearch(
    exercise.id,
  );
  for (const candidate of researchCandidates) {
    const safeUrl = validateSafeExternalReferenceUrl(candidate.source.url);
    if (!safeUrl) continue;

    const isPdf = safeUrl.toLowerCase().endsWith('.pdf');
    const provider: PublicMediaProvider = isPdf ? 'clinical-pdf' : 'official-website';
    const publisherType = inferPublisherTypeFromName(candidate.source.publisher, false);

    const source: CrediblePublicMediaSource = Object.freeze({
      sourceId: `research-${candidate.candidateId}-${candidate.source.sourceId}`,
      titleKo: `${candidate.labelKo} (${candidate.source.title})`,
      originalTitle: candidate.source.title,
      publisher: candidate.source.publisher,
      publisherType,
      provider,
      region: 'global',
      languageLabelKo: '영문 임상·교육 본문 사실 조사 기록',
      url: safeUrl,
      embedPolicy: 'external-link-only',
      youtubeVideoId: null,
      startSec: null,
      endSec: null,
      observationPoints: Object.freeze([]),
      verificationStatusLabelKo: candidate.statusLabelKo,
      verifiedAt: candidate.source.checkedAtUtc.slice(0, 10),
      rightsNoteKo: candidate.source.rights.labelKo,
      safetyDisclaimerKo: `${candidate.source.population.contextLabelKo} · ${candidate.source.attributionNoteKo}`,
    });

    matches.push(
      createMatch(
        exercise.id,
        candidate.candidateId,
        'clinical-pattern-source',
        `동작 후보 본문 사실 조사(${candidate.labelKo})에 연결된 공개 출처입니다.`,
        source,
      ),
    );
  }

  return matches;
}

function extractSourcePageMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  return getExerciseSourcePageReferences(exercise).flatMap((reference, index) => {
    const safeUrl = validateSafeExternalReferenceUrl(reference.url);
    if (!safeUrl) return [];
    const source: CrediblePublicMediaSource = Object.freeze({
      sourceId: `source-page-${exercise.id}-${index}`,
      titleKo:
        reference.relation === 'transition-reference'
          ? `${exercise.nameKo} · 동작 연결 단계 원문`
          : `${exercise.nameKo} · 제작자 설명 원문`,
      originalTitle: reference.title,
      publisher: reference.publisher,
      publisherType: 'instructor-curated-reference',
      provider: 'official-website',
      region: 'global',
      languageLabelKo: '영문 원문 본문 확인 · 영상 재생 미검수',
      url: safeUrl,
      embedPolicy: 'external-link-only',
      youtubeVideoId: null,
      startSec: null,
      endSec: null,
      observationPoints: Object.freeze([]),
      verificationStatusLabelKo:
        '동작 설명 원문 본문 확인 · 실제 영상 재생·정확한 동작 구간 미검수',
      verifiedAt: reference.checkedAt,
      rightsNoteKo:
        '제작자 원문 링크만 제공합니다. 영상 ID를 추정하거나 외부 자료를 복제하지 않습니다.',
      safetyDisclaimerKo:
        '원문의 설명은 계획을 검토하는 참고 자료입니다. 준비 변형·기구 설정과 개인별 적용은 강사가 확인해야 합니다.',
    });
    return [
      createMatch(
        exercise.id,
        source.sourceId,
        'clinical-pattern-source',
        reference.relation === 'transition-reference'
          ? '앞 동작의 복귀 자세에서 다음 동작의 준비 자세로 이어지는 연결 설명을 확인할 원문입니다. 영상 구간은 미확인입니다.'
          : '이름이 대응하는 원문 설명입니다. 앱의 변형과 동일한 영상 시범으로 검수하지 않았습니다.',
        source,
      ),
    ];
  });
}

function extractTier4VerifiedCatalogMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  const compatible = VERIFIED_REFERENCES.map((ref) => {
    const apparatus = ref.requiredEquipment
      .map((equipment) => (equipment === 'ladder-barrel' ? 'barrel' : equipment))
      .filter((equipment): equipment is ApparatusType =>
        ['mat', 'reformer', 'cadillac', 'chair', 'barrel'].includes(equipment),
      );
    return {
      ref,
      score: scoreVideoSemanticMatch(exercise, {
        title: `${ref.originalTitle} ${ref.title}`,
        apparatus,
        props: ref.requiredProps,
      }),
    };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.ref.id.localeCompare(b.ref.id));

  // No quota padding: body area, generic equipment and class block cannot
  // establish a movement match in this additional recommendation path either.
  return (['youtube', 'website'] as const).flatMap((provider) => {
    const selected = compatible.find((entry) => entry.ref.provider === provider);
    if (!selected) return [];
    return [
      createMatch(
        exercise.id,
        selected.ref.id,
        'verified-catalog-match',
        `${getVideoMatchReasonKo(exercise)} (${selected.ref.title})`,
        buildSourceFromVerifiedReference(selected.ref),
      ),
    ];
  });
}

function extractTier5PublicPortalMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  const isFlexibilityOrWarmup =
    exercise.blockCategory === 'warmup' ||
    exercise.blockCategory === 'cooldown' ||
    exercise.blockCategory === 'extension' ||
    exercise.blockCategory === 'feet-in-straps';

  const preferredIndex = isFlexibilityOrWarmup ? 1 : 0;
  const pubRef = PUBLIC_REFERENCES[preferredIndex] ?? PUBLIC_REFERENCES[0];
  if (!pubRef) return [];

  const safeUrl = validateSafeExternalReferenceUrl(pubRef.url);
  if (!safeUrl) return [];

  const source: CrediblePublicMediaSource = Object.freeze({
    sourceId: `public-portal-${preferredIndex}`,
    titleKo: pubRef.title,
    originalTitle: pubRef.title,
    publisher: pubRef.publisher,
    publisherType: 'public-institution-kr',
    provider: 'public-portal',
    region: 'kr',
    languageLabelKo: '한국어 공공기관 교육 자료',
    url: safeUrl,
    embedPolicy: 'external-link-only',
    youtubeVideoId: null,
    startSec: null,
    endSec: null,
    observationPoints: Object.freeze([]),
    verificationStatusLabelKo: '국내 공공기관 원문 링크 확인 · 개별 동작 시범 아님',
    verifiedAt: '2026-11-04',
    rightsNoteKo: pubRef.rights,
    safetyDisclaimerKo: pubRef.scope,
  });

  return [
    createMatch(
      exercise.id,
      `portal-${preferredIndex}`,
      'public-education-portal',
      `국내 공공기관(${pubRef.publisher}) 운동 분류 및 기초 안전 교육 참고 링크입니다.`,
      source,
    ),
  ];
}

export function getMatchedPublicSourcesForExercise(
  exercise: PilatesExercise,
): readonly MovementMediaMatch[] {
  const candidates: MovementMediaMatch[] = [
    ...extractTier1ExactSnapshotMatches(exercise),
    ...extractTier2CuratedYouTubeMatches(exercise),
    ...extractSourcePageMatches(exercise),
    ...extractTier3ClinicalPatternMatches(exercise),
    ...extractTier4VerifiedCatalogMatches(exercise),
    ...extractTier5PublicPortalMatches(exercise),
  ];

  const seenKeys = new Set<string>();
  const deduplicated: MovementMediaMatch[] = [];

  for (const match of candidates) {
    if (!match.embedResolution.externalOriginalUrl) {
      continue;
    }
    const dedupKey = `${match.source.url.trim()}::${match.source.startSec ?? -1}`;
    if (seenKeys.has(dedupKey)) {
      continue;
    }
    seenKeys.add(dedupKey);
    deduplicated.push(match);
  }

  return Object.freeze(deduplicated);
}

export function resolveMovementMediaBundle(exercise: PilatesExercise): MovementMediaBundle {
  const matches = getMatchedPublicSourcesForExercise(exercise);
  const firstMatch = matches[0];
  if (!firstMatch) {
    throw new Error(`No credible public media matches resolved for exercise: ${exercise.id}`);
  }

  const primaryMatch =
    firstMatch.matchTier === 'exact-source-snapshot'
      ? firstMatch
      : (matches.find((m) => m.embedResolution.allowed) ?? firstMatch);

  return Object.freeze({
    exerciseId: exercise.id,
    exerciseNameKo: exercise.nameKo,
    exerciseNameEn: exercise.nameEn,
    primaryMatch,
    matches,
    compliance: createMediaComplianceAudit(),
  });
}

export interface EmbedFailureFallbackResolution {
  readonly state: 'embed-blocked' | 'playback-failed';
  readonly embedUrl: null;
  readonly externalOriginalUrl: string;
  readonly externalLinkLabelKo: string;
  readonly noticeKo: string;
}

export function resolveEmbedFailureFallback(
  match: MovementMediaMatch,
  failureKind: 'embed-blocked' | 'playback-failed' = 'embed-blocked',
): EmbedFailureFallbackResolution {
  const safeFromResolution = validateSafeExternalReferenceUrl(
    match.embedResolution?.externalOriginalUrl,
  );
  const safeFromSource = validateSafeExternalReferenceUrl(match.source?.url);
  const safeFromYoutubeId =
    typeof match.source?.youtubeVideoId === 'string' &&
    /^[A-Za-z0-9_-]{11}$/.test(match.source.youtubeVideoId.trim())
      ? `https://www.youtube.com/watch?v=${match.source.youtubeVideoId.trim()}`
      : null;

  const externalOriginalUrl =
    safeFromResolution ?? safeFromSource ?? safeFromYoutubeId ?? PUBLIC_REFERENCES[0].url;

  const externalLinkLabelKo =
    match.embedResolution?.externalLinkLabelKo ||
    (match.source?.provider === 'youtube' ? 'YouTube 외부 원본 보기' : '외부 원본 보기');

  const noticeKo =
    failureKind === 'playback-failed'
      ? '임베드 플레이어 재생 중 오류가 발생했습니다. 아래 외부 원본 보기 링크를 눌러 새 창에서 원본 영상을 직접 확인해 주세요.'
      : '원본 채널 설정 또는 출처 정책에 의해 앱 내 임베드 재생이 제한되었습니다. 아래 외부 원본 보기 링크를 통해 공식 페이지에서 확인해 주세요.';

  return Object.freeze({
    state: failureKind,
    embedUrl: null,
    externalOriginalUrl,
    externalLinkLabelKo,
    noticeKo,
  });
}
