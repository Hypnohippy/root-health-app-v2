"use client";
import { useRef, useState } from 'react';
import CorporateDocumentPreview from './CorporateDocumentPreview.js';
import CorporateOutputStyles from './CorporateOutputStyles.js';
import CorporateDocumentDraft from './CorporateDocumentDraft.js';
import { canUseCorporateOutput } from '../lib/corporateOutput.js';

export default function CorporateOutputActions({ entry, access, onReviewAction, actionSaved = false }) {
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  if (!access?.organisationId || !canUseCorporateOutput(entry)) return null;
  function open(next) {
    setMode(next); setConfirmed(false); setMessage('');
    setDraft({ title: entry.documentHandoff.title, content: entry.documentHandoff.content });
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !confirmed) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
        const response = await fetch(`/api/organisation/documents?organisation_id=${encodeURIComponent(access.organisationId)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.accessToken}` }, body: JSON.stringify({ reference: entry.documentHandoff.reference, confirmed }),
        });
        if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Document unavailable.'); }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = 'root-organisation-document.pdf';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
        setMessage('PDF downloaded.');
    } catch (error) { setMessage(error.message || 'Request failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="output-actions root-output">
    <CorporateOutputStyles /><div className="buttons"><button type="button" disabled={busy || actionSaved} onClick={() => onReviewAction?.(entry)}>{actionSaved ? 'Action saved' : 'Save as Action / Initiative'}</button>
      {!entry.voiceSessionId && entry.documentHandoff?.reference && <button type="button" disabled={busy} onClick={() => open('document')}>Protected evidence PDF</button>}</div>
    {mode && <form className="output-panel" onSubmit={submit} aria-label="Review organisation document">
      <h4>Review before PDF download</h4>
      <p>Review the released organisational evidence below. Privacy-protected information remains unavailable. This is not proof that an intervention worked.</p>
      <h4>{draft.title}</h4><p>This exports the protected evidence supporting this typed response, not the conversational answer. The reference expires after 15 minutes; changed evidence requires a new response and review.</p>
      <CorporateDocumentPreview content={draft.content} evidence />
      <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I have reviewed the protected evidence and its limitations and confirm downloading this document.</label>
      <div className="buttons"><button className="primary" disabled={!confirmed || busy} type="submit">{busy ? 'Processing…' : 'Download PDF'}</button><button disabled={busy} type="button" onClick={() => setMode(null)}>Cancel</button></div>
    </form>}
    {message && <p role="status">{message}</p>}
    <CorporateDocumentDraft entry={entry} access={access} />

  </div>;
}
