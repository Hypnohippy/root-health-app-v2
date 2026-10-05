import { createClient } from '@supabase/supabase-js';
import { acceptanceOrigin,invitationReview,acceptanceEvidence,fulfilAcceptance } from '../../../../lib/introducerAgreementAcceptance.js';
import { createAgreementDrive,googleAgreementConfig } from '../../../../lib/googleAgreementDrive.js';
import { agreementAcceptanceNotifier } from '../../../../lib/introducerAgreementEmail.js';

export const runtime='nodejs';
export const maxDuration=120;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request) {
  try {
    if(request.headers.get('origin')!==acceptanceOrigin() || !request.headers.get('content-type')?.startsWith('application/json'))
      return reply({error:'Invalid agreement request.'},403);
    const raw=await request.text();if(raw.length>5000)return reply({error:'Request too large.'},413);
    const body=JSON.parse(raw);
    if(!['review','accept'].includes(body.action))return reply({error:'Invalid agreement action.'},400);
    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const {agreement,review,acceptance,tokenHash}=await invitationReview(db,body.token);
    if(body.action==='review')return reply({accepted:Boolean(acceptance),version:agreement.version,email:agreement.terms_snapshot.contact_email,
      pdf_base64:review.pdf_base64,review_hash:review.pdf_sha256});
    const evidence=acceptanceEvidence(body.evidence || {},agreement.terms_snapshot.contact_email);
    const {error}=await db.rpc('accept_introducer_agreement',{p_token_hash:tokenHash,p_evidence:evidence,p_review_hash:body.review_hash});
    if(error)throw Error('Acceptance unavailable.');
    let pending=true;
    try {
      const state=await fulfilAcceptance({db,agreement,drive:createAgreementDrive(googleAgreementConfig()),
        notify:(...args)=>agreementAcceptanceNotifier()(...args)});
      pending=state.pending;
    } catch { /* Acceptance is durable; Root can retry fulfilment, never recreate consent. */ }
    return reply({accepted:true,pending});
  } catch {
    return reply({error:'Unable to confirm this request. Check your details and retry, or contact enquiries@roothealth.app. If you already submitted, retrying will not create a second acceptance.'},409);
  }
}
