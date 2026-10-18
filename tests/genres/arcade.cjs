// Arcade Pack: Bricks (serve, break bricks with the mouse, clear the wall, lose every life, enter a high score),
// Snake (eat, turn, crash) and Paddle (score, win). The kit's own checks run after (extra: kit).
exports.extra=['kit'];
exports.play=async function(h){
 const {assert}=h;
 // title: focus on the first game; the gamepad moves focus and its prompt shows the south position, never a letter
 await h.waitVisible('#title');
 assert.equal(await h.focused(),'title-bricks');
 await h.pad('connect');await h.padTap(13);
 await h.until(()=>document.activeElement.id==='title-snake');
 assert.ok(await h.visible('#title .game-hint .game-padpos[data-pos="south"]'),'gamepad prompt by position');
 await h.padTap(12);await h.until(()=>document.activeElement.id==='title-bricks');
 await h.pad('disconnect');

 // Bricks: Enter starts, Space serves, the mouse paddle follows the ball and breaks bricks
 await h.tap('Enter');
 await h.until(()=>state==='play'&&game.id==='bricks');
 assert.ok(await h.visible('#hud'));assert.ok(!(await h.visible('#title')));
 await h.waitVisible('#tutorial');
 await h.tap('Space');
 await h.until(()=>!bricks.waiting);
 const follow=async(until,limit=20000)=>{
  const end=Date.now()+limit;
  while(Date.now()<end&&!(await h.eval(until))){
   const ball=await h.eval(()=>({x:bricks.ball.x,y:bricks.paddle.y}));
   const p=await h.screen(ball.x,ball.y);await h.page.mouse.move(p.x,p.y);await h.wait(16);
  }
  assert.ok(await h.eval(until),'reached: '+until);
 };
 await follow(()=>score>=30);
 assert.ok(await h.eval(()=>bricks.wall.length<=37));
 assert.equal(await h.text('#hud-score'),await h.eval(()=>fmt(score)),'the HUD shows the score');
 await h.shot('bricks');
 // clear the wall: one brick left, the ball under it
 await h.eval(()=>{bricks.wall.splice(1);const b=bricks.wall[0];bricks.ball=b.pos.add(vec2(0,-3));bricks.vel=vec2(0,.3);});
 await h.waitVisible('#results');
 assert.equal(await h.text('#res-title'),'Wall Cleared');
 await h.tap('Enter'); // Next Level (focused)
 await h.until(()=>state==='play'&&level===2&&bricks.wall.length===40);
 // lose every life: serve and let the ball fall
 for(let life=0;life<3;life++){
  await h.until(()=>bricks.waiting);await h.tap('Space');
  await h.page.mouse.move(5,5);
  await h.eval(()=>{bricks.ball=vec2(bricks.paddle.x+8,-8);bricks.vel=vec2(0,-.4);});
 }
 // a top score: the name entry comes first, then the table with the name
 await h.waitVisible('#results .game-name-entry input');
 await h.page.keyboard.type('ace');await h.page.keyboard.press('Enter');
 await h.until(()=>document.querySelector('.game-scores')?.textContent.includes('ACE'));
 assert.equal(await h.eval(()=>highScores('bricks').list()[0].name),'ACE');
 await h.shot('scores');
 await h.click('#results .game-menu li:first-child .game-btn'); // Try Again
 await h.until(()=>state==='play'&&score===0);

 // pause: Esc stops the world, Esc resumes
 await h.tap('Space');await h.until(()=>!bricks.waiting);
 await h.tap('Escape');await h.waitVisible('#pause');
 assert.ok(await h.eval(()=>paused));
 const frozen=await h.eval(()=>bricks.ball.y);await h.wait(200);
 assert.equal(await h.eval(()=>bricks.ball.y),frozen,'the ball stops while paused');
 await h.tap('Escape');await h.until(()=>!paused&&document.getElementById('pause').hidden);

 // back to the title through the pause menu (Quit asks first)
 await h.tap('Escape');await h.waitVisible('#pause');
 await h.click('#pause-quit');await h.waitVisible('#confirm');
 assert.equal(await h.focused(),'confirm-cancel','Cancel is focused');
 await h.click('#confirm-ok');await h.waitVisible('#title');

 // Snake: eat the food in front, turn, crash into the wall
 await h.tap('ArrowDown');await h.tap('Enter');
 await h.until(()=>state==='play'&&game.id==='snake');
 await h.eval(()=>{snake.food=snake.body[0].add(vec2(2,0));});
 await h.until(()=>score===10&&snake.body.length===4);
 await h.tap('ArrowUp');await h.until(()=>snake.dir.y===1);
 await h.shot('snake');
 await h.waitVisible('#results .game-name-entry input',15000); // crashes into the top wall; 10 is a top score
 await h.page.keyboard.type('sna');await h.page.keyboard.press('Enter');
 await h.until(()=>highScores('snake').list()[0]?.score===10);
 await h.click('#results .game-menu li:last-child .game-btn');
 await h.until(()=>state==='title');

 // Paddle: score a point, then win at 7
 await h.waitVisible('#title');
 await h.click('#title-paddle');
 await h.until(()=>state==='play'&&game.id==='paddle');
 await h.tap('Space');await h.until(()=>!paddle.waiting);
 await h.eval(()=>{paddle.ball=vec2(15.5,0);paddle.vel=vec2(.4,0);});
 await h.until(()=>score===1&&paddle.waiting);
 await h.eval(()=>{score=6;});await h.tap('Space');
 await h.eval(()=>{paddle.ball=vec2(15.5,0);paddle.vel=vec2(.4,0);});
 await h.waitVisible('#results');assert.equal(await h.text('#res-title'),'You Win');
 await h.click('#results .game-menu li:last-child .game-btn');await h.waitVisible('#title');
};
