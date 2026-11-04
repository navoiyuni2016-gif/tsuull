import {documentHtml,escapeHtml,registryReference} from './print-document.mjs';
import {recordDimensions} from '../public/record-dimensions.mjs';
import writeXlsx from 'write-excel-file/node';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {modules} from '../public/modules.mjs';
import {createTranslator,languages} from '../public/i18n.mjs';
import {toScaled,fromScaled} from '../packages/domain/src/core.mjs';
import {visible} from './scopes.mjs';
import {validateReport} from './management.mjs';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const extras=['__status','__revision','__source_id','__approved_by','__planned_hours','__verified_hours','__calculated_hours','__snapshot_at'];
const text=value=>({value:String(value??''),type:String});
function columnLetter(n){let out='';while(n){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}return out;}
export function reportData({module,rows,all,config,lang='uz'}){
 const spec=modules[module],t=createTranslator(lang),map=new Map(all.map(r=>[r.id,r]));
 const field=key=>spec.fields.find(f=>f.key===key);
 const label=key=>t(field(key)?.label||{__status:'Holat',__revision:'Versiya',__updated:'Yangilangan'}[key]);
 const raw=(r,key)=>key==='__status'?r.status:key==='__revision'?r.revision:key==='__updated'?new Intl.DateTimeFormat(languages.find(l=>l.id===lang)?.locale||'uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'short',timeStyle:'short'}).format(new Date(r.updated_at)):r.data[key]??'';
 const value=(r,key)=>{const f=field(key),v=raw(r,key);if(f?.type==='ref'){const ref=map.get(v);return ref?ref.code+' · '+ref.data.name:v;}if(f?.type==='select'||key==='__status')return t(v);return v;};
 const totals={};for(const key of config.columns)if(['credits','hours','students','quantity'].includes(key)&&['decimal','number'].includes(field(key)?.type)){let sum=0n;for(const r of rows)sum+=toScaled(String(raw(r,key)||'0'));totals[key]=fromScaled(sum);}
 return {referenceNames:new Map(all.map(r=>[r.id,r.code+' · '+r.data.name])),headers:config.columns.map(label),values:rows.map(r=>config.columns.map(k=>value(r,k))),totals,columns:config.columns,field,value,t};
}
export function csvReport(report,{delimiter=';',excelCsv=true}={}){
 const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return '\uFEFF'+(excelCsv?'sep='+delimiter+'\r\n':'')+[report.headers,...report.values].map(row=>row.map(cell).join(delimiter)).join('\r\n');
}
export async function xlsxReport({module,rows,all,config,lang,profile,createdAt}){
 const report=reportData({module,rows,all,config,lang}),{t}=report,spec=modules[module],n=config.columns.length;
 const title=(value,size=12)=>[{...text(value),fontWeight:'bold',fontSize:size,columnSpan:n},...Array(n-1).fill(null)];
 const metadata=t('Yaratilgan:')+' '+new Intl.DateTimeFormat(languages.find(l=>l.id===lang)?.locale||'uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'short',timeStyle:'short'}).format(createdAt)+' · '+rows.length+' '+t('ta yozuv');
 const view=[title(t(spec.title),18),title(profile.universityName||profile.shortName||'TSUULL'),title(metadata,10),title(t('Joriy reyestr — rasmiy tasdiqlangan hisobot emas'),10),report.headers.map(value=>({...text(value),fontWeight:'bold',backgroundColor:'#E8EDF3',color:'#1B2940',wrap:true,bottomBorderColor:'#A8B3C4',bottomBorderStyle:'thin'}))];
 for(const [i,row]of report.values.entries())view.push(row.map((value,j)=>{
  const numeric=['decimal','number'].includes(report.field(config.columns[j])?.type)&&value!=='';
  return {value:numeric?Number(value):String(value??''),type:numeric?Number:String,format:numeric?'0.####':undefined,backgroundColor:i%2?'#F5F7FA':'#FFFFFF',color:'#1B2940',wrap:true,bottomBorderColor:'#E1E6ED',bottomBorderStyle:'thin'};
 }));
 if(rows.length&&Object.keys(report.totals).length)view.push(config.columns.map((key,i)=>report.totals[key]!==undefined?{value:Number(report.totals[key]),type:Number,format:'0.####',fontWeight:'bold',backgroundColor:'#E8EDF3'}:{...text(i===0?t('Jami'):''),fontWeight:'bold',backgroundColor:'#E8EDF3'}));
 const ref=id=>all.find(r=>r.id===id)?.code||id;
 const raw=[spec.fields.map(f=>text(f.key)).concat(extras.map(text)),...rows.map(r=>spec.fields.map(f=>text(f.type==='ref'?ref(r.data[f.key]):r.data[f.key]??'')).concat([r.status,r.revision,r.source_id,r.approved_by||'',r.data._approval?.plannedHours||'',r.data._approval?.verifiedActualHours||r.data._approval?.verifiedHours||'',r.data._approval?.hours||r.data._approval?.calculation?.basicTeachingDemand||'',r.data._approval?.capturedAt||''].map(text)))];
 const buffer=await writeXlsx([{data:raw,sheet:'Reyestr',columns:raw[0].map(()=>({width:25})),stickyRowsCount:1},{data:view,sheet:'Hisobot',columns:config.columns.map(k=>({width:k==='name'?36:['__status','__updated'].includes(k)?24:22})),stickyRowsCount:5,orientation:config.orientation,showGridLines:false}],{fontFamily:'Calibri',fontSize:11}).toBuffer();
 // The native writer owns styles and relationships; retain the first raw sheet.
 const zip=unzipSync(new Uint8Array(buffer));let workbook=strFromU8(zip['xl/workbook.xml']);
 workbook=workbook.replace(/<workbookView\b[^>]*\/?\s*>/,tag=>tag.includes('activeTab=')?tag.replace(/activeTab="[^"]*"/,'activeTab="1"'):tag.replace(/\/?\s*>$/,m=>' activeTab="1"'+m));zip['xl/workbook.xml']=strToU8(workbook);
 const xml=strFromU8(zip['xl/worksheets/sheet2.xml']);zip['xl/worksheets/sheet2.xml']=strToU8(xml.replace('</sheetData>','</sheetData><autoFilter ref="A5:'+columnLetter(n)+(5+rows.length)+'"/>'));
 return Buffer.from(zipSync(zip));
}
export function htmlReport({module,report,profile,createdAt,config,lang}){
 const {t}=report,e=escapeHtml,title=t(modules[module].title);
 const filters=Object.entries(config.filters).filter(([,v])=>v).map(([k,v])=>t({q:'Qidirish...',status:'Holat',year:'O‘quv yili',department:'Kafedra'}[k])+': '+(k==='status'?t(v):report.referenceNames?.get(v)||v)).join(' · ');
 const numeric=j=>['decimal','number'].includes(report.field(report.columns[j])?.type)?' class="number"':'';
 const content=(filters?'<p class="filter-summary">'+e(filters)+'</p>':'')+'<table class="registry-table"><thead><tr><th scope="col" class="row-number">№</th>'+report.headers.map(v=>'<th scope="col">'+e(v)+'</th>').join('')+'</tr></thead><tbody>'+report.values.map((row,i)=>'<tr><td class="row-number">'+(i+1)+'</td>'+row.map((v,j)=>'<td'+numeric(j)+'>'+e(v)+'</td>').join('')+'</tr>').join('')+(!report.values.length?'<tr><td colspan="'+(report.columns.length+1)+'">'+e(t('Yozuv topilmadi'))+'</td></tr>':'')+'</tbody>'+(report.values.length&&Object.keys(report.totals).length?'<tfoot><tr><th scope="row">'+e(t('Jami'))+'</th>'+report.columns.map(k=>'<td class="number">'+e(report.totals[k]??'')+'</td>').join('')+'</tr></tfoot>':'')+'</table>';
 return documentHtml({lang,profile,title,reference:registryReference({module,createdAt,config,report}),createdAt,metadata:[['Yozuvlar soni',report.values.length]],status:t('REYESTRDAN KO‘CHIRMA'),notice:t('Joriy reyestr — rasmiy tasdiqlangan hisobot emas'),content,orientation:config.orientation});
}
export function registerReportExports(app,{pool,fail,allRecords}){
 app.get('/api/management/export/:module',async(req,res)=>{
  const module=req.params.module,lang=req.query.lang||'uz',format=req.query.format||'xlsx';
  if(!Object.hasOwn(modules,module))fail(404,'Modul topilmadi.');if(!languages.some(l=>l.id===lang)||!['xlsx','csv','html'].includes(format))fail(400,'Eksport formati yoki tili noto‘g‘ri.');
  const config=validateReport(module,{columns:req.query.columns?String(req.query.columns).split(','):undefined,filters:{q:String(req.query.q||''),status:String(req.query.status||''),year:String(req.query.year||''),department:String(req.query.department||'')},delimiter:req.query.delimiter||';',excelCsv:req.query.excelCsv!=='0',orientation:req.query.orientation||'landscape'});
  const all=await allRecords(pool);const dimensions=r=>recordDimensions(r,all);
  const rows=all.filter(r=>r.module===module&&!r.data._excluded&&visible(r,req.user,all)&&(!config.filters.q||(r.code+' '+r.data.name).toLocaleLowerCase().includes(config.filters.q.toLocaleLowerCase()))&&(!config.filters.status||r.status===config.filters.status)&&(!config.filters.year||dimensions(r).year===config.filters.year)&&(!config.filters.department||dimensions(r).department===config.filters.department));
  const visibleSources=all.filter(r=>visible(r,req.user,all));
  const profile=(await pool.query('SELECT profile FROM portal.settings WHERE id=true')).rows[0]?.profile||{},createdAt=new Date(),data=reportData({module,rows,all:visibleSources,config,lang});
  if(format==='html')return res.type('html').send(htmlReport({module,report:data,profile,createdAt,config,lang}));
  const filename=module+'-'+createdAt.toISOString().slice(0,10)+'.'+format;res.set('Content-Disposition','attachment; filename="'+filename+'"');
  if(format==='csv')return res.type('text/csv; charset=utf-8').send(csvReport(data,config));
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(await xlsxReport({module,rows,all:visibleSources,config,lang,profile,createdAt}));
 });
}
