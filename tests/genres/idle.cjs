// Coin Garden (idle): earn with Space and a click on the coin, buy the first helper with Enter and another with
// the mouse, income rises on its own, Tab cycles the amount, the gamepad earns and chooses rows, Esc pauses and
// saves, a reload restores the garden and pays the time away, the goal opens the results, prestige starts over with
// a bigger bonus, Quit goes back to the title. The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&kitPlaying);
 assert.ok(await h.visible('#hud'));assert.ok(await h.visible('#shop'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 assert.equal(await h.eval(()=>document.activeElement.id),'game','the keys belong to the game, not a helper button');

 // earn: Space taps, then a click on the coin; a click beside it earns nothing
 for(let i=0;i<5;i++)await h.tap('Space');
 await h.until(()=>taps===5&&coins===5);
 const coin=await h.screen(0,2);
 await h.page.mouse.click(coin.x,coin.y);
 await h.until(()=>taps===6);
 const beside=await h.screen(0,-8.5);
 await h.page.mouse.click(beside.x,beside.y);await h.wait(150);
 assert.equal(await h.eval(()=>taps),6,'a click off the coin is not a tap');
 assert.equal(await h.text('#hud-coins'),'6','the HUD shows the coins');
 assert.ok(await h.visible('.idle-pop'),'a +amount pops from the tap');

 // the first helper: the buy prompt shows once it is affordable, Enter buys it
 while(await h.eval(()=>coins<cost(0)))await h.tap('Space');
 await h.until(()=>tutStep===2);
 assert.ok((await h.text('#tutorial')).includes('first helper'));
 await h.tap('Enter');
 await h.until(()=>owned[0]===1);
 assert.equal(await h.eval(()=>rate()),.5);
 assert.equal(await h.text('#shop-lv-0'),'Lv 1');
 assert.equal(await h.text('#hud-rate'),'+0.5 / s');
 // income rises with time alone
 const c0=await h.eval(()=>coins);await h.wait(1200);
 assert.ok(await h.eval(c=>coins>c+.4,c0),'the helpers earn on their own');
 // the mouse buys the second sprout from the list
 while(await h.eval(()=>coins<cost(0)))await h.tap('Space');
 await h.click('#shop-row-0');
 await h.until(()=>owned[0]===2);
 assert.equal(await h.eval(()=>document.activeElement.id),'game','a click on the list keeps the keys');
 // Tab cycles x1, x10, x100, Max
 await h.tap('Tab');await h.until(()=>buyMode===1);
 assert.equal(await h.text('#shop-amount'),'×10');
 await h.tap('Tab');await h.tap('Tab');await h.until(()=>buyMode===3);
 assert.equal(await h.text('#shop-amount'),'Max');
 await h.tap('Tab');await h.until(()=>buyMode===0);
 await h.shot('play');

 // gamepad: South earns, the d-pad chooses the next helper
 await h.pad('connect');
 const t0=await h.eval(()=>taps);
 await h.padTap(0);await h.until(t=>taps===t+1,t0);
 await h.padTap(13);await h.until(()=>selected===1);
 assert.equal(await h.eval(()=>document.getElementById('shop-row-1').getAttribute('aria-current')),'true');
 await h.padTap(12);await h.until(()=>selected===0);
 await h.pad('disconnect');

 // pause: Esc stops the world and saves
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>coins);await h.wait(300);
 assert.equal(await h.eval(()=>coins),frozen,'no income while paused');
 const saved=await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.auto')).state);
 assert.equal(saved.owned[0],2);assert.equal(saved.coins,frozen,'the pause saved the garden');

 // reload an hour later (the save's time shifted back once): the garden comes back with the time away paid
 await h.eval(()=>{const k=GAME_ID+'.save.auto',v=JSON.parse(localStorage.getItem(k));v.savedAt=new Date(Date.parse(v.savedAt)-3600e3).toISOString();localStorage.setItem(k,JSON.stringify(v));});
 await h.page.reload();
 await h.page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0);
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'While you were away (1 h 0 min)','the title is skipped; welcome back first');
 assert.equal(await h.eval(()=>owned[0]),2);
 assert.equal(await h.eval(()=>coins),frozen,'the coins are restored');
 assert.equal(await h.focused(),'away-collect');
 await h.shot('away');
 await h.tap('Enter');
 await h.until(()=>state==='play');
 const after=await h.eval(()=>coins);
 assert.ok(after>=frozen+1800&&after<frozen+1810,`offline progress: half of an hour at 1 / s (${after-frozen})`);

 // the goal: one push near it, Space taps reach it
 await h.eval(()=>{coins=GOAL-3;});
 for(let i=0;i<3&&await h.eval(()=>state==='play');i++)await h.tap('Space');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Garden in Full Bloom');
 assert.equal(await h.focused(),'goal-keep','prestige is never the default');
 assert.equal(await h.text('#goal-prestige'),'Start Over with ×2');
 await h.shot('goal');
 // prestige asks first (Cancel focused), then starts over with the bonus
 await h.click('#goal-prestige');await h.waitVisible('#confirm');
 assert.equal(await h.focused(),'confirm-cancel');
 assert.equal(await h.text('#confirm-ok'),'Start Over with ×2');
 await h.click('#confirm-ok');
 await h.until(()=>state==='play'&&mult===2&&owned[0]===0&&coins<5);
 assert.equal(await h.text('#hud-bonus'),'Bonus ×2');
 const c1=await h.eval(()=>coins);await h.tap('Space');
 await h.until(c=>coins===c+2,c1);

 // back to the title through the pause menu; it offers Continue now
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 await h.click('#confirm-ok');await h.waitVisible('#title');
 assert.equal(await h.text('#title-start'),'Continue');
 assert.equal(await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.auto')).state.mult),2);
};
