"""Native planning E2E; isolated DB/server, synthetic norms and local-model contract fixture."""
from pathlib import Path
import sys,secrets
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l)
run=secrets.token_hex(4).upper();out=Path('/workspace/artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def login(pg,email,password):
  pg.goto(cfg['APP_ORIGIN']);pg.fill('#email',email);pg.fill('#password',password);pg.click('#login-form button[type=submit]');pg.locator('#app-view').wait_for(state='visible')
 login(page,cfg['USER_EMAIL'],cfg['USER_PASSWORD'])
 def api(pg,path,body=None):
  r=pg.evaluate('''async ([path,body])=>{const me=await fetch('/api/me').then(r=>r.json());const r=await fetch('/api'+path,{method:body===null?'GET':'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:body===null?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}''',[path,body])
  assert r['status'] in (200,201),r;return r['data']
 reviewer_pass=secrets.token_hex(16);reviewer_email='studio-review-'+run.lower()+'@test.invalid'
 api(page,'/users',{'email':reviewer_email,'password':reviewer_pass,'name':'Studio review fixture','role':'APPROVER'})
 review=b.new_context();rp=review.new_page();login(rp,reviewer_email,reviewer_pass)
 def create(module,data):return api(page,'/records/'+module,{'data':data})
 def approve(r):
  r=api(page,'/records/'+r['id']+'/workflow',{'action':'submit','revision':r['revision'],'reason':'Synthetic UI fixture'})
  return api(rp,'/records/'+r['id']+'/workflow',{'action':'approve','revision':r['revision'],'reason':'Synthetic UI fixture checked'})
 f=create('faculties',{'code':'UF'+run,'name':'Studio UI faculty'})
 d=create('departments',{'code':'UD'+run,'name':'Studio UI department','faculty':f['id']})
 y=create('years',{'code':'UY'+run,'name':'Fixture 2026/2027','start':'2026-09-01','end':'2027-08-31'})
 params={'hoursPerCredit':'30','contactBasisPoints':4000,'lectureBasisPoints':5000,'practiceBasisPoints':5000,'seminarBasisPoints':0,'labBasisPoints':0,'individualBasisPoints':0,'practiceGroupMax':25,'lectureStreamMax':100,'seminarGroupMax':25,'labGroupMax':15,'individualUnit':'PER_STUDENT','roundingPlaces':0,'roundingMode':'HALF_UP','remainderActivity':'practice','teacherAnnualLimit':'900','termCreditLimit':'6','programCredits':'6','termCount':2}
 rule=approve(create('rules',{'code':'UR'+run,'name':'Synthetic UI rule','legalBasis':'ONLY TEST FIXTURE','effectiveFrom':'2026-09-01','effectiveTo':'2027-08-31','scope':run,'parameters':'TEST ONLY','calculation':params,'department':d['id'],'year':y['id']}))
 a=approve(create('subjects',{'code':'UA'+run,'name':'Birinchi sinov fani','department':d['id'],'credits':'2','category':'Majburiy','language':'O‘zbek'}))
 c=approve(create('subjects',{'code':'UB'+run,'name':'Ikkinchi sinov fani','department':d['id'],'credits':'4','category':'Majburiy','language':'O‘zbek','prerequisiteCodes':a['code']}))
 page.reload();page.locator('#app-view').wait_for(state='visible');page.locator('#navigation [data-route="studio"]').click();page.click('#studio-new')
 for key,val in {'code':'UP'+run,'name':'Tizim ichida yaratilgan reja','source':'NATIVE-UI-FIXTURE','onDate':'2026-10-29'}.items():page.fill('#field-'+key,val)
 for key,val in {'year':y['id'],'department':d['id'],'level':'Bakalavriat','mode':'Kunduzgi','rule':rule['id']}.items():page.select_option('#field-'+key,val)
 page.click('#editor-form button[type=submit]');page.locator('#editor-dialog').wait_for(state='hidden')
 plan=next(r for r in api(page,'/records') if r['code']=='UP'+run)
 page.select_option('#studio-plan',plan['id']);page.locator('#studio-add').wait_for()
 for subject,semester in [(a,1),(c,2)]:
  page.select_option('#studio-subject',subject['id']);page.fill('#studio-semester',str(semester));page.click('#studio-add')
 expect(page.locator('#studio-grid tbody tr')).to_have_count(2)
 expect(page.locator('#studio-calculation')).to_contain_text('180')
 if '--without-ai' in sys.argv:
  expect(page.locator('#studio-ai')).to_be_disabled();page.click('#studio-recommend');expect(page.locator('#studio-recommend')).to_be_enabled()
 else:
  page.fill('#studio-instruction','Semestrlar bo‘yicha joylashtiring.');page.click('#studio-ai');page.locator('#studio-ai-apply').wait_for();page.click('#studio-ai-apply')
  expect(page.locator('#studio-ai-result')).to_contain_text('jadvalga o‘tkazildi')
 page.on('dialog',lambda dialog:dialog.accept('UI fixture yuborildi') if dialog.type=='prompt' else dialog.accept())
 page.click('#studio-save');expect(page.locator('#studio-save-state')).to_have_text('Saqlangan reja ochildi.');expect(page.locator('#studio-save')).to_be_enabled()
 assert len([r for r in api(page,'/records') if r['module']=='plan_items' and r['data']['curriculum']==plan['id']])==2
 page.locator('#studio-grid tbody tr').filter(has_text='Ikkinchi sinov fani').get_by_role('button',name='Olib tashlash').click();page.click('#studio-save');expect(page.locator('#studio-save-state')).to_have_text('Saqlangan reja ochildi.');expect(page.locator('#studio-save')).to_be_enabled();expect(page.locator('#studio-grid tbody tr')).to_have_count(1)
 page.select_option('#studio-subject',c['id']);page.fill('#studio-semester','2');page.click('#studio-add');page.click('#studio-save');expect(page.locator('#studio-save-state')).to_have_text('Saqlangan reja ochildi.');expect(page.locator('#studio-save')).to_be_enabled()
 expect(page.locator('#studio-grid tbody tr')).to_have_count(2);expect(page.locator('#studio-calculation')).to_contain_text('180');page.locator('#studio-calculation details').click();page.screenshot(path=str(out/'plan-studio-desktop.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'plan-studio-mobile.png'),full_page=True);page.set_viewport_size({'width':1440,'height':1000})
 page.click('#studio-details');page.locator('#detail-dialog').wait_for();page.click('[data-workflow="submit"]');page.locator('#detail-dialog').wait_for(state='hidden')
 expect(page.locator('#studio-add')).to_have_count(0)
 submitted=next(r for r in api(page,'/records') if r['id']==plan['id'])
 approved=api(rp,'/records/'+plan['id']+'/workflow',{'action':'approve','revision':submitted['revision'],'reason':'UI final academic fixture approval'})
 assert approved['data']['_approval']['totalCredits']=='6'
 assert not errors,errors
 b.close();print(('WITHOUT AI: deterministic advice; ' if '--without-ai' in sys.argv else 'LOCAL API FIXTURE: model contract advice; ')+'PASS native plan UI: create, grid, exact hours, explicit apply/save, remove/history/re-add, mobile, submit/independent approval; no JS errors')
