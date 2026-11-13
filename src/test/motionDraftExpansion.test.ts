import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MOTION_DRAFT_EXPANSION } from '../data/motionDraftExpansion';
import {
  MOTION_DRAFT_COMPARISONS,
  getMotionDraftComparisons,
  groupMotionDraftOptions,
} from '../data/motionDraftIndex';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import {
  EXERCISE_MOTION_REFERENCES,
  MOTION_REFERENCE_COUNTS,
  getExerciseMotionReference,
} from '../data/motionReferences';
import standing from '../data/motionStandingSourceLedger.json';
import tension from '../data/motionTensionSourceLedger.json';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getReformerStrapArmPressGeometry } from '../models/reformerStrapArmPress';
import { MOTION_DRAFT_IDS } from '../models/types';

const EXPANSION_IDS = [
  'reformer-supine-strap-arm-press',
  'cadillac-supine-arm-spring-press',
  'ladder-supported-hip-extension-slide',
  'ladder-supported-side-leg-slide',
] as const;
const LADDER_IDS = EXPANSION_IDS.slice(2);
const CHECKED_DATE = '2026-11-05';

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');

function expansion(id: string) {
  const draft = MOTION_DRAFT_EXPANSION.find((item) => item.id === id);
  if (!draft) throw new Error(`Missing expansion proposal: ${id}`);
  return draft;
}

describe('v4 proposals remain separate from canonical motions and approvals', () => {
  it('retains the four v4 variants within seventeen proposals and sixteen comparison identities', () => {
    expect(MOTION_DRAFT_EXPANSION.map((draft) => draft.id)).toEqual(EXPANSION_IDS);
    expect(MOTION_DRAFTS).toHaveLength(17);
    expect(new Set(MOTION_DRAFTS.map((draft) => draft.id)).size).toBe(17);
    expect(new Set(MOTION_DRAFT_IDS)).toEqual(new Set(MOTION_DRAFTS.map((draft) => draft.id)));
    expect(MOTION_DRAFT_COMPARISONS).toHaveLength(17);
    expect(new Set(MOTION_DRAFT_COMPARISONS.map((entry) => entry.id))).toEqual(
      new Set(MOTION_DRAFT_IDS),
    );
    expect(new Set(MOTION_DRAFT_COMPARISONS.map((entry) => entry.intendedExerciseId)).size).toBe(
      16,
    );
    expect(
      getMotionDraftComparisons('original-mat-quadruped-reach').map((entry) => entry.id),
    ).toEqual(['quadruped-arm-slide', 'quadruped-leg-slide']);

    for (const entry of MOTION_DRAFT_COMPARISONS) {
      expect(entry.status).toBe('unreviewed-comparison-only');
      expect(getMotionDraft(entry.id)?.intendedExerciseId).toBe(entry.intendedExerciseId);
      expect(ORIGINAL_MOVEMENTS.some((item) => item.id === entry.intendedExerciseId)).toBe(true);
      expect(getMotionDraft(entry.intendedExerciseId)).toBeNull();
      expect(getExerciseMotionReference(entry.id)).toBeNull();
      expect(getExerciseMotionReference(entry.intendedExerciseId)).toMatchObject({
        status: 'not_authored',
        asset: null,
        prototypeId: null,
        professionalReviewStatus: 'unreviewed',
        expertApproved: false,
      });
    }
  });

  it.each(EXPANSION_IDS)('%s explicitly requires reconciliation without granting review', (id) => {
    const draft = expansion(id);
    expect(getMotionDraft(id)).toBe(draft);
    expect(draft).toMatchObject({
      status: 'variant-proposal',
      professionalReviewCount: 0,
      exactAssetReady: false,
      autoRecommendationEligible: false,
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      sourcePatternId: id,
      sourceFactsCheckedAt: CHECKED_DATE,
    });
    expect(draft.unknown.length).toBeGreaterThan(0);
    expect(draft.mismatched.length).toBeGreaterThan(0);
    expect(draft.variantRequirements?.length).toBeGreaterThan(0);
    expect(new Set(draft.variantRequirements?.map((requirement) => requirement.id)).size).toBe(
      draft.variantRequirements?.length,
    );
  });

  it('keeps all 98 canonical assets absent after importing expansion metadata', () => {
    expect(EXERCISE_MOTION_REFERENCES).toHaveLength(INITIAL_EXERCISES.length);
    expect(new Set(EXERCISE_MOTION_REFERENCES.map((item) => item.exerciseId)).size).toBe(INITIAL_EXERCISES.length);
    for (const reference of EXERCISE_MOTION_REFERENCES) {
      expect(reference.status).toBe('not_authored');
      expect(reference.asset).toBeNull();
      expect(reference.prototypeId).toBeNull();
      expect(reference.professionalReviewStatus).toBe('unreviewed');
      expect(reference.expertApproved).toBe(false);
    }
    expect(MOTION_REFERENCE_COUNTS).toMatchObject({
      catalogExercises: INITIAL_EXERCISES.length,
      authoredCatalogMotions: 0,
      expertApprovedMotions: 0,
    });
  });
});

describe('variant requirements preserve source choices and catalog mismatches', () => {
  it('keeps the unspecified ankle ball and tabletop distinct from feet-supported/no-prop planning', () => {
    const draft = expansion('reformer-supine-strap-arm-press');
    const original = ORIGINAL_MOVEMENTS.find((item) => item.id === draft.intendedExerciseId);
    expect(original).toMatchObject({
      requiredEquipment: ['reformer'],
      props: ['none'],
    });
    expect(original?.cues.join(' ')).toContain('양발을 지지');
    expect(draft.variantRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'reformer-loops', basis: 'mixed' }),
        expect.objectContaining({
          id: 'generic-unspecified-ball',
          basis: 'source-text',
          label: expect.stringMatching(/종류.*미확인/),
        }),
        expect.objectContaining({ id: 'tabletop-ankle-ball', basis: 'mixed' }),
      ]),
    );
    expect(draft.variant).toMatch(/tabletop.*발목 사이 볼/);
    expect(draft.mismatched.join(' ')).toMatch(/양발 지지.*소도구 없음/);
    const requirementIds = draft.variantRequirements?.map((item) => item.id);
    for (const inferredProp of ['mini-ball', 'fitness-ball', 'toning-ball', 'none'])
      expect(requirementIds).not.toContain(inferredProp);

    const ball = getReformerStrapArmPressGeometry(0.5).equipment.ball;
    expect(ball).toMatchObject({
      kind: 'generic-unspecified-ball',
      sourceSizeVerified: false,
      pressure: 'not-modeled',
    });
  });

  it('keeps Cadillac spring handles and supported feet without importing a ball or Reformer rig', () => {
    const draft = expansion('cadillac-supine-arm-spring-press');
    expect(draft.variantRequirements?.map((item) => item.id)).toEqual([
      'cadillac-handles',
      'fixed-table-feet',
    ]);
    expect(draft.variantRequirements?.every((item) => item.basis === 'mixed')).toBe(true);
    expect(draft.unknown.join(' ')).toMatch(/굽힌 팔꿈치 유지.*저작 선택/);
    expect(draft.unknown.join(' ')).toMatch(/복귀.*시작\/끝 손 위치/);
    expect(draft.mismatched.join(' ')).toMatch(/Hundred.*합치지 않음/);
    expect(ORIGINAL_MOVEMENTS.find((item) => item.id === draft.intendedExerciseId)).toMatchObject({
      requiredEquipment: ['cadillac'],
      props: ['none'],
    });
  });

  it.each(LADDER_IDS)(
    '%s retains authored rung adaptation and unresolved source equivalence',
    (id) => {
      const draft = expansion(id);
      expect(draft.variantRequirements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'ladder-barrel-rung-adaptation',
            basis: 'author-choice',
            label: expect.stringContaining('원문 변형 미대조'),
          }),
          expect.objectContaining({ id: 'floor-slide-adaptation', basis: 'mixed' }),
        ]),
      );
      expect(draft.variant).toMatch(/일반.*지지면.*래더바렐.*저작 적응/);
      expect(draft.unknown.join(' ')).toMatch(/정확한 래더바렐.*확인되지/);
      expect(draft.supportNote).toContain('바렐 곡면에는 몸이 닿지 않습니다');
      expect(draft.variantRequirements?.map((item) => item.id)).not.toContain('sliders');
      expect(ORIGINAL_MOVEMENTS.find((item) => item.id === draft.intendedExerciseId)).toMatchObject(
        { requiredEquipment: ['ladder-barrel'], props: ['none'] },
      );
      const proposal = standing.proposals.find((item) => item.proposal_id === id);
      expect(proposal).toMatchObject({
        matchedexercise: false,
        exactSourceVariantMatched: false,
        source_variant_reconciliation_required: true,
        reconciliation_status: 'sourcevariantreconciliationrequired',
        approval_count: 0,
        expert_review_count: 0,
        exact_asset_count: 0,
        auto_excluded_from_real_classes: true,
      });
    },
  );
});

describe('primary factual records retain their own hash scopes, dates and source roles', () => {
  it('validates each tension factualRecord without treating its hash as motion review', () => {
    expect(tension.sources).toHaveLength(5);
    expect(new Set(tension.sources.map((source) => source.sourceId)).size).toBe(5);
    expect(tension.researchCheckpointUtc.slice(0, 10)).toBe(CHECKED_DATE);
    expect(tension.status).toMatchObject({
      professionalReviewCount: 0,
      exactMotionMappingCount: 0,
      approvedProductionMappingCount: 0,
    });
    for (const source of tension.sources) {
      expect(hash(source.factualRecord)).toBe(source.factualRecordSha256);
      expect(source.sourceChecked).toBe(true);
      expect(source.accessDate).toBe(CHECKED_DATE);
      expect(source.professionalReviewCount).toBe(0);
      expect(source.exactMotionMappingCount).toBe(0);
      expect(source.mediaTimestamps).toEqual([]);
      expect(source.rights).toMatchObject({
        usage: 'reference-only',
        embedded: false,
        mediaCopied: false,
      });
      expect(source.context.ageExplicit).toBe(false);
    }
    expect(
      Object.fromEntries(
        tension.proposals.map((proposal) => [
          proposal.proposalId,
          {
            instruction: proposal.instructionSourceIds,
            context: proposal.contextSourceIds,
          },
        ]),
      ),
    ).toEqual({
      'reformer-supine-strap-arm-press': {
        instruction: ['pa-zola-reformer-supine-basic-arm-down-up-v1'],
        context: [
          'bb-reformer-supine-arms-context-v1',
          'merrithew-reformer-moving-carriage-rope-context-v1',
        ],
      },
      'cadillac-supine-arm-spring-press': {
        instruction: ['pa-rachel-segel-cadillac-supine-arm-prep-v1'],
        context: ['bb-cadillac-frame-spring-handle-anatomy-v1'],
      },
    });
    for (const proposal of tension.proposals) {
      const draft = expansion(proposal.proposalId);
      const expectedIds = [...proposal.instructionSourceIds, ...proposal.contextSourceIds];
      expect(draft.sources.map((source) => source.sourceId)).toEqual(expectedIds);
      for (const displayed of draft.sources) {
        const record = tension.sources.find((source) => source.sourceId === displayed.sourceId);
        expect(record).toBeDefined();
        expect(displayed.url).toBe(record?.url);
        expect(displayed.factualRecordSha256).toBe(record?.factualRecordSha256);
        if (proposal.instructionSourceIds.includes(displayed.sourceId ?? '')) {
          expect(displayed.context).toMatch(/본문|전사/);
          expect(displayed.context).toContain('전문 검토는 미완료');
        } else {
          expect(displayed.context).toMatch(/기구 구조.*일반 문맥/);
          expect(displayed.context).toContain('정확한 운동 근거가 아닙니다');
        }
      }
    }
  });

  it('validates standing whole-record hashes and keeps generic support separate from apparatus context', () => {
    expect(standing.source_factual_records).toHaveLength(6);
    expect(new Set(standing.source_factual_records.map((record) => record.source_id)).size).toBe(6);
    expect(standing.research_checked_at_utc.slice(0, 10)).toBe(CHECKED_DATE);
    for (const record of standing.source_factual_records) {
      const { factual_record_sha256, ...factsAndMetadata } = record;
      expect(hash(factsAndMetadata)).toBe(factual_record_sha256);
      expect(record.checked_at_utc.slice(0, 10)).toBe(CHECKED_DATE);
      expect(record.access.body_read).toBe(true);
      expect(record.access.media_viewed).toBe(false);
      expect(record.access.source_file_saved).toBe(false);
      expect(record.rights.reuse_license_established).toBe(false);
    }
    expect(hash(standing.source_factual_records)).toBe(
      standing.hash_specification.factual_records_sha256,
    );
    expect(standing.scope).toMatchObject({
      approved_mapping_count: 0,
      expert_review_count: 0,
      exact_asset_count: 0,
    });
    for (const id of LADDER_IDS) {
      const draft = expansion(id);
      expect(draft.sources.map((source) => source.sourceId)).toEqual([
        'RUH-STANDING-SLIDES',
        'BB-LADDER-GUIDE-2024',
        'MERRITHEW-LADDER-SUPPORT',
      ]);
      for (const displayed of draft.sources) {
        const record = standing.source_factual_records.find(
          (source) => source.source_id === displayed.sourceId,
        );
        expect(record).toBeDefined();
        expect(displayed.url).toBe(record?.url);
        expect(displayed.factualRecordSha256).toBe(record?.factual_record_sha256);
        if (displayed.sourceId === 'RUH-STANDING-SLIDES') {
          expect(displayed.context).toContain('일반 지지면 운동');
          expect(displayed.context).toMatch(/래더바렐 변형.*확인되지/);
        } else {
          expect(displayed.context).toMatch(/구조.*일반 지지 문맥/);
          expect(displayed.context).toContain('정확한 시범 근거가 아닙니다');
        }
      }
    }
  });
});

describe('discovery grouping preserves filtered and unknown options without changing equipment identity', () => {
  it('groups the complete list once and accepts filtered subsets without adding omitted drafts', () => {
    const groups = groupMotionDraftOptions(MOTION_DRAFTS);
    expect(groups.flatMap((group) => group.items.map((item) => item.id)).sort()).toEqual(
      [...MOTION_DRAFT_IDS].sort(),
    );
    const subset = MOTION_DRAFTS.filter((draft) =>
      ['cadillac-supine-arm-spring-press', 'ladder-supported-side-leg-slide'].includes(draft.id),
    );
    const filtered = groupMotionDraftOptions(subset);
    expect(filtered).toHaveLength(2);
    expect(filtered.flatMap((group) => group.items)).toEqual(subset);
    expect(groupMotionDraftOptions([])).toEqual([]);
  });

  it('retains unknown local options in a fallback group without granting a canonical comparison', () => {
    const unknown = { id: 'local-unknown-draft', title: 'Local original proposal' };
    const groups = groupMotionDraftOptions([unknown]);
    expect(groups).toEqual([{ label: '다른 제작 제안', items: [unknown] }]);
    expect(groups[0].items[0]).toBe(unknown);
    expect(getMotionDraft(unknown.id)).toBeNull();
    expect(getMotionDraftComparisons(unknown.id)).toEqual([]);
    expect(getExerciseMotionReference(unknown.id)).toBeNull();
    expect(MOTION_DRAFTS).toHaveLength(17);
  });

  it('separates ordinary support chairs from Pilates pedal chairs even when both names contain chair', () => {
    const heel = getMotionDraft('supported-heel-raise');
    const pedal = getMotionDraft('chair-seated-pedal-press');
    expect(heel).not.toBeNull();
    expect(pedal).not.toBeNull();
    const groups = groupMotionDraftOptions([
      { id: 'supported-heel-raise' },
      { id: 'chair-seated-pedal-press' },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toMatch(/일반.*의자.*필라테스 체어 아님/);
    expect(groups[1].label).toBe('필라테스 체어');
    expect(groups[0].items.map((item) => item.id)).toEqual(['supported-heel-raise']);
    expect(groups[1].items.map((item) => item.id)).toEqual(['chair-seated-pedal-press']);
    expect(MOTION_DRAFT_COMPARISONS.find((item) => item.id === heel?.id)?.rig).toBe(
      'ordinary-chair',
    );
    expect(MOTION_DRAFT_COMPARISONS.find((item) => item.id === pedal?.id)?.rig).toBe(
      'pilates-chair',
    );
    expect(getMotionDraftComparisons('original-mat-ankle-reach').map((item) => item.id)).toEqual([
      'supported-heel-raise',
    ]);
    expect(
      getMotionDraftComparisons('original-chair-seated-pedal-press').map((item) => item.id),
    ).toEqual(['chair-seated-pedal-press']);
  });
});
