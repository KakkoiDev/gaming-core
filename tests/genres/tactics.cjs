// Grid Oath (tactics): select a unit with keys, move, undo, wait; the mouse hovers, selects and cancels; the gamepad's
// d-pad moves the cursor; End Turn asks first, the enemy phase runs; a real attack with the forecast; a win (the last
// enemy at 1 HP beside a unit, forced once) into the results; pause freezes the battle; a loss (forced once) into
// Game Over, then the title. The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const cur=()=>h.eval(()=>({x:cursor.x,y:cursor.y}));
 // arrow keys, one tap per step (y is up)
 const moveTo=async(x,y)=>{
  for(let n=0;n<30;n++){
   const c=await cur();if(c.x===x&&c.y===y)return;
   await h.tap(c.x!==x?(c.x<x?'ArrowRight':'ArrowLeft'):(c.y<y?'ArrowUp':'ArrowDown'));
  }
  assert.deepEqual(await cur(),{x,y},'cursor reached the tile');
 };
 const toPlayerPhase=()=>h.until(()=>state==='play'&&phase==='player'&&!menuOpen(),null,15000);

 // title: Enter starts the battle on the first unit
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&mode==='idle');
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 assert.deepEqual(await cur(),{x:1,y:3});
 assert.equal(await h.text('#hud-unit-name'),'Knight','the unit card shows the unit under the cursor');
 assert.equal(await h.text('#hud-hp-text'),'HP 14 / 14');

 // gamepad: the d-pad steps the cursor
 await h.pad('connect');
 await h.padTap(15);await h.until(()=>cursor.x===2&&cursor.y===3);
 await h.padTap(14);await h.until(()=>cursor.x===1&&cursor.y===3);
 await h.pad('disconnect');

 // keys: select the Knight, blue tiles, move three right, the action menu (Attack disabled, no one in range)
 await h.tap('Enter');
 await h.until(()=>mode==='move'&&selected&&selected.cls==='knight');
 assert.ok(await h.eval(()=>reach.some(c=>c.x===4&&c.y===3)),'(4,3) is reachable');
 await moveTo(4,3);
 await h.shot('move');
 await h.tap('Enter');
 await h.waitVisible('#actions');
 assert.equal(await h.eval(()=>mode),'menu');
 assert.ok(await h.eval(()=>document.getElementById('act-attack').disabled),'Attack disabled with nobody in range');
 assert.equal(await h.focused(),'act-wait');
 assert.ok(await h.visible('#hud-turn'),'the HUD stays beside the action menu');
 // back undoes the move
 await h.tap('Escape');
 await h.until(()=>mode==='move'&&selected.x===1&&selected.y===3&&!document.getElementById('actions'));
 await moveTo(4,3);await h.tap('Enter');await h.waitVisible('#actions');
 await h.tap('Enter'); // Wait
 await h.until(()=>mode==='idle'&&units.find(u=>u.cls==='knight').acted);
 assert.deepEqual(await h.eval(()=>{const k=units.find(u=>u.cls==='knight');return [k.x,k.y];}),[4,3]);

 // mouse: hover the Archer, click to choose it, right click to cancel
 const archer=await h.eval(()=>{const a=units.find(u=>u.cls==='archer');return {x:a.x,y:a.y};});
 const archerAt=await h.eval(a=>{const p=cellPos(a.x,a.y);return {x:p.x,y:p.y};},archer);
 const p=await h.screen(archerAt.x,archerAt.y);
 await h.page.mouse.move(p.x-20,p.y-5);await h.page.mouse.move(p.x,p.y,{steps:4});
 await h.until(a=>cursor.x===a.x&&cursor.y===a.y,archer);
 await h.page.mouse.click(p.x,p.y);
 await h.until(()=>mode==='move'&&selected.cls==='archer');
 await h.page.mouse.click(p.x,p.y,{button:'right'});
 await h.until(()=>mode==='idle'&&!selected);

 // End Turn with units left asks first; the enemy phase runs and turn 2 begins
 await h.tap('KeyE');
 await h.waitVisible('#confirm');
 assert.equal(await h.focused(),'confirm-cancel');
 await h.click('#confirm-ok');
 await h.until(()=>phase==='enemy');
 const before=await h.eval(()=>units.filter(u=>u.team==='red').map(u=>u.x+','+u.y).join(' '));
 await toPlayerPhase();
 assert.equal(await h.eval(()=>turn),2);
 assert.notEqual(await h.eval(()=>units.filter(u=>u.team==='red').map(u=>u.x+','+u.y).join(' ')),before,'the enemies moved');

 // a real attack: find a unit that can reach an enemy, walk the cursor there with keys, Attack, confirm with the forecast
 let attacked=false;
 for(let tries=0;tries<5&&!attacked;tries++){
  await toPlayerPhase();
  const plan=await h.eval(()=>{
   for(const u of units.filter(u=>u.team==='blue'&&!u.acted))
    for(const c of reachable(u))for(const foe of units.filter(f=>f.team==='red'))
     if(inRange(u,c,foe))return {ux:u.x,uy:u.y,cx:c.x,cy:c.y};
   return null;
  });
  if(!plan){await h.tap('KeyE');await h.waitVisible('#confirm');await h.click('#confirm-ok');await h.until(()=>phase==='enemy'||state!=='play');continue;}
  await moveTo(plan.ux,plan.uy);await h.tap('Enter');await h.until(()=>mode==='move');
  await moveTo(plan.cx,plan.cy);await h.tap('Enter');await h.waitVisible('#actions');
  assert.equal(await h.focused(),'act-attack','Attack is first when an enemy is in range');
  await h.tap('Enter');
  await h.until(()=>mode==='target');
  assert.ok((await h.text('#hud-info-text')).includes('Hit 100%'),'the forecast shows the real hit chance');
  await h.shot('forecast');
  const foe=await h.eval(()=>{const f=unitAt(cursor.x,cursor.y);return {i:units.indexOf(f),hp:f.hp,dmg:selected.atk};});
  await h.tap('Enter');
  await h.until(f=>mode==='idle'||state!=='play',foe);
  const hpNow=await h.eval(f=>{const u=units[f.i];return u&&u.team==='red'?u.hp:0;},foe);
  assert.ok(hpNow<foe.hp,'the enemy lost HP');
  attacked=true;
 }
 assert.ok(attacked,'attacked an enemy');

 // win: forced once, the last enemy at 1 HP beside a unit that has not acted
 await toPlayerPhase();
 const ready=await h.eval(()=>{
  const reds=units.filter(u=>u.team==='red');
  units=units.filter(u=>u.team==='blue'||u===reds[0]);
  for(const u of units)u.acted=false;
  const b=units.find(u=>u.team==='blue'),r=reds[0];
  r.hp=1;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=b.x+dx,y=b.y+dy;
   if(inside(x,y)&&terrainAt(x,y).cost&&!unitAt(x,y)){r.x=x;r.y=y;r.draw=cellPos(x,y);break;}}
  return {x:b.x,y:b.y};
 });
 await moveTo(ready.x,ready.y);
 await h.tap('Enter');await h.until(()=>mode==='move');
 await h.tap('Enter'); // stay on the tile
 await h.waitVisible('#actions');await h.tap('Enter'); // Attack
 await h.until(()=>mode==='target');await h.tap('Enter');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Victory');
 assert.ok(await h.visible('#results .game-stars'));
 await h.shot('victory');
 await h.click('#res-retry');
 await h.until(()=>state==='play'&&turn===1&&units.length===6);

 // pause: Esc with nothing chosen opens the pause menu and freezes the battle
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>battleTime);await h.wait(250);
 assert.equal(await h.eval(()=>battleTime),frozen,'the battle stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // lose: forced once, one unit left at 1 HP beside a Brute; End Turn and the enemy phase finishes it
 await h.eval(()=>{
  const b=units.find(u=>u.team==='blue'),r=units.find(u=>u.team==='red'&&u.cls==='brute');
  units=units.filter(u=>u.team==='red'||u===b);
  b.hp=1;b.x=r.x-1;b.y=r.y;b.draw=cellPos(b.x,b.y);
 });
 await h.tap('KeyE');await h.waitVisible('#confirm');await h.click('#confirm-ok');
 await h.waitVisible('#gameover');
 assert.equal(await h.text('#go-title'),'Defeat');
 await h.shot('defeat');
 await h.click('#over-title');
 await h.waitVisible('#title');
};
