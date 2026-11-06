import { describe, expect, it } from 'vitest';
import {
  BLANK_DRAFT_STARTER_OPTIONS,
  DEFAULT_PRESET_SAFETY_BOUNDARY,
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
  getBlankDraftStarterById,
  getOfflineBlockPresetById,
  getOfflineClassPresetById,
  getPresetThemeMetadata,
} from '../data/classBlockPresets';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { sequenceSchema, templateSchema } from '../schemas/cloudBackupSchema';
import { movementSnapshotSchema, reusableBlockSchema } from '../schemas/hierarchySchema';
import type {
  BlankDraftStarterKind,
  OfflineBlockPreset,
  OfflineClassPreset,
  PresetDurationMinutes,
  PresetThemeId,
} from '../types/classBlockPresets';
import type { ApparatusType, DifficultyLevel } from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import {
  auditPresetCatalog,
  computeBlockPresetSimilarity,
  computePresetSimilarity,
  filterOfflineBlockPresets,
  filterOfflineClassPresets,
  getPresetExerciseSignature,
  insertBlockPresetIntoSequence,
  inspectPresetObjectHealthClaims,
  inspectUnverifiedHealthOrRehabClaims,
  instantiateBlockPresetAsReusableBlock,
  instantiateClassPresetAsEditableSequence,
  startFromBlankDraftOption,
  toP5ReusableBlockContract,
  validateOfflineBlockPreset,
  validateOfflineClassPreset,
} from '../utils/classBlockPresetValidator';
import {
  createClassSequenceSnapshot,
  editSequenceStepWithIsolation,
  linkHumanDraftToReusableBlock,
  linkHumanDraftToSequence,
} from '../utils/hierarchyModel';
import {
  addModificationLogToDraft,
  addPhotoReferenceToDraft,
  addSubjectiveFeelToDraft,
  refineHumanDraftMetadata,
} from '../utils/humanMovementCreation';
import { validateSequenceStructure } from '../utils/sequenceValidation';

const CATALOG_EXERCISE_BY_ID = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

describe('Offline Class & Reusable Block Presets (P2 Preset Catalog & Validator)', () => {
  describe('1. Catalog Coverage & Real Exercise Resolution', () => {
    it('exports 7 themes, 20 block presets, 18 class presets, and 6 blank draft starters that are deeply frozen', () => {
      expect(PRESET_THEME_CATALOG).toHaveLength(7);
      expect(OFFLINE_BLOCK_PRESETS).toHaveLength(20);
      expect(OFFLINE_CLASS_PRESETS).toHaveLength(18);
      expect(BLANK_DRAFT_STARTER_OPTIONS).toHaveLength(6);

      expect(Object.isFrozen(DEFAULT_PRESET_SAFETY_BOUNDARY)).toBe(true);
      expect(Object.isFrozen(PRESET_THEME_CATALOG)).toBe(true);
      expect(Object.isFrozen(OFFLINE_BLOCK_PRESETS)).toBe(true);
      expect(Object.isFrozen(OFFLINE_CLASS_PRESETS)).toBe(true);
      expect(Object.isFrozen(BLANK_DRAFT_STARTER_OPTIONS)).toBe(true);

      for (const theme of PRESET_THEME_CATALOG) {
        expect(Object.isFrozen(theme)).toBe(true);
        expect(Object.isFrozen(theme.primaryCategories)).toBe(true);
        expect(getPresetThemeMetadata(theme.id)).toBe(theme);
      }

      for (const block of OFFLINE_BLOCK_PRESETS) {
        expect(Object.isFrozen(block)).toBe(true);
        expect(Object.isFrozen(block.items)).toBe(true);
        expect(Object.isFrozen(block.steps)).toBe(true);
        expect(Object.isFrozen(block.timeBreakdown)).toBe(true);
        expect(Object.isFrozen(block.safetyBoundary)).toBe(true);
        expect(getOfflineBlockPresetById(block.id)).toBe(block);
      }

      for (const preset of OFFLINE_CLASS_PRESETS) {
        expect(Object.isFrozen(preset)).toBe(true);
        expect(Object.isFrozen(preset.steps)).toBe(true);
        expect(Object.isFrozen(preset.timeBreakdown)).toBe(true);
        expect(Object.isFrozen(preset.safetyBoundary)).toBe(true);
        expect(getOfflineClassPresetById(preset.id)).toBe(preset);
      }

      for (const starter of BLANK_DRAFT_STARTER_OPTIONS) {
        expect(Object.isFrozen(starter)).toBe(true);
        expect(Object.isFrozen(starter.progressiveStepsGuideKo)).toBe(true);
        expect(Object.isFrozen(starter.safetyBoundary)).toBe(true);
        expect(getBlankDraftStarterById(starter.id)).toBe(starter);
      }

      expect(getOfflineBlockPresetById('non-existent-block')).toBeUndefined();
      expect(getOfflineClassPresetById('non-existent-class')).toBeUndefined();
      expect(getBlankDraftStarterById('non-existent-starter')).toBeUndefined();
    });

    it('covers all durations (15/20/30/45/50/60 min), all apparatus, all levels, and all 7 themes across class presets', () => {
      const expectedDurations: PresetDurationMinutes[] = [15, 20, 30, 45, 50, 60];
      const expectedApparatus: Array<ApparatusType | 'mixed'> = [
        'mat',
        'reformer',
        'cadillac',
        'chair',
        'barrel',
        'mixed',
      ];
      const expectedLevels: DifficultyLevel[] = ['1.0', '1.5', '2.0'];
      const expectedThemes: PresetThemeId[] = PRESET_THEME_CATALOG.map((t) => t.id);

      const actualDurations = new Set(OFFLINE_CLASS_PRESETS.map((p) => p.durationMinutes));
      const actualApparatus = new Set(OFFLINE_CLASS_PRESETS.map((p) => p.apparatus));
      const actualLevels = new Set(OFFLINE_CLASS_PRESETS.map((p) => p.level));
      const actualThemes = new Set(OFFLINE_CLASS_PRESETS.map((p) => p.theme));

      for (const duration of expectedDurations) {
        expect(actualDurations.has(duration)).toBe(true);
      }
      for (const apparatus of expectedApparatus) {
        expect(actualApparatus.has(apparatus)).toBe(true);
      }
      for (const level of expectedLevels) {
        expect(actualLevels.has(level)).toBe(true);
      }
      for (const theme of expectedThemes) {
        expect(actualThemes.has(theme)).toBe(true);
      }
    });

    it('covers all sectionRoles (preparation, main, cooldown), all apparatus, all levels, and all 7 themes across block presets', () => {
      const expectedRoles: ClassSectionRole[] = ['preparation', 'main', 'cooldown'];
      const expectedApparatus: Array<ApparatusType | 'mixed'> = [
        'mat',
        'reformer',
        'cadillac',
        'chair',
        'barrel',
        'mixed',
      ];
      const expectedLevels: DifficultyLevel[] = ['1.0', '1.5', '2.0'];
      const expectedThemes: PresetThemeId[] = PRESET_THEME_CATALOG.map((t) => t.id);

      const actualRoles = new Set(OFFLINE_BLOCK_PRESETS.map((b) => b.sectionRole));
      const actualApparatus = new Set(OFFLINE_BLOCK_PRESETS.map((b) => b.apparatus));
      const actualLevels = new Set(OFFLINE_BLOCK_PRESETS.map((b) => b.level));
      const actualThemes = new Set(OFFLINE_BLOCK_PRESETS.map((b) => b.theme));

      for (const role of expectedRoles) {
        expect(actualRoles.has(role)).toBe(true);
      }
      for (const apparatus of expectedApparatus) {
        expect(actualApparatus.has(apparatus)).toBe(true);
      }
      for (const level of expectedLevels) {
        expect(actualLevels.has(level)).toBe(true);
      }
      for (const theme of expectedThemes) {
        expect(actualThemes.has(theme)).toBe(true);
      }
    });

    it('resolves every exercise ID in every block preset and class preset to a real exercise in INITIAL_EXERCISES', () => {
      for (const block of OFFLINE_BLOCK_PRESETS) {
        expect(block.items.length).toBeGreaterThanOrEqual(2);
        for (const item of block.items) {
          const catalogEx = CATALOG_EXERCISE_BY_ID.get(item.exerciseId);
          expect(catalogEx).toBeDefined();
          expect(item.exerciseSnapshot).toBeDefined();
          expect(item.exerciseSnapshot?.id).toBe(catalogEx?.id);
          expect(item.exerciseSnapshot?.nameKo).toBe(catalogEx?.nameKo);
        }
      }

      for (const preset of OFFLINE_CLASS_PRESETS) {
        expect(preset.steps.length).toBeGreaterThanOrEqual(4);
        for (const composedBlockId of preset.composedBlockPresetIds) {
          expect(getOfflineBlockPresetById(composedBlockId)).toBeDefined();
        }
        for (const step of preset.steps) {
          const catalogEx = CATALOG_EXERCISE_BY_ID.get(step.exerciseId);
          expect(catalogEx).toBeDefined();
          expect(step.exerciseSnapshot).toBeDefined();
          expect(step.exerciseSnapshot?.id).toBe(catalogEx?.id);
          expect(step.exerciseSnapshot?.nameKo).toBe(catalogEx?.nameKo);
        }
      }
    });
  });

  describe('2. Full Audit & Zero Duplicate / Superficial Rename Verification', () => {
    it('passes auditPresetCatalog with zero duplicate titles, zero duplicate signatures, zero high similarity pairs, and zero health claim violations', () => {
      const report = auditPresetCatalog(
        OFFLINE_CLASS_PRESETS,
        OFFLINE_BLOCK_PRESETS,
        BLANK_DRAFT_STARTER_OPTIONS,
        INITIAL_EXERCISES,
      );

      expect(report.valid).toBe(true);
      expect(report.classPresetCount).toBe(18);
      expect(report.blockPresetCount).toBe(20);
      expect(report.blankStarterCount).toBe(6);
      expect(report.duplicateTitleIds).toEqual([]);
      expect(report.duplicateSignatureIds).toEqual([]);
      expect(report.highSimilarityPairs).toEqual([]);
      expect(report.healthClaimViolations).toEqual([]);
      expect(report.summaryKo).toContain('모두 카탈로그 정합성');
    });

    it('flags superficial title renames with identical exercise signature or high Jaccard overlap (>= 0.65 for same apparatus & duration)', () => {
      const basePreset = OFFLINE_CLASS_PRESETS[0];

      // 1. Renamed title but identical exercise sequence signature
      const renamedIdenticalClone: OfflineClassPreset = {
        ...structuredClone(basePreset),
        id: 'preset-duplicate-signature-test',
        title: '완전히 다른 이름의 매트 15분 특별 루틴',
      };

      expect(getPresetExerciseSignature(basePreset.steps)).toBe(
        getPresetExerciseSignature(renamedIdenticalClone.steps),
      );

      const similarityIdentical = computePresetSimilarity(basePreset, renamedIdenticalClone);
      expect(similarityIdentical.jaccardSimilarity).toBe(1);
      expect(similarityIdentical.orderedOverlapRatio).toBe(1);
      expect(similarityIdentical.isDuplicateRisk).toBe(true);

      // 2. Renamed title with 3 of 4 exercises overlapping (Jaccard 0.60 or 0.75) on same apparatus & duration
      const highOverlapClone: OfflineClassPreset = {
        ...structuredClone(basePreset),
        id: 'preset-high-jaccard-overlap-test',
        title: '이름만 살짝 바꾼 15분 매트 변형 루틴',
        steps: basePreset.steps.map((step, idx) =>
          idx === 2
            ? {
                ...step,
                exerciseId: 'original-mat-heel-slide',
              }
            : step,
        ),
      };
      // 3 shared out of 5 unique = 0.60; let's test 4 steps where 3 out of 4 unique are shared (by keeping 3 steps)
      const fourToThreeOverlapClone: OfflineClassPreset = {
        ...highOverlapClone,
        steps: basePreset.steps.slice(0, 3).map((step, idx) =>
          idx === 0 ? { ...step, durationMin: 6 } : step,
        ),
      };

      const similarityOverlap = computePresetSimilarity(basePreset, fourToThreeOverlapClone);
      expect(similarityOverlap.sameApparatus).toBe(true);
      expect(similarityOverlap.sameDuration).toBe(true);
      expect(similarityOverlap.jaccardSimilarity).toBeGreaterThanOrEqual(0.65);
      expect(similarityOverlap.isDuplicateRisk).toBe(true);

      // 3. Block preset superficial rename detection
      const baseBlock = OFFLINE_BLOCK_PRESETS[7]; // 3 items
      const renamedBlockClone: OfflineBlockPreset = {
        ...structuredClone(baseBlock),
        id: 'block-superficial-rename-test',
        title: '이름만 바꾼 매트 복부 시리즈 블록',
      };
      const blockSim = computeBlockPresetSimilarity(baseBlock, renamedBlockClone);
      expect(blockSim.isDuplicateRisk).toBe(true);

      // 4. Full audit rejects catalog containing superficial rename clones
      const failedAudit = auditPresetCatalog(
        [...OFFLINE_CLASS_PRESETS, renamedIdenticalClone, fourToThreeOverlapClone],
        [...OFFLINE_BLOCK_PRESETS, renamedBlockClone],
        BLANK_DRAFT_STARTER_OPTIONS,
        INITIAL_EXERCISES,
      );
      expect(failedAudit.valid).toBe(false);
      expect(failedAudit.duplicateSignatureIds).toContain('preset-duplicate-signature-test');
      expect(failedAudit.duplicateSignatureIds).toContain('block-superficial-rename-test');
      expect(failedAudit.highSimilarityPairs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Movement Connection, Time Sum, & Unilateral Left/Right Balance', () => {
    it('validates every class preset with exact time sum (deltaSec === 0), unilateral balance, transitionScore >= 85, and difficulty flow', () => {
      for (const preset of OFFLINE_CLASS_PRESETS) {
        const result = validateOfflineClassPreset(preset, INITIAL_EXERCISES);

        expect(result.valid, `Class preset ${preset.id} failed: ${result.errorsKo.join(' | ')}`).toBe(
          true,
        );
        expect(result.catalogExercisesResolved).toBe(true);
        expect(result.unknownExerciseIds).toEqual([]);
        expect(result.timeSumMatchesTarget).toBe(true);
        expect(result.deltaSec).toBe(0);
        expect(result.actualTotalSec).toBe(preset.durationMinutes * 60);
        expect(result.unilateralBalanced).toBe(true);
        expect(result.imbalancedExerciseIds).toEqual([]);
        expect(result.transitionFlowValid).toBe(true);
        expect(result.transitionScore).toBeGreaterThanOrEqual(85);
        expect(result.difficultyFlowValid).toBe(true);
        expect(result.editIsolationVerified).toBe(true);
        expect(result.errorsKo).toEqual([]);
        expect(result.warningsKo).toEqual([]);
      }
    });

    it('validates every block preset with exact time sum, unilateral balance, P1 schema, and P5 contract', () => {
      for (const block of OFFLINE_BLOCK_PRESETS) {
        const result = validateOfflineBlockPreset(block, INITIAL_EXERCISES);

        expect(result.valid, `Block preset ${block.id} failed: ${result.errorsKo.join(' | ')}`).toBe(
          true,
        );
        expect(result.catalogExercisesResolved).toBe(true);
        expect(result.unknownExerciseIds).toEqual([]);
        expect(result.timeSumMatchesTarget).toBe(true);
        expect(result.deltaSec).toBe(0);
        expect(result.unilateralBalanced).toBe(true);
        expect(result.imbalancedExerciseIds).toEqual([]);
        expect(result.transitionFlowValid).toBe(true);
        expect(result.p1SchemaValid).toBe(true);
        expect(result.p5ContractValid).toBe(true);
        expect(result.editIsolationVerified).toBe(true);
        expect(result.errorsKo).toEqual([]);
        expect(result.warningsKo).toEqual([]);
      }
    });

    it('verifies explicit split unilateral left/right pair balance on block-reformer-main-scooter-splits-15 and preset-class-reformer-45-glute-split-balance-15', () => {
      const splitBlock = getOfflineBlockPresetById('block-reformer-main-scooter-splits-15');
      expect(splitBlock).toBeDefined();
      const leftBlockItem = splitBlock!.items.find((item) => item.sideMode === 'left');
      const rightBlockItem = splitBlock!.items.find((item) => item.sideMode === 'right');
      expect(leftBlockItem).toBeDefined();
      expect(rightBlockItem).toBeDefined();
      expect(leftBlockItem!.exerciseId).toBe('ex-lower-01');
      expect(rightBlockItem!.exerciseId).toBe('ex-lower-01');
      expect(leftBlockItem!.durationMin).toBe(rightBlockItem!.durationMin);
      expect(leftBlockItem!.explanationSec).toBe(rightBlockItem!.explanationSec);
      expect(leftBlockItem!.transitionSec).toBe(rightBlockItem!.transitionSec);
      expect(leftBlockItem!.repetitions).toBe(rightBlockItem!.repetitions);
      expect(leftBlockItem!.sets).toBe(rightBlockItem!.sets);

      const splitClass =
        getOfflineClassPresetById('preset-class-reformer-45-glute-split-balance-15') ??
        getOfflineClassPresetById('preset-class-reformer-30-scooter-split-balance-15');
      expect(splitClass).toBeDefined();

      const leftStep = splitClass!.steps.find((step) => step.sideMode === 'left');
      const rightStep = splitClass!.steps.find((step) => step.sideMode === 'right');
      expect(leftStep).toBeDefined();
      expect(rightStep).toBeDefined();
      expect(leftStep!.exerciseId).toBe('ex-lower-01');
      expect(rightStep!.exerciseId).toBe('ex-lower-01');
      expect(leftStep!.durationMin).toBe(rightStep!.durationMin);
      expect(leftStep!.explanationSec).toBe(rightStep!.explanationSec);
      expect(leftStep!.transitionSec).toBe(rightStep!.transitionSec);
      expect(leftStep!.repetitions).toBe(rightStep!.repetitions);
      expect(leftStep!.sets).toBe(rightStep!.sets);

      const classValidation = validateOfflineClassPreset(splitClass!, INITIAL_EXERCISES);
      expect(classValidation.valid).toBe(true);
      expect(classValidation.unilateralBalanced).toBe(true);
    });

    it('rejects class and block presets with unilateral sideMode="together", unpaired left step, or mismatched duration sum', () => {
      const baseSplitClass = getOfflineClassPresetById(
        'preset-class-reformer-45-glute-split-balance-15',
      )!;

      // 1. Unilateral exercise marked as 'together'
      const togetherMutated: OfflineClassPreset = {
        ...structuredClone(baseSplitClass),
        steps: baseSplitClass.steps.map((step) =>
          step.sideMode === 'left' || step.sideMode === 'right'
            ? { ...step, sideMode: 'together' }
            : step,
        ),
      };
      const togetherRes = validateOfflineClassPreset(togetherMutated, INITIAL_EXERCISES);
      expect(togetherRes.valid).toBe(false);
      expect(togetherRes.unilateralBalanced).toBe(false);
      expect(togetherRes.imbalancedExerciseIds).toContain('ex-lower-01');

      // 2. Unpaired 'left' step without matching 'right' step
      const unpairedLeftMutated: OfflineClassPreset = {
        ...structuredClone(baseSplitClass),
        steps: baseSplitClass.steps.map((step) =>
          step.sideMode === 'right' ? { ...step, sideMode: 'left-then-right' } : step,
        ),
      };
      const unpairedRes = validateOfflineClassPreset(unpairedLeftMutated, INITIAL_EXERCISES);
      expect(unpairedRes.valid).toBe(false);
      expect(unpairedRes.unilateralBalanced).toBe(false);

      // 3. Mismatched total duration sum
      const durationMismatchMutated: OfflineClassPreset = {
        ...structuredClone(baseSplitClass),
        steps: baseSplitClass.steps.map((step, idx) =>
          idx === 0 ? { ...step, durationMin: step.durationMin + 3 } : step,
        ),
      };
      const durationRes = validateOfflineClassPreset(durationMismatchMutated, INITIAL_EXERCISES);
      expect(durationRes.valid).toBe(false);
      expect(durationRes.timeSumMatchesTarget).toBe(false);
      expect(durationRes.deltaSec).toBe(180);

      // 4. Block preset with unilateral 'together' and duration mismatch
      const baseSplitBlock = getOfflineBlockPresetById('block-reformer-main-scooter-splits-15')!;
      const invalidBlock: OfflineBlockPreset = {
        ...structuredClone(baseSplitBlock),
        durationMin: 20,
        items: baseSplitBlock.items.map((item, idx) =>
          idx === 0 ? { ...item, sideMode: 'together' } : item,
        ),
      };
      const blockRes = validateOfflineBlockPreset(invalidBlock, INITIAL_EXERCISES);
      expect(blockRes.valid).toBe(false);
      expect(blockRes.timeSumMatchesTarget).toBe(false);
      expect(blockRes.unilateralBalanced).toBe(false);
    });
  });

  describe('4. Unverified Health / Rehab / Medical Claim Guard', () => {
    it('enforces safetyBoundary (aiUsed: false, medicalOrRehabEfficacyClaimed: false, expertClinicalVerified: false, editableByInstructor: true) on all presets and starters', () => {
      for (const preset of OFFLINE_CLASS_PRESETS) {
        expect(preset.safetyBoundary.aiUsed).toBe(false);
        expect(preset.safetyBoundary.medicalOrRehabEfficacyClaimed).toBe(false);
        expect(preset.safetyBoundary.expertClinicalVerified).toBe(false);
        expect(preset.safetyBoundary.editableByInstructor).toBe(true);

        const check = inspectPresetObjectHealthClaims([
          preset.title,
          preset.subtitle,
          preset.userSummaryKo,
          preset.flowRationaleKo,
          preset.unilateralBalanceNoteKo,
          preset.editingGuideKo,
          preset.safetyBoundary.disclaimerKo,
          ...preset.focusTags,
          ...preset.steps.map((s) => s.instructorNote ?? ''),
        ]);
        expect(check.safe).toBe(true);
        expect(check.matchedClaims).toEqual([]);
      }

      for (const block of OFFLINE_BLOCK_PRESETS) {
        expect(block.safetyBoundary.aiUsed).toBe(false);
        expect(block.safetyBoundary.medicalOrRehabEfficacyClaimed).toBe(false);
        expect(block.safetyBoundary.expertClinicalVerified).toBe(false);
        expect(block.safetyBoundary.editableByInstructor).toBe(true);

        const check = inspectPresetObjectHealthClaims([
          block.title,
          block.description ?? '',
          block.targetAudienceSummaryKo,
          block.flowRationaleKo,
          block.unilateralBalanceNoteKo,
          block.editingGuideKo,
          block.safetyBoundary.disclaimerKo,
          ...block.items.map((i) => i.instructorNote ?? ''),
        ]);
        expect(check.safe).toBe(true);
        expect(check.matchedClaims).toEqual([]);
      }

      for (const starter of BLANK_DRAFT_STARTER_OPTIONS) {
        expect(starter.safetyBoundary.aiUsed).toBe(false);
        expect(starter.safetyBoundary.medicalOrRehabEfficacyClaimed).toBe(false);
        expect(starter.safetyBoundary.expertClinicalVerified).toBe(false);
        expect(starter.safetyBoundary.editableByInstructor).toBe(true);

        const check = inspectPresetObjectHealthClaims([
          starter.titleKo,
          starter.subtitleKo,
          starter.descriptionKo,
          starter.recommendedForKo,
          starter.placeholderIdeaPromptKo,
          starter.safetyBoundary.disclaimerKo,
          ...starter.progressiveStepsGuideKo,
        ]);
        expect(check.safe).toBe(true);
        expect(check.matchedClaims).toEqual([]);
      }
    });

    it('rejects unverified medical, rehab, pain cure, clinical guarantee, or diagnosis claims while allowing explicit negative safety disclaimers', () => {
      const forbiddenTexts = [
        '허리 디스크 치료를 위한 30분 리포머 클래스',
        '무릎 수술 후 재활 효과 보장 시퀀스',
        '만성 허리 통증 완치 및 근본 해결 프로그램',
        '거북목 및 척추 측만증 체형교정 보장 루틴',
        '대학병원 임상 검증 완료 의학적 효능 보증 블록',
        '요추 협착증 환자 처방 전용 브릿지 루틴',
      ];

      for (const badText of forbiddenTexts) {
        const res = inspectUnverifiedHealthOrRehabClaims(badText);
        expect(res.safe, `Expected "${badText}" to be rejected`).toBe(false);
        expect(res.matchedClaims.length).toBeGreaterThan(0);
        expect(res.reasonKo).toBeDefined();
      }

      // Official negative disclaimer is allowed
      const disclaimerRes = inspectUnverifiedHealthOrRehabClaims(
        DEFAULT_PRESET_SAFETY_BOUNDARY.disclaimerKo,
      );
      expect(disclaimerRes.safe).toBe(true);
      expect(disclaimerRes.matchedClaims).toEqual([]);

      // Mixing a negative disclaimer with a positive claim must STILL be rejected
      const mixedClaimRes = inspectUnverifiedHealthOrRehabClaims(
        `${DEFAULT_PRESET_SAFETY_BOUNDARY.disclaimerKo} 하지만 이 시퀀스는 허리 디스크 치료와 통증 완치를 보장합니다.`,
      );
      expect(mixedClaimRes.safe).toBe(false);
      expect(mixedClaimRes.matchedClaims.length).toBeGreaterThan(0);
    });
  });

  describe('5. Editability, Template Isolation, & P1/P5 Interoperability', () => {
    it('instantiates class presets into editable SavedSequence (passing sequenceSchema) and ConditionTemplate without mutating OFFLINE_CLASS_PRESETS', () => {
      const sourcePreset = getOfflineClassPresetById('preset-class-reformer-50-signature-flow-15')!;
      const beforeJson = JSON.stringify(sourcePreset);

      const instantiated = instantiateClassPresetAsEditableSequence(
        sourcePreset,
        {
          title: '강사 커스텀 50분 시그니처 수업',
          nowIso: '2026-11-06T09:00:00.000Z',
        },
        INITIAL_EXERCISES,
      );

      expect(instantiated.isEditableCopy).toBe(true);
      expect(instantiated.sourcePresetId).toBe(sourcePreset.id);
      expect(sequenceSchema.safeParse(instantiated.sequence).success).toBe(true);
      expect(templateSchema.safeParse(instantiated.conditionTemplate).success).toBe(true);

      // Edit step duration and instructorNote via editSequenceStepWithIsolation
      const editedSteps = editSequenceStepWithIsolation(instantiated.sequence.steps, 0, {
        durationMin: 6,
        instructorNote: '강사가 직접 수정한 웜업 큐잉 메모',
      });
      expect(editedSteps[0].durationMin).toBe(6);
      expect(editedSteps[0].instructorNote).toBe('강사가 직접 수정한 웜업 큐잉 메모');

      // Instantiate with scaled targetMinutes (e.g., 50 -> 40 min)
      const scaledInstantiated = instantiateClassPresetAsEditableSequence(
        sourcePreset,
        { targetMinutes: 40 },
        INITIAL_EXERCISES,
      );
      expect(scaledInstantiated.sequence.targetMinutes).toBe(40);
      expect(sequenceSchema.safeParse(scaledInstantiated.sequence).success).toBe(true);

      // Verify original preset in OFFLINE_CLASS_PRESETS is completely untouched
      expect(JSON.stringify(sourcePreset)).toBe(beforeJson);
      expect(sourcePreset.steps[0].durationMin).toBe(4);
    });

    it('instantiates and inserts block presets with blockInstanceId and detaches cleanly upon step edit without mutating OFFLINE_BLOCK_PRESETS', () => {
      const sourceBlock = getOfflineBlockPresetById('block-reformer-main-footwork-alignment-15')!;
      const beforeBlockJson = JSON.stringify(sourceBlock);

      const reusableCopy = instantiateBlockPresetAsReusableBlock(
        sourceBlock,
        { title: '강사 커스텀 풋워크 블록', durationMin: 12 },
        INITIAL_EXERCISES,
      );
      expect(reusableBlockSchema.safeParse(reusableCopy).success).toBe(true);
      expect(reusableCopy.title).toBe('강사 커스텀 풋워크 블록');
      const totalScaledSec = reusableCopy.items.reduce(
        (sum, item) => sum + Math.round(item.durationMin * 60),
        0,
      );
      expect(totalScaledSec).toBe(12 * 60);

      // Insert block preset into an existing sequence
      const baseClass = instantiateClassPresetAsEditableSequence(OFFLINE_CLASS_PRESETS[0]);
      const inserted = insertBlockPresetIntoSequence(
        baseClass.sequence.steps,
        sourceBlock,
        { insertAtIndex: 1 },
        INITIAL_EXERCISES,
      );

      expect(inserted.blockInstanceId).toBeTruthy();
      const blockSteps = inserted.steps.filter(
        (step) => step.blockInstanceId === inserted.blockInstanceId,
      );
      expect(blockSteps).toHaveLength(sourceBlock.items.length);
      expect(blockSteps.every((step) => step.blockInstanceDetached === false)).toBe(true);

      // Edit one step of the inserted block instance -> detaches instance cleanly
      const firstBlockStepIdx = inserted.steps.findIndex(
        (step) => step.blockInstanceId === inserted.blockInstanceId,
      );
      const afterEditSteps = editSequenceStepWithIsolation(inserted.steps, firstBlockStepIdx, {
        instructorNote: '이 수업에서만 써클링 대신 미니볼로 변경',
      });

      const detachedSteps = afterEditSteps.filter(
        (step) => step.blockInstanceId === inserted.blockInstanceId,
      );
      expect(detachedSteps.every((step) => step.blockInstanceDetached === true)).toBe(true);

      // Original block preset remains completely unchanged
      expect(JSON.stringify(sourceBlock)).toBe(beforeBlockJson);
    });

    it('converts block presets to valid P5 P1ReusableBlockContract (isReviewed: true) without AI calls and filters presets accurately', () => {
      for (const block of OFFLINE_BLOCK_PRESETS) {
        const contract = toP5ReusableBlockContract(block);
        expect(contract.id).toBe(block.id);
        expect(contract.title).toBe(block.title);
        expect(contract.apparatus).toBe(block.apparatus);
        expect(contract.level).toBe(block.level);
        expect(contract.category).toBe(block.category);
        expect(contract.durationMin).toBe(block.durationMin);
        expect(contract.isReviewed).toBe(true);
        expect(contract.steps).toHaveLength(block.items.length);
      }

      // Filtering class presets
      expect(filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, { durationMinutes: 50 })).toHaveLength(
        6,
      );
      expect(
        filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, {
          apparatus: 'cadillac',
          level: '2.0',
        }).map((p) => p.id),
      ).toEqual(['preset-class-cadillac-50-tower-master-20']);
      expect(
        filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, {
          theme: 'lower-glute-balance',
        }).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, {
          availableEquipment: ['mat'],
        }).every((p) => p.apparatus === 'mat'),
      ).toBe(true);
      expect(
        filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, {
          searchQuery: '스쿠터',
        }).map((p) => p.id),
      ).toContain('preset-class-reformer-45-glute-split-balance-15');

      // Filtering block presets
      expect(
        filterOfflineBlockPresets(OFFLINE_BLOCK_PRESETS, { sectionRole: 'preparation' }),
      ).toHaveLength(5);
      expect(
        filterOfflineBlockPresets(OFFLINE_BLOCK_PRESETS, { sectionRole: 'cooldown' }),
      ).toHaveLength(2);
      expect(
        filterOfflineBlockPresets(OFFLINE_BLOCK_PRESETS, {
          apparatus: 'barrel',
          level: '2.0',
          category: 'extension',
        }).map((b) => b.id),
      ).toEqual(['block-barrel-main-swan-sidebend-20']);
      expect(
        filterOfflineBlockPresets(OFFLINE_BLOCK_PRESETS, {
          searchQuery: '파라키트',
        }).map((b) => b.id),
      ).toEqual(['block-cadillac-main-pushthrough-parakeet-20']);
    });
  });

  describe('6. Blank Draft Starter Options for New Movement Creators (새 동작 창작 사용자 시나리오)', () => {
    it('supports all 4 BlankDraftStarterKind modes via startFromBlankDraftOption without AI calls', () => {
      const seenKinds = new Set<BlankDraftStarterKind>();

      for (const starter of BLANK_DRAFT_STARTER_OPTIONS) {
        seenKinds.add(starter.starterKind);
        const bundle = startFromBlankDraftOption(
          starter,
          {
            ideaLine: '리포머 캐리지 위에서 미니볼을 발목에 끼우고 호흡과 암 서클을 연결하는 새 동작',
            workingNameKo: '미니볼 발목 암 서클 플로우',
            nowIso: '2026-11-06T10:00:00.000Z',
          },
          INITIAL_EXERCISES,
        );

        expect(bundle.starterId).toBe(starter.id);
        expect(bundle.starterKind).toBe(starter.starterKind);
        expect(bundle.safetyBoundary.aiUsed).toBe(false);
        expect(bundle.safetyBoundary.medicalOrRehabEfficacyClaimed).toBe(false);
        expect(bundle.safetyBoundary.editableByInstructor).toBe(true);
        expect(bundle.guidanceNoticesKo.length).toBeGreaterThan(0);

        if (starter.starterKind === 'blank-movement-idea') {
          expect(bundle.humanMovementDraft).toBeDefined();
          expect(bundle.humanMovementDraft?.completenessStage).toBe('idea-only');
          expect(bundle.humanMovementDraft?.safetyBoundary.objectiveEfficacyClaimed).toBe(false);
        } else if (starter.starterKind === 'blank-reusable-block') {
          expect(bundle.humanMovementDraft).toBeDefined();
          expect(bundle.reusableBlockDraft).toBeDefined();
          expect(bundle.reusableBlockDraft?.items[0].humanDraftId).toBe(
            bundle.humanMovementDraft?.id,
          );
        } else if (starter.starterKind === 'blank-class-sequence') {
          expect(bundle.sequenceDraft).toBeDefined();
          expect(sequenceSchema.safeParse(bundle.sequenceDraft).success).toBe(true);
        } else if (starter.starterKind === 'blank-custom-movement-showcase') {
          expect(bundle.humanMovementDraft).toBeDefined();
          expect(bundle.reusableBlockDraft).toBeDefined();
          expect(bundle.sequenceDraft).toBeDefined();
          expect(
            bundle.sequenceDraft?.steps.some(
              (step) => step.humanDraftId === bundle.humanMovementDraft?.id,
            ),
          ).toBe(true);
        }
      }

      expect([...seenKinds].sort()).toEqual([
        'blank-class-sequence',
        'blank-custom-movement-showcase',
        'blank-movement-idea',
        'blank-reusable-block',
      ]);
    });

    it('walks through the full girlfriend/instructor new movement creation flow: 1-line idea -> feel log -> modification log -> local photo -> block & class sequence -> immutable ClassSequenceSnapshot', () => {
      // Step 1: Start from a blank movement idea starter with ONLY a 1-line idea
      const ideaStarter = getBlankDraftStarterById('starter-blank-movement-idea-note')!;
      const session = startFromBlankDraftOption(ideaStarter, {
        ideaLine: '체어 시트에 앉아 써클링을 쥐고 골반 록과 흉추 회전을 연결하는 창작 동작',
        nowIso: '2026-11-06T10:00:00.000Z',
      });

      let draft = session.humanMovementDraft!;
      expect(draft).toBeDefined();
      expect(draft.completenessStage).toBe('idea-only');
      expect(draft.apparatus).toBeUndefined();
      expect(draft.defaultDurationMin).toBeUndefined();
      expect(draft.safetyBoundary.objectiveEfficacyClaimed).toBe(false);
      expect(draft.safetyBoundary.aiSafetyGuaranteed).toBe(false);
      expect(draft.safetyBoundary.expertVerified).toBe(false);

      // Step 2: Try the movement and record subjective feel
      draft = addSubjectiveFeelToDraft(draft, {
        feelNoteKo: '좌골 지지 감각이 또렷해지고 옆구리 회전이 부드럽게 연결됨',
        perceivedIntensity: 'moderate',
        cautionFeelKo: '어깨가 으쓱하지 않게 갈비뼈 아랫부분 호흡을 먼저 안내할 것',
        now: '2026-11-06T10:10:00.000Z',
      });
      expect(draft.completenessStage).toBe('practiced-recorded');
      expect(draft.feelLogs).toHaveLength(1);
      expect(draft.feelLogs[0].objectiveEfficacyClaimed).toBe(false);

      // Step 3: Record a modification point and local photo reference
      draft = addModificationLogToDraft(draft, {
        modificationPointKo: '초급 회원님께는 써클링 대신 미니볼을 가슴 앞에 가볍게 쥐도록 조정',
        setupOrSpringChangeKo: '좌면 중앙보다 살짝 앞쪽에 앉아 고관절 굴곡 부담 완화',
        cueChangeKo: '날개뼈를 바지 뒷주머니 쪽으로 내리며 정수리 길어지기',
        now: '2026-11-06T10:15:00.000Z',
      });
      draft = addPhotoReferenceToDraft(draft, {
        localRefUri: 'local-photo://chair-ring-rotation-pose-01.jpg',
        captionKo: '체어 시티드 써클링 회전 시작 자세',
        angleTag: 'start-pose',
        now: '2026-11-06T10:18:00.000Z',
      });
      draft = refineHumanDraftMetadata(draft, {
        workingNameKo: '체어 시티드 써클링 골반 록 & 트위스트',
        apparatus: 'chair',
        sectionRole: 'main',
        blockCategory: 'upper-body',
        level: '1.0',
        defaultDurationMin: 5,
        isUnilateral: true,
        sideMode: 'left-then-right',
        now: '2026-11-06T10:20:00.000Z',
      });
      expect(draft.completenessStage).toBe('class-ready');
      expect(draft.revision).toBe(5);
      expect(draft.photoReferences[0].externalAiUploadAllowed).toBe(false);

      // Step 4: Link the human draft into a blank reusable block
      const blockStarter = getBlankDraftStarterById('starter-blank-reusable-block-builder')!;
      const blockBundle = startFromBlankDraftOption(blockStarter, {
        title: '체어 창작 상·하체 연결 블록',
        apparatus: 'chair',
        level: '1.0',
        durationMinutes: 4,
      });
      const linkedBlockResult = linkHumanDraftToReusableBlock(
        blockBundle.reusableBlockDraft!,
        draft,
        undefined,
        '2026-11-06T10:25:00.000Z',
      );
      expect(linkedBlockResult.block.items).toHaveLength(2);
      expect(linkedBlockResult.block.items[1].humanDraftId).toBe(draft.id);
      expect(linkedBlockResult.block.items[1].humanDraftRevision).toBe(draft.revision);

      // Step 5: Link the human draft into a framed blank class sequence and freeze as a ClassSequenceSnapshot
      const framedStarter = getBlankDraftStarterById('starter-blank-class-sequence-framed')!;
      const framedBundle = startFromBlankDraftOption(framedStarter, {
        title: '체어 20분 창작 동작 테스트 수업',
        apparatus: 'chair',
        level: '1.0',
        durationMinutes: 20,
      });

      const linkedSeqResult = linkHumanDraftToSequence(framedBundle.sequenceDraft!.steps, draft, {
        afterStepIndex: 1,
        now: '2026-11-06T10:30:00.000Z',
      });
      const updatedSequence = {
        ...framedBundle.sequenceDraft!,
        targetMinutes: 25,
        steps: linkedSeqResult.steps,
      };

      const validationReport = validateSequenceStructure(
        updatedSequence.steps,
        INITIAL_EXERCISES,
        {
          targetMinutes: 25,
          level: '1.0',
          humanDrafts: [draft],
        },
      );
      expect(validationReport.valid).toBe(true);
      expect(validationReport.canConfirmClass).toBe(true);

      const snapshot = createClassSequenceSnapshot(
        updatedSequence,
        INITIAL_EXERCISES,
        '2026-11-06T10:35:00.000Z',
        [draft],
      );
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.steps)).toBe(true);
      expect(snapshot.sourceSequenceId).toBe(updatedSequence.id);
      expect(snapshot.targetMinutes).toBe(25);
      expect(snapshot.exerciseSnapshots[draft.id]).toBeDefined();
      expect(movementSnapshotSchema.safeParse(snapshot.exerciseSnapshots[draft.id]).success).toBe(
        true,
      );
      expect(snapshot.exerciseSnapshots[draft.id].sourceOrigin).toBe('human-created');
      expect(snapshot.exerciseSnapshots[draft.id].humanDraftId).toBe(draft.id);
      expect(snapshot.exerciseSnapshots[draft.id].humanDraftRevision).toBe(5);
      expect(snapshot.exerciseSnapshots[draft.id].feelLogsSnapshot).toHaveLength(1);
      expect(snapshot.exerciseSnapshots[draft.id].modificationLogsSnapshot).toHaveLength(1);
      expect(snapshot.exerciseSnapshots[draft.id].photoReferencesSnapshot).toHaveLength(1);
      expect(
        snapshot.exerciseSnapshots[draft.id].safetyBoundarySnapshot?.objectiveEfficacyClaimed,
      ).toBe(false);
    });
  });
});
