import { describe, expect, it } from 'vitest';
import {
  FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS,
  FIRST_CLASS_TUTORIAL_STEPS,
  getTutorialFixturePresetById,
  getTutorialStepById,
  isStepCompletedByTaskIds,
  isValidTutorialTaskId,
  resolveFirstClassTutorialContext,
} from './index';

describe('firstClassTutorialModel', () => {
  describe('FIRST_CLASS_TUTORIAL_STEPS', () => {
    it('defines the exact 3-step tutorial journey in order and freezes all specs', () => {
      expect(FIRST_CLASS_TUTORIAL_STEPS).toHaveLength(3);
      expect(Object.isFrozen(FIRST_CLASS_TUTORIAL_STEPS)).toBe(true);

      const [step1, step2, step3] = FIRST_CLASS_TUTORIAL_STEPS;

      expect(step1.stepNumber).toBe(1);
      expect(step1.id).toBe('new-movement');
      expect(step1.taskId).toBe('first-class:new-movement');
      expect(step1.shortTabLabelKo).toBe('1. 새 동작');
      expect(step1.titleKo).toBe('새 동작 한 줄로 적기');
      expect(step1.illustrationKind).toBe('new-movement-sketch');
      expect(Object.isFrozen(step1)).toBe(true);
      expect(Object.isFrozen(step1.bulletsKo)).toBe(true);

      expect(step2.stepNumber).toBe(2);
      expect(step2.id).toBe('block-composition');
      expect(step2.taskId).toBe('first-class:block-compose');
      expect(step2.shortTabLabelKo).toBe('2. 블록 조합');
      expect(step2.titleKo).toBe('블록으로 묶고 순서 맞추기');
      expect(step2.illustrationKind).toBe('block-composition-sketch');
      expect(Object.isFrozen(step2)).toBe(true);

      expect(step3.stepNumber).toBe(3);
      expect(step3.id).toBe('save-class');
      expect(step3.taskId).toBe('first-class:save-class');
      expect(step3.shortTabLabelKo).toBe('3. 수업 저장');
      expect(step3.titleKo).toBe('수업 제목 적고 서랍에 저장하기');
      expect(step3.illustrationKind).toBe('save-class-sketch');
      expect(Object.isFrozen(step3)).toBe(true);
    });

    it('retrieves steps by ID and falls back to step 1 on unknown IDs', () => {
      expect(getTutorialStepById('new-movement').stepNumber).toBe(1);
      expect(getTutorialStepById('block-composition').stepNumber).toBe(2);
      expect(getTutorialStepById('save-class').stepNumber).toBe(3);
      expect(
        getTutorialStepById('unknown' as 'new-movement').id,
      ).toBe('new-movement');
    });
  });

  describe('isValidTutorialTaskId & isStepCompletedByTaskIds', () => {
    it('accepts valid task IDs and rejects malformed values', () => {
      expect(isValidTutorialTaskId('first-class:new-movement')).toBe(true);
      expect(isValidTutorialTaskId('first-class:block-compose')).toBe(true);
      expect(isValidTutorialTaskId('first-class:save-class')).toBe(true);
      expect(isValidTutorialTaskId('compose')).toBe(true);
      expect(isValidTutorialTaskId('teach-record')).toBe(true);

      expect(isValidTutorialTaskId('')).toBe(false);
      expect(isValidTutorialTaskId(':leading-colon')).toBe(false);
      expect(isValidTutorialTaskId('has space')).toBe(false);
      expect(isValidTutorialTaskId('a'.repeat(101))).toBe(false);
      expect(isValidTutorialTaskId(null)).toBe(false);
      expect(isValidTutorialTaskId(42)).toBe(false);
    });

    it('maps direct and legacy task IDs to step completion', () => {
      expect(
        isStepCompletedByTaskIds('new-movement', ['first-class:new-movement']),
      ).toBe(true);
      expect(isStepCompletedByTaskIds('new-movement', ['compose'], true)).toBe(
        true,
      );
      expect(isStepCompletedByTaskIds('new-movement', ['compose'], false)).toBe(
        false,
      );
      expect(
        isStepCompletedByTaskIds(
          'block-composition',
          ['conditions', 'compose'],
          true,
        ),
      ).toBe(true);
      expect(isStepCompletedByTaskIds('save-class', ['rehearse'], true)).toBe(
        true,
      );
    });
  });

  describe('resolveFirstClassTutorialContext', () => {
    it('handles undefined and null safely with default step 1 recommendation', () => {
      const fromUndefined = resolveFirstClassTutorialContext(undefined);
      expect(fromUndefined.titleKo).toBe('첫 수업 준비 안내');
      expect(fromUndefined.targetMinutes).toBeNull();
      expect(fromUndefined.targetMinutesStatus).toBe('unspecified');
      expect(fromUndefined.suggestedStepId).toBe('new-movement');
      expect(fromUndefined.isPartialContext).toBe(false);
      expect(fromUndefined.diagnostics).toHaveLength(0);
      expect(fromUndefined.boundary).toEqual({
        isReadOnly: true,
        isMandatoryTour: false,
        requiresReviewApproval: false,
        mutatesStoreOrStorage: false,
        clinicalOrAnatomicalApproval: false,
      });
      expect(Object.isFrozen(fromUndefined)).toBe(true);

      const fromNull = resolveFirstClassTutorialContext(null);
      expect(fromNull.isPartialContext).toBe(false);
      expect(fromNull.suggestedStepId).toBe('new-movement');
    });

    it('reports INVALID_SOURCE_ROOT when source is a primitive or array', () => {
      const fromArray = resolveFirstClassTutorialContext([1, 2, 3]);
      expect(fromArray.isPartialContext).toBe(true);
      expect(fromArray.diagnostics[0]?.code).toBe('INVALID_SOURCE_ROOT');

      const fromString = resolveFirstClassTutorialContext('not-an-object');
      expect(fromString.isPartialContext).toBe(true);
      expect(fromString.diagnostics[0]?.code).toBe('INVALID_SOURCE_ROOT');
    });

    it('never mutates or freezes caller objects while freezing the returned summary', () => {
      const nestedStep = {
        stepId: 's-1',
        exerciseId: 'ex-1',
        durationMin: 8,
      };
      const callerSource = {
        title: '리포머 첫 수업',
        targetMinutes: 50,
        steps: [nestedStep],
        ideaDrafts: [{ exerciseId: 'idea-1', ideaLine: '한 줄 메모' }],
        completedTutorialTaskIds: ['first-class:new-movement'],
      };

      const summary = resolveFirstClassTutorialContext(callerSource);

      expect(Object.isFrozen(summary)).toBe(true);
      expect(Object.isFrozen(summary.completedStepIds)).toBe(true);
      expect(Object.isFrozen(callerSource)).toBe(false);
      expect(Object.isFrozen(callerSource.steps)).toBe(false);
      expect(Object.isFrozen(nestedStep)).toBe(false);

      // Caller can still mutate its own object freely
      nestedStep.durationMin = 10;
      expect(nestedStep.durationMin).toBe(10);
    });

    it('computes suggestedStepId across the 3-step progression accurately', () => {
      // 1. Empty -> new-movement
      expect(resolveFirstClassTutorialContext({}).suggestedStepId).toBe(
        'new-movement',
      );

      // 2. Has idea draft or single step without saved sequence -> block-composition
      expect(
        resolveFirstClassTutorialContext({
          ideaDrafts: [{ ideaLine: '발바닥 밀기' }],
        }).suggestedStepId,
      ).toBe('block-composition');

      expect(
        resolveFirstClassTutorialContext({
          steps: [{ stepId: '1', exerciseId: 'ex-1', durationMin: 10 }],
        }).suggestedStepId,
      ).toBe('block-composition');

      // 3. Has >= 2 exercise steps -> save-class
      expect(
        resolveFirstClassTutorialContext({
          steps: [
            { stepId: '1', exerciseId: 'ex-1', durationMin: 10 },
            { stepId: '2', exerciseId: 'ex-2', durationMin: 15 },
          ],
        }).suggestedStepId,
      ).toBe('save-class');
    });

    it('distinguishes exercise steps from rest steps and skips malformed entries', () => {
      const summary = resolveFirstClassTutorialContext({
        targetMinutes: -20,
        steps: [
          { stepId: 's1', kind: 'exercise', exerciseId: 'ex-1', durationMin: 12 },
          { stepId: 's2', kind: 'rest', exerciseId: '__rest__', durationMin: 2 },
          { stepId: 's3', blockCategory: 'rest', durationMin: 3 },
          { stepId: 'bad', exerciseId: 'ex-bad', durationMin: Number.NaN },
          null,
        ],
        ideaDrafts: [
          { current: { ideaLine: '중립 척추 유지하며 팔 내리기' } },
          { durationMin: -3, ideaLine: '음수 시간' },
        ],
        reusableBlocks: [{ id: 'blk-1', title: '워밍업 블록' }, 'invalid-block'],
        savedSequences: [
          { id: 'seq-1', title: '첫 수업', targetMinutes: 50 },
          { id: 'seq-bad', title: '시간 오류', targetMinutes: 500 },
        ],
        completedTutorialTaskIds: [
          'first-class:new-movement',
          'first-class:new-movement',
          'bad id!',
        ],
      });

      expect(summary.targetMinutes).toBeNull();
      expect(summary.targetMinutesStatus).toBe('invalid');
      expect(summary.exerciseStepCount).toBe(1);
      expect(summary.restStepCount).toBe(2);
      expect(summary.ideaDraftCount).toBe(1);
      expect(summary.reusableBlockCount).toBe(1);
      expect(summary.savedSequenceCount).toBe(1);
      expect(summary.normalizedTaskIds).toEqual(['first-class:new-movement']);
      expect(summary.completedStepIds).toEqual(['new-movement']);
      expect(summary.isPartialContext).toBe(true);

      const codes = summary.diagnostics.map((d) => d.code);
      expect(codes).toContain('INVALID_TARGET_MINUTES');
      expect(codes).toContain('MALFORMED_STEP_SKIPPED');
      expect(codes).toContain('MALFORMED_IDEA_SKIPPED');
      expect(codes).toContain('MALFORMED_BLOCK_SKIPPED');
      expect(codes).toContain('MALFORMED_SAVED_SEQUENCE_SKIPPED');
      expect(codes).toContain('MALFORMED_TASK_ID_SKIPPED');
    });

    it('enforces maxScanItems and maxNormalizedItems limits safely', () => {
      const manySteps = Array.from({ length: 25 }, (_, index) => ({
        stepId: `s-${index}`,
        exerciseId: `ex-${index}`,
        durationMin: 4,
      }));
      const summary = resolveFirstClassTutorialContext(
        { steps: manySteps },
        { maxScanItems: 10, maxNormalizedItems: 5 },
      );

      expect(summary.exerciseStepCount).toBe(5);
      expect(summary.isPartialContext).toBe(true);
      expect(
        summary.diagnostics.some((d) => d.code === 'SCAN_LIMIT_REACHED'),
      ).toBe(true);
    });

    it('resolves all 6 fixture presets cleanly', () => {
      expect(FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS).toHaveLength(6);
      const empty = resolveFirstClassTutorialContext(
        getTutorialFixturePresetById('empty-first-visit').source,
      );
      expect(empty.suggestedStepId).toBe('new-movement');

      const draftReady = resolveFirstClassTutorialContext(
        getTutorialFixturePresetById('idea-draft-ready').source,
      );
      expect(draftReady.suggestedStepId).toBe('block-composition');

      const blocksComposed = resolveFirstClassTutorialContext(
        getTutorialFixturePresetById('blocks-composed-50min').source,
      );
      expect(blocksComposed.suggestedStepId).toBe('save-class');
      expect(blocksComposed.exerciseStepCount).toBe(4);
      expect(blocksComposed.restStepCount).toBe(1);

      const legacy = resolveFirstClassTutorialContext(
        getTutorialFixturePresetById('legacy-study-migrated').source,
      );
      expect(legacy.completedStepIds).toEqual(['new-movement', 'save-class']);
    });
  });
});
