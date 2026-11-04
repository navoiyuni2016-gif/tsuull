import assert from 'node:assert/strict';
import {csvReport} from '../server/report-export.mjs';
const report={headers:['Code','Name','Hours'],values:[['0001','O‘zbek, Русский; English "quoted"\nnext line','1.25'],['=HYPERLINK("x")','@SUM(1,2)','-2']]};
for(const delimiter of [';',',','\t'])for(const excelCsv of [true,false]){
 const csv=csvReport(report,{delimiter,excelCsv});
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.endsWith('\r\n'));
 assert.equal(csv.includes('sep='+delimiter+'\r\n'),excelCsv);
 assert.ok(csv.includes('"0001"'));assert.ok(csv.includes('English ""quoted""\nnext line'));
 for(const danger of ["'=HYPERLINK","'@SUM","'-2"])assert.ok(csv.includes(danger),danger);
 assert.ok(csv.includes('"1.25"'));
}
assert.equal(csvReport({headers:['Code','Name'],values:[]},{excelCsv:false}),'\uFEFF"Code";"Name"\r\n');
console.log('PASS CSV: all separators, Excel mode, UTF-8, quotes, multiline Unicode, empty data, decimals, code text and formula neutralization');
