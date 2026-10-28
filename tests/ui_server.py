"""Run against an isolated test instance: python3 tests/ui_server.py /secure/path/ui.env.
Requires Python Playwright and /usr/bin/chromium. Creates synthetic test records.
"""
from pathlib import Path
import sys,secrets
from playwright.sync_api import sync_playwright
cfg=dict(line.split('=',1) for line in Path(sys.argv[1]).read_text().splitlines() if '=' in line)
base=cfg['APP_ORIGIN'];run=secrets.token_hex(3).upper();out=Path('/workspace/artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1);errors=[];csp=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:csp.append(m.text) if m.type=='error' and 'Content Security Policy' in m.text else None)
 page.goto(base);page.locator('#login-view').wait_for(state='visible');page.screenshot(path=str(out/'login-v2.png'),full_page=True)
 page.fill('#email',cfg['USER_EMAIL']);page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]');page.locator('#app-view').wait_for(state='visible')
 def nav(route):
  page.locator('#navigation [data-route="'+route+'"]').click();page.wait_for_timeout(80)
 def api(path,body):
  result=page.evaluate('''async ([path,body])=>{const me=await fetch('/api/me').then(r=>r.json());const r=await fetch('/api'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}''',[path,body])
  assert result['status'] in (200,201),result
  return result['data']
 nav('faculties');page.click('#create-record');page.fill('#field-code','UIF'+run);page.fill('#field-name','Filologiya fakulteti · sinov');page.click('#editor-form button[type=submit]');page.locator('#editor-dialog').wait_for(state='hidden');page.fill('#record-search','UIF'+run);assert page.locator('tbody tr').count()==1
 page.click('[data-detail]');page.click('#edit-record');page.fill('#field-name','O‘zbek filologiyasi · sinov');page.click('#editor-form button[type=submit]');page.locator('#editor-dialog').wait_for(state='hidden')
 page.click('#create-record');page.fill('#field-code','UIF'+run);page.fill('#field-name','Takroriy kod');page.click('#editor-form button[type=submit]');page.locator('#editor-error').wait_for(state='visible');assert 'mavjud' in page.locator('#editor-error').inner_text();page.click('[data-close="editor-dialog"]')
 records=page.evaluate("fetch('/api/records').then(r=>r.json())");faculty=next(r for r in records if r['code']=='UIF'+run)
 dep=api('/records/departments',{'data':{'code':'UID'+run,'name':'O‘zbek tilshunosligi · sinov','faculty':faculty['id']}})
 year=api('/records/years',{'data':{'code':'UIY'+run,'name':'2026/2027 · sinov','start':'2026-09-01','end':'2027-08-31'}})
 subject=api('/records/subjects',{'data':{'code':'UIS'+run,'name':'Hozirgi o‘zbek adabiy tili · sinov','department':dep['id'],'credits':'6','category':'Majburiy','language':'O‘zbek'}})
 group=api('/records/groups',{'data':{'code':'UIG'+run,'name':'Filologiya 101 · sinov','year':year['id'],'department':dep['id'],'students':25,'kind':'Akademik guruh'}})
 teacher=api('/records/teachers',{'data':{'code':'UIT'+run,'name':'Namuna o‘qituvchi · sinov','department':dep['id'],'qualification':'Dotsent','language':'O‘zbek'}})
 api('/records/workloads',{'data':{'code':'UIL'+run,'name':'Adabiy til / amaliy · sinov','year':year['id'],'subject':subject['id'],'group':group['id'],'teacher':teacher['id'],'activity':'Amaliy','hours':'108','source':'UI-TEST-'+run}})
 api('/records/curricula',{'data':{'code':'UIC'+run,'name':'O‘zbek filologiyasi · sinov','year':year['id'],'department':dep['id'],'level':'Bakalavriat','mode':'Kunduzgi','source':'UI-TEST-'+run}})
 page.reload();page.locator('#app-view').wait_for(state='visible')
 nav('tasks');page.click('#create-record');page.fill('#field-code','UIV'+run);page.fill('#field-name','Kafedra o‘quv rejalarini ko‘rib chiqish');page.select_option('#field-year',year['id']);page.select_option('#field-department',dep['id']);page.fill('#field-owner','O‘quv bo‘limi · sinov');page.fill('#field-due','2026-11-15');page.select_option('#field-progress','Jarayonda');page.click('#editor-form button[type=submit]');page.locator('#editor-dialog').wait_for(state='hidden')
 nav('dashboard');page.select_option('#dashboard-year',year['id']);page.select_option('#dashboard-dept',dep['id']);assert page.locator('.stat-value').nth(2).inner_text()=='108';assert page.locator('.stat-value').nth(1).inner_text()=='1'
 with page.expect_download() as dl:page.click('#dashboard-export')
 dl.value.save_as(str(out/'dashboard.csv'));assert '108' in (out/'dashboard.csv').read_text(encoding='utf-8-sig')
 page.locator('#toast').evaluate('(e)=>e.hidden=true');page.screenshot(path=str(out/'dashboard-v2.png'),full_page=True)
 nav('calculator');page.click('#calc-form button[type=submit]');page.locator('.calc-result').wait_for(state='visible');assert '144 soat' in page.locator('#calc-output').inner_text();assert '108 soat' in page.locator('#calc-output').inner_text()
 page.keyboard.press('Control+k');page.fill('#global-search','Yuklama');page.click('[data-search-route="workloads"]');assert page.locator('#page-content h1').inner_text()=='Yuklama taqsimoti';page.fill('#record-search','UIL'+run);assert page.locator('tbody tr').count()==1;page.screenshot(path=str(out/'workloads-v2.png'),full_page=True)
 # Every sidebar destination should resolve without client exceptions.
 routes=page.locator('#navigation [data-route]').evaluate_all('(els)=>els.map(e=>e.dataset.route)')
 for route in routes:
  nav(route);assert page.locator('#page-content h1').count()==1,route
 nav('audit');page.locator('tbody tr').first.wait_for();assert page.locator('tbody tr').count()>0
 nav('dashboard');page.set_viewport_size({'width':390,'height':844});page.click('#menu-toggle');assert page.locator('#sidebar').get_attribute('class')=='sidebar open';page.locator('#navigation [data-route="tasks"]').click();page.wait_for_timeout(250);assert page.locator('#sidebar').get_attribute('class')=='sidebar';assert not page.locator('#nav-backdrop').is_visible()
 page.click('#menu-toggle');page.locator('#navigation [data-route="dashboard"]').click();page.wait_for_timeout(250);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');page.screenshot(path=str(out/'mobile-v2.png'),full_page=True)
 page.set_viewport_size({'width':1440,'height':1050});page.wait_for_timeout(100);page.evaluate('scrollTo(0,document.body.scrollHeight)');assert page.locator('#sidebar').bounding_box()['height']==1050;assert page.evaluate("getComputedStyle(document.querySelector('.sidebar')).backgroundColor")=='rgb(255, 255, 255)'
 page.click('#account-open');page.click('#logout');page.locator('#login-view').wait_for(state='visible');page.reload();page.locator('#login-view').wait_for(state='visible')
 assert not errors,errors
 assert not csp,csp
 b.close();print('PASS: login, CRUD, duplicate validation, persistence, references, tasks, real dashboard filters, CSV totals, calculator, keyboard search, all modules, audit, mobile menu, full-height white sidebar, logout; no JS/CSP errors')
