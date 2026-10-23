/**
 * 상점 및 가챠 소환 전담 모듈 (js/gacha.js)
 * v0.26.1: 1) 미소녀 지휘관 소환(1 PP), 2) 신비한 룬 소환(5 RP) 2대 소환 제단
 */

let lastGachaType = 'commander'; // 'commander', 'rune'

/**
 * 상점 UI 열기/닫기 토글
 */
function toggleShop() {
    const shop = document.getElementById("shop-ui");
    if (!shop) return;
    shop.style.display = (shop.style.display === "none" || shop.style.display === "") ? "block" : "none";
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
            image: charBase.image,
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
            image: charBase.image,
            emblem: charBase.avatar || "👑",
            title: `${charBase.name} ★${result.star}`,
            desc: charBase.desc,
            detail: upgradeMsg
        };
    }

    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    // v0.28.0: 도파민 소환 시퀀스 (등급별 오라 마법진 회전 후 모달 분기)
    playSummonSequence(charBase.grade, result.isNew, () => {
        if (result.isNew) {
            openNewCommanderModal(charId, result);
        } else {
            openGachaModal(gachaResultData);
        }
    });
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
        isLegendary: runeInfo.grade === 'SR' || runeInfo.grade === 'UR' || runeInfo.grade === 'U' || runeInfo.grade === 'R',
        emblem: runeInfo.icon || "🔮",
        title: runeInfo.name,
        desc: runeInfo.desc,
        detail: isSpell ? `인게임에서 마나(MP ${runeInfo.mpCost})를 소모해 발동 가능!` : `지휘관 소켓에 장착하여 타워에 패시브 부여!`
    };

    if (typeof updateLobbyUI === 'function') updateLobbyUI();

    // v0.28.0: 도파민 소환 시퀀스 적용
    playSummonSequence(runeInfo.grade, false, () => {
        openGachaModal(gachaResultData);
    });
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
    if (emblem) {
        if (data.image) {
            emblem.innerHTML = `<img src="${data.image}" style="width: 76px; height: 76px; border-radius: 12px; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid rgba(255,255,255,0.8);">`;
        } else {
            emblem.innerText = data.emblem || "🔮";
        }
    }
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
        if (lastGachaType === 'rune') {
            drawRuneGacha();
        } else {
            drawCommanderGacha();
        }
    }, 150);
}

/**
 * 차원 소환 시퀀스 오버레이 연출 (v0.28.0 New - 도파민 연출)
 * 등급에 따라 마법진의 회전 속도, 발광 색상, 스크린 쉐이크 차별화
 */
function playSummonSequence(grade, isNew, callback) {
    const seqOverlay = document.getElementById("gacha-summon-sequence");
    const circle = document.getElementById("summon-magic-circle");
    const hintEl = document.getElementById("summon-gate-grade-hint");

    if (!seqOverlay || !circle) {
        if (callback) callback();
        return;
    }

    // 등급별 스타일 및 텍스트 힌트 매핑
    circle.className = "summon-magic-circle";
    seqOverlay.classList.remove("screen-shake");

    let auraClass = "aura-normal";
    let hintText = "미지의 푸른 파동이 전장에 공명합니다...";

    if (grade === 'R') {
        auraClass = "aura-rare";
        hintText = "신비로운 보랏빛 마법진이 활성화됩니다...!";
    } else if (grade === 'SR') {
        auraClass = "aura-epic";
        hintText = "찬란한 황금빛 마력이 뿜어져 나옵니다!!";
    } else if (grade === 'UR' || grade === 'U') {
        auraClass = "aura-legendary";
        hintText = "경이로운 무지갯빛 천상의 기운이 소용돌이칩니다!!!";
        seqOverlay.classList.add("screen-shake");
    }

    circle.classList.add(auraClass);
    if (hintEl) hintEl.textContent = hintText;

    seqOverlay.style.display = "flex";

    // 1.25초 후 소환 시퀀스 페이드아웃 및 결과창 호출
    setTimeout(() => {
        seqOverlay.style.display = "none";
        seqOverlay.classList.remove("screen-shake");
        if (callback) callback();
    }, 1250);
}

/**
 * 텍스트 타이핑 애니메이션 헬퍼
 */
let typingTimer = null;
function playTypewriterEffect(el, text, speed = 35) {
    if (!el) return;
    if (typingTimer) clearInterval(typingTimer);
    el.textContent = "";
    let i = 0;
    typingTimer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typingTimer);
            typingTimer = null;
        }
    }, speed);
}

/**
 * 신규 지휘관 최초 획득 풀스크린 딤드 모달 오픈 (v0.27.1 / v0.28.0 타이핑 대사 확장)
 */
function openNewCommanderModal(charId, result) {
    const modal = document.getElementById("new-commander-modal");
    if (!modal) return;

    const charBase = CHARACTER_DATA[charId];
    if (!charBase) return;

    const gradeInfo = CARD_GRADES[charBase.grade] || { name: charBase.grade, color: "#3b82f6", bg: "rgba(59,130,246,0.2)", border: "#3b82f6" };

    const imgEl = document.getElementById("new-char-img");
    const gradeEl = document.getElementById("new-char-grade-badge");
    const titleEl = document.getElementById("new-char-title");
    const nameEl = document.getElementById("new-char-name");
    const descEl = document.getElementById("new-char-desc");
    const licenseEl = document.getElementById("new-char-license");
    const speechEl = document.getElementById("new-char-speech-text");

    if (imgEl) {
        imgEl.src = charBase.image || "";
        imgEl.alt = charBase.name;
    }

    if (gradeEl) {
        gradeEl.textContent = `${gradeInfo.name} (${charBase.grade})`;
        gradeEl.style.background = gradeInfo.bg;
        gradeEl.style.color = gradeInfo.color;
        gradeEl.style.borderColor = gradeInfo.border || gradeInfo.color;
    }

    if (titleEl) titleEl.textContent = charBase.title || "지휘관";
    if (nameEl) nameEl.textContent = charBase.name;
    if (descEl) descEl.textContent = charBase.desc || "새로운 지휘관이 영지에 합류했습니다!";

    // 지휘관 시그니처 대사 타이핑 출력 (v0.28.0 New)
    const quote = (charBase.quotes && charBase.quotes.length > 0) ? charBase.quotes[0] : (charBase.desc || "지휘관님, 합류를 명 받았습니다!");
    if (speechEl) {
        playTypewriterEffect(speechEl, `"${quote}"`, 30);
    }

    // 인가 타워 및 보급 정보 요약
    if (licenseEl) {
        const caps = [];
        if (charBase.towerCaps) {
            for (const [tType, capVal] of Object.entries(charBase.towerCaps)) {
                const tName = (typeof TOWER_DATA !== 'undefined' && TOWER_DATA[tType]) ? TOWER_DATA[tType].name.replace(" 타워", "") : tType;
                caps.push(`${tName} Lv.${capVal}`);
            }
        }
        const capsText = caps.length > 0 ? caps.join(", ") : "기본 타워";

        const supplies = [];
        if (charBase.initialSupplies) {
            for (const [sKey, sCount] of Object.entries(charBase.initialSupplies)) {
                if (sCount > 0) {
                    const sName = (sKey === 'base') ? '기반' : ((typeof TOWER_DATA !== 'undefined' && TOWER_DATA[sKey]) ? TOWER_DATA[sKey].name.replace(" 타워", "") : sKey);
                    supplies.push(`${sName} ${sCount}${sKey === 'base' ? '개' : '기'}`);
                }
            }
        }
        const suppliesText = supplies.length > 0 ? supplies.join(", ") : "없음";

        licenseEl.innerHTML = `
            <div>🏗️ <strong>인가 타워 한도</strong>: ${capsText}</div>
            <div style="margin-top: 4px;">🎁 <strong>시작 무료 보급</strong>: ${suppliesText}</div>
            <div style="margin-top: 4px; color: #a5b4fc;">🔮 <strong>기본 룬 소켓</strong>: ${result.sockets || 1}칸 개방</div>
        `;
    }

    modal.style.display = "flex";
}

/**
 * 신규 지휘관 최초 획득 모달 닫기
 */
function closeNewCommanderModal() {
    const modal = document.getElementById("new-commander-modal");
    if (modal) {
        modal.style.display = "none";
    }
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }
}


