const GAME_VERSION = "v0.22.2";
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

/**
 * 6단계 공통 카드/룬 등급 체계 (v0.22.0)
 * C -> UC -> R -> SR -> UR -> U
 */
const CARD_GRADES = {
    C: { id: "C", name: "커먼", eng: "Common", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "#94a3b8", defaultSockets: 1 },
    UC: { id: "UC", name: "언커먼", eng: "Uncommon", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", defaultSockets: 1 },
    R: { id: "R", name: "레어", eng: "Rare", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", defaultSockets: 2 },
    SR: { id: "SR", name: "스페셜 레어", eng: "Special Rare", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", border: "#a855f7", defaultSockets: 2 },
    UR: { id: "UR", name: "울트라 레어", eng: "Ultra Rare", color: "#eab308", bg: "rgba(234, 179, 8, 0.2)", border: "#eab308", defaultSockets: 3 },
    U: { id: "U", name: "유니크", eng: "Unique", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.25)", border: "#f43f5e", defaultSockets: 4 }
};

/**
 * 4대 독립 재화 체계 (v0.22.0)
 */
const CURRENCY_INFO = {
    TP: { id: "TP", name: "타워 포인트", symbol: "🪙", desc: "타워/기반 건설 및 인게임 타워 강화에 소모" },
    MP: { id: "MP", name: "마나 포인트", symbol: "💧", desc: "인게임 스펠 룬 액티브 발동에 소모" },
    PP: { id: "PP", name: "프리즘 포인트", symbol: "💎", desc: "보스 격파 시 획득, 미소녀 지휘관 캐릭터 소환 전용" },
    RP: { id: "RP", name: "룬 포인트", symbol: "🔮", desc: "웨이브/스테이지 보상, 룬 소환 전용" }
};

/**
 * 미소녀 지휘관 캐릭터 레지스트리 (CHARACTER_DATA)
 * - 덱 편성 시 타워별 인게임 최대 강화 한도(levelCaps)를 제공
 * - 성급(star)에 따라 소켓 수 확장
 */
const CHARACTER_DATA = {
    char_liana: {
        id: "char_liana",
        name: "리아나",
        title: "견습 성기사",
        grade: "C",
        avatar: "🛡️",
        maxSockets: 2,
        baseSockets: 1,
        // 인게임 타워 강화 한도 보너스
        levelCaps: {
            melee: 1
        },
        desc: "최전선에서 아군을 보호하는 열정 넘치는 성기사. 근거리 타워의 잠재력을 1단계 끌어올립니다."
    },
    char_elena: {
        id: "char_elena",
        name: "엘레나",
        title: "바람의 사수",
        grade: "UC",
        avatar: "🏹",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ranged: 2
        },
        desc: "먼 거리의 표적도 놓치지 않는 엘프 명사수. 원거리 타워의 최대 강화를 2단계 해금합니다."
    },
    char_freya: {
        id: "char_freya",
        name: "프레이야",
        title: "서리의 마녀",
        grade: "R",
        avatar: "❄️",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            ice: 2,
            bomb: 1
        },
        desc: "영구 동토의 한기를 다루는 빙결 마법사. 얼음 타워를 2단계, 폭탄 타워를 1단계 강화할 수 있게 합니다."
    },
    char_scarlet: {
        id: "char_scarlet",
        name: "스칼렛",
        title: "비전 폭파술사",
        grade: "SR",
        avatar: "💣",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            bomb: 3,
            melee: 1
        },
        desc: "폭발이야말로 예술이라 믿는 천재 연금술사. 폭탄 타워의 파괴력을 극한(3단계)까지 개방합니다."
    }
};

/**
 * 룬(Rune) 레지스트리 (RUNE_DATA)
 * type: 'stat' (속성/패시브) | 'spell' (액티브 마법)
 * usageType: 'passive' | 'multi' (다회용 쿨타임) | 'single' (판당 1회 궁극기)
 */
const RUNE_DATA = {
    // [속성 패시브 룬]
    rune_flame: {
        id: "rune_flame",
        name: "작열의 룬",
        type: "stat",
        usageType: "passive",
        grade: "C",
        icon: "🔥",
        desc: "타워 공격 시 3초간 매초 공격력의 20% 화염 도트 피해를 부여합니다."
    },
    rune_critical: {
        id: "rune_critical",
        name: "예리함의 룬",
        type: "stat",
        usageType: "passive",
        grade: "UC",
        icon: "⚡",
        critChance: 0.2,
        critMultiplier: 2.0,
        desc: "20% 확률로 200%의 치명타 치명 피해를 입힙니다."
    },
    rune_pierce: {
        id: "rune_pierce",
        name: "관통의 룬",
        type: "stat",
        usageType: "passive",
        grade: "R",
        icon: "🎯",
        pierceCount: 1,
        desc: "원거리 투사체가 직선상의 적 1기를 추가 관통합니다."
    },
    rune_chain_lightning: {
        id: "rune_chain_lightning",
        name: "연쇄 전격 룬",
        type: "stat",
        usageType: "passive",
        grade: "SR",
        icon: "🌩️",
        chainCount: 2,
        desc: "적 타격 시 25% 확률로 인접한 2기의 적에게 연쇄 전격을 일으킵니다."
    },

    // [스펠 액티브 룬]
    rune_spell_gold: {
        id: "rune_spell_gold",
        name: "긴급 보급",
        type: "spell",
        usageType: "multi",
        grade: "C",
        icon: "📦",
        mpCost: 30,
        cooldownSec: 20,
        effectValue: 8,
        desc: "마나 30 소모: 즉시 긴급 타워 포인트 +8 TP를 보급받습니다."
    },
    rune_spell_gust: {
        id: "rune_spell_gust",
        name: "돌풍의 결계",
        type: "spell",
        usageType: "multi",
        grade: "UC",
        icon: "🌪️",
        mpCost: 25,
        cooldownSec: 15,
        durationSec: 4,
        slowRatio: 0.4,
        desc: "마나 25 소모: 4초 동안 전장의 모든 적 이동 속도를 40% 감속시킵니다."
    },
    rune_spell_thunder: {
        id: "rune_spell_thunder",
        name: "천벌의 낙뢰",
        type: "spell",
        usageType: "multi",
        grade: "R",
        icon: "⚡",
        mpCost: 40,
        cooldownSec: 25,
        damage: 15,
        desc: "마나 40 소모: 지정된 필드 구역에 벼락을 내리쳐 15의 마법 피해를 입힙니다."
    },
    rune_spell_teleport: {
        id: "rune_spell_teleport",
        name: "시공의 왜곡",
        type: "spell",
        usageType: "single", // 판당 1회 궁극기
        grade: "SR",
        icon: "🌀",
        mpCost: 75,
        desc: "마나 75 소모 [전투당 1회 궁극기]: 현재 필드의 모든 몬스터를 스폰 입구로 강제 송환합니다."
    }
};
