import { describe, expect, it } from 'vitest';
import {
  createTeamSharingService,
  TeamSharingError,
  type SharedSequenceDocumentRecord,
  type TeamSharingRepository,
} from './teamSharingService';

function createInMemorySharingRepo(): TeamSharingRepository {
  const store = new Map<string, SharedSequenceDocumentRecord>();
  return {
    async get(docId) {
      const found = store.get(docId);
      return found ? structuredClone(found) : null;
    },
    async create(docId, record) {
      if (store.has(docId)) return false;
      store.set(docId, structuredClone(record));
      return true;
    },
    async replace(docId, expectedVersion, record) {
      const existing = store.get(docId);
      if (!existing || existing.version !== expectedVersion) return false;
      store.set(docId, structuredClone(record));
      return true;
    },
  };
}

const sampleSequence = {
  id: 'seq-team-base-1',
  title: '리포머 스튜디오 기본 45분',
  subtitle: '팀 공유 기준 시퀀스',
  apparatus: 'reformer' as const,
  level: '1.5' as const,
  focusTags: ['리포머', '코어'],
  targetMinutes: 45,
  steps: [
    {
      stepId: 'st-1',
      order: 1,
      blockCategory: 'warmup' as const,
      classSection: 'preparation' as const,
      exerciseId: 'ex-warmup-01',
      durationMin: 5,
      selectedLayer: 'standard' as const,
      explanationSec: 15,
      transitionSec: 0,
    },
    {
      stepId: 'st-2',
      order: 2,
      blockCategory: 'footwork' as const,
      classSection: 'main' as const,
      exerciseId: 'ex-footwork-01',
      durationMin: 10,
      selectedLayer: 'standard' as const,
      boxOverride: 'short-box' as const,
      footbarOverride: 'down' as const,
      explanationSec: 20,
      transitionSec: 15,
    },
  ],
  createdAt: '2026-11-17T08:00:00.000Z',
  updatedAt: '2026-11-17T08:00:00.000Z',
  taughtCount: 0,
};

describe('Backend P3 team sequence sharing security & concurrency contracts', () => {
  it('enforces owner/editor/commenter/reader RBAC, immediate revocation, optimistic version_conflict, clone independence, and PII/health rejection', async () => {
    const service = createTeamSharingService(createInMemorySharingRepo());
    const created = await service.createSharedSequence('instructor-owner', {
      sequence: sampleSequence,
    });
    expect(created.version).toBe(1);

    // Uninvited user gets 403 forbidden
    await expect(
      service.getSharedSequence('instructor-stranger', created.docId),
    ).rejects.toMatchObject({ code: 'forbidden', status: 403 });

    // Grant reader, commenter, and editor roles
    await service.grantOrUpdateAccess('instructor-owner', {
      docId: created.docId,
      targetUserId: 'instructor-reader',
      role: 'reader',
    });
    await service.grantOrUpdateAccess('instructor-owner', {
      docId: created.docId,
      targetUserId: 'instructor-commenter',
      role: 'commenter',
    });
    const afterGrants = await service.grantOrUpdateAccess('instructor-owner', {
      docId: created.docId,
      targetUserId: 'instructor-editor',
      role: 'editor',
    });
    expect(afterGrants.version).toBe(4);

    // Reader can read and fork, but cannot comment or edit or grant
    const readerView = await service.getSharedSequence('instructor-reader', created.docId);
    expect(readerView.role).toBe('reader');
    await expect(
      service.addComment('instructor-reader', { docId: created.docId, body: '코멘트 시도' }),
    ).rejects.toMatchObject({ code: 'forbidden', status: 403 });
    await expect(
      service.updateSharedSequence('instructor-reader', {
        docId: created.docId,
        baseVersion: afterGrants.version,
        sequence: sampleSequence,
      }),
    ).rejects.toMatchObject({ code: 'forbidden', status: 403 });

    // Forked copy is completely independent of original shared document and survives later revocation
    const { forkedSequence } = await service.forkSharedSequence('instructor-reader', created.docId);
    expect(forkedSequence.id).not.toBe(sampleSequence.id);
    expect(forkedSequence.steps[0]!.stepId).not.toBe(sampleSequence.steps[0]!.stepId);
    forkedSequence.title = '리더 개인 수정본';
    const ownerCheck = await service.getSharedSequence('instructor-owner', created.docId);
    expect(ownerCheck.sequence.title).toBe('리포머 스튜디오 기본 45분');

    // Immediate revocation blocks reader immediately with 403 access_revoked
    const afterRevoke = await service.revokeAccess('instructor-owner', {
      docId: created.docId,
      targetUserId: 'instructor-reader',
    });
    await expect(
      service.getSharedSequence('instructor-reader', created.docId),
    ).rejects.toMatchObject({ code: 'access_revoked', status: 403 });
    expect(forkedSequence.title).toBe('리더 개인 수정본');

    // Commenter can comment, cannot edit
    const afterComment = await service.addComment('instructor-commenter', {
      docId: created.docId,
      body: '2번 숏박스 전환 여유 15초 좋습니다.',
    });
    expect(afterComment.version).toBe(afterRevoke.version + 1);
    await expect(
      service.updateSharedSequence('instructor-commenter', {
        docId: created.docId,
        baseVersion: afterComment.version,
        sequence: sampleSequence,
      }),
    ).rejects.toMatchObject({ code: 'forbidden', status: 403 });

    // Editor with stale baseVersion gets 409 version_conflict with latest serverVersion; valid baseVersion succeeds
    await expect(
      service.updateSharedSequence('instructor-editor', {
        docId: created.docId,
        baseVersion: afterRevoke.version, // stale because comment bumped version
        sequence: { ...sampleSequence, title: '충돌 초안' },
      }),
    ).rejects.toMatchObject({
      code: 'version_conflict',
      status: 409,
      serverVersion: afterComment.version,
    });

    const updated = await service.updateSharedSequence('instructor-editor', {
      docId: created.docId,
      baseVersion: afterComment.version,
      sequence: { ...sampleSequence, title: '에디터 반영 45분' },
    });
    expect(updated.sequence.title).toBe('에디터 반영 45분');
    expect(updated.version).toBe(afterComment.version + 1);

    // Editor cannot escalate permissions
    await expect(
      service.grantOrUpdateAccess('instructor-editor', {
        docId: created.docId,
        targetUserId: 'instructor-stranger',
        role: 'reader',
      }),
    ).rejects.toMatchObject({ code: 'forbidden', status: 403 });

    // PII / health / payment payloads are rejected with 400 privacy_violation
    await expect(
      service.createSharedSequence('instructor-owner', {
        sequence: {
          ...sampleSequence,
          medicalHistory: '요추 통증 이력',
        },
      }),
    ).rejects.toBeInstanceOf(TeamSharingError);
    await expect(
      service.addComment('instructor-commenter', {
        docId: created.docId,
        body: '정상 메모',
        phoneNumber: '010-0000-0000',
      }),
    ).rejects.toMatchObject({ code: 'privacy_violation', status: 400 });
  });
});
