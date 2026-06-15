// ===== Typing Speed Test =====
(function initTypingGame() {
    const display = document.getElementById('typing-display-home');
    const target = document.getElementById('typing-text-target');
    const input = document.getElementById('typing-input');
    const startBtn = document.getElementById('typing-start');
    const wpmEl = document.getElementById('typing-wpm');
    const accEl = document.getElementById('typing-accuracy');
    const timerEl = document.getElementById('typing-timer-inline');

    if (!display || !target || !input || !startBtn) return;

    const quotes = [
        'The only way to do great work is to love what you do. Stay hungry, stay foolish.',
        'Technology is best when it brings people together.',
        'Code is like humor. When you have to explain it, it is bad.',
        'First, solve the problem. Then, write the code.',
        'The best way to predict the future is to invent it.',
        'Software is a great combination between artistry and engineering.',
        'Debugging is twice as hard as writing the code in the first place.',
        'Simplicity is the soul of efficiency. Good code is its own best documentation.'
    ];

    let timeLeft = 60, timerId = null, isRunning = false, correctCount = 0, totalKeystrokes = 0;

    function getRandomQuote() { return quotes[Math.floor(Math.random() * quotes.length)]; }

    function calcStats() {
        const elapsed = Math.max((60 - timeLeft), 1);
        const wpm = Math.round((correctCount / 5) / (elapsed / 60));
        const acc = totalKeystrokes > 0 ? Math.round((correctCount / totalKeystrokes) * 100) : 100;
        return { wpm: wpm > 0 ? wpm : 0, acc };
    }

    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function render() {
        const text = target.textContent, typed = input.value;
        let h = '';
        for (let i = 0; i < text.length; i++) {
            if (i < typed.length) {
                h += typed[i] === text[i] ? `<span class="correct">${esc(text[i])}</span>` : `<span class="incorrect">${esc(text[i])}</span>`;
            } else if (i === typed.length) {
                h += `<span class="current">${esc(text[i])}</span>`;
            } else {
                h += esc(text[i]);
            }
        }
        display.innerHTML = `<p>${h}</p>`;
    }

    function updateStats() {
        const typed = input.value, text = target.textContent;
        let cc = 0;
        for (let i = 0; i < Math.min(typed.length, text.length); i++) { if (typed[i] === text[i]) cc++; }
        correctCount = cc; totalKeystrokes = typed.length;
        const s = calcStats(); wpmEl.textContent = s.wpm; accEl.textContent = s.acc + '%';
    }

    function startTest() {
        target.textContent = getRandomQuote();
        input.value = ''; input.disabled = false; input.focus();
        timeLeft = 60; isRunning = true; correctCount = 0; totalKeystrokes = 0;
        wpmEl.textContent = '0'; accEl.textContent = '100%'; timerEl.textContent = '60s'; timerEl.style.color = '';
        startBtn.textContent = '重新测试';
        display.innerHTML = `<p>${esc(target.textContent)}</p>`;
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            timeLeft--; timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 10) timerEl.style.color = 'var(--danger)';
            if (timeLeft <= 0) endTest();
        }, 1000);
    }

    function endTest() {
        if (timerId) { clearInterval(timerId); timerId = null; }
        isRunning = false; input.disabled = true; timerEl.textContent = '0s'; timerEl.style.color = '';
        startBtn.textContent = '重新测试'; updateStats();
    }

    startBtn.addEventListener('click', startTest);
    input.addEventListener('input', () => {
        if (!isRunning) { input.value = ''; return; }
        updateStats(); render();
        if (input.value.length >= target.textContent.length) { updateStats(); endTest(); }
    });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); });
})();

// ===== Snake Game =====
(function initSnakeGame() {
    const canvas = document.getElementById('snake-canvas');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const startBtn = document.getElementById('snake-start');
    if (!canvas || !scoreEl || !startBtn) return;

    const ctx = canvas.getContext('2d');
    const gs = 20, tc = canvas.width / gs;

    function getAccent() {
        const s = getComputedStyle(document.getElementById('page-projects'));
        return s.getPropertyValue('--accent-1').trim() || '#34d399';
    }
    function getAccent2() {
        const s = getComputedStyle(document.getElementById('page-projects'));
        return s.getPropertyValue('--accent-2').trim() || '#2dd4bf';
    }

    let snake = [], food = { x: 15, y: 15 }, dir = { x: 0, y: 0 }, nextDir = { x: 0, y: 0 };
    let score = 0, best = parseInt(localStorage.getItem('snake-best') || '0'), gameLoopId = null, isRunning = false, speed = 120;

    bestEl.textContent = best;

    function randomFood() {
        let pos;
        for (let attempt = 0; attempt < 500; attempt++) {
            pos = { x: Math.floor(Math.random() * tc), y: Math.floor(Math.random() * tc) };
            if (!snake.some(s => s.x === pos.x && s.y === pos.y)) return pos;
        }
        for (let x = 0; x < tc; x++) for (let y = 0; y < tc; y++) if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
        return pos;
    }

    function draw() {
        ctx.fillStyle = '#0a1e16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(52,211,153,0.12)'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= tc; i++) { ctx.beginPath(); ctx.moveTo(i * gs, 0); ctx.lineTo(i * gs, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * gs); ctx.lineTo(canvas.width, i * gs); ctx.stroke(); }

        const fx = food.x * gs, fy = food.y * gs;
        ctx.shadowColor = getAccent2(); ctx.shadowBlur = 8;
        ctx.fillStyle = getAccent2();
        ctx.beginPath(); ctx.arc(fx + gs / 2, fy + gs / 2, gs / 2 - 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

        snake.forEach((seg, i) => {
            const px = seg.x * gs, py = seg.y * gs, pad = i === 0 ? 1 : 2, alpha = 1 - (i / (snake.length + 10)) * 0.5;
            ctx.fillStyle = i === 0 ? getAccent() : `rgba(52,211,153,${alpha})`;
            ctx.fillRect(px + pad, py + pad, gs - pad * 2, gs - pad * 2);
            if (i === 0) {
                ctx.fillStyle = '#fff'; const ex = px + gs / 2, ey = py + gs / 2;
                if (dir.x === 1) { ctx.fillRect(ex + 4, ey - 4, 3, 3); ctx.fillRect(ex + 4, ey + 2, 3, 3); }
                else if (dir.x === -1) { ctx.fillRect(ex - 7, ey - 4, 3, 3); ctx.fillRect(ex - 7, ey + 2, 3, 3); }
                else if (dir.y === -1) { ctx.fillRect(ex - 4, ey - 7, 3, 3); ctx.fillRect(ex + 2, ey - 7, 3, 3); }
                else if (dir.y === 1) { ctx.fillRect(ex - 4, ey + 4, 3, 3); ctx.fillRect(ex + 2, ey + 4, 3, 3); }
            }
        });
    }

    function step() {
        if (!isRunning) return;
        dir = { ...nextDir };
        if (dir.x === 0 && dir.y === 0) { draw(); gameLoopId = setTimeout(step, speed); return; }
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.x >= tc || head.y < 0 || head.y >= tc) { gameOver(); return; }
        if (snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) { gameOver(); return; }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) { score += 10; scoreEl.textContent = score; food = randomFood(); speed = Math.max(60, 120 - score); }
        else { snake.pop(); }
        draw(); gameLoopId = setTimeout(step, speed);
    }

    function gameOver() {
        isRunning = false; if (gameLoopId) { clearTimeout(gameLoopId); gameLoopId = null; }
        startBtn.textContent = '重新开始';
        if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('snake-best', best); }
        ctx.fillStyle = 'rgba(239,68,68,0.25)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 8);
        ctx.fillStyle = '#ccc'; ctx.font = '14px monospace'; ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }

    function startGame() {
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
        score = 0; speed = 120; isRunning = true; scoreEl.textContent = '0';
        startBtn.textContent = '重新开始'; food = randomFood();
        if (gameLoopId) clearTimeout(gameLoopId);
        draw(); gameLoopId = setTimeout(step, speed);
    }

    document.addEventListener('keydown', function handleSnake(e) {
        if (!isRunning) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.key) {
            case 'ArrowUp': if (dir.y !== 1) nextDir = { x: 0, y: -1 }; e.preventDefault(); break;
            case 'ArrowDown': if (dir.y !== -1) nextDir = { x: 0, y: 1 }; e.preventDefault(); break;
            case 'ArrowLeft': if (dir.x !== 1) nextDir = { x: -1, y: 0 }; e.preventDefault(); break;
            case 'ArrowRight': if (dir.x !== -1) nextDir = { x: 1, y: 0 }; e.preventDefault(); break;
        }
    });
    startBtn.addEventListener('click', startGame);
    draw();
})();

// ===== Tetris =====
(function initTetris() {
    const canvas = document.getElementById('tetris-canvas');
    const scoreEl = document.getElementById('tetris-score');
    const linesEl = document.getElementById('tetris-lines');
    const levelEl = document.getElementById('tetris-level');
    const startBtn = document.getElementById('tetris-start');
    if (!canvas || !startBtn) return;

    const ctx = canvas.getContext('2d');
    const COLS = 10, ROWS = 20, BLOCK = 30;

    const PIECES = [
        { shape: [[1,1,1,1]], color: '#00f0f0' },
        { shape: [[1,1],[1,1]], color: '#f0f000' },
        { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
        { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
        { shape: [[0,0,1],[1,1,1]], color: '#f0a000' },
        { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
        { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
    ];

    let board = [], piece = null, pieceX = 0, pieceY = 0, score = 0, lines = 0, level = 1;
    let gameLoop = null, isRunning = false, dropInterval = 800;

    function newBoard() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
    function randPiece() {
        const p = PIECES[Math.floor(Math.random() * PIECES.length)];
        return { shape: p.shape.map(r => [...r]), color: p.color };
    }

    function spawn() {
        piece = randPiece(); pieceX = Math.floor((COLS - piece.shape[0].length) / 2); pieceY = 0;
        if (!valid(piece.shape, pieceX, pieceY)) { gameOver(); return false; }
        return true;
    }

    function valid(shape, px, py) {
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++)
                if (shape[r][c]) {
                    const nx = px + c, ny = py + r;
                    if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                    if (ny >= 0 && board[ny][nx] !== null) return false;
                }
        return true;
    }

    function rotate(shape) {
        const rows = shape.length, cols = shape[0].length;
        const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) rotated[c][rows - 1 - r] = shape[r][c];
        return rotated;
    }

    function lock() {
        for (let r = 0; r < piece.shape.length; r++)
            for (let c = 0; c < piece.shape[r].length; c++)
                if (piece.shape[r][c]) {
                    const y = pieceY + r;
                    if (y < 0) { gameOver(); return; }
                    board[y][pieceX + c] = piece.color;
                }
        clearLines();
        if (!spawn()) gameOver();
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== null)) {
                board.splice(r, 1); board.unshift(Array(COLS).fill(null));
                cleared++; r++;
            }
        }
        if (cleared > 0) {
            const pts = [0, 100, 300, 500, 800];
            score += pts[cleared] * level; lines += cleared;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(80, 800 - (level - 1) * 70);
            scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level;
        }
    }

    function moveDown() {
        if (valid(piece.shape, pieceX, pieceY + 1)) { pieceY++; }
        else { lock(); }
        draw();
    }

    function hardDrop() {
        while (valid(piece.shape, pieceX, pieceY + 1)) { pieceY++; score += 2; }
        lock(); draw();
    }

    function moveLeft() { if (valid(piece.shape, pieceX - 1, pieceY)) { pieceX--; draw(); } }
    function moveRight() { if (valid(piece.shape, pieceX + 1, pieceY)) { pieceX++; draw(); } }
    function rotatePiece() {
        const r = rotate(piece.shape);
        if (valid(r, pieceX, pieceY)) { piece.shape = r; draw(); }
        else if (valid(r, pieceX - 1, pieceY)) { piece.shape = r; pieceX--; draw(); }
        else if (valid(r, pieceX + 1, pieceY)) { piece.shape = r; pieceX++; draw(); }
    }

    function draw() {
        ctx.fillStyle = '#0a1e16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Grid
        ctx.strokeStyle = 'rgba(52,211,153,0.08)'; ctx.lineWidth = 0.5;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
        }
        // Board
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                ctx.fillStyle = board[r][c]; ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, 4);
            }
        }
        // Current piece
        if (piece) {
            for (let r = 0; r < piece.shape.length; r++) for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    const x = (pieceX + c) * BLOCK, y = (pieceY + r) * BLOCK;
                    if (pieceY + r < 0) continue;
                    ctx.fillStyle = piece.color; ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + 1, y + 1, BLOCK - 2, 4);
                }
            }
        }
    }

    function gameOver() {
        isRunning = false; if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
        startBtn.textContent = '重新开始';
        ctx.fillStyle = 'rgba(239,68,68,0.3)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2);
    }

    function startGame() {
        if (gameLoop) clearInterval(gameLoop);
        newBoard(); score = 0; lines = 0; level = 1; dropInterval = 800;
        scoreEl.textContent = '0'; linesEl.textContent = '0'; levelEl.textContent = '1';
        isRunning = true; startBtn.textContent = '重新开始';
        if (!spawn()) return;
        draw();
        gameLoop = setInterval(() => { if (isRunning) moveDown(); }, dropInterval);
    }

    document.addEventListener('keydown', function tetrisKeys(e) {
        if (!isRunning) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        // Only handle if tetris pane is active
        const pane = document.getElementById('gpane-tetris');
        if (!pane || !pane.classList.contains('active')) return;

        switch (e.key) {
            case 'ArrowLeft': moveLeft(); e.preventDefault(); break;
            case 'ArrowRight': moveRight(); e.preventDefault(); break;
            case 'ArrowUp': rotatePiece(); e.preventDefault(); break;
            case 'ArrowDown': moveDown(); e.preventDefault(); break;
            case ' ': hardDrop(); e.preventDefault(); break;
        }
    });
    startBtn.addEventListener('click', startGame);
    newBoard(); draw();
})();

// ===== Sokoban (Push-the-Box) =====
(function initSokoban() {
    const canvas = document.getElementById('sokoban-canvas');
    const levelEl = document.getElementById('sokoban-level');
    const stepsEl = document.getElementById('sokoban-steps');
    const resetBtn = document.getElementById('sokoban-reset');
    if (!canvas || !resetBtn) return;

    const ctx = canvas.getContext('2d');

    // Legend: 0=empty 1=wall 2=floor 3=target 4=player 5=box 6=boxOnTarget 7=playerOnTarget
    // All levels verified solvable
    const LEVELS = [
        { // Level 1 - push right (1 move)
            map: [
                [1,1,1,1,1],
                [1,2,2,2,1],
                [1,2,5,3,1],
                [1,2,4,2,1],
                [1,1,1,1,1],
            ]
        },
        { // Level 2 - push up then right
            map: [
                [1,1,1,1,1],
                [1,2,3,2,1],
                [1,2,5,2,1],
                [1,2,4,2,1],
                [1,1,1,1,1],
            ]
        },
        { // Level 3 - two boxes, L-shaped
            map: [
                [1,1,1,1,1,1],
                [1,2,2,3,2,1],
                [1,2,5,2,5,1],
                [1,2,4,3,2,1],
                [1,2,2,2,2,1],
                [1,1,1,1,1,1],
            ]
        },
        { // Level 4 - three boxes
            map: [
                [0,0,1,1,1,1,0,0],
                [0,0,1,2,2,1,0,0],
                [0,1,1,2,3,1,0,0],
                [0,1,2,5,2,1,1,0],
                [1,1,5,4,5,2,1,0],
                [1,2,2,3,3,2,1,0],
                [1,2,2,2,2,2,1,0],
                [1,1,1,1,1,1,1,0],
            ]
        },
    ];

    let currentLevel = 0, steps = 0, px = 0, py = 0;
    let map = [];

    function loadLevel(idx) {
        currentLevel = idx; steps = 0;
        map = LEVELS[idx].map.map(r => [...r]);
        levelEl.textContent = idx + 1; stepsEl.textContent = '0';
        // Find player
        for (let r = 0; r < map.length; r++)
            for (let c = 0; c < map[r].length; c++)
                if (map[r][c] === 4 || map[r][c] === 7) { px = c; py = r; return; }
    }

    function getBlockSize() {
        const maxW = canvas.width / map[0].length;
        const maxH = canvas.height / map.length;
        return Math.floor(Math.min(maxW, maxH));
    }

    function isWalkable(cell) { return cell === 2 || cell === 3 || cell === 4 || cell === 7; }
    function isTarget(cell) { return cell === 3 || cell === 6 || cell === 7; }
    function hasBox(cell) { return cell === 5 || cell === 6; }

    function draw() {
        const bs = getBlockSize();
        const offX = Math.floor((canvas.width - map[0].length * bs) / 2);
        const offY = Math.floor((canvas.height - map.length * bs) / 2);

        ctx.fillStyle = '#0a1e16'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const x = offX + c * bs, y = offY + r * bs;
                const cell = map[r][c];

                if (cell === 1) { // Wall
                    ctx.fillStyle = '#3b5060'; ctx.fillRect(x, y, bs, bs);
                    ctx.fillStyle = '#4d6578'; ctx.fillRect(x + 2, y + 2, bs - 4, bs - 4);
                } else { // Floor
                    ctx.fillStyle = '#16281e'; ctx.fillRect(x, y, bs, bs);
                    ctx.strokeStyle = 'rgba(52,211,153,0.06)'; ctx.strokeRect(x, y, bs, bs);
                }

                if (isTarget(cell)) { // Target
                    ctx.fillStyle = '#f87171'; ctx.beginPath();
                    ctx.arc(x + bs / 2, y + bs / 2, bs / 6, 0, Math.PI * 2); ctx.fill();
                }

                if (hasBox(cell)) { // Box
                    const pad = 3;
                    ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + pad, y + pad, bs - pad * 2, bs - pad * 2);
                    ctx.fillStyle = '#fcd34d'; ctx.fillRect(x + pad, y + pad, bs - pad * 2, 5);
                    if (cell === 6) { // Box on target
                        ctx.fillStyle = '#22c55e'; ctx.fillRect(x + pad, y + pad, bs - pad * 2, bs - pad * 2);
                        ctx.fillStyle = '#4ade80'; ctx.fillRect(x + pad, y + pad, bs - pad * 2, 5);
                    }
                }

                if (cell === 4 || cell === 7) { // Player
                    ctx.fillStyle = '#60a5fa'; ctx.beginPath();
                    ctx.arc(x + bs / 2, y + bs / 2, bs / 2 - 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#93c5fd'; ctx.beginPath();
                    ctx.arc(x + bs / 2, y + bs / 2, bs / 4, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
    }

    function move(dx, dy) {
        const nx = px + dx, ny = py + dy;
        if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[0].length) return;
        const nextCell = map[ny][nx];

        if (isWalkable(nextCell)) {
            map[py][px] = isTarget(map[py][px]) ? 3 : 2;
            px = nx; py = ny;
            map[py][px] = isTarget(map[py][px]) ? 7 : 4;
            steps++; stepsEl.textContent = steps;
        } else if (hasBox(nextCell)) {
            const bx = nx + dx, by = ny + dy;
            if (by >= 0 && by < map.length && bx >= 0 && bx < map[0].length) {
                const beyond = map[by][bx];
                if (isWalkable(beyond)) {
                    map[by][bx] = isTarget(beyond) ? 6 : 5;
                    map[ny][nx] = isTarget(nextCell) ? 3 : 2;
                    map[py][px] = isTarget(map[py][px]) ? 3 : 2;
                    px = nx; py = ny;
                    map[py][px] = isTarget(map[py][px]) ? 7 : 4;
                    steps++; stepsEl.textContent = steps;
                }
            }
        }
        draw();
        checkWin();
    }

    function checkWin() {
        let allOnTarget = true;
        for (let r = 0; r < map.length; r++)
            for (let c = 0; c < map[r].length; c++)
                if (map[r][c] === 3 || map[r][c] === 7) allOnTarget = false;
        if (allOnTarget) {
            setTimeout(() => {
                if (currentLevel + 1 < LEVELS.length) {
                    alert('恭喜通关！进入下一关');
                    loadLevel(currentLevel + 1); draw();
                } else {
                    alert('全部通关！你太厉害了！');
                    loadLevel(0); draw();
                }
            }, 300);
        }
    }

    document.addEventListener('keydown', function sokobanKeys(e) {
        const pane = document.getElementById('gpane-sokoban');
        if (!pane || !pane.classList.contains('active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.key) {
            case 'ArrowUp': move(0, -1); e.preventDefault(); break;
            case 'ArrowDown': move(0, 1); e.preventDefault(); break;
            case 'ArrowLeft': move(-1, 0); e.preventDefault(); break;
            case 'ArrowRight': move(1, 0); e.preventDefault(); break;
        }
    });

    resetBtn.addEventListener('click', () => { loadLevel(currentLevel); draw(); });
    loadLevel(0); draw();
})();
