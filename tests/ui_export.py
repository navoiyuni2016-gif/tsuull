"""Preview and real CSV download, through the actual UI in all four languages."""
from pathlib import Path
import csv,io,secrets,sys
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l)
prefix='EX'+secrets.token_hex(4).upper();names=['Saqlash Sh Ch O‘ G‘ <b>literal</b>; "quoted", '+str(i) for i in range(7)]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);errors=[]
 for index,lang in enumerate(['uz','ru','en','uz-new']):
  c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(cfg['APP_ORIGIN']+'/?lang='+lang);page.fill('#email',cfg['USER_EMAIL']);page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]');expect(page.locator('#app-view')).to_be_visible()
  if index==0:
   result=page.evaluate('''async([prefix,names])=>{const me=await fetch('/api/me').then(r=>r.json());for(const [i,name]of names.entries()){const r=await fetch('/api/records/faculties',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify({data:{code:prefix+i,name}})});if(r.status!==201)return r.status;}return 201;}''',[prefix,names]);assert result==201,result
   page.reload();expect(page.locator('#app-view')).to_be_visible()
  page.locator('#navigation [data-route=faculties]').click();page.fill('#record-search',prefix);page.click('#records-export')
  d=page.locator('.export-dialog');expect(d).to_be_visible();expect(d.locator('.export-preview')).to_have_attribute('aria-busy','false')
  expect(d.locator('[data-csv-settings]')).to_be_visible();expect(d.locator('[data-page-settings]')).not_to_be_visible()
  expect(d.locator('tbody tr')).to_have_count(5);assert '7' in d.locator('[data-export-count]').inner_text();assert d.locator('td b').count()==0
  expect(d.locator('tbody')).to_contain_text('Saqlash Sh Ch O‘ G‘ <b>literal</b>')
  d.locator('[name=format]').select_option('html');expect(d.locator('[data-page-settings]')).to_be_visible();expect(d.locator('[data-csv-settings]')).not_to_be_visible()
  d.locator('[name=format]').select_option('xlsx');expect(d.locator('[data-page-settings]')).to_be_visible()
  d.locator('[name=format]').select_option('csv')
  other='en' if lang!='en' else 'ru'
  with page.expect_response(lambda r:'format=preview' in r.url and 'lang='+other in r.url):d.locator('[name=lang]').select_option(other)
  expect(d.locator('.export-preview')).to_have_attribute('aria-busy','false')
  expect(d.locator('th').first).to_have_text('Faculty code' if other=='en' else 'Код факультета')
  with page.expect_response(lambda r:'format=preview' in r.url and 'lang='+lang in r.url):d.locator('[name=lang]').select_option(lang)
  expect(d.locator('.export-preview')).to_have_attribute('aria-busy','false')
  delimiter=[';',',','\t',';'][index];d.locator('[name=delimiter]').select_option(delimiter)
  if index==0:page.screenshot(path='/workspace/artifacts/csv-export-desktop.png',full_page=True)
  with page.expect_download() as got:d.locator('[data-export-submit]').click()
  download=got.value;assert download.suggested_filename.endswith('.csv')
  if lang=='ru':assert download.suggested_filename.startswith('Факультеты')
  data=Path(download.path()).read_bytes();assert data.startswith(b'\xef\xbb\xbf');assert data.endswith(b'\r\n')
  text=data.decode('utf-8-sig');assert text.startswith('sep='+delimiter+'\r\n')
  rows=list(csv.reader(io.StringIO(text.split('\r\n',1)[1]),delimiter=delimiter));assert len(rows)==8
  assert {r[1] for r in rows[1:]}==set(names)
  page.set_viewport_size({'width':320,'height':800});page.click('#records-export');expect(page.locator('.export-preview')).to_have_attribute('aria-busy','false')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Mobile export overflow'
  page.locator('[data-dialog-close]').click()
  if lang=='en':
   page.set_viewport_size({'width':390,'height':844});page.locator('.header-right .theme-toggle').click();page.click('#records-export')
   expect(page.locator('.export-preview')).to_have_attribute('aria-busy','false')
   page.screenshot(path='/workspace/artifacts/csv-export-mobile-dark.png',full_page=True)
  c.close()
 assert not errors,errors
 b.close();print('PASS export UI: 4 languages, 5-row preview/7-row download, unchanged raw names, localized filename, format-specific controls, every separator, 320px layout and dark mode')
