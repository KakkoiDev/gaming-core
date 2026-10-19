// Sunny Acre (starters/genres/cozy/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const at=(h)=>h.eval(()=>({x:player.x,y:player.y,fx:player.face.x,fy:player.face.y}));
 const tile=(h,x,y)=>h.eval(([x,y])=>({...tiles[y*W+x]}),[x,y]);
 async function newFarm(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&day===1&&kitPlaying);
 }
 // arrows: a new direction turns first, the same direction steps one tile
 async function face(h,key,fx,fy){
  await h.tap(key);
  const p=await at(h);h.assert.deepEqual([p.fx,p.fy],[fx,fy],'facing '+key);
 }
 async function stepTo(h,x){
  for(let i=0;i<30&&(await at(h)).x!==x;i++)await h.tap((await at(h)).x<x?'ArrowRight':'ArrowLeft');
  h.assert.equal((await at(h)).x,x,'walked to x='+x);
 }
 // Enter on each of Mabel's lines once it is fully shown (the ▼ mark), until her choices show
 async function talkToChoices(h){
  await h.tap('KeyE');await h.waitVisible('#dialogue');
  const choices='#dialogue [data-choice="0"]';
  for(let i=0;i<10;i++){
   await h.until(c=>{const e=document.querySelector(c);return (e&&!e.closest('[hidden]'))||!!document.querySelector('#dlg-line .game-more');},choices);
   if(await h.visible(choices))break;
   await h.tap('Enter');
  }
  await h.waitVisible(choices);
 }
 const besideMabel=()=>{player={x:13,y:6,face:vec2(0,1),draw:tilePos(13,6)};};

 test('New Game starts the first spring morning and autosaves it',async(h)=>{
  const {page,assert}=h;
  // Given the title screen with no save, New Game focused and no Continue
  await h.waitVisible('#title');
  assert.ok(await page.getByRole('button',{name:'New Game'}).evaluate(e=>e===document.activeElement),'New Game is focused');
  assert.ok(!(await h.visible('#title-continue')));
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play'&&day===1);
  // Then the HUD shows Spring 1, 6:00 and the Hoe
  assert.ok(await h.visible('#hud'));
  await h.until(()=>document.getElementById('hud-day').textContent==='Spring 1');
  assert.equal(await h.text('#hud-time'),'6:00');
  assert.equal(await h.text('#hud-tool'),'Hoe');
  // And the tool tip shows and the first morning is autosaved
  await h.waitVisible('#tutorial');
  assert.ok(await h.eval(()=>saveRead('auto').state.day===1),'autosave on the first morning');
 });

 test('Tools change with the shoulders, Q and R and the hotbar, and the d-pad turns before it steps',async(h)=>{
  const {page,assert}=h;
  // Given the first morning of a new farm and a gamepad
  await newFarm(h);
  await h.pad('connect');
  // When I press the right shoulder, then the left one
  await h.padTap(5);await h.until(()=>tool===1);
  // Then the tool goes to Turnip Seeds, outlined on the hotbar, and back to the Hoe
  await h.until(()=>document.getElementById('hud-tool').textContent==='Turnip Seeds');
  assert.equal(await h.eval(()=>document.querySelector('#hot-1').getAttribute('aria-selected')),'true','the hotbar outlines the tool');
  await h.padTap(4);await h.until(()=>tool===0);
  // And R picks the next tool, Q the previous one, and a click on the Watering Can slot picks it
  await h.tap('KeyR');await h.until(()=>tool===1);
  await h.tap('KeyQ');await h.until(()=>tool===0);
  await page.getByRole('gridcell',{name:'Watering Can'}).click();
  await h.until(()=>tool===2&&document.getElementById('hud-tool').textContent==='Watering Can');
  // And the first press right on the d-pad only turns me, the second steps one tile
  // (held only until the turn shows: a slow machine runs several world steps per input tick)
  await h.ready();await h.pad('button',15,true);await h.until(()=>player.face.x===1);await h.pad('button',15,false);
  assert.equal((await at(h)).x,4,'a new direction only turns');
  await h.ready();await h.pad('button',15,true);await h.until(()=>player.x===5);await h.pad('button',15,false);
  await h.pad('disconnect');
 });

 test('The hoe, the seeds and the watering can work the tile in front',async(h)=>{
  const {assert}=h;
  // Given the first morning of a new farm, facing the field
  await newFarm(h);
  assert.deepEqual(await at(h),{x:4,y:6,fx:0,fy:-1});
  // When I press C with the Hoe, then 2 and C, then 3 and C
  await h.tap('KeyC');
  // Then the tile is tilled, costing energy, and the tool tip goes
  await h.until(()=>tiles[5*W+4].till===1);
  assert.equal(await h.eval(()=>energy),98,'a tool use costs energy');
  await h.waitHidden('#tutorial');
  // And a seed is planted, leaving 9 seeds
  await h.tap('Digit2');await h.until(()=>tool===1);
  await h.tap('KeyC');await h.until(()=>tiles[5*W+4].crop===0);
  await h.until(()=>document.getElementById('hud-seeds').textContent==='9');
  // And the tile is watered
  await h.tap('Digit3');await h.until(()=>tool===2);
  await h.tap('KeyC');await h.until(()=>tiles[5*W+4].wet===1);
  await h.shot('farm');
 });

 test('Sleeping in the bed ends the day and the watered seed sprouts',async(h)=>{
  const {page,assert}=h;
  // Given a watered seed planted on the first day
  await newFarm(h);
  await h.eval(()=>{tiles[5*W+4]={till:1,wet:1,crop:0};});
  // When I walk to the bed, press E and choose Sleep
  await face(h,'ArrowLeft',-1,0);await stepTo(h,2);
  await h.tap('ArrowLeft');assert.equal((await at(h)).x,2,'the bed blocks the way');
  await h.tap('KeyE');await h.waitVisible('#confirm');
  assert.equal(await h.focused(),'confirm-cancel');
  await page.getByRole('button',{name:'Sleep'}).click();
  // Then the results read "End of Day 1" and the seed has sprouted
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'End of Day 1');
  assert.deepEqual(await tile(h,4,5),{till:1,wet:0,crop:1},'the watered seed sprouts overnight');
  await h.shot('night');
  // And Next Morning starts Spring 2 and autosaves it
  assert.ok(await page.getByRole('button',{name:'Next Morning'}).evaluate(e=>e===document.activeElement),'Next Morning is focused');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&day===2);
  await h.until(()=>document.getElementById('hud-day').textContent==='Spring 2');
  assert.equal(await h.eval(()=>saveRead('auto').state.day),2,'autosave each morning');
 });

 test('The clock runs and the day ends by itself at midnight',async(h)=>{
  const {page,assert}=h;
  // Given the first morning of a new farm
  await newFarm(h);
  // When time passes
  const clock=await h.eval(()=>minutes);
  await h.ticks(30);
  // Then the clock moves on
  assert.ok(await h.eval(c=>minutes>c,clock),'the day clock runs');
  // And at 24:00 the results read "End of Day 1"
  await h.eval(()=>{minutes=DAY_END-1/60;});
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'End of Day 1');
  // And Next Morning starts Spring 2
  await page.getByRole('button',{name:'Next Morning'}).click();
  await h.until(()=>state==='play'&&day===2);
 });

 test('A ripe turnip is harvested and sold at the bin, reaching the farm goal',async(h)=>{
  const {page,assert}=h;
  // Given a ripe turnip in front of me and 480 coins
  await newFarm(h);
  await h.eval(()=>{tiles[5*W+4]={till:1,wet:0,crop:CROPS.turnip.nights};coins=GOAL-20;});
  // When I pick it with the Hands and press E at the bin
  await h.tap('Digit4');await h.until(()=>tool===3);
  await h.tap('KeyC');
  // Then the HUD counts one turnip, then sells it for 30 g
  await h.until(()=>crops===1&&tiles[5*W+4].crop===-1);
  await h.until(()=>document.getElementById('hud-crops').textContent==='Turnips: 1');
  await face(h,'ArrowRight',1,0);await stepTo(h,13);
  await h.tap('KeyE');
  await h.until(()=>coins===GOAL+10&&crops===0);
  // And the results read "Farm Goal Reached"
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Farm Goal Reached');
  await h.shot('goal');
  // And Keep Farming returns to the farm with 510 g
  await page.getByRole('button',{name:'Keep Farming'}).click();
  await h.until(()=>state==='play'&&kitPlaying);
  await h.until(()=>document.getElementById('hud-money').textContent==='510 g');
 });

 test('Mabel talks and shares seeds once a day',async(h)=>{
  const {page,assert}=h;
  // Given I face Mabel on the first day
  await newFarm(h);
  await h.eval(besideMabel);
  // When I talk to her and answer "Any seeds to spare?"
  await talkToChoices(h);
  await h.shot('talk');
  await page.getByRole('button',{name:'Any seeds to spare?'}).click();
  // Then I have 15 seeds and the HUD says so
  await h.until(()=>seeds===15&&!dialogueOpen());
  await h.until(()=>document.getElementById('hud-msg').textContent==='Mabel gave you 5 seeds');
  assert.equal(await h.text('#hud-seeds'),'15');
  // And asking again the same day gives no more seeds
  await talkToChoices(h);
  await page.getByRole('button',{name:'Any seeds to spare?'}).click();
  await h.until(()=>!dialogueOpen()&&document.getElementById('hud-msg').textContent==='Mabel already shared seeds today');
  assert.equal(await h.eval(()=>seeds),15);
  // And "Just saying hi" ends the talk with nothing given
  await talkToChoices(h);
  await page.getByRole('button',{name:'Just saying hi'}).click();
  await h.until(()=>!dialogueOpen());
  assert.equal(await h.eval(()=>seeds),15);
 });

 test('Esc pauses the clock and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given the farm day is running
  await newFarm(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the clock stops
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>minutes);await h.ticks(12);
  assert.equal(await h.eval(()=>minutes),frozen,'the clock stops while paused');
  // And Esc again resumes the day
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
  await h.until(m=>minutes>m,frozen);
 });

 test('Continue after a reload brings back the saved morning',async(h)=>{
  const {page,assert}=h;
  // Given a farm autosaved on the morning of Spring 3 with a young turnip
  await newFarm(h);
  await h.eval(()=>{day=3;tiles[5*W+4]={till:1,wet:0,crop:2};seeds=7;autosave();});
  // When I quit to the title, reload the page and choose Continue
  await h.tap('Escape');await h.waitVisible('#pause');
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  await h.waitVisible('#title');
  await page.reload();
  await h.waitVisible('#title');
  // Then Continue was focused and showed Spring 3
  const resume=page.getByRole('button',{name:'Continue'});
  assert.ok(await resume.evaluate(e=>e===document.activeElement),'Continue is focused');
  assert.ok((await h.text('#title-continue-detail')).startsWith('Spring 3'));
  await h.tap('Enter');
  // And the farm comes back as it was saved
  await h.until(()=>state==='play'&&day===3);
  assert.deepEqual(await tile(h,4,5),{till:1,wet:0,crop:2},'Continue restores the farm');
  assert.equal(await h.eval(()=>seeds),7);
  await h.until(()=>document.getElementById('hud-day').textContent==='Spring 3');
 });

 test('Leaving at the farm goal keeps the save and New Game asks before replacing it',async(h)=>{
  const {page,assert}=h;
  // Given a saved farm at the Farm Goal Reached results
  await newFarm(h);
  await h.eval(()=>{crops=1;coins=GOAL-20;player={x:13,y:6,face:vec2(1,0),draw:tilePos(13,6)};});
  await h.tap('KeyE');
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Farm Goal Reached');
  // When I choose Back to Title
  await page.getByRole('button',{name:'Back to Title'}).click();
  // Then the title shows Continue, focused
  await h.waitVisible('#title');
  await h.until(()=>document.activeElement.id==='title-continue');
  // And New Game asks first, Cancel keeps the title
  await page.getByRole('button',{name:'New Game'}).click();
  await h.waitVisible('#confirm');
  assert.equal(await h.text('#confirm-text'),'Start a new farm? The autosave is replaced.');
  await page.getByRole('button',{name:'Cancel'}).click();
  await h.waitHidden('#confirm');
  assert.ok(await h.visible('#title'));
  // And confirming New Game starts a fresh farm on Spring 1
  await page.getByRole('button',{name:'New Game'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'New Game'}).click();
  await h.until(()=>state==='play'&&day===1&&coins===0&&crops===0);
 });

 test('The on-screen Use, Tool and Talk buttons farm on a touch screen',async(h)=>{
  const {page}=h;
  // Given the first morning of a new farm on a touch screen
  await newFarm(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  // When I press Use, then Tool, then Talk in front of Mabel
  await h.touch(page.getByRole('button',{name:'Use',exact:true}));
  // Then the tile in front is tilled
  await h.until(()=>tiles[5*W+4].till===1);
  // And the next tool is picked
  await h.touch(page.getByRole('button',{name:'Tool',exact:true}));
  await h.until(()=>tool===1);
  // And Mabel starts talking
  await h.eval(besideMabel);
  await h.touch(page.getByRole('button',{name:'Talk',exact:true}));
  await h.waitVisible('#dialogue');
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move, Use Tool, Talk / Harvest, Next Tool and Previous Tool, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Use Tool'}).waitFor();
  await list.getByRole('option',{name:'Talk / Harvest'}).waitFor();
  await list.getByRole('option',{name:'Next Tool'}).waitFor();
  await list.getByRole('option',{name:'Previous Tool'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','fire','interact','tool_next','tool_prev','pause','back']);
 });
};
