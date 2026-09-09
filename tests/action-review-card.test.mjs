import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { prepareActionReview } from '../lib/actionReviewDraft.js';
import { saveReviewedAction } from '../lib/corporateOutput.js';
const require = createRequire(import.meta.url);
const entry = { id: 'r', role: 'assistant', content: 'Action title: Review stress support\nType: Action plan\nRationale: Review the current stress signal before selecting support.\nExpected outcome: A reviewed proposal.\nSuccess measure: Agreement recorded at the next review.', documentHandoff: { reference: 'existing-protected-reference', content: JSON.stringify({ baselineLevels: [{ metric: 'stress_score', mean: 6, suppressed: false }, { metric: 'recovery_score', mean: 9, suppressed: false }, { metric: 'stress_score', mean: 8, contributors: 3, suppressed: true }], matchedLongitudinalChange: [] }) } };
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';
const swc = require('next/dist/build/swc');
await swc.loadBindings();
const source = await readFile(new URL('../components/ActionReviewCard.js', import.meta.url), 'utf8');
const { code } = await swc.transform(source, { filename: 'ActionReviewCard.js', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
export function harness({ fail = false } = {}) {
  const slots = []; let cursor = 0;
  const state = { writes: [], cancelled: 0, saved: 0, fail };
  const hooks = { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; }, useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; } };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name === 'react' ? hooks : name.includes('actionReviewDraft') ? { prepareActionReview } : name.includes('corporateOutput') ? { saveReviewedAction: args => saveReviewedAction({ ...args, fetchImpl: async (url, options) => { state.writes.push(JSON.parse(options.body)); return Response.json({}, { status: state.fail ? 400 : 200 }); } }) } : require(name), module, module.exports);
  state.render = () => { cursor = 0; return module.exports.default({ entry, access: { organisationId: 'org', accessToken: 'token' }, onCancel: () => state.cancelled++, onSaved: () => state.saved++ }); };
  return state;
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
const find = (tree, type) => nodes(tree).find(node => node.type === type);
const text = tree => typeof tree === 'string' ? tree : Array.isArray(tree) ? tree.map(text).join(' ') : tree?.props ? text(tree.props.children) : '';

test('supported sections and relevant released evidence prefill; unknown details stay empty', () => {
  const draft = prepareActionReview(entry);
  assert.equal(draft.title, 'Review stress support');
  assert.equal(draft.rationale, 'Review the current stress signal before selecting support.');
  assert.equal(draft.expected_outcome, 'A reviewed proposal.');
  assert.equal(draft.success_measure, 'Agreement recorded at the next review.');
  assert.equal(draft.evidence_summary, 'Stress recorded baseline average: 6.');
  assert.equal(draft.owner, ''); assert.equal(draft.start_date, null); assert.equal(draft.review_date, null); assert.equal(draft.status, 'planned');
  const unknown = prepareActionReview({ ...entry, content: 'We should look at invitation coverage.', documentHandoff: null });
  for (const key of ['owner','evidence_summary','expected_outcome','success_measure']) assert.equal(unknown[key], '');
  assert.doesNotMatch(draft.evidence_summary, /3|8|Recovery|contributors/);
});
test('opening and cancelling do not write; labels are human-readable and unconfirmed', () => {
  const h = harness(); const tree = h.render();
  assert.equal(h.writes.length, 0);
  const visible = text(tree);
  for (const label of ['Action title', 'Why are we doing this?', 'What evidence supports this?', 'How will we know it worked?', 'Draft prepared by Root', 'Action plan', 'In progress', 'In review']) assert.ok(visible.includes(label));
  assert.doesNotMatch(visible, /action_plan|in_progress|in_review|human_confirmed/);
  nodes(tree).find(n => n.type === 'button' && text(n) === 'Cancel').props.onClick();
  assert.equal(h.cancelled, 1); assert.equal(h.writes.length, 0);
});
test('final confirmation alone writes reviewed values; failure retains edits and success notifies parent', async () => {
  const h = harness({ fail: true });
  find(h.render(), 'textarea').props.onChange({ target: { value: 'My reviewed title' } });
  assert.equal(h.writes.length, 0);
  await find(h.render(), 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes[0].confirmed, true); assert.equal(h.writes[0].action.title, 'My reviewed title');
  assert.equal(h.saved, 0);
  assert.equal(find(h.render(), 'textarea').props.value, 'My reviewed title');
  assert.match(text(h.render()), /Your edits are still here/);
  h.fail = false;
  await find(h.render(), 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved, 1);
});
test('review card stays outside scrolling conversation and uses responsive normal flow', async () => {
  const page = await readFile(new URL('../app/hr-coach/page.js', import.meta.url), 'utf8');
  assert.ok(page.indexOf('<ActionReviewCard') > page.indexOf('<form onSubmit={handleSend}'));
  assert.ok(page.indexOf('<ActionReviewCard') < page.indexOf('<OrganisationActionPanel'));
  assert.match(page, /setActionReview\(null\); setActionRevision\(value => value \+ 1\)/);
  assert.doesNotMatch(source, /position:\s*(absolute|fixed)|createPortal/);
  assert.match(source, /@media\(max-width:600px\)/);
  assert.match(source, /grid-template-columns:minmax\(0,1fr\)/);
});
