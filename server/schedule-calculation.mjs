import {toScaled,fromScaled} from '../packages/domain/src/core.mjs';
const indexes=new WeakMap();
const recordIndex=all=>{let map=indexes.get(all);if(!map){map=new Map(all.map(r=>[r.id,r]));indexes.set(all,map);}return map;};
const error=message=>Object.assign(new Error(message),{status:400});
const clock=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const minute=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
export function validateSchedulePolicy(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='periods')||!Array.isArray(value.periods)||!value.periods.length||value.periods.length>32)throw error('Juftliklar qoidasi shakli noto‘g‘ri.');
 const periods=value.periods.map(p=>{
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['start','end','academicHours'].includes(k))||!clock(p.start)||!clock(p.end)||p.start>=p.end)throw error('Juftlik boshlanishi va tugashini tekshiring.');
  let h;try{h=toScaled(p.academicHours);}catch{throw error('Juftlikning akademik soatini aniq son bilan kiriting.');}
  if(h<=0n||h>100000000n)throw error('Juftlikning akademik soati chegaradan tashqarida.');
  return {start:p.start,end:p.end,academicHours:fromScaled(h)};
 }).sort((a,b)=>a.start.localeCompare(b.start));
 for(let i=1;i<periods.length;i++)if(periods[i-1].end>periods[i].start)throw error('Juftlik vaqtlari ustma-ust tushmasin.');
 if(periods.reduce((n,p)=>n+toScaled(p.academicHours),0n)>100000000n)throw error('Kunlik juftlik soatlari chegaradan tashqarida.');
 return {periods};
}
export function calculateScheduleTime({date,start,end},rule){
 if(!rule||rule.module!=='rules'||rule.status!=='APPROVED'||!rule.approved_by||rule.approved_by===rule.author_id||!rule.data.legalBasis)throw error('Alohida tasdiqlangan juftlik qoidasini tanlang.');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date<rule.data.effectiveFrom||date>rule.data.effectiveTo)throw error('Mashg‘ulot sanasi juftlik qoidasining amal qilish davrida bo‘lsin.');
 if(!clock(start)||!clock(end)||start>=end)throw error('Mashg‘ulot vaqtini tekshiring.');
 const policy=validateSchedulePolicy(rule.data.scheduleCalculation),periods=policy.periods.filter(p=>p.start>=start&&p.end<=end);
 if(!periods.length||periods[0].start!==start||periods.at(-1).end!==end)throw error('Avtomatik hisob uchun tasdiqlangan to‘liq juftlik vaqtini tanlang.');
 const academicHours=fromScaled(periods.reduce((h,p)=>h+toScaled(p.academicHours),0n)),wallMinutes=minute(end)-minute(start),teachingMinutes=periods.reduce((n,p)=>n+minute(p.end)-minute(p.start),0);
 return {academicHours,wallMinutes,teachingMinutes,breakMinutes:wallMinutes-teachingMinutes,periodCount:periods.length,periods,rule:{id:rule.id,revision:rule.revision,legalBasis:rule.data.legalBasis}};
}
export function scheduleBinding(data,all){
 if(!data.workload&&!data.timeRule){if(data.academicHours)throw error('Akademik soat faqat yuklama va juftlik qoidasiga bog‘lab hisoblanadi.');return null;}
 const map=recordIndex(all),get=id=>map.get(id),load=get(data.workload),rule=get(data.timeRule);
 if(!load||load.module!=='workloads'||load.status!=='APPROVED'||!load.approved_by||load.approved_by===load.author_id)throw error('Tasdiqlangan yuklamani tanlang.');
 if(load.data.group!==data.group||load.data.teacher!==data.teacher)throw error('Jadvaldagi guruh va o‘qituvchi tanlangan yuklamaga mos emas.');
 const year=get(load.data.year),teacher=get(load.data.teacher),group=get(load.data.group),subject=get(load.data.subject);
 if(year?.module!=='years'||teacher?.module!=='teachers'||group?.module!=='groups'||subject?.module!=='subjects'||[teacher,group,subject].some(r=>r.status!=='APPROVED'))throw error('Yuklamaning tasdiqlangan fan, guruh va o‘qituvchi manbalarini tekshiring.');
 if(!year||data.date<year.data.start||data.date>year.data.end)throw error('Jadval sanasi yuklamaning o‘quv yilida bo‘lsin.');
 if(!rule?.data.year||rule.data.year!==load.data.year||rule.data.department&&rule.data.department!==teacher?.data.department)throw error('Juftlik qoidasining o‘quv yili yoki kafedra doirasi mos emas.');
 return {...calculateScheduleTime(data,rule),workload:{id:load.id,revision:load.revision}};
}
export function scheduleAncestors(record,all){
 const map=new Map(all.map(r=>[r.id,r])),ids=new Set();let cursor=record;
 while(cursor?.data._parent?.id){
  const parent=map.get(cursor.data._parent.id);
  if(!parent||parent.module!=='schedule'||parent.source_id!==record.source_id||ids.has(parent.id))break;
  ids.add(parent.id);cursor=parent;
 }
 return ids;
}
// Only an explicit approved descendant supersedes an approved lesson. Forks block sums.
export function effectiveSchedules(all){
 const schedules=all.filter(r=>r.module==='schedule'&&!r.data._excluded),groups=new Map(),active=[],pending=[],ambiguous=[],superseded=[];
 for(const r of schedules){const key=r.source_id||r.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 for(const group of groups.values()){
  const approved=group.filter(r=>r.status==='APPROVED'),ancestors=new Set(approved.flatMap(r=>[...scheduleAncestors(r,group)]));
  const leaves=approved.filter(r=>!ancestors.has(r.id));
  if(leaves.length>1)ambiguous.push(...leaves);else active.push(...leaves);
  superseded.push(...approved.filter(r=>ancestors.has(r.id)));
  const candidates=group.filter(r=>['DRAFT','SUBMITTED'].includes(r.status)),past=new Set(group.filter(r=>r.status!=='REJECTED').flatMap(r=>[...scheduleAncestors(r,group)]));
  pending.push(...candidates.filter(r=>!past.has(r.id)));
 }
 return {active,pending,ambiguous,superseded};
}
export function reconcileSchedule(all,filters={},canSee=()=>true){
 const sourceMap=recordIndex(all),get=id=>sourceMap.get(id),resolved=effectiveSchedules(all);
 const loads=all.filter(r=>r.module==='workloads'&&r.status==='APPROVED'&&!r.data._excluded&&canSee(r)&&['year','teacher','subject','group'].every(k=>get(r.data[k])&&canSee(get(r.data[k])))&&(!filters.year||r.data.year===filters.year)&&(!filters.teacher||r.data.teacher===filters.teacher)&&(!filters.group||r.data.group===filters.group)&&(!filters.subject||r.data.subject===filters.subject)&&(!filters.department||get(r.data.teacher)?.data.department===filters.department));
 const ids=new Set(loads.map(r=>r.id)),diagnostics=[];
 const results=loads.map(load=>({id:load.id,code:load.code,revision:load.revision,name:load.data.name,year:load.data.year,yearName:get(load.data.year)?.data.name||'',teacher:load.data.teacher,teacherName:get(load.data.teacher)?.data.name||'',subject:load.data.subject,subjectName:get(load.data.subject)?.data.name||'',group:load.data.group,groupName:get(load.data.group)?.data.name||'',activity:load.data.activity,plannedHours:load.data.hours,scheduledHours:'0',pendingHours:'0',verifiedHours:'0',gapHours:'0',excessHours:'0',lessons:[]}));
 const map=new Map(results.map(r=>[r.id,r]));
 const relevant=r=>{if(!canSee(r)||['group','teacher','workload','timeRule'].some(k=>r.data[k]&&(!get(r.data[k])||!canSee(get(r.data[k])))))return false;const d=r.data,group=get(d.group),teacher=get(d.teacher);return (!filters.year||group?.data.year===filters.year)&&(!filters.teacher||d.teacher===filters.teacher)&&(!filters.group||d.group===filters.group)&&(!filters.department||teacher?.data.department===filters.department)&&(!filters.subject||get(d.workload)?.data.subject===filters.subject);};
 for(const r of resolved.ambiguous.filter(relevant))diagnostics.push({id:r.id,code:r.code,name:r.data.name,status:r.status,date:r.data.date,reason:'Bir mashg‘ulotning parallel tasdiqlangan versiyalari bor; soatlari jamlanmadi.'});
 for(const [rows,key]of [[resolved.active,'scheduledHours'],[resolved.pending,'pendingHours']]){
  for(const r of rows){
   if(!relevant(r))continue;
   if(!r.data.workload||!r.data.timeRule){diagnostics.push({id:r.id,code:r.code,name:r.data.name,status:r.status,date:r.data.date,reason:'Mashg‘ulot yuklama va juftlik qoidasiga bog‘lanmagan.'});continue;}
   if(!ids.has(r.data.workload)){if(get(r.data.workload)?.status!=='APPROVED')diagnostics.push({id:r.id,code:r.code,name:r.data.name,status:r.status,date:r.data.date,reason:'Bog‘langan yuklama tasdiqlanmagan.'});continue;}
   try{
    const calculation=scheduleBinding(r.data,all),hours=r.status==='APPROVED'?r.data._approval?.academicHours:r.data._schedule?.academicHours;
    if(!calculation||!hours||toScaled(hours)!==toScaled(calculation.academicHours))throw error('Jadvalning saqlangan hisoblash manbasi mos emas.');
    const row=map.get(r.data.workload);row[key]=fromScaled(toScaled(row[key])+toScaled(hours));
    row.lessons.push({id:r.id,code:r.code,revision:r.revision,date:r.data.date,start:r.data.start,end:r.data.end,status:r.status,academicHours:hours,ruleId:calculation.rule.id,ruleRevision:calculation.rule.revision,breakMinutes:calculation.breakMinutes});
   }catch(ex){diagnostics.push({id:r.id,code:r.code,name:r.data.name,status:r.status,date:r.data.date,reason:ex.message});}
  }
 }
 for(const r of all.filter(r=>r.module==='actuals'&&r.status==='APPROVED'&&!r.data._excluded&&canSee(r)&&ids.has(r.data.workload))){const row=map.get(r.data.workload);row.verifiedHours=fromScaled(toScaled(row.verifiedHours)+toScaled(r.data._approval?.verifiedHours||r.data.hours));}
 for(const row of results){const gap=toScaled(row.plannedHours)-toScaled(row.scheduledHours);row.gapHours=fromScaled(gap>0n?gap:0n);row.excessHours=fromScaled(gap<0n?-gap:0n);row.lessons.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));}
 const totals=Object.fromEntries(['plannedHours','scheduledHours','pendingHours','verifiedHours','gapHours','excessHours'].map(k=>[k,fromScaled(results.reduce((n,r)=>n+toScaled(r[k]),0n))]));
 return {rows:results,totals,diagnostics,supersededCount:resolved.superseded.filter(relevant).length};
}
