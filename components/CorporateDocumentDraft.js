"use client";
import { useState, useRef } from 'react';
import { evidenceCheckSummary } from '../lib/evidenceCheckPresentation.js';
import CorporateDocumentPreview from './CorporateDocumentPreview.js';
import { documentBlocks, editDocumentBlock } from '../lib/corporateOutputPresentation.js';
export default function CorporateDocumentDraft({ entry, access }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState('Organisation document draft');
  const [content, setContent] = useState(entry.content), [review, setReview] = useState(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [view, setView] = useState('preview');
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const checkSummary = review ? evidenceCheckSummary(review) : null;
  if (entry.voiceSessionId || !entry.draftOrigin || !entry.documentHandoff?.reference) return null;
  const edited = content !== entry.content;
  async function perform(operation) {
    if (lock.current || (operation === 'export' && !confirmed)) return;
    lock.current = true; setBusy(true); setError('');
    if (operation === 'recheck') { setChecking(true); setReview(null); }
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
    finally { lock.current = false; setBusy(false); setChecking(false); }
  }
  return <div className="document-draft">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>Create Document Draft</button>
    {open && <fieldset className="output-panel" disabled={busy}>
      <legend className="provenance">{edited ? 'User-edited content' : 'Root-generated content'}</legend>
      <p>This editable narrative is not verified evidence. The protected evidence appendix stays unchanged. Review personal information and unsupported claims before sharing.</p>
      <label>Draft title<input value={title} maxLength={200} onChange={e => { setTitle(e.target.value); setConfirmed(false); }} style={{ display: 'block', width: '100%' }} /></label>
      <div className="buttons" aria-label="Document view"><button type="button" aria-pressed={view === 'edit'} onClick={() => setView('edit')}>Edit</button><button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</button></div>
      {view === 'preview' ? <article aria-label="Document preview"><h2>{title}</h2><CorporateDocumentPreview content={content} /></article> : <div aria-label="Edit document wording">{documentBlocks(content).map((block,index) => <label key={block.index}>{block.kind === 'heading' ? 'Section heading' : block.kind === 'numbered' ? 'Recommendation ' + block.number : 'Paragraph ' + (index + 1)}<textarea value={block.text} ref={element => { if(element) { element.style.height='auto';element.style.height=Math.max(100,element.scrollHeight+2)+'px'; } }} onChange={e => { const next=editDocumentBlock(content,block,e.target.value); if(next.length<=30000) { setContent(next); setReview(null); setConfirmed(false); } }} /></label>)}</div>}
      <button type="button" disabled={busy} onClick={() => perform('recheck')}>{checking ? 'Checking evidence…' : 'Recheck against evidence'}</button>
      {checking && <p role="status" aria-live="polite">Checking this draft against Root’s protected organisational evidence…</p>}
      <p>This checks only supported exact metric statements against released evidence. It does not verify the whole document or establish causes or outcomes.</p>
      {checkSummary && <section className={checkSummary.attention ? "evidence-check attention" : "evidence-check"} role="status" aria-live="polite"><h3>{checkSummary.title}</h3>{checkSummary.messages.map((message,index)=><p key={index}>{message}</p>)}</section>}
      <details><summary>Immutable protected evidence</summary><CorporateDocumentPreview content={entry.documentHandoff.content} evidence /></details>
      <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this draft and confirm export with its provenance and unvalidated-content labels.</label>
      <button className="primary" type="button" disabled={!confirmed} onClick={() => perform('export')}>Download PDF</button>
    </fieldset>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
