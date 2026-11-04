import {changeReason} from './academic-controls.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {transaction,audit} from './db.mjs';
import {visible} from './scopes.mjs';
import {computeAcademicCourse,validateCurriculum,recommendSemesters} from '../packages/domain/src/academic.mjs';
import {toScaled,fromScaled} from '../packages/domain/src/core.mjs';
import {localAiConfig,suggestLocalPlan} from './local-ai.mjs';

export function analyzePlan(items,subjects,rule,onDate){
  const map=new Map(subjects.map(s=>[s.id,s]));
  const totals={credits:0n,totalStudentHours:0n,contactHoursPerStudent:0n,independentHoursPerStudent:0n};
  const terms={};
  const rows=items.map(item=>{
    const s=map.get(item.subject);
    const calculation=computeAcademicCourse({credits:s.data.credits,students:0,onDate},rule);
    totals.credits+=toScaled(s.data.credits);
    for(const k of Object.keys(totals).filter(k=>k!=='credits'))totals[k]+=toScaled(calculation[k]);
    terms[item.semester]=(terms[item.semester]||0n)+toScaled(s.data.credits);
    return {...item,code:s.code,name:s.data.name,credits:s.data.credits,calculation};
  });
  const issues=[];
  try{validateCurriculum(items,map,rule.data.calculation);}catch(e){issues.push(e.message);}
  return {rows,totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,fromScaled(v)])),terms:Object.fromEntries(Object.entries(terms).map(([k,v])=>[k,fromScaled(v)])),issues,ready:issues.length===0,rule:{id:rule.id,revision:rule.revision,legalBasis:rule.data.legalBasis}};
}
export function registerPlanStudio(app,ctx){
  const {pool,allow,fail,guard,guardReferences,allRecords,validate,snapshot}=ctx;
  async function context(c,req,{write=false}={}){
    const all=await allRecords(c),parent=all.find(r=>r.id===req.params.id&&r.module==='curricula');
    await guard(c,req,parent);
    if(write){allow(req,'ADMIN','OPERATOR');if(!['DRAFT','REJECTED'].includes(parent.status))fail(409,'Reja tahrirlash holatida emas.');await guardReferences(c,req,'curricula',parent.data);}
    const rule=all.find(r=>r.id===parent.data.rule&&r.module==='rules');
    if(!rule)fail(422,'Avval reja uchun tasdiqlangan hisoblash me’yorini tanlang.');
    await guard(c,req,rule);
    if(rule.data.department&&rule.data.department!==parent.data.department||rule.data.year&&rule.data.year!==parent.data.year)fail(422,'Reja va me’yor doirasi mos emas.');
    const year=all.find(r=>r.id===parent.data.year&&r.module==='years');
    if(!year||!parent.data.onDate||parent.data.onDate<year.data.start||parent.data.onDate>year.data.end)fail(422,'Hisob sanasi o‘quv yilida bo‘lsin.');
    try{computeAcademicCourse({credits:'1',students:0,onDate:parent.data.onDate},rule);}catch(e){fail(422,e.message);}
    const subjects=all.filter(r=>r.module==='subjects'&&r.data.department===parent.data.department&&visible(r,req.user,all));
    const stored=all.filter(r=>r.module==='plan_items'&&!r.data._excluded&&r.data.curriculum===parent.id).sort((a,b)=>a.data.semester-b.data.semester||a.code.localeCompare(b.code));
    // A parent revision plus all child revisions detects edits from any existing UI/API.
    const version=createHash('sha256').update(JSON.stringify([parent.revision,stored.map(r=>[r.id,r.revision]).sort()])).digest('hex');
    return {all,parent,rule,subjects,stored,version,locked:year.locked||year.data.periodState==='LOCKED'};
  }
  function itemsFor(req,x){
    const rows=req.body?.items;
    if(!Array.isArray(rows)||rows.length>500)fail(400,'0–500 ta reja qatori kerak.');
    const seen=new Set();
    return rows.map(row=>{
      if(!row||typeof row!=='object'||!Number.isInteger(row.semester)||row.semester<1||row.semester>x.rule.data.calculation.termCount)fail(400,'Semestr me’yor oralig‘ida bo‘lsin.');
      const s=x.subjects.find(s=>s.id===row.subject);
      if(!s||s.status!=='APPROVED')fail(422,'Fan shu kafedraga tegishli va tasdiqlangan bo‘lsin.');
      if(seen.has(s.id))fail(400,'Rejada fan takrorlangan.');seen.add(s.id);
      return {subject:s.id,semester:row.semester};
    });
  }
  app.get('/api/curricula/:id/studio',async(req,res)=>{
    const x=await transaction(pool,c=>context(c,req));let ai;
    try{const cfg=localAiConfig();ai={configured:cfg.configured,model:cfg.model||''};}catch{ai={configured:false,model:''};}
    res.json({parent:x.parent,version:x.version,locked:x.locked,subjects:x.subjects.filter(s=>s.status==='APPROVED'),items:x.stored.map(r=>({subject:r.data.subject,semester:r.data.semester})),ai});
  });
  app.post('/api/curricula/:id/studio/preview',async(req,res)=>{
    const result=await transaction(pool,async c=>{const x=await context(c,req);const items=itemsFor(req,x);return analyzePlan(items,x.subjects,x.rule,x.parent.data.onDate);});res.json(result);
  });
  app.put('/api/curricula/:id/studio',async(req,res)=>{
    const result=await transaction(pool,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(731204)');const x=await context(c,req,{write:true});
      if(req.body?.version!==x.version)fail(409,'Reja yoki uning qatorlari boshqa xodim tomonidan o‘zgartirilgan. Qayta oching.');
      const items=itemsFor(req,x);
      if(x.stored.some(r=>!['DRAFT','REJECTED'].includes(r.status)))fail(409,'Reja qatorlari tahrirlash holatida emas.');
      let suggestion=null;
      if(req.body.suggestionId){
        suggestion=(await c.query("SELECT id,details FROM portal.audit WHERE id::text=$1 AND actor_id=$2 AND entity_id=$3 AND action='AI_PLAN_SUGGESTED'",[String(req.body.suggestionId),req.user.id,x.parent.id])).rows[0];
        if(!suggestion)fail(400,'AI tavsiyasi manbasi topilmadi.');
        if(suggestion.details.version!==x.version)fail(409,'AI tavsiyasidan keyin reja o‘zgargan. Qayta tavsiya oling.');
      }
      for(const old of x.stored.filter(r=>!items.some(i=>i.subject===r.data.subject))){
        const removed=(await c.query("UPDATE portal.records SET data=jsonb_set(data,'{_excluded}','true'::jsonb),revision=revision+1,status='DRAFT',updated_at=now() WHERE id=$1 RETURNING *",[old.id])).rows[0];
        await snapshot(c,removed,req.user.id);await audit(c,req.user.id,'PLAN_STUDIO_ROW_REMOVED',old.id,{parent:x.parent.id});
      }
      for(const item of items){
        const old=x.stored.find(r=>r.data.subject===item.subject),s=x.subjects.find(s=>s.id===item.subject);
        if(old&&old.data.semester===item.semester)continue;
        const id=old?.id||randomUUID();
        const input={...(old?.data||{}),code:old?.code||'PLAN-'+randomUUID().slice(0,18).toUpperCase(),name:s.data.name,curriculum:x.parent.id,...item};
        const data=await validate(c,'plan_items',input,id);await guardReferences(c,req,'plan_items',data);
        const r=old?(await c.query("UPDATE portal.records SET data=$1,revision=revision+1,status='DRAFT',updated_at=now() WHERE id=$2 RETURNING *",[JSON.stringify(data),id])).rows[0]:(await c.query("INSERT INTO portal.records(id,module,code,data,author_id,source_id) VALUES($1,'plan_items',$2,$3,$4,$5) RETURNING *",[id,data.code,JSON.stringify(data),req.user.id,x.parent.source_id])).rows[0];
        await snapshot(c,r,req.user.id);await audit(c,req.user.id,'PLAN_STUDIO_ROW',r.id,{parent:x.parent.id,suggestionId:suggestion?.id||null});
      }
      const parent=(await c.query("UPDATE portal.records SET revision=revision+1,status='DRAFT',updated_at=now() WHERE id=$1 RETURNING *",[x.parent.id])).rows[0];
      await snapshot(c,parent,req.user.id);await audit(c,req.user.id,'PLAN_STUDIO_SAVED',parent.id,{count:items.length,suggestionId:suggestion?.id||null,reason:changeReason(req.body.reason)});
      return {saved:true,parent,analysis:analyzePlan(items,x.subjects,x.rule,x.parent.data.onDate)};
    });res.json(result);
  });
  app.post('/api/curricula/:id/ai-suggest',rateLimit({windowMs:600000,limit:4,keyGenerator:req=>req.user.id,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'AI so‘rovlari limiti. Keyinroq qayta urinib ko‘ring.'}}),async(req,res)=>{
    // Do not hold a database transaction while a model is generating.
    const x=await transaction(pool,c=>context(c,req,{write:true}));
    const ids=req.body?.subjectIds,instruction=req.body?.instruction||'';
    if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length||typeof instruction!=='string'||instruction.length>2000)fail(400,'1–100 ta noyob fan va 2000 belgigacha topshiriq kerak.');
    const subjects=ids.map(id=>x.subjects.find(s=>s.id===id&&s.status==='APPROVED'));
    if(subjects.some(s=>!s))fail(422,'Tasdiqlangan va vakolatingizdagi fanlarni tanlang.');
    try{recommendSemesters(subjects,x.rule.data.calculation);}catch(e){fail(422,e.message);}
    const proposal=await suggestLocalPlan({subjects,parameters:x.rule.data.calculation,instruction});
    const suggestionId=await transaction(pool,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(731204)');const fresh=await context(c,req,{write:true});
      if(fresh.version!==x.version)fail(409,'AI ishlayotgan paytda reja o‘zgargan. Qayta urining.');
      const details={version:x.version,model:proposal.model,rule:{id:x.rule.id,revision:x.rule.revision},subjects:subjects.map(s=>({id:s.id,revision:s.revision})),items:proposal.items,instructionHash:createHash('sha256').update(instruction).digest('hex')};
      const r=await c.query("INSERT INTO portal.audit(actor_id,action,entity_id,details) VALUES($1,'AI_PLAN_SUGGESTED',$2,$3) RETURNING id",[req.user.id,x.parent.id,JSON.stringify(details)]);return r.rows[0].id;
    });
    res.json({...proposal,suggestionId,advisoryOnly:true,version:x.version});
  });
}
