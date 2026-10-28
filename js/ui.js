const gameBoard = document.getElementById("game-board");
const roundDisplay = document.getElementById("round");
const hpDisplay = document.getElementById("hp");
const goldDisplay = document.getElementById("gold");
const monsterCountDisplay = document.getElementById("monster-count");
const towerPanel = document.querySelector("#info-panel div");

function render() {
    // 타워 건설 모드 여부 확인
    const isBuildMode = interactionMode === 'build' && selectedTower;

    for (const cell of board) {
        const dom = getDomCell(cell.x, cell.y);
        if (!dom) continue;

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
            // 타워 건설 모드일 때 대장/히어로가 없는 순수 빈 기반만 '설치 가능'으로 맥동 하이라이트
            if (isBuildMode && !cell.tower) {
                let occupiedByUnit = (typeof leaderDeployed !== 'undefined' && leaderDeployed && leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y);
                if (!occupiedByUnit && typeof deployedHeroes !== 'undefined') {
                    for (const h of Object.values(deployedHeroes)) {
                        if (h && h.x === cell.x && h.y === cell.y) {
                            occupiedByUnit = true;
                            break;
                        }
                    }
                }
                if (!occupiedByUnit) {
                    dom.classList.add("tower-placeable");
                }
            }
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

        // v0.39.0 전장 강림 히어로 유닛 및 3x3 지휘 오라 필드 렌더링
        if (typeof deployedHeroes !== 'undefined') {
            // 1. 3x3 지휘 오라 필드 착색
            for (const [hId, hData] of Object.entries(deployedHeroes)) {
                if (hData && Math.abs(cell.x - hData.x) <= 1 && Math.abs(cell.y - hData.y) <= 1) {
                    dom.classList.add("hero-aura-tile");
                    break;
                }
            }

            // 2. 히어로 필드 토큰 (이후 모듈러 캐릭터 예정 -> 현재는 심플한 원형 토큰)
            for (const [hId, hData] of Object.entries(deployedHeroes)) {
                if (hData && hData.x === cell.x && hData.y === cell.y) {
                    dom.classList.add("has-hero");
                    const cBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[hId] : null;
                    const cAvatar = (cBase && cBase.avatar) ? cBase.avatar : '⚡';
                    const cGrade = (cBase && cBase.grade) ? cBase.grade : 'UR';
                    const cName = (cBase && cBase.name) ? cBase.name : '히어로';
                    dom.innerHTML = `
                        <div class="hero-simple-token grade-${cGrade}" title="⚡ ${cName} (3x3 지휘 오라 전개 중 / 클릭 시 이동)">
                            <span class="hero-token-core">${cAvatar}</span>
                        </div>
                    `;
                    break;
                }
            }
        }

        // 대장 강림/이동 모드 시 비어있는 기반(벽) 하이라이트 (다른 히어로 점유 타일 제외)
        if (typeof isLeaderDeployMode !== 'undefined' && isLeaderDeployMode && cell.buildable && !cell.tower && !(leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y)) {
            let occupiedByHero = false;
            if (typeof deployedHeroes !== 'undefined') {
                for (const h of Object.values(deployedHeroes)) {
                    if (h && h.x === cell.x && h.y === cell.y) {
                        occupiedByHero = true;
                        break;
                    }
                }
            }
            if (!occupiedByHero) {
                dom.classList.add("leader-targetable");
            }
        }

        // 히어로 유닛 강림/이동 모드 시 비어있는 기반(벽) 하이라이트 (대장 및 다른 히어로 점유 타일 제외)
        if (typeof heroDeployingCharId !== 'undefined' && heroDeployingCharId && cell.buildable && !cell.tower && !cell.isStart && !cell.isGoal) {
            let occupied = (typeof leaderDeployed !== 'undefined' && leaderDeployed && leaderPos && leaderPos.x === cell.x && leaderPos.y === cell.y);
            if (!occupied && typeof deployedHeroes !== 'undefined') {
                for (const [oId, h] of Object.entries(deployedHeroes)) {
                    if (h && h.x === cell.x && h.y === cell.y && oId !== heroDeployingCharId) {
                        occupied = true;
                        break;
                    }
                }
            }
            if (!occupied) {
                dom.classList.add("hero-targetable");
            }
        }

        if (selectedBoardTower && selectedBoardTower.x === cell.x && selectedBoardTower.y === cell.y) {
            dom.classList.add("selected-tower");
        }
    }

    // 오직 사용자가 직접 타워를 클릭하여 선택했을 때만 활성 사거리 표시
    if (selectedBoardTower && selectedBoardTower.tower && typeof highlightRange === 'function') {
        const stats = (typeof getGameTowerStats === 'function') ? getGameTowerStats(selectedBoardTower) : null;
        if (stats) {
            highlightRange(selectedBoardTower.x, selectedBoardTower.y, stats.range, "range-active");
        }
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

        // v0.36.0 고정 타워 스톡 정보 조회
        const remaining = (commanderTowerRemaining && typeof commanderTowerRemaining[towerId] === 'number')
            ? commanderTowerRemaining[towerId]
            : 0;
        const total = (commanderTowerStocks && typeof commanderTowerStocks[towerId] === 'number')
            ? commanderTowerStocks[towerId]
            : 0;

        const isOutOfStock = remaining <= 0;

        const btn = document.createElement("button");
        btn.dataset.towerId = towerId; // 식별자
        btn.className = `btn-tower-select ${isOutOfStock ? 'out-of-stock' : ''}`;
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "space-between";
        btn.style.width = "100%";
        btn.style.marginBottom = "4px";
        btn.style.opacity = isOutOfStock ? "0.55" : "1.0";
        if (isOutOfStock) {
            btn.style.filter = "grayscale(50%)";
        }

        // 속성 크리스탈 미니 뱃지 (v0.28.0 New)
        const shardThumb = stats.shardImage
            ? `<img src="${stats.shardImage}" style="width: 18px; height: 18px; border-radius: 4px; object-fit: cover; margin-right: 6px; border: 1px solid rgba(0,0,0,0.15);">`
            : '';

        // 스톡 뱃지 스타일
        const stockBadgeStyle = isOutOfStock
            ? "background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 10px; font-weight: bold; font-size: 10px;"
            : "background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 2px 6px; border-radius: 10px; font-weight: bold; font-size: 10px;";

        btn.innerHTML = `
            <span style="display: flex; align-items: center;">${shardThumb}<strong>${stats.name}</strong></span>
            <span class="tower-stock-pill" style="${stockBadgeStyle}" title="남은 설치 가능 수량 / 총 스톡">${remaining}/${total} 스톡</span>
        `;

        // 이벤트 바인딩
        btn.onclick = (e) => {
            e.stopPropagation(); // 상위 요소 클릭 방지
            if (isOutOfStock) {
                if (typeof showFloatingDamage === 'function') {
                    showFloatingDamage(10, 10, "⚠️ 설치 가능 스톡이 없습니다!", "#ef4444");
                }
                return;
            }
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

        // 대장 컨트롤 및 보너스 마크업 (UR/U 결전 히어로는 전용 강림 컨트롤을 사용하므로 구형 대장 버튼 중복 표시 제외)
        let leaderControlHtml = "";
        let leaderBonusHtml = "";
        const isHeroUnit = (charBase.grade === 'UR' || charBase.grade === 'U');
        if (isLeader) {
            const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
            if (leaderInfo && leaderInfo.bonusDesc) {
                leaderBonusHtml = `
                    <div class="ingame-leader-bonus-tag">
                        <span>${leaderInfo.bonusDesc}</span>
                    </div>
                `;
            }

            if (!isHeroUnit) {
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
        }

        // v0.39.0 UR/U 지휘관 전장 직접 강림 컨트롤 및 오라 마크업
        let heroControlHtml = "";
        if (charBase.grade === 'UR' || charBase.grade === 'U') {
            const auraSpec = (typeof getHeroAuraSpec === 'function') ? getHeroAuraSpec(charId) : null;
            const heroData = (typeof deployedHeroes !== 'undefined') ? deployedHeroes[charId] : null;
            const isSelecting = (typeof heroDeployingCharId !== 'undefined' && heroDeployingCharId === charId);

            let auraHtml = "";
            if (auraSpec) {
                auraHtml = `
                    <div class="ingame-hero-aura-tag" title="${auraSpec.name}: ${auraSpec.desc}">
                        <span>✨ 3x3 지휘 오라: ${auraSpec.desc}</span>
                    </div>
                `;
            }

            let actionBtnHtml = "";
            if (!heroData) {
                actionBtnHtml = `
                    <button class="btn-hero-card-action ${isSelecting ? 'active' : ''}" onclick="event.stopPropagation(); toggleHeroDeployMode('${charId}');">
                        ${isSelecting ? '⚡ 강림 타일 선택 중...' : '⚡ 전장 직접 강림'}
                    </button>
                `;
            } else if (heroData.cooldownSec > 0) {
                actionBtnHtml = `
                    <div class="ingame-hero-cooldown-notice">
                        ⏳ 전술 이동 쿨다운 (${heroData.cooldownSec}초)
                    </div>
                `;
            } else {
                actionBtnHtml = `
                    <button class="btn-hero-card-action relocate ${isSelecting ? 'active' : ''}" onclick="event.stopPropagation(); toggleHeroDeployMode('${charId}');">
                        ${isSelecting ? '🔄 이동 타일 선택 중...' : '🔄 전술 재배치 (15s)'}
                    </button>
                `;
            }

            heroControlHtml = `
                ${auraHtml}
                ${actionBtnHtml}
            `;
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
            ${heroControlHtml}
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

/**
 * ============================================================
 * v0.38.0 종합 전투 현황판(Battle Report) 모달 표시 및 렌더링
 * ============================================================
 */
function showBattleReport(isVictory = false) {
    const modal = document.getElementById("battle-report-modal");
    if (!modal) return;

    // 1. 승리 / 패배 배지
    const badge = document.getElementById("report-outcome-badge");
    if (badge) {
        badge.className = `report-badge ${isVictory ? 'victory' : 'defeat'}`;
        badge.innerText = isVictory ? "🏆 STAGE CLEAR (VICTORY)" : "💀 DEFENSE FAILED (DEFEAT)";
    }

    // 2. 종합 지표 (진행 라운드, 처치 수, 유효 데미지)
    const roundEl = document.getElementById("report-round-val");
    if (roundEl) roundEl.innerText = `${round} Round`;

    const killsEl = document.getElementById("report-kills-val");
    const totalKills = (typeof battleStats !== 'undefined') ? (battleStats.totalKills || 0) : 0;
    if (killsEl) killsEl.innerText = `${totalKills} 마리`;

    const dmgEl = document.getElementById("report-total-dmg-val");
    const totalDmg = (typeof battleStats !== 'undefined') ? Math.round(battleStats.totalDamage || 0) : 0;
    if (dmgEl) dmgEl.innerText = `${totalDmg.toLocaleString()} DMG`;

    // 3. MVP 지휘관 산출 (타워 관장 딜량 & 강림 지휘관 직접 요격 딜량 통합 비교)
    let mvpCharId = (typeof USER_DATA !== 'undefined' && USER_DATA.characterDeck) ? USER_DATA.characterDeck[0] : null;
    let mvpBase = (mvpCharId && typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[mvpCharId] : null;
    let bestContributionDmg = -1;

    // 3-1. 타워 딜량이 가장 높은 타워의 관장 지휘관 탐색
    if (typeof battleStats !== 'undefined' && battleStats.towers) {
        let bestTowerKey = null;
        for (const [tKey, tData] of Object.entries(battleStats.towers)) {
            if (tData.damage > bestContributionDmg) {
                bestContributionDmg = tData.damage;
                bestTowerKey = tKey;
            }
        }
        if (bestTowerKey && typeof USER_DATA !== 'undefined' && USER_DATA.characterDeck) {
            for (const cId of USER_DATA.characterDeck) {
                const cInfo = CHARACTER_DATA[cId];
                if (cInfo && cInfo.towerStock && cInfo.towerStock[bestTowerKey] > 0) {
                    mvpCharId = cId;
                    mvpBase = cInfo;
                    break;
                }
            }
        }
    }

    // 3-2. 전장 직접 강림 히어로(UR/U)의 요격 딜량 비교
    if (typeof battleStats !== 'undefined' && battleStats.commanders) {
        for (const [cId, cDmg] of Object.entries(battleStats.commanders)) {
            if (cDmg > bestContributionDmg && CHARACTER_DATA[cId]) {
                bestContributionDmg = cDmg;
                mvpCharId = cId;
                mvpBase = CHARACTER_DATA[cId];
            }
        }
    }

    if (mvpBase) {
        const mvpImg = document.getElementById("report-mvp-img");
        if (mvpImg) {
            mvpImg.src = mvpBase.image || "assets/char_liana.jpg";
            mvpImg.style.display = "block";
        }
        const mvpName = document.getElementById("report-mvp-name");
        if (mvpName) mvpName.innerText = `${mvpBase.title || ''} ${mvpBase.name}`;

        const mvpQuote = document.getElementById("report-mvp-quote");
        if (mvpQuote) {
            const quotes = mvpBase.quotes || [mvpBase.desc];
            mvpQuote.innerText = `"${quotes[0]}"`;
        }
    }

    // 4. 타워 및 강림 지휘관 딜량 지분율 리스트 렌더링
    const towersList = document.getElementById("report-towers-list");
    if (towersList) {
        towersList.innerHTML = "";
        const towerStatsObj = (typeof battleStats !== 'undefined' && battleStats.towers) ? battleStats.towers : {};
        const cmdStatsObj = (typeof battleStats !== 'undefined' && battleStats.commanders) ? battleStats.commanders : {};

        const combinedEntries = [];
        for (const [tKey, d] of Object.entries(towerStatsObj)) {
            if (d && d.damage > 0) {
                const tInfo = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[tKey]) ? TOWER_DATA[tKey] : { name: tKey, color: "#3b82f6" };
                const emblem = (typeof TOWER_EMBLEMS !== 'undefined' && TOWER_EMBLEMS[tKey]) || '🏰';
                combinedEntries.push({
                    name: tInfo.name,
                    emblem: emblem,
                    color: tInfo.color || "#3b82f6",
                    damage: d.damage,
                    kills: d.kills || 0,
                    isHero: false
                });
            }
        }
        for (const [cId, cDmg] of Object.entries(cmdStatsObj)) {
            if (cDmg > 0) {
                const cInfo = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA[cId]) ? CHARACTER_DATA[cId] : { name: cId, avatar: '⚡', grade: 'UR' };
                combinedEntries.push({
                    name: `${cInfo.name} (강림 요격)`,
                    emblem: cInfo.avatar || '⚡',
                    color: cInfo.grade === 'U' ? "#c084fc" : "#f43f5e",
                    damage: cDmg,
                    kills: null,
                    isHero: true
                });
            }
        }

        if (combinedEntries.length === 0) {
            towersList.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 10px;">전투에 참여한 타워 및 지휘관 기록이 없습니다.</div>`;
        } else {
            // 딜량 높은 순으로 정렬
            combinedEntries.sort((a, b) => b.damage - a.damage);

            combinedEntries.forEach(item => {
                const pct = totalDmg > 0 ? Math.round((item.damage / totalDmg) * 100) : 0;
                const killText = item.isHero ? `⚡ 결전 요격` : `<strong>${item.kills}</strong> Kills`;

                const row = document.createElement("div");
                row.className = "report-tower-row";
                row.innerHTML = `
                    <div class="report-tower-info">
                        <span style="font-size: 16px;">${item.emblem}</span>
                        <span style="color:${item.color}">${item.name}</span>
                    </div>
                    <div class="report-progress-bar-wrap">
                        <div class="report-progress-fill" style="width: ${pct}%; background: ${item.color};"></div>
                    </div>
                    <div class="report-tower-stats">
                        <strong>${Math.round(item.damage).toLocaleString()}</strong> DMG (${pct}%) / ${killText}
                    </div>
                `;
                towersList.appendChild(row);
            });
        }
    }

    // 5. 전술 피드백 한 줄 팁
    const tipEl = document.getElementById("report-tactical-tip");
    if (tipEl) {
        const wasted = (typeof battleStats !== 'undefined') ? Math.round(battleStats.wastedOverkillDamage || 0) : 0;
        if (wasted > 20) {
            tipEl.innerHTML = `💡 <strong>전술 피드백</strong>: 오버킬로 인해 <strong>${wasted} DMG</strong>의 딜 누수가 발생했습니다. 타워를 분산 배치해 화망을 넓혀보세요!`;
        } else if (!isVictory) {
            tipEl.innerHTML = `💡 <strong>전술 피드백</strong>: 몬스터가 90도 회전할 때 감속되므로, 킬존 사거리 안에 <strong>'U턴 코너'</strong>를 2개 이상 구축해보세요!`;
        } else {
            tipEl.innerHTML = `💡 <strong>전술 피드백</strong>: 완벽한 화망 구축이었습니다! 다음 챕터에서도 지휘관의 시너지와 코너 킬존을 활용해보세요.`;
        }
    }

    modal.classList.add("active");
}

/**
 * 전투 결과 현황판 닫기
 */
function closeBattleReport() {
    const modal = document.getElementById("battle-report-modal");
    if (modal) {
        modal.classList.remove("active");
    }
    location.reload();
}
