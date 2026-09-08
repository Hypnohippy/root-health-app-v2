import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadActionPanel, ACTION_FILTERS } from '../lib/organisationActionPanel.js';
import { listOrganisationActions } from '../lib/organisationActions.js';
test('panel requests latest five per filter with full totals and authenticated scope', async () => {
  const seen = [];
  const pages = await loadActionPanel({ accessToken: 'token', organisationId: 'org', fetchImpl: async (url, options) => {
    const params = new URL(url, 'https://root.test').searchParams;
    assert.equal(params.get('limit'), '5'); assert.equal(params.get('organisation_id'), 'org');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(options.cache, 'no-store'); seen.push(params.get('status') || '');
    return Response.json({ actions: [{ organisation_id: 'org' }], total: 100 });
  } });
  assert.deepEqual(seen, ACTION_FILTERS.map(([key]) => key));
  assert.equal(pages.planned.total, 100);
});
test('panel rejects failures and cross-organisation or unbounded results', async () => {
  for (const response of [new Response('', { status: 403 }), Response.json({ actions: [{ organisation_id: 'other' }] }), Response.json({ actions: Array(6).fill({ organisation_id: 'org' }) })]) {
    await assert.rejects(loadActionPanel({ accessToken: 'token', organisationId: 'org', fetchImpl: async () => response.clone() }));
  }
  await assert.rejects(loadActionPanel({}));
});
test('status filtering happens before pagination and rejects unknown statuses', async () => {
  const calls = []; const query = {};
  for (const name of ['select','eq','order','range']) query[name] = (...args) => { calls.push([name,...args]); return query; };
  query.then = resolve => Promise.resolve({ data: [], count: 20 }).then(resolve);
  const supabase = { from: () => query };
  await listOrganisationActions({ supabase, organisationId: 'org', status: 'planned', limit: 5 });
  assert.ok(calls.findIndex(c => c[0] === 'eq' && c[1] === 'status') < calls.findIndex(c => c[0] === 'range'));
  await assert.rejects(listOrganisationActions({ supabase, organisationId: 'org', status: 'invalid' }));
});
test('panel has read-only accessible details and a clearly unavailable future browser target', async () => {
  const source = await readFile(new URL('../components/OrganisationActionPanel.js', import.meta.url), 'utf8');
  for (const field of ['title','status','owner','review_date','outcome_status','expected_outcome','outcome_summary']) assert.ok(source.includes(field));
  assert.match(source, /aria-expanded/); assert.match(source, /aria-pressed/);
  assert.match(source, /Full browser coming later/); assert.match(source, /href="\/organisation\/actions" aria-disabled="true"/);
  assert.match(source, /controller.abort/); assert.doesNotMatch(source, /dangerouslySetInnerHTML|method:.*(POST|PATCH|DELETE)/);
});
