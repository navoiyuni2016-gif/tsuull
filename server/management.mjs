import {readFile,stat} from 'node:fs/promises';
import {transaction,audit} from './db.mjs';
import {visible} from './scopes.mjs';
import {modules} from '../public/modules.mjs';
const isUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const invalid=message=>Object.assign(new Error(message),{status:400});
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(value,allowed)=>{if(!plain(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw invalid('Sozlamalar shakli noto‘g‘ri.');};
export const defaultPreferences=()=>({tables:{},dashboard:{widgets:['departments','curricula','workload','overdue']},reminders:{enabled:true,dueWithinDays:7,review:true,overdue:true}});
export function validateReport(module,value){
 if(!Object.hasOwn(modules,module))throw invalid('Modul topilmadi.');keys(value,['columns','filters','delimiter','excelCsv','orientation']);
 const available=[...modules[module].fields.map(f=>f.key),'__status','__revision','__updated'];
 const columns=value.columns??available;
 if(!Array.isArray(columns)||!columns.length||new Set(columns).size!==columns.length||columns.some(k=>!available.includes(k)))throw invalid('Hisobot ustunlari noto‘g‘ri.');
 const filters=value.filters??{};keys(filters,['q','status','year','department']);
 for(const [k,v]of Object.entries(filters))if(typeof v!=='string'||v.length>(k==='q'?200:80))throw invalid('Filtr qiymati noto‘g‘ri.');
 if(filters.status&&!['DRAFT','SUBMITTED','APPROVED','REJECTED'].includes(filters.status))throw invalid('Holat noto‘g‘ri.');
 if(value.delimiter!==undefined&&![';',',','\t'].includes(value.delimiter))throw invalid('CSV ajratgichi noto‘g‘ri.');
 if(value.excelCsv!==undefined&&typeof value.excelCsv!=='boolean')throw invalid('CSV sozlamasi noto‘g‘ri.');
 if(value.orientation!==undefined&&!['portrait','landscape'].includes(value.orientation))throw invalid('Sahifa yo‘nalishi noto‘g‘ri.');
 return {orientation:value.orientation??'landscape',columns:[...columns],filters:{...filters},delimiter:value.delimiter??';',excelCsv:value.excelCsv??true};
}
export function validatePreferences(value){
 keys(value,['tables','dashboard','reminders']);const result=defaultPreferences();
 if(value.tables!==undefined){keys(value.tables,Object.keys(modules));for(const [module,config]of Object.entries(value.tables))result.tables[module]=validateReport(module,config);}
 if(value.dashboard!==undefined){keys(value.dashboard,['widgets']);const widgets=value.dashboard.widgets;if(!Array.isArray(widgets)||!widgets.length||new Set(widgets).size!==widgets.length||widgets.some(k=>!['departments','curricula','workload','overdue','pending'].includes(k)))throw invalid('Panel ko‘rsatkichlari noto‘g‘ri.');result.dashboard={widgets};}
 if(value.reminders!==undefined){keys(value.reminders,['enabled','dueWithinDays','review','overdue']);const r={...result.reminders,...value.reminders};if(['enabled','review','overdue'].some(k=>typeof r[k]!=='boolean')||!Number.isInteger(r.dueWithinDays)||r.dueWithinDays<0||r.dueWithinDays>90)throw invalid('Eslatma sozlamalari noto‘g‘ri.');result.reminders=r;}
 return result;
}
export async function preferences(pool,user){const row=(await pool.query('SELECT data,revision FROM portal.user_preferences WHERE user_id=$1',[user.id])).rows[0];return {data:row?validatePreferences(row.data):defaultPreferences(),revision:row?.revision??0};}
export async function backupStatus(){
 const path=process.env.BACKUP_STATUS_FILE||'/app/host-status/backup.json';
 try{
  if((await stat(path)).size>32768)throw new Error('size');const value=JSON.parse(await readFile(path,'utf8'));
  const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
  const filename=typeof value.filename==='string'&&/^erp-[\w-]+\.dump$/.test(value.filename)?value.filename:null;
  return {configured:value.version===1,status:['SUCCESS','ERROR','WAITING'].includes(value.status)?value.status:'WAITING',lastSuccessAt:date(value.lastSuccessAt),lastAttemptAt:date(value.lastAttemptAt),checkedAt:date(value.checkedAt),filename,bytes:Number.isSafeInteger(value.bytes)&&value.bytes>=0?value.bytes:null};
 }catch{return {configured:false,status:'UNCONFIGURED',lastSuccessAt:null,lastAttemptAt:null,checkedAt:null,filename:null,bytes:null};}
}
export async function ensureAssignedReviewer(c,user,record){
 const assignment=(await c.query('SELECT assignee_id FROM portal.review_assignments WHERE record_id=$1 AND record_revision=$2',[record.id,record.revision])).rows[0];
 if(assignment?.assignee_id&&assignment.assignee_id!==user.id)throw Object.assign(new Error('Hujjat boshqa tasdiqlovchiga biriktirilgan.'),{status:403});
}
export function registerManagement(app,{pool,allow,fail,allRecords}){
 app.get('/api/management/preferences',async(req,res)=>res.json(await preferences(pool,req.user)));
 app.put('/api/management/preferences',async(req,res)=>{
  const data=validatePreferences(req.body?.data),revision=req.body?.revision;
  if(!Number.isSafeInteger(revision)||revision<0)fail(400,'Versiya noto‘g‘ri.');
  const row=await transaction(pool,async c=>{
   await c.query('SELECT id FROM portal.users WHERE id=$1 FOR UPDATE',[req.user.id]);const old=(await c.query('SELECT revision FROM portal.user_preferences WHERE user_id=$1',[req.user.id])).rows[0];
   if((old?.revision??0)!==revision)fail(409,'Sozlamalar boshqa oynada o‘zgargan. Qayta oching.');
   const saved=(await c.query('INSERT INTO portal.user_preferences(user_id,data) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,revision=portal.user_preferences.revision+1,updated_at=now() RETURNING data,revision',[req.user.id,JSON.stringify(data)])).rows[0];
   await audit(c,req.user.id,'PREFERENCES_UPDATED',req.user.id,{revision:saved.revision});return saved;
  });res.json(row);
 });
 app.get('/api/management/reports',async(req,res)=>res.json((await pool.query('SELECT * FROM portal.saved_reports WHERE user_id=$1 ORDER BY updated_at DESC',[req.user.id])).rows));
 app.post('/api/management/reports',async(req,res)=>{
  const {title,module,config}=req.body||{};if(typeof title!=='string'||title.trim().length<2||title.length>100)fail(400,'Hisobot nomi 2–100 belgi bo‘lsin.');const clean=validateReport(module,config);
  const row=await transaction(pool,async c=>{const r=(await c.query('INSERT INTO portal.saved_reports(user_id,title,module,config) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,title.trim(),module,JSON.stringify(clean)])).rows[0];await audit(c,req.user.id,'REPORT_VIEW_SAVED',r.id,{module});return r;});res.status(201).json(row);
 });
 app.delete('/api/management/reports/:id',async(req,res)=>{
  if(!isUuid(req.params.id))fail(404,'Hisobot sozlamasi topilmadi.');
  await transaction(pool,async c=>{const row=(await c.query('DELETE FROM portal.saved_reports WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id])).rows[0];if(!row)fail(404,'Hisobot sozlamasi topilmadi.');await audit(c,req.user.id,'REPORT_VIEW_REMOVED',row.id);});res.json({ok:true});
 });
 app.get('/api/management/review/:id/reviewers',async(req,res)=>{
  allow(req,'ADMIN');const all=await allRecords(pool),record=all.find(r=>r.id===req.params.id);if(!record||!visible(record,req.user,all))fail(404,'Yozuv topilmadi.');
  const candidates=(await pool.query("SELECT id,name,faculty_id,department_id,year_id FROM portal.users WHERE role='APPROVER' AND active=true")).rows;
  res.json(candidates.filter(u=>u.id!==record.author_id&&visible(record,u,all)).map(u=>({id:u.id,name:u.name})));
 });
 app.put('/api/management/review/:id/assignment',async(req,res)=>{
  allow(req,'ADMIN');const {assigneeId,recordRevision,revision}=req.body||{};
  if(assigneeId!==null&&!isUuid(assigneeId)||!Number.isSafeInteger(recordRevision)||recordRevision<1||!Number.isSafeInteger(revision)||revision<0)fail(400,'Tasdiqlovchi biriktirish ma’lumotlari noto‘g‘ri.');
  const result=await transaction(pool,async c=>{
   await c.query('SELECT pg_advisory_xact_lock(731204)');const all=await allRecords(c),record=all.find(r=>r.id===req.params.id);
   if(!record||!visible(record,req.user,all))fail(404,'Yozuv topilmadi.');
   if(record.status!=='SUBMITTED'||record.revision!==recordRevision)fail(409,'Versiya o‘zgardi. Sahifani yangilang.');
   const old=(await c.query('SELECT * FROM portal.review_assignments WHERE record_id=$1 FOR UPDATE',[record.id])).rows[0];
   if((old?.revision??0)!==revision)fail(409,'Tasdiqlovchi boshqa oynada o‘zgartirilgan.');
   if(assigneeId){const u=(await c.query("SELECT * FROM portal.users WHERE id=$1 AND role='APPROVER' AND active=true",[assigneeId])).rows[0];if(!u||u.id===record.author_id||!visible(record,u,all))fail(400,'Vakolatli alohida tasdiqlovchini tanlang.');}
   const row=(await c.query('INSERT INTO portal.review_assignments(record_id,record_revision,assignee_id,assigned_by) VALUES($1,$2,$3,$4) ON CONFLICT(record_id) DO UPDATE SET record_revision=EXCLUDED.record_revision,assignee_id=EXCLUDED.assignee_id,assigned_by=EXCLUDED.assigned_by,revision=portal.review_assignments.revision+1,updated_at=now() RETURNING *',[record.id,record.revision,assigneeId,req.user.id])).rows[0];
   await audit(c,req.user.id,'REVIEW_ASSIGNED',record.id,{assigneeId,recordRevision,revision:row.revision});return row;
  });res.json(result);
 });
 app.get('/api/management/review-queue',async(req,res)=>{
  const all=await allRecords(pool),submitted=(await pool.query("SELECT record_id,max(recorded_at) submitted_at FROM portal.record_versions WHERE status='SUBMITTED' GROUP BY record_id")).rows,dates=new Map(submitted.map(r=>[r.record_id,r.submitted_at]));
  const assignments=(await pool.query('SELECT a.*,u.name assignee_name FROM portal.review_assignments a LEFT JOIN portal.users u ON u.id=a.assignee_id')).rows,assigned=new Map(assignments.map(a=>[a.record_id,a]));
  res.json(all.filter(r=>r.status==='SUBMITTED'&&!r.data._excluded&&visible(r,req.user,all)).map(r=>({id:r.id,module:r.module,code:r.code,name:r.data.name,author:r.author,submittedAt:dates.get(r.id)||r.updated_at,revision:r.revision,assigneeId:assigned.get(r.id)?.record_revision===r.revision?assigned.get(r.id).assignee_id:null,assigneeName:assigned.get(r.id)?.record_revision===r.revision?assigned.get(r.id).assignee_name:null,assignmentRevision:assigned.get(r.id)?.revision??0,canApprove:req.user.role==='APPROVER'&&r.author_id!==req.user.id&&(!(assigned.get(r.id)?.record_revision===r.revision&&assigned.get(r.id)?.assignee_id)||assigned.get(r.id).assignee_id===req.user.id)})).sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt)));
 });
 app.get('/api/management/notifications',async(req,res)=>{
  const {data}=await preferences(pool,req.user),settings=data.reminders;if(!settings.enabled)return res.json([]);
  const all=await allRecords(pool),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),today=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
  const future=new Date(today+'T00:00:00Z');future.setUTCDate(future.getUTCDate()+settings.dueWithinDays);const until=future.toISOString().slice(0,10),list=[];
  for(const r of all){if(!visible(r,req.user,all)||r.data._excluded)continue;
   if(settings.review&&req.user.role==='APPROVER'&&r.status==='SUBMITTED')list.push({id:r.id,title:r.data.name,message:'Akademik ko‘rib chiqish kutilmoqda',module:r.module,kind:'REVIEW'});
   if(r.module==='tasks'&&r.status!=='APPROVED'&&r.data.due&&r.data.due<=until&&(settings.overdue||r.data.due>=today))list.push({id:r.id,title:r.data.name,message:r.data.due<today?'Vazifa muddati o‘tgan':'Vazifa muddati yaqinlashmoqda',module:r.module,kind:r.data.due<today?'OVERDUE':'UPCOMING',due:r.data.due});
  }res.json(list.sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0,200));
 });
 app.get('/api/management/backup',async(req,res)=>{
  allow(req,'ADMIN');const row=(await pool.query("SELECT data,revision FROM portal.management_config WHERE key='backup'")).rows[0];res.json({schedule:row?.data??{enabled:false,intervalHours:24},revision:row?.revision??0,...await backupStatus()});
 });
 app.put('/api/management/backup',async(req,res)=>{
  allow(req,'ADMIN');const {enabled,intervalHours,revision}=req.body||{};
  if(typeof enabled!=='boolean'||!Number.isInteger(intervalHours)||intervalHours<1||intervalHours>168||!Number.isSafeInteger(revision)||revision<0)fail(400,'Zaxiralash jadvali noto‘g‘ri.');
  if(enabled&&!(await backupStatus()).configured)fail(409,'Serverdagi zaxiralash xizmati hali ulanmagan.');
  const row=await transaction(pool,async c=>{await c.query('SELECT pg_advisory_xact_lock(731205)');const old=(await c.query("SELECT revision FROM portal.management_config WHERE key='backup'")).rows[0];if((old?.revision??0)!==revision)fail(409,'Sozlamalar boshqa oynada o‘zgargan. Qayta oching.');const saved=(await c.query("INSERT INTO portal.management_config(key,data,updated_by) VALUES('backup',$1,$2) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data,revision=portal.management_config.revision+1,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING data,revision",[JSON.stringify({enabled,intervalHours}),req.user.id])).rows[0];await audit(c,req.user.id,'BACKUP_SCHEDULE_UPDATED','backup',{...saved.data,revision:saved.revision});return saved;});res.json(row);
 });
}
