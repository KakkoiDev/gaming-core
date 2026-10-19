// Garden Guard (starters/genres/towerdefence/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 async function startGame(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&towers.length===0&&gold===120);
 }
 const cur=(h)=>h.eval(()=>({x:cursor.x,y:cursor.y}));
 async function goTo(h,x,y){
  for(let i=0;i<20;i++){
   const c=await cur(h);if(c.x===x&&c.y===y)return;
   await h.tap(c.x<x?'ArrowRight':c.x>x?'ArrowLeft':c.y<y?'ArrowUp':'ArrowDown');
  }
  h.assert.deepEqual(await cur(h),{x,y},'cursor reached the cell');
 }
 // towers of a kind put down on grass cells, only to arrange a Given
 const build=(h,kind,cells)=>h.eval(([kind,cells])=>{for(const [x,y] of cells)towers.push({cell:vec2(x,y),kind:TOWERS.find(k=>k.id===kind),cooldown:0});},[kind,cells]);
 const enemyPositions=(h)=>h.eval(()=>enemies.map(e=>e.pos.x+','+e.pos.y).join());

 test('New Game opens the garden with the HUD and nothing placed',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with New Game focused
  await h.waitVisible('#title');
  assert.equal(await h.focused(),'title-start');
  // When I choose New Game
  await page.getByRole('button',{name:'New Game'}).click();
  await h.until(()=>state==='play');
  // Then the HUD and the place tutorial show
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  // And no tower is placed and I have 120 gold
  await h.ticks(4);
  assert.equal(await h.eval(()=>towers.length),0);
  assert.equal(await h.eval(()=>gold),120);
 });

 test('The arrow keys step the cursor and Space places a Bolt',async(h)=>{
  const {assert}=h;
  // Given a new game started with Enter, the cursor on (5,5)
  await startGame(h);
  assert.deepEqual(await cur(h),{x:5,y:5});
  assert.equal(await h.eval(()=>towers.length),0,'the Enter that started the game places nothing');
  // When I press down twice and then Space
  await h.tap('ArrowDown');await h.tap('ArrowDown');
  // Then the cursor is on (5,3)
  assert.deepEqual(await cur(h),{x:5,y:3});
  await h.tap('Space');
  // And a Bolt stands there and my gold drops to 70
  await h.until(()=>towers.length===1&&gold===70);
  assert.equal(await h.eval(()=>towerAt(vec2(5,3))?.kind.id),'bolt');
 });

 test('The HUD explains a placement it refuses',async(h)=>{
  const {assert}=h;
  // Given a new game with a Bolt placed on (5,3)
  await startGame(h);
  await goTo(h,5,3);await h.tap('Space');await h.until(()=>towers.length===1&&gold===70);
  // When I press Space on the path
  await h.tap('ArrowLeft');await h.tap('Space');
  // Then the HUD reads "Not on the path"
  await h.until(()=>document.getElementById('hud-message').textContent==='Not on the path');
  // And after I pick the Cannon with 2, Space on grass reads "Not enough gold" and nothing is placed
  await h.tap('ArrowRight');await h.tap('ArrowUp');await h.tap('Digit2');
  assert.equal(await h.eval(()=>TOWERS[selected].id),'cannon');
  await h.tap('Space');
  await h.until(()=>document.getElementById('hud-message').textContent==='Not enough gold');
  assert.equal(await h.eval(()=>towers.length),1);
 });

 test('The mouse places a tower where it points',async(h)=>{
  const {page,assert}=h;
  // Given a new game
  await startGame(h);
  // When I point at cell (10,6) and click
  const p=await h.eval(()=>{const q=cellPos(vec2(10,6));return {x:q.x,y:q.y};});
  const s=await h.screen(p.x,p.y);
  await page.mouse.move(s.x-20,s.y);await page.mouse.move(s.x,s.y);
  await h.until(()=>cursor.x===10&&cursor.y===6);
  await page.mouse.down();await h.ticks(4);await page.mouse.up();
  // Then a Bolt stands on (10,6) and my gold drops to 70
  await h.until(()=>towers.length===1&&gold===70);
  assert.equal(await h.eval(()=>towerAt(vec2(10,6))?.kind.id),'bolt');
 });

 test('The gamepad steps the cursor and the shoulders cycle the towers',async(h)=>{
  // Given a new game
  await startGame(h);
  // When I plug a gamepad and press left on the d-pad
  await h.pad('connect');
  await h.padTap(14);
  // Then the cursor steps one cell left
  await h.until(()=>cursor.x===4&&cursor.y===5);
  // And the right shoulder picks the next tower, the left shoulder the previous one
  await h.padTap(5);await h.until(()=>selected===1);
  await h.padTap(4);await h.until(()=>selected===0);
  await h.pad('disconnect');
 });

 test('Q and E cycle the towers',async(h)=>{
  const {assert}=h;
  // Given a new game with the Bolt picked
  await startGame(h);
  assert.equal(await h.eval(()=>selected),0);
  // When I press E, then Q
  await h.tap('KeyE');
  // Then the Cannon is picked, then the Bolt again
  await h.until(()=>TOWERS[selected].id==='cannon');
  await h.until(()=>document.getElementById('hud-tower-1').getAttribute('aria-current')==='true');
  await h.tap('KeyQ');
  await h.until(()=>TOWERS[selected].id==='bolt');
 });

 test('Starting a wave sends enemies the towers stop for gold',async(h)=>{
  const {assert}=h;
  // Given a new game with two Cannons beside the path
  await startGame(h);
  await build(h,'cannon',[[2,6],[3,8]]);
  // When I press N
  await h.tap('KeyN');
  // Then wave 1 starts, the HUD reads "Wave 1 / 5" and enemies walk the path
  await h.until(()=>waveActive&&wave===1&&enemies.length>0);
  await h.until(()=>document.getElementById('hud-wave').textContent==='Wave 1 / 5');
  // And the towers stop enemies and my gold rises
  await h.until(()=>kills>=2&&gold>120,null,20000);
  await h.shot('wave');
 });

 test('Esc stops the enemies and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given enemies walking the path in wave 1
  await startGame(h);
  await h.tap('KeyN');
  await h.until(()=>waveActive&&enemies.length>0);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the enemies stop
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await enemyPositions(h);await h.ticks(12);
  assert.equal(await enemyPositions(h),frozen,'enemies stop while paused');
  // And Esc again resumes the wave
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  await h.until(f=>enemies.map(e=>e.pos.x+','+e.pos.y).join()!==f,frozen);
 });

 test('A finished wave pays gold that buys another tower',async(h)=>{
  const {assert}=h;
  // Given wave 1 running with towers beside the path
  await startGame(h);
  await build(h,'cannon',[[2,6],[3,8],[5,5]]);
  await h.eval(()=>{gold=0;});
  await h.tap('KeyN');
  await h.until(()=>waveActive&&wave===1);
  // When the last enemy of the wave is stopped
  await h.until(()=>!waveActive,null,40000);
  // Then the wave bonus is paid
  assert.equal(await h.eval(()=>gold),await h.eval(()=>kills*KILL_GOLD+WAVE_GOLD));
  assert.ok(await h.eval(()=>gold>=50),'enough gold for a Bolt');
  // And Space places another Bolt with that gold
  await goTo(h,8,3);
  await h.tap('Space');
  await h.until(()=>towers.length===4&&towerAt(vec2(8,3))?.kind.id==='bolt');
 });

 test('Surviving the last wave saves the garden',async(h)=>{
  const {page,assert}=h;
  // Given the last wave about to start with strong towers at the entrance
  await startGame(h);
  await build(h,'cannon',[[0,6],[1,6],[2,6],[3,6],[0,8],[1,8],[2,8],[3,8]]);
  await h.eval(()=>{wave=WAVES-1;});
  // When I press N and the wave is survived
  await h.tap('KeyN');
  await h.until(()=>wave===WAVES&&waveActive);
  await h.waitVisible('#results',60000);
  // Then the results read "Garden Saved" with stars by the lives left
  assert.equal(await h.text('#res-title'),'Garden Saved');
  const stars=await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon:not([data-off])').length);
  assert.ok(stars>=1&&stars<=3,'stars by lives');
  assert.equal(stars,await h.eval(()=>lives>=START_LIVES-2?3:lives>=START_LIVES/2?2:1));
  await h.shot('results');
  // And Back to Title shows the title screen
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 });

 test('Losing the last life is a defeat and Try Again starts over',async(h)=>{
  const {page,assert}=h;
  // Given a new game with one life left
  await startGame(h);
  await h.eval(()=>{lives=1;});
  // When I press N and the first enemy walks through the garden
  await h.tap('KeyN');
  await h.until(()=>waveActive);
  // Then Game Over reads "Defeat" and "The garden fell on wave 1"
  await h.waitVisible('#gameover',30000);
  assert.equal(await h.text('#go-title'),'Defeat');
  assert.equal(await h.text('#go-detail'),'The garden fell on wave 1');
  await h.shot('gameover');
  // And Try Again starts a new game with 120 gold and no towers
  await page.getByRole('button',{name:'Try Again'}).click();
  await h.until(()=>state==='play'&&gold===120&&towers.length===0&&wave===0);
 });

 test('The on-screen buttons pick a tower and start the wave on a touch screen',async(h)=>{
  const {page}=h;
  // Given a new game played on a touch screen
  await startGame(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  // When I press the on-screen Next Tower button
  await h.touch(page.getByRole('button',{name:'Next Tower'}));
  // Then the Cannon is picked
  await h.until(()=>TOWERS[selected].id==='cannon');
  // And the on-screen Start Wave button starts wave 1
  await h.touch(page.getByRole('button',{name:'Start Wave'}));
  await h.until(()=>waveActive&&wave===1);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Place Tower, Start Wave, Next Tower, Previous Tower, Tower 1, Tower 2 and Tower 3, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Place Tower'}).waitFor();
  await list.getByRole('option',{name:'Start Wave'}).waitFor();
  await list.getByRole('option',{name:'Next Tower'}).waitFor();
  await list.getByRole('option',{name:'Previous Tower'}).waitFor();
  await list.getByRole('option',{name:'Tower 1'}).waitFor();
  await list.getByRole('option',{name:'Tower 2'}).waitFor();
  await list.getByRole('option',{name:'Tower 3'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),
   ['move','fire','start_wave','tower_next','tower_prev','tower1','tower2','tower3','pause','back']);
 });
};
