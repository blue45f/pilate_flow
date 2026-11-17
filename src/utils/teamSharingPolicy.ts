import type { PropType, SavedSequence, SequenceStep } from '../types/pilates';

/**
 * Conditional P3 Team Sharing Domain Contract (`src/utils/teamSharingPolicy.ts`).
 *
 * Grounded in the verified architecture:
 * - Current production runtime has Firebase Auth (`uid`) identity + browser-local storage only,
 *   with NO server database ACL or auto-invite transport.
 * - This pure domain module defines and verifies the exact authorization, revocation,
 *   optimistic version-conflict, clone-independence, and PII-free schedule/apparatus boundaries
 *   required before connecting a shared server store.
 * - Never performs network calls, external invitations, or CRM/payment operations.
 */

export type ShareRole = 'owner' | 'editor' | 'commenter' | 'reader';

export interface ShareGrant {
  readonly granteeUid: string;
  readonly role: Exclude<ShareRole, 'owner'>;
  readonly grantedAt: string;
  readonly revokedAt?: string;
}

export interface ShareStepComment {
  readonly id: string;
  readonly authorUid: string;
  readonly stepId: string;
  readonly body: string;
  readonly createdAt: string;
}

/** Minimal PII-free class context allowed across team sharing (never CRM/payment/health data). */
export interface SharedScheduleEquipmentContext {
  readonly slotDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly locationAlias: string;
  readonly equipmentIds: readonly string[];
  readonly propIds: readonly PropType[];
  readonly targetMinutes: number;
}

export interface SharedSequenceRecord {
  readonly shareId: string;
  readonly ownerUid: string;
  readonly revision: number;
  readonly revoked: boolean;
  readonly sequence: SavedSequence;
  readonly grants: readonly ShareGrant[];
  readonly comments: readonly ShareStepComment[];
  readonly scheduleContext?: SharedScheduleEquipmentContext;
}

export type SharePolicyResult<T> =
  | ({ readonly ok: true } & T)
  | {
      readonly ok: false;
      readonly code:
        | 'permission_denied'
        | 'share_revoked'
        | 'version_conflict'
        | 'pii_or_health_rejected';
      readonly message: string;
      readonly serverRevision?: number;
      readonly serverSnapshot?: SavedSequence;
    };

const FORBIDDEN_CONTEXT_KEYS = new Set([
  'memberName',
  'phone',
  'email',
  'diagnosis',
  'medicalHistory',
  'painNote',
  'paymentAmount',
  'membershipPass',
]);

export function resolveEffectiveShareRole(
  record: SharedSequenceRecord,
  actorUid: string,
): ShareRole | null {
  if (!actorUid.trim()) return null;
  if (actorUid === record.ownerUid) return 'owner';
  if (record.revoked) return null;
  const activeGrant = record.grants.find(
    (grant) => grant.granteeUid === actorUid && !grant.revokedAt,
  );
  return activeGrant ? activeGrant.role : null;
}

export function readSharedSequence(
  record: SharedSequenceRecord,
  actorUid: string,
): SharePolicyResult<{ readonly role: ShareRole; readonly sequence: SavedSequence }> {
  if (actorUid !== record.ownerUid && record.revoked) {
    return {
      ok: false,
      code: 'share_revoked',
      message: '공유가 해제되어 더 이상 이 시퀀스를 열람할 수 없습니다.',
    };
  }
  const role = resolveEffectiveShareRole(record, actorUid);
  if (!role) {
    return {
      ok: false,
      code: 'permission_denied',
      message: '이 공유 시퀀스에 접근할 권한이 없습니다.',
    };
  }
  return {
    ok: true,
    role,
    sequence: structuredClone(record.sequence),
  };
}

export function addSharedSequenceComment(
  record: SharedSequenceRecord,
  input: {
    readonly actorUid: string;
    readonly stepId: string;
    readonly body: string;
    readonly now: string;
    readonly commentId: string;
  },
): SharePolicyResult<{ readonly record: SharedSequenceRecord }> {
  const role = resolveEffectiveShareRole(record, input.actorUid);
  if (!role) {
    return {
      ok: false,
      code: record.revoked ? 'share_revoked' : 'permission_denied',
      message: record.revoked
        ? '공유가 해제되어 댓글을 남길 수 없습니다.'
        : '댓글 작성 권한이 없습니다.',
    };
  }
  if (role === 'reader') {
    return {
      ok: false,
      code: 'permission_denied',
      message: '읽기 전용 권한에서는 댓글을 작성하거나 원본을 수정할 수 없습니다.',
    };
  }
  const nextComment: ShareStepComment = {
    id: input.commentId,
    authorUid: input.actorUid,
    stepId: input.stepId,
    body: input.body.trim(),
    createdAt: input.now,
  };
  return {
    ok: true,
    record: {
      ...record,
      comments: [...record.comments, nextComment],
    },
  };
}

export function applySharedSequenceEdit(
  record: SharedSequenceRecord,
  input: {
    readonly actorUid: string;
    readonly expectedRevision: number;
    readonly nextSequence: SavedSequence;
    readonly now: string;
  },
): SharePolicyResult<{ readonly record: SharedSequenceRecord }> {
  const role = resolveEffectiveShareRole(record, input.actorUid);
  if (!role) {
    return {
      ok: false,
      code: record.revoked ? 'share_revoked' : 'permission_denied',
      message: record.revoked
        ? '공유가 해제되어 편집 내용을 반영할 수 없습니다. 내 작업실에 사본으로 저장해 주세요.'
        : '편집 권한이 없습니다.',
    };
  }
  if (role !== 'owner' && role !== 'editor') {
    return {
      ok: false,
      code: 'permission_denied',
      message: '편집 권한이 있는 강사만 공유 원본을 수정할 수 있습니다.',
    };
  }
  if (input.expectedRevision !== record.revision) {
    return {
      ok: false,
      code: 'version_conflict',
      message:
        '다른 강사가 먼저 공유 시퀀스를 수정했습니다. 자동 덮어쓰기를 중단했으니 최신본을 확인하거나 사본으로 저장해 주세요.',
      serverRevision: record.revision,
      serverSnapshot: structuredClone(record.sequence),
    };
  }
  const updated: SavedSequence = {
    ...structuredClone(input.nextSequence),
    id: record.sequence.id,
    updatedAt: input.now,
  };
  return {
    ok: true,
    record: {
      ...record,
      revision: record.revision + 1,
      sequence: updated,
    },
  };
}

export function revokeSharedAccess(
  record: SharedSequenceRecord,
  input: {
    readonly actorUid: string;
    readonly targetGranteeUid?: string;
    readonly now: string;
  },
): SharePolicyResult<{ readonly record: SharedSequenceRecord }> {
  if (input.actorUid !== record.ownerUid) {
    return {
      ok: false,
      code: 'permission_denied',
      message: '공유 소유자만 접근 권한을 해제할 수 있습니다.',
    };
  }
  if (!input.targetGranteeUid) {
    return {
      ok: true,
      record: {
        ...record,
        revoked: true,
        grants: record.grants.map((g) => (g.revokedAt ? g : { ...g, revokedAt: input.now })),
      },
    };
  }
  return {
    ok: true,
    record: {
      ...record,
      grants: record.grants.map((g) =>
        g.granteeUid === input.targetGranteeUid && !g.revokedAt ? { ...g, revokedAt: input.now } : g,
      ),
    },
  };
}

/**
 * Clones a shared sequence into the recipient's own workspace with brand-new IDs.
 * Subsequent edits or revocations on the shared record never mutate this independent clone.
 */
export function forkSharedSequenceToLocal(
  record: SharedSequenceRecord,
  input: {
    readonly actorUid: string;
    readonly newSequenceId: string;
    readonly stepIdPrefix: string;
    readonly now: string;
  },
): SharePolicyResult<{
  readonly localClone: SavedSequence;
  readonly provenance: { readonly sourceShareId: string; readonly sourceRevision: number };
}> {
  const readable = readSharedSequence(record, input.actorUid);
  if (!readable.ok) return readable;

  const clonedSteps: SequenceStep[] = readable.sequence.steps.map((step, index) => ({
    ...structuredClone(step),
    stepId: `${input.stepIdPrefix}-${index + 1}`,
    order: index + 1,
  }));

  const localClone: SavedSequence = {
    ...structuredClone(readable.sequence),
    id: input.newSequenceId,
    title: `${readable.sequence.title} (내 작업실 사본)`,
    steps: clonedSteps,
    createdAt: input.now,
    updatedAt: input.now,
    taughtCount: 0,
    lastTaughtAt: undefined,
  };

  return {
    ok: true,
    localClone,
    provenance: {
      sourceShareId: record.shareId,
      sourceRevision: record.revision,
    },
  };
}

export function validateMinimalSharedScheduleContext(
  candidate: Record<string, unknown>,
): SharePolicyResult<{ readonly context: SharedScheduleEquipmentContext }> {
  for (const key of Object.keys(candidate)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) {
      return {
        ok: false,
        code: 'pii_or_health_rejected',
        message: '회원 개인정보·건강정보·결제/수강권 정보는 공유 일정 맥락에 포함할 수 없습니다.',
      };
    }
  }
  return {
    ok: true,
    context: {
      slotDate: String(candidate.slotDate ?? ''),
      startTime: String(candidate.startTime ?? ''),
      endTime: String(candidate.endTime ?? ''),
      locationAlias: String(candidate.locationAlias ?? ''),
      equipmentIds: Array.isArray(candidate.equipmentIds)
        ? candidate.equipmentIds.map(String)
        : [],
      propIds: Array.isArray(candidate.propIds) ? (candidate.propIds as PropType[]) : [],
      targetMinutes: Number(candidate.targetMinutes ?? 50),
    },
  };
}
