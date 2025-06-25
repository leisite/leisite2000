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

function draw() {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
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
}

function renderLoop() {
    draw();
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
        return;
    }
    // 吃到死亡豆子
    for (const badBean of badBeans) {
        if (head.x === badBean.x && head.y === badBean.y) {
            isGameOver = true;
            clearInterval(gameInterval);
            gameInterval = null;
            alert('你吃到了死亡豆子，游戏结束！分数：' + score);
            return;
        }
    }
    // 吃到减速豆
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
}

function startGame() {
    if (isGameOver) initGame();
    clearInterval(gameInterval);
    gameInterval = setInterval(move, speed);
    isPaused = false;
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
renderLoop(); 