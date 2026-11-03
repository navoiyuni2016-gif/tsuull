import assert from 'node:assert/strict';
import {normalizePreferences,resolveMode,palette,contrastRatio,storageKey} from '../public/appearance.mjs';
assert.deepEqual(normalizePreferences({mode:'night',accent:'#FF8800'}),{mode:'night',accent:'#ff8800'});
assert.deepEqual(normalizePreferences({mode:'invented',accent:'url(evil)'}),{mode:'auto',accent:'#2859dc'});
assert.equal(resolveMode('auto',true),'night');assert.equal(resolveMode('auto',false),'day');assert.equal(resolveMode('day',true),'day');
for(const mode of ['day','night'])for(const accent of ['#ffffff','#000000','#ffff00','#00ff00','#ff0000','#2859dc','#ff88cc']){
 const p=palette(accent,mode);
 assert.equal(p['--accent'],accent);
 assert.ok(contrastRatio(p['--accent'],p['--accent-on'])>=4.5,accent+' button text');
 assert.ok(contrastRatio(p['--accent-hover'],p['--accent-hover-on'])>=4.5,accent+' hover text');
 assert.ok(contrastRatio(p['--accent-ink'],p['--surface'])>=4.5,accent+' link text');
 assert.ok(contrastRatio(p['--accent-ink'],p['--accent-soft'])>=4.5,accent+' selected menu text');
 assert.ok(contrastRatio(p['--text'],p['--surface'])>=7,mode+' body text');
}
assert.notEqual(storageKey('USER-A'),storageKey('USER-B'));assert.notEqual(storageKey(null),storageKey('USER-A'));
console.log('Appearance: modes, arbitrary colors, contrast, invalid input and account isolation passed');
