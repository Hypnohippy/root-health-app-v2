import { rootAgreementAccess, loadAgreementState, publicAgreementState, runGoogleAgreement, queryResult } from '../../../../../lib/introducerGoogleAgreementServer.js';
import { createAgreementDrive, googleAgreementConfig } from '../../../../../lib/googleAgreementDrive.js';
import { agreementMailer,agreementAcceptanceNotifier } from '../../../../../lib/introducerAgreementEmail.js';
import { acceptanceOrigin,fulfilAcceptance } from '../../../../../lib/introducerAgreementAcceptance.js';

export const runtime='nodejs';
export const maxDuration=120;
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request) {
  let access;
  try {access=await rootAgreementAccess(request);} catch {return reply({error:'Verified Root administrator required.'},403);}
  const id=new URL(request.url).searchParams.get('introducerId');
  if(!uuid(id)) return reply({error:'Invalid introducer.'},400);
  try {
    const state=await loadAgreementState(access.db,id);
    let googleConfigured=true;
    try {googleAgreementConfig();} catch {googleConfigured=false;}
    return reply({...publicAgreementState(state),googleConfigured});
  } catch {return reply({error:'Agreement history unavailable. Check the agreement migration and retry.'},503);}
}
export async function POST(request) {
  let access;
  try {access=await rootAgreementAccess(request);} catch {return reply({error:'Verified Root administrator required.'},403);}
  try {
    const text=await request.text();
    if(text.length>10000) return reply({error:'Request too large.'},413);
    const body=JSON.parse(text);
    if(!uuid(body.introducerId) || !uuid(body.requestId) || !['generate','send','fulfil','cancel'].includes(body.action))
      return reply({error:'Invalid agreement operation.'},400);
    if(body.action==='cancel') {
      if(body.confirmed!==true)return reply({error:'Cancellation confirmation required.'},400);
      await queryResult(access.db.rpc('cancel_introducer_google_operation',{p_id:body.requestId,p_actor:access.user.id}));
      return reply({success:true});
    }
    const drive=createAgreementDrive(googleAgreementConfig());
    if(body.action==='fulfil') {
      const state=await loadAgreementState(access.db,body.introducerId);
      const agreement=state.agreements.find(a=>a.id===body.agreementId && a.acceptance);
      if(!agreement)return reply({error:'Customer acceptance required.'},409);
      return reply({success:true,...await fulfilAcceptance({db:access.db,agreement,drive,notify:(...args)=>agreementAcceptanceNotifier()(...args)})});
    }
    const mail=body.action==='send'?agreementMailer():null;
    const origin=body.action==='send'?acceptanceOrigin():undefined;
    const result=await runGoogleAgreement({...access,body,drive,mail,origin});
    return reply({success:true,...result});
  } catch(error) {
    if(['Agreement acceptance site is not configured.','Agreement acceptance Preview origin must not be Production.','Customer acceptance required.','Root agreement email is not configured.','Root agreement email delivery is unconfirmed. Check Resend before an explicit resend.'].includes(error.message))
      return reply({error:error.message},409);
    // Only our fixed messages may reach the browser; provider/network diagnostics may contain credentials.
    const safe=/^(Google agreement connection|Root SMTP|Agreement needs updating|Confirm |Refresh and select|An effective commercial|A name and valid|Unsupported commercial|Agreement fields|Operation identity|Agreement database|Copy outcome uncertain|Multiple operation|Master |The agreement still|Root must own|Agreement sharing|Select the private|Recipient does not|Document changed|Archive hash|Archive identity|Invalid or oversized|Uploaded PDF|Google authorisation|Google agreement operation|Email outcome uncertain)/;
    return reply({error:safe.test(error.message)?error.message:'Agreement operation did not complete. Refresh history before retrying; do not assume an email was unsent.'},409);
  }
}
