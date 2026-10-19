// Pocket Duel (starters/genres/cards/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const myMain=()=>state==='play'&&side==='you'&&phase==='main'&&!steps.length&&!document.getElementById('hand').inert;
 async function startMatch(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play');
  await h.until(myMain);
 }

 test('Play vs Computer starts a match on my turn',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Play vs Computer focused
  await h.waitVisible('#title');
  const play=page.getByRole('button',{name:'Play vs Computer'});
  assert.ok(await play.evaluate(e=>e===document.activeElement),'Play vs Computer is focused');
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play');
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  // Then the match starts on my Main phase with 1 / 1 energy and the opponent at 20 health
  await h.until(myMain);
  assert.equal(await h.eval(()=>document.querySelector('#hud-phase li[data-on]').dataset.phase),'main','the phase strip shows Main');
  await h.until(()=>document.getElementById('hud-you-energy').textContent==='Energy 1 / 1');
  assert.equal(await h.text('#hud-foe-hp'),'20');
  // And my hand is shown as cards with their names
  const hand=page.getByRole('listbox');
  await hand.waitFor();
  const size=await h.eval(()=>you.hand.length);
  assert.equal(await hand.locator('.game-card').count(),size,'one card per card in hand');
  assert.ok(await h.text('#hand .game-card b'),'cards show their names');
 });

 test('Arrow keys choose a card and Enter plays it',async(h)=>{
  const {assert}=h;
  // Given my first turn of a match
  await startMatch(h);
  const size=await h.eval(()=>you.hand.length);
  // When I choose a 1-cost unit with the arrow keys and press Enter
  const k=await h.eval(()=>you.hand.findIndex(id=>CARDS[id].cost<=you.energy&&CARDS[id].type==='unit'));
  assert.ok(k>=0,'a playable unit in hand');
  await h.until(()=>document.activeElement&&document.activeElement.matches('#hand .game-card'));
  let i=await h.eval(()=>+document.activeElement.dataset.i);
  while(i!==k){await h.tap(i<k?'ArrowRight':'ArrowLeft');i=await h.eval(()=>+document.activeElement.dataset.i);}
  assert.equal(await h.eval(()=>selected),k,'the focused card is the chosen one');
  await h.tap('Enter');
  // Then the unit stands on my board and my hand has one card less
  await h.until(()=>you.board.some(Boolean)&&you.energy===0);
  assert.equal(await h.eval(()=>you.hand.length),size-1);
  // And the unit's attack and health are shown over it
  await h.waitVisible('#lbl-you-0');
  assert.equal(await h.text('#lbl-you-0'),await h.eval(()=>you.board[0].atk+' / '+you.board[0].hp));
  await h.shot('played');
 });

 test('F attacks and an open lane hits the opponent',async(h)=>{
  const {assert}=h;
  // Given a unit of mine on the board
  await startMatch(h);
  await h.eval(()=>{you.board[0]={id:'knight',atk:2,hp:3,ready:true,flash:0,lunge:0};});
  // When I press F
  await h.tap('KeyF');
  // Then the Attack phase starts
  await h.until(()=>phase==='attack');
  assert.equal(await h.eval(()=>document.querySelector('#hud-phase li[data-on]').dataset.phase),'attack');
  // And the opponent loses health equal to my unit's attack, as the HUD shows
  await h.until(()=>foe.hp===18&&!steps.length);
  await h.until(()=>document.getElementById('hud-foe-hp').textContent==='18');
 });

 test('The computer takes its turn and waits while paused',async(h)=>{
  const {assert}=h;
  // Given my first turn of a match
  await startMatch(h);
  // When I press E to end my turn
  await h.tap('KeyE');
  // Then it is the opponent's turn and my hand cannot be used
  await h.until(()=>side==='foe');
  await h.until(()=>document.getElementById('hud-status').textContent==='Opponent’s turn');
  assert.ok(await h.eval(()=>document.getElementById('hand').inert),'your hand is inert on their turn');
  // And while the game is paused with Esc nothing the computer does moves on
  await h.tap('Escape');await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const snapshot=()=>JSON.stringify([phase,side,foe.hand,foe.board,steps.map(s=>s.t)]);
  const frozen=await h.eval(snapshot);
  await h.ticks(12);
  assert.equal(await h.eval(snapshot),frozen,'the computer waits while paused');
  // And after Esc it plays and hands the turn back to me for turn 2
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  await h.until(()=>side==='you'&&turn===2,undefined,20000);
  assert.equal(await h.eval(()=>foe.max),1,'the computer had its turn');
  await h.until(myMain);
  await h.shot('turn2');
 });

 test('The mouse plays a card and the on-screen buttons attack and end the turn',async(h)=>{
  const {page}=h;
  // Given my first turn of a match
  await startMatch(h);
  const size=await h.eval(()=>you.hand.length);
  // When I click the Squire in my hand
  await page.getByRole('option',{name:'Squire Unit'}).first().click();
  // Then it is played
  await h.until(n=>you.hand.length===n-1&&you.board[0]?.id==='squire',size);
  await page.mouse.move(5,5);
  // And the Attack button starts the Attack phase
  await page.getByRole('button',{name:'Attack'}).click();
  await h.until(()=>phase==='attack');
  await h.until(()=>!steps.length);
  // And the End Turn button hands the turn to the opponent
  await page.getByRole('button',{name:'End Turn'}).click();
  await h.until(()=>side==='foe');
 });

 test('The gamepad d-pad chooses a card and the west button attacks',async(h)=>{
  // Given my first turn of a match and a gamepad
  await startMatch(h);
  await h.pad('connect');
  await h.eval(()=>document.querySelector('#hand .game-card').focus());
  // When I press right on the d-pad
  await h.padTap(15);
  // Then the next card is chosen
  await h.until(()=>document.activeElement.dataset.i==='1'&&selected===1);
  // And the west button starts the Attack phase
  await h.padTap(2);
  await h.until(()=>phase==='attack');
  await h.pad('disconnect');
 });

 test('Every kind of card does what its text says',async(h)=>{
  const {page,assert}=h;
  // Given my turn with 10 energy, 10 health, a Knight facing me and one card of each kind in hand
  await startMatch(h);
  await h.eval(()=>{you.energy=you.max=10;you.hp=10;you.hand=['squire','knight','archer','giant','spark','heal'];
   foe.board[0]={id:'knight',atk:2,hp:3,ready:true,flash:0,lunge:0};});
  await h.until(()=>document.querySelectorAll('#hand .game-card:not([aria-disabled])').length===6);
  // When I click Squire, Knight, Archer and Giant
  await page.getByRole('option',{name:'Squire Unit'}).click();
  await h.until(()=>you.board[0]?.id==='squire');
  await page.getByRole('option',{name:'Knight Unit'}).click();
  await h.until(()=>you.board[1]?.id==='knight');
  await page.getByRole('option',{name:'Archer Unit'}).click();
  await h.until(()=>you.board[2]?.id==='archer');
  await page.getByRole('option',{name:'Giant Unit'}).click();
  // Then each stands on my board
  await h.until(()=>you.board.map(u=>u&&u.id).join()==='squire,knight,archer,giant');
  assert.equal(await h.eval(()=>you.energy),1,'1 + 2 + 2 + 4 energy spent');
  // And Spark destroys the opponent's Knight
  await page.getByRole('option',{name:'Spark Deal'}).click();
  await h.until(()=>foe.board[0]===null&&foe.discard.includes('knight'));
  // And Heal brings my health to 14
  await h.eval(()=>{you.energy=2;});
  await page.getByRole('option',{name:'Heal Restore'}).click();
  await h.until(()=>you.hp===14&&!you.hand.length);
  await h.until(()=>document.getElementById('hud-you-hp').textContent==='14');
 });

 test('Bringing the opponent to 0 health wins and Rematch starts again',async(h)=>{
  const {page,assert}=h;
  // Given the opponent at 1 health with an open lane facing my unit
  await startMatch(h);
  await h.eval(()=>{foe.hp=1;foe.board[0]=null;you.board[0]={id:'squire',atk:1,hp:2,ready:true,flash:0,lunge:0};});
  // When I press F
  await h.tap('KeyF');
  // Then the results read "Victory"
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Victory');
  await h.shot('victory');
  // And Rematch starts a new match on turn 1
  await page.getByRole('button',{name:'Rematch'}).click();
  await h.until(()=>state==='play'&&turn===1&&foe.hp===20);
  await h.until(myMain);
 });

 test('Losing my last health is a defeat and Back to Title leaves',async(h)=>{
  const {page,assert}=h;
  // Given I am at 1 health facing a computer Giant
  await startMatch(h);
  await h.eval(()=>{you.hp=1;foe.board[0]={id:'giant',atk:4,hp:5,ready:true,flash:0,lunge:0};});
  // When I end my turn
  await h.tap('KeyE');
  // Then the game over screen reads "Defeat"
  await h.waitVisible('#gameover',20000);
  assert.equal(await h.text('#go-title'),'Defeat');
  await h.shot('defeat');
  // And Back to Title shows the title screen
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
  await h.until(()=>state==='title');
 });

 test('The match fits a phone held upright',async(h)=>{
  const {page,assert}=h;
  // Given my first turn of a match
  await startMatch(h);
  // When the window becomes a 390 by 844 portrait phone
  await page.setViewportSize({width:390,height:844});
  await h.until(()=>innerWidth===390);
  await h.ticks(2);
  // Then the whole hand and the buttons fit on the screen
  const inside=()=>[...document.querySelectorAll('#hand .game-card, #hud-attack, #hud-end')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;});
  await h.until(inside);
  assert.ok(await h.eval(inside));
  await h.shot('portrait');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Attack and End Turn, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Attack'}).waitFor();
  await list.getByRole('option',{name:'End Turn'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','fire','end_turn','pause','back']);
 });
};
