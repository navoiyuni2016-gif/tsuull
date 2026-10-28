(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = {
    faculties: [], departments: [], tasks: [], audit: [],
    rules: { hours:30, contact:40, lecture:50 },
    lastCalculation:null
  };
  try {
    const saved=JSON.parse(localStorage.getItem('oquv-erp-demo-v2')||'null');
    if(saved && Array.isArray(saved.faculties) && Array.isArray(saved.departments) && Array.isArray(saved.tasks) && Array.isArray(saved.audit)) {
      state.faculties=saved.faculties;state.departments=saved.departments;state.tasks=saved.tasks;state.audit=saved.audit;
      if(saved.rules && ['hours','contact','lecture'].every(k=>Number.isInteger(saved.rules[k])) && saved.rules.hours>=1 && saved.rules.hours<=60 && saved.rules.contact>=0 && saved.rules.contact<=100 && saved.rules.lecture>=0 && saved.rules.lecture<=100) state.rules=saved.rules;
    }
  } catch {}
  function persist(){try{localStorage.setItem('oquv-erp-demo-v2',JSON.stringify(state));}catch{document.querySelector('.notice').textContent='Brauzerda saqlash ishlamadi. Demo ma’lumotlar faqat ushbu sessiyada qoladi.';}}
  const pages = ['dashboard','structure','year','curriculum','workload','tasks','reports','rules','audit'];
  const titles = { dashboard:'Boshqaruv paneli', structure:'Universitet tuzilmasi', year:'O‘quv yillari', curriculum:'O‘quv reja va soatlar', workload:'O‘qituvchilar yuklamasi', tasks:'Yillik ish rejasi', reports:'Hisobotlar', rules:'SuperAdmin me’yorlari', audit:'Audit tarixi' };

  function nav(page) {
    if (!pages.includes(page)) return;
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active', e.id==='page-'+page));
    document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
    $('crumb-title').textContent=titles[page];
    $('sidebar').classList.remove('open');
    if (page==='audit') renderAudit();
    if (page==='structure') renderStructure();
    if (page==='tasks') renderTasks();
    window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-page],[data-goto]').forEach(el=>el.addEventListener('click',()=>nav(el.dataset.page||el.dataset.goto)));
  $('menu-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  function log(message) {
    state.audit.unshift({message,time:new Date().toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent'}),actor:'Demo operator'});
    state.audit=state.audit.slice(0,40);persist();
  }
  function setError(id,message) { $(id).textContent=message||''; }
  function clean(s) { return String(s||'').trim(); }
  function clear(node) { node.replaceChildren(); }
  function node(tag,text,cls) { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e; }
  function empty(text) { return node('div',text,'empty-state'); }
  function validateCode(s){return /^[A-Z0-9_\-]{2,24}$/.test(s);}
  function addOption(sel,label,value){const o=document.createElement('option');o.value=value;o.textContent=label;sel.appendChild(o);}

  function renderStructure() {
    $('stat-dept').textContent=state.departments.length;
    const sel=$('dept-faculty'); const previous=sel.value; clear(sel);
    addOption(sel,'Fakultet tanlang','');
    state.faculties.forEach(f=>addOption(sel,`${f.code} — ${f.name}`,f.code));
    if (state.faculties.some(f=>f.code===previous))sel.value=previous;
    const root=$('structure-table');clear(root);
    if (!state.faculties.length){root.appendChild(empty('Hali fakultet kiritilmadi. Yuqoridagi shakldan qo‘shing.'));return;}
    const table=document.createElement('table');const thead=document.createElement('thead');const row=document.createElement('tr');
    ['Fakultet kodi','Fakultet nomi','Kafedra kodi','Kafedra nomi'].forEach(x=>row.appendChild(node('th',x)));
    thead.appendChild(row);table.appendChild(thead);const tbody=document.createElement('tbody');
    state.faculties.forEach(f=>{
      const depts=state.departments.filter(d=>d.facultyCode===f.code);const list=depts.length?depts:[null];
      list.forEach((d,i)=>{const r=document.createElement('tr');[i===0?f.code:'',i===0?f.name:'',d?.code||'—',d?.name||'Kafedra kiritilmagan'].forEach(x=>r.appendChild(node('td',x)));tbody.appendChild(r);});
    });
    table.appendChild(tbody);root.appendChild(table);
  }
  $('add-faculty').addEventListener('click',()=>{
    const code=clean($('faculty-code').value).toUpperCase(), name=clean($('faculty-name').value);
    if(!validateCode(code)||name.length<2){setError('faculty-error','Kod 2–24 ta lotin bosh harfi/raqam/_/-; nom 2 belgidan uzun bo‘lsin.');return;}
    if(state.faculties.some(f=>f.code===code)){setError('faculty-error','Bunday fakultet kodi mavjud.');return;}
    state.faculties.push({code,name});$('faculty-code').value='';$('faculty-name').value='';setError('faculty-error','');log(`Fakultet qo‘shildi: ${code}`);renderStructure();
  });
  $('add-dept').addEventListener('click',()=>{
    const facultyCode=$('dept-faculty').value, code=clean($('dept-code').value).toUpperCase(), name=clean($('dept-name').value);
    if(!facultyCode||!validateCode(code)||name.length<2){setError('dept-error','Fakultet, kod va kafedra nomini tekshiring.');return;}
    if(state.departments.some(d=>d.facultyCode===facultyCode&&d.code===code)){setError('dept-error','Ushbu fakultetda kod takrorlangan.');return;}
    state.departments.push({facultyCode,code,name});$('dept-code').value='';$('dept-name').value='';setError('dept-error','');log(`Kafedra qo‘shildi: ${code}`);renderStructure();
  });

  function num(id,min,max){const n=Number($(id).value);if(!Number.isFinite(n)||n<min||n>max||!Number.isInteger(n))throw new Error(`${id}: ${min}–${max} oralig‘idagi butun son kiriting.`);return n;}
  // All sample controls here accept integer inputs. Official production computations use the separately tested fixed-point domain engine.
  function calculate() {
    try {
      const credits=num('credits',1,40), groups=num('groups',1,30), streams=num('streams',1,30);
      const {hours,contact,lecture}=state.rules;
      const total=credits*hours, classroom=Math.round(total*contact/100), independent=total-classroom;
      const lecturePerStream=Math.round(classroom*lecture/100), practicePerGroup=classroom-lecturePerStream;
      const lectureTeaching=lecturePerStream*streams, practiceTeaching=practicePerGroup*groups;
      const totalTeaching=lectureTeaching+practiceTeaching;
      [['result-total',total],['result-contact',classroom+' soat'],['result-independent',independent+' soat'],['result-lecture',lectureTeaching+' soat'],['result-practice',practiceTeaching+' soat'],['result-teacher',totalTeaching+' soat']].forEach(([id,val])=>$(id).textContent=val);
      state.lastCalculation={credits,groups,streams,total,contact:classroom,independent,teacher:totalTeaching};
      setError('calc-error','');log(`Demo fan soatlari hisoblandi: ${credits} kredit, ${groups} guruh`);
    }catch(e){setError('calc-error',e.message);}
  }
  $('calculate').addEventListener('click',calculate);
  $('save-rule').addEventListener('click',()=>{
    try {
      const hours=num('hours-credit',1,60),contact=num('contact-pct',0,100),lecture=num('lecture-pct',0,100);
      state.rules={hours,contact,lecture};setError('rule-error','');log(`Demo parametrlar qo‘llandi: 1 kredit=${hours}, auditoriya=${contact}%, ma’ruza=${lecture}%`);
      calculate();setError('rule-error','Demo parametrlar qabul qilindi. Rasmiy me’yor sifatida ishlatilmaydi.');
    }catch(e){setError('rule-error',e.message);}
  });
  $('reset-rule').addEventListener('click',()=>{
    $('hours-credit').value='30';$('contact-pct').value='40';$('lecture-pct').value='50';state.rules={hours:30,contact:40,lecture:50};calculate();log('Demo parametrlar tiklandi');setError('rule-error','Demo parametrlar boshlang‘ich holatga qaytdi.');
  });

  function renderTasks() {
    const done=state.tasks.filter(t=>t.state==='DONE').length, open=state.tasks.filter(t=>t.state==='IN_PROGRESS').length;
    $('task-total').textContent=state.tasks.length;$('task-open').textContent=open;$('task-done').textContent=done;
    const list=$('task-list');clear(list);
    if(!state.tasks.length){list.appendChild(empty('Hozircha vazifalar yo‘q. Birinchi vazifani qo‘shing.'));return;}
    for(const task of state.tasks){
      const wrapper=node('div',undefined,'task-item'),left=node('div'),title=node('strong',task.title),sub=node('small',`Mas’ul: ${task.owner} · Muddat: ${task.due}`);
      left.append(title,sub);const sel=document.createElement('select');sel.setAttribute('aria-label',`${task.title} holati`);
      [['TODO','Rejalangan'],['IN_PROGRESS','Jarayonda'],['DONE','Bajarildi (tekshirilmagan)'],['BLOCKED','Bloklangan']].forEach(([v,t])=>addOption(sel,t,v));sel.value=task.state;
      sel.addEventListener('change',()=>{task.state=sel.value;log(`Vazifa holati o‘zgardi: ${task.title} → ${task.state}`);renderTasks();});
      wrapper.append(left,sel);list.appendChild(wrapper);
    }
  }
  $('add-task').addEventListener('click',()=>{
    const title=clean($('task-title').value),owner=clean($('task-owner').value),due=clean($('task-date').value);
    if(title.length<4||!owner||!/^\d{4}-\d{2}-\d{2}$/.test(due)){setError('task-error','Vazifa, mas’ul va muddatni kiriting.');return;}
    state.tasks.push({title,owner,due,state:'TODO'});$('task-title').value='';$('task-owner').value='';$('task-date').value='';setError('task-error','');log(`Demo vazifa yaratildi: ${title}`);renderTasks();
  });

  function renderAudit(){
    const list=$('audit-list');clear(list);
    if(!state.audit.length){list.appendChild(empty('Sessiyada hali amal bajarilmadi.'));return;}
    for(const item of state.audit){const row=node('div',undefined,'audit-row');row.append(node('b',item.message),node('small',`${item.time} · ${item.actor} · vaqtinchalik demo yozuv`));list.appendChild(row);}
  }
  $('hours-credit').value=state.rules.hours;$('contact-pct').value=state.rules.contact;$('lecture-pct').value=state.rules.lecture;
  renderStructure();renderTasks();calculate();
})();
