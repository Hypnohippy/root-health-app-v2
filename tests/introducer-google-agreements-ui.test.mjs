import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { publicAgreementState } from '../lib/introducerGoogleAgreementServer.js';

const failedOperation={id:'c1e4fb5c-4b17-410d-9a6e-9f0ca24c4758',introducer_id:'2fc71a5f-1e53-4928-8ab1-aa53b38639af',
  agreement_id:'33333333-3333-4333-8333-333333333333',action:'generate',state:'failed',lease_until:null,
  progress:{merged:true,document_id:'151MRw3eX2wxmxmTkSUZcqWzaygSHbw-kyp-8Xjnu-JU',copy_started:true,merge_started:true,
    failure_reason:'recipient_access',template_revision:'synthetic-revision'}};
const mapperState={introducer:{id:failedOperation.introducer_id,name:'Synthetic Partner',contact_name:'Jo Test',contact_email:'test@example.test',
  introducer_market:'both',introducer_type:'practitioner',referral_code:'synthetic'},
  policies:[{commission_percent:20,commission_structure:'recurring',commission_basis:'collected_subscription_revenue',effective_from:'2020-01-01'}],
  agreements:[],operations:[failedOperation]};
const validPublicState=publicAgreementState(mapperState);
const invalidPublicState=publicAgreementState({...mapperState,policies:[]});

const require=createRequire(import.meta.url);
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE='1';
const swc=require('next/dist/build/swc');await swc.loadBindings();
const source=fs.readFileSync('components/IntroducerGoogleAgreement.js','utf8');
const {code}=await swc.transform(source,{filename:'IntroducerGoogleAgreement.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
const scripts=['react/umd/react.development.js','react-dom/umd/react-dom.development.js'].map(p=>fs.readFileSync(path.join(path.dirname(require.resolve(p.split('/')[0]+'/package.json')),...p.split('/').slice(1)),'utf8')).join('\n');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'root-google-agreement-ui-'));
const chrome=process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const component=code.replaceAll('</script','<\/script');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;font:15px Arial;background:#f5f7f8;color:#1b2730}main{max-width:800px;margin:auto}button:disabled{opacity:.5;cursor:default}a{text-decoration:none;display:inline-block}*{box-sizing:border-box}summary{cursor:pointer}h1{font-size:22px}</style></head><body><main><h1>Introducer fixture</h1><div id="root"></div><pre id="result" hidden></pre></main><script>${scripts}</script><script>
const intro={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic Partner With A Long Organisation Name'};
const retryMode=new URLSearchParams(location.search).has('retry');
const scenario=new URLSearchParams(location.search).get('scenario') || 'valid';
if(retryMode)intro.id='2fc71a5f-1e53-4928-8ab1-aa53b38639af';
const publicState=scenario==='terms_error'?${JSON.stringify(invalidPublicState)}:${JSON.stringify(validPublicState)};
const pending=publicState.operations[0];
document.body.style.width=new URLSearchParams(location.search).get('width')+'px';
document.body.style.maxWidth='100%';
const terms={introducer_name:intro.name,contact_name:'Jo Test',contact_email:'test@example.test',market:'both',commission_percent:20,commission_structure:'recurring',special_terms:'None'};
let row=null,writes=[],confirmations=[],shouldConfirm=true;
let sessionCalls=0;
window.confirm=text=>{confirmations.push(text);return shouldConfirm;};
window.fetch=async(url,options)=>{
  if(options.method==='POST') {
    const body=JSON.parse(options.body);writes.push(body);
    if(body.action==='generate')row={id:'a',version:1,status:'draft',document_url:'https://docs.google.com/document/d/fixture/edit',terms_snapshot:terms,generated_at:'2026-10-04T12:00:00Z'};
    if(body.action==='send')row={...row,status:'sent',sent_at:'2026-10-04T12:01:00Z'};
    if(body.action==='accept')row={...row,status:'accepted',accepted_at:'2026-10-04T12:02:00Z',pdf_document_url:'https://drive.google.com/file/d/fixture-pdf/view'};
    return {ok:true,json:async()=>({success:true})};
  }
  return {ok:true,json:async()=>({...publicState,agreements:row?[row]:[],operations:retryMode&&!row?[pending]:[],googleConfigured:scenario!=='unconfigured'})};
};
function require(name){if(name==='react')return React;if(name.includes('supabase'))return {supabase:{auth:{getSession:async()=>{
  sessionCalls++;
  if(sessionCalls===2 && scenario==='pending_session')return new Promise(()=>{});
  if(sessionCalls===2 && scenario==='missing_session')return {data:{session:null}};
  return {data:{session:{access_token:'fixture-token'}}};
}}}};throw Error(name);}
const module={exports:{}};const exports=module.exports;
${component}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(module.exports.default,{introducer:intro}));
const wait=()=>new Promise(resolve=>setTimeout(resolve,50));
const click=label=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===label);if(!button||button.disabled)throw Error('Missing enabled '+label);button.click();};
(async()=>{try{
  await wait();
  const retryButton=[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry Pending Operation');
  const disabledBefore=retryButton?.disabled;
  if(retryMode)retryButton.click();else click('Generate Agreement');
  await wait();const draft=document.body.textContent.includes('Agreement: Draft');
  if(retryMode){document.getElementById('result').textContent=JSON.stringify({draft,body:writes[0],count:writes.length,disabledBefore,
    disabledAfter:retryButton.disabled,sessionCalls,alerts:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent)});return;}
  shouldConfirm=false;click('Send Agreement');await wait();const declined=writes.length===1;
  shouldConfirm=true;click('Send Agreement');await wait();const sent=document.body.textContent.includes('Agreement: Sent');
  click('Mark Accepted');await wait();const accepted=document.body.textContent.includes('Agreement: Accepted');
  document.getElementById('result').textContent=JSON.stringify({draft,sent,accepted,declined,actions:writes.map(w=>w.action),confirmed:writes.filter(w=>w.action!=='generate').every(w=>w.confirmed),pdf:!![...document.querySelectorAll('a')].find(a=>a.textContent==='Open PDF'),overflow:document.documentElement.scrollWidth>innerWidth,confirmations:confirmations.length});
}catch(error){document.getElementById('result').textContent=JSON.stringify({error:error.message});}})();
</script></body></html>`;
fs.writeFileSync(path.join(folder,'index.html'),html);
for(const [width,retry,scenario='valid'] of [[390,false],[1280,false],[1280,true],[1280,true,'terms_error'],[1280,true,'unconfigured'],[1280,true,'missing_session'],[1280,true,'pending_session']]) test(retry?'retry public-state UI path: '+scenario:`agreement UI actions and readable layout at ${width}px`,{skip:!fs.existsSync(chrome)},()=>{
  const run=spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--disable-extensions',`--user-data-dir=${path.join(folder,'profile-'+width+'-'+retry+'-'+scenario)}`,`--window-size=${width},1100`,'--virtual-time-budget=2500','--dump-dom',`--screenshot=${path.join(folder,width+'-'+retry+'-'+scenario+'.png')}`,pathToFileURL(path.join(folder,'index.html')).href+'?width='+width+(retry?'&retry=1':'')+'&scenario='+scenario],{encoding:'utf8',timeout:30000,maxBuffer:5000000});
  assert.equal(run.status,0,run.stderr);
  const raw=run.stdout.match(/<pre id="result" hidden="">([^<]+)<\/pre>/)?.[1];assert.ok(raw,'fixture completed');
  const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
  if(retry){
    if(scenario!=='valid'){
      assert.equal(result.error,undefined);assert.equal(result.count,0);
      if(['terms_error','unconfigured'].includes(scenario)){
        assert.equal(result.disabledBefore,true);assert.equal(result.sessionCalls,1);
      } else {
        assert.equal(result.disabledBefore,false);
        if(scenario==='pending_session'){assert.equal(result.sessionCalls,2);assert.equal(result.disabledAfter,true);}
        else assert.ok(result.alerts.includes('Please sign in again.'));
      }
      return;
    }
    assert.equal(result.error,undefined);assert.equal(result.count,1);assert.equal(result.draft,true);
    assert.deepEqual(result.body,{requestId:'c1e4fb5c-4b17-410d-9a6e-9f0ca24c4758',action:'generate',introducerId:'2fc71a5f-1e53-4928-8ab1-aa53b38639af',agreementId:'33333333-3333-4333-8333-333333333333',confirmed:true,specialTerms:'None'});
    return;
  }
  assert.equal(result.error,undefined);assert.equal(result.draft,true);assert.equal(result.sent,true);assert.equal(result.accepted,true);
  assert.equal(result.declined,true);assert.equal(result.confirmed,true);assert.equal(result.pdf,true);assert.equal(result.overflow,false);
  assert.deepEqual(result.actions,['generate','send','accept']);
  console.log('Agreement UI screenshot: '+path.join(folder,width+'-'+retry+'-'+scenario+'.png'));
});
