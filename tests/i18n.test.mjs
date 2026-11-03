import assert from 'node:assert/strict';
import {createTranslator, localizeMarkup, modernLatin, languages} from '../public/i18n.mjs';
const en=createTranslator('en'),ru=createTranslator('ru'),modern=createTranslator('uz-new');
assert.equal(en('Saqlash'),'Save');
assert.equal(ru('Saqlash'),'Сохранить');
assert.equal(createTranslator('unknown')('Saqlash'),'Saqlash');
assert.equal(modernLatin('Sh Ch O‘ G‘ sh ch oʻ gʼ SH CH'), 'Ş Ç Ö Ğ ş ç ö ğ Ş Ç');
assert.equal(modern('O‘quv bo‘limi'),'Öquv bölimi');
assert.equal(modern('Shaxsiy fan nomi 123'),'Shaxsiy fan nomi 123');
assert.equal(en('Barchasi {0}',['Saqlash']),'All Saqlash');
const html='<label for="name">Nomi</label><input name="name" value="Saqlash" placeholder="Tanlang…"><p>Saqlash</p>';
assert.equal(localizeMarkup(html,en),'<label for="name">Name</label><input name="name" value="Saqlash" placeholder="Select…"><p>Save</p>');
assert.equal(languages.length,4);
console.log('i18n: translations, approved alphabet, opaque values and locale fallback passed');

// Dictionary placeholders cannot drop a source value or create a new binding.
const {messages}=await import('../public/i18n-messages.mjs');
for(const [source,translations] of Object.entries(messages)){
  for(const [lang,value] of Object.entries(translations)){
    assert.ok(value.trim(),source+': '+lang);
    const tokens=s=>[...new Set(s.match(/\{\d+\}/g)||[])].sort();
    assert.deepEqual(tokens(value),tokens(source),source+': '+lang+' placeholders');
    assert.ok(!/[<>\uE000\uE001]/.test(value),source+': catalog is text, never markup');
  }
}
for(const lang of ['en','ru','uz-new']){
  const translate=createTranslator(lang),name='Saqlash Sh Ch O‘ G‘ <img src=x>';
  assert.ok(translate('“{0}” yozuvini {1}ni tasdiqlaysizmi?',[name,'ACTION']).includes(name));
  const html='<a href="/Saqlash" data-name="Saqlash" title="Yopish">Saqlash</a>';
  const result=localizeMarkup(html,translate);
  assert.ok(result.includes('href="/Saqlash" data-name="Saqlash"'));
}
// Language initialization is independent of the server session and uses a whitelist.
globalThis.location={href:'https://test.invalid/?lang=en'};
const english=await import('../public/i18n.mjs?test=en');
assert.equal(english.translateError('Fan nomi kerak.'),'Subject name is required.');
assert.equal(english.translateError('3-semestr kredit limiti oshgan.'),'Credit limit exceeded for semester 3.');
assert.equal(english.translateError('Kod takrorlangan: USER-CODE'),'Duplicate code: USER-CODE');
assert.equal(english.translateError('Kredit: qiymat noto‘g‘ri.'),'Credits: invalid value.');
assert.equal(english.ui`<p>Saqlash</p><p>${'Saqlash Sh Ch O‘ G‘'}</p>`,'<p>Save</p><p>Saqlash Sh Ch O‘ G‘</p>');
assert.equal(english.ui`<p>${'\uE0001\uE001'}</p><p>${'DATA'}</p>`,'<p>\uE0001\uE001</p><p>DATA</p>');
assert.equal(english.ui`<label aria-label="${'Saqlash'} semestri">Semestr</label>`,'<label aria-label="Semester for Saqlash">Semester</label>');
console.log('i18n: '+Object.keys(messages).length+' messages; parameter integrity, field errors, HTML attributes and opaque template interpolation passed');
const {modules}=await import('../public/modules.mjs');
const {academicFields}=await import('../public/parameters.mjs');
const key=s=>s.trim().replace(/\s+/g,' ').replace(/[‘’ʻʼ]/g,"'");
for(const spec of Object.values(modules)){
  for(const label of [spec.title,spec.singular,spec.group,spec.description,...spec.fields.map(f=>f.label),...spec.fields.filter(f=>f.type==='select').flatMap(f=>f.options)]){
    assert.ok(messages[key(label)]?.en&&messages[key(label)]?.ru,'Schema UI translation missing: '+label);
  }
}
for(const field of academicFields)assert.ok(messages[key(field.label)]?.en&&messages[key(field.label)]?.ru,'Rule parameter label: '+field.label);
console.log('i18n: all 19 schemas and academic parameter labels covered in Russian and English');
