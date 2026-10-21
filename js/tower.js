function resetSelection() {
    interactionMode = 'none';
    selectedTower = null;
    clearRangePreview();
    clearActiveRange();
    hideTowerDetailPanel();
    updateButtonVisuals();
}

function selectUnlockMode() {
    console.log("Input: Unlock Mode Clicked");
    if (interactionMode === 'unlock') {
        resetSelection();
        return;
    }
    clearActiveRange();
    hideTowerDetailPanel();
    interactionMode = 'unlock';
    selectedTower = null;
    updateButtonVisuals();
}

function selectTower(towerId) {
    console.log("Input: Tower Selected", towerId);
    if (interactionMode === 'build' && selectedTower === towerId) {
        resetSelection();
        return;
    }
    clearActiveRange();
    hideTowerDetailPanel();
    interactionMode = 'build';
    selectedTower = towerId;
    updateButtonVisuals();
}

function handleCellClick(x, y) {
    const cell = getCell(x, y);
    if (!cell) return;

    // 1. 이미 타워가 설치된 셀을 클릭한 경우 -> 사거리 및 타워 상세 관리 패널 표시
    if (cell.tower) {
        // 이미 선택된 타워라면 선택 해제
        if (selectedBoardTower && selectedBoardTower.x === x && selectedBoardTower.y === y) {
            clearActiveRange();
            hideTowerDetailPanel();
            return;
        }

        clearActiveRange();
        resetSelection(); // 건설/해제 모드 해제

        selectedBoardTower = cell;
        if (!cell.targeting) cell.targeting = 'first'; // 기본 타깃팅

        const dom = getDomCell(x, y);
        if (dom) dom.classList.add("selected-tower");

        const towerStats = getGameTowerStats(cell.tower);
        if (towerStats) {
            highlightRange(x, y, towerStats.range, "range-active");
            showTowerDetailPanel(cell, towerStats);
        }
        return;
    }

    // 빈 땅을 클릭했을 때 기존 선택 타워 하이라이트 및 패널 해제
    clearActiveRange();
    hideTowerDetailPanel();

    // 2. 타일 해제 모드
    if (interactionMode === 'unlock') {
        if (cell.buildable || cell.path) {
            return;
        }

        if (gold >= unlockTileCost) {
            cell.buildable = true;
            gold -= unlockTileCost;
            render(); // 즉시 갱신
        } else {
            alert("골드가 부족합니다!");
        }
        return;
    }

    // 3. 타워 건설 모드
    if (interactionMode === 'build') {
        if (cell.buildable) {
            if (!selectedTower) return;
            const towerInfo = TOWER_DATA[selectedTower];
            if (!towerInfo) return;

            if (gold >= towerInfo.cost) {
                cell.tower = selectedTower;
                cell.targeting = 'first'; // 기본 타깃팅: 선두
                gold -= towerInfo.cost;
                clearRangePreview();
                render(); // 즉시 갱신
            } else {
                alert("골드가 부족합니다!");
            }
        }
    }
}

/**
 * 타깃팅 전략에 따른 공격 대상 선정 (Phase B)
 */
function selectTargetEnemy(cell, inRangeEnemies) {
    if (!inRangeEnemies || inRangeEnemies.length === 0) return null;

    const mode = cell.targeting || 'first';

    if (mode === 'strongest') {
        // 체력이 가장 높은 적 (동률 시 선두)
        return inRangeEnemies.slice().sort((a, b) => b.hp - a.hp || b.pathIndex - a.pathIndex)[0];
    } else if (mode === 'weakest') {
        // 체력이 가장 낮은 적 (동률 시 선두)
        return inRangeEnemies.slice().sort((a, b) => a.hp - b.hp || b.pathIndex - a.pathIndex)[0];
    } else if (mode === 'boss') {
        // 보스 우선 필터
        const bosses = inRangeEnemies.filter(e => e.type === 'boss');
        if (bosses.length > 0) {
            return bosses.sort((a, b) => b.pathIndex - a.pathIndex)[0];
        }
        // 보스 없으면 선두
        return inRangeEnemies.slice().sort((a, b) => b.pathIndex - a.pathIndex)[0];
    } else {
        // 기본값: 선두(First) - 경로 인덱스가 가장 큰 적
        return inRangeEnemies.slice().sort((a, b) => b.pathIndex - a.pathIndex)[0];
    }
}

/**
 * 타워들의 적 공격 루프 (Phase B 특수 타워 로직 포함)
 */
function attackFromTowers() {
    for (const cell of board) {
        if (!cell.tower) continue;

        const towerStats = getGameTowerStats(cell.tower);
        if (!towerStats) continue;

        const range = towerStats.range;
        const damage = towerStats.damage;

        // 사거리 내 살아있는 적 수집
        const inRangeEnemies = enemies.filter(e => {
            if (!e.alive) return false;
            return Math.abs(e.x - cell.x) <= range && Math.abs(e.y - cell.y) <= range;
        });

        if (inRangeEnemies.length === 0) continue;

        // 타깃팅 전략에 맞춰 목표 적 1명 선정
        const targetEnemy = selectTargetEnemy(cell, inRangeEnemies);
        if (!targetEnemy) continue;

        // 투사체 발사
        const startDom = getDomCell(cell.x, cell.y);
        const targetDom = targetEnemy.element;
        if (startDom && targetDom) {
            createProjectile(startDom, targetDom, towerStats.color);
        }

        // 배속에 맞춘 투사체 도달 딜레이
        const hitDelay = Math.max(50, Math.floor(200 / (gameSpeed || 1)));

        setTimeout(() => {
            if (!targetEnemy.alive) return;

            // 1. 얼음 타워 (Ice): 슬로우 효과 부여
            if (cell.tower === 'ice') {
                targetEnemy.hp -= damage;
                applySlowEffect(targetEnemy, towerStats.slowTicks || 10);
                onEnemyHit(targetEnemy, damage, "#00e5ff");
            }
            // 2. 폭탄 타워 (Bomb): 착탄 지점 3x3 광역 스플래시 데미지
            else if (cell.tower === 'bomb') {
                createSplashEffect(targetEnemy.x, targetEnemy.y);

                // 착탄 지점 기준 3x3 범위 내 모든 적에게 피해
                const victims = enemies.filter(e => {
                    return e.alive && Math.abs(e.x - targetEnemy.x) <= 1 && Math.abs(e.y - targetEnemy.y) <= 1;
                });

                for (const victim of victims) {
                    victim.hp -= damage;
                    onEnemyHit(victim, damage, "#ff9100");
                }
            }
            // 3. 일반 타워 (Ranged / Melee)
            else {
                targetEnemy.hp -= damage;
                onEnemyHit(targetEnemy, damage, "#ffeb3b");
            }
        }, hitDelay);
    }
}

/**
 * 단일 적 피격 후 체력바 갱신, 플로팅 텍스트 팝업 및 사망 처리
 */
function onEnemyHit(enemy, damage, color = "#ffeb3b") {
    // 플로팅 데미지 텍스트 생성
    if (typeof damage === 'number') {
        showFloatingDamage(enemy.x, enemy.y, damage, color);
    }

    if (typeof updateEnemyHpBar === "function") {
        updateEnemyHpBar(enemy);
    }

    if (enemy.element) {
        enemy.element.classList.add("hit-effect");
        setTimeout(() => {
            if (enemy.element) enemy.element.classList.remove("hit-effect");
        }, 80);
    }

    if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false;
        if (enemy.element) enemy.element.remove();
        gold++;
    }
}

/**
 * 피격 시 플로팅 데미지 텍스트 팝업 (Phase C: Juice Effect)
 */
function showFloatingDamage(gridX, gridY, damage, color = "#ffeb3b") {
    const boardDom = document.getElementById("game-board");
    if (!boardDom) return;

    const el = document.createElement("div");
    el.className = "floating-damage";
    el.innerText = `-${Math.round(damage * 10) / 10}`;
    el.style.color = color;

    // 약간의 랜덤 오프셋
    const randomOffsetX = Math.floor(Math.random() * 12) - 6;
    el.style.left = `${gridX * 30 + 10 + randomOffsetX}px`;
    el.style.top = `${gridY * 30 + 2}px`;

    boardDom.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 550);
}

/**
 * 얼음 타워 둔화(Slow) 디버프 적용
 */
function applySlowEffect(enemy, durationTicks) {
    if (!enemy || !enemy.alive) return;

    enemy.slowTicksRemaining = Math.max(enemy.slowTicksRemaining || 0, durationTicks);

    // 최초 슬로우 진입 시 속도 틱 2배 (둔화)
    if (!enemy.isSlowed) {
        enemy.isSlowed = true;
        enemy.originalSpeedTick = enemy.speedTick;
        enemy.speedTick = enemy.speedTick * 2; // 이동 주기 2배 느려짐

        if (enemy.element) {
            const body = enemy.element.querySelector(".monster-body");
            if (body) body.classList.add("slowed");
        }
    }
}

/**
 * 폭탄 타워 광역 폭발 이펙트 생성
 */
function createSplashEffect(gridX, gridY) {
    const boardDom = document.getElementById("game-board");
    if (!boardDom) return;

    const splash = document.createElement("div");
    splash.className = "splash-effect";
    splash.style.left = `${gridX * 30 + 15}px`;
    splash.style.top = `${gridY * 30 + 15}px`;

    boardDom.appendChild(splash);

    setTimeout(() => {
        splash.remove();
    }, 350);
}

/**
 * 투사체 생성 애니메이션
 */
function createProjectile(startElem, targetElem, color) {
    const rectStart = startElem.getBoundingClientRect();
    const rectTarget = targetElem.getBoundingClientRect();
    const containerRect = document.getElementById("game-board").getBoundingClientRect();

    const startX = rectStart.left - containerRect.left + 15;
    const startY = rectStart.top - containerRect.top + 15;
    const targetX = rectTarget.left - containerRect.left + 15;
    const targetY = rectTarget.top - containerRect.top + 15;

    const projectile = document.createElement("div");
    projectile.className = "projectile";
    projectile.style.backgroundColor = color;
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;

    document.getElementById("game-board").appendChild(projectile);
    projectile.getBoundingClientRect();

    projectile.style.transform = `translate(${targetX - startX}px, ${targetY - startY}px)`;

    const animDuration = Math.max(50, Math.floor(200 / (gameSpeed || 1)));
    setTimeout(() => {
        projectile.remove();
    }, animDuration);
}

/**
 * 선택된 타워 판매 (Sell)
 */
function sellSelectedTower() {
    if (!selectedBoardTower || !selectedBoardTower.tower) return;

    const cell = selectedBoardTower;
    const towerInfo = TOWER_DATA[cell.tower];
    if (!towerInfo) return;

    // 건설 비용의 70% 환급 (올림 처리)
    const refund = Math.floor(towerInfo.cost * 0.7);

    gold += refund;
    cell.tower = null;
    cell.targeting = null;

    clearActiveRange();
    hideTowerDetailPanel();
    render();

    console.log(`타워 판매 완료: ${towerInfo.name} (+${refund}G)`);
}

/**
 * 선택된 타워의 타깃팅 모드 변경
 */
function setSelectedTowerTargeting(mode) {
    if (!selectedBoardTower) return;
    selectedBoardTower.targeting = mode;
    updateTargetingButtonsUI(mode);
}

/**
 * 타워 상세 관리 패널 표시
 */
function showTowerDetailPanel(cell, stats) {
    const panel = document.getElementById("tower-detail-panel");
    if (!panel) return;

    panel.style.display = "block";

    const titleEl = document.getElementById("detail-tower-name");
    const statsEl = document.getElementById("detail-tower-stats");
    const sellBtn = document.getElementById("btn-sell-tower");

    if (titleEl) {
        titleEl.innerText = `🏰 ${stats.name} (Lv.${stats.level || 1})`;
        titleEl.style.color = stats.color;
    }

    if (statsEl) {
        const dmgText = Math.round(stats.damage * 10) / 10;
        let specialDesc = "";
        if (cell.tower === 'ice') specialDesc = "<br>❄️ 효과: 50% 슬로우";
        if (cell.tower === 'bomb') specialDesc = "<br>💣 효과: 3x3 범위 폭발";

        statsEl.innerHTML = `⚔️ 공격력: ${dmgText} | 🏹 사거리: ${stats.range}${specialDesc}`;
    }

    const refund = Math.floor(stats.cost * 0.7);
    if (sellBtn) {
        sellBtn.innerText = `💰 타워 판매 (+${refund}G)`;
    }

    updateTargetingButtonsUI(cell.targeting || 'first');
}

/**
 * 타워 상세 관리 패널 숨김
 */
function hideTowerDetailPanel() {
    const panel = document.getElementById("tower-detail-panel");
    if (panel) {
        panel.style.display = "none";
    }
}

/**
 * 타깃팅 버튼 활성화 상태 갱신
 */
function updateTargetingButtonsUI(currentMode) {
    const buttons = document.querySelectorAll(".btn-target");
    buttons.forEach(btn => {
        if (btn.dataset.targetMode === currentMode) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// 타워 스탯 가져오기 (전역 함수 getTowerStats 사용, 없으면 기본값)
function getGameTowerStats(type) {
    if (typeof getTowerStats === "function") {
        return getTowerStats(type, TOWER_DATA);
    }
    return TOWER_DATA[type];
}
