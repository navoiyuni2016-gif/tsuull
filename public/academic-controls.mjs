import {t,language,locale} from './i18n.mjs';
const $=id=>document.getElementById(id);
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Intl.DateTimeFormat(locale,{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
const hourLabels={totalStudentHours:'Talaba jami soati',contactHoursPerStudent:'Auditoriya / talaba',independentHoursPerStudent:'Mustaqil ta’lim / talaba',lecture:'Ma’ruza / talaba',practice:'Amaliy / talaba',seminar:'Seminar / talaba',lab:'Laboratoriya / talaba',individual:'Individual / talaba'};
const kindLabels={ADDED:'Qo‘shilgan',REMOVED:'Olib tashlangan',CHANGED:'O‘zgargan',UNCHANGED:'O‘zgarishsiz'};
let ctx,selectedPlan='';
export const controlNames={compare:t('Reja versiyalarini taqqoslash'),reconciliation:t('Jadval va yuklama nazorati')};
export function setupAcademicControls(context){ctx=context;}
export function openPlanComparison(id){selectedPlan=id;ctx.route('compare');}
function options(rows,selected=''){return '<option value="">'+e(t('Tanlang…'))+'</option>'+rows.map(r=>'<option value="'+r.id+'" '+(r.id===selected?'selected':'')+'>'+e(r.code+' · '+r.data.name+' · '+t(r.status))+'</option>').join('');}
function planCard(state,title){
 const m=state.metadata;
 return '<article class="panel control-plan-card"><div class="panel-head"><h2>'+e(t(title))+'</h2><span class="badge '+m.status+'">'+e(t(m.status))+' · v'+m.revision+'</span></div><h3>'+e(m.code+' · '+m.name)+'</h3><p class="muted">'+e(t(state.frozen?'Tasdiqlangan tarkib nusxasi':'Joriy loyiha tarkibi'))+'</p><dl class="detail-grid"><div><dt>'+e(t('O‘quv yili'))+'</dt><dd>'+e(m.yearName)+'</dd></div><div><dt>'+e(t('Kafedra'))+'</dt><dd>'+e(m.departmentName)+'</dd></div><div><dt>'+e(t('Hisoblash me’yori'))+'</dt><dd>'+e(m.ruleCode||'—')+' · v'+e(m.ruleRevision||'—')+'</dd></div><div><dt>'+e(t('Muallif:'))+'</dt><dd>'+e(m.authorName||'—')+'</dd></div><div><dt>'+e(t('Yangilangan'))+'</dt><dd>'+date(m.updatedAt)+'</dd></div><div><dt>'+e(t('Oxirgi o‘zgartirgan xodim'))+'</dt><dd>'+e(m.lastChange?.actor||'—')+'</dd></div><div><dt>'+e(t('O‘zgarish sababi'))+'</dt><dd>'+e(m.lastChange?.reason||t('Sabab ko‘rsatilmagan.'))+'</dd></div></dl><details><summary>'+e(t('O‘zgarishlar tarixi'))+'</summary>'+m.changes.map(v=>'<p class="muted">'+date(v.at)+' · '+e(v.actor)+' · '+e(t(v.action))+(v.reason?' · '+e(v.reason):'')+'</p>').join('')+'</details>'+(!state.frozen&&['DRAFT','REJECTED'].includes(m.status)&&['ADMIN','OPERATOR'].includes(ctx.user().role)?'<button class="button space-top" type="button" data-edit-plan="'+m.id+'">'+e(t('Loyihani ustaxonada ochish'))+'</button>':'')+'</article>';
}
export async function renderPlanComparison(){
 const content=$('page-content'),plans=ctx.records().filter(r=>r.module==='curricula');
 const selected=plans.find(r=>r.id===selectedPlan),parent=selected&&plans.find(r=>r.id===selected.data._parent?.id)||selected&&plans.find(r=>r.source_id===selected.source_id&&r.id!==selected.id&&r.status==='APPROVED');
 content.innerHTML=ctx.header('Reja versiyalarini taqqoslash','Eski va yangi rejaning fanlari, kreditlari, semestrlari va talaba soatlarini solishtiring.','','REJALASHTIRISH')+'<section class="panel"><form id="plan-compare-form"><div class="form-grid"><label>'+e(t('Eski reja'))+'<select id="compare-left" required>'+options(plans,parent?.id||'')+'</select></label><label>'+e(t('Yangi reja'))+'<select id="compare-right" required>'+options(plans,selected?.id||'')+'</select></label></div><p class="muted">'+e(t('Tasdiqlangan reja o‘zining saqlangan tarkibidan olinadi. Loyihaning joriy holati ko‘rsatiladi.'))+'</p><div id="compare-error" class="error" role="alert"></div><div class="dialog-actions"><button class="button primary" type="submit">'+e(t('Taqqoslash'))+'</button></div></form></section><div id="compare-result" class="space-top"></div>';
 const compareForm=$('plan-compare-form');compareForm.onsubmit=async event=>{
  event.preventDefault();event.submitter.disabled=true;$('compare-error').textContent='';
  try{
   const params=new URLSearchParams({left:$('compare-left').value,right:$('compare-right').value}),r=await ctx.api('/controls/plans/compare?'+params);
   if(ctx.current()!=='compare'||!compareForm.isConnected)return;
   const cell=(row,side,key)=>{const v=row[side];return v?(key==='name'?v.code+' · '+v.name+(v.rowName!==v.name?' / '+v.rowName:''):key==='hours'?v.hours?.totalStudentHours??'—':v[key]):'—';};
   $('compare-result').innerHTML='<div class="control-two-columns">'+planCard(r.left,'Eski reja')+planCard(r.right,'Yangi reja')+'</div><div class="stat-grid space-top">'+Object.entries(kindLabels).map(([key,label])=>'<div class="stat-card"><small>'+e(t(label))+'</small><div class="stat-value">'+r.summary[key]+'</div></div>').join('')+'</div>'+r.issues.map(v=>'<p class="notice">'+e(t(v))+'</p>').join('')+'<section class="panel space-top"><div class="panel-head"><div><h2>'+e(t('Fanlar bo‘yicha farqlar'))+'</h2><p class="muted">'+e(t('Jami kredit'))+': '+e(r.left.totals.credits)+' → '+e(r.right.totals.credits)+' ('+e(r.deltas.credits)+')</p></div><button class="button" type="button" id="compare-pdf">'+e(t('PDF / Chop etish'))+'</button></div><div class="table-scroll"><table class="control-diff-table"><thead><tr>'+['Farq','Eski fan','Yangi fan','Eski semestr','Yangi semestr','Eski kredit','Yangi kredit','Eski talaba soati','Yangi talaba soati','Tafsilotlar'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+r.rows.map((row,index)=>'<tr class="control-diff-'+row.kind.toLowerCase()+'"><td><span class="control-diff-badge">'+e(t(kindLabels[row.kind]))+'</span><small class="control-change-list">'+e(row.changed.map(k=>t({code:'Kod',name:'Fan',credits:'Kredit',semester:'Semestr',hours:'Soatlar'}[k])).join(', '))+'</small></td>'+['name','semester','credits','hours'].flatMap(key=>['old','next'].map(side=>'<td class="'+(row.changed.includes(key)?'control-changed':'')+'">'+e(cell(row,side,key))+'</td>')).join('')+'<td><button type="button" class="text-button" data-compare-row="'+index+'">'+e(t('Tafsilotlar'))+'</button></td></tr>').join('')+'</tbody></table></div>'+(!r.rows.length?'<p class="muted">'+e(t('Reja fanlari hali kiritilmagan.'))+'</p>':'')+'</section>';
   for(const button of $('compare-result').querySelectorAll('[data-edit-plan]'))button.onclick=()=>{ctx.route('studio');const select=$('studio-plan');if(select){select.value=button.dataset.editPlan;select.dispatchEvent(new Event('change'));}};
   for(const [index,row]of r.rows.entries())$('compare-result').querySelector('[data-compare-row="'+index+'"]').onclick=()=>courseDifferenceDialog(row);
   $('compare-pdf').onclick=()=>window.open('/api/controls/plans/compare?'+params+'&format=html&lang='+encodeURIComponent(language),'_blank','noopener');
  }catch(error){if(compareForm.isConnected&&$('compare-error'))$('compare-error').textContent=error.message;}finally{event.submitter.disabled=false;}
 };
}
function courseDifferenceDialog(row){
 const d=document.createElement('dialog');d.className='management-dialog';
 const metrics=[['credits','Kredit'],['semester','Semestr'],...Object.entries(hourLabels)],value=(side,key)=>row[side]?(key==='credits'||key==='semester'?row[side][key]:row[side].hours?.[key]??'—'):'—';
 d.innerHTML='<div class="dialog-top"><h2>'+e(t('Fan bo‘yicha batafsil farqlar'))+'</h2><button class="icon-button" type="button" aria-label="'+e(t('Yopish'))+'">×</button></div><p>'+e((row.old?.code||'—')+' → '+(row.next?.code||'—'))+'</p><p class="muted">'+e(t('Soatlar bir talaba uchun ko‘rsatilgan. Bu o‘qituvchiga taqsimlangan yuklama emas.'))+'</p><table><thead><tr>'+['Ko‘rsatkich','Eski reja','Yangi reja','Farq'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+metrics.map(([key,label])=>'<tr><td>'+e(t(label))+'</td><td>'+e(value('old',key))+'</td><td>'+e(value('next',key))+'</td><td>'+e(key==='semester'?'—':row.deltas?.[key]??'—')+'</td></tr>').join('')+'</tbody></table>';
 document.body.append(d);d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();
}
export function planRevisionDialog(record){
 const d=document.createElement('dialog');d.className='management-dialog';d.innerHTML='<div class="dialog-top"><h2>'+e(t('Yangi reja versiyasi'))+'</h2><button class="icon-button" type="button" aria-label="'+e(t('Yopish'))+'" data-close-revision>×</button></div><form><label>'+e(t('Yangi versiya uchun noyob kod:'))+'<input name="code" minlength="2" maxlength="40" required></label><label>'+e(t('O‘zgarish sababi (ixtiyoriy)'))+'<textarea name="reason" maxlength="1000" rows="3"></textarea></label><p class="muted">'+e(t('Eski tasdiqlangan reja saqlanadi. Yangi nusxa loyiha sifatida ochiladi.'))+'</p><div class="error" role="alert" data-error></div><div class="dialog-actions"><button class="button primary" type="submit">'+e(t('Yangi versiya yaratish'))+'</button></div></form>';
 document.body.append(d);d.querySelector('[data-close-revision]').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();
 d.querySelector('form').onsubmit=async event=>{event.preventDefault();event.submitter.disabled=true;try{
  const r=await ctx.api('/records/'+record.id+'/revision',{method:'POST',body:JSON.stringify({code:event.target.elements.code.value,reason:event.target.elements.reason.value})});
  await ctx.reload();d.close();$('detail-dialog')?.close();openPlanComparison(r.id);
 }catch(error){d.querySelector('[data-error]').textContent=error.message;}finally{event.submitter.disabled=false;}};
}
export function scheduleRuleFields(record){
 const box=document.createElement('section');box.className='academic-parameter-fields';
 const current=record?.data.scheduleCalculation;
 box.innerHTML='<label class="toggle-line"><input id="schedule-policy-enable" name="_scheduleEnabled" type="checkbox" '+(current?'checked':'')+'>'+e(t('Jadval juftliklari qoidasi'))+'</label><div id="schedule-policy-fields" '+(!current?'hidden':'')+'><p class="muted">'+e(t('Har qatorda boshlanish - tugash = akademik soat yozing. Qoida alohida tasdiqlanadi.'))+'</p><textarea id="schedule-policy-lines" name="_scheduleLines" rows="9" maxlength="3000"></textarea><div class="button-group"><button class="button" type="button" id="schedule-policy-preset">'+e(t('2026–2027 juftliklarini qo‘yish'))+'</button></div><p class="muted">'+e(t('O‘quv yili, amal qilish davri va huquqiy asosni ham kiriting.'))+'</p></div>';
 box.querySelector('#schedule-policy-lines').value=current?current.periods.map(p=>p.start+' - '+p.end+' = '+p.academicHours).join('\n'):'';
 const toggle=()=>{box.querySelector('#schedule-policy-fields').hidden=!box.querySelector('#schedule-policy-enable').checked;box.querySelector('#schedule-policy-lines').disabled=!box.querySelector('#schedule-policy-enable').checked;};
 box.querySelector('#schedule-policy-enable').onchange=toggle;
 box.querySelector('#schedule-policy-preset').onclick=()=>{
  box.querySelector('#schedule-policy-lines').value=[['08:00','09:20'],['09:30','10:50'],['11:00','12:20'],['13:00','14:20'],['14:30','15:50'],['16:00','17:20'],['17:30','18:50'],['19:00','20:20']].map(p=>p[0]+' - '+p[1]+' = 2').join('\n');
  for(const [key,value]of [['code','JADVAL-2026-2027'],['name','2026–2027 juftlik qoidasi'],['scope','JADVAL-2026-2027']])if($('field-'+key)&&!$('field-'+key).value)$('field-'+key).value=value;
  const year=ctx.records().find(r=>r.id===$('field-year')?.value&&r.module==='years');
  if(year)for(const [key,value]of [['effectiveFrom',year.data.start],['effectiveTo',year.data.end]])if(!$('field-'+key).value)$('field-'+key).value=value;
 };
 toggle();return box;
}
export function extractSchedulePolicy(data){
 const enabled=$('schedule-policy-enable')?.checked;delete data._scheduleEnabled;delete data._scheduleLines;
 if(enabled){
  const periods=$('schedule-policy-lines').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{
   const m=line.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*=\s*(\d+(?:\.\d{1,4})?)$/);
   if(!m)throw new Error(t('Juftlik qatori namunasi: 08:00 - 09:20 = 2'));
   return {start:m[1],end:m[2],academicHours:m[3]};
  });
  data.scheduleCalculation={periods};
 }
 return data;
}
export function setupScheduleEditor(record){
 const load=$('field-workload'),rule=$('field-timeRule'),hours=$('field-academicHours');
 if(!load||!rule||!hours)return;
 const all=ctx.records(),approved=all.filter(r=>r.module==='workloads'&&r.status==='APPROVED');
 load.innerHTML=options(approved,record?.data.workload||'');hours.readOnly=true;
 const box=document.createElement('section');box.className='academic-parameter-fields control-schedule-editor';
 box.innerHTML='<h3>'+e(t('Juftlik bo‘yicha avtomatik hisob'))+'</h3><label>'+e(t('Juftlik vaqti'))+'<select id="schedule-period"><option value="">'+e(t('Avval juftlik qoidasini tanlang.'))+'</option></select></label><p class="muted">'+e(t('Faqat to‘liq juftliklar hisoblanadi. Tanaffuslar akademik soatga qo‘shilmaydi.'))+'</p><div id="schedule-preview" aria-live="polite"></div>';
 $('editor-fields').append(box);let sequence=0;
 function policies(){
  const selected=rule.value,w=approved.find(r=>r.id===load.value),teacher=all.find(r=>r.id===w?.data.teacher);
  const rules=all.filter(r=>r.module==='rules'&&r.status==='APPROVED'&&r.data.scheduleCalculation&&(!w||r.data.year===w.data.year&&(!r.data.department||r.data.department===teacher?.data.department)));
  rule.innerHTML=options(rules,selected);
  const chosen=rules.find(r=>r.id===rule.value),periods=chosen?.data.scheduleCalculation.periods||[];
  box.querySelector('#schedule-period').innerHTML='<option value="">'+e(t('Tanlang…'))+'</option>'+periods.map((p,i)=>'<option value="'+i+'">'+(i+1)+'. '+p.start+' — '+p.end+' · '+e(p.academicHours)+' '+e(t('soat'))+'</option>').join('');
  const index=periods.findIndex(p=>p.start===$('field-start').value&&p.end===$('field-end').value);box.querySelector('#schedule-period').value=index>=0?String(index):'';
 }
 async function preview(){
  const request=++sequence;hours.value='';box.querySelector('#schedule-preview').textContent='';
  const data=Object.fromEntries(['workload','timeRule','group','teacher','date','start','end'].map(k=>[k,$('field-'+k).value]));
  if(Object.values(data).some(v=>!v))return;
  try{
   const result=await ctx.api('/controls/schedule/preview',{method:'POST',body:JSON.stringify(data)});
   if(!box.isConnected||request!==sequence)return;
   hours.value=result.academicHours;
   box.querySelector('#schedule-preview').textContent=t('{0} juftlik · {1} akademik soat · {2} daqiqa tanaffus',[result.periodCount,result.academicHours,result.breakMinutes]);
  }catch(error){if(box.isConnected&&request===sequence)box.querySelector('#schedule-preview').textContent=error.message;}
 }
 load.onchange=()=>{const w=approved.find(r=>r.id===load.value);if(w){$('field-group').value=w.data.group;$('field-teacher').value=w.data.teacher;}policies();preview();};
 rule.onchange=()=>{policies();preview();};
 for(const key of ['group','teacher','date','start','end'])$('field-'+key).addEventListener('change',preview);
 box.querySelector('#schedule-period').onchange=event=>{
  const chosen=all.find(r=>r.id===rule.value),p=chosen?.data.scheduleCalculation.periods[Number(event.target.value)];
  if(event.target.value!==''&&p){$('field-start').value=p.start;$('field-end').value=p.end;preview();}
 };
 policies();if(record?.data.workload&&record?.data.timeRule)preview();
}
export async function renderScheduleReconciliation(){
 await ctx.reload();if(ctx.current()!=='reconciliation')return;
 const all=ctx.records(),choices=[['year','years','O‘quv yili'],['department','departments','Kafedra'],['teacher','teachers','O‘qituvchi'],['subject','subjects','Fan'],['group','groups','Guruh']];
 $('page-content').innerHTML=ctx.header('Jadval va yuklama nazorati','Tasdiqlangan yuklamani jadvalga kiritilgan akademik soatlar bilan solishtiring.','','NAZORAT')+'<section class="panel"><form id="schedule-reconcile-form"><div class="form-grid">'+choices.map(([key,module,label])=>'<label>'+e(t(label))+'<select name="'+key+'"><option value="">'+e(t('Barchasi'))+'</option>'+all.filter(r=>r.module===module).map(r=>'<option value="'+r.id+'">'+e(r.code+' · '+r.data.name)+'</option>').join('')+'</select></label>').join('')+'</div><p class="muted">'+e(t('Butun o‘quv yilidagi yuklama solishtiriladi. Jadval soati fakt ijro hisoblanmaydi.'))+'</p><div id="schedule-reconcile-error" class="error" role="alert"></div><div class="dialog-actions"><button class="button primary" type="submit">'+e(t('Solishtirish'))+'</button></div></form></section><div id="schedule-reconcile-result" class="space-top"></div>';
 const form=$('schedule-reconcile-form');for(const select of form.querySelectorAll('select'))select.onchange=()=>$('schedule-reconcile-result').replaceChildren();
 const labels={plannedHours:'Tasdiqlangan yuklama',scheduledHours:'Jadvaldagi tasdiqlangan soat',pendingHours:'Tasdiq kutayotgan soat',gapHours:'Yetishmaydi',excessHours:'Ortiqcha',verifiedHours:'Tekshirilgan fakt'};
 form.onsubmit=async event=>{
  event.preventDefault();const controls=[...form.querySelectorAll('select,button')],params=new URLSearchParams(new FormData(form));controls.forEach(n=>n.disabled=true);$('schedule-reconcile-error').textContent='';
  try{
   const r=await ctx.api('/controls/schedule/reconcile?'+params);if(ctx.current()!=='reconciliation'||!form.isConnected)return;
   $('schedule-reconcile-result').innerHTML='<div class="stat-grid control-stats">'+Object.entries(labels).map(([key,label])=>'<div class="stat-card"><small>'+e(t(label))+'</small><div class="stat-value">'+e(r.totals[key])+'</div><small>'+e(t('akademik soat'))+'</small></div>').join('')+'</div><p class="notice">'+e(t('Faqat bog‘langan va tasdiqlangan mashg‘ulotlar jamlanadi. Tasdiq kutayotgan soatlar va fakt alohida ko‘rsatiladi.'))+'</p><section class="panel space-top"><div class="panel-head"><h2>'+e(t('Yuklamalar bo‘yicha natija'))+'</h2><button class="button" id="schedule-reconcile-pdf" type="button">'+e(t('PDF / Chop etish'))+'</button></div><div class="table-scroll"><table class="control-diff-table"><thead><tr>'+['O‘qituvchi','Fan','Guruh','Mashg‘ulot turi',...Object.values(labels),'Amal'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+r.rows.map(row=>'<tr><td>'+e(row.teacherName)+'</td><td>'+e(row.subjectName)+'</td><td>'+e(row.groupName)+'</td><td>'+e(t(row.activity))+'</td>'+Object.keys(labels).map(k=>'<td class="'+((k==='excessHours'&&row[k]!=='0')?'control-alert':(k==='gapHours'&&row[k]!=='0')?'control-changed':'')+'">'+e(row[k])+'</td>').join('')+'<td><button class="text-button" data-schedule-lessons="'+row.id+'">'+e(t('Mashg‘ulotlar'))+'</button></td></tr>').join('')+'</tbody></table></div>'+(!r.rows.length?'<p class="muted">'+e(t('Tanlangan doirada tasdiqlangan yuklama topilmadi.'))+'</p>':'')+'</section>'+(r.diagnostics.length?'<section class="panel space-top"><h2>'+e(t('Tekshirish talab qiladigan mashg‘ulotlar'))+'</h2><p class="muted">'+e(t('Quyidagi mashg‘ulotlarning soati jami hisobga kiritilmadi. Tasdiqlangan yozuvni tuzatish uchun yangi versiya yarating.'))+'</p><div class="table-scroll"><table><thead><tr>'+['Kod','Sana','Holat','Sabab'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+r.diagnostics.map(x=>'<tr><td>'+e(x.code)+'</td><td>'+e(x.date)+'</td><td>'+e(t(x.status))+'</td><td>'+e(t(x.reason))+'</td></tr>').join('')+'</tbody></table></div></section>':'')+'<p class="muted space-top">'+e(t('{0} ta oldingi tasdiqlangan jadval nusxasi amaldagi yangi nusxa bilan almashtirilgan.',[r.supersededCount]))+'</p>';
   $('schedule-reconcile-pdf').onclick=()=>window.open('/api/controls/schedule/reconcile?'+params+'&format=html&lang='+encodeURIComponent(language),'_blank','noopener');
   for(const row of r.rows)$('schedule-reconcile-result').querySelector('[data-schedule-lessons="'+row.id+'"]').onclick=()=>lessonDialog(row);
  }catch(error){if(form.isConnected&&$('schedule-reconcile-error'))$('schedule-reconcile-error').textContent=error.message;}finally{controls.forEach(n=>{if(n.isConnected)n.disabled=false;});}
 };
 form.requestSubmit();
}
function lessonDialog(row){
 const d=document.createElement('dialog');d.className='management-dialog';
 d.innerHTML='<div class="dialog-top"><h2>'+e(t('Mashg‘ulotlar'))+' · '+e(row.code)+'</h2><button class="icon-button" type="button" aria-label="'+e(t('Yopish'))+'">×</button></div><p>'+e(row.teacherName+' · '+row.subjectName+' · '+row.groupName)+'</p><div class="table-scroll"><table><thead><tr>'+['Kod','Sana','Vaqt','Holat','Akademik soat','Juftlik qoidasi versiyasi'].map(v=>'<th>'+e(t(v))+'</th>').join('')+'</tr></thead><tbody>'+row.lessons.map(l=>'<tr><td>'+e(l.code)+'</td><td>'+e(l.date)+'</td><td>'+e(l.start+' — '+l.end)+'</td><td>'+e(t(l.status))+'</td><td>'+e(l.academicHours)+'</td><td>v'+l.ruleRevision+' · '+e(l.ruleId)+'</td></tr>').join('')+'</tbody></table></div>'+(!row.lessons.length?'<p class="muted">'+e(t('Bog‘langan mashg‘ulotlar hali yo‘q.'))+'</p>':'');
 document.body.append(d);d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();
}
