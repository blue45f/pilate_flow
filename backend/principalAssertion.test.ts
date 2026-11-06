import { describe, expect, it } from 'vitest';
import { assertExpectedPrincipal } from './principalAssertion';

describe('backup principal assertion after verified authentication', () => {
  it('allows a matching assertion without changing the verified identity', () => {
    expect(() => assertExpectedPrincipal('verified-account-a', 'verified-account-a')).not.toThrow();
  });

  it('rejects a stale browser account before it can operate on the active token account', () => {
    expect(() => assertExpectedPrincipal('verified-account-b', 'displayed-account-a')).toThrowError(
      expect.objectContaining({ code: 'principal_mismatch', status: 409 }),
    );
  });

  it('rejects missing and malformed assertions so old clients must restore their session', () => {
    for (const expected of [undefined, null, '', 123, { userId: 'verified-account-a' }]) {
      expect(() => assertExpectedPrincipal('verified-account-a', expected)).toThrowError(
        expect.objectContaining({ code: 'principal_required', status: 400 }),
      );
    }
  });
});
