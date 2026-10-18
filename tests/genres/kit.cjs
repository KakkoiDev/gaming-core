// The game kit's shared blocks, checked once on a genre that starts on its title screen with a first action to play:
// GameSettings (language to Japanese and back, saved), ControlsRemap (listen, change, swap, fixed rows, reset),
// PauseMenu on blur, prompts by device, TouchControls. play(h, id) expects the title screen on entry.
exports.play=async function(h,id){
 const {assert}=h;
 const gameId=await h.eval(()=>GAME_ID);
 assert.equal(gameId,id,'<game-id> is the folder name');
 if(!(await h.visible('#title'))){await h.eval(()=>typeof toTitle==='function'&&toTitle());await h.waitVisible('#title');}

 // GameSettings: Language switches every visible text at once and is saved under <game-id>.settings
 await h.click('#title-settings');await h.waitVisible('#settings');
 await h.click('#tab-lang');await h.click('[data-setting="lang"]');
 await h.until(()=>document.documentElement.lang==='ja');
 assert.equal(await h.text('#settings-title'),'設定');
 assert.equal(await h.eval(id=>JSON.parse(localStorage.getItem(id+'.settings')).lang,gameId),'ja');
 await h.tap('Escape');await h.until(()=>document.getElementById('settings').hidden);
 assert.equal(await h.text('#title .game-hint [data-t="game.confirm"]'),'決定');
 await h.click('#title-settings');await h.waitVisible('#settings');await h.click('#tab-lang');await h.click('[data-setting="lang"]');
 await h.until(()=>document.documentElement.lang==='en');
 // the music row changes with arrow keys
 await h.click('#tab-audio');await h.page.focus('[data-setting="music"]');
 const music=await h.eval(()=>settings.music);await h.tap('ArrowLeft');
 assert.ok(await h.eval(m=>settings.music<m,music),'← lowers the music');
 await h.tap('Escape');await h.until(()=>document.getElementById('settings').hidden);

 // ControlsRemap from the Settings' Controls tab: the first rebindable action listens for the next key
 await h.click('#title-settings');await h.waitVisible('#settings');await h.click('#tab-controls');await h.waitVisible('#controls');
 const rows=await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action));
 assert.deepEqual(rows.slice(-2),['pause','back'],'fixed rows last');
 assert.equal(await h.eval(()=>document.querySelector('#controls [data-action="pause"]').getAttribute('aria-disabled')),'true');
 const action=rows.find(r=>r!=='move'&&r!=='pause'&&r!=='back');
 await h.click(`#controls [data-action="${action}"]`);
 await h.until(a=>document.querySelector(`#controls [data-action="${a}"]`).textContent.includes(t('controls.press_new')),action);
 await h.tap('KeyK');
 await h.until(a=>gcInput.bindings.actions[a][0]==='key:KeyK',action);
 assert.ok((await h.eval(id=>JSON.parse(localStorage.getItem(id+'.input')).actions,gameId))[action].includes('key:KeyK'),'saved under <game-id>.input in gaming-core\'s format');
 assert.ok(await h.visible(`#controls [data-action="${action}"] .game-key`));
 // a key a fixed action holds is refused
 await h.click(`#controls [data-action="${action}"]`);await h.tap('KeyP');
 await h.until(()=>document.getElementById('controls-live').textContent.includes(t('action.pause')));
 await h.tap('Escape');await h.until(a=>!document.querySelector(`#controls [data-action="${a}"]`).textContent.includes(t('controls.press_new')),action);
 // the gamepad tab shows positions
 await h.pad('connect');await h.click('#controls [data-device-tab="gamepad"]');
 await h.until(()=>document.querySelector('#controls .game-padpos[data-pos]'));
 await h.click('#controls [data-device-tab="keyboard"]');
 // Reset All asks first, then the defaults come back
 await h.tap('KeyR');await h.waitVisible('#confirm');await h.click('#confirm-ok');
 await h.until(a=>!gcInput.bindings.actions[a].includes('key:KeyK'),action);
 await h.tap('Escape');await h.until(()=>document.getElementById('controls').hidden);
 await h.tap('Escape');await h.until(()=>document.getElementById('settings').hidden);
 // the gamepad's east button is back and start opens nothing on the title
 await h.padTap(1);await h.pad('disconnect');

 // pause on blur during play
 await h.click('#title .game-menu li:first-child .game-btn');await h.until(()=>state!=='title');
 if(await h.eval(()=>kitPlaying)){
  await h.eval(()=>dispatchEvent(new Event('blur')));
  await h.waitVisible('#pause');assert.ok(await h.visible('#pause-blur'),'paused while away line');
  await h.click('#pause-resume');await h.until(()=>!paused);
 }

 // touch: a touch pointer shows the on-screen controls (where the genre has them) and Tap prompts
 await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
 await h.until(()=>document.getElementById('game').dataset.device==='touch');
 if(await h.eval(()=>!!document.getElementById('touch')))assert.ok(await h.visible('#touch'),'touch controls shown on touch');
 await h.page.mouse.move(10,10);await h.page.mouse.move(20,20);
};
