import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { agreementTerms,termsHash,replacements,validateTemplate,validateMerged,MASTER_DOCUMENT_ID,hash } from '../lib/introducerGoogleAgreementTerms.js';
import { createAgreementDrive,googleAgreementConfig } from '../lib/googleAgreementDrive.js';
import { agreementMail,agreementMailer } from '../lib/introducerAgreementEmail.js';
import { rootAgreementAccess,runGoogleAgreement,publicAgreementState } from '../lib/introducerGoogleAgreementServer.js';
import { GET,POST } from '../app/api/admin/introducers/google-agreements/route.js';
import { getRootDestination } from '../lib/rootNavigator.js';

const intro={id:'11111111-1111-4111-8111-111111111111',name:'Test Partner',contact_name:'Jo Test',contact_email:'jo@example.test',
  introducer_market:'both',introducer_type:'practitioner',referral_code:'jo-test',vat_registered:false,notes:'PRIVATE INTERNAL NOTE'};
const actor='22222222-2222-4222-8222-222222222222';
const policy={commission_percent:20,commission_basis:'collected_subscription_revenue',commission_structure:'recurring',effective_from:'2020-01-01T00:00:00Z'};
const terms=()=>agreementTerms(intro,[policy]);
const draft=()=>({id:randomUUID(),introducer_id:intro.id,version:1,status:'draft',document_id:'doc_1',document_url:'https://docs.google.com/document/d/doc_1/edit',terms_snapshot:terms(),terms_hash:termsHash(terms())});
const doc=text=>({revisionId:'rev1',tabs:[{documentTab:{body:{content:[{paragraph:{elements:[{textRun:{content:text}}]}}]}}}]});

test('current effective policy wins; future/expired policies and internal notes are excluded',()=>{
  const result=agreementTerms(intro,[policy,{...policy,commission_percent:99,effective_from:'2099-01-01'},
    {...policy,commission_percent:5,effective_until:'2021-01-01'}]);
  assert.equal(result.commission_percent,20);assert.equal(result.special_terms,'None');
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE INTERNAL NOTE/);
  assert.throws(()=>agreementTerms(intro,[]),/effective/);
  assert.throws(()=>agreementTerms({...intro,contact_email:'bad'},[policy]),/email/);
});
test('all 14 placeholders have literal replacements; percent is not doubled and Special Terms are explicit',()=>{
  const t=agreementTerms(intro,[policy],'Only the agreed services.');const values=replacements(t);
  assert.equal(Object.keys(values).length,14);assert.equal(values.COMMISSION_PERCENT,'20');assert.equal(values.SPECIAL_TERMS,t.special_terms);
  assert.equal(values.MARKET,'Both');assert.equal(values.COMMISSION_STRUCTURE,'Recurring');
  assert.throws(()=>agreementTerms(intro,[policy],'{{SECRET}}'),/unsupported/);
});
test('template validation covers split text runs and rejects missing or unknown placeholders',()=>{
  const values=replacements(terms());const text=Object.keys(values).map(k=>`{{${k}}}`).join('\n');
  validateTemplate(doc(text),values);assert.throws(()=>validateTemplate(doc(''),values),/missing/);
  assert.throws(()=>validateTemplate(doc(text+'{{UNKNOWN}}'),values),/unsupported/);
  assert.throws(()=>validateMerged(doc('{{INTRODUCER_NAME}}')),/unresolved/);validateMerged(doc('Jo Test'));
});
test('terms mismatch is derived and accepted history remains visible',()=>{
  const a=draft();const state={introducer:intro,policies:[policy],agreements:[a],operations:[]};
  assert.equal(publicAgreementState(state).needsUpdating,false);
  assert.equal(publicAgreementState({...state,policies:[{...policy,commission_percent:25}]}).needsUpdating,true);
  assert.equal(termsHash({...terms(),special_terms:'New'} )===a.terms_hash,false);
});

test('Resend uses only the stored recipient and never automatically retries ambiguous delivery',async()=>{
  const a=draft();const m=agreementMail(a,intro.contact_email);assert.equal(m.to,intro.contact_email);
  assert.match(m.text,/enquiries@roothealth.app/);assert.match(m.text,/Hi Jo Test/);
  assert.throws(()=>agreementMail(a,'attacker@example.test'),/mismatch/);
  assert.throws(()=>agreementMailer({ROOT_SMTP_USER:'fixture',ROOT_SMTP_PASSWORD:'fixture'},()=>({})),/not configured/);
  let calls=0;
  const send=agreementMailer({RESEND_API_KEY:'fixture'},async()=>{calls++;throw new Error('timeout containing a secret');});
  await assert.rejects(send(a,'attacker@example.test',randomUUID(),'https://preview.example.test/introducer-agreement/accept#test'),/mismatch/);assert.equal(calls,0);
  await assert.rejects(send(a,intro.contact_email,randomUUID(),'https://preview.example.test/introducer-agreement/accept#test'),/^Error: Root agreement email delivery is unconfirmed/);assert.equal(calls,1);
});
test('Resend enforces Root sender branding, configuration and confirmed message-ID receipts',async()=>{
  let sent,headers;
  const env={RESEND_API_KEY:'fixture',ROOT_SMTP_FROM:'Fuelgeist <other@example.test>'};
  const id=randomUUID();
  const send=agreementMailer(env,async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');assert.equal(options.method,'POST');
    headers=options.headers;sent=JSON.parse(options.body);return Response.json({id:'resend-receipt'});
  });
  assert.deepEqual(await send(draft(),intro.contact_email,id,'https://preview.example.test/introducer-agreement/accept#test'),{message_id:'resend-receipt',recipient:intro.contact_email});
  assert.equal(sent.from,'Root Health <enquiries@roothealth.app>');assert.equal(sent.reply_to,'enquiries@roothealth.app');
  assert.deepEqual(sent.to,[intro.contact_email]);assert.doesNotMatch(JSON.stringify(sent),/fuelgeist|fixture/i);
  assert.equal(headers.Authorization,'Bearer fixture');assert.equal(headers['Idempotency-Key'],`root-agreement-${id}`);
  for(const key of [undefined,'','   '])assert.throws(()=>agreementMailer({RESEND_API_KEY:key}),/not configured/);
  for(const response of [Response.json({id:'ignore'},{status:500}),Response.json({}),Response.json({id:42}),new Response('invalid json')]){
    let calls=0;const unconfirmed=agreementMailer(env,async()=>{calls++;return response;});
    await assert.rejects(unconfirmed(draft(),intro.contact_email,id,'https://preview.example.test/introducer-agreement/accept#test'),/delivery is unconfirmed/);assert.equal(calls,1);
  }
});

test('Root auth denies anonymous, unverified and unrelated users before service access',async()=>{
  const env={ROOT_ADMIN_EMAIL:'admin@example.test',SUPABASE_SERVICE_ROLE_KEY:'service-fixture'};
  for(const user of [null,{email:'admin@example.test'},{email:'other@example.test',email_confirmed_at:'yes'}]) {
    let calls=0;const client=()=>{calls++;return{auth:{getUser:async()=>({data:{user}})}};};
    await assert.rejects(rootAgreementAccess(new Request('https://fixture.test',{headers:{Authorization:'Bearer mock'}}),env,client));assert.equal(calls,1);
  }
  const req=new Request('https://fixture.test?introducerId='+intro.id);
  assert.equal((await GET(req)).status,403);
  assert.equal((await POST(new Request(req,{method:'POST'}))).status,403);
});

async function database(historical=false) {
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table organisation_introducers(id uuid primary key,status text default 'active');`);
  await db.query('insert into organisation_introducers(id) values($1)',[intro.id]);
  await db.exec(fs.readFileSync('supabase/migrations/20261004_introducer_google_agreements.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261005_introducer_agreement_returns.sql','utf8'));
  if(!historical)await db.exec(fs.readFileSync('supabase/migrations/20261006_introducer_direct_acceptance.sql','utf8'));
  return db;
}
async function begin(db,action='generate',payload={},id=randomUUID(),lease=randomUUID()) {
  const result=(await db.query('select begin_introducer_google_operation($1,$2,$3,$4,$5,$6) op',
    [id,intro.id,action,actor,lease,JSON.stringify(payload)])).rows[0].op;return {...result,lease};
}
async function checkpoint(db,op,progress,state='running') {
  await db.query('select checkpoint_introducer_google_operation($1,$2,$3,$4)',[op.id,op.lease,JSON.stringify(progress),state]);
}
async function finish(db,op,result) {
  return (await db.query('select finish_introducer_google_operation($1,$2,$3) id',[op.id,op.lease,JSON.stringify(result)])).rows[0].id;
}
async function generated(db,previous=null,overrides={}) {
  const t={...terms(),...overrides};
  const op=await begin(db,'generate',{previous_id:previous,terms:t,terms_hash:termsHash(t),template_id:MASTER_DOCUMENT_ID});
  await checkpoint(db,op,{merged:true});
  await finish(db,op,{document_id:'doc_'+op.id,document_url:'https://docs.google.com/document/d/doc_'+op.id+'/edit'});
  return (await db.query('select * from organisation_introducer_agreements where id=$1',[op.agreement_id])).rows[0];
}
test('database grants/RLS block clients and direct service writes; new RPCs are service-only',async()=>{
  const db=await database();try{
    for(const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(db.exec('select * from organisation_introducer_agreements'),/permission denied/);
      await assert.rejects(db.exec('select * from introducer_google_agreement_operations'),/permission denied/);
      await assert.rejects(begin(db),/permission denied/);await db.exec('reset role');
    }
    await db.exec('set role service_role');await assert.rejects(db.exec('delete from organisation_introducer_agreements'),/permission denied/);
    await db.exec('reset role');
  }finally{await db.close();}
});
test('generation retries dedupe by operation and do not change introducer activation or accounting',async()=>{
  const db=await database();try{
    const op=await begin(db,'generate',{terms:terms(),terms_hash:termsHash(terms()),template_id:MASTER_DOCUMENT_ID});
    await assert.rejects(begin(db,'generate',{},op.id),/still running/);
    await checkpoint(db,op,{copy_started:true},'failed');
    const retry=await begin(db,'generate',{},op.id);assert.equal(retry.agreement_id,op.agreement_id);
    await checkpoint(db,retry,{merged:true});const result={document_id:'doc',document_url:'https://docs.google.com/document/d/doc/edit'};
    assert.equal(await finish(db,retry,result),await finish(db,retry,result));
    assert.equal((await db.query('select count(*)::int n from organisation_introducer_agreements')).rows[0].n,1);
    assert.equal((await db.query('select status from organisation_introducers')).rows[0].status,'active');
  }finally{await db.close();}
});
test('draft regeneration creates a clean version and safe cancellation preserves unfinished evidence',async()=>{
  const db=await database();try{
    const a=await generated(db);
    const b=await generated(db,a.id,{special_terms:'Revised agreement-only terms'});
    assert.notEqual(a.document_id,b.document_id);assert.equal(b.version,2);
    assert.equal((await db.query('select status from organisation_introducer_agreements where id=$1',[a.id])).rows[0].status,'superseded');
    const op=await begin(db,'generate',{previous_id:b.id,terms:terms(),terms_hash:termsHash(terms()),template_id:MASTER_DOCUMENT_ID});
    await assert.rejects(db.query('select cancel_introducer_google_operation($1,$2)',[op.id,actor]),/cannot safely/);
    await checkpoint(db,op,{copy_started:true},'failed');
    await db.query('select cancel_introducer_google_operation($1,$2)',[op.id,actor]);
    await assert.rejects(begin(db,'generate',{},op.id),/cancelled/);
    assert.equal((await db.query('select progress from introducer_google_agreement_operations where id=$1',[op.id])).rows[0].progress.copy_started,true);
    assert.equal((await db.query('select count(*)::int n from organisation_introducer_agreements')).rows[0].n,2);
  }finally{await db.close();}
});

test('sent terms and document stay frozen; old sent row supersedes only after a successful revision',async()=>{
  const db=await database();try{
    const a=await generated(db);const send=await begin(db,'send',{agreement_id:a.id,current_terms_hash:a.terms_hash});
    await finish(db,send,{message_id:'smtp1',recipient:intro.contact_email});
    await assert.rejects(db.query("update organisation_introducer_agreements set document_id='other' where id=$1",[a.id]),/Frozen/);
    await assert.rejects(db.query("update organisation_introducer_agreements set email_message_id='replacement' where id=$1",[a.id]),/immutable/);
    const b=await generated(db,a.id,{commission_percent:30});
    const old=(await db.query('select * from organisation_introducer_agreements where id=$1',[a.id])).rows[0];
    assert.equal(old.status,'superseded');assert.equal(old.terms_snapshot.commission_percent,20);assert.equal(old.email_message_id,'smtp1');
    assert.equal(b.version,2);assert.equal(b.terms_snapshot.commission_percent,30);
  }finally{await db.close();}
});
test('historical pre-retirement acceptance evidence survives amendments unchanged',async()=>{
  const db=await database(true);try{
    const a=await generated(db);const send=await begin(db,'send',{agreement_id:a.id,current_terms_hash:a.terms_hash});
    await finish(db,send,{message_id:'smtp1',recipient:intro.contact_email});
    await assert.rejects(begin(db,'accept',{agreement_id:a.id}),/Confirm/);
    await assert.rejects(begin(db,'accept',{agreement_id:a.id,confirmed:true}),/must be returned/);
    await db.query('select return_introducer_google_agreement($1)',[a.id]);
    const op=await begin(db,'accept',{agreement_id:a.id,confirmed:true});
    await assert.rejects(finish(db,op,{}),/check constraint/);
    await finish(db,op,{pdf_document_id:'pdf',pdf_document_url:'https://drive.google.com/file/d/pdf/view',pdf_sha256:'a'.repeat(64)});
    const before=(await db.query('select * from organisation_introducer_agreements where id=$1',[a.id])).rows[0];
    await generated(db,a.id,{commission_percent:25});
    const after=(await db.query('select * from organisation_introducer_agreements where id=$1',[a.id])).rows[0];
    assert.deepEqual(before,after);
    await assert.rejects(db.query('delete from organisation_introducer_agreements where id=$1',[a.id]),/cannot be deleted/);
    await assert.rejects(db.query("update organisation_introducer_agreements set pdf_document_id='replacement' where id=$1",[a.id]),/Frozen/);
  }finally{await db.close();}
});
test('uncertain SMTP blocks same-operation replay but permits deliberate resend; receipts resume without resending',async()=>{
  const db=await database();try{
    const a=await generated(db);
    const send=await begin(db,'send',{agreement_id:a.id,current_terms_hash:a.terms_hash});
    await checkpoint(db,send,{smtp_started:true},'uncertain');
    await assert.rejects(begin(db,'send',{},send.id),/uncertain/);
    await assert.rejects(begin(db,'send',{agreement_id:a.id,current_terms_hash:a.terms_hash}),/confirmation/);
    const retry=await begin(db,'send',{agreement_id:a.id,current_terms_hash:a.terms_hash,confirmed:true});
    await checkpoint(db,retry,{smtp_started:true,smtp_receipt:{message_id:'m',recipient:intro.contact_email}},'failed');
    const resume=await begin(db,'send',{},retry.id);assert.equal(resume.progress.smtp_receipt.message_id,'m');
    await finish(db,resume,resume.progress.smtp_receipt);
  }finally{await db.close();}
});
test('stale terms cannot be sent, and a failed revision does not supersede the current agreement',async()=>{
  const db=await database();try{
    const a=await generated(db);
    await assert.rejects(begin(db,'send',{agreement_id:a.id,current_terms_hash:'wrong'}),/needs updating/);
    const op=await begin(db,'generate',{previous_id:a.id,terms:terms(),terms_hash:a.terms_hash,template_id:MASTER_DOCUMENT_ID});
    await checkpoint(db,op,{copy_started:true},'failed');
    assert.equal((await db.query('select status from organisation_introducer_agreements where id=$1',[a.id])).rows[0].status,'draft');
  }finally{await db.close();}
});

function serviceAdapter(db) {
  return {
    from:()=>({select:()=>({eq:(_key,id)=>({maybeSingle:async()=>({data:(await db.query('select * from introducer_google_agreement_operations where id=$1',[id])).rows[0] || null})})})}),
    rpc:async(name,args)=>{
      try {
        const values=name==='begin_introducer_google_operation'?[args.p_id,args.p_introducer,args.p_action,args.p_actor,args.p_lease,JSON.stringify(args.p_payload)]
          :name==='checkpoint_introducer_google_operation'?[args.p_id,args.p_lease,JSON.stringify(args.p_progress),args.p_state || 'running']
          :[args.p_id,args.p_lease,JSON.stringify(args.p_result)];
        return {data:(await db.query(`select ${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) result`,values)).rows[0].result};
      }catch(error){return{error};}
    },
  };
}
test('real coordinator recovers generation and finalisation failures without repeating successful external work',async()=>{
  const db=await database();try{
    const service=serviceAdapter(db);let copyCount=0,fail=true,mailCount=0;
    const load=async()=>({introducer:intro,policies:[policy],agreements:(await db.query('select * from organisation_introducer_agreements order by version desc')).rows,operations:[]});
    const drive={generate:async(op,save)=>{
      if(!op.progress.document_id){copyCount++;await save({document_id:'recovered'});}
      if(fail)throw new Error('simulated interruption');
      await save({merged:true});return{document_id:'recovered',document_url:'https://docs.google.com/document/d/recovered/edit'};
    },verifyDocument:async()=>{}};
    const body={action:'generate',introducerId:intro.id,requestId:randomUUID(),specialTerms:'None'};
    const args={db:service,user:{id:actor},drive,load,body,origin:'https://preview.example.test',invite:async()=> 'https://preview.example.test/introducer-agreement/accept#test'};
    await assert.rejects(runGoogleAgreement(args));fail=false;
    const generated=await runGoogleAgreement(args);await runGoogleAgreement(args);assert.equal(copyCount,1);
    const send={...args,body:{action:'send',introducerId:intro.id,agreementId:generated.agreementId,requestId:randomUUID()},
      mail:async()=>{mailCount++;return{message_id:'receipt',recipient:intro.contact_email};}};
    const original=service.rpc;let loseFinish=true;
    service.rpc=async(name,params)=>name==='finish_introducer_google_operation'&&loseFinish?{error:new Error('lost')}:original(name,params);
    await assert.rejects(runGoogleAgreement(send));assert.equal(mailCount,1);
    loseFinish=false;await runGoogleAgreement(send);await runGoogleAgreement(send);assert.equal(mailCount,1);
    const row=(await db.query('select * from organisation_introducer_agreements')).rows[0];assert.equal(row.status,'sent');assert.equal(row.email_message_id,'receipt');
  }finally{await db.close();}
});

test('reported failed merged operation resumes under its original identity and checkpoints using a new lease',async()=>{
  const db=await database();try{
    const id='c1e4fb5c-4b17-410d-9a6e-9f0ca24c4758';
    const introducerId='2fc71a5f-1e53-4928-8ab1-aa53b38639af';
    const progress={merged:true,document_id:'151MRw3eX2wxmxmTkSUZcqWzaygSHbw-kyp-8Xjnu-JU',copy_started:true,
      merge_started:true,failure_reason:'recipient_access',template_revision:'synthetic-revision'};
    await db.query('insert into organisation_introducers(id) values($1)',[introducerId]);
    const oldLease=randomUUID(),agreementId=randomUUID();
    const payload={terms:terms(),terms_hash:termsHash(terms()),template_id:MASTER_DOCUMENT_ID,version:1,previous_id:null};
    await db.query(`insert into introducer_google_agreement_operations
      (id,introducer_id,agreement_id,action,actor_id,payload,progress,state,lease_id,lease_until)
      values($1,$2,$3,'generate',$4,$5,$6,'failed',$7,null)`,[id,introducerId,agreementId,actor,JSON.stringify(payload),JSON.stringify(progress),oldLease]);
    const service=serviceAdapter(db);
    const read=async()=> (await db.query('select * from introducer_google_agreement_operations where id=$1',[id])).rows[0];
    const original=await read();let driveCalls=0;
    const load=async()=>({introducer:{...intro,id:introducerId},policies:[policy],agreements:[],operations:[]});
    const body={requestId:id,action:'generate',introducerId,agreementId,confirmed:true,specialTerms:'None'};
    const args={db:service,user:{id:actor},body,load,drive:{generate:async(op,save)=>{
      driveCalls++;assert.deepEqual(op.progress,progress);assert.deepEqual(op.payload,payload);
      assert.equal(op.id,id);assert.equal(op.agreement_id,agreementId);assert.equal(op.state,'running');
      assert.notEqual(op.lease_id,oldLease);
      await save({recipient_stage:'create_requested'});
      throw Error('Recipient does not have access to this agreement.');
    }}};
    // An actor mismatch fails before the RPC and leaves the entire row untouched.
    await assert.rejects(runGoogleAgreement({...args,user:{id:randomUUID()}}),/identity mismatch/);
    assert.deepEqual(await read(),original);assert.equal(driveCalls,0);
    // Fresh-term validation is another pre-RPC failure, even though frozen terms exist.
    await assert.rejects(runGoogleAgreement({...args,load:async()=>({...await load(),policies:[]})}),/effective commercial policy/);
    assert.deepEqual(await read(),original);assert.equal(driveCalls,0);
    // SQL rejects an unexpired lease; queryResult currently hides its precise reason.
    await db.query("update introducer_google_agreement_operations set lease_until=now()+interval '3 minutes' where id=$1",[id]);
    const leased=await read();
    await assert.rejects(runGoogleAgreement(args),/database operation failed/);
    assert.deepEqual(await read(),leased);assert.equal(driveCalls,0);
    await db.query('update introducer_google_agreement_operations set lease_until=null where id=$1',[id]);
    // Use the same role used by Supabase's service client, not a table-owner shortcut.
    await db.exec('set role service_role');
    await assert.rejects(runGoogleAgreement(args),/Recipient does not have access/);
    const resumed=await read();assert.equal(driveCalls,1);
    assert.equal(resumed.progress.recipient_stage,'create_requested');assert.equal(resumed.state,'failed');
    assert.equal(resumed.lease_until,null);assert.notEqual(resumed.lease_id,oldLease);
    assert.deepEqual(resumed.payload,payload);assert.equal(resumed.agreement_id,agreementId);
  }finally{await db.close();}
});

function googleFixture({broad=false,lostCopy=false,aliasRecipient=false,recipientRole='writer',preexistingRecipient=false,
  missingId=false,getMissing=false,unlisted=false,createDenied=false,legacyBinding=false,mismatchedReadback=false,extraRecipient=false,mergedDocument=false,logo=false}={}) {
  const values=replacements(terms());let text=Object.keys(values).map(k=>`{{${k}}}`).join('\n');
  if(mergedDocument)text=Object.values(values).join('\n');
  let shared=preexistingRecipient,copyCount=0,storedPdf=null,appProperties={rootAgreementOperation:'op'};const calls=[];
  if(legacyBinding)appProperties.rootAgreementRecipientPermissionId='recipient';
  const config={clientId:'fixture',clientSecret:'fixture',refreshToken:'fixture',folderId:'folder'};
  async function fetcher(url,options={}) {
    calls.push({url,method:options.method || 'GET',body:options.body});
    const json=value=>Response.json(value);
    if(url.includes('oauth2.googleapis'))return json({access_token:'mock'});
    if(url.includes('/permissions')) {
      if(options.method==='POST'){
        assert.equal(new URL(url).searchParams.get('fields'),'id');
        assert.equal(new URL(url).searchParams.get('sendNotificationEmail'),'false');
        assert.deepEqual(JSON.parse(options.body),{type:'user',role:'writer',emailAddress:intro.contact_email});
        if(createDenied)return new Response('not logged',{status:403});
        shared=true;return json(missingId?{}:{id:recipientRole==='owner'?'owner':'recipient'});
      }
      if(/\/permissions\/[^/?]+\?/.test(url))return getMissing?new Response('{}',{status:404}):json({id:mismatchedReadback?'different-owner':recipientRole==='owner'?'owner':'recipient',type:'user',role:recipientRole,emailAddress:aliasRecipient?'primary@example.test':intro.contact_email});
      return json({permissions:[{id:'owner',type:'user',role:'owner',emailAddress:'root@example.test'},...(broad?[{id:'anyone',type:'anyone',role:'reader'}]:[]),...(shared && extraRecipient && url.includes('/doc/')?[{id:'unrelated',type:'user',role:'writer',emailAddress:'unrelated@example.test'}]:[]),...(shared && !unlisted && recipientRole!=='owner' && url.includes('/doc/')?[{id:'recipient',type:'user',role:recipientRole,emailAddress:aliasRecipient?'primary@example.test':intro.contact_email}]:[])]});
    }
    if(options.method==='PATCH' && url.includes('/files/doc?')) {
      appProperties={...appProperties,...JSON.parse(options.body).appProperties};
      return json({id:'doc',appProperties});
    }
    if(url.includes('/files?q='))return json({files:lostCopy?[{id:'doc'}]:[]});
    if(url.includes('/copy?')){copyCount++;return json({id:'doc'});}
    if(url.includes(':batchUpdate')){const requests=JSON.parse(options.body).requests;for(const r of requests)text=text.replaceAll(r.replaceAllText.containsText.text,r.replaceAllText.replaceText);return json({});}
    if(url.startsWith('https://docs.googleapis')) {
      const result=doc(url.includes(MASTER_DOCUMENT_ID)?Object.keys(values).map(k=>`{{${k}}}`).join('\n'):text);
      if(logo) {
        result.tabs[0].documentTab.inlineObjects={logo:{inlineObjectProperties:{embeddedObject:{title:'Resilient Human / Root Health logo',imageProperties:{contentUri:'https://example.test/logo'}}}}};
        result.tabs[0].documentTab.body.content[0].paragraph.elements.push({inlineObjectElement:{inlineObjectId:'logo'}});
      }
      return json(result);
    }
    if(url.includes('/generateIds'))return json({ids:['pdf']});
    if(url.includes('/export?'))return new Response('%PDF-fixture');
    if(url.includes('/upload/')){storedPdf=Buffer.from('%PDF-fixture');return json({id:'pdf'});}
    if(url.includes('alt=media'))return new Response(storedPdf);
    if(url.includes('/files/pdf') && !storedPdf)return new Response('{}',{status:404});
    return json({id:url.includes('/folder?')?'folder':'doc',name:'Root Health Introducer Agreements',mimeType:url.includes('/folder?')?'application/vnd.google-apps.folder':url.includes('/files/pdf')?'application/pdf':'application/vnd.google-apps.document',
      ownedByMe:true,capabilities:{canCopy:true},version:'1',appProperties});
  }
  return {drive:createAgreementDrive(config,fetcher),calls,copyCount:()=>copyCount,forgetRecipient:()=>{delete appProperties.rootAgreementRecipientPermissionId;}};
}
test('Google generation copies once, replaces all placeholders and grants only intended editor access',async()=>{
  const f=googleFixture();const op={id:'op',payload:{terms:terms()},progress:{}};
  const checkpoint=async patch=>Object.assign(op.progress,patch);
  const result=await f.drive.generate(op,checkpoint);assert.equal(result.document_id,'doc');assert.equal(f.copyCount(),1);
  await f.drive.generate(op,checkpoint);assert.equal(f.copyCount(),1);
  assert.ok(f.calls.some(c=>c.url.includes('sendNotificationEmail=false')));
  assert.ok(f.calls.some(c=>c.url.includes('ignoreDefaultVisibility=true')));
});

test('fresh branded template uses native copy, text-only merge and exports that copy for the accepted PDF',async()=>{
  const f=googleFixture({logo:true});const op={id:'new-branded-copy',payload:{terms:terms()},progress:{}};
  const result=await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));
  const copy=f.calls.find(c=>c.url.includes('/copy?'));
  assert.ok(copy.url.includes(`/files/${MASTER_DOCUMENT_ID}/copy`));assert.equal(f.copyCount(),1);
  const updates=f.calls.filter(c=>c.url.includes(':batchUpdate'));
  assert.equal(updates.length,1);
  assert.ok(JSON.parse(updates[0].body).requests.every(r=>Object.keys(r).length===1 && r.replaceAllText));
  const archive={id:'archive-branded-copy',progress:{}};
  await f.drive.archive(archive,{...draft(),document_id:result.document_id},async patch=>Object.assign(archive.progress,patch));
  assert.ok(f.calls.some(c=>c.url.includes(`/files/${result.document_id}/export?mimeType=application%2Fpdf`)));
  assert.equal(f.calls.some(c=>/documents.*create|deleteContentRange|deleteEmbeddedObject/.test(String(c.body))),false);
});
test('legacy alias without recipient binding fails closed instead of adopting the sole user',async()=>{
  const f=googleFixture({aliasRecipient:true});
  const op={id:'op',payload:{terms:terms()},progress:{}};
  const checkpoint=async patch=>Object.assign(op.progress,patch);
  await f.drive.generate(op,checkpoint);
  // Simulate a pre-fix draft by removing the remembered permission id while keeping the one recipient grant.
  const file=f.calls.find(c=>c.method==='PATCH' && c.url.includes('/files/doc?'));
  assert.ok(file);
  f.forgetRecipient();
  await assert.rejects(f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email),/broader/);
});
test('Google alias recipients are remembered by permission ID without sending a Google share notification',async()=>{
  const f=googleFixture({aliasRecipient:true});const op={id:'op',payload:{terms:terms()},progress:{}};
  const checkpoint=async patch=>Object.assign(op.progress,patch);
  await f.drive.generate(op,checkpoint);
  await f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email);
  assert.ok(f.calls.some(c=>c.url.includes('sendNotificationEmail=false')));
  assert.ok(f.calls.some(c=>c.method==='PATCH' && c.url.includes('/files/doc?')));
});
test('unsafe folder sharing is rejected before copying or sending',async()=>{
  const f=googleFixture({broad:true});
  await assert.rejects(f.drive.generate({id:'op',payload:{terms:terms()},progress:{}},async()=>{}),/broader/);
  assert.equal(f.copyCount(),0);
});

test('owner-resolving alias is accepted only through the returned ID and persisted recipient-hash binding',async()=>{
  const f=googleFixture({aliasRecipient:true,recipientRole:'owner'});
  const op={id:'op',payload:{terms:terms()},progress:{}};
  await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));
  assert.equal(op.progress.merged,true);
  assert.ok(f.calls.some(c=>c.url.includes('/permissions/owner?')));
  assert.equal(f.calls.some(c=>c.method==='PATCH'),true);
  assert.equal(op.progress.recipient_stage,'verified');
  assert.equal(op.progress.recipient_role,'owner');
  assert.equal(op.progress.recipient_permission_id,'owner');
  assert.equal(op.progress.recipient_email_hash,hash(intro.contact_email));
  await f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email);
  await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));
  assert.equal(f.calls.filter(c=>c.method==='POST' && c.url.includes('/permissions')).length,1);
  await assert.rejects(f.drive.verifyDocument({...draft(),document_id:'doc'},'another@example.test'),/Recipient does not have access/);
  f.forgetRecipient();
  await assert.rejects(f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email),/Recipient does not have access/);
});

test('failed owner-alias operation resumes its recorded binding without copying or sharing again',async()=>{
  const f=googleFixture({aliasRecipient:true,recipientRole:'owner',mergedDocument:true});
  const op={id:'c1e4fb5c-4b17-410d-9a6e-9f0ca24c4758',payload:{terms:terms()},progress:{
    merged:true,document_id:'doc',copy_started:true,merge_started:true,recipient_create_started:true,
    recipient_stage:'get_returned',recipient_type:'user',recipient_role:'owner',recipient_id_matches:true,
    recipient_permission_id:'owner',recipient_email_hash:hash(intro.contact_email)}};
  await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));
  assert.equal(op.progress.recipient_stage,'verified');assert.equal(f.copyCount(),0);
  assert.equal(f.calls.filter(c=>c.method==='POST' && !c.url.includes('oauth2.googleapis.com')).length,0);
  await f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email);
});

test('unbound owner, mismatched read-back ID and additional recipients remain rejected',async()=>{
  const unbound=googleFixture({recipientRole:'owner'});
  await assert.rejects(unbound.drive.verifyDocument({...draft(),document_id:'doc'},'root@example.test'),/Recipient does not have access/);
  for(const options of [{mismatchedReadback:true},{extraRecipient:true},{broad:true}]) {
    const f=googleFixture({aliasRecipient:true,recipientRole:'owner',...options});
    const op={id:'op',payload:{terms:terms()},progress:{}};
    await assert.rejects(f.drive.generate(op,async patch=>Object.assign(op.progress,patch)),/Recipient does not have access|broader/);
    assert.equal(f.calls.some(c=>c.method==='PATCH'),false);
  }
});

test('writer and reader recipient access continues to work',async()=>{
  for(const recipientRole of ['writer','reader']) {
    const f=googleFixture({recipientRole});const op={id:'op',payload:{terms:terms()},progress:{}};
    await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));
    await f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email);
    assert.equal(op.progress.recipient_stage,'verified');
  }
});

test('unrelated sole recipient must not be adopted as the stored contact without identity evidence',async()=>{
  const f=googleFixture({aliasRecipient:true,preexistingRecipient:true});
  const op={id:'op',payload:{terms:terms()},progress:{}};
  await assert.rejects(f.drive.generate(op,async patch=>Object.assign(op.progress,patch)),/broader|Recipient/);
  assert.equal(f.calls.some(c=>c.method==='POST' && c.url.includes('/permissions')),false);
});

test('old appProperties populated by sole-user fallback do not legitimise an unrelated recipient',async()=>{
  const f=googleFixture({aliasRecipient:true,preexistingRecipient:true,legacyBinding:true});
  await assert.rejects(f.drive.verifyDocument({...draft(),document_id:'doc'},intro.contact_email),/broader/);
  assert.equal(f.calls.some(c=>c.method==='PATCH'),false);
});

test('recipient diagnostics distinguish missing create ID, denied create, missing read-back and absent durable share',async()=>{
  for(const [config,stage,status] of [
    [{missingId:true,unlisted:true},'create_returned',null],
    [{createDenied:true},'create_requested',403],
    [{getMissing:true,unlisted:true},'get_requested',404],
    [{unlisted:true},'list_verification',null],
  ]) {
    const f=googleFixture(config);const op={id:'op',payload:{terms:terms()},progress:{}};
    const save=async patch=>Object.assign(op.progress,patch);
    await assert.rejects(f.drive.generate(op,save));
    assert.equal(op.progress.recipient_stage,stage);assert.equal(op.progress.recipient_http_status,status);
    assert.equal(op.progress.merged,true);assert.equal(f.calls.some(c=>c.method==='PATCH'),false);
    await assert.rejects(f.drive.generate(op,save));
    assert.equal(f.calls.filter(c=>c.method==='POST' && c.url.includes('/permissions')).length,1);
    assert.equal(f.copyCount(),1);
  }
});

test('permission creation receipt survives interrupted verification and retry does not create another permission',async()=>{
  const f=googleFixture({aliasRecipient:true});const op={id:'op',payload:{terms:terms()},progress:{}};
  let fail=true;
  const save=async patch=>{Object.assign(op.progress,patch);if(fail && patch.recipient_stage==='create_returned')throw Error('interrupted');};
  await assert.rejects(f.drive.generate(op,save));fail=false;
  await f.drive.generate(op,save);
  assert.equal(op.progress.recipient_stage,'verified');
  assert.equal(f.calls.filter(c=>c.method==='POST' && c.url.includes('/permissions')).length,1);
  await assert.rejects(f.drive.verifyDocument({...draft(),document_id:'doc'},'someone-else@example.test'),/broader/);
});
test('lost copy response recovers tagged copy; missing uncertain copy never creates a second one',async()=>{
  const f=googleFixture({lostCopy:true});const op={id:'op',payload:{terms:terms()},progress:{copy_started:true}};
  await f.drive.generate(op,async patch=>Object.assign(op.progress,patch));assert.equal(f.copyCount(),0);
  const missing=googleFixture();await assert.rejects(missing.drive.generate({...op,progress:{copy_started:true}},async()=>{}),/uncertain/);
  assert.equal(missing.copyCount(),0);
});
test('accepted PDF has a separate fixed ID, readback hash and retry does not upload again',async()=>{
  const f=googleFixture();const gen={id:'generate',payload:{terms:terms()},progress:{}};
  await f.drive.generate(gen,async patch=>Object.assign(gen.progress,patch));
  const archiveStart=f.calls.length;
  const a={...draft(),document_id:'doc'};const op={id:'op',progress:{}};
  const checkpoint=async patch=>Object.assign(op.progress,patch);
  const first=await f.drive.archive(op,a,checkpoint);const second=await f.drive.archive(op,a,checkpoint);
  assert.deepEqual(first,second);assert.equal(first.pdf_sha256,hash(Buffer.from('%PDF-fixture')));
  assert.equal(f.calls.filter(c=>c.url.includes('/upload/')).length,1);
  assert.equal(f.calls.slice(archiveStart).filter(c=>c.method==='PATCH' || c.method==='DELETE').length,0);
});
test('Google credentials fail closed and are not part of browser code',()=>{
  assert.throws(()=>googleAgreementConfig({}),/not configured/);
  const ui=fs.readFileSync('components/IntroducerGoogleAgreement.js','utf8');
  assert.doesNotMatch(ui,/GOOGLE_AGREEMENTS_|refresh_token|client_secret/);
  assert.match(ui,/window.confirm/);assert.match(ui,/navigator.clipboard.writeText/);
  const migration=fs.readFileSync('supabase/migrations/20261004_introducer_google_agreements.sql','utf8');
  assert.doesNotMatch(migration,/alter table public.organisation_introducers|record_personal_referral_payment|organisation_commissions|organisation_revenue_events/);
});
