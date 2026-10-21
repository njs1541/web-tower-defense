/**
 * 상점 및 가챠 소환 전담 모듈 (js/gacha.js)
 * 운명의 카드 뽑기, 확률 계산, 3D 카드 플립 연출을 담당합니다.
 */

/**
 * 상점 UI 열기/닫기 토글
 */
function toggleShop() {
    const shop = document.getElementById("shop-ui");
    if (!shop) return;
    shop.style.display = (shop.style.display === "none" || shop.style.display === "") ? "block" : "none";
}

/**
 * 카드 소환(가챠) 실행
 */
function drawGacha() {
    const cost = 100;
    if (USER_DATA.gold < cost) {
        alert("골드가 부족합니다!");
        return;
    }

    // 1. 골드 차감 및 저장
    USER_DATA.gold -= cost;
    saveData();
    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    const resultDiv = document.getElementById("gacha-result");
    const towerKeys = Object.keys(TOWER_DATA);
    const randomKey = towerKeys[Math.floor(Math.random() * towerKeys.length)];
    const towerInfo = TOWER_DATA[randomKey];

    // 20% 확률로 완제품 카드, 80% 확률로 조각 2~5개
    const isCard = Math.random() < 0.2;
    let gachaResultData = {};

    if (isCard) {
        const isNew = addCard(randomKey);
        if (isNew) {
            gachaResultData = {
                type: 'new_card',
                towerId: randomKey,
                badgeText: "🎉 NEW 완제품 카드!",
                badgeType: "card",
                isLegendary: true,
                title: towerInfo.name,
                desc: towerInfo.desc,
                detail: "신규 카드를 획득하여 덱에 추가되었습니다!"
            };
            if (resultDiv) resultDiv.innerText = `🎉 대박! [${towerInfo.name}] 카드 획득!`;
        } else {
            addFragment(randomKey, 10);
            gachaResultData = {
                type: 'duplicate',
                towerId: randomKey,
                badgeText: "🔁 중복 변환 (조각 +10)",
                badgeType: "frag",
                isLegendary: false,
                title: `${towerInfo.name} 조각`,
                desc: towerInfo.desc,
                detail: "이미 보유한 카드이므로 조각 10개로 변환되었습니다."
            };
            if (resultDiv) resultDiv.innerText = `[${towerInfo.name}] 중복! 조각 10개로 변환됨.`;
        }
    } else {
        const amount = Math.floor(Math.random() * 4) + 2; // 2~5개
        addFragment(randomKey, amount);
        gachaResultData = {
            type: 'fragment',
            towerId: randomKey,
            badgeText: `💎 조각 획득 (+${amount})`,
            badgeType: "frag",
            isLegendary: false,
            title: `${towerInfo.name} 조각`,
            desc: towerInfo.desc,
            detail: `조각을 30개 모으면 카드를 제작할 수 있습니다.`
        };
        if (resultDiv) resultDiv.innerText = `[${towerInfo.name}] 조각 ${amount}개 획득.`;
    }

    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    // 3D 카드 플립 모달 오픈
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
    const emblemIcon = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[data.towerId]) ? TOWER_EMBLEMS[data.towerId] : "🏰";
    if (emblem) emblem.innerText = emblemIcon;
    if (title) title.innerText = data.title;
    if (desc) desc.innerText = data.desc;
    if (detail) detail.innerText = data.detail;

    // 3. 모달 표시
    overlay.style.display = "flex";

    // 4. 약간의 긴장감 딜레이(350ms) 후 3D 카드 뒤집기 애니메이션 자동 시작
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
        drawGacha();
    }, 100);
}
