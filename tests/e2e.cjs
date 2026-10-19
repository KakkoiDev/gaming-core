// Scenario e2e runner: every starter's Given/When/Then scenarios (starters/**/SCENARIOS.md, starters/kit/SCENARIOS.md),
// one test each, named exactly after the scenario's title, played in a real browser.
//
//   node tests/e2e.cjs [target ...] [--grep <text>] [--workers <n>]
//     targets: emptyGame, pong and every genre (tools/game.py genres); default: all of them
//     GAMING_CORE_CHROMIUM may point at a Chromium already on disk; GAMING_CORE_E2E_OUT moves .test-output/e2e
//
// Each target is scaffolded with tools/game.py into a temporary folder and served on 127.0.0.1. Each test gets a fresh
// browser context (empty storage, a mocked gamepad, every request to another host refused) and a freshly loaded game.
// tests/e2e/<target>.cjs registers the target's tests; tests/e2e/kit.cjs adds the game kit's scenarios to every genre.
//
// Writes, for tools/test-core (the testing protocol, run by CI after this):
//   .test-output/e2e/junit.xml            every test's result (scenarios.py check --junit)
//   .test-output/e2e/controls/<target>.html  every control the game showed while its tests ran, in English
//                                         (e2e_coverage.py --pages): a control no test uses is "not verified", and a
//                                         test that uses a control which no longer exists fails
// No fixed waits: helpers wait for state, or for the game's own input ticks (gcInput.tick) where a key must be held.
const {chromium}=(()=>{try{return require('./browser/node_modules/playwright');}catch{return require('playwright');}})();
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.GAMING_CORE_E2E_OUT||path.join(root,'.test-output/e2e'));
const executablePath=process.env.GAMING_CORE_CHROMIUM||undefined;
const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);if(i<0)return fallback;const [,value]=args.splice(i,2);return value;};
const grep=option('--grep',null),workers=Number(option('--workers',process.env.CI?2:3));
const genres=JSON.parse(execFileSync('python3',['-B',path.join(root,'tools/game.py'),'genres'])).genres.map(g=>g.id);
const all=['emptyGame','pong',...genres];
const wanted=args.length?args:all;
for(const id of wanted)if(!all.includes(id))throw Error(`unknown target ${id}: ${all.join(', ')}`);

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

// every control the page shows, as standalone HTML, while the page is in English (names are checked in English)
function collectControls(){
 const ROLES='button,link,checkbox,radio,textbox,searchbox,combobox,listbox,option,switch,tab,menuitem,menuitemcheckbox,menuitemradio,slider,spinbutton,treeitem'.split(',');
 const SELECTOR=['button','a[href]','input:not([type=hidden])','select','textarea',...ROLES.map(r=>`[role="${r}"]`)].join(',');
 const SHALLOW=new Set(['listbox']); // containers: their options are listed one by one
 const seen=window.__controls=new Set();
 const clean=e=>{e.removeAttribute('style');e.removeAttribute('tabindex');e.removeAttribute('autofocus');e.removeAttribute('aria-selected');
  e.removeAttribute('aria-valuenow');for(const c of e.querySelectorAll('*'))c.removeAttribute('style');return e;};
 const scan=()=>{
  if(document.documentElement.lang!=='en'||seen.size>3000)return;
  for(const e of document.body.querySelectorAll(SELECTOR)){
   const copy=SHALLOW.has(e.getAttribute('role'))?e.cloneNode(false):e.cloneNode(true);
   let html=clean(copy).outerHTML.replace(/\s+/g,' ');
   if(e.id)for(const label of document.querySelectorAll(`label[for="${CSS.escape(e.id)}"]`))html+=' '+label.outerHTML.replace(/\s+/g,' ');
   seen.add(html);
  }
 };
 let queued=false;
 const later=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
 window.__scanControls=scan;
 addEventListener('DOMContentLoaded',()=>{scan();new MutationObserver(later).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});});
}

// what each test gets: small verbs over the page; controls are found by role and label in the tests themselves
function helpers(page,id){
 const ticks=(n=1)=>page.evaluate(()=>gcInput.tick).then(t=>page.waitForFunction(([t,n])=>gcInput.tick>=t+n,[t,n],{timeout:15000}));
 const h={
  page,id,assert,ticks,
  until:(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout}),
  eval:(fn,arg)=>page.evaluate(fn,arg),
  // before a press: the next input tick has come, and a screen that just opened has taken its own tick (the kit gives
  // the input of the tick a screen opens to whatever opened it; a person is never that fast)
  ready:()=>page.evaluate(()=>gcInput.tick).then(t=>page.waitForFunction(t=>gcInput.tick>t&&(typeof screenOpenedTick==='undefined'||gcInput.tick-screenOpenedTick>1),t,{timeout:15000})),
  // a key held for a few input ticks, as a person presses it (LittleJS reads held keys once a frame)
  async tap(code,n=4){await h.ready();await page.keyboard.down(code);await ticks(n);await page.keyboard.up(code);await ticks(1);},
  // a key held until the game reaches a state
  async holdUntil(code,fn,arg,timeout=15000){await h.ready();await page.keyboard.down(code);try{await page.waitForFunction(fn,arg,{timeout});}finally{await page.keyboard.up(code);}await ticks(1);},
  async holdTicks(code,n){await h.ready();await page.keyboard.down(code);await ticks(n);await page.keyboard.up(code);await ticks(1);},
  visible:(selector)=>page.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.closest('[hidden]')&&e.getClientRects().length>0;},selector),
  async waitVisible(selector,timeout=10000){await page.waitForFunction(s=>{const e=document.querySelector(s);return !!e&&!e.closest('[hidden]')&&e.getClientRects().length>0;},selector,{timeout});},
  async waitHidden(selector,timeout=10000){await page.waitForFunction(s=>{const e=document.querySelector(s);return !e||!!e.closest('[hidden]')||e.getClientRects().length===0;},selector,{timeout});},
  text:(selector)=>page.evaluate(s=>document.querySelector(s)?.textContent.trim(),selector),
  focused:()=>page.evaluate(()=>document.activeElement&&(document.activeElement.id||document.activeElement.dataset.action||document.activeElement.className)),
  async pad(fn,...a){await page.evaluate(([fn,a])=>__pad[fn](...a),[fn,a]);},
  // an on-screen touch button pressed with a finger for a few ticks
  async touch(locator,n=4){await h.ready();const el=await locator.elementHandle();await el.dispatchEvent('pointerdown',{pointerType:'touch',bubbles:true,isPrimary:true});await ticks(n);await el.dispatchEvent('pointerup',{pointerType:'touch',bubbles:true,isPrimary:true});await ticks(1);},
  async padTap(button,n=4){await h.ready();await h.pad('button',button,true);await ticks(n);await h.pad('button',button,false);await ticks(2);},
  // a world position on screen, for mouse play
  screen:(x,y)=>page.evaluate(([x,y])=>{const p=worldToScreen(vec2(x,y)),r=mainCanvas.getBoundingClientRect();return {x:r.left+p.x*r.width/mainCanvas.width,y:r.top+p.y*r.height/mainCanvas.height};},[x,y]),
  shot:(name)=>page.screenshot({path:path.join(out,'shots',`${id}-${name}.png`)}),
 };
 return h;
}

const escapeXml=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);

(async()=>{
 fs.rmSync(out,{recursive:true,force:true});
 for(const dir of ['shots','controls'])fs.mkdirSync(path.join(out,dir),{recursive:true});
 const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'gaming-core-e2e-')));
 let server,browser;const results=[];
 try{
  for(const id of wanted)execFileSync('python3',['-B',path.join(root,'tools/game.py'),'init',id,'--out',path.join(temporary,id)]);
  // a deeper listen queue than http.server's 5: a page asks for ten files at once and a busy machine would reset some
  const code='import http.server,functools\nclass S(http.server.ThreadingHTTPServer):\n request_queue_size=128\ns=S(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory='+JSON.stringify(temporary)+'))\nprint(s.server_port,flush=True)\ns.serve_forever()';
  server=spawn('python3',['-u','-c',code],{stdio:['ignore','pipe','ignore']});
  const port=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Server timeout')),10000); // flaky-lint: allow a deadline, not a wait
  server.stdout.on('data',d=>{text+=d;if(text.includes('\n')){clearTimeout(timeout);resolve(Number(text.trim()));}});server.on('error',reject);});
  // macOS: a scratch-home Chromium asks for a keychain on every launch without the first two (test-core lesson)
  browser=await chromium.launch({headless:true,executablePath,args:['--use-mock-keychain','--password-store=basic','--enable-unsafe-swiftshader']});

  const runTarget=async(id)=>{
   const tests=[];
   const test=(title,fn)=>{if(tests.some(t=>t.title===title))throw Error(`${id}: two tests named "${title}"`);tests.push({title,fn});};
   const file=require(path.join(__dirname,'e2e',genres.includes(id)?'genres':'',`${id}.cjs`));
   file(test);
   if(genres.includes(id))require('./e2e/kit.cjs')(test);
   const controls=new Set();
   for(const {title,fn} of tests){
    if(grep&&!title.toLowerCase().includes(grep.toLowerCase()))continue;
    const started=Date.now();
    const context=await browser.newContext({viewport:{width:1000,height:700},locale:'en-US'});
    await context.addInitScript(mockGamepads);
    await context.addInitScript(collectControls);
    const external=[],errors=[];
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();external.push(url.href);return route.abort();});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errors.push(m.text());});
    let failure=null;
    try{
     await page.goto(`http://127.0.0.1:${port}/${id}/`);
     await page.waitForFunction(()=>typeof mainCanvas!=='undefined'&&mainCanvas.width>0&&time>0&&typeof gcInput!=='undefined'&&gcInput.tick>0&&
      (typeof GAME_ID==='undefined'||!document.getElementById('ui')||document.querySelector('#ui > section:not([hidden])')),undefined,{timeout:60000});
     await fn(helpers(page,id));
     if(external.length)throw Error(`requests left 127.0.0.1: ${external.join(', ')}`);
     if(errors.length)throw Error(`page errors: ${errors.join(' | ')}`);
    }catch(error){
     failure=error;
     await page.screenshot({path:path.join(out,'shots',`${id}-${title.replace(/[^\w]+/g,'-').slice(0,60)}-failure.png`)}).catch(()=>{});
    }
    try{await page.evaluate(()=>window.__scanControls&&window.__scanControls());for(const c of await page.evaluate(()=>[...(window.__controls||[])]))controls.add(c);}catch{}
    await context.close();
    const seconds=(Date.now()-started)/1000;
    results.push({id,title,seconds,failure});
    if(failure)console.error(`not ok ${id} › ${title}: ${failure.message.split('\n')[0]} ${(failure.stack||'').split('\n').filter(l=>l.includes('/tests/e2e/')).slice(0,2).map(l=>l.trim()).join(' | ')}`);
    else console.log(`ok ${id} › ${title} (${seconds.toFixed(1)} s)`);
   }
   fs.writeFileSync(path.join(out,'controls',`${id}.html`),`<!-- controls ${id} showed while tests/e2e.cjs ran (English) -->\n${[...controls].sort().join('\n')}\n`);
  };
  const queue=[...wanted];
  await Promise.all(Array.from({length:Math.max(1,workers)},async()=>{while(queue.length)await runTarget(queue.shift());}));
 }finally{if(browser)await browser.close();if(server)server.kill();fs.rmSync(temporary,{recursive:true,force:true});}
 const failed=results.filter(r=>r.failure);
 const cases=results.map(r=>`  <testcase classname="${escapeXml(r.id)}" name="${escapeXml(r.title)}" time="${r.seconds.toFixed(3)}">${r.failure?`<failure message="${escapeXml(r.failure.message.split('\n')[0])}"/>`:''}</testcase>`);
 fs.writeFileSync(path.join(out,'junit.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="gaming-core e2e" tests="${results.length}" failures="${failed.length}">\n${cases.join('\n')}\n</testsuite></testsuites>\n`);
 if(failed.length){console.error(`${failed.length} of ${results.length} scenario test(s) failed.`);process.exitCode=1;}
 else console.log(`${results.length} scenario test(s) passed offline: ${wanted.join(', ')}.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
