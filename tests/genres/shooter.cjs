// Star Lane: start from the title, sweep left and right holding Z to shoot the waves (score rises), bomb the enemy
// bullets, pause, steer with a gamepad, reach the Hive Queen and beat it with the mouse (its HP lowered once), enter
// a top score; then a new run where the ship is hit on its last life (forced once): Game Over, Continue, quit to title.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert,page}=h;
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&kitPlaying);
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 assert.ok(await h.visible('#tutorial'),'the fire hint shows');

 // hold fire and sweep the ship left and right with the arrow keys until a condition holds
 const sweep=async(until,limit=40000)=>{
  const end=Date.now()+limit;let dir='ArrowLeft';
  await page.keyboard.down('KeyZ');
  while(Date.now()<end&&!(await h.eval(until))){
   await page.keyboard.down(dir);await h.wait(350);await page.keyboard.up(dir);
   dir=dir==='ArrowLeft'?'ArrowRight':'ArrowLeft';
  }
  await page.keyboard.up('KeyZ');
  assert.ok(await h.eval(until),'reached: '+until);
 };
 await sweep(()=>score>=500&&shotsHit>0);
 assert.equal(await h.text('#hud-score'),await h.eval(()=>fmt(score)),'the HUD shows the score');
 await h.shot('play');

 // a bomb clears the enemy bullets
 await sweep(()=>enemyShots.length>0);
 const before=await h.eval(()=>bombs);
 await h.tap('KeyX');
 await h.until(b=>bombs===b-1&&bombFlash>0,before);
 assert.equal(await h.eval(()=>enemyShots.filter(s=>s.pos.y<HALF.y).length),0,'the bomb cleared the bullets');
 assert.equal(await h.eval(()=>document.querySelectorAll('#hud-bombs .game-icon').length),before-1,'one bomb icon fewer');

 // pause: Esc freezes the world, Esc resumes
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>stageTime);await h.wait(250);
 assert.equal(await h.eval(()=>stageTime),frozen,'the stage stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // a gamepad: the left stick moves the ship, south held fires
 await h.pad('connect');
 const x0=await h.eval(()=>player.pos.x),dir=x0>0?-1:1;
 await h.pad('axis',0,dir);await h.wait(300);await h.pad('axis',0,0);
 assert.ok(await h.eval(([x0,dir])=>(player.pos.x-x0)*dir>1,[x0,dir]),'the stick moves the ship');
 const fired=await h.eval(()=>shotsFired);
 await h.pad('button',0,true);await h.wait(300);await h.pad('button',0,false);
 assert.ok(await h.eval(f=>shotsFired>f,fired),'south fires');
 await h.pad('disconnect');

 // the waves pass, the Hive Queen arrives with her HP bar top centre
 await sweep(()=>boss&&boss.ready,45000);
 await h.waitVisible('#hud-boss');
 assert.equal(await h.text('#hud-boss-name'),'Hive Queen');
 await h.shot('boss');
 // beat her with the mouse: the ship follows the pointer while the left button is held, and fires
 await h.eval(()=>{boss.hp=6;});
 let p=await h.screen(await h.eval(()=>boss.pos.x),-10);
 await page.mouse.move(p.x,p.y);await page.mouse.down();
 const end=Date.now()+15000;
 while(Date.now()<end&&await h.eval(()=>boss.hp>0)){
  p=await h.screen(await h.eval(()=>boss.pos.x),-10);await page.mouse.move(p.x,p.y);await h.wait(30);
 }
 await page.mouse.up();
 assert.ok(await h.eval(()=>boss.hp<=0),'the boss is beaten');
 assert.ok(await h.eval(()=>inputDevice()==='mouse'));

 // results with a top-10 name entry
 await h.waitVisible('#results .game-name-entry input');
 assert.equal(await h.text('#res-title'),'Stage Clear');
 await page.keyboard.type('ace');await page.keyboard.press('Enter');
 await h.until(()=>document.querySelector('.game-scores')?.textContent.includes('ACE'));
 assert.equal(await h.eval(()=>highScores('stage1').list()[0].name),'ACE');
 await h.shot('scores');

 // a new run: score a little, then the last life is hit (forced once) -> Game Over
 await h.click('#res-again');
 await h.until(()=>state==='play'&&score===0&&lives===3);
 await sweep(()=>score>0);
 await h.eval(()=>{lives=1;invuln=0;enemyShots.push({pos:player.pos.add(vec2(0,1.5)),vel:vec2(0,-.2)});});
 await h.waitVisible('#gameover');
 assert.equal(await h.text('#go-title'),'Game Over');
 assert.equal(await h.focused(),'over-continue');
 await h.shot('gameover');
 // Continue: the score goes back to 0 with three lives
 await h.click('#over-continue');
 await h.until(()=>state==='play'&&score===0&&lives===3&&continues===2);
 assert.ok(await h.visible('#hud'));

 // back to the title through the pause menu (Quit asks first)
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 await h.click('#confirm-ok');await h.waitVisible('#title');
 assert.equal(await h.eval(()=>state),'title');
};
