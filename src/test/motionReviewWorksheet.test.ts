import { describe, expect, it } from 'vitest';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import manifest from '../data/motionReviewSourceManifest.json';
import { getExerciseMotionReference } from '../data/motionReferences';
import { MODEL_VERSION as CHEST_VERSION } from '../models/chestLift';
import {
  encodeMotionReviewPacket,
  getMotionDraftReviewWorksheet,
  MOTION_REVIEW_COMPARISON_NOTES_SCOPE,
} from '../utils/motionReviewWorksheet';
import type { MotionDraftReviewWorksheetData } from '../utils/motionReviewWorksheet';
import { inspectBackupRecovery } from '../utils/backupRecoveryInspection';
import type { RecoveryCurrentState } from '../utils/backupRecoveryInspection';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';

const chest = getMotionDraft('supine-chest-lift');
if (!chest) throw new Error('Chest fixture missing');

describe('read-only source-bound motion review packet', () => {
  it('binds each actual authored ID to implementation source and keeps every canonical asset/review absent', () => {
    const before = JSON.stringify(MOTION_DRAFTS);
    expect(MOTION_DRAFTS).toHaveLength(17);
    for (const draft of MOTION_DRAFTS) {
      const data = getMotionDraftReviewWorksheet(draft);
      expect(data.unavailableReason).toBeNull();
      expect(data.packet?.subject.actualDraftId).toBe(draft.id);
      expect(data.packet?.subject.sourceFiles.length).toBeGreaterThan(2);
      expect(data.packet?.subject.fingerprintKind).toBe('source-implementation-fingerprint');
      expect(data.packet?.canonical).toEqual({
        comparisonExerciseId: draft.intendedExerciseId,
        comparisonIsMapping: false,
        status: 'not_authored',
        asset: null,
      });
      expect(data.packet?.professionalReview).toEqual({
        status: 'unreviewed',
        count: 0,
        reviewedAssetSha256: null,
      });
      expect(data.packet?.exactAssetReady).toBe(false);
      expect(data.packet?.autoRecommendationEligible).toBe(false);
      expect(data.packet?.status).toBe('unreviewed-reference-only');
      expect(data.packet?.support.numericContactsSourceVerified).toBe(false);
      expect(data.packet?.phases).toEqual(draft.phases);
      expect(data.packet?.phases).not.toBe(draft.phases);
      expect(getExerciseMotionReference(draft.intendedExerciseId)?.asset).toBeNull();
    }
    expect(getMotionDraftReviewWorksheet(chest).modelVersion).toBe(CHEST_VERSION);
    expect(JSON.stringify(MOTION_DRAFTS)).toBe(before);
  });

  it('retains full factual-record scope separately from source implementation identity and authored contact assumptions', () => {
    const data = getMotionDraftReviewWorksheet(chest);
    const source = data.sources[0];
    expect(source).toMatchObject({
      sourceId: 'basi-cjkelly-chest-lift-v1',
      binding: 'linked-factual-record',
      sourceChecked: true,
      checkedAtUtc: '2026-11-05T04:10:56Z',
      factualRecordSha256: '30322df79e4cc20e602afd0c3107ccac5eb790d3f840da2de04f1176638cdfae',
    });
    expect(source.hashScope).toContain('factualRecord');
    expect(source.factualRecordSha256).not.toBe(data.sourceImplementationSha256);
    expect(source.facts.join(' ')).toContain('knees bent');
    expect(data.packet?.sources).toEqual(data.sources);
    expect(data.packet?.comparisonNotes).toEqual(
      chest.matched.map((text) => ({ text, basis: 'unclassified-comparison-note' })),
    );
    expect(data.packet).not.toHaveProperty('bodyFacts');
    expect(source.rights).toMatchObject({
      use: 'reference-only',
      mediaIncluded: false,
      reuseLicense: 'not-established',
    });
    expect(data.packet?.support.numericContactsSourceVerified).toBe(false);
    expect(data.packet?.unknown.join(' ')).toContain('발바닥 전체 지지');
    expect(data.packet?.requirements.some((item) => item.basis === 'mixed')).toBe(true);
    expect(data.packet?.observedPlaybackFrame).toBeNull();
    expect(data.packet?.capturedMedia).toBeNull();
  });

  it('preserves the local planning literal as an unclassified comparison note without granting source verification', () => {
    const draft = getMotionDraft('supported-heel-raise');
    if (!draft) throw new Error('Supported heel raise fixture missing');
    const { packet } = getMotionDraftReviewWorksheet(draft);
    expect(packet).not.toBeNull();
    expect(packet?.comparisonNotes).toContainEqual({
      text: '고정된 지지를 잡을 수 있다는 기존 계획 메모',
      basis: 'unclassified-comparison-note',
    });
    expect(packet?.comparisonNotesScope).toBe(MOTION_REVIEW_COMPARISON_NOTES_SCOPE);
    expect(packet?.comparisonNotesScope).toContain(
      '각 문장을 외부 출처 사실로 독립 확인한 기록은 아니며',
    );
    expect(
      packet?.comparisonNotes.every((note) => Object.keys(note).sort().join(',') === 'basis,text'),
    ).toBe(true);
    expect(
      packet?.sources.every(
        (source) =>
          source.binding === 'unbound-reference' &&
          source.sourceChecked === null &&
          source.factualRecordSha256 === null &&
          source.facts.length === 0,
      ),
    ).toBe(true);
    expect(packet).not.toHaveProperty('bodyFacts');
    expect(packet).not.toHaveProperty('sourceFactRefs');
  });

  it('does not infer a body check, rights or factual binding from a date, link or plausible hash', () => {
    const old = getMotionDraft('supported-heel-raise');
    if (!old) throw new Error('Legacy fixture missing');
    const legacy = getMotionDraftReviewWorksheet(old);
    expect(old.sourceFactsCheckedAt).toBeTruthy();
    expect(
      legacy.sources.every(
        (source) =>
          source.binding === 'unbound-reference' &&
          source.sourceChecked === null &&
          source.factualRecordSha256 === null,
      ),
    ).toBe(true);
    for (const patch of [
      { sourceId: 'unknown-source' },
      { factualRecordSha256: 'a'.repeat(64) },
      { url: 'https://example.org/another-source' },
      { url: 'javascript:alert(1)' },
      { url: 'https://example.org/\u0000hidden' },
      { url: 'https://example.org/\ttrimmed' },
      { url: 'https://user:password@example.org/' },
    ]) {
      const changed = getMotionDraftReviewWorksheet({
        ...chest,
        sources: [{ ...chest.sources[0], ...patch }],
      });
      expect(changed.sources[0].binding).toBe('unbound-reference');
      expect(changed.sources[0].sourceChecked).toBeNull();
      expect(changed.sources[0].factualRecordSha256).toBeNull();
    }
  });

  it('fails closed on missing, duplicated, malformed or review-promoting implementation bindings', () => {
    const entry = manifest.entries.find((item) => item.draftId === chest.id)!;
    const replace = (patch: object) => ({
      ...manifest,
      entries: manifest.entries.map((item) =>
        item.draftId === chest.id ? { ...item, ...patch } : item,
      ),
    });
    const invalid = [
      { ...manifest, entries: [] },
      { ...manifest, entries: [...manifest.entries, entry] },
      replace({ sourceImplementationSha256: 'broken' }),
      replace({ reviewedAssetSha256: 'a'.repeat(64) }),
      replace({ professionalReviewCount: 1 }),
      replace({ exactAssetReady: true }),
      replace({ sourceBinding: null }),
      replace({ files: [{ path: '/workspace/private/model.ts', sha256: 'a'.repeat(64) }] }),
      replace({ files: [{ path: 'src/../private.ts', sha256: 'a'.repeat(64) }] }),
    ];
    for (const value of invalid) {
      const data = getMotionDraftReviewWorksheet(chest, value);
      expect(data.packet).toBeNull();
      expect(data.sourceImplementationSha256).toBeNull();
      expect(data.unavailableReason).toBeTruthy();
      expect(data.sources[0].sourceChecked).toBe(true);
      expect(encodeMotionReviewPacket(data).ok).toBe(false);
    }
  });

  it('exports one versioned packet with full source bindings and rejects any injected approval', () => {
    const data = getMotionDraftReviewWorksheet(chest);
    const encoded = encodeMotionReviewPacket(data);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.error);
    expect(encoded.filename).toBe('motion-review-supine-chest-lift-v2.json');
    const packet = JSON.parse(encoded.json);
    expect(packet.format).toBe('pilates-motion-review-packet');
    expect(packet.version).toBe(2);
    expect(packet).not.toHaveProperty('bodyFacts');
    expect(packet.comparisonNotes).toEqual(data.packet?.comparisonNotes);
    expect(packet.subject.actualDraftId).toBe(chest.id);
    expect(packet.subject.hashMethod).toBe(manifest.hashMethod);
    expect(packet.subject.sourceBinding.modelFile).toBe('src/models/chestLift.ts');
    expect(
      packet.subject.sourceFiles.every((item: { path: string }) => item.path.startsWith('src/')),
    ).toBe(true);
    expect(encoded.json).not.toContain('/workspace/');
    expect(packet.professionalReview.reviewedAssetSha256).toBeNull();
    expect(packet.canonical.asset).toBeNull();
    const forged = {
      ...data,
      packet: {
        ...data.packet,
        professionalReview: { status: 'approved', count: 0, reviewedAssetSha256: null },
      },
    };
    expect(encodeMotionReviewPacket(forged as unknown as MotionDraftReviewWorksheetData).ok).toBe(
      false,
    );
  });

  it('rejects a v1 discriminator, promoted mixed notes or changed review eligibility flags', () => {
    const data = getMotionDraftReviewWorksheet(chest);
    const invalid = [
      { version: 1 },
      { bodyFacts: [...chest.matched] },
      { comparisonNotesScope: 'Source-verified body facts' },
      { comparisonNotes: [{ text: chest.matched[0], basis: 'source-text' }] },
      { support: { ...data.packet?.support, numericContactsSourceVerified: true } },
      { professionalReview: { ...data.packet?.professionalReview, count: 1 } },
      {
        professionalReview: {
          ...data.packet?.professionalReview,
          reviewedAssetSha256: 'a'.repeat(64),
        },
      },
      { exactAssetReady: true },
      { autoRecommendationEligible: true },
    ];
    for (const patch of invalid) {
      expect(
        encodeMotionReviewPacket({
          ...data,
          packet: { ...data.packet, ...patch },
        } as unknown as MotionDraftReviewWorksheetData).ok,
      ).toBe(false);
    }
  });

  it('rejects the real outbound v2 review JSON as an app backup without changing current data', () => {
    const encoded = encodeMotionReviewPacket(getMotionDraftReviewWorksheet(chest));
    if (!encoded.ok) throw new Error(encoded.error);
    const current: RecoveryCurrentState = {
      exercises: [],
      savedSequences: [],
      classGroups: [],
      historyLogs: [],
      conditionTemplates: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      ownedEquipment: [],
      ownedProps: [],
      lastCriteria: null,
      draftCriteria: null,
      activeSequenceId: 'review-boundary-workspace',
      activeTitle: 'Existing local title',
      activeSubtitle: '',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeTargetGroupId: '',
      activeSteps: [],
    };
    const before = JSON.stringify(current);
    const result = inspectBackupRecovery(encoded.json, current);
    expect(result).toMatchObject({ success: false, code: 'unsupported_format' });
    expect(result).not.toHaveProperty('next');
    expect(JSON.stringify(current)).toBe(before);
  });
});
