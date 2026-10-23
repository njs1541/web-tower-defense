/**
 * 몬스터 시스템 및 이동/소환 모듈 (js/enemy.js)
 * v0.21.0: 크롤러(기반 철거), 비행형(직선 비행), 도약형 보스, 공통 몬스터 팩토리
 */

/**
 * 몬스터 체력바 실시간 업데이트
 */
function updateEnemyHpBar(enemy) {
    if (!enemy || !enemy.hpFill) return;
    const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    enemy.hpFill.style.width = `${Math.round(ratio * 100)}%`;

    if (ratio <= 0.3) {
        enemy.hpFill.classList.add("danger");
    } else {
        enemy.hpFill.classList.remove("danger");
    }
}

/**
 * 게임 배속 설정 (1x, 2x)
 */
function setGameSpeed(speed) {
    if (gameSpeed === speed && !isPaused) return;

    gameSpeed = speed;
    isPaused = false;
    updateSpeedUI();

    if (gameRunning) {
        restartGameLoops();
        syncMonsterTransitions();
    }
}

/**
 * 일시정지 토글
 */
function togglePause() {
    isPaused = !isPaused;
    updateSpeedUI();

    if (gameRunning) {
        if (isPaused) {
            if (spawnInterval) clearInterval(spawnInterval);
            if (gameInterval) clearInterval(gameInterval);
        } else {
            restartGameLoops();
            syncMonsterTransitions();
        }
    }
}

/**
 * 필드 위 살아있는 몬스터들의 transition 속도 동기화
 */
function syncMonsterTransitions() {
    for (const enemy of enemies) {
        if (enemy.alive && enemy.element) {
            const duration = (enemy.speedTick * 0.2) / (gameSpeed || 1);
            enemy.element.style.transition = `left ${duration}s linear, top ${duration}s linear`;
        }
    }
}

/**
 * 배속에 맞추어 게임 루프 재시작
 */
function restartGameLoops() {
    if (spawnInterval) clearInterval(spawnInterval);
    if (gameInterval) clearInterval(gameInterval);

    const speed = gameSpeed || 1;
    const spawnRate = Math.floor(1000 / speed);
    const tickRate = Math.floor(200 / speed);

    if (spawnedCount < totalEnemies) {
        spawnInterval = setInterval(spawnNextMonster, spawnRate);
    }

    gameInterval = setInterval(gameLoopTick, tickRate);
}

/**
 * 라운드별 출현 몬스터 타입 결정
 */
function determineEnemyType(isBossRound) {
    if (isBossRound) {
        // 보스 3종 중 랜덤 출현 (지상형, 비행형, 도약형)
        const bossTypes = ['boss_ground', 'boss_flying', 'boss_leaping'];
        return bossTypes[Math.floor(Math.random() * bossTypes.length)];
    }

    if (round <= 3) {
        return 'normal';
    } else if (round <= 6) {
        return Math.random() < 0.65 ? 'normal' : 'fast';
    } else if (round <= 9) {
        const rand = Math.random();
        if (rand < 0.45) return 'normal';
        if (rand < 0.70) return 'fast';
        if (rand < 0.85) return 'tank';
        return 'crawler'; // 7라운드부터 기반을 부수는 크롤러 등장!
    } else {
        // 11라운드 이후 고난도 웨이브 (공중 유닛 포함)
        const rand = Math.random();
        if (rand < 0.35) return 'normal';
        if (rand < 0.55) return 'fast';
        if (rand < 0.70) return 'tank';
        if (rand < 0.85) return 'flying';  // 공중 비행 유닛
        return 'crawler'; // 크롤러
    }
}

/**
 * 다음 몬스터 1마리 소환 로직
 */
function spawnNextMonster() {
    if (isPaused) return;

    if (spawnedCount < totalEnemies) {
        const isBossRound = (round % 10 === 0);
        const type = determineEnemyType(isBossRound);
        const typeDef = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES[type]) ? ENEMY_TYPES[type] : {
            moveType: "ground", speedTick: 2, hpMulti: 1.0, emoji: "👾"
        };

        const balance = (typeof ENEMY_BALANCE !== 'undefined') ? ENEMY_BALANCE : {
            baseHp: 3, hpGrowthRate: 1.13, bossHpMulti: 8
        };

        const stage = (typeof STAGE_DATA !== 'undefined' && STAGE_DATA[currentStage]) ? STAGE_DATA[currentStage] : { hpMulti: 1.0, speedMulti: 1.0 };

        // 기본 체력 계산
        const baseHP = Math.floor(balance.baseHp * Math.pow(balance.hpGrowthRate, round - 1));
        const finalHP = Math.max(1, Math.floor(baseHP * (typeDef.hpMulti || 1.0) * (stage.hpMulti || 1.0)));

        let speedTick = typeDef.speedTick || 2;
        if (stage.speedMulti && stage.speedMulti > 1.0 && speedTick > 1) {
            speedTick = Math.max(1, Math.round(speedTick / stage.speedMulti));
        }

        // 스폰 위치는 동적 시작 지점(startPos)
        const spawnX = startPos ? startPos.x : 10;
        const spawnY = startPos ? startPos.y : 0;

        // 지상 유닛 초기 최단 경로 획득
        let initialPath = [];
        if (typeDef.moveType === 'ground' || typeDef.moveType === 'leap') {
            initialPath = findAStarPath({ x: spawnX, y: spawnY }, goalPos) || [];
        }

        const enemyExp = {
            x: spawnX,
            y: spawnY,
            pathIndex: 0,
            dynamicPath: initialPath,
            alive: true,
            hp: finalHP,
            maxHp: finalHP,
            type: type,
            moveType: typeDef.moveType || 'ground',
            isBoss: !!typeDef.isBoss,
            speedTick: speedTick,
            currentTick: 0,
            channelingTicks: 0, // 크롤러 철거 작업 틱
            targetBaseCell: null,
            leapCooldownTimer: 0
        };

        // DOM 래퍼 생성
        const wrapper = document.createElement("div");
        wrapper.className = `monster-wrapper ${typeDef.moveType}`;
        wrapper.style.left = `${spawnX * 30}px`;
        wrapper.style.top = `${spawnY * 30}px`;

        const duration = (speedTick * 0.2) / (gameSpeed || 1);
        wrapper.style.transition = `left ${duration}s linear, top ${duration}s linear`;

        // 체력바
        const hpBar = document.createElement("div");
        hpBar.className = "monster-hp-bar";
        const hpFill = document.createElement("div");
        hpFill.className = "monster-hp-fill";
        hpBar.appendChild(hpFill);
        wrapper.appendChild(hpBar);

        // 몬스터 본체 (이모지 및 스타일)
        const body = document.createElement("div");
        body.className = `monster-body ${type}`;
        body.innerText = typeDef.emoji || "👾";
        wrapper.appendChild(body);

        document.getElementById("game-board").appendChild(wrapper);

        enemyExp.element = wrapper;
        enemyExp.hpFill = hpFill;
        enemies.push(enemyExp);

        spawnedCount++;
    } else {
        clearInterval(spawnInterval);
    }
}

/**
 * 크롤러 전용: 가장 가까운 기반(벽) 탐색
 */
function findNearestBaseCell(fromX, fromY) {
    let nearest = null;
    let minDist = Infinity;

    for (const cell of board) {
        if (!cell.buildable) continue; // 기반이 있는 셀만

        const dist = Math.abs(cell.x - fromX) + Math.abs(cell.y - fromY);
        if (dist < minDist) {
            minDist = dist;
            nearest = cell;
        }
    }
    return nearest;
}

/**
 * 200ms 단위 게임 루프 틱
 */
function gameLoopTick() {
    if (isPaused) return;

    for (let enemy of enemies) {
        if (!enemy.alive) continue;

        // 1. 슬로우 디버프 틱 차감 및 해제
        if (enemy.isSlowed) {
            enemy.slowTicksRemaining = (enemy.slowTicksRemaining || 0) - 1;
            if (enemy.slowTicksRemaining <= 0) {
                enemy.isSlowed = false;
                enemy.speedTick = enemy.originalSpeedTick || enemy.speedTick;
                if (enemy.element) {
                    const body = enemy.element.querySelector(".monster-body");
                    if (body) body.classList.remove("slowed");

                    const duration = (enemy.speedTick * 0.2) / (gameSpeed || 1);
                    enemy.element.style.transition = `left ${duration}s linear, top ${duration}s linear`;
                }
            }
        }

        // 1-2. 화상(Burn) 도트 피해 틱 차감 및 데미지 적용 (v0.24.0 New)
        if (enemy.burnTicks && enemy.burnTicks > 0) {
            enemy.burnTicks--;
            const bDmg = enemy.burnDmg || 1;
            enemy.hp -= bDmg;
            if (typeof onEnemyHit === 'function') {
                onEnemyHit(enemy, bDmg, "#ff4500");
            }
            if (!enemy.alive) continue;
        }

        enemy.currentTick++;
        if (enemy.currentTick < enemy.speedTick) {
            continue;
        }
        enemy.currentTick = 0;

        // 2. 이동 방식(moveType)에 따른 분기 로직
        // ----------------------------------------------------
        // A. 크롤러 (Crawler): 가장 가까운 기반으로 가서 철거!
        // ----------------------------------------------------
        if (enemy.moveType === 'crawler') {
            handleCrawlerMovement(enemy);
        }
        // ----------------------------------------------------
        // B. 비행형 (Flying): 최단 직선으로 장애물 무시 비행!
        // ----------------------------------------------------
        else if (enemy.moveType === 'flying') {
            handleFlyingMovement(enemy);
        }
        // ----------------------------------------------------
        // C. 도약 보스 (Leap): 쿨타임마다 벽을 뛰어넘음!
        // ----------------------------------------------------
        else if (enemy.moveType === 'leap') {
            handleLeapingMovement(enemy);
        }
        // ----------------------------------------------------
        // D. 일반 지상군 (Ground): A* 최단 경로 이동
        // ----------------------------------------------------
        else {
            handleGroundMovement(enemy);
        }

        // 골인(출구 도달) 판정
        if (enemy.alive && enemy.x === goalPos.x && enemy.y === goalPos.y) {
            onEnemyReachGoal(enemy);
            if (playerHP <= 0) return;
        }
    }

    // 타워 공격 실행
    attackFromTowers();

    // 라운드 종료 체크
    const aliveEnemies = enemies.filter(e => e.alive).length;
    if (spawnedCount >= totalEnemies && aliveEnemies === 0) {
        clearInterval(gameInterval);
        clearInterval(spawnInterval);
        gameRunning = false;
        round++;

        const isBossRound = ((round - 1) % 10 === 0);
        if (isBossRound) {
            alert("👑 보스 격파 성공! 막대한 보상 50G를 획득했습니다!");
            gold += 50;
        }

        // 라운드 종료 후 버튼 및 보드 상태 갱신
        if (typeof updateButtonVisuals === 'function') updateButtonVisuals();
    }

    render();
}

/**
 * 지상 몬스터 이동 로직
 */
function handleGroundMovement(enemy) {
    if (!enemy.dynamicPath || enemy.dynamicPath.length === 0 || enemy.pathIndex >= enemy.dynamicPath.length - 1) {
        // 새 최단 경로 재계산
        enemy.dynamicPath = findAStarPath({ x: enemy.x, y: enemy.y }, goalPos) || [];
        enemy.pathIndex = 0;
    }

    if (enemy.dynamicPath && enemy.dynamicPath.length > 0 && enemy.pathIndex < enemy.dynamicPath.length - 1) {
        enemy.pathIndex++;
        const next = enemy.dynamicPath[enemy.pathIndex];
        if (next) {
            enemy.x = next.x;
            enemy.y = next.y;
            updateEnemyPosition(enemy);
        }
    }
}

/**
 * 비행 몬스터 이동 로직 (직선 이동)
 */
function handleFlyingMovement(enemy) {
    const dx = goalPos.x - enemy.x;
    const dy = goalPos.y - enemy.y;

    if (Math.abs(dy) >= Math.abs(dx)) {
        enemy.y += (dy > 0 ? 1 : -1);
    } else {
        enemy.x += (dx > 0 ? 1 : -1);
    }

    updateEnemyPosition(enemy);
}

/**
 * 도약형 보스 이동 로직
 */
function handleLeapingMovement(enemy) {
    enemy.leapCooldownTimer = (enemy.leapCooldownTimer || 0) + 1;

    // 6틱마다 전방 2칸 도약 시도
    if (enemy.leapCooldownTimer >= 6) {
        enemy.leapCooldownTimer = 0;

        const dy = goalPos.y - enemy.y;
        const dx = goalPos.x - enemy.x;
        const stepY = dy !== 0 ? (dy > 0 ? 2 : -2) : 0;
        const stepX = (stepY === 0 && dx !== 0) ? (dx > 0 ? 2 : -2) : 0;

        const jumpX = Math.max(0, Math.min(boardSize - 1, enemy.x + stepX));
        const jumpY = Math.max(0, Math.min(boardSize - 1, enemy.y + stepY));
        const targetCell = getCell(jumpX, jumpY);

        // 뛰어넘은 곳이 빈 땅이면 점프 성공!
        if (targetCell && !targetCell.buildable) {
            enemy.x = jumpX;
            enemy.y = jumpY;
            updateEnemyPosition(enemy);

            // 점프 이펙트
            if (enemy.element) {
                enemy.element.classList.add("leap-jump");
                setTimeout(() => enemy.element && enemy.element.classList.remove("leap-jump"), 300);
            }
            // 점프 후 경로 갱신
            enemy.dynamicPath = findAStarPath({ x: enemy.x, y: enemy.y }, goalPos) || [];
            enemy.pathIndex = 0;
            return;
        }
    }

    // 도약 안 할 때는 일반 지상 이동
    handleGroundMovement(enemy);
}

/**
 * 크롤러 이동 및 기반 철거 로직
 */
function handleCrawlerMovement(enemy) {
    // 1. 현재 접촉 중인 기반이 있는지 확인
    const adjacentDirs = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
    let touchingBase = null;

    for (const d of adjacentDirs) {
        const checkCell = getCell(enemy.x + d.dx, enemy.y + d.dy);
        if (checkCell && checkCell.buildable) {
            touchingBase = checkCell;
            break;
        }
    }

    // 기반과 맞닿아 있다면 철거 작업(채널링) 진행
    if (touchingBase) {
        enemy.channelingTicks = (enemy.channelingTicks || 0) + 1;
        if (enemy.element) enemy.element.classList.add("demolishing");

        // 7틱(약 1.4초) 동안 공격 시 기반 파괴!
        if (enemy.channelingTicks >= 7) {
            demolishBase(touchingBase);
            enemy.channelingTicks = 0;
            if (enemy.element) enemy.element.classList.remove("demolishing");
        }
        return;
    }

    if (enemy.element) enemy.element.classList.remove("demolishing");
    enemy.channelingTicks = 0;

    // 2. 필드에 남아있는 가장 가까운 기반 탐색
    const nearestBase = findNearestBaseCell(enemy.x, enemy.y);

    if (nearestBase) {
        // 해당 기반의 인접 빈 셀로 A* 이동
        const targetPath = findAStarPath({ x: enemy.x, y: enemy.y }, nearestBase);
        if (targetPath && targetPath.length > 1) {
            enemy.x = targetPath[1].x;
            enemy.y = targetPath[1].y;
            updateEnemyPosition(enemy);
            return;
        }
    }

    // 기반이 없거나 도달 불가능하면 일반 출구로 이동
    handleGroundMovement(enemy);
}

/**
 * 크롤러에 의한 기반(및 타워) 철거 실행
 */
function demolishBase(cell) {
    if (!cell || !cell.buildable) return;

    // v0.32.0 대장 지휘관 수호 결계: 대장이 서 있는 기반은 크롤러가 절대 철거 불가!
    if (typeof leaderDeployed !== 'undefined' && leaderDeployed && leaderPos && cell.x === leaderPos.x && cell.y === leaderPos.y) {
        showFloatingDamage(cell.x, cell.y, "🛡️ 대장 결계! 철거 차단!", "#38bdf8");
        return;
    }

    cell.buildable = false;
    const hadTower = cell.tower;
    cell.tower = null;
    cell.targeting = null;

    builtBaseCount = Math.max(0, (builtBaseCount || 0) - 1);

    // 파괴 시각 이펙트
    showFloatingDamage(cell.x, cell.y, "기반 파괴!", "#ef4444");
    console.log(`기반 철거 발생: (${cell.x}, ${cell.y})${hadTower ? ' 및 타워 파괴!' : ''}`);

    // 전체 최단 경로 즉시 재계산
    if (typeof recalculateGlobalPath === 'function') {
        recalculateGlobalPath();
    }
    render();
    if (typeof updateButtonVisuals === 'function') {
        updateButtonVisuals();
    }
}

/**
 * 몬스터 DOM 좌표 갱신 유틸
 */
function updateEnemyPosition(enemy) {
    if (enemy.element) {
        enemy.element.style.left = `${enemy.x * 30}px`;
        enemy.element.style.top = `${enemy.y * 30}px`;
    }
}

/**
 * 몬스터가 마을(출구)에 도달했을 때의 처리
 */
function onEnemyReachGoal(enemy) {
    enemy.alive = false;
    if (enemy.element) enemy.element.remove();

    if (enemy.isBoss) {
        playerHP = Math.max(0, playerHP - 3);
        alert(`🚨 보스가 마을을 강타했습니다! (-3 HP)`);
    } else {
        playerHP--;
    }

    if (playerHP <= 0) {
        endGame();
    }
}

/**
 * 라운드 시작
 */
function startRound() {
    if (gameRunning) return;

    if (spawnInterval) clearInterval(spawnInterval);
    if (gameInterval) clearInterval(gameInterval);

    gameRunning = true;
    isPaused = false;
    enemies = [];

    spawnedCount = 0;
    totalEnemies = round;

    const isBossRound = (round % 10 === 0);
    if (isBossRound) {
        totalEnemies = 1; // 보스전은 강력한 보스 1기 집중!
    }

    updateSpeedUI();
    restartGameLoops();

    // v0.32.0 라운드 시작 시 대장 이동 기회 1회 리셋
    if (typeof leaderRelocatedThisRound !== 'undefined') {
        leaderRelocatedThisRound = false;
        isLeaderDeployMode = false;
        if (typeof updateInGameCommandersBar === 'function') {
            updateInGameCommandersBar();
        }
    }
}

