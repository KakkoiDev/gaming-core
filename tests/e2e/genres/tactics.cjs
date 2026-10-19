// Grid Oath (starters/genres/tactics/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const cur=(h)=>h.eval(()=>({x:cursor.x,y:cursor.y}));
 // arrow keys, one tap per step (y is up)
 async function moveTo(h,x,y){
  for(let n=0;n<30;n++){
   const c=await cur(h);if(c.x===x&&c.y===y)return;
   await h.tap(c.x!==x?(c.x<x?'ArrowRight':'ArrowLeft'):(c.y<y?'ArrowUp':'ArrowDown'));
  }
  h.assert.deepEqual(await cur(h),{x,y},'cursor reached the tile');
 }
 async function startBattle(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&phase==='player'&&mode==='idle');
 }
 const knight=(h)=>h.eval(()=>{const k=units.find(u=>u.cls==='knight');return k&&{x:k.x,y:k.y,acted:k.acted};});
 async function knightMovedRight(h){
  await startBattle(h);
  await h.tap('Enter');await h.until(()=>mode==='move'&&selected.cls==='knight');
  await moveTo(h,4,3);
  await h.tap('Enter');await h.waitVisible('#actions');
 }
 // the confirm dialog's End Turn
 async function confirmEndTurn(h){
  await h.waitVisible('#confirm');
  await h.page.getByRole('alertdialog').getByRole('button',{name:'End Turn'}).click();
 }
 // select the Knight where it stands and attack whoever is in range
 async function knightAttacks(h){
  await h.tap('Enter');await h.until(()=>mode==='move'&&selected.cls==='knight');
  await h.tap('Enter');await h.waitVisible('#actions');
  await h.page.getByRole('button',{name:'Attack'}).click();
  await h.until(()=>mode==='target');
 }
 async function defeat(h){
  await startBattle(h);
  await h.eval(()=>{
   const b=units.find(u=>u.team==='blue'),r=units.find(u=>u.team==='red'&&u.cls==='brute');
   units=units.filter(u=>u.team==='red'||u===b);
   b.hp=1;b.x=r.x-1;b.y=r.y;b.draw=cellPos(b.x,b.y);
  });
  await h.tap('KeyE');await confirmEndTurn(h);
  await h.waitVisible('#gameover');
 }

 test('New Game starts the battle on the first unit',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with New Game focused
  await h.waitVisible('#title');
  assert.equal(await h.focused(),'title-start');
  // When I choose New Game
  await page.getByRole('button',{name:'New Game'}).press('Enter');
  // Then the battle starts with the cursor on the Knight and the select tutorial showing
  await h.until(()=>state==='play'&&mode==='idle');
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  assert.deepEqual(await cur(h),{x:1,y:3});
  // And the unit card reads "Knight" and "HP 14 / 14"
  await h.until(()=>document.getElementById('hud-unit-name').textContent==='Knight'&&document.getElementById('hud-hp-text').textContent==='HP 14 / 14');
 });

 test('The gamepad d-pad steps the cursor',async(h)=>{
  // Given a battle on the Knight
  await startBattle(h);
  // When I plug a gamepad and press right, then left, on the d-pad
  await h.pad('connect');
  await h.padTap(15);
  // Then the cursor steps one tile right and back
  await h.until(()=>cursor.x===2&&cursor.y===3);
  await h.padTap(14);await h.until(()=>cursor.x===1&&cursor.y===3);
  await h.pad('disconnect');
 });

 test('Moving a unit opens the action menu and Back undoes the move',async(h)=>{
  const {assert}=h;
  // Given a battle on the Knight
  await startBattle(h);
  // When I select the Knight and move it three tiles right with the arrow keys
  await h.tap('Enter');
  await h.until(()=>mode==='move'&&selected&&selected.cls==='knight');
  assert.ok(await h.eval(()=>reach.some(c=>c.x===4&&c.y===3)),'(4,3) is reachable');
  await moveTo(h,4,3);
  await h.shot('move');
  await h.tap('Enter');
  // Then the action menu opens with Attack disabled and Wait focused
  await h.waitVisible('#actions');
  assert.equal(await h.eval(()=>mode),'menu');
  assert.ok(await h.eval(()=>document.getElementById('act-attack').disabled),'Attack disabled with nobody in range');
  assert.equal(await h.focused(),'act-wait');
  // And the HUD stays in view beside the menu
  assert.ok(await h.visible('#hud-turn'));
  // And Esc puts the Knight back where it stood
  await h.tap('Escape');
  await h.until(()=>mode==='move'&&selected.x===1&&selected.y===3&&!document.getElementById('actions'));
 });

 test("Wait ends a unit's turn where it stands",async(h)=>{
  const {page,assert}=h;
  // Given the Knight moved three tiles right with the action menu open
  await knightMovedRight(h);
  // When I choose Wait
  await page.getByRole('button',{name:'Wait'}).click();
  // Then the Knight has acted and stays on its new tile
  await h.until(()=>mode==='idle'&&units.find(u=>u.cls==='knight').acted);
  assert.deepEqual(await knight(h),{x:4,y:3,acted:true});
 });

 test('The mouse hovers, chooses and cancels a unit',async(h)=>{
  const {page}=h;
  // Given a battle in the Player Phase
  await startBattle(h);
  // When I hover the Archer, click it, then right click
  const archer=await h.eval(()=>{const a=units.find(u=>u.cls==='archer');return {x:a.x,y:a.y};});
  const at=await h.eval(a=>{const p=cellPos(a.x,a.y);return {x:p.x,y:p.y};},archer);
  const p=await h.screen(at.x,at.y);
  await page.mouse.move(p.x-20,p.y-5);await page.mouse.move(p.x,p.y,{steps:4});
  // Then the cursor follows the mouse, the Archer is chosen, and the right click cancels it
  await h.until(a=>cursor.x===a.x&&cursor.y===a.y,archer);
  await page.mouse.click(p.x,p.y);
  await h.until(()=>mode==='move'&&selected.cls==='archer');
  await page.mouse.click(p.x,p.y,{button:'right'});
  await h.until(()=>mode==='idle'&&!selected);
 });

 test('End Turn asks first, then the enemies move and turn 2 begins',async(h)=>{
  const {assert}=h;
  // Given a battle where no unit has acted
  await startBattle(h);
  const before=await h.eval(()=>units.filter(u=>u.team==='red').map(u=>u.x+','+u.y).join(' '));
  // When I press E
  await h.tap('KeyE');
  // Then a confirm dialog opens with Cancel focused
  await h.waitVisible('#confirm');
  assert.equal(await h.focused(),'confirm-cancel');
  // And confirming End Turn runs the Enemy Phase, the enemies move, and turn 2 begins
  await confirmEndTurn(h);
  await h.until(()=>phase==='enemy');
  await h.until(()=>state==='play'&&phase==='player'&&turn===2&&!menuOpen());
  assert.notEqual(await h.eval(()=>units.filter(u=>u.team==='red').map(u=>u.x+','+u.y).join(' ')),before,'the enemies moved');
 });

 test('An attack shows the forecast and the enemy loses HP',async(h)=>{
  const {assert}=h;
  // Given a Brute standing beside the Knight
  await startBattle(h);
  const brute=await h.eval(()=>{const r=units.find(u=>u.cls==='brute');r.x=2;r.y=3;r.draw=cellPos(2,3);return units.indexOf(r);});
  // When I select the Knight, stay, and choose Attack
  await knightAttacks(h);
  // Then the forecast shows "Hit 100%"
  await h.until(()=>document.getElementById('hud-info-text').textContent.includes('Hit 100%'));
  await h.shot('forecast');
  // And confirming the target takes HP from the Brute
  await h.tap('Enter');
  await h.until(()=>mode==='idle');
  assert.equal(await h.eval(i=>units[i].hp,brute),5,'the Brute lost the Knight\'s attack');
 });

 test('Defeating the last enemy shows Victory and Try Again starts over',async(h)=>{
  const {page,assert}=h;
  // Given the last enemy at 1 HP beside the Knight
  await startBattle(h);
  await h.eval(()=>{const r=units.find(u=>u.team==='red');units=units.filter(u=>u.team==='blue'||u===r);r.hp=1;r.x=2;r.y=3;r.draw=cellPos(2,3);});
  // When the Knight attacks it
  await knightAttacks(h);
  await h.tap('Enter');
  // Then the results read "Victory" with stars
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Victory');
  assert.ok(await h.visible('#results .game-stars'));
  await h.shot('victory');
  // And Try Again starts a new battle on turn 1 with six units
  await page.getByRole('button',{name:'Try Again'}).click();
  await h.until(()=>state==='play'&&turn===1&&units.length===6);
 });

 test('Esc pauses the battle and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given a battle with nothing chosen
  await startBattle(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the battle clock stops
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>battleTime);await h.ticks(12);
  assert.equal(await h.eval(()=>battleTime),frozen,'the battle stops while paused');
  // And Esc again resumes the battle
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  await h.until(f=>battleTime>f,frozen);
 });

 test('Losing every unit shows Defeat, then the title',async(h)=>{
  const {page,assert}=h;
  // Given my last unit at 1 HP beside a Brute
  // When I end the turn and the Enemy Phase runs
  await defeat(h);
  // Then Game Over reads "Defeat"
  assert.equal(await h.text('#go-title'),'Defeat');
  await h.shot('defeat');
  // And Back to Title shows the title screen
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 });

 test('Try Again after a defeat starts a new battle',async(h)=>{
  const {page}=h;
  // Given Game Over after my last unit fell
  await defeat(h);
  // When I choose Try Again
  await page.getByRole('button',{name:'Try Again'}).click();
  // Then a new battle starts on turn 1 with six units
  await h.until(()=>state==='play'&&turn===1&&units.length===6);
 });

 test('The on-screen buttons pick the next unit, cancel and end the turn on a touch screen',async(h)=>{
  const {page,assert}=h;
  // Given a battle played on a touch screen
  await startBattle(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  // When I press the on-screen Next Unit button
  await h.touch(page.getByRole('button',{name:'Next Unit'}));
  // Then the cursor moves to the next unit that has not acted
  await h.until(()=>cursor.x===0&&cursor.y===5);
  // And with a unit chosen, the on-screen Back button cancels it
  await h.eval(()=>choose(unitAt(cursor.x,cursor.y)));
  await h.touch(page.getByRole('button',{name:'Back',exact:true}));
  await h.until(()=>mode==='idle'&&!selected);
  // And the on-screen End Turn button asks first, and Cancel keeps the turn
  await h.touch(page.locator('#touch').getByRole('button',{name:'End Turn'}));
  await h.waitVisible('#confirm');
  await page.getByRole('button',{name:'Cancel'}).click();
  await h.waitHidden('#confirm');
  assert.equal(await h.eval(()=>phase),'player');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Select / Confirm, End Turn and Next Unit, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Select / Confirm'}).waitFor();
  await list.getByRole('option',{name:'End Turn'}).waitFor();
  await list.getByRole('option',{name:'Next Unit'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','confirm','end_turn','next_unit','pause','back']);
 });
};
