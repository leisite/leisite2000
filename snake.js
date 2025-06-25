// 游戏参数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const box = 20; // 每格大小
const canvasSize = 600;
let snake, direction, foods, score, gameInterval, isPaused, isGameOver;
let badBeans = [], slowBeans = [], reverseBeans = [];
const BEAN_COUNT = 3;
let snakeWidth;
let speed = 120;
let reverseMode = false;
let reverseTimer = 0;
let slowTimers = [];
let aiSnakes = [];
const AI_COLORS = [
    ['#e53935', '#ffb300'], // 红头黄身
    ['#1976d2', '#64b5f6']  // 蓝头浅蓝身
];
const AI_LENGTH = 5;
const AI_COUNT = 2;
let particles = [];

function initGame() {
    snake = [
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 }
    ];
    direction = 'RIGHT';
    foods = randomBeans(BEAN_COUNT);
    badBeans = randomBeans(BEAN_COUNT);
    slowBeans = randomBeans(BEAN_COUNT);
    reverseBeans = randomBeans(BEAN_COUNT);
    score = 0;
    isPaused = false;
    isGameOver = false;
    snakeWidth = 1;
    speed = 120;
    reverseMode = false;
    reverseTimer = 0;
    document.getElementById('score').innerText = '分数：' + score;
    clearInterval(gameInterval);
    gameInterval = null;
    aiSnakes = [];
    if (window.gameMode === 'battle') {
        for (let i = 0; i < AI_COUNT; i++) {
            aiSnakes.push(genAISnake(i));
        }
    }
    draw();
}

function randomBeans(n) {
    const beans = [];
    while (beans.length < n) {
        let bean = {
            x: Math.floor(Math.random() * (canvasSize / box)),
            y: Math.floor(Math.random() * (canvasSize / box))
        };
        if (!snake.some(seg => seg.x === bean.x && seg.y === bean.y) &&
            !beans.some(b => b.x === bean.x && b.y === bean.y)) {
            beans.push(bean);
        }
    }
    return beans;
}

function genAISnake(idx) {
    // 生成不与玩家重叠的AI蛇
    let color = AI_COLORS[idx % AI_COLORS.length];
    let x = Math.floor(Math.random() * (canvasSize / box));
    let y = Math.floor(Math.random() * (canvasSize / box));
    // 避免与玩家蛇重叠
    while (snake.some(seg => seg.x === x && seg.y === y)) {
        x = Math.floor(Math.random() * (canvasSize / box));
        y = Math.floor(Math.random() * (canvasSize / box));
    }
    let dir = ['LEFT', 'UP', 'RIGHT', 'DOWN'][Math.floor(Math.random() * 4)];
    let body = [];
    for (let i = 0; i < AI_LENGTH; i++) {
        body.push({ x: x - i * (dir === 'RIGHT' ? -1 : dir === 'LEFT' ? 1 : 0), y: y - i * (dir === 'DOWN' ? -1 : dir === 'UP' ? 1 : 0) });
    }
    return { body, dir, color, alive: true, moveCount: 0 };
}

function moveAISnakes() {
    if (window.gameMode !== 'battle') return;
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        // 连续直走5格再转向
        if (ai.moveCount === 0) {
            let possibleDirs = ['LEFT', 'UP', 'RIGHT', 'DOWN'];
            possibleDirs = possibleDirs.filter(d => {
                if (ai.dir === 'LEFT' && d === 'RIGHT') return false;
                if (ai.dir === 'RIGHT' && d === 'LEFT') return false;
                if (ai.dir === 'UP' && d === 'DOWN') return false;
                if (ai.dir === 'DOWN' && d === 'UP') return false;
                return true;
            });
            ai.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            ai.moveCount = 5;
        }
        ai.moveCount--;
        let head = { ...ai.body[0] };
        switch (ai.dir) {
            case 'LEFT': head.x--; break;
            case 'UP': head.y--; break;
            case 'RIGHT': head.x++; break;
            case 'DOWN': head.y++; break;
        }
        // 穿墙
        if (head.x < 0) head.x = canvasSize / box - 1;
        if (head.x >= canvasSize / box) head.x = 0;
        if (head.y < 0) head.y = canvasSize / box - 1;
        if (head.y >= canvasSize / box) head.y = 0;
        // 撞自己
        if (ai.body.some(seg => seg.x === head.x && seg.y === head.y)) {
            ai.alive = false;
            continue;
        }
        ai.body.unshift(head);
        ai.body.pop();
    }
    // 死亡AI自动补充
    if (aiSnakes.filter(ai => ai.alive).length < AI_COUNT) {
        for (let i = 0; i < AI_COUNT; i++) {
            if (!aiSnakes[i] || !aiSnakes[i].alive) {
                aiSnakes[i] = genAISnake(i);
            }
        }
    }
}

function checkAICollisions() {
    if (window.gameMode !== 'battle') return;
    // 玩家头碰AI蛇任意部位，玩家死亡
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        for (let j = 0; j < ai.body.length; j++) {
            if (snake[0].x === ai.body[j].x && snake[0].y === ai.body[j].y) {
                isGameOver = true;
                clearInterval(gameInterval);
                gameInterval = null;
                alert('你碰到了AI蛇，游戏结束！分数：' + score);
                return;
            }
        }
    }
    // AI蛇头碰玩家任意部位，AI蛇死亡
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        for (let i = 0; i < snake.length; i++) {
            if (ai.body[0].x === snake[i].x && ai.body[0].y === snake[i].y) {
                ai.alive = false;
                score += 5;
                document.getElementById('score').innerText = '分数：' + score;
            }
        }
    }
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 18; i++) {
        const angle = (2 * Math.PI / 18) * i;
        const speed = Math.random() * 2 + 1;
        particles.push({
            x: x * box + box / 2,
            y: y * box + box / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: color,
            life: 20 + Math.random() * 10
        });
    }
}

function updateParticles() {
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
        p.life--;
    }
    particles = particles.filter(p => p.alpha > 0 && p.life > 0);
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

function draw() {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    // 画AI蛇
    if (window.gameMode === 'battle') {
        for (const ai of aiSnakes) {
            if (!ai.alive) continue;
            for (let i = 0; i < ai.body.length; i++) {
                ctx.fillStyle = i === 0 ? ai.color[0] : ai.color[1];
                ctx.fillRect(ai.body[i].x * box, ai.body[i].y * box, box, box);
            }
        }
    }
    // 画蛇
    for (let i = 0; i < snake.length; i++) {
        ctx.fillStyle = i === 0 ? '#4caf50' : '#8bc34a';
        ctx.fillRect(snake[i].x * box, snake[i].y * box, box * snakeWidth, box);
    }
    // 画普通食物（黄色圆形）
    for (const food of foods) {
        ctx.beginPath();
        ctx.arc(food.x * box + box / 2, food.y * box + box / 2, box / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#e5e539';
        ctx.fill();
    }
    // 画死亡豆子（红色X）
    for (const badBean of badBeans) {
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(badBean.x * box + 4, badBean.y * box + 4);
        ctx.lineTo(badBean.x * box + box - 4, badBean.y * box + box - 4);
        ctx.moveTo(badBean.x * box + box - 4, badBean.y * box + 4);
        ctx.lineTo(badBean.x * box + 4, badBean.y * box + box - 4);
        ctx.stroke();
    }
    // 画减速豆（绿色圆形）
    for (const slowBean of slowBeans) {
        ctx.beginPath();
        ctx.arc(slowBean.x * box + box / 2, slowBean.y * box + box / 2, box / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#43a047';
        ctx.fill();
    }
    // 画反向豆（紫色三角）
    for (const reverseBean of reverseBeans) {
        ctx.fillStyle = '#8e24aa';
        ctx.beginPath();
        ctx.moveTo(reverseBean.x * box + box / 2, reverseBean.y * box + 4);
        ctx.lineTo(reverseBean.x * box + 4, reverseBean.y * box + box - 4);
        ctx.lineTo(reverseBean.x * box + box - 4, reverseBean.y * box + box - 4);
        ctx.closePath();
        ctx.fill();
    }
    // 迷雾模式遮罩
    if (window.gameMode === 'fog') {
        const radius = 6; // 可视半径（格）扩大
        const px = snake[0].x * box + box / 2;
        const py = snake[0].y * box + box / 2;
        ctx.save();
        ctx.globalAlpha = 1.0; // 完全不透明
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.rect(0, 0, canvasSize, canvasSize);
        ctx.arc(px, py, box * radius + box / 2, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
    }
    drawParticles();
}

function renderLoop() {
    draw();
    updateParticles();
    requestAnimationFrame(renderLoop);
}

function move() {
    if (isPaused || isGameOver) return;
    let head = { ...snake[0] };
    switch (direction) {
        case 'LEFT': head.x--; break;
        case 'UP': head.y--; break;
        case 'RIGHT': head.x++; break;
        case 'DOWN': head.y++; break;
    }
    // 穿墙处理
    if (head.x < 0) head.x = canvasSize / box - 1;
    if (head.x >= canvasSize / box) head.x = 0;
    if (head.y < 0) head.y = canvasSize / box - 1;
    if (head.y >= canvasSize / box) head.y = 0;
    // 撞自己
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        isGameOver = true;
        clearInterval(gameInterval);
        gameInterval = null;
        alert('游戏结束！分数：' + score);
        spawnParticles(snake[0].x, snake[0].y, '#e53935');
        return;
    }
    // 吃到死亡豆子
    for (const badBean of badBeans) {
        if (head.x === badBean.x && head.y === badBean.y) {
            isGameOver = true;
            clearInterval(gameInterval);
            gameInterval = null;
            alert('你吃到了死亡豆子，游戏结束！分数：' + score);
            spawnParticles(badBean.x, badBean.y, '#e53935');
            return;
        }
    }
    // 吃到减速豆（只对玩家生效）
    for (let i = 0; i < slowBeans.length; i++) {
        const slowBean = slowBeans[i];
        if (head.x === slowBean.x && head.y === slowBean.y) {
            slowTimers.push(50); // 10秒
            slowBeans.splice(i, 1);
            slowBeans.push(...randomBeans(1));
            break;
        }
    }
    // 吃到反向豆
    for (let i = 0; i < reverseBeans.length; i++) {
        const reverseBean = reverseBeans[i];
        if (head.x === reverseBean.x && head.y === reverseBean.y) {
            reverseMode = true;
            reverseTimer = 50;
            reverseBeans.splice(i, 1);
            reverseBeans.push(...randomBeans(1));
            break;
        }
    }
    snake.unshift(head);
    // 吃到食物
    let ateFood = false;
    for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (head.x === food.x && head.y === food.y) {
            score++;
            document.getElementById('score').innerText = '分数：' + score;
            spawnParticles(head.x, head.y, '#e5e539');
            foods.splice(i, 1);
            foods.push(...randomBeans(1));
            ateFood = true;
            break;
        }
    }
    if (!ateFood) {
        snake.pop();
    }
    // 处理减速计时
    if (slowTimers.length > 0) {
        for (let i = 0; i < slowTimers.length; i++) {
            slowTimers[i]--;
        }
        slowTimers = slowTimers.filter(t => t > 0);
        let targetSpeed = 120 + slowTimers.length * 60;
        if (targetSpeed !== speed) {
            speed = targetSpeed;
            clearInterval(gameInterval);
            gameInterval = setInterval(move, speed);
        }
    } else if (speed !== 120) {
        speed = 120;
        clearInterval(gameInterval);
        gameInterval = setInterval(move, speed);
    }
    if (reverseMode) {
        reverseTimer--;
        if (reverseTimer <= 0) reverseMode = false;
    }
    moveAISnakes();
    checkAICollisions();
}

function startGame() {
    if (isGameOver) initGame();
    clearInterval(gameInterval);
    isPaused = false;
    isGameOver = false;
    gameInterval = setInterval(move, speed);
    if (!window._renderLoopStarted) {
        window._renderLoopStarted = true;
        renderLoop();
    }
}

function pauseGame() {
    isPaused = !isPaused;
}

function restartGame() {
    initGame();
    startGame();
}

// 监听按键
window.addEventListener('keydown', function (e) {
    if (isGameOver) return;
    let key = e.key;
    if (reverseMode) {
        if (key === 'ArrowLeft' || key === 'a') key = 'ArrowRight';
        else if (key === 'ArrowRight' || key === 'd') key = 'ArrowLeft';
        else if (key === 'ArrowUp' || key === 'w') key = 'ArrowDown';
        else if (key === 'ArrowDown' || key === 's') key = 'ArrowUp';
    }
    switch (key) {
        case 'ArrowLeft':
        case 'a':
            if (direction !== 'RIGHT') direction = 'LEFT';
            break;
        case 'ArrowUp':
        case 'w':
            if (direction !== 'DOWN') direction = 'UP';
            break;
        case 'ArrowRight':
        case 'd':
            if (direction !== 'LEFT') direction = 'RIGHT';
            break;
        case 'ArrowDown':
        case 's':
            if (direction !== 'UP') direction = 'DOWN';
            break;
        case ' ': // 空格暂停
            pauseGame();
            break;
    }
});

document.getElementById('startBtn').onclick = startGame;
document.getElementById('pauseBtn').onclick = pauseGame;
document.getElementById('restartBtn').onclick = restartGame;

// 初始化
initGame(); 