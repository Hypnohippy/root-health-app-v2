"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import './agreement.css';
export default function IntroducerAgreement() {
  const [token,setToken]=useState(''), [session,setSession]=useState(null), [review,setReview]=useState(null), [copies,setCopies]=useState([]);
  const [email,setEmail]=useState(''), [name,setName]=useState(''), [capacity,setCapacity]=useState('');
  const [agreed,setAgreed]=useState(false), [authority,setAuthority]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  useEffect(()=>{
    const incoming=new URLSearchParams(location.hash.slice(1)).get('token');
    if(incoming){sessionStorage.setItem('root_agreement_invitation',incoming);history.replaceState(null,'',location.pathname);}
    setToken(incoming||sessionStorage.getItem('root_agreement_invitation')||'');
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data}=supabase.auth.onAuthStateChange((_event,value)=>{setSession(value);setReview(null);setCopies([]);});
    return ()=>data.subscription.unsubscribe();
  },[]);
  async function api(body){
    const response=await fetch('/api/introducer-agreements',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session?.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Agreement unavailable');return data;
  }
  async function run(action){setBusy(true);setMessage('');try{await action();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  async function download(id){
    const response=await fetch(`/api/introducer-agreements/${id}/pdf`,{headers:{Authorization:`Bearer ${session.access_token}`}});
    if(!response.ok)throw Error('Archive pending or unavailable. Retry archiving first.');
    const href=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=href;a.download=`root-agreement-${id}.pdf`;a.click();URL.revokeObjectURL(href);
  }
  return <main className="agreement-page" style={{maxWidth:800,margin:'0 auto',padding:24,color:'#173e36',background:'#fff',overflowWrap:'anywhere'}}>
    <h1>Root Introducer Agreement</h1>{message&&<p role="status">{message}</p>}
    {!session?<form onSubmit={e=>{e.preventDefault();run(async()=>{
      const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/introducer-agreement`}});
      if(error)throw Error('Unable to send sign-in link.');setMessage('Check your email for the sign-in link. Return to your invitation in this browser after signing in.');
    });}}><label>Invited email <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>Send Sign-in Link</button></form>:<>
      <p>Signed in as {session.user.email}</p>
      <button disabled={busy||!token} onClick={()=>run(async()=>{setReview(await api({action:'review',token}));setAgreed(false);setAuthority(false);})}>Review Agreement & Commercial Terms</button>{' '}
      <button disabled={busy} onClick={()=>run(async()=>setCopies((await api()).acceptances))}>My Accepted Copies</button>
      {review&&<><h2>{review.version.version}</h2><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{review.version.agreement_text}</div>
        <h2>Commercial Terms</h2><dl>{Object.entries(review.offer.terms).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{value===null?'Not specified':String(value)}</dd></div>)}</dl>
        <h2>Electronic acceptance</h2><p style={{whiteSpace:'pre-wrap'}}>{review.version.acceptance_text}</p>
        <form onSubmit={e=>{e.preventDefault();run(async()=>{
          const result=await api({action:'accept',token,name,capacity,agreed,authority});setMessage(result.archived?'Agreement accepted and archived. Your copy is available below.':result.error);
          setCopies((await api()).acceptances);setReview(null);sessionStorage.removeItem('root_agreement_invitation');setToken('');
        });}}>
          <p><label>Full name <input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label></p>
          <p><label>Role/capacity <input required maxLength={200} value={capacity} onChange={e=>setCapacity(e.target.value)}/></label></p>
          <p>Verified email: {review.email}</p>
          <p><label><input type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/> {review.version.agreement_confirmation_text}</label></p>
          <p><label><input type="checkbox" required checked={authority} onChange={e=>setAuthority(e.target.checked)}/> {review.version.authority_confirmation_text}</label></p>
          <button disabled={busy}>Accept Agreement</button>
        </form></>}
      {copies.map(a=><section key={a.id} style={{borderTop:'1px solid #ccd9d3',marginTop:20}}><h2>{a.version}</h2><p>{a.accepted_at}</p>
        <p>{a.archived?'Archived':'Acceptance recorded; archive pending'}</p>
        {a.links?.map(link=><p key={link.market}><a href={link.url}>{link.market} referral link</a></p>)}
        <button disabled={busy} onClick={()=>run(()=>download(a.id))}>Download Accepted PDF</button>{' '}
        <button disabled={busy||a.archived} onClick={()=>run(async()=>{await api({action:'retry',id:a.id});setCopies((await api()).acceptances);setMessage('Archive complete.');})}>Retry Pending Archive</button>
      </section>)}
    </>}
  </main>;
}
