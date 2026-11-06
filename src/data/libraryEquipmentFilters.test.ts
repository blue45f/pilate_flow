import { describe, expect, it } from 'vitest';
import {
  matchesLibraryEquipment,
  type EquipmentFilterRequirements,
  type LibraryEquipmentFilters,
} from './libraryEquipmentFilters';

const confirmed: EquipmentFilterRequirements = {
  requiredEquipment: ['reformer', 'chair'],
  requiredProps: ['mini-ball', 'magic-circle'],
  requirementsKnown: true,
};

function filters(overrides: Partial<LibraryEquipmentFilters> = {}): LibraryEquipmentFilters {
  return {
    equipment: [],
    props: [],
    ownedOnly: false,
    ownedEquipment: [],
    ownedProps: [],
    ...overrides,
  };
}

describe('library equipment browsing and ownership', () => {
  it('matches any selected equipment during browsing', () => {
    expect(matchesLibraryEquipment(confirmed, filters({ equipment: ['mat', 'chair'] }))).toBe(true);
    expect(matchesLibraryEquipment(confirmed, filters({ equipment: ['mat', 'tower'] }))).toBe(
      false,
    );
  });

  it('matches any selected prop while requiring both filter groups to match', () => {
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({ equipment: ['reformer'], props: ['foam-roller', 'mini-ball'] }),
      ),
    ).toBe(true);
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({ equipment: ['reformer'], props: ['foam-roller'] }),
      ),
    ).toBe(false);
    expect(
      matchesLibraryEquipment(confirmed, filters({ equipment: ['mat'], props: ['mini-ball'] })),
    ).toBe(false);
  });

  it('requires every equipment item and real prop for owned-only', () => {
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({
          ownedOnly: true,
          ownedEquipment: ['reformer', 'chair', 'mat'],
          ownedProps: ['mini-ball', 'magic-circle'],
        }),
      ),
    ).toBe(true);
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({
          ownedOnly: true,
          ownedEquipment: ['reformer'],
          ownedProps: ['mini-ball', 'magic-circle'],
        }),
      ),
    ).toBe(false);
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({
          ownedOnly: true,
          ownedEquipment: ['reformer', 'chair'],
          ownedProps: ['mini-ball'],
        }),
      ),
    ).toBe(false);
  });

  it('does not let an OR browsing match weaken the owned-only subset requirement', () => {
    expect(
      matchesLibraryEquipment(
        confirmed,
        filters({
          equipment: ['chair'],
          props: ['mini-ball'],
          ownedOnly: true,
          ownedEquipment: ['chair'],
          ownedProps: ['mini-ball'],
        }),
      ),
    ).toBe(false);
  });

  it('distinguishes exact equipment IDs rather than assuming interchangeable apparatus', () => {
    const tower = { ...confirmed, requiredEquipment: ['tower'], requiredProps: [] };
    expect(matchesLibraryEquipment(tower, filters({ equipment: ['cadillac'] }))).toBe(false);
    expect(
      matchesLibraryEquipment(tower, filters({ ownedOnly: true, ownedEquipment: ['cadillac'] })),
    ).toBe(false);
    expect(
      matchesLibraryEquipment(tower, filters({ ownedOnly: true, ownedEquipment: ['tower'] })),
    ).toBe(true);
  });

  it('treats empty props and the none marker as no real prop requirement', () => {
    for (const requiredProps of [[], ['none']] as const) {
      const noProps = { ...confirmed, requiredEquipment: ['mat'], requiredProps };
      expect(matchesLibraryEquipment(noProps, filters({ props: ['none'] }))).toBe(true);
      expect(matchesLibraryEquipment(noProps, filters({ props: ['mini-ball'] }))).toBe(false);
      expect(matchesLibraryEquipment(noProps, filters({ props: ['mini-ball', 'none'] }))).toBe(
        true,
      );
      expect(
        matchesLibraryEquipment(noProps, filters({ ownedOnly: true, ownedEquipment: ['mat'] })),
      ).toBe(true);
    }
    expect(matchesLibraryEquipment(confirmed, filters({ props: ['none'] }))).toBe(false);
  });

  it('never requires owning the none marker when real props are present', () => {
    expect(
      matchesLibraryEquipment(
        { ...confirmed, requiredEquipment: ['mat'], requiredProps: ['none', 'mini-ball'] },
        filters({ ownedOnly: true, ownedEquipment: ['mat'], ownedProps: ['mini-ball'] }),
      ),
    ).toBe(true);
  });

  it('searches explicitly recorded items while keeping incomplete requirements out of owned-only', () => {
    const unknown = { ...confirmed, requirementsKnown: false };
    expect(matchesLibraryEquipment(unknown, filters())).toBe(true);
    expect(matchesLibraryEquipment(unknown, filters({ equipment: ['reformer'] }))).toBe(true);
    expect(matchesLibraryEquipment(unknown, filters({ equipment: ['tower'] }))).toBe(false);
    expect(matchesLibraryEquipment(unknown, filters({ props: ['mini-ball'] }))).toBe(true);
    expect(matchesLibraryEquipment(unknown, filters({ props: ['foam-roller'] }))).toBe(false);
    expect(
      matchesLibraryEquipment(
        unknown,
        filters({
          ownedOnly: true,
          ownedEquipment: confirmed.requiredEquipment,
          ownedProps: confirmed.requiredProps,
        }),
      ),
    ).toBe(false);
  });

  it('never interprets missing prop metadata as no props when completeness is unknown', () => {
    for (const requiredProps of [[], ['none']] as const) {
      const incomplete = { ...confirmed, requiredProps, requirementsKnown: false };
      expect(matchesLibraryEquipment(incomplete, filters({ props: ['none'] }))).toBe(false);
      expect(matchesLibraryEquipment(incomplete, filters({ equipment: ['chair'] }))).toBe(true);
    }
  });

  it('treats absent or blank equipment requirements as unconfirmed even when marked known', () => {
    for (const requiredEquipment of [[], [' ']]) {
      const missing = { ...confirmed, requiredEquipment };
      expect(matchesLibraryEquipment(missing, filters())).toBe(true);
      expect(matchesLibraryEquipment(missing, filters({ ownedOnly: true }))).toBe(false);
      expect(matchesLibraryEquipment(missing, filters({ props: ['mini-ball'] }))).toBe(true);
      expect(matchesLibraryEquipment(missing, filters({ equipment: ['mat'] }))).toBe(false);
    }
  });

  it('resetting gear filters restores unknown and nonmatching records', () => {
    const unknown = { ...confirmed, requirementsKnown: false };
    expect(matchesLibraryEquipment(unknown, filters({ equipment: ['mat'], ownedOnly: true }))).toBe(
      false,
    );
    expect(matchesLibraryEquipment(unknown, filters())).toBe(true);
    expect(matchesLibraryEquipment(confirmed, filters())).toBe(true);
  });
});
