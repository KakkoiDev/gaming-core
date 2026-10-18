/*
    Arcade Pack: three classics on one shell (designer card GameArcade): Bricks, Snake and Paddle.
    Instant start, lives, a rising score, a high-score table per game with a name entry.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Add a classic: one object in GAMES with start(), update(input) and render(), a title button, its texts.
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Arcade Pack', 'game.paddle': 'Paddle', 'game.bricks': 'Bricks', 'game.snake': 'Snake',
        'prompt.serve': 'Press {button} to serve', 'hud.best': 'Best {score}', 'scores.enter_name': 'Enter Your Name',
        'action.serve': 'Serve', 'arcade.length': 'Length', 'arcade.you_win': 'You Win', 'arcade.cleared': 'Wall Cleared',
        'arcade.level': 'Level', 'arcade.score_detail': 'Score {score} · Best {best}', 'arcade.again': 'Try Again'},
    ja: {'game.name': 'アーケードパック', 'game.paddle': 'パドル', 'game.bricks': 'ブロックくずし', 'game.snake': 'スネーク',
        'prompt.serve': '{button} でサーブ', 'hud.best': 'ベスト {score}', 'scores.enter_name': '名前を入力',
        'action.serve': 'サーブ', 'arcade.length': 'ながさ', 'arcade.you_win': 'あなたの勝ち', 'arcade.cleared': 'ステージクリア',
        'arcade.level': 'レベル', 'arcade.score_detail': 'スコア {score}・ベスト {best}', 'arcade.again': 'もう一度'},
};

// the game's own actions on top of gaming-core's (moveX/moveY, jump, fire, confirm, back, pause)
const GAME_ACTIONS = {serve: ['key:Space', 'mouse:0', 'pad:0']};

const FIELD = vec2(32, 24);        // world units; the camera fits it to any window
let state = 'title';               // title | play | over
let game;                          // the classic being played (an entry of GAMES)
let score, lives, level;

function best() { const list = highScores(game.id).list(); return list.length ? list[0].score : 0; }

///////////////////////////////////////////////////////////////////////////////
// Bricks: clear the wall, 3 lives

const bricks = {
    id: 'bricks', paddle: vec2(0, -10), size: vec2(4, .6), ball: vec2(), vel: vec2(), waiting: true, wall: [],
    start() { this.paddle = vec2(0, -10); this.build(); this.serve(); },
    build()
    {
        this.wall = [];
        const colors = [hsl(0, .7, .55), hsl(.1, .8, .55), hsl(.33, .6, .5), hsl(.5, .7, .55)];
        for (let row = 0; row < 4; ++row)
            for (let col = 0; col < 10; ++col)
                this.wall.push({pos: vec2(-13.5 + col * 3, 9 - row * 1.2), color: colors[row]});
    },
    serve() { this.waiting = true; this.vel = vec2(); tutorial('prompt.serve', 'serve'); },
    speed() { return min(.25 + level * .03, .45); },  // capped so a phone can follow it
    update(input)
    {
        const limit = FIELD.x / 2 - this.size.x / 2;
        this.paddle.x = clamp(input.device === 'mouse' ? input.mouse.pos.x : this.paddle.x + input.moveX * .5, -limit, limit);
        if (this.waiting)
        {
            this.ball = this.paddle.add(vec2(0, 1));
            if (input.pressed.serve) { this.waiting = false; this.vel = vec2(rand(-.5, .5), 1).normalize(this.speed()); tutorial(); }
            return;
        }
        this.ball = this.ball.add(this.vel);
        const r = .3, half = FIELD.scale(.5);
        if (abs(this.ball.x) > half.x - r) { this.ball.x = sign(this.ball.x) * (half.x - r); this.vel.x *= -1; }
        if (this.ball.y > half.y - r) { this.ball.y = half.y - r; this.vel.y = -abs(this.vel.y); }
        if (this.vel.y < 0 && isOverlapping(this.ball, vec2(r * 2), this.paddle, this.size))
        {
            this.vel = vec2((this.ball.x - this.paddle.x) / this.size.x * 1.6, 1).normalize(this.speed());
            zzfx(...[.3,,300,,.02,.05]);
        }
        const hit = this.wall.findIndex(b=> isOverlapping(this.ball, vec2(r * 2), b.pos, vec2(2.8, 1)));
        if (hit >= 0)
        {
            const b = this.wall[hit];
            this.wall.splice(hit, 1);
            abs(this.ball.x - b.pos.x) > 1.4 ? this.vel.x *= -1 : this.vel.y *= -1;
            score += 10;
            zzfx(...[.3,,600,,.02,.05]);
            if (!this.wall.length) return levelCleared();
        }
        if (this.ball.y < -half.y) loseLife();
    },
    render()
    {
        for (const b of this.wall) drawRect(b.pos, vec2(2.8, 1), b.color);
        drawRect(this.paddle, this.size, WHITE);
        drawRect(this.ball, vec2(.6), WHITE);
    },
    hud() { hudText('hud-left', '♥'.repeat(max(0, lives))); },
};

///////////////////////////////////////////////////////////////////////////////
// Snake: eat, grow, don't hit yourself or the wall

const snake = {
    id: 'snake', grid: vec2(24, 18), body: [], dir: vec2(1, 0), next: vec2(1, 0), food: vec2(), timer: 0,
    start()
    {
        this.body = [vec2(4, 9), vec2(3, 9), vec2(2, 9)];
        this.dir = this.next = vec2(1, 0);
        this.timer = 0;
        this.placeFood();
        tutorial('tutorial.move', 'move');
    },
    placeFood()
    {
        do this.food = vec2(randInt(this.grid.x), randInt(this.grid.y));
        while (this.body.some(p=> p.x === this.food.x && p.y === this.food.y));
    },
    update(input)
    {
        // turn on the strongest axis; never straight back into yourself
        const want = abs(input.moveX) > abs(input.moveY) ? vec2(sign(input.moveX), 0) : input.moveY ? vec2(0, sign(input.moveY)) : null;
        if (want && (want.x !== -this.dir.x || want.y !== -this.dir.y)) { this.next = want; tutorial(); }
        if ((this.timer += timeDelta) < max(.06, .14 - level * .01)) return;
        this.timer = 0;
        this.dir = this.next;
        const head = this.body[0].add(this.dir);
        const dead = head.x < 0 || head.y < 0 || head.x >= this.grid.x || head.y >= this.grid.y ||
            this.body.some(p=> p.x === head.x && p.y === head.y);
        if (dead) return loseLife();
        this.body.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) { score += 10; zzfx(...[.3,,500,,.02,.08]); this.placeFood(); }
        else this.body.pop();
    },
    cell(p) { return vec2(p.x - this.grid.x / 2 + .5, p.y - this.grid.y / 2 + .5); },
    render()
    {
        drawRect(vec2(), this.grid, hsl(0, 0, .08));
        drawRect(this.cell(this.food), vec2(.8), hsl(0, .7, .55));
        this.body.forEach((p, i)=> drawRect(this.cell(p), vec2(.9), i ? hsl(.33, .6, .45) : hsl(.33, .7, .6)));
    },
    hud() { hudText('hud-left', t('arcade.length') + ' ' + this.body.length); },
};

///////////////////////////////////////////////////////////////////////////////
// Paddle: first to 7 against the computer

const paddle = {
    id: 'paddle', left: 0, right: 0, ball: vec2(), vel: vec2(), waiting: true, them: 0, size: vec2(.6, 4),
    start() { this.left = this.right = 0; this.them = 0; this.serve(); },
    serve() { this.ball = vec2(); this.vel = vec2(); this.waiting = true; tutorial('prompt.serve', 'serve'); },
    update(input)
    {
        const half = FIELD.scale(.5), limit = half.y - this.size.y / 2, x = half.x - 1.5;
        this.left = clamp(input.device === 'mouse' ? input.mouse.pos.y : this.left + input.moveY * .5, -limit, limit);
        this.right = clamp(this.right + clamp(this.ball.y - this.right, -.22, .22), -limit, limit);
        if (this.waiting)
        {
            if (input.pressed.serve) { this.waiting = false; this.vel = vec2(1, rand(-.5, .5)).normalize(.32); tutorial(); }
            return;
        }
        this.ball = this.ball.add(this.vel);
        if (abs(this.ball.y) > half.y - .3) { this.ball.y = sign(this.ball.y) * (half.y - .3); this.vel.y *= -1; }
        const bounce = (py, dir)=> { this.vel = vec2(dir, (this.ball.y - py) * .25).normalize(min(this.vel.length() + .01, .45)); zzfx(...[.3,,300,,.02,.05]); };
        if (this.vel.x < 0 && isOverlapping(this.ball, vec2(.6), vec2(-x, this.left), this.size)) bounce(this.left, 1);
        if (this.vel.x > 0 && isOverlapping(this.ball, vec2(.6), vec2(x, this.right), this.size)) bounce(this.right, -1);
        if (this.ball.x > half.x) { score++; if (score >= 7) return win(); this.serve(); }
        if (this.ball.x < -half.x) { this.them++; if (this.them >= 7) return lose(); this.serve(); }
    },
    render()
    {
        const x = FIELD.x / 2 - 1.5;
        for (let y = -FIELD.y / 2; y < FIELD.y / 2; y += 2) drawRect(vec2(0, y + .5), vec2(.15, 1), hsl(0, 0, 1, .3));
        drawRect(vec2(-x, this.left), this.size, WHITE);
        drawRect(vec2(x, this.right), this.size, WHITE);
        drawRect(this.ball, vec2(.6), WHITE);
    },
    hud() { hudText('hud-left', String(this.them)); },
};

const GAMES = {bricks, snake, paddle};

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> game over or results -> retry

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    showScreen(titleScreen({items: [
        {id: 'title-bricks', t: 'game.bricks', onSelect: ()=> start('bricks')},
        {id: 'title-snake', t: 'game.snake', onSelect: ()=> start('snake')},
        {id: 'title-paddle', t: 'game.paddle', onSelect: ()=> start('paddle')},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start(id, keepLevel = false)
{
    game = GAMES[id];
    if (!keepLevel) { score = 0; level = 1; }
    lives = 3;
    state = 'play';
    kitPlaying = true;
    hudInit(`
      <div data-slot="tl" class="game-num game-big" id="hud-left"></div>
      <div data-slot="tc" class="game-stack" style="justify-items:center">
        <b class="game-num game-big" id="hud-score" aria-live="off"></b>
        <span class="game-small game-num" id="hud-best"></span>
      </div>`);
    showScreen(document.getElementById('hud'));
    game.start();
}

function loseLife()
{
    if (game === snake || --lives <= 0) return lose();
    zzfx(...[.4,,150,.02,.1,.2,,,-5]);
    game.serve();
}

function lose()
{
    state = 'over';
    tutorial();
    const items = [{t: 'arcade.again', onSelect: ()=> start(game.id)}, {t: 'gameover.title_screen', onSelect: toTitle}];
    const final = score, scoreTable = highScores(game.id);
    if (scoreTable.qualifies(final))
        return results({title: 'gameover.title', rows: [['hud.score', fmt(final)]], items, scores: {table: game.id, score: final}});
    gameOver({detail: t('arcade.score_detail', {score: fmt(final), best: fmt(max(best(), final))}), items});
}

function win()
{
    state = 'over';
    tutorial();
    results({title: 'arcade.you_win', rows: [['hud.score', score + ' - ' + paddle.them]],
        items: [{t: 'arcade.again', onSelect: ()=> start('paddle')}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

function levelCleared()
{
    state = 'over';
    tutorial();
    results({title: 'arcade.cleared', rows: [['arcade.level', String(level)], ['hud.score', fmt(score)]], stars: lives,
        items: [{t: 'results.next', onSelect: ()=> { level++; start('bricks', true); }}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'serve']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: true, buttons: [{action: 'serve', label: 'action.serve'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    game.update(input);
}

function gameUpdatePost()
{
    // zoom so the whole field fits the window
    cameraScale = min(mainCanvasSize.x / (FIELD.x + 2), mainCanvasSize.y / (FIELD.y + 6));
    cameraPos = vec2(0, -1);
    if (state === 'play' || state === 'over')
    {
        game.hud();
        hudText('hud-score', fmt(score));
        hudText('hud-best', t('hud.best', {score: fmt(max(best(), score))}));
    }
}

function gameRender()
{
    drawRect(vec2(), FIELD, hsl(.65, .3, .12));
    if (state !== 'title') game.render();
    else for (let i = 0; i < 12; ++i) drawRect(vec2(-13.5 + i * 2.5, 9 + Math.sin(time * 2 + i) * .3), vec2(2, .8), hsl(i / 12, .6, .5, .5));
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
