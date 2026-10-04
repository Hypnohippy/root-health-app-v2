import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { AGREEMENT_VERSION, AGREEMENT_TEXT, ACCEPTANCE_TEXT, ACCEPTANCE_VERSION, validateAcceptance } from '../lib/introducerAgreement.js';
import { agreementPdf, contractContent } from '../lib/introducerAgreementPdf.js';
import { archiveAcceptance, ownedAcceptance, verifiedAgreementUser } from '../lib/introducerAgreementServer.js';
import { GET as ownCopies, POST as acceptRoute } from '../app/api/introducer-agreements/route.js';
import { GET as downloadRoute } from '../app/api/introducer-agreements/[id]/pdf/route.js';
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');
const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', person='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const legacy='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const token='a'.repeat(64), token2='b'.repeat(64), digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function database() {
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table public.organisations(id uuid primary key); create sequence public.root_commercial_document_number_seq;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
    grant usage on schema storage to anon,authenticated; grant all on storage.objects,storage.buckets to anon,authenticated;
    create policy old_broad_policy on storage.objects for all to anon,authenticated using(true) with check(true);`);
  const schema=JSON.parse(fs.readFileSync('tests/fixtures/introducer-schema.json','utf8'));
  const tables=[...new Set(schema.filter(r=>r.object_type==='01_COLUMN').map(r=>r.object_name))];
  for(const table of tables) {
    const columns=schema.filter(r=>r.object_type==='01_COLUMN'&&r.object_name===table).map(r=>{
      const parts=Object.fromEntries(r.definition.split('; ').map(p=>{const at=p.indexOf('=');return [p.slice(0,at),p.slice(at+1)];}));
      return `"${r.item.split(' ')[1]}" ${parts.type}${parts.nullable==='NO'?' not null':''}${parts.default?' default '+parts.default:''}`;
    });
    await db.exec(`create table public.${table} (${columns.join(',')});`);
  }
  for(const type of ['PRIMARY KEY','UNIQUE','CHECK','FOREIGN KEY'])
    for(const r of schema.filter(r=>r.object_type==='03_CONSTRAINT'&&r.definition.startsWith('type='+type+';')))
      await db.exec(`alter table public.${r.object_name} add constraint ${r.item} ${r.definition.split('; ')[1]};`);
  for(const r of schema.filter(r=>r.object_type==='04_INDEX'))
    if(!(await db.query('select 1 from pg_indexes where indexname=$1',[r.item])).rows.length)await db.exec(r.definition);
  for(const r of schema.filter(r=>['06_TRIGGER_FUNCTION','09_REQUIRED_FUNCTION'].includes(r.object_type)))await db.exec(r.definition);
  for(const r of schema.filter(r=>r.object_type==='05_TRIGGER'))await db.exec(r.definition);
  await db.exec(fs.readFileSync('supabase/migrations/20261003_personal_introducer_referrals.sql','utf8'));
  await db.query("insert into organisation_introducers(id,name,referral_code,status,contact_email) values($1,'Legacy','legacy','active','legacy@example.test')",[legacy]);
  await db.exec(fs.readFileSync('supabase/migrations/20261003_introducer_agreement_acceptance.sql','utf8'));
  const id=(await db.query("insert into organisation_introducers(name,referral_code,contact_email,introducer_market) values('Test Partner','test-agreement','partner@example.test','both') returning id")).rows[0].id;
  await db.query("insert into organisation_introducer_policies(introducer_id,commission_percent,commission_basis,commission_structure,effective_from) values($1,20,'collected_subscription_revenue','one_off',now()-interval '1 day')",[id]);
  await db.query('update organisation_introducers set commission_percent=20 where id=$1',[id]);
  return {db,id};
}
async function issue(db,id,hash=token,version=AGREEMENT_VERSION,text=AGREEMENT_TEXT,changes={}) {
  return (await db.query('select issue_introducer_agreement($1,$2,$3,$4,$5,$6,$7,$8,$9) id',[id,'partner@example.test',hash,version,text,ACCEPTANCE_VERSION,ACCEPTANCE_TEXT,admin,JSON.stringify(changes)])).rows[0].id;
}
async function accept(db,hash=token,email='partner@example.test',account=person) {
  return (await db.query("select accept_introducer_agreement($1,$2,$3,'Jane Partner','Owner',true,true) id",[hash,account,email])).rows[0].id;
}
const row=async(db,id)=>(await db.query('select * from introducer_agreement_acceptances where id=$1',[id])).rows[0];
const finish=(db,id,acceptance)=>db.query('select complete_introducer_agreement($1,$2,$3,$4)',[acceptance,`introducer-agreements/${id}/${acceptance}.pdf`,token,token2]);

test('verified identity and both confirmations are required; invitation email cannot be substituted',async()=>{
  assert.throws(()=>validateAcceptance({name:'A',capacity:'Owner',agreed:true,authority:false}));
  assert.throws(()=>validateAcceptance({name:{},capacity:'Owner',agreed:true,authority:true}));
  const {db,id}=await database();try{
    await issue(db,id);
    await assert.rejects(accept(db,token,'wrong@example.test'),/Invitation unavailable/);
    await assert.rejects(accept(db,token,null),/Invitation unavailable/);
    const accepted=await accept(db);assert.equal((await row(db,accepted)).verified_email,'partner@example.test');
  }finally{await db.close();}
});
test('acceptance is duplicate-safe and archive completion gates activation; legacy stays active',async()=>{
  const {db,id}=await database();try{
    assert.deepEqual((await db.query('select status,agreement_legacy from organisation_introducers where id=$1',[legacy])).rows[0],{status:'active',agreement_legacy:true});
    await assert.rejects(db.query("update organisation_introducers set status='active' where id=$1",[id]),/Archived acceptance/);
    await issue(db,id);const a=await accept(db);assert.equal(await accept(db),a);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'inactive');
    await assert.rejects(db.query("update organisation_introducers set status='active' where id=$1",[id]),/Archived acceptance/);
    await finish(db,id,a);await finish(db,id,a);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'active');
    await db.query("update organisation_introducers set status='inactive' where id=$1",[id]);await finish(db,id,a);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'inactive');
  }finally{await db.close();}
});
test('historic versions, acceptances and archive receipts cannot be updated or deleted',async()=>{
  const {db,id}=await database();try{
    await issue(db,id);const a=await accept(db);await finish(db,id,a);
    for(const table of ['introducer_agreement_versions','introducer_agreement_acceptances','introducer_agreement_archives']){
      await assert.rejects(db.exec(`delete from ${table}`),/append-only/);
    }
    await assert.rejects(db.exec("update introducer_agreement_acceptances set accepting_name='Other'"),/append-only/);
    await assert.rejects(issue(db,id,token2,AGREEMENT_VERSION,'Changed under old version'),/different wording/);
    await assert.rejects(db.exec("update introducer_agreement_offers set invited_email='other@example.test'"),/revocation/);
  }finally{await db.close();}
});
test('material replacement terms require a new acceptance, keep originals and do not mutate frozen Personal accounting',async()=>{
  const {db,id}=await database();try{
    await issue(db,id);const first=await accept(db);await finish(db,id,first);const original=await row(db,first);
    await assert.rejects(db.query("select change_introducer_commercial_terms($1,30,'recurring',now(),'bypass',null)",[id]),/replacement acceptance/);
    await issue(db,id,token2,'2026-11-v2 - Draft for Legal Review','Replacement agreement',{commission_percent:30,commission_structure:'recurring'});
    assert.equal(Number((await db.query('select commission_percent from organisation_introducers where id=$1',[id])).rows[0].commission_percent),20);
    const second=await accept(db,token2);assert.notEqual(second,first);await finish(db,id,second);
    assert.deepEqual(await row(db,first),original);
    assert.equal(Number((await db.query('select commission_percent from organisation_introducers where id=$1',[id])).rows[0].commission_percent),30);
    assert.equal((await db.query('select count(*)::int n from organisation_revenue_events')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int n from organisation_commissions')).rows[0].n,0);
  }finally{await db.close();}
});
test('revoked offer cannot be accepted; old archive retry cannot activate a replaced invitation',async()=>{
  const {db,id}=await database();try{
    await issue(db,id);const old=await accept(db);await issue(db,id,token2);await finish(db,id,old);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'inactive');
    const current=await accept(db,token2);await finish(db,id,current);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'active');
  }finally{await db.close();}
});
test('RLS and grants deny client tables/RPCs and restrictive Storage policies override permissive policies',async()=>{
  const {db,id}=await database();try{
    await issue(db,id);
    await db.exec("insert into storage.objects(bucket_id,name) values('introducer-agreements','secret.pdf'),('other','public.pdf')");
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      for(const table of ['introducer_agreement_versions','introducer_agreement_offers','introducer_agreement_acceptances','introducer_agreement_archives'])
        await assert.rejects(db.exec(`select * from ${table}`),/permission denied/);
      await assert.rejects(accept(db),/permission denied/);
      assert.deepEqual((await db.query('select name from storage.objects')).rows,[{name:'public.pdf'}]);
      await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('introducer-agreements','attack.pdf')"),/row-level security/);
      assert.equal((await db.query("update storage.objects set name='overwritten.pdf' where bucket_id='introducer-agreements' returning id")).rows.length,0);
      assert.equal((await db.query("delete from storage.objects where bucket_id='introducer-agreements' returning id")).rows.length,0);
      await db.exec('reset role');
    }
    assert.equal((await db.query("select public from storage.buckets where id='introducer-agreements'")).rows[0].public,false);
    assert.equal((await db.query("select name from storage.objects where bucket_id='introducer-agreements'")).rows[0].name,'secret.pdf');
    await db.exec('set role service_role');
    await assert.rejects(db.exec('delete from introducer_agreement_acceptances'),/permission denied/);
    await db.exec('reset role');
  }finally{await db.close();}
});
test('archive upload failure leaves immutable snapshot; retry and lost-ack recovery are safe',async()=>{
  const {db,id}=await database();try{
    await issue(db,id);const a=await row(db,await accept(db));let fail=true,failDatabase=true,stored=null,receipt=null,finalizations=0;
    const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:receipt})})})}),
      storage:{from:()=>({upload:async(_path,bytes,options)=>{assert.equal(options.upsert,false);if(fail)return{error:{}};if(stored)return{error:{}};stored=bytes;return{};},download:async()=>stored?{data:new Blob([stored])}:{error:{}}})},
      rpc:async(name,args)=>{finalizations++;if(failDatabase)return{error:{}};await finish(db,id,args.p_acceptance);receipt={storage_path:args.p_path,pdf_hash:args.p_pdf_hash};return{};}};
    await assert.rejects(archiveAcceptance(client,a));assert.equal(finalizations,0);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'inactive');
    fail=false;await assert.rejects(archiveAcceptance(client,a));assert.ok(stored);assert.equal(finalizations,1);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'inactive');
    failDatabase=false;await archiveAcceptance(client,a);await archiveAcceptance(client,a);assert.equal(finalizations,2);
    assert.equal(digest(stored),receipt.pdf_hash);assert.equal(await accept(db),a.id);
    assert.equal((await db.query('select status from organisation_introducers where id=$1',[id])).rows[0].status,'active');
  }finally{await db.close();}
});
test('unauthorised accepted-copy access is denied; owner and Root admin allowed',async()=>{
  const a={account_id:person,id:token};const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:a})})})})};
  await assert.rejects(ownedAcceptance(db,{id:admin},false,token),/unavailable/);
  assert.equal(await ownedAcceptance(db,{id:person},false,token),a);
  assert.equal(await ownedAcceptance(db,{id:admin},true,token),a);
});
test('GET is read-only, commercial data requires verified account, archive hash is checked',()=>{
  const api=fs.readFileSync('app/api/introducer-agreements/route.js','utf8');
  assert.doesNotMatch(api.split('export async function POST')[0],/\.rpc\(|archiveAcceptance\(/);
  const server=fs.readFileSync('lib/introducerAgreementServer.js','utf8');
  assert.match(server,/auth\.auth\.getUser\(token\)/);assert.match(server,/email_confirmed_at/);
  const pdf=fs.readFileSync('app/api/introducer-agreements/[id]/pdf/route.js','utf8');
  assert.match(pdf,/ownedAcceptance/);assert.match(pdf,/hash\(bytes\) !== archive.pdf_hash/);
});
test('server rejects unverified/revoked accounts and routes deny anonymous review, acceptance and PDF access',async()=>{
  const auth=user=>({auth:{getUser:async token=>{assert.equal(token,'jwt');return{data:{user}};}}});
  for(const user of [null,{id:person,email:'partner@example.test'},{id:person,email_confirmed_at:'2026-10-03'}])
    await assert.rejects(verifiedAgreementUser(auth(user),'jwt',[]),/Verified sign-in/);
  const verified={id:person,email:'partner@example.test',email_confirmed_at:'2026-10-03'};
  assert.deepEqual(await verifiedAgreementUser(auth(verified),'jwt',[]),{user:verified,isAdmin:false});
  assert.equal((await verifiedAgreementUser(auth(verified),'jwt',['partner@example.test'])).isAdmin,true);
  assert.equal((await ownCopies(new Request('https://preview.example/api/introducer-agreements'))).status,403);
  assert.equal((await acceptRoute(new Request('https://preview.example/api/introducer-agreements',{method:'POST',body:JSON.stringify({action:'accept',token})}))).status,400);
  assert.equal((await downloadRoute(new Request('https://preview.example/api/introducer-agreements/x/pdf'),{params:{id:token}})).status,403);
});
test('PDF preserves supported Unicode, deterministic bytes and canonical content hash',async()=>{
  const a={id:person,introducer_id:legacy,version:AGREEMENT_VERSION,agreement_text:AGREEMENT_TEXT,
    terms:{market:'both',commission_percent:20},accepting_name:'Zoë Łukasz',accepting_capacity:'Owner',verified_email:'partner@example.test',
    accepted_at:'2026-10-03T12:00:00.000Z',acceptance_version:ACCEPTANCE_VERSION,acceptance_text:ACCEPTANCE_TEXT,agreed:true,authority_confirmed:true};
  assert.equal(digest(await agreementPdf(a)),digest(await agreementPdf(a)));
  assert.equal(contractContent(a),contractContent({...a,terms:{commission_percent:20,market:'both'}}));
  await assert.rejects(agreementPdf({...a,accepting_name:'Unsupported\u{1f600}'}),/cannot represent/);
});
test('legal identity and concise contractual refund rules are preserved',()=>{
  assert.match(AGREEMENT_TEXT,/David Prince trading as Root Health App/);
  assert.match(AGREEMENT_TEXT,/33 Victoria Street, Maidstone, Kent, ME16 8HY/);
  assert.match(AGREEMENT_TEXT,/30 days of written notice/);
  assert.match(AGREEMENT_TEXT,/next monthly subscription anniversary/);
  assert.match(AGREEMENT_TEXT,/validly introduced and converted before termination/);
  assert.match(ACCEPTANCE_TEXT,/authorised to enter into this Agreement/);
  assert.ok(contractContent({terms:{},version:AGREEMENT_VERSION}).includes('Draft for Legal Review'));
});
