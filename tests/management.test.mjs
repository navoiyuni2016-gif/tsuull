import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {database} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {passwordHash} from '../server/auth.mjs';
const url=process.env.TEST_DATABASE_URL;if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Isolated *_test database required');
const pool=database(url),origin='http://localhost:8088',run=randomBytes(5).toString('hex'),pass=randomBytes(20).toString('hex'),accounts={};
let server,base,simId;
async function start(){server=createApp(pool,{origin}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;}
async function call(path,{role='ADMIN',method='GET',body,headers={},raw=false}={}){const a=accounts[role];const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(a?{Cookie:a.cookie,'X-CSRF-Token':a.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,headers:r.headers,data:raw?Buffer.from(await r.arrayBuffer()):await r.json()};}
const input={credits:'6',hoursPerCredit:'30',groups:3,lectureStreams:1,contactBasisPoints:4000,lectureBasisPoints:5000};
before(async()=>{
 await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await pool.query(await readFile(new URL('../server/upgrade.sql',import.meta.url),'utf8'));
 await start();for(const role of ['ADMIN','OPERATOR','APPROVER','AUDITOR']){
  const email=role.toLowerCase()+run+'@management.invalid';const u=(await pool.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id',[email,'Synthetic management '+role,role,await passwordHash(pass)])).rows[0];
  const r=await fetch(base+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});assert.equal(r.status,200);const session=await r.json();accounts[role]={id:u.id,cookie:r.headers.get('set-cookie').split(';')[0],csrf:session.csrf};
 }
});
after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
test('successful simulation is automatically saved and remains after application restart',async()=>{
 const r=await call('/simulate',{method:'POST',body:input});assert.equal(r.status,200);assert.equal(r.data.totalStudentHours,'180');assert.equal(r.data.basicTeachingDemand,'144');
 assert.ok(r.data.history?.id,'Calculation must include a durable history receipt');simId=r.data.history.id;
 const paper=await call('/calculations/'+simId+'/print?lang=en',{raw:true});assert.equal(paper.status,200);
 assert.ok(paper.data.toString().includes('Course hours calculation statement'));assert.ok(paper.data.toString().includes('SIMULATION'));
 assert.ok(!paper.data.toString().includes('<details'));assert.ok(paper.data.toString().includes('parameter-table'));
 assert.equal((await call('/calculations/'+simId+'/print?lang=bad',{raw:true})).status,400);
 await new Promise(r=>server.close(r));await start();const saved=await call('/calculations/'+simId);assert.equal(saved.status,200);assert.equal(saved.data.kind,'SIMULATION');assert.equal(saved.data.result.independentHoursPerStudent,'108');assert.deepEqual(saved.data.input,input);
});
test('completed UI snapshots release their bounded slots without losing page consistency',async()=>{
 for(let n=0;n<20;n++){
  let offset=0,snapshot;
  do{
   const query=new URLSearchParams({paged:'1',release:'1',offset:String(offset),...(snapshot?{snapshot}:{})});
   const r=await call('/records?'+query);assert.equal(r.status,200,JSON.stringify(r.data));snapshot=r.data.snapshot;offset=r.data.nextOffset;
  }while(offset!==null);
 }
});
test('failed calculations do not create history; retry IDs deduplicate and reject changed payloads',async()=>{
 const key=randomUUID();let r=await call('/simulate',{method:'POST',body:input,headers:{'X-Calculation-Request-ID':key}});assert.equal(r.status,200);const id=r.data.history.id;
 r=await call('/simulate',{method:'POST',body:input,headers:{'X-Calculation-Request-ID':key}});assert.equal(r.status,200);assert.equal(r.data.history.id,id);
 assert.equal((await call('/simulate',{method:'POST',body:{...input,credits:'5'},headers:{'X-Calculation-Request-ID':key}})).status,409);
 const count=await pool.query('SELECT count(*) FROM portal.calculation_runs WHERE actor_id=$1',[accounts.ADMIN.id]);
 assert.equal((await call('/simulate',{method:'POST',body:{...input,credits:'bad'}})).status,400);
 assert.equal((await pool.query('SELECT count(*) FROM portal.calculation_runs WHERE actor_id=$1',[accounts.ADMIN.id])).rows[0].count,count.rows[0].count);
});
test('calculation history is private by account and append-only with audit evidence',async()=>{
 assert.equal((await call('/calculations/'+simId,{role:'OPERATOR'})).status,404);
 assert.equal((await call('/calculations/'+simId+'/print',{role:'OPERATOR',raw:true})).status,404);
 assert.equal((await fetch(base+'/api/calculations/'+simId+'/print')).status,401);
 assert.equal((await call('/calculations',{role:'OPERATOR'})).data.items.length,0);
 assert.ok((await call('/calculations')).data.items.some(r=>r.id===simId));
 for(const sql of ['UPDATE portal.calculation_runs SET kind=kind WHERE id=$1','DELETE FROM portal.calculation_runs WHERE id=$1'])await assert.rejects(pool.query(sql,[simId]),/append-only/);
 assert.equal((await pool.query("SELECT count(*) FROM portal.audit WHERE action='CALCULATION_SAVED' AND entity_id=$1",[simId])).rows[0].count,'1');
});
test('personal preferences and saved report configurations enforce validation, ownership and versions',async()=>{
 let r=await call('/management/preferences',{role:'OPERATOR'});assert.equal(r.status,200);assert.equal(r.data.revision,0);
 const data={...r.data.data,tables:{faculties:{columns:['code','name'],filters:{q:run},delimiter:';',excelCsv:true}},dashboard:{widgets:['curricula']},reminders:{enabled:false,dueWithinDays:3,review:false,overdue:false}};
 r=await call('/management/preferences',{role:'OPERATOR',method:'PUT',body:{data,revision:0}});assert.equal(r.status,200);assert.deepEqual(r.data.data.dashboard.widgets,['curricula']);
 assert.equal((await call('/management/preferences',{role:'OPERATOR',method:'PUT',body:{data,revision:0}})).status,409);
 assert.equal((await call('/management/preferences',{role:'OPERATOR',method:'PUT',body:{data:{...data,execute:'anything'},revision:1}})).status,400);
 assert.equal((await call('/management/preferences',{role:'ADMIN'})).data.revision,0);
 r=await call('/management/reports',{role:'OPERATOR',method:'POST',body:{title:'Synthetic saved report',module:'faculties',config:data.tables.faculties}});assert.equal(r.status,201);const id=r.data.id;
 assert.equal((await call('/management/reports',{role:'OPERATOR'})).data.length,1);
 assert.equal((await call('/management/reports/'+id,{role:'AUDITOR',method:'DELETE'})).status,404);
 assert.equal((await call('/management/reports/'+id,{role:'OPERATOR',method:'DELETE'})).status,200);
 assert.deepEqual((await call('/management/notifications',{role:'OPERATOR'})).data,[]);
 assert.equal((await call('/management/backup',{role:'OPERATOR'})).status,403);
 assert.equal((await call('/management/backup',{role:'ADMIN'})).status,200);
});
test('rule-based history freezes exact source versions and honors later scope changes',async()=>{
 async function create(module,data){const r=await call('/records/'+module,{method:'POST',body:{data}});assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
 async function approve(r){let x=await call('/records/'+r.id+'/workflow',{method:'POST',body:{action:'submit',revision:r.revision,reason:'Synthetic management fixture'}});assert.equal(x.status,200);x=await call('/records/'+r.id+'/workflow',{role:'APPROVER',method:'POST',body:{action:'approve',revision:x.data.revision,reason:'Synthetic independent approval'}});assert.equal(x.status,200,JSON.stringify(x.data));return x.data;}
 const code=s=>s+run.toUpperCase();
 const f=await create('faculties',{code:code('MF'),name:'Synthetic management faculty'});
 const d=await create('departments',{code:code('MD'),name:'Synthetic department A',faculty:f.id});
 const other=await create('departments',{code:code('MO'),name:'Synthetic department B',faculty:f.id});
 const y=await create('years',{code:code('MY'),name:'Synthetic year',start:'2026-09-01',end:'2027-08-31'});
 const parameters={hoursPerCredit:'30',contactBasisPoints:4000,lectureBasisPoints:5000,practiceBasisPoints:5000,seminarBasisPoints:0,labBasisPoints:0,individualBasisPoints:0,practiceGroupMax:25,lectureStreamMax:100,seminarGroupMax:25,labGroupMax:15,individualUnit:'PER_STUDENT',roundingPlaces:2,roundingMode:'HALF_UP',remainderActivity:'practice',teacherAnnualLimit:'900',termCreditLimit:'30',programCredits:'1.25',termCount:2};
 const rule=await approve(await create('rules',{code:code('MR'),name:'SYNTHETIC ONLY rule',legalBasis:'TEST FIXTURE ONLY',parameters:'TEST ONLY',scope:code('MG'),effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31',calculation:parameters,department:d.id,year:y.id}));
 const subject=await approve(await create('subjects',{code:code('MS'),name:'Saqlash Sh Ch <b>literal</b>',department:d.id,credits:'1.25',category:'Majburiy',language:'O‘zbek'}));
 const group=await approve(await create('groups',{code:code('MG'),name:'Synthetic group',year:y.id,department:d.id,students:75,kind:'Akademik guruh'}));
 await pool.query('UPDATE portal.users SET department_id=$1 WHERE id=$2',[d.id,accounts.OPERATOR.id]);
 const r=await call('/calculate',{role:'OPERATOR',method:'POST',body:{ruleId:rule.id,subjectId:subject.id,groupId:group.id,onDate:'2026-11-04'}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.totalStudentHours,'37.5');assert.equal(r.data.basicTeachingDemand,'30');
 const detail=await call('/calculations/'+r.data.history.id,{role:'OPERATOR'});assert.equal(detail.status,200);assert.equal(detail.data.kind,'RULE_BASED');assert.equal(detail.data.actor_role,'OPERATOR');assert.equal(detail.data.sources.find(s=>s.id===rule.id).revision,rule.revision);assert.equal(detail.data.sources.find(s=>s.id===subject.id).data.credits,'1.25');
 await pool.query('UPDATE portal.users SET department_id=$1 WHERE id=$2',[other.id,accounts.OPERATOR.id]);
 assert.equal((await call('/calculations/'+r.data.history.id,{role:'OPERATOR'})).status,404);
 assert.equal((await call('/calculations/'+r.data.history.id+'/print',{role:'OPERATOR',raw:true})).status,404);
 const paper=await call('/calculations/'+r.data.history.id+'/print?lang=ru',{raw:true});assert.equal(paper.status,200);
 assert.ok(paper.data.toString().includes('Правовое основание'));assert.ok(paper.data.toString().includes('&lt;b&gt;literal&lt;/b&gt;'));
 assert.equal((await call('/calculations/'+r.data.history.id,{role:'ADMIN'})).status,200);
 await pool.query('UPDATE portal.users SET department_id=NULL WHERE id=$1',[accounts.OPERATOR.id]);
});
test('exports retain filtered authorized rows and reject invalid column and format requests',async()=>{
 const q='MS'+run.toUpperCase();
 let r=await call('/management/export/subjects?'+new URLSearchParams({q,format:'csv',lang:'en',columns:'code,name,credits',delimiter:';',excelCsv:'1'}),{raw:true});
 assert.equal(r.status,200);assert.ok(r.data.toString().startsWith('\uFEFFsep=;\r\n'));assert.ok(r.data.toString().includes('Saqlash Sh Ch <b>literal</b>'));assert.ok(r.data.toString().includes('"1.25"'));
 r=await call('/management/export/subjects?'+new URLSearchParams({q,format:'html',lang:'ru',columns:'code,name,credits'}),{raw:true});assert.equal(r.status,200);assert.ok(r.data.toString().includes('&lt;b&gt;literal&lt;/b&gt;'));assert.ok(!r.data.toString().includes('<b>literal</b>'));
 assert.equal((await call('/management/export/subjects?columns=password_hash')).status,400);
 assert.equal((await call('/management/export/subjects?format=exe')).status,400);
 assert.equal((await call('/management/export/subjects?lang=unknown')).status,400);
});
test('review assignments require admin and an independent scoped reviewer; stale assignments cannot bypass workflow',async()=>{
 const email='review-b-'+run+'@management.invalid';
 const u=(await pool.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id',[email,'Synthetic alternate reviewer','APPROVER',await passwordHash(pass)])).rows[0];
 const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});assert.equal(login.status,200);const session=await login.json();accounts.APPROVER_B={id:u.id,cookie:login.headers.get('set-cookie').split(';')[0],csrf:session.csrf};
 let r=await call('/records/faculties',{method:'POST',body:{data:{code:'QA'+run.toUpperCase(),name:'Synthetic assigned document'}}});assert.equal(r.status,201);
 r=await call('/records/'+r.data.id+'/workflow',{method:'POST',body:{action:'submit',revision:r.data.revision,reason:'Synthetic submission'}});assert.equal(r.status,200);const record=r.data;
 const path='/management/review/'+record.id;
 assert.equal((await call(path+'/reviewers',{role:'OPERATOR'})).status,403);
 assert.ok((await call(path+'/reviewers')).data.some(x=>x.id===accounts.APPROVER.id));
 const body={assigneeId:accounts.APPROVER.id,recordRevision:record.revision,revision:0};
 assert.equal((await call(path+'/assignment',{role:'OPERATOR',method:'PUT',body})).status,403);
 assert.equal((await call(path+'/assignment',{method:'PUT',body:{...body,assigneeId:accounts.ADMIN.id}})).status,400);
 r=await call(path+'/assignment',{method:'PUT',body});assert.equal(r.status,200);assert.equal(r.data.revision,1);
 assert.equal((await call(path+'/assignment',{method:'PUT',body})).status,409);
 assert.equal((await call('/management/review-queue',{role:'APPROVER_B'})).data.find(x=>x.id===record.id).canApprove,false);
 assert.equal((await call('/records/'+record.id+'/workflow',{role:'APPROVER_B',method:'POST',body:{action:'approve',revision:record.revision,reason:'Unauthorized reviewer attempt'}})).status,403);
 r=await call(path+'/assignment',{method:'PUT',body:{...body,assigneeId:null,revision:1}});assert.equal(r.status,200);
 assert.equal((await call('/records/'+record.id+'/workflow',{role:'APPROVER_B',method:'POST',body:{action:'approve',revision:record.revision,reason:'Independent approval after release'}})).status,200);
 assert.equal((await pool.query("SELECT count(*) FROM portal.audit WHERE entity_id=$1 AND action='REVIEW_ASSIGNED'",[record.id])).rows[0].count,'2');
});
test('backup API reads only bounded sanitized host metadata; scheduling is admin-only and versioned',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'erp-backup-test-')),file=join(dir,'status.json'),before=process.env.BACKUP_STATUS_FILE;process.env.BACKUP_STATUS_FILE=file;
 try{
  let r=await call('/management/backup');assert.equal(r.data.configured,false);let revision=r.data.revision;
  assert.equal((await call('/management/backup',{method:'PUT',body:{enabled:true,intervalHours:24,revision}})).status,409);
  await writeFile(file,JSON.stringify({version:1,status:'SUCCESS',lastSuccessAt:'2026-11-04T00:00:00Z',filename:'../../secret',bytes:200,secret:'NEVER_RETURN',error:'NEVER_RETURN'}));
  r=await call('/management/backup');assert.equal(r.data.configured,true);assert.equal(r.data.filename,null);assert.ok(!JSON.stringify(r.data).includes('NEVER_RETURN'));
  assert.equal((await call('/management/backup',{role:'AUDITOR',method:'PUT',body:{enabled:true,intervalHours:24,revision}})).status,403);
  r=await call('/management/backup',{method:'PUT',body:{enabled:true,intervalHours:24,revision}});assert.equal(r.status,200);
  assert.equal((await call('/management/backup',{method:'PUT',body:{enabled:false,intervalHours:24,revision}})).status,409);
  revision=r.data.revision;assert.equal((await call('/management/backup',{method:'PUT',body:{enabled:false,intervalHours:0,revision}})).status,400);
  assert.equal((await call('/management/backup',{method:'PUT',body:{enabled:false,intervalHours:24,revision}})).status,200);
  await writeFile(file,'x'.repeat(33000));assert.equal((await call('/management/backup')).data.configured,false);
 }finally{if(before===undefined)delete process.env.BACKUP_STATUS_FILE;else process.env.BACKUP_STATUS_FILE=before;await rm(dir,{recursive:true});}
});
