// Deepwell (turn-based roguelike): a fixed-seed run started from the title with Enter, walked with the arrow keys
// (one tap, one step), a monster bumped until it dies, a potion picked up and drunk, the stairs taken, pause freezes
// the world, a gamepad d-pad step; floor 3's stairs win (forced next to them once), HP 0 ends the run (forced once)
// into Run Over -> New Run -> back to the title. The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const KEYS={'1,0':'ArrowRight','-1,0':'ArrowLeft','0,1':'ArrowUp','0,-1':'ArrowDown'};
 // the first step of a shortest walk to the nearest target ('enemy' | 'potion' | 'stairs'); monsters on the way get bumped
 const nextStep=(kind='enemy')=>h.eval(kind=>{
  const goals=kind==='enemy'?enemies.map(e=>e.pos):kind==='potion'?potions:[stairs];
  const goal=new Set(goals.map(p=>p.x+','+p.y));
  const from=new Map([[player.pos.x+','+player.pos.y,null]]),queue=[player.pos];
  while(queue.length){
   const p=queue.shift(),k=p.x+','+p.y;
   if(goal.has(k)){let c=k;while(from.get(c)&&from.get(c).prev!==player.pos.x+','+player.pos.y)c=from.get(c).prev;return from.get(c)?from.get(c).dir:null;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n=vec2(p.x+dx,p.y+dy),nk=n.x+','+n.y;
    if(from.has(nk)||tileAt(n)!==FLOOR)continue;
    from.set(nk,{prev:k,dir:dx+','+dy});queue.push(n);
   }
  }
  return null;
 },kind);
 const walk=async(kind,done,limit=400)=>{
  for(let i=0;i<limit&&!(await h.eval(done));i++){
   const step=await nextStep(kind);
   assert.ok(step,'a way to the '+kind);
   const before=await h.eval(()=>turns+':'+depth);
   await h.tap(KEYS[step]);
   await h.until(b=>turns+':'+depth!==b||state!=='play',before,3000);
  }
  assert.ok(await h.eval(done),'reached: '+done);
 };

 // title: Start Run is focused; a fixed seed makes the floors the same every run
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.eval(()=>{nextSeed=4242;});
 await h.tap('Enter');
 await h.until(()=>state==='play'&&seed===4242&&depth===1);
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 assert.equal(await h.text('#hud-seed'),'Seed 4242');
 assert.equal(await h.text('#hud-floor'),'Floor 1');
 assert.equal(await h.text('#hud-hp'),'20 / 20');
 await h.waitVisible('#tutorial');
 const layout=await h.eval(()=>tiles.join(''));
 await h.eval(()=>{const p=player.pos;makeFloor();player.pos=p;});
 assert.equal(await h.eval(()=>tiles.join('')),layout,'the same seed and floor give the same layout');
 await h.eval(()=>{makeFloor();});

 // one tap is one step and one turn; a held key repeats
 const start=await h.eval(()=>({x:player.pos.x,y:player.pos.y}));
 const first=await nextStep();
 await h.tap(KEYS[first]);
 await h.until(()=>turns===1);
 const moved=await h.eval(()=>({x:player.pos.x,y:player.pos.y}));
 assert.equal(Math.abs(moved.x-start.x)+Math.abs(moved.y-start.y),1,'one tile per press');
 assert.ok(!(await h.visible('#tutorial')),'the move prompt goes after the first step');

 // bump the nearest monster until it dies (it fights back)
 await walk('enemy',()=>kills>=1);
 assert.ok(await h.eval(()=>player.hp<MAX_HP),'monsters hit back after your turn');
 await h.shot('fight');
 // pick up a potion, drink it with 1
 await walk('potion',()=>found>=1);
 assert.equal(await h.text('#hud-potion'),'Potion ×'+(await h.eval(()=>bag)));
 if(await h.eval(()=>player.hp<MAX_HP)){
  const hp=await h.eval(()=>player.hp);
  await h.tap('Digit1');
  await h.until(hp=>player.hp>hp&&bag===found-1,hp);
 }

 // pause: Esc stops the world, keys move the menu, not the player
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>({time,turns,x:player.pos.x,y:player.pos.y}));
 await h.tap('ArrowDown');await h.wait(150);
 const after=await h.eval(()=>({time,turns,x:player.pos.x,y:player.pos.y}));
 assert.deepEqual(after,frozen,'the world stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // a gamepad's d-pad takes one step too
 await h.pad('connect');
 const padStep=await nextStep('stairs');
 const dpad={'1,0':15,'-1,0':14,'0,1':12,'0,-1':13}[padStep];
 const padTurns=await h.eval(()=>turns+':'+depth);
 await h.padTap(dpad);
 await h.until(b=>turns+':'+depth!==b,padTurns,3000);
 await h.pad('disconnect');

 // the stairs lead down to floor 2
 await walk('stairs',()=>depth===2);
 assert.equal(await h.text('#hud-floor'),'Floor 2');
 await h.shot('floor2');

 // floor 3: once next to the stairs, the last step wins the run
 await h.eval(()=>{depth=3;makeFloor();const s=stairs;
  for(const [dx,dy] of [[-1,0],[1,0],[0,1],[0,-1]]){const p=vec2(s.x+dx,s.y+dy);if(tileAt(p)===FLOOR&&!enemyAt(p)){player.pos=p;break;}}});
 const toStairs=await h.eval(()=>(stairs.x-player.pos.x)+','+(stairs.y-player.pos.y));
 await h.tap(KEYS[toStairs]);
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'You Escaped the Well');
 assert.ok((await h.text('#results dl')).includes('Kills'));
 await h.shot('won');
 assert.equal(await h.focused(),'res-new','New Run first');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&depth===1&&turns===0&&player.hp===MAX_HP);

 // permadeath: at 1 HP, walk into a monster; its hit ends the run
 await h.eval(()=>{player.hp=1;});
 await walk('enemy',()=>state==='dead');
 await h.waitVisible('#gameover');
 assert.equal(await h.text('#go-title'),'Run Over');
 const detail=await h.text('#go-detail');
 assert.ok(/^Reached floor 1 in \d+:\d\d Slain by a rose slime on floor 1\.$/.test(detail),detail);
 assert.equal(await h.focused(),'over-new','New Run first');
 assert.ok(!(await h.eval(()=>!!document.querySelector('#gameover [data-t="gameover.load"]'))),'no Load in permadeath');
 await h.shot('over');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&player.hp===MAX_HP&&depth===1);

 // back to the title through the pause menu
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 await h.click('#confirm-ok');await h.waitVisible('#title');
 assert.equal(await h.eval(()=>state),'title');
};
