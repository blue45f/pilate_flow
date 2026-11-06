import { BackupError } from './backupService';

/** An identity assertion detects stale browser sessions; it never selects a data owner. */
export function assertExpectedPrincipal(verifiedUserId: string, expectedUserId: unknown): void {
  if (typeof expectedUserId !== 'string' || !expectedUserId)
    throw new BackupError('principal_required', 400, '계정 연결을 다시 확인한 후 요청해 주세요.');
  if (expectedUserId !== verifiedUserId)
    throw new BackupError(
      'principal_mismatch',
      409,
      '다른 탭에서 계정이 변경되었습니다. 계정 연결을 다시 확인해 주세요.',
    );
}
