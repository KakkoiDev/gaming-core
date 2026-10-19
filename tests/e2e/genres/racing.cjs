// Turbo Loop (starters/genres/racing/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 // the last checkpoint, facing the line: the lap is then driven over the line with the accelerator
 const toLastCheckpoint=(h)=>h.eval(()=>{const n=TRACK.length;player.pos=TRACK[n-1].add(vec2(-2,0));player.angle=PI/2;player.next=n-1;});
 // a race (or a time trial) chosen from the title, past its countdown (shortened: the countdown has its own scenario)
 async function startRace(h,trial=false){
  await h.waitVisible('#title');
  if(trial)await h.page.getByRole('button',{name:'Time Trial'}).click();
  else await h.tap('Enter');
  await h.until(()=>state==='play'&&countdown>0);
  await h.eval(()=>{countdown=Math.min(countdown,.05);});
  await h.until(()=>countdown<=0);
 }
 async function lap(h,n){await toLastCheckpoint(h);await h.holdUntil('ArrowUp',l=>player.lap===l||state!=='play',n);}
 const focused=(locator)=>locator.evaluate(e=>e===document.activeElement);

 test('Race starts a countdown and the cars wait for GO',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Race focused
  await h.waitVisible('#title');
  assert.ok(await focused(page.getByRole('button',{name:'Race'})),'Race is focused');
  await h.shot('title');
  // When I press Enter
  await h.tap('Enter');
  // Then the HUD shows "3", four cars are on the grid and I start "4th / 4"
  await h.until(()=>state==='play'&&countdown>2&&racers.length===4);
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.until(()=>document.getElementById('hud-msg').textContent==='3');
  // And holding the accelerator does not move the car before GO
  const grid=await h.eval(()=>player.pos.x);
  await h.holdTicks('ArrowUp',18);
  assert.equal(await h.eval(()=>player.pos.x),grid,'no moving before GO');
  assert.equal(await h.text('#hud-pos'),'4th / 4','starting last on the grid');
  // And after the countdown the HUD reads "GO" and the tip shows
  await h.until(()=>countdown<=0);
  await h.until(()=>document.getElementById('hud-msg').textContent==='GO');
  await h.waitVisible('#tutorial');
 });

 test('The accelerator drives to the first checkpoint and the start line is not a lap',async(h)=>{
  const {assert}=h;
  // Given a race after GO
  await startRace(h);
  // When I hold the accelerator down the straight
  await h.holdUntil('ArrowUp',()=>player.next===2);
  // Then the car speeds past the first checkpoint and the HUD shows the speed
  assert.ok(await h.eval(()=>player.speed>.3&&player.pos.x>30),'the car sped down the straight');
  assert.ok(Number((await h.text('#hud-speed')).split(' ')[0])>80,'the HUD shows the speed');
  await h.shot('race');
  // And crossing the start line at the start counted no lap
  assert.equal(await h.eval(()=>player.lap),0,'crossing the start line at the start is not a lap');
 });

 test('Left steers and the brake slows the car',async(h)=>{
  const {page,assert}=h;
  // Given my car speeding down the straight
  await startRace(h);
  await h.holdUntil('ArrowUp',()=>player.speed>.3);
  // When I hold left with the accelerator
  const angle=await h.eval(()=>player.angle);
  await page.keyboard.down('ArrowUp');
  await h.holdTicks('ArrowLeft',18);
  await page.keyboard.up('ArrowUp');
  // Then the car turns left
  assert.ok(await h.eval(a=>player.angle<a-.1,angle),'← steers left');
  // And holding the brake slows it down
  const speed=await h.eval(()=>player.speed);
  await h.holdTicks('ArrowDown',18);
  assert.ok(await h.eval(s=>player.speed<s-.1,speed),'↓ brakes');
 });

 test('Esc pauses the race and Esc resumes',async(h)=>{
  const {page,assert}=h;
  // Given a race with my car moving
  await startRace(h);
  await h.ready();await page.keyboard.down('ArrowUp');
  await h.until(()=>player.speed>.1);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and no car and no clock moves for 15 ticks
  await h.waitVisible('#pause');
  await page.keyboard.up('ArrowUp');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>({x:player.pos.x,y:player.pos.y,t:raceTime,r:racers[0].pos.x}));
  await h.ticks(15);
  assert.deepEqual(await h.eval(()=>({x:player.pos.x,y:player.pos.y,t:raceTime,r:racers[0].pos.x})),frozen,'the race stops while paused');
  // And Esc again resumes the race
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 });

 test('The line without the checkpoints before it is not a lap',async(h)=>{
  const {assert}=h;
  // Given my car just before the finish line, with no checkpoint passed
  await startRace(h);
  await h.eval(()=>{player.pos=TRACK[0].add(vec2(-6,0));player.angle=PI/2;});
  // When I drive over the line
  await h.holdUntil('ArrowUp',()=>player.pos.x>TRACK[0].x+CHECK_R);
  // Then no lap is counted
  assert.equal(await h.eval(()=>player.lap),0,'the line without the checkpoints before it is not a lap');
 });

 test('Three laps in order finish first with the results table',async(h)=>{
  const {page,assert}=h;
  // Given a race after GO
  await startRace(h);
  // When I drive over the line from the last checkpoint three times
  // Then the HUD reads "Lap 2 / 3", then "Lap 3 / 3" with "Final Lap"
  await lap(h,1);
  await h.until(()=>document.getElementById('hud-lap').textContent==='Lap 2 / 3');
  await lap(h,2);
  await h.until(()=>document.getElementById('hud-lap').textContent==='Lap 3 / 3');
  assert.equal(await h.text('#hud-msg'),'Final Lap');
  await lap(h,3);
  // And the results read "You finished 1st" with every racer in the table and my total time
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'You finished 1st');
  assert.equal(await h.eval(()=>document.querySelectorAll('#race-table > li').length),4,'every racer in the table');
  assert.equal(await h.text('#race-table > li[data-new] span:nth-child(2)'),'You');
  assert.ok(/^\d:\d\d\.\d\d$/.test(await h.text('#race-table > li[data-new] span:nth-child(3)')),'your total time');
  await h.shot('results');
  // And Retry, focused, starts a new race from the countdown
  await h.until(()=>document.activeElement?.textContent.trim()==='Retry');
  assert.ok(await focused(page.getByRole('button',{name:'Retry'})),'Retry is focused');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&countdown>0&&player.lap===0&&raceTime===0);
 });

 test('The gamepad\'s right trigger accelerates and the stick steers',async(h)=>{
  const {assert}=h;
  // Given a race after GO with a gamepad plugged in
  await startRace(h);
  await h.pad('connect');
  // When I hold the right trigger, then push the stick right
  await h.ready();await h.pad('button',7,true);
  // Then the car speeds up and turns right
  await h.until(()=>player.speed>.25);
  const angle=await h.eval(()=>player.angle);
  await h.pad('axis',0,1);
  await h.ticks(15);
  assert.ok(await h.eval(a=>player.angle>a+.05,angle),'the stick steers right');
  await h.pad('axis',0,0);await h.pad('button',7,false);
  // And the game reads the gamepad as the device
  assert.equal(await h.eval(()=>gameInput().device),'gamepad');
  await h.pad('disconnect');
 });

 test('Finishing last shows Game Over',async(h)=>{
  const {page,assert}=h;
  // Given every rival home and my car on its final lap at the last checkpoint
  await startRace(h);
  await h.eval(()=>{racers.filter(c=>c.ai).forEach((c,i)=>{c.finished=true;c.finishTime=max(0,raceTime-1+i*.1);c.lap=3;});player.lap=2;});
  await toLastCheckpoint(h);
  // When I drive over the line
  await h.holdUntil('ArrowUp',()=>state==='over');
  // Then the Game Over screen reads "Last Place"
  await h.waitVisible('#gameover');
  assert.equal(await h.text('#go-title'),'Last Place');
  await h.shot('gameover');
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 });

 test('Time Trial races alone and saves the best lap',async(h)=>{
  const {page,assert}=h;
  // Given the title screen
  // When I choose Time Trial and drive three laps
  await startRace(h,true);
  // Then only my car was on the track
  assert.ok(await h.eval(()=>trial&&racers.length===1),'alone on the track');
  for(let n=1;n<=3;n++)await lap(h,n);
  // And the results read "Time Trial" and the best lap is saved
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Time Trial');
  assert.ok(await h.eval(()=>bestLapSaved()>0),'best lap saved');
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 });

 test('The on-screen Gas, Brake and Boost buttons drive on a touch screen',async(h)=>{
  const {page,assert}=h;
  // Given a race after GO played on a touch screen
  await startRace(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  // When I hold Gas, then Brake, then press Boost with the bar full
  await h.touch(page.getByRole('button',{name:'Gas'}),30);
  // Then the car speeds up, slows down, and boosts
  const fast=await h.eval(()=>player.speed);
  assert.ok(fast>.2,'Gas speeds up: '+fast);
  await h.touch(page.getByRole('button',{name:'Brake'}),6);
  assert.ok(await h.eval(s=>player.speed<s-.05,fast),'Brake slows down');
  await h.eval(()=>{boostCharge=1;});
  await h.touch(page.getByRole('button',{name:'Boost'}));
  await h.until(()=>boostCharge<1);
  assert.ok(await h.eval(()=>player.boostTime>0),'boosting');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Steer, Accelerate, Brake / reverse and Boost, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Steer'}).waitFor();
  await list.getByRole('option',{name:'Accelerate'}).waitFor();
  await list.getByRole('option',{name:'Brake / reverse'}).waitFor();
  await list.getByRole('option',{name:'Boost'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','accelerate','brake','boost','pause','back']);
 });
};
