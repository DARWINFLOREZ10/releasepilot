import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { closeDatabase } from '../lib/db.ts';
import { createFlagResponse, evaluateResponse, readFlagResponse, updateFlagResponse } from '../lib/http.ts';

closeDatabase();
const dir = mkdtempSync(join(tmpdir(), 'releasepilot-api-'));
process.env.RELEASEPILOT_DB = join(dir, 'api.db');
process.env.ADMIN_KEY = 'test-admin-key-24chars-ok';

const headers = { 'content-type': 'application/json', 'x-admin-key': process.env.ADMIN_KEY };

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://127.0.0.1${path}`, { ...init, headers: { ...headers, ...init.headers } });
}

test('create, stale version, kill switch, and monotonic cohort', async () => {
  const created = await createFlagResponse(request('/api/flags', {
    method: 'POST',
    body: JSON.stringify({ key: 'new_checkout', description: 'Controlled release' }),
  }));
  assert.equal(created.status, 201);
  const flag = await created.json();
  assert.equal(flag.enabled, false);
  assert.equal(flag.version, 1);

  const opened = await updateFlagResponse(request('/api/flags/new_checkout', {
    method: 'PATCH',
    body: JSON.stringify({ version: 1, enabled: true, rollout: 25 }),
  }), 'new_checkout');
  assert.equal(opened.status, 200);

  const conflict = await updateFlagResponse(request('/api/flags/new_checkout', {
    method: 'PATCH',
    body: JSON.stringify({ version: 1, enabled: true, rollout: 90 }),
  }), 'new_checkout');
  assert.equal(conflict.status, 409);

  let included = '';
  for (let index = 0; index < 400 && !included; index += 1) {
    const subject = `subject-${index}`;
    const decision = await evaluateResponse(request('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ key: 'new_checkout', subject }),
    }));
    const body = await decision.json();
    if (body.enabled) included = subject;
  }
  assert.ok(included);

  const widened = await updateFlagResponse(request('/api/flags/new_checkout', {
    method: 'PATCH',
    body: JSON.stringify({ version: 2, enabled: true, rollout: 40 }),
  }), 'new_checkout');
  assert.equal(widened.status, 200);
  const stillIn = await evaluateResponse(request('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ key: 'new_checkout', subject: included }),
  }));
  assert.equal((await stillIn.json()).enabled, true);

  const killed = await updateFlagResponse(request('/api/flags/new_checkout', {
    method: 'PATCH',
    body: JSON.stringify({ version: 3, enabled: false, rollout: 100 }),
  }), 'new_checkout');
  assert.equal(killed.status, 200);
  const off = await evaluateResponse(request('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ key: 'new_checkout', subject: included }),
  }));
  const offBody = await off.json();
  assert.equal(offBody.enabled, false);
  assert.equal(offBody.reason, 'disabled');

  const detail = readFlagResponse(request('/api/flags/new_checkout'), 'new_checkout');
  assert.equal(detail.status, 200);
  const detailBody = await detail.json();
  assert.ok(detailBody.audit.length >= 4);
  assert.equal(detailBody.audit[0].action, 'updated');
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
