"""Real saved-calculation print flow and rendered paper pagination."""
from pathlib import Path
import re,subprocess,sys
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l)
out=Path('/workspace/artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 errors=[]
 for lang in ['uz','ru','en','uz-new']:
  context=browser.new_context(viewport={'width':1280,'height':1000});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(cfg['APP_ORIGIN']+'/?lang='+lang);page.fill('#email',cfg['USER_EMAIL']);page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]');expect(page.locator('#app-view')).to_be_visible()
  page.locator('#navigation [data-route=calculator]').click();page.locator('#calc-form button[type=submit]').click();page.locator('[data-open-calculation]').click();expect(page.locator('.management-dialog')).to_be_visible()
  with context.expect_page() as opened:page.locator('.management-dialog [data-command=print]').click()
  paper=opened.value;paper.on('pageerror',lambda e:errors.append(str(e)));paper.wait_for_load_state('networkidle')
  expect(paper.locator('.paper')).to_be_visible();assert paper.locator('details').count()==0
  expect(paper.locator('.parameter-table')).to_contain_text('40');expect(paper.locator('.result-table')).to_contain_text('180');expect(paper.locator('.result-table')).to_contain_text('144')
  assert '4000' not in paper.locator('.parameter-table').inner_text()
  paper.emulate_media(media='print');expect(paper.locator('.print-actions')).not_to_be_visible()
  filename=out/('pdf-calculation-'+lang+'.pdf');paper.pdf(path=str(filename),prefer_css_page_size=True,print_background=True,display_header_footer=False)
  info=subprocess.check_output(['pdfinfo',str(filename)],text=True);assert re.search(r'Pages:\s+1\b',info),info
  text=subprocess.check_output(['pdftotext','-layout',str(filename),'-'],text=True);assert '180' in text and '144' in text and re.search(r'1\s*/\s*1',text),text
  assert '4000' not in text and cfg['APP_ORIGIN'] not in text
  if lang=='uz':paper.screenshot(path=str(out/'pdf-calculation-preview.png'),full_page=True)
  paper.set_viewport_size({'width':390,'height':844});paper.emulate_media(media='screen')
  assert paper.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Mobile paper overflow'
  context.close()
 # Long real registry export: source-owned names stay verbatim and headers repeat.
 context=browser.new_context();page=context.new_page();page.goto(cfg['APP_ORIGIN']+'/?lang=en')
 page.fill('#email',cfg['USER_EMAIL']);page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]');expect(page.locator('#app-view')).to_be_visible()
 page.goto(cfg['APP_ORIGIN']+'/api/management/export/faculties?format=html&lang=en&columns=code,name&orientation=landscape')
 page.wait_for_load_state('networkidle');expect(page.locator('.registry-table')).to_be_visible()
 filename=out/'pdf-register-landscape.pdf';page.pdf(path=str(filename),prefer_css_page_size=True,print_background=True,display_header_footer=False)
 info=subprocess.check_output(['pdfinfo',str(filename)],text=True);size=re.search(r'Page size:\s+([\d.]+) x ([\d.]+)',info);assert size and abs(float(size[1])-841.89)<1 and abs(float(size[2])-595.28)<1,info
 # Add many synthetic rows only to the DOM to exercise layout, without DB writes.
 page.locator('.registry-table tbody').evaluate('''n=>{n.innerHTML=Array.from({length:160},(_,i)=>'<tr><td>'+(i+1)+'</td><td>PDF-'+(i+1)+'</td><td>Saqlash Sh Ch O‘ G‘ — synthetic pagination record '+(i+1)+'</td></tr>').join('')}''')
 page.pdf(path=str(out/'pdf-register-multipage.pdf'),prefer_css_page_size=True,print_background=True,display_header_footer=False)
 text=subprocess.check_output(['pdftotext','-layout',str(out/'pdf-register-multipage.pdf'),'-'],text=True)
 pages=[s for s in text.split('\f') if s.strip()];assert len(pages)>1
 for i,text in enumerate(pages):
  assert re.search(str(i+1)+r'\s*/\s*'+str(len(pages)),text)
  if 'PDF-' in text:assert 'Faculty code' in text and 'Faculty name' in text
 assert 'Saqlash Sh Ch' in pages[0]
 assert not errors,errors
 browser.close()
 print('PASS PDF: actual UI print flow in four languages; one-page A4 calculation; saved values, percentages, page numbering, portrait/landscape, repeated long-table headers and mobile layout')
