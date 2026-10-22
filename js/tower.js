function resetSelection() {
    interactionMode = 'none';
    selectedTower = null;
    clearRangePreview();
    clearActiveRange();
    hideTowerDetailPanel();
    updateButtonVisuals();
}

/**
 * 기반 건설 모드 선택 (구 타일 해제)
 */
function selectBaseBuildMode() {
    console.log("Input: Base Build Mode Clicked");
    if (interactionMode === 'base' || interactionMode === 'unlock') {
        resetSelection();
        return;
    }
    clearActiveRange();
    hideTowerDetailPanel();
    interactionMode = 'base';
    selectedTower = null;
    updateButtonVisuals();
}

// 하위 호환성 유지
function selectUnlockMode() {
    selectBaseBuildMode();
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

    // 2. 기반 건설 모드 (기반은 벽 역할을 하며, 환불 불가)
    if (interactionMode === 'base' || interactionMode === 'unlock') {
        if (cell.isStart || cell.isGoal) {
            alert("입구 및 출구에는 기반을 건설할 수 없습니다.");
            return;
        }

        if (typeof isSafetyZone === 'function' && isSafetyZone(x, y)) {
            alert("시작 지점 및 골인 지점 인근(보호구역)에는 기반을 건설할 수 없습니다.");
            return;
        }

        if (cell.buildable) {
            // 기반은 환불 불가
            alert("이미 기반이 건설된 타일입니다. (기반은 환불이 불가능합니다.)");
            return;
        }

        // 2-1. 봉쇄 방지 검사 (A* 길찾기로 몬스터의 출구 경로가 막히는지 확인)
        if (typeof canBuildBaseAt === 'function' && !canBuildBaseAt(x, y)) {
            alert("⚠️ 몬스터의 이동 경로를 완전히 차단할 수 없습니다! (통로를 남겨주세요)");
            return;
        }

        const cost = (typeof getBaseBuildCost === 'function') ? getBaseBuildCost() : 1;
        if (gold >= cost) {
            cell.buildable = true;
            gold -= cost;
            builtBaseCount = (builtBaseCount || 0) + 1;

            // 전역 몬스터 최단 경로 즉시 재계산
            if (typeof recalculateGlobalPath === 'function') {
                recalculateGlobalPath();
            }

            render();
            updateButtonVisuals();
            console.log(`기반 건설 완료: (${x}, ${y}), 비용: ${cost}G, 총 기반 수: ${builtBaseCount}`);
        } else {
            alert(`골드가 부족합니다! (필요 골드: ${cost}G)`);
        }
        return;
    }

    // 3. 타워 건설 모드
    if (interactionMode === 'build') {
        if (!cell.buildable) {
            alert("타워는 '기반'이 건설된 영역 위에만 설치할 수 있습니다!");
            return;
        }

        if (!selectedTower) return;
        const towerInfo = TOWER_DATA[selectedTower];
        if (!towerInfo) return;

        if (gold >= towerInfo.cost) {
            cell.tower = selectedTower;
            cell.targeting = 'first'; // 기본 타깃팅: 선두
            cell.inGameLevel = 0;     // 인게임 0강 기본 상태
            cell.investedGold = towerInfo.cost; // 환불 계산용 누적 투자 비용
            gold -= towerInfo.cost;
            clearRangePreview();
            render(); // 즉시 갱신
        } else {
            alert("타워 포인트(TP)가 부족합니다!");
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
        return inRangeEnemies.slice().sort((a, b) => b.hp - a.hp || b.pathIndex - a.pathIndex)[0];
    } else if (mode === 'weakest') {
        return inRangeEnemies.slice().sort((a, b) => a.hp - b.hp || b.pathIndex - a.pathIndex)[0];
    } else if (mode === 'boss') {
        const bosses = inRangeEnemies.filter(e => e.isBoss || e.type.startsWith('boss'));
        if (bosses.length > 0) {
            return bosses.sort((a, b) => b.pathIndex - a.pathIndex)[0];
        }
        return inRangeEnemies.slice().sort((a, b) => b.pathIndex - a.pathIndex)[0];
    } else {
        return inRangeEnemies.slice().sort((a, b) => b.pathIndex - a.pathIndex)[0];
    }
}

/**
 * 타워들의 적 공격 루프 (공중 유닛 요격 필터 및 신규 타워 확장 지원)
 */
function attackFromTowers() {
    for (const cell of board) {
        if (!cell.tower) continue;

        const towerStats = getGameTowerStats(cell);
        if (!towerStats) continue;

        const range = towerStats.range;
        const damage = towerStats.damage;
        const targetType = towerStats.targetType || "all";

        // 사거리 내 살아있는 적 수집 (타입 필터링 적용)
        const inRangeEnemies = enemies.filter(e => {
            if (!e.alive) return false;

            // 지상 전용 타워(근거리, 폭탄 등)는 비행 유닛 타격 불가
            if (targetType === "ground_only" && e.moveType === "flying") {
                return false;
            }

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

                const victims = enemies.filter(e => {
                    return e.alive && Math.abs(e.x - targetEnemy.x) <= 1 && Math.abs(e.y - targetEnemy.y) <= 1 && e.moveType !== 'flying';
                });

                for (const victim of victims) {
                    victim.hp -= damage;
                    onEnemyHit(victim, damage, "#ff9100");
                }
            }
            // 3. 전격 타워 (Shock): 연쇄 번개 피해
            else if (cell.tower === 'shock') {
                targetEnemy.hp -= damage;
                onEnemyHit(targetEnemy, damage, "#f59e0b");

                const chainTargets = enemies.filter(e => e.alive && e !== targetEnemy && Math.abs(e.x - targetEnemy.x) <= 2 && Math.abs(e.y - targetEnemy.y) <= 2).slice(0, 2);
                for (const chain of chainTargets) {
                    chain.hp -= damage * 0.7;
                    onEnemyHit(chain, damage * 0.7, "#fbbf24");
                }
            }
            // 4. 일반/저격 타워 (Ranged / Melee / Sniper)
            else {
                targetEnemy.hp -= damage;
                onEnemyHit(targetEnemy, damage, towerStats.color || "#ffeb3b");
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

        // 1. 기본 TP(골드) 획득
        gold++;

        // 2. 마나 포인트(MP) 회복 (+2 MP, 최대치까지)
        mp = Math.min(maxMp || 100, (mp || 0) + 2);

        // 3. 10라운드 보스 처치 시 프리즘 포인트 (PP) 1개 확정 지급! (v0.22.0)
        if (enemy.isBoss) {
            USER_DATA.pp = (USER_DATA.pp || 0) + 1;
            saveData();
            showFloatingDamage(enemy.x, enemy.y, "💎 보스 격파! PP +1 획득!", "#38bdf8");
            console.log(`[보스 격파] 프리즘 포인트(PP) 1개 획득! (현재 보유: ${USER_DATA.pp}개)`);
        } else {
            // 일반 몬스터 처치 시 12% 확률로 룬 포인트(RP) 드롭
            if (Math.random() < 0.12) {
                USER_DATA.rp = (USER_DATA.rp || 0) + 1;
                saveData();
                showFloatingDamage(enemy.x, enemy.y, "🔮 RP +1!", "#c084fc");
            }
        }

        if (typeof render === "function") render();
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
 * (규칙: 타워 비용의 60% 환불, 기반 건설 영역은 환불 불가하고 유지됨)
 */
/**
 * 선택된 타워 판매 (Sell)
 * (규칙: 타워 기본비용 + 강화 누적 비용의 60% 환불, 기반 건설 영역은 환불 불가하고 유지됨)
 */
function sellSelectedTower() {
    if (!selectedBoardTower || !selectedBoardTower.tower) return;

    const cell = selectedBoardTower;
    const towerInfo = TOWER_DATA[cell.tower];
    if (!towerInfo) return;

    const refundRate = (typeof TOWER_REFUND_RATE !== 'undefined') ? TOWER_REFUND_RATE : 0.6;
    const totalCost = cell.investedGold || towerInfo.cost;
    const refund = Math.floor(totalCost * refundRate);

    gold += refund;
    cell.tower = null;
    cell.targeting = null;
    cell.inGameLevel = 0;
    cell.investedGold = 0;
    // cell.buildable 은 true 유지! (기반은 환불 불가)

    clearActiveRange();
    hideTowerDetailPanel();
    render();

    console.log(`타워 판매 완료: ${towerInfo.name} (+${refund} TP, 60% 환급). 기반 영역은 유지됩니다.`);
}

/**
 * 인게임 타워 강화 (Upgrade) - v0.22.0
 * 출전 캐릭터 덱의 타워별 강화 한도(deckTowerCaps) 내에서 TP를 소모하여 업그레이드
 */
function upgradeSelectedTower() {
    if (!selectedBoardTower || !selectedBoardTower.tower) return;

    const cell = selectedBoardTower;
    const towerInfo = TOWER_DATA[cell.tower];
    if (!towerInfo) return;

    // 현재 출전 캐릭터 덱으로부터 타워별 최대 강화 가능 한도 계산
    if (typeof calculateDeckTowerCaps === 'function') {
        deckTowerCaps = calculateDeckTowerCaps();
    }
    const maxCap = (deckTowerCaps && deckTowerCaps[cell.tower]) || 0;
    const currentLv = cell.inGameLevel || 0;

    if (currentLv >= maxCap) {
        alert(`⚠️ 현재 출전 지휘관 덱의 최대 강화 한도(Lv.${maxCap})에 도달했습니다!\n로비에서 더 높은 등급의 지휘관을 덱에 편성하면 한도를 높일 수 있습니다.`);
        return;
    }

    // 강화 비용: 기본 타워 비용 * 0.8 + (다음레벨 * 2) TP
    const upgradeCost = Math.floor(towerInfo.cost * 0.8) + (currentLv + 1) * 2;

    if (gold < upgradeCost) {
        alert(`타워 포인트(TP)가 부족합니다! (필요 TP: ${upgradeCost})`);
        return;
    }

    gold -= upgradeCost;
    cell.inGameLevel = currentLv + 1;
    cell.investedGold = (cell.investedGold || towerInfo.cost) + upgradeCost;

    // 축하 플로팅 텍스트
    showFloatingDamage(cell.x, cell.y, `⬆️ Lv.${cell.inGameLevel} 강화!`, "#22c55e");

    const updatedStats = getGameTowerStats(cell);
    showTowerDetailPanel(cell, updatedStats);
    render();

    console.log(`타워 강화 완료: ${towerInfo.name} Lv.${cell.inGameLevel} (소모 TP: ${upgradeCost}, 총 투자: ${cell.investedGold})`);
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
 * 타워 상세 관리 패널 표시 (v0.22.0 인게임 강화 버튼 및 한도 노출)
 */
function showTowerDetailPanel(cell, stats) {
    const panel = document.getElementById("tower-detail-panel");
    if (!panel) return;

    panel.style.display = "block";

    const titleEl = document.getElementById("detail-tower-name");
    const statsEl = document.getElementById("detail-tower-stats");
    const sellBtn = document.getElementById("btn-sell-tower");
    const upgradeBtn = document.getElementById("btn-upgrade-tower");

    const inGameLv = cell.inGameLevel || 0;

    if (titleEl) {
        const inGameBadge = inGameLv > 0 ? ` <span style="color:#22c55e;">[+${inGameLv}강]</span>` : "";
        titleEl.innerHTML = `🏰 ${stats.name}${inGameBadge}`;
        titleEl.style.color = stats.color;
    }

    if (statsEl) {
        const dmgText = Math.round(stats.damage * 10) / 10;
        let specialDesc = "";
        if (cell.tower === 'ice') specialDesc = "<br>❄️ 효과: 50% 슬로우";
        if (cell.tower === 'bomb') specialDesc = "<br>💣 효과: 3x3 범위 폭발";
        if (cell.tower === 'shock') specialDesc = "<br>⚡ 효과: 3기 연쇄 번개";

        statsEl.innerHTML = `⚔️ 공격력: ${dmgText} | 🏹 사거리: ${stats.range}${specialDesc}`;
    }

    // 강화 버튼 처리
    if (typeof calculateDeckTowerCaps === 'function') {
        deckTowerCaps = calculateDeckTowerCaps();
    }
    const maxCap = (deckTowerCaps && deckTowerCaps[cell.tower]) || 0;
    const upgradeCost = Math.floor(stats.cost * 0.8) + (inGameLv + 1) * 2;

    if (upgradeBtn) {
        if (maxCap === 0) {
            upgradeBtn.disabled = true;
            upgradeBtn.innerText = `🔒 강화 불가 (지휘관 미편성: 한도 0)`;
            upgradeBtn.title = "로비에서 해당 타워를 지원하는 지휘관을 덱에 편성하세요.";
        } else if (inGameLv >= maxCap) {
            upgradeBtn.disabled = true;
            upgradeBtn.innerText = `🔒 MAX 강화 도달 (Lv.${inGameLv} / ${maxCap})`;
            upgradeBtn.title = "출전 지휘관의 성급을 올리거나 상위 등급 지휘관을 편성하세요.";
        } else {
            upgradeBtn.disabled = false;
            upgradeBtn.innerText = `⬆️ 강화 (+${upgradeCost} TP) [Lv.${inGameLv} ➔ ${inGameLv + 1} / MAX ${maxCap}]`;
            upgradeBtn.title = `타워 포인트를 소모하여 공격력을 25% 향상시킵니다.`;
        }
    }

    // 판매 버튼 처리 (투자 비용 60% 환급)
    const refundRate = (typeof TOWER_REFUND_RATE !== 'undefined') ? TOWER_REFUND_RATE : 0.6;
    const totalInvested = cell.investedGold || stats.cost;
    const refund = Math.floor(totalInvested * refundRate);
    if (sellBtn) {
        sellBtn.innerText = `💰 타워 판매 (+${refund} TP, 60%)`;
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
function getGameTowerStats(cellOrType) {
    let type = cellOrType;
    let inGameLevel = 0;
    if (typeof cellOrType === 'object' && cellOrType !== null) {
        type = cellOrType.tower;
        inGameLevel = cellOrType.inGameLevel || 0;
    }

    if (typeof getTowerStats === "function") {
        return getTowerStats(type, TOWER_DATA, inGameLevel);
    }
    return TOWER_DATA[type];
}
