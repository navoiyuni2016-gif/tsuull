import {transaction} from './db.mjs';
import {visible} from './scopes.mjs';
import {planState,comparePlans} from './plan-comparison.mjs';
import {documentHtml,escapeHtml} from './print-document.mjs';
import {createTranslator,languages} from '../public/i18n.mjs';
import {scheduleBinding,reconcileSchedule} from './schedule-calculation.mjs';

const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function changeReason(value){
 if(value===undefined||value===null)return '';
 if(typeof value!=='string'||value.length>1000)throw Object.assign(new Error('O‘zgarish sababi 1000 belgidan oshmasin.'),{status:400});
 return value.trim();
}
export function planComparisonHtml(result,profile,lang){
 const t=createTranslator(lang),e=escapeHtml,n=v=>v??'—',labels={ADDED:'Qo‘shilgan',REMOVED:'Olib tashlangan',CHANGED:'O‘zgargan',UNCHANGED:'O‘zgarishsiz'};
 const card=s=>'<h2>'+e(s.metadata.code+' · '+s.metadata.name)+'</h2><p>'+e(t(s.metadata.status))+' · v'+s.metadata.revision+' · '+e(s.metadata.authorName||'—')+'</p><p>'+e(t('O‘zgarish sababi'))+': '+e(s.metadata.lastChange?.reason||t('Sabab ko‘rsatilmagan.'))+'</p>';
 const headers=['Farq','Eski fan','Yangi fan','Eski semestr','Yangi semestr','Eski kredit','Yangi kredit','Eski talaba soati','Yangi talaba soati'];
 const hours={totalStudentHours:'Talaba jami soati',contactHoursPerStudent:'Auditoriya / talaba',independentHoursPerStudent:'Mustaqil ta’lim / talaba',lecture:'Ma’ruza / talaba',practice:'Amaliy / talaba',seminar:'Seminar / talaba',lab:'Laboratoriya / talaba',individual:'Individual / talaba'};
 const hourChanges=result.rows.flatMap(r=>Object.entries(hours).filter(([k])=>r.old?.hours?.[k]!==r.next?.hours?.[k]).map(([k,label])=>[r.next?.code||r.old?.code,t(label),n(r.old?.hours?.[k]),n(r.next?.hours?.[k])]));
 const content=card(result.left)+card(result.right)+'<p>'+e(t('Jami kredit'))+': '+e(result.left.totals.credits)+' → '+e(result.right.totals.credits)+' ('+e(result.deltas.credits)+')</p><table><thead><tr>'+headers.map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+result.rows.map(r=>'<tr>'+[t(labels[r.kind]),r.old?r.old.code+' · '+r.old.name:'—',r.next?r.next.code+' · '+r.next.name:'—',n(r.old?.semester),n(r.next?.semester),n(r.old?.credits),n(r.next?.credits),n(r.old?.hours?.totalStudentHours),n(r.next?.hours?.totalStudentHours)].map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(hourChanges.length?'<h2>'+e(t('Soatlar bo‘yicha farqlar'))+'</h2><p>'+e(t('Soatlar bir talaba uchun ko‘rsatilgan. Bu o‘qituvchiga taqsimlangan yuklama emas.'))+'</p><table><thead><tr>'+['Fan','Ko‘rsatkich','Eski reja','Yangi reja'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+hourChanges.map(row=>'<tr>'+row.map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'')+result.issues.map(v=>'<p>'+e(t(v))+'</p>').join('');
 return documentHtml({lang,profile,title:t('Reja versiyalarini taqqoslash'),reference:'CMP-'+result.left.fingerprint.slice(0,8)+'-'+result.right.fingerprint.slice(0,8),createdAt:new Date(),status:t('TAHLILIY SOLISHTIRISH'),notice:t('Solishtirish akademik tasdiq o‘rnini bosmaydi.'),content,orientation:'landscape'});
}
export function registerAcademicControls(app,{pool,fail,allRecords}){
 app.post('/api/controls/schedule/preview',async(req,res)=>{
  const data=req.body||{},all=await allRecords(pool),map=new Map(all.map(r=>[r.id,r]));
  for(const [key,module]of Object.entries({workload:'workloads',timeRule:'rules',group:'groups',teacher:'teachers'}))if(!uuid(data[key])||map.get(data[key])?.module!==module||!visible(map.get(data[key]),req.user,all))fail(404,'Jadval manbasi topilmadi yoki vakolat doirasidan tashqarida.');
  const result=scheduleBinding(data,all);if(!result)fail(400,'Yuklama va juftlik qoidasini tanlang.');res.json(result);
 });
 app.get('/api/controls/schedule/reconcile',async(req,res)=>{
  const filters={},filterModules={year:'years',department:'departments',teacher:'teachers',subject:'subjects',group:'groups'},format=req.query.format||'json',lang=req.query.lang||'uz';
  if(!['json','html'].includes(format)||!languages.some(l=>l.id===lang))fail(400,'Eksport formati yoki tili noto‘g‘ri.');
  const result=await transaction(pool,async c=>{
   await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
   const all=await allRecords(c),map=new Map(all.map(r=>[r.id,r])),canSee=r=>visible(r,req.user,all);
   for(const [key,module]of Object.entries(filterModules))if(req.query[key]){
    if(!uuid(req.query[key])||map.get(req.query[key])?.module!==module||!canSee(map.get(req.query[key])))fail(404,'Filtr manbasi topilmadi yoki vakolat doirasidan tashqarida.');
    filters[key]=req.query[key];
   }
   return reconcileSchedule(all,filters,canSee);
  });
  if(format==='html'){
   const profile=(await pool.query('SELECT profile FROM portal.settings WHERE id=true')).rows[0]?.profile||{};
   const t=createTranslator(lang),e=escapeHtml,headers=['O‘qituvchi','Fan','Guruh','Tasdiqlangan yuklama','Jadvaldagi tasdiqlangan soat','Tasdiq kutayotgan soat','Yetishmaydi','Ortiqcha','Tekshirilgan fakt'];
   const content='<table><thead><tr>'+headers.map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+result.rows.map(r=>'<tr>'+[r.teacherName,r.subjectName,r.groupName,r.plannedHours,r.scheduledHours,r.pendingHours,r.gapHours,r.excessHours,r.verifiedHours].map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+result.diagnostics.map(r=>'<p>'+e(r.code)+' · '+e(t(r.reason))+'</p>').join('');
   return res.type('html').send(documentHtml({lang,profile,title:t('Jadval va yuklama nazorati'),reference:'SCH-'+Date.now(),createdAt:new Date(),status:t('TAHLILIY SOLISHTIRISH'),notice:t('Jadval soati fakt ijro emas. Faqat bog‘langan va tasdiqlangan mashg‘ulotlar jamlanadi.'),content,orientation:'landscape'}));
  }
  res.json(result);
 });
 app.get('/api/controls/plans/compare',async(req,res)=>{
  const {left,right}=req.query,format=req.query.format||'json',lang=req.query.lang||'uz';
  if(!uuid(left)||!uuid(right)||left===right)fail(400,'Taqqoslash uchun ikkita turli rejani tanlang.');
  if(!['json','html'].includes(format)||!languages.some(l=>l.id===lang))fail(400,'Eksport formati yoki tili noto‘g‘ri.');
  const result=await transaction(pool,async c=>{
   await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
   const all=await allRecords(c),map=new Map(all.map(r=>[r.id,r]));
   const states=[];
   for(const id of [left,right]){
    const plan=map.get(id);if(plan?.module!=='curricula'||!visible(plan,req.user,all))fail(404,'O‘quv reja topilmadi.');
    const state=planState(plan,all);
    if(state.requiredIds.some(id=>!visible(map.get(id),req.user,all)))fail(404,'Reja manbalari vakolat doirangizdan tashqarida.');
    const author=(await c.query('SELECT name FROM portal.users WHERE id=$1',[plan.author_id])).rows[0];
    const itemIds=state.frozen?[]:state.rows.map(r=>r.itemId);
    const events=(await c.query("SELECT a.action,a.entity_id,a.details,a.occurred_at,u.name actor FROM portal.audit a LEFT JOIN portal.users u ON u.id=a.actor_id WHERE (a.entity_id=$1 OR (a.entity_id=ANY($3::text[]) AND (a.details->>'parent'=$1 OR EXISTS (SELECT 1 FROM portal.record_versions v WHERE v.record_id::text=a.entity_id AND (v.revision::text=a.details->>'revision' OR (a.action='IMPORT_ROW' AND v.revision=1)) AND v.data->>'curriculum'=$1)))) AND a.action=ANY($2::text[]) ORDER BY a.id DESC LIMIT 10",[id,['CREATE','UPDATE','IMPORT_ROW','REVISION_CREATED','PLAN_STUDIO_SAVED','PLAN_STUDIO_ROW','PLAN_STUDIO_ROW_REMOVED','CURRICULUM_GENERATED','SUBMIT','APPROVE','REJECT'],itemIds])).rows;
    const changes=events.map(v=>({action:v.action,entityId:v.entity_id,actor:v.actor,at:v.occurred_at,reason:typeof v.details.reason==='string'?v.details.reason:''}));
    state.metadata={...state.metadata,authorName:author?.name||'',updatedAt:changes[0]?.at||state.metadata.updatedAt,lastChange:changes[0]||null,changes};states.push(state);
   }
   return comparePlans(...states);
  });
  if(format==='html'){
   const profile=(await pool.query('SELECT profile FROM portal.settings WHERE id=true')).rows[0]?.profile||{};
   return res.type('html').send(planComparisonHtml(result,profile,lang));
  }
  res.json(result);
 });
}
