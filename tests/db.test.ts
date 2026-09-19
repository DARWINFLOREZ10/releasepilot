import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createFlag, getFlag, updateFlag, auditLog } from '../lib/db.ts';

const dir = mkdtempSync(join(tmpdir(), 'releasepilot-'));
process.env.RELEASEPILOT_DB = join(dir, 'test.db');

test('version conflict preserves the audit trail and current state', () => {
  const created = createFlag('new_checkout', 'Controlled release');
  assert.equal(created.enabled, false);
  const updated = updateFlag('new_checkout', 1, true, 25);
  assert.equal(updated?.version, 2);
  assert.equal(updateFlag('new_checkout', 1, false, 0), null);
  assert.equal(getFlag('new_checkout')?.rollout, 25);
  assert.equal(auditLog('new_checkout').length, 2);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
