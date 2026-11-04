import assert from 'node:assert/strict';
import {readSheet} from 'read-excel-file/node';
import {unzipSync,strFromU8} from 'fflate';
import {modules} from '../public/modules.mjs';
import {reportData,csvReport,xlsxReport,htmlReport} from '../server/report-export.mjs';
import {validateReport} from '../server/management.mjs';
let count=0;
for(const [module,spec]of Object.entries(modules))for(const lang of ['uz','ru','en','uz-new']){
 const data=Object.fromEntries(spec.fields.map(f=>[f.key,f.type==='decimal'?'1.25':f.type==='number'?2:f.type==='select'?f.options[0]:f.type==='date'?'2026-11-04':f.type==='time'?'10:00':'SYNTHETIC']));
 data.code='TEST-01';data.name='=SUM(1,2) Sh Ch O‘ G‘ <b>literal</b>';
 const row={id:'synthetic-id',module,code:data.code,data,status:'DRAFT',revision:1,source_id:'SYNTHETIC',updated_at:'2026-11-04T08:00:00Z'};
 const rows=[row,row],config=validateReport(module,{}),args={module,rows,all:rows,config,lang,profile:{universityName:'SYNTHETIC UNIVERSITY'},createdAt:new Date('2026-11-04T08:00:00Z')};
 const report=reportData(args);assert.equal(report.values[0][1],data.name);
 for(const f of spec.fields)if(['credits','hours','quantity','students'].includes(f.key))assert.equal(report.totals[f.key],f.type==='decimal'?'2.5':'4');
 const csv=csvReport(report,config);assert.ok(csv.startsWith('\uFEFFsep=;\r\n'));assert.ok(csv.includes("'=SUM(1,2)"));assert.ok(!csvReport(report,{delimiter:',',excelCsv:false}).includes('sep='));
 const workbook=await xlsxReport(args),raw=await readSheet(workbook,'Reyestr'),view=await readSheet(workbook,'Hisobot');
 assert.deepEqual(raw[0].slice(0,spec.fields.length),spec.fields.map(f=>f.key));assert.equal(raw[1][1],data.name);
 assert.deepEqual(view[4],report.headers);assert.equal(view[5][1],data.name);
 const zip=unzipSync(new Uint8Array(workbook)),xml=strFromU8(zip['xl/worksheets/sheet2.xml']),wb=strFromU8(zip['xl/workbook.xml']);
 assert.ok(xml.includes('state="frozen"'));assert.equal((xml.match(/<autoFilter\b/g)||[]).length,1);assert.ok(!/<f(?:\s|>)/.test(xml));
 assert.ok((wb.match(/<definedNames\b/g)||[]).length<=1);assert.ok(wb.includes('activeTab="1"'));
 const html=htmlReport({...args,report});assert.ok(!html.includes('<b>literal</b>'));assert.ok(html.includes('&lt;b&gt;literal&lt;/b&gt;'));
 const empty=await xlsxReport({...args,rows:[]});assert.equal((await readSheet(empty,'Hisobot')).length,5);
 count++;
}
console.log('PASS '+count+' multilingual workbook/report cases: raw import sheet, numeric totals, empty data, safe formulas, PDF HTML, freeze/filter and no duplicate XML containers');
