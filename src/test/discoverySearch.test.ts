import { describe, expect, it } from 'vitest';
import {
  matchesDiscoverySearch,
  normalizeDiscoveryText,
} from '../utils/discoverySearch';

describe('orthographic discovery separate from identity and safety', () => {
  it('finds Korean spacing, Latin case/width and hyphen variants without aliasing identities', () => {
    const fields = [
      '체어 양발 페달 프레스',
      'Seated Pedal-Press',
      '리포머',
      '원본-노트',
    ];
    for (const query of [
      '페달프레스',
      '페달-프레스',
      'seated pedal press',
      'ＰＥＤＡＬ　ＰＲＥＳＳ',
      '체어 프레스',
    ])
      expect(matchesDiscoverySearch(fields, query), query).toBe(true);
    expect(matchesDiscoverySearch(fields, '모르는동작')).toBe(false);
    expect(normalizeDiscoveryText('체어 페달')).toBe(
      normalizeDiscoveryText('체어페달'),
    );
  });
  it('does not create matches across field boundaries or interpret search as a regex', () => {
    expect(matchesDiscoverySearch(['arm', 'chair'], 'armchair')).toBe(false);
    expect(matchesDiscoverySearch(['A separate motion'], '.*approved.*')).toBe(
      false,
    );
    expect(matchesDiscoverySearch(['팔', null, 20, undefined], '팔')).toBe(
      true,
    );
    expect(matchesDiscoverySearch([], '팔')).toBe(false);
    expect(matchesDiscoverySearch([], '   ')).toBe(true);
  });
  it('preserves record IDs, variant lists and review data byte for byte', () => {
    const records = [
      {
        id: 'separate-a',
        title: 'Leg Slide',
        review: 'pending',
        variants: ['arm'],
      },
      {
        id: 'separate-b',
        title: 'Leg-Slide',
        review: 'pending',
        variants: ['leg'],
      },
    ];
    const before = JSON.stringify(records);
    expect(
      records
        .filter((r) => matchesDiscoverySearch([r.title], 'legslide'))
        .map((r) => r.id),
    ).toEqual(['separate-a', 'separate-b']);
    expect(JSON.stringify(records)).toBe(before);
  });
});
