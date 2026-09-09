import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const swc = require('next/dist/build/swc');
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';
await swc.loadBindings();
const files = ['lib/hrRealtimeTranscript.js', 'lib/corporateOutput.js', 'components/CorporateDocumentDraft.js', 'components/CorporateOutputActions.js', 'app/hr-coach/page.js'];
const compiled = {};
for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  // Expose the real page event handler to the fixture; no replacement handler or render.
  if (file.endsWith('page.js')) source = source.replace('  const activated =', '  fixture.capture(handleRealtimeEvent, voiceSessionRef);\n  const activated =');
  compiled[file] = (await swc.transform(source, { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
function harness() {
  const states = new Map(), modules = {}; let current, cursor;
  const fixture = { capture(handler, ref) { fixture.event = handler; fixture.sessionRef = ref; } };
  const hooks = {
    useEffect() {},
    useState(value) { const i = cursor++, slots = states.get(current); if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++, slots = states.get(current); return slots[i] ||= { current: value }; },
  };
  for (const file of files) {
    const m = { exports: {} };
    new Function('require', 'module', 'exports', 'fixture', compiled[file])(name => {
      if (name === 'react') return hooks;
      if (name.startsWith('.')) return modules[path.posix.normalize(path.posix.join(path.posix.dirname(file), name))] || { __esModule: true, default: ({ children }) => children || null };
      return require(name);
    }, m, m.exports, fixture);
    modules[file] = m.exports;
  }
  function invoke(fn, props) { current = fn; cursor = 0; if (!states.has(fn)) states.set(fn, []); return fn(props); }
  function expand(node) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node.type === 'function') return expand(invoke(node.type, node.props));
    return { ...node, props: { ...node.props, children: React.Children.toArray(node.props?.children).map(expand) } };
  }
  const page = modules['app/hr-coach/page.js'].default;
  invoke(page, {});
  const slots = states.get(page);
  slots[0] = false; slots[21] = { organisationId: 'org', accessToken: 'fixture' };
  const session = { id: 'voice', transcript: modules['lib/hrRealtimeTranscript.js'].createHRRealtimeTranscript('voice') };
  fixture.sessionRef.current = session;
  return { event: event => fixture.event(event, session), render: () => expand(invoke(page, {})), slots };
}
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children || '');
const saves = tree => nodes(tree).filter(n => n.type === 'button' && text(n) === 'Save as Action / Initiative');
const recommendation = 'Review invitation coverage and agree an owner before planning further organisational action. Record the expected outcome and review progress together.';
for (const terminal of ['response.output_item.done', 'response.done']) {
  test(`actual Realtime page handler/render releases Save after ${terminal} without repeated transcript`, () => {
    const h = harness();
    h.event({ type: 'response.output_audio_transcript.delta', item_id: 'recommendation', delta: recommendation });
    assert.equal(saves(h.render()).length, 0);
    const item = { id: 'recommendation', role: 'assistant', type: 'message', status: 'completed', content: [] };
    h.event(terminal === 'response.done' ? { type: terminal, response: { status: 'completed', output: [item] } } : { type: terminal, item });
    const tree = h.render();
    assert.equal(saves(tree).length, 1);
    assert.doesNotMatch(text(tree), /Protected evidence PDF|Document Draft/);
    saves(tree)[0].props.onClick();
    assert.equal(h.slots[16].entry.content, recommendation);
    assert.equal(h.slots[16].entry.voiceSessionId, 'voice');
    assert.equal(h.slots[16].organisationId, 'org');
  });
}
test('separate items, duplicate completion and interruption keep controls on the eligible item only', () => {
  const h = harness();
  for (const [id, content] of [['short', 'Let us consider this.'], ['long', recommendation]]) {
    h.event({ type: 'response.output_audio_transcript.delta', item_id: id, delta: content });
    const done = { type: 'response.output_item.done', item: { id, role: 'assistant', type: 'message', status: 'completed', content: [] } };
    h.event(done); h.event(done);
  }
  assert.equal(saves(h.render()).length, 1);
  h.event({ type: 'conversation.item.truncated', item_id: 'long' });
  assert.equal(saves(h.render()).length, 0);
});
test('incomplete items and failed responses do not release a partial transcript', () => {
  const h = harness();
  h.event({ type: 'response.output_audio_transcript.delta', item_id: 'partial', delta: recommendation });
  const item = { id: 'partial', role: 'assistant', type: 'message', status: 'incomplete', content: [] };
  h.event({ type: 'response.output_item.done', item });
  h.event({ type: 'response.done', response: { status: 'failed', output: [item] } });
  assert.equal(saves(h.render()).length, 0);
});
