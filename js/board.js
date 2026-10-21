function generateBoard() {
    board = [];
    gameBoard.innerHTML = "";
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            let cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener("click", () => handleCellClick(x, y));
            cell.addEventListener("mouseenter", () => handleCellMouseEnter(x, y));
            gameBoard.appendChild(cell);
            board.push({ x, y, tower: null, buildable: false, path: false });
        }
    }
    // 마우스가 보드를 벗어날 때 프리뷰 제거
    gameBoard.addEventListener("mouseleave", clearRangePreview);
}

/**
 * 마우스 호버 시 사거리 미리보기
 */
function handleCellMouseEnter(x, y) {
    clearRangePreview();

    // 1. 타워 건설 모드일 때: 건설 예정 지점 기준 사거리 프리뷰
    if (interactionMode === 'build' && selectedTower) {
        const stats = getGameTowerStats(selectedTower);
        if (stats) {
            highlightRange(x, y, stats.range, "range-preview");
        }
    }
}

/**
 * 사거리 하이라이트 표시
 */
function highlightRange(centerX, centerY, range, className) {
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            const tx = centerX + dx;
            const ty = centerY + dy;
            if (tx >= 0 && tx < boardSize && ty >= 0 && ty < boardSize) {
                const dom = getDomCell(tx, ty);
                if (dom) {
                    dom.classList.add(className);
                }
            }
        }
    }
}

/**
 * 마우스 호버 사거리 프리뷰 제거
 */
function clearRangePreview() {
    const previewCells = gameBoard.querySelectorAll(".range-preview");
    previewCells.forEach(el => el.classList.remove("range-preview"));
}

/**
 * 선택된 타워의 사거리 표시 제거
 */
function clearActiveRange() {
    selectedBoardTower = null;
    const activeCells = gameBoard.querySelectorAll(".range-active, .selected-tower");
    activeCells.forEach(el => {
        el.classList.remove("range-active");
        el.classList.remove("selected-tower");
    });
}

function generateEnemyPath() {
    // 1. 초기화 (DFS 준비)
    path = [];
    board.forEach(c => c.path = false);

    const start = { x: 10, y: 0 };
    const goal = { x: 10, y: 19 };
    let visited = [];

    // 안전장치: 최대 시도 횟수 및 단일 시도 내 연산 제한
    const MAX_ATTEMPTS = 10;
    const MAX_OPS = 3000; // 3000번 이상 탐색하면 폐기 (무한루프 방지)
    let opsCount = 0;

    function dfs(current) {
        opsCount++;
        // 연산량이 너무 많으면 안전하게 실패 처리 (이번 시도 포기)
        if (opsCount > MAX_OPS) return false;

        // 1. 현재 위치 기록
        path.push(current);
        visited[current.y][current.x] = true;

        // 2. 도착 확인
        if (current.x === goal.x && current.y === goal.y) {
            return true;
        }

        // 3. 이동 방향 (상하좌우 랜덤)
        const dirs = [
            { dx: 0, dy: 1 },  // 하
            { dx: 0, dy: -1 }, // 상
            { dx: -1, dy: 0 }, // 좌
            { dx: 1, dy: 0 }   // 우
        ].sort(() => Math.random() - 0.5);

        for (const d of dirs) {
            const nx = current.x + d.dx;
            const ny = current.y + d.dy;

            // 4. 유효성 검사 (isValid)
            if (isValid(nx, ny)) {
                if (dfs({ x: nx, y: ny })) {
                    return true;
                }
            }
        }

        // 5. 백트래킹
        path.pop();
        visited[current.y][current.x] = false;
        return false;
    }

    function isValid(x, y) {
        if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return false;
        if (visited[y][x]) return false;

        if (x === goal.x && y === goal.y) {
            const parent = path[path.length - 1];
            return parent.x === 10 && parent.y === 18;
        }

        if (x < 1 || x > 18 || y < 1 || y > 18) return false;

        // 간격 체크 (Spacing Check) (v0.12.2 수정: 4방향)
        let neighborCount = 0;
        const checkDirs = [
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];

        for (const d of checkDirs) {
            const tx = x + d.dx;
            const ty = y + d.dy;
            if (tx >= 0 && tx < boardSize && ty >= 0 && ty < boardSize) {
                if (visited[ty][tx]) neighborCount++;
            }
        }
        return neighborCount === 1;
    }

    // --- 실행 (재시도 로직) ---
    let success = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // 상태 초기화
        path = [];
        visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
        opsCount = 0;

        // 시작점 등록
        path.push(start);
        visited[start.y][start.x] = true;

        // DFS 시도 (첫 이동은 (10,1)로 고정)
        if (dfs({ x: 10, y: 1 })) {
            console.log(`Path generated successfully on attempt ${attempt} (Ops: ${opsCount})`);
            success = true;
            break;
        } else {
            console.warn(`Path generation attempt ${attempt} failed or timed out.`);
        }
    }

    // 실패 시 대체 경로(Fallback)
    if (!success) {
        console.error("All path generation attempts failed. Using fallback linear path.");
        path = [];
        for (let i = 0; i <= 19; i++) path.push({ x: 10, y: i });
    }

    // 보드 마킹
    path.forEach(p => {
        const cell = getCell(p.x, p.y);
        if (cell) cell.path = true;
    });
}

function getCell(x, y) {
    return board.find(c => c.x === x && c.y === y);
}

function getDomCell(x, y) {
    return gameBoard.children[y * boardSize + x];
}
