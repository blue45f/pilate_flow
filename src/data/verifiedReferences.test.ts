import { describe, expect, it } from 'vitest';
import overseasRaw from './sourceCatalog/verified-source-catalog.json?raw';
import koreanRaw from './sourceCatalog/korean-candidate-catalog.json?raw';
import { SOURCE_CATALOG_SUMMARY, VERIFIED_REFERENCES } from './verifiedReferences';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import { EQUIPMENT_IDS, PROP_IDS } from './equipmentCatalog';
import { matchesLibraryEquipment } from './libraryEquipmentFilters';

const overseas = JSON.parse(overseasRaw);
const korean = JSON.parse(koreanRaw);

describe('public source ledger boundaries', () => {
  it('preserves 30 distinct references: 18 overseas movements, 3 series and 9 domestic candidates', () => {
    expect(VERIFIED_REFERENCES).toHaveLength(30);
    expect(new Set(VERIFIED_REFERENCES.map((reference) => reference.id)).size).toBe(30);
    expect(
      VERIFIED_REFERENCES.filter(
        (reference) => reference.region === 'global' && reference.scope === 'exercise',
      ),
    ).toHaveLength(18);
    expect(VERIFIED_REFERENCES.filter((reference) => reference.scope === 'series')).toHaveLength(3);
    expect(
      VERIFIED_REFERENCES.filter(
        (reference) => reference.verificationStatus === 'korean-candidate',
      ),
    ).toHaveLength(9);
    expect(
      new Set(
        VERIFIED_REFERENCES.filter((reference) => reference.region === 'global').map(
          (reference) => reference.url,
        ),
      ).size,
    ).toBe(16);
    expect(SOURCE_CATALOG_SUMMARY.professionallyApproved).toBe(0);
  });

  it('keeps every source expert-unreviewed and ineligible for automatic generation', () => {
    for (const reference of VERIFIED_REFERENCES) {
      expect(reference.professionalReviewStatus).toBe('unreviewed');
      expect(reference.autoRecommendationEligible).toBe(false);
      expect(reference.generatedMotion).toBe(false);
      expect(INITIAL_EXERCISES.some((exercise) => exercise.id === reference.id)).toBe(false);
    }
  });

  it('records precisely three observed movements from two original website videos', () => {
    const observed = VERIFIED_REFERENCES.filter((reference) => reference.observationPoints.length);
    expect(observed).toHaveLength(3);
    expect(new Set(observed.map((reference) => reference.url)).size).toBe(2);
    expect(
      observed.flatMap((reference) => reference.observationPoints.map((point) => point.seconds)),
    ).toEqual([23, 48.821, 97.429]);
    for (const reference of observed) {
      expect(reference.provider).toBe('website');
      expect(reference.verificationStatus).toBe('partial-playback-checked');
      for (const point of reference.observationPoints) {
        expect(point.kind).toBe('observation');
        expect(point.sourceUrl).toBe(reference.url);
        expect(point.note).toContain('시작점 아님');
      }
    }
  });

  it('never creates exact exercise intervals or transfers observed website times to alternate YouTube videos', () => {
    for (const reference of VERIFIED_REFERENCES) {
      expect(reference.timestamps).toEqual([]);
      expect(new URL(reference.url).searchParams.has('t')).toBe(false);
      expect(new URL(reference.url).searchParams.has('start')).toBe(false);
      expect(new URL(reference.url).searchParams.has('end')).toBe(false);
    }
    expect(VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-01')?.url).not.toBe(
      overseas.sources.chair.alternative_youtube_url,
    );
  });

  it('keeps all class and movement durations unknown, separating original video length', () => {
    for (const reference of VERIFIED_REFERENCES) {
      expect(reference.durationSeconds).toBeNull();
      expect(reference.classDurationSeconds).toBeNull();
    }
    expect(
      VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-01')?.videoDurationSeconds,
    ).toBe(214.548);
    expect(
      VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-02')?.videoDurationSeconds,
    ).toBe(126.877);
    expect(
      VERIFIED_REFERENCES.filter((reference) => reference.region === 'kr').every(
        (reference) => reference.videoDurationSeconds === null,
      ),
    ).toBe(true);
  });

  it('retains incomplete inventories and unsupported accessories without silent substitution', () => {
    for (const reference of VERIFIED_REFERENCES) {
      expect(reference.requirementsKnown).toBe(false);
      expect(
        reference.requiredEquipment.every((id) =>
          EQUIPMENT_IDS.includes(id as (typeof EQUIPMENT_IDS)[number]),
        ),
      ).toBe(true);
      expect(reference.requiredProps.every((id) => PROP_IDS.includes(id))).toBe(true);
    }
    expect(
      VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-06')?.additionalRequirements,
    ).toContain('카디오 트램프');
    expect(
      VERIFIED_REFERENCES.find((reference) => reference.id === 'mv-11')?.additionalRequirements,
    ).toContain('롤다운바');
    expect(
      VERIFIED_REFERENCES.filter((reference) =>
        matchesLibraryEquipment(reference, {
          equipment: [],
          props: [],
          ownedOnly: true,
          ownedEquipment: EQUIPMENT_IDS,
          ownedProps: PROP_IDS,
        }),
      ),
    ).toHaveLength(0);
  });

  it('labels domestic classification and language as unreviewed candidates', () => {
    for (const reference of VERIFIED_REFERENCES.filter((item) => item.region === 'kr')) {
      expect(reference.metadataStatus).toBe('candidate-unreviewed');
      expect(reference.bodyFocusStatus).toBe('unreviewed-name-classification');
      expect(reference.language).toContain('미확인');
      expect(reference.observationPoints).toEqual([]);
      expect(reference.levelLabel).toBe(
        korean.items.find((item: { id: string }) => item.id === reference.id).difficulty,
      );
    }
  });

  it('preserves exact raw source URLs and leaves all media link-only', () => {
    for (const reference of VERIFIED_REFERENCES) {
      const raw = reference.region === 'kr' ? korean.items : overseas.items;
      const item = raw.find((entry: { id: string }) => entry.id === reference.rawItemId);
      expect(item).toBeTruthy();
      expect(reference.url).toBe(item.original_url);
      expect(reference.rights).toBe('link-only');
      expect(reference.verifiedAt).toBe(item.reviewed_at);
    }
  });
});
