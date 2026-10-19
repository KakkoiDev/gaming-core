// The game kit's scenarios (starters/kit/SCENARIOS.md), one test each, named after the scenario; tests/e2e.cjs adds
// them to every genre and starts each on a fresh title screen. Controls by role and name (English).
// Given = arrange, When = act, Then = assert.
module.exports=function(test){

 async function openSettings(h){
  const {page}=h;
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await h.waitVisible('#settings');
 }
 const saved=(h,key)=>h.eval(([id,key])=>JSON.parse(localStorage.getItem(id+'.settings'))[key],[h.id,key]);
 async function openControls(h){
  const {page}=h;
  await openSettings(h);
  await page.getByRole('tab',{name:'Controls'}).click();
  await h.waitVisible('#controls');
  await page.getByRole('listbox',{name:'Controls'}).waitFor();
 }
 const rows=(h)=>h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action));
 const firstRebindable=async(h)=>(await rows(h)).find(r=>r!=='move'&&r!=='pause'&&r!=='back');
 async function bindToK(h,action){
  await h.page.locator(`#controls [data-action="${action}"]`).click();
  await h.until(a=>document.querySelector(`#controls [data-action="${a}"]`).textContent.includes(t('controls.press_new')),action);
  await h.tap('KeyK');
  await h.until(a=>gcInput.bindings.actions[a][0]==='key:KeyK',action);
 }

 test('Language switches every visible text at once and is saved',async(h)=>{
  const {page,assert}=h;
  // Given the title screen in English
  assert.equal(await h.eval(()=>GAME_ID),h.id,'<game-id> is the folder name');
  await h.waitVisible('#title');
  assert.equal(await h.eval(()=>document.documentElement.lang),'en');
  // When I open Settings, choose the Language tab and press the Language row
  await openSettings(h);
  await page.getByRole('tab',{name:'Language'}).click();
  await page.getByRole('button',{name:'Language'}).click();
  // Then the page and the Settings title are in Japanese
  await h.until(()=>document.documentElement.lang==='ja');
  assert.equal(await h.text('#settings-title'),'設定');
  // And the language is saved under <game-id>.settings
  assert.equal(await saved(h,'lang'),'ja');
  // And the title's Confirm hint reads 決定 after I close Settings
  await h.tap('Escape');await h.waitHidden('#settings');
  assert.equal(await h.text('#title .game-hint [data-t="game.confirm"]'),'決定');
  // And pressing the Language row again brings English back
  await page.locator('#title-settings').click();await h.waitVisible('#settings');
  await page.locator('#tab-lang').click();await page.locator('[data-setting="lang"]').click();
  await h.until(()=>document.documentElement.lang==='en');
  assert.equal(await saved(h,'lang'),'en');
 });

 test('Audio settings change with the arrow keys and clicks',async(h)=>{
  const {page,assert}=h;
  // Given the Audio tab of Settings is open
  await openSettings(h);
  await page.getByRole('tab',{name:'Audio'}).click();
  const music=await h.eval(()=>settings.music);
  // When I press ← on the Music row, click the right half of the Sound Effects row and click Mute When in Background
  await page.getByRole('slider',{name:'Music'}).focus();
  await h.tap('ArrowLeft');
  const sfx=page.getByRole('slider',{name:'Sound Effects'});
  const box=await sfx.boundingBox();
  await sfx.click({position:{x:box.width-8,y:box.height/2}});
  await page.getByRole('switch',{name:'Mute When in Background'}).click();
  // Then Music is lower, Sound Effects stays at its loudest
  await h.until(m=>settings.music<m,music);
  assert.equal(await h.eval(()=>settings.sfx),1);
  // And Mute When in Background is on and saved
  await h.until(()=>settings.muteBackground===true);
  assert.equal(await saved(h,'muteBackground'),true);
  assert.equal(await page.getByRole('switch',{name:'Mute When in Background'}).getAttribute('aria-checked'),'true');
 });

 test('Display settings change and are saved',async(h)=>{
  const {page,assert}=h;
  // Given the Display tab of Settings is open
  await openSettings(h);
  await page.getByRole('tab',{name:'Display'}).click();
  await h.waitVisible('#panel-display');
  // When I press Reduce Motion and Text Size
  const reduce=await h.eval(()=>settings.reduceMotion);
  await page.getByRole('switch',{name:'Reduce Motion'}).click();
  await page.getByRole('button',{name:'Text Size'}).click();
  // Then Reduce Motion is on, the text is large, and both are saved
  await h.until(r=>settings.reduceMotion===!r,reduce);
  await h.until(()=>document.documentElement.dataset.textSize==='large');
  assert.equal(await saved(h,'reduceMotion'),!reduce);
  assert.equal(await saved(h,'textSize'),'large');
  // And Full Screen can be switched on
  await page.getByRole('switch',{name:'Full Screen'}).click();
  await h.until(()=>settings.fullscreen===true);
 });

 test('A rebindable action takes the next key and is saved',async(h)=>{
  const {assert}=h;
  // Given the Controls screen opened from the Settings' Controls tab
  await openControls(h);
  // When I choose the first rebindable action and press K
  const action=await firstRebindable(h);
  await bindToK(h,action);
  // Then that action's keyboard input is K
  assert.ok(await h.visible(`#controls [data-action="${action}"] .game-key`));
  // And it is saved under <game-id>.input in gaming-core's format
  assert.ok((await h.eval(id=>JSON.parse(localStorage.getItem(id+'.input')).actions,h.id))[action].includes('key:KeyK'));
  // And the fixed rows Pause and Back come last and cannot be chosen
  assert.deepEqual((await rows(h)).slice(-2),['pause','back'],'fixed rows last');
  assert.equal(await h.eval(()=>document.querySelector('#controls [data-action="pause"]').getAttribute('aria-disabled')),'true');
  assert.equal(await h.eval(()=>document.querySelector('#controls [data-action="back"]').getAttribute('aria-disabled')),'true');
 });

 test('A key that a fixed action holds is refused',async(h)=>{
  const {page}=h;
  // Given the Controls screen is listening for a new key
  await openControls(h);
  const action=await firstRebindable(h);
  await page.locator(`#controls [data-action="${action}"]`).click();
  await h.until(a=>document.querySelector(`#controls [data-action="${a}"]`).textContent.includes(t('controls.press_new')),action);
  // When I press P, which Pause holds
  await h.tap('KeyP');
  // Then the screen says Pause holds it
  await h.until(()=>document.getElementById('controls-live').textContent.includes(t('action.pause')));
  // And Esc stops listening
  await h.tap('Escape');
  await h.until(a=>!document.querySelector(`#controls [data-action="${a}"]`).textContent.includes(t('controls.press_new')),action);
 });

 test('The gamepad tab shows button positions',async(h)=>{
  const {page,assert}=h;
  // Given a gamepad is connected and the Controls screen is open
  await h.pad('connect');
  await openControls(h);
  // When I choose the Gamepad tab
  await page.getByRole('tab',{name:'Gamepad'}).click();
  // Then the inputs are shown by position, never by letter
  await h.until(()=>document.querySelector('#controls .game-padpos[data-pos]'));
  assert.equal(await h.eval(()=>[...document.querySelectorAll('#controls .game-list .game-padpos')].some(e=>/^[ABXY]$/.test(e.textContent.trim()))),false);
  // And the Keyboard tab brings the keys back
  await page.getByRole('tab',{name:'Keyboard'}).click();
  await h.until(()=>document.querySelector('#controls .game-list .game-key'));
  // (the gamepad's east button is back: it closes Controls, then Settings)
  await h.padTap(1);await h.waitHidden('#controls');
  await h.padTap(1);await h.waitHidden('#settings');
  await h.pad('disconnect');
 });

 test('Reset All brings back the default controls',async(h)=>{
  const {page}=h;
  // Given I bound an action to K on the Controls screen
  await openControls(h);
  const action=await firstRebindable(h);
  await bindToK(h,action);
  // When I press R and confirm
  await h.tap('KeyR');await h.waitVisible('#confirm');
  await page.getByRole('button',{name:'Reset All'}).click();
  // Then the action no longer holds K
  await h.until(a=>!gcInput.bindings.actions[a].includes('key:KeyK'),action);
  await h.tap('Escape');await h.waitHidden('#controls');
 });

 test('The game pauses when the window loses focus',async(h)=>{
  const {page,assert}=h;
  // Given a game is being played (the title's first item starts one)
  await page.locator('#title .game-menu li:first-child .game-btn').click();
  await h.until(()=>state!=='title');
  if(!(await h.eval(()=>kitPlaying)))return; // a genre whose first screen after the title is a menu has no world to pause yet
  // When the window loses focus
  await h.eval(()=>dispatchEvent(new Event('blur')));
  // Then the pause menu opens with "Paused while you were away"
  await h.waitVisible('#pause');
  assert.ok(await h.visible('#pause-blur'),'paused while away line');
  // And Resume plays on
  await page.getByRole('button',{name:'Resume'}).click();
  await h.until(()=>!paused);
 });

 test('The pause menu opens Settings and Controls',async(h)=>{
  const {page}=h;
  // Given a game is being played (the title's first item starts one)
  await page.locator('#title .game-menu li:first-child .game-btn').click();
  await h.until(()=>state!=='title');
  if(!(await h.eval(()=>kitPlaying)))return; // nothing to pause yet in this genre's first screen
  // When I press Esc and choose Controls
  await h.tap('Escape');await h.waitVisible('#pause');
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  // Then the Controls screen opens, and Back returns to the pause menu
  await page.getByRole('listbox',{name:'Controls'}).waitFor();
  await h.tap('Escape');await h.waitVisible('#pause');
  // And Settings opens the Settings screen
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await h.waitVisible('#settings');
  await h.tap('Escape');await h.waitVisible('#pause');
 });

 test('A touch shows the on-screen controls and Tap prompts',async(h)=>{
  const {assert}=h;
  // Given the game is played with a keyboard
  await h.page.locator('#title .game-menu li:first-child .game-btn').click();
  await h.until(()=>state!=='title');
  // When a finger touches the screen
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  // Then the device becomes touch and stays touch
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  await h.ticks(12);
  assert.equal(await h.eval(()=>document.getElementById('game').dataset.device),'touch','touch stays the device');
  // And the on-screen controls show where the genre has them
  if(!(await h.eval(()=>!!document.getElementById('touch'))))return;
  assert.ok(await h.visible('#touch'),'touch controls shown on touch');
  // And the on-screen Pause button opens the pause menu
  if(!(await h.eval(()=>kitPlaying)))return;
  await h.touch(h.page.getByRole('button',{name:'Pause',exact:true}));
  await h.waitVisible('#pause');
 });
};
