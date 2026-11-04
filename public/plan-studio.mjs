import {t as tr, ui, msg, translateError, localeReloading} from './i18n.mjs';
let selectedPlan='',pending=false,dirty=false;
const $=id=>document.getElementById(id);
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(id,label,primary=false)=>ui`<button type="button" class="button ${primary?'primary':''}" id="${id}">${label}</button>`;
export async function planStudio(ctx){
  dirty=false;
  const content=$('page-content');const canWrite=['ADMIN','OPERATOR'].includes(ctx.user().role);
  const plans=ctx.records().filter(r=>r.module==='curricula');
  if(!plans.some(r=>r.id===selectedPlan))selectedPlan=plans[0]?.id||'';
  content.innerHTML=ctx.header(tr('O‘quv reja ustaxonasi'),tr('Fanlar, semestrlar va hisoblash — bitta ish oynasida.'),canWrite?button('studio-new',tr('Yangi o‘quv reja'),true):'',tr('REJALASHTIRISH'))+ui`
    <section class="panel studio-intro"><h2>Ish tartibi</h2><p>1. Katalog va me’yorni tayyorlang → 2. Reja yarating → 3. Fan va semestrlarni kiriting → 4. Tekshiring va saqlang → 5. Tasdiqqa yuboring.</p>
    <div class="button-group">${button('studio-catalog',tr('Fanlar katalogi'))}${button('studio-rules',tr('Me’yorlar va versiyalar'))}${button('studio-hours',tr('Guruh bo‘yicha yuklama hisobi'))}</div></section>
    <section class="panel space-top"><div class="form-field"><label for="studio-plan">O‘quv reja</label><select id="studio-plan"><option value="">Rejani tanlang…</option>${plans.map(r=>ui`<option value="${e(r.id)}" ${selectedPlan===r.id?'selected':''}>${e(r.code)} · ${e(r.data.name)} · ${e({DRAFT:tr('Loyiha'),REJECTED:tr('Qaytarilgan'),SUBMITTED:tr('Ko‘rib chiqishda'),APPROVED:tr('Tasdiqlangan')}[r.status])}</option>`).join('')}</select></div><div id="studio-error" class="error" role="alert"></div></section><div id="studio-workspace" class="space-top"></div>`;
  $('studio-catalog').onclick=()=>ctx.route('subjects');$('studio-rules').onclick=()=>ctx.route('rules');$('studio-hours').onclick=()=>ctx.route('official');
  if($('studio-new'))$('studio-new').onclick=()=>ctx.create('curricula');
  $('studio-plan').onchange=()=>{if(dirty&&!confirm(tr('Saqlanmagan o‘zgarishlardan chiqasizmi?'))){$('studio-plan').value=selectedPlan;return;}selectedPlan=$('studio-plan').value;dirty=false;open();};
  async function open(){
    const planId=selectedPlan,box=$('studio-workspace');if(!planId){box.innerHTML=ui('<section class="panel"><h2>Reja yarating</h2><p>Avval kataloglar va tasdiqlangan me’yorni tayyorlang. So‘ng “Yangi o‘quv reja” orqali dastur ma’lumotlarini kiriting.</p></section>');return;}
    box.innerHTML=ui('<section class="panel"><p>Reja yuklanmoqda…</p></section>');
    try{
      const x=await ctx.api('/curricula/'+planId+'/studio');if(ctx.current()!=='studio'||planId!==selectedPlan)return;
      let items=x.items.map(i=>({...i})),suggestionId=null,previewSequence=0,timer;

      const editable=canWrite&&!x.locked&&['DRAFT','REJECTED'].includes(x.parent.status);
      box.innerHTML=ui`<section class="panel"><div class="panel-head"><div><h2>${e(x.parent.data.name)}</h2><p>${e(x.parent.code)} · v${x.parent.revision} · ${editable?tr('Tahrirlash mumkin'):tr('Faqat ko‘rish')}</p></div>${button('studio-details',tr('Hujjat va tasdiqlash'))}</div>
      ${editable?ui`<div class="studio-add"><div class="form-field"><label for="studio-subject">Tasdiqlangan fan</label><select id="studio-subject"><option value="">Fan tanlang…</option>${x.subjects.map(s=>ui`<option value="${e(s.id)}">${e(s.code)} · ${e(s.data.name)} (${e(s.data.credits)} kredit)</option>`).join('')}</select></div><div class="form-field"><label for="studio-semester">Semestr</label><input id="studio-semester" type="number" min="1" max="20" value="1"></div>${button('studio-add',tr('Fan qo‘shish'),true)}</div><p class="muted">Yangi fan kerak bo‘lsa, “Fanlar katalogi”da kiriting va tasdiqlating. Soatlarni tizim tanlangan me’yor bo‘yicha hisoblaydi.</p>`:''}
      <div id="studio-grid" class="table-scroll"></div><div id="studio-calculation" aria-live="polite"></div>
      ${editable?ui`<div class="button-group space-top">${button('studio-check',tr('Hisobni tekshirish'))}${button('studio-recommend',tr('Qoida asosida semestrlarga joylash'))}${button('studio-save',tr('Loyihani saqlash'),true)}</div><p id="studio-save-state" class="muted">Saqlangan reja ochildi.</p><label for="studio-change-reason">O‘zgarish sababi (ixtiyoriy)</label><textarea id="studio-change-reason" maxlength="1000" rows="2"></textarea>`:''}</section>
      ${editable?ui`<section class="panel space-top"><h2>Mahalliy AI yordamchi</h2><p>${x.ai.configured?tr('Model: {0}. Katalogdagi tanlangan fanlar va kreditlar universitetning ichki AI xizmatiga yuboriladi.',[e(x.ai.model)]):tr('Mahalliy AI hali ulanmagan. Qo‘lda tuzish, hisoblash va qoida asosida joylashtirish ishlaydi.')}</p><label for="studio-instruction">Joylashtirish bo‘yicha istak (ixtiyoriy)</label><textarea id="studio-instruction" maxlength="2000" rows="3" placeholder="Masalan: oldindan talab fanlarni hisobga olib, semestrlarni muvozanatlang."></textarea><div class="button-group space-top"><button class="button" id="studio-ai" type="button" ${x.ai.configured?'':'disabled'}>AI tavsiya tayyorlasin</button></div><div id="studio-ai-result" aria-live="polite"></div><p class="muted">AI me’yor yoki soatni belgilamaydi. Tavsiyani jadvalga o‘tkazish va serverga saqlash alohida bajariladi.</p></section>`:''}`;
      $('studio-details').onclick=()=>{if(dirty&&!confirm(tr('Saqlanmagan o‘zgarishlar bor. Hujjatni baribir ochasizmi?')))return;ctx.details(x.parent.id);};
      function error(message){if($('studio-error'))$('studio-error').textContent=message;}
      function changed(){dirty=true;previewSequence++;if($('studio-save-state'))$('studio-save-state').textContent=tr('Saqlanmagan o‘zgarishlar bor.');clearTimeout(timer);timer=setTimeout(()=>preview(),450);}
      function grid(){
        $('studio-grid').innerHTML=items.length?ui`<table class="studio-table"><thead><tr><th>Fan kodi</th><th>Fan</th><th>Kredit</th><th>Semestr</th>${editable?ui('<th>Amal</th>'):''}</tr></thead><tbody>${items.map((i,n)=>{const s=x.subjects.find(s=>s.id===i.subject);return ui`<tr><td>${e(s?.code||'—')}</td><td>${e(s?.data.name||tr('Fan tasdiqlanmagan'))}</td><td>${e(s?.data.credits||'—')}</td><td>${editable?ui`<input type="number" min="1" max="20" data-semester="${n}" aria-label="${e(s?.data.name)} semestri" value="${i.semester}">`:i.semester}</td>${editable?ui`<td><button class="text-button" data-remove="${n}" type="button">Olib tashlash</button></td>`:''}</tr>`;}).join('')}</tbody></table>`:ui('<p class="muted">Reja fanlari hali kiritilmagan. Yuqoridan tasdiqlangan fanlarni qo‘shing.</p>');
        $('studio-grid').querySelectorAll('[data-semester]').forEach(n=>n.oninput=()=>{items[Number(n.dataset.semester)].semester=Number(n.value);changed();});
        $('studio-grid').querySelectorAll('[data-remove]').forEach(n=>n.onclick=()=>{items.splice(Number(n.dataset.remove),1);grid();changed();});
      }
      async function preview(){
        const seq=++previewSequence;
        try{const r=await ctx.api('/curricula/'+planId+'/studio/preview',{method:'POST',body:JSON.stringify({items})});if(seq!==previewSequence||ctx.current()!=='studio'||selectedPlan!==planId)return;
          error('');$('studio-calculation').innerHTML=ui`<div class="stat-grid space-top">${[[tr('Jami kredit'),r.totals.credits],[tr('Talaba jami soati'),r.totals.totalStudentHours],[tr('Auditoriya / talaba'),r.totals.contactHoursPerStudent],[tr('Mustaqil ta’lim / talaba'),r.totals.independentHoursPerStudent]].map(([k,v])=>ui`<div class="stat-card"><small>${k}</small><div class="stat-value">${e(v)}</div></div>`).join('')}</div><p class="muted">Me’yor v${r.rule.revision} · ${e(r.rule.legalBasis)}. Bu ko‘rsatkichlar o‘qituvchiga taqsimlangan yuklama emas.</p><p class="${r.ready?'muted':'error'}">${r.ready?tr('Kredit va oldindan talab tekshiruvlari o‘tdi. Yakuniy akademik tasdiq talab qilinadi.'):e(r.issues.map(translateError).join(' '))+tr(' To‘liq bo‘lmagan rejani loyiha sifatida saqlash mumkin.')}</p><p class="muted">${Object.entries(r.terms).map(([term,credits])=>msg`${term}-semestr: ${e(credits)} kredit`).join(' · ')}</p><details><summary>Fanlar bo‘yicha hisoblangan soatlar</summary><div class="table-scroll"><table><thead><tr><th>Fan</th><th>Jami / talaba</th><th>Auditoriya / talaba</th><th>Mustaqil / talaba</th><th>Ma’ruza</th><th>Amaliy</th><th>Seminar</th><th>Laboratoriya</th><th>Individual</th></tr></thead><tbody>${r.rows.map(row=>ui`<tr><td>${e(row.name)}</td>${[row.calculation.totalStudentHours,row.calculation.contactHoursPerStudent,row.calculation.independentHoursPerStudent,...['lecture','practice','seminar','lab','individual'].map(a=>row.calculation.activityHours[a])].map(v=>ui`<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
        }catch(ex){if(seq===previewSequence){error(ex.message);if($('studio-calculation'))$('studio-calculation').textContent=tr('Hisob yangilanmadi. Qatorlarni tekshiring.');}}
      }
      async function busy(id,fn){if(pending)return;pending=true;const controls=[...box.querySelectorAll('button,input,select,textarea'),$('studio-plan')].map(node=>({node,disabled:node.disabled}));controls.forEach(({node})=>node.disabled=true);error('');try{await fn();}catch(ex){error(ex.message);}finally{pending=false;controls.forEach(({node,disabled})=>{if(node.isConnected)node.disabled=disabled;});box.querySelectorAll('button,input,select,textarea').forEach(node=>{if(!controls.some(c=>c.node===node))node.disabled=node.id==='studio-ai'&&!x.ai.configured;});if($('studio-save-state')?.textContent===tr('Saqlanmoqda…'))$('studio-save-state').textContent=tr('Saqlanmagan o‘zgarishlar bor.');}}
      if(editable){
        $('studio-add').onclick=()=>{const subject=$('studio-subject').value,semester=Number($('studio-semester').value);if(!subject||!Number.isInteger(semester)||semester<1||semester>20)return error(tr('Fan va semestrni to‘g‘ri tanlang.'));if(items.some(i=>i.subject===subject))return error(tr('Bu fan rejada mavjud.'));items.push({subject,semester});grid();changed();};
        $('studio-check').onclick=preview;
        $('studio-save').onclick=()=>{if(!confirm(tr('Jadvaldagi o‘zgarishlarni loyiha sifatida saqlaysizmi? Olib tashlangan qatorlar tarixi saqlanadi.')))return;return busy('studio-save',async()=>{$('studio-save-state').textContent=tr('Saqlanmoqda…');await ctx.api('/curricula/'+planId+'/studio',{method:'PUT',body:JSON.stringify({items,version:x.version,suggestionId,reason:$('studio-change-reason').value})});dirty=false;await ctx.reload();if(ctx.current()!=='studio')return;await open();ctx.toast(tr('O‘quv reja loyihasi saqlandi.'));});};
        $('studio-recommend').onclick=()=>busy('studio-recommend',async()=>{const r=await ctx.api('/curricula/'+planId+'/generate',{method:'POST',body:JSON.stringify({subjectIds:items.map(i=>i.subject)})});items=r.recommendations.map(i=>({subject:i.subject,semester:i.semester}));suggestionId=null;grid();changed();await preview();});
        $('studio-ai').onclick=()=>busy('studio-ai',async()=>{
          $('studio-ai-result').textContent=tr('Mahalliy model tavsiya tayyorlamoqda…');
          try{const r=await ctx.api('/curricula/'+planId+'/ai-suggest',{method:'POST',body:JSON.stringify({subjectIds:items.map(i=>i.subject),instruction:$('studio-instruction').value})});if(ctx.current()!=='studio'||selectedPlan!==planId)return;
            $('studio-ai-result').innerHTML=ui`<p>${e(r.explanation)}</p><div class="table-scroll"><table><thead><tr><th>Fan</th><th>Tavsiya etilgan semestr</th></tr></thead><tbody>${r.items.map(i=>ui`<tr><td>${e(x.subjects.find(s=>s.id===i.subject)?.data.name)}</td><td>${i.semester}</td></tr>`).join('')}</tbody></table></div>${button('studio-ai-apply',tr('Tekshirdim — jadvalga o‘tkazish'))}`;
            $('studio-ai-apply').onclick=()=>{items=r.items.map(i=>({...i}));suggestionId=r.suggestionId;grid();changed();$('studio-ai-result').textContent=tr('Tavsiya jadvalga o‘tkazildi. Tekshiring va “Loyihani saqlash”ni bosing.');};
          }catch(ex){if($('studio-ai-result'))$('studio-ai-result').textContent=tr('Tavsiya olinmadi. Reja o‘zgartirilmadi.');throw ex;}
        });
      }
      dirty=false;grid();if(pending)box.querySelectorAll('button,input,select,textarea').forEach(node=>node.disabled=true);await preview();
    }catch(ex){if(planId===selectedPlan){box.innerHTML=ui('<section class="panel"><p class="error">')+e(ex.message)+ui('</p><p>“O‘quv rejalar”da rejaning me’yori va hisob sanasini tekshiring.</p></section>');}}
  }
  await open();
}
export function studioCanLeave(){return !dirty||confirm(tr('Rejada saqlanmagan o‘zgarishlar bor. Chiqasizmi?'));}
window.addEventListener('beforeunload',ev=>{if(dirty&&!localeReloading){ev.preventDefault();ev.returnValue='';}});
