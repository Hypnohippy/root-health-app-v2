"use client";
import { useRef, useState } from 'react';
import { prepareActionReview } from '../lib/actionReviewDraft.js';
import { saveReviewedAction } from '../lib/corporateOutput.js';
export default function ActionReviewCard({ entry, access, onCancel, onSaved }) {
  const [initial] = useState(() => prepareActionReview(entry));
  const [draft, setDraft] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  function change(key, value) { setDraft(current => ({ ...current, [key]: value })); }
  async function confirm(event) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await saveReviewedAction({ access, draft, confirmed: true }); onSaved(); }
    catch { setError('Your action could not be saved. Your edits are still here. Please check the fields and try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const provenance = key => draft[key] !== initial[key] ? 'Edited by you' : initial[key] ? 'Prepared by Root' : 'Optional — add if known';
  function field(key, title, help, kind = 'text') {
    return <label className={kind === 'textarea' ? 'wide' : ''} key={key}><span>{title}</span><small>{help}</small>
      {kind === 'textarea' ? <textarea value={draft[key] || ''} maxLength={4000} onChange={e => change(key, e.target.value)} /> : <input type={kind} required={key === 'title' || key === 'completed_date'} maxLength={200} value={draft[key] || ''} onChange={e => change(key, kind === 'date' ? e.target.value || null : e.target.value)} />}
      <small className="origin">{provenance(key)}</small></label>;
  }
  return <section className="action-review" aria-labelledby="action-review-heading">
    <p className="eyebrow">Organisation action draft</p><h2 id="action-review-heading">Review your action or initiative</h2>
    <p>Draft prepared by Root — please review before saving. Nothing has been saved or approved yet.</p>
    <form onSubmit={confirm}>
      <fieldset disabled={busy}><div className="fields">
        {field('title', 'Action title', 'A short name for the action or initiative.')}
        <label><span>Type</span><small>Choose the kind of record you want to keep.</small><select value={draft.type} onChange={e => change('type', e.target.value)}><option value="action_plan">Action plan</option><option value="intervention">Intervention</option><option value="decision">Decision</option></select><small className="origin">{provenance('type')}</small></label>
        {field('rationale', 'Why are we doing this?', 'The problem or opportunity this action is intended to address.', 'textarea')}
        {field('evidence_summary', 'What evidence supports this?', 'The facts or observations supporting this action. Keep private or protected information out.', 'textarea')}
        {field('owner', 'Owner', 'Who will be responsible for taking this forward?')}
        <label><span>Status</span><small>Where is this action now?</small><select value={draft.status} onChange={e => change('status', e.target.value)}>{[['planned','Planned'],['in_progress','In progress'],['in_review','In review'],['completed','Completed'],['cancelled','Cancelled']].map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select><small className="origin">{draft.status === initial.status ? 'Default: Planned' : 'Edited by you'}</small></label>
        {field('expected_outcome', 'Expected outcome', 'What should be different if this action achieves its intended purpose?', 'textarea')}
        {field('success_measure', 'How will we know it worked?', 'The measurable sign or observation that would indicate success.', 'textarea')}
        {field('start_date', 'Start date', 'When do you expect this action to begin?', 'date')}
        {field('review_date', 'Review date', 'When should the organisation review progress or outcome?', 'date')}
        {draft.status === 'completed' && field('completed_date', 'Completed date', 'When was this action completed?', 'date')}
      </div><p>Saving records your reviewed plan; it does not carry out the action.</p>
      {error && <p role="alert">{error}</p>}
      <div className="actions"><button type="button" onClick={onCancel}>Cancel</button><button className="save" type="submit">{busy ? 'Saving…' : 'I’ve reviewed this and want to save it'}</button></div>
      </fieldset>
    </form>
    <style jsx>{`
      .action-review{box-sizing:border-box;width:100%;min-width:0;margin:28px 0;padding:clamp(18px,4vw,32px);border:1px solid #cbd8cb;border-radius:24px;background:#faf9f5;text-align:left;color:#29382e}
      h2{margin:6px 0 12px;font-size:24px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#6f675b}p{line-height:1.6}fieldset{border:0;padding:0;margin:0;min-width:0}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.wide{grid-column:1/-1}
      label{display:flex;flex-direction:column;gap:8px;min-width:0}label span{font-weight:700}small{font-size:13px;line-height:1.5;color:#6f675b}.origin{font-size:12px;color:#526956}input,select,textarea{box-sizing:border-box;width:100%;min-width:0;max-width:100%;font:inherit;padding:12px;border:1px solid #bdcdbd;border-radius:10px;background:white;color:#29382e}textarea{min-height:110px;resize:vertical}.actions{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;margin-top:24px}button{font:inherit;border:1px solid #b9cabb;border-radius:999px;padding:12px 20px;white-space:normal;cursor:pointer}.save{background:#29533a;color:white}button:disabled{opacity:.5}
      @media(max-width:600px){.fields{grid-template-columns:minmax(0,1fr)}.actions{flex-direction:column}.actions button{width:100%}}
    `}</style>
  </section>;
}
