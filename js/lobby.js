/**
 * 로비 및 메타 시스템 모듈 (js/lobby.js)
 * 로비 화면, 인벤토리, 덱 편성, 특성 연구소, 스테이지 선택을 전담합니다.
 */

/**
 * 로비 화면 UI 전체 동기화
 */
function updateLobbyUI() {
    const goldDisplay = document.getElementById("lobby-gold");
    if (goldDisplay && typeof USER_DATA !== 'undefined') {
        goldDisplay.innerText = USER_DATA.gold;
    }

    const invList = document.getElementById("inventory-list");
    if (!invList || typeof USER_DATA === 'undefined') return;
    invList.innerHTML = "";

    // 1. 출전 덱 요약 헤더
    const deckCount = (USER_DATA.deck || []).length;
    const deckHeader = document.createElement("div");
    deckHeader.style.width = "100%";
    deckHeader.style.marginBottom = "8px";
    deckHeader.style.fontSize = "13px";
    deckHeader.style.color = "#475569";
    deckHeader.innerHTML = `🛡️ <strong>출전 덱 (${deckCount}/4)</strong> - 카드를 클릭해 장착/해제할 수 있습니다.`;
    invList.appendChild(deckHeader);

    // 2. 보유 카드 목록 렌더링
    USER_DATA.inventory.forEach(id => {
        if (!TOWER_DATA[id]) return;
        const card = document.createElement("div");
        card.style.border = "1px solid #94a3b8";
        card.style.borderRadius = "6px";
        card.style.padding = "6px";
        card.style.width = "105px";
        card.style.cursor = "pointer";
        card.style.position = "relative";
        card.style.background = "#ffffff";
        card.className = "inventory-card";

        const isInDeck = USER_DATA.deck && USER_DATA.deck.includes(id);
        if (isInDeck) {
            card.style.borderColor = "#2563eb";
            card.style.boxShadow = "0 0 8px rgba(37, 99, 235, 0.3)";
            card.style.background = "#eff6ff";
        }

        const lv = USER_DATA.levels ? USER_DATA.levels[id] : 1;
        const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[id]) ? TOWER_EMBLEMS[id] : "🏰";

        card.innerHTML = `
            <div style="font-size: 24px; text-align: center;">${emblem}</div>
            <strong style="font-size: 13px;">${TOWER_DATA[id].name}</strong><br>
            <span style="font-size: 11px; color: #64748b;">Lv.${lv}</span>
            ${isInDeck ? '<div style="margin-top:4px; font-size:10px; font-weight:bold; color:#1d4ed8; background:#dbeafe; border-radius:3px; padding:1px 3px; text-align:center;">⚔️ 출전 중</div>' : ''}
        `;

        card.onclick = () => showCardDetails(id);
        invList.appendChild(card);
    });

    // 3. 조각 현황 및 타워 제작/강화 섹션
    const fragmentKeys = Object.keys(USER_DATA.fragments);
    if (fragmentKeys.length > 0) {
        const fragTitle = document.createElement("div");
        fragTitle.style.width = "100%";
        fragTitle.innerHTML = "<hr><strong>타워 강화 (조각 사용)</strong>";
        invList.appendChild(fragTitle);

        fragmentKeys.forEach(id => {
            const currentFrag = USER_DATA.fragments[id];
            if (currentFrag <= 0) return;
            if (!TOWER_DATA[id]) return;

            const isOwned = USER_DATA.inventory.includes(id);
            const lv = USER_DATA.levels ? USER_DATA.levels[id] : 1;

            let btnText = "";
            let btnAction = null;
            let reqCost = 0;
            let isDisabled = false;

            if (!isOwned) {
                reqCost = 30; // 미보유 카드 정가 제작: 30개
                btnText = `제작 (비용:${reqCost})`;
                btnAction = () => {
                    if (craftCard(id)) {
                        alert("제작 성공! 인벤토리를 확인하세요.");
                        updateLobbyUI();
                    }
                };
            } else {
                reqCost = lv * 10;
                const isMax = lv >= 5;
                if (isMax) {
                    btnText = "MAX";
                    isDisabled = true;
                } else {
                    btnText = `강화 (Lv.${lv}→${lv + 1}, 비용:${reqCost})`;
                    btnAction = () => {
                        const success = upgradeTower(id);
                        if (success) {
                            alert("강화 성공!");
                            updateLobbyUI();
                        }
                    };
                }
            }

            if (currentFrag < reqCost && !isDisabled) {
                isDisabled = true;
            }

            const row = document.createElement("div");
            row.style.width = "100%";
            row.style.marginBottom = "5px";
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.borderBottom = "1px dashed #eee";
            row.style.paddingBottom = "5px";

            const info = document.createElement("span");
            info.innerHTML = `${TOWER_DATA[id].name} (보유: ${currentFrag}개) ${!isOwned ? "<span style='color:red; font-size:10px;'>[미보유]</span>" : ""}`;

            const btn = document.createElement("button");
            btn.innerText = btnText;
            btn.disabled = isDisabled;
            if (!isDisabled && btnAction) {
                btn.onclick = btnAction;
            }

            row.appendChild(info);
            row.appendChild(btn);
            invList.appendChild(row);
        });
    }
}

/**
 * 타워 상세 정보 표시 및 출전 덱 토글
 */
function showCardDetails(towerId) {
    const stats = getTowerStats(towerId, TOWER_DATA);
    if (!stats) return;

    const panel = document.getElementById("card-info-panel");
    const nameEl = document.getElementById("info-name");
    const descEl = document.getElementById("info-desc");
    const dmgEl = document.getElementById("info-damage");
    const rngEl = document.getElementById("info-range");
    const spdEl = document.getElementById("info-speed");

    if (!panel) return;

    panel.style.display = "block";
    const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[towerId]) ? TOWER_EMBLEMS[towerId] : "🏰";
    nameEl.innerText = `${emblem} ${stats.name} (Lv.${stats.level})`;
    nameEl.style.color = stats.color;
    descEl.innerText = stats.desc;

    dmgEl.innerText = Math.round(stats.damage * 10) / 10;
    rngEl.innerText = stats.range;
    spdEl.innerText = "5.0";

    // 출전 덱 토글 버튼
    let deckActionBtn = document.getElementById("btn-card-deck-toggle");
    if (!deckActionBtn) {
        deckActionBtn = document.createElement("button");
        deckActionBtn.id = "btn-card-deck-toggle";
        deckActionBtn.style.width = "100%";
        deckActionBtn.style.marginTop = "10px";
        deckActionBtn.style.padding = "7px";
        deckActionBtn.style.fontWeight = "bold";
        panel.appendChild(deckActionBtn);
    }

    const isInDeck = USER_DATA.deck && USER_DATA.deck.includes(towerId);
    if (isInDeck) {
        deckActionBtn.innerText = "❌ 출전 덱에서 해제";
        deckActionBtn.style.background = "#fee2e2";
        deckActionBtn.style.borderColor = "#f87171";
        deckActionBtn.style.color = "#b91c1c";
    } else {
        deckActionBtn.innerText = "⚔️ 출전 덱에 장착";
        deckActionBtn.style.background = "#dbeafe";
        deckActionBtn.style.borderColor = "#60a5fa";
        deckActionBtn.style.color = "#1d4ed8";
    }

    deckActionBtn.onclick = () => {
        if (toggleDeckCard(towerId)) {
            updateLobbyUI();
            showCardDetails(towerId);
        }
    };
}

/**
 * 스테이지 선택
 */
function selectStage(stageId) {
    currentStage = stageId;
    console.log(`스테이지 변경: ${stageId}`);

    // UI 버튼 활성화 갱신
    const buttons = document.querySelectorAll(".btn-stage-select");
    buttons.forEach(btn => {
        if (parseInt(btn.dataset.stageId) === stageId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const descEl = document.getElementById("stage-desc-text");
    if (descEl && typeof STAGE_DATA !== 'undefined' && STAGE_DATA[stageId]) {
        descEl.innerText = `${STAGE_DATA[stageId].name} (${STAGE_DATA[stageId].desc})`;
    }
}

/**
 * 연구소 모달 열기
 */
function openTalentModal() {
    const overlay = document.getElementById("talent-modal-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    updateTalentModalUI();
}

/**
 * 연구소 모달 닫기
 */
function closeTalentModal() {
    const overlay = document.getElementById("talent-modal-overlay");
    if (overlay) overlay.style.display = "none";
}

/**
 * 연구소 특성 목록 UI 렌더링
 */
function updateTalentModalUI() {
    const goldDisplay = document.getElementById("talent-gold-display");
    if (goldDisplay) goldDisplay.innerText = USER_DATA.gold;

    const list = document.getElementById("talent-list");
    if (!list || typeof TALENT_DATA === 'undefined') return;

    list.innerHTML = "";

    Object.keys(TALENT_DATA).forEach(key => {
        const talent = TALENT_DATA[key];
        const currentLv = (USER_DATA.talents && USER_DATA.talents[key]) || 0;
        const isMax = currentLv >= talent.maxLevel;
        const cost = (currentLv + 1) * talent.baseCost;

        const row = document.createElement("div");
        row.className = "talent-card";

        row.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px;">${talent.name} <span style="color: #2563eb; font-size: 12px;">Lv.${currentLv}/${talent.maxLevel}</span></div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${talent.desc}</div>
            </div>
            <div>
                <button class="btn-talent-upgrade ${isMax ? 'max' : ''}" ${isMax || USER_DATA.gold < cost ? 'disabled' : ''} onclick="buyTalent('${key}')">
                    ${isMax ? 'MAX' : `강화 (${cost}G)`}
                </button>
            </div>
        `;

        list.appendChild(row);
    });
}

/**
 * 연구소 특성 구매
 */
function buyTalent(key) {
    if (upgradeTalent(key)) {
        updateTalentModalUI();
        updateLobbyUI();
    }
}
