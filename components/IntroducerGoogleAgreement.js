"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const label=status=>({draft:'Draft',sent:'Sent',accepted:'Accepted',superseded:'Superseded'}[status] || 'Not generated');
const button={padding:'9px 13px',border:'1px solid #cbd5e1',borderRadius:6,background:'#fff',color:'#17212b',cursor:'pointer',fontSize:14};
const date=value=>value?new Date(value).toLocaleString('en-GB'):'Not recorded';
export default function IntroducerGoogleAgreement({introducer}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [busy,setBusy]=useState(false),[special,setSpecial]=useState('None');
  const [failedRequest,setFailedRequest]=useState(null);
  async function api(method,body) {
    const {data:session}=await supabase.auth.getSession();
    if(!session?.session?.access_token) throw new Error('Please sign in again.');
    const response=await fetch(`/api/admin/introducers/google-agreements?introducerId=${encodeURIComponent(introducer.id)}`,{
      method,headers:{Authorization:`Bearer ${session.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || 'Agreement unavailable.');
    return result;
  }
  const load=useCallback(async()=>{
    try {const next=await api('GET');setData(next);setSpecial(next.agreements[0]?.terms_snapshot.special_terms || 'None');setError('');}
    catch(e){setError(e.message);}
  // Refresh after the existing commercial editor replaces its introducer data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[introducer]);
  useEffect(()=>{load();const refresh=()=>load();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[load]);
  const latest=data?.agreements[0];
  const pending=data?.operations.find(op=>!op.deliveryUncertain);
  const uncertain=data?.operations.some(op=>op.deliveryUncertain && op.agreement_id===latest?.id);
  const mismatch=data?.needsUpdating || (latest && special!==latest.terms_snapshot.special_terms);
  async function run(action,retry=null) {
    let confirmed=false;
    if(!retry && action==='generate' && latest) {
      confirmed=window.confirm('Create a new agreement copy using the latest terms? Manual edits in the previous Google Doc will not be carried forward. Existing documents remain preserved.');
      if(!confirmed)return;
    }
    if(action==='send') {
      confirmed=window.confirm(`${latest?.status==='sent'||uncertain?'Resend':'Send'} this agreement to ${latest?.terms_snapshot.contact_email}?${uncertain?' The previous delivery outcome is uncertain. Check Resend (and Root sent mail for older SMTP attempts) first; this may send a duplicate.':''}`);
      if(!confirmed)return;
    }
    if(action==='accept') {
      confirmed=window.confirm('Confirm Root has received the completed agreement, reviewed it, and verified its commercial terms match the frozen terms shown below. A separate PDF snapshot will be retained. This does not change commission or payment records.');
      if(!confirmed)return;
    }
    const body=retry || {action,introducerId:introducer.id,agreementId:latest?.id,requestId:crypto.randomUUID(),specialTerms:special,confirmed};
    if(action==='accept')body.confirmed=true;
    setBusy(true);setError('');setMessage('');
    try {await api('POST',body);setFailedRequest(null);await load();setMessage(action==='accept'?'Acceptance and PDF recorded.':action==='send'?'Email accepted by Resend.':'Agreement generated.');}
    catch(e){await load();setError(e.message);setFailedRequest(body);}
    finally {setBusy(false);}
  }
  async function copy() {try{await navigator.clipboard.writeText(latest.document_url);setMessage('Link copied.');}catch{setError('Clipboard unavailable. Open the agreement to copy its URL.');}}
  async function cancelPending() {
    if(!window.confirm('Cancel this unfinished operation? Any partial Google copy remains in Drive for manual reconciliation. No sent or accepted history will be deleted.'))return;
    setBusy(true);
    try{await api('POST',{action:'cancel',introducerId:introducer.id,requestId:pending.id,confirmed:true});setFailedRequest(null);await load();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const unavailable=busy || !data?.googleConfigured || Boolean(data?.configurationError);
  const retryBody=pending?{requestId:pending.id,action:pending.action,introducerId:introducer.id,agreementId:pending.agreement_id,confirmed:true,specialTerms:special}:failedRequest;
  return <section aria-label={`Agreement for ${introducer.name}`} style={{borderTop:'1px solid #dce3e7',marginTop:18,paddingTop:16,minWidth:0}}>
    <h3 style={{fontSize:16,margin:'0 0 10px'}}>Agreement: {data?label(latest?.status):'Loading'}</h3>
    {error && <p role="alert" style={{color:'#a32335',overflowWrap:'anywhere'}}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {data && !data.googleConfigured && <p>Google agreement connection not configured.</p>}
    {data?.configurationError && <p role="alert">{data.configurationError}</p>}
    {mismatch && <p role="status" style={{color:'#88530b',fontWeight:600}}>Agreement needs updating</p>}
    {uncertain && <p role="alert">Email delivery is uncertain. Check Resend (and Root sent mail for older SMTP attempts) before resending.</p>}
    {data && <>
      <label style={{display:'block',fontSize:14}}>Special Terms
        <textarea aria-label={`Special Terms for ${introducer.name}`} value={special} onChange={e=>setSpecial(e.target.value)} maxLength={5000} rows={3}
          disabled={busy} style={{display:'block',boxSizing:'border-box',width:'100%',marginTop:6,padding:10,border:'1px solid #cbd5e1',borderRadius:6,font:'inherit',resize:'vertical'}} />
      </label>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>
        {!latest && <button style={button} disabled={unavailable || !!pending} onClick={()=>run('generate')}>Generate Agreement</button>}
        {latest && <><a style={button} href={latest.document_url} target="_blank" rel="noopener noreferrer">{latest.status==='accepted'?'Open Accepted Agreement':'Open Agreement'}</a>
          <button style={button} onClick={copy}>Copy Link</button></>}
        {latest?.status==='draft' && <button style={button} disabled={unavailable || mismatch || !!pending} onClick={()=>run('send')}>{uncertain?'Resend':'Send Agreement'}</button>}
        {latest?.status==='sent' && <><button style={button} disabled={unavailable || mismatch || !!pending} onClick={()=>run('send')}>Resend</button>
          <button style={button} disabled={unavailable || !!pending} onClick={()=>run('accept')}>Mark Accepted</button></>}
        {latest?.pdf_document_url && <a style={button} href={latest.pdf_document_url} target="_blank" rel="noopener noreferrer">Open PDF</a>}
        {latest && (mismatch || latest.status==='accepted') && <button style={button} disabled={unavailable || !!pending} onClick={()=>run('generate')}>
          {latest.status==='accepted'?'Create Amendment':latest.status==='draft'?'Update Agreement':'Create Revised Agreement'}</button>}
        {retryBody && !uncertain && <button style={button} disabled={unavailable} onClick={()=>run(retryBody.action,retryBody)}>Retry Pending Operation</button>}
        {pending?.canCancel && <button style={button} disabled={busy} onClick={cancelPending}>Cancel Pending Operation</button>}
        <button style={button} disabled={busy} onClick={load}>Refresh</button>
      </div>
      {latest && <details style={{marginTop:12}}><summary>Frozen commercial terms - version {latest.version}</summary>
        <dl style={{overflowWrap:'anywhere'}}>{Object.entries(latest.terms_snapshot).map(([key,value])=><div key={key} style={{marginTop:6}}>
          <dt style={{fontWeight:600}}>{key.replaceAll('_',' ')}</dt><dd style={{marginLeft:0}}>{String(value) || 'Not specified'}</dd></div>)}</dl></details>}
      {data.agreements.length>0 && <details style={{marginTop:12}}><summary>Agreement history ({data.agreements.length})</summary>
        <ul style={{paddingLeft:20}}>{data.agreements.map(a=><li key={a.id} style={{marginTop:10,overflowWrap:'anywhere'}}>
          <a href={a.document_url} target="_blank" rel="noopener noreferrer">Version {a.version}</a> - {label(a.status)}
          <div>Generated: {date(a.generated_at)}{a.sent_at?` | Sent: ${date(a.sent_at)}`:''}{a.accepted_at?` | Accepted: ${date(a.accepted_at)}`:''}</div>
          {a.pdf_document_url && <a href={a.pdf_document_url} target="_blank" rel="noopener noreferrer">Accepted PDF</a>}
        </li>)}</ul></details>}
    </>}
  </section>;
}
