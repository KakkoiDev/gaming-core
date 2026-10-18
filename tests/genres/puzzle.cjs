// Push Puzzle (Sokoban): level 1 solved with real key presses and one gamepad d-pad push, Undo restores a push,
// Restart resets (and can be undone), pause freezes, results with 3 stars, Next to level 2, a tap on a neighbour cell,
// level 2 solved, progress saved, Play continues at level 3, LevelSelect. The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 const board=()=>h.eval(()=>({p:[player.x,player.y],c:crates.map(c=>[c.x,c.y]),moves,state,level:levelIndex}));
 // one key press = one step: wait for the move counter (or the solved state) before the next press
 const press=async(code)=>{const m=await h.eval(()=>moves);await h.tap(code);await h.until(m=>moves!==m||state!=='play',m);};
 const keys={R:'ArrowRight',L:'ArrowLeft',U:'ArrowUp',D:'ArrowDown'};

 // title: Play is focused; Enter starts the next unsolved level (level 1)
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-start');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&levelIndex===0);
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 assert.equal(await h.text('#hud-level'),'Level 1');
 assert.equal(await h.text('#hud-moves'),'0 moves');

 // a push, then Undo (Z) puts the crate and the player back
 const start=await board();
 await press('ArrowRight');
 let b=await board();
 assert.deepEqual(b.p,[3,2]);assert.deepEqual(b.c[0],[4,2],'the crate was pushed');assert.equal(b.moves,1);
 assert.ok(!(await h.visible('#tutorial')),'the tutorial goes after the first move');
 await h.until(()=>document.getElementById('hud-moves').textContent==='1 move');
 await h.tap('KeyZ');await h.until(()=>moves===0);
 assert.deepEqual(await board(),start,'Undo restores the push');
 // a wall stops the player and counts nothing
 await press('ArrowUp');await h.tap('ArrowUp');await h.wait(100);assert.equal(await h.eval(()=>moves),1,'the wall above the second step blocks');
 // Restart (R) resets the board and moves; Undo after it brings the board back; Backspace undoes too
 await press('ArrowRight');assert.equal(await h.eval(()=>moves),2);
 await h.tap('KeyR');await h.until(()=>moves===0);
 assert.deepEqual(await board(),start,'Restart resets');
 await h.tap('KeyZ');await h.until(()=>moves===2);
 await h.tap('Backspace');await h.until(()=>moves===1);
 await h.click('#hud-restart');await h.until(()=>moves===0); // the HUD button restarts too
 assert.deepEqual(await board(),start);

 // pause: Esc stops the world (keys do not move the player), Esc resumes
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 await h.tap('ArrowRight');await h.wait(150);
 assert.deepEqual((await board()).p,start.p,'no move while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // the gamepad: one d-pad right press is one push
 await h.pad('connect');
 await h.padTap(15);await h.until(()=>moves===1);
 assert.deepEqual((await board()).c[0],[4,2],'the d-pad pushed the crate');
 await h.until(()=>document.querySelector('#hud-undo .game-padpos[data-pos="west"]'));   // prompts follow the device
 await h.pad('disconnect');
 await h.shot('level1');
 // the rest of level 1's solution with keys: R R L L D (6 moves = par = 3 stars)
 for(const k of 'RRLLD')await press(keys[k]);
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Solved!');
 assert.equal(await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon:not([data-off])').length),3,'3 stars at par');
 assert.ok((await h.text('#results dl')).includes('6'),'the moves are shown');
 assert.deepEqual(await h.eval(id=>JSON.parse(localStorage.getItem(id+'.progress')).levels[0],await h.eval(()=>GAME_ID)),{stars:3,best:6});
 await h.shot('results');

 // Next (focused) goes to level 2
 assert.equal(await h.focused(),'res-next');
 await h.tap('Enter');
 await h.until(()=>state==='play'&&levelIndex===1&&moves===0);
 assert.equal(await h.text('#hud-level'),'Level 2');
 // portrait (a phone): the level fits between the HUD and the buttons
 await h.page.setViewportSize({width:390,height:844});await h.wait(200);
 assert.ok(await h.eval(()=>cameraScale*grid.w<=mainCanvasSize.x),'the level fits a phone\'s width');
 await h.shot('portrait');
 await h.page.setViewportSize({width:1000,height:700});await h.wait(200);
 // a click on the cell right of the player steps there; a click two cells away does nothing
 const right=await h.screen(...await h.eval(()=>{const p=cellPos(player.x+1,player.y);return [p.x,p.y];}));
 await h.page.mouse.click(right.x,right.y);await h.until(()=>moves===1&&player.x===4);
 const far=await h.screen(...await h.eval(()=>{const p=cellPos(player.x-3,player.y);return [p.x,p.y];}));
 await h.page.mouse.click(far.x,far.y);await h.wait(150);
 assert.equal(await h.eval(()=>moves),1,'a far cell is not a move');
 await h.tap('KeyZ');await h.until(()=>moves===0&&player.x===3);
 // level 2's solution: L D L U U R R R D R U, 11 moves
 for(const k of 'LDLUURRRDRU')await press(keys[k]);
 await h.waitVisible('#results');
 assert.equal(await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon:not([data-off])').length),3);
 await h.shot('level2');

 // back to the title: Play continues at the next unsolved level (3)
 await h.click('#res-home');await h.waitVisible('#title');
 await h.click('#title-start');await h.until(()=>state==='play'&&levelIndex===2);
 // a longer route gets fewer stars: 1 step too many on level 3 is still 3 stars only at par, so check the rule
 assert.deepEqual(await h.eval(()=>[stars(19,19),stars(25,19),stars(40,19)]),[3,2,1]);
 // quit through the pause menu (Quit asks first)
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 assert.equal(await h.focused(),'confirm-cancel');
 await h.click('#confirm-ok');await h.waitVisible('#title');

 // LevelSelect: levels 1-3 open with their stars, focus on the next unsolved, Esc goes back
 await h.click('#title-levels');await h.waitVisible('#levels');
 assert.equal(await h.focused(),'level-3');
 assert.equal(await h.eval(()=>document.querySelectorAll('#level-1 .game-icon:not([data-off])').length),3);
 assert.equal(await h.eval(()=>document.querySelectorAll('#level-3 .game-icon:not([data-off])').length),0,'level 3 not solved yet');
 await h.shot('levels');
 await h.tap('Escape');await h.until(()=>document.getElementById('levels').hidden);
 await h.waitVisible('#title');
};
