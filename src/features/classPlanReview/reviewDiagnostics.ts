import type { NormalizedClassReviewPlan } from './classPlanReviewTypes';

/** Keep diagnostics detached and bounded without traversing or coercing caller-owned objects. */
export function toReviewDiagnosticValue(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  if (typeof value === 'string')
    return value.length <= 2000 ? value : `${value.slice(0, 2000)}… (긴 입력 생략)`;
  if (Array.isArray(value)) return '[배열 형식의 입력]';
  if (typeof value === 'object') return '[객체 형식의 입력]';
  return `[${typeof value} 형식의 입력]`;
}

/** The exported analyzer accepts an existing plan but must not freeze its caller's objects. */
export function detachClassReviewPlan(plan: NormalizedClassReviewPlan): NormalizedClassReviewPlan {
  return {
    ...plan,
    rawTargetMinutes: toReviewDiagnosticValue(plan.rawTargetMinutes),
    items: plan.items.map((item) => ({
      ...item,
      rawDurationMin: toReviewDiagnosticValue(item.rawDurationMin),
      rawRepetitions: toReviewDiagnosticValue(item.rawRepetitions),
      rawSets: toReviewDiagnosticValue(item.rawSets),
      rawSideMode: toReviewDiagnosticValue(item.rawSideMode),
      sideLabelsKo: [...item.sideLabelsKo],
      itemIssueCodes: [...item.itemIssueCodes],
    })),
    adapterIssues: plan.adapterIssues.map((issue) => ({
      ...issue,
      itemIds: [...issue.itemIds],
      itemIndices: [...issue.itemIndices],
    })),
    stats: { ...plan.stats },
  };
}
