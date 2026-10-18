// Turbo Loop: count down, drive with keys (speed, steering, brake), pass checkpoint 1 in order, pause freezes the race,
// 3 laps (the car is moved to the last checkpoint once per lap) into 1st place and the results table; a second race
// with the gamepad's right trigger accelerating and the stick steering, finished last into Game Over; Time Trial.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const holdUntil=async(code,fn,arg,timeout=15000)=>{await h.page.keyboard.down(code);try{await h.until(fn,arg,timeout);}finally{await h.page.keyboard.up(code);}};
 // the last checkpoint, facing the line: the lap is then driven over the line with the accelerator
 const toLastCheckpoint=()=>h.eval(()=>{const n=TRACK.length;player.pos=TRACK[n-1].add(vec2(-2,0));player.angle=PI/2;player.next=n-1;});

 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-race');
 await h.shot('title');

 // Race: Enter starts the countdown; the cars wait through 3 · 2 · 1
 await h.tap('Enter');
 await h.until(()=>state==='play'&&countdown>0&&racers.length===4);
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 assert.equal(await h.text('#hud-msg'),'3');
 const grid=await h.eval(()=>player.pos.x);
 await h.hold('ArrowUp',300);
 assert.equal(await h.eval(()=>player.pos.x),grid,'no moving before GO');
 assert.equal(await h.text('#hud-pos'),'4th / 4','starting last on the grid');
 await h.until(()=>countdown<=0);
 await h.until(()=>document.getElementById('hud-msg').textContent==='GO');
 await h.waitVisible('#tutorial');

 // drive: the accelerator to checkpoint 1 down the straight (the start line was passed with no lap counted)
 await holdUntil('ArrowUp',()=>player.next===2);
 assert.equal(await h.eval(()=>player.lap),0,'crossing the start line at the start is not a lap');
 assert.ok(await h.eval(()=>player.speed>.3&&player.pos.x>30),'the car sped down the straight');
 assert.ok(Number((await h.text('#hud-speed')).split(' ')[0])>80,'the HUD shows the speed');
 await h.shot('race');
 // steering and the brake
 const angle=await h.eval(()=>player.angle);
 await h.page.keyboard.down('ArrowUp');await h.hold('ArrowLeft',300);await h.page.keyboard.up('ArrowUp');
 assert.ok(await h.eval(a=>player.angle<a-.1,angle),'← steers left');
 const speed=await h.eval(()=>player.speed);
 await h.hold('ArrowDown',300);
 assert.ok(await h.eval(s=>player.speed<s-.1,speed),'↓ brakes');

 // pause: Esc stops the race, Esc resumes
 await h.page.keyboard.down('ArrowUp');await h.wait(200);
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.page.keyboard.up('ArrowUp');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>({x:player.pos.x,y:player.pos.y,t:raceTime,r:racers[0].pos.x}));
 await h.wait(250);
 assert.deepEqual(await h.eval(()=>({x:player.pos.x,y:player.pos.y,t:raceTime,r:racers[0].pos.x})),frozen,'the race stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // laps: from the last checkpoint, over the line with the accelerator; checkpoints out of order do not count
 await h.eval(()=>{player.pos=TRACK[0].add(vec2(-6,0));player.angle=PI/2;});
 await h.hold('ArrowUp',600);
 assert.equal(await h.eval(()=>player.lap),0,'the line without the checkpoints before it is not a lap');
 for(let lap=1;lap<=3;lap++){
  await toLastCheckpoint();
  await holdUntil('ArrowUp',l=>player.lap===l||state!=='play',lap);
  if(lap<3)assert.equal(await h.text('#hud-lap'),`Lap ${lap+1} / 3`);
  if(lap===2)assert.equal(await h.text('#hud-msg'),'Final Lap');
 }
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'You finished 1st');
 assert.equal(await h.eval(()=>document.querySelectorAll('#race-table > li').length),4,'every racer in the table');
 assert.equal(await h.text('#race-table > li[data-new] span:nth-child(2)'),'You');
 assert.ok(/^\d:\d\d\.\d\d$/.test(await h.text('#race-table > li[data-new] span:nth-child(3)')),'your total time');
 await h.shot('results');

 // Retry (focused): a second race; the gamepad's right trigger accelerates and the stick steers
 await h.tap('Enter');
 await h.until(()=>state==='play'&&countdown>0&&player.lap===0&&raceTime===0);
 await h.until(()=>countdown<=0);
 await h.pad('connect');
 await h.pad('button',7,true);
 await h.until(()=>player.speed>.25);
 await h.pad('axis',0,1);
 const padAngle=await h.eval(()=>player.angle);
 await h.wait(250);
 assert.ok(await h.eval(a=>player.angle>a+.05,padAngle),'the stick steers right');
 await h.pad('axis',0,0);await h.pad('button',7,false);
 assert.equal(await h.eval(()=>gameInput().device),'gamepad');
 await h.pad('disconnect');

 // finishing last: the rivals are home, the car on its final lap at the last checkpoint -> Game Over
 await h.eval(()=>{racers.filter(c=>c.ai).forEach((c,i)=>{c.finished=true;c.finishTime=max(0,raceTime-1+i*.1);c.lap=3;});player.lap=2;});
 await toLastCheckpoint();
 await holdUntil('ArrowUp',()=>state==='over');
 await h.waitVisible('#gameover');
 assert.equal(await h.text('#go-title'),'Last Place');
 await h.shot('gameover');
 await h.click('#gameover .game-menu li:last-child .game-btn');
 await h.waitVisible('#title');

 // Time Trial: alone on the track, the best lap is kept
 await h.click('#title-trial');
 await h.until(()=>state==='play'&&trial&&racers.length===1);
 await h.until(()=>countdown<=0);
 for(let lap=1;lap<=3;lap++){await toLastCheckpoint();await holdUntil('ArrowUp',l=>player.lap===l||state!=='play',lap);}
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Time Trial');
 assert.ok(await h.eval(()=>bestLapSaved()>0),'best lap saved');
 await h.click('#results .game-menu li:last-child .game-btn');
 await h.waitVisible('#title');
};
