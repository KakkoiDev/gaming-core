// Garden Guard (tower defence): place a tower with keys and one with the mouse, refusals in the HUD, the gamepad
// moves the cursor and cycles towers, a wave is started and its enemies die for gold, pause freezes them,
// the last wave is survived into the results (skipped to once), and lives forced low lose into Game Over.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play');
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 assert.equal(await h.eval(()=>towers.length),0,'the Enter that started the game places nothing');

 // keys: the cursor steps one cell per tap; Space places a Bolt on grass
 assert.deepEqual(await h.eval(()=>({x:cursor.x,y:cursor.y})),{x:5,y:5});
 await h.tap('ArrowDown');await h.tap('ArrowDown');
 assert.deepEqual(await h.eval(()=>({x:cursor.x,y:cursor.y})),{x:5,y:3});
 await h.tap('Space');
 await h.until(()=>towers.length===1&&gold===70);
 // refusals: the path, then a tower that costs too much
 await h.tap('ArrowLeft');await h.tap('Space');
 await h.until(()=>document.getElementById('hud-message').textContent==='Not on the path');
 await h.tap('ArrowRight');await h.tap('ArrowUp');await h.tap('Digit2');
 assert.equal(await h.eval(()=>TOWERS[selected].id),'cannon');
 await h.tap('Space');
 await h.until(()=>document.getElementById('hud-message').textContent==='Not enough gold');
 assert.equal(await h.eval(()=>towers.length),1);
 await h.tap('Digit1');

 // mouse: hover a cell and click to place a second Bolt there
 const p=await h.eval(()=>{const q=cellPos(vec2(10,6));return {x:q.x,y:q.y};});
 const s=await h.screen(p.x,p.y);
 await h.page.mouse.move(s.x-20,s.y);await h.page.mouse.move(s.x,s.y);
 await h.until(()=>cursor.x===10&&cursor.y===6);
 await h.page.mouse.down();await h.wait(60);await h.page.mouse.up();
 await h.until(()=>towers.length===2&&gold===20);
 assert.ok(await h.eval(()=>towerAt(vec2(10,6))?.kind.id==='bolt'));

 // gamepad: the d-pad steps the cursor, the shoulders cycle the tower kinds
 await h.pad('connect');
 const x=await h.eval(()=>cursor.x);
 await h.padTap(14);await h.until(x=>cursor.x===x-1,x);
 await h.padTap(5);await h.until(()=>selected===1);
 await h.padTap(4);await h.until(()=>selected===0);
 await h.pad('disconnect');
 await h.shot('placed');

 // start the wave (N): enemies walk the path, towers kill them, gold rises
 await h.waitVisible('#tutorial');
 await h.tap('KeyN');
 await h.until(()=>waveActive&&wave===1&&enemies.length>0);
 assert.equal(await h.text('#hud-wave'),'Wave 1 / 5');
 await h.until(()=>kills>=2&&gold>20,null,20000);
 await h.shot('wave');

 // pause: Esc stops the world, Esc resumes
 await h.until(()=>enemies.length>0,null,20000);
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>enemies.map(e=>e.pos.x+','+e.pos.y).join());await h.wait(250);
 assert.equal(await h.eval(()=>enemies.map(e=>e.pos.x+','+e.pos.y).join()),frozen,'enemies stop while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // the wave ends; spend its gold on towers next to the corners (keys only)
 await h.until(()=>!waveActive,null,40000);
 assert.equal(await h.eval(()=>wave),1);
 const goTo=async(cx,cy)=>{
  for(let i=0;i<20;i++){
   const c=await h.eval(()=>({x:cursor.x,y:cursor.y}));
   if(c.x===cx&&c.y===cy)return;
   await h.tap(c.x<cx?'ArrowRight':c.x>cx?'ArrowLeft':c.y<cy?'ArrowUp':'ArrowDown');
  }
  assert.fail('cursor did not reach '+cx+','+cy);
 };
 for(const [cx,cy] of [[8,3],[5,6],[12,6],[10,3]]){
  if(!(await h.eval(()=>gold>=50)))break;
  const n=await h.eval(()=>towers.length);
  await goTo(cx,cy);await h.tap('Space');
  await h.until(n=>towers.length===n+1,n);
 }
 assert.ok(await h.eval(()=>towers.length>=3),'wave gold bought another tower');

 // skip to the last wave once, then survive it into the results with stars by lives
 await h.eval(()=>{wave=WAVES-1;});
 await h.tap('KeyN');
 await h.until(()=>wave===WAVES&&waveActive);
 await h.waitVisible('#results',90000);
 assert.equal(await h.text('#res-title'),'Garden Saved');
 const stars=await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon:not([data-off])').length);
 assert.ok(stars>=1&&stars<=3,'stars by lives');
 assert.equal(stars,await h.eval(()=>lives>=START_LIVES-2?3:lives>=START_LIVES/2?2:1));
 await h.shot('results');
 await h.click('#results .game-menu li:last-child .game-btn');await h.waitVisible('#title');

 // lose: a new game with lives forced to 1; the first enemy of wave 1 walks through to Game Over
 await h.tap('Enter');await h.until(()=>state==='play'&&towers.length===0&&gold===120);
 await h.eval(()=>{lives=1;});
 await h.tap('KeyN');
 await h.until(()=>waveActive);
 await h.waitVisible('#gameover',30000);
 assert.equal(await h.text('#go-title'),'Defeat');
 assert.equal(await h.text('#go-detail'),'The garden fell on wave 1');
 await h.shot('gameover');
 await h.click('#gameover .game-menu li:last-child .game-btn');await h.waitVisible('#title');
};
