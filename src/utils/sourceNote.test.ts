import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES, type VerifiedPublicReference } from '../data/verifiedReferences';
import {
  cloudBackupDataSchema,
  exerciseSchema,
  sourceReferenceSchema,
} from '../schemas/cloudBackupSchema';
import { exerciseRevision, getExerciseReviewState, isExerciseAutoEligible } from './exerciseReview';
import {
  createOwnPlanningNote,
  createSourcePlanningNote,
  SourceNoteInputSchema,
  type SourceNoteInput,
} from './sourceNote';

const website = VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-01')!;
const korean = VERIFIED_REFERENCES.find((reference) => reference.region === 'kr')!;

function planningInput(): SourceNoteInput {
  return {
    nameKo: '  내가 작성한 합성 계획 메모  ',
    durationMin: 1.75,
    equipment: ['tower', 'mat'],
    props: ['loop-band'],
    cues: ['  직접 작성한 첫 번째 검토용 큐  ', '직접 작성한 두 번째 검토용 큐'],
    level: '1.5',
    blockCategory: 'warmup',
    isUnilateral: false,
    bodyPosition: 'standing',
    precautions: '  테스트에서 직접 입력한 적용 메모  ',
  };
}

function snapshotOf(reference: VerifiedPublicReference) {
  return {
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
  };
}

describe('personal planning notes from public references', () => {
  it.each([
    ['official website', website],
    ['Korean candidate', korean],
  ])(
    'retains the %s provenance separately from only the instructor-entered plan',
    (_label, source) => {
      const input = planningInput();
      const note = createSourcePlanningNote(source, input);
      expect(note.sourceReference).toEqual(snapshotOf(source));
      expect(note.nameKo).toBe(input.nameKo.trim());
      expect(note.defaultDurationMin).toBe(input.durationMin);
      expect(note.requiredEquipment).toEqual(input.equipment);
      expect(note.apparatus).toBe('cadillac');
      expect(note.props).toEqual(input.props);
      expect(note.level).toBe(input.level);
      expect(note.blockCategory).toBe(input.blockCategory);
      expect(note.bodyPosition).toBe(input.bodyPosition);
      expect(note.isUnilateral).toBe(input.isUnilateral);
      expect(note.cues).toEqual(input.cues.map((cue) => cue.trim()));
      expect(note.precautions).toBe(input.precautions?.trim());
      expect(note.requiredEquipment).not.toEqual(source.requiredEquipment);
      expect(note.props).not.toEqual(source.requiredProps);
      expect(note.targetMuscles).toEqual([]);
      expect(note.spinalPlanes).toEqual([]);
      expect(note.springs).toBe('');
      expect(note.breathPattern).toBe('');
      expect(note.layers).toEqual({ easy: '', standard: '', hard: '' });
      expect(note.isCustom).toBe(true);
      expect(note).not.toHaveProperty('review');
      expect(getExerciseReviewState(note)).toBe('pending');
      expect(isExerciseAutoEligible(note)).toBe(false);
      expect(note.id).toMatch(/^ex-custom-source-[0-9a-f-]{36}$/);
      expect(Number.isFinite(Date.parse(note.createdAt!))).toBe(true);
    },
  );

  it('does not copy observed frames, video lengths or alternate YouTube links into exercise timing', () => {
    expect(website.observationPoints).toHaveLength(1);
    expect(website.observationPoints[0].seconds).toBe(23);
    expect(website.videoDurationSeconds).toBe(214.548);
    const note = createSourcePlanningNote(website, planningInput());
    expect(note.defaultDurationMin).toBe(1.75);
    expect(note.youtube).toEqual({
      videoId: '',
      channelName: '',
      videoTitle: '',
      url: '',
      startSec: 0,
    });
    expect(note.youtube).not.toHaveProperty('endSec');
    expect(note.sourceReference).not.toHaveProperty('observationPoints');
    expect(note.sourceReference).not.toHaveProperty('timestamps');
    expect(note.sourceReference).not.toHaveProperty('videoDurationSeconds');
    expect(note).not.toHaveProperty('timestamps');
  });

  it('requires an explicit planning time instead of adopting a source video or default time', () => {
    const missingTime = planningInput() as unknown as Record<string, unknown>;
    delete missingTime.durationMin;
    expect(() => createSourcePlanningNote(website, missingTime)).toThrow();
  });

  it('leaves optional precautions blank instead of copying the curated source safety note', () => {
    const input = planningInput();
    delete input.precautions;
    expect(website.safetyNote).toBeTruthy();
    expect(createSourcePlanningNote(website, input).precautions).toBe('');
  });

  it('does not mutate the source ledger, input arrays, or production approval state', () => {
    const sourceBefore = JSON.stringify(VERIFIED_REFERENCES);
    const input = planningInput();
    const inputBefore = structuredClone(input);
    const first = createSourcePlanningNote(website, input);
    const second = createSourcePlanningNote(website, input);
    expect(first.id).not.toBe(second.id);
    first.requiredEquipment!.push('chair');
    first.props.push('dumbbell');
    first.cues.push('새 계획 큐');
    first.sourceReference!.title = '내 노트의 별도 스냅샷';
    expect(input).toEqual(inputBefore);
    expect(second.requiredEquipment).toEqual(inputBefore.equipment);
    expect(second.cues).toEqual(inputBefore.cues.map((cue) => cue.trim()));
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(sourceBefore);
    expect(VERIFIED_REFERENCES).toHaveLength(30);
    expect(VERIFIED_REFERENCES.every((source) => !source.autoRecommendationEligible)).toBe(true);
    expect(
      VERIFIED_REFERENCES.every((source) => source.professionalReviewStatus === 'unreviewed'),
    ).toBe(true);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('retains provenance through the shared backup schema and JSON storage roundtrip', () => {
    const note = createSourcePlanningNote(website, planningInput());
    const raw = JSON.parse(JSON.stringify(note));
    const parsed = exerciseSchema.parse(raw);
    expect(parsed.sourceReference).toEqual(note.sourceReference);
    expect(parsed).not.toHaveProperty('review');
    const backup = cloudBackupDataSchema.parse({
      exercises: [raw],
      savedSequences: [],
      classGroups: [],
      historyLogs: [],
    });
    expect(backup.exercises[0].sourceReference).toEqual(snapshotOf(website));
    expect(getExerciseReviewState(parsed)).toBe('pending');
  });

  it('accepts old exercise backups without adding a source reference', () => {
    const oldExercise = JSON.parse(JSON.stringify(INITIAL_EXERCISES[0]));
    expect(oldExercise).not.toHaveProperty('sourceReference');
    expect(exerciseSchema.parse(oldExercise)).not.toHaveProperty('sourceReference');
  });

  it('includes the source snapshot in the material planning revision', () => {
    const note = createSourcePlanningNote(website, planningInput());
    const originalRevision = exerciseRevision(note);
    note.sourceReference!.url = 'https://example.com/a-different-source';
    expect(exerciseRevision(note)).not.toBe(originalRevision);
  });
});

describe('instructor-entered own movements', () => {
  it('creates a pending personal movement from explicit metadata without an external source', () => {
    const input = planningInput();
    const note = createOwnPlanningNote(input);
    expect(note.id).toMatch(/^ex-custom-own-[0-9a-f-]{36}$/);
    expect(note.nameKo).toBe(input.nameKo.trim());
    expect(note.defaultDurationMin).toBe(input.durationMin);
    expect(note.requiredEquipment).toEqual(input.equipment);
    expect(note.props).toEqual(input.props);
    expect(note.level).toBe(input.level);
    expect(note.blockCategory).toBe(input.blockCategory);
    expect(note.bodyPosition).toBe(input.bodyPosition);
    expect(note.cues).toEqual(input.cues.map((cue) => cue.trim()));
    expect(note.precautions).toBe(input.precautions?.trim());
    expect(note.isCustom).toBe(true);
    expect(note).not.toHaveProperty('sourceReference');
    expect(note).not.toHaveProperty('review');
    expect(note.youtube).toEqual({
      videoId: '',
      channelName: '',
      videoTitle: '',
      url: '',
      startSec: 0,
    });
    expect(note.youtube).not.toHaveProperty('endSec');
    expect(getExerciseReviewState(note)).toBe('pending');
    expect(isExerciseAutoEligible(note)).toBe(false);
    expect(exerciseSchema.parse(JSON.parse(JSON.stringify(note)))).toEqual(note);
  });

  it.each([false, true])(
    'preserves explicitly selected unilateral=%s in both creation paths',
    (isUnilateral) => {
      const input = { ...planningInput(), isUnilateral };
      expect(createOwnPlanningNote(input).isUnilateral).toBe(isUnilateral);
      expect(createSourcePlanningNote(website, input).isUnilateral).toBe(isUnilateral);
    },
  );

  it('does not assume bilateral execution when the side choice is missing', () => {
    const input = planningInput() as unknown as Record<string, unknown>;
    delete input.isUnilateral;
    expect(() => createOwnPlanningNote(input)).toThrow();
    expect(() => createSourcePlanningNote(website, input)).toThrow();
  });

  it('does not mutate input, source ledgers or production approval state', () => {
    const input = planningInput();
    const before = structuredClone(input);
    const sourcesBefore = JSON.stringify(VERIFIED_REFERENCES);
    const productionBefore = JSON.stringify(INITIAL_EXERCISES);
    const first = createOwnPlanningNote(input);
    const second = createOwnPlanningNote(input);
    expect(first.id).not.toBe(second.id);
    first.requiredEquipment!.push('chair');
    first.props.push('dumbbell');
    first.cues.push('별도 메모');
    expect(input).toEqual(before);
    expect(second.requiredEquipment).toEqual(before.equipment);
    expect(second.props).toEqual(before.props);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(sourcesBefore);
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(productionBefore);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(VERIFIED_REFERENCES.every((source) => !source.autoRecommendationEligible)).toBe(true);
  });
});

describe('source planning input validation', () => {
  it.each([
    ['short name', { nameKo: '가' }],
    ['long name', { nameKo: '가'.repeat(161) }],
    ['short duration', { durationMin: 0.49 }],
    ['long duration', { durationMin: 20.01 }],
    ['nonfinite duration', { durationMin: Infinity }],
    ['nonnumeric duration', { durationMin: '3' }],
    ['missing apparatus', { equipment: [] }],
    ['unknown apparatus', { equipment: ['guessed-reformer'] }],
    ['duplicate apparatus', { equipment: ['mat', 'mat'] }],
    ['missing props', { props: [] }],
    ['unknown props', { props: ['guessed-band'] }],
    ['duplicate props', { props: ['mini-ball', 'mini-ball'] }],
    ['none mixed with props', { props: ['none', 'mini-ball'] }],
    ['missing cues', { cues: [] }],
    ['blank cue', { cues: ['  '] }],
    ['long cue', { cues: ['가'.repeat(501)] }],
    ['too many cues', { cues: Array.from({ length: 13 }, () => '직접 입력한 큐') }],
    ['unknown level', { level: 'advanced' }],
    ['unknown category', { blockCategory: 'guessed-category' }],
    ['unknown position', { bodyPosition: 'guessed-position' }],
    ['implicit side choice', { isUnilateral: 'false' }],
    ['long precaution', { precautions: '가'.repeat(3001) }],
    ['injected review', { review: { status: 'approved' } }],
  ])('rejects %s before constructing a note', (_label, invalid) => {
    expect(() => createSourcePlanningNote(website, { ...planningInput(), ...invalid })).toThrow();
    expect(() => createOwnPlanningNote({ ...planningInput(), ...invalid })).toThrow();
  });

  it('accepts the explicit no-prop choice and trims user-entered text', () => {
    const input = SourceNoteInputSchema.parse({ ...planningInput(), props: ['none'] });
    expect(input.props).toEqual(['none']);
    expect(input.nameKo).toBe('내가 작성한 합성 계획 메모');
    expect(input.cues[0]).toBe('직접 작성한 첫 번째 검토용 큐');
    expect(input.precautions).toBe('테스트에서 직접 입력한 적용 메모');
  });
});

describe('link-only source snapshot validation', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//example.com/reference',
    'ftp://example.com/reference',
    'https://user:password@example.com/reference',
    'https://user@example.com/reference',
    'https://example.com/a\nsource',
    'https://example.com/a\tsource',
    'https://example.com/a\u007fsource',
    'https://example.com/a\u0085source',
    ' https://example.com/reference',
    'https://example.com/reference ',
    `https://example.com/${'x'.repeat(2048)}`,
  ])('rejects an unsafe or malformed original URL: %s', (url) => {
    expect(() => createSourcePlanningNote({ ...website, url }, planningInput())).toThrow();
    const malformedBackup = {
      ...createSourcePlanningNote(website, planningInput()),
      sourceReference: { ...snapshotOf(website), url },
    };
    expect(exerciseSchema.safeParse(malformedBackup).success).toBe(false);
  });

  it('supports HTTP and HTTPS without normalizing away the exact source path and query', () => {
    for (const url of ['http://example.com/a?item=1', 'https://example.com/a?item=1#section']) {
      expect(
        createSourcePlanningNote({ ...website, url }, planningInput()).sourceReference?.url,
      ).toBe(url);
    }
  });

  it.each([
    ['unknown verification status', { verificationStatus: 'expert-approved' }],
    ['unsupported reuse rights', { rights: 'embed-approved' }],
    ['invalid date', { verifiedAt: '2026-02-30' }],
    ['invalid region', { region: 'unknown' }],
    ['missing source ID', { id: '' }],
    ['unknown ledger', { rawLedgerFile: 'guessed-ledger.json' }],
  ])('rejects a malformed snapshot: %s', (_label, invalid) => {
    expect(() =>
      createSourcePlanningNote(
        { ...website, ...invalid } as VerifiedPublicReference,
        planningInput(),
      ),
    ).toThrow();
  });

  it('does not allow observations or exercise timestamps inside the provenance snapshot', () => {
    expect(
      sourceReferenceSchema.safeParse({ ...snapshotOf(website), timestamps: [23] }).success,
    ).toBe(false);
    expect(
      sourceReferenceSchema.safeParse({
        ...snapshotOf(website),
        observationPoints: website.observationPoints,
      }).success,
    ).toBe(false);
  });
});
