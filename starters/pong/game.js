/*
    Pong starter adapted from the LittleJS-AI pong example (MIT, LICENSE-littlejs-ai.txt).
    Controls come from input.js: mouse, keyboard (W/S or arrows) or gamepad (stick or d-pad).
    Confirm (click, Space, Enter, gamepad south button) serves; Pause (Esc, P, gamepad start) pauses.
    The camera zooms so the whole field fits any window.
*/
'use strict';

gravity = vec2(0, 0);
cameraPos = vec2(0, 0);
cameraScale = 32;
debugWatermark = false;
debugKey = 'Backquote'; // Esc is the game's pause/back key, so ` opens the LittleJS debug overlay

const fieldSize = vec2(38, 22);
const paddleSize = vec2(0.7, 4);
const ballSize = vec2(0.7, 0.7);
const aiSpeed = 0.3;
const ballSpeed = 0.35;
const paddleSpeed = 0.5;

let leftY;
let rightY;
let ball;
let ballVel;
let waitingToServe;
let serveDir;
let leftScore;
let rightScore;
let half;
let leftX;
let rightX;
let limitY;
let gamePaused = false;

function resetBall(dir)
{
    ball = vec2(0, 0);
    ballVel = vec2();
    waitingToServe = true;
    serveDir = dir;
}

function gameInit()
{
    gcInput.init(); // bindings saved under '<folder name>.input', here 'pong.input'
    fitField();
    leftY = rightY = 0;
    leftScore = rightScore = 0;
    resetBall(rand() < 0.5 ? -1 : 1);
}

function gameUpdate()
{
    half = fieldSize.scale(0.5);
    limitY = half.y - paddleSize.y / 2;
    leftX = -half.x + 1.5;
    rightX = half.x - 1.5;

    const input = gcInput.update();
    if (input.pressed.pause)
        gamePaused = !gamePaused;
    if (gamePaused)
        return;

    // the mouse drives the paddle while it is the active device, otherwise the move axis does
    if (input.device === 'mouse')
        leftY = clamp(input.mouse.pos.y, -limitY, limitY);
    else
        leftY = clamp(leftY + input.moveY * paddleSpeed, -limitY, limitY);

    rightY = clamp(rightY + clamp(ball.y - rightY, -aiSpeed, aiSpeed), -limitY, limitY);

    if (waitingToServe)
    {
        if (input.pressed.confirm)
        {
            ballVel = vec2(serveDir, rand(-0.5, 0.5)).normalize(ballSpeed);
            waitingToServe = false;
        }
        return;
    }

    ball = ball.add(ballVel);

    const ballR = ballSize.y / 2;
    if (ball.y > half.y - ballR)
    {
        ball.y = half.y - ballR;
        ballVel.y = -Math.abs(ballVel.y);
    }
    else if (ball.y < -half.y + ballR)
    {
        ball.y = -half.y + ballR;
        ballVel.y = Math.abs(ballVel.y);
    }

    if (ballVel.x < 0 && isOverlapping(ball, ballSize, vec2(leftX, leftY), paddleSize))
        bounceOffPaddle(leftX + (paddleSize.x + ballSize.x) / 2, leftY, 1);
    if (ballVel.x > 0 && isOverlapping(ball, ballSize, vec2(rightX, rightY), paddleSize))
        bounceOffPaddle(rightX - (paddleSize.x + ballSize.x) / 2, rightY, -1);

    if (ball.x < -half.x)
    {
        ++rightScore;
        resetBall(1);
    }
    else if (ball.x > half.x)
    {
        ++leftScore;
        resetBall(-1);
    }
}

function bounceOffPaddle(ballX, paddleY, dir)
{
    ball.x = ballX;
    ballVel.x = dir * Math.abs(ballVel.x);
    ballVel.y += (ball.y - paddleY) * 0.05;
    ballVel = ballVel.normalize(ballSpeed);
}

// zoom so the field and both paddles fit the window, whatever its shape (38 x 22 units plus a margin)
function fitField()
{
    if (mainCanvasSize.x && mainCanvasSize.y)
        cameraScale = min(mainCanvasSize.x / (fieldSize.x + 2), mainCanvasSize.y / (fieldSize.y + 6));
}

function gameUpdatePost()
{
    fitField();
}

function gameRender()
{
    for (let y = -half.y; y < half.y; y += 2)
        drawRect(vec2(0, y), vec2(0.2, 1.1), hsl(0, 0, 1, 0.4));

    drawRect(vec2(leftX, leftY), paddleSize, WHITE);
    drawRect(vec2(rightX, rightY), paddleSize, WHITE);
    drawRect(ball, ballSize, WHITE);
}

function gameRenderPost()
{
    const cx = mainCanvasSize.x / 2;
    drawTextScreen(leftScore, vec2(cx - 100, 70), 70, WHITE);
    drawTextScreen(rightScore, vec2(cx + 100, 70), 70, WHITE);
    if (gamePaused)
        drawTextScreen('Paused - ' + gcInput.prompt('pause') + ' to resume', vec2(cx, mainCanvasSize.y / 2), 50, WHITE);
    else if (waitingToServe)
        drawTextScreen(gcInput.prompt('confirm') + ' to serve', vec2(cx, mainCanvasSize.y - 90), 50, WHITE);
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
