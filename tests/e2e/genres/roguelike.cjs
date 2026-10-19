// Deepwell (starters/genres/roguelike/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const KEYS={'1,0':'ArrowRight','-1,0':'ArrowLeft','0,1':'ArrowUp','0,-1':'ArrowDown'};
 // a fixed-seed run (4242) started from the title with Enter
 async function startRun(h){
  await h.waitVisible('#title');
  await h.eval(()=>{nextSeed=4242;});
  await h.tap('Enter');
  await h.until(()=>state==='play'&&seed===4242&&depth===1);
 }
 // the first step of a shortest walk to the nearest target ('enemy' | 'potion' | 'stairs'); monsters on the way get bumped
 const nextStep=(h,kind='enemy')=>h.eval(kind=>{
  const goals=kind==='enemy'?enemies.map(e=>e.pos):kind==='potion'?potions:[stairs];
  const goal=new Set(goals.map(p=>p.x+','+p.y));
  const from=new Map([[player.pos.x+','+player.pos.y,null]]),queue=[player.pos];
  while(queue.length){
   const p=queue.shift(),k=p.x+','+p.y;
   if(goal.has(k)){let c=k;while(from.get(c)&&from.get(c).prev!==player.pos.x+','+player.pos.y)c=from.get(c).prev;return from.get(c)?from.get(c).dir:null;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n=vec2(p.x+dx,p.y+dy),nk=n.x+','+n.y;
    if(from.has(nk)||tileAt(n)!==FLOOR)continue;
    from.set(nk,{prev:k,dir:dx+','+dy});queue.push(n);
   }
  }
  return null;
 },kind);
 // one arrow tap per step towards `kind` until `done` holds
 async function walk(h,kind,done,limit=400){
  for(let i=0;i<limit&&!(await h.eval(done));i++){
   const step=await nextStep(h,kind);
   h.assert.ok(step,'a way to the '+kind);
   const before=await h.eval(()=>turns+':'+depth);
   await h.tap(KEYS[step]);
   await h.until(b=>turns+':'+depth!==b||state!=='play',before);
  }
  h.assert.ok(await h.eval(done),'reached: '+done);
 }

 test('Start Run opens floor 1 of a seeded run',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Start Run focused and the next seed set to 4242
  const start=page.getByRole('button',{name:'Start Run'});
  await start.waitFor();
  assert.ok(await start.evaluate(e=>e===document.activeElement),'Start Run is focused');
  await h.eval(()=>{nextSeed=4242;});
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play'&&seed===4242&&depth===1);
  // Then the HUD shows Seed 4242, Floor 1 and 20 / 20 health
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  assert.equal(await h.text('#hud-seed'),'Seed 4242');
  assert.equal(await h.text('#hud-floor'),'Floor 1');
  assert.equal(await h.text('#hud-hp'),'20 / 20');
  // And the move tutorial shows
  await h.waitVisible('#tutorial');
  // And building floor 1 again from the same seed gives the same layout
  const layout=await h.eval(()=>tiles.join(''));
  await h.eval(()=>{const p=player.pos;makeFloor();player.pos=p;});
  assert.equal(await h.eval(()=>tiles.join('')),layout,'the same seed and floor give the same layout');
 });

 test('One arrow press is one step and one turn',async(h)=>{
  const {assert}=h;
  // Given a run on floor 1
  await startRun(h);
  await h.waitVisible('#tutorial');
  // When I tap the arrow key towards the nearest monster
  const start=await h.eval(()=>({x:player.pos.x,y:player.pos.y}));
  await h.tap(KEYS[await nextStep(h)]);
  // Then I move exactly one tile and the turn counter reads 1
  await h.until(()=>turns===1);
  const moved=await h.eval(()=>({x:player.pos.x,y:player.pos.y}));
  assert.equal(Math.abs(moved.x-start.x)+Math.abs(moved.y-start.y),1,'one tile per press');
  await h.until(()=>document.getElementById('hud-turn').textContent==='Turn 1');
  // And the move tutorial goes away
  await h.waitHidden('#tutorial');
 });

 test('Bumping a monster attacks it and it hits back',async(h)=>{
  const {assert}=h;
  // Given a run on floor 1
  await startRun(h);
  // When I walk into the nearest monster until it dies
  await walk(h,'enemy',()=>kills>=1);
  // Then my kills count is 1
  assert.equal(await h.eval(()=>kills),1);
  // And my health is below the maximum because it hit back
  assert.ok(await h.eval(()=>player.hp<MAX_HP),'monsters hit back after your turn');
  await h.shot('fight');
 });

 test('A potion picked up and drunk heals me',async(h)=>{
  const {assert}=h;
  // Given a run on floor 1 with some health lost
  await startRun(h);
  await h.eval(()=>{player.hp=12;});
  // When I walk onto a potion and press 1
  await walk(h,'potion',()=>found>=1);
  // Then the HUD shows the potion in my bag before I drink it
  await h.until(()=>document.getElementById('hud-potion').textContent==='Potion ×'+bag&&bag>=1);
  const hp=await h.eval(()=>player.hp);
  await h.tap('Digit1');
  // And drinking it raises my health and empties that slot
  await h.until(hp=>player.hp>hp&&bag===found-1,hp);
  assert.equal(await h.text('#hud-potion'),'Potion ×'+(await h.eval(()=>bag)));
 });

 test('Esc pauses the world and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given a run on floor 1
  await startRun(h);
  // When I press Esc and then the down arrow
  await h.tap('Escape');await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>({time,turns,x:player.pos.x,y:player.pos.y}));
  await h.tap('ArrowDown');
  // Then the pause menu is open and nothing moves for 12 ticks: not the clock, the turn or me
  await h.ticks(12);
  assert.deepEqual(await h.eval(()=>({time,turns,x:player.pos.x,y:player.pos.y})),frozen,'the world stops while paused');
  assert.ok(await h.visible('#pause'));
  // And Esc again resumes the run
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 });

 test('The gamepad d-pad takes one step',async(h)=>{
  // Given a run on floor 1 with a gamepad plugged in
  await startRun(h);
  await h.pad('connect');
  // When I press the d-pad towards the stairs
  const dpad={'1,0':15,'-1,0':14,'0,1':12,'0,-1':13}[await nextStep(h,'stairs')];
  await h.padTap(dpad);
  // Then one turn passes
  await h.until(()=>turns===1);
  await h.pad('disconnect');
 });

 test('The stairs lead down to floor 2',async(h)=>{
  // Given a run on floor 1
  await startRun(h);
  // When I walk onto the stairs
  await walk(h,'stairs',()=>depth===2);
  // Then the HUD shows Floor 2
  await h.until(()=>document.getElementById('hud-floor').textContent==='Floor 2');
  await h.shot('floor2');
 });

 test('The stairs on floor 3 win the run',async(h)=>{
  const {page,assert}=h;
  // Given a run on floor 3, standing next to the stairs
  await startRun(h);
  await h.eval(()=>{depth=3;makeFloor();const s=stairs;
   for(const [dx,dy] of [[-1,0],[1,0],[0,1],[0,-1]]){const p=vec2(s.x+dx,s.y+dy);if(tileAt(p)===FLOOR&&!enemyAt(p)){player.pos=p;break;}}});
  // When I step onto the stairs
  await h.tap(KEYS[await h.eval(()=>(stairs.x-player.pos.x)+','+(stairs.y-player.pos.y))]);
  // Then the results read "You Escaped the Well" and list my Kills
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'You Escaped the Well');
  assert.ok((await h.text('#results dl')).includes('Kills'));
  await h.shot('won');
  // And New Run is focused first
  assert.equal(await h.focused(),'res-new','New Run first');
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
  assert.equal(await h.eval(()=>state),'title');
 });

 test('HP 0 ends the run for good',async(h)=>{
  const {page,assert}=h;
  // Given a run with 1 health left
  await startRun(h);
  await h.eval(()=>{player.hp=1;});
  // When I walk into a monster and it hits me
  await walk(h,'enemy',()=>state==='dead');
  // Then the game over screen reads "Run Over" with the floor, time and the monster that slew me
  await h.waitVisible('#gameover');
  assert.equal(await h.text('#go-title'),'Run Over');
  const detail=await h.text('#go-detail');
  assert.ok(/^Reached floor 1 in \d+:\d\d Slain by a rose slime on floor 1\.$/.test(detail),detail);
  // And New Run is focused first and there is no Load a Save
  assert.equal(await h.focused(),'over-new','New Run first');
  assert.ok(!(await h.eval(()=>!!document.querySelector('#gameover [data-t="gameover.load"]'))),'no Load in permadeath');
  await h.shot('over');
  // And New Run starts a fresh run on floor 1 with full health
  await page.getByRole('button',{name:'New Run'}).click();
  await h.until(()=>state==='play'&&player.hp===MAX_HP&&depth===1&&turns===0);
 });

 test('Quit from the pause menu goes back to the title',async(h)=>{
  const {page}=h;
  // Given the pause menu is open during a run
  await startRun(h);
  await h.tap('Escape');await h.waitVisible('#pause');
  // When I choose Quit to Title and confirm
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  // Then the title screen shows
  await h.waitVisible('#title');
  await h.until(()=>state==='title');
 });

 test('The on-screen buttons wait and drink on a touch screen',async(h)=>{
  const {page}=h;
  // Given a run played on a touch screen with a potion in my bag and some health lost
  await startRun(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  await h.eval(()=>{enemies.length=0;bag=1;found=1;player.hp=10;});
  // When I press the on-screen Wait a Turn button
  await h.touch(page.getByRole('button',{name:'Wait a Turn'}));
  // Then one turn passes
  await h.until(()=>turns===1);
  // And pressing the on-screen Drink Potion button raises my health
  await h.touch(page.getByRole('button',{name:'Drink Potion'}));
  await h.until(()=>player.hp===18&&bag===0);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Attack, Wait a Turn and Drink Potion, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Attack'}).waitFor();
  await list.getByRole('option',{name:'Wait a Turn'}).waitFor();
  await list.getByRole('option',{name:'Drink Potion'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','fire','wait','use_item_1','pause','back']);
 });
};
