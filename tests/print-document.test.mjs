import assert from 'node:assert/strict';
import {calculationDocument,registryReference} from '../server/print-document.mjs';
const run={id:'a0000000-0000-0000-0000-000000000001',kind:'SIMULATION',created_at:'2026-11-04T04:38:00Z',actor_name:'SYNTHETIC Sh Ch <script>literal</script>',input:{credits:'6',hoursPerCredit:'30',groups:3,lectureStreams:1,contactBasisPoints:4000,lectureBasisPoints:5000},result:{totalStudentHours:'180',contactHoursPerStudent:'72',independentHoursPerStudent:'108',basicTeachingDemand:'144',lectureTeachingDemand:'36',practiceTeachingDemand:'108'},sources:[]};
for(const [lang,title] of [['uz','Fan soatlarini hisoblash ma’lumotnomasi'],['ru','Справка о расчёте часов дисциплины'],['en','Course hours calculation statement'],['uz-new','Fan soatlarini hisoblaş ma’lumotnomasi']]){
 const html=calculationDocument({run,profile:{universityName:'Synthetic & University'},lang});
 assert.ok(html.includes(title),lang);assert.ok(html.includes('Synthetic &amp; University'));
 assert.ok(html.includes('Sh Ch &lt;script&gt;literal&lt;/script&gt;'));assert.ok(!html.includes('<script>literal'));
 assert.ok(html.includes('<td>40</td><td>%</td>'));assert.ok(html.includes('<td>50</td><td>%</td>'));
 assert.ok(!html.includes('<details'));assert.ok(html.includes('CALC-'+run.id));
 for(const value of ['180','72','108','144','36'])assert.ok(html.includes('>'+value+'</td>'));
 assert.ok(html.includes('report-portrait'));assert.ok(!html.includes('style='));
}
const source={id:'rule-fixture',module:'rules',code:'TEST-RULE',revision:3,status:'APPROVED',data:{name:'Frozen <img> rule',legalBasis:'TEST & ONLY',effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31'}};
const formal=calculationDocument({run:{...run,kind:'RULE_BASED',sources:[source],result:{...run.result,legalBasis:'TEST & ONLY',activityHours:{lecture:'36',practice:'36'},teachingHours:{lecture:'36',practice:'108'},groups:{lecture:1,practice:3},rounding:{mode:'HALF_UP',places:2}}},lang:'en'});
assert.ok(formal.includes('TEST &amp; ONLY'));assert.ok(formal.includes('Frozen &lt;img&gt; rule'));assert.ok(formal.includes('v3'));assert.ok(formal.includes('Calculation by activity'));
const args={module:'faculties',createdAt:'2026-11-04T04:38:00Z',config:{},report:{headers:['Name'],values:[['Synthetic']]}};
assert.equal(registryReference(args),registryReference(args));
assert.notEqual(registryReference(args),registryReference({...args,report:{...args.report,values:[['Other']]}}));
console.log('PASS print documents: four languages, exact saved values, percentages, source versions, escaped business names, honest status and extract references');
