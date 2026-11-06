import manifestData from '../data/motionReviewSourceManifest.json';
import type { MotionDraftDefinition } from '../data/motionDrafts';
import type { DraftPhase } from '../models/types';
import { getMotionReviewSourceFacts } from './motionReviewSourceFacts';
import type { MotionReviewSourceFact } from './motionReviewSourceFacts';

export const MOTION_REVIEW_COMPARISON_NOTES_SCOPE =
  '기존 계획 메모·저작 선택·출처 대조 문장이 섞인 참고 메모입니다. 각 문장을 외부 출처 사실로 독립 확인한 기록은 아니며, 원문 사실 기록은 별도로 구분합니다.';

export interface MotionSourceFileFingerprint {
  path: string;
  sha256: string;
}
export interface MotionReviewSourceBinding {
  modelFile: string;
  rendererFile: string;
  definitionFiles: readonly string[];
  rendererDispatch: string;
  identityRegistry: string;
  modelProvenanceFiles: readonly string[];
}
export interface MotionReviewPacket {
  format: 'pilates-motion-review-packet';
  version: 2;
  status: 'unreviewed-reference-only';
  subject: {
    actualDraftId: string;
    title: string;
    modelVersion: string | null;
    fingerprintKind: 'source-implementation-fingerprint';
    sourceImplementationSha256: string;
    sourceFiles: readonly MotionSourceFileFingerprint[];
    sourceBinding: MotionReviewSourceBinding;
    hashScope: string;
    hashMethod: string;
  };
  canonical: {
    comparisonExerciseId: string;
    comparisonIsMapping: false;
    status: 'not_authored';
    asset: null;
  };
  professionalReview: { status: 'unreviewed'; count: 0; reviewedAssetSha256: null };
  exactAssetReady: false;
  autoRecommendationEligible: false;
  variant: string;
  sideMode: 'bilateral' | 'unilateral';
  phases: readonly DraftPhase[];
  requirements: NonNullable<MotionDraftDefinition['variantRequirements']>;
  support: { summary: string | null; detail: string; numericContactsSourceVerified: false };
  comparisonNotesScope: typeof MOTION_REVIEW_COMPARISON_NOTES_SCOPE;
  comparisonNotes: readonly { text: string; basis: 'unclassified-comparison-note' }[];
  sources: readonly MotionReviewSourceFact[];
  unknown: readonly string[];
  mismatched: readonly string[];
  reviewQuestions: readonly string[];
  capturedMedia: null;
  observedPlaybackFrame: null;
}
export interface MotionDraftReviewWorksheetData {
  draftId: string;
  title: string;
  modelVersion: string | null;
  sourceImplementationSha256: string | null;
  sourceFiles: readonly MotionSourceFileFingerprint[];
  hashScope: string | null;
  sources: readonly MotionReviewSourceFact[];
  reviewQuestions: readonly string[];
  packet: MotionReviewPacket | null;
  unavailableReason: string | null;
}
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const hash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const questions = Object.freeze([
  '원문 사실과 이 제안의 변형·준비물 차이를 분리했는가?',
  '접촉·고정·관절·단계 비율에서 저작 선택과 미확인을 식별했는가?',
  '몸의 좌우·화면 반전·정적 유지 단계가 실제 도해와 맞는가?',
  '출처 사실 기록과 소스 구현 지문을 전문 검토 해시로 오해하지 않았는가?',
  '자료의 대상·이용 권리·개인 적합성 미확인이 남아 있음을 확인할 수 있는가?',
]);
const safeSourcePath = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^src\/[A-Za-z0-9_./-]+$/.test(value) &&
  !value.split('/').includes('..') &&
  !value.includes('//');

/** No store/registry writes, media capture or approval transition. Source binding is supplied by the generated manifest. */
export function getMotionDraftReviewWorksheet(
  draft: MotionDraftDefinition,
  manifest: unknown = manifestData,
): MotionDraftReviewWorksheetData {
  const sources = getMotionReviewSourceFacts(draft);
  const root = object(manifest);
  const entries = Array.isArray(root?.entries) ? root.entries : [];
  const matches = entries.filter((value) => object(value)?.draftId === draft.id);
  const entry = matches.length === 1 ? object(matches[0]) : null;
  const version =
    typeof entry?.modelVersion === 'string' && entry.modelVersion.trim()
      ? entry.modelVersion
      : null;
  const files: MotionSourceFileFingerprint[] = [];
  let filesValid =
    Array.isArray(entry?.files) && entry.files.length > 0 && entry.files.length <= 256;
  const seen = new Set<string>();
  if (Array.isArray(entry?.files)) {
    for (const value of entry.files) {
      const file = object(value);
      if (!safeSourcePath(file?.path) || !hash(file?.sha256) || seen.has(file.path)) {
        filesValid = false;
        continue;
      }
      seen.add(file.path);
      files.push({ path: file.path, sha256: file.sha256 });
    }
  }
  const fingerprint = hash(entry?.sourceImplementationSha256)
    ? entry.sourceImplementationSha256
    : null;
  const hashScope =
    typeof root?.hashScope === 'string' && root.hashScope.trim() ? root.hashScope : null;
  const hashMethod =
    typeof root?.hashMethod === 'string' && root.hashMethod.trim() ? root.hashMethod : null;
  const rawBinding = object(entry?.sourceBinding);
  const bindingPaths = rawBinding
    ? [
        rawBinding.modelFile,
        rawBinding.rendererFile,
        rawBinding.rendererDispatch,
        rawBinding.identityRegistry,
        ...(Array.isArray(rawBinding.definitionFiles) ? rawBinding.definitionFiles : []),
        ...(Array.isArray(rawBinding.modelProvenanceFiles) ? rawBinding.modelProvenanceFiles : []),
      ]
    : [];
  const bindingValid =
    rawBinding !== null &&
    Array.isArray(rawBinding.definitionFiles) &&
    rawBinding.definitionFiles.length > 0 &&
    Array.isArray(rawBinding.modelProvenanceFiles) &&
    bindingPaths.length >= 5 &&
    bindingPaths.every((name) => safeSourcePath(name) && seen.has(name));
  const sourceBinding: MotionReviewSourceBinding | null =
    bindingValid && rawBinding
      ? {
          modelFile: rawBinding.modelFile as string,
          rendererFile: rawBinding.rendererFile as string,
          rendererDispatch: rawBinding.rendererDispatch as string,
          identityRegistry: rawBinding.identityRegistry as string,
          definitionFiles: [...(rawBinding.definitionFiles as string[])],
          modelProvenanceFiles: [...(rawBinding.modelProvenanceFiles as string[])],
        }
      : null;
  const versionValid =
    entry?.modelVersion === null ||
    (typeof entry?.modelVersion === 'string' && entry.modelVersion.trim().length > 0);
  const available =
    root?.format === 'pilates-motion-review-source-manifest' &&
    root.version === 1 &&
    root.artifactKind === 'source-implementation-fingerprint' &&
    entry !== null &&
    fingerprint !== null &&
    filesValid &&
    versionValid &&
    sourceBinding !== null &&
    hashScope !== null &&
    hashMethod !== null &&
    entry.reviewedAssetSha256 === null &&
    entry.professionalReviewCount === 0 &&
    entry.exactAssetReady === false &&
    draft.status === 'variant-proposal' &&
    draft.professionalReviewCount === 0 &&
    draft.exactAssetReady === false &&
    draft.autoRecommendationEligible === false &&
    /^[a-z0-9-]+$/.test(draft.id);
  const packet: MotionReviewPacket | null =
    available && fingerprint && hashScope && hashMethod && sourceBinding
      ? {
          format: 'pilates-motion-review-packet',
          version: 2,
          status: 'unreviewed-reference-only',
          subject: {
            actualDraftId: draft.id,
            title: draft.title,
            modelVersion: version,
            fingerprintKind: 'source-implementation-fingerprint',
            sourceImplementationSha256: fingerprint,
            sourceFiles: files,
            sourceBinding,
            hashScope,
            hashMethod,
          },
          canonical: {
            comparisonExerciseId: draft.intendedExerciseId,
            comparisonIsMapping: false,
            status: 'not_authored',
            asset: null,
          },
          professionalReview: { status: 'unreviewed', count: 0, reviewedAssetSha256: null },
          exactAssetReady: false,
          autoRecommendationEligible: false,
          variant: draft.variant,
          sideMode: draft.sideMode,
          phases: draft.phases.map((phase) => ({ ...phase })),
          requirements: (draft.variantRequirements ?? []).map((requirement) => ({
            ...requirement,
          })),
          support: {
            summary: draft.supportSummary ?? null,
            detail: draft.supportNote,
            numericContactsSourceVerified: false,
          },
          comparisonNotesScope: MOTION_REVIEW_COMPARISON_NOTES_SCOPE,
          comparisonNotes: draft.matched.map((text) => ({
            text,
            basis: 'unclassified-comparison-note',
          })),
          sources,
          unknown: [...draft.unknown],
          mismatched: [...draft.mismatched],
          reviewQuestions: [...questions],
          capturedMedia: null,
          observedPlaybackFrame: null,
        }
      : null;
  return {
    draftId: draft.id,
    title: draft.title,
    modelVersion: version,
    sourceImplementationSha256: available ? fingerprint : null,
    sourceFiles: available ? files : [],
    hashScope: available ? hashScope : null,
    sources,
    reviewQuestions: [...questions],
    packet,
    unavailableReason: available
      ? null
      : '현재 제안에 연결된 소스 구현 지문을 확인할 수 없어 JSON 저장을 사용할 수 없습니다.',
  };
}

export function encodeMotionReviewPacket(
  data: MotionDraftReviewWorksheetData,
): { ok: true; json: string; filename: string } | { ok: false; error: string } {
  const packet = data.packet;
  if (
    !packet ||
    packet.format !== 'pilates-motion-review-packet' ||
    packet.version !== 2 ||
    packet.status !== 'unreviewed-reference-only' ||
    packet.subject.actualDraftId !== data.draftId ||
    !/^[a-z0-9-]+$/.test(data.draftId) ||
    !hash(packet.subject.sourceImplementationSha256) ||
    packet.subject.fingerprintKind !== 'source-implementation-fingerprint' ||
    packet.subject.sourceImplementationSha256 !== data.sourceImplementationSha256 ||
    packet.professionalReview.status !== 'unreviewed' ||
    packet.professionalReview.reviewedAssetSha256 !== null ||
    packet.professionalReview.count !== 0 ||
    packet.canonical.asset !== null ||
    packet.canonical.status !== 'not_authored' ||
    packet.canonical.comparisonIsMapping !== false ||
    packet.exactAssetReady !== false ||
    packet.autoRecommendationEligible !== false ||
    packet.support.numericContactsSourceVerified !== false ||
    Object.prototype.hasOwnProperty.call(packet, 'bodyFacts') ||
    packet.comparisonNotesScope !== MOTION_REVIEW_COMPARISON_NOTES_SCOPE ||
    !Array.isArray(packet.comparisonNotes) ||
    !packet.comparisonNotes.every((note) => {
      const value = object(note);
      return typeof value?.text === 'string' && value.basis === 'unclassified-comparison-note';
    })
  )
    return { ok: false, error: '검토 대상과 소스 지문을 확인한 뒤 저장할 수 있습니다.' };
  try {
    const json = JSON.stringify(packet, null, 2) + '\n';
    if (json.length > 256_000)
      return { ok: false, error: '선택한 제안의 검토 자료가 표시 범위를 초과했습니다.' };
    return { ok: true, json, filename: `motion-review-${data.draftId}-v2.json` };
  } catch {
    return { ok: false, error: '검토 자료를 JSON으로 표시할 수 없습니다.' };
  }
}
