import { introducerSignerMatchesTerms } from "../../../../lib/introducerSignerIdentity.js";
import { createClient } from '@supabase/supabase-js';
import { acceptanceOrigin,invitationReview,acceptanceEvidence,fulfilAcceptance } from '../../../../lib/introducerAgreementAcceptance.js';
import { createAgreementDrive,googleAgreementConfig } from '../../../../lib/googleAgreementDrive.js';
import { agreementAcceptanceNotifier } from '../../../../lib/introducerAgreementEmail.js';
import { sendIntroducerActivation } from '../../../../lib/introducerActivationHandoff.server.js';

export const runtime='nodejs';
export const maxDuration=120;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function handleAcceptance(request,{env=process.env,createDatabase,reviewInvitation=invitationReview,buildEvidence=acceptanceEvidence,
  recordAcceptance,fulfil,activate=sendIntroducerActivation}={}) {
  try {
    if(request.headers.get('origin')!==acceptanceOrigin(env) || !request.headers.get('content-type')?.startsWith('application/json'))
      return reply({error:'Invalid agreement request.'},403);
    const raw=await request.text();if(raw.length>5000)return reply({error:'Request too large.'},413);
    const body=JSON.parse(raw);
    if(!['review','accept'].includes(body.action))return reply({error:'Invalid agreement action.'},400);
    const db=createDatabase
      ? await createDatabase(env)
      : createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const {agreement,review,acceptance,tokenHash}=await reviewInvitation(db,body.token);
    if(body.action==='review')return reply({accepted:Boolean(acceptance),version:agreement.version,email:agreement.terms_snapshot.contact_email,
      pdf_base64:review.pdf_base64,review_hash:review.pdf_sha256});
    const evidence=buildEvidence(body.evidence || {},agreement.terms_snapshot.contact_email);
    // Verify signer identity BEFORE durable acceptance. A different named signer
    // must expressly attest organisation/role/authority for the frozen entity.
    if (!introducerSignerMatchesTerms(agreement.terms_snapshot, evidence)) {
      return reply({error:"The signer must be the named contact or an authorised representative of the organisation named in the agreement. Check the full name, organisation and authority confirmation before accepting."},409);
    }
    const acceptanceResult=recordAcceptance
      ? await recordAcceptance(db,{tokenHash,evidence,reviewHash:body.review_hash})
      : await db.rpc('accept_introducer_agreement',{p_token_hash:tokenHash,p_evidence:evidence,p_review_hash:body.review_hash});
    const {error}=acceptanceResult || {};
    if(error)throw Error('Acceptance unavailable.');
    let pending=true;
    try {
      const state=fulfil
        ? await fulfil({db,agreement})
        : await fulfilAcceptance({db,agreement,drive:createAgreementDrive(googleAgreementConfig()),
          notify:(...args)=>agreementAcceptanceNotifier()(...args)});
      pending=state.pending;
    } catch { /* Acceptance is durable; Root can retry fulfilment, never recreate consent. */ }
    let activationPending=true;
    // Do not start onboarding until the existing fulfilment path confirms the
    // signed PDF is archived. The coordinator independently re-reads and
    // verifies the authoritative acceptance before provisioning anything.
    if(!pending) {
      try {
        const activation=await activate({db,introducerId:agreement.introducer_id,request,action:'automatic_acceptance'});
        activationPending=!['activation_sent','activated'].includes(activation.state);
      } catch { /* Acceptance and evidence remain durable; inspect state before any manual recovery. */ }
    }
    return reply({accepted:true,pending,activationPending});
  } catch {
    return reply({error:'Unable to confirm this request. Check your details and retry, or contact enquiries@roothealth.app. If you already submitted, retrying will not create a second acceptance.'},409);
  }
}

export async function POST(request) { return handleAcceptance(request); }
