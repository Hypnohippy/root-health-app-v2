import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID,randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PDFDocument,PDFName } from 'pdf-lib';
import { acceptanceOrigin,invitationHash,acceptanceEvidence,acceptedPdf,fulfilAcceptance,prepareAcceptanceInvitation } from '../lib/introducerAgreementAcceptance.js';
import { ACCEPTANCE_TEXT,AUTHORITY_TEXT } from '../lib/introducerAgreementConsent.js';
import { agreementAcceptanceNotifier,agreementMail } from '../lib/introducerAgreementEmail.js';
import { hash } from '../lib/introducerGoogleAgreementTerms.js';
import { getRootDestination } from '../lib/rootNavigator.js';
import { POST } from '../app/api/introducer-agreement/accept/route.js';
import { loadAgreementState } from '../lib/introducerGoogleAgreementServer.js';

const intro=randomUUID(),actor=randomUUID();
const terms={introducer_name:'Synthetic Partner',contact_name:'Jo Test',contact_email:'jo@example.test',special_terms:'None'};
const evidence=()=>acceptanceEvidence({full_name:'Jo Test',role:'Director',organisation:'Synthetic Partner',email:terms.contact_email,date:'2026-10-05',confirmed:true,authority:true},terms.contact_email);
function historyClient(db,{empty=false,acceptanceError=false}={}) {
  const calls=[];
  return {calls,from(table){
    const call={table};calls.push(call);
    const query={
      select(columns){call.columns=columns;assert.ok(!columns.includes('('),'No inferred PostgREST relationship');return query;},
      eq(key,value){call.eq=[key,value];return query;},
      in(key,value){call.in=[key,value];return query;},
      order(key,options){call.order=[key,options];return query;},
      not(){return query;},single(){return query;},
      async then(resolve,reject){try {
        let data=[];
        if(table==='organisation_introducers')data={id:intro};
        if(table==='organisation_introducer_agreements'){
          assert.deepEqual(call.eq,['introducer_id',intro]);assert.deepEqual(call.order,['version',{ascending:false}]);
          data=empty ? [] : (await db.query('select * from organisation_introducer_agreements where introducer_id=$1 order by version desc',[intro])).rows;
        }
        if(table==='introducer_agreement_acceptances'){
          assert.equal(call.in[0],'agreement_id');
          if(acceptanceError)return resolve({error:Error('Unavailable')});
          data=(await db.query(`select ${call.columns} from introducer_agreement_acceptances where agreement_id=any($1::uuid[])`,[call.in[1]])).rows;
        }
        resolve({data});
      }catch(error){reject(error);}}
    };return query;
  }};
}
test('history loads direct-acceptance schema separately and preserves ordered public acceptance metadata',async()=>{
  const f=await fixture();try {
    await f.accept();
    const newer=randomUUID();
    await f.db.query(`insert into organisation_introducer_agreements(id,introducer_id,version,status,document_id,document_url,template_document_id,terms_snapshot,terms_hash,created_by)
      values($1,$2,2,'draft','new-doc','https://docs.google.com/document/d/new-doc/edit','master',$3,$4,$5)`,[newer,intro,terms,hash(JSON.stringify(terms)),actor]);
    const fk=await f.db.query("select confrelid::regclass::text target from pg_constraint where conrelid='introducer_agreement_acceptances'::regclass and contype='f'");
    assert.ok(fk.rows.some(r=>r.target==='introducer_agreement_review_copies'));
    const client=historyClient(f.db),state=await loadAgreementState(client,intro);
    assert.deepEqual(state.agreements.map(a=>a.id),[newer,f.agreement]);
    assert.equal(state.agreements[0].acceptance,null);
    const expected=(await f.db.query('select id,accepted_at,evidence,archive_state,deliveries from introducer_agreement_acceptances where agreement_id=$1',[f.agreement])).rows[0];
    assert.deepEqual(state.agreements[1].acceptance,expected);
    assert.deepEqual(client.calls.find(c=>c.table==='introducer_agreement_acceptances').in,['agreement_id',[newer,f.agreement]]);
    const empty=historyClient(f.db,{empty:true});
    assert.deepEqual((await loadAgreementState(empty,intro)).agreements,[]);
    assert.ok(!empty.calls.some(c=>c.table==='introducer_agreement_acceptances'));
    await assert.rejects(loadAgreementState(historyClient(f.db,{acceptanceError:true}),intro),/Agreement database operation failed/);
  }finally{await f.db.close();}
});
async function fixture() {
  const db=new PGlite();
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table organisation_introducers(id uuid primary key,status text default \'active\');');
  await db.query('insert into organisation_introducers(id) values($1)',[intro]);
  for(const file of ['20261004_introducer_google_agreements.sql','20261005_introducer_agreement_returns.sql','20261006_introducer_direct_acceptance.sql'])
    await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  const agreement=randomUUID();
  await db.query(`insert into organisation_introducer_agreements(id,introducer_id,version,status,document_id,document_url,template_document_id,terms_snapshot,terms_hash,created_by,sent_at,sent_to,sent_terms_snapshot)
    values($1,$2,1,'sent','doc','https://docs.google.com/document/d/doc/edit','master',$3,$4,$5,now(),$6,$3)`,[agreement,intro,terms,hash(JSON.stringify(terms)),actor,terms.contact_email]);
  const pdf=await PDFDocument.create();const page=pdf.addPage();page.drawText('Synthetic logo and frozen agreement; Draft for legal review');
  const logo=await pdf.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
  page.drawImage(logo,{x:40,y:650,width:30,height:30});
  const bytes=Buffer.from(await pdf.save());
  const review={pdf_base64:bytes.toString('base64'),pdf_sha256:hash(bytes),source_revision:'v1'};
  const token=randomBytes(32).toString('base64url');
  await db.query('select prepare_introducer_acceptance($1,$2,$3)',[agreement,invitationHash(token),review]);
  const accept=(value=evidence(),digest=review.pdf_sha256)=>db.query('select accept_introducer_agreement($1,$2,$3) e',[invitationHash(token),value,digest]);
  const row=async()=> (await db.query('select * from organisation_introducer_agreements where id=$1',[agreement])).rows[0];
  return {db,agreement,token,review,accept,row};
}
function adapter(db) {
  return {from:()=>({select:()=>({eq:(_key,id)=>({single:async()=>({data:(await db.query('select * from introducer_agreement_review_copies where agreement_id=$1',[id])).rows[0]})})})}),
    rpc:async(_name,args)=>{try{return{data:(await db.query('select fulfil_introducer_acceptance($1,$2,$3,$4) e',[args.p_agreement,args.p_lease,args.p_action,args.p_data])).rows[0].e};}catch(error){return{error};}}};
}
test('only the acceptance path is public; Preview origins cannot fall back to Production',()=>{
  assert.equal(getRootDestination(null,'/introducer-agreement/accept'),null);
  for(const path of ['/admin/introducers','/coach','/introducer-agreement/complete'])assert.equal(getRootDestination(null,path),'/welcome');
  assert.equal(acceptanceOrigin({NEXT_PUBLIC_SITE_URL:'https://preview.example.test',VERCEL_ENV:'preview'}),'https://preview.example.test');
  assert.throws(()=>acceptanceOrigin({NEXT_PUBLIC_SITE_URL:'https://roothealth.app',VERCEL_ENV:'preview'}),/Production/);
  assert.throws(()=>acceptanceOrigin({}),/configured/);
  assert.throws(()=>invitationHash('guessable'),/unavailable/);
});
test('identity, matching email, date, consent and organisation authority are required',()=>{
  assert.equal(evidence().acceptance_text,ACCEPTANCE_TEXT);assert.equal(evidence().authority_text,AUTHORITY_TEXT);
  for(const patch of [{full_name:''},{role:''},{email:'other@example.test'},{date:'2026-02-30'},{confirmed:false},{authority:false}])
    assert.throws(()=>acceptanceEvidence({...evidence(),...patch},terms.contact_email));
  assert.equal(acceptanceEvidence({...evidence(),organisation:'',authority:false},terms.contact_email).authority,false);
});
test('invitation creation stores only a random token hash and reuses the frozen review copy',async()=>{
  const bytes=Buffer.from('%PDF-synthetic');let saved;
  const review={pdf_base64:bytes.toString('base64'),pdf_sha256:hash(bytes),source_revision:'v1'};
  const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:review})})})}),rpc:async(name,args)=>{assert.equal(name,'prepare_introducer_acceptance');saved=args;return{};}};
  const link=await prepareAcceptanceInvitation(db,{reviewSnapshot:()=>{throw Error('must not re-export an existing review');}},{id:randomUUID()},'https://preview.example.test');
  const url=new URL(link),token=url.hash.slice(1);
  assert.equal(url.pathname,'/introducer-agreement/accept');assert.equal(url.search,'');assert.equal(token.length,43);
  assert.equal(saved.p_token_hash,invitationHash(token));assert.equal(JSON.stringify(saved).includes(token),false);
  assert.deepEqual(saved.p_pdf,review);
});
test('forward retirement preserves legacy accepted agreements and return audit rows exactly',async()=>{
  const db=new PGlite();try {
    await db.exec('create role anon;create role authenticated;create role service_role;create table organisation_introducers(id uuid primary key);');
    await db.query('insert into organisation_introducers values($1)',[intro]);
    for(const file of ['20261004_introducer_google_agreements.sql','20261005_introducer_agreement_returns.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
    const id=randomUUID();
    await db.query(`insert into organisation_introducer_agreements(id,introducer_id,version,status,document_id,document_url,template_document_id,terms_snapshot,terms_hash,created_by,
      accepted_at,accepted_by,pdf_document_id,pdf_document_url,pdf_sha256,accepted_terms_snapshot)
      values($1,$2,1,'accepted','legacy','https://docs.google.com/document/d/legacy/edit','master',$3,$4,$5,now(),$5,'legacy-pdf','https://drive.google.com/file/d/legacy-pdf/view',$4,$3)`,[id,intro,terms,hash('legacy'),actor]);
    await db.query('insert into introducer_google_agreement_returns(agreement_id) values($1)',[id]);
    const before=(await db.query('select * from organisation_introducer_agreements')).rows;
    const returns=(await db.query('select * from introducer_google_agreement_returns')).rows;
    await db.exec(fs.readFileSync('supabase/migrations/20261006_introducer_direct_acceptance.sql','utf8'));
    assert.deepEqual((await db.query('select * from organisation_introducer_agreements')).rows,before);
    assert.deepEqual((await db.query('select * from introducer_google_agreement_returns')).rows,returns);
    assert.equal((await db.query('select count(*)::int n from introducer_agreement_acceptances')).rows[0].n,0);
  }finally{await db.close();}
});
test('forward migration retires returns, denies public RPC/table access and keeps evidence private',async()=>{
  const f=await fixture();try {
    assert.equal((await f.db.query("select to_regprocedure('return_introducer_google_agreement(uuid)') p")).rows[0].p,null);
    assert.ok((await f.db.query("select to_regclass('introducer_google_agreement_returns') t")).rows[0].t);
    for(const role of ['anon','authenticated']) {
      await f.db.exec('set role '+role);
      for(const table of ['introducer_agreement_review_copies','introducer_agreement_invitations','introducer_agreement_acceptances'])
        await assert.rejects(f.db.exec('select * from '+table),/permission denied/);
      await assert.rejects(f.accept(),/permission denied/);await f.db.exec('reset role');
    }
  }finally{await f.db.close();}
});
test('acceptance is immediate, idempotent, version/hash-bound and immutable before PDF work',async()=>{
  const f=await fixture();try {
    await assert.rejects(f.accept(evidence(),'wrong'),/confirmation/);
    const first=(await f.accept()).rows[0].e;
    const repeat=(await f.accept({...evidence(),full_name:'Attempted overwrite'})).rows[0].e;
    assert.deepEqual(first,repeat);assert.equal(first.archive_state,'pending');assert.ok(first.accepted_at);
    assert.equal((await f.row()).pdf_document_id,null);
    await assert.rejects(f.db.exec("update introducer_agreement_acceptances set evidence='{}'"),/immutable/);
    await assert.rejects(f.db.exec('delete from introducer_agreement_acceptances'),/cannot be deleted/);
    await assert.rejects(f.db.exec("update introducer_agreement_review_copies set source_revision='new'"),/immutable/);
    assert.equal((await f.db.query('select status from organisation_introducers')).rows[0].status,'active');
  }finally{await f.db.close();}
});
test('expired and superseded invitations cannot record acceptance; admin cannot substitute consent',async()=>{
  const f=await fixture();try {
    await assert.rejects(f.db.query('select begin_introducer_google_operation($1,$2,$3,$4,$5,$6)',
      [randomUUID(),intro,'accept',actor,randomUUID(),{agreement_id:f.agreement,confirmed:true}]),/Customer acceptance/);
    await f.db.query('insert into introducer_agreement_invitations(token_hash,agreement_id,expires_at) values($1,$2,now()-interval \'1 day\')',[hash('expired'),f.agreement]);
    await assert.rejects(f.db.query('select accept_introducer_agreement($1,$2,$3)',[hash('expired'),evidence(),f.review.pdf_sha256]));
    await f.db.query("update organisation_introducer_agreements set status='superseded' where id=$1",[f.agreement]);
    await assert.rejects(f.accept(),/unavailable/);
  }finally{await f.db.close();}
});
test('final PDF retains review pages and appends identity/consent evidence with Unicode JSON',async()=>{
  const f=await fixture();try {
    const a=(await f.accept({...evidence(),full_name:'Zoë 李'})).rows[0].e;
    const bytes=await acceptedPdf(f.review,a,1),pdf=await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount()>=2);assert.equal(pdf.getPages()[0].getSize().width,(await PDFDocument.load(Buffer.from(f.review.pdf_base64,'base64'))).getPages()[0].getSize().width);
    assert.ok(pdf.catalog.get(PDFName.of('Names')));
    assert.ok(pdf.getPages()[0].node.Resources().get(PDFName.of('XObject')));
    await assert.rejects(acceptedPdf({...f.review,pdf_base64:Buffer.from('tampered').toString('base64')},a,1),/integrity/);
  }finally{await f.db.close();}
});
test('archive interruption retains one acceptance; retry reuses saved PDF and never blindly repeats email',async()=>{
  const f=await fixture();try {
    await f.accept();let fail=true,uploads=0,sends=0;
    const args={db:adapter(f.db),agreement:await f.row(),drive:{archive:async(op,_agreement,save,frozen)=>{
      assert.ok(frozen.bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
      if(!op.progress.pdf_id){uploads++;await save({pdf_id:'pdf',pdf_hash:hash(frozen.bytes),source_revision:'v1'});}
      if(fail)throw Error('upload interruption');
      return {pdf_document_id:'pdf',pdf_document_url:'https://drive.google.com/file/d/pdf/view',pdf_sha256:op.progress.pdf_hash,source_revision:'v1'};
    }},notify:async()=>{sends++;throw Error('ambiguous delivery');}};
    await assert.rejects(fulfilAcceptance(args));assert.equal((await f.db.query('select count(*)::int n from introducer_agreement_acceptances')).rows[0].n,1);
    fail=false;await fulfilAcceptance(args);await fulfilAcceptance(args);
    assert.equal(uploads,1);assert.equal(sends,2);assert.equal((await f.row()).status,'accepted');
    const accepted=(await f.db.query('select * from introducer_agreement_acceptances')).rows[0];
    assert.equal(accepted.deliveries.customer.state,'unconfirmed');assert.equal(accepted.deliveries.root.state,'unconfirmed');
    await assert.rejects(f.db.exec("update introducer_agreement_acceptances set progress='{}'"),/immutable/);
  }finally{await f.db.close();}
});
test('invitation and accepted-copy emails remain Root branded; no second completion link',async()=>{
  const agreement={terms_snapshot:terms,version:1};
  const mail=agreementMail(agreement,terms.contact_email,'https://preview.example.test/introducer-agreement/accept#private');
  assert.match(mail.text,/Accept Agreement/);assert.doesNotMatch(mail.text,/completed my agreement|return\/share|save\/share/);
  const sent=[];const notify=agreementAcceptanceNotifier({RESEND_API_KEY:'fixture'},async(_url,options)=>{sent.push(JSON.parse(options.body));return Response.json({id:'receipt'});});
  for(const channel of ['customer','root'])await notify(channel,agreement,{id:randomUUID(),evidence:evidence(),accepted_at:'2026-10-05'},Buffer.from('%PDF-copy'));
  assert.deepEqual(sent.map(x=>x.to[0]),[terms.contact_email,'enquiries@roothealth.app']);
  assert.ok(sent.every(x=>x.from==='Root Health <enquiries@roothealth.app>' && x.reply_to==='enquiries@roothealth.app' && x.attachments.length===1));
});
test('public API rejects cross-origin requests and has no GET-side acceptance',async()=>{
  const old=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://preview.example.test';
  try {assert.equal((await POST(new Request('https://preview.example.test/api/introducer-agreement/accept',{method:'POST',headers:{origin:'https://other.example','Content-Type':'application/json'},body:'{}'}))).status,403);}
  finally{if(old===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=old;}
});
