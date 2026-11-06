/** Orthographic discovery only. Never used to merge IDs, normalize safety duplicates or grant eligibility. */
export function normalizeDiscoveryText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Each query term must match within one original field; fields never create a synthetic joined word. */
export function matchesDiscoverySearch(
  fields: readonly unknown[],
  query: string,
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
  return terms.every((term) =>
    normalized.some((field) => field.includes(term)),
  );
}
