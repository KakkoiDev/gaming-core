// Star Lane (starters/genres/shooter/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 async function startStage(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
 }
 // hold Z and sweep the ship left and right with the arrow keys until `until` holds
 async function sweep(h,until,limit=120){
  let dir='ArrowLeft';
  await h.page.keyboard.down('KeyZ');
  try{
   for(let i=0;i<limit&&!(await h.eval(until));i++){
    await h.holdTicks(dir,20);
    dir=dir==='ArrowLeft'?'ArrowRight':'ArrowLeft';
   }
  }finally{await h.page.keyboard.up('KeyZ');}
  h.assert.ok(await h.eval(until),'reached: '+until);
 }
 // the last life lost to an enemy bullet
 async function hitLastLife(h){
  await h.eval(()=>{lives=1;invuln=0;enemyShots.push({pos:player.pos.add(vec2(0,1.5)),vel:vec2(0,-.2)});});
  await h.waitVisible('#gameover');
 }

 test('Start opens the stage with the fire hint',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Start focused
  const start=page.getByRole('button',{name:'Start'});
  await start.waitFor();
  assert.ok(await start.evaluate(e=>e===document.activeElement),'Start is focused');
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
  // Then the HUD shows and the title is gone
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  // And the hint to hold Shoot shows
  await h.waitVisible('#tutorial');
 });

 test('Holding Z while sweeping shoots the waves and the score rises',async(h)=>{
  const {assert}=h;
  // Given a new stage
  await startStage(h);
  // When I hold Z and sweep the ship left and right with the arrow keys
  // Then my shots hit and the score reaches 500
  await sweep(h,()=>score>=500&&shotsHit>0);
  // And the HUD shows the score
  await h.until(()=>document.getElementById('hud-score').textContent===fmt(score));
  assert.ok(await h.eval(()=>score>=500));
  await h.shot('play');
 });

 test('A bomb clears the enemy bullets',async(h)=>{
  const {assert}=h;
  // Given a stage with enemy bullets flying
  await startStage(h);
  await sweep(h,()=>enemyShots.length>0);
  // When I press X
  const before=await h.eval(()=>bombs);
  await h.tap('KeyX');
  // Then one bomb is used and no enemy bullet is left on screen
  await h.until(b=>bombs===b-1&&bombFlash>0,before);
  assert.equal(await h.eval(()=>enemyShots.filter(s=>s.pos.y<HALF.y).length),0,'the bomb cleared the bullets');
  // And the HUD shows one bomb icon fewer
  await h.until(n=>document.querySelectorAll('#hud-bombs .game-icon').length===n,before-1);
 });

 test('Esc pauses the stage and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given a stage in play
  await startStage(h);
  await h.until(()=>stageTime>.5);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the stage clock does not move for 15 ticks
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>stageTime);await h.ticks(15);
  assert.equal(await h.eval(()=>stageTime),frozen,'the stage stops while paused');
  // And Esc again resumes the stage
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  await h.until(f=>stageTime>f,frozen);
 });

 test('The gamepad stick moves the ship and south fires',async(h)=>{
  // Given a stage in play with a gamepad plugged in
  await startStage(h);
  await h.pad('connect');
  // When I push the left stick towards the far side
  const x0=await h.eval(()=>player.pos.x),dir=x0>0?-1:1;
  await h.pad('axis',0,dir);
  // Then the ship moves more than one unit that way
  await h.until(([x0,dir])=>(player.pos.x-x0)*dir>1,[x0,dir]);
  await h.pad('axis',0,0);
  // And holding the south button fires
  const fired=await h.eval(()=>shotsFired);
  await h.pad('button',0,true);
  await h.until(f=>shotsFired>f,fired);
  await h.pad('button',0,false);
  await h.pad('disconnect');
 });

 test('The Hive Queen arrives when the waves are done',async(h)=>{
  const {assert}=h;
  // Given a stage whose waves are all over
  await startStage(h);
  await h.eval(()=>{waveIndex=WAVES.length;enemies=[];stageTime=BOSS_AT-.5;invuln=999;});
  // When the boss time comes
  await h.until(()=>!!boss);
  // Then the Hive Queen flies in
  await h.until(()=>boss.ready);
  // And her name and HP bar show at the top of the HUD
  await h.waitVisible('#hud-boss');
  assert.equal(await h.text('#hud-boss-name'),'Hive Queen');
  assert.ok(await h.visible('#hud-boss-bar'));
  await h.shot('boss');
 });

 test('Beating the Hive Queen with the mouse clears the stage and records a top score',async(h)=>{
  const {page,assert}=h;
  // Given the Hive Queen on screen with 6 HP left
  await startStage(h);
  await h.eval(()=>{waveIndex=WAVES.length;enemies=[];stageTime=BOSS_AT;invuln=999;});
  await h.until(()=>boss&&boss.ready);
  await h.eval(()=>{boss.hp=6;});
  // When I hold the left mouse button under her and follow her with the pointer
  let p=await h.screen(await h.eval(()=>boss.pos.x),-10);
  await page.mouse.move(p.x,p.y);await page.mouse.down();
  for(let i=0;i<600&&await h.eval(()=>boss.hp>0);i++){
   p=await h.screen(await h.eval(()=>boss.pos.x),-10);await page.mouse.move(p.x,p.y);await h.ticks(2);
  }
  await page.mouse.up();
  // Then she is beaten and the results read "Stage Clear" with a name entry
  assert.ok(await h.eval(()=>boss.hp<=0),'the boss is beaten');
  assert.ok(await h.eval(()=>inputDevice()==='mouse'));
  const name=page.getByLabel('Your name');
  await name.waitFor();
  assert.equal(await h.text('#res-title'),'Stage Clear');
  // And after I type "ace" the high score table shows ACE
  await name.fill('ace');await name.press('Enter');
  await h.until(()=>document.querySelector('.game-scores')?.textContent.includes('ACE'));
  assert.equal(await h.eval(()=>highScores('stage1').list()[0].name),'ACE');
  await h.shot('scores');
  // And Play Again starts a new stage at 0 with three lives
  await page.getByRole('button',{name:'Play Again'}).click();
  await h.until(()=>state==='play'&&score===0&&lives===3&&!boss);
 });

 test('Losing the last life offers a Continue',async(h)=>{
  const {page,assert}=h;
  // Given a stage with some score and one life left
  await startStage(h);
  await h.eval(()=>{score=1200;});
  // When an enemy bullet hits the ship
  await hitLastLife(h);
  // Then the game over screen reads "Game Over" with Continue focused
  assert.equal(await h.text('#go-title'),'Game Over');
  assert.equal(await h.focused(),'over-continue');
  await h.shot('gameover');
  // And Continue goes back to the stage with the score at 0, three lives and one continue fewer
  await page.getByRole('button',{name:'Continue'}).click();
  await h.until(()=>state==='play'&&score===0&&lives===3&&continues===2);
  assert.ok(await h.visible('#hud'));
 });

 test('With no continues left Game Over goes back to the title',async(h)=>{
  const {page,assert}=h;
  // Given a stage with one life and no continues left
  await startStage(h);
  await h.eval(()=>{continues=0;});
  // When an enemy bullet hits the ship
  await hitLastLife(h);
  // Then Continue is disabled and Back to Title is focused
  assert.ok(await h.eval(()=>document.getElementById('over-continue').disabled),'Continue is disabled');
  const back=page.getByRole('button',{name:'Back to Title'});
  await h.until(()=>document.activeElement?.id==='over-title');
  // And Back to Title shows the title screen
  await back.click();
  await h.waitVisible('#title');
  await h.until(()=>state==='title');
 });

 test('High Scores on the title shows the table and Back closes it',async(h)=>{
  const {page}=h;
  // Given the title screen
  await h.waitVisible('#title');
  // When I choose High Scores
  await page.getByRole('button',{name:'High Scores'}).click();
  // Then the high score table opens
  await h.waitVisible('#results .game-scores');
  // And Back returns to the title menu
  await page.getByRole('button',{name:'Back'}).click();
  await h.waitHidden('#results');
  await h.waitVisible('#title-start');
 });

 test('Quit from the pause menu goes back to the title',async(h)=>{
  const {page}=h;
  // Given the pause menu is open during a stage
  await startStage(h);
  await h.tap('Escape');await h.waitVisible('#pause');
  // When I choose Quit to Title and confirm
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  // Then the title screen shows
  await h.waitVisible('#title');
  await h.until(()=>state==='title');
 });

 test('The on-screen Bomb button bombs on a touch screen',async(h)=>{
  const {page}=h;
  // Given a stage played on a touch screen
  await startStage(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  const before=await h.eval(()=>bombs);
  // When I press the on-screen Bomb button
  await h.touch(page.getByRole('button',{name:'Bomb'}));
  // Then one bomb is used
  await h.until(b=>bombs===b-1,before);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Shoot, Bomb and Focus (slow), then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Shoot'}).waitFor();
  await list.getByRole('option',{name:'Bomb'}).waitFor();
  await list.getByRole('option',{name:'Focus (slow)'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','fire','bomb','focus','pause','back']);
 });
};
