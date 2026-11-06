import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../../data/pilatesCatalog';
import type { ClassSequenceSnapshot } from '../../types/hierarchy';
import type { SavedSequence } from '../../types/pilates';
import type { TeachingProgramSnapshot } from '../../types/teachingHistorySnapshot';
import type { OfflineClassPreset } from '../../types/classBlockPresets';
import { createClassSequenceSnapshot } from '../../utils/hierarchyModel';
import {
  CLASS_CUE_SHEET_FIXTURES,
  buildDefaultCueSheetProjection,
  createSyntheticCueSheetInputs,
  getCueSheetFixtureById,
} from './classCueSheetFixtures';
import {
  SENSITIVE_CUE_SHEET_KEYS,
  buildClassCueSheetProjection,
  escapeCueSheetHtmlText,
  formatClassCueSheetAsPlainText,
  isSensitiveCueSheetKey,
  sanitizeCueSheetPlainText,
} from './classCueSheetProjection';
import {
  DEFAULT_MAX_EXPANDED_ROWS,
  DEFAULT_MAX_INPUT_ITEMS,
  DEFAULT_MAX_NESTING_DEPTH,
  DEFAULT_MAX_REPEAT_PER_BLOCK,
  DEFAULT_MAX_SETS_EXPANSION,
} from './classCueSheetTypes';

function deepFreezeInput<T>(obj: T, seen = new Set<object>()): T {
  if (obj === null || typeof obj !== 'object') return obj;
  const target = obj as unknown as object;
  if (seen.has(target)) return obj;
  seen.add(target);
  if (Array.isArray(obj)) {
    for (const item of obj) deepFreezeInput(item, seen);
    return Object.freeze(obj);
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    deepFreezeInput((obj as Record<string, unknown>)[key], seen);
  }
  return Object.freeze(obj);
}

describe('classCueSheetProjection', () => {
  describe('escapeCueSheetHtmlText & sanitizeCueSheetPlainText', () => {
    it('escapes HTML entities, strips null/control bytes, and neutralizes script/event patterns', () => {
      const raw =
        '  <script>alert("xss")</script>\u0000\r\n<img src=\'x\' onerror=alert(1)> & javascript:evil()  ';
      const escaped = escapeCueSheetHtmlText(raw);
      expect(escaped).not.toContain('\u0000');
      expect(escaped).not.toContain('\r');
      expect(escaped).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).toContain('&lt;img src=&#39;x&#39; onerror=alert(1)&gt; &amp;');

      const sanitized = sanitizeCueSheetPlainText(raw);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('</script');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).toContain('onerror&#61;alert(1)');
      expect(sanitized).toContain('javascript&#58;evil()');
    });

    it('handles null, undefined, non-finite numbers, booleans, and objects safely', () => {
      expect(escapeCueSheetHtmlText(null)).toBe('');
      expect(escapeCueSheetHtmlText(undefined)).toBe('');
      expect(escapeCueSheetHtmlText(Number.NaN)).toBe('');
      expect(escapeCueSheetHtmlText(Number.POSITIVE_INFINITY)).toBe('');
      expect(escapeCueSheetHtmlText(42)).toBe('42');
      expect(escapeCueSheetHtmlText(true)).toBe('true');
      expect(escapeCueSheetHtmlText({ a: 1 })).toBe('');
      expect(sanitizeCueSheetPlainText(null)).toBe('');
    });
  });

  describe('Empty class input', () => {
    it('returns an empty projection with empty-class diagnostic and zeroed timing summary', () => {
      const emptyFixture = getCueSheetFixtureById('empty-class');
      const projection = emptyFixture.buildProjection();

      expect(projection.isEmpty).toBe(true);
      expect(projection.itemCount).toBe(0);
      expect(projection.exerciseCount).toBe(0);
      expect(projection.restCount).toBe(0);
      expect(projection.items).toEqual([]);
      expect(projection.expandedRows).toEqual([]);
      expect(projection.timingSummary.knownTotalSec).toBe(0);
      expect(projection.timingSummary.knownItemCount).toBe(0);
      expect(projection.timingSummary.unspecifiedItemCount).toBe(0);
      expect(projection.timingSummary.hasUnspecifiedTime).toBe(false);
      expect(projection.diagnostics.some((d) => d.code === 'empty-class')).toBe(true);

      const plainText = formatClassCueSheetAsPlainText(projection);
      expect(plainText).toContain('등록된 수업 동작 항목이 없습니다.');
    });
  });

  describe('Name-only instructor movements without forced classification or estimated time', () => {
    it('preserves instructor movement names verbatim without inventing apparatus, blockCategory, or duration', () => {
      const projection = getCueSheetFixtureById('name-only-drafts').buildProjection();

      expect(projection.isEmpty).toBe(false);
      expect(projection.itemCount).toBe(4);
      expect(projection.nameOnlyCount).toBe(4);
      expect(projection.boundary.forcedMovementClassification).toBe(false);
      expect(projection.boundary.autoPrescriptionUsed).toBe(false);

      const first = projection.items[0];
      expect(first.originKind).toBe('name-only');
      expect(first.nameKo).toBe('갈비뼈 호흡 깨우기 &amp; 견갑골 프로트랙션');
      expect(first.setup.apparatus).toBe('unspecified');
      expect(first.setup.apparatusLabelKo).toBe('기구 미지정');
      expect(first.blockMeta.blockCategory).toBeNull();
      expect(first.blockMeta.blockCategoryLabelKo).toBe('분류 미지정');
      expect(first.blockMeta.sectionRole).toBe('unspecified');
      expect(first.timing.status).toBe('unspecified');
      expect(first.timing.durationMin).toBeNull();
      expect(first.timing.totalSec).toBeNull();
      expect(first.timing.displayLabelKo).toBe('시간 미정');
      expect(first.timing.detailLabelKo).toContain('임의 추정 없음');

      // Item 4 has an explicit durationMin: 3, while Items 1..3 are unspecified
      expect(projection.timingSummary.knownItemCount).toBe(1);
      expect(projection.timingSummary.unspecifiedItemCount).toBe(3);
      expect(projection.timingSummary.hasUnspecifiedTime).toBe(true);
      expect(projection.timingSummary.knownTotalSec).toBe(180);
      expect(projection.timingSummary.timingSummaryLabelKo).toContain(
        '시간 미정 3개 항목 별도 · 임의 추정 없음',
      );

      expect(projection.diagnostics.some((d) => d.code === 'name-only-movement')).toBe(true);
      expect(projection.diagnostics.some((d) => d.code === 'unspecified-time')).toBe(true);
    });
  });

  describe('Long Korean cues, empty cues, duplicate movement names, and duplicate stepIds', () => {
    it('assigns unique cueItemIds and disambiguators for duplicate movement names and duplicate stepIds', () => {
      const projection = getCueSheetFixtureById(
        'long-korean-cues-empty-cues-duplicates',
      ).buildProjection();

      expect(projection.itemCount).toBe(6);
      expect(projection.duplicateNameGroupCount).toBe(2);

      // All cueItemIds must be distinct even when stepIds and names collide
      const cueItemIds = projection.items.map((item) => item.cueItemId);
      expect(new Set(cueItemIds).size).toBe(projection.items.length);

      // Item 1 has long Korean cues
      expect(projection.items[0].cueContent.isLongCue).toBe(true);
      expect(projection.items[0].cueContent.hasCues).toBe(true);

      // Item 2 and Item 4 have empty cues
      expect(projection.items[1].cueContent.hasCues).toBe(false);
      expect(projection.items[1].cueContent.emptyCueLabelKo).toBe('등록된 큐잉 메모 없음');
      expect(projection.items[3].cueContent.hasCues).toBe(false);

      // Item 1, 3, 6 share the same movement name ('펠빅 클락 & 흉식 호흡 임프린팅')
      expect(projection.items[0].isDuplicateName).toBe(true);
      expect(projection.items[0].duplicateNameOccurrence).toBe(1);
      expect(projection.items[0].duplicateNameTotal).toBe(3);
      expect(projection.items[0].duplicateDisambiguatorKo).toBe('동일 이름 #1 (01번 항목)');

      expect(projection.items[2].isDuplicateName).toBe(true);
      expect(projection.items[2].duplicateNameOccurrence).toBe(2);
      expect(projection.items[2].duplicateNameTotal).toBe(3);
      expect(projection.items[2].duplicateDisambiguatorKo).toBe('동일 이름 #2 (03번 항목)');

      expect(projection.items[5].isDuplicateName).toBe(true);
      expect(projection.items[5].duplicateNameOccurrence).toBe(3);
      expect(projection.items[5].duplicateNameTotal).toBe(3);
      expect(projection.items[5].duplicateDisambiguatorKo).toBe('동일 이름 #3 (06번 항목)');

      // Diagnostics for empty-cue, duplicate-movement-name, and duplicate-step-id
      const codes = projection.diagnostics.map((d) => d.code);
      expect(codes).toContain('empty-cue');
      expect(codes).toContain('duplicate-movement-name');
      expect(codes).toContain('duplicate-step-id');
    });
  });

  describe('Nested block repetitions, unilateral L/R modes, sets, and unspecified time preservation', () => {
    it('expands block repetitions, sets, and unilateral sides accurately while capping excess depth and repeats', () => {
      const projection = getCueSheetFixtureById(
        'nested-repeats-unilateral-unspecified-time',
      ).buildProjection();

      // Item 1: left-then-right, sets: 2, blockRepetitions: 2 -> 2 * 2 * 2 = 8 expanded rows
      const item1 = projection.items[0];
      expect(item1.practice.sideMode).toBe('left-then-right');
      expect(item1.practice.sideLabelsKo).toEqual(['왼쪽', '오른쪽']);
      expect(item1.practice.sets).toBe(2);
      expect(item1.blockMeta.blockRepetitionCount).toBe(2);
      expect(item1.timing.status).toBe('known');
      expect(item1.timing.sides).toBe(2);

      const item1Rows = projection.expandedRows.filter(
        (r) => r.parentCueItemId === item1.cueItemId,
      );
      expect(item1Rows).toHaveLength(8);
      expect(item1Rows[0].sideLabelKo).toBe('왼쪽');
      expect(item1Rows[1].sideLabelKo).toBe('오른쪽');
      expect(item1Rows[0].setIndex).toBe(1);
      expect(item1Rows[2].setIndex).toBe(2);
      expect(item1Rows[0].blockRepetitionIndex).toBe(1);
      expect(item1Rows[4].blockRepetitionIndex).toBe(2);

      // Item 2: right-then-left, unspecified duration
      const item2 = projection.items[1];
      expect(item2.practice.sideMode).toBe('right-then-left');
      expect(item2.practice.sideLabelsKo).toEqual(['오른쪽', '왼쪽']);
      expect(item2.timing.status).toBe('unspecified');
      expect(item2.timing.durationMin).toBeNull();
      expect(item2.timing.totalSec).toBeNull();

      // Item 3 & 4: left only and right only, unspecified duration
      expect(projection.items[2].practice.sideMode).toBe('left');
      expect(projection.items[2].practice.sideLabelsKo).toEqual(['왼쪽']);
      expect(projection.items[3].practice.sideMode).toBe('right');
      expect(projection.items[3].practice.sideLabelsKo).toEqual(['오른쪽']);

      // Item 5: inside child block with repetitions: 20 -> capped at DEFAULT_MAX_REPEAT_PER_BLOCK (12)
      const item5 = projection.items[4];
      expect(item5.practice.sideMode).toBe('together');
      expect(item5.practice.sideLabelsKo).toEqual(['양쪽 함께']);
      expect(item5.blockMeta.blockRepetitionCount).toBe(DEFAULT_MAX_REPEAT_PER_BLOCK);

      // Item 6: deep nested leaf capped at DEFAULT_MAX_NESTING_DEPTH (6)
      const item6 = projection.items[5];
      expect(item6.blockMeta.nestingDepth).toBe(DEFAULT_MAX_NESTING_DEPTH);

      expect(projection.truncation.isTruncated).toBe(true);
      expect(projection.truncation.cappedBlockRepetitionCount).toBeGreaterThan(0);
      expect(projection.truncation.cappedDepthCount).toBeGreaterThan(0);
      expect(projection.diagnostics.some((d) => d.code === 'block-repeat-capped')).toBe(true);
      expect(projection.diagnostics.some((d) => d.code === 'nesting-depth-capped')).toBe(true);
    });
  });

  describe('100+ items synthetic class and bounded truncation', () => {
    it('handles 100-item class cleanly and enforces finite caps when input or expanded rows exceed limits', () => {
      // 1. Exactly 100 bilateral items (1 set) -> fits within 150 input items and 240 expanded rows without truncation
      const hundredExactInput = {
        id: 'hundred-exact',
        title: '100개 동작 정밀 큐시트',
        steps: Array.from({ length: 100 }, (_, i) => ({
          stepId: `s-${i + 1}`,
          nameKo: `필라테스 동작 #${i + 1}`,
          durationMin: 1,
          sideMode: 'together' as const,
          cues: [`${i + 1}번째 큐잉`],
        })),
      };
      const hundredExactProj = buildClassCueSheetProjection(hundredExactInput);
      expect(hundredExactProj.itemCount).toBe(100);
      expect(hundredExactProj.expandedRows).toHaveLength(100);
      expect(hundredExactProj.truncation.isTruncated).toBe(false);

      // 2. Fixture with 160 items (sets=2, unilateral alternating) -> caps at 150 items and 240 expanded rows
      const boundedProj = getCueSheetFixtureById('hundred-items-bounded').buildProjection();
      expect(boundedProj.itemCount).toBe(DEFAULT_MAX_INPUT_ITEMS);
      expect(boundedProj.truncation.omittedInputItemCount).toBe(160 - DEFAULT_MAX_INPUT_ITEMS);
      expect(boundedProj.expandedRows).toHaveLength(DEFAULT_MAX_EXPANDED_ROWS);
      expect(boundedProj.truncation.omittedExpandedRowCount).toBeGreaterThan(0);
      expect(boundedProj.truncation.isTruncated).toBe(true);
      expect(boundedProj.truncation.reasonsKo.length).toBeGreaterThanOrEqual(2);
      expect(boundedProj.diagnostics.some((d) => d.code === 'input-truncated')).toBe(true);
      expect(boundedProj.diagnostics.some((d) => d.code === 'expansion-truncated')).toBe(true);

      const textOut = formatClassCueSheetAsPlainText(boundedProj, { includeExpandedRows: true });
      expect(textOut).toContain('[축약/제한 안내]');
      expect(textOut).toContain('[전개 행 목록 (240행)]');
    });

    it('enforces maxSetsExpansion cap when sets on an item exceed DEFAULT_MAX_SETS_EXPANSION', () => {
      const proj = buildClassCueSheetProjection({
        title: '과다 세트 제한 검증',
        steps: [
          {
            stepId: 's-sets-99',
            nameKo: '과다 세트 코어 동작',
            durationMin: 4,
            sets: 25,
            sideMode: 'together',
            cues: ['세트 제한 확인'],
          },
        ],
      });
      expect(proj.expandedRows).toHaveLength(DEFAULT_MAX_SETS_EXPANSION);
      expect(proj.truncation.isTruncated).toBe(true);
      expect(proj.diagnostics.some((d) => d.code === 'expansion-truncated')).toBe(true);
    });
  });

  describe('Corrupted & circular inputs, privacy allowlist filtering, and HTML escaping', () => {
    it('terminates finitely on circular references, strips all sensitive keys/inline PII, and escapes HTML/scripts', () => {
      const projection = getCueSheetFixtureById(
        'corrupted-circular-sensitive-html',
      ).buildProjection();

      // Circular reference detection
      expect(projection.truncation.circularReferenceCount).toBeGreaterThan(0);
      expect(projection.truncation.isTruncated).toBe(true);
      expect(projection.diagnostics.some((d) => d.code === 'circular-reference')).toBe(true);
      expect(projection.diagnostics.some((d) => d.code === 'corrupted-item')).toBe(true);
      expect(projection.diagnostics.some((d) => d.code === 'sensitive-fields-stripped')).toBe(true);

      // Privacy allowlist verification
      expect(projection.privacy.allowlistApplied).toBe(true);
      expect(projection.privacy.strippedSensitiveKeys).toEqual(
        expect.arrayContaining([
          'participantName',
          'memberName',
          'groupName',
          'phone',
          'email',
          'medicalHistory',
          'diagnosis',
          'healthNotes',
          'instructorObservations',
          'personalConstraint',
          'feelLogs',
          'photoReferences',
        ]),
      );
      expect(projection.privacy.redactedInlineTextCount).toBeGreaterThan(0);

      const serialized = JSON.stringify(projection);
      const plainText = formatClassCueSheetAsPlainText(projection, { includeExpandedRows: true });

      // Sensitive values must NEVER appear anywhere in serialized projection or plain text
      for (const forbiddenSecret of [
        '홍길동',
        '길동님',
        '이영희',
        '김필라',
        '최수진',
        '화목 오후 프라이빗 케어반',
        '010-5555-7777',
        '010-1234-5678',
        '010-3333-4444',
        'private@member.com',
        'kim@pilates.kr',
        '920304-2345678',
        '경추 5-6번 추간판 팽윤',
        '경추 디스크',
        '요추 추간판 탈출증',
        '무릎 연골연화증',
        '오른쪽 발목 염좌',
        '임신 16주차',
        '소염진통제 복용 중',
        '비공개 체감 로그',
        'file:///secret/photo.jpg',
      ]) {
        expect(serialized).not.toContain(forbiddenSecret);
        expect(plainText).not.toContain(forbiddenSecret);
      }

      // Raw HTML / script / event handler tags must NEVER appear unescaped
      for (const rawInjection of [
        '<script',
        '</script',
        '<img',
        '<svg',
        '<iframe',
        '<style',
        'onerror=',
        'onload=',
        'javascript:',
      ]) {
        expect(serialized).not.toContain(rawInjection);
        expect(plainText).not.toContain(rawInjection);
      }

      expect(projection.title).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('handles null, undefined, primitive, and malformed root inputs without throwing', () => {
      for (const badInput of [null, undefined, 42, 'invalid', true, [], {}]) {
        const result = buildClassCueSheetProjection(badInput);
        expect(result.isEmpty).toBe(true);
        expect(result.diagnostics.some((d) => d.code === 'corrupted-input')).toBe(true);
        expect(Object.isFrozen(result)).toBe(true);
      }
    });

    it('recognizes all configured sensitive keys via isSensitiveCueSheetKey', () => {
      for (const key of SENSITIVE_CUE_SHEET_KEYS) {
        expect(isSensitiveCueSheetKey(key)).toBe(true);
        expect(isSensitiveCueSheetKey(key.toUpperCase())).toBe(true);
      }
      expect(isSensitiveCueSheetKey('title')).toBe(false);
      expect(isSensitiveCueSheetKey('durationMin')).toBe(false);
      expect(isSensitiveCueSheetKey('cues')).toBe(false);
    });
  });

  describe('Input immutability and output determinism', () => {
    it('never mutates frozen or unfrozen inputs and returns identical deep-frozen projections across calls', () => {
      const inputs = createSyntheticCueSheetInputs();

      for (const fixture of CLASS_CUE_SHEET_FIXTURES) {
        const rawInput = inputs[fixture.fixtureId];
        // For non-cyclic inputs, compare JSON before and after & deep freeze before calling
        if (fixture.fixtureId !== 'corrupted-circular-sensitive-html') {
          const snapshotBefore = JSON.stringify(rawInput);
          deepFreezeInput(rawInput);
          const projA = buildClassCueSheetProjection(rawInput);
          const projB = buildClassCueSheetProjection(rawInput);
          const snapshotAfter = JSON.stringify(rawInput);

          expect(snapshotAfter).toBe(snapshotBefore);
          expect(projA).toEqual(projB);
          expect(Object.isFrozen(projA)).toBe(true);
          expect(Object.isFrozen(projA.items)).toBe(true);
          expect(Object.isFrozen(projA.expandedRows)).toBe(true);
        } else {
          deepFreezeInput(rawInput);
          const projA = buildClassCueSheetProjection(rawInput);
          const projB = buildClassCueSheetProjection(rawInput);
          expect(projA).toEqual(projB);
          expect(Object.isFrozen(projA)).toBe(true);
        }
      }

      const defaultProj = buildDefaultCueSheetProjection();
      expect(defaultProj.cueSheetId).toBe(CLASS_CUE_SHEET_FIXTURES[0].buildProjection().cueSheetId);
    });
  });

  describe('Compatibility with SavedSequence, ClassSequenceSnapshot, TeachingProgramSnapshot, and OfflineClassPreset', () => {
    it('projects SavedSequence and ClassSequenceSnapshot cleanly', () => {
      const savedSequence: SavedSequence = INITIAL_SAVED_SEQUENCES[0];
      const seqProjection = buildClassCueSheetProjection(savedSequence, {
        exercises: INITIAL_EXERCISES,
      });

      expect(seqProjection.isEmpty).toBe(false);
      expect(seqProjection.itemCount).toBe(savedSequence.steps.length);
      expect(seqProjection.title).toBe(sanitizeCueSheetPlainText(savedSequence.title));
      expect(seqProjection.items.every((item) => item.originKind === 'catalog')).toBe(true);
      expect(seqProjection.timingSummary.unspecifiedItemCount).toBe(0);
      expect(seqProjection.timingSummary.knownTotalSec).toBe(50 * 60);

      const snapshot: ClassSequenceSnapshot = createClassSequenceSnapshot(
        savedSequence,
        INITIAL_EXERCISES,
      );
      const snapProjection = buildClassCueSheetProjection(snapshot);

      expect(snapProjection.itemCount).toBe(savedSequence.steps.length);
      expect(snapProjection.items.every((item) => item.originKind === 'snapshot')).toBe(true);
      expect(snapProjection.timingSummary.knownTotalSec).toBe(50 * 60);
    });

    it('projects TeachingProgramSnapshot and OfflineClassPreset cleanly', () => {
      const firstEx = INITIAL_EXERCISES[0];
      const teachingSnapshot: TeachingProgramSnapshot = {
        snapshotVersion: 1,
        recordKind: 'completed-history',
        sourceKind: 'saved-sequence',
        sourceSequenceId: 'seq-reformer-signature-50',
        sourceSequenceTitle: '완료 수업 프로그램 스냅샷 50분',
        sourceSubtitle: '히스토리 스냅샷 호환성 검증',
        taughtAt: '2026-11-05T10:00:00.000Z',
        capturedAt: '2026-11-05T11:00:00.000Z',
        completionFingerprint: 'fp-01',
        timing: {
          plannedTotalSec: 300,
          plannedExerciseSec: 240,
          plannedRestSec: 60,
        },
        exercisesById: {
          [firstEx.id]: {
            ...firstEx,
            capturedAt: '2026-11-05T11:00:00.000Z',
            sourceOrigin: 'catalog',
          },
        },
        items: [
          {
            order: 1,
            stepId: 'tp-step-1',
            kind: 'exercise',
            exerciseId: firstEx.id,
            blockCategory: firstEx.blockCategory,
            blockNameKo: '호흡 예열',
            blockNameEn: 'Warmup',
            classSection: 'opening',
            classSectionLabelKo: '오프닝',
            durationMin: 4,
            explanationSec: 20,
            transitionSec: 10,
            movementSec: 210,
            selectedLayer: 'standard',
            selectedLayerLabelKo: 'Standard',
            selectedLayerDescription: firstEx.layers.standard,
            effectiveSprings: firstEx.springs,
            instructorNote: '스냅샷 수업 메모',
          },
          {
            order: 2,
            stepId: 'tp-step-2',
            kind: 'rest',
            exerciseId: '',
            blockCategory: 'core',
            blockNameKo: '휴식',
            blockNameEn: 'Rest',
            classSection: 'main',
            classSectionLabelKo: '메인',
            durationMin: 1,
            explanationSec: 0,
            transitionSec: 0,
            movementSec: 0,
            selectedLayer: 'standard',
            selectedLayerLabelKo: 'Standard',
            selectedLayerDescription: '',
            effectiveSprings: '',
          },
        ],
      };

      const tpProjection = buildClassCueSheetProjection(teachingSnapshot);
      expect(tpProjection.title).toBe('완료 수업 프로그램 스냅샷 50분');
      expect(tpProjection.itemCount).toBe(2);
      expect(tpProjection.exerciseCount).toBe(1);
      expect(tpProjection.restCount).toBe(1);
      expect(tpProjection.items[0].originKind).toBe('snapshot');
      expect(tpProjection.items[0].blockMeta.sectionRole).toBe('preparation');
      expect(tpProjection.timingSummary.knownTotalSec).toBe(300);

      const presetInput: Partial<OfflineClassPreset> = {
        id: 'preset-test-30',
        presetKind: 'class-sequence',
        title: '오프라인 프리셋 30분 수업',
        subtitle: '프리셋 호환 검증',
        durationMinutes: 30,
        apparatus: 'reformer',
        level: '1.0',
        steps: [
          {
            stepId: 'pr-1',
            order: 1,
            blockCategory: 'warmup',
            exerciseId: firstEx.id,
            durationMin: 4,
            selectedLayer: 'easy',
          },
        ],
      };

      const presetProj = buildClassCueSheetProjection(presetInput);
      expect(presetProj.title).toBe('오프라인 프리셋 30분 수업');
      expect(presetProj.timingSummary.targetMinutes).toBe(30);
      expect(presetProj.itemCount).toBe(1);
    });
  });
});
