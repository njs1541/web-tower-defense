/**
 * 몬스터 체력바 실시간 업데이트
 */
function updateEnemyHpBar(enemy) {
    if (!enemy || !enemy.hpFill) return;
    const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    enemy.hpFill.style.width = `${Math.round(ratio * 100)}%`;

    // 체력 30% 이하일 때 위험 색상(빨간색)으로 전환
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

    // 진행 중인 라운드가 있다면 루프 주기 및 몬스터 애니메이션 속도 재동기화
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

    // 스폰 루프 재시작 (아직 소환할 적이 남은 경우)
    if (spawnedCount < totalEnemies) {
        spawnInterval = setInterval(spawnNextMonster, spawnRate);
    }

    // 게임 루프 재시작
    gameInterval = setInterval(gameLoopTick, tickRate);
}

/**
 * 다음 몬스터 1마리 소환 로직
 */
function spawnNextMonster() {
    if (isPaused) return;

    if (spawnedCount < totalEnemies) {
        const isBossRound = (round % 10 === 0);
        let type = 'normal';
        let speedTick = 2; // Normal: 2틱(0.4s)당 1칸
        let hpMulti = 1;

        // ENEMY_BALANCE 설정 참조 (기본값: 1라운드 3 HP, 14% 복리 증가)
        const balance = (typeof ENEMY_BALANCE !== 'undefined') ? ENEMY_BALANCE : {
            baseHp: 3,
            hpGrowthRate: 1.14,
            bossHpMulti: 10,
            tankHpMulti: 2.0,
            fastHpMulti: 0.7
        };

        if (isBossRound) {
            type = 'boss';
            speedTick = 4; // Boss: 4틱(0.8s)당 1칸 (느림)
            hpMulti = balance.bossHpMulti || 10;
        } else if (round > 10) {
            const rand = Math.random();
            if (rand < 0.2) {
                type = 'tank';
                speedTick = 3;
                hpMulti = balance.tankHpMulti || 2.0;
            } else if (rand < 0.5) {
                type = 'fast';
                speedTick = 1;
                hpMulti = balance.fastHpMulti || 0.7;
            }
        }

        // 스테이지별 체력 및 속도 배율 적용 (Phase D)
        const stage = (typeof STAGE_DATA !== 'undefined' && STAGE_DATA[currentStage]) ? STAGE_DATA[currentStage] : { hpMulti: 1.0, speedMulti: 1.0 };
        // 라운드별 기본 체력 계산 (14% 증가율 완화 적용)
        const baseHP = Math.floor(balance.baseHp * Math.pow(balance.hpGrowthRate, round - 1));
        const finalHP = Math.max(1, Math.floor(baseHP * hpMulti * (stage.hpMulti || 1.0)));

        if (stage.speedMulti && stage.speedMulti > 1.0 && speedTick > 1) {
            speedTick = Math.max(1, Math.round(speedTick / stage.speedMulti));
        }

        const enemyExp = {
            ...path[0],
            pathIndex: 0,
            alive: true,
            hp: finalHP,
            maxHp: finalHP,
            type: type,
            speedTick: speedTick,
            currentTick: 0
        };

        // 몬스터 DOM 생성 (래퍼 + 체력바 + 바디)
        const wrapper = document.createElement("div");
        wrapper.className = "monster-wrapper";
        wrapper.style.left = `${enemyExp.x * 30}px`;
        wrapper.style.top = `${enemyExp.y * 30}px`;

        const duration = (speedTick * 0.2) / (gameSpeed || 1);
        wrapper.style.transition = `left ${duration}s linear, top ${duration}s linear`;

        // 체력바
        const hpBar = document.createElement("div");
        hpBar.className = "monster-hp-bar";
        const hpFill = document.createElement("div");
        hpFill.className = "monster-hp-fill";
        hpBar.appendChild(hpFill);
        wrapper.appendChild(hpBar);

        // 몬스터 바디
        const body = document.createElement("div");
        body.className = `monster-body ${type}`;
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
 * 200ms 단위 게임 루프 틱
 */
function gameLoopTick() {
    if (isPaused) return;

    for (let enemy of enemies) {
        if (!enemy.alive) continue;

        // 슬로우 디버프 틱 차감 및 해제 (Phase B)
        if (enemy.isSlowed) {
            enemy.slowTicksRemaining = (enemy.slowTicksRemaining || 0) - 1;
            if (enemy.slowTicksRemaining <= 0) {
                enemy.isSlowed = false;
                enemy.speedTick = enemy.originalSpeedTick || enemy.speedTick;
                if (enemy.element) {
                    const body = enemy.element.querySelector(".monster-body");
                    if (body) body.classList.remove("slowed");

                    // 이동 애니메이션 속도 정상 복구
                    const duration = (enemy.speedTick * 0.2) / (gameSpeed || 1);
                    enemy.element.style.transition = `left ${duration}s linear, top ${duration}s linear`;
                }
            }
        }

        enemy.currentTick++;
        if (enemy.currentTick < enemy.speedTick) {
            continue;
        }
        enemy.currentTick = 0;

        enemy.pathIndex++;
        const next = path[enemy.pathIndex];
        if (!next) {
            enemy.alive = false;
            if (enemy.element) enemy.element.remove();

            if (enemy.type === 'boss') {
                playerHP = 0;
                alert("보스가 마을을 파괴했습니다! Game Over!");
            } else {
                playerHP--;
            }

            if (playerHP <= 0) {
                endGame();
                return;
            }
        } else {
            enemy.x = next.x;
            enemy.y = next.y;

            if (enemy.element) {
                enemy.element.style.left = `${enemy.x * 30}px`;
                enemy.element.style.top = `${enemy.y * 30}px`;
            }
        }
    }

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
            alert("보스 클리어! 막대한 보상 50G를 획득했습니다!");
            gold += 50;
        }
    }

    render();
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
        totalEnemies = Math.max(1, Math.floor(round / 5));
    }

    updateSpeedUI();
    restartGameLoops();
}
