import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const swc = require('next/dist/build/swc');
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';
await swc.loadBindings();
const sources = {};
for (const file of ['lib/actionReviewDraft.js','components/ActionReviewCard.js']) {
  sources[file] = (await swc.transform(fs.readFileSync(file, 'utf8'), { filename: file, styledJsx: {}, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } }, module: { type: 'commonjs' } })).code;
}
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'root-action-presentation-'));
const prose = 'Review invitation coverage with the organisation before selecting further support. '.repeat(12);
const entry = { id:'fixture', role:'assistant', content:`Action title: Review invitation coverage\nRationale: ${prose}\nExpected outcome: ${prose}\nSuccess measure: ${prose}` };
const scripts = ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js'].map(p => fs.readFileSync(path.join(path.dirname(require.resolve(p.split('/')[0] + '/package.json')), ...p.split('/').slice(1)), 'utf8')).join('\n');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:Arial;background:#edf2eb}*{box-sizing:border-box}</style><div id="root"></div><pre id="result" hidden></pre><script>${scripts}</script><script>
const modules={};
function require(name){if(name==='react')return React;if(name==='styled-jsx/style')return ({children})=>React.createElement('style',null,children);if(name.includes('actionReviewDraft'))return modules.draft;if(name.includes('corporateOutput'))return {saveReviewedAction:()=>{throw Error('No writes permitted')}};throw Error(name)}
{const module={exports:{}};const exports=module.exports;${sources['lib/actionReviewDraft.js']};modules.draft=module.exports;}
{const module={exports:{}};const exports=module.exports;${sources['components/ActionReviewCard.js']};modules.card=module.exports;}
ReactDOM.flushSync(()=>ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(modules.card.default,{entry:${JSON.stringify(entry)},access:{organisationId:'fixture'},onCancel(){},onSaved(){}})));
setTimeout(()=>{
const fields=[...document.querySelectorAll('.fields label')].map(label=>{
const parts=[...label.children], boxes=parts.map(p=>p.getBoundingClientRect()),control=label.querySelector('input,select,textarea');
return {label:parts[0].textContent,vertical:boxes.every((b,i)=>!i||b.top>=boxes[i-1].bottom+7),display:getComputedStyle(label).display,width:control.getBoundingClientRect().width,cell:label.getBoundingClientRect().width,readable:control.tagName!=='TEXTAREA'||control.scrollHeight<=control.clientHeight+1,height:control.clientHeight};});
const result={fields,columns:getComputedStyle(document.querySelector('.fields')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth}; parent.postMessage(result,'*');
},100);
</script>`;
fs.writeFileSync(path.join(fixture,'index.html'),html);
for(const width of [390,1200]) test(`compiled card has separate vertically spaced fields and readable prose in Chrome at ${width}px`,{skip:!fs.existsSync(chrome)},()=>{
 const outer=path.join(fixture,'outer-'+width+'.html');
 fs.writeFileSync(outer,`<iframe src="index.html" style="border:0;width:${width}px;height:1450px"></iframe><pre id="result" hidden></pre><script>onmessage=e=>document.getElementById('result').textContent=JSON.stringify(e.data)</script>`);
 const run=spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--disable-extensions',`--user-data-dir=${path.join(fixture,'profile-'+width)}`,`--window-size=${Math.max(800,width+40)},1500`,'--virtual-time-budget=1500','--dump-dom',`--screenshot=${path.join(fixture,width+'.png')}`,pathToFileURL(outer).href],{encoding:'utf8',timeout:30000,maxBuffer:4000000});
 assert.equal(run.status,0,run.stderr);
 const raw=run.stdout.match(/<pre id="result" hidden="">([^<]+)<\/pre>/)?.[1];assert.ok(raw,'browser measurement completed');
 const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(result.fields.length,10);assert.equal(result.overflow,false);assert.equal(result.columns,width<600?1:2);
 for(const field of result.fields){assert.equal(field.vertical,true,field.label);assert.equal(field.display,'flex',field.label);assert.ok(Math.abs(field.width-field.cell)<2,field.label);assert.equal(field.readable,true,field.label);}
 console.log('Rendered screenshot: '+path.join(fixture,width+'.png'));
});
