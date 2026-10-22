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

    const ppDisplay = document.getElementById("lobby-pp");
    if (ppDisplay && typeof USER_DATA !== 'undefined') {
        ppDisplay.innerText = USER_DATA.pp || 0;
    }

    const rpDisplay = document.getElementById("lobby-rp");
    if (rpDisplay && typeof USER_DATA !== 'undefined') {
        rpDisplay.innerText = USER_DATA.rp || 0;
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

    // 3. 타워 조각 보관함 및 타일 버튼 렌더링 (v0.20.0)
    const fragList = document.getElementById("fragment-list");
    if (fragList && typeof USER_DATA !== 'undefined' && typeof TOWER_DATA !== 'undefined') {
        fragList.innerHTML = "";

        // 모든 타워 목록을 순회하여 조각 타일 버튼 생성
        const allTowerIds = Object.keys(TOWER_DATA);

        allTowerIds.forEach(id => {
            const currentFrag = (USER_DATA.fragments && USER_DATA.fragments[id]) || 0;
            const isOwned = USER_DATA.inventory && USER_DATA.inventory.includes(id);
            const lv = (USER_DATA.levels && USER_DATA.levels[id]) || 1;
            const imgPath = (typeof SHARD_IMAGES !== 'undefined' && SHARD_IMAGES[id]) ? SHARD_IMAGES[id] : "assets/shard_ranged.jpg";
            const shardName = (typeof SHARD_NAMES !== 'undefined' && SHARD_NAMES[id]) ? SHARD_NAMES[id] : `${TOWER_DATA[id].name} 조각`;

            let actionText = "";
            let actionClass = "";
            let reqCost = 0;
            let canAct = false;
            let clickHandler = null;

            if (!isOwned) {
                reqCost = 30; // 미보유 카드 정가 제작: 30개
                if (currentFrag >= reqCost) {
                    actionText = `제작 가능 (30)`;
                    actionClass = "can-craft";
                    canAct = true;
                    clickHandler = () => {
                        if (confirm(`'${TOWER_DATA[id].name}'을(를) 조각 30개로 제작하시겠습니까?`)) {
                            if (craftCard(id)) {
                                alert("🎉 제작 성공! 이제 인벤토리에서 출전 덱에 편성할 수 있습니다.");
                                updateLobbyUI();
                            }
                        }
                    };
                } else {
                    actionText = `제작 (${currentFrag}/${reqCost})`;
                    actionClass = "need-more";
                    clickHandler = () => {
                        alert(`조각이 부족합니다.\n제작에 필요한 조각: ${reqCost}개 (현재: ${currentFrag}개)`);
                    };
                }
            } else {
                const isMax = lv >= 5;
                if (isMax) {
                    actionText = `MAX (최대 Lv.5)`;
                    actionClass = "max-lv";
                    clickHandler = () => {
                        alert(`'${TOWER_DATA[id].name}'은(는) 이미 최고 레벨(Lv.5)입니다!`);
                    };
                } else {
                    reqCost = lv * 10;
                    if (currentFrag >= reqCost) {
                        actionText = `Lv.${lv + 1} 강화 (${reqCost})`;
                        actionClass = "can-upgrade";
                        canAct = true;
                        clickHandler = () => {
                            if (confirm(`조각 ${reqCost}개를 소모하여 '${TOWER_DATA[id].name}'을(를) Lv.${lv + 1}로 강화하시겠습니까?`)) {
                                if (upgradeTower(id)) {
                                    alert("⚡ 강화 성공! 공격력과 성능이 증가했습니다.");
                                    updateLobbyUI();
                                }
                            }
                        };
                    } else {
                        actionText = `강화 (${currentFrag}/${reqCost})`;
                        actionClass = "need-more";
                        clickHandler = () => {
                            alert(`조각이 부족합니다.\nLv.${lv + 1} 강화에 필요한 조각: ${reqCost}개 (현재: ${currentFrag}개)`);
                        };
                    }
                }
            }

            // 타일 버튼 엘리먼트 생성
            const tileBtn = document.createElement("div");
            tileBtn.className = `shard-tile-btn ${canAct ? 'ready-to-act' : ''}`;
            tileBtn.title = isOwned ? `${TOWER_DATA[id].name} (현재 Lv.${lv})` : `${TOWER_DATA[id].name} [미보유]`;

            tileBtn.innerHTML = `
                <div class="shard-img-wrap">
                    <img src="${imgPath}" alt="${shardName}" class="shard-img" onerror="this.src='assets/op_title_bg.jpg'">
                </div>
                <div class="shard-tile-name">${shardName}</div>
                <div class="shard-tile-count ${currentFrag === 0 ? 'low' : ''}">💎 ${currentFrag}개</div>
                <div class="shard-tile-action ${actionClass}">${actionText}</div>
            `;

            if (clickHandler) {
                tileBtn.onclick = clickHandler;
            }

            fragList.appendChild(tileBtn);
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
