// Lantern Lane (visual novel): New Game, lines typed and advanced with Enter (typing completes, then advances),
// one advance with the gamepad's south button, the log, a choice with the keys, pause freezes, save in slot 1,
// ending 1; reload, Continue restores the saved line, Auto advances, the other branch reaches ending 2.
// The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const now=()=>h.eval(()=>dialogueState&&{i:dialogueState.i,shown:dialogueState.shown,len:dialogueState.text.length,scene,line:currentLine()});
 const choicesShown=()=>{const b=document.querySelector('#dialogue [data-choice]');return !!b&&!b.closest('[hidden]');};
 // Enter until the stop condition holds (a choice on screen, the ending): each Enter completes a line or advances it
 const advanceUntil=async(stop,limit=60)=>{
  for(let n=0;n<limit&&!(await h.eval(stop));n++){await h.tap('Enter');await h.wait(30);}
  assert.ok(await h.eval(stop),'reached: '+stop);
 };

 // title: Start is focused, no Continue without a save
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-new');
 assert.ok(!(await h.visible('#title-continue')),'no Continue before a save');

 // New Game: the first line types out; Enter completes it, Enter again goes to the next line
 await h.tap('Enter');
 await h.until(()=>state==='play'&&dialogueState&&dialogueState.i===0);
 await h.waitVisible('#dialogue');
 let l=await now();
 assert.ok(l.shown<l.len,'the line is still typing');
 await h.tap('Enter');
 await h.until(()=>dialogueState.i===0&&dialogueState.shown===dialogueState.text.length);
 await h.tap('Enter');
 await h.until(()=>dialogueState.i===1);
 assert.equal(await h.text('#dlg-speaker'),'Mika');
 await h.shot('scene');

 // the gamepad's south button is Next as well
 await h.pad('connect');
 await h.padTap(0);await h.until(()=>dialogueState.shown===dialogueState.text.length);
 await h.padTap(0);await h.until(()=>dialogueState.i===2);
 await h.pad('disconnect');

 // the log (L): the lines so far with speakers; back closes it and the box keeps its place
 await h.tap('KeyL');await h.waitVisible('#backlog');
 assert.ok((await h.eval(()=>document.querySelectorAll('#backlog .game-list > li').length))>=3);
 assert.ok((await h.text('#backlog .game-list')).includes('You came!'),'the log has what Mika said');
 await h.tap('Escape');await h.until(()=>document.getElementById('backlog').hidden);
 assert.ok(await h.visible('#dialogue'));assert.equal((await now()).i,2);

 // the first choice: ↓ then Enter picks "Look for the missing lantern"
 await advanceUntil(choicesShown);
 assert.equal((await now()).scene,'keeper');
 await h.shot('choice');
 await h.tap('ArrowDown');await h.tap('Enter');
 await h.until(()=>scene==='search'&&flags.searched&&state==='play'&&dialogueState&&dialogueState.i===0);
 await h.tap('Enter');await h.tap('Enter');
 await h.until(()=>dialogueState.i===1);

 // pause: Esc stops the world
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>time);await h.wait(200);
 assert.equal(await h.eval(()=>time),frozen,'the scene stops while paused');

 // save in slot 1 from the pause menu: scene, line and flags
 await h.click('#pause-save');await h.waitVisible('#saves');
 await h.tap('Enter');
 await h.until(()=>!!localStorage.getItem(GAME_ID+'.save.1'));
 const saved=await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')).state);
 assert.deepEqual([saved.scene,saved.line,saved.flags.searched],['search',1,true]);
 await h.tap('Escape');await h.until(()=>document.getElementById('saves').hidden);
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // the river: the searched route's line, then the first option (key 1) -> ending 1
 await advanceUntil(choicesShown);
 assert.equal((await now()).scene,'river');
 assert.deepEqual(await h.eval(()=>sceneLines('river').map(x=>x.t)),['s.river.1','s.river.3','s.river.4']);
 await h.tap('Digit1');
 await h.until(()=>scene==='endA'&&state==='play');
 await advanceUntil(()=>state==='ending');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Ending 1 of 2: The River Lights');
 await h.shot('ending-a');
 await h.tap('Enter');await h.waitVisible('#title');

 // reload: Continue (focused) brings back the saved line
 await h.page.reload();
 await h.until(()=>typeof mainCanvas!=='undefined'&&time>0&&document.querySelector('#title:not([hidden])'));
 assert.equal(await h.focused(),'title-continue');
 assert.ok((await h.text('#title-continue-detail')).includes('Lantern Lane'));
 await h.tap('Enter');
 await h.until(s=>state==='play'&&dialogueState&&scene===s.scene&&currentLine()===s.line,saved);
 assert.ok(await h.eval(()=>flags.searched&&dialogueState.text===t(sceneLines(scene)[currentLine()].t)),'the saved line is back');

 // Auto: the box button turns it on and lines advance by themselves; A turns it off
 const before=(await now()).line;
 await h.click('#vn-box [data-box="auto"]');
 assert.ok(await h.eval(()=>auto));
 await h.until(b=>currentLine()>b||scene!=='search',before,10000);
 await h.tap('KeyA');assert.ok(!(await h.eval(()=>auto)));

 // portrait: the box at the bottom, the scene above it
 await advanceUntil(choicesShown);
 await h.page.setViewportSize({width:390,height:844});await h.wait(150);
 await h.shot('portrait');
 await h.page.setViewportSize({width:1000,height:700});await h.wait(100);

 // the other branch: ↓ Enter -> ending 2
 await h.tap('ArrowDown');await h.tap('Enter');
 await h.until(()=>scene==='endB'&&state==='play');
 await advanceUntil(()=>state==='ending');
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Ending 2 of 2: The Lane at Dawn');
 assert.ok((await h.text('#results dl')).includes('2 / 2'));
 await h.tap('Enter');await h.waitVisible('#title');

 // Endings on the title: both found
 await h.click('#title-endings');await h.waitVisible('#endings');
 assert.equal(await h.eval(()=>document.querySelectorAll('#endings [data-found]').length),2);
 await h.tap('Escape');await h.until(()=>document.getElementById('endings').hidden);
};
