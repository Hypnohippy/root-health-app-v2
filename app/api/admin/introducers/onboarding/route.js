import { NextResponse } from "next/server";
import { rootAgreementAccess, loadAgreementState, queryResult } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { commercialOnboardingBridgeReady, demoAccessSummary, verifiedAcceptedAgreement } from "../../../../../lib/professionalIntroducerOnboarding.server.js";
import { revokeIntroducerPreviewAccess } from "../../../../../lib/introducerPreviewBridge.server.js";
import { ActivationHandoffError, loadOnboarding, previewInternalUrl, sendIntroducerActivation } from "../../../../../lib/introducerActivationHandoff.server.js";
import { handleRootIntroducerOnboardingCallback } from "../../../../../lib/rootIntroducerOnboardingCallback.server.js";

export const runtime = "nodejs";
const reply = (body, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

export async function GET(request) {
  if(!commercialOnboardingBridgeReady()) return reply({error:"Demo access administration is not enabled on this verified Root commercial deployment."},404);
  let access;
  try { access=await rootAgreementAccess(request); } catch { return reply({error:"Verified Root administrator required."},403); }
  const id=new URL(request.url).searchParams.get("introducerId");
  if(!uuid(id)) return reply({error:"Invalid introducer."},400);
  try {
    const {row,events}=await loadOnboarding(access.db,id);
    const agreementState=await loadAgreementState(access.db,id);
    const summary=demoAccessSummary(agreementState,row);
    const agreementReady=summary.agreement.verified;
    if(!row) return reply({onboarding:{state:"registered",agreementReady,...summary,events:[]}});
    const canReplace=["activation_sent","activation_uncertain"].includes(row.state) && row.activation_expires_at && row.activation_expires_at<=new Date().toISOString();
    const {id: onboardingId,state,agreement_id,agreement_version,acceptance_id,recipient_email,accepted_at,
      activation_expires_at,invite_sent_at,invite_delivery_id,preview_grant_expires_at,activation_completed_at,revoked_at,created_at,updated_at}=row;
    return reply({onboarding:{id:onboardingId,state,agreement_id,agreement_version,acceptance_id,recipient_email,accepted_at,
      activation_expires_at,invite_sent_at,invite_delivery_id,preview_grant_expires_at,activation_completed_at,revoked_at,created_at,updated_at,
      agreementReady,...summary,canReplace,accessExpired:summary.accountStatus==="expired",
      displayState:summary.accountStatus==="expired"?"expired":state,events}});
  } catch { return reply({error:"Onboarding status is unavailable. Check the approved onboarding migration."},503); }
}

export async function POST(request) {
  if(!commercialOnboardingBridgeReady()) return reply({error:"Demo access administration is not enabled on this verified Root commercial deployment."},404);
  let access;
  try { access=await rootAgreementAccess(request); } catch { return reply({error:"Verified Root administrator required."},403); }
  let body;
  try { const raw=await request.text(); if(raw.length>5000) return reply({error:"Request too large."},413); body=JSON.parse(raw); } catch { return reply({error:"Invalid request."},400); }
  const {introducerId,action}=body || {};
  if(!uuid(introducerId) || !["send_invitation","replace_invitation","revoke"].includes(action)) return reply({error:"Invalid onboarding operation."},400);
  try {
    if(action==="send_invitation" || action==="replace_invitation") {
      const result=await sendIntroducerActivation({db:access.db,introducerId,request,actorId:access.user.id,action,requestId:body.requestId});
      return reply({success:true,state:result.state,message:action==="replace_invitation"?"A replacement activation invitation was sent.":"A secure activation invitation was sent to the agreement's verified recipient."});
    }

    const revocation=await revokeIntroducerPreviewAccess({db:access.db,introducerId,actorId:access.user.id,request});
    if(revocation.state==="not_provisioned" || revocation.state==="registered" || revocation.state==="failed")
      return reply({error:"There is no active introducer access to revoke."},409);
    return reply({success:true,state:revocation.state});
  } catch(error) {
    if(error instanceof ActivationHandoffError) return reply({error:error.message},error.status);
    return reply({error:error?.message?.includes("agreement acceptance")?error.message:"Onboarding action could not be completed. Refresh the status before retrying."},409);
  }
}

// The named verifier is passed explicitly so the callback cannot drift to a
// different acceptance authority than this route's Root commercial records.
export async function PUT(request) {
  return handleRootIntroducerOnboardingCallback(request,{verifyAccepted:verifiedAcceptedAgreement});
}
