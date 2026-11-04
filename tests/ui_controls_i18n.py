"""Four-language acceptance for the new controls, including formal print views."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l);x=json.loads(Path(sys.argv[2]).read_text())
labels={'uz':('Reja versiyalarini taqqoslash','Jadval va yuklama nazorati','Ortiqcha'),'ru':('Сравнение версий учебных планов','Сверка расписания и нагрузки','Избыток'),'en':('Compare curriculum versions','Schedule and workload reconciliation','Excess'),'uz-new':('Reja versiyalarini taqqoslaş','Jadval va yuklama nazorati','Ortiqça')}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);errors=[]
 for lang,(compare,reconcile,excess) in labels.items():
  c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(cfg['APP_ORIGIN']+'/?lang='+lang);page.fill('#email',x['adminEmail']);page.fill('#password',x['password']);page.click('#login-form button[type=submit]');expect(page.locator('#app-view')).to_be_visible()
  page.locator('#navigation [data-route=compare]').click();expect(page.locator('#page-content h1')).to_have_text(compare)
  page.select_option('#compare-left',x['oldPlanId']);options=page.locator('#compare-right option').evaluate_all('(ns)=>ns.map(n=>({v:n.value,t:n.textContent}))')
  new=next(o['v'] for o in options if o['t'].startswith('UPLAN'));page.select_option('#compare-right',new);page.locator('#plan-compare-form button[type=submit]').click();expect(page.locator('[data-compare-row]').first).to_be_visible()
  page.locator('[data-compare-row]').first.click();expect(page.locator('.management-dialog tbody tr')).to_have_count(10);page.locator('.management-dialog .icon-button').click()
  with c.expect_page() as opened:page.click('#compare-pdf')
  paper=opened.value;paper.wait_for_load_state();expect(paper.locator('h1')).to_have_text(compare);paper.close()
  page.locator('#navigation [data-route=reconciliation]').click();expect(page.locator('#page-content h1')).to_have_text(reconcile);expect(page.locator('.control-stats small').filter(has_text=excess).first).to_be_visible()
  expect(page.locator('#schedule-reconcile-form button[type=submit]')).to_be_enabled()
  with c.expect_page() as opened:page.click('#schedule-reconcile-pdf')
  paper=opened.value;paper.wait_for_load_state();expect(paper.locator('h1')).to_have_text(reconcile);expect(paper.locator('thead')).to_contain_text(excess);paper.close()
  page.locator('#navigation [data-route=rules]').click();page.click('#create-record');page.check('#schedule-policy-enable');page.click('#schedule-policy-preset');assert len(page.locator('#schedule-policy-lines').input_value().splitlines())==8;page.locator('#editor-dialog [data-close=editor-dialog]').first.click()
  page.locator('#navigation [data-route=schedule]').click();page.click('#create-record');assert page.locator('#field-academicHours').get_attribute('readonly') is not None;expect(page.locator('#schedule-period')).to_be_visible();page.locator('#editor-dialog [data-close=editor-dialog]').first.click()
  c.close()
 assert not errors,errors
 b.close();print('PASS new controls: four UI languages, comparison details and PDFs, reconciliation totals and PDFs, period preset and read-only calculated hours')
