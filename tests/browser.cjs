const {chromium}=(()=>{try{return require('./browser/node_modules/playwright');}catch{return require('playwright');}})();
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.test-output/browser');fs.mkdirSync(out,{recursive:true});
const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'gaming-core-')));
// Optional: a Chromium already on disk when the local Playwright build expects another revision.
const executablePath=process.env.GAMING_CORE_CHROMIUM||undefined;
// A mocked navigator.getGamepads(): one standard-mapping pad that tests plug, move, press and unplug.
function mockGamepads(){
 const pads=[null,null,null,null];
 window.__pad={
  connect(){pads[0]={id:'Mock standard gamepad',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};},
  disconnect(){pads[0]=null;},
  axis(i,v){pads[0].axes[i]=v;},
  button(i,down){pads[0].buttons[i]={pressed:down,touched:down,value:down?1:0};},
 };
 Object.defineProperty(Navigator.prototype,'getGamepads',{configurable:true,value:()=>pads.slice()});
}
// Record what each gcInput snapshot reports, since pressed edges last one frame.
const hook=page=>page.evaluate(()=>{
 window.__log=[];const update=gcInput.update.bind(gcInput);
 gcInput.update=()=>{const s=update(),log=window.__log;
  for(const name in s.pressed)if(s.pressed[name])log.push('pressed:'+name);
  if(s.mouse.wheel)log.push('wheel');if(s.gamepad.justConnected)log.push('connected');if(s.gamepad.justDisconnected)log.push('disconnected');
  if(gcInput.lastInput)log.push('input:'+gcInput.lastInput.device+':'+gcInput.lastInput.code);return s;};
});
const logged=(page,entry)=>page.waitForFunction(e=>window.__log.includes(e),entry);
const clearLog=page=>page.evaluate(()=>{window.__log.length=0;});
(async()=>{
 let server,browser;
 try{
  for(const preset of ['emptyGame','pong'])execFileSync('python3',['-B',path.join(root,'tools/game.py'),'init',preset,'--out',path.join(temporary,preset)]);
  const code='import http.server,functools\ns=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory='+JSON.stringify(temporary)+'))\nprint(s.server_port,flush=True)\ns.serve_forever()';
  server=spawn('python3',['-u','-c',code],{stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',data=>{text+=data;if(text.includes('\n')){clearTimeout(timeout);resolve(Number(text.trim()));}});server.on('error',reject);server.on('exit',code=>{if(code)reject(Error('Server failed'));});});
  browser=await chromium.launch({headless:true,executablePath,args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1000,height:700}});await context.addInitScript(mockGamepads);const page=await context.newPage();
  const external=[],errors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/emptyGame/`);
  await page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0);
  await page.screenshot({path:path.join(out,'emptyGame.png')});
  await hook(page);
  // keyboard: hold D moves right, the prompt shows keyboard names
  let x=await page.evaluate(()=>player.x);await page.keyboard.down('KeyD');
  await page.waitForFunction(x=>player.x>x+1,x);await page.keyboard.up('KeyD');
  assert.equal(await page.evaluate(()=>gcInput.state.device),'keyboard');
  assert.equal(await page.evaluate(()=>gcInput.prompt('jump')),'Space');
  await page.keyboard.press('Space');await logged(page,'pressed:jump');
  assert.equal(await page.evaluate(()=>gcInput.prompt('move')),'W A S D');
  // mouse: a left click is attack (fire is its alias) and moves the square to the pointer; the wheel is reported
  await page.mouse.move(300,200);await page.mouse.move(320,220);await page.mouse.click(320,220);await logged(page,'pressed:attack');
  assert.ok(await page.evaluate(()=>__log.includes('pressed:fire')),'fire is reported with attack');
  assert.ok(await page.evaluate(()=>player.distance(mousePos)<.5));
  assert.equal(await page.evaluate(()=>gcInput.prompt('attack')),'Left click');
  await page.mouse.wheel(0,200);await logged(page,'wheel');
  // gamepad: plug, push the left stick right, press A, unplug while held
  await page.evaluate(()=>__pad.connect());await logged(page,'connected');
  x=await page.evaluate(()=>player.x);await page.evaluate(()=>__pad.axis(0,1));
  await page.waitForFunction(x=>player.x>x+1&&gcInput.state.device==='gamepad',x);
  // gamepad buttons are named by position by default, brands only on request, Japanese from <html lang>
  assert.equal(await page.evaluate(()=>gcInput.prompt('jump')),'South button');
  assert.equal(await page.evaluate(()=>gcInput.prompt('move')),'Left stick');
  assert.deepEqual(await page.evaluate(()=>gcInput.glyphs('back').map(g=>g.pos)),['east']);
  assert.equal(await page.evaluate(()=>{document.documentElement.lang='ja';const t=gcInput.prompt('jump');document.documentElement.lang='en';return t;}),'下ボタン');
  assert.equal(await page.evaluate(()=>{gcInput.options.padStyle='xbox';const t=gcInput.prompt('jump');gcInput.options.padStyle='position';return t;}),'A');
  await page.evaluate(()=>{__pad.axis(0,0);__pad.button(0,true);});await logged(page,'pressed:jump');
  await page.evaluate(()=>__pad.button(0,false));
  await page.evaluate(()=>__pad.button(15,true));x=await page.evaluate(()=>player.x);
  await page.waitForFunction(x=>player.x>x+1,x);await page.evaluate(()=>{__pad.button(15,false);__pad.axis(1,-1);});
  await page.evaluate(()=>__pad.disconnect());await logged(page,'disconnected');
  const y=await page.evaluate(()=>player.y);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>player.y),y,'an unplugged stick stops moving');
  assert.deepEqual(await page.evaluate(()=>[gcInput.state.gamepad.connected,gcInput.state.device]),[false,'keyboard']);
  // touch: a touch pointer makes touch the device; on-screen buttons and stick feed the same actions
  await page.evaluate(()=>dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
  await page.waitForFunction(()=>gcInput.state.device==='touch');
  assert.equal(await page.evaluate(()=>gcInput.prompt('confirm')),'Tap');
  await clearLog(page);await page.evaluate(()=>gcInput.press('jump',true));await logged(page,'pressed:jump');await page.evaluate(()=>gcInput.press('jump',false));
  x=await page.evaluate(()=>player.x);await page.evaluate(()=>gcInput.stick('move',1,0));
  await page.waitForFunction(x=>player.x>x+1,x);await page.evaluate(()=>gcInput.stick('move',0,0));
  await page.mouse.move(400,300);await page.mouse.move(410,310);await page.waitForFunction(()=>gcInput.state.device==='mouse');
  // one read per engine tick, paused ticks included
  assert.ok(await page.evaluate(()=>gcInput.update()===gcInput.update()),'a second read in the same tick is the same snapshot');
  const ticks=await page.evaluate(()=>{setPaused(true);return gcInput.tick;});await page.waitForFunction(t=>gcInput.tick>t+3,ticks);
  await page.evaluate(()=>setPaused(false));
  // rebinding: capture the next key, bind it, save, reload, then reset; the save is <game-id>.settings in the ControlsRemap format
  await clearLog(page);await page.keyboard.press('KeyQ');await logged(page,'input:keyboard:KeyQ');
  assert.ok(await page.evaluate(()=>gcInput.bind('jump',{keyboard:['KeyQ']})&&gcInput.save()));
  assert.equal(await page.evaluate(()=>gcInput.bind('pause',{keyboard:['KeyQ']})),false,'pause is fixed');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('empty-game.settings')).bindings.jump),{keyboard:'KeyQ',mouse:null,gamepad:0});
  await page.reload();await page.waitForFunction(()=>typeof gcInput!=='undefined'&&gcInput.state&&time>0);await hook(page);
  assert.deepEqual(await page.evaluate(()=>gcInput.bindings.jump.keyboard),['KeyQ']);
  await page.keyboard.press('KeyQ');await logged(page,'pressed:jump');
  await clearLog(page);await page.keyboard.press('KeyZ');await page.waitForTimeout(150);
  assert.ok(!(await page.evaluate(()=>__log.includes('pressed:jump'))),'old jump key no longer jumps');
  // ControlsRemap change with a swap: jump takes J, which was attack's, so attack gets Q
  assert.deepEqual(await page.evaluate(()=>gcInput.rebind('jump','keyboard','KeyJ')),{ok:true,swapped:'attack'});
  assert.deepEqual(await page.evaluate(()=>gcInput.bindings.attack.keyboard),['KeyQ','KeyX']);
  await page.evaluate(()=>gcInput.reset());await page.reload();await page.waitForFunction(()=>typeof gcInput!=='undefined'&&gcInput.state&&time>0);
  assert.deepEqual(await page.evaluate(()=>gcInput.bindings.jump.keyboard),['Space','KeyZ']);
  // migration: an old string-format save under the old key becomes the settings bindings once
  await page.evaluate(()=>{localStorage.removeItem('empty-game.settings');localStorage.setItem('emptyGame.input',JSON.stringify({version:1,actions:{jump:['key:KeyK','pad:0'],fire:['key:KeyF']}}));});
  await page.reload();await page.waitForFunction(()=>typeof gcInput!=='undefined'&&gcInput.state&&time>0);
  assert.deepEqual(await page.evaluate(()=>[gcInput.bindings.jump.keyboard,gcInput.bindings.attack.keyboard]),[['KeyK'],['KeyF']]);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('empty-game.settings')).bindings.jump.keyboard),'KeyK');
  await page.evaluate(()=>{localStorage.removeItem('emptyGame.input');gcInput.reset();});
  await page.screenshot({path:path.join(out,'emptyGame-input.png')});
  await page.goto(`http://127.0.0.1:${port}/pong/`);
  await page.waitForFunction(()=>typeof waitingToServe!=='undefined'&&waitingToServe===true&&time>0);
  // the whole field fits the window: both paddles are on screen at 1000x700 (they were not before the camera fit)
  const inView=()=>page.evaluate(()=>{const l=worldToScreen(vec2(leftX-paddleSize.x/2,leftY)),r=worldToScreen(vec2(rightX+paddleSize.x/2,rightY));
   const top=worldToScreen(vec2(0,fieldSize.y/2)),bottom=worldToScreen(vec2(0,-fieldSize.y/2));
   return l.x>=0&&r.x<=mainCanvasSize.x&&top.y>=0&&bottom.y<=mainCanvasSize.y;});
  await page.waitForFunction(()=>typeof leftX!=='undefined');assert.ok(await inView(),'paddles and field inside the 1000x700 view');
  const oldY=await page.evaluate(()=>leftY);await page.mouse.move(200,560);
  await page.waitForFunction(y=>Math.abs(leftY-y)>.1,oldY);
  await page.mouse.click(500,350);
  await page.waitForFunction(()=>!waitingToServe&&ballVel.length()>0);
  await page.screenshot({path:path.join(out,'pong.png')});
  // Force one boundary condition; the real update loop must score and reset serve state.
  const oldScore=await page.evaluate(()=>leftScore);
  await page.evaluate(()=>{ball.x=fieldSize.x;ballVel.x=ballSpeed;});
  await page.waitForFunction(score=>leftScore===score+1&&waitingToServe,oldScore);
  await page.mouse.click(500,350);await page.waitForFunction(()=>!waitingToServe);
  await hook(page);
  // keyboard: Escape pauses (ball stops), P resumes; W moves the paddle; Enter serves
  await page.keyboard.press('Escape');await page.waitForFunction(()=>gamePaused);
  assert.equal(await page.evaluate(()=>debugOverlay),false,'Esc pauses the game, not the engine debug overlay');
  const frozen=await page.evaluate(()=>ball.x);await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>ball.x),frozen,'paused ball does not move');
  await page.keyboard.press('KeyP');await page.waitForFunction(()=>!gamePaused);
  await page.evaluate(()=>{ball.x=fieldSize.x;ballVel.x=ballSpeed;});await page.waitForFunction(()=>waitingToServe);
  let paddle=await page.evaluate(()=>leftY);await page.keyboard.down('KeyW');
  await page.waitForFunction(y=>leftY>y+1&&gcInput.state.device==='keyboard',paddle);await page.keyboard.up('KeyW');
  assert.equal(await page.evaluate(()=>gcInput.prompt('confirm')),'Enter');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>!waitingToServe);
  // gamepad: stick down moves the paddle down, A serves, Start pauses, unplugging stops the paddle
  await page.evaluate(()=>{ball.x=fieldSize.x;ballVel.x=ballSpeed;});await page.waitForFunction(()=>waitingToServe);
  await page.evaluate(()=>__pad.connect());await logged(page,'connected');
  paddle=await page.evaluate(()=>leftY);await page.evaluate(()=>__pad.axis(1,1));
  await page.waitForFunction(y=>leftY<y-1&&gcInput.state.device==='gamepad',paddle);
  assert.equal(await page.evaluate(()=>gcInput.prompt('confirm')),'South button');
  await page.screenshot({path:path.join(out,'pong-gamepad.png')});
  await page.evaluate(()=>__pad.button(0,true));await page.waitForFunction(()=>!waitingToServe);await page.evaluate(()=>__pad.button(0,false));
  await page.evaluate(()=>__pad.button(9,true));await page.waitForFunction(()=>gamePaused);
  await page.evaluate(()=>__pad.button(9,false));await page.waitForTimeout(50);await page.evaluate(()=>__pad.button(9,true));
  await page.waitForFunction(()=>!gamePaused);await page.evaluate(()=>{__pad.button(9,false);__pad.axis(1,-1);});
  await page.evaluate(()=>__pad.disconnect());await logged(page,'disconnected');
  paddle=await page.evaluate(()=>leftY);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>leftY),paddle,'an unplugged stick stops the paddle');
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>mainCanvas.width>0&&mainCanvas.width<=innerWidth);
  await page.waitForTimeout(100);assert.ok(await inView(),'paddles and field inside a phone view');
  await page.screenshot({path:path.join(out,'pong-mobile.png')});
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('Offline LittleJS starters passed: keyboard, mouse, wheel, mocked gamepad (plug/stick/d-pad/buttons/unplug, position names), touch, one read per tick, rebinding save/reload/swap/reset, migration, fixed pause, pause, serve, score/reset and field framing.');
 }finally{if(browser)await browser.close();if(server)server.kill();fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
