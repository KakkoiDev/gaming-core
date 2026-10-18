// Hop Hill: walk with the keys and collect coins, jump onto a platform (hold = higher), run into an enemy and lose a life,
// stomp an enemy, reach the flag into the results (time, coins, stars), replay, pause freezes the world, the gamepad
// walks and jumps, lose the last life into Game Over, back to the title. The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h,page=h.page;
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&hero.grounded);
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 assert.equal(await h.text('#hud-level'),'1-1 Windy Ledge','the level name shows at the start');

 // walk right over the first coins, then jump (held) onto the raised platform
 await page.keyboard.down('ArrowRight');
 await h.until(()=>hero.pos.x>7.6);
 await page.keyboard.down('Space');
 await h.wait(380);
 await page.keyboard.up('ArrowRight');
 await h.wait(200);await page.keyboard.up('Space');
 await h.until(()=>hero.grounded);
 assert.ok(await h.eval(()=>hero.pos.y>6),'standing on the platform (y '+(await h.eval(()=>hero.pos.y))+')');
 assert.ok(await h.eval(()=>coins>=3),'coins collected while walking');
 assert.equal(await h.text('#hud-coins'),await h.eval(()=>t('hud.coins',{n:coins,total:level.coins.length})),'the HUD shows the coins');
 await h.shot('platform');

 // walk off the platform into the first enemy: a life is lost and the hero is back at the start
 await page.keyboard.down('ArrowRight');
 await h.until(()=>lives===2,null,10000);
 await page.keyboard.up('ArrowRight');
 assert.ok(await h.eval(()=>hero.pos.x<4&&damaged),'back at the start');
 assert.equal(await h.eval(()=>document.querySelectorAll('#hud-lives .game-icon').length),2,'two lives in the HUD');

 // the flag: put the hero just past the last block (one forced move), then walk to the flag
 await h.eval(()=>{hero.pos=vec2(73,3.45);hero.vel=vec2();});
 await page.keyboard.down('ArrowRight');
 await h.waitVisible('#results');
 await page.keyboard.up('ArrowRight');
 assert.ok(await h.eval(()=>checkpointOn),'the checkpoint was passed');
 assert.equal(await h.text('#res-title'),'Level Clear');
 const rows=await h.eval(()=>[...document.querySelectorAll('#results dt')].map(d=>d.textContent));
 assert.ok(rows.includes('Time')&&rows.includes('Coins'),'time and coins rows: '+rows);
 assert.equal(await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon').length),3);
 assert.ok(await h.eval(()=>bestTime()>0),'best time saved');
 await h.shot('results');

 // Replay (focused) starts again with 3 lives and no coins
 assert.equal(await h.focused(),'result-replay');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&lives===3&&coins===0&&levelTime<1);
 assert.ok((await h.text('#hud-best')).startsWith('Best'),'the best time shows under the timer');

 // pause: Esc freezes the world, Esc resumes
 await page.keyboard.down('ArrowRight');await h.wait(150);
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>[hero.pos.x,levelTime]);await h.wait(250);
 assert.deepEqual(await h.eval(()=>[hero.pos.x,levelTime]),frozen,'nothing moves while paused');
 await page.keyboard.up('ArrowRight');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // gamepad: the d-pad walks, south jumps
 await h.pad('connect');
 const x0=await h.eval(()=>hero.pos.x);
 await h.pad('button',15,true);await h.until(x=>hero.pos.x>x+1,x0);await h.pad('button',15,false);
 await h.until(()=>hero.grounded&&Math.abs(hero.vel.x)<.01);
 await h.pad('button',0,true);await h.until(()=>hero.vel.y>0&&!hero.grounded);await h.wait(100);await h.pad('button',0,false);
 await h.until(()=>hero.grounded);
 await h.pad('disconnect');

 // the last life (one forced condition), then walk into the enemy: Game Over
 await h.eval(()=>{lives=1;hero.pos=vec2(9,3.45);hero.vel=vec2();hero.invuln=0;});
 await page.keyboard.down('ArrowRight');
 await h.until(()=>state==='over',null,10000);
 await page.keyboard.up('ArrowRight');
 await h.waitVisible('#gameover');
 assert.equal(await h.text('#go-title'),'Game Over');
 await h.shot('gameover');
 await h.click('#over-title');
 await h.waitVisible('#title');
 assert.equal(await h.eval(()=>state),'title');
};
