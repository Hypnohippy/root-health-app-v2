'use client';

import { useEffect, useState } from 'react';

export default function CompleteAgreement() {
  const [token,setToken]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);
  const [done,setDone]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setToken(window.location.hash.slice(1));window.history.replaceState(null,'',window.location.pathname);},[]);
  async function complete(event) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/introducer-agreement/complete',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token,confirmed}),cache:'no-store',referrerPolicy:'no-referrer'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      setDone(true);
    } catch(e){setError(e.message || 'Unable to submit. Please try again.');} finally {setBusy(false);}
  }
  return <main style={{maxWidth:640,margin:'48px auto',padding:24,color:'#17212b'}}>
    <h1 style={{fontSize:28}}>Root Health</h1><h2 style={{fontSize:22}}>Introducer agreement</h2>
    {done?<p role="status">Your agreement has been returned for review. Root Health will review it and confirm acceptance. It is not accepted yet.</p>:<>
      <p>When you have completed the agreement, click &quot;I&apos;ve completed my agreement&quot;. Root Health will then review it and confirm acceptance.</p>
      <form onSubmit={complete}>
        <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required disabled={busy} /> I have completed my agreement and am returning it for Root Health to review.</label>
        <button type="submit" disabled={!token || !confirmed || busy} style={{display:'block',marginTop:20,padding:'12px 18px',borderRadius:6}}>
          {busy?'Returning agreement...':"I've completed my agreement"}
        </button>
      </form>
      {!token && <p>Please open the completion link in your agreement email.</p>}
    </>}
    {error && <p role="alert">{error}</p>}
    <p>Questions? <a href="mailto:enquiries@roothealth.app">enquiries@roothealth.app</a></p>
  </main>;
}
