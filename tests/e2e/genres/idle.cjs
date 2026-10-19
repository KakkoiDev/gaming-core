// Coin Garden (starters/genres/idle/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 async function newGarden(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
 }
 async function goalResults(h){
  await newGarden(h);
  await h.eval(()=>{coins=GOAL-1;});
  await h.tap('Space');
  await h.waitVisible('#results');
  h.assert.equal(await h.text('#res-title'),'Garden in Full Bloom');
 }
 const savedState=(h)=>h.eval(()=>JSON.parse(localStorage.getItem(GAME_ID+'.save.auto')).state);

 test('New Game opens the garden with the keys on the game',async(h)=>{
  const {page,assert}=h;
  // Given the title screen of a first visit with New Game focused
  await h.waitVisible('#title');
  assert.ok(await page.getByRole('button',{name:'New Game'}).evaluate(e=>e===document.activeElement),'New Game is focused');
  // When I press Enter
  await h.tap('Enter');
  await h.until(()=>state==='play'&&kitPlaying);
  // Then the coins, the helper list and the earning tip show
  assert.ok(await h.visible('#hud'));assert.ok(await h.visible('#shop'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  assert.ok((await h.text('#tutorial')).includes('click the coin to earn'));
  // And the keys belong to the game, not to a helper button
  assert.equal(await h.eval(()=>document.activeElement.id),'game');
 });

 test('Space and a click on the coin earn, a click beside it does not',async(h)=>{
  const {page,assert}=h;
  // Given a new garden
  await newGarden(h);
  // When I press Space five times and click the coin
  for(let i=0;i<5;i++)await h.tap('Space');
  await h.until(()=>taps===5&&coins===5);
  const coin=await h.screen(0,2);
  await page.mouse.click(coin.x,coin.y);
  // Then I have 6 coins from 6 taps, as the HUD shows, and a +1 pops up
  await h.until(()=>taps===6);
  await h.until(()=>document.getElementById('hud-coins').textContent==='6');
  assert.ok(await h.visible('.idle-pop'),'a +amount pops from the tap');
  // And a click beside the coin earns nothing
  const beside=await h.screen(0,-8.5);
  await page.mouse.click(beside.x,beside.y);await h.ticks(6);
  assert.equal(await h.eval(()=>taps),6,'a click off the coin is not a tap');
 });

 test('Enter buys the first helper and income rises on its own',async(h)=>{
  const {assert}=h;
  // Given a new garden with enough coins for a Sprout
  await newGarden(h);
  while(await h.eval(()=>coins<cost(0)))await h.tap('Space');
  // When the buy tip shows and I press Enter
  await h.until(()=>tutStep===2);
  assert.ok((await h.text('#tutorial')).includes('first helper'));
  await h.tap('Enter');
  // Then the Sprout is Lv 1 and the HUD shows +0.5 / s
  await h.until(()=>owned[0]===1);
  assert.equal(await h.eval(()=>rate()),.5);
  await h.until(()=>document.getElementById('shop-lv-0').textContent==='Lv 1'&&document.getElementById('hud-rate').textContent==='+0.5 / s');
  // And the coins grow without a tap
  const c0=await h.eval(()=>coins);
  await h.until(c=>coins>c+.4,c0);
  assert.equal(await h.eval(()=>taps),10,'no tap since the tenth');
 });

 test('Every helper in the list is bought with a click and the keys stay with the game',async(h)=>{
  const {page,assert}=h;
  // Given a garden with 200,000 coins
  await newGarden(h);
  await h.eval(()=>{coins=200000;});
  // When I click Sprout, Bee Hive, Fountain, Windmill and Golden Tree
  await page.getByRole('button',{name:'Sprout'}).click();
  await h.until(()=>owned[0]===1);
  await page.getByRole('button',{name:'Bee Hive'}).click();
  await h.until(()=>owned[1]===1);
  await page.getByRole('button',{name:'Fountain'}).click();
  await h.until(()=>owned[2]===1);
  await page.getByRole('button',{name:'Windmill'}).click();
  await h.until(()=>owned[3]===1);
  await page.getByRole('button',{name:'Golden Tree'}).click();
  // Then each is Lv 1
  await h.until(()=>owned.join()==='1,1,1,1,1');
  await h.until(()=>[0,1,2,3,4].every(i=>document.getElementById('shop-lv-'+i).textContent==='Lv 1'));
  // And the keys still belong to the game
  assert.equal(await h.eval(()=>document.activeElement.id),'game','a click on the list keeps the keys');
  await h.shot('helpers');
 });

 test('Tab and the amount button cycle the buy amount',async(h)=>{
  const {page,assert}=h;
  // Given a new garden
  await newGarden(h);
  // When I press Tab, then click the amount button twice, then press Tab
  // Then the amount reads ×10, then ×100 and Max, then ×1 again
  await h.tap('Tab');await h.until(()=>buyMode===1);
  await h.until(()=>document.getElementById('shop-amount').textContent==='×10');
  const amount=page.getByRole('button',{name:'Buy amount'});
  await amount.click();await h.until(()=>buyMode===2);
  await h.until(()=>document.getElementById('shop-amount').textContent==='×100');
  await amount.click();await h.until(()=>buyMode===3);
  await h.until(()=>document.getElementById('shop-amount').textContent==='Max');
  await h.tap('Tab');await h.until(()=>buyMode===0);
  assert.equal(await h.eval(()=>document.activeElement.id),'game');
  // And with ×10 chosen, Enter buys ten Sprouts at once
  await h.tap('Tab');await h.until(()=>buyMode===1);
  await h.eval(()=>{coins=300;});
  await h.tap('Enter');
  await h.until(()=>owned[0]===10);
  await h.until(()=>document.getElementById('shop-lv-0').textContent==='Lv 10');
 });

 test('The gamepad earns, chooses a helper and buys it',async(h)=>{
  const {assert}=h;
  // Given a new garden with 200 coins and a gamepad
  await newGarden(h);
  await h.eval(()=>{coins=200;});
  await h.pad('connect');
  // When I press South, then down and up on the d-pad, then down and West
  // Then one tap is counted
  await h.padTap(0);await h.until(()=>taps===1);
  // And the chosen row moves to Bee Hive and back to Sprout
  await h.padTap(13);await h.until(()=>selected===1);
  assert.equal(await h.eval(()=>document.getElementById('shop-row-1').getAttribute('aria-current')),'true');
  await h.padTap(12);await h.until(()=>selected===0);
  // And West buys a Bee Hive
  await h.padTap(13);await h.until(()=>selected===1);
  await h.padTap(2);await h.until(()=>owned[1]===1&&owned[0]===0);
  await h.pad('disconnect');
 });

 test('Esc pauses and saves the garden, and Quit to Title offers Continue',async(h)=>{
  const {page,assert}=h;
  // Given a garden with two Sprouts
  await newGarden(h);
  await h.eval(()=>{owned[0]=2;});
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens, no coins come in and the garden is saved
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>coins);await h.ticks(12);
  assert.equal(await h.eval(()=>coins),frozen,'no income while paused');
  const saved=await savedState(h);
  assert.equal(saved.owned[0],2);assert.equal(saved.coins,frozen,'the pause saved the garden');
  // And Quit to Title shows the title with Continue
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  await h.waitVisible('#title');
  assert.equal(await h.text('#title-start'),'Continue');
  assert.equal((await savedState(h)).owned[0],2);
 });

 test('Coming back an hour later pays for the time away',async(h)=>{
  const {page,assert}=h;
  // Given a saved garden with two Sprouts, saved an hour ago
  await newGarden(h);
  await h.eval(()=>{owned[0]=2;});
  await h.tap('Escape');await h.waitVisible('#pause');
  const saved=await savedState(h);
  assert.equal(saved.owned[0],2);
  await h.eval(()=>{const k=GAME_ID+'.save.auto',v=JSON.parse(localStorage.getItem(k));v.savedAt=new Date(Date.parse(v.savedAt)-3600e3).toISOString();localStorage.setItem(k,JSON.stringify(v));});
  // When I open the game again
  await page.reload();
  await page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0&&typeof gcInput!=='undefined'&&gcInput.tick>0);
  // Then "While you were away (1 h 0 min)" shows before the title, with the garden restored and Collect focused
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'While you were away (1 h 0 min)','the title is skipped; welcome back first');
  assert.equal(await h.eval(()=>owned[0]),2);
  assert.equal(await h.eval(()=>coins),saved.coins,'the coins are restored');
  assert.ok(await page.getByRole('button',{name:'Collect'}).evaluate(e=>e===document.activeElement),'Collect is focused');
  await h.shot('away');
  // And Collect adds half of an hour's income
  await h.tap('Enter');
  await h.until(()=>state==='play');
  const after=await h.eval(()=>coins);
  assert.ok(after>=saved.coins+1800&&after<saved.coins+1810,`offline progress: half of an hour at 1 / s (${after-saved.coins})`);
 });

 test('Reaching a million coins opens the results with Keep Growing as the default',async(h)=>{
  const {page,assert}=h;
  // Given a garden 3 coins short of the goal
  await newGarden(h);
  await h.eval(()=>{coins=GOAL-3;});
  // When I tap three times
  for(let i=0;i<3&&await h.eval(()=>state==='play');i++)await h.tap('Space');
  // Then the results read "Garden in Full Bloom", with Keep Growing focused and Start Over with ×2 offered
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Garden in Full Bloom');
  assert.equal(await h.focused(),'goal-keep','prestige is never the default');
  assert.equal(await h.text('#goal-prestige'),'Start Over with ×2');
  await h.shot('goal');
  // And Keep Growing returns to the garden
  await page.getByRole('button',{name:'Keep Growing'}).click();
  await h.until(()=>state==='play'&&goalDone&&document.getElementById('results').hidden);
  assert.ok(await h.eval(()=>coins>=GOAL&&mult===1));
 });

 test('Starting over asks first and doubles the bonus',async(h)=>{
  const {page,assert}=h;
  // Given the Garden in Full Bloom results
  await goalResults(h);
  // When I choose Start Over with ×2
  await page.getByRole('button',{name:'Start Over with ×2'}).click();
  // Then a confirm dialog opens with Cancel focused
  await h.waitVisible('#confirm');
  assert.equal(await h.focused(),'confirm-cancel');
  assert.equal(await h.text('#confirm-ok'),'Start Over with ×2');
  // And confirming starts a new garden with Bonus ×2, where a tap earns 2
  await page.getByRole('alertdialog').getByRole('button',{name:'Start Over with ×2'}).click();
  await h.until(()=>state==='play'&&mult===2&&owned[0]===0&&coins<5);
  await h.until(()=>document.getElementById('hud-bonus').textContent==='Bonus ×2');
  const c1=await h.eval(()=>coins);await h.tap('Space');
  await h.until(c=>coins===c+2,c1);
 });

 test('Back to Title from the results keeps the garden and New Game asks before replacing it',async(h)=>{
  const {page,assert}=h;
  // Given the Garden in Full Bloom results
  await goalResults(h);
  // When I choose Back to Title
  await page.getByRole('button',{name:'Back to Title'}).click();
  // Then the title offers Continue and New Game
  await h.waitVisible('#title');
  await page.getByRole('button',{name:'Continue'}).waitFor();
  assert.ok((await savedState(h)).goalDone,'the garden is saved');
  // And New Game asks first, Cancel keeps the title
  await page.getByRole('button',{name:'New Game'}).click();
  await h.waitVisible('#confirm');
  assert.equal(await h.text('#confirm-text'),'Start a new garden? Your saved garden is lost.');
  await page.getByRole('button',{name:'Cancel'}).click();
  await h.waitHidden('#confirm');
  assert.ok(await h.visible('#title'));
  // And confirming New Game starts a fresh garden
  await page.getByRole('button',{name:'New Game'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'New Game'}).click();
  await h.until(()=>state==='play'&&coins===0&&!goalDone&&owned.every(n=>n===0));
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Earn, Buy, Buy amount and Choose a helper, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Earn'}).waitFor();
  await list.getByRole('option',{name:'Buy'}).first().waitFor();
  await list.getByRole('option',{name:'Buy amount'}).waitFor();
  await list.getByRole('option',{name:'Choose a helper'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['fire','buy','buy_amount','move','pause','back']);
 });
};
