const gameBoard = document.getElementById("game-board");
const roundDisplay = document.getElementById("round");
const hpDisplay = document.getElementById("hp");
const goldDisplay = document.getElementById("gold");
const monsterCountDisplay = document.getElementById("monster-count");
const towerPanel = document.querySelector("#info-panel div");

function render() {
    for (const cell of board) {
        const dom = getDomCell(cell.x, cell.y);
        if (!dom) continue;

        // 기존 사거리 하이라이트 여부 임시 보관
        const isRangePreview = dom.classList.contains("range-preview");
        const isRangeActive = dom.classList.contains("range-active");

        dom.className = "cell";
        dom.innerText = ""; // 내부 텍스트 초기화

        // 시작점 및 골인점 마킹
        if (cell.isStart) {
            dom.classList.add("start-tile");
            dom.innerText = "🚩";
        } else if (cell.isGoal) {
            dom.classList.add("goal-tile");
            dom.innerText = "🏰";
        }

        // 경로 및 기반 상태
        if (cell.path && !cell.buildable && !cell.isStart && !cell.isGoal) {
            dom.classList.add("path");
        }
        if (cell.buildable) {
            dom.classList.add("buildable");
        }

        // 타워 설치 상태
        if (cell.tower) {
            dom.classList.add(cell.tower);
            const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[cell.tower]) ? TOWER_EMBLEMS[cell.tower] : "🏰";
            dom.innerText = emblem;
        }

        if (selectedBoardTower && selectedBoardTower.x === cell.x && selectedBoardTower.y === cell.y) {
            dom.classList.add("selected-tower");
        }
        if (isRangePreview) dom.classList.add("range-preview");
        if (isRangeActive) dom.classList.add("range-active");
    }

    roundDisplay.innerText = round;
    hpDisplay.innerText = playerHP;
    goldDisplay.innerText = gold;

    const mpDisplay = document.getElementById("mp-count");
    if (mpDisplay) {
        mpDisplay.innerText = Math.floor(mp || 0);
    }

    // 몬스터 수 표시 갱신
    const aliveCount = enemies.filter(e => e.alive).length;
    monsterCountDisplay.innerText = `${aliveCount} / ${totalEnemies}`;

    // 인게임 스펠 버튼 상태 갱신
    if (typeof renderInGameSpells === 'function') {
        renderInGameSpells();
    }
}

/**
 * 배속 및 일시정지 버튼 UI 갱신
 */
function updateSpeedUI() {
    const btnPause = document.getElementById("btn-pause");
    const btnSpeed1 = document.getElementById("btn-speed-1");
    const btnSpeed2 = document.getElementById("btn-speed-2");

    if (btnPause) {
        if (isPaused) {
            btnPause.classList.add("active");
            btnPause.innerText = "▶ 재개";
        } else {
            btnPause.classList.remove("active");
            btnPause.innerText = "⏸️ 일시정지";
        }
    }

    if (btnSpeed1) {
        btnSpeed1.classList.toggle("active", !isPaused && gameSpeed === 1);
    }
    if (btnSpeed2) {
        btnSpeed2.classList.toggle("active", !isPaused && gameSpeed === 2);
    }
}

// 스페이스바(일시정지 토글) 단축키
document.addEventListener("keydown", (e) => {
    // 인풋 태그 입력 중이거나 게임 화면이 아닐 때는 무시
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const gameScreen = document.getElementById("game-screen");
    if (!gameScreen || gameScreen.style.display === "none") return;

    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }
});

function updateButtonVisuals() {
    // 기반 건설 버튼 시각화 및 실시간 비용 표기
    const btnUnlock = document.getElementById("btn-unlock");
    if (btnUnlock) {
        const cost = (typeof getBaseBuildCost === 'function') ? getBaseBuildCost() : 1;
        btnUnlock.innerText = `🏗️ 기반 건설 (${cost}G)`;
        btnUnlock.title = `기반(벽)을 건설합니다. 5개 건설할 때마다 비용이 1G 증가하며 환불할 수 없습니다. (현재 건설된 기반: ${builtBaseCount || 0}개)`;

        if (interactionMode === 'base' || interactionMode === 'unlock') {
            btnUnlock.classList.add("selected");
        } else {
            btnUnlock.classList.remove("selected");
        }
    }

    // 타워 버튼 시각화
    const container = document.getElementById("tower-controls");
    if (!container) return;

    const buttons = Array.from(container.getElementsByTagName("button"));
    buttons.forEach(btn => {
        const tId = btn.dataset.towerId;
        if (interactionMode === 'build' && tId && tId === selectedTower) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });
}

function updateTowerButtons() {
    const container = document.getElementById("tower-controls");
    if (!container) return;

    container.innerHTML = ""; // 버튼 초기화

    // 출전 지휘관 카드들에 등록/관장된 타워 목록(라이선스) 조회 (v0.25.1 New)
    const authorizedTowers = (typeof getAuthorizedTowerTypes === 'function') 
        ? getAuthorizedTowerTypes() 
        : ['ranged'];

    if (authorizedTowers.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #ef4444; padding: 6px; text-align: center; border: 1px dashed #fca5a5; border-radius: 6px;">출전한 지휘관이 관장하는 타워가 없습니다.<br>(지휘관 덱을 편성해주세요)</div>`;
        return;
    }

    authorizedTowers.forEach(towerId => {
        const stats = TOWER_DATA[towerId];
        if (!stats) return;

        const btn = document.createElement("button");
        btn.dataset.towerId = towerId; // 식별자
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "space-between";
        btn.style.width = "100%";
        btn.style.marginBottom = "4px";

        // 속성 크리스탈 미니 뱃지 (v0.28.0 New)
        const shardThumb = stats.shardImage 
            ? `<img src="${stats.shardImage}" style="width: 18px; height: 18px; border-radius: 4px; object-fit: cover; margin-right: 6px; border: 1px solid rgba(0,0,0,0.15);">` 
            : '';

        btn.innerHTML = `
            <span style="display: flex; align-items: center;">${shardThumb}<strong>${stats.name}</strong></span>
            <span style="font-size: 11px; opacity: 0.85;">${stats.cost}G</span>
        `;

        // 이벤트 바인딩
        btn.onclick = (e) => {
            e.stopPropagation(); // 상위 요소 클릭 방지
            selectTower(towerId);
        };

        container.appendChild(btn);
    });

    updateButtonVisuals();
    updateInGameCommandersBar();
}

/**
 * 인게임 출전 지휘관 상주 바 UI 갱신 (v0.28.0 New)
 */
function updateInGameCommandersBar() {
    const bar = document.getElementById("in-game-commanders-bar");
    if (!bar || typeof USER_DATA === 'undefined' || typeof CHARACTER_DATA === 'undefined') return;

    const deckIds = USER_DATA.characterDeck || [];
    if (deckIds.length === 0) {
        bar.innerHTML = `<span style="font-size: 11px; color: #94a3b8; padding: 4px;">출전 중인 지휘관이 없습니다.</span>`;
        return;
    }

    bar.innerHTML = "";

    deckIds.forEach(charId => {
        const charBase = CHARACTER_DATA[charId];
        if (!charBase) return;

        const gradeInfo = CARD_GRADES[charBase.grade] || { name: charBase.grade, color: "#3b82f6", border: "#3b82f6" };
        const chip = document.createElement("div");
        chip.className = "ingame-commander-chip";
        chip.style.borderColor = gradeInfo.border || gradeInfo.color;
        chip.title = `${charBase.name} (${charBase.title})\n클릭하여 지휘관 대사 감상`;

        chip.innerHTML = `
            <img src="${charBase.image || ''}" alt="${charBase.name}" class="ingame-chip-avatar" style="border-color:${gradeInfo.color};">
            <div class="ingame-chip-info">
                <span class="ingame-chip-name">${charBase.name}</span>
                <span class="ingame-chip-title" style="color:${gradeInfo.color}; font-weight:bold;">${gradeInfo.name}</span>
            </div>
        `;

        // 클릭 시 말풍선 또는 효과 플로팅
        chip.onclick = () => {
            const quotes = charBase.quotes || [charBase.desc || "출격 준비 완료!"];
            const q = quotes[Math.floor(Math.random() * quotes.length)];
            if (typeof showFloatingDamage === 'function') {
                showFloatingDamage(10, 10, `💬 ${charBase.name}: "${q}"`, gradeInfo.color);
            }
        };

        bar.appendChild(chip);
    });
}
