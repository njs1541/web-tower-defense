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

    // 1. 대표 지휘관(보좌관) 쇼케이스 및 대사 렌더링 (v0.28.0)
    renderAdjutantSection();

    // 2. 미소녀 지휘관 & 소켓 룬 섹션 렌더링 (v0.23.0)
    renderCommanderSection();
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
        deckIds.forEach((id, idx) => {
            const char = CHARACTER_DATA[id];
            if (char) {
                const isLeader = (idx === 0);
                const thumb = char.image ? `<img src="${char.image}" class="deck-chip-thumb" alt="${char.name}">` : (char.avatar || '👑');
                const leaderTag = isLeader ? `<span class="deck-chip-leader-tag">👑대장</span>` : '';
                commanderChipsHtml += `<span class="deck-commander-chip ${isLeader ? 'is-leader' : ''}">${thumb} ${leaderTag}${char.name}</span>`;
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

    // 4. 대장 오버클럭 보너스 배너
    const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
    const leaderBannerHtml = (leaderInfo && leaderInfo.bonusDesc) ? `
        <div class="deck-leader-bonus-box">
            <span class="deck-leader-bonus-title">👑 대장(${leaderInfo.charBase.name}) 오버클럭</span>
            <span>${leaderInfo.bonusDesc}</span>
        </div>
    ` : '';

    summaryCard.innerHTML = `
        <div class="deck-summary-header">
            <div class="deck-summary-title">
                <span>👑</span> 출전 지휘관 덱 (${deckIds.length}/3)
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #dbeafe; padding: 2px 8px; border-radius: 10px;">
                1번 슬롯 = 대장
            </span>
        </div>
        <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">편성된 지휘관 (첫 번째가 대장)</div>
            <div class="deck-commanders-chips">
                ${commanderChipsHtml}
            </div>
        </div>
        ${leaderBannerHtml}
        <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>🏗️ 인게임 건설 가능 타워</span>
                <span style="font-size: 10px; color: #3b82f6;">지휘관+대장 한도 합산</span>
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
        const isLeader = isInDeck && deckIds[0] === charId;
        const gradeInfo = CARD_GRADES[baseInfo.grade] || { name: baseInfo.grade, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };

        const card = document.createElement("div");
        card.className = `commander-card grade-${baseInfo.grade.toLowerCase()} ${isInDeck ? 'in-deck' : ''} ${isLeader ? 'is-leader-card' : ''}`;

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

        // 대장 뱃지 마크업
        const leaderBadgeHtml = isLeader ? `<span class="commander-leader-crown-badge">👑 대장(총사령관)</span>` : '';
        const setLeaderBtnHtml = (isInDeck && !isLeader) ? `<button class="btn-set-leader" onclick="setLeaderAction('${charId}')">👑 대장으로 임명</button>` : '';

        card.innerHTML = `
            <div class="commander-card-header">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="commander-grade-badge" style="background:${gradeInfo.bg}; color:${gradeInfo.color}; border:1px solid ${gradeInfo.border};">${gradeInfo.name} (${baseInfo.grade})</span>
                    ${leaderBadgeHtml}
                </div>
                <span class="commander-stars" style="color: #f59e0b; font-size: 12px; letter-spacing: 1px;">${starsHtml}</span>
            </div>
            
            <div class="commander-avatar-box">
                <div class="commander-avatar ${baseInfo.image ? 'has-image' : ''}" onclick="viewCommanderIllustration('${charId}')" title="🔍 클릭하여 일러스트 크게 보기">
                    ${baseInfo.image ? `<img src="${baseInfo.image}" alt="${baseInfo.name}" class="commander-thumb-img" onerror="this.parentElement.innerHTML='${baseInfo.avatar || '👑'}'">` : (baseInfo.avatar || '👑')}
                </div>
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
                ${setLeaderBtnHtml}
                <button class="btn-deck-toggle ${isInDeck ? 'in-deck' : ''}" onclick="toggleCharacterDeckAction('${charId}')">
                    ${isInDeck ? '⚔️ 출전 중 (해제)' : '⚔️ 출전 덱에 편성'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * 대장 임명 액션 핸들러
 */
function setLeaderAction(charId) {
    if (typeof setDeckLeader === 'function') {
        setDeckLeader(charId);
        updateLobbyUI();
    }
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
 * 로비 서브 탭 전환 (단일 지휘관 센터 체계로 통합되어 레거시 호환성 유지)
 */
function switchLobbyTab(tabName) {
    // 단일 지휘관 센터 체계로 통합 완료
}

/**
 * 지휘관 일러스트 확대 뷰어 모달 열기 (v0.27.1 New)
 */
function viewCommanderIllustration(charId) {
    const modal = document.getElementById("illustration-viewer-modal");
    if (!modal) return;

    const charBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
    if (!charBase) return;

    const imgEl = document.getElementById("viewer-img");
    const gradeBadge = document.getElementById("viewer-grade-badge");
    const nameEl = document.getElementById("viewer-name");
    const titleEl = document.getElementById("viewer-title");

    if (imgEl) {
        imgEl.src = charBase.image || "";
        imgEl.alt = charBase.name;
    }

    if (gradeBadge) {
        const gradeInfo = (typeof CARD_GRADES !== 'undefined' && CARD_GRADES[charBase.grade]) 
            ? CARD_GRADES[charBase.grade] 
            : { name: charBase.grade, color: "#3b82f6", bg: "rgba(59,130,246,0.2)" };
        gradeBadge.textContent = `${gradeInfo.name} (${charBase.grade})`;
        gradeBadge.style.background = gradeInfo.bg;
        gradeBadge.style.color = gradeInfo.color;
        gradeBadge.style.borderColor = gradeInfo.border || gradeInfo.color;
    }

    if (nameEl) nameEl.textContent = charBase.name;
    if (titleEl) titleEl.textContent = charBase.title;

    modal.style.display = "flex";
}

/**
 * 지휘관 일러스트 확대 뷰어 모달 닫기 (v0.27.1 New)
 */
function closeIllustrationViewer() {
    const modal = document.getElementById("illustration-viewer-modal");
    if (modal) modal.style.display = "none";
}

/**
 * -------------------------------------------------------------
 * 로비 대표 지휘관(전속 보좌관) 쇼케이스 및 터치 인터랙션 (v0.28.0 New)
 * -------------------------------------------------------------
 */

let currentAdjutantCharId = null;

/**
 * 로비 대표 지휘관 배너 렌더링
 */
function renderAdjutantSection() {
    const banner = document.getElementById("lobby-adjutant-banner");
    if (!banner || typeof USER_DATA === 'undefined' || typeof CHARACTER_DATA === 'undefined') return;

    const ownedChars = USER_DATA.characters || {};
    const deckIds = USER_DATA.characterDeck || [];

    // 출전 덱의 1번 지휘관을 우선 보좌관으로 지정, 없으면 보유 지휘관 중 첫 번째
    let adjutantId = null;
    if (deckIds.length > 0 && ownedChars[deckIds[0]]) {
        adjutantId = deckIds[0];
    } else {
        const ownedList = Object.keys(ownedChars);
        if (ownedList.length > 0) adjutantId = ownedList[0];
    }

    if (!adjutantId || !CHARACTER_DATA[adjutantId]) {
        banner.style.display = "none";
        return;
    }

    currentAdjutantCharId = adjutantId;
    const charBase = CHARACTER_DATA[adjutantId];
    const charData = ownedChars[adjutantId] || { star: 1 };
    const gradeInfo = CARD_GRADES[charBase.grade] || { name: charBase.grade, color: "#3b82f6", bg: "rgba(59,130,246,0.2)" };

    const starCount = charData.star || 1;
    const starsHtml = "★".repeat(starCount);

    // 기본 대사: 캐릭터의 첫 번째 대사
    const defaultQuote = (charBase.quotes && charBase.quotes.length > 0) 
        ? charBase.quotes[0] 
        : (charBase.desc || "오늘도 영지의 평화를 지켜내겠습니다, 지휘관님!");

    banner.style.display = "flex";
    banner.innerHTML = `
        <div class="adjutant-portrait-box" id="adjutant-portrait" onclick="interactWithAdjutant('${adjutantId}')" ondblclick="viewCommanderIllustration('${adjutantId}')" title="클릭하여 대화하기 / 더블클릭하여 일러스트 확대">
            <img src="${charBase.image || ''}" alt="${charBase.name}" class="adjutant-portrait-img">
            <span class="adjutant-grade-badge" style="background:${gradeInfo.bg}; color:${gradeInfo.color}; border-color:${gradeInfo.border || gradeInfo.color};">
                ${gradeInfo.name}
            </span>
            <span class="adjutant-tap-hint">터치 💬</span>
        </div>
        <div class="adjutant-info-box">
            <div class="adjutant-header-row">
                <span class="adjutant-role-tag">👑 전속 보좌관</span>
                <span class="adjutant-stars">${starsHtml}</span>
            </div>
            <h3 class="adjutant-name">
                ${charBase.name}
                <span class="adjutant-title">${charBase.title}</span>
            </h3>
            <div id="adjutant-speech-bubble" class="adjutant-speech-bubble" onclick="interactWithAdjutant('${adjutantId}')">
                "${defaultQuote}"
            </div>
        </div>
    `;
}

/**
 * 대표 지휘관 터치 인터랙션 (랜덤 대사 출력 및 바운스 모션)
 */
function interactWithAdjutant(charId) {
    const charBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
    if (!charBase) return;

    // 1. 일러스트 박스 바운스 애니메이션
    const portrait = document.getElementById("adjutant-portrait");
    if (portrait) {
        portrait.classList.remove("adjutant-tap-bounce");
        // reflow 트리거
        void portrait.offsetWidth;
        portrait.classList.add("adjutant-tap-bounce");
    }

    // 2. 랜덤 대사 선정 및 말풍선 갱신
    const quotes = charBase.quotes || [charBase.desc || "지휘관님, 언제든 명령을 내려주세요!"];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const bubble = document.getElementById("adjutant-speech-bubble");
    if (bubble) {
        bubble.style.opacity = "0";
        bubble.style.transform = "translateY(4px)";
        setTimeout(() => {
            bubble.innerHTML = `"${randomQuote}"`;
            bubble.style.opacity = "1";
            bubble.style.transform = "translateY(0)";
        }, 120);
    }
}



