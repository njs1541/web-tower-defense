const GAME_VERSION = "v0.31.0";
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
        shardImage: "assets/shard_ranged.jpg",
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
        shardImage: "assets/shard_melee.jpg",
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
        shardImage: "assets/shard_ice.jpg",
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
        shardImage: "assets/shard_bomb.jpg",
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
        shardImage: "assets/shard_ranged.jpg",
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
        shardImage: "assets/shard_ice.jpg",
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
        image: "assets/char_liana.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            melee: 1
        },
        startingTowers: {
            melee: 2
        },
        quotes: [
            "처음 뵙겠습니다, 지휘관님! 미숙하지만 최선을 다해 방패를 들겠습니다!",
            "훈련은 매일 빠짐없이 하고 있어요! 언제든 출격 명령을 내려주세요.",
            "제가 지휘관님의 가장 든든한 방패가 되어 드릴게요!"
        ],
        skillQuote: "모두 제 방패 뒤로! 신성한 수호의 결계!",
        desc: "최전선에서 아군을 보호하는 열정 넘치는 성기사. 시작 시 근거리 타워 2기를 무료 보급하며 근거리 타워 한도를 +1 확장합니다."
    },
    char_elena: {
        id: "char_elena",
        name: "엘레나",
        title: "바람의 사수",
        grade: "UC",
        avatar: "🏹",
        image: "assets/char_elena.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ranged: 2
        },
        startingTowers: {
            ranged: 1,
            base: 2
        },
        quotes: [
            "바람의 흐름이 느껴지나요? 표적은 이미 제 조준선 안에 있어요.",
            "지휘관님, 숲의 바람이 우리를 반드시 승리로 이끌어 줄 거예요.",
            "원거리의 적은 걱정 마세요. 제 화살은 단 한 번도 빗나가지 않으니까요."
        ],
        skillQuote: "바람이여, 적을 꿰뚫어라! 질풍의 일격!",
        desc: "먼 거리의 표적도 놓치지 않는 엘프 명사수. 시작 시 원거리 타워 1기와 무료 기반 2개를 보급하며 원거리 타워 한도를 +2 확장합니다."
    },
    // [v0.26.0 신규 타워 전담 언커먼 지휘관 라인업]
    char_chloe: {
        id: "char_chloe",
        name: "클로에",
        title: "강철의 검사",
        grade: "UC",
        avatar: "⚔️",
        image: "assets/char_chloe.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            melee: 2
        },
        startingTowers: {
            melee: 2,
            base: 1
        },
        quotes: [
            "검을 뽑은 이상 망설임은 없다. 지휘관, 전열 돌파 준비 완료다.",
            "강철은 뜨거운 불 속에서 단련되는 법. 어떤 몬스터든 베어 넘기겠다.",
            "지휘관의 명령이라면 지옥의 한복판이라도 기꺼이 돌격하겠다!"
        ],
        skillQuote: "강철의 의지로 베어 넘긴다! 전열 돌파!",
        desc: "전열을 용맹하게 돌파하는 강철의 여기사. 시작 시 근거리 타워 2기와 무료 기반 1개를 보급하며 근거리 타워 한도를 +2 확장합니다."
    },
    char_charlotte: {
        id: "char_charlotte",
        name: "샤를로트",
        title: "매의 눈 저격수",
        grade: "UC",
        avatar: "🎯",
        image: "assets/char_charlotte.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            sniper: 2
        },
        startingTowers: {
            sniper: 1,
            base: 1
        },
        quotes: [
            "심호흡 한 번, 방아쇠 한 번. 그걸로 승부는 끝입니다.",
            "적의 약점은 이미 포착되었습니다. 지휘관님, 발사 승인만 내려주세요.",
            "사거리 안으로 들어온 사냥감은 절대 제 시야에서 벗어날 수 없어요."
        ],
        skillQuote: "호흡을 멈추고... 표적 확인, 정밀 저격!",
        desc: "초장거리 정밀 사격에 특화된 냉철한 스나이퍼. 시작 시 저격 타워 1기와 무료 기반 1개를 보급하며 저격 타워 한도를 +2 확장합니다."
    },
    char_cecilia: {
        id: "char_cecilia",
        name: "세실리아",
        title: "서리의 마도사",
        grade: "UC",
        avatar: "❄️",
        image: "assets/char_cecilia.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ice: 2
        },
        startingTowers: {
            ice: 1,
            base: 2
        },
        quotes: [
            "서리의 결정이 참 예쁘죠? 하지만 적들에게는 치명적인 덫이랍니다.",
            "지휘관님의 차가운 판단력, 아주 마음에 들어요. 후후.",
            "냉기 속에서 잠시 쉬어가시겠어요? 적들은 제가 꽁꽁 얼려둘게요."
        ],
        skillQuote: "영구 동토의 한기여... 모조리 얼어붙어라!",
        desc: "차가운 서리 결정으로 적의 발을 묶는 빙결 마법사. 시작 시 얼음 타워 1기와 무료 기반 2개를 보급하며 얼음 타워 한도를 +2 확장합니다."
    },
    char_greta: {
        id: "char_greta",
        name: "그레타",
        title: "화약의 포격수",
        grade: "UC",
        avatar: "💣",
        image: "assets/char_greta.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            bomb: 2
        },
        startingTowers: {
            bomb: 1,
            base: 1
        },
        quotes: [
            "폭발이야말로 최고의 예술이지! 빵빵 터질 때의 쾌감, 지휘관도 알지?",
            "지휘관! 이번엔 특제 화약 배합을 써봤는데, 기대해도 좋아!",
            "적들이 몰려온다고? 하하! 오히려 환영이야, 한 방에 날려줄 테니!"
        ],
        skillQuote: "특제 폭약 장전 완료! 흔적도 없이 날아가라, 쾅!",
        desc: "광역 포격으로 적군을 단숨에 초토화하는 화약 전문가. 시작 시 폭탄 타워 1기와 무료 기반 1개를 보급하며 폭탄 타워 한도를 +2 확장합니다."
    },
    char_ada: {
        id: "char_ada",
        name: "에이다",
        title: "벽력의 정령사",
        grade: "UC",
        avatar: "⚡",
        image: "assets/char_ada.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            shock: 2
        },
        startingTowers: {
            shock: 1,
            base: 1
        },
        quotes: [
            "찌릿찌릿한 번개의 힘, 느껴져? 전선을 모조리 감전시켜 줄게!",
            "번개는 가장 빠른 심판이지. 지휘관님, 눈 깜빡이지 마세요!",
            "벼락의 정령들이 노래하고 있어. 적들을 초토화할 시간이야."
        ],
        skillQuote: "하늘의 벼락이여! 연쇄 낙뢰여 내리쳐라!",
        desc: "연쇄 번개로 다수의 적을 감전시키는 전격의 인도자. 시작 시 전격 타워 1기와 무료 기반 1개를 보급하며 전격 타워 한도를 +2 확장합니다."
    },
    char_freya: {
        id: "char_freya",
        name: "프레이야",
        title: "서리의 마녀",
        grade: "R",
        avatar: "❄️",
        image: "assets/char_freya.jpg",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            ice: 2,
            bomb: 1
        },
        startingTowers: {
            ice: 1,
            bomb: 1
        },
        quotes: [
            "절대 영도의 세계에 오신 것을 환영해요, 나의 지휘관님.",
            "차갑게 얼어붙은 영혼은 너무나 쉽게 부서지는 법이지요... 후후.",
            "얼음과 폭염의 이중주, 그 아름다운 파멸의 춤을 보여드릴게요."
        ],
        skillQuote: "혹한의 폭풍이여 휘몰아쳐라! 블리자드 버스트!",
        desc: "영구 동토의 한기를 다루는 빙결 마법사. 시작 시 얼음 타워 1기와 폭탄 타워 1기를 무료 보급하며 얼음/폭탄 한도를 확장합니다."
    },
    char_scarlet: {
        id: "char_scarlet",
        name: "스칼렛",
        title: "비전 폭파술사",
        grade: "SR",
        avatar: "💣",
        image: "assets/char_scarlet.jpg",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            bomb: 3,
            melee: 1
        },
        startingTowers: {
            bomb: 2
        },
        quotes: [
            "연금술의 정점은 역시 폭발이지! 지휘관, 내 비전 플라스크 건드리면 안 돼?",
            "비전의 불꽃이 타오르고 있어... 오늘 전장은 아주 화끈할 거야!",
            "후후, 적들이 잿더미로 분해되는 광경을 1열에서 감상하게 해줄게."
        ],
        skillQuote: "비전 연금술 궁극 비오의! 홍련의 대폭발!",
        desc: "폭발이야말로 예술이라 믿는 천재 연금술사. 시작 시 폭탄 타워 2기를 무료 보급하며 폭탄 타워의 한도를 +3 개방합니다."
    },
    char_seraphina: {
        id: "char_seraphina",
        name: "세라피나",
        title: "성스러운 대사제",
        grade: "UR",
        avatar: "✨",
        image: "assets/char_seraphina.jpg",
        maxSockets: 5,
        baseSockets: 3,
        levelCaps: {
            ranged: 3,
            sniper: 3
        },
        startingTowers: {
            sniper: 1,
            ranged: 1
        },
        quotes: [
            "빛의 축복이 지휘관님과 이 성스러운 영지에 가득하기를 기원합니다.",
            "어둠이 아무리 깊어도, 신성한 서광은 결코 사그라지지 않아요.",
            "지휘관님의 정의로운 싸움에, 하늘의 천사들이 언제나 함께할 것입니다."
        ],
        skillQuote: "찬란한 빛의 권능이여, 악한 자들을 정화하라! 홀리 생츄어리!",
        desc: "신성한 빛으로 전장을 축복하는 고위 대사제. 시작 시 저격 타워 1기와 원거리 타워 1기를 무료 보급하며 저격/원거리 한도를 +3 개방합니다."
    },
    char_lumina: {
        id: "char_lumina",
        name: "루미나",
        title: "성간의 지배자",
        grade: "U",
        avatar: "🌌",
        image: "assets/char_lumina.jpg",
        maxSockets: 6,
        baseSockets: 4,
        levelCaps: {
            melee: 2,
            ranged: 2,
            ice: 2,
            bomb: 2,
            sniper: 2
        },
        startingTowers: {
            melee: 1,
            ranged: 1,
            ice: 1,
            bomb: 1
        },
        quotes: [
            "무수한 별들이 지휘관, 바로 너의 고귀한 운명을 축복하고 있구나.",
            "은하의 거대한 소용돌이 속에서, 영원한 질서를 새길지어다.",
            "필멸자여, 두려워 말라. 우주의 절대적 권능이 그대의 검이 될지니."
        ],
        skillQuote: "성좌의 궤도를 열어라! 심우주의 절대 심판, 코스믹 노바!",
        desc: "별의 기운을 다스리는 최고위 유니크 지휘관. 시작 시 4대 기본 타워를 각 1기씩 무료 보급하며 모든 타워 한도를 +2 전방위 확장합니다."
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
        image: "assets/rune_passive.jpg",
        burnDurationSec: 3,
        burnRatio: 0.25,
        desc: "타워 공격 시 3초간 매초 공격력의 25% 화염 도트 피해를 부여합니다."
    },
    rune_critical: {
        id: "rune_critical",
        name: "예리함의 룬",
        type: "stat",
        usageType: "passive",
        grade: "UC",
        icon: "⚡",
        image: "assets/rune_passive.jpg",
        critChance: 0.25,
        critMultiplier: 2.0,
        desc: "25% 확률로 200%의 치명타 폭발 피해를 입힙니다."
    },
    rune_pierce: {
        id: "rune_pierce",
        name: "관통의 룬",
        type: "stat",
        usageType: "passive",
        grade: "R",
        icon: "🎯",
        image: "assets/rune_passive.jpg",
        pierceCount: 1,
        bonusDamageRatio: 0.15,
        desc: "투사체 공격력 +15% 및 관통 충격파를 발산합니다."
    },
    rune_chain_lightning: {
        id: "rune_chain_lightning",
        name: "연쇄 전격 룬",
        type: "stat",
        usageType: "passive",
        grade: "SR",
        icon: "🌩️",
        image: "assets/rune_passive.jpg",
        chainChance: 0.35,
        chainCount: 2,
        chainRatio: 0.6,
        desc: "적 타격 시 35% 확률로 인접한 2기의 적에게 60% 위력의 연쇄 전격을 일으킵니다."
    },
    rune_plunder: {
        id: "rune_plunder",
        name: "황금 약탈의 룬",
        type: "stat",
        usageType: "passive",
        grade: "UR",
        icon: "💰",
        image: "assets/rune_passive.jpg",
        plunderChance: 0.4,
        plunderGold: 2,
        desc: "타워가 적 처치 시 40% 확률로 추가 +2 TP를 전리품으로 강탈합니다."
    },
    rune_void_collapse: {
        id: "rune_void_collapse",
        name: "시공 붕괴의 룬",
        type: "stat",
        usageType: "passive",
        grade: "U",
        icon: "🌌",
        image: "assets/rune_passive.jpg",
        collapseChance: 0.2,
        collapseRadius: 60,
        collapseDamage: 35,
        desc: "공격 시 20% 확률로 시공간을 왜곡시켜 반경 내 모든 적에게 35의 붕괴 폭발 피해를 가합니다."
    },

    // [스펠 액티브 룬]
    rune_spell_gold: {
        id: "rune_spell_gold",
        name: "긴급 보급",
        type: "spell",
        usageType: "multi",
        grade: "C",
        icon: "📦",
        image: "assets/rune_spell.jpg",
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
        image: "assets/rune_spell.jpg",
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
        image: "assets/rune_spell.jpg",
        mpCost: 40,
        cooldownSec: 25,
        damage: 18,
        desc: "마나 40 소모: 지정된 필드 구역에 벼락을 내리쳐 18의 마법 피해를 입힙니다."
    },
    rune_spell_teleport: {
        id: "rune_spell_teleport",
        name: "시공의 왜곡",
        type: "spell",
        usageType: "single", // 판당 1회 궁극기
        grade: "SR",
        icon: "🌀",
        image: "assets/rune_spell.jpg",
        mpCost: 75,
        desc: "마나 75 소모 [전투당 1회 궁극기]: 현재 필드의 모든 몬스터를 스폰 입구로 강제 송환합니다."
    },
    rune_spell_frenzy: {
        id: "rune_spell_frenzy",
        name: "성스러운 축복",
        type: "spell",
        usageType: "multi",
        grade: "UR",
        icon: "✨",
        image: "assets/rune_spell.jpg",
        mpCost: 50,
        cooldownSec: 30,
        durationSec: 6,
        desc: "마나 50 소모: 6초 동안 전장의 모든 아군 타워 공격 속도가 100%(2배) 폭주합니다."
    },
    rune_spell_armageddon: {
        id: "rune_spell_armageddon",
        name: "아마겟돈",
        type: "spell",
        usageType: "single", // 판당 1회 궁극기
        grade: "U",
        icon: "☄️",
        image: "assets/rune_spell.jpg",
        mpCost: 90,
        damage: 60,
        desc: "마나 90 소모 [전투당 1회 궁극기]: 하늘에서 거대한 메테오를 낙하시켜 전장의 모든 적에게 60의 파멸 피해를 입힙니다."
    }
};

/**
 * 지휘관 및 룬 가챠(소환) 설정 (v0.24.0 / v0.29.0 10+1 연차 확장)
 */
const COMMANDER_GACHA_CONFIG = {
    costPP: 1,       // 1회 소환 시 1 PP 소모
    multiCostPP: 10, // 10회 소환 시 10 PP 소모
    multiCount: 11,  // 10회 소환 시 보너스로 총 11장 지급
    rates: [
        { grade: "C", charId: "char_liana", weight: 35 },
        { grade: "UC", charId: "char_elena", weight: 6 },
        { grade: "UC", charId: "char_chloe", weight: 6 },
        { grade: "UC", charId: "char_charlotte", weight: 6 },
        { grade: "UC", charId: "char_cecilia", weight: 6 },
        { grade: "UC", charId: "char_greta", weight: 6 },
        { grade: "UC", charId: "char_ada", weight: 6 },
        { grade: "R", charId: "char_freya", weight: 16 },
        { grade: "SR", charId: "char_scarlet", weight: 8 },
        { grade: "UR", charId: "char_seraphina", weight: 3 },
        { grade: "U", charId: "char_lumina", weight: 2 }
    ]
};

const RUNE_GACHA_CONFIG = {
    costRP: 5,       // 1회 소환 시 5 RP 소모
    multiCostRP: 50, // 10회 소환 시 50 RP 소모
    multiCount: 11,  // 10회 소환 시 보너스로 총 11개 지급
    rates: [
        { runeId: "rune_flame", weight: 22 },
        { runeId: "rune_spell_gold", weight: 22 },
        { runeId: "rune_critical", weight: 18 },
        { runeId: "rune_spell_gust", weight: 14 },
        { runeId: "rune_pierce", weight: 10 },
        { runeId: "rune_spell_thunder", weight: 6 },
        { runeId: "rune_chain_lightning", weight: 4 },
        { runeId: "rune_spell_teleport", weight: 2 },
        { runeId: "rune_plunder", weight: 1 },
        { runeId: "rune_spell_frenzy", weight: 0.6 },
        { runeId: "rune_void_collapse", weight: 0.3 },
        { runeId: "rune_spell_armageddon", weight: 0.1 }
    ]
};


