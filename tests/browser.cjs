const {chromium}=(()=>{try{return require('playwright');}catch{return require('playwright-core');}})();
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.test-output/browser');fs.mkdirSync(out,{recursive:true});
const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'gaming-core-')));
(async()=>{
 let server,browser;
 try{
  for(const preset of ['emptyGame','pong'])execFileSync('python3',['-B',path.join(root,'tools/game.py'),'init',preset,'--out',path.join(temporary,preset)]);
  const code='import http.server,functools\ns=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory='+JSON.stringify(temporary)+'))\nprint(s.server_port,flush=True)\ns.serve_forever()';
  server=spawn('python3',['-u','-c',code],{stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',data=>{text+=data;if(text.includes('\n')){clearTimeout(timeout);resolve(Number(text.trim()));}});server.on('error',reject);server.on('exit',code=>{if(code)reject(Error('Server failed'));});});
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1000,height:700}}),page=await context.newPage();
  const external=[],errors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/emptyGame/`);
  await page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0);
  await page.screenshot({path:path.join(out,'emptyGame.png')});
  await page.goto(`http://127.0.0.1:${port}/pong/`);
  await page.waitForFunction(()=>typeof waitingToServe!=='undefined'&&waitingToServe===true&&time>0);
  const oldY=await page.evaluate(()=>leftY);await page.mouse.move(200,120);
  await page.waitForFunction(y=>Math.abs(leftY-y)>.1,oldY);
  await page.mouse.click(500,350);
  await page.waitForFunction(()=>!waitingToServe&&ballVel.length()>0);
  await page.screenshot({path:path.join(out,'pong.png')});
  // Force one boundary condition; the real update loop must score and reset serve state.
  const oldScore=await page.evaluate(()=>leftScore);
  await page.evaluate(()=>{ball.x=fieldSize.x;ballVel.x=ballSpeed;});
  await page.waitForFunction(score=>leftScore===score+1&&waitingToServe,oldScore);
  await page.mouse.click(500,350);await page.waitForFunction(()=>!waitingToServe);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>mainCanvas.width>0&&mainCanvas.width<=innerWidth);
  await page.screenshot({path:path.join(out,'pong-mobile.png')});
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('Offline LittleJS starter, paddle input, serve and score/reset checks passed.');
 }finally{if(browser)await browser.close();if(server)server.kill();fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
