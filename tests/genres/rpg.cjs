// Meadow Tale (top-down RPG): New Game, walk to the elder, talk and accept the quest, fight a slime with Attack until
// it dies, pick up its potion and drink it from the bag, save in slot 1 from the pause menu, fetch the key (one
// teleport) and walk it back: Quest Complete. Then faint (HP forced to 0): Game Over, Title, Continue loads slot 1.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const hero=()=>h.eval(()=>({x:hero.pos.x,y:hero.pos.y,hp:hero.hp}));
 // one step of real input toward a point: the arrow on the stronger axis, held briefly
 const step=async(tx,ty,ms=90)=>{
  const p=await hero();const dx=tx-p.x,dy=ty-p.y;
  await h.hold(Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowUp':'ArrowDown'),ms);
 };
 const walkTo=async(tx,ty,within=.4,limit=15000)=>{
  const end=Date.now()+limit;
  for(;;){
   const p=await hero();if(Math.hypot(tx-p.x,ty-p.y)<=within)return;
   assert.ok(Date.now()<end,`walked to ${tx},${ty} (at ${p.x.toFixed(2)},${p.y.toFixed(2)})`);
   await step(tx,ty,Math.hypot(tx-p.x,ty-p.y)<1?40:90);
  }
 };

 // title: New Game is focused; Load is disabled with no save; Enter starts
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-new');
 assert.ok(await h.eval(()=>document.getElementById('title-load').disabled),'no save yet');
 assert.ok(!(await h.visible('#title-continue')));
 await h.tap('Enter');
 await h.until(()=>state==='play'&&kitPlaying);
 assert.ok(await h.visible('#hud'));
 assert.equal(await h.text('#hud-hp-num'),'10/10');
 await h.waitVisible('#tutorial');

 // the gamepad: the left stick walks, north opens the bag, east closes it
 await h.pad('connect');
 const before=await hero();
 await h.pad('axis',0,1);await h.wait(250);await h.pad('axis',0,0);
 assert.ok((await hero()).x>before.x+.3,'the stick walks the hero');
 await h.padTap(3);await h.waitVisible('#inventory');
 assert.ok(await h.eval(()=>paused),'the bag pauses the world');
 await h.padTap(1);await h.until(()=>document.getElementById('inventory').hidden&&!paused);
 await h.pad('disconnect');

 // walk to the elder; the Talk prompt shows; Enter talks, the lines type, Accept starts the quest
 await walkTo(6.5,8.5,1.3);
 await h.waitVisible('#hud-action');
 await h.tap('Enter');await h.waitVisible('#dialogue');
 assert.equal(await h.text('#dlg-speaker'),'Elder Rowan');
 await h.shot('dialogue');
 for(let i=0;i<10&&!(await h.visible('#dialogue [data-choice="0"]'));i++){await h.tap('Enter');await h.wait(150);}
 assert.equal(await h.focused(),'game-btn','the first choice is focused');
 await h.tap('Enter'); // I will find it
 await h.until(()=>quest==='find'&&!dialogueOpen());
 await h.waitVisible('#hud-quest');
 assert.equal(await h.text('#hud-quest-text'),'Find the lost key in the forest');
 assert.ok(!(await h.visible('#dialogue')));

 // into the forest through the gap in the trees, then fight the nearest slime with Attack (J) until it dies
 await walkTo(8,6.9);await walkTo(13,6.9);
 const target=await h.eval(()=>{let best=0;slimes.forEach((s,i)=>{if(s.pos.distance(hero.pos)<slimes[best].pos.distance(hero.pos))best=i;});return best;});
 const end=Date.now()+20000;let shot=false;
 while(await h.eval(i=>slimes[i].alive,target)){
  assert.ok(Date.now()<end,'the slime dies');
  const s=await h.eval(i=>({x:slimes[i].pos.x,y:slimes[i].pos.y}),target),p=await hero();
  if(Math.hypot(s.x-p.x,s.y-p.y)>1.3){await step(s.x,s.y);continue;}
  await step(s.x,s.y,40); // face it
  await h.tap('KeyJ');
  if(!shot){shot=true;await h.shot('fight');}
  await h.wait(250);
 }
 assert.ok(await h.eval(()=>defeated===1));
 await h.until(()=>document.getElementById('hud-hp-num').textContent===hero.hp+'/10'); // the HUD shows the HP

 // the slime dropped a potion: walk onto it, it goes into the bag
 const drop=await h.eval(()=>{const near=pickups.filter(p=>p.id==='potion').sort((a,b)=>a.pos.distance(hero.pos)-b.pos.distance(hero.pos))[0];return near&&{x:near.pos.x,y:near.pos.y};});
 if(drop&&!(await h.eval(()=>bag.some(i=>i&&i.id==='potion'))))await walkTo(drop.x,drop.y,.3);
 await h.until(()=>bag.some(i=>i&&i.id==='potion'));

 // drink it from the bag (Tab opens it); a potion needs a hurt hero, so make sure of that first
 await h.eval(()=>{if(hero.hp>4)hero.hp=4;});
 await h.tap('KeyI');await h.waitVisible('#inventory');
 const hp=(await hero()).hp; // the bag pauses the world: no slime can touch the hero now
 assert.equal(await h.text('#inv-name'),'Potion');
 await h.shot('bag');
 await h.click('#inv-use');
 await h.until(n=>hero.hp===n+5,hp);
 assert.ok(!(await h.eval(()=>bag.some(i=>i&&i.id==='potion'))),'the potion is used up');
 await h.tap('Escape');await h.until(()=>document.getElementById('inventory').hidden&&!paused);

 // pause: Esc freezes the slimes; Save writes slot 1
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>JSON.stringify(slimes.map(s=>[s.pos.x,s.pos.y])));await h.wait(250);
 assert.equal(await h.eval(()=>JSON.stringify(slimes.map(s=>[s.pos.x,s.pos.y]))),frozen,'the world stops while paused');
 await h.click('#pause-save');await h.waitVisible('#saves');
 await h.click('#saves [data-slot="1"]');
 await h.until(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')||'null')?.state?.quest==='find');
 await h.shot('saves');
 const saved=await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')));
 assert.equal(saved.place,'place.forest');
 await h.tap('Escape');await h.until(()=>document.getElementById('saves').hidden);
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // the key: one teleport to the far east, then step onto it and walk it back to the elder
 const key=await h.eval(()=>{const k=pickups.find(p=>p.id==='key');hero.pos=k.pos.add(vec2(-1.2,0));return {x:k.pos.x,y:k.pos.y};});
 await walkTo(key.x,key.y,.3);
 await h.until(()=>quest==='return'&&bag.some(i=>i&&i.id==='key'));
 assert.equal(await h.text('#hud-quest-text'),'Bring the key back to the elder');
 await walkTo(24,6.9);await walkTo(13,6.9);await walkTo(8,6.9);await walkTo(6.5,8.5,1.3);
 for(let i=0;i<12&&!(await h.visible('#results'));i++){await h.tap('Enter');await h.wait(150);}
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Quest Complete');
 assert.ok(await h.eval(()=>quest==='done'&&!bag.some(i=>i&&i.id==='key')));
 await h.shot('results');
 await h.click('#res-continue');
 await h.until(()=>state==='play'&&kitPlaying);

 // faint: HP 0 -> Game Over (Continue from the last save, Title) -> Title -> Continue loads slot 1
 await h.eval(()=>{hero.hp=0;});
 await h.waitVisible('#gameover');
 assert.ok(!(await h.eval(()=>document.getElementById('over-continue').disabled)));
 await h.shot('gameover');
 await h.click('#over-title');await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-new');
 assert.ok(await h.visible('#title-continue-detail'));
 await h.click('#title-continue');
 await h.until(()=>state==='play'&&kitPlaying);
 const loaded=await h.eval(()=>({x:hero.pos.x,y:hero.pos.y,hp:hero.hp,quest,defeated}));
 assert.deepEqual(loaded,{x:saved.state.hero.x,y:saved.state.hero.y,hp:saved.state.hero.hp,quest:'find',defeated:1},'Continue loads the save');
 await h.waitVisible('#hud-quest');

 // back to the title through the pause menu
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 await h.click('#confirm-ok');await h.waitVisible('#title');
};
