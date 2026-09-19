import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate, validateKey, validateRollout } from '../lib/core.ts';

const flag = { key: 'new_checkout', enabled: true, rollout: 35, salt: 'fixed-salt', version: 1 };

test('same subject receives stable decision', () => {
  assert.deepEqual(evaluate(flag, 'account-42'), evaluate(flag, 'account-42'));
});

test('zero and full rollout boundaries', () => {
  assert.equal(evaluate({ ...flag, rollout: 0 }, 'a').enabled, false);
  assert.equal(evaluate({ ...flag, rollout: 100 }, 'a').enabled, true);
  assert.equal(evaluate({ ...flag, enabled: false, rollout: 100 }, 'a').enabled, false);
});

test('validation rejects unsafe identifiers and percentages', () => {
  assert.equal(validateKey('new_checkout'), true);
  assert.equal(validateKey('../admin'), false);
  assert.equal(validateRollout(101), false);
  assert.equal(validateRollout(10.5), false);
});
