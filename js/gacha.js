/**
 * 상점 및 가챠 소환 전담 모듈 (js/gacha.js)
 * v0.23.0: 1) 미소녀 지휘관 소환(1 PP), 2) 신비한 룬 소환(5 RP), 3) 타워&조각 소환(100 TP)
 */

let lastGachaType = 'tower'; // 'tower', 'commander', 'rune'

/**
 * 상점 UI 열기/닫기 토글
 */
function toggleShop() {
    const shop = document.getElementById("shop-ui");
    if (!shop) return;
    shop.style.display = (shop.style.display === "none" || shop.style.display === "") ? "block" : "none";
}

/**
 * 1. 기존 타워 & 조각 소환 (100 TP/골드 소모)
 */
function drawGacha() {
    lastGachaType = 'tower';
    const cost = 100;
    if (USER_DATA.gold < cost) {
        alert("타워 포인트(골드)가 부족합니다! (필요: 100)");
        return;
    }

    USER_DATA.gold -= cost;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    const towerKeys = Object.keys(TOWER_DATA);
    const randomKey = towerKeys[Math.floor(Math.random() * towerKeys.length)];
    const towerInfo = TOWER_DATA[randomKey];

    const isCard = Math.random() < 0.2;
    let gachaResultData = {};

    if (isCard) {
        const isNew = addCard(randomKey);
        if (isNew) {
            gachaResultData = {
                type: 'new_card',
                badgeText: "🎉 NEW 완제품 카드!",
                badgeType: "card",
                isLegendary: true,
                emblem: (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[randomKey]) ? TOWER_EMBLEMS[randomKey] : "🏹",
                title: towerInfo.name,
                desc: towerInfo.desc,
                detail: "신규 카드를 획득하여 덱에 추가되었습니다!"
            };
        } else {
            addFragment(randomKey, 10);
            gachaResultData = {
                type: 'duplicate',
                badgeText: "🔁 중복 변환 (조각 +10)",
                badgeType: "frag",
                isLegendary: false,
                emblem: (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[randomKey]) ? TOWER_EMBLEMS[randomKey] : "💎",
                title: `${towerInfo.name} 조각`,
                desc: towerInfo.desc,
                detail: "이미 보유한 카드이므로 조각 10개로 변환되었습니다."
            };
        }
    } else {
        const amount = Math.floor(Math.random() * 4) + 2; // 2~5개
        addFragment(randomKey, amount);
        gachaResultData = {
            type: 'fragment',
            badgeText: `💎 조각 획득 (+${amount})`,
            badgeType: "frag",
            isLegendary: false,
            emblem: "💎",
            title: `${towerInfo.name} 조각`,
            desc: towerInfo.desc,
            detail: `조각을 모으면 타워를 제작하거나 강화할 수 있습니다.`
        };
    }

    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    openGachaModal(gachaResultData);
}

/**
 * 2. 미소녀 지휘관 소환 (1 PP 소모) - v0.23.0 New
 */
function drawCommanderGacha() {
    lastGachaType = 'commander';
    const cost = (typeof COMMANDER_GACHA_CONFIG !== 'undefined') ? COMMANDER_GACHA_CONFIG.costPP : 1;
    if ((USER_DATA.pp || 0) < cost) {
        alert("프리즘 포인트(PP)가 부족합니다!\n10라운드마다 등장하는 보스를 격파하여 PP를 획득하세요.");
        return;
    }

    USER_DATA.pp -= cost;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    // 확률 가중치 기반 캐릭터 추첨
    const rates = COMMANDER_GACHA_CONFIG.rates;
    const totalWeight = rates.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedRate = rates[0];

    for (const r of rates) {
        if (rand < r.weight) {
            selectedRate = r;
            break;
        }
        rand -= r.weight;
    }

    const charId = selectedRate.charId;
    const charBase = CHARACTER_DATA[charId];
    const gradeInfo = CARD_GRADES[charBase.grade] || { name: charBase.grade, color: "#3b82f6" };

    const result = addCharacterOrDuplicate(charId);
    let gachaResultData = {};

    if (result.isNew) {
        gachaResultData = {
            type: 'commander_new',
            badgeText: `👑 [${gradeInfo.name}] 신규 지휘관 획득!`,
            badgeType: "card",
            isLegendary: charBase.grade === 'SR' || charBase.grade === 'UR' || charBase.grade === 'U' || charBase.grade === 'R',
            emblem: charBase.avatar || "👑",
            title: `${charBase.name} (${charBase.title})`,
            desc: charBase.desc,
            detail: `기본 소켓: ${result.sockets}개 | 강화 한도 라이선스 해금!`
        };
    } else {
        const upgradeMsg = result.upgraded 
            ? `🎉 성급 승급 성공! ★${result.star} (소켓 ${result.sockets}칸으로 확장!)`
            : `성급 강화 진행도: (${result.exp}/${result.reqExp})`;

        gachaResultData = {
            type: 'commander_dup',
            badgeText: `🔁 지휘관 성급 강화 (+1)`,
            badgeType: "frag",
            isLegendary: result.upgraded,
            emblem: charBase.avatar || "👑",
            title: `${charBase.name} ★${result.star}`,
            desc: charBase.desc,
            detail: upgradeMsg
        };
    }

    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    openGachaModal(gachaResultData);
}

/**
 * 3. 신비한 룬 소환 (5 RP 소모) - v0.23.0 New
 */
function drawRuneGacha() {
    lastGachaType = 'rune';
    const cost = (typeof RUNE_GACHA_CONFIG !== 'undefined') ? RUNE_GACHA_CONFIG.costRP : 5;
    if ((USER_DATA.rp || 0) < cost) {
        alert(`룬 포인트(RP)가 부족합니다! (필요: ${cost} RP)\n몬스터를 사냥하거나 웨이브를 클리어하여 RP를 모아보세요.`);
        return;
    }

    USER_DATA.rp -= cost;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    // 확률 가중치 기반 룬 추첨
    const rates = RUNE_GACHA_CONFIG.rates;
    const totalWeight = rates.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedRuneId = rates[0].runeId;

    for (const r of rates) {
        if (rand < r.weight) {
            selectedRuneId = r.runeId;
            break;
        }
        rand -= r.weight;
    }

    const runeInfo = RUNE_DATA[selectedRuneId];
    addRune(selectedRuneId);

    const isSpell = runeInfo.type === 'spell';
    const gradeInfo = CARD_GRADES[runeInfo.grade] || { name: runeInfo.grade, color: "#3b82f6" };

    const gachaResultData = {
        type: 'rune',
        badgeText: `🔮 [${gradeInfo.name}] ${isSpell ? '액티브 스펠 룬' : '속성 패시브 룬'}`,
        badgeType: isSpell ? "card" : "frag",
        isLegendary: runeInfo.grade === 'SR' || runeInfo.grade === 'UR' || runeInfo.grade === 'R',
        emblem: runeInfo.icon || "🔮",
        title: runeInfo.name,
        desc: runeInfo.desc,
        detail: isSpell ? `인게임에서 마나(MP ${runeInfo.mpCost})를 소모해 발동 가능!` : `지휘관 소켓에 장착하여 타워에 패시브 부여!`
    };

    if (typeof updateLobbyUI === 'function') updateLobbyUI();
    openGachaModal(gachaResultData);
}

/**
 * 3D 카드 플립 연출 모달 오픈 (Phase C)
 */
function openGachaModal(data) {
    const overlay = document.getElementById("gacha-modal-overlay");
    const inner = document.getElementById("gacha-card-inner");
    const backFace = document.getElementById("gacha-card-back");
    const badge = document.getElementById("gacha-card-badge");
    const emblem = document.getElementById("gacha-card-emblem");
    const title = document.getElementById("gacha-card-title");
    const desc = document.getElementById("gacha-card-desc");
    const detail = document.getElementById("gacha-card-detail");
    const retryBtn = document.querySelector(".btn-gacha-retry");

    if (!overlay || !inner) return;

    // 1. 초기 상태: 뒷면으로 리셋
    inner.classList.remove("flipped");
    if (backFace) {
        backFace.classList.toggle("legendary", !!data.isLegendary);
        backFace.classList.toggle("fragment", !data.isLegendary);
    }

    // 2. 카드 내용 바인딩
    if (badge) {
        badge.innerText = data.badgeText;
        badge.className = `gacha-card-badge ${data.badgeType}`;
    }
    if (emblem) emblem.innerText = data.emblem || "🔮";
    if (title) title.innerText = data.title;
    if (desc) desc.innerText = data.desc;
    if (detail) detail.innerText = data.detail;

    // 3. 재소환 버튼 텍스트 동적 변경
    if (retryBtn) {
        if (lastGachaType === 'commander') {
            retryBtn.innerText = "👑 한 번 더 소환 (1 PP)";
        } else if (lastGachaType === 'rune') {
            retryBtn.innerText = "🔮 한 번 더 소환 (5 RP)";
        } else {
            retryBtn.innerText = "📦 한 번 더 소환 (100 TP)";
        }
    }

    // 4. 모달 표시
    overlay.style.display = "flex";

    // 5. 3D 카드 뒤집기 애니메이션 자동 시작
    setTimeout(() => {
        inner.classList.add("flipped");
    }, 350);
}

/**
 * 수동 카드 클릭 시 플립 토글
 */
function flipGachaCard() {
    const inner = document.getElementById("gacha-card-inner");
    if (inner) inner.classList.toggle("flipped");
}

/**
 * 가챠 모달 닫기
 */
function closeGachaModal() {
    const overlay = document.getElementById("gacha-modal-overlay");
    if (overlay) overlay.style.display = "none";
}

/**
 * 모달에서 바로 한 번 더 소환하기
 */
function retryGacha() {
    closeGachaModal();
    setTimeout(() => {
        if (lastGachaType === 'commander') {
            drawCommanderGacha();
        } else if (lastGachaType === 'rune') {
            drawRuneGacha();
        } else {
            drawGacha();
        }
    }, 150);
}
