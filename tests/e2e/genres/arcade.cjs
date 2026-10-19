// Arcade Pack (starters/genres/arcade/SCENARIOS.md): one test per scenario, named after it, each on a fresh game.
// Controls by role and name (English); world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 async function startBricks(h){
  await h.waitVisible('#title');
  await h.tap('Enter');
  await h.until(()=>state==='play'&&game.id==='bricks');
 }
 async function serve(h){await h.until(()=>bricks.waiting);await h.tap('Space');await h.until(()=>!bricks.waiting);}
 // the mouse follows the ball under the paddle until `until` holds
 async function follow(h,until,limit=20000){
  const end=Date.now()+limit;
  while(Date.now()<end&&!(await h.eval(until))){
   const ball=await h.eval(()=>({x:bricks.ball.x,y:bricks.paddle.y}));
   const p=await h.screen(ball.x,ball.y);await h.page.mouse.move(p.x,p.y);await h.ticks(1);
  }
  h.assert.ok(await h.eval(until),'reached: '+until);
 }
 async function loseEveryLife(h){
  for(let life=0;life<3;life++){
   await h.until(()=>bricks.waiting);await h.tap('Space');
   await h.page.mouse.move(5,5);
   await h.eval(()=>{bricks.ball=vec2(bricks.paddle.x+8,-8);bricks.vel=vec2(0,-.4);});
  }
 }

 test('The title menu moves with the gamepad and shows button positions',async(h)=>{
  const {assert}=h;
  // Given the title screen with Bricks focused
  const {page}=h;
  const focused=(locator)=>locator.evaluate(e=>e===document.activeElement);
  const bricks=page.getByRole('button',{name:'Bricks'});
  const snake=page.getByRole('button',{name:'Snake'});
  await h.waitVisible('#title');
  assert.ok(await focused(bricks));
  // When I plug a gamepad and press down, then up, on the d-pad
  await h.pad('connect');await h.padTap(13);
  // Then focus moves to Snake and back to Bricks
  await h.until(()=>document.activeElement.id==='title-snake');
  assert.ok(await focused(snake));
  // And the confirm prompt shows the south button's position, never a letter
  assert.ok(await h.visible('#title .game-hint .game-padpos[data-pos="south"]'),'gamepad prompt by position');
  await h.padTap(12);await h.until(()=>document.activeElement.id==='title-bricks');
  assert.ok(await focused(bricks));
  await h.pad('disconnect');
 });

 test('The mouse paddle breaks bricks and the HUD shows the score',async(h)=>{
  const {assert}=h;
  // Given a game of Bricks after Enter, with the serve tutorial showing
  await startBricks(h);
  assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
  await h.waitVisible('#tutorial');
  // When I serve with Space and follow the ball with the mouse
  await serve(h);
  await follow(h,()=>score>=30);
  // Then bricks break and the score reaches 30
  assert.ok(await h.eval(()=>bricks.wall.length<=37));
  // And the HUD shows the score
  await h.until(()=>document.getElementById('hud-score').textContent===fmt(score));
  await h.shot('bricks');
 });

 test('Clearing the wall opens Next Level',async(h)=>{
  const {page,assert}=h;
  // Given a game of Bricks with one brick left and the ball under it
  await startBricks(h);await serve(h);
  // When the ball breaks the last brick
  await h.eval(()=>{bricks.wall.splice(1);const b=bricks.wall[0];bricks.ball=b.pos.add(vec2(0,-3));bricks.vel=vec2(0,.3);});
  // Then the results read "Wall Cleared"
  await h.waitVisible('#results');
  assert.equal(await h.text('#res-title'),'Wall Cleared');
  // And Next Level starts level 2 with a full wall
  await page.getByRole('button',{name:'Next Level'}).click();
  await h.until(()=>state==='play'&&level===2&&bricks.wall.length===40);
 });

 test('Losing every life with a top score asks for a name',async(h)=>{
  const {page,assert}=h;
  // Given a game of Bricks with 30 points
  await startBricks(h);
  await h.eval(()=>{score=30;});
  // When the ball falls past the paddle three times
  await loseEveryLife(h);
  // Then the results ask for my name
  const name=page.getByLabel('Your name');
  await name.waitFor();
  // And after I type "ace" the high score table shows ACE
  await name.fill('ace');await name.press('Enter');
  await h.until(()=>document.querySelector('.game-scores')?.textContent.includes('ACE'));
  assert.equal(await h.eval(()=>highScores('bricks').list()[0].name),'ACE');
  await h.shot('scores');
  // And Try Again starts a new game at 0
  await page.getByRole('button',{name:'Try Again'}).click();
  await h.until(()=>state==='play'&&score===0);
 });

 test('Esc pauses the world and Esc resumes',async(h)=>{
  const {assert}=h;
  // Given a ball in play in Bricks
  await startBricks(h);await serve(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the pause menu opens and the ball stops
  await h.waitVisible('#pause');
  assert.ok(await h.eval(()=>paused));
  const frozen=await h.eval(()=>bricks.ball.y);await h.ticks(12);
  assert.equal(await h.eval(()=>bricks.ball.y),frozen,'the ball stops while paused');
  // And Esc again resumes the game
  await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);
 });

 test('Quit from the pause menu asks first, then goes back to the title',async(h)=>{
  const {page,assert}=h;
  // Given the pause menu is open during Bricks
  await startBricks(h);
  await h.tap('Escape');await h.waitVisible('#pause');
  // When I choose Quit to Title
  await page.getByRole('button',{name:'Quit to Title'}).click();
  // Then a confirm dialog opens with Cancel focused
  await h.waitVisible('#confirm');
  assert.equal(await h.focused(),'confirm-cancel','Cancel is focused');
  // And Cancel keeps me in the pause menu
  await page.getByRole('button',{name:'Cancel'}).click();
  await h.waitVisible('#pause');
  // And confirming Quit to Title shows the title screen
  await page.getByRole('button',{name:'Quit to Title'}).click();await h.waitVisible('#confirm');
  await page.getByRole('alertdialog').getByRole('button',{name:'Quit to Title'}).click();
  await h.waitVisible('#title');
 });

 test('Snake eats, turns, and a crash records a high score',async(h)=>{
  const {page}=h;
  // Given a game of Snake chosen from the title with the arrow keys
  await h.waitVisible('#title');
  await h.tap('ArrowDown');await h.tap('Enter');
  await h.until(()=>state==='play'&&game.id==='snake');
  // When the snake eats the food in front of it and I turn up
  await h.eval(()=>{snake.food=snake.body[0].add(vec2(2,0));});
  await h.until(()=>score===10&&snake.body.length===4);
  await h.tap('ArrowUp');await h.until(()=>snake.dir.y===1);
  // Then the score is 10 and the snake is 4 long
  await h.shot('snake');
  // And crashing into the wall asks for my name and records 10
  const name=page.getByLabel('Your name');
  await name.waitFor({timeout:15000});
  await name.fill('sna');
  await page.getByRole('button',{name:'Confirm'}).click();
  await h.until(()=>highScores('snake').list()[0]?.score===10);
  // And Back to Title returns to the title
  await page.getByRole('button',{name:'Back to Title'}).click();
  await h.until(()=>state==='title');
 });

 test('Paddle scores a point and wins at 7',async(h)=>{
  const {page,assert}=h;
  // Given a game of Paddle chosen with the mouse
  await h.waitVisible('#title');
  await page.getByRole('button',{name:'Paddle'}).click();
  await h.until(()=>state==='play'&&game.id==='paddle');
  // When I serve and the ball passes the other paddle
  await h.tap('Space');await h.until(()=>!paddle.waiting);
  await h.eval(()=>{paddle.ball=vec2(15.5,0);paddle.vel=vec2(.4,0);});
  // Then my score is 1
  await h.until(()=>score===1&&paddle.waiting);
  // And at 7 the results read "You Win"
  await h.eval(()=>{score=6;});await h.tap('Space');
  await h.eval(()=>{paddle.ball=vec2(15.5,0);paddle.vel=vec2(.4,0);});
  await h.waitVisible('#results');assert.equal(await h.text('#res-title'),'You Win');
  // And Try Again starts a new game of Paddle
  await page.getByRole('button',{name:'Try Again'}).click();
  await h.until(()=>state==='play'&&game.id==='paddle'&&score===0);
 });

 test('The on-screen Serve button serves on a touch screen',async(h)=>{
  const {page}=h;
  // Given a game of Bricks played on a touch screen
  await startBricks(h);
  await h.eval(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await h.until(()=>document.getElementById('game').dataset.device==='touch');
  await h.until(()=>bricks.waiting);
  // When I press the on-screen Serve button
  await h.touch(page.getByRole('button',{name:'Serve'}));
  // Then the ball is served
  await h.until(()=>!bricks.waiting);
 });

 test('The controls list shows every action of this game',async(h)=>{
  const {page}=h;
  // Given the Controls screen opened from Settings
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('tab',{name:'Controls'}).click();
  // When I read the list
  const list=page.getByRole('listbox',{name:'Controls'});
  await list.waitFor();
  // Then it shows Move and Serve, then the fixed Pause and Back (menus) rows
  await list.getByRole('option',{name:'Move'}).waitFor();
  await list.getByRole('option',{name:'Serve'}).waitFor();
  await list.getByRole('option',{name:'Pause'}).waitFor();
  await list.getByRole('option',{name:'Back (menus)'}).waitFor();
  h.assert.deepEqual(await h.eval(()=>[...document.querySelectorAll('#controls .game-list > li')].map(li=>li.dataset.action)),['move','serve','pause','back']);
 });
};
