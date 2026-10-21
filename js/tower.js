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
            gold -= towerInfo.cost;
            clearRangePreview();
            render(); // 즉시 갱신
        } else {
            alert("골드가 부족합니다!");
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

        const towerStats = getGameTowerStats(cell.tower);
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
 * (규칙: 타워 비용의 60% 환불, 기반 건설 영역은 환불 불가하고 유지됨)
 */
function sellSelectedTower() {
    if (!selectedBoardTower || !selectedBoardTower.tower) return;

    const cell = selectedBoardTower;
    const towerInfo = TOWER_DATA[cell.tower];
    if (!towerInfo) return;

    const refundRate = (typeof TOWER_REFUND_RATE !== 'undefined') ? TOWER_REFUND_RATE : 0.6;
    const refund = Math.floor(towerInfo.cost * refundRate);

    gold += refund;
    cell.tower = null;
    cell.targeting = null;
    // cell.buildable 은 true 유지! (기반은 환불 불가)

    clearActiveRange();
    hideTowerDetailPanel();
    render();

    console.log(`타워 판매 완료: ${towerInfo.name} (+${refund}G, 60% 환급). 기반 영역은 유지됩니다.`);
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
        if (cell.tower === 'shock') specialDesc = "<br>⚡ 효과: 3기 연쇄 번개";

        statsEl.innerHTML = `⚔️ 공격력: ${dmgText} | 🏹 사거리: ${stats.range}${specialDesc}`;
    }

    const refundRate = (typeof TOWER_REFUND_RATE !== 'undefined') ? TOWER_REFUND_RATE : 0.6;
    const refund = Math.floor(stats.cost * refundRate);
    if (sellBtn) {
        sellBtn.innerText = `💰 타워 판매 (+${refund}G, 60%)`;
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
