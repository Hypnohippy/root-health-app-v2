import assert from "node:assert/strict";
import test from "node:test";
import { introducerSignerMatchesTerms } from "../lib/introducerSignerIdentity.js";
import { AUTHORITY_TEXT } from "../lib/introducerAgreementConsent.js";

const terms={contact_name:"David Test",introducer_name:"Root Health Fresh Agreement Test"};
const rep={full_name:"Brian Smith",role:"Director",organisation:"Root Health Fresh Agreement Test",authority:true,authority_text:AUTHORITY_TEXT,confirmed:true};

test("named contact is recognised",()=>{
  assert.equal(introducerSignerMatchesTerms(terms,{full_name:"  DAVID   Test  "}),true);
});
test("director with matching frozen organisation and explicit authority may sign",()=>{
  assert.equal(introducerSignerMatchesTerms(terms,rep),true);
});
test("representative requires matching organisation, declared role, authority and confirmation",()=>{
  for (const bad of [
    {...rep,organisation:"Unrelated Company"},
    {...rep,organisation:""},
    {...rep,role:""},
    {...rep,authority:false},
    {...rep,authority_text:null},
    {...rep,confirmed:false},
    {full_name:"Brian Smith",role:"Director"},
    {...rep,full_name:""},
  ]) assert.equal(introducerSignerMatchesTerms(terms,bad),false);
});
test("anonymous or empty frozen contact is always rejected",()=>{
  assert.equal(introducerSignerMatchesTerms({...terms,contact_name:""},rep),false);
});
