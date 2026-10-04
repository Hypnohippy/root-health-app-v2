import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

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
document.body.style.width=new URLSearchParams(location.search).get('width')+'px';
document.body.style.maxWidth='100%';
const terms={introducer_name:intro.name,contact_name:'Jo Test',contact_email:'test@example.test',market:'both',commission_percent:20,commission_structure:'recurring',special_terms:'None'};
let row=null,writes=[],confirmations=[],shouldConfirm=true;
window.confirm=text=>{confirmations.push(text);return shouldConfirm;};
window.fetch=async(url,options)=>{
  if(options.method==='POST') {
    const body=JSON.parse(options.body);writes.push(body);
    if(body.action==='generate')row={id:'a',version:1,status:'draft',document_url:'https://docs.google.com/document/d/fixture/edit',terms_snapshot:terms,generated_at:'2026-10-04T12:00:00Z'};
    if(body.action==='send')row={...row,status:'sent',sent_at:'2026-10-04T12:01:00Z'};
    if(body.action==='accept')row={...row,status:'accepted',accepted_at:'2026-10-04T12:02:00Z',pdf_document_url:'https://drive.google.com/file/d/fixture-pdf/view'};
    return {ok:true,json:async()=>({success:true})};
  }
  return {ok:true,json:async()=>({agreements:row?[row]:[],operations:[],googleConfigured:true,needsUpdating:false,currentTerms:terms})};
};
function require(name){if(name==='react')return React;if(name.includes('supabase'))return {supabase:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}}};throw Error(name);}
const module={exports:{}};const exports=module.exports;
${component}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(module.exports.default,{introducer:intro}));
const wait=()=>new Promise(resolve=>setTimeout(resolve,50));
const click=label=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===label);if(!button||button.disabled)throw Error('Missing enabled '+label);button.click();};
(async()=>{try{
  await wait();click('Generate Agreement');await wait();const draft=document.body.textContent.includes('Agreement: Draft');
  shouldConfirm=false;click('Send Agreement');await wait();const declined=writes.length===1;
  shouldConfirm=true;click('Send Agreement');await wait();const sent=document.body.textContent.includes('Agreement: Sent');
  click('Mark Accepted');await wait();const accepted=document.body.textContent.includes('Agreement: Accepted');
  document.getElementById('result').textContent=JSON.stringify({draft,sent,accepted,declined,actions:writes.map(w=>w.action),confirmed:writes.filter(w=>w.action!=='generate').every(w=>w.confirmed),pdf:!![...document.querySelectorAll('a')].find(a=>a.textContent==='Open PDF'),overflow:document.documentElement.scrollWidth>innerWidth,confirmations:confirmations.length});
}catch(error){document.getElementById('result').textContent=JSON.stringify({error:error.message});}})();
</script></body></html>`;
fs.writeFileSync(path.join(folder,'index.html'),html);
for(const width of [390,1280]) test(`agreement UI actions and readable layout at ${width}px`,{skip:!fs.existsSync(chrome)},()=>{
  const run=spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--disable-extensions',`--user-data-dir=${path.join(folder,'profile-'+width)}`,`--window-size=${width},1100`,'--virtual-time-budget=2500','--dump-dom',`--screenshot=${path.join(folder,width+'.png')}`,pathToFileURL(path.join(folder,'index.html')).href+'?width='+width],{encoding:'utf8',timeout:30000,maxBuffer:5000000});
  assert.equal(run.status,0,run.stderr);
  const raw=run.stdout.match(/<pre id="result" hidden="">([^<]+)<\/pre>/)?.[1];assert.ok(raw,'fixture completed');
  const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(result.error,undefined);assert.equal(result.draft,true);assert.equal(result.sent,true);assert.equal(result.accepted,true);
  assert.equal(result.declined,true);assert.equal(result.confirmed,true);assert.equal(result.pdf,true);assert.equal(result.overflow,false);
  assert.deepEqual(result.actions,['generate','send','accept']);
  console.log('Agreement UI screenshot: '+path.join(folder,width+'.png'));
});
