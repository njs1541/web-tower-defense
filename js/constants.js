const GAME_VERSION = "v0.21.0";
const boardSize = 20;

// 기반 건설(Base Building) 비용 및 규칙 설정
const BASE_BUILD_CONFIG = {
    initialCost: 1,       // 초기 1G
    stepCount: 5,         // 기반 5개 설치할 때마다
    costIncrement: 1,     // 비용 1G씩 증가
    safetyRadius: 1       // 시작점/골인점 주변 건설 금지 반경
};

// 타워 환불율 (60%)
const TOWER_REFUND_RATE = 0.6;

// 타워별 상징 엠블럼 이모지
const TOWER_EMBLEMS = {
    ranged: "🏹",
    melee: "⚔️",
    ice: "❄️",
    bomb: "💣",
    sniper: "🎯",
    power: "💥",
    shock: "⚡"
};

// 타워별 조각 이미지 에셋
const SHARD_IMAGES = {
    ranged: "assets/shard_ranged.jpg",
    melee: "assets/shard_melee.jpg",
    ice: "assets/shard_ice.jpg",
    bomb: "assets/shard_bomb.jpg"
};

// 타워별 조각 명칭
const SHARD_NAMES = {
    ranged: "원거리 조각",
    melee: "근거리 조각",
    ice: "얼음 조각",
    bomb: "폭탄 조각"
};

// 몬스터 체력 및 난이도 밸런스 설정
const ENEMY_BALANCE = {
    baseHp: 3,          // 1라운드 기본 체력
    hpGrowthRate: 1.13, // 라운드당 체력 증가율 (13% 증가)
    bossHpMulti: 8,     // 보스 기본 체력 배율
    tankHpMulti: 2.2,   // 탱커 체력 배율
    fastHpMulti: 0.65,  // 고속 체력 배율
    crawlerHpMulti: 1.5,// 크롤러 체력 배율
    flyingHpMulti: 0.8  // 비행 체력 배율
};

/**
 * 몬스터 공통 정의 및 확장 레지스트리
 * moveType: 'ground'(A* 미로 우회), 'flying'(직선 비행), 'crawler'(가장 가까운 기반 철거), 'leap'(벽 도약)
 */
const ENEMY_TYPES = {
    normal: {
        id: "normal",
        name: "일반 지상군",
        moveType: "ground",
        speedTick: 2,
        hpMulti: 1.0,
        color: "#10b981",
        emoji: "👾",
        canTargetAirOnly: false
    },
    fast: {
        id: "fast",
        name: "신속의 척후병",
        moveType: "ground",
        speedTick: 1,
        hpMulti: 0.65,
        color: "#06b6d4",
        emoji: "⚡",
        canTargetAirOnly: false
    },
    tank: {
        id: "tank",
        name: "철갑 골렘",
        moveType: "ground",
        speedTick: 3,
        hpMulti: 2.2,
        color: "#64748b",
        emoji: "🛡️",
        canTargetAirOnly: false
    },
    crawler: {
        id: "crawler",
        name: "기반 파쇄 크롤러",
        moveType: "crawler",
        speedTick: 2,
        hpMulti: 1.5,
        color: "#ea580c",
        emoji: "🦂",
        demolishTicks: 7, // 약 1.4초간 접촉 시 기반 철거
        desc: "가장 가까운 기반으로 돌진하여 기반과 타워를 철거합니다."
    },
    flying: {
        id: "flying",
        name: "가고일 비행병",
        moveType: "flying",
        speedTick: 2,
        hpMulti: 0.8,
        color: "#8b5cf6",
        emoji: "🦇",
        desc: "미로를 무시하고 최단 직선으로 비행합니다. 근거리 타워는 공격 불가."
    },
    boss_ground: {
        id: "boss_ground",
        name: "대지 군주 (지상 보스)",
        moveType: "ground",
        isBoss: true,
        speedTick: 4,
        hpMulti: 10,
        color: "#b91c1c",
        emoji: "👹",
        desc: "초고체력의 정통 지상 보스. 미로를 따라 천천히 진격합니다."
    },
    boss_flying: {
        id: "boss_flying",
        name: "화염 와이번 (비행 보스)",
        moveType: "flying",
        isBoss: true,
        speedTick: 3,
        hpMulti: 7,
        color: "#dc2626",
        emoji: "🐉",
        desc: "공중을 가로지르는 비행 보스. 대공 타워로 화력을 집중해야 합니다."
    },
    boss_leaping: {
        id: "boss_leaping",
        name: "그림자 암살자 (도약 보스)",
        moveType: "leap",
        isBoss: true,
        speedTick: 2,
        hpMulti: 8,
        color: "#4c1d95",
        emoji: "🥷",
        leapCooldown: 6, // 6틱마다 1칸 벽 도약
        desc: "미로를 뚫고 벽을 뛰어넘어 지름길로 이동하는 기민한 보스."
    }
};

/**
 * 타워 공통 정의 및 확장 레지스트리
 * targetTypes: 'ground_only', 'air_only', 'all'
 */
const TOWER_DATA = {
    ranged: {
        name: "원거리 타워",
        type: "ranged",
        cost: 3,
        damage: 1,
        range: 2,
        targetType: "all", // 지상 및 공중 모두 타격 가능
        color: "#00aaff",
        desc: "사거리가 길며 지상 및 공중 유닛을 모두 요격합니다."
    },
    melee: {
        name: "근거리 타워",
        type: "melee",
        cost: 2,
        damage: 2,
        range: 1,
        targetType: "ground_only", // 공중 유닛 공격 불가
        color: "#ff8800",
        desc: "강력한 근접 타격 유닛. (공중 유닛 공격 불가)"
    },
    ice: {
        name: "얼음 타워",
        type: "ice",
        cost: 4,
        damage: 1,
        range: 2,
        targetType: "all",
        color: "#00e5ff",
        slowRatio: 0.5,
        slowTicks: 10,
        desc: "적을 얼려 이동 속도를 50% 감소시킵니다."
    },
    bomb: {
        name: "폭탄 타워",
        type: "bomb",
        cost: 5,
        damage: 3,
        range: 2,
        targetType: "ground_only",
        splashRange: 1,
        color: "#e040fb",
        desc: "착탄 지점 주변 3x3 범위에 강력한 광역 피해를 입힙니다."
    },
    // 추후 확장용 예비 타워 스펙
    sniper: {
        name: "저격 타워",
        type: "sniper",
        cost: 6,
        damage: 5,
        range: 4,
        targetType: "all",
        color: "#14b8a6",
        desc: "초장거리 단일 적에게 치명적인 일격을 가합니다."
    },
    shock: {
        name: "전격 타워",
        type: "shock",
        cost: 5,
        damage: 2,
        range: 2,
        targetType: "all",
        chainCount: 3,
        color: "#f59e0b",
        desc: "번개 화살로 최대 3기의 적에게 연쇄 피해를 줍니다."
    }
};

// 스테이지별 테마 및 난이도 배율
const STAGE_DATA = {
    1: {
        id: 1,
        name: "Stage 1: 평원의 미로",
        desc: "기본 난이도 (표준 몬스터 & 크롤러)",
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

// 영구 특성 연구소 데이터
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
