/**
 * QA 및 디버그 시스템 모듈 (js/qa.js)
 * 게임 테스트, 디버깅, 수치 조작, 세이브 리셋 기능을 전담합니다.
 */

// 골드 조작
function qaSetGold() {
    const input = document.getElementById('qa-gold');
    if (input) {
        const val = parseInt(input.value);
        if (!isNaN(val)) {
            gold = val;
            render();
        }
    }
}

// 라운드 조작
function qaSetRound() {
    const input = document.getElementById('qa-round');
    if (input) {
        const val = parseInt(input.value);
        if (!isNaN(val) && val > 0) {
            round = val;
            // [v0.44.0] 라운드 변경 시 다음 웨이브 예고 재생성
            if (typeof ensureWavePlan === 'function' && !gameRunning) ensureWavePlan();
            render();
        }
    }
}

// 인게임 라운드 초기화 (새로고침)
function qaResetGame() {
    if (confirm("게임을 초기화하시겠습니까?")) {
        location.reload();
    }
}

// 모든 카드 해금 및 1000G 지급 치트
function qaGrantAllCheat() {
    addUserGold(1000);
    USER_DATA.pp = (USER_DATA.pp || 0) + 10;
    USER_DATA.rp = (USER_DATA.rp || 0) + 50;

    if (typeof TOWER_DATA !== 'undefined') {
        Object.keys(TOWER_DATA).forEach(addCard);
    }
    if (typeof CHARACTER_DATA !== 'undefined') {
        Object.keys(CHARACTER_DATA).forEach(addCharacter);
    }
    if (typeof RUNE_DATA !== 'undefined') {
        Object.keys(RUNE_DATA).forEach(addRune);
    }

    saveData();
    alert("모든 타워 카드, 지휘관 6종(C~U), 룬 12종 및 1000 TP, 10 PP, 50 RP가 지급되었습니다!");
    location.reload();
}

// PP (프리즘 포인트) 지급
function qaAddPP(amount = 5) {
    USER_DATA.pp = (USER_DATA.pp || 0) + amount;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    alert(`💎 프리즘 포인트 (PP) +${amount}개 지급! (현재: ${USER_DATA.pp}개)`);
}

// RP (룬 포인트) 지급
function qaAddRP(amount = 20) {
    USER_DATA.rp = (USER_DATA.rp || 0) + amount;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    alert(`🔮 룬 포인트 (RP) +${amount}개 지급! (현재: ${USER_DATA.rp}개)`);
}

/**
 * [v0.44.0] 테스트용 U등급 지휘관 '티타니아' 지급 치트
 * - 기존 loadData()의 매 로드 강제 지급을 제거하고 QA 패널(Ctrl+J)로 이전
 * - ★5 / 소켓 4 + 시공 붕괴 룬 & 아마겟돈 룬 각 1개 지급 후 장착, 1번 슬롯(대장) 편성
 */
function qaGrantTitania() {
    if (!USER_DATA.characters) USER_DATA.characters = {};
    if (!USER_DATA.runes) USER_DATA.runes = [];

    // 전용 룬 2종 지급 (장착 분량 확보)
    USER_DATA.runes.push("rune_void_collapse", "rune_spell_armageddon");

    const existing = USER_DATA.characters.char_titania;
    const prevRunes = (existing && Array.isArray(existing.equippedRunes)) ? existing.equippedRunes : [];
    USER_DATA.characters.char_titania = {
        id: "char_titania",
        star: 5,
        starExp: 0,
        sockets: 4,
        equippedRunes: ["rune_void_collapse", "rune_spell_armageddon", prevRunes[2] || null, prevRunes[3] || null]
    };

    // 1번 슬롯(대장) 편성 (최대 3인 유지)
    if (!Array.isArray(USER_DATA.characterDeck)) USER_DATA.characterDeck = [];
    USER_DATA.characterDeck = ["char_titania", ...USER_DATA.characterDeck.filter(id => id !== "char_titania")].slice(0, 3);

    if (typeof sanitizeRuneEquips === 'function') sanitizeRuneEquips();
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    alert("🌿 [QA] U등급 티타니아(★5)가 지급되어 대장으로 편성되었습니다! (시공 붕괴 · 아마겟돈 룬 장착)");
}

// 인게임 MP (마나) 100% 충전
function qaFillMP() {
    mp = maxMp || 100;
    if (typeof render === 'function') render();
    console.log("⚡ 마나(MP) 100 충전 완료");
}

// QA 패널 입력 필드 현재 값 동기화
function initQAPanel() {
    const goldInput = document.getElementById('qa-gold');
    const roundInput = document.getElementById('qa-round');
    if (goldInput && typeof gold !== 'undefined') goldInput.value = gold;
    if (roundInput && typeof round !== 'undefined') roundInput.value = round;
    initQaCardButtons();
}

// QA 패널에 카드별 리셋 버튼 동적 생성
function initQaCardButtons() {
    const list = document.getElementById("qa-card-list");
    if (!list || typeof TOWER_DATA === 'undefined') return;

    list.innerHTML = "";
    Object.keys(TOWER_DATA).forEach(id => {
        const btn = document.createElement("button");
        btn.innerText = `Reset ${TOWER_DATA[id].name}`;
        btn.style.fontSize = "10px";
        btn.style.margin = "2px";
        btn.onclick = () => {
            if (confirm(`${TOWER_DATA[id].name} 데이터를 초기화하시겠습니까?`)) {
                resetCardData(id);
                alert("초기화되었습니다. 로비를 새로고침합니다.");
                location.reload();
            }
        };
        list.appendChild(btn);
    });
}

// Ctrl + J 단축키로 QA 패널 토글
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        const panel = document.getElementById('qa-panel');
        if (panel) {
            const isHidden = (panel.style.display === 'none' || panel.style.display === '');
            panel.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                initQAPanel();
            }
        }
    }
});

// 초기 로드 시 버튼 바인딩 준비
window.addEventListener("DOMContentLoaded", () => {
    setTimeout(initQaCardButtons, 300);
});
