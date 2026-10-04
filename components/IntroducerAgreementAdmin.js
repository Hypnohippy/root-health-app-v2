"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabase';
export default function IntroducerAgreementAdmin({ introducer }) {
  const [data, setData] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [url, setUrl] = useState('');
  const [percent, setPercent] = useState(''), [structure, setStructure] = useState('');
  async function request(path, body) {
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${session.session?.access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (path.endsWith('/pdf') && response.ok) {
      const href = URL.createObjectURL(await response.blob()), a = document.createElement('a');
      a.href = href; a.download = 'root-accepted-agreement.pdf'; a.click(); URL.revokeObjectURL(href); return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Agreement unavailable');
    return result;
  }
  async function run(action) { setBusy(true); setMessage(''); try { await action(); } catch(e) { setMessage(e.message); } finally { setBusy(false); } }
  return <section style={{ marginTop: 16, borderTop: '1px solid #cad7d0', paddingTop: 12 }}>
    <button type="button" disabled={busy} onClick={() => data ? setData(null) : run(async()=>setData(await request(`/api/admin/introducers/agreements?introducerId=${introducer.id}`)))}>{data ? 'Close Agreement' : 'Agreement & Accepted Copies'}</button>
    {message && <p role="status">{message}</p>}
    {data && <>
      <p>{data.acceptances.length ? 'Electronic acceptance recorded' : data.introducer.agreement_legacy ? 'Legacy agreement; electronic acceptance not recorded' : 'Awaiting acceptance'}</p>
      <p>Draft for Legal Review</p>
      <p>Replacement commercial terms (optional; effective only after acceptance and archive):</p>
      <label>Commission % <input type="number" min="0" max="100" step="0.01" value={percent} onChange={e=>setPercent(e.target.value)} /></label>
      <label>Structure <select value={structure} onChange={e=>setStructure(e.target.value)}><option value="">Keep current terms</option><option value="one_off">One-off</option><option value="recurring">Recurring</option></select></label>
      <button type="button" disabled={busy || !introducer.contact_email} onClick={() => run(async()=> {
        const changes = { ...(percent === '' ? {} : {commission_percent: Number(percent)}), ...(structure ? {commission_structure: structure} : {}) };
        const issued = await request('/api/admin/introducers/agreements', { action:'issue', introducerId:introducer.id, email:introducer.contact_email, changes });
        setUrl(issued.url); setMessage('Invitation issued. Previous invitation links revoked. No email sent.');
      })}>Issue New Acceptance Invitation</button>
      <button type="button" disabled={busy} onClick={()=>run(async()=>{await request('/api/admin/introducers/agreements',{action:'revoke',introducerId:introducer.id});setUrl('');setMessage('Outstanding invitations revoked.');})}>Revoke Outstanding Invitations</button>
      {!introducer.contact_email && <p>A contact email is required before issuing an invitation.</p>}
      {url && <p style={{overflowWrap:'anywhere'}}><a href={url}>{url}</a></p>}
      {data.acceptances.map(a=><div key={a.id}><p>{a.version} · {a.accepting_name} · {a.accepted_at}</p><p>{a.archived?'Archived':'Acceptance recorded; archive pending'}</p>
        <button type="button" disabled={busy||!a.archived} onClick={()=>run(()=>request(`/api/introducer-agreements/${a.id}/pdf`))}>Download Accepted PDF</button>{' '}
        <button type="button" disabled={busy||a.archived} onClick={()=>run(async()=>{await request('/api/admin/introducers/agreements',{action:'retry',id:a.id});setData(await request(`/api/admin/introducers/agreements?introducerId=${introducer.id}`));setMessage('Archive complete.');})}>Retry Pending Archive</button>
      </div>)}
    </>}
  </section>;
}
