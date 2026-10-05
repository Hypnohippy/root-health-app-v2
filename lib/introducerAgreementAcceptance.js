import { randomBytes, randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { hash } from './introducerGoogleAgreementTerms.js';
import { ACCEPTANCE_TEXT,AUTHORITY_TEXT } from './introducerAgreementConsent.js';

export function acceptanceOrigin(env=process.env) {
  let url;
  try {url=new URL(env.NEXT_PUBLIC_SITE_URL);} catch {throw Error('Agreement acceptance site is not configured.');}
  if(url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)
    throw Error('Agreement acceptance site is not configured.');
  // Preview links must not accidentally target the live application.
  if(env.VERCEL_ENV==='preview' && ['roothealth.app','www.roothealth.app'].includes(url.hostname))
    throw Error('Agreement acceptance Preview origin must not be Production.');
  return url.origin;
}
async function result(query) {
  const {data,error}=await query;
  if(error)throw Error('Agreement acceptance operation unavailable.');
  return data;
}
export function invitationHash(token) {
  if(typeof token!=='string' || !/^[\w-]{43}$/.test(token))throw Error('Invitation unavailable.');
  return hash(token);
}
export async function prepareAcceptanceInvitation(db,drive,agreement,origin) {
  const existing=await result(db.from('introducer_agreement_review_copies').select('*').eq('agreement_id',agreement.id).maybeSingle());
  const pdf=existing || await drive.reviewSnapshot(agreement);
  const bytes=Buffer.from(pdf.pdf_base64,'base64');
  // Keep the base64 review response below the serverless response-size limit.
  if(bytes.length>3*1024*1024 || hash(bytes)!==pdf.pdf_sha256)throw Error('Agreement review PDF is too large or invalid.');
  const token=randomBytes(32).toString('base64url');
  await result(db.rpc('prepare_introducer_acceptance',{p_agreement:agreement.id,p_token_hash:invitationHash(token),p_pdf:pdf}));
  return `${origin}/introducer-agreement/accept#${token}`;
}
export async function invitationReview(db,token) {
  const tokenHash=invitationHash(token);
  const invitation=await result(db.from('introducer_agreement_invitations').select('*').eq('token_hash',tokenHash).single());
  if(!invitation || new Date(invitation.expires_at)<=new Date())throw Error('Invitation unavailable.');
  const agreement=await result(db.from('organisation_introducer_agreements').select('*').eq('id',invitation.agreement_id).single());
  if(!agreement || !['sent','accepted'].includes(agreement.status))throw Error('Invitation unavailable.');
  const latest=await result(db.from('organisation_introducer_agreements').select('id').eq('introducer_id',agreement.introducer_id).order('version',{ascending:false}).limit(1));
  const acceptance=await result(db.from('introducer_agreement_acceptances').select('*').eq('agreement_id',agreement.id).maybeSingle());
  if(!acceptance && latest[0]?.id!==agreement.id)throw Error('Invitation unavailable.');
  const review=await result(db.from('introducer_agreement_review_copies').select('*').eq('agreement_id',agreement.id).single());
  if(hash(Buffer.from(review.pdf_base64,'base64'))!==review.pdf_sha256)throw Error('Review copy integrity check failed.');
  return {agreement,review,acceptance,tokenHash};
}
export function acceptanceEvidence(input,email) {
  const text=(key,max)=>{const value=String(input[key] || '').trim();if(value.length>max || /[\u0000-\u001f]/.test(value))throw Error('Invalid acceptance details.');return value;};
  const full_name=text('full_name',200),role=text('role',200),organisation=text('organisation',300),date=text('date',10);
  const suppliedEmail=text('email',254).toLowerCase();
  if(!full_name || !role || suppliedEmail!==email.toLowerCase() || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || input.confirmed!==true || (organisation && input.authority!==true))
    throw Error('Complete the required acceptance details and confirmations.');
  return {full_name,role,organisation,email:suppliedEmail,date,confirmed:true,authority:organisation?true:false,
    acceptance_text:ACCEPTANCE_TEXT,authority_text:organisation?AUTHORITY_TEXT:null};
}

export async function acceptedPdf(review,acceptance,version) {
  const bytes=Buffer.from(review.pdf_base64,'base64');
  if(hash(bytes)!==acceptance.review_pdf_sha256)throw Error('Review copy integrity check failed.');
  const pdf=await PDFDocument.load(bytes);
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const supported=new Set(font.getCharacterSet());
  const printable=value=>Array.from(String(value)).map(c=>supported.has(c.codePointAt(0))?c:`[U+${c.codePointAt(0).toString(16).toUpperCase()}]`).join('');
  let page=pdf.addPage([595,842]),y=790;
  const write=text=>{
    let line='';
    for(const char of printable(text)) {
      if(font.widthOfTextAtSize(line+char,10)>495) {if(y<55){page=pdf.addPage([595,842]);y=790;}page.drawText(line,{x:50,y,size:10,font});y-=16;line='';}
      line+=char;
    }
    if(y<55){page=pdf.addPage([595,842]);y=790;}page.drawText(line,{x:50,y,size:10,font});y-=22;
  };
  write('Root Health Introducer Agreement - Acceptance Evidence');
  write(`Agreement version: ${version} | Acceptance ID: ${acceptance.id}`);
  write(`Accepted at (server UTC): ${acceptance.accepted_at}`);
  for(const key of ['full_name','organisation','role','email','date'])write(`${key.replaceAll('_',' ')}: ${acceptance.evidence[key] || 'Not applicable'}`);
  write(ACCEPTANCE_TEXT);
  if(acceptance.evidence.organisation)write(AUTHORITY_TEXT);
  write(`Reviewed PDF SHA-256: ${acceptance.review_pdf_sha256}`);
  write(`Frozen commercial terms SHA-256: ${acceptance.terms_hash}`);
  write('The preceding pages are the exact review copy accepted. Original Unicode evidence is also attached as JSON; unsupported glyphs above use Unicode code points.');
  await pdf.attach(Buffer.from(JSON.stringify({id:acceptance.id,accepted_at:acceptance.accepted_at,evidence:acceptance.evidence,
    terms_snapshot:acceptance.terms_snapshot,terms_hash:acceptance.terms_hash,review_pdf_sha256:acceptance.review_pdf_sha256})),
    'acceptance-evidence.json',{mimeType:'application/json',description:'Immutable acceptance evidence'});
  return Buffer.from(await pdf.save());
}

export async function fulfilAcceptance({db,drive,agreement,notify}) {
  const lease=randomUUID();
  const action=(name,data={})=>result(db.rpc('fulfil_introducer_acceptance',{p_agreement:agreement.id,p_lease:lease,p_action:name,p_data:data}));
  let acceptance=await action('claim');
  if(!acceptance)return {pending:true};
  try {
    const review=await result(db.from('introducer_agreement_review_copies').select('*').eq('agreement_id',agreement.id).single());
    if(!acceptance.progress.final_pdf_base64) {
      const bytes=await acceptedPdf(review,acceptance,agreement.version);
      acceptance=await action('checkpoint',{final_pdf_base64:bytes.toString('base64')});
    }
    const bytes=Buffer.from(acceptance.progress.final_pdf_base64,'base64');
    if(acceptance.progress.pdf_hash && hash(bytes)!==acceptance.progress.pdf_hash)throw Error('Accepted PDF integrity check failed.');
    if(acceptance.archive_state!=='archived') {
      const op={id:acceptance.id,progress:{...acceptance.progress}};
      const checkpoint=async patch=>{acceptance=await action('checkpoint',patch);Object.assign(op.progress,patch);};
      const archived=await drive.archive(op,agreement,checkpoint,{bytes,sourceRevision:review.source_revision});
      acceptance=await action('archive',archived);
    }
    for(const channel of ['customer','root']) {
      const claimed=await action('claim_email',{channel});
      if(!claimed)continue;
      let receipt=null;
      try {receipt=await notify(channel,agreement,acceptance,bytes);} catch { /* Durable claim prevents blind resend. */ }
      acceptance=await action('receipt',{channel,message_id:receipt?.message_id || null});
    }
    return {pending:false};
  } finally {await action('release');}
}
