import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareActionReview } from '../lib/actionReviewDraft.js';
import { evidenceBlocks } from '../lib/corporateOutputPresentation.js';
import { renderCorporateDocument } from '../lib/corporateDocumentPdf.js';
import { createCorporateDocumentHandoff, createCorporateDocumentHandler } from '../lib/corporateDocumentServer.js';
import { PDFDocument } from 'pdf-lib';
const metrics=['stress_score','burnout_score','sleep_score','recovery_score','mood_score','focus_score'];
const protectedData={baselineLevels:metrics.map(metric=>({metric,mean:999,contributors:3,suppressed:true})),matchedLongitudinalChange:metrics.map(metric=>({metric,change:999,contributors:3,suppressed:true})),cautions:['No causal conclusions; small cohorts are suppressed.']};
test('numbered and bulleted bold action headings beat introductory reasoning without accepting arbitrary prose',()=>{
 for(const heading of ['1. **Increase Invitation Coverage**','- **Increase Invitation Coverage**','2) __Increase Invitation Coverage__: review the process.'])assert.equal(prepareActionReview({content:'The evidence shows limited invitations.\n'+heading}).title,'Increase Invitation Coverage');
 assert.equal(prepareActionReview({content:'- Increase the percentage somehow because this might help.'}).title,'Organisation action');
});
test('fully suppressed evidence is consolidated; mixed baseline and change remain distinct',()=>{
 const text=evidenceBlocks(JSON.stringify(protectedData)).map(x=>x.text).join('\n');assert.match(text,/Protected wellbeing evidence/);assert.doesNotMatch(text,/999|contributors|Stress:|Recovery:/);
 const mixed=structuredClone(protectedData);mixed.baselineLevels[0]={metric:'stress_score',mean:6,contributors:7,suppressed:false};
 const result=evidenceBlocks(JSON.stringify(mixed)).map(x=>x.text).join('\n');assert.match(result,/Recorded baseline levels/);assert.match(result,/Stress: 6 \/ 10/);assert.match(result,/Matched change over time/);assert.doesNotMatch(result,/999|3 contributors/);
});
test('organisation name comes only from authorised evidence, outside the unchanged signed document',async()=>{
 const evidence={organisation:{id:'org',name:'Trusted Organisation'},members:[],assessments:[]},key='fixture-key';
 const handoff=createCorporateDocumentHandoff({evidence,userId:'admin',key});let seen;
 const handler=createCorporateDocumentHandler({authorise:async()=>({organisationId:'org',user:{id:'admin'}}),loadEvidence:async()=>evidence,getSigningKey:()=>key,render:async(document,branding)=>{seen={document,branding};return new Uint8Array([1]);}});
 const response=await handler(new Request('https://fixture.test?organisation_id=org',{method:'POST',body:JSON.stringify({reference:handoff.reference,confirmed:true})}));assert.equal(response.status,200);assert.equal(seen.branding.organisationName,'Trusted Organisation');assert.equal(seen.document.content,handoff.content);assert.equal(seen.branding.logo,undefined);
});
test('existing renderer handles absent organisation logo, long names and multi-page reports',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'root-evidence-pdf-'));
 const suppressed=await renderCorporateDocument({title:'Root protected organisational evidence',content:JSON.stringify(protectedData)},{organisationName:'The Regional Partnership for Workforce Development, Education and Community Services across Northern and Central Districts'});
 fs.writeFileSync(path.join(directory,'protected.pdf'),suppressed);assert.ok((await PDFDocument.load(suppressed)).getPageCount()>=1);
 const mixed=structuredClone(protectedData);mixed.baselineLevels[0]={metric:'stress_score',mean:6,suppressed:false,contributors:7};mixed.cautions=Array.from({length:24},(_,i)=>`Evidence limitation ${i+1}: Recorded observations provide context only. They do not establish intervention effectiveness or organisation-wide causal conclusions.`);
 const multiple=await renderCorporateDocument({title:'Root protected organisational evidence',content:JSON.stringify(mixed)});
 fs.writeFileSync(path.join(directory,'multiple.pdf'),multiple);assert.ok((await PDFDocument.load(multiple)).getPageCount()>1);console.log('PDF visual fixtures: '+directory);
});
