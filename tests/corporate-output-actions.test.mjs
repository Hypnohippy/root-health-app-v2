import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { canUseCorporateOutput, actionDraftFromResponse, saveReviewedAction } from '../lib/corporateOutput.js';
import { createCorporateDocumentHandler, validateCorporateDocument, protectedCorporateDocument, createCorporateDocumentHandoff, resolveCorporateDocument } from '../lib/corporateDocumentServer.js';
import { buildOrganisationModelEvidence } from '../lib/organisationModelEvidence.js';
import { renderCorporateDocument } from '../lib/corporateDocumentPdf.js';
import { HRCoachAccessError } from '../lib/hrCoachServerAuth.js';
const entry = { id: 'response-1', role: 'assistant', content: 'Review invitation coverage and agree who owns the next review. '.repeat(4) };
const evidence = { organisation: { id: 'org' }, members: [], assessments: [] };
const doc = { ...protectedCorporateDocument(evidence), confirmed: true };
const testKey = 'test-only-document-signing-key';
test('output controls exclude user, partial, interrupted and short responses', () => {
  assert.equal(canUseCorporateOutput(entry), true);
  for (const patch of [{ role: 'user' }, { interrupted: true }, { content: 'Five joined.' }, { voiceSessionId: 's', final: false }]) assert.equal(canUseCorporateOutput({ ...entry, ...patch }), false);
  assert.equal(canUseCorporateOutput({ ...entry, voiceSessionId: 's', final: true }), true);
});
test('drafts do not infer achieved outcomes, execution or evidence validity', () => {
  const draft = actionDraftFromResponse(entry);
  assert.equal(draft.status, 'planned'); assert.equal(draft.source, 'ask_root');
  assert.equal(draft.expected_outcome, ''); assert.equal(draft.success_measure, '');
  assert.equal(draft.outcome_status, undefined);
  assert.equal(actionDraftFromResponse({ ...entry, voiceSessionId: 's' }).source, 'realtime');
});
test('save is impossible without confirmation and uses existing scoped CRUD only', async () => {
  let calls = 0;
  const args = { access: { organisationId: 'org', accessToken: 'token' }, draft: actionDraftFromResponse(entry), fetchImpl: async (url, init) => {
    calls++; assert.match(url, /\/api\/organisation\/actions\?organisation_id=org/);
    assert.equal(init.headers.Authorization, 'Bearer token');
    assert.equal(JSON.parse(init.body).confirmed, true);
    return Response.json({ action: { id: 'saved' } });
  } };
  await assert.rejects(saveReviewedAction(args)); assert.equal(calls, 0);
  await saveReviewedAction({ ...args, confirmed: true }); assert.equal(calls, 1);
});
test('document boundary requires review and blocks sensitive or suppressed text', () => {
  assert.deepEqual(validateCorporateDocument(doc, evidence), { title: doc.title, content: doc.content });
  for (const body of [{ ...doc, confirmed: false }, { ...doc, content: 'Stress rose in three participants.' }, { ...doc, content: 'Email alice@example.com' }, { ...doc, content: 'Their private journal says this.' }, { ...doc, content: 'x'.repeat(30001) }]) assert.throws(() => validateCorporateDocument(body, evidence));
});
for (const content of ['Alice Example is struggling emotionally.', 'Three colleagues reported deteriorating emotional health.']) {
  test(`unverified draft fails before rendering: ${content}`, async () => {
    let rendered = false;
    const handler = createCorporateDocumentHandler({
      authorise: async () => ({ organisationId: 'org', supabase: {} }),
      loadEvidence: async () => evidence,
      render: async () => { rendered = true; return new Uint8Array([1]); },
    });
    const response = await handler(new Request('https://root.test/api/organisation/documents?organisation_id=org', {
      method: 'POST', body: JSON.stringify({ ...doc, content, sanitised: true, evidence: { suppressed: false } }),
    }));
    assert.equal(response.status, 400);
    assert.equal(rendered, false);
    assert.doesNotMatch(await response.text(), /Alice Example|Three colleagues/);
  });
}
test('export inherits metric-specific suppression and never includes private source fields', () => {
  const input = { organisation: { id: 'org', name: 'PRIVATE_NAME' },
    members: Array.from({ length: 5 }, (_, i) => ({ organisation_id: 'org', profile_key: `private${i}` })),
    assessments: Array.from({ length: 5 }, (_, i) => ({ organisation_id: 'org', profile_key: `private${i}`, assessment_type: 'baseline', created_at: '2026-09-01', stress_score: 6, recovery_score: i < 3 ? 8 : null, narrative: 'PRIVATE_NARRATIVE' })),
    organisationReviews: [{ business_event_notes: 'PRIVATE_NOTE' }],
  };
  const safe = protectedCorporateDocument(input);
  const actual = JSON.parse(safe.content);
  const review = buildOrganisationModelEvidence(input);
  assert.deepEqual(actual.baselineLevels, review.observedEvidence);
  assert.deepEqual(actual.matchedLongitudinalChange, review.longitudinal);
  assert.equal(actual.baselineLevels.find(row => row.metric === 'stress_score').mean, 6);
  assert.equal(actual.baselineLevels.find(row => row.metric === 'recovery_score').contributors, 'fewer than 5');
  assert.equal(actual.baselineLevels.find(row => row.metric === 'recovery_score').mean, null);
  assert.doesNotMatch(safe.content, /PRIVATE_|private\d/);
  assert.deepEqual(validateCorporateDocument({ ...safe, confirmed: true }, input), safe);
  for (const change of [{ title: 'Alice Example' }, { content: safe.content.replace('fewer than 5', '3') }, { content: safe.content + '\n60% contributed.' }]) {
    assert.throws(() => validateCorporateDocument({ ...safe, confirmed: true, ...change }, input));
  }
});
test('benign free text and stale or foreign evidence cannot be exported as verified content', async () => {
  assert.throws(() => validateCorporateDocument({ ...doc, content: 'Review invitation coverage.' }, evidence));
  const stale = { ...doc, content: doc.content.replace('fewer than 5', '5') };
  assert.throws(() => validateCorporateDocument(stale, evidence));
  const handler = createCorporateDocumentHandler({ authorise: async () => ({ organisationId: 'other', supabase: {} }), loadEvidence: async () => evidence,
    render: async () => { assert.fail('Must not render foreign evidence'); } });
  assert.equal((await handler(new Request('https://root.test/api/organisation/documents?organisation_id=other', { method: 'POST', body: JSON.stringify(doc) }))).status, 400);
});
test('document authorisation precedes evidence and render; denied callers never load evidence', async () => {
  const calls = [];
  const handler = createCorporateDocumentHandler({ authorise: async args => { calls.push('auth'); assert.equal(args.organisationId, 'org'); return { organisationId: 'org', supabase: {}, user: { id: 'u' } }; },
    loadEvidence: async args => { calls.push('evidence'); assert.equal(args.organisationId, 'org'); return evidence; },
    getSigningKey: () => testKey,
    render: async () => { calls.push('render'); return new Uint8Array([1]); } });
  const handoff = createCorporateDocumentHandoff({ evidence, userId: 'u', key: testKey });
  const req = () => new Request('https://root.test/api/organisation/documents?organisation_id=org', { method: 'POST', body: JSON.stringify({ reference: handoff.reference, confirmed: true }) });
  const response = await handler(req()); assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(calls, ['auth', 'evidence', 'render']);
  for (const status of [401, 403]) {
    const denied = createCorporateDocumentHandler({ authorise: async () => { throw new HRCoachAccessError('private', status); }, loadEvidence: () => { throw new Error('Must not load'); } });
    assert.equal((await denied(req())).status, status);
  }
});

test('signed protected handoff exports the reviewed document and rejects substitution, expiry and foreign scope', async () => {
  const handoff = createCorporateDocumentHandoff({ evidence, userId: 'u', key: testKey, now: 1000 });
  const access = { user: { id: 'u' }, organisationId: 'org' };
  const body = { reference: handoff.reference, confirmed: true };
  const resolved = resolveCorporateDocument(body, evidence, access, testKey, 1001);
  assert.deepEqual(resolved, protectedCorporateDocument(evidence));
  assert.ok((await PDFDocument.load(await renderCorporateDocument(resolved))).getPageCount() > 0);
  for (const patch of [{ confirmed: false }, { content: 'Alice Example is struggling emotionally.' }, { content: 'Three colleagues reported deteriorating emotional health.' }, { title: 'Private employee report' }, { reference: handoff.reference + 'tampered' }]) {
    assert.throws(() => resolveCorporateDocument({ ...body, ...patch }, evidence, access, testKey, 1001));
  }
  assert.throws(() => resolveCorporateDocument(body, evidence, access, testKey, handoff.expiresAt));
  assert.throws(() => resolveCorporateDocument(body, evidence, { ...access, user: { id: 'other' } }, testKey, 1001));
  assert.throws(() => resolveCorporateDocument(body, evidence, { ...access, organisationId: 'other' }, testKey, 1001));
  assert.throws(() => resolveCorporateDocument(body, evidence, access, 'different-key', 1001));
  const changed = { organisation: { id: 'org' }, members: Array.from({ length: 5 }, (_, i) => ({ organisation_id: 'org', profile_key: String(i) })), assessments: Array.from({ length: 5 }, (_, i) => ({ organisation_id: 'org', profile_key: String(i), assessment_type: 'baseline', created_at: '2026-09-01', stress_score: 5 })) };
  assert.throws(() => resolveCorporateDocument(body, changed, access, testKey, 1001));
});

test('typed handoff is attached at response creation and PDF UI sends only the trusted reference', async () => {
  const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
  const route = await read('app/api/organisation-coach/route.js');
  assert.match(route, /documentHandoff: createCorporateDocumentHandoff\(\{ evidence: \{ organisation, members, assessments \}, userId: authorised.user.id \}\)/);
  const page = await read('app/hr-coach/page.js');
  assert.match(page, /documentHandoff: data.documentHandoff \|\| null/);
  const controls = await read('components/CorporateOutputActions.js');
  assert.match(controls, /!entry.voiceSessionId && entry.documentHandoff\?\.reference/);
  assert.match(controls, /JSON.stringify\(\{ reference: entry.documentHandoff.reference, confirmed \}\)/);
  assert.doesNotMatch(controls, /field\('content'/);
});
test('existing pdf-lib generates multipage documents and rejects unsupported glyphs explicitly', async () => {
  const bytes = await renderCorporateDocument({ title: 'Root review', content: 'A reviewed organisational plan.\n'.repeat(180) });
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 1);
  await assert.rejects(renderCorporateDocument({ title: 'Review', content: '😀' }));
});
test('panel is inside main content below conversation; save/export only have explicit submit controls', async () => {
  const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
  const page = await read('app/hr-coach/page.js');
  assert.equal((page.match(/<OrganisationActionPanel /g) || []).length, 1);
  assert.match(page, /<OrganisationActionPanel[^\n]+\s*<\/>/);
  assert.ok(page.indexOf('<OrganisationActionPanel') > page.indexOf('<form onSubmit={handleSend}'));
  const controls = await read('components/CorporateOutputActions.js');
  assert.match(controls, /onSubmit={submit}/); assert.match(controls, /if \(lock.current \|\| !confirmed\) return/);
  assert.match(controls, /setConfirmed\(false\)/); assert.doesNotMatch(controls, /useEffect/);
  const renderer = await read('lib/corporateDocumentPdf.js');
  const existing = await read('app/api/admin/documents/[id]/pdf/route.js');
  assert.match(renderer, /from 'pdf-lib'/); assert.match(existing, /from "pdf-lib"/);
  const server = await read('lib/corporateDocumentServer.js');
  assert.doesNotMatch(server, /service.role|openai.com|\.insert\(|supabase\.from\(/i);
});
