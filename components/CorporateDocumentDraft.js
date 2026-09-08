"use client";
import { useState, useRef } from 'react';
export default function CorporateDocumentDraft({ entry, access }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState('Organisation document draft');
  const [content, setContent] = useState(entry.content), [review, setReview] = useState(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  if (entry.voiceSessionId || !entry.draftOrigin || !entry.documentHandoff?.reference) return null;
  const edited = content !== entry.content;
  async function perform(operation) {
    if (lock.current || (operation === 'export' && !confirmed)) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/organisation/document-drafts?organisation_id=${encodeURIComponent(access.organisationId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.accessToken}` },
        body: JSON.stringify({ operation, title, content, confirmed, origin: entry.draftOrigin, reference: entry.documentHandoff.reference }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      if (operation === 'recheck') setReview(await response.json());
      else {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = 'root-document-draft.pdf'; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (failure) { setError(failure.message || 'Draft unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div style={{ marginTop: 12, textAlign: 'left' }}>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>Document Draft</button>
    {open && <fieldset disabled={busy} style={{ border: '1px solid #b9cabb', borderRadius: 16, padding: 16 }}>
      <legend>{edited ? 'User-edited content' : 'Root-generated content'}</legend>
      <p>This editable narrative is not verified evidence. The protected evidence appendix stays unchanged. Review personal information and unsupported claims before sharing.</p>
      <label>Draft title<input value={title} maxLength={200} onChange={e => { setTitle(e.target.value); setConfirmed(false); }} style={{ display: 'block', width: '100%' }} /></label>
      <label>Draft body<textarea value={content} maxLength={30000} onChange={e => { setContent(e.target.value); setReview(null); setConfirmed(false); }} style={{ display: 'block', boxSizing: 'border-box', width: '100%', minHeight: 240 }} /></label>
      <button type="button" onClick={() => perform('recheck')}>Recheck against evidence</button>
      <p>Checks exact statements such as “stress_score baseline mean: 6” or “stress_score matched change: 1”. Other narrative remains unchecked.</p>
      {review && <div role="status"><p>{review.scope}</p><ul>{review.claims.map((claim, index) => <li key={index}>Statement {index + 1}: {claim.status.replaceAll('_', ' ')}</li>)}</ul></div>}
      <details><summary>Immutable protected evidence</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{entry.documentHandoff.content}</pre></details>
      <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this draft and confirm export with its provenance and unvalidated-content labels.</label>
      <button type="button" disabled={!confirmed} onClick={() => perform('export')}>Download Draft PDF</button>
    </fieldset>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
