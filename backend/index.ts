import { db, storage, router, json, error, requireAuth, isAppDatabaseError } from '@appdeploy/sdk';
import type { RouterMiddleware, RouterResponse } from '@appdeploy/sdk';
import { BackupError, createBackupService } from './backupService';
import type { BackupRecord } from './backupService';
import { createFreeAiRoutes, createFreeAiService } from './freeAiService';
import { assertExpectedPrincipal } from './principalAssertion';

const freeAiRoutes = createFreeAiRoutes(createFreeAiService());

const TABLE = 'studio_backups';
const backups = createBackupService({
  get: async (owner) => {
    const [record] = await db.get<BackupRecord>(TABLE, [owner], { consistent: true });
    return record;
  },
  create: async (owner, record) => {
    const [id] = await db.tx.add(TABLE, [{ id: owner, ...record }]);
    return id !== null;
  },
  replace: async (owner, revision, record) => {
    const [ok] = await db.tx.update(
      TABLE,
      [{ id: owner, record: { ...record }, if: { revision } }],
      { patch: true },
    );
    return ok;
  },
  write: async (path, raw) => {
    const [ok] = await storage.write([{ path, content: raw, contentType: 'application/json' }]);
    return ok;
  },
  read: async (path) => {
    const [file] = await storage.read([path]);
    return file?.content ?? null;
  },
  removeFile: async (path) => {
    const [ok] = await storage.delete([path]);
    if (ok) return true;
    const [remaining] = await storage.read([path]);
    return remaining?.content === null;
  },
  isUncertainWrite: (cause) =>
    isAppDatabaseError(cause) && cause.code === 'AppDatabaseUnknownOutcome',
});

function protect(source: 'query' | 'body', action: RouterMiddleware): RouterMiddleware {
  return async (context) => {
    let response: RouterResponse | void;
    try {
      const input = source === 'query' ? context.query : context.body;
      const expectedUserId =
        input && typeof input === 'object'
          ? (input as Record<string, unknown>).expectedUserId
          : undefined;
      assertExpectedPrincipal(context.user!.userId, expectedUserId);
      response = await action(context);
    } catch (cause) {
      if (cause instanceof BackupError)
        response = json({ error: cause.code, message: cause.message }, cause.status);
      else if (isAppDatabaseError(cause) && cause.code === 'AppDatabaseQuotaExceeded')
        response = json(
          {
            error: 'quota_exceeded',
            message:
              '서버 사용 한도에 도달했습니다. 기기 백업을 이용하고 나중에 다시 시도해 주세요.',
          },
          429,
        );
      else
        response = error('서버 요청을 완료하지 못했습니다. 기기의 자료는 그대로 유지됩니다.', 503);
    }
    if (!response) return response;
    const vary = Object.entries(response.headers)
      .filter(([name]) => name.toLowerCase() === 'vary')
      .flatMap(([, value]) => value.split(',').map((item) => item.trim()))
      .filter(Boolean);
    const headers = Object.fromEntries(
      Object.entries(response.headers).filter(
        ([name]) => !['cache-control', 'vary'].includes(name.toLowerCase()),
      ),
    );
    return {
      ...response,
      headers: {
        ...headers,
        'Cache-Control': 'private, no-store',
        Vary: [...new Set([...vary, 'Authorization'])].join(', '),
      },
    };
  };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/studio/backup/status': [
    requireAuth(),
    protect('query', async ({ user }) => json(await backups.getStatus(user!.userId))),
  ],
  'GET /api/studio/backup': [
    requireAuth(),
    protect('query', async ({ user }) => json(await backups.read(user!.userId))),
  ],
  'PUT /api/studio/backup': [
    requireAuth(),
    protect('body', async ({ user, body }) => json(await backups.save(user!.userId, body))),
  ],
  'DELETE /api/studio/backup': [
    requireAuth(),
    protect('body', async ({ user, body }) => json(await backups.remove(user!.userId, body))),
  ],
  'GET /api/studio/ai/status': [
    requireAuth(),
    protect('query', (context) => freeAiRoutes['GET /api/studio/ai/status'](context)),
  ],
  'POST /api/studio/ai/assist': [
    requireAuth(),
    protect('body', (context) => freeAiRoutes['POST /api/studio/ai/assist'](context)),
  ],
});
