import { NextResponse } from "next/server";
import { isIntroducerDeployment } from "../../../../lib/introducerRestrictedActions.server.js";
import { getSupabaseServerKeyIfConfigured } from "../../../../lib/supabaseServerKey.server.js";
import { createSupabaseKeyCompatibleClient } from "../../../../lib/supabaseKeyCompatibleClient.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, openActivationLink, parseExactHttpsOrigins, replacementDisposition, sealActivationLink, validatePreviewActivationLink, validatePreviewDeployment, verifyOnboardingAssertion } from "../../../../lib/professionalIntroducerOnboarding.server.js";

export const runtime="nodejs";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

function clients() {
  if(!isIntroducerDeployment() || process.env.PROFESSIONAL_INTRODUCER_DEMO_ENABLED!=="true") throw new Error("Introducer Preview is not verified.");
  validatePreviewDeployment(process.env);
  const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key=getSupabaseServerKeyIfConfigured();
  if(!url || !key) throw new Error("Introducer Preview credentials are unavailable.");
  return createSupabaseKeyCompatibleClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

async function event(db,onboardingId,eventType,actorUserId=null) {
  const {error}=await db.from("professional_introducer_onboarding_events").insert({onboarding_id:onboardingId,event_type:eventType,actor_user_id:actorUserId,details:{}});
  if(error) throw new Error("Onboarding audit event could not be recorded.");
}

export async function POST(request) {
  const raw=await request.text();
  if(raw.length>20000) return reply({error:"Request too large."},413);
  let body; try { body=JSON.parse(raw); } catch { body={}; }
  const bearer=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if(!bearer || bearer!==body.assertion) return reply({error:"Signed Root onboarding assertion required."},401);
  const secret=String(process.env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
  const assertion=verifyOnboardingAssertion(bearer,secret);
  if(!assertion || assertion.action!==body.action || !["prepare","replace","sent","revoke"].includes(body.action)) return reply({error:"Invalid or expired Root onboarding assertion."},401);
  let db;
  try { db=clients(); } catch { return reply({error:"Introducer onboarding service is unavailable."},503); }
  try {
    const {data:existing,error:lookupError}=await db.from("professional_introducer_onboarding").select("*")
      .eq("commercial_introducer_id",assertion.introducerId).maybeSingle();
    if(lookupError) throw lookupError;

    if(body.action==="prepare" || body.action==="replace") {
      const matching=existing?.activation_request_id===assertion.requestId;
      const replacement=body.action==="replace" ? replacementDisposition(existing,{requestId:assertion.requestId}) : null;
      const replacementRetry=replacement==="resume";
      if(body.action==="replace" && replacement==="reject") return reply({error:"Only an expired, not-yet-activated invitation can be replaced."},409);
      if(existing && !matching && body.action!=="replace" && !["replaced","failed"].includes(existing.state)) return reply({error:"This introducer already has an onboarding request."},409);
      if(replacementRetry && new Date(assertion.activationExpiresAt).getTime()<=Date.now()) return reply({error:"Replacement authorization expired; Root must issue a fresh request."},410);

      // Persist the replacement intent before invalidating the prior unconfirmed
      // identity. A retry with this same signed request resumes safely.
      let replacementUserId=existing?.user_id || null;
      if(body.action==="replace" && !replacementRetry) {
        const replacementValues={commercial_introducer_id:assertion.introducerId,activation_request_id:assertion.requestId,
          assertion_jti:assertion.requestId,signed_assertion:bearer,activation_link_ciphertext:null,
          contact_email:assertion.recipientEmail,contact_name:assertion.contactName,agreement_id:assertion.agreementId,
          agreement_version:assertion.agreementVersion,accepted_terms_hash:assertion.acceptedTermsHash,
          acceptance_id:assertion.acceptanceId,accepted_at:assertion.acceptedAt,user_id:replacementUserId,
          access_grant_id:null,state:"replacement_pending",link_prepared_at:null,invite_sent_at:null,
          activation_expires_at:assertion.activationExpiresAt,updated_at:new Date().toISOString()};
        const {data:pending,error:pendingError}=await db.from("professional_introducer_onboarding").update(replacementValues)
          .eq("id",existing.id).eq("state",existing.state).select("*").maybeSingle();
        if(pendingError || !pending) return reply({error:"Replacement could not be durably recorded; the previous invite remains unchanged."},503);
        Object.assign(existing,pending);
        await event(db,existing.id,"activation_replacement_pending");
      }
      if(body.action==="replace" && replacementUserId) {
        const {data:userData,error:userError}=await db.auth.admin.getUserById(replacementUserId);
        if(!userError && userData?.user) {
          if(userData.user.email?.toLowerCase()!==existing.contact_email || userData.user.email_confirmed_at ||
             userData.user.user_metadata?.professional_introducer_invite!==true || userData.user.user_metadata?.commercial_introducer_id!==assertion.introducerId)
            return reply({error:"The previous invited identity cannot be safely replaced."},409);
          const {error:deleteError}=await db.auth.admin.deleteUser(replacementUserId,false);
          if(deleteError) return reply({error:"Replacement intent is saved; removal of the expired unconfirmed identity will retry safely."},503);
        } else {
          const {data:page,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});
          if(listError || page?.users?.some(user=>user.id===replacementUserId || user.email?.toLowerCase()===existing.contact_email))
            return reply({error:"Replacement identity state is ambiguous; Root review is required."},503);
        }
        replacementUserId=null;
        await db.from("professional_introducer_onboarding").update({user_id:null,updated_at:new Date().toISOString()})
          .eq("id",existing.id).eq("state","replacement_pending");
        existing.user_id=null;
      }
      let row=existing;
      let actionLink=null;
      if(matching && existing.activation_link_ciphertext && existing.state==="link_prepared") {
        actionLink=openActivationLink(existing.activation_link_ciphertext,secret);
      } else if(matching && !(body.action==="replace" && existing.state==="replacement_pending")) return reply({error:"The activation link is no longer available for this request."},409);
      else {
        if(existing?.state==="activated" || existing?.state==="revoked" || existing?.state==="sent" || existing?.state==="delivery_uncertain") return reply({error:"Existing onboarding must be explicitly resolved before replacement."},409);
        const previewUrl=new URL(String(process.env.ROOT_AUTH_PREVIEW_URL || ""));
        const previewOrigins=parseExactHttpsOrigins(process.env.ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS);
        if(previewUrl.protocol!=="https:" || previewUrl.pathname!=="/" || previewUrl.search || previewUrl.hash ||
            !previewOrigins.has(previewUrl.origin) || process.env.ROOT_INTRODUCER_VERCEL_PROJECT_ID!==INTRODUCER_PREVIEW_PROJECT_ID ||
            process.env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF!==INTRODUCER_PREVIEW_SUPABASE_REF) throw new Error("Preview authentication URL is not configured.");
        for(let page=1;page<=50;page++) {
          const {data:userPage,error:userListError}=await db.auth.admin.listUsers({page,perPage:1000});
          if(userListError || !Array.isArray(userPage?.users)) throw new Error("Preview Auth identities could not be checked.");
          if(userPage.users.some(user=>user.email?.toLowerCase()===assertion.recipientEmail)) return reply({error:"This email already has an account in the isolated Preview. Root must resolve the identity collision before inviting."},409);
          if(userPage.users.length<1000) break;
          if(page===50) throw new Error("Preview Auth identity search could not confirm uniqueness.");
        }
        const {data:linkData,error:linkError}=await db.auth.admin.generateLink({type:"invite",email:assertion.recipientEmail,options:{
          redirectTo:`${previewUrl.origin}/reset-password?next=%2Fintroducer`,
          data:{professional_introducer_invite:true,commercial_introducer_id:assertion.introducerId},
        }});
        if(linkError || !linkData?.user?.id || !linkData?.properties?.action_link || linkData.user.email?.toLowerCase()!==assertion.recipientEmail) throw new Error("A unique verified-email invitation could not be prepared.");
        actionLink=linkData.properties.action_link;
        if(!validatePreviewActivationLink(actionLink,{previewOrigin:previewUrl.origin,previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}) ||
           new URL(actionLink).origin!==new URL(url).origin) {
          await db.auth.admin.deleteUser(linkData.user.id,false).catch(()=>{});
          throw new Error("Supabase generated an invitation with an unexpected redirect.");
        }
        const rowValues={commercial_introducer_id:assertion.introducerId,activation_request_id:assertion.requestId,assertion_jti:assertion.requestId,
          signed_assertion:bearer,activation_link_ciphertext:sealActivationLink(actionLink,secret),contact_email:assertion.recipientEmail,
          contact_name:assertion.contactName,agreement_id:assertion.agreementId,agreement_version:assertion.agreementVersion,
          accepted_terms_hash:assertion.acceptedTermsHash,acceptance_id:assertion.acceptanceId,accepted_at:assertion.acceptedAt,
          user_id:linkData.user.id,state:"link_prepared",link_prepared_at:new Date().toISOString(),activation_expires_at:assertion.activationExpiresAt,updated_at:new Date().toISOString()};
        try {
          if(existing) {
            const expectedState=body.action==="replace"?"replacement_pending":existing.state;
            const {data,error}=await db.from("professional_introducer_onboarding").update(rowValues).eq("id",existing.id).eq("state",expectedState).select("*").maybeSingle();
            if(error || !data) throw new Error("Onboarding changed concurrently.");
            row=data;
          } else {
            const {data,error}=await db.from("professional_introducer_onboarding").insert(rowValues).select("*").single();
            if(error || !data) throw new Error("Onboarding record could not be stored.");
            row=data;
          }
        } catch {
          // generateLink creates an Auth identity but sends no email. If its
          // durable onboarding record cannot be committed, remove only this
          // just-created, still-unconfirmed identity carrying our exact marker.
          const {data:userData}=await db.auth.admin.getUserById(linkData.user.id).catch(()=>({data:null}));
          if(userData?.user?.email_confirmed_at==null && userData?.user?.user_metadata?.professional_introducer_invite===true &&
             userData?.user?.user_metadata?.commercial_introducer_id===assertion.introducerId) {
            await db.auth.admin.deleteUser(linkData.user.id,false).catch(()=>{});
          }
          throw new Error("Onboarding record could not be stored.");
        }
        await event(db,row.id,body.action==="replace"?"activation_replaced":"activation_link_created");
      }
      return reply({actionLink,expiresAt:assertion.activationExpiresAt});
    }

    if(body.action==="sent") {
      const original=existing && verifyOnboardingAssertion(existing.signed_assertion,secret);
      if(!existing || existing.activation_request_id!==assertion.requestId || !original || original.nonce!==assertion.nonce || original.agreementId!==assertion.agreementId || original.acceptedTermsHash!==assertion.acceptedTermsHash) return reply({error:"Onboarding request does not match."},409);
      if(existing.state==="sent") return reply({success:true,state:"sent"});
      if(existing.state!=="link_prepared") return reply({error:"Activation invitation is not prepared."},409);
      const {error}=await db.from("professional_introducer_onboarding").update({state:"sent",invite_sent_at:new Date().toISOString(),activation_link_ciphertext:null,updated_at:new Date().toISOString()}).eq("id",existing.id).eq("state","link_prepared");
      if(error) throw error;
      await event(db,existing.id,"activation_sent");
      return reply({success:true,state:"sent"});
    }
    if(!existing || existing.commercial_introducer_id!==assertion.introducerId || existing.agreement_id!==assertion.agreementId || existing.accepted_terms_hash!==assertion.acceptedTermsHash || existing.contact_email!==assertion.recipientEmail) return reply({error:"Onboarding request does not match."},409);
    if(existing.state==="revoked") return reply({success:true,state:"revoked"});
    if(!["link_prepared","sent","delivery_uncertain","activated"].includes(existing.state)) return reply({error:"No active grant is available to revoke."},409);
    const {data:revoked,error}=await db.rpc("revoke_professional_introducer_onboarding",{
      p_onboarding_id:existing.id,p_introducer_id:assertion.introducerId,
    });
    if(error || revoked!==true) throw new Error("Preview access could not be atomically revoked.");
    await event(db,existing.id,"access_revoked");
    return reply({success:true,state:"revoked"});
  } catch {
    return reply({error:"Introducer Preview onboarding action failed closed. Check the service state before retrying."},503);
  }
}
