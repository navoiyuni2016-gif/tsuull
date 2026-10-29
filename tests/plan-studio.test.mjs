import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePlan} from '../server/plan-studio.mjs';
import {validateAiProposal, localAiConfig} from '../server/local-ai.mjs';
const parameters={hoursPerCredit:'30',contactBasisPoints:4000,lectureBasisPoints:5000,practiceBasisPoints:5000,seminarBasisPoints:0,labBasisPoints:0,individualBasisPoints:0,practiceGroupMax:25,lectureStreamMax:100,seminarGroupMax:25,labGroupMax:15,individualUnit:'PER_STUDENT',roundingPlaces:0,roundingMode:'HALF_UP',remainderActivity:'practice',teacherAnnualLimit:'900',termCreditLimit:'6',programCredits:'6',termCount:2};
const rule={id:'rule',revision:3,status:'APPROVED',author_id:'author',approved_by:'reviewer',data:{calculation:parameters,legalBasis:'SYNTHETIC FIXTURE',effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31'}};
const subjects=[{id:'a',code:'A',revision:3,status:'APPROVED',data:{name:'First',credits:'2',prerequisites:[]}},{id:'b',code:'B',revision:3,status:'APPROVED',data:{name:'Second',credits:'4',prerequisites:['a']}}];
test('studio computes exact student hours, balances semesters and explains incomplete drafts',()=>{
 const r=analyzePlan([{subject:'a',semester:1},{subject:'b',semester:2}],subjects,rule,'2026-10-29');
 assert.equal(r.ready,true);assert.equal(r.totals.credits,'6');assert.equal(r.totals.totalStudentHours,'180');assert.equal(r.totals.contactHoursPerStudent,'72');assert.equal(r.totals.independentHoursPerStudent,'108');assert.deepEqual(r.terms,{'1':'2','2':'4'});
 assert.equal(analyzePlan([{subject:'a',semester:1}],subjects,rule,'2026-10-29').ready,false);
 assert.equal(analyzePlan([{subject:'a',semester:2},{subject:'b',semester:1}],subjects,rule,'2026-10-29').ready,false);
});
test('AI proposal cannot invent, omit or duplicate subjects, break prerequisites or return prose',()=>{
 const items=[{subject:'a',semester:1},{subject:'b',semester:2}];
 assert.equal(validateAiProposal({items,explanation:'Tavsiya'},subjects,parameters).items.length,2);
 for(const bad of [[items[0]], [...items,items[0]], [{subject:'unknown',semester:1},items[1]], [{subject:'a',semester:2},{subject:'b',semester:1}]])assert.throws(()=>validateAiProposal({items:bad,explanation:''},subjects,parameters));
 assert.throws(()=>validateAiProposal('unstructured text',subjects,parameters));
});
test('local AI is disabled without explicit model and rejects public or credentialed endpoints',()=>{
 assert.equal(localAiConfig({}).configured,false);
 assert.equal(localAiConfig({LOCAL_AI_URL:'http://ollama:11434',LOCAL_AI_MODEL:'test-model'}).configured,true);
 for(const url of ['https://api.openai.com','http://example.com','http://user:secret@172.20.0.51:11434','http://172.20.0.51:11434/other'])assert.throws(()=>localAiConfig({LOCAL_AI_URL:url,LOCAL_AI_MODEL:'test-model'}));
});
