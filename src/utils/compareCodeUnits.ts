/**
 * Match Array.sort's default order explicitly: UTF-16 code units,
 * independent of the host locale. Use for stable IDs, signatures and hashes,
 * not alphabetically sorted display labels. Do not normalize case or Unicode.
 */
export function compareCodeUnits(left: unknown, right: unknown): number {
  // Preserve native ToString behavior even if runtime data bypasses static types.
  // Unlike String(value), interpolation also keeps native rejection of Symbols.
  const leftText = `${left}`;
  const rightText = `${right}`;
  if (leftText === rightText) return 0;
  return leftText < rightText ? -1 : 1;
}
