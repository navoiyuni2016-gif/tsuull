"""Real curriculum revision and independently approved schedule workflows."""
from pathlib import Path
import json,secrets,sys
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l)
x=json.loads(Path(sys.argv[2]).read_text());nonce=secrets.token_hex(4).upper()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=b.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def login(pg,email):
  pg.goto(cfg['APP_ORIGIN']+'/?lang=en');pg.fill('#email',email);pg.fill('#password',x['password']);pg.click('#login-form button[type=submit]');expect(pg.locator('#app-view')).to_be_visible()
 def route(key):
  if page.viewport_size['width']<800:page.click('#menu-toggle')
  page.locator('#navigation [data-route="'+key+'"]').click();page.wait_for_timeout(120)
 def api(pg,path,body=None,method=None):
  result=pg.evaluate('''async([path,body,method])=>{const me=await fetch('/api/me').then(r=>r.json());const r=await fetch('/api'+path,{method:method||(body===null?'GET':'POST'),headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:body===null?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}''',[path,body,method])
  assert result['status'] in (200,201),result;return result['data']
 login(page,x['adminEmail'])
 review=b.new_context();rp=review.new_page();login(rp,x['reviewerEmail'])
 def approve(record):
  record=api(page,'/records/'+record['id']+'/workflow',{'action':'submit','revision':record['revision'],'reason':'Synthetic UI controls submission'})
  return api(rp,'/records/'+record['id']+'/workflow',{'action':'approve','revision':record['revision'],'reason':'Synthetic independent UI academic review'})
 # Create a real new curriculum version using the new dialog.
 route('curricula');page.fill('#record-search','PLAN'+x['run']);page.locator('[data-detail="'+x['oldPlanId']+'"]').click()
 page.click('#create-revision');dialog=page.locator('.management-dialog');expect(dialog).to_be_visible()
 dialog.locator('[name=code]').fill('UPLAN'+nonce);dialog.locator('[name=reason]').fill('Synthetic UI curriculum revision reason');dialog.locator('button[type=submit]').click()
 expect(page.locator('#compare-right')).to_be_visible();new_id=page.locator('#compare-right').input_value();assert new_id and new_id!=x['oldPlanId']
 expect(page.locator('#compare-left')).to_have_value(x['oldPlanId']);page.locator('#plan-compare-form button[type=submit]').click()
 expect(page.locator('[data-edit-plan="'+new_id+'"]')).to_be_visible();page.locator('[data-edit-plan="'+new_id+'"]').click()
 expect(page.locator('#studio-plan')).to_have_value(new_id);expect(page.locator('#studio-grid tbody tr')).to_have_count(1)
 page.locator('#studio-grid [data-remove]').click();page.select_option('#studio-subject',x['newSubjectId']);page.fill('#studio-semester','2');page.click('#studio-add')
 page.fill('#studio-change-reason','Synthetic UI semester and credit change')
 page.once('dialog',lambda d:d.accept())
 with page.expect_response(lambda r:r.url.endswith('/studio') and r.request.method=='PUT') as saved:page.click('#studio-save')
 assert saved.value.status==200;expect(page.locator('#studio-save')).to_be_enabled()
 route('compare');page.select_option('#compare-left',x['oldPlanId']);page.select_option('#compare-right',new_id);page.locator('#plan-compare-form button[type=submit]').click()
 expect(page.locator('#compare-result')).to_contain_text('Synthetic UI semester and credit change')
 expect(page.locator('#compare-result')).to_contain_text('-3');expect(page.locator('#compare-result')).to_contain_text('90')
 page.locator('[data-compare-row]').first.click();expect(page.locator('.management-dialog')).to_contain_text('Lecture / student');expect(page.locator('.management-dialog')).to_contain_text('18')
 page.locator('.management-dialog .icon-button').click()
 with context.expect_page() as opened:page.click('#compare-pdf')
 paper=opened.value;paper.wait_for_load_state('networkidle');expect(paper.locator('h1')).to_have_text('Compare curriculum versions');expect(paper.locator('body')).to_contain_text('Hour differences')
 paper.pdf(path='/workspace/artifacts/controls-comparison.pdf',prefer_css_page_size=True,print_background=True,display_header_footer=False);paper.close()
 page.screenshot(path='/workspace/artifacts/controls-comparison-desktop.png',full_page=True)
 # Enter a calendar policy in the actual administrator UI. No auto approval.
 route('rules');page.click('#create-record')
 for key,value in {'code':'CLOCKUI'+nonce,'name':'Synthetic UI class period rule','legalBasis':'TEST FIXTURE ONLY','parameters':'TEST ONLY period policy','scope':'CLOCKUI'+nonce}.items():page.fill('#field-'+key,value)
 page.select_option('#field-year',x['yearId']);page.check('#schedule-policy-enable');page.click('#schedule-policy-preset')
 assert len(page.locator('#schedule-policy-lines').input_value().splitlines())==8
 expect(page.locator('#field-effectiveFrom')).to_have_value('2026-09-01')
 with page.expect_response(lambda r:r.url.endswith('/api/records/rules') and r.request.method=='POST') as saved:page.locator('#editor-form button[type=submit]').click()
 assert saved.value.status==201,saved.value.text();policy=saved.value.json();assert policy['status']=='DRAFT';policy=approve(policy)
 page.reload();expect(page.locator('#app-view')).to_be_visible();route('schedule');page.click('#create-record')
 for key,value in {'code':'SCHUI'+nonce,'name':'Synthetic UI scheduled class','date':'2026-11-12','room':'ROOMUI'+nonce,'capacity':'30'}.items():page.fill('#field-'+key,value)
 page.select_option('#field-workload',x['loadId']);expect(page.locator('#field-teacher')).to_have_value(x['teacherId']);expect(page.locator('#field-group')).to_have_value(x['groupId'])
 page.select_option('#field-timeRule',policy['id']);page.select_option('#schedule-period','0');expect(page.locator('#field-academicHours')).to_have_value('2')
 assert page.locator('#field-academicHours').get_attribute('readonly') is not None
 with page.expect_response(lambda r:r.url.endswith('/api/records/schedule') and r.request.method=='POST') as saved:page.locator('#editor-form button[type=submit]').click()
 assert saved.value.status==201,saved.value.text();lesson=saved.value.json()
 route('reconciliation');form=page.locator('#schedule-reconcile-form');expect(form.locator('[name=year]')).to_be_enabled()
 page.select_option('#schedule-reconcile-form [name=year]',x['yearId']);page.select_option('#schedule-reconcile-form [name=teacher]',x['teacherId'])
 def reconcile(values):
  form.locator('button[type=submit]').click();expect(form.locator('button[type=submit]')).to_be_enabled();expect(page.locator('.control-stats .stat-value')).to_have_text(values)
 reconcile(['3','0','2','3','0','0'])
 lesson=approve(lesson);reconcile(['3','2','0','1','0','0'])
 second=api(page,'/records/schedule',{'data':{**lesson['data'],'code':'SCHUI2'+nonce,'date':'2026-11-13'}});approve(second)
 reconcile(['3','4','0','0','1','0'])
 page.locator('[data-schedule-lessons]').click();expect(page.locator('.management-dialog tbody tr')).to_have_count(2);page.locator('.management-dialog .icon-button').click()
 page.screenshot(path='/workspace/artifacts/controls-reconciliation-desktop.png',full_page=True)
 with context.expect_page() as opened:page.click('#schedule-reconcile-pdf')
 paper=opened.value;paper.wait_for_load_state('networkidle');expect(paper.locator('h1')).to_have_text('Schedule and workload reconciliation');paper.close()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.locator('.header-right .theme-toggle').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/workspace/artifacts/controls-reconciliation-mobile.png',full_page=True)
 route('compare');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 b.close();print('PASS controls UI: real plan revision/save/reason/differences/PDF, administrator period preset + independent approval, server-derived read-only hours, pending/approved/gap/excess with no fabricated actuals, mobile/dark')
