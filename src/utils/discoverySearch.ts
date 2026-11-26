/** Orthographic discovery only. Never used to merge IDs, normalize safety duplicates or grant eligibility. */
export function normalizeDiscoveryText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Normalized Hangul uses 21 vowels and 28 endings for each leading consonant. */
function hangulInitials(field: string): string {
  return field.replace(/[가-힣]/gu, (syllable) =>
    String.fromCharCode(0x1100 + Math.floor((syllable.charCodeAt(0) - 0xac00) / (21 * 28))),
  );
}

/** Each query term must match within one original field; fields never create a synthetic joined word. */
export function matchesDiscoverySearch(
  fields: readonly unknown[],
  query: string,
  detailFields: readonly unknown[] = [],
): boolean {
  const terms = query
    .trim()
    .split(/\s+/u)
    .map(normalizeDiscoveryText)
    .filter(Boolean);
  if (!terms.length) return true;
  const normalized = fields
    .filter((field): field is string => typeof field === 'string')
    .map(normalizeDiscoveryText);
  const details = detailFields
    .filter((field): field is string => typeof field === 'string')
    .map(normalizeDiscoveryText);
  return terms.every((term) => {
    if (/^[ᄀ-ᄒ]+$/u.test(term)) {
      // Initials are a shortcut for labels. Long teaching notes yield many accidental matches.
      return normalized.some((field) => hangulInitials(field).includes(term));
    }
    return (
      normalized.some((field) => field.includes(term)) ||
      details.some((field) => field.includes(term))
    );
  });
}
