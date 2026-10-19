// pong (starters/pong/SCENARIOS.md): one test per scenario, named after it. Canvas only: keys, mouse and a mocked
// gamepad; world state set through the game's globals only to arrange a Given.
module.exports=function(test){

 const inView=h=>h.eval(()=>{const l=worldToScreen(vec2(leftX-paddleSize.x/2,leftY)),r=worldToScreen(vec2(rightX+paddleSize.x/2,rightY));
  const top=worldToScreen(vec2(0,fieldSize.y/2)),bottom=worldToScreen(vec2(0,-fieldSize.y/2));
  return l.x>=0&&r.x<=mainCanvasSize.x&&top.y>=0&&bottom.y<=mainCanvasSize.y;});
 const waiting=h=>h.until(()=>typeof leftX!=='undefined'&&waitingToServe===true);
 const inPlay=async h=>{await waiting(h);await h.page.mouse.click(500,350);await h.until(()=>!waitingToServe&&ballVel.length()>0);};
 const score=h=>h.eval(()=>{ball.x=fieldSize.x;ballVel.x=ballSpeed;});

 test('The whole field fits a 1000 by 700 window and a phone view',async(h)=>{
  const {page,assert}=h;
  // Given pong in a 1000 by 700 window
  await waiting(h);
  // When I look at the field
  // Then both paddles and the field are inside the view
  assert.ok(await inView(h),'paddles and field inside the 1000x700 view');
  await h.shot('pong');
  // And after resizing to a 390 by 844 phone view they still are
  await page.setViewportSize({width:390,height:844});
  await h.until(()=>mainCanvas.width>0&&mainCanvas.width<=innerWidth);
  await h.ticks(3);
  assert.ok(await inView(h),'paddles and field inside a phone view');
  await h.shot('pong-mobile');
 });

 test('The mouse moves the left paddle and a click serves',async(h)=>{
  const {page}=h;
  // Given pong waiting for a serve
  await waiting(h);
  const y=await h.eval(()=>leftY);
  // When I move the mouse down and click
  await page.mouse.move(200,560);
  // Then the left paddle follows the mouse
  await h.until(y=>Math.abs(leftY-y)>.1,y);
  // And the ball is served
  await page.mouse.click(500,350);
  await h.until(()=>!waitingToServe&&ballVel.length()>0);
 });

 test('A ball past the right edge scores and waits for the next serve',async(h)=>{
  // Given a ball in play
  await inPlay(h);
  const before=await h.eval(()=>leftScore);
  // When it passes the right edge
  await score(h);
  // Then the left score goes up by one and pong waits to serve
  await h.until(s=>leftScore===s+1&&waitingToServe,before);
  // And a click serves again
  await h.page.mouse.click(500,350);await h.until(()=>!waitingToServe);
 });

 test('Esc pauses the ball and P resumes',async(h)=>{
  const {assert}=h;
  // Given a ball in play
  await inPlay(h);
  // When I press Esc
  await h.tap('Escape');
  // Then the game pauses, the ball stops, and the debug overlay stays closed
  await h.until(()=>gamePaused);
  assert.equal(await h.eval(()=>debugOverlay),false,'Esc pauses the game, not the engine debug overlay');
  const frozen=await h.eval(()=>ball.x);await h.ticks(10);
  assert.equal(await h.eval(()=>ball.x),frozen,'paused ball does not move');
  // And P resumes the game
  await h.tap('KeyP');await h.until(()=>!gamePaused);
 });

 test('W moves the paddle and Enter serves',async(h)=>{
  const {assert}=h;
  // Given pong waiting for a serve (the paddle in the middle: a fresh page may have parked it at the top edge)
  await waiting(h);
  await h.holdUntil('KeyS',()=>leftY<0);
  // When I hold W, then press Enter
  const y=await h.eval(()=>leftY);
  await h.holdUntil('KeyW',y=>leftY>y+1&&gcInput.state.device==='keyboard',y);
  // Then the left paddle moves up and the confirm prompt reads "Enter"
  assert.equal(await h.eval(()=>gcInput.prompt('confirm')),'Enter');
  // And the ball is served
  await h.tap('Enter');await h.until(()=>!waitingToServe);
 });

 test('The gamepad stick moves the paddle, South serves and Start pauses',async(h)=>{
  const {assert}=h;
  // Given pong waiting for a serve and a gamepad plugged in
  await waiting(h);
  await h.pad('connect');await h.until(()=>gcInput.state.gamepad.connected);
  // When I push the stick down, press South, then press Start twice
  const y=await h.eval(()=>leftY);await h.pad('axis',1,1);
  // Then the paddle moves down and the confirm prompt reads "South"
  await h.until(y=>leftY<y-1&&gcInput.state.device==='gamepad',y);
  assert.equal(await h.eval(()=>gcInput.prompt('confirm')),'South');
  await h.shot('pong-gamepad');
  // And the ball is served, the game pauses, and resumes
  await h.pad('axis',1,0);
  await h.padTap(0);await h.until(()=>!waitingToServe);
  await h.padTap(9);await h.until(()=>gamePaused);
  await h.padTap(9);await h.until(()=>!gamePaused);
 });

 test('An unplugged stick stops the paddle',async(h)=>{
  const {assert}=h;
  // Given a gamepad holding the stick up
  await waiting(h);
  await h.pad('connect');await h.until(()=>gcInput.state.gamepad.connected);
  await h.pad('axis',1,-1);
  // When I unplug it
  await h.pad('disconnect');await h.until(()=>!gcInput.state.gamepad.connected);
  // Then the paddle stays still
  const y=await h.eval(()=>leftY);await h.ticks(12);
  assert.equal(await h.eval(()=>leftY),y,'an unplugged stick stops the paddle');
 });
};
