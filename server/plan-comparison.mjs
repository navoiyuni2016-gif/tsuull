import {createHash} from 'node:crypto';
import {computeAcademicCourse} from '../packages/domain/src/academic.mjs';
import {toScaled,fromScaled} from '../packages/domain/src/core.mjs';

const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status});};
const metrics=['totalStudentHours','contactHoursPerStudent','independentHoursPerStudent','lecture','practice','seminar','lab','individual'];
export function revisionPlanItems(plan,all){
 if(plan.status==='APPROVED'){
  if(!Array.isArray(plan.data._approval?.items))fail('Tasdiqlangan rejaning saqlangan tarkibi topilmadi.');
  const sources=new Map(all.filter(r=>r.module==='plan_items').map(r=>[r.id,r.source_id]));
  return plan.data._approval.items.map(item=>{
   const sourceId=sources.get(item.id);if(!sourceId)fail('Reja fanining manbasi topilmadi.');
   return {...item,source_id:sourceId};
  });
 }
 return all.filter(r=>r.module==='plan_items'&&!r.data._excluded&&r.data.curriculum===plan.id);
}
export const signedDifference=(oldValue,newValue)=>{
 if(oldValue===null||newValue===null)return null;
 const n=toScaled(newValue)-toScaled(oldValue);return n<0n?'-'+fromScaled(-n):n>0n?'+'+fromScaled(n):'0';
};
export function planState(plan,all){
 if(!plan||plan.module!=='curricula')fail('O‘quv reja topilmadi.',404);
 const map=new Map(all.map(r=>[r.id,r])),frozen=plan.status==='APPROVED',approval=plan.data._approval;
 if(frozen&&!Array.isArray(approval?.items))fail('Tasdiqlangan rejaning saqlangan tarkibi topilmadi.');
 const items=revisionPlanItems(plan,all);
 const currentRule=map.get(frozen?approval.rule?.id:plan.data.rule);
 if(frozen&&(!currentRule||currentRule.status!=='APPROVED'||currentRule.revision!==approval.rule?.revision))fail('Tasdiqlangan reja me’yorining manbasi topilmadi.');
 const rule=frozen&&approval.rule?{...currentRule,id:approval.rule.id,revision:approval.rule.revision,data:approval.rule.data}:currentRule;
 const requiredIds=new Set([plan.id,plan.data.year,plan.data.department,rule?.id].filter(Boolean));
 const issues=[],rows=[];
 for(const item of items){
  const subject=map.get(item.data.subject);
  if(!subject||subject.module!=='subjects')fail('Reja fanining manbasi topilmadi.');
  // Approved course records are immutable; never substitute a newer course revision.
  if(frozen&&subject.status!=='APPROVED')fail('Tasdiqlangan reja fanining o‘zgarmas manbasi topilmadi.');
  requiredIds.add(subject.id);requiredIds.add(subject.data.department);
  let hours=null;
  try{const c=computeAcademicCourse({credits:subject.data.credits,students:0,onDate:plan.data.onDate},rule);hours=Object.fromEntries(metrics.map(k=>[k,c[k]??c.activityHours[k]]));}
  catch{issues.push('Tasdiqlangan me’yor yoki hisob sanasi yetishmagani uchun soatlar ko‘rsatilmagan.');}
  try{toScaled(subject.data.credits);}catch{fail('Fan kreditining saqlangan qiymati noto‘g‘ri.');}
  rows.push({itemId:item.id,itemRevision:item.revision,subjectId:subject.id,subjectRevision:subject.revision,lineage:subject.source_id||subject.id,code:subject.code,name:subject.data.name,rowName:item.data.name||subject.data.name,credits:subject.data.credits,semester:item.data.semester,hours});
 }
 rows.sort((a,b)=>a.semester-b.semester||a.code.localeCompare(b.code));
 const totals={credits:fromScaled(rows.reduce((n,r)=>n+toScaled(r.credits),0n))};
 for(const key of metrics)totals[key]=rows.every(r=>r.hours!==null)?fromScaled(rows.reduce((n,r)=>n+toScaled(r.hours[key]),0n)):null;
 const metadata={id:plan.id,code:plan.code,name:plan.data.name,revision:plan.revision,status:plan.status,yearName:map.get(plan.data.year)?.data.name||'',departmentName:map.get(plan.data.department)?.data.name||'',ruleCode:rule?.code||'',ruleLegalBasis:rule?.data.legalBasis||'',sourceId:plan.source_id,authorId:plan.author_id,updatedAt:plan.updated_at,year:plan.data.year,department:plan.data.department,level:plan.data.level,mode:plan.data.mode,onDate:plan.data.onDate,ruleId:rule?.id||null,ruleRevision:rule?.revision||null};
 return {metadata,rows,totals,frozen,issues:[...new Set(issues)],requiredIds:[...requiredIds].filter(Boolean),fingerprint:createHash('sha256').update(JSON.stringify({metadata,rows})).digest('hex')};
}
export function comparePlans(left,right){
 const used=new Set(),rows=[],count=(state,key)=>state.rows.filter(r=>r.lineage===key).length;
 for(const old of left.rows){
  const exact=right.rows.find(r=>r.subjectId===old.subjectId&&!used.has(r.itemId));
  const next=exact||(count(left,old.lineage)===1&&count(right,old.lineage)===1?right.rows.find(r=>r.lineage===old.lineage&&!used.has(r.itemId)):null);
  if(!next){rows.push({kind:'REMOVED',old,next:null,changed:[],deltas:null});continue;}
  used.add(next.itemId);
  const changed=['code','name','credits','semester'].filter(k=>k==='credits'?toScaled(old[k])!==toScaled(next[k]):k==='name'?old.name!==next.name||old.rowName!==next.rowName:String(old[k])!==String(next[k]));
  if(JSON.stringify(old.hours)!==JSON.stringify(next.hours))changed.push('hours');
  rows.push({kind:changed.length?'CHANGED':'UNCHANGED',old,next,changed,deltas:{credits:signedDifference(old.credits,next.credits),...Object.fromEntries(metrics.map(k=>[k,signedDifference(old.hours?.[k]??null,next.hours?.[k]??null)]))}});
 }
 for(const next of right.rows)if(!used.has(next.itemId))rows.push({kind:'ADDED',old:null,next,changed:[],deltas:null});
 const summary=Object.fromEntries(['ADDED','REMOVED','CHANGED','UNCHANGED'].map(k=>[k,rows.filter(r=>r.kind===k).length]));
 const issues=[...left.issues,...right.issues];
 if(left.metadata.department!==right.metadata.department||left.metadata.year!==right.metadata.year)issues.push('Tanlangan rejalar turli kafedra yoki o‘quv yiliga tegishli.');
 if([...left.rows,...right.rows].some(r=>count(left,r.lineage)>1||count(right,r.lineage)>1))issues.push('Bir manbali fan versiyalari takrorlangan; ular avtomatik birlashtirilmadi.');
 return {left,right,rows,summary,issues:[...new Set(issues)],deltas:Object.fromEntries(['credits',...metrics].map(k=>[k,signedDifference(left.totals[k],right.totals[k])]))};
}
