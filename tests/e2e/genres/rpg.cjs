// Meadow Tale (starters/genres/rpg/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const ELDER={x:6.5,y:8.5},FOREST={x:13.5,y:6.5};
 const heroAt=(h)=>h.eval(()=>({x:hero.pos.x,y:hero.pos.y,hp:hero.hp}));
 // New Game from the title with Enter
 async function newGame(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
 }
 // a new game with the quest accepted, standing on the forest path
 async function inForest(h){
  await newGame(h);
  await h.eval(([x,y])=>{setQuest('find');hero.pos=vec2(x,y);},[FOREST.x,FOREST.y]);
 }
 // one step of real input toward a point: the arrow on the stronger axis, held for a few ticks
 async function step(h,tx,ty,n=5){
  const p=await heroAt(h);const dx=tx-p.x,dy=ty-p.y;
  await h.holdTicks(Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowUp':'ArrowDown'),n);
 }
 async function walkTo(h,tx,ty,within=.4,limit=200){
  for(let i=0;;i++){
   const p=await heroAt(h);if(Math.hypot(tx-p.x,ty-p.y)<=within)return;
   h.assert.ok(i<limit,`walked to ${tx},${ty} (at ${p.x.toFixed(2)},${p.y.toFixed(2)})`);
   await step(h,tx,ty,Math.hypot(tx-p.x,ty-p.y)<1?2:5);
  }
 }
 // next to the elder, Enter until her dialogue opens (the key that closed a menu is ignored for a moment)
 async function talkToElder(h){
  await walkTo(h,ELDER.x,ELDER.y,1.3);
  await h.waitVisible('#hud-action');
  for(let i=0;i<10&&!(await h.visible('#dialogue'));i++)await h.tap('Enter');
  await h.waitVisible('#dialogue');
 }
 async function untilChoices(h){
  for(let i=0;i<10&&!(await h.visible('#dialogue [data-choice="0"]'));i++)await h.tap('Enter');
  await h.waitVisible('#dialogue [data-choice="0"]');
 }

 test('New Game starts in the village with full health',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with no save
  await h.waitVisible('#title');
  // When I read the menu
  const start=page.getByRole('button',{name:'New Game'});
  // Then New Game is focused, Load Game is disabled and there is no Continue
  assert.ok(await start.evaluate(e=>e===document.activeElement),'New Game is focused');
  assert.ok(await h.eval(()=>document.getElementById('title-load').disabled),'no save yet');
  assert.ok(!(await h.visible('#title-continue')));
  // And Enter starts the game with the HUD showing 10/10 health and the move tutorial
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
  assert.ok(await h.visible('#hud'));
  await h.until(()=>document.getElementById('hud-hp-num').textContent==='10/10');
  await h.waitVisible('#tutorial');
 });

 test('The gamepad stick walks and its face buttons open and close the bag',async(h)=>{
  const {assert}=h;
  // Given a new game with a gamepad plugged in
  await newGame(h);
  await h.pad('connect');
  // When I push the left stick right
  const before=await heroAt(h);
  await h.pad('axis',0,1);
  // Then the hero walks right
  await h.until(x=>hero.pos.x>x+.3,before.x);
  await h.pad('axis',0,0);
  // And the north button opens the bag and pauses the world
  await h.padTap(3);await h.waitVisible('#inventory');
  assert.ok(await h.eval(()=>paused),'the bag pauses the world');
  // And the east button closes it and the world runs again
  await h.padTap(1);await h.until(()=>document.getElementById('inventory').hidden&&!paused);
  await h.pad('disconnect');
 });

 test('Talking to the elder and accepting starts the quest',async(h)=>{
  const {page,assert}=h;
  // Given a new game
  await newGame(h);
  // When I walk to the elder and press Enter
  await talkToElder(h);
  // Then a dialogue from Elder Rowan opens and its lines type out as I press Enter
  assert.equal(await h.text('#dlg-speaker'),'Elder Rowan');
  await h.shot('dialogue');
  await untilChoices(h);
  // And the first choice is focused
  const accept=page.getByRole('button',{name:'I will find it'});
  assert.ok(await accept.evaluate(e=>e===document.activeElement),'the first choice is focused');
  // And choosing "I will find it" closes the dialogue and the objective reads "Find the lost key in the forest"
  await accept.click();
  await h.until(()=>quest==='find'&&!dialogueOpen());
  await h.waitVisible('#hud-quest');
  assert.equal(await h.text('#hud-quest-text'),'Find the lost key in the forest');
  assert.ok(!(await h.visible('#dialogue')));
 });

 test('Declining the elder leaves the quest for later',async(h)=>{
  const {page,assert}=h;
  // Given a new game on a touch screen, standing next to the elder
  await newGame(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  await h.eval(([x,y])=>{hero.pos=vec2(x-1,y);},[ELDER.x,ELDER.y]);
  // When I press the on-screen Talk button and choose "Not now" when she asks me to find her key
  const talk=page.getByRole('button',{name:'Talk'});
  for(let i=0;i<10&&!(await h.visible('#dialogue'));i++)await h.touch(talk);
  await h.waitVisible('#dialogue');
  await untilChoices(h);
  await page.getByRole('button',{name:'Not now'}).click();
  // Then she says to come back if I change my mind
  await h.until(()=>document.getElementById('dlg-line')?.textContent==='Come back if you change your mind.');
  // And no quest starts
  assert.equal(await h.eval(()=>quest),'none');
  assert.ok(!(await h.visible('#hud-quest')));
 });

 test('Attack defeats a slime and it drops a potion',async(h)=>{
  const {assert}=h;
  // Given the quest to find the key, standing in the forest
  await inForest(h);
  // When I face the nearest slime and press J until it dies
  const target=await h.eval(()=>{let best=0;slimes.forEach((s,i)=>{if(s.pos.distance(hero.pos)<slimes[best].pos.distance(hero.pos))best=i;});return best;});
  let shot=false;
  for(let i=0;await h.eval(i=>slimes[i].alive,target);i++){
   assert.ok(i<200,'the slime dies');
   const s=await h.eval(i=>({x:slimes[i].pos.x,y:slimes[i].pos.y}),target),p=await heroAt(h);
   if(Math.hypot(s.x-p.x,s.y-p.y)>1.3){await step(h,s.x,s.y);continue;}
   await step(h,s.x,s.y,2); // face it
   await h.tap('KeyJ');
   if(!shot){shot=true;await h.shot('fight');}
   await h.until(()=>hero.swing<=0);
  }
  // Then one slime is defeated and the HUD shows my health
  assert.equal(await h.eval(()=>defeated),1);
  await h.until(()=>document.getElementById('hud-hp-num').textContent===hero.hp+'/10');
  // And walking onto the potion it dropped puts it in my bag
  const drop=await h.eval(()=>{const near=pickups.filter(p=>p.id==='potion').sort((a,b)=>a.pos.distance(hero.pos)-b.pos.distance(hero.pos))[0];return near&&{x:near.pos.x,y:near.pos.y};});
  if(drop&&!(await h.eval(()=>bag.some(i=>i&&i.id==='potion'))))await walkTo(h,drop.x,drop.y,.3);
  await h.until(()=>bag.some(i=>i&&i.id==='potion'));
 });

 test('The bag drinks one potion and drops another',async(h)=>{
  const {page,assert}=h;
  // Given two potions in my bag and 4 health
  await newGame(h);
  await h.eval(()=>{addToBag('potion');addToBag('potion');hero.hp=4;});
  // When I open the bag with I and use the Potion
  await h.tap('KeyI');await h.waitVisible('#inventory');
  await page.getByRole('gridcell',{name:'Potion, 2'}).click();
  assert.equal(await h.text('#inv-name'),'Potion');
  await h.shot('bag');
  await page.getByRole('button',{name:'Use'}).click();
  // Then my health rises by 5 and one potion is left
  await h.until(()=>hero.hp===9&&bag[0]?.n===1);
  // And Drop puts the last potion back on the ground and empties the bag
  await page.getByRole('button',{name:'Drop'}).click();
  await h.until(()=>!bag.some(Boolean)&&pickups.some(p=>p.id==='potion'&&p.wait));
  await h.tap('Escape');await h.until(()=>document.getElementById('inventory').hidden&&!paused);
 });

 test('The pause menu stops the slimes and saves in slot 1',async(h)=>{
  const {page,assert}=h;
  // Given the quest to find the key, standing in the forest
  await inForest(h);
  await h.eval(()=>{hero.pos=slimes[0].pos.add(vec2(-3,0));});
  await h.until(()=>slimes[0].pos.distance(slimes[0].home)>.2); // the slime has started to chase
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the slimes do not move for 15 ticks
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>JSON.stringify(slimes.map(s=>[s.pos.x,s.pos.y])));
  await h.ticks(15);
  assert.equal(await h.eval(()=>JSON.stringify(slimes.map(s=>[s.pos.x,s.pos.y]))),frozen,'the world stops while paused');
  // And Save, then Slot 1, writes a save of the forest with the quest in it
  await page.getByRole('button',{name:'Save'}).click();await h.waitVisible('#saves');
  await page.getByRole('option',{name:'Slot 1'}).click();
  await h.until(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')||'null')?.state?.quest==='find');
  await h.shot('saves');
  assert.equal(await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')).place),'place.forest');
  // And Slots 2 and 3 are still empty
  const slot2=page.getByRole('option',{name:'Slot 2'});
  const slot3=page.getByRole('option',{name:'Slot 3'});
  assert.ok((await slot2.textContent()).includes('Empty'),'Slot 2 is empty');
  assert.ok((await slot3.textContent()).includes('Empty'),'Slot 3 is empty');
  await h.tap('Escape');await h.until(()=>document.getElementById('saves').hidden);
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 });

 test('Bringing the key back completes the quest',async(h)=>{
  const {page,assert}=h;
  // Given the quest to find the key, the slimes gone, standing next to the key in the far east
  await inForest(h);
  await h.eval(()=>{for(const s of slimes)s.alive=false;});
  const key=await h.eval(()=>{const k=pickups.find(p=>p.id==='key');hero.pos=k.pos.add(vec2(-1.2,0));return {x:k.pos.x,y:k.pos.y};});
  // When I step onto the key and walk it back to the elder and talk to her
  await walkTo(h,key.x,key.y,.3);
  await h.until(()=>quest==='return'&&bag.some(i=>i&&i.id==='key'));
  // Then the objective reads "Bring the key back to the elder" on the way
  assert.equal(await h.text('#hud-quest-text'),'Bring the key back to the elder');
  await walkTo(h,24,6.9);await walkTo(h,13,6.9);await walkTo(h,8,6.9);
  await talkToElder(h);
  for(let i=0;i<12&&!(await h.visible('#results'));i++)await h.tap('Enter');
  // And the results read "Quest Complete" and the key has left my bag
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Quest Complete');
  assert.ok(await h.eval(()=>quest==='done'&&!bag.some(i=>i&&i.id==='key')));
  await h.shot('results');
  // And Keep Exploring goes back to playing
  await page.getByRole('button',{name:'Keep Exploring'}).click();
  await h.until(()=>state==='play'&&kitPlaying);
 });

 test('Fainting offers Continue from the last save',async(h)=>{
  const {page,assert}=h;
  // Given a save in slot 1 of the forest and a game in progress
  await inForest(h);
  const saved=await h.eval(()=>{saveWrite(1,getState(),placeKey());return JSON.parse(localStorage.getItem(GAME_ID+'.save.1'));});
  await h.eval(()=>{hero.pos=vec2(3.5,9.5);setQuest('none');});
  // When my health reaches 0
  await h.eval(()=>{hero.hp=0;});
  // Then Game Over offers Continue
  await h.waitVisible('#gameover');
  assert.ok(!(await h.eval(()=>document.getElementById('over-continue').disabled)));
  await h.shot('gameover');
  // And Back to Title shows the title with Continue and the save's place and time
  await page.getByRole('button',{name:'Back to Title'}).click();await h.waitVisible('#title');
  assert.equal(await h.focused(),'title-new');
  await h.waitVisible('#title-continue-detail');
  assert.ok((await h.text('#title-continue-detail')).startsWith('Slime Forest'));
  // And Continue loads the save
  await page.getByRole('button',{name:'Continue'}).click();
  await h.until(()=>state==='play'&&kitPlaying);
  const loaded=await h.eval(()=>({x:hero.pos.x,y:hero.pos.y,hp:hero.hp,quest}));
  assert.deepEqual(loaded,{x:saved.state.hero.x,y:saved.state.hero.y,hp:saved.state.hero.hp,quest:'find'},'Continue loads the save');
  await h.waitVisible('#hud-quest');
 });

 test('Load Game on the title loads a chosen slot',async(h)=>{
  const {page,assert}=h;
  // Given a save in slot 1 of the forest
  await h.waitVisible('#title');
  await h.eval(([x,y])=>{freshWorld();quest='find';hero.pos=vec2(x,y);saveWrite(1,getState(),placeKey());freshWorld();toTitle();},[FOREST.x,FOREST.y]);
  // When I choose Load Game on the title and then Slot 1
  await page.getByRole('button',{name:'Load Game'}).click();
  await h.waitVisible('#saves');
  await page.getByRole('option',{name:'Slot 1'}).click();
  // Then the game starts in the forest at the saved place with the saved quest
  await h.until(()=>state==='play'&&kitPlaying);
  assert.deepEqual(await h.eval(()=>({x:hero.pos.x,y:hero.pos.y,quest})),{x:FOREST.x,y:FOREST.y,quest:'find'});
  await h.waitVisible('#hud-quest');
 });

 test('Quit from the pause menu goes back to the title',async(h)=>{
  const {page}=h;
  // Given the pause menu is open during a game
  await newGame(h);
  await h.tap('Escape');await h.waitVisible('#pause');
  // When I choose Quit to Title and confirm
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  // Then the title screen shows
  await h.waitVisible('#title');
  await h.until(()=>state==='title');
 });

 test('The on-screen buttons attack and open the bag on a touch screen',async(h)=>{
  const {page,assert}=h;
  // Given a new game played on a touch screen, a slime right in front of the hero
  await newGame(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  await h.eval(()=>{hero.facing=vec2(1,0);slimes[0].pos=hero.pos.add(vec2(.8,0));slimes[0].home=slimes[0].pos;hero.hurt=99;});
  // When I press the on-screen Attack button
  await h.touch(page.getByRole('button',{name:'Attack'}),1);
  // Then the hero swings and hits the slime in front of it
  await h.until(()=>slimes[0].hp<SLIME_HP);
  // And the on-screen Items button opens the bag and pauses the world
  await h.touch(page.getByRole('button',{name:'Items'}));
  await h.waitVisible('#inventory');
  assert.ok(await h.eval(()=>paused),'the bag pauses the world');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Attack, Confirm / talk and Field menu (bag), then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Attack'}).waitFor();
  await list.getByRole('option',{name:'Confirm / talk'}).waitFor();
  await list.getByRole('option',{name:'Field menu (bag)'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','fire','confirm','menu','pause','back']);
 });
};
