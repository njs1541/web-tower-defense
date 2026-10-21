function init() {
    loadData();
    updateLobbyUI();

    // 정적 버튼(타일 해제) 이벤트 바인딩은 여기서 1회 수행
    const btnUnlock = document.getElementById("btn-unlock");
    if (btnUnlock) {
        btnUnlock.onclick = (e) => {
            e.stopPropagation();
            selectUnlockMode();
        };
    }
}

function startGame() {
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    // 1. 연구소 특성 보너스 적용 (Phase D)
    const bonusHp = ((USER_DATA.talents && USER_DATA.talents.maxHp) || 0) * 2;
    const bonusGold = ((USER_DATA.talents && USER_DATA.talents.startGold) || 0) * 3;
    playerHP = 10 + bonusHp;
    gold = 10 + bonusGold;

    // 2. 스테이지 테마 및 보드 배경 적용 (Phase D)
    const stage = (typeof STAGE_DATA !== 'undefined' && STAGE_DATA[currentStage]) ? STAGE_DATA[currentStage] : { boardBg: "#94a3b8" };
    const boardEl = document.getElementById("game-board");
    if (boardEl) boardEl.style.backgroundColor = stage.boardBg;

    generateBoard();
    generateEnemyPath();
    render();
    updateTowerButtons();
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
