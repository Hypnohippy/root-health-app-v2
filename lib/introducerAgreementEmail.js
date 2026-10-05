import { emailValid } from './introducerGoogleAgreementTerms.js';

export function agreementMail(agreement,recipient) {
  if(!emailValid(recipient) || recipient!==agreement.terms_snapshot.contact_email) throw new Error('Stored agreement recipient mismatch.');
  return {to:recipient,subject:'Your Root Health Introducer Agreement',text:
    `Hi ${agreement.terms_snapshot.contact_name},\n\nPlease review and complete your Root Health Introducer Agreement using the link below.\n\n${agreement.document_url}\n\nOnce completed, please save/share the finished copy with enquiries@roothealth.app.\n\nKind regards,\nDavid\nRoot Health App`};
}
export function agreementMailer(env=process.env,fetcher=fetch) {
  const key=String(env.RESEND_API_KEY || '').trim();
  if(!key) throw new Error('Root agreement email is not configured.');
  return async (agreement,recipient,operationId) => {
    const message=agreementMail(agreement,recipient);
    try {
      const response=await fetcher('https://api.resend.com/emails',{
        method:'POST',signal:AbortSignal.timeout(20000),redirect:'error',
        headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`root-agreement-${operationId}`},
        body:JSON.stringify({...message,to:[recipient],from:'Root Health <enquiries@roothealth.app>',reply_to:'enquiries@roothealth.app'}),
      });
      if(!response.ok) throw new Error('Unconfirmed delivery');
      const result=await response.json();
      if(typeof result.id!=='string' || !result.id.trim()) throw new Error('Missing delivery receipt');
      return {message_id:result.id,recipient};
    } catch {
      // A timeout or missing receipt may still mean delivery: never automatically resend.
      throw new Error('Root agreement email delivery is unconfirmed. Check Resend before an explicit resend.');
    }
  };
}
