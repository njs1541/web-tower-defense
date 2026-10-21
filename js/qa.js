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
    if (typeof TOWER_DATA !== 'undefined') {
        Object.keys(TOWER_DATA).forEach(addCard);
    }
    alert("모든 카드 및 1000G가 지급되었습니다!");
    location.reload();
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
