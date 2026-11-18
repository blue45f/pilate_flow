import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectHarness, ROOT } from './agent-harness.mjs';

test('Pilates Flow 단일 기준 에이전트 하네스 및 어댑터 무결성을 유지한다', () => {
  const problems = inspectHarness(ROOT);
  assert.deepEqual(problems, []);
});
