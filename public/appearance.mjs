import {t,ui} from './i18n.mjs';

const moon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z"/></svg>';
const sun='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const defaults=Object.freeze({mode:'auto',accent:'#2859dc'});
const hex=/^#[0-9a-f]{6}$/i;
export function normalizePreferences(value){
  return {mode:['auto','day','night'].includes(value?.mode)?value.mode:defaults.mode,
    accent:typeof value?.accent==='string'&&hex.test(value.accent)?value.accent.toLowerCase():defaults.accent};
}
export const storageKey=userId=>'tsuull.appearance.v1.'+(userId||'login');
export const resolveMode=(mode,dark)=>mode==='auto'?(dark?'night':'day'):mode;
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const mix=(a,b,weight)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-weight)+rgb(b)[i]*weight).toString(16).padStart(2,'0')).join('');
function luminance(color){const [r,g,b]=rgb(color).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
const foreground=color=>contrastRatio(color,'#ffffff')>=contrastRatio(color,'#000000')?'#ffffff':'#000000';
function readable(color,surface,ratio){
  const end=foreground(surface);
  for(let i=0;i<=100;i++){const next=mix(color,end,i/100);if(contrastRatio(next,surface)>=ratio)return next;}
  return end;
}
export function palette(color,mode){
  const accent=hex.test(color)?color.toLowerCase():defaults.accent,dark=mode==='night';
  const surface=dark?'#182230':'#ffffff',page=dark?'#101722':mix('#f5f7fb',accent,0.025);
  const hover=mix(accent,foreground(accent)==='#ffffff'?'#000000':'#ffffff',0.13);
  const soft=mix(surface,accent,dark?0.13:0.07);
  const ink=readable(readable(accent,surface,4.5),soft,4.5);
  return {'--accent':accent,'--blue':accent,'--accent-on':foreground(accent),'--accent-hover':hover,'--accent-hover-on':foreground(hover),
    '--accent-ink':ink,'--accent-border':readable(accent,surface,3),
    '--accent-soft':soft,'--page':page,'--surface':surface,
    '--surface-alt':dark?'#1e2b3b':mix(surface,accent,0.025),'--text':dark?'#e8eef7':'#1b2940',
    '--muted':dark?'#b0bed0':'#56647a','--border':dark?'#45546a':'#c4cedb',
    '--hero':mix('#142543',accent,0.15)};
}

let account=null,current={...defaults},baseline={...defaults},dialog,colorInput,hexInput,message;
let media,initialized=false,previewing=false;
const memory=new Map();
const modeButtons=[];
function read(){
  const key=storageKey(account);
  if(memory.has(key))return {...memory.get(key)};
  try{return normalizePreferences(JSON.parse(localStorage.getItem(key)));}catch{return {...defaults};}
}
function apply(value){
  current=normalizePreferences(value);
  const mode=resolveMode(current.mode,media?.matches??false),root=document.documentElement;
  root.dataset.theme=mode;
  for(const button of modeButtons){
    button.innerHTML=mode==='night'?sun:moon;button.setAttribute('aria-pressed',String(mode==='night'));
    button.title=t(mode==='night'?'Kunduzgi rejimga o‘tish':'Tungi rejimga o‘tish');
  }
  for(const [key,value]of Object.entries(palette(current.accent,mode)))root.style.setProperty(key,value);
}
function refreshFields(){colorInput.value=current.accent;hexInput.value=current.accent;hexInput.setCustomValidity('');}
export function setAppearanceUser(userId){
  if(dialog?.open)dialog.close();
  account=userId||null;previewing=false;apply(read());baseline={...current};
}
function cancel(){previewing=false;apply(baseline);}
export function initAppearance(){
  if(initialized)return;initialized=true;
  media=window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change',()=>{if(current.mode==='auto')apply(current);});
  window.addEventListener('storage',event=>{
    if(event.key!==storageKey(account)&&event.key!==null)return;
    memory.delete(storageKey(account));
    if(!dialog.open){apply(read());baseline={...current};}
  });
  dialog=document.createElement('dialog');dialog.id='appearance-dialog';dialog.className='appearance-dialog';
  dialog.innerHTML=ui`<form id="appearance-form"><div class="dialog-top"><div><span class="eyebrow">Shaxsiy ko‘rinish</span><h2>Interfeys sozlamalari</h2></div><button type="button" class="icon-button" id="appearance-close" aria-label="Yopish">×</button></div>
    <p class="muted">Rang tugmalar, menyu va ajratilgan elementlarga qo‘llanadi. Tanlov shu brauzerda hisobingiz uchun alohida saqlanadi.</p>
    <label for="appearance-color">Asosiy rang</label><div class="appearance-color-row"><input id="appearance-color" type="color" aria-label="Asosiy rang"><input id="appearance-hex" aria-label="Rang kodi" maxlength="7" pattern="#[0-9a-fA-F]{6}" spellcheck="false" autocomplete="off" required></div>
    <div class="appearance-presets" aria-label="Tayyor ranglar"></div>
    <div class="appearance-preview"><span>Jonli namuna</span><button type="button" class="button primary" tabindex="-1">Namuna tugma</button><span class="badge blue">Tanlangan rang</span></div>
    <p class="muted">O‘zgarishlar darhol ko‘rinadi. Tanlovni saqlash uchun “Saqlash”ni bosing.</p><div id="appearance-message" class="error" role="status"></div>
    <div class="dialog-actions"><button type="button" class="button" id="appearance-reset">Standartni tiklash</button><button type="button" class="button" id="appearance-cancel">Bekor qilish</button><button type="submit" class="button primary">Saqlash</button></div></form>`;
  document.body.append(dialog);
  colorInput=dialog.querySelector('#appearance-color');hexInput=dialog.querySelector('#appearance-hex');message=dialog.querySelector('#appearance-message');
  const presets=[['#2859dc','Ko‘k'],['#7c3aed','Binafsha'],['#087f5b','Yashil'],['#b45309','To‘q sariq'],['#be185d','Pushti'],['#b91c1c','Qizil'],['#0e7490','Moviy'],['#475569','Kulrang']];
  for(const [color,label]of presets){
    const button=document.createElement('button');button.type='button';button.className='appearance-swatch';button.dataset.color=color;
    button.style.backgroundColor=color;button.setAttribute('aria-label',t(label));button.title=t(label);
    button.onclick=()=>{apply({...current,accent:color});refreshFields();};dialog.querySelector('.appearance-presets').append(button);
  }
  colorInput.oninput=()=>{apply({...current,accent:colorInput.value});refreshFields();};
  hexInput.oninput=()=>{
    if(hex.test(hexInput.value)){apply({...current,accent:hexInput.value});colorInput.value=current.accent;hexInput.setCustomValidity('');message.textContent='';}
    else hexInput.setCustomValidity(t('Rang kodini #2859dc shaklida kiriting.'));
  };
  for(const id of ['appearance-close','appearance-cancel'])dialog.querySelector('#'+id).onclick=()=>{cancel();dialog.close();};
  dialog.addEventListener('cancel',cancel);
  dialog.addEventListener('close',()=>{if(previewing)cancel();});
  dialog.querySelector('#appearance-reset').onclick=()=>{apply({...current,accent:defaults.accent});refreshFields();message.textContent='';};
  dialog.querySelector('form').onsubmit=event=>{
    event.preventDefault();if(!hex.test(hexInput.value))return;
    apply({...current,accent:hexInput.value});baseline={...current};memory.set(storageKey(account),{...current});
    try{localStorage.setItem(storageKey(account),JSON.stringify(current));previewing=false;dialog.close();}
    catch{message.textContent=t('Brauzer saqlashga ruxsat bermadi. Tanlov ushbu oynada amal qiladi, qayta yuklanganda saqlanmasligi mumkin.');}
  };
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1 1 0 0 1 .6-1.8H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3Z"/><circle cx="7" cy="10" r=".8"/><circle cx="10" cy="7" r=".8"/><circle cx="15" cy="7" r=".8"/></svg>';
  for(const parent of [document.querySelector('.login-form'),document.querySelector('.header-right')]){
    const button=document.createElement('button');button.type='button';button.className='button appearance-open';button.setAttribute('aria-label',t('Interfeys sozlamalari'));button.title=t('Interfeys sozlamalari');
    button.innerHTML=icon;const label=document.createElement('span');label.textContent=t('Interfeys');button.append(label);
    button.onclick=()=>{baseline={...current};previewing=true;refreshFields();message.textContent='';dialog.showModal();};
    const toggle=document.createElement('button');toggle.type='button';toggle.className='icon-button theme-toggle';toggle.setAttribute('aria-label',t('Tungi rejim'));modeButtons.push(toggle);
    toggle.onclick=()=>{
      apply({...current,mode:resolveMode(current.mode,media.matches)==='night'?'day':'night'});baseline={...current};memory.set(storageKey(account),{...current});
      try{localStorage.setItem(storageKey(account),JSON.stringify(current));}catch{/* Preference still applies in this window. */}
    };
    if(parent.matches('.login-form')){
      const row=document.createElement('div');row.className='login-personalization';const language=parent.querySelector('.language-picker');if(language)row.append(language);row.append(button,toggle);parent.prepend(row);
    }else parent.prepend(button,toggle);
  }
  apply(read());baseline={...current};
}
