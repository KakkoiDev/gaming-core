// emptyGame (starters/emptyGame/SCENARIOS.md): the input layer on a bare game, one test per scenario, named after it.
// Canvas only: no controls to locate, so the steps are keys, the mouse and a mocked gamepad.
module.exports=function(test){

 // record what each gcInput snapshot reports, since pressed edges last one frame
 const hook=h=>h.eval(()=>{
  window.__log=[];const update=gcInput.update.bind(gcInput);
  gcInput.update=()=>{const s=update(),log=window.__log;
   for(const name in s.pressed)if(s.pressed[name])log.push('pressed:'+name);
   if(s.mouse.wheel)log.push('wheel');if(s.gamepad.justConnected)log.push('connected');if(s.gamepad.justDisconnected)log.push('disconnected');
   if(gcInput.lastBinding)log.push('binding:'+gcInput.lastBinding);return s;};
 });
 const logged=(h,entry)=>h.until(e=>window.__log.includes(e),entry);
 const reload=async h=>{await h.page.reload();await h.until(()=>typeof gcInput!=='undefined'&&gcInput.state&&time>0);};

 test('Holding D moves the square right and prompts name keyboard keys',async(h)=>{
  const {assert}=h;
  // Given a fresh emptyGame
  const x=await h.eval(()=>player.x);
  // When I hold D
  await h.holdUntil('KeyD',x=>player.x>x+1,x);
  // Then the square moves right and the device is the keyboard
  assert.equal(await h.eval(()=>gcInput.state.device),'keyboard');
  // And the jump prompt reads "Space"
  assert.equal(await h.eval(()=>gcInput.prompt('jump')),'Space');
 });

 test('Space is the jump action',async(h)=>{
  // Given a fresh emptyGame
  await hook(h);
  // When I press Space
  await h.tap('Space');
  // Then the jump action is pressed
  await logged(h,'pressed:jump');
 });

 test('A left click fires and moves the square to the pointer',async(h)=>{
  const {page,assert}=h;
  // Given a fresh emptyGame
  await hook(h);
  // When I click the canvas
  await page.mouse.move(300,200);await page.mouse.move(320,220);await page.mouse.click(320,220);
  // Then the fire action is pressed and the square is under the pointer
  await logged(h,'pressed:fire');
  await h.until(()=>player.distance(mousePos)<.5);
  // And the fire prompt reads "Left click"
  assert.equal(await h.eval(()=>gcInput.prompt('fire')),'Left click');
  // And the mouse wheel is reported
  await page.mouse.wheel(0,200);await logged(h,'wheel');
 });

 test('A gamepad stick moves the square and buttons are named by position',async(h)=>{
  const {assert}=h;
  // Given a fresh emptyGame
  await hook(h);
  // When I plug a gamepad and push its left stick right
  await h.pad('connect');await logged(h,'connected');
  const x=await h.eval(()=>player.x);await h.pad('axis',0,1);
  // Then the square moves right and the device is the gamepad
  await h.until(x=>player.x>x+1&&gcInput.state.device==='gamepad',x);
  // And the jump prompt reads "South", or "A" only when Xbox names are asked for
  assert.equal(await h.eval(()=>gcInput.prompt('jump')),'South');
  assert.equal(await h.eval(()=>{gcInput.options.padStyle='xbox';const t=gcInput.prompt('jump');gcInput.options.padStyle='position';return t;}),'A');
  // And the south button jumps and back is the east button
  await h.pad('axis',0,0);
  await h.padTap(0);await logged(h,'pressed:jump');
  assert.equal(await h.eval(()=>gcInput.binding('back')),'pad:1');
 });

 test('The d-pad moves the square and an unplugged stick stops it',async(h)=>{
  const {assert}=h;
  // Given a gamepad is plugged in
  await hook(h);
  await h.pad('connect');await logged(h,'connected');
  // When I hold the d-pad right, then hold the stick up and unplug the gamepad
  const x=await h.eval(()=>player.x);
  await h.pad('button',15,true);
  // Then the square moved right
  await h.until(x=>player.x>x+1,x);
  await h.pad('button',15,false);await h.pad('axis',1,-1);
  await h.pad('disconnect');await logged(h,'disconnected');
  // And after unplugging it stays still and the keyboard is the device again
  const y=await h.eval(()=>player.y);await h.ticks(12);
  assert.equal(await h.eval(()=>player.y),y,'an unplugged stick stops moving');
  assert.deepEqual(await h.eval(()=>[gcInput.state.gamepad.connected,gcInput.state.device]),[false,'keyboard']);
 });

 test('A rebound key is saved, survives a reload, and Reset brings the defaults back',async(h)=>{
  const {assert}=h;
  // Given a fresh emptyGame
  await hook(h);
  // When I bind jump to Q and save
  await h.tap('KeyQ');await logged(h,'binding:key:KeyQ');
  assert.ok(await h.eval(()=>gcInput.bind('jump',['key:KeyQ','pad:0'])&&gcInput.save()));
  // Then the binding is saved under <game-id>.input
  assert.deepEqual(await h.eval(()=>JSON.parse(localStorage.getItem('empty-game.input')).actions.jump),['key:KeyQ','pad:0']);
  // And after a reload Q jumps and Z no longer does
  await reload(h);await hook(h);
  assert.deepEqual(await h.eval(()=>gcInput.bindings.actions.jump),['key:KeyQ','pad:0']);
  await h.tap('KeyQ');await logged(h,'pressed:jump');
  await h.eval(()=>{window.__log.length=0;});
  await h.tap('KeyZ');await logged(h,'binding:key:KeyZ');
  assert.ok(!(await h.eval(()=>__log.includes('pressed:jump'))),'old jump key no longer jumps');
  // And after Reset and a reload jump is Space, Z and the south button again
  await h.eval(()=>gcInput.reset());await reload(h);
  assert.deepEqual(await h.eval(()=>gcInput.bindings.actions.jump),['key:Space','key:KeyZ','pad:0']);
 });

 test('Pause and back cannot be rebound',async(h)=>{
  const {assert}=h;
  // Given a fresh emptyGame
  // When I try to bind pause or back to Q
  // Then both are refused
  assert.equal(await h.eval(()=>gcInput.bind('pause',['key:KeyQ'])),false,'pause is fixed');
  assert.equal(await h.eval(()=>gcInput.bind('back',['key:KeyQ'])),false,'back is fixed');
 });

 test('Input is read once per tick, paused ticks included',async(h)=>{
  const {assert}=h;
  // Given a fresh emptyGame
  // When I read the input twice in one tick, then pause the engine
  // Then both reads are the same snapshot
  assert.ok(await h.eval(()=>gcInput.update()===gcInput.update()),'a second read in the same tick is the same snapshot');
  // And input ticks keep counting while paused
  const ticks=await h.eval(()=>{setPaused(true);return gcInput.tick;});
  await h.until(t=>gcInput.tick>t+3,ticks);
  await h.eval(()=>setPaused(false));
  await h.shot('input');
 });
};
