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
        if (cell.path) dom.classList.add("path");
        if (cell.buildable) dom.classList.add("buildable");
        if (cell.tower) dom.classList.add(cell.tower);
        if (selectedBoardTower && selectedBoardTower.x === cell.x && selectedBoardTower.y === cell.y) {
            dom.classList.add("selected-tower");
        }
        if (isRangePreview) dom.classList.add("range-preview");
        if (isRangeActive) dom.classList.add("range-active");
    }

    roundDisplay.innerText = round;
    hpDisplay.innerText = playerHP;
    goldDisplay.innerText = gold;

    // 몬스터 수 표시 갱신
    const aliveCount = enemies.filter(e => e.alive).length;
    monsterCountDisplay.innerText = `${aliveCount} / ${totalEnemies}`;
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
    // 타일 해제 버튼 시각화
    const btnUnlock = document.getElementById("btn-unlock");
    if (btnUnlock) {
        if (interactionMode === 'unlock') {
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
        // dataset의 towerId와 현재 선택된 towerId가 일치하는지 확인
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

    // 출전 덱(Deck) 기반 버튼 생성 (Phase D)
    const activeDeck = (typeof USER_DATA !== 'undefined' && USER_DATA.deck && USER_DATA.deck.length > 0)
        ? USER_DATA.deck
        : ((typeof USER_DATA !== 'undefined' && USER_DATA.inventory) ? USER_DATA.inventory : []);

    activeDeck.forEach(towerId => {
        const stats = TOWER_DATA[towerId];
        if (!stats) return;

        const btn = document.createElement("button");
        btn.textContent = `${stats.name} (${stats.cost}G)`;
        btn.dataset.towerId = towerId; // 식별자

        // 이벤트 바인딩
        btn.onclick = (e) => {
            e.stopPropagation(); // 상위 요소 클릭 방지
            selectTower(towerId);
        };

        container.appendChild(btn);
    });

    updateButtonVisuals();
}
