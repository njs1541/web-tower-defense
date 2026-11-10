const USER_DATA = {
    gold: 0,
    pp: 2,         // 프리즘 포인트 (미소녀 지휘관 캐릭터 소환용, 기본 2개)
    rp: 10,        // 룬 포인트 (룬 소환용, 기본 10개)
    prismShards: 0, // [v0.42.0] 프리즘 조각 (100개 모이면 1 PP로 자동 합성)
    commanderPityCount: 0, // [v0.42.0] 지휘관 가챠 천장 스택
    stageFirstClears: {},  // [v0.42.0] 스테이지 구간별 최초 클리어 여부 { stage1_10: true, ... }
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
    runes: [],         // 보유 룬 ID 목록
    settings: { sfxMuted: false, sfxVolume: 0.5 }, // [v0.53.6] 효과음 설정 (sound.js)
    tutorialDone: false // [v0.53.8] 첫 판 튜토리얼 완료 여부 (tutorial.js)
};

const STORAGE_KEY = "tower_defense_save_v1";

// [v0.53.4] 세이브 스키마 버전과 백업 (워크플로 P2-3)
// - schemaVersion: 필드 구조가 바뀌면 올리고 migrateSaveData에 단계를 추가한다. (없음 = 0, v0.53.4 이전 세이브)
// - 백업: 정상 로드에 성공한 원본을 SAVE_BACKUP_KEY에 보관한다. 본 세이브를 읽지 못하면 원본은
//   SAVE_CORRUPT_KEY에 보존하고(덮어쓰지 않음) 백업으로 복구를 시도한다. 기존에는 바로 초기화되었다.
const SAVE_SCHEMA_VERSION = 1;
const SAVE_BACKUP_KEY = STORAGE_KEY + "_backup";
const SAVE_CORRUPT_KEY = STORAGE_KEY + "_corrupt";

function parseStoredSave(raw) {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error("세이브 형식이 올바르지 않습니다.");
    }
    return data;
}

/**
 * 구버전 세이브를 현재 스키마로 올린다. 기본값 채우기는 loadData에서 이어서 처리한다.
 */
function migrateSaveData(data) {
    const from = Number(data.schemaVersion) || 0;
    // v0 → v1: 구조 변경 없음 (schemaVersion 필드 도입)
    data.schemaVersion = Math.max(from, SAVE_SCHEMA_VERSION);
    return data;
}

// 데이터 로드
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        let parsed = null;
        let source = 'main';
        try {
            parsed = parseStoredSave(saved);
        } catch (e) {
            console.error("세이브를 읽지 못했습니다. 원본을 보존하고 백업으로 복구를 시도합니다.", e);
            try { localStorage.setItem(SAVE_CORRUPT_KEY, saved); } catch (e2) { console.error("손상 세이브 보존 실패", e2); }
            const backup = localStorage.getItem(SAVE_BACKUP_KEY);
            if (backup) {
                try {
                    parsed = parseStoredSave(backup);
                    source = 'backup';
                    console.warn("백업 세이브로 복구했습니다.");
                } catch (e3) {
                    console.error("백업 세이브도 읽지 못했습니다.", e3);
                }
            }
        }
        if (!parsed) {
            initDefaultData();
            return;
        }
        try {
            migrateSaveData(parsed);
            Object.assign(USER_DATA, parsed);
            // [v0.53.8] 튜토리얼 도입 전 세이브는 이미 플레이한 계정이므로 완료로 간주
            if (typeof parsed.tutorialDone !== 'boolean') USER_DATA.tutorialDone = true;
            
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
            if (USER_DATA.prismShards === undefined) USER_DATA.prismShards = 0;
            if (USER_DATA.commanderPityCount === undefined) USER_DATA.commanderPityCount = 0;
            if (!USER_DATA.stageFirstClears) USER_DATA.stageFirstClears = {};
            // [v0.53.6] 효과음 설정
            if (!USER_DATA.settings || typeof USER_DATA.settings !== 'object') USER_DATA.settings = {};
            if (typeof USER_DATA.settings.sfxMuted !== 'boolean') USER_DATA.settings.sfxMuted = false;
            if (typeof USER_DATA.settings.sfxVolume !== 'number') USER_DATA.settings.sfxVolume = 0.5;
            // v0.44.0 게임에서 제외된 지휘관을 세이브에서 정리 (덱이 비면 아래 기본값으로 복구)
            if (USER_DATA.characters) {
                for (const charId of Object.keys(USER_DATA.characters)) {
                    if (!CHARACTER_DATA[charId]) delete USER_DATA.characters[charId];
                }
            }
            if (Array.isArray(USER_DATA.characterDeck)) {
                USER_DATA.characterDeck = USER_DATA.characterDeck.filter(charId => CHARACTER_DATA[charId]);
            }
            if (!USER_DATA.characters || Object.keys(USER_DATA.characters).length === 0) {
                USER_DATA.characters = getDefaultStarterCharacters();
            }
            if (!USER_DATA.characterDeck || USER_DATA.characterDeck.length === 0) {
                USER_DATA.characterDeck = ["char_liana", "char_elena"];
            }
            if (!USER_DATA.runes || USER_DATA.runes.length === 0) {
                USER_DATA.runes = ["rune_flame", "rune_spell_gold"];
            }

            // [v0.44.0] 티타니아(U) 로드 시 강제 지급 제거 -> QA 치트 패널(Ctrl+J)의 qaGrantTitania()로 이전
            // [v0.44.0] 보유 수량을 초과하여 중복 장착된 룬 정리 (구버전 세이브 호환)
            sanitizeRuneEquips();
            // 정상 로드된 원본을 백업으로 보관 (백업에서 복구한 경우에는 기존 백업 유지)
            if (source === 'main') {
                try { localStorage.setItem(SAVE_BACKUP_KEY, saved); } catch (e) { console.error("세이브 백업 실패", e); }
            }
            saveData();

            console.log(`저장된 데이터 로드 완료 (출처: ${source}, 스키마 v${USER_DATA.schemaVersion}):`, USER_DATA);
        } catch (e) {
            // 기본값 채우기 중 예외: 원본을 보존한 뒤 초기화한다
            console.error("데이터 로드 실패, 원본을 보존하고 초기화합니다.", e);
            try { localStorage.setItem(SAVE_CORRUPT_KEY, saved); } catch (e2) { console.error("손상 세이브 보존 실패", e2); }
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

    // 기본 캐릭터 및 룬 세팅 (v0.44.0: 티타니아 기본 지급 제거 -> QA 치트 패널에서 지급)
    USER_DATA.characters = getDefaultStarterCharacters();
    USER_DATA.characterDeck = ["char_liana", "char_elena"];
    USER_DATA.runes = ["rune_flame", "rune_spell_gold"];
    USER_DATA.tutorialDone = false; // [v0.53.8] 신규 계정은 첫 판에 튜토리얼

    saveData();
}

/**
 * [v0.44.0] 신규 유저 기본 지급 지휘관 (C 리아나 + UC 엘레나)
 */
function getDefaultStarterCharacters() {
    return {
        char_liana: { id: "char_liana", star: 1, starExp: 0, sockets: 1, equippedRunes: ["rune_flame"] },
        char_elena: { id: "char_elena", star: 1, starExp: 0, sockets: 1, equippedRunes: ["rune_spell_gold"] }
    };
}

/**
 * [v0.44.0] 룬 보유 수량 조회
 */
function getRuneOwnedCount(runeId) {
    return (USER_DATA.runes || []).filter(id => id === runeId).length;
}

/**
 * [v0.44.0] 전체 지휘관 소켓에 장착된 특정 룬 수량 조회
 * @param {string} runeId
 * @param {Object} [exclude] - 제외할 소켓 { charId, socketIndex } (교체 장착 시 기존 소켓 제외)
 */
function getRuneEquippedCount(runeId, exclude = null) {
    let count = 0;
    for (const [cId, c] of Object.entries(USER_DATA.characters || {})) {
        if (!c || !Array.isArray(c.equippedRunes)) continue;
        c.equippedRunes.forEach((rId, idx) => {
            if (rId !== runeId) return;
            if (exclude && exclude.charId === cId && exclude.socketIndex === idx) return;
            count++;
        });
    }
    return count;
}

/**
 * [v0.44.0] 보유 수량을 초과하여 장착된 룬을 소켓에서 해제 (1개 룬 무한 중복 장착 방지)
 */
function sanitizeRuneEquips() {
    const usage = {};
    for (const c of Object.values(USER_DATA.characters || {})) {
        if (!c || !Array.isArray(c.equippedRunes)) continue;
        c.equippedRunes = c.equippedRunes.map(rId => {
            if (!rId) return rId;
            usage[rId] = (usage[rId] || 0) + 1;
            return usage[rId] > getRuneOwnedCount(rId) ? null : rId;
        });
    }
}

// 데이터 저장
function saveData() {
    USER_DATA.schemaVersion = SAVE_SCHEMA_VERSION;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(USER_DATA));
    } catch (e) {
        // 저장 공간 부족이나 사생활 보호 모드 등. 게임 진행은 막지 않는다.
        console.error("세이브 저장 실패", e);
    }
}

/**
 * [v0.53.4] 세이브 내보내기 (워크플로 P2-4): 다른 브라우저로 옮길 수 있는 문자열. 형식 "TD1:" + UTF-8 JSON의 Base64
 */
function exportSaveString() {
    saveData();
    const bytes = new TextEncoder().encode(JSON.stringify(USER_DATA));
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return "TD1:" + btoa(bin);
}

/**
 * [v0.53.4] 세이브 가져오기: 문자열을 검증해 본 세이브로 기록한다. 기존 세이브는 백업 키로 옮긴다.
 * 호출한 쪽에서 location.reload()로 다시 불러온다.
 * @returns {Object} 가져온 세이브 데이터 (요약 표시용)
 */
function importSaveString(text) {
    const s = String(text || "").trim();
    if (!s.startsWith("TD1:")) throw new Error("세이브 문자열 형식이 아닙니다. (TD1:로 시작해야 합니다)");
    let json;
    try {
        const bin = atob(s.slice(4));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        json = new TextDecoder().decode(bytes);
    } catch (e) {
        throw new Error("세이브 문자열이 손상되었습니다.");
    }
    const data = parseStoredSave(json);
    if (!data.characters || typeof data.characters !== 'object') {
        throw new Error("지휘관 정보가 없는 세이브입니다.");
    }
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) localStorage.setItem(SAVE_BACKUP_KEY, current);
    localStorage.setItem(STORAGE_KEY, json);
    return data;
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
    localStorage.removeItem(SAVE_BACKUP_KEY); // 의도적 초기화이므로 백업도 지운다 (손상 보존본은 남김)
    console.log("게임 세이브 데이터가 완전히 삭제되었습니다.");
    location.reload();
}

/**
 * 현재 출전 덱의 대장(총사령관, 1번 슬롯) 정보 및 대장 고유 오버클럭 보너스 조회 (v0.32.0 New)
 * - v0.41.0: 구형 대장 필드 강림 및 오버클럭 보급(extraSupplies) 제거.
 *            현재는 1번 슬롯 지휘관의 '강화 한도(extraCaps) 오버클럭'만 담당하며,
 *            전장 직접 강림은 UR/U 히어로 유닛 시스템(deployedHeroes)이 전담한다.
 */
function getLeaderCommanderInfo() {
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck) || USER_DATA.characterDeck.length === 0) {
        return null;
    }
    const leaderId = USER_DATA.characterDeck[0];
    const charBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[leaderId] : null;
    if (!charBase) return null;

    const grade = charBase.grade || 'C';
    let extraCaps = {};
    let bonusDesc = "";

    // R 등급 이상 대장 임명 시 대장 전용 추가 오버클럭 옵션
    if (grade === 'R') {
        // R (레어): 관장 타워 한도 +1 추가
        if (charBase.levelCaps) {
            for (const tType of Object.keys(charBase.levelCaps)) {
                extraCaps[tType] = 1;
            }
        }
        bonusDesc = "👑 대장 특권: 관장 타워 최대 강화 한도 +1강 추가!";
    } else if (grade === 'SR') {
        // SR (스페셜 레어): 관장 타워 한도 +1 추가
        if (charBase.levelCaps) {
            for (const tType of Object.keys(charBase.levelCaps)) {
                extraCaps[tType] = 1;
            }
        }
        bonusDesc = "👑 대장 특권: 관장 타워 최대 강화 한도 +1강 추가!";
    } else if (grade === 'UR') {
        // UR (울트라 레어): 관장 타워 한도 +2 추가 & 3x3 지휘 오라
        if (charBase.levelCaps) {
            for (const tType of Object.keys(charBase.levelCaps)) {
                extraCaps[tType] = 2;
            }
        }
        bonusDesc = "👑 대장 특권: 관장 타워 한도 +2강 & 전장 직접 강림 결전 오라!";
    } else if (grade === 'U') {
        // U (유니크): 전 타워 한도 +2 추가 & 창세 결전 오라
        extraCaps = { ranged: 2, melee: 2, ice: 2, bomb: 2, sniper: 2 };
        bonusDesc = "👑 대장 특권: 전 타워 한도 +2강 & 창세 결전 여신 강림!";
    }

    return {
        charId: leaderId,
        charBase: charBase,
        grade: grade,
        extraCaps: extraCaps,
        bonusDesc: bonusDesc
    };
}

/**
 * 덱 내 지휘관을 대장(1번 슬롯)으로 지정/교체
 */
function setDeckLeader(charId) {
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return;
    const idx = USER_DATA.characterDeck.indexOf(charId);
    if (idx === -1) return;

    // 해당 캐릭터를 1번 슬롯으로 이동
    USER_DATA.characterDeck.splice(idx, 1);
    USER_DATA.characterDeck.unshift(charId);
    saveData();
}

/**
 * 현재 출전 덱에 편성된 캐릭터들로부터 타워별 최대 강화 한도(Level Cap) 총합 계산 (v0.22.0 / v0.32.0 대장 보너스 반영)
 * @returns {Object} { ranged: 2, melee: 1, ice: 0, bomb: 0 }
 */
function calculateDeckTowerCaps() {
    const caps = { ranged: 0, melee: 0, ice: 0, bomb: 0, sniper: 0 };
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return caps;

    // 1. 기본 편성 지휘관들의 한도 합산
    for (const charId of USER_DATA.characterDeck) {
        const charInfo = CHARACTER_DATA[charId];
        if (charInfo && charInfo.levelCaps) {
            for (const [towerType, capBonus] of Object.entries(charInfo.levelCaps)) {
                caps[towerType] = (caps[towerType] || 0) + capBonus;
            }
        }
    }

    // 2. R 이상 대장 보너스 한도 추가 가산 (v0.32.0 New)
    const leaderInfo = getLeaderCommanderInfo();
    if (leaderInfo && leaderInfo.extraCaps) {
        for (const [tType, extra] of Object.entries(leaderInfo.extraCaps)) {
            caps[tType] = (caps[tType] || 0) + extra;
        }
    }

    // 3. 역할군 시너지 한도 가산 (v0.34.0 New: 수호자 3셋 근거리 +2강)
    if (typeof calculateDeckSynergies === 'function') {
        const syn = calculateDeckSynergies();
        if (syn && syn.bonusStats && syn.bonusStats.meleeExtraCap) {
            caps.melee = (caps.melee || 0) + syn.bonusStats.meleeExtraCap;
        }
    }

    return caps;
}

/**
 * 출전 덱에 편성된 지휘관들로부터 이번 게임에 설치 가능한 고정 타워 스톡(Stock) 총합 계산 (v0.36.0 New)
 * - v0.41.0: UR/U(히어로 유닛) 지휘관은 스톡을 제공하지 않으므로 towerStock이 있더라도 무시한다.
 * @returns {Object} { melee: 4, ranged: 3, ... }
 */
function calculateDeckTowerStocks() {
    const stocks = {};
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return stocks;

    for (const charId of USER_DATA.characterDeck) {
        const charInfo = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
        if (!charInfo || isHeroGradeCommander(charInfo)) continue; // UR 이상은 스톡 0기
        if (charInfo.towerStock) {
            // [v0.42.0 New] 성급(★)에 따른 타워 스톡 보너스: 2성부터 1성 증가당 스톡 +1기 추가!
            const userChar = (USER_DATA.characters && USER_DATA.characters[charId]) || { star: 1 };
            const starBonus = Math.max(0, (userChar.star || 1) - 1);

            for (const [key, count] of Object.entries(charInfo.towerStock)) {
                stocks[key] = (stocks[key] || 0) + count + starBonus;
            }
        }
    }
    return stocks;
}

/**
 * [v0.44.0 New] 특정 지휘관이 제공하는 특정 타워의 스톡 수량 (성급 보너스 포함)
 */
function getCommanderTowerStock(charId, towerType) {
    const charInfo = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
    if (!charInfo || isHeroGradeCommander(charInfo) || !charInfo.towerStock) return 0;
    const base = charInfo.towerStock[towerType] || 0;
    if (base <= 0) return 0;
    const userChar = (USER_DATA.characters && USER_DATA.characters[charId]) || { star: 1 };
    return base + Math.max(0, (userChar.star || 1) - 1);
}

/**
 * [v0.44.0 New] 새로 설치할 타워의 관장 지휘관 결정
 * - 덱 순서대로, 해당 타워 스톡에 여유가 있는 지휘관에게 귀속 (룬 패시브/환급율 결정용)
 * @returns {string|null} charId
 */
function assignTowerOwner(towerType) {
    if (!Array.isArray(USER_DATA.characterDeck)) return null;
    const cells = (typeof board !== 'undefined') ? board : [];
    for (const cId of USER_DATA.characterDeck) {
        const stock = getCommanderTowerStock(cId, towerType);
        if (stock <= 0) continue;
        const placed = cells.filter(c => c.tower === towerType && c.towerOwner === cId).length;
        if (placed < stock) return cId;
    }
    return null;
}

/**
 * UR 이상(UR/U) 히어로 유닛 지휘관 여부 판정 (v0.41.0 New)
 * - UR/U 지휘관은 타워 스톡을 제공하지 않고 전장에 직접 강림한다.
 */
function isHeroGradeCommander(charInfo) {
    if (!charInfo) return false;
    return charInfo.grade === 'UR' || charInfo.grade === 'U';
}

/**
 * 타워가 속한 지휘관 등급에 따른 환급율 계산 (C: 100%, UC: 80%, 기타: 60%) (v0.36.0 New)
 * ⚠️ [재정립 필요 - v0.41.0] 타워 설치비가 0 TP인 현 스톡 체계에서 환급 대상(강화비만? 설치비 포함?)과
 *    등급별 환급율은 추후 재정립 예정. 현재 로직은 임시 유지.
 */
function getTowerRefundRateForCell(cell) {
    if (!cell) return 0.6;
    if (cell.towerOwnerGrade === 'C') return 1.0;
    if (cell.towerOwnerGrade === 'UC') return 0.8;
    return (typeof TOWER_REFUND_RATE !== 'undefined') ? TOWER_REFUND_RATE : 0.6;
}

/**
 * 출전 덱에 편성된 지휘관들로부터 듀얼 시너지(원소 & 역할군) 계산 및 종합 버프 산출 (v0.34.0 New)
 * - 100인 이상의 캐릭터 확장에도 완벽히 대응하는 태그형 시너지 엔진
 * @returns {Object} { activeSynergies, bonusStats, elementCounts, roleCounts }
 */
function calculateDeckSynergies() {
    const result = {
        activeSynergies: [],
        bonusStats: {
            extraHp: 0,                   // holy 2
            roundHpRegen: 0,             // holy 2
            critChance: 0,               // holy 3
            critMultiplier: 2.0,         // holy 3 (2.5)
            extraDamageRatio: 0,         // fire 3 (+0.2), void (+0.1)
            burnChance: 0,               // fire 2 (0.25)
            burnDuration: 3,             // fire 2
            bombSplashExtraRadius: 0,    // fire 3 (+1)
            slowRatioBonus: 0,           // frost 2 (+0.15)
            slowDurationBonusSec: 0,     // frost 2 (+1.5)
            damageToSlowedRatio: 0,      // frost 3 (+0.3)
            attackSpeedRatio: 0,         // shock 2 (+0.18)
            chainChance: 0,              // shock 3 (0.25)
            chainDamageRatio: 0.6,       // shock 3
            extraBasePerRound: 0,        // guardian 2 (+1)
            meleeExtraCap: 0,            // guardian 3 (+2)
            crawlerDemolishTimeMulti: 1.0, // guardian 3 (2.0)
            extraRange: { ranged: 0, sniper: 0 }, // ranger 2 (+1)
            bossFlyingDamageRatio: 0,    // ranger 3 (+0.3)
            extraMpPerKill: 0,           // mage 2 (+1)
            maxMpBonus: 0,               // mage 2 (+20)
            spellPowerRatio: 0,          // mage 3 (+0.3)
            roundClearGoldBonus: 0,      // tactician 2 (+3)
            upgradeCostDiscountRatio: 0  // tactician 3 (0.2)
        },
        elementCounts: {},
        roleCounts: {}
    };

    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck) || typeof SYNERGY_DATA === 'undefined') {
        return result;
    }

    // 1. 덱 내 지휘관들의 원소 및 역할군 카운트 집계
    let hasVoid = false;
    for (const charId of USER_DATA.characterDeck) {
        const charBase = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
        if (!charBase) continue;

        if (charBase.element === 'void') {
            hasVoid = true;
        }

        if (charBase.element) {
            result.elementCounts[charBase.element] = (result.elementCounts[charBase.element] || 0) + 1;
        }
        if (charBase.role) {
            result.roleCounts[charBase.role] = (result.roleCounts[charBase.role] || 0) + 1;
        }
    }

    // 2. 공허(Void) 조커 효과 적용: 다른 모든 원소/역할군 카운트에 +1 기여
    if (hasVoid) {
        const voidData = SYNERGY_DATA.elements.void;
        if (voidData && voidData.tiers[1]) {
            result.activeSynergies.push({
                type: 'element',
                key: 'void',
                count: 1,
                name: `${voidData.symbol} ${voidData.name} (1)`,
                title: voidData.tiers[1].title,
                desc: voidData.tiers[1].desc,
                color: voidData.color,
                bg: voidData.bg,
                border: voidData.border
            });
            result.bonusStats.extraDamageRatio += 0.10;
        }

        // [v0.44.0 밸런스] 조커 부스트는 덱에서 가장 많은 원소 1종 + 역할군 1종에만 +1 적용
        //  (기존: 존재하는 모든 원소/역할군 +1 -> 시너지 6개 동시 활성으로 덱빌딩 고민 소멸)
        //  동률일 경우 덱 순서상 먼저 등장한 태그 우선
        const pickTopKey = (counts, validKeys, field) => {
            let bestKey = null;
            let bestCount = 0;
            for (const cId of USER_DATA.characterDeck) {
                const cb = CHARACTER_DATA[cId];
                const key = cb && cb[field];
                if (!key || key === 'void' || !validKeys.includes(key)) continue;
                if ((counts[key] || 0) > bestCount) {
                    bestCount = counts[key];
                    bestKey = key;
                }
            }
            return bestKey;
        };
        const topElement = pickTopKey(result.elementCounts, Object.keys(SYNERGY_DATA.elements), 'element');
        const topRole = pickTopKey(result.roleCounts, Object.keys(SYNERGY_DATA.roles), 'role');
        if (topElement) result.elementCounts[topElement] += 1;
        if (topRole) result.roleCounts[topRole] += 1;
    }

    // 3. 원소(Element) 시너지 판정 및 버프 합산
    for (const [eKey, count] of Object.entries(result.elementCounts)) {
        if (eKey === 'void') continue;
        const synInfo = SYNERGY_DATA.elements[eKey];
        if (!synInfo) continue;

        const activeTierKey = count >= 3 ? 3 : (count >= 2 ? 2 : null);
        if (activeTierKey && synInfo.tiers[activeTierKey]) {
            const tierData = synInfo.tiers[activeTierKey];
            result.activeSynergies.push({
                type: 'element',
                key: eKey,
                count: count,
                name: `${synInfo.symbol} ${synInfo.name} (${activeTierKey})`,
                title: tierData.title,
                desc: tierData.desc,
                color: synInfo.color,
                bg: synInfo.bg,
                border: synInfo.border
            });

            if (eKey === 'fire') {
                result.bonusStats.burnChance = 0.25;
                if (activeTierKey === 3) {
                    result.bonusStats.bombSplashExtraRadius += 1;
                    result.bonusStats.extraDamageRatio += 0.20;
                }
            } else if (eKey === 'frost') {
                result.bonusStats.slowRatioBonus += 0.15;
                result.bonusStats.slowDurationBonusSec += 1.5;
                if (activeTierKey === 3) {
                    result.bonusStats.damageToSlowedRatio += 0.30;
                }
            } else if (eKey === 'shock') {
                result.bonusStats.attackSpeedRatio += 0.18;
                if (activeTierKey === 3) {
                    result.bonusStats.chainChance = 0.25;
                }
            } else if (eKey === 'holy') {
                result.bonusStats.extraHp += 6;
                result.bonusStats.roundHpRegen += 1;
                if (activeTierKey === 3) {
                    result.bonusStats.critChance += 0.15;
                    result.bonusStats.critMultiplier = 2.5;
                }
            }
        }
    }

    // 4. 역할군(Role) 시너지 판정 및 버프 합산
    for (const [rKey, count] of Object.entries(result.roleCounts)) {
        const roleInfo = SYNERGY_DATA.roles[rKey];
        if (!roleInfo) continue;

        const activeTierKey = count >= 3 ? 3 : (count >= 2 ? 2 : null);
        if (activeTierKey && roleInfo.tiers[activeTierKey]) {
            const tierData = roleInfo.tiers[activeTierKey];
            result.activeSynergies.push({
                type: 'role',
                key: rKey,
                count: count,
                name: `${roleInfo.symbol} ${roleInfo.name} (${activeTierKey})`,
                title: tierData.title,
                desc: tierData.desc,
                color: roleInfo.color,
                bg: roleInfo.bg,
                border: roleInfo.border
            });

            if (rKey === 'guardian') {
                result.bonusStats.extraBasePerRound += 1;
                if (activeTierKey === 3) {
                    result.bonusStats.meleeExtraCap += 2;
                    result.bonusStats.crawlerDemolishTimeMulti = 2.0;
                }
            } else if (rKey === 'ranger') {
                result.bonusStats.extraRange.ranged += 1;
                result.bonusStats.extraRange.sniper += 1;
                if (activeTierKey === 3) {
                    result.bonusStats.bossFlyingDamageRatio += 0.30;
                }
            } else if (rKey === 'mage') {
                result.bonusStats.extraMpPerKill += 1;
                result.bonusStats.maxMpBonus += 20;
                if (activeTierKey === 3) {
                    result.bonusStats.spellPowerRatio += 0.30;
                }
            } else if (rKey === 'tactician') {
                result.bonusStats.roundClearGoldBonus += 3;
                if (activeTierKey === 3) {
                    result.bonusStats.upgradeCostDiscountRatio = 0.20;
                }
            }
        }
    }

    return result;
}

/**
 * 현재 출전한 지휘관 카드들에 등록/관장된 타워 타입 목록(라이선스) 조회 (v0.25.1 New)
 * - v0.41.0: 실제로 설치 가능한 타워 스톡(1기 이상)이 있는 타워만 인가한다.
 *   (levelCaps/대장 오버클럭은 '강화 한도'만 올려줄 뿐 설치 권한을 주지 않음 -> UR/U 히어로 덱에서
 *    0/0 스톡 버튼이 노출되던 문제 정리)
 * @returns {Array<string>} 예: ['melee', 'ranged', 'bomb']
 */
function getAuthorizedTowerTypes() {
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck) || USER_DATA.characterDeck.length === 0) {
        return ['ranged']; // 비상용 기본
    }

    const stocks = calculateDeckTowerStocks();
    return Object.keys(stocks).filter(type => type !== 'base' && stocks[type] > 0);
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
        // [v0.42.0 New] C~SR 타워 빌더 캐릭터의 경우 성급 승급 시 스톡 확장 안내
        console.log(`[${charBase.name}] ★${char.star} 성급 승급 완료! (타워 설치 스톡 +1기 보너스 부여!)`);
    }

    saveData();
    return { isNew: false, upgraded: upgraded, star: char.star, sockets: char.sockets, exp: char.starExp, reqExp: char.star, stockBonus: Math.max(0, (char.star || 1) - 1) };
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

    // [v0.44.0] 보유 수량 검사: 같은 룬은 보유한 개수만큼만 장착 가능
    const owned = getRuneOwnedCount(runeId);
    const equippedElsewhere = getRuneEquippedCount(runeId, { charId, socketIndex });
    if (equippedElsewhere >= owned) {
        const rName = (RUNE_DATA[runeId] && RUNE_DATA[runeId].name) || runeId;
        alert(`⚠️ 장착 가능한 '${rName}'이(가) 없습니다! (보유 ${owned}개 / 다른 소켓 장착 ${equippedElsewhere}개)`);
        return false;
    }

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

/**
 * 현재 출전 덱에 편성된 지휘관들이 장착 중인 속성(패시브) 룬 효과 집계 (v0.24.0 New)
 * @returns {Object} 패시브 효과 집계 객체
 */
function getActiveRunePassives(ownerCharId) {
    const passives = {
        burn: false,          // 화염 도트 여부
        burnDuration: 3,
        burnRatio: 0,
        critChance: 0,        // 치명타 확률
        critMultiplier: 2.0,
        chainChance: 0,       // 연쇄 번개 확률
        chainCount: 0,
        chainRatio: 0.6,
        pierceCount: 0,       // 관통 횟수
        bonusDamageRatio: 0,  // 추가 데미지 비율
        plunderChance: 0,     // 황금 약탈 확률
        plunderGold: 0,       // 약탈 골드(TP)
        voidCollapseChance: 0,// 시공 붕괴 확률
        voidCollapseDamage: 0,// 시공 붕괴 피해
        voidCollapseRadius: 60
    };

    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return passives;

    // [v0.44.0] 기획서 3.5 정합: 속성 룬은 '장착한 지휘관이 관장하는 타워 / 강림한 본체'에만 적용
    //  - ownerCharId(문자열) 지정 시 해당 지휘관의 룬만 집계
    //  - 미지정(undefined) 시 덱 전체 집계 (UI 요약용 하위 호환)
    //  - null (관장 지휘관 없음) 이면 빈 패시브 반환
    if (ownerCharId === null) return passives;
    const sourceIds = (typeof ownerCharId === 'string') ? [ownerCharId] : USER_DATA.characterDeck;

    for (const charId of sourceIds) {
        if (!USER_DATA.characterDeck.includes(charId)) continue;
        const char = USER_DATA.characters && USER_DATA.characters[charId];
        if (!char || !char.equippedRunes) continue;

        char.equippedRunes.forEach(runeId => {
            if (!runeId) return;
            const runeInfo = RUNE_DATA[runeId];
            if (!runeInfo || runeInfo.type !== 'stat') return;

            // 1. 작열
            if (runeId === 'rune_flame') {
                passives.burn = true;
                passives.burnRatio = Math.max(passives.burnRatio, runeInfo.burnRatio || 0.25);
                passives.burnDuration = Math.max(passives.burnDuration, runeInfo.burnDurationSec || 3);
            }
            // 2. 예리함 (치명타)
            else if (runeId === 'rune_critical') {
                passives.critChance = Math.min(0.75, passives.critChance + (runeInfo.critChance || 0.25));
                passives.critMultiplier = Math.max(passives.critMultiplier, runeInfo.critMultiplier || 2.0);
            }
            // 3. 관통
            else if (runeId === 'rune_pierce') {
                passives.pierceCount += (runeInfo.pierceCount || 1);
                passives.bonusDamageRatio += (runeInfo.bonusDamageRatio || 0.15);
            }
            // 4. 연쇄 전격
            else if (runeId === 'rune_chain_lightning') {
                passives.chainChance = Math.min(0.8, passives.chainChance + (runeInfo.chainChance || 0.35));
                passives.chainCount = Math.max(passives.chainCount, runeInfo.chainCount || 2);
                passives.chainRatio = Math.max(passives.chainRatio, runeInfo.chainRatio || 0.6);
            }
            // 5. 황금 약탈
            else if (runeId === 'rune_plunder') {
                passives.plunderChance = Math.min(0.8, passives.plunderChance + (runeInfo.plunderChance || 0.4));
                passives.plunderGold = Math.max(passives.plunderGold, runeInfo.plunderGold || 2);
            }
            // 6. 시공 붕괴
            else if (runeId === 'rune_void_collapse') {
                passives.voidCollapseChance = Math.min(0.6, passives.voidCollapseChance + (runeInfo.collapseChance || 0.2));
                passives.voidCollapseDamage = Math.max(passives.voidCollapseDamage, runeInfo.collapseDamage || 35);
                passives.voidCollapseRadius = Math.max(passives.voidCollapseRadius, runeInfo.collapseRadius || 60);
            }
        });
    }

    return passives;
}

/**
 * v0.39.0 결전 지휘관(Hero Unit) 고유 지휘 오라(Aura) 스펙 조회
 * @param {string} charId - 지휘관 ID
 * @returns {Object} { name, desc, color, range, critChance, critMulti, attackSpeedBonus, fireDamageBonus, globalDamageBonus, protectCrawler }
 */
function getHeroAuraSpec(charId) {
    const cInfo = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
    if (!cInfo) return null;

    // 1. 세라피나 (UR, 성스러운 대사제)
    if (charId === 'char_seraphina') {
        return {
            name: "신성 지휘 오라",
            desc: "주변 3x3 타워 치명타율 +15% & 치명타 피해 +0.5배 증폭",
            color: "#f59e0b",
            range: 1, // 3x3
            critChance: 0.15,
            critMulti: 0.5,
            attackSpeedBonus: 0,
            fireDamageBonus: 0,
            globalDamageBonus: 0,
            protectCrawler: false
        };
    }
    // 2. 베로니카 (UR, 홍련의 총사령관)
    if (charId === 'char_veronica') {
        return {
            name: "홍련 지휘 오라",
            desc: "주변 3x3 타워 공격속도 +20% 가속 & 화염/폭탄 타워 피해 +25%",
            color: "#ef4444",
            range: 1, // 3x3
            critChance: 0,
            critMulti: 0,
            attackSpeedBonus: 0.20,
            fireDamageBonus: 0.25,
            globalDamageBonus: 0,
            protectCrawler: false
        };
    }
    // 3. 루미나 (U, 성간의 지배자)
    if (charId === 'char_lumina') {
        return {
            name: "창세 성간 결계 오라",
            desc: "전 필드 타워 피해 +15% & 주변 3x3 타워 공속 +15% & 크롤러 철거 절대 차단",
            color: "#a855f7",
            range: 1, // 3x3
            critChance: 0.10,
            critMulti: 0.3,
            attackSpeedBonus: 0.15,
            fireDamageBonus: 0,
            globalDamageBonus: 0.15,
            protectCrawler: true
        };
    }
    // 4. 티타니아 (U, 창세의 생명신)
    if (charId === 'char_titania') {
        return {
            name: "창세 세계수 생명 오라",
            desc: "전 필드 타워 피해 +15% & 주변 3x3 타워 공속 +20% · 치명타율 +15% & 크롤러 철거 절대 차단",
            color: "#10b981",
            range: 1, // 3x3
            critChance: 0.15,
            critMulti: 0.4,
            attackSpeedBonus: 0.20,
            fireDamageBonus: 0,
            globalDamageBonus: 0.15,
            protectCrawler: true
        };
    }

    // 기본 UR/U 히어로 오라
    if (cInfo.grade === 'UR' || cInfo.grade === 'U') {
        return {
            name: "결전 지휘 오라",
            desc: "주변 3x3 타워 공격속도 +15% & 치명타율 +10%",
            color: "#38bdf8",
            range: 1,
            critChance: 0.10,
            critMulti: 0.3,
            attackSpeedBonus: 0.15,
            fireDamageBonus: 0,
            globalDamageBonus: 0,
            protectCrawler: false
        };
    }

    return null;
}




/**
 * [v0.55.0] 지휘관 고유 효과 조회 (워크플로 P4-3)
 * CHARACTER_DATA[charId].signature 유형과 등급별 수치를 묶어 돌려준다. 고유 효과가 없으면 null.
 * @returns {{type: string, v: *, name: string, icon: string, text: string} | null}
 */
function getCommanderSignature(charId) {
    const info = CHARACTER_DATA[charId];
    if (!info || !info.signature) return null;
    const def = SIGNATURE_TYPES[info.signature];
    if (!def) return null;
    const v = def.values[info.grade];
    if (v === undefined) return null;
    return { type: info.signature, v, name: def.name, icon: def.icon, text: def.describe(v) };
}
