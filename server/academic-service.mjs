import {computeAcademicCourse,validateParameters,validateCurriculum} from '../packages/domain/src/academic.mjs';
import {toScaled,fromScaled,timesInt} from '../packages/domain/src/core.mjs';
const activityKey={'Ma’ruza':'lecture','Amaliy':'practice','Seminar':'seminar','Laboratoriya':'lab'};
export function approvalSnapshot(record,all){
 const get=id=>all.find(r=>r.id===id);const d=record.data;let result={};
 const year=get(d.year);if(year&&(year.locked||year.data.periodState==='LOCKED'))throw new Error('Akademik yil yopilgan.');
 const rule=get(d.rule);
 function approvedRule(){if(!rule||rule.module!=='rules')throw new Error('Tasdiqlangan hisoblash me’yorini tanlang.');if(rule.data.department&&rule.data.department!==(d.department||get(d.teacher)?.data.department))throw new Error('Me’yor kafedra doirasi mos emas.');if(rule.data.year&&rule.data.year!==d.year)throw new Error('Me’yor o‘quv yili doirasi mos emas.');if(!year||!d.onDate||d.onDate<year.data.start||d.onDate>year.data.end)throw new Error('Hisob sanasi tanlangan o‘quv yilida bo‘lsin.');return rule;}
 if(record.module==='rules'&&d.calculation){validateParameters(d.calculation);result={engine:'academic-v1',calculation:d.calculation};}
 if(record.module==='curricula'){
  approvedRule();computeAcademicCourse({credits:'1',students:0,onDate:d.onDate},rule);
  const items=all.filter(r=>r.module==='plan_items'&&!r.data._excluded&&r.data.curriculum===record.id);const subjects=new Map(all.filter(r=>r.module==='subjects').map(r=>[r.id,r]));
  for(const item of items)if(subjects.get(item.data.subject)?.status!=='APPROVED')throw new Error('Rejadagi barcha fanlar tasdiqlangan bo‘lsin.');
  result={...validateCurriculum(items.map(r=>r.data),subjects,rule.data.calculation),items:items.map(r=>({id:r.id,revision:r.revision,data:r.data})),rule:{id:rule.id,revision:rule.revision,data:rule.data}};
 }
 if(record.module==='plan_items'){
  const parent=get(d.curriculum);if(parent?.status==='APPROVED')throw new Error('Tasdiqlangan rejaning fanlari o‘zgarmaydi.');
 }
 if(record.module==='workloads'){
  approvedRule();const subject=get(d.subject),group=get(d.group),teacher=get(d.teacher);
  if(!subject||!group||!teacher)throw new Error('Fan, guruh yoki o‘qituvchi topilmadi.');
  if(subject.status!=='APPROVED'||teacher.status!=='APPROVED'||group.status!=='APPROVED')throw new Error('Fan, guruh va o‘qituvchi tasdiqlangan bo‘lsin.');
  if(!String(teacher.data.competenceCodes||'').split(',').map(s=>s.trim()).includes(subject.code))throw new Error('O‘qituvchining fan kompetensiyasi tasdiqlanmagan.');if(teacher.data.language.toLocaleLowerCase()!==subject.data.language.toLocaleLowerCase())throw new Error('O‘qitish tili mos emas.');
  const calc=computeAcademicCourse({credits:subject.data.credits,students:group.data.students,onDate:d.onDate},rule);const expected=calc.teachingHours[activityKey[d.activity]];
  if(!expected||toScaled(d.hours)>toScaled(expected))throw new Error('Kiritilgan soat hisobdan katta. Shu mashg‘ulot uchun talab: '+(expected||'0')+' soat.');const allocations=all.filter(r=>r.id!==record.id&&r.module==='workloads'&&r.status==='APPROVED'&&['year','subject','group','activity'].every(k=>r.data[k]===d[k]));if(allocations.some(r=>r.data.rule!==d.rule))throw new Error('Bir mashg‘ulot taqsimotida bir xil me’yor versiyasi ishlatilishi kerak.');const assigned=allocations.reduce((sum,r)=>sum+toScaled(r.data.hours),toScaled(d.hours));if(assigned>toScaled(expected))throw new Error('O‘qituvchilar o‘rtasidagi jami taqsimot hisoblangan talabdan oshadi.');
  const total=all.filter(r=>r.id!==record.id&&['workloads','additional_work'].includes(r.module)&&r.status==='APPROVED'&&r.data.teacher===d.teacher&&r.data.year===d.year).reduce((s,r)=>s+toScaled(r.data.hours||r.data._approval?.hours||'0'),toScaled(d.hours));
  if(total>toScaled(teacher.data.capacityHours||rule.data.calculation.teacherAnnualLimit))throw new Error('O‘qituvchi uchun tasdiqlangan yillik limit oshadi.');
  result={calculation:calc,activityRequiredHours:expected,allocatedAtApproval:fromScaled(assigned),unallocatedAtApproval:fromScaled(toScaled(expected)-assigned),teacherSource:{id:teacher.id,revision:teacher.revision},subjectSource:{id:subject.id,revision:subject.revision},groupSource:{id:group.id,revision:group.revision}};
 }
 if(record.module==='additional_work'){
  const type=get(d.workType);if(!type||type.status!=='APPROVED'||d.date<type.data.effectiveFrom||d.date>type.data.effectiveTo)throw new Error('Sana uchun tasdiqlangan ish turi me’yori kerak.');
  if(type.data.unit==='FIXED_HOURS'&&d.quantity!==1)throw new Error('FIXED_HOURS uchun birliklar soni 1 bo‘lsin.');
  if(!rule||rule.status!=='APPROVED'||!rule.data.calculation)throw new Error('Qo‘shimcha ish uchun yillik limit me’yorini tanlang.');computeAcademicCourse({credits:'1',students:0,onDate:d.date},rule);const teacher=get(d.teacher);if(!teacher||teacher.status!=='APPROVED'||teacher.data.department!==d.department)throw new Error('Tasdiqlangan tegishli kafedra o‘qituvchisi kerak.');const hours=timesInt(type.data.rate,d.quantity);const used=all.filter(r=>r.id!==record.id&&r.status==='APPROVED'&&['workloads','additional_work'].includes(r.module)&&r.data.teacher===d.teacher&&r.data.year===d.year).reduce((sum,r)=>sum+toScaled(r.data.hours||r.data._approval?.hours||'0'),toScaled(hours));if(used>toScaled(teacher.data.capacityHours||rule.data.calculation.teacherAnnualLimit))throw new Error('Yillik yuklama limiti oshadi.');
  result={hours:timesInt(type.data.rate,d.quantity),unit:type.data.unit,rate:type.data.rate,quantity:d.quantity,workType:{id:type.id,revision:type.revision,legalBasis:type.data.legalBasis}};
 }
 if(record.module==='actuals'){
  const load=get(d.workload);if(!load||load.status!=='APPROVED')throw new Error('Fakt faqat tasdiqlangan yuklamaga yoziladi.');
  const used=all.filter(r=>r.module==='actuals'&&r.id!==record.id&&r.data.workload===d.workload&&r.status==='APPROVED').reduce((s,r)=>s+toScaled(r.data.hours),toScaled(d.hours));
  if(used>toScaled(load.data.hours))throw new Error('Tekshirilgan fakt reja soatidan oshishi mumkin emas.');
  const y=get(load.data.year);if(y&&(d.date<y.data.start||d.date>y.data.end||y.locked||y.data.periodState==='LOCKED'))throw new Error('Fakt sanasi yopilmagan o‘quv yilida bo‘lsin.');
  if(!d.evidence)throw new Error('Dalil kerak.');result={verifiedHours:d.hours,workload:{id:load.id,revision:load.revision},evidence:d.evidence};
 }
 if(record.module==='tasks'&&(d.progress!=='Bajarildi — tekshirilmagan'||!d.evidence))throw new Error('Vazifa bajarilgan va dalil kiritilgan bo‘lishi kerak.');
 if(record.module==='reports'){
  const loads=all.filter(r=>r.module==='workloads'&&r.status==='APPROVED'&&r.data.year===d.year&&get(r.data.teacher)?.data.department===d.department);const ids=new Set(loads.map(r=>r.id));
  const actual=all.filter(r=>r.module==='actuals'&&r.status==='APPROVED'&&ids.has(r.data.workload)&&r.data.date>=d.periodStart&&r.data.date<=d.periodEnd);
  result={asOf:new Date().toISOString(),plannedHours:fromScaled(loads.reduce((s,r)=>s+toScaled(r.data.hours),0n)),verifiedActualHours:fromScaled(actual.reduce((s,r)=>s+toScaled(r.data.hours),0n)),sources:[...loads,...actual].map(r=>({id:r.id,revision:r.revision,sourceId:r.source_id}))};
 }
 return {...result,capturedAt:new Date().toISOString()};
}
