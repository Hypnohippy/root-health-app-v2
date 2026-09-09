import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDraftOrigin, createDraftHandler, recheckDraft } from '../lib/corporateDocumentDraft.js';
import { createCorporateDocumentHandoff, protectedCorporateDocument } from '../lib/corporateDocumentServer.js';
import { HRCoachAccessError } from '../lib/hrCoachServerAuth.js';
const key = 'test-key', access = { organisationId: 'org', user: { id: 'admin' }, supabase: {} };
const evidence = { organisation: { id: 'org' }, members: [], assessments: [] };
const original = 'Review the proposed programme before choosing an intervention.';
const handoff = createCorporateDocumentHandoff({ evidence, userId: 'admin', key });
const base = { title: 'User title', content: original, origin: createDraftOrigin(original, access, key), reference: handoff.reference, confirmed: true, operation: 'export' };
function setup() {
  const rendered = [];
  const handler = createDraftHandler({ authorise: async () => access, loadEvidence: async () => evidence, getKey: () => key, render: async document => { rendered.push(document); return new Uint8Array([1]); } });
  return { rendered, run: body => handler(new Request('https://root.test/?organisation_id=org', { method: 'POST', body: JSON.stringify(body) })) };
}
test('root provenance and user edits are determined server-side; appendix is immutable', async () => {
  const { run, rendered } = setup();
  assert.equal((await run(base)).status, 200);
  assert.match(rendered[0].content, /Root-generated narrative - not independently revalidated/);
  assert.equal((await run({ ...base, content: 'Our revised plan.', provenance: 'Root-generated', evidence: 'FORGED' })).status, 200);
  assert.match(rendered[1].content, /User-edited narrative - not independently revalidated/);
  assert.ok(rendered[1].content.endsWith(protectedCorporateDocument(evidence).content));
  assert.doesNotMatch(rendered[1].content, /FORGED/);
});
test('recheck never releases a suppressed metric or reconstructs count and percentage claims', () => {
  const review = recheckDraft('stress_score baseline mean: 7\nThree contributors participated.\n60% participated.', protectedCorporateDocument(evidence));
  assert.deepEqual(review.claims.map(row => row.status), ['unavailable_for_interpretation', 'not_checked', 'not_checked']);
  assert.ok(review.claims.every(row => !('expected' in row) && !('value' in row)));
});
test('released numeric claims can match or disagree without validating whole narrative', () => {
  const doc = { content: JSON.stringify({ baselineLevels: [{ metric: 'stress_score', mean: 6, suppressed: false }], matchedLongitudinalChange: [] }) };
  assert.deepEqual(recheckDraft('stress_score baseline mean: 6\nstress_score baseline mean: 8\nTherefore the intervention worked.', doc).claims.map(row => row.status), ['matches_released_evidence', 'does_not_match_released_evidence', 'not_checked']);
});
test('export requires explicit confirmation and valid bound origin and evidence references', async () => {
  const { run, rendered } = setup();
  for (const patch of [{ confirmed: false }, { origin: base.origin + 'x' }, { reference: base.reference + 'x' }, { origin: createDraftOrigin(original, { ...access, user: { id: 'other' } }, key) }, { origin: createDraftOrigin(original, access, key, 1) }]) assert.equal((await run({ ...base, ...patch })).status, 400);
  assert.equal(rendered.length, 0);
  assert.equal((await run({ ...base, operation: 'recheck', confirmed: false })).status, 200);
  assert.equal(rendered.length, 0);
});
test('denied callers cannot load evidence or render', async () => {
  const handler = createDraftHandler({ authorise: async () => { throw new HRCoachAccessError('denied', 403); }, loadEvidence: async () => assert.fail('must not load'), render: async () => assert.fail('must not render') });
  assert.equal((await handler(new Request('https://root.test', { method: 'POST', body: JSON.stringify(base) }))).status, 403);
});
test('typed-only editor resets recheck and confirmation and reuses existing renderer without model writes', async () => {
  const ui = await readFile(new URL('../components/CorporateDocumentDraft.js', import.meta.url), 'utf8');
  assert.match(ui, /entry.voiceSessionId \|\| !entry.draftOrigin/);
  assert.match(ui, /setReview\(null\); setConfirmed\(false\)/);
  const server = await readFile(new URL('../lib/corporateDocumentDraft.js', import.meta.url), 'utf8');
  assert.match(server, /import \{ renderCorporateDocument \} from '.\/corporateDocumentPdf.js'/);
  assert.doesNotMatch(server, /openai.com|\.insert\(|organisation_actions/);
});
