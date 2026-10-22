/**
 * 게임 메인 진입점 모듈 (js/main.js)
 * 오프닝(OP) 화면 제어, 로비 진입, 게임 세션 시작 및 종료를 전담합니다.
 */

// OP 화면 진행 중 중복 클릭 방지 플래그
let isOpTransitioning = false;

function init() {
    loadData();
    updateLobbyUI();

    // 정적 버튼(기반 건설) 이벤트 바인딩
    const btnUnlock = document.getElementById("btn-unlock");
    if (btnUnlock) {
        btnUnlock.onclick = (e) => {
            e.stopPropagation();
            if (typeof selectBaseBuildMode === 'function') {
                selectBaseBuildMode();
            } else {
                selectUnlockMode();
            }
        };
    }

    // 아무 키나 눌러도 OP 화면에서 게임(로비)으로 진입할 수 있도록 키 이벤트 등록
    window.addEventListener("keydown", (e) => {
        const opScreen = document.getElementById("op-screen");
        if (opScreen && opScreen.style.display !== "none" && !isOpTransitioning) {
            enterGameFromOp();
        }
    });
}

/**
 * OP (오프닝 타이틀) 화면에서 메인 화면(로비)으로 전환
 */
function enterGameFromOp() {
    if (isOpTransitioning) return;
    isOpTransitioning = true;

    const opScreen = document.getElementById("op-screen");
    const lobbyScreen = document.getElementById("lobby-screen");

    if (!opScreen) return;

    // 부드러운 페이드아웃 효과 적용
    opScreen.classList.add("op-fade-out");

    setTimeout(() => {
        opScreen.style.display = "none";
        opScreen.classList.remove("op-fade-out");
        if (lobbyScreen) {
            lobbyScreen.style.display = "block";
            // 로비 UI 최신 상태 갱신
            updateLobbyUI();
        }
        isOpTransitioning = false;
    }, 550);
}

/**
 * 로비 화면에서 다시 OP (타이틀) 화면으로 복귀
 */
function returnToOpScreen() {
    const opScreen = document.getElementById("op-screen");
    const lobbyScreen = document.getElementById("lobby-screen");

    if (lobbyScreen) lobbyScreen.style.display = "none";
    if (opScreen) {
        opScreen.style.display = "flex";
        opScreen.classList.remove("op-fade-out");
    }
}

function startGame() {
    document.getElementById("lobby-screen").style.display = "none";
    const gameScreen = document.getElementById("game-screen");
    if (gameScreen) {
        gameScreen.style.display = "flex";
        gameScreen.style.justifyContent = "center";
        gameScreen.style.alignItems = "center";
    }

    // 1. 연구소 특성 보너스 적용 (Phase D)
    const bonusHp = ((USER_DATA.talents && USER_DATA.talents.maxHp) || 0) * 2;
    const bonusGold = ((USER_DATA.talents && USER_DATA.talents.startGold) || 0) * 3;
    playerHP = 10 + bonusHp;
    gold = 10 + bonusGold;
    builtBaseCount = 0;

    // 2. v0.22.0 지휘관 덱 타워 한도 및 MP 초기화
    if (typeof calculateDeckTowerCaps === 'function') {
        deckTowerCaps = calculateDeckTowerCaps();
        console.log("출전 지휘관 덱 타워 강화 한도 적용 완료:", deckTowerCaps);
    }
    mp = 0;
    maxMp = 100;
    if (typeof usedSpellRunes !== 'undefined') {
        usedSpellRunes = {};
    }

    // 3. v0.25.0 지휘관 스타팅 무료 보급 타워/기반 초기화
    if (typeof calculateDeckStartingSupplies === 'function') {
        commanderSupplies = calculateDeckStartingSupplies();
        selectedSupplyType = null;
        console.log("출전 지휘관 스타팅 무료 보급 수령 완료:", commanderSupplies);
    }

    // 4. 스테이지 테마 및 보드 배경 적용 (Phase D)
    const stage = (typeof STAGE_DATA !== 'undefined' && STAGE_DATA[currentStage]) ? STAGE_DATA[currentStage] : { boardBg: "#94a3b8" };
    const boardEl = document.getElementById("game-board");
    if (boardEl) boardEl.style.backgroundColor = stage.boardBg;

    generateBoard();
    if (typeof recalculateGlobalPath === 'function') {
        recalculateGlobalPath();
    }
    render();
    updateTowerButtons();
    if (typeof updateButtonVisuals === 'function') {
        updateButtonVisuals();
    }
    if (typeof renderStartingSuppliesUI === 'function') {
        renderStartingSuppliesUI();
    }
}

function endGame() {
    // 인터벌 명확하게 해제
    if (window.gameInterval) clearInterval(window.gameInterval);
    if (window.spawnInterval) clearInterval(window.spawnInterval);
    if (gameInterval) clearInterval(gameInterval);
    if (spawnInterval) clearInterval(spawnInterval);

    gameRunning = false;

    // 스테이지별 보상 배율 적용 (Phase D)
    const stage = (typeof STAGE_DATA !== 'undefined' && STAGE_DATA[currentStage]) ? STAGE_DATA[currentStage] : { rewardMulti: 1.0 };
    const baseReward = 100 + (round * 10);
    const reward = Math.floor(baseReward * (stage.rewardMulti || 1.0));

    alert(`게임 오버! 보상으로 ${reward} 골드를 획득했습니다! (스테이지 보너스 x${stage.rewardMulti || 1.0})`);

    addUserGold(reward);

    // 저장 및 리로드
    location.reload();
}

// 초기화 호출
init();
