"use client";

import { useCallback,useEffect,useState } from "react";
import { supabase } from "../lib/supabase";

const agreementLabels={not_generated:"Not generated",draft:"Draft",sent:"Sent",signed_archive_pending:"Signed — archival pending",signed_review_required:"Signed — Root review required",signed_verified:"Signed and verified",superseded:"Superseded",review_required:"Needs Root review"};
const inviteLabels={not_issued:"Not issued",preparing:"Preparing",sent:"Sent",delivery_uncertain:"Delivery needs reconciliation",expired:"Expired",used:"Redeemed",revoked:"Revoked"};
const accountLabels={awaiting_activation:"Awaiting activation",active:"Active",expired:"Expired",revoked:"Revoked"};
const date=value=>value?new Date(value).toLocaleString("en-GB"):"Not recorded";
const button={padding:"9px 13px",border:"1px solid #cbd5e1",borderRadius:6,background:"#fff",color:"#17212b",cursor:"pointer",fontSize:14};

export default function IntroducerOnboarding({introducer}) {
  const [data,setData]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try {
      const {data:sessionData}=await supabase.auth.getSession();
      const token=sessionData?.session?.access_token;
      if(!token) throw new Error("Please sign in again.");
      const response=await fetch(`/api/admin/introducers/onboarding?introducerId=${encodeURIComponent(introducer.id)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || "Onboarding status is unavailable.");
      setData(result.onboarding);setError("");
    } catch(e) { setError(e.message); }
  },[introducer.id]);
  useEffect(()=>{load();const refresh=()=>load();window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[load]);

  async function act(action) {
    const prompt=action==="send_invitation"
      ? `Send a one-time, 15-minute account activation link to the address verified in the accepted agreement (${introducer.contact_email || "not recorded"})? This happens only after the latest agreement is fully accepted and archived.`
      : action==="replace_invitation"
        ? `The previous activation link has expired. Replace it for ${introducer.contact_email || "the accepted recipient"}? The prior unconfirmed Preview identity will be invalidated before a new single-use invitation is sent.`
      : "Revoke this introducer's isolated demonstration access now? This cannot be undone without a new Root approval.";
    if(!window.confirm(prompt)) return;
    setBusy(true);setError("");setMessage("");
    try {
      const {data:sessionData}=await supabase.auth.getSession();
      const response=await fetch("/api/admin/introducers/onboarding",{method:"POST",headers:{Authorization:`Bearer ${sessionData?.session?.access_token || ""}`,"Content-Type":"application/json"},body:JSON.stringify({introducerId:introducer.id,action,requestId:crypto.randomUUID()}),cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || "Onboarding action was not confirmed.");
      setMessage(action==="send_invitation"?"Secure activation invitation sent. The private link was not shown here.":"Demonstration access revoked.");
      await load();
    } catch(e) { await load();setError(e.message); }
    finally { setBusy(false); }
  }

  const state=data?.state || "registered";
  return <section aria-label={`Professional introducer onboarding for ${introducer.name}`} style={{borderTop:"1px solid #dce3e7",marginTop:14,paddingTop:14}}>
    <h3 style={{fontSize:16,margin:"0 0 8px"}}>Demo Access</h3>
    <p style={{margin:"5px 0"}}><strong>Agreement:</strong> {data?agreementLabels[data.agreement?.status] || "Needs review":"Loading"}{data?.agreement?.version?` · v${data.agreement.version}`:""}</p>
    {data?.agreement?.acceptedAt && <p style={{margin:"5px 0",fontSize:13}}>Acceptance recorded: {date(data.agreement.acceptedAt)}</p>}
    <p style={{margin:"5px 0"}}><strong>Demo invitation:</strong> {data?inviteLabels[data.invitationStatus] || "Needs reconciliation":"Loading"}</p>
    <p style={{margin:"5px 0"}}><strong>Account:</strong> {data?accountLabels[data.accountStatus] || "Needs review":"Loading"}</p>
    {data?.invitationExpiresAt && data.invitationStatus!=="used" && <p style={{margin:"5px 0",fontSize:13}}>Invitation expires: {date(data.invitationExpiresAt)}</p>}
    {data?.accessExpiresAt && <p style={{margin:"5px 0",fontSize:13}}>Demo access expires: {date(data.accessExpiresAt)}</p>}
    {data?.invite_sent_at && <p style={{margin:"5px 0",fontSize:13}}>Invitation email recorded: {date(data.invite_sent_at)} · Delivery reference: {data.invite_delivery_id || "not confirmed"}</p>}
    <p style={{margin:"5px 0",fontSize:13,color:"#59645b"}}>Uses the existing verified agreement and its named recipient. Demo access is individual, private and time-limited.</p>
    {error && <p role="alert" style={{color:"#a32335"}}>{error}</p>}{message&&<p role="status">{message}</p>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:9}}>
      <button style={button} disabled={busy} onClick={load}>Refresh status</button>
      {data?.agreement?.verified && data?.agreementReady && state==="registered" && <button style={button} disabled={busy} onClick={()=>act("send_invitation")}>{busy?"Working…":"Send Demo Invitation"}</button>}
      {data?.agreementReady && data?.canReplace && <button style={button} disabled={busy} onClick={()=>act("replace_invitation")}>{busy?"Working…":"Replace expired invitation"}</button>}
      {["activation_sent","activation_uncertain","activated"].includes(state) && <button style={button} disabled={busy||state==="revoked"} onClick={()=>act("revoke")}>Revoke demo access</button>}
    </div>
    {data?.events?.length>0&&<details style={{marginTop:10}}><summary>Onboarding audit history ({data.events.length})</summary><ol>{data.events.map(event=><li key={event.id || `${event.event_type}-${event.occurred_at}`}>{labels[event.event_type]||event.event_type} · {date(event.occurred_at)}</li>)}</ol></details>}
  </section>;
}
