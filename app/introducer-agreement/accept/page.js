'use client';

import { useEffect,useRef,useState } from 'react';
import { ACCEPTANCE_TEXT,AUTHORITY_TEXT } from '../../../lib/introducerAgreementConsent.js';

export default function AcceptAgreement() {
  const token=useRef(''),started=useRef(false);
  const [review,setReview]=useState(null),[pdf,setPdf]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [fields,setFields]=useState({full_name:'',organisation:'',role:'',email:'',date:'',confirmed:false,authority:false});
  async function request(body) {
    const response=await fetch('/api/introducer-agreement/accept',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...body,token:token.current}),cache:'no-store',referrerPolicy:'no-referrer'});
    const result=await response.json();if(!response.ok)throw Error(result.error);return result;
  }
  useEffect(()=>{
    if(started.current)return;started.current=true;
    token.current=window.location.hash.slice(1);
    window.history.replaceState(window.history.state,'',window.location.pathname);
    if(!token.current){setError('Please open the private invitation from your agreement email.');return;}
    request({action:'review'}).then(result=>{
      setReview(result);setDone(result.accepted);
      setFields(f=>({...f,email:result.email,date:new Date().toLocaleDateString('en-CA')}));
      const bytes=Uint8Array.from(atob(result.pdf_base64),c=>c.charCodeAt(0));
      setPdf(URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})));
    }).catch(e=>setError(e.message));
  },[]);
  useEffect(()=>()=>{if(pdf)URL.revokeObjectURL(pdf);},[pdf]);
  async function accept(event) {
    event.preventDefault();setBusy(true);setError('');
    try {await request({action:'accept',review_hash:review.review_hash,evidence:fields});setDone(true);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const input={display:'block',boxSizing:'border-box',width:'100%',padding:10,marginTop:5,border:'1px solid #b9c5cb',borderRadius:5,font:'inherit'};
  return <main style={{maxWidth:900,margin:'32px auto',padding:20,color:'#17212b',fontFamily:'Arial, sans-serif'}}>
    <h1 style={{fontSize:28}}>Root Health</h1><h2 style={{fontSize:22}}>Introducer Agreement</h2>
    {done?<p role="status">Thank you. Your Root Health Introducer Agreement has been accepted. A copy will be emailed to you shortly.</p>:<>
      {!review && !error && <p role="status">Loading your agreement...</p>}
      {review && <>
        <h3 style={{fontSize:18}}>Agreement and Commercial Terms — version {review.version}</h3>
        <a href={pdf} target="_blank" rel="noopener noreferrer">Open agreement PDF</a>
        {pdf && <iframe title="Agreement and Commercial Terms" src={pdf} style={{width:'100%',height:560,border:'1px solid #b9c5cb',marginTop:12}} />}
        <form onSubmit={accept} style={{display:'grid',gap:16,marginTop:24}}>
          {[['full_name','Full name','text',true],['organisation','Organisation (if applicable)','text',false],['role','Role / capacity','text',true],['email','Email','email',true],['date','Date','date',true]].map(([key,label,type,required])=>
            <label key={key}>{label}<input style={input} type={type} required={required} maxLength={key==='organisation'?300:200} readOnly={key==='email'} value={fields[key]} disabled={busy}
              onChange={e=>setFields({...fields,[key]:e.target.value})} /></label>)}
          <label><input type="checkbox" required checked={fields.confirmed} disabled={busy} onChange={e=>setFields({...fields,confirmed:e.target.checked})} /> {ACCEPTANCE_TEXT}</label>
          {fields.organisation.trim() && <label><input type="checkbox" required checked={fields.authority} disabled={busy} onChange={e=>setFields({...fields,authority:e.target.checked})} /> {AUTHORITY_TEXT}</label>}
          <button type="submit" disabled={busy || !fields.confirmed || (Boolean(fields.organisation.trim()) && !fields.authority)} style={{padding:12,borderRadius:5,font:'inherit'}}>{busy?'Recording acceptance...':'Accept Agreement'}</button>
        </form>
      </>}
    </>}
    {error && <p role="alert">{error}</p>}
    <p>Questions? <a href="mailto:enquiries@roothealth.app">enquiries@roothealth.app</a></p>
  </main>;
}
