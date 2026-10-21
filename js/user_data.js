const USER_DATA = {
    gold: 0,
    inventory: [], // 보유한 타워 ID 목록 (예: ['ranged', 'melee'])
    deck: [],      // 출전 덱 (최대 4장) (Phase D)
    fragments: {}, // { 'ranged': 5, 'melee': 2 }
    levels: {},    // { 'ranged': 1, 'melee': 1 }
    talents: {     // 연구소 영구 특성 레벨 (Phase D)
        startGold: 0,
        maxHp: 0,
        towerPower: 0
    }
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
            console.log("저장된 데이터 로드 완료:", USER_DATA);
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
    USER_DATA.inventory = ['ranged', 'melee']; // 기본 타워 지급
    USER_DATA.deck = ['ranged', 'melee'];      // 기본 출전 덱
    USER_DATA.fragments = {};
    USER_DATA.levels = { 'ranged': 1, 'melee': 1 };
    USER_DATA.talents = { startGold: 0, maxHp: 0, towerPower: 0 };
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

// 타워 스탯 계산 (기본 스탯 + 레벨 보정 + 연구소 특성 보정)
function getTowerStats(towerId, towerDataOrigin) {
    const base = towerDataOrigin[towerId];
    if (!base) return null;

    const lv = USER_DATA.levels[towerId] || 1;
    // 레벨당 데미지 10% 증가
    const multiplier = 1 + (lv - 1) * 0.1;

    // 연구소 특성: 타워 파워 (+5% per Lv) (Phase D)
    const talentPowerLv = (USER_DATA.talents && USER_DATA.talents.towerPower) || 0;
    const talentMultiplier = 1 + (talentPowerLv * 0.05);

    return {
        ...base,
        damage: base.damage * multiplier * talentMultiplier,
        level: lv
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
