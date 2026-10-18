// Plays every genre starter in a real browser: scaffold with tools/game.py, serve locally, run tests/genres/<id>.cjs.
// Run: node tests/genres.cjs [genre ...]   (GAMING_CORE_CHROMIUM may point at a Chromium already on disk)
const {chromium}=(()=>{try{return require('./browser/node_modules/playwright');}catch{return require('playwright');}})();
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.test-output/genres');fs.mkdirSync(out,{recursive:true});
const executablePath=process.env.GAMING_CORE_CHROMIUM||undefined;
const all=JSON.parse(execFileSync('python3',['-B',path.join(root,'tools/game.py'),'genres'])).genres.map(g=>g.id);
const wanted=process.argv.slice(2).length?process.argv.slice(2):all;

// a mocked navigator.getGamepads(): one standard-mapping pad the tests plug, move, press and unplug
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

// what each test gets: small verbs over the page
function helpers(page,id){
 const h={
  page,
  wait:(ms)=>page.waitForTimeout(ms),
  until:(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout}),
  eval:(fn,arg)=>page.evaluate(fn,arg),
  // a key held for a few ticks, as a person presses it (LittleJS reads the device from held keys)
  async tap(code,ms=70){await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(30);},
  async hold(code,ms){await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);},
  visible:(selector)=>page.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.closest('[hidden]')&&e.getClientRects().length>0;},selector),
  async waitVisible(selector,timeout=10000){await page.waitForFunction(s=>{const e=document.querySelector(s);return !!e&&!e.closest('[hidden]')&&e.getClientRects().length>0;},selector,{timeout});},
  text:(selector)=>page.evaluate(s=>document.querySelector(s)?.textContent.trim(),selector),
  focused:()=>page.evaluate(()=>document.activeElement&&(document.activeElement.id||document.activeElement.dataset.action||document.activeElement.className)),
  async click(selector){await page.click(selector);await page.waitForTimeout(60);},
  async pad(fn,...args){await page.evaluate(([fn,args])=>__pad[fn](...args),[fn,args]);},
  async padTap(button,ms=80){await h.pad('button',button,true);await page.waitForTimeout(ms);await h.pad('button',button,false);await page.waitForTimeout(40);},
  // a world position on screen, for mouse play
  screen:(x,y)=>page.evaluate(([x,y])=>{const p=worldToScreen(vec2(x,y)),r=mainCanvas.getBoundingClientRect();return {x:r.left+p.x*r.width/mainCanvas.width,y:r.top+p.y*r.height/mainCanvas.height};},[x,y]),
  shot:(name)=>page.screenshot({path:path.join(out,`${id}-${name}.png`)}),
  assert,
 };
 return h;
}

(async()=>{
 const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'gaming-core-genres-')));
 let server,browser;const failed=[];
 try{
  for(const id of wanted)execFileSync('python3',['-B',path.join(root,'tools/game.py'),'init',id,'--out',path.join(temporary,id)]);
  // a deeper listen queue than http.server's 5: a page asks for ten files at once and a busy machine would reset some
  const code='import http.server,functools\nclass S(http.server.ThreadingHTTPServer):\n request_queue_size=128\ns=S(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory='+JSON.stringify(temporary)+'))\nprint(s.server_port,flush=True)\ns.serve_forever()';
  server=spawn('python3',['-u','-c',code],{stdio:['ignore','pipe','ignore']});
  const port=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',d=>{text+=d;if(text.includes('\n')){clearTimeout(timeout);resolve(Number(text.trim()));}});server.on('error',reject);});
  browser=await chromium.launch({headless:true,executablePath,args:['--enable-unsafe-swiftshader']});
  for(const id of wanted){
   const started=Date.now();
   const context=await browser.newContext({viewport:{width:1000,height:700},locale:'en-US'});
   await context.addInitScript(mockGamepads);
   const external=[],errors=[];
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();external.push(url.href);return route.abort();});
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errors.push(m.text());});
   try{
    await page.goto(`http://127.0.0.1:${port}/${id}/`);
    await page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0&&document.querySelector('#ui > section:not([hidden])'),undefined,{timeout:60000});
    const h=helpers(page,id);
    await h.shot('start');
    const steps=require(`./genres/${id}.cjs`);
    await steps.play(h);
    for(const extra of steps.extra||[])await require(`./genres/${extra}.cjs`).play(h,id);
    await h.shot('end');
    assert.deepEqual(external,[],'no request leaves 127.0.0.1');
    assert.deepEqual(errors,[],'no page errors');
    console.log(`ok ${id} (${((Date.now()-started)/1000).toFixed(1)} s)`);
   }catch(error){
    failed.push(id);console.error(`not ok ${id}:`,error.message.split('\n')[0],(error.stack||'').split('\n').filter(l=>l.includes('/tests/genres/')).slice(0,2).join(' | '));
    await page.screenshot({path:path.join(out,`${id}-failure.png`)}).catch(()=>{});
   }finally{await context.close();}
  }
 }finally{if(browser)await browser.close();if(server)server.kill();fs.rmSync(temporary,{recursive:true,force:true});}
 if(failed.length){console.error(`Genre starters failed: ${failed.join(', ')}`);process.exitCode=1;}
 else console.log(`Genre starters played offline: ${wanted.join(', ')}.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
