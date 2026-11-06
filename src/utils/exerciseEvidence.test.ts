import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import type { VerifiedPublicReference } from '../data/verifiedReferences';
import type { PilatesExercise } from '../types/pilates';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { isExerciseAutoEligible } from './exerciseReview';
import { getExerciseEvidence, safeEvidenceHttpUrl } from './exerciseEvidence';

const pending = (): PilatesExercise => ({
  ...syntheticPlanningExercise('mat', 'core', 'alpha', false),
  id: 'ex-custom-own-evidence-qa',
  springs: '미확인 스프링 · 근거 패널에 노출되면 안 되는 합성 값',
  cues: ['근거 패널에 노출되면 안 되는 합성 큐'],
});
function sourceNote(reference: VerifiedPublicReference): PilatesExercise {
  return {
    ...pending(),
    id: `ex-custom-source-evidence-${reference.id}`,
    sourceReference: {
      referenceId: reference.id,
      url: reference.url,
      title: reference.title,
      publisher: reference.sourceName,
      region: reference.region,
      verificationStatus: reference.verificationStatus,
      verifiedAt: reference.verifiedAt,
      rights: reference.rights,
      rawLedgerFile: reference.rawLedgerFile,
      rawItemId: reference.rawItemId,
    },
  };
}
const partial = VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-01')!;

describe('read-only evidence for an exact planning note', () => {
  it('counts current related proposals by exact ID without turning the legacy collection or source research into assets', () => {
    const base = pending();
    const chest = getExerciseEvidence({
      ...base,
      id: 'original-mat-chest-lift',
      nameKo: '편집한 가슴 들기 노트',
    });
    const quadruped = getExerciseEvidence({ ...base, id: 'original-mat-quadruped-reach' });
    const unknown = getExerciseEvidence({
      ...base,
      id: 'not-a-canonical-id',
      nameKo: '네발기기 팔·다리 리치',
    });
    expect(chest.motion.relatedProposals.map((item) => item.id)).toEqual(['supine-chest-lift']);
    expect(quadruped.motion.relatedProposals.map((item) => item.id)).toEqual([
      'quadruped-arm-slide',
      'quadruped-leg-slide',
    ]);
    expect(unknown.motion.relatedProposals).toEqual([]);
    for (const evidence of [chest, quadruped, unknown]) {
      expect(evidence.motion.unreviewedLabPrototypeCount).toBe(2);
      expect(evidence.motion.professionallyApprovedCount).toBe(0);
      expect(evidence.motion.status).toBe('not-authored');
      expect(evidence.source.kind).toBe('none');
      expect(evidence.source.catalogMatched).toBe(false);
    }
  });

  it('keeps candidate facts on an edited stable ID separate from this note source and variant', () => {
    const note = {
      ...pending(),
      id: 'original-mat-forearm-plank',
      nameKo: '편집한 다른 변형',
      cues: ['현재 노트만의 미검토 조건'],
    };
    const before = JSON.stringify(note);
    const evidence = getExerciseEvidence(note);
    expect(evidence.candidateResearch).toHaveLength(1);
    expect(evidence.candidateResearch[0]).toMatchObject({
      modelAuthored: false,
      canonicalAsset: null,
      exactAssetReady: false,
      professionalReviewCount: 0,
    });
    expect(evidence.candidateResearch[0].source.sourceChecked).toBe(true);
    expect(evidence.candidateResearch[0].source.population.contextLabelKo).toContain('암 치료 전');
    expect(evidence.source).toMatchObject({
      kind: 'none',
      status: 'unknown',
      catalogMatched: false,
      checkedAt: null,
    });
    expect(evidence.motion.relatedProposals).toEqual([]);
    expect(evidence.motion.professionallyApprovedCount).toBe(0);
    expect(
      getExerciseEvidence({ ...note, id: 'unknown', nameKo: '팔꿈치·무릎 지지 플랭크' })
        .candidateResearch,
    ).toEqual([]);
    expect(JSON.stringify(note)).toBe(before);
  });
  it('keeps all ninety-eight catalog motions missing and personal approvals at zero without changing the catalog', () => {
    const before = JSON.stringify(INITIAL_EXERCISES);
    const evidence = INITIAL_EXERCISES.map(getExerciseEvidence);
    expect(evidence).toHaveLength(98);
    expect(evidence.filter((item) => item.provenance.kind === 'original')).toHaveLength(60);
    expect(evidence.filter((item) => item.provenance.kind === 'legacy')).toHaveLength(38);
    for (const item of evidence) {
      expect(item.planning.status).toBe('pending');
      expect(item.planning.credentialVerified).toBe(false);
      expect(item.motion).toMatchObject({
        status: 'not-authored',
        catalogMapped: true,
        professionalReviewStatus: 'unreviewed',
        professionallyApprovedCount: 0,
        unreviewedLabPrototypeCount: 2,
      });
    }
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(before);
  });

  it('shows an instructor-authored note as pending with unknown external evidence and omits raw instructions', () => {
    const exercise = pending();
    const before = JSON.stringify(exercise);
    const evidence = getExerciseEvidence(exercise);
    expect(evidence.exerciseId).toBe(exercise.id);
    expect(evidence.planning.status).toBe('pending');
    expect(evidence.provenance.kind).toBe('manual');
    expect(evidence.provenance.label).toContain('외부 출처 없음');
    expect(evidence.source).toMatchObject({
      kind: 'none',
      status: 'unknown',
      checkedAt: null,
      catalogMatched: false,
      exerciseDurationSeconds: null,
      classDurationSeconds: null,
      videoDurationSeconds: null,
      observationPoints: [],
    });
    expect(evidence.motion.catalogMapped).toBe(false);
    expect(
      getExerciseEvidence({ ...exercise, id: 'bridge-pattern', nameKo: '브릿지 패턴' }).motion,
    ).toMatchObject({
      status: 'not-authored',
      catalogMapped: false,
      professionallyApprovedCount: 0,
    });
    expect(evidence.links).toEqual([]);
    expect(JSON.stringify(evidence)).not.toContain(exercise.springs);
    expect(JSON.stringify(evidence)).not.toContain(exercise.cues[0]);
    expect(JSON.stringify(exercise)).toBe(before);
  });

  it('distinguishes a valid personal planning review from stale data and never certifies credentials or motion', () => {
    const reviewed = syntheticPlanningExercise('mat', 'core');
    const evidence = getExerciseEvidence(reviewed);
    expect(evidence.planning).toMatchObject({
      status: 'personal-reviewed',
      reviewerAlias: reviewed.review!.reviewerAlias,
      reviewedAt: reviewed.review!.reviewedAt,
      credentialVerified: false,
    });
    expect(evidence.motion.professionallyApprovedCount).toBe(0);
    expect(evidence.motion.status).toBe('not-authored');
    const stale = getExerciseEvidence({ ...reviewed, cues: ['바뀐 합성 메모'] });
    expect(stale.planning.status).toBe('stale');
    expect(stale.planning.reviewerAlias).toBe(reviewed.review!.reviewerAlias);
    const forged = getExerciseEvidence({
      ...reviewed,
      review: { ...reviewed.review!, credentialVerified: true },
    } as unknown as PilatesExercise);
    expect(forged.planning.status).toBe('pending');
    expect(forged.planning.reviewerAlias).toBeNull();
    expect(forged.planning.credentialVerified).toBe(false);
  });

  it('uses only an exact preserved source match for observations, keeping the planning note separate from the public item', () => {
    const exercise = sourceNote(partial);
    const ledgerBefore = JSON.stringify(VERIFIED_REFERENCES);
    const evidence = getExerciseEvidence(exercise);
    expect(evidence.exerciseId).not.toBe(partial.id);
    expect(evidence.source).toMatchObject({
      kind: 'catalog-linked',
      status: 'partial-playback-checked',
      referenceId: partial.id,
      checkedAt: partial.verifiedAt,
      recordedAt: partial.verifiedAt,
      catalogMatched: true,
      videoDurationSeconds: 214.548,
      exerciseDurationSeconds: null,
      classDurationSeconds: null,
      exactIntervalsConfirmed: false,
      professionalReviewStatus: 'unreviewed',
      observationPoints: [{ seconds: 23, note: '확인한 셋업 프레임; 시작점 아님' }],
    });
    expect(evidence.links).toEqual([
      { kind: 'source', label: '보존된 원출처 열기', href: partial.url },
    ]);
    expect(evidence.source.rightsLabel).toBe(partial.rightsNote);
    expect(evidence.planning.status).toBe('pending');
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(ledgerBefore);
  });

  it.each(['official-source-checked', 'korean-candidate'] as const)(
    'shows the recorded %s state with its actual date and no invented intervals or class length',
    (status) => {
      const reference = VERIFIED_REFERENCES.find((item) => item.verificationStatus === status)!;
      const evidence = getExerciseEvidence(sourceNote(reference));
      expect(evidence.source.status).toBe(status);
      expect(evidence.source.checkedAt).toBe(reference.verifiedAt);
      expect(evidence.source.observationPoints).toEqual([]);
      expect(evidence.source.exerciseDurationSeconds).toBeNull();
      expect(evidence.source.classDurationSeconds).toBeNull();
      expect(evidence.source.exactIntervalsConfirmed).toBe(false);
      expect(evidence.source.professionalReviewStatus).toBe('unreviewed');
      expect(evidence.planning.status).toBe('pending');
    },
  );

  it('keeps distinct movement observations separate even when their original page and video are shared', () => {
    const second = VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-02')!;
    const third = VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-03')!;
    expect(second.url).toBe(third.url);
    const secondEvidence = getExerciseEvidence(sourceNote(second));
    const thirdEvidence = getExerciseEvidence(sourceNote(third));
    expect(secondEvidence.source.referenceId).toBe('mv-02');
    expect(thirdEvidence.source.referenceId).toBe('mv-03');
    expect(secondEvidence.source.observationPoints.map((point) => point.seconds)).toEqual([48.821]);
    expect(thirdEvidence.source.observationPoints.map((point) => point.seconds)).toEqual([97.429]);
    expect(secondEvidence.source.exactIntervalsConfirmed).toBe(false);
    expect(thirdEvidence.source.classDurationSeconds).toBeNull();
  });

  it.each([
    { url: 'https://www.youtube.com/watch?v=abcDEF123_-' },
    { verifiedAt: '2026-11-05' },
    { rawItemId: 'another-record' },
    { verificationStatus: 'official-source-checked' as const },
  ])('does not transfer catalog trust or observed times to an altered snapshot %j', (patch) => {
    const exercise = sourceNote(partial);
    const evidence = getExerciseEvidence({
      ...exercise,
      sourceReference: { ...exercise.sourceReference!, ...patch },
    });
    expect(evidence.source.kind).toBe('snapshot-only');
    expect(evidence.source.status).toBe('unknown');
    expect(evidence.source.checkedAt).toBeNull();
    expect(evidence.source.catalogMatched).toBe(false);
    expect(evidence.source.observationPoints).toEqual([]);
    expect(evidence.source.videoDurationSeconds).toBeNull();
    expect(evidence.source.recordedStatusLabel).toBeTruthy();
    expect(evidence.motion.professionallyApprovedCount).toBe(0);
  });

  it.each([false, true])('keeps legacy/manual YouTube links unverified (manual=%s)', (isCustom) => {
    const exercise: PilatesExercise = {
      ...pending(),
      id: isCustom ? 'ex-custom-evidence-manual' : 'legacy-evidence-note',
      isCustom,
      youtube: {
        videoId: 'abcDEF123_-',
        url: 'https://youtu.be/abcDEF123_-',
        channelName: '합성 미확인 채널명',
        videoTitle: '합성 직접 입력 제목',
        startSec: 45,
      },
    };
    const evidence = getExerciseEvidence(exercise);
    expect(evidence.provenance.kind).toBe(isCustom ? 'manual' : 'legacy');
    expect(evidence.source.kind).toBe('unverified-link');
    expect(evidence.source.status).toBe('unknown');
    expect(evidence.source.checkedAt).toBeNull();
    expect(evidence.source.observationPoints).toEqual([]);
    expect(evidence.links[0]).toMatchObject({
      kind: 'youtube',
      href: 'https://www.youtube.com/watch?v=abcDEF123_-&t=45s',
    });
  });

  it('never applies an original source observation to a separate optional YouTube reference', () => {
    const exercise = sourceNote(partial);
    exercise.youtube = {
      videoId: 'abcDEF123_-',
      url: 'https://youtu.be/abcDEF123_-',
      channelName: '',
      videoTitle: '',
      startSec: 9,
    };
    const evidence = getExerciseEvidence(exercise);
    expect(evidence.source.observationPoints[0].seconds).toBe(23);
    expect(evidence.links).toEqual([
      { kind: 'source', label: '보존된 원출처 열기', href: partial.url },
      {
        kind: 'youtube',
        label: '직접 등록한 YouTube 참조 열기',
        href: 'https://www.youtube.com/watch?v=abcDEF123_-&t=9s',
      },
    ]);
  });

  it('rejects invalid source links instead of turning a forged source snapshot into verified evidence', () => {
    const exercise = sourceNote(partial);
    const evidence = getExerciseEvidence({
      ...exercise,
      sourceReference: { ...exercise.sourceReference!, url: 'javascript:alert(1)' },
      youtube: { ...exercise.youtube, url: 'javascript:alert(1)', videoId: 'abcDEF123_-' },
    });
    expect(evidence.source.kind).toBe('invalid-record');
    expect(evidence.source.status).toBe('unknown');
    expect(evidence.source.observationPoints).toEqual([]);
    expect(evidence.links).toEqual([]);
    expect(evidence.motion.professionallyApprovedCount).toBe(0);
  });
});

describe('format-only evidence URL validation', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,example',
    'file:///tmp/example',
    '//example.com/source',
    'https://user:password@example.com/source',
    'https://example.com/\nsource',
    ' https://example.com/source',
    'https://example.com/\u007fsource',
    undefined,
  ])('does not expose %j as a link', (value) => {
    expect(safeEvidenceHttpUrl(value)).toBeNull();
  });

  it.each(['https://example.com/source?a=1#section', 'http://example.com/source'])(
    'retains an explicit HTTP(S) link without claiming remote verification: %s',
    (value) => {
      expect(safeEvidenceHttpUrl(value)).toBe(value);
    },
  );
});
