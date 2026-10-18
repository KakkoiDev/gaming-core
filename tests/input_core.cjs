// Unit tests of the engine-free mapping logic in starters/input.js. Run: node --test tests/input_core.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {gcInputCore:core,GC_INPUT_DEFAULTS:defaults,GC_INPUT_VERSION}=require(path.join(__dirname,'../starters/input.js'));

// fake device state: keys/mouse/pad sets of held and pressed codes, sticks {left,right}
function reader({down=[],pressed=[],left={x:0,y:0},right={x:0,y:0}}={}){
 const id=s=>s.device+':'+s.code;
 return {down:s=>down.includes(id(s)),pressed:s=>pressed.includes(id(s)),stick:side=>side==='right'?right:left};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('parse accepts the three binding kinds and rejects the rest',()=>{
 assert.deepEqual(core.parse('key:Space'),{device:'key',code:'Space'});
 assert.deepEqual(core.parse('mouse:2'),{device:'mouse',code:2});
 assert.deepEqual(core.parse('pad:16'),{device:'pad',code:16});
 for(const bad of ['Space','key:a','key:','mouse:5','pad:17','pad:-1','gamepad:0',3,null]) assert.equal(core.parse(bad),undefined,String(bad));
});

test('dead zone is radial and rescales from the edge to full tilt',()=>{
 assert.deepEqual(core.deadZone(.05,.05,.1),{x:0,y:0});
 assert.deepEqual(core.deadZone(.1,0,.1),{x:0,y:0});
 near(core.deadZone(.55,0,.1).x,.5);
 near(core.deadZone(1,0,.1).x,1);
 const diagonal=core.deadZone(.6,.8,.2);near(Math.hypot(diagonal.x,diagonal.y),1);near(diagonal.x/diagonal.y,.75);
 assert.deepEqual(core.deadZone(.3,0,0),{x:.3,y:0});
});

test('axis combines digital and analog input and clamps to -1..1',()=>{
 assert.equal(core.axis(false,false,0),0);
 assert.equal(core.axis(true,false,0),-1);
 assert.equal(core.axis(true,true,0),0);
 assert.equal(core.axis(false,true,.5),1);
 assert.equal(core.axis(false,false,-.4),-.4);
});

test('edges: press, hold, release and a tap inside one frame',()=>{
 assert.deepEqual(core.edges(false,true,true),{pressed:true,released:false});
 assert.deepEqual(core.edges(true,true,false),{pressed:false,released:false});
 assert.deepEqual(core.edges(true,false,false),{pressed:false,released:true});
 assert.deepEqual(core.edges(false,false,true),{pressed:true,released:true});
 assert.deepEqual(core.edges(false,false,false),{pressed:false,released:false});
});

test('snapshot: keyboard, d-pad and stick feed the move axes, diagonals are clamped',()=>{
 let s=core.snapshot(defaults,reader({down:['key:KeyD']}),undefined,.1);
 assert.equal(s.moveX,1);assert.equal(s.moveY,0);
 s=core.snapshot(defaults,reader({down:['key:ArrowUp','key:ArrowRight']}),undefined,.1);
 near(Math.hypot(s.moveX,s.moveY),1);near(s.moveX,Math.SQRT1_2);
 s=core.snapshot(defaults,reader({down:['pad:14']}),undefined,.1);assert.equal(s.moveX,-1);
 s=core.snapshot(defaults,reader({left:{x:0,y:.05}}),undefined,.1);assert.equal(s.moveY,0);
 s=core.snapshot(defaults,reader({left:{x:0,y:1}}),undefined,.1);assert.equal(s.moveY,1);
 s=core.snapshot(defaults,reader({right:{x:1,y:0}}),undefined,.1);assert.equal(s.moveX,0);near(s.sticks.right.x,1);
});

test('snapshot: pressed and released edges across frames and devices',()=>{
 const f1=core.snapshot(defaults,reader({down:['key:Space'],pressed:['key:Space']}));
 assert.equal(f1.pressed.jump,true);assert.equal(f1.held.jump,true);assert.equal(f1.pressed.confirm,true);
 const f2=core.snapshot(defaults,reader({down:['key:Space','pad:0'],pressed:['pad:0']}),f1);
 assert.equal(f2.pressed.jump,false,'a second source on a held action does not press again');
 const f3=core.snapshot(defaults,reader({down:['pad:0']}),f2);
 assert.equal(f3.released.jump,false,'still held by the pad');
 const f4=core.snapshot(defaults,reader(),f3);
 assert.equal(f4.released.jump,true);assert.equal(f4.held.jump,false);
 const click=core.snapshot(defaults,reader({pressed:['mouse:0']}),f4);
 assert.equal(click.pressed.fire,true);assert.equal(click.released.fire,true);
});

test('rebinding: bind, invalid bind, merge, restore and reset copies',()=>{
 const bindings=core.merge(defaults,{actions:{dash:['key:ShiftLeft','pad:5']}});
 assert.deepEqual(bindings.actions.dash,['key:ShiftLeft','pad:5']);
 assert.equal(defaults.actions.dash,undefined,'defaults are not changed');
 assert.equal(core.bind(bindings,'jump',['key:KeyK']),true);
 assert.equal(core.snapshot(bindings,reader({down:['key:KeyK']})).held.jump,true);
 assert.equal(core.snapshot(bindings,reader({down:['key:Space']})).held.jump,false);
 assert.equal(core.bind(bindings,'jump',['k']),false);assert.deepEqual(bindings.actions.jump,['key:KeyK']);
 assert.equal(core.bind(bindings,'nothing',['key:KeyK']),false);
 assert.equal(core.bind(bindings,'moveX.negative',['key:KeyJ']),true);
 assert.equal(core.snapshot(bindings,reader({down:['key:KeyJ']})).moveX,-1);
 assert.equal(core.bind(bindings,'moveX.sideways',['key:KeyJ']),false);
 // save/load round trip through JSON, as localStorage does
 const saved=JSON.parse(JSON.stringify({version:GC_INPUT_VERSION,actions:bindings.actions,axes:bindings.axes}));
 const fresh=core.merge(defaults,{actions:{dash:['key:ShiftLeft']}});
 const restored=core.restore(saved,fresh);
 assert.deepEqual(restored.actions.jump,['key:KeyK']);assert.deepEqual(restored.axes.moveX.negative,['key:KeyJ']);
 assert.deepEqual(restored.actions.dash,['key:ShiftLeft','pad:5']);
 // bad or old saves fall back to defaults per entry
 const broken=core.restore({version:GC_INPUT_VERSION,actions:{jump:['nope'],ghost:['key:KeyQ']},axes:{moveY:{positive:'key:KeyW'}}},defaults);
 assert.deepEqual(broken.actions.jump,defaults.actions.jump);assert.equal(broken.actions.ghost,undefined);
 assert.deepEqual(broken.axes.moveY.positive,defaults.axes.moveY.positive);
 assert.deepEqual(core.restore({version:0,actions:{jump:['key:KeyQ']}},defaults),core.copy(defaults));
 assert.deepEqual(core.restore(null,defaults),core.copy(defaults));
});

test('fixed actions: bind refuses them, restore keeps their defaults',()=>{
 const bindings=core.copy(defaults),fixed=['pause','back'];
 assert.equal(core.bind(bindings,'pause',['key:KeyQ'],fixed),false);assert.deepEqual(bindings.actions.pause,defaults.actions.pause);
 assert.equal(core.bind(bindings,'back',['pad:3'],fixed),false);
 assert.equal(core.bind(bindings,'jump',['key:KeyQ'],fixed),true);
 const saved={version:GC_INPUT_VERSION,actions:{pause:['key:KeyQ'],back:['key:KeyB'],jump:['key:KeyK']},axes:{}};
 const restored=core.restore(saved,defaults,fixed);
 assert.deepEqual(restored.actions.pause,defaults.actions.pause);assert.deepEqual(restored.actions.back,defaults.actions.back);
 assert.deepEqual(restored.actions.jump,['key:KeyK']);
});

test('binding: the first binding string of an action or axis for a device',()=>{
 assert.equal(core.binding(defaults,'jump','gamepad'),'pad:0');
 assert.equal(core.binding(defaults,'fire','mouse'),'mouse:0');
 assert.equal(core.binding(defaults,'fire','touch'),'mouse:0');
 assert.equal(core.binding(defaults,'pause','mouse'),'key:Escape','no mouse binding falls back to the key');
 assert.equal(core.binding(defaults,'fire','keyboard'),'key:KeyX');
 assert.equal(core.binding(defaults,'moveX','keyboard'),'key:ArrowLeft');
 assert.equal(core.binding(defaults,'moveY','gamepad'),'pad:13');
 assert.equal(core.binding(defaults,'nothing','keyboard'),'');
});

test('prompts follow the device and fall back to the keyboard for mouse',()=>{
 assert.equal(core.prompt(defaults,'jump','keyboard'),'Space');
 assert.equal(core.prompt(defaults,'jump','gamepad'),'South','gamepad buttons by position by default');
 assert.equal(core.prompt(defaults,'back','gamepad'),'East');
 assert.equal(core.prompt(defaults,'fire','gamepad'),'West');
 assert.equal(core.label('pad:3'),'North');assert.equal(core.label('pad:8'),'Select');assert.equal(core.label('pad:7'),'Right trigger');
 assert.equal(core.prompt(defaults,'jump','gamepad','xbox'),'A');
 assert.equal(core.prompt(defaults,'jump','gamepad','playstation'),'Cross');
 assert.equal(core.prompt(defaults,'fire','mouse'),'Left click');
 assert.equal(core.prompt(defaults,'pause','mouse'),'Esc');
 assert.equal(core.prompt(defaults,'pause','gamepad'),'Start');
 assert.equal(core.prompt(defaults,'pause','gamepad','xbox'),'Menu');
 assert.equal(core.prompt(defaults,'moveX','keyboard'),'Left/Right');
 assert.equal(core.prompt(defaults,'moveY','gamepad'),'Left stick');
 assert.equal(core.prompt(defaults,'move','keyboard'),'Left/Right Down/Up');
 assert.equal(core.prompt(defaults,'move','gamepad'),'Left stick');
 assert.equal(core.label('key:KeyW'),'W');assert.equal(core.label('key:Digit3'),'3');assert.equal(core.label('key:ShiftLeft'),'Shift Left');
 core.layout={KeyQ:'a'};assert.equal(core.label('key:KeyQ'),'A','the printed layout wins (AZERTY)');core.layout=undefined;
 assert.equal(core.prompt(defaults,'unknown','keyboard'),'');
});
