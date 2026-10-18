// Sunny Acre (cozy): New Game, gamepad tool switch and step, till, plant and water with keys, sleep in the bed
// (End of Day), water again, the day ends at 24:00, the crop ripens, harvest, sell at the bin, the farm goal,
// talk to Mabel (DialogueBox choice), pause freezes the clock, quit, reload and Continue restores the farm.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const tile=(x,y)=>h.eval(([x,y])=>({...tiles[y*W+x]}),[x,y]);
 const at=()=>h.eval(()=>({x:player.x,y:player.y,fx:player.face.x,fy:player.face.y}));
 // arrows: a new direction turns first, the same direction steps one tile
 const stepTo=async(x)=>{for(let i=0;i<30&&(await at()).x!==x;i++)await h.tap((await at()).x<x?'ArrowRight':'ArrowLeft');assert.equal((await at()).x,x,'walked to x='+x);};
 const face=async(key,fx,fy)=>{await h.tap(key);const p=await at();assert.deepEqual([p.fx,p.fy],[fx,fy],'facing '+key);};

 // title: no save yet, so New Game is first
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-new');
 assert.ok(!(await h.visible('#title-continue')));
 await h.tap('Enter');
 await h.until(()=>state==='play'&&day===1);
 assert.ok(await h.visible('#hud'));
 assert.equal(await h.text('#hud-day'),'Spring 1');
 assert.equal(await h.text('#hud-time'),'6:00');
 assert.equal(await h.text('#hud-tool'),'Hoe');
 await h.waitVisible('#tutorial');
 assert.ok(await h.eval(()=>saveRead('auto').state.day===1),'autosave on the first morning');

 // gamepad: the right shoulder picks the next tool, the left one goes back, the d-pad turns then steps
 await h.pad('connect');
 await h.padTap(5);await h.until(()=>tool===1);
 assert.equal(await h.text('#hud-tool'),'Turnip Seeds');
 assert.equal(await h.eval(()=>document.querySelector('#hot-1').getAttribute('aria-selected')),'true','the hotbar outlines the tool');
 await h.padTap(4);await h.until(()=>tool===0);
 await h.padTap(15);await h.until(()=>player.face.x===1);
 assert.equal((await at()).x,4,'a new direction only turns');
 await h.padTap(15);await h.until(()=>player.x===5);
 await h.pad('disconnect');
 await face('ArrowLeft',-1,0);await stepTo(4);await face('ArrowDown',0,-1);

 // day 1: till (C), seeds (2), water (3) on the tile in front
 await h.tap('KeyC');
 await h.until(()=>tiles[5*W+4].till===1);
 assert.equal(await h.eval(()=>energy),98,'a tool use costs energy');
 assert.ok(!(await h.visible('#tutorial')),'the hint goes once the tool is used');
 await h.tap('Digit2');await h.until(()=>tool===1);
 await h.tap('KeyC');await h.until(()=>tiles[5*W+4].crop===0);
 assert.equal(await h.text('#hud-seeds'),'9');
 await h.tap('Digit3');await h.until(()=>tool===2);
 await h.tap('KeyC');await h.until(()=>tiles[5*W+4].wet===1);
 await h.shot('farm');

 // sleep: walk to the bed, interact (E), confirm; the summary; Next Morning autosaves day 2
 await face('ArrowLeft',-1,0);await stepTo(2);
 await h.tap('ArrowLeft');assert.equal((await at()).x,2,'the bed blocks the way');
 await h.tap('KeyE');await h.waitVisible('#confirm');
 assert.equal(await h.focused(),'confirm-cancel');
 await h.click('#confirm-ok');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'End of Day 1');
 assert.deepEqual(await tile(4,5),{till:1,wet:0,crop:1},'the watered seed sprouts overnight');
 await h.shot('night');
 assert.equal(await h.focused(),'night-next');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&day===2);
 assert.equal(await h.text('#hud-day'),'Spring 2');
 assert.equal(await h.eval(()=>saveRead('auto').state.day),2,'autosave each morning');

 // day 2: water again; the clock runs; at 24:00 the day ends by itself (forced: a minute before midnight)
 await stepTo(4);await face('ArrowDown',0,-1);
 await h.tap('KeyC');await h.until(()=>tiles[5*W+4].wet===1);
 const clock=await h.eval(()=>minutes);await h.wait(800);
 assert.ok(await h.eval(c=>minutes>c,clock),'the day clock runs');
 await h.eval(()=>{minutes=DAY_END-1/60;});
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'End of Day 2');
 await h.tap('Enter');await h.until(()=>state==='play'&&day===3);
 assert.equal(await tile(4,5).then(c=>c.crop),2);

 // day 3: the crop grows once more (forced), harvest with the hands, sell at the bin
 await h.eval(()=>{tiles[5*W+4].crop=CROPS.turnip.nights;});
 await stepTo(4);await face('ArrowDown',0,-1);
 await h.tap('Digit4');await h.until(()=>tool===3);
 await h.tap('KeyC');await h.until(()=>crops===1);
 assert.equal((await tile(4,5)).crop,-1);
 assert.equal(await h.text('#hud-crops'),'Turnips: 1');
 await face('ArrowRight',1,0);await stepTo(13);
 // the goal is near (forced), the sale crosses it
 await h.eval(()=>{coins=GOAL-20;});
 await h.tap('KeyE');
 await h.until(()=>coins===GOAL+10&&crops===0);
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Farm Goal Reached');
 await h.shot('goal');
 await h.click('#goal-keep');
 await h.until(()=>state==='play'&&kitPlaying);
 assert.equal(await h.text('#hud-money'),'510 g');

 // Mabel: face her, talk, ask for seeds
 await face('ArrowUp',0,1);
 await h.tap('KeyE');await h.waitVisible('#dialogue');
 for(let i=0;i<10&&!(await h.visible('#dialogue [data-choice="0"]'));i++){await h.tap('Enter');await h.wait(150);}
 await h.shot('talk');
 await h.click('#dialogue [data-choice="0"]');
 await h.until(()=>seeds===14&&!dialogueOpen());
 assert.ok(await h.visible('#hud-msg'));

 // pause: Esc stops the clock, Esc resumes
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>minutes);await h.wait(300);
 assert.equal(await h.eval(()=>minutes),frozen,'the clock stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // quit to the title, reload, Continue: the morning of day 3 comes back (tilled tile, young crop)
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');await h.click('#confirm-ok');
 await h.waitVisible('#title');
 await h.page.reload();
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-continue');
 assert.ok((await h.text('#title-continue-detail')).startsWith('Spring 3'));
 await h.tap('Enter');
 await h.until(()=>state==='play'&&day===3);
 assert.deepEqual(await tile(4,5),{till:1,wet:0,crop:2},'Continue restores the farm');
 assert.equal(await h.eval(()=>coins),0);
 assert.equal(await h.text('#hud-day'),'Spring 3');
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');await h.click('#confirm-ok');
 await h.waitVisible('#title');
};
