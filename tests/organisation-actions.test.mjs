import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateAction, listOrganisationActions } from '../lib/organisationActions.js';
import { createOrganisationActionsHandler } from '../lib/organisationActionsServer.js';
import { HRCoachAccessError, requireHRCoachOrganisationAccess } from '../lib/hrCoachServerAuth.js';
const action = { title: 'Review invitation coverage', type: 'action_plan', source: 'ask_root' };
const id = '11111111-1111-1111-1111-111111111111';
function fixture(result = { data: { id }, count: 1 }) {
  const calls = [];
  const query = {};
  for (const method of ['select', 'eq', 'order', 'range', 'insert', 'update', 'delete']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.maybeSingle = async () => result;
  query.then = resolve => Promise.resolve(result).then(resolve);
  const supabase = { from: table => { calls.push(['from', table]); return query; } };
  const handler = createOrganisationActionsHandler({ authorise: async () => ({ supabase, organisationId: 'org-a', user: { id: 'admin' } }) });
  return { handler, supabase, calls };
}
const request = (method, body) => new Request('https://root.test/api/organisation/actions?organisation_id=org-a', { method, ...(body ? { body: JSON.stringify(body) } : {}) });

for (const source of ['manual', 'ask_root', 'realtime', 'executive_review', 'organisation_learning']) {
  test(`${source} creation requires explicit confirmation and binds authenticated scope`, async () => {
    const { handler, calls } = fixture();
    assert.equal((await handler(request('POST', { action: { ...action, source } }))).status, 400);
    assert.equal(calls.length, 0);
    assert.equal((await handler(request('POST', { confirmed: true, organisation_id: 'org-b', created_by: 'attacker', action: { ...action, source } }))).status, 201);
    const row = calls.find(c => c[0] === 'insert')[1];
    assert.equal(row.organisation_id, 'org-a');
    assert.equal(row.created_by, 'admin');
    assert.equal(row.human_confirmed, true);
  });
}
test('reject mass assignment, invalid enums/dates, oversized text and source changes', () => {
  for (const input of [{ organisation_id: 'other' }, { created_by: 'other' }, { human_confirmed: true }, { status: 'execute' }, { start_date: '2026-02-30' }, { title: ' ' }, { rationale: 'x'.repeat(4001) }, { source: 'manual' }]) assert.throws(() => validateAction(input));
  assert.throws(() => validateAction({}, true));
  assert.deepEqual(validateAction({ status: 'in_review', outcome_status: 'inconclusive', review_date: '2026-09-08' }), { status: 'in_review', outcome_status: 'inconclusive', review_date: '2026-09-08' });
});
for (const method of ['PATCH', 'DELETE']) test(`${method} scopes record ID to authorised organisation`, async () => {
  const { handler, calls } = fixture({ data: null });
  assert.equal((await handler(request(method, { id, action: { status: 'in_review' } }))).status, 404);
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'organisation_id' && c[2] === 'org-a'));
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'id' && c[2] === id));
});
test('shared reader bounds pagination, scopes records and labels reported outcomes', async () => {
  const { supabase, calls } = fixture({ data: [], count: 0 });
  const result = await listOrganisationActions({ supabase, organisationId: 'org-a' });
  assert.match(result.evidenceKind, /not independently measured wellbeing evidence/);
  assert.ok(calls.some(c => c[0] === 'range' && c[1] === 0 && c[2] === 49));
  await assert.rejects(listOrganisationActions({ supabase, organisationId: 'org-a', limit: 101 }));
  await assert.rejects(listOrganisationActions({ supabase, organisationId: '' }));
});
test('denied access never reaches CRUD and errors do not disclose upstream data', async () => {
  const handler = createOrganisationActionsHandler({ authorise: async () => { throw new HRCoachAccessError('private detail', 403); } });
  const response = await handler(request('GET'));
  assert.equal(response.status, 403);
  assert.doesNotMatch(await response.text(), /private detail/);
  const failed = fixture({ error: { message: 'private SQL' } });
  const result = await failed.handler(request('POST', { confirmed: true, action }));
  assert.equal(result.status, 400);
  assert.doesNotMatch(await result.text(), /private SQL/);
});
for (const role of ['organisation_admin', 'hr_admin', 'employee']) test(`membership authorization: ${role}`, async () => {
  const query = {};
  for (const method of ['select', 'eq']) query[method] = () => query;
  query.in = (key, roles) => { assert.deepEqual(roles, ['organisation_admin', 'hr_admin']); return query; };
  query.limit = async () => ({ data: role === 'employee' ? [] : [{ organisation_id: 'org-a', role }] });
  const auth = () => requireHRCoachOrganisationAccess({ request: new Request('https://root.test', { headers: { Authorization: 'Bearer token' } }), organisationId: 'org-a',
    createClientForToken: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, from: () => query }) });
  if (role === 'employee') await assert.rejects(auth(), { status: 403 });
  else assert.equal((await auth()).membership.role, role);
});
test('migration enforces RLS for every operation, immutable scope and human confirmation', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260908_organisation_actions.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  for (const operation of ['select', 'insert', 'update', 'delete']) assert.ok(sql.includes(`for ${operation} to authenticated`));
  assert.equal((sql.match(/m\.role in \('organisation_admin', 'hr_admin'\)/g) || []).length, 5);
  assert.match(sql, /created_by = auth.uid\(\) and human_confirmed/);
  assert.match(sql, /human_confirmed boolean not null check \(human_confirmed = true\)/);
  const updateGrant = sql.match(/grant update \(([^)]+)\)/)[1];
  assert.doesNotMatch(updateGrant, /organisation_id|created_by|created_at|source|human_confirmed/);
  assert.match(sql, /revoke all .* from public, anon, authenticated/);
  assert.doesNotMatch(sql, /create trigger|security definer|playbook|intervention_outcomes/);
});
