import { createClient } from '@supabase/supabase-js';
import { returnConfig, submitAgreementReturn } from '../../../../lib/introducerAgreementReturn.js';
import { agreementReturnNotifier } from '../../../../lib/introducerAgreementEmail.js';

export const runtime='nodejs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request) {
  try {
    const config=returnConfig();
    if(request.headers.get('origin')!==config.origin || !request.headers.get('content-type')?.startsWith('application/json'))
      return reply({error:'Invalid completion request.'},403);
    const text=await request.text();
    if(text.length>1024)return reply({error:'Invalid completion request.'},400);
    const body=JSON.parse(text);
    if(body.confirmed!==true)return reply({error:'Please confirm completion.'},400);
    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const result=await submitAgreementReturn({db,token:body.token,config,
      notify:(agreement,url)=>agreementReturnNotifier()(agreement,url)});
    return reply(result);
  } catch {
    return reply({error:'This completion could not be confirmed. Retry, or contact enquiries@roothealth.app for help. No agreement has been accepted.'},409);
  }
}
