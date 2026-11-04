// Shared paper layout. Business values remain verbatim; only UI-owned labels translate.
import {createHash} from 'node:crypto';
import {modules} from '../public/modules.mjs';
import {createTranslator,languages} from '../public/i18n.mjs';
import {fromScaled} from '../packages/domain/src/core.mjs';

export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function documentDate(value,lang,withTime=true){
 if(!value)return '—';
 return new Intl.DateTimeFormat(languages.find(l=>l.id===lang)?.locale||'uz-UZ',{timeZone:'Asia/Tashkent',day:'2-digit',month:'2-digit',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}:{})}).format(new Date(value));
}
export function documentHtml({lang='uz',profile={},title,reference,createdAt,metadata=[],status,notice,content,orientation='portrait',footer}){
 const t=createTranslator(lang),e=escapeHtml,locale=languages.find(l=>l.id===lang);
 const institution=profile.universityName||profile.shortName||'TSUULL';
 return '<!doctype html><html lang="'+e(locale?.lang||'uz')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(reference+' · '+title)+'</title><link rel="stylesheet" href="/report.css?v=pdf-v5"><script type="module" src="/report.mjs?v=pdf-v5"></script></head><body class="report-'+(orientation==='landscape'?'landscape':'portrait')+'"><aside class="print-actions"><button type="button" id="print-report">'+e(t('PDF / Chop etish'))+'</button><div><p>'+e(t('PDF uchun chop etish oynasida “PDF sifatida saqlash”ni tanlang.'))+'</p><small>'+e(t('Chop etish sozlamalarida “Sarlavha va quyi kolontitullar”ni o‘chiring.'))+'</small></div></aside><main class="paper"><header class="letterhead"><img src="/brand.svg" width="42" height="42" alt=""><div><p class="institution">'+e(institution)+'</p><p class="office">'+e(t('O‘quv bo‘limi'))+'</p></div></header><div class="document-register"><span>'+e(t('Hujjat identifikatori'))+': <b class="reference">'+e(reference)+'</b></span><span>'+e(t('Sana'))+': '+e(documentDate(createdAt,lang,false))+'</span></div><h1>'+e(title)+'</h1><div class="document-status">'+e(status)+'</div><dl class="document-metadata">'+metadata.map(([k,v])=>'<div><dt>'+e(t(k))+'</dt><dd>'+e(v)+'</dd></div>').join('')+'</dl><p class="disclaimer">'+e(notice)+'</p>'+content+'<footer class="document-footer"><p>'+e(footer||t('Manba: platformadagi vakolatingiz doirasidagi yozuvlar.'))+'</p><p>'+e(t('Elektron tarzda shakllantirildi.'))+' '+e(documentDate(createdAt,lang))+' · Asia/Tashkent</p></footer></main></body></html>';
}
function table(headers,rows,{numeric=[],className=''}={}){
 const e=escapeHtml;
 return '<table class="'+className+'"><thead><tr>'+headers.map(h=>'<th scope="col">'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,j)=>'<td'+(numeric.includes(j)?' class="number"':'')+'>'+e(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
export function calculationDocument({run,profile,lang='uz'}){
 const t=createTranslator(lang),e=escapeHtml,simulation=run.kind==='SIMULATION',sources=run.sources||[],result=run.result,input=run.input;
 const source=module=>sources.find(s=>s.module===module),rule=source('rules'),subject=source('subjects'),group=source('groups');
 const name=id=>{const s=sources.find(s=>s.id===id);return s?s.code+' · '+s.data.name:id;};
 const percentage=v=>/^\d+$/.test(String(v))?fromScaled(BigInt(v)*100n):String(v);
 const labels={credits:'Fan krediti',hoursPerCredit:'Soat / kredit',groups:'Amaliy guruhlar',lectureStreams:'Ma’ruza potoklari',contactBasisPoints:'Auditoriya ulushi',lectureBasisPoints:'Ma’ruza ulushi',ruleId:'Hisoblash me’yori',subjectId:'Fan',groupId:'Guruh',onDate:'Hisob sanasi'};
 const parameters=Object.keys(labels).filter(key=>input[key]!==undefined).map(key=>{
  const value=input[key];
  let shown=key.endsWith('Id')?name(value):key.endsWith('BasisPoints')?percentage(value):value;
  if(key==='onDate')shown=documentDate(value+'T00:00:00Z',lang,false);
  return [t(labels[key]||key),shown,key.endsWith('BasisPoints')?'%':key==='credits'?t('kredit'):key==='hoursPerCredit'?t('Soat / kredit'):['groups','lectureStreams'].includes(key)?t('ta'):'—'];
 });
 // Show the exact frozen subject/cohort values, never current edited records.
 if(subject)parameters.push([t('Fan krediti'),subject.data.credits,t('kredit')]);
 if(group)parameters.push([t('Talabalar soni'),group.data.students,t('ta')]);
 const resultLabels={totalStudentHours:'Talaba jami soati',contactHoursPerStudent:'Auditoriya / talaba',independentHoursPerStudent:'Mustaqil ta’lim / talaba',basicTeachingDemand:'Bazaviy o‘qitish yuklamasi',lectureTeachingDemand:'Ma’ruza o‘qitish talabi',practiceTeachingDemand:'Amaliy o‘qitish talabi'};
 const results=Object.entries(resultLabels).filter(([key])=>result[key]!==undefined).map(([key,label])=>[t(label),result[key],t('soat')]);
 let content='<section><h2>1. '+e(t('Hisoblash parametrlari'))+'</h2>'+table([t('Ko‘rsatkich'),t('Qiymat'),t('Birlik')],parameters,{className:'parameter-table'})+'</section><section><h2>2. '+e(t('Hisoblash natijasi'))+'</h2>'+table([t('Ko‘rsatkich'),t('Qiymat'),t('Birlik')],results,{numeric:[1],className:'result-table'})+'</section>';
 if(result.activityHours&&result.teachingHours){
  const activities=['lecture','practice','seminar','lab','individual'];
  content+='<section><h2>3. '+e(t('Mashg‘ulotlar bo‘yicha hisob'))+'</h2>'+table([t('Mashg‘ulot turi'),t('Talaba soati'),t('Hisoblash soni'),t('O‘qitish soati')],activities.map(key=>[t(key),result.activityHours[key]??'—',result.groups?.[key]??'—',result.teachingHours[key]??'—']),{numeric:[1,2,3]})+'</section>';
 }
 if(rule){
  content+='<section class="calculation-basis"><h2>'+e(t('Hisoblash asosi'))+'</h2><p><b>'+e(t('Huquqiy asos'))+':</b> '+e(result.legalBasis||rule.data.legalBasis)+'</p><p><b>'+e(t('Amal qilish davri'))+':</b> '+e(rule.data.effectiveFrom)+' — '+e(rule.data.effectiveTo)+'</p>'+(result.rounding?'<p><b>'+e(t('Yaxlitlash'))+':</b> '+e(t(result.rounding.mode))+' · '+e(result.rounding.places)+' '+e(t('kasr xonasi'))+'</p>':'')+'</section>';
 }
 if(sources.length)content+='<section><h2>'+e(t('Manba versiyalari'))+'</h2>'+table([t('Modul'),t('Kod / nom'),t('Versiya'),t('Holat')],sources.map(s=>[t(modules[s.module]?.singular||s.module),s.code+' · '+s.data.name,'v'+s.revision,t(s.status)]))+'</section>';
 content+='<div class="document-notes"><p>'+e(t('Mustaqil ta’lim soati o‘qituvchining dars yuklamasiga avtomatik qo‘shilmaydi.'))+'</p><p><b>'+e(t('Hisoblash yozuvi ID'))+':</b> <span class="record-id">'+e(run.id)+'</span></p><p><b>'+e(t('Tuzuvchi'))+':</b> '+e(run.actor_name||'—')+'</p></div>';
 return documentHtml({lang,profile,title:t('Fan soatlarini hisoblash ma’lumotnomasi'),reference:'CALC-'+run.id,createdAt:run.created_at,metadata:[['Hisoblash turi',t(simulation?'Simulyatsiya':'Me’yor asosidagi hisob')],['Xodim',run.actor_name||'—']],status:t(simulation?'SIMULYATSIYA — NAMUNA HISOB':'ME’YOR ASOSIDAGI SAQLANGAN HISOB'),notice:t(simulation?'Bu simulyatsiya namunaviy hisobdir. Rasmiy akademik tasdiq hisoblanmaydi.':'Saqlangan hisob natijasi akademik tasdiq yoki o‘qituvchiga biriktirish o‘rnini bosmaydi.'),content});
}
export function registryReference({module,createdAt,config,report}){
 // Stable for the same extract, not an academic approval or registered outgoing number.
 return 'REG-'+createHash('sha256').update(JSON.stringify({module,createdAt,config,headers:report.headers,values:report.values})).digest('hex').slice(0,12).toUpperCase();
}
