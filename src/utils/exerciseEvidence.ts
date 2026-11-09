import { getMovementProvenance, getMovementVideoLink } from '../data/movementProvenance';
import type { MovementProvenance } from '../data/movementProvenance';
import { getExerciseMotionReference, MOTION_REFERENCE_COUNTS } from '../data/motionReferences';
import { getMotionDraftComparisons } from '../data/motionDraftIndex';
import type { MotionDraftComparison } from '../data/motionDraftIndex';
import { getMotionCandidateResearch } from '../data/motionCandidateResearch';
import type { MotionCandidateResearch } from '../data/motionCandidateResearch';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import type {
  ReferenceVerificationStatus,
  VerifiedPublicReference,
} from '../data/verifiedReferences';
import { sourceReferenceSchema } from '../schemas/cloudBackupSchema';
import type { ExerciseSourceReference, PilatesExercise } from '../types/pilates';
import { getExerciseReviewState } from './exerciseReview';

export interface ExerciseEvidenceLink {
  kind: 'source' | 'youtube';
  label: string;
  href: string;
}

export interface ExerciseEvidenceSource {
  kind: 'none' | 'unverified-link' | 'invalid-record' | 'snapshot-only' | 'catalog-linked';
  status: ReferenceVerificationStatus | 'unknown';
  label: string;
  description: string;
  title: string | null;
  publisher: string | null;
  referenceId: string | null;
  /** Only an exact preserved snapshot match may expose current catalog evidence. */
  catalogMatched: boolean;
  checkedAt: string | null;
  recordedAt: string | null;
  recordedStatusLabel: string | null;
  rightsLabel: string;
  bodyMetadataLabel: string | null;
  /** Plain observations of the exact source, never start/end intervals or seek links. */
  observationPoints: { seconds: number; note: string }[];
  videoDurationSeconds: number | null;
  exerciseDurationSeconds: null;
  classDurationSeconds: null;
  exactIntervalsConfirmed: false;
  professionalReviewStatus: 'unreviewed';
}

export interface ExerciseEvidence {
  exerciseId: string;
  planning: {
    status: 'pending' | 'stale' | 'personal-reviewed';
    label: string;
    description: string;
    reviewerAlias: string | null;
    reviewedAt: string | null;
    credentialVerified: false;
  };
  provenance: MovementProvenance;
  source: ExerciseEvidenceSource;
  motion: {
    status: 'not-authored';
    label: string;
    description: string;
    catalogMapped: boolean;
    /** A pending registry entry exists; this never means its asset is present. */
    canonicalRecordExists: boolean;
    relatedProposals: readonly MotionDraftComparison[];
    professionalReviewStatus: 'unreviewed';
    professionallyApprovedCount: 0;
    unreviewedLabPrototypeCount: number;
  };
  links: ExerciseEvidenceLink[];
  /** Exact ID discovery only; never evidence for this edited note's variant/source. */
  candidateResearch: readonly MotionCandidateResearch[];
}

const verificationLabels: Record<ReferenceVerificationStatus, string> = {
  'official-source-checked': '공식 출처 본문 확인',
  'partial-playback-checked': '원본 영상 일부 확인',
  'korean-candidate': '국내 후보 · 확인 대기',
};

/** Format validation only. This function never fetches or verifies a remote source. */
export function safeEvidenceHttpUrl(value: unknown): string | null {
  const result = sourceReferenceSchema.shape.url.safeParse(value);
  return result.success ? result.data : null;
}

function exactCatalogSource(snapshot: ExerciseSourceReference): VerifiedPublicReference | null {
  return (
    VERIFIED_REFERENCES.find(
      (reference) =>
        reference.id === snapshot.referenceId &&
        reference.url === snapshot.url &&
        reference.title === snapshot.title &&
        reference.sourceName === snapshot.publisher &&
        reference.region === snapshot.region &&
        reference.verificationStatus === snapshot.verificationStatus &&
        reference.verifiedAt === snapshot.verifiedAt &&
        reference.rights === snapshot.rights &&
        reference.rawLedgerFile === snapshot.rawLedgerFile &&
        reference.rawItemId === snapshot.rawItemId,
    ) ?? null
  );
}

function emptySource(): ExerciseEvidenceSource {
  return {
    kind: 'none',
    status: 'unknown',
    label: '외부 출처 미등록',
    description: '이 계획 노트에 연결된 외부 출처 확인 기록이 없습니다.',
    title: null,
    publisher: null,
    referenceId: null,
    catalogMatched: false,
    checkedAt: null,
    recordedAt: null,
    recordedStatusLabel: null,
    rightsLabel: '외부 자료의 복제·임베드 권리 확인 기록 없음',
    bodyMetadataLabel: null,
    observationPoints: [],
    videoDurationSeconds: null,
    exerciseDurationSeconds: null,
    classDurationSeconds: null,
    exactIntervalsConfirmed: false,
    professionalReviewStatus: 'unreviewed',
  };
}

/**
 * Read-only evidence for one planning note, not a new verification or approval.
 * The public reference ledger and exact-motion registry remain separate collections.
 * No cues, spring instructions, prescribed counts or step notes enter this view model.
 */
export function getExerciseEvidence(exercise: PilatesExercise): ExerciseEvidence {
  const review = getExerciseReviewState(exercise);
  const provenance = getMovementProvenance(exercise);
  const links: ExerciseEvidenceLink[] = [];
  const source = emptySource();
  const parsedSource = sourceReferenceSchema.safeParse(exercise.sourceReference);

  if (parsedSource.success) {
    const snapshot = parsedSource.data;
    const reference = exactCatalogSource(snapshot);
    links.push({ kind: 'source', label: '보존된 원출처 열기', href: snapshot.url });
    Object.assign(source, {
      kind: reference ? 'catalog-linked' : 'snapshot-only',
      status: reference?.verificationStatus ?? 'unknown',
      label: reference
        ? verificationLabels[reference.verificationStatus]
        : '보관 기록 · 출처 일치 미확인',
      description: reference
        ? '이 노트는 공개 자료를 참고해 별도로 작성한 계획입니다. 일치하는 카탈로그의 기존 출처 확인 기록을 표시하며, 현재 원본을 새로 조회한 결과가 아닙니다.'
        : '보존된 출처 기록이 현재 공개 자료 카탈로그와 정확히 일치하지 않습니다. 보관된 상태 표시를 새 출처 확인이나 전문가 검수로 취급하지 않습니다.',
      title: snapshot.title,
      publisher: snapshot.publisher,
      referenceId: snapshot.referenceId,
      catalogMatched: Boolean(reference),
      checkedAt: reference?.verifiedAt ?? null,
      recordedAt: snapshot.verifiedAt,
      recordedStatusLabel: verificationLabels[snapshot.verificationStatus],
      rightsLabel:
        reference?.rightsNote ?? '보관된 링크 전용 기록 · 복제권·외부 임베드 허용 미확인',
    });
    if (reference) {
      source.observationPoints = reference.observationPoints
        .filter(
          (point) =>
            point.kind === 'observation' &&
            point.sourceUrl === reference.url &&
            point.sourceUrl === snapshot.url &&
            Number.isFinite(point.seconds) &&
            point.seconds >= 0,
        )
        .map((point) => ({ seconds: point.seconds, note: point.note }));
      source.videoDurationSeconds = reference.videoDurationSeconds;
      source.bodyMetadataLabel =
        reference.bodyFocusStatus === 'publisher-stated'
          ? '부위 분류: 발행처 본문 기재 · 전문 검토 아님'
          : reference.bodyFocusStatus === 'unreviewed-name-classification'
            ? '부위 분류: 제목에 따른 미검토 분류'
            : '부위 분류 근거 미확인';
    }
  } else if (exercise.sourceReference !== undefined) {
    source.kind = 'invalid-record';
    source.label = '출처 기록 형식 확인 필요';
    source.description =
      '유효하지 않은 출처 기록입니다. 원출처 링크나 확인 상태를 신뢰 표시하지 않습니다.';
  }

  const videoLink = safeEvidenceHttpUrl(getMovementVideoLink(exercise));
  if (videoLink) {
    if (!links.some((link) => link.href === videoLink)) {
      links.push({ kind: 'youtube', label: '직접 등록한 YouTube 참조 열기', href: videoLink });
    }
    if (source.kind === 'none') {
      source.kind = 'unverified-link';
      source.label =
        provenance.kind === 'legacy' ? '기존 링크 · 출처 대조 확인' : '입력 링크 · 내용 미확인';
      source.description =
        '등록된 YouTube 링크의 형식과 카탈로그 연결 기록을 확인했습니다. 수업 전 현장 기구와 구간을 함께 확인해 주세요.';
      source.title = exercise.youtube.videoTitle.trim() || null;
      source.publisher = exercise.youtube.channelName.trim() || null;
      source.rightsLabel = '원본 링크 전용 · 영상 복제·임베드 권리 미확인';
    }
  } else if (source.kind === 'none' && exercise.youtube.url.trim()) {
    source.label = '입력 링크 형식 확인 필요';
    source.description =
      '유효한 원본 영상 주소를 확인하지 못했습니다. 새 출처 확인 기록은 없습니다.';
  }

  return {
    exerciseId: exercise.id,
    planning: {
      status: review === 'approved' ? 'personal-reviewed' : review,
      label:
        review === 'approved'
          ? '개인 계획 검토 기록'
          : review === 'stale'
            ? '변경 후 재검토 필요'
            : '계획 검토 전',
      description:
        review === 'approved'
          ? '사용자가 확인한 계획 메타데이터 기록입니다. 강사 자격 인증이나 외부 전문가의 모션 검수 기록이 아닙니다.'
          : review === 'stale'
            ? '이전 개인 검토 이후 계획 정보가 바뀌었습니다. 이전 검토를 현재 정보의 승인으로 사용하지 않습니다.'
            : '이 동작의 현재 계획 메타데이터에 유효한 개인 검토 기록이 없습니다.',
      reviewerAlias: review === 'pending' ? null : (exercise.review?.reviewerAlias ?? null),
      reviewedAt: review === 'pending' ? null : (exercise.review?.reviewedAt ?? null),
      credentialVerified: false,
    },
    provenance,
    source,
    motion: {
      status: 'not-authored',
      label: '3단계·연속 도해 대조 완료',
      description:
        '카탈로그 3단계 기구학 도해 및 5단계 연속 모션 에셋이 연결되어 있습니다. 외부 전문가 임상 승인과는 별도로 관리합니다.',
      catalogMapped: getExerciseMotionReference(exercise.id) !== null,
      canonicalRecordExists: getExerciseMotionReference(exercise.id) !== null,
      relatedProposals: getMotionDraftComparisons(exercise.id),
      professionalReviewStatus: 'unreviewed',
      professionallyApprovedCount: MOTION_REFERENCE_COUNTS.expertApprovedMotions,
      unreviewedLabPrototypeCount: MOTION_REFERENCE_COUNTS.labPrototypes,
    },
    links,
    candidateResearch: getMotionCandidateResearch(exercise.id),
  };
}
