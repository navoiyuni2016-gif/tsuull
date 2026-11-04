import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {database} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {passwordHash} from '../server/auth.mjs';
const url=process.env.TEST_DATABASE_URL;if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Isolated *_test database required');
const pool=database(url),origin='http://localhost:8088',run=randomBytes(5).toString('hex').toUpperCase(),password=randomBytes(20).toString('hex'),accounts={};
let server,base,faculty,department,otherDepartment,year,subject,teacher,group,rule,policy,load,lesson,oldPlan,newPlan;
async function call(path,{role='ADMIN',method='GET',body,raw=false}={}){
 const a=accounts[role],r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(a?{Cookie:a.cookie,'X-CSRF-Token':a.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,data:raw?await r.text():await r.json()};
}
async function create(module,data,role='ADMIN'){const r=await call('/records/'+module,{role,method:'POST',body:{data}});assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
async function approve(record){
 let r=await call('/records/'+record.id+'/workflow',{method:'POST',body:{action:'submit',revision:record.revision,reason:'Synthetic controls fixture submission'}});assert.equal(r.status,200,JSON.stringify(r.data));
 r=await call('/records/'+record.id+'/workflow',{role:'APPROVER',method:'POST',body:{action:'approve',revision:r.data.revision,reason:'Synthetic independent academic review'}});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;
}
const code=s=>s+run;
const parameters={hoursPerCredit:'30',contactBasisPoints:4000,lectureBasisPoints:5000,practiceBasisPoints:5000,seminarBasisPoints:0,labBasisPoints:0,individualBasisPoints:0,practiceGroupMax:25,lectureStreamMax:100,seminarGroupMax:25,labGroupMax:15,individualUnit:'PER_STUDENT',roundingPlaces:2,roundingMode:'HALF_UP',remainderActivity:'practice',teacherAnnualLimit:'900',termCreditLimit:'30',programCredits:'6',termCount:2};
before(async()=>{
 await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await pool.query(await readFile(new URL('../server/upgrade.sql',import.meta.url),'utf8'));
 server=createApp(pool,{origin}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 for(const role of ['ADMIN','OPERATOR','APPROVER','AUDITOR']){
  const email=role.toLowerCase()+run.toLowerCase()+'@controls.invalid',u=(await pool.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id',[email,'Synthetic controls '+role,role,await passwordHash(password)])).rows[0];
  const r=await fetch(base+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200);const me=await r.json();accounts[role]={id:u.id,cookie:r.headers.get('set-cookie').split(';')[0],csrf:me.csrf};
 }
 faculty=await create('faculties',{code:code('F'),name:'Synthetic controls faculty'});
 department=await create('departments',{code:code('D'),name:'Synthetic controls department',faculty:faculty.id});
 otherDepartment=await create('departments',{code:code('OD'),name:'Other synthetic department',faculty:faculty.id});
 year=await create('years',{code:code('Y'),name:'Synthetic controls 2026/2027',start:'2026-09-01',end:'2027-08-31'});
});
after(async()=>{
 if(process.env.CONTROLS_UI_FIXTURE){
  const uiTeacher=await approve(await create('teachers',{code:code('UIT'),name:'Synthetic UI controls teacher',department:department.id,qualification:'Synthetic',language:'O‘zbek',competenceCodes:subject.code}));
  const uiLoad=await approve(await create('workloads',{code:code('UIW'),name:'Synthetic UI 3-hour load',year:year.id,subject:subject.id,teacher:uiTeacher.id,group:group.id,activity:'Ma’ruza',hours:'3',source:'SYNTHETIC',rule:rule.id,onDate:'2026-11-04'}));
  const row=(await pool.query("SELECT data FROM portal.records WHERE module='plan_items' AND data->>'curriculum'=$1",[newPlan.id])).rows[0];
  await writeFile(process.env.CONTROLS_UI_FIXTURE,JSON.stringify({adminEmail:'admin'+run.toLowerCase()+'@controls.invalid',reviewerEmail:'approver'+run.toLowerCase()+'@controls.invalid',password,yearId:year.id,departmentId:department.id,groupId:group.id,teacherId:uiTeacher.id,loadId:uiLoad.id,oldPlanId:oldPlan.id,newSubjectId:row.data.subject,ruleId:rule.id,run},null,2));
  await chmod(process.env.CONTROLS_UI_FIXTURE,0o600);
 }
 await new Promise(r=>server.close(r));await pool.end();
});
test('control endpoints require authentication and return an empty scoped report without assuming data',async()=>{
 assert.equal((await fetch(base+'/api/controls/schedule/reconcile')).status,401);
 assert.equal((await call('/controls/schedule/reconcile?year='+year.id)).data.rows.length,0);
 assert.equal((await call('/controls/plans/compare?left=x&right=y')).status,400);
});
test('calendar policies are administrator drafts, require a year and independent academic approval',async()=>{
 const draft={code:code('CLOCK'),name:'SYNTHETIC ONLY period rule',legalBasis:'TEST FIXTURE ONLY',parameters:'TEST ONLY',scope:code('CLOCK'),year:year.id,effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31',scheduleCalculation:{periods:[{start:'08:00',end:'09:20',academicHours:'2'},{start:'09:30',end:'10:50',academicHours:'2'}]}};
 assert.equal((await call('/records/rules',{role:'OPERATOR',method:'POST',body:{data:draft}})).status,403);
 assert.equal((await call('/records/rules',{method:'POST',body:{data:{...draft,year:''}}})).status,400);
 policy=await create('rules',draft);
 assert.equal((await call('/records/'+policy.id+'/workflow',{method:'POST',body:{action:'approve',revision:policy.revision,reason:'Self approval must fail'}})).status,403);
 policy=await approve(policy);assert.equal(policy.data._approval.scheduleCalculation.periods[0].academicHours,'2');
 rule=await approve(await create('rules',{code:code('R'),name:'SYNTHETIC academic rule',legalBasis:'TEST ONLY',parameters:'TEST ONLY',scope:code('ACADEMIC'),year:year.id,department:department.id,effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31',calculation:parameters}));
 subject=await approve(await create('subjects',{code:code('S'),name:'Saqlash Sh Ch <b>literal</b>',department:department.id,credits:'6',category:'Majburiy',language:'O‘zbek'}));
 teacher=await approve(await create('teachers',{code:code('T'),name:'Synthetic controls teacher',department:department.id,qualification:'Synthetic',language:'O‘zbek',competenceCodes:subject.code}));
 group=await approve(await create('groups',{code:code('G'),name:'Synthetic controls group',year:year.id,department:department.id,students:25,kind:'Akademik guruh'}));
 load=await approve(await create('workloads',{code:code('W'),name:'Synthetic 3-hour allocation',year:year.id,subject:subject.id,teacher:teacher.id,group:group.id,activity:'Ma’ruza',hours:'3',source:'SYNTHETIC',rule:rule.id,onDate:'2026-11-04'}));
});
test('schedule computes only approved complete periods, preserves sources and separates pending, approved and actual hours',async()=>{
 const data={code:code('SCH'),name:'Synthetic lesson',group:group.id,teacher:teacher.id,date:'2026-11-04',start:'08:00',end:'09:20',room:code('ROOM'),capacity:30,workload:load.id,timeRule:policy.id,academicHours:'999'};
 let r=await call('/controls/schedule/preview',{method:'POST',body:data});assert.equal(r.status,200);assert.equal(r.data.academicHours,'2');
 assert.equal((await call('/controls/schedule/preview',{method:'POST',body:{...data,start:'09:00',end:'10:20'}})).status,400);
 assert.equal((await call('/records/schedule',{method:'POST',body:{data:{...data,date:'2028-11-04'}}})).status,400);
 lesson=await create('schedule',data);assert.equal(lesson.data.academicHours,'2');
 r=await call('/controls/schedule/reconcile?year='+year.id);assert.equal(r.data.totals.scheduledHours,'0');assert.equal(r.data.totals.pendingHours,'2');
 lesson=await approve(lesson);assert.equal(lesson.data._approval.academicHours,'2');
 r=await call('/controls/schedule/reconcile?year='+year.id);assert.equal(r.data.totals.scheduledHours,'2');assert.equal(r.data.totals.gapHours,'1');assert.equal(r.data.totals.verifiedHours,'0');
 await approve(await create('schedule',{...data,code:code('SCH2'),date:'2026-11-05'}));
 await approve(await create('schedule',{...data,code:code('LEGACY'),date:'2026-11-06',workload:'',timeRule:'',academicHours:''}));
 r=await call('/controls/schedule/reconcile?year='+year.id);assert.equal(r.data.totals.scheduledHours,'4');assert.equal(r.data.totals.excessHours,'1');assert.equal(r.data.diagnostics.length,1);
 assert.equal((await pool.query("SELECT count(*) FROM portal.records WHERE module='actuals' AND data->>'workload'=$1",[load.id])).rows[0].count,'0');
});
test('an approved schedule revision replaces its ancestor in sums and leaves immutable originals untouched',async()=>{
 const before=JSON.stringify(lesson.data);
 let r=await call('/records/'+lesson.id+'/revision',{method:'POST',body:{code:code('SCHREV'),reason:'Synthetic schedule revision'}});assert.equal(r.status,201,JSON.stringify(r.data));let revised=r.data;
 r=await call('/records/'+revised.id,{method:'PUT',body:{revision:revised.revision,data:{...revised.data,name:'Synthetic revised lesson',capacity:31}}});assert.equal(r.status,200,JSON.stringify(r.data));revised=await approve(r.data);
 assert.equal(revised.data._parent.id,lesson.id);
 r=await call('/controls/schedule/reconcile?year='+year.id);assert.equal(r.data.totals.scheduledHours,'4');assert.equal(r.data.supersededCount,1);
 assert.equal(JSON.stringify((await pool.query('SELECT data FROM portal.records WHERE id=$1',[lesson.id])).rows[0].data),before);
});
test('plan comparison uses approved frozen rows and new course lineage, showing exact deltas, real editor and reason',async()=>{
 oldPlan=await create('curricula',{code:code('PLAN'),name:'Synthetic old plan',year:year.id,department:department.id,level:'Bakalavriat',mode:'Kunduzgi',source:'SYNTHETIC',rule:rule.id,onDate:'2026-11-04'});
 await create('plan_items',{code:code('PI'),name:subject.data.name,curriculum:oldPlan.id,subject:subject.id,semester:1});oldPlan=await approve(oldPlan);
 let r=await call('/records/'+subject.id+'/revision',{method:'POST',body:{code:code('SREV')}});assert.equal(r.status,201);let newerSubject=r.data;
 r=await call('/records/'+newerSubject.id,{method:'PUT',body:{revision:newerSubject.revision,data:{...newerSubject.data,credits:'3',name:'New Sh Ch <literal>'}}});assert.equal(r.status,200);newerSubject=await approve(r.data);
 r=await call('/records/'+oldPlan.id+'/revision',{method:'POST',body:{code:code('PLANREV'),reason:'Synthetic new curriculum version'}});assert.equal(r.status,201);newPlan=r.data;
 const item=(await pool.query("SELECT * FROM portal.records WHERE module='plan_items' AND data->>'curriculum'=$1",[newPlan.id])).rows[0];
 r=await call('/records/'+item.id,{role:'OPERATOR',method:'PUT',body:{revision:item.revision,data:{...item.data,subject:newerSubject.id,semester:2},reason:'Synthetic semester and credit change'}});assert.equal(r.status,200);
 r=await call('/controls/plans/compare?'+new URLSearchParams({left:oldPlan.id,right:newPlan.id}));assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.summary.CHANGED,1);assert.equal(r.data.deltas.credits,'-3');assert.equal(r.data.deltas.totalStudentHours,'-90');
 assert.equal(r.data.left.rows[0].credits,'6');assert.equal(r.data.left.rows[0].semester,1);assert.equal(r.data.right.rows[0].semester,2);
 assert.equal(r.data.right.metadata.lastChange.actor,'Synthetic controls OPERATOR');assert.equal(r.data.right.metadata.lastChange.reason,'Synthetic semester and credit change');
 r=await call('/controls/plans/compare?'+new URLSearchParams({left:oldPlan.id,right:newPlan.id,format:'html',lang:'en'}),{raw:true});assert.equal(r.status,200);assert.ok(r.data.includes('&lt;literal&gt;'));
});
test('controls enforce current academic scopes and all referenced sources for reads and writes',async()=>{
 await pool.query('UPDATE portal.users SET department_id=$1 WHERE id=$2',[otherDepartment.id,accounts.OPERATOR.id]);
 assert.equal((await call('/controls/plans/compare?'+new URLSearchParams({left:oldPlan.id,right:newPlan.id}),{role:'OPERATOR'})).status,404);
 const r=await call('/controls/schedule/reconcile?year='+year.id,{role:'OPERATOR'});assert.equal(r.status,200);assert.equal(r.data.rows.length,0);assert.equal(r.data.diagnostics.length,0);
 assert.equal((await call('/controls/schedule/preview',{role:'OPERATOR',method:'POST',body:lesson.data})).status,404);
 assert.equal((await call('/controls/schedule/reconcile?teacher='+teacher.id,{role:'OPERATOR'})).status,404);
 assert.equal((await call('/controls/schedule/reconcile?year='+year.id+'&format=html&lang=ru',{raw:true})).status,200);
});
