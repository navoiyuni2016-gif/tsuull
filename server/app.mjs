import {registerReportExports} from './report-export.mjs';
import {registerManagement,ensureAssignedReviewer} from './management.mjs';
import {saveCalculation,registerCalculationHistory} from './calculation-history.mjs';
import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {visible,scopedUserFields} from './scopes.mjs';
import {approvalSnapshot} from './academic-service.mjs';
import {validateParameters} from '../packages/domain/src/academic.mjs';
import {verifyOtp,decrypt} from './mfa.mjs';
import {registerExtensions} from './extensions.mjs';
import {fileURLToPath} from 'node:url';
import {modules} from '../public/modules.mjs';
import {transaction,audit} from './db.mjs';
import {token,hash,passwordMatches,passwordHash,passwordValid} from './auth.mjs';
import {computeDemoCourse,demoRule} from '../packages/domain/src/core.mjs';
const root=fileURLToPath(new URL('../public',import.meta.url));
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const roles=['ADMIN','OPERATOR','APPROVER','AUDITOR'];
export function createApp(pool,{origin=process.env.APP_ORIGIN||'http://localhost:8080',production=process.env.NODE_ENV==='production'}={}){
 const readSnapshots=new Map();
 const app=express();app.disable('x-powered-by');if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],upgradeInsecureRequests:production?[]:null}}}));
 app.use(express.json({limit:'8mb'}));app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'So‘rovlar limiti. Biroz kuting.'}}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.get('/health/ready',async(_req,res)=>{try{await pool.query('SELECT 1 FROM portal.users LIMIT 1');res.json({status:'ready'});}catch{res.status(503).json({status:'unavailable'});}});
 const cookieName=production?'__Host-erp_session':'erp_session';
 const cookieOptions={httpOnly:true,secure:production,sameSite:'strict',path:'/',maxAge:8*60*60*1000};
 function sameOrigin(req){if(req.get('origin')!==origin)fail(403,'So‘rov manbasi ruxsat etilmagan.');}
 app.post('/api/login',rateLimit({windowMs:15*60000,limit:15,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{
  sameOrigin(req);const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string'||password.length>200)fail(400,'Email va parolni kiriting.');
  const {rows}=await pool.query('SELECT * FROM portal.users WHERE email=$1 AND active=true',[email.trim().toLowerCase()]);
  const user=rows[0];
  // A constant-cost scrypt is also performed for unknown accounts.
  const stored=user?.password_hash||'00000000000000000000000000000000:'+ '00'.repeat(64);
  if(!await passwordMatches(password,stored)||!user)fail(401,'Email yoki parol noto‘g‘ri.');
  const session=token(),csrf=token();await transaction(pool,async c=>{const locked=(await c.query('SELECT * FROM portal.users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];if(!locked.active)fail(401,'Hisob bloklangan.');if(locked.mfa_secret){const counter=verifyOtp(decrypt(locked.mfa_secret),req.body.otp,locked.mfa_last_counter);if(counter!==null)await c.query('UPDATE portal.users SET mfa_last_counter=$1 WHERE id=$2',[counter,user.id]);else{const recovery=typeof req.body.otp==='string'?hash(req.body.otp.trim()):'';if(!locked.recovery_codes.includes(recovery))fail(401,'Yangi MFA kodi yoki tiklash kodini kiriting.');await c.query('UPDATE portal.users SET recovery_codes=$1 WHERE id=$2',[JSON.stringify(locked.recovery_codes.filter(c=>c!==recovery)),user.id]);}}await c.query('DELETE FROM portal.sessions WHERE expires_at < now()');await c.query("INSERT INTO portal.sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",[hash(session),user.id,csrf]);await audit(c,user.id,'LOGIN',user.id);});
  res.cookie(cookieName,session,cookieOptions);res.json({user:scopedUserFields(user),csrf});
 });
 app.use('/api',async(req,_res,next)=>{
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
  const session=cookies[cookieName];if(!session||!/^[a-f0-9]{64}$/.test(session))fail(401,'Tizimga kiring.');
  const {rows}=await pool.query('SELECT u.id,u.email,u.name,u.role,u.faculty_id,u.department_id,u.year_id,s.csrf FROM portal.sessions s JOIN portal.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[hash(session)]);
  if(!rows.length)fail(401,'Sessiya tugadi. Qayta kiring.');req.user=rows[0];req.sessionHash=hash(session);
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){sameOrigin(req);if(req.get('x-csrf-token')!==req.user.csrf)fail(403,'Sessiya himoyasi: sahifani yangilang.');}
  next();
 });
 app.get('/api/me',(req,res)=>res.json({user:scopedUserFields(req.user),csrf:req.user.csrf}));
 app.post('/api/logout',async(req,res)=>{await pool.query('DELETE FROM portal.sessions WHERE token_hash=$1',[req.sessionHash]);res.clearCookie(cookieName,{...cookieOptions,maxAge:undefined});res.json({ok:true});});
 const allRecords=async c=>(await c.query('SELECT r.*,EXISTS(SELECT 1 FROM portal.year_locks y WHERE y.year_id=r.id) locked FROM portal.records r')).rows;
 const guard=async(c,req,r)=>{if(!visible(r,req.user,await allRecords(c)))fail(403,'Yozuv vakolat doirangizdan tashqarida.');};
 const allow=(req,...allowed)=>{if(!allowed.includes(req.user.role))fail(403,'Bu amal uchun vakolatingiz yo‘q.');};
 app.get('/api/users',async(req,res)=>{allow(req,'ADMIN');res.json((await pool.query('SELECT id,email,name,role,active,faculty_id,department_id,year_id,created_at FROM portal.users ORDER BY created_at')).rows);});
 app.post('/api/users',async(req,res)=>{allow(req,'ADMIN');const {email,name,role,password}=req.body||{};if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof name!=='string'||name.trim().length<2||name.length>150||!roles.includes(role)||!passwordValid(password))fail(400,'To‘g‘ri email, ism, rol va kamida 14 belgili parol kerak.');const ph=await passwordHash(password);const result=await transaction(pool,async c=>{const {rows}=await c.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,email,name,role,active',[email.trim().toLowerCase(),name.trim(),role,ph]);await audit(c,req.user.id,'USER_CREATED',rows[0].id,{role});return rows[0];});res.status(201).json(result);});
 app.post('/api/password',async(req,res)=>{const {currentPassword,newPassword}=req.body||{};if(typeof currentPassword!=='string'||currentPassword.length>200||!passwordValid(newPassword))fail(400,'Yangi parol kamida 14 belgili bo‘lsin.');const {rows}=await pool.query('SELECT password_hash FROM portal.users WHERE id=$1',[req.user.id]);if(!await passwordMatches(currentPassword,rows[0].password_hash))fail(400,'Joriy parol noto‘g‘ri.');await transaction(pool,async c=>{await c.query('UPDATE portal.users SET password_hash=$1 WHERE id=$2',[await passwordHash(newPassword),req.user.id]);await c.query('DELETE FROM portal.sessions WHERE user_id=$1',[req.user.id]);await audit(c,req.user.id,'PASSWORD_CHANGED',req.user.id);});res.clearCookie(cookieName,cookieOptions);res.json({ok:true});});
 app.get('/api/audit',async(req,res)=>{const all=await allRecords(pool);const rows=(await pool.query('SELECT a.id,a.actor_id,a.action,a.entity_id,a.details,a.occurred_at,u.name actor FROM portal.audit a LEFT JOIN portal.users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 2000')).rows;res.json(rows.filter(r=>!req.user.department_id&&!req.user.faculty_id&&!req.user.year_id||r.actor_id===req.user.id||visible(all.find(x=>x.id===r.entity_id),req.user,all)).slice(0,200));});
 app.get('/api/records/:id/versions',async(req,res)=>{if(!uuid(req.params.id))fail(400,'ID noto‘g‘ri.');await guard(pool,req,(await pool.query('SELECT * FROM portal.records WHERE id=$1',[req.params.id])).rows[0]);res.json((await pool.query('SELECT v.*,u.name actor FROM portal.record_versions v JOIN portal.users u ON u.id=v.actor_id WHERE record_id=$1 ORDER BY revision DESC',[req.params.id])).rows);});
 app.get('/api/records',async(req,res)=>{if(req.query.paged==='1'){const now=Date.now();for(const [key,s]of readSnapshots)if(s.expires<now)readSnapshots.delete(key);const permissionStamp=JSON.stringify([req.user.role,req.user.faculty_id,req.user.department_id,req.user.year_id]);let key=req.query.snapshot,s=readSnapshots.get(key);if(key&&(!s||s.actor!==req.user.id||s.permissionStamp!==permissionStamp))fail(409,'O‘qish snapshoti tugagan. Sahifani yangilang.');if(!key){if(readSnapshots.size>=16)fail(429,'O‘qish navbati band. Birozdan keyin qayta urining.');const rows=(await pool.query('SELECT r.*,EXISTS(SELECT 1 FROM portal.year_locks y WHERE y.year_id=r.id) locked,u.name author FROM portal.records r JOIN portal.users u ON u.id=r.author_id ORDER BY r.id')).rows;const all=await allRecords(pool);s={actor:req.user.id,permissionStamp,rows:rows.filter(r=>!r.data._excluded&&visible(r,req.user,all)),asOf:new Date().toISOString(),expires:now+120000};key=token();readSnapshots.set(key,s);}const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)fail(400,'Sahifa parametri noto‘g‘ri.');const items=s.rows.slice(offset,offset+500);if(req.query.release==='1'&&offset+500>=s.rows.length)readSnapshots.delete(key);return res.json({items,snapshot:key,asOf:s.asOf,total:s.rows.length,nextOffset:offset+500<s.rows.length?offset+500:null});}const m=req.query.module;if(m&&!Object.hasOwn(modules,m))fail(404,'Modul topilmadi.');const rows=(await pool.query('SELECT r.*,EXISTS(SELECT 1 FROM portal.year_locks y WHERE y.year_id=r.id) locked,u.name author FROM portal.records r JOIN portal.users u ON u.id=r.author_id WHERE ($1::text IS NULL OR module=$1) ORDER BY r.created_at DESC LIMIT 10001',[m||null])).rows;if(rows.length>10000)fail(413,'10 000 yozuvdan ko‘p. Server pagination sozlanmaguncha to‘liq dashboard ochilmaydi.');const all=await allRecords(pool);res.json(rows.filter(r=>!r.data._excluded&&visible(r,req.user,all)));});
 async function guardReferences(c,req,module,data){if((req.user.faculty_id||req.user.department_id)&&(['years','faculties','work_types'].includes(module)||module==='rules'&&!data.department))fail(403,'Umumuniversitet katalogini faqat umumiy vakolatli hisob o‘zgartiradi.');const all=await allRecords(c);for(const f of modules[module].fields)if(f.type==='ref'&&data[f.key]&&!visible(all.find(r=>r.id===data[f.key]),req.user,all))fail(403,'Bog‘langan yozuv vakolat doirangizdan tashqarida.');let y=all.find(r=>r.id===data.year);if(!y){for(const key of ['curriculum','workload','group']){const parent=all.find(r=>r.id===data[key]);if(parent?.data.year){y=all.find(r=>r.id===parent.data.year);break;}}}if(y?.locked||y?.data.periodState==='LOCKED')fail(409,'Akademik yil yopilgan.');}
 async function snapshot(c,r,actor){await c.query('INSERT INTO portal.record_versions(record_id,revision,data,status,actor_id) VALUES($1,$2,$3,$4,$5)',[r.id,r.revision,JSON.stringify(r.data),r.status,actor]);}
 async function validate(c,module,input,id){
  const spec=Object.hasOwn(modules,module)?modules[module]:null;if(!spec)fail(404,'Modul topilmadi.');if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Ma’lumot shakli noto‘g‘ri.');const data={};
  for(const f of spec.fields){const raw=input[f.key];const value=typeof raw==='string'?raw.trim():raw;if((value===undefined||value==='')&&!f.required){data[f.key]='';continue;}if(value===undefined||value===null||value==='')fail(400,f.label+' kerak.');
   if(f.type==='number'){if(!Number.isSafeInteger(Number(value))||Number(value)<f.min||Number(value)>f.max)fail(400,f.label+': son oralig‘ini tekshiring.');data[f.key]=Number(value);}
   else if(f.type==='decimal'){if(!/^(0|[1-9]\d*)(\.\d{1,4})?$/.test(String(value))||Number(value)<f.min||Number(value)>f.max)fail(400,f.label+': 4 xonagacha aniq musbat son kiriting.');data[f.key]=String(value);}
   else {if(typeof value!=='string'||value.length>2000)fail(400,f.label+': matn juda uzun yoki noto‘g‘ri.');if(f.type==='select'&&!f.options.includes(value))fail(400,f.label+': qiymat noto‘g‘ri.');if(f.type==='date'&&!validDate(value))fail(400,f.label+': sana noto‘g‘ri.');if(f.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))fail(400,'Vaqt noto‘g‘ri.');if(f.type==='ref'){if(!uuid(value))fail(400,f.label+': yozuvni tanlang.');const refRow=(await c.query('SELECT id FROM portal.records WHERE id=$1 AND module=$2',[value,f.module])).rows[0];if(!refRow)fail(400,f.label+': manba yozuv topilmadi.');}data[f.key]=value;}
  }
  if(module==='rules'&&input.calculation){try{validateParameters(input.calculation);}catch(e){fail(400,e.message);}data.calculation=input.calculation;}
  if(module==='teachers'&&data.capacityHours&&!data.capacityBasis)fail(400,'Individual limit uchun huquqiy manba kerak.');
  if(module==='subjects'){const codes=String(data.prerequisiteCodes||'').split(',').map(s=>s.trim()).filter(Boolean);const all=await allRecords(c);data.prerequisites=[];for(const code of codes){const r=all.find(r=>r.module==='subjects'&&r.code===code&&r.id!==id);if(!r)fail(400,'Oldindan talab fan kodi topilmadi yoki fan o‘zini talab qilmoqda: '+code);data.prerequisites.push(r.id);}}
  if(module==='plan_items'){const parent=(await c.query('SELECT * FROM portal.records WHERE id=$1',[data.curriculum])).rows[0];if(parent&&!['DRAFT','REJECTED'].includes(parent.status))fail(409,'Yuborilgan yoki tasdiqlangan rejaning fanlari o‘zgarmaydi.');const duplicate=await c.query("SELECT id FROM portal.records WHERE module='plan_items' AND COALESCE(data->>'_excluded','false') <> 'true' AND id<>$1 AND data->>'curriculum'=$2 AND data->>'subject'=$3",[id,data.curriculum,data.subject]);if(duplicate.rows.length)fail(409,'Rejada bu fan mavjud.');}
  if(!/^[A-Z0-9_\-/]{2,40}$/.test(data.code))fail(400,'Kod 2–40 ta bosh lotin harfi, raqam, _, / yoki - dan iborat bo‘lsin.');
  for(const [start,end] of [['start','end'],['periodStart','periodEnd'],['effectiveFrom','effectiveTo']])if(data[start]&&data[end]&&data[start]>=data[end])fail(400,'Tugash boshlanishdan keyin bo‘lishi kerak.');
  if(module==='workloads'){
   const refs=(await c.query('SELECT id,module,data FROM portal.records WHERE id=ANY($1::uuid[])',[[data.subject,data.group,data.teacher]])).rows;
   const subject=refs.find(r=>r.id===data.subject),group=refs.find(r=>r.id===data.group),teacher=refs.find(r=>r.id===data.teacher);
   if(subject.data.department!==teacher.data.department||group.data.department!==teacher.data.department)fail(400,'Fan, guruh va o‘qituvchi kafedrasi mos emas.');
   if(group.data.year!==data.year)fail(400,'Guruh o‘quv yili mos emas.');
   const duplicate=await c.query("SELECT id FROM portal.records WHERE module='workloads' AND id<>$1 AND data->>'subject'=$2 AND data->>'group'=$3 AND data->>'activity'=$4 AND data->>'year'=$5 AND data->>'teacher'=$6",[id,data.subject,data.group,data.activity,data.year,data.teacher]);if(duplicate.rows.length)fail(409,'Bu fan, guruh, mashg‘ulot va o‘qituvchi uchun biriktirish mavjud.');
  }
  if(module==='schedule'){
   const {rows}=await c.query("SELECT data FROM portal.records WHERE module='schedule' AND id<>$1 AND data->>'date'=$2",[id,data.date]);
   for(const r of rows)if(r.data.start<data.end&&r.data.end>data.start&&(r.data.room.toLocaleLowerCase()===data.room.toLocaleLowerCase()||r.data.teacher===data.teacher||r.data.group===data.group))fail(409,'Vaqt konflikti: auditoriya, o‘qituvchi yoki guruh band.');
   const group=(await c.query('SELECT data FROM portal.records WHERE id=$1',[data.group])).rows[0];if(group.data.students>data.capacity)fail(400,'Auditoriya sig‘imi guruh talabalaridan kam.');
  }
  return data;
 }
 app.post('/api/records/:module',async(req,res)=>{allow(req,'ADMIN','OPERATOR');const module=req.params.module;if(['rules','work_types'].includes(module))allow(req,'ADMIN');const result=await transaction(pool,async c=>{await c.query('SELECT pg_advisory_xact_lock(731204)');const data=await validate(c,module,req.body?.data,'00000000-0000-0000-0000-000000000000');await guard(c,req,{id:'new',module,data});await guardReferences(c,req,module,data);const {rows}=await c.query('INSERT INTO portal.records(module,code,data,author_id,source_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[module,data.code,JSON.stringify(data),req.user.id,token()]);await snapshot(c,rows[0],req.user.id);await audit(c,req.user.id,'CREATE',rows[0].id,{module,revision:1});return rows[0];});res.status(201).json(result);});
 app.put('/api/records/:id',async(req,res)=>{allow(req,'ADMIN','OPERATOR');if(!uuid(req.params.id))fail(400,'Yozuv ID noto‘g‘ri.');const result=await transaction(pool,async c=>{await c.query('SELECT pg_advisory_xact_lock(731204)');const old=(await c.query('SELECT * FROM portal.records WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!old)fail(404,'Yozuv topilmadi.');if(old.data._excluded)fail(409,'Bu reja qatori tarixga o‘tkazilgan.');await guard(c,req,old);if(['rules','work_types'].includes(old.module))allow(req,'ADMIN');if(!['DRAFT','REJECTED'].includes(old.status))fail(409,'Yuborilgan yoki tasdiqlangan yozuvni tahrirlab bo‘lmaydi.');if(req.body.revision!==old.revision)fail(409,'Yozuv boshqa xodim tomonidan o‘zgartirilgan. Yangilang.');const data=await validate(c,old.module,req.body.data,old.id);await guard(c,req,{...old,data});await guardReferences(c,req,old.module,data);const {rows}=await c.query("UPDATE portal.records SET code=$1,data=$2,revision=revision+1,updated_at=now(),status='DRAFT' WHERE id=$3 RETURNING *",[data.code,JSON.stringify(data),old.id]);await snapshot(c,rows[0],req.user.id);await audit(c,req.user.id,'UPDATE',old.id,{module:old.module,revision:rows[0].revision});return rows[0];});res.json(result);});
 app.post('/api/records/:id/workflow',async(req,res)=>{if(!uuid(req.params.id))fail(400,'ID noto‘g‘ri.');const {action,revision,reason}=req.body||{};if(!['submit','approve','reject'].includes(action))fail(400,'Amal noto‘g‘ri.');if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)fail(400,'Kamida 5 belgili asos kiriting.');const result=await transaction(pool,async c=>{await c.query('SELECT pg_advisory_xact_lock(731204)');const old=(await c.query('SELECT * FROM portal.records WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!old)fail(404,'Yozuv topilmadi.');if(old.data._excluded)fail(409,'Bu reja qatori tarixga o‘tkazilgan.');await guard(c,req,old);await guardReferences(c,req,old.module,old.data);if(old.revision!==revision)fail(409,'Versiya o‘zgardi. Sahifani yangilang.');if(action==='submit'){allow(req,'ADMIN','OPERATOR');if(['rules','work_types'].includes(old.module))allow(req,'ADMIN');if(!['DRAFT','REJECTED'].includes(old.status))fail(409,'Yozuv yuborishga tayyor emas.');}
  else{allow(req,'APPROVER');if(old.status!=='SUBMITTED')fail(409,'Yozuv ko‘rib chiqishga yuborilmagan.');await ensureAssignedReviewer(c,req.user,old);if(old.author_id===req.user.id)fail(403,'Muallif o‘z yozuvini tasdiqlay olmaydi.');if(action==='approve'){try{old.data._approval=approvalSnapshot(old,await allRecords(c));}catch(e){fail(422,e.message);}}
   if(action==='approve'&&old.module==='rules'){const overlap=await c.query("SELECT id FROM portal.records WHERE module='rules' AND status='APPROVED' AND data->>'scope'=$1 AND (data->>'effectiveFrom')::date <= $2::date AND (data->>'effectiveTo')::date >= $3::date",[old.data.scope,old.data.effectiveTo,old.data.effectiveFrom]);const typed=(await allRecords(c)).filter(r=>r.module==='rules'&&r.status==='APPROVED'&&r.data.calculation&&old.data.calculation&&(r.data.department||'')===(old.data.department||'')&&(r.data.year||'')===(old.data.year||'')&&r.data.effectiveFrom<=old.data.effectiveTo&&r.data.effectiveTo>=old.data.effectiveFrom);if(overlap.rows.length||typed.length)fail(409,'Bu doira va davr uchun tasdiqlangan me’yor mavjud.');}}
  const status={submit:'SUBMITTED',approve:'APPROVED',reject:'REJECTED'}[action];const {rows}=await c.query('UPDATE portal.records SET status=$1,approved_by=$2,revision=revision+1,updated_at=now(),data=$4 WHERE id=$3 RETURNING *',[status,action==='approve'?req.user.id:null,old.id,JSON.stringify(old.data)]);await snapshot(c,rows[0],req.user.id);await audit(c,req.user.id,action.toUpperCase(),old.id,{reason:reason.trim(),module:old.module,revision:rows[0].revision});return rows[0];});res.json(result);});
 registerCalculationHistory(app,{pool,fail,allRecords});
 registerManagement(app,{pool,allow,fail,allRecords});
 registerReportExports(app,{pool,fail,allRecords});
 app.post('/api/simulate',async(req,res)=>{
  const {credits,groups,lectureStreams,hoursPerCredit,contactBasisPoints,lectureBasisPoints}=req.body||{};
  if(typeof credits!=='string'||credits.length>12||typeof hoursPerCredit!=='string'||hoursPerCredit.length>12||Number(credits)>60||Number(hoursPerCredit)>1000||groups>1000||lectureStreams>1000)fail(400,'Hisoblash qiymatlari chegaradan tashqarida.');
  const input={credits,hoursPerCredit,groups,lectureStreams,contactBasisPoints,lectureBasisPoints};let result;
  try{result=computeDemoCourse({credits,groups,lectureStreams},{...demoRule,parameters:{hoursPerCredit,contactBasisPoints,lectureBasisPoints}});}catch{fail(400,'Hisoblash parametrlarini tekshiring.');}
  res.json(await saveCalculation(pool,req,{kind:'SIMULATION',input,result}));
 });
 registerExtensions(app,{pool,allow,fail,validate,snapshot,guard,guardReferences,allRecords});
 app.use('/api',(_req,_res)=>fail(404,'API manzil topilmadi.'));
 app.use(express.static(root,{index:'index.html',dotfiles:'deny',maxAge:0}));
 app.use((err,_req,res,_next)=>{let status=err.status||500;let message=err.status?err.message:'Server xatosi. Qayta urinib ko‘ring.';if(err.code==='23505'){status=409;message='Bu kod yoki email allaqachon mavjud.';}if(status>=500)console.error('request failed',{code:err.code||'INTERNAL',name:err.name});res.status(status).json({error:message});});
 return app;
}
