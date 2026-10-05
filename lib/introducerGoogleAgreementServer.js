import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { agreementTerms, termsHash, MASTER_DOCUMENT_ID } from './introducerGoogleAgreementTerms.js';
import { acceptanceOrigin,prepareAcceptanceInvitation } from './introducerAgreementAcceptance.js';

export async function rootAgreementAccess(request,env=process.env,client=createClient) {
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token) throw new Error('Root administrator sign-in required.');
  const auth=client(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const {data,error}=await auth.auth.getUser(token);
  const user=data?.user;
  const admins=String(env.ROOT_ADMIN_EMAIL || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
  if(error || !user?.email_confirmed_at || !admins.includes(user.email?.toLowerCase())) throw new Error('Verified Root administrator required.');
  return {user,db:client(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})};
}
export async function queryResult(query) {
  const {data,error}=await query;
  if(error) throw new Error('Agreement database operation failed. Refresh before retrying; check migration/configuration.');
  return data;
}
export async function loadAgreementState(db,id) {
  const introducer=await queryResult(db.from('organisation_introducers').select('id,name,contact_name,contact_email,introducer_market,introducer_type,referral_code,commission_percent,commission_structure,commission_basis,vat_registered,vat_number,agreement_start_date,agreement_end_date').eq('id',id).single());
  const policies=await queryResult(db.from('organisation_introducer_policies').select('id,commission_percent,commission_structure,commission_basis,effective_from,effective_until').eq('introducer_id',id));
  const rows=await queryResult(db.from('organisation_introducer_agreements').select('*,introducer_agreement_acceptances(id,accepted_at,evidence,archive_state,deliveries)').eq('introducer_id',id).order('version',{ascending:false}));
  const agreements=rows.map(({introducer_agreement_acceptances:accepted,...a})=>{
    return {...a,acceptance:(Array.isArray(accepted)?accepted[0]:accepted) || null};
  });
  const operations=await queryResult(db.from('introducer_google_agreement_operations').select('id,action,agreement_id,state,progress,lease_until,created_at').eq('introducer_id',id).not('state','in','(completed,cancelled)').order('created_at',{ascending:false}));
  return {introducer,policies,agreements,operations};
}
export function currentTerms(state,specialTerms) { return agreementTerms(state.introducer,state.policies,specialTerms); }
export function publicAgreementState(state) {
  let current=null,configurationError=null;
  try {current=currentTerms(state,state.agreements[0]?.terms_snapshot.special_terms || 'None');} catch(e){configurationError=e.message;}
  return {agreements:state.agreements,operations:state.operations.map(({progress,...op})=>({...op,
    deliveryUncertain:Boolean(progress.smtp_started && !progress.smtp_receipt),hasReceipt:Boolean(progress.smtp_receipt),
    canCancel:!progress.smtp_started && !progress.pdf_started && (!op.lease_until || new Date(op.lease_until)<=new Date())})),
    currentTerms:current,configurationError,needsUpdating:Boolean(current && state.agreements[0] && termsHash(current)!==state.agreements[0].terms_hash)};
}

export async function runGoogleAgreement({db,user,body,drive,mail,load=loadAgreementState,invite=prepareAcceptanceInvitation,origin}) {
  if(body.action==='accept')throw new Error('Customer acceptance required.');
  const state=await load(db,body.introducerId);
  const latest=state.agreements[0];
  const existing=await queryResult(db.from('introducer_google_agreement_operations').select('*').eq('id',body.requestId).maybeSingle());
  if(existing && (existing.actor_id!==user.id || existing.introducer_id!==body.introducerId || existing.action!==body.action)) throw new Error('Operation identity mismatch.');
  if(existing?.state==='completed') return {agreementId:existing.agreement_id};
  const agreement=state.agreements.find(a=>a.id===(existing?.payload.agreement_id || body.agreementId));
  let payload;
  if(body.action==='generate') {
    const terms=currentTerms(state,body.specialTerms);
    payload={terms,terms_hash:termsHash(terms),previous_id:latest?.id || null,template_id:MASTER_DOCUMENT_ID};
    if(latest && body.confirmed!==true && !existing) throw new Error('Confirm creating a new copy; manual edits are not carried forward.');
  } else {
    if(!agreement || agreement.id!==latest?.id) throw new Error('Refresh and select the latest agreement.');
    payload={agreement_id:agreement.id,current_terms_hash:termsHash(currentTerms(state,agreement.terms_snapshot.special_terms)),confirmed:body.confirmed===true};
    if(body.action==='send' && payload.current_terms_hash!==agreement.terms_hash) throw new Error('Agreement needs updating before sending.');
  }
  const lease=randomUUID();
  const operation=await queryResult(db.rpc('begin_introducer_google_operation',{p_id:body.requestId,p_introducer:body.introducerId,
    p_action:body.action,p_actor:user.id,p_lease:lease,p_payload:payload}));
  if(operation.state==='completed') return {agreementId:operation.agreement_id};
  async function checkpoint(progress) {
    await queryResult(db.rpc('checkpoint_introducer_google_operation',{p_id:operation.id,p_lease:lease,p_progress:progress}));
    Object.assign(operation.progress,progress);
  }
  try {
    let result;
    if(operation.action==='generate') result=await drive.generate(operation,checkpoint);
    else {
      result=operation.progress.smtp_receipt;
      if(!result) {
        if(operation.progress.smtp_started) throw new Error('Email outcome uncertain. Check sent mail before an explicit resend.');
        const refreshed=await load(db,body.introducerId);
        const terms=currentTerms(refreshed,agreement.terms_snapshot.special_terms);
        if(termsHash(terms)!==agreement.terms_hash) throw new Error('Agreement needs updating before sending.');
        await drive.verifyDocument(agreement,terms.contact_email);
        const link=await invite(db,drive,agreement,origin || acceptanceOrigin());
        // Retain legacy checkpoint names so existing uncertain sends remain blocked.
        await checkpoint({smtp_started:true});
        result=await mail(agreement,terms.contact_email,operation.id,link);
        await checkpoint({smtp_receipt:result});
      }
    }
    const id=await queryResult(db.rpc('finish_introducer_google_operation',{p_id:operation.id,p_lease:lease,p_result:result}));
    return {agreementId:id};
  } catch(error) {
    // Keep a durable retry record with only a fixed safe diagnostic label.
    const safeReason =
      error.message==='Root agreement email delivery is unconfirmed. Check Resend before an explicit resend.' ? 'email_unconfirmed' :
      error.message==='Recipient does not have access to this agreement.' ? 'recipient_access' :
      error.message==='Agreement sharing is broader than Root and the intended recipient.' ? 'sharing_scope' :
      error.message==='Root must own the agreement file/folder.' ? 'ownership' :
      error.message==='Agreement fields were not fully populated.' ? 'merge_validation' :
      error.message==='Agreement needs updating before sending.' ? 'terms_changed' :
      error.message==='Email outcome uncertain. Check sent mail before an explicit resend.' ? 'smtp_uncertain' :
      error.message==='Root SMTP is not configured.' ? 'smtp_config' :
      error.message==='SMTP did not confirm recipient acceptance.' ? 'smtp_rejected' :
      error.message?.startsWith('Google agreement operation failed') ? 'google_api' :
      error.message?.startsWith('Google authorisation failed') ? 'google_auth' :
      'unknown';
    const failureProgress={failure_reason:safeReason};
    const state=operation.action==='send' && operation.progress.smtp_started && !operation.progress.smtp_receipt?'uncertain':'failed';
    await db.rpc('checkpoint_introducer_google_operation',{p_id:operation.id,p_lease:lease,p_progress:failureProgress,p_state:state});
    Object.assign(operation.progress,failureProgress);
    throw error;
  }
}
