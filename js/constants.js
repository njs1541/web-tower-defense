const GAME_VERSION = "v0.18.0";
const boardSize = 20;

// 타워별 상징 엠블럼 이모지
const TOWER_EMBLEMS = {
    ranged: "🏹",
    melee: "⚔️",
    ice: "❄️",
    bomb: "💣"
};

// 몬스터 체력 및 난이도 밸런스 설정 (Phase E / v0.17.0)
const ENEMY_BALANCE = {
    baseHp: 3,          // 1라운드 기본 체력
    hpGrowthRate: 1.14, // 라운드당 체력 증가율 (14% 증가, 기존 1.20에서 완화되어 쾌적한 밸런스 유지)
    bossHpMulti: 10,    // 보스 체력 배율 (기본 체력의 10배)
    tankHpMulti: 2.0,   // 탱커 체력 배율 (기본 체력의 2배)
    fastHpMulti: 0.7    // 고속 몬스터 체력 배율 (기본 체력의 0.7배)
};

const TOWER_DATA = {
    ranged: {
        name: "원거리 타워",
        type: "ranged",
        cost: 3,
        damage: 1,
        range: 2,
        color: "#00aaff",
        desc: "사거리가 긴 기본 원거리 유닛"
    },
    melee: {
        name: "근거리 타워",
        type: "melee",
        cost: 2,
        damage: 2,
        range: 1,
        color: "#ff8800",
        desc: "강력한 위력의 근접 공격 유닛"
    },
    ice: {
        name: "얼음 타워",
        type: "ice",
        cost: 4,
        damage: 1,
        range: 2,
        color: "#00e5ff",
        slowRatio: 0.5, // 이동 속도 50% 둔화
        slowTicks: 10,  // 10틱(약 2초) 동안 유지
        desc: "공격 시 적을 얼려 이동 속도를 50% 감소시킵니다."
    },
    bomb: {
        name: "폭탄 타워",
        type: "bomb",
        cost: 5,
        damage: 3,
        range: 2,
        splashRange: 1, // 중심 기준 3x3 범위
        color: "#e040fb",
        desc: "착탄 지점 주변 3x3 범위에 강력한 광역 피해를 입힙니다."
    }
};

const unlockTileCost = 1;

// 스테이지별 테마 및 난이도 배율 (Phase D)
const STAGE_DATA = {
    1: {
        id: 1,
        name: "Stage 1: 평원의 미로",
        desc: "기본 난이도 (표준 몬스터)",
        boardBg: "#94a3b8",
        hpMulti: 1.0,
        speedMulti: 1.0,
        rewardMulti: 1.0
    },
    2: {
        id: 2,
        name: "Stage 2: 혹한의 성채",
        desc: "몬스터 속도 +15% / 보상 골드 +30%",
        boardBg: "#38bdf8",
        hpMulti: 1.0,
        speedMulti: 1.15,
        rewardMulti: 1.3
    },
    3: {
        id: 3,
        name: "Stage 3: 화산의 회랑",
        desc: "몬스터 체력 +30% / 보상 골드 +60%",
        boardBg: "#f87171",
        hpMulti: 1.3,
        speedMulti: 1.0,
        rewardMulti: 1.6
    }
};

// 영구 특성 연구소 데이터 (Phase D)
const TALENT_DATA = {
    startGold: {
        id: "startGold",
        name: "🪙 초기 자금 확충",
        desc: "게임 시작 시 초기 골드 증가 (+3G / Lv)",
        maxLevel: 5,
        baseCost: 150
    },
    maxHp: {
        id: "maxHp",
        name: "🛡️ 성벽 보강",
        desc: "마을 기지 최대 체력 증가 (+2 HP / Lv)",
        maxLevel: 5,
        baseCost: 150
    },
    towerPower: {
        id: "towerPower",
        name: "⚡ 타워 마법 충전",
        desc: "모든 타워의 데미지 영구 증가 (+5% / Lv)",
        maxLevel: 5,
        baseCost: 200
    }
};
