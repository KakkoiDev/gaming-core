const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();try{
const p=await b.newPage();await p.goto(require('url').pathToFileURL(require('path').resolve(process.env.CHESS_FILE||'starters/chess/index.html')).href);
const square=async name=>p.getByRole('button',{name:new RegExp('^'+name+' ')}).click();
const state=async text=>p.getByRole('status').filter({hasText:text}).waitFor({timeout:4000});
await square('e2');await square('e5');await state('Illegal move');
await square('e4');await state('Black to move');
await p.getByRole('button',{name:'Undo'}).click();await state('White to move');
for(const x of ['f2','f3','e7','e5','g2','g4','d8','h4'])await square(x);
await state('White is checkmated');
await p.getByRole('button',{name:'Restart'}).click();await state('White to move');
console.log('PASS: legal and illegal moves, undo, checkmate and restart');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
