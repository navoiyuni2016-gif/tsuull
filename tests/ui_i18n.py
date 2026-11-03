"""Four-language UI acceptance checks; run only against an isolated fixture server."""
from pathlib import Path
import sys, secrets
from playwright.sync_api import sync_playwright, expect
cfg=dict(line.split('=',1) for line in Path(sys.argv[1]).read_text().splitlines() if '=' in line)
modules=['faculties','departments','years','subjects','curricula','groups','teachers','workloads','tasks','reports','rules','schedule','syllabus','practice','quality','plan_items','actuals','work_types','additional_work']
expected={'uz':('Tizimga kirish','Boshqaruv paneli','Fakultetlar','Saqlash','O‘zbekcha'), 'ru':('Войти','Панель управления','Факультеты','Сохранить','Русский'), 'en':('Sign in','Dashboard','Faculties','Save','English'), 'uz-new':('Tizimga kiriş','Boşqaruv paneli','Fakultetlar','Saqlaş','Özbekça')}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    errors=[]
    for lang,(sign_in,dashboard,faculties,save,_) in expected.items():
        context=browser.new_context(viewport={'width':1440,'height':1000})
        page=context.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(cfg['APP_ORIGIN']+'/?lang='+lang)
        expect(page.locator('#login-form button[type=submit]')).to_contain_text(sign_in)
        expect(page.locator('.login-form .language-picker select')).to_have_value(lang)
        page.fill('#email',cfg['USER_EMAIL']);page.fill('#password','wrong-password-for-fixture')
        page.click('#login-form button[type=submit]')
        expect(page.locator('#login-error')).to_have_text({'uz':'Email yoki parol noto‘g‘ri.','en':'Incorrect email or password.','ru':'Неверная почта или пароль.','uz-new':'Email yoki parol notöğri.'}[lang])
        page.fill('#password',cfg['USER_PASSWORD']);page.click('#login-form button[type=submit]')
        expect(page.locator('#app-view')).to_be_visible()
        expect(page.locator('#page-content h1')).to_have_text(dashboard)
        expect(page.locator('#navigation [data-route="faculties"]')).to_have_text(faculties)
        # All schemas render localized field labels without changing stored option values.
        for module in modules:
            page.locator('#navigation [data-route="'+module+'"]').click()
            page.click('#create-record');expect(page.locator('#editor-dialog')).to_be_visible()
            expect(page.locator('#editor-form button[type=submit]')).to_have_text(save)
            if module=='subjects':
                options=page.locator('#field-category option').evaluate_all('(nodes)=>nodes.map(n=>({value:n.value,text:n.textContent}))')
                assert [o['value'] for o in options]==['','Majburiy','Tanlov']
                if lang=='en':assert options[1]['text']=='Required'
                if lang=='ru':assert options[1]['text']=='Обязательная'
            if module=='workloads':
                assert page.locator('#field-activity option').evaluate_all('(ns)=>ns.slice(1).map(n=>n.value)')==['Ma’ruza','Amaliy','Seminar','Laboratoriya']
            page.locator('#editor-dialog [data-close="editor-dialog"]').first.click()
        # A business name equal to a UI key remains opaque; no DOM-wide replacement.
        record=page.evaluate('''async(code)=>{let me=await fetch('/api/me').then(r=>r.json());let r=await fetch('/api/records/faculties',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify({data:{code,name:'Saqlash Sh Ch O‘ G‘ <b>literal</b>'}})});return {status:r.status,data:await r.json()};}''','I18N-'+secrets.token_hex(5).upper())
        assert record['status']==201,record
        page.reload();expect(page.locator('#app-view')).to_be_visible()
        page.locator('#navigation [data-route="faculties"]').click();page.fill('#record-search',record['data']['code'])
        expect(page.locator('#records-table tbody strong')).to_have_text('Saqlash Sh Ch O‘ G‘ <b>literal</b>')
        assert page.locator('#records-table tbody strong b').count()==0
        page.locator('[data-detail="'+record['data']['id']+'"]').click();page.click('#edit-record')
        expect(page.locator('#field-name')).to_have_value('Saqlash Sh Ch O‘ G‘ <b>literal</b>')
        page.locator('#editor-dialog [data-close="editor-dialog"]').first.click()
        # Submit the actual subject editor: labels may change, payload enums must not.
        page.locator('#navigation [data-route="subjects"]').click();page.click('#create-record')
        for field,value in {'code':'IS-'+secrets.token_hex(5).upper(),'name':'Saqlash Sh Ch O‘ G‘','credits':'1.25','language':'O‘zbek'}.items():page.fill('#field-'+field,value)
        dep=page.locator('#field-department option').nth(1).get_attribute('value')
        page.select_option('#field-department',dep);page.select_option('#field-category','Majburiy')
        with page.expect_response(lambda r:r.url.endswith('/api/records/subjects') and r.request.method=='POST') as saved:
            page.click('#editor-form button[type=submit]')
        assert saved.value.status==201
        payload=saved.value.json()['data'];assert payload['category']=='Majburiy' and payload['name']=='Saqlash Sh Ch O‘ G‘' and payload['credits']=='1.25'
        expect(page.locator('#editor-dialog')).not_to_be_visible()
        for route in ['studio','official','calculator','settings','profile','import','forecast','system','users','audit','notifications','modules']:
            if route in ['calculator','modules']:
                page.evaluate('(id)=>{location.hash=id}',route)
            else:page.locator('#navigation [data-route="'+route+'"]').click()
            page.wait_for_timeout(80)
            assert page.locator('#page-content h1').count()==1,route
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_timeout(400)  # Let the existing sidebar media-query transition finish.
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),lang
        expect(page.locator('.header-right .language-picker select')).to_be_visible()
        page.screenshot(path='/workspace/artifacts/i18n-'+lang+'-mobile.png',full_page=True)
        context.close()
    # Switch and persist locale through the real control, guarding unsaved input.
    context=browser.new_context();page=context.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
    page.goto(cfg['APP_ORIGIN']);expect(page.locator('html')).to_have_attribute('lang','uz')
    page.fill('#email','unsaved@test.invalid')
    page.once('dialog',lambda dialog:dialog.dismiss())
    page.select_option('.login-form .language-picker select','ru')
    expect(page.locator('.login-form .language-picker select')).to_have_value('uz')
    expect(page.locator('#email')).to_have_value('unsaved@test.invalid')
    page.once('dialog',lambda dialog:dialog.accept())
    page.select_option('.login-form .language-picker select','en')
    expect(page.locator('html')).to_have_attribute('lang','en')
    page.goto(cfg['APP_ORIGIN']);expect(page.locator('html')).to_have_attribute('lang','en')
    page.goto(cfg['APP_ORIGIN']+'/?lang=invalid');expect(page.locator('html')).to_have_attribute('lang','en')
    # Native validity text uses the selected UI language.
    page.click('#login-form button[type=submit]')
    assert page.locator('#email').evaluate('(n)=>n.validationMessage')=='Please complete this field.'
    page.route('**/api/login',lambda route:route.fulfill(status=429,content_type='text/plain',body='Too many requests'))
    page.fill('#email','limit@test.invalid');page.fill('#password','synthetic-password')
    page.click('#login-form button[type=submit]')
    expect(page.locator('#login-error')).to_have_text('Request limit reached. Please wait.')
    context.close();browser.close()
    assert not errors,errors
    print('PASS: 4 languages; 76 module editors; routes, mobile, canonical options, opaque record names, errors, persistence and unsaved-form guard')
