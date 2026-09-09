import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { evidenceBlocks, documentBlocks, pdfPresentationBlocks } from '../lib/corporateOutputPresentation.js';
import { prepareActionReview } from '../lib/actionReviewDraft.js';
const require=createRequire(import.meta.url), swc=require('next/dist/build/swc');
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE='1'; await swc.loadBindings();
const chrome=process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const safe={confidence:{status:'Evidence protected'},evidenceReviewed:{baselineCohort:'fewer than 5',matchedCohort:'fewer than 5'},baselineLevels:[{metric:'stress_score',mean:null,suppressed:true,contributors:'fewer than 5'}],matchedLongitudinalChange:[{metric:'stress_score',change:null,suppressed:true}],cautions:['No causal conclusions.']};
const reply={reply:'The evidence shows that nine out of ten recorded active workforce people have not been invited.\n\n1. **Increase invitation coverage**\n\n### Why this matters\nNine out of ten recorded active workforce people have not yet been invited to Root.\n\n### Intended outcome\nIncrease invitation coverage and create a stronger basis for measuring participation.\n\n### Measure of success\nInvitation coverage increases from the current recorded level.',documentHandoff:{reference:'fixture-reference',title:'Protected evidence',content:JSON.stringify(safe)},draftOrigin:'fixture-origin'};
test('same evidence presentation suppresses values and cohort details in preview and PDF',()=>{
 const malicious={...safe,baselineLevels:[{metric:'stress_score',mean:9,suppressed:true,contributors:3}]};
 for(const blocks of [evidenceBlocks(JSON.stringify(malicious)),pdfPresentationBlocks('Immutable protected evidence appendix\n'+JSON.stringify(malicious))]) {
  const text=blocks.map(x=>x.text).join('\n');assert.doesNotMatch(text,/\b9\b|\b3\b|fewer than 5|stress_score|\{/);assert.match(text,/unavailable for organisational interpretation/);
 }
 assert.equal(documentBlocks('## Heading\n1. **Review** this')[1].text,'Review this');
});
test('only explicit owner and unambiguous valid dates prefill',()=>{
 const draft=prepareActionReview({content:'Owner: Jordan\nStart date: 2026-09-10\nReview date: next week'});
 assert.equal(draft.owner,'Jordan');assert.equal(draft.start_date,'2026-09-10');assert.equal(draft.review_date,null);
 assert.equal(prepareActionReview({content:'Review date: 2026-02-31'}).review_date,null);
});
const files=['lib/evidenceCheckPresentation.js','lib/corporateOutputPresentation.js','lib/actionReviewDraft.js','lib/corporateOutput.js','components/CorporateDocumentPreview.js','components/CorporateOutputStyles.js','components/CorporateDocumentDraft.js','components/CorporateOutputActions.js','components/ActionReviewCard.js','app/hr-coach/page.js'];
let registrations='';
for(const file of files){
 let source=fs.readFileSync(file,'utf8');
 if(file.endsWith('page.js'))source=source.replace('[loading, setLoading] = useState(true)','[loading, setLoading] = useState(false)').replace('[hrApiAccess, setHRApiAccess] = useState(null)',"[hrApiAccess, setHRApiAccess] = useState({organisationId:'fixture',accessToken:'fixture'})");
 const code=(await swc.transform(source,{filename:file,styledJsx:{},jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}})).code;
 registrations+=`{const module={exports:{}};const exports=module.exports;const require=name=>resolve(${JSON.stringify(file)},name);${code};modules[${JSON.stringify(file)}]=module.exports;}\n`;
}
const scripts=['react','react-dom'].map(p=>fs.readFileSync(path.join(path.dirname(require.resolve(p+'/package.json')),'umd',p+'.development.js'),'utf8')).join('\n');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'root-output-journey-'));
fs.writeFileSync(path.join(directory,'page.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial}*{box-sizing:border-box}</style><div id="root"></div><script>${scripts}</script><script>
const modules={};function resolve(file,name){if(name==='react')return file.endsWith('page.js')?{...React,useEffect(){}}:React;if(name==='styled-jsx/style')return ({children})=>React.createElement('style',null,children);if(name.startsWith('.')){const parts=file.split('/');parts.pop();for(const part of name.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part);}return modules[parts.join('/')]||{__esModule:true,default:({children})=>children||null};}throw Error(name);}
${registrations}
let writes=0,resolveCheck;fetch=async(url,options)=>{if(url.startsWith('/api/organisation/document-drafts')&&JSON.parse(options.body).operation==='recheck')return new Promise(resolve=>{resolveCheck=claims=>resolve({ok:true,json:async()=>({claims})})});if(url!=='/api/organisation-coach'){writes++;throw Error('No side effects allowed');}return {json:async()=>(${JSON.stringify(reply)})};};
const click=label=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===label);if(!button)throw Error('Missing '+label);ReactDOM.flushSync(()=>button.click());};
ReactDOM.flushSync(()=>ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(modules['app/hr-coach/page.js'].default)));
(async()=>{try{
 const composer=document.querySelector('form textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(composer,'Please prepare an organisational recommendation.');composer.dispatchEvent(new Event('input',{bubbles:true}));
 await new Promise(r=>setTimeout(r,40));ReactDOM.flushSync(()=>composer.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await new Promise(r=>setTimeout(r,40));
 const controls=['Save as Action / Initiative','Protected evidence PDF','Create Document Draft'];for(const label of controls)if(![...document.querySelectorAll('button')].some(b=>b.textContent===label))throw Error('Missing '+label);
 click('Save as Action / Initiative');const action=document.querySelector('.action-review');if(!action)throw Error('Missing review');const actionFields=[...action.querySelectorAll('label')].every(label=>getComputedStyle(label).display==='flex'&&label.querySelector('input,textarea,select'));const actionRect=action.getBoundingClientRect();const actionTitle=action.querySelector('textarea');if(actionTitle.value!=='Increase invitation coverage')throw Error('Wrong concise title');const longTitle='Increase invitation coverage across the recorded workforce and review the organisation invitation process with the responsible team';Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(actionTitle,longTitle);actionTitle.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,30));if(actionTitle.scrollHeight>actionTitle.clientHeight+1||actionTitle.scrollWidth>actionTitle.clientWidth)throw Error('Title clipped');click('Cancel');if(document.querySelector('.action-review'))throw Error('Cancel did not close');
 click('Protected evidence PDF');const protectedText=document.querySelector('.output-actions form').textContent;if(/baselineLevels|fewer than 5|stress_score|"metric"/.test(protectedText))throw Error('Raw evidence exposed');
 click('Create Document Draft');const preview=document.querySelector('[aria-label="Document preview"]');if(!preview||/##|\\*\\*/.test(preview.textContent))throw Error('Raw Markdown in preview');
 click('Edit');const edit=document.querySelector('[aria-label="Edit document wording"] textarea');if(!edit||/##|\\*\\*/.test(edit.value))throw Error('Source editing only');
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(edit,'Revised invitation review');edit.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,30));
 click('Preview');if(!document.querySelector('[aria-label="Document preview"]').textContent.includes('Revised invitation review'))throw Error('Edited wording missing');const draft=document.querySelector('.document-draft');const buttons=[...document.querySelectorAll('.root-output button')];const styled=buttons.every(b=>parseFloat(getComputedStyle(b).borderRadius)>10);const composerBelow=composer.getBoundingClientRect().top>draft.getBoundingClientRect().bottom;
 click('Recheck against evidence');if(!document.body.textContent.includes('Checking this draft against Root'))throw Error('Missing loading state');if(![...document.querySelectorAll('button')].find(b=>b.textContent==='Checking evidence…')?.disabled)throw Error('Check button not disabled');
 resolveCheck(Array.from({length:6},()=>({status:'not_checked',text:'PRIVATE_HIDDEN_CLAIM'})));await new Promise(r=>setTimeout(r,30));if(!document.querySelector('.evidence-check')?.textContent.includes('Evidence check complete')||!document.querySelector('.evidence-check').textContent.includes('6 narrative statements'))throw Error('Missing completion summary');
 click('Recheck against evidence');resolveCheck([{status:'does_not_match_released_evidence',text:'PRIVATE_HIDDEN_CLAIM'},{status:'unavailable_for_interpretation',text:'PRIVATE_HIDDEN_CLAIM'}]);await new Promise(r=>setTimeout(r,30));if(!document.querySelector('.evidence-check.attention')?.textContent.includes('Evidence check needs your attention'))throw Error('Missing attention state');if(/Statement \d+:|PRIVATE_HIDDEN_CLAIM/.test(document.querySelector('.evidence-check').textContent))throw Error('Unsafe or meaningless feedback');
 document.querySelector('.evidence-check').scrollIntoView();
 parent.postMessage({ok:true,controls:controls.length,actionFields,writes,styled,composerBelow,overflow:document.documentElement.scrollWidth>innerWidth,outputWidth:document.querySelector('.output-actions').getBoundingClientRect().width,actionWidth:actionRect.width},'*');
}catch(e){parent.postMessage({error:e.message},'*');}})();
</script>`);
for(const width of [390,1200])test(`actual typed HR Coach response exposes three reviewed workflows in Chrome at ${width}px`,{skip:!fs.existsSync(chrome)},()=>{
 const outer=path.join(directory,width+'.html');fs.writeFileSync(outer,`<iframe src="page.html" style="border:0;width:${width}px;height:1450px"></iframe><pre id="result" hidden></pre><script>onmessage=e=>document.getElementById('result').textContent=JSON.stringify(e.data)</script>`);
 const run=spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox',`--user-data-dir=${path.join(directory,'profile'+width)}`,`--window-size=${Math.max(width+40,800)},1500`,'--virtual-time-budget=2500','--dump-dom',`--screenshot=${path.join(directory,width+'.png')}`,pathToFileURL(outer).href],{encoding:'utf8',timeout:30000,maxBuffer:4000000});
 assert.equal(run.status,0);const match=run.stdout.match(/<pre id="result" hidden="">([^<]+)<\/pre>/);assert.ok(match,'browser returned result');const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));assert.equal(result.error,undefined,result.error);assert.equal(result.controls,3);assert.ok(result.outputWidth>=250,'usable response width');assert.equal(result.actionFields,true);assert.equal(result.writes,0);assert.equal(result.styled,true);assert.equal(result.composerBelow,true);assert.equal(result.overflow,false);console.log(path.join(directory,width+'.png'));
});
