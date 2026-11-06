import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { exerciseRevision, getExerciseReviewState, isExerciseAutoEligible } from './exerciseReview';

function fixture(): PilatesExercise {
  return {
    id: 'test-review-only',
    nameKo: '검토 테스트 계획',
    nameEn: 'Synthetic Review Fixture',
    apparatus: 'mat',
    requiredEquipment: ['mat'],
    props: ['mini-ball'],
    blockCategory: 'core',
    spinalPlanes: ['neutral'],
    bodyPosition: 'supine',
    level: '1.0',
    defaultDurationMin: 4,
    isUnilateral: false,
    springs: '테스트 설정',
    box: 'none',
    footbar: 'none',
    headrest: 'flat',
    targetMuscles: ['몸통'],
    breathPattern: '테스트 호흡',
    cues: ['첫 번째 테스트 큐', '두 번째 테스트 큐'],
    precautions: '합성 테스트 기록입니다.',
    layers: { easy: '준비', standard: '기본', hard: '확장' },
    youtube: {
      videoId: '',
      channelName: '합성 테스트',
      videoTitle: '',
      startSec: 0,
      url: '',
    },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: '2026-11-04T12:00:00.000Z',
  };
}

function reviewed(exercise = fixture()): PilatesExercise {
  return Object.assign(exercise, {
    review: {
      status: 'approved' as const,
      reviewerAlias: '테스트 강사',
      reviewedAt: '2026-11-04T12:30:00.000Z',
      revision: exerciseRevision(exercise),
      scope: 'planning-metadata' as const,
      credentialVerified: false as const,
    },
  });
}

function withReviewValue(exercise: PilatesExercise, value: unknown): PilatesExercise {
  Object.assign(exercise as unknown as Record<string, unknown>, { review: value });
  return exercise;
}

function reviewData(exercise: PilatesExercise): Record<string, unknown> {
  return (exercise as PilatesExercise & { review: Record<string, unknown> }).review;
}

describe('exercise planning review eligibility', () => {
  it('keeps an unreviewed exercise pending and ineligible', () => {
    expect(getExerciseReviewState(fixture())).toBe('pending');
    expect(isExerciseAutoEligible(fixture())).toBe(false);
  });

  it('accepts only a well formed review of the current content', () => {
    const exercise = reviewed();
    expect(getExerciseReviewState(exercise)).toBe('approved');
    expect(isExerciseAutoEligible(exercise)).toBe(true);
  });

  it('canonicalizes recursively reordered object keys while retaining the same content', () => {
    const first = fixture();
    const second = Object.fromEntries(
      Object.entries(first).reverse(),
    ) as unknown as PilatesExercise;
    second.layers = {
      hard: first.layers.hard,
      easy: first.layers.easy,
      standard: first.layers.standard,
    };
    second.youtube = Object.fromEntries(
      Object.entries(first.youtube).reverse(),
    ) as typeof first.youtube;
    expect(exerciseRevision(second)).toBe(exerciseRevision(first));
  });

  it('excludes only the root review record from the content revision', () => {
    const exercise = fixture();
    const before = exerciseRevision(exercise);
    const after = withReviewValue(exercise, { arbitrary: 'review metadata' });
    expect(exerciseRevision(after)).toBe(before);
    Object.assign(after.youtube, { review: 'a source field is still content' });
    expect(exerciseRevision(after)).not.toBe(before);
  });

  it.each([
    [
      'source URL',
      (exercise: PilatesExercise) => {
        exercise.youtube.url = 'https://example.test/source';
      },
    ],
    [
      'source timestamp',
      (exercise: PilatesExercise) => {
        exercise.youtube.startSec = 25;
      },
    ],
    [
      'source channel',
      (exercise: PilatesExercise) => {
        exercise.youtube.channelName = '다른 출처';
      },
    ],
    [
      'spring setting',
      (exercise: PilatesExercise) => {
        exercise.springs = '변경된 설정';
      },
    ],
    [
      'duration',
      (exercise: PilatesExercise) => {
        exercise.defaultDurationMin = 5;
      },
    ],
    [
      'equipment',
      (exercise: PilatesExercise) => {
        exercise.requiredEquipment = ['mat', 'chair'];
      },
    ],
    [
      'props',
      (exercise: PilatesExercise) => {
        exercise.props = ['foam-roller'];
      },
    ],
    [
      'cue',
      (exercise: PilatesExercise) => {
        exercise.cues[0] = '새 테스트 큐';
      },
    ],
    [
      'layer',
      (exercise: PilatesExercise) => {
        exercise.layers.hard = '다른 확장';
      },
    ],
    [
      'level',
      (exercise: PilatesExercise) => {
        exercise.level = '1.5';
      },
    ],
    [
      'laterality',
      (exercise: PilatesExercise) => {
        exercise.isUnilateral = true;
      },
    ],
    [
      'precaution',
      (exercise: PilatesExercise) => {
        exercise.precautions = '수정한 검토 메모';
      },
    ],
    [
      'name',
      (exercise: PilatesExercise) => {
        exercise.nameKo = '다른 계획 이름';
      },
    ],
    [
      'array order',
      (exercise: PilatesExercise) => {
        exercise.cues.reverse();
      },
    ],
  ])('invalidates approval when %s changes', (_label, change) => {
    const exercise = reviewed();
    change(exercise);
    expect(getExerciseReviewState(exercise)).toBe('stale');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it('keeps approval when only the favorite preference changes', () => {
    const exercise = reviewed();
    const before = exerciseRevision(exercise);
    exercise.favoriteTag = 'signature';
    expect(exerciseRevision(exercise)).toBe(before);
    expect(getExerciseReviewState(exercise)).toBe('approved');
    expect(isExerciseAutoEligible(exercise)).toBe(true);
  });

  it('keeps approval when only usage bookkeeping changes', () => {
    const exercise = reviewed();
    Object.assign(exercise, {
      lastUsedAt: '2026-11-05T12:00:00.000Z',
      lastUsedCount: 2,
      lastTaughtAt: '2026-11-05T12:00:00.000Z',
      taughtCount: 1,
      usageCount: 3,
    });
    expect(getExerciseReviewState(exercise)).toBe('approved');
    expect(isExerciseAutoEligible(exercise)).toBe(true);
  });

  it('includes additional persisted enumerable fields', () => {
    const exercise = reviewed();
    Object.assign(exercise, { newlyAddedPlanningField: 'new persisted value' });
    expect(getExerciseReviewState(exercise)).toBe('stale');
  });

  it('preserves array order when JSON normalizes undefined entries to null', () => {
    const first = fixture();
    const second = fixture();
    Object.assign(first, { extraPlanningValues: [undefined, 'test'] });
    Object.assign(second, { extraPlanningValues: ['test', undefined] });
    expect(exerciseRevision(first)).not.toBe(exerciseRevision(second));
  });

  it('preserves approval through a JSON storage roundtrip with undefined optional fields', () => {
    const exercise = fixture();
    exercise.requiredEquipment = undefined;
    Object.assign(exercise, { optionalPlanningNote: undefined });
    const approved = reviewed(exercise);
    const restored = JSON.parse(JSON.stringify(approved)) as PilatesExercise;
    expect(exerciseRevision(restored)).toBe(exerciseRevision(approved));
    expect(getExerciseReviewState(restored)).toBe('approved');
    expect(isExerciseAutoEligible(restored)).toBe(true);
  });

  it('preserves the source snapshot and local review independently through JSON storage', () => {
    const exercise = fixture();
    exercise.sourceReference = {
      referenceId: 'synthetic-source',
      url: 'https://example.test/original-source',
      title: '합성 원출처 기록',
      publisher: '테스트 발행처',
      region: 'global',
      verificationStatus: 'official-source-checked',
      verifiedAt: '2026-11-04',
      rights: 'link-only',
      rawLedgerFile: 'verified-source-catalog.json',
      rawItemId: 'synthetic-item',
    };
    const approved = reviewed(exercise);
    const restored = JSON.parse(JSON.stringify(approved)) as PilatesExercise;
    expect(restored.sourceReference).toEqual(exercise.sourceReference);
    expect(getExerciseReviewState(restored)).toBe('approved');
    expect(restored.review?.credentialVerified).toBe(false);
  });

  it.each(['url', 'referenceId', 'publisher', 'verificationStatus', 'rawItemId'] as const)(
    'requires another review when the primary source %s changes',
    (field) => {
      const exercise = fixture();
      exercise.sourceReference = {
        referenceId: 'synthetic-source',
        url: 'https://example.test/original-source',
        title: '합성 원출처 기록',
        publisher: '테스트 발행처',
        region: 'global',
        verificationStatus: 'official-source-checked',
        verifiedAt: '2026-11-04',
        rights: 'link-only',
        rawLedgerFile: 'verified-source-catalog.json',
        rawItemId: 'synthetic-item',
      };
      reviewed(exercise);
      Object.assign(exercise.sourceReference, {
        [field]:
          field === 'verificationStatus' ? 'partial-playback-checked' : 'changed-source-value',
      });
      expect(getExerciseReviewState(exercise)).toBe('stale');
      expect(isExerciseAutoEligible(exercise)).toBe(false);
    },
  );

  it('uses identical revisions for JSON-equivalent array values', () => {
    const withUndefined = fixture();
    const withNull = fixture();
    Object.assign(withUndefined, { extraPlanningValues: [undefined, 'test'] });
    Object.assign(withNull, { extraPlanningValues: [null, 'test'] });
    expect(exerciseRevision(withUndefined)).toBe(exerciseRevision(withNull));
  });

  it('keeps an old or foreign revision stale and ineligible', () => {
    const exercise = reviewed();
    reviewData(exercise).revision = 'old-revision-not-the-current-content';
    expect(getExerciseReviewState(exercise)).toBe('stale');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it.each([
    ['missing review', undefined],
    ['string review', 'approved'],
    ['array review', []],
    ['null review', null],
  ])('rejects %s', (_label, value) => {
    const exercise = withReviewValue(fixture(), value);
    expect(getExerciseReviewState(exercise)).toBe('pending');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it.each([
    ['wrong status', 'status', 'pending'],
    ['wrong scope', 'scope', 'movement-safety'],
    ['claimed credential verification', 'credentialVerified', true],
    ['missing credential disclaimer', 'credentialVerified', undefined],
    ['empty alias', 'reviewerAlias', ''],
    ['blank alias', 'reviewerAlias', '   '],
    ['alias above 80 characters', 'reviewerAlias', '가'.repeat(81)],
    ['missing alias', 'reviewerAlias', undefined],
    ['missing revision', 'revision', undefined],
    ['empty revision', 'revision', ''],
    ['numeric revision', 'revision', 42],
  ])('rejects malformed review metadata: %s', (_label, field, value) => {
    const exercise = reviewed();
    reviewData(exercise)[field] = value;
    expect(getExerciseReviewState(exercise)).toBe('pending');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it.each([
    '',
    'not-a-date',
    '11/04/2026',
    '2026-99-99',
    '2026-02-31T12:00:00.000Z',
    '2026-11-04T99:00:00Z',
  ])('rejects invalid or non-ISO reviewedAt: %s', (value) => {
    const exercise = reviewed();
    reviewData(exercise).reviewedAt = value;
    expect(getExerciseReviewState(exercise)).toBe('pending');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it('allows an 80-character alias and a valid ISO date', () => {
    const exercise = reviewed();
    reviewData(exercise).reviewerAlias = '가'.repeat(80);
    reviewData(exercise).reviewedAt = '2026-11-04';
    expect(getExerciseReviewState(exercise)).toBe('approved');
  });

  it('fails closed for unsupported cyclic record data', () => {
    const exercise = reviewed();
    Object.assign(exercise, { badCircularData: exercise });
    expect(getExerciseReviewState(exercise)).toBe('pending');
    expect(isExerciseAutoEligible(exercise)).toBe(false);
  });

  it('never approves a production original or legacy seed by default', () => {
    expect(INITIAL_EXERCISES.length).toBeGreaterThan(0);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(
      INITIAL_EXERCISES.every((exercise) => getExerciseReviewState(exercise) === 'pending'),
    ).toBe(true);
  });
});
