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
 * 현재 출전 덱의 대장(총사령관, 1번 슬롯) 정보 및 대장 고유 오버클럭 보너스 조회 (v0.32.0 New)
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
    let extraSupplies = {};
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
        extraSupplies: {},
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
 * (은퇴) 시작 시 무료 보급 타워/기반 총합 계산 -> 고정 스톡 체계 전환으로 빈 객체 반환
 * @returns {Object} {}
 */
function calculateDeckStartingSupplies() {
    return {};
}

/**
 * 출전 덱에 편성된 지휘관들로부터 이번 게임에 설치 가능한 고정 타워 스톡(Stock) 총합 계산 (v0.36.0 New)
 * @returns {Object} { melee: 4, ranged: 3, ... }
 */
function calculateDeckTowerStocks() {
    const stocks = {};
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck)) return stocks;

    for (const charId of USER_DATA.characterDeck) {
        const charInfo = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
        if (charInfo && charInfo.towerStock) {
            for (const [key, count] of Object.entries(charInfo.towerStock)) {
                stocks[key] = (stocks[key] || 0) + count;
            }
        }
    }
    return stocks;
}

/**
 * 타워가 속한 지휘관 등급에 따른 환급율 계산 (C: 100%, UC: 80%, 기타: 60%) (v0.36.0 New)
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

        // 활성화 가능성 있는 다른 모든 원소/역할군에 +1 조커 부스트
        for (const eKey of Object.keys(SYNERGY_DATA.elements)) {
            if (eKey !== 'void' && result.elementCounts[eKey] > 0) {
                result.elementCounts[eKey] += 1;
            }
        }
        for (const rKey of Object.keys(SYNERGY_DATA.roles)) {
            if (result.roleCounts[rKey] > 0) {
                result.roleCounts[rKey] += 1;
            }
        }
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
 * - 지휘관의 levelCaps 또는 startingTowers에 등록된 타워만 인게임 설치 가능
 * @returns {Array<string>} 예: ['melee', 'ranged', 'bomb']
 */
function getAuthorizedTowerTypes() {
    const authorized = new Set();
    if (!USER_DATA.characterDeck || !Array.isArray(USER_DATA.characterDeck) || USER_DATA.characterDeck.length === 0) {
        return ['ranged']; // 비상용 기본
    }

    for (const charId of USER_DATA.characterDeck) {
        const charInfo = (typeof CHARACTER_DATA !== 'undefined') ? CHARACTER_DATA[charId] : null;
        if (!charInfo) continue;

        // 1. levelCaps에 등록된 타워
        if (charInfo.levelCaps) {
            Object.keys(charInfo.levelCaps).forEach(type => authorized.add(type));
        }

        // 2. towerStock에 등록된 타워 (스톡 1 이상)
        if (charInfo.towerStock) {
            Object.keys(charInfo.towerStock).forEach(type => {
                if (type !== 'base' && charInfo.towerStock[type] > 0) authorized.add(type);
            });
        }
    }

    // 3. 대장 오버클럭(U등급 등)에 의한 추가 인가 타워 반영 (v0.32.0 New)
    const leaderInfo = (typeof getLeaderCommanderInfo === 'function') ? getLeaderCommanderInfo() : null;
    if (leaderInfo && leaderInfo.extraCaps) {
        Object.keys(leaderInfo.extraCaps).forEach(type => authorized.add(type));
    }

    return Array.from(authorized);
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

/**
 * 현재 출전 덱에 편성된 지휘관들이 장착 중인 속성(패시브) 룬 효과 집계 (v0.24.0 New)
 * @returns {Object} 패시브 효과 집계 객체
 */
function getActiveRunePassives() {
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

    for (const charId of USER_DATA.characterDeck) {
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


