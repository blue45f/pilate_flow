import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sequenceSchema } from '../src/schemas/cloudBackupSchema';

export type TeamShareRole = 'owner' | 'editor' | 'commenter' | 'reader';

export interface TeamShareGrantRecord {
  principalHash: string;
  role: Exclude<TeamShareRole, 'owner'>;
  grantedAt: string;
  revokedAt?: string;
}

export interface TeamShareCommentRecord {
  id: string;
  authorHash: string;
  body: string;
  createdAt: string;
}

export interface SharedSequenceDocumentRecord {
  docId: string;
  ownerHash: string;
  version: number;
  sequence: z.infer<typeof sequenceSchema>;
  grants: TeamShareGrantRecord[];
  comments: TeamShareCommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamSharingRepository {
  get: (docId: string) => Promise<SharedSequenceDocumentRecord | null>;
  create: (docId: string, record: SharedSequenceDocumentRecord) => Promise<boolean>;
  replace: (
    docId: string,
    expectedVersion: number,
    record: SharedSequenceDocumentRecord,
  ) => Promise<boolean>;
}

export class TeamSharingError extends Error {
  constructor(
    public readonly code:
      | 'unauthorized'
      | 'forbidden'
      | 'access_revoked'
      | 'not_found'
      | 'version_conflict'
      | 'privacy_violation'
      | 'invalid_request',
    public readonly status: number,
    message: string,
    public readonly serverVersion?: number,
  ) {
    super(message);
  }
}

const FORBIDDEN_SHARE_KEYS = new Set([
  'phone',
  'phoneNumber',
  'email',
  'memberEmail',
  'birthDate',
  'residentNumber',
  'medicalHistory',
  'diagnosis',
  'painScore',
  'medication',
  'cardNumber',
  'paymentToken',
  'billingAccount',
  'dangerousKey',
  '__proto__',
  'constructor',
  'prototype',
]);

export function hashTeamPrincipal(userId: string): string {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new TeamSharingError('unauthorized', 401, '로그인이 필요합니다.');
  }
  return createHash('sha256').update(`team-share:${trimmed}`).digest('hex');
}

export function assertNoSensitiveSharePayload(root: unknown, maxDepth = 48): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (value === null || typeof value !== 'object') continue;
    if (depth > maxDepth) {
      throw new TeamSharingError('invalid_request', 400, '공유 자료 중첩 깊이가 제한을 초과했습니다.');
    }
    if (Array.isArray(value)) {
      for (const item of value) stack.push({ value: item, depth: depth + 1 });
      continue;
    }
    for (const key of Object.getOwnPropertyNames(value)) {
      if (FORBIDDEN_SHARE_KEYS.has(key)) {
        throw new TeamSharingError(
          'privacy_violation',
          400,
          `팀 공유 시퀀스에는 회원 연락처·건강/의료 정보·결제 필드(${key})를 포함할 수 없습니다.`,
        );
      }
      stack.push({ value: (value as Record<string, unknown>)[key], depth: depth + 1 });
    }
  }
}

const createShareInputSchema = z.object({
  sequence: z.unknown(),
});

const grantAccessInputSchema = z.object({
  docId: z.string().min(1).max(120),
  targetUserId: z.string().min(1).max(200),
  role: z.enum(['reader', 'commenter', 'editor']),
});

const revokeAccessInputSchema = z.object({
  docId: z.string().min(1).max(120),
  targetUserId: z.string().min(1).max(200),
});

const addCommentInputSchema = z.object({
  docId: z.string().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
});

const updateSharedSequenceInputSchema = z.object({
  docId: z.string().min(1).max(120),
  baseVersion: z.number().int().positive(),
  sequence: z.unknown(),
});

function resolveEffectiveRole(
  doc: SharedSequenceDocumentRecord,
  callerHash: string,
): { role: TeamShareRole | null; wasRevoked: boolean } {
  if (doc.ownerHash === callerHash) return { role: 'owner', wasRevoked: false };
  const grant = doc.grants.find((item) => item.principalHash === callerHash);
  if (!grant) return { role: null, wasRevoked: false };
  if (grant.revokedAt) return { role: null, wasRevoked: true };
  return { role: grant.role, wasRevoked: false };
}

function parseSharedSequencePayload(rawSequence: unknown): z.infer<typeof sequenceSchema> {
  assertNoSensitiveSharePayload(rawSequence);
  const parsed = sequenceSchema.safeParse(rawSequence);
  if (!parsed.success) {
    throw new TeamSharingError('invalid_request', 400, '공유할 수업 시퀀스 형식이 올바르지 않습니다.');
  }
  const seenStepIds = new Set<string>();
  for (const step of parsed.data.steps) {
    if (seenStepIds.has(step.stepId)) {
      throw new TeamSharingError(
        'invalid_request',
        400,
        '공유 시퀀스의 단계 인스턴스 ID가 중복되었습니다.',
      );
    }
    seenStepIds.add(step.stepId);
  }
  return structuredClone(parsed.data);
}

/**
 * Backend 1:1 security enforcement for P3 conditional team sequence sharing.
 * Never sends external invitations/messages and rejects any PII/health/payment fields.
 */
export function createTeamSharingService(repository: TeamSharingRepository) {
  async function loadAuthorized(
    docId: string,
    callerUserId: string,
    allowedRoles: readonly TeamShareRole[],
  ): Promise<{ doc: SharedSequenceDocumentRecord; callerHash: string; role: TeamShareRole }> {
    const callerHash = hashTeamPrincipal(callerUserId);
    const doc = await repository.get(docId);
    if (!doc) {
      throw new TeamSharingError('not_found', 404, '공유 시퀀스를 찾을 수 없습니다.');
    }
    const { role, wasRevoked } = resolveEffectiveRole(doc, callerHash);
    if (wasRevoked) {
      throw new TeamSharingError(
        'access_revoked',
        403,
        '이 수업의 팀 공유 권한이 해제되어 더 이상 접근할 수 없습니다.',
      );
    }
    if (!role || !allowedRoles.includes(role)) {
      throw new TeamSharingError(
        'forbidden',
        403,
        '이 작업을 수행할 팀 공유 권한이 없습니다.',
      );
    }
    return { doc, callerHash, role };
  }

  return {
    async createSharedSequence(callerUserId: string, input: unknown) {
      const callerHash = hashTeamPrincipal(callerUserId);
      const parsedInput = createShareInputSchema.safeParse(input);
      if (!parsedInput.success) {
        throw new TeamSharingError('invalid_request', 400, '공유 생성 요청 형식이 올바르지 않습니다.');
      }
      const sequence = parseSharedSequencePayload(parsedInput.data.sequence);
      const now = new Date().toISOString();
      const docId = `share-${randomUUID()}`;
      const record: SharedSequenceDocumentRecord = {
        docId,
        ownerHash: callerHash,
        version: 1,
        sequence,
        grants: [],
        comments: [],
        createdAt: now,
        updatedAt: now,
      };
      const created = await repository.create(docId, record);
      if (!created) {
        throw new TeamSharingError('version_conflict', 409, '공유 문서를 생성하지 못했습니다.');
      }
      return structuredClone(record);
    },

    async getSharedSequence(callerUserId: string, docId: string) {
      const { doc, role } = await loadAuthorized(docId, callerUserId, [
        'owner',
        'editor',
        'commenter',
        'reader',
      ]);
      return {
        docId: doc.docId,
        version: doc.version,
        role,
        sequence: structuredClone(doc.sequence),
        comments: structuredClone(doc.comments),
        updatedAt: doc.updatedAt,
      };
    },

    async grantOrUpdateAccess(callerUserId: string, input: unknown) {
      const parsed = grantAccessInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new TeamSharingError('invalid_request', 400, '권한 설정 요청 형식이 올바르지 않습니다.');
      }
      const { doc } = await loadAuthorized(parsed.data.docId, callerUserId, ['owner']);
      const targetHash = hashTeamPrincipal(parsed.data.targetUserId);
      if (targetHash === doc.ownerHash) {
        throw new TeamSharingError(
          'invalid_request',
          400,
          '소유자 본인의 권한은 별도 공유 권한으로 변경할 수 없습니다.',
        );
      }
      const now = new Date().toISOString();
      const existingIdx = doc.grants.findIndex((g) => g.principalHash === targetHash);
      const nextGrants = [...doc.grants];
      const nextGrant: TeamShareGrantRecord = {
        principalHash: targetHash,
        role: parsed.data.role,
        grantedAt: now,
      };
      if (existingIdx >= 0) nextGrants[existingIdx] = nextGrant;
      else nextGrants.push(nextGrant);

      const nextDoc: SharedSequenceDocumentRecord = {
        ...structuredClone(doc),
        version: doc.version + 1,
        grants: nextGrants,
        updatedAt: now,
      };
      const ok = await repository.replace(doc.docId, doc.version, nextDoc);
      if (!ok) {
        const latest = await repository.get(doc.docId);
        throw new TeamSharingError(
          'version_conflict',
          409,
          '다른 기기에서 공유 권한이 먼저 변경되었습니다. 최신 상태를 확인해 주세요.',
          latest?.version,
        );
      }
      return { docId: nextDoc.docId, version: nextDoc.version, role: parsed.data.role };
    },

    async revokeAccess(callerUserId: string, input: unknown) {
      const parsed = revokeAccessInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new TeamSharingError('invalid_request', 400, '공유 해제 요청 형식이 올바르지 않습니다.');
      }
      const { doc } = await loadAuthorized(parsed.data.docId, callerUserId, ['owner']);
      const targetHash = hashTeamPrincipal(parsed.data.targetUserId);
      const now = new Date().toISOString();
      const nextGrants = doc.grants.map((g) =>
        g.principalHash === targetHash ? { ...g, revokedAt: now } : g,
      );
      const nextDoc: SharedSequenceDocumentRecord = {
        ...structuredClone(doc),
        version: doc.version + 1,
        grants: nextGrants,
        updatedAt: now,
      };
      const ok = await repository.replace(doc.docId, doc.version, nextDoc);
      if (!ok) {
        const latest = await repository.get(doc.docId);
        throw new TeamSharingError(
          'version_conflict',
          409,
          '공유 해제 처리 중 버전 충돌이 발생했습니다. 다시 시도해 주세요.',
          latest?.version,
        );
      }
      return { docId: nextDoc.docId, version: nextDoc.version, revokedAt: now };
    },

    async addComment(callerUserId: string, input: unknown) {
      assertNoSensitiveSharePayload(input);
      const parsed = addCommentInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new TeamSharingError('invalid_request', 400, '댓글 형식이 올바르지 않습니다.');
      }
      const { doc, callerHash } = await loadAuthorized(parsed.data.docId, callerUserId, [
        'owner',
        'editor',
        'commenter',
      ]);
      const now = new Date().toISOString();
      const comment: TeamShareCommentRecord = {
        id: `cmt-${randomUUID()}`,
        authorHash: callerHash,
        body: parsed.data.body,
        createdAt: now,
      };
      const nextDoc: SharedSequenceDocumentRecord = {
        ...structuredClone(doc),
        version: doc.version + 1,
        comments: [...doc.comments, comment],
        updatedAt: now,
      };
      const ok = await repository.replace(doc.docId, doc.version, nextDoc);
      if (!ok) {
        const latest = await repository.get(doc.docId);
        throw new TeamSharingError(
          'version_conflict',
          409,
          '댓글 저장 중 문서가 변경되었습니다. 최신 내용을 불러온 뒤 다시 남겨 주세요.',
          latest?.version,
        );
      }
      return { docId: nextDoc.docId, version: nextDoc.version, comment };
    },

    async updateSharedSequence(callerUserId: string, input: unknown) {
      const parsed = updateSharedSequenceInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new TeamSharingError('invalid_request', 400, '시퀀스 수정 요청 형식이 올바르지 않습니다.');
      }
      const { doc } = await loadAuthorized(parsed.data.docId, callerUserId, ['owner', 'editor']);
      if (parsed.data.baseVersion !== doc.version) {
        throw new TeamSharingError(
          'version_conflict',
          409,
          '다른 강사가 먼저 공유 시퀀스를 수정했습니다. 내 초안을 보존했으니 최신본 확인 후 다시 적용해 주세요.',
          doc.version,
        );
      }
      const nextSequence = parseSharedSequencePayload(parsed.data.sequence);
      const now = new Date().toISOString();
      const nextDoc: SharedSequenceDocumentRecord = {
        ...structuredClone(doc),
        version: doc.version + 1,
        sequence: {
          ...nextSequence,
          id: doc.sequence.id,
          updatedAt: now,
        },
        updatedAt: now,
      };
      const ok = await repository.replace(doc.docId, doc.version, nextDoc);
      if (!ok) {
        const latest = await repository.get(doc.docId);
        throw new TeamSharingError(
          'version_conflict',
          409,
          '동시 수정 충돌이 감지되어 덮어쓰기를 중단했습니다. 내 초안은 유지됩니다.',
          latest?.version,
        );
      }
      return {
        docId: nextDoc.docId,
        version: nextDoc.version,
        sequence: structuredClone(nextDoc.sequence),
      };
    },

    async forkSharedSequence(callerUserId: string, docId: string) {
      const { doc } = await loadAuthorized(docId, callerUserId, [
        'owner',
        'editor',
        'commenter',
        'reader',
      ]);
      const now = new Date().toISOString();
      const forked: z.infer<typeof sequenceSchema> = {
        ...structuredClone(doc.sequence),
        id: `fork-${randomUUID()}`,
        title: `${doc.sequence.title} (내 스튜디오 사본)`,
        steps: doc.sequence.steps.map((step, idx) => ({
          ...structuredClone(step),
          stepId: `fork-step-${idx + 1}-${randomUUID().slice(0, 8)}`,
          order: idx + 1,
        })),
        createdAt: now,
        updatedAt: now,
        taughtCount: 0,
        lastTaughtAt: undefined,
      };
      return {
        forkedSequence: forked,
        sourceDocId: doc.docId,
        sourceVersion: doc.version,
      };
    },
  };
}
