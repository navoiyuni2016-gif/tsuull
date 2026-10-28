from playwright.sync_api import sync_playwright
from pathlib import Path
artifacts=Path('/tmp/oquv-erp-test-artifacts');artifacts.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3000');page.screenshot(path=str(artifacts/'desktop.png'),full_page=True)
 assert page.locator('#dashboard-stats').inner_text().find('10')>=0
 page.select_option('#dash-faculty',label='O‘zbek filologiyasi');assert page.locator('#dashboard-stats .stat').first.inner_text().find('2')>=0
 page.select_option('#dash-year',label='2025/2026');assert 'ma’lumot yo‘q' in page.locator('#load-chart').inner_text()
 page.select_option('#dash-year',label='2026/2027')
 with page.expect_download() as d: page.click('#dashboard-export')
 assert d.value.suggested_filename.endswith('.csv')
 page.click('[data-page="curriculum"]');assert page.locator('#result-teacher').inner_text()=='144 soat'
 page.fill('#credits','0');page.click('#calculate');assert page.locator('#calc-error').inner_text()
 page.click('[data-page="structure"]');page.fill('#faculty-code','TEST');page.fill('#faculty-name','Test fakulteti');page.click('#add-faculty');assert 'Test fakulteti' in page.locator('#structure-table').inner_text()
 page.reload();page.click('[data-page="structure"]');assert 'Test fakulteti' in page.locator('#structure-table').inner_text()
 page.fill('#faculty-code','TEST');page.fill('#faculty-name','Takror');page.click('#add-faculty');assert 'mavjud' in page.locator('#faculty-error').inner_text()
 page.click('#search-open');page.fill('#module-search','Import');page.click('#search-results button');assert page.locator('#page-import').is_visible()
 page.click('[data-page="modules"]');assert page.locator('.module-list article').count()==14
 page.click('[data-page="tasks"]');page.fill('#task-title','Sinov topshirig‘i');page.fill('#task-owner','Demo mas’ul');page.fill('#task-date','2026-11-01');page.click('#add-task');assert 'Sinov topshirig‘i' in page.locator('#task-list').inner_text()
 page.locator('#task-list select').select_option('IN_PROGRESS');assert page.locator('#task-open').inner_text()=='1'
 page.set_viewport_size({'width':390,'height':844});page.click('#menu-toggle');page.click('[data-page="dashboard"]');page.wait_for_timeout(350);assert 'open' not in page.locator('#sidebar').get_attribute('class');page.screenshot(path=str(artifacts/'mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 assert not errors,errors
 page.evaluate('localStorage.clear()');page.reload();b.close()
 print('PASS: dashboard filters, CSV export, calculator, validation, persistence, duplicate rejection, module search, 14 module cards, tasks, mobile layout; no JS errors')
