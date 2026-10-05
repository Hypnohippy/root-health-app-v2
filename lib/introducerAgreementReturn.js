import { createHmac, timingSafeEqual } from 'node:crypto';

export function returnConfig(env=process.env) {
  const secret=env.GOOGLE_AGREEMENTS_RETURN_SECRET || '';
  const site=new URL(env.NEXT_PUBLIC_SITE_URL || 'http://invalid');
  if(secret.length<32 || site.protocol!=='https:' || site.username || site.password || site.pathname!=='/' || site.search || site.hash)
    throw new Error('Agreement completion link is not configured.');
  return {secret,origin:site.origin};
}
const signature=(payload,agreement,secret)=>createHmac('sha256',secret)
  .update(JSON.stringify([payload,agreement.id,agreement.terms_hash,agreement.terms_snapshot.contact_email])).digest('base64url');
export function completionLink(agreement,config,now=Date.now()) {
  const payload=`${agreement.id}.${Math.floor(now/1000)+90*86400}`;
  return `${config.origin}/introducer-agreement/complete#${payload}.${signature(payload,agreement,config.secret)}`;
}
export function completionId(token) {
  const match=/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9]{10})\.([\w-]{43})$/.exec(token || '');
  if(!match)throw new Error('Invalid completion link.');
  return match[1];
}
export function verifyCompletion(token,agreement,config,now=Date.now()) {
  if(completionId(token)!==agreement.id)throw new Error('Invalid completion link.');
  const [id,expiry,mac]=token.split('.');
  const expected=signature(`${id}.${expiry}`,agreement,config.secret);
  if(Number(expiry)<=Math.floor(now/1000) || Number(expiry)>Math.floor(now/1000)+90*86400+60 ||
    !timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))throw new Error('Invalid completion link.');
}

// A durable database claim precedes the notification. A lost response never triggers a blind resend.
export async function submitAgreementReturn({db,token,config,notify}) {
  const id=completionId(token);
  const {data:agreement,error}=await db.from('organisation_introducer_agreements').select('*').eq('id',id).single();
  if(error || !agreement)throw new Error('Invalid completion link.');
  verifyCompletion(token,agreement,config);
  const {data:claimed,error:claimError}=await db.rpc('return_introducer_google_agreement',{p_agreement:id});
  if(claimError)throw new Error('Agreement cannot be returned. Contact Root Health for a current link.');
  if(claimed) {
    let receipt=null;
    try {receipt=await notify(agreement,`${config.origin}/admin/introducers`);} catch { /* The admin queue remains authoritative. */ }
    const {error:recordError}=await db.rpc('record_introducer_return_notification',{p_agreement:id,p_message_id:receipt?.message_id || null});
    if(recordError)throw new Error('Return recorded; notification confirmation unavailable.');
  }
  return {returned:true};
}
