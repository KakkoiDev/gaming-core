const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const {resolve}=require('node:path');
(async()=>{const b=await chromium.launch();try{
const p=await b.newPage();let errors=[];p.on('pageerror',e=>errors.push(e.message));
const dir=process.env.CLASSICS_DIR||'starters';
await p.goto(pathToFileURL(resolve(dir,'maze-chase/index.html')).href);
await p.getByRole('button',{name:'→'}).click();
await p.getByRole('status').filter({hasText:'Score 10'}).waitFor();
await p.getByRole('button',{name:'Restart'}).click();
await p.getByRole('status').filter({hasText:'Score 0'}).waitFor();
await p.goto(pathToFileURL(resolve(dir,'run-and-gun/index.html')).href);
await p.locator('canvas').focus();await p.keyboard.down('Space');
await p.getByRole('status').filter({hasText:'Score 100'}).waitFor({timeout:5000});
await p.keyboard.up('Space');await p.getByRole('button',{name:'Restart'}).click();
await p.getByRole('status').filter({hasText:'Score 0 · Health 3'}).waitFor();
if(errors.length)throw Error(errors.join('; '));console.log('PASS: maze pellet and restart; run-and-gun shot, hit, score and restart');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
