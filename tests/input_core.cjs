// Unit tests of the engine-free mapping logic in starters/input.js. Run: node --test tests/input_core.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {gcInputCore:core,GC_INPUT_DEFAULTS}=require(path.join(__dirname,'../starters/input.js'));
const defaults=core.normalizeAll(GC_INPUT_DEFAULTS);

// fake device state: lists of held and pressed 'keyboard:Space' / 'mouse:0' / 'gamepad:0' ids, sticks {left,right}, virtual (touch)
function reader({down=[],pressed=[],left={x:0,y:0},right={x:0,y:0},vheld={},vtapped={},vdirs={}}={}){
 const id=s=>s.device+':'+s.code;
 return {down:s=>down.includes(id(s)),pressed:s=>pressed.includes(id(s)),stick:side=>side==='right'?right:left,
  virtualHeld:n=>vheld[n],virtualTapped:n=>vtapped[n],virtualDir:n=>vdirs[n]};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('normalize: the ControlsRemap format, single values or lists, directions, and invalid entries',()=>{
 assert.deepEqual(core.normalize({keyboard:'Space',mouse:null,gamepad:0}),{keyboard:['Space'],mouse:[],gamepad:[0]});
 assert.deepEqual(core.normalize({keyboard:['KeyW','KeyA','KeyS','KeyD'],gamepad:'leftStick'}),{keyboard:[['KeyW','KeyA','KeyS','KeyD']],mouse:[],gamepad:['leftStick'],direction:true});
 assert.deepEqual(core.normalize({keyboard:'Escape',gamepad:9,fixed:true}),{keyboard:['Escape'],mouse:[],gamepad:[9],fixed:true});
 for(const bad of [{keyboard:'a'},{gamepad:17},{gamepad:-1},{mouse:5},{keyboard:['KeyW','KeyA'],gamepad:'leftStick'},{gamepad:'dpad',mouse:0},null,'Space',[1]])
  assert.equal(core.normalize(bad),undefined,JSON.stringify(bad));
 assert.throws(()=>core.normalizeAll({dash:{gamepad:20}}),/dash/);
});

test('defaults: names aligned with GameKit, pause and back fixed, gamepad by position',()=>{
 assert.deepEqual(Object.keys(defaults),['move','confirm','back','pause','jump','attack','interact']);
 assert.equal(defaults.pause.fixed,true);assert.equal(defaults.back.fixed,true);assert.equal(defaults.jump.fixed,undefined);
 assert.deepEqual(defaults.attack.gamepad,[2,7]);assert.deepEqual(defaults.move.gamepad,['leftStick','dpad']);
});

test('legacy strings: old lists, old axes and an old saved object migrate to the new format',()=>{
 assert.deepEqual(core.fromLegacy(['key:Space','mouse:0','pad:2']),{keyboard:['Space'],mouse:[0],gamepad:[2]});
 assert.equal(core.fromLegacy(['key:Space','joy:1']),undefined);
 const old={version:1,actions:{jump:['key:KeyQ','pad:0'],fire:['key:KeyF','mouse:0'],ghost:['key:KeyG']},
  axes:{moveX:{negative:['key:ArrowLeft','key:KeyA','pad:14'],positive:['key:ArrowRight','key:KeyD','pad:15'],stick:'left.x'},
        moveY:{negative:['key:ArrowDown','key:KeyS','pad:13'],positive:['key:ArrowUp','key:KeyW','pad:12'],stick:'left.y'}}};
 const table=core.migrate(old);
 assert.deepEqual(table.attack,{keyboard:['KeyF'],mouse:[0],gamepad:[]},'fire becomes attack');
 assert.deepEqual(table.move,{keyboard:[['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'],['KeyW','KeyA','KeyS','KeyD']],gamepad:['leftStick','dpad']});
 const restored=core.restore(table,defaults);
 assert.deepEqual(restored.jump.keyboard,['KeyQ']);assert.deepEqual(restored.attack.keyboard,['KeyF']);
 assert.equal(restored.ghost,undefined,'unknown names are dropped');
 assert.equal(core.migrate({version:1}),undefined);assert.equal(core.migrate(null),undefined);
 // old init({actions}) entries are accepted where an entry is expected
 assert.deepEqual(core.merge(defaults,{dash:['key:ShiftLeft','pad:5']}).dash,{keyboard:['ShiftLeft'],mouse:[],gamepad:[5]});
});

test('dead zone is radial and rescales from the edge to full tilt',()=>{
 assert.deepEqual(core.deadZone(.05,.05,.1),{x:0,y:0});
 assert.deepEqual(core.deadZone(.1,0,.1),{x:0,y:0});
 near(core.deadZone(.55,0,.1).x,.5);
 near(core.deadZone(1,0,.1).x,1);
 const diagonal=core.deadZone(.6,.8,.2);near(Math.hypot(diagonal.x,diagonal.y),1);near(diagonal.x/diagonal.y,.75);
 assert.deepEqual(core.deadZone(.3,0,0),{x:.3,y:0});
});

test('edges: press, hold, release and a tap inside one tick',()=>{
 assert.deepEqual(core.edges(false,true,true),{pressed:true,released:false});
 assert.deepEqual(core.edges(true,true,false),{pressed:false,released:false});
 assert.deepEqual(core.edges(true,false,false),{pressed:false,released:true});
 assert.deepEqual(core.edges(false,false,true),{pressed:true,released:true});
 assert.deepEqual(core.edges(false,false,false),{pressed:false,released:false});
});

test('snapshot: keys, d-pad, stick and touch stick feed move, diagonals are clamped, steps last one tick',()=>{
 let s=core.snapshot(defaults,reader({down:['keyboard:KeyD']}),undefined,.1);
 assert.equal(s.moveX,1);assert.equal(s.moveY,0);
 s=core.snapshot(defaults,reader({down:['keyboard:ArrowUp','keyboard:ArrowRight']}),undefined,.1);
 near(Math.hypot(s.moveX,s.moveY),1);near(s.moveX,Math.SQRT1_2);
 s=core.snapshot(defaults,reader({down:['gamepad:14']}),undefined,.1);assert.equal(s.moveX,-1);
 s=core.snapshot(defaults,reader({left:{x:0,y:.05}}),undefined,.1);assert.equal(s.moveY,0);
 s=core.snapshot(defaults,reader({left:{x:0,y:1}}),undefined,.1);assert.equal(s.moveY,1);
 s=core.snapshot(defaults,reader({right:{x:1,y:0}}),undefined,.1);assert.equal(s.moveX,0);near(s.sticks.right.x,1);
 s=core.snapshot(defaults,reader({vdirs:{move:{x:.62,y:0}}}));near(s.moveX,.62);
 // steps: a key press is one step; holding is no more steps; a stick crossing half tilt is one step
 const a=core.snapshot(defaults,reader({down:['keyboard:KeyS'],pressed:['keyboard:KeyS']}));assert.deepEqual(a.step.move,{x:0,y:-1});
 const b=core.snapshot(defaults,reader({down:['keyboard:KeyS']}),a);assert.deepEqual(b.step.move,{x:0,y:0});
 const c=core.snapshot(defaults,reader({left:{x:.9,y:0}}),b,.1);assert.deepEqual(c.step.move,{x:1,y:0});
 const d=core.snapshot(defaults,reader({left:{x:1,y:0}}),c,.1);assert.deepEqual(d.step.move,{x:0,y:0});
 const e=core.snapshot(defaults,reader({down:['gamepad:12'],pressed:['gamepad:12']}),d);assert.deepEqual(e.step.move,{x:0,y:1});
});

test('snapshot: pressed and released edges across ticks, devices, touch buttons and aliases',()=>{
 const f1=core.snapshot(defaults,reader({down:['keyboard:Space'],pressed:['keyboard:Space']}));
 assert.equal(f1.pressed.jump,true);assert.equal(f1.held.jump,true);assert.equal(f1.pressed.confirm,true);
 const f2=core.snapshot(defaults,reader({down:['keyboard:Space','gamepad:0'],pressed:['gamepad:0']}),f1);
 assert.equal(f2.pressed.jump,false,'a second source on a held action does not press again');
 const f3=core.snapshot(defaults,reader({down:['gamepad:0']}),f2);
 assert.equal(f3.released.jump,false,'still held by the pad');
 const f4=core.snapshot(defaults,reader(),f3);
 assert.equal(f4.released.jump,true);assert.equal(f4.held.jump,false);
 const click=core.snapshot(defaults,reader({pressed:['mouse:0']}),f4);
 assert.equal(click.pressed.attack,true);assert.equal(click.released.attack,true);
 assert.equal(click.pressed.fire,true,'fire is an alias of attack');assert.equal(click.pressed.cancel,false);
 const touch=core.snapshot(defaults,reader({vheld:{jump:true},vtapped:{jump:true}}),f4);assert.equal(touch.pressed.jump,true);
 const own=core.merge(defaults,{fire:{keyboard:'KeyF'}});
 assert.equal(core.snapshot(own,reader({pressed:['mouse:0']})).pressed.fire,false,'a game that binds fire itself gets its own');
});

test('bind: per device, fixed refused, invalid refused, aliases resolved',()=>{
 const b=core.merge(defaults,{dash:{keyboard:'ShiftLeft',gamepad:5}});
 assert.equal(core.bind(b,'jump',{keyboard:['KeyK']}),true);
 assert.deepEqual(b.jump.keyboard,['KeyK']);assert.deepEqual(b.jump.gamepad,[0],'other devices kept');
 assert.equal(core.snapshot(b,reader({down:['keyboard:KeyK']})).held.jump,true);
 assert.equal(core.snapshot(b,reader({down:['keyboard:Space']})).held.jump,false);
 assert.equal(core.bind(b,'jump',{keyboard:'k'}),false);assert.deepEqual(b.jump.keyboard,['KeyK']);
 assert.equal(core.bind(b,'pause',{keyboard:'KeyQ'}),false,'pause is fixed');
 assert.equal(core.bind(b,'back',{gamepad:3}),false,'back is fixed');
 assert.equal(core.bind(b,'nothing',{keyboard:'KeyK'}),false);
 assert.equal(core.bind(b,'fire',{gamepad:6}),true);assert.deepEqual(b.attack.gamepad,[6]);
 assert.equal(core.bind(b,'move',{keyboard:['KeyI','KeyJ','KeyK','KeyL']}),true);
 assert.equal(core.snapshot(b,reader({down:['keyboard:KeyJ']})).moveX,-1);
 assert.equal(core.bind(b,'move',{gamepad:3}),false,'a direction takes sticks, not buttons');
 assert.equal(core.bind(b,'jump',['key:KeyQ','pad:1']),true,'old string lists still bind');assert.deepEqual(b.jump.gamepad,[1]);
 const fixedMore=core.merge(defaults,{},['interact']);assert.equal(core.bind(fixedMore,'interact',{keyboard:'KeyQ'}),false);
});

test('rebind: ControlsRemap change with swapping, fixed and menu inputs respected',()=>{
 const b=core.copy(defaults);
 assert.deepEqual(core.rebind(b,'attack','keyboard','KeyK'),{ok:true,swapped:null});assert.deepEqual(b.attack.keyboard,['KeyK','KeyX']);
 // Space is jump's: the two swap; confirm (a menu action) keeps Space
 assert.deepEqual(core.rebind(b,'attack','keyboard','Space'),{ok:true,swapped:'jump'});
 assert.deepEqual(b.attack.keyboard,['Space','KeyX']);assert.deepEqual(b.jump.keyboard,['KeyK','KeyZ']);assert.deepEqual(b.confirm.keyboard,['Enter','Space']);
 assert.deepEqual(core.rebind(b,'jump','gamepad',2),{ok:true,swapped:'attack'});assert.deepEqual(b.jump.gamepad,[2]);assert.deepEqual(b.attack.gamepad,[0,7]);
 assert.deepEqual(core.rebind(b,'pause','keyboard','KeyQ'),{ok:false,reason:'fixed'});
 assert.deepEqual(core.rebind(b,'jump','keyboard','KeyP'),{ok:false,reason:'fixed'},'taking a fixed action\'s key is refused');
 assert.deepEqual(core.rebind(b,'jump','keyboard','k'),{ok:false,reason:'invalid'});
 assert.deepEqual(core.rebind(b,'nope','keyboard','KeyK'),{ok:false,reason:'unknown'});
 assert.deepEqual(core.rebind(b,'move','keyboard','KeyI',0),{ok:true,swapped:null});assert.deepEqual(b.move.keyboard[0],['KeyI','KeyA','KeyS','KeyD']);
 assert.deepEqual(core.rebind(b,'interact','keyboard','KeyA'),{ok:true,swapped:'move'});assert.deepEqual(b.move.keyboard[0],['KeyI','KeyE','KeyS','KeyD']);
 assert.deepEqual(core.rebind(b,'interact','mouse',1),{ok:true,swapped:null});assert.deepEqual(b.interact.mouse,[1]);
});

test('save format: compact ControlsRemap Data, round trip, bad entries fall back per device',()=>{
 const b=core.merge(defaults,{dash:{keyboard:'ShiftLeft'}});core.bind(b,'jump',{keyboard:'KeyK'});
 const saved=JSON.parse(JSON.stringify(core.compact(b)));
 assert.deepEqual(saved.jump,{keyboard:'KeyK',mouse:null,gamepad:0});
 assert.deepEqual(saved.pause,{keyboard:['Escape','KeyP'],mouse:null,gamepad:9,fixed:true});
 assert.deepEqual(saved.move,{keyboard:[['KeyW','KeyA','KeyS','KeyD'],['ArrowUp','ArrowLeft','ArrowDown','ArrowRight']],gamepad:['leftStick','dpad']});
 const fresh=core.merge(defaults,{dash:{keyboard:'ShiftRight'}});
 const restored=core.restore(saved,fresh);
 assert.deepEqual(restored.jump.keyboard,['KeyK']);assert.deepEqual(restored.dash.keyboard,['ShiftLeft']);
 const broken=core.restore({jump:{keyboard:'nope',gamepad:3},pause:{keyboard:'KeyQ'},ghost:{keyboard:'KeyQ'},move:{keyboard:['KeyW'],gamepad:'rightStick'}},defaults);
 assert.deepEqual(broken.jump.keyboard,defaults.jump.keyboard,'bad keyboard falls back');assert.deepEqual(broken.jump.gamepad,[3],'good gamepad kept');
 assert.deepEqual(broken.pause,defaults.pause,'fixed entries ignore saves');assert.equal(broken.ghost,undefined);
 assert.deepEqual(broken.move.keyboard,defaults.move.keyboard);assert.deepEqual(broken.move.gamepad,['rightStick']);
 assert.deepEqual(core.restore(null,defaults),core.copy(defaults));
 // ControlsRemap's own Data sample loads as it is
 const sample={move:{keyboard:['KeyW','KeyA','KeyS','KeyD'],gamepad:'leftStick'},jump:{keyboard:'Space',mouse:null,gamepad:0},attack:{keyboard:'KeyJ',mouse:0,gamepad:2},interact:{keyboard:'KeyE',gamepad:3},pause:{keyboard:'Escape',gamepad:9,fixed:true}};
 const fromSample=core.restore(sample,defaults);
 assert.deepEqual(fromSample.move.keyboard,[['KeyW','KeyA','KeyS','KeyD']]);assert.deepEqual(fromSample.attack.gamepad,[2]);
});

test('prompts: gamepad by position by default (en, ja), brands on request, device fallbacks',()=>{
 assert.equal(core.prompt(defaults,'jump','keyboard'),'Space');
 assert.equal(core.prompt(defaults,'jump','gamepad'),'South button');
 assert.equal(core.prompt(defaults,'jump','gamepad','position','ja'),'下ボタン');
 assert.equal(core.prompt(defaults,'back','gamepad'),'East button');
 assert.equal(core.prompt(defaults,'attack','gamepad'),'West button');
 assert.equal(core.prompt(defaults,'interact','gamepad'),'North button');
 assert.equal(core.prompt(defaults,'pause','gamepad'),'Start');
 assert.equal(core.prompt(defaults,'jump','gamepad','xbox'),'A');
 assert.equal(core.prompt(defaults,'jump','gamepad','playstation'),'Cross');
 assert.equal(core.prompt(defaults,'attack','mouse'),'Left click');
 assert.equal(core.prompt(defaults,'attack','mouse','position','ja'),'左クリック');
 assert.equal(core.prompt(defaults,'fire','keyboard'),'J');
 assert.equal(core.prompt(defaults,'pause','mouse'),'Esc','mouse falls back to the key');
 assert.equal(core.prompt(defaults,'confirm','touch'),'Tap');
 assert.equal(core.prompt(defaults,'move','keyboard'),'W A S D');
 assert.equal(core.prompt(defaults,'move','gamepad'),'Left stick');
 assert.equal(core.prompt(defaults,'move','gamepad','position','ja'),'左スティック');
 assert.equal(core.prompt(defaults,'unknown','keyboard'),'');
 assert.equal(core.keyLabel('KeyW'),'W');assert.equal(core.keyLabel('Digit3'),'3');assert.equal(core.keyLabel('ShiftLeft'),'Shift');
 assert.equal(core.keyLabel('KeyQ',{KeyQ:'a'}),'A','the printed layout wins (AZERTY)');
 assert.deepEqual(core.glyphs(defaults,'jump','gamepad'),[{kind:'pad',code:0,label:'South button',short:'South',pos:'south'}]);
 assert.deepEqual(core.glyphs(defaults,'attack','mouse')[0].button,'left');
 assert.equal(core.glyphs(defaults,'move','keyboard').length,4);
});
