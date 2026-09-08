"use client";
import { useRef, useState } from 'react';
import CorporateDocumentDraft from './CorporateDocumentDraft.js';
import { actionDraftFromResponse, canUseCorporateOutput, saveReviewedAction } from '../lib/corporateOutput.js';

export default function CorporateOutputActions({ entry, access, onSaved }) {
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  if (!access?.organisationId || !canUseCorporateOutput(entry)) return null;
  function open(next) {
    setMode(next); setConfirmed(false); setMessage('');
    setDraft(next === 'action' ? actionDraftFromResponse(entry) : { title: entry.documentHandoff.title, content: entry.documentHandoff.content });
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !confirmed) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      if (mode === 'action') {
        await saveReviewedAction({ access, draft, confirmed });
        setSaved(true); setMode(null); onSaved?.(); setMessage('Action saved as Planned.');
      } else {
        const response = await fetch(`/api/organisation/documents?organisation_id=${encodeURIComponent(access.organisationId)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.accessToken}` }, body: JSON.stringify({ reference: entry.documentHandoff.reference, confirmed }),
        });
        if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Document unavailable.'); }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = 'root-organisation-document.pdf';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
        setMessage('PDF downloaded.');
      }
    } catch (error) { setMessage(error.message || 'Request failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const field = (key, title, multiline = false) => <label key={key}>{title}
    {multiline ? <textarea value={draft[key] || ''} maxLength={key === 'content' ? 30000 : 4000} onChange={event => { setDraft({ ...draft, [key]: event.target.value }); setConfirmed(false); }} />
      : <input type={key === 'review_date' ? 'date' : 'text'} required={key === 'title'} maxLength={200} value={draft[key] || ''} onChange={event => { setDraft({ ...draft, [key]: event.target.value }); setConfirmed(false); }} />}
  </label>;
  return <div className="output-actions">
    <div className="buttons"><button type="button" disabled={busy || saved} onClick={() => open('action')}>{saved ? 'Action saved' : 'Save as Action / Initiative'}</button>
      {!entry.voiceSessionId && entry.documentHandoff?.reference && <button type="button" disabled={busy} onClick={() => open('document')}>Protected evidence PDF</button>}</div>
    {mode && <form onSubmit={submit} aria-label={mode === 'action' ? 'Review organisation action' : 'Review organisation document'}>
      <h4>{mode === 'action' ? 'Review before saving' : 'Review before PDF download'}</h4>
      <p>Keep organisational context only. Remove employee names, personal disclosures and privacy-protected evidence. This does not verify the original response or establish that an intervention worked.</p>
      {mode === 'action' ? field('title', 'Title') : <><h4>{draft.title}</h4><p>This exports the protected evidence supporting this typed response, not the conversational answer. The reference expires after 15 minutes; changed evidence requires a new response and review.</p></>}
      {mode === 'action' ? <>
        <label>Type<select value={draft.type} onChange={e => { setDraft({ ...draft, type: e.target.value }); setConfirmed(false); }}>
          <option value="action_plan">Action / Initiative</option><option value="decision">Decision</option><option value="intervention">Intervention</option>
        </select></label>
        {field('rationale', 'Rationale', true)}{field('evidence_summary', 'Response excerpt — review and edit', true)}
        {entry.content.length > 4000 && <p>Only the first 4,000 characters were prefilled. Review the excerpt for missing qualifications.</p>}
        {field('owner', 'Owner')}{field('review_date', 'Review date')}{field('expected_outcome', 'Expected outcome', true)}{field('success_measure', 'Success measure', true)}
        <p>Saved as Planned. No action will be executed.</p>
      </> : <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{draft.content}</pre>}
      <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I have reviewed this content, removed private employee information and retained the evidence qualifications. {mode === 'action' ? 'I confirm creating this planned action.' : 'I confirm downloading this document.'}</label>
      <div className="buttons"><button disabled={!confirmed || busy} type="submit">{busy ? 'Processing…' : mode === 'action' ? 'Confirm and save action' : 'Download PDF'}</button><button disabled={busy} type="button" onClick={() => setMode(null)}>Cancel</button></div>
    </form>}
    {message && <p role="status">{message}</p>}
    <CorporateDocumentDraft entry={entry} access={access} />
    <style jsx>{`
      .output-actions {width:100%;text-align:left;margin:10px 0;color:#29533a} .buttons {display:flex;gap:8px;flex-wrap:wrap} button {border:1px solid #b9cabb;border-radius:20px;padding:8px 14px;background:#edf2eb;color:#29533a;cursor:pointer} button:disabled {opacity:.5;cursor:default}
      form {padding:18px;margin-top:12px;border:1px solid #b9cabb;border-radius:16px;background:#faf9f5} label {display:block;margin:12px 0;font-weight:600} input,textarea,select {display:block;box-sizing:border-box;width:100%;padding:9px;border:1px solid #b9cabb;border-radius:8px;font:inherit} textarea {min-height:110px;resize:vertical} .confirmation input {display:inline;width:auto;margin-right:8px} p {font-size:13px;color:#6f675b}
    `}</style>
  </div>;
}
