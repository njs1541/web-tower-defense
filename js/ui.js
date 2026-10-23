const gameBoard = document.getElementById("game-board");
const roundDisplay = document.getElementById("round");
const hpDisplay = document.getElementById("hp");
const goldDisplay = document.getElementById("gold");
const monsterCountDisplay = document.getElementById("monster-count");
const towerPanel = document.querySelector("#info-panel div");

function render() {
    for (const cell of board) {
        const dom = getDomCell(cell.x, cell.y);
        if (!dom) continue;

        // 기존 사거리 하이라이트 여부 임시 보관
        const isRangePreview = dom.classList.contains("range-preview");
        const isRangeActive = dom.classList.contains("range-active");

        dom.className = "cell";
        dom.innerText = ""; // 내부 텍스트 초기화

        // 시작점 및 골인점 마킹
        if (cell.isStart) {
            dom.classList.add("start-tile");
            dom.innerText = "🚩";
        } else if (cell.isGoal) {
            dom.classList.add("goal-tile");
            dom.innerText = "🏰";
        }

        // 경로 및 기반 상태
        if (cell.path && !cell.buildable && !cell.isStart && !cell.isGoal) {
            dom.classList.add("path");
        }
        if (cell.buildable) {
            dom.classList.add("buildable");
        }

        // 타워 설치 상태
        if (cell.tower) {
            dom.classList.add(cell.tower);
            const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[cell.tower]) ? TOWER_EMBLEMS[cell.tower] : "🏰";
            dom.innerText = emblem;
        }

        // v0.32.0 대장 지휘관 필드 토큰 렌더링 (원형 프레임, 부유 모션, 회전 오라, 왕관)
        if (typeof leaderDeployed !== 'undefined' && leaderDeployed && leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y) {
            dom.classList.add("has-leader");
            const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
            const leaderImg = (leaderInfo && leaderInfo.charBase && leaderInfo.charBase.image)
                ? `<img src="${leaderInfo.charBase.image}" class="leader-token-img" alt="대장">`
                : `<span class="leader-token-avatar">${(leaderInfo && leaderInfo.charBase && leaderInfo.charBase.avatar) || '👑'}</span>`;

            dom.innerHTML = `
                <div class="leader-field-token grade-${(leaderInfo && leaderInfo.grade) || 'R'}" title="👑 대장 ${(leaderInfo && leaderInfo.charBase && leaderInfo.charBase.name) || ''} (수호 결계 발동 중 / 클릭 시 이동 모드)">
                    <div class="leader-token-aura"></div>
                    ${leaderImg}
                    <span class="leader-token-crown">👑</span>
                </div>
            `;
        }

        // 대장 강림/이동 모드 시 비어있는 기반(벽) 하이라이트
        if (typeof isLeaderDeployMode !== 'undefined' && isLeaderDeployMode && cell.buildable && !cell.tower && !(leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y)) {
            dom.classList.add("leader-targetable");
        }

        if (selectedBoardTower && selectedBoardTower.x === cell.x && selectedBoardTower.y === cell.y) {
            dom.classList.add("selected-tower");
        }
        if (isRangePreview) dom.classList.add("range-preview");
        if (isRangeActive) dom.classList.add("range-active");
    }

    roundDisplay.innerText = round;
    hpDisplay.innerText = playerHP;
    goldDisplay.innerText = gold;

    const mpDisplay = document.getElementById("mp-count");
    if (mpDisplay) {
        mpDisplay.innerText = Math.floor(mp || 0);
    }

    // 몬스터 수 표시 갱신
    const aliveCount = enemies.filter(e => e.alive).length;
    monsterCountDisplay.innerText = `${aliveCount} / ${totalEnemies}`;

    // 인게임 스펠 버튼 상태 갱신
    if (typeof renderInGameSpells === 'function') {
        renderInGameSpells();
    }
}

/**
 * 배속 및 일시정지 버튼 UI 갱신
 */
function updateSpeedUI() {
    const btnPause = document.getElementById("btn-pause");
    const btnSpeed1 = document.getElementById("btn-speed-1");
    const btnSpeed2 = document.getElementById("btn-speed-2");

    if (btnPause) {
        if (isPaused) {
            btnPause.classList.add("active");
            btnPause.innerText = "▶ 재개";
        } else {
            btnPause.classList.remove("active");
            btnPause.innerText = "⏸️ 일시정지";
        }
    }

    if (btnSpeed1) {
        btnSpeed1.classList.toggle("active", !isPaused && gameSpeed === 1);
    }
    if (btnSpeed2) {
        btnSpeed2.classList.toggle("active", !isPaused && gameSpeed === 2);
    }
}

// 스페이스바(일시정지 토글) 단축키
document.addEventListener("keydown", (e) => {
    // 인풋 태그 입력 중이거나 게임 화면이 아닐 때는 무시
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const gameScreen = document.getElementById("game-screen");
    if (!gameScreen || gameScreen.style.display === "none") return;

    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }
});

function updateButtonVisuals() {
    // 기반 건설 버튼 시각화 및 실시간 비용 표기
    const btnUnlock = document.getElementById("btn-unlock");
    if (btnUnlock) {
        const cost = (typeof getBaseBuildCost === 'function') ? getBaseBuildCost() : 1;
        btnUnlock.innerText = `🏗️ 기반 건설 (${cost}G)`;
        btnUnlock.title = `기반(벽)을 건설합니다. 5개 건설할 때마다 비용이 1G 증가하며 환불할 수 없습니다. (현재 건설된 기반: ${builtBaseCount || 0}개)`;

        if (interactionMode === 'base' || interactionMode === 'unlock') {
            btnUnlock.classList.add("selected");
        } else {
            btnUnlock.classList.remove("selected");
        }
    }

    // 타워 버튼 시각화
    const container = document.getElementById("tower-controls");
    if (!container) return;

    const buttons = Array.from(container.getElementsByTagName("button"));
    buttons.forEach(btn => {
        const tId = btn.dataset.towerId;
        if (interactionMode === 'build' && tId && tId === selectedTower) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });
}

function updateTowerButtons() {
    const container = document.getElementById("tower-controls");
    if (!container) return;

    container.innerHTML = ""; // 버튼 초기화

    // 출전 지휘관 카드들에 등록/관장된 타워 목록(라이선스) 조회 (v0.25.1 New)
    const authorizedTowers = (typeof getAuthorizedTowerTypes === 'function') 
        ? getAuthorizedTowerTypes() 
        : ['ranged'];

    if (authorizedTowers.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #ef4444; padding: 6px; text-align: center; border: 1px dashed #fca5a5; border-radius: 6px;">출전한 지휘관이 관장하는 타워가 없습니다.<br>(지휘관 덱을 편성해주세요)</div>`;
        return;
    }

    authorizedTowers.forEach(towerId => {
        const stats = TOWER_DATA[towerId];
        if (!stats) return;

        const btn = document.createElement("button");
        btn.dataset.towerId = towerId; // 식별자
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "space-between";
        btn.style.width = "100%";
        btn.style.marginBottom = "4px";

        // 속성 크리스탈 미니 뱃지 (v0.28.0 New)
        const shardThumb = stats.shardImage 
            ? `<img src="${stats.shardImage}" style="width: 18px; height: 18px; border-radius: 4px; object-fit: cover; margin-right: 6px; border: 1px solid rgba(0,0,0,0.15);">` 
            : '';

        btn.innerHTML = `
            <span style="display: flex; align-items: center;">${shardThumb}<strong>${stats.name}</strong></span>
            <span style="font-size: 11px; opacity: 0.85;">${stats.cost}G</span>
        `;

        // 이벤트 바인딩
        btn.onclick = (e) => {
            e.stopPropagation(); // 상위 요소 클릭 방지
            selectTower(towerId);
        };

        container.appendChild(btn);
    });

    updateButtonVisuals();
    updateInGameCommandersBar();
}

/**
 * 인게임 출전 지휘관 상주 바 UI 갱신 (v0.28.0 New)
 */
function updateInGameCommandersBar() {
    const bar = document.getElementById("in-game-commanders-bar");
    if (!bar || typeof USER_DATA === 'undefined' || typeof CHARACTER_DATA === 'undefined') return;

    const deckIds = USER_DATA.characterDeck || [];
    if (deckIds.length === 0) {
        bar.innerHTML = `<div style="font-size: 11.5px; color: #94a3b8; text-align: center; padding: 16px 8px; border: 1px dashed #cbd5e1; border-radius: 8px;">출전 중인 지휘관이 없습니다.<br>(로비에서 덱을 편성해주세요)</div>`;
        return;
    }

    bar.innerHTML = "";

    // 1. 인게임 활성 시너지 요약 배너 (v0.34.0 New)
    const synergyData = (typeof calculateDeckSynergies === 'function') ? calculateDeckSynergies() : { activeSynergies: [] };
    const synBox = document.createElement("div");
    synBox.className = "ingame-synergies-summary-box";

    if (synergyData.activeSynergies && synergyData.activeSynergies.length > 0) {
        let synListHtml = "";
        synergyData.activeSynergies.forEach(syn => {
            synListHtml += `
                <div class="ingame-synergy-pill" style="background:${syn.bg}; border-color:${syn.border}; color:${syn.color};" title="${syn.title}: ${syn.desc}">
                    <span style="font-weight: 800;">${syn.name}</span>
                    <span style="font-size: 10px; opacity: 0.9;">${syn.title}</span>
                </div>
            `;
        });
        synBox.innerHTML = `
            <div class="ingame-synergy-title">✨ 덱 시너지 효과 (${synergyData.activeSynergies.length})</div>
            <div class="ingame-synergy-pills">${synListHtml}</div>
        `;
    } else {
        synBox.innerHTML = `
            <div class="ingame-synergy-title" style="color: #94a3b8; font-size: 11px;">✨ 덱 시너지 (동일 속성 2인 이상 시 발동)</div>
            <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">현재 활성화된 시너지 조합이 없습니다.</div>
        `;
    }
    bar.appendChild(synBox);

    // 2. 출전 지휘관 카드 렌더링
    deckIds.forEach((charId, idx) => {
        const charBase = CHARACTER_DATA[charId];
        if (!charBase) return;

        const isLeader = (idx === 0);
        const gradeInfo = CARD_GRADES[charBase.grade] || { name: charBase.grade, color: "#3b82f6", border: "#3b82f6" };
        const card = document.createElement("div");
        card.className = `ingame-commander-card ${isLeader ? 'is-leader' : ''} grade-${charBase.grade || 'C'}`;
        card.style.borderColor = isLeader ? "#f59e0b" : (gradeInfo.border || gradeInfo.color);

        // 관장 타워 요약 텍스트
        const capParts = [];
        if (charBase.levelCaps) {
            for (const [tType, capVal] of Object.entries(charBase.levelCaps)) {
                const tName = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[tType]) ? TOWER_DATA[tType].name.replace(" 타워", "") : tType;
                capParts.push(`${tName}+${capVal}강`);
            }
        }
        const capsText = capParts.length > 0 ? capParts.join(", ") : "기본";

        // 원소 & 역할군 태그 마크업 (v0.34.0 New)
        let tagsHtml = "";
        if (typeof SYNERGY_DATA !== 'undefined') {
            const elemInfo = charBase.element ? SYNERGY_DATA.elements[charBase.element] : null;
            const roleInfo = charBase.role ? SYNERGY_DATA.roles[charBase.role] : null;
            if (elemInfo) {
                tagsHtml += `<span class="ingame-tag-pill" style="background:${elemInfo.bg}; color:${elemInfo.color}; border:1px solid ${elemInfo.border};">${elemInfo.symbol}${elemInfo.name}</span>`;
            }
            if (roleInfo) {
                tagsHtml += `<span class="ingame-tag-pill" style="background:${roleInfo.bg}; color:${roleInfo.color}; border:1px solid ${roleInfo.border};">${roleInfo.symbol}${roleInfo.name}</span>`;
            }
        }

        // 대장 컨트롤 및 보너스 마크업
        let leaderControlHtml = "";
        let leaderBonusHtml = "";
        if (isLeader) {
            const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
            if (leaderInfo && leaderInfo.bonusDesc) {
                leaderBonusHtml = `
                    <div class="ingame-leader-bonus-tag">
                        <span>${leaderInfo.bonusDesc}</span>
                    </div>
                `;
            }

            if (!leaderDeployed) {
                leaderControlHtml = `
                    <button class="btn-leader-card-action ${isLeaderDeployMode ? 'active' : ''}" onclick="event.stopPropagation(); toggleLeaderDeployMode();">
                        👑 대장 필드 강림 (벽에 배치)
                    </button>
                `;
            } else if (!leaderRelocatedThisRound) {
                leaderControlHtml = `
                    <button class="btn-leader-card-action relocate ${isLeaderDeployMode ? 'active' : ''}" onclick="event.stopPropagation(); toggleLeaderDeployMode();">
                        👑 전술 위치 이동 (1회 가능)
                    </button>
                `;
            } else {
                leaderControlHtml = `
                    <div class="ingame-leader-relocated-notice">
                        🔒 이번 라운드 이동 완료 (다음 라운드 가능)
                    </div>
                `;
            }
        }

        card.innerHTML = `
            <div class="ingame-card-header">
                <span class="ingame-card-role-badge ${isLeader ? 'leader' : ''}">
                    ${isLeader ? '👑 대장' : '⚔️ 지휘관'}
                </span>
                <span class="ingame-card-grade-badge" style="background:${gradeInfo.bg || '#eff6ff'}; color:${gradeInfo.color}; border:1px solid ${gradeInfo.border};">
                    ${gradeInfo.name} (${charBase.grade})
                </span>
            </div>

            <div class="ingame-card-body" onclick="interactWithCommanderInGame('${charId}')" title="클릭하여 지휘관 대사 감상">
                <div class="ingame-card-avatar-box">
                    <img src="${charBase.image || ''}" alt="${charBase.name}" class="ingame-card-avatar" style="border-color:${isLeader ? '#f59e0b' : gradeInfo.color};" onerror="this.style.display='none'">
                    ${isLeader ? '<span class="ingame-card-crown-float">👑</span>' : ''}
                </div>
                <div class="ingame-card-info">
                    <div class="ingame-card-name">${charBase.name}</div>
                    <div class="ingame-card-tags-line" style="display:flex; gap:4px; margin: 3px 0 4px 0;">
                        ${tagsHtml}
                    </div>
                    <div class="ingame-card-tower-spec">🛡️ 관장: <strong>${capsText}</strong></div>
                </div>
            </div>

            ${leaderBonusHtml}
            ${leaderControlHtml}
        `;

        bar.appendChild(card);
    });
}

/**
 * 인게임 지휘관 카드 클릭 시 대사 플로팅 인터랙션
 */
function interactWithCommanderInGame(charId) {
    if (typeof CHARACTER_DATA === 'undefined') return;
    const charBase = CHARACTER_DATA[charId];
    if (!charBase) return;

    const quotes = charBase.quotes || [charBase.desc || "출격 준비 완료!"];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    const gradeInfo = (typeof CARD_GRADES !== 'undefined' && CARD_GRADES[charBase.grade]) ? CARD_GRADES[charBase.grade] : { color: "#f59e0b" };

    if (typeof showFloatingDamage === 'function') {
        showFloatingDamage(10, 10, `💬 ${charBase.name}: "${q}"`, gradeInfo.color || "#f59e0b");
    }
}
