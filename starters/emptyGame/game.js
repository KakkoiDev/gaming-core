/*
    Empty starter adapted from the LittleJS-AI emptyGame example (MIT, LICENSE-littlejs-ai.txt).
    - A square moved with the keyboard (WASD or arrows) or a gamepad (left stick or d-pad)
    - Fire with the mouse (left click) moves it to the pointer; Jump (Space, gamepad A) hops
    - Back (Esc, right click, gamepad B) recenters it
    - Controls come from input.js; the prompt line follows the device used last
*/

'use strict';
debugWatermark = false; // hide the FPS/version watermark in the corner
debugKey = 'Backquote'; // Esc is the game's pause/back key, so ` opens the LittleJS debug overlay

const playerSpeed = 0.2;
let player;      // world position of the square
let hop;         // seconds left of the jump hop
let lastAction;  // name of the last action pressed, shown on screen

///////////////////////////////////////////////////////////////////////////////
function gameInit()
{
    // called once after the engine starts up
    gcInput.init({storageKey: 'emptyGame.input'});
    cameraScale = 32;
    player = vec2();
    hop = 0;
    lastAction = '';
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate()
{
    // called every frame at 60 frames per second
    const input = gcInput.update(); // exactly once per frame
    player = player.add(vec2(input.moveX, input.moveY).scale(playerSpeed));
    if (input.pressed.fire && input.device === 'mouse')
        player = input.mouse.pos.copy();
    if (input.pressed.jump)
        hop = 0.3;
    if (input.pressed.back)
        player = vec2();
    hop = max(0, hop - timeDelta);
    for (const name in input.pressed)
        if (input.pressed[name])
            lastAction = name;
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost()
{
    // called after physics and objects are updated
    // setup camera and prepare for render
}

///////////////////////////////////////////////////////////////////////////////
function gameRender()
{
    // called before objects are rendered
    // draw any background effects that appear behind objects
    drawRect(player.add(vec2(0, hop * 4)), vec2(1), hop ? YELLOW : WHITE);
}

///////////////////////////////////////////////////////////////////////////////
function gameRenderPost()
{
    // called after objects are rendered
    // draw effects or hud that appear above all objects
    drawTextScreen('Hello World!', mainCanvasSize.scale(.5).add(vec2(0, -120)), 80);
    const prompts = 'Move ' + gcInput.prompt('move') +
        '   Jump ' + gcInput.prompt('jump') + '   Back ' + gcInput.prompt('back');
    drawTextScreen(prompts, vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 60), 24);
    drawTextScreen((gcInput.state ? gcInput.state.device : '') + ' ' + lastAction, vec2(mainCanvasSize.x / 2, 40), 24);
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
