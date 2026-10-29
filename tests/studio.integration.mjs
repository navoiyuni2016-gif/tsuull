import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {database} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {passwordHash} from '../server/auth.mjs';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Alohida *_test baza kerak.');
const pool=database(url),run=randomBytes(5).toString('hex').toUpperCase(),password=randomBytes(20).toString('hex'),origin='http://localhost:8088';
const accounts={},ids={};let server,base,model,modelCalls=0,modelBad=false;
async function call(path,{as='ADMIN',method='GET',body}={}){
 const a=accounts[as];const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(a?.cookie?{Cookie:a.cookie,'X-CSRF-Token':a.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,data:await r.json(),headers:r.headers};
}
async function login(as){const a=accounts[as];const r=await call('/login',{as:'none',method:'POST',body:{email:a.email,password}});assert.equal(r.status,200);a.cookie=r.headers.get('set-cookie').split(';')[0];a.csrf=r.data.csrf;a.id=r.data.user.id;}
async function create(module,data){const r=await call('/records/'+module,{method:'POST',body:{data}});assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
async function flow(record,action){const r=await call('/records/'+record.id+'/workflow',{as:action==='submit'?'ADMIN':'APPROVER',method:'POST',body:{action,revision:record.revision,reason:'Isolated studio fixture check'}});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
async function approve(r){return flow(await flow(r,'submit'),'approve');}
async function studio(){const r=await call('/curricula/'+ids.plan.id+'/studio');assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
const parameters={hoursPerCredit:'30',contactBasisPoints:4000,lectureBasisPoints:5000,practiceBasisPoints:5000,seminarBasisPoints:0,labBasisPoints:0,individualBasisPoints:0,practiceGroupMax:25,lectureStreamMax:100,seminarGroupMax:25,labGroupMax:15,individualUnit:'PER_STUDENT',roundingPlaces:0,roundingMode:'HALF_UP',remainderActivity:'practice',teacherAnnualLimit:'900',termCreditLimit:'6',programCredits:'6',termCount:2};
before(async()=>{
 await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await pool.query(await readFile(new URL('../server/upgrade.sql',import.meta.url),'utf8'));
 for(const role of ['ADMIN','APPROVER','OPERATOR','AUDITOR']){accounts[role]={email:role.toLowerCase()+run.toLowerCase()+'@studio.invalid'};await pool.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4)',[accounts[role].email,'Studio fixture '+role,role,await passwordHash(password)]);}
 model=createServer(async(req,res)=>{assert.equal(req.url,'/api/chat');modelCalls++;let raw='';for await(const chunk of req)raw+=chunk;const request=JSON.parse(raw),context=JSON.parse(request.messages[1].content);assert.equal(request.stream,false);assert.equal(request.model,'fixture-model');assert.ok(!raw.includes('@studio.invalid'));const subjects=context.subjects;const items=subjects.map(s=>({subject:s.id,semester:s.prerequisites.length?2:1}));if(modelBad)items[0].subject='invented';res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify({items,explanation:'Sinov uchun tavsiya'})}}));});
 model.listen(0,'127.0.0.1');await new Promise(r=>model.once('listening',r));process.env.LOCAL_AI_URL='http://127.0.0.1:'+model.address().port;process.env.LOCAL_AI_MODEL='fixture-model';
 server=createApp(pool,{origin}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 for(const role of Object.keys(accounts))await login(role);
 ids.faculty=await create('faculties',{code:'SF'+run,name:'Studio faculty'});ids.department=await create('departments',{code:'SD'+run,name:'Studio department',faculty:ids.faculty.id});ids.year=await create('years',{code:'SY'+run,name:'Fixture 2026/2027',start:'2026-09-01',end:'2027-08-31'});
 ids.rule=await approve(await create('rules',{code:'SR'+run,name:'Fixture rule only',legalBasis:'Synthetic fixture',effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31',scope:run,parameters:'TEST ONLY',calculation:parameters,department:ids.department.id,year:ids.year.id}));
 ids.a=await approve(await create('subjects',{code:'SA'+run,name:'First fixture',department:ids.department.id,credits:'2',category:'Majburiy',language:'O‘zbek'}));
 ids.b=await approve(await create('subjects',{code:'SB'+run,name:'Second fixture',department:ids.department.id,credits:'4',category:'Majburiy',language:'O‘zbek',prerequisiteCodes:ids.a.code}));
 ids.plan=await create('curricula',{code:'SP'+run,name:'Studio fixture plan',year:ids.year.id,department:ids.department.id,level:'Bakalavriat',mode:'Kunduzgi',source:'STUDIO-FIXTURE',rule:ids.rule.id,onDate:'2026-10-29'});
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(model)await new Promise(r=>model.close(r));await pool.end();delete process.env.LOCAL_AI_URL;delete process.env.LOCAL_AI_MODEL;});
const items=()=>[{subject:ids.a.id,semester:1},{subject:ids.b.id,semester:2}];
test('native preview never writes; draft and complete saves preserve exact totals and reject stale updates',async()=>{
 let x=await studio();assert.equal(x.ai.configured,true);
 let r=await call('/curricula/'+ids.plan.id+'/studio/preview',{method:'POST',body:{items:items()}});assert.equal(r.status,200);assert.equal(r.data.totals.totalStudentHours,'180');assert.equal(r.data.ready,true);assert.equal((await studio()).items.length,0);
 r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items().slice(0,1)}});assert.equal(r.status,200);assert.equal(r.data.analysis.ready,false);
 r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}});assert.equal(r.status,409);
 x=await studio();r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}});assert.equal(r.status,200);assert.equal(r.data.analysis.ready,true);assert.equal((await studio()).items.length,2);
});
test('native remove keeps immutable history; re-add is allowed and generic edits invalidate the grid version',async()=>{
 let x=await studio();const old=(await pool.query("SELECT * FROM portal.records WHERE module='plan_items' AND data->>'curriculum'=$1 AND data->>'subject'=$2",[ids.plan.id,ids.b.id])).rows[0];
 let r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items().slice(0,1)}});assert.equal(r.status,200);
 const removed=(await pool.query('SELECT * FROM portal.records WHERE id=$1',[old.id])).rows[0];assert.equal(removed.data._excluded,true);assert.equal((await call('/records/'+old.id+'/versions')).status,200);assert.ok((await call('/records')).data.every(r=>r.id!==old.id));assert.equal((await call('/records/'+old.id,{method:'PUT',body:{revision:removed.revision,data:old.data}})).status,409);
 x=await studio();r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}});assert.equal(r.status,200);
 x=await studio();const active=(await pool.query("SELECT * FROM portal.records WHERE module='plan_items' AND data->>'curriculum'=$1 AND COALESCE(data->>'_excluded','false') <> 'true'",[ids.plan.id])).rows[0];
 r=await call('/records/'+active.id,{method:'PUT',body:{revision:active.revision,data:active.data}});assert.equal(r.status,200);
 assert.equal((await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}})).status,409);
});
test('local model contract returns audited advice without business writes; invalid advice is rejected',async()=>{
 const x=await studio(),before=(await pool.query('SELECT count(*) FROM portal.records')).rows[0].count;
 let r=await call('/curricula/'+ids.plan.id+'/ai-suggest',{method:'POST',body:{subjectIds:items().map(i=>i.subject),instruction:'Semestrlar bo‘yicha joylashtiring'}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.advisoryOnly,true);assert.ok(r.data.suggestionId);assert.equal((await pool.query('SELECT count(*) FROM portal.records')).rows[0].count,before);
 const suggestion=r.data;const entry=(await pool.query('SELECT * FROM portal.audit WHERE id=$1',[suggestion.suggestionId])).rows[0];assert.equal(entry.details.model,'fixture-model');
 modelBad=true;r=await call('/curricula/'+ids.plan.id+'/ai-suggest',{method:'POST',body:{subjectIds:items().map(i=>i.subject)}});assert.equal(r.status,502);assert.equal((await studio()).version,x.version);modelBad=false;
 r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:suggestion.items,suggestionId:suggestion.suggestionId}});assert.equal(r.status,200);
 delete process.env.LOCAL_AI_MODEL;r=await call('/curricula/'+ids.plan.id+'/ai-suggest',{method:'POST',body:{subjectIds:items().map(i=>i.subject)}});assert.equal(r.status,503);process.env.LOCAL_AI_MODEL='fixture-model';
});
test('permission checks block read-only and other-department calls before contacting a model',async()=>{
 const x=await studio();assert.equal((await call('/curricula/'+ids.plan.id+'/studio',{as:'AUDITOR',method:'PUT',body:{version:x.version,items:items()}})).status,403);
 const other=await create('departments',{code:'SX'+run,name:'Other fixture department',faculty:ids.faculty.id});
 let r=await call('/users/'+accounts.OPERATOR.id+'/access',{method:'PUT',body:{role:'OPERATOR',active:true,department_id:other.id}});assert.equal(r.status,200);await login('OPERATOR');
 const count=modelCalls;
 for(const [path,method,body] of [['/studio','GET',undefined],['/studio','PUT',{version:x.version,items:items()}],['/ai-suggest','POST',{subjectIds:items().map(i=>i.subject)}]])assert.equal((await call('/curricula/'+ids.plan.id+path,{as:'OPERATOR',method,body})).status,403);
 assert.equal(modelCalls,count);
 const outsider=await approve(await create('subjects',{code:'SO'+run,name:'Other subject',department:other.id,credits:'6',category:'Majburiy',language:'O‘zbek'}));
 r=await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:[{subject:outsider.id,semester:1}]}});assert.equal(r.status,422);assert.equal((await studio()).version,x.version);
});
test('submitted and approved plans block both native and generic row edits; snapshots exclude removed history',async()=>{
 let x=await studio();ids.plan=await flow(x.parent,'submit');const old=(await pool.query("SELECT * FROM portal.records WHERE module='plan_items' AND data->>'curriculum'=$1 AND COALESCE(data->>'_excluded','false') <> 'true'",[ids.plan.id])).rows[0];
 assert.equal((await call('/records/'+old.id,{method:'PUT',body:{revision:old.revision,data:old.data}})).status,409);
 assert.equal((await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}})).status,409);
 ids.plan=await flow(ids.plan,'approve');assert.equal(ids.plan.data._approval.totalCredits,'6');assert.equal(ids.plan.data._approval.items.length,2);
 assert.equal((await call('/curricula/'+ids.plan.id+'/studio',{method:'PUT',body:{version:x.version,items:items()}})).status,409);
});
test('locked year rejects native save and AI request before any model work',async()=>{
 const draft=await create('curricula',{...ids.plan.data,code:'SL'+run});const version=(await call('/curricula/'+draft.id+'/studio')).data.version;
 ids.year=await approve(ids.year);const r=await call('/years/'+ids.year.id+'/lock',{as:'APPROVER',method:'POST',body:{reason:'Isolated fixture year is complete'}});assert.equal(r.status,200);
 const before=modelCalls;
 assert.equal((await call('/curricula/'+draft.id+'/studio',{method:'PUT',body:{version,items:items()}})).status,409);
 assert.equal((await call('/curricula/'+draft.id+'/ai-suggest',{method:'POST',body:{subjectIds:items().map(i=>i.subject)}})).status,409);
 assert.equal(modelCalls,before);
 const clone=(await call('/records/'+ids.plan.id+'/revision',{method:'POST',body:{code:'SV'+run}}));assert.equal(clone.status,409);
});
