import {academicFields} from './parameters.mjs';
import {messages} from './i18n-messages.mjs';

export const languages = Object.freeze([
  {id:'uz',label:'O‘zbekcha',lang:'uz',locale:'uz-UZ'},
  {id:'ru',label:'Русский',lang:'ru',locale:'ru-RU'},
  {id:'en',label:'English',lang:'en',locale:'en-GB'},
  {id:'uz-new',label:'Özbekça · Ş Ç Ö Ğ',lang:'uz-Latn-x-modern',locale:'uz-UZ'}
]);
const normalize = s => String(s).trim().replace(/\s+/g,' ').replace(/[‘’ʻʼ]/g,"'");
const valid = id => languages.some(l=>l.id===id);
const storageKey = 'tsuull.language';
function initialLanguage(){
  if(typeof location==='undefined')return 'uz';
  const query=new URL(location.href).searchParams.get('lang');
  if(valid(query))return query;
  try{const stored=localStorage.getItem(storageKey);return valid(stored)?stored:'uz';}catch{return 'uz';}
}
export const language=initialLanguage();
export const locale=languages.find(l=>l.id===language).locale;
export function modernLatin(value){
  return String(value).replace(/O[‘’ʻʼ'`ʼ]/g,'Ö').replace(/o[‘’ʻʼ'`ʼ]/g,'ö')
    .replace(/G[‘’ʻʼ'`ʼ]/g,'Ğ').replace(/g[‘’ʻʼ'`ʼ]/g,'ğ')
    .replace(/SH|Sh/g,'Ş').replace(/sh/g,'ş').replace(/CH|Ch/g,'Ç').replace(/ch/g,'ç');
}
export function createTranslator(id){
  const lang=valid(id)?id:'uz';
  return (source,values=[])=>{
    const original=String(source??''),key=normalize(original),entry=messages[key];
    const localized=lang==='uz-new'&&entry?modernLatin(entry.uz??original.trim()):entry?.[lang];
    let translated=localized===undefined?original:original.match(/^\s*/)[0]+localized+original.match(/\s*$/)[0];
    return translated.replace(/\{(\d+)\}/g,(match,index)=>Object.hasOwn(values,index)?String(values[index]):match);
  };
}
export const t=createTranslator(language);
const marker=/\uE000\d+\uE001/g;
function fragment(source,translate){
  if(!source.trim())return source;
  const lead=source.match(/^\s*/)[0],tail=source.match(/\s*$/)[0],core=source.trim();
  const tokens=[];
  const key=core.replace(marker,token=>{let i=tokens.indexOf(token);if(i<0){i=tokens.length;tokens.push(token);}return '{'+i+'}';});
  return lead+translate(key,tokens)+tail;
}
// This function accepts source-owned markup only. Never pass rendered business data.
export function localizeMarkup(source,translate=t){
  return source.split(/(<[^>]*>|^["'][^<]*?>)/g).map(part=>{
    if(part.startsWith('<')||/^["'][^<]*?>$/.test(part))return part.replace(/\b(aria-label|placeholder|title|alt)=("[^"]*"|'[^']*')/g,(match,name,quoted)=>{
      const value=quoted.slice(1,-1),translated=fragment(value,translate);
      // Quotes in catalog text must not escape an HTML attribute.
      return name+'='+quoted[0]+translated.replaceAll(quoted[0],quoted[0]==='"'?'&quot;':'&#39;')+quoted[0];
    });
    return fragment(part,translate);
  }).join('');
}
export function ui(parts,...values){
  if(typeof parts==='string')return localizeMarkup(parts);
  // Interpolations remain opaque until all source-owned text has been localized.
  const source=parts.reduce((out,part,i)=>out+part+(i<values.length?'\uE000'+i+'\uE001':''),'');
  return localizeMarkup(source).replace(marker,token=>String(values[Number(token.slice(1,-1))]));
}
export function msg(parts,...values){return t(parts.reduce((out,part,i)=>out+part+(i<values.length?'{'+i+'}':''),''),values);}
export function translateError(message){
  const source=String(message??''),direct=t(source);
  if(direct!==source)return direct;
  // Server field validation contains canonical schema labels. Translate its known
  // suffix without interpreting user-controlled names or source documents.
  for(const suffix of [': majburiy maydon.',': 0–10000 basis point kerak.',': 12 belgigacha aniq son kerak.',': 4 xonagacha aniq musbat son kiriting.',': manba yozuv topilmadi.',': matn juda uzun yoki noto‘g‘ri.',': musbat me’yor kiriting.',': musbat sig‘im kiriting.',': qiymat noto‘g‘ri.',': sana noto‘g‘ri.',': son oralig‘ini tekshiring.',': yozuvni tanlang.']){
    if(normalize(source).endsWith(normalize(suffix))){const label=source.slice(0,source.length-suffix.length);return t(academicFields.find(f=>f.key===label)?.label||label)+t(suffix);}
  }
  if(source.endsWith(' kerak.'))return t('{0} kerak.',[t(source.slice(0,-7))]);
  const term=source.match(/^(\d+)-semestr kredit limiti oshgan\.$/);
  if(term)return t('{0}-semestr kredit limiti oshgan.',[term[1]]);
  for(const prefix of ['Kod takrorlangan:', 'Oldindan talab fan kodi topilmadi yoki fan o‘zini talab qilmoqda:', 'Kiritilgan soat hisobdan katta. Shu mashg‘ulot uchun talab:'])if(source.startsWith(prefix))return t(prefix)+source.slice(prefix.length);
  return source;
}
export let localeReloading=false;
export function initLanguage(canLeave=()=>true){
  document.documentElement.lang=languages.find(l=>l.id===language).lang;
  document.title=t(document.title);
  // Initial HTML has no API/user data. Translation runs once, before activation.
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes)if(!node.parentElement.closest('script,style'))node.textContent=fragment(node.textContent,t);
  for(const node of document.body.querySelectorAll('[title],[aria-label],[placeholder],[alt]')){
    for(const name of ['title','aria-label','placeholder','alt'])if(node.hasAttribute(name))node.setAttribute(name,fragment(node.getAttribute(name),t));
  }
  const dirtyForms=new WeakSet();
  document.addEventListener('input',ev=>{if(ev.target.form&&!ev.target.closest('.language-picker'))dirtyForms.add(ev.target.form);ev.target.setCustomValidity?.('');});
  document.addEventListener('change',ev=>{if(ev.target.form&&!ev.target.closest('.language-picker'))dirtyForms.add(ev.target.form);});
  document.addEventListener('reset',ev=>dirtyForms.delete(ev.target));
  document.addEventListener('invalid',ev=>{
    const n=ev.target;if(!n.setCustomValidity)return;
    n.setCustomValidity(t(n.validity.valueMissing?'Bu maydonni to‘ldiring.':n.validity.typeMismatch&&n.type==='email'?'To‘g‘ri email manzilini kiriting.':'Maydon qiymatini tekshiring.'));
  },true);
  for(const parent of [document.querySelector('.login-form'),document.querySelector('.header-right')]){
    const label=document.createElement('label');label.className='language-picker';label.textContent=t('Til / Language')+' ';
    const select=document.createElement('select');select.setAttribute('aria-label',t('Til / Language'));
    for(const l of languages){const option=document.createElement('option');option.value=l.id;option.textContent=l.label;select.append(option);}
    select.value=language;label.append(select);parent.prepend(label);
    select.onchange=()=>{
      const next=select.value;select.value=language;
      const hasDirty=[...document.forms].some(form=>dirtyForms.has(form)&&form.getClientRects().length>0);
      if(hasDirty&&!confirm(t('Tilni almashtirish uchun saqlanmagan o‘zgarishlardan chiqasizmi?')))return;
      if(!canLeave())return;
      try{localStorage.setItem(storageKey,next);}catch{/* URL selection also works without storage. */}
      const url=new URL(location.href);url.searchParams.set('lang',next);localeReloading=true;location.assign(url.href);
    };
  }
}
