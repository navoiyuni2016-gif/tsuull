"""Full v3 Superadmin workflow on an isolated instance; no real institutional values."""
from pathlib import Path
import secrets,sys,json
from playwright.sync_api import sync_playwright
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l);run=secrets.token_hex(3).upper();out=Path('/workspace/artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(cfg['APP_ORIGIN']);page.fill('#email',cfg['USER_EMAIL']);page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]');page.locator('#app-view').wait_for(state='visible')
 def nav(r):page.locator('#navigation [data-route="'+r+'"]').click()
 def api(path,body=None):
  result=page.evaluate('''async ([path,body])=>{const me=await fetch('/api/me').then(r=>r.json());const r=await fetch('/api'+path,{method:body===null?'GET':'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:body===null?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}''',[path,body]);assert result['status'] in (200,201),result;return result['data']
 nav('settings');page.locator('#settings-form').wait_for();
 for key,val in {'universityName':'Sinov universiteti','shortName':'ERP TEST','universityCode':'UITEST','email':'sinov@example.invalid','phone':'','address':'Sinov manzil','rector':'','departmentHead':''}.items():page.fill('#institution__'+key,val)
 page.click('#settings-form button[type=submit]');page.wait_for_timeout(150);assert page.locator('.brand').inner_text().find('ERP TEST')>=0;page.screenshot(path=str(out/'superadmin-v3.png'),full_page=True)
 faculty=api('/records/faculties',{'data':{'code':'V3F'+run,'name':'V3 fakultet'}});dep=api('/records/departments',{'data':{'code':'V3D'+run,'name':'V3 kafedra','faculty':faculty['id']}});year=api('/records/years',{'data':{'code':'V3Y'+run,'name':'V3 2026/2027','start':'2026-09-01','end':'2027-08-31'}})
 page.reload();page.locator('#app-view').wait_for(state='visible');nav('rules');page.click('#create-record')
 for key,val in {'code':'V3R'+run,'name':'Qo‘lda kiritilgan sinov me’yori','legalBasis':'Faqat UI test fixture','effectiveFrom':'2026-09-01','effectiveTo':'2027-08-31','scope':'UI-'+run,'parameters':'Typed UI fixture'}.items():page.fill('#field-'+key,val)
 page.select_option('#field-department',dep['id']);page.select_option('#field-year',year['id']);page.check('#academic-enable')
 params={'hoursPerCredit':'30','contactBasisPoints':4000,'lectureBasisPoints':5000,'practiceBasisPoints':5000,'seminarBasisPoints':0,'labBasisPoints':0,'individualBasisPoints':0,'practiceGroupMax':25,'lectureStreamMax':100,'seminarGroupMax':25,'labGroupMax':15,'individualUnit':'PER_STUDENT','roundingPlaces':0,'roundingMode':'HALF_UP','remainderActivity':'practice','teacherAnnualLimit':'900','termCreditLimit':'30','programCredits':'6','termCount':2}
 for key,val in params.items():
  el=page.locator('#parameter__'+key)
  if el.evaluate('(n)=>n.tagName')=='SELECT':el.select_option(str(val))
  else:el.fill(str(val))
 page.screenshot(path=str(out/'parameters-v3.png'),full_page=True);page.click('#editor-form button[type=submit]');page.locator('#editor-dialog').wait_for(state='hidden');page.fill('#record-search','V3R'+run);page.click('[data-detail]');page.locator('#detail-dialog').wait_for()
 # Independent approver logs in through a separate browser context.
 reviewerPass=secrets.token_hex(16);reviewerEmail='review-'+run.lower()+'@test.invalid';api('/users',{'email':reviewerEmail,'name':'UI akademik tasdiqlovchi','role':'APPROVER','password':reviewerPass})
 records=api('/records');rule=next(r for r in records if r['code']=='V3R'+run)
 api('/records/'+rule['id']+'/workflow',{'action':'submit','revision':rule['revision'],'reason':'UI me’yorini ko‘rib chiqish'})
 review=b.new_context();rp=review.new_page();rp.goto(cfg['APP_ORIGIN']);rp.fill('#email',reviewerEmail);rp.fill('#password',reviewerPass);rp.click('#login-form button[type=submit]');rp.locator('#app-view').wait_for(state='visible');rp.locator('#navigation [data-route="rules"]').click();rp.fill('#record-search','V3R'+run);rp.click('[data-detail]');rp.on('dialog',lambda d:d.accept('UI fixture tekshirildi') if d.type=='prompt' else d.accept());rp.click('[data-workflow="approve"]');rp.locator('#detail-dialog').wait_for(state='hidden');review.close();page.locator('[data-close="detail-dialog"]').first.click()
 subject=api('/records/subjects',{'data':{'code':'V3S'+run,'name':'V3 fan','department':dep['id'],'credits':'6','category':'Majburiy','language':'O‘zbek'}});group=api('/records/groups',{'data':{'code':'V3G'+run,'name':'V3 guruh','year':year['id'],'department':dep['id'],'students':75,'kind':'Ma’ruza potoki'}})
 page.reload();page.locator('#app-view').wait_for(state='visible');nav('official');page.select_option('#official-rule',rule['id']);page.select_option('#official-subject',subject['id']);page.select_option('#official-group',group['id']);page.fill('#official-date','2026-10-28');page.click('#official-form button[type=submit]');page.locator('#official-output .calc-result').wait_for();assert page.locator('#official-output .calc-result strong').inner_text()=='144';page.screenshot(path=str(out/'calculation-v3.png'),full_page=True)
 nav('import');page.locator('#import-module').wait_for();page.select_option('#import-module','faculties')
 # Download official application template, then fill a fixture workbook via server-independent writer helper.
 with page.expect_download() as dl:page.click('#import-template')
 dl.value.save_as(str(out/'v3-template.xlsx'))
 import subprocess
 fixture=out/'v3-import.xlsx'
 subprocess.run(['node','--input-type=module','-e',"import write from 'write-excel-file/node';await write([[{type:String,value:'code'},{type:String,value:'name'}],[{type:String,value:'UP"+run+"'},{type:String,value:'UI import fixture'}]]).toFile(process.argv[1])",str(fixture)],cwd='/workspace/tsuull',check=True)
 page.set_input_files('#import-file',str(fixture));page.click('#import-inspect');page.locator('#import-preview').wait_for();page.click('#import-preview');page.locator('#import-commit').wait_for();page.screenshot(path=str(out/'import-v3.png'),full_page=True);page.on('dialog',lambda d:d.accept());page.click('#import-commit');page.locator('#import-history-placeholder').count() # avoid relying on a transient toast
 page.wait_for_timeout(250);assert any(r['code']=='UP'+run for r in api('/records'))
 nav('profile');page.locator('#personal-form').wait_for();page.fill('#personal-name','V3 Sinov administratori');page.click('#personal-form button[type=submit]');page.locator('#mfa-start').wait_for();assert 'MFA' in page.locator('#page-content').inner_text()
 nav('users');page.locator('tbody tr').first.wait_for();page.get_by_role('button',name='Rol / doira / parol').first.click();page.locator('#access-form').wait_for();page.click('#access-close')
 nav('settings');page.locator('#settings-form').wait_for();page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'superadmin-mobile-v3.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors;b.close();print('PASS v3 UI: Superadmin profile, typed parameter form, independent academic approval, institutional 144-hour calculation, XLSX template/upload/mapping/dry-run/commit, personal profile, scope controls, mobile layout; no JS errors')
