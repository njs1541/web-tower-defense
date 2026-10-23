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

    // 0. 대장 지휘관 강림/이동 타일 선택 모드 (v0.32.0 New)
    if (typeof isLeaderDeployMode !== 'undefined' && isLeaderDeployMode) {
        handleLeaderDeployClick(cell);
        return;
    }

    // 0-2. 필드 위 대장 토큰 직접 클릭 시 이동 모드 토글
    if (typeof leaderDeployed !== 'undefined' && leaderDeployed && leaderPos && leaderPos.x === x && leaderPos.y === y) {
        toggleLeaderDeployMode();
        return;
    }

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

    // 1-2. 지휘관 스타팅 무료 보급 설치 모드 (v0.25.0 New)
    if (selectedSupplyType && commanderSupplies && commanderSupplies[selectedSupplyType] > 0) {
        // A. 무료 기반 보급
        if (selectedSupplyType === 'base') {
            if (cell.isStart || cell.isGoal) {
                alert("입구 및 출구에는 기반을 건설할 수 없습니다.");
                return;
            }
            if (typeof isSafetyZone === 'function' && isSafetyZone(x, y)) {
                alert("시작 지점 및 골인 지점 인근(보호구역)에는 기반을 건설할 수 없습니다.");
                return;
            }
            if (cell.buildable) {
                alert("이미 기반이 건설된 타일입니다.");
                return;
            }
            if (typeof canBuildBaseAt === 'function' && !canBuildBaseAt(x, y)) {
                alert("⚠️ 몬스터의 이동 경로를 완전히 차단할 수 없습니다! (통로를 남겨주세요)");
                return;
            }

            // 무료 설치 (골드 차감 없음)
            cell.buildable = true;
            builtBaseCount = (builtBaseCount || 0) + 1;
            commanderSupplies.base--;
            if (commanderSupplies.base <= 0) {
                delete commanderSupplies.base;
                selectedSupplyType = null;
                interactionMode = 'none';
            }

            if (typeof recalculateGlobalPath === 'function') recalculateGlobalPath();
            render();
            renderStartingSuppliesUI();
            updateButtonVisuals();
            showFloatingDamage(x, y, "🏗️ 무료 기반 설치!", "#eab308");
            return;
        }
        // B. 무료 타워 보급
        else {
            if (!cell.buildable) {
                alert("타워는 '기반'이 건설된 영역 위에만 설치할 수 있습니다!");
                return;
            }
            if (cell.tower) {
                alert("이미 타워가 배치된 기반입니다!");
                return;
            }

            // 무료 설치 (골드 차감 없음, 환불 누적금 0)
            const towerKey = selectedSupplyType;
            cell.tower = towerKey;
            cell.targeting = 'first';
            cell.inGameLevel = 0;
            cell.investedGold = 0; // 무료 보급 타워는 환불금 0

            commanderSupplies[towerKey]--;
            if (commanderSupplies[towerKey] <= 0) {
                delete commanderSupplies[towerKey];
                selectedSupplyType = null;
                interactionMode = 'none';
                selectedTower = null;
            }

            clearRangePreview();
            render();
            renderStartingSuppliesUI();
            updateButtonVisuals();
            showFloatingDamage(x, y, `🎁 무료 ${TOWER_DATA[towerKey] ? TOWER_DATA[towerKey].name : '타워'} 보급!`, "#38bdf8");
            return;
        }
    }

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

        // 지휘관 타워 권한 검사 (v0.25.1 New)
        const authorized = (typeof getAuthorizedTowerTypes === 'function') ? getAuthorizedTowerTypes() : ['ranged'];
        if (!authorized.includes(selectedTower)) {
            alert("이 타워를 관장하는 지휘관이 출전 덱에 편성되어 있지 않습니다!");
            return;
        }

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
    const passives = typeof getActiveRunePassives === 'function' ? getActiveRunePassives() : {};

    for (const cell of board) {
        if (!cell.tower) continue;

        const towerStats = getGameTowerStats(cell);
        if (!towerStats) continue;

        const range = towerStats.range;
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

        // 데미지 계산: 관통 보너스 및 치명타 판정 (v0.24.0)
        let baseDmg = towerStats.damage * (1 + (passives.bonusDamageRatio || 0));
        let isCrit = false;
        if (passives.critChance > 0 && Math.random() < passives.critChance) {
            isCrit = true;
            baseDmg *= (passives.critMultiplier || 2.0);
        }
        const finalDamage = Math.max(1, Math.round(baseDmg * 10) / 10);

        // 투사체 발사
        const startDom = getDomCell(cell.x, cell.y);
        const targetDom = targetEnemy.element;
        if (startDom && targetDom) {
            createProjectile(startDom, targetDom, isCrit ? "#ef4444" : towerStats.color);
        }

        // 배속에 맞춘 투사체 도달 딜레이
        const hitDelay = Math.max(50, Math.floor(200 / (gameSpeed || 1)));

        setTimeout(() => {
            if (!targetEnemy.alive) return;

            // 1. 얼음 타워 (Ice): 슬로우 효과 부여
            if (cell.tower === 'ice') {
                targetEnemy.hp -= finalDamage;
                applySlowEffect(targetEnemy, towerStats.slowTicks || 10);
                onEnemyHit(targetEnemy, finalDamage, isCrit ? "#ef4444" : "#00e5ff", isCrit);
            }
            // 2. 폭탄 타워 (Bomb): 착탄 지점 3x3 광역 스플래시 데미지
            else if (cell.tower === 'bomb') {
                createSplashEffect(targetEnemy.x, targetEnemy.y);

                const victims = enemies.filter(e => {
                    return e.alive && Math.abs(e.x - targetEnemy.x) <= 1 && Math.abs(e.y - targetEnemy.y) <= 1 && e.moveType !== 'flying';
                });

                for (const victim of victims) {
                    victim.hp -= finalDamage;
                    onEnemyHit(victim, finalDamage, isCrit ? "#ef4444" : "#ff9100", isCrit);
                }
            }
            // 3. 전격 타워 (Shock): 연쇄 번개 피해
            else if (cell.tower === 'shock') {
                targetEnemy.hp -= finalDamage;
                onEnemyHit(targetEnemy, finalDamage, isCrit ? "#ef4444" : "#f59e0b", isCrit);

                const chainTargets = enemies.filter(e => e.alive && e !== targetEnemy && Math.abs(e.x - targetEnemy.x) <= 2 && Math.abs(e.y - targetEnemy.y) <= 2).slice(0, 2);
                for (const chain of chainTargets) {
                    chain.hp -= finalDamage * 0.7;
                    onEnemyHit(chain, finalDamage * 0.7, "#fbbf24");
                }
            }
            // 4. 일반/저격 타워 (Ranged / Melee / Sniper)
            else {
                targetEnemy.hp -= finalDamage;
                onEnemyHit(targetEnemy, finalDamage, isCrit ? "#ef4444" : (towerStats.color || "#ffeb3b"), isCrit);
            }

            // [속성 룬 패시브 추가 발동]
            if (targetEnemy.alive) {
                // A. 작열의 룬 (화상 도트 부여)
                if (passives.burn) {
                    targetEnemy.burnTicks = passives.burnDuration || 3;
                    targetEnemy.burnDmg = Math.max(1, Math.round(finalDamage * (passives.burnRatio || 0.25)));
                }

                // B. 연쇄 전격 룬 발동
                if (passives.chainChance > 0 && Math.random() < passives.chainChance) {
                    triggerRuneChainLightning(targetEnemy, finalDamage * (passives.chainRatio || 0.6), passives.chainCount || 2);
                }

                // C. 시공 붕괴 룬 발동
                if (passives.voidCollapseChance > 0 && Math.random() < passives.voidCollapseChance) {
                    triggerRuneVoidCollapse(targetEnemy, passives.voidCollapseDamage || 35);
                }
            }
        }, hitDelay);
    }

    // v0.32.0 대장 지휘관 직접 요격 전투 루프
    handleLeaderCombat();
}

/**
 * v0.32.0 대장 지휘관 강림/이동 셀 클릭 핸들러
 */
function handleLeaderDeployClick(cell) {
    if (!cell) return;

    // 대장은 타워가 없는 '기반(벽)' 위에만 배치 가능
    if (!cell.buildable || cell.tower) {
        alert("⚠️ 대장은 타워가 배치되지 않은 '기반(벽)' 위에만 강림/이동할 수 있습니다!");
        return;
    }

    // 이미 대장이 해당 자리에 서 있는 경우
    if (leaderDeployed && leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y) {
        isLeaderDeployMode = false;
        render();
        if (typeof updateInGameCommandersBar === 'function') updateInGameCommandersBar();
        return;
    }

    // 이미 배치되어 있는 상태에서 이동하려는 경우 -> 라운드 1회 제한 검사
    if (leaderDeployed && leaderPos) {
        if (leaderRelocatedThisRound) {
            alert("⚠️ 이번 라운드의 대장 전술 이동을 이미 사용했습니다!\n(이동은 라운드당 1회만 가능하며 다음 라운드에 다시 이동할 수 있습니다.)");
            isLeaderDeployMode = false;
            render();
            if (typeof updateInGameCommandersBar === 'function') updateInGameCommandersBar();
            return;
        }
        leaderRelocatedThisRound = true;
    }

    // 대장 배치 완료
    leaderDeployed = true;
    leaderPos = { x: cell.x, y: cell.y };
    isLeaderDeployMode = false;

    // 시각 피드백
    showFloatingDamage(cell.x, cell.y, leaderRelocatedThisRound ? "👑 전술 이동 완료!" : "👑 대장 강림!", "#f59e0b");
    console.log(`대장 지휘관 배치 좌표: (${cell.x}, ${cell.y}), 라운드 이동 사용: ${leaderRelocatedThisRound}`);

    render();
    if (typeof updateInGameCommandersBar === 'function') {
        updateInGameCommandersBar();
    }
}

/**
 * v0.32.0 대장 지휘관 강림/이동 모드 토글
 */
function toggleLeaderDeployMode() {
    const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
    if (!leaderInfo || !leaderInfo.charBase) {
        alert("출전 덱에 편성된 지휘관이 없습니다!");
        return;
    }

    // 이미 배치된 상태에서 이번 라운드 이동을 소모한 경우
    if (leaderDeployed && leaderRelocatedThisRound) {
        alert("⚠️ 이번 라운드의 대장 전술 이동을 이미 사용했습니다!\n(다음 라운드가 시작되면 다시 이동할 수 있습니다.)");
        return;
    }

    // 모드 토글
    isLeaderDeployMode = !isLeaderDeployMode;

    if (isLeaderDeployMode) {
        // 기존 타워/보급 선택 모드 해제
        resetSelection();
        selectedSupplyType = null;
        interactionMode = 'none';
        clearActiveRange();
        hideTowerDetailPanel();
        showFloatingDamage(10, 10, "👑 대장을 배치할 비어있는 기반을 클릭하세요!", "#f59e0b");
    }

    render();
    if (typeof updateInGameCommandersBar === 'function') {
        updateInGameCommandersBar();
    }
}

/**
 * v0.32.0 대장 지휘관 직접 요격 전투 로직 (사거리 2칸 내 자동 공격)
 */
function handleLeaderCombat() {
    if (!leaderDeployed || !leaderPos || !gameRunning || isPaused) return;

    // 공격 쿨다운 처리 (약 0.8초 주기 = 4틱)
    if (leaderAttackCooldown > 0) {
        leaderAttackCooldown--;
        return;
    }

    const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
    if (!leaderInfo || !leaderInfo.charBase) return;

    // 사거리 2칸 내의 살아있는 적 수집
    const range = 2;
    const inRangeEnemies = enemies.filter(e => {
        return e.alive && Math.abs(e.x - leaderPos.x) <= range && Math.abs(e.y - leaderPos.y) <= range;
    });

    if (inRangeEnemies.length === 0) return;

    // 골인 지점에 가장 가까운 선두 적 타깃
    const targetEnemy = inRangeEnemies.slice().sort((a, b) => b.pathIndex - a.pathIndex)[0];
    if (!targetEnemy) return;

    // 대장 등급별 스탯 및 투사체 색상 (R:25, SR:40, UR:65, U:100)
    const gradeDmgMap = { R: 25, SR: 40, UR: 65, U: 100 };
    const gradeColorMap = { R: "#38bdf8", SR: "#c084fc", UR: "#f43f5e", U: "#fbbf24" };
    const baseDamage = gradeDmgMap[leaderInfo.grade] || 25;
    const attackColor = gradeColorMap[leaderInfo.grade] || "#f59e0b";

    // 룬 패시브 추가 데미지 보정 (치명타/추가뎀)
    const passives = typeof getActiveRunePassives === 'function' ? getActiveRunePassives() : {};
    let finalDamage = baseDamage * (1 + (passives.bonusDamageRatio || 0));
    let isCrit = false;
    if (passives.critChance > 0 && Math.random() < passives.critChance) {
        isCrit = true;
        finalDamage *= (passives.critMultiplier || 2.0);
    }
    finalDamage = Math.max(1, Math.round(finalDamage));

    // 투사체 발사 시각 효과
    const startDom = getDomCell(leaderPos.x, leaderPos.y);
    const targetDom = targetEnemy.element;
    if (startDom && targetDom) {
        createProjectile(startDom, targetDom, isCrit ? "#ef4444" : attackColor);
    }

    // 피격 처리
    const hitDelay = Math.max(50, Math.floor(180 / (gameSpeed || 1)));
    setTimeout(() => {
        if (!targetEnemy.alive) return;
        targetEnemy.hp -= finalDamage;
        onEnemyHit(targetEnemy, finalDamage, isCrit ? "#ef4444" : attackColor, isCrit);
    }, hitDelay);

    // 쿨다운 리셋 (4틱 = 0.8초)
    leaderAttackCooldown = 4;
}

/**
 * 룬 속성 효과: 인접 적 연쇄 전격 발동
 */
function triggerRuneChainLightning(sourceEnemy, chainDmg, maxChains = 2) {
    const chainTargets = enemies.filter(e => e.alive && e !== sourceEnemy && Math.abs(e.x - sourceEnemy.x) <= 2 && Math.abs(e.y - sourceEnemy.y) <= 2).slice(0, maxChains);
    for (const chain of chainTargets) {
        chain.hp -= chainDmg;
        onEnemyHit(chain, chainDmg, "#38bdf8");
    }
}

/**
 * 룬 속성 효과: 시공 붕괴 광역 왜곡 폭발
 */
function triggerRuneVoidCollapse(sourceEnemy, collapseDmg = 35) {
    createSplashEffect(sourceEnemy.x, sourceEnemy.y);
    showFloatingDamage(sourceEnemy.x, sourceEnemy.y, "🌌 시공 붕괴!", "#a855f7");

    const victims = enemies.filter(e => e.alive && Math.abs(e.x - sourceEnemy.x) <= 1 && Math.abs(e.y - sourceEnemy.y) <= 1);
    for (const victim of victims) {
        victim.hp -= collapseDmg;
        onEnemyHit(victim, collapseDmg, "#c084fc");
    }
}

/**
 * 단일 적 피격 후 체력바 갱신, 플로팅 텍스트 팝업 및 사망 처리
 */
function onEnemyHit(enemy, damage, color = "#ffeb3b", isCrit = false) {
    // 플로팅 데미지 텍스트 생성
    if (typeof damage === 'number' || typeof damage === 'string') {
        showFloatingDamage(enemy.x, enemy.y, damage, color, isCrit);
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

        // 4. 황금 약탈 패시브 룬 발동 (v0.24.0 New)
        const passives = typeof getActiveRunePassives === 'function' ? getActiveRunePassives() : {};
        if (passives.plunderChance > 0 && Math.random() < passives.plunderChance) {
            const loot = passives.plunderGold || 2;
            gold += loot;
            showFloatingDamage(enemy.x, enemy.y, `🪙 +${loot} TP 약탈!`, "#f59e0b");
        }

        if (typeof render === "function") render();
    }
}

/**
 * 피격 시 플로팅 데미지 텍스트 팝업 (Phase C: Juice Effect & v0.24.0)
 */
function showFloatingDamage(gridX, gridY, damage, color = "#ffeb3b", isCrit = false) {
    const boardDom = document.getElementById("game-board");
    if (!boardDom) return;

    const el = document.createElement("div");
    el.className = "floating-damage";
    
    if (typeof damage === 'number') {
        const val = Math.round(damage * 10) / 10;
        el.innerText = isCrit ? `💥 CRIT! -${val}` : `-${val}`;
    } else {
        el.innerText = damage;
    }
    
    el.style.color = color;
    if (isCrit) {
        el.style.fontSize = "14px";
        el.style.fontWeight = "900";
        el.style.textShadow = "0 0 8px rgba(239, 68, 68, 0.8)";
        el.style.zIndex = "100";
    }

    // 약간의 랜덤 오프셋
    const randomOffsetX = Math.floor(Math.random() * 12) - 6;
    el.style.left = `${gridX * 30 + 10 + randomOffsetX}px`;
    el.style.top = `${gridY * 30 + 2}px`;

    boardDom.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 600);
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

    const shardEl = document.getElementById("detail-tower-shard");
    if (shardEl) {
        if (stats.shardImage) {
            shardEl.src = stats.shardImage;
            shardEl.style.display = "block";
            shardEl.title = `${stats.name} 속성 크리스탈`;
        } else {
            shardEl.style.display = "none";
        }
    }

    if (statsEl) {
        const dmgText = Math.round(stats.damage * 10) / 10;
        let specialDesc = "";
        if (cell.tower === 'ice') specialDesc = "<br>❄️ 효과: 50% 슬로우";
        if (cell.tower === 'bomb') specialDesc = "<br>💣 효과: 3x3 범위 폭발";
        if (cell.tower === 'shock') specialDesc = "<br>⚡ 효과: 3기 연쇄 번개";
        if (cell.tower === 'sniper') specialDesc = "<br>🎯 효과: 초장거리 단일 정밀 저격";

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

/**
 * -------------------------------------------------------------
 * 인게임 액티브 스펠 룬 발동 시스템 (v0.23.0 New)
 * -------------------------------------------------------------
 */

let usedSpellRunes = {}; // 1회용 궁극기 사용 여부 기록

/**
 * 인게임 액티브 스펠 UI 갱신
 */
function renderInGameSpells() {
    const container = document.getElementById("spell-controls");
    if (!container) return;

    if (typeof getEquippedSpellRunes !== 'function') return;
    const spells = getEquippedSpellRunes();

    if (spells.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #94a3b8; padding: 4px 0;">출전 지휘관에 장착된 스펠이 없습니다.</div>`;
        return;
    }

    container.innerHTML = "";

    spells.forEach(item => {
        const rInfo = item.runeInfo;
        const btn = document.createElement("button");
        btn.className = "btn-spell-action";

        const isUsedSingle = (rInfo.usageType === 'single') && usedSpellRunes[item.runeId];
        const notEnoughMp = (mp || 0) < rInfo.mpCost;
        const isDisabled = isUsedSingle || notEnoughMp;

        let statusText = `💧 ${rInfo.mpCost} MP`;
        if (isUsedSingle) statusText = "🔒 사용 완료";

        btn.disabled = isDisabled;
        btn.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>${rInfo.icon || '🔮'} <strong>${rInfo.name}</strong></span>
                <span style="font-size: 10px; color:${isDisabled ? '#94a3b8' : '#38bdf8'}; font-weight:bold;">${statusText}</span>
            </div>
            <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">${rInfo.desc}</div>
        `;

        btn.onclick = () => castSpellRune(item);
        container.appendChild(btn);
    });
}

/**
 * 인게임 지휘관 스펠 발동 '대각선 컷인' 연출 (v0.28.0 New)
 */
let cutinTimer = null;
function triggerSpellCutin(charId, runeInfo) {
    const overlay = document.getElementById("spell-cutin-overlay");
    const charImg = document.getElementById("cutin-char-img");
    const nameEl = document.getElementById("cutin-commander-name");
    const skillEl = document.getElementById("cutin-skill-name");
    const quoteEl = document.getElementById("cutin-skill-quote");
    const stripe = document.getElementById("spell-cutin-stripe");

    if (!overlay || !stripe) return;

    // 지휘관 정보 찾기 (지정 지휘관 -> 출전 덱 1번 지휘관 fallback)
    let commanderId = charId;
    if (!commanderId || (typeof CHARACTER_DATA !== 'undefined' && !CHARACTER_DATA[commanderId])) {
        if (typeof USER_DATA !== 'undefined' && USER_DATA.characterDeck && USER_DATA.characterDeck.length > 0) {
            commanderId = USER_DATA.characterDeck[0];
        }
    }

    const charBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[commanderId] : null;
    const charName = charBase ? charBase.name : "미소녀 지휘관";
    const charImage = (charBase && charBase.image) ? charBase.image : "assets/char_liana.jpg";
    const skillQuote = (charBase && charBase.skillQuote) ? charBase.skillQuote : `"${runeInfo.name} 발동!"`;

    if (charImg) charImg.src = charImage;
    if (nameEl) nameEl.textContent = `👑 [${(charBase && charBase.title) || '지휘관'}] ${charName}`;
    if (skillEl) skillEl.textContent = `${runeInfo.icon || '✨'} ${runeInfo.name}`;
    if (quoteEl) quoteEl.textContent = `"${skillQuote}"`;

    // 애니메이션 리셋 및 발동
    overlay.style.display = "flex";
    stripe.style.animation = "none";
    void stripe.offsetWidth; // reflow
    stripe.style.animation = "cutinSlide 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards";

    if (cutinTimer) clearTimeout(cutinTimer);
    cutinTimer = setTimeout(() => {
        overlay.style.display = "none";
        cutinTimer = null;
    }, 850);
}

/**
 * 스펠 룬 발동 실행
 */
function castSpellRune(spellItem) {
    const rInfo = spellItem.runeInfo;
    const runeId = spellItem.runeId;

    if ((mp || 0) < rInfo.mpCost) {
        alert("마나(MP)가 부족합니다!");
        return;
    }

    if (rInfo.usageType === 'single' && usedSpellRunes[runeId]) {
        alert("이 궁극기 스펠은 전투당 1회만 사용할 수 있습니다!");
        return;
    }

    // 마나 차감
    mp -= rInfo.mpCost;

    if (rInfo.usageType === 'single') {
        usedSpellRunes[runeId] = true;
    }

    // v0.28.0: 대각선 지휘관 스펠 컷인 연출 발동
    triggerSpellCutin(spellItem.charId, rInfo);

    // 스펠 고유 효과 실행
    if (runeId === 'rune_spell_gold') {
        // 1. 긴급 보급: +8 TP
        gold += (rInfo.effectValue || 8);
        showFloatingDamage(10, 10, `+${rInfo.effectValue || 8} TP 보급!`, "#eab308");
    } else if (runeId === 'rune_spell_gust') {
        // 2. 돌풍의 결계: 모든 살아있는 적 4초간 40% 감속
        for (const enemy of enemies) {
            if (enemy.alive && typeof applySlowEffect === 'function') {
                applySlowEffect(enemy, 20); // 4초 상당
            }
        }
        showFloatingDamage(10, 10, "🌪️ 돌풍의 결계 발동!", "#06b6d4");
    } else if (runeId === 'rune_spell_thunder') {
        // 3. 천벌의 낙뢰: 전장의 모든 적에게 15 피해
        let hitCount = 0;
        for (const enemy of enemies) {
            if (enemy.alive) {
                enemy.hp -= (rInfo.damage || 15);
                onEnemyHit(enemy, rInfo.damage || 15, "#eab308");
                hitCount++;
            }
        }
        showFloatingDamage(10, 10, `⚡ 천벌의 낙뢰 (${hitCount}기 타격)!`, "#f59e0b");
    } else if (runeId === 'rune_spell_teleport') {
        // 4. 시공의 왜곡 (궁극기): 모든 적을 스폰 입구로 강제 송환
        for (const enemy of enemies) {
            if (enemy.alive) {
                enemy.x = startPos.x;
                enemy.y = startPos.y;
                if (typeof updateEnemyPosition === 'function') {
                    updateEnemyPosition(enemy);
                }
            }
        }
        showFloatingDamage(10, 10, "🌀 시공의 왜곡: 전원 강제 송환!", "#a855f7");
    } else if (runeId === 'rune_spell_frenzy') {
        // 5. 성스러운 축복 (UR): 6초간 아군 타워 공격속도 폭주 & 연속 사격
        showFloatingDamage(10, 10, "✨ 성스러운 축복: 전 타워 폭주 사격!", "#eab308");
        attackFromTowers();
        const frenzyInterval = setInterval(() => {
            if (typeof gameRunning !== 'undefined' && gameRunning && !isPaused) {
                attackFromTowers();
            }
        }, 600);
        setTimeout(() => {
            clearInterval(frenzyInterval);
        }, (rInfo.durationSec || 6) * 1000);
    } else if (runeId === 'rune_spell_armageddon') {
        // 6. 아마겟돈 (U): 전 필드 거대 메테오 낙하 60 파멸 피해
        let meteorHits = 0;
        for (const enemy of enemies) {
            if (enemy.alive) {
                enemy.hp -= (rInfo.damage || 60);
                onEnemyHit(enemy, rInfo.damage || 60, "#ef4444", true);
                meteorHits++;
            }
        }
        showFloatingDamage(10, 10, `☄️ 아마겟돈 파멸 폭격! (${meteorHits}기 강타)`, "#dc2626");
    }

    render();
    renderInGameSpells();
}

/**
 * 지휘관 스타팅 무료 보급 인벤토리 UI 렌더링 (v0.25.0 New)
 */
function renderStartingSuppliesUI() {
    const section = document.getElementById("starting-supplies-section");
    const container = document.getElementById("starting-supplies-controls");
    if (!section || !container) return;

    if (!commanderSupplies || typeof commanderSupplies !== 'object') {
        section.style.display = "none";
        return;
    }

    // 남아있는 보급품 항목 필터링
    const activeKeys = Object.keys(commanderSupplies).filter(k => commanderSupplies[k] > 0);
    if (activeKeys.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    container.innerHTML = "";

    activeKeys.forEach(key => {
        const count = commanderSupplies[key];
        const btn = document.createElement("button");
        btn.className = "speed-btn";
        btn.style.flex = "1 1 calc(50% - 6px)";
        btn.style.fontSize = "11px";
        btn.style.padding = "6px 8px";
        btn.style.textAlign = "center";
        btn.style.border = (selectedSupplyType === key) ? "2px solid #eab308" : "1px solid #facc15";
        btn.style.background = (selectedSupplyType === key) ? "#fef08a" : "#ffffff";
        btn.style.fontWeight = "bold";

        if (key === 'base') {
            btn.innerHTML = `🏗️ <strong>무료 기반</strong> (${count}개)`;
        } else {
            const tInfo = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[key]) ? TOWER_DATA[key] : null;
            const name = tInfo ? tInfo.name : key;
            const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[key]) ? TOWER_EMBLEMS[key] : '🏹';
            btn.innerHTML = `${emblem} <strong>${name}</strong> (${count}기)`;
        }

        btn.onclick = () => selectStartingSupply(key);
        container.appendChild(btn);
    });
}

/**
 * 스타팅 보급품 선택 토글
 */
function selectStartingSupply(type) {
    if (selectedSupplyType === type) {
        selectedSupplyType = null;
        interactionMode = 'none';
        selectedTower = null;
    } else {
        selectedSupplyType = type;
        if (type === 'base') {
            interactionMode = 'base';
            selectedTower = null;
        } else {
            interactionMode = 'build';
            selectedTower = type;
        }
    }
    renderStartingSuppliesUI();
    if (typeof updateButtonVisuals === 'function') updateButtonVisuals();
}

