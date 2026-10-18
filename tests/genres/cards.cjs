// Pocket Duel: start a match with keys, play a unit with arrows + Enter, attack with F, end the turn with E,
// the computer takes its turn (paused mid-turn with Esc), a mouse click plays a card, the gamepad moves the
// choice and attacks, then a win (the opponent at 1 health) and a loss (you at 1 health). The kit's checks run after.
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const myMain=()=>state==='play'&&side==='you'&&phase==='main'&&!steps.length&&!document.getElementById('hand').inert;
 // focus the first card the player can play (a unit when unitOnly), with real arrow keys
 const chooseWithKeys=async(unitOnly)=>{
  const k=await h.eval(u=>you.hand.findIndex(id=>CARDS[id].cost<=you.energy&&(!u||CARDS[id].type==='unit')),unitOnly);
  assert.ok(k>=0,'a playable card in hand');
  await h.until(()=>document.activeElement&&document.activeElement.matches('#hand .game-card'));
  let i=await h.eval(()=>+document.activeElement.dataset.i);
  while(i!==k){await h.tap(i<k?'ArrowRight':'ArrowLeft');i=await h.eval(()=>+document.activeElement.dataset.i);}
  assert.equal(await h.eval(()=>selected),k,'the focused card is the chosen one');
  return k;
 };

 // title: Enter starts a match against the computer
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play');
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.until(myMain);
 assert.equal(await h.eval(()=>document.querySelector('#hud-phase li[data-on]').dataset.phase),'main','the phase strip shows Main');
 assert.equal(await h.text('#hud-you-energy'),'Energy 1 / 1');
 assert.equal(await h.text('#hud-foe-hp'),'20');
 const handSize=await h.eval(()=>you.hand.length);
 assert.equal(await h.eval(()=>document.querySelectorAll('#hand .game-card').length),handSize,'the hand is the kit\'s CardHand');
 assert.ok(await h.text('#hand .game-card b'),'cards show their names');

 // play a 1-cost unit with arrows and Enter
 await chooseWithKeys(true);
 await h.tap('Enter');
 await h.until(()=>you.board.some(Boolean)&&you.energy===0);
 assert.equal(await h.eval(()=>you.hand.length),handSize-1);
 await h.waitVisible('#lbl-you-0');
 assert.equal(await h.text('#lbl-you-0'),await h.eval(()=>you.board[0].atk+' / '+you.board[0].hp),'the unit\'s numbers are an HTML label');
 await h.shot('played');

 // attack with F: the open lane hits the opponent
 const unitAtk=await h.eval(()=>you.board[0].atk);
 await h.tap('KeyF');
 await h.until(()=>phase==='attack');
 await h.until(a=>foe.hp===20-a&&!steps.length,unitAtk);
 await h.until(a=>document.getElementById('hud-foe-hp').textContent===String(20-a),unitAtk);
 assert.equal(await h.eval(()=>document.querySelector('#hud-phase li[data-on]').dataset.phase),'attack');

 // end the turn with E: the computer draws, plays and attacks; Esc pauses it mid-turn
 await h.tap('KeyE');
 await h.until(()=>side==='foe');
 assert.equal(await h.text('#hud-status'),'Opponent’s turn');
 assert.ok(await h.eval(()=>document.getElementById('hand').inert),'your hand is inert on their turn');
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>JSON.stringify([phase,side,foe.hand,foe.board,steps.map(s=>s.t)]));
 await h.wait(700);
 assert.equal(await h.eval(()=>JSON.stringify([phase,side,foe.hand,foe.board,steps.map(s=>s.t)])),frozen,'the computer waits while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 await h.until(()=>side==='you'&&turn===2,undefined,20000);
 assert.equal(await h.eval(()=>foe.max),1,'the computer had its turn');
 await h.until(myMain);
 await h.shot('turn2');
 // portrait (a phone): the same match fits, the hand along the bottom
 await h.page.setViewportSize({width:390,height:844});await h.wait(300);await h.shot('portrait');
 await h.page.setViewportSize({width:1000,height:700});await h.wait(300);

 // a mouse click plays a card
 const k=await h.eval(()=>you.hand.findIndex(id=>CARDS[id].cost<=you.energy&&(CARDS[id].type!=='unit'||you.board.includes(null))));
 if(k>=0){
  const before=await h.eval(()=>you.hand.length);
  await h.click(`#hand .game-card[data-i="${k}"]`);
  await h.until(n=>you.hand.length===n-1,before);
  await h.page.mouse.move(5,5);
 }

 // the gamepad: the d-pad moves the chosen card, west attacks
 await h.pad('connect');
 if(await h.eval(()=>document.querySelectorAll('#hand .game-card').length>1)){
  await h.eval(()=>document.querySelector('#hand .game-card').focus());
  await h.padTap(15);
  await h.until(()=>document.activeElement.dataset.i==='1');
 }
 await h.padTap(2);
 await h.until(()=>phase==='attack');
 await h.pad('disconnect');
 await h.until(()=>!steps.length);
 await h.tap('KeyE');await h.until(()=>side==='foe');

 // win: on your next turn the opponent is at 1 health with an open lane facing your unit (the one forced state)
 await h.until(()=>side==='you'&&turn===3,undefined,20000);await h.until(myMain);
 await h.eval(()=>{foe.hp=1;foe.board[0]=null;you.board[0]=you.board[0]||{id:'squire',atk:1,hp:2,ready:true,flash:0,lunge:0};});
 await h.tap('KeyF');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Victory');
 await h.shot('victory');

 // rematch, then lose: you at 1 health facing a computer unit, and the turn ends
 await h.tap('Enter');
 await h.until(()=>state==='play'&&turn===1);await h.until(myMain);
 await h.eval(()=>{you.hp=1;foe.board[0]={id:'giant',atk:4,hp:5,ready:true,flash:0,lunge:0};});
 await h.tap('KeyE');
 await h.waitVisible('#gameover',20000);
 assert.equal(await h.text('#go-title'),'Defeat');
 await h.shot('defeat');
 await h.click('#gameover .game-menu li:last-child .game-btn');
 await h.waitVisible('#title');
};
