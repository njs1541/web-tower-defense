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

    // 1. 미소녀 지휘관 & 소켓 룬 섹션 렌더링 (v0.23.0)
    renderCommanderSection();

    // 2. 타워 조각 보관함 렌더링 (v0.20.0)
    renderFragmentList();
}

/**
 * 타워 조각 보관함 및 타일 버튼 렌더링 (v0.20.0)
 */
function renderFragmentList() {
    const fragList = document.getElementById("fragment-list");
    if (!fragList || typeof USER_DATA === 'undefined' || typeof TOWER_DATA === 'undefined') return;
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
                            alert("🎉 제작 성공! 이제 해당 타워를 관장하는 지휘관을 통해 사용할 수 있습니다.");
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

/**
 * -------------------------------------------------------------
 * 미소녀 지휘관 & 소켓 룬 시스템 UI (v0.23.0 New)
 * -------------------------------------------------------------
 */

let selectingRuneFor = { charId: null, socketIndex: 0 };

/**
 * 지휘관 카드 및 룬 소켓 목록 렌더링
 */
function renderCommanderSection() {
    const container = document.getElementById("commander-list");
    if (!container || typeof USER_DATA === 'undefined' || typeof CHARACTER_DATA === 'undefined') return;

    container.innerHTML = "";

    // 보유한 지휘관 목록
    const ownedChars = USER_DATA.characters || {};
    const ownedIds = Object.keys(ownedChars);

    if (ownedIds.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 13px; padding: 20px;">보유한 지휘관이 없습니다. 상점에서 프리즘 포인트(PP)로 지휘관을 소환해 보세요!</div>`;
        return;
    }

    // -------------------------------------------------------------
    // [v0.25.3] 출전 지휘관 덱 전술 요약 카드 (건설 가능 타워 & 최대 레벨 리스트 노출)
    // -------------------------------------------------------------
    const deckIds = USER_DATA.characterDeck || [];
    const deckCaps = (typeof calculateDeckTowerCaps === 'function') ? calculateDeckTowerCaps() : {};
    const deckSupplies = (typeof calculateDeckStartingSupplies === 'function') ? calculateDeckStartingSupplies() : {};
    
    // 현재 출전 지휘관들로부터 인가된 타워 목록 수집
    let authorizedTowers = [];
    if (deckIds.length > 0 && typeof getAuthorizedTowerTypes === 'function') {
        authorizedTowers = getAuthorizedTowerTypes();
    }

    const summaryCard = document.createElement("div");
    summaryCard.className = "commander-deck-summary-card";

    // 1. 편성된 지휘관 칩들
    let commanderChipsHtml = "";
    if (deckIds.length > 0) {
        deckIds.forEach(id => {
            const char = CHARACTER_DATA[id];
            if (char) {
                commanderChipsHtml += `<span class="deck-commander-chip">${char.avatar || '👑'} ${char.name}</span>`;
            }
        });
    } else {
        commanderChipsHtml = `<span style="font-size: 11px; color: #94a3b8;">출전 중인 지휘관 없음</span>`;
    }

    // 2. 건설 가능 타워 목록 및 최대 강화 한도 배지
    let towerListHtml = "";
    if (authorizedTowers.length > 0) {
        towerListHtml = `<div class="deck-tower-list">`;
        authorizedTowers.forEach(tType => {
            const tInfo = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[tType]) ? TOWER_DATA[tType] : { name: tType };
            const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[tType]) ? TOWER_EMBLEMS[tType] : '🗼';
            const maxCap = deckCaps[tType] || 0;
            const capBadgeText = maxCap > 0 ? `최대 Lv.${maxCap} (+${maxCap}강)` : `기본 Lv.0 (한도 없음)`;

            towerListHtml += `
                <div class="deck-tower-item">
                    <span style="font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">${emblem}</span> ${tInfo.name.replace(" 타워", "")} 타워
                    </span>
                    <span class="deck-tower-badge">${capBadgeText}</span>
                </div>
            `;
        });
        towerListHtml += `</div>`;
    } else {
        towerListHtml = `
            <div style="background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
                ⚠️ 출전 지휘관이 없습니다.<br>
                지휘관 카드의 <strong>[출전 덱에 편성]</strong>을 눌러 타워를 개방하세요!
            </div>
        `;
    }

    // 3. 시작 무료 보급 요약
    const suppliesText = [];
    for (const [sKey, sCount] of Object.entries(deckSupplies)) {
        if (sCount > 0) {
            if (sKey === 'base') {
                suppliesText.push(`기반 ${sCount}개`);
            } else {
                const sName = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[sKey]) ? TOWER_DATA[sKey].name.replace(" 타워", "") : sKey;
                suppliesText.push(`${sName} ${sCount}기`);
            }
        }
    }
    const suppliesSummary = suppliesText.length > 0 ? suppliesText.join(", ") : "없음";

    summaryCard.innerHTML = `
        <div class="deck-summary-header">
            <div class="deck-summary-title">
                <span>👑</span> 출전 지휘관 덱 (${deckIds.length}/3)
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #dbeafe; padding: 2px 8px; border-radius: 10px;">
                인게임 타워 인가
            </span>
        </div>
        <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">편성된 지휘관</div>
            <div class="deck-commanders-chips">
                ${commanderChipsHtml}
            </div>
        </div>
        <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>🏗️ 인게임 건설 가능 타워</span>
                <span style="font-size: 10px; color: #3b82f6;">지휘관 강화 한도 합산</span>
            </div>
            ${towerListHtml}
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 11px; color: #475569; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; color: #d97706;">🎁 시작 무료 보급</span>
            <span style="font-weight: 600;">${suppliesSummary}</span>
        </div>
    `;

    container.appendChild(summaryCard);

    // 각 지휘관 카드 렌더링
    ownedIds.forEach(charId => {
        const charData = ownedChars[charId];
        const baseInfo = CHARACTER_DATA[charId];
        if (!baseInfo) return;

        const isInDeck = deckIds.includes(charId);
        const gradeInfo = CARD_GRADES[baseInfo.grade] || { name: baseInfo.grade, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };

        const card = document.createElement("div");
        card.className = `commander-card ${isInDeck ? 'in-deck' : ''}`;

        // 타워 한도 보너스 및 시작 보급 텍스트 생성
        let capsText = [];
        if (baseInfo.levelCaps) {
            for (const [tType, cap] of Object.entries(baseInfo.levelCaps)) {
                const tName = TOWER_DATA[tType] ? TOWER_DATA[tType].name.replace(" 타워", "") : tType;
                capsText.push(`${tName} +${cap}강`);
            }
        }
        const capsSummary = capsText.join(", ");

        // 시작 타워/기반 무료 보급 요약 (v0.25.0 New)
        const suppliesText = [];
        if (baseInfo.startingTowers) {
            for (const [sKey, sCount] of Object.entries(baseInfo.startingTowers)) {
                if (sKey === 'base') {
                    suppliesText.push(`기반 ${sCount}개`);
                } else {
                    const sName = TOWER_DATA[sKey] ? TOWER_DATA[sKey].name.replace(" 타워", "") : sKey;
                    suppliesText.push(`${sName} ${sCount}기`);
                }
            }
        }
        const suppliesSummary = suppliesText.length > 0 ? suppliesText.join(", ") : "없음";

        // 소켓 목록 생성
        const socketsCount = charData.sockets || baseInfo.baseSockets || 1;
        let socketsHtml = "";
        for (let i = 0; i < socketsCount; i++) {
            const equippedRuneId = (charData.equippedRunes && charData.equippedRunes[i]) || null;
            if (equippedRuneId && RUNE_DATA[equippedRuneId]) {
                const rInfo = RUNE_DATA[equippedRuneId];
                const rGrade = CARD_GRADES[rInfo.grade] || { color: "#3b82f6" };
                socketsHtml += `
                    <div class="commander-socket filled" onclick="openRuneEquipModal('${charId}', ${i})" title="${rInfo.name} (${rInfo.desc})">
                        <span style="font-size: 14px;">${rInfo.icon || '🔮'}</span>
                        <span style="font-size: 11px; font-weight: bold; color: ${rGrade.color}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 75px;">${rInfo.name}</span>
                        <button class="btn-socket-remove" onclick="event.stopPropagation(); unequipRuneAction('${charId}', ${i});" title="룬 장착 해제">×</button>
                    </div>
                `;
            } else {
                socketsHtml += `
                    <div class="commander-socket empty" onclick="openRuneEquipModal('${charId}', ${i})" title="클릭하여 룬 장착">
                        <span>➕</span>
                        <span style="font-size: 10px; color: #94a3b8;">빈 소켓</span>
                    </div>
                `;
            }
        }

        // 별(성급) 표시
        const starCount = charData.star || 1;
        let starsHtml = "★".repeat(starCount) + "☆".repeat(Math.max(0, 5 - starCount));

        card.innerHTML = `
            <div class="commander-card-header">
                <span class="commander-grade-badge" style="background:${gradeInfo.bg}; color:${gradeInfo.color}; border:1px solid ${gradeInfo.border};">${gradeInfo.name} (${baseInfo.grade})</span>
                <span class="commander-stars" style="color: #f59e0b; font-size: 12px; letter-spacing: 1px;">${starsHtml}</span>
            </div>
            
            <div class="commander-avatar-box">
                <div class="commander-avatar">${baseInfo.avatar || '👑'}</div>
                <div class="commander-name-box">
                    <div class="commander-name">${baseInfo.name}</div>
                    <div class="commander-title">${baseInfo.title}</div>
                </div>
            </div>

            <div class="commander-cap-info">
                <div>🛡️ 타워 강화 한도: <strong>${capsSummary}</strong></div>
                <div style="margin-top: 3px; color: #b45309;">🎁 시작 무료 보급: <strong>${suppliesSummary}</strong></div>
            </div>

            <div class="commander-sockets-container">
                <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px;">🔮 장착 룬 소켓 (${socketsCount}칸)</div>
                <div class="commander-sockets-list">${socketsHtml}</div>
            </div>

            <div class="commander-actions">
                <button class="btn-deck-toggle ${isInDeck ? 'in-deck' : ''}" onclick="toggleCharacterDeckAction('${charId}')">
                    ${isInDeck ? '⚔️ 출전 중 (해제)' : '⚔️ 출전 덱에 편성'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * 지휘관 덱 편성/해제 핸들러
 */
function toggleCharacterDeckAction(charId) {
    if (typeof toggleCharacterDeck === 'function') {
        toggleCharacterDeck(charId);
        updateLobbyUI();
    }
}

/**
 * 룬 장착 해제 핸들러
 */
function unequipRuneAction(charId, socketIndex) {
    if (typeof unequipRuneFromCharacter === 'function') {
        unequipRuneFromCharacter(charId, socketIndex);
        updateLobbyUI();
    }
}

/**
 * 룬 장착 선택 모달 열기
 */
function openRuneEquipModal(charId, socketIndex) {
    selectingRuneFor = { charId: charId, socketIndex: socketIndex };
    const modal = document.getElementById("rune-equip-modal");
    if (!modal) return;

    const list = document.getElementById("rune-modal-list");
    if (list) {
        list.innerHTML = "";
        const runes = USER_DATA.runes || [];

        if (runes.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px; font-size: 13px;">보유한 룬이 없습니다.<br>상점에서 룬 포인트(RP)로 신비한 룬을 소환해보세요!</div>`;
        } else {
            runes.forEach((runeId, rIndex) => {
                const runeInfo = RUNE_DATA[runeId];
                if (!runeInfo) return;

                const gradeInfo = CARD_GRADES[runeInfo.grade] || { name: runeInfo.grade, color: "#3b82f6" };
                const isSpell = runeInfo.type === 'spell';

                const item = document.createElement("div");
                item.className = "rune-modal-item";
                item.innerHTML = `
                    <div style="font-size: 24px; margin-right: 10px;">${runeInfo.icon || '🔮'}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 13px; color: #0f172a;">
                            ${runeInfo.name} 
                            <span style="font-size: 10px; color:${gradeInfo.color}; font-weight:bold;">[${gradeInfo.name}]</span>
                            <span style="font-size: 10px; color:${isSpell ? '#2563eb' : '#ea580c'};">(${isSpell ? '액티브 스펠' : '속성 패시브'})</span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${runeInfo.desc}</div>
                    </div>
                    <button class="btn-select-rune" onclick="selectRuneForSocket('${runeId}')">장착</button>
                `;
                list.appendChild(item);
            });
        }
    }

    modal.style.display = "flex";
}

/**
 * 룬 장착 모달 닫기
 */
function closeRuneEquipModal() {
    const modal = document.getElementById("rune-equip-modal");
    if (modal) modal.style.display = "none";
}

/**
 * 모달에서 특정 룬을 선택하여 소켓에 장착
 */
function selectRuneForSocket(runeId) {
    if (!selectingRuneFor.charId) return;

    if (typeof equipRuneToCharacter === 'function') {
        equipRuneToCharacter(selectingRuneFor.charId, selectingRuneFor.socketIndex, runeId);
        closeRuneEquipModal();
        updateLobbyUI();
    }
}

/**
 * 로비 서브 탭 전환 (v0.25.2 Update - 2대 탭 체계)
 * @param {'commanders' | 'shards'} tabName
 */
let currentLobbyTab = 'commanders';

function switchLobbyTab(tabName) {
    currentLobbyTab = tabName;

    // 1. 모든 탭 버튼 비활성화 및 선택 버튼 활성화
    const tabButtons = {
        'commanders': document.getElementById('tab-btn-commanders'),
        'shards': document.getElementById('tab-btn-shards')
    };

    Object.keys(tabButtons).forEach(key => {
        if (tabButtons[key]) {
            if (key === tabName) {
                tabButtons[key].classList.add('active');
            } else {
                tabButtons[key].classList.remove('active');
            }
        }
    });

    // 2. 모든 탭 섹션 숨김 및 선택 섹션 노출
    const tabSections = {
        'commanders': document.getElementById('tab-section-commanders'),
        'shards': document.getElementById('tab-section-shards')
    };

    Object.keys(tabSections).forEach(key => {
        if (tabSections[key]) {
            tabSections[key].style.display = (key === tabName) ? 'block' : 'none';
        }
    });
}

