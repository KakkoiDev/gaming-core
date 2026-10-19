// Hop Hill (starters/genres/platformer/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 async function startLevel(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&hero.grounded);
 }
 // a key held down while the game runs, released by the step itself (for two keys at once)
 async function down(h,code){await h.ready();await h.page.keyboard.down(code);}
 async function up(h,code){await h.page.keyboard.up(code);await h.ticks(1);}
 // walk right until the game reaches a state
 async function walkRightUntil(h,fn){await h.holdUntil('ArrowRight',fn);}
 async function reachFlag(h){
  await startLevel(h);
  await h.eval(()=>{hero.pos=vec2(73,3.45);hero.vel=vec2();});
  await walkRightUntil(h,()=>state==='over');
  await h.waitVisible('#results');
 }
 async function loseLastLife(h){
  await startLevel(h);
  await h.eval(()=>{lives=1;hero.pos=vec2(9,3.45);hero.vel=vec2();hero.invuln=0;});
  await walkRightUntil(h,()=>state==='over');
  await h.waitVisible('#gameover');
 }

 test('Play starts the first level with the HUD and its name',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Play focused
  await h.waitVisible('#title');
  assert.ok(await page.getByRole('button',{name:'Play'}).evaluate(e=>e===document.activeElement),'Play is focused');
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play'&&hero.grounded);
  // Then the level starts with the HUD and the movement tutorial showing
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  // And the HUD shows the level name "1-1 Windy Ledge"
  assert.equal(await h.text('#hud-level'),'1-1 Windy Ledge');
 });

 test('Walking collects coins and a held jump reaches the raised platform',async(h)=>{
  const {page,assert}=h;
  // Given the first level just started
  await h.waitVisible('#title');
  await page.getByRole('button',{name:'Play'}).click();
  await h.until(()=>state==='play'&&hero.grounded);
  // When I walk right over the first coins and hold Space to jump while still walking
  await down(h,'ArrowRight');
  await h.until(()=>hero.pos.x>7.6);
  await page.keyboard.down('Space');
  await h.ticks(23);
  await up(h,'ArrowRight');
  await h.ticks(12);await up(h,'Space');
  // Then the hero lands on the raised platform
  await h.until(()=>hero.grounded);
  assert.ok(await h.eval(()=>hero.pos.y>6),'standing on the platform (y '+(await h.eval(()=>hero.pos.y))+')');
  // And at least three coins are collected and the HUD shows them
  assert.ok(await h.eval(()=>coins>=3),'coins collected while walking');
  await h.until(()=>document.getElementById('hud-coins').textContent===t('hud.coins',{n:coins,total:level.coins.length}));
  await h.shot('platform');
 });

 test('Running into an enemy costs a life and sends the hero back to the start',async(h)=>{
  const {assert}=h;
  // Given the first level just started with three lives
  await startLevel(h);
  assert.equal(await h.eval(()=>lives),3);
  // When I walk right into the first enemy
  await walkRightUntil(h,()=>lives===2);
  // Then a life is lost and the hero is back at the start
  assert.ok(await h.eval(()=>hero.pos.x<4&&damaged),'back at the start');
  // And the HUD shows two lives
  await h.until(()=>document.querySelectorAll('#hud-lives .game-icon').length===2);
 });

 test('Reaching the flag shows the results with time, coins and stars',async(h)=>{
  const {page,assert}=h;
  // Given the hero just past the last block, after the checkpoint
  // When I walk right to the flag
  await reachFlag(h);
  assert.ok(await h.eval(()=>checkpointOn),'the checkpoint was passed');
  // Then the results read "Level Clear" with Time and Coins rows and three stars
  assert.equal(await h.text('#res-title'),'Level Clear');
  const rows=await h.eval(()=>[...document.querySelectorAll('#results dt')].map(d=>d.textContent));
  assert.ok(rows.includes('Time')&&rows.includes('Coins'),'time and coins rows: '+rows);
  assert.equal(await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon').length),3);
  // And the best time is saved
  assert.ok(await h.eval(()=>bestTime()>0),'best time saved');
  await h.shot('results');
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
  assert.equal(await h.eval(()=>state),'title');
 });

 test('Replay after the results starts again with the best time showing',async(h)=>{
  const {page,assert}=h;
  // Given the results after reaching the flag, with Replay focused
  await reachFlag(h);
  assert.ok(await page.getByRole('button',{name:'Replay'}).evaluate(e=>e===document.activeElement),'Replay is focused');
  // When I press Enter
  await h.tap('Enter');
  // Then the level starts again with three lives, no coins and the timer at zero
  await h.until(()=>state==='play'&&lives===3&&coins===0&&levelTime<1);
  // And the best time shows under the timer
  await h.until(()=>document.getElementById('hud-best').textContent.startsWith('Best'));
 });

 test('Esc pauses the world and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given the hero walking right in the first level
  await startLevel(h);
  await down(h,'ArrowRight');await h.until(()=>hero.vel.x>1);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and nothing moves for 12 ticks
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>[hero.pos.x,levelTime]);await h.ticks(12);
  assert.deepEqual(await h.eval(()=>[hero.pos.x,levelTime]),frozen,'nothing moves while paused');
  await up(h,'ArrowRight');
  // And Esc again resumes the game
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 });

 test('The gamepad walks with the d-pad and jumps with the south button',async(h)=>{
  // Given the first level with a gamepad plugged in
  await startLevel(h);
  await h.pad('connect');
  // When I hold right on the d-pad, then press the south button
  const x0=await h.eval(()=>hero.pos.x);
  await h.ready();await h.pad('button',15,true);
  // Then the hero walks right, then jumps and lands again
  await h.until(x=>hero.pos.x>x+1,x0);await h.pad('button',15,false);
  await h.until(()=>hero.grounded&&Math.abs(hero.vel.x)<.01);
  await h.ready();await h.pad('button',0,true);
  await h.until(()=>hero.vel.y>0&&!hero.grounded);await h.ticks(6);await h.pad('button',0,false);
  await h.until(()=>hero.grounded);
  await h.pad('disconnect');
 });

 test('Losing the last life shows Game Over',async(h)=>{
  const {page,assert}=h;
  // Given the hero on the last life, walking toward an enemy
  // When the enemy touches the hero
  await loseLastLife(h);
  // Then the Game Over screen reads "Game Over"
  assert.equal(await h.text('#go-title'),'Game Over');
  await h.shot('gameover');
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
  assert.equal(await h.eval(()=>state),'title');
 });

 test('Continue after Game Over starts the level again with three lives',async(h)=>{
  const {page}=h;
  // Given the Game Over screen after losing the last life
  await loseLastLife(h);
  // When I choose Continue
  await page.getByRole('button',{name:'Continue'}).click();
  // Then the level starts again with three lives and no coins
  await h.until(()=>state==='play'&&lives===3&&coins===0&&document.getElementById('gameover').hidden);
 });

 test('The on-screen arrows and Jump button move the hero on a touch screen',async(h)=>{
  const {page,assert}=h;
  // Given the first level played on a touch screen
  await startLevel(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  // When I press the on-screen Right button, then Left, then Jump
  const x0=await h.eval(()=>hero.pos.x);
  await h.touch(page.getByRole('button',{name:'Right'}),12);
  // Then the hero walks right, walks back left, and jumps
  const x1=await h.eval(()=>hero.pos.x);
  assert.ok(x1>x0+.3,'walked right: '+x0+' -> '+x1);
  await h.until(()=>Math.abs(hero.vel.x)<.01);
  const x2=await h.eval(()=>hero.pos.x);
  await h.touch(page.getByRole('button',{name:'Left'}),8);
  assert.ok(await h.eval(x=>hero.pos.x<x-.3,x2),'walked left');
  await h.until(()=>hero.grounded&&Math.abs(hero.vel.x)<.01);
  const y0=await h.eval(()=>hero.pos.y);
  await h.touch(page.getByRole('button',{name:'Jump'}));
  assert.ok(await h.eval(y=>hero.pos.y>y+.3,y0),'jumped');
  await h.until(()=>hero.grounded);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Jump, Run and Down / Drop Through, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Jump'}).waitFor();
  await list.getByRole('option',{name:'Run'}).waitFor();
  await list.getByRole('option',{name:'Down / Drop Through'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','jump','run','down','pause','back']);
 });
};
