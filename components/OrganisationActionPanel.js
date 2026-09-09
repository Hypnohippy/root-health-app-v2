"use client";
import { useEffect, useState } from 'react';
import { ACTION_FILTERS, loadActionPanel } from '../lib/organisationActionPanel.js';

const label = value => value ? value.replaceAll('_', ' ') : 'Not recorded';
export default function OrganisationActionPanel({ access, revision = 0 }) {
  const [pages, setPages] = useState(null);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPages(null); setOpen(null); setError(false);
    if (access?.accessToken && access?.organisationId) loadActionPanel({ ...access, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPages({ organisationId: access.organisationId, data: result }); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [access?.accessToken, access?.organisationId, retry, revision]);
  if (!access?.organisationId) return null;
  const page = pages?.organisationId === access.organisationId ? pages.data[filter] : null;
  return <section className="root-actions" aria-labelledby="root-actions-title">
    <h2 id="root-actions-title">Current Actions &amp; Initiatives</h2>
    <p>Latest five records per view. Recorded outcomes are not proof that an intervention worked.</p>
    <div className="filters" aria-label="Filter actions by status">
      {ACTION_FILTERS.map(([key, title]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setOpen(null); }}>
        {title} ({pages?.organisationId === access.organisationId ? pages.data[key].total ?? '—' : '—'})
      </button>)}
    </div>
    {error ? <p role="alert">Actions could not be loaded. <button type="button" onClick={() => setRetry(n => n + 1)}>Retry</button></p>
      : !page ? <p role="status">Loading actions…</p>
      : !page.actions.length ? <p>No actions in this view.</p>
      : <ul>{page.actions.map(action => <li key={action.id}>
        <div className="action-row"><strong>{action.title}</strong><span className="pill">{label(action.status)}</span>
          <span>Owner: {action.owner || 'Unassigned'}</span><span>Review: {action.review_date || 'Not set'}</span>
          <span>Outcome: {label(action.outcome_status)}</span>
          <button type="button" aria-expanded={open === action.id} aria-controls={`action-${action.id}`} onClick={() => setOpen(open === action.id ? null : action.id)}>{open === action.id ? 'Close' : 'Open'}</button>
        </div>
        {open === action.id && <div id={`action-${action.id}`}><h3>{action.title}</h3><dl>
          {['type', 'rationale', 'evidence_summary', 'expected_outcome', 'success_measure', 'start_date', 'completed_date', 'source', 'source_reference', 'outcome_summary'].map(field => <div key={field}><dt>{label(field)}</dt><dd>{action[field] || 'Not recorded'}</dd></div>)}
        </dl></div>}
      </li>)}</ul>}
    <a href="/organisation/actions" aria-disabled="true" onClick={event => event.preventDefault()}>View all actions</a> <small>Full browser coming later</small>
    <style jsx>{`
      .root-actions {margin-top:28px;padding:24px;border:1px solid rgba(72,119,84,.2);border-radius:22px;background:rgba(255,255,255,.65);color:#29382e}
      h2 {margin:0 0 10px;font-size:22px} p,small {color:#6f675b} .filters,.action-row {display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      button,.pill {border:1px solid rgba(72,119,84,.25);border-radius:999px;padding:7px 12px;background:rgba(72,119,84,.08);color:#29533a}
      button {cursor:pointer} button[aria-pressed=true] {background:#29533a;color:white} ul {list-style:none;padding:0} li {padding:16px 0;border-bottom:1px solid #dfe5df}
      strong {flex:1;min-width:180px} .pill,dt {text-transform:capitalize} dl {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;text-align:left} dl div {min-width:0;margin:0} dt {font-weight:600} dd {margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere} a {color:#6f675b} .action-row {font-size:14px}
    `}</style>
  </section>;
}
