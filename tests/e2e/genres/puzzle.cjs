// Push Puzzle (starters/genres/puzzle/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const keys={R:'ArrowRight',L:'ArrowLeft',U:'ArrowUp',D:'ArrowDown'};
 const board=(h)=>h.eval(()=>({p:[player.x,player.y],c:crates.map(c=>[c.x,c.y]),moves,state,level:levelIndex}));
 // one key press = one step: wait for the move counter (or the solved state) before the next press
 async function press(h,code){const m=await h.eval(()=>moves);await h.tap(code);await h.until(m=>moves!==m||state!=='play',m);}
 async function play(h,route){for(const k of route)await press(h,keys[k]);}
 async function startLevel1(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&levelIndex===0);
 }
 async function solveLevel1(h){await play(h,'RRRLLD');await h.waitVisible('#results');}
 async function solveLevel2(h){await play(h,'LDLUURRRDRU');await h.waitVisible('#results');}
 // results of level 1, then Next Level (Enter on the focused item) into level 2
 async function toLevel2(h){
  await startLevel1(h);await solveLevel1(h);
  await h.until(()=>document.activeElement.id==='res-next');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&levelIndex===1&&moves===0);
 }
 async function solveTwoLevels(h){
  await toLevel2(h);await solveLevel2(h);
  await h.page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 }
 const focused=(locator)=>locator.evaluate(e=>e===document.activeElement);

 test('Play starts the first level with the HUD and the tutorial',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with Play focused
  await h.waitVisible('#title');
  assert.ok(await focused(page.getByRole('button',{name:'Play'})),'Play is focused');
  // When I press Enter
  await h.tap('Enter');
  // Then level 1 starts with the HUD and the tutorial showing
  await h.until(()=>state==='play'&&levelIndex===0);
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  // And the HUD reads "Level 1" and "0 moves"
  await h.until(()=>document.getElementById('hud-level').textContent==='Level 1');
  assert.equal(await h.text('#hud-moves'),'0 moves');
 });

 test('A push moves the crate, Undo puts it back and a wall counts no move',async(h)=>{
  const {assert}=h;
  // Given level 1 just started
  await startLevel1(h);
  const start=await board(h);
  // When I press right once
  await press(h,'ArrowRight');
  // Then the player pushed the crate one cell, the HUD reads "1 move" and the tutorial is gone
  const b=await board(h);
  assert.deepEqual(b.p,[3,2]);assert.deepEqual(b.c[0],[4,2],'the crate was pushed');assert.equal(b.moves,1);
  assert.ok(!(await h.visible('#tutorial')),'the tutorial goes after the first move');
  await h.until(()=>document.getElementById('hud-moves').textContent==='1 move');
  // And Z puts the crate and the player back
  await h.tap('KeyZ');await h.until(()=>moves===0);
  assert.deepEqual(await board(h),start,'Undo restores the push');
  // And walking up into a wall counts no move
  await press(h,'ArrowUp');
  await h.tap('ArrowUp');await h.ticks(6);
  assert.equal(await h.eval(()=>moves),1,'the wall above the second step blocks');
 });

 test('Restart resets the board and can itself be undone',async(h)=>{
  const {page,assert}=h;
  // Given level 1 after two moves
  await startLevel1(h);
  const start=await board(h);
  await play(h,'UR');
  assert.equal(await h.eval(()=>moves),2);
  // When I press R
  await h.tap('KeyR');
  // Then the board and the moves are back to the start
  await h.until(()=>moves===0);
  assert.deepEqual(await board(h),start,'Restart resets');
  // And Z brings the two moves back and Backspace undoes one
  await h.tap('KeyZ');await h.until(()=>moves===2);
  await h.tap('Backspace');await h.until(()=>moves===1);
  // And the HUD's Undo and Restart buttons undo and restart too
  await press(h,'ArrowRight');
  await page.getByRole('button',{name:'Undo'}).click();
  await h.until(()=>moves===1);
  await page.getByRole('button',{name:'Restart'}).click();
  await h.until(()=>moves===0);
  assert.deepEqual(await board(h),start);
 });

 test('Esc pauses the board and the pause menu can restart the level',async(h)=>{
  const {page,assert}=h;
  // Given level 1 just started
  await startLevel1(h);
  const start=await board(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and a direction key does not move the player
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  await h.tap('ArrowRight');await h.ticks(9);
  assert.deepEqual((await board(h)).p,start.p,'no move while paused');
  // And Esc again resumes the game
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  // And Restart in the pause menu resumes with the board reset
  await press(h,'ArrowRight');
  await h.tap('Escape');await h.waitVisible('#pause');
  await page.getByRole('dialog').getByRole('button',{name:'Restart'}).click();
  await h.until(()=>!paused&&moves===0);
  assert.deepEqual(await board(h),start);
 });

 test('One d-pad press is one push and the prompts follow the gamepad',async(h)=>{
  const {assert}=h;
  // Given level 1 with a gamepad plugged in
  await startLevel1(h);
  await h.pad('connect');
  // When I press right on the d-pad once
  await h.padTap(15);
  // Then the crate is pushed one cell and one move is counted
  await h.until(()=>moves===1);
  assert.deepEqual((await board(h)).c[0],[4,2],'the d-pad pushed the crate');
  // And the Undo button shows the west button's position
  await h.until(()=>document.querySelector('#hud-undo .game-padpos[data-pos="west"]'));
  await h.shot('level1');
  await h.pad('disconnect');
 });

 test('Solving at par gives three stars, saves progress and Next Level opens level 2',async(h)=>{
  const {page,assert}=h;
  // Given level 1 just started
  await startLevel1(h);
  // When I play its six-move solution
  await solveLevel1(h);
  // Then the results read "Solved!" with three stars and the moves
  assert.equal(await h.text('#res-title'),'Solved!');
  assert.equal(await h.eval(()=>document.querySelectorAll('#results .game-stars .game-icon:not([data-off])').length),3,'3 stars at par');
  assert.ok((await h.text('#results dl')).includes('6'),'the moves are shown');
  // And the progress saves three stars and a best of 6
  assert.deepEqual(await h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.progress')).levels[0]),{stars:3,best:6});
  await h.shot('results');
  // And Next Level, focused, starts level 2
  const next=page.getByRole('button',{name:'Next Level'});
  await h.until(()=>document.activeElement.id==='res-next');
  assert.ok(await focused(next));
  await h.tap('Enter');
  await h.until(()=>state==='play'&&levelIndex===1&&moves===0);
  assert.equal(await h.text('#hud-level'),'Level 2');
 });

 test('On a phone the level fits between the HUD and the buttons',async(h)=>{
  // Given level 2 just started
  await toLevel2(h);
  // When the window turns into a portrait phone
  await h.page.setViewportSize({width:390,height:844});
  await h.until(()=>innerWidth===390);await h.ticks(2);
  // Then the whole level fits the screen's width
  await h.until(()=>cameraScale*grid.w<=mainCanvasSize.x);
  await h.shot('portrait');
 });

 test('A tap on the cell next to the player steps there, a far tap does nothing',async(h)=>{
  const {assert}=h;
  // Given level 2 just started
  await toLevel2(h);
  // When I click the cell right of the player
  const right=await h.screen(...await h.eval(()=>{const p=cellPos(player.x+1,player.y);return [p.x,p.y];}));
  await h.page.mouse.click(right.x,right.y);
  // Then the player steps there and one move is counted
  await h.until(()=>moves===1&&player.x===4);
  // And a click three cells away counts no move
  const far=await h.screen(...await h.eval(()=>{const p=cellPos(player.x-3,player.y);return [p.x,p.y];}));
  await h.page.mouse.click(far.x,far.y);await h.ticks(9);
  assert.equal(await h.eval(()=>moves),1,'a far cell is not a move');
 });

 test('Play continues at the next unsolved level',async(h)=>{
  const {page,assert}=h;
  // Given levels 1 and 2 solved
  await solveTwoLevels(h);
  // When I go back to the title and choose Play
  await page.getByRole('button',{name:'Play'}).click();
  // Then level 3 starts
  await h.until(()=>state==='play'&&levelIndex===2);
  // And more moves than par give fewer stars
  assert.deepEqual(await h.eval(()=>[stars(19,19),stars(25,19),stars(40,19)]),[3,2,1]);
  // And Quit to Title from the pause menu asks first, then goes back to the title
  await h.tap('Escape');await h.waitVisible('#pause');
  await page.getByRole('button',{name:'Quit to Title'}).click();
  await h.waitVisible('#confirm');
  assert.equal(await h.focused(),'confirm-cancel');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  await h.waitVisible('#title');
 });

 test('The results offer Try Again and Level Select',async(h)=>{
  const {page,assert}=h;
  // Given the results of level 1
  await startLevel1(h);await solveLevel1(h);
  // When I choose Try Again
  await page.getByRole('button',{name:'Try Again'}).click();
  // Then level 1 starts again with no moves
  await h.until(()=>state==='play'&&levelIndex===0&&moves===0);
  // And after solving it again, Level Select opens the level list where level 2 is open
  await solveLevel1(h);
  await page.getByRole('button',{name:'Level Select'}).click();
  await h.waitVisible('#levels');
  assert.ok(await focused(page.getByRole('button',{name:'Level 2, 0 stars'})),'level 2 is open and focused');
 });

 test('Level Select shows the stars and starts a chosen level',async(h)=>{
  const {page,assert}=h;
  // Given levels 1 and 2 solved with three stars
  await solveTwoLevels(h);
  // When I choose Levels on the title screen
  await page.getByRole('button',{name:'Levels'}).click();
  await h.waitVisible('#levels');
  // Then levels 1 and 2 show three stars, level 3 shows none and is focused
  await page.getByRole('button',{name:'Level 1, 3 stars'}).waitFor();
  await page.getByRole('button',{name:'Level 2, 3 stars'}).waitFor();
  const level3=page.getByRole('button',{name:'Level 3, 0 stars'});
  assert.ok(await focused(level3),'the next unsolved level is focused');
  assert.equal(await h.eval(()=>document.querySelectorAll('#level-1 .game-icon:not([data-off])').length),3);
  assert.equal(await h.eval(()=>document.querySelectorAll('#level-3 .game-icon:not([data-off])').length),0,'level 3 not solved yet');
  await h.shot('levels');
  // And Esc goes back to the title
  await h.tap('Escape');await h.until(()=>document.getElementById('levels').hidden);
  await h.waitVisible('#title');
  // And choosing level 2 from the list starts it
  await page.getByRole('button',{name:'Levels'}).click();await h.waitVisible('#levels');
  await page.getByRole('button',{name:'Level 2, 3 stars'}).click();
  await h.until(()=>state==='play'&&levelIndex===1&&moves===0);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Undo and Restart, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Undo'}).waitFor();
  await list.getByRole('option',{name:'Restart'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','undo','restart','pause','back']);
 });
};
