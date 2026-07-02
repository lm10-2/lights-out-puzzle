/* ============================================
   LIGHTS OUT – GAME ENGINE + GF(2) SOLVER
   ============================================ */

(function () {
    'use strict';

    const N = 5;
    const TOTAL = N * N;

    // Difficulty configs: [minClicks, maxClicks]
    const DIFFICULTY = {
        easy:   [3, 5],
        medium: [8, 12],
        hard:   [15, 20],
    };

    // ─── State ───
    let board = new Uint8Array(TOTAL);
    let initialBoard = new Uint8Array(TOTAL);
    let solution = null;
    let moveCount = 0;
    let timerInterval = null;
    let startTime = null;
    let elapsedSeconds = 0;
    let difficulty = 'easy';
    let isAnimating = false;
    let hintIndex = -1;

    // ─── DOM Refs ───
    const boardEl = document.getElementById('game-board');
    const solGridEl = document.getElementById('solution-grid');
    const moveCountEl = document.getElementById('move-count');
    const lightCountEl = document.getElementById('light-count');
    const timeEl = document.getElementById('time-display');
    const winOverlay = document.getElementById('win-overlay');
    const winStats = document.getElementById('win-stats');
    const rankEl = document.getElementById('matrix-rank');
    const solvableEl = document.getElementById('solvable-status');
    const minClicksEl = document.getElementById('min-clicks');
    const genLogEl = document.getElementById('gen-log');

    // ═══════════════════════════════════════════
    //  TOGGLE MATRIX BUILDER
    // ═══════════════════════════════════════════
    function buildToggleMatrix() {
        // A[i][j] = 1 if pressing cell j toggles cell i
        const A = [];
        for (let i = 0; i < TOTAL; i++) {
            A[i] = new Uint8Array(TOTAL);
        }
        for (let j = 0; j < TOTAL; j++) {
            const r = Math.floor(j / N);
            const c = j % N;
            A[j][j] = 1; // self
            if (r > 0)     A[j - N][j] = 1; // up
            if (r < N - 1) A[j + N][j] = 1; // down
            if (c > 0)     A[j - 1][j] = 1; // left
            if (c < N - 1) A[j + 1][j] = 1; // right
        }
        return A;
    }

    // ═══════════════════════════════════════════
    //  GF(2) GAUSSIAN ELIMINATION SOLVER
    // ═══════════════════════════════════════════
    function solveGF2(boardState) {
        // Build augmented matrix [A | b]
        const A = buildToggleMatrix();
        const aug = [];
        for (let i = 0; i < TOTAL; i++) {
            aug[i] = new Uint8Array(TOTAL + 1);
            for (let j = 0; j < TOTAL; j++) {
                aug[i][j] = A[i][j];
            }
            aug[i][TOTAL] = boardState[i]; // target: current state (we want to cancel it)
        }

        const pivotCol = new Int8Array(TOTAL).fill(-1);
        let rank = 0;

        // Forward elimination
        for (let col = 0; col < TOTAL; col++) {
            // Find pivot row
            let pivotRow = -1;
            for (let row = rank; row < TOTAL; row++) {
                if (aug[row][col] === 1) {
                    pivotRow = row;
                    break;
                }
            }
            if (pivotRow === -1) continue;

            // Swap rows
            [aug[rank], aug[pivotRow]] = [aug[pivotRow], aug[rank]];
            pivotCol[col] = rank;

            // Eliminate column in all other rows
            for (let row = 0; row < TOTAL; row++) {
                if (row !== rank && aug[row][col] === 1) {
                    for (let k = 0; k <= TOTAL; k++) {
                        aug[row][k] ^= aug[rank][k];
                    }
                }
            }
            rank++;
        }

        // Check for inconsistency
        for (let row = rank; row < TOTAL; row++) {
            if (aug[row][TOTAL] === 1) {
                return { solution: null, rank, solvable: false };
            }
        }

        // Back substitution
        const x = new Uint8Array(TOTAL);
        for (let col = 0; col < TOTAL; col++) {
            if (pivotCol[col] !== -1) {
                x[col] = aug[pivotCol[col]][TOTAL];
            }
            // Free variables default to 0
        }

        return { solution: x, rank, solvable: true };
    }

    // ═══════════════════════════════════════════
    //  PROCEDURAL GENERATION
    // ═══════════════════════════════════════════
    function generatePuzzle(diff) {
        const [minClicks, maxClicks] = DIFFICULTY[diff];
        const numClicks = minClicks + Math.floor(Math.random() * (maxClicks - minClicks + 1));
        const newBoard = new Uint8Array(TOTAL); // Start all off

        clearLog();
        addLog(`Generating ${diff} puzzle...`, 'info');
        addLog(`Target clicks: ${numClicks}`, 'info');

        const clickedCells = new Set();

        // Apply random toggle sequences
        for (let i = 0; i < numClicks; i++) {
            let cell;
            do {
                cell = Math.floor(Math.random() * TOTAL);
            } while (clickedCells.has(cell));
            clickedCells.add(cell);
            applyToggle(newBoard, cell);
        }

        addLog(`Applied ${numClicks} random toggles`, 'info');

        // Verify solvability via rank evaluation
        const result = solveGF2(newBoard);
        if (!result.solvable) {
            addLog('Rank check failed, regenerating...', 'warn');
            return generatePuzzle(diff); // Retry (extremely rare with this method)
        }

        addLog(`Matrix rank: ${result.rank}/25`, 'info');
        addLog(`Solution requires ${result.solution.reduce((a, b) => a + b, 0)} clicks`, 'info');
        addLog('Solvability verified ✓', 'success');

        return { board: newBoard, solution: result.solution, rank: result.rank };
    }

    function applyToggle(b, idx) {
        const r = Math.floor(idx / N);
        const c = idx % N;
        b[idx] ^= 1;
        if (r > 0)     b[idx - N] ^= 1;
        if (r < N - 1) b[idx + N] ^= 1;
        if (c > 0)     b[idx - 1] ^= 1;
        if (c < N - 1) b[idx + 1] ^= 1;
    }

    // ═══════════════════════════════════════════
    //  GAME LOGIC
    // ═══════════════════════════════════════════
    function newGame() {
        stopTimer();
        isAnimating = false;
        hintIndex = -1;
        const puzzle = generatePuzzle(difficulty);
        board = puzzle.board;
        initialBoard = new Uint8Array(board);
        solution = puzzle.solution;
        moveCount = 0;
        elapsedSeconds = 0;

        updateSolverPanel(puzzle.rank, true, solution);
        renderBoard();
        renderSolutionGrid();
        updateStats();
        winOverlay.classList.remove('show');
        startTimer();
    }

    function resetBoard() {
        stopTimer();
        isAnimating = false;
        hintIndex = -1;
        board = new Uint8Array(initialBoard);
        moveCount = 0;
        elapsedSeconds = 0;

        // Recompute solution for current state
        const result = solveGF2(board);
        solution = result.solution;

        renderBoard();
        renderSolutionGrid();
        updateStats();
        winOverlay.classList.remove('show');
        startTimer();
    }

    function handleCellClick(idx) {
        if (isAnimating) return;
        if (board.every(v => v === 0)) return; // Already solved

        clearHints();
        applyToggle(board, idx);
        moveCount++;

        // Animate toggled cells
        const r = Math.floor(idx / N);
        const c = idx % N;
        const affected = [idx];
        if (r > 0)     affected.push(idx - N);
        if (r < N - 1) affected.push(idx + N);
        if (c > 0)     affected.push(idx - 1);
        if (c < N - 1) affected.push(idx + 1);

        affected.forEach(i => {
            const cellEl = boardEl.children[i];
            cellEl.classList.add('toggling');
            setTimeout(() => cellEl.classList.remove('toggling'), 300);
        });

        // Add ripple effect to clicked cell
        addRipple(boardEl.children[idx]);

        // Recompute solution
        const result = solveGF2(board);
        solution = result.solution;

        renderBoard();
        renderSolutionGrid();
        updateStats();
        updateSolverPanel(result.rank, result.solvable, solution);

        // Check win
        if (board.every(v => v === 0)) {
            onWin();
        }
    }

    function addRipple(cellEl) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = 20;
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.marginLeft = -(size / 2) + 'px';
        ripple.style.marginTop = -(size / 2) + 'px';
        cellEl.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }

    function onWin() {
        stopTimer();
        winStats.textContent = `${moveCount} moves · ${formatTime(elapsedSeconds)}`;
        setTimeout(() => winOverlay.classList.add('show'), 300);
    }

    // ═══════════════════════════════════════════
    //  AUTO SOLVER (Animated)
    // ═══════════════════════════════════════════
    async function autoSolve() {
        if (isAnimating) return;
        if (board.every(v => v === 0)) return;

        const result = solveGF2(board);
        if (!result.solvable || !result.solution) {
            addLog('No solution exists!', 'warn');
            return;
        }

        isAnimating = true;
        clearHints();
        addLog('Auto-solving...', 'info');

        const clickOrder = [];
        for (let i = 0; i < TOTAL; i++) {
            if (result.solution[i] === 1) clickOrder.push(i);
        }

        for (let i = 0; i < clickOrder.length; i++) {
            const idx = clickOrder[i];
            await delay(250);

            applyToggle(board, idx);
            moveCount++;

            // Animate
            const cellEl = boardEl.children[idx];
            cellEl.classList.add('solving');
            addRipple(cellEl);
            setTimeout(() => cellEl.classList.remove('solving'), 350);

            renderBoard();
            updateStats();
        }

        // Recompute
        const newResult = solveGF2(board);
        solution = newResult.solution;
        renderSolutionGrid();
        updateSolverPanel(newResult.rank, newResult.solvable, solution);

        isAnimating = false;
        addLog(`Solved in ${clickOrder.length} clicks!`, 'success');

        if (board.every(v => v === 0)) {
            onWin();
        }
    }

    function showHint() {
        if (isAnimating) return;
        if (!solution) return;
        if (board.every(v => v === 0)) return;

        clearHints();

        // Find first cell in solution that needs clicking
        for (let i = 0; i < TOTAL; i++) {
            if (solution[i] === 1) {
                hintIndex = i;
                boardEl.children[i].classList.add('hint-cell');
                addLog(`Hint: click cell (${Math.floor(i / N)}, ${i % N})`, 'info');
                break;
            }
        }
    }

    function clearHints() {
        hintIndex = -1;
        for (let i = 0; i < TOTAL; i++) {
            boardEl.children[i]?.classList.remove('hint-cell');
        }
    }

    // ═══════════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════════
    function buildBoardDOM() {
        boardEl.innerHTML = '';
        for (let i = 0; i < TOTAL; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}`;
            cell.dataset.index = i;
            cell.addEventListener('click', () => handleCellClick(i));
            boardEl.appendChild(cell);
        }

        solGridEl.innerHTML = '';
        for (let i = 0; i < TOTAL; i++) {
            const cell = document.createElement('div');
            cell.className = 'sol-cell';
            cell.id = `sol-${i}`;
            solGridEl.appendChild(cell);
        }
    }

    function renderBoard() {
        for (let i = 0; i < TOTAL; i++) {
            const cellEl = boardEl.children[i];
            if (board[i] === 1) {
                cellEl.classList.add('on');
            } else {
                cellEl.classList.remove('on');
            }
        }
    }

    function renderSolutionGrid() {
        for (let i = 0; i < TOTAL; i++) {
            const cellEl = solGridEl.children[i];
            if (solution && solution[i] === 1) {
                cellEl.classList.add('click');
            } else {
                cellEl.classList.remove('click');
            }
        }
    }

    function updateStats() {
        moveCountEl.textContent = moveCount;
        lightCountEl.textContent = board.reduce((a, b) => a + b, 0);
    }

    function updateSolverPanel(rank, solvable, sol) {
        rankEl.textContent = rank + ' / 25';
        solvableEl.textContent = solvable ? '✓ Yes' : '✗ No';
        solvableEl.style.color = solvable ? 'var(--accent-green)' : 'var(--accent-red)';
        if (sol) {
            minClicksEl.textContent = sol.reduce((a, b) => a + b, 0);
        } else {
            minClicksEl.textContent = '—';
        }
    }

    // ─── Timer ───
    function startTimer() {
        stopTimer();
        startTime = Date.now() - elapsedSeconds * 1000;
        timerInterval = setInterval(() => {
            elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            timeEl.textContent = formatTime(elapsedSeconds);
        }, 250);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    // ─── Log ───
    function addLog(msg, type = '') {
        const entry = document.createElement('div');
        entry.className = 'log-entry' + (type ? ` ${type}` : '');
        entry.textContent = `› ${msg}`;
        genLogEl.appendChild(entry);
        genLogEl.scrollTop = genLogEl.scrollHeight;
    }

    function clearLog() {
        genLogEl.innerHTML = '';
    }

    function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ═══════════════════════════════════════════
    //  BACKGROUND PARTICLES
    // ═══════════════════════════════════════════
    function initBackground() {
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        const particles = [];
        const PARTICLE_COUNT = 60;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function createParticle() {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
            };
        }

        function init() {
            resize();
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle());
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            // Draw particles
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 228, 255, ${p.alpha})`;
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(0, 228, 255, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        init();
        draw();
    }

    // ═══════════════════════════════════════════
    //  EVENT BINDINGS
    // ═══════════════════════════════════════════
    function bindEvents() {
        document.getElementById('btn-new-game').addEventListener('click', newGame);
        document.getElementById('btn-solve').addEventListener('click', autoSolve);
        document.getElementById('btn-hint').addEventListener('click', showHint);
        document.getElementById('btn-reset').addEventListener('click', resetBoard);
        document.getElementById('btn-play-again').addEventListener('click', newGame);

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                difficulty = btn.dataset.difficulty;
                newGame();
            });
        });
    }

    // ═══════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════
    function init() {
        initBackground();
        buildBoardDOM();
        bindEvents();
        newGame();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
