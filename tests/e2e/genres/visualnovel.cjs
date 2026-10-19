// Lantern Lane (starters/genres/visualnovel/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const now=(h)=>h.eval(()=>dialogueState&&{i:dialogueState.i,shown:dialogueState.shown,len:dialogueState.text.length,scene,line:currentLine()});
 const choicesShown=()=>{const b=document.querySelector('#dialogue [data-choice]');return !!b&&!b.closest('[hidden]');};
 // Enter until the stop condition holds (a choice on screen, the ending): each Enter completes a line or advances it
 async function advanceUntil(h,stop,limit=60){
  for(let n=0;n<limit&&!(await h.eval(stop));n++)await h.tap('Enter');
  h.assert.ok(await h.eval(stop),'reached: '+stop);
 }
 async function startStory(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&dialogueState&&dialogueState.i===0);
  await h.waitVisible('#dialogue');
 }
 // the line typed out in full, then the next one
 async function nextLine(h){
  const i=await h.eval(()=>dialogueState.i);
  for(let n=0;n<4&&(await h.eval(i=>dialogueState.i===i,i));n++)await h.tap('Enter');
  await h.until(i=>dialogueState.i===i+1,i);
 }
 async function toKeeperChoice(h){
  await startStory(h);
  await advanceUntil(h,choicesShown);
  h.assert.equal((await now(h)).scene,'keeper');
 }
 async function toSearch(h){
  await toKeeperChoice(h);
  await h.tap('ArrowDown');await h.tap('Enter');
  await h.until(()=>scene==='search'&&flags.searched&&state==='play'&&dialogueState&&dialogueState.i===0);
 }
 async function toRiverChoice(h){
  await toSearch(h);
  await advanceUntil(h,choicesShown);
  h.assert.equal((await now(h)).scene,'river');
 }
 const slot1=(h)=>h.eval(()=>{const s=localStorage.getItem(GAME_ID+'.save.1');return s&&JSON.parse(s).state;});
 // on the second line of the search scene, saved in slot 1 from the pause menu, back in the scene
 async function savedAtSearch(h){
  const {page}=h;
  await toSearch(h);
  await nextLine(h);
  await h.tap('Escape');await h.waitVisible('#pause');
  await page.locator('#pause').getByRole('button',{name:'Save'}).click();
  await h.waitVisible('#saves');
  await page.getByRole('option',{name:'Slot 1'}).click();
  await h.until(()=>!!localStorage.getItem(GAME_ID+'.save.1'));
  await h.tap('Escape');await h.waitHidden('#saves');
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 }
 async function reload(h){
  await h.page.reload();
  await h.until(()=>typeof mainCanvas!=='undefined'&&time>0&&typeof gcInput!=='undefined'&&gcInput.tick>0&&!!document.querySelector('#title:not([hidden])'));
 }

 test('The title offers Start and no Continue before a save',async(h)=>{
  const {page,assert}=h;
  // Given the title screen of a first visit
  await h.waitVisible('#title');
  // When I look at the menu
  // Then Start is focused, Continue is hidden and Load Game is disabled
  assert.equal(await h.focused(),'title-new');
  assert.ok(!(await h.visible('#title-continue')),'no Continue before a save');
  assert.ok(await h.eval(()=>document.getElementById('title-load').disabled),'Load Game is disabled');
  // And choosing Start types the first line of the story
  await page.getByRole('button',{name:'Start'}).click();
  await h.until(()=>state==='play'&&dialogueState&&dialogueState.i===0);
  await h.waitVisible('#dialogue');
 });

 test('Enter finishes a typing line, then goes to the next one',async(h)=>{
  const {assert}=h;
  // Given the first line of the story still typing
  await startStory(h);
  const l=await now(h);
  assert.ok(l.shown<l.len,'the line is still typing');
  // When I press Enter
  await h.tap('Enter');
  // Then the whole line shows
  await h.until(()=>dialogueState.i===0&&dialogueState.shown===dialogueState.text.length);
  // And Enter again shows the next line, spoken by Mika
  await h.tap('Enter');
  await h.until(()=>dialogueState.i===1);
  assert.equal(await h.text('#dlg-speaker'),'Mika');
  await h.shot('scene');
 });

 test("The gamepad's south button is Next line too",async(h)=>{
  // Given the second line of the story
  await startStory(h);
  await nextLine(h);
  await h.until(()=>dialogueState.shown<dialogueState.text.length);
  // When I plug a gamepad and press the south button twice
  await h.pad('connect');
  await h.padTap(0);
  // Then the line finishes, then the third line shows
  await h.until(()=>dialogueState.shown===dialogueState.text.length);
  await h.padTap(0);await h.until(()=>dialogueState.i===2);
  await h.pad('disconnect');
 });

 test('The log shows the lines so far and closes again',async(h)=>{
  const {page,assert}=h;
  // Given the third line of the story
  await startStory(h);
  await nextLine(h);await nextLine(h);
  // When I press L
  await h.tap('KeyL');await h.waitVisible('#backlog');
  // Then the log lists the lines so far with what Mika said
  assert.ok((await h.eval(()=>document.querySelectorAll('#backlog .game-list > li').length))>=3);
  assert.ok((await h.text('#backlog .game-list')).includes('You came!'),'the log has what Mika said');
  // And Esc closes it and the box keeps its place
  await h.tap('Escape');await h.until(()=>!document.getElementById('backlog')||document.getElementById('backlog').hidden);
  assert.ok(await h.visible('#dialogue'));assert.equal((await now(h)).i,2);
  // And the Log button on the box opens it again and Close closes it
  await page.locator('#vn-box').getByRole('button',{name:'Log'}).click();
  await h.waitVisible('#backlog');
  await page.getByRole('button',{name:'Close'}).click();
  await h.until(()=>!document.getElementById('backlog')||document.getElementById('backlog').hidden);
  assert.equal((await now(h)).i,2);
 });

 test('Choosing with the keys follows the search route',async(h)=>{
  // Given the Keeper's question with its two choices
  await toKeeperChoice(h);
  await h.shot('choice');
  // When I press down and Enter
  await h.tap('ArrowDown');
  const search=h.page.getByRole('button',{name:'Look for the missing lantern'});
  await h.until(()=>document.activeElement?.dataset.choice==='1');
  h.assert.ok(await search.evaluate(e=>e===document.activeElement),'the second choice is focused');
  await h.tap('Enter');
  // Then the search scene opens and the story remembers that I searched
  await h.until(()=>scene==='search'&&flags.searched&&!flags.helped&&state==='play'&&dialogueState&&dialogueState.i===0);
 });

 test('Clicking a choice follows the helping route',async(h)=>{
  const {page,assert}=h;
  // Given the Keeper's question with its two choices
  await toKeeperChoice(h);
  // When I click "Help light the lanterns"
  await page.getByRole('button',{name:'Help light the lanterns'}).click();
  // Then the lighting scene opens
  await h.until(()=>scene==='lighting'&&flags.helped&&state==='play'&&dialogueState&&dialogueState.i===0);
  // And at the river Mika says the line of the helping route
  await advanceUntil(h,choicesShown);
  assert.equal((await now(h)).scene,'river');
  assert.deepEqual(await h.eval(()=>sceneLines('river').map(x=>x.t)),['s.river.1','s.river.2','s.river.4']);
  await h.tap('KeyL');await h.waitVisible('#backlog');
  assert.ok((await h.text('#backlog .game-list')).includes('Your hands smell of lamp oil.'));
 });

 test('Esc pauses the scene',async(h)=>{
  const {page,assert}=h;
  // Given a line of the search scene
  await toSearch(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the scene stops
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>time);await h.ticks(12);
  assert.equal(await h.eval(()=>time),frozen,'the scene stops while paused');
  // And Resume brings the box back
  await page.getByRole('button',{name:'Resume'}).click();
  await h.until(()=>!paused&&document.getElementById('pause').hidden);
  assert.ok(await h.visible('#dialogue'));
 });

 test('Saving from the pause menu keeps the scene, the line and the choices',async(h)=>{
  const {assert}=h;
  // Given the second line of the search scene
  // When I open the pause menu, choose Save and pick Slot 1
  await savedAtSearch(h);
  // Then slot 1 holds the search scene, line 2 and the search choice
  const saved=await slot1(h);
  assert.deepEqual([saved.scene,saved.line,saved.flags.searched],['search',1,true]);
 });

 test('Saving over a used slot asks first',async(h)=>{
  const {page,assert}=h;
  // Given slot 1 already holds a save
  await savedAtSearch(h);
  await advanceUntil(h,choicesShown);
  // When I press the Save button on the box and pick Slot 1
  await page.locator('#vn-box').getByRole('button',{name:'Save'}).click();
  await h.waitVisible('#saves');
  await page.getByRole('option',{name:'Slot 1'}).click();
  // Then a confirm dialog asks before replacing it
  await h.waitVisible('#confirm');
  assert.equal((await slot1(h)).scene,'search','nothing replaced yet');
  // And Overwrite saves the current line in slot 1
  await page.getByRole('button',{name:'Overwrite'}).click();
  await h.until(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.1')).state.scene==='river');
 });

 test('Releasing the lantern reaches ending 1',async(h)=>{
  const {page,assert}=h;
  // Given the river's choice on the search route
  await toRiverChoice(h);
  assert.deepEqual(await h.eval(()=>sceneLines('river').map(x=>x.t)),['s.river.1','s.river.3','s.river.4']);
  await page.getByRole('button',{name:'Release it on the river'}).waitFor();
  // When I press 1
  await h.tap('Digit1');
  // Then the story reaches "Ending 1 of 2: The River Lights"
  await h.until(()=>scene==='endA'&&state==='play');
  await advanceUntil(h,()=>state==='ending');
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Ending 1 of 2: The River Lights');
  await h.shot('ending-a');
  // And Back to Title shows the title screen
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.waitVisible('#title');
 });

 test('Continue after a reload brings back the saved line',async(h)=>{
  const {page,assert}=h;
  // Given a save in slot 1 on the search scene and a reloaded page
  await savedAtSearch(h);
  const saved=await slot1(h);
  await reload(h);
  // When I choose Continue, which is focused
  assert.equal(await h.focused(),'title-continue');
  assert.ok((await h.text('#title-continue-detail')).includes('Lantern Lane'));
  await page.getByRole('button',{name:'Continue'}).click();
  // Then the saved scene, line and choices are back
  await h.until(s=>state==='play'&&dialogueState&&scene===s.scene&&currentLine()===s.line,saved);
  assert.ok(await h.eval(()=>flags.searched&&dialogueState.text===t(sceneLines(scene)[currentLine()].t)),'the saved line is back');
 });

 test('Load Game opens a saved slot',async(h)=>{
  const {page}=h;
  // Given a save in slot 1 on the search scene and a reloaded page
  await savedAtSearch(h);
  const saved=await slot1(h);
  await reload(h);
  // When I choose Load Game and pick Slot 1
  await page.getByRole('button',{name:'Load Game'}).click();
  await h.waitVisible('#saves');
  await page.getByRole('option',{name:'Slot 1'}).click();
  // Then the saved scene and line are back
  await h.until(s=>state==='play'&&dialogueState&&scene===s.scene&&currentLine()===s.line&&flags.searched,saved);
 });

 test('Auto advances the lines by itself and A turns it off',async(h)=>{
  const {page,assert}=h;
  // Given a line of the search scene
  await toSearch(h);
  const before=(await now(h)).line;
  // When I press the Auto button on the box
  await page.getByRole('button',{name:'Auto'}).click();
  assert.ok(await h.eval(()=>auto));
  // Then the lines advance without a press
  await h.until(b=>currentLine()>b||scene!=='search',before);
  // And A turns Auto off
  await h.tap('KeyA');
  await h.until(()=>!auto);
  // And the Menu button on the box opens the pause menu
  await page.getByRole('button',{name:'Menu'}).click();
  await h.waitVisible('#pause');
 });

 test('Carrying the lantern back reaches ending 2 and both endings are listed',async(h)=>{
  const {page,assert}=h;
  // Given ending 1 found before and the river's choice
  await h.eval(()=>writeSaveData(ENDINGS_KEY,{list:[1]}));
  await toRiverChoice(h);
  // When I press down and Enter
  await h.tap('ArrowDown');
  const carry=page.getByRole('button',{name:'Carry it back to the lane'});
  await h.until(()=>document.activeElement?.dataset.choice==='1');
  assert.ok(await carry.evaluate(e=>e===document.activeElement),'the second choice is focused');
  await h.tap('Enter');
  // Then the story reaches "Ending 2 of 2: The Lane at Dawn" with 2 / 2 endings found
  await h.until(()=>scene==='endB'&&state==='play');
  await advanceUntil(h,()=>state==='ending');
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Ending 2 of 2: The Lane at Dawn');
  assert.ok((await h.text('#results dl')).includes('2 / 2'));
  await h.tap('Enter');await h.waitVisible('#title');
  // And Endings on the title lists both, and Close closes it
  await page.getByRole('button',{name:'Endings'}).click();
  await h.waitVisible('#endings');
  assert.equal(await h.eval(()=>document.querySelectorAll('#endings [data-found]').length),2);
  await page.getByRole('button',{name:'Close'}).click();
  await h.until(()=>!document.getElementById('endings')||document.getElementById('endings').hidden);
 });

 test('In a portrait window the box sits under the scene',async(h)=>{
  const {page,assert}=h;
  // Given a line of the story in a portrait window
  await startStory(h);
  await page.setViewportSize({width:390,height:844});
  await h.until(()=>mainCanvas.width<mainCanvas.height);
  // When I look at the screen
  await h.shot('portrait');
  // Then the dialogue box is at the bottom, inside the window
  const box=await h.eval(()=>{const r=document.querySelector('#dialogue .game-panel').getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};});
  assert.ok(box.top>844/2,'the box is in the lower half');
  assert.ok(box.bottom<=844&&box.left>=0&&box.right<=390,'the box is inside the window');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Next line, Log and Auto, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Next line'}).waitFor();
  await list.getByRole('option',{name:'Log'}).waitFor();
  await list.getByRole('option',{name:'Auto'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['confirm','log','auto','pause','back']);
 });
};
