/**
 * 보드 및 A* 길찾기 모듈 (js/board.js)
 * v0.21.0: 미로 구축형(Mazing), 시작/골 랜덤화, 봉쇄 방지 검사, 기반 건설 비용 동적 계산
 */

/**
 * 현재 기반 건설 비용 계산
 * (5개 건설할 때마다 1G씩 누적 증가)
 */
function getBaseBuildCost() {
    const config = (typeof BASE_BUILD_CONFIG !== 'undefined') ? BASE_BUILD_CONFIG : { initialCost: 1, stepCount: 5, costIncrement: 1 };
    const step = Math.floor(builtBaseCount / config.stepCount);
    return config.initialCost + (step * config.costIncrement);
}

/**
 * 시작점 / 골인점 주변 세이프티 존(보호구역) 체크
 * (입구 및 출구 반경 1칸 이내는 기반 건설 불가)
 */
function isSafetyZone(x, y) {
    if (!startPos || !goalPos) return false;
    // 시작점 주변 반경 1칸
    if (Math.abs(x - startPos.x) <= 1 && Math.abs(y - startPos.y) <= 1) return true;
    // 골인점 주변 반경 1칸
    if (Math.abs(x - goalPos.x) <= 1 && Math.abs(y - goalPos.y) <= 1) return true;
    return false;
}

/**
 * 보드 초기화 및 시작/골인점 랜덤 생성
 */
function generateBoard() {
    board = [];
    builtBaseCount = 0;
    gameBoard.innerHTML = "";

    // 1. 시작점(상단) 및 골인점(하단) 랜덤 x좌표 지정 (테두리 2칸 여유)
    const minX = 2;
    const maxX = boardSize - 3; // 17
    startPos = { x: Math.floor(Math.random() * (maxX - minX + 1)) + minX, y: 0 };
    goalPos = { x: Math.floor(Math.random() * (maxX - minX + 1)) + minX, y: boardSize - 1 };

    // 2. 그리드 셀 생성
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            let cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener("click", () => handleCellClick(x, y));
            cell.addEventListener("mouseenter", () => handleCellMouseEnter(x, y));
            gameBoard.appendChild(cell);

            const isStart = (x === startPos.x && y === startPos.y);
            const isGoal = (x === goalPos.x && y === goalPos.y);

            board.push({
                x,
                y,
                tower: null,
                buildable: false, // true이면 기반(벽)이 건설된 상태
                path: false,
                isStart,
                isGoal
            });
        }
    }

    // 마우스가 보드를 벗어날 때 프리뷰 제거
    gameBoard.addEventListener("mouseleave", clearRangePreview);

    // 3. 초기 최단 경로 계산 및 마킹
    recalculateGlobalPath();
}

/**
 * A* 길찾기 알고리즘
 * @param {Object} from - 시작 좌표 {x, y}
 * @param {Object} to - 목표 좌표 {x, y}
 * @param {Array} extraBlocked - 임시로 막을 가상 벽 좌표 [{x, y}]
 * @returns {Array|null} 최단 경로 좌표 배열 [{x, y}, ...] 또는 도달 불가 시 null
 */
function findAStarPath(from, to, extraBlocked = []) {
    if (!from || !to) return null;
    if (from.x === to.x && from.y === to.y) return [{ x: from.x, y: from.y }];

    // 빠른 가상 벽 조회를 위한 키 집합
    const extraBlockedKeys = new Set(extraBlocked.map(p => `${p.x},${p.y}`));

    function isBlocked(x, y) {
        if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return true;
        if (extraBlockedKeys.has(`${x},${y}`)) return true;

        const cell = getCell(x, y);
        // buildable이 true이면 기반(벽)이므로 통과 불가
        if (cell && cell.buildable) return true;
        return false;
    }

    // 맨해튼 거리 휴리스틱
    function heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    const openSet = [{ ...from, g: 0, f: heuristic(from, to), parent: null }];
    const closedSet = new Set();
    const gScore = new Map();
    gScore.set(`${from.x},${from.y}`, 0);

    const dirs = [
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    let loopSafety = 0;
    const MAX_LOOPS = 5000;

    while (openSet.length > 0) {
        loopSafety++;
        if (loopSafety > MAX_LOOPS) {
            console.warn("A* Search aborted: exceeded maximum loop count.");
            return null;
        }

        // f값이 가장 작은 노드 선택
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.x},${current.y}`;

        // 목표 지점 도달 시 경로 역추적
        if (current.x === to.x && current.y === to.y) {
            const resultPath = [];
            let currNode = current;
            while (currNode) {
                resultPath.unshift({ x: currNode.x, y: currNode.y });
                currNode = currNode.parent;
            }
            return resultPath;
        }

        closedSet.add(currentKey);

        for (const d of dirs) {
            const nx = current.x + d.dx;
            const ny = current.y + d.dy;
            const nextKey = `${nx},${ny}`;

            if (closedSet.has(nextKey)) continue;
            if (isBlocked(nx, ny)) continue;

            const tentativeG = current.g + 1;
            const existingG = gScore.has(nextKey) ? gScore.get(nextKey) : Infinity;

            if (tentativeG < existingG) {
                gScore.set(nextKey, tentativeG);
                const neighbor = {
                    x: nx,
                    y: ny,
                    g: tentativeG,
                    f: tentativeG + heuristic({ x: nx, y: ny }, to),
                    parent: current
                };

                const openIdx = openSet.findIndex(n => n.x === nx && n.y === ny);
                if (openIdx >= 0) {
                    openSet[openIdx] = neighbor;
                } else {
                    openSet.push(neighbor);
                }
            }
        }
    }

    // 경로가 없음 (완전 봉쇄)
    return null;
}

/**
 * 기반 건설 가능 여부 (봉쇄 방지 유효성 검사)
 * @param {number} x - 건설하려는 타일 x
 * @param {number} y - 건설하려는 타일 y
 * @returns {boolean} 건설 가능 여부
 */
function canBuildBaseAt(x, y) {
    const cell = getCell(x, y);
    if (!cell) return false;
    if (cell.buildable) return false; // 이미 기반이 설치됨
    if (cell.isStart || cell.isGoal) return false; // 입구/출구 자체
    if (isSafetyZone(x, y)) return false; // 시작/골 보호구역

    // 1. 해당 셀을 벽으로 가정한 상태에서 입구 -> 출구 최단 경로 검사
    const simulatedPath = findAStarPath(startPos, goalPos, [{ x, y }]);
    if (!simulatedPath) {
        return false; // 입구에서 출구까지 완전히 차단됨!
    }

    // 2. 현재 필드에 살아있는 지상 몬스터가 있다면, 그 몬스터들도 출구로 갈 수 있는지 검사
    if (enemies && enemies.length > 0) {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (enemy.moveType === 'flying') continue; // 비행형은 무관

            const enemyToGoal = findAStarPath({ x: enemy.x, y: enemy.y }, goalPos, [{ x, y }]);
            if (!enemyToGoal) {
                return false; // 특정 몬스터가 갇히게 됨!
            }
        }
    }

    return true;
}

/**
 * 전역 몬스터 이동 경로 재계산 및 갱신
 */
function recalculateGlobalPath() {
    const newPath = findAStarPath(startPos, goalPos);
    if (!newPath) {
        console.error("Critical: Global path could not be found!");
        return false;
    }

    path = newPath;

    // 보드 셀의 path 플래그 갱신
    board.forEach(c => c.path = false);
    path.forEach(p => {
        const cell = getCell(p.x, p.y);
        if (cell) cell.path = true;
    });

    // 살아있는 지상 몬스터들의 남은 경로 동적 업데이트
    if (enemies && enemies.length > 0) {
        enemies.forEach(enemy => {
            if (!enemy.alive || enemy.moveType === 'flying' || enemy.moveType === 'crawler') return;

            // 현재 위치에서 출구까지의 새 경로 탐색
            const updatedPath = findAStarPath({ x: enemy.x, y: enemy.y }, goalPos);
            if (updatedPath && updatedPath.length > 0) {
                enemy.dynamicPath = updatedPath;
                enemy.pathIndex = 0;
            }
        });
    }

    return true;
}

/**
 * 마우스 호버 시 사거리 또는 기반 건설 프리뷰
 */
function handleCellMouseEnter(x, y) {
    clearRangePreview();

    // 1. 타워 건설 모드일 때: 실제로 건설 가능한 기반(벽) 위에 마우스를 올렸을 때만 사거리 프리뷰
    if (interactionMode === 'build' && selectedTower) {
        const cell = getCell(x, y);
        // 기반이 있고 타워가 없는 셀에만 설치 가능
        if (cell && cell.buildable && !cell.tower) {
            const stats = getGameTowerStats(selectedTower);
            if (stats) {
                highlightRange(x, y, stats.range, "range-preview");
            }
        }
    }
}

/**
 * 사거리 하이라이트 표시 (유클리드 원형 거리 기준)
 */
function highlightRange(centerX, centerY, range, className) {
    // 0.35의 오차 마진을 두어 격자 타일 상에서 자연스러운 원형 형성
    const maxDist = range + 0.35;
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            const dist = Math.hypot(dx, dy);
            if (dist <= maxDist) {
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

function getCell(x, y) {
    return board.find(c => c.x === x && c.y === y);
}

function getDomCell(x, y) {
    return gameBoard.children[y * boardSize + x];
}

