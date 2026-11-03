"""Personal appearance E2E, using an isolated ERP test server and synthetic account."""
from pathlib import Path
import secrets,sys
from playwright.sync_api import sync_playwright,expect
cfg=dict(l.split('=',1) for l in Path(sys.argv[1]).read_text().splitlines() if '=' in l)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    def open_settings(pg):pg.locator('.appearance-open:visible').first.click();expect(pg.locator('#appearance-dialog')).to_be_visible()
    def login(pg,email,password):
        pg.fill('#email',email);pg.fill('#password',password);pg.click('#login-form button[type=submit]');expect(pg.locator('#app-view')).to_be_visible()
    def accent(pg):return pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    page.goto(cfg['APP_ORIGIN']+'/?lang=en');expect(page.locator('#login-view')).to_be_visible()
    page.evaluate("window.csp=[];document.addEventListener('securitypolicyviolation',e=>window.csp.push(e.violatedDirective))")
    open_settings(page);page.fill('#appearance-hex','#7c3aed');page.click('#appearance-form button[type=submit]')
    assert accent(page)=='#7c3aed'
    login(page,cfg['USER_EMAIL'],cfg['USER_PASSWORD']);assert accent(page)=='#2859dc','Login preferences must not leak into an account'
    open_settings(page);page.select_option('#appearance-mode','night');page.fill('#appearance-hex','#ffff00')
    expect(page.locator('html')).to_have_attribute('data-theme','night')
    assert page.locator('#appearance-form button[type=submit]').evaluate('(n)=>getComputedStyle(n).color')=='rgb(0, 0, 0)'
    page.click('#appearance-cancel');assert accent(page)=='#2859dc';expect(page.locator('html')).to_have_attribute('data-theme','day')
    open_settings(page);page.select_option('#appearance-mode','night');page.fill('#appearance-hex','#db2777');page.click('#appearance-form button[type=submit]')
    page.reload();expect(page.locator('#app-view')).to_be_visible();assert accent(page)=='#db2777';expect(page.locator('html')).to_have_attribute('data-theme','night')
    page.screenshot(path='/workspace/artifacts/appearance-dark-desktop.png',full_page=True)
    page.emulate_media(media='print')
    assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(255, 255, 255)'
    expect(page.locator('.header-right .appearance-open')).not_to_be_visible()
    page.emulate_media(media='screen');expect(page.locator('html')).to_have_attribute('data-theme','night');assert accent(page)=='#db2777'
    open_settings(page);page.select_option('#appearance-mode','auto');page.click('#appearance-form button[type=submit]')
    page.emulate_media(color_scheme='dark');expect(page.locator('html')).to_have_attribute('data-theme','night')
    page.emulate_media(color_scheme='light');expect(page.locator('html')).to_have_attribute('data-theme','day')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400)
    expect(page.locator('.header-right .appearance-open')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    open_settings(page);page.fill('#appearance-hex','#12');page.click('#appearance-form button[type=submit]');expect(page.locator('#appearance-dialog')).to_be_visible()
    page.fill('#appearance-hex','#00ff00');page.click('#appearance-reset');assert accent(page)=='#2859dc'
    page.keyboard.press('Escape');assert accent(page)=='#db2777','Escape restores saved choice'
    open_settings(page);page.screenshot(path='/workspace/artifacts/appearance-mobile.png',full_page=True);page.click('#appearance-close')
    assert not page.evaluate('window.csp'),page.evaluate('window.csp')
    # New account on the same browser gets its own default settings.
    password=secrets.token_hex(18);email='appearance-'+secrets.token_hex(5)+'@test.invalid'
    result=page.evaluate('''async ([email,password])=>{const me=await fetch('/api/me').then(r=>r.json());const r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrf},body:JSON.stringify({email,password,name:'Synthetic appearance user',role:'AUDITOR'})});return r.status}''',[email,password]);assert result==201,result
    page.click('#account-open');page.click('#logout');expect(page.locator('#login-view')).to_be_visible();assert accent(page)=='#7c3aed'
    login(page,email,password);assert accent(page)=='#2859dc'
    context.close()
    # Settings are available and translated on login in every supported language.
    for lang,title,night in [('uz','Interfeys sozlamalari','Tungi'),('ru','Настройки оформления','Тёмный'),('en','Appearance settings','Dark'),('uz-new','Interfeys sozlamalari','Tungi')]:
        ctx=browser.new_context(viewport={'width':390,'height':844},color_scheme='light');pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.goto(cfg['APP_ORIGIN']+'/?lang='+lang);expect(pg.locator('#login-view')).to_be_visible();open_settings(pg)
        expect(pg.locator('#appearance-dialog h2')).to_have_text(title);expect(pg.locator('#appearance-mode option[value=night]')).to_have_text(night)
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if lang=='en':
            pg.evaluate("()=>{Storage.prototype.setItem=function(){throw new Error('Synthetic blocked storage')}}")
            pg.fill('#appearance-hex','#123456');pg.click('#appearance-form button[type=submit]')
            expect(pg.locator('#appearance-message')).to_contain_text('Browser storage is unavailable')
            assert accent(pg)=='#123456'
        ctx.close()
    assert not errors,errors
    browser.close();print('PASS appearance: live preview, save/reload, cancel/Escape/reset, per-account isolation, automatic mode, contrast, mobile, 4 languages, print and blocked storage')
