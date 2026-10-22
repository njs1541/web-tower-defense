const USER_DATA = {
    gold: 0,
    pp: 2,         // 프리즘 포인트 (미소녀 지휘관 캐릭터 소환용, 기본 2개)
    rp: 10,        // 룬 포인트 (룬 소환용, 기본 10개)
    inventory: [], // 보유한 타워 ID 목록 (예: ['ranged', 'melee'])
    deck: [],      // 출전 덱 (최대 4장) (Phase D)
    fragments: {}, // { 'ranged': 5, 'melee': 2 }
    levels: {},    // { 'ranged': 1, 'melee': 1 }
    talents: {     // 연구소 영구 특성 레벨 (Phase D)
        startGold: 0,
        maxHp: 0,
        towerPower: 0
    },
    // 미소녀 지휘관 캐릭터 시스템 (v0.22.0)
    characters: {},
    characterDeck: [], // 출전 캐릭터 덱 (최대 3명)
    runes: []          // 보유 룬 ID 목록
};

const STORAGE_KEY = "tower_defense_save_v1";

// 데이터 로드
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(USER_DATA, parsed);
            
            // 버전 호환성 초기화
            if (!USER_DATA.levels) USER_DATA.levels = {};
            if (!USER_DATA.talents) {
                USER_DATA.talents = { startGold: 0, maxHp: 0, towerPower: 0 };
            }
            if (!USER_DATA.deck || USER_DATA.deck.length === 0) {
                USER_DATA.deck = (USER_DATA.inventory && USER_DATA.inventory.length > 0) 
                    ? USER_DATA.inventory.slice(0, 4) 
                    : ['ranged', 'melee'];
            }

            // v0.22.0 캐릭터 & 룬 & 재화 호환성 마이그레이션
            if (USER_DATA.pp === undefined) USER_DATA.pp = 2;
            if (USER_DATA.rp === undefined) USER_DATA.rp = 10;
            if (!USER_DATA.characters || Object.keys(USER_DATA.characters).length === 0) {
                USER_DATA.characters = {
                    char_liana: { id: "char_liana", star: 1, sockets: 1, equippedRunes: ["rune_flame"] },
                    char_elena: { id: "char_elena", star: 1, sockets: 1, equippedRunes: ["rune_spell_gold"] }
                };
            }
            if (!USER_DATA.characterDeck || USER_DATA.characterDeck.length === 0) {
                USER_DATA.characterDeck = ["char_liana", "char_elena"];
            }
            if (!USER_DATA.runes || USER_DATA.runes.length === 0) {
                USER_DATA.runes = ["rune_flame", "rune_spell_gold"];
            }

            console.log("저장된 데이터 로드 완료 (v0.22.0 호환):", USER_DATA);
        } catch (e) {
            console.error("데이터 로드 실패, 초기화합니다.", e);
            initDefaultData();
        }
    } else {
        console.log("저장된 데이터 없음, 새로 시작합니다.");
        initDefaultData();
    }
}

// 초기 데이터 설정
function initDefaultData() {
    USER_DATA.gold = 0;
    USER_DATA.pp = 2;  // 기본 2회 소환 분량
    USER_DATA.rp = 10; // 기본 10회 소환 분량
    USER_DATA.inventory = ['ranged', 'melee']; // 기본 타워 지급
    USER_DATA.deck = ['ranged', 'melee'];      // 기본 출전 덱
    USER_DATA.fragments = {};
    USER_DATA.levels = { 'ranged': 1, 'melee': 1 };
    USER_DATA.talents = { startGold: 0, maxHp: 0, towerPower: 0 };

    // 기본 캐릭터 및 룬 세팅
    USER_DATA.characters = {
        char_liana: { id: "char_liana", star: 1, sockets: 1, equippedRunes: ["rune_flame"] },
        char_elena: { id: "char_elena", star: 1, sockets: 1, equippedRunes: ["rune_spell_gold"] }
    };
    USER_DATA.characterDeck = ["char_liana", "char_elena"];
    USER_DATA.runes = ["rune_flame", "rune_spell_gold"];

    saveData();
}

// 데이터 저장
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(USER_DATA));
}

// 카드 추가
function addCard(towerId) {
    if (!USER_DATA.inventory.includes(towerId)) {
        USER_DATA.inventory.push(towerId);
        if (!USER_DATA.levels[towerId]) {
            USER_DATA.levels[towerId] = 1;
        }
        // 덱에 여유가 있다면 자동 등록
        if (USER_DATA.deck.length < 4 && !USER_DATA.deck.includes(towerId)) {
            USER_DATA.deck.push(towerId);
        }
        saveData();
        console.log(`${towerId} 카드 획득!`);
        return true;
    }
    return false;
}

// 조각 추가
function addFragment(towerId, amount) {
    if (!USER_DATA.fragments[towerId]) {
        USER_DATA.fragments[towerId] = 0;
    }
    USER_DATA.fragments[towerId] += amount;
    saveData();
    console.log(`${towerId} 조각 ${amount}개 획득! (현재: ${USER_DATA.fragments[towerId]})`);
}

// 골드 추가
function addUserGold(amount) {
    USER_DATA.gold += amount;
    saveData();
}

/**
 * 덱(출전 카드) 장착/해제 토글 (Phase D)
 */
function toggleDeckCard(towerId) {
    if (!USER_DATA.deck) USER_DATA.deck = [];

    const isDeck = USER_DATA.deck.includes(towerId);

    if (isDeck) {
        if (USER_DATA.deck.length <= 1) {
            alert("출전 덱에는 최소 1장의 카드가 장착되어 있어야 합니다!");
            return false;
        }
        USER_DATA.deck = USER_DATA.deck.filter(id => id !== towerId);
        console.log(`${towerId} 덱에서 제외`);
    } else {
        if (USER_DATA.deck.length >= 4) {
            alert("출전 덱은 최대 4장까지만 장착할 수 있습니다!");
            return false;
        }
        USER_DATA.deck.push(towerId);
        console.log(`${towerId} 덱에 장착`);
    }

    saveData();
    return true;
}

/**
 * 연구소 영구 특성 업그레이드 (Phase D)
 */
function upgradeTalent(talentKey) {
    const talentInfo = TALENT_DATA[talentKey];
    if (!talentInfo) return false;

    if (!USER_DATA.talents) USER_DATA.talents = {};
    const currentLv = USER_DATA.talents[talentKey] || 0;

    if (currentLv >= talentInfo.maxLevel) {
        alert("이미 최고 레벨에 도달했습니다!");
        return false;
    }

    const cost = (currentLv + 1) * talentInfo.baseCost;
    if (USER_DATA.gold < cost) {
        alert(`골드가 부족합니다! (필요: ${cost}G, 보유: ${USER_DATA.gold}G)`);
        return false;
    }

    USER_DATA.gold -= cost;
    USER_DATA.talents[talentKey] = currentLv + 1;
    saveData();
    return true;
}

/**
 * 타워 업그레이드 (최대 5레벨)
 */
function upgradeTower(towerId) {
    if (!USER_DATA.levels[towerId]) USER_DATA.levels[towerId] = 1;

    const currentLv = USER_DATA.levels[towerId];
    if (currentLv >= 5) {
        alert("최대 레벨(Lv.5)에 도달했습니다!");
        return false;
    }

    const cost = currentLv * 10;
    const currentFrags = USER_DATA.fragments[towerId] || 0;

    if (currentFrags < cost) {
        alert(`조각이 부족합니다! (필요: ${cost}, 보유: ${currentFrags})`);
        return false;
    }

    USER_DATA.fragments[towerId] -= cost;
    USER_DATA.levels[towerId] += 1;
    saveData();
    console.log(`${towerId} 업그레이드 완료! Lv.${currentLv} -> Lv.${USER_DATA.levels[towerId]}`);
    return true;
}

// 타워 스탯 계산 (기본 스탯 + 메타 레벨 + 인게임 강화 레벨 + 연구소 특성 보정)
function getTowerStats(towerId, towerDataOrigin, inGameLevel = 0) {
    const base = towerDataOrigin[towerId];
    if (!base) return null;

    const lv = USER_DATA.levels[towerId] || 1;
    // 메타 레벨당 데미지 10% 증가
    const metaMultiplier = 1 + (lv - 1) * 0.1;

    // v0.22.0 인게임 타워 강화: 레벨당 데미지 25% 추가 증가
    const inGameMultiplier = 1 + (inGameLevel * 0.25);

    // 연구소 특성: 타워 파워 (+5% per Lv) (Phase D)
    const talentPowerLv = (USER_DATA.talents && USER_DATA.talents.towerPower) || 0;
    const talentMultiplier = 1 + (talentPowerLv * 0.05);

    return {
        ...base,
        damage: base.damage * metaMultiplier * inGameMultiplier * talentMultiplier,
        level: lv,
        inGameLevel: inGameLevel
    };
}


/**
 * 카드를 초기화(제거)합니다.
 */
function resetCardData(towerId) {
    USER_DATA.inventory = USER_DATA.inventory.filter(id => id !== towerId);
    if (USER_DATA.deck) {
        USER_DATA.deck = USER_DATA.deck.filter(id => id !== towerId);
    }
    if (USER_DATA.levels) USER_DATA.levels[towerId] = 1;
    if (USER_DATA.fragments) USER_DATA.fragments[towerId] = 0;

    saveData();
    console.log(`${towerId} 카드 데이터 초기화 완료.`);
    return true;
}

/**
 * 조각제작 (정가 구매)
 */
function craftCard(towerId) {
    if (USER_DATA.inventory.includes(towerId)) {
        alert("이미 보유한 카드입니다.");
        return false;
    }

    const cost = 30;
    const currentFrags = USER_DATA.fragments[towerId] || 0;

    if (currentFrags < cost) {
        alert(`조각이 부족합니다! (필요: ${cost}, 보유: ${currentFrags})`);
        return false;
    }

    USER_DATA.fragments[towerId] -= cost;
    USER_DATA.inventory.push(towerId);
    USER_DATA.levels[towerId] = 1;

    // 덱 빈자리 있으면 자동 장착
    if (USER_DATA.deck && USER_DATA.deck.length < 4) {
        USER_DATA.deck.push(towerId);
    }

    saveData();
    console.log(`${towerId} 제작 완료!`);
    return true;
}

/**
 * 게임 데이터 완전 초기화 (Hard Reset)
 */
function hardResetGame() {
    localStorage.removeItem(STORAGE_KEY);
    console.log("게임 세이브 데이터가 완전히 삭제되었습니다.");
    location.reload();
}

/**
 * 현재 출전 덱에 편성된 캐릭터들로부터 타워별 최대 강화 한도(Level Cap) 총합 계산 (v0.22.0)
 * @returns {Object} { ranged: 2, melee: 1, ice: 0, bomb: 0 }
 */
function calculateDeckTowerCaps() {
    const caps = { ranged: 0, melee: 0, ice: 0, bomb: 0 };
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return caps;

    for (const charId of USER_DATA.characterDeck) {
        const charInfo = CHARACTER_DATA[charId];
        if (charInfo && charInfo.levelCaps) {
            for (const [towerType, capBonus] of Object.entries(charInfo.levelCaps)) {
                caps[towerType] = (caps[towerType] || 0) + capBonus;
            }
        }
    }
    return caps;
}

/**
 * 캐릭터 덱 장착/해제 토글 (최대 3인 덱)
 */
function toggleCharacterDeck(charId) {
    if (!USER_DATA.characterDeck) USER_DATA.characterDeck = [];
    const idx = USER_DATA.characterDeck.indexOf(charId);

    if (idx !== -1) {
        // 이미 덱에 있으면 해제 (최소 1명 유지 권장)
        if (USER_DATA.characterDeck.length <= 1) {
            alert("최소 1명의 지휘관은 덱에 출전해야 합니다.");
            return false;
        }
        USER_DATA.characterDeck.splice(idx, 1);
        saveData();
        return true;
    } else {
        // 덱에 없으면 추가 (최대 3명)
        if (USER_DATA.characterDeck.length >= 3) {
            alert("출전 덱에는 최대 3명의 지휘관까지만 편성할 수 있습니다.");
            return false;
        }
        USER_DATA.characterDeck.push(charId);
        saveData();
        return true;
    }
}

/**
 * 신규 캐릭터 획득
 */
/**
 * 신규 캐릭터 획득 또는 중복 획득 시 성급 승급 & 소켓 추가 해금 (v0.23.0)
 */
function addCharacterOrDuplicate(charId) {
    if (!CHARACTER_DATA[charId]) return null;
    if (!USER_DATA.characters) USER_DATA.characters = {};

    const charBase = CHARACTER_DATA[charId];

    // 1. 신규 획득
    if (!USER_DATA.characters[charId]) {
        USER_DATA.characters[charId] = {
            id: charId,
            star: 1,
            starExp: 0,
            sockets: charBase.baseSockets || 1,
            equippedRunes: []
        };
        // 덱에 빈자리가 있다면 자동 편성
        if (USER_DATA.characterDeck && USER_DATA.characterDeck.length < 3) {
            USER_DATA.characterDeck.push(charId);
        }
        saveData();
        return { isNew: true, star: 1, sockets: charBase.baseSockets || 1 };
    }

    // 2. 중복 획득 -> 성급 강화 경험치 누적
    const char = USER_DATA.characters[charId];
    char.starExp = (char.starExp || 0) + 1;
    const reqExp = char.star || 1; // 1성->2성: 1개, 2성->3성: 2개
    let upgraded = false;

    if (char.starExp >= reqExp && char.star < 5) {
        char.starExp -= reqExp;
        char.star += 1;
        upgraded = true;
        // 최대 소켓 수 한도 내에서 소켓 추가 해금!
        if (char.sockets < (charBase.maxSockets || 3)) {
            char.sockets += 1;
        }
    }

    saveData();
    return { isNew: false, upgraded: upgraded, star: char.star, sockets: char.sockets, exp: char.starExp, reqExp: char.star };
}

// 하위 호환
function addCharacter(charId) {
    return addCharacterOrDuplicate(charId);
}

/**
 * 신규 룬 획득
 */
function addRune(runeId) {
    if (!RUNE_DATA[runeId]) return false;
    if (!USER_DATA.runes) USER_DATA.runes = [];
    USER_DATA.runes.push(runeId);
    saveData();
    return true;
}

/**
 * 캐릭터 소켓에 룬 장착
 */
function equipRuneToCharacter(charId, socketIndex, runeId) {
    const char = USER_DATA.characters[charId];
    if (!char) return false;
    if (!char.equippedRunes) char.equippedRunes = [];

    // 유효한 소켓 인덱스인지 확인
    if (socketIndex >= char.sockets) return false;

    char.equippedRunes[socketIndex] = runeId;
    saveData();
    return true;
}

/**
 * 캐릭터 소켓에서 룬 장착 해제
 */
function unequipRuneFromCharacter(charId, socketIndex) {
    const char = USER_DATA.characters[charId];
    if (!char || !char.equippedRunes) return false;

    char.equippedRunes[socketIndex] = null;
    saveData();
    return true;
}

/**
 * 현재 출전 덱에 편성된 지휘관들이 장착 중인 액티브 스펠 룬 목록 조회 (인게임 스펠 UI용)
 * @returns {Array} [{ charId, socketIndex, runeId, runeInfo }]
 */
function getEquippedSpellRunes() {
    const list = [];
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return list;

    for (const charId of USER_DATA.characterDeck) {
        const char = USER_DATA.characters && USER_DATA.characters[charId];
        if (!char || !char.equippedRunes) continue;

        char.equippedRunes.forEach((runeId, idx) => {
            if (!runeId) return;
            const runeInfo = RUNE_DATA[runeId];
            if (runeInfo && runeInfo.type === 'spell') {
                list.push({
                    charId: charId,
                    socketIndex: idx,
                    runeId: runeId,
                    runeInfo: runeInfo
                });
            }
        });
    }
    return list;
}


