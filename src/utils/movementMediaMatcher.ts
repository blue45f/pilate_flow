import {
  getMotionCandidateResearch,
  type MotionCandidateResearch,
} from '../data/motionCandidateResearch';
import {
  getMotionPatternReferences,
  type MotionPatternReference,
} from '../data/motionPatternReferences';
import { getMovementProvenance } from '../data/movementProvenance';
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
import type { PilatesExercise } from '../types/pilates';

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
  return 'certified-instructor-channel';
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
  if (!parsedYt) return [];

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
  const noteText = exercise.youtube.note?.trim() || `${exercise.nameKo} 수업 참고 구간`;

  const source: CrediblePublicMediaSource = Object.freeze({
    sourceId: `curated-yt-${exercise.id}-${parsedYt.videoId}`,
    titleKo: `${exercise.nameKo} 참고 영상`,
    originalTitle: exercise.youtube.videoTitle?.trim() || exercise.nameEn || exercise.nameKo,
    publisher: channelName,
    publisherType: inferPublisherTypeFromName(channelName, exercise.isCustom),
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
    verificationStatusLabelKo: `${provenance.shortLabel} · ${provenance.label}`,
    verifiedAt: null,
    rightsNoteKo:
      '영상의 저작권은 원 채널 권리자에게 있습니다. 공식 YouTube 개인정보 보호 모드(youtube-nocookie) 수동 재생 및 외부 원본 링크만 제공합니다.',
    safetyDisclaimerKo:
      exercise.precautions ||
      '참고 영상의 스프링·기구 설정과 가동범위는 수강생에 맞게 강사가 직접 조정해야 합니다.',
  });

  const intervalLabel =
    endSec !== null ? `${startSec}초~${endSec}초` : startSec > 0 ? `${startSec}초~` : '전체 구간';

  return [
    createMatch(
      exercise.id,
      parsedYt.videoId,
      'curated-youtube-reference',
      `동작 카드에 등록된 YouTube 참고 구간(${channelName}, ${intervalLabel})입니다.`,
      source,
    ),
  ];
}

function splitPublisherAndTitle(label: string, fallbackTitle: string): {
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

interface ScoredVerifiedReference {
  readonly ref: VerifiedPublicReference;
  readonly score: number;
  readonly reasons: readonly string[];
}

function getExerciseSearchText(exercise: PilatesExercise): string {
  return [
    exercise.id,
    exercise.nameKo,
    exercise.nameEn,
    exercise.movementFamily ?? '',
    ...exercise.targetMuscles,
    ...exercise.cues,
  ]
    .join(' ')
    .toLowerCase();
}

function scoreWebsiteVerifiedReference(
  exercise: PilatesExercise,
  ref: VerifiedPublicReference,
  searchText: string,
): ScoredVerifiedReference {
  let score = 0;
  const reasons: string[] = [];

  const normalizedEquipment = ref.requiredEquipment.map((eq) =>
    eq === 'ladder-barrel' ? 'barrel' : eq,
  );
  if (normalizedEquipment.includes(exercise.apparatus)) {
    score += 35;
    reasons.push(`기구(${exercise.apparatus}) 일치`);
  } else if (ref.requiredEquipment.length === 0 && exercise.apparatus === 'mat') {
    score += 12;
  }

  const matchingProps = ref.requiredProps.filter(
    (prop) => prop !== 'none' && exercise.props.includes(prop),
  );
  if (matchingProps.length > 0) {
    score += 45;
    reasons.push(`소도구(${matchingProps.join(', ')}) 일치`);
  }

  // Specific movement family / keyword alignments
  if (
    ref.id === 'mv-01' &&
    (exercise.apparatus === 'chair' || exercise.blockCategory === 'footwork')
  ) {
    score += exercise.apparatus === 'chair' && exercise.blockCategory === 'footwork' ? 50 : 20;
    reasons.push('체어·풋워크 정렬 패턴 관련');
  }
  if (
    ref.id === 'mv-02' &&
    (exercise.spinalPlanes.includes('lateral') ||
      /side|옆|측굴|머메이드|mermaid|lean/i.test(searchText))
  ) {
    score += 30;
    reasons.push('측굴(Side Lean/Bend) 움직임 관련');
  }
  if (
    ref.id === 'mv-03' &&
    (exercise.blockCategory === 'bridging' ||
      /bridge|브릿지|브리지|hip extension|힙 익스텐션|둔근|pelvic/i.test(searchText))
  ) {
    score += 38;
    reasons.push('브릿징·고관절 신전 패턴 관련');
  }
  if (
    ref.id === 'mv-04' &&
    (exercise.apparatus === 'barrel' ||
      exercise.blockCategory === 'extension' ||
      /swan|스완|신전|barrel|바렐/i.test(searchText))
  ) {
    score += exercise.apparatus === 'barrel' ? 42 : 28;
    reasons.push('바렐·척추 신전(Swan) 패턴 관련');
  }
  if (
    ref.id === 'mv-05' &&
    (exercise.spinalPlanes.includes('lateral') ||
      exercise.props.includes('theraband') ||
      exercise.props.includes('long-band') ||
      /side bend|사이드 벤드|사이드 밴드|측굴|mermaid|머메이드/i.test(searchText))
  ) {
    score += 32;
    reasons.push('밴드·측굴 및 몸통 안정화 관련');
  }
  if (
    ref.id === 'sr-01' &&
    exercise.apparatus === 'reformer' &&
    (exercise.blockCategory === 'warmup' ||
      exercise.blockCategory === 'upper-body' ||
      exercise.props.includes('magic-circle'))
  ) {
    score += 34;
    reasons.push('리포머 상지·몸통 준비운동 시리즈 관련');
  }
  if (
    ref.id === 'mv-06' &&
    exercise.apparatus === 'reformer' &&
    (exercise.blockCategory === 'footwork' || exercise.blockCategory === 'lower-body')
  ) {
    score += 24;
    reasons.push('리포머 하지·외전근 조절 관련');
  }
  if (
    ref.id === 'mv-07' &&
    (exercise.blockCategory === 'upper-body' ||
      /arm|row|pull|로잉|상체|광배근|어깨|chest expansion|press/i.test(searchText))
  ) {
    score += 34;
    reasons.push('상지 견인·광배근·어깨 안정화 관련');
  }
  if (
    ref.id === 'mv-08' &&
    (exercise.bodyPosition === 'quadruped' ||
      exercise.blockCategory === 'plank' ||
      /quadruped|네발기기|arm reach|leg slide/i.test(searchText))
  ) {
    score += 38;
    reasons.push('네발기기(Quadruped) 몸통·상하지 협응 관련');
  }
  if (
    ref.id === 'mv-09' &&
    (exercise.bodyPosition === 'side-lying' ||
      /side-lying|사이드|옆으로 누운|clam|클램|side kick/i.test(searchText))
  ) {
    score += 40;
    reasons.push('옆으로 누운 자세(Side-Lying) 고관절 패턴 관련');
  }
  if (
    ref.id === 'mv-10' &&
    (exercise.bodyPosition === 'kneeling' ||
      exercise.blockCategory === 'lower-body' ||
      /kneeling|닐링|무릎|sidekick|사이드킥/i.test(searchText))
  ) {
    score += 32;
    reasons.push('무릎 선 자세(Kneeling) 고관절·몸통 제어 관련');
  }
  if (
    ref.id === 'mv-11' &&
    (exercise.apparatus === 'cadillac' ||
      (exercise.bodyPosition === 'kneeling' && /thigh|타이|힌지|hinge|cadillac/i.test(searchText)))
  ) {
    score += 36;
    reasons.push('캐딜락 롤다운바·무릎서기 힌지 제어 관련');
  }
  if (
    ref.id === 'mv-12' &&
    (exercise.apparatus === 'cadillac' || exercise.blockCategory === 'extension')
  ) {
    score += 34;
    reasons.push('캐딜락 흉추 신전·후면 사슬 조절 관련');
  }
  if (
    ref.id === 'mv-13' &&
    exercise.apparatus === 'reformer' &&
    (exercise.bodyPosition === 'kneeling' ||
      exercise.blockCategory === 'cooldown' ||
      exercise.blockCategory === 'lower-body')
  ) {
    score += 34;
    reasons.push('리포머 무릎서기 대퇴·고관절 스트레치 관련');
  }
  if (
    ref.id === 'mv-14' &&
    exercise.apparatus === 'mat' &&
    (exercise.blockCategory === 'extension' || exercise.bodyPosition === 'prone')
  ) {
    score += 42;
    reasons.push('매트 엎드린 자세 척추 신전(Swan) 원형 관련');
  }
  if (
    ref.id === 'mv-15' &&
    exercise.apparatus === 'reformer' &&
    (exercise.blockCategory === 'extension' || exercise.bodyPosition === 'prone')
  ) {
    score += 44;
    reasons.push('리포머 척추 신전(Swan) 변형 관련');
  }
  if (
    ref.id === 'mv-16' &&
    ((exercise.apparatus === 'reformer' &&
      (exercise.blockCategory === 'plank' ||
        exercise.blockCategory === 'core' ||
        exercise.bodyPosition === 'quadruped' ||
        exercise.bodyPosition === 'kneeling')) ||
      exercise.spinalPlanes.includes('rotation'))
  ) {
    score += 36;
    reasons.push('리포머 니 스트레치 프렙·몸통 회전 안정성 관련');
  }
  if (
    ref.id === 'mv-17' &&
    exercise.apparatus === 'reformer' &&
    (exercise.bodyPosition === 'standing' || exercise.blockCategory === 'lower-body')
  ) {
    score += 42;
    reasons.push('리포머 스탠딩 스플릿·런지·하체 균형 관련');
  }
  if (
    ref.id === 'sr-02' &&
    (exercise.bodyPosition === 'standing' ||
      exercise.blockCategory === 'footwork' ||
      exercise.blockCategory === 'cooldown')
  ) {
    score += 30;
    reasons.push('서서 하는 발목·무릎·전신 균형 통합 시리즈 관련');
  }
  if (
    ref.id === 'sr-03' &&
    (exercise.props.includes('foam-roller') ||
      exercise.blockCategory === 'warmup' ||
      exercise.blockCategory === 'cooldown')
  ) {
    score += exercise.props.includes('foam-roller') ? 45 : 22;
    reasons.push('폼롤러·몸통 안정 및 가동성 시리즈 관련');
  }
  if (
    ref.id === 'mv-18' &&
    (exercise.blockCategory === 'feet-in-straps' ||
      exercise.blockCategory === 'core' ||
      /roll over|롤오버|short spine|숏스파인|straps|스트랩/i.test(searchText))
  ) {
    score += 32;
    reasons.push('수파인 복부·고관절·척추 분절 제어 관련');
  }

  if (reasons.length === 0) {
    reasons.push('필라테스 공식 교육기관(Merrithew) 동작 카탈로그 참고');
  }

  return { ref, score, reasons };
}

function scoreKoreanYoutubeVerifiedReference(
  exercise: PilatesExercise,
  ref: VerifiedPublicReference,
  searchText: string,
): ScoredVerifiedReference {
  let score = 10;
  const reasons: string[] = [];
  const nameText = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`.toLowerCase();

  const matchingProps = ref.requiredProps.filter(
    (prop) => prop !== 'none' && exercise.props.includes(prop),
  );
  if (matchingProps.length > 0) {
    score += 45;
    reasons.push(`소도구(${matchingProps.join(', ')}) 일치`);
  }

  switch (ref.id) {
    case 'kr-01': // 헌드레드
      if (/hundred|헌드레드|chest lift|체스트 리프트|ab series|앱 파이브/i.test(nameText)) {
        score += 65;
        reasons.push('동작명(헌드레드·체스트 리프트·복부 시리즈) 직접 관련');
      } else if (
        exercise.blockCategory === 'core' ||
        /hundred|헌드레드|chest lift|체스트 리프트|curl|컬업|복부|ab/i.test(searchText)
      ) {
        score += 48;
        reasons.push('코어·헌드레드·상복부 안정화 패턴 관련');
      } else if (exercise.bodyPosition === 'supine') {
        score += 20;
        reasons.push('누운 자세(Supine) 코어 기본 정렬 참고');
      }
      break;
    case 'kr-02': // 캣 스트레칭
      if (/cat|캣|고양이|흉추|thoracic/i.test(nameText)) {
        score += 62;
        reasons.push('동작명(캣 스트레칭·흉추 분절) 직접 관련');
      } else if (
        exercise.bodyPosition === 'quadruped' ||
        exercise.bodyPosition === 'kneeling' ||
        exercise.blockCategory === 'extension' ||
        /cat|캣|고양이|흉추|thoracic|척추|분절|swan|스완/i.test(searchText)
      ) {
        score += 46;
        reasons.push('척추 분절·흉추 가동성(Cat Stretch) 패턴 관련');
      }
      break;
    case 'kr-03': // 밴드 롤업
      if (/roll-up|roll up|롤업|roll-down|rolldown|롤다운|band|밴드/i.test(nameText)) {
        score += 62;
        reasons.push('동작명(롤업·롤다운·밴드) 직접 관련');
      } else if (
        exercise.props.includes('theraband') ||
        exercise.props.includes('long-band') ||
        exercise.props.includes('loop-band') ||
        exercise.bodyPosition === 'seated' ||
        exercise.blockCategory === 'upper-body' ||
        /roll|롤업|롤다운|롤백|시티드|seated|band|밴드|로잉|row/i.test(searchText)
      ) {
        score += 45;
        reasons.push('탄력밴드·앉은 자세 척추 분절 및 상체 연결 참고');
      }
      break;
    case 'kr-04': // 싱글 레그 익스텐션
      if (
        /single-leg|single leg|싱글 레그|knee-fold|니 폴드|heel-slide|힐 슬라이드/i.test(nameText)
      ) {
        score += 62;
        reasons.push('동작명(싱글 레그·하지 조절) 직접 관련');
      } else if (
        exercise.blockCategory === 'lower-body' ||
        exercise.blockCategory === 'footwork' ||
        exercise.blockCategory === 'plank' ||
        exercise.bodyPosition === 'side-lying' ||
        exercise.bodyPosition === 'standing' ||
        /leg|다리|하체|런지|lunge|스쿠터|scooter|풋워크|footwork|니 폴드|힐 슬라이드|클램|사이드킥/i.test(
          searchText,
        )
      ) {
        score += 46;
        reasons.push('하지 정렬·한 다리 뻗기 및 코어 협응 패턴 관련');
      }
      break;
    case 'kr-05': // 숄더 브릿지
      if (/bridge|브릿지|브리지|pelvic lift|펠빅 리프트/i.test(nameText)) {
        score += 65;
        reasons.push('동작명(브릿지·펠빅 리프트) 직접 관련');
      } else if (
        exercise.blockCategory === 'bridging' ||
        /bridge|브릿지|브리지|pelvic|골반|둔근|햄스트링|hip extension/i.test(searchText)
      ) {
        score += 52;
        reasons.push('숄더 브릿지·둔근 및 후면 사슬 분절 패턴 관련');
      }
      break;
    case 'kr-06': // 폼롤러 롤오버
      if (exercise.props.includes('foam-roller') || /폼롤러|foam roller/i.test(nameText)) {
        score += 64;
        reasons.push('폼롤러 활용 척추·코어 제어 패턴 관련');
      }
      break;
    case 'kr-07': // 롤오버
      if (/roll over|롤오버|short spine|숏스파인|feet in straps|핏인스트랩/i.test(nameText)) {
        score += 62;
        reasons.push('동작명(롤오버·숏스파인·핏인스트랩) 직접 관련');
      } else if (
        exercise.blockCategory === 'feet-in-straps' ||
        /롤오버|roll over|숏스파인|short spine|레그 스프링|프로그|frog/i.test(searchText)
      ) {
        score += 50;
        reasons.push('하지 거상·척추 분절 및 코어 제어 패턴 관련');
      }
      break;
    case 'kr-08': // 필라테스 기초 호흡
      if (/breath|호흡|pelvic-clock|골반 시계|펠빅 클락/i.test(nameText)) {
        score += 62;
        reasons.push('동작명(호흡·골반 시계) 직접 관련');
      } else if (
        exercise.blockCategory === 'warmup' ||
        exercise.blockCategory === 'cooldown' ||
        /breath|호흡|골반 시계|pelvic clock|기초|준비/i.test(searchText)
      ) {
        score += 48;
        reasons.push('필라테스 기초 호흡 및 코어 세팅 원리 관련');
      }
      break;
    case 'kr-09': // 횡격막 호흡
      if (/rib-breath|흉식|횡격막|diaphragmatic/i.test(nameText)) {
        score += 64;
        reasons.push('동작명(흉식·횡격막 호흡) 직접 관련');
      } else if (
        exercise.blockCategory === 'warmup' ||
        exercise.blockCategory === 'cooldown' ||
        /rib|흉식|횡격막|호흡|이완|마무리|쿨다운/i.test(searchText)
      ) {
        score += 47;
        reasons.push('횡격막·흉곽 호흡 조절 및 몸통 안정화 원리 관련');
      }
      break;
    default:
      break;
  }

  if (reasons.length === 0) {
    reasons.push('국내 공인 교육기관 파트너 채널(WITH PILATES) 동작 후보 참고');
  }

  return { ref, score, reasons };
}

function extractTier4VerifiedCatalogMatches(exercise: PilatesExercise): MovementMediaMatch[] {
  const searchText = getExerciseSearchText(exercise);
  const websiteRefs = VERIFIED_REFERENCES.filter((ref) => ref.provider === 'website');
  const youtubeRefs = VERIFIED_REFERENCES.filter((ref) => ref.provider === 'youtube');

  const scoredWebsites = websiteRefs
    .map((ref) => scoreWebsiteVerifiedReference(exercise, ref, searchText))
    .sort((a, b) => b.score - a.score || a.ref.id.localeCompare(b.ref.id));

  const scoredYoutubes = youtubeRefs
    .map((ref) => scoreKoreanYoutubeVerifiedReference(exercise, ref, searchText))
    .sort((a, b) => b.score - a.score || a.ref.id.localeCompare(b.ref.id));

  const selected: MovementMediaMatch[] = [];

  const topYoutube = scoredYoutubes[0];
  if (topYoutube) {
    const source = buildSourceFromVerifiedReference(topYoutube.ref);
    selected.push(
      createMatch(
        exercise.id,
        topYoutube.ref.id,
        'verified-catalog-match',
        `검증 카탈로그 YouTube 후보(${topYoutube.ref.title}) 매칭 · ${topYoutube.reasons.join(', ')}`,
        source,
      ),
    );
  }

  const topWebsite = scoredWebsites[0];
  if (topWebsite) {
    const source = buildSourceFromVerifiedReference(topWebsite.ref);
    selected.push(
      createMatch(
        exercise.id,
        topWebsite.ref.id,
        'verified-catalog-match',
        `공식 교육기관 카탈로그(${topWebsite.ref.title}) 매칭 · ${topWebsite.reasons.join(', ')}`,
        source,
      ),
    );
  }

  return selected;
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
